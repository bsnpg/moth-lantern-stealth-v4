// Moth & Lantern v4 — game state, loop, guard AI, gadgets, detection, score.
// Written fresh from the v4 design docs. Classic scripts: this file defines
// the campaign object G and the step() tick; render.js draws it.

import { HEISTS, HEIST_COUNT, TOTAL_GUARDS, TUNE, PAL, VIEW_W, VIEW_H, TILE, FIELD_OX, FIELD_OY, FIELD_W, FIELD_H } from './config.js';
import {
  DEG, tileCx, tileCy, angleDiff, canSee, lightAt, collide, buildHeist,
  coverAt, ventNear, chainNear, lanternNear, segmentHitsRect, pointInRect,
} from './world.js';
import { held, pressed, moveVector, mousePos, mouseClicked, clearInput } from './input.js';
import { draw } from './render.js';
import { mulberry32, seedOf } from './random.js';

export const G = {
  mode: 'title', // title | playing | heistDone | failed | campaignDone | paused
  heistIndex: 0,
  state: null,
  player: null,
  coins: [], // flying coins {x,y,tx,ty,t,dur}
  smokes: [], // {x,y,r,t}
  time: 0,
  score: 0,
  best: 0,
  scoreAtHeist: 0,
  lootValue: 0,
  lootGot: 0,
  lootTotal: 0,
  spotted: 0,
  strikes: 0,
  heat: 0,
  unseenFor: 0,
  alarm: 0,
  detection: 'UNSEEN',
  heistDone: [],
  heistAlarms: 0,
  heistSpotted: 0,
  card: null,
  escapeLeft: 0,
  escapeBonus: false,
  banner: '',
  bannerT: 0,
  prompt: '',
  rng: mulberry32(1),
  dust: [], // ambient dust motes {x,y,r,ph}
  gustHit: false,
  extraSpawned: false,
  alarmFrame: -1,
  ghostFlash: false,
  frame: 0,
  testMode: false,
};

function freshPlayer(state) {
  const smokes = G.state ? (G.state.def.id >= 4 ? TUNE.smokeCountLate : TUNE.smokeCount) : TUNE.smokeCount;
  return {
    x: state.start.x,
    y: state.start.y,
    dir: -Math.PI / 2,
    dust: 0,
    noise: 0,
    coins: TUNE.coinCount,
    smoke: smokes,
    snuff: TUNE.snuffCount,
    coinCd: 0,
    smokeCd: 0,
    snuffCd: 0,
    dashCd: 0,
    dashT: 0,
    dashX: 0,
    dashY: 0,
    hidden: false,
    hiddenCover: null,
    exposedT: 0,
    vent: null,
    ventT: 0,
    ventFrom: 'a',
    swing: null,
    swingT: 0,
    hasObjective: false,
    hasObjective2: false,
    crouch: false,
    moving: false,
    stepT: 0,
  };
}

export function newCampaign() {
  G.mode = 'title';
  G.heistIndex = 0;
  G.score = 0;
  G.best = 0;
  G.heistDone = HEISTS.map(() => false);
  G.state = buildHeist(HEISTS[0], 0);
  G.player = freshPlayer(G.state);
  G.coins = [];
  G.smokes = [];
  G.time = 0;
  G.lootValue = 0;
  G.lootGot = 0;
  G.lootTotal = HEISTS.reduce((n, h) => n + h.loot.length, 0);
  G.spotted = 0;
  G.strikes = 0;
  G.heat = 0;
  G.unseenFor = 0;
  G.alarm = 0;
  G.detection = 'UNSEEN';
  G.card = null;
  G.escapeLeft = 0;
  G.rng = mulberry32(seedOf('moth-lantern-v4'));
  seedDust();
  clearInput();
}

function seedDust() {
  G.dust = [];
  for (let i = 0; i < 40; i++) {
    G.dust.push({
      x: FIELD_OX + G.rng() * FIELD_W,
      y: FIELD_OY + G.rng() * FIELD_H,
      r: 1 + G.rng() * 2,
      ph: G.rng() * Math.PI * 2,
    });
  }
}

