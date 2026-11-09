# Deploy Celestial on Railway

Project: lightning-rebirth-dev (existing infrastructure name)
Service: lightning-web (existing service name)
Branch: main
Start command: npm start
Healthcheck: /api/me

Build: npm install triggers npm run build via postinstall, creating public/bundle.
Do not delete the persistent volume. Preserve LIGHTNING_DATA_FILE and any
existing user data and session cookies.

Optional AI feature: set OPENAI_API_KEY as a Railway service environment
variable; optionally set OPENAI_MODEL. Do not put tokens in the browser.

If Railway reports an expired trial, select a plan in Railway Billing before
a deployment can proceed. GitHub tests do not override Railway billing.
