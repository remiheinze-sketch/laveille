import express from 'express';
export const reportsRouter = express.Router();

reportsRouter.post('/email', async (req, res) => {
  const { to=[], subject='Veille – Rapport', body='' } = req.body || {};
  const mailto = `mailto:${encodeURIComponent((to||[]).join(','))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  res.json({ ok:true, mailto });
});
