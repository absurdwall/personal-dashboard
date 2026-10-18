// Inspect the actual local publication boundary, including real local files.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args=process.argv.slice(2);
assert.ok(args.length===0 || (args.length===2 && args[0]==='--directory'), 'Use --directory <staged-public-site>');
const docs = args.length ? resolve(args[1]) : resolve(root, 'docs');
const release = JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8'));
const releaseBase=`https://github.com/absurdwall/personal-dashboard/releases/download/${release.tag}/`;
const allowedReleaseLinks=new Set([releaseBase+release.dmgAsset,releaseBase+release.checksumAsset,`https://github.com/absurdwall/personal-dashboard/releases/tag/${release.tag}`]);
const candidate=JSON.parse(await readFile(resolve(root,`docs/releases/beta-1/candidate-${release.build}.json`),'utf8'));
const pages = [resolve(docs, 'index.html'), ...(await readdir(resolve(docs, 'guide'))).filter(n=>n.endsWith('.html')).map(n=>resolve(docs,'guide',n))];
let links = 0;
for (const path of pages) {
  const html = await readFile(path, 'utf8');
  assert.match(html, /data-language="zh"/);
  assert.match(html, /data-language="en"/);
  assert.match(html, /name="viewport"/);
  assert.doesNotMatch(html, /\/releases\/latest(?:[\/#?]|$)/);
  assert.doesNotMatch(html, /(?:\/Users\/tingranwang|access_token|Bearer\s+[A-Za-z0-9])/);
  for (const [, attribute, raw] of html.matchAll(/\b(href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:)/.test(raw)) {
      if(/^https?:\/\/[^/]+\/[^/]+\/[^/]+\/releases\//.test(raw)) assert.ok(allowedReleaseLinks.has(raw), `Non-versioned or unexpected release link ${raw}`);
      if(attribute==='src') assert.fail(`External page asset ${raw}`);
      continue;
    }
    assert.ok(!raw.startsWith('/'), `Root-relative link loses project prefix: ${raw}`);
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
assert.match(home, /<a[^>]*data-download-state="available"[^>]*href="([^"]+)"/);
assert.ok(home.includes(`href="${releaseBase+release.dmgAsset}"`), 'Missing exact DMG download');
assert.ok(home.includes(`href="${releaseBase+release.checksumAsset}"`), 'Missing exact checksums download');
assert.ok(home.includes(candidate.packageValidation.hashes.dmgSha256), 'Missing actual candidate DMG hash');
assert.doesNotMatch(home, /data-download-state="pending"|Downloads await approval|下载尚未开放/);
for (const field of [release.displayVersion, release.build, release.tag, release.dmgAsset]) assert.ok(home.includes(field), `Missing release identity ${field}`);
assert.equal(pages.length, 6);
console.log(`Checked ${pages.length} bilingual pages, ${links} real local links/assets, exact-version downloads, candidate hash and release identity.`);
