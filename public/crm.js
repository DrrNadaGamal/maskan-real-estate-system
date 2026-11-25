import { $, $$, esc, t, lang, header, bindLang, load, post, isNetErr, nf, money, moneyShort, label, place, toast, registerSW, applyLang, pick, fmtDate, fmtDay, fmtTime, fmtDateTime, toLocalInput, fromLocalInput, token, setToken, serverNow } from './common.js';
import { propertyArt } from './art.js';
import { TYPES, DISTRICTS, AMENITIES } from './shared.js';

const STAGES = ['new', 'contacted', 'viewing', 'negotiation', 'won', 'lost'], DSTAGES = ['offer', 'reserved', 'contract', 'closed'];
const SOURCES = ['website', 'whatsapp', 'facebook', 'referral', 'walk_in'], LOST = ['price', 'location', 'bought_elsewhere', 'no_answer', 'not_ready'];
let crm = null, pub = [], tab = 'dashboard', openLead = null, modal = null, lf = { q: '', agent: '', source: '', mode: 'board' }, loginUser = null, loginErr = '', offline = false, listingFilter = 'all';
const now = () => serverNow();
const lead = (id) => crm.leads.find((l) => l.id === id), listing = (id) => (crm.listings.find((l) => l.id === id) || pub.find((l) => l.id === id));
const user = (id) => crm.users.find((u) => u.id === id);
const isMgr = () => crm.me.role === 'manager';
const nm = (l) => l.name[lang] || l.name.en;

async function act(op, okMsg) {
  try { const r = await post(op); if (r.crm) crm = r.crm; pub = r.listings || pub; if (okMsg) toast(okMsg); render(); return r; }
  catch (e) { if (e.status === 401 && token()) { setToken(''); crm = null; render(); return null; } toast(isNetErr(e) ? t('viewOnlyOffline') : e.message, true); return null; }
}
async function boot() {
  try { const r = await load(); pub = r.data.listings; offline = r.offline; } catch { offline = true; }
  if (token() && !offline) { try { const r = await post({ type: 'crm.state' }); crm = r.crm; } catch { setToken(''); } }
  render();
}

function loginView() {
  const users = [['mona', 'Mona Fathy', 'منى فتحي', 'manager'], ['karim', 'Karim Adel', 'كريم عادل', 'agent'], ['hana', 'Hana Samir', 'هنا سمير', 'agent'], ['omar', 'Omar Nabil', 'عمر نبيل', 'agent']];
  return `<div class="login"><div class="panel"><h1 style="font-size:24px">${t('crmTitle')}</h1><p class="muted">${t('chooseUser')}</p>
  <div class="users">${users.map(([id, en, ar, role]) => `<button class="ucard" type="button" data-u="${id}" aria-pressed="${loginUser === id}"><span class="av">${(lang === 'ar' ? ar : en)[0]}</span><span><b>${lang === 'ar' ? ar : en}</b><br><span class="mini">${role === 'manager' ? t('roleManager') : t('roleAgent')}</span></span></button>`).join('')}</div>
  <form id="lf"><label class="f"><span>${t('pin')}</span><input type="password" id="pin" inputmode="numeric" maxlength="8" autocomplete="off" dir="ltr"></label>${loginErr ? `<div class="err">${esc(loginErr)}</div>` : ''}<button class="btn" style="width:100%" ${loginUser ? '' : 'disabled'}>${t('enter')}</button></form>
  <p class="mini" style="margin-top:12px">${t('demoPins')}</p></div></div>`;
}

const dueTxt = (ts) => { const d = Math.floor((ts - (Math.floor((now() + 7200000) / 864e5) * 864e5 - 7200000)) / 864e5); return d < 0 ? t('overdue') : d === 0 ? `${t('today')} ${fmtTime(ts)}` : d === 1 ? `${t('tomorrow')} ${fmtTime(ts)}` : fmtDateTime(ts); };
const stageBadge = (s) => `<span class="badge ${s === 'won' ? 'ok' : s === 'lost' ? 'bad' : s === 'negotiation' ? 'gold' : ''}">${t('stage_' + s)}</span>`;

