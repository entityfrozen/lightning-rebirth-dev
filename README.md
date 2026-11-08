# Celestial

A creative workspace with a cosmic interface: WebGL nebula and starfield,
illuminated glass panels, a refractive day/night toggle, theme creation,
a shared community and a private local archive.

Celestial is built with modern browser APIs and the Node.js standard library.
There is **no frontend framework, build tool or third-party runtime dependency**.

## Start locally

Node.js 20 or newer:

```bash
npm start
```

Visit **http://localhost:3080**.

```bash
npm run check
```

The check runs JavaScript syntax validation and the integration tests.

## Interface

The sections are:

- **Observatory** — dashboard and shortcuts
- **Discover** — browse shared themes
- **Archive** — saved themes and Drops
- **Oracle** — AI assistant placeholder, deliberately *not connected*
- **Constellation** — community chat and theme Drops
- **Forge** — six-color live editor, presets, glow, corners and ambient effects
- **Workshop** — local scratchpad and shortcuts
- **Control** — appearance, animation preferences and account

The old character/companion and dialogue systems were removed, including their
artwork, UI controls and script logic. The Celestial star replaces the bolt logo.

### Visual architecture

- `public/celestial.css` — primary interface design tokens, liquid-glass panel
  styling, hover illumination, page composition and responsive overrides
- `public/celestial-sky.js` — lightweight WebGL 1 background. A fullscreen
  fragment shader draws nebula noise, orbit glow and a layered procedural
  starfield at a capped resolution and ~30fps; it pauses when hidden or when
  animations are disabled
- `public/glass-toggle.js` — single-pass refractive glass day/night toggle.
  The moon/sun pixel morph can be scrubbed by dragging; accessibility and
  CSS fallback are provided
- `public/assets/celestial-star.svg` — custom star brand symbol

The motion preference and `prefers-reduced-motion` disable animations.
When WebGL is unavailable, CSS fills provide a static background and a normal
working theme toggle. Light and dark modes have separate saved theme palettes.

### Data and compatibility

Existing accounts, passwords, sessions, community messages and published Drops
are **not deleted or rewritten** by this redesign. The server still uses the
same JSON data store by default (`data/store.json`). When deployed on Railway,
the existing persistent volume and `LIGHTNING_DATA_FILE=/data/store.json` value
must be preserved.

Browser preferences now save under `celestial.*` keys, but the UI automatically
reads the former `lightning.*` keys when the new value is absent. Theme exports
use `celestial.theme` v1, and the importer continues to accept previous
`lightning.theme` v1 packages.

Community posting and publishing require an account. The backend writes account
password hashes, HTTP-only session cookies, community messages and shared themes
to a persistent JSON file. The AI assistant is **not connected**: no API key is
embedded in client-side files or hallucinated as a working feature.

## Deployment

The Railway project and existing service may still be named
`lightning-rebirth-dev` / `lightning-web` — these are infrastructure identifiers
and changing them isn't necessary to display Celestial. Railway is configured
to deploy the `main` branch, run `npm start`, healthcheck `/api/me` and mount
its data volume at `/data`.

The current server is a single-instance MVP, not a production-audited social
network. For broad public use, add moderation, spam controls, durable database
storage, backups, monitoring and account recovery.
