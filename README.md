# 🌌 SpaceClean

<div align="center">

<img src="public/icon.png" width="128" height="128" alt="SpaceClean Logo" style="border-radius: 28px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />

### **Next-Generation, Ultra-Fast Visual Disk Space Analyzer & Deep Cleaner**
*Crafted with precision by **Aneesh Gupta***

[![Release](https://img.shields.io/github/v/release/AndyDev94/SpaceClean?style=for-the-badge&color=blue&logo=github)](https://github.com/AndyDev94/SpaceClean/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-3b82f6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/AndyDev94/SpaceClean/releases)
[![Electron](https://img.shields.io/badge/Electron-34-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

[**Download Releases**](#-native-cross-platform-installers) • [**All 9 Modes**](#-the-9-specialized-modes) • [**What's New in v3.0**](#-whats-new-in-v300) • [**Keyboard Shortcuts**](#-keyboard-shortcuts) • [**Architecture**](#-architecture)

</div>

---

## 📖 Overview

**SpaceClean** is a privacy-first, memory-optimized desktop storage suite for **Windows, macOS, and Linux**. Unlike traditional disk utilities that freeze when scanning multi-terabyte drives or dump endless walls of text, SpaceClean features an intelligent **Smart RAM Optimizer**, a **9-Mode Cleaning Suite**, **Cryptographic Duplicate Matching**, **Heuristic Threat Detection**, and **Hardware-Accelerated Live Media Previews**.

Scan any folder or full disk (from **50 GB to 4 TB+**) with near-zero memory footprint, isolate forgotten space hogs across chronological time waves, and safely reclaim gigabytes with native Recycle Bin / Trash protection.

---

## 🚀 The 9 Specialized Modes

| # | Mode | Description |
| :-: | :--- | :--- |
| **1** | 📄 **Files Explorer** | Paginated table explorer with real-time multi-field search, file-type filters, and date ranges. |
| **2** | 📁 **Folder Explorer** | Interactive directory hierarchy tree revealing the heaviest folder consumers with subfolder search & date sorting. |
| **3** | ⚡ **Smart Optimizer** | Memory-efficient chunk milestones (5k-file parts) and Chronological Time Waves (Year slices). |
| **4** | 🧹 **Junk Cleaner** | 1-click safe cleanup for temporary cache files, shader caches, log dumps, and crash data. |
| **5** | 🔍 **Duplicate Finder** | Exact MD5 cryptographic clone matching with New/Old date sorting, side-by-side preview, and *Keep Both* protection. |
| **6** | 🐘 **Large Files** | Visualizer for the Top 100 heaviest space hogs (>100MB, >1GB, >10GB). |
| **7** | 🛡️ **Threat Detector** | Heuristic scanner for camouflaged binaries (`.pdf.exe`), ransomware file-lock patterns, and 1-click **VirusTotal** cloud intelligence. |
| **8** | 🎥 **Media Gallery** | Visual photo, screenshot, and video grid with hardware-accelerated live video thumbnail frames and inline player. |
| **9** | 🚀 **Apps Uninstaller** | Batch multi-select application uninstaller showing disk footprints and clean uninstallation without conflicts. |

---

## 🌟 What's New in v3.0.0

* **🔍 Duplicate Finder Multi-Field Sorting**: Added 1-click sorting to organize duplicate groups by **Date (Newest ↔ Oldest)**, **Waste Size**, **Copies Count**, and **Alphabetical Name**.
* **🛡️ Threats Mode RAM Navigation**: Embedded milestone part-by-part scanning and queue continuation directly inside Threat Detection Mode.
* **🛡️ 1-Click Threat Whitelist**: Added `[ 🛡️ Ignore All (Trust All) ]` with persistent whitelist storage and instant `[ 🔄 Restore All Alerts ]`.
* **🎥 Live Video Thumbnail Frames**: Hardware-accelerated native HTML5 video frame extraction seeking directly to representative frames (`1.0s` / `0.1s`).
* **🎨 Universal High-Contrast Theme Redesign**: Elevated segmented pill containers across all 9 modes ensuring crisp visibility in Light Mode, Solarized Light, Dark Modern, and Obsidian themes.
* **📜 Multi-Version Changelog**: Scrollable release history preserving v3.0.0, v2.0.0, and v1.0.0 notes in the in-app Settings modal.

---

## ⌨️ Keyboard Shortcuts

SpaceClean provides full keyboard navigation:

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+1` – `Ctrl+9` *(or `Alt+1` – `Alt+9`)* | Quick-switch between all 9 cleaning modes |
| `↑` / `↓` **(Arrow Keys)** | Navigate file rows; updates the live preview drawer instantly |
| `Spacebar` | Toggle checkbox selection for active row |
| `Enter` | Open file / inspect in native OS file manager |
| `Delete` | Open Safe Delete Confirmation modal |
| `Esc` | Close modals, close preview drawer, or clear search focus |
| `Ctrl+A` / `Cmd+A` | Select all files in active view |
| `Ctrl+D` / `Cmd+D` | Deselect all files |
| `Ctrl+F` or `/` | Focus search filter input |
| `Tab` / `Shift+Tab` | Accessible keyboard focus navigation |

---

## 📦 Native Cross-Platform Installers

Download precompiled binaries directly from [GitHub Releases](https://github.com/AndyDev94/SpaceClean/releases/latest):

* **Windows**: `SpaceClean-Setup.exe` (NSIS Installer) & `SpaceClean.exe` (Portable)
* **macOS**: `SpaceClean.dmg` (Apple Silicon & Intel)
* **Linux**: `SpaceClean.AppImage` & `spaceclean_3.0.0_amd64.deb`

### Building from Source

```bash
# Clone the repository
git clone https://github.com/AndyDev94/SpaceClean.git
cd SpaceClean

# Install dependencies
npm install

# Start in Development Mode
npm run dev

# Compile Production Build
npm run build

# Package Native Installers
npm run package:win    # Windows Setup .exe
npm run package:mac    # macOS .dmg
npm run package:linux  # Linux .AppImage & .deb
npm run package:all    # All three platforms
```

---

## 🏗️ Architecture

```
SpaceClean/
├── electron/
│   ├── main.ts               # Electron main process, IPC bridges, auto-updater & protocols
│   ├── preload.ts            # Secure contextBridge API bindings
│   └── scanner.ts            # High-speed directory scanner, chunk queue session & junk rules
├── src/
│   ├── components/
│   │   ├── TitleBar.tsx              # Frameless titlebar with window controls & branding
│   │   ├── Navbar.tsx                # Drive selector, 9-mode navigation & theme switcher
│   │   ├── StatsOverview.tsx         # Real-time storage metrics & breakdown charts
│   │   ├── FileTable.tsx             # Paginated storage explorer with live preview
│   │   ├── FilePreviewDrawer.tsx     # Hardware-accelerated media, video player & code inspector
│   │   ├── SmartFolderCleanup.tsx    # RAM Optimizer & Chronological Time Waves
│   │   ├── FolderExplorer.tsx        # Interactive directory tree & folder consumer hierarchy
│   │   ├── JunkCleaner.tsx           # 1-click system junk, logs, and cache cleaner
│   │   ├── DuplicateFinder.tsx       # MD5 clone detection, New/Old date sorting & Keep Both
│   │   ├── LargeFilesView.tsx        # Top 100 space hogs visualizer
│   │   ├── ThreatDetector.tsx        # Disguised malware heuristics & VirusTotal verification
│   │   ├── MediaGallery.tsx          # Hardware-accelerated visual photo/video grid
│   │   ├── AppsUninstaller.tsx       # Multi-select batch software uninstaller
│   │   ├── SettingsModal.tsx         # Multi-version changelog, update checker & guide
│   │   └── DeleteModal.tsx           # High-contrast safe deletion confirmation
│   ├── styles/
│   │   ├── app.css                   # Master design system & component styles
│   │   └── themes.css                # Curated high-contrast dark and light themes
│   ├── types/
│   │   └── index.ts                  # TypeScript definitions & data models
│   ├── App.tsx                       # Global state coordinator & keyboard shortcuts
│   └── main.tsx                      # React root bootstrap
├── package.json                      # Scripts & electron-builder packaging configuration
└── vite.config.ts                    # Vite + Electron build configuration
```

---

## 🔒 Privacy & Safety Guarantee

* **100% Local & Offline**: All directory scanning, file size computations, and MD5 hash calculations happen entirely on your computer. Zero telemetry, zero tracking, zero data harvesting.
* **Kernel & OS Shield**: Critical system folders (`C:\Windows`, `System32`, `/System`, `/usr`, `/bin`, `/boot`) are permanently protected from deletion.
* **Recycle Bin by Default**: All file deletions move items to your operating system's native Recycle Bin / Trash with full restoration support.

---

## 👨‍💻 Author

Developed with ❤️ by **Aneesh Gupta** ([@AndyDev94](https://github.com/AndyDev94))  
Feel free to open [Issues](https://github.com/AndyDev94/SpaceClean/issues) or submit Pull Requests to contribute!

---

## 📄 License

SpaceClean is open-source software licensed under the [MIT License](LICENSE).
