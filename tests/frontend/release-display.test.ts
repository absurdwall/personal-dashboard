import assert from 'node:assert/strict';
import test from 'node:test';
import {probe} from './helpers/complete-page.ts';

test('Settings displays the native release identity after startup', {skip:process.platform!=='darwin'}, () => {
  const result=probe(960, `return JSON.stringify({version:document.querySelector('[data-release-version]')?.textContent});`, false, 720, {
    application_identity:{productName:'Personal Dashboard',displayVersion:'1.0.0 Beta 1',build:'5.0.1',sourceCommit:'0123456789abcdef'},
  });
  assert.equal(result.version,'1.0.0 Beta 1 · 5.0.1');
});