export function startHeist(i) {
  G.heistIndex = i;
  G.state = buildHeist(HEISTS[i], i);
  G.player = freshPlayer(G.state);
  G.coins = [];
  G.smokes = [];
  G.time = 0;
  G.scoreAtHeist = G.score;
  G.lootValue = 0;
  G.lootGot = 0;
  G.strikes = 0;
  G.heat = 0;
  G.unseenFor = 0;
  G.alarm = 0;
  G.heistAlarms = 0;
  G.heistSpotted = 0;
  G.escapeLeft = 0;
  G.escapeBonus = false;
  G.banner = '';
  G.bannerT = 0;
  G.extraSpawned = false;
  G.gustHit = false;
  G.mode = 'playing';
  G.rng = mulberry32(seedOf('moth-lantern-v4-heist-' + (i + 1)));
  seedDust();
  clearInput();
}

// ---------------------------------------------------------------- helpers
function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function visMult(dust, guard) {
  if (guard.type === 'hunter') return dust >= 60 ? 2.2 : 1.0;
  if (dust < 20) return 0.45;
  if (dust < 60) return 1.0;
  return 2.2;
}

function falloff(d) {
  const tiles = d / TILE;
  if (tiles <= 3) return 1.0;
  if (tiles <= 6) return 1.0 - (tiles - 3) * 0.133;
  if (tiles <= 9) return 0.6 - (tiles - 6) * 0.083;
  return 0.35;
}

function playerSeenBy(guard) {
  const p = G.player;
  if (p.vent) return false;
  const d = dist(guard.x, guard.y, p.x, p.y);
  if (p.hidden && d > 2 * TILE) return false;
  const watcher = { x: guard.x, y: guard.y, dir: guard.dir, half: guard.half, range: guard.range };
  return canSee(watcher, p.x, p.y, G.state.walls, G.smokes);
}

function noiseBand() {
  const n = G.player.noise;
  if (n < 20) return { name: 'SILENT', radius: 3 };
  if (n < 60) return { name: 'RUSTLE', radius: 6 };
  return { name: 'LOUD', radius: 10 };
}

function raiseAlarm(source) {
  // One strike per frame at most: two guards alarming on the same tick is
  // one event, not two.
  if (G.alarmFrame === G.frame) return;
  G.alarmFrame = G.frame;
  const p = G.player;
  G.heistAlarms++;
  G.heistSpotted++;
  G.spotted++;
  G.strikes++;
  G.score += TUNE.scoreSpotted;
  G.heat = Math.min(100, G.heat + TUNE.heatAlarm);
  G.banner = source === 'laser' ? 'LASER TRIPPED!' : 'SPOTTED! Break line of sight and hide.';
  G.bannerT = 3;
  // Neighbours within 8 tiles converge on the player.
  for (const g of G.state.guards) {
    if (dist(g.x, g.y, p.x, p.y) < TUNE.alarmCallRadius * TILE) {
      if (g.state !== 'ALARM') {
        g.state = 'ALARM';
        g.stateTime = 0;
        g.lastSeen = { x: p.x, y: p.y };
      }
    }
  }
  if (G.strikes >= TUNE.maxStrikes) heistFailed();
}

function heistFailed() {
  G.mode = 'failed';
  G.score = G.scoreAtHeist;
  G.card = {
    title: 'HEIST FAILED',
    sub: HEISTS[G.heistIndex].name,
    lines: [
      'Three strikes — the house woke up.',
      'Score for this heist is reset. Campaign score keeps earlier heists.',
      '',
      'Press ENTER to retry ' + HEISTS[G.heistIndex].short + '.',
    ],
    ghost: false,
  };
}

