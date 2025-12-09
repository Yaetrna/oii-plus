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
      .profile-detail__values--grid{grid-template-columns:repeat(5,1fr)!important}
      .profile-detail__values{gap:15px}
      #${oiiConfig.elementIds.iiElement}{position:relative}
      #${oiiConfig.elementIds.iiElement} .value-display__value{transition:all .2s ease}
      #${oiiConfig.elementIds.iiElement}:hover .value-display__value{filter:brightness(1.2)}
      .oii-tooltip{visibility:hidden;opacity:0;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:hsl(var(--hsl-b2,260 10% 15%));border:1px solid hsl(var(--hsl-b4,260 10% 30%));border-radius:6px;padding:10px 12px;width:max-content;max-width:250px;z-index:1000;transition:opacity .2s,visibility .2s;pointer-events:none;margin-bottom:8px;box-shadow:0 4px 12px rgba(0,0,0,.4)}
      .oii-tooltip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:hsl(var(--hsl-b4,260 10% 30%))}
      #${oiiConfig.elementIds.iiElement}:hover .oii-tooltip{visibility:visible;opacity:1}
      .oii-tooltip__title{font-weight:700;font-size:13px;color:hsl(var(--hsl-c1,0 0% 100%));margin-bottom:6px}
      .oii-tooltip__desc{font-size:11px;color:hsl(var(--hsl-c2,0 0% 70%));margin-bottom:8px}
      .oii-tooltip__legend{font-size:11px;color:hsl(var(--hsl-c2,0 0% 70%));line-height:1.6}
      .oii-tooltip__legend-item{display:flex;gap:6px;align-items:center}
      .oii-tooltip__legend-icon--up{color:#60f000}
      .oii-tooltip__legend-icon--mid{color:#f0c000}
      .oii-tooltip__legend-icon--down{color:#f04000}`;
    document.head.appendChild(style);
  },

  createTooltip_() {
    const tooltip = document.createElement("div");
    tooltip.className = "oii-tooltip";

    const title = document.createElement("div");
    title.className = "oii-tooltip__title";
    title.textContent = "Improvement Indicator";

    const desc = document.createElement("div");
    desc.className = "oii-tooltip__desc";
    desc.textContent = "Compares your improvement speed to the average player.";

    const legend = document.createElement("div");
    legend.className = "oii-tooltip__legend";

    [
      {
        icon: "▲▲",
        cls: "oii-tooltip__legend-icon--up",
        text: "> 1.5x → Very Fast",
      },
      {
        icon: "▲",
        cls: "oii-tooltip__legend-icon--up",
        text: "1.2-1.5x → Fast",
      },
      {
        icon: "●",
        cls: "oii-tooltip__legend-icon--mid",
        text: "0.8-1.2x → Average",
      },
      {
        icon: "▼",
        cls: "oii-tooltip__legend-icon--down",
        text: "0.5-0.8x → Slow",
      },
      {
        icon: "▼▼",
        cls: "oii-tooltip__legend-icon--down",
        text: "< 0.5x → Very Slow",
      },
    ].forEach((item) => {
      const row = document.createElement("div");
      row.className = "oii-tooltip__legend-item";
      const iconSpan = document.createElement("span");
      iconSpan.className = item.cls;
      iconSpan.textContent = item.icon;
      row.appendChild(iconSpan);
      row.appendChild(document.createTextNode(` ${item.text}`));
      legend.appendChild(row);
    });

    tooltip.append(title, desc, legend);
    return tooltip;
  },

  createElement(ii, playtimeHours) {
    const container = document.createElement("div");
    container.id = oiiConfig.elementIds.iiElement;
    container.className = "value-display value-display--plain";

    const displayValue =
      ii > 0 && playtimeHours > 0 ? `${ii.toFixed(2)}x` : "-";
    const color = oiiCalculator.getColor(ii);

    const labelDiv = document.createElement("div");
    labelDiv.className = "value-display__label";
    labelDiv.textContent = "ii";

    const valueDiv = document.createElement("div");
    valueDiv.className = "value-display__value";
    valueDiv.style.cssText = `color:${color};text-shadow:0 0 10px ${color};cursor:help`;
    valueDiv.textContent = displayValue;

    container.append(labelDiv, valueDiv, this.createTooltip_());
    return container;
  },

  updateElement(ii, playtimeHours) {
    const container = document.getElementById(oiiConfig.elementIds.iiElement);
    const valueDiv = container?.querySelector(".value-display__value");
    if (!valueDiv) return false;

    const displayValue =
      ii > 0 && playtimeHours > 0 ? `${ii.toFixed(2)}x` : "-";
    const color = oiiCalculator.getColor(ii);
    valueDiv.textContent = displayValue;
    valueDiv.style.color = color;
    valueDiv.style.textShadow = `0 0 10px ${color}`;
    return true;
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
    document
      .querySelectorAll(`#${oiiConfig.elementIds.iiElement}`)
      .forEach((el) => el.remove());
  },
};
