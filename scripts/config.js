"use strict";

const oiiConfig = {
  coefficients: {
    osu: { a: 0.000545, b: 0.8737 },
    taiko: { a: 0.000545, b: 0.8737 },
    fruits: { a: 0.000545, b: 0.8737 },
    mania: { a: 0.000545, b: 0.8737 },
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
