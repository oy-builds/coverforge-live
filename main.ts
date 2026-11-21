// CoverForge hand-in program (gta6-cover-art-01, Node 22, standard library only).
//
// The entry is a static web app under app/ plus the maker's screenshots under
// screenshots/. This program packages both for the grader: it mirrors them
// into the output directory and writes dossier.json there, produced by the
// vendored make.fun library (vendor/makefun-app.ts) so the bytes match what
// the scorer rebuilds on its side.
//
// Run locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader's container MAKEFUN_OUTPUT_DIR is unset and /output is used.
// The program is deterministic: same input tree, same dossier bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Gate caps for this competition, mirrored from the kit's rules so an entry
// the scorer would refuse is refused here first, with the same numbers.
const GATE_CAPS = {
  text_max_bytes: 163_840, // dossier source text cap (160 KiB)
  screenshots: { max: 4, max_bytes: 262_144 }, // at most 4 shots, 256 KiB each
  app_max_files: 993, // files + directories under app/
  app_max_bytes: 50_331_648, // 48 MiB of app files in all
  app_path_max_bytes: 1_000, // longest path under app/, in UTF-8 bytes
} as const;

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function mirrorTree(name: string): void {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
mirrorTree('app');
mirrorTree('screenshots');

const dossier = buildDossier(outputDir, GATE_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);

const shotNames = existsSync(join(outputDir, 'screenshots'))
  ? readdirSync(join(outputDir, 'screenshots')).sort()
  : [];
console.log(
  `CoverForge: handed in app/ + ${shotNames.length} screenshot(s) [${shotNames.join(', ')}]; ` +
    `dossier.json is ${dossier.byteLength} bytes.`,
);
