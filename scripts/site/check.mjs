// Inspect the actual local publication boundary, including real local files.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const docs = resolve(root, 'docs');
const release = JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8'));
const pages = [resolve(docs, 'index.html'), ...(await readdir(resolve(docs, 'guide'))).filter(n=>n.endsWith('.html')).map(n=>resolve(docs,'guide',n))];
let links = 0;
for (const path of pages) {
  const html = await readFile(path, 'utf8');
  assert.match(html, /data-language="zh"/);
  assert.match(html, /data-language="en"/);
  assert.match(html, /name="viewport"/);
  assert.doesNotMatch(html, /\/releases\/(?:latest|download)\//);
  assert.doesNotMatch(html, /(?:\/Users\/tingranwang|access_token|Bearer\s+[A-Za-z0-9])/);
  for (const [, attribute, raw] of html.matchAll(/\b(href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:)/.test(raw)) {
      if(attribute==='src') assert.fail(`External page asset ${raw}`);
      continue;
    }
    const url = new URL(raw, `file://${path}`);
    const target = decodeURIComponent(url.pathname);
    assert.ok(target.startsWith(docs+'/'), `Link escapes preview: ${raw}`);
    assert.ok((await stat(target)).isFile(), `Missing file ${raw}`);
    if (url.hash && extname(target)==='.html') {
      const linked = await readFile(target,'utf8');
      const anchor = decodeURIComponent(url.hash.slice(1));
      assert.ok(linked.includes(`id="${anchor}"`), `Missing anchor ${raw}`);
    }
    links++;
  }
}
const home = await readFile(pages[0], 'utf8');
assert.match(home, /<button[^>]*data-download-state="pending"[^>]*disabled/);
for (const field of [release.displayVersion, release.build, release.tag, release.dmgAsset]) assert.ok(home.includes(field), `Missing release identity ${field}`);
assert.equal(pages.length, 6);
console.log(`Checked ${pages.length} bilingual pages, ${links} real local links/assets, pending download gate and release identity.`);
