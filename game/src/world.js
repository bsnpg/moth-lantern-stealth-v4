// Moth & Lantern v4 — geometry and heist state.
// Pure helpers plus buildHeist(), which turns a config heist into the
// runtime objects the game loop and the renderer share. No rendering here.

import { FIELD_OX, FIELD_OY, TILE, COLS, ROWS, FIELD_W, FIELD_H, TUNE } from './config.js';

export const DEG = Math.PI / 180;

// Tile (col,row) centre in play-field pixels.
export function tileCx(tx) {
  return FIELD_OX + (tx + 0.5) * TILE;
}
export function tileCy(ty) {
  return FIELD_OY + (ty + 0.5) * TILE;
}

export function tileOfX(px) {
  return Math.floor((px - FIELD_OX) / TILE);
}
export function tileOfY(py) {
  return Math.floor((py - FIELD_OY) / TILE);
}

// A rect in tile coords -> a rect in pixels {x,y,w,h}.
export function tileRect(r) {
  return {
    x: FIELD_OX + r.x * TILE,
    y: FIELD_OY + r.y * TILE,
    w: r.w * TILE,
    h: r.h * TILE,
  };
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function circleRect(cx, cy, cr, r) {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < cr * cr;
}

// Smallest signed angle difference, in (-PI, PI].
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Segment (x1,y1)-(x2,y2) vs axis-aligned rect: slab test.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Segment vs circle (smoke clouds block sight).
export function segmentHitsCircle(x1, y1, x2, y2, cx, cy, cr) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return false;
  let t = ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  const ddx = cx - nx;
  const ddy = cy - ny;
  return ddx * ddx + ddy * ddy < cr * cr;
}

// Is the target inside the watcher cone (range px, half-angle rad) with a
// clear line of sight past walls and through no smoke cloud?
export function canSee(watcher, tx, ty, walls, smokes) {
  const dx = tx - watcher.x;
  const dy = ty - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > watcher.range) return false;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, watcher.dir)) > watcher.half) return false;
  for (const w of walls) {
    if (segmentHitsRect(watcher.x, watcher.y, tx, ty, w)) return false;
  }
  for (const s of smokes) {
    if (segmentHitsCircle(watcher.x, watcher.y, tx, ty, s.x, s.y, s.r)) return false;
  }
  return true;
}

// Is the point lit by any live lantern? Returns the strongest light 0..1.
export function lightAt(x, y, lanterns) {
  let best = 0;
  for (const l of lanterns) {
    if (!l.on) continue;
    const d = Math.hypot(x - l.x, y - l.y) / (l.r * TILE);
    if (d < 1) best = Math.max(best, 1 - d);
  }
  return best;
}

// Move a circle against the room: walls, gaps and the field border push it
// back out. Returns the corrected {x, y}.
export function collide(state, x, y, r) {
  const minX = FIELD_OX + r;
  const maxX = FIELD_OX + FIELD_W - r;
  const minY = FIELD_OY + r;
  const maxY = FIELD_OY + FIELD_H - r;
  x = Math.max(minX, Math.min(maxX, x));
  y = Math.max(minY, Math.min(maxY, y));
  for (const s of state.solids) {
    if (!circleRect(x, y, r, s)) continue;
    // Push out along the smallest penetration axis.
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - cx;
    const dy = y - cy;
    if (Math.abs(dx) > Math.abs(dy)) {
      x = dx > 0 ? s.x + s.w + r : s.x - r;
    } else {
      y = dy > 0 ? s.y + s.h + r : s.y - r;
    }
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
  }
  return { x, y };
}

