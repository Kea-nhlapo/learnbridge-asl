// Personal ASL handshape calibration. Only landmark vectors are saved locally.
export const PROFILE_KEY = 'sa-educate-fingerspelling-v1';
export const SAMPLES_PER_LETTER = 5;
const LETTERS = /^[A-IK-Y]+$/; // J and Z need motion, which this classifier cannot read.

export function nameLetters(name) {
  const value = name.trim().toUpperCase().replaceAll(/\s+/g, '');
  return LETTERS.test(value) && value.length <= 30 ? [...new Set(value)] : null;
}

export function handFeatures(hand) {
  const points = hand?.landmarks;
  if (!points || points.length !== 21) return null;
  const wrist = points[0];
  const middle = points[9];
  if (![wrist?.x, wrist?.y, wrist?.z, middle?.x, middle?.y].every(Number.isFinite)) return null;
  const scale = Math.hypot(middle.x - wrist.x, middle.y - wrist.y);
  if (scale < 0.025) return null;
  const output = [];
  for (const point of points) {
    if (![point.x, point.y, point.z].every(Number.isFinite)) return null;
    output.push((point.x - wrist.x) / scale, (point.y - wrist.y) / scale, (point.z - wrist.z) / scale);
  }
  return output;
}

export function multiHandFeatures(hands) {
  const ordered = [...(hands || [])].sort((a, b) => String(a.handedness).localeCompare(String(b.handedness)));
  if (ordered.length < 2) return null;
  const left = handFeatures(ordered[0]);
  const right = handFeatures(ordered[1]);
  return left && right ? [...left, ...right] : null;
}

export function classifyLetter(feature, samples) {
  if (!feature || !samples) return null;
  const byLetter = Object.entries(samples).map(([letter, vectors]) => {
    const distances = vectors.filter(vector => vector.length === feature.length).map(vector => {
      let sum = 0;
      for (let i = 0; i < feature.length; i++) sum += (feature[i] - vector[i]) ** 2;
      return Math.sqrt(sum / feature.length);
    }).sort((a, b) => a - b);
    return { letter, distance: distances[0] ?? Infinity };
  }).sort((a, b) => a.distance - b.distance);
  const [best, next] = byLetter;
  if (!best || !Number.isFinite(best.distance)) return null;
  // Personal calibration varies by camera. Reject shapes far from every sample
  // and ambiguous shapes rather than silently committing a wrong name.
  const confidence = Math.max(0, Math.min(1, 1 - best.distance / 0.42));
  const closePair = next && ((best.letter === 'T' && next.letter === 'S') || (best.letter === 'S' && next.letter === 'T'));
  const separation = closePair ? 1.28 : 1.12;
  if (best.distance > 0.32 || (next && next.distance < best.distance * separation + (closePair ? 0.02 : 0.015))) return null;
  return { letter: best.letter, confidence, distance: best.distance };
}

export function classifyPrototype(feature, samples, threshold = 0.34) {
  if (!feature || !samples) return null;
  const ranked = Object.entries(samples).map(([label, vectors]) => {
    const distances = vectors.map(vector => {
      if (!Array.isArray(vector) || vector.length !== feature.length) return Infinity;
      let sum = 0;
      for (let i = 0; i < feature.length; i++) sum += (feature[i] - vector[i]) ** 2;
      return Math.sqrt(sum / feature.length);
    }).sort((a, b) => a - b);
    return { label, distance: distances[0] ?? Infinity };
  }).sort((a, b) => a.distance - b.distance);
  const best = ranked[0];
  if (!best || !Number.isFinite(best.distance) || best.distance > threshold) return null;
  return { label: best.label, confidence: Math.max(0, Math.min(1, 1 - best.distance / threshold)), distance: best.distance };
}

export function loadProfiles() {
  try {
    const value = JSON.parse(localStorage.getItem(PROFILE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(profile =>
      typeof profile?.id === 'string' && typeof profile?.name === 'string' &&
      nameLetters(profile.name) && profile.samples && typeof profile.samples === 'object') : [];
  } catch { return []; }
}

export function saveProfiles(profiles) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

export function nextExpectedLetter(name, spelled) {
  const target = name.trim().toUpperCase().replaceAll(/\s+/g, '');
  return target.startsWith(spelled) ? target[spelled.length] || null : null;
}

export function readyToSpellName(tokens) {
  const labels = tokens.map(token => token.label.toUpperCase());
  const hello = labels.indexOf('HELLO');
  return hello !== -1 && labels.indexOf('MINEMY', hello + 1) !== -1;
}
