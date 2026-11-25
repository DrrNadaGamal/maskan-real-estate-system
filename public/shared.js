// Pure code shared by the browser, the API and the tests: place taxonomy, listing search, nearby areas.
// No DOM and no I/O in this file.

export const CITIES = {
  cairo: { en: 'Cairo', ar: 'القاهرة' }, giza: { en: 'Giza', ar: 'الجيزة' }, alex: { en: 'Alexandria', ar: 'الإسكندرية' },
  north_coast: { en: 'North Coast', ar: 'الساحل الشمالي' }, red_sea: { en: 'Red Sea', ar: 'البحر الأحمر' },
};
// ppm = illustrative sale price per m2 (EGP), rent = illustrative monthly rent per m2 (EGP). Demo numbers, not market data.
export const DISTRICTS = {
  new_cairo: { city: 'cairo', en: 'New Cairo', ar: 'القاهرة الجديدة', ppm: 62000, rent: 230, near: ['shorouk', 'madinaty', 'nasr_city', 'heliopolis'] },
  maadi: { city: 'cairo', en: 'Maadi', ar: 'المعادي', ppm: 72000, rent: 260, near: ['zamalek', 'dokki'] },
  heliopolis: { city: 'cairo', en: 'Heliopolis', ar: 'مصر الجديدة', ppm: 56000, rent: 210, near: ['nasr_city', 'new_cairo'] },
  nasr_city: { city: 'cairo', en: 'Nasr City', ar: 'مدينة نصر', ppm: 42000, rent: 170, near: ['heliopolis', 'new_cairo'] },
  zamalek: { city: 'cairo', en: 'Zamalek', ar: 'الزمالك', ppm: 120000, rent: 380, near: ['dokki', 'mohandessin', 'maadi'] },
  shorouk: { city: 'cairo', en: 'El Shorouk', ar: 'الشروق', ppm: 33000, rent: 130, near: ['new_cairo', 'madinaty'] },
  madinaty: { city: 'cairo', en: 'Madinaty', ar: 'مدينتي', ppm: 46000, rent: 175, near: ['new_cairo', 'shorouk'] },
  sheikh_zayed: { city: 'giza', en: 'Sheikh Zayed', ar: 'الشيخ زايد', ppm: 56000, rent: 200, near: ['october', 'mohandessin'] },
  october: { city: 'giza', en: '6th of October', ar: 'السادس من أكتوبر', ppm: 36000, rent: 140, near: ['sheikh_zayed'] },
  dokki: { city: 'giza', en: 'Dokki', ar: 'الدقي', ppm: 66000, rent: 240, near: ['mohandessin', 'zamalek'] },
  mohandessin: { city: 'giza', en: 'Mohandessin', ar: 'المهندسين', ppm: 70000, rent: 250, near: ['dokki', 'zamalek', 'sheikh_zayed'] },
  smouha: { city: 'alex', en: 'Smouha', ar: 'سموحة', ppm: 50000, rent: 180, near: ['san_stefano', 'sidi_bishr'] },
  san_stefano: { city: 'alex', en: 'San Stefano', ar: 'سان ستيفانو', ppm: 90000, rent: 300, near: ['smouha', 'sidi_bishr'] },
  sidi_bishr: { city: 'alex', en: 'Sidi Bishr', ar: 'سيدي بشر', ppm: 45000, rent: 160, near: ['smouha', 'san_stefano'] },
  sidi_abdelrahman: { city: 'north_coast', en: 'Sidi Abdel Rahman', ar: 'سيدي عبد الرحمن', ppm: 78000, rent: 300, near: ['ras_el_hekma'] },
  ras_el_hekma: { city: 'north_coast', en: 'Ras El Hekma', ar: 'رأس الحكمة', ppm: 95000, rent: 340, near: ['sidi_abdelrahman'] },
  hurghada: { city: 'red_sea', en: 'Hurghada', ar: 'الغردقة', ppm: 46000, rent: 170, near: ['el_gouna'] },
  el_gouna: { city: 'red_sea', en: 'El Gouna', ar: 'الجونة', ppm: 110000, rent: 380, near: ['hurghada'] },
};
// make nearby links symmetric
for (const [k, d] of Object.entries(DISTRICTS)) for (const n of d.near) if (!DISTRICTS[n].near.includes(k)) DISTRICTS[n].near.push(k);

export const TYPES = {
  apartment: { en: 'Apartment', ar: 'شقة', res: true }, duplex: { en: 'Duplex', ar: 'دوبلكس', res: true }, villa: { en: 'Villa', ar: 'فيلا', res: true },
  townhouse: { en: 'Townhouse', ar: 'تاون هاوس', res: true }, studio: { en: 'Studio', ar: 'ستوديو', res: true }, chalet: { en: 'Chalet', ar: 'شاليه', res: true },
  office: { en: 'Office', ar: 'مكتب', res: false }, shop: { en: 'Shop', ar: 'محل', res: false },
};
export const AMENITIES = {
  parking: { en: 'Parking', ar: 'جراج' }, elevator: { en: 'Elevator', ar: 'أسانسير' }, security: { en: '24/7 security', ar: 'أمن 24 ساعة' }, garden: { en: 'Private garden', ar: 'حديقة خاصة' },
  pool: { en: 'Pool', ar: 'حمام سباحة' }, gym: { en: 'Gym', ar: 'جيم' }, balcony: { en: 'Balcony', ar: 'بلكونة' }, central_ac: { en: 'Central A/C', ar: 'تكييف مركزي' },
  maid_room: { en: "Maid's room", ar: 'غرفة خادمة' }, sea_view: { en: 'Sea view', ar: 'إطلالة على البحر' }, club: { en: 'Club access', ar: 'عضوية نادي' }, kids_area: { en: 'Kids area', ar: 'منطقة أطفال' },
};
export const NEAR = { metro: { en: 'Metro', ar: 'المترو' }, school: { en: 'Schools', ar: 'مدارس' }, mall: { en: 'Mall', ar: 'مول' }, hospital: { en: 'Hospital', ar: 'مستشفى' }, sea: { en: 'Beach', ar: 'الشاطئ' }, club: { en: 'Sports club', ar: 'نادي رياضي' } };
export const FINISH = { core: { en: 'Core and shell', ar: 'على الطوب' }, semi: { en: 'Semi finished', ar: 'نصف تشطيب' }, lux: { en: 'Fully finished', ar: 'تشطيب كامل' }, super_lux: { en: 'Super lux', ar: 'سوبر لوكس' } };

