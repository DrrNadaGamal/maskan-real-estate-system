// Maskan business logic: listings, inquiries, leads, viewings, deals, commission, roles.
// Pure code shared by the API, the dev server and the tests. No network or disk I/O in this file.
import { createHash, randomUUID } from 'node:crypto';
import { DISTRICTS, TYPES, AMENITIES, NEAR, FINISH, filterListings, matchesForLead } from '../public/shared.js';

export const HOUR = 3600000, DAY = 86400000, MIN = 60000;
export const TZ_MIN = 120; // the demo office keeps Cairo winter time (UTC+2) all year
export const LEAD_STAGES = ['new', 'contacted', 'viewing', 'negotiation', 'won', 'lost'];
export const DEAL_STAGES = ['offer', 'reserved', 'contract', 'closed'];
export const SOURCES = ['website', 'whatsapp', 'facebook', 'referral', 'walk_in'];
export const LOST_REASONS = ['price', 'location', 'bought_elsewhere', 'no_answer', 'not_ready'];
export const LIMITS = { note: 500, name: 80, message: 600, viewingDays: 60, maxLeads: 200, maxListings: 120, inquiriesPerPhoneHour: 3, sessionHours: 8 };
export const WORK = { openHour: 10, closeHour: 20, closedWeekday: 5 }; // viewings 10:00-20:00 Cairo time, office closed on Fridays
export const AGENT_BUFFER_MIN = 30; // travel time an agent needs between two viewings

export class BadOp extends Error { constructor(m, code = 400) { super(m); this.name = 'BadOp'; this.code = code; } }
const bad = (m, code) => { throw new BadOp(m, code); };

export const clampStr = (v, max = 120) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
export const round = (n, step = 1) => Math.round(Number(n) / step) * step;
const toInt = (v, d = 0) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : d);
const sha = (s) => createHash('sha256').update('maskan-demo:' + s).digest('hex');

// local (Cairo) time helpers
const local = (t) => new Date(t + TZ_MIN * MIN);
export const dayStart = (t) => Math.floor((t + TZ_MIN * MIN) / DAY) * DAY - TZ_MIN * MIN;
export const monthKey = (t) => local(t).toISOString().slice(0, 7);
export const localHour = (t) => local(t).getUTCHours() + local(t).getUTCMinutes() / 60;
export const weekday = (t) => local(t).getUTCDay(); // 0 Sunday ... 5 Friday

