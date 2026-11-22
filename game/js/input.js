// Keyboard + mouse input for The Amber Gallery.
// Tracks held keys and mouse position/clicks; the game reads this each frame.

export const input = {
  up: false, down: false, left: false, right: false,
  sneak: false,
  mouseX: 640, mouseY: 360,
  clickX: null, clickY: null, // set for one frame when the player clicks on the canvas
  pressed: new Set(), // keys pressed since last frame was consumed
};

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

export function bindInput(canvas, onKey) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    const dir = KEYMAP[e.code];
    if (dir) input[dir] = true;
    if (!e.repeat) {
      input.pressed.add(e.code);
      if (onKey) onKey(e.code);
    }
  });
  window.addEventListener('keyup', (e) => {
    const dir = KEYMAP[e.code];
    if (dir) input[dir] = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
    input.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    input.clickX = (e.clientX - r.left) * (canvas.width / r.width);
    input.clickY = (e.clientY - r.top) * (canvas.height / r.height);
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = input.sneak = false;
  });
}

export function consumeClick() {
  const c = input.clickX === null ? null : { x: input.clickX, y: input.clickY };
  input.clickX = null; input.clickY = null;
  return c;
}

export function consumePressed(code) {
  if (input.pressed.has(code)) { input.pressed.delete(code); return true; }
  return false;
}

export function clearPressed() { input.pressed.clear(); }
