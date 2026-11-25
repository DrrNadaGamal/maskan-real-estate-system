import { $, $$, esc, t, lang, header, bindLang, load, nf, money, label, place, toast, favs, registerSW, applyLang } from './common.js';
import { propertyArt } from './art.js';
import { CITIES, DISTRICTS, TYPES, AMENITIES, NEAR, FINISH, SORTS, filterListings, sortListings, districtCounts, queryToFilters, filtersToQuery, instalment, ppm } from './shared.js';

let L = [], f = queryToFilters(location.search), _p = (f.purpose = f.purpose || 'sale'), offline = false, savedOnly = false, loaded = false, err = '';
const PRICE_STEPS = { sale: [1e6, 2e6, 3e6, 5e6, 8e6, 12e6, 20e6], rent: [8e3, 12e3, 18e3, 25e3, 40e3, 60e3] };

function syncUrl() { const q = filtersToQuery(f); history.replaceState(null, '', q ? '?' + q : location.pathname); }
const set = (patch) => { Object.assign(f, patch); for (const k of Object.keys(f)) if (f[k] === undefined) delete f[k]; syncUrl(); render(); };
const toggleIn = (key, v) => { const a = new Set(f[key] || []); a.has(v) ? a.delete(v) : a.add(v); set({ [key]: [...a] }); };

function results() { let r = filterListings(L, f); if (savedOnly) r = r.filter((l) => favs.has(l.id)); return sortListings(r, f.sort || 'newest'); }

function card(l) {
  const plan = l.plan && instalment(l.price, l.plan.downPct, l.plan.years);
  return `<a class="card" href="/property?id=${l.id}" data-id="${l.id}">
    <div class="img">${propertyArt(l)}<div class="tags"><span class="badge">${l.purpose === 'sale' ? t('sale') : t('forRent')}</span>${l.status === 'reserved' ? `<span class="badge rsv">${t('reserved')}</span>` : ''}</div>
    <button class="heart" type="button" data-fav="${l.id}" aria-pressed="${favs.has(l.id)}" aria-label="${favs.has(l.id) ? t('unsave') : t('save')}">${favs.has(l.id) ? '♥' : '♡'}</button></div>
    <div class="b"><div class="price">${money(l.price)}${l.purpose === 'rent' ? ` <small>${t('perMonth')}</small>` : ''}</div>
    ${l.purpose === 'sale' ? `<div class="sub">${money(Math.round(ppm(l) / 100) * 100)} ${t('perM2')}${plan ? ` · ${t('from')} ${money(plan.monthly)} ${t('unitPerMonth')}` : ''}</div>` : ''}
    <h3>${esc(l.title[lang])}</h3><div class="loc">${esc(l.compound ? l.compound + ' · ' : '')}${esc(place(l))}</div>
    <div class="specs">${l.beds ? `<span>${nf(l.beds)} ${t('beds')}</span><span>${nf(l.baths)} ${t('baths')}</span>` : `<span>${label.type(l.type)}</span>`}<span>${nf(l.area)} ${t('m2')}</span></div></div></a>`;
}

