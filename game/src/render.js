// Moth & Lantern v4 — all canvas drawing: the room, the actors, the
// vision cones, the right-panel HUD and the overlay cards. Reads G only.

import { PAL, VIEW_W, VIEW_H, PANEL_X, PANEL_W, FIELD_OX, FIELD_OY, TILE, COLS, ROWS, FIELD_W, FIELD_H, TUNE, HEISTS, CONTROLS, LEGEND } from './config.js';
import { DEG, tileCx, tileCy } from './world.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, font, color, align) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function wedge(ctx, x, y, dir, half, range, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - half, dir + half);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return m + ':' + String(r).padStart(2, '0');
}

// Split a string into lines that fit maxWidth (at most two lines).
function wrapText(ctx, s, font, maxWidth) {
  ctx.font = font;
  if (ctx.measureText(s).width <= maxWidth) return [s];
  const words = s.split(' ');
  const lines = [''];
  for (const word of words) {
    const trial = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + word : word;
    if (ctx.measureText(trial).width <= maxWidth || lines[lines.length - 1] === '') {
      lines[lines.length - 1] = trial;
    } else if (lines.length < 2) {
      lines.push(word);
    } else {
      lines[lines.length - 1] += ' ' + word;
    }
  }
  return lines;
}

// ---------------------------------------------------------------- field
function drawFloor(ctx, G) {
  const st = G.state;
  ctx.fillStyle = PAL.floorA;
  ctx.fillRect(FIELD_OX, FIELD_OY, FIELD_W, FIELD_H);
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if ((c + r) % 2 === 0) {
        ctx.fillStyle = PAL.floorB;
        ctx.fillRect(FIELD_OX + c * TILE, FIELD_OY + r * TILE, TILE, TILE);
      }
    }
  }
  // Gold veins: thin diagonal ticks, seeded by tile.
  ctx.strokeStyle = PAL.goldVein;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const h = ((c * 31 + r * 17) % 7);
      if (h === 0) {
        const x = FIELD_OX + c * TILE + 8;
        const y = FIELD_OY + r * TILE + 8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 12, y + 12);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  // Open-air gaps: near-black void with stars.
  for (const g of st.gaps) {
    ctx.fillStyle = PAL.gap;
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = '#cdd6ff';
    for (let i = 0; i < 6; i++) {
      const sx = g.x + 8 + ((i * 37 + 11) % Math.max(8, g.w - 16));
      const sy = g.y + 8 + ((i * 53 + 7) % Math.max(8, g.h - 16));
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.strokeStyle = '#3a3a66';
    ctx.strokeRect(g.x + 0.5, g.y + 0.5, g.w, g.h);
  }
  // Gust zones (heist 5): faint updraft swirls when active.
  const gustActive = st.gust.length > 0 && (G.time % 7) < 2;
  for (const gz of st.gust) {
    ctx.fillStyle = gustActive ? 'rgba(180, 220, 255, 0.10)' : 'rgba(180, 220, 255, 0.04)';
    ctx.fillRect(gz.x, gz.y, gz.w, gz.h);
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(gz.x + 0.5, gz.y + 0.5, gz.w, gz.h);
    ctx.setLineDash([]);
  }
}

function drawLightPools(ctx, G) {
  const st = G.state;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of st.lanterns) {
    if (!l.on) continue;
    const r = l.r * TILE;
    const grad = ctx.createRadialGradient(l.x, l.y, 6, l.x, l.y, r);
    grad.addColorStop(0, 'rgba(255, 214, 90, 0.30)');
    grad.addColorStop(0.6, 'rgba(255, 190, 60, 0.12)');
    grad.addColorStop(1, 'rgba(255, 190, 60, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWalls(ctx, G) {
  const st = G.state;
  for (const w of st.walls) {
    ctx.fillStyle = PAL.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = PAL.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 3);
    ctx.strokeStyle = PAL.wallEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w, w.h);
  }
  // Field border.
  ctx.strokeStyle = '#3a3a66';
  ctx.lineWidth = 2;
  ctx.strokeRect(FIELD_OX, FIELD_OY, FIELD_W, FIELD_H);
}

