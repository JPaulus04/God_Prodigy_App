import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { useGameStore } from '../../store/useGameStore';

const WORLD_W = 1600;
const WORLD_H = 2400;
const TILE = 32;

export class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
    this.player = null;
    this.enemies = null;
    this.resourceNodes = null;
    this.checkpointGroup = null;
    this.npcGroup = null;
    this.joystickData = { dx: 0, dy: 0 };
    this.npcDialogueIndex = {};
    this.dialogueObjects = [];
    this.tutorialMessageObjects = [];
  }

  create() {
    this._buildWorld();
    this._spawnPlayer();
    this._spawnEnemies();
    this._placeResources();
    this._placeCheckpoints();
    this._placeNPCs();
    this._placeDungeon();
    this._setupCamera();
    this._setupInput();
    this._startTutorial();
  }

  // ─── World Build ────────────────────────────────────────────

  _buildWorld() {
    for (let y = 0; y < WORLD_H; y += TILE) {
      for (let x = 0; x < WORLD_W; x += TILE) {
        let key = 'tile_grass';
        if (x < 64 || x > WORLD_W - 96 || y < 64 || y > WORLD_H - 96) {
          key = 'tile_water';
        } else if (x > 950 && y < 850) {
          key = 'tile_forest';
        } else if (x < 580 && y > 1650) {
          key = 'tile_stone';
        } else if ((x > 375 && x < 415) || (y > 575 && y < 615)) {
          key = 'tile_dirt';
        }
        this.add.image(x + 16, y + 16, key).setDepth(0);
      }
    }
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
  }

  // ─── Spawn Player ───────────────────────────────────────────

  _spawnPlayer() {
    const store = useGameStore.getState();
    const x = store.position?.x || 400;
    const y = store.position?.y || 320;
    this.player = new Player(this, x, y);
  }

  // ─── Enemies ────────────────────────────────────────────────

  _spawnEnemies() {
    this.enemies = this.physics.add.group();

    const spawns = [
      { type: 'goblin', x: 620,  y: 420  },
      { type: 'goblin', x: 760,  y: 360  },
      { type: 'goblin', x: 510,  y: 620  },
      { type: 'goblin', x: 300,  y: 920  },
      { type: 'goblin', x: 1210, y: 310  },
      { type: 'golem',  x: 920,  y: 720  },
      { type: 'golem',  x: 1110, y: 510  },
      { type: 'golem',  x: 820,  y: 1220 },
    ];

    spawns.forEach(({ type, x, y }) => {
      const e = new Enemy(this, x, y, type);
      this.enemies.add(e);
    });
  }

  // ─── Resources ──────────────────────────────────────────────

  _placeResources() {
    this.resourceNodes = this.physics.add.staticGroup();

    const nodes = [
      { key: 'tree',     type: 'wood',  amt: 3, x: 250,  y: 300  },
      { key: 'tree',     type: 'wood',  amt: 3, x: 330,  y: 240  },
      { key: 'tree',     type: 'wood',  amt: 2, x: 460,  y: 175  },
      { key: 'tree',     type: 'wood',  amt: 3, x: 920,  y: 190  },
      { key: 'tree',     type: 'wood',  amt: 3, x: 1110, y: 145  },
      { key: 'tree',     type: 'wood',  amt: 2, x: 1210, y: 410  },
      { key: 'rock',     type: 'stone', amt: 2, x: 710,  y: 810  },
      { key: 'rock',     type: 'stone', amt: 2, x: 860,  y: 910  },
      { key: 'rock',     type: 'stone', amt: 3, x: 210,  y: 1710 },
      { key: 'rock',     type: 'stone', amt: 2, x: 360,  y: 1820 },
      { key: 'ore_node', type: 'ore',   amt: 1, x: 1010, y: 1010 },
      { key: 'ore_node', type: 'ore',   amt: 1, x: 1210, y: 1210 },
      { key: 'ore_node', type: 'ore',   amt: 2, x: 410,  y: 1910 },
    ];

    nodes.forEach(({ key, type, amt, x, y }) => {
      const node = this.resourceNodes.create(x, y, key);
      node.resourceType = type;
      node.resourceAmount = amt;
      node.depleted = false;
      node.setDepth(2);
    });
  }

  // ─── Checkpoints ────────────────────────────────────────────

  _placeCheckpoints() {
    this.checkpointGroup = this.physics.add.staticGroup();

    const cps = [
      { id: 'cp_crossroads', x: 510,  y: 510  },
      { id: 'cp_forest',     x: 1010, y: 410  },
      { id: 'cp_ruins',      x: 810,  y: 1110 },
    ];

    cps.forEach(({ id, x, y }) => {
      const cp = this.checkpointGroup.create(x, y, 'checkpoint');
      cp.checkpointId = id;
      cp.setDepth(3);

      this.add.text(x, y - 28, '⚑ Checkpoint', {
        fontSize: '9px', color: '#f1c40f',
        backgroundColor: '#00000099', padding: { x: 3, y: 2 },
      }).setOrigin(0.5).setDepth(4);
    });

    // Player overlaps checkpoint
    this.physics.add.overlap(this.player, this.checkpointGroup, (player, cp) => {
      this._activateCheckpoint(cp.checkpointId);
    });
  }

  // ─── NPCs ───────────────────────────────────────────────────

  _placeNPCs() {
    this.npcGroup = this.physics.add.staticGroup();

    const npcs = [
      {
        id: 'elder',
        x: 430, y: 345,
        name: 'Elder Vorn',
        dialogues: [
          'Welcome, young warrior. This world holds great power — and great danger.',
          'Gather wood and stone to build your stronghold. It is your foundation.',
          'The forest to the northeast hides goblins. Approach with caution.',
          'Stone golems guard the mountain paths. They hit hard — upgrade first.',
          'Find the checkpoints across the land. They will save your life on death.',
          'The Fire God stirs in the volcanic peaks far to the south. Not yet.',
          'Ten gods stand between you and ascension. Defeat them all to become one.',
        ],
      },
    ];

    npcs.forEach(({ id, x, y, name, dialogues }) => {
      const npc = this.npcGroup.create(x, y, 'npc');
      npc.npcId = id;
      npc.npcName = name;
      npc.dialogues = dialogues;
      npc.setDepth(3);
      this.npcDialogueIndex[id] = 0;

      this.add.text(x, y - 30, name, {
        fontSize: '10px', color: '#1abc9c',
        backgroundColor: '#00000099', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(4);

      // Interact hint ring
      this.add.circle(x, y, 18, 0x1abc9c, 0.15).setDepth(2);
    });
  }

  // ─── Dungeon Door ───────────────────────────────────────────

  _placeDungeon() {
    this.dungeonDoorGroup = this.physics.add.staticGroup();
    const door = this.dungeonDoorGroup.create(1410, 1410, 'dungeon_door');
    door.setDepth(3);

    this.add.text(1410, 1370, '⚠ DUNGEON', {
      fontSize: '10px', color: '#8e44ad',
      backgroundColor: '#00000099', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(4);
  }

  // ─── Camera ─────────────────────────────────────────────────

  _setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.6);
  }

  // ─── Input ──────────────────────────────────────────────────

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.attackKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Receive joystick data from UIScene
    this.events.on('joystick', (data) => { this.joystickData = data; });
    this.events.on('actionButton',   () => { this._performAttack(); });
    this.events.on('interactButton', () => { this._tryInteract(); });
  }

  // ─── Tutorial ───────────────────────────────────────────────

  _startTutorial() {
    const store = useGameStore.getState();
    if (store.tutorialStep === 0) {
      this.time.delayedCall(800, () => {
        this._showMessage('Use WASD or the joystick to move. Press E or tap INTERACT near objects.');
        store.advanceTutorial();
      });
    }
  }

  // ─── Message Display ────────────────────────────────────────

  _showMessage(text, duration = 3500) {
    // Remove any existing message
    this.tutorialMessageObjects.forEach(o => o.destroy());
    this.tutorialMessageObjects = [];

    const { width, height } = this.scale;

    const bg = this.add.rectangle(width / 2, height - 130, width - 32, 56, 0x000000, 0.82)
      .setScrollFactor(0).setDepth(50).setStrokeStyle(1, 0xd4af37, 0.5);

    const txt = this.add.text(width / 2, height - 130, text, {
      fontSize: '12px', color: '#ffffff',
      wordWrap: { width: width - 52 }, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51);

    this.tutorialMessageObjects = [bg, txt];

    this.time.delayedCall(duration, () => {
      this.tutorialMessageObjects.forEach(o => o.destroy());
      this.tutorialMessageObjects = [];
    });
  }

  // ─── Checkpoint ─────────────────────────────────────────────

  _activateCheckpoint(id) {
    const store = useGameStore.getState();
    if (!store.checkpoints.includes(id)) {
      store.activateCheckpoint(id);
      this._showMessage('⚑ Checkpoint activated! You can respawn here if you fall.');
    }
  }

  // ─── Interact ───────────────────────────────────────────────

  _tryInteract() {
    if (!this.player) return;
    const range = 85;

    // NPCs
    this.npcGroup.getChildren().forEach((npc) => {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y) < range) {
        this._showNPCDialogue(npc);
      }
    });

    // Resources
    this.resourceNodes.getChildren().forEach((node) => {
      if (
        !node.depleted &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y) < range
      ) {
        this._gatherResource(node);
      }
    });

    // Dungeon door
    this.dungeonDoorGroup?.getChildren().forEach((door) => {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y) < range) {
        this._showMessage('Dungeon unlocked in Phase 2. Build your stronghold first!');
      }
    });
  }

  // ─── NPC Dialogue ───────────────────────────────────────────

  _showNPCDialogue(npc) {
    const idx = this.npcDialogueIndex[npc.npcId] || 0;
    const line = npc.dialogues[idx];
    this.npcDialogueIndex[npc.npcId] = (idx + 1) % npc.dialogues.length;

    const { width, height } = this.scale;

    this.dialogueObjects.forEach(o => o.destroy());
    this.dialogueObjects = [];

    const bg = this.add.rectangle(width / 2, height - 90, width - 28, 88, 0x0d0d1a, 0.94)
      .setScrollFactor(0).setDepth(50).setStrokeStyle(1, 0x1abc9c, 0.8);

    const nameTag = this.add.text(20, height - 128, npc.npcName, {
      fontSize: '11px', color: '#1abc9c', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(51);

    const lineTxt = this.add.text(width / 2, height - 90, `"${line}"`, {
      fontSize: '12px', color: '#eeeeee',
      wordWrap: { width: width - 44 }, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51);

    this.dialogueObjects = [bg, nameTag, lineTxt];

    this.time.delayedCall(4500, () => {
      this.dialogueObjects.forEach(o => o.destroy());
      this.dialogueObjects = [];
    });
  }

  // ─── Gather Resource ────────────────────────────────────────

  _gatherResource(node) {
    const store = useGameStore.getState();
    store.addResource(node.resourceType, node.resourceAmount);

    this._showMessage(`+${node.resourceAmount} ${node.resourceType} gathered!`, 2000);

    // Flash
    this.tweens.add({
      targets: node, alpha: 0.25, duration: 100, yoyo: true,
    });

    node.depleted = true;
    node.setAlpha(0.3);

    // Respawn node after 30s
    this.time.delayedCall(30000, () => {
      node.depleted = false;
      node.setAlpha(1);
    });

    // Tutorial step
    if (store.tutorialStep === 1) {
      this.time.delayedCall(600, () => {
        this._showMessage('Good! Gather more resources then visit your stronghold to build.');
        store.advanceTutorial();
      });
    }
  }

  // ─── Attack ─────────────────────────────────────────────────

  _performAttack() {
    if (!this.player) return;
    const store = useGameStore.getState();
    const atk = store.playerATK;
    const range = 85;
    let hit = false;

    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.isDead) return;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) < range) {
        enemy.takeDamage(atk);
        hit = true;

        // Damage number
        const dmg = this.add.text(enemy.x, enemy.y - 24, `-${atk}`, {
          fontSize: '14px', color: '#ff4444', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(20);
        this.tweens.add({
          targets: dmg, y: enemy.y - 56, alpha: 0, duration: 700,
          onComplete: () => dmg.destroy(),
        });
      }
    });

    // Player swing animation
    if (hit) {
      this.tweens.add({
        targets: this.player,
        scaleX: 1.35, scaleY: 1.35, duration: 70, yoyo: true,
      });
    }

    // Tutorial step
    const tutStep = store.tutorialStep;
    if (tutStep === 2 && hit) {
      this.time.delayedCall(400, () => {
        this._showMessage('Enemies drop resources and sometimes gear. Keep fighting!');
        store.advanceTutorial();
      });
    }
  }

  // ─── Update Loop ────────────────────────────────────────────

  update() {
    if (!this.player) return;

    const speed = 130;
    let vx = 0;
    let vy = 0;

    // Keyboard
    if (this.wasd.left.isDown  || this.cursors.left.isDown)  vx = -speed;
    else if (this.wasd.right.isDown || this.cursors.right.isDown) vx = speed;
    if (this.wasd.up.isDown    || this.cursors.up.isDown)    vy = -speed;
    else if (this.wasd.down.isDown  || this.cursors.down.isDown)  vy = speed;

    // Joystick overrides keyboard if active
    const { dx, dy } = this.joystickData;
    if (Math.abs(dx) > 0.08 || Math.abs(dy) > 0.08) {
      vx = dx * speed;
      vy = dy * speed;
    }

    this.player.setVelocity(vx, vy);

    // Keyboard shortcuts
    if (Phaser.Input.Keyboard.JustDown(this.attackKey))   this._performAttack();
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this._tryInteract();

    // Enemy AI
    this.enemies.getChildren().forEach((e) => { if (!e.isDead) e.update(this.player); });

    // Persist position every ~5s
    if (Math.floor(this.time.now / 5000) !== this._lastPosSave) {
      this._lastPosSave = Math.floor(this.time.now / 5000);
      useGameStore.setState({
        position: { zone: 'world', x: Math.round(this.player.x), y: Math.round(this.player.y) },
      });
    }
  }
}
