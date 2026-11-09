import Phaser from 'phaser';
import Enemy from './Enemy.js';
import { ENEMIES, GAME_WIDTH } from '../config.js';

// Zigue-zague: desce oscilando de um lado para o outro (onda senoidal).
export default class ZigZagEnemy extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'zigzag', ENEMIES.zigzag);
  }

  onSpawn() {
    const { amplitude } = this.stats;
    // Garante que a oscilação inteira caiba na tela.
    this.baseX = Phaser.Math.Clamp(this.x, amplitude + 24, GAME_WIDTH - amplitude - 24);
    this.phase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.elapsed = 0;
    this.setVelocity(0, this.stats.speed * this.speedMultiplier);
  }

  // [CONCEITO 3 - TRANSFORM E FÍSICA] Exemplo que mistura os dois:
  // - eixo Y: FÍSICA (velocidade constante definida em onSpawn);
  // - eixo X: TRANSFORM (posição calculada diretamente por x = base + A·sen(ωt)).
  updateBehavior(time, delta) {
    this.elapsed += delta;
    const { amplitude, frequency } = this.stats;
    const wave = Math.sin(this.elapsed * frequency * this.speedMultiplier + this.phase);
    this.x = this.baseX + wave * amplitude;
    // Inclina na direção do movimento (derivada do seno = cosseno).
    this.setAngle(Math.cos(this.elapsed * frequency * this.speedMultiplier + this.phase) * -18);
  }
}
