/* My Wellness PWA — Profile (view & edit everything, local only) */
import { DB } from './db.js';
import { h, clear, pageHead, field, input, toast } from './ui.js';
import { esc, fileToDataURL } from './util.js';
import { Router } from './router.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function render(container) {
  const profile = await DB.profile();
  const d = JSON.parse(JSON.stringify(profile));
  clear(container);
  container.append(pageHead('Profile', 'All about you — stored only on this phone. 👤'));

  const img = h('img', { class: 'avatar', style: 'width:96px;height:96px', alt: 'Profile photo' });
  const paintImg = () => { img.src = d.photo || ''; img.style.display = d.photo ? '' : 'none'; };
  const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
  file.addEventListener('change', async () => { if (file.files[0]) { d.photo = await fileToDataURL(file.files[0], 256, 0.8); paintImg(); } });
  paintImg();
  container.append(h('div', { class: 'card center' }, img,
    h('h2', {}, esc(d.preferredName || d.name || 'Friend')),
    h('div', { class: 'btn-row', style: 'justify-content:center' },
      h('button', { class: 'btn small soft', onclick: () => file.click() }, '📷 Change photo'),
      d.photo ? h('button', { class: 'btn small ghost', onclick: () => { d.photo = null; paintImg(); } }, 'Remove') : null), file));

  const T = (key, attrs = {}) => { const i = input(d[key] || '', attrs); i.addEventListener('input', () => d[key] = i.value); return i; };
  const TP = (path) => {
    const ks = path.split('.'); const get = () => ks.reduce((o, k) => o[k], d);
    const i = input(get(), { type: 'time' });
    i.addEventListener('change', () => { let o = d; ks.slice(0, -1).forEach((k) => o = o[k]); o[ks[ks.length - 1]] = i.value; });
    return i;
  };
  const N = (key, min, max, step = 1) => { const i = input(d[key], { type: 'number', min, max, step }); i.addEventListener('change', () => d[key] = Math.min(max, Math.max(min, Number(i.value) || min))); return i; };

  container.append(h('div', { class: 'card' }, h('h3', {}, 'Basics'),
    field('Full name', T('name', { placeholder: 'Your name' })),
    field('Preferred name', T('preferredName', { placeholder: 'What should I call you?' })),
    field('Date of birth (optional)', T('dob', { type: 'date' })),
    h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Height (optional)', T('height', { placeholder: "e.g. 5'4\"" }))), h('div', { class: 'grow' }, field('Weight (optional)', T('weight', { placeholder: 'e.g. 55 kg' }))),
    field('Personal goal (optional)', T('goal', { placeholder: 'e.g. feel more energetic' })))));

  container.append(h('div', { class: 'card' }, h('h3', {}, 'Daily rhythm'),
    field('Wake-up time', TP('wakeTime')), field('Bedtime', TP('bedTime')),
    h('h3', {}, 'Meal times'), field('Breakfast', TP('mealTimes.breakfast')), field('Lunch', TP('mealTimes.lunch')), field('Dinner', TP('mealTimes.dinner'))));

  container.append(h('div', { class: 'card' }, h('h3', {}, 'Targets'),
    field('Water glasses per day', N('waterTarget', 1, 20)),
    field('Glass size (ml)', N('glassMl', 100, 500, 10)),
    field('Project work target (hours/day)', N('workTargetHrs', 1, 12, 0.5))));

  container.append(h('div', { class: 'card' }, h('h3', {}, 'Prayer times (manual)'),
    ...['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => field(p[0].toUpperCase() + p.slice(1), TP('prayerTimes.' + p))),
    h('p', { class: 'hint' }, 'The app never auto-updates these — adjust as times change through the year.')));

  const washWrap = h('div', { class: 'row wrap' });
  DAYS.forEach((dn, i) => washWrap.append(h('button', {
    class: 'chip' + (d.washDays.includes(i) ? ' on' : ''),
    onclick: (e) => { d.washDays = d.washDays.includes(i) ? d.washDays.filter((x) => x !== i) : [...d.washDays, i]; e.currentTarget.classList.toggle('on'); },
  }, dn)));
  const hairSel = h('select', {}, ...['straight', 'wavy', 'curly', 'coily'].map((t) => h('option', { value: t, selected: d.hairType === t }, t)));
  hairSel.addEventListener('change', () => d.hairType = hairSel.value);
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Hair & self-care'),
    field('Hair type', hairSel), field('Hair wash days', washWrap),
    field('Skincare preferences (optional)', T('skinPrefs', { placeholder: 'e.g. sensitive skin, fragrance-free' }))));

  container.append(h('div', { class: 'card' }, h('h3', {}, 'Food'),
    field('Dietary preferences (optional)', T('dietPrefs', { placeholder: 'e.g. vegetarian, desi home food' })),
    field('Food allergies (optional)', T('allergies', { placeholder: 'e.g. peanuts, lactose' }))));

  container.append(h('div', { class: 'card' },
    h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => {
      if (!d.preferredName) d.preferredName = d.name || 'Friend';
      d.onboarded = true;
      await DB.saveProfile(d);
      const { applyTheme } = await import('./app.js');
      applyTheme(d);
      await Router.refreshChrome();
      toast('Profile saved 🌸');
    } }, '💾 Save profile')),
    h('p', { class: 'hint center' }, 'Your profile never leaves this device. There is no account and no cloud.')));
}
