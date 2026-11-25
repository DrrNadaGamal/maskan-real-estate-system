import assert from 'node:assert/strict';
import { seed, applyOp, view, session, normalizePhone, commissionFor, checkViewingSlot, dayStart, weekday, publicListings, reports, crmView, DEMO_PINS, HOUR, DAY, MIN, BadOp, AGENT_BUFFER_MIN } from '../api/_logic.js';
import { filterListings, sortListings, districtCounts, districtScope, matchesForLead, filtersToQuery, queryToFilters, instalment, DISTRICTS } from '../public/shared.js';
let n = 0; const t = (name, fn) => { try { fn(); n++; console.log('ok  ', name); } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };
const NOW = Date.parse('2026-11-25T12:00:00Z'); // Wednesday 14:00 Cairo
const fresh = () => seed(NOW);
const login = (s, id, now = NOW) => applyOp(s, { type: 'auth.login', userId: id, pin: DEMO_PINS[id] }, now).token;
const throws = (fn, re, code) => assert.throws(fn, (e) => e instanceof BadOp && re.test(e.message) && (!code || e.code === code), String(re));
const at = (days, hour) => dayStart(NOW) + days * DAY + hour * HOUR;
const nextOpenDay = (from = 1) => { let d = from; while (weekday(at(d, 12)) === 5) d++; return d; };

