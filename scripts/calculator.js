"use strict";

/**
 * osu! Improvement Indicator & Skill Index Calculator
 * 
 * Two indices derived from 134,953 players with 250+ hours:
 * 
 * 1. Improvement Indicator (II) - Activity Efficiency
 *    Formula: II = expectedPlaytime / actualPlaytime
 *    Where: expectedPlaytime = a × totalHits^b
 *    Measures: How efficiently you click per hour
 * 
 * 2. Skill Index (SI) - Skill Efficiency
 *    Formula: SI = PP / expectedPP
 *    Where: expectedPP = c × playtime^d
 *    Measures: How much PP you have vs expected for your playtime
 */
const oiiCalculator = {
  // ==================== IMPROVEMENT INDICATOR (II) ====================
  
  /**
   * Calculate expected playtime based on total hits.
   */
  expectedPlaytime(totalHits, mode) {
    if (totalHits <= 0) return 0;
    const coef = oiiConfig.iiCoefficients[mode] || oiiConfig.iiCoefficients.osu;
    return coef.a * Math.pow(totalHits, coef.b);
  },

  /**
   * Calculate Improvement Indicator.
   * Returns value where 1.0 = average, >1 = faster clicking, <1 = slower.
   */
  calculateII(totalHits, playtimeHours, mode) {
    if (playtimeHours <= 0 || totalHits <= 0) return 0;
    return this.expectedPlaytime(totalHits, mode) / playtimeHours;
  },

  /**
   * Get II interpretation text.
   */
  getIIInterpretation(ii) {
    if (ii >= 1.5) return "Very Active";
    if (ii >= 1.2) return "Active";
    if (ii >= 0.8) return "Average";
    if (ii >= 0.5) return "Casual";
    return "Very Casual";
  },

  /**
   * Get II color (warm spectrum: red → yellow → green).
   */
  getIIColor(ii) {
    if (ii <= 0) return "#888";
    const minII = 0.3, maxII = 2.0;
    const clamped = Math.max(minII, Math.min(maxII, ii));
    
    let hue;
    if (clamped <= 1.0) {
      const t = (clamped - minII) / (1.0 - minII);
      hue = t * 60; // red (0) → yellow (60)
    } else {
      const t = (clamped - 1.0) / (maxII - 1.0);
      hue = 60 + t * 60; // yellow (60) → green (120)
    }
    return `hsl(${Math.round(hue)}, 100%, 50%)`;
  },

  // ==================== SKILL INDEX (SI) ====================
  
  /**
   * Calculate expected PP based on playtime.
   */
  expectedPP(playtimeHours, mode) {
    if (playtimeHours <= 0) return 0;
    const coef = oiiConfig.siCoefficients[mode] || oiiConfig.siCoefficients.osu;
    return coef.c * Math.pow(playtimeHours, coef.d);
  },

  /**
   * Calculate Skill Index.
   * Returns value where 1.0 = average skill for playtime, >1 = more skilled, <1 = less.
   */
  calculateSI(pp, playtimeHours, mode) {
    if (playtimeHours <= 0 || pp <= 0) return 0;
    return pp / this.expectedPP(playtimeHours, mode);
  },

  /**
   * Get SI interpretation text.
   */
  getSIInterpretation(si) {
    if (si >= 2.0) return "Prodigy";
    if (si >= 1.5) return "Gifted";
    if (si >= 1.2) return "Skilled";
    if (si >= 0.8) return "Average";
    if (si >= 0.5) return "Developing";
    return "Beginner";
  },

  /**
   * Get SI color (cool spectrum: purple → blue → cyan).
   */
  getSIColor(si) {
    if (si <= 0) return "#888";
    const minSI = 0.3, maxSI = 3.0;
    const clamped = Math.max(minSI, Math.min(maxSI, si));
    
    let hue;
    if (clamped <= 1.0) {
      const t = (clamped - minSI) / (1.0 - minSI);
      hue = 270 + t * 30; // purple (270) → blue-purple (300)
    } else {
      const t = (clamped - 1.0) / (maxSI - 1.0);
      hue = 180 + (1 - t) * 90; // cyan (180) ← blue (270)
    }
    return `hsl(${Math.round(hue)}, 100%, 55%)`;
  },

  // ==================== LEGACY COMPATIBILITY ====================
  
  getInterpretation(ii) { return this.getIIInterpretation(ii); },
  getColor(ii) { return this.getIIColor(ii); },
  
  predictPlaytimeForGoal(totalHits, currentPP, goalPP, currentPlaytimeHours, mode) {
    if (currentPlaytimeHours <= 0 || totalHits <= 0) return Infinity;
    const currentII = this.calculateII(totalHits, currentPlaytimeHours, mode);
    if (currentII <= 0) return Infinity;
    const ppRatio = goalPP / (currentPP || 1);
    const estimatedHitsAtGoal = totalHits * Math.pow(ppRatio, 1.2);
    return this.expectedPlaytime(estimatedHitsAtGoal, mode) / currentII;
  },
};

