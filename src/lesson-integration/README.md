# Lesson integration seam

This folder can be imported by the app frontend when screens 07–15 are built. The current Vite project is a landing page; these modules do not create backend routes or Nia videos.

## Flow

1. The educator calls `uploadPdf(file, metadata)`, `createFromScript(text, metadata)`, or `createFromYoutube(videoId, transcript, metadata)`.
2. The API returns a preparation job. Poll `getJob(job.id)` and display its actual `status`, `preparedCount`, and `totalCount`. The backend sets `ready` only after every help clip has decoded successfully and contains narration.
3. Call `getLesson(job.lessonId)`. Validation rejects lessons with missing questions, mismatched answer IDs, or help clips that are not ready.
4. Create `createLessonSession(lesson)` above the question and help drawer. It begins fetching the current question's saved clip. Subscribe from React using `useSyncExternalStore`.
5. On wrong answer, show feedback and a button that calls `session.openHelp()`. Render a `<video src={state.helpVideoUrl} controls autoPlay>` only when the URL is ready. `session.closeHelp()` hides the drawer without changing the answer. The video element should pause when hidden.
6. Let the learner choose another answer, call `check()`, then call `next()` after a correct answer. Dispose the session when leaving the lesson.

```jsx
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createLessonSession } from './lesson-integration/session.js';

function QuestionScreen({ lesson }) {
  const session = useMemo(() => createLessonSession(lesson), [lesson]);
  useEffect(() => () => session.dispose(), [session]);
  const state = useSyncExternalStore(session.subscribe, session.snapshot);
  // Use state.question, state.selectedOptionId, state.result, state.helpOpen,
  // state.helpVideoUrl, state.helpLoading and state.helpError in the screen.
}
```

## Expected backend routes

| Route | Purpose |
| --- | --- |
| `POST /api/lesson-jobs/pdf` | Multipart `file` and JSON `metadata`. Extract text, reject empty/scanned PDFs, create preparation job. |
| `POST /api/lesson-jobs/script` | JSON `{ text, metadata }`. |
| `POST /api/lesson-jobs/youtube` | JSON `{ videoId, transcript, metadata }`. The frontend supplies an authorized transcript; the backend does not scrape iframe audio. |
| `GET /api/lesson-jobs/:id` | Current job state and honest progress. |
| `GET /api/lessons/:id` | Validated lesson and ready help manifest. |

Minimum ready job:

```json
{ "id": "job-1", "status": "ready", "lessonId": "lesson-1", "preparedCount": 1, "totalCount": 1 }
```

Minimum lesson:

```json
{
  "id": "lesson-1",
  "title": "The Water Cycle",
  "source": { "id": "source-1", "version": "1", "kind": "pdf" },
  "questions": [{
    "id": "q-evaporation",
    "prompt": "Which process turns liquid water into water vapour?",
    "options": [
      { "id": "precipitation", "label": "Precipitation" },
      { "id": "evaporation", "label": "Evaporation" }
    ],
    "correctOptionId": "evaporation",
    "explanation": "Heat causes liquid water to become water vapour.",
    "sourceRefs": [{ "page": 2 }],
    "help": {
      "id": "help-evaporation-v1",
      "version": "1",
      "language": "SASL",
      "status": "ready",
      "videoUrl": "/api/help-assets/help-evaporation-v1.mp4",
      "caption": "Heat causes liquid water to become water vapour."
    }
  }]
}
```

The `videoUrl` must serve a completed, playable clip from the same origin or with appropriate CORS permissions. It should be versioned so an edited explanation cannot use a stale clip. The backend must confirm the signing language and reviewed script; this client does not claim arbitrary sign-language translation. Do not mark a job ready when its clip is only queued or its URL has merely been allocated.

## Implemented locally (server/lesson-jobs.mjs)

The Vite dev/preview server now answers all five routes. Gemini (`GEMINI_API_KEY` in `.env.local`) writes 3–5 questions; each must quote the source sentence it is based on, and questions whose quote is not in the source are dropped. PDFs are read by Gemini (page references included, scanned PDFs work). Jobs and lessons are kept in memory, so they are lost when the server restarts.

Signed explanations cannot be rendered yet, so each question's `help.status` is `text_only`: `validateLesson` accepts it, and `session.openHelp()` opens the drawer without loading a video (`state.helpTextOnly` is `true`). Show the written explanation and "Signed explanation not available yet."

## Work still needed for a real demonstration

Connect a lesson-generation service, PDF extraction, storage, TTS, and a Nia/Performs renderer. First prove that Nia can render and save **one** reviewed explanation with narration. Then return that verified asset from the help endpoint and run the wrong-answer flow end to end. The current landing page has no educator or learner routes yet.
