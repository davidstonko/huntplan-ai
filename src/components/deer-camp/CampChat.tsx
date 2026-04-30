/**
 * CampChat — Full-featured real-time chat for Deer Camp / Fish Camp.
 *
 * Features:
 * - Real-time messages via WebSocket
 * - Optimistic sends with retry on failure
 * - Connection status indicator (green/amber/red)
 * - Load-more history (pull to load older messages)
 * - Typing indicators ("User is typing...")
 * - Message reactions (long-press → emoji picker)
 * - Message deletion (long-press own messages)
 * - Outdoor/MD themed emoji picker
 * - Emoji-only messages render large
 * - Unread count callback for parent badge
 * - Auto-scroll on new messages
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { getSyncManager } from '../../services/campSyncService';
import { ChatMessageEvent, TypingEvent, ChatReactionEvent, ChatDeleteEvent } from '../../services/websocketService';
import Config from '../../config';
import Colors from '../../theme/colors';
import ChatEmojiPicker, { QUICK_REACTIONS } from './ChatEmojiPicker';

// ── Types ──────────────────────────────────────────────────────

export interface ChatMessageReaction {
  emoji: string;
  userIds: string[];
  usernames: string[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  color: string;
  text: string;
  timestamp: string;
  pending?: boolean;
  failed?: boolean;
  reactions?: ChatMessageReaction[];
}

interface CampChatProps {
  campId: string;
  currentUserId: string;
  currentUsername: string;
  currentColor?: string;
  visible: boolean;
  /** Called when unread count changes (for parent badge) */
  onUnreadCountChange?: (count: number) => void;
}

// ── Helpers ────────────────────────────────────────────────────

/** Returns true if a string is ONLY emoji characters (no text) */
function isEmojiOnly(text: string): boolean {
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D\u20E3\u2764\u2B50\u26A0\u26F5\u2693\u2600\u2601\u2615\u26C5\u26C8\u2744\u270C\u26FE\s]+$/u;
  return emojiRegex.test(text.trim()) && text.trim().length <= 12;
}

// ── Component ─────────────────────────────────────────────────

