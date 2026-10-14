/* My Wellness PWA — Mood Journal + Daily Diary (private, local only) */
import { DB } from './db.js';
import { h, clear, pageHead, sheet, field, input, toast, confirmDlg, emptyState, moodStars } from './ui.js';
import { lineChart } from './charts.js';
import { todayStr, fmtTime, fmtDate, fmtDateShort, esc, addDays, dateRange, download } from './util.js';

export async function render(container, { arg }) {
  if (arg === 'mood') return moodScreen(container);
  return diaryScreen(container);
}

/* ---------------- MOOD JOURNAL ---------------- */
async function moodScreen(container) {
  const date = todayStr();
  let day = await DB.getDay(date);
  clear(container);
  container.append(pageHead('Mood Journal', 'Notice your inner weather — no judgment. 🌤️'));

  let score = day.mood.score || 0;
  const card = h('div', { class: 'card center' }, h('h3', {}, 'How are you feeling right now?'));
  const stars = moodStars(score, (v) => { score = v; });
  card.append(stars.el);
  const mkScale = (label, icon, val) => {
    const wrap = h('div', { style: 'margin:10px 0' });
    const row = h('div', { class: 'row' });
    let v = val;
    for (let i = 1; i <= 5; i++) {
      const b = h('button', { class: 'chip' + (v === i ? ' on' : ''), onclick: () => { v = i; paint(); } }, String(i));
      row.append(b);
    }
    const paint = () => [...row.children].forEach((c, k) => c.classList.toggle('on', k + 1 === v));
    wrap.append(h('label', { class: 'f', style: 'text-align:left' }, `${icon} ${label} (optional)`), row);
    return { el: wrap, get: () => v };
  };
  const stress = mkScale('Stress', '😰', day.mood.stress || 0);
  const energy = mkScale('Energy', '⚡', day.mood.energy || 0);
  const sleep = mkScale('Sleep last night', '😴', day.mood.sleep || 0);
  const appetite = mkScale('Appetite', '🍽️', day.mood.appetite || 0);
  card.append(stress.el, energy.el, sleep.el, appetite.el);
  card.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => {
    if (!score) { toast('Pick a mood face first 💛'); return; }
    const d = await DB.getDay(date);
    d.mood = { score, stress: stress.get(), energy: energy.get(), sleep: sleep.get(), appetite: appetite.get(), at: fmtTime(new Date().toTimeString().slice(0, 5)) };
    await DB.saveDay(d); toast('Mood saved 💛'); render(container, { arg: 'mood' });
  } }, 'Save mood')));
  container.append(card);

  // trend: last 14 days
  const trend = h('div', { class: 'card' }, h('h3', {}, 'Mood trend (14 days)'));
  const days = dateRange(addDays(date, -13), date);
  const recs = await DB.getDays(days[0], date);
  const byDate = Object.fromEntries(recs.map((d) => [d.date, d]));
  const vals = days.map((ds) => (byDate[ds] && byDate[ds].mood.score) || null);
  if (vals.every((v) => v == null)) {
    trend.append(emptyState('📈', 'No mood data yet', 'Log your mood for a few days and your trend line will appear here.'));
  } else {
    const cv = h('canvas', { class: 'chart' });
    trend.append(cv, h('p', { class: 'hint center' }, '1 = low, 5 = bright. Gaps are days without an entry.'));
    requestAnimationFrame(() => {
      const filled = vals.map((v) => v || 0);
      lineChart(cv, { labels: days.map((d, i) => i % 2 ? '' : fmtDateShort(d)), values: filled, min: 0, max: 5 });
    });
  }
  container.append(trend);

  // recent entries
  const recent = h('div', { class: 'card' }, h('h3', {}, 'Recent check-ins'));
  const faces = ['😞', '🙁', '😐', '🙂', '😊'];
  let any = false;
  for (const ds of [...days].reverse()) {
    const d = byDate[ds];
    if (d && d.mood.score) {
      any = true;
      recent.append(h('div', { class: 'list-item' },
        h('span', { style: 'font-size:1.6em' }, faces[d.mood.score - 1]),
        h('div', { class: 'grow' }, h('b', {}, fmtDate(ds)), h('div', { class: 'tiny muted' },
          `${d.mood.score}/5${d.mood.at ? ' · ' + esc(d.mood.at) : ''}${d.mood.stress ? ` · stress ${d.mood.stress}` : ''}${d.mood.energy ? ` · energy ${d.mood.energy}` : ''}`))));
    }
  }
  if (!any) recent.append(h('p', { class: 'small muted' }, 'No check-ins yet.'));
  container.append(recent);
}

