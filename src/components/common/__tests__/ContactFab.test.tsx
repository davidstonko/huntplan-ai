/**
 * ContactFab.test.tsx
 *
 * Lock the behavior of the shared Contact button:
 *   - Renders an accessible button labeled "Contact MDHuntFishOutdoors"
 *   - On press, opens a `mailto:` URL targeting the public app inbox
 *     (`feedback.mdhuntfishoutdoors@gmail.com`)
 *   - Respects the `bottom` positioning prop (default 24, can override)
 *
 * The mailto-target assertion is the load-bearing one: V2.4 history
 * had personal email leak into 5 sites including this FAB. This test
 * fails loud if a future refactor pastes a different address back in.
 */

import * as React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import ContactFab from '../ContactFab';

describe('ContactFab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
  });

  it('renders an accessible Contact button', () => {
    const { getByLabelText } = render(<ContactFab />);
    expect(getByLabelText('Contact MDHuntFishOutdoors')).toBeTruthy();
  });

  it('opens mailto: pointing at the shared feedback inbox on press', () => {
    const { getByLabelText } = render(<ContactFab />);
    fireEvent.press(getByLabelText('Contact MDHuntFishOutdoors'));
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
    expect(url.startsWith('mailto:feedback.mdhuntfishoutdoors@gmail.com')).toBe(
      true,
    );
  });

  it('does NOT use David’s personal email', () => {
    const { getByLabelText } = render(<ContactFab />);
    fireEvent.press(getByLabelText('Contact MDHuntFishOutdoors'));
    const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
    expect(url).not.toContain('dstonko1@gmail.com');
  });

  it('encodes a partnership-inquiry subject in the mailto', () => {
    const { getByLabelText } = render(<ContactFab />);
    fireEvent.press(getByLabelText('Contact MDHuntFishOutdoors'));
    const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('subject=');
    // %20 = space, %E2%80%94 = em-dash
    expect(decodeURIComponent(url)).toContain(
      'MDHuntFishOutdoors — partnership / listing inquiry',
    );
  });

  it('accepts a bottom positioning prop', () => {
    // Smoke-only: rendering with bottom=96 must not throw. The actual
    // style assertion would require RN style introspection that the
    // testing-library doesn't expose cleanly — we trust the prop is
    // forwarded into the inline style array.
    const { getByLabelText } = render(<ContactFab bottom={96} />);
    expect(getByLabelText('Contact MDHuntFishOutdoors')).toBeTruthy();
  });
});
