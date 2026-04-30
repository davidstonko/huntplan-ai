/**
 * imagePicker.ts — Thin wrapper over react-native-image-picker.
 *
 * Provides a single "pick a photo" helper that the camp screens call. The
 * wrapper resolves to a local file URI (e.g., `file:///...`) that
 * photoService.uploadPhoto can accept directly, or null if the user
 * cancelled / an error occurred.
 *
 * We deliberately keep this surface tiny — the underlying library returns a
 * rich Asset with EXIF / base64 / size fields but we only need the URI for
 * presigned-upload flow.
 */

import { Alert } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  CameraOptions,
  ImageLibraryOptions,
  ImagePickerResponse,
} from 'react-native-image-picker';

type PickSource = 'camera' | 'library';

/**
 * Standard options: JPEG output, reasonable max size so uploads don't blow
 * through the presigned-url expiry, quality tuned for photo review.
 */
const BASE_CAMERA_OPTS: CameraOptions = {
  mediaType: 'photo',
  quality: 0.8,
  maxWidth: 2048,
  maxHeight: 2048,
  saveToPhotos: false,
  cameraType: 'back',
};

const BASE_LIBRARY_OPTS: ImageLibraryOptions = {
  mediaType: 'photo',
  quality: 0.8,
  maxWidth: 2048,
  maxHeight: 2048,
  selectionLimit: 1,
};

/**
 * Shared result handler: extracts the first asset URI, or returns null for
 * cancellation / error. Errors are surfaced to the user via Alert because
 * the camp screens present this from a modal and need visible feedback.
 */
function extractUri(res: ImagePickerResponse): string | null {
  if (res.didCancel) return null;
  if (res.errorCode) {
    const msg = res.errorMessage || 'Photo picker error';
    // Permission denial is the most common path — help the user recover.
    if (res.errorCode === 'permission' || res.errorCode === 'camera_unavailable') {
      Alert.alert(
        'Permission Needed',
        'Enable Camera / Photos access in iOS Settings → MDHuntFishOutdoors to attach pictures.',
      );
    } else {
      Alert.alert('Photo Error', msg);
    }
    return null;
  }
  const asset = res.assets?.[0];
  return asset?.uri ?? null;
}

/**
 * Launch the camera to take a new photo. Returns the file URI, or null if
 * the user cancelled or the OS denied access.
 */
export async function takePhoto(): Promise<string | null> {
  try {
    const res = await launchCamera(BASE_CAMERA_OPTS);
    return extractUri(res);
  } catch (err) {
    Alert.alert('Camera Error', String(err));
    return null;
  }
}

/**
 * Launch the photo library picker. Returns the file URI, or null if the
 * user cancelled or access was denied.
 */
export async function pickFromLibrary(): Promise<string | null> {
  try {
    const res = await launchImageLibrary(BASE_LIBRARY_OPTS);
    return extractUri(res);
  } catch (err) {
    Alert.alert('Photo Library Error', String(err));
    return null;
  }
}

/**
 * Present an iOS action-sheet-style chooser: Take Photo vs. Choose from Library.
 * Resolves with the selected URI or null on cancel.
 */
export function pickPhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Add Photo',
      'Take a new photo or choose an existing one from your library.',
      [
        {
          text: 'Take Photo',
          onPress: async () => resolve(await takePhoto()),
        },
        {
          text: 'Choose from Library',
          onPress: async () => resolve(await pickFromLibrary()),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
