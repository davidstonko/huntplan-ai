/**
 * CampDetailsEditor
 *
 * Moderator-only modal for editing the surface-level metadata of a Deer
 * Camp: its name, description, and attached documents / reference photos.
 *
 * Added 2026-04-20 per user directive: "there should be some panel where
 * [moderators] are able to describe the deer camp, attach documents or
 * photos, and draw on the map. they should be able to invite other
 * members, which would create a link to the deer camp."
 *
 * Draw-on-the-map and member-invite live in DeerCampScreen + CampInviteLinkModal
 * — this component covers the metadata + attachments portion only. The
 * caller (DeerCampScreen) is responsible for gating access: only members
 * whose role === 'admin' see the "Edit Details" button that opens this
 * modal.
 *
 * Attachments: Images are picked via `pickPhoto` (react-native-image-picker);
 * documents (PDF, Word, plaintext) are picked via `pickDocument`
 * (@react-native-documents/picker). The user must run
 * `npm install && cd ios && pod install` to link both native modules before
 * building for iOS.
 *
 * State model:
 *   - `name` and `description` are controlled locally and committed to the
 *     DeerCampContext via `renameCamp` / `updateCampDescription` only when
 *     the user taps Save. Canceling leaves the camp untouched.
 *   - Document add/remove is committed immediately to the context (via
 *     `addCampDocument` / `removeCampDocument`) because those are discrete,
 *     reversible, undoable-via-remove actions and there's no ergonomic
 *     benefit to batching them.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Colors from '../../theme/colors';
import { DeerCamp, CampDocument } from '../../types/deercamp';
import { pickPhoto } from '../../services/imagePicker';
import { pickDocument } from '../../services/documentPicker';

interface Props {
  visible: boolean;
  camp: DeerCamp | null;
  currentUserId: string;
  onClose: () => void;
  onSave: (opts: { name: string; description: string }) => void;
  onAddDocument: (doc: CampDocument) => void;
  onRemoveDocument: (documentId: string) => void;
}

/**
 * generateId — same shape as the one in DeerCampContext. Kept local to
 * avoid circular imports between components/ and context/.
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

export default function CampDetailsEditor({
  visible,
  camp,
  currentUserId,
  onClose,
  onSave,
  onAddDocument,
  onRemoveDocument,
}: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Rehydrate form state whenever the modal opens for a (possibly different)
  // camp. Skipping this means stale values persist across opens.
  useEffect(() => {
    if (visible && camp) {
      setName(camp.name);
      setDescription(camp.description ?? '');
    }
  }, [visible, camp]);

  if (!camp) return null;

  const documents = camp.documents ?? [];

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), description });
    onClose();
  };

  const handleAttachPhoto = async () => {
    const uri = await pickPhoto();
    if (!uri) return;
    const doc: CampDocument = {
      id: generateId(),
      addedBy: currentUserId,
      addedAt: new Date().toISOString(),
      title: `Photo ${documents.length + 1}`,
      kind: 'image',
      uri,
    };
    onAddDocument(doc);
  };

  const handleAttachDocument = async () => {
    const picked = await pickDocument();
    if (!picked) return;

    // Determine document kind based on MIME type or filename.
    let kind: 'pdf' | 'other' = 'other';
    if (picked.mime === 'application/pdf' || picked.name.toLowerCase().endsWith('.pdf')) {
      kind = 'pdf';
    }

    // Truncate title to 80 chars if needed.
    const title = picked.name.length > 80 ? picked.name.slice(0, 77) + '...' : picked.name;

    const doc: CampDocument = {
      id: generateId(),
      addedBy: currentUserId,
      addedAt: new Date().toISOString(),
      title,
      kind,
      uri: picked.uri,
      sizeBytes: picked.size,
    };
    onAddDocument(doc);
  };

  const handleRemoveDocument = (doc: CampDocument) => {
    Alert.alert('Remove attachment?', `"${doc.title}" will be removed from the camp.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onRemoveDocument(doc.id),
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Pressable onPress={onClose} hitSlop={16}>
              <Text style={styles.cancel}>CANCEL</Text>
            </Pressable>
            <Text style={styles.title}>Edit Camp</Text>
            <Pressable onPress={handleSave} hitSlop={16} disabled={!canSave}>
              <Text style={[styles.save, !canSave && styles.saveDisabled]}>SAVE</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody}>
            <Text style={styles.label}>CAMP NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Oak Ridge Hunt Club"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              maxLength={80}
            />

            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Lease rules, meeting spot, regs for this camp..."
              placeholderTextColor={Colors.textMuted}
              style={[styles.input, styles.multilineInput]}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.helper}>
              Shown to every camp member on the detail screen. Moderators
              only.
            </Text>

            <View style={styles.sectionHeader}>
              <Text style={styles.label}>ATTACHMENTS</Text>
              <View style={styles.attachButtonsRow}>
                <Pressable onPress={handleAttachPhoto} hitSlop={10}>
                  <Text style={styles.addLink}>+ ATTACH PHOTO</Text>
                </Pressable>
                <Pressable onPress={handleAttachDocument} hitSlop={10}>
                  <Text style={styles.addLink}>+ ATTACH DOCUMENT</Text>
                </Pressable>
              </View>
            </View>

            {documents.length === 0 ? (
              <Text style={styles.empty}>
                No attachments yet. Attach property-map scans, lease photos,
                or hero shots so members have shared reference material.
              </Text>
            ) : (
              documents.map((doc) => (
                <View key={doc.id} style={styles.docRow}>
                  <View style={styles.docKindBadge}>
                    <Text style={styles.docKindText}>
                      {doc.kind === 'image' ? 'IMG' : doc.kind === 'pdf' ? 'PDF' : 'DOC'}
                    </Text>
                  </View>
                  <View style={styles.docBody}>
                    <Text style={styles.docTitle} numberOfLines={1}>
                      {doc.title}
                    </Text>
                    <Text style={styles.docMeta} numberOfLines={1}>
                      {new Date(doc.addedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleRemoveDocument(doc)} hitSlop={10}>
                    <Text style={styles.removeLink}>REMOVE</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: Colors.mud,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: Colors.mud,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  cancel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  save: {
    color: Colors.mdGold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  saveDisabled: {
    color: Colors.textMuted,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollBody: {
    padding: 18,
    paddingBottom: 40,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginBottom: 6,
  },
  multilineInput: {
    height: 120,
  },
  helper: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  attachButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addLink: {
    color: Colors.mdGold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  empty: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderStyle: 'dashed',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginBottom: 8,
  },
  docKindBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: Colors.mdRed,
    marginRight: 10,
  },
  docKindText: {
    color: Colors.textOnAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  docBody: {
    flex: 1,
  },
  docTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  docMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  removeLink: {
    color: Colors.danger,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
