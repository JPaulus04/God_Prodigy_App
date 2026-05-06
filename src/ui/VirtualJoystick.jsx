import React, { useRef, useCallback } from 'react';
import { InputState } from '../game/systems/InputState';

const BOX  = 140;   // outer box size px
const KNOB = 54;    // thumb knob size px
const MAX  = (BOX - KNOB) / 2 - 4;

export default function VirtualJoystick() {
  const boxRef    = useRef(null);
  const knobRef   = useRef(null);
  const activeTID = useRef(null);
  const mouseDrag = useRef(false);

  const moveKnob = useCallback((clientX, clientY) => {
    if (!boxRef.current) return;
    const r  = boxRef.current.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > MAX) {
      dx = (dx / dist) * MAX;
      dy = (dy / dist) * MAX;
    }

    if (knobRef.current) {
      knobRef.current.style.transform =
        `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    const norm = dist > 6 ? dist : 0;
    InputState.joystick = {
      x:      norm ? dx / MAX : 0,
      y:      norm ? dy / MAX : 0,
      active: norm > 0,
    };
  }, []);

  const resetKnob = useCallback(() => {
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(-50%, -50%)';
    }
    InputState.joystick = { x: 0, y: 0, active: false };
    activeTID.current   = null;
    mouseDrag.current   = false;
  }, []);

  const onTouchStart = e => {
    if (activeTID.current !== null) return;
    const t = e.changedTouches[0];
    activeTID.current = t.identifier;
    moveKnob(t.clientX, t.clientY);
  };

  const onTouchMove = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === activeTID.current) {
        moveKnob(t.clientX, t.clientY);
        break;
      }
    }
  };

  const onTouchEnd = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === activeTID.current) {
        resetKnob();
        break;
      }
    }
  };

  const onMouseDown = e => { mouseDrag.current = true;  moveKnob(e.clientX, e.clientY); };
  const onMouseMove = e => { if (mouseDrag.current) moveKnob(e.clientX, e.clientY); };
  const onMouseUp   = ()  => { if (mouseDrag.current) resetKnob(); };

  return (
    <div
      ref={boxRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={resetKnob}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{
        width:        BOX,
        height:       BOX,
        background:   '#ffffff0f',
        border:       '2px solid #ffffff33',
        borderRadius: 18,
        position:     'relative',
        touchAction:  'none',
        userSelect:   'none',
        flexShrink:   0,
      }}
    >
      {/* Directional arrows */}
      {[
        { ch: '▲', s: { top: 7,    left: '50%', transform: 'translateX(-50%)' } },
        { ch: '▼', s: { bottom: 7, left: '50%', transform: 'translateX(-50%)' } },
        { ch: '◀', s: { left: 7,   top: '50%',  transform: 'translateY(-50%)' } },
        { ch: '▶', s: { right: 7,  top: '50%',  transform: 'translateY(-50%)' } },
      ].map(({ ch, s }) => (
        <span key={ch} style={{
          position: 'absolute', color: '#ffffff44',
          fontSize: 13, lineHeight: 1, ...s,
        }}>{ch}</span>
      ))}

      {/* Thumb knob */}
      <div
        ref={knobRef}
        style={{
          position:      'absolute',
          top: '50%',    left: '50%',
          transform:     'translate(-50%, -50%)',
          width:         KNOB,
          height:        KNOB,
          background:    'radial-gradient(circle at 38% 36%, #ffffff66, #ffffff22)',
          border:        '2px solid #ffffff66',
          borderRadius:  '50%',
          pointerEvents: 'none',
          transition:    'transform 0.02s linear',
          boxShadow:     '0 2px 8px #00000066',
        }}
      />
    </div>
  );
}
