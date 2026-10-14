/* My Wellness PWA — Meals: plan, complete, partial, skip, reschedule, notes, photos, history */
import { DB } from './db.js';
import { h, clear, pageHead, sheet, field, input, toast, confirmDlg, emptyState } from './ui.js';
import { todayStr, fmtTime, nowTimeStr, pctDone, esc, addDays, fmtDateShort, fileToDataURL, uid } from './util.js';
import { MEAL_SUGGESTIONS } from './content.js';

const MEALS = [['breakfast', '🍳', 'Breakfast'], ['lunch', '🥗', 'Lunch'], ['dinner', '🍲', 'Dinner']];
const STATUS_PILL = { done: ['good', 'Done ✓'], partial: ['warn', 'Partial'], skipped: ['bad', 'Skipped'], pending: ['', 'Pending'] };

export async function render(container) {
  const profile = await DB.profile();
  const date = todayStr();
  let day = await DB.getDay(date);
  clear(container);
  container.append(pageHead('Meals', 'Nourish yourself gently — no pressure, no guilt.'));

  const doneCount = MEALS.filter(([m]) => ['done', 'partial'].includes(day.meals[m].status)).length;
  const pct = pctDone(MEALS.reduce((a, [m]) => a + (day.meals[m].status === 'done' ? 1 : day.meals[m].status === 'partial' ? .5 : 0), 0), 3);
  container.append(h('div', { class: 'card tint' },
    h('div', { class: 'row' }, h('b', { class: 'grow' }, "Today's meals"), h('span', { class: 'pill ' + (pct === 100 ? 'good' : pct >= 50 ? 'warn' : '') }, `${doneCount}/3 · ${pct}%`)),
    h('div', { class: 'bar', style: 'margin-top:8px' }, h('i', { style: `width:${pct}%` }))));

  for (const [key, icon, label] of MEALS) {
    const m = day.meals[key];
    const [pillCls, pillTxt] = STATUS_PILL[m.status];
    const card = h('div', { class: 'card' },
      h('div', { class: 'row' }, h('span', { style: 'font-size:1.6em' }, icon), h('h3', { class: 'grow', style: 'margin:0' }, label), h('span', { class: 'pill ' + pillCls }, pillTxt)),
      h('p', { class: 'small muted' }, `Planned: ${fmtTime(m.planned)}${m.actual ? ` · Finished: ${fmtTime(m.actual)}` : ''}`),
      m.photo ? h('img', { src: m.photo, class: 'thumb', style: 'width:100%;height:120px;margin:6px 0', alt: 'Meal photo' }) : null,
      m.note ? h('p', { class: 'small' }, '📝 ' + esc(m.note)) : null,
      m.foods ? h('p', { class: 'small' }, '🍛 ' + esc(m.foods)) : null,
      h('div', { class: 'btn-row' },
        m.status !== 'done' ? h('button', { class: 'btn small primary', onclick: () => setStatus(key, 'done') }, '✓ Done') : null,
        m.status === 'pending' ? h('button', { class: 'btn small soft', onclick: () => setStatus(key, 'partial') }, 'Partial') : null,
        m.status === 'pending' ? h('button', { class: 'btn small', onclick: () => setStatus(key, 'skipped') }, 'Skip') : null,
        ['done', 'partial', 'skipped'].includes(m.status) ? h('button', { class: 'btn small ghost', onclick: () => setStatus(key, 'pending') }, '↩ Undo') : null,
        h('button', { class: 'btn small', onclick: () => rescheduleSheet(key, label) }, '⏰ Reschedule'),
        h('button', { class: 'btn small', onclick: () => detailsSheet(key, label, icon) }, '📝 Details'),
      ));
    container.append(card);
  }

  // snacks
  const snackCard = h('div', { class: 'card' }, h('div', { class: 'row' }, h('h3', { class: 'grow', style: 'margin:0' }, 'Snacks 🍌'),
    h('button', { class: 'btn small soft', onclick: addSnack }, '+ Add snack')));
  if (!day.meals.snacks.length) snackCard.append(h('p', { class: 'small muted' }, 'No snacks logged. Snacks are optional — only if you feel like it.'));
  for (const s of day.meals.snacks) {
    snackCard.append(h('div', { class: 'list-item' },
      h('div', { class: 'grow' }, h('b', {}, esc(s.name)), h('div', { class: 'tiny muted' }, `${fmtTime(s.time)} · ${esc(s.status)}`)),
      s.status === 'pending' ? h('button', { class: 'btn small soft', onclick: async () => { s.status = 'done'; await DB.saveDay(day); rerender(); } }, 'Done') : null,
      h('button', { class: 'btn small ghost', onclick: async () => { day.meals.snacks = day.meals.snacks.filter((x) => x.id !== s.id); await DB.saveDay(day); rerender(); } }, '✕')));
  }
  container.append(snackCard);

  // 7-day history
  const hist = h('div', { class: 'card' }, h('h3', {}, 'Recent history'));
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(date, -i));
  const records = await DB.getDays(days[0], date);
  const byDate = Object.fromEntries(records.map((d) => [d.date, d]));
  const row = h('div', { class: 'row wrap' });
  for (const ds of days) {
    const d = byDate[ds];
    const dots = d ? MEALS.map(([m]) => {
      const st = d.meals[m].status;
      return `<span title="${m}: ${st}" style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:3px;background:${st === 'done' ? 'var(--good)' : st === 'partial' ? 'var(--warn)' : st === 'skipped' ? 'var(--bad)' : 'var(--line)'}"></span>`;
    }).join('') : '<span class="tiny muted">—</span>';
    row.append(h('div', { class: 'center', style: 'min-width:44px' }, h('div', { class: 'tiny muted' }, fmtDateShort(ds)), h('div', { html: dots })));
  }
  hist.append(row, h('p', { class: 'hint' }, '● done · ● partial · ● skipped · ● pending'));
  container.append(hist);

  async function setStatus(key, status) {
    day = await DB.getDay(date);
    const prev = { ...day.meals[key] };
    day.meals[key].status = status;
    day.meals[key].actual = status === 'done' || status === 'partial' ? nowTimeStr() : null;
    await DB.saveDay(day);
    if (status !== 'pending') toast(`${key[0].toUpperCase() + key.slice(1)}: ${status} ✓`, {
      label: 'Undo', fn: async () => { const d = await DB.getDay(date); d.meals[key] = prev; await DB.saveDay(d); rerender(); },
    });
    rerender();
  }
  function rerender() { render(container); }

  function rescheduleSheet(key, label) {
    const m = day.meals[key];
    const tIn = input(m.planned, { type: 'time' });
    const body = h('div', {}, field('New planned time', tIn),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => {
        const d = await DB.getDay(date); d.meals[key].planned = tIn.value || d.meals[key].planned;
        await DB.saveDay(d); close(); rerender(); toast(`${label} rescheduled to ${fmtTime(tIn.value)} ⏰`);
      } }, 'Save')));
    const close = sheet(`Reschedule ${label}`, body);
  }

  function detailsSheet(key, label, icon) {
    const m = day.meals[key];
    const foodsIn = input(m.foods || '', { placeholder: 'What did you eat?' });
    const noteIn = h('textarea', { placeholder: 'Notes (optional)' }, m.note || '');
    const sug = h('div', { class: 'btn-row' }, ...MEAL_SUGGESTIONS[key === 'breakfast' ? 'breakfast' : key === 'lunch' ? 'lunch' : 'dinner'].map((s) =>
      h('button', { class: 'chip', onclick: () => { foodsIn.value = foodsIn.value ? foodsIn.value + ', ' + s : s; } }, s)));
    const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    const imgPrev = h('div', {});
    const paintPhoto = () => { imgPrev.innerHTML = m.photo ? `<img src="${m.photo}" style="width:100%;border-radius:12px;margin-top:8px">` : ''; };
    paintPhoto();
    file.addEventListener('change', async () => { if (file.files[0]) { m.photo = await fileToDataURL(file.files[0], 800, 0.8); paintPhoto(); } });
    const body = h('div', {},
      field('Foods', foodsIn), h('label', { class: 'f' }, 'Suggestions — tap to add'), sug,
      field('Photo (optional)', h('button', { class: 'btn', onclick: () => file.click() }, '📷 Add photo'), file), imgPrev,
      field('Notes', noteIn),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => {
        const d = await DB.getDay(date); d.meals[key].foods = foodsIn.value; d.meals[key].note = noteIn.value; d.meals[key].photo = m.photo;
        await DB.saveDay(d); close(); rerender(); toast('Saved 🌸');
      } }, 'Save details')));
    const close = sheet(`${icon} ${label} details`, body);
  }

  function addSnack() {
    const nameIn = input('', { placeholder: 'e.g. Apple, yogurt…' });
    const body = h('div', {}, field('Snack', nameIn),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => {
        if (!nameIn.value.trim()) { toast('Give the snack a name first 🍎'); return; }
        const d = await DB.getDay(date);
        d.meals.snacks.push({ id: uid(), name: nameIn.value.trim(), time: nowTimeStr(), status: 'pending' });
        await DB.saveDay(d); close(); rerender();
      } }, 'Add snack')));
    const close = sheet('Add a snack', body);
  }
}