function dashboard() {
  const r = crm.reports, mgr = isMgr(), max = Math.max(1, ...Object.values(r.stageCounts)), smax = Math.max(1, ...Object.values(r.bySource));
  const up = crm.viewings.filter((v) => v.status === 'scheduled' && v.start >= now() - 36e5).sort((a, b) => a.start - b.start).slice(0, 5);
  const due = crm.leads.filter((l) => l.next && !['won', 'lost'].includes(l.stage)).sort((a, b) => a.next.at - b.next.at).slice(0, 5);
  const k = (lbl, v, sub, cls = '') => `<div class="kpi ${cls}"><span>${lbl}</span><b>${v}</b><small>${sub || ''}</small></div>`;
  return `<h1>${t('n_dashboard')}</h1><div class="kpis">${k(t('kNew'), nf(r.newLeads7d))}${k(t('kViewings'), nf(r.viewingsWeek))}${k(t('kPipeline'), moneyShort(r.pipelineValue))}${k(t('kEarned'), moneyShort(r.commissionEarnedMonth), mgr ? t('officeTotal') : t('yourShare'))}${k(t('kWeighted'), moneyShort(r.commissionWeighted), mgr ? t('officeTotal') : t('yourShare'))}${k(t('kOverdue'), nf(r.overdue), '', r.overdue ? 'warn' : '')}${k(t('kConv'), nf(r.conversion) + '%')}${k(t('kNoShow'), nf(r.noShowRate) + '%')}</div>
  <div class="cols2"><div class="panel"><h3>${t('funnel')}</h3><div class="bars" style="margin-top:10px">${STAGES.map((s) => `<div class="bar"><span>${t('stage_' + s)}</span><div class="tr"><i style="width:${(r.stageCounts[s] / max) * 100}%"></i></div><b>${nf(r.stageCounts[s])}</b></div>`).join('')}</div></div>
  <div class="panel"><h3>${t('sources')}</h3><div class="bars" style="margin-top:10px">${SOURCES.map((s) => `<div class="bar"><span>${t('src_' + s)}</span><div class="tr"><i style="width:${((r.bySource[s] || 0) / smax) * 100}%;background:var(--gold)"></i></div><b>${nf(r.bySource[s] || 0)}</b></div>`).join('')}</div></div></div>
  <div class="cols2"><div class="panel"><h3>${t('upcoming')}</h3><div class="list" style="margin-top:10px">${up.map((v) => { const l = lead(v.leadId), p = listing(v.listingId); return `<div class="li"><div class="grow"><b>${esc(l ? nm(l) : '')}</b><span class="mini">${fmtDay(v.start)}, ${fmtTime(v.start)} · ${esc(p?.ref || '')}</span></div></div>`; }).join('') || `<div class="muted">${t('nothing')}</div>`}</div></div>
  <div class="panel"><h3>${t('dueNow')}</h3><div class="list" style="margin-top:10px">${due.map((l) => `<button class="li" type="button" data-lead="${l.id}" style="text-align:start"><div class="grow"><b>${esc(nm(l))}</b><span class="mini">${esc(pick(l.next.text))}</span></div><span class="badge ${l.next.at < now() ? 'bad' : ''}">${dueTxt(l.next.at)}</span></button>`).join('') || `<div class="muted">${t('nothing')}</div>`}</div></div></div>
  ${mgr ? `<div class="panel"><h3>${t('team')}</h3><div class="tblwrap"><table class="tbl" style="margin-top:10px"><tr><th>${t('agent')}</th><th>${t('openLeads')}</th><th>${t('openDeals')}</th><th>${t('won')}</th><th>${t('earned')}</th><th>${t('inPipeline')}</th></tr>${r.leaderboard.map((a) => `<tr><td><b>${esc(pick(a.name))}</b></td><td>${nf(a.leads)}</td><td>${nf(a.openDeals)}</td><td>${nf(a.won)}</td><td>${money(a.earned)}</td><td>${money(a.pipeline)}</td></tr>`).join('')}</table></div></div>` : ''}`;
}

function leadCard(l) {
  const p = l.listingId && listing(l.listingId), late = l.next && l.next.at < now() && !['won', 'lost'].includes(l.stage);
  return `<button class="lc" type="button" data-lead="${l.id}"><b>${esc(nm(l))}</b><div class="m" dir="ltr" style="text-align:start">${l.phone.replace(/^\+20(\d{2})(\d{4})(\d{4})$/, '0$1 $2 $3')}</div><div class="m">${t('src_' + l.source)}${p ? ` · ${esc(p.ref)}` : ''}${isMgr() ? ` · ${esc(pick(user(l.agentId).name))}` : ''}</div>${l.next && !['won', 'lost'].includes(l.stage) ? `<div class="due ${late ? 'late' : ''}">${late ? '⚠ ' : ''}${esc(pick(l.next.text))} · ${dueTxt(l.next.at)}</div>` : ''}</button>`;
}
function leadsView() {
  let ls = crm.leads.filter((l) => (!lf.q || (nm(l) + l.phone).toLowerCase().includes(lf.q.toLowerCase().replace(/\s/g, ''))|| nm(l).toLowerCase().includes(lf.q.toLowerCase())) && (!lf.agent || l.agentId === lf.agent) && (!lf.source || l.source === lf.source));
  const agents = crm.users.filter((u) => u.role === 'agent');
  return `<h1><span class="grow">${t('n_leads')}</span><button class="btn" type="button" id="addLead">+ ${t('addLead')}</button></h1>
  <div class="tbar"><input type="search" id="lq" placeholder="${esc(t('searchLeads'))}" value="${esc(lf.q)}">${isMgr() ? `<select id="lag"><option value="">${t('allAgents')}</option>${agents.map((u) => `<option value="${u.id}" ${lf.agent === u.id ? 'selected' : ''}>${esc(pick(u.name))}</option>`).join('')}</select>` : ''}<select id="lsrc"><option value="">${t('allSources')}</option>${SOURCES.map((s) => `<option value="${s}" ${lf.source === s ? 'selected' : ''}>${t('src_' + s)}</option>`).join('')}</select><span class="grow"></span><div class="seg"><button type="button" data-mode="board" aria-pressed="${lf.mode === 'board'}">${t('board')}</button><button type="button" data-mode="list" aria-pressed="${lf.mode === 'list'}">${t('list')}</button></div></div>
  ${lf.mode === 'board' ? `<div class="board">${STAGES.map((s) => { const c = ls.filter((l) => l.stage === s); return `<div class="col"><h3><span>${t('stage_' + s)}</span><span>${nf(c.length)}</span></h3>${c.sort((a, b) => b.updatedAt - a.updatedAt).map(leadCard).join('')}</div>`; }).join('')}</div>`
  : `<div class="tblwrap"><table class="tbl"><tr><th>${t('leadName')}</th><th>${t('stageL')}</th><th>${t('source')}</th><th>${t('interest')}</th>${isMgr() ? `<th>${t('agent')}</th>` : ''}<th>${t('nextAction')}</th></tr>${ls.map((l) => `<tr class="click" data-lead="${l.id}"><td><b>${esc(nm(l))}</b><br><span class="mini" dir="ltr">${l.phone}</span></td><td>${stageBadge(l.stage)}</td><td>${t('src_' + l.source)}</td><td>${esc(listing(l.listingId)?.ref || '-')}</td>${isMgr() ? `<td>${esc(pick(user(l.agentId).name))}</td>` : ''}<td>${l.next ? esc(pick(l.next.text)) + ' · ' + dueTxt(l.next.at) : '-'}</td></tr>`).join('')}</table></div>`}`;
}