function drawCover(ctx, G) {
  const st = G.state;
  for (const c of st.cover) {
    if (c.kind === 'fern' || c.kind === 'planter') {
      ctx.fillStyle = c.kind === 'fern' ? '#2e5d33' : '#274d2e';
      rr(ctx, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 6);
      ctx.fill();
      ctx.fillStyle = '#4d8a4d';
      for (let i = 0; i < 5; i++) {
        const fx = c.x + 8 + ((i * 29) % Math.max(10, c.w - 16));
        const fy = c.y + 8 + ((i * 41) % Math.max(10, c.h - 16));
        ctx.beginPath();
        ctx.arc(fx, fy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (c.kind === 'planter') {
        ctx.fillStyle = '#dda0dd';
        ctx.beginPath();
        ctx.arc(c.x + c.w / 2, c.y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (c.kind === 'crate') {
      ctx.fillStyle = '#6b4a2a';
      ctx.fillRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
      ctx.strokeStyle = '#8a6a42';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
      ctx.beginPath();
      ctx.moveTo(c.x + 2, c.y + 2);
      ctx.lineTo(c.x + c.w - 2, c.y + c.h - 2);
      ctx.moveTo(c.x + c.w - 2, c.y + 2);
      ctx.lineTo(c.x + 2, c.y + c.h - 2);
      ctx.stroke();
    } else {
      // desk
      ctx.fillStyle = '#4a3421';
      rr(ctx, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 4);
      ctx.fill();
      ctx.fillStyle = PAL.goldDim;
      ctx.fillRect(c.x + 2, c.y + 2, c.w - 4, 3);
    }
  }
}

function drawLanterns(ctx, G) {
  const st = G.state;
  for (const l of st.lanterns) {
    if (l.on) {
      ctx.fillStyle = '#3a2c10';
      ctx.beginPath();
      ctx.arc(l.x, l.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PAL.lanternCore;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAL.gold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#22223a';
      ctx.beginPath();
      ctx.arc(l.x, l.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#55557a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      text(ctx, '✕', l.x, l.y + 4, 'bold 10px sans-serif', '#77779a', 'center');
    }
    if (l.laser >= 0) {
      text(ctx, '⚡', l.x + 14, l.y - 10, '10px sans-serif', PAL.amber, 'center');
    }
  }
}

function drawObjective(ctx, G) {
  const st = G.state;
  const drawOne = (o, label) => {
    if (o.taken) return;
    const pulse = 0.6 + 0.4 * Math.sin(G.time * 3 + G.frame * 0.02);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.3 * pulse;
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.arc(o.x, o.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = PAL.gold;
    if (o.icon === 'bloom') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(o.x + Math.cos(a) * 8, o.y + Math.sin(a) * 8, 6, 4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ff8fd0';
      ctx.beginPath();
      ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.icon === 'ledger' || o.icon === 'codex') {
      ctx.fillStyle = o.icon === 'ledger' ? '#c9a227' : '#4a6fa5';
      rr(ctx, o.x - 10, o.y - 12, 20, 24, 2);
      ctx.fill();
      ctx.fillStyle = PAL.gold;
      ctx.fillRect(o.x - 6, o.y - 8, 12, 2);
      ctx.fillRect(o.x - 6, o.y - 3, 12, 2);
    } else if (o.icon === 'clapper') {
      ctx.fillStyle = PAL.gold;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - 12);
      ctx.lineTo(o.x + 9, o.y + 8);
      ctx.lineTo(o.x - 9, o.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(o.x, o.y + 11, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.icon === 'key') {
      ctx.strokeStyle = PAL.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(o.x - 4, o.y - 4, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(o.x + 1, o.y + 1);
      ctx.lineTo(o.x + 10, o.y + 10);
      ctx.moveTo(o.x + 6, o.y + 6);
      ctx.lineTo(o.x + 10, o.y + 2);
      ctx.stroke();
    } else {
      // crown
      ctx.fillStyle = PAL.gold;
      ctx.beginPath();
      ctx.moveTo(o.x - 11, o.y + 8);
      ctx.lineTo(o.x - 11, o.y - 6);
      ctx.lineTo(o.x - 5, o.y + 1);
      ctx.lineTo(o.x, o.y - 10);
      ctx.lineTo(o.x + 5, o.y + 1);
      ctx.lineTo(o.x + 11, o.y - 6);
      ctx.lineTo(o.x + 11, o.y + 8);
      ctx.closePath();
      ctx.fill();
    }
    text(ctx, label, o.x, o.y + 40, 'bold 10px sans-serif', PAL.gold, 'center');
  };
  drawOne(st.objective, st.objective.name.toUpperCase());
  if (st.objective2) drawOne(st.objective2, st.objective2.name.toUpperCase());
}

function drawLoot(ctx, G) {
  for (const l of G.state.loot) {
    if (l.taken) continue;
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5c00';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, '$' + l.value, l.x, l.y + 20, '9px sans-serif', PAL.textDim, 'center');
  }
}

function drawExit(ctx, G) {
  const e = G.state.exit;
  const open = e.open;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  ctx.save();
  if (open) {
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(G.time * 2);
    ctx.fillStyle = '#7ddc7d';
    ctx.fillRect(e.x - 4, e.y - 4, e.w + 8, e.h + 8);
    ctx.restore();
    ctx.fillStyle = '#1d5c2e';
    rr(ctx, e.x, e.y, e.w, e.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#7ddc7d';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
    text(ctx, 'EXIT', cx, cy + 4, 'bold 11px sans-serif', '#c8f5c8', 'center');
  } else {
    ctx.restore();
    ctx.fillStyle = '#2a2a44';
    rr(ctx, e.x, e.y, e.w, e.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#55557a';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
    text(ctx, 'LOCKED', cx, cy + 4, 'bold 10px sans-serif', '#8a86a8', 'center');
  }
  text(ctx, e.label, cx, e.y - 8 < FIELD_OY + 12 ? e.y + e.h + 14 : e.y - 8, 'bold 10px sans-serif', open ? '#7ddc7d' : '#8a86a8', 'center');
}

function drawVentsChains(ctx, G) {
  const st = G.state;
  for (const v of st.vents) {
    for (const [x, y] of [[v.ax, v.ay], [v.bx, v.by]]) {
      ctx.fillStyle = '#1a1a30';
      ctx.fillRect(x - 13, y - 13, 26, 26);
      ctx.strokeStyle = '#55557a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 13, y - 13, 26, 26);
      ctx.strokeStyle = '#77779a';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 10, y + i * 6);
        ctx.lineTo(x + 10, y + i * 6);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(119, 119, 154, 0.5)';
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(v.ax, v.ay);
    ctx.lineTo(v.bx, v.by);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const c of st.chains) {
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.ax, c.ay);
    const mx = (c.ax + c.bx) / 2;
    const my = (c.ay + c.by) / 2 + 22;
    ctx.quadraticCurveTo(mx, my, c.bx, c.by);
    ctx.stroke();
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.arc(c.ax, c.ay, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.bx, c.by, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLasers(ctx, G) {
  const st = G.state;
  const cycle = TUNE.laserOnTime + TUNE.laserOffTime;
  for (const l of st.lasers) {
    const dead = G.time < l.deadUntil;
    const t = (G.time + l.offset) % cycle;
    const phase = dead ? 'dead' : t < TUNE.laserOnTime ? 'on' : t >= cycle - TUNE.laserWarnTime ? 'warn' : 'off';
    for (const [x, y] of [[l.x1, l.y1], [l.x2, l.y2]]) {
      ctx.fillStyle = phase === 'on' ? PAL.laserOn : '#3a2a2a';
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.strokeStyle = phase === 'on' ? '#ff8080' : '#555';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 6, y - 6, 12, 12);
    }
    if (phase === 'on') {
      ctx.save();
      ctx.shadowColor = PAL.laserOn;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = PAL.laserOn;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.restore();
    } else if (phase === 'warn') {
      ctx.strokeStyle = PAL.laserWarn;
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = PAL.laserOff;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    }
    if (dead) {
      text(ctx, 'DEAD 6s', (l.x1 + l.x2) / 2, (l.y1 + l.y2) / 2 - 10, 'bold 10px sans-serif', PAL.textDim, 'center');
    }
  }
}

function drawCones(ctx, G) {
  const st = G.state;
  // Camera cones first (under guard cones).
  for (const c of st.cameras) {
    wedge(ctx, c.x, c.y, c.dir, c.half, c.range, PAL.coneCamera, PAL.coneCameraEdge);
  }
  for (const g of st.guards) {
    const fill = g.state === 'ALARM' ? PAL.coneAlarm : PAL.coneGuard;
    const edge = g.state === 'ALARM' ? PAL.coneAlarmEdge : PAL.coneGuardEdge;
    wedge(ctx, g.x, g.y, g.dir, g.half, g.range, fill, edge);
  }
}

function drawCameras(ctx, G) {
  for (const c of G.state.cameras) {
    ctx.fillStyle = '#22223a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.exposure > 50 ? '#ff4040' : PAL.cyan;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (c.exposure > 0) {
      ctx.fillStyle = '#ff4040';
      ctx.fillRect(c.x - 10, c.y - 20, 20 * (c.exposure / 100), 3);
    }
  }
}

function drawGuards(ctx, G) {
  const st = G.state;
  for (const g of st.guards) {
    const robe = g.type === 'hunter' ? '#2e2e4e' : g.type === 'captain' ? '#c9a227' : PAL.guardRobe;
    const robeDark = g.type === 'hunter' ? '#1c1c34' : PAL.guardRobeDark;
    // Footstep pulse.
    const pulse = (G.time * 2 + g.x * 0.01) % 1;
    ctx.strokeStyle = 'rgba(232, 200, 144, ' + (0.25 * (1 - pulse)) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 14 + pulse * 10, 0, Math.PI * 2);
    ctx.stroke();
    // Body.
    ctx.fillStyle = robeDark;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 10, 0, Math.PI * 2);
    ctx.fill();
    // Head + facing tick.
    ctx.fillStyle = PAL.guardHead;
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.dir) * 4, g.y + Math.sin(g.dir) * 4, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2b52';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.dir) * 8, g.y + Math.sin(g.dir) * 8);
    ctx.lineTo(g.x + Math.cos(g.dir) * 16, g.y + Math.sin(g.dir) * 16);
    ctx.stroke();
    // Type marks.
    if (g.type === 'bellwright') {
      ctx.fillStyle = PAL.gold;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - 18);
      ctx.lineTo(g.x + 5, g.y - 8);
      ctx.lineTo(g.x - 5, g.y - 8);
      ctx.closePath();
      ctx.fill();
    }
    if (g.type === 'warden') {
      ctx.fillStyle = PAL.lanternCore;
      ctx.beginPath();
      ctx.arc(g.x + 12, g.y - 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (g.type === 'captain') {
      ctx.strokeStyle = PAL.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 15, 0, Math.PI * 2);
      ctx.stroke();
    }
    // State bubble + label.
    if (g.state === 'ALARM') {
      ctx.fillStyle = PAL.red;
      ctx.beginPath();
      ctx.arc(g.x, g.y - 26, 9, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '!', g.x, g.y - 22, 'bold 13px sans-serif', '#fff', 'center');
      text(ctx, 'ANSWERING ALARM', g.x, g.y - 38, 'bold 9px sans-serif', PAL.red, 'center');
    } else if (g.state === 'SUSPICIOUS') {
      ctx.fillStyle = PAL.amber;
      ctx.beginPath();
      ctx.arc(g.x, g.y - 26, 9, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '?', g.x, g.y - 22, 'bold 13px sans-serif', '#1a1a2a', 'center');
      text(ctx, 'WHAT WAS THAT?', g.x, g.y - 38, 'bold 9px sans-serif', PAL.amber, 'center');
    }
    text(ctx, 'Guard ' + g.name + ' · ' + g.state, g.x, g.y + 26, '9px sans-serif', PAL.textDim, 'center');
  }
}

function drawPlayer(ctx, G) {
  const p = G.player;
  const st = G.state;
  if (p.vent) {
    // Peek out of the vent mouth: a small moth, still clearly hidden.
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(0.7, 0.7);
    ctx.fillStyle = PAL.mothWing;
    ctx.beginPath();
    ctx.ellipse(-9, -2, 9, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(9, -2, 9, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.mothBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    text(ctx, 'HIDDEN', p.x, p.y - 24, 'bold 10px sans-serif', PAL.grey, 'center');
    return;
  }
  // Dust trail when lit.
  const lit = p.dust >= 20;
  if (lit) {
    ctx.fillStyle = PAL.mothDust;
    for (let i = 0; i < 5; i++) {
      const a = (G.time * 2 + i * 1.3) % (Math.PI * 2);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 12, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const flap = Math.sin(G.time * 10 + G.frame * 0.15) * 0.35;
  const swingTilt = p.swing ? 0.5 : 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.dir + Math.PI / 2 + swingTilt);
  // Wings.
  ctx.fillStyle = PAL.mothWing;
  ctx.beginPath();
  ctx.ellipse(-9, -2, 9, 6 + flap * 6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(9, -2, 9, 6 + flap * 6, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAL.mothWingDark;
  ctx.beginPath();
  ctx.ellipse(-8, 6, 6, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, 6, 6, 4, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = PAL.mothBody;
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Antennae.
  ctx.strokeStyle = PAL.mothBody;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2, -8);
  ctx.quadraticCurveTo(-6, -14, -9, -13);
  ctx.moveTo(2, -8);
  ctx.quadraticCurveTo(6, -14, 9, -13);
  ctx.stroke();
  ctx.restore();
  // Crown on the back once taken (heist 5).
  if (p.hasObjective2) {
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.moveTo(p.x - 8, p.y - 12);
    ctx.lineTo(p.x - 8, p.y - 18);
    ctx.lineTo(p.x - 4, p.y - 14);
    ctx.lineTo(p.x, p.y - 20);
    ctx.lineTo(p.x + 4, p.y - 14);
    ctx.lineTo(p.x + 8, p.y - 18);
    ctx.lineTo(p.x + 8, p.y - 12);
    ctx.closePath();
    ctx.fill();
  }
  // Whisper text under the moth.
  const whisper = p.hidden ? 'HIDDEN' : p.dust < 20 ? 'IN SHADOW' : p.dust < 60 ? 'IN DIM' : 'IN THE LIGHT';
  text(ctx, whisper, p.x, p.y + 28, 'bold 9px sans-serif', p.dust < 20 ? PAL.green : p.dust < 60 ? PAL.amber : PAL.red, 'center');
  if (p.hidden) {
    text(ctx, 'HIDDEN', p.x, p.y - 24, 'bold 10px sans-serif', PAL.grey, 'center');
  }
  // Gadget counts near the player.
  text(ctx, '◉ ' + p.coins + '  ☁ ' + p.smoke + '  ✦ ' + p.snuff, p.x, p.y + 42, '10px sans-serif', PAL.textDim, 'center');
}

function drawCoinsSmoke(ctx, G) {
  for (const c of G.coins) {
    const t = Math.min(1, c.t / c.dur);
    const x = c.x + (c.tx - c.x) * t;
    const y = c.y + (c.ty - c.y) * t - Math.sin(t * Math.PI) * 40;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.quadraticCurveTo((c.x + c.tx) / 2, (c.y + c.ty) / 2 - 50, x, y);
    ctx.stroke();
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const s of G.smokes) {
    const a = Math.min(1, s.t / 1.5);
    ctx.fillStyle = 'rgba(150, 160, 200, ' + (0.5 * a) + ')';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.7, 0, Math.PI * 2);
    ctx.arc(s.x - s.r * 0.4, s.y + s.r * 0.2, s.r * 0.5, 0, Math.PI * 2);
    ctx.arc(s.x + s.r * 0.4, s.y - s.r * 0.2, s.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.smokeEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawDustMotes(ctx, G) {
  ctx.fillStyle = PAL.mothDust;
  for (const d of G.dust) {
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(d.ph);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- HUD panel
function panelBar(ctx, x, y, w, frac, color, bg) {
  ctx.fillStyle = bg || '#0a0a1e';
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(w, w * frac)), 10);
  ctx.strokeStyle = PAL.panelLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, 10);
}

function drawPanel(ctx, G) {
  const p = G.player;
  const st = G.state;
  const def = st.def;
  const x0 = PANEL_X;
  const w = PANEL_W;
  ctx.fillStyle = PAL.panel;
  ctx.fillRect(x0, 0, w, VIEW_H);
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(x0, 0, 2, VIEW_H);
  let y = 22;
  const L = (s, yy, font, color, align) => text(ctx, s, align === 'right' ? x0 + w - 12 : x0 + 12, yy, font || '11px sans-serif', color || PAL.text, align);
  const section = (label) => {
    L(label, y, 'bold 10px sans-serif', PAL.textDim);
    y += 14;
  };

  // 1. Heist header + objective (wrapped to two lines when long).
  text(ctx, 'HEIST ' + (G.heistIndex + 1) + '/5 — ' + def.name, x0 + 12, y, 'bold 12px sans-serif', PAL.gold);
  y += 16;
  const objLines = wrapText(ctx, def.objectiveText, '10px sans-serif', w - 24);
  for (const line of objLines) {
    text(ctx, line, x0 + 12, y, '10px sans-serif', PAL.textDim);
    y += 12;
  }
  y += 4;
  ctx.fillStyle = PAL.panelLine;
  ctx.fillRect(x0 + 12, y, w - 24, 1);
  y += 12;

  // 2. Detection chip.
  const det = G.detection;
  const detColor = det === 'ALARM' ? PAL.red : det === 'SUSPICIOUS' ? PAL.amber : PAL.grey;
  section('DETECTION');
  ctx.fillStyle = det === 'ALARM' ? 'rgba(255, 64, 64, 0.25)' : det === 'SUSPICIOUS' ? 'rgba(255, 179, 71, 0.2)' : 'rgba(138, 134, 168, 0.15)';
  rr(ctx, x0 + 12, y - 11, 130, 20, 4);
  ctx.fill();
  ctx.strokeStyle = detColor;
  ctx.lineWidth = det === 'ALARM' ? 2 : 1;
  ctx.stroke();
  text(ctx, det === 'ALARM' ? 'ALARM !' : det === 'SUSPICIOUS' ? 'SUSPICIOUS ?' : det, x0 + 20, y + 3, 'bold 11px sans-serif', detColor);
  y += 16;

  // 3. Alarm bar.
  section('ALARM');
  panelBar(ctx, x0 + 12, y, w - 24, G.alarm / 100, G.alarm > 70 ? PAL.red : PAL.amber);
  y += 18;
  [25, 50, 75].forEach((t) => {
    ctx.fillStyle = PAL.panelLine;
    ctx.fillRect(x0 + 12 + (w - 24) * (t / 100), y - 18, 1, 10);
  });

  // 4. Visibility.
  const vis = p.dust < 20 ? 'IN SHADOW' : p.dust < 60 ? 'IN DIM' : 'IN THE LIGHT';
  const visColor = p.dust < 20 ? PAL.green : p.dust < 60 ? PAL.amber : PAL.red;
  section('VISIBILITY');
  text(ctx, vis + '  ·  dust ' + Math.round(p.dust), x0 + 12, y, '11px sans-serif', visColor);
  y += 8;
  panelBar(ctx, x0 + 12, y, w - 24, p.dust / 100, visColor);
  y += 20;

  // 5. Noise.
  const noiseName = p.noise < 20 ? 'SILENT' : p.noise < 60 ? 'RUSTLE' : 'LOUD';
  const noiseColor = p.noise < 20 ? PAL.green : p.noise < 60 ? PAL.amber : PAL.red;
  section('NOISE');
  text(ctx, noiseName, x0 + 12, y, '11px sans-serif', noiseColor);
  y += 8;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = p.noise / 100 > i / 3 ? noiseColor : '#0a0a1e';
    ctx.fillRect(x0 + 12 + i * ((w - 24) / 3 + 2), y, (w - 24) / 3 - 2, 8);
  }
  y += 18;

  // 6. Heat.
  section('HEAT');
  if (G.heat > 70) text(ctx, 'HOT — extra patrol!', x0 + w - 12, y - 14, '9px sans-serif', PAL.red, 'right');
  panelBar(ctx, x0 + 12, y, w - 24, G.heat / 100, G.heat > 70 ? PAL.red : '#c96a2a');
  y += 20;

  // 7-9. Loot / Spotted / Strikes.
  const lootTotal = def.loot.length;
  L('LOOT  $' + G.lootValue + '   ' + G.lootGot + '/' + lootTotal, y, '11px sans-serif', PAL.gold);
  y += 15;
  L('SPOTTED  ' + G.spotted, y, '11px sans-serif', G.spotted > 0 ? PAL.red : PAL.text);
  y += 15;
  L('STRIKES', y, '11px sans-serif', PAL.text);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < G.strikes ? PAL.red : '#0a0a1e';
    ctx.beginPath();
    ctx.arc(x0 + 90 + i * 20, y - 3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.panelLine;
    ctx.stroke();
  }
  y += 18;

  // 10. Score / Best.
  L('SCORE  ' + G.score, y, 'bold 12px sans-serif', PAL.gold);
  L('BEST  ' + G.best, y, '11px sans-serif', PAL.textDim, 'right');
  y += 20;
  ctx.fillStyle = PAL.panelLine;
  ctx.fillRect(x0 + 12, y, w - 24, 1);
  y += 12;

  // 11. Guards list.
  section('GUARDS');
  const rows = [];
  for (const g of st.guards) rows.push('Guard ' + g.name + ' · ' + g.state);
  for (const c of st.cameras) rows.push('Camera ' + (c.index + 1) + ' · ' + (c.exposure > 50 ? 'ALERT!' : 'SWEEPING'));
  for (const l of st.lasers) {
    const dead = G.time < l.deadUntil;
    rows.push('Laser ' + (l.index + 1) + ' · ' + (dead ? 'DEAD' : 'ARMED'));
  }
  for (const r of rows.slice(0, 7)) {
    const col = r.includes('ALARM') || r.includes('ALERT') ? PAL.red : r.includes('SUSPICIOUS') ? PAL.amber : PAL.textDim;
    text(ctx, r, x0 + 12, y, '10px sans-serif', col);
    y += 13;
  }
  if (rows.length > 7) {
    text(ctx, '+' + (rows.length - 7) + ' more', x0 + 12, y, '10px sans-serif', PAL.textDim);
    y += 13;
  }
  y += 2;

  // 12. Heist progress.
  section('HEIST PROGRESS');
  HEISTS.forEach((h, i) => {
    const mark = G.heistDone[i] ? '✓' : i === G.heistIndex ? '●' : '○';
    const col = G.heistDone[i] ? PAL.gold : i === G.heistIndex ? PAL.text : PAL.textDim;
    text(ctx, mark + '  ' + (i + 1) + '. ' + h.short, x0 + 12, y, '10px sans-serif', col);
    y += 13;
  });
  y += 2;

  // 13. Legend (two columns).
  section('LEGEND');
  const half = Math.ceil(LEGEND.length / 2);
  LEGEND.forEach(([kind, label], i) => {
    const col = i < half ? 0 : 1;
    const row = i % half;
    const lx = x0 + 12 + col * 140;
    const ly = y + row * 13;
    drawLegendIcon(ctx, kind, lx, ly - 8);
    text(ctx, label, lx + 16, ly + 2, '9px sans-serif', PAL.textDim);
  });
  y += half * 13 + 6;

  // 14. Controls.
  section('CONTROLS');
  for (const [k, v] of CONTROLS) {
    text(ctx, k, x0 + 12, y, 'bold 9px sans-serif', PAL.text);
    text(ctx, v, x0 + 110, y, '9px sans-serif', PAL.textDim);
    y += 11;
  }
  // Gadget stock at the bottom.
  y += 2;
  text(ctx, 'Coins ' + p.coins + '   Smoke ' + p.smoke + '   Snuff ' + p.snuff, x0 + 12, y, '10px sans-serif', PAL.gold);
}

function drawLegendIcon(ctx, kind, x, y) {
  if (kind === 'cone') {
    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x + 12, y);
    ctx.lineTo(x + 12, y + 10);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'cam') {
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x + 12, y);
    ctx.lineTo(x + 12, y + 10);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'alarm') {
    ctx.fillStyle = PAL.red;
    ctx.beginPath();
    ctx.arc(x + 6, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, '!', x + 6, y + 9, 'bold 9px sans-serif', '#fff', 'center');
  } else if (kind === 'coin') {
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.arc(x + 6, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'smoke') {
    ctx.fillStyle = 'rgba(150, 160, 200, 0.8)';
    ctx.beginPath();
    ctx.arc(x + 6, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'snuff') {
    ctx.fillStyle = PAL.lanternCore;
    ctx.beginPath();
    ctx.arc(x + 6, y + 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.gold;
    ctx.beginPath();
    ctx.arc(x + 6, y + 5, 6, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'laser') {
    ctx.strokeStyle = PAL.laserOn;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x + 12, y + 5);
    ctx.stroke();
  } else if (kind === 'vent') {
    ctx.strokeStyle = '#77779a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, 10, 8);
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 5);
    ctx.lineTo(x + 11, y + 5);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#4d8a4d';
    ctx.beginPath();
    ctx.arc(x + 6, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- overlays
function drawTopBar(ctx, G) {
  ctx.fillStyle = '#0e0e22';
  ctx.fillRect(0, 0, PANEL_X, 34);
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(0, 33, PANEL_X, 1);
  text(ctx, 'MOTH & LANTERN', 16, 22, 'bold 15px sans-serif', PAL.text);
  const def = G.state.def;
  text(ctx, 'HEIST ' + (G.heistIndex + 1) + '/5 — ' + def.short.toUpperCase(), PANEL_X / 2, 22, 'bold 12px sans-serif', PAL.gold, 'center');
  text(ctx, fmtTime(G.time) + '   SCORE ' + G.score, PANEL_X - 16, 22, '12px sans-serif', PAL.text, 'right');
}

function drawFooter(ctx, G) {
  const p = G.player;
  ctx.fillStyle = '#0e0e22';
  ctx.fillRect(0, FIELD_OY + FIELD_H, PANEL_X, VIEW_H - FIELD_OY - FIELD_H);
  text(ctx, 'WASD move · SHIFT dash · E hide / vent / swing · Q coin · 2 smoke · 3/F snuff · P pause', 16, VIEW_H - 12, '10px sans-serif', PAL.textDim);
  if (G.prompt) {
    text(ctx, G.prompt, PANEL_X - 16, VIEW_H - 12, 'bold 11px sans-serif', PAL.gold, 'right');
  }
  if (G.escapeLeft > 0) {
    text(ctx, 'ESCAPE! ' + Math.ceil(G.escapeLeft) + 's', PANEL_X / 2, VIEW_H - 12, 'bold 11px sans-serif', PAL.red, 'center');
  }
}

function drawBanner(ctx, G) {
  if (G.ghostFlash) {
    ctx.save();
    ctx.translate(PANEL_X - 90, 60);
    ctx.rotate(-0.2);
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(-62, -18, 124, 36);
    text(ctx, 'GHOST +500', 0, 5, 'bold 14px sans-serif', PAL.gold, 'center');
    ctx.restore();
  }
  if (!G.banner) return;
  const alarm = G.detection === 'ALARM' || G.banner.includes('SPOTTED') || G.banner.includes('LASER');
  ctx.fillStyle = alarm ? 'rgba(160, 20, 20, 0.92)' : 'rgba(40, 40, 80, 0.92)';
  const w = 520;
  rr(ctx, (PANEL_X - w) / 2, 44, w, 30, 6);
  ctx.fill();
  ctx.strokeStyle = alarm ? PAL.red : PAL.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, G.banner, PANEL_X / 2, 64, 'bold 14px sans-serif', '#fff', 'center');
  if (alarm) {
    const grad = ctx.createRadialGradient(PANEL_X / 2, FIELD_OY + FIELD_H / 2, FIELD_H * 0.35, PANEL_X / 2, FIELD_OY + FIELD_H / 2, FIELD_H * 0.75);
    grad.addColorStop(0, 'rgba(255, 40, 40, 0)');
    grad.addColorStop(1, 'rgba(255, 40, 40, 0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(FIELD_OX, FIELD_OY, FIELD_W, FIELD_H);
  }
}

function drawCard(ctx, G) {
  const card = G.card;
  if (!card) return;
  ctx.fillStyle = 'rgba(5, 5, 18, 0.72)';
  ctx.fillRect(FIELD_OX, FIELD_OY, FIELD_W, FIELD_H);
  const w = 560;
  const h = 120 + card.lines.length * 20;
  const x = (PANEL_X - w) / 2;
  const y = (FIELD_OY + FIELD_H - h) / 2;
  ctx.fillStyle = '#14142e';
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, card.title, PANEL_X / 2, y + 38, 'bold 24px sans-serif', PAL.gold, 'center');
  text(ctx, card.sub, PANEL_X / 2, y + 60, '12px sans-serif', PAL.textDim, 'center');
  let ly = y + 88;
  for (const line of card.lines) {
    text(ctx, line, PANEL_X / 2, ly, line.startsWith('SCORE') || line.startsWith('FINAL') ? 'bold 13px sans-serif' : '12px sans-serif', line.includes('GHOST') ? PAL.gold : PAL.text, 'center');
    ly += 20;
  }
  if (card.ghost) {
    ctx.save();
    ctx.translate(x + w - 70, y + 40);
    ctx.rotate(-0.25);
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(-58, -18, 116, 36);
    text(ctx, 'GHOST +500', 0, 5, 'bold 14px sans-serif', PAL.gold, 'center');
    ctx.restore();
  }
}

function drawTitle(ctx, G) {
  ctx.fillStyle = 'rgba(5, 5, 18, 0.78)';
  ctx.fillRect(FIELD_OX, FIELD_OY, FIELD_W, FIELD_H);
  const cx = PANEL_X / 2;
  text(ctx, 'MOTH & LANTERN', cx, 170, 'bold 44px sans-serif', PAL.gold, 'center');
  text(ctx, 'Five heists. One moth. No one must see you.', cx, 200, '15px sans-serif', PAL.text, 'center');
  let y = 250;
  for (let i = 0; i < HEISTS.length; i++) {
    const h = HEISTS[i];
    text(ctx, (i + 1) + '.  ' + h.name + '   —   ' + h.guards.length + ' guards', cx, y, '13px sans-serif', i === 0 ? PAL.text : PAL.textDim, 'center');
    y += 24;
  }
  y += 16;
  text(ctx, 'Hide in the hard shadows. Snuff a lantern to kill its laser.', cx, y, '13px sans-serif', PAL.textDim, 'center');
  y += 22;
  text(ctx, 'Throw coins, smoke the cameras, crawl the vents — and leave unseen.', cx, y, '13px sans-serif', PAL.textDim, 'center');
  y += 40;
  text(ctx, 'Press ENTER or click to begin', cx, y, 'bold 16px sans-serif', PAL.gold, 'center');
  y += 30;
  text(ctx, 'WASD move · SHIFT dash · E hide / vent / swing · Q coin · 2 smoke · 3/F snuff', cx, y, '12px sans-serif', PAL.textDim, 'center');
}

// ---------------------------------------------------------------- main draw
export function draw(ctx, G) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (!G.state) return;
  drawFloor(ctx, G);
  drawLightPools(ctx, G);
  drawWalls(ctx, G);
  drawCover(ctx, G);
  drawLoot(ctx, G);
  drawObjective(ctx, G);
  drawExit(ctx, G);
  drawVentsChains(ctx, G);
  drawLasers(ctx, G);
  drawCones(ctx, G);
  drawCameras(ctx, G);
  drawGuards(ctx, G);
  drawPlayer(ctx, G);
  drawCoinsSmoke(ctx, G);
  drawDustMotes(ctx, G);
  drawLanterns(ctx, G);
  drawTopBar(ctx, G);
  drawFooter(ctx, G);
  drawPanel(ctx, G);
  drawBanner(ctx, G);
  if (G.mode === 'title') drawTitle(ctx, G);
  else if (G.mode === 'heistDone' || G.mode === 'failed' || G.mode === 'campaignDone') drawCard(ctx, G);
  else if (G.mode === 'paused') {
    ctx.fillStyle = 'rgba(5, 5, 18, 0.6)';
    ctx.fillRect(FIELD_OX, FIELD_OY, FIELD_W, FIELD_H);
    text(ctx, 'PAUSED — press P to resume', PANEL_X / 2, FIELD_OY + FIELD_H / 2, 'bold 20px sans-serif', PAL.text, 'center');
  }
}
