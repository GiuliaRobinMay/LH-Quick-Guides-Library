/* Lesko Help · Quick Guide Library — app logic.
   Data comes from data/guides.js (window.LESKO_GUIDES). Member state
   (bookmarks, done, notes, ticked links, requests, view) lives in localStorage. */
(function () {
  'use strict';

  const DATA = window.LESKO_GUIDES || { topics: [], items: [] };
  const TOPICS = DATA.topics;
  const TOPIC_BY_KEY = Object.fromEntries(TOPICS.map(t => [t.key, t]));
  // Line icons (Lucide). A library's settings name the icon for each topic.
  const ICONS = {
    'briefcase': '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    'heart-handshake': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/><path d="m18 15-2-2"/><path d="m15 18-2-2"/>',
    'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    'receipt': '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    'scale': '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    'landmark': '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
    'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    'car': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    'heart-pulse': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'accessibility': '<circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/>',
    'medal': '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
    'coins': '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
    'stethoscope': '<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
    'brain': '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>',
    'shield': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    'pill': '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
    'tooth': '<path d="M12 5.5c1.8-1.6 4.7-1.7 6.2.3 1.4 1.9.6 4.4 0 6.5-.5 1.7-.6 3.4-.9 5.1-.2 1.2-.4 2.6-1.5 2.9-1.3.3-1.7-1.4-2-3.4-.2-1.3-.4-2.4-1.8-2.4s-1.6 1.1-1.8 2.4c-.3 2-.7 3.7-2 3.4-1.1-.3-1.3-1.7-1.5-2.9-.3-1.7-.4-3.4-.9-5.1-.6-2.1-1.4-4.6 0-6.5 1.5-2 4.4-1.9 6.2-.3Z"/>',
    'eye': '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    'leaf': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    'paw': '<ellipse cx="6.6" cy="11.2" rx="2.2" ry="2.8"/><ellipse cx="17.4" cy="11.2" rx="2.2" ry="2.8"/><ellipse cx="10" cy="6.4" rx="2.1" ry="2.7"/><ellipse cx="14" cy="6.4" rx="2.1" ry="2.7"/><path d="M12 13.2c2.4 0 4.5 1.9 4.5 4 0 1.9-1.5 3.1-3.2 3.1-.6 0-1-.2-1.3-.2s-.7.2-1.3.2c-1.7 0-3.2-1.2-3.2-3.1 0-2.1 2.1-4 4.5-4Z"/>',
    'maple': '<path d="M12 2.6 10.4 6c-.2.4-.6.3-1 .1l-1.6-.8 1.2 5.2c.2.9-.4 1-.8.6L5.9 9l-.5 1.3c-.1.2-.3.3-.6.2l-2.5-.5 1.3 3c.1.3.1.5-.2.7l-1 .7 4.5 3.6c.3.2.4.5.3.9l-.5 1.3 4.3-.5c.3 0 .6.1.6.4l-.1 3.5h1.2l-.1-3.5c0-.3.3-.4.6-.4l4.3.5-.5-1.3c-.1-.4 0-.7.3-.9l4.5-3.6-1-.7c-.3-.2-.3-.4-.2-.7l1.3-3-2.5.5c-.3.1-.5 0-.6-.2L18.1 9l-2.3 2.1c-.4.4-1 .3-.8-.6l1.2-5.2-1.6.8c-.4.2-.8.3-1-.1z"/>',
    'palm': '<path d="M11.2 21c.5-4.8 1.3-8.1 2.6-10.9M7.6 21h9M13.8 10.1c1.3-2.4 3.9-3.4 6.4-2.5M13.8 10.1c2.6-.4 5 1.2 5.7 3.7M13.8 10.1c-2-1.9-4.9-2.1-7.1-.5M13.8 10.1c-2.5.4-4.4 2.3-4.8 4.8"/>',
    'lakes': '<path d="M12 3.4v1.8M5.6 6.1l1.3 1.3M18.4 6.1l-1.3 1.3M2.6 12.6h18.8"/><path d="M7.2 12.6a4.8 4.8 0 0 1 9.6 0"/><path d="M2.8 16.6c1.6 0 1.6-1.3 3.2-1.3s1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3"/><path d="M2.8 20.3c1.6 0 1.6-1.3 3.2-1.3s1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3"/>',
    'cactus': '<path d="M10.6 5.6a1.7 1.7 0 0 1 3.4 0V21"/><path d="M10.6 21V9"/><path d="M10.6 14.6H8.4A2.4 2.4 0 0 1 6 12.2V9.6"/><path d="M14 11.8h2.2a2.4 2.4 0 0 0 2.4-2.4V7.4"/><path d="M8.6 21h7.4"/><circle cx="19.4" cy="3.8" r="1.4"/>',
    'mountains': '<path d="m2.4 19.6 6.2-10.9a.7.7 0 0 1 1.2 0l3.1 5.4 1.7-3a.7.7 0 0 1 1.2 0l5 8.5Z"/><path d="m6.3 12.8 2.4 1.4 2.2-1.4"/>',
    'star': '<path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/>'
  };
  const iconSvg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.star}</svg>`;
  const TOPIC_STYLE = Object.fromEntries(TOPICS.map(t => [t.key, { grad: t.grad, tint: t.tint, ink: t.color, icon: iconSvg(t.icon) }]));
  const YELLOW = '#FDCC0A';
  const STORE_KEY = 'lesko-quick-guides-v2';

  const ITEMS = DATA.items.map(i => Object.assign({}, i, { hasPdf: !!i.download, hasVideo: !!i.video }));
  const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));

  /* ---------- storage ---------- */
  const store = load();
  function load() {
    const base = { bookmarks: {}, done: {}, notes: {}, checked: {}, requests: [], view: 'list', pinnedOpen: true };
    try { const raw = localStorage.getItem(STORE_KEY); return raw ? Object.assign(base, JSON.parse(raw)) : base; } catch (e) { return base; }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* private mode */ } }

  /* ---------- state ---------- */
  const state = { tab: 'library', topic: null, q: '', open: null, listIds: [], stage: 'video' };

  /* ---------- helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const host = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const fmtDate = iso => { try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return iso; } };
  const st = k => TOPIC_STYLE[k] || { grad: 'linear-gradient(135deg,#9CA3AF,#D1D5DB)', tint: '#F3F4F7', ink: '#6B7280', icon: '' };
  const styleVars = k => { const s = st(k); return `--grad:${s.grad};--tint:${s.tint};--ink:${s.ink}`; };
  const TOPIC_ORDER = Object.fromEntries(TOPICS.map((t, i) => [t.key, i]));
  const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  // Business first, then Nonprofit, then Career; alphabetical inside each topic.
  // Inside a topic: lessons first in their teaching order, then quick guides A to Z.
  const byTopicThenTitle = (a, b) => (TOPIC_ORDER[a.topic] - TOPIC_ORDER[b.topic])
    || ((b.isLesson ? 1 : 0) - (a.isLesson ? 1 : 0))
    || (a.isLesson && b.isLesson ? (a.lessonNo || a.order) - (b.lessonNo || b.order) : byTitle(a, b));
  const typeLabel = it => it.hasPdf && it.hasVideo ? "PDF · Video" : (it.hasPdf ? "PDF guide" : (it.hasVideo ? "Video lesson" : "Lesson"));
  // "LESSON 1 | Title" (numbered in teaching order inside the topic) or "QUICK GUIDE | Title"
  const LESSON_NO = {};
  TOPICS.forEach(t => ITEMS.filter(i => i.topic === t.key && i.isLesson).sort((x, y) => x.order - y.order).forEach((i, n) => { LESSON_NO[i.id] = n + 1; }));
  const prefix = it => it.kind === 'state' ? (TOPIC_BY_KEY[it.topic]?.label || 'State')
    : (it.isLesson ? `Lesson ${it.lessonNo || LESSON_NO[it.id] || ''}`.trim() : 'Quick guide');
  const titleHTML = it => `<span class="prefix">${esc(prefix(it))}</span><span class="pipe">|</span>${esc(it.title)}`;

  const ICON = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
    starThin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/></svg>',
    starOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M4 19h16"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z" fill="currentColor" stroke="none"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>'
  };

  /* ---------- filtering (always alphabetical) ---------- */
  function filtered() {
    const q = state.q.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    return ITEMS.filter(it => {
      if (state.topic === 'bookmarked') { if (!store.bookmarks[it.id]) return false; }
      else if (state.topic && it.topic !== state.topic) return false;
      if (terms.length) {
        const hay = it._hay || (it._hay = [it.title, it.summary, it.series, TOPIC_BY_KEY[it.topic]?.label,
          ...(it.links || []).map(l => l.label + ' ' + host(l.href)),
          ...(it.sections || []).flatMap(sec => [sec.label, ...sec.entries.map(e => e.title + ' ' + e.note)])
          ].join(' ').toLowerCase());
        if (!terms.every(t => hay.includes(t))) return false;
      }
      return true;
    }).sort(byTopicThenTitle);
  }

  /* ---------- render: topic chips ---------- */
  function renderTopics() {
    const marked = ITEMS.filter(i => store.bookmarks[i.id]).length;
    const all = `<button type="button" class="chip" data-topic="" aria-pressed="${!state.topic}"><span class="swatch" style="background:#111827">${ICON.grid}</span>All<span class="count">${ITEMS.length}</span></button>`;
    const saved = `<button type="button" class="chip" data-topic="bookmarked" aria-pressed="${state.topic === 'bookmarked'}"><span class="swatch" style="background:${YELLOW}">${ICON.starThin}</span>Bookmarked<span class="count">${marked}</span></button>`;
    $('#topics').innerHTML = all + TOPICS.map(t => {
      const n = ITEMS.filter(i => i.topic === t.key).length;
      return `<button type="button" class="chip" data-topic="${t.key}" aria-pressed="${state.topic === t.key}" style="${styleVars(t.key)}">
        <span class="swatch">${st(t.key).icon}</span>${esc(t.label)}<span class="count">${n}</span></button>`;
    }).join('') + saved;
  }

  /* ---------- render: cards & rows ---------- */
  function statusHTML(it) {
    if (store.done[it.id]) return '<span class="status done">Done</span>';
    if (store.bookmarks[it.id]) return '<span class="status saved">Bookmarked</span>';
    return '';
  }
  function rowHTML(it) {
    const marked = !!store.bookmarks[it.id];
    return `<article class="row" data-id="${it.id}" style="${styleVars(it.topic)}">
      <div class="block${it.code && it.kind === 'state' ? ' with-code' : ''}" data-open="${it.id}">${st(it.topic).icon}${it.code && it.kind === 'state' ? `<span class="code">${esc(it.code)}</span>` : ''}</div>
      <div class="row-main">
        <button class="title-btn" type="button" data-open="${it.id}"><span class="title">${titleHTML(it)}</span></button>
        <p class="about">${esc(it.summary)}</p>
      </div>
      <div class="right">
        ${it.hasPdf ? `<a class="icon-btn" href="${esc(it.download)}" target="_blank" rel="noopener" title="Download PDF" aria-label="Download PDF">${ICON.download}</a>` : ''}
        <button class="icon-btn star" type="button" data-star="${it.id}" aria-pressed="${marked}" title="${marked ? 'Remove bookmark' : 'Bookmark'}" aria-label="Bookmark">${marked ? ICON.star : ICON.starOutline}</button>
      </div>
    </article>`;
  }
  function renderInto(el, items, emptyHTML) {
    el.className = 'rows';
    if (!items.length) { el.innerHTML = emptyHTML; return; }
    // a small topic label opens each group when more than one topic is on screen
    const topicsShown = new Set(items.map(i => i.topic));
    let html = '', last = null;
    items.forEach(it => {
      if (topicsShown.size > 1 && it.topic !== last) {
        const t = TOPIC_BY_KEY[it.topic] || {};
        html += `<div class="group-label" style="${styleVars(it.topic)}"><span class="swatch">${st(it.topic).icon}</span>${esc(t.label || '')}</div>`;
        last = it.topic;
      }
      html += rowHTML(it);
    });
    el.innerHTML = html;
  }
  function renderGrid() {
    const items = filtered();
    state.listIds = items.map(i => i.id);
    const label = state.topic === 'bookmarked' ? 'Bookmarked' : (state.topic ? TOPIC_BY_KEY[state.topic].label : 'Quick guides and lessons');
    $('#grid-title').textContent = state.q ? `Results for “${state.q.trim()}”` : label;
    $('#result-count').textContent = state.q ? `${items.length} result${items.length === 1 ? '' : 's'} for “${state.q.trim()}”` : (items.length === 1 ? '1 guide' : `${items.length} guides`);
    renderInto($('#grid'), items, `<div class="empty"><h3>${state.topic === 'bookmarked' ? 'No bookmarks yet.' : 'Nothing matches.'}</h3><p>${state.topic === 'bookmarked' ? 'Tap the star on any guide and it will show up here.' : 'Try fewer words or pick another topic.'}</p></div>`);
  }
  /* ---------- viewer ---------- */
  function linksPageHTML(it) {
    const secs = it.sections.filter(s => s.entries.length || s.source);
    const nav = secs.length > 1 ? `<nav class="lp-nav">${secs.map(s =>
      `<button type="button" data-jump="${s.key}">${esc(s.label)}<span class="n">${s.entries.length}</span></button>`).join('')}</nav>` : '';
    const body = secs.map(s => `<section class="lp-sec" id="sec-${s.key}">
        <h3>${esc(s.label)}<span class="n">${s.entries.length}</span></h3>
        ${s.note ? `<p class="lp-note">${esc(s.note)}</p>` : ''}
        ${s.intro ? `<p class="lp-intro">${esc(s.intro)}</p>` : ''}
        ${s.entries.length ? `<ol class="lp-list">${s.entries.map(e => `<li>
            <p class="lp-title">${esc(e.title)}</p>
            ${e.note ? `<p class="lp-sub">${esc(e.note)}</p>` : ''}
            ${e.links.length ? `<p class="lp-links">${e.links.map(l =>
              `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label || host(l.href))}${ICON.ext}</a>`).join('')}</p>` : ''}
          </li>`).join('')}</ol>`
          : `<p class="lp-empty">${s.accessible ? 'This report has no links yet.' : 'This report could not be opened. The link in the source document needs checking.'}</p>`}
        ${s.source ? `<p class="lp-source"><a href="${esc(s.source)}" target="_blank" rel="noopener">Open the full ${esc(s.label)} report${ICON.ext}</a></p>` : ''}
      </section>`).join('');
    return `<div class="links-page">${nav}${body}</div>`;
  }

  function stageHTML(it) {
    if (it.sections) return linksPageHTML(it);
    const tabs = [];
    if (it.hasVideo) tabs.push(['video', 'Video']);
    if (it.preview) tabs.push(['pdf', 'PDF']);
    if (!tabs.some(t => t[0] === state.stage)) state.stage = tabs.length ? tabs[0][0] : 'none';
    let media;
    if (state.stage === 'pdf') media = `<div class="media"><iframe src="${esc(it.preview)}" title="${esc(it.title)} PDF" allow="fullscreen"></iframe></div>`;
    else if (state.stage === 'video') media = `<div class="media video"><iframe src="${esc(it.video)}" title="${esc(it.title)} video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    else media = `<div class="media empty"><div><p>This lesson has no PDF yet.</p><a class="btn small" href="${esc(it.url)}" target="_blank" rel="noopener">Read it in the community ${ICON.ext}</a></div></div>`;
    return `${tabs.length > 1 ? `<div class="stage-tabs">${tabs.map(([k, l]) => `<button type="button" data-stage="${k}" aria-pressed="${state.stage === k}">${l}</button>`).join('')}</div>` : ''}
      ${media}
      ${state.stage === 'pdf' ? `<div class="stage-note">If the preview stays blank, use Download PDF at the top.</div>` : ''}`;
  }
  function openGuide(id, push) {
    const it = byId[id]; if (!it) return;
    state.open = id;
    const marked = !!store.bookmarks[id];
    $('#viewer-title').innerHTML = `<span class="swatch" style="${styleVars(it.topic)}">${st(it.topic).icon}</span><span class="t">${titleHTML(it)}</span>`;
    $('#viewer-actions').innerHTML = `
      ${it.hasPdf ? `<a class="btn primary small" href="${esc(it.download)}" target="_blank" rel="noopener">${ICON.download} Download PDF</a>` : ''}
      <button class="icon-btn star" type="button" data-star="${id}" aria-pressed="${marked}" title="${marked ? 'Remove bookmark' : 'Bookmark'}" aria-label="Bookmark">${marked ? ICON.star : ICON.starOutline}</button>`;
    $('#viewer-body').innerHTML = `<div class="stage" id="stage" style="${styleVars(it.topic)}">${stageHTML(it)}</div>`;
    const v = $('#viewer'), scrim = $('#scrim');
    v.hidden = false; scrim.hidden = false;
    requestAnimationFrame(() => { v.classList.add('open'); scrim.classList.add('open'); });
    const idx = state.listIds.indexOf(id);
    $('[data-action="prev"]').disabled = idx <= 0;
    $('[data-action="next"]').disabled = idx < 0 || idx >= state.listIds.length - 1;
    if (push !== false) history.replaceState(null, '', '#guide/' + id);
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('[data-action="close"]')?.focus(), 50);
  }
  function closeViewer() {
    const v = $('#viewer'), scrim = $('#scrim');
    v.classList.remove('open'); scrim.classList.remove('open');
    setTimeout(() => { v.hidden = true; scrim.hidden = true; $('#viewer-body').innerHTML = ''; }, 200);
    state.open = null; state.stage = 'video';
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.search);
    refresh();
  }

  /* ---------- actions ---------- */
  function toggleStar(id) {
    store.bookmarks[id] = !store.bookmarks[id]; if (!store.bookmarks[id]) delete store.bookmarks[id];
    save(); toast(store.bookmarks[id] ? 'Bookmarked' : 'Bookmark removed');
    refresh(); if (state.open === id) syncViewerButtons(id);
  }
  function toggleDone(id) {
    store.done[id] = !store.done[id]; if (!store.done[id]) delete store.done[id];
    save(); toast(store.done[id] ? 'Marked done' : 'Marked not done');
    refresh(); if (state.open === id) syncViewerButtons(id);
  }
  function syncViewerButtons(id) {
    const s = $('#viewer [data-star]'); if (s) { const on = !!store.bookmarks[id]; s.setAttribute('aria-pressed', on); s.innerHTML = on ? ICON.star : ICON.starOutline; s.title = on ? 'Remove bookmark' : 'Bookmark'; }
  }
  let noteTimer;
  function saveNote(id, text) {
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      if (text.trim()) store.notes[id] = text; else delete store.notes[id];
      save();
      const s = $('#saved'); if (s) s.textContent = 'Saved';
      setTimeout(() => { const s2 = $('#saved'); if (s2) s2.textContent = ''; }, 1800);
    }, 400);
  }
  function toggleCheck(id, href, btn) {
    store.checked[id] = store.checked[id] || {};
    store.checked[id][href] = !store.checked[id][href]; if (!store.checked[id][href]) delete store.checked[id][href];
    save();
    const on = !!store.checked[id][href];
    btn.setAttribute('aria-checked', String(on)); btn.closest('li').classList.toggle('checked', on);
  }
  let toastTimer;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1600); }
  function copy(text) { return navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text).then(() => true, () => false) : Promise.resolve(false); }
  function setTab(tab) { state.tab = 'library'; window.scrollTo({ top: 0 }); }
  function refresh() { renderTopics(); renderGrid(); }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (a) {
      const act = a.dataset.action;
      if (act === 'home') { e.preventDefault(); state.topic = null; setTab('library'); refresh(); }
      if (act === 'close') closeViewer();
      if (act === 'prev' || act === 'next') { const idx = state.listIds.indexOf(state.open); const nid = state.listIds[idx + (act === 'next' ? 1 : -1)]; if (nid) { state.stage = 'video'; openGuide(nid); } }
      return;
    }
    const tp = e.target.closest('[data-topic]'); if (tp) { state.topic = tp.dataset.topic || null; refresh(); return; }
    const st_ = e.target.closest('[data-star]'); if (st_) { e.stopPropagation(); toggleStar(st_.dataset.star); return; }
    const dn = e.target.closest('[data-done]'); if (dn) { e.stopPropagation(); toggleDone(dn.dataset.done); return; }
    const jp = e.target.closest('[data-jump]');
    if (jp) { document.getElementById('sec-' + jp.dataset.jump)?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    const sg = e.target.closest('[data-stage]'); if (sg) { state.stage = sg.dataset.stage; const it = byId[state.open]; if (it) $('#stage').innerHTML = stageHTML(it); return; }
    const ck = e.target.closest('[data-check]'); if (ck) { toggleCheck(state.open, ck.dataset.check, ck); return; }
    const op = e.target.closest('[data-open]'); if (op) { state.stage = 'video'; openGuide(op.dataset.open); return; }
    if (e.target.id === 'scrim') closeViewer();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.open) closeViewer();
    if (e.key === '/' && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'q') { state.q = e.target.value; $('#q-clear').hidden = !state.q; renderGrid(); }
  });
  $('#q-clear').addEventListener('click', () => { $('#q').value = ''; state.q = ''; $('#q-clear').hidden = true; renderGrid(); $('#q').focus(); });
  window.addEventListener('hashchange', route);
  function route() {
    const m = location.hash.match(/^#guide\/(\d+)$/);
    if (m && byId[m[1]]) { if (!state.listIds.includes(m[1])) { state.topic = null; state.q = ''; $('#q').value = ''; refresh(); } openGuide(m[1], false); }
  }

  /* ---------- boot ---------- */
  if (DATA.library && DATA.library.title) { const w = $('.brand-word'); if (w) w.textContent = DATA.library.title; document.title = 'Lesko Help ' + DATA.library.title; }
  refresh(); route();
})();
