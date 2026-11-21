// Moth & Lantern v4 — the entry program (Node 22, standard library only).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json with buildDossier from the kit's
// vendor/makefun-game.ts. Runs twice, writes the same bytes both times:
// no timestamps, no randomness, no network anywhere in this file.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function fail(message) {
  throw new Error('moth-lantern-v4 main.ts: ' + message);
}

function checkLayout() {
  const index = join(ROOT, 'game', 'index.html');
  if (!existsSync(index)) fail('game/index.html is missing');
  if (statSync(index).size > 1024 * 1024) fail('game/index.html is over 1 MiB');
  const shotsDir = join(ROOT, 'screenshots');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  const shots = readdirSync(shotsDir)
    .filter((n) => !n.startsWith('.'))
    .sort();
  if (shots.length < 3 || shots.length > 4) {
    fail('screenshots/ holds ' + shots.length + ' images, need 3 or 4');
  }
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > 256 * 1024) fail('screenshots/' + name + ' is over 256 KiB');
    if (!/\.(png|jpg|jpeg)$/i.test(name)) fail('screenshots/' + name + ' is not PNG or JPEG');
  }
  if (!existsSync(join(ROOT, 'LICENSE'))) fail('LICENSE is missing');
  if (!existsSync(join(ROOT, 'vendor', 'makefun-game.ts'))) {
    fail('vendor/makefun-game.ts is missing');
  }
  return shots;
}

function copyTree(from, to) {
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    n += entry.isDirectory() ? countFiles(path) + 1 : 1;
  }
  return n;
}

function main() {
  const shots = checkLayout();
  mkdirSync(OUT, { recursive: true });
  copyTree(join(ROOT, 'game'), join(OUT, 'game'));
  copyTree(join(ROOT, 'screenshots'), join(OUT, 'screenshots'));
  const dossier = buildDossier(OUT, DOSSIER_CAPS);
  writeFileSync(join(OUT, 'dossier.json'), dossier);
  const parsed = JSON.parse(new TextDecoder().decode(dossier));
  const textBytes = new TextEncoder().encode(parsed.text ?? '').length;
  const gameFiles = countFiles(join(OUT, 'game'));
  console.log('Moth & Lantern v4 handed in:');
  console.log('  game files: ' + gameFiles);
  console.log('  screenshots: ' + shots.join(', '));
  console.log('  dossier bytes: ' + dossier.length);
  console.log('  dossier text bytes: ' + textBytes + ' (cap 163840)');
  if (textBytes > 163840) fail('dossier text over the 163840 byte cap');
  console.log('  output: ' + OUT);
}

main();
