import Phaser from 'phaser';
import { useGameStore } from '../../store/useGameStore';
import { InputState }   from '../systems/InputState';

export class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
    this.playerGraphic = null;
    this.px = 200;
    this.py = 400;
    this.speed = 150;
  }

  create() {
    const { width, height } = this.scale;

    // ── Solid color floor tiles using Graphics (no textures) ──
    const map = this.add.graphics();

    // Green grass base
    map.fillStyle(0x2d6a3f, 1);
    map.fillRect(0, 0, 1600, 1600);

    // Darker patches for variety
    map.fillStyle(0x245a34, 1);
    for (let i = 0; i < 20; i++) {
      map.fillRect(i * 80, 100, 60, 300);
    }

    // Water border
    map.fillStyle(0x2980b9, 1);
    map.fillRect(0, 0, 1600, 64);
    map.fillRect(0, 1536, 1600, 64);
    map.fillRect(0, 0, 64, 1600);
    map.fillRect(1536, 0, 64, 1600);

    // Stone path
    map.fillStyle(0x7f8c8d, 1);
    map.fillRect(750, 0, 100, 1600);
    map.fillRect(0, 750, 1600, 100);

    // ── Player as colored circle ──────────────────────────────
    this.playerGraphic = this.add.graphics();
    this._drawPlayer();

    // ── Status text fixed to camera ───────────────────────────
    this.statusText = this.add.text(16, 16, '✓ World loaded!', {
      fontSize: '16px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 6 },
    }).setScrollFactor(0).setDepth(999);

    // ── Some landmark objects ─────────────────────────────────
    // NPC marker
    const npc = this.add.graphics();
    npc.fillStyle(0x1abc9c, 1);
    npc.fillCircle(700, 900, 18);
    this.add.text(700, 860, 'Elder Kael', {
      fontSize: '12px', color: '#1abc9c',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // Stronghold marker
    const sh = this.add.graphics();
    sh.fillStyle(0xd4af37, 1);
    sh.fillRect(770, 1380, 60, 60);
    this.add.text(800, 1350, '🏰 STRONGHOLD', {
      fontSize: '12px', color: '#d4af37',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // Checkpoint
    const cp = this.add.graphics();
    cp.fillStyle(0xf1c40f, 1);
    cp.fillTriangle(800, 790, 780, 830, 820, 830);

    // ── Camera ────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, 1600, 1600);
    this.cameras.main.centerOn(this.px, this.py);

    // ── Input ─────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  _drawPlayer() {
    this.playerGraphic.clear();
    // Body
    this.playerGraphic.fillStyle(0x4a90e2, 1);
    this.playerGraphic.fillCircle(this.px, this.py, 16);
    // Outline
    this.playerGraphic.lineStyle(2, 0xffffff, 1);
    this.playerGraphic.strokeCircle(this.px, this.py, 16);
  }

  update(time, delta) {
    const dt = delta / 1000;
    let vx = 0, vy = 0;

    // Keyboard
    if (this.cursors.left.isDown  || this.wasd.left.isDown)  vx = -1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx =  1;
    if (this.cursors.up.isDown    || this.wasd.up.isDown)    vy = -1;
    if (this.cursors.down.isDown  || this.wasd.down.isDown)  vy =  1;

    // Joystick
    if (InputState.joystick.active) {
      vx = InputState.joystick.x;
      vy = InputState.joystick.y;
    }

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const m = Math.sqrt(vx * vx + vy * vy);
      vx /= m; vy /= m;
    }

    this.px = Phaser.Math.Clamp(this.px + vx * this.speed * dt, 64, 1536);
    this.py = Phaser.Math.Clamp(this.py + vy * this.speed * dt, 64, 1536);

    this._drawPlayer();
    this.cameras.main.centerOn(this.px, this.py);

    // Update status
    if (this.statusText) {
      this.statusText.setText(
        `✓ Running | pos: ${Math.round(this.px)},${Math.round(this.py)}`
      );
    }
  }
}
