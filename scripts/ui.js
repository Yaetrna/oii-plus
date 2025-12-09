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

  addStyles() {
    if (document.getElementById(oiiConfig.elementIds.styles)) return;
    const style = document.createElement("style");
    style.id = oiiConfig.elementIds.styles;
    style.textContent = `
      .profile-detail__values--grid{grid-template-columns:repeat(6,1fr)!important}
      .profile-detail__values{gap:12px}
      .oii-index{position:relative}
      .oii-index .value-display__value{transition:all .2s ease}
      .oii-index:hover .value-display__value{filter:brightness(1.2)}
      .oii-tooltip{visibility:hidden;opacity:0;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:hsl(var(--hsl-b2,260 10% 15%));border:1px solid hsl(var(--hsl-b4,260 10% 30%));border-radius:6px;padding:10px 12px;width:max-content;max-width:280px;z-index:1000;transition:opacity .2s,visibility .2s;pointer-events:none;margin-bottom:8px;box-shadow:0 4px 12px rgba(0,0,0,.4)}
      .oii-tooltip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:hsl(var(--hsl-b4,260 10% 30%))}
      .oii-index:hover .oii-tooltip{visibility:visible;opacity:1}
      .oii-tooltip__title{font-weight:700;font-size:13px;color:hsl(var(--hsl-c1,0 0% 100%));margin-bottom:6px}
      .oii-tooltip__desc{font-size:11px;color:hsl(var(--hsl-c2,0 0% 70%));margin-bottom:8px}
      .oii-tooltip__legend{font-size:10px;color:hsl(var(--hsl-c2,0 0% 70%));line-height:1.8}
      .oii-tooltip__legend-item{display:flex;gap:8px;align-items:center}
      .oii-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;box-shadow:0 0 4px currentColor}
      .oii-dot--ii-5{background:linear-gradient(135deg,#7fff00,#32cd32);box-shadow:0 0 6px #7fff00}
      .oii-dot--ii-4{background:linear-gradient(135deg,#adff2f,#9acd32);box-shadow:0 0 5px #adff2f}
      .oii-dot--ii-3{background:linear-gradient(135deg,#ffd700,#ffa500);box-shadow:0 0 5px #ffd700}
      .oii-dot--ii-2{background:linear-gradient(135deg,#ff8c00,#ff6347);box-shadow:0 0 5px #ff8c00}
      .oii-dot--ii-1{background:linear-gradient(135deg,#ff4500,#dc143c);box-shadow:0 0 5px #ff4500}
      .oii-dot--si-6{background:linear-gradient(135deg,#00ffff,#00bfff);box-shadow:0 0 6px #00ffff}
      .oii-dot--si-5{background:linear-gradient(135deg,#1e90ff,#4169e1);box-shadow:0 0 5px #1e90ff}
      .oii-dot--si-4{background:linear-gradient(135deg,#6a5acd,#7b68ee);box-shadow:0 0 5px #6a5acd}
      .oii-dot--si-3{background:linear-gradient(135deg,#9370db,#8a2be2);box-shadow:0 0 5px #9370db}
      .oii-dot--si-2{background:linear-gradient(135deg,#ba55d3,#9932cc);box-shadow:0 0 5px #ba55d3}
      .oii-dot--si-1{background:linear-gradient(135deg,#da70d6,#ff69b4);box-shadow:0 0 5px #da70d6}`;
    document.head.appendChild(style);
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

  // ==================== LEGACY / SHARED ====================

  createElement(ii, playtimeHours) {
    return this.createIIElement(ii, playtimeHours);
  },

  updateElement(ii, playtimeHours) {
    return this.updateIIElement(ii, playtimeHours);
  },

  findInjectionPoint() {
    for (const selector of [
      ".profile-detail__values--grid",
      ".profile-detail__values",
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