function filtersPanel() {
  const types = f.types || [], am = f.amenities || [], near = f.near || [], counts = districtCounts(L, f);
  const dKeys = Object.keys(DISTRICTS).filter((k) => !f.city || DISTRICTS[k].city === f.city);
  const steps = PRICE_STEPS[f.purpose === 'rent' ? 'rent' : 'sale'];
  const numChips = (key, arr) => `<div class="chips">${[0, ...arr].map((n) => `<button type="button" class="chip" aria-pressed="${(f[key] || 0) === n}" data-num="${key}" data-v="${n}">${n ? n + '+' : t('any')}</button>`).join('')}</div>`;
  return `<h3>${t('propType')}</h3><div class="chips">${Object.keys(TYPES).map((k) => `<button type="button" class="chip" aria-pressed="${types.includes(k)}" data-type="${k}">${label.type(k)}</button>`).join('')}</div>
  <h3>${t('location')}</h3><div class="chips"><button type="button" class="chip" aria-pressed="${!f.city}" data-city="">${t('allCities')}</button>${Object.keys(CITIES).map((k) => `<button type="button" class="chip" aria-pressed="${f.city === k}" data-city="${k}">${label.city(k)}</button>`).join('')}</div>
  <div class="dlist">${dKeys.map((k) => `<label><input type="checkbox" data-dist="${k}" ${(f.districts || []).includes(k) ? 'checked' : ''}>${label.district(k)}<span class="n">${nf(counts[k] || 0)}</span></label>`).join('')}</div>
  <label class="switch"><input type="checkbox" id="nearby" ${f.nearby ? 'checked' : ''}><span>${t('includeNearby')}<br><small class="muted">${t('nearbyHint')}</small></span></label>
  <h3>${t('price')} (${t('egp')}${f.purpose === 'rent' ? ' ' + t('perMonth') : ''})</h3><div class="row"><input type="number" inputmode="numeric" min="0" step="1000" placeholder="${t('min')}" id="minPrice" value="${f.minPrice || ''}"><input type="number" inputmode="numeric" min="0" step="1000" placeholder="${t('max')}" id="maxPrice" value="${f.maxPrice || ''}"></div>
  <div class="chips" style="margin-top:8px">${steps.map((v) => `<button type="button" class="chip" aria-pressed="${f.maxPrice === v}" data-maxp="${v}"><small>≤</small> ${nf(v / (v >= 1e6 ? 1e6 : 1e3))}${v >= 1e6 ? (lang === 'ar' ? ' مليون' : 'M') : 'K'}</button>`).join('')}</div>
  <h3>${t('bedrooms')}</h3>${numChips('beds', [1, 2, 3, 4, 5])}<h3>${t('bathrooms')}</h3>${numChips('baths', [1, 2, 3, 4])}
  <h3>${t('size')}</h3><div class="row"><input type="number" inputmode="numeric" min="0" placeholder="${t('min')}" id="minArea" value="${f.minArea || ''}"><input type="number" inputmode="numeric" min="0" placeholder="${t('max')}" id="maxArea" value="${f.maxArea || ''}"></div>
  <h3>${t('finishing')}</h3><select id="finishing"><option value="">${t('any')}</option>${Object.keys(FINISH).map((k) => `<option value="${k}" ${f.finishing === k ? 'selected' : ''}>${label.finish(k)}</option>`).join('')}</select>
  ${f.purpose === 'rent' ? `<label class="switch"><input type="checkbox" id="furnished" ${f.furnished ? 'checked' : ''}><span>${t('furnished')}</span></label>` : ''}
  ${f.purpose !== 'rent' ? `<label class="switch"><input type="checkbox" id="installments" ${f.installments ? 'checked' : ''}><span>${t('installments')}</span></label>` : ''}
  <h3>${t('amenities')}</h3><div class="chips">${Object.keys(AMENITIES).map((k) => `<button type="button" class="chip" aria-pressed="${am.includes(k)}" data-am="${k}">${label.amenity(k)}</button>`).join('')}</div>
  <h3>${t('nearTo')}</h3><div class="chips">${Object.keys(NEAR).map((k) => `<button type="button" class="chip" aria-pressed="${near.includes(k)}" data-near="${k}">${label.near(k)}</button>`).join('')}</div>
  <div class="closebar"><button class="btn sec" type="button" id="clearF">${t('clear')}</button><button class="btn" type="button" id="closeF">${t('showResults')}</button></div>`;
}

