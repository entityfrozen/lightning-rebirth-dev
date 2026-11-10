# Celestial — Aurora Edition

Celestial opens into a **split homepage** after sign-in: the original main
page and browser search stay on the left, with an optional Celestial AI sidebar.
**Community Chat can now open beside your browser or any game** without
reloading the activity you are using. On smaller screens, Chat becomes an
overlay you can close. The separate Browser, Apps, Chat and AI routes remain.
A Celestial account is required before the workspace can be opened.

The interface mirrors the supplied Xylora shell rather than a card dashboard:
a 44px edge-mounted dock with scalloped corners and a hide tab, compact filled
Fluent icons and a centered Celestial wordmark/search field on the left. The
assistant lives in its own glass side panel, not over the scenery. The default
backdrop is a pine forest under violet-blue northern lights,
with icy teal glass controls.

The dock opens Home, Apps, Browser, AI, Music and Chat, with Settings at the bottom.
The bottom Credits/Community pills are removed; the account control remains.

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
- Cross-origin isolated app shell for Scramjet's service worker/WASM runtime
- Explicit proxy-loading/error/retry state, plus an external-open link if a site won't work; no misleading silent iframe fallback
- Tab strip stays accessible even when the active tab is blank; back/forward no longer navigates twice
- Search engine choices, compact tabs, saved history and session restoration
- Ctrl/Cmd+L for the address bar and Ctrl/Cmd+T for a new tab

The web proxy is subject to network/provider, service-worker and browser
capabilities; some websites still require a direct tab. The proxy is an
advanced integration, not a full Chromium process. All proxy access requires a
valid Celestial account session.

### Apps

The dedicated Games navigation and oversized card gallery were replaced with
a focused App Library. It has functioning launchers for Browser, Chat, AI and
Music, plus Notes, Calculator and Focus Timer.

**All six games are still playable inside Apps:** Chess, 2048, Minesweeper,
Rock Paper Scissors, WorldPvP and Uma Versus. Each opens inside the clean
Apps play surface while a compact live Chat panel can remain alongside it.
The original game engines and saved multiplayer records were not removed.
The focus timer runs only while Celestial is open.

### Chat

The full Chat page and compact Chat rail now share one Messenger component:
server navigation, focused channel list, offline/online roster, authenticated
role badges, DM threads, replies, reactions and editing. The styling uses
quiet graphite panels, a restrained icy accent, compact typography, and
reliable hierarchy rather than oversized glass cards.

- **Multitasking panel:** use the Chat button on the Browser/Home/Apps page to
  keep channels, private messages and community members visible while you
  browse or play. It uses the same authenticated WebSocket as full Chat.
- Hide the panel without interrupting an open website or local game; the
  toggle is remembered locally.
- Authenticated live WebSocket connection with reconnect
- Community servers and multiple text channels
- Full approved-member directory, including offline users and live status
- Verified platform and community role tags in message headers and member list:
  [ADMIN] blue, staff violet, moderators green, owners gold
- Reactions, replies, message editing/deletion
- Server creation, membership and channel management
- Private direct-message threads using the existing Celestial account IDs
- First-login migration of prior Celestial public messages where possible

Old storage paths and account identifiers are retained so existing members
are not silently migrated to new IDs. The authenticated direct-message threads
are stored privately in Celestial's existing data store. **Bolt's advanced
staff-moderation tools are not yet ported into the new UI.**

### AI

- **Optional right-side assistant:** the main page remains a working browser/search
  homepage, while Celestial AI can be shown or hidden on the right
- The sidebar includes new chats, a compact conversation history, starter
  prompts, follow-up messages and a persistent composer; it stacks below
  the main page on narrow screens
- Close it with ×, restore it from Home or the Appearance setting; its visibility
  is saved locally and included in Settings export/import
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

## Working proxy bootstrap

The original `proxy-bootstrap` library still serves the published Scramjet
core/controller, service worker and authenticated Wisp endpoint. However, the
library's `bootstrap-init.js` creates a `data:` module import, which our
Content Security Policy disallows. Loading it resulted in zero requests for
`/sw.js` or the controller after the initial JavaScript file.

