// Moth & Lantern v4 — staged screenshot states and the headless self-test.
// applyShot() poses one heist for one screenshot; runSelfTest() exercises
// every system and writes PASS/FAIL into the page for the headless runner.

import { HEISTS, TUNE, TILE } from './config.js';
import { tileCx, tileCy } from './world.js';
import { G, step, startHeist, api } from './main.js';

function placePlayer(tx, ty) {
  G.player.x = tileCx(tx);
  G.player.y = tileCy(ty);
}

function setGuard(i, state, suspicion, tx, ty, dirDeg) {
  const g = G.state.guards[i];
  g.state = state;
  g.suspicion = suspicion;
  g.stateTime = 0;
  if (tx !== undefined) {
    g.x = tileCx(tx);
    g.y = tileCy(ty);
  }
  if (dirDeg !== undefined) g.dir = (dirDeg * Math.PI) / 180;
  g.target = { x: G.player.x, y: G.player.y };
  g.lastSeen = { x: G.player.x, y: G.player.y };
}

// Shot 1 — SETUP · Heist 1: coin arcs toward the west fern bed, gate guard
// asks "WHAT WAS THAT?", moth in shadow.
function shotSetup() {
  startHeist(0);
  G.time = 12;
  placePlayer(3, 6);
  G.player.dust = 8;
  G.player.noise = 30;
  G.player.coins = 3;
  // Coin mid-flight toward the west fern bed.
  G.coins.push({ x: tileCx(3), y: tileCy(6), tx: tileCx(2), ty: tileCy(5), t: 0.3, dur: TUNE.coinFlight });
  setGuard(0, 'SUSPICIOUS', 42, 8, 8, 180);
  setGuard(1, 'PATROL', 0, 17, 8, 0);
  setGuard(2, 'PATROL', 0, 21, 8, 180);
  G.detection = 'SUSPICIOUS';
  G.banner = '';
}

// Shot 2 — GADGET · Heist 2: smoke cloud clips the vault guard's cone,
// camera sweeps away, guard chip SUSPICIOUS.
function shotGadget() {
  startHeist(1);
  G.time = 24;
  // Moth at the smoke's edge (visible), smoke between moth and vault guard,
  // ledger peeking out of the cloud's far side.
  placePlayer(10.8, 8.6);
  G.player.dust = 25;
  G.player.noise = 12;
  G.player.smoke = 1;
  // Smoke between the moth and the vault guard.
  G.smokes.push({ x: tileCx(12.8), y: tileCy(7.4), r: TUNE.smokeRadius * TILE, t: 4 });
  setGuard(3, 'SUSPICIOUS', 58, 14, 7, 180);
  setGuard(0, 'PATROL', 0, 7, 11, 90);
  setGuard(1, 'PATROL', 0, 17, 12, 270);
  setGuard(2, 'SUSPICIOUS', 30, 12, 9, 90);
  const cam = G.state.cameras[0];
  cam.dir = (45 * Math.PI) / 180; // sweeping away from the vault
  cam.exposure = 20;
  G.detection = 'SUSPICIOUS';
  G.lootValue = 400;
  G.lootGot = 2;
  G.score = 650;
  G.banner = '';
}

// Shot 3 — CAMERA-LASER · Heist 3: red laser mid-pulse, moth at the vent
// mouth HIDDEN, ALARM banner with red vignette.
function shotLaser() {
  startHeist(2);
  G.time = 12.5; // laser 0 is ON at this phase (12.5s into its 4s cycle)
  placePlayer(8, 7);
  const v = G.state.vents[0];
  G.player.vent = v;
  G.player.ventFrom = 'a';
  G.player.ventT = 0.45;
  G.player.x = v.ax;
  G.player.y = v.ay;
  G.player.dust = 12;
  setGuard(4, 'ALARM', 100, 18, 8, 200);
  setGuard(0, 'PATROL', 0, 5, 6, 90);
  setGuard(1, 'SUSPICIOUS', 48, 16, 10, 180);
  setGuard(2, 'PATROL', 0, 12, 13, 270);
  setGuard(3, 'PATROL', 0, 12, 5, 90);
  const cam = G.state.cameras[0];
  cam.dir = (135 * Math.PI) / 180;
  G.detection = 'ALARM';
  G.alarm = 100;
  G.banner = 'ALARM !';
  G.bannerT = 3;
  G.strikes = 1;
  G.spotted = 1;
  G.heat = 62;
  G.lootValue = 300;
  G.lootGot = 1;
  G.score = 550;
}

