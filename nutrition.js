/* My Wellness PWA — Nutrition: daily checklist, food log, Pakistan-friendly suggestions */
import { DB } from './db.js';
import { h, clear, pageHead, sheet, field, input, toast, checkRow } from './ui.js';
import { todayStr, nowTimeStr, fmtTime, esc, pctDone, fileToDataURL, uid } from './util.js';
import { FOODS, HEALTH_NOTICE } from './content.js';

const CHECKS = [
  ['protein', 'Protein source', 'Eggs, daal, chicken, yogurt…'],
  ['iron', 'Iron-containing food', 'Palak, masoor daal, dates…'],
  ['fruit', 'Fruit', 'Amrood, kela, kinnow…'],
  ['veg', 'Vegetables', 'Any sabzi counts'],
  ['snack', 'Nutritious snack', 'Nuts, fruit, yogurt…'],
  ['meals', 'Regular meals', 'Ate meals at roughly usual times'],
];
const CAT_LABEL = { protein: 'Protein', iron: 'Iron-containing foods', vitC: 'Vitamin C sources', fruits: 'Fruits', veg: 'Vegetables', snacks: 'Healthy snacks', drinks: 'Nutritious drinks' };

export async function render(container) {
  const date = todayStr();
  let day = await DB.getDay(date);
  clear(container);
  container.append(pageHead('Nutrition', 'Colorful, balanced eating — the Pakistani kitchen way. 🥗'));
  container.append(h('div', { class: 'card tint' }, h('p', { class: 'small', style: 'margin:0' }, '🩺 ' + HEALTH_NOTICE)));

  const done = Object.values(day.nutrition.checklist).filter(Boolean).length;
  const pct = pctDone(done, 6);
  const clCard = h('div', { class: 'card' },
    h('div', { class: 'row' }, h('h3', { class: 'grow', style: 'margin:0' }, "Today's checklist"), h('span', { class: 'pill ' + (pct === 100 ? 'good' : '') }, `${done}/6`)),
    h('div', { class: 'bar', style: 'margin:8px 0' }, h('i', { style: `width:${pct}%` })));
  for (const [key, label, sub] of CHECKS) {
    clCard.append(checkRow(label, sub, day.nutrition.checklist[key], async (v) => {
      const d = await DB.getDay(date); d.nutrition.checklist[key] = v; await DB.saveDay(d); rerender();
    }));
  }
  container.append(clCard);

  // food log
  const logCard = h('div', { class: 'card' },
    h('div', { class: 'row' }, h('h3', { class: 'grow', style: 'margin:0' }, 'Food log'), h('button', { class: 'btn small soft', onclick: addFood }, '+ Log food')));
  if (!day.nutrition.items.length) logCard.append(h('p', { class: 'small muted' }, 'Nothing logged yet.'));
  [...day.nutrition.items].reverse().forEach((it) => {
    logCard.append(h('div', { class: 'list-item' },
      it.photo ? h('img', { src: it.photo, class: 'thumb', alt: '' }) : h('span', { style: 'font-size:1.5em' }, '🍛'),
      h('div', { class: 'grow' }, h('b', {}, esc(it.name)), h('div', { class: 'tiny muted' }, `${esc(it.qty || '')} · ${fmtTime(it.time)}${it.note ? ' · ' + esc(it.note) : ''}`)),
      h('button', { class: 'btn small ghost', onclick: async () => { const d = await DB.getDay(date); d.nutrition.items = d.nutrition.items.filter((x) => x.id !== it.id); await DB.saveDay(d); rerender(); } }, '✕')));
  });
  container.append(logCard);

  // suggestions
  const sugCard = h('div', { class: 'card' }, h('h3', {}, 'Ideas from your kitchen 🍲'), h('p', { class: 'small muted' }, 'Tap “ate it” to add to your log.'));
  for (const [cat, label] of Object.entries(CAT_LABEL)) {
    sugCard.append(h('h3', { style: 'margin:12px 0 6px;font-size:.95em' }, label));
    const wrap = h('div', { class: 'btn-row' });
    for (const f of FOODS[cat]) {
      wrap.append(h('span', { class: 'chip', style: 'cursor:default' }, esc(f),
        h('button', { class: 'link-btn', style: 'padding:2px 4px', onclick: (e) => { e.stopPropagation(); ateIt(f); } }, '+ ate it')));
    }
    sugCard.append(wrap);
  }
  container.append(sugCard);

  async function ateIt(name) {
    const d = await DB.getDay(date);
    d.nutrition.items.push({ id: uid(), name, qty: '1 serving', time: nowTimeStr(), note: '' });
    await DB.saveDay(d);
    toast(`Logged: ${name} 🥗`);
    rerender();
  }
  function rerender() { render(container); }

  function addFood() {
    const nameIn = input('', { placeholder: 'e.g. Daal + roti' });
    const qtyIn = input('', { placeholder: 'e.g. 1 plate, 2 pcs…' });
    const timeIn = input(nowTimeStr(), { type: 'time' });
    const noteIn = input('', { placeholder: 'Notes (optional)' });
    const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    let photo = null;
    const body = h('div', {},
      field('Food', nameIn), field('Approximate quantity', qtyIn), field('Time', timeIn),
      field('Photo (optional)', h('button', { class: 'btn', onclick: () => file.click() }, '📷 Add photo'), file),
      field('Notes', noteIn),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => {
        if (!nameIn.value.trim()) { toast('Name the food first 🥗'); return; }
        const d = await DB.getDay(date);
        d.nutrition.items.push({ id: uid(), name: nameIn.value.trim(), qty: qtyIn.value.trim(), time: timeIn.value, note: noteIn.value.trim(), photo });
        await DB.saveDay(d); close(); rerender(); toast('Food logged 🥗');
      } }, 'Save')));
    file.addEventListener('change', async () => { if (file.files[0]) photo = await fileToDataURL(file.files[0], 800, 0.8); });
    const close = sheet('Log food', body);
  }
}
