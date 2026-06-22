"use strict";

const oiiDataExtractor = {
  getCurrentMode() {
    const match = location.pathname.match(
      /\/users\/\d+\/(osu|taiko|fruits|mania)/
    );
    return match ? match[1] : "osu";
  },

  getFromDataAttributes() {
    const elements = document.querySelectorAll("[data-initial-data]");
    for (const el of elements) {
      try {
        const data = JSON.parse(el.getAttribute("data-initial-data"));
        if (!data?.user?.statistics) continue;
        const stats = data.user.statistics;
        return {
          pp: stats.pp,
          playTimeSeconds: stats.play_time,
          totalHits: stats.total_hits || 0,
          playCount: stats.play_count || 0,
          accuracy: stats.hit_accuracy || 0,
          rankedScore: stats.ranked_score || 0,
          username: data.user.username,
          mode: data.current_mode || this.getCurrentMode(),
        };
      } catch {
        /* continue */
      }
    }
    return null;
  },

  parseFromVisibleContent() {
    const titleMatch = document.title.match(/^(.+?)\s*[·|\-]/);
    const username = titleMatch ? titleMatch[1].trim() : "Unknown";
    const pageText = document.body.innerText;

    const ppMatch = pageText.match(/pp\s*([0-9,]+)|([0-9,]+)\s*pp/i);
    const pp = ppMatch
      ? parseInt((ppMatch[1] || ppMatch[2]).replace(/,/g, ""))
      : null;

    // Match playtime in any format: Xd Yh Zm, Yh Zm, Zm, Xd, Xd Yh, etc.
        const dMatch = pageText.match(/(\d+)\s*d\b/);
        const hMatch = pageText.match(/(\d+)\s*h\b/);
        const mMatch = pageText.match(/(\d+)\s*m\b/);
        const days = dMatch ? parseInt(dMatch[1]) : 0;
        const hours = hMatch ? parseInt(hMatch[1]) : 0;
        const minutes = mMatch ? parseInt(mMatch[1]) : 0;
        const playTimeSeconds = (days || hours || minutes)
          ? days * 86400 + hours * 3600 + minutes * 60
          : null;

    const hitsMatch = pageText.match(/Total\s*Hits\s*([0-9,]+)/i);
    const totalHits = hitsMatch ? parseInt(hitsMatch[1].replace(/,/g, "")) : 0;

    if (!pp || pp <= 0 || !playTimeSeconds || playTimeSeconds <= 0) return null;

    return {
      pp,
      playTimeSeconds,
      totalHits,
      playCount: 0,
      accuracy: 0,
      rankedScore: 0,
      username,
      mode: this.getCurrentMode(),
    };
  },

  getData() {
    return this.getFromDataAttributes() || this.parseFromVisibleContent();
  },

  async waitForData(maxWaitTime = oiiConfig.timing.maxWaitTime) {
    const { checkInterval } = oiiConfig.timing;
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      const data = this.getFromDataAttributes();
      if (data?.pp && data?.playTimeSeconds) return true;
      await new Promise((r) => setTimeout(r, checkInterval));
    }
    return false;
  },
};
