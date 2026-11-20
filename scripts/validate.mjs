#!/usr/bin/env node
// Checks the contract's own consistency: every catalog capability is known
// and in canonical scope-token form, presets name known capabilities, every
// vector file parses and its cases have the fields the plugins read, and the
// skill has front matter. Exit 1 on any problem. No dependencies.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const problems = [];
const fail = (msg) => problems.push(msg);

const RISKS = ['read', 'write', 'execute', 'external', 'destructive', 'admin'];
// Canonical capability: lower-case, ':'-separated segments of [a-z0-9_*-],
// no empty segment (SPEC §4.1; server AgentCapability + RFC 6749 §3.3).
const CANONICAL = /^[a-z0-9_*-]+(:[a-z0-9_*-]+)*$/;

const caps = load('catalog/capabilities.json').capabilities;
for (const [cap, meta] of Object.entries(caps)) {
  if (!CANONICAL.test(cap)) fail(`capabilities.json: ${cap} is not canonical`);
  if (!RISKS.includes(meta.risk)) fail(`capabilities.json: ${cap} has unknown risk ${meta.risk}`);
  if (!meta.label || meta.label.length > 120) fail(`capabilities.json: ${cap} label missing or longer than 120`);
}

for (const host of ['openclaw', 'hermes']) {
  const cat = load(`catalog/${host}.json`);
  const seen = new Set();
  for (const t of cat.tools) {
    if (seen.has(t.name)) fail(`${host}.json: duplicate tool ${t.name}`);
    seen.add(t.name);
    if (!RISKS.includes(t.risk)) fail(`${host}.json: ${t.name} has unknown risk ${t.risk}`);
    if (!CANONICAL.test(t.capability)) fail(`${host}.json: ${t.name} capability ${t.capability} is not canonical`);
    if (!t.capability.startsWith('tool:') && !caps[t.capability]) fail(`${host}.json: ${t.name} names unknown capability ${t.capability}`);
    if (t.hardRule && !['deny', 'approve'].includes(t.hardRule)) fail(`${host}.json: ${t.name} hardRule ${t.hardRule}`);
  }
  for (const [alias, target] of Object.entries(cat.aliases ?? {})) {
    if (!seen.has(target)) fail(`${host}.json: alias ${alias} -> unknown tool ${target}`);
  }
}

const presets = load('catalog/presets.json');
if (!presets.presets[presets.default]) fail(`presets.json: default ${presets.default} missing`);
for (const [name, p] of Object.entries(presets.presets)) {
  for (const cap of p.capabilities) if (!caps[cap]) fail(`presets.json: ${name} names unknown capability ${cap}`);
  for (const r of p.mcp) if (!RISKS.includes(r)) fail(`presets.json: ${name} mcp risk ${r}`);
}

const verbs = load('catalog/mcp-verbs.json');
for (const r of verbs.order) if (!verbs.verbs[r]) fail(`mcp-verbs.json: order names ${r} without a list`);

for (const f of readdirSync(join(root, 'vectors'))) {
  if (!f.endsWith('.json')) continue;
  let v;
  try { v = load(`vectors/${f}`); } catch (e) { fail(`vectors/${f}: ${e.message}`); continue; }
  if (f === 'agent-capabilities.json' || f === 'environment.json') continue;
  if (!Array.isArray(v.cases) || v.cases.length === 0) fail(`vectors/${f}: no cases`);
  const ids = new Set();
  for (const c of v.cases ?? []) {
    if (c.id) { if (ids.has(c.id)) fail(`vectors/${f}: duplicate id ${c.id}`); ids.add(c.id); }
    if (c.host && !['openclaw', 'hermes'].includes(c.host)) fail(`vectors/${f}: unknown host ${c.host}`);
    if (!('expected' in c) && f !== 'mcp-risk.json') fail(`vectors/${f}: case without expected`);
  }
}

const skill = readFileSync(join(root, 'skills/lumoauth-guard/SKILL.md'), 'utf8');
if (!/^---\nname: lumoauth-guard\ndescription: .+\n---\n/.test(skill)) fail('SKILL.md: front matter must open the file with name and description');

if (problems.length) {
  for (const p of problems) console.error(`✗ ${p}`);
  process.exit(1);
}
console.log('agent-guard contract: OK');
