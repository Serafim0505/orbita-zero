import { GAME_WIDTH, GAME_HEIGHT, COLORS, DEPTH } from '../config.js';

// Três camadas de estrelas com velocidades diferentes = efeito PARALLAX:
// as estrelas "próximas" passam rápido e as "distantes" devagar, dando
// sensação de profundidade com um custo mínimo (TileSprite só desloca a textura).
const LAYERS = [
  { key: 'stars-far', speed: 14, sway: 6 },
  { key: 'stars-mid', speed: 36, sway: 14 },
  { key: 'stars-near', speed: 80, sway: 26 },
];

export default class Starfield {
  constructor(scene, speedScale = 1) {
    this.speedScale = speedScale;

    this.nebulas = [
      scene.add.image(220, 150, 'nebula').setTint(COLORS.purple).setAlpha(0.55).setScale(1.3),
      scene.add.image(760, 420, 'nebula').setTint(0x2a6bff).setAlpha(0.45).setScale(1.6),
    ];
    this.nebulas.forEach((n) => n.setDepth(DEPTH.nebula));

    this.layers = LAYERS.map((cfg, i) => ({
      ...cfg,
      sprite: scene.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, cfg.key)
        .setOrigin(0, 0)
        .setDepth(DEPTH.stars + i * 0.1),
    }));
  }

  /**
   * @param {number} delta  ms desde o último quadro
   * @param {number} focusX posição X da nave: as camadas se deslocam um pouco
   *                        para os lados, reforçando a profundidade.
   */
  update(delta, focusX = GAME_WIDTH / 2) {
    const dt = delta / 1000;
    const offset = (focusX - GAME_WIDTH / 2) / (GAME_WIDTH / 2);
    for (const layer of this.layers) {
      layer.sprite.tilePositionY -= layer.speed * this.speedScale * dt;
      layer.sprite.tilePositionX = offset * layer.sway;
    }
    for (const nebula of this.nebulas) {
      nebula.y += 6 * this.speedScale * dt;
      if (nebula.y > GAME_HEIGHT + 300) nebula.y = -300;
    }
  }
}
