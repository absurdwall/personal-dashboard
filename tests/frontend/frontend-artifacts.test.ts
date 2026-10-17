import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';

test('production frontend staging removes stale diagnostic assets; diagnostic mode opts in',()=>{
  const output=mkdtempSync(join(tmpdir(),'dashboard-frontend-artifacts-'));
  try {
    writeFileSync(join(output,'voice-runtime-gate.js'),'stale diagnostic');
    execFileSync(process.execPath,['scripts/prepare-frontend.mjs','--output',output]);
    assert.ok(existsSync(join(output,'index.html')));
    assert.equal(existsSync(join(output,'voice-runtime-gate.html')),false);
    assert.equal(existsSync(join(output,'voice-runtime-gate.js')),false);
    execFileSync(process.execPath,['scripts/prepare-frontend.mjs','--output',output,'--diagnostic-voice-gate']);
    assert.ok(existsSync(join(output,'voice-runtime-gate.html')));
  } finally {rmSync(output,{recursive:true,force:true});}
});
