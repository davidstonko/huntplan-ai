/**
 * @file ForumScreen.tsx
 * @description Community forum for discussing public lands, sharing strategies,
 * and connecting with other Maryland hunters.
 *
 * Features:
 * - Discussion threads organized by category
 * - Land-specific discussions (tied to 192 public lands)
 * - Gear marketplace listings
 * - Land permission / lease listings
 * - Thread creation with category picker
 * - Reply system with nested comments
 *
 * @module Screens
 * @version 3.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';
import Config from '../config';

// ── Types ──────────────────────────────────────────────────────

interface ForumThread {
  id: string;
  title: string;
  body: string;
  category: string;
  land_name?: string;
  county?: string;
  tags?: string[];
  reply_count: number;
  upvotes: number;
  view_count: number;
  is_pinned: boolean;
  username?: string;
  created_at: string;
  last_reply_at?: string;
}

interface ThreadReply {
  id: string;
  thread_id: string;
  author: string;
  body: string;
  created_at: string;
}

interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  listing_type: string;
  price?: number;
  county?: string;
  status: string;
  username?: string;
  created_at: string;
}

type ActiveTab = 'discussions' | 'marketplace' | 'permissions';
type ForumItem = ForumThread | MarketplaceListing;

const CATEGORIES = [
  { value: 'general', label: 'General', icon: '💬' },
  { value: 'land_discussion', label: 'Public Land', icon: '🗺️' },
  { value: 'strategy', label: 'Strategy', icon: '🎯' },
  { value: 'regulations', label: 'Regulations', icon: '📋' },
  { value: 'gear', label: 'Gear', icon: '🎒' },
  { value: 'season_report', label: 'Season Report', icon: '📊' },
];

const GEAR_CATEGORIES = [
  { value: 'firearms', label: 'Firearms' },
  { value: 'archery', label: 'Archery' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'optics', label: 'Optics' },
  { value: 'tree_stands', label: 'Tree Stands' },
  { value: 'decoys', label: 'Decoys' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
];

// ── API Helpers ────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('auth_token');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

// ── Main Component ─────────────────────────────────────────────

export default function ForumScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('discussions');
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewThread, setShowNewThread] = useState(false);

  // New thread form
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  // Thread detail view
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadReplies, setThreadReplies] = useState<Record<string, ThreadReply[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [replyText, setReplyText] = useState('');
  const [upvotedThreads, setUpvotedThreads] = useState<Set<string>>(new Set());

  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ sort: 'recent', per_page: '30' });
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/forum/threads?${params}`,
      );
      if (response.ok) {
        const data = await response.json();
        setThreads(data.threads || []);
      }
    } catch (err) {
      if (__DEV__) console.error('[Forum] Failed to fetch threads:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/forum/marketplace?sort=recent&per_page=30`,
      );
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings || []);
      }
    } catch (err) {
      if (__DEV__) console.error('[Forum] Failed to fetch listings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'discussions') fetchThreads();
    else if (activeTab === 'marketplace') fetchListings();
  }, [activeTab, fetchThreads, fetchListings]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'discussions') await fetchThreads();
    else await fetchListings();
    setRefreshing(false);
  };

  const handleCreateThread = async () => {
    if (!newTitle.trim() || !newBody.trim()) {
      Alert.alert('Missing Info', 'Please enter a title and body for your post.');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${Config.API_BASE_URL}/api/v1/forum/threads`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newTitle.trim(),
          body: newBody.trim(),
          category: newCategory,
        }),
      });

      if (response.ok) {
        setShowNewThread(false);
        setNewTitle('');
        setNewBody('');
        fetchThreads();
      } else {
        Alert.alert('Error', 'Failed to create post. Please try again.');
      }
    } catch (err) {
      Alert.alert('Offline', 'Could not connect to server. Post saved locally.');
    }
  };

  const formatTimeAgo = (isoDate: string): string => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  /** Handle upvote for a forum thread */
  const handleThreadUpvote = useCallback(
    async (threadId: string) => {
      if (upvotedThreads.has(threadId)) {
        return; // Already upvoted
      }

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `${Config.API_BASE_URL}/api/v1/forum/threads/${threadId}/upvote`,
          {
            method: 'POST',
            headers,
          }
        );

        if (response.ok) {
          // Optimistic update
          setThreads((prevThreads) =>
            prevThreads.map((t) =>
              t.id === threadId ? { ...t, upvotes: t.upvotes + 1 } : t
            )
          );
          setUpvotedThreads((prev) => new Set([...prev, threadId]));
        } else {
          Alert.alert('Error', 'Failed to upvote thread');
        }
      } catch (err) {
        if (__DEV__) console.error('[Forum] Upvote failed:', err);
        Alert.alert('Error', 'Failed to upvote thread');
      }
    },
    [upvotedThreads]
  );

  /** Fetch replies for a thread */
  const fetchThreadReplies = useCallback(async (threadId: string) => {
    if (threadReplies[threadId]) {
      // Already loaded, just select it
      setSelectedThreadId(threadId);
      return;
    }

    try {
      setLoadingReplies((prev) => new Set([...prev, threadId]));
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/forum/threads/${threadId}/replies`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        const replies: ThreadReply[] = data.replies || [];
        setThreadReplies((prev) => ({ ...prev, [threadId]: replies }));
        setSelectedThreadId(threadId);
        setReplyText('');
      } else {
        Alert.alert('Error', 'Failed to load thread replies');
      }
    } catch (err) {
      if (__DEV__) console.error('[Forum] Failed to fetch replies:', err);
      Alert.alert('Error', 'Failed to load replies');
    } finally {
      setLoadingReplies((prev) => {
        const next = new Set(prev);
        next.delete(threadId);
        return next;
      });
    }
  }, [threadReplies]);

  /** Submit a reply to a thread */
  const handleThreadReply = useCallback(async () => {
    if (!selectedThreadId || !replyText.trim()) {
      Alert.alert('Empty Reply', 'Please enter a reply');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/forum/threads/${selectedThreadId}/replies`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ body: replyText.trim() }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const newReply: ThreadReply = {
          id: data.id || Date.now().toString(),
          thread_id: selectedThreadId,
          author: data.author || 'Anonymous',
          body: replyText.trim(),
          created_at: new Date().toISOString(),
        };

        setThreadReplies((prev) => ({
          ...prev,
          [selectedThreadId]: [...(prev[selectedThreadId] || []), newReply],
        }));

        // Update reply count
        setThreads((prevThreads) =>
          prevThreads.map((t) =>
            t.id === selectedThreadId
              ? { ...t, reply_count: t.reply_count + 1 }
              : t
          )
        );

        setReplyText('');
      } else {
        Alert.alert('Error', 'Failed to post reply');
      }
    } catch (err) {
      if (__DEV__) console.error('[Forum] Reply failed:', err);
      Alert.alert('Error', 'Failed to post reply');
    }
  }, [selectedThreadId, replyText]);

  // ── Render Thread Item ──

  const renderThread = ({ item }: { item: ForumThread }) => {
    const cat = CATEGORIES.find((c) => c.value === item.category);
    const isUpvoted = upvotedThreads.has(item.id);

    return (
      <TouchableOpacity
        style={styles.threadCard}
        activeOpacity={0.7}
        onPress={() => fetchThreadReplies(item.id)}
      >
        {item.is_pinned && (
          <Text style={styles.pinnedBadge}>{'📌'} Pinned</Text>
        )}
        <View style={styles.threadHeader}>
          <Text style={styles.categoryBadge}>
            {cat?.icon || '💬'} {cat?.label || item.category}
          </Text>
          {item.county && (
            <Text style={styles.countyBadge}>{item.county} Co.</Text>
          )}
        </View>
        <Text style={styles.threadTitle}>{item.title}</Text>
        <Text style={styles.threadBody} numberOfLines={2}>
          {item.body}
        </Text>
        {item.land_name && (
          <Text style={styles.landTag}>{'🗺️'} {item.land_name}</Text>
        )}
        <View style={styles.threadFooter}>
          <Text style={styles.footerText}>
            {'👤'} {item.username || 'Anonymous'}
          </Text>
          <TouchableOpacity
            onPress={() => handleThreadUpvote(item.id)}
            disabled={isUpvoted}
          >
            <Text style={[styles.footerText, isUpvoted && styles.footerTextActive]}>
              {'👍'} {item.upvotes}{isUpvoted ? ' ✓' : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => fetchThreadReplies(item.id)}>
            <Text style={styles.footerText}>
              {'💬'} {item.reply_count}
            </Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>{formatTimeAgo(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render Marketplace Item ──

  const renderListing = ({ item }: { item: MarketplaceListing }) => (
    <TouchableOpacity style={styles.threadCard} activeOpacity={0.7}>
      <View style={styles.threadHeader}>
        <Text style={styles.categoryBadge}>
          {item.listing_type === 'sell' ? '💰' : item.listing_type === 'trade' ? '🔄' : '🆓'}{' '}
          {item.listing_type.charAt(0).toUpperCase() + item.listing_type.slice(1)}
        </Text>
        <Text style={styles.conditionBadge}>{item.condition.replace('_', ' ')}</Text>
      </View>
      <Text style={styles.threadTitle}>{item.title}</Text>
      {item.price != null && (
        <Text style={styles.priceTag}>${item.price.toFixed(0)}</Text>
      )}
      <Text style={styles.threadBody} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.threadFooter}>
        <Text style={styles.footerText}>
          {'👤'} {item.username || 'Anonymous'}
        </Text>
        {item.county && <Text style={styles.footerText}>{item.county} Co.</Text>}
        <Text style={styles.footerText}>{formatTimeAgo(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Tab Switcher ── */}
      <View style={styles.tabBar}>
        {(['discussions', 'marketplace', 'permissions'] as ActiveTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
            accessibilityLabel={tab === 'discussions' ? 'Forum' : tab === 'marketplace' ? 'Gear marketplace' : 'Land access'}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
            accessibilityHint={tab === 'discussions' ? 'Shows discussion threads' : tab === 'marketplace' ? 'Shows gear for sale' : 'Shows land access posts'}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'discussions' ? '💬 Forum' : tab === 'marketplace' ? '🏪 Gear' : '🏡 Land'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Category Filters (Forum only) ── */}
      {activeTab === 'discussions' && (
        <FlatList
          horizontal
          data={[{ value: null, label: 'All', icon: '📋' }, ...CATEGORIES]}
          keyExtractor={(item) => item.value || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCategory === item.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(item.value)}
              activeOpacity={0.7}
              accessibilityLabel={`Filter by ${item.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === item.value }}
              accessibilityHint={`Shows discussions in ${item.label} category`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.icon} {item.label}
              </Text>
            </TouchableOpacity>
          )}
          style={styles.filterBar}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
        />
      )}

      {/* ── Thread / Listing List ── */}
      {loading && threads.length === 0 && listings.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.moss} />
          <Text style={styles.loadingText}>Loading community posts...</Text>
        </View>
      ) : (
        <FlatList<ForumItem>
          data={activeTab === 'discussions' ? threads : listings}
          keyExtractor={(item) => item.id}
          renderItem={(activeTab === 'discussions' ? renderThread : renderListing) as any}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.moss} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>
                {activeTab === 'discussions' ? '💬' : '🏪'}
              </Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'discussions'
                  ? 'No discussions yet'
                  : 'No listings yet'}
              </Text>
              <Text style={styles.emptyText}>
                Be the first to start a conversation!
              </Text>
            </View>
          }
        />
      )}

      {/* ── New Post FAB ── */}
      {activeTab === 'discussions' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowNewThread(true)}
          activeOpacity={0.8}
          accessibilityLabel="Create new discussion"
          accessibilityRole="button"
          accessibilityHint="Opens dialog to create a new forum discussion thread"
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* ── New Thread Modal ── */}
      <Modal visible={showNewThread} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowNewThread(false)}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              accessibilityHint="Closes the new discussion dialog without posting"
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Discussion</Text>
            <TouchableOpacity
              onPress={handleCreateThread}
              accessibilityLabel="Post"
              accessibilityRole="button"
              accessibilityHint="Posts the new discussion thread to the forum"
            >
              <Text style={styles.modalPost}>Post</Text>
            </TouchableOpacity>
          </View>

          {/* Category Picker */}
          <FlatList
            horizontal
            data={CATEGORIES}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  newCategory === item.value && styles.filterChipActive,
                ]}
                onPress={() => setNewCategory(item.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    newCategory === item.value && styles.filterChipTextActive,
                  ]}
                >
                  {item.icon} {item.label}
                </Text>
              </TouchableOpacity>
            )}
            style={{ flexGrow: 0, marginVertical: 8 }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
          />

          <TextInput
            style={styles.titleInput}
            placeholder="Thread title..."
            placeholderTextColor={Colors.textMuted}
            value={newTitle}
            onChangeText={setNewTitle}
            maxLength={256}
            accessibilityLabel="Discussion title"
            accessibilityRole="search"
            accessibilityHint="Enter the title for your discussion thread"
          />
          <TextInput
            style={styles.bodyInput}
            placeholder="What's on your mind? Share your experience, ask a question, or start a discussion..."
            placeholderTextColor={Colors.textMuted}
            value={newBody}
            onChangeText={setNewBody}
            multiline
            textAlignVertical="top"
            maxLength={10000}
            accessibilityLabel="Discussion content"
            accessibilityRole="search"
            accessibilityHint="Enter the content for your discussion thread"
          />
        </SafeAreaView>
      </Modal>

      {/* ── Thread Detail Modal ── */}
      <Modal visible={!!selectedThreadId} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedThreadId(null)}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Text style={styles.modalCancel}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Thread</Text>
            <View style={{ width: 50 }} />
          </View>

          {selectedThreadId && threads.find((t) => t.id === selectedThreadId) ? (
            <View style={{ flex: 1 }}>
              {/* Thread Content */}
              <View style={styles.threadDetailContainer}>
                <Text style={styles.threadDetailTitle}>
                  {threads.find((t) => t.id === selectedThreadId)?.title}
                </Text>
                <Text style={styles.threadDetailBody}>
                  {threads.find((t) => t.id === selectedThreadId)?.body}
                </Text>
              </View>

              {/* Replies Section */}
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={styles.repliesTitle}>
                  Replies ({threadReplies[selectedThreadId]?.length || 0})
                </Text>

                {loadingReplies.has(selectedThreadId) ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.moss} />
                  </View>
                ) : (
                  <FlatList
                    data={threadReplies[selectedThreadId] || []}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item: reply }) => (
                      <View style={styles.replyItemDetail}>
                        <Text style={styles.replyAuthor}>{reply.author}</Text>
                        <Text style={styles.replyBodyDetail}>{reply.body}</Text>
                        <Text style={styles.replyDate}>
                          {formatTimeAgo(reply.created_at)}
                        </Text>
                      </View>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.noRepliesText}>
                        No replies yet. Be the first!
                      </Text>
                    }
                    scrollEnabled
                  />
                )}
              </View>

              {/* Reply Input */}
              <View style={styles.replyInputContainerDetail}>
                <TextInput
                  style={styles.replyInputDetail}
                  placeholder="Write a reply..."
                  placeholderTextColor={Colors.textMuted}
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={styles.replySubmitBtnDetail}
                  onPress={handleThreadReply}
                >
                  <Text style={styles.replySubmitBtnTextDetail}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: Colors.moss },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.textOnAccent },
  filterBar: { flexGrow: 0, marginVertical: 6 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.clay,
  },
  filterChipActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  filterChipText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.textOnAccent },
  listContent: { paddingHorizontal: 12, paddingBottom: 80 },
  threadCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  threadHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    alignItems: 'center',
  },
  pinnedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  countyBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  conditionBadge: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  threadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  threadBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  landTag: {
    fontSize: 10,
    color: Colors.moss,
    fontWeight: '600',
    marginBottom: 6,
  },
  priceTag: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.success,
    marginBottom: 4,
  },
  threadFooter: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.clay,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  footerTextActive: {
    color: Colors.moss,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    fontSize: 28,
    color: Colors.textOnAccent,
    fontWeight: '400',
    lineHeight: 30,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  modalCancel: { fontSize: 14, color: Colors.textSecondary },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  modalPost: { fontSize: 14, fontWeight: '700', color: Colors.moss },
  titleInput: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.clay,
  },
  bodyInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    lineHeight: 22,
  },
  threadDetailContainer: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  threadDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  threadDetailBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  repliesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginVertical: 12,
  },
  replyItemDetail: {
    backgroundColor: Colors.surface,
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.tan,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.oak,
    marginBottom: 4,
  },
  replyBodyDetail: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  replyDate: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  noRepliesText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  replyInputContainerDetail: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    backgroundColor: Colors.surface,
  },
  replyInputDetail: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 13,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  replySubmitBtnDetail: {
    backgroundColor: Colors.moss,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replySubmitBtnTextDetail: {
    color: Colors.textOnAccent,
    fontSize: 13,
    fontWeight: '600',
  },
});
