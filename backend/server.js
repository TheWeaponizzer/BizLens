require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.get('/api/health', async (req, res) => {
  try { await db.query('SELECT 1'); res.json({ ok: true, service: 'BizLens', database: 'connected', time: new Date().toISOString() }) }
  catch (e) { res.status(503).json({ ok: false, service: 'BizLens', database: 'disconnected' }) }
});
app.use('/api', require('./routes'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
app.use((e, req, res, next) => {
  console.error(e);
  const status = e.status || 500;
  res.status(status).json({ error: status < 500 ? e.message : 'Something went wrong on the server' });
});

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => console.log(`BizLens running on http://localhost:${port}`));
const shutdown = async () => { server.close(async () => { await db.end(); process.exit(0) }) };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
