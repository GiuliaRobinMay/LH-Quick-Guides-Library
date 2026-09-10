/* Lesko Help · Quick Guide Library — dashboard logic.
   Data comes from data/guides.js (window.LESKO_GUIDES). Member state
   (bookmarks, done, notes, ticked links, requests, view) lives in localStorage. */
(function () {
  'use strict';

  const DATA = window.LESKO_GUIDES || { topics: [], items: [] };
  const TOPICS = DATA.topics;
  const TOPIC_BY_KEY = Object.fromEntries(TOPICS.map(t => [t.key, t]));
  const TOPIC_STYLE = {
    business:  { accent: '#2B4EC8', tint: '#EEF2FD', ink: '#2340B0' },
    nonprofit: { accent: '#E6473B', tint: '#FDF0EE', ink: '#C93A2F' },
    career:    { accent: '#2E9E5B', tint: '#E9F7EF', ink: '#22824A' }
  };
  const QUESTIONS_CHANNEL = 'https://lesko-help-2.mn.co/spaces/11054387';
  const TEAM_EMAIL = 'support@leskohelp.com';
  const STORE_KEY = 'lesko-quick-guides-v2';

  // Media on each item: PDF, video, or neither (a plain lesson).
  const ITEMS = DATA.items.map(i => Object.assign({}, i, {
    hasPdf: !!i.download, hasVideo: !!i.video,
    type: i.download ? 'guide' : (i.video ? 'video' : 'lesson')
  }));
  const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));

  /* ---------- storage ---------- */
  const store = load();
  function load() {
    const base = { bookmarks: {}, done: {}, notes: {}, checked: {}, requests: [], view: 'cards' };
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
  const styleVars = k => { const s = TOPIC_STYLE[k] || {}; return `--accent:${s.ink || s.accent || '#5B6478'};--tint:${s.tint || '#FAF8F4'}`; };
  const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

  const ICON = {
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/></svg>',
    starOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v6M9.5 15.5 12 18l2.5-2.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
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

  /* ---------- render: tiles ---------- */
  function renderTiles() {
    const all = ITEMS.length, allDone = ITEMS.filter(i => store.done[i.id]).length;
    const tiles = [`<button type="button" class="tile" data-topic="" aria-pressed="${!state.topic}" style="--accent:#1B2A4A;--tint:#FAF8F4">
        <span class="k"><span class="swatch"></span>All guides</span><span class="v">${all}</span>
        <span class="sub">${ITEMS.filter(i => i.hasPdf).length} PDFs · ${ITEMS.filter(i => i.hasVideo).length} videos</span></button>`];
    TOPICS.forEach(t => {
      const its = ITEMS.filter(i => i.topic === t.key);
      const done = its.filter(i => store.done[i.id]).length;
      const st = TOPIC_STYLE[t.key] || {};
      tiles.push(`<button type="button" class="tile" data-topic="${t.key}" aria-pressed="${state.topic === t.key}" style="--accent:${st.accent};--tint:${st.tint}">
        <span class="k"><span class="swatch"></span>${esc(t.label)}</span><span class="v">${its.length}<small>${its.filter(i => i.hasPdf).length} PDFs</small></span>
        <span class="sub"><span class="bar"><i style="width:${its.length ? Math.round(done / its.length * 100) : 0}%"></i></span>${done}/${its.length} done</span></button>`);
    });
    $('#tiles').innerHTML = tiles.join('');
    $('#grid-title').innerHTML = state.q ? `Results <span>for “${esc(state.q.trim())}”</span>` : (state.topic ? `${esc(TOPIC_BY_KEY[state.topic].label)} <span>guides</span>` : 'All guides');
  }

  /* ---------- render: cards ---------- */
  function cardHTML(it) {
    const t = TOPIC_BY_KEY[it.topic] || {};
    const marked = !!store.bookmarks[it.id];
    const done = !!store.done[it.id];
    const type = it.hasPdf ? 'PDF' : (it.hasVideo ? 'Video' : 'Lesson');
    return `<article class="card${done ? ' is-done' : ''}" data-id="${it.id}" style="${styleVars(it.topic)}">
      <div class="card-meta">
        <span class="chip">${esc(t.label || '')}</span>
        <span class="chip type">${type}${it.hasPdf && it.hasVideo ? ' + video' : ''}</span>
        <span class="spacer"></span>
        <span class="done-mark">Done</span>
      </div>
      <button class="title-btn" type="button" data-open="${it.id}"><span class="title">${esc(it.title)}</span></button>
      <p class="summary">${esc(it.summary)}</p>
      <div class="card-foot">
        <button class="open" type="button" data-open="${it.id}">Open</button>
        <span class="spacer"></span>
        ${it.hasPdf ? `<a class="icon-btn" href="${esc(it.download)}" target="_blank" rel="noopener" title="Download PDF" aria-label="Download PDF">${ICON.pdf}</a>` : ''}
        <button class="icon-btn star" type="button" data-star="${it.id}" aria-pressed="${marked}" title="${marked ? 'Remove bookmark' : 'Bookmark'}" aria-label="Bookmark">${marked ? ICON.star : ICON.starOutline}</button>
      </div>
    </article>`;
  }
  function renderGrid() {
    const items = filtered();
    state.listIds = items.map(i => i.id);
    $('#result-count').textContent = items.length === 1 ? '1 guide' : `${items.length} guides`;
    const el = $('#grid');
    el.classList.toggle('list', store.view === 'list');
    $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === store.view)));
    el.innerHTML = items.length ? items.map(cardHTML).join('')
      : `<div class="empty"><h3>Nothing matches.</h3><p>Try fewer words or pick another topic.</p></div>`;
  }

  /* ---------- render: bookmarked ---------- */
  function renderMine() {
    const items = Object.keys(store.bookmarks).filter(id => store.bookmarks[id] && byId[id]).map(id => byId[id]).sort(byTitle);
    const badge = $('#mine-badge'); badge.textContent = items.length; badge.hidden = items.length === 0;
    const done = items.filter(i => store.done[i.id]).length;
    const noted = items.filter(i => store.notes[i.id] && store.notes[i.id].trim()).length;
    const contacted = Object.values(store.checked).reduce((n, m) => n + Object.values(m || {}).filter(Boolean).length, 0);
    $('#mine-tiles').innerHTML = `
      <div class="tile static" style="--accent:#F5C242;--tint:#FFF6DE"><span class="k"><span class="swatch"></span>Bookmarked</span><span class="v">${items.length}</span></div>
      <div class="tile static" style="--accent:#2E9E5B;--tint:#E9F7EF"><span class="k"><span class="swatch"></span>Worked through</span><span class="v">${done}<small>of ${items.length}</small></span><span class="sub"><span class="bar"><i style="width:${items.length ? Math.round(done / items.length * 100) : 0}%"></i></span></span></div>
      <div class="tile static" style="--accent:#2B4EC8;--tint:#EEF2FD"><span class="k"><span class="swatch"></span>Organizations contacted</span><span class="v">${contacted}</span></div>
      <div class="tile static" style="--accent:#E6473B;--tint:#FDF0EE"><span class="k"><span class="swatch"></span>Guides with notes</span><span class="v">${noted}</span></div>`;
    const el = $('#mine-grid');
    el.classList.toggle('list', store.view === 'list');
    el.innerHTML = items.length ? items.map(cardHTML).join('')
      : `<div class="empty"><h3>No bookmarks yet.</h3><p>Tap the star on any guide and it will show up here.</p></div>`;
  }

  /* ---------- render: requests ---------- */
  function renderRequestForm() {
    const sel = $('#rq-topic');
    if (!sel.options.length) sel.innerHTML = TOPICS.map(t => `<option value="${t.key}">${esc(t.label)}</option>`).join('') + '<option value="other">Something else</option>';
    const list = $('#requests');
    const reqs = store.requests.slice().reverse();
    $('#rq-count').textContent = reqs.length ? `${reqs.length} saved` : '';
    if (!reqs.length) { list.innerHTML = `<li><span class="rq-meta">Nothing saved yet</span></li>`; return; }
    list.innerHTML = reqs.map(r => `<li>
      <span class="rq-title">${esc(r.title)}</span>
      <span class="rq-meta">${esc(TOPIC_BY_KEY[r.topic]?.label || 'Something else')} · ${fmtDate(r.at)}</span>
      ${r.why ? `<span>${esc(r.why)}</span>` : ''}
      <div class="rq-actions">
        <a class="btn small" href="${QUESTIONS_CHANNEL}" target="_blank" rel="noopener" data-copy-request="${r.id}">Post in the community</a>
        <a class="btn small ghost" href="${mailto(r)}">Email the team</a>
        <button class="btn small ghost" type="button" data-remove-request="${r.id}">Remove</button>
      </div></li>`).join('');
  }
  const requestText = r => `Quick guide request\nTopic: ${TOPIC_BY_KEY[r.topic]?.label || 'Something else'}\nGuide: ${r.title}${r.why ? '\nWhy: ' + r.why : ''}${r.name ? '\nFrom: ' + r.name : ''}`;
  const mailto = r => `mailto:${TEAM_EMAIL}?subject=${encodeURIComponent('Quick guide request: ' + r.title)}&body=${encodeURIComponent(requestText(r))}`;

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
    const marked = !!store.bookmarks[id], done = !!store.done[id];
    const checked = store.checked[id] || {};
    const eyebrow = $('#viewer-eyebrow');
    eyebrow.style.cssText = styleVars(it.topic);
    eyebrow.innerHTML = `<span class="chip">${esc(t.label || '')}</span><span class="chip type">${it.hasPdf ? 'Quick guide' : (it.hasVideo ? 'Video lesson' : 'Lesson')}</span>`;
    $('#viewer-body').innerHTML = `
      <div class="stage" id="stage">${stageHTML(it)}</div>
      <div class="detail">
        <h2 id="viewer-title" tabindex="-1">${esc(it.title)}</h2>
        <p class="series"><a href="${esc(it.spaceUrl)}" target="_blank" rel="noopener">${esc(it.space)}</a></p>
        <p class="summary">${esc(it.summary)}</p>
        <div class="cta-row">
          ${it.hasPdf ? `<a class="btn primary" href="${esc(it.download)}" target="_blank" rel="noopener">${ICON.pdf} Download PDF</a>` : ''}
          ${it.hasVideo ? `<button class="btn" type="button" data-stage="video">${ICON.play} Watch video</button>` : ''}
          <a class="btn" href="${esc(it.url)}" target="_blank" rel="noopener">Open in community ${ICON.ext}</a>
        </div>
        <div class="cta-row" style="margin-top:8px">
          <button class="btn small" type="button" data-star="${id}" aria-pressed="${marked}">${marked ? ICON.star + ' Bookmarked' : ICON.starOutline + ' Bookmark'}</button>
          <button class="btn small done-btn" type="button" data-done="${id}" aria-pressed="${done}">${done ? ICON.check + ' Done' : 'Mark done'}</button>
        </div>
        <div class="section">
          <div class="section-title"><h3>Organizations &amp; links</h3><span class="hint">${(it.links || []).length ? 'Tick the ones you contacted' : ''}</span></div>
          ${(it.links || []).length ? `<ul class="links">${it.links.map(l => `<li class="${checked[l.href] ? 'checked' : ''}">
              <button class="check" type="button" role="checkbox" aria-checked="${!!checked[l.href]}" data-check="${esc(l.href)}" aria-label="Contacted">${ICON.check}</button>
              <span><span class="label"><a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label || host(l.href))}</a></span><br><span class="host">${esc(host(l.href))}</span></span>
            </li>`).join('')}</ul>`
            : `<p class="help">The organizations for this guide are listed inside the PDF.</p>`}
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
    const d = $('#viewer [data-done]'); if (d) { const on = !!store.done[id]; d.setAttribute('aria-pressed', on); d.innerHTML = on ? ICON.check + ' Done' : 'Mark done'; }
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
    $$('.nav-item').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    ['library', 'mine', 'request'].forEach(k => { $('#view-' + k).hidden = k !== tab; });
    if (tab === 'mine') renderMine();
    if (tab === 'request') renderRequestForm();
  }
  function refresh() { renderTiles(); renderGrid(); renderMine(); }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (a) {
      const act = a.dataset.action;
      if (act === 'home') { e.preventDefault(); setTab('library'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      if (act === 'close') closeViewer();
      if (act === 'prev' || act === 'next') { const idx = state.listIds.indexOf(state.open); const nid = state.listIds[idx + (act === 'next' ? 1 : -1)]; if (nid) openGuide(nid); }
      if (act === 'print') window.print();
      if (act === 'export') exportNotes();
      if (act === 'reset' && confirm('Clear all bookmarks, notes, check-marks and saved requests on this device?')) {
        ['bookmarks', 'done', 'notes', 'checked'].forEach(k => store[k] = {}); store.requests = []; save(); refresh(); renderRequestForm(); toast('Cleared');
      }
      if (act === 'go-request') { e.preventDefault(); setTab('request'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      return;
    }
    const tab = e.target.closest('.nav-item'); if (tab) { setTab(tab.dataset.tab); return; }
    const tp = e.target.closest('[data-topic]'); if (tp) { state.topic = tp.dataset.topic || null; refresh(); return; }
    const vw = e.target.closest('[data-view]'); if (vw) { store.view = vw.dataset.view; save(); renderGrid(); renderMine(); return; }
    const st = e.target.closest('[data-star]'); if (st) { e.stopPropagation(); toggleStar(st.dataset.star); return; }
    const dn = e.target.closest('[data-done]'); if (dn) { e.stopPropagation(); toggleDone(dn.dataset.done); return; }
    const sg = e.target.closest('[data-stage]'); if (sg) { state.stage = sg.dataset.stage; const it = byId[state.open]; if (it) $('#stage').innerHTML = stageHTML(it); return; }
    const ck = e.target.closest('[data-check]'); if (ck) { toggleCheck(state.open, ck.dataset.check, ck); return; }
    const op = e.target.closest('[data-open]'); if (op) { state.stage = 'pdf'; openGuide(op.dataset.open); return; }
    const rm = e.target.closest('[data-remove-request]'); if (rm) { store.requests = store.requests.filter(r => r.id !== rm.dataset.removeRequest); save(); renderRequestForm(); toast('Request removed'); return; }
    const cp = e.target.closest('[data-copy-request]'); if (cp) { const r = store.requests.find(x => x.id === cp.dataset.copyRequest); if (r) copy(requestText(r)).then(ok => toast(ok ? 'Request copied. Paste it in the channel' : 'Opening the Questions Channel')); return; }
    if (e.target.id === 'scrim') closeViewer();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.open) closeViewer();
    if (e.key === '/' && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'q') { state.q = e.target.value; $('#q-clear').hidden = !state.q; if (state.tab !== 'library') setTab('library'); renderTiles(); renderGrid(); }
    if (e.target.id === 'notes') saveNote(state.open, e.target.value);
  });
  $('#q-clear').addEventListener('click', () => { $('#q').value = ''; state.q = ''; $('#q-clear').hidden = true; renderTiles(); renderGrid(); $('#q').focus(); });
  $('#request-form').addEventListener('submit', e => {
    e.preventDefault();
    const r = { id: 'r' + Date.now().toString(36), topic: $('#rq-topic').value, title: $('#rq-title').value.trim(), why: $('#rq-why').value.trim(), name: $('#rq-name').value.trim(), at: new Date().toISOString() };
    if (!r.title) return;
    store.requests.push(r); save(); e.target.reset(); renderRequestForm(); toast('Request saved');
  });
  window.addEventListener('hashchange', route);
  function route() {
    const m = location.hash.match(/^#guide\/(\d+)$/);
    if (m && byId[m[1]]) { setTab('library'); if (!state.listIds.includes(m[1])) { state.topic = null; state.q = ''; $('#q').value = ''; refresh(); } openGuide(m[1], false); }
  }

  /* ---------- boot ---------- */
  refresh(); renderRequestForm(); route();
})();
