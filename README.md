# osu! Improvement Indicator Plus (oii+)

<p align="center">
  <img src="icons/icon128.png" width="128" height="128" alt="oii+ logo">
</p>

<p align="center">
  <strong>Performance metrics for osu! player profiles</strong><br>
  Derived from analysis of 134,953 players with 250+ hours
</p>

<p align="center">
  <a href="#improvement-indicator-ii">II</a> •
  <a href="#skill-index-si">SI</a> •
  <a href="#installation">Install</a> •
  <a href="#features">Features</a> •
  <a href="#development">Dev</a>
</p>

---

## Improvement Indicator (II)

Measures how many hits you accumulate per hour compared to the average player.

$$\text{II} = \frac{\text{Expected Playtime}}{\text{Actual Playtime}}$$

Where expected playtime follows a power law:

$$\text{Expected Playtime} = a \times \text{Total Hits}^b$$

### Coefficients

| Mode         | $a$      | $b$    |
|--------------|----------|--------|
| osu!standard | 0.000734 | 0.8555 |
| osu!taiko    | 0.000680 | 0.8600 |
| osu!catch    | 0.000620 | 0.8650 |
| osu!mania    | 0.000580 | 0.8700 |

### Interpretation

| II Value | Meaning | $\sigma$ | Distribution |
|----------|---------|----------|--------------|
| $> 1.20$ | Exceptionally fast | $> +1.5\sigma$ | Top 7% |
| $1.07 - 1.20$ | Above average | $+0.5\sigma$ to $+1.5\sigma$ | Top 7-31% |
| $0.94 - 1.07$ | Average | $\pm 0.5\sigma$ | Middle 38% |
| $0.80 - 0.94$ | Below average | $-0.5\sigma$ to $-1.5\sigma$ | Bottom 7-31% |
| $< 0.80$ | Taking your time | $< -1.5\sigma$ | Bottom 7% |

---

## Skill Index (SI)

Measures skill efficiency — your PP relative to the expected PP for your playtime.

$$\text{SI} = \frac{\text{Your PP}}{\text{Expected PP}}$$

Where expected PP follows:

$$\text{Expected PP} = c \times \text{Playtime}^d$$

### Coefficients

| Mode         | $c$      | $d$    |
|--------------|----------|--------|
| osu!standard | 226.4153 | 0.4878 |
| osu!taiko    | 200.0000 | 0.5000 |
| osu!catch    | 180.0000 | 0.5200 |
| osu!mania    | 160.0000 | 0.5400 |

### Interpretation

| SI Value | Meaning |
|----------|---------|
| $> 2.0$ | Prodigy |
| $1.5 - 2.0$ | Gifted |
| $1.2 - 1.5$ | Skilled |
| $0.8 - 1.2$ | Average |
| $0.5 - 0.8$ | Developing |
| $< 0.5$ | Beginner |

---

## Installation

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json`

### Chrome / Edge / Brave

1. Open `chrome://extensions/` or `edge://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the folder

---

## Features

- **Profile Integration** — II and SI display directly in the osu! profile stats section
- **All Game Modes** — osu!standard, taiko, catch, mania
- **Calculator Popup** — Adjust playtime (positive or negative) to simulate scenarios
- **Goal Prediction** — Estimate playtime needed to reach a target PP
- **Live Detection** — Popup updates automatically when switching profiles
- **Persistent Display** — Survives page re-renders and Turbo navigation

---

## Usage

1. Install the extension
2. Visit any [osu! profile](https://osu.ppy.sh/users/2)
3. II and SI appear in the stats grid
4. Hover for tooltips, click extension icon for calculator

### Calculator

| Feature | Description |
|---------|-------------|
| Playtime Adjustment | Add/subtract hours to see adjusted II and SI |
| Goal PP | Enter target PP to see estimated time required |

---

## Project Structure

```
oii-plus/
├── manifest.json
├── scripts/
│   ├── config.js           # Coefficients and settings
│   ├── calculator.js       # II/SI math
│   ├── data-extractor.js   # Profile data parsing
│   ├── ui.js               # Element creation
│   └── content.js          # Injection logic
├── styles/
│   └── content.css
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── icons/
```

---

## Development

```bash
git clone https://github.com/Yaetrna/oii-plus.git
cd oii-plus
```

Load as unpacked extension, make changes, reload to test.

### Build

```bash
# Firefox
zip -r oii-plus.xpi . -x "*.git*" -x "*.md" -x "*.zip"

# Chrome
zip -r oii-plus.zip . -x "*.git*" -x "*.xpi"
```

---

## Contributing

1. Fork
2. Branch: `git checkout -b feature/name`
3. Commit and push
4. Open PR

---

## License

MIT — see [LICENSE](LICENSE)

---

<p align="center">
  <sub>
    Based on <a href="https://github.com/ferryhmm/oii">ferryhmm/oii</a><br>
    Not affiliated with osu! or ppy Pty Ltd
  </sub>
</p>
