import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { 
  getYdbUser, 
  upsertYdbUser, 
  decrementYdbToken, 
  getYdbDiagrams, 
  saveYdbDiagram,
  registerYdbUser,
  loginYdbUser,
  deleteYdbDiagram
} from './src/server/ydb';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Router
  const apiRouter = express.Router();

  // Healthcheck & YDB status
  apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', database: 'Yandex Database (YDB Serverless)', region: 'ru-central1' });
  });

  // Direct Auth API (YDB Serverless)
  apiRouter.post('/auth/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
      }
      const user = await registerYdbUser(email, password, displayName || '');
      res.json({ success: true, user });
    } catch (e: any) {
      console.error('YDB Auth Register error:', e);
      res.status(400).json({ success: false, error: e.message || 'Ошибка регистрации' });
    }
  });

  apiRouter.post('/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
      }
      const user = await loginYdbUser(email, password);
      res.json({ success: true, user });
    } catch (e: any) {
      console.error('YDB Auth Login error:', e);
      res.status(400).json({ success: false, error: e.message || 'Ошибка входа' });
    }
  });

  // Yandex OAuth Userinfo Proxy & Auto-save to YDB
  apiRouter.get('/yandex/userinfo', async (req, res) => {
    console.log('[API] /api/yandex/userinfo request received:', req.query);
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ success: false, error: 'Token is required' });
      }

      const response = await fetch(`https://login.yandex.ru/info?format=json&oauth_token=${encodeURIComponent(token)}`, {
        headers: {
          Authorization: `OAuth ${token}`,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn('[API] Yandex info error response:', response.status, errText);
        return res.status(response.status).json({ success: false, error: 'Failed to fetch Yandex profile', details: errText });
      }

      const data = await response.json();
      console.log('[API] Yandex info success for:', data.login || data.id);

      const email = data.default_email || (data.emails && data.emails[0]) || `${data.login}@yandex.ru`;
      const displayName = data.real_name || data.display_name || data.first_name || data.login || 'Пользователь Яндекс';
      const uid = `yandex_${data.id || data.login}`;

      // Automatically sync and save user to YDB
      const ydbRes = await upsertYdbUser(uid, email, displayName);

      const user = {
        uid,
        email,
        displayName,
        tokens: ydbRes.tokens,
        photoURL: data.default_avatar_id ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200` : undefined,
        providerId: 'yandex.ru'
      };

      return res.json({ success: true, data, user });
    } catch (e: any) {
      console.error('[API] Yandex userinfo exception:', e);
      return res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  // User Profile & Tokens API (YDB)
  apiRouter.get('/users/:uid', async (req, res) => {
    try {
      const { uid } = req.params;
      const user = await getYdbUser(uid);
      res.json({ success: true, user: user || { tokens: 1 } });
    } catch (e: any) {
      console.error('YDB getUser error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  apiRouter.post('/users/sync', async (req, res) => {
    try {
      const { uid, email, displayName } = req.body;
      if (!uid) return res.status(400).json({ success: false, error: 'uid is required' });
      const result = await upsertYdbUser(uid, email || '', displayName || '');
      res.json({ success: true, result });
    } catch (e: any) {
      console.error('YDB syncUser error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  apiRouter.post('/users/decrement-token', async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ success: false, error: 'uid is required' });
      const newBalance = await decrementYdbToken(uid);
      res.json({ success: true, tokens: newBalance });
    } catch (e: any) {
      console.error('YDB decrementToken error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Diagrams API (YDB)
  apiRouter.get('/diagrams/:uid', async (req, res) => {
    try {
      const { uid } = req.params;
      const list = await getYdbDiagrams(uid);
      res.json({ success: true, diagrams: list });
    } catch (e: any) {
      console.error('YDB getDiagrams error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  apiRouter.post('/diagrams/save', async (req, res) => {
    try {
      const { uid, diagram } = req.body;
      if (!uid || !diagram) return res.status(400).json({ success: false, error: 'uid and diagram are required' });
      const result = await saveYdbDiagram(uid, diagram);
      res.json({ success: true, result });
    } catch (e: any) {
      console.error('YDB saveDiagram error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  apiRouter.post('/diagrams/delete', async (req, res) => {
    try {
      const { uid, diagramId } = req.body;
      if (!uid || !diagramId) return res.status(400).json({ success: false, error: 'uid and diagramId are required' });
      const result = await deleteYdbDiagram(uid, diagramId);
      res.json({ success: true, result });
    } catch (e: any) {
      console.error('YDB deleteDiagram error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Catch-all 404 for any unhandled /api/* route
  apiRouter.use((req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  });

  // Mount API router
  app.use('/api', apiRouter);

  // Global Error Handler for API
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Express API Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Внутренняя ошибка сервера' });
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
