// Generated property artwork. The demo has no photos: every picture is an illustration drawn from the listing's data
// (type, colour, bedrooms, sea or garden), so the same listing always looks the same.
function r32(seed) { let a = 0; for (const c of seed) a = (a * 31 + c.charCodeAt(0)) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
const W = 640, H = 420;
const hsl = (h, s, l) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`;

function sky(l, id, r, dusk) {
  const h = l.hue, top = dusk ? hsl(h + 200, 40, 38) : hsl(200, 70, 78), bot = dusk ? hsl(h + 20, 70, 76) : hsl(40, 80, 92);
  let s = `<defs><linearGradient id="sk${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sk${id})"/>`;
  s += `<circle cx="${480 + r() * 100}" cy="${70 + r() * 30}" r="${26 + r() * 8}" fill="#fff" fill-opacity="${dusk ? .75 : .85}"/>`;
  for (let i = 0; i < 3; i++) { const x = r() * 560, y = 40 + r() * 90; s += `<g fill="#fff" fill-opacity=".7"><ellipse cx="${x}" cy="${y}" rx="${44 + r() * 26}" ry="${10 + r() * 6}"/><ellipse cx="${x + 24}" cy="${y - 8}" rx="${28 + r() * 10}" ry="${10}"/></g>`; }
  return s;
}
function ground(l, coastal) {
  if (coastal) return `<rect y="330" width="${W}" height="90" fill="#e7d3a4"/><path d="M0 330 Q80 316 160 330 T320 330 T480 330 T640 330 V352 H0z" fill="#3aa6b9" fill-opacity=".85"/><path d="M0 346 Q80 334 160 346 T320 346 T480 346 T640 346 V366 H0z" fill="#2b8fa3" fill-opacity=".75"/>`;
  return `<rect y="330" width="${W}" height="90" fill="${hsl(110, 28, 62)}"/><rect y="372" width="${W}" height="48" fill="${hsl(40, 12, 72)}"/><path d="M0 372H${W}" stroke="#fff" stroke-opacity=".5" stroke-dasharray="26 18" stroke-width="3" transform="translate(0 28)"/>`;
}
const win = (x, y, w, h, lit) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${lit ? '#ffe9a8' : '#bfd6e6'}" stroke="#fff" stroke-opacity=".6"/>`;
function tower(l, r, floors, cols, x0, w, wall, glass) {
  const top = 330 - floors * 30; let s = `<rect x="${x0}" y="${top}" width="${w}" height="${330 - top}" fill="${wall}"/>`;
  const cw = w / cols;
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) s += glass ? `<rect x="${x0 + c * cw + 2}" y="${top + f * 30 + 3}" width="${cw - 4}" height="24" fill="${hsl(200, 55, 62 + r() * 12)}" fill-opacity=".9"/>` : win(x0 + c * cw + cw * .22, top + f * 30 + 7, cw * .56, 16, r() < .35) + (r() < .3 ? `<rect x="${x0 + c * cw + cw * .12}" y="${top + f * 30 + 24}" width="${cw * .76}" height="3" fill="#fff" fill-opacity=".8"/>` : '');
  s += `<rect x="${x0 + w / 2 - 12}" y="306" width="24" height="24" fill="#4b3a2f"/><rect x="${x0 - 3}" y="${top - 6}" width="${w + 6}" height="8" fill="${hsl(l.hue, 20, 28)}"/>`;
  return s;
}
function house(l, r, x0, w, floors, wall, roof) {
  const h = floors * 62, top = 330 - h; let s = `<rect x="${x0}" y="${top}" width="${w}" height="${h}" fill="${wall}"/>`;
  s += `<path d="M${x0 - 14} ${top}L${x0 + w / 2} ${top - 54}L${x0 + w + 14} ${top}z" fill="${roof}"/>`;
  for (let f = 0; f < floors; f++) { s += win(x0 + 22, top + 14 + f * 62, 36, 34, r() < .4) + win(x0 + w - 58, top + 14 + f * 62, 36, 34, r() < .4); }
  s += `<rect x="${x0 + w / 2 - 17}" y="${330 - 52}" width="34" height="52" rx="2" fill="#5b4333"/><circle cx="${x0 + w / 2 + 9}" cy="304" r="2.5" fill="#f2d28b"/>`;
  return s;
}
function palm(x, y, s = 1) { return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0Q4 -40 0 -78" stroke="#7a5a3a" stroke-width="6" fill="none"/><g fill="#3f8f4f"><path d="M0 -78Q-34 -86 -52 -66Q-24 -72 0 -78z"/><path d="M0 -78Q34 -86 52 -66Q24 -72 0 -78z"/><path d="M0 -78Q-26 -104 -50 -100Q-22 -92 0 -78z"/><path d="M0 -78Q26 -104 50 -100Q22 -92 0 -78z"/><path d="M0 -78Q0 -104 -6 -116Q8 -100 0 -78z"/></g></g>`; }
function tree(x, y, s = 1, h = 110) { return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="-34" width="8" height="34" fill="#6b4c32"/><circle cx="0" cy="-52" r="28" fill="${hsl(h, 38, 40)}"/><circle cx="-16" cy="-40" r="18" fill="${hsl(h, 38, 46)}"/></g>`; }

export function exterior(l, dusk) {
  const r = r32(l.id + 'x'), wall = hsl(l.hue, 22, 90), wall2 = hsl(l.hue + 10, 28, 82), roof = hsl(l.hue + 180, 22, 36), coastal = l.near.includes('sea') || l.amenities.includes('sea_view');
  let s = sky(l, l.id, r, dusk) + ground(l, coastal);
  if (coastal) s += palm(70, 336, 1) + palm(580, 338, .85);
  else s += tree(70, 338, 1, 105) + tree(590, 338, .9, 120);
  switch (l.type) {
    case 'villa': s += house(l, r, 190, 260, 2, wall, roof) + `<rect x="150" y="318" width="340" height="14" fill="${hsl(110, 30, 45)}" fill-opacity=".8" rx="7"/>` + (l.amenities.includes('pool') ? `<rect x="470" y="344" width="110" height="34" rx="12" fill="#5ec1d6" stroke="#fff" stroke-width="4"/>` : ''); break;
    case 'townhouse': s += house(l, r, 120, 190, 2, wall, roof) + house(l, r, 322, 190, 2, wall2, hsl(l.hue + 150, 24, 40)); break;
    case 'duplex': s += house(l, r, 170, 300, 2, wall2, roof) + `<rect x="170" y="${330 - 124 - 10}" width="300" height="8" fill="${hsl(l.hue, 20, 28)}"/>`; break;
    case 'chalet': s += house(l, r, 200, 240, 1, hsl(l.hue, 30, 94), hsl(190, 40, 48)) + `<rect x="196" y="304" width="248" height="10" fill="#d8b98a"/><path d="M470 330v-50M470 280l50 14-50 18z" stroke="#fff" fill="#e85c3d" stroke-width="3"/>`; break;
    case 'office': s += tower(l, r, 9, 5, 200, 240, hsl(210, 18, 36), true) + tower(l, r, 5, 3, 120, 80, hsl(210, 16, 46), true); break;
    case 'shop': s += `<rect x="140" y="226" width="360" height="104" fill="${wall2}"/><path d="M130 226h380l-20 -42H150z" fill="${hsl(l.hue, 60, 46)}"/><g fill="#fff" fill-opacity=".6">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${150 + i * 45}" y="186" width="22" height="38"/>`).join('')}</g><rect x="170" y="250" width="180" height="80" fill="#cfe6f0" stroke="#fff" stroke-width="4"/><rect x="380" y="250" width="70" height="80" fill="#6b5442"/><rect x="190" y="204" width="140" height="18" fill="#fff" fill-opacity=".85" rx="3"/>`; break;
    case 'studio': s += tower(l, r, 6, 3, 240, 160, wall, false); break;
    default: { const floors = 5 + Math.floor(r() * 5); s += tower(l, r, floors, 4, 230, 180, wall, false) + tower(l, r, Math.max(3, floors - 3), 3, 130, 100, wall2, false) + tower(l, r, Math.max(3, floors - 2), 3, 420, 100, wall2, false); }
  }
  return s;
}
function living(l) {
  const r = r32(l.id + 'l'), wall = hsl(l.hue, 24, 88), fl = hsl(30, 30, 66), acc = hsl(l.hue + 160, 45, 42);
  let s = `<rect width="${W}" height="${H}" fill="${wall}"/><rect y="320" width="${W}" height="100" fill="${fl}"/><path d="M0 320H${W}" stroke="#000" stroke-opacity=".08" stroke-width="4"/>`;
  s += `<rect x="360" y="70" width="210" height="190" fill="#c9e4f2" stroke="#fff" stroke-width="10"/><path d="M465 70v190M360 165h210" stroke="#fff" stroke-width="6"/>`;
  if (l.amenities.includes('sea_view')) s += `<rect x="370" y="180" width="190" height="70" fill="#3aa6b9"/>`;
  s += `<path d="M340 60v230M590 60v230" stroke="${acc}" stroke-width="22" stroke-opacity=".85"/>`;
  s += `<rect x="70" y="238" width="260" height="90" rx="18" fill="${hsl(l.hue + 30, 28, 36)}"/><rect x="54" y="262" width="40" height="74" rx="14" fill="${hsl(l.hue + 30, 28, 30)}"/><rect x="306" y="262" width="40" height="74" rx="14" fill="${hsl(l.hue + 30, 28, 30)}"/><rect x="100" y="222" width="70" height="40" rx="12" fill="${acc}"/><rect x="180" y="222" width="70" height="40" rx="12" fill="${hsl(40, 70, 70)}"/>`;
  s += `<ellipse cx="200" cy="378" rx="140" ry="22" fill="${hsl(l.hue + 200, 26, 60)}" fill-opacity=".8"/><rect x="150" y="346" width="100" height="14" rx="6" fill="#6b4c32"/><rect x="156" y="358" width="6" height="22" fill="#6b4c32"/><rect x="238" y="358" width="6" height="22" fill="#6b4c32"/>`;
  s += `<rect x="90" y="70" width="150" height="104" fill="#fff" stroke="${hsl(30, 30, 40)}" stroke-width="8"/><path d="M100 160l36-44 28 30 22-22 46 36z" fill="${hsl(l.hue + 90, 35, 55)}"/><circle cx="196" cy="100" r="10" fill="#f5c542"/>`;
  s += `<path d="M560 330v-120" stroke="#444" stroke-width="5"/><path d="M536 210h48l-10 -34h-28z" fill="#ffe9a8"/>`;
  if (r() < 0.5) s += `<g transform="translate(40 330)"><rect x="-12" y="-44" width="30" height="44" rx="4" fill="#8a5a3c"/><path d="M0 -44c-30 -40 20 -50 4 -80c30 20 20 50 12 80" fill="#3f8f4f"/></g>`;
  return s;
}
function bedroom(l) {
  const r = r32(l.id + 'b'), wall = hsl(l.hue + 20, 22, 90), acc = hsl(l.hue + 200, 40, 52);
  return `<rect width="${W}" height="${H}" fill="${wall}"/><rect y="330" width="${W}" height="90" fill="${hsl(30, 26, 62)}"/>
  <rect x="190" y="150" width="270" height="150" rx="10" fill="${hsl(l.hue + 20, 25, 40)}"/><rect x="170" y="250" width="310" height="110" rx="12" fill="#fff"/><rect x="170" y="290" width="310" height="70" rx="12" fill="${acc}"/>
  <rect x="200" y="236" width="100" height="40" rx="14" fill="#f4efe6"/><rect x="340" y="236" width="100" height="40" rx="14" fill="#f4efe6"/>
  <rect x="60" y="120" width="90" height="230" fill="${hsl(30, 28, 44)}" rx="4"/><path d="M105 120v230" stroke="#000" stroke-opacity=".25"/><circle cx="98" cy="240" r="3" fill="#f2d28b"/><circle cx="112" cy="240" r="3" fill="#f2d28b"/>
  <rect x="500" y="260" width="64" height="70" fill="${hsl(30, 28, 48)}" rx="3"/><path d="M532 260v-34" stroke="#444" stroke-width="4"/><path d="M510 226h44l-8 -30h-28z" fill="#ffe9a8"/>
  <rect x="270" y="60" width="130" height="64" fill="#fff" stroke="${hsl(30, 30, 40)}" stroke-width="7"/><path d="M278 114l30-34 24 22 18-14 38 26z" fill="${hsl(l.hue + 120, 30, 58)}"/>`;
}
function plan(l) {
  const r = r32(l.id + 'p'), beds = Math.max(l.beds, 0), area = l.area;
  let s = `<rect width="${W}" height="${H}" fill="#f7f4ec"/><g stroke="#fff" stroke-width="0"><path d="M0 0H${W}" /></g>`;
  const x0 = 70, y0 = 50, w = 500, h = 320; s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#fff" stroke="#243746" stroke-width="6"/>`;
  const rooms = [];
  if (!beds) { rooms.push(['Open space', 'مساحة مفتوحة', x0, y0, w * .7, h], ['WC', 'دورة مياه', x0 + w * .7, y0, w * .3, h * .4], ['Storage', 'مخزن', x0 + w * .7, y0 + h * .4, w * .3, h * .6]); }
  else {
    rooms.push(['Living', 'ريسبشن', x0, y0 + h * .45, w * .5, h * .55], ['Kitchen', 'مطبخ', x0 + w * .5, y0 + h * .6, w * .22, h * .4], ['Bath', 'حمام', x0 + w * .72, y0 + h * .6, w * .28, h * .4]);
    const bw = w / Math.min(beds, 4); for (let i = 0; i < Math.min(beds, 4); i++) rooms.push([i === 0 ? 'Master' : 'Bed ' + (i + 1), i === 0 ? 'ماستر' : 'غرفة ' + (i + 1), x0 + i * bw, y0, bw, h * .45]);
  }
  rooms.forEach(([en, ar, x, y, rw, rh], i) => { s += `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="${hsl(l.hue + i * 23, 40, 92)}" stroke="#243746" stroke-width="3"/><text x="${x + rw / 2}" y="${y + rh / 2}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" fill="#243746">${en} · ${ar}</text>`; });
  s += `<text x="${W / 2}" y="${H - 14}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" fill="#5b6b76">${area} m² · schematic, not to scale · رسم توضيحي</text>`;
  return s;
}
export const VIEWS = ['exterior', 'living', 'bedroom', 'plan'];
export function propertyArt(l, view = 'exterior') {
  const body = view === 'living' ? living(l) : view === 'bedroom' ? bedroom(l) : view === 'plan' ? plan(l) : exterior(l, l.hue % 3 === 0);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="illustration">${body}</svg>`;
}
export function viewsFor(l) { return l.beds === 0 && ['office', 'shop'].includes(l.type) ? ['exterior', 'living', 'plan'] : VIEWS; }
export const logoSvg = `<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#0f5c52"/><path d="M8 21 20 10l12 11v11H8z" fill="#fff"/><path d="M16 32V23h8v9" fill="#0f5c52"/><circle cx="31" cy="11" r="3.4" fill="#e0a53a"/></svg>`;
