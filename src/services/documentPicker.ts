/**
 * documentPicker.ts — Thin wrapper over @react-native-documents/picker.
 *
 * Provides a single "pick a document" helper that the camp screens call to
 * attach PDFs and other document types. Returns a promise resolving to
 * { uri, name, size?, mime? } or null if the user cancelled / an error occurred.
 *
 * This mirrors the pattern of imagePicker.ts but is specialized for documents
 * (PDF, Word, plaintext) rather than photos.
 *
 * Package note (2026-04-24):
 *   The npm scope `@react-native-documents/document-picker` DOES NOT EXIST.
 *   The real package is `@react-native-documents/picker`. An earlier version
 *   of this file referenced the wrong path and would have broken `npm install`
 *   on David's Mac. Fixed. v10.1.7 is the latest 10.x release compatible with
 *   RN 0.76 (v11+ require RN 0.79+).
 *
 *   Public API (from official docs https://react-native-documents.github.io/docs/doc-picker-api):
 *     import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
 *     const [file] = await pick({ type: [types.pdf, ...] });
 *     // file: { uri, name, type, size, ... }
 *     // cancel check: isErrorWithCode(err, errorCodes.OPERATION_CANCELED)
 *
 * Because the native module may not be linked yet during development/testing,
 * we defensively wrap the import in a try/catch. If the module is unavailable
 * (e.g., during jest test runs), pickDocument alerts the user and returns null.
 */

import { Alert } from 'react-native';

/**
 * Shape of the object returned by document picker.
 * Used by CampDetailsEditor to construct CampDocument entries.
 */
export interface PickedDocument {
  uri: string;
  name: string;
  size?: number;
  mime?: string;
}

/**
 * Lazy-load the document picker. If the native module is not yet linked
 * (e.g., during jest tests or before `pod install`), return null and alert.
 */
let pickerModule: any = null;
let pickerLoadAttempted = false;

function loadPicker() {
  if (pickerLoadAttempted) return pickerModule;
  pickerLoadAttempted = true;
  try {
    pickerModule = require('@react-native-documents/picker');
  } catch (err) {
    // Module not linked yet (jest, pre-`pod install` bootstrap).
    console.log('[documentPicker] module not linked:', String(err));
    pickerModule = undefined;
  }
  return pickerModule;
}

/**
 * Present the document picker and allow the user to select a PDF or other document.
 * Supports PDF, Word (.docx, .doc), and plaintext files.
 * Returns { uri, name, size, mime } from the selected file, or null if user cancelled.
 */
export async function pickDocument(): Promise<PickedDocument | null> {
  const picker = loadPicker();

  if (!picker || typeof picker.pick !== 'function') {
    Alert.alert(
      'Document Picker Unavailable',
      'Please run `npm install && cd ios && pod install` to set up document picking.',
    );
    return null;
  }

  try {
    const result = await picker.pick({
      type: [
        picker.types.pdf,
        picker.types.doc,
        picker.types.docx,
        picker.types.plainText,
      ],
    });

    // pick() returns an array in v10+. Some versions return a single object.
    const file = Array.isArray(result) ? result[0] : result;

    if (!file || !file.uri) {
      return null;
    }

    const name = file.name || 'document';
    const uri = file.uri;
    const size = typeof file.size === 'number' ? file.size : undefined;
    let mime: string | undefined = file.type || undefined;

    // Fallback MIME inference from filename if not provided by picker.
    if (!mime && name) {
      if (name.endsWith('.pdf')) mime = 'application/pdf';
      else if (name.endsWith('.docx'))
        mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (name.endsWith('.doc')) mime = 'application/msword';
      else if (name.endsWith('.txt')) mime = 'text/plain';
    }

    return { uri, name, size, mime };
  } catch (err) {
    // Cancellation: user tapped Cancel in the native picker.
    // v10+ exposes isErrorWithCode + errorCodes.OPERATION_CANCELED.
    if (
      picker.isErrorWithCode &&
      picker.errorCodes &&
      picker.isErrorWithCode(err, picker.errorCodes.OPERATION_CANCELED)
    ) {
      return null;
    }
    // Older-style cancellation fallbacks.
    if ((err as any)?.code === 'OPERATION_CANCELED') return null;
    if ((err as any)?.code === 'DOCUMENT_PICKER_CANCELED') return null;

    const msg = (err as any)?.message || String(err) || 'Document picker error';
    Alert.alert('Document Picker Error', msg);
    return null;
  }
}
