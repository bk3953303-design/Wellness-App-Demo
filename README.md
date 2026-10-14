# My Wellness — Self-Care (PWA Demo)

A private, offline-first personal wellness companion — installable web app (PWA).

> **Flat-layout version:** all files live at the repo root (no subfolders), so you can upload them in one go from any browser — including mobile.

**This is a public demo version** of a privately commissioned app. It shows what a
customized personal app looks like: your name, your routines, your data.

## What's inside

21 working sections: Home dashboard, Daily Routine, Meals, Water, Nutrition,
Prayer Tracker, Project Work (focus timer + tasks), Skincare, Hair Care,
Personal Grooming (timers), Mental Wellness (feelings + breathing), Mood Journal,
Daily Diary, Progress, Photo Timeline, Weekly/Monthly Reports, Profile,
Export & Backup (JSON/CSV/print-PDF/share), Settings (5 themes, text sizes,
reminders, optional PIN lock), About.

## Tech

- Dependency-free vanilla JS (ES modules) — no build step, no frameworks
- IndexedDB for local storage — everything stays on the user's device
- Cache-first service worker — works fully offline after first load
- Web app manifest — "Add to Home Screen" installs it like a native app
- Zero CDN, zero fonts, zero tracking

## Run it / deploy it (free)

**GitHub Pages** (2 minutes):

1. Create a public repo and upload this folder's contents to the repo root
   (`index.html` must be at the top level).
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** →
   Branch: `main`, folder: `/ (root)` → Save.
3. Your link appears in 1–2 minutes:
   `https://YOUR-USERNAME.github.io/REPO-NAME/`

Open the link on a phone → browser menu → **Add to Home Screen** — it installs
with its own icon and works offline.

## Privacy

All data (journal entries, photos, health logs) is stored in the browser's
IndexedDB on the user's own device. Nothing is uploaded, synced, or tracked.

---

*Demo built as a portfolio sample. Want an app customized for you?
That is exactly the service this demo advertises.*
