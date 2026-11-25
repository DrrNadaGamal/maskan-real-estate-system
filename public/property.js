import { $, $$, esc, t, lang, header, bindLang, load, post, isNetErr, nf, money, label, place, toast, favs, registerSW, applyLang, pick, fmtDate } from './common.js';
import { propertyArt, viewsFor } from './art.js';
import { DISTRICTS, filterListings, instalment, ppm, sortListings, filtersToQuery } from './shared.js';

const id = new URLSearchParams(location.search).get('id');
let L = [], cur = null, view = 0, offline = false, sent = null, calc = { down: null, years: null }, form = { name: '', phone: '', message: '', pref: '' }, errs = {}, busy = false;
const QKEY = 'maskan_inquiry_queue';
const queue = { get: () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch { return []; } }, set: (a) => localStorage.setItem(QKEY, JSON.stringify(a)) };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'k' + Date.now() + Math.random().toString(16).slice(2));

async function flushQueue() {
  const q = queue.get(); if (!q.length || !navigator.onLine) return; const left = [];
  for (const item of q) { try { await post(item); } catch (e) { if (isNetErr(e)) left.push(item); /* a server rejection is dropped: retrying cannot fix it */ } }
  queue.set(left); if (left.length < q.length) toast(t('sentTitle'));
}

