/**
 * @file tabA11y.ts
 * @description Screen-reader label for a tab. Because every mode shares
 * the same five tab names, the mode is prepended so VoiceOver announces
 * "Hunt Map tab" rather than an ambiguous "Map tab".
 *
 *   MapTab  (hunt) → 'Hunt Map tab'
 *   AITab   (fish) → 'Fish AI tab'
 *   MoreTab (camp) → 'Camp More tab'
 */

import type { ActivityMode } from './routes';

const MODE_LABEL: Record<ActivityMode, string> = {
  hunt: 'Hunt',
  fish: 'Fish',
  camp: 'Camp',
  hike: 'Hike',
};

export function deriveTabAccessibilityLabel(routeName: string, mode?: ActivityMode): string {
  const base = routeName.replace(/Tab$/, '');
  const words = base === 'AI' ? 'AI' : base.replace(/([A-Z])/g, ' $1').trim();
  return mode ? `${MODE_LABEL[mode]} ${words} tab` : `${words} tab`;
}
