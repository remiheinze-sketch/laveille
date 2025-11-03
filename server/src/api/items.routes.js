import express from 'express';
import { pool } from '../lib/db.js';
import { normalizeItem } from '../lib/normalizer.js';

export const itemsRouter = express.Router();

itemsRouter.get('/', async (req, res) => {
  const { tab, search='', tags='', sources='', since='', page='1', pageSize='10' } = req.query;
  const params = [];
  let where = [];
  if (tab){ params.push(tab); where.push(`tab_key = $${params.length}`); }
  if (since){ params.push(since); where.push(`date_iso >= $${params.length}`); }
  if (search){
    params.push('%'+search+'%'); params.push('%'+search+'%');
    where.push(`(title ILIKE $${params.length-1} OR summary ILIKE $${params.length})`);
  }
  if (tags){
    params.push(tags.split(',').filter(Boolean)); where.push(`tags && $${params.length}::text[]`);
  }
  if (sources){
    params.push(sources.split(',').filter(Boolean)); where.push(`source_id IN (SELECT id FROM sources WHERE name = ANY($${params.length}::text[]))`);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pageNum = Math.max(parseInt(page,10)||1,1);
  const sizeNum = Math.min(Math.max(parseInt(pageSize,10)||10,1),100);
  const offset = (pageNum-1)*sizeNum;

  const totalSql = `SELECT COUNT(*) FROM items ${whereSql}`;
  const dataSql  = `SELECT * FROM items ${whereSql} ORDER BY date_iso DESC LIMIT ${sizeNum} OFFSET ${offset}`;
  const total = parseInt((await pool.query(totalSql, params)).rows[0].count, 10);
  const items = (await pool.query(dataSql, params)).rows;
  res.json({ items, total, page: pageNum, pageSize: sizeNum });
});

itemsRouter.post('/', async (req, res) => {
  const { tab_key, title, link, summary='', tags=[], pinned=false, read=false } = req.body || {};
  if (!tab_key || !title || !link) return res.status(400).json({error:'tab_key, title, link requis'});
  const item = normalizeItem({ tab_key, title, summary, link, tags, pinned, read });
  await pool.query(
    `INSERT INTO items (id, tab_key, title, summary, link, tags, date_iso, pinned, read)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
    [item.id, item.tab_key, item.title, item.summary, item.link, item.tags, item.date_iso, item.pinned, item.read]
  );
  res.status(201).json(item);
});
