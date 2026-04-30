/**
 * exifStripper.ts — Pure-JS JPEG EXIF/XMP/IPTC marker stripper.
 *
 * Why this exists
 * ---------------
 * Our privacy policy promises that photos uploaded to the backend have EXIF
 * metadata removed — including GPS coordinates, camera serial numbers, and
 * timestamps. `react-native-image-picker` re-encodes large images on iOS
 * (which incidentally drops EXIF), but it does NOT guarantee EXIF removal
 * for small images, library picks, or future Android support. Rather than
 * trust that side-effect, we explicitly strip the metadata segments before
 * upload.
 *
 * What gets stripped
 * ------------------
 * JPEG files are a sequence of "marker segments" each beginning with `0xFF`.
 * EXIF, XMP, ICC-profile, IPTC, and similar metadata live in APP-marker
 * segments (`0xFFE0` through `0xFFEF`). We drop every APP segment and
 * preserve everything else (SOI, DQT, DHT, SOFn, SOS + entropy data, EOI).
 *
 * What this does NOT do
 * ---------------------
 *   - Re-encode pixel data — the image bits are byte-identical, just minus
 *     the metadata. Quality is preserved exactly.
 *   - Strip non-JPEG metadata — PNG/HEIC/etc. are passed through untouched.
 *     Our image picker is configured to return JPEG (mediaType: 'photo' on
 *     iOS yields JPEG), so this covers the actual upload path.
 *   - Validate the image — malformed JPEGs are returned unchanged so the
 *     caller can decide whether to upload, reject, or fall back.
 *
 * Test pattern: we synthesize a minimal JPEG with a known APP1/EXIF segment
 * and assert the output (a) parses, (b) no longer contains the EXIF magic,
 * and (c) preserves the SOS/entropy bytes byte-for-byte.
 */

const SOI = 0xd8; // Start Of Image
const EOI = 0xd9; // End Of Image
const SOS = 0xda; // Start Of Scan — after this, compressed entropy data
const APP_MIN = 0xe0; // APP0 (JFIF)
const APP_MAX = 0xef; // APP15
const COM = 0xfe; // Comment segment — also strip, often holds metadata

/**
 * Returns true iff the buffer starts with the JPEG SOI marker (`FF D8`).
 * We use this as a cheap "is this actually a JPEG?" check before doing
 * any segment walking — non-JPEG inputs are returned unchanged by
 * `stripExifMarkers`.
 */
export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === SOI;
}

/**
 * Strip every APP-marker segment (and JPEG comment segments) from a JPEG
 * byte stream. Pixel data is preserved byte-for-byte — only metadata
 * segments are dropped.
 *
 * Returns the input unchanged if:
 *   - The buffer is not a JPEG (no SOI)
 *   - The segment walker hits an inconsistent length and bails out (we'd
 *     rather upload a slightly-larger original than corrupt the photo)
 */
export function stripExifMarkers(bytes: Uint8Array): Uint8Array {
  if (!isJpeg(bytes)) return bytes;

  // Output buffer: at most the same size as input. We'll slice at the end.
  const out = new Uint8Array(bytes.length);
  let outIdx = 0;

  // Copy SOI verbatim.
  out[outIdx++] = bytes[0];
  out[outIdx++] = bytes[1];

  let i = 2;
  while (i < bytes.length) {
    // Every segment marker is `FF <code>`. Padding bytes (0xFF FF ... <code>)
    // are legal — skip the FFs and re-read the code.
    if (bytes[i] !== 0xff) {
      // Out of sync — bail and return original to avoid corruption.
      return bytes;
    }
    let markerCodeIdx = i + 1;
    while (markerCodeIdx < bytes.length && bytes[markerCodeIdx] === 0xff) {
      markerCodeIdx++;
    }
    if (markerCodeIdx >= bytes.length) return bytes;

    const code = bytes[markerCodeIdx];

    // SOS marker: copy this segment header and everything after it (the
    // entropy-coded scan data + EOI) verbatim. JPEG never has parseable
    // markers inside the entropy stream that we should strip — and even
    // if RST markers appear, copying them through is correct.
    if (code === SOS) {
      const rest = bytes.length - i;
      out.set(bytes.subarray(i, bytes.length), outIdx);
      outIdx += rest;
      break;
    }

    // EOI without preceding SOS — end the file here.
    if (code === EOI) {
      out[outIdx++] = 0xff;
      out[outIdx++] = EOI;
      break;
    }

    // RST0..RST7 (D0..D7) and TEM (01) are zero-length — copy the marker.
    const isStandalone =
      (code >= 0xd0 && code <= 0xd7) || code === 0x01;
    if (isStandalone) {
      out[outIdx++] = 0xff;
      out[outIdx++] = code;
      i = markerCodeIdx + 1;
      continue;
    }

    // All other markers carry a 2-byte length immediately after the code.
    // Length is big-endian and INCLUDES the two length bytes themselves.
    if (markerCodeIdx + 2 >= bytes.length) return bytes;
    const len = (bytes[markerCodeIdx + 1] << 8) | bytes[markerCodeIdx + 2];
    if (len < 2) return bytes; // malformed
    const segmentEnd = markerCodeIdx + 1 + len; // exclusive
    if (segmentEnd > bytes.length) return bytes;

    const isAppMarker = code >= APP_MIN && code <= APP_MAX;
    const isCommentMarker = code === COM;

    if (isAppMarker || isCommentMarker) {
      // Drop the entire segment — including the marker bytes.
      i = segmentEnd;
    } else {
      // Preserve the segment intact.
      const segLen = segmentEnd - i;
      out.set(bytes.subarray(i, segmentEnd), outIdx);
      outIdx += segLen;
      i = segmentEnd;
    }
  }

  return out.slice(0, outIdx);
}

/**
 * Convenience: report how many bytes were removed by a strip pass. Used in
 * dev logging and could be surfaced in an analytics event ("avg X bytes of
 * metadata stripped per upload"). Pure derivation — no side effects.
 */
export function bytesStripped(input: Uint8Array, output: Uint8Array): number {
  return Math.max(0, input.length - output.length);
}
