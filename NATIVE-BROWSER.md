# Celestial Native Browser

This rewrite keeps the Boba browser interface but replaces its original engine dependencies with a small, auditable HTTP gateway.

It is a first version of the engine, **not a full replacement for a modern browser rewriter yet**. The old Scramjet, Reflux, Ultraviolet, BareMux and Wisp implementations are removed on this branch.

## How it works

The signed-in app requests a short-lived browser grant from `GET /api/browser/token`. It encodes the destination URL into a gateway route and navigates a credentialless, sandboxed iframe to that route.

`browser-gateway.js` accepts HTTP/HTTPS addresses, checks each DNS answer and redirect against its private-network rules, and fetches the remote document. HTML and CSS URLs are rewritten through the same gateway. A small injected client handles basic `fetch` and `XMLHttpRequest` requests and reports when the page's DOM is ready.

A response-level CSP sandbox forces an opaque origin even if someone manually opens a gateway URL in a full tab. The top-level application therefore does not have to trust the remote page's scripts. Browser grants are bearer credentials, so they are short-lived, request-limited, and should never be logged or treated like account sessions.

## What works in V1

- HTTP/HTTPS document requests with bounded GET/HEAD/POST support
- Simple links, forms and static assets rewritten through the gateway
- HTML and CSS resources, plus basic Fetch/XHR URL translation
- The Boba tabs, address bar, navigation history, fullscreen controls and Community layout
- A real external-page test in Settings, not just a socket handshake
- Rejected private-IP and private-DNS destinations

## Known limitations

JavaScript that constructs URLs through unsupported DOM APIs can bypass rewriting. WebSockets, service workers, DRM, complex authentication flows, site cookies, advanced client-side routing and certain browser-specific APIs are not yet emulated. Large or script-heavy applications such as YouTube Music, Google sign-in and Discord should **not** be described as supported until each has a passing real-browser test.

An opaque iframe also creates restrictions on local development servers in modern Chrome. The Chromium CI test uses actual gateway responses with a test-only Playwright loopback relay. Production must be validated separately on a public HTTPS hostname; no Chrome security flags are required of end users.

## Release checklist

Run `npm run check`, `node scripts/native-browser-smoke.mjs` and `node scripts/boba-hardening-smoke.mjs` with the dependencies installed. CI also runs a Home and Arcade UI regression suite.

Before merging to the Railway production branch, validate the current public HTTPS origin, confirm account data and Community are unaffected, and test both a normal Boba tab and an `about:blank` cloaked tab. Any regression in credentialless isolation, HTML rendering, or site navigation blocks the merge.

## Next steps

The most important next architecture change is a dedicated browsing origin, separated from Celestial's account/API origin. After that: proper dynamic DOM URL rewriting, navigation events, cookies and state partitioning, WebSocket relay support, streaming resources, and compatibility tests across multiple real websites. Each change should land with an automated browser test.
