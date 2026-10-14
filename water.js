/* My Wellness PWA — Water tracking */
import { DB } from './db.js';
import { h, clear, pageHead, field, input, toast, confirmDlg } from './ui.js';
import { barChart } from './charts.js';
import { todayStr, nowTimeStr, fmtTime, pctDone, addDays, fmtDateShort, dateRange, esc } from './util.js';

export async function render(container) {
  const profile = await DB.profile();
  const date = todayStr();
  let day = await DB.getDay(date);
  clear(container);
  container.append(pageHead('Water', 'Sip by sip — your body will thank you. 💧'));

  const targetMl = profile.waterTarget * profile.glassMl;
  const total = day.water.entries.reduce((a, e) => a + e.ml, 0);
  const pct = pctDone(total, targetMl);
  const glasses = Math.floor(total / profile.glassMl);

  // visual tracker
  const fillPct = Math.min(100, Math.round((total / targetMl) * 100));
  container.append(h('div', { class: 'card center' },
    h('div', { style: 'font-size:2.4em' }, '💧'),
    h('h2', { style: 'margin:4px 0' }, `${glasses}/${profile.waterTarget} glasses`),
    h('p', { class: 'muted small' }, `${total} ml of ${targetMl} ml · ${targetMl - total > 0 ? (targetMl - total) + ' ml to go' : 'target reached! 🎉'} · ${pct}%`),
    h('div', { style: 'height:150px;width:110px;margin:10px auto;border:3px solid var(--line);border-top:0;border-radius:0 0 40px 40px;position:relative;overflow:hidden;background:var(--bg-soft)' },
      h('div', { style: `position:absolute;bottom:0;left:0;right:0;height:${fillPct}%;background:linear-gradient(180deg,#bfe0f5,#7fb8e8);transition:height .5s` })),
    h('div', { class: 'btn-row', style: 'justify-content:center' },
      h('button', { class: 'btn primary', onclick: () => addMl(profile.glassMl) }, `+ 1 glass (${profile.glassMl} ml)`),
      h('button', { class: 'btn', onclick: () => addMl(Math.round(profile.glassMl / 2)) }, '+ ½ glass'),
      day.water.entries.length ? h('button', { class: 'btn ghost', onclick: undoLast }, '↩ Undo last') : null),
  ));

  // custom ml
  const customIn = input('', { type: 'number', placeholder: `Milliliters (glass = ${profile.glassMl} ml)`, min: 10, max: 2000 });
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Custom amount'),
    h('div', { class: 'row' }, customIn, h('button', { class: 'btn soft', onclick: () => {
      const v = Number(customIn.value);
      if (!v || v < 10) { toast('Enter a sensible amount in ml 💧'); return; }
      addMl(v); customIn.value = '';
    } }, 'Add'))));

  // today's entries
  const listCard = h('div', { class: 'card' }, h('h3', {}, "Today's entries"));
  if (!day.water.entries.length) listCard.append(h('p', { class: 'small muted' }, 'Nothing logged yet — tap +1 glass above to begin.'));
  [...day.water.entries].reverse().forEach((e, ri) => {
    const idx = day.water.entries.length - 1 - ri;
    listCard.append(h('div', { class: 'list-item' },
      h('span', { style: 'font-size:1.4em' }, '💧'),
      h('div', { class: 'grow' }, h('b', {}, `${e.ml} ml`), h('div', { class: 'tiny muted' }, fmtTime(e.t))),
      h('button', { class: 'btn small ghost', onclick: async () => {
        const d = await DB.getDay(date); d.water.entries.splice(idx, 1); await DB.saveDay(d); rerender();
      } }, '✕')));
  });
  container.append(listCard);

  // weekly averages
  const wk = h('div', { class: 'card' }, h('h3', {}, 'This week (ml per day)'));
  const weekDays = dateRange(addDays(date, -6), date);
  const recs = await DB.getDays(weekDays[0], date);
  const byDate = Object.fromEntries(recs.map((d) => [d.date, d]));
  const vals = weekDays.map((ds) => byDate[ds] ? byDate[ds].water.entries.reduce((a, e) => a + e.ml, 0) : 0);
  const cv = h('canvas', { class: 'chart' });
  wk.append(cv);
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / 7);
  wk.append(h('p', { class: 'small muted center' }, `Daily average this week: ${avg} ml`));
  container.append(wk);
  requestAnimationFrame(() => barChart(cv, { labels: weekDays.map((d) => fmtDateShort(d)), values: vals, unit: '' }));

  // monthly average
  const monthStart = date.slice(0, 7) + '-01';
  const mrecs = await DB.getDays(monthStart, date);
  const mvals = mrecs.map((d) => d.water.entries.reduce((a, e) => a + e.ml, 0));
  const mavg = mvals.length ? Math.round(mvals.reduce((a, b) => a + b, 0) / mvals.length) : 0;
  container.append(h('div', { class: 'card' }, h('h3', {}, 'This month'),
    h('p', {}, `Average on logged days: `, h('b', {}, `${mavg} ml`), ` (${mvals.length} days with entries)`),
    h('p', { class: 'hint' }, 'Averages use only your real entries — never guessed.')));

  // targets
  const tIn = input(String(profile.waterTarget), { type: 'number', min: 1, max: 20 });
  const gIn = input(String(profile.glassMl), { type: 'number', min: 100, max: 500, step: 10 });
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Targets'),
    field('Glasses per day', tIn), field('Glass size (ml)', gIn),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: async () => {
      const p = await DB.profile();
      p.waterTarget = Math.min(20, Math.max(1, Number(tIn.value) || 8));
      p.glassMl = Math.min(500, Math.max(100, Number(gIn.value) || 250));
      await DB.saveProfile(p); toast('Water targets updated 💧'); rerender();
    } }, 'Save targets')),
    h('p', { class: 'hint' }, 'Reminder times can be changed in Settings → Reminders. Suggested: 9:00, 10:30, 12:00, 1:30, 3:00, 4:30, 6:00, 7:30.')));

  async function addMl(ml) {
    const d = await DB.getDay(date);
    d.water.entries.push({ ml, t: nowTimeStr() });
    await DB.saveDay(d);
    toast(`+${ml} ml logged 💧`, { label: 'Undo', fn: async () => { const dd = await DB.getDay(date); dd.water.entries.pop(); await DB.saveDay(dd); rerender(); } });
    rerender();
  }
  async function undoLast() {
    const d = await DB.getDay(date); const last = d.water.entries.pop();
    await DB.saveDay(d);
    if (last) toast(`Removed ${last.ml} ml`, { label: 'Undo', fn: async () => { const dd = await DB.getDay(date); dd.water.entries.push(last); await DB.saveDay(dd); rerender(); } });
    rerender();
  }
  function rerender() { render(container); }
}
