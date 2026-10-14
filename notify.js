/* My Wellness PWA — reminders & notifications.
   Works fully offline. The in-app engine fires reminders while the app is
   installed/open. OS-level exact alarms when the app is fully closed are NOT
   guaranteed for PWAs — this is explained honestly inside the app. */
import { DB } from './db.js';
import { h } from './ui.js';
import { todayStr, nowTimeStr, nowTs } from './util.js';

export const LIMITATIONS =
  'Reminders in this app are delivered by the app itself while it is open (or recently used). ' +
  'Mobile browsers and operating systems limit what a web app can do when fully closed: exact alarms at an ' +
  'exact minute are not guaranteed the way a native alarm-clock app can. For the most reliable reminders: ' +
  'allow notifications when asked, keep the app installed on your home screen, and open it once a day. ' +
  'A reminder appearing never marks anything complete — only you do, by tapping it in the app.';

const CAT_META = {
  meal: { icon: '🍽️', route: '#/meals' },
  water: { icon: '💧', route: '#/water', quick: 'water' },
  prayer: { icon: '🤲', route: '#/prayer' },
  work: { icon: '💼', route: '#/work' },
  skincare: { icon: '🧴', route: '#/skincare' },
  hair: { icon: '💇‍♀️', route: '#/hair' },
  grooming: { icon: '🪞', route: '#/grooming' },
  mood: { icon: '💛', route: '#/mood' },
  diary: { icon: '📔', route: '#/diary' },
  bedtime: { icon: '🌙', route: '#/routine' },
  fruit: { icon: '🍎', route: '#/nutrition' },
};

