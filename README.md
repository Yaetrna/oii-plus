# osu! Improvement Indicator Plus (oii+)

<p align="center">
  <img src="icons/icon128.png" width="128" height="128" alt="oii+ logo">
</p>

<p align="center">
  <strong>A browser extension that displays the improvement speed of a player on their osu! profile.</strong>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#development">Development</a>
</p>

---

## What is the Improvement Indicator?

The **Improvement Indicator (II)** is a metric that compares your improvement speed to the average osu! player.

Trained on 250,000+ players using machine learning.

| II Value | Meaning | $\sigma$ | % of Players |
|----------|---------|----------|--------------|
| $> 1.20$ | Exceptionally fast | $> +1.5\sigma$ | Top 7% |
| $1.07 - 1.20$ | Above average | $+0.5\sigma$ to $+1.5\sigma$ | Top 7-31% |
| $0.94 - 1.07$ | Average | $\pm 0.5\sigma$ | Middle 38% |
| $0.80 - 0.94$ | Below average | $-0.5\sigma$ to $-1.5\sigma$ | Bottom 7-31% |
| $< 0.80$ | Taking your time | $< -1.5\sigma$ | Bottom 7% |

---

## Installation

### Firefox (Development)

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file

### Chromium

1. Download and unzip the latest release
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the unzipped folder

---

## Features

- Automatic II display on any osu! profile
- ~~Supports all game modes (osu!, taiko, catch, mania)~~ v2 for osu! fallback for the other gamemodes.
- Calculator for untracked playtime and goal PP prediction
- Should work on Firefox, Chrome, Edge, and Brave (didn't check Chromium based browsers yet)

---

## How It Works

The II is calculated as:

$$\text{II} = \frac{\text{Expected Playtime}}{\text{Actual Playtime}}$$

### Primary Model: Total Hits (98% accuracy)

The expected playtime is calculated using a Power Law model trained on 250,000+ osu! players:

$$\text{Expected Playtime} = 0.000545 \times \text{Total Hits}^{0.8737}$$

This achieves $R^2 = 0.98$ because Total Hits directly measures how much you've actually played.

### Fallback Model: PP-Based (64% accuracy)

If Total Hits isn't available, the extension uses a quadratic model:

$$\text{Expected Playtime} = a + b \cdot \text{PP} + c \cdot \text{PP}^2$$

| Mode | $a$ | $b$ | $c$ |
|------|-----|-----|-----|
| osu! | $-148.83$ | $0.1442$ | $-3.83 \times 10^{-7}$ |
| Taiko | $-0.159$ | $8.91 \times 10^{-3}$ | $3.29 \times 10^{-6}$ |
| Mania | $0.227$ | $0.0306$ | $1.07 \times 10^{-6}$ |
| Catch | $-4.63$ | $0.0564$ | $2.11 \times 10^{-6}$ |

---

## Usage

1. Install the extension
2. Visit any osu! player profile (e.g. [Me](https://osu.ppy.sh/users/14893688))
3. The II value appears next to Medals, PP, and Total Play Time
4. Hover over the value to see the legend
5. Click the extension icon to access the calculator

---

## Development

### Project Structure

```
oii-plus/
├── manifest.json        # Extension manifest (v3)
├── scripts/
│   └── content.js       # Content script - injects II on profiles
├── styles/
│   └── content.css      # Styles for injected elements
├── popup/
│   ├── popup.html       # Popup UI structure
│   ├── popup.css        # Popup styles
│   └── popup.js         # Popup logic
├── icons/               # Extension icons
├── LICENSE              # MIT License
└── README.md
```

### Local Development

```bash
git clone https://github.com/Yaetrna/oii-plus.git
cd oii-plus
# Load in browser (see Installation above)
# Make changes, then reload the extension to test
```

### Building

Firefox:
```bash
zip -r oii-plus.xpi . -x "*.git*" -x "*.md"
```

Chrome:
```bash
zip -r oii-plus.zip . -x "*.git*"
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/something`)
3. Commit changes (`git commit -m 'Add something'`)
4. Push to branch (`git push origin feature/something`)
5. Open a Pull Request

---

## License

MIT License. See [LICENSE](LICENSE).

---

## Credits

- Original concept by [ferryhmm](https://github.com/ferryhmm/oii)
- ML model trained on 250,000+ players

<p align="center">
  <sub>Not affiliated with osu! or ppy Pty Ltd</sub>
</p>
