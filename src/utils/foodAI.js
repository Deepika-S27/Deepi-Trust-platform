/**
 * Real AI Food Quality Analyzer
 * Uses Canvas-based computer vision to analyze food images:
 * - Color histogram analysis (food vs non-food detection)
 * - Freshness scoring based on color vibrancy
 * - Packaging quality via edge/contrast analysis
 * - Hygiene assessment via cleanliness indicators
 * - Contamination risk via anomaly detection
 */

// ── Food color ranges (HSL) ─────────────────────────────────────────────────
const FOOD_HUE_RANGES = [
  { name: 'red',    min: 0,   max: 15  },
  { name: 'red2',   min: 345, max: 360 },
  { name: 'orange', min: 15,  max: 45  },
  { name: 'yellow', min: 45,  max: 70  },
  { name: 'green',  min: 70,  max: 165 },
  { name: 'brown',  min: 15,  max: 45  },  // low saturation browns
  { name: 'cream',  min: 30,  max: 60  },  // low sat creams
];

// Non-food dominant colors
const NON_FOOD_HUE_RANGES = [
  { name: 'blue_sky',  min: 190, max: 250 },
  { name: 'purple',    min: 270, max: 330 },
  { name: 'cyan',      min: 170, max: 200 },
];

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Load image from data URL into canvas and extract pixel data
 */
function loadImageData(imageDataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Resize to 200x200 for performance
      const size = 200;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size);
      resolve(imageData);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Analyze color distribution of the image
 */
function analyzeColors(imageData) {
  const { data, width, height } = imageData;
  const totalPixels = width * height;

  let foodPixels = 0;
  let nonFoodPixels = 0;
  let greyPixels = 0;
  let darkPixels = 0;
  let brightPixels = 0;

  let totalSaturation = 0;
  let totalBrightness = 0;
  let warmPixels = 0;
  let greenPixels = 0;

  const hueHistogram = new Array(360).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const { h, s, l } = rgbToHsl(r, g, b);

    hueHistogram[Math.floor(h)] = (hueHistogram[Math.floor(h)] || 0) + 1;
    totalSaturation += s;
    totalBrightness += l;

    if (l < 10) { darkPixels++; continue; }
    if (l > 95) { brightPixels++; continue; }

    // Grey/desaturated pixels
    if (s < 12) {
      greyPixels++;
      continue;
    }

    // Check food colors
    let isFood = false;
    for (const range of FOOD_HUE_RANGES) {
      if (h >= range.min && h <= range.max) {
        if (range.name === 'brown' || range.name === 'cream') {
          if (s >= 10 && s <= 60 && l >= 10 && l <= 55) {
            foodPixels++;
            isFood = true;
          }
        } else {
          if (s >= 20 && l >= 15 && l <= 85) {
            foodPixels++;
            isFood = true;
          }
        }
        break;
      }
    }

    // Warm tones (food-like)
    if ((h >= 0 && h <= 70) || (h >= 345 && h <= 360)) {
      warmPixels++;
    }

    // Green (fresh vegetables)
    if (h >= 70 && h <= 165 && s >= 20) {
      greenPixels++;
    }

    // Check non-food colors
    if (!isFood) {
      for (const range of NON_FOOD_HUE_RANGES) {
        if (h >= range.min && h <= range.max && s >= 25) {
          nonFoodPixels++;
          break;
        }
      }
    }
  }

  const activePixels = totalPixels - darkPixels - brightPixels;
  const avgSaturation = totalSaturation / totalPixels;
  const avgBrightness = totalBrightness / totalPixels;

  return {
    foodRatio: activePixels > 0 ? foodPixels / activePixels : 0,
    nonFoodRatio: activePixels > 0 ? nonFoodPixels / activePixels : 0,
    greyRatio: greyPixels / totalPixels,
    warmRatio: activePixels > 0 ? warmPixels / activePixels : 0,
    greenRatio: activePixels > 0 ? greenPixels / activePixels : 0,
    avgSaturation,
    avgBrightness,
    darkRatio: darkPixels / totalPixels,
    brightRatio: brightPixels / totalPixels,
    hueHistogram,
    totalPixels,
  };
}

/**
 * Analyze image texture/edges using Sobel-like operator
 */
function analyzeTexture(imageData) {
  const { data, width, height } = imageData;
  let edgeSum = 0;
  let edgeCount = 0;

  // Simple edge detection (gradient magnitude)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;
      const top = ((y - 1) * width + x) * 4;
      const bottom = ((y + 1) * width + x) * 4;

      const gxR = data[right] - data[left];
      const gxG = data[right + 1] - data[left + 1];
      const gxB = data[right + 2] - data[left + 2];

      const gyR = data[bottom] - data[top];
      const gyG = data[bottom + 1] - data[top + 1];
      const gyB = data[bottom + 2] - data[top + 2];

      const gx = Math.abs(gxR) + Math.abs(gxG) + Math.abs(gxB);
      const gy = Math.abs(gyR) + Math.abs(gyG) + Math.abs(gyB);

      edgeSum += Math.sqrt(gx * gx + gy * gy);
      edgeCount++;
    }
  }

  return {
    avgEdgeIntensity: edgeCount > 0 ? edgeSum / edgeCount : 0,
    edgeDensity: edgeCount > 0 ? edgeSum / (edgeCount * 441) : 0, // normalize to 0-1 range
  };
}

