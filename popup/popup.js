"use strict";

const browserAPI = (() => {
  if (typeof browser !== "undefined" && browser.runtime) return browser;
  if (typeof chrome !== "undefined" && chrome.runtime) return chrome;
  return null;
})();

function formatPlaytime(hours) {
  if (!isFinite(hours) || hours < 0) return "∞";
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  const minutes = Math.floor((hours % 1) * 60);
  let result = "";
  if (days > 0) result += `${days}d `;
  if (remainingHours > 0 || days > 0) result += `${remainingHours}h `;
  if (minutes > 0 && days === 0) result += `${minutes}m`;
  return result.trim() || "0h";
}

function formatGameMode(mode) {
  const modes = {
    osu: "osu!standard",
    taiko: "osu!taiko",
    fruits: "osu!catch",
    mania: "osu!mania",
  };
  return modes[mode] || mode;
}

function getIIColor(ii) {
  if (ii <= 0) return "#888";
  if (ii >= 2) return "hsl(120, 100%, 45%)";
  if (ii >= 1) {
    const ratio = (ii - 1) / 1;
    return `hsl(${60 + ratio * 60}, 100%, ${50 - ratio * 5}%)`;
  }
  return `hsl(${ii * 60}, 100%, 50%)`;
}

async function sendToContentScript(message) {
  try {
    if (!browserAPI)
      return { success: false, error: "Browser API not available" };
    const [tab] = await browserAPI.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.url?.includes("osu.ppy.sh/users/"))
      return { success: false, error: "Not on an osu! profile page" };
    return await browserAPI.tabs.sendMessage(tab.id, message);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function updateStatsDisplay(data) {
  document.getElementById("playerName").textContent = data.username || "-";
  document.getElementById("gameMode").textContent = formatGameMode(data.mode);
  document.getElementById("currentPP").textContent = data.pp
    ? `${Math.round(data.pp).toLocaleString()}pp`
    : "-";
  document.getElementById("currentPlaytime").textContent = data.playtimeHours
    ? formatPlaytime(data.playtimeHours)
    : "-";

  const iiElement = document.getElementById("currentII");
  if (data.ii && data.ii > 0) {
    iiElement.textContent = `${data.ii.toFixed(2)}x`;
    iiElement.style.color = getIIColor(data.ii);
  } else {
    iiElement.textContent = "-";
    iiElement.style.color = "";
  }
}

function showNotOnProfile() {
  document.getElementById("statsSection").style.display = "none";
  document.getElementById("calculatorSection").style.display = "none";
  document.getElementById("notOnProfile").style.display = "block";
}

function showStatsView() {
  document.getElementById("statsSection").style.display = "block";
  document.getElementById("calculatorSection").style.display = "block";
  document.getElementById("notOnProfile").style.display = "none";
}

function showAdjustedII(text, className = "") {
  const el = document.getElementById("adjustedII");
  el.textContent = text;
  el.className = "input-result visible " + className;
}

function showPrediction(text, className = "") {
  const el = document.getElementById("predictionResult");
  el.textContent = text;
  el.className = "input-result visible " + className;
}

function hideAdjustedII() {
  document.getElementById("adjustedII").className = "input-result";
}

function hidePrediction() {
  document.getElementById("predictionResult").className = "input-result";
}

async function handleAdditionalPlaytimeChange(event) {
  const additionalHours = parseFloat(event.target.value) || 0;
  if (additionalHours < 0) {
    event.target.value = 0;
    return;
  }
  if (additionalHours === 0) {
    hideAdjustedII();
    return;
  }

  const response = await sendToContentScript({
    type: "UPDATE_PLAYTIME",
    additionalPlaytimeHours: additionalHours,
  });
  if (response.success) {
    const dataResponse = await sendToContentScript({
      type: "GET_CURRENT_DATA",
    });
    if (dataResponse.success && dataResponse.data) {
      const { totalHits, playtimeHours } = dataResponse.data;
      if (totalHits > 0) {
        const expectedPlaytime = 0.000545 * Math.pow(totalHits, 0.8737);
        const adjustedII = expectedPlaytime / (playtimeHours + additionalHours);
        showAdjustedII(
          `Adjusted II: ${adjustedII.toFixed(2)}x (with +${additionalHours}h)`,
          "highlight"
        );
      }
    }
  }
}

async function handleGoalPPChange(event) {
  const goalPP = parseFloat(event.target.value) || 0;
  const additionalHours =
    parseFloat(document.getElementById("additionalPlaytime").value) || 0;
  if (goalPP <= 0) {
    hidePrediction();
    return;
  }

  const response = await sendToContentScript({
    type: "GET_PREDICTION",
    goalPP,
    additionalPlaytimeHours: additionalHours,
  });
  if (response.success) {
    const remaining = response.prediction;
    const currentData = await sendToContentScript({ type: "GET_CURRENT_DATA" });
    const currentPlaytime = currentData.success
      ? currentData.data.playtimeHours + additionalHours
      : 0;
    const additionalNeeded = Math.max(0, remaining - currentPlaytime);

    if (additionalNeeded <= 0) {
      showPrediction(
        `🎉 You should already be at ${goalPP}pp based on your improvement rate!`,
        "success"
      );
    } else {
      showPrediction(
        `📊 Estimated time to reach ${goalPP.toLocaleString()}pp: ${formatPlaytime(
          remaining
        )} total (${formatPlaytime(additionalNeeded)} more)`,
        "highlight"
      );
    }
  } else {
    showPrediction("Could not calculate prediction", "");
  }
}

function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

async function init() {
  const profileLinks = [
    "https://osu.ppy.sh/users/32693046",
    "https://osu.ppy.sh/users/35533437",
    "https://osu.ppy.sh/users/13234370",
    "https://osu.ppy.sh/users/27514055",
    "https://osu.ppy.sh/users/22094038",
    "https://osu.ppy.sh/users/14293652",
    "https://osu.ppy.sh/users/13910074",
    "https://osu.ppy.sh/users/7388142",
    "https://osu.ppy.sh/users/20726353",
    "https://osu.ppy.sh/users/16363979",
    "https://osu.ppy.sh/users/30556250",
    "https://osu.ppy.sh/users/11862201",
    "https://osu.ppy.sh/users/11705938",
    "https://osu.ppy.sh/users/14661718",
    "https://osu.ppy.sh/users/15840146",
    "https://osu.ppy.sh/users/16523449",
    "https://osu.ppy.sh/users/13223964",
    "https://osu.ppy.sh/users/14457718",
  ];

  const randomLink = document.getElementById("randomProfileLink");
  if (randomLink)
    randomLink.href =
      profileLinks[Math.floor(Math.random() * profileLinks.length)];

  const response = await sendToContentScript({ type: "GET_CURRENT_DATA" });
  if (response.success && response.data) {
    showStatsView();
    updateStatsDisplay(response.data);
  } else {
    showNotOnProfile();
  }

  const additionalPlaytimeInput = document.getElementById("additionalPlaytime");
  const goalPPInput = document.getElementById("goalPP");

  additionalPlaytimeInput.addEventListener(
    "input",
    debounce(handleAdditionalPlaytimeChange, 300)
  );
  additionalPlaytimeInput.addEventListener(
    "change",
    handleAdditionalPlaytimeChange
  );
  goalPPInput.addEventListener("input", debounce(handleGoalPPChange, 300));
  goalPPInput.addEventListener("change", handleGoalPPChange);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.close();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