// Egyptian mobile numbers: 01[0125]xxxxxxxx, with or without +20. Arabic-Indic digits are accepted.
export function normalizePhone(v) {
  const s = String(v ?? '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[\s\-().]/g, '');
  const m = s.match(/^(?:\+?20|0020|0)?(1[0125]\d{8})$/);
  return m ? '+20' + m[1] : null;
}
export const fmtPhone = (p) => p.replace(/^\+20(\d{2})(\d{4})(\d{4})$/, '0$1 $2 $3');

// ---------------------------------------------------------------- seed data
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

export const DEMO_PINS = { mona: '2468', karim: '1357', hana: '1357', omar: '1357' };
const USERS = [
  ['mona', 'Mona Fathy', 'منى فتحي', 'manager'], ['karim', 'Karim Adel', 'كريم عادل', 'agent'],
  ['hana', 'Hana Samir', 'هنا سمير', 'agent'], ['omar', 'Omar Nabil', 'عمر نبيل', 'agent'],
];
const CAR = { 'Zahraa Gardens': 'حدائق الزهراء', 'Lotus Park': 'لوتس بارك', 'Nile Crest': 'نايل كريست', 'Jasmine Heights': 'ياسمين هايتس', 'Palm Terrace': 'بالم تيراس', 'Dunes Residence': 'دانز ريزيدنس', 'Al Narges Courts': 'أحواش النرجس', 'Sahel Bay': 'ساحل باي', 'Azure Point': 'أزور بوينت', 'Marina Lagoons': 'مارينا لاجونز', 'Coral Heights': 'كورال هايتس', 'Sarayat Grove': 'سرايات جروف' };
const COMPOUNDS = { new_cairo: ['Zahraa Gardens', 'Lotus Park'], sheikh_zayed: ['Nile Crest', 'Jasmine Heights'], october: ['Palm Terrace'], shorouk: ['Dunes Residence'], madinaty: ['Al Narges Courts'], sidi_abdelrahman: ['Sahel Bay'], ras_el_hekma: ['Azure Point'], el_gouna: ['Marina Lagoons'], hurghada: ['Coral Heights'], maadi: ['Sarayat Grove'], heliopolis: [] };
// type, minArea, maxArea, beds options, baths
const SHAPES = {
  apartment: [90, 210, [2, 3, 3, 4]], duplex: [200, 330, [4, 5]], villa: [280, 520, [4, 5, 6]], townhouse: [210, 300, [3, 4]], studio: [45, 75, [1]],
  chalet: [70, 140, [1, 2, 3]], office: [60, 240, [0]], shop: [35, 140, [0]],
};
export const STAGE_LABEL = { new: { en: 'New', ar: 'جديد' }, contacted: { en: 'Contacted', ar: 'تم التواصل' }, viewing: { en: 'Viewing', ar: 'معاينة' }, negotiation: { en: 'Negotiation', ar: 'تفاوض' }, won: { en: 'Won', ar: 'تم' }, lost: { en: 'Lost', ar: 'خسارة' } };
const VSTAT = { done: { en: 'done', ar: 'تمت' }, no_show: { en: 'no-show', ar: 'لم يحضر' }, cancelled: { en: 'cancelled', ar: 'أُلغيت' } };
const SRC = { website: { en: 'the website', ar: 'الموقع' }, whatsapp: { en: 'WhatsApp', ar: 'واتساب' }, facebook: { en: 'Facebook', ar: 'فيسبوك' }, referral: { en: 'a referral', ar: 'ترشيح' }, walk_in: { en: 'a walk-in', ar: 'زيارة مباشرة' } };
const bedsAr = (n) => (n === 1 ? 'غرفة نوم' : n === 2 ? 'غرفتي نوم' : n + ' غرف نوم');
const bathsAr = (n) => (n === 1 ? 'حمام' : n === 2 ? 'حمامان' : n + ' حمامات');
const FIN_FACTOR = { core: 0.78, semi: 0.9, lux: 1, super_lux: 1.14 };

function titleOf(l) {
  const d = DISTRICTS[l.district], ty = TYPES[l.type];
  const room = l.beds ? { en: `${l.beds}-bedroom `, ar: '' } : { en: '', ar: '' };
  const arBeds = l.beds ? ` ${l.beds === 1 ? 'غرفة' : l.beds === 2 ? 'غرفتين' : l.beds + ' غرف'}` : '';
  const purposeAr = l.purpose === 'rent' ? 'للإيجار' : 'للبيع';
  return { en: `${room.en}${ty.en} in ${d.en}`, ar: `${ty.ar}${arBeds} ${purposeAr} في ${d.ar}` };
}
function descOf(l) {
  const d = DISTRICTS[l.district], ty = TYPES[l.type], f = FINISH[l.finishing];
  const am = l.amenities.slice(0, 4).map((a) => AMENITIES[a]);
  const nr = l.near.slice(0, 3).map((a) => NEAR[a]);
  const en = `${ty.en} of ${l.area} m2 in ${l.compound || d.en}${l.beds ? ` with ${l.beds} bedrooms and ${l.baths} bathrooms` : ''}. ${f.en}${l.furnished ? ', furnished' : ''}${l.floor != null ? `, floor ${l.floor}` : ''}. ${am.length ? 'Includes ' + am.map((a) => a.en.toLowerCase()).join(', ') + '.' : ''}${nr.length ? ' Close to ' + nr.map((a) => a.en.toLowerCase()).join(', ') + '.' : ''}${l.plan ? ` Instalment plan: ${l.plan.downPct}% down over ${l.plan.years} years.` : ''}`;
  const ar = `${ty.ar} بمساحة ${l.area} م² في ${l.compound ? CAR[l.compound] || l.compound : d.ar}${l.beds ? `، ${bedsAr(l.beds)} و${bathsAr(l.baths)}` : ''}. ${f.ar}${l.furnished ? '، مفروشة' : ''}${l.floor != null ? `، الدور ${l.floor}` : ''}. ${am.length ? 'المميزات: ' + am.map((a) => a.ar).join('، ') + '.' : ''}${nr.length ? ' قريبة من ' + nr.map((a) => a.ar).join('، ') + '.' : ''}${l.plan ? ` نظام تقسيط: مقدم ${l.plan.downPct}% على ${l.plan.years} سنوات.` : ''}`;
  return { en: en.replace(/\s+/g, ' ').trim(), ar: ar.replace(/\s+/g, ' ').trim() };
}

export function makeListings(now) {
  const r = rng(20261125), pick = (a) => a[Math.floor(r() * a.length)];
  const dkeys = Object.keys(DISTRICTS), agents = ['karim', 'hana', 'omar'];
  const out = [];
  for (let i = 0; i < 40; i++) {
    const district = dkeys[i % dkeys.length]; const d = DISTRICTS[district];
    const coastal = ['north_coast', 'red_sea'].includes(d.city);
    const purpose = i % 10 < 3 ? 'rent' : 'sale';
    let type = pick(coastal ? ['chalet', 'villa', 'apartment', 'townhouse', 'chalet'] : ['apartment', 'apartment', 'apartment', 'apartment', 'apartment', 'apartment', 'duplex', 'villa', 'townhouse', 'studio', 'office', 'shop']);
    if (district === 'zamalek' && ['villa', 'townhouse'].includes(type)) type = 'apartment';
    if (purpose === 'rent' && ['villa', 'townhouse'].includes(type) && !coastal) type = 'apartment';
    const [a0, a1, bedsOpts] = SHAPES[type];
    const area = round(a0 + r() * (a1 - a0), 5);
    const beds = pick(bedsOpts), baths = TYPES[type].res ? Math.max(1, Math.min(beds, beds >= 4 ? beds - 1 : beds)) : 1;
    const finishing = type === 'shop' || type === 'office' ? pick(['semi', 'lux', 'core']) : pick(['semi', 'lux', 'lux', 'super_lux', 'core']);
    const base = (purpose === 'sale' ? d.ppm : d.rent) * area * FIN_FACTOR[finishing] * (0.88 + r() * 0.26) * (type === 'villa' ? 1.1 : type === 'shop' ? 1.25 : 1);
    const price = purpose === 'sale' ? round(base, 50000) : round(base, 500);
    const amenities = Object.keys(AMENITIES).filter((a) => {
      if (a === 'sea_view') return coastal || (d.city === 'alex' && r() < .5);
      if (a === 'garden') return ['villa', 'townhouse', 'duplex'].includes(type) && r() < .8;
      if (a === 'pool') return (['villa', 'chalet', 'townhouse'].includes(type) || r() < .12) && r() < .85;
      if (!TYPES[type].res && !['parking', 'elevator', 'security', 'central_ac'].includes(a)) return false;
      if (a === 'maid_room') return beds >= 4 && r() < .6;
      return r() < 0.38;
    });
    const near = Object.keys(NEAR).filter((n) => (n === 'sea' ? coastal || district === 'sidi_bishr' || district === 'san_stefano' : n === 'metro' ? ['heliopolis', 'nasr_city', 'maadi', 'dokki', 'mohandessin', 'zamalek'].includes(district) && r() < .8 : r() < .4));
    const compound = (COMPOUNDS[district] || []).length && TYPES[type].res && r() < .7 ? pick(COMPOUNDS[district]) : '';
    const hasPlan = purpose === 'sale' && TYPES[type].res && (compound || coastal) && r() < .6;
    const l = {
      id: 'L' + (101 + i), ref: 'MSK-' + (2400 + i * 7), purpose, type, district, compound, price, area, beds: TYPES[type].res ? beds : 0, baths: TYPES[type].res ? baths : 1,
      floor: ['apartment', 'studio', 'office', 'shop'].includes(type) ? toInt(r() * 9) : null, finishing, furnished: purpose === 'rent' && TYPES[type].res && r() < .5,
      amenities, near, plan: hasPlan ? { downPct: pick([10, 15, 20]), years: pick([5, 6, 7, 8]) } : null, delivery: hasPlan && r() < .5 ? 2027 + toInt(r() * 3) : null,
      hue: toInt(r() * 360), status: 'available', published: true, agentId: agents[i % 3], createdAt: now - toInt(r() * 40 * DAY) - i * HOUR, history: [],
    };
    l.title = titleOf(l); l.desc = descOf(l); out.push(l);
  }
  return out;
}

const PEOPLE = [
  ['Ahmed Hassan', 'أحمد حسن'], ['Sara Mostafa', 'سارة مصطفى'], ['Youssef Ibrahim', 'يوسف إبراهيم'], ['Nour El-Din', 'نور الدين'], ['Mariam Khaled', 'مريم خالد'], ['Tarek Saeed', 'طارق سعيد'],
  ['Dina Farouk', 'دينا فاروق'], ['Mahmoud Gaber', 'محمود جابر'], ['Rania Salah', 'رانيا صلاح'], ['Hossam Anwar', 'حسام أنور'], ['Salma Ezzat', 'سلمى عزت'], ['Amr Lotfy', 'عمرو لطفي'],
  ['Heba Ragab', 'هبة رجب'], ['Walid Shaker', 'وليد شاكر'], ['Layla Mansour', 'ليلى منصور'], ['Ali Zaki', 'علي زكي'], ['Farida Naguib', 'فريدة نجيب'], ['Khaled Wahba', 'خالد وهبة'],
  ['Yasmin Essam', 'ياسمين عصام'], ['Mostafa Hegazy', 'مصطفى حجازي'], ['Nadine Aly', 'نادين علي'], ['Sherif Ayman', 'شريف أيمن'], ['Rehab Said', 'رحاب سعيد'], ['Bassem Fouad', 'باسم فؤاد'],
  ['Aya Tawfik', 'آية توفيق'], ['Medhat Sabry', 'مدحت صبري'],
];
const NOTES = [
  ['Called back, prefers evenings.', 'رديت عليه، يفضل المساء.'], ['Asked for the payment plan details.', 'سأل عن تفاصيل التقسيط.'], ['Wants a second viewing with family.', 'عايز معاينة تانية مع العيلة.'],
  ['Sent photos on WhatsApp.', 'بعتله الصور على واتساب.'], ['Comparing with a unit in the same area.', 'بيقارن بوحدة تانية في نفس المنطقة.'], ['Budget is flexible by about 10%.', 'الميزانية فيها مرونة حوالي ١٠٪.'],
];

export function seed(now = Date.now()) {
  const s = {
    v: 1, resetAt: now, seq: { lead: 100, viewing: 100, deal: 100, listing: 140, note: 0 },
    settings: { saleCommissionPct: 2.5, rentCommissionMonths: 1, agentSplitPct: 50 },
    users: USERS.map(([id, en, ar, role]) => ({ id, name: { en, ar }, role, pin: sha(DEMO_PINS[id]) })),
    sessions: {}, fails: {}, listings: makeListings(now), leads: [], viewings: [], deals: [], inquiryLog: [],
  };
  const r = rng(77), pick = (a) => a[Math.floor(r() * a.length)];
  const agents = ['karim', 'hana', 'omar'];
  const day0 = dayStart(now);
  const L = (id) => s.listings.find((l) => l.id === id);
  // stage plan for the 26 seeded leads
  const plan = ['new', 'new', 'new', 'new', 'new', 'new', 'contacted', 'contacted', 'contacted', 'contacted', 'contacted', 'contacted', 'viewing', 'viewing', 'viewing', 'viewing', 'viewing', 'negotiation', 'negotiation', 'negotiation', 'negotiation', 'won', 'won', 'lost', 'lost', 'lost'];
  const sched = [[1, 11], [1, 15], [2, 12], [2, 17], [3, 10]]; // [days from today, hour] for the 5 leads in "viewing"
  const taken = new Set();
  const free = (pred) => s.listings.find((l) => !taken.has(l.id) && pred(l));
  plan.forEach((stage, i) => {
    const agentId = agents[i % 3];
    const wantsRent = i % 4 === 0;
    let li = null;
    if (stage !== 'new' || i % 2) li = free((l) => l.status === 'available' && (wantsRent ? l.purpose === 'rent' : l.purpose === 'sale') && (stage === 'viewing' || stage === 'negotiation' || stage === 'won' ? l.agentId === agentId : true));
    if (li) taken.add(li.id);
    const lead = {
      id: 'C' + (101 + i), name: { en: PEOPLE[i][0], ar: PEOPLE[i][1] }, phone: '+20100000' + String(1000 + i * 37).padStart(4, '0'), source: pick(SOURCES), stage, agentId,
      listingId: li ? li.id : null, createdAt: now - toInt((1 + r() * 20) * DAY) , updatedAt: now, lostReason: null, next: null, notes: [],
      want: li ? { purpose: li.purpose, type: li.type, districts: [li.district], beds: li.beds, max: li.price } : { purpose: wantsRent ? 'rent' : 'sale', type: 'apartment', districts: [pick(Object.keys(DISTRICTS))], beds: 3, max: wantsRent ? 30000 : 9000000 },
    };
    lead.notes.push({ id: 'N' + ++s.seq.note, at: lead.createdAt, by: 'system', kind: 'created', text: { en: 'Lead created from ' + SRC[lead.source].en + '.', ar: 'تم إنشاء العميل من ' + SRC[lead.source].ar + '.' } });
    if (stage !== 'new') { const n = pick(NOTES); lead.notes.push({ id: 'N' + ++s.seq.note, at: lead.createdAt + 3 * HOUR, by: agentId, kind: 'note', text: { en: n[0], ar: n[1] } }); }
    if (stage === 'new') lead.next = { at: now + 2 * HOUR, text: { en: 'First call', ar: 'أول مكالمة' } };
    if (stage === 'contacted') lead.next = { at: now + (i % 3 === 0 ? -DAY : DAY), text: { en: 'Follow up call', ar: 'مكالمة متابعة' } };
    if (stage === 'lost') lead.lostReason = LOST_REASONS[i % LOST_REASONS.length];
    lead.updatedAt = lead.createdAt + 5 * HOUR;
    s.leads.push(lead);
  });
  s.seq.lead = 100 + s.leads.length;
  const leadsIn = (st) => s.leads.filter((l) => l.stage === st);
  // upcoming viewings for leads in "viewing"
  leadsIn('viewing').forEach((lead, i) => {
    const [d, h] = sched[i]; let start = day0 + d * DAY + h * HOUR; while (weekday(start) === WORK.closedWeekday) start += DAY;
    s.viewings.push({ id: 'V' + ++s.seq.viewing, leadId: lead.id, listingId: lead.listingId, agentId: lead.agentId, start, durationMin: 45, status: 'scheduled', note: '' });
    lead.next = { at: start - 2 * HOUR, text: { en: 'Confirm the viewing', ar: 'تأكيد المعاينة' } };
  });
  // past viewings: done for negotiation and won leads, one no-show, one cancelled
  [...leadsIn('negotiation'), ...leadsIn('won')].forEach((lead, i) => {
    let start = day0 - (2 + i) * DAY + 12 * HOUR; while (weekday(start) === WORK.closedWeekday) start -= DAY;
    s.viewings.push({ id: 'V' + ++s.seq.viewing, leadId: lead.id, listingId: lead.listingId, agentId: lead.agentId, start, durationMin: 45, status: 'done', note: 'Liked the layout.' });
  });
  const nos = leadsIn('lost')[0]; s.viewings.push({ id: 'V' + ++s.seq.viewing, leadId: nos.id, listingId: nos.listingId || s.listings[0].id, agentId: nos.agentId, start: day0 - 3 * DAY + 14 * HOUR, durationMin: 30, status: 'no_show', note: '' });
  const can = leadsIn('contacted')[1]; s.viewings.push({ id: 'V' + ++s.seq.viewing, leadId: can.id, listingId: can.listingId || s.listings[1].id, agentId: can.agentId, start: day0 + 4 * DAY + 13 * HOUR, durationMin: 45, status: 'cancelled', note: 'Client travelled.' });
  // deals
  const mk = (lead, stage, closedDaysAgo) => {
    const l = L(lead.listingId); const price = l.purpose === 'sale' ? round(l.price * 0.96, 10000) : l.price;
    const d = { id: 'D' + ++s.seq.deal, leadId: lead.id, listingId: l.id, agentId: lead.agentId, stage, price, purpose: l.purpose, createdAt: now - 6 * DAY, updatedAt: now - 2 * DAY, closedAt: null, history: [{ at: now - 6 * DAY, stage: 'offer', by: lead.agentId }] };
    Object.assign(d, commissionFor(s.settings, d));
    if (stage === 'closed') { d.closedAt = now - closedDaysAgo * DAY; l.status = l.purpose === 'sale' ? 'sold' : 'rented'; d.history.push({ at: d.closedAt, stage: 'closed', by: 'mona' }); }
    if (stage === 'reserved' || stage === 'contract') { l.status = 'reserved'; d.history.push({ at: now - 3 * DAY, stage: 'reserved', by: lead.agentId }); }
    if (stage === 'contract') d.history.push({ at: now - 1 * DAY, stage: 'contract', by: lead.agentId });
    s.deals.push(d);
  };
  const neg = leadsIn('negotiation'); mk(neg[0], 'offer'); mk(neg[1], 'reserved'); mk(neg[2], 'contract'); mk(neg[3], 'offer');
  const won = leadsIn('won'); mk(won[0], 'closed', 4); mk(won[1], 'closed', 9);
  s.listings.forEach((l) => { if (l.status === 'reserved') l.published = true; });
  return s;
}

// ---------------------------------------------------------------- commission
export function commissionFor(settings, deal) {
  const commission = deal.purpose === 'sale' ? Math.round(deal.price * settings.saleCommissionPct / 100) : Math.round(deal.price * settings.rentCommissionMonths);
  const agentShare = Math.round(commission * settings.agentSplitPct / 100);
  return { commission, agentShare, officeShare: commission - agentShare };
}

// ---------------------------------------------------------------- sessions and permissions
export function session(s, token, now) {
  const x = token && s.sessions[token]; if (!x || x.exp < now) return null;
  const u = s.users.find((u) => u.id === x.userId); return u ? { userId: u.id, role: u.role } : null;
}
const needAuth = (sess) => { if (!sess) bad('Sign in first', 401); return sess; };
const needManager = (sess) => { if (needAuth(sess).role !== 'manager') bad('Only the manager can do this', 403); };
const canSee = (sess, owner) => sess.role === 'manager' || sess.userId === owner;
const getLead = (s, id, sess) => { const l = s.leads.find((x) => x.id === id); if (!l) bad('Lead not found', 404); if (!canSee(sess, l.agentId)) bad('This lead belongs to another agent', 403); return l; };
const getListing = (s, id) => { const l = s.listings.find((x) => x.id === id); if (!l) bad('Listing not found', 404); return l; };
const getDeal = (s, id, sess) => { const d = s.deals.find((x) => x.id === id); if (!d) bad('Deal not found', 404); if (!canSee(sess, d.agentId)) bad('This deal belongs to another agent', 403); return d; };
const getViewing = (s, id, sess) => { const v = s.viewings.find((x) => x.id === id); if (!v) bad('Viewing not found', 404); if (!canSee(sess, v.agentId)) bad('This viewing belongs to another agent', 403); return v; };
const note = (s, lead, by, kind, text, now) => { lead.notes.push({ id: 'N' + ++s.seq.note, at: now, by, kind, text: typeof text === 'string' ? { en: text, ar: text } : text }); lead.updatedAt = now; if (lead.notes.length > 60) lead.notes.splice(1, lead.notes.length - 60); };

// ---------------------------------------------------------------- viewing rules
export function checkViewingSlot(s, { start, durationMin, agentId, listingId, ignoreId }, now) {
  if (!Number.isFinite(start)) bad('Choose a date and time');
  if (![30, 45, 60].includes(durationMin)) bad('Duration must be 30, 45 or 60 minutes');
  if (start < now) bad('Viewings cannot be scheduled in the past');
  if (start > now + LIMITS.viewingDays * DAY) bad('Too far ahead: viewings can be booked up to 60 days out');
  if (weekday(start) === WORK.closedWeekday) bad('The office is closed on Fridays');
  const h = localHour(start), hEnd = h + durationMin / 60;
  if (h < WORK.openHour || hEnd > WORK.closeHour) bad('Viewings run between 10:00 and 20:00');
  const end = start + durationMin * MIN, buf = AGENT_BUFFER_MIN * MIN;
  for (const v of s.viewings) {
    if (v.status !== 'scheduled' || v.id === ignoreId) continue;
    const vEnd = v.start + v.durationMin * MIN;
    if (v.listingId === listingId && start < vEnd && v.start < end) bad('This property already has a viewing at that time');
    if (v.agentId === agentId && start < vEnd + buf && v.start < end + buf) bad('The agent has another viewing within 30 minutes of that time');
  }
}

// ---------------------------------------------------------------- operations
function createLead(s, { name, phone, source, message, listingId, budget, agentId, by, now }) {
  const nm = clampStr(name, LIMITS.name); if (nm.length < 2) bad('Enter a name');
  const ph = normalizePhone(phone); if (!ph) bad('Enter a valid Egyptian mobile number');
  const li = listingId ? getListing(s, listingId) : null;
  const dup = s.leads.find((l) => l.phone === ph && !['won', 'lost'].includes(l.stage));
  if (dup) return { lead: dup, merged: true };
  if (s.leads.length >= LIMITS.maxLeads) bad('The demo lead list is full. Ask the manager to reset the demo.');
  const lead = {
    id: 'C' + ++s.seq.lead, name: { en: nm, ar: nm }, phone: ph, source, stage: 'new', agentId: agentId || (li ? li.agentId : leastLoadedAgent(s)), listingId: li ? li.id : null, createdAt: now, updatedAt: now, lostReason: null,
    next: { at: now + 2 * HOUR, text: { en: 'First call', ar: 'أول مكالمة' } }, notes: [],
    want: li ? { purpose: li.purpose, type: li.type, districts: [li.district], beds: li.beds, max: li.price } : { purpose: 'sale', type: '', districts: [], beds: 0, max: toInt(budget) },
  };
  note(s, lead, by || 'system', 'created', { en: 'Lead created from ' + SRC[source].en + '.', ar: 'تم إنشاء العميل من ' + SRC[source].ar + '.' }, now);
  if (message) note(s, lead, 'client', 'inquiry', clampStr(message, LIMITS.message), now);
  s.leads.push(lead); return { lead, merged: false };
}
export function leastLoadedAgent(s) {
  const load = {}; for (const u of s.users) if (u.role === 'agent') load[u.id] = 0;
  for (const l of s.leads) if (!['won', 'lost'].includes(l.stage) && l.agentId in load) load[l.agentId]++;
  return Object.entries(load).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0][0];
}

