# osu! Improvement Indicator Plus (oii+)

<p align="center">
  <img src="icons/icon128.png" width="128" height="128" alt="oii+ logo">
</p>

<p align="center">
  <strong>An ML-powered browser extension that displays your improvement speed on osu! player profiles.</strong>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#development">Development</a>
</p>

---

## 📖 What is the Improvement Indicator?

The **Improvement Indicator (II)** is a metric that compares your improvement speed to the average osu! player. It answers the question: *"Am I improving faster or slower than most players?"*

| II Value | Meaning | Sigma | % of Players |
|----------|---------|-------|---------------|
| > 1.20x | Exceptionally fast | > +1.5σ | Top 7% |
| 1.07x - 1.20x | Above average | +0.5σ to +1.5σ | Top 7-31% |
| 0.94x - 1.07x | Average | ±0.5σ | Middle 38% |
| 0.80x - 0.94x | Below average | -0.5σ to -1.5σ | Bottom 7-31% |
| < 0.80x | Taking your time | < -1.5σ | Bottom 7% |

---

## 🚀 Installation

### Firefox

1. Download the latest release from [Releases](https://github.com/Yaetrna/oii-plus/releases)
2. Open Firefox and go to `about:addons`
3. Click the gear icon → "Install Add-on From File..."
4. Select the downloaded `.xpi` file

**Or for development:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file

### Chrome / Edge / Brave

1. Download and unzip the latest release
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the unzipped folder

---

## ✨ Features

- **🎯 Automatic II Display** - Shows improvement indicator on any osu! profile
- **🎮 All Game Modes** - Supports osu!standard, taiko, catch, and mania
- **🎨 Color-coded Values** - Visual feedback with intuitive colors
- **📊 Calculator** - Add untracked playtime, predict time to goal PP
- **💬 Custom Tooltip** - Hover for detailed explanation
- **🌐 Cross-browser** - Works on Firefox, Chrome, Edge, and Brave

---

## 🔬 How It Works

The II is calculated using the formula:

```
II = Expected Playtime / Actual Playtime
```

### v2.0 - ML-Powered Model (98% Accuracy)

The expected playtime is now calculated using **Total Hits** with a Power Law model, trained on **250,000+ osu! players**:

```
Expected Playtime = 0.000545 × Total Hits^0.8737
```

This model achieves **98% accuracy (R²)** because Total Hits directly measures how much you've actually played.

### Fallback: PP-Based Model (64% Accuracy)

If Total Hits isn't available, the extension falls back to a PP-based quadratic model:

```
Expected Playtime = a + b × PP + c × PP²
```

| Mode | a | b | c |
|------|---|---|---|
| osu! | -148.83 | 0.1442 | -3.83×10⁻⁷ |
| Taiko | -0.159 | 8.91×10⁻³ | 3.29×10⁻⁶ |
| Mania | 0.227 | 0.0306 | 1.07×10⁻⁶ |
| Catch | -4.63 | 0.0564 | 2.11×10⁻⁶ |

---

## 🎮 Usage

1. Install the extension
2. Visit any osu! player profile (e.g., `https://osu.ppy.sh/users/12345`)
3. The **II value** appears next to Medals, PP, and Total Play Time
4. **Hover** over the value to see the legend
5. **Click the extension icon** to access the calculator

---

## 🛠️ Development

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
├── icons/               # Extension icons (16, 32, 48, 128px)
├── LICENSE              # MIT License
└── README.md
```

### Local Development

```bash
# Clone the repo
git clone https://github.com/Yaetrna/oii-plus.git
cd oii-plus

# Load in browser (see Installation above)
# Make changes, then reload the extension to test
```

### Building for Production

**Firefox (.xpi):**
```bash
cd oii-plus
zip -r ../oii-plus.xpi . -x "*.git*" -x "*.md" -x "*.htm*"
```

**Chrome (.zip):**
```bash
cd oii-plus
zip -r ../oii-plus-chrome.zip . -x "*.git*" -x "*.htm*"
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙏 Credits

- Original concept by [ferryhmm](https://github.com/ferryhmm/oii)
- v2.0 ML model trained on 250,000+ players
- Built with ❤️ for the osu! community

---

<p align="center">
  <sub>Not affiliated with osu! or ppy Pty Ltd</sub>
</p>
