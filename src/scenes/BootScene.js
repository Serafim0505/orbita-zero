import Phaser from 'phaser';
import { COLORS } from '../config.js';
import audio from '../systems/AudioManager.js';

// =============================================================================
// BootScene — primeira cena. Gera TODOS os gráficos por código e prepara os
// sons. Nenhuma imagem é baixada: desenhamos formas com Phaser.Graphics e
// "fotografamos" o desenho com generateTexture(), criando uma textura que os
// sprites usam normalmente, como se fosse um PNG.
// =============================================================================
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    // Gerador aleatório com semente fixa: estrelas e asteroides saem sempre
    // iguais, o que deixa o visual consistente entre execuções.
    this.rnd = new Phaser.Math.RandomDataGenerator(['orbita-zero']);
    this.g = this.make.graphics({ x: 0, y: 0 }, false);

    this.createShipTextures();
    this.createEnemyTextures();
    this.createProjectileTextures();
    this.createItemTextures();
    this.createBackgroundTextures();

    this.g.destroy();
    audio.prepare();

    this.scene.start('MenuScene');
  }

  /** Limpa o "pincel", executa o desenho e salva como textura com a chave dada. */
  draw(key, width, height, paint) {
    this.g.clear();
    paint(this.g);
    this.g.generateTexture(key, width, height);
  }

  createShipTextures() {
    // Nave do jogador (48x52): halo, asas, corpo, recorte do motor e cabine.
    this.draw('player', 48, 52, (g) => {
      g.fillStyle(COLORS.cyan, 0.18);
      g.fillTriangle(24, 0, 48, 50, 0, 50);
      g.fillStyle(0x1b6fa8, 1);
      g.fillTriangle(24, 16, 46, 48, 2, 48);
      g.fillStyle(COLORS.cyan, 1);
      g.fillTriangle(24, 4, 36, 46, 12, 46);
      g.fillStyle(COLORS.background, 1);
      g.fillTriangle(24, 36, 30, 48, 18, 48);
      g.fillStyle(COLORS.white, 1);
      g.fillTriangle(24, 14, 28, 29, 20, 29);
    });

    // Chama do motor (fica atrás da nave e "tremula" via escala).
    this.draw('flame', 16, 26, (g) => {
      g.fillStyle(COLORS.orange, 0.9);
      g.fillTriangle(0, 0, 16, 0, 8, 26);
      g.fillStyle(COLORS.yellow, 1);
      g.fillTriangle(4, 0, 12, 0, 8, 15);
    });

    // Bolha do escudo.
    this.draw('shield-bubble', 76, 76, (g) => {
      g.fillStyle(COLORS.cyan, 0.12);
      g.fillCircle(38, 38, 36);
      g.lineStyle(2, COLORS.cyan, 0.85);
      g.strokeCircle(38, 38, 35);
    });
  }

  createEnemyTextures() {
    // Drone: triângulo magenta apontando para baixo.
    this.draw('drone', 40, 36, (g) => {
      g.fillStyle(COLORS.magenta, 0.2);
      g.fillTriangle(0, 0, 40, 0, 20, 36);
      g.fillStyle(COLORS.magenta, 1);
      g.fillTriangle(4, 3, 36, 3, 20, 32);
      g.fillStyle(0x5a1060, 1);
      g.fillTriangle(12, 7, 28, 7, 20, 22);
      g.fillStyle(COLORS.white, 1);
      g.fillCircle(20, 11, 3);
    });

    // Zigue-zague: "morcego" verde.
    this.draw('zigzag', 44, 32, (g) => {
      const wing = [
        { x: 1, y: 6 }, { x: 14, y: 1 }, { x: 22, y: 10 }, { x: 30, y: 1 },
        { x: 43, y: 6 }, { x: 34, y: 30 }, { x: 22, y: 21 }, { x: 10, y: 30 },
      ];
      g.lineStyle(4, COLORS.green, 0.3);
      g.strokePoints(wing, true);
      g.fillStyle(COLORS.green, 1);
      g.fillPoints(wing, true);
      g.fillStyle(0x0f5a2a, 1);
      g.fillCircle(22, 13, 5);
      g.fillStyle(COLORS.white, 1);
      g.fillCircle(22, 13, 2.5);
    });

    // Atirador: hexágono laranja com canhão.
    this.draw('shooter', 48, 46, (g) => {
      const hex = (r) => Array.from({ length: 6 }, (_, i) => ({
        x: 24 + Math.cos((Math.PI / 3) * i + Math.PI / 6) * r,
        y: 21 + Math.sin((Math.PI / 3) * i + Math.PI / 6) * r,
      }));
      g.fillStyle(COLORS.orange, 0.2);
      g.fillPoints(hex(22), true);
      g.fillStyle(COLORS.orange, 1);
      g.fillPoints(hex(19), true);
      g.fillRect(20, 32, 8, 13);
      g.fillStyle(0x6b3a00, 1);
      g.fillPoints(hex(10), true);
      g.fillStyle(COLORS.yellow, 1);
      g.fillCircle(24, 21, 4);
    });

    // Chefe: nave grande roxa com núcleo magenta e dois canhões.
    this.draw('boss', 220, 120, (g) => {
      const hull = [
        { x: 20, y: 18 }, { x: 200, y: 18 }, { x: 220, y: 58 }, { x: 172, y: 100 },
        { x: 132, y: 92 }, { x: 110, y: 118 }, { x: 88, y: 92 }, { x: 48, y: 100 }, { x: 0, y: 58 },
      ];
      g.lineStyle(6, COLORS.purple, 0.3);
      g.strokePoints(hull, true);
      g.fillStyle(COLORS.purple, 1);
      g.fillPoints(hull, true);
      g.fillStyle(0x3b1b78, 1);
      g.fillPoints([
        { x: 38, y: 30 }, { x: 182, y: 30 }, { x: 196, y: 58 }, { x: 160, y: 86 },
        { x: 110, y: 78 }, { x: 60, y: 86 }, { x: 24, y: 58 },
      ], true);
      g.fillStyle(COLORS.orange, 1);
      g.fillRect(40, 70, 12, 30);
      g.fillRect(168, 70, 12, 30);
      g.fillStyle(COLORS.magenta, 1);
      g.fillCircle(110, 54, 19);
      g.fillStyle(COLORS.white, 1);
      g.fillCircle(110, 54, 8);
      g.fillStyle(COLORS.cyan, 1);
      [56, 80, 140, 164].forEach((x) => g.fillCircle(x, 24, 3));
    });

    // Asteroide: polígono irregular com crateras.
    this.draw('asteroid', 52, 52, (g) => {
      const points = Array.from({ length: 11 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 11;
        const radius = this.rnd.between(19, 25);
        return { x: 26 + Math.cos(angle) * radius, y: 26 + Math.sin(angle) * radius };
      });
      g.fillStyle(0x59607e, 1);
      g.fillPoints(points, true);
      g.lineStyle(2, COLORS.asteroid, 1);
      g.strokePoints(points, true);
      g.fillStyle(0x434963, 1);
      g.fillCircle(19, 20, 5);
      g.fillCircle(33, 31, 4);
      g.fillCircle(22, 35, 2.5);
    });
  }

  createProjectileTextures() {
    this.draw('bullet', 8, 20, (g) => {
      g.fillStyle(COLORS.cyan, 0.35);
      g.fillRoundedRect(0, 0, 8, 20, 4);
      g.fillStyle(COLORS.white, 1);
      g.fillRoundedRect(2, 2, 4, 16, 2);
    });

    this.draw('enemy-bullet', 14, 14, (g) => {
      g.fillStyle(COLORS.red, 0.35);
      g.fillCircle(7, 7, 7);
      g.fillStyle(0xff7a9a, 1);
      g.fillCircle(7, 7, 4.5);
      g.fillStyle(COLORS.white, 1);
      g.fillCircle(7, 7, 2);
    });

    // Partícula genérica (branca): o Phaser aplica a cor com tint.
    this.draw('particle', 8, 8, (g) => {
      g.fillStyle(COLORS.white, 1);
      g.fillCircle(4, 4, 4);
    });
  }

  createItemTextures() {
    const base = (g, color) => {
      g.fillStyle(color, 0.22);
      g.fillCircle(15, 15, 15);
      g.lineStyle(2, color, 1);
      g.strokeCircle(15, 15, 12);
    };

    // Tiro triplo: três barras amarelas.
    this.draw('pu-triple', 30, 30, (g) => {
      base(g, COLORS.yellow);
      g.fillStyle(COLORS.yellow, 1);
      g.fillRect(8.5, 9, 3, 13);
      g.fillRect(13.5, 7, 3, 16);
      g.fillRect(18.5, 9, 3, 13);
    });

    // Escudo: brasão ciano.
    this.draw('pu-shield', 30, 30, (g) => {
      base(g, COLORS.cyan);
      g.fillStyle(COLORS.cyan, 1);
      g.fillPoints([
        { x: 15, y: 7 }, { x: 22, y: 10 }, { x: 21, y: 17 },
        { x: 15, y: 23 }, { x: 9, y: 17 }, { x: 8, y: 10 },
      ], true);
    });

    // Vida extra: coração vermelho.
    this.draw('pu-life', 30, 30, (g) => {
      base(g, COLORS.red);
      g.fillStyle(COLORS.red, 1);
      g.fillCircle(11.5, 12.5, 4);
      g.fillCircle(18.5, 12.5, 4);
      g.fillTriangle(7.6, 14, 22.4, 14, 15, 22.5);
    });
  }

  createBackgroundTextures() {
    // Camadas de estrelas (texturas de 256x256 que se repetem lado a lado).
    const layers = [
      { key: 'stars-far', count: 70, size: [1, 1.4], alpha: [0.25, 0.55] },
      { key: 'stars-mid', count: 34, size: [1.4, 2], alpha: [0.5, 0.8] },
      { key: 'stars-near', count: 12, size: [2, 2.8], alpha: [0.8, 1] },
    ];
    const tints = [COLORS.white, COLORS.white, COLORS.white, COLORS.cyan, 0xffc6f5];
    for (const layer of layers) {
      this.draw(layer.key, 256, 256, (g) => {
        for (let i = 0; i < layer.count; i += 1) {
          g.fillStyle(this.rnd.pick(tints), this.rnd.realInRange(...layer.alpha));
          g.fillCircle(this.rnd.between(2, 254), this.rnd.between(2, 254), this.rnd.realInRange(...layer.size) / 2);
        }
      });
    }

    // Nebulosa: gradiente radial desenhado direto no Canvas 2D.
    const nebula = this.textures.createCanvas('nebula', 512, 512);
    const ctx = nebula.getContext();
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(255,255,255,0.32)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    nebula.refresh();
  }
}
