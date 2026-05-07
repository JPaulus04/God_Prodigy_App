// InputState.js
// Shared mutable input state read by WorldCanvas each frame.
// Touch/button handlers write here; the game loop reads and clears.

export const InputState = {
  joystick:  { active: false, x: 0, y: 0 },
  attack:    false,
  interact:  false,
  ability:   false,   // active ability button
};
