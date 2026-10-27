# Signchat integration

The classifier, landmark assembly, label loader, model cache, and mode controller
in this folder are adapted from
[nlevites/signchat](https://github.com/nlevites/signchat) at commit
`00d3c5e21d379901b39abf2f734ae5e66db0e025`. The ASL ONNX model and
class map in `public/models/asl-signs` came from the same commit. Signchat's
README states its code is MIT licensed, excluding its branding.

SA Educate uses manual turn boundaries and browser speech synthesis. The
server endpoint in `server/sign-reconstruct.mjs` follows Signchat's
lean-options sentence prompt and response schema. It sends admitted sign
labels and confidence scores to Google Gemini only after the user presses
**Finish sentence**. The camera stream and landmarks remain in the browser.

The model classifies signs from a fixed 250-sign vocabulary. Sentence output
is an AI reconstruction from those labels, so the user must review it before
speaking. A configured `GEMINI_API_KEY` is required for that step.
