import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {copyFileSync, mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';

function withStagingFixture(run: (fixture: {root: string; repository: string; script: string; output: string}) => void) {
  const root = mkdtempSync(join(tmpdir(), 'dashboard-frontend-artifacts-'));
  const repository = join(root, 'repository');
  const script = join(repository, 'scripts', 'prepare-frontend.mjs');
  const output = join(repository, 'dist');
  mkdirSync(join(repository, 'scripts'), {recursive: true});
  mkdirSync(join(repository, 'frontend'));
  mkdirSync(output);
  copyFileSync('scripts/prepare-frontend.mjs', script);
  for (const filename of ['index.html', 'styles.css', 'voice-runtime-gate.html']) {
    writeFileSync(join(repository, 'frontend', filename), `fixture ${filename}`);
  }
  try { run({root, repository, script, output}); }
  finally { rmSync(root, {recursive: true, force: true}); }
}

test('frontend staging rejects explicit destinations and unknown arguments before deleting any files', () => {
  withStagingFixture(({root, repository, script, output}) => {
    const unowned = join(root, 'unowned');
    mkdirSync(unowned);
    const sentinels = [join(root, 'ancestor.txt'), join(repository, 'source.txt'), join(unowned, 'keep.txt'), join(output, 'keep.txt')];
    for (const sentinel of sentinels) writeFileSync(sentinel, 'retain me');
    const cases = [['--output', unowned], ['--output', '..'], ['--output', 'frontend'], ['--unexpected'], ['--diagnostic-voice-gate', '--unexpected']];
    for (const args of cases) {
      const result = spawnSync(process.execPath, [script, ...args], {cwd: repository, encoding: 'utf8'});
      assert.notEqual(result.status, 0, `must reject ${args.join(' ')}`);
      assert.match(result.stderr, /Unknown frontend build argument/);
      for (const sentinel of sentinels) assert.equal(readFileSync(sentinel, 'utf8'), 'retain me');
      assert.equal(readFileSync(join(repository, 'frontend', 'index.html'), 'utf8'), 'fixture index.html');
    }
  });
});

test('production frontend staging removes stale diagnostic assets; diagnostic mode opts in', () => {
  withStagingFixture(({repository, script, output}) => {
    writeFileSync(join(output, 'voice-runtime-gate.js'), 'stale diagnostic');
    writeFileSync(join(output, 'voice-runtime-gate.html'), 'stale diagnostic');
    execFileSync(process.execPath, [script], {cwd: repository});
    assert.equal(readFileSync(join(output, 'index.html'), 'utf8'), 'fixture index.html');
    assert.equal(existsSync(join(output, 'voice-runtime-gate.html')), false);
    assert.equal(existsSync(join(output, 'voice-runtime-gate.js')), false);
    execFileSync(process.execPath, [script, '--diagnostic-voice-gate'], {cwd: repository});
    assert.equal(readFileSync(join(output, 'voice-runtime-gate.html'), 'utf8'), 'fixture voice-runtime-gate.html');
  });
});
