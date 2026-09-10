/* Lesko Help · Quick Guide Library — app logic.
   Data comes from data/guides.js (window.LESKO_GUIDES). Member state
   (bookmarks, done, notes, ticked links, requests, view) lives in localStorage. */
(function () {
  'use strict';

  const DATA = window.LESKO_GUIDES || { topics: [], items: [] };
  const TOPICS = DATA.topics;
  const TOPIC_BY_KEY = Object.fromEntries(TOPICS.map(t => [t.key, t]));
  // Topic look: gradient cover, icon tint, ink colour, icon (Lucide line icons).
  const TOPIC_STYLE = {
    business:  { grad: 'linear-gradient(135deg, #0FB88A 0%, #19D6B4 100%)', tint: '#E1F7F0', ink: '#0E9F78',
                 icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>' },
    nonprofit: { grad: 'linear-gradient(135deg, #EF4E7B 0%, #FB8A7A 100%)', tint: '#FDE7EE', ink: '#DB3A6C',
                 icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/><path d="m18 15-2-2"/><path d="m15 18-2-2"/></svg>' },
    career:    { grad: 'linear-gradient(135deg, #6A5AF9 0%, #A97CFF 100%)', tint: '#EDEAFE', ink: '#6552E8',
                 icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>' }
  };
  const STORE_KEY = 'lesko-quick-guides-v2';

  const ITEMS = DATA.items.map(i => Object.assign({}, i, { hasPdf: !!i.download, hasVideo: !!i.video }));
  const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));

  /* ---------- storage ---------- */
  const store = load();
  function load() {
    const base = { bookmarks: {}, done: {}, notes: {}, checked: {}, requests: [], view: 'list' };
    try { const raw = localStorage.getItem(STORE_KEY); return raw ? Object.assign(base, JSON.parse(raw)) : base; } catch (e) { return base; }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* private mode */ } }

  /* ---------- state ---------- */
  const state = { tab: 'library', topic: null, q: '', open: null, listIds: [], stage: 'pdf' };

  /* ---------- helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const host = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const fmtDate = iso => { try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return iso; } };
  const st = k => TOPIC_STYLE[k] || { grad: 'linear-gradient(135deg,#9CA3AF,#D1D5DB)', tint: '#F3F4F7', ink: '#6B7280', icon: '' };
  const styleVars = k => { const s = st(k); return `--grad:${s.grad};--tint:${s.tint};--ink:${s.ink}`; };
  const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  const typeLabel = it => it.hasPdf && it.hasVideo ? "PDF · Video" : (it.hasPdf ? "PDF guide" : (it.hasVideo ? "Video lesson" : "Lesson"));

  const ICON = {
    starThin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/></svg>',
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
      if (state.topic && it.topic !== state.topic) return false;
      if (terms.length) {
        const hay = it._hay || (it._hay = [it.title, it.summary, it.series, TOPIC_BY_KEY[it.topic]?.label,
          ...(it.links || []).map(l => l.label + ' ' + host(l.href))].join(' ').toLowerCase());
        if (!terms.every(t => hay.includes(t))) return false;
      }
      return true;
    }).sort(byTitle);
  }

  /* ---------- render: topic chips ---------- */
  function renderTopics() {
    const all = `<button type="button" class="chip" data-topic="" aria-pressed="${!state.topic}"><span class="swatch" style="background:linear-gradient(135deg,#F5B300,#FFD54F)">${ICON.starThin}</span>All<span class="count">${ITEMS.length}</span></button>`;
    $('#topics').innerHTML = all + TOPICS.map(t => {
      const n = ITEMS.filter(i => i.topic === t.key).length;
      return `<button type="button" class="chip" data-topic="${t.key}" aria-pressed="${state.topic === t.key}" style="${styleVars(t.key)}">
        <span class="swatch">${st(t.key).icon}</span>${esc(t.label)}<span class="count">${n}</span></button>`;
    }).join('');
  }

  /* ---------- render: cards & rows ---------- */
  function statusHTML(it) {
    if (store.done[it.id]) return '<span class="status done">Done</span>';
    if (store.bookmarks[it.id]) return '<span class="status saved">Bookmarked</span>';
    return '';
  }
  function cardHTML(it) {
    const t = TOPIC_BY_KEY[it.topic] || {};
    const marked = !!store.bookmarks[it.id];
    return `<article class="card" data-id="${it.id}" style="${styleVars(it.topic)}">
      <div class="cover" data-open="${it.id}">
        <span class="label">${st(it.topic).icon}${esc(t.label || '')}</span>
        <button class="star" type="button" data-star="${it.id}" aria-pressed="${marked}" title="${marked ? 'Remove bookmark' : 'Bookmark'}" aria-label="Bookmark">${marked ? ICON.star : ICON.starOutline}</button>
      </div>
      <div class="card-body">
        <button class="title-btn" type="button" data-open="${it.id}"><span class="title">${esc(it.title)}</span></button>
        <p class="summary">${esc(it.summary)}</p>
        <div class="card-meta">
          <span class="left">${it.hasVideo && !it.hasPdf ? ICON.play : ICON.file}${typeLabel(it)}</span>
          <span class="right">${it.hasPdf ? `<a href="${esc(it.download)}" target="_blank" rel="noopener" title="Download PDF">${ICON.download} Download</a>` : ''}</span>
        </div>
      </div>
    </article>`;
  }
  function rowHTML(it) {
    const marked = !!store.bookmarks[it.id];
    return `<article class="row" data-id="${it.id}" style="${styleVars(it.topic)}">
      <div class="block" data-open="${it.id}">${st(it.topic).icon}</div>
      <div class="row-main">
        <button class="title-btn" type="button" data-open="${it.id}"><span class="title">${esc(it.title)}</span></button>
        <p class="about">${esc(it.summary)}</p>
      </div>
      <div class="right">
        ${it.hasPdf ? `<a class="icon-btn" href="${esc(it.download)}" target="_blank" rel="noopener" title="Download PDF" aria-label="Download PDF">${ICON.download}</a>` : ''}
        <button class="icon-btn star" type="button" data-star="${it.id}" aria-pressed="${marked}" title="${marked ? 'Remove bookmark' : 'Bookmark'}" aria-label="Bookmark">${marked ? ICON.star : ICON.starOutline}</button>
      </div>
    </article>`;
  }
  function renderInto(el, items, emptyHTML) {
    const list = store.view === 'list';
    el.className = list ? 'rows' : 'grid';
    el.innerHTML = items.length ? items.map(list ? rowHTML : cardHTML).join('') : emptyHTML;
  }
  function renderGrid() {
    const items = filtered();
    state.listIds = items.map(i => i.id);
    $('#result-count').textContent = items.length === 1 ? '1 guide' : `${items.length} guides`;
    $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === store.view)));
    $('#grid-title').textContent = state.q ? 'Results' : (state.topic ? TOPIC_BY_KEY[state.topic].label : 'All guides');
    $('#grid-sub').textContent = state.q ? `Matching “${state.q.trim()}”` : (state.topic ? `${items.length} guides and lessons.` : 'Business, nonprofit and career guides from Lesko Help.');
    renderInto($('#grid'), items, `<div class="empty"><h3>Nothing matches.</h3><p>Try fewer words or pick another topic.</p></div>`);
    // pinned strip: bookmarked, only on the unfiltered library
    const pinned = Object.keys(store.bookmarks).filter(id => store.bookmarks[id] && byId[id]).map(id => byId[id]).sort(byTitle).slice(0, 3);
    const show = pinned.length && !state.q && !state.topic;
    $('#pinned').hidden = !show;
    if (show) renderInto($('#pinned-grid'), pinned, '');
  }
  function renderMine() {
    const items = Object.keys(store.bookmarks).filter(id => store.bookmarks[id] && byId[id]).map(id => byId[id]).sort(byTitle);
    const badge = $('#mine-badge'); badge.textContent = items.length; badge.hidden = items.length === 0;
    $('#mine-sub').textContent = items.length ? `${items.length} bookmarked` : 'The guides you star will show up here.';
    renderInto($('#mine-grid'), items, `<div class="empty"><h3>No bookmarks yet.</h3><p>Tap the star on any guide and it will show up here.</p></div>`);
  }

  /* ---------- viewer ---------- */
  function stageHTML(it) {
    const tabs = [];
    if (it.preview) tabs.push(['pdf', 'PDF']);
    if (it.hasVideo) tabs.push(['video', 'Video']);
    if (!tabs.some(t => t[0] === state.stage)) state.stage = tabs.length ? tabs[0][0] : 'none';
    let media;
    if (state.stage === 'pdf') media = `<div class="media"><iframe src="${esc(it.preview)}" title="${esc(it.title)} PDF" allow="fullscreen"></iframe></div>`;
    else if (state.stage === 'video') media = `<div class="media video"><iframe src="${esc(it.video)}" title="${esc(it.title)} video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    else media = `<div class="media empty">This lesson lives in the community. Use “Open in community” to read it there.</div>`;
    return `${tabs.length > 1 ? `<div class="stage-tabs">${tabs.map(([k, l]) => `<button type="button" data-stage="${k}" aria-pressed="${state.stage === k}">${l}</button>`).join('')}</div>` : ''}
      ${media}
      ${state.stage === 'pdf' ? `<div class="stage-note">If the preview stays blank, use Download PDF on the right.</div>` : ''}`;
  }
  function openGuide(id, push) {
    const it = byId[id]; if (!it) return;
    state.open = id;
    const t = TOPIC_BY_KEY[it.topic] || {};
    const marked = !!store.bookmarks[id];
    const eyebrow = $('#viewer-eyebrow');
    eyebrow.style.cssText = styleVars(it.topic);
    eyebrow.innerHTML = `<span class="chip static" style="${styleVars(it.topic)}"><span class="swatch">${st(it.topic).icon}</span>${esc(t.label || '')}</span>`;
    $('#viewer-body').innerHTML = `
      <div class="stage" id="stage">${stageHTML(it)}</div>
      <div class="detail">
        <h2 id="viewer-title" tabindex="-1">${esc(it.title)}</h2>
        <p class="summary">${esc(it.summary)}</p>
        <div class="cta-row">
          ${it.hasPdf ? `<a class="btn primary small" href="${esc(it.download)}" target="_blank" rel="noopener">${ICON.download} Download PDF</a>` : ''}
          ${it.hasVideo ? `<button class="btn small" type="button" data-stage="video">${ICON.play} Watch video</button>` : ''}
          <button class="btn small star-btn" type="button" data-star="${id}" aria-pressed="${marked}">${marked ? ICON.star + ' Bookmarked' : ICON.starOutline + ' Bookmark'}</button>
        </div>
        <div class="section">
          <div class="section-title"><h3>My notes</h3><span class="hint">Saved on this device</span></div>
          <textarea class="notes" id="notes" placeholder="Who did you call? What did they say? What is your next step?">${esc(store.notes[id] || '')}</textarea>
          <div class="saved" id="saved"></div>
        </div>
      </div>`;
    const v = $('#viewer'), scrim = $('#scrim');
    v.hidden = false; scrim.hidden = false;
    requestAnimationFrame(() => { v.classList.add('open'); scrim.classList.add('open'); });
    const idx = state.listIds.indexOf(id);
    $('[data-action="prev"]').disabled = idx <= 0;
    $('[data-action="next"]').disabled = idx < 0 || idx >= state.listIds.length - 1;
    if (push !== false) history.replaceState(null, '', '#guide/' + id);
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#viewer-title')?.focus(), 50);
  }
  function closeViewer() {
    const v = $('#viewer'), scrim = $('#scrim');
    v.classList.remove('open'); scrim.classList.remove('open');
    setTimeout(() => { v.hidden = true; scrim.hidden = true; $('#viewer-body').innerHTML = ''; }, 200);
    state.open = null; state.stage = 'pdf';
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
    const s = $('#viewer [data-star]'); if (s) { const on = !!store.bookmarks[id]; s.setAttribute('aria-pressed', on); s.innerHTML = on ? ICON.star + ' Bookmarked' : ICON.starOutline + ' Bookmark'; }
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
  function exportNotes() {
    const lines = ['Lesko Help - My guides', ''];
    Object.keys(store.bookmarks).filter(id => byId[id]).forEach(id => {
      const it = byId[id];
      lines.push(`${store.done[id] ? '[x]' : '[ ]'} ${it.title}`); lines.push(`    ${it.url}`);
      const ch = store.checked[id] || {};
      (it.links || []).forEach(l => { if (ch[l.href]) lines.push(`    contacted: ${l.label} - ${l.href}`); });
      if (store.notes[id]) lines.push('    notes: ' + store.notes[id].replace(/\n/g, '\n           '));
      lines.push('');
    });
    copy(lines.join('\n')).then(ok => toast(ok ? 'Copied to clipboard' : 'Could not copy'));
  }
  function setTab(tab) {
    state.tab = tab;
    $$('.nav-item[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    $('.brand').classList.toggle('active', tab === 'library');
    ['library', 'mine'].forEach(k => { $('#view-' + k).hidden = k !== tab; });
    if (tab === 'mine') renderMine();
    window.scrollTo({ top: 0 });
  }
  function refresh() { renderTopics(); renderGrid(); renderMine(); }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (a) {
      const act = a.dataset.action;
      if (act === 'home') { e.preventDefault(); state.topic = null; setTab('library'); refresh(); }
      if (act === 'close') closeViewer();
      if (act === 'prev' || act === 'next') { const idx = state.listIds.indexOf(state.open); const nid = state.listIds[idx + (act === 'next' ? 1 : -1)]; if (nid) openGuide(nid); }
      if (act === 'export') exportNotes();
      if (act === 'reset' && confirm('Clear all bookmarks, notes, check-marks and saved requests on this device?')) {
        ['bookmarks', 'done', 'notes', 'checked'].forEach(k => store[k] = {}); save(); refresh(); toast('Cleared');
      }
      return;
    }
    const tl = e.target.closest('[data-tab-link]'); if (tl) { e.preventDefault(); setTab(tl.dataset.tabLink); return; }
    const tab = e.target.closest('.nav-item[data-tab]'); if (tab) { setTab(tab.dataset.tab); return; }
    const tp = e.target.closest('[data-topic]'); if (tp) { state.topic = tp.dataset.topic || null; if (state.tab !== 'library') setTab('library'); refresh(); return; }
    const vw = e.target.closest('[data-view]'); if (vw) { store.view = vw.dataset.view; save(); renderGrid(); renderMine(); return; }
    const st_ = e.target.closest('[data-star]'); if (st_) { e.stopPropagation(); toggleStar(st_.dataset.star); return; }
    const dn = e.target.closest('[data-done]'); if (dn) { e.stopPropagation(); toggleDone(dn.dataset.done); return; }
    const sg = e.target.closest('[data-stage]'); if (sg) { state.stage = sg.dataset.stage; const it = byId[state.open]; if (it) $('#stage').innerHTML = stageHTML(it); return; }
    const ck = e.target.closest('[data-check]'); if (ck) { toggleCheck(state.open, ck.dataset.check, ck); return; }
    const op = e.target.closest('[data-open]'); if (op) { state.stage = 'pdf'; openGuide(op.dataset.open); return; }
    if (e.target.id === 'scrim') closeViewer();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.open) closeViewer();
    if (e.key === '/' && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'q') { state.q = e.target.value; $('#q-clear').hidden = !state.q; if (state.tab !== 'library') setTab('library'); renderGrid(); }
    if (e.target.id === 'notes') saveNote(state.open, e.target.value);
  });
  $('#q-clear').addEventListener('click', () => { $('#q').value = ''; state.q = ''; $('#q-clear').hidden = true; renderGrid(); $('#q').focus(); });
  window.addEventListener('hashchange', route);
  function route() {
    const m = location.hash.match(/^#guide\/(\d+)$/);
    if (m && byId[m[1]]) { setTab('library'); if (!state.listIds.includes(m[1])) { state.topic = null; state.q = ''; $('#q').value = ''; refresh(); } openGuide(m[1], false); }
  }

  /* ---------- boot ---------- */
  refresh(); route();
})();
