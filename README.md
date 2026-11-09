# Celestial — Aurora Edition

Celestial opens into a **split homepage** after sign-in: the original
main page and browser search remain on the left, while a compact, fully
functional **Celestial AI sidebar** stays visible on the right. The Browser,
Arcade, Chat and full AI workspaces remain accessible in the navigation.
A Celestial account is required before the workspace can be opened.

The interface mirrors the supplied Xylora shell rather than a card dashboard:
a 44px edge-mounted dock with scalloped corners and a hide tab, compact filled
Fluent icons and a centered Celestial wordmark/search field on the left. The
assistant lives in its own glass side panel, not over the scenery. The default
backdrop is a pine forest under violet-blue northern lights,
with icy teal glass controls.

The dock still opens Games, Browser, Chat and AI, and Settings controls appearance. The Credits and Community buttons that previously sat in the bottom corner have been removed; the account/profile control remains.

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

- **Right-side assistant:** the main page remains a working browser/search
  homepage, while Celestial AI handles real conversation threads on the right
- The sidebar includes new chats, a compact conversation history, starter
  prompts, follow-up messages and a persistent composer; it stacks below
  the main page on narrow screens
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

## Manual account approval and legacy data

Registration now submits a **pending request**. A new user receives no session
and cannot use Browser, Games, Chat or AI until an authorized administrator
approves that request. Rejected requests remain disabled. Existing approved
Celestial or Bolt members are not forced to reapply. Existing Bolt accounts
that were already pending or disabled stay that way.

An approved administrator or account manager can open the profile control
(bottom-right) and review pending applications. The server verifies roles
on every approval/decline request; changing the frontend does not authorize
unprivileged members. There is no default approval bypass.

**Important for the existing Railway service:** keep the existing
`bolt-v5-data` volume mounted at `/data` on `bolt-v5-preview` in the
`chic-encouragement` project. The application now chooses `BOLT_DATA_DIR`,
then `RAILWAY_VOLUME_MOUNT_PATH`, before falling back to local storage. If the
mount is `/data`, its new Celestial store is `/data/store.json`, while the old
Bolt records are read from `/data/bolt.json` and
`/data/lightning-accounts.json`. This uses the existing old server data,
**not a newly created database or volume**.

On first start, the server writes a local backup to
`/data/celestial-backups/before-celestial-v1/`, preserving each legacy file
before it can be upgraded. IDs, password hashes, existing approval states,
legacy DMs and community membership are preserved. The live community
engine continues using `lightning-v2-communities.json` and
`lightning-social.json` on that same volume, so previous servers and chats
remain available. A Bolt user can sign in using their original password;
existing Bolt browser cookies are not migrated, so they may need to sign in
again. New Celestial sessions remain compatible with `lightning_session`.

If an old username conflicts with a newer account ID, the importer skips the
conflicting record rather than overwriting either account. Review migration
logs and the backup before resolving conflicts. On Railway, an absent or
misconfigured data volume causes startup to fail safely rather than silently
starting with an empty user database. Do not wipe or detach the old volume.

If there is no imported admin, the service can bootstrap an administrator
**only** when both `BOLT_ADMIN_USER` and a strong (12+ characters)
`BOLT_ADMIN_PASSWORD` are configured on the server. This never promotes an
existing user just by matching a username. Never commit admin credentials.

Other original Bolt account-space files (such as past AI workspaces and
profile preferences) remain on the volume; this update migrates account
identity, community messages and direct messages, not every archived AI
workspace. Avoid running two independently writing servers against the same
JSON store.

## Configuration

Sample `.env.example`:

    PORT=3080
    BOLT_DATA_DIR=/data
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

The aurora now has richer, slow-moving layers and more WebGL fireflies,
with reduced-motion support retained.

Settings offers three palettes (**Aurora**, **Evergreen**, **Amethyst**) and
three backgrounds (**Northern lights**, **Deep forest**, **Midnight gradient**).
These choices persist locally. The default photograph is by Troy Olson,
available under the Unsplash License:
https://unsplash.com/photos/aurora-borealis-lights-up-the-night-sky-over-forest-9h8pkF_N0FE

The alternative forest is an Unsplash photograph. If remote images are
unavailable, a dark CSS background remains. Appearance choices never change
user data or live sessions.

## File map

- `src/main.jsx`: login gate, split homepage, dock, settings and account
- `src/xylora.css`: Celestial palette, background and faithful edge dock
- `src/home-split.css`: responsive main page + glass AI sidebar
- `src/forest.css`: forest design, game/gallery and responsive layouts
- `src/AccountReview.jsx`: account approval and rejection interface
- `legacy-data.js`: original Bolt account and chat importer with backup
- `src/Browser.jsx`, `src/BoltProxy.js`: browser UI and proxy adapter
- `src/Arcade.jsx`: six playable games
- `src/Chat.jsx`, `src/useBoltLive.js`: community UI and WebSocket state
- `src/AI.jsx`: compact AI sidebar, full chat history and authenticated requests
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
