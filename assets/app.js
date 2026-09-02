/* Lesko Help · Quick Guide Library — app logic.
   Data comes from data/guides.js (window.LESKO_GUIDES). All member state
   (bookmarks, done, notes, ticked links, requests) lives in localStorage. */
(function () {
  'use strict';

  const DATA = window.LESKO_GUIDES || { topics: [], items: [], generated: '' };
  const TOPICS = DATA.topics;
  const ITEMS = DATA.items;
  const TOPIC_BY_KEY = Object.fromEntries(TOPICS.map(t => [t.key, t]));
  const ZONES = [
    { key: 'business', label: 'Business Hub', topics: ['business', 'nonprofit', 'career'] },
    { key: 'all', label: 'Everything', topics: TOPICS.map(t => t.key) }
  ];
  const QUESTIONS_CHANNEL = 'https://lesko-help-2.mn.co/spaces/11054387';
  const TEAM_EMAIL = 'support@leskohelp.com';
  const STORE_KEY = 'lesko-quick-guides-v1';

  /* ---------- storage ---------- */
  const store = load();
  function load() {
    const base = { bookmarks: {}, done: {}, notes: {}, checked: {}, requests: [], ui: {} };
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? Object.assign(base, JSON.parse(raw)) : base;
    } catch (e) { return base; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* private mode */ }
  }

  /* ---------- state ---------- */
  const state = {
    tab: 'library',
    zone: store.ui.zone || 'business',
    topics: new Set(store.ui.topics || []),
    kind: store.ui.kind || 'all',
    sort: store.ui.sort || 'az',
    q: '',
    open: null,          // id of guide in drawer
    listIds: []          // ids currently listed (for prev/next)
  };

  /* ---------- helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  const isGuideKind = k => k === 'quick_guide' || k === 'checklist' || k === 'directory';
  const KIND_LABEL = { quick_guide: 'Quick guide', checklist: 'Checklist', directory: 'Directory', lesson: 'Lesson' };
  const host = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const fmtDate = iso => { try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return iso; } };

  const ICON = {
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/></svg>',
    starOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v6M9.5 15.5 12 18l2.5-2.5"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9L19 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 18.5z"/><path d="M8 12h8M8 15.5h5"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>'
  };

  /* ---------- filtering ---------- */
  function visibleTopicKeys() {
    const zone = ZONES.find(z => z.key === state.zone) || ZONES[1];
    return zone.topics;
  }
  function filtered() {
    const zoneTopics = new Set(visibleTopicKeys());
    const active = [...state.topics].filter(t => zoneTopics.has(t));
    const q = state.q.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    let out = ITEMS.filter(it => {
      if (!zoneTopics.has(it.topic)) return false;
      if (active.length && !active.includes(it.topic)) return false;
      if (state.kind === 'guide' && !isGuideKind(it.kind)) return false;
      if (state.kind === 'lesson' && it.kind !== 'lesson') return false;
      if (terms.length) {
        const hay = it._hay || (it._hay = [it.title, it.code, it.summary, it.series, TOPIC_BY_KEY[it.topic]?.label, it.space,
          ...(it.links || []).map(l => l.label + ' ' + host(l.href))].join(' ').toLowerCase());
        if (!terms.every(t => hay.includes(t))) return false;
      }
      return true;
    });
    if (state.sort === 'az') out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    else out.sort((a, b) => (a.topicOrder - b.topicOrder) || (a.seriesOrder - b.seriesOrder) || (a.order - b.order));
    return out;
  }

  /* ---------- render: filters ---------- */
  function renderZones() {
    $('#zones').innerHTML = ZONES.map(z => `<button type="button" class="chip zone" data-zone="${z.key}" aria-pressed="${state.zone === z.key}">${z.label}</button>`).join('');
  }
  function renderTopics() {
    const keys = visibleTopicKeys();
    const counts = {};
    ITEMS.forEach(i => { counts[i.topic] = (counts[i.topic] || 0) + 1; });
    $('#topics').innerHTML = keys.map(k => {
      const t = TOPIC_BY_KEY[k]; if (!t) return '';
      return `<button type="button" class="chip" data-topic="${k}" style="--dot:${t.color}" aria-pressed="${state.topics.has(k)}"><span class="dot"></span>${esc(t.label)} <span class="n">${counts[k] || 0}</span></button>`;
    }).join('');
  }
  function renderSegs() {
    $$('#kinds button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === state.kind)));
    $$('#sort button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sort === state.sort)));
  }

  /* ---------- render: list ---------- */
  function rowHTML(it) {
    const t = TOPIC_BY_KEY[it.topic] || {};
    const done = !!store.done[it.id];
    const marked = !!store.bookmarks[it.id];
    const hasNote = !!(store.notes[it.id] && store.notes[it.id].trim());
    const pdf = it.download ? { href: it.download } : null;
    return `<article class="row${done ? ' is-done' : ''}" data-id="${it.id}">
      <span class="code${it.code ? '' : ' is-empty'}" title="${it.code ? 'Guide code' : 'No code yet'}">${esc(it.code || '—')}</span>
      <div>
        <button class="title-btn" type="button" data-open="${it.id}"><span class="title">${esc(it.title)}</span></button>
        <div class="meta">
          <span class="topic" style="--dot:${t.color}"><span class="dot"></span>${esc(t.label || '')}</span>
          ${it.series !== t.label ? `<span>·</span><span>${esc(it.series)}</span>` : ''}
          <span class="kind ${it.kind}">${KIND_LABEL[it.kind] || it.kind}</span>
          ${it.status === 'HIDDEN' ? '<span class="kind">Draft</span>' : ''}
        </div>
        <p class="summary">${esc(it.summary)}</p>
      </div>
      <div class="actions">
        ${hasNote ? `<span class="icon-btn has-note" title="Has notes">${ICON.note}</span>` : ''}
        ${pdf ? `<a class="icon-btn pdf" href="${esc(pdf.href)}" target="_blank" rel="noopener" title="Download PDF" aria-label="Download PDF">${ICON.pdf}</a>` : ''}
        <button class="icon-btn star" type="button" data-star="${it.id}" aria-pressed="${marked}" title="${marked ? 'Remove bookmark' : 'Bookmark'}" aria-label="Bookmark">${marked ? ICON.star : ICON.starOutline}</button>
        <button class="icon-btn done" type="button" data-done="${it.id}" aria-pressed="${done}" title="${done ? 'Mark as not done' : 'Mark done'}" aria-label="Mark done">${ICON.check}</button>
      </div>
    </article>`;
  }
  function renderList() {
    const items = filtered();
    state.listIds = items.map(i => i.id);
    const n = items.length;
    $('#result-count').textContent = n === 1 ? '1 guide' : `${n} guides`;
    const el = $('#list');
    if (!n) {
      el.innerHTML = `<div class="empty"><h3>Nothing matches yet.</h3><p>Try fewer words, switch the zone to “Everything”, or <a href="#" data-action="go-request">ask for a new guide</a>.</p></div>`;
      return;
    }
    if (state.sort === 'series') {
      let html = '', last = '';
      items.forEach(it => {
        const key = it.topic + '|' + it.series;
        if (key !== last) {
          const t = TOPIC_BY_KEY[it.topic] || {};
          html += `<div class="group-head">${esc(it.series)} <span class="tag">${esc(t.label || '')}</span></div>`;
          last = key;
        }
        html += rowHTML(it);
      });
      el.innerHTML = html;
    } else {
      el.innerHTML = items.map(rowHTML).join('');
    }
  }

  /* ---------- render: my guides ---------- */
  function renderMine() {
    const ids = Object.keys(store.bookmarks).filter(id => store.bookmarks[id] && byId[id]);
    const items = ids.map(id => byId[id]).sort((a, b) => (a.topicOrder - b.topicOrder) || a.title.localeCompare(b.title));
    const doneCount = items.filter(i => store.done[i.id]).length;
    const noteCount = Object.keys(store.notes).filter(id => store.notes[id] && store.notes[id].trim() && byId[id]).length;
    const contacted = Object.values(store.checked).reduce((n, m) => n + Object.values(m || {}).filter(Boolean).length, 0);
    const badge = $('#mine-badge');
    badge.textContent = ids.length; badge.hidden = ids.length === 0;
    $('#mine-count').textContent = ids.length === 1 ? '1 bookmarked' : `${ids.length} bookmarked`;
    const pct = items.length ? Math.round(doneCount / items.length * 100) : 0;
    $('#progress').innerHTML = `
      <div class="stat"><div class="k">Bookmarked</div><div class="v">${ids.length}</div></div>
      <div class="stat"><div class="k">Worked through</div><div class="v">${doneCount}<small> / ${items.length}</small></div><div class="bar"><i style="width:${pct}%"></i></div></div>
      <div class="stat"><div class="k">Organizations ticked</div><div class="v">${contacted}</div></div>
      <div class="stat"><div class="k">Guides with notes</div><div class="v">${noteCount}</div></div>`;
    const el = $('#mine-list');
    if (!items.length) {
      el.innerHTML = `<div class="empty"><h3>No bookmarks yet.</h3><p>Tap the star on any guide in the library and it will show up here.</p></div>`;
      return;
    }
    let html = '', last = '';
    items.forEach(it => {
      if (it.topic !== last) { html += `<div class="group-head">${esc(TOPIC_BY_KEY[it.topic]?.label || '')}</div>`; last = it.topic; }
      html += rowHTML(it);
    });
    el.innerHTML = html;
  }

  /* ---------- render: requests ---------- */
  function renderRequestForm() {
    const sel = $('#rq-topic');
    if (!sel.options.length) {
      sel.innerHTML = TOPICS.map(t => `<option value="${t.key}">${esc(t.label)}</option>`).join('') + '<option value="other">Something else</option>';
    }
    const list = $('#requests');
    const reqs = store.requests.slice().reverse();
    $('#rq-count').textContent = reqs.length ? `${reqs.length} saved` : '';
    if (!reqs.length) { list.innerHTML = `<li><span class="rq-meta">Nothing saved yet</span><span>Your saved requests will appear here.</span></li>`; return; }
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
  function requestText(r) {
    return `Quick guide request\nTopic: ${TOPIC_BY_KEY[r.topic]?.label || 'Something else'}\nGuide: ${r.title}${r.why ? '\nWhy: ' + r.why : ''}${r.name ? '\nFrom: ' + r.name : ''}`;
  }
  function mailto(r) {
    return `mailto:${TEAM_EMAIL}?subject=${encodeURIComponent('Quick guide request: ' + r.title)}&body=${encodeURIComponent(requestText(r))}`;
  }

  /* ---------- drawer ---------- */
  function openGuide(id, push) {
    const it = byId[id]; if (!it) return;
    state.open = id;
    const t = TOPIC_BY_KEY[it.topic] || {};
    const marked = !!store.bookmarks[id], done = !!store.done[id];
    const checked = store.checked[id] || {};
    const pdf = it.download ? { href: it.download } : null;
    const drive = (it.drive && it.drive[0]) || null;
    $('#drawer-eyebrow').innerHTML = `<span class="dot" style="--dot:${t.color}"></span>${esc(t.label || '')}${it.code ? ' · ' + esc(it.code) : ''}`;
    $('#drawer-body').innerHTML = `
      <h2 id="drawer-title">${esc(it.title)}</h2>
      <p class="series">${KIND_LABEL[it.kind] || ''} · ${esc(it.series)} · <a href="${esc(it.spaceUrl)}" target="_blank" rel="noopener">${esc(it.space)}</a>${it.status === 'HIDDEN' ? ' · <b>Draft, not yet published</b>' : ''}</p>
      <p class="summary">${esc(it.summary)}</p>
      <div class="cta-row">
        ${pdf ? `<a class="btn primary" href="${esc(pdf.href)}" target="_blank" rel="noopener">${ICON.pdf} ${it.pdfs && it.pdfs.length ? 'Download PDF' : 'Open PDF in Drive'}</a>` : ''}
        <a class="btn" href="${esc(it.url)}" target="_blank" rel="noopener">Open in community ${ICON.ext}</a>
        <button class="btn ghost star-btn" type="button" data-star="${id}" aria-pressed="${marked}">${marked ? '★ Bookmarked' : '☆ Bookmark'}</button>
        <button class="btn ghost done-btn" type="button" data-done="${id}" aria-pressed="${done}">${done ? '✓ Done' : 'Mark done'}</button>
      </div>
      ${(it.pdfs && it.pdfs.length) || (it.drive && it.drive.length) ? `
      <div class="section">
        <div class="section-title"><h3>Files</h3><span class="hint">${(it.pdfs || []).length + (it.drive || []).length} file${((it.pdfs || []).length + (it.drive || []).length) === 1 ? '' : 's'}</span></div>
        <ul class="files">
          ${(it.pdfs || []).map(f => `<li><a href="${esc(f.href)}" target="_blank" rel="noopener"><span class="ftype">PDF</span><span class="fname">${esc(f.name)}</span></a></li>`).join('')}
          ${(it.drive || []).map(d => `<li><a href="${esc(d.viewUrl)}" target="_blank" rel="noopener"><span class="ftype">Drive</span><span class="fname">${esc(d.title || 'Preview in Google Drive')}</span></a></li>`).join('')}
        </ul>
        ${drive && drive.previewUrl ? `<div class="preview"><iframe src="${esc(drive.previewUrl)}" title="${esc(drive.title || 'Guide preview')}" loading="lazy" allow="fullscreen"></iframe></div><p class="help">If the preview stays blank, open the file in Drive or download the PDF above.</p>` : ''}
      </div>` : ''}
      <div class="section">
        <div class="section-title"><h3>Organizations &amp; links</h3><span class="hint">${(it.links || []).length ? 'Tick the ones you contacted' : ''}</span></div>
        ${(it.links || []).length ? `<ul class="links">${it.links.map((l, i) => `<li class="${checked[l.href] ? 'checked' : ''}">
            <button class="check" type="button" role="checkbox" aria-checked="${!!checked[l.href]}" data-check="${esc(l.href)}" aria-label="Contacted">${ICON.check}</button>
            <span><span class="label"><a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label || host(l.href))}</a></span><br><span class="host">${esc(host(l.href))}</span></span>
          </li>`).join('')}</ul>`
          : `<p class="help">The organizations for this guide are listed inside the PDF. Download it above, then keep track of who you contacted in your notes below.</p>`}
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
    setTimeout(() => $('#drawer h2')?.focus?.(), 50);
    $('#drawer h2').setAttribute('tabindex', '-1');
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
    store.bookmarks[id] = !store.bookmarks[id];
    if (!store.bookmarks[id]) delete store.bookmarks[id];
    save(); toast(store.bookmarks[id] ? 'Bookmarked' : 'Bookmark removed');
    refresh(); if (state.open === id) openGuide(id, false);
  }
  function toggleDone(id) {
    store.done[id] = !store.done[id];
    if (!store.done[id]) delete store.done[id];
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
    store.checked[id][href] = !store.checked[id][href];
    if (!store.checked[id][href]) delete store.checked[id][href];
    save();
    const on = !!store.checked[id][href];
    btn.setAttribute('aria-checked', String(on));
    btn.closest('li').classList.toggle('checked', on);
  }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, () => false);
    return Promise.resolve(false);
  }
  function exportNotes() {
    const ids = Object.keys(store.bookmarks).filter(id => byId[id]);
    const lines = ['Lesko Help · My guides', ''];
    ids.forEach(id => {
      const it = byId[id];
      lines.push(`${store.done[id] ? '[x]' : '[ ]'} ${it.title}${it.code ? ' (' + it.code + ')' : ''}`);
      lines.push(`    ${it.url}`);
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
  function persistUI() {
    store.ui = { zone: state.zone, topics: [...state.topics], kind: state.kind, sort: state.sort };
    save();
  }
  function refresh() {
    renderZones(); renderTopics(); renderSegs(); renderList(); renderMine();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (a) {
      const act = a.dataset.action;
      if (act === 'home') { e.preventDefault(); setTab('library'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      if (act === 'privacy') { e.preventDefault(); toast('Everything is stored only in this browser'); alert('Privacy\n\nThis library runs entirely in your browser. Bookmarks, notes, ticked organizations and saved requests are stored in this device\'s local storage and never sent anywhere. Clearing your browser data removes them.\n\nPDF downloads and community links open the Lesko Help community, which has its own privacy policy.'); }
      if (act === 'close') closeDrawer();
      if (act === 'prev' || act === 'next') {
        const idx = state.listIds.indexOf(state.open);
        const nid = state.listIds[idx + (act === 'next' ? 1 : -1)];
        if (nid) openGuide(nid);
      }
      if (act === 'print') window.print();
      if (act === 'export') exportNotes();
      if (act === 'reset') {
        if (confirm('Clear all bookmarks, notes, check-marks and saved requests on this device?')) {
          ['bookmarks', 'done', 'notes', 'checked'].forEach(k => store[k] = {}); store.requests = []; save(); refresh(); renderRequestForm(); toast('Cleared');
        }
      }
      if (act === 'go-request') { e.preventDefault(); setTab('request'); }
      return;
    }
    const tab = e.target.closest('.tab'); if (tab) { setTab(tab.dataset.tab); return; }
    const z = e.target.closest('[data-zone]'); if (z) { state.zone = z.dataset.zone; persistUI(); refresh(); return; }
    const tp = e.target.closest('[data-topic]'); if (tp) { const k = tp.dataset.topic; state.topics.has(k) ? state.topics.delete(k) : state.topics.add(k); persistUI(); refresh(); return; }
    const kd = e.target.closest('#kinds [data-kind]'); if (kd) { state.kind = kd.dataset.kind; persistUI(); refresh(); return; }
    const so = e.target.closest('#sort [data-sort]'); if (so) { state.sort = so.dataset.sort; persistUI(); refresh(); return; }
    const st = e.target.closest('[data-star]'); if (st) { e.stopPropagation(); toggleStar(st.dataset.star); return; }
    const dn = e.target.closest('[data-done]'); if (dn) { e.stopPropagation(); toggleDone(dn.dataset.done); return; }
    const ck = e.target.closest('[data-check]'); if (ck) { toggleCheck(state.open, ck.dataset.check, ck); return; }
    const op = e.target.closest('[data-open]'); if (op) { openGuide(op.dataset.open); return; }
    const rm = e.target.closest('[data-remove-request]'); if (rm) { store.requests = store.requests.filter(r => r.id !== rm.dataset.removeRequest); save(); renderRequestForm(); toast('Request removed'); return; }
    const cp = e.target.closest('[data-copy-request]'); if (cp) { const r = store.requests.find(x => x.id === cp.dataset.copyRequest); if (r) copy(requestText(r)).then(ok => toast(ok ? 'Request copied — paste it in the channel' : 'Opening the Questions Channel')); return; }
    const row = e.target.closest('.row'); if (row && !e.target.closest('a,button')) { openGuide(row.dataset.id); return; }
    if (e.target.id === 'scrim') closeDrawer();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.open) closeDrawer();
    if (e.key === '/' && document.activeElement && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'q') { state.q = e.target.value; $('#q-clear').hidden = !state.q; renderList(); }
    if (e.target.id === 'notes') saveNote(state.open, e.target.value);
  });
  $('#q-clear').addEventListener('click', () => { $('#q').value = ''; state.q = ''; $('#q-clear').hidden = true; renderList(); $('#q').focus(); });
  $('#request-form').addEventListener('submit', e => {
    e.preventDefault();
    const r = {
      id: 'r' + Date.now().toString(36),
      topic: $('#rq-topic').value, title: $('#rq-title').value.trim(), why: $('#rq-why').value.trim(), name: $('#rq-name').value.trim(),
      at: new Date().toISOString()
    };
    if (!r.title) return;
    store.requests.push(r); save();
    e.target.reset(); renderRequestForm(); toast('Request saved');
  });
  window.addEventListener('hashchange', route);
  function route() {
    const m = location.hash.match(/^#guide\/(\d+)$/);
    if (m && byId[m[1]]) { setTab('library'); if (!state.listIds.includes(m[1])) { state.zone = 'all'; state.topics.clear(); state.kind = 'all'; refresh(); } openGuide(m[1], false); }
  }

  /* ---------- boot ---------- */
  const guideCount = ITEMS.filter(i => isGuideKind(i.kind)).length;
  const lessonCount = ITEMS.filter(i => i.kind === 'lesson').length;
  const orgCount = new Set(ITEMS.flatMap(i => (i.links || []).map(l => host(l.href)))).size;
  $('#stats').innerHTML = `<span><b>${guideCount}</b> guides &amp; checklists</span><span><b>${lessonCount}</b> lessons</span><span><b>${TOPICS.length}</b> topics</span><span><b>${orgCount}</b> organizations linked</span>`;
  $('#data-date').textContent = DATA.generated ? 'inventory ' + fmtDate(DATA.generated) : '';
  refresh(); renderRequestForm(); route();
})();
