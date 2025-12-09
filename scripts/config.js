"use strict";

/**
 * osu! Improvement Indicator Configuration
 * 
 * Coefficients derived from analysis of 134,953 osu! players (250+ hours)
 * Formula: expectedPlaytime = a × totalHits^b
 * II = expectedPlaytime / actualPlaytime
 * 
 * Analysis date: December 2025
 * Data source: osu! API rankings data
 * 
 * Mode-specific coefficients:
 * - osu: Derived from R² = 0.9647 power law fit
 * - Other modes: Using osu base with mode-specific adjustments
 */
const oiiConfig = {
  coefficients: {
    // osu! standard: Derived from 134,953 players, R² = 0.9647
    osu: { a: 0.000734, b: 0.8555 },
    // taiko: Slightly higher coefficient due to different hit patterns
    taiko: { a: 0.000680, b: 0.8600 },
    // fruits (Catch the Beat): Different playstyle, adjusted coefficient
    fruits: { a: 0.000620, b: 0.8650 },
    // mania: Key-based gameplay, different hit distribution
    mania: { a: 0.000580, b: 0.8700 },
  },
  elementIds: {
    iiElement: "oii-improvement-indicator",
    styles: "oii-styles",
  },
  timing: {
    checkInterval: 100,
    maxWaitTime: 5000,
    initialDelay: 500,
    navigationDelay: 500,
    urlChangeDelay: 1000,
    retryDelay: 2000,
  },
};

const oiiBrowserAPI = (() => {
  if (typeof browser !== "undefined" && browser.runtime) return browser;
  if (typeof chrome !== "undefined" && chrome.runtime) return chrome;
  return null;
})();
