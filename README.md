# Celestial — Forest Edition

A browser-first workspace with four sections: **Browser**, **Arcade**, **Chat**,
and **AI**. The visual style is an immersive forest with restrained mint glass,
an icon rail, soft WebGL fireflies, and functional floating workspaces.

The project was rebuilt using **Celestial v8** as a base, with substantial
feature logic reviewed and ported from the connected
[entityfrozen/bolt](https://github.com/entityfrozen/bolt) repository's
\`bolt-hosted-v5\` branch. Bolt \`main\` is an earlier browser-only state and
is **not** the source of these multiplayer features.

## Quick start

Use Node.js 20.19 or newer.

    npm install
    npm start

Open http://localhost:3080

Build and run tests:

    npm run build
    npm run check

The frontend is React + Vite, with Three.js/React Three Fiber particle effects.
No third-party script CDN is needed for the React app. The browser's Scramjet
engine may download and cache its own runtime assets during bootstrap.

## What works

### Browser

- Forest new-tab search homepage
- Multiple tabs and remembered tabs
- Address field, web search, bookmark bar, back/forward, reload
- Bolt's **Scramjet** proxy controller with Wisp transport for signed-in users
- Popup/escaped-link routing into Celestial tabs
- For guests, normal iframe fallback and an external-open link

The web proxy is subject to network/provider, service-worker and browser
capabilities; some websites still require a direct tab. The proxy is an
advanced integration, not a full Chromium process. All proxy access requires a
valid Celestial account session.

### Arcade

- **Chess** — server-authoritative legal moves, bot play and matchmaking
- **Rock Paper Scissors** — hidden decisions, bot/online games and tournaments
- **WorldPvP** — server-managed territories, nations, battles and resources
- **2048** — complete local tile merge game, keyboard and button controls
- **Minesweeper** — first-click safety, flags and win/loss state
- **Uma Versus** — creator-hosted third-party game with direct-open fallback

The multiplayer engines and world map are drawn from Bolt's known working
implementation. The React presentation is new and intentionally lighter.
A real account is required for multiplayer games.

### Chat

- Authenticated live WebSocket connection with reconnect
- Community servers and multiple text channels
- Online roster, reactions, replies, message editing/deletion
- Server creation, membership and channel management
- First-login migration of prior Celestial public messages where possible

Old storage paths and account identifiers are retained so existing members
are not silently migrated to new IDs. **Direct messages and advanced staff
moderation from Bolt are not ported to this screen yet.**

### AI

- Conversation interface with saved local threads, rename/delete/new
- Real backend provider calls, no fake responses
- \`OPENAI_API_KEY\` (OpenAI Responses API), or \`NVIDIA_API_KEY\` (Bolt's
  NVIDIA completion engine), with server-side configuration only
- Authentication and request-size/rate limits
- Explicit disabled state when no provider is configured

Bolt's model failover code is imported; its screenshot parsing and web search
extensions are **not yet included** in Celestial's AI endpoint.

## Configuration

Sample \`.env.example\`:

    PORT=3080
    LIGHTNING_DATA_FILE=/data/store.json
    OPENAI_API_KEY=
    OPENAI_MODEL=gpt-4.1-mini
    NVIDIA_API_KEY=
    NVIDIA_MODEL=

Do not commit actual keys. Put them in Railway's service environment.

For local testing when Scramjet/Wisp downloads are not available, use
\`DISABLE_WEB_PROXY=1\`; the standard browser view remains usable with iframe
limitations.

## Visual design

The forest experience is built in \`src/forest.css\`, with a photographic
backdrop from Unsplash, deep green translucency, a mint search lens, and a
compact icon rail. \`src/ForestParticles.jsx\` uses WebGL and R3F to render
subtle animated forest lights; CSS fallback remains when WebGL fails or when
reduced motion is preferred. Browser, games, chat and AI are ordinary
accessible HTML controls over the atmosphere.

Unsplash photos are licensed under the Unsplash License for projects like this:
https://unsplash.com/license. Replace the image URL in \`src/forest.css\` if
you want to use your own forest photography.

The code also includes the older \`src/GlassHero.jsx\` R3F optical glass
experiment, but it is **not mounted in the forest home screen**. This avoids
distracting from the photography and centered search.

## File map

- \`src/main.jsx\`: minimal shell and account login
- \`src/forest.css\`: forest design, game/gallery and responsive layouts
- \`src/Browser.jsx\`, \`src/BoltProxy.js\`: browser UI and proxy adapter
- \`src/Arcade.jsx\`: six playable games
- \`src/Chat.jsx\`, \`src/useBoltLive.js\`: community UI and WebSocket state
- \`src/AI.jsx\`: local chat history and real server provider interface
- \`server.js\`: Celestial accounts, API, proxy, AI and real-time hooks
- \`live.js\`, \`community-v2.js\`, \`chess-ai.js\`: Bolt-origin game/social engine
- \`ai-provider.js\`, \`ai-stream.js\`: Bolt-origin NVIDIA completion engine

## Deploying

The existing Railway service/repo identifiers may still contain \`lightning\`;
those are internal names, not the product brand.

Keep the existing \`LIGHTNING_DATA_FILE\` path and data volume. Do not delete
existing session cookies or account records. The legacy \`lightning_session\`
cookie is intentionally retained. A source-code merge is not a Railway deploy.
If the Railway trial is still expired or the connected project is unavailable,
deployment requires account-side repair first.

Automated checks cover the frontend build, account API, and live chat protocol.
A real browser/GPU and authenticated Scramjet/Wisp browsing test are still
needed before treating this as a fully production-validated release.
