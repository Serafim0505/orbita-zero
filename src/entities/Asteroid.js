import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, ASTEROID, COLORS, DEPTH } from '../config.js';

// Asteroide: obstáculo destrutível (2 acertos) que gira e cruza a tela na diagonal.
export default class Asteroid extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'asteroid');
    this.color = COLORS.asteroid;
    this.scoreValue = ASTEROID.score;
    this.hp = ASTEROID.hp;
  }

  spawn(speedMultiplier) {
    // Nasce no topo, de um dos lados, e atravessa para o lado oposto.
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft
      ? Phaser.Math.Between(-20, GAME_WIDTH * 0.45)
      : Phaser.Math.Between(GAME_WIDTH * 0.55, GAME_WIDTH + 20);
    this.enableBody(true, x, -40, true, true);
    this.setDepth(DEPTH.asteroids);
    this.clearTint();
    this.hp = ASTEROID.hp;
    this.setScale(Phaser.Math.FloatBetween(0.8, 1.25));
    this.body.setCircle(21, 5, 5);

    // [CONCEITO 3 - TRANSFORM E FÍSICA] Velocidade linear (diagonal) e
    // velocidade ANGULAR: a própria física gira o sprite a cada quadro.
    const speed = Phaser.Math.Between(ASTEROID.speedMin, ASTEROID.speedMax) * Math.sqrt(speedMultiplier);
    const sideways = Phaser.Math.Between(30, 110) * (fromLeft ? 1 : -1);
    this.setVelocity(sideways, speed);
    this.setAngularVelocity(Phaser.Math.Between(-140, 140));
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.y > GAME_HEIGHT + 60 || this.x < -90 || this.x > GAME_WIDTH + 90) this.despawn();
  }

  /** Retorna true quando o asteroide é destruído. */
  takeHit(damage = 1) {
    this.hp -= damage;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (this.active) this.clearTint();
    });
    return this.hp <= 0;
  }

  despawn() {
    this.setAngularVelocity(0);
    this.disableBody(true, true);
  }
}
