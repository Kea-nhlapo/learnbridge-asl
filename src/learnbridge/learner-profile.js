// Applies the signed-in learner's accessibility profile: larger text and stronger contrast on the page, and
// read by the quiz (voice answers, reading questions aloud, signed help opening by itself).
import { currentAccount, getProfile } from './accounts.js';
import './learner-profile.css';

export function activeProfile() {
  const account = currentAccount();
  return account?.role === 'learner' ? getProfile(account.email) : null;
}

export function applyProfile(profile = activeProfile()) {
  const root = document.documentElement;
  root.classList.toggle('lb-large-text', !!profile?.largeText);
  root.classList.toggle('lb-high-contrast', !!profile?.highContrast);
}

// A learner's own choices made on the quiz screen are cleared when they sign in or save their profile,
// so the profile decides again.
export function resetQuizChoices() {
  try { localStorage.removeItem('sae-voice-answers'); } catch {}
}
