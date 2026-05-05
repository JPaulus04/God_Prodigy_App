// Central event bus. Phase 1: local only. Phase 4: add socket.emit here.
class ActionBusClass {
  constructor() { this._listeners = {}; }

  on(action, listener) {
    if (!this._listeners[action]) this._listeners[action] = [];
    this._listeners[action].push(listener);
  }

  off(action, listener) {
    if (!this._listeners[action]) return;
    this._listeners[action] = this._listeners[action].filter((l) => l !== listener);
  }

  emit(action, payload = {}) {
    (this._listeners[action] || []).forEach((l) => l(payload));
    // Phase 4: socket.emit(action, payload);
  }
}

export const ActionBus = new ActionBusClass();
