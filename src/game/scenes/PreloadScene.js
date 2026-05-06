import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {}

  create() {
    this._generateTextures();
    this.scene.start('WorldScene');
    this.scene.launch('UIScene');
  }

  _generateTextures() {
    const sprites = [
      { key: 'player',       color: 0x4a90e2, w: 28, h: 28 },
      { key: 'goblin',       color: 0x7ed321, w: 24, h: 24 },
      { key: 'golem',        color: 0x8e44ad, w: 36, h: 36 },
      { key: 'npc',          color: 0x1abc9c, w: 28, h: 28 },
      { key: 'tree',         color: 0x27ae60, w: 28, h: 40 },
      { key: 'rock',         color: 0x7f8c8d, w: 28, h: 28 },
      { key: 'ore_node',     color: 0xe67e22, w: 28, h: 28 },
      { key: 'checkpoint',   color: 0xf1c40f, w: 20, h: 32 },
      { key: 'dungeon_door', color: 0x8e44ad, w: 44, h: 44 },
      { key: 'iron_sword',   color: 0xbdc3c7, w: 14, h: 28 },
    ];

    const tiles = [
      { key: 'tile_grass',  color: 0x2d6a3f },
      { key: 'tile_dirt',   color: 0x9b7a5b },
      { key: 'tile_stone',  color: 0x7f8c8d },
      { key: 'tile_water',  color: 0x2980b9 },
      { key: 'tile_forest', color: 0x1a5c35 },
    ];

    sprites.forEach(({ key, color, w, h }) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, w, h);
      g.generateTexture(key, w, h);
      g.destroy();
    });

    tiles.forEach(({ key, color }) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, 32, 32);
      g.lineStyle(1, 0x00000033, 1);
      g.strokeRect(0, 0, 32, 32);
      g.generateTexture(key, 32, 32);
      g.destroy();
    });
  }
}
