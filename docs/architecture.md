# Project structure

`client/` is the Vite application. `client/src/app/` chooses the public URL and owns global styles. Each app-owned feature keeps its UI, data, styles, and tests together under `client/src/features/`. `client/src/shared/` is for code used by more than one feature. `client/src/signchat/` contains adapted upstream browser code; `client/src/vendor/` contains Performs and its license.

`shared/lesson-contract/` contains the lesson validator used by both client and server. It must not import browser or server runtime code. `server/` contains API implementation: `gateway/` adapts the gateway to Vite, `lessons/` prepares lessons, `signing/` handles sign reconstruction and NGT assets, and `ai/` contains the provider-backed language, speech, and video gateway. `api/router.js` is the Vercel function adapter and stays at that path.

`client/public/` contains assets that must keep their exact public URLs, including `/assets/`, `/data/`, `/models/`, `/nia/`, and `/vendor/`. Files in `client/src/` should not import from `server/`. Server code and the Vercel adapter should not import from `client/src/`. Both may import the shared lesson contract.

`scripts/qa/` contains screenshot and preview tools; `scripts/assets/` contains one-off image preparation tools. Run scripts from the repository root unless their usage says otherwise. `dist/` and `qa/` are generated output, and `vercel.json` expects the Vite build in root-level `dist/`.

New code should join its owning feature with its test. Create a shared component only after at least two features use it. Keep route paths, API paths, and public asset URLs stable when moving files. Check lazy routes and CSS import order in a browser after frontend moves.
