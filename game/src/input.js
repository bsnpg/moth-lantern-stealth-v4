// Moth & Lantern v4 — keyboard and mouse input.
// Uses event.code throughout (Digit1, KeyQ, ...): the key's physical code,
// never the layout-dependent `key` string.

const KEYS = new Set();
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let clicked = false;

function onKeyDown(e) {
  KEYS.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  window.__gameKey = e.code;
}

function onKeyUp(e) {
  KEYS.delete(e.code);
}

function onMouseMove(e) {
  const r = e.target.getBoundingClientRect();
  mouseX = e.clientX - r.left;
  mouseY = e.clientY - r.top;
}

function onMouseDown(e) {
  mouseDown = true;
  clicked = true;
  onMouseMove(e);
}

function onMouseUp() {
  mouseDown = false;
}

export function initInput(canvas) {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
}

// True while the physical key is held.
export function held(code) {
  return KEYS.has(code);
}

// True once for the frame after a keydown; consumed by the game loop.
export function pressed(code) {
  if (window.__gameKey === code) {
    window.__gameKey = null;
    return true;
  }
  return false;
}

export function moveVector() {
  let x = 0;
  let y = 0;
  if (held('KeyA') || held('ArrowLeft')) x -= 1;
  if (held('KeyD') || held('ArrowRight')) x += 1;
  if (held('KeyW') || held('ArrowUp')) y -= 1;
  if (held('KeyS') || held('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.sqrt(2);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

export function mousePos() {
  return { x: mouseX, y: mouseY };
}

export function mouseClicked() {
  const c = clicked;
  clicked = false;
  return c;
}

export function isMouseDown() {
  return mouseDown;
}

// Clears all held keys (used when a heist restarts).
export function clearInput() {
  KEYS.clear();
  window.__gameKey = null;
  mouseDown = false;
  clicked = false;
}
