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
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://huntplan-api.onrender.com';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  citations?: string[];
  followUpSuggestions?: string[];
}


/**
 * @file ChatScreen.tsx
 * @description AI-powered chat assistant for hunting knowledge and regulations.
 * Provides intelligent Q&A about Maryland hunting seasons, bag limits, public lands,
 * and hunting rules with follow-up suggestions and source citations.
 *
 * @module Screens
 * @version 2.0.0
 *
 * Key features:
 * - Conversational chat interface with message bubbles and timestamps
 * - Claude AI-powered answers via backend RAG pipeline (/api/v1/planner/ai/query)
 * - Offline fallback to local keyword-matching knowledge base
 * - Citation footer showing sources for regulation answers
 * - Follow-up suggestion chips for follow-on questions
 * - Quick-start suggestion chips on fresh chat (When is deer season?, Bear hunting rules?, etc.)
 * - Animated "Thinking..." indicator during response generation
 * - Multiline input with send button and keyboard avoidance
 */

/**
 * ChatScreen — Interactive AI chat for hunting questions and guidance.
 *
 * Main chat interface that sends user queries to the smart response system for
 * intelligent, context-aware answers about MD hunting regulations, seasons, lands,
 * and bag limits. Displays AI responses with citations and suggestions for follow-up
 * questions. Currently uses local getSmartResponse; future versions will call the
 * FastAPI backend at /api/v1/planner/query.
 *
 * @returns {JSX.Element} Full-screen chat UI with message list, input bar, and suggestion chips
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

  /**
   * Send query to backend AI endpoint with local fallback.
   * Tries the Claude-powered RAG API first; if offline or error,
   * falls back to the local keyword-matching knowledge base.
   */
  const handleSend = async () => {
    const query = inputText.trim();
    if (!query) return;

    addMessage(query, true);
    setInputText('');
    setLoading(true);

    try {
      // Try backend AI (Claude + RAG)
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/planner/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query,
          state: 'MD',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addMessage(
          data.answer,
          false,
          data.sources?.length > 0 ? data.sources : undefined,
          data.follow_up_suggestions?.length > 0 ? data.follow_up_suggestions : undefined,
        );
        setLoading(false);
        return;
      }
      // If non-OK response, fall through to local fallback
    } catch (_err) {
      // Network error or timeout — use local fallback
    }

    // Local fallback: keyword-matching knowledge base
    const localResponse = getSmartResponse(query);
    addMessage(
      localResponse.text,
      false,
      localResponse.citations,
      localResponse.followUpSuggestions,
    );
    setLoading(false);
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