Celestial now uses `public/proxy-entry.js` to load those exact published
resources from **same-origin URLs** in the documented order (worker, core,
controller, utilities, transport), then waits for the controller's
initialization. This preserves a restrictive `script-src`, rather than
whitelisting arbitrary `data:` script imports. Navigation errors now include
clear failures and retry controls.

The `Browser and Chat smoke test` GitHub workflow runs headless Chromium
with a disposable local account database. It must activate the proxy worker,
load the runtime/controller/transport and navigate a proxied iframe; it also
captures screenshots of Browser, split Browser+Chat, and full Chat. A build
passing alone is not considered proof that a proxied website is fully
compatible—some destinations still block automated or intercepted access.

## Studio interface

Browser, Chat, Settings and Administration share a calmer, deliberate
desktop-app design: slate panels, fine borders, carefully balanced typography,
one teal highlight and readable content. The active website stays foremost.

**Browser:** an always-visible tab strip and address bar, document titles in
tabs, saved-site tray, quick menu, recent closed-tab recovery and native
fullscreen. Keyboard shortcuts: Ctrl/Cmd+L focuses the address bar, Ctrl/Cmd+T
opens a tab, Ctrl/Cmd+Shift+T restores one, Ctrl+Tab changes tabs, and
Ctrl/Cmd+Shift+F switches fullscreen (Esc exits). On some browsers, a system
shortcut may take precedence over Celestial's handler. Fullscreen requires a
user interaction and browser permission; the active proxied tab is preserved
when entering or leaving.

**Chat:** full-page or side-by-side Messenger, now with a native fullscreen
control in the header. Messages, members, role badges, DMs and channels use
the existing authenticated community services.

**Apps:** fullscreen control for playable games and the built-in utilities.
Existing game state remains mounted during the transition.

**Settings & Administration:** separate settings categories, discoverable
shortcuts, palette previews, browser preferences, account data and a
dedicated administration tab for staff. Account requests are searchable,
reviewed individually and submitted to the existing role-checked
approval/decline endpoints. Regular members cannot access the admin
workspace. Neither profile settings nor account approvals overwrite the
existing server database or conversation history.

## Visual direction

The QOL workspace is intentionally calmer than the old glass-card UI:
lightweight browser tabs, an uncluttered site canvas, a focused playable game
surface and a narrow dark Chat rail. The photo/aurora background remains on
the homepage, while active websites and games get legible, neutral surfaces.

Visual screenshots and real-world website compatibility still require a
browser-based smoke test. Scramjet is experimental and some sites may not work,
even with a correct server and service-worker setup.

## Settings and cloaking

Settings is now its own page, organized into Appearance, Browser, Privacy &
Cloaking, and Account & Data. It includes background palettes, animations,
AI sidebar visibility, search engine, tab behavior, tab title/favicon presets,
and an optional `about:blank` wrapper. The wrapper only changes the tab
appearance, **not** network activity or browsing history, and may be blocked
by popup/embed restrictions.

Settings can be exported/imported as JSON; exports intentionally omit login
credentials, private chats and browser history. Preferences are stored on the
device.

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
`DISABLE_WEB_PROXY=1`; the browser will show a clear unavailable state and
a link to open the requested website in a normal tab. There is no silent
iframe fallback, as many modern sites reject embedding.

## Visual design

- `src/xylora.css`: **reference-matched navigation geometry** and the aurora
  visual layer. The shell is intentionally flat and edge-mounted, not a
  floating card. It overrides the older forest stylesheet without replacing
  the functional app-specific styles.
- `src/main.jsx`: navigation, the optional AI home sidebar, account and workspace
- `src/Apps.jsx`: functional app library and built-in tools
- `src/Settings.jsx`: full settings experience including tab cloaking
- `src/qol.css`: Apps, Settings, Browser and Chat styling
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
