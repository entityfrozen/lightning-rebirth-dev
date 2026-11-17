# Smart browser engine (Celestial Boba)

Smart is the recommended default for new browser tabs. It selects between
existing, working local engines; it does not pretend to be another proxy.

## How it works

- Ordinary websites start through Reflux + Ultraviolet, using the current
  Epoxy/Wisp transport.
- Google, YouTube, Discord and Spotify use Scramjet first because their
  dynamic applications are more likely to hit Ultraviolet rewriter limits.
- If a navigation returns an error page or times out, Celestial retries
  once through the alternate engine with a fresh iframe.
- Once that retry actually renders a page, Smart temporarily remembers the
  working engine for **that hostname**. The learned choice expires in fifteen
  minutes and isn't written to disk, synced to an account, or sent to a server.
- Selecting **Reflux** or **Scramjet** manually opts out of Smart routing for
  that tab. The drop-down also shows the engine currently in use.
- Settings > Browsing sets the preference for **new** tabs. Existing tabs
  preserve their own selection.
- Old saved engine preferences are respected rather than overwritten.

A rendered document is not proof that site-specific interactions (CAPTCHAs,
video codecs, game streaming) will work. Google or streaming services can
restrict proxy access or embedding; do not disguise those failures.

## Stability fixes

A tab now disconnects its title observer when switching documents or closing
a page, rather than retaining old DOM observers. When Smart changes engines,
Celestial disposes the previous iframe and creates a fresh one; this prevents
stale service workers, navigation callbacks and observers from accumulating.

## Optional third engine / remote browser

Rammerhead runs a separate session-based Node server; it cannot be added as a
client-side import into the existing Reflux/Scramjet controller. A production
deployment requires a dedicated service, server authentication, per-user
sessions, persistent storage, rate limits, abuse protection, and testing.
Its upstream documentation explicitly cautions about Google login behavior.

Kasm/remote Chromium needs isolated browser containers, real compute resources,
WebSocket streaming, session authorization, and separate operating-system
infrastructure. In particular, Kasm's own published minimums are much higher
than the existing single lightweight Celestial container.

Until the infrastructure exists and has been verified, no misleading
Rammerhead or Cloud option is exposed to users.

## Tests

- `tests/browser-engine-router.test.js`: domain allowlist, URL validation,
  explicit manual overrides, bounded hostname learning, timeout expiry.
- `tests/browser-chat-dom.test.js`: live Boba selector, recovery and source
  isolation behavior.
- `scripts/reflux-browser-live-smoke.mjs`: a real Chromium session runs
  Reflux + Wisp, opens a cloaked tab, and mounts the official YouTube player.

See `docs/youtube-playback.md` for limitations of the official YouTube embed.
