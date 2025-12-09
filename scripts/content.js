"use strict";

let currentUserData = null;
let isInjecting = false;

/**
 * Inject both II (Improvement Indicator) and SI (Skill Index) into the profile.
 */
async function injectIndices(additionalPlaytimeHours = 0, forceRecreate = false) {
  if (isInjecting) return;

  oiiUI.addStyles();
  
  const existingII = document.getElementById(oiiConfig.elementIds.iiElement);
  const existingSI = document.getElementById(oiiConfig.elementIds.siElement);

  // Update existing elements if possible
  if (!forceRecreate && currentUserData && existingII && existingSI) {
    const playtimeHours = currentUserData.playtimeHours + additionalPlaytimeHours;
    const ii = oiiCalculator.calculateII(currentUserData.totalHits, playtimeHours, currentUserData.mode);
    const si = oiiCalculator.calculateSI(currentUserData.pp, playtimeHours, currentUserData.mode);
    
    currentUserData.ii = ii;
    currentUserData.si = si;
    
    const iiUpdated = oiiUI.updateIIElement(ii, playtimeHours);
    const siUpdated = oiiUI.updateSIElement(si, playtimeHours);
    if (iiUpdated && siUpdated) return;
  }

  isInjecting = true;

  try {
    oiiUI.removeExisting();
    
    if (!currentUserData) {
      await new Promise((r) => setTimeout(r, oiiConfig.timing.initialDelay));
    }

    let userData = oiiDataExtractor.getData();
    if (!userData) {
      await new Promise((r) => setTimeout(r, oiiConfig.timing.retryDelay));
      userData = oiiDataExtractor.getData();
    }
    if (!userData) return;

    const playtimeHours = userData.playTimeSeconds / 3600 + additionalPlaytimeHours;
    const totalHits = userData.totalHits || 0;
    const pp = userData.pp || 0;
    
    const ii = oiiCalculator.calculateII(totalHits, playtimeHours, userData.mode);
    const si = oiiCalculator.calculateSI(pp, playtimeHours, userData.mode);

    currentUserData = {
      ...userData,
      playtimeHours: userData.playTimeSeconds / 3600,
      additionalPlaytimeHours,
      ii,
      si,
    };

    oiiUI.removeExisting();
    
    const iiElement = oiiUI.createIIElement(ii, playtimeHours);
    const siElement = oiiUI.createSIElement(si, playtimeHours);
    
    const injection = oiiUI.findInjectionPoint();

    if (injection) {
      injection.element.appendChild(iiElement);
      injection.element.appendChild(siElement);
    } else {
      iiElement.classList.add("oii-floating");
      siElement.classList.add("oii-floating");
      document.body.appendChild(iiElement);
      document.body.appendChild(siElement);
    }
  } finally {
    isInjecting = false;
  }
}

// Legacy alias
function injectII(additionalPlaytimeHours = 0, forceRecreate = false) {
  return injectIndices(additionalPlaytimeHours, forceRecreate);
}

function setupMessageHandlers() {
  if (!oiiBrowserAPI?.runtime) return;

  oiiBrowserAPI.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
      switch (request.type) {
        case "UPDATE_PLAYTIME":
          injectIndices(Number(request.additionalPlaytimeHours));
          sendResponse({ success: true });
          break;

        case "GET_PREDICTION":
          if (currentUserData) {
            const playtimeHours = currentUserData.playtimeHours + (request.additionalPlaytimeHours || 0);
            const totalHits = currentUserData.totalHits || 0;
            sendResponse({
              success: true,
              prediction: oiiCalculator.predictPlaytimeForGoal(
                totalHits,
                currentUserData.pp,
                Number(request.goalPP),
                playtimeHours,
                currentUserData.mode
              ),
              currentII: oiiCalculator.calculateII(totalHits, playtimeHours, currentUserData.mode),
              currentSI: oiiCalculator.calculateSI(currentUserData.pp, playtimeHours, currentUserData.mode),
            });
          }
          break;

        case "GET_CURRENT_DATA":
          sendResponse(
            currentUserData
              ? {
                  success: true,
                  data: {
                    username: currentUserData.username,
                    pp: currentUserData.pp,
                    totalHits: currentUserData.totalHits || 0,
                    playtimeHours: currentUserData.playtimeHours,
                    mode: currentUserData.mode,
                    ii: currentUserData.ii,
                    si: currentUserData.si,
                  },
                }
              : { success: false, error: "No data" }
          );
          break;
      }
      return true;
    }
  );
}

function init() {
  if (!/\/users\/\d+/.test(location.href)) return;
  injectIndices(0);
}

function setupNavigationObservers() {
  document.addEventListener("turbo:load", () => {
    if (/\/users\/\d+/.test(location.href)) {
      setTimeout(() => injectIndices(0), oiiConfig.timing.navigationDelay);
    }
  });

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (/\/users\/\d+/.test(location.href)) {
        setTimeout(() => injectIndices(0), oiiConfig.timing.urlChangeDelay);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

setupMessageHandlers();
setupNavigationObservers();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
