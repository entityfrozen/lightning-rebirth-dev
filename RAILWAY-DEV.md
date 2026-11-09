# Railway: Celestial on the original Bolt data volume

This repository is connected to an existing Railway deployment:

- Railway project: `chic-encouragement`
- Service: `bolt-v5-preview` (source `entityfrozen/lightning-rebirth-dev`, branch `main`)
- Persistent volume: `bolt-v5-data` mounted at `/data` (500 MB)
- Another service, `lightning-openfront`, points to the old Bolt repository.

Do **not** create a replacement empty volume or delete the old one. Keep
`BOLT_DATA_DIR=/data` and, if you set it, `LIGHTNING_DATA_FILE=/data/store.json`.
The server will also recognize Railway's `RAILWAY_VOLUME_MOUNT_PATH`.
It fails to start when account paths point outside the mounted Railway volume.

Before migrating, an immutable-in-practice local snapshot is created at:

    /data/celestial-backups/before-celestial-v1/

The Bolt files are read without modification by the account importer:
`bolt.json`, `lightning-accounts.json`. The community engine reuses
`lightning-v2-communities.json` and `lightning-social.json` on the same
volume after a backup has been made. It does not silently replace usernames
or IDs on collision. Old users sign in with their original passwords.
Old browser session cookies are not imported, so a fresh login may be needed.

New registrations receive HTTP 202 **pending**, not a session. Approved
administrators and account managers can approve or decline applications
from the account/profile control. Their permissions are verified server-side.
Set `BOLT_ADMIN_USER` and `BOLT_ADMIN_PASSWORD` only when you need a first
admin and there is no imported admin. Never commit those passwords.

No direct deployment is implied by merging a PR. If automatic Railway deploys
are enabled for `main`, monitor the build, startup logs, and migration summary.
If no legacy database can be found, the service intentionally refuses to start
with an empty user list instead of losing account history unnoticed.

Build: npm install (postinstall runs the Vite build)
Start: npm start
Healthcheck: /api/me

Railway's own volume documentation: https://docs.railway.com/volumes
