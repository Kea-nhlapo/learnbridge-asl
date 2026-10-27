# SA Educate landing page

**Live site: https://learnbridge-asl.vercel.app** · try a lesson at [/app?screen=upload](https://learnbridge-asl.vercel.app/app?screen=upload) · Nia signing at [/nia-sign](https://learnbridge-asl.vercel.app/nia-sign) · sign to speech at [/sign-introduction](https://learnbridge-asl.vercel.app/sign-introduction)

Deployed on Vercel from `main` (`vercel.json`, `api/router.js`). The AI features need `GEMINI_API_KEY` and `HF_TOKEN` set in the Vercel project's environment variables; locally, put them in `.env.local`.

This React and Vite implementation follows the nine landing-page images in `C:\Screenshots\landing-page-images\sections`. It uses the brighter blue and swapped accessibility layout from the approved design.

Run `npm install`, then `npm run dev` and open `http://127.0.0.1:8765/`. Run `npm run build` and `npm run verify` for the production build. `npm run screenshot` captures desktop and mobile renders into `qa/` when local browser access is available.

The organisations in the carousel are **potential collaborators**, not sponsors or partners. The blue marks in `public/assets/` are concept treatments cropped from the mockup; replace them with approved brand files before public release.

The landing page includes working carousel controls, FAQ panels, language selection, and visual sign-in and contact dialogs. The sign-in form does not connect to an authentication service.
