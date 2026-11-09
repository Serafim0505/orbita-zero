import Phaser from 'phaser';
import { CSS_COLORS, DEPTH } from '../config.js';
import { textStyle } from '../ui/styles.js';

// =============================================================================
// [CONCEITO 7 - INTERFACE E FEEDBACK]
// Effects concentra o "suco" visual: explosões de partículas, onda de choque,
// faíscas de impacto e textos flutuantes de pontuação. Feedback imediato faz o
// jogador SENTIR cada acerto.
// =============================================================================
export default class Effects {
  constructor(scene, depth = DEPTH.effects) {
    this.scene = scene;
    this.depth = depth;
    this.emitters = new Map(); // um emissor de partículas por cor, criado sob demanda
  }

  emitterFor(color) {
    if (!this.emitters.has(color)) {
      const emitter = this.scene.add.particles(0, 0, 'particle', {
        lifespan: { min: 300, max: 750 },
        speed: { min: 50, max: 260 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: color,
        blendMode: 'ADD',
        emitting: false,
      });
      emitter.setDepth(this.depth);
      this.emitters.set(color, emitter);
    }
    return this.emitters.get(color);
  }

  /** Explosão: partículas + anel de choque que expande e some. */
  explosion(x, y, color, count = 20, ringSize = 4) {
    this.emitterFor(color).explode(count, x, y);
    this.emitterFor(0xffffff).explode(Math.ceil(count / 4), x, y);

    const ring = this.scene.add.circle(x, y, 10).setStrokeStyle(3, color, 1).setDepth(this.depth);
    this.scene.tweens.add({
      targets: ring,
      scale: ringSize,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    });
  }

  /** Faísca pequena no ponto de impacto de um tiro que não matou. */
  spark(x, y, color) {
    this.emitterFor(color).explode(5, x, y);
  }

  /** Texto que sobe e desaparece (ex.: "+150"). */
  floatingText(x, y, text, color = CSS_COLORS.yellow, size = 18) {
    const label = this.scene.add
      .text(x, y, text, textStyle(size, color, { fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }))
      .setOrigin(0.5)
      .setDepth(DEPTH.floatingText);
    this.scene.tweens.add({
      targets: label,
      y: y - 46,
      alpha: { from: 1, to: 0 },
      duration: 850,
      ease: 'Cubic.Out',
      onComplete: () => label.destroy(),
    });
  }
}

export const randomOffset = (range) => Phaser.Math.Between(-range, range);
