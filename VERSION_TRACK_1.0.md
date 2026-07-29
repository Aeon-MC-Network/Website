# AeonMC Network - Version Tracker

- **Current Version**: 1.0.3
- **Track Name**: Version Track 1.0
- **Deployment Platform**: Vercel & GitHub Pages
- **Database Backend**: Bloom MySQL (`s119339_Aeonweb`)
- **Last Updated**: 2026-07-29T14:11:30-05:00

---

## Release & Version Change History

### 🚀 Version Track 1.0.3 - Domain API Auto-Detection & Safe Function Resolution (2026-07-29)
- **Domain API Auto-Detection**: Configured `getApiBaseUrl()` in `js/app.js` to automatically map API calls to `https://aeonmc-website.vercel.app/api` when frontend is accessed via static domains (`aeonmc.com` / `github.io`), resolving 404 HTML response errors.
- **Crash-Proof `safeApiFetch` Resolution**: Updated page script blocks to inspect `(typeof window !== 'undefined' && window.safeApiFetch)` safely, preventing `ReferenceError: safeApiFetch is not defined` when client scripts execute.

### 🚀 Version Track 1.0.2 - Serverless Function Consolidation (2026-07-29)
- **Vercel Hobby Plan Compliance**: Refactored the entire API architecture into a single unified Express application at `api/index.js` using Express Routers (`/auth`, `/forms`, `/telemetry`, `/ranks`, `/vote`, `/wiki`, `/support`).
- **Function Limit Optimization**: Reduced serverless function count from 13 individual functions to **1 single function** (`api/index.js`), completely eliminating Vercel Hobby plan 12-function limit deployment failures.

### 🚀 Version Track 1.0.1 - Vercel Output Directory Fix (2026-07-29)
- **Vercel Output Directory**: Configured `"outputDirectory": "."` in `vercel.json` and removed dummy npm `build` script in `package.json` to prevent Vercel build failures searching for missing `dist/` directory.

### 🚀 Version Track 1.0.0 - Initial Production Release (2026-07-29)
- **Database Migration**: Verified and executed full MySQL schema on Bloom MySQL (`s119339_Aeonweb`).
- **Auth Engine**: Refactored `api/auth/register.js` and `api/auth/login.js` with bcrypt hashing, 7-day persistent JWT cookies, and multi-device session sync.
