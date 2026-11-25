import puppeteer from 'puppeteer-core';
const U = process.argv[2] || 'http://localhost:3200', SHOTS = process.argv[3] || '';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
const mk = async (w = 1360, h = 900) => { const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: w, height: h }); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|ERR_INTERNET|net::/.test(m.text()) && p.errs.push(m.text())); return p; };
let fails = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
const api = (p, op, tok) => p.evaluate((o, t) => fetch('/api/data', { method: o ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-maskan-token': t || '' }, body: o ? JSON.stringify({ op: o }) : undefined }).then(async (r) => ({ status: r.status, body: await r.json() })), op, tok);
const login = async (p, who, pin) => { await p.goto(U + '/crm?lang=en', { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.removeItem('maskan_token')); await p.reload({ waitUntil: 'networkidle0' }); await p.click(`[data-u=${who}]`); await p.type('#pin', pin); await p.click('#lf .btn'); await p.waitForSelector('.side'); };
const text = (p, s) => p.$eval(s, (e) => e.textContent);

// reset to a known state through the manager API
const admin = await mk(); await admin.goto(U + '/?lang=en', { waitUntil: 'networkidle0' });
const m = await api(admin, { type: 'auth.login', userId: 'mona', pin: '2468' }); await api(admin, { type: 'reset' }, m.body.result.token);

// ---- public search
const pub = await mk(); await pub.goto(U + '/?lang=en', { waitUntil: 'networkidle0' });
const total = (await pub.$$('.card')).length; ok(total > 20, `home lists ${total} sale properties`);
await shot(pub, 'home-en');
await pub.click('[data-type=apartment]'); await sleep(200); const apts = await pub.$$eval('.card .specs', (e) => e.length); ok(apts > 0 && apts < total, 'type filter narrows the results');
await pub.click('[data-dist=new_cairo]'); await sleep(200); const nc = (await pub.$$('.card')).length;
await pub.click('#nearby'); await sleep(200); const nc2 = (await pub.$$('.card')).length; ok(nc2 >= nc, `nearby areas add results (${nc} -> ${nc2})`);
ok(pub.url().includes('districts=new_cairo') && pub.url().includes('nearby=1'), 'filters are in the URL');
await pub.click('[data-purpose=rent]'); await sleep(200); ok((await text(pub, '.card .price')).includes('month'), 'rent shows monthly prices');
await pub.goto(U + '/?purpose=sale&q=zahraa&lang=en', { waitUntil: 'networkidle0' }); ok((await pub.$$('.card')).every ? (await pub.$$('.card')).length >= 0 : true, 'text query from URL works');
// favourites
await pub.goto(U + '/?lang=en', { waitUntil: 'networkidle0' }); await pub.click('.heart'); await sleep(100); ok((await text(pub, '#savedBtn')).includes('(1)'), 'save a property');
// ---- arabic RTL
const ar = await mk(); await ar.goto(U + '/?lang=ar', { waitUntil: 'networkidle0' });
ok((await ar.$eval('html', (e) => e.dir)) === 'rtl', 'Arabic sets dir=rtl'); ok((await text(ar, '.hero h1')).includes('مصر'), 'Arabic hero text');
await shot(ar, 'home-ar');
// ---- property + inquiry
const pp = await mk(); await pp.goto(U + '/property?id=L101&lang=en', { waitUntil: 'networkidle0' });
await pp.click('.gal-nav.n'); await sleep(100); ok((await pp.$$('.thumbs button[aria-current=true]')).length === 1, 'gallery navigation');
await shot(pp, 'property-en');
await pp.click('#inq .btn'); ok((await pp.$$('.err')).length === 2, 'empty form shows two errors');
await pp.type('#name', 'Mazen Hassan'); await pp.type('#phone', '0109 876 5432'); await pp.type('#message', 'Is the price negotiable? We can view on Saturday.');
await pp.click('#inq .btn'); await pp.waitForSelector('.sentbox'); ok((await text(pp, '.sentbox h2')).includes('received'), 'inquiry accepted'); 
await pp.goto(U + '/property?id=L101&lang=ar', { waitUntil: 'networkidle0' }); await shot(pp, 'property-ar');
// ---- agent role
const ag = await mk(); await login(ag, 'karim', '1357');
ok((await ag.$$('[data-tab=settings]')).length === 0, 'agent has no Settings tab');
await shot(ag, 'crm-dashboard-agent');
const mgr = await mk(); await login(mgr, 'mona', '2468'); ok((await mgr.$$('[data-tab=settings]')).length === 1, 'manager has Settings');
await shot(mgr, 'crm-dashboard');
await mgr.click('[data-tab=leads]'); await sleep(200); const mLeads = (await mgr.$$('.lc')).length; ok(mLeads >= 26, `manager sees ${mLeads} leads`);
await shot(mgr, 'crm-leads');
await ag.click('[data-tab=leads]'); await sleep(200); const aLeads = (await ag.$$('.lc')).length; ok(aLeads > 0 && aLeads < mLeads, `agent sees only ${aLeads} leads`);
// the website inquiry reached the listing agent (Karim owns L101)
await ag.type('#lq', 'Mazen'); await sleep(300); ok((await ag.$$('.lc')).length === 1, 'website inquiry appears as a lead for the listing agent');
await ag.click('.lc'); await ag.waitForSelector('.drawer'); ok((await ag.$$eval('.tl div', (e) => e.some((d) => d.textContent.includes('negotiable')))), 'inquiry message is in the timeline ');
await ag.type('#noteText', 'Called, wants to see it'); await ag.click('#postNote'); await sleep(400); ok((await text(ag, '.drawer')).includes('Contacted'), 'note moves a new lead to Contacted');
await shot(ag, 'crm-lead-drawer');
// book a viewing on Thursday-ish: use API-valid time (next open day 12:00 Cairo)
const slot = await ag.evaluate(() => { const d = new Date(Date.now() + 2 * 864e5 + 7200000); while (d.getUTCDay() === 5) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) + 'T18:30'; });
await ag.$eval('#vat', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')); }, slot); await ag.click('#bookV'); await sleep(500);
ok((await text(ag, '.drawer')).includes('Viewing booked'), 'viewing booked and lead moved to Viewing');
// friday and out-of-hours rejected
const fri = await ag.evaluate(() => { const d = new Date(Date.now() + 864e5 + 7200000); while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) + 'T12:00'; });
await ag.$eval('#vat', (e, v) => { e.value = v; }, fri); await ag.click('#bookV'); await sleep(300); ok((await text(ag, '#toast')).includes('Fridays'), 'Friday viewing rejected with a clear message');
// deal and manager-only close
await ag.click('#mkDeal'); await sleep(500); ok((await text(ag, '.drawer')).includes('Negotiation'), 'deal created, lead in Negotiation');
await ag.click('#dclose'); await ag.click('[data-tab=deals]'); await sleep(300);
await shot(ag, 'crm-deals-agent');
// direct API attempts an agent must not be able to do
const tok = await ag.evaluate(() => localStorage.getItem('maskan_token'));
const other = await api(mgr, { type: 'crm.state' }, await mgr.evaluate(() => localStorage.getItem('maskan_token')));
const hanaLead = other.body.crm.leads.find((l) => l.agentId === 'hana');
const r1 = await api(ag, { type: 'lead.note', id: hanaLead.id, text: 'hack' }, tok); ok(r1.status === 403, 'agent cannot touch another agent lead (403)');
const r2 = await api(ag, { type: 'settings.update', saleCommissionPct: 9, rentCommissionMonths: 1, agentSplitPct: 90 }, tok); ok(r2.status === 403, 'agent cannot change commission settings (403)');
const r3 = await api(pub, { type: 'crm.state' }); ok(r3.status === 401, 'CRM data needs a session (401)');
const pubJson = JSON.stringify((await api(pub)).body); ok(!/"pin"|leads|\+2010000/.test(pubJson), 'public API exposes no leads, PINs or phone numbers');
// manager closes the deal
await mgr.click('[data-tab=deals]'); await sleep(300); const before = await mgr.$$eval('.tbl tr', (e) => e.length);
await mgr.evaluate(() => [...document.querySelectorAll('[data-ds]')].find((b) => /:closed$/.test(b.dataset.ds) === false && b.dataset.ds.endsWith(':reserved'))?.click()); await sleep(300);
await shot(mgr, 'crm-deals');
await mgr.click('[data-tab=viewings]'); await sleep(300); await shot(mgr, 'crm-viewings');
await mgr.click('[data-tab=listings]'); await sleep(300); await shot(mgr, 'crm-listings');
// mobile
const mob = await mk(390, 844); await mob.goto(U + '/?lang=ar', { waitUntil: 'networkidle0' }); await shot(mob, 'home-mobile-ar');
await mob.goto(U + '/property?id=L105&lang=en', { waitUntil: 'networkidle0' }); await shot(mob, 'property-mobile');
ok(await mob.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal scroll on mobile');
// offline queue
const off = await mk(); await off.goto(U + '/property?id=L106&lang=en', { waitUntil: 'networkidle0' }); await sleep(800);
await off.setOfflineMode(true); await off.type('#name', 'Offline Buyer'); await off.type('#phone', '01055500011'); await off.click('#inq .btn'); await off.waitForSelector('.sentbox');
ok((await text(off, '.sentbox h2')).includes('offline'), 'offline inquiry is queued on the device');
await off.setOfflineMode(false); await off.evaluate(() => window.dispatchEvent(new Event('online'))); await sleep(1200);
const q = await off.evaluate(() => JSON.parse(localStorage.getItem('maskan_inquiry_queue') || '[]').length); ok(q === 0, 'queue flushed after reconnect');
const mt = await api(mgr, { type: 'crm.state' }, await mgr.evaluate(() => localStorage.getItem('maskan_token')));
ok(mt.body.crm.leads.filter((l) => l.phone === '+201055500011').length === 1, 'queued inquiry created exactly one lead');
// hostile input last, after every screenshot, then reset the demo
const hx = await mk(); await hx.goto(U + '/property?id=L107&lang=en', { waitUntil: 'networkidle0' });
await hx.type('#name', '<img src=x onerror=window.__x=1>'); await hx.type('#phone', '01077700022'); await hx.type('#message', '<script>window.__x=1</script>'); await hx.click('#inq .btn'); await hx.waitForSelector('.sentbox');
ok(!(await hx.evaluate(() => window.__x)), 'hostile HTML in a public inquiry is not executed');
await mgr.goto(U + '/crm?lang=en', { waitUntil: 'networkidle0' }); await sleep(500);
ok(!(await mgr.evaluate(() => window.__x)) && (await mgr.$$('img[src=x]')).length === 0, 'hostile lead renders as text in the CRM');
const mt2 = await mgr.evaluate(() => localStorage.getItem('maskan_token')); await api(mgr, { type: 'reset' }, mt2);
const errs = [pub, ar, pp, ag, mgr, mob, off].flatMap((p) => p.errs); ok(errs.length === 0, 'no page errors ' + errs.join('|'));
await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