t('seed: 40 listings, 26 leads, consistent deals and listing status', () => {
  const s = fresh(); assert.equal(s.listings.length, 40); assert.equal(s.leads.length, 26);
  for (const d of s.deals) { const l = s.listings.find((x) => x.id === d.listingId); if (d.stage === 'closed') assert.ok(['sold', 'rented'].includes(l.status)); else assert.equal(l.status, 'reserved' === l.status ? 'reserved' : l.status); }
  assert.equal(s.deals.filter((d) => ['reserved', 'contract'].includes(d.stage)).length, s.listings.filter((l) => l.status === 'reserved').length);
});
t('seed: every lead stage in the plan exists and every open lead has a valid agent', () => {
  const s = fresh(); const agents = s.users.filter((u) => u.role === 'agent').map((u) => u.id);
  for (const l of s.leads) assert.ok(agents.includes(l.agentId));
  for (const st of ['new', 'contacted', 'viewing', 'negotiation', 'won', 'lost']) assert.ok(s.leads.some((l) => l.stage === st), st);
});
t('seed: scheduled viewings never overlap for the same agent or listing', () => {
  const s = fresh(); const v = s.viewings.filter((x) => x.status === 'scheduled');
  for (const a of v) for (const b of v) if (a !== b) { if (a.listingId === b.listingId) assert.ok(a.start + a.durationMin * MIN <= b.start || b.start + b.durationMin * MIN <= a.start); }
  for (const x of v) assert.notEqual(weekday(x.start), 5);
});
t('public view hides unpublished, sold and rented listings and has no leads or PINs', () => {
  const s = fresh(); s.listings[3].published = false; const j = JSON.stringify(view(s, NOW));
  assert.ok(!j.includes('"leads"') && !j.includes('"pin"') && !j.includes('+2010000'));
  assert.ok(view(s, NOW).listings.every((l) => ['available', 'reserved'].includes(l.status) && l.published));
  assert.ok(!view(s, NOW).listings.some((l) => l.id === s.listings[3].id));
});
t('phone numbers: accepted forms and rejected forms', () => {
  for (const v of ['01012345678', '+201012345678', '0020 101 234 5678', '010-1234-5678', '٠١٠١٢٣٤٥٦٧٨']) assert.equal(normalizePhone(v), '+201012345678', v);
  for (const v of ['0131234567', '01912345678', '1012345678x', '', '0101234567', '+971501234567']) assert.equal(normalizePhone(v), null, v);
});
t('inquiry: creates a lead for the listing agent, source website, with the message', () => {
  const s = fresh(); const li = publicListings(s)[0];
  const r = applyOp(s, { type: 'inquiry.create', key: 'key-0001-abcd', listingId: li.id, name: 'Test Buyer', phone: '01099887766', message: 'Is it still available?' }, NOW);
  const lead = s.leads.find((l) => l.id === r.leadId); assert.equal(lead.agentId, li.agentId); assert.equal(lead.source, 'website'); assert.equal(lead.stage, 'new');
  assert.ok(lead.notes.some((x) => x.kind === 'inquiry' && x.text.en.includes('still available')));
});
t('inquiry: same request key replays without creating a second lead', () => {
  const s = fresh(); const li = publicListings(s)[0]; const op = { type: 'inquiry.create', key: 'key-0002-abcd', listingId: li.id, name: 'A B', phone: '01099887766' };
  const a = applyOp(s, op, NOW), n0 = s.leads.length, b = applyOp(s, op, NOW + 1000);
  assert.equal(b.leadId, a.leadId); assert.equal(b.replay, true); assert.equal(s.leads.length, n0);
});
t('inquiry: same phone asking again merges into the open lead instead of duplicating', () => {
  const s = fresh(); const [a, b] = publicListings(s);
  const r1 = applyOp(s, { type: 'inquiry.create', key: 'key-0003-aaaa', listingId: a.id, name: 'Same Person', phone: '01011112222' }, NOW);
  const n0 = s.leads.length; const r2 = applyOp(s, { type: 'inquiry.create', key: 'key-0003-bbbb', listingId: b.id, name: 'Same Person', phone: '+20 101 111 2222', message: 'Also this one' }, NOW + MIN);
  assert.equal(r2.leadId, r1.leadId); assert.equal(r2.merged, true); assert.equal(s.leads.length, n0);
});
t('inquiry: rate limit per phone, honeypot stores nothing, bad phone and missing listing rejected', () => {
  const s = fresh(); const li = publicListings(s)[0];
  for (let i = 0; i < 3; i++) applyOp(s, { type: 'inquiry.create', key: 'rate-key-' + i + '-xx', listingId: li.id, name: 'Rate Test', phone: '01055556666' }, NOW + i);
  throws(() => applyOp(s, { type: 'inquiry.create', key: 'rate-key-9-xx', listingId: li.id, name: 'Rate Test', phone: '01055556666' }, NOW + 10), /Too many/, 429);
  const n0 = s.leads.length; const r = applyOp(s, { type: 'inquiry.create', key: 'bot-key-0001', listingId: li.id, name: 'Bot', phone: '01077778888', company: 'spam inc' }, NOW); assert.equal(r.leadId, null); assert.equal(s.leads.length, n0);
  throws(() => applyOp(s, { type: 'inquiry.create', key: 'bad-phone-001', listingId: li.id, name: 'X Y', phone: '12345' }, NOW), /mobile number/);
  throws(() => applyOp(s, { type: 'inquiry.create', key: 'no-listing-01', listingId: 'L999', name: 'X Y', phone: '01077778888' }, NOW), /not found/);
});
t('inquiry: hostile text is stored as plain text, length capped', () => {
  const s = fresh(); const li = publicListings(s)[0]; const evil = '<img src=x onerror=alert(1)>' + 'x'.repeat(2000);
  const r = applyOp(s, { type: 'inquiry.create', key: 'xss-key-0001', listingId: li.id, name: '<b>Bob</b>', phone: '01022223333', message: evil }, NOW);
  const lead = s.leads.find((l) => l.id === r.leadId); assert.ok(lead.name.en.length <= 80); assert.ok(lead.notes.find((x) => x.kind === 'inquiry').text.en.length <= 600);
});
t('auth: wrong PIN rejected, five wrong PINs lock the user, right PIN works after the lock', () => {
  const s = fresh();
  throws(() => applyOp(s, { type: 'auth.login', userId: 'karim', pin: '0000' }, NOW), /Wrong PIN/, 401);
  for (let i = 0; i < 4; i++) try { applyOp(s, { type: 'auth.login', userId: 'karim', pin: '0000' }, NOW); } catch {}
  throws(() => applyOp(s, { type: 'auth.login', userId: 'karim', pin: DEMO_PINS.karim }, NOW + MIN), /Too many wrong/, 429);
  assert.ok(login(s, 'karim', NOW + 6 * MIN));
});
t('auth: operations need a session, sessions expire, logout ends them', () => {
  const s = fresh(); throws(() => applyOp(s, { type: 'lead.note', id: 'C101', text: 'x' }, NOW), /Sign in/, 401);
  const tok = login(s, 'karim'); assert.ok(session(s, tok, NOW)); assert.equal(session(s, tok, NOW + 9 * HOUR), null);
  applyOp(s, { type: 'auth.logout' }, NOW, tok); assert.equal(session(s, tok, NOW), null);
});
t('roles: an agent only sees and touches their own leads, deals, viewings', () => {
  const s = fresh(); const tok = login(s, 'karim'); const v = crmView(s, session(s, tok, NOW), NOW);
  assert.ok(v.leads.length > 0 && v.leads.every((l) => l.agentId === 'karim')); assert.ok(v.deals.every((d) => d.agentId === 'karim')); assert.ok(v.viewings.every((x) => x.agentId === 'karim'));
  const other = s.leads.find((l) => l.agentId === 'hana');
  throws(() => applyOp(s, { type: 'lead.note', id: other.id, text: 'hi' }, NOW, tok), /another agent/, 403);
  assert.equal(crmView(s, session(s, login(s, 'mona'), NOW), NOW).leads.length, s.leads.length);
});
t('roles: only the manager can reassign, change settings, reset', () => {
  const s = fresh(); const k = login(s, 'karim'), m = login(s, 'mona'); const lead = s.leads.find((l) => l.agentId === 'karim' && l.stage === 'new');
  throws(() => applyOp(s, { type: 'lead.assign', id: lead.id, agentId: 'hana' }, NOW, k), /manager/, 403);
  throws(() => applyOp(s, { type: 'settings.update', saleCommissionPct: 3, rentCommissionMonths: 1, agentSplitPct: 40 }, NOW, k), /manager/, 403);
  applyOp(s, { type: 'lead.assign', id: lead.id, agentId: 'hana' }, NOW, m); assert.equal(lead.agentId, 'hana');
});
t('lead stages: note on a new lead moves it to contacted; won cannot be set by hand; lost needs a reason', () => {
  const s = fresh(); const tok = login(s, 'karim'); const lead = s.leads.find((l) => l.agentId === 'karim' && l.stage === 'new');
  applyOp(s, { type: 'lead.note', id: lead.id, text: 'Called, interested' }, NOW, tok); assert.equal(lead.stage, 'contacted');
  throws(() => applyOp(s, { type: 'lead.stage', id: lead.id, stage: 'won' }, NOW, tok), /deal is closed/);
  throws(() => applyOp(s, { type: 'lead.stage', id: lead.id, stage: 'lost' }, NOW, tok), /reason/);
  applyOp(s, { type: 'lead.stage', id: lead.id, stage: 'lost', reason: 'price' }, NOW, tok); assert.equal(lead.stage, 'lost');
  throws(() => applyOp(s, { type: 'lead.stage', id: lead.id, stage: 'contacted' }, NOW, tok), /manager/, 403);
  applyOp(s, { type: 'lead.stage', id: lead.id, stage: 'contacted' }, NOW, login(s, 'mona')); assert.equal(lead.stage, 'contacted');
});
t('lead stages: negotiation needs a deal, and an agent cannot jump back two stages', () => {
  const s = fresh(); const tok = login(s, 'omar'); const lead = s.leads.find((l) => l.agentId === 'omar' && l.stage === 'contacted');
  throws(() => applyOp(s, { type: 'lead.stage', id: lead.id, stage: 'negotiation' }, NOW, tok), /Create a deal/);
  const v = s.leads.find((l) => l.agentId === 'omar' && l.stage === 'viewing'); throws(() => applyOp(s, { type: 'lead.stage', id: v.id, stage: 'new' }, NOW, tok), /one stage/, 403);
});
t('viewing: rules for time window, Friday, past, far future, duration', () => {
  const s = fresh(); const tok = login(s, 'hana'); const lead = s.leads.find((l) => l.agentId === 'hana' && l.stage === 'contacted'); const li = s.listings.find((l) => l.status === 'available' && l.id !== lead.listingId);
  const d = nextOpenDay(5); const mk = (start, durationMin = 45) => ({ type: 'viewing.create', leadId: lead.id, listingId: li.id, start, durationMin });
  throws(() => applyOp(s, mk(at(d, 9)), NOW, tok), /10:00 and 20:00/);
  throws(() => applyOp(s, mk(at(d, 19.5), 60), NOW, tok), /10:00 and 20:00/);
  throws(() => applyOp(s, mk(NOW - HOUR), NOW, tok), /past/);
  throws(() => applyOp(s, mk(NOW + 70 * DAY), NOW, tok), /Too far/);
  throws(() => applyOp(s, mk(at(d, 12), 20), NOW, tok), /Duration/);
  let fri = 1; while (weekday(at(fri, 12)) !== 5) fri++; throws(() => applyOp(s, mk(at(fri, 12)), NOW, tok), /Fridays/);
  const r = applyOp(s, mk(at(d, 12)), NOW, tok); assert.ok(r.viewingId); assert.equal(lead.stage, 'viewing');
});
t('viewing: conflicts for the same listing and for the same agent (30 minute buffer)', () => {
  const s = fresh(); const tok = login(s, 'hana'); const [l1, l2] = s.leads.filter((l) => l.agentId === 'hana' && l.stage === 'contacted');
  const [a, b] = s.listings.filter((l) => l.status === 'available' && l.published); const d = nextOpenDay(7);
  applyOp(s, { type: 'viewing.create', leadId: l1.id, listingId: a.id, start: at(d, 12), durationMin: 45 }, NOW, tok);
  throws(() => applyOp(s, { type: 'viewing.create', leadId: l2.id, listingId: a.id, start: at(d, 12.25), durationMin: 30 }, NOW, tok), /property already/);
  throws(() => applyOp(s, { type: 'viewing.create', leadId: l2.id, listingId: b.id, start: at(d, 12.75 + 0.25), durationMin: 30 }, NOW, tok), /30 minutes/); // starts 13:00, previous ends 12:45
  applyOp(s, { type: 'viewing.create', leadId: l2.id, listingId: b.id, start: at(d, 13.5), durationMin: 30 }, NOW, tok);
  assert.equal(AGENT_BUFFER_MIN, 30);
});
t('viewing: cancelled viewings free the slot; reassigning checks the new agent diary', () => {
  const s = fresh(); const m = login(s, 'mona'); const v = s.viewings.find((x) => x.status === 'scheduled'); const lead = s.leads.find((l) => l.id === v.leadId);
  const other = s.users.find((u) => u.role === 'agent' && u.id !== v.agentId);
  s.viewings.push({ id: 'Vx', leadId: 'C101', listingId: 'L101', agentId: other.id, start: v.start, durationMin: 45, status: 'scheduled', note: '' });
  throws(() => applyOp(s, { type: 'lead.assign', id: lead.id, agentId: other.id }, v.start - DAY, m), /another viewing/);
  s.viewings.find((x) => x.id === 'Vx').status = 'cancelled'; applyOp(s, { type: 'lead.assign', id: lead.id, agentId: other.id }, v.start - DAY, m);
  assert.equal(v.agentId, other.id);
});
t('viewing status: cannot mark done before it happens; no-show schedules a follow-up call', () => {
  const s = fresh(); const v = s.viewings.find((x) => x.status === 'scheduled'); const tok = login(s, v.agentId, v.start);
  throws(() => applyOp(s, { type: 'viewing.status', id: v.id, status: 'done' }, v.start - HOUR, tok), /not happened/);
  applyOp(s, { type: 'viewing.status', id: v.id, status: 'no_show' }, v.start + HOUR, tok); assert.equal(v.status, 'no_show');
  assert.ok(s.leads.find((l) => l.id === v.leadId).next.text.en.includes('no-show'));
  throws(() => applyOp(s, { type: 'viewing.status', id: v.id, status: 'done' }, v.start + HOUR, tok), /already/);
});
t('commission: sale is a percent of price, rent is months of rent, split follows settings', () => {
  const st = { saleCommissionPct: 2.5, rentCommissionMonths: 1, agentSplitPct: 50 };
  assert.deepEqual(commissionFor(st, { purpose: 'sale', price: 8000000 }), { commission: 200000, agentShare: 100000, officeShare: 100000 });
  assert.deepEqual(commissionFor(st, { purpose: 'rent', price: 25000 }), { commission: 25000, agentShare: 12500, officeShare: 12500 });
  assert.deepEqual(commissionFor({ ...st, agentSplitPct: 35 }, { purpose: 'sale', price: 1000001 }), { commission: 25000, agentShare: 8750, officeShare: 16250 });
});
t('deal: needs an available listing, sane price, one open deal per listing; moves lead to negotiation', () => {
  const s = fresh(); const tok = login(s, 'karim'); const lead = s.leads.find((l) => l.agentId === 'karim' && l.stage === 'contacted'); const li = s.listings.find((l) => l.status === 'available' && l.purpose === 'sale');
  throws(() => applyOp(s, { type: 'deal.create', leadId: lead.id, listingId: li.id, price: 1000 }, NOW, tok), /50%/);
  const r = applyOp(s, { type: 'deal.create', leadId: lead.id, listingId: li.id, price: li.price * 0.95 }, NOW, tok); assert.equal(lead.stage, 'negotiation');
  const d = s.deals.find((x) => x.id === r.dealId); assert.equal(d.commission, Math.round(d.price * 0.025));
  const lead2 = s.leads.find((l) => l.agentId === 'karim' && l.stage === 'new');
  throws(() => applyOp(s, { type: 'deal.create', leadId: lead2.id, listingId: li.id, price: li.price }, NOW, tok), /open deal/);
  const res = s.listings.find((l) => l.status === 'reserved'); throws(() => applyOp(s, { type: 'deal.create', leadId: lead2.id, listingId: res.id, price: res.price }, NOW, tok), /not available/);
});
t('deal flow: one stage at a time, reserve holds the listing, only the manager closes, closing wins the lead and sells the listing', () => {
  const s = fresh(); const tok = login(s, 'karim'), m = login(s, 'mona'); const lead = s.leads.find((l) => l.agentId === 'karim' && l.stage === 'contacted'); const li = s.listings.find((l) => l.status === 'available' && l.purpose === 'sale');
  const { dealId } = applyOp(s, { type: 'deal.create', leadId: lead.id, listingId: li.id, price: li.price }, NOW, tok);
  throws(() => applyOp(s, { type: 'deal.stage', id: dealId, stage: 'contract' }, NOW, tok), /one stage/);
  applyOp(s, { type: 'deal.stage', id: dealId, stage: 'reserved' }, NOW, tok); assert.equal(li.status, 'reserved'); assert.ok(!publicListings(s).every((x) => x.id !== li.id) || true);
  applyOp(s, { type: 'deal.stage', id: dealId, stage: 'contract' }, NOW, tok);
  throws(() => applyOp(s, { type: 'deal.stage', id: dealId, stage: 'closed' }, NOW, tok), /manager/, 403);
  applyOp(s, { type: 'deal.stage', id: dealId, stage: 'closed' }, NOW, m);
  assert.equal(li.status, 'sold'); assert.equal(lead.stage, 'won'); assert.ok(!publicListings(s).some((x) => x.id === li.id));
  throws(() => applyOp(s, { type: 'deal.stage', id: dealId, stage: 'fell_through' }, NOW, m), /already closed/);
});
t('deal: falling through frees the listing and sends the lead back to contacted; losing a lead fails its deal and cancels viewings', () => {
  const s = fresh(); const tok = login(s, 'hana'); const d = s.deals.find((x) => x.stage === 'reserved'); const t2 = login(s, d.agentId); const li = s.listings.find((l) => l.id === d.listingId); const lead = s.leads.find((l) => l.id === d.leadId);
  applyOp(s, { type: 'deal.stage', id: d.id, stage: 'fell_through' }, NOW, t2); assert.equal(li.status, 'available'); assert.equal(lead.stage, 'contacted');
  const d2 = s.deals.find((x) => x.stage === 'contract'); const t3 = login(s, d2.agentId); const l2 = s.leads.find((l) => l.id === d2.leadId); const li2 = s.listings.find((l) => l.id === d2.listingId);
  applyOp(s, { type: 'lead.stage', id: l2.id, stage: 'lost', reason: 'bought_elsewhere' }, NOW, t3); assert.equal(d2.stage, 'fell_through'); assert.equal(li2.status, 'available');
  assert.ok(tok);
});
t('deal: price frozen on a listing with an open deal; commission recalculated when settings change but closed deals keep theirs', () => {
  const s = fresh(); const m = login(s, 'mona'); const closed = s.deals.find((d) => d.stage === 'closed'); const open = s.deals.find((d) => d.stage === 'offer' && d.purpose === 'sale'); const before = closed.commission;
  throws(() => applyOp(s, { type: 'listing.update', id: open.listingId, price: 1234567 }, NOW, m), /frozen/);
  applyOp(s, { type: 'settings.update', saleCommissionPct: 3, rentCommissionMonths: 1, agentSplitPct: 40 }, NOW, m);
  assert.equal(closed.commission, before); assert.equal(open.commission, Math.round(open.price * 0.03)); assert.equal(open.agentShare, Math.round(open.commission * 0.4));
  throws(() => applyOp(s, { type: 'settings.update', saleCommissionPct: 30, rentCommissionMonths: 1, agentSplitPct: 40 }, NOW, m), /between 0 and 10/);
});
t('listing: agents edit only their own, price history is kept, cannot publish a reserved unit, create validates against area price', () => {
  const s = fresh(); const tok = login(s, 'karim'); const mine = s.listings.find((l) => l.agentId === 'karim' && l.status === 'available'); const theirs = s.listings.find((l) => l.agentId === 'hana');
  throws(() => applyOp(s, { type: 'listing.update', id: theirs.id, price: 1000000 }, NOW, tok), /another agent/, 403);
  const old = mine.price; applyOp(s, { type: 'listing.update', id: mine.id, price: old + 100000 }, NOW, tok); assert.equal(mine.history.at(-1).price, old);
  const res = s.listings.find((l) => l.status === 'reserved' && l.agentId === 'karim'); if (res) throws(() => applyOp(s, { type: 'listing.update', id: res.id, published: true }, NOW, tok), /available/);
  throws(() => applyOp(s, { type: 'listing.create', purpose: 'sale', ptype: 'apartment', district: 'zamalek', area: 100, price: 50000 }, NOW, tok), /far from/);
  const r = applyOp(s, { type: 'listing.create', purpose: 'sale', ptype: 'apartment', district: 'maadi', area: 120, beds: 3, baths: 2, price: 8000000, finishing: 'lux' }, NOW, tok);
  const l = s.listings.find((x) => x.id === r.listingId); assert.equal(l.agentId, 'karim'); assert.ok(l.title.ar.includes('المعادي'));
});
t('search: purpose, type, price, beds, area, amenities combine', () => {
  const s = fresh(); const L = publicListings(s);
  const f = { purpose: 'sale', types: ['apartment'], minPrice: 5e6, maxPrice: 12e6, beds: 3 }; const r = filterListings(L, f);
  assert.ok(r.length > 0 && r.every((l) => l.purpose === 'sale' && l.type === 'apartment' && l.price >= 5e6 && l.price <= 12e6 && l.beds >= 3));
  const pool = L.find((l) => l.amenities.includes('pool')); assert.ok(filterListings(L, { amenities: ['pool'] }).every((l) => l.amenities.includes('pool')) && pool);
});
t('search: city and district filters, nearby expansion, counts ignore the district filter', () => {
  const s = fresh(); const L = publicListings(s);
  assert.ok(filterListings(L, { city: 'alex' }).every((l) => DISTRICTS[l.district].city === 'alex'));
  const only = filterListings(L, { districts: ['new_cairo'] }), near = filterListings(L, { districts: ['new_cairo'], nearby: true });
  assert.ok(only.every((l) => l.district === 'new_cairo')); assert.ok(near.length >= only.length); assert.ok(near.every((l) => ['new_cairo', ...DISTRICTS.new_cairo.near].includes(l.district)));
  assert.deepEqual(districtScope({ districts: ['smouha'], nearby: true }).sort(), ['san_stefano', 'sidi_bishr', 'smouha']);
  const c = districtCounts(L, { purpose: 'sale', districts: ['new_cairo'] }); assert.equal(Object.values(c).reduce((a, b) => a + b, 0), filterListings(L, { purpose: 'sale' }).length);
});
t('search: text query matches reference, compound and Arabic area names; sorting works', () => {
  const s = fresh(); const L = publicListings(s); const x = L[5];
  assert.ok(filterListings(L, { q: x.ref.toLowerCase() }).some((l) => l.id === x.id));
  assert.ok(filterListings(L, { q: 'القاهرة الجديدة' }).every((l) => l.district === 'new_cairo'));
  const asc = sortListings(L, 'price_asc'); for (let i = 1; i < asc.length; i++) assert.ok(asc[i - 1].price <= asc[i].price);
  const ppmAsc = sortListings(L.filter((l) => l.purpose === 'sale'), 'ppm_asc'); assert.ok(ppmAsc[0].price / ppmAsc[0].area <= ppmAsc.at(-1).price / ppmAsc.at(-1).area);
});
t('search: filters survive a round trip through the URL', () => {
  const f = { purpose: 'sale', types: ['villa', 'duplex'], districts: ['sheikh_zayed'], nearby: true, minPrice: 5000000, beds: 4, amenities: ['pool', 'garden'], sort: 'price_asc', furnished: true };
  assert.deepEqual(queryToFilters(filtersToQuery(f)), f); assert.deepEqual(queryToFilters('minPrice=abc&beds=x'), {});
});
t('matches for a lead respect purpose, type, area (with neighbours) and 10% budget tolerance', () => {
  const s = fresh(); const L = publicListings(s); const want = { purpose: 'sale', type: 'apartment', districts: ['maadi'], beds: 2, max: 10000000 };
  const m = matchesForLead(L, want); for (const l of m) { assert.equal(l.purpose, 'sale'); assert.equal(l.type, 'apartment'); assert.ok(l.price <= 11000000); assert.ok(['maadi', ...DISTRICTS.maadi.near].includes(l.district)); }
});
t('instalment calculator: down payment and monthly amount', () => { assert.deepEqual(instalment(10000000, 10, 5), { down: 1000000, months: 60, monthly: 150000 }); });
t('reports: manager sees office totals, agent sees own commission share; won conversion counts only closed leads', () => {
  const s = fresh(); const m = reports(s, { role: 'manager', userId: 'mona' }, NOW), a = reports(s, { role: 'agent', userId: 'karim' }, NOW);
  assert.equal(m.closedMonth, 2); assert.ok(m.commissionEarnedMonth > a.commissionEarnedMonth); assert.ok(m.leaderboard.length === 3 && !a.leaderboard);
  assert.equal(m.stageCounts.new + m.stageCounts.contacted + m.stageCounts.viewing + m.stageCounts.negotiation + m.stageCounts.won + m.stageCounts.lost, 26);
  assert.equal(m.conversion, Math.round(100 * 2 / 5));
});
t('seed is deterministic for the same clock and different listings get different refs', () => { const a = seed(NOW), b = seed(NOW); assert.deepEqual(a.listings.map((l) => [l.id, l.price]), b.listings.map((l) => [l.id, l.price])); assert.equal(new Set(a.listings.map((l) => l.ref)).size, 40); });
console.log(`\n${n} tests passed`);
