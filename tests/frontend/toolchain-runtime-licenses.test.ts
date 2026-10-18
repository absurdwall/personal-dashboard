import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {collectToolchainRuntimeNotices} from '../../scripts/release/collect-toolchain-notices.mjs';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
function fixture(t:any){
  const root=mkdtempSync(join(tmpdir(),'rust-runtime-notices-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const sysroot=join(root,'private-toolchain'),supplementsDirectory=join(root,'runtime-source');mkdirSync(join(sysroot,'share/doc/rust/licenses'),{recursive:true});mkdirSync(supplementsDirectory);
  writeFileSync(join(sysroot,'share/doc/rust/COPYRIGHT-library.html'),'<h1>Copyright notices for The Rust Standard Library</h1>Fixture source notice.');
  for(const name of ['MIT','Apache-2.0','Unicode-3.0','BSD-2-Clause','LLVM-exception'])writeFileSync(join(sysroot,'share/doc/rust/licenses',name+'.txt'),'Fixture upstream '+name+' terms.');
  const rustcCommit='a'.repeat(40),builtins='Fixture upstream compiler-builtins full terms.';
  writeFileSync(join(supplementsDirectory,'compiler-builtins-LICENSE.txt'),builtins);
  writeFileSync(join(supplementsDirectory,'provenance.json'),JSON.stringify({rustcCommit,compilerBuiltinsVersion:'0.1.160',file:'compiler-builtins-LICENSE.txt',sha256:hash(builtins),sourceUrl:`https://raw.githubusercontent.com/rust-lang/rust/${rustcCommit}/library/compiler-builtins/LICENSE.txt`}));
  return {sysroot,supplementsDirectory,rustcCommit,rustcVersion:'rustc fixture',host:'aarch64-apple-darwin',target:'aarch64-apple-darwin',outputDirectory:join(root,'output')};
}
test('toolchain runtime corpus preserves official bytes and exact compiler-builtins provenance without private paths',t=>{
  const f=fixture(t),result=collectToolchainRuntimeNotices(f);
  assert.equal(result.rustcCommit,f.rustcCommit);assert.equal(result.compilerBuiltinsVersion,'0.1.160');assert.equal(result.documents.length,7);
  assert.match(result.scope,/not an exact target-only dependency census/);
  for(const doc of result.documents)assert.equal(createHash('sha256').update(readFileSync(join(f.outputDirectory,doc.path))).digest('hex'),doc.sha256);
  assert.equal(JSON.stringify(result).includes(f.sysroot),false);
  assert.equal(readFileSync(join(f.outputDirectory,'COPYRIGHT-library.html'),'utf8'),readFileSync(join(f.sysroot,'share/doc/rust/COPYRIGHT-library.html'),'utf8'));
});
test('missing required upstream runtime notice fails without partial output',t=>{
  const f=fixture(t);rmSync(join(f.sysroot,'share/doc/rust/licenses/Unicode-3.0.txt'));
  assert.throws(()=>collectToolchainRuntimeNotices(f),/runtime notice/);assert.equal(existsSync(f.outputDirectory),false);
});
test('compiler-builtins supplement must match the actual Rust source commit',t=>{
  const f=fixture(t);assert.throws(()=>collectToolchainRuntimeNotices({...f,rustcCommit:'b'.repeat(40)}),/commit/);assert.equal(existsSync(f.outputDirectory),false);
});