function drawer() {
  const l = lead(openLead); if (!l) return '';
  const p = l.listingId && listing(l.listingId), closed = ['won', 'lost'].includes(l.stage);
  const deals = crm.deals.filter((d) => d.leadId === l.id), vs = crm.viewings.filter((v) => v.leadId === l.id).sort((a, b) => b.start - a.start);
  const avail = crm.listings.filter((x) => x.status === 'available' && x.published);
  const moves = STAGES.filter((s) => s !== l.stage && s !== 'won' && s !== 'negotiation');
  return `<div class="drawer-bg" id="dbg"></div><aside class="drawer" role="dialog" aria-label="${esc(nm(l))}"><button class="btn sec sm x" type="button" id="dclose">${t('close')}</button>
  <h2>${esc(nm(l))}</h2><div style="margin:6px 0 4px">${stageBadge(l.stage)} <span class="badge gray">${t('src_' + l.source)}</span> ${l.lostReason ? `<span class="badge bad">${t('lost_' + l.lostReason)}</span>` : ''}</div>
  <div><a class="btn sm" href="tel:${l.phone}" dir="ltr">☎ ${l.phone.replace(/^\+20(\d{2})(\d{4})(\d{4})$/, '0$1 $2 $3')}</a></div>
  <section><h3>${t('interest')}</h3>${p ? `<div class="li"><div style="width:84px;border-radius:8px;overflow:hidden;flex:none">${propertyArt(p)}</div><div class="grow"><b>${esc(p.title[lang])}</b><span class="mini">${esc(p.ref)} · ${money(p.price)}${p.purpose === 'rent' ? ' ' + t('perMonth') : ''}</span></div><a class="btn sec sm" href="/property?id=${p.id}">${t('viewPublic')}</a></div>` : `<span class="muted">${t('noListing')}</span>`}
  <div class="mini" style="margin-top:6px">${t('agent')}: ${esc(pick(user(l.agentId).name))}</div></section>
  ${closed && !(l.stage === 'lost' && isMgr()) ? '' : ''}
  <section><h3>${t('stageL')}</h3><div class="row"><select id="stageSel" ${l.stage === 'won' ? 'disabled' : ''}>${[l.stage, ...moves, ...(deals.some((d) => d.stage !== 'fell_through') && l.stage !== 'negotiation' ? ['negotiation'] : [])].filter((v, i, a) => a.indexOf(v) === i).map((s) => `<option value="${s}" ${s === l.stage ? 'selected' : ''}>${t('stage_' + s)}</option>`).join('')}</select>${isMgr() && !closed ? `<select id="assignSel"><option value="">${t('assignTo')}</option>${crm.users.filter((u) => u.role === 'agent' && u.id !== l.agentId).map((u) => `<option value="${u.id}">${esc(pick(u.name))}</option>`).join('')}</select>` : ''}</div></section>
  ${!closed ? `<section><h3>${t('nextAction')}</h3><div class="mini" style="margin-bottom:6px">${l.next ? esc(pick(l.next.text)) + ' · ' + fmtDateTime(l.next.at) : '-'}</div><div class="row"><input type="text" id="nextText" maxlength="80" placeholder="${esc(t('nextText'))}"><input type="datetime-local" id="nextAt" value="${toLocalInput(now() + 864e5)}"></div><button class="btn sec sm" type="button" id="setNext" style="margin-top:8px">${t('setNext')}</button></section>
  <section><h3>${t('bookViewing')}</h3><div class="row"><select id="vl">${avail.map((x) => `<option value="${x.id}" ${x.id === l.listingId ? 'selected' : ''}>${esc(x.ref)} · ${esc(x.title[lang])}</option>`).join('')}</select></div><div class="row" style="margin-top:8px"><input type="datetime-local" id="vat" value="${toLocalInput(Math.ceil((now() + 864e5) / 36e5) * 36e5)}"><select id="vdur">${[30, 45, 60].map((m) => `<option ${m === 45 ? 'selected' : ''} value="${m}">${m} ${t('minutes')}</option>`).join('')}</select></div><button class="btn sm" type="button" id="bookV" style="margin-top:8px">${t('book')}</button><div class="mini" style="margin-top:6px">${t('officeRules')}</div></section>
  <section><h3>${t('createDeal')}</h3><div class="row"><select id="dl">${avail.map((x) => `<option value="${x.id}" ${x.id === l.listingId ? 'selected' : ''}>${esc(x.ref)} · ${money(x.price)}</option>`).join('')}</select><input type="number" id="dprice" inputmode="numeric" placeholder="${esc(t('offerPrice'))}" value="${p ? p.price : ''}"></div><button class="btn sm" type="button" id="mkDeal" style="margin-top:8px">${t('createDeal')}</button></section>` : ''}
  ${vs.length || deals.length ? `<section><h3>${t('n_viewings')} / ${t('n_deals')}</h3><div class="list">${vs.map((v) => `<div class="li"><div class="grow"><b>${fmtDateTime(v.start)}</b><span class="mini">${esc(listing(v.listingId)?.ref || '')} · ${t(v.status === 'no_show' ? 'noShow' : v.status === 'scheduled' ? 'scheduled' : v.status === 'done' ? 'done' : 'cancelled')}</span></div></div>`).join('')}${deals.map((d) => `<div class="li"><div class="grow"><b>${money(d.price)}</b><span class="mini">${esc(listing(d.listingId)?.ref || '')} · ${t('d_' + d.stage)}</span></div></div>`).join('')}</div></section>` : ''}
  ${!closed ? `<section><h3>${t('suggested')}</h3><div class="list">${l.matches.map((id) => { const x = listing(id); return x ? `<div class="li"><div style="width:70px;border-radius:8px;overflow:hidden;flex:none">${propertyArt(x)}</div><div class="grow"><b>${esc(x.title[lang])}</b><span class="mini">${esc(x.ref)} · ${money(x.price)}</span></div><a class="btn sec sm" href="/property?id=${x.id}">${t('viewPublic')}</a></div>` : ''; }).join('') || `<span class="muted">${t('suggestedNone')}</span>`}</div></section>` : ''}
  <section><h3>${t('notes')}</h3><div class="tl">${[...l.notes].reverse().map((n) => `<div class="${n.kind}"><small>${fmtDateTime(n.at)} · ${n.by === 'system' ? t('system') : n.by === 'client' ? t('client') : esc(pick(user(n.by)?.name) || n.by)}</small>${esc(typeof n.text === 'string' ? n.text : pick(n.text))}</div>`).join('')}</div>
  <label class="f" style="margin-top:10px"><span>${t('addNote')}</span><textarea id="noteText" maxlength="500" placeholder="${esc(t('notePh'))}"></textarea></label><button class="btn sm" type="button" id="postNote">${t('post')}</button></section></aside>`;
}

