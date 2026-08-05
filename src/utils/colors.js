// Utility functions for dynamic SaaS theming

// Convert hex to RGB object
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Mix two RGB objects
const mixColors = (color1, color2, weight) => {
  const w1 = weight;
  const w2 = 1 - weight;
  return `rgb(${Math.round(color1.r * w1 + color2.r * w2)}, ${Math.round(color1.g * w1 + color2.g * w2)}, ${Math.round(color1.b * w1 + color2.b * w2)})`;
}

// Generate a full Tailwind palette (50-900) based on a primary hex color
export const generateTailwindPalette = (hex) => {
  const baseRgb = hexToRgb(hex);
  if (!baseRgb) return {}; // Invalid hex

  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  return {
    '--brand-primary-50': mixColors(baseRgb, white, 0.1),
    '--brand-primary-100': mixColors(baseRgb, white, 0.2),
    '--brand-primary-200': mixColors(baseRgb, white, 0.4),
    '--brand-primary-300': mixColors(baseRgb, white, 0.6),
    '--brand-primary-400': mixColors(baseRgb, white, 0.8),
    '--brand-primary-500': mixColors(baseRgb, white, 1.0), // Base color
    '--brand-primary-600': mixColors(baseRgb, black, 0.8),
    '--brand-primary-700': mixColors(baseRgb, black, 0.6),
    '--brand-primary-800': mixColors(baseRgb, black, 0.4),
    '--brand-primary-900': mixColors(baseRgb, black, 0.2),
  };
}

export const injectThemeVariables = (hexColor) => {
  if (!hexColor) return;
  const palette = generateTailwindPalette(hexColor);
  for (const [variable, value] of Object.entries(palette)) {
    document.documentElement.style.setProperty(variable, value);
  }
}
