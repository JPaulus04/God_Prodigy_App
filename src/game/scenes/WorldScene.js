// Batch 2 — Full WorldScene coming next
import Phaser from 'phaser';
export class WorldScene extends Phaser.Scene {
  constructor() { super({ key: 'WorldScene' }); }
  create() {
    this.add.text(20, 20, 'WorldScene — Batch 2 coming next', { color: '#ffffff', fontSize: '16px' });
  }
}
