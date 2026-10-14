/* My Wellness PWA — Skincare, Hair Care, Personal Grooming (three independent screens) */
import { DB } from './db.js';
import { h, clear, pageHead, field, input, toast, checkRow } from './ui.js';
import { todayStr, nowTs, minsToHMS, pctDone, esc } from './util.js';
import { SKIN_AM, SKIN_PM, HAIR_STEPS, GROOM_ITEMS } from './content.js';

export async function render(container, { arg }) {
  if (arg === 'skincare') return skincare(container);
  if (arg === 'hair') return hair(container);
  return grooming(container);
}

/* ---------------- SKINCARE ---------------- */
async function skincare(container) {
  const date = todayStr();
  let day = await DB.getDay(date);
  clear(container);
  container.append(pageHead('Skincare', 'Gentle care for your skin — no harsh products, no whitening promises. 🧴'));

  const doneAm = Object.values(day.skincare.am).filter(Boolean).length;
  const donePm = Object.values(day.skincare.pm).filter(Boolean).length;
  const pct = pctDone(doneAm + donePm, 5);

  const mkSection = (title, icon, steps, key) => {
    const card = h('div', { class: 'card' },
      h('div', { class: 'row' }, h('span', { style: 'font-size:1.5em' }, icon), h('h3', { class: 'grow', style: 'margin:0' }, title),
        h('span', { class: 'pill ' + (steps.every((s) => day.skincare[key][s.id]) ? 'good' : '') },
          `${steps.filter((s) => day.skincare[key][s.id]).length}/${steps.length}`)));
    for (const s of steps) {
      card.append(checkRow(s.label, s.sub, day.skincare[key][s.id], async (v) => {
        const d = await DB.getDay(date); d.skincare[key][s.id] = v; await DB.saveDay(d); render(container, { arg: 'skincare' });
      }));
    }
    return card;
  };
  container.append(mkSection('Morning routine', '☀️', SKIN_AM, 'am'));
  container.append(mkSection('Evening routine', '🌙', SKIN_PM, 'pm'));

  const noteIn = h('textarea', { placeholder: 'Product notes — what you used, how your skin felt…' }, day.skincare.note || '');
  const prodIn = input('', { placeholder: 'Product name (optional)' });
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Product notes 📝'),
    field('Today\u2019s notes', noteIn),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: async () => {
      const d = await DB.getDay(date); d.skincare.note = noteIn.value; await DB.saveDay(d); toast('Notes saved 📝');
    } }, 'Save notes'))));

  container.append(h('div', { class: 'card tint' }, h('p', { class: 'small', style: 'margin:0' },
    '🌿 Be gentle: lukewarm water, fragrance-free basics, and sunscreen when you step into daylight. ' +
    'Skip anything that stings or promises to change your skin tone — healthy skin is the goal, not lighter skin.')));
}

/* ---------------- HAIR CARE ---------------- */
async function hair(container) {
  const profile = await DB.profile();
  const date = todayStr();
  let day = await DB.getDay(date);
  const washDay = profile.washDays.includes(new Date().getDay());
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  clear(container);
  container.append(pageHead('Hair Care', 'Love your curls — gently, patiently. 💇‍♀️'));
  container.append(h('div', { class: 'card ' + (washDay ? 'tint' : '') },
    h('div', { class: 'row' }, h('span', { style: 'font-size:1.6em' }, washDay ? '🚿' : '🌀'),
      h('div', { class: 'grow' }, h('b', {}, washDay ? 'Today is a wash day!' : 'Not a wash day'),
        h('div', { class: 'small muted' }, `Wash days: ${profile.washDays.map((d) => dayNames[d]).join(', ')} · Hair type: ${esc(profile.hairType || 'curly')}`)))));

  const card = h('div', { class: 'card' }, h('h3', {}, washDay ? "Today's routine" : 'Between-wash care'));
  for (const s of HAIR_STEPS) {
    if (!washDay && s.id === 'wash') continue;
    card.append(checkRow(s.label, s.sub, day.hair.steps[s.id], async (v) => {
      const d = await DB.getDay(date); d.hair.steps[s.id] = v; await DB.saveDay(d); render(container, { arg: 'hair' });
    }));
  }
  container.append(card);

  const noteIn = h('textarea', { placeholder: 'Products used, how your curls feel…' }, day.hair.note || '');
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Product notes 📝'),
    field('Today\u2019s notes', noteIn),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: async () => {
      const d = await DB.getDay(date); d.hair.note = noteIn.value; await DB.saveDay(d); toast('Notes saved 📝');
    } }, 'Save notes'))));

  container.append(h('div', { class: 'card tint' }, h('p', { class: 'small', style: 'margin:0' },
    '🌀 Curly-hair kindness: detangle gently from the ends, deep-condition regularly, sleep on satin if you can, ' +
    'and never brush curls dry and angry. Change wash days in Settings → Hair care.')));
}

