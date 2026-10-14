/* My Wellness PWA — Progress dashboard, Weekly & Monthly reports (real data only) */
import { DB } from './db.js';
import { h, clear, pageHead, input, field, ring, emptyState } from './ui.js';
import { barChart, lineChart } from './charts.js';
import { todayStr, addDays, dateRange, weekStartStr, fmtDate, fmtDateShort, pctDone, esc } from './util.js';
import { dailyScore } from './home.js';
import { workSummary } from './work.js';

export async function render(container, { arg }) {
  if (arg === 'week') return weekReport(container);
  if (arg === 'month') return monthReport(container);
  return dayProgress(container);
}

async function scoreFor(date, profile) {
  const day = await DB.getDay(date);
  const parts = dailyScore(day, profile);
  const ws = await workSummary(date, profile);
  parts[3] = pctDone(ws.secs / 3600, profile.workTargetHrs);
  return { day, parts, ws, total: Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) };
}

/* ---------------- DAY ---------------- */
async function dayProgress(container) {
  const profile = await DB.profile();
  let date = todayStr();
  clear(container);
  const wrap = h('div');
  container.append(pageHead('Progress', 'Your real numbers — nothing guessed, nothing faked. 📊'));
  const picker = h('div', { class: 'card' }, field('Day', (() => { const i = input(date, { type: 'date', max: todayStr() }); i.addEventListener('change', () => { date = i.value || date; paint(); }); return i; })()));
  container.append(picker, wrap);

  async function paint() {
    wrap.innerHTML = '';
    const { day, parts, ws, total } = await scoreFor(date, profile);
    const hasAny = parts.some((p) => p > 0);
    wrap.append(h('div', { class: 'card center' }, h('div', { html: ring(total, 110) }),
      h('h3', {}, fmtDate(date)), hasAny ? h('p', { class: 'small muted' }, 'Overall daily completion') : null));
    if (!hasAny) { wrap.append(emptyState('🌱', 'No entries for this day', 'Log meals, water, mood or anything else and your progress will bloom here.')); return; }

    const cats = [
      ['Health 🌿', [['Meals', parts[0]], ['Water', parts[1]], ['Nutrition', parts[2]]]],
      ['Productivity 💼', [['Project work', parts[3]]]],
      ['Spirituality 🤲', [['Prayers', parts[4]]]],
      ['Self-care 🌸', [['Skincare', parts[5]], ['Grooming', parts[6]]]],
      ['Feelings 💛', [['Mood logged', parts[7]]]],
    ];
    for (const [title, rows] of cats) {
      const card = h('div', { class: 'card' }, h('h3', {}, title));
      for (const [label, v] of rows) {
        card.append(h('div', { class: 'row', style: 'margin:8px 0' },
          h('span', { class: 'small grow' }, label), h('b', { class: 'small' }, `${v}%`)),
          h('div', { class: 'bar' }, h('i', { style: `width:${v}%` })));
      }
      wrap.append(card);
    }
    // facts
    const waterMl = day.water.entries.reduce((a, e) => a + e.ml, 0);
    const tasks = await DB.taskList();
    wrap.append(h('div', { class: 'card' }, h('h3', {}, 'Day facts'),
      h('div', { class: 'grid2' },
        h('div', { class: 'stat' }, h('div', { class: 'v' }, `${Math.floor(waterMl / profile.glassMl)}/${profile.waterTarget}`), h('div', { class: 'k' }, 'glasses of water')),
        h('div', { class: 'stat' }, h('div', { class: 'v' }, (ws.secs / 3600).toFixed(1) + 'h'), h('div', { class: 'k' }, 'focused work')),
        h('div', { class: 'stat' }, h('div', { class: 'v' }, ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].filter((p) => day.prayer[p]).length + '/5'), h('div', { class: 'k' }, 'prayers')),
        h('div', { class: 'stat' }, h('div', { class: 'v' }, day.mood.score ? day.mood.score + '/5' : '—'), h('div', { class: 'k' }, 'mood')))));
  }
  await paint();
}

/* ---------------- WEEK ---------------- */
async function weekReport(container) {
  const profile = await DB.profile();
  let start = weekStartStr(todayStr());
  clear(container);
  container.append(pageHead('Weekly Report', 'Seven days at a glance. 📅'));
  const picker = h('div', { class: 'card' }, field('Week starting (Monday)', (() => { const i = input(start, { type: 'date' }); i.addEventListener('change', () => { if (i.value) { start = weekStartStr(i.value); paint(); } }); return i; })()));
  const wrap = h('div');
  container.append(picker, wrap);

  async function paint() {
    wrap.innerHTML = '';
    const days = dateRange(start, addDays(start, 6));
    const recs = await DB.getDays(start, addDays(start, 6));
    const byDate = Object.fromEntries(recs.map((d) => [d.date, d]));
    const scores = [];
    let waterMl = 0, workSecs = 0, prayers = 0, meals = 0, moods = [];
    for (const ds of days) {
      const { parts, total, day, ws } = await scoreFor(ds, profile);
      scores.push(total);
      waterMl += day.water.entries.reduce((a, e) => a + e.ml, 0);
      workSecs += ws.secs;
      prayers += ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].filter((p) => day.prayer[p]).length;
      meals += ['breakfast', 'lunch', 'dinner'].filter((m) => ['done', 'partial'].includes(day.meals[m].status)).length;
      if (day.mood.score) moods.push(day.mood.score);
    }
    const loggedDays = days.filter((ds) => byDate[ds]).length;
    if (!loggedDays) { wrap.append(emptyState('📅', 'No data this week', 'Keep logging — your weekly story builds one day at a time.')); return; }

    wrap.append(h('div', { class: 'card' }, h('h3', {}, 'Daily completion'),
      h('canvas', { class: 'chart', id: 'wkChart' })));
    requestAnimationFrame(() => {
      const cv = document.getElementById('wkChart');
      if (cv) barChart(cv, { labels: days.map((d) => fmtDateShort(d).split(' ')[0]), values: scores, unit: '%' });
    });

    wrap.append(h('div', { class: 'card' }, h('h3', {}, 'Week totals'),
      h('div', { class: 'grid2' },
        h('div', { class: 'stat' }, h('div', { class: 'v' }, (waterMl / 1000).toFixed(1) + 'L'), h('div', { class: 'k' }, 'water')),
        h('div', { class: 'stat' }, h('div', { class: 'v' }, (workSecs / 3600).toFixed(1) + 'h'), h('div', { class: 'k' }, 'focused work')),
        h('div', { class: 'stat' }, h('div', { class: 'v' }, `${prayers}/35`), h('div', { class: 'k' }, 'prayers')),
        h('div', { class: 'stat' }, h('div', { class: 'v' }, `${meals}/21`), h('div', { class: 'k' }, 'meals'))),
      h('p', { class: 'small muted center' }, moods.length ? `Average mood: ${(moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)}/5 across ${moods.length} check-ins` : 'No mood check-ins this week yet.'),
      h('p', { class: 'small muted center' }, `Based on ${loggedDays} day${loggedDays > 1 ? 's' : ''} with entries — days without entries are not counted as zero.`)));
  }
  await paint();
}

