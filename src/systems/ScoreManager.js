import { COMBO, STORAGE_KEYS } from '../config.js';

// =============================================================================
// [CONCEITO 5 - PONTUAÇÃO, VIDAS E VITÓRIA/DERROTA]
// ScoreManager guarda a pontuação e o COMBO da partida, e lê/salva o recorde.
// Ele não desenha nada: só avisa a interface através de eventos
// ('score-changed', 'combo-changed'). Separar "regra" de "tela" deixa o código
// mais fácil de entender e de testar.
// =============================================================================
export default class ScoreManager {
  constructor(events) {
    this.events = events;
    this.score = 0;
    this.comboKills = 0;
    this.multiplier = 1;
  }

  /** Registra um abate: soma pontos × multiplicador e devolve quanto ganhou. */
  addKill(baseValue) {
    this.comboKills += 1;
    // A cada COMBO.killsPerLevel abates seguidos (sem levar dano) o multiplicador sobe.
    this.multiplier = Math.min(
      COMBO.maxMultiplier,
      1 + Math.floor(this.comboKills / COMBO.killsPerLevel),
    );
    const gained = baseValue * this.multiplier;
    this.score += gained;
    this.events.emit('score-changed', this.score);
    this.events.emit('combo-changed', this.multiplier, this.comboKills);
    return gained;
  }

  /** Pontos extras que não contam para o combo (ex.: bônus de vitória). */
  addBonus(value) {
    this.score += value;
    this.events.emit('score-changed', this.score);
  }

  /** Levar dano quebra a sequência: o multiplicador volta para x1. */
  resetCombo() {
    this.comboKills = 0;
    this.multiplier = 1;
    this.events.emit('combo-changed', this.multiplier, this.comboKills);
  }

  // --- Recorde (localStorage) --------------------------------------------
  // try/catch: o navegador pode bloquear o localStorage (modo privado, política
  // de cookies...). Nesse caso o jogo continua funcionando, só não salva.

  static loadHighScore() {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.highScore), 10) || 0;
    } catch {
      return 0;
    }
  }

  /** Salva o recorde se a pontuação for maior. Retorna { highScore, isNewRecord }. */
  static submitScore(score) {
    const previous = ScoreManager.loadHighScore();
    const isNewRecord = score > previous;
    if (isNewRecord) {
      try {
        localStorage.setItem(STORAGE_KEYS.highScore, String(score));
      } catch {
        // Sem localStorage: o recorde vale só para esta sessão.
      }
    }
    return { highScore: Math.max(previous, score), isNewRecord };
  }
}
