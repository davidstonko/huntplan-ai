import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocation } from '../../hooks/useLocation';

interface FieldNote {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

interface FieldNotesProps {
  onSave?: (note: FieldNote) => void;
}

export default function FieldNotes({ onSave }: FieldNotesProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const { location, loading: locLoading } = useLocation();
  const [notes, setNotes] = useState<FieldNote[]>([]);

  const handleSaveNote = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Empty Note', 'Please add a title and some notes.');
      return;
    }

    const newNote: FieldNote = {
      id: Date.now().toString(),
      title,
      body,
      timestamp: new Date().toISOString(),
      coordinates: location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          }
        : undefined,
    };

    setNotes([newNote, ...notes]);
    if (onSave) {
      onSave(newNote);
    }

    setTitle('');
    setBody('');
    Alert.alert('Note Saved', 'Your observation has been recorded.');
  };

  const handleDeleteNote = (id: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            setNotes(notes.filter((n) => n.id !== id));
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.editorSection}>
        <Text style={styles.sectionTitle}>New Observation</Text>

        <TextInput
          style={styles.titleInput}
          placeholder="Title (e.g., Fresh buck rub found)"
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.bodyInput]}
          placeholder="Describe what you observed..."
          placeholderTextColor="#666"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <View style={styles.metaInfo}>
          {locLoading ? (
            <Text style={styles.metaText}>📍 Getting location...</Text>
          ) : location ? (
            <Text style={styles.metaText}>
              📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          ) : (
            <Text style={styles.metaText}>📍 Location unavailable</Text>
          )}
          <Text style={styles.metaText}>
            🕐 {new Date().toLocaleTimeString()}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveNote}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>Save Note</Text>
        </TouchableOpacity>
      </View>

      {notes.length > 0 && (
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Recent Notes</Text>

          {notes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View style={styles.noteTitle}>
                  <Text style={styles.noteCardTitle}>{note.title}</Text>
                  <Text style={styles.noteTime}>
                    {new Date(note.timestamp).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteNote(note.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.noteBody}>{note.body}</Text>

              {note.coordinates && (
                <Text style={styles.noteCoords}>
                  📍 {note.coordinates.latitude.toFixed(4)},
                  {note.coordinates.longitude.toFixed(4)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editorSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B7355',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  titleInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  bodyInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    height: 120,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 12,
    paddingHorizontal: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#888',
  },
  saveButton: {
    backgroundColor: '#8B7355',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  notesSection: {
    marginTop: 12,
  },
  noteCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#8B7355',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  noteTitle: {
    flex: 1,
  },
  noteCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  noteTime: {
    fontSize: 11,
    color: '#666',
  },
  deleteButton: {
    fontSize: 18,
    color: '#ff6666',
    fontWeight: '600',
  },
  noteBody: {
    fontSize: 12,
    color: '#ddd',
    lineHeight: 18,
    marginBottom: 8,
  },
  noteCoords: {
    fontSize: 10,
    color: '#8B7355',
    fontStyle: 'italic',
  },
});
