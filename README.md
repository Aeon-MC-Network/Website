# AeonMC Website

[![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20TailwindCSS%20%7C%20JS-indigo)](https://aeonmc.com)
[![Status](https://img.shields.io/badge/Hosting-Cloudflare%20Pages%20%2F%20GitHub%20Pages-emerald)](https://aeonmc.com)

Official landing page for **AeonMC** — A modern, high-performance Minecraft server network.

## 🚀 Stack & Technologies

- **Core**: HTML5 & Vanilla JavaScript
- **Styling**: Tailwind CSS (via CDN)
- **Theme**: Dark Gaming / Modern Web3 & Server Aesthetic (`#020617` Slate-950, Indigo-500, Glassmorphism backdrop-blur)
- **Deployment**: Compatible with Cloudflare Pages & GitHub Pages
- **Live Telemetry**: Async player count query from `api.mcsrvstat.us/3/play.aeonmc.com` with fallback to `api.mcstatus.io`

---

## ⚡ Features

1. **One-Click Server IP Copy**:
   - Copies `play.aeonmc.com` to clipboard instantly.
   - Transitions button to **"Copied!"** with emerald green feedback for 2 seconds.

2. **Live Server Telemetry Status**:
   - Dynamic pulsing online/offline indicator dot (Emerald green for Online, Rose red for Offline).
   - Real-time online player count fetcher (`X / 2000 Players`).

3. **Links & Navigation**:
   - Tebex Webstore: `https://aeon-mc.tebex.store`
   - Vote Portal: `https://vote.aeonmc.com`

---

## 🌐 Deployment to GitHub Pages

1. Push all code to the `main` branch.
2. In GitHub, go to **Settings** > **Pages**.
3. Under **Source**, select `Deploy from a branch` -> `main` -> `/ (root)`.
4. Save — your page will be live at `https://aeon-mc-network.github.io/Website/` or your custom domain `aeonmc.com`.
