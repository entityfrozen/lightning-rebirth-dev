# Celestial v8 — Four worlds. One universe.

Celestial is now built around exactly four applications: **Arcade**, **Browser**,
**Chat** and **AI**. The previous dashboard, theme galleries, studios and
character UI were deleted rather than renamed.

## Install and run

Requires Node.js 20.19+:

    npm install
    npm start

Visit http://localhost:3080. Run tests with:

    npm run check

The install builds the React frontend into public/bundle automatically.
The normal server serves the compiled files, plus the existing account and
community API. There is no runtime dependency on a CDN.

## The four applications

**Arcade:** Three playable minigames — Comet Drift, Pulse Reflex and
Constellation memory — with local best scores. The hero contains interactive
3D glass.

**Browser:** Tabs, address/search input, back/forward history, bookmarks,
new tabs and an in-page iframe. Browsers cannot embed every website:
sites with X-Frame-Options or CSP frame-ancestors restrictions may refuse
to display. The Open Directly button is always provided. This is not a
Chromium-based unrestricted browser.

**Chat:** Real-time community channels using the existing server message API.
Guests can read. Signed-in users can post. Existing stored messages and
account cookies remain compatible.

**AI:** An actual server proxy to the OpenAI Responses API. Set OPENAI_API_KEY
in the hosting environment and optionally OPENAI_MODEL. The key is never
sent to the browser. Without a configured provider, AI visibly reports that
the service is unavailable instead of simulating responses.

## Visual architecture

- React 19 + React Three Fiber 9 + Three.js and Drei
- MeshPhysicalMaterial transmission, IOR, thickness, roughness and dispersion
- True 3D scene texture refraction: the glass refracts the scene's own rendered
  lettering and scenery, not a screenshot of a user browser tab
- Drei Html projection for an HTML annotation attached to the 3D sculpture
- DialKit live tuning for glass parameters, shown during development; add
  ?tune=1 to the URL to opt into its controls on a deployed build
- Responsive liquid-glass shell, 3D star ambience and a reduced-motion switch

The creative direction is an original take on the **Glass Hero** style
demonstrated by Zsolt Kacso (May 2026), rather than a copy of their code.

Reference: https://experiments.thisiswhitespace.com/glass-hero

## Development

Main React entry: src/main.jsx
Pages: src/Arcade.jsx, src/Browser.jsx, src/Chat.jsx, src/AI.jsx
3D scene: src/GlassHero.jsx
Styling: src/styles.css
Vite: vite.config.js
Node API: server.js

To rebuild the frontend after editing source:

    npm run build

The old static CSS/JavaScript files are intentionally removed. Do not
re-introduce the old app.js from the previous UI.

## Deployment and data safety

Railway service and repository identifiers may still contain the word
"lightning"; changing them is unnecessary for the Celestial UI.

Keep LIGHTNING_DATA_FILE pointing to the existing persistent volume path.
The legacy key and cookie name are retained intentionally, ensuring previously
registered accounts and active sessions continue to work. No migration deletes
users, messages or saved data.

Railway currently reported a trial-expired billing problem, so a successful
GitHub merge does not imply the app is deployed. Set the plan and deploy
the latest main branch after verifying the build.

The AI endpoint is rate limited and requires authentication. Add database
backups, moderation, logging and more substantial abuse safeguards before
inviting a large public community.
