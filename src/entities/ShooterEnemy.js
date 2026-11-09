import Phaser from 'phaser';
import Enemy from './Enemy.js';
import { ENEMIES, GAME_WIDTH } from '../config.js';
import audio from '../systems/AudioManager.js';

// [CONCEITO 6 - ESTADOS] O Atirador tem uma pequena máquina de estados:
//   ENTRANDO  → desce até uma altura sorteada no topo da tela
//   ATACANDO  → para, desliza para os lados e atira MIRANDO no jogador
//   SAINDO    → depois de alguns tiros, mergulha para baixo e vai embora
const STATES = { ENTERING: 'ENTRANDO', ATTACKING: 'ATACANDO', LEAVING: 'SAINDO' };

export default class ShooterEnemy extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'shooter', ENEMIES.shooter);
  }

  onSpawn() {
    this.setState(STATES.ENTERING);
    this.stopY = Phaser.Math.Between(this.stats.stopYMin, this.stats.stopYMax);
    this.shotsFired = 0;
    this.fireTimer = 450;
    this.setVelocity(0, this.stats.speed * this.speedMultiplier);
  }

  updateBehavior(time, delta) {
    switch (this.state) {
      case STATES.ENTERING:
        if (this.y >= this.stopY) {
          this.setState(STATES.ATTACKING);
          this.setVelocity(Phaser.Math.RND.sign() * this.stats.driftSpeed, 0);
        }
        break;

      case STATES.ATTACKING: {
        // Rebate nas bordas para não sair da tela enquanto ataca.
        const vx = this.body.velocity.x;
        if ((this.x < 40 && vx < 0) || (this.x > GAME_WIDTH - 40 && vx > 0)) this.body.velocity.x = -vx;

        this.fireTimer -= delta;
        if (this.fireTimer <= 0) {
          this.shoot();
          this.shotsFired += 1;
          this.fireTimer = this.stats.fireInterval / this.speedMultiplier;
          if (this.shotsFired >= this.stats.shotsBeforeLeaving) {
            this.setState(STATES.LEAVING);
            this.setVelocity(0, this.stats.speed * 1.6 * this.speedMultiplier);
          }
        }
        break;
      }

      default:
        break;
    }
  }

  /** Atira na direção ATUAL do jogador (ângulo calculado com atan2). */
  shoot() {
    const { player } = this.scene;
    if (!player.active) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.scene.fireEnemyBullet(this.x, this.y + 18, angle, this.stats.bulletSpeed);
    audio.play('enemyShoot');
  }
}
