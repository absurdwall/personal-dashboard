import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,readdirSync,readFileSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {prepareCandidateDirectories} from '../../scripts/release/candidate-paths.mjs';

function fixture(t:any){const outer=mkdtempSync(join(tmpdir(),'beta-preparation-'));const root=join(outer,'candidate.noindex');mkdirSync(root);t.after(()=>rmSync(outer,{recursive:true,force:true}));const sourceDirectory=join(root,'source');mkdirSync(sourceDirectory);return {sourceDirectory,outputDirectory:join(root,'candidates','build'),cacheDirectory:join(root,'fresh-cache','target')};}

test('package preparation creates a fresh empty external cache and resolves it before staging',t=>{
  const f=fixture(t);const prepared=prepareCandidateDirectories(f);
  assert.equal(prepared.cacheDirectory,realpathSync(f.cacheDirectory));
  assert.deepEqual(readdirSync(f.cacheDirectory),[]);
  assert.ok(existsSync(join(f.outputDirectory,'staging')));
});
test('an unusable cache does not consume the never-overwrite candidate directory',t=>{
  const f=fixture(t);mkdirSync(join(f.cacheDirectory,'..'),{recursive:true});writeFileSync(f.cacheDirectory,'retain existing file');
  assert.throws(()=>prepareCandidateDirectories(f),/cache.*directory/i);
  assert.equal(existsSync(f.outputDirectory),false);assert.equal(readFileSync(f.cacheDirectory,'utf8'),'retain existing file');
});
test('an existing candidate remains byte-identical and does not create another cache',t=>{
  const f=fixture(t);mkdirSync(f.outputDirectory,{recursive:true});writeFileSync(join(f.outputDirectory,'receipt'),'retain');
  assert.throws(()=>prepareCandidateDirectories(f),/already exists/i);
  assert.equal(readFileSync(join(f.outputDirectory,'receipt'),'utf8'),'retain');assert.equal(existsSync(f.cacheDirectory),false);
});
