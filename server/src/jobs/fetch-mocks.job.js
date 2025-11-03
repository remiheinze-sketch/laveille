import cron from 'node-cron';
import { pool } from '../lib/db.js';
import { normalizeItem } from '../lib/normalizer.js';

function randomItem(tab_key){
  const id = Math.random().toString(36).slice(2,10);
  return normalizeItem({
    tab_key,
    title: `[MOCK] Nouveau contenu ${id}`,
    summary: 'Article simulé pour démo API.',
    link: `https://example.com/mock/${id}`,
    tags: ['mock','demo'],
    date_iso: new Date().toISOString()
  });
}

export function registerMockIngestion(){
  cron.schedule('*/5 * * * *', async () => {
    const tabs = ['budget','metz','social'];
    for (const t of tabs){
      const item = randomItem(t);
      await pool.query(
        `INSERT INTO items (id, tab_key, title, summary, link, tags, date_iso)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [item.id, item.tab_key, item.title, item.summary, item.link, item.tags, item.date_iso]
      );
    }
    console.log('[jobs] mock ingestion tick');
  });
}
