/* My Wellness PWA — Daily Routine timeline */
import { DB } from './db.js';
import { h, clear, pageHead } from './ui.js';
import { todayStr, fmtTime, fmtDate, esc } from './util.js';

export async function render(container, { navigate }) {
  const profile = await DB.profile();
  const date = todayStr();
  const day = await DB.getDay(date);
  clear(container);
  container.append(pageHead('Daily Routine', fmtDate(date) + ' — your gentle plan for today'));

  const items = [];
  const mealStatus = (m) => day.meals[m].status === 'done' ? 'done' : day.meals[m].status === 'partial' ? 'partial' : day.meals[m].status === 'skipped' ? 'skipped' : 'pending';
  items.push({ t: profile.wakeTime, icon: '☀️', label: 'Wake up', route: 'routine', done: !!day.routine.woke, note: day.routine.woke ? `Up at ${fmtTime(day.routine.woke)}` : 'Tap to log wake time' });
  items.push({ t: profile.mealTimes.breakfast, icon: '🍳', label: 'Breakfast', route: 'meals', done: mealStatus('breakfast') === 'done', note: mealStatus('breakfast') });
  items.push({ t: '08:30', icon: '🧴', label: 'Morning skincare', route: 'skincare', done: Object.values(day.skincare.am).every(Boolean) });
  items.push({ t: '08:15', icon: '🪞', label: 'Freshen up', route: 'grooming', done: day.grooming.minutes > 0 });
  items.push({ t: '10:00', icon: '💼', label: 'Project work', route: 'work', note: 'Focus sessions through the day' });
  items.push({ t: '11:00', icon: '🍎', label: 'Fruit moment', route: 'nutrition', done: day.nutrition.checklist.fruit });
  items.push({ t: profile.mealTimes.lunch, icon: '🥗', label: 'Lunch', route: 'meals', done: mealStatus('lunch') === 'done', note: mealStatus('lunch') });
  items.push({ t: '15:00', icon: '💧', label: 'Afternoon water check', route: 'water', note: `${day.water.entries.length} entries so far` });
  items.push({ t: profile.mealTimes.dinner, icon: '🍲', label: 'Dinner', route: 'meals', done: mealStatus('dinner') === 'done', note: mealStatus('dinner') });
  for (const [k, label] of [['fajr', 'Fajr'], ['dhuhr', 'Dhuhr'], ['asr', 'Asr'], ['maghrib', 'Maghrib'], ['isha', 'Isha']])
    items.push({ t: day.prayer.times[k], icon: '🤲', label: `${label} prayer`, route: 'prayer', done: day.prayer[k] });
  items.push({ t: '21:00', icon: '💛', label: 'Mood check-in', route: 'mood', done: day.mood.score > 0 });
  items.push({ t: '21:30', icon: '🧴', label: 'Evening skincare', route: 'skincare', done: Object.values(day.skincare.pm).every(Boolean) });
  items.push({ t: '22:00', icon: '📔', label: 'Diary', route: 'diary', note: 'A few honest lines' });
  items.push({ t: profile.bedTime, icon: '🌙', label: 'Bedtime', route: 'routine', done: !!day.routine.bed, note: day.routine.bed ? `In bed at ${fmtTime(day.routine.bed)}` : 'Wind down gently' });

  items.sort((a, b) => a.t.localeCompare(b.t));
  const now = new Date(); const nowT = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  let nextMarked = false;

  const card = h('div', { class: 'card' });
  for (const it of items) {
    const isNext = !nextMarked && !it.done && it.t >= nowT;
    if (isNext) nextMarked = true;
    card.append(h('button', {
      class: 'list-item', style: 'width:100%;text-align:left;background:' + (isNext ? 'var(--accent-soft)' : 'transparent') + ';border:0;border-bottom:1px solid var(--line-soft);cursor:pointer;border-radius:12px',
      onclick: () => { if (it.route === 'routine') wakeBedSheet(it); else navigate(it.route); },
    },
      h('span', { class: 'timeline-dot', style: `background:${it.done ? 'var(--good)' : isNext ? 'var(--accent)' : 'var(--line)'}` }),
      h('span', { style: 'font-size:1.5em' }, it.icon),
      h('span', { class: 'grow' }, h('b', {}, esc(it.label)), h('div', { class: 'tiny muted' }, esc(it.note || '') || (it.done ? 'done ✓' : 'pending'))),
      h('b', { class: 'small' }, fmtTime(it.t)),
    ));
  }
  container.append(card);
  container.append(h('p', { class: 'hint center' }, 'Times come from your profile — change them anytime in Settings. Nothing is marked complete automatically.'));

  async function wakeBedSheet(it) {
    const { sheet, field, input } = await import('./ui.js');
    const d = await DB.getDay(date);
    const wIn = input(d.routine.woke || '', { type: 'time' });
    const bIn = input(d.routine.bed || '', { type: 'time' });
    const body = h('div', {}, field('Woke up at', wIn), field('Went to bed at', bIn),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => { d.routine.woke = wIn.value || d.routine.woke; d.routine.bed = bIn.value || d.routine.bed; await DB.saveDay(d); close(); window.dispatchEvent(new CustomEvent('mw:refresh')); } }, 'Save')));
    const close = sheet(it.label === 'Wake up' ? 'Log wake time' : 'Log bedtime', body);
  }
}