function activeChips() {
  const out = [];
  const add = (txt, fn) => out.push([txt, fn]);
  for (const k of f.types || []) add(label.type(k), () => toggleIn('types', k));
  if (f.city) add(label.city(f.city), () => set({ city: undefined, districts: undefined }));
  for (const k of f.districts || []) add(label.district(k), () => toggleIn('districts', k));
  if (f.nearby && (f.districts || []).length) add(t('includeNearby'), () => set({ nearby: undefined }));
  if (f.minPrice) add(`${t('min')} ${money(f.minPrice)}`, () => set({ minPrice: undefined }));
  if (f.maxPrice) add(`${t('max')} ${money(f.maxPrice)}`, () => set({ maxPrice: undefined }));
  if (f.beds) add(`${f.beds}+ ${t('beds')}`, () => set({ beds: undefined }));
  if (f.baths) add(`${f.baths}+ ${t('baths')}`, () => set({ baths: undefined }));
  if (f.minArea || f.maxArea) add(`${f.minArea || ''}–${f.maxArea || ''} ${t('m2')}`, () => set({ minArea: undefined, maxArea: undefined }));
  if (f.finishing) add(label.finish(f.finishing), () => set({ finishing: undefined }));
  if (f.furnished) add(t('furnished'), () => set({ furnished: undefined }));
  if (f.installments) add(t('installments'), () => set({ installments: undefined }));
  for (const k of f.amenities || []) add(label.amenity(k), () => toggleIn('amenities', k));
  for (const k of f.near || []) add(label.near(k), () => toggleIn('near', k));
  if (savedOnly) add(t('savedOnly'), () => { savedOnly = false; render(); });
  return out;
}

let chipFns = [];
function render(keepFocus) {
  applyLang(); document.title = t('brand') + ' | ' + t('tagline');
  const active = document.activeElement?.id; const sel = document.activeElement?.selectionStart;
  const res = loaded ? results() : []; chipFns = activeChips();
  const purpose = f.purpose === 'rent' ? 'rent' : 'sale';
  $('#app').innerHTML = `${header('home')}${offline ? `<div class="net">${t('offline')}</div>` : ''}
  <section class="hero"><h1>${t('heroTitle')}</h1><p>${t('heroSub')}</p>
  <div class="seg" role="group"><button type="button" data-purpose="sale" aria-pressed="${purpose === 'sale'}">${t('buy')}</button><button type="button" data-purpose="rent" aria-pressed="${f.purpose === 'rent'}">${t('rent')}</button></div>
  <form class="searchbar" id="qform"><input type="search" id="q" placeholder="${esc(t('searchPh'))}" value="${esc(f.q || '')}" aria-label="${esc(t('searchPh'))}"><button class="btn" type="submit">${t('search')}</button></form></section>
  <div class="wrap"><div class="fbar"><button class="btn sec" type="button" id="openF">${t('filters')}${chipFns.length ? ` (${chipFns.length})` : ''}</button></div>
  <div class="layout"><aside class="panel filters" id="filters">${filtersPanel()}</aside>
  <main><div class="rhead"><h2 id="count" aria-live="polite">${loaded ? nf(res.length) + ' ' + (res.length === 1 ? t('result') : t('results')) : t('loading')}</h2>
  <button class="chip" type="button" id="savedBtn" aria-pressed="${savedOnly}">♥ ${t('saved')} (${nf(favs.get().length)})</button>
  <label class="sr" for="sort">${t('sortBy')}</label><select id="sort">${SORTS.map((s) => `<option value="${s}" ${(f.sort || 'newest') === s ? 'selected' : ''}>${t('sort_' + s)}</option>`).join('')}</select>
  ${chipFns.length ? `<button class="btn sec sm" type="button" id="clearAll">${t('clear')}</button>` : ''}</div>
  ${chipFns.length ? `<div class="active-chips">${chipFns.map(([txt], i) => `<button type="button" data-chip="${i}">${esc(txt)} ×</button>`).join('')}</div>` : ''}
  ${err ? `<div class="empty"><b>${esc(err)}</b></div>` : !loaded ? '' : res.length ? `<div class="grid">${res.map(card).join('')}</div>` : `<div class="empty"><b>${t('noResults')}</b>${t('noResultsHint')}</div>`}
  </main></div></div>`;
  bindLang(() => render()); wire();
  if (keepFocus && active) { const el = document.getElementById(active); if (el) { el.focus(); try { el.setSelectionRange(sel, sel); } catch {} } }
}

