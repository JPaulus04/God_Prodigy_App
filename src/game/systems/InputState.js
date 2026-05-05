// Shared mutable input state between React UI and Phaser game loop.
// Plain object — no re-renders, no Zustand overhead, reads every frame.
// Phase 4: this routes through Socket.io for multiplayer input sync.

export const InputState = {
  joystick: { x: 0, y: 0, active: false },
  attack: false,
  interact: false,
};