function heistComplete() {
  const def = HEISTS[G.heistIndex];
  const elapsed = G.time;
  const timeBonus = Math.max(0, Math.floor(def.par - elapsed)) * TUNE.scoreTimeBonus;
  let bonus = TUNE.scoreHeist + timeBonus;
  const allLoot = G.lootGot === def.loot.length;
  const ghost = G.heistAlarms === 0 && G.heistSpotted === 0 && allLoot;
  if (ghost) bonus += TUNE.ghostBonus;
  if (G.escapeBonus) bonus += 150;
  G.score += bonus;
  G.best = Math.max(G.best, G.score);
  G.heistDone[G.heistIndex] = true;
  const lines = [
    def.name,
    '',
    'Loot this heist: $' + G.lootValue + '  (' + G.lootGot + '/' + def.loot.length + ' items)',
    'Heist cleared: +' + TUNE.scoreHeist,
    'Time bonus (' + Math.floor(elapsed) + 's vs par ' + def.par + 's): +' + timeBonus,
  ];
  if (G.escapeBonus) lines.push('Clean escape: +150');
  if (ghost) lines.push('GHOST — unseen, unspotted, all loot: +' + TUNE.ghostBonus);
  lines.push('');
  lines.push('SCORE: ' + G.score + '   BEST: ' + G.best);
  lines.push('');
  if (G.heistIndex + 1 < HEIST_COUNT) {
    lines.push('Press ENTER for Heist ' + (G.heistIndex + 2) + ' — ' + HEISTS[G.heistIndex + 1].name + '.');
  } else {
    lines.push('Press ENTER for the final tally.');
  }
  G.card = { title: 'HEIST COMPLETE', sub: def.name, lines, ghost };
  G.mode = 'heistDone';
}

function campaignComplete() {
  G.mode = 'campaignDone';
  G.card = {
    title: 'THE MOTH VANISHES',
    sub: 'All five heists complete',
    lines: [
      'Glasshouse · Counting House · Foundry · Archive · Sky Palace',
      '',
      'FINAL SCORE: ' + G.score,
      'Loot stolen: $' + G.lootValue,
      'Times spotted: ' + G.spotted,
      '',
      'Press ENTER to play again.',
    ],
    ghost: false,
  };
}

// ---------------------------------------------------------------- gadgets
function throwCoin() {
  const p = G.player;
  if (p.coins <= 0 || p.coinCd > 0 || p.vent || p.swing) return;
  const m = mousePos();
  const dx = m.x - p.x;
  const dy = m.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const range = Math.min(d, TUNE.coinRange * TILE);
  const tx = p.x + (dx / d) * range;
  const ty = p.y + (dy / d) * range;
  G.coins.push({ x: p.x, y: p.y, tx, ty, t: 0, dur: TUNE.coinFlight });
  p.coins--;
  p.coinCd = TUNE.coinCooldown;
}

function deploySmoke() {
  const p = G.player;
  if (p.smoke <= 0 || p.smokeCd > 0 || p.vent || p.swing) return;
  G.smokes.push({ x: p.x, y: p.y, r: TUNE.smokeRadius * TILE, t: TUNE.smokeTime });
  p.smoke--;
  p.smokeCd = TUNE.smokeCooldown;
  p.noise = Math.min(100, p.noise + 6);
}

function snuffLantern() {
  const p = G.player;
  if (p.snuff <= 0 || p.snuffCd > 0 || p.vent || p.swing) return;
  const l = lanternNear(G.state, p.x, p.y, TUNE.snuffRange * TILE);
  if (!l) return;
  l.on = false;
  l.offUntil = G.time + TUNE.snuffTime;
  p.snuff--;
  p.snuffCd = TUNE.snuffCooldown;
  p.noise = Math.min(100, p.noise + TUNE.noiseSnuff);
  if (l.laser >= 0 && G.state.lasers[l.laser]) {
    G.state.lasers[l.laser].deadUntil = G.time + TUNE.snuffTime;
  }
}

