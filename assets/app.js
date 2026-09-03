/* Lesko Help · Quick Guide Library — app logic.
   Data comes from data/guides.js (window.LESKO_GUIDES). Member state
   (bookmarks, done, notes, ticked links, requests) lives in localStorage. */
(function () {
  'use strict';

  const DATA = window.LESKO_GUIDES || { topics: [], items: [] };
  const TOPICS = DATA.topics;
  const TOPIC_BY_KEY = Object.fromEntries(TOPICS.map(t => [t.key, t]));
  const QUICK_TOPICS = ['business', 'nonprofit', 'career'];      // the three buttons
  const QUESTIONS_CHANNEL = 'https://lesko-help-2.mn.co/spaces/11054387';
  const TEAM_EMAIL = 'support@leskohelp.com';
  const STORE_KEY = 'lesko-quick-guides-v2';

  // Two types only: a quick guide has a downloadable file, a lesson does not.
  const ITEMS = DATA.items.map(i => Object.assign({}, i, { type: (i.pdfs && i.pdfs.length) || (i.drive && i.drive.length) ? 'guide' : 'lesson' }));
  const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));

  /* ---------- storage ---------- */
  const store = load();
  function load() {
    const base = { bookmarks: {}, done: {}, notes: {}, checked: {}, requests: [] };
    try { const raw = localStorage.getItem(STORE_KEY); return raw ? Object.assign(base, JSON.parse(raw)) : base; } catch (e) { return base; }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* private mode */ } }

  /* ---------- state ---------- */
  const state = { tab: 'library', topic: null, q: '', open: null, listIds: [], info: new Set() };

  /* ---------- helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const host = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const fmtDate = iso => { try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return iso; } };
  const TYPE_LABEL = { guide: 'Quick guide', lesson: 'Lesson' };

  const ICON = {
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/></svg>',
    starOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v6M9.5 15.5 12 18l2.5-2.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>'
  };

  /* ---------- filtering (always alphabetical) ---------- */
  function filtered() {
    const q = state.q.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    return ITEMS.filter(it => {
      if (state.topic && it.topic !== state.topic) return false;
      if (terms.length) {
        const hay = it._hay || (it._hay = [it.title, it.summary, it.series, TOPIC_BY_KEY[it.topic]?.label, it.space,
          ...(it.links || []).map(l => l.label + ' ' + host(l.href))].join(' ').toLowerCase());
        if (!terms.every(t => hay.includes(t))) return false;
      }
      return true;
    }).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }

  /* ---------- render: filters ---------- */
  function renderTopics() {
    $('#topics').innerHTML = QUICK_TOPICS.map(k => {
      const t = TOPIC_BY_KEY[k]; if (!t) return '';
      return `<button type="button" class="chip" data-topic="${k}" aria-pressed="${state.topic === k}">${esc(t.label)}</button>`;
    }).join('');
    const sel = $('#topic-select');
    if (sel.options.length <= 1) {
      TOPICS.filter(t => !QUICK_TOPICS.includes(t.key)).forEach(t => { const o = document.createElement('option'); o.value = t.key; o.textContent = t.label; sel.appendChild(o); });
    }
    sel.value = state.topic && !QUICK_TOPICS.includes(state.topic) ? state.topic : '';
    sel.classList.toggle('active', !!sel.value);
  }

  /* ---------- render: list ---------- */
  function rowHTML(it) {
    const t = TOPIC_BY_KEY[it.topic] || {};
    const marked = !!store.bookmarks[it.id];
    const done = !!store.done[it.id];
    const showInfo = state.info.has(it.id);
    return `<article class="row${done ? ' is-done' : ''}" data-id="${it.id}">
      <span class="dot ${it.type}" title="${TYPE_LABEL[it.type]}"></span>
      <button class="title-btn" type="button" data-open="${it.id}" title="${esc(it.title)}"><span class="title">${esc(it.title)}</span></button>
      <span class="topic">${esc(t.label || '')}</span>
      <span class="actions">
        <button class="icon-btn info" type="button" data-info="${it.id}" aria-expanded="${showInfo}" title="What is this about?" aria-label="About this guide">${ICON.info}</button>
        ${it.download ? `<a class="icon-btn pdf" href="${esc(it.download)}" target="_blank" rel="noopener" title="Download PDF" aria-label="Download PDF">${ICON.pdf}</a>` : '<span class="icon-btn placeholder"></span>'}
        <button class="icon-btn star" type="button" data-star="${it.id}" aria-pressed="${marked}" title="${marked ? 'Remove bookmark' : 'Bookmark'}" aria-label="Bookmark">${marked ? ICON.star : ICON.starOutline}</button>
      </span>
      ${showInfo ? `<p class="summary">${esc(it.summary)}${it.series && it.series !== t.label ? ` <span class="series">· ${esc(it.series)}</span>` : ''}</p>` : ''}
    </article>`;
  }
  function renderList() {
    const items = filtered();
    state.listIds = items.map(i => i.id);
    $('#result-count').textContent = items.length === 1 ? '1 guide' : `${items.length} guides`;
    const el = $('#list');
    el.innerHTML = items.length ? items.map(rowHTML).join('')
      : `<div class="empty"><h3>Nothing matches.</h3><p>Try fewer words or pick another topic.</p></div>`;
  }

  /* ---------- render: bookmarked ---------- */
  function renderMine() {
    const items = Object.keys(store.bookmarks).filter(id => store.bookmarks[id] && byId[id]).map(id => byId[id])
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    const badge = $('#mine-badge'); badge.textContent = items.length; badge.hidden = items.length === 0;
    const done = items.filter(i => store.done[i.id]).length;
    $('#mine-count').textContent = items.length ? `${items.length} bookmarked · ${done} done` : '';
    $('#mine-list').innerHTML = items.length ? items.map(rowHTML).join('')
      : `<div class="empty"><h3>No bookmarks yet.</h3><p>Tap the star on any guide in the library and it will show up here.</p></div>`;
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
        <a class="btn small" href="${QUESTIONS_CHANNEL}" target="_blank" rel="noopener" data-copy-request="${r.id}">Post in the community ${ICON.ext}</a>
        <a class="btn small ghost" href="${mailto(r)}">Email the team</a>
        <button class="btn small ghost" type="button" data-remove-request="${r.id}">Remove</button>
      </div></li>`).join('');
  }
  const requestText = r => `Quick guide request\nTopic: ${TOPIC_BY_KEY[r.topic]?.label || 'Something else'}\nGuide: ${r.title}${r.why ? '\nWhy: ' + r.why : ''}${r.name ? '\nFrom: ' + r.name : ''}`;
  const mailto = r => `mailto:${TEAM_EMAIL}?subject=${encodeURIComponent('Quick guide request: ' + r.title)}&body=${encodeURIComponent(requestText(r))}`;

  /* ---------- drawer ---------- */
  function openGuide(id, push) {
    const it = byId[id]; if (!it) return;
    state.open = id;
    const t = TOPIC_BY_KEY[it.topic] || {};
    const marked = !!store.bookmarks[id], done = !!store.done[id];
    const checked = store.checked[id] || {};
    const drive = (it.drive && it.drive[0]) || null;
    const nFiles = (it.pdfs || []).length + (it.drive || []).length;
    $('#drawer-eyebrow').innerHTML = `<span class="dot ${it.type}"></span>${TYPE_LABEL[it.type]} · ${esc(t.label || '')}`;
    $('#drawer-body').innerHTML = `
      <h2 id="drawer-title" tabindex="-1">${esc(it.title)}</h2>
      <p class="series">${it.series !== t.label ? esc(it.series) + ' · ' : ''}<a href="${esc(it.spaceUrl)}" target="_blank" rel="noopener">${esc(it.space)}</a></p>
      <p class="summary">${esc(it.summary)}</p>
      <div class="cta-row">
        ${it.download ? `<a class="btn primary" href="${esc(it.download)}" target="_blank" rel="noopener">${ICON.pdf} ${it.pdfs && it.pdfs.length ? 'Download PDF' : 'Open PDF'}</a>` : ''}
        <a class="btn" href="${esc(it.url)}" target="_blank" rel="noopener">Open in community ${ICON.ext}</a>
        <button class="btn ghost" type="button" data-star="${id}" aria-pressed="${marked}">${marked ? '★ Bookmarked' : '☆ Bookmark'}</button>
        <button class="btn ghost done-btn" type="button" data-done="${id}" aria-pressed="${done}">${done ? '✓ Done' : 'Mark done'}</button>
      </div>
      ${nFiles ? `
      <div class="section">
        <div class="section-title"><h3>Files</h3></div>
        <ul class="files">
          ${(it.pdfs || []).map(f => `<li><a href="${esc(f.href)}" target="_blank" rel="noopener"><span class="ftype">PDF</span><span class="fname">${esc(f.name)}</span></a></li>`).join('')}
          ${(it.drive || []).map(d => `<li><a href="${esc(d.viewUrl)}" target="_blank" rel="noopener"><span class="ftype">Drive</span><span class="fname">${esc(d.title || 'Open in Google Drive')}</span></a></li>`).join('')}
        </ul>
        ${drive && drive.previewUrl ? `<div class="preview"><iframe src="${esc(drive.previewUrl)}" title="${esc(drive.title || 'Guide preview')}" loading="lazy" allow="fullscreen"></iframe></div>` : ''}
      </div>` : ''}
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
      </div>`;
    const drawer = $('#drawer'), scrim = $('#scrim');
    drawer.hidden = false; scrim.hidden = false;
    requestAnimationFrame(() => { drawer.classList.add('open'); scrim.classList.add('open'); });
    $('#drawer-body').scrollTop = 0;
    const idx = state.listIds.indexOf(id);
    $('[data-action="prev"]').disabled = idx <= 0;
    $('[data-action="next"]').disabled = idx < 0 || idx >= state.listIds.length - 1;
    if (push !== false) history.replaceState(null, '', '#guide/' + id);
    setTimeout(() => $('#drawer-title')?.focus(), 50);
  }
  function closeDrawer() {
    const drawer = $('#drawer'), scrim = $('#scrim');
    drawer.classList.remove('open'); scrim.classList.remove('open');
    setTimeout(() => { drawer.hidden = true; scrim.hidden = true; }, 260);
    state.open = null;
    history.replaceState(null, '', location.pathname + location.search);
    refresh();
  }

  /* ---------- actions ---------- */
  function toggleStar(id) {
    store.bookmarks[id] = !store.bookmarks[id]; if (!store.bookmarks[id]) delete store.bookmarks[id];
    save(); toast(store.bookmarks[id] ? 'Bookmarked' : 'Bookmark removed');
    refresh(); if (state.open === id) openGuide(id, false);
  }
  function toggleDone(id) {
    store.done[id] = !store.done[id]; if (!store.done[id]) delete store.done[id];
    save(); toast(store.done[id] ? 'Marked done' : 'Marked not done');
    refresh(); if (state.open === id) openGuide(id, false);
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
    const lines = ['Lesko Help · My guides', ''];
    Object.keys(store.bookmarks).filter(id => byId[id]).forEach(id => {
      const it = byId[id];
      lines.push(`${store.done[id] ? '[x]' : '[ ]'} ${it.title}`); lines.push(`    ${it.url}`);
      const ch = store.checked[id] || {};
      (it.links || []).forEach(l => { if (ch[l.href]) lines.push(`    ✓ contacted: ${l.label} — ${l.href}`); });
      if (store.notes[id]) lines.push('    notes: ' + store.notes[id].replace(/\n/g, '\n           '));
      lines.push('');
    });
    copy(lines.join('\n')).then(ok => toast(ok ? 'Copied to clipboard' : 'Could not copy'));
  }
  function setTab(tab) {
    state.tab = tab;
    $$('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    ['library', 'mine', 'request'].forEach(k => { $('#view-' + k).hidden = k !== tab; });
    if (tab === 'mine') renderMine();
    if (tab === 'request') renderRequestForm();
  }
  function refresh() { renderTopics(); renderList(); renderMine(); }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (a) {
      const act = a.dataset.action;
      if (act === 'home') { e.preventDefault(); setTab('library'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      if (act === 'close') closeDrawer();
      if (act === 'prev' || act === 'next') { const idx = state.listIds.indexOf(state.open); const nid = state.listIds[idx + (act === 'next' ? 1 : -1)]; if (nid) openGuide(nid); }
      if (act === 'print') window.print();
      if (act === 'export') exportNotes();
      if (act === 'reset' && confirm('Clear all bookmarks, notes, check-marks and saved requests on this device?')) {
        ['bookmarks', 'done', 'notes', 'checked'].forEach(k => store[k] = {}); store.requests = []; save(); refresh(); renderRequestForm(); toast('Cleared');
      }
      if (act === 'go-request') { e.preventDefault(); setTab('request'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      return;
    }
    const tab = e.target.closest('.tab'); if (tab) { setTab(tab.dataset.tab); return; }
    const tp = e.target.closest('[data-topic]'); if (tp) { state.topic = state.topic === tp.dataset.topic ? null : tp.dataset.topic; refresh(); return; }
    const st = e.target.closest('[data-star]'); if (st) { e.stopPropagation(); toggleStar(st.dataset.star); return; }
    const dn = e.target.closest('[data-done]'); if (dn) { e.stopPropagation(); toggleDone(dn.dataset.done); return; }
    const inf = e.target.closest('[data-info]'); if (inf) { const id = inf.dataset.info; state.info.has(id) ? state.info.delete(id) : state.info.add(id); renderList(); renderMine(); return; }
    const ck = e.target.closest('[data-check]'); if (ck) { toggleCheck(state.open, ck.dataset.check, ck); return; }
    const op = e.target.closest('[data-open]'); if (op) { openGuide(op.dataset.open); return; }
    const rm = e.target.closest('[data-remove-request]'); if (rm) { store.requests = store.requests.filter(r => r.id !== rm.dataset.removeRequest); save(); renderRequestForm(); toast('Request removed'); return; }
    const cp = e.target.closest('[data-copy-request]'); if (cp) { const r = store.requests.find(x => x.id === cp.dataset.copyRequest); if (r) copy(requestText(r)).then(ok => toast(ok ? 'Request copied — paste it in the channel' : 'Opening the Questions Channel')); return; }
    if (e.target.id === 'scrim') closeDrawer();
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'topic-select') { state.topic = e.target.value || null; refresh(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.open) closeDrawer();
    if (e.key === '/' && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'q') { state.q = e.target.value; $('#q-clear').hidden = !state.q; renderList(); }
    if (e.target.id === 'notes') saveNote(state.open, e.target.value);
  });
  $('#q-clear').addEventListener('click', () => { $('#q').value = ''; state.q = ''; $('#q-clear').hidden = true; renderList(); $('#q').focus(); });
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
