# Asterfield Academy launch

Celestial now opens on an original, fictional Asterfield Academy student-hub page. The full Boba app is loaded **only after 3,000 ms** using a Vite dynamic import, then revealed with a blur/opacity transition. Users who are not signed in continue to the existing sign-in screen.

## How the launch works

- `public/boba/index.template.html` ships visible school-themed markup and an empty `#root`.
- `src/boba-launch.js` delays `import('./boba-client.js')` until after the introduction.
- `src/boba-launch.css` keeps the campus page readable and isolated while the full Boba styles are still unloaded.
- `vite.boba.config.js` emits a separate, hashed `launch` entry; `scripts/inject-native-assets.mjs` uses that manifest entry for the HTML.
- `scripts/opaque-dom.mjs` now hashes the renamed `.engine-switch` selector in compiled CSS and JS, preserving the visible Reflux/Scramjet engine menu.
- The source HTML stays standards-compliant and accessible. Motion is disabled for users who prefer reduced motion.

## Verification

Run `npm install` followed by `npm run build` and `npm run check`. For full browser coverage, install Playwright and run `node scripts/boba-hardening-smoke.mjs`; the smoke checks that the academy appears first and then yields to the existing login and browser UI.

This is packaging and presentation hardening, **not a security boundary**. The browser must be able to inspect the rendered DOM, fetched script bundles, and network traffic. Never bundle credentials or rely on obfuscation for authentication or authorization. The school identity is invented, not a copy of a real school.