// ---------------------------------------------------------------- player
function updatePlayer(dt) {
  const p = G.player;
  const st = G.state;
  p.coinCd = Math.max(0, p.coinCd - dt);
  p.smokeCd = Math.max(0, p.smokeCd - dt);
  p.snuffCd = Math.max(0, p.snuffCd - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.exposedT = Math.max(0, p.exposedT - dt);

  // Swing traversal.
  if (p.swing) {
    p.swingT += dt / 0.9;
    const c = p.swing;
    const t = Math.min(1, p.swingT);
    const sag = Math.sin(t * Math.PI) * 34;
    const mx = c.ax + (c.bx - c.ax) * t;
    const my = c.ay + (c.by - c.ay) * t;
    const dx = c.bx - c.ax;
    const dy = c.by - c.ay;
    const len = Math.hypot(dx, dy) || 1;
    p.x = mx + (-dy / len) * sag;
    p.y = my + (dx / len) * sag;
    p.dust = Math.min(100, p.dust + TUNE.dustSwing * dt);
    p.noise = Math.min(100, p.noise + TUNE.noiseSwing * dt);
    if (pressed('Space') || t >= 1) {
      const land = collide(st, p.x, p.y, TUNE.playerRadius);
      p.x = land.x;
      p.y = land.y;
      p.swing = null;
      p.swingT = 0;
    }
    return;
  }

  // Vent crawl.
  if (p.vent) {
    const v = p.vent;
    const fromX = p.ventFrom === 'a' ? v.ax : v.bx;
    const fromY = p.ventFrom === 'a' ? v.ay : v.by;
    const toX = p.ventFrom === 'a' ? v.bx : v.ax;
    const toY = p.ventFrom === 'a' ? v.by : v.ay;
    p.ventT += (TUNE.ventSpeed * dt) / Math.hypot(toX - fromX, toY - fromY);
    const t = Math.min(1, p.ventT);
    p.x = fromX + (toX - fromX) * t;
    p.y = fromY + (toY - fromY) * t;
    if (t >= 1 || pressed('KeyE')) {
      p.vent = null;
      p.ventT = 0;
    }
    return;
  }

  // Hidden in cover: no movement.
  if (p.hidden) {
    if (pressed('KeyE')) {
      p.hidden = false;
      p.hiddenCover = null;
      p.exposedT = 0.4;
    }
    return;
  }

  const mv = moveVector();
  p.moving = mv.x !== 0 || mv.y !== 0;
  if (p.moving) p.dir = Math.atan2(mv.y, mv.x);

  // Dash.
  if (pressed('Shift') && p.dashCd <= 0 && p.moving) {
    p.dashT = TUNE.dashTime;
    p.dashCd = TUNE.dashCooldown;
    p.dashX = mv.x;
    p.dashY = mv.y;
    p.noise = Math.min(100, p.noise + TUNE.noiseDash);
  }
  let speed = TUNE.walkSpeed;
  let vx = mv.x * speed;
  let vy = mv.y * speed;
  if (p.dashT > 0) {
    p.dashT -= dt;
    vx = p.dashX * TUNE.dashSpeed;
    vy = p.dashY * TUNE.dashSpeed;
  }
  const next = collide(st, p.x + vx * dt, p.y + vy * dt, TUNE.playerRadius);
  p.x = next.x;
  p.y = next.y;

  // Dust / visibility.
  const light = lightAt(p.x, p.y, st.lanterns);
  const inLight = light > 0.35;
  let dDust = (inLight ? TUNE.dustLight : TUNE.dustShadow) * dt;
  if (!inLight && !p.moving) dDust += TUNE.dustStillShadow * dt;
  if (p.dashT > 0) dDust += TUNE.dustDash * dt;
  p.dust = Math.max(0, Math.min(100, p.dust + dDust));

  // Noise from movement.
  const walkRate = p.dashT > 0 ? 0 : TUNE.noiseWalk;
  p.noise = Math.min(100, p.noise + walkRate * dt);

  // Gadgets.
  if (pressed('KeyQ') || mouseClicked()) throwCoin();
  if (pressed('Digit2')) deploySmoke();
  if (pressed('Digit3') || pressed('KeyF')) snuffLantern();

  // Interact: vent, chain, hide.
  if (pressed('KeyE')) {
    const v = ventNear(st, p.x, p.y, 30);
    if (v) {
      p.vent = v.vent;
      p.ventFrom = v.end;
      p.ventT = 0;
      return;
    }
    const c = chainNear(st, p.x, p.y, 34);
    if (c) {
      p.swing = c;
      p.swingT = 0;
      return;
    }
    const cov = coverAt(st, p.x, p.y);
    if (cov) {
      p.hidden = true;
      p.hiddenCover = cov;
      p.dust = 0;
      return;
    }
  }

  // Prompt text for the HUD.
  if (ventNear(st, p.x, p.y, 30)) G.prompt = 'E — CRAWL VENT';
  else if (chainNear(st, p.x, p.y, 34)) G.prompt = 'E — GRAB CHAIN';
  else if (coverAt(st, p.x, p.y)) G.prompt = 'E — HIDE IN COVER';
  else if (lanternNear(st, p.x, p.y, TUNE.snuffRange * TILE) && p.snuff > 0) G.prompt = '3 / F — SNUFF LANTERN';
  else G.prompt = '';
}

// ---------------------------------------------------------------- guards
function updateGuards(dt) {
  const p = G.player;
  const st = G.state;
  const band = noiseBand();
  let maxSusp = 0;
  let anyAlarm = false;
  let anySusp = false;

  for (const g of st.guards) {
    g.stateTime += dt;
    const seen = playerSeenBy(g);
    if (seen) {
      g.lastSeen = { x: p.x, y: p.y };
      const d = dist(g.x, g.y, p.x, p.y);
      g.suspicion = Math.min(100, g.suspicion + TUNE.suspicionRate * visMult(p.dust, g) * falloff(d) * dt);
      G.unseenFor = 0;
    } else {
      const decay = p.dust < 20 ? TUNE.suspicionDecayShadow : TUNE.suspicionDecay;
      g.suspicion = Math.max(0, g.suspicion - decay * dt);
    }

    // Noise investigation: a guard inside the audible radius turns to look.
    if (p.noise >= 20 && g.state === 'PATROL') {
      const nd = dist(g.x, g.y, p.x, p.y);
      const radius = band.radius * TILE * g.hear;
      if (nd < radius) {
        g.state = 'SUSPICIOUS';
        g.stateTime = 0;
        g.target = { x: p.x, y: p.y };
        g.suspicion = Math.max(g.suspicion, TUNE.suspectAt);
      }
    }

    // State machine.
    if (g.state !== 'ALARM' && g.suspicion >= TUNE.alarmAt) {
      g.state = 'ALARM';
      g.stateTime = 0;
      raiseAlarm('guard');
      if (G.mode !== 'playing') return;
    } else if (g.state === 'PATROL' && g.suspicion >= TUNE.suspectAt) {
      g.state = 'SUSPICIOUS';
      g.stateTime = 0;
      g.target = g.lastSeen ? { ...g.lastSeen } : { x: p.x, y: p.y };
      G.heat = Math.min(100, G.heat + TUNE.heatSuspicion);
    } else if (g.state === 'SUSPICIOUS' && g.suspicion < TUNE.suspectAt) {
      g.state = 'PATROL';
      g.stateTime = 0;
      g.target = null;
    }

    if (g.state === 'ALARM') {
      anyAlarm = true;
      // Chase the player's live position.
      moveGuardToward(g, p.x, p.y, TUNE.chaseSpeed, dt);
      if (!seen && g.stateTime > TUNE.searchTime) {
        g.state = 'SUSPICIOUS';
        g.stateTime = 0;
        g.target = g.lastSeen ? { ...g.lastSeen } : null;
        g.suspicion = 60;
      }
    } else if (g.state === 'SUSPICIOUS') {
      anySusp = true;
      if (g.target) {
        const arrived = moveGuardToward(g, g.target.x, g.target.y, TUNE.suspectSpeed, dt);
        if (arrived) {
          // Look around for 3 s.
          g.dir += dt * 1.2;
          if (g.stateTime > TUNE.lookTime + 2) {
            g.state = 'PATROL';
            g.stateTime = 0;
            g.target = null;
          }
        }
      }
    } else {
      // PATROL: waypoints, or rotate in place for sentries.
      if (g.path.length <= 1) {
        if (g.type === 'watcher') {
          g.dir = Math.PI / 2; // fixed downward
        } else {
          // Sentry rotates 90 deg every 6 s.
          const period = 6;
          const phase = (G.time % period) / period;
          const base = Math.PI / 2;
          g.dir = base + Math.sin(phase * Math.PI * 2) * (Math.PI / 4);
        }
      } else {
        if (g.pause > 0) {
          g.pause -= dt;
        } else {
          const wp = g.path[g.wp];
          const arrived = moveGuardToward(g, wp.x, wp.y, g.speed, dt);
          if (arrived) {
            g.wp = (g.wp + 1) % g.path.length;
            g.pause = 0.8;
          }
        }
      }
    }

    // Warden re-lights snuffed lanterns after 10 s.
    if (g.type === 'warden') {
      g.relight -= dt;
      if (g.relight <= 0) {
        const off = st.lanterns.filter((l) => !l.on);
        if (off.length > 0) {
          off[0].on = true;
          off[0].offUntil = 0;
          g.relight = 10;
        } else {
          g.relight = 2;
        }
      }
    }

    maxSusp = Math.max(maxSusp, g.suspicion);
  }

  G.alarm = Math.max(maxSusp, G.alarm * 0.98);
  if (anyAlarm) G.detection = 'ALARM';
  else if (anySusp) G.detection = 'SUSPICIOUS';
  else if (p.hidden || p.vent) G.detection = 'HIDDEN';
  else G.detection = 'UNSEEN';
}

function moveGuardToward(g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return true;
  const step = Math.min(d, speed * dt);
  g.x += (dx / d) * step;
  g.y += (dy / d) * step;
  g.dir = Math.atan2(dy, dx);
  return d < 6;
}

// ---------------------------------------------------------------- cameras
function updateCameras(dt) {
  const p = G.player;
  const st = G.state;
  const period = G.heat > TUNE.heatHot ? TUNE.camPeriodHot : TUNE.camPeriod;
  for (const c of st.cameras) {
    c.dir = c.base + Math.sin((G.time * Math.PI * 2) / period) * (c.sweep / 2);
    // A snuffed lamp near the camera cuts its range to 3 tiles.
    let range = c.range;
    for (const l of st.lanterns) {
      if (!l.on && dist(l.x, l.y, c.x, c.y) < 3 * TILE) {
        range = 3 * TILE;
        break;
      }
    }
    const watcher = { x: c.x, y: c.y, dir: c.dir, half: c.half, range };
    const seen = !p.vent && !(p.hidden && dist(c.x, c.y, p.x, p.y) > 2 * TILE) &&
      canSee(watcher, p.x, p.y, st.walls, G.smokes);
    if (seen) {
      const fill = TUNE.camFill * (p.dashT > 0 ? 2 : 1);
      c.exposure = Math.min(100, c.exposure + fill * dt);
      G.unseenFor = 0;
      if (c.exposure >= 100) {
        c.exposure = 0;
        raiseAlarm('camera');
        if (G.mode !== 'playing') return;
      }
    } else {
      c.exposure = Math.max(0, c.exposure - 30 * dt);
    }
  }
}

// ---------------------------------------------------------------- lasers
function laserPhase(laser) {
  const cycle = TUNE.laserOnTime + TUNE.laserOffTime; // 4 s
  const t = (G.time + laser.offset) % cycle;
  if (t < TUNE.laserOnTime) return 'on';
  if (t >= cycle - TUNE.laserWarnTime) return 'warn';
  return 'off';
}

function updateLasers(dt) {
  const p = G.player;
  const st = G.state;
  if (p.vent || p.swing) return;
  for (const l of st.lasers) {
    if (G.time < l.deadUntil) continue;
    if (G.time < (l.coolUntil || 0)) continue;
    if (laserPhase(l) !== 'on') continue;
    // Distance from player centre to the beam segment.
    const dx = l.x2 - l.x1;
    const dy = l.y2 - l.y1;
    const len2 = dx * dx + dy * dy;
    let t = ((p.x - l.x1) * dx + (p.y - l.y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const nx = l.x1 + t * dx;
    const ny = l.y1 + t * dy;
    if (dist(p.x, p.y, nx, ny) < TUNE.playerRadius + 3) {
      p.noise = Math.min(100, p.noise + TUNE.noiseLaser);
      // One trip per laser per 2 s: standing on the beam must not stack
      // three strikes in three ticks — the player gets a chance to recover.
      l.coolUntil = G.time + 2;
      raiseAlarm('laser');
      return;
    }
  }
}

// ---------------------------------------------------------------- pickups / exit
function updatePickups(dt) {
  const p = G.player;
  const st = G.state;
  for (const loot of st.loot) {
    if (!loot.taken && dist(p.x, p.y, loot.x, loot.y) < 26) {
      loot.taken = true;
      G.lootValue += loot.value;
      G.lootGot++;
      G.score += loot.value;
    }
  }
  const o = st.objective;
  if (!o.taken && dist(p.x, p.y, o.x, o.y) < 28) {
    o.taken = true;
    p.hasObjective = true;
    if (st.def.id === 4) st.exit.open = true;
    if (st.def.id === 5 && st.objective2 && st.objective2.taken) {
      st.exit.open = true;
      G.escapeLeft = 12;
      G.escapeBonus = true;
      for (const g of st.guards) {
        if (g.state !== 'ALARM') {
          g.state = 'SUSPICIOUS';
          g.stateTime = 0;
          g.target = { x: p.x, y: p.y };
        }
      }
    }
    G.banner = o.name.toUpperCase() + ' TAKEN';
    G.bannerT = 2;
  }
  const o2 = st.objective2;
  if (o2 && !o2.taken && p.hasObjective && dist(p.x, p.y, o2.x, o2.y) < 28) {
    o2.taken = true;
    p.hasObjective2 = true;
    st.exit.open = true;
    G.escapeLeft = 12;
    G.escapeBonus = true;
    for (const g of st.guards) {
      if (g.state !== 'ALARM') {
        g.state = 'SUSPICIOUS';
        g.stateTime = 0;
        g.target = { x: p.x, y: p.y };
      }
    }
    G.banner = o2.name.toUpperCase() + ' TAKEN — RUN!';
    G.bannerT = 2;
  }
  if (G.escapeLeft > 0) {
    G.escapeLeft -= dt;
    if (G.escapeLeft <= 0) G.escapeBonus = false;
  }
  if (st.exit.open && pointInRect(p.x, p.y, st.exit)) {
    const need = st.def.id === 5 ? p.hasObjective && p.hasObjective2 : p.hasObjective;
    if (need) heistComplete();
  }
}

// ---------------------------------------------------------------- heat
function updateHeat(dt) {
  const p = G.player;
  const anySeen = G.state.guards.some((g) => g.suspicion > 0) ||
    G.state.cameras.some((c) => c.exposure > 0);
  if (!anySeen) {
    G.unseenFor += dt;
    if (G.unseenFor > 3) G.heat = Math.max(0, G.heat - TUNE.heatDecay * dt);
  } else {
    G.unseenFor = 0;
  }
  if (G.heat > TUNE.heatHot && !G.extraSpawned) {
    G.extraSpawned = true;
    const def = G.state.def;
    const gx = tileCx(12);
    const gy = tileCy(8);
    G.state.guards.push({
      name: 'X',
      type: 'patrol',
      path: [{ x: gx, y: gy }, { x: tileCx(6), y: tileCy(8) }, { x: tileCx(18), y: tileCy(8) }],
      wp: 0,
      x: gx,
      y: gy,
      dir: 0,
      speed: TUNE.patrolSpeed,
      cone: 60,
      half: 30 * DEG,
      range: 8 * TILE,
      hear: 1,
      state: 'PATROL',
      suspicion: 0,
      stateTime: 0,
      lastSeen: null,
      target: null,
      pause: 0,
      rotPhase: 0,
      relight: 0,
    });
    G.banner = 'HEAT HIGH — EXTRA PATROL';
    G.bannerT = 2;
  }
}

// ---------------------------------------------------------------- gust vents
function updateGusts(dt) {
  const st = G.state;
  if (st.gust.length === 0) return;
  const p = G.player;
  const active = (G.time % 7) < 2;
  if (!active) {
    G.gustHit = false;
    return;
  }
  for (const gz of st.gust) {
    if (!G.gustHit && pointInRect(p.x, p.y, gz)) {
      p.dust = Math.min(100, p.dust + TUNE.dustGust);
      G.gustHit = true;
      G.banner = 'GUST VENT — DUST +30';
      G.bannerT = 1.5;
    }
  }
}

// ---------------------------------------------------------------- coins / smoke
function updateGadgets(dt) {
  const p = G.player;
  for (const c of G.coins) c.t += dt;
  const landed = G.coins.filter((c) => c.t >= c.dur);
  for (const c of landed) {
    p.noise = Math.min(100, p.noise + TUNE.noiseCoin);
    for (const g of G.state.guards) {
      if (dist(g.x, g.y, c.tx, c.ty) < TUNE.coinNoiseRadius * TILE && g.state === 'PATROL') {
        g.state = 'SUSPICIOUS';
        g.stateTime = 0;
        g.target = { x: c.tx, y: c.ty };
        g.suspicion = Math.max(g.suspicion, TUNE.suspectAt);
      }
    }
  }
  G.coins = G.coins.filter((c) => c.t < c.dur + 0.4);
  for (const s of G.smokes) s.t -= dt;
  G.smokes = G.smokes.filter((s) => s.t > 0);
  // Lanterns re-light when their timer lapses.
  for (const l of G.state.lanterns) {
    if (!l.on && G.time >= l.offUntil) l.on = true;
  }
  // Noise decays.
  p.noise = Math.max(0, p.noise - TUNE.noiseDecay * dt);
  G.bannerT = Math.max(0, G.bannerT - dt);
  if (G.bannerT <= 0) G.banner = '';
}

// ---------------------------------------------------------------- main tick
export function step(dt) {
  G.frame++;
  if (G.mode === 'title') {
    if (pressed('Enter') || pressed('Space') || mouseClicked()) startHeist(0);
    return;
  }
  if (G.mode === 'heistDone') {
    if (pressed('Enter') || mouseClicked()) {
      if (G.heistIndex + 1 < HEIST_COUNT) startHeist(G.heistIndex + 1);
      else campaignComplete();
    }
    return;
  }
  if (G.mode === 'failed') {
    if (pressed('Enter') || mouseClicked()) startHeist(G.heistIndex);
    return;
  }
  if (G.mode === 'campaignDone') {
    if (pressed('Enter') || mouseClicked()) newCampaign();
    return;
  }
  if (G.mode === 'paused') {
    if (pressed('KeyP') || pressed('Escape')) G.mode = 'playing';
    return;
  }
  // playing
  if (pressed('KeyP') || pressed('Escape')) {
    G.mode = 'paused';
    return;
  }
  G.time += dt;
  updatePlayer(dt);
  if (G.mode !== 'playing') return;
  updateGadgets(dt);
  updateGuards(dt);
  if (G.mode !== 'playing') return;
  updateCameras(dt);
  if (G.mode !== 'playing') return;
  updateLasers(dt);
  if (G.mode !== 'playing') return;
  updatePickups(dt);
  if (G.mode !== 'playing') return;
  updateHeat(dt);
  updateGusts(dt);
  // Dust motes drift.
  for (const d of G.dust) {
    d.ph += dt * 0.4;
    d.y -= dt * 3;
    if (d.y < FIELD_OY) d.y = FIELD_OY + FIELD_H;
  }
}

// ---------------------------------------------------------------- boot / loop
let canvas = null;
let ctx = null;
let lastT = 0;

function loop(t) {
  const dt = Math.min(0.05, Math.max(0.001, (t - lastT) / 1000 || 0.016));
  lastT = t;
  step(dt);
  draw(ctx, G);
  requestAnimationFrame(loop);
}

export function init(c) {
  canvas = c;
  ctx = canvas.getContext('2d');
  newCampaign();
  const params = new URLSearchParams(window.location.search);
  if (params.has('shot')) {
    // Staged screenshot mode: build the shot, render once, stop.
    import('./shots.js').then((shots) => {
      shots.applyShot(G, parseInt(params.get('shot'), 10) || 1);
      draw(ctx, G);
      document.title = 'SHOT-READY';
      window.__shotReady = true;
    });
    return;
  }
  if (params.has('selftest')) {
    import('./shots.js').then((shots) => {
      shots.runSelfTest(G);
      draw(ctx, G);
    });
    return;
  }
  requestAnimationFrame((t) => {
    lastT = t;
    loop(t);
  });
}

// Test hooks (used by shots.js self-test and by headless playtests).
export function api() {
  return {
    G,
    step,
    startHeist,
    newCampaign,
    raiseAlarm,
    throwCoinAt(tx, ty) {
      const p = G.player;
      if (p.coins <= 0) return false;
      G.coins.push({ x: p.x, y: p.y, tx, ty, t: 0, dur: TUNE.coinFlight });
      p.coins--;
      return true;
    },
    teleport(x, y) {
      G.player.x = x;
      G.player.y = y;
    },
    setDust(v) {
      G.player.dust = v;
    },
  };
}
window.__game = api();

// Boot when the page loads (module scripts run after the DOM is parsed).
init(document.getElementById('game'));
