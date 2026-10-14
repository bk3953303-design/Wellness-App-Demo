/* My Wellness PWA — small utilities */
export const pad2 = (n) => String(n).padStart(2, '0');

export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function nowTimeStr(d = new Date()) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
export function nowTs() { return Date.now(); }

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return todayStr(dt);
}
export function dateRange(fromStr, toStr) {
  const out = []; let cur = fromStr;
  while (cur <= toStr) { out.push(cur); cur = addDays(cur, 1); }
  return out;
}
export function weekStartStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7; // Monday = 0
  return addDays(dateStr, -dow);
}
export function fmtDate(dateStr, opts) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', opts || { weekday: 'long', day: 'numeric', month: 'long' });
}
export function fmtDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
export function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${ap}`;
}
export function minsToHMS(totalSecs) {
  const s = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h > 0 ? `${h}h ${pad2(m)}m` : `${m}m ${pad2(ss)}s`;
}
export function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
export function pctDone(done, total) {
  if (!total) return 0;
  return clamp(Math.round((done / total) * 100), 0, 100);
}
export function download(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
export async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
/** Resize an image file to a max dimension and return a dataURL (keeps storage small). */
export function fileToDataURL(file, maxDim = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}
