import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../config.js';

// =============================================================================
// Enemy — classe BASE de todos os inimigos comuns.
// Ela cuida do que é igual para todos (vida, pontos, piscar ao ser atingido,
// sair da tela). Cada subclasse (Drone, ZigZag, Shooter) só implementa o seu
// COMPORTAMENTO em onSpawn() e updateBehavior(). Isso é herança/polimorfismo:
// o GameScene trata todos como "Enemy" sem precisar saber o tipo exato.
// =============================================================================
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, stats) {
    super(scene, x, y, texture);
    this.stats = stats;
    this.color = stats.color;
    this.scoreValue = stats.score;
    this.hp = stats.hp;
    this.speedMultiplier = 1;
  }

  /** Reativa o inimigo do pool em (x, y), com a dificuldade da onda atual. */
  spawn(x, y, speedMultiplier) {
    this.enableBody(true, x, y, true, true);
    this.setDepth(DEPTH.enemies);
    this.clearTint();
    this.setAlpha(1);
    this.setAngle(0);
    this.hp = this.stats.hp;
    this.speedMultiplier = speedMultiplier;
    this.body.setCircle(this.width * 0.36, this.width * 0.14, this.height / 2 - this.width * 0.36);
    this.onSpawn();
  }

  /** Subclasses: configuram velocidade/estado inicial. */
  onSpawn() {}

  /** Subclasses: comportamento a cada quadro. */
  updateBehavior() {}

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.updateBehavior(time, delta);
    if (this.y > GAME_HEIGHT + 60 || this.x < -80 || this.x > GAME_WIDTH + 80) this.despawn();
  }

  /**
   * Aplica dano. Retorna true se o inimigo morreu.
   * [CONCEITO 7 - INTERFACE E FEEDBACK] Pisca em branco por alguns ms para o
   * jogador perceber que acertou.
   */
  takeHit(damage = 1) {
    this.hp -= damage;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (this.active) this.clearTint();
    });
    return this.hp <= 0;
  }

  despawn() {
    this.disableBody(true, true);
  }
}