function viewingsView() {
  const mine = [...crm.viewings].sort((a, b) => a.start - b.start); const up = mine.filter((v) => v.status === 'scheduled'); const past = mine.filter((v) => v.status !== 'scheduled').reverse();
  const byDay = {}; for (const v of up) (byDay[fmtDay(v.start)] ||= []).push(v);
  const row = (v, past) => { const l = lead(v.leadId), p = listing(v.listingId); return `<div class="li"><div style="min-width:64px;font-weight:800">${fmtTime(v.start)}<div class="mini">${v.durationMin} ${t('minutes')}</div></div><div class="grow"><b>${esc(l ? nm(l) : '')}</b><span class="mini">${esc(p?.ref || '')} · ${esc(p ? p.title[lang] : '')}${isMgr() ? ' · ' + esc(pick(user(v.agentId).name)) : ''}</span></div>${past ? `<span class="badge ${v.status === 'done' ? 'ok' : v.status === 'no_show' ? 'bad' : 'gray'}">${t(v.status === 'no_show' ? 'noShow' : v.status === 'done' ? 'done' : 'cancelled')}</span>` : `<div class="chips"><button class="btn sec sm" data-vs="${v.id}:done" ${v.start > now() ? 'disabled' : ''}>${t('markDone')}</button><button class="btn sec sm" data-vs="${v.id}:no_show" ${v.start > now() ? 'disabled' : ''}>${t('markNoShow')}</button><button class="btn sec sm" data-vmove="${v.id}">${t('move')}</button><button class="btn sec sm" data-vs="${v.id}:cancelled">${t('cancelV')}</button></div>`}</div>`; };
  return `<h1>${t('viewingsTitle')}</h1><p class="muted">${t('officeRules')}</p>${Object.entries(byDay).map(([d, vs]) => `<h3 style="margin:16px 0 8px">${d}</h3><div class="list">${vs.map((v) => row(v)).join('')}</div>`).join('') || `<div class="panel muted">${t('nothing')}</div>`}<h3 style="margin:22px 0 8px">${t('past')}</h3><div class="list">${past.slice(0, 12).map((v) => row(v, true)).join('')}</div>`;
}

