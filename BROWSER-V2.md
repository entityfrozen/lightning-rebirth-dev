# Celestial Browser V2

This is an engine and transport rewrite, not a fork of Scramjet's rewriter.

## Architecture

- `public/index.html` stays small and loads the React app.
- `src/Browser.jsx` owns tabs, history, address-bar input, loading state and user-facing errors.
- `src/BoltProxy.js` is the adapter between UI frames and the Scramjet V2 controller.
- `public/proxy-entry.js` owns controller startup, Wisp transport selection, and bounded diagnostics.
- `public/sw.js` routes Scramjet documents through the V2 service worker.
- `server.js` serves pinned package assets and an authenticated `/wisp/` upgrade endpoint.

The browser is inspectable by design. Minified bundles and a small HTML shell do not conceal JavaScript or network requests from the user or DevTools.

## Dependencies and transport selection

The deployed runtime is supplied by exact package versions in `package.json` and is no longer downloaded at server startup. Keep Scramjet 2.x, controller 0.x, utils 0.x, libcurl 2.x, and Epoxy 3.x together. Do not use bare-mux with Scramjet 2.x.

The default is **libcurl**, which generally offers better compatibility with unusual HTTP behavior. **Epoxy** is a lighter alternative. Change the transport under Settings → Browser; existing URLs and tab history are retained, but frames reconnect and reload. Both transports use the same authenticated Wisp endpoint.

Epoxy is not an automatic way around a site's CAPTCHA, DRM, or account login restrictions, and it cannot make embedding universally compatible.

## Troubleshooting

1. Verify `/api/browser/status` returns `proxy: true` after sign-in.
2. Check the browser is in a secure, cross-origin-isolated context. The standalone Celestial tab is recommended for browsing.
3. Open DevTools and run `window.celestialBrowserDiagnostics?.()` to read the last 25 boot stages and any errors. Diagnostics intentionally omit target URLs, cookies, and session tokens.
4. Check the service worker under Application → Service Workers and confirm `/sw.js` is active.
5. Check `/scram/scramjet.js`, `/controller/controller.api.js`, `/utils/scramjet-utils.js` and the selected `/libcurl/index.mjs` or `/epoxy/index.mjs` return HTTP 200 while signed in.
6. Check the `/wisp/` WebSocket upgrade succeeds (HTTP 101). A 401 means the browser session was not authenticated.
7. Switch between libcurl and Epoxy to isolate transport-specific behavior; compare a plain static site before testing a complex service.

Failures may also be caused by CSP, COOP/COEP, site authentication policies, bot protection, network restrictions, or upstream Scramjet bugs.

## Verification

Run:

```bash
npm install
npm run build
npm test
npm run check
```

For an end-to-end browser test:

```bash
npm install --no-save playwright@1.65.0
npx playwright install chromium
node scripts/browser-smoke.mjs
```

The smoke test verifies startup, navigation, worker/controller assets and frame rendering. When changing transport initialization, add a smoke path for Epoxy and a failed-upgrade recovery case before production rollout.

The `DISABLE_WEB_PROXY=1` environment variable disables the browser engine and Wisp endpoint without disabling the rest of Celestial.
