/**
 * Routing-precision guard for the offline Hunt knowledge base.
 *
 * With the backend unreachable (which is what an App Store reviewer sees
 * when the API is cold or down) every chat answer comes from
 * getSmartResponse, so a mis-routed intent is the whole answer, not a
 * degraded one.
 *
 * 2026-09-20: "Can I hunt deer with a bow today?" — the most natural way
 * a hunter asks a season question — contains none of the season keywords
 * and was being grabbed by the weapon glossary on the word "bow",
 * answering with a description of archery equipment. isCanIHuntQuery now
 * runs ahead of the weapon intent. These cases lock both directions: the
 * permission phrasings route to seasons, and the handlers that own
 * overlapping words keep their queries.
 */
import { getSmartResponse } from '../chatKnowledge';

const firstLine = (q: string): string => {
  const r = getSmartResponse(q) as unknown as Record<string, string>;
  const text = typeof r === 'string' ? r : (r.message ?? r.answer ?? r.text ?? '');
  return String(text).split('\n')[0];
};

describe('offline hunt chat routes permission phrasings to seasons', () => {
  it.each([
    'Can I hunt deer with a bow in Frederick County today?',
    'Is deer archery open right now?',
    'Could I shoot a turkey today?',
  ])('%s', (q) => {
    expect(firstLine(q)).toMatch(/Seasons/i);
  });
});

describe('neighbouring intents keep their own queries', () => {
  it.each([
    ['How many deer can I take?', /Bag Limits/i],
    ['What is the bag limit for deer?', /Bag Limits/i],
    ['Do I need blaze orange?', /Orange/i],
    ['What are legal shooting hours today?', /Hours/i],
    ['What is the difference between a crossbow and a compound bow?', /BOW/],
  ])('%s', (q, expected) => {
    expect(firstLine(q)).toMatch(expected as RegExp);
  });
});
