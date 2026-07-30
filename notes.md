# Findings for `notes.md`

## 1. CORS Issue Analysis
The fetch request from `https://www.aeonmc.com` to `https://aeonmc-website.vercel.app/api/auth/login` fails due to two main reasons:
- **Invalid CORS Configuration (`api/index.js`)**: On line 10, the app initializes CORS with `app.use(cors({ origin: '*', credentials: true }));`. According to CORS specifications, when `credentials: true` is used (meaning cookies or authorization headers are included), the `origin` cannot be a wildcard (`*`). It must be set explicitly to the requesting domain (e.g., `https://www.aeonmc.com`).
- **Duplicate/Conflicting Headers (`vercel.json`)**: The `vercel.json` file configures custom response headers for the `/api/(.*)` route, statically appending `Access-Control-Allow-Origin: *`. This creates duplicate headers when combined with Express's `cors` middleware, confusing the browser and leading to CORS errors.

## 2. Bloom DB Connection & Schema Config
- **Hardcoded Credentials (`lib/db.js`)**: The connection pool initialization provides the production Bloom DB credentials (host, db, user, pass) as default fallback strings instead of strictly relying on environment variables. This is a severe security risk if the repository is made public.
- **Environment Variables**: The database credentials exist in both `.env` and `.env.example`, and they are also fully documented (leaked) inside `VERCEL_AND_SQL_NOTES.md`. The `.env.example` file contains the actual live database password, which should be replaced with placeholder values.
- **Connection Limitations**: `lib/db.js` sets `connectionLimit: 5`.

## 3. Vercel Hosting Constraints
- **Serverless Database Connections**: Using a standard MySQL pool (`mysql.createPool`) in a Vercel Serverless environment can easily lead to connection exhaustion. Since Vercel spins up separate ephemeral serverless function containers for concurrent requests, each container will spawn its own database connection pool of up to 5 connections. If traffic spikes, this could easily exceed the Bloom DB connection limit.
- **Timeouts**: Vercel functions have strict execution timeouts (typically 10 seconds on the Free tier). If a database query hangs due to lock wait timeouts or exhausted connections, the function will timeout, returning a 504 error to the user.
