import Phaser from 'phaser';
import ResultScene from './ResultScene.js';
import { GAME_WIDTH, BOSS, COLORS, CSS_COLORS, VICTORY_LIFE_BONUS } from '../config.js';
import Effects from '../systems/Effects.js';
import { textStyle, glowStyle, formatNumber } from '../ui/styles.js';

// [CONCEITO 5 - VITÓRIA] Tela exibida ao derrotar o chefe da onda 10.
export default class VictoryScene extends ResultScene {
  constructor() {
    super('VictoryScene');
  }

  buildContent() {
    const { bonus, lives } = this.result;
    this.add.text(this.cx, 96, 'VITÓRIA!', glowStyle(72, CSS_COLORS.green)).setOrigin(0.5);
    this.add
      .text(this.cx, 156, `O ${BOSS.name} foi destruído. A órbita está segura!`, textStyle(22, CSS_COLORS.white))
      .setOrigin(0.5);
    this.add
      .text(
        this.cx,
        190,
        `Bônus de vidas: ${lives} × ${formatNumber(VICTORY_LIFE_BONUS)} = +${formatNumber(bonus)}`,
        textStyle(18, CSS_COLORS.yellow, { fontStyle: 'bold' }),
      )
      .setOrigin(0.5);
    this.addScoreCounter(236);
    this.addRecordLine(356);
    this.startFireworks();
  }

  // [CONCEITO 7 - FEEDBACK] Fogos de artifício de partículas para comemorar.
  startFireworks() {
    // Profundidade -1: os fogos ficam atrás dos textos.
    const effects = new Effects(this, -1);
    const colors = [COLORS.cyan, COLORS.magenta, COLORS.yellow, COLORS.green];
    this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
        const y = Phaser.Math.Between(60, 420);
        effects.explosion(x, y, Phaser.Utils.Array.GetRandom(colors), 26, 5);
      },
    });
  }
}
