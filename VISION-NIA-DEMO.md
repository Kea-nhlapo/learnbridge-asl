# Question 27 + Nia worktree

Run `npm ci` and `npm run dev`, then open:

- `/vision-demo` — storyboard 27 question, 14 incorrect state, and 15 explanation drawer.
- `/nia-lab` — a Nia/Performs preparation page that plays and records the eight-sign question 27 prototype with English narration.

The question page preloads the clip named in `public/nia/question-27.json` into a Blob URL. An incorrect answer opens the drawer; closing it preserves the selected answer, attempt, and video position, so the learner can retry and reopen help. The committed `nia-question-27-ngt-prototype.webm` contains the Nia animation and narration on one clock.

## Verified

- Pinned Performs source: `upf-gti/performs` commit `dfe48af8bc0213df0dae73929b0d69538e54b785` (MIT `LICENSE` in that checkout; `package.json` says Apache-2.0, so distribution terms need clarification).
- Nia's remote GLB and JSON returned HTTP 200 and CORS headers. The lab uses them at runtime, without vendoring the model.
- The checked-in NGT data contains the eight directly loaded SiGML files, a minimal one-entry lookup retained for the runtime, and the idle animations. The required IPA file is empty because these prototype files carry their own mouth instructions; this is not a general NGT dictionary.
- The browser loaded Nia and played eight upstream NGT glosses: `OOG VORM ANDERS BREKEN VERSCHILLEND PUNT SCHERP SLECHT`.
- The saved 958×583 WebM lasts about 9.6 seconds. Browser decoding confirmed visible video and an audio peak of about 0.084, establishing that narration is embedded.
- Question 27's wrong-answer → drawer → close → retry → correct-answer flow passed in Edge. The drawer decoded the same Nia clip.
- The Vite build and existing lesson-integration tests passed.

## To make this a signed explanation

The current clip is a **complete concept-aligned prototype**, not a validated NGT translation. The drawer labels it accordingly. Do not change `status` to `ready` yet.

1. Have a fluent NGT signer review and correct the gloss order, non-manual features, and whether these signs communicate the intended concept.
2. Re-record the corrected sequence with the existing narration pipeline.
3. Confirm the model and derived-video permissions. Save the finished asset at a versioned URL.
4. Set `public/nia/question-27.json` to `status: "ready"` and `reviewStatus: "reviewed"`. Only then does the button say **Watch signed explanation**.

The finished clip and manifest can later be supplied by the lesson API described in `src/lesson-integration/README.md`; the React page need not know how Nia rendered it.
