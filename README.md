# osu! Improvement Indicator Plus (oii+)

A browser extension that displays performance metrics on osu! player profiles.

**Version:** 6.0.0

---

## Overview

oii+ provides two key metrics derived from analysis of 134,953 osu! players with 250+ hours of playtime:

1. **Improvement Indicator (II)** - Activity efficiency metric showing how efficiently you accumulate hits per hour
2. **Skill Index (SI)** - Skill efficiency metric showing your PP relative to expected PP for your playtime

---

## Improvement Indicator (II)

The II compares your improvement speed to the average player.

**Formula:**
```
II = Expected Playtime / Actual Playtime
Expected Playtime = a × Total Hits^b
```

### Coefficients by Game Mode

| Mode           | a        | b      |
|----------------|----------|--------|
| osu!standard   | 0.000734 | 0.8555 |
| osu!taiko      | 0.000680 | 0.8600 |
| osu!catch      | 0.000620 | 0.8650 |
| osu!mania      | 0.000580 | 0.8700 |

### Interpretation

| II Value      | Meaning            | Standard Deviation | Distribution  |
|---------------|--------------------|--------------------|---------------|
| > 1.20        | Exceptionally fast | > +1.5σ            | Top 7%        |
| 1.07 - 1.20   | Above average      | +0.5σ to +1.5σ     | Top 7-31%     |
| 0.94 - 1.07   | Average            | ±0.5σ              | Middle 38%    |
| 0.80 - 0.94   | Below average      | -0.5σ to -1.5σ     | Bottom 7-31%  |
| < 0.80        | Taking your time   | < -1.5σ            | Bottom 7%     |

---

## Skill Index (SI)

The SI measures PP efficiency relative to playtime.

**Formula:**
```
SI = Your PP / Expected PP
Expected PP = c × Playtime Hours^d
```

### Coefficients by Game Mode

| Mode           | c        | d      |
|----------------|----------|--------|
| osu!standard   | 226.4153 | 0.4878 |
| osu!taiko      | 200.0000 | 0.5000 |
| osu!catch      | 180.0000 | 0.5200 |
| osu!mania      | 160.0000 | 0.5400 |

### Interpretation

| SI Value      | Meaning    |
|---------------|------------|
| > 2.0         | Prodigy    |
| 1.5 - 2.0     | Gifted     |
| 1.2 - 1.5     | Skilled    |
| 0.8 - 1.2     | Average    |
| 0.5 - 0.8     | Developing |
| < 0.5         | Beginner   |

---

## Installation

### Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from the extension folder

### Chrome / Edge / Brave

1. Navigate to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked"
4. Select the extension folder

---

## Features

- Displays II and SI directly on osu! profile pages
- Supports all game modes (osu!standard, taiko, catch, mania)
- Interactive popup with calculator features:
  - Adjust playtime (supports negative values to view past performance)
  - Calculate both adjusted II and SI
  - Predict playtime needed to reach goal PP
  - Automatically detects profile changes without requiring reload
- Persistent injection that survives page re-renders
- Compatible with Firefox, Chrome, Edge, and Brave

---

## Usage

1. Install the extension
2. Visit any osu! profile (example: [peppy](https://osu.ppy.sh/users/2))
3. II and SI values appear in the profile statistics section
4. Hover over values to see detailed tooltips with interpretations
5. Click the extension icon to access the calculator popup

### Calculator Features

**Playtime Adjustment:**
- Add hours to account for offline play or other clients
- Use negative values to see what your indices would have been at earlier points in time
- Both II and SI adjust automatically

**Goal PP Prediction:**
- Enter a target PP value
- See estimated total playtime needed
- Shows additional hours required beyond current playtime

---

## Project Structure

```
oii-plus/
├── manifest.json          # Extension manifest (Manifest V3)
├── scripts/
│   ├── config.js          # Configuration and coefficients
│   ├── calculator.js      # II and SI calculation logic
│   ├── data-extractor.js  # Profile data extraction
│   ├── ui.js              # UI element creation and styling
│   └── content.js         # Main content script with injection logic
├── styles/
│   └── content.css        # Styles for injected profile elements
├── popup/
│   ├── popup.html         # Popup UI structure
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup logic and event handlers
├── icons/                 # Extension icons (16, 32, 48, 128, 512)
├── LICENSE                # MIT License
└── README.md
```

---

## Technical Details

### Data Extraction
- Primary: Parses `data-initial-data` attributes from page DOM
- Fallback: Text parsing from visible page content
- Uses MutationObserver for efficient detection of dynamic content loading

### Injection Strategy
- Waits for profile statistics container before injecting
- DOM observer monitors for page re-renders and reinjects as needed
- Handles Turbo navigation (osu!'s SPA framework)
- Supports browser back/forward navigation

### Popup Communication
- Message passing between popup and content script via browser APIs
- 500ms polling to detect profile changes automatically
- Retry logic for content script readiness
- Works with both Firefox (browser API) and Chrome (chrome API)

---

## Development

### Prerequisites
- Modern browser with extension developer mode
- Git for version control

### Setup

```bash
git clone https://github.com/Yaetrna/oii-plus.git
cd oii-plus
```

Load the extension following the installation instructions above. After making changes, reload the extension to test.

### Building for Distribution

**Firefox (.xpi):**
```bash
zip -r oii-plus.xpi . -x "*.git*" -x "*.md" -x "*.zip"
```

**Chrome (.zip):**
```bash
zip -r oii-plus.zip . -x "*.git*" -x "*.xpi"
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/description`
3. Commit your changes: `git commit -m 'Add feature description'`
4. Push to the branch: `git push origin feature/description`
5. Open a Pull Request

---

## License

MIT License. See [LICENSE](LICENSE) file for details.

---

## Credits

- Original concept: [ferryhmm/oii](https://github.com/ferryhmm/oii)
- Data analysis and ML models: Yaetrna
- Dataset: 134,953 osu! players with 250+ hours playtime

**Not affiliated with osu! or ppy Pty Ltd**
