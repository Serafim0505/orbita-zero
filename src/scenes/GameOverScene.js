import ResultScene from './ResultScene.js';
import { CSS_COLORS } from '../config.js';
import { textStyle, glowStyle } from '../ui/styles.js';

// [CONCEITO 5 - DERROTA] Tela exibida quando as vidas chegam a zero.
export default class GameOverScene extends ResultScene {
  constructor() {
    super('GameOverScene');
  }

  buildContent() {
    this.add.text(this.cx, 110, 'FIM DE JOGO', glowStyle(68, CSS_COLORS.red)).setOrigin(0.5);
    this.add
      .text(this.cx, 172, `Você chegou até a onda ${this.result.wave}`, textStyle(22, CSS_COLORS.muted))
      .setOrigin(0.5);
    this.addScoreCounter(232);
    this.addRecordLine(352);
  }
}
