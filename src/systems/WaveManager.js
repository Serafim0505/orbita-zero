import Phaser from 'phaser';
import { WAVES, ASTEROID, BOSS, CSS_COLORS, GAME_STATES } from '../config.js';
import audio from './AudioManager.js';

// Mensagem exibida no aviso de cada onda (quando um inimigo novo aparece).
const WAVE_SUBTITLES = {
  1: 'Destrua os drones!',
  2: 'Novo inimigo: Zigue-zague · cuidado com os asteroides',
  3: 'Novo inimigo: Atirador (mira em você!)',
};

// =============================================================================
// WaveManager — controla as ONDAS de inimigos e a DIFICULDADE PROGRESSIVA.
// A cada onda: mais inimigos, nascendo com mais frequência e mais rápidos.
// Ele não cria sprites diretamente: pede ao GameScene (spawnEnemy/spawnAsteroid),
// que é quem conhece os pools.
// =============================================================================
export default class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.wave = 0;
    this.remainingToSpawn = 0;
    this.spawnEvent = null;
    this.pendingTimer = null;
  }

  start() {
    this.pendingTimer = this.scene.time.delayedCall(WAVES.firstWaveDelayMs, () => this.startNextWave());
  }

  // --- Dificuldade progressiva -------------------------------------------
  get speedMultiplier() {
    return 1 + (this.wave - 1) * WAVES.speedStep;
  }

  get spawnInterval() {
    return Math.max(WAVES.minSpawnInterval, WAVES.baseSpawnInterval - (this.wave - 1) * WAVES.spawnIntervalStep);
  }

  get enemiesInWave() {
    return WAVES.baseEnemies + (this.wave - 1) * WAVES.enemiesPerWave;
  }

  // [CONCEITO 6 - ESTADOS] Cada onda começa no estado WAVE_TRANSITION (aviso
  // na tela), depois passa para PLAYING. A última onda leva ao estado BOSS.
  startNextWave() {
    this.wave += 1;
    const { scene } = this;
    scene.setGameState(GAME_STATES.WAVE_TRANSITION);
    scene.events.emit('wave-changed', this.wave, WAVES.total);

    if (this.wave >= WAVES.total) {
      scene.events.emit('announce', {
        title: 'ALERTA!',
        subtitle: `Chefe se aproximando: ${BOSS.name}`,
        color: CSS_COLORS.red,
        warning: true,
      });
      audio.play('alarm');
      this.pendingTimer = scene.time.delayedCall(WAVES.bossWarningMs, () => this.beginBossWave());
      return;
    }

    const speedBonus = Math.round((this.speedMultiplier - 1) * 100);
    scene.events.emit('announce', {
      title: `ONDA ${this.wave}`,
      subtitle: WAVE_SUBTITLES[this.wave] ?? `Inimigos ${speedBonus}% mais rápidos`,
      color: CSS_COLORS.cyan,
    });
    audio.play('wave');
    this.pendingTimer = scene.time.delayedCall(WAVES.transitionMs, () => this.beginWave());
  }

  beginWave() {
    this.remainingToSpawn = this.enemiesInWave;
    this.spawnEvent = this.scene.time.addEvent({
      delay: this.spawnInterval,
      loop: true,
      callback: this.spawnNext,
      callbackScope: this,
    });
    this.scene.setGameState(GAME_STATES.PLAYING);
  }

  beginBossWave() {
    this.scene.startBoss();
    // Durante o chefe, drones de apoio aparecem de vez em quando (e podem
    // soltar power-ups, dando uma chance de recuperar vida).
    this.spawnEvent = this.scene.time.addEvent({
      delay: BOSS.minionInterval,
      loop: true,
      callback: () => this.scene.spawnEnemy('drone', this.speedMultiplier),
    });
  }

  spawnNext() {
    if (this.scene.spawnEnemy(this.pickEnemyType(), this.speedMultiplier)) {
      this.remainingToSpawn -= 1;
    }
    if (this.wave >= ASTEROID.firstWave && Math.random() < ASTEROID.chancePerSpawn) {
      this.scene.spawnAsteroid(this.speedMultiplier);
    }
    if (this.remainingToSpawn <= 0) this.stopSpawning();
  }

  /** Sorteio ponderado: tipos mais difíceis ficam mais comuns nas ondas finais. */
  pickEnemyType() {
    const weights = [['drone', 5]];
    if (this.wave >= 2) weights.push(['zigzag', 2 + this.wave * 0.3]);
    if (this.wave >= 3) weights.push(['shooter', 1 + this.wave * 0.2]);
    const total = weights.reduce((sum, [, w]) => sum + w, 0);
    let roll = Phaser.Math.FloatBetween(0, total);
    for (const [type, weight] of weights) {
      roll -= weight;
      if (roll <= 0) return type;
    }
    return 'drone';
  }

  /** Chamado todo quadro: a onda termina quando tudo nasceu e nada sobrou vivo. */
  update() {
    if (
      this.scene.gameState === GAME_STATES.PLAYING &&
      this.remainingToSpawn <= 0 &&
      this.scene.countActiveEnemies() === 0
    ) {
      this.startNextWave();
    }
  }

  stopSpawning() {
    this.spawnEvent?.remove();
    this.spawnEvent = null;
  }

  stop() {
    this.stopSpawning();
    this.pendingTimer?.remove();
    this.pendingTimer = null;
    this.remainingToSpawn = 0;
  }

  /** Atalho de depuração (?debug=1): pula direto para a onda do chefe. */
  jumpToBoss() {
    this.stop();
    this.wave = WAVES.total - 1;
    this.startNextWave();
  }
}
