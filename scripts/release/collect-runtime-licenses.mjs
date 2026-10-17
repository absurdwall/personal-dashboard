#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const target = 'aarch64-apple-darwin';
const documentName = /^(?:licen[sc]e|copying|notice|copyright)(?:$|[._-])/i;
const digest = (data) => createHash('sha256').update(data).digest('hex');
const slash = (value) => value.split(path.sep).join('/');
function documentsIn(directory, relative = '', licenseDirectory = false) {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .flatMap((entry) => {
      const name = path.join(relative, entry.name);
      if (entry.isDirectory() && !['.git', 'target', 'node_modules'].includes(entry.name)) return documentsIn(directory, name, licenseDirectory || /^licen[sc]es?$/i.test(entry.name));
      return entry.isFile() && (licenseDirectory || documentName.test(entry.name)) ? [name] : [];
    });
}
function normalRuntimePackages(metadata) {
  const packages = new Map(metadata.packages.map((pkg) => [pkg.id, pkg]));
  const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
  if (!metadata.resolve.root) throw new Error('Cargo metadata must resolve one root application');
  const visited = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    if (!packages.has(id) || !nodes.has(id)) throw new Error(`Incomplete Cargo resolve graph: ${id}`);
    visited.add(id);
    for (const dependency of nodes.get(id).deps) {
      const pkg = packages.get(dependency.pkg);
      if (!pkg) throw new Error('Incomplete Cargo package metadata');
      if (dependency.dep_kinds.some((kind) => kind.kind === null) && !pkg.targets.some((entry) => entry.kind.includes('proc-macro'))) visit(dependency.pkg);
    }
  }
  visit(metadata.resolve.root);
  visited.delete(metadata.resolve.root);
  return [...visited].map((id) => packages.get(id)).sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`, 'en'));
}

// Recognize complete license bodies, never a README badge or an SPDX label alone.
const licenseBodies = {
  MIT: (text) => /permission is hereby granted, free of charge/i.test(text) && /the software is provided [“"]as is/i.test(text),
  'Apache-2.0': (text) => /apache license/i.test(text) && /version 2\.0/i.test(text) && /terms and conditions for use, reproduction/i.test(text),
  'Unicode-3.0': (text) => /unicode license v3/i.test(text) && /permission is hereby granted/i.test(text) && /data files and software are provided/i.test(text),
  'BSD-3-Clause': (text) => /redistribution and use in source and binary forms/i.test(text) && /neither the name/i.test(text) && /this software is provided/i.test(text),
  'MPL-2.0': (text) => /mozilla public license/i.test(text) && /2\.0/.test(text) && /definitions/i.test(text) && /exhibit a/i.test(text),
  Zlib: (text) => /origin of this software must not be misrepresented/i.test(text) && /altered source versions/i.test(text) && /this notice may not be removed/i.test(text),
  Unlicense: (text) => /free and unencumbered software released into the public domain/i.test(text) && /the software is provided/i.test(text),
  '0BSD': (text) => /permission to use, copy, modify, and\/or distribute/i.test(text) && /the software is provided/i.test(text),
  'MIT-0': (text) => /mit no attribution/i.test(text) && /permission is hereby granted/i.test(text),
  'CC0-1.0': (text) => /creative commons/i.test(text) && /universal/i.test(text) && /waiver/i.test(text),
};
function licenseSatisfied(expression, documents) {
  const text = documents.map((doc) => doc.contents.toString('utf8')).join('\n').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const tokens = expression.replaceAll('/', ' OR ').match(/\(|\)|AND|OR|[A-Za-z0-9.-]+/g) ?? [];
  let index = 0;
  function primary() {
    if (tokens[index] === '(') { index++; const result = or(); if (tokens[index++] !== ')') throw new Error('Invalid license expression'); return result; }
    const token = tokens[index++];
    if (!licenseBodies[token]) throw new Error(`Unsupported license expression token: ${token}`);
    return licenseBodies[token](text);
  }
  function and() { let value = primary(); while (tokens[index] === 'AND') { index++; const right = primary(); value = value && right; } return value; }
  function or() { let value = and(); while (tokens[index] === 'OR') { index++; const right = and(); value = value || right; } return value; }
  const result = or(); if (index !== tokens.length) throw new Error('Invalid license expression'); return result;
}

/** Metadata must come from cargo metadata --locked --offline --filter-platform aarch64-apple-darwin. */
export function collectRuntimeLicenses({ metadata, outputDirectory, supplementsDirectory }) {
  if (!path.isAbsolute(outputDirectory)) throw new Error('License output directory must be absolute');
  const crates = [];
  const pending = [];
  for (const pkg of normalRuntimePackages(metadata)) {
    const directory = path.dirname(pkg.manifest_path);
    if (!pkg.license && !pkg.license_file) throw new Error(`No declared license for ${pkg.name}@${pkg.version}`);
    const names = documentsIn(directory);
    if (pkg.license_file && !names.includes(pkg.license_file)) names.push(pkg.license_file);
    const documents = names.map((name) => {
      const absolute = path.resolve(directory, name);
      if (!absolute.startsWith(`${directory}${path.sep}`)) throw new Error(`License asset outside package: ${pkg.name}`);
      return { contents: fs.readFileSync(absolute), sourcePath: slash(name), origin: 'crate' };
    });
    const supplement = supplementsDirectory && path.join(supplementsDirectory, `${pkg.name}-${pkg.version}`, 'provenance.json');
    if (supplement && fs.existsSync(supplement)) {
      const provenance = JSON.parse(fs.readFileSync(supplement, 'utf8'));
      if (provenance.name !== pkg.name || provenance.version !== pkg.version || provenance.license !== pkg.license) throw new Error(`Supplement identity mismatch: ${pkg.name}@${pkg.version}`);
      const vcs = JSON.parse(fs.readFileSync(path.join(directory, '.cargo_vcs_info.json'), 'utf8'));
      if (provenance.commit !== vcs.git.sha1) throw new Error(`Supplement commit mismatch: ${pkg.name}@${pkg.version}`);
      for (const asset of provenance.documents) {
        if (!/^https:\/\//.test(asset.url) || (!asset.url.includes(provenance.commit) && !(asset.declaredBy?.includes(provenance.commit) && /^https:\/\//.test(asset.declaredBy) && provenance.documents.some((doc) => doc.url === asset.declaredBy)))) throw new Error(`Supplement requires immutable HTTPS source: ${pkg.name}`);
        const absolute = path.resolve(path.dirname(supplement), asset.file);
        if (!absolute.startsWith(`${path.dirname(supplement)}${path.sep}`)) throw new Error('Supplement asset outside directory');
        const contents = fs.readFileSync(absolute);
        if (digest(contents) !== asset.sha256) throw new Error(`Supplement checksum mismatch: ${pkg.name}`);
        documents.push({ contents, sourcePath: asset.sourcePath, origin: 'upstream', url: asset.url, commit: provenance.commit, ...(asset.declaredBy ? { declaredBy: asset.declaredBy } : {}), ...(asset.transformation ? { transformation: asset.transformation, sourceSha256: asset.sourceSha256 } : {}) });
      }
    }
    if (!documents.some((doc) => /licen[sc]e|copying/i.test(path.basename(doc.sourcePath))) || (pkg.license && !licenseSatisfied(pkg.license, documents))) throw new Error(`Missing required license text: ${pkg.name}@${pkg.version}`);
    const publicDocuments = documents.sort((a, b) => `${a.origin}/${a.sourcePath}`.localeCompare(`${b.origin}/${b.sourcePath}`, 'en')).map((doc) => {
      const publicPath = slash(path.join('licenses', `${pkg.name}-${pkg.version}`, doc.origin, doc.sourcePath));
      if (path.isAbsolute(doc.sourcePath) || doc.sourcePath.split(/[\\/]/).includes('..')) throw new Error(`Unsafe license asset path: ${pkg.name}`);
      if (!doc.contents.toString('utf8').trim()) throw new Error(`Empty license text: ${pkg.name}`);
      pending.push({ path: publicPath, contents: doc.contents });
      return { path: publicPath, sourcePath: doc.sourcePath, origin: doc.origin, sha256: digest(doc.contents), ...(doc.url ? { url: doc.url, commit: doc.commit, ...(doc.declaredBy ? { declaredBy: doc.declaredBy } : {}), ...(doc.transformation ? { transformation: doc.transformation, sourceSha256: doc.sourceSha256 } : {}) } : {}) };
    });
    crates.push({ name: pkg.name, version: pkg.version, license: pkg.license, source: pkg.source, repository: pkg.repository ?? null, packagePath: `${pkg.name}-${pkg.version}`, sourceArchiveUrl: pkg.source?.startsWith('registry+') ? `https://crates.io/api/v1/crates/${pkg.name}/${pkg.version}/download` : null, documents: publicDocuments });
  }
  const manifest = { target, scope: 'Cargo normal runtime dependency closure; excludes the application, build-only, dev-only and proc-macro dependencies', crates };
  // Validate every package before writing any output; do not leave a partial bundle on missing assets.
  if (fs.existsSync(outputDirectory) && fs.readdirSync(outputDirectory).length) throw new Error('License output directory must be empty');
  for (const asset of pending) { const destination = path.join(outputDirectory, asset.path); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, asset.contents); }
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, 'runtime-dependencies.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const acknowledgments = ['# Runtime dependency acknowledgments', '', `Target: ${target}.`, '', manifest.scope + '.', '', 'License expressions are the upstream package declarations. Included documents preserve upstream license terms, copyright notices and notices. The application source has no license grant in this bundle.', '', ...crates.flatMap((pkg) => [`## ${pkg.name} ${pkg.version}`, '', `Declared license: ${pkg.license ?? 'See license file'}.`, '', ...(pkg.repository ? [`Source repository: ${pkg.repository}`, ''] : []), ...(pkg.sourceArchiveUrl ? [`Unmodified dependency source: [${pkg.name} ${pkg.version}](${pkg.sourceArchiveUrl}).`, ''] : []), ...pkg.documents.map((doc) => `- [${doc.sourcePath}](${doc.path})${doc.url ? ` ([upstream source](${doc.url}))` : ''}`), ''])].join('\n');
  fs.writeFileSync(path.join(outputDirectory, 'ACKNOWLEDGMENTS.md'), acknowledgments);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = new Map();
    for (let index = 2; index < process.argv.length; index += 2) {
      if (!['--output', '--manifest', '--supplements'].includes(process.argv[index]) || !process.argv[index + 1]) throw new Error('Usage: node collect-runtime-licenses.mjs --output ABSOLUTE_DIRECTORY [--manifest src-tauri/Cargo.toml] [--supplements DIRECTORY]');
      options.set(process.argv[index], process.argv[index + 1]);
    }
    const metadata = JSON.parse(execFileSync('cargo', ['metadata', '--locked', '--offline', '--filter-platform', target, '--format-version', '1', '--manifest-path', options.get('--manifest') ?? 'src-tauri/Cargo.toml'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
    const manifest = collectRuntimeLicenses({ metadata, outputDirectory: options.get('--output') ?? '', supplementsDirectory: options.get('--supplements') });
    console.log(`Collected ${manifest.crates.length} runtime packages for ${target}.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