/* ---------------- MONTH ---------------- */
async function monthReport(container) {
  const profile = await DB.profile();
  let ym = todayStr().slice(0, 7);
  clear(container);
  container.append(pageHead('Monthly Report', 'Your month in soft colors. 🗓️'));
  const picker = h('div', { class: 'card' }, field('Month', (() => { const i = input(ym, { type: 'month' }); i.addEventListener('change', () => { if (i.value) { ym = i.value; paint(); } }); return i; })()));
  const wrap = h('div');
  container.append(picker, wrap);

  async function paint() {
    wrap.innerHTML = '';
    const [Y, M] = ym.split('-').map(Number);
    const daysIn = new Date(Y, M, 0).getDate();
    const days = Array.from({ length: daysIn }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
    const recs = await DB.getDays(days[0], days[days.length - 1]);
    const byDate = Object.fromEntries(recs.map((d) => [d.date, d]));
    if (!recs.length) { wrap.append(emptyState('🗓️', 'No data this month', 'Your monthly picture appears as you log your days.')); return; }

    // heatmap
    const heat = h('div', { class: 'card' }, h('h3', {}, 'Daily completion'));
    const grid = h('div', { class: 'heatmap' });
    const firstDow = (new Date(Y, M - 1, 1).getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) grid.append(h('span', { class: 'cell', style: 'visibility:hidden' }));
    let waterMl = 0, workSecs = 0, prayers = 0, moods = [];
    const scores = [];
    for (const ds of days) {
      const cell = h('span', { class: 'cell' }, String(Number(ds.slice(8))));
      if (byDate[ds]) {
        const { total, day, ws } = await scoreFor(ds, profile);
        scores.push(total);
        cell.style.background = total >= 70 ? 'var(--sage)' : total >= 40 ? 'var(--blush-deep)' : total > 0 ? 'var(--lav)' : 'var(--bg-soft)';
        cell.style.color = total > 0 ? '#fff' : 'var(--muted)';
        cell.title = `${fmtDate(ds)}: ${total}%`;
        waterMl += day.water.entries.reduce((a, e) => a + e.ml, 0);
        workSecs += ws.secs;
        prayers += ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].filter((p) => day.prayer[p]).length;
        if (day.mood.score) moods.push(day.mood.score);
      } else { scores.push(null); cell.title = fmtDate(ds); }
      grid.append(cell);
    }
    heat.append(grid, h('div', { class: 'legend' },
      h('span', {}, h('i', { style: 'background:var(--sage)' }), '70%+'),
      h('span', {}, h('i', { style: 'background:var(--blush-deep)' }), '40–69%'),
      h('span', {}, h('i', { style: 'background:var(--lav)' }), '1–39%'),
      h('span', {}, h('i', { style: 'background:var(--bg-soft)' }), 'no entries')));
    wrap.append(heat);

    const logged = recs.length;
    const avgScore = scores.filter((s) => s != null);
    wrap.append(h('div', { class: 'card' }, h('h3', {}, 'Month summary'),
      h('div', { class: 'grid2' },
        h('div', { class: 'stat' }, h('div', { class: 'v' }, logged), h('div', { class: 'k' }, 'days logged')),
        h('div', { class: 'stat' }, h('div', { class: 'v' }, avgScore.length ? Math.round(avgScore.reduce((a, b) => a + b, 0) / avgScore.length) + '%' : '—'), h('div', { class: 'k' }, 'avg completion')),
        h('div', { class: 'stat' }, h('div', { class: 'v' }, (waterMl / 1000).toFixed(1) + 'L'), h('div', { class: 'k' }, 'water total')),
        h('div', { class: 'stat' }, h('div', { class: 'v' }, (workSecs / 3600).toFixed(1) + 'h'), h('div', { class: 'k' }, 'work total')),
        h('div', { class: 'stat' }, h('div', { class: 'v' }, prayers), h('div', { class: 'k' }, 'prayers')),
        h('div', { class: 'stat' }, h('div', { class: 'v' }, moods.length ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : '—'), h('div', { class: 'k' }, 'avg mood'))),
      h('p', { class: 'hint center' }, 'Averages use only days with entries. This is a gentle mirror, not a grade.')));
  }
  await paint();
}
