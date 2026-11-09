import Phaser from 'phaser';
import { GAME_HEIGHT, POWERUP, CSS_COLORS, DEPTH } from '../config.js';

// Tipos de power-up: textura, nome exibido e cor do texto flutuante.
export const POWERUP_TYPES = {
  triple: { texture: 'pu-triple', label: 'TIRO TRIPLO!', color: CSS_COLORS.yellow },
  shield: { texture: 'pu-shield', label: 'ESCUDO!', color: CSS_COLORS.cyan },
  life: { texture: 'pu-life', label: '+1 VIDA!', color: CSS_COLORS.red },
};

export default class PowerUp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'pu-triple');
    this.kind = 'triple';
    this.age = 0;
  }

  spawn(x, y, kind) {
    this.kind = kind;
    this.setTexture(POWERUP_TYPES[kind].texture);
    this.enableBody(true, x, y, true, true);
    this.setDepth(DEPTH.powerUps);
    this.body.setCircle(15);
    this.setVelocity(Phaser.Math.Between(-25, 25), POWERUP.fallSpeed);
    this.age = 0;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    // [CONCEITO 7 - INTERFACE E FEEDBACK] "Pulsa" para chamar atenção.
    this.age += delta;
    this.setScale(1 + Math.sin(this.age * 0.012) * 0.14);
    if (this.y > GAME_HEIGHT + 30) this.despawn();
  }

  despawn() {
    this.disableBody(true, true);
  }
}
