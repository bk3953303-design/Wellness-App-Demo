/* My Wellness PWA — hash router, drawer menu, bottom navigation */
import { DB } from './db.js';
import { h, clear, el } from './ui.js';
import { esc } from './util.js';

const ROUTES = [
  { path: 'home', title: 'Home', icon: '🏠', bottom: true, load: () => import('./home.js') },
  { path: 'routine', title: 'Daily Routine', icon: '🗓️', load: () => import('./routine.js') },
  { path: 'meals', title: 'Meals', icon: '🍽️', bottom: true, load: () => import('./meals.js') },
  { path: 'water', title: 'Water', icon: '💧', bottom: true, load: () => import('./water.js') },
  { path: 'nutrition', title: 'Nutrition', icon: '🥗', load: () => import('./nutrition.js') },
  { path: 'prayer', title: 'Prayer Tracker', icon: '🤲', load: () => import('./prayer.js') },
  { path: 'work', title: 'Project Work', icon: '💼', bottom: true, load: () => import('./work.js') },
  { path: 'skincare', title: 'Skincare', icon: '🧴', load: () => import('./care.js'), arg: 'skincare' },
  { path: 'hair', title: 'Hair Care', icon: '💇‍♀️', load: () => import('./care.js'), arg: 'hair' },
  { path: 'grooming', title: 'Personal Grooming', icon: '🪞', load: () => import('./care.js'), arg: 'grooming' },
  { path: 'wellness', title: 'Mental Wellness', icon: '💛', load: () => import('./wellness.js') },
  { path: 'mood', title: 'Mood Journal', icon: '🌤️', load: () => import('./journal.js'), arg: 'mood' },
  { path: 'diary', title: 'Daily Diary', icon: '📔', bottom: true, load: () => import('./journal.js'), arg: 'diary' },
  { path: 'progress', title: 'Progress', icon: '📊', load: () => import('./progress.js'), arg: 'day' },
  { path: 'photos', title: 'Photo Timeline', icon: '📸', load: () => import('./photos.js') },
  { path: 'weekly', title: 'Weekly Report', icon: '📅', load: () => import('./progress.js'), arg: 'week' },
  { path: 'monthly', title: 'Monthly Report', icon: '🗓️', load: () => import('./progress.js'), arg: 'month' },
  { path: 'profile', title: 'Profile', icon: '👤', load: () => import('./profile.js') },
  { path: 'export', title: 'Export & Backup', icon: '💾', load: () => import('./export.js') },
  { path: 'settings', title: 'Settings', icon: '⚙️', load: () => import('./settings.js') },
  { path: 'about', title: 'About', icon: '🌸', load: () => import('./about.js') },
];
const byPath = Object.fromEntries(ROUTES.map((r) => [r.path, r]));

export const Router = {
  current: null, cleanup: null,
  routeOf(hash) {
    const m = (hash || '#/home').match(/^#\/([a-z]+)/);
    return byPath[(m && m[1]) || 'home'] || byPath.home;
  },
  navigate(path) { location.hash = '#/' + path; },

  async init() {
    this.buildChrome();
    window.addEventListener('hashchange', () => this.render());
    window.addEventListener('mw:refresh', () => this.render(true));
    await this.render();
  },

  async buildChrome() {
    const profile = await DB.profile();
    // drawer header
    const head = document.getElementById('drawerHead');
    clear(head);
    head.append(
      profile.photo
        ? h('img', { class: 'avatar', src: profile.photo, alt: 'Profile photo' })
        : h('div', { class: 'avatar', html: '<span style="font-size:1.6em">🌸</span>' }),
      h('div', { class: 'who' }, h('b', {}, esc(profile.preferredName || profile.name || 'Friend')), h('span', { class: 'tiny muted' }, 'My Wellness')),
    );
    const mini = document.getElementById('avatarMini');
    clear(mini);
    if (profile.photo) mini.append(h('img', { src: profile.photo, alt: '' }));
    else mini.textContent = '🌸';
    // drawer nav
    const nav = document.getElementById('drawerNav');
    clear(nav);
    for (const r of ROUTES) {
      nav.append(h('button', {
        class: 'drawer-item', dataset: { path: r.path },
        onclick: () => this.navigate(r.path),
      }, h('span', { class: 'ico' }, r.icon), h('span', {}, r.title)));
    }
    // bottom nav
    const bn = document.getElementById('bottomnav');
    clear(bn);
    const bottoms = ROUTES.filter((r) => r.bottom);
    for (const r of bottoms) {
      bn.append(h('button', { dataset: { path: r.path }, onclick: () => this.navigate(r.path) },
        h('span', { class: 'b-ico' }, r.icon), h('span', {}, r.title)));
    }
    bn.append(h('button', { id: 'btnMore', onclick: () => this.openDrawer() },
      h('span', { class: 'b-ico' }, '☰'), h('span', {}, 'Menu')));
    document.getElementById('btnMenu').onclick = () => this.openDrawer();
    document.getElementById('btnAvatar').onclick = () => this.navigate('profile');
    document.getElementById('scrim').onclick = () => this.closeDrawer();
  },

  openDrawer() {
    document.getElementById('drawer').hidden = false;
    document.getElementById('scrim').hidden = false;
    requestAnimationFrame(() => document.getElementById('drawer').classList.add('open'));
  },
  closeDrawer() {
    const d = document.getElementById('drawer');
    d.classList.remove('open');
    setTimeout(() => { d.hidden = true; document.getElementById('scrim').hidden = true; }, 280);
  },

  async refreshChrome() { await this.buildChrome(); if (this.current) this.markActive(); },
  markActive() {
    const p = this.current.path;
    document.querySelectorAll('.drawer-item').forEach((b) => b.classList.toggle('active', b.dataset.path === p));
    document.querySelectorAll('.bottomnav button').forEach((b) => b.classList.toggle('active', b.dataset.path === p));
    document.getElementById('topbarTitle').textContent = this.current.title;
  },

  async render(keepScroll) {
    const route = this.routeOf(location.hash);
    this.current = route;
    this.closeDrawer();
    if (this.cleanup) { try { this.cleanup(); } catch {} this.cleanup = null; }
    const view = document.getElementById('view');
    clear(view);
    document.getElementById('topbar').hidden = false;
    document.getElementById('bottomnav').hidden = false;
    this.markActive();
    const mod = await route.load();
    const y = keepScroll ? window.scrollY : 0;
    const maybeCleanup = await mod.render(view, { arg: route.arg, navigate: (p) => this.navigate(p), route });
    if (typeof maybeCleanup === 'function') this.cleanup = maybeCleanup;
    window.scrollTo(0, y);
    view.focus({ preventScroll: true });
  },
};
