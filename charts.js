/* My Wellness PWA — tiny local charting library (canvas, no dependencies) */
function setup(canvas, height) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.parentElement.clientWidth || 320;
  const hgt = height || 180;
  canvas.width = w * dpr; canvas.height = hgt * dpr;
  canvas.style.height = hgt + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w, h: hgt };
}
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

export function barChart(canvas, { labels = [], values = [], color, height = 180, unit = '' } = {}) {
  const { ctx, w, h } = setup(canvas, height);
  const max = Math.max(1, ...values);
  const n = values.length;
  const padL = 8, padB = 26, padT = 10;
  const bw = (w - padL * 2) / Math.max(1, n);
  const barW = Math.min(34, bw * 0.55);
  const accent = color || cssVar('--accent') || '#c98a8a';
  const soft = cssVar('--line-soft') || '#f0e6de';
  ctx.clearRect(0, 0, w, h);
  values.forEach((v, i) => {
    const bh = ((h - padB - padT) * v) / max;
    const x = padL + bw * i + (bw - barW) / 2;
    const y = h - padB - bh;
    ctx.fillStyle = soft;
    ctx.beginPath(); ctx.roundRect(x, padT, barW, h - padB - padT, 6); ctx.fill();
    if (v > 0) {
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.roundRect(x, y, barW, bh, 6); ctx.fill();
    }
    ctx.fillStyle = cssVar('--ink-soft') || '#7a6a6d';
    ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labels[i] || '', padL + bw * i + bw / 2, h - 8);
    if (v > 0) { ctx.fillStyle = cssVar('--ink') || '#463a3c'; ctx.fillText(String(v) + unit, padL + bw * i + bw / 2, y - 5); }
  });
}

export function lineChart(canvas, { labels = [], values = [], color, height = 180, min = null, max = null } = {}) {
  const { ctx, w, h } = setup(canvas, height);
  const padL = 26, padB = 26, padT = 12, padR = 10;
  const lo = min == null ? Math.min(0, ...values) : min;
  const hi = max == null ? Math.max(1, ...values) : max;
  const span = Math.max(0.001, hi - lo);
  const X = (i) => padL + ((w - padL - padR) * i) / Math.max(1, values.length - 1);
  const Y = (v) => padT + (h - padB - padT) * (1 - (v - lo) / span);
  const accent = color || cssVar('--accent-deep') || '#b76e79';
  ctx.clearRect(0, 0, w, h);
  // gridlines
  ctx.strokeStyle = cssVar('--line-soft') || '#f0e6de'; ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = padT + ((h - padB - padT) * g) / 4;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
  }
  if (!values.length) return;
  // area
  const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
  grad.addColorStop(0, accent + '55'); grad.addColorStop(1, accent + '00');
  ctx.beginPath(); ctx.moveTo(X(0), Y(values[0]));
  values.forEach((v, i) => ctx.lineTo(X(i), Y(v)));
  ctx.lineTo(X(values.length - 1), h - padB); ctx.lineTo(X(0), h - padB); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  // line
  ctx.beginPath(); ctx.moveTo(X(0), Y(values[0]));
  values.forEach((v, i) => ctx.lineTo(X(i), Y(v)));
  ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
  // dots + labels
  ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
  values.forEach((v, i) => {
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(X(i), Y(v), 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(i), Y(v), 1.5, 0, 7); ctx.fill();
    ctx.fillStyle = cssVar('--ink-soft') || '#7a6a6d';
    if (labels[i]) ctx.fillText(labels[i], X(i), h - 8);
  });
}

export function donut(canvas, segments, { height = 170, centerText = '' } = {}) {
  const { ctx, w, h } = setup(canvas, height);
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 14, th = 22;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let ang = -Math.PI / 2;
  ctx.clearRect(0, 0, w, h);
  for (const s of segments) {
    const a2 = ang + (Math.PI * 2 * s.value) / total;
    ctx.beginPath(); ctx.arc(cx, cy, r, ang, a2);
    ctx.strokeStyle = s.color; ctx.lineWidth = th; ctx.stroke();
    ang = a2;
  }
  if (centerText) {
    ctx.fillStyle = cssVar('--ink') || '#463a3c';
    ctx.font = '600 20px Georgia,serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(centerText, cx, cy);
  }
}
