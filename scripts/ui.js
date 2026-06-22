"use strict";

const oiiUI = {
  formatPlaytime(hours) {
    if (!isFinite(hours) || hours < 0) return "∞";
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    const minutes = Math.floor((hours % 1) * 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (remainingHours > 0 || days > 0) parts.push(`${remainingHours}h`);
    if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
    return parts.join(" ") || "0h";
  },

  // ==================== IMPROVEMENT INDICATOR (II) ====================

  createIITooltip_() {
    const tooltip = document.createElement("div");
    tooltip.className = "oii-tooltip";

    const title = document.createElement("div");
    title.className = "oii-tooltip__title";
    title.textContent = "Improvement Indicator";

    const desc = document.createElement("div");
    desc.className = "oii-tooltip__desc";
    desc.textContent = "Activity efficiency: hits per hour vs average.";

    const legend = document.createElement("div");
    legend.className = "oii-tooltip__legend";

    [
      { dotClass: "oii-dot--ii-5", text: "> 1.5x Very Active" },
      { dotClass: "oii-dot--ii-4", text: "1.2-1.5x Active" },
      { dotClass: "oii-dot--ii-3", text: "0.8-1.2x Average" },
      { dotClass: "oii-dot--ii-2", text: "0.5-0.8x Casual" },
      { dotClass: "oii-dot--ii-1", text: "< 0.5x Very Casual" },
    ].forEach((item) => {
      const row = document.createElement("div");
      row.className = "oii-tooltip__legend-item";
      const dot = document.createElement("span");
      dot.className = `oii-dot ${item.dotClass}`;
      row.appendChild(dot);
      row.appendChild(document.createTextNode(item.text));
      legend.appendChild(row);
    });

    tooltip.append(title, desc, legend);
    return tooltip;
  },

  createIIElement(ii, playtimeHours) {
    const container = document.createElement("div");
    container.id = oiiConfig.elementIds.iiElement;
    container.className = "value-display value-display--plain oii-index";

    const displayValue = ii > 0 && playtimeHours > 0 ? `${ii.toFixed(2)}x` : "-";
    const color = oiiCalculator.getIIColor(ii);

    const labelDiv = document.createElement("div");
    labelDiv.className = "value-display__label";
    labelDiv.textContent = "ii";

    const valueDiv = document.createElement("div");
    valueDiv.className = "value-display__value";
    valueDiv.style.cssText = `color:${color};text-shadow:0 0 10px ${color};cursor:help`;
    valueDiv.textContent = displayValue;

    container.append(labelDiv, valueDiv, this.createIITooltip_());
    return container;
  },

  updateIIElement(ii, playtimeHours) {
    const container = document.getElementById(oiiConfig.elementIds.iiElement);
    const valueDiv = container?.querySelector(".value-display__value");
    if (!valueDiv) return false;

    const displayValue = ii > 0 && playtimeHours > 0 ? `${ii.toFixed(2)}x` : "-";
    const color = oiiCalculator.getIIColor(ii);
    valueDiv.textContent = displayValue;
    valueDiv.style.color = color;
    valueDiv.style.textShadow = `0 0 10px ${color}`;
    return true;
  },

  // ==================== SKILL INDEX (SI) ====================

  createSITooltip_() {
    const tooltip = document.createElement("div");
    tooltip.className = "oii-tooltip";

    const title = document.createElement("div");
    title.className = "oii-tooltip__title";
    title.textContent = "Skill Index";

    const desc = document.createElement("div");
    desc.className = "oii-tooltip__desc";
    desc.textContent = "PP efficiency: your PP vs expected for playtime.";

    const legend = document.createElement("div");
    legend.className = "oii-tooltip__legend";

    [
      { dotClass: "oii-dot--si-6", text: "> 2.0x Prodigy" },
      { dotClass: "oii-dot--si-5", text: "1.5-2.0x Gifted" },
      { dotClass: "oii-dot--si-4", text: "1.2-1.5x Skilled" },
      { dotClass: "oii-dot--si-3", text: "0.8-1.2x Average" },
      { dotClass: "oii-dot--si-2", text: "0.5-0.8x Developing" },
      { dotClass: "oii-dot--si-1", text: "< 0.5x Beginner" },
    ].forEach((item) => {
      const row = document.createElement("div");
      row.className = "oii-tooltip__legend-item";
      const dot = document.createElement("span");
      dot.className = `oii-dot ${item.dotClass}`;
      row.appendChild(dot);
      row.appendChild(document.createTextNode(item.text));
      legend.appendChild(row);
    });

    tooltip.append(title, desc, legend);
    return tooltip;
  },

  createSIElement(si, playtimeHours) {
    const container = document.createElement("div");
    container.id = oiiConfig.elementIds.siElement;
    container.className = "value-display value-display--plain oii-index";

    const displayValue = si > 0 && playtimeHours > 0 ? `${si.toFixed(2)}x` : "-";
    const color = oiiCalculator.getSIColor(si);

    const labelDiv = document.createElement("div");
    labelDiv.className = "value-display__label";
    labelDiv.textContent = "si";

    const valueDiv = document.createElement("div");
    valueDiv.className = "value-display__value";
    valueDiv.style.cssText = `color:${color};text-shadow:0 0 10px ${color};cursor:help`;
    valueDiv.textContent = displayValue;

    container.append(labelDiv, valueDiv, this.createSITooltip_());
    return container;
  },

  updateSIElement(si, playtimeHours) {
    const container = document.getElementById(oiiConfig.elementIds.siElement);
    const valueDiv = container?.querySelector(".value-display__value");
    if (!valueDiv) return false;

    const displayValue = si > 0 && playtimeHours > 0 ? `${si.toFixed(2)}x` : "-";
    const color = oiiCalculator.getSIColor(si);
    valueDiv.textContent = displayValue;
    valueDiv.style.color = color;
    valueDiv.style.textShadow = `0 0 10px ${color}`;
    return true;
  },

  // ==================== SHARED ====================

    findInjectionPoint() {
        for (const selector of [
          ".profile-detail-stats__values--grid",
          ".profile-detail-stats__values",
          ".profile-detail-stats",
          ".profile-detail",
        ]) {
          const el = document.querySelector(selector);
          if (el) return { element: el, position: "append" };
        }
        return null;
      },

  removeExisting() {
    document.querySelectorAll(`#${oiiConfig.elementIds.iiElement}`).forEach((el) => el.remove());
    document.querySelectorAll(`#${oiiConfig.elementIds.siElement}`).forEach((el) => el.remove());
  },
};
