import Phaser from 'phaser';
import { useGameStore } from '../../store/useGameStore';
import { InputState } from '../systems/InputState';

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;

    // Physics sprite
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);

    // Attack ring indicator
    this.attackRing = scene.add.circle(x, y, 44, 0xffffff, 0.25);
    this.attackRing.setDepth(9);
    this.attackRing.setVisible(false);

    // Combat state
    this.attackCooldown  = 0;
    this.invincible      = false;
    this.invincibleTimer = 0;

    // Track prev HP for respawn detection
    this._prevHP = useGameStore.getState().playerHP;
  }

  update(time, delta, cursors, wasd) {
    const store = useGameStore.getState();

    // ── Movement ──────────────────────────────────────────────
    const speed = 150 + (store.playerSPD - 5) * 12;
    let vx = 0, vy = 0;

    if (cursors.left.isDown  || wasd.left.isDown)  vx = -1;
    else if (cursors.right.isDown || wasd.right.isDown) vx =  1;
    if (cursors.up.isDown    || wasd.up.isDown)    vy = -1;
    else if (cursors.down.isDown  || wasd.down.isDown)  vy =  1;

    // Virtual joystick overrides keyboard
    if (InputState.joystick.active) {
      vx = InputState.joystick.x;
      vy = InputState.joystick.y;
    }

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const mag = Math.sqrt(vx * vx + vy * vy);
      vx /= mag;
      vy /= mag;
    }

    this.sprite.setVelocity(vx * speed, vy * speed);
    this.attackRing.setPosition(this.sprite.x, this.sprite.y);

    // ── Attack cooldown ───────────────────────────────────────
    if (this.attackCooldown > 0) this.attackCooldown -= delta;

    // ── Invincibility frames ──────────────────────────────────
    if (this.invincible) {
      this.invincibleTimer -= delta;
      this.sprite.setAlpha(Math.sin(time / 60) > 0 ? 1 : 0.3);
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.sprite.setAlpha(1);
      }
    }

    // ── Periodic position save ────────────────────────────────
    if (!this._posTimer) this._posTimer = 0;
    this._posTimer += delta;
    if (this._posTimer > 5000) {
      this._posTimer = 0;
      useGameStore.setState({
        position: { zone: 'world', x: this.sprite.x, y: this.sprite.y },
      });
    }
  }

  attack(enemies) {
    if (this.attackCooldown > 0) return;

    const store = useGameStore.getState();
    this.attackCooldown = 600;

    // Flash attack ring
    this.attackRing.setVisible(true);
    this.scene.time.delayedCall(180, () => this.attackRing.setVisible(false));

    // Screen shake
    this.scene.cameras.main.shake(70, 0.003);

    // Hit detection
    const range = 52;
    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      const dist = Phaser.Math.Distance.Between(
        this.sprite.x, this.sprite.y,
        enemy.sprite.x, enemy.sprite.y
      );
      if (dist <= range) {
        enemy.takeDamage(store.playerATK);
      }
    });
  }

  takeDamage(amount) {
    if (this.invincible) return;

    const store   = useGameStore.getState();
    const damage  = Math.max(1, amount - store.playerDEF);
    store.takeDamage(damage);

    // I-frames
    this.invincible      = true;
    this.invincibleTimer = 800;

    // Flash red
    this.sprite.setTint(0xff3333);
    this.scene.time.delayedCall(180, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });
  }

  moveTo(x, y) {
    this.sprite.setPosition(x, y);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}
