import { put, list, del } from '@vercel/blob';
import { applyOp, compact, seed, view, session, BadOp } from './_logic.js';

// One shared demo workspace stored as a versioned JSON blob. Every save writes a NEW pathname, so a read can
// never hit a cached older copy of the same URL. The newest version wins; older ones are deleted after a save.
const PREFIX = 'maskan/state-';
const RESET_MS = 6 * 60 * 60 * 1000; // the public demo resets every 6 hours

async function versions() {
  const { blobs } = await list({ prefix: PREFIX });
  return blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
}
async function load() {
  try {
    const [newest] = await versions();
    if (!newest) throw new Error('empty');
    const s = await (await fetch(newest.url, { cache: 'no-store' })).json();
    if (Date.now() - s.resetAt > RESET_MS) throw new Error('expired');
    return s;
  } catch {
    const s = seed(); await save(s); return s;
  }
}
async function save(s) {
  const old = await versions().catch(() => []);
  await put(PREFIX + String(Date.now()).padStart(15, '0') + '.json', JSON.stringify(s), { access: 'public', addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 });
  if (old.length) await del(old.map((b) => b.url)).catch(() => {});
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const now = Date.now();
    if (req.method === 'GET') return res.status(200).json(view(await load(), now));
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const op = body.op; const token = String(req.headers['x-maskan-token'] || '').slice(0, 80) || null;
    if (JSON.stringify(op || {}).length > 20000) return res.status(413).json({ error: 'Too large' });
    let state = await load(); let result = {}, tok = token;
    try {
      if (op?.type === 'reset') {
        const sess = session(state, token, now); if (!sess || sess.role !== 'manager') throw new BadOp('Only the manager can reset the demo', 403);
        state = seed(now); tok = null; result = { ok: true };
      } else { result = applyOp(state, op, now, token); if (result?.token) tok = result.token; }
    } catch (e) {
      if (op?.type === 'auth.login' && e instanceof BadOp) await save(state); // failed PIN attempts are counted
      throw e;
    }
    compact(state, now);
    await save(state);
    return res.status(200).json({ ...view(state, now, tok), result });
  } catch (e) {
    if (e instanceof BadOp) return res.status(e.code || 400).json({ error: e.message });
    return res.status(500).json({ error: 'Server error' });
  }
}
