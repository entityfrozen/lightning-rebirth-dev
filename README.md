# Celestial — Aurora Edition

Celestial now opens straight into **Celestial AI** after sign-in, while
Browser, Arcade and Chat remain accessible in the navigation. The workspace
requires a Celestial account: signed-out visitors see only the sign-in or
registration screen.

The interface mirrors the supplied Xylora shell rather than a card dashboard:
a 44px edge-mounted dock with scalloped corners and a hide tab, compact filled
Fluent icons, a centered Celestial wordmark and a natural-language conversation
input. The default backdrop is a pine forest under violet-blue northern lights,
with icy teal glass controls.

The dock has a few shortcuts for convenience. Games opens Arcade; Cloud opens
AI; Apps opens a lightweight launcher, Music opens a browser tab, and Settings
contains appearance controls. All four actual app engines remain unchanged.

The project was rebuilt using **Celestial v8** as a base, with substantial
feature logic reviewed and ported from the connected
[entityfrozen/bolt](https://github.com/entityfrozen/bolt) repository's
`bolt-hosted-v5` branch. Bolt `main` is an earlier browser-only state and
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

- Xylora-proportioned centered Celestial search homepage with functional quick links
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
- Private direct-message threads using the existing Celestial account IDs
- First-login migration of prior Celestial public messages where possible

Old storage paths and account identifiers are retained so existing members
are not silently migrated to new IDs. The authenticated direct-message threads
are stored privately in Celestial's existing data store. **Bolt's advanced
staff-moderation tools are not yet ported into the new UI.**

### AI

- **Homepage-first:** the center search field is a Celestial conversation input
  rather than a URL bar; replies and follow-ups appear on the homepage
- **Mandatory sign-in:** guests cannot open the workspace or call the AI API
- The server does not reveal provider names or model identifiers in AI status
  responses, and the UI does not display setup/readiness labels
- Conversation interface with saved local threads, rename/delete/new
- Real backend provider calls, no fake responses
- `OPENAI_API_KEY` (OpenAI Responses API), or `NVIDIA_API_KEY` (Bolt's
  NVIDIA completion engine), with server-side configuration only
- Authentication and request-size/rate limits
- Explicit disabled state when no provider is configured

Bolt's model failover code is imported; its screenshot parsing and web search
extensions are **not yet included** in Celestial's AI endpoint.

## Configuration

Sample `.env.example`:

    PORT=3080
    LIGHTNING_DATA_FILE=/data/store.json
    OPENAI_API_KEY=
    OPENAI_MODEL=gpt-4.1-mini
    NVIDIA_API_KEY=
    NVIDIA_MODEL=

Do not commit actual keys. Put them in Railway's service environment.

For local testing when Scramjet/Wisp downloads are not available, use
`DISABLE_WEB_PROXY=1`; the standard browser view remains usable with iframe
limitations.

## Visual design

- `src/xylora.css`: **reference-matched navigation geometry** and the aurora
  visual layer. The shell is intentionally flat and edge-mounted, not a
  floating card. It overrides the older forest stylesheet without replacing
  the functional app-specific styles.
- `src/main.jsx`: handles the original dock pattern, collapse button,
  account controls, Apps launcher and appearance modal.
- `src/Browser.jsx`: centered search, five shortcut pills and browser tabs.
- `src/ForestParticles.jsx`: optional low-power WebGL fireflies. Motion can
  be reduced under Settings.

Settings offers three palettes (**Aurora**, **Evergreen**, **Amethyst**) and
three backgrounds (**Northern lights**, **Deep forest**, **Midnight gradient**).
These choices persist locally. The default photograph is by Troy Olson,
available under the Unsplash License:
https://unsplash.com/photos/aurora-borealis-lights-up-the-night-sky-over-forest-9h8pkF_N0FE

The alternative forest is an Unsplash photograph. If remote images are
unavailable, a dark CSS background remains. Appearance choices never change
user data or live sessions.

## File map

- `src/main.jsx`: login gate, AI-first home, dock, settings and account
- `src/xylora.css`: Celestial palette, background, AI home and faithful edge dock
- `src/forest.css`: forest design, game/gallery and responsive layouts
- `src/Browser.jsx`, `src/BoltProxy.js`: browser UI and proxy adapter
- `src/Arcade.jsx`: six playable games
- `src/Chat.jsx`, `src/useBoltLive.js`: community UI and WebSocket state
- `src/AI.jsx`: homepage chat, full chat history and authenticated server requests
- `server.js`: Celestial accounts, API, proxy, AI and real-time hooks
- `live.js`, `community-v2.js`, `chess-ai.js`: Bolt-origin game/social engine
- `ai-provider.js`, `ai-stream.js`: Bolt-origin NVIDIA completion engine

## Deploying

The existing Railway service/repo identifiers may still contain `lightning`;
those are internal names, not the product brand.

Keep the existing `LIGHTNING_DATA_FILE` path and data volume. Do not delete
existing session cookies or account records. The legacy `lightning_session`
cookie is intentionally retained. A source-code merge is not a Railway deploy.
If the Railway trial is still expired or the connected project is unavailable,
deployment requires account-side repair first.

Automated checks cover the frontend build, account API, and live chat protocol.
A real browser/GPU and authenticated Scramjet/Wisp browsing test are still
needed before treating this as a fully production-validated release.