function dealsView() {
  const mgr = isMgr(); const open = crm.deals.filter((d) => !['fell_through'].includes(d.stage)); const closed = crm.deals.filter((d) => d.stage === 'closed');
  const dc = (d) => { const p = listing(d.listingId), l = lead(d.leadId); const nxt = DSTAGES[DSTAGES.indexOf(d.stage) + 1]; return `<div class="dc"><b>${esc(p?.ref || '')} · ${esc(l ? nm(l) : '')}</b><span class="mini">${esc(p ? p.title[lang] : '')}</span><div style="margin-top:4px"><b>${money(d.price)}${d.purpose === 'rent' ? ' ' + t('perMonth') : ''}</b></div><div class="mini">${t('commission')} ${money(d.commission)} · ${mgr ? t('agentShare') : t('yourShare')} ${money(d.agentShare)}${mgr ? ' · ' + esc(pick(user(d.agentId).name)) : ''}</div>
  ${d.stage !== 'closed' ? `<div class="acts">${nxt ? `<button class="btn sm" data-ds="${d.id}:${nxt}" ${nxt === 'closed' && !mgr ? 'disabled title="' + esc(t('managerCloses')) + '"' : ''}>${nxt === 'closed' ? t('closeDeal') : t('advance') + ' ' + t('d_' + nxt)}</button>` : ''}${d.stage === 'offer' ? `<button class="btn sec sm" data-dp="${d.id}">${t('editPrice')}</button>` : ''}<button class="btn sec sm" data-ds="${d.id}:fell_through">${t('fellThrough')}</button></div>${nxt === 'closed' && !mgr ? `<div class="mini" style="margin-top:4px">${t('managerCloses')}</div>` : ''}` : ''}</div>`; };
  return `<h1>${t('dealsTitle')}</h1><div class="pipe">${DSTAGES.map((s) => { const c = open.filter((d) => d.stage === s); return `<div class="col"><h3><span>${t('d_' + s)}</span><span>${nf(c.length)} · ${moneyShort(c.reduce((a, d) => a + d.price, 0))}</span></h3>${c.map(dc).join('')}</div>`; }).join('')}</div>
  <div class="panel"><h3 style="display:flex;gap:10px;align-items:center"><span style="flex:1">${t('ledger')}</span><button class="btn sec sm" id="csv" type="button">${t('exportCsv')}</button></h3><div class="tblwrap"><table class="tbl" style="margin-top:10px"><tr><th>${t('closedOn')}</th><th>${t('property')}</th><th>${t('agreed')}</th><th>${t('commission')}</th><th>${t('agentShare')}</th><th>${t('officeShare')}</th></tr>${closed.map((d) => `<tr><td>${fmtDate(d.closedAt)}</td><td>${esc(listing(d.listingId)?.ref || '')}</td><td>${money(d.price)}</td><td>${money(d.commission)}</td><td>${money(d.agentShare)}</td><td>${money(d.officeShare)}</td></tr>`).join('') || `<tr><td colspan="6" class="muted">${t('nothing')}</td></tr>`}<tr><td colspan="3"><b>${t('totalCommission')}</b></td><td><b>${money(closed.reduce((a, d) => a + d.commission, 0))}</b></td><td><b>${money(closed.reduce((a, d) => a + d.agentShare, 0))}</b></td><td><b>${money(closed.reduce((a, d) => a + d.officeShare, 0))}</b></td></tr></table></div></div>`;
}

