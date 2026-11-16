// Temporary, one-time account recovery. Remove this file after the deployment succeeds.
import { readFile, copyFile, writeFile, rename, open } from 'node:fs/promises';
import path from 'node:path';

const target = 'amare';
const base = path.resolve(process.env.BOLT_DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || 'data');
const file = path.resolve(process.env.LIGHTNING_DATA_FILE || path.join(base, 'store.json'));
if (!file.startsWith(base + path.sep)) throw Error('Refusing to modify data outside persistent storage');

const db = JSON.parse(await readFile(file, 'utf8'));
if (!Array.isArray(db.users)) throw Error('Invalid account database: users missing');
const matches = db.users.filter(u => String(u.username || '').toLowerCase() === target);
if (matches.length !== 1) throw Error('Recovery stopped: expected exactly one account named ' + target + ', found ' + matches.length);
const user = matches[0];
if (user.role === 'admin' && user.approved === true && user.enabled !== false) {
  console.log('Recovery: account ' + target + ' is already an active administrator');
  process.exit(0);
}
const backup = path.join(base, 'store.before-amare-admin-recovery.json');
try {
  const marker = await open(backup, 'wx', 0o600);
  await marker.close();
  await copyFile(file, backup);
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
user.role = 'admin';
user.approved = true;
user.reviewStatus = 'approved';
user.enabled = true;
db.sessions = Array.isArray(db.sessions) ? db.sessions.filter(s => s.userId !== user.id) : [];
const temp = path.join(base, 'store.admin-recovery.tmp');
await writeFile(temp, JSON.stringify(db, null, 2), { mode: 0o600 });
await rename(temp, file);
console.log('Recovery: promoted existing account ' + target + ' to administrator; prior account database backed up');
