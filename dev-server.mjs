// Local server: same API contract as api/data.js but state lives in memory. Used for screenshots and offline dev.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { applyOp, compact, seed, view, session, BadOp } from './api/_logic.js';
let state = seed();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const send = (res, code, o) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(o)); };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/data') {
    const now = Date.now();
    if (req.method === 'GET') return send(res, 200, view(state, now));
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      try {
        const { op } = JSON.parse(b); const backup = structuredClone(state); const token = req.headers['x-maskan-token'] || null; let result = {}, tok = token;
        try {
          if (op.type === 'reset') { const s = session(state, token, now); if (!s || s.role !== 'manager') throw new BadOp('Only the manager can reset the demo', 403); state = seed(now); tok = null; result = { ok: true }; }
          else { result = applyOp(state, op, now, token); if (result?.token) tok = result.token; }
        } catch (e) { if (op.type === 'auth.login') { /* keep counted failures */ } else state = backup; throw e; }
        compact(state, now); send(res, 200, { ...view(state, now, tok), result });
      } catch (e) { send(res, e instanceof BadOp ? e.code : 400, { error: e.message }); }
    }); return;
  }
  let f = path.join('public', u.pathname === '/' ? 'index.html' : u.pathname);
  if (!path.extname(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!f.startsWith('public') || !fs.existsSync(f)) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
}).listen(process.env.PORT || 3200, () => console.log('http://localhost:' + (process.env.PORT || 3200)));