export function applyOp(s, op, now = Date.now(), token = null) {
  if (!op || typeof op.type !== 'object' && typeof op.type !== 'string') bad('Bad request');
  const sess = session(s, token, now);
  switch (op.type) {
    // ---- public
    case 'inquiry.create': {
      if (op.company) return { ok: true, leadId: null }; // honeypot field filled by bots: pretend success, store nothing
      const key = clampStr(op.key, 60); if (key.length < 8) bad('Missing request key');
      const seen = s.inquiryLog.find((x) => x.key === key); if (seen) return { ok: true, leadId: seen.leadId, merged: seen.merged, replay: true };
      const ph = normalizePhone(op.phone); if (!ph) bad('Enter a valid Egyptian mobile number');
      const recent = s.inquiryLog.filter((x) => x.phone === ph && x.at > now - HOUR).length;
      if (recent >= LIMITS.inquiriesPerPhoneHour) bad('Too many requests from this number. Try again later.', 429);
      const li = getListing(s, op.listingId); if (!li.published || !['available', 'reserved'].includes(li.status)) bad('This property is no longer available');
      const { lead, merged } = createLead(s, { name: op.name, phone: ph, source: 'website', message: op.message, listingId: li.id, now });
      if (merged) { note(s, lead, 'client', 'inquiry', { en: `Asked again about ${li.ref}. ${clampStr(op.message, LIMITS.message)}`.trim(), ar: `سأل مرة أخرى عن ${li.ref}. ${clampStr(op.message, LIMITS.message)}`.trim() }, now); if (!lead.listingId) lead.listingId = li.id; }
      else if (op.viewingPref) note(s, lead, 'client', 'inquiry', { en: 'Preferred viewing time: ' + clampStr(op.viewingPref, 60), ar: 'الوقت المفضل للمعاينة: ' + clampStr(op.viewingPref, 60) }, now);
      s.inquiryLog.push({ key, phone: ph, leadId: lead.id, merged, at: now }); if (s.inquiryLog.length > 80) s.inquiryLog.splice(0, s.inquiryLog.length - 80);
      return { ok: true, leadId: lead.id, merged };
    }
    case 'auth.login': {
      const u = s.users.find((x) => x.id === op.userId); if (!u) bad('Unknown user');
      const f = s.fails[u.id] || { n: 0, until: 0 };
      if (f.until > now) bad('Too many wrong PINs. Try again in a few minutes.', 429);
      if (sha(String(op.pin ?? '')) !== u.pin) { f.n++; if (f.n >= 5) { f.until = now + 5 * MIN; f.n = 0; } s.fails[u.id] = f; bad('Wrong PIN', 401); }
      delete s.fails[u.id];
      for (const [t, x] of Object.entries(s.sessions)) if (x.exp < now) delete s.sessions[t];
      const tokens = Object.keys(s.sessions); if (tokens.length > 40) delete s.sessions[tokens[0]];
      const tok = randomUUID(); s.sessions[tok] = { userId: u.id, exp: now + LIMITS.sessionHours * HOUR };
      return { token: tok, user: { id: u.id, role: u.role, name: u.name } };
    }
    case 'auth.logout': { if (token) delete s.sessions[token]; return { ok: true }; }
    case 'reset': return { ok: true }; // the API layer re-seeds after checking the manager session
    case 'crm.state': needAuth(sess); return { ok: true };
  }
  needAuth(sess);
  switch (op.type) {
    case 'lead.create': {
      const source = SOURCES.includes(op.source) ? op.source : 'walk_in';
      const agentId = sess.role === 'manager' ? (op.agentId && s.users.some((u) => u.id === op.agentId && u.role === 'agent') ? op.agentId : null) : sess.userId;
      const { lead, merged } = createLead(s, { name: op.name, phone: op.phone, source, message: op.note, listingId: op.listingId || null, budget: op.budget, agentId, by: sess.userId, now });
      if (merged) bad(`A lead with this number already exists (${lead.id}, ${lead.stage})`);
      return { leadId: lead.id };
    }
    case 'lead.note': {
      const lead = getLead(s, op.id, sess); const t = clampStr(op.text, LIMITS.note); if (!t) bad('Write a note first');
      note(s, lead, sess.userId, 'note', t, now);
      if (lead.stage === 'new') { lead.stage = 'contacted'; note(s, lead, sess.userId, 'stage', { en: 'Moved to Contacted.', ar: 'تم النقل إلى: تم التواصل.' }, now); }
      return { ok: true };
    }
    case 'lead.next': {
      const lead = getLead(s, op.id, sess); const at = toInt(op.at, NaN); if (!Number.isFinite(at)) bad('Choose a date and time');
      if (at < now - DAY) bad('Pick a time that is not in the past');
      lead.next = { at, text: { en: clampStr(op.text, 80) || 'Follow up', ar: clampStr(op.text, 80) || 'متابعة' } }; lead.updatedAt = now; return { ok: true };
    }
    case 'lead.stage': {
      const lead = getLead(s, op.id, sess); const to = op.stage;
      if (!LEAD_STAGES.includes(to)) bad('Unknown stage');
      if (to === 'won') bad('A lead becomes Won when its deal is closed');
      const from = lead.stage; if (from === to) return { ok: true };
      if (from === 'won') bad('A won lead cannot be moved');
      if (to === 'negotiation' && !s.deals.some((d) => d.leadId === lead.id && !['fell_through'].includes(d.stage))) bad('Create a deal first: negotiation starts with an offer');
      if (to === 'lost') {
        if (!LOST_REASONS.includes(op.reason)) bad('Choose a reason for losing this lead');
        lead.lostReason = op.reason; lead.next = null;
        for (const v of s.viewings) if (v.leadId === lead.id && v.status === 'scheduled') v.status = 'cancelled';
        for (const d of s.deals) if (d.leadId === lead.id && d.stage !== 'closed' && d.stage !== 'fell_through') failDeal(s, d, sess.userId, now);
      } else if (from === 'lost') { if (sess.role !== 'manager') bad('Only the manager can reopen a lost lead', 403); lead.lostReason = null; if (to !== 'contacted' && to !== 'new') bad('A reopened lead returns to New or Contacted'); }
      else if (LEAD_STAGES.indexOf(to) < LEAD_STAGES.indexOf(from) - 1 && sess.role !== 'manager') bad('Agents can move a lead back one stage at most', 403);
      lead.stage = to; note(s, lead, sess.userId, 'stage', { en: 'Moved to ' + STAGE_LABEL[to].en + '.', ar: 'تم النقل إلى: ' + STAGE_LABEL[to].ar + '.' }, now);
      return { ok: true };
    }
    case 'lead.assign': {
      needManager(sess); const lead = getLead(s, op.id, sess); const u = s.users.find((x) => x.id === op.agentId && x.role === 'agent'); if (!u) bad('Choose an agent');
      if (['won', 'lost'].includes(lead.stage)) bad('Closed leads keep their agent');
      const mine = s.viewings.filter((v) => v.leadId === lead.id && v.status === 'scheduled');
      for (const v of mine) checkViewingSlot(s, { start: v.start, durationMin: v.durationMin, agentId: u.id, listingId: v.listingId, ignoreId: v.id }, v.start - 1);
      lead.agentId = u.id; for (const v of mine) v.agentId = u.id; for (const d of s.deals) if (d.leadId === lead.id && !['closed', 'fell_through'].includes(d.stage)) d.agentId = u.id;
      note(s, lead, sess.userId, 'assign', { en: 'Assigned to ' + u.name.en + '.', ar: 'تم التعيين إلى ' + u.name.ar + '.' }, now); return { ok: true };
    }
    case 'viewing.create': {
      const lead = getLead(s, op.leadId, sess); const li = getListing(s, op.listingId);
      if (['won', 'lost'].includes(lead.stage)) bad('This lead is closed');
      if (li.status !== 'available' || !li.published) bad('This property is not available for viewings');
      const start = toInt(op.start, NaN), durationMin = toInt(op.durationMin, 45);
      checkViewingSlot(s, { start, durationMin, agentId: lead.agentId, listingId: li.id }, now);
      const v = { id: 'V' + ++s.seq.viewing, leadId: lead.id, listingId: li.id, agentId: lead.agentId, start, durationMin, status: 'scheduled', note: '' };
      s.viewings.push(v);
      if (['new', 'contacted'].includes(lead.stage)) { lead.stage = 'viewing'; note(s, lead, sess.userId, 'stage', { en: 'Viewing booked. Moved to Viewing.', ar: 'تم حجز معاينة. تم النقل إلى: معاينة.' }, now); }
      if (!lead.listingId) lead.listingId = li.id;
      lead.next = { at: start - 2 * HOUR, text: { en: 'Confirm the viewing', ar: 'تأكيد المعاينة' } };
      return { viewingId: v.id };
    }
    case 'viewing.move': {
      const v = getViewing(s, op.id, sess); if (v.status !== 'scheduled') bad('Only scheduled viewings can be moved');
      const start = toInt(op.start, NaN); checkViewingSlot(s, { start, durationMin: v.durationMin, agentId: v.agentId, listingId: v.listingId, ignoreId: v.id }, now);
      v.start = start; const lead = s.leads.find((l) => l.id === v.leadId); if (lead) note(s, lead, sess.userId, 'viewing', { en: 'Viewing rescheduled.', ar: 'تم تغيير موعد المعاينة.' }, now); return { ok: true };
    }
    case 'viewing.status': {
      const v = getViewing(s, op.id, sess); const to = op.status;
      if (v.status !== 'scheduled') bad('This viewing is already ' + v.status);
      if (!['done', 'no_show', 'cancelled'].includes(to)) bad('Unknown status');
      if (to !== 'cancelled' && v.start > now) bad('This viewing has not happened yet');
      v.status = to; v.note = clampStr(op.note, 200) || v.note;
      const lead = s.leads.find((l) => l.id === v.leadId);
      if (lead) { note(s, lead, sess.userId, 'viewing', { en: 'Viewing marked ' + VSTAT[to].en + '.' + (v.note ? ' ' + v.note : ''), ar: 'المعاينة: ' + VSTAT[to].ar + '.' + (v.note ? ' ' + v.note : '') }, now);
        if (to === 'no_show') lead.next = { at: now + DAY, text: { en: 'Call after the no-show', ar: 'اتصال بعد عدم الحضور' } }; }
      return { ok: true };
    }
    case 'deal.create': {
      const lead = getLead(s, op.leadId, sess); const li = getListing(s, op.listingId);
      if (['won', 'lost'].includes(lead.stage)) bad('This lead is closed');
      if (li.status !== 'available') bad('This property is not available');
      if (s.deals.some((d) => d.listingId === li.id && !['closed', 'fell_through'].includes(d.stage))) bad('This property already has an open deal');
      const price = toInt(op.price, NaN); if (!(price > 0)) bad('Enter the offer price');
      if (price < li.price * 0.5 || price > li.price * 1.5) bad('The offer is more than 50% away from the listed price. Check the amount.');
      const d = { id: 'D' + ++s.seq.deal, leadId: lead.id, listingId: li.id, agentId: lead.agentId, stage: 'offer', price, purpose: li.purpose, createdAt: now, updatedAt: now, closedAt: null, history: [{ at: now, stage: 'offer', by: sess.userId }] };
      Object.assign(d, commissionFor(s.settings, d)); s.deals.push(d);
      if (lead.stage !== 'negotiation') { lead.stage = 'negotiation'; lead.next = null; } note(s, lead, sess.userId, 'deal', { en: `Offer of ${price.toLocaleString('en-US')} EGP on ${li.ref}.`, ar: `عرض بقيمة ${price.toLocaleString('en-US')} جنيه على ${li.ref}.` }, now);
      return { dealId: d.id };
    }
    case 'deal.stage': {
      const d = getDeal(s, op.id, sess); const to = op.stage; const li = getListing(s, d.listingId); const lead = s.leads.find((l) => l.id === d.leadId);
      if (['closed', 'fell_through'].includes(d.stage)) bad('This deal is already ' + d.stage.replace('_', ' '));
      if (to === 'fell_through') { failDeal(s, d, sess.userId, now); if (lead && lead.stage === 'negotiation') { lead.stage = 'contacted'; note(s, lead, sess.userId, 'deal', { en: 'Deal fell through. Back to Contacted.', ar: 'الصفقة لم تتم. رجع إلى: تم التواصل.' }, now); } return { ok: true }; }
      const i = DEAL_STAGES.indexOf(d.stage), j = DEAL_STAGES.indexOf(to);
      if (j !== i + 1) bad('A deal moves one stage at a time: ' + DEAL_STAGES.join(' > '));
      if (to === 'closed') needManager(sess);
      d.stage = to; d.updatedAt = now; d.history.push({ at: now, stage: to, by: sess.userId });
      if (to === 'reserved') li.status = 'reserved';
      if (to === 'closed') {
        d.closedAt = now; li.status = d.purpose === 'sale' ? 'sold' : 'rented';
        if (lead) { lead.stage = 'won'; lead.next = null; note(s, lead, sess.userId, 'deal', { en: `Deal closed on ${li.ref}.`, ar: `تم إغلاق الصفقة على ${li.ref}.` }, now); }
        for (const v of s.viewings) if (v.listingId === li.id && v.status === 'scheduled') v.status = 'cancelled';
      }
      return { ok: true };
    }
    case 'deal.price': {
      const d = getDeal(s, op.id, sess); if (d.stage !== 'offer') bad('The price can only change while the deal is at Offer');
      const li = getListing(s, d.listingId); const price = toInt(op.price, NaN);
      if (!(price > 0) || price < li.price * 0.5 || price > li.price * 1.5) bad('Check the amount: it is more than 50% away from the listed price');
      d.price = price; Object.assign(d, commissionFor(s.settings, d)); d.updatedAt = now; return { ok: true };
    }
    case 'listing.update': {
      const li = getListing(s, op.id);
      if (!canSee(sess, li.agentId)) bad('This listing belongs to another agent', 403);
      if (op.price != null) {
        const p = toInt(op.price, NaN); if (!(p > 0)) bad('Enter a valid price');
        if (s.deals.some((d) => d.listingId === li.id && !['closed', 'fell_through'].includes(d.stage))) bad('This property has an open deal: its price is frozen');
        if (p !== li.price) { li.history.push({ at: now, price: li.price, by: sess.userId }); if (li.history.length > 10) li.history.shift(); li.price = p; }
      }
      if (op.published != null) {
        if (op.published && li.status !== 'available') bad('Only available properties can be published');
        li.published = !!op.published;
      }
      if (op.status === 'withdrawn' || op.status === 'available') {
        needManager(sess);
        if (s.deals.some((d) => d.listingId === li.id && !['closed', 'fell_through'].includes(d.stage))) bad('This property has an open deal');
        if (li.status === 'sold' || li.status === 'rented') bad('Sold and rented properties are final');
        li.status = op.status; if (op.status === 'withdrawn') li.published = false;
      }
      return { ok: true };
    }
    case 'listing.create': {
      if (s.listings.length >= LIMITS.maxListings) bad('The demo listing list is full');
      if (!['sale', 'rent'].includes(op.purpose)) bad('Choose sale or rent');
      if (!TYPES[op.ptype]) bad('Choose a property type');
      if (!DISTRICTS[op.district]) bad('Choose an area');
      const area = toInt(op.area, NaN), price = toInt(op.price, NaN);
      if (!(area >= 20 && area <= 3000)) bad('Area must be between 20 and 3,000 m2');
      if (!(price > 0)) bad('Enter a price');
      const d = DISTRICTS[op.district]; const unit = op.purpose === 'sale' ? d.ppm : d.rent;
      if (price < unit * area * 0.25 || price > unit * area * 4) bad('The price is far from what this area usually costs. Check the amount.');
      const res = TYPES[op.ptype].res; const beds = res ? Math.max(0, Math.min(10, toInt(op.beds))) : 0;
      const agentId = sess.role === 'manager' ? (s.users.some((u) => u.id === op.agentId && u.role === 'agent') ? op.agentId : leastLoadedAgent(s)) : sess.userId;
      const l = { id: 'L' + ++s.seq.listing, ref: 'MSK-' + (3000 + s.seq.listing), purpose: op.purpose, type: op.ptype, district: op.district, compound: clampStr(op.compound, 40), price, area, beds, baths: res ? Math.max(1, Math.min(10, toInt(op.baths, 1))) : 1, floor: null, finishing: FINISH[op.finishing] ? op.finishing : 'lux', furnished: !!op.furnished, amenities: (op.amenities || []).filter((a) => AMENITIES[a]), near: (op.near || []).filter((a) => NEAR[a]), plan: null, delivery: null, hue: toInt(Math.random() * 360), status: 'available', published: true, agentId, createdAt: now, history: [] };
      l.title = titleOf(l); l.desc = descOf(l); s.listings.push(l); return { listingId: l.id };
    }
    case 'settings.update': {
      needManager(sess); const st = s.settings;
      const sale = Number(op.saleCommissionPct), rent = Number(op.rentCommissionMonths), split = Number(op.agentSplitPct);
      if (!(sale >= 0 && sale <= 10)) bad('Sale commission must be between 0 and 10%');
      if (!(rent >= 0 && rent <= 3)) bad('Rent commission must be between 0 and 3 months');
      if (!(split >= 0 && split <= 100)) bad('Agent share must be between 0 and 100%');
      Object.assign(st, { saleCommissionPct: sale, rentCommissionMonths: rent, agentSplitPct: split });
      for (const d of s.deals) if (!['closed'].includes(d.stage)) Object.assign(d, commissionFor(st, d)); // closed deals keep the rates they closed with
      return { ok: true };
    }
  }
  bad('Unknown operation');
}
function failDeal(s, d, by, now) {
  d.stage = 'fell_through'; d.updatedAt = now; d.history.push({ at: now, stage: 'fell_through', by });
  const li = s.listings.find((l) => l.id === d.listingId); if (li && li.status === 'reserved') li.status = 'available';
}
export function compact(s, now = Date.now()) {
  for (const [t, x] of Object.entries(s.sessions)) if (x.exp < now) delete s.sessions[t];
  for (const l of s.leads) if (l.notes.length > 60) l.notes.splice(1, l.notes.length - 60);
}

