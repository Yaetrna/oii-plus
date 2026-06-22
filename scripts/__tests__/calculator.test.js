import { describe, it, expect } from 'vitest';

// ==================== SHARED HELPERS (pulled from calculator.js) ====================

const II_COEFFS = {
  osu: { a: 0.000734, b: 0.8555 },
  taiko: { a: 0.000680, b: 0.8600 },
  fruits: { a: 0.000620, b: 0.8650 },
  mania: { a: 0.000580, b: 0.8700 },
};

const SI_COEFFS = {
  osu: { c: 226.4153, d: 0.4878 },
  taiko: { c: 200.0, d: 0.50 },
  fruits: { c: 180.0, d: 0.52 },
  mania: { c: 160.0, d: 0.54 },
};

function iiCoef(mode) { return II_COEFFS[mode] || II_COEFFS.osu; }
function siCoef(mode) { return SI_COEFFS[mode] || SI_COEFFS.osu; }

function expectedPlaytime(totalHits, mode) {
  if (totalHits <= 0) return 0;
  const c = iiCoef(mode);
  return c.a * Math.pow(totalHits, c.b);
}

function calculateII(totalHits, playtimeHours, mode) {
  if (playtimeHours <= 0 || totalHits <= 0) return 0;
  return expectedPlaytime(totalHits, mode) / playtimeHours;
}

function getIIInterpretation(ii) {
  if (ii >= 1.5) return 'Very Active';
  if (ii >= 1.2) return 'Active';
  if (ii >= 0.8) return 'Average';
  if (ii >= 0.5) return 'Casual';
  return 'Very Casual';
}

function getIIColor(ii) {
  if (ii <= 0) return '#888';
  const minII = 0.3, maxII = 2.0;
  const clamped = Math.max(minII, Math.min(maxII, ii));
  let hue;
  if (clamped <= 1.0) {
    const t = (clamped - minII) / (1.0 - minII);
    hue = t * 60;
  } else {
    const t = (clamped - 1.0) / (maxII - 1.0);
    hue = 60 + t * 60;
  }
  return `hsl(${Math.round(hue)}, 100%, 50%)`;
}

function expectedPP(playtimeHours, mode) {
  if (playtimeHours <= 0) return 0;
  const c = siCoef(mode);
  return c.c * Math.pow(playtimeHours, c.d);
}

function calculateSI(pp, playtimeHours, mode) {
  if (playtimeHours <= 0 || pp <= 0) return 0;
  return pp / expectedPP(playtimeHours, mode);
}

function getSIInterpretation(si) {
  if (si >= 2.0) return 'Prodigy';
  if (si >= 1.5) return 'Gifted';
  if (si >= 1.2) return 'Skilled';
  if (si >= 0.8) return 'Average';
  if (si >= 0.5) return 'Developing';
  return 'Beginner';
}

function getSIColor(si) {
  if (si <= 0) return '#888';
  const minSI = 0.3, maxSI = 3.0;
  const clamped = Math.max(minSI, Math.min(maxSI, si));
  let hue;
  if (clamped <= 1.0) {
    const t = (clamped - minSI) / (1.0 - minSI);
    hue = 270 + t * 30;
  } else {
    const t = (clamped - 1.0) / (maxSI - 1.0);
    hue = 180 + (1 - t) * 90;
  }
  return `hsl(${Math.round(hue)}, 100%, 55%)`;
}

function predictPlaytimeForGoal(totalHits, currentPP, goalPP, currentPlaytimeHours, mode) {
  if (currentPlaytimeHours <= 0 || totalHits <= 0) return Infinity;
  const currentII = calculateII(totalHits, currentPlaytimeHours, mode);
  if (currentII <= 0) return Infinity;
  const ppRatio = goalPP / (currentPP || 1);
  const estimatedHitsAtGoal = totalHits * Math.pow(ppRatio, 1.2);
  return expectedPlaytime(estimatedHitsAtGoal, mode) / currentII;
}

