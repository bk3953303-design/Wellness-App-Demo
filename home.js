/* My Wellness PWA — Home dashboard */
import { DB } from './db.js';
import { h, clear, ring, toast, pageHead, emptyState } from './ui.js';
import { todayStr, fmtDate, nowTimeStr, pctDone, esc, fmtTime } from './util.js';
import { Notify } from './notify.js';
import { workSummary } from './work.js';

function greeting() {
  const hr = new Date().getHours();
  if (hr < 5) return 'Good night';
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}

export function dailyScore(day, profile) {
  const meals = ['breakfast', 'lunch', 'dinner'].map((m) => day.meals[m]);
  const mealPts = meals.reduce((a, m) => a + (m.status === 'done' ? 1 : m.status === 'partial' ? 0.5 : 0), 0);
  const parts = [
    pctDone(mealPts, 3),
    pctDone(day.water.entries.reduce((a, e) => a + e.ml, 0), profile.waterTarget * profile.glassMl),
    pctDone(Object.values(day.nutrition.checklist).filter(Boolean).length, 6),
    pctDone(0, 1), // work filled by caller
    pctDone(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].filter((p) => day.prayer[p]).length, 5),
    pctDone([...Object.values(day.skincare.am), ...Object.values(day.skincare.pm)].filter(Boolean).length, 5),
    pctDone(Math.min(day.grooming.minutes, 15), 15),
    day.mood.score > 0 ? 100 : 0,
  ];
  return parts;
}