// Shot 4 — ESCAPE · Heist 5: moth mid-swing over the open-air gap, Moth
// Crown on her back, cones converging, SPOTTED banner, GHOST flash.
function shotEscape() {
  startHeist(4);
  G.time = 96;
  const c = G.state.chains[0];
  const p = G.player;
  p.swing = c;
  p.swingT = 0.5;
  const t = 0.5;
  const sag = Math.sin(t * Math.PI) * 34;
  const mx = c.ax + (c.bx - c.ax) * t;
  const my = c.ay + (c.by - c.ay) * t;
  const dx = c.bx - c.ax;
  const dy = c.by - c.ay;
  const len = Math.hypot(dx, dy) || 1;
  p.x = mx + (-dy / len) * sag;
  p.y = my + (dx / len) * sag;
  p.hasObjective = true;
  p.hasObjective2 = true;
  p.dust = 74;
  p.noise = 62;
  G.state.objective.taken = true;
  G.state.objective2.taken = true;
  G.state.exit.open = true;
  G.escapeLeft = 9;
  setGuard(0, 'SUSPICIOUS', 70, 6, 10, 45);
  setGuard(1, 'SUSPICIOUS', 70, 17, 10, 135);
  setGuard(2, 'ALARM', 100, 11, 11, 270);
  setGuard(5, 'SUSPICIOUS', 60, 12, 7, 90);
  G.detection = 'ALARM';
  G.alarm = 100;
  G.banner = 'SPOTTED! Break line of sight and hide.';
  G.bannerT = 3;
  G.strikes = 1;
  G.spotted = 1;
  G.heat = 78;
  G.lootValue = 1200;
  G.lootGot = 3;
  G.score = 2150;
  G.ghostFlash = true;
}

export function applyShot(g, n) {
  if (n === 1) shotSetup();
  else if (n === 2) shotGadget();
  else if (n === 3) shotLaser();
  else shotEscape();
}

