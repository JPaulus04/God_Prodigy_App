import Phaser from 'phaser';
import { BootScene }     from './scenes/BootScene';
import { PreloadScene }  from './scenes/PreloadScene';
import { WorldScene }    from './scenes/WorldScene';
import { DungeonScene }  from './scenes/DungeonScene';
import { UIScene }       from './scenes/UIScene';

export const GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#1a1a2e',
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:  390,
    height: 844,
  },
  physics: {
    default: 'arcade',
    arcade:  { gravity: { y: 0 }, debug: false },
  },
  scenes: [BootScene, PreloadScene, WorldScene, DungeonScene, UIScene],
};
