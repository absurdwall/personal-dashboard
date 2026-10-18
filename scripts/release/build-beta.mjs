import {execFileSync,spawn} from 'node:child_process';
import {readFileSync,writeFileSync,appendFileSync,existsSync,realpathSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {prepareCandidateDirectories} from './candidate-paths.mjs';

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
const prepared=prepareCandidateDirectories({sourceDirectory:root,outputDirectory:output,cacheDirectory:target});
const staging=prepared.stagingDirectory;
const sourceCommit=run('git',['rev-parse','HEAD']);
const rustcVerbose=run('rustc',['--version','--verbose']);
const rustcCommit=/^commit-hash: ([a-f0-9]{40})$/m.exec(rustcVerbose)?.[1];
if(!rustcCommit) throw Error('Rust toolchain must report its exact source commit');
const manifest={schemaVersion:1,release,sourceCommit,sourceTree:run('git',['rev-parse','HEAD^{tree}']),trackedSourceClean:true,createdAtUtc:new Date().toISOString(),diagnosticVoiceGate:false,signing:'ad-hoc',notarized:false,toolchain:{rustc:run('rustc',['--version']),rustcCommit,cargo:run('cargo',['--version']),node:process.version,tauri:run(join(root,'node_modules/.bin/tauri'),['--version'])}};
const supplementsIndex=args.indexOf('--license-supplements');
const licenseArguments=['scripts/release/collect-runtime-licenses.mjs','--manifest',join(root,'src-tauri/Cargo.toml'),'--output',join(staging,'THIRD_PARTY_LICENSES')];
licenseArguments.push('--supplements',supplementsIndex>=0?resolve(args[supplementsIndex+1]):join(root,'release/license-supplements'));
run(process.execPath,licenseArguments,{stdio:'inherit'});
const runtimeNoticeDirectory=join(staging,'THIRD_PARTY_LICENSES/rust-standard-library');
run(process.execPath,['scripts/release/collect-toolchain-notices.mjs','--output',runtimeNoticeDirectory,'--target',release.target],{stdio:'inherit'});
const runtimeNotices=JSON.parse(readFileSync(join(runtimeNoticeDirectory,'manifest.json'),'utf8'));
if(runtimeNotices.rustcCommit!==rustcCommit || runtimeNotices.rustcVersion!==manifest.toolchain.rustc) throw Error('Rust runtime notices differ from the selected compiler');
const digest=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
manifest.licenses={cargoInventorySha256:digest(join(staging,'THIRD_PARTY_LICENSES/runtime-dependencies.json')),rustRuntimeInventorySha256:digest(join(runtimeNoticeDirectory,'manifest.json'))};
writeFileSync(join(staging,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
appendFileSync(join(staging,'THIRD_PARTY_LICENSES/ACKNOWLEDGMENTS.md'),'\n## Rust standard-library runtime\n\nThe toolchain runtime is separate from the application Cargo dependency closure. Its upstream standard-library notice corpus may include other-target/build entries and is not an exact Darwin object census. [Runtime notice manifest](rust-standard-library/manifest.json), [upstream standard-library notices](rust-standard-library/COPYRIGHT-library.html), and [exact-commit compiler-builtins terms](rust-standard-library/compiler-builtins/LICENSE.txt) are included with full license texts.\n');

const config={bundle:{targets:['app','dmg'],macOS:{files:{'Resources/release-manifest.json':join(staging,'release-manifest.json'),'Resources/THIRD_PARTY_LICENSES':join(staging,'THIRD_PARTY_LICENSES')}}}};
const configPath=join(output,'build-config.json');writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
const remaps=[
  [realpathSync(root),'/source/personal-dashboard'],
  [realpathSync(process.env.CARGO_HOME || join(homedir(),'.cargo')),'/cargo'],
  [realpathSync(process.env.RUSTUP_HOME || join(homedir(),'.rustup')),'/rustup'],
  [prepared.cacheDirectory,'/build'],
  [target,'/build'],
  [homedir(),'/user'],
];
const env={...process.env,CARGO_TARGET_DIR:prepared.cacheDirectory,CARGO_ENCODED_RUSTFLAGS:remaps.map(([from,to])=>`--remap-path-prefix=${from}=${to}`).join('\x1f'),PERSONAL_DASHBOARD_SOURCE_COMMIT:sourceCommit};
// This local candidate must not inherit distribution signing/notarization credentials.
for(const key of ['APPLE_ID','APPLE_PASSWORD','APPLE_TEAM_ID','APPLE_API_KEY','APPLE_API_ISSUER','APPLE_API_KEY_PATH','APPLE_CERTIFICATE','APPLE_CERTIFICATE_PASSWORD']) delete env[key];
env.APPLE_SIGNING_IDENTITY='-';
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