// ---------------------------------------------------------------- self-test
function fnv(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function stateHash() {
  const p = G.player;
  const parts = [
    Math.round(p.x * 100),
    Math.round(p.y * 100),
    Math.round(p.dust * 100),
    Math.round(p.noise * 100),
    ...G.state.guards.map((g) => [Math.round(g.x * 10), Math.round(g.y * 10), Math.round(g.suspicion)]).flat(),
    ...G.state.cameras.map((c) => Math.round(c.exposure)),
  ];
  return fnv(parts.join(','));
}

function key(code) {
  window.__gameKey = code;
}

export function runSelfTest(g) {
  const out = [];
  const t = (name, ok, detail) => out.push({ name, ok: !!ok, detail: detail || '' });
  const A = api();

  try {
    // 1. All five heists build with the designed counts.
    const expect = [
      [3, 0, 0, 0],
      [4, 1, 0, 1],
      [5, 2, 2, 1],
      [6, 2, 3, 0],
      [7, 3, 3, 2],
    ];
    let buildOk = true;
    let buildDetail = '';
    for (let i = 0; i < 5; i++) {
      startHeist(i);
      const s = G.state;
      const got = [s.guards.length, s.cameras.length, s.lasers.length, s.chains.length];
      if (got.join(',') !== expect[i].join(',')) {
        buildOk = false;
        buildDetail += 'h' + (i + 1) + ' got ' + got.join('/') + ' want ' + expect[i].join('/') + '; ';
      }
      if (s.vents.length !== [0, 0, 2, 3, 3][i]) {
        buildOk = false;
        buildDetail += 'h' + (i + 1) + ' vents ' + s.vents.length + '; ';
      }
    }
    t('heists-build', buildOk, buildDetail || '5 heists, 25 guards total');

    // 2. Guards patrol: positions move over 10 s with no input.
    startHeist(0);
    const g0 = { x: G.state.guards[0].x, y: G.state.guards[0].y };
    for (let i = 0; i < 600; i++) step(1 / 60);
    const moved = Math.hypot(G.state.guards[0].x - g0.x, G.state.guards[0].y - g0.y);
    t('guards-patrol', moved > 10, 'guard A moved ' + Math.round(moved) + 'px in 10s');

    // 3. Win path heist 1: objective then exit.
    startHeist(0);
    A.teleport(G.state.objective.x, G.state.objective.y);
    for (let i = 0; i < 5; i++) step(1 / 60);
    const gotObj = G.player.hasObjective;
    A.teleport(G.state.exit.x + 10, G.state.exit.y + 10);
    for (let i = 0; i < 5; i++) step(1 / 60);
    t('win-path', gotObj && G.mode === 'heistDone', 'hasObjective=' + gotObj + ' mode=' + G.mode);
    // Advance to heist 2.
    key('Enter');
    step(1 / 60);
    t('advance-heist', G.mode === 'playing' && G.heistIndex === 1, 'mode=' + G.mode + ' heist=' + (G.heistIndex + 1));

    // 4. Alarm path: stand lit in front of a guard until suspicion rises.
    startHeist(0);
    const gg = G.state.guards[0];
    A.teleport(gg.x + Math.cos(gg.dir) * 2 * TILE, gg.y + Math.sin(gg.dir) * 2 * TILE);
    A.setDust(80);
    for (let i = 0; i < 300; i++) step(1 / 60);
    t('alarm-path', gg.suspicion > 25 || G.detection !== 'UNSEEN', 'suspicion=' + Math.round(gg.suspicion) + ' detection=' + G.detection + ' strikes=' + G.strikes);

    // 5. Coin throw distracts a guard.
    startHeist(0);
    const gA = G.state.guards[0];
    A.teleport(gA.x + 3 * TILE, gA.y);
    const coinsBefore = G.player.coins;
    A.throwCoinAt(gA.x, gA.y);
    for (let i = 0; i < 60; i++) step(1 / 60);
    t('coin-distract', G.player.coins === coinsBefore - 1 && gA.state === 'SUSPICIOUS', 'coins ' + coinsBefore + '->' + G.player.coins + ' guard=' + gA.state);

    // 6. Smoke deploys.
    startHeist(1);
    const smokeBefore = G.player.smoke;
    key('Digit2');
    step(1 / 60);
    t('smoke-deploy', G.smokes.length === 1 && G.player.smoke === smokeBefore - 1, 'smokes=' + G.smokes.length);

    // 7. Snuff kills a lantern and its laser.
    startHeist(2);
    const lamp = G.state.lanterns[0];
    A.teleport(lamp.x + 30, lamp.y);
    const snuffBefore = G.player.snuff;
    key('Digit3');
    step(1 / 60);
    const laserDead = G.time < G.state.lasers[0].deadUntil;
    t('snuff-kills-laser', !lamp.on && G.player.snuff === snuffBefore - 1 && laserDead, 'lantern on=' + lamp.on + ' laser dead=' + laserDead);

    // 8. Laser trip raises an alarm.
    startHeist(2);
    G.time = 0.5; // laser 0 ON
    const lz = G.state.lasers[0];
    A.teleport((lz.x1 + lz.x2) / 2, (lz.y1 + lz.y2) / 2);
    const strikesBefore = G.strikes;
    for (let i = 0; i < 5; i++) step(1 / 60);
    t('laser-trip', G.strikes > strikesBefore, 'strikes ' + strikesBefore + '->' + G.strikes);

    // 9. Vent crawl.
    startHeist(2);
    const v = G.state.vents[0];
    A.teleport(v.ax, v.ay);
    key('KeyE');
    step(1 / 60);
    t('vent-enter', !!G.player.vent, 'vent=' + !!G.player.vent);
    for (let i = 0; i < 240; i++) step(1 / 60);
    t('vent-exit', !G.player.vent, 'vent cleared after crawl');

    // 10. Camera exposure rises in its cone (track the peak: the cone
    // sweeps away and exposure decays while the player stands still).
    startHeist(1);
    const cam = G.state.cameras[0];
    A.teleport(cam.x + Math.cos(cam.dir) * 3 * TILE, cam.y + Math.sin(cam.dir) * 3 * TILE);
    A.setDust(80);
    let peak = 0;
    for (let i = 0; i < 180; i++) {
      step(1 / 60);
      peak = Math.max(peak, cam.exposure);
    }
    t('camera-exposure', peak > 0, 'peak exposure=' + Math.round(peak));

    // 11. Determinism: same fixed script, same hash.
    const hashRun = () => {
      startHeist(0);
      for (let i = 0; i < 300; i++) step(1 / 60);
      return stateHash();
    };
    const h1 = hashRun();
    const h2 = hashRun();
    t('determinism', h1 === h2, 'hash ' + h1 + ' vs ' + h2);

    // 12. Three strikes fail the heist.
    startHeist(0);
    G.strikes = 2;
    G.scoreAtHeist = G.score;
    const gg2 = G.state.guards[0];
    A.teleport(gg2.x + Math.cos(gg2.dir) * 2 * TILE, gg2.y + Math.sin(gg2.dir) * 2 * TILE);
    A.setDust(95);
    for (let i = 0; i < 900; i++) {
      step(1 / 60);
      if (G.mode === 'failed') break;
    }
    t('three-strikes-fail', G.mode === 'failed', 'mode=' + G.mode + ' strikes=' + G.strikes);
  } catch (err) {
    out.push({ name: 'exception', ok: false, detail: String(err && err.stack || err) });
  }

  const passed = out.filter((r) => r.ok).length;
  const result = { passed, total: out.length, tests: out, hash: stateHash() };
  const el = document.getElementById('testout');
  if (el) el.textContent = JSON.stringify(result, null, 1);
  document.title = passed === out.length ? 'SELFTEST-PASS' : 'SELFTEST-FAIL';
  window.__selftest = result;
}