function listingsView() {
  const ls = crm.listings.filter((l) => listingFilter === 'all' || l.mine);
  return `<h1><span class="grow">${t('listingsTitle')}</span><button class="btn" id="addListing" type="button">+ ${t('addListing')}</button></h1><div class="tbar"><div class="seg"><button type="button" data-lf="all" aria-pressed="${listingFilter === 'all'}">${lang === 'ar' ? 'الكل' : 'All'}</button><button type="button" data-lf="mine" aria-pressed="${listingFilter === 'mine'}">${t('mine')}</button></div></div>
  <div class="tblwrap"><table class="tbl"><tr><th>${t('property')}</th><th>${t('status')}</th><th>${t('priceF')}</th><th>${t('agent')}</th><th></th></tr>${ls.map((l) => `<tr><td><b>${esc(l.ref)}</b> · ${esc(l.title[lang])}<br><span class="mini">${esc(place(l))} · ${nf(l.area)} ${t('m2')}</span></td><td><span class="badge ${l.status === 'available' ? 'ok' : l.status === 'reserved' ? 'gold' : 'gray'}">${t('st_' + l.status)}</span> ${l.published ? '' : `<span class="badge gray">${t('hidden')}</span>`}</td><td>${money(l.price)}${l.purpose === 'rent' ? ' ' + t('perMonth') : ''}</td><td>${esc(pick(user(l.agentId).name))}</td><td>${l.mine ? `<div class="chips"><button class="btn sec sm" data-lp="${l.id}">${t('editListingPrice')}</button>${l.status === 'available' ? `<button class="btn sec sm" data-lpub="${l.id}:${l.published ? 0 : 1}">${l.published ? t('unpublish') : t('publish')}</button>` : ''}</div>` : ''}${l.published && ['available', 'reserved'].includes(l.status) ? ` <a class="btn sec sm" href="/property?id=${l.id}">${t('viewPublic')}</a>` : ''}</td></tr>`).join('')}</table></div>`;
}
function settingsView() {
  const s = crm.settings;
  return `<h1>${t('settingsTitle')}</h1><div class="cols2"><div class="panel"><form id="sf"><label class="f"><span>${t('saleComm')}</span><input type="number" step="0.1" min="0" max="10" id="s1" value="${s.saleCommissionPct}"></label><label class="f"><span>${t('rentComm')}</span><input type="number" step="0.5" min="0" max="3" id="s2" value="${s.rentCommissionMonths}"></label><label class="f"><span>${t('split')}</span><input type="number" step="5" min="0" max="100" id="s3" value="${s.agentSplitPct}"></label><button class="btn">${t('saveSettings')}</button><p class="mini">${t('settingsNote')}</p></form></div>
  <div class="panel"><h3>${t('demoNotes')}</h3><ul class="mini" style="padding-inline-start:18px"><li>${t('note1')}</li><li>${t('note2')}</li><li>${t('note3')}</li></ul><button class="btn bad sm" type="button" id="reset" style="margin-top:12px">${t('resetDemo')}</button></div></div>`;
}

function modalView() {
  if (!modal) return '';
  const m = modal; let body = '';
  if (m.k === 'lead') body = `<h2>${t('addLead')}</h2><form id="mf"><label class="f"><span>${t('leadName')}</span><input type="text" id="m1" maxlength="80"></label><label class="f"><span>${t('phone')}</span><input type="tel" id="m2" dir="ltr" placeholder="010 1234 5678"></label><div class="row"><label class="f"><span>${t('source')}</span><select id="m3">${SOURCES.map((s) => `<option value="${s}">${t('src_' + s)}</option>`).join('')}</select></label><label class="f"><span>${t('budget')}</span><input type="number" id="m4"></label></div><label class="f"><span>${t('interest')}</span><select id="m5"><option value="">${t('noListing')}</option>${crm.listings.filter((x) => x.status === 'available' && x.published).map((x) => `<option value="${x.id}">${esc(x.ref)} · ${esc(x.title[lang])}</option>`).join('')}</select></label>${isMgr() ? `<label class="f"><span>${t('agent')}</span><select id="m6"><option value="">Auto</option>${crm.users.filter((u) => u.role === 'agent').map((u) => `<option value="${u.id}">${esc(pick(u.name))}</option>`).join('')}</select></label>` : ''}<label class="f"><span>${t('addNote')}</span><textarea id="m7" maxlength="500"></textarea></label><div class="acts"><button type="button" class="btn sec" data-mc>${t('cancel')}</button><button class="btn">${t('create')}</button></div></form>`;
  if (m.k === 'lost') body = `<h2>${t('lostReason')}</h2><form id="mf"><label class="f"><select id="m1">${LOST.map((r) => `<option value="${r}">${t('lost_' + r)}</option>`).join('')}</select></label><div class="acts"><button type="button" class="btn sec" data-mc>${t('cancel')}</button><button class="btn bad">${t('confirm')}</button></div></form>`;
  if (m.k === 'price') body = `<h2>${esc(m.title)}</h2><form id="mf"><label class="f"><span>${t('priceF')}</span><input type="number" id="m1" value="${m.value}"></label><div class="acts"><button type="button" class="btn sec" data-mc>${t('cancel')}</button><button class="btn">${t('save2')}</button></div></form>`;
  if (m.k === 'move') body = `<h2>${t('move')}</h2><form id="mf"><label class="f"><span>${t('newTime')}</span><input type="datetime-local" id="m1" value="${toLocalInput(m.value)}"></label><div class="acts"><button type="button" class="btn sec" data-mc>${t('cancel')}</button><button class="btn">${t('save2')}</button></div></form>`;
  if (m.k === 'listing') body = `<h2>${t('addListing')}</h2><form id="mf"><div class="row"><label class="f"><span>${t('purpose')}</span><select id="m1"><option value="sale">${t('sale')}</option><option value="rent">${t('forRent')}</option></select></label><label class="f"><span>${t('type')}</span><select id="m2">${Object.keys(TYPES).map((k) => `<option value="${k}">${label.type(k)}</option>`).join('')}</select></label></div><label class="f"><span>${t('district')}</span><select id="m3">${Object.keys(DISTRICTS).map((k) => `<option value="${k}">${label.district(k)}</option>`).join('')}</select></label><div class="row"><label class="f"><span>${t('areaM2')}</span><input type="number" id="m4"></label><label class="f"><span>${t('priceF')}</span><input type="number" id="m5"></label></div><div class="row"><label class="f"><span>${t('bedsF')}</span><input type="number" id="m6" min="0" max="10" value="3"></label><label class="f"><span>${t('bathsF')}</span><input type="number" id="m7" min="1" max="10" value="2"></label></div><label class="f"><span>${t('compoundF')}</span><input type="text" id="m8" maxlength="40"></label><div class="acts"><button type="button" class="btn sec" data-mc>${t('cancel')}</button><button class="btn">${t('create')}</button></div></form>`;
  return `<div class="modal-bg" id="mbg"><div class="modal" role="dialog">${body}</div></div>`;
}

