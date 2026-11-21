// Moth & Lantern v4 — tuning, palette and the five heists.
// Written fresh for the v4 build from the v4 design docs. No code is copied
// from any earlier build; only numbers and names from the design docs are used.

// ---------------------------------------------------------------- canvas
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const PANEL_X = 980; // right HUD panel starts here
export const PANEL_W = 300;
export const FIELD_OX = 10; // play-field origin (px)
export const FIELD_OY = 34;
export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const FIELD_W = COLS * TILE; // 960
export const FIELD_H = ROWS * TILE; // 640

// ---------------------------------------------------------------- palette
export const PAL = {
  floorA: '#1d1d38',
  floorB: '#232344',
  floorLine: '#2c2c52',
  goldVein: '#8a6d2f',
  wall: '#2b2b4d',
  wallTop: '#ffd700',
  wallEdge: '#14142a',
  gap: '#05050f',
  lanternGlow: '#ffd700',
  lanternCore: '#fff9c4',
  mothWing: '#e6e6fa',
  mothWingDark: '#b9a7e6',
  mothBody: '#3a2b52',
  mothDust: '#dda0dd',
  guardRobe: '#b08d5a',
  guardRobeDark: '#8a6d42',
  guardHead: '#e8c890',
  guardHalo: '#ff8c00',
  coneGuard: 'rgba(255, 215, 0, 0.20)',
  coneGuardEdge: 'rgba(255, 215, 0, 0.55)',
  coneCamera: 'rgba(0, 255, 255, 0.18)',
  coneCameraEdge: 'rgba(0, 255, 255, 0.55)',
  coneAlarm: 'rgba(255, 40, 40, 0.28)',
  coneAlarmEdge: 'rgba(255, 40, 40, 0.7)',
  smoke: 'rgba(150, 160, 200, 0.55)',
  smokeEdge: 'rgba(190, 200, 230, 0.7)',
  laserOn: '#ff2a2a',
  laserOff: 'rgba(255, 60, 60, 0.18)',
  laserWarn: '#ff8c00',
  panel: '#12122a',
  panelLine: '#3a3a66',
  gold: '#ffd700',
  goldDim: '#c9a227',
  text: '#f2eeda',
  textDim: '#9a94c2',
  red: '#ff4040',
  amber: '#ffb347',
  cyan: '#00ffff',
  green: '#7ddc7d',
  grey: '#8a86a8',
};

// ---------------------------------------------------------------- tuning
export const TUNE = {
  // player
  walkSpeed: 150,
  crouchSpeed: 72,
  ventSpeed: 68,
  dashSpeed: 330,
  dashTime: 0.18,
  dashCooldown: 1.2,
  playerRadius: 12,
  // wing dust / visibility
  dustLight: 22, // +/s in full lantern light
  dustShadow: -18, // -/s in shadow
  dustDash: 12, // +/s while dashing
  dustSwing: 15, // +/s while swinging
  dustStillShadow: -4, // extra -/s standing still in shadow
  dustGust: 30, // instant + from a gust vent
  // noise
  noiseWalk: 6,
  noiseCrouch: 2,
  noiseDash: 35, // burst
  noiseSwing: 30, // burst
  noiseCoin: 18, // burst at landing
  noiseSnuff: 25, // burst
  noiseLaser: 60, // burst on trip
  noiseDecay: 25, // /s
  // guards
  patrolSpeed: 55,
  suspectSpeed: 88,
  chaseSpeed: 120,
  returnSpeed: 70,
  suspicionRate: 55, // /s at full rate
  suspicionDecay: 20, // /s out of sight
  suspicionDecayShadow: 40, // /s out of sight in deep shadow
  suspectAt: 25,
  alarmAt: 100,
  searchTime: 6,
  lookTime: 3,
  alarmCallRadius: 8, // tiles
  // gadgets
  coinCount: 4,
  coinRange: 8, // tiles
  coinFlight: 0.6, // s
  coinNoiseRadius: 6, // tiles
  coinInvestigate: 4, // s
  coinCooldown: 1.5,
  smokeCount: 2,
  smokeCountLate: 3, // heists 4-5
  smokeTime: 5, // s
  smokeRadius: 4, // tiles
  smokeCooldown: 10,
  snuffCount: 3,
  snuffTime: 6, // s lantern dead
  snuffRadius: 5, // tiles of darkness
  snuffCooldown: 14,
  snuffRange: 5, // tiles reach
  // cameras
  camRange: 7, // tiles
  camArc: 55, // degrees
  camSweep: 90, // degrees
  camPeriod: 8, // s (4 each way)
  camPeriodHot: 6, // s when heat > 70
  camFill: 40, // exposure /s
  camBlindSpot: 1, // tile behind mount
  // lasers
  laserOnTime: 2,
  laserOffTime: 2,
  laserWarnTime: 1, // glow before firing
  // heat / score / strikes
  heatSuspicion: 8,
  heatAlarm: 20,
  heatDecay: 2, // /s when unseen 3s
  heatHot: 70,
  scoreHeist: 250,
  scoreTimeBonus: 5, // per second under par
  scoreSpotted: -100,
  ghostBonus: 500,
  maxStrikes: 3,
};

