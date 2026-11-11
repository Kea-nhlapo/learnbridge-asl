import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const { SEED_ACCOUNTS, signIn, createAccount, currentAccount, signOut, homeFor } = await import('./accounts.js');

test('seed accounts sign in; learners land on sign-to-speech, teachers on the dashboard', async () => {
  const learner = await signIn('Learner1@SAEducate.test ', 'Learn2026!');
  assert.deepEqual(learner, { email: 'learner1@saeducate.test', name: 'Thabo', role: 'learner' });
  assert.equal(homeFor(learner), '/sign-introduction');
  assert.equal(currentAccount().name, 'Thabo');
  const teacher = await signIn('teacher@saeducate.test', 'Teach2026!');
  assert.equal(homeFor(teacher), '/app?screen=dashboard-loading');
  await assert.rejects(signIn('learner1@saeducate.test', 'wrong'), /do not match/);
  signOut();
  assert.equal(currentAccount(), null);
  assert.equal(new Set(SEED_ACCOUNTS.map(a => a.email)).size, SEED_ACCOUNTS.length);
});

test('created accounts are signed in at once, stored without the plain password, and can sign in again', async () => {
  const account = await createAccount({ name: ' Zanele ', email: 'zanele@example.org', password: 'secret1', role: 'learner' });
  assert.deepEqual(account, { email: 'zanele@example.org', name: 'Zanele', role: 'learner' });
  assert.equal(currentAccount().email, 'zanele@example.org');
  assert.doesNotMatch(store.get('sae-accounts'), /secret1/);
  signOut();
  assert.equal((await signIn('zanele@example.org', 'secret1')).name, 'Zanele');
  await assert.rejects(createAccount({ name: 'Again', email: 'zanele@example.org', password: 'secret1', role: 'learner' }), /already exists/);
  await assert.rejects(createAccount({ name: 'X', email: 'learner2@saeducate.test', password: 'secret1', role: 'learner' }), /already exists/);
  await assert.rejects(createAccount({ name: 'X', email: 'bad', password: 'secret1', role: 'learner' }), /valid email/);
  await assert.rejects(createAccount({ name: 'X', email: 'x@y.org', password: '123', role: 'learner' }), /6 characters/);
});

test('accessibility profiles follow from needs and can be changed', async () => {
  const { getProfile, saveProfile, profileFromNeeds, allLearners } = await import('./accounts.js');
  assert.deepEqual(getProfile('learner1@saeducate.test'), { needs: ['blind'], language: 'en', voiceAnswers: true, readAloud: true, largeText: false, highContrast: false, signedHelp: false });
  assert.equal(getProfile('learner2@saeducate.test').signedHelp, true);
  assert.equal(getProfile('learner4@saeducate.test').language, 'zu');
  saveProfile('LEARNER1@saeducate.test', { ...profileFromNeeds(['blind']), largeText: true });
  assert.equal(getProfile('learner1@saeducate.test').largeText, true);
  await createAccount({ name: 'Mpho', email: 'mpho@example.org', password: 'secret1', role: 'learner', needs: ['low-vision', 'unknown'], language: 'xx' });
  assert.deepEqual(getProfile('mpho@example.org').needs, ['low-vision']);
  assert.equal(getProfile('mpho@example.org').language, 'en');
  assert.ok(allLearners().some(l => l.name === 'Mpho' && l.profile.largeText));
  assert.ok(allLearners().every(l => l.role === 'learner'));
});
