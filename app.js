/* My Wellness — Self-Care — application boot */
import { DB } from './db.js';
import { Router } from './router.js';
import { Notify } from './notify.js';
import { h, clear, confirmDlg, toast } from './ui.js';
import { sha256, fileToDataURL } from './util.js';

export function applyTheme(profile) {
  const root = document.documentElement;
  root.dataset.theme = profile.theme || 'blush';
  root.dataset.fontsize = profile.fontSize || 'medium';
  const themeColors = { blush: '#f6e7e2', sage: '#e9efe4', lavender: '#ede8f4', rose: '#f4e4e1', dusk: '#e3d7cf' };
  document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColors[profile.theme] || '#f6e7e2');
}
window.mwApplyTheme = applyTheme;

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('sw.js', { scope: './' });
  } catch (e) {
    console.warn('Service worker registration failed (offline caching unavailable):', e);
  }
}

/* ---------- privacy lock ---------- */
async function checkLock() {
  const profile = await DB.profile();
  if (!profile.privacyLock) return true;
  const hash = await DB.kvGet('lockHash', null);
  if (!hash) return true;
  return new Promise((resolve) => {
    const scr = document.getElementById('lockScreen');
    scr.hidden = false;
    const dots = document.getElementById('pinDots').children;
    const pad = document.getElementById('pinPad');
    clear(pad);
    let pin = '';
    const paint = () => [...dots].forEach((d, i) => d.classList.toggle('f', i < pin.length));
    const press = async (k) => {
      if (k === 'clr') { pin = ''; paint(); return; }
      if (k === 'del') { pin = pin.slice(0, -1); paint(); return; }
      if (pin.length >= 4) return;
      pin += k; paint();
      if (pin.length === 4) {
        const ok = (await sha256('mw:' + pin)) === hash;
        if (ok) { scr.hidden = true; resolve(true); }
        else { toast('Wrong PIN — try again'); pin = ''; setTimeout(paint, 250); }
      }
    };
    ['1','2','3','4','5','6','7','8','9','clr','0','del'].forEach((k) => {
      pad.append(h('button', { onclick: () => press(k) }, k === 'clr' ? 'C' : k === 'del' ? '⌫' : k));
    });
    document.getElementById('lockTitle').textContent =
      'Welcome back, ' + (profile.preferredName || profile.name || 'Friend');
    document.getElementById('lockReset').onclick = async () => {
      const ok = await confirmDlg({
        title: 'Reset everything?',
        body: 'This erases ALL app data on this device (there is no way to recover a forgotten PIN otherwise). Continue?',
        okText: 'Erase everything', danger: true,
      });
      if (ok) { await DB.clearAll(); location.reload(); }
    };
    paint();
  });
}