function gallery(l) {
  const vs = viewsFor(l); const v = vs[view % vs.length];
  return `<div class="gal-main">${propertyArt(l, v)}<button class="gal-nav p" type="button" data-nav="-1" aria-label="previous">${lang === 'ar' ? '›' : '‹'}</button><button class="gal-nav n" type="button" data-nav="1" aria-label="next">${lang === 'ar' ? '‹' : '›'}</button></div>
  <div class="thumbs">${vs.map((x, i) => `<button type="button" data-view="${i}" aria-current="${i === view % vs.length}" aria-label="${t('v_' + x)}">${propertyArt(l, x)}<span>${t('v_' + x)}</span></button>`).join('')}</div><div class="mini" style="margin-top:6px">${t('imgNote')}</div>`;
}
function calcBlock(l) {
  if (l.purpose === 'rent') return `<div class="sect panel"><h2>${t('rentYear')}</h2><div class="pprice">${money(l.price * 12)}</div></div>`;
  if (!l.plan) return '';
  const down = calc.down ?? l.plan.downPct, years = calc.years ?? l.plan.years; const c = instalment(l.price, down, years);
  return `<div class="sect panel calc"><h2>${t('plan')}</h2>
  <label class="f"><span>${t('downPct')}: <b>${nf(down)}%</b></span><input type="range" id="down" min="5" max="50" step="5" value="${down}"></label>
  <label class="f"><span>${t('years')}: <b>${nf(years)}</b></span><input type="range" id="years" min="1" max="10" step="1" value="${years}"></label>
  <div class="out"><div><span class="muted">${t('downAmt')}</span><b>${money(c.down)}</b></div><div><span class="muted">${t('monthlyAmt')}</span><b>${money(c.monthly)}</b></div></div><div class="mini" style="margin-top:8px">${t('planNote')}</div></div>`;
}
function inquiry(l) {
  if (sent) return `<aside class="panel inq"><div class="sentbox"><div class="tick">${sent.queued ? '⏳' : '✓'}</div><h2>${sent.queued ? t('queuedTitle') : t('sentTitle')}</h2>
    <p>${sent.queued ? t('queued') : `${esc(pick(l.agent))} ${t('sentBody')} <b dir="ltr">${esc(sent.phone)}</b>.`}</p>${sent.merged ? `<p class="mini">${t('sentMerged')}</p>` : ''}<button class="btn sec" type="button" id="again">${t('again')}</button></div></aside>`;
  return `<aside class="panel inq"><h2>${t('inquiryTitle')}</h2><p class="muted" style="margin:4px 0 14px">${t('inquirySub')}</p>
  <div class="li" style="margin-bottom:14px"><div class="grow"><b>${esc(pick(l.agent))}</b><span class="mini">${t('agentRole')}</span></div></div>
  <form id="inq" novalidate><label class="f"><span>${t('yourName')}</span><input type="text" id="name" autocomplete="name" maxlength="80" value="${esc(form.name)}">${errs.name ? `<div class="err">${t('errName')}</div>` : ''}</label>
  <label class="f"><span>${t('phone')}</span><input type="tel" id="phone" inputmode="tel" autocomplete="tel" dir="ltr" placeholder="010 1234 5678" value="${esc(form.phone)}"><div class="mini">${t('phoneHint')}</div>${errs.phone ? `<div class="err">${t('errPhone')}</div>` : ''}</label>
  <label class="f"><span>${t('message')}</span><textarea id="message" maxlength="600" placeholder="${esc(t('msgPh'))}">${esc(form.message)}</textarea></label>
  <label class="f"><span>${t('viewPref')}</span><select id="pref">${['', 'morning', 'afternoon', 'evening'].map((k) => `<option value="${k}" ${form.pref === k ? 'selected' : ''}>${t('vp_' + (k || 'none'))}</option>`).join('')}</select></label>
  <input class="hp" type="text" id="company" tabindex="-1" autocomplete="off" aria-hidden="true">
  ${errs.send ? `<div class="err">${esc(errs.send)}</div>` : ''}<button class="btn" style="width:100%" type="submit" ${busy ? 'disabled' : ''}>${busy ? t('sending') : t('send')}</button></form></aside>`;
}
function similar(l) {
  const pool = filterListings(L, { purpose: l.purpose }).filter((x) => x.id !== l.id);
  const score = (x) => (x.district === l.district ? 0 : DISTRICTS[x.district].city === DISTRICTS[l.district].city ? 2 : 4) + (x.type === l.type ? 0 : 3) + Math.abs(Math.log(x.price / l.price)) * 3;
  return pool.sort((a, b) => score(a) - score(b)).slice(0, 3);
}
function render() {
  applyLang(); const l = cur;
  if (!l) { $('#app').innerHTML = `${header('home')}<div class="pwrap"><div class="empty"><b>${loadedErr ? t('notFound') : t('loading')}</b><a href="/">${t('backToSearch')}</a></div></div>`; bindLang(render); return; }
  document.title = `${l.title[lang]} | ${t('brand')}`; const d = DISTRICTS[l.district]; const near = d.near.filter((k) => true);
  const plan = l.plan && instalment(l.price, l.plan.downPct, l.plan.years);
  $('#app').innerHTML = `${header('home')}${offline ? `<div class="net">${t('offline')}</div>` : ''}<div class="pwrap">
  <div class="crumb"><a href="/">${t('breadcrumbHome')}</a> › ${esc(label.district(l.district))}</div>
  <div class="pgrid"><div>${gallery(l)}
  <div class="ptitle"><div><h1>${esc(l.title[lang])}</h1><div class="muted">${esc(l.compound ? l.compound + ' · ' : '')}${esc(place(l))} · ${t('ref')} <span dir="ltr">${esc(l.ref)}</span></div></div>
  <div style="text-align:end"><div class="pprice">${money(l.price)}${l.purpose === 'rent' ? ` <small>${t('perMonth')}</small>` : ''}</div>${l.purpose === 'sale' ? `<div class="sub">${money(Math.round(ppm(l) / 100) * 100)} ${t('perM2')}</div>` : ''}${l.status === 'reserved' ? `<span class="badge gold">${t('reserved')}</span>` : ''}</div></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec sm" id="fav" type="button" aria-pressed="${favs.has(l.id)}">${favs.has(l.id) ? '♥ ' + t('unsave') : '♡ ' + t('save')}</button><button class="btn sec sm" id="copy" type="button">${t('share')}</button></div>
  <div class="facts">${l.beds ? `<div class="fact"><b>${nf(l.beds)}</b><span>${t('bedsFull')}</span></div><div class="fact"><b>${nf(l.baths)}</b><span>${t('bathsFull')}</span></div>` : ''}<div class="fact"><b>${nf(l.area)} ${t('m2')}</b><span>${t('size')}</span></div><div class="fact"><b>${label.type(l.type)}</b><span>${t('propType')}</span></div><div class="fact"><b>${label.finish(l.finishing)}</b><span>${t('finishing')}</span></div>${l.floor != null ? `<div class="fact"><b>${nf(l.floor)}</b><span>${t('floor')}</span></div>` : ''}${l.delivery ? `<div class="fact"><b>${nf(l.delivery).replace(/[,٬]/g, '')}</b><span>${t('delivery')}</span></div>` : ''}</div>
  <div class="sect"><h2>${t('about')}</h2><p>${esc(l.desc[lang])}</p></div>
  ${l.amenities.length ? `<div class="sect"><h2>${t('features')}</h2><div class="chips">${l.amenities.map((a) => `<span class="chip">${label.amenity(a)}</span>`).join('')}</div></div>` : ''}
  ${l.near.length ? `<div class="sect"><h2>${t('closeTo')}</h2><div class="chips">${l.near.map((a) => `<span class="chip">${label.near(a)}</span>`).join('')}</div></div>` : ''}
  <div class="sect"><h2>${t('areaInfo')}: ${esc(place(l))}</h2><p class="muted">${t('nearbyAreas')}:</p><div class="chips">${near.map((k) => `<a class="chip" href="/?${filtersToQuery({ purpose: l.purpose, districts: [k] })}">${label.district(k)}</a>`).join('')}<a class="chip on" href="/?${filtersToQuery({ purpose: l.purpose, districts: [l.district], nearby: true })}">${t('seeInArea')} ${label.district(l.district)} + ${t('nearbyAreas')}</a></div></div>
  ${calcBlock(l)}</div>${inquiry(l)}</div>
  <div class="sect"><h2>${t('similar')}</h2><div class="grid">${similar(l).map((x) => `<a class="card" href="/property?id=${x.id}"><div class="img">${propertyArt(x)}</div><div class="b"><div class="price">${money(x.price)}${x.purpose === 'rent' ? ` <small>${t('perMonth')}</small>` : ''}</div><h3>${esc(x.title[lang])}</h3><div class="loc">${esc(place(x))}</div></div></a>`).join('')}</div></div></div>`;
  bindLang(render); wire();
}
function wire() {
  $$('[data-nav]').forEach((b) => (b.onclick = () => { const n = viewsFor(cur).length; view = (view + +b.dataset.nav + n) % n; render(); }));
  $$('[data-view]').forEach((b) => (b.onclick = () => { view = +b.dataset.view; render(); }));
  $('#fav').onclick = () => { favs.toggle(cur.id); render(); };
  $('#copy').onclick = async () => { try { await navigator.clipboard.writeText(location.href); toast(t('copied')); } catch { toast(location.href); } };
  const dn = $('#down'), yr = $('#years'); if (dn) { dn.oninput = () => { calc.down = +dn.value; render(); $('#down')?.focus(); }; yr.oninput = () => { calc.years = +yr.value; render(); $('#years')?.focus(); }; }
  const again = $('#again'); if (again) again.onclick = () => { sent = null; form = { name: '', phone: '', message: '', pref: '' }; render(); };
  const fm = $('#inq'); if (!fm) return;
  const keep = () => { form = { name: $('#name').value, phone: $('#phone').value, message: $('#message').value, pref: $('#pref').value }; };
  for (const x of ['name', 'phone', 'message', 'pref']) $('#' + x).oninput = keep;
  fm.onsubmit = async (e) => {
    e.preventDefault(); keep(); errs = {};
    if (form.name.trim().length < 2) errs.name = 1;
    if (!/^(?:\+?20|0020|0)?1[0125]\d{8}$/.test(form.phone.replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[\s\-().]/g, ''))) errs.phone = 1;
    if (errs.name || errs.phone) return render();
    busy = true; render();
    const op = { type: 'inquiry.create', key: uid(), listingId: cur.id, name: form.name, phone: form.phone, message: form.message, viewingPref: form.pref ? t('vp_' + form.pref) : '', company: $('#company')?.value || '' };
    try { const r = await post(op); busy = false; sent = { phone: form.phone, merged: r.result?.merged }; }
    catch (err) {
      busy = false;
      if (isNetErr(err)) { queue.set([...queue.get(), op]); sent = { phone: form.phone, queued: true }; }
      else errs.send = err.message;
    }
    render();
  };
}
let loadedErr = false;
async function init() {
  try { const r = await load(); L = r.data.listings; offline = r.offline || !navigator.onLine; cur = L.find((x) => x.id === id) || null; loadedErr = !cur; } catch { loadedErr = true; }
  render(); flushQueue();
}
window.addEventListener('online', () => { flushQueue(); init(); });
render(); init(); registerSW();
