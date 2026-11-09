import { CSS_COLORS } from '../config.js';

// Fonte do sistema: sempre disponível, legível e sem arquivos externos.
export const FONT_FAMILY =
  '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Roboto, Arial, sans-serif';

/**
 * Cria um objeto de estilo de texto padronizado.
 * `resolution: 2` deixa o texto nítido quando o Phaser escala o canvas (Scale.FIT).
 */
export function textStyle(size, color = CSS_COLORS.white, extra = {}) {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    color,
    resolution: 2,
    ...extra,
  };
}

/** Texto com brilho neon (sombra colorida sem deslocamento). */
export function glowStyle(size, color, glowColor = color, extra = {}) {
  return textStyle(size, color, {
    fontStyle: 'bold',
    shadow: { offsetX: 0, offsetY: 0, color: glowColor, blur: 14, fill: true },
    ...extra,
  });
}

/** Formata números no padrão brasileiro (12.345). */
export function formatNumber(value) {
  return Math.floor(value).toLocaleString('pt-BR');
}
