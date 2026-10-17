import {execFileSync,spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync,copyFileSync} from 'node:fs';
import {join,resolve,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2);
const outputIndex=args.indexOf('--output');
if(outputIndex<0 || !args[outputIndex+1] || !isAbsolute(args[outputIndex+1])) throw Error('Provide --output /absolute/path/inside.noindex/new-build-directory');
const output=resolve(args[outputIndex+1]);
if(!output.split('/').some(part=>part.endsWith('.noindex'))) throw Error('Candidate output must be inside a .noindex directory');
if(existsSync(output)) throw Error('Candidate output already exists; never overwrite a redistributable build. Advance the release build for changed bytes.');
if(process.platform!=='darwin' || process.arch!=='arm64') throw Error('This candidate requires an Apple Silicon macOS build host');
const run=(command,arguments_,options={})=>{const result=execFileSync(command,arguments_,{cwd:root,encoding:'utf8',...options});return typeof result==='string'?result.trim():'';};
if(run('git',['status','--porcelain','--untracked-files=all'])) throw Error('Commit source changes and preserve unrelated untracked files outside this build worktree before building an identified candidate');
const release=JSON.parse(readFileSync(join(root,'release.json'),'utf8'));
const tauri=JSON.parse(readFileSync(join(root,'src-tauri/tauri.conf.json'),'utf8'));
if(tauri.version!==release.version || tauri.identifier!==release.identifier || tauri.bundle.macOS.bundleVersion!==release.build) throw Error('Release declaration and Tauri metadata differ');
const target=process.env.CARGO_TARGET_DIR;
if(!target || !isAbsolute(target) || !target.split('/').some(part=>part.endsWith('.noindex'))) throw Error('Set CARGO_TARGET_DIR to an absolute external .noindex cache');
mkdirSync(dirname(output),{recursive:true});
mkdirSync(output); // no recursive: never replace an existing candidate
const staging=join(output,'staging');mkdirSync(staging);
const sourceCommit=run('git',['rev-parse','HEAD']);
const manifest={schemaVersion:1,release,sourceCommit,sourceTree:run('git',['rev-parse','HEAD^{tree}']),trackedSourceClean:true,createdAtUtc:new Date().toISOString(),diagnosticVoiceGate:false,signing:'ad-hoc',notarized:false,toolchain:{rustc:run('rustc',['--version']),cargo:run('cargo',['--version']),node:process.version,tauri:run(join(root,'node_modules/.bin/tauri'),['--version'])}};
writeFileSync(join(staging,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const supplementsIndex=args.indexOf('--license-supplements');
const licenseArguments=['scripts/release/collect-runtime-licenses.mjs','--manifest',join(root,'src-tauri/Cargo.toml'),'--output',join(staging,'THIRD_PARTY_LICENSES')];
if(supplementsIndex>=0) licenseArguments.push('--supplements',resolve(args[supplementsIndex+1]));
run(process.execPath,licenseArguments,{stdio:'inherit'});
const config={bundle:{targets:['app','dmg'],macOS:{files:{'Resources/release-manifest.json':join(staging,'release-manifest.json'),'Resources/THIRD_PARTY_LICENSES':join(staging,'THIRD_PARTY_LICENSES')}}}};
const configPath=join(output,'build-config.json');writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
const remaps=[
  [realpathSync(root),'/source/personal-dashboard'],
  [realpathSync(process.env.CARGO_HOME || join(homedir(),'.cargo')),'/cargo'],
  [realpathSync(process.env.RUSTUP_HOME || join(homedir(),'.rustup')),'/rustup'],
  [realpathSync(target),'/build'],
  [target,'/build'],
  [homedir(),'/user'],
];
const env={...process.env,CARGO_ENCODED_RUSTFLAGS:remaps.map(([from,to])=>`--remap-path-prefix=${from}=${to}`).join('\x1f'),PERSONAL_DASHBOARD_SOURCE_COMMIT:sourceCommit};
const log=await import('node:fs').then(fs=>fs.openSync(join(output,'build.log'),'wx'));
console.log(`Building ${release.displayVersion} (${release.build}) from ${sourceCommit}`);
await new Promise((resolve_,reject)=>{
  const child=spawn(join(root,'node_modules/.bin/tauri'),['build','--target',release.target,'--bundles','app,dmg','--config',configPath,'--ci','--','--locked'],{cwd:root,env,stdio:['ignore',log,log]});
  child.once('error',reject);child.once('exit',code=>code===0?resolve_():reject(Error(`Tauri build failed (${code}); inspect ${join(output,'build.log')}`)));
});
const bundle=join(target,release.target,'release/bundle');
const app=join(output,release.appAsset);
run('/usr/bin/ditto',[join(bundle,'macos',release.appAsset),app]);
copyFileSync(join(bundle,'dmg',`${release.productName}_${release.version}_aarch64.dmg`),join(output,release.dmgAsset));
copyFileSync(join(staging,'release-manifest.json'),join(output,'release-manifest.json'));
run(process.execPath,['scripts/release/validate-beta.mjs','--candidate',output],{stdio:'inherit'});
console.log(`Candidate prepared: ${output}`);
