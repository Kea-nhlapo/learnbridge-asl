# Question 27 + Nia worktree

Run `npm ci` and `npm run dev`, then open:

- `/vision-demo` — storyboard 27 question, 14 incorrect state, and 15 explanation drawer.
- `/nia-lab` — a technical Nia/Performs test that loads the upstream NGT sign `OOG` (“eye”) and can record a WebM sample.

The question page preloads the clip named in `public/nia/question-27.json` into a Blob URL. An incorrect answer opens the drawer; closing it preserves the selected answer and attempt, so the learner can retry. The saved test clip is currently local at `public/nia/nia-ngt-oog-motion-test.webm` and is Git-ignored pending confirmation of Nia avatar recording rights.

## Verified

- Pinned Performs source: `upf-gti/performs` commit `dfe48af8bc0213df0dae73929b0d69538e54b785` (MIT `LICENSE` in that checkout; `package.json` says Apache-2.0, so distribution terms need clarification).
- Nia's remote GLB and JSON returned HTTP 200 and CORS headers. The lab uses them at runtime, without vendoring the model.
- The checked-in NGT data includes only `OOG.sigml`, its one-entry lookup, and the idle animations. The required IPA file is empty because this sign uses an explicit mouth picture; it is not a general NGT dictionary.
- The browser loaded Nia, played the upstream `OOG.sigml` instruction, and saved a 958×583 WebM. Two decoded frames show different hand positions. The clip lasts about 5.4 seconds.
- Question 27's wrong-answer → drawer → close → retry → correct-answer flow passed in Edge. The drawer decoded the same Nia clip.
- The Vite build and existing lesson-integration tests passed.

## To make this a signed explanation

The current clip signs only `OOG`. It is a **technical motion test**, not a translation of the astigmatism explanation, and the drawer labels it that way. Do not change `status` to `ready` yet.

1. Write a question-specific signing script in the chosen sign language and have a fluent signer review it. The NGT dictionary does not by itself supply an accurate explanation of uneven refraction.
2. Render the complete script with Nia. Generate narration from the same explanation, align it, and produce one playable video with audio and captions.
3. Confirm the model and derived-video permissions. Save the finished asset at a versioned URL.
4. Set `public/nia/question-27.json` to `status: "ready"`, `reviewStatus: "reviewed"`, and its `videoUrl` to the finished asset. Only then does the incorrect-feedback button say **Watch signed explanation**.

The finished clip and manifest can later be supplied by the lesson API described in `src/lesson-integration/README.md`; the React page need not know how Nia rendered it.
