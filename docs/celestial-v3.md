# Celestial 3.0 — Studio Preview

V3 gives Celestial a coherent product architecture and visual language without
endangering production accounts or rebuilding working services from scratch.
This branch is not connected to production Railway.

## Design direction

Calm, not flat: deep ink-blue workspace, low-key navigation, carefully weighted
typography, and a few deliberate high-contrast moments. The WebGL orbital scene
appears only on the Overview hero. Everything else is accessible HTML and CSS.

Research:
- https://linear.app/now/behind-the-latest-design-refresh — visual hierarchy and muted navigation
- https://vercel.com/design/guidelines — purposeful motion and reliable interface details
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion — respect motion preferences
- https://threejs.org/manual/pages/responsive.html — keep graphics rendering within a pixel budget

## Architecture

- src/boba-client.js: V3 bootstrap and style entry
- public/boba/v3/app.js: auth, routing, lazy feature mounts, quick switcher, recoverable errors
- public/boba/v3/shell.js: sidebar, titlebar and workspace structure
- public/boba/v3/home.js: functional Overview landing with launch shortcuts
- public/boba/v3/orbit.js: WebGL program with cleanup, reduced-motion and tab visibility
- public/boba/v3/style.css: tokens, responsive layouts and compatible old feature styles
- scripts/v3-ui-smoke.mjs: browser smoke tests using temporary test account storage
- tests/v3-shell.test.js: structural tests

Original modules are retained and mounted on demand: Browser (Scramjet and UV),
Chat, AI, Settings, Account, and Administration. Admin access is still role-gated.
There are no new API keys, no invented data, and no database migrations.
The removed Games tab stays removed.

## Validation and local use

1. npm install (the postinstall script builds both Vite bundles and runs unit tests)
2. npm test
3. npm install --no-save playwright@1.65.0 --ignore-scripts
4. npx playwright install chromium
5. node scripts/v3-ui-smoke.mjs

The browser smoke creates a disposable server and accounts, checks login,
workspace navigation, quick switcher, browser, community, settings, account,
admin, and mobile, then saves screenshots under artifacts/v3.

## Remaining before production

- Confirm live browser proxy flows and about:blank launcher integration.
- Redesign sign-in and the interior tool layouts rather than relying permanently
  on compatibility styles.
- Audit focus, contrast, responsive keyboard interactions, WebGL and low-end device performance.
- Extract server API/persistence modules and plan tested migrations.
- Review screenshot artifacts and deploy to a separate staging environment.
- Merge only after functional parity and actual browser smoke tests.

Status: first working implementation slice on a safe branch. It is not yet
a complete replacement for the current production backend and feature logic.
