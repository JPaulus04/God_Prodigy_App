import Phaser from 'phaser';
import { BootScene }    from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene }   from './scenes/WorldScene';
import { DungeonScene } from './scenes/DungeonScene';
import { UIScene }      from './scenes/UIScene';

// Base config — width/height get overridden in App.jsx with actual canvas size
export const GameConfig = {
  type:            Phaser.CANVAS,
  backgroundColor: '#1a1a2e',
  width:           window.innerWidth,
  height:          window.innerHeight,
  // No parent — canvas is passed directly from React
  physics: {
    default: 'arcade',
    arcade:  { gravity: { y: 0 }, debug: false },
  },
  scenes: [BootScene, PreloadScene, WorldScene, DungeonScene, UIScene],
};