function wire() {
  const app = $('#app');
  $$('[data-purpose]', app).forEach((b) => (b.onclick = () => set({ purpose: b.dataset.purpose, furnished: undefined, installments: undefined, minPrice: undefined, maxPrice: undefined })));
  $('#qform').onsubmit = (e) => { e.preventDefault(); set({ q: $('#q').value.trim() || undefined }); $('main')?.scrollIntoView({ behavior: 'smooth' }); };
  $('#q').oninput = (e) => { f.q = e.target.value.trim() || undefined; if (!f.q) delete f.q; syncUrl(); const res = results(); $('#count').textContent = nf(res.length) + ' ' + (res.length === 1 ? t('result') : t('results')); const g = $('.grid'); if (g) g.innerHTML = res.map(card).join(''); wireCards(); };
  $('#sort').onchange = (e) => set({ sort: e.target.value === 'newest' ? undefined : e.target.value });
  $('#savedBtn').onclick = () => { savedOnly = !savedOnly; render(); };
  $$('[data-type]', app).forEach((b) => (b.onclick = () => toggleIn('types', b.dataset.type)));
  $$('[data-am]', app).forEach((b) => (b.onclick = () => toggleIn('amenities', b.dataset.am)));
  $$('[data-near]', app).forEach((b) => (b.onclick = () => toggleIn('near', b.dataset.near)));
  $$('[data-city]', app).forEach((b) => (b.onclick = () => set({ city: b.dataset.city || undefined, districts: undefined })));
  $$('[data-dist]', app).forEach((b) => (b.onchange = () => toggleIn('districts', b.dataset.dist)));
  $$('[data-num]', app).forEach((b) => (b.onclick = () => set({ [b.dataset.num]: +b.dataset.v || undefined })));
  $$('[data-maxp]', app).forEach((b) => (b.onclick = () => set({ maxPrice: f.maxPrice === +b.dataset.maxp ? undefined : +b.dataset.maxp })));
  for (const id of ['minPrice', 'maxPrice', 'minArea', 'maxArea']) { const el = $('#' + id); if (el) el.onchange = () => set({ [id]: +el.value > 0 ? +el.value : undefined }); }
  $('#finishing').onchange = (e) => set({ finishing: e.target.value || undefined });
  $('#nearby').onchange = (e) => set({ nearby: e.target.checked || undefined });
  const fu = $('#furnished'); if (fu) fu.onchange = (e) => set({ furnished: e.target.checked || undefined });
  const ins = $('#installments'); if (ins) ins.onchange = (e) => set({ installments: e.target.checked || undefined });
  $$('[data-chip]', app).forEach((b) => (b.onclick = () => chipFns[+b.dataset.chip][1]()));
  const clear = () => { f = f.purpose ? { purpose: f.purpose } : {}; savedOnly = false; syncUrl(); render(); };
  $('#clearAll') && ($('#clearAll').onclick = clear); $('#clearF').onclick = clear;
  $('#openF').onclick = () => { $('#filters').classList.add('open'); }; $('#closeF').onclick = () => $('#filters').classList.remove('open');
  wireCards();
}
function wireCards() {
  $$('[data-fav]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); const on = favs.toggle(b.dataset.fav); b.setAttribute('aria-pressed', on); b.textContent = on ? '♥' : '♡'; $('#savedBtn').innerHTML = `♥ ${t('saved')} (${nf(favs.get().length)})`; if (savedOnly) render(); }));
}

window.addEventListener('online', () => { init(); toast(t('online')); }); window.addEventListener('offline', () => { offline = true; render(true); });
async function init() { try { const r = await load(); L = r.data.listings; offline = r.offline || !navigator.onLine; err = ''; loaded = true; } catch { err = t('loadFail'); loaded = true; } render(true); }
render(); init(); registerSW();
