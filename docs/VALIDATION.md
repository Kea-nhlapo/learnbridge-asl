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

## Update: ASL word order, transcription, translation and voices

- `npm test`: ASL gloss rules (14 example sentences), audio sectioning/WAV encoding, and gateway routing/validation for transcription, translation and voice with mocked upstreams.
- Live through the local gateway: English transcription (Whisper) returned the exact sample sentence; translation English→isiZulu, English→Sepedi and isiZulu→English returned correct sentences; an ASL request with gloss text returned a pose file; Sepedi transcription returned the honest "not connected" message.
- isiZulu transcription and OmniVoice were verified directly against their Spaces, then hit the anonymous free GPU allowance during testing; the gateway returned the "busy / allowance used up" message as designed.
- Not verified in a browser in this update: audio decoding of uploaded files, playback of OmniVoice audio, and continuous ASL playback.
