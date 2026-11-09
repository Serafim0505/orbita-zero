import Phaser from 'phaser';
import { GAME_WIDTH, CSS_COLORS } from '../config.js';
import Starfield from '../systems/Starfield.js';
import { textStyle, glowStyle, formatNumber } from '../ui/styles.js';

// =============================================================================
// ResultScene — base comum para GameOverScene e VictoryScene (evita repetir
// código). Mostra a pontuação final com contagem animada, o recorde e as
// opções: ENTER joga de novo, M volta ao menu.
// =============================================================================
export default class ResultScene extends Phaser.Scene {
  init(data) {
    this.result = data;
  }

  create() {
    this.starfield = new Starfield(this, 0.4);
    this.ready = false;
    this.cx = GAME_WIDTH / 2;

    this.buildContent();
    this.buildFooter();

    // Pequeno atraso antes de aceitar teclas: evita pular a tela sem querer
    // (por exemplo, se o jogador estava segurando ENTER/Espaço).
    this.time.delayedCall(500, () => {
      this.ready = true;
    });
    this.input.keyboard.on('keydown-ENTER', () => this.go('GameScene'));
    this.input.keyboard.on('keydown-M', () => this.go('MenuScene'));
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  /** Subclasses desenham título e detalhes. */
  buildContent() {}

  /** Número que "conta" de 0 até a pontuação final. */
  addScoreCounter(y, label = 'PONTUAÇÃO FINAL') {
    this.add.text(this.cx, y, label, textStyle(16, CSS_COLORS.muted, { fontStyle: 'bold' })).setOrigin(0.5);
    const scoreText = this.add
      .text(this.cx, y + 38, '0', glowStyle(46, CSS_COLORS.white, CSS_COLORS.cyan))
      .setOrigin(0.5);
    const counter = { value: 0 };
    this.tweens.add({
      targets: counter,
      value: this.result.score,
      duration: 900,
      ease: 'Cubic.Out',
      onUpdate: () => scoreText.setText(formatNumber(counter.value)),
    });
  }

  addRecordLine(y) {
    if (this.result.isNewRecord) {
      const text = this.add.text(this.cx, y, 'NOVO RECORDE!', glowStyle(28, CSS_COLORS.yellow)).setOrigin(0.5);
      this.tweens.add({ targets: text, scale: 1.12, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else {
      this.add
        .text(this.cx, y, `Recorde: ${formatNumber(this.result.highScore)}`, textStyle(22, CSS_COLORS.cyan, { fontStyle: 'bold' }))
        .setOrigin(0.5);
    }
  }

  buildFooter() {
    const text = this.add
      .text(this.cx, 470, 'ENTER  jogar novamente      M  menu', textStyle(22, CSS_COLORS.white, { fontStyle: 'bold' }))
      .setOrigin(0.5);
    this.tweens.add({ targets: text, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
  }

  go(sceneKey) {
    if (!this.ready) return;
    this.ready = false;
    this.scene.start(sceneKey);
  }

  update(time, delta) {
    this.starfield.update(delta);
  }
}
