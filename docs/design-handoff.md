# Mobile interface handoff

Branch: `feat/mobile-concierge`

This branch preserves the mobile concierge design and the supporting API code. It does not merge into `develop`.

## Try it

```sh
git fetch origin
git switch --track origin/feat/mobile-concierge
npm ci
npm start
```

Open http://localhost:4173. The interface can be explored without credentials. Chat, search and voice require an OpenAI key under **You → Connection**, or a local `.env` based on `.env.example`. Keys must not be committed. Phone calling additionally requires SIP configuration and OpenAI outbound access; see the main README.

## Design direction

- Warm white background, restrained type, generous spacing, subtle borders.
- One conversation instead of a multi-step intake form.
- Optional profile context, concise clarification questions, inline results and next steps.
- English, Russian and Korean interface; mobile bottom sheets and reduced-motion support.
- Clear separation between proposed actions and confirmed outcomes.

![Mobile interface](../artifacts/concierge/mobile-home.png)

[Desktop preview](../artifacts/concierge/desktop-home.png)

## Where to work

- `public/index.html`: screens, composer, settings and review sheets.
- `public/styles.css`: typography, spacing, responsive layout and transitions.
- `public/app.js`: conversation rendering, navigation, profile, voice and call UI.
- `public/i18n.js`: interface translations.
- `server/` and `server.mjs`: API integrations and local session state.
- `public/demo/`: preserved original scripted demo.

For parallel work, create your own branch from this branch, for example `git switch -c feat/your-feature`. Coordinate before editing the same files and integrate through reviewed pull requests. The design branch is a runnable reference, not a verified production deployment.

Validation at handoff: 29 automated tests and 12 browser checks passed. Browser AI/voice responses were controlled fixtures; live API, hardware audio and phone calling were not verified. Historical submission slides still describe the original demo.
