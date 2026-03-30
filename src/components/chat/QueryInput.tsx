import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';

interface QueryInputProps {
  onSend: (query: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function QueryInput({
  onSend,
  disabled = false,
  loading = false,
}: QueryInputProps) {
  const [query, setQuery] = useState('');

  const handleSend = () => {
    if (query.trim()) {
      onSend(query);
      setQuery('');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Ask about hunting..."
        placeholderTextColor="#666"
        value={query}
        onChangeText={setQuery}
        multiline
        editable={!disabled && !loading}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          (disabled || !query.trim() || loading) && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={disabled || !query.trim() || loading}
        activeOpacity={0.7}
      >
        <Text style={styles.sendButtonText}>↑</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#2a2a2a',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B7355',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
