# Lightning — Rebirth v5.1

A fresh, purple-neon Lightning web app with a real Node.js backend, a local-first theme designer, a community Drop exchange, and optional 2D Lightning-chan PNG sprites.

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

## What's inside

- **New brand mark.** A clean vector lightning logo (`public/assets/lightning-mark.svg`) instead of the earlier Unicode glyph logo.
- **New login.** Two-panel sign-in/registration with a transparent Lightning-chan illustration, hashed passwords, HTTP-only session cookies, username checks, rate limits, and a guest preview.
- **Clean Community chat.** Three channels (`#general`, `#help-desk`, `#showcase`) with server-persisted messages and server-sent-event updates to connected browsers.
- **Community Drops.** Starter themes and member-published themes, including preview, apply, save, like, download as JSON, filtering, and deleting your own Drops.
- **Theme Studio.** Six live color pickers, ambient glow, corner softness, blossoms, built-in presets, local save, import/export, and publish to Community Drops.
- **Optional Lightning-chan Mode.** Defaults to **off**. Enables actual transparent 2D PNG sprites (wave, idle, talk and surprised), simple sprite-based lip motion, expressive pose changes, and visual-novel dialogue. No SVG stick figure.
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

No GitHub repository was modified. The accessible GitHub repos at the time of the rebuild did not identify an existing Lightning web project, so this implementation is independent rather than pretending to restore old project code.

## Source tree

```
server.js                    Node HTTP server and API
public/index.html            App shell
public/styles.css            Responsive UI / two companion layouts
public/app.js                Frontend state, views, theme maker, chat client
public/assets/               Logo and generated transparent 2D PNG sprites
tests/api.test.js             End-to-end API test
```

Developed using Node's standard HTTP/crypto APIs and the standard browser `EventSource` API. No external build step is required.
