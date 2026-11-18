# Scramjet diagnostics and recovery

Celestial uses the same-origin `/proxy-entry.js` bootstrap first. The old
`proxy-bootstrap` client dynamically imports data URLs, which can violate
Celestial's CSP, so it is now only a fallback if the local loader fails.

The controller remains one per Boba page. New frames reuse that controller and
its libcurl/Wisp transport rather than creating additional transports on every
navigation. Initialization and handshake waits are bounded; startup errors
can reach the existing Smart browser fallback instead of hanging indefinitely.

## Stability hardening (November 2026)

- Scramjet now starts from the activated `/sw.js` registration even if the
  Celestial workspace is not yet controlled by that worker. This follows
  Mercury Workshop's active-worker fallback and removes the extra forced
  page reload that used to interrupt an about:blank session.
- Worker keepalive messages target the worker actually associated with
  the Scramjet controller (including the active-but-uncontrolled case),
  instead of assuming `navigator.serviceWorker.controller` always exists.
- Browser navigation uses upstream `Frame.go()`, which writes the encoded
  destination to the iframe's actual `src`. The old detached-frame hack is
  removed because it diverges from the official navigation lifecycle.
  This makes the encoded URL visible in the parent DOM, but the true
  destination was always inspectable in DevTools and the network.
- Frame initialization is single-flight per iframe. Overlapping submissions
  cannot create duplicate frames, and a late completion from an old request
  cannot overwrite a newer navigation. Closing a tab during startup also
  cleans up the resulting frame.
- **Test connection** in Settings checks the authenticated browser backend
  and actual controller/Wisp handshake. Results are recorded locally as
  sanitized `health` events. Passing this check does not guarantee a
  particular third-party website accepts rewriting, login or video playback.

## Find the logs

1. Open **Settings → Browsing → Scramjet diagnostics**.
2. Use Scramjet in the Browser (or choose Smart on a compatible site).
3. Select **Test connection** to check controller availability, or return
   to Settings after a navigation to see its startup/transport stages.
4. Choose **Copy report** to copy a JSON snapshot, or **Clear** to reset it.

Each report is local to the current Celestial workspace and contains only:
a UTC timestamp; a fixed, allowlisted stage; a fixed result; an optional
duration; a broad failure category; and support for service workers /
secure context / whether the workspace is framed.

**No full exceptions, URLs, search queries, paths, cookies, authorization
headers, credentials, page content or WebSocket payloads are recorded.**
The report is not posted to the Celestial server or persisted in the user's
account. The browser console prints only the stage and sanitized error
category when a failure occurs. A restart clears the in-memory ring buffer.

## Limits

- A working service worker and controller are necessary but not sufficient
  for every website; a target site can reject proxies, iframes or embedded
  authentication.
- WebSocket transport, cross-origin isolation and worker control may differ
  among Chrome, Edge, Safari and browsers with restrictive settings.
- Some sites require rendering and media features the Scramjet page rewriter
  does not implement. The diagnostic log helps pinpoint the failing stage,
  not bypass a site’s security controls.

## Tests

`tests/scramjet-diagnostics.test.js` checks the 80-entry cap, input
sanitization, stage allowlist, startup order and Settings controls.
The Chromium smoke test checks actual Scramjet browsing inside the cloaked
about:blank workspace and verifies the diagnostic panel contains the expected
stages, without browsing URL leakage.
