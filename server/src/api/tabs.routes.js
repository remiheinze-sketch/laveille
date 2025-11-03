import { pool } from '../lib/db.js';
import express from 'express';
export const tabsRouter = express.Router();

tabsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT key, title FROM tabs ORDER BY key');
  res.json(rows);
});
