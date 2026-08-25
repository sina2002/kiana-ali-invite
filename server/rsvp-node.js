/**
 * بک‌اند ساده‌ی ثبت پاسخ‌های دعوت‌نامه (RSVP) — بدون هیچ وابستگی
 * اجرا:            node server/rsvp-node.js
 * ثبت پاسخ:        POST /rsvp            (JSON: {name, message, ts})
 * مشاهده‌ی لیست:   GET  /rsvp?list=SECRET
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.RSVP_SECRET || 'change-me-please'; // ← حتماً عوض کنید
const DATAFILE = path.join(__dirname, 'rsvp-data.jsonl');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (url.pathname !== '/rsvp') {
    res.writeHead(404); return res.end(JSON.stringify({ error: 'not found' }));
  }

  /* ---------- مشاهده‌ی لیست ---------- */
  if (req.method === 'GET') {
    if (url.searchParams.get('list') !== SECRET) {
      res.writeHead(403); return res.end(JSON.stringify({ error: 'forbidden' }));
    }
    let items = [];
    if (fs.existsSync(DATAFILE)) {
      items = fs.readFileSync(DATAFILE, 'utf8')
        .split('\n').filter(Boolean)
        .map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(Boolean);
    }
    return res.end(JSON.stringify({ count: items.length, items }, null, 2));
  }

  /* ---------- ثبت پاسخ ---------- */
  if (req.method !== 'POST') {
    res.writeHead(405); return res.end(JSON.stringify({ error: 'method not allowed' }));
  }

  let body = '';
  req.on('data', c => {
    body += c;
    if (body.length > 10_000) req.destroy(); // محافظت در برابر بدنه‌ی حجیم
  });
  req.on('end', () => {
    let data = {};
    try { data = JSON.parse(body); } catch { /* ignore */ }

    const name = String(data.name || '').trim();
    const message = String(data.message || '').trim();

    if (!name || name.length > 60 || message.length > 500) {
      res.writeHead(422); return res.end(JSON.stringify({ error: 'invalid input' }));
    }

    const row = {
      name,
      message,
      ts: Number(data.ts) || Date.now(),
      ip: req.socket.remoteAddress || '',
      saved: new Date().toISOString(),
    };

    fs.appendFile(DATAFILE, JSON.stringify(row) + '\n', err => {
      if (err) {
        res.writeHead(500); return res.end(JSON.stringify({ error: 'write failed' }));
      }
      res.end(JSON.stringify({ ok: true }));
    });
  });
});

server.listen(PORT, () =>
  console.log(`RSVP server → http://localhost:${PORT}/rsvp`)
);
