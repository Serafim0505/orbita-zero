import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CSS_COLORS } from './config.js';
import audio from './systems/AudioManager.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';

// =============================================================================
// Ponto de entrada: configura o Phaser e registra as cenas.
// A ORDEM da lista de cenas também define a ordem de desenho: cenas mais ao
// final ficam por cima (por isso UIScene e PauseScene vêm depois do GameScene).
// =============================================================================
const config = {
  type: Phaser.AUTO, // WebGL quando disponível, senão Canvas
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: CSS_COLORS.background,
  banner: false,
  scale: {
    // Mantém a proporção 16:9 e centraliza o jogo em qualquer tamanho de janela.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  // Desligamos o sistema de áudio do Phaser porque usamos nosso próprio
  // AudioManager com Web Audio (sons sintetizados, sem arquivos).
  audio: { noAudio: true },
  scene: [BootScene, MenuScene],
};

const game = new Phaser.Game(config);

// Navegadores só liberam áudio depois de uma interação do usuário.
['keydown', 'pointerdown'].forEach((type) => window.addEventListener(type, () => audio.unlock()));

export default game;
