/**
 * @file useModalFocus.ts
 * @description Hook that reliably focuses a TextInput when a modal opens.
 *
 * React Native's `autoFocus` prop is unreliable inside `<Modal>` because the
 * component mounts before the modal animation completes. This hook works around
 * that by programmatically calling `.focus()` after a short delay.
 *
 * Usage:
 *   const inputRef = useModalFocus<TextInput>(showModal);
 *   <TextInput ref={inputRef} ... />
 *
 * @module Hooks
 * @version 1.0.0
 */

import { useRef, useEffect } from 'react';
import { TextInput } from 'react-native';

/**
 * Returns a ref to attach to a TextInput. When `visible` becomes true,
 * the input is focused after a 350ms delay (enough for modal animation).
 */
export function useModalFocus(visible: boolean, delay = 350) {
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        ref.current?.focus();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [visible, delay]);

  return ref;
}