function formatPlaytime(hours) {
  if (!isFinite(hours) || hours < 0) return '∞';
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  const minutes = Math.floor((hours % 1) * 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (remainingHours > 0 || days > 0) parts.push(`${remainingHours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '0h';
}

// ==================== TESTS ====================

describe('formatPlaytime', () => {
  it('returns "∞" for Infinity', () => expect(formatPlaytime(Infinity)).toBe('∞'));
  it('returns "∞" for negative hours', () => expect(formatPlaytime(-1)).toBe('∞'));
  it('returns "0h" for zero', () => expect(formatPlaytime(0)).toBe('0h'));
  it('formats minutes when < 1 hour', () => expect(formatPlaytime(0.5)).toBe('30m'));
  it('formats hours and minutes', () => expect(formatPlaytime(2.5)).toBe('2h 30m'));
  it('formats days and hours', () => expect(formatPlaytime(50)).toBe('2d 2h'));
  it('formats hours when no days', () => expect(formatPlaytime(5)).toBe('5h'));
});

describe('expectedPlaytime', () => {
  it('returns 0 for zero hits', () => expect(expectedPlaytime(0, 'osu')).toBe(0));
  it('returns positive for valid hits', () => {
    const r = expectedPlaytime(100000, 'osu');
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(Infinity);
  });
  it('scales with hits', () => {
    expect(expectedPlaytime(500000, 'osu')).toBeGreaterThan(expectedPlaytime(50000, 'osu'));
  });
  it('falls back to osu for unknown mode', () => {
    expect(expectedPlaytime(100000, 'unknown')).toBe(expectedPlaytime(100000, 'osu'));
  });
  it('uses different coefficients per mode', () => {
    expect(expectedPlaytime(100000, 'taiko')).not.toBe(expectedPlaytime(100000, 'osu'));
  });
});

describe('calculateII', () => {
  it('returns 0 for zero playtime', () => expect(calculateII(100000, 0, 'osu')).toBe(0));
  it('returns 0 for zero hits', () => expect(calculateII(0, 100, 'osu')).toBe(0));
  it('returns positive for valid inputs', () => {
    expect(calculateII(500000, 100, 'osu')).toBeGreaterThan(0);
  });
});

describe('getIIInterpretation', () => {
  it('Very Active >= 1.5', () => expect(getIIInterpretation(1.5)).toBe('Very Active'));
  it('Active 1.2-1.5', () => expect(getIIInterpretation(1.2)).toBe('Active'));
  it('Average 0.8-1.2', () => expect(getIIInterpretation(1.0)).toBe('Average'));
  it('Casual 0.5-0.8', () => expect(getIIInterpretation(0.5)).toBe('Casual'));
  it('Very Casual < 0.5', () => expect(getIIInterpretation(0)).toBe('Very Casual'));
});

describe('getIIColor', () => {
  it('grey for <= 0', () => expect(getIIColor(0)).toBe('#888'));
  it('hsl syntax for positive', () => { expect(getIIColor(0.65)).toMatch(/hsl\(\d+/); });
  it('0-60 hue for ii < 1', () => {
    const hue = parseInt(getIIColor(0.65).match(/hsl\((\d+)/)[1]);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThanOrEqual(60);
  });
  it('60-120 hue for ii >= 1', () => {
    const hue = parseInt(getIIColor(1.5).match(/hsl\((\d+)/)[1]);
    expect(hue).toBeGreaterThanOrEqual(60);
    expect(hue).toBeLessThanOrEqual(120);
  });
  it('~120 hue for ii >= 2', () => {
    const hue = parseInt(getIIColor(2.5).match(/hsl\((\d+)/)[1]);
    expect(hue).toBe(120);
  });
});

describe('expectedPP', () => {
  it('returns 0 for zero playtime', () => expect(expectedPP(0, 'osu')).toBe(0));
  it('returns positive for valid playtime', () => {
    expect(expectedPP(100, 'osu')).toBeGreaterThan(0);
  });
  it('falls back to osu mode', () => {
    expect(expectedPP(100, 'unknown')).toBe(expectedPP(100, 'osu'));
  });
});

describe('calculateSI', () => {
  it('returns 0 for zero playtime', () => expect(calculateSI(5000, 0, 'osu')).toBe(0));
  it('returns 0 for zero PP', () => expect(calculateSI(0, 100, 'osu')).toBe(0));
  it('> 1 when PP exceeds expected', () => expect(calculateSI(50000, 50, 'osu')).toBeGreaterThan(1));
  it('< 1 when PP below expected', () => expect(calculateSI(100, 1000, 'osu')).toBeLessThan(1));
});

describe('getSIInterpretation', () => {
  it('Prodigy >= 2.0', () => expect(getSIInterpretation(2.0)).toBe('Prodigy'));
  it('Gifted 1.5-2.0', () => expect(getSIInterpretation(1.5)).toBe('Gifted'));
  it('Skilled 1.2-1.5', () => expect(getSIInterpretation(1.3)).toBe('Skilled'));
  it('Average 0.8-1.2', () => expect(getSIInterpretation(1.0)).toBe('Average'));
  it('Developing 0.5-0.8', () => expect(getSIInterpretation(0.6)).toBe('Developing'));
  it('Beginner < 0.5', () => expect(getSIInterpretation(0)).toBe('Beginner'));
});

describe('getSIColor', () => {
  it('grey for <= 0', () => expect(getSIColor(0)).toBe('#888'));
  it('returns hsl for positive', () => expect(getSIColor(1.0)).toMatch(/hsl\(\d+/));
  it('270-300 hue for si < 1', () => {
    expect(parseInt(getSIColor(0.6).match(/hsl\((\d+)/)[1])).toBeGreaterThanOrEqual(270);
  });
  it('180-270 hue for si >= 1', () => {
    expect(parseInt(getSIColor(2.0).match(/hsl\((\d+)/)[1])).toBeLessThanOrEqual(270);
  });
});

describe('predictPlaytimeForGoal', () => {
  it('Infinity for zero playtime', () => {
    expect(predictPlaytimeForGoal(100000, 5000, 6000, 0, 'osu')).toBe(Infinity);
  });
  it('Infinity for zero hits', () => {
    expect(predictPlaytimeForGoal(0, 5000, 6000, 100, 'osu')).toBe(Infinity);
  });
  it('finite positive for valid inputs', () => {
    expect(predictPlaytimeForGoal(500000, 5000, 6000, 100, 'osu')).toBeGreaterThan(0);
  });
  it('higher goal needs more time', () => {
    const low = predictPlaytimeForGoal(500000, 5000, 5500, 100, 'osu');
    const high = predictPlaytimeForGoal(500000, 5000, 8000, 100, 'osu');
    expect(high).toBeGreaterThan(low);
  });
});