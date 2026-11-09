// =============================================================================
// config.js — TODAS as constantes ajustáveis do jogo ficam aqui.
// Por quê? Assim dá para balancear o jogo (velocidade, vidas, pontos, chances)
// mexendo em um único arquivo, sem caçar "números mágicos" pelo código.
// =============================================================================

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// Paleta neon sobre azul-escuro (números para o Phaser, strings para textos).
export const COLORS = {
  background: 0x070b1f,
  cyan: 0x22e8ff,
  magenta: 0xff3df2,
  green: 0x5dff8b,
  orange: 0xffa53d,
  yellow: 0xffe14d,
  red: 0xff4d6d,
  purple: 0x9b5cff,
  white: 0xffffff,
  asteroid: 0x8a93b8,
};

export const CSS_COLORS = {
  background: '#070b1f',
  cyan: '#22e8ff',
  magenta: '#ff3df2',
  green: '#5dff8b',
  orange: '#ffa53d',
  yellow: '#ffe14d',
  red: '#ff4d6d',
  purple: '#9b5cff',
  white: '#ffffff',
  muted: '#8ea2d8',
};

// Ordem de desenho (quanto maior, mais "na frente").
export const DEPTH = {
  nebula: 1,
  stars: 2,
  powerUps: 8,
  asteroids: 9,
  enemies: 10,
  boss: 11,
  bullets: 12,
  player: 15,
  effects: 20,
  floatingText: 30,
};

// Estados do GameScene (máquina de estados do fluxo da partida).
export const GAME_STATES = {
  WAVE_TRANSITION: 'WAVE_TRANSITION', // aviso "ONDA X" entre ondas
  PLAYING: 'PLAYING', // onda normal acontecendo
  BOSS: 'BOSS', // luta contra o chefe
  DEAD: 'DEAD', // jogador perdeu todas as vidas
  VICTORY: 'VICTORY', // chefe derrotado
};

export const PLAYER = {
  acceleration: 1700, // px/s² enquanto a tecla está pressionada
  drag: 1150, // px/s² de "atrito" quando solta a tecla
  maxSpeed: 360, // px/s
  minY: GAME_HEIGHT * 0.42, // a nave só circula na parte de baixo da tela
  fireRate: 170, // ms entre tiros (cadência limitada)
  bulletSpeed: 720,
  tripleSpreadDeg: 12, // abertura do tiro triplo
  lives: 3,
  maxLives: 5,
  invulnerableMs: 1500, // tempo piscando após levar dano
  shieldHitInvulnerableMs: 700,
};

export const ENEMIES = {
  drone: { hp: 1, speed: 120, score: 100, color: COLORS.magenta },
  zigzag: { hp: 2, speed: 90, score: 150, amplitude: 110, frequency: 0.0026, color: COLORS.green },
  shooter: {
    hp: 3,
    speed: 140,
    score: 250,
    stopYMin: 105,
    stopYMax: 175,
    driftSpeed: 45,
    fireInterval: 1500,
    bulletSpeed: 250,
    shotsBeforeLeaving: 4,
    color: COLORS.orange,
  },
};

export const ASTEROID = {
  hp: 2,
  score: 50,
  speedMin: 70,
  speedMax: 125,
  firstWave: 2, // aparecem a partir da onda 2
  chancePerSpawn: 0.16, // chance de vir um asteroide junto com cada inimigo
};

export const BOSS = {
  name: 'NÚCLEO ÔMEGA',
  hp: 140,
  score: 5000,
  entryY: 125,
  entrySpeed: 70,
  moveAmplitude: 300,
  moveFrequency: 0.0009,
  patternDuration: 4500, // ms em cada padrão antes de alternar
  spreadBullets: 9, // padrão LEQUE
  spreadAngleDeg: 110,
  spreadInterval: 950,
  spreadSpeed: 210,
  burstSize: 3, // padrão MIRA (rajada mirada no jogador)
  burstInterval: 170,
  burstPause: 850,
  aimedSpeed: 300,
  enragedRate: 0.7, // abaixo de 50% de vida atira 30% mais rápido
  minionInterval: 3200, // drones de apoio durante a luta
};

export const POWERUP = {
  dropChance: 0.12, // ~12% de chance ao destruir um inimigo
  fallSpeed: 110,
  tripleShotMs: 8000,
  weights: { triple: 45, shield: 35, life: 20 },
};

export const COMBO = {
  killsPerLevel: 5, // a cada 5 abates seguidos o multiplicador sobe 1
  maxMultiplier: 5,
};

export const WAVES = {
  total: 10, // a onda 10 é a do chefe
  baseEnemies: 6,
  enemiesPerWave: 3,
  baseSpawnInterval: 1150, // ms
  spawnIntervalStep: 85, // ms a menos por onda
  minSpawnInterval: 380,
  speedStep: 0.1, // +10% de velocidade por onda
  transitionMs: 2400,
  bossWarningMs: 3000,
  firstWaveDelayMs: 500,
};

// Tamanho máximo de cada pool (object pooling: reaproveita objetos em vez de criar/destruir).
export const POOL = {
  playerBullets: 40,
  enemyBullets: 90,
  drones: 20,
  zigzags: 14,
  shooters: 5,
  asteroids: 6,
  powerUps: 6,
};

export const VICTORY_LIFE_BONUS = 1000; // pontos extras por vida restante ao vencer

export const STORAGE_KEYS = {
  highScore: 'orbita-zero:recorde',
  muted: 'orbita-zero:som-desligado',
};
