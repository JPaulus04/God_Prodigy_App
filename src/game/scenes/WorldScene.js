import Phaser from 'phaser';
import { Player }      from '../entities/Player';
import { Enemy }       from '../entities/Enemy';
import { InputState }  from '../systems/InputState';
import { useGameStore } from '../../store/useGameStore';

const TS = 32;
const MW = 50;
const MH = 50;

export class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
    this.player          = null;
    this.enemies         = [];
    this.resourceNodes   = [];
    this.checkpointObjs  = [];
    this.itemPickups     = [];
    this._justInteracted = false;
    this._dialogueOpen   = false;
    this._dialogueIndex  = 0;
    this._prevHP         = 100;
  }

  create() {
    this._buildMap();
    this._spawnPlayer();
    this._spawnResources();
    this._spawnEnemies();
    this._spawnCheckpoints();
    this._spawnNPC();
    this._spawnStrongholdPortal();
    this._spawnDungeonEntrance();
    this._spawnItemPickups();
    this._setupCamera();
    this._setupInput();
    this._setupCollisions();
    this._showTutorialHint();
  }

  // ── Map ────────────────────────────────────────────────────

  _buildMap() {
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        this.add.image(x * TS + TS / 2, y * TS + TS / 2, this._tileAt(x, y)).setDepth(0);
      }
    }
    this.physics.world.setBounds(0, 0, MW * TS, MH * TS);
  }

  _tileAt(x, y) {
    if (x < 2 || x >= MW - 2 || y < 2 || y >= MH - 2) return 'tile_water';
    if (y < 14 && x > 4 && x < MW - 4)                 return 'tile_forest';
    if (x > 34 && y > 8 && y < 42)                     return 'tile_stone';
    if (x === 25 || y === 25)                           return 'tile_dirt';
    return 'tile_grass';
  }

  // ── Spawns ─────────────────────────────────────────────────

  _spawnPlayer() {
    const store  = useGameStore.getState();
    const sx     = store.position?.x || 25 * TS;
    const sy     = store.position?.y || 30 * TS;
    this.player  = new Player(this, sx, sy);
    this._prevHP = store.playerHP;
  }

  _spawnResources() {
    const defs = [
      { key: 'tree',     res: 'wood',  amt: 2, x:  8*TS, y:  7*TS },
      { key: 'tree',     res: 'wood',  amt: 2, x: 12*TS, y:  9*TS },
      { key: 'tree',     res: 'wood',  amt: 2, x: 16*TS, y:  6*TS },
      { key: 'tree',     res: 'wood',  amt: 2, x: 20*TS, y:  8*TS },
      { key: 'tree',     res: 'wood',  amt: 2, x: 24*TS, y: 11*TS },
      { key: 'tree',     res: 'wood',  amt: 2, x: 30*TS, y:  7*TS },
      { key: 'rock',     res: 'stone', amt: 2, x: 14*TS, y: 22*TS },
      { key: 'rock',     res: 'stone', amt: 2, x: 20*TS, y: 38*TS },
      { key: 'rock',     res: 'stone', amt: 2, x: 10*TS, y: 30*TS },
      { key: 'rock',     res: 'stone', amt: 2, x: 32*TS, y: 40*TS },
      { key: 'ore_node', res: 'ore',   amt: 1, x: 37*TS, y: 16*TS },
      { key: 'ore_node', res: 'ore',   amt: 1, x: 41*TS, y: 24*TS },
      { key: 'ore_node', res: 'ore',   amt: 1, x: 38*TS, y: 34*TS },
    ];
    this.resourceNodes = defs.map(d => {
      const node = this.physics.add.staticImage(d.x, d.y, d.key);
      node.setData('res', d.res);
      node.setData('amt', d.amt);
      node.setData('depleted', false);
      return node;
    });
  }

  _spawnEnemies() {
    const defs = [
      { type: 'goblin', x: 12*TS, y: 18*TS },
      { type: 'goblin', x: 18*TS, y: 15*TS },
      { type: 'goblin', x: 22*TS, y: 20*TS },
      { type: 'goblin', x:  8*TS, y: 22*TS },
      { type: 'golem',  x: 38*TS, y: 20*TS },
      { type: 'golem',  x: 42*TS, y: 30*TS },
    ];
    this.enemies = defs.map(d => new Enemy(this, d.x, d.y, d.type));
  }

  _spawnCheckpoints() {
    const defs = [
      { id: 'cp_center', x: 25*TS, y: 25*TS },
      { id: 'cp_forest', x: 15*TS, y: 10*TS },
      { id: 'cp_east',   x: 40*TS, y: 18*TS },
    ];
    this.checkpointObjs = defs.map(d => {
      const cp = this.physics.add.staticImage(d.x, d.y, 'checkpoint').setDepth(2);
      cp.setData('id', d.id);
      this.tweens.add({ targets: cp, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });
      return cp;
    });
  }

  _spawnNPC() {
    this.npcSprite = this.physics.add.staticImage(23*TS, 28*TS, 'npc').setDepth(5);
    this.add.text(23*TS, 28*TS - 22, 'Elder Kael', {
      fontSize: '9px', color: '#1abc9c', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    this._dialogues = [
      '"Welcome, warrior. Ten elemental gods rule this realm. Defeat them all and ascend."',
      '"Start by gathering resources — wood in the north forest, stone scattered around, ore in the rocky east."',
      '"Goblins lurk in the forest. Weak alone, but they move in packs."',
      '"The stone golems in the east are far more dangerous. Gear up before facing them."',
      '"Your Stronghold is to the south — the glowing golden gate. Return there to upgrade your structures."',
      '"The Dungeon entrance is to the northeast, marked in purple. Only the prepared should enter."',
      '"Upgrade your Forge first. It unlocks weapon crafting — you will need it for the bosses ahead."',
      '"Safe travels. The path to godhood is long — but you have already begun."',
    ];
  }

  _spawnStrongholdPortal() {
    // Stronghold portal — south of center, easy to find from spawn
    const portal = this.physics.add.staticImage(25*TS, 44*TS, 'dungeon_door').setDepth(5);
    portal.setTint(0xd4af37);

    this.add.text(25*TS, 44*TS - 34, '🏰 STRONGHOLD', {
      fontSize: '10px', color: '#d4af37', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    this.add.text(25*TS, 44*TS + 30, '[E] Enter', {
      fontSize: '9px', color: '#d4af3799', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    // Pulse glow
    this.tweens.add({ targets: portal, alpha: 0.6, duration: 800, yoyo: true, repeat: -1 });

    this.strongholdPortal = portal;
  }

  _spawnDungeonEntrance() {
    const door = this.physics.add.staticImage(43*TS, 10*TS, 'dungeon_door').setDepth(5);
    door.setTint(0x8e44ad);

    this.add.text(43*TS, 10*TS - 34, '⚠ DUNGEON', {
      fontSize: '10px', color: '#cc88ff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    this.add.text(43*TS, 10*TS + 30, '[E] Enter', {
      fontSize: '9px', color: '#cc88ff99', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    this.dungeonEntrance = door;
  }

  _spawnItemPickups() {
    // Iron sword — on the ground near the center, easy to find
    const sword = this.physics.add.staticImage(27*TS, 27*TS, 'iron_sword').setDepth(3);
    sword.setData('itemId', 'iron_sword');
    sword.setData('collected', false);

    // Glow tween
    this.tweens.add({ targets: sword, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });

    // Label
    this.add.text(27*TS, 27*TS - 20, 'Iron Sword', {
      fontSize: '9px', color: '#bdc3c7', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4);

    this.itemPickups = [sword];
  }

  // ── Camera / Input ─────────────────────────────────────────

  _setupCamera() {
    this.cameras.main.setBounds(0, 0, MW * TS, MH * TS);
    this.cameras.main.startFollow(this.player.sprite, true, 0.09, 0.09);
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
    this.iKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
  }

  _setupCollisions() {
    this.physics.add.overlap(this.player.sprite, this.resourceNodes,
      (_, node) => this._onResourceOverlap(node));

    this.physics.add.overlap(this.player.sprite, this.checkpointObjs,
      (_, cp) => this._onCheckpointOverlap(cp));

    this.physics.add.overlap(this.player.sprite, this.npcSprite,
      () => this._onNPCOverlap());

    this.physics.add.overlap(this.player.sprite, this.strongholdPortal,
      () => this._onStrongholdOverlap());

    this.physics.add.overlap(this.player.sprite, this.dungeonEntrance,
      () => this._onDungeonOverlap());

    this.physics.add.overlap(this.player.sprite, this.itemPickups,
      (_, item) => this._onItemOverlap(item));
  }

  // ── Overlap Handlers ───────────────────────────────────────

  _onResourceOverlap(node) {
    if (!this._justInteracted || node.getData('depleted')) return;
    const res = node.getData('res');
    const amt = node.getData('amt');
    useGameStore.getState().addResource(res, amt);
    node.setAlpha(0.3).setData('depleted', true);
    this.showFloatText(node.x, node.y - 10, `+${amt} ${res}`, '#7ed321');
    this.time.delayedCall(30000, () => {
      node.setAlpha(1).setData('depleted', false);
    });
  }

  _onCheckpointOverlap(cp) {
    const id    = cp.getData('id');
    const store = useGameStore.getState();
    if (store.lastCheckpoint === id) return;
    store.activateCheckpoint(id);
    this.showFloatText(cp.x, cp.y - 24, '✓ Checkpoint', '#f1c40f');
    cp.setTint(0x00ff88);
  }

  _onNPCOverlap() {
    if (!this._justInteracted || this._dialogueOpen) return;
    this._openDialogue();
  }

  _onStrongholdOverlap() {
    if (!this._justInteracted) return;
    // Stop player, open stronghold menu via React
    this.player.sprite.setVelocity(0, 0);
    useGameStore.getState().setGamePhase('stronghold');
  }

  _onDungeonOverlap() {
    if (!this._justInteracted) return;
    this.player.sprite.setVelocity(0, 0);
    // Transition to DungeonScene
    this.scene.start('DungeonScene');
  }

  _onItemOverlap(item) {
    if (!this._justInteracted || item.getData('collected')) return;
    const itemId = item.getData('itemId');
    const store  = useGameStore.getState();
    const added  = store.addItem({ id: itemId, slot: 'weapon', atk: 6 });
    if (added) {
      item.setData('collected', true);
      item.setVisible(false);
      this.showFloatText(item.x, item.y - 10, '⚔ Iron Sword picked up!', '#bdc3c7');
    }
  }

  // ── Dialogue ──────────────────────────────────────────────

  _openDialogue() {
    this._dialogueOpen = true;
    const { width, height } = this.scale;
    const text = this._dialogues[this._dialogueIndex % this._dialogues.length];
    this._dialogueIndex++;

    const pad  = 20;
    const boxH = 110;
    const boxY = height - boxH - pad;

    this._dlgBg   = this.add.rectangle(width / 2, boxY + boxH / 2, width - pad * 2, boxH, 0x000000, 0.88)
      .setScrollFactor(0).setDepth(200).setStrokeStyle(2, 0xd4af37);

    this._dlgText = this.add.text(pad + 10, boxY + 10,
      `Elder Kael:\n${text}`,
      { fontSize: '12px', color: '#ffffff', wordWrap: { width: width - pad * 2 - 20 }, lineSpacing: 4 }
    ).setScrollFactor(0).setDepth(201);

    this._dlgHint = this.add.text(width - pad - 8, boxY + boxH - 18, '[E] Close', {
      fontSize: '10px', color: '#d4af37',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(201);

    this.time.delayedCall(220, () => {
      this.input.keyboard.once('keydown-E', () => this._closeDialogue());
    });
  }

  _closeDialogue() {
    this._dialogueOpen = false;
    [this._dlgBg, this._dlgText, this._dlgHint].forEach(o => o?.destroy());
    this._dlgBg = this._dlgText = this._dlgHint = null;
  }

  // ── Tutorial hint ──────────────────────────────────────────

  _showTutorialHint() {
    const { width } = this.scale;
    const hint = this.add.text(width / 2, 80,
      'Move: WASD / Joystick  |  Attack: SPACE / ⚔  |  Interact: E  |  Inventory: I',
      { fontSize: '10px', color: '#ffffffaa', stroke: '#000', strokeThickness: 2 }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.time.delayedCall(6000, () => {
      this.tweens.add({ targets: hint, alpha: 0, duration: 1000, onComplete: () => hint.destroy() });
    });
  }

  // ── Float text ─────────────────────────────────────────────

  showFloatText(x, y, text, color = '#ffffff') {
    const t = this.add.text(x, y, text, {
      fontSize: '14px', color, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(300);
    this.tweens.add({
      targets: t, y: y - 44, alpha: 0, duration: 1100,
      onComplete: () => t.destroy(),
    });
  }

  // ── Update ─────────────────────────────────────────────────

  update(time, delta) {
    const store = useGameStore.getState();

    // Pause world while overlays are open
    if (store.showDeathModal || store.gamePhase === 'stronghold') {
      this.player?.sprite.setVelocity(0, 0);
      return;
    }

    // Respawn detection
    if (this._prevHP === 0 && store.playerHP > 0) {
      const pos = this._getRespawnPos(store.lastCheckpoint);
      this.player.moveTo(pos.x, pos.y);
    }
    this._prevHP = store.playerHP;

    // Inventory toggle
    if (Phaser.Input.Keyboard.JustDown(this.iKey)) {
      store.toggleInventory();
    }

    // Interact flag — true for one frame only
    this._justInteracted = Phaser.Input.Keyboard.JustDown(this.eKey) || InputState.interact;
    if (InputState.interact) InputState.interact = false;

    // Attack
    const attacking = Phaser.Input.Keyboard.JustDown(this.spaceKey) || InputState.attack;
    if (attacking) {
      this.player.attack(this.enemies);
      InputState.attack = false;
    }

    this.player.update(time, delta, this.cursors, this.wasd);
    this.enemies.forEach(e => e.update(time, delta, this.player));
  }

  _getRespawnPos(checkpointId) {
    const map = {
      stronghold: { x: 25*TS, y: 30*TS },
      cp_center:  { x: 25*TS, y: 25*TS },
      cp_forest:  { x: 15*TS, y: 10*TS },
      cp_east:    { x: 40*TS, y: 18*TS },
    };
    return map[checkpointId] || map.stronghold;
  }
}
