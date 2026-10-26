# Prototype verification

Verified 2026-10-26 with local Chromium and the same Worker fetch handler used for deployment.

- Imported text, edited the transcript/title, published to the classroom and verified student filtering.
- Verified materials without transcripts cannot be published.
- Saved notes and confirmed they survived reload.
- Searched the library and downloaded a transcript.
- Checked 1440px desktop and 390px mobile layouts; no horizontal mobile overflow.
- Checked reading-size and high-contrast controls.
- Extracted text from an actual generated PDF using PDF.js.
- Extracted text from an actual PNG using Tesseract.js.
- Requested `Hello.` from the live ASL motion service via the Worker gateway. The returned animation duration was 3.52 seconds. Verified playback advanced and paused without page errors.
- Worker tests cover validation, cross-origin request rejection, fixed upstream/language routing, binary response handling and honest upstream error responses.
- Syntax and Worker artifact validation pass.

Limitations: this tests operation, not ASL linguistic accuracy. isiZulu/Sepedi voice quality and browser dictation depend on installed services and were not certified. No real student accounts or automatic recorded-audio transcription are implemented. Private hosted execution may differ from the local environment; the deployment service verifies publication separately.
