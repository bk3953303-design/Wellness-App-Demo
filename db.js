/* My Wellness PWA — IndexedDB persistence layer. Everything is stored locally on the device. */
import { todayStr, uid } from './util.js';

const DB_NAME = 'mywellness-db';
const DB_VERSION = 1;

function defaultProfile() {
  return {
    name: '', preferredName: '', photo: null, dob: '', height: '', weight: '', goal: '',
    wakeTime: '07:00', bedTime: '23:00',
    mealTimes: { breakfast: '08:00', lunch: '12:30', dinner: '19:30' },
    waterTarget: 8, glassMl: 250,
    workTargetHrs: 4,
    prayerTimes: { fajr: '05:30', dhuhr: '12:45', asr: '16:15', maghrib: '18:20', isha: '19:45' },
    hairType: 'curly', washDays: [0, 3], // Sun & Wed
    skinPrefs: '', dietPrefs: '', allergies: '',
    theme: 'blush', accent: 'rose', fontSize: 'medium',
    notifPrefs: { enabled: true, quietDuringSleep: true },
    privacyLock: false,
    onboarded: false,
  };
}

function blankDay(dateStr, profile) {
  const p = profile || defaultProfile();
  const mk = (planned) => ({ status: 'pending', planned, actual: null, note: '', foods: '', photo: null });
  return {
    date: dateStr,
    meals: {
      breakfast: mk(p.mealTimes.breakfast),
      lunch: mk(p.mealTimes.lunch),
      dinner: mk(p.mealTimes.dinner),
      snacks: [],
    },
    water: { entries: [] },
    nutrition: {
      checklist: { protein: false, iron: false, fruit: false, veg: false, snack: false, meals: false },
      items: [], note: '',
    },
    prayer: {
      fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
      times: { ...p.prayerTimes },
    },
    skincare: {
      am: { cleanse: false, moisturize: false, sunscreen: false },
      pm: { cleanse: false, moisturize: false },
      note: '',
    },
    hair: { steps: { detangle: false, wash: false, condition: false, leavein: false }, note: '' },
    grooming: {
      items: { face: false, hair: false, clothes: false, hygiene: false, prep: false, makeup: false },
      minutes: 0,
    },
    mood: { score: 0, stress: 0, energy: 0, sleep: 0, appetite: 0, at: null },
    routine: { woke: null, bed: null },
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('days')) db.createObjectStore('days', { keyPath: 'date' });
      if (!db.objectStoreNames.contains('diary')) db.createObjectStore('diary', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('reminders')) db.createObjectStore('reminders', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const st = t.objectStore(store);
    let out;
    try { out = fn(st); } catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
    t.onerror = () => reject(t.error);
  });
}
const req2p = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const DB = {
  db: null,
  async init() {
    if (this.db) return;
    this.db = await openDb();
    const p = await this.kvGet('profile', null);
    if (!p) await this.kvSet('profile', defaultProfile());
  },
  async kvGet(key, fallback) {
    const v = await tx(this.db, 'kv', 'readonly', (st) => req2p(st.get(key)));
    return v === undefined ? fallback : v;
  },
  async kvSet(key, val) { await tx(this.db, 'kv', 'readwrite', (st) => st.put(val, key)); },
  async kvDel(key) { await tx(this.db, 'kv', 'readwrite', (st) => st.delete(key)); },

  async profile() { return (await this.kvGet('profile', null)) || defaultProfile(); },
  async saveProfile(p) { await this.kvSet('profile', p); },

  blankDay(dateStr, profile) { return blankDay(dateStr, profile); },
  async getDay(dateStr) {
    const found = await tx(this.db, 'days', 'readonly', (st) => req2p(st.get(dateStr)));
    if (found) return found;
    return blankDay(dateStr, await this.profile());
  },
  async saveDay(day) { await tx(this.db, 'days', 'readwrite', (st) => st.put(day)); },
  async getDays(fromStr, toStr) {
    const all = await tx(this.db, 'days', 'readonly', (st) => req2p(st.getAll()));
    return all.filter((d) => d.date >= fromStr && d.date <= toStr).sort((a, b) => a.date.localeCompare(b.date));
  },

  // diary
  async diaryList() {
    const all = await tx(this.db, 'diary', 'readonly', (st) => req2p(st.getAll()));
    return all.sort((a, b) => b.date.localeCompare(a.date) || (b.updated - a.updated));
  },
  async diaryGet(id) { return tx(this.db, 'diary', 'readonly', (st) => req2p(st.get(id))); },
  async diarySave(e) {
    if (!e.id) e.id = uid();
    e.updated = Date.now();
    await tx(this.db, 'diary', 'readwrite', (st) => st.put(e));
    return e;
  },
  async diaryDelete(id) { await tx(this.db, 'diary', 'readwrite', (st) => st.delete(id)); },

  // photos (blobs stored locally in IndexedDB)
  async photoList() {
    const all = await tx(this.db, 'photos', 'readonly', (st) => req2p(st.getAll()));
    return all.sort((a, b) => b.date.localeCompare(a.date));
  },
  async photoGet(id) { return tx(this.db, 'photos', 'readonly', (st) => req2p(st.get(id))); },
  async photoSave(p) {
    if (!p.id) p.id = uid();
    await tx(this.db, 'photos', 'readwrite', (st) => st.put(p));
    return p;
  },
  async photoDelete(id) { await tx(this.db, 'photos', 'readwrite', (st) => st.delete(id)); },

  // tasks & sessions
  async taskList() {
    const all = await tx(this.db, 'tasks', 'readonly', (st) => req2p(st.getAll()));
    return all.sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || a.created - b.created);
  },
  async taskSave(t) {
    if (!t.id) { t.id = uid(); t.created = Date.now(); }
    await tx(this.db, 'tasks', 'readwrite', (st) => st.put(t));
    return t;
  },
  async taskDelete(id) { await tx(this.db, 'tasks', 'readwrite', (st) => st.delete(id)); },
  async sessionsFor(dateStr) {
    const all = await tx(this.db, 'sessions', 'readonly', (st) => req2p(st.getAll()));
    return all.filter((s) => s.date === dateStr);
  },
  async allSessions() { return tx(this.db, 'sessions', 'readonly', (st) => req2p(st.getAll())); },
  async sessionSave(s) {
    if (!s.id) s.id = uid();
    await tx(this.db, 'sessions', 'readwrite', (st) => st.put(s));
    return s;
  },
  async sessionDelete(id) { await tx(this.db, 'sessions', 'readwrite', (st) => st.delete(id)); },

  // reminders
  async reminderList() {
    const all = await tx(this.db, 'reminders', 'readonly', (st) => req2p(st.getAll()));
    return all.sort((a, b) => a.time.localeCompare(b.time));
  },
  async reminderSave(r) {
    if (!r.id) r.id = uid();
    await tx(this.db, 'reminders', 'readwrite', (st) => st.put(r));
    return r;
  },
  async reminderDelete(id) { await tx(this.db, 'reminders', 'readwrite', (st) => st.delete(id)); },

  // backup / restore / wipe
  async exportAll() {
    const stores = ['kv', 'days', 'diary', 'photos', 'tasks', 'sessions', 'reminders'];
    const out = { app: 'mywellness-selfcare', version: 1, exportedAt: new Date().toISOString(), data: {} };
    for (const s of stores) {
      if (s === 'kv') {
        const keys = await tx(this.db, 'kv', 'readonly', (st) => req2p(st.getAllKeys()));
        const obj = {};
        for (const k of keys) obj[k] = await tx(this.db, 'kv', 'readonly', (st) => req2p(st.get(k)));
        out.data.kv = obj;
      } else {
        out.data[s] = await tx(this.db, s, 'readonly', (st) => req2p(st.getAll()));
      }
    }
    return out;
  },
  async importAll(payload) {
    if (!payload || payload.app !== 'mywellness-selfcare' || !payload.data) throw new Error('Not a My Wellness backup file.');
    const d = payload.data;
    for (const [k, v] of Object.entries(d.kv || {})) await this.kvSet(k, v);
    for (const s of ['days', 'diary', 'photos', 'tasks', 'sessions', 'reminders']) {
      await tx(this.db, s, 'readwrite', (st) => { st.clear(); });
      for (const rec of d[s] || []) await tx(this.db, s, 'readwrite', (st) => st.put(rec));
    }
  },
  async clearAll() {
    for (const s of ['kv', 'days', 'diary', 'photos', 'tasks', 'sessions', 'reminders'])
      await tx(this.db, s, 'readwrite', (st) => st.clear());
    await this.kvSet('profile', defaultProfile());
  },
};
