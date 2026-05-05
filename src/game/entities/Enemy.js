import Phaser from 'phaser';
import { EnemyConfig } from '../config/EnemyConfig';
import { useGameStore } from '../../store/useGameStore';

const STATE = { PATROL: 'patrol', AGGRO: 'aggro', ATTACK: 'attack', DEAD: 'dead' };

export class Enemy {
  constructor(scene, x, y, type) {
    this.scene  = scene;
    this.type   = type;
    this.config = EnemyConfig[type];
    this.alive  = true;
    this.state  = STATE.PATROL;

    this.hp    = this.config.hp;
    this.maxHP = this.config.hp;

    // Physics sprite
    this.sprite = scene.physics.add.sprite(x, y, type);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(5);

    // HP bar
    this.hpBg  = scene.add.rectangle(x, y - 24, 32, 5, 0x333333).setDepth(6);
    this.hpFg  = scene.add.rectangle(x - 0, y - 24, 32, 5, 0xe74c3c).setDepth(7);
    this.hpBg.setVisible(false);
    this.hpFg.setVisible(false);

    // Name label (hidden until aggro)
    this.nameLabel = scene.add.text(x, y - 34, this.config.name, {
      fontSize: '9px', color: '#ff8888', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(8).setVisible(false);

    // Patrol state
    this.patrolOrigin = { x, y };
    this.patrolDir    = Phaser.Math.Between(0, 1) ? 1 : -1;
    this.patrolTimer  = Phaser.Math.Between(0, 2000);

    // Attack timer
    this.attackTimer = 0;
  }

  update(time, delta, player) {
    if (!this.alive || !player) return;

    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      player.sprite.x, player.sprite.y
    );

    // Update HP bar position
    this.hpBg.setPosition(this.sprite.x, this.sprite.y - 24);
    this.hpFg.setPosition(
      this.sprite.x - 16 + 16 * (this.hp / this.maxHP),
      this.sprite.y - 24
    );
    this.hpFg.setSize(32 * (this.hp / this.maxHP), 5);
    this.nameLabel.setPosition(this.sprite.x, this.sprite.y - 34);

    // Attack cooldown
    if (this.attackTimer > 0) this.attackTimer -= delta;

    // State transitions
    if (dist <= this.config.attackRange) {
      this.state = STATE.ATTACK;
    } else if (dist <= this.config.aggroRange) {
      this.state = STATE.AGGRO;
    } else {
      if (this.state === STATE.ATTACK || this.state === STATE.AGGRO) {
        // Lost player — go back to patrol origin
        this.state = STATE.PATROL;
      }
    }

    // Show HP/name when aggroed
    const showBars = this.state !== STATE.PATROL;
    this.hpBg.setVisible(showBars);
    this.hpFg.setVisible(showBars);
    this.nameLabel.setVisible(showBars);

    switch (this.state) {
      case STATE.PATROL: this._doPatrol(delta); break;
      case STATE.AGGRO:  this._doAggro(player); break;
      case STATE.ATTACK: this._doAttack(player); break;
    }
  }

  _doPatrol(delta) {
    this.patrolTimer += delta;
    if (this.patrolTimer > 2200) {
      this.patrolDir   = -this.patrolDir;
      this.patrolTimer = 0;
    }
    this.sprite.setVelocityX(this.config.speed * 0.35 * this.patrolDir);
    this.sprite.setVelocityY(0);
  }

  _doAggro(player) {
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      player.sprite.x, player.sprite.y
    );
    this.sprite.setVelocity(
      Math.cos(angle) * this.config.speed,
      Math.sin(angle) * this.config.speed
    );
  }

  _doAttack(player) {
    this.sprite.setVelocity(0, 0);
    if (this.attackTimer <= 0) {
      this.attackTimer = this.config.attackCooldown;
      player.takeDamage(this.config.atk);

      // Flash white on attack
      this.sprite.setTint(0xffffff);
      this.scene.time.delayedCall(120, () => {
        if (this.alive && this.sprite.active) this.sprite.clearTint();
      });
    }
  }

  takeDamage(amount) {
    const damage = Math.max(1, amount - this.config.def);
    this.hp -= damage;

    // Float damage number
    this.scene.showFloatText(this.sprite.x, this.sprite.y - 12, `-${damage}`, '#ff4444');

    // Flash
    this.sprite.setTint(0xff8888);
    this.scene.time.delayedCall(140, () => {
      if (this.alive && this.sprite.active) this.sprite.clearTint();
    });

    if (this.hp <= 0) this._die();
  }

  _die() {
    this.alive = false;
    this.state = STATE.DEAD;
    this.sprite.setVelocity(0, 0);
    this.hpBg.setVisible(false);
    this.hpFg.setVisible(false);
    this.nameLabel.setVisible(false);

    // Drop loot
    this._dropLoot();

    // Death tween
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleY: 0,
      duration: 380,
      onComplete: () => {
        this.sprite.setVisible(false);
        this.scene.time.delayedCall(this.config.respawnTime, () => this._respawn());
      },
    });
  }

  _dropLoot() {
    this.config.drops.forEach(drop => {
      if (Math.random() >= drop.chance) return;
      const res = ['wood', 'stone', 'ore'];
      if (res.includes(drop.item)) {
        useGameStore.getState().addResource(drop.item, drop.amount);
        this.scene.showFloatText(
          this.sprite.x,
          this.sprite.y - 32,
          `+${drop.amount} ${drop.item}`,
          '#7ed321'
        );
      }
    });
  }

  _respawn() {
    this.alive = true;
    this.state = STATE.PATROL;
    this.hp    = this.maxHP;
    this.sprite.setPosition(this.patrolOrigin.x, this.patrolOrigin.y);
    this.sprite.setAlpha(1);
    this.sprite.setScale(1);
    this.sprite.setVisible(true);
  }
}
