"use strict";

/**
 * osu! Improvement Indicator Calculator
 * 
 * Formula: II = expectedPlaytime / actualPlaytime
 * Where: expectedPlaytime = a × totalHits^b
 * 
 * Coefficients derived from 134,953 players with 250+ hours.
 * R² = 0.9647 for osu! mode.
 */
const oiiCalculator = {
  /**
   * Calculate expected playtime based on total hits.
   */
  expectedPlaytime(totalHits, mode) {
    if (totalHits <= 0) return 0;
    const coef = oiiConfig.coefficients[mode] || oiiConfig.coefficients.osu;
    return coef.a * Math.pow(totalHits, coef.b);
  },

  /**
   * Calculate Improvement Indicator.
   * Returns value where 1.0 = average, >1 = faster, <1 = slower.
   */
  calculateII(totalHits, playtimeHours, mode) {
    if (playtimeHours <= 0 || totalHits <= 0) return 0;
    return this.expectedPlaytime(totalHits, mode) / playtimeHours;
  },

  /**
   * Predict playtime needed to reach a PP goal.
   */
  predictPlaytimeForGoal(totalHits, currentPP, goalPP, currentPlaytimeHours, mode) {
    if (currentPlaytimeHours <= 0 || totalHits <= 0) return Infinity;
    const currentII = this.calculateII(totalHits, currentPlaytimeHours, mode);
    if (currentII <= 0) return Infinity;
    const ppRatio = goalPP / (currentPP || 1);
    const estimatedHitsAtGoal = totalHits * Math.pow(ppRatio, 1.2);
    return this.expectedPlaytime(estimatedHitsAtGoal, mode) / currentII;
  },

  /**
   * Get interpretation text for an II value.
   */
  getInterpretation(ii) {
    if (ii >= 2.0) return "Exceptional";
    if (ii >= 1.5) return "Very Fast";
    if (ii >= 1.2) return "Fast";
    if (ii >= 0.8) return "Average";
    if (ii >= 0.5) return "Slow";
    return "Very Slow";
  },

  /**
   * Get color based on II value using smooth gradient.
   * Uses HSL color space: 0=red, 60=yellow, 120=green, 180=cyan, 240=blue, 300=magenta
   * Range: 0.3x (red) → 1.0x (yellow) → 2.0x (cyan/blue)
   */
  getColor(ii) {
    if (ii <= 0) return "#888";
    
    // Clamp II to reasonable display range
    const minII = 0.3;
    const maxII = 2.5;
    const clampedII = Math.max(minII, Math.min(maxII, ii));
    
    // Map II to hue: 0.3 → 0° (red), 1.0 → 60° (yellow), 2.5 → 200° (cyan-blue)
    let hue;
    if (clampedII <= 1.0) {
      // Below/at average: red (0°) to yellow (60°)
      const t = (clampedII - minII) / (1.0 - minII);
      hue = t * 60;
    } else {
      // Above average: yellow (60°) to cyan-blue (200°)
      const t = (clampedII - 1.0) / (maxII - 1.0);
      hue = 60 + t * 140;
    }
    
    // Increase saturation and adjust lightness for visibility
    const saturation = 100;
    const lightness = 50;
    
    return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
  },
};