/* ---------------- DAILY DIARY ---------------- */
async function diaryScreen(container) {
  clear(container);
  container.append(pageHead('Daily Diary', 'Your private pages. Everything stays on this phone. 📔'));

  const searchIn = input('', { placeholder: '🔍 Search entries…' });
  const listWrap = h('div');
  container.append(h('div', { class: 'card' },
    h('div', { class: 'row' }, h('div', { class: 'grow' }, searchIn),
      h('button', { class: 'btn primary', style: 'flex:none', onclick: () => editorSheet(null) }, '✍️ New entry'))), listWrap);

  const paint = async (q = '') => {
    listWrap.innerHTML = '';
    const all = await DB.diaryList();
    const rows = all.filter((e) => !q || (e.text + ' ' + (e.good || '') + ' ' + (e.concern || '')).toLowerCase().includes(q.toLowerCase()));
    if (!rows.length) { listWrap.append(emptyState('📔', q ? 'No matches' : 'No entries yet', q ? 'Try a different search.' : 'Write your first entry — a few honest lines are enough.')); return; }
    for (const e of rows.slice(0, 60)) {
      listWrap.append(h('div', { class: 'card' },
        h('div', { class: 'row' }, h('b', { class: 'grow' }, fmtDate(e.date)), e.mood ? h('span', { class: 'pill info' }, `Mood ${e.mood}/5`) : null),
        h('p', {}, esc(e.text.length > 160 ? e.text.slice(0, 160) + '…' : e.text)),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn small', onclick: () => editorSheet(e) }, 'Open / edit'),
          h('button', { class: 'btn small ghost', onclick: async () => {
            if (await confirmDlg({ title: 'Delete this entry?', body: 'This cannot be undone.' })) { await DB.diaryDelete(e.id); toast('Entry deleted'); paint(searchIn.value); }
          } }, 'Delete'))));
    }
    if (rows.length > 60) listWrap.append(h('p', { class: 'hint center' }, `Showing 60 of ${rows.length} — use search to find older entries.`));
  };
  searchIn.addEventListener('input', () => paint(searchIn.value));
  await paint();

  // prefill from wellness prompt
  const prefill = (e) => { if (e.detail) editorSheet(null, e.detail); };
  window.addEventListener('mw:diary-prefill', prefill);

  function editorSheet(e, promptText) {
    const isNew = !e;
    e = e || { date: todayStr(), mood: 0, text: '', good: '', concern: '', energy: 0, stress: 0, intention: '' };
    const moodWrap = h('div', { class: 'stars' });
    let mood = e.mood || 0;
    const faces = ['😞', '🙁', '😐', '🙂', '😊'];
    const paintStars = () => [...moodWrap.children].forEach((b, i) => b.classList.toggle('on', i < mood));
    faces.forEach((f, i) => moodWrap.append(h('button', { type: 'button', onclick: () => { mood = i + 1; paintStars(); } }, f)));
    paintStars();
    const text = h('textarea', { placeholder: 'Dear diary… write freely.' }, e.text || '');
    if (promptText && !e.text) text.value = promptText + '\n\n';
    const good = input(e.good || '', { placeholder: 'One good thing today 🌷' });
    const concern = input(e.concern || '', { placeholder: 'Something on my mind…' });
    const intention = input(e.intention || '', { placeholder: 'Tomorrow I intend to…' });
    const body = h('div', {},
      field('Date', input(e.date, { type: 'date', onchange: (ev) => e.date = ev.target.value })),
      h('label', { class: 'f' }, 'Mood'), moodWrap,
      field('Your thoughts', text),
      field('One good thing', good), field('A concern', concern), field('Intention for tomorrow', intention),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn primary grow', onclick: async () => {
          if (!text.value.trim()) { toast('Write a little something first 📔'); return; }
          await DB.diarySave({ ...e, mood, text: text.value.trim(), good: good.value.trim(), concern: concern.value.trim(), intention: intention.value.trim() });
          close(); paint(searchIn.value); toast(isNew ? 'Entry saved 📔' : 'Entry updated 📔');
        } }, isNew ? 'Save entry' : 'Save changes'),
        !isNew ? h('button', { class: 'btn danger', onclick: async () => {
          if (await confirmDlg({ title: 'Delete this entry?', body: 'This cannot be undone.' })) { await DB.diaryDelete(e.id); close(); paint(searchIn.value); }
        } }, 'Delete') : null));
    const close = sheet(isNew ? 'New diary entry' : 'Edit entry', body, { wide: true });
  }
  return () => window.removeEventListener('mw:diary-prefill', prefill);
}