export async function render(container, { navigate }) {
  const profile = await DB.profile();
  const date = todayStr();
  const day = await DB.getDay(date);
  const name = profile.preferredName || profile.name || 'Friend';
  const ws = await workSummary(date, profile);
  const parts = dailyScore(day, profile);
  parts[3] = pctDone(ws.secs / 3600, profile.workTargetHrs);
  const total = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);

  const waterMl = day.water.entries.reduce((a, e) => a + e.ml, 0);
  const waterGlasses = waterMl / profile.glassMl;
  const mealsDone = ['breakfast', 'lunch', 'dinner'].filter((m) => ['done', 'partial'].includes(day.meals[m].status)).length;
  const nutDone = Object.values(day.nutrition.checklist).filter(Boolean).length;
  const prayersDone = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].filter((p) => day.prayer[p]).length;
  const skinDone = [...Object.values(day.skincare.am), ...Object.values(day.skincare.pm)].filter(Boolean).length;
  const washDay = profile.washDays.includes(new Date().getDay());
  const hairDone = Object.values(day.hair.steps).filter(Boolean).length;

  clear(container);
  container.append(
    h('div', { class: 'hero' },
      h('div', { class: 'row' },
        h('div', { class: 'grow' },
          h('h1', {}, `${greeting()}, ${esc(name)} 🌸`),
          h('p', { class: 'muted' }, fmtDate(date)),
          h('p', { class: 'small' }, total >= 70 ? 'You are doing beautifully today.' : total >= 40 ? 'A gentle, steady day — keep going.' : 'Be kind to yourself. Small steps count.')),
        profile.photo ? h('img', { class: 'avatar', src: profile.photo, alt: '' }) : h('div', { style: 'font-size:2.6em' }, '🌸')),
      h('div', { class: 'row', style: 'margin-top:12px' },
        h('div', { html: ring(total, 92) }),
        h('div', { class: 'grow' },
          h('b', {}, 'Daily Progress'),
          h('p', { class: 'small muted', style: 'margin:2px 0' }, `${total}% of your gentle day complete`),
          h('div', { class: 'bar' }, h('i', { style: `width:${total}%` }))))),
  );

  // quick actions
  const qa = h('div', { class: 'card' }, h('h3', {}, 'Quick actions ⚡'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn small soft', onclick: () => quickWater(day, profile) }, '💧 Drink Water'),
      h('button', { class: 'btn small soft', onclick: () => quickMeal(day, navigate) }, '🍽️ Meal Done'),
      h('button', { class: 'btn small soft', onclick: () => quickFruit(day) }, '🍎 Add Fruit'),
      h('button', { class: 'btn small soft', onclick: () => navigate('work') }, '💼 Start Work'),
      h('button', { class: 'btn small soft', onclick: () => navigate('skincare') }, '🧴 Skincare'),
      h('button', { class: 'btn small soft', onclick: () => navigate('mood') }, '💛 Log Mood'),
      h('button', { class: 'btn small soft', onclick: () => navigate('diary') }, '📔 Diary'),
    ));
  container.append(qa);

  // progress grid
  const statCard = (icon, label, value, sub, route) =>
    h('button', { class: 'card stat', style: 'cursor:pointer;text-align:center', onclick: () => navigate(route) },
      h('div', { style: 'font-size:1.6em' }, icon),
      h('div', { class: 'v' }, value), h('div', { class: 'k' }, label), sub ? h('div', { class: 'tiny muted' }, sub) : null);
  container.append(h('div', { class: 'grid2' },
    statCard('🍽️', 'Meals', `${mealsDone}/3`, 'today', 'meals'),
    statCard('💧', 'Water', `${Math.floor(waterGlasses)}/${profile.waterTarget}`, 'glasses', 'water'),
    statCard('🥗', 'Nutrition', `${nutDone}/6`, 'habits', 'nutrition'),
    statCard('💼', 'Work', `${(ws.secs / 3600).toFixed(1)}h`, `of ${profile.workTargetHrs}h`, 'work'),
    statCard('🤲', 'Prayers', `${prayersDone}/5`, 'today', 'prayer'),
    statCard('🧴', 'Skincare', `${skinDone}/5`, 'steps', 'skincare'),
    statCard('💇‍♀️', 'Hair', washDay ? `${hairDone}/4` : '—', washDay ? 'wash day' : 'not a wash day', 'hair'),
    statCard('🪞', 'Self-care', `${day.grooming.minutes}m`, 'of ~15m', 'grooming'),
  ));

  // mood check-in strip
  const moodCard = h('div', { class: 'card' },
    h('div', { class: 'row' }, h('h3', { class: 'grow' }, 'Mood check-in 💛'),
      day.mood.score > 0 ? h('span', { class: 'pill good' }, `${'⭐'.repeat(0)}${day.mood.score}/5`) : h('span', { class: 'pill' }, 'not logged')),
    day.mood.score > 0
      ? h('p', { class: 'small muted' }, `Logged at ${esc(day.mood.at || '')}. Be proud of noticing.`)
      : h('div', {}, h('p', { class: 'small muted' }, 'How is your heart today?'), h('button', { class: 'btn soft block', onclick: () => navigate('mood') }, 'Log my mood')),
  );
  container.append(moodCard);

  // upcoming reminders
  const remCard = h('div', { class: 'card' }, h('h3', {}, 'Upcoming ⏰'));
  const upcoming = await Notify.nextUpcoming(5);
  if (!upcoming.length) remCard.append(emptyState('🔕', 'No reminders', 'Turn reminders on in Settings to get gentle nudges.'));
  else for (const r of upcoming) {
    remCard.append(h('div', { class: 'list-item' },
      h('span', { style: 'font-size:1.4em' }, ({ meal: '🍽️', water: '💧', prayer: '🤲', work: '💼', skincare: '🧴', hair: '💇‍♀️', grooming: '🪞', mood: '💛', diary: '📔', bedtime: '🌙', fruit: '🍎' })[r.cat] || '🔔'),
      h('div', { class: 'grow' }, h('b', {}, esc(r.label)), h('div', { class: 'tiny muted' }, `${r.when} · ${fmtTime(r.time)}`)),
      h('button', { class: 'btn small ghost', onclick: () => navigate((r.route || '#/home').slice(2)) }, 'Open')));
  }
  container.append(remCard);

  async function quickWater(d, p) {
    d.water.entries.push({ ml: p.glassMl, t: nowTimeStr() });
    await DB.saveDay(d);
    toast(`Logged 1 glass (${p.glassMl} ml) 💧`, { label: 'Undo', fn: async () => { const dd = await DB.getDay(date); dd.water.entries.pop(); await DB.saveDay(dd); window.dispatchEvent(new CustomEvent('mw:refresh')); } });
    window.dispatchEvent(new CustomEvent('mw:refresh'));
  }
  async function quickMeal(d, nav) {
    const next = ['breakfast', 'lunch', 'dinner'].find((m) => d.meals[m].status === 'pending');
    if (!next) { toast('All meals are already logged for today 🌸'); return; }
    const prev = d.meals[next].status;
    d.meals[next].status = 'done'; d.meals[next].actual = nowTimeStr();
    await DB.saveDay(d);
    toast(`${next[0].toUpperCase() + next.slice(1)} marked done 🍽️`, { label: 'Undo', fn: async () => { const dd = await DB.getDay(date); dd.meals[next].status = prev; dd.meals[next].actual = null; await DB.saveDay(dd); window.dispatchEvent(new CustomEvent('mw:refresh')); } });
    window.dispatchEvent(new CustomEvent('mw:refresh'));
  }
  async function quickFruit(d) {
    const was = d.nutrition.checklist.fruit;
    d.nutrition.checklist.fruit = true;
    d.nutrition.items.push({ id: 'q' + Date.now(), name: 'Fruit', qty: '1 serving', time: nowTimeStr(), note: 'Quick add from Home' });
    await DB.saveDay(d);
    toast('Fruit logged 🍎', { label: 'Undo', fn: async () => { const dd = await DB.getDay(date); dd.nutrition.checklist.fruit = was; dd.nutrition.items = dd.nutrition.items.filter((x) => !String(x.id).startsWith('q')); await DB.saveDay(dd); window.dispatchEvent(new CustomEvent('mw:refresh')); } });
    window.dispatchEvent(new CustomEvent('mw:refresh'));
  }
}
