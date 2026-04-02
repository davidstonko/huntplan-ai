import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  citation?: string;
}

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.isUser;

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text
          style={[
            styles.text,
            isUser ? styles.userText : styles.aiText,
          ]}
        >
          {message.text}
        </Text>

        {message.citation && (
          <View style={styles.citation}>
            <Text style={styles.citationText}>
              Source: {message.citation}
            </Text>
          </View>
        )}

        <Text
          style={[
            styles.timestamp,
            isUser ? styles.userTimestamp : styles.aiTimestamp,
          ]}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: Colors.oak,
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: Colors.mdWhite,
  },
  aiText: {
    color: Colors.textPrimary,
  },
  citation: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.overlayLight,
  },
  citationText: {
    fontSize: 11,
    color: Colors.oak,
    fontStyle: 'italic',
  },
  timestamp: {
    marginTop: 4,
    fontSize: 10,
  },
  userTimestamp: {
    color: Colors.mdWhite,
    textAlign: 'right',
    opacity: 0.6,
  },
  aiTimestamp: {
    color: Colors.textPrimary,
    opacity: 0.5,
  },
});
