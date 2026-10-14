/* My Wellness PWA — Mental Wellness Center, Quranic Comfort, Motivation & Humor */
import { DB } from './db.js';
import { h, clear, pageHead, toast, emptyState } from './ui.js';
import { esc } from './util.js';
import { WELLNESS, VERSES, VERSE_SOURCE, QUOTES, HUMOR } from './content.js';

export async function render(container, { navigate }) {
  clear(container);
  container.append(pageHead('Mental Wellness', 'Whatever you feel is welcome here. 💛'));
  const tabs = h('div', { class: 'btn-row' });
  const body = h('div');
  container.append(h('div', { class: 'card' }, tabs), body);
  const setTab = (name) => {
    [...tabs.children].forEach((b) => b.classList.toggle('primary', b.dataset.t === name));
    clear(body);
    if (name === 'feel') feelings(body, navigate);
    else if (name === 'quran') quran(body);
    else quotes(body);
  };
  for (const [t, label] of [['feel', '💛 Feelings'], ['quran', '🤲 Quran'], ['quotes', '✨ Uplift']]) {
    tabs.append(h('button', { class: 'btn small', dataset: { t }, onclick: () => setTab(t) }, label));
  }
  setTab('feel');
}

function feelings(body, navigate) {
  const grid = h('div', { class: 'grid2' });
  for (const [key, w] of Object.entries(WELLNESS)) {
    grid.append(h('button', { class: 'card', style: 'cursor:pointer;text-align:center;margin:0', onclick: () => feelingDetail(key, navigate) },
      h('div', { style: 'font-size:2em' }, w.icon), h('b', {}, w.title)));
  }
  body.append(grid,
    h('div', { class: 'card tint' }, h('p', { class: 'small', style: 'margin:0' },
      '🌿 Your feelings are information, not orders. This space comforts — it does not diagnose or cure. ' +
      'If low feelings persist for weeks, please reach out to someone you trust or a professional.')));
}

async function feelingDetail(key, navigate) {
  const w = WELLNESS[key];
  const { sheet } = await import('./ui.js');
  const body = h('div', {},
    h('div', { class: 'center', style: 'font-size:2.6em' }, w.icon),
    h('h2', { class: 'center' }, w.title),
    h('div', { class: 'card tint' }, h('p', { style: 'margin:0' }, w.message)),
  );
  if (w.breathing) {
    const b = w.breathing;
    const circle = h('div', { class: 'breath-circle' }, 'Breathe');
    const btn = h('button', { class: 'btn soft block', style: 'margin-top:8px' }, '▶ Start breathing exercise');
    btn.onclick = () => {
      btn.disabled = true;
      let round = 0;
      const phase = (label, secs, scale) => new Promise((res) => {
        circle.textContent = label; circle.style.transform = `scale(${scale})`;
        setTimeout(res, secs * 1000);
      });
      (async () => {
        for (; round < b.rounds; round++) {
          await phase('Breathe in…', b.inhale, 1.25);
          await phase('Hold…', b.hold, 1.25);
          await phase('Breathe out…', b.exhale, 1);
        }
        circle.textContent = 'Done 🌸'; circle.style.transform = 'scale(1)';
        btn.disabled = false; btn.textContent = '↻ Again';
      })();
    };
    body.append(h('div', { class: 'card' }, h('h3', {}, `Breathing · ${b.inhale}-${b.hold}-${b.exhale} × ${b.rounds}`), circle, btn));
  }
  body.append(h('div', { class: 'card' }, h('h3', {}, 'One small action 🌱'), h('p', {}, w.action)));
  body.append(h('div', { class: 'card' }, h('h3', {}, 'Journal prompt ✍️'), h('p', { class: 'muted' }, w.prompt),
    h('button', { class: 'btn soft block', onclick: () => { close(); navigate('diary'); setTimeout(() => window.dispatchEvent(new CustomEvent('mw:diary-prefill', { detail: w.prompt })), 400); } }, 'Write about it in my diary')));
  if (w.trusted) body.append(h('div', { class: 'card tint' }, h('p', { class: 'small', style: 'margin:0' }, '💌 If it feels right, reach out to someone you trust today — even a two-line message counts.')));
  if (w.comfort) {
    const v = VERSES.find((x) => x.id === w.comfort);
    body.append(h('div', { class: 'verse' }, h('div', { class: 'ar' }, v.ar), h('div', { class: 'en' }, '“' + v.en + '”'), h('div', { class: 'ref' }, `Quran ${v.ref} · Saheeh International`)));
  }
  const close = sheet(w.icon + ' ' + w.title, body, { wide: true });
}

function quran(body) {
  body.append(h('p', { class: 'small muted' }, '🤲 Verses of hope, patience, gratitude and trust — saved on your device.'));
  const favs = { list: [] };
  DB.kvGet('verseFavs', []).then((f) => { favs.list = f; paint(); });
  const list = h('div');
  body.append(list);
  function paint() {
    list.innerHTML = '';
    for (const v of VERSES) {
      const isFav = favs.list.includes(v.id);
      const card = h('div', { class: 'verse' },
        h('div', { class: 'row' }, h('span', { class: 'pill info grow', style: 'flex:none' }, v.theme), h('span', { class: 'grow' }),
          h('button', { class: 'btn small ghost', onclick: async () => {
            favs.list = isFav ? favs.list.filter((x) => x !== v.id) : [...favs.list, v.id];
            await DB.kvSet('verseFavs', favs.list); paint(); toast(isFav ? 'Removed from favorites' : 'Saved to favorites 🤲');
          } }, isFav ? '★ Favorited' : '☆ Favorite')),
        h('div', { class: 'ar' }, v.ar),
        h('div', { class: 'en' }, '“' + v.en + '”'),
        h('div', { class: 'ref' }, `Quran ${v.ref}`),
        h('p', { class: 'small muted' }, v.note));
      list.append(card);
    }
    list.append(h('p', { class: 'hint' }, VERSE_SOURCE));
  }
  paint();
}

function quotes(body) {
  body.append(h('h3', {}, 'Gentle motivation ✨'));
  for (const q of QUOTES) body.append(h('div', { class: 'card' }, h('p', { class: 'serif', style: 'margin:0;font-size:1.05em' }, '“' + q + '”')));
  body.append(h('h3', {}, 'A little smile 😄'), h('p', { class: 'small muted' }, 'Light, original humor — just for you.'));
  for (const j of HUMOR) body.append(h('div', { class: 'card' }, h('p', { style: 'margin:0' }, j)));
}
