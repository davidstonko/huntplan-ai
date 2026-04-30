/**
 * Contract tests for exifStripper.ts.
 *
 * We synthesize minimal JPEG byte streams that match the spec — SOI, an
 * APP1 segment containing the EXIF magic ("Exif\0\0"), a DQT segment, an
 * SOS marker followed by entropy bytes, and EOI — then assert that the
 * stripped output:
 *
 *   - Still parses as a JPEG (starts with FF D8, ends with FF D9)
 *   - No longer contains the EXIF magic anywhere in the byte stream
 *   - Preserves the DQT segment unchanged
 *   - Preserves the SOS + entropy bytes verbatim (this is where pixel data
 *     ultimately lives — corrupting it would visibly damage the photo)
 *   - Returns the input unchanged for non-JPEG buffers
 *
 * These invariants are what the privacy policy depends on — if any
 * fail, photos uploaded from MDHuntFishOutdoors would still leak EXIF.
 */

import {
  isJpeg,
  stripExifMarkers,
  bytesStripped,
} from '../exifStripper';

/** Build a JPEG with a single APP1/EXIF segment + DQT + SOS + EOI. */
function buildExifJpeg(): {
  jpeg: Uint8Array;
  dqtBytes: number[];
  scanBytes: number[];
} {
  // APP1 payload: "Exif\0\0" + 8 bytes of fake TIFF header.
  const exifBody = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x49, 0x49, 0x2a, 0x00, // little-endian TIFF
    0x08, 0x00, 0x00, 0x00, // IFD offset
  ];
  const app1Len = exifBody.length + 2; // length includes its own 2 bytes
  const app1 = [0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff, ...exifBody];

  // DQT segment with 4 bytes of payload — represents pixel-affecting data
  // we MUST preserve.
  const dqtBody = [0xab, 0xcd, 0xef, 0x12];
  const dqtLen = dqtBody.length + 2;
  const dqtBytes = [0xff, 0xdb, (dqtLen >> 8) & 0xff, dqtLen & 0xff, ...dqtBody];

  // SOS marker + 6 bytes of entropy scan data + EOI.
  const sosHeader = [0xff, 0xda, 0x00, 0x02]; // length=2 means no parameters
  const scanBytes = [0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff];
  const eoi = [0xff, 0xd9];

  const jpeg = new Uint8Array([
    0xff, 0xd8, // SOI
    ...app1,
    ...dqtBytes,
    ...sosHeader,
    ...scanBytes,
    ...eoi,
  ]);

  return { jpeg, dqtBytes, scanBytes };
}

/** Find the first occurrence of a byte sequence in a Uint8Array. */
function indexOfSequence(haystack: Uint8Array, needle: number[]): number {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

describe('exifStripper', () => {
  describe('isJpeg', () => {
    it('returns true for FF D8 ... prefix', () => {
      expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    });

    it('returns false for non-JPEG bytes', () => {
      expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false); // PNG
      expect(isJpeg(new Uint8Array([]))).toBe(false);
      expect(isJpeg(new Uint8Array([0xff]))).toBe(false);
    });
  });

  describe('stripExifMarkers', () => {
    it('removes the APP1 EXIF segment', () => {
      const { jpeg } = buildExifJpeg();
      // Sanity: input contains "Exif"
      expect(indexOfSequence(jpeg, [0x45, 0x78, 0x69, 0x66])).toBeGreaterThan(0);

      const stripped = stripExifMarkers(jpeg);

      // EXIF magic must be gone.
      expect(indexOfSequence(stripped, [0x45, 0x78, 0x69, 0x66])).toBe(-1);
    });

    it('preserves SOI, EOI, and overall JPEG structure', () => {
      const { jpeg } = buildExifJpeg();
      const stripped = stripExifMarkers(jpeg);

      // Starts with SOI
      expect(stripped[0]).toBe(0xff);
      expect(stripped[1]).toBe(0xd8);

      // Ends with EOI
      expect(stripped[stripped.length - 2]).toBe(0xff);
      expect(stripped[stripped.length - 1]).toBe(0xd9);
    });

    it('preserves the DQT segment byte-for-byte', () => {
      const { jpeg, dqtBytes } = buildExifJpeg();
      const stripped = stripExifMarkers(jpeg);

      const idx = indexOfSequence(stripped, dqtBytes);
      expect(idx).toBeGreaterThan(-1);
    });

    it('preserves the SOS entropy scan bytes byte-for-byte', () => {
      const { jpeg, scanBytes } = buildExifJpeg();
      const stripped = stripExifMarkers(jpeg);

      const idx = indexOfSequence(stripped, scanBytes);
      expect(idx).toBeGreaterThan(-1);
    });

    it('shrinks the buffer by exactly the APP1 segment size', () => {
      const { jpeg } = buildExifJpeg();
      const stripped = stripExifMarkers(jpeg);

      // APP1 segment in our fixture: 4 header bytes (FF E1 + 2 length) +
      // 14 body bytes = 18 bytes total.
      expect(bytesStripped(jpeg, stripped)).toBe(18);
    });

    it('returns input unchanged for non-JPEG buffers', () => {
      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(stripExifMarkers(png)).toBe(png);
    });

    it('returns input unchanged for empty / too-short buffers', () => {
      const tiny = new Uint8Array([0xff]);
      expect(stripExifMarkers(tiny)).toBe(tiny);
    });

    it('handles JPEGs with no APP segments by returning equivalent bytes', () => {
      // SOI + DQT(4 bytes) + SOS(2-byte length) + 1 entropy byte + EOI
      const noAppJpeg = new Uint8Array([
        0xff, 0xd8,
        0xff, 0xdb, 0x00, 0x06, 0x11, 0x22, 0x33, 0x44,
        0xff, 0xda, 0x00, 0x02,
        0xaa,
        0xff, 0xd9,
      ]);
      const stripped = stripExifMarkers(noAppJpeg);
      expect(stripped.length).toBe(noAppJpeg.length);
      expect(Array.from(stripped)).toEqual(Array.from(noAppJpeg));
    });

    it('strips multiple APP segments (APP0 JFIF + APP1 EXIF)', () => {
      const app0 = [
        0xff, 0xe0, 0x00, 0x10, // APP0 length=16
        0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
        0x01, 0x01, 0x00, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
      ];
      const app1Body = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xde, 0xad];
      const app1 = [
        0xff, 0xe1, 0x00, app1Body.length + 2,
        ...app1Body,
      ];
      const jpeg = new Uint8Array([
        0xff, 0xd8,
        ...app0,
        ...app1,
        0xff, 0xda, 0x00, 0x02,
        0x77,
        0xff, 0xd9,
      ]);
      const stripped = stripExifMarkers(jpeg);

      // Both JFIF and Exif magics must be gone.
      expect(indexOfSequence(stripped, [0x4a, 0x46, 0x49, 0x46])).toBe(-1);
      expect(indexOfSequence(stripped, [0x45, 0x78, 0x69, 0x66])).toBe(-1);

      // Entropy byte still present.
      expect(indexOfSequence(stripped, [0x77])).toBeGreaterThan(-1);
    });
  });
});
