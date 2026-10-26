# LearnBridge ASL prototype

The user approved building the accessible-learning concept with ASL replacing SASL for this prototype.

A self-contained browser prototype is the fastest reviewable first version. Alternatives are a full Moodle integration (appropriate later for real classrooms) or deploying the research signing/transcription models (requires model hosting and evaluation). This prototype demonstrates the end-to-end material workflow while marking unconnected processing honestly.

## Experience
A warm, minimal education workspace with forest-green accents, cream surfaces, readable typography, responsive navigation and visible keyboard focus. Material library -> import -> extraction / editable transcript -> read, listen, ASL -> publish to local student view. Local IndexedDB retains imported files; localStorage retains metadata and notes. The role switch is a demonstration, not authentication or server authorization.

## Functional scope
PDF text extraction with PDF.js, image OCR with Tesseract.js, plain text imports, URLs with user-provided transcripts, local audio/video playback and manual transcripts, browser-supported microphone recognition, editable lesson text, notes, downloaded transcripts, publication to student view, source filtering and searching. Speech synthesis only uses installed voices matching the selected language; no false Zulu/Sepedi fallback. ASL uses an explicitly external research translation handoff plus locally attached interpreter videos. ASL is distinct from SASL. No fabricated automatic signing video or generated translation is shown.

## Boundaries
Transcription (English, isiZulu), translation (English/isiZulu/Sepedi) and voices are wired to free hosted open-source model demos through the same-origin gateway; Sepedi transcription is not available from any free hosted model yet. YouTube captions cannot be fetched reliably from a static browser due to cross-origin restrictions. Missing transcripts stay marked as needing a transcript. External ASL tool availability is not guaranteed. OCR needs a first-run network download; scanned PDFs prompt image upload/manual transcript if no embedded text is present. The prototype is owner-private on Sites; student view is not an invitation to real students.

## Validation
Check text import, malformed URL rejection, source filtering, teacher publishing/student visibility, transcript edits, notes persistence, export, unavailable speech voice feedback, reload persistence, responsive layout, keyboard dialog navigation, and the ASL handoff. Check source syntax and browser console. No claims of linguistic accuracy without native-speaker review.

## Verified integration update
The public Sign Translate pose endpoint returned a real binary pose for an English test phrase. The implementation therefore adds a direct in-platform pose-viewer player with play/pause/speed controls instead of relying solely on the website handoff. The website's latest human signing models are explicitly not public. The app labels the returned output as an experimental skeleton motion model and retains interpreter-video attachment for human footage. Signing previews transmit a maximum of 300 characters only after the user invokes the feature; no automatic upload of lesson text on page load.
