import { validateJob, validateLesson } from './contract.js';

// All URLs are relative to the app's API origin. The frontend never renders Nia itself.
export function createLessonApi({ baseUrl = '/api', fetchImpl = fetch } = {}) {
  const root = baseUrl.replace(/\/$/, '');
  async function request(path, options) {
    const response = await fetchImpl(`${root}${path}`, options);
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json()).message || ''; } catch { /* Non-JSON error. */ }
      throw new Error(detail || `Lesson API failed (${response.status})`);
    }
    return response.json();
  }
  const json = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return {
    uploadPdf(file, metadata = {}) {
      if (!file) throw new Error('Choose a PDF');
      const form = new FormData();
      form.append('file', file);
      form.append('metadata', JSON.stringify(metadata));
      return request('/lesson-jobs/pdf', { method: 'POST', body: form }).then(validateJob);
    },
    createFromScript(text, metadata = {}) {
      if (!text?.trim()) throw new Error('Enter a script');
      return request('/lesson-jobs/script', json({ text, metadata })).then(validateJob);
    },
    createFromYoutube(videoId, transcript, metadata = {}) {
      if (!videoId?.trim() || !transcript?.trim()) throw new Error('A video ID and transcript are required');
      return request('/lesson-jobs/youtube', json({ videoId, transcript, metadata })).then(validateJob);
    },
    getJob(jobId) { return request(`/lesson-jobs/${encodeURIComponent(jobId)}`).then(validateJob); },
    getLesson(lessonId) { return request(`/lessons/${encodeURIComponent(lessonId)}`).then(validateLesson); },
  };
}
