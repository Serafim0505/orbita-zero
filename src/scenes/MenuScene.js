import Phaser from 'phaser';
import { GAME_WIDTH, CSS_COLORS, COLORS, ENEMIES } from '../config.js';
import Starfield from '../systems/Starfield.js';
import ScoreManager from '../systems/ScoreManager.js';
import audio from '../systems/AudioManager.js';
import { textStyle, glowStyle, formatNumber } from '../ui/styles.js';

// =============================================================================
// MenuScene — tela de título: nome do jogo, controles, inimigos e recorde.
// =============================================================================
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.starting = false;
    this.starfield = new Starfield(this, 0.6);
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 92, 'ÓRBITA ZERO', glowStyle(76, CSS_COLORS.white, CSS_COLORS.cyan, {
        stroke: CSS_COLORS.cyan,
        strokeThickness: 2,
      }))
      .setOrigin(0.5);
    this.add
      .text(cx, 152, 'Sobreviva a 9 ondas e destrua o chefe da onda 10', textStyle(19, CSS_COLORS.muted))
      .setOrigin(0.5);

    this.createControlsPanel(150, 190);
    this.createEnemiesPanel(510, 190);

    // [CONCEITO 7 - INTERFACE E FEEDBACK] Chamada para ação piscando.
    const prompt = this.add
      .text(cx, 432, 'Pressione ENTER para começar', glowStyle(28, CSS_COLORS.yellow))
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 650, yoyo: true, repeat: -1 });

    this.add
      .text(cx, 478, `Recorde: ${formatNumber(ScoreManager.loadHighScore())}`, textStyle(20, CSS_COLORS.cyan, { fontStyle: 'bold' }))
      .setOrigin(0.5);

    this.soundText = this.add
      .text(cx, 516, this.soundLabel(), textStyle(14, CSS_COLORS.muted))
      .setOrigin(0.5);

    // [CONCEITO 1 - ENTRADAS] Teclado (ENTER) ou mouse (clique) iniciam o jogo.
    this.input.keyboard.on('keydown-ENTER', this.startGame, this);
    this.input.on('pointerdown', this.startGame, this);
    this.input.keyboard.on('keydown-N', () => {
      audio.toggleMute();
      this.soundText.setText(this.soundLabel());
    });

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  soundLabel() {
    return `Som: ${audio.muted ? 'desligado' : 'ligado'}  (N para alternar)`;
  }

  panel(x, y, width, height, title) {
    const g = this.add.graphics();
    g.fillStyle(0x0d1433, 0.75);
    g.fillRoundedRect(x, y, width, height, 12);
    g.lineStyle(2, COLORS.cyan, 0.35);
    g.strokeRoundedRect(x, y, width, height, 12);
    this.add.text(x + 20, y + 14, title, textStyle(15, CSS_COLORS.cyan, { fontStyle: 'bold' }));
  }

  createControlsPanel(x, y) {
    this.panel(x, y, 300, 200, 'CONTROLES');
    const rows = [
      ['Mover', 'WASD / Setas'],
      ['Atirar', 'Espaço / Clique'],
      ['Pausar', 'P / ESC'],
      ['Som', 'N'],
    ];
    rows.forEach(([action, keys], i) => {
      const rowY = y + 52 + i * 34;
      this.add.text(x + 20, rowY, action, textStyle(18, CSS_COLORS.muted));
      this.add.text(x + 280, rowY, keys, textStyle(18, CSS_COLORS.white, { fontStyle: 'bold' })).setOrigin(1, 0);
    });
  }

  createEnemiesPanel(x, y) {
    this.panel(x, y, 300, 200, 'INIMIGOS E ITENS');
    const rows = [
      ['drone', 'Drone', ENEMIES.drone.score],
      ['zigzag', 'Zigue-zague', ENEMIES.zigzag.score],
      ['shooter', 'Atirador', ENEMIES.shooter.score],
    ];
    rows.forEach(([key, name, points], i) => {
      const rowY = y + 64 + i * 34;
      this.add.image(x + 36, rowY, key).setScale(0.7);
      this.add.text(x + 64, rowY, name, textStyle(18, CSS_COLORS.white)).setOrigin(0, 0.5);
      this.add.text(x + 280, rowY, `${points} pts`, textStyle(18, CSS_COLORS.yellow, { fontStyle: 'bold' })).setOrigin(1, 0.5);
    });
    const itemsY = y + 170;
    ['pu-triple', 'pu-shield', 'pu-life'].forEach((key, i) => {
      this.add.image(x + 36 + i * 30, itemsY, key).setScale(0.8);
    });
    this.add.text(x + 132, itemsY, 'Triplo · Escudo · Vida', textStyle(15, CSS_COLORS.muted)).setOrigin(0, 0.5);
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    audio.play('start');
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('GameScene');
    });
  }

  update(time, delta) {
    this.starfield.update(delta);
  }
}
