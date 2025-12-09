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
   * Get color based on II value.
   * Green = fast, Yellow = average, Red = slow
   */
  getColor(ii) {
    if (ii <= 0) return "#888";
    if (ii >= 1.5) return "hsl(120, 100%, 45%)"; // Bright green - exceptional
    if (ii >= 1.2) return "hsl(90, 100%, 50%)";  // Yellow-green - fast
    if (ii >= 0.8) return "hsl(60, 100%, 50%)";  // Yellow - average
    if (ii >= 0.5) return "hsl(30, 100%, 50%)";  // Orange - slow
    return "hsl(0, 100%, 50%)";                   // Red - very slow
  },
};