export default function CampChat({
  campId,
  currentUserId,
  currentUsername,
  currentColor = Colors.water,
  visible,
  onUnreadCountChange,
}: CampChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, { username: string; color: string; timeout: ReturnType<typeof setTimeout> }>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const unreadCountRef = useRef(0);
  const typingThrottleRef = useRef<number>(0);
  const isAtBottomRef = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Connection status polling ──
  useEffect(() => {
    if (!visible) return;
    const check = () => {
      const mgr = getSyncManager();
      setIsConnected(mgr.isConnected);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [visible]);

  // ── Fade in on mount ──
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  // ── Load chat history on mount ──
  useEffect(() => {
    if (!visible || !campId) return;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${Config.API_BASE_URL}/ws/camps/${campId}/messages?limit=50`
        );
        if (res.ok) {
          const data = await res.json();
          const history: ChatMessage[] = (data.messages || []).map((m: any) => ({
            id: m.id,
            userId: m.user_id,
            username: m.username,
            color: m.color || Colors.textSecondary,
            text: m.text,
            timestamp: m.timestamp,
            reactions: [],
          }));
          setMessages(history);
          setHasMoreHistory(history.length >= 50);
        }
      } catch (err) {
        if (__DEV__) console.warn('[CampChat] Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [campId, visible]);

  // ── Listen for real-time events ──
  useEffect(() => {
    if (!visible) return;

    const manager = getSyncManager();

    // Save previous handlers to restore on cleanup
    const prevChatHandler = manager.onChatMessage;
    const prevTypingHandler = manager.onTyping;
    const prevReactionHandler = manager.onChatReaction;
    const prevDeleteHandler = manager.onChatDelete;

    // Chat message handler
    manager.onChatMessage = (event: ChatMessageEvent) => {
      const msg: ChatMessage = {
        id: event.message_id,
        userId: event.user_id,
        username: event.username,
        color: event.color || Colors.textSecondary,
        text: event.text,
        timestamp: event.timestamp,
        reactions: [],
      };

      setMessages((prev) => {
        // Replace optimistic message if it matches
        const withoutPending = prev.filter(
          (m) => !(m.pending && m.userId === msg.userId && m.text === msg.text)
        );
        return [...withoutPending, msg];
      });

      // Clear typing for this user
      setTypingUsers((prev) => {
        const next = new Map(prev);
        const existing = next.get(event.user_id);
        if (existing) {
          clearTimeout(existing.timeout);
          next.delete(event.user_id);
        }
        return next;
      });

      // Track unread if not at bottom
      if (!isAtBottomRef.current && event.user_id !== currentUserId) {
        unreadCountRef.current += 1;
        onUnreadCountChange?.(unreadCountRef.current);
      }
    };

    // Typing indicator handler
    manager.onTyping = (event: TypingEvent) => {
      if (event.user_id === currentUserId) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        // Clear existing timeout for this user
        const existing = next.get(event.user_id);
        if (existing) clearTimeout(existing.timeout);

        // Set new timeout to clear after 3 seconds
        const timeout = setTimeout(() => {
          setTypingUsers((p) => {
            const n = new Map(p);
            n.delete(event.user_id);
            return n;
          });
        }, 3000);

        next.set(event.user_id, {
          username: event.username,
          color: event.color,
          timeout,
        });
        return next;
      });
    };

    // Reaction handler
    manager.onChatReaction = (event: ChatReactionEvent) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== event.message_id) return m;
          const reactions = [...(m.reactions || [])];
          const existing = reactions.find((r) => r.emoji === event.emoji);
          if (existing) {
            if (!existing.userIds.includes(event.user_id)) {
              existing.userIds.push(event.user_id);
              existing.usernames.push(event.username);
            }
          } else {
            reactions.push({
              emoji: event.emoji,
              userIds: [event.user_id],
              usernames: [event.username],
            });
          }
          return { ...m, reactions };
        })
      );
    };

    // Delete handler
    manager.onChatDelete = (event: ChatDeleteEvent) => {
      setMessages((prev) => prev.filter((m) => m.id !== event.message_id));
    };

    return () => {
      // Restore previous handlers
      manager.onChatMessage = prevChatHandler;
      manager.onTyping = prevTypingHandler;
      manager.onChatReaction = prevReactionHandler;
      manager.onChatDelete = prevDeleteHandler;

      // Clear all typing timeouts
      typingUsers.forEach((v) => clearTimeout(v.timeout));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, currentUserId]);

  // ── Auto-scroll when new messages arrive (if at bottom) ──
  useEffect(() => {
    if (messages.length > 0 && isAtBottomRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // ── Reset unread when scrolled to bottom ──
  const handleScrollToBottom = useCallback(() => {
    isAtBottomRef.current = true;
    unreadCountRef.current = 0;
    onUnreadCountChange?.(0);
  }, [onUnreadCountChange]);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    isAtBottomRef.current = distanceFromBottom < 60;
    if (isAtBottomRef.current && unreadCountRef.current > 0) {
      unreadCountRef.current = 0;
      onUnreadCountChange?.(0);
    }
  }, [onUnreadCountChange]);

  // ── Load more history ──
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMoreHistory || messages.length === 0) return;

    setLoadingMore(true);
    try {
      const oldest = messages[0];
      const res = await fetch(
        `${Config.API_BASE_URL}/ws/camps/${campId}/messages?limit=30&before=${encodeURIComponent(oldest.timestamp)}`
      );
      if (res.ok) {
        const data = await res.json();
        const older: ChatMessage[] = (data.messages || []).map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          username: m.username,
          color: m.color || Colors.textSecondary,
          text: m.text,
          timestamp: m.timestamp,
          reactions: [],
        }));
        if (older.length === 0) {
          setHasMoreHistory(false);
        } else {
          setMessages((prev) => [...older, ...prev]);
        }
      }
    } catch (err) {
      if (__DEV__) console.warn('[CampChat] Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreHistory, messages, campId]);

  // ── Send message ──
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    const optimisticMsg: ChatMessage = {
      id: `local_${Date.now()}`,
      userId: currentUserId,
      username: currentUsername,
      color: currentColor,
      text,
      timestamp: new Date().toISOString(),
      pending: true,
      reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setShowEmojiPicker(false);
    isAtBottomRef.current = true;

    const manager = getSyncManager();
    const sent = manager.sendChatMessage(text);

    if (!sent) {
      // Mark as failed if offline
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.id ? { ...m, pending: false, failed: true } : m
          )
        );
      }, 2000);
    }
  }, [inputText, currentUserId, currentUsername, currentColor]);

  // ── Retry failed message ──
  const handleRetry = useCallback((msg: ChatMessage) => {
    // Remove failed message and resend
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setInputText(msg.text);
    setTimeout(() => {
      const manager = getSyncManager();
      const sent = manager.sendChatMessage(msg.text);
      if (sent) {
        const retry: ChatMessage = {
          ...msg,
          id: `local_${Date.now()}`,
          pending: true,
          failed: false,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, retry]);
        setInputText('');
      }
    }, 100);
  }, []);

  // ── Typing indicator throttle ──
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);

    const now = Date.now();
    if (now - typingThrottleRef.current > 2000 && text.length > 0) {
      typingThrottleRef.current = now;
      const manager = getSyncManager();
      manager.sendTyping();
    }
  }, []);

  // ── Emoji insert ──
  const handleEmojiSelect = useCallback((emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  }, []);

  // ── Reactions ──
  const handleReaction = useCallback((messageId: string, emoji: string) => {
    setReactionTarget(null);
    const manager = getSyncManager();
    manager.sendChatReaction(messageId, emoji);

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = [...(m.reactions || [])];
        const existing = reactions.find((r) => r.emoji === emoji);
        if (existing) {
          if (!existing.userIds.includes(currentUserId)) {
            existing.userIds.push(currentUserId);
            existing.usernames.push(currentUsername);
          }
        } else {
          reactions.push({
            emoji,
            userIds: [currentUserId],
            usernames: [currentUsername],
          });
        }
        return { ...m, reactions };
      })
    );
  }, [currentUserId, currentUsername]);

  // ── Delete message ──
  const handleDelete = useCallback((msg: ChatMessage) => {
    if (msg.userId !== currentUserId) return;

    Alert.alert('Delete Message', 'Remove this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const manager = getSyncManager();
          manager.sendChatDelete(msg.id);
          // Optimistic removal
          setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        },
      },
    ]);
  }, [currentUserId]);

  // ── Long press handler ──
  const handleLongPress = useCallback((msg: ChatMessage) => {
    if (msg.pending || msg.failed) return;

    if (msg.userId === currentUserId) {
      // Own message: show delete option
      Alert.alert('Message Options', undefined, [
        { text: 'React', onPress: () => setReactionTarget(msg.id) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(msg) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      // Other's message: show reaction picker
      setReactionTarget(msg.id);
    }
  }, [currentUserId, handleDelete]);

  // ── Typing indicator text ──
  const typingText = useMemo(() => {
    const users = Array.from(typingUsers.values());
    if (users.length === 0) return null;
    if (users.length === 1) return `${users[0].username} is typing...`;
    if (users.length === 2) return `${users[0].username} and ${users[1].username} are typing...`;
    return `${users.length} people are typing...`;
  }, [typingUsers]);

  // ── Connection status ──
  const connectionStatusColor = isConnected ? Colors.success : Colors.danger;
  const connectionStatusText = isConnected ? 'Connected' : 'Offline';

  if (!visible) return null;

  // ── Render reaction bar (for long-press) ──
  const renderReactionBar = () => {
    if (!reactionTarget) return null;
    return (
      <View style={styles.reactionOverlay}>
        <View style={styles.reactionBar}>
          {QUICK_REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.reactionBtn}
              onPress={() => handleReaction(reactionTarget, emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.reactionCloseBtn}
            onPress={() => setReactionTarget(null)}
          >
            <Text style={styles.reactionCloseBtnText}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render message bubble ──
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.userId === currentUserId;
    const time = new Date(item.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const emojiOnly = isEmojiOnly(item.text);
    const hasReactions = (item.reactions || []).length > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
        style={[styles.msgRow, isMe && styles.msgRowMe]}
      >
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: item.color }]}>
            <Text style={styles.avatarText}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ maxWidth: '75%' }}>
          <View style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            item.failed && styles.bubbleFailed,
            emojiOnly && styles.bubbleEmoji,
          ]}>
            {!isMe && !emojiOnly && (
              <Text style={[styles.senderName, { color: item.color }]}>
                {item.username}
              </Text>
            )}
            <Text style={[
              styles.msgText,
              emojiOnly && styles.msgTextEmoji,
            ]}>
              {item.text}
            </Text>
            <View style={styles.msgMeta}>
              {item.failed ? (
                <TouchableOpacity onPress={() => handleRetry(item)}>
                  <Text style={styles.failedText}>Failed — tap to retry</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.timeText, item.pending && styles.pendingText]}>
                  {item.pending ? 'Sending...' : timeStr}
                </Text>
              )}
            </View>
          </View>

          {/* Reactions row */}
          {hasReactions && (
            <View style={[styles.reactionsRow, isMe && styles.reactionsRowMe]}>
              {(item.reactions || []).map((r) => (
                <TouchableOpacity
                  key={r.emoji}
                  style={[
                    styles.reactionChip,
                    r.userIds.includes(currentUserId) && styles.reactionChipMine,
                  ]}
                  onPress={() => handleReaction(item.id, r.emoji)}
                >
                  <Text style={styles.reactionChipEmoji}>{r.emoji}</Text>
                  {r.userIds.length > 1 && (
                    <Text style={styles.reactionChipCount}>{r.userIds.length}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Connection status bar */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: connectionStatusColor }]} />
        <Text style={styles.statusText}>{connectionStatusText}</Text>
        {!isConnected && (
          <Text style={styles.statusHint}> — messages will send when reconnected</Text>
        )}
      </View>

      {/* Messages list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.sage} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>{'\uD83D\uDCAC'}</Text>
          <Text style={styles.emptyTitle}>Camp Chat</Text>
          <Text style={styles.emptyText}>Say something to your crew!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (isAtBottomRef.current) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onStartReached={handleLoadMore}
          onStartReachedThreshold={0.3}
          ListHeaderComponent={
            loadingMore ? (
              <View style={styles.loadMoreIndicator}>
                <ActivityIndicator size="small" color={Colors.sage} />
                <Text style={styles.loadMoreText}>Loading older messages...</Text>
              </View>
            ) : hasMoreHistory && messages.length >= 50 ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
                <Text style={styles.loadMoreBtnText}>Load older messages</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* "New messages" indicator */}
      {!isAtBottomRef.current && unreadCountRef.current > 0 && (
        <TouchableOpacity
          style={styles.newMessagesBanner}
          onPress={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
            handleScrollToBottom();
          }}
        >
          <Text style={styles.newMessagesBannerText}>
            {'\u2193'} {unreadCountRef.current} new message{unreadCountRef.current > 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}

      {/* Typing indicator */}
      {typingText && (
        <View style={styles.typingBar}>
          <Text style={styles.typingDots}>{'\u00B7\u00B7\u00B7'}</Text>
          <Text style={styles.typingText}>{typingText}</Text>
        </View>
      )}

      {/* Reaction picker overlay */}
      {renderReactionBar()}

      {/* Emoji picker */}
      <ChatEmojiPicker
        visible={showEmojiPicker}
        onSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.emojiToggle}
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Text style={styles.emojiToggleText}>
              {showEmojiPicker ? '\u2328\uFE0F' : '\uD83E\uDD8C'}
            </Text>
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="Message your camp..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            onFocus={() => setShowEmojiPicker(false)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendBtnText}>{'\u2191'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Status bar
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusHint: {
    fontSize: 10,
    color: Colors.textMuted,
  },

  // Messages
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
    gap: 6,
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textOnAccent,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMe: {
    backgroundColor: Colors.moss,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  bubbleFailed: {
    borderColor: Colors.danger,
    borderWidth: 1,
  },
  bubbleEmoji: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  msgText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 19,
  },
  msgTextEmoji: {
    fontSize: 36,
    lineHeight: 44,
  },
  msgMeta: {
    flexDirection: 'row',
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  timeText: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  pendingText: {
    fontStyle: 'italic',
  },
  failedText: {
    fontSize: 10,
    color: Colors.danger,
    fontWeight: '600',
  },

  // Reactions
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
    marginLeft: 4,
    gap: 4,
  },
  reactionsRowMe: {
    justifyContent: 'flex-end',
    marginRight: 4,
    marginLeft: 0,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.mud,
    gap: 2,
  },
  reactionChipMine: {
    borderColor: Colors.moss,
    backgroundColor: Colors.forestDark,
  },
  reactionChipEmoji: {
    fontSize: 12,
  },
  reactionChipCount: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // Reaction picker overlay
  reactionOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  reactionBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.mud,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reactionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  reactionCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginLeft: 4,
  },
  reactionCloseBtnText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '700',
  },

  // Typing indicator
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 4,
  },
  typingDots: {
    fontSize: 16,
    color: Colors.sage,
    fontWeight: '700',
    letterSpacing: 2,
  },
  typingText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // New messages banner
  newMessagesBanner: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: Colors.moss,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 50,
  },
  newMessagesBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textOnAccent,
  },

  // Load more
  loadMoreIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  loadMoreBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginBottom: 8,
  },
  loadMoreBtnText: {
    fontSize: 11,
    color: Colors.sage,
    fontWeight: '600',
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    gap: 6,
  },
  emojiToggle: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiToggleText: {
    fontSize: 22,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.mud,
  },
  sendBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textOnAccent,
  },

  // Empty / Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.tan,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
