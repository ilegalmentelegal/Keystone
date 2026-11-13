import express from 'express';
import fs from 'fs';
import path from 'path';

const PORT = Number(process.env.PORT) || 3000;
const SCHEMA_VERSION = 4;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'trainer-hub-db.json');

interface PersistedPayload {
  schemaVersion: number;
  updatedAt: number;
  state: Record<string, unknown>;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readDb(): PersistedPayload | null {
  try {
    if (!fs.existsSync(DB_FILE)) return null;
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as PersistedPayload;
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION || !parsed.state) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to read DB file:', err);
    return null;
  }
}

function writeDb(state: Record<string, unknown>): PersistedPayload {
  ensureDataDir();
  const payload: PersistedPayload = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: Date.now(),
    state,
  };
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
  return payload;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, schemaVersion: SCHEMA_VERSION });
  });

  app.get('/api/state', (_req, res) => {
    const db = readDb();
    if (!db) {
      res.json({ state: null, updatedAt: 0, schemaVersion: SCHEMA_VERSION });
      return;
    }
    res.json({ state: db.state, updatedAt: db.updatedAt, schemaVersion: db.schemaVersion });
  });

  app.put('/api/state', (req, res) => {
    const body = req.body as { state?: Record<string, unknown> } | undefined;
    if (!body || !body.state || typeof body.state !== 'object') {
      res.status(400).json({ error: 'Invalid state payload' });
      return;
    }
    const saved = writeDb(body.state);
    res.json({ ok: true, updatedAt: saved.updatedAt });
  });

  app.post('/api/reset', (req, res) => {
    const body = req.body as { state?: Record<string, unknown> } | undefined;
    if (!body || !body.state || typeof body.state !== 'object') {
      res.status(400).json({ error: 'Invalid reset state payload' });
      return;
    }
    const saved = writeDb(body.state);
    res.json({ ok: true, updatedAt: saved.updatedAt });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Trainer Hub server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
