# Lightning — Rebirth v6

A purple-themed creative workspace with a working Node.js backend, community themes and chat, a theme editor, and a 16-frame Lightning-chan companion.

## Run it

Requires **Node.js 20 or newer**. No `npm install` or third-party packages required.

```bash
npm start
```

Open **http://localhost:3080**. Create an account on the welcome screen or continue in read-only guest mode. The account is stored by *this Lightning server*, not by GitHub or another identity provider.

If you want to use another port:

```bash
PORT=4000 npm start
```

For a quick dev loop use `npm run dev`. `npm test` exercises the server's real signup/login, chat, and theme-sharing API.

## Prism day/night interface

The workspace header now has a draggable glass theme switch. Dark and light palettes
are saved separately in local storage, so your Theme Studio changes survive switching
modes. The original dark palette is preserved for existing users.

The switch uses one WebGL 1 fragment pass to draw the track, refractive bevel,
chromatic edge, orbiting light and pixel-swarm morph. The sun and crescent grids
are paired by polar angle, with motion driven by the current knob position;
stopping a drag halfway stops the pixels too. A CSS backdrop filter blurs the
actual page underneath, while the shader refracts its matching ambient field.
This is an intentional lightweight approximation, not a screenshot of the DOM.

Pointer dragging, click/tap, arrow keys and keyboard activation all work.
Reduced-motion settings disable the spring animation. When WebGL is disabled,
the switch falls back to a normal accessible CSS control.

`public/glass-ui.css` handles the shared glass surface language for Home,
navigation, Studio, Community, Library and Settings, plus light-mode contrast.
The existing server, accounts, community data and theme-package format are unchanged.

## What's inside

The v6 refresh replaces the old card-heavy home screen with a quieter editorial landing page, simplifies the navigation, and reduces decorative effects across Community, Library, and Theme Studio. The AI Assistant is still unconfigured: this update does not invent an AI backend.

- **New brand mark.** A clean vector lightning logo (`public/assets/lightning-mark.svg`) instead of the earlier Unicode glyph logo.
- **New login.** Two-panel sign-in/registration with a transparent Lightning-chan illustration, hashed passwords, HTTP-only session cookies, username checks, rate limits, and a guest preview.
- **Clean Community chat.** Three channels (`#general`, `#help-desk`, `#showcase`) with server-persisted messages and server-sent-event updates to connected browsers.
- **Community Drops.** Starter themes and member-published themes, including preview, apply, save, like, download as JSON, filtering, and deleting your own Drops.
- **Theme Studio.** Six live color pickers, ambient glow, corner softness, blossoms, built-in presets, local save, import/export, and publish to Community Drops.
- **Lightning-chan Mode.** On by default for new visitors, configurable in Settings. Her complete 2D poses and expressions are selected from a 4×4 sprite sheet (not a separately moving mouth layer). The companion appears on Home, Browse, Library, Theme Studio and Settings, but stays out of focused chat/tool pages. Reduced-motion preferences are respected.
- **Home, Browse, Library, AI Assistant, Community, Theme Studio, Toolkit, Settings.** HUD Editor has been removed and AI Chat has been renamed AI Assistant.
- **Library and notes.** Saved design drafts, saved Drops and scratchpad are local to the browser. Published Drops and chat are stored on the server.

## How shared data works

Accounts, sessions, community messages, and published Drops are saved to `data/store.json` on the server. This file is automatically created; it is intentionally **excluded from the package** and ignored by Git. Back it up before upgrading or migrating the server.

When hosted publicly, visitors who reach the **same running server and persistent data file** see the same chat and Drops. Localhost does not connect separate people across the internet.

To choose a data location:

```bash
LIGHTNING_DATA_FILE=/persistent/storage/lightning.json npm start
```

## Themes

Theme packages are JSON, not JavaScript or executable plugins. A valid package uses this shape:

```json
{
  "format": "lightning.theme",
  "version": 1,
  "name": "A custom theme",
  "author": "Your username",
  "theme": {
    "accent": "#bb80ff",
    "background": "#100a1b",
    "surface": "#241631",
    "text": "#fff5ff",
    "muted": "#bfaace",
    "line": "#654677",
    "glow": 58,
    "radius": 17,
    "petals": true
  }
}
```

On both the browser and server, color fields are validated as six-digit hex values, rather than inserted as arbitrary CSS/HTML. The file import limit is 15 KB. Your custom theme is applied live immediately; saving a design in the Library is a separate action from publishing it.

## Deployment / production limits

This is a **working single-server MVP**, not an audited public social network. Before opening a large public Community, add moderation/reporting and deletion workflows, spam detection, audit logging, persistent database storage (SQLite/Postgres), session cleanup, monitoring, backups, email-based recovery, and a reverse proxy with TLS. The backend's basic IP rate limits are in-memory and are not sufficient for large-scale abuse prevention.

The AI Assistant is intentionally labeled **not connected**. There's no hard-coded API key or fake chatbot backend. A provider should be added server-side with secrets in environment variables, not in client JavaScript.

The v6 interface was developed directly in this repository. The earlier backend and its stored user data format have not changed.

## Source tree

```
server.js                    Node HTTP server and API
public/index.html            App shell
public/styles.css            Original layout styles
public/refresh.css            v6 interface design and responsive polish
public/glass-ui.css           Prism visual system and light-mode styles
public/glass-toggle.js        Single-pass WebGL glass control and drag interaction
public/app.js                Frontend state, views, theme maker, chat client
public/assets/               Logo and generated transparent 2D PNG sprites
tests/api.test.js             End-to-end API test
```

Developed using Node's standard HTTP/crypto APIs and the standard browser `EventSource` API. No external build step is required.
