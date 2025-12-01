"use strict";

const oiiCalculator = {
  expectedPlaytime(totalHits, mode) {
    if (totalHits <= 0) return 0;
    const coef = oiiConfig.coefficients[mode] || oiiConfig.coefficients.osu;
    return coef.a * Math.pow(totalHits, coef.b);
  },

  calculateII(totalHits, playtimeHours, mode) {
    if (playtimeHours <= 0 || totalHits <= 0) return 0;
    return this.expectedPlaytime(totalHits, mode) / playtimeHours;
  },

  predictPlaytimeForGoal(
    totalHits,
    currentPP,
    goalPP,
    currentPlaytimeHours,
    mode
  ) {
    if (currentPlaytimeHours <= 0 || totalHits <= 0) return Infinity;
    const currentII = this.calculateII(totalHits, currentPlaytimeHours, mode);
    if (currentII <= 0) return Infinity;
    const ppRatio = goalPP / (currentPP || 1);
    const estimatedHitsAtGoal = totalHits * Math.pow(ppRatio, 1.2);
    return this.expectedPlaytime(estimatedHitsAtGoal, mode) / currentII;
  },

  getColor(ii) {
    if (ii <= 0) return "#888";
    if (ii >= 1.2) return "hsl(120, 100%, 45%)";
    if (ii >= 1.07) return "hsl(90, 100%, 50%)";
    if (ii >= 0.94) return "hsl(60, 100%, 50%)";
    if (ii >= 0.8) return "hsl(30, 100%, 50%)";
    return "hsl(0, 100%, 50%)";
  },
};
