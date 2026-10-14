/* My Wellness PWA — Settings: themes, reminders, notifications, targets, privacy lock, data */
import { DB } from './db.js';
import { h, clear, pageHead, field, input, toast, confirmDlg, sheet } from './ui.js';
import { esc, fmtTime, sha256 } from './util.js';
import { Notify, LIMITATIONS } from './notify.js';
import { Router } from './router.js';
import { applyTheme } from './app.js';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CATS = [['meal', '🍽️ Meals'], ['water', '💧 Water'], ['fruit', '🍎 Fruit & veg'], ['prayer', '🤲 Prayer'], ['work', '💼 Work'], ['skincare', '🧴 Skincare'], ['hair', '💇‍♀️ Hair'], ['grooming', '🪞 Grooming'], ['mood', '💛 Mood'], ['diary', '📔 Diary'], ['bedtime', '🌙 Bedtime']];

export async function render(container, { navigate }) {
  const profile = await DB.profile();
  const d = JSON.parse(JSON.stringify(profile));
  clear(container);
  container.append(pageHead('Settings', 'Make the app yours. ⚙️'));

  /* appearance */
  const themeWrap = h('div', { class: 'row wrap' });
  const paintThemes = () => {
    themeWrap.innerHTML = '';
    for (const t of ['blush', 'sage', 'lavender', 'rose', 'dusk'])
      themeWrap.append(h('button', { class: 'chip' + (d.theme === t ? ' on' : ''), onclick: (e) => { d.theme = t; applyTheme(d); paintThemes(); } }, t[0].toUpperCase() + t.slice(1)));
  };
  paintThemes();
  const fontWrap = h('div', { class: 'row wrap' });
  const paintFonts = () => {
    fontWrap.innerHTML = '';
    for (const f of ['small', 'medium', 'large', 'xlarge'])
      fontWrap.append(h('button', { class: 'chip' + (d.fontSize === f ? ' on' : ''), onclick: () => { d.fontSize = f; applyTheme(d); paintFonts(); } }, { small: 'Small', medium: 'Medium', large: 'Large', 'xlarge': 'Extra large' }[f]));
  };
  paintFonts();
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Appearance 🎨'),
    field('Theme', themeWrap), field('Text size', fontWrap),
    h('p', { class: 'hint' }, 'Changes apply instantly and are remembered.')));

  /* notifications */
  const permCard = h('div', { class: 'card' }, h('h3', {}, 'Notifications 🔔'));
  const paintPerm = () => {
    permCard.innerHTML = ''; permCard.append(h('h3', {}, 'Notifications 🔔'));
    const p = Notify.perm();
    const label = p === 'granted' ? ['good', 'Allowed ✓'] : p === 'denied' ? ['bad', 'Blocked'] : p === 'unsupported' ? ['warn', 'Not supported here'] : ['', 'Not asked yet'];
    permCard.append(h('div', { class: 'row' }, h('span', { class: 'grow small' }, 'Permission status'), h('span', { class: 'pill ' + label[0] }, label[1])));
    if (p !== 'granted' && p !== 'unsupported') permCard.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: async () => { await Notify.request(); paintPerm(); } }, 'Allow notifications')));
    if (p === 'denied') permCard.append(h('p', { class: 'hint' }, 'Blocked in browser settings — open your phone\u2019s site settings for this app to allow them.'));
    permCard.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn soft', onclick: () => Notify.test() }, '🔔 Send a test reminder')));
    permCard.append(h('p', { class: 'hint' }, LIMITATIONS));
  };
  paintPerm();
  container.append(permCard);

  /* reminders editor */
  const remCard = h('div', { class: 'card' },
    h('div', { class: 'row' }, h('h3', { class: 'grow', style: 'margin:0' }, 'Reminders ⏰'),
      h('button', { class: 'btn small soft', onclick: () => reminderSheet(null) }, '+ New')));
  const paintRems = async () => {
    remCard.querySelectorAll('.list-item,.empty').forEach((x) => x.remove());
    const list = await DB.reminderList();
    if (!list.length) remCard.append(h('p', { class: 'small muted' }, 'No reminders. Add one — gentle nudges help.'));
    for (const r of list) {
      const tg = h('input', { type: 'checkbox', style: 'width:22px;height:22px;accent-color:var(--accent-deep)' });
      tg.checked = !!r.enabled;
      tg.addEventListener('change', async () => { r.enabled = tg.checked; await DB.reminderSave(r); });
      remCard.append(h('div', { class: 'list-item' }, tg,
        h('div', { class: 'grow' }, h('b', { class: 'small' }, esc(r.label)), h('div', { class: 'tiny muted' }, `${fmtTime(r.time)} · ${r.days.map((x) => DAYN[x]).join(', ')}`)),
        h('button', { class: 'btn small ghost', onclick: () => reminderSheet(r) }, 'Edit')));
    }
  };
  await paintRems();
  container.append(remCard);

  /* targets */
  const N = (key, min, max, step = 1) => { const i = input(d[key], { type: 'number', min, max, step }); i.addEventListener('change', () => d[key] = Math.min(max, Math.max(min, Number(i.value) || min))); return i; };
  const TP = (path) => {
    const ks = path.split('.'); const get = () => ks.reduce((o, k) => o[k], d);
    const i = input(get(), { type: 'time' });
    i.addEventListener('change', () => { let o = d; ks.slice(0, -1).forEach((k) => o = o[k]); o[ks[ks.length - 1]] = i.value; });
    return i;
  };
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Targets & times 🎯'),
    field('Water glasses per day', N('waterTarget', 1, 20)), field('Glass size (ml)', N('glassMl', 100, 500, 10)),
    field('Project work target (hours)', N('workTargetHrs', 1, 12, 0.5)),
    h('h3', {}, 'Meal times'), field('Breakfast', TP('mealTimes.breakfast')), field('Lunch', TP('mealTimes.lunch')), field('Dinner', TP('mealTimes.dinner')),
    h('h3', {}, 'Prayer times'), ...['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => field(p[0].toUpperCase() + p.slice(1), TP('prayerTimes.' + p)))));

  const washWrap = h('div', { class: 'row wrap' });
  DAYS.forEach((dn, i) => washWrap.append(h('button', {
    class: 'chip' + (d.washDays.includes(i) ? ' on' : ''),
    onclick: (e) => { d.washDays = d.washDays.includes(i) ? d.washDays.filter((x) => x !== i) : [...d.washDays, i]; e.currentTarget.classList.toggle('on'); },
  }, dn)));
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Hair wash days 💇‍♀️'), field('Wash days', washWrap)));

  container.append(h('div', { class: 'card' },
    h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => {
      d.onboarded = true; await DB.saveProfile(d); applyTheme(d); await Router.refreshChrome(); toast('Settings saved ⚙️');
    } }, '💾 Save all settings'))));

  /* privacy lock */
  const lockCard = h('div', { class: 'card' }, h('h3', {}, 'Privacy lock 🔒'),
    h('p', { class: 'small muted' }, 'Optional 4-digit PIN asked every time the app opens. If you forget it, the only recovery is erasing all app data.'));
  const paintLock = async () => {
    lockCard.innerHTML = ''; lockCard.append(h('h3', {}, 'Privacy lock 🔒'),
      h('p', { class: 'small muted' }, 'Optional 4-digit PIN asked every time the app opens. If you forget it, the only recovery is erasing all app data.'));
    if (d.privacyLock) lockCard.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn', onclick: () => pinSheet('change') }, 'Change PIN'),
      h('button', { class: 'btn ghost', onclick: async () => { d.privacyLock = false; await DB.kvDel('lockHash'); await DB.saveProfile(d); paintLock(); toast('Privacy lock off'); } }, 'Turn off')));
    else lockCard.append(h('button', { class: 'btn soft', onclick: () => pinSheet('set') }, '🔒 Set a PIN'));
  };
  await paintLock();
  container.append(lockCard);

  function pinSheet(mode) {
    const p1 = input('', { type: 'password', inputmode: 'numeric', maxlength: 4, placeholder: '4-digit PIN' });
    const p2 = input('', { type: 'password', inputmode: 'numeric', maxlength: 4, placeholder: 'Repeat PIN' });
    const body = h('div', {}, field(mode === 'set' ? 'Choose PIN' : 'New PIN', p1), field('Repeat PIN', p2),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => {
        if (!/^\d{4}$/.test(p1.value) || p1.value !== p2.value) { toast('PINs must match (4 digits)'); return; }
        await DB.kvSet('lockHash', await sha256('mw:' + p1.value));
        d.privacyLock = true; await DB.saveProfile(d); close(); paintLock(); toast('Privacy lock on 🔒');
      } }, 'Save PIN')));
    const close = sheet(mode === 'set' ? 'Set privacy PIN' : 'Change PIN', body);
  }

  /* data */
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Your data 💾'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn soft', onclick: () => navigate('export') }, 'Export & backup'),
      h('button', { class: 'btn danger', onclick: async () => {
        const first = await confirmDlg({ title: 'Erase everything?', body: 'All logs, photos, diary entries and settings on this device will be permanently deleted.', okText: 'Yes, erase', danger: true });
        if (!first) return;
        const second = await confirmDlg({ title: 'Really sure?', body: 'There is no undo. Consider downloading a backup first (Export & Backup).', okText: 'Erase everything', danger: true });
        if (second) { await DB.clearAll(); location.reload(); }
      } }, '🗑 Clear all data'))));

  container.append(h('p', { class: 'hint center' }, 'My Wellness v1.0 · works offline · your data never leaves this phone.'));

  function reminderSheet(r) {
    const isNew = !r;
    r = r || { cat: 'water', label: '', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: true, route: '#/water' };
    const catSel = h('select', {}, ...CATS.map(([v, l]) => h('option', { value: v, selected: r.cat === v }, l)));
    const labelIn = input(r.label, { placeholder: 'e.g. Drink some water 💧' });
    const timeIn = input(r.time, { type: 'time' });
    const dayWrap = h('div', { class: 'row wrap' });
    let days = [...r.days];
    DAYS.forEach((dn, i) => dayWrap.append(h('button', {
      type: 'button', class: 'chip' + (days.includes(i) ? ' on' : ''),
      onclick: (e) => { days = days.includes(i) ? days.filter((x) => x !== i) : [...days, i]; e.currentTarget.classList.toggle('on'); },
    }, dn)));
    catSel.addEventListener('change', () => {
      const routes = { meal: '#/meals', water: '#/water', fruit: '#/nutrition', prayer: '#/prayer', work: '#/work', skincare: '#/skincare', hair: '#/hair', grooming: '#/grooming', mood: '#/mood', diary: '#/diary', bedtime: '#/routine' };
      r.route = routes[catSel.value];
    });
    const body = h('div', {}, field('Category', catSel), field('Message', labelIn), field('Time', timeIn), field('Days', dayWrap),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn primary grow', onclick: async () => {
          if (!labelIn.value.trim()) { toast('Give the reminder a message ⏰'); return; }
          if (!days.length) { toast('Pick at least one day'); return; }
          await DB.reminderSave({ ...r, cat: catSel.value, label: labelIn.value.trim(), time: timeIn.value || '09:00', days });
          close(); paintRems(); toast(isNew ? 'Reminder added ⏰' : 'Reminder updated ⏰');
        } }, isNew ? 'Add reminder' : 'Save'),
        !isNew ? h('button', { class: 'btn danger', onclick: async () => {
          if (await confirmDlg({ title: 'Delete reminder?', body: '“' + r.label + '”' })) { await DB.reminderDelete(r.id); close(); paintRems(); }
        } }, 'Delete') : null));
    const close = sheet(isNew ? 'New reminder' : 'Edit reminder', body);
  }
}