// ---------------------------------------------------------------- views
export function publicListings(s) {
  return s.listings.filter((l) => l.published && ['available', 'reserved'].includes(l.status)).map((l) => {
    const u = s.users.find((x) => x.id === l.agentId);
    const { history, ...rest } = l; return { ...rest, agent: u ? u.name : null };
  });
}
export function publicView(s, now = Date.now()) { return { serverTime: now, resetAt: s.resetAt, listings: publicListings(s) }; }

export function reports(s, sess, now) {
  const mine = (x) => sess.role === 'manager' || x.agentId === sess.userId;
  const leads = s.leads.filter(mine), deals = s.deals.filter(mine), viewings = s.viewings.filter(mine);
  const stageCounts = Object.fromEntries(LEAD_STAGES.map((k) => [k, leads.filter((l) => l.stage === k).length]));
  const open = deals.filter((d) => !['closed', 'fell_through'].includes(d.stage));
  const weight = { offer: 0.25, reserved: 0.6, contract: 0.85 };
  const mk = monthKey(now);
  const closedThisMonth = deals.filter((d) => d.stage === 'closed' && monthKey(d.closedAt) === mk);
  const bySource = {}; for (const l of leads) bySource[l.source] = (bySource[l.source] || 0) + 1;
  const wk0 = dayStart(now), wk1 = wk0 + 7 * DAY;
  const out = {
    stageCounts, bySource,
    newLeads7d: leads.filter((l) => l.createdAt > now - 7 * DAY).length,
    viewingsWeek: viewings.filter((v) => v.status === 'scheduled' && v.start >= wk0 && v.start < wk1).length,
    overdue: leads.filter((l) => l.next && l.next.at < now && !['won', 'lost'].includes(l.stage)).length,
    pipelineValue: open.reduce((a, d) => a + d.price, 0),
    commissionPipeline: open.reduce((a, d) => a + (sess.role === 'manager' ? d.commission : d.agentShare), 0),
    commissionWeighted: Math.round(open.reduce((a, d) => a + (sess.role === 'manager' ? d.commission : d.agentShare) * weight[d.stage], 0)),
    commissionEarnedMonth: closedThisMonth.reduce((a, d) => a + (sess.role === 'manager' ? d.commission : d.agentShare), 0),
    closedMonth: closedThisMonth.length,
    conversion: leads.length ? Math.round(100 * leads.filter((l) => l.stage === 'won').length / Math.max(1, leads.filter((l) => ['won', 'lost'].includes(l.stage)).length)) : 0,
    noShowRate: (() => { const done = viewings.filter((v) => ['done', 'no_show'].includes(v.status)); return done.length ? Math.round(100 * done.filter((v) => v.status === 'no_show').length / done.length) : 0; })(),
  };
  if (sess.role === 'manager') {
    out.leaderboard = s.users.filter((u) => u.role === 'agent').map((u) => {
      const ds = s.deals.filter((d) => d.agentId === u.id), ls = s.leads.filter((l) => l.agentId === u.id);
      return { id: u.id, name: u.name, leads: ls.filter((l) => !['won', 'lost'].includes(l.stage)).length, won: ds.filter((d) => d.stage === 'closed').length, openDeals: ds.filter((d) => !['closed', 'fell_through'].includes(d.stage)).length, earned: ds.filter((d) => d.stage === 'closed').reduce((a, d) => a + d.agentShare, 0), pipeline: ds.filter((d) => !['closed', 'fell_through'].includes(d.stage)).reduce((a, d) => a + d.agentShare, 0) };
    });
  }
  return out;
}

export function crmView(s, sess, now = Date.now()) {
  const mine = (x) => sess.role === 'manager' || x.agentId === sess.userId;
  const listings = s.listings.filter((l) => sess.role === 'manager' || l.agentId === sess.userId || (l.published && l.status === 'available'));
  const leads = s.leads.filter(mine).map((l) => ({ ...l, matches: ['won', 'lost'].includes(l.stage) ? [] : matchesForLead(s.listings.filter((x) => x.published), l.want).map((x) => x.id).filter((id) => id !== l.listingId).slice(0, 4) }));
  return {
    me: { id: sess.userId, role: sess.role }, users: s.users.map(({ id, name, role }) => ({ id, name, role })), settings: s.settings,
    listings: listings.map((l) => ({ ...l, mine: sess.role === 'manager' || l.agentId === sess.userId })), leads, viewings: s.viewings.filter(mine), deals: s.deals.filter(mine), reports: reports(s, sess, now),
  };
}
export function view(s, now = Date.now(), token = null) {
  const sess = session(s, token, now); const v = publicView(s, now);
  if (sess) v.crm = crmView(s, sess, now); return v;
}
export { filterListings };
