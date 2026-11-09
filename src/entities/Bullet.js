import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../config.js';

// =============================================================================
// Bullet — projétil usado tanto pelo jogador quanto pelos inimigos.
// Os tiros vivem em POOLS (grupos com maxSize): em vez de criar e destruir
// objetos a cada disparo (o que gera trabalho para o coletor de lixo e pode
// causar "engasgos"), reaproveitamos sprites desativados.
// =============================================================================
export default class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = 'bullet') {
    super(scene, x, y, texture);
  }

  /**
   * "Acorda" o projétil do pool e o lança.
   * @param {number} angle ângulo em radianos (-PI/2 = para cima)
   */
  fire(x, y, angle, speed) {
    // [CONCEITO 3 - TRANSFORM E FÍSICA] A posição inicial é Transform; depois
    // quem move o tiro é a física, através da velocidade.
    this.enableBody(true, x, y, true, true);
    this.setDepth(DEPTH.bullets);
    this.setRotation(angle + Math.PI / 2); // a textura "aponta" para cima
    this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
    // Hitbox um pouco menor que o desenho: colisões mais justas para o jogador.
    if (this.texture.key === 'bullet') this.body.setSize(4, 16);
    else this.body.setCircle(5, 2, 2);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    const margin = 30;
    if (this.y < -margin || this.y > GAME_HEIGHT + margin || this.x < -margin || this.x > GAME_WIDTH + margin) {
      this.despawn();
    }
  }

  /** Devolve o projétil ao pool (inativo e invisível, pronto para reuso). */
  despawn() {
    this.disableBody(true, true);
  }
}
