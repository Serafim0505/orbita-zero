import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CSS_COLORS } from './config.js';
import audio from './systems/AudioManager.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import VictoryScene from './scenes/VictoryScene.js';

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
  // [CONCEITO 6 - ESTADOS] Cada cena é um "estado" do jogo como um todo:
  // Boot → Menu → Game (+ UI em paralelo) ⇄ Pause → GameOver / Victory → ...
  scene: [BootScene, MenuScene, GameScene, UIScene, PauseScene, GameOverScene, VictoryScene],
};

const game = new Phaser.Game(config);

// Navegadores só liberam áudio depois de uma interação do usuário.
['keydown', 'pointerdown'].forEach((type) => window.addEventListener(type, () => audio.unlock()));

// -----------------------------------------------------------------------------
// Gancho de depuração: SÓ existe quando a URL tem ?debug=1. É usado pelos
// testes automatizados (Playwright) para checar cenas e forçar situações
// (game over, chefe, vitória) sem precisar jogar tudo.
// -----------------------------------------------------------------------------
if (new URLSearchParams(window.location.search).get('debug') === '1') {
  const gameScene = () => game.scene.getScene('GameScene');
  window.__ORBITA__ = {
    game,
    activeScenes: () => game.scene.getScenes(true).map((scene) => scene.scene.key),
    isPaused: (key) => game.scene.isPaused(key),
    gameState: () => gameScene().gameState,
    score: () => gameScene().score?.score ?? 0,
    lives: () => gameScene().lives,
    enemies: () => gameScene().countActiveEnemies(),
    forceGameOver: () => gameScene().debugForceGameOver(),
    skipToBoss: () => gameScene().debugSkipToBoss(),
    forceVictory: () => gameScene().debugForceVictory(),
  };
}

export default game;
