// Test accounts for SA Educate. There is no account server yet: the seed accounts below are built in, and
// accounts made with "Create an account" are kept in this browser only. Not real security, just enough to
// tell learners and teachers apart during testing.

export const SEED_ACCOUNTS = [
  { email: 'teacher@saeducate.test', password: 'Teach2026!', name: 'Demo Teacher', role: 'teacher' },
  { email: 'learner1@saeducate.test', password: 'Learn2026!', name: 'Thabo', role: 'learner', needs: ['blind'] },
  { email: 'learner2@saeducate.test', password: 'Learn2026!', name: 'Lerato', role: 'learner', needs: ['deaf'] },
  { email: 'learner3@saeducate.test', password: 'Learn2026!', name: 'Sipho', role: 'learner', needs: ['low-vision'] },
  { email: 'learner4@saeducate.test', password: 'Learn2026!', name: 'Naledi', role: 'learner', needs: ['hard-of-hearing'], language: 'zu' },
  { email: 'learner5@saeducate.test', password: 'Learn2026!', name: 'Ayanda', role: 'learner', needs: [], language: 'nso' },
];

const ACCOUNTS_KEY = 'sae-accounts';
const SESSION_KEY = 'sae-session';
const PROFILES_KEY = 'sae-profiles';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const clean = email => String(email || '').trim().toLowerCase();
const publicPart = ({ email, name, role }) => ({ email, name, role });

// Passwords for accounts made here are stored hashed, in case a tester reuses a real password.
async function hash(password) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`sae:${password}`));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function findAccount(email) {
  const key = clean(email);
  return SEED_ACCOUNTS.find(a => a.email === key) || read(ACCOUNTS_KEY, []).find(a => a.email === key) || null;
}

export async function signIn(email, password) {
  const account = findAccount(email);
  const ok = account && (account.passwordHash ? account.passwordHash === await hash(password) : account.password === password);
  if (!ok) throw Error('That email and password do not match an account.');
  write(SESSION_KEY, clean(email));
  return publicPart(account);
}

export async function createAccount({ name, email, password, role, needs = [], language = 'en' }) {
  const key = clean(email);
  if (!String(name || '').trim()) throw Error('Enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) throw Error('Enter a valid email address.');
  if (String(password || '').length < 6) throw Error('Use a password of at least 6 characters.');
  if (!['learner', 'teacher'].includes(role)) throw Error('Choose learner or teacher.');
  if (findAccount(key)) throw Error('An account with that email already exists. Sign in instead.');
  const account = { email: key, name: name.trim(), role, passwordHash: await hash(password) };
  write(ACCOUNTS_KEY, [...read(ACCOUNTS_KEY, []), account]);
  write(SESSION_KEY, key);
  if (role === 'learner') saveProfile(key, profileFromNeeds(needs, language));
  return publicPart(account);
}

// Accessibility profile: what a learner needs, and the settings that follow from it.
export const NEEDS = [
  ['blind', 'I am blind'], ['low-vision', 'I have low vision'], ['deaf', 'I am Deaf'], ['hard-of-hearing', 'I am hard of hearing'],
];
export function profileFromNeeds(needs = [], language = 'en') {
  const has = need => needs.includes(need);
  return {
    needs: NEEDS.map(([id]) => id).filter(has), language: ['en', 'zu', 'nso'].includes(language) ? language : 'en',
    voiceAnswers: has('blind'), readAloud: has('blind') || has('low-vision'),
    largeText: has('low-vision'), highContrast: has('low-vision'),
    signedHelp: has('deaf') || has('hard-of-hearing'),
  };
}
export function getProfile(email) {
  const key = clean(email);
  const saved = read(PROFILES_KEY, {})[key];
  if (saved) return saved;
  const seed = SEED_ACCOUNTS.find(a => a.email === key);
  return profileFromNeeds(seed?.needs, seed?.language);
}
export function saveProfile(email, profile) {
  write(PROFILES_KEY, { ...read(PROFILES_KEY, {}), [clean(email)]: profile });
}
export function allLearners() {
  const learners = [...SEED_ACCOUNTS, ...read(ACCOUNTS_KEY, []).filter(a => !SEED_ACCOUNTS.some(s => s.email === a.email))].filter(a => a.role === 'learner');
  return learners.map(a => ({ ...publicPart(a), profile: getProfile(a.email) }));
}

export function currentAccount() {
  const account = findAccount(read(SESSION_KEY, ''));
  return account ? publicPart(account) : null;
}

export function signOut() { try { localStorage.removeItem(SESSION_KEY); } catch {} }

// Where each kind of account lands after signing in: learners start with sign-to-speech.
export const homeFor = account => account?.role === 'learner' ? '/sign-introduction' : '/app?screen=dashboard-loading';