export const Notify = {
  timer: null,

  perm() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },
  async request() {
    if (!('Notification' in window)) return 'unsupported';
    try { return await Notification.requestPermission(); } catch { return Notification.permission; }
  },
  test() {
    this._banner({ label: 'Test reminder', cat: 'water', id: 'test', time: nowTimeStr() },
      'This is how reminders will look. 🌸 Everything is working!');
  },

  async seedDefaults(profile) {
    const existing = await DB.reminderList();
    if (existing.length) return;
    const all = [0, 1, 2, 3, 4, 5, 6];
    const mk = (cat, label, time, days = all) => ({ cat, label, time, days, enabled: true, route: (CAT_META[cat] || {}).route || '#/home' });
    const seeds = [
      mk('meal', 'Breakfast time 🍳', profile.mealTimes.breakfast),
      mk('meal', 'Lunch time 🥗', profile.mealTimes.lunch),
      mk('meal', 'Dinner time 🍲', profile.mealTimes.dinner),
      ...['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30']
        .map((t) => mk('water', 'Drink some water 💧', t)),
      mk('fruit', 'Fruit or veggie moment 🍎', '11:00'),
      mk('fruit', 'Evening fruit or snack 🍌', '17:00'),
      mk('prayer', 'Fajr prayer 🤲', profile.prayerTimes.fajr),
      mk('prayer', 'Dhuhr prayer 🤲', profile.prayerTimes.dhuhr),
      mk('prayer', 'Asr prayer 🤲', profile.prayerTimes.asr),
      mk('prayer', 'Maghrib prayer 🤲', profile.prayerTimes.maghrib),
      mk('prayer', 'Isha prayer 🤲', profile.prayerTimes.isha),
      mk('work', 'Project work session 💼', '10:00', [1, 2, 3, 4, 5]),
      mk('skincare', 'Morning skincare 🧴', '08:30'),
      mk('skincare', 'Evening skincare 🌙', '21:30'),
      mk('hair', 'Hair wash day 💇‍♀️', '09:00', profile.washDays),
      mk('grooming', 'Freshen up 🪞', '08:15'),
      mk('mood', 'How are you feeling? 💛', '21:00'),
      mk('diary', 'Write in your diary 📔', '22:00'),
      mk('bedtime', 'Wind down for bed 🌙', profile.bedTime),
    ];
    for (const s of seeds) await DB.reminderSave(s);
  },

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch(() => {}), 30000);
    setTimeout(() => this.tick().catch(() => {}), 4000);
  },

  inQuietHours(profile) {
    if (!profile.notifPrefs.quietDuringSleep) return false;
    const now = nowTimeStr(), bed = profile.bedTime, wake = profile.wakeTime;
    if (bed <= wake) return now >= bed && now < wake;
    return now >= bed || now < wake; // overnight window
  },

  async tick() {
    const profile = await DB.profile();
    if (!profile.notifPrefs.enabled) return;
    const reminders = await DB.reminderList();
    const now = new Date();
    const today = todayStr(now);
    const dow = now.getDay();
    const t = nowTimeStr(now);
    const quiet = this.inQuietHours(profile);
    for (const r of reminders) {
      if (!r.enabled || !r.days.includes(dow)) continue;
      const snoozed = r.snoozeUntil && r.snoozeUntil > nowTs();
      const dueByTime = !snoozed && r.lastFired !== today && r.time <= t;
      const dueBySnooze = snoozed && r.snoozeUntil <= nowTs() + 30000 && r.lastFired !== today + '-snz';
      if (!dueByTime && !dueBySnooze) continue;
      if (quiet && r.cat !== 'bedtime') { r.lastFired = today; await DB.reminderSave(r); continue; }
      r.lastFired = dueBySnooze ? today + '-snz' : today;
      r.snoozeUntil = null;
      await DB.reminderSave(r);
      this.fire(r);
    }
  },

  fire(r) {
    const meta = CAT_META[r.cat] || {};
    const icon = meta.icon || '🔔';
    this._banner(r, `${icon} ${r.label}`);
    if (this.perm() === 'granted') {
      try {
        const n = new Notification('My Wellness', {
          body: r.label, icon: 'icon-192.png', tag: 'mw-' + r.id,
          data: { route: r.route || '#/home' },
        });
        n.onclick = () => { window.focus(); location.hash = r.route || '#/home'; n.close(); };
      } catch { /* notifications blocked at OS level */ }
    }
  },

  _banner(r, title, sub) {
    const stack = document.getElementById('bannerStack');
    const meta = CAT_META[r.cat] || {};
    const card = h('div', { class: 'reminder-banner', role: 'alert' },
      h('b', {}, title),
      sub ? h('p', { class: 'small muted' }, sub) : null,
      h('div', { class: 'btn-row' },
        meta.quick === 'water'
          ? h('button', { class: 'btn small primary', onclick: () => { logQuickWater(); card.remove(); } }, '+1 glass 💧')
          : null,
        h('button', { class: 'btn small soft', onclick: () => { location.hash = r.route || '#/home'; card.remove(); } }, 'Open'),
        h('button', { class: 'btn small', onclick: async () => { await this.snooze(r.id, 10); card.remove(); } }, 'Snooze 10m'),
        h('button', { class: 'btn small ghost', onclick: () => card.remove() }, 'Dismiss'),
      ),
    );
    stack.append(card);
    setTimeout(() => { if (card.isConnected) card.style.opacity = '0.92'; }, 100);
  },

  async snooze(id, mins) {
    const list = await DB.reminderList();
    const r = list.find((x) => x.id === id);
    if (r) { r.snoozeUntil = nowTs() + mins * 60000; r.lastFired = null; await DB.reminderSave(r); }
  },

  async nextUpcoming(limit = 6) {
    const reminders = (await DB.reminderList()).filter((r) => r.enabled);
    const now = new Date(); const out = [];
    for (let d = 0; d < 2 && out.length < limit; d++) {
      const dayStr = todayStr(new Date(now.getTime() + d * 86400000));
      const dow = new Date(now.getTime() + d * 86400000).getDay();
      for (const r of reminders) {
        if (!r.days.includes(dow)) continue;
        if (d === 0 && (r.time <= nowTimeStr(now) || r.lastFired === dayStr)) continue;
        out.push({ ...r, when: d === 0 ? 'Today' : 'Tomorrow' });
        if (out.length >= limit) break;
      }
    }
    return out.sort((a, b) => a.time.localeCompare(b.time)).slice(0, limit);
  },
};

async function logQuickWater() {
  const { todayStr: ts } = await import('./util.js');
  const day = await DB.getDay(ts());
  const p = await DB.profile();
  day.water.entries.push({ ml: p.glassMl, t: nowTimeStr() });
  await DB.saveDay(day);
  const { toast } = await import('./ui.js');
  toast('One glass logged 💧');
  window.dispatchEvent(new CustomEvent('mw:refresh'));
}
