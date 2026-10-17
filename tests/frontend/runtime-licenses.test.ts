import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { collectRuntimeLicenses } from '../../scripts/release/collect-runtime-licenses.mjs';

const mit = 'Copyright 2026 Example authors.\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction.\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.';
function fixture(t: any) {
  const directory = mkdtempSync(path.join(tmpdir(), 'runtime-licenses-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const packages: any[] = [];
  const nodes: any[] = [];
  function pkg(name: string, dependencies: any[] = [], kind = 'lib', license = 'MIT') {
    const id = `${name}@1.0.0`;
    const source = path.join(directory, name); mkdirSync(source);
    writeFileSync(path.join(source, 'Cargo.toml'), '');
    writeFileSync(path.join(source, 'LICENSE-MIT'), mit);
    packages.push({ id, name, version: '1.0.0', license, source: name === 'app' ? null : 'registry+https://github.com/rust-lang/crates.io-index', manifest_path: path.join(source, 'Cargo.toml'), targets: [{kind: [kind]}] });
    nodes.push({ id, deps: dependencies }); return id;
  }
  function dep(name: string, kind: string | null = null) { return { pkg: `${name}@1.0.0`, dep_kinds: [{kind, target: null}] }; }
  return { directory, pkg, dep, metadata: { packages, resolve: { root: 'app@1.0.0', nodes } }, outputDirectory: path.join(directory, 'output') };
}

test('public bundle contains only target-filtered normal runtime closure and real license text', (t) => {
  const f = fixture(t);
  f.pkg('app', [f.dep('runtime'), f.dep('builder', 'build'), f.dep('tester', 'dev'), f.dep('derive')]);
  f.pkg('runtime', [f.dep('shared')]); f.pkg('shared');
  f.pkg('builder', [f.dep('build-child')]); f.pkg('build-child'); f.pkg('tester');
  f.pkg('derive', [f.dep('macro-child')], 'proc-macro'); f.pkg('macro-child');
  const result = collectRuntimeLicenses(f);
  assert.deepEqual(result.crates.map((c: any) => c.name), ['runtime', 'shared']);
  assert.equal(readFileSync(path.join(f.outputDirectory, result.crates[0].documents[0].path), 'utf8'), mit);
  assert.equal(JSON.stringify(result).includes(f.directory), false);
  assert.equal(readFileSync(path.join(f.outputDirectory, 'ACKNOWLEDGMENTS.md'), 'utf8').includes(f.directory), false);
});

test('collector fails closed when an AND license obligation has only one license text', (t) => {
  const f = fixture(t); f.pkg('app', [f.dep('unicode-data')]);
  f.pkg('unicode-data', [], 'lib', '(MIT OR Apache-2.0) AND Unicode-3.0');
  assert.throws(() => collectRuntimeLicenses(f), /Missing required license text.*unicode-data/);
});

test('bundle retains nested license assets and NOTICE and is byte deterministic', (t) => {
  const f = fixture(t); f.pkg('app', [f.dep('runtime')]); f.pkg('runtime');
  const directory = path.join(f.directory, 'runtime');
  mkdirSync(path.join(directory, 'assets'));
  writeFileSync(path.join(directory, 'assets', 'LICENSE-UNICODE'), 'UNICODE LICENSE V3\nPermission is hereby granted.\nTHE DATA FILES AND SOFTWARE ARE PROVIDED AS IS.');
  writeFileSync(path.join(directory, 'NOTICE'), 'Upstream attribution, preserved verbatim.');
  const first = collectRuntimeLicenses(f);
  const second = collectRuntimeLicenses({ ...f, outputDirectory: path.join(f.directory, 'second') });
  assert.deepEqual(first, second);
  assert.deepEqual(first.crates[0].documents.map((doc: any) => doc.sourcePath), ['assets/LICENSE-UNICODE', 'LICENSE-MIT', 'NOTICE']);
  assert.equal(readFileSync(path.join(f.outputDirectory, 'runtime-dependencies.json'), 'utf8'), readFileSync(path.join(f.directory, 'second', 'runtime-dependencies.json'), 'utf8'));
});

test('a missing full license leaves no partial output', (t) => {
  const f = fixture(t); f.pkg('app', [f.dep('runtime')]); f.pkg('runtime');
  writeFileSync(path.join(f.directory, 'runtime', 'LICENSE-MIT'), 'Licensed under MIT.');
  assert.throws(() => collectRuntimeLicenses(f), /Missing required license text/);
  assert.equal(existsSync(f.outputDirectory), false);
});

test('exact-version supplements verify VCS identity and hashes and publish their source provenance', (t) => {
  const f = fixture(t); f.pkg('app', [f.dep('runtime')]); f.pkg('runtime');
  writeFileSync(path.join(f.directory, 'runtime', 'LICENSE-MIT'), 'Licensed under MIT.');
  const commit = 'a'.repeat(40);
  writeFileSync(path.join(f.directory, 'runtime', '.cargo_vcs_info.json'), JSON.stringify({git: {sha1: commit}}));
  const supplementsDirectory = path.join(f.directory, 'supplements');
  const directory = path.join(supplementsDirectory, 'runtime-1.0.0'); mkdirSync(directory, {recursive: true});
  writeFileSync(path.join(directory, 'LICENSE-MIT.txt'), mit);
  const provenance = { name: 'runtime', version: '1.0.0', license: 'MIT', commit, documents: [{ file: 'LICENSE-MIT.txt', sourcePath: 'LICENSE-MIT.txt', url: `https://example.test/project/${commit}/LICENSE-MIT`, sha256: createHash('sha256').update(mit).digest('hex') }] };
  writeFileSync(path.join(directory, 'provenance.json'), JSON.stringify(provenance));
  const result = collectRuntimeLicenses({...f, supplementsDirectory});
  const document = result.crates[0].documents.find((doc: any) => doc.origin === 'upstream');
  assert.equal(document.url, `https://example.test/project/${commit}/LICENSE-MIT`);
  assert.equal(document.commit, commit);
  writeFileSync(path.join(directory, 'LICENSE-MIT.txt'), 'different content');
  assert.throws(() => collectRuntimeLicenses({...f, supplementsDirectory, outputDirectory: path.join(f.directory, 'invalid')}), /Supplement checksum mismatch/);
  provenance.commit = 'b'.repeat(40);
  writeFileSync(path.join(directory, 'provenance.json'), JSON.stringify(provenance));
  assert.throws(() => collectRuntimeLicenses({...f, supplementsDirectory, outputDirectory: path.join(f.directory, 'invalid')}), /Supplement commit mismatch/);
});

test('a license directory carries its named Unicode terms into the public bundle', (t) => {
  const f = fixture(t); f.pkg('app', [f.dep('unicode-data')]);
  f.pkg('unicode-data', [], 'lib', 'MIT AND Unicode-3.0');
  mkdirSync(path.join(f.directory, 'unicode-data', 'LICENSES'));
  writeFileSync(path.join(f.directory, 'unicode-data', 'LICENSES', 'Unicode-3.0.txt'), 'UNICODE LICENSE V3\nPermission is hereby granted.\nTHE DATA FILES AND SOFTWARE ARE PROVIDED AS IS.');
  const result = collectRuntimeLicenses(f);
  assert.equal(result.crates[0].documents.some((doc: any) => doc.sourcePath === 'LICENSES/Unicode-3.0.txt'), true);
});