// ---------------------------------------------------------------- heist state
export function buildHeist(def, index) {
  const solids = def.walls.map(tileRect).concat(def.gaps.map(tileRect));
  const lanterns = def.lanterns.map((l, i) => ({
    x: tileCx(l.x),
    y: tileCy(l.y),
    r: l.r,
    laser: l.laser,
    on: true,
    offUntil: 0,
    index: i,
  }));
  const guards = def.guards.map((g) => {
    const path = g.path.map(([tx, ty]) => ({ x: tileCx(tx), y: tileCy(ty) }));
    const hear = g.type === 'bellwright' ? 1.3 : 1.0;
    return {
      name: g.name,
      type: g.type,
      path,
      wp: 0,
      x: path[0].x,
      y: path[0].y,
      dir: g.type === 'sentry' || g.type === 'watcher' ? Math.PI / 2 : 0,
      speed: TUNE.patrolSpeed * (g.speed || 1),
      cone: g.cone,
      half: (g.cone / 2) * DEG,
      range: g.range * TILE,
      hear,
      state: 'PATROL',
      suspicion: 0,
      stateTime: 0,
      lastSeen: null,
      target: null,
      pause: 0,
      rotPhase: 0,
      relight: 0,
    };
  });
  const cameras = def.cameras.map((c, i) => ({
    x: tileCx(c.x),
    y: tileCy(c.y),
    base: c.base * DEG,
    sweep: c.sweep * DEG,
    period: c.period,
    range: c.range * TILE,
    half: (55 / 2) * DEG,
    dir: c.base * DEG,
    sweepDir: 1,
    exposure: 0,
    index: i,
  }));
  const lasers = def.lasers.map((l, i) => ({
    x1: tileCx(l.x1),
    y1: tileCy(l.y1),
    x2: tileCx(l.x2),
    y2: tileCy(l.y2),
    offset: l.offset,
    lantern: l.lantern,
    deadUntil: 0,
    index: i,
  }));
  const vents = def.vents.map((v) => ({
    ax: tileCx(v.x1),
    ay: tileCy(v.y1),
    bx: tileCx(v.x2),
    by: tileCy(v.y2),
  }));
  const chains = def.chains.map((c) => ({
    ax: tileCx(c.x1),
    ay: tileCy(c.y1),
    bx: tileCx(c.x2),
    by: tileCy(c.y2),
  }));
  return {
    def,
    index,
    solids,
    walls: def.walls.map(tileRect),
    gaps: def.gaps.map(tileRect),
    gust: def.gust.map(tileRect),
    lanterns,
    cover: def.cover.map((c) => ({ ...tileRect(c), kind: c.kind })),
    loot: def.loot.map((l) => ({ x: tileCx(l.x), y: tileCy(l.y), value: l.value, label: l.label, taken: false })),
    objective: { x: tileCx(def.objective.x), y: tileCy(def.objective.y), name: def.objective.name, icon: def.objective.icon, taken: false },
    objective2: def.objective2
      ? { x: tileCx(def.objective2.x), y: tileCy(def.objective2.y), name: def.objective2.name, icon: def.objective2.icon, taken: false }
      : null,
    exit: { ...tileRect(def.exit), label: def.exit.label, open: def.id !== 4 && def.id !== 5 },
    start: { x: tileCx(def.start.x), y: tileCy(def.start.y) },
    guards,
    cameras,
    lasers,
    vents,
    chains,
  };
}

// Nearest cover rect the player stands inside (or null).
export function coverAt(state, x, y) {
  for (const c of state.cover) {
    if (pointInRect(x, y, c)) return c;
  }
  return null;
}

// Nearest vent mouth within reach (px), or null with the vent and end.
export function ventNear(state, x, y, reach) {
  for (const v of state.vents) {
    if (Math.hypot(x - v.ax, y - v.ay) < reach) return { vent: v, end: 'a' };
    if (Math.hypot(x - v.bx, y - v.by) < reach) return { vent: v, end: 'b' };
  }
  return null;
}

// Nearest chain anchor within reach (px), or null.
export function chainNear(state, x, y, reach) {
  for (const c of state.chains) {
    if (Math.hypot(x - c.ax, y - c.ay) < reach) return c;
  }
  return null;
}

// Nearest live lantern within reach (px), or null.
export function lanternNear(state, x, y, reach) {
  let best = null;
  let bestD = reach;
  for (const l of state.lanterns) {
    if (!l.on) continue;
    const d = Math.hypot(x - l.x, y - l.y);
    if (d < bestD) { best = l; bestD = d; }
  }
  return best;
}
