# Celestial v7 – Railway dev deployment

Railway project: lightning-rebirth-dev (existing infrastructure name)
Project URL: https://railway.com/project/a5c11ea1-f7ca-4c35-866c-ef5bb034330e
Environment: development

This folder is ready to push as the root of a GitHub repository and connect as a Railway service.

## Connect

1. Create a dedicated GitHub repository for Celestial and commit this folder (without `.env` or `data/`).
2. In Railway's `lightning-rebirth-dev` project, add a service from the GitHub repository, branch `main`.
3. Create a persistent volume mounted at `/data` and set `LIGHTNING_DATA_FILE=/data/store.json` on the Celestial service. Do not run more than one replica with the current JSON database.
4. Generate a Railway public service domain. The service uses Railway's `PORT` environment variable automatically.
5. Visit `/api/me` for an HTTP 200 healthcheck and open `/` for the app.

## Notes

- `railway.json` sets the start command and health check.
- This is a development build, not a production-hardened public community. Public access will expose registration and posting; use an access restriction if you don't want strangers on your test server.
- The session and community data store must be on the volume to survive redeploys.
- Do not place API keys in frontend files. AI Assistant backend is still not connected.
- For public shared chat, add moderation and backup processes before production launch.
