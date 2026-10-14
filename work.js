/* My Wellness PWA — Project work: focus timer, sessions, tasks */
import { DB } from './db.js';
import { h, clear, pageHead, sheet, field, input, toast, confirmDlg, emptyState } from './ui.js';
import { todayStr, nowTs, fmtTime, minsToHMS, pctDone, esc, addDays, uid, fmtDateShort } from './util.js';

export async function workSummary(dateStr, profile) {
  const sessions = await DB.sessionsFor(dateStr);
  let secs = 0;
  for (const s of sessions) secs += Math.max(0, ((s.end - s.start) - (s.pausedMs || 0)) / 1000);
  const active = await DB.kvGet('activeSession', null);
  if (active && active.date === dateStr) {
    secs += active.acc / 1000 + (active.state === 'running' ? (nowTs() - active.t0) / 1000 : 0);
  }
  return { secs, sessions, active };
}

export async function render(container) {
  const profile = await DB.profile();
  const date = todayStr();
  clear(container);
  container.append(pageHead('Project Work', 'Deep work in gentle sprints. Paused time never counts. 💼'));

  let sum = await workSummary(date, profile);
  const targetSecs = profile.workTargetHrs * 3600;
  const pct = pctDone(sum.secs, targetSecs);

  container.append(h('div', { class: 'card tint center' },
    h('div', { class: 'timer-big', id: 'workTimer' }, minsToHMS(sum.secs)),
    h('p', { class: 'muted small' }, `Today's focus · target ${profile.workTargetHrs}h · ${pct}%`),
    h('div', { class: 'bar' }, h('i', { style: `width:${pct}%` }))));

  // timer controls
  const tasks = await DB.taskList();
  const openTasks = tasks.filter((t) => t.status === 'open');
  const taskSel = h('select', {}, h('option', { value: '' }, 'No specific task (general focus)'),
    ...openTasks.map((t) => h('option', { value: t.id }, esc(t.title))));
  const timerCard = h('div', { class: 'card' }, h('h3', {}, 'Focus timer ⏱️'), field('Working on', taskSel));
  const btnRow = h('div', { class: 'btn-row' });
  timerCard.append(btnRow);
  const activeNote = h('p', { class: 'small muted' });
  timerCard.append(activeNote);
  container.append(timerCard);

  const paintButtons = async () => {
    btnRow.innerHTML = '';
    const a = await DB.kvGet('activeSession', null);
    const tname = a && a.taskId ? (tasks.find((t) => t.id === a.taskId) || {}).title : null;
    if (!a) {
      btnRow.append(h('button', { class: 'btn primary grow', onclick: startTimer }, '▶ Start session'));
      activeNote.textContent = 'Start a session, work in short sprints, pause whenever you need.';
    } else if (a.state === 'running') {
      btnRow.append(
        h('button', { class: 'btn grow', onclick: pauseTimer }, '⏸ Pause'),
        h('button', { class: 'btn danger', onclick: stopTimer }, '⏹ Stop & save'));
      activeNote.textContent = `Running${tname ? ` — ${tname}` : ''}. Paused time will not count.`;
    } else {
      btnRow.append(
        h('button', { class: 'btn primary grow', onclick: resumeTimer }, '▶ Resume'),
        h('button', { class: 'btn danger', onclick: stopTimer }, '⏹ Stop & save'));
      activeNote.textContent = `Paused${tname ? ` — ${tname}` : ''}. Take your time.`;
    }
  };
  await paintButtons();

  const tick = setInterval(async () => {
    const elT = document.getElementById('workTimer');
    if (!elT) { clearInterval(tick); return; }
    const s = await workSummary(date, profile);
    elT.textContent = minsToHMS(s.secs);
  }, 1000);

  async function startTimer() {
    const a = { taskId: taskSel.value || null, date, t0: nowTs(), acc: 0, pausedMs: 0, state: 'running' };
    await DB.kvSet('activeSession', a);
    toast('Focus session started 💪');
    paintButtons();
  }
  async function pauseTimer() {
    const a = await DB.kvGet('activeSession', null); if (!a) return;
    if (a.state === 'running') { a.acc += nowTs() - a.t0; a.state = 'paused'; }
    await DB.kvSet('activeSession', a); paintButtons();
  }
  async function resumeTimer() {
    const a = await DB.kvGet('activeSession', null); if (!a) return;
    if (a.state === 'paused') { a.t0 = nowTs(); a.state = 'running'; }
    // paused duration is simply not added to acc — paused time never counts
    await DB.kvSet('activeSession', a); paintButtons();
  }
  async function stopTimer() {
    const a = await DB.kvGet('activeSession', null); if (!a) return;
    const now = nowTs();
    let acc = a.acc; if (a.state === 'running') acc += now - a.t0;
    await DB.sessionSave({ date: a.date, taskId: a.taskId, start: now - acc, end: now, pausedMs: 0, note: '' });
    await DB.kvSet('activeSession', null);
    toast(`Session saved: ${minsToHMS(acc / 1000)} of focus 🎉`);
    rerender();
  }

  // manual entry
  const manCard = h('div', { class: 'card' },
    h('div', { class: 'row' }, h('h3', { class: 'grow', style: 'margin:0' }, 'Manual entry'),
      h('button', { class: 'btn small soft', onclick: manualSheet }, '+ Add time')));
  const todaySessions = sum.sessions;
  if (!todaySessions.length && !sum.active) manCard.append(h('p', { class: 'small muted' }, 'No sessions yet today.'));
  for (const s of [...todaySessions].reverse()) {
    const t = tasks.find((x) => x.id === s.taskId);
    const focused = Math.max(0, (s.end - s.start - (s.pausedMs || 0)) / 1000);
    manCard.append(h('div', { class: 'list-item' },
      h('span', { style: 'font-size:1.4em' }, '⏱️'),
      h('div', { class: 'grow' }, h('b', {}, esc(t ? t.title : 'General focus')),
        h('div', { class: 'tiny muted' }, `${fmtTime(new Date(s.start).toTimeString().slice(0, 5))} → ${fmtTime(new Date(s.end).toTimeString().slice(0, 5))}${s.manual ? ' · manual' : ''}`)),
      h('b', { class: 'small' }, minsToHMS(focused)),
      h('button', { class: 'btn small ghost', onclick: async () => {
        if (await confirmDlg({ title: 'Delete session?', body: 'This removes the recorded time.' })) { await DB.sessionDelete(s.id); rerender(); }
      } }, '✕')));
  }
  container.append(manCard);

  // tasks
  const doneN = tasks.filter((t) => t.status === 'done').length;
  const defN = tasks.filter((t) => t.status === 'deferred').length;
  const taskCard = h('div', { class: 'card' },
    h('div', { class: 'row' }, h('h3', { class: 'grow', style: 'margin:0' }, 'Tasks'),
      h('span', { class: 'pill good' }, `${doneN} done`), h('span', { class: 'pill warn' }, `${defN} postponed`),
      h('button', { class: 'btn small soft', onclick: () => taskSheet(null) }, '+ New task')));
  if (!tasks.length) taskCard.append(emptyState('📝', 'No tasks yet', 'Add your first task — small and specific beats big and vague.'));
  for (const t of tasks) {
    const pill = t.status === 'done' ? ['good', 'Done'] : t.status === 'deferred' ? ['warn', 'Postponed'] : ['info', t.priority];
    taskCard.append(h('div', { class: 'list-item' },
      h('div', { class: 'grow' }, h('b', { style: t.status === 'done' ? 'text-decoration:line-through' : '' }, esc(t.title)),
        h('div', { class: 'tiny muted' }, `${t.due ? 'Due ' + fmtDateShort(t.due) + ' · ' : ''}${esc(t.notes || '')}`),
        t.history && t.history.length ? h('div', { class: 'tiny muted' }, '↪ ' + esc(t.history[t.history.length - 1])) : null),
      h('span', { class: 'pill ' + pill[0] }, pill[1]),
      h('button', { class: 'btn small ghost', onclick: () => taskMenu(t) }, '⋯')));
  }
  container.append(taskCard);

  container.append(h('div', { class: 'card' }, h('h3', {}, 'Work target'),
    h('p', { class: 'small muted' }, 'Change your daily target in Settings → Project work. Default is 4 hours; 3 hours is a perfectly fine gentle target.')));

  function rerender() { clearInterval(tick); render(container); }

  function manualSheet() {
    const hrs = input('1', { type: 'number', min: 0, max: 12 });
    const mins = input('0', { type: 'number', min: 0, max: 59 });
    const tSel = h('select', {}, h('option', { value: '' }, 'General focus'), ...openTasks.map((t) => h('option', { value: t.id }, esc(t.title))));
    const note = input('', { placeholder: 'Note (optional)' });
    const body = h('div', {}, field('Task', tSel),
      h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Hours', hrs)), h('div', { class: 'grow' }, field('Minutes', mins))),
      field('Note', note),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => {
        const ms = ((Number(hrs.value) || 0) * 3600 + (Number(mins.value) || 0) * 60) * 1000;
        if (ms <= 0) { toast('Enter some time first ⏱️'); return; }
        const end = nowTs();
        await DB.sessionSave({ date, taskId: tSel.value || null, start: end - ms, end, pausedMs: 0, manual: true, note: note.value });
        close(); rerender(); toast('Time logged 💼');
      } }, 'Save')));
    const close = sheet('Log work manually', body);
  }

  function taskSheet(t) {
    const title = input(t ? t.title : '', { placeholder: 'e.g. Finish logo drafts' });
    const prio = h('select', {}, ...['low', 'medium', 'high'].map((p) => h('option', { value: p, selected: t && t.priority === p }, p)));
    const due = input(t && t.due ? t.due : '', { type: 'date' });
    const notes = input(t ? t.notes || '' : '', { placeholder: 'Notes (optional)' });
    const body = h('div', {}, field('Task', title), field('Priority', prio), field('Due date', due), field('Notes', notes),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => {
        if (!title.value.trim()) { toast('Give the task a title 📝'); return; }
        await DB.taskSave({ ...(t || {}), title: title.value.trim(), priority: prio.value, due: due.value || null, notes: notes.value.trim(), status: (t && t.status) || 'open', history: (t && t.history) || [] });
        close(); rerender(); toast('Task saved 📝');
      } }, t ? 'Save' : 'Add task')));
    const close = sheet(t ? 'Edit task' : 'New task', body);
  }

  function taskMenu(t) {
    const body = h('div', { class: 'btn-row' });
    const add = (label, cls, fn) => body.append(h('button', { class: 'btn ' + cls + ' block', onclick: async () => { close(); await fn(); } }, label));
    if (t.status !== 'done') add('✓ Mark complete', 'primary', async () => { t.status = 'done'; await DB.taskSave(t); rerender(); });
    if (t.status === 'open') {
      add('⏳ Postpone', '', async () => { t.status = 'deferred'; t.history = [...(t.history || []), `Postponed on ${date}`]; await DB.taskSave(t); rerender(); });
      add('↪ Carry forward to tomorrow', 'soft', async () => {
        t.due = addDays(date, 1); t.status = 'open';
        t.history = [...(t.history || []), `Carried forward on ${date} → due ${t.due}`];
        await DB.taskSave(t); rerender(); toast('Moved to tomorrow — history kept ↪');
      });
      add('✏️ Edit', '', async () => taskSheet(t));
    }
    if (t.status === 'deferred') add('↩ Reopen', 'soft', async () => { t.status = 'open'; await DB.taskSave(t); rerender(); });
    add('🗑 Delete', 'danger', async () => { if (await confirmDlg({ title: 'Delete task?', body: '“' + t.title + '” will be removed.' })) { await DB.taskDelete(t.id); rerender(); } });
    const close = sheet(t.title, body);
  }
  return () => clearInterval(tick);
}
