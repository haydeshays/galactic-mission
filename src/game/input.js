// Simple keyboard input manager. Writes into a shared `input` object
// that the game engine reads each frame.

let currentInput = null;

function handleKeyDown(e) {
  if (!currentInput) return;
  switch (e.code) {
    case 'ArrowLeft':
    case 'KeyA':
      currentInput.left = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      currentInput.right = true;
      break;
    case 'ArrowUp':
    case 'KeyW':
      currentInput.up = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      currentInput.down = true;
      break;
    case 'Space':
      currentInput.fire = true;
      e.preventDefault();
      break;
    default:
      break;
  }
}

function handleKeyUp(e) {
  if (!currentInput) return;
  switch (e.code) {
    case 'ArrowLeft':
    case 'KeyA':
      currentInput.left = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      currentInput.right = false;
      break;
    case 'ArrowUp':
    case 'KeyW':
      currentInput.up = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      currentInput.down = false;
      break;
    case 'Space':
      currentInput.fire = false;
      break;
    default:
      break;
  }
}

export function createInputState() {
  return { left: false, right: false, up: false, down: false, fire: false };
}

export function attachInput(inputState) {
  currentInput = inputState;
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
}

export function detachInput() {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  currentInput = null;
}

// ---------- Touch/virtual controls ----------
// These write into the same shared input object so the engine doesn't care
// whether the signal came from a keyboard or a virtual joystick.

export function setTouchDirection(dx, dy) {
  if (!currentInput) return;
  const threshold = 0.25;
  currentInput.left  = dx < -threshold;
  currentInput.right = dx >  threshold;
  currentInput.up    = dy < -threshold;
  currentInput.down  = dy >  threshold;
}

export function clearTouchDirection() {
  if (!currentInput) return;
  currentInput.left = false;
  currentInput.right = false;
  currentInput.up = false;
  currentInput.down = false;
}

export function setTouchFire(held) {
  if (!currentInput) return;
  currentInput.fire = !!held;
}
