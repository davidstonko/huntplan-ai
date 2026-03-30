import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import Colors from '../theme/colors';
import { getSmartResponse, ChatResponse } from '../data/chatKnowledge';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  citations?: string[];
  followUpSuggestions?: string[];
}


/**
 * AI Chat screen — sends queries to the smart response system.
 * Uses getSmartResponse from chatKnowledge for intelligent, context-aware answers.
 * Once /api/v1/planner/query is live, swap in the real API call.
 */
export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      text: 'Welcome to MDHuntFishOutdoors AI! I know about all 192 public hunting lands, 14 shooting ranges, seasons, bag limits, and regulations across Maryland. What would you like to know?',
      isUser: false,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const addMessage = (text: string, isUser: boolean, citations?: string[], followUpSuggestions?: string[]) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString() + (isUser ? 'u' : 'a'),
        text,
        isUser,
        timestamp: new Date().toISOString(),
        citations,
        followUpSuggestions,
      },
    ]);
  };

  const handleSend = async () => {
    const query = inputText.trim();
    if (!query) return;

    addMessage(query, true);
    setInputText('');
    setLoading(true);

    // Use smart response system from chatKnowledge
    setTimeout(() => {
      const response = getSmartResponse(query);
      addMessage(response.text, false, response.citations, response.followUpSuggestions);
      setLoading(false);
    }, 800 + Math.random() * 600);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.messageContainer,
        item.isUser ? styles.messageContainerUser : styles.messageContainerAI,
      ]}
    >
      <View
        style={[
          styles.bubble,
          item.isUser ? styles.bubbleUser : styles.bubbleAI,
        ]}
      >
        <Text style={[styles.bubbleText, item.isUser && styles.bubbleTextUser]}>
          {item.text}
        </Text>

        {/* Show citations if present */}
        {!item.isUser && item.citations && item.citations.length > 0 && (
          <Text style={styles.citationsText}>
            Sources: {item.citations.join(', ')}
          </Text>
        )}

        <Text
          style={[styles.timestamp, item.isUser ? styles.tsUser : styles.tsAI]}
        >
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Show follow-up suggestion chips if present */}
      {!item.isUser && item.followUpSuggestions && item.followUpSuggestions.length > 0 && (
        <View style={styles.followUpContainer}>
          {item.followUpSuggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion}
              style={styles.followUpChip}
              onPress={() => {
                setInputText(suggestion);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.followUpText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      {/* Quick suggestion chips when chat is fresh */}
      {messages.length <= 1 && (
        <View style={styles.suggestionsContainer}>
          {[
            'When is deer season?',
            'Turkey season dates',
            'Bear hunting rules',
            'Sunday hunting rules',
            'Where can I hunt near me?',
            'What licenses do I need?',
            'Plan my next hunt',
          ].map((suggestion) => (
            <TouchableOpacity
              key={suggestion}
              style={styles.suggestionChip}
              onPress={() => {
                setInputText(suggestion);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
      />

      {loading && (
        <View style={styles.thinkingRow}>
          <ActivityIndicator size="small" color={Colors.oak} />
          <Text style={styles.thinkingText}>Thinking...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask about regulations, lands, or hunts..."
          placeholderTextColor={Colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={!loading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || loading) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
          activeOpacity={0.7}
        >
          <Text style={styles.sendIcon}>^</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  messageList: { paddingHorizontal: 12, paddingVertical: 12, paddingBottom: 4 },
  messageContainer: { marginVertical: 4, flexDirection: 'column' },
  messageContainerUser: { alignItems: 'flex-end' },
  messageContainerAI: { alignItems: 'flex-start' },
  bubbleRow: { marginVertical: 4, flexDirection: 'row' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAI: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  bubbleUser: { backgroundColor: Colors.moss, borderBottomRightRadius: 4 },
  bubbleAI: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  bubbleText: { fontSize: 14, lineHeight: 20, color: Colors.textPrimary },
  bubbleTextUser: { color: Colors.textOnAccent },
  timestamp: { marginTop: 4, fontSize: 10 },
  tsUser: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  tsAI: { color: Colors.textMuted },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  thinkingText: { fontSize: 12, color: Colors.textSecondary },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.mud, opacity: 0.5 },
  sendIcon: { color: Colors.textOnAccent, fontSize: 18, fontWeight: '800' },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  suggestionChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.oak,
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.oak,
    fontWeight: '600',
  },
  citationsText: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  followUpContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  followUpChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.oak,
  },
  followUpText: {
    fontSize: 12,
    color: Colors.oak,
    fontWeight: '500',
  },
});
