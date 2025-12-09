"use strict";

/**
 * osu! Improvement Indicator & Skill Index Configuration
 * 
 * Derived from analysis of 134,953 osu! players (250+ hours)
 * Analysis date: December 2025
 * 
 * TWO INDICES:
 * 1. Improvement Indicator (II) - Activity efficiency
 *    Formula: II = expectedPlaytime / actualPlaytime
 *    Where: expectedPlaytime = a × totalHits^b
 *    Measures: How efficiently you accumulate hits per hour
 * 
 * 2. Skill Index (SI) - Skill efficiency  
 *    Formula: SI = PP / (c × playtime^d)
 *    Measures: How much PP you earn relative to expected for your playtime
 */
const oiiConfig = {
  // Improvement Indicator coefficients (hits-based)
  iiCoefficients: {
    osu: { a: 0.000734, b: 0.8555 },
    taiko: { a: 0.000680, b: 0.8600 },
    fruits: { a: 0.000620, b: 0.8650 },
    mania: { a: 0.000580, b: 0.8700 },
  },
  
  // Skill Index coefficients (PP-based)
  // Formula: SI = PP / (c × hours^d)
  // Derived from power law fit: expected_PP = c × hours^d
  siCoefficients: {
    osu: { c: 226.4153, d: 0.4878 },
    taiko: { c: 200.0, d: 0.50 },
    fruits: { c: 180.0, d: 0.52 },
    mania: { c: 160.0, d: 0.54 },
  },
  
  elementIds: {
    iiElement: "oii-improvement-indicator",
    siElement: "oii-skill-index",
    styles: "oii-styles",
  },
  timing: {
    checkInterval: 50,      // Check more frequently
    maxWaitTime: 3000,      // Reduced from 5s
    initialDelay: 0,        // No initial delay - start immediately
    navigationDelay: 100,   // Reduced from 500ms
    urlChangeDelay: 200,    // Reduced from 1000ms
    retryDelay: 300,        // Reduced from 2000ms
  },
};

const oiiBrowserAPI = (() => {
  if (typeof browser !== "undefined" && browser.runtime) return browser;
  if (typeof chrome !== "undefined" && chrome.runtime) return chrome;
  return null;
})();

