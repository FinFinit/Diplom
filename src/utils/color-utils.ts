// Функция для преобразования HEX в HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Убираем # если он есть
  hex = hex.replace('#', '');

  // Преобразуем HEX в RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Функция для преобразования HSL в HEX
function hslToHex(h: number, s: number, l: number): string {
  l = Math.min(100, Math.max(0, l));
  s = Math.min(100, Math.max(0, s));
  h = Math.min(360, Math.max(0, h));

  const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l / 100 - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Функция для создания светлого оттенка цвета
export function getLightColor(hex: string, lightness: number = 95): string {
  const hsl = hexToHSL(hex);
  // Увеличиваем насыщенность для более яркого цвета
  const enhancedSaturation = Math.min(100, hsl.s * 1.2);
  return hslToHex(hsl.h, enhancedSaturation, lightness);
}

// Функция для проверки, является ли цвет светлым
export function isLightColor(hex: string): boolean {
  const hsl = hexToHSL(hex);
  return hsl.l > 50;
} 