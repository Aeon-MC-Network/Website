import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import registerHandler from './api/auth/register.js';
import loginHandler from './api/auth/login.js';
import meHandler from './api/auth/me.js';
import clickHandler from './api/telemetry/click.js';
import topLinksHandler from './api/telemetry/top-links.js';
import categoriesHandler from './api/forms/categories.js';
import threadsHandler from './api/forms/threads.js';
import postsHandler from './api/forms/posts.js';
import pinHandler from './api/forms/pin.js';
import setRankHandler from './api/ranks/set-rank.js';
import voteLinksHandler from './api/vote/links.js';
import supportTicketsHandler from './api/support/tickets.js';
import wikiArticlesHandler from './api/wiki/articles.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Serve static frontend from root
app.use(express.static('.'));

// Serverless Function Adapters for Express
const adapt = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error('Express Handler Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
};

// API Endpoint Routes
app.all('/api/auth/register', adapt(registerHandler));
app.all('/api/auth/login', adapt(loginHandler));
app.all('/api/auth/me', adapt(meHandler));

app.all('/api/telemetry/click', adapt(clickHandler));
app.all('/api/telemetry/top-links', adapt(topLinksHandler));

app.all('/api/forms/categories', adapt(categoriesHandler));
app.all('/api/forms/threads', adapt(threadsHandler));
app.all('/api/forms/posts', adapt(postsHandler));
app.all('/api/forms/pin', adapt(pinHandler));

app.all('/api/ranks/set-rank', adapt(setRankHandler));
app.all('/api/vote/links', adapt(voteLinksHandler));
app.all('/api/support/tickets', adapt(supportTicketsHandler));
app.all('/api/wiki/articles', adapt(wikiArticlesHandler));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', service: 'AeonMC API', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 AeonMC API Server running on port ${PORT}`);
});
