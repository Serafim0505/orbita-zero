import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CSS_COLORS } from '../config.js';
import audio from '../systems/AudioManager.js';
import { textStyle, glowStyle } from '../ui/styles.js';

// =============================================================================
// [CONCEITO 6 - ESTADOS] PauseScene: enquanto ela está aberta, GameScene e
// UIScene ficam PAUSADAS (scene.pause) — física, timers e tweens congelam.
// Ao continuar, elas são retomadas exatamente de onde pararam.
// =============================================================================
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x02040c, 0.72).setOrigin(0);

    this.add.text(cx, cy - 70, 'PAUSADO', glowStyle(60, CSS_COLORS.white, CSS_COLORS.cyan)).setOrigin(0.5);
    this.add.text(cx, cy + 4, 'P ou ESC  —  continuar', textStyle(22, CSS_COLORS.white)).setOrigin(0.5);
    this.add.text(cx, cy + 40, 'M  —  voltar ao menu', textStyle(22, CSS_COLORS.white)).setOrigin(0.5);
    this.soundText = this.add.text(cx, cy + 76, '', textStyle(22, CSS_COLORS.muted)).setOrigin(0.5);
    this.updateSoundText();

    this.input.keyboard.on('keydown-P', this.resumeGame, this);
    this.input.keyboard.on('keydown-ESC', this.resumeGame, this);
    this.input.keyboard.on('keydown-M', this.backToMenu, this);
    this.input.keyboard.on('keydown-N', () => {
      audio.toggleMute();
      this.updateSoundText();
    });
  }

  updateSoundText() {
    this.soundText.setText(`N  —  som: ${audio.muted ? 'desligado' : 'ligado'}`);
  }

  resumeGame() {
    this.scene.resume('GameScene');
    this.scene.resume('UIScene');
    this.scene.stop();
  }

  backToMenu() {
    this.scene.stop('UIScene');
    this.scene.stop('GameScene');
    this.scene.start('MenuScene');
  }
}
