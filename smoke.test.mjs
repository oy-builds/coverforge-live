// CoverForge smoke tests: structure, gate limits, app logic and the
// determinism of the hand-in program. Run with: node smoke.test.mjs

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdtempSync, readFileSync, readdirSync, statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
let passed = 0;
let failed = 0;

function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`ok   ${name}`); }
  else { failed++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

function readText(rel) { return readFileSync(join(root, rel), 'utf8'); }

// --- Repository shape -------------------------------------------------------
for (const rel of ['main.ts', 'LICENSE', 'README.md', 'app/index.html', 'app/app.js',
  'app/styles.css', 'vendor/makefun-app.ts', '.makefun/owner.json']) {
  check(`exists: ${rel}`, existsSync(join(root, rel)));
}

const owner = JSON.parse(readText('.makefun/owner.json'));
check('owner.json names the entry wallet',
  owner.wallet === '7xpK8LwVVh3QD3a1xVMbhgDxUya3wQESHPs9byJshnAU');

check('LICENSE is MIT', readText('LICENSE').includes('MIT License'));
check('vendor library exports buildDossier', readText('vendor/makefun-app.ts').includes('export function buildDossier'));

// --- The app loads nothing from the network ---------------------------------
const html = readText('app/index.html');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
check('index.html references only local files',
  refs.length > 0 && refs.every((r) => !r.includes(':') && existsSync(join(root, 'app', r))),
  refs.join(','));
for (const rel of ['app/index.html', 'app/app.js', 'app/styles.css']) {
  check(`no network URL in ${rel}`, !/https?:\/\//.test(readText(rel)));
}
check('index.html loads app.js as a module', html.includes('type="module" src="app.js"'));
check('index.html has the poster canvas', html.includes('id="poster"'));
for (const id of ['titleInput', 'taglineInput', 'badgeToggle', 'sceneSelect', 'zoomRange',
  'xRange', 'yRange', 'photoFile', 'exportBtn', 'panelStrip']) {
  check(`index.html has #${id}`, html.includes(`id="${id}"`));
}

// --- App logic (imported as a module under Node) -----------------------------
const appSource = readText('app/app.js');
const app = await import(`data:text/javascript;base64,${Buffer.from(appSource).toString('base64')}`);

check('five scene presets', app.SCENES.length === 5);
check('scene ids are unique', new Set(app.SCENES.map((s) => s.id)).size === 5);
check('every scene paints', app.SCENES.every((s) => typeof s.paint === 'function'));
check('three style presets', Object.keys(app.STYLES).length === 3);
check('export sizes are the three post sizes',
  JSON.stringify(app.SIZES) === JSON.stringify({
    '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080],
  }));

for (const [label, w, h] of [['portrait', 1080, 1350], ['square', 1080, 1080], ['landscape', 1920, 1080]]) {
  const rects = app.panelLayout(w, h);
  check(`${label} layout has five panels`, rects.length === 5);
  check(`${label} panels stay inside the poster`,
    rects.every((r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= w + 0.01 && r.y + r.h <= h + 0.01));
  const areas = rects.map((r) => r.w * r.h);
  check(`${label} hero panel is the largest`, areas[0] === Math.max(...areas));
}

check('title splits into stacked lines',
  JSON.stringify(app.splitTitleLines('GRAND THEFT AUTO VI')) === JSON.stringify(['GRAND THEFT', 'AUTO VI']));
check('empty title falls back', JSON.stringify(app.splitTitleLines('  ')) === JSON.stringify(['UNTITLED']));

const fresh = app.createDefaultState();
check('default state has five panels', fresh.panels.length === 5);
check('default state selects the hero panel', fresh.selected === 0 && fresh.badge === true);
check('default panels use the five scenes in order',
  fresh.panels.every((p, i) => p.scene === app.SCENES[i].id && p.zoom === 1 && p.x === 0 && p.y === 0));

const rngA = app.mulberry32(42);
const rngB = app.mulberry32(42);
check('seeded rng is deterministic', rngA() === rngB() && rngA() === rngB());

// --- Screenshots obey the gate limits ---------------------------------------
const shots = readdirSync(join(root, 'screenshots')).filter((n) => !n.startsWith('.')).sort();
check('three or four screenshots', shots.length >= 3 && shots.length <= 4, `${shots.length} found`);
for (const name of shots) {
  const buf = readFileSync(join(root, 'screenshots', name));
  check(`${name} is a PNG`, buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  check(`${name} fits the size limits (${w}x${h}, ${buf.length} bytes)`,
    Math.max(w, h) <= 1280 && Math.min(w, h) >= 480 && buf.length <= 262_144);
}

// --- The hand-in program is deterministic ------------------------------------
function runMain() {
  const out = mkdtempSync(join(tmpdir(), 'coverforge-out-'));
  execFileSync('node', ['main.ts'], {
    cwd: root,
    env: { ...process.env, MAKEFUN_OUTPUT_DIR: out },
    stdio: 'pipe',
  });
  return out;
}
const outA = runMain();
const outB = runMain();
const dossierA = readFileSync(join(outA, 'dossier.json'));
const dossierB = readFileSync(join(outB, 'dossier.json'));
check('main.ts copies the app into the output', existsSync(join(outA, 'app', 'index.html')));
check('dossier is byte-identical across two runs',
  createHash('sha256').update(dossierA).digest('hex') === createHash('sha256').update(dossierB).digest('hex'));
check('dossier is within the 1.5 MiB cap', dossierA.length <= 1_572_864, `${dossierA.length} bytes`);
check('dossier mentions the app sources',
  dossierA.toString('utf8').includes('app.js') && dossierA.toString('utf8').includes('index.html'));

const repoBytes = readdirSync(root, { recursive: true })
  .filter((p) => statSync(join(root, p)).isFile() && !p.startsWith('.git'))
  .reduce((sum, p) => sum + statSync(join(root, p)).size, 0);
console.log(`info repo size (excluding .git): ${repoBytes} bytes`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
