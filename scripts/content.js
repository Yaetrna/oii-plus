"use strict";

let currentUserData = null;
let isInjecting = false;
let lastInjectedUrl = null;
let reinjectObserver = null;

/**
 * Inject both II (Improvement Indicator) and SI (Skill Index) into the profile.
 */
async function injectIndices(additionalPlaytimeHours = 0, forceRecreate = false) {
  if (isInjecting) return;

    const existingII = document.getElementById(oiiConfig.elementIds.iiElement);
  const existingSI = document.getElementById(oiiConfig.elementIds.siElement);

  // Update existing elements if possible (handles UPDATE_PLAYTIME adjustments)
  if (!forceRecreate && currentUserData && existingII && existingSI) {
    const playtimeHours = currentUserData.playtimeHours + additionalPlaytimeHours;
    const ii = oiiCalculator.calculateII(currentUserData.totalHits, playtimeHours, currentUserData.mode);
    const si = oiiCalculator.calculateSI(currentUserData.pp, playtimeHours, currentUserData.mode);

    currentUserData.ii = ii;
    currentUserData.si = si;
    currentUserData.additionalPlaytimeHours = additionalPlaytimeHours;

    oiiUI.updateIIElement(ii, playtimeHours);
    oiiUI.updateSIElement(si, playtimeHours);
    return;
  }

  isInjecting = true;

  try {
    oiiUI.removeExisting();
    
    // Try to get data immediately first (no delay)
    let userData = oiiDataExtractor.getData();
    
    // If no data yet, wait for data-initial-data to be available
    if (!userData) {
      userData = await waitForProfileData();
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

    // Track last injected URL
    lastInjectedUrl = location.href;

    // Wait for a real injection container to avoid floating flicker
    const injection = await waitForInjectionPoint(3000);

    oiiUI.removeExisting();

    const iiElement = oiiUI.createIIElement(ii, playtimeHours);
    const siElement = oiiUI.createSIElement(si, playtimeHours);

    if (injection) {
      injection.element.appendChild(iiElement);
      injection.element.appendChild(siElement);
    } else {
      // Fallback only if container never appears in time
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

/**
 * Observe the profile section for dynamic re-renders and reinject if needed.
 */
function setupDomObservers() {
  // Clean previous observer
  if (reinjectObserver) {
    try { reinjectObserver.disconnect(); } catch {}
  }

  const target = document.querySelector('.profile-detail') || document.querySelector('.osu-layout') || document.body;
  if (!target) return;

  let scheduled = false;
  reinjectObserver = new MutationObserver(() => {
    // Only care on user profile pages
    if (!/\/users\/\d+/.test(location.href)) return;

    const ii = document.getElementById(oiiConfig.elementIds.iiElement);
    const si = document.getElementById(oiiConfig.elementIds.siElement);
    const container = oiiUI.findInjectionPoint();

    // If container exists but our elements are missing OR not inside it, schedule reinjection
    const needReinject = !!(container && (
      !ii || !si ||
      (ii && !container.element.contains(ii)) ||
      (si && !container.element.contains(si))
    ));

    if (needReinject && !scheduled && !isInjecting) {
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        injectIndices(0, true);
      }, 150);
    }
  });

  reinjectObserver.observe(target, { childList: true, subtree: true });
}

/**
 * Wait for injection container to appear.
 */
function waitForInjectionPoint(maxWaitTime = 3000) {
  return new Promise((resolve) => {
    // Immediate check
    const found = oiiUI.findInjectionPoint();
    if (found) return resolve(found);

    let resolved = false;
    const start = Date.now();

    const observer = new MutationObserver(() => {
      if (resolved) return;
      const foundNow = oiiUI.findInjectionPoint();
      if (foundNow) {
        resolved = true;
        observer.disconnect();
        resolve(foundNow);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = setInterval(() => {
      if (resolved) return clearInterval(interval);
      const foundNow = oiiUI.findInjectionPoint();
      if (foundNow) {
        resolved = true;
        observer.disconnect();
        clearInterval(interval);
        resolve(foundNow);
      }
      if (Date.now() - start > maxWaitTime) {
        resolved = true;
        observer.disconnect();
        clearInterval(interval);
        resolve(null);
      }
    }, 100);
  });
}

/**
 * Wait for profile data to be available using MutationObserver for efficiency.
 * Falls back to polling if needed.
 */
function waitForProfileData(maxWaitTime = 3000) {
  return new Promise((resolve) => {
    let userData = oiiDataExtractor.getData();
    if (userData?.pp && userData?.playTimeSeconds) {
      resolve(userData);
      return;
    }

    const startTime = Date.now();
    let resolved = false;

    const observer = new MutationObserver(() => {
      if (resolved) return;
      userData = oiiDataExtractor.getData();
      if (userData?.pp && userData?.playTimeSeconds) {
        resolved = true;
        observer.disconnect();
        resolve(userData);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-initial-data']
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        observer.disconnect();
        resolve(oiiDataExtractor.getData());
      }
    }, maxWaitTime);
  });
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

              case "UPDATE_PLAYTIME_AND_GET_ALL":
                injectIndices(Number(request.additionalPlaytimeHours));
                if (currentUserData) {
                  const h = currentUserData.playtimeHours + Number(request.additionalPlaytimeHours);
                  sendResponse({
                    success: true,
                    data: {
                      username: currentUserData.username,
                      pp: currentUserData.pp,
                      totalHits: currentUserData.totalHits || 0,
                      playtimeHours: h,
                      mode: currentUserData.mode,
                      ii: currentUserData.ii,
                      si: currentUserData.si,
                    },
                  });
                } else {
                  sendResponse({ success: false, error: "No data" });
                }
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
  // Reset data when visiting a new profile
  currentUserData = null;
  lastInjectedUrl = null;
  injectIndices(0);
  setupDomObservers();
}

function setupNavigationObservers() {
  // Handle Turbo navigation (osu! uses Turbo for SPA-like navigation)
  document.addEventListener("turbo:load", () => {
    if (/\/users\/\d+/.test(location.href)) {
      currentUserData = null;
      lastInjectedUrl = null;
      setTimeout(() => injectIndices(0, true), oiiConfig.timing.navigationDelay);
      setTimeout(() => setupDomObservers(), oiiConfig.timing.navigationDelay + 10);
    }
  });
  
  // Also listen for turbo:render which fires earlier
  document.addEventListener("turbo:render", () => {
    if (/\/users\/\d+/.test(location.href)) {
      // Just remove old elements, injection will happen on turbo:load
      oiiUI.removeExisting();
      setupDomObservers();
    }
  });

  // Handle browser back/forward navigation
  window.addEventListener("popstate", () => {
    if (/\/users\/\d+/.test(location.href)) {
      currentUserData = null;
      lastInjectedUrl = null;
      setTimeout(() => injectIndices(0, true), oiiConfig.timing.navigationDelay);
      setTimeout(() => setupDomObservers(), oiiConfig.timing.navigationDelay + 10);
    }
  });
}

setupMessageHandlers();
setupNavigationObservers();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
