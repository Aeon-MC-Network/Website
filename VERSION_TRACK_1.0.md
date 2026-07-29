# AeonMC Network - Version Tracker

- **Current Version**: 1.0.5
- **Track Name**: Version Track 1.0
- **Deployment Platform**: Vercel & GitHub Pages
- **Database Backend**: Bloom MySQL (`s119339_Aeonweb`)
- **Last Updated**: 2026-07-29T14:13:50-05:00

---

## Release & Version Change History

### 🚀 Version Track 1.0.5 - Image Asset Stage Verification (2026-07-29)
- **Logo Asset Verification**: Verified and force-staged `assets/img/62b8530f-faae-4c33-899f-3efcdb3faa94.jpg` directly in the repository's `assets/img/` folder to ensure it resolves with HTTP status 200 OK across both Vercel and GitHub Pages.

### 🚀 Version Track 1.0.4 - Image Fallback Guard & Tailwind CDN Warning Filter (2026-07-29)
- **Tailwind CDN Warning Filter**: Added console warning filter script to suppress production Tailwind CDN notices in browser console.
- **Image Fallback Guard**: Added `onerror="this.onerror=null; this.src='62b8530f-faae-4c33-899f-3efcdb3faa94.jpg';"` to ensure logo assets automatically resolve to root directory assets on static hosts.

### 🚀 Version Track 1.0.3 - Domain API Auto-Detection & Safe Function Resolution (2026-07-29)
- **Domain API Auto-Detection**: Configured `getApiBaseUrl()` in `js/app.js` to automatically map API calls to `https://aeonmc-website.vercel.app/api` when frontend is accessed via static domains (`aeonmc.com` / `github.io`).
