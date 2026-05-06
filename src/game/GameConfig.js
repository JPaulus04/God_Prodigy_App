import Phaser from 'phaser';
import { BootScene }    from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene }   from './scenes/WorldScene';
import { DungeonScene } from './scenes/DungeonScene';
import { UIScene }      from './scenes/UIScene';

// Use actual device screen dimensions — avoids RESIZE mode
// miscalculation inside Capacitor's WKWebView
const W = window.innerWidth;
const H = window.innerHeight;

export const GameConfig = {
  type:            Phaser.CANVAS,
  backgroundColor: '#1a1a2e',
  width:  W,
  height: H,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade:  { gravity: { y: 0 }, debug: false },
  },
  scenes: [BootScene, PreloadScene, WorldScene, DungeonScene, UIScene],
};

// Export dimensions so scenes can use them
export const GAME_W = W;
export const GAME_H = H;
