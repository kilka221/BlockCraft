import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getYdbUser, upsertYdbUser, decrementYdbToken, getYdbDiagrams, saveYdbDiagram } from './src/server/ydb';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Healthcheck & YDB status
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'Yandex Database (YDB Serverless)', region: 'ru-central1' });
  });

  // Yandex OAuth Userinfo Proxy
  app.get('/api/yandex/userinfo', async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const response = await fetch('https://login.yandex.ru/info?format=json', {
        headers: {
          Authorization: `OAuth ${token}`,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: 'Failed to fetch Yandex profile', details: errText });
      }

      const data = await response.json();
      res.json({ success: true, data });
    } catch (e: any) {
      console.error('Yandex userinfo error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // User Profile & Tokens API (YDB)
  app.get('/api/users/:uid', async (req, res) => {
    try {
      const { uid } = req.params;
      const user = await getYdbUser(uid);
      res.json({ success: true, user: user || { tokens: 1 } });
    } catch (e: any) {
      console.error('YDB getUser error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/users/sync', async (req, res) => {
    try {
      const { uid, email, displayName } = req.body;
      if (!uid) return res.status(400).json({ error: 'uid is required' });
      const result = await upsertYdbUser(uid, email || '', displayName || '');
      res.json({ success: true, result });
    } catch (e: any) {
      console.error('YDB syncUser error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/users/decrement-token', async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: 'uid is required' });
      const newBalance = await decrementYdbToken(uid);
      res.json({ success: true, tokens: newBalance });
    } catch (e: any) {
      console.error('YDB decrementToken error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Diagrams API (YDB)
  app.get('/api/diagrams/:uid', async (req, res) => {
    try {
      const { uid } = req.params;
      const list = await getYdbDiagrams(uid);
      res.json({ success: true, diagrams: list });
    } catch (e: any) {
      console.error('YDB getDiagrams error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/diagrams/save', async (req, res) => {
    try {
      const { uid, diagram } = req.body;
      if (!uid || !diagram) return res.status(400).json({ error: 'uid and diagram are required' });
      const result = await saveYdbDiagram(uid, diagram);
      res.json({ success: true, result });
    } catch (e: any) {
      console.error('YDB saveDiagram error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GOST.FLOW Server running on http://0.0.0.0:${PORT} with Yandex Database`);
  });
}

startServer();
