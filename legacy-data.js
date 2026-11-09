import path from 'node:path';
import {readFile,copyFile,mkdir,writeFile,chmod,stat} from 'node:fs/promises';
import {constants as fsConstants} from 'node:fs';
import {randomBytes, scryptSync} from 'node:crypto';

async function readOptionalJSON(filename) {
  try {
    const text = await readFile(filename, 'utf8');
    return JSON.parse(text); // malformed legacy data must not be replaced silently
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error('Unable to safely read existing data at ' + filename + ': ' + error.message);
  }
}

/**
 * Before we mount the original community engine, take a local snapshot.
 * Community code may update its own legacy schema in place, so we preserve
 * the untouched originals for rollback. The manifest makes this idempotent.
 */
export async function backupBoltData(dataDir) {
  const folder = path.join(dataDir,'celestial-backups','before-celestial-v1');
  const manifest = path.join(folder,'manifest.json');
  try {
    await stat(manifest);
    return {alreadySaved:true,files:[]};
  } catch(error) {
    if(error.code!=='ENOENT')throw error;
  }
  const filenames=['store.json','bolt.json','lightning-accounts.json',
    'lightning-social.json','lightning-v2-communities.json'];
  const present=[];
  for(const name of filenames) {
    try{
      const info=await stat(path.join(dataDir,name));
      if(info.isFile())present.push(name);
    }catch(error){if(error.code!=='ENOENT')throw error;}
  }
  if(!present.length)return {alreadySaved:false,files:[]};
  await mkdir(folder,{recursive:true,mode:0o700});
  for(const name of present) {
    const target=path.join(folder,name);
    try{
      await copyFile(path.join(dataDir,name),target,fsConstants.COPYFILE_EXCL);
    }catch(error){
      if(error.code!=='EEXIST')throw error;
    }
    await chmod(target,0o600);
  }
  await writeFile(manifest,JSON.stringify({
    createdAt:new Date().toISOString(),files:present
  },null,2),{mode:0o600,flag:'wx'});
  return {alreadySaved:false,files:present};
}

const validLegacyId = value => typeof value === 'string'
  && /^(usr_[a-zA-Z0-9_-]{8,40}|[a-f0-9]{24})$/.test(value);
const normalized = value => String(value || '').toLowerCase();

/**
 * Import into the current store without ever modifying Bolt's original files.
 *
 * Keep IDs and password hashes intact: changing IDs would detach community
 * membership, DMs and user profiles from their real owners. Never auto-approve
 * a Bolt registration that was already pending or disabled.
 */
export async function importBoltData(db, dataDir) {
  const legacy = await readOptionalJSON(path.join(dataDir, 'bolt.json'));
  const result = {legacyFound: Boolean(legacy), accountsImported: 0,
    conversationsImported: 0, skippedConflicts: 0, legacyFiles: []};

  if (legacy !== null) {
    result.legacyFiles.push('bolt.json');
    if (!Array.isArray(legacy.users)) throw Error('Legacy bolt.json has no valid users list');
    const usedIds = new Set(db.users.map(user => user.id));
    const usedNames = new Set(db.users.map(user => normalized(user.username)));
    for (const candidate of legacy.users) {
      if (!candidate || !validLegacyId(candidate.id) ||
          !/^[a-z0-9._-]{3,32}$/.test(candidate.username) ||
          typeof candidate.passwordHash !== 'string' ||
          !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i.test(candidate.passwordHash)) {
        // Never fabricate login credentials for an invalid legacy account.
        result.skippedConflicts++;
        continue;
      }
      if (usedIds.has(candidate.id)) continue;
      if (usedNames.has(normalized(candidate.username))) {
        result.skippedConflicts++;
        continue;
      }
      const user = {
        id: candidate.id,
        username: candidate.username,
        passwordHash: candidate.passwordHash,
        role: candidate.role || 'user',
        enabled: candidate.enabled !== false,
        approved: candidate.approved !== false,
        reviewStatus: candidate.approved === false ? 'pending' : 'approved',
        expiresAt: Number(candidate.expiresAt) || null,
        joinedAt: new Date(Number(candidate.createdAt) || Date.now()).toISOString(),
        legacyAccount: true
      };
      db.users.push(user);
      usedIds.add(user.id);
      usedNames.add(normalized(user.username));
      result.accountsImported++;
    }
  }

  // Bolt's private messages live in a separate file with threaded entries.
  // Import the records once by original message ID, preserving participants.
  const accountFile = await readOptionalJSON(path.join(dataDir, 'lightning-accounts.json'));
  if (accountFile !== null) {
    result.legacyFiles.push('lightning-accounts.json');
    if (!accountFile || typeof accountFile.dm !== 'object' || Array.isArray(accountFile.dm)) {
      throw Error('Legacy lightning-accounts.json has malformed direct-message data');
    }
    const ids = new Set(db.users.map(user => user.id));
    const existing = new Set(db.dms.map(message => message.id));
    for (const thread of Object.values(accountFile.dm)) {
      if (!thread || !Array.isArray(thread.messages)) continue;
      for (const entry of thread.messages) {
        if (!entry || !validLegacyId(entry.from) || !validLegacyId(entry.to) ||
            !ids.has(entry.from) || !ids.has(entry.to) ||
            typeof entry.text !== 'string' || !entry.text.trim()) continue;
        const messageId = String(entry.id || '').slice(0, 80);
        if (!messageId || existing.has(messageId)) continue;
        const timestamp = Number(entry.at);
        db.dms.push({
          id: messageId,
          from: entry.from,
          to: entry.to,
          text: entry.text.slice(0, 1500),
          createdAt: new Date(Number.isFinite(timestamp) && timestamp > 0 ?
            timestamp : Date.now()).toISOString(),
          legacyMessage: true
        });
        existing.add(messageId);
        result.conversationsImported++;
      }
    }
    db.dms.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  // Other Bolt files are already consumed in-place by live.js/community-v2.js:
  // lightning-social.json, lightning-v2-communities.json and world data.
  return result;
}

/**
 * Use explicit server-side credentials only for a first administrator when
 * there is none to import. Never elevate a pre-existing user just by name.
 */
export function bootstrapAdministrator(db, config = process.env) {
  if (db.users.some(user => user.role === 'admin')) return false;
  const username = String(config.BOLT_ADMIN_USER || '').trim().toLowerCase();
  const password = String(config.BOLT_ADMIN_PASSWORD || '');
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || password.length < 12) return false;
  if (db.users.some(user => normalized(user.username) === username)) {
    throw Error('Administrator bootstrap conflict; existing user cannot be promoted automatically');
  }
  const salt = randomBytes(16).toString('hex');
  db.users.push({
    id: randomBytes(12).toString('hex'), username,
    salt, hash: scryptSync(password, salt, 64).toString('hex'),
    approved: true, reviewStatus: 'approved', enabled: true,
    role: 'admin', joinedAt: new Date().toISOString()
  });
  return true;
}