export const SORTS = ['newest', 'price_asc', 'price_desc', 'area_desc', 'ppm_asc'];
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
export const ppm = (l) => (l.purpose === 'sale' && l.area ? l.price / l.area : 0);

// districts a search should cover: the picked ones, plus their neighbours when "include nearby" is on
export function districtScope(f) {
  const picked = arr(f.districts);
  if (!picked.length) return f.city ? Object.keys(DISTRICTS).filter((k) => DISTRICTS[k].city === f.city) : null;
  const set = new Set(picked);
  if (f.nearby) for (const d of picked) for (const n of DISTRICTS[d]?.near || []) set.add(n);
  return [...set];
}

// ignore: filter names to skip (used for facet counts, e.g. ['city','districts'])
export function filterListings(list, f = {}, ignore = []) {
  const skip = new Set(ignore);
  const scope = skip.has('districts') ? null : districtScope(f);
  const q = String(f.q || '').trim().toLowerCase();
  const types = arr(f.types), am = arr(f.amenities), near = arr(f.near);
  return list.filter((l) => {
    if (f.purpose && l.purpose !== f.purpose) return false;
    if (types.length && !types.includes(l.type)) return false;
    if (!skip.has('city') && !scope && f.city && DISTRICTS[l.district].city !== f.city) return false;
    if (scope && !scope.includes(l.district)) return false;
    if (f.minPrice && l.price < +f.minPrice) return false;
    if (f.maxPrice && l.price > +f.maxPrice) return false;
    if (f.beds && l.beds < +f.beds) return false;
    if (f.baths && l.baths < +f.baths) return false;
    if (f.minArea && l.area < +f.minArea) return false;
    if (f.maxArea && l.area > +f.maxArea) return false;
    if (f.finishing && l.finishing !== f.finishing) return false;
    if (f.furnished && !l.furnished) return false;
    if (f.installments && !l.plan) return false;
    if (am.length && !am.every((a) => l.amenities.includes(a))) return false;
    if (near.length && !near.every((n) => l.near.includes(n))) return false;
    if (q) {
      const d = DISTRICTS[l.district];
      const hay = [l.ref, l.compound, l.title.en, l.title.ar, d.en, d.ar, TYPES[l.type].en, TYPES[l.type].ar].join(' ').toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}
export function sortListings(list, sort = 'newest') {
  const a = [...list];
  const by = { newest: (x, y) => y.createdAt - x.createdAt, price_asc: (x, y) => x.price - y.price, price_desc: (x, y) => y.price - x.price, area_desc: (x, y) => y.area - x.area, ppm_asc: (x, y) => (ppm(x) || 1e12) - (ppm(y) || 1e12) };
  return a.sort(by[sort] || by.newest);
}
// how many results each district would give with every other filter applied (the location filter shows these numbers)
export function districtCounts(list, f) {
  const out = {}; for (const l of filterListings(list, f, ['city', 'districts'])) out[l.district] = (out[l.district] || 0) + 1; return out;
}
// "Show me matches": listings that fit what a lead asked for. Budget gets 10% tolerance upward.
export function matchesForLead(list, want = {}) {
  const f = { purpose: want.purpose, types: want.type ? [want.type] : [], districts: want.districts || [], nearby: true, beds: want.beds || 0, maxPrice: want.max ? Math.round(want.max * 1.1) : 0 };
  return sortListings(filterListings(list.filter((l) => l.status === 'available'), f), 'newest').slice(0, 6);
}
// filters <-> URL query string
export function filtersToQuery(f) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) { if (v === '' || v == null || v === false || (Array.isArray(v) && !v.length) || v === 0) continue; p.set(k, Array.isArray(v) ? v.join(',') : v === true ? '1' : v); }
  return p.toString();
}
export function queryToFilters(qs) {
  const p = new URLSearchParams(qs); const f = {};
  for (const k of ['purpose', 'city', 'finishing', 'q', 'sort']) if (p.get(k)) f[k] = p.get(k);
  for (const k of ['types', 'districts', 'amenities', 'near']) if (p.get(k)) f[k] = p.get(k).split(',').filter(Boolean);
  for (const k of ['minPrice', 'maxPrice', 'beds', 'baths', 'minArea', 'maxArea']) if (p.get(k) && Number.isFinite(+p.get(k))) f[k] = +p.get(k);
  for (const k of ['furnished', 'installments', 'nearby']) if (p.get(k) === '1') f[k] = true;
  return f;
}
// monthly instalment for an off-plan or compound sale: no interest, as many developer plans are quoted
export function instalment(price, downPct, years) {
  const down = Math.round(price * downPct / 100); const months = Math.max(1, Math.round(years * 12));
  return { down, months, monthly: Math.round((price - down) / months) };
}
