import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {}

  create() {
    // Go straight to WorldScene — no texture generation at all
    // This isolates whether the issue is texture generation or rendering
    this.scene.start('WorldScene');
    this.scene.launch('UIScene');
  }
}
