import Phaser from 'phaser';
import { Player }     from '../entities/Player';
import { Enemy }      from '../entities/Enemy';
import { InputState } from '../systems/InputState';
import { useGameStore } from '../../store/useGameStore';

const TS = 32;
const DW = 24;   // dungeon width  (tiles)
const DH = 18;   // dungeon height (tiles)

export class DungeonScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DungeonScene' });
    this.player          = null;
    this.enemies         = [];
    this._justInteracted = false;
    this._prevHP         = 100;
    this._chestOpen      = false;
    this._allClear       = false;
  }

  create() {
    this._buildDungeon();
    this._spawnPlayer();
    this._spawnEnemies();
    this._spawnChest();
    this._spawnExit();
    this._setupCamera();
    this._setupInput();
    this._setupCollisions();
    this._showEntryHint();
  }

  // ── Dungeon map ────────────────────────────────────────────

  _buildDungeon() {
    this.physics.world.setBounds(0, 0, DW * TS, DH * TS);

    // Dark stone floor
    for (let y = 0; y < DH; y++) {
      for (let x = 0; x < DW; x++) {
        const isWall = x === 0 || x === DW - 1 || y === 0 || y === DH - 1;
        this.add.image(x * TS + TS / 2, y * TS + TS / 2, isWall ? 'tile_stone' : 'tile_dirt')
          .setDepth(0)
          .setTint(isWall ? 0x222244 : 0x332233);
      }
    }

    // Atmosphere — dim the scene
    this.add.rectangle(DW * TS / 2, DH * TS / 2, DW * TS, DH * TS, 0x000000, 0.35)
      .setDepth(1);

    // Title
    this.add.text(DW * TS / 2, 18, '⚠  DUNGEON  ⚠', {
      fontSize: '13px', color: '#cc88ff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50).setScrollFactor(0);
  }

  // ── Spawns ─────────────────────────────────────────────────

  _spawnPlayer() {
    const store  = useGameStore.getState();
    this.player  = new Player(this, 3 * TS, 9 * TS);
    this._prevHP = store.playerHP;
  }

  _spawnEnemies() {
    const defs = [
      { type: 'goblin', x:  8*TS, y:  5*TS },
      { type: 'goblin', x: 14*TS, y:  4*TS },
      { type: 'goblin', x: 18*TS, y:  8*TS },
      { type: 'goblin', x: 10*TS, y: 13*TS },
      { type: 'golem',  x: 19*TS, y: 13*TS },
    ];
    this.enemies = defs.map(d => new Enemy(this, d.x, d.y, d.type));
  }

  _spawnChest() {
    this.chest = this.physics.add.staticImage(21*TS, 9*TS, 'ore_node');
    this.chest.setTint(0xd4af37).setDepth(5);

    this.chestLabel = this.add.text(21*TS, 9*TS - 22, '🎁 Chest', {
      fontSize: '9px', color: '#d4af37', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    this.chestHint = this.add.text(21*TS, 9*TS + 22, '[E] Open', {
      fontSize: '9px', color: '#d4af3799', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6).setVisible(false);

    // Pulse
    this.tweens.add({ targets: this.chest, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
  }

  _spawnExit() {
    this.exitPortal = this.physics.add.staticImage(21*TS, 16*TS, 'checkpoint').setDepth(5);
    this.exitPortal.setTint(0x00ff88);

    this.add.text(21*TS, 16*TS - 22, '🌀 Exit', {
      fontSize: '9px', color: '#00ff88', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    this.add.text(21*TS, 16*TS + 22, '[E] Leave', {
      fontSize: '9px', color: '#00ff8899', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);
  }

  // ── Camera / Input ─────────────────────────────────────────

  _setupCamera() {
    this.cameras.main.setBounds(0, 0, DW * TS, DH * TS);
    this.cameras.main.startFollow(this.player.sprite, true, 0.09, 0.09);
    // Slight dark vignette feel
    this.cameras.main.setBackgroundColor('#0a0a14');
  }

  _setupInput() {
    this.cursors  = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.eKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  _setupCollisions() {
    this.physics.add.overlap(this.player.sprite, this.chest,
      () => this._onChestOverlap());
    this.physics.add.overlap(this.player.sprite, this.exitPortal,
      () => this._onExitOverlap());
  }

  // ── Overlap handlers ───────────────────────────────────────

  _onChestOverlap() {
    this.chestHint.setVisible(true);
    if (!this._justInteracted || this._chestOpen) return;

    // Check all enemies dead
    const allDead = this.enemies.every(e => !e.alive);
    if (!allDead) {
      this.showFloatText(this.chest.x, this.chest.y - 30,
        'Defeat all enemies first!', '#ff4444');
      return;
    }

    this._chestOpen = true;
    this.chest.setTint(0x888800);
    this.chestLabel.setText('✓ Opened');
    this.chestHint.setVisible(false);

    // Reward
    const store = useGameStore.getState();
    store.addResource('ore', 3);
    store.addResource('stone', 5);
    store.addItem({ id: 'dungeon_gem', name: 'Dungeon Gem', slot: null });

    this.showFloatText(this.chest.x, this.chest.y - 20, '🎁 +3 Ore  +5 Stone  +Dungeon Gem', '#d4af37');
    this._allClear = true;

    // Shake and flash
    this.cameras.main.flash(300, 180, 120, 255);
  }

  _onExitOverlap() {
    if (!this._justInteracted) return;
    // Return to WorldScene
    this.scene.start('WorldScene');
    useGameStore.getState().setGamePhase('world');
  }

  // ── Entry hint ─────────────────────────────────────────────

  _showEntryHint() {
    const { width } = this.scale;
    const hint = this.add.text(width / 2, 44,
      'Defeat all enemies to open the chest!',
      { fontSize: '11px', color: '#cc88ffcc', stroke: '#000', strokeThickness: 2 }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.time.delayedCall(4000, () => {
      this.tweens.add({ targets: hint, alpha: 0, duration: 800, onComplete: () => hint.destroy() });
    });
  }

  // ── Float text ─────────────────────────────────────────────

  showFloatText(x, y, text, color = '#ffffff') {
    const t = this.add.text(x, y, text, {
      fontSize: '13px', color, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(300);
    this.tweens.add({
      targets: t, y: y - 44, alpha: 0, duration: 1100,
      onComplete: () => t.destroy(),
    });
  }

  // ── Update ─────────────────────────────────────────────────

  update(time, delta) {
    const store = useGameStore.getState();
    if (store.showDeathModal) return;

    // Respawn detection — send back to world on death in dungeon
    if (this._prevHP === 0 && store.playerHP > 0) {
      this.scene.start('WorldScene');
      return;
    }
    this._prevHP = store.playerHP;

    // Chest hint visibility
    if (this.chestHint) this.chestHint.setVisible(false);

    this._justInteracted = Phaser.Input.Keyboard.JustDown(this.eKey) || InputState.interact;
    if (InputState.interact) InputState.interact = false;

    const attacking = Phaser.Input.Keyboard.JustDown(this.spaceKey) || InputState.attack;
    if (attacking) {
      this.player.attack(this.enemies);
      InputState.attack = false;
    }

    this.player.update(time, delta, this.cursors, this.wasd);
    this.enemies.forEach(e => e.update(time, delta, this.player));

    // All-clear banner
    if (!this._allClear) {
      const allDead = this.enemies.every(e => !e.alive);
      if (allDead) {
        this._allClear = true;
        const { width, height } = this.scale;
        const banner = this.add.text(width / 2, height / 2 - 60,
          '✓ All Enemies Defeated!\nOpen the chest to claim your reward.',
          { fontSize: '14px', color: '#d4af37', stroke: '#000', strokeThickness: 3, align: 'center' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(200);
        this.time.delayedCall(3000, () => {
          this.tweens.add({ targets: banner, alpha: 0, duration: 800, onComplete: () => banner.destroy() });
        });
      }
    }
  }
}
