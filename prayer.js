/* My Wellness PWA — Prayer tracker (offline, manual times, private) */
import { DB } from './db.js';
import { h, clear, pageHead, field, input, toast } from './ui.js';
import { todayStr, fmtTime, addDays, fmtDateShort, dateRange, esc } from './util.js';

const PRAYERS = [['fajr', 'Fajr', '🌅'], ['dhuhr', 'Dhuhr', '☀️'], ['asr', 'Asr', '🌤️'], ['maghrib', 'Maghrib', '🌇'], ['isha', 'Isha', '🌙']];

export async function render(container) {
  const profile = await DB.profile();
  const date = todayStr();
  let day = await DB.getDay(date);
  clear(container);
  container.append(pageHead('Prayer Tracker', 'A quiet record between you and Allah. 🤲'));

  const done = PRAYERS.filter(([k]) => day.prayer[k]).length;
  const card = h('div', { class: 'card' },
    h('div', { class: 'row' }, h('h3', { class: 'grow', style: 'margin:0' }, 'Today'), h('span', { class: 'pill ' + (done === 5 ? 'good' : '') }, `${done}/5`)));
  for (const [key, label, icon] of PRAYERS) {
    const tIn = input(day.prayer.times[key] || '', { type: 'time', style: 'width:110px;flex:none' });
    tIn.addEventListener('change', async () => {
      const d = await DB.getDay(date); d.prayer.times[key] = tIn.value; await DB.saveDay(d);
      const p = await DB.profile(); // keep profile default in sync for future days
      toast(`${label} time updated ⏰`);
    });
    const box = h('input', { type: 'checkbox' });
    box.checked = !!day.prayer[key];
    box.addEventListener('change', async () => {
      const d = await DB.getDay(date); d.prayer[key] = box.checked; await DB.saveDay(d);
      toast(box.checked ? `${label} marked complete 🤲` : `${label} unmarked`, box.checked ? null : undefined);
      rerender();
    });
    card.append(h('div', { class: 'check-row' },
      h('span', { style: 'font-size:1.5em' }, icon),
      h('span', { class: 'lbl grow' }, h('b', {}, label), h('span', {}, fmtTime(day.prayer.times[key]))),
      tIn, box));
  }
  card.append(h('p', { class: 'hint' }, 'Times are yours to set — the app does not fetch or auto-update prayer times. Adjust them in Settings → Prayer times.'));
  container.append(card);

  // weekly record
  const wk = h('div', { class: 'card' }, h('h3', {}, 'This week'));
  const week = dateRange(addDays(date, -6), date);
  const recs = await DB.getDays(week[0], date);
  const byDate = Object.fromEntries(recs.map((d) => [d.date, d]));
  const grid = h('div', {});
  const headRow = h('div', { class: 'row', style: 'font-size:.72em;color:var(--muted)' },
    h('span', { style: 'width:52px;flex:none' }, ''), ...week.map((ds) => h('span', { class: 'grow center' }, fmtDateShort(ds).split(' ')[0])));
  grid.append(headRow);
  for (const [key, label] of PRAYERS) {
    const r = h('div', { class: 'row' }, h('span', { class: 'small', style: 'width:52px;flex:none' }, label));
    for (const ds of week) {
      const d = byDate[ds];
      const v = d ? d.prayer[key] : false;
      r.append(h('span', { class: 'grow center' }, h('span', {
        style: `display:inline-block;width:22px;height:22px;border-radius:8px;background:${v ? 'var(--good)' : 'var(--bg-soft)'};color:#fff;font-size:.8em;line-height:22px`,
      }, v ? '✓' : '')));
    }
    grid.append(r);
  }
  wk.append(grid);
  const totalW = week.reduce((a, ds) => a + (byDate[ds] ? PRAYERS.filter(([k]) => byDate[ds].prayer[k]).length : 0), 0);
  wk.append(h('p', { class: 'small muted center' }, `${totalW} prayers recorded in the last 7 days`));
  container.append(wk);
  function rerender() { render(container); }
}
