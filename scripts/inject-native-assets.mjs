import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Resolve filenames from Vite's manifest, not by guessing its content hashes.
const root = resolve('public/boba');
const manifest = JSON.parse(await readFile(resolve(root, 'dist/.vite/manifest.json'), 'utf8'));
for (const [name, source] of [['index','src/boba-client.js'], ['auth','src/boba-login.js']]) {
  const entry = manifest[source];
  if (!entry?.isEntry || !entry.file || !Array.isArray(entry.css) || !entry.css.length) {
    throw Error('Missing Boba entry or stylesheet in Vite manifest: '+source);
  }
  const template = await readFile(resolve(root, name+'.template.html'), 'utf8');
  const links = entry.css.map(file=>'<link rel="stylesheet" href="/boba/dist/'+file+'">').join('\n');
  const script = '<script type="module" src="/boba/dist/'+entry.file+'"></script>';
  const html = template
    .replace(/\s*<link rel="stylesheet" href="\/boba\/(?:original|native|auth)\.css">/g,'')
    .replace('</head>',links+'\n</head>')
    .replace(/<script (?:type="module" src="\/boba\/native\.js"|defer src="\/boba\/auth\.js")><\/script>/,script);
  if (!html.includes(script) || html.includes('original.css') || html.includes('src="/boba/native.js"') || html.includes('src="/boba/auth.js"')) {
    throw Error('Could not replace development assets in '+name+' template');
  }
  await writeFile(resolve(root,name+'.html'),html);
}
