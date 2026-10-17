import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync,lstatSync,readlinkSync} from 'node:fs';
import {join,resolve,relative,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),i=args.indexOf('--candidate');
if(i<0 || !args[i+1]) throw Error('Provide --candidate /absolute/path/inside.noindex/build');
const candidate=resolve(args[i+1]);
if(!candidate.split('/').some(part=>part.endsWith('.noindex'))) throw Error('Only .noindex candidates are accepted');
const manifest=JSON.parse(readFileSync(join(candidate,'release-manifest.json'),'utf8'));
const release=manifest.release;
const app=join(candidate,release.appAsset),dmg=join(candidate,release.dmgAsset),executable=join(app,'Contents/MacOS/personal-dashboard');
const assert=(condition,message)=>{if(!condition) throw Error(message);};
const run=(command,arguments_)=>execFileSync(command,arguments_,{encoding:'utf8'}).trim();
const combined=(command,arguments_)=>{const r=spawnSync(command,arguments_,{encoding:'utf8'});if(r.status!==0) throw Error(r.stderr||r.stdout);return r.stdout+r.stderr;};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const privatePathMarkers=['/Users/','/private/tmp/','/tmp/pdbeta'].flatMap(value=>{
  const utf16=Buffer.from(value,'utf16le');
  return [Buffer.from(value),utf16,Buffer.from(utf16).swap16()];
});
const assertNoPrivatePath=(bytes,label)=>assert(privatePathMarkers.every(marker=>!bytes.includes(marker)),`Private path in ${label}`);
const inventory=directory=>{
  const rows=[];
  const walk=path=>{for(const name of readdirSync(path).sort()) {const full=join(path,name),st=lstatSync(full),path_=relative(directory,full);if(st.isSymbolicLink()) rows.push({path:path_,symlink:readlinkSync(full)});else if(st.isDirectory()) walk(full);else rows.push({path:path_,size:st.size,mode:st.mode&0o777,sha256:sha(readFileSync(full))});}};
  walk(directory);return rows;
};
assert(/^[a-f0-9]{40}$/.test(manifest.sourceCommit),'Missing exact source commit');
assert(manifest.trackedSourceClean===true && manifest.diagnosticVoiceGate===false,'Candidate source/feature status is invalid');
const embedded=JSON.parse(readFileSync(join(app,'Contents/Resources/release-manifest.json'),'utf8'));
assert(JSON.stringify(embedded)===JSON.stringify(manifest),'Signed resource manifest differs from candidate manifest');
const plist=JSON.parse(run('/usr/bin/plutil',['-convert','json','-o','-',join(app,'Contents/Info.plist')]));
for(const [key,value] of Object.entries({CFBundleIdentifier:release.identifier,CFBundleShortVersionString:release.version,CFBundleVersion:release.build,LSMinimumSystemVersion:release.minimumSystemVersion})) assert(plist[key]===value,`${key} differs from the declaration`);
assert(lstatSync(executable).mode&0o111,'Main executable is not executable');
assert(readFileSync(executable).includes(Buffer.from(manifest.sourceCommit)),'Compiled source identity differs from the signed manifest');
const architectures=run('/usr/bin/lipo',['-archs',executable]);assert(architectures==='arm64','Candidate must contain exactly arm64');
const dynamicDependencies=run('/usr/bin/otool',['-L',executable]).split('\n').slice(1).map(line=>line.trim().split(' ')[0]);
assert(dynamicDependencies.every(path=>path.startsWith('/System/Library/') || path.startsWith('/usr/lib/')),'Non-system dynamic dependency requires an explicit distribution decision');
run('/usr/bin/codesign',['--verify','--deep','--strict',app]);
const signature=combined('/usr/bin/codesign',['-d','--verbose=4',app]);
assert(signature.includes('Signature=adhoc') && signature.includes(`Identifier=${release.identifier}`),'Expected the stable identity with ad-hoc signature');
assert(signature.includes('runtime'),'Hardened runtime signature flag is absent');
const rows=inventory(app);
const forbiddenNames=/(^|\/)(codex(-[^/]*)?|node_modules|\.scratch|auth\.json|collaboration-state\.json|voice-runtime-gate\.(html|js))($|\/)/i;
for(const row of rows) {
  assert(!forbiddenNames.test(row.path),`Unexpected bundled data/runtime: ${row.path}`);
  if(row.symlink) continue;
  const bytes=readFileSync(join(app,row.path));
  assertNoPrivatePath(bytes,row.path);
  for(const marker of ['/Users/','/private/tmp/','/tmp/pdbeta','voice-runtime-gate.html','voice-runtime-gate.js','collaboration_voice_runtime_gate','collaboration_voice_gate_fixture']) {
    assert(!bytes.includes(Buffer.from(marker)),`Private build path or diagnostic residual ${marker} in ${row.path}`);
  }
}
const licenses=JSON.parse(readFileSync(join(app,'Contents/Resources/THIRD_PARTY_LICENSES/runtime-dependencies.json'),'utf8'));
assert(licenses.target===release.target && licenses.crates.length>0,'Runtime license inventory is absent or wrong-target');
for(const crate of licenses.crates) {
  assert(crate.documents.length>0,`Missing license documents for ${crate.name}`);
  for(const document of crate.documents) assert(sha(readFileSync(join(app,'Contents/Resources/THIRD_PARTY_LICENSES',document.path)))===document.sha256,`License hash mismatch for ${crate.name}`);
}
run('/usr/bin/hdiutil',['verify',dmg]);
const mount=join(candidate,'mount.noindex');mkdirSync(mount,{recursive:true});
let mounted=false;
let dmgEntries=[];
try {
  run('/usr/bin/hdiutil',['attach','-readonly','-nobrowse','-mountpoint',mount,dmg]);mounted=true;
  dmgEntries=readdirSync(mount).sort();
  const allowedEntries=new Set([release.appAsset,'Applications','.DS_Store','.VolumeIcon.icns','.background','.fseventsd','.Trashes','.Spotlight-V100','.TemporaryItems']);
  assert(dmgEntries.every(name=>allowedEntries.has(name)),'Unexpected content outside the App in the DMG');
  for(const row of inventory(mount).filter(row=>!row.path.startsWith(`${release.appAsset}/`) && !row.symlink)) assertNoPrivatePath(readFileSync(join(mount,row.path)),`DMG ${row.path}`);
  assert(readlinkSync(join(mount,'Applications'))==='/Applications','DMG Applications drag target is missing');
  const mountedApp=join(mount,release.appAsset);
  run('/usr/bin/codesign',['--verify','--deep','--strict',mountedApp]);
  assert(JSON.stringify(inventory(mountedApp))===JSON.stringify(rows),'Mounted DMG App differs from the standalone candidate');
} finally {
  if(mounted) run('/usr/bin/hdiutil',['detach',mount]);
}
const executableSha256=sha(readFileSync(executable)),dmgSha256=sha(readFileSync(dmg));
const appInventorySha256=sha(JSON.stringify(rows));
writeFileSync(join(candidate,'app-inventory.json'),JSON.stringify(rows,null,2)+'\n');
writeFileSync(join(candidate,release.checksumAsset),`${dmgSha256}  ${release.dmgAsset}\n`);
const report={schemaVersion:1,sourceCommit:manifest.sourceCommit,release,checkedAtUtc:new Date().toISOString(),host:{system:run('/usr/bin/sw_vers',['-productVersion']),build:run('/usr/bin/sw_vers',['-buildVersion']),architecture:run('/usr/bin/uname',['-m'])},checks:{bundleMetadata:'passed',architecture:'passed',dynamicDependencies:'passed',adHocSignature:'passed',privatePathAndDiagnosticScan:'passed',licenseDocuments:'passed',readOnlyDmgMount:'passed',applicationsLink:'passed',mountedAppMatchesCandidate:'passed'},dynamicDependencies,dmgEntries,licenseCrates:licenses.crates.length,hashes:{executableSha256,appInventorySha256,dmgSha256,licenseManifestSha256:sha(readFileSync(join(app,'Contents/Resources/THIRD_PARTY_LICENSES/runtime-dependencies.json')))},notRun:['fresh macOS user installation (accepted deferral)','independent ChatGPT login (accepted deferral)','Internet-quarantine Gatekeeper installation','lower macOS runtime acceptance','replacement installation and data continuity','real model, microphone and automatic morning planning']};
writeFileSync(join(candidate,'package-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
