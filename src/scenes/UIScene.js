import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER, BOSS, COLORS, CSS_COLORS } from '../config.js';
import { textStyle, glowStyle, formatNumber } from '../ui/styles.js';

const BOSS_BAR = { width: 360, height: 12, y: 62 };

// =============================================================================
// [CONCEITO 7 - INTERFACE E FEEDBACK]
// UIScene é a HUD. Ela roda em PARALELO ao GameScene, por cima dele, com sua
// própria câmera — por isso o tremor de tela do jogo não sacode a HUD.
// Ela não conhece regras do jogo: só ESCUTA eventos emitidos pelo GameScene
// ('score-changed', 'lives-changed'...) e atualiza os textos.
// =============================================================================
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gameScene = this.scene.get('GameScene');

    // Pontos (canto superior esquerdo) e combo logo abaixo.
    this.add.text(20, 12, 'PONTOS', textStyle(13, CSS_COLORS.muted, { fontStyle: 'bold' }));
    this.scoreText = this.add.text(20, 28, '0', glowStyle(28, CSS_COLORS.white, CSS_COLORS.cyan));
    this.comboText = this.add.text(20, 66, '', glowStyle(18, CSS_COLORS.magenta)).setVisible(false);

    // Onda (centro).
    this.waveText = this.add.text(GAME_WIDTH / 2, 14, '', glowStyle(22, CSS_COLORS.cyan)).setOrigin(0.5, 0);

    // Vidas (canto superior direito) como ícones da nave.
    this.add.text(GAME_WIDTH - 20, 12, 'VIDAS', textStyle(13, CSS_COLORS.muted, { fontStyle: 'bold' })).setOrigin(1, 0);
    this.lifeIcons = Array.from({ length: PLAYER.maxLives }, (_, i) =>
      this.add.image(GAME_WIDTH - 32 - i * 28, 46, 'player').setScale(0.42),
    );

    // Power-ups ativos (abaixo das vidas).
    this.powerText = this.add
      .text(GAME_WIDTH - 20, 66, '', textStyle(15, CSS_COLORS.yellow, { fontStyle: 'bold', align: 'right' }))
      .setOrigin(1, 0);

    this.createBossBar();
    this.createAnnouncement();

    this.add.text(20, GAME_HEIGHT - 26, 'P/ESC pausa  ·  N som', textStyle(13, CSS_COLORS.muted)).setAlpha(0.7);
    this.soundToast = this.add
      .text(GAME_WIDTH - 20, GAME_HEIGHT - 26, '', textStyle(13, CSS_COLORS.cyan, { fontStyle: 'bold' }))
      .setOrigin(1, 0)
      .setAlpha(0);

    // Estado inicial (a UIScene pode ser criada depois de alguns eventos).
    this.setScore(this.gameScene.score.score);
    this.setLives(this.gameScene.lives, false);
    this.setCombo(this.gameScene.score.multiplier);

    this.subscribe();

    // Ao pausar, esconde o aviso central para não poluir a tela de pausa.
    const announceTexts = [this.announceTitle, this.announceSubtitle];
    const onPause = () => {
      this.hiddenOnPause = announceTexts.filter((t) => t.visible);
      this.hiddenOnPause.forEach((t) => t.setVisible(false));
    };
    const onResume = () => this.hiddenOnPause?.forEach((t) => t.setVisible(true));
    this.events.on(Phaser.Scenes.Events.PAUSE, onPause);
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PAUSE, onPause);
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
    });
  }

  /** Liga os ouvintes de eventos e garante que sejam removidos ao sair. */
  subscribe() {
    const handlers = {
      'score-changed': (score) => this.setScore(score),
      'combo-changed': (multiplier) => this.setCombo(multiplier),
      'lives-changed': (lives) => this.setLives(lives, true),
      'wave-changed': (wave, total) => this.waveText.setText(wave >= total ? 'ONDA FINAL' : `ONDA ${wave}/${total}`),
      announce: (data) => this.announce(data),
      'boss-spawned': (hp, maxHp) => this.showBossBar(hp, maxHp),
      'boss-health': (hp, maxHp) => this.updateBossBar(hp, maxHp),
      'boss-defeated': () => this.hideBossBar(),
      'sound-toggled': (muted) => this.showSoundToast(muted),
    };
    const events = this.gameScene.events;
    Object.entries(handlers).forEach(([name, fn]) => events.on(name, fn));
    // Sem isso, ao jogar de novo os ouvintes antigos continuariam registrados.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      Object.entries(handlers).forEach(([name, fn]) => events.off(name, fn));
    });
  }

  setScore(score) {
    this.scoreText.setText(formatNumber(score));
    this.tweens.killTweensOf(this.scoreText);
    this.scoreText.setScale(1);
    if (score > 0) this.tweens.add({ targets: this.scoreText, scale: 1.12, duration: 70, yoyo: true });
  }

  setCombo(multiplier) {
    this.comboText.setVisible(multiplier > 1).setText(`COMBO x${multiplier}`);
    if (multiplier > 1) {
      this.tweens.killTweensOf(this.comboText);
      this.comboText.setScale(1.35);
      this.tweens.add({ targets: this.comboText, scale: 1, duration: 220, ease: 'Back.Out' });
    }
  }

  setLives(lives, animate) {
    if (animate) {
      // Pequeno "tremor" nos ícones para chamar atenção à mudança.
      this.tweens.killTweensOf(this.lifeIcons);
      this.lifeIcons.forEach((icon, i) => icon.setPosition(GAME_WIDTH - 32 - i * 28, 46).setScale(0.42));
      this.tweens.add({ targets: this.lifeIcons, x: '+=4', duration: 40, yoyo: true, repeat: 3 });
    }
    this.lifeIcons.forEach((icon, i) => {
      const visible = i < lives;
      if (animate && visible && !icon.visible) {
        // Vida nova "estoura" na tela.
        icon.setScale(0.9);
        this.tweens.add({ targets: icon, scale: 0.42, duration: 300, ease: 'Back.Out' });
      }
      icon.setVisible(visible);
    });
  }

  createBossBar() {
    const x = GAME_WIDTH / 2 - BOSS_BAR.width / 2;
    this.bossLabel = this.add.text(GAME_WIDTH / 2, BOSS_BAR.y - 20, BOSS.name, glowStyle(14, CSS_COLORS.purple)).setOrigin(0.5, 0);
    this.bossBarBg = this.add.rectangle(x, BOSS_BAR.y, BOSS_BAR.width, BOSS_BAR.height, 0x1a1238)
      .setOrigin(0, 0)
      .setStrokeStyle(2, COLORS.purple, 0.9);
    this.bossBarFill = this.add.rectangle(x + 2, BOSS_BAR.y + 2, BOSS_BAR.width - 4, BOSS_BAR.height - 4, COLORS.magenta)
      .setOrigin(0, 0);
    this.bossBar = [this.bossLabel, this.bossBarBg, this.bossBarFill];
    this.bossBar.forEach((part) => part.setVisible(false));
  }

  showBossBar(hp, maxHp) {
    this.waveText.setVisible(false);
    this.bossBar.forEach((part) => part.setVisible(true).setAlpha(0));
    this.tweens.add({ targets: this.bossBar, alpha: 1, duration: 400 });
    this.updateBossBar(hp, maxHp);
  }

  updateBossBar(hp, maxHp) {
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.bossBarFill.width = (BOSS_BAR.width - 4) * ratio;
    // Abaixo de 50% a barra fica laranja: o chefe ficou mais agressivo.
    this.bossBarFill.setFillStyle(ratio <= 0.5 ? COLORS.orange : COLORS.magenta);
  }

  hideBossBar() {
    this.tweens.add({ targets: this.bossBar, alpha: 0, duration: 400 });
  }

  createAnnouncement() {
    this.announceTitle = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, '', glowStyle(64, CSS_COLORS.white, CSS_COLORS.cyan))
      .setOrigin(0.5)
      .setVisible(false);
    this.announceSubtitle = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 26, '', textStyle(20, CSS_COLORS.white))
      .setOrigin(0.5)
      .setVisible(false);
  }

  /** Aviso central grande ("ONDA 3", "ALERTA!"). */
  announce({ title, subtitle = '', color = CSS_COLORS.cyan, warning = false }) {
    const targets = [this.announceTitle, this.announceSubtitle];
    this.tweens.killTweensOf(targets);
    this.announceTitle.setText(title).setColor(warning ? CSS_COLORS.red : CSS_COLORS.white);
    this.announceTitle.setShadow(0, 0, color, 18, true, true);
    this.announceSubtitle.setText(subtitle);
    targets.forEach((t) => t.setVisible(true).setAlpha(0).setScale(0.6));

    this.tweens.add({
      targets,
      alpha: 1,
      scale: 1,
      duration: 350,
      ease: 'Back.Out',
      hold: warning ? 2000 : 1300,
      yoyo: true,
      onComplete: () => targets.forEach((t) => t.setVisible(false)),
    });
    if (warning) {
      // Alarme: a tela pisca em vermelho três vezes.
      this.time.addEvent({ delay: 400, repeat: 2, callback: () => this.cameras.main.flash(250, 255, 0, 60) });
    }
  }

  showSoundToast(muted) {
    this.soundToast.setText(muted ? 'SOM DESLIGADO' : 'SOM LIGADO').setAlpha(1);
    this.tweens.killTweensOf(this.soundToast);
    this.tweens.add({ targets: this.soundToast, alpha: 0, delay: 1200, duration: 400 });
  }

  // Atualiza o indicador de power-ups ativos (tempo restante do tiro triplo).
  update() {
    const { player } = this.gameScene;
    const lines = [];
    if (player.tripleShotMs > 0) lines.push(`TIRO TRIPLO ${(player.tripleShotMs / 1000).toFixed(1)}s`);
    if (player.hasShield) lines.push('ESCUDO ATIVO');
    this.powerText.setText(lines.join('\n'));
  }
}
