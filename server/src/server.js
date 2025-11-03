import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import YAML from 'yaml';

import { pool, ensureSchema } from './lib/db.js';
import { log, warn, error } from './lib/logger.js';
import { tabsRouter } from './api/tabs.routes.js';
import { itemsRouter } from './api/items.routes.js';
import { reportsRouter } from './api/reports.routes.js';
import { registerMockIngestion } from './jobs/fetch-mocks.job.js';

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'CHANGE_ME';

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

app.use((req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/tabs', tabsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/reports', reportsRouter);

async function bootstrap(){
  const schemaPath = path.resolve('sql/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await ensureSchema(schemaSql);

  const { rows } = await pool.query('SELECT COUNT(*) FROM tabs');
  if (parseInt(rows[0].count,10) === 0){
    const cfgPath = path.resolve('config.sample.yml');
    const cfg = YAML.parse(fs.readFileSync(cfgPath, 'utf8'));
    for (const t of cfg.tabs || []){
      await pool.query('INSERT INTO tabs(key, title) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [t.key, t.title]);
    }
  }

  registerMockIngestion();

  app.listen(PORT, () => log(`API listening on :${PORT}`));
}

bootstrap().catch((e)=>{
  error(e);
  process.exit(1);
});
