import express from 'express';
import cors from 'cors';

import registerHandler from './auth/register.js';
import loginHandler from './auth/login.js';
import meHandler from './auth/me.js';
import clickHandler from './telemetry/click.js';
import topLinksHandler from './telemetry/top-links.js';
import categoriesHandler from './forms/categories.js';
import threadsHandler from './forms/threads.js';
import postsHandler from './forms/posts.js';
import pinHandler from './forms/pin.js';
import setRankHandler from './ranks/set-rank.js';
import voteLinksHandler from './vote/links.js';
import supportTicketsHandler from './support/tickets.js';
import wikiArticlesHandler from './wiki/articles.js';

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

const adapt = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error('Vercel API Handler Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
};

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', service: 'AeonMC API Serverless (Vercel)', timestamp: new Date().toISOString() });
});

export default app;