function render() {
  applyLang(); document.title = t('crmTitle') + ' | ' + t('brand');
  if (!crm) { $('#app').innerHTML = `${header('crm')}${offline ? `<div class="net">${t('offline')}</div>` : ''}${loginView()}`; bindLang(render); wireLogin(); return; }
  const nav = ['dashboard', 'leads', 'viewings', 'deals', 'listings', ...(isMgr() ? ['settings'] : [])];
  const u = user(crm.me.id); const views = { dashboard, leads: leadsView, viewings: viewingsView, deals: dealsView, listings: listingsView, settings: settingsView };
  const sy = window.scrollY;
  $('#app').innerHTML = `${header('crm', `<button class="lang" id="out" type="button">${t('signOut')}</button>`)}${offline ? `<div class="net">${t('viewOnlyOffline')}</div>` : ''}<div class="crm"><nav class="side"><div class="me"><b>${esc(pick(u.name))}</b><span class="badge">${isMgr() ? t('roleManager') : t('roleAgent')}</span></div>${nav.map((n) => `<a href="#${n}" class="${tab === n ? 'on' : ''}" data-tab="${n}">${t('n_' + n)}</a>`).join('')}</nav><main class="main">${views[tab]()}</main></div>${drawer()}${modalView()}`;
  bindLang(render); wire(); window.scrollTo(0, sy);
}

