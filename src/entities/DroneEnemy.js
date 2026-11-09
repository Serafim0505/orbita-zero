import Enemy from './Enemy.js';
import { ENEMIES } from '../config.js';

// Drone: o inimigo mais simples. Desce em linha reta.
export default class DroneEnemy extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'drone', ENEMIES.drone);
  }

  onSpawn() {
    // [CONCEITO 2 - MOVIMENTAÇÃO] Velocidade constante para baixo: a física
    // atualiza a posição sozinha a cada quadro.
    this.setVelocity(0, this.stats.speed * this.speedMultiplier);
  }
}
