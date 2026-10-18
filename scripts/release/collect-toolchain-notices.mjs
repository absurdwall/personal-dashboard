import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const commonTerms=['MIT','Apache-2.0','Unicode-3.0','BSD-2-Clause','LLVM-exception'];

/** Public package preparation: preserve the installed toolchain's official runtime notice corpus. */
export function collectToolchainRuntimeNotices({sysroot,rustcVersion,rustcCommit,host,target,outputDirectory,supplementsDirectory}){
  if(!path.isAbsolute(outputDirectory))throw Error('Runtime notice output must be absolute');
  const pending=[];
  for(const relativePath of ['COPYRIGHT-library.html',...commonTerms.map(name=>`licenses/${name}.txt`)]){
    let bytes;try {bytes=fs.readFileSync(path.join(sysroot,'share/doc/rust',relativePath));}catch{throw Error(`Required Rust runtime notice is unavailable: ${relativePath}`);}
    if(!bytes.toString('utf8').trim())throw Error(`Required Rust runtime notice is empty: ${relativePath}`);
    pending.push({path:relativePath,bytes,origin:'installed Rust toolchain',sourceRelativePath:`share/doc/rust/${relativePath}`});
  }
  let provenance;try {provenance=JSON.parse(fs.readFileSync(path.join(supplementsDirectory,'provenance.json'),'utf8'));}catch{throw Error('Exact-commit compiler-builtins runtime notice provenance is unavailable');}
  if(provenance.rustcCommit!==rustcCommit)throw Error('Compiler-builtins notice commit differs from the selected Rust toolchain commit');
  const sourceUrl=`https://raw.githubusercontent.com/rust-lang/rust/${rustcCommit}/library/compiler-builtins/LICENSE.txt`;
  if(provenance.sourceUrl!==sourceUrl || provenance.file!=='compiler-builtins-LICENSE.txt')throw Error('Compiler-builtins notice requires its exact official Rust source URL');
  const builtins=fs.readFileSync(path.join(supplementsDirectory,provenance.file));
  if(!builtins.toString('utf8').trim() || hash(builtins)!==provenance.sha256)throw Error('Compiler-builtins runtime notice checksum mismatch');
  pending.push({path:'compiler-builtins/LICENSE.txt',bytes:builtins,origin:'exact Rust source commit',sourceUrl});
  const manifest={schemaVersion:1,rustcVersion,rustcCommit,host,target,compilerBuiltinsVersion:provenance.compilerBuiltinsVersion,scope:'Unmodified upstream Rust standard-library notice corpus, including notices for other targets or build steps; not an exact target-only dependency census. Separate from the application Cargo runtime dependency closure. Compiler-builtins notice is bound to the selected Rust source commit.',documents:pending.map(({bytes,...document})=>({...document,bytes:bytes.length,sha256:hash(bytes)}))};
  if(fs.existsSync(outputDirectory)&&fs.readdirSync(outputDirectory).length)throw Error('Runtime notice output must be empty');
  // Check every upstream file and identity before leaving any partial output.
  for(const document of pending){const destination=path.join(outputDirectory,document.path);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,document.bytes);}
  fs.writeFileSync(path.join(outputDirectory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    const args=process.argv.slice(2),options=new Map();for(let i=0;i<args.length;i+=2){if(!['--output','--target'].includes(args[i])||!args[i+1])throw Error('Use --output ABSOLUTE_DIRECTORY --target TARGET');options.set(args[i],args[i+1]);}
    const run=args=>execFileSync('rustc',args,{encoding:'utf8'}).trim();
    const verbose=run(['--version','--verbose']);
    const rustcCommit=/^commit-hash: ([a-f0-9]{40})$/m.exec(verbose)?.[1],host=/^host: (.+)$/m.exec(verbose)?.[1];
    if(!rustcCommit||!host)throw Error('Selected Rust compiler did not report an exact source commit and host');
    const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
    const result=collectToolchainRuntimeNotices({sysroot:run(['--print','sysroot']),rustcVersion:run(['--version']),rustcCommit,host,target:options.get('--target'),outputDirectory:options.get('--output'),supplementsDirectory:path.join(root,'release/rust-runtime',rustcCommit)});
    console.log(`Collected ${result.documents.length} Rust runtime notice documents for ${rustcCommit}.`);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
