/* My Wellness PWA — Photo Timeline: private local photo journal with comparison */
import { DB } from './db.js';
import { h, clear, pageHead, sheet, field, input, toast, confirmDlg, emptyState } from './ui.js';
import { todayStr, fmtDate, esc, download, fileToDataURL, uid } from './util.js';

const MILESTONES = ['Day 1', 'Day 7', 'Day 14', 'Day 30', 'Progress', 'Self-care', 'Other'];

export async function render(container) {
  clear(container);
  container.append(pageHead('Photo Timeline', 'Your journey, in your own pictures. 📸'));
  container.append(h('div', { class: 'card tint' }, h('p', { class: 'small', style: 'margin:0' },
    '🔒 Photos are stored only on this device (inside the app\u2019s private storage). They are never uploaded anywhere. ' +
    'If you uninstall the app or clear its data without a backup, photos are lost — use Export & Backup to keep copies.')));

  const bar = h('div', { class: 'card' },
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', onclick: addPhoto }, '📷 Add photo'),
      h('button', { class: 'btn', id: 'cmpBtn', onclick: toggleCompare }, '◫ Compare')));
  container.append(bar);
  const grid = h('div');
  container.append(grid);

  let compareMode = false;
  const selected = new Set();

  function toggleCompare() {
    compareMode = !compareMode; selected.clear();
    document.getElementById('cmpBtn').classList.toggle('primary', compareMode);
    paint();
    if (compareMode) toast('Tap two photos to compare them ◫');
  }

  async function paint() {
    grid.innerHTML = '';
    const photos = await DB.photoList();
    if (!photos.length) { grid.append(emptyState('📸', 'No photos yet', 'Add your first photo — Day 1 starts whenever you are ready.')); return; }
    const byDate = {};
    for (const p of photos) { (byDate[p.date] = byDate[p.date] || []).push(p); }
    for (const ds of Object.keys(byDate).sort().reverse()) {
      grid.append(h('h3', {}, fmtDate(ds)));
      const g = h('div', { class: 'photo-grid' });
      for (const p of byDate[ds]) {
        const img = h('img', { src: p.blob, alt: esc(p.caption || 'Photo'), loading: 'lazy' });
        const wrap = h('div', { style: 'position:relative' }, img);
        if (compareMode) {
          const badge = h('span', {
            style: 'position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;background:' + (selected.has(p.id) ? 'var(--accent)' : 'rgba(255,255,255,.85)') + ';color:' + (selected.has(p.id) ? '#fff' : 'var(--ink)') + ';display:flex;align-items:center;justify-content:center;font-weight:700',
          }, selected.has(p.id) ? '✓' : '');
          wrap.append(badge);
        }
        img.onclick = () => {
          if (compareMode) {
            if (selected.has(p.id)) selected.delete(p.id);
            else if (selected.size < 2) selected.add(p.id);
            else { toast('Pick only two photos ◫'); return; }
            if (selected.size === 2) showCompare([...selected]);
            paint();
          } else detailSheet(p);
        };
        wrap.append(h('div', { class: 'tiny muted center', style: 'padding:2px' }, esc((p.milestone ? p.milestone + ' · ' : '') + (p.caption || ''))));
        g.append(wrap);
      }
      grid.append(g);
    }
  }

  async function showCompare(ids) {
    const [a, b] = await Promise.all(ids.map((id) => DB.photoGet(id)));
    if (!a || !b) return;
    const body = h('div', {},
      h('div', { class: 'compare' },
        h('div', {}, h('img', { src: a.blob, alt: '' }), h('p', { class: 'small center' }, h('b', {}, fmtDate(a.date)), h('br'), esc(a.caption || ''))),
        h('div', {}, h('img', { src: b.blob, alt: '' }), h('p', { class: 'small center' }, h('b', {}, fmtDate(b.date)), h('br'), esc(b.caption || '')))),
      h('p', { class: 'hint center' }, 'Side by side, same you — growing. No scores, no judgments, ever.'));
    sheet('Compare ◫', body, { wide: true });
    compareMode = false; selected.clear();
    document.getElementById('cmpBtn').classList.remove('primary');
    paint();
  }

  function addPhoto() {
    const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    const prev = h('div', { class: 'center' });
    const capIn = input('', { placeholder: 'Caption (optional)' });
    const dateIn = input(todayStr(), { type: 'date' });
    const noteIn = input('', { placeholder: 'Notes (optional)' });
    const msSel = h('select', {}, ...MILESTONES.map((m) => h('option', { value: m }, m)));
    let dataUrl = null;
    file.addEventListener('change', async () => {
      if (file.files[0]) { dataUrl = await fileToDataURL(file.files[0], 1200, 0.85); prev.innerHTML = `<img src="${dataUrl}" style="width:100%;border-radius:14px;margin-top:8px">`; }
    });
    const body = h('div', {},
      h('button', { class: 'btn block', onclick: () => file.click() }, '📷 Choose from phone'), file, prev,
      field('Date', dateIn), field('Milestone', msSel), field('Caption', capIn), field('Notes', noteIn),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary grow', onclick: async () => {
        if (!dataUrl) { toast('Choose a photo first 📷'); return; }
        await DB.photoSave({ id: uid(), date: dateIn.value || todayStr(), caption: capIn.value.trim(), notes: noteIn.value.trim(), milestone: msSel.value, blob: dataUrl, addedAt: Date.now() });
        close(); paint(); toast('Photo saved to your timeline 📸');
      } }, 'Save photo')));
    const close = sheet('Add photo', body);
    file.click();
  }

  async function detailSheet(p) {
    const capIn = input(p.caption || '', { placeholder: 'Caption' });
    const noteIn = input(p.notes || '', { placeholder: 'Notes' });
    const body = h('div', {},
      h('img', { src: p.blob, style: 'width:100%;border-radius:14px', alt: '' }),
      h('p', { class: 'small muted center' }, `${fmtDate(p.date)}${p.milestone ? ' · ' + esc(p.milestone) : ''}`),
      field('Caption', capIn), field('Notes', noteIn),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn soft grow', onclick: async () => {
          p.caption = capIn.value.trim(); p.notes = noteIn.value.trim(); await DB.photoSave(p); close(); paint(); toast('Updated 📸');
        } }, 'Save'),
        h('button', { class: 'btn', onclick: () => { download(`mw-photo-${p.date}.jpg`, dataURLtoBlob(p.blob)); } }, '⬇ Download'),
        h('button', { class: 'btn danger', onclick: async () => {
          if (await confirmDlg({ title: 'Delete this photo?', body: 'It will be removed from your timeline.' })) { await DB.photoDelete(p.id); close(); paint(); }
        } }, 'Delete')));
    const close = sheet('Photo', body, { wide: true });
  }

  function dataURLtoBlob(dataUrl) {
    const [head, b64] = dataUrl.split(',');
    const mime = head.match(/:(.*?);/)[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  await paint();
}