/* ---------------- GROOMING ---------------- */
async function grooming(container) {
  const date = todayStr();
  let day = await DB.getDay(date);
  clear(container);
  container.append(pageHead('Personal Grooming', 'Fifteen minutes for you — you are worth the ritual. 🪞'));

  const doneN = Object.values(day.grooming.items).filter(Boolean).length;
  const card = h('div', { class: 'card' },
    h('div', { class: 'row' }, h('h3', { class: 'grow', style: 'margin:0' }, "Today's ritual"), h('span', { class: 'pill ' + (doneN === 6 ? 'good' : '') }, `${doneN}/6`)));
  for (const g of GROOM_ITEMS) {
    card.append(checkRow(g.label, g.sub, day.grooming.items[g.id], async (v) => {
      const d = await DB.getDay(date); d.grooming.items[g.id] = v; await DB.saveDay(d); render(container, { arg: 'grooming' });
    }));
  }
  container.append(card);

  // self-care timer: 15–20 min block, short 5-min version
  const tCard = h('div', { class: 'card center' }, h('h3', {}, 'Self-care timer ⏱️'),
    h('div', { class: 'timer-big', id: 'groomTimer' }, minsToHMS(day.grooming.timerLeft != null ? day.grooming.timerLeft : 0)),
    h('p', { class: 'small muted' }, `Logged today: ${day.grooming.minutes} minutes`),
    h('div', { class: 'btn-row', style: 'justify-content:center' },
      h('button', { class: 'btn primary', onclick: () => startGroom(15 * 60) }, '▶ 15 min'),
      h('button', { class: 'btn soft', onclick: () => startGroom(20 * 60) }, '▶ 20 min'),
      h('button', { class: 'btn', onclick: () => startGroom(5 * 60) }, '⚡ 5-min quick'),
      h('button', { class: 'btn ghost', onclick: stopGroom }, '⏹ Stop')));
  container.append(tCard);
  container.append(h('p', { class: 'hint center' }, 'Makeup is always optional. The timer simply holds the space — being present is the point.'));

  let iv = null;
  const tick = async () => {
    const d = await DB.getDay(date);
    if (d.grooming.timerEnd && d.grooming.timerEnd > nowTs()) {
      d.grooming.timerLeft = Math.ceil((d.grooming.timerEnd - nowTs()) / 1000);
    } else if (d.grooming.timerEnd) {
      const mins = Math.round(((d.grooming.timerSecs || 0)) / 60);
      d.grooming.minutes += mins; d.grooming.timerEnd = null; d.grooming.timerLeft = 0; d.grooming.timerSecs = 0;
      await DB.saveDay(d);
      clearInterval(iv); iv = null;
      const { toast: t } = await import('./ui.js');
      t(`Self-care complete — ${mins} minutes for you 🌸`);
      render(container, { arg: 'grooming' });
      return;
    }
    await DB.saveDay(d);
    const elT = document.getElementById('groomTimer');
    if (elT) elT.textContent = minsToHMS(d.grooming.timerLeft || 0); else clearInterval(iv);
  };
  async function startGroom(secs) {
    const d = await DB.getDay(date);
    d.grooming.timerSecs = secs; d.grooming.timerLeft = secs; d.grooming.timerEnd = nowTs() + secs * 1000;
    await DB.saveDay(d);
    if (!iv) iv = setInterval(tick, 1000);
    tick();
  }
  async function stopGroom() {
    const d = await DB.getDay(date);
    if (d.grooming.timerEnd) {
      const doneSecs = (d.grooming.timerSecs || 0) - (d.grooming.timerLeft || 0);
      d.grooming.minutes += Math.max(0, Math.round(doneSecs / 60));
      d.grooming.timerEnd = null; d.grooming.timerLeft = 0; d.grooming.timerSecs = 0;
      await DB.saveDay(d);
      if (iv) { clearInterval(iv); iv = null; }
      render(container, { arg: 'grooming' });
    }
  }
  if (day.grooming.timerEnd && day.grooming.timerEnd > nowTs()) { iv = setInterval(tick, 1000); }
  return () => { if (iv) clearInterval(iv); };
}
