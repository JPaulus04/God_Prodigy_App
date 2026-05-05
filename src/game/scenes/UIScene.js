import Phaser from 'phaser';

const JOY_X = 88;
const JOY_RADIUS = 48;
const THUMB_RADIUS = 24;

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.joystickActive = false;
    this.joystickThumb = null;
    this.pointerId = null;
    this.baseX = JOY_X;
    this.baseY = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.baseY = height - 100;

    this._createJoystickZone(width, height);
    this._createAttackButton(width, height);
    this._createInteractButton(width, height);
  }

  // ─── Virtual Joystick ────────────────────────────────────────

  _createJoystickZone(width, height) {
    const bx = this.baseX;
    const by = this.baseY;

    // Visible box so player knows where to press
    this.add.rectangle(bx, by, 128, 128, 0x000000, 0.45)
      .setStrokeStyle(1, 0xffffff, 0.2);

    // Label
    this.add.text(bx, by + 56, 'MOVE', {
      fontSize: '8px', color: '#ffffff55',
    }).setOrigin(0.5);

    // Base ring
    this.add.circle(bx, by, JOY_RADIUS, 0x333355, 0.75)
      .setStrokeStyle(2, 0x6666aa, 0.7);

    // Thumb
    this.joystickThumb = this.add.circle(bx, by, THUMB_RADIUS, 0x8888cc, 0.95)
      .setStrokeStyle(2, 0xaaaaff, 0.8);

    // Touch zone
    const zone = this.add.rectangle(bx, by, 140, 140, 0xffffff, 0).setInteractive();

    zone.on('pointerdown', (pointer) => {
      this.joystickActive = true;
      this.pointerId = pointer.id;
      this._moveThumb(pointer.x, pointer.y);
    });

    this.input.on('pointermove', (pointer) => {
      if (this.joystickActive && pointer.id === this.pointerId) {
        this._moveThumb(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (pointer.id === this.pointerId) {
        this.joystickActive = false;
        this.pointerId = null;
        this.joystickThumb.setPosition(this.baseX, this.baseY);
        this._emitJoystick(0, 0);
      }
    });
  }

  _moveThumb(px, py) {
    const dx = px - this.baseX;
    const dy = py - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, JOY_RADIUS);
    const angle = Math.atan2(dy, dx);

    const tx = this.baseX + Math.cos(angle) * clamped;
    const ty = this.baseY + Math.sin(angle) * clamped;
    this.joystickThumb.setPosition(tx, ty);

    this._emitJoystick(
      (clamped / JOY_RADIUS) * Math.cos(angle),
      (clamped / JOY_RADIUS) * Math.sin(angle)
    );
  }

  _emitJoystick(dx, dy) {
    const world = this.scene.get('WorldScene');
    if (world) world.events.emit('joystick', { dx, dy });
  }

  // ─── Attack Button ───────────────────────────────────────────

  _createAttackButton(width, height) {
    const bx = width - 68;
    const by = height - 105;

    const circle = this.add.circle(bx, by, 38, 0xaa2222, 0.88)
      .setStrokeStyle(2, 0xff5555, 0.9)
      .setInteractive();

    this.add.text(bx, by - 2, '⚔', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(bx, by + 44, 'ATTACK', { fontSize: '8px', color: '#ffffff66' }).setOrigin(0.5);

    circle.on('pointerdown', () => {
      circle.setFillStyle(0xff3333, 0.95);
      const world = this.scene.get('WorldScene');
      if (world) world.events.emit('actionButton');
    });
    circle.on('pointerup',   () => circle.setFillStyle(0xaa2222, 0.88));
    circle.on('pointerout',  () => circle.setFillStyle(0xaa2222, 0.88));
  }

  // ─── Interact Button ─────────────────────────────────────────

  _createInteractButton(width, height) {
    const bx = width - 145;
    const by = height - 82;

    const circle = this.add.circle(bx, by, 28, 0x224488, 0.88)
      .setStrokeStyle(2, 0x4477cc, 0.9)
      .setInteractive();

    this.add.text(bx, by, 'E', { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(bx, by + 36, 'INTERACT', { fontSize: '8px', color: '#ffffff66' }).setOrigin(0.5);

    circle.on('pointerdown', () => {
      circle.setFillStyle(0x3355aa, 0.95);
      const world = this.scene.get('WorldScene');
      if (world) world.events.emit('interactButton');
    });
    circle.on('pointerup',  () => circle.setFillStyle(0x224488, 0.88));
    circle.on('pointerout', () => circle.setFillStyle(0x224488, 0.88));
  }
}