function wireLogin() {
  $$('[data-u]').forEach((b) => (b.onclick = () => { loginUser = b.dataset.u; loginErr = ''; render(); $('#pin').focus(); }));
  $('#lf').onsubmit = async (e) => { e.preventDefault(); if (!loginUser) return; try { const r = await post({ type: 'auth.login', userId: loginUser, pin: $('#pin').value }); setToken(r.result.token); crm = r.crm; pub = r.listings; tab = 'dashboard'; loginErr = ''; render(); } catch (er) { loginErr = er.status === 401 && /Wrong/.test(er.message) ? t('wrongPin') : er.message; render(); $('#pin')?.focus(); } };
}
const val = (id) => $('#' + id)?.value;
function wire() {
  $('#out').onclick = async () => { try { await post({ type: 'auth.logout' }); } catch {} setToken(''); crm = null; openLead = null; render(); };
  $$('[data-tab]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); tab = a.dataset.tab; openLead = null; history.replaceState(null, '', '#' + tab); render(); }));
  $$('[data-lead]').forEach((b) => (b.onclick = () => { openLead = b.dataset.lead; render(); }));
  const q = $('#lq'); if (q) { q.oninput = () => { lf.q = q.value; render(); const n = $('#lq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }; $('#lsrc').onchange = (e) => { lf.source = e.target.value; render(); }; const ag = $('#lag'); if (ag) ag.onchange = (e) => { lf.agent = e.target.value; render(); }; $$('[data-mode]').forEach((b) => (b.onclick = () => { lf.mode = b.dataset.mode; render(); })); $('#addLead').onclick = () => { modal = { k: 'lead' }; render(); }; }
  if (openLead) {
    const l = lead(openLead); const close = () => { openLead = null; render(); }; $('#dclose').onclick = close; $('#dbg').onclick = close;
    $('#stageSel').onchange = (e) => { if (e.target.value === 'lost') { modal = { k: 'lost', id: l.id }; render(); } else act({ type: 'lead.stage', id: l.id, stage: e.target.value }, t('saved2')); };
    const as = $('#assignSel'); if (as) as.onchange = (e) => e.target.value && act({ type: 'lead.assign', id: l.id, agentId: e.target.value }, t('saved2'));
    $('#postNote').onclick = () => { const v = val('noteText'); if (v.trim()) act({ type: 'lead.note', id: l.id, text: v }); };
    const sn = $('#setNext'); if (sn) { sn.onclick = () => act({ type: 'lead.next', id: l.id, at: fromLocalInput(val('nextAt')), text: val('nextText') }, t('saved2')); $('#bookV').onclick = () => act({ type: 'viewing.create', leadId: l.id, listingId: val('vl'), start: fromLocalInput(val('vat')), durationMin: +val('vdur') }, t('saved2')); $('#mkDeal').onclick = () => act({ type: 'deal.create', leadId: l.id, listingId: val('dl'), price: +val('dprice') }, t('saved2')); }
  }
  $$('[data-vs]').forEach((b) => (b.onclick = () => { const [id, st] = b.dataset.vs.split(':'); act({ type: 'viewing.status', id, status: st }, t('saved2')); }));
  $$('[data-vmove]').forEach((b) => (b.onclick = () => { modal = { k: 'move', id: b.dataset.vmove, value: crm.viewings.find((v) => v.id === b.dataset.vmove).start }; render(); }));
  $$('[data-ds]').forEach((b) => (b.onclick = () => { const [id, st] = b.dataset.ds.split(':'); act({ type: 'deal.stage', id, stage: st }, t('saved2')); }));
  $$('[data-dp]').forEach((b) => (b.onclick = () => { const d = crm.deals.find((x) => x.id === b.dataset.dp); modal = { k: 'price', op: 'deal.price', id: d.id, value: d.price, title: t('editPrice') }; render(); }));
  $$('[data-lp]').forEach((b) => (b.onclick = () => { const l = crm.listings.find((x) => x.id === b.dataset.lp); modal = { k: 'price', op: 'listing.update', id: l.id, value: l.price, title: l.ref }; render(); }));
  $$('[data-lpub]').forEach((b) => (b.onclick = () => { const [id, v] = b.dataset.lpub.split(':'); act({ type: 'listing.update', id, published: v === '1' }, t('saved2')); }));
  $$('[data-lf]').forEach((b) => (b.onclick = () => { listingFilter = b.dataset.lf; render(); }));
  const al = $('#addListing'); if (al) al.onclick = () => { modal = { k: 'listing' }; render(); };
  const csv = $('#csv'); if (csv) csv.onclick = () => { const rows = [['closed', 'ref', 'price', 'commission', 'agent_share', 'office_share'], ...crm.deals.filter((d) => d.stage === 'closed').map((d) => [new Date(d.closedAt).toISOString().slice(0, 10), listing(d.listingId)?.ref, d.price, d.commission, d.agentShare, d.officeShare])]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })); a.download = 'commission-ledger.csv'; a.click(); };
  const sf = $('#sf'); if (sf) sf.onsubmit = (e) => { e.preventDefault(); act({ type: 'settings.update', saleCommissionPct: +val('s1'), rentCommissionMonths: +val('s2'), agentSplitPct: +val('s3') }, t('saved2')); };
  const rs = $('#reset'); if (rs) rs.onclick = async () => { if (!confirm(t('resetAsk'))) return; try { await post({ type: 'reset' }); setToken(''); crm = null; toast(t('saved2')); const r = await load(); pub = r.data.listings; render(); } catch (e) { toast(e.message, true); } };
  if (modal) {
    const close = () => { modal = null; render(); }; $$('[data-mc]').forEach((b) => (b.onclick = close)); $('#mbg').onclick = (e) => e.target.id === 'mbg' && close();
    $('#mf').onsubmit = async (e) => {
      e.preventDefault(); const m = modal; let op;
      if (m.k === 'lead') op = { type: 'lead.create', name: val('m1'), phone: val('m2'), source: val('m3'), budget: val('m4'), listingId: val('m5') || null, agentId: val('m6') || null, note: val('m7') };
      if (m.k === 'lost') op = { type: 'lead.stage', id: m.id, stage: 'lost', reason: val('m1') };
      if (m.k === 'price') op = m.op === 'deal.price' ? { type: 'deal.price', id: m.id, price: +val('m1') } : { type: 'listing.update', id: m.id, price: +val('m1') };
      if (m.k === 'move') op = { type: 'viewing.move', id: m.id, start: fromLocalInput(val('m1')) };
      if (m.k === 'listing') op = { type: 'listing.create', purpose: val('m1'), ptype: val('m2'), district: val('m3'), area: +val('m4'), price: +val('m5'), beds: +val('m6'), baths: +val('m7'), compound: val('m8') };
      const r = await act(op, t('saved2')); if (r) { modal = null; render(); }
    };
  }
}
window.addEventListener('online', () => { offline = false; boot(); }); window.addEventListener('offline', () => { offline = true; render(); });
if (location.hash && ['dashboard', 'leads', 'viewings', 'deals', 'listings', 'settings'].includes(location.hash.slice(1))) tab = location.hash.slice(1);
render(); boot(); registerSW();
