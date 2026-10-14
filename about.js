/* My Wellness PWA — About */
import { h, clear, pageHead } from './ui.js';
import { LIMITATIONS } from './notify.js';

export async function render(container) {
  clear(container);
  container.append(pageHead('About', 'A little note about this app. 🌸'));
  container.append(h('div', { class: 'card' },
    h('p', { class: 'serif', style: 'font-size:1.08em' },
      '“My Wellness — Self-Care is a personal space for building gentle routines, caring for yourself, staying organized, and recognizing small achievements. You do not have to be perfect. Every small step counts.”')));
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Your privacy 🔒'),
    h('p', { class: 'small' }, 'Everything you enter — meals, moods, diary, photos, prayers — is stored only on this device, in the app\u2019s private storage. There is no account, no cloud, no analytics, and nothing is ever sent anywhere. Backups you download are yours to keep.')));
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Reminders — honest notes 🔔'),
    h('p', { class: 'small' }, LIMITATIONS)));
  container.append(h('div', { class: 'card' }, h('h3', {}, 'A gentle health note 🩺'),
    h('p', { class: 'small' }, 'This app supports everyday healthy habits. It does not diagnose illness, prescribe medicine, or replace professional medical care. If you feel unwell — especially with repeated fever, dizziness, or exhaustion — please see a doctor or clinic.')));
  container.append(h('div', { class: 'card' }, h('h3', {}, 'Quranic verses 🤲'),
    h('p', { class: 'small' }, 'Short excerpts with English translation (Saheeh International) and references, saved on your device for offline reflection. Motivational lines elsewhere in the app are original writing, never presented as scripture.')));
  container.append(h('p', { class: 'hint center' }, 'My Wellness · version 1.0 · built with care, for one person. 🌸'));
}
