# LearnBridge — ASL learning prototype

A responsive accessible-learning workspace with browser storage and a small same-origin gateway for signing, transcription, translation and voices. Run `npm run dev` and open http://127.0.0.1:4173. For the demo, optionally run `HF_TOKEN=hf_... npm run dev` with a free Hugging Face access token: the free speech, translation and voice services share Hugging Face's free GPU allowance, and an account token gives a larger one than anonymous use. No npm installation is needed. The dev command builds and serves the same single-file Worker used by Sites. Node 22+ is recommended.

## Implemented

- Material library with search, filters and illustrated sample lessons.
- PDF text extraction (PDF.js), image OCR (Tesseract.js, English/isiZulu), text imports, saved URLs and audio/video uploads.
- Editable transcripts and language labels (English, isiZulu, Sepedi), reading-size and contrast preferences.
- **Automatic transcription** of audio and video in English (Whisper large-v3) and isiZulu (W2V-BERT 2.0 isiZulu), on import or with *Transcribe recording* in Edit material. The browser decodes the file's audio and sends it in 25-second WAV sections. Sepedi transcription is not connected yet (no free hosted Sepedi speech model); the app says so and keeps the file for a typed transcript.
- **Translation** of transcripts between English, isiZulu and Sepedi (NLLB-200) by choosing a different *Reading language*. Translations are machine output, labelled as such, cached per lesson and redone when the transcript changes.
- **Read aloud** in the chosen language: an installed device voice when there is one (usually English), otherwise OmniVoice for isiZulu, Sepedi and English, read in short pieces with the next piece prepared while one plays.
- Browser speech-recognition dictation where supported. Browser recognition services may process audio remotely.
- Local notes, transcript downloads, teacher publishing and student-view filtering.
- Real experimental ASL motion requests to Sign Translate's public endpoint, rendered in-platform with MIT-licensed `pose-viewer`. Each sentence is first rewritten into ASL word order by `web/asl-gloss.js` (time first; no articles, "is/are" or auxiliary "do"; PAST marker; NOT; WH-word last), and the section shows that gloss above the English. After *Play signing* the sections play one after another, with the next section fetched in advance. isiZulu and Sepedi lessons are machine-translated into English first. User-triggered requests send up to 300 characters through the same-origin Worker to the public signing service; the gateway does not persist them. Play/pause and speed controls. This is a skeleton motion model, **not** a photorealistic human signer or a validated interpreter. No claim of linguistic accuracy.
- Attach and play an ASL interpreter video that the user has permission to use.
- IndexedDB stores uploaded files; localStorage stores lesson text and metadata. Data survives reloads in the same browser/origin.

## Prototype boundaries

The role switch is a UI demonstration, not authentication. There is no cross-device classroom sharing. Sites hosting is owner-private. Sample users are fictional. Sample lessons are authored fixtures, not extracted from real media. YouTube/web sources require a pasted or dictated transcript; web extraction is not connected. Sepedi recordings need a typed transcript. Transcription, translation and voices use free public Hugging Face demo Spaces: they need internet, can be slow to start, and stop working for a while when the free GPU allowance is used up (the app reports this). NLLB and OmniVoice weights are licensed for non-commercial use only. The ASL word-order rules do not produce fluent ASL: no classifiers, signing space or facial grammar. Scanned PDFs without embedded text require image OCR or a manual transcript. Sepedi OCR is not configured and asks for a reviewed transcript. Uploads are limited to 25 MB; PDFs to 100 pages.

ASL is not SASL. The external signing service is a research/demo dependency without an availability guarantee. Rylo's newest human signing models are not public; the prototype uses available motion output and permits human interpreter video attachment. Short snippets need fluent-signer review before educational use. A failed request is displayed as failed, without fabricated signing.

## Dependencies and attribution

The app UI source is in `web/`, the signing gateway in `worker/index.js`, and the deterministic build in `scripts/build.mjs`. Libraries are loaded on demand from versioned jsDelivr URLs. PDF.js 4.10.38 (Apache-2.0), Tesseract.js 5.1.1 (Apache-2.0), pose-viewer 1.2.0 (MIT). Their transitive runtime assets and model data retain their upstream licenses. Google Fonts supplies DM Sans / Manrope; system sans-serif fallbacks are present. See THIRD_PARTY.md.

## Next implementation phase

Add a backend for authenticated classroom memberships, shared object storage, yt-dlp ingestion, and Omnilingual ASR jobs. Store language-specific reviewed translations separately. Replace the research signing endpoint with a hosted, evaluated model and preserve this signing-provider boundary for later SASL support. Keep teacher review before publication. This prototype does not bundle Moodle or the ASR model.
