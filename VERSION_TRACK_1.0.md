# AeonMC Network - Version Tracker

- **Current Version**: 1.0.2
- **Track Name**: Version Track 1.0
- **Deployment Platform**: Vercel (Single Serverless Function) & GitHub Pages
- **Database Backend**: Bloom MySQL (`s119339_Aeonweb`)
- **Last Updated**: 2026-07-29T14:08:15-05:00

---

## Release & Version Change History

### 🚀 Version Track 1.0.2 - Serverless Function Consolidation (2026-07-29)
- **Vercel Hobby Plan Compliance**: Refactored the entire API architecture into a single unified Express application at `api/index.js` using Express Routers (`/auth`, `/forms`, `/telemetry`, `/ranks`, `/vote`, `/wiki`, `/support`).
- **Function Limit Optimization**: Reduced serverless function count from 13 individual functions to **1 single function** (`api/index.js`), completely eliminating Vercel Hobby plan 12-function limit deployment failures.
- **Routing Rewrite**: Updated `vercel.json` so all `/api/(.*)` requests map exclusively to `api/index.js`.

### 🚀 Version Track 1.0.1 - Vercel Output Directory Fix (2026-07-29)
- **Vercel Output Directory**: Configured `"outputDirectory": "."` in `vercel.json` and removed dummy npm `build` script in `package.json` to prevent Vercel build failures searching for missing `dist/` directory.

### 🚀 Version Track 1.0.0 - Initial Production Release (2026-07-29)
- **Database Migration**: Verified and executed full MySQL schema on Bloom MySQL (`s119339_Aeonweb`).
- **Auth Engine**: Refactored `api/auth/register.js` and `api/auth/login.js` with bcrypt hashing, 7-day persistent JWT cookies, and multi-device session sync.
- **Standalone HTML Suite**: Created and integrated `index.html`, `404.html`, `vote.html`, `wiki.html`, `forums.html`, `contact.html`, `support.html`, `creators.html`, and `media.html`.
- **Branding & Assets**: Implemented custom logo `62b8530f-faae-4c33-899f-3efcdb3faa94.jpg`, removed public usages of 'Enterprise'/'Network', moved Discord link exclusively to footer.
- **Safe API Client**: Implemented `safeApiFetch` with content-type checking and static fallback engine for GitHub Pages.
