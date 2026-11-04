# LearnBridge (SA Educate)

An accessibility prototype for South African classrooms. A teacher turns a PDF, a pasted script or a YouTube video into a short quiz. Learners answer it, get explanations read aloud or translated into isiZulu or Sepedi, and can try two experimental sign-language features.

**Live site: https://learnbridge-asl.vercel.app**

- Make a lesson: [/app?screen=upload](https://learnbridge-asl.vercel.app/app?screen=upload)
- Nia, a signing avatar: [/nia-sign](https://learnbridge-asl.vercel.app/nia-sign)
- Sign to speech: [/sign-introduction](https://learnbridge-asl.vercel.app/sign-introduction)

It's a team project. Tshegofatso Mkhabela built the landing page, the create-lesson page and the first demo question flow with the Nia explanation prototype. I (Kea) built the lesson backend, the translation, voice and transcription routes, Nia signing any text, the lesson library and the Vercel deployment.

## What it does

**Lesson creation.** Gemini reads the source and writes three to five multiple-choice questions. Each question has to quote the sentence it came from, and the server checks that quote against the source text, so a question Gemini made up gets dropped. PDFs are read on the device, in the browser. YouTube videos without captions are transcribed first. The code is in `server/lesson-jobs.mjs`.

**Language and audio.** Text can be translated between English, isiZulu and Sepedi with NLLB-200, with Gemini as the fallback. Text is read aloud with Gemini speech, with OmniVoice as the backup. Speech is transcribed with Whisper, plus a dedicated isiZulu speech model. These all go through `server/learnbridge-gateway.mjs` and call hosted Hugging Face Spaces and the Gemini API.

**Nia signing (experimental).** Nia is a 3D avatar from the open source Performs project. She signs text word by word in Sign Language of the Netherlands (NGT), because that's the sign data the project ships with. It is not South African Sign Language, and no fluent signer has checked it. Generated lessons show a written explanation for now and say that a signed one isn't available yet.

**Sign to speech (experimental).** The camera feed runs through MediaPipe hand, pose and face landmarks and an ASL sign classifier in the browser, using onnxruntime-web. The classifier knows a fixed vocabulary of 250 signs. When the user presses **Finish sentence**, only the recognised sign labels and confidence scores go to Gemini, which rebuilds them into a sentence for the user to check before it's spoken. The video never leaves the browser.

## Stack

React 19 and Vite 7 on the frontend, with Three.js for Nia. The API is Node: in development it runs as Vite middleware, and on Vercel every `/api` path goes through one function (`api/router.js`). AI calls go to the Gemini API and Hugging Face Spaces (NLLB-200, Whisper, OmniVoice).

## Run it locally

You need Node.js.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:8765/. The dev server serves the `/api` routes too.

The AI features need keys in `.env.local`:

- `GEMINI_API_KEY` for lesson creation, sentence rebuilding, speech and fallback translation
- `HF_TOKEN`, a free Hugging Face token, for NLLB translation, OmniVoice and Whisper

The landing page and the demo question flow work without either key.

On Vercel, set the same two variables in the project's environment settings. `main` deploys automatically.

## Tests and build

```bash
node --test
npm run build
npm run verify
```

There are 31 Node tests across 9 files. They cover the lesson preparation backend, the translation and voice gateway, sentence rebuilding, the lesson library, NGT gloss lookup, fingerspelling and the lesson session logic. `npm run test:integration` runs only the lesson session tests. `npm run verify` checks that the production build has its entry point and landing page assets.

## Limits

- **Sign in:** the sign-in and contact dialogs are visual only and don't connect to anything.
- **Organisation logos:** the logos in the carousel are organisations we'd like to work with. None of them is a sponsor or partner.
- **Branding:** the blue marks in `public/assets/` are concept artwork, not approved brand files.
- **Signing:** Nia signs NGT, not SASL, and needs review by a fluent signer before anyone relies on it.
- **Sign to speech:** this is limited to the classifier's 250 ASL signs, and its sentences are AI reconstructions.

## Credits

- **Sign classifier:** the classifier code, ONNX model and label map are adapted from [nlevites/signchat](https://github.com/nlevites/signchat), which is MIT licensed apart from its branding. See [`src/signchat/README.md`](src/signchat/README.md).
- **Nia:** Nia and the signing engine come from [upf-gti/performs](https://github.com/upf-gti/performs). Its LICENSE file says MIT and its `package.json` says Apache-2.0, so check the terms before redistributing. See [`VISION-NIA-DEMO.md`](VISION-NIA-DEMO.md).

More detail:

- [`src/lesson-integration/README.md`](src/lesson-integration/README.md) describes the lesson API contract.
- [`VISION-NIA-DEMO.md`](VISION-NIA-DEMO.md) covers the question 27 Nia prototype and what it would take to make it a real signed explanation.
