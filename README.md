# Waveroute.pins

A fast, privacy-friendly browser extension for Chrome & Firefox that extracts Pinterest images in full original HD resolution (`/originals/`), lets you set custom download limits, exports `.zip` archives, and copies links directly for Figma.

---

## Why I Built This

Most existing Pinterest board downloaders have frustrating limitations:
- They force arbitrary download caps on free tiers or lock features behind subscriptions.
- They don't let you specify how many images you actually want to grab per board.
- They don't offer dark mode or clean Figma integration.

**Waveroute.pins** solves this with a clean, dark, Pinterest-inspired interface that runs 100% locally in your browser.

---

## Features

- **🎯 Quantity Limit Control**: Select preset limits (10, 25, 50, 100, All) or enter a custom amount. Auto-scrolling stops automatically when your limit is reached.
- **🔍 Full HD Originals**: Automatically converts preview thumbnails (`/236x/`, `/474x/`, `/736x/`) to Pinterest's maximum quality `/originals/` format.
- **📦 Single-Click ZIP Download**: Bundles all collected images into a `.zip` archive on your device without sending data to external servers.
- **📋 Copy for Figma**: One-click button to copy all original image URLs to your clipboard for instant pasting into Figma or moodboard plugins.
- **🌙 Pinterest-Style Dark UI**: Minimalist, responsive UI in dark charcoal and green (`#00c853`) with clean pill-shaped buttons and light mode toggle.
- **🔒 Zero Tracking**: Built with Manifest V3. No analytics, no accounts, no external tracking servers.

---

## Installation

### Load Unpacked (Developer Mode)

#### Google Chrome / Yandex / Brave / Edge:
1. Download or clone this repository.
2. Open `chrome://extensions/` in your browser.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the repository directory.

#### Mozilla Firefox:
1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on...**
3. Select `manifest.json` from the repository directory.

---

## How to Use

1. Open any Pinterest board, profile, or search page.
2. Click the **Waveroute.pins** extension icon in your browser toolbar.
3. Select your desired quantity limit.
4. Click **Start scan** to auto-scroll and collect high-res images.
5. Click **Download ZIP** to save your archive, or **Copy for Figma** to copy direct image links.

---

## Project Structure

```
pinterest-downloader-extension/
├── manifest.json            # Manifest V3 config (Chrome & Firefox fallback)
├── popup/
│   ├── popup.html           # Extension popup layout
│   ├── popup.css            # Pinterest-inspired dark theme styles
│   └── popup.js             # UI interactions & JSZip archive builder
├── content/
│   └── content_script.js    # Pinterest DOM scraper & auto-scroller
├── background/
│   └── background.js        # Service worker & image CORS downloader
├── lib/
│   └── jszip.min.js         # Client-side zip generation library
└── icons/                   # PNG & SVG icons (16, 48, 128, 512, logo.svg)
```

---

## License

[MIT](LICENSE)
