/* My Wellness PWA — Export & Backup: JSON backup/restore, CSV, print/PDF, share */
import { DB } from './db.js';
import { h, clear, pageHead, field, input, toast, confirmDlg, checkRow } from './ui.js';
import { todayStr, fmtDate, esc, download, addDays, dateRange } from './util.js';
import { dailyScore } from './home.js';
import { workSummary } from './work.js';

const SECTIONS = [
  ['profile', 'Profile & settings'],
  ['days', 'Daily logs (meals, water, prayer, care, mood)'],
  ['diary', 'Diary entries'],
  ['photos', 'Photos'],
  ['work', 'Tasks & work sessions'],
  ['reminders', 'Reminders'],
];

export async function render(container) {
  clear(container);
  container.append(pageHead('Export & Backup', 'Your data, in your hands. Nothing is ever shared automatically. 💾'));

  const chosen = Object.fromEntries(SECTIONS.map(([k]) => [k, true]));
  const selCard = h('div', { class: 'card' }, h('h3', {}, 'What to include'));
  for (const [k, label] of SECTIONS) selCard.append(checkRow(label, '', true, (v) => chosen[k] = v));
  container.append(selCard);

  // preview
  const prevCard = h('div', { class: 'card' }, h('h3', {}, 'Preview'));
  const paintPreview = async () => {
    prevCard.innerHTML = ''; prevCard.append(h('h3', {}, 'Preview'));
    const counts = await countsAll();
    for (const [k, label] of SECTIONS) {
      if (!chosen[k]) continue;
      prevCard.append(h('div', { class: 'list-item' }, h('span', { class: 'grow small' }, label), h('b', { class: 'small' }, counts[k])));
    }
  };
  container.append(prevCard);
  await paintPreview();
  selCard.addEventListener('change', paintPreview);

  // JSON backup
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Full backup (recommended)'),
    h('p', { class: 'small muted' }, 'Saves everything into one file on your phone. Keep it somewhere safe — you can restore it later, even on a new phone.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', onclick: backupJSON }, '⬇ Download backup (.json)'),
      h('button', { class: 'btn', onclick: restoreJSON }, '⬆ Restore from backup'))));

  // CSV exports
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Spreadsheets (CSV)'),
    h('p', { class: 'small muted' }, 'Open in Excel or Google Sheets.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn small', onclick: () => csvWater() }, 'Water'),
      h('button', { class: 'btn small', onclick: () => csvMood() }, 'Mood'),
      h('button', { class: 'btn small', onclick: () => csvMeals() }, 'Meals'),
      h('button', { class: 'btn small', onclick: () => csvWork() }, 'Work sessions'),
      h('button', { class: 'btn small', onclick: () => csvDiary() }, 'Diary'))));

  // PDF via print
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Printable report (PDF)'),
    h('p', { class: 'small muted' }, 'Generates a clean report of the last 7 days. In the print dialog, choose “Save as PDF”.'),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn soft', onclick: printReport }, '🖨 Print / Save as PDF'))));

  // share
  if (navigator.share || navigator.canShare) {
    container.append(h('div', { class: 'card' }, h('h3', {}, 'Share'),
      h('p', { class: 'small muted' }, 'Opens your phone\u2019s share sheet with a backup file. You choose where it goes — the app shares nothing by itself.'),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: shareBackup }, '📤 Share backup'))));
  }

  async function countsAll() {
    const profile = await DB.profile();
    const days = await DB.getDays('2000-01-01', '2999-12-31');
    const diary = await DB.diaryList();
    const photos = await DB.photoList();
    const tasks = await DB.taskList();
    const sessions = await DB.allSessions();
    const reminders = await DB.reminderList();
    return {
      profile: profile.preferredName ? '1 profile' : '1 profile',
      days: `${days.length} days`,
      diary: `${diary.length} entries`,
      photos: `${photos.length} photos`,
      work: `${tasks.length} tasks, ${sessions.length} sessions`,
      reminders: `${reminders.length} reminders`,
    };
  }

  async function buildPayload() {
    const full = await DB.exportAll();
    if (!chosen.profile) delete full.data.kv.profile;
    if (!chosen.days) full.data.days = [];
    if (!chosen.diary) full.data.diary = [];
    if (!chosen.photos) full.data.photos = [];
    if (!chosen.work) { full.data.tasks = []; full.data.sessions = []; }
    if (!chosen.reminders) full.data.reminders = [];
    return full;
  }

  async function backupJSON() {
    const payload = await buildPayload();
    download(`mw-backup-${todayStr()}.json`, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    toast('Backup downloaded — keep it safe 💾');
  }

  function restoreJSON() {
    const file = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    file.addEventListener('change', async () => {
      if (!file.files[0]) return;
      try {
        const payload = JSON.parse(await file.files[0].text());
        const ok = await confirmDlg({
          title: 'Restore backup?',
          body: 'This will REPLACE all current app data with the backup. Continue?',
          okText: 'Replace & restore', danger: true,
        });
        if (!ok) return;
        await DB.importAll(payload);
        toast('Backup restored 🌸 — reloading…');
        setTimeout(() => location.reload(), 900);
      } catch (e) { toast('That file is not a valid My Wellness backup.'); }
    });
    container.append(file); file.click(); setTimeout(() => file.remove(), 5000);
  }

  async function shareBackup() {
    try {
      const payload = await buildPayload();
      const f = new File([JSON.stringify(payload)], `mw-backup-${todayStr()}.json`, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'My Wellness backup' }); }
      else { download(f.name, f); toast('Share not supported — downloaded instead'); }
    } catch (e) { /* user cancelled */ }
  }

  const csv = (name, rows) => {
    const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    download(name, new Blob([rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
    toast(`${name} downloaded 📊`);
  };
  async function csvWater() {
    const days = await DB.getDays('2000-01-01', '2999-12-31');
    const rows = [['date', 'total_ml', 'entries']];
    for (const d of days) rows.push([d.date, d.water.entries.reduce((a, e) => a + e.ml, 0), d.water.entries.length]);
    csv(`mw-water-${todayStr()}.csv`, rows);
  }
  async function csvMood() {
    const days = await DB.getDays('2000-01-01', '2999-12-31');
    const rows = [['date', 'mood', 'stress', 'energy', 'sleep', 'appetite']];
    for (const d of days) if (d.mood.score) rows.push([d.date, d.mood.score, d.mood.stress, d.mood.energy, d.mood.sleep, d.mood.appetite]);
    csv(`mw-mood-${todayStr()}.csv`, rows);
  }
  async function csvMeals() {
    const days = await DB.getDays('2000-01-01', '2999-12-31');
    const rows = [['date', 'meal', 'status', 'planned', 'actual', 'foods', 'note']];
    for (const d of days) for (const m of ['breakfast', 'lunch', 'dinner']) {
      const x = d.meals[m]; rows.push([d.date, m, x.status, x.planned, x.actual || '', x.foods || '', x.note || '']);
    }
    csv(`mw-meals-${todayStr()}.csv`, rows);
  }
  async function csvWork() {
    const sessions = await DB.allSessions();
    const tasks = await DB.taskList();
    const tn = Object.fromEntries(tasks.map((t) => [t.id, t.title]));
    const rows = [['date', 'task', 'start', 'end', 'focused_minutes', 'manual']];
    for (const s of sessions) rows.push([s.date, tn[s.taskId] || 'General focus', new Date(s.start).toISOString(), new Date(s.end).toISOString(), Math.round((s.end - s.start - (s.pausedMs || 0)) / 60000), s.manual ? 'yes' : 'no']);
    csv(`mw-work-${todayStr()}.csv`, rows);
  }
  async function csvDiary() {
    const all = await DB.diaryList();
    const rows = [['date', 'mood', 'text', 'one_good_thing', 'concern', 'intention']];
    for (const e of all) rows.push([e.date, e.mood || '', e.text, e.good || '', e.concern || '', e.intention || '']);
    csv(`mw-diary-${todayStr()}.csv`, rows);
  }

  async function printReport() {
    const profile = await DB.profile();
    const end = todayStr(), start = addDays(end, -6);
    const days = dateRange(start, end);
    let html = `<h1>My Wellness — Self-Care — Weekly Report</h1><p>${fmtDate(start)} to ${fmtDate(end)} · ${esc(profile.preferredName || '')}</p>`;
    for (const ds of days) {
      const day = await DB.getDay(ds);
      const parts = dailyScore(day, profile);
      const ws = await workSummary(ds, profile); parts[3] = Math.round((ws.secs / 3600 / profile.workTargetHrs) * 100);
      const total = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
      const waterMl = day.water.entries.reduce((a, e) => a + e.ml, 0);
      html += `<div class="card"><h3>${fmtDate(ds)} — ${total}%</h3>
        <p>Meals: ${parts[0]}% · Water: ${waterMl} ml (${parts[1]}%) · Nutrition: ${parts[2]}% · Work: ${(ws.secs / 3600).toFixed(1)}h (${parts[3]}%) · Prayers: ${parts[4]}% · Skincare: ${parts[5]}% · Grooming: ${parts[6]}% · Mood: ${day.mood.score ? day.mood.score + '/5' : '—'}</p></div>`;
    }
    html += `<p class="hint">Generated on ${fmtDate(end)} from your on-device records. Private — share only if you choose to.</p>`;
    const pr = document.getElementById('printRoot');
    pr.innerHTML = html;
    window.print();
  }
}