/* ---------- onboarding wizard ---------- */
async function maybeOnboard() {
  const profile = await DB.profile();
  if (profile.onboarded) return;
  await new Promise((resolve) => {
    const root = document.getElementById('onboardRoot');
    const steps = ['Welcome', 'About you', 'Your day', 'Targets', 'Make it yours'];
    let i = 0;
    const draft = { ...profile };
    const body = h('div');
    const render = () => {
      clear(body);
      body.append(
        h('div', { class: 'ob-steps' }, ...steps.map((s, k) => h('i', { class: k <= i ? 'on' : '' }))),
        STEP_VIEWS[i](),
        h('div', { class: 'btn-row' },
          i > 0 ? h('button', { class: 'btn', onclick: () => { i--; render(); } }, '← Back') : null,
          h('button', { class: 'btn primary grow', onclick: next }, i === steps.length - 1 ? 'Begin my journey 🌸' : 'Continue →'),
        ),
        i === 0 ? null : h('div', { class: 'center' }, h('button', { class: 'link-btn', onclick: () => finish(true) }, 'Skip for now')),
      );
    };
    const next = async () => { if (i < steps.length - 1) { i++; render(); } else finish(false); };
    const finish = async (skipped) => {
      draft.onboarded = true;
      if (!draft.preferredName) draft.preferredName = draft.name || 'Friend';
      await DB.saveProfile(draft);
      await Notify.seedDefaults(draft);
      applyTheme(draft);
      root.innerHTML = '';
      resolve();
    };
    const fld = (label, inner, hint) => h('div', {}, h('label', { class: 'f' }, label), inner, hint ? h('p', { class: 'hint' }, hint) : null);
    const txt = (key, attrs = {}) => {
      const inp = h('input', { type: 'text', value: draft[key] || '', ...attrs });
      inp.addEventListener('input', () => draft[key] = inp.value);
      return inp;
    };
    const photoRow = () => {
      const wrap = h('div', { class: 'row' });
      const img = h('img', { class: 'avatar', alt: 'Profile photo' });
      const paint = () => { img.src = draft.photo || ''; img.style.display = draft.photo ? '' : 'none'; };
      const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
      file.addEventListener('change', async () => {
        if (file.files[0]) { draft.photo = await fileToDataURL(file.files[0], 256, 0.8); paint(); await Router.refreshChrome(); }
      });
      wrap.append(img, h('button', { class: 'btn soft', onclick: () => file.click() }, '📷 Choose photo'), file);
      paint();
      return wrap;
    };
    const STEP_VIEWS = [
      () => h('div', { class: 'ob-card center' },
        h('div', { style: 'font-size:3em' }, '🌸'),
        h('h1', {}, 'My Wellness — Self-Care'),
        h('p', { class: 'muted' }, 'A private space for gentle routines, healthy habits, prayer, work and quiet moments — all saved only on your phone. No account, no internet needed.'),
        h('p', { class: 'small' }, 'Let\u2019s set things up in under a minute. You can change everything later in Settings.')),
      () => h('div', { class: 'ob-card' }, h('h2', {}, 'About you 💛'),
        fld('Your name', txt('name', { placeholder: 'e.g. Ayesha' })),
        fld('What should I call you?', txt('preferredName', { placeholder: 'e.g. Ayesha' })),
        fld('Profile photo (optional)', photoRow()),
        fld('Personal goal (optional)', txt('goal', { placeholder: 'e.g. feel more energetic' }))),
      () => h('div', { class: 'ob-card' }, h('h2', {}, 'Your day 🗓️'),
        fld('Wake-up time', timeFld('wakeTime')), fld('Bedtime', timeFld('bedTime')),
        h('h3', {}, 'Meal times'),
        fld('Breakfast', timeFld('mealTimes.breakfast')), fld('Lunch', timeFld('mealTimes.lunch')), fld('Dinner', timeFld('mealTimes.dinner'))),
      () => h('div', { class: 'ob-card' }, h('h2', {}, 'Daily targets 🎯'),
        fld('Water glasses per day', numFld('waterTarget', 1, 20)),
        fld('Glass size (ml)', numFld('glassMl', 100, 500, 50)),
        fld('Project work target (hours)', numFld('workTargetHrs', 1, 12, 0.5)),
        h('p', { class: 'hint' }, 'Defaults are gentle suggestions — adjust anytime.')),
      () => h('div', { class: 'ob-card' }, h('h2', {}, 'Make it yours 🎨'),
        fld('Theme', themePicker()),
        fld('Text size', fontPicker()),
        h('p', { class: 'hint' }, 'Everything is stored privately on this device. You are all set!')),
    ];
    const timeFld = (path) => {
      const get = () => path.split('.').reduce((o, k) => o[k], draft);
      const inp = h('input', { type: 'time', value: get() });
      inp.addEventListener('change', () => {
        const ks = path.split('.'); let o = draft;
        ks.slice(0, -1).forEach((k) => o = o[k]); o[ks[ks.length - 1]] = inp.value;
      });
      return inp;
    };
    const numFld = (key, min, max, step = 1) => {
      const inp = h('input', { type: 'number', value: draft[key], min, max, step });
      inp.addEventListener('change', () => draft[key] = Math.min(max, Math.max(min, Number(inp.value) || min)));
      return inp;
    };
    const themePicker = () => {
      const wrap = h('div', { class: 'row wrap' });
      for (const t of ['blush', 'sage', 'lavender', 'rose', 'dusk']) {
        wrap.append(h('button', {
          class: 'chip' + (draft.theme === t ? ' on' : ''),
          onclick: (e) => { draft.theme = t; applyTheme(draft); [...wrap.children].forEach((c) => c.classList.remove('on')); e.currentTarget.classList.add('on'); },
        }, t[0].toUpperCase() + t.slice(1)));
      }
      return wrap;
    };
    const fontPicker = () => {
      const wrap = h('div', { class: 'row wrap' });
      for (const f of ['small', 'medium', 'large', 'xlarge']) {
        wrap.append(h('button', {
          class: 'chip' + (draft.fontSize === f ? ' on' : ''),
          onclick: (e) => { draft.fontSize = f; applyTheme(draft); [...wrap.children].forEach((c) => c.classList.remove('on')); e.currentTarget.classList.add('on'); },
        }, f[0].toUpperCase() + f.slice(1)));
      }
      return wrap;
    };
    root.append(h('div', { class: 'onboard' }, h('div', { class: 'onboard-inner' }, body)));
    render();
  });
}

async function boot() {
  try { await DB.init(); }
  catch (e) {
    document.getElementById('view').innerHTML =
      '<div class="card"><h2>Storage unavailable</h2><p class="muted">Your browser blocked local storage (private mode can do this). My Wellness keeps everything on your device, so it needs storage access to work.</p></div>';
    return;
  }
  const profile = await DB.profile();
  applyTheme(profile);
  const unlocked = await checkLock();
  if (!unlocked) return;
  await maybeOnboard();
  if (!location.hash) location.hash = '#/home';
  await Router.init();
  Notify.start();
  registerSW();
}
document.addEventListener('DOMContentLoaded', boot);
