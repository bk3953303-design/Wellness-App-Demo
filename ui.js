/* My Wellness PWA — UI primitives: elements, toast, dialogs, sheets, small widgets */
import { esc } from './util.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(9)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

let toastTimer = null;
export function toast(msg, action) {
  const t = document.getElementById('toast');
  clear(t);
  t.append(h('span', { class: 'grow' }, msg));
  if (action) {
    const b = h('button', { onclick: () => { hide(); action.fn(); } }, action.label || 'Undo');
    t.append(b);
  }
  t.hidden = false;
  const hide = () => { t.hidden = true; clear(t); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hide, action ? 6000 : 2600);
}

export function confirmDlg({ title = 'Are you sure?', body = '', okText = 'Delete', danger = true } = {}) {
  return new Promise((resolve) => {
    const root = document.getElementById('modalRoot');
    const scrim = h('div', { class: 'modal-scrim' });
    const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
      h('h2', {}, title),
      body ? h('p', { class: 'muted' }, body) : null,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn grow', onclick: () => done(false) }, 'Cancel'),
        h('button', { class: danger ? 'btn danger grow' : 'btn primary grow', onclick: () => done(true) }, okText),
      ),
    );
    const done = (v) => { scrim.remove(); resolve(v); };
    scrim.addEventListener('click', (e) => { if (e.target === scrim) done(false); });
    scrim.append(sheet); root.append(scrim);
  });
}

export function sheet(title, bodyNode, { wide = false } = {}) {
  const root = document.getElementById('modalRoot');
  const scrim = h('div', { class: 'modal-scrim' });
  const s = h('div', { class: 'sheet' },
    h('div', { class: 'row' }, h('h2', { class: 'grow' }, title),
      h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: () => close() }, '✕')),
    bodyNode,
  );
  if (wide) s.style.maxWidth = '560px';
  const close = () => scrim.remove();
  scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
  scrim.append(s); root.append(scrim);
  return close;
}

export function ring(pct, size = 92, stroke = 10) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${pct}% complete">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line-soft)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" dy=".35em" text-anchor="middle" font-size="${Math.round(size / 3.4)}"
      font-family="Georgia,serif" fill="var(--ink)">${pct}%</text></svg>`;
}

export function emptyState(icon, title, text) {
  return h('div', { class: 'empty' },
    h('div', { class: 'big' }, icon),
    h('h3', {}, title),
    text ? h('p', { class: 'small muted' }, text) : null);
}

export function field(label, inputEl, hint) {
  return h('div', {},
    h('label', { class: 'f' }, label),
    inputEl,
    hint ? h('p', { class: 'hint' }, hint) : null);
}
export function input(val, attrs = {}) {
  const i = h('input', { ...attrs, value: val == null ? '' : val });
  return i;
}
export function checkRow(label, sub, checked, onChange) {
  const box = h('input', { type: 'checkbox' });
  box.checked = !!checked;
  box.addEventListener('change', () => onChange(box.checked));
  return h('label', { class: 'check-row' }, box,
    h('span', { class: 'lbl' }, h('b', {}, label), sub ? h('span', {}, sub) : null));
}

export function moodStars(value, onPick, max = 5) {
  const wrap = h('div', { class: 'stars', role: 'radiogroup', 'aria-label': 'Mood' });
  const paint = () => {
    [...wrap.children].forEach((b, i) => b.classList.toggle('on', i < value));
  };
  for (let i = 1; i <= max; i++) {
    const faces = ['😞', '🙁', '😐', '🙂', '😊'];
    const b = h('button', {
      type: 'button', 'aria-label': `Mood ${i} of ${max}`,
      onclick: () => { value = i; paint(); onPick(i); },
    }, faces[i - 1] || '⭐');
    wrap.append(b);
  }
  paint();
  return { el: wrap, set(v) { value = v; paint(); } };
}

export function pageHead(title, sub) {
  return h('div', { class: 'hero' }, h('h1', {}, title), sub ? h('p', { class: 'muted' }, sub) : null);
}
