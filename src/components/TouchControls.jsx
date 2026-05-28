import { useRef, useState, useCallback, useEffect } from 'react';
import { setTouchDirection, clearTouchDirection, setTouchFire } from '../game/input.js';

/**
 * Virtual on-screen controls for mobile / touch devices.
 *
 * - Left: a fixed virtual joystick. Drag the knob to move; releasing centers it.
 * - Right: a big fire button (hold to auto-fire).
 * - Top-right: a pause button (also accessible via the P/Esc keys on desktop).
 *
 * Uses Pointer Events so it works for touch, pen, and mouse transparently.
 * Visibility is controlled via CSS (@media pointer:coarse), so the controls
 * hide themselves on desktop automatically.
 */
export default function TouchControls({ onPause }) {
  const baseRef = useRef(null);
  const pointerIdRef = useRef(null);
  const firePointerIdRef = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [firing, setFiring] = useState(false);

  // Cleanup: if this component unmounts while a finger is down, release inputs
  useEffect(() => {
    return () => {
      clearTouchDirection();
      setTouchFire(false);
    };
  }, []);

  const updateFromPointer = useCallback((clientX, clientY) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    const nx = dx / maxR;
    const ny = dy / maxR;
    setKnob({ x: dx, y: dy });
    setTouchDirection(nx, ny);
  }, []);

  const onJoystickDown = (e) => {
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };
  const onJoystickMove = (e) => {
    if (pointerIdRef.current !== e.pointerId) return;
    updateFromPointer(e.clientX, e.clientY);
  };
  const onJoystickUp = (e) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    clearTouchDirection();
  };

  const onFireDown = (e) => {
    if (firePointerIdRef.current !== null) return;
    firePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFiring(true);
    setTouchFire(true);
  };
  const onFireUp = (e) => {
    if (firePointerIdRef.current !== e.pointerId) return;
    firePointerIdRef.current = null;
    setFiring(false);
    setTouchFire(false);
  };

  return (
    <div className="touch-controls">
      <div
        ref={baseRef}
        className="touch-joystick-base"
        onPointerDown={onJoystickDown}
        onPointerMove={onJoystickMove}
        onPointerUp={onJoystickUp}
        onPointerCancel={onJoystickUp}
      >
        <div
          className="touch-joystick-knob"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>

      <button
        type="button"
        className={`touch-fire-btn ${firing ? 'active' : ''}`}
        onPointerDown={onFireDown}
        onPointerUp={onFireUp}
        onPointerCancel={onFireUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        FIRE
      </button>

      <button
        type="button"
        className="touch-pause-btn"
        onClick={onPause}
        aria-label="Pause"
      >
        ❙❙
      </button>
    </div>
  );
}
