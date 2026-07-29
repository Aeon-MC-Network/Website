# AeonMC Network - Version Tracker

- **Current Version**: 1.0.0
- **Track Name**: Version Track 1.0
- **Deployment Platform**: Vercel & GitHub Pages
- **Database Backend**: Bloom MySQL (`s119339_Aeonweb`)
- **Last Updated**: 2026-07-29T14:02:30-05:00

---

## Release & Version Change History

### 🚀 Version Track 1.0 - Initial Production Release (2026-07-29)
- **Database Migration**: Verified and executed full MySQL schema on Bloom MySQL (`s119339_Aeonweb`).
- **Auth Engine**: Refactored `api/auth/register.js` and `api/auth/login.js` with bcrypt hashing, 7-day persistent JWT cookies, and multi-device session sync.
- **Standalone HTML Suite**: Created and integrated `index.html`, `404.html`, `vote.html`, `wiki.html`, `forums.html`, `contact.html`, `support.html`, `creators.html`, and `media.html`.
- **Branding & Assets**: Implemented custom logo `62b8530f-faae-4c33-899f-3efcdb3faa94.jpg`, removed public usages of 'Enterprise'/'Network', moved Discord link exclusively to footer.
- **Safe API Client**: Implemented `safeApiFetch` with content-type checking and static fallback engine for GitHub Pages.
- **Vercel Zero-Config Deployment**: Created `vercel.json` rewrites and `api/index.js` serverless Express entrypoint.