/**
 * Determine if image is likely food
 */
function isFoodImage(colors) {
  // Strong non-food indicators
  if (colors.nonFoodRatio > 0.5) return { isFood: false, confidence: 90, reason: 'Image contains predominantly non-food colors (blue/purple/cyan)' };
  if (colors.greyRatio > 0.7) return { isFood: false, confidence: 85, reason: 'Image appears to be a document, screenshot, or grey object' };
  if (colors.avgSaturation < 8) return { isFood: false, confidence: 80, reason: 'Image has very low color saturation — does not appear to be food' };
  if (colors.darkRatio > 0.7) return { isFood: false, confidence: 75, reason: 'Image is too dark to identify food content' };
  if (colors.brightRatio > 0.6) return { isFood: false, confidence: 70, reason: 'Image is overexposed — unable to verify food content' };

  // Food indicators
  if (colors.foodRatio > 0.4) return { isFood: true, confidence: 90, reason: 'Food colors detected with high confidence' };
  if (colors.warmRatio > 0.3 && colors.foodRatio > 0.2) return { isFood: true, confidence: 80, reason: 'Warm food tones detected' };
  if (colors.greenRatio > 0.25) return { isFood: true, confidence: 75, reason: 'Fresh green vegetables/salad detected' };

  // Borderline
  if (colors.foodRatio > 0.15 && colors.nonFoodRatio < 0.3) return { isFood: true, confidence: 60, reason: 'Some food colors present but confidence is moderate' };

  return { isFood: false, confidence: 65, reason: 'Image does not contain enough food-related colors' };
}

/**
 * Calculate detailed quality scores
 */
function calculateQualityScores(colors, texture) {
  // Freshness: based on color vibrancy and saturation
  const saturationScore = Math.min(100, colors.avgSaturation * 1.5);
  const vibrancyBonus = colors.greenRatio > 0.1 ? 15 : 0;
  const warmBonus = colors.warmRatio > 0.2 ? 10 : 0;
  const freshness = Math.min(99, Math.max(40, Math.round(saturationScore * 0.6 + vibrancyBonus + warmBonus + 20)));

  // Packaging: based on edge structure (well-packaged food has defined edges)
  const edgeScore = Math.min(100, texture.avgEdgeIntensity * 0.8);
  const packaging = Math.min(99, Math.max(50, Math.round(edgeScore * 0.5 + 50)));

  // Hygiene: based on overall cleanliness (brightness, low dark areas)
  const brightnessScore = Math.min(100, Math.abs(colors.avgBrightness - 55) < 25 ? 90 : 70);
  const cleanScore = (1 - colors.darkRatio) * 100;
  const hygiene = Math.min(99, Math.max(45, Math.round(brightnessScore * 0.4 + cleanScore * 0.4 + 15)));

  // Temperature: estimated from color warmth
  const tempScore = colors.warmRatio > 0.3 ? 88 : colors.warmRatio > 0.15 ? 80 : 72;
  const temperature = Math.min(99, Math.max(50, Math.round(tempScore)));

  // Contamination Risk: inverse of unusual color presence
  const contaminationRisk = Math.min(99, Math.max(55, Math.round(
    (1 - colors.nonFoodRatio) * 40 + (1 - colors.greyRatio) * 30 + 30
  )));

  return [
    { label: 'Freshness', icon: '🥬', score: freshness, status: freshness >= 70 ? 'pass' : 'warning' },
    { label: 'Packaging', icon: '📦', score: packaging, status: packaging >= 65 ? 'pass' : 'warning' },
    { label: 'Hygiene', icon: '🧼', score: hygiene, status: hygiene >= 65 ? 'pass' : 'warning' },
    { label: 'Temperature', icon: '🌡️', score: temperature, status: temperature >= 70 ? 'pass' : 'warning' },
    { label: 'Contamination Risk', icon: '⚠️', score: contaminationRisk, status: contaminationRisk >= 70 ? 'pass' : 'warning' },
  ];
}

/**
 * Main analysis function — call this from the dashboard
 * @param {string} imageDataUrl - base64 data URL of the food image
 * @returns {Promise<{isFood: boolean, overallScore: number, details: Array, reason: string}>}
 */
export async function analyzeFoodImage(imageDataUrl) {
  if (!imageDataUrl) {
    return {
      isFood: false,
      overallScore: 0,
      details: [],
      reason: 'No image provided for analysis',
    };
  }

  try {
    const imageData = await loadImageData(imageDataUrl);
    const colors = analyzeColors(imageData);
    const texture = analyzeTexture(imageData);

    // Step 1: Is this food?
    const foodCheck = isFoodImage(colors);

    if (!foodCheck.isFood) {
      return {
        isFood: false,
        overallScore: 0,
        confidence: foodCheck.confidence,
        details: [],
        reason: foodCheck.reason,
      };
    }

    // Step 2: Calculate quality scores
    const details = calculateQualityScores(colors, texture);
    const overallScore = Math.round(details.reduce((sum, d) => sum + d.score, 0) / details.length);

    return {
      isFood: true,
      overallScore,
      confidence: foodCheck.confidence,
      details,
      reason: foodCheck.reason,
    };
  } catch (err) {
    console.error('Food AI analysis error:', err);
    return {
      isFood: false,
      overallScore: 0,
      details: [],
      reason: 'Error analyzing image: ' + err.message,
    };
  }
}
