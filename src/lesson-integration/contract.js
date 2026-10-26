// Shared shape expected from the lesson API. Keep IDs stable when options are reordered.
export function validateLesson(lesson) {
  if (!lesson || typeof lesson !== 'object' || !nonEmpty(lesson.id)) throw new Error('Lesson ID is missing');
  if (!Array.isArray(lesson.questions) || lesson.questions.length === 0) throw new Error('Lesson has no questions');
  const questionIds = new Set();
  for (const question of lesson.questions) {
    if (!nonEmpty(question.id) || questionIds.has(question.id)) throw new Error('Question IDs must be unique');
    questionIds.add(question.id);
    if (!nonEmpty(question.prompt)) throw new Error(`Question ${question.id} has no prompt`);
    if (!Array.isArray(question.options) || question.options.length < 2) throw new Error(`Question ${question.id} needs options`);
    const optionIds = question.options.map(option => option.id);
    if (optionIds.some(id => !nonEmpty(id)) || new Set(optionIds).size !== optionIds.length) throw new Error(`Question ${question.id} has invalid option IDs`);
    if (question.options.some(option => !nonEmpty(option.label))) throw new Error(`Question ${question.id} has an empty option`);
    if (!optionIds.includes(question.correctOptionId)) throw new Error(`Question ${question.id} has no matching correct option`);
    if (!nonEmpty(question.explanation)) throw new Error(`Question ${question.id} has no explanation`);
    if (!question.help || !nonEmpty(question.help.id) || !nonEmpty(question.help.language)) throw new Error(`Question ${question.id} has no signed-help reference`);
    if (question.help.status !== 'ready' || !nonEmpty(question.help.videoUrl)) throw new Error(`Question ${question.id} signed help is not ready`);
  }
  return lesson;
}

export function validateJob(job) {
  const states = ['extracting', 'generating_questions', 'preparing_explanations', 'translating_signing', 'generating_narration', 'rendering_videos', 'validating_assets', 'ready', 'failed'];
  if (!job || !nonEmpty(job.id) || !states.includes(job.status)) throw new Error('Invalid preparation job');
  if (job.status === 'ready' && !nonEmpty(job.lessonId)) throw new Error('Ready job has no lesson ID');
  return job;
}

function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }
