import { validateLesson } from './contract.js';
import { createVideoCache } from './video-cache.js';

// Own this session above the question and explanation drawer in the React tree.
export function createLessonSession(lesson, { videoCache = createVideoCache() } = {}) {
  validateLesson(lesson);
  let index = 0;
  let selectedOptionId = null;
  let result = null;
  let attempts = 0;
  let helpOpen = false;
  let helpVideoUrl = null;
  let helpError = null;
  let helpLoading = false;
  let completed = false;
  let generation = 0;
  const listeners = new Set();
  const question = () => lesson.questions[index];
  const makeSnapshot = () => ({ lesson, questionIndex: index, question: completed ? null : question(), selectedOptionId, result, attempts, helpOpen, helpVideoUrl, helpLoading, helpError, completed });
  let snapshot = makeSnapshot();
  const emit = () => { snapshot = makeSnapshot(); listeners.forEach(listener => listener(snapshot)); };
  const warm = () => {
    const current = generation;
    videoCache.preload(question().help).catch(error => {
      if (generation === current) { helpError = error.message; emit(); }
    });
  };

  const session = {
    snapshot() { return snapshot; },
    subscribe(listener) { listeners.add(listener); listener(session.snapshot()); return () => listeners.delete(listener); },
    select(optionId) {
      if (completed || result === 'correct' || !question().options.some(option => option.id === optionId)) return;
      selectedOptionId = optionId;
      result = null;
      emit();
    },
    check() {
      if (completed || !selectedOptionId || result === 'correct') return null;
      if (result === 'incorrect') return result;
      attempts += 1;
      result = selectedOptionId === question().correctOptionId ? 'correct' : 'incorrect';
      emit();
      return result;
    },
    async openHelp() {
      if (completed) return;
      const current = generation;
      helpOpen = true;
      helpLoading = true;
      helpError = null;
      emit();
      try {
        const url = await videoCache.preload(question().help);
        if (generation !== current) return;
        helpVideoUrl = url;
      } catch (error) {
        if (generation !== current) return;
        helpError = error.message;
      } finally {
        if (generation === current) { helpLoading = false; emit(); }
      }
    },
    closeHelp() { helpOpen = false; emit(); },
    next() {
      if (result !== 'correct' || completed) return false;
      generation += 1;
      helpOpen = false;
      helpVideoUrl = null;
      helpError = null;
      helpLoading = false;
      selectedOptionId = null;
      result = null;
      attempts = 0;
      if (index === lesson.questions.length - 1) completed = true;
      else { index += 1; warm(); }
      emit();
      return true;
    },
    dispose() { generation += 1; listeners.clear(); videoCache.dispose(); },
  };
  warm();
  return session;
}