// ---------------------------------------------------------------- controls + legend
export const CONTROLS = [
  ['WASD / Arrows', 'Move'],
  ['SHIFT', 'Dash (loud)'],
  ['E', 'Hide / Vent / Swing'],
  ['Q / Click', 'Throw coin'],
  ['2', 'Smoke canister'],
  ['3 / F', 'Snuff lantern'],
  ['SPACE', 'Release swing'],
];

export const LEGEND = [
  ['cone', 'Guard cone'],
  ['cam', 'Camera cone'],
  ['alarm', 'Alarm'],
  ['coin', 'Coin distract'],
  ['smoke', 'Smoke blind'],
  ['snuff', 'Snuff lantern'],
  ['laser', 'Laser tripwire'],
  ['vent', 'Vent crawl'],
  ['cover', 'Low cover'],
];

// ---------------------------------------------------------------- heists
// Tile coords: x 0..23 (cols), y 0..15 (rows). Walls/cover/gaps are rects in
// tiles. Patrol paths are tile waypoints. Lantern r is in tiles.
export const HEISTS = [
  {
    id: 1,
    name: 'THE GLASSHOUSE CONSERVATORY',
    short: 'Glasshouse',
    objective: { x: 12, y: 3, name: 'Moonflower Bloom', icon: 'bloom' },
    objectiveText: 'Steal the Moonflower Bloom · reach the east service gate',
    exit: { x: 22, y: 7, w: 1, h: 2, label: 'SERVICE GATE' },
    start: { x: 2, y: 14 },
    par: 75,
    darkness: 0.85,
    walls: [
      { x: 5, y: 4, w: 1, h: 8 },
      { x: 18, y: 4, w: 1, h: 8 },
      { x: 9, y: 12, w: 6, h: 1 },
    ],
    lanterns: [
      { x: 12, y: 2, r: 5, laser: -1 },
      { x: 4, y: 8, r: 4, laser: -1 },
      { x: 20, y: 8, r: 4, laser: -1 },
      { x: 12, y: 13, r: 4, laser: -1 },
    ],
    cover: [
      { x: 2, y: 5, w: 2, h: 2, kind: 'fern' },
      { x: 20, y: 5, w: 2, h: 2, kind: 'fern' },
      { x: 2, y: 11, w: 2, h: 2, kind: 'fern' },
      { x: 20, y: 11, w: 2, h: 2, kind: 'fern' },
      { x: 8, y: 12, w: 1, h: 1, kind: 'crate' },
      { x: 15, y: 12, w: 1, h: 1, kind: 'crate' },
    ],
    loot: [
      { x: 6, y: 3, value: 150, label: 'Seed-pearl' },
      { x: 18, y: 3, value: 150, label: 'Seed-pearl' },
      { x: 12, y: 14, value: 150, label: 'Seed-pearl' },
    ],
    guards: [
      { path: [[6, 6], [6, 10], [10, 10], [10, 6]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'A' },
      { path: [[16, 6], [16, 10], [20, 10], [20, 6]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'B' },
      { path: [[21, 8]], speed: 0, cone: 60, range: 8, type: 'sentry', name: 'C' },
    ],
    cameras: [],
    lasers: [],
    vents: [],
    chains: [],
    gaps: [],
    gust: [],
  },
  {
    id: 2,
    name: 'THE COUNTING HOUSE',
    short: 'Counting House',
    objective: { x: 12, y: 7, name: 'Brass Ledger', icon: 'ledger' },
    objectiveText: 'Steal the Brass Ledger · swing to the roof hatch',
    exit: { x: 3, y: 1, w: 2, h: 1, label: 'ROOF HATCH' },
    start: { x: 2, y: 14 },
    par: 90,
    darkness: 0.6,
    walls: [
      { x: 6, y: 8, w: 5, h: 1 },
      { x: 13, y: 8, w: 5, h: 1 },
      { x: 8, y: 3, w: 1, h: 3 },
      { x: 15, y: 3, w: 1, h: 3 },
      { x: 19, y: 11, w: 4, h: 1 },
    ],
    lanterns: [
      { x: 7, y: 5, r: 4, laser: -1 },
      { x: 17, y: 5, r: 4, laser: -1 },
      { x: 12, y: 11, r: 4, laser: -1 },
      { x: 3, y: 13, r: 3, laser: -1 },
    ],
    cover: [
      { x: 10, y: 6, w: 2, h: 1, kind: 'desk' },
      { x: 13, y: 6, w: 1, h: 1, kind: 'desk' },
      { x: 4, y: 12, w: 2, h: 1, kind: 'crate' },
      { x: 18, y: 12, w: 2, h: 1, kind: 'crate' },
      { x: 20, y: 6, w: 2, h: 1, kind: 'desk' },
    ],
    loot: [
      { x: 9, y: 4, value: 200, label: 'Coin stack' },
      { x: 15, y: 4, value: 200, label: 'Coin stack' },
      { x: 20, y: 6, value: 200, label: 'Coin stack' },
      { x: 4, y: 6, value: 200, label: 'Coin stack' },
    ],
    guards: [
      { path: [[5, 10], [5, 13], [10, 13], [10, 10]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'A' },
      { path: [[15, 10], [15, 13], [20, 13], [20, 10]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'B' },
      { path: [[12, 9]], speed: 0, cone: 65, range: 8, type: 'sentry', name: 'C' },
      { path: [[14, 7]], speed: 0, cone: 60, range: 8, type: 'sentry', name: 'D' },
    ],
    cameras: [
      { x: 12, y: 0, base: 90, sweep: 90, period: 8, range: 7 },
    ],
    lasers: [],
    vents: [],
    chains: [
      { x1: 5, y1: 6, x2: 4, y2: 2 },
    ],
    gaps: [],
    gust: [],
  },
  {
    id: 3,
    name: 'BELLWRIGHT FOUNDRY',
    short: 'Foundry',
    objective: { x: 12, y: 3, name: "Founder's Bell Clapper", icon: 'clapper' },
    objectiveText: "Steal the Bell Clapper · reach the south slag chute",
    exit: { x: 12, y: 14, w: 2, h: 1, label: 'SLAG CHUTE' },
    start: { x: 2, y: 14 },
    par: 105,
    darkness: 0.4,
    walls: [
      { x: 6, y: 2, w: 3, h: 2 },
      { x: 15, y: 2, w: 3, h: 2 },
      { x: 2, y: 6, w: 2, h: 4 },
      { x: 20, y: 6, w: 2, h: 4 },
    ],
    lanterns: [
      { x: 9, y: 6, r: 3, laser: 0 },
      { x: 15, y: 9, r: 3, laser: 1 },
      { x: 4, y: 13, r: 4, laser: -1 },
      { x: 20, y: 13, r: 4, laser: -1 },
      { x: 12, y: 1, r: 4, laser: -1 },
    ],
    cover: [
      { x: 5, y: 7, w: 1, h: 2, kind: 'crate' },
      { x: 18, y: 7, w: 1, h: 2, kind: 'crate' },
      { x: 10, y: 13, w: 2, h: 1, kind: 'crate' },
      { x: 13, y: 13, w: 1, h: 1, kind: 'crate' },
    ],
    loot: [
      { x: 4, y: 3, value: 300, label: 'Ingot' },
      { x: 20, y: 3, value: 300, label: 'Ingot' },
      { x: 12, y: 13, value: 300, label: 'Ingot' },
    ],
    guards: [
      { path: [[4, 5], [4, 11], [8, 11], [8, 5]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'A' },
      { path: [[16, 5], [16, 11], [20, 11], [20, 5]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'B' },
      { path: [[10, 12], [14, 12], [14, 14], [10, 14]], speed: 0.9, cone: 60, range: 8, type: 'patrol', name: 'C' },
      { path: [[12, 5]], speed: 0, cone: 60, range: 8, type: 'sentry', name: 'D' },
      { path: [[18, 8]], speed: 0, cone: 70, range: 9, type: 'bellwright', name: 'E' },
    ],
    cameras: [
      { x: 12, y: 0, base: 90, sweep: 90, period: 8, range: 7 },
      { x: 23, y: 8, base: 180, sweep: 70, period: 8, range: 7 },
    ],
    lasers: [
      { x1: 9, y1: 7, x2: 15, y2: 7, offset: 0, lantern: 0 },
      { x1: 9, y1: 10, x2: 15, y2: 10, offset: 2, lantern: 1 },
    ],
    vents: [
      { x1: 8, y1: 7, x2: 8, y2: 11 },
      { x1: 16, y1: 7, x2: 16, y2: 11 },
    ],
    chains: [
      { x1: 12, y1: 9, x2: 12, y2: 4 },
    ],
    gaps: [],
    gust: [],
  },
  {
    id: 4,
    name: 'THE RELIQUARY ARCHIVE',
    short: 'Archive',
    objective: { x: 12, y: 4, name: 'Sealed Codex', icon: 'codex' },
    objectiveText: 'Steal the Sealed Codex · reach the restoration lift',
    exit: { x: 21, y: 13, w: 2, h: 1, label: 'RESTORATION LIFT' },
    start: { x: 2, y: 14 },
    par: 120,
    darkness: 0.25,
    walls: [
      { x: 8, y: 2, w: 2, h: 3 },
      { x: 14, y: 2, w: 2, h: 3 },
      { x: 8, y: 12, w: 2, h: 2 },
      { x: 14, y: 12, w: 2, h: 2 },
    ],
    lanterns: [
      { x: 9, y: 5, r: 3, laser: 0 },
      { x: 15, y: 8, r: 3, laser: 1 },
      { x: 5, y: 10, r: 3, laser: 2 },
      { x: 20, y: 2, r: 4, laser: -1 },
      { x: 3, y: 14, r: 4, laser: -1 },
    ],
    cover: [
      { x: 5, y: 3, w: 2, h: 1, kind: 'desk' },
      { x: 17, y: 3, w: 2, h: 1, kind: 'desk' },
      { x: 5, y: 13, w: 2, h: 1, kind: 'crate' },
      { x: 17, y: 13, w: 2, h: 1, kind: 'crate' },
      { x: 11, y: 12, w: 2, h: 1, kind: 'desk' },
    ],
    loot: [
      { x: 6, y: 6, value: 250, label: 'Reliquary token' },
      { x: 18, y: 6, value: 250, label: 'Reliquary token' },
      { x: 12, y: 12, value: 250, label: 'Reliquary token' },
      { x: 20, y: 11, value: 250, label: 'Reliquary token' },
      { x: 3, y: 5, value: 250, label: 'Reliquary token' },
    ],
    guards: [
      { path: [[4, 4], [4, 12], [7, 12], [7, 4]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'A' },
      { path: [[17, 4], [17, 12], [20, 12], [20, 4]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'B' },
      { path: [[9, 8], [9, 13], [15, 13], [15, 8]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'C' },
      { path: [[10, 2], [14, 2], [14, 5], [10, 5]], speed: 0.9, cone: 60, range: 8, type: 'patrol', name: 'D' },
      { path: [[12, 10]], speed: 0, cone: 65, range: 8, type: 'warden', name: 'E' },
      { path: [[18, 7]], speed: 0, cone: 75, range: 9, type: 'hunter', name: 'F' },
    ],
    cameras: [
      { x: 12, y: 0, base: 90, sweep: 90, period: 8, range: 7 },
      { x: 0, y: 8, base: 0, sweep: 80, period: 8, range: 7 },
    ],
    lasers: [
      { x1: 9, y1: 6, x2: 15, y2: 6, offset: 0, lantern: 0 },
      { x1: 9, y1: 9, x2: 15, y2: 9, offset: 2, lantern: 1 },
      { x1: 5, y1: 11, x2: 10, y2: 11, offset: 1, lantern: 2 },
    ],
    vents: [
      { x1: 8, y1: 6, x2: 8, y2: 9 },
      { x1: 16, y1: 6, x2: 16, y2: 9 },
      { x1: 19, y1: 11, x2: 21, y2: 11 },
    ],
    chains: [],
    gaps: [],
    gust: [],
  },
  {
    id: 5,
    name: 'THE SKY PALACE',
    short: 'Sky Palace',
    objective: { x: 3, y: 4, name: 'Palace Key', icon: 'key' },
    objective2: { x: 20, y: 4, name: 'Moth Crown', icon: 'crown' },
    objectiveText: 'Take the Palace Key, then the Moth Crown · reach the airship gangway',
    exit: { x: 11, y: 0, w: 2, h: 1, label: 'AIRSHIP GANGWAY' },
    start: { x: 12, y: 14 },
    par: 135,
    darkness: 0.15,
    walls: [
      { x: 2, y: 2, w: 3, h: 2 },
      { x: 19, y: 2, w: 3, h: 2 },
      { x: 8, y: 12, w: 3, h: 1 },
      { x: 13, y: 12, w: 3, h: 1 },
    ],
    lanterns: [
      { x: 6, y: 2, r: 3, laser: -1 },
      { x: 18, y: 2, r: 3, laser: -1 },
      { x: 12, y: 11, r: 3, laser: -1 },
      { x: 3, y: 13, r: 3, laser: -1 },
      { x: 21, y: 13, r: 3, laser: -1 },
    ],
    cover: [
      { x: 5, y: 7, w: 2, h: 1, kind: 'planter' },
      { x: 17, y: 7, w: 2, h: 1, kind: 'planter' },
      { x: 10, y: 14, w: 2, h: 1, kind: 'crate' },
      { x: 13, y: 14, w: 1, h: 1, kind: 'crate' },
    ],
    loot: [
      { x: 4, y: 8, value: 400, label: 'Star-chart' },
      { x: 20, y: 8, value: 400, label: 'Star-chart' },
      { x: 12, y: 13, value: 400, label: 'Star-chart' },
      { x: 8, y: 13, value: 400, label: 'Star-chart' },
    ],
    guards: [
      { path: [[4, 6], [4, 12], [8, 12], [8, 6]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'A' },
      { path: [[16, 6], [16, 12], [20, 12], [20, 6]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'B' },
      { path: [[10, 8], [14, 8], [14, 12], [10, 12]], speed: 1.0, cone: 60, range: 8, type: 'patrol', name: 'C' },
      { path: [[6, 3], [9, 3], [9, 5], [6, 5]], speed: 0.9, cone: 60, range: 8, type: 'patrol', name: 'D' },
      { path: [[15, 3], [18, 3], [18, 5], [15, 5]], speed: 0.9, cone: 60, range: 8, type: 'patrol', name: 'E' },
      { path: [[12, 7]], speed: 0, cone: 80, range: 9, type: 'captain', name: 'F' },
      { path: [[12, 2]], speed: 0, cone: 55, range: 8, type: 'watcher', name: 'G' },
    ],
    cameras: [
      { x: 2, y: 0, base: 90, sweep: 80, period: 8, range: 7 },
      { x: 12, y: 0, base: 90, sweep: 90, period: 8, range: 7 },
      { x: 22, y: 0, base: 90, sweep: 80, period: 8, range: 7 },
    ],
    lasers: [
      { x1: 5, y1: 9, x2: 10, y2: 9, offset: 0, lantern: -1 },
      { x1: 14, y1: 9, x2: 19, y2: 9, offset: 2, lantern: -1 },
      { x1: 10, y1: 13, x2: 14, y2: 13, offset: 1, lantern: -1 },
    ],
    vents: [
      { x1: 7, y1: 10, x2: 7, y2: 13 },
      { x1: 17, y1: 10, x2: 17, y2: 13 },
      { x1: 12, y1: 5, x2: 12, y2: 8 },
    ],
    chains: [
      { x1: 11, y1: 5, x2: 13, y2: 8 },
      { x1: 5, y1: 9, x2: 5, y2: 14 },
    ],
    gaps: [
      { x: 10, y: 6, w: 4, h: 2 },
      { x: 4, y: 10, w: 2, h: 3 },
    ],
    gust: [
      { x: 9, y: 3, w: 6, h: 3 },
      { x: 6, y: 11, w: 4, h: 3 },
    ],
  },
];

export const HEIST_COUNT = HEISTS.length;
export const TOTAL_GUARDS = HEISTS.reduce((n, h) => n + h.guards.length, 0); // 25
