// Audio lessons: a lesson's spoken parts joined into one MP3 for offline listening. MP3 encoding uses
// lamejs (@breezystack/lamejs, LGPL-3.0), loaded only when someone downloads.

export const AUDIO_RATE = 24000;
const GAP_SECONDS = 0.6;

// Joins mono sample arrays with a short silence between parts.
export function joinParts(parts, sampleRate = AUDIO_RATE, gapSeconds = GAP_SECONDS) {
  const gap = Math.round(sampleRate * gapSeconds);
  const total = parts.reduce((sum, part) => sum + part.length, 0) + gap * Math.max(0, parts.length - 1);
  const out = new Float32Array(total);
  let at = 0;
  parts.forEach((part, i) => { out.set(part, at); at += part.length + (i < parts.length - 1 ? gap : 0); });
  return out;
}

// Float samples (-1..1) -> MP3 bytes, mono, 48 kbps (clear speech, about 360 KB a minute).
export async function encodeMp3(samples, sampleRate = AUDIO_RATE, kbps = 48) {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7fff;
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152 * 20) { const chunk = encoder.encodeBuffer(pcm.subarray(i, i + 1152 * 20)); if (chunk.length) chunks.push(new Uint8Array(chunk)); }
  const end = encoder.flush(); if (end.length) chunks.push(new Uint8Array(end));
  return chunks;
}

export const audioFileName = title => `${String(title).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'lesson'}.mp3`;
