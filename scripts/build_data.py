#!/usr/bin/env python3
"""Build the guide catalogue and one self-contained app per library.

  python3 scripts/build_data.py

Reads data/source/ (community export, Drive listings), libraries/*.json (one settings
file per library) and writes:
  data/guides.json            full catalogue of every space (all libraries, incl. drafts)
  data/guides.js              the Business library data for the root app (index.html)
  dist/<library>/index.html   a self-contained app per library, for Netlify
"""
import json, re, glob, os, datetime, html, base64

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data', 'source')
LIB = os.path.join(ROOT, 'libraries')

# Topic taxonomy for the whole community: key, label. Sections map into these.
TOPICS = [
    ('business', 'Business'), ('nonprofit', 'Nonprofit'), ('career', 'Career'),
    ('grants', 'Grant Basics'), ('housing', 'Home & Housing'), ('bills', 'Bills & Debt'),
    ('cars', 'Cars & Car Repairs'), ('health', 'Healthcare'), ('taxes', 'Taxes'),
    ('legal', 'Legal Help'), ('families', 'Families & Children'), ('seniors', 'Seniors & Disabilities'),
    ('veterans', 'Veterans'),
]
TOPIC_ORDER = {k: i for i, (k, _) in enumerate(TOPICS)}

def topic_for(space_id, section):
    s = section.lower()
    if space_id == '18083958':
        if 'nonprofit' in s: return 'nonprofit'
        if 'career' in s: return 'career'
        return 'business'
    if space_id == '16590945': return 'grants'
    if space_id == '17886022': return 'housing'
    if space_id == '18392931':
        if 'home' in s: return 'housing'
        if 'car' in s: return 'cars'
        return 'bills'
    if space_id == '18453836': return 'health'
    if space_id == '20982255': return 'taxes' if 'tax' in s else 'legal'
    if space_id == '20982263': return 'seniors' if 'senior' in s else 'families'
    if space_id == '21731257': return 'cars'
    if space_id == '22214038': return 'veterans'
    return 'grants'

def clean_title(t):
    t = html.unescape(t or '')
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

CODE_RE = re.compile(r'Lesko_Help_(?:(HC|TL|CB|FC)_?)?([A-Z]?\d{1,2})_', re.I)
def norm_code(prefix, num):
    prefix = (prefix or 'QG').upper(); num = num.upper()
    if num.isdigit(): num = num.zfill(2)
    return f"{prefix} {num}"
def code_from(item):
    for f in item.get('pdfs', []) + item.get('drive', []):
        m = CODE_RE.search(f.get('name') or f.get('title') or '')
        if m: return norm_code(m.group(1), m.group(2))
    return None

def hex_to_rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def mix(h, white=0.88):
    r, g, b = hex_to_rgb(h)
    return '#%02X%02X%02X' % tuple(round(c + (255 - c) * white) for c in (r, g, b))
def lighten(h, amt=0.12):
    r, g, b = hex_to_rgb(h)
    return '#%02X%02X%02X' % tuple(round(c + (255 - c) * amt) for c in (r, g, b))

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

def build_catalogue():
    manifest = load_json(os.path.join(SRC, 'manifest.json'))
    videos = load_json(os.path.join(SRC, 'videos.json')) if os.path.exists(os.path.join(SRC, 'videos.json')) else {}
    posts = {}
    for f in sorted(glob.glob(os.path.join(SRC, 'posts_*.json'))):
        for p in load_json(f):
            if 'id' in p and 'error' not in p: posts[str(p['id'])] = p
    items = []
    for sp in manifest['spaces']:
        for si, sec in enumerate(sp['sections']):
            for li, (lid, ltitle, status) in enumerate(sec['lessons']):
                p = posts.get(str(lid), {})
                title = clean_title(p.get('displayTitle') or p.get('title') or ltitle)
                topic = topic_for(sp['spaceId'], sec['section'])
                code = code_from(p)
                if sp['spaceId'] == '18083958' and sec['section'] == 'Start a Business' and status == 'POSTED' and not code:
                    code = f"CB A{li + 1:02d}"
                pdfs = [{'name': html.unescape(x['name']), 'href': x['href']} for x in p.get('pdfs', []) if 'mightynetworks' in x['href']]
                drv = [{'title': html.unescape(x.get('title') or ''), 'viewUrl': x.get('viewUrl'), 'previewUrl': x.get('previewUrl')} for x in p.get('drive', []) if x.get('viewUrl') or x.get('previewUrl')]
                links, seen = [], set()
                for l in p.get('links', []):
                    h = l.get('href')
                    if not h or h in seen or re.search(r'(mightynetworks\.com|mn\.co|drive\.google\.com)', h): continue
                    seen.add(h); links.append({'label': clean_title(l.get('label')) or h, 'href': h})
                items.append({
                    'id': str(lid), 'code': code, 'title': title, 'kind': p.get('kind') or ('quick_guide' if pdfs else 'lesson'),
                    'status': status, 'topic': topic, 'topicOrder': TOPIC_ORDER[topic],
                    'series': sec['section'], 'seriesOrder': si, 'order': li,
                    'space': sp['space'], 'spaceId': sp['spaceId'], 'spaceUrl': sp['url'], 'collection': sp['collection'],
                    'url': p.get('url') or f"https://lesko-help-2.mn.co/posts/{lid}",
                    'summary': (p.get('summary') or '').strip() or ('Draft lesson, not yet published in the community.' if status == 'HIDDEN' else ''),
                    'pdfs': pdfs, 'drive': drv, 'links': links,
                    'video': (f"https://www.youtube.com/embed/{videos[str(lid)]['youtube']}" if str(lid) in videos and videos[str(lid)].get('youtube') else None),
                })
    return items

def library_data(lib, items):
    """Select and enrich the items of one library; attach its Drive PDFs."""
    drive = {d['code']: d for d in load_json(os.path.join(SRC, lib['driveListing']))} if lib.get('driveListing') else {}
    keys = [t['key'] for t in lib['topics']]
    out = []
    for i in items:
        if i['status'] != 'POSTED': continue
        if lib.get('spaces') and str(i['spaceId']) not in [str(x) for x in lib['spaces']]: continue
        it = dict(i)
        it['topic'] = lib.get('topicOverrides', {}).get(it['id'], it['topic'])
        if it['topic'] not in keys: continue
        it['title'] = lib.get('titleOverrides', {}).get(it['id'], it['title'])
        it['summary'] = lib.get('summaryOverrides', {}).get(it['id'], it['summary'])
        it['topicOrder'] = keys.index(it['topic'])
        fid = lib.get('driveFiles', {}).get(it['id'])
        if not fid and it['code']:
            d = drive.get(it['code'].replace(' ', '_'))
            fid = d['id'] if d else None
        if fid:
            it['download'] = f"https://drive.google.com/uc?export=download&id={fid}"
            it['preview'] = f"https://drive.google.com/file/d/{fid}/preview"
        elif it['pdfs']:
            it['download'] = it['pdfs'][0]['href']; it['preview'] = it['pdfs'][0]['href']
        elif it['drive'] and it['drive'][0].get('viewUrl'):
            it['download'] = it['drive'][0]['viewUrl']; it['preview'] = it['drive'][0].get('previewUrl')
        else:
            it['download'] = None; it['preview'] = None
        it['isLesson'] = it['id'] in lib.get('lessons', {})
        it['lessonNo'] = lib.get('lessons', {}).get(it['id'])
        out.append(it)
    # Guides that exist only in the Drive folder (no community post yet)
    for x in lib.get('extraItems', []):
        d = drive.get(x['code'].replace(' ', '_'))
        fid = d['id'] if d else None
        out.append({
            'id': 'x' + x['code'].replace(' ', '').lower(), 'code': x['code'], 'title': x['title'], 'kind': 'quick_guide',
            'status': 'POSTED', 'topic': x['topic'], 'topicOrder': keys.index(x['topic']),
            'series': '', 'seriesOrder': 99, 'order': 99, 'space': lib['title'], 'spaceId': lib['spaceId'],
            'spaceUrl': f"https://lesko-help-2.mn.co/spaces/{lib['spaceId']}", 'collection': '',
            'url': f"https://drive.google.com/file/d/{fid}/view" if fid else '', 'summary': x.get('summary', ''),
            'pdfs': [], 'drive': [], 'links': [], 'video': None,
            'download': f"https://drive.google.com/uc?export=download&id={fid}" if fid else None,
            'preview': f"https://drive.google.com/file/d/{fid}/preview" if fid else None,
            'isLesson': False, 'lessonNo': None,
        })
    topics = [{'key': t['key'], 'label': t['label'], 'color': t['color'], 'tint': mix(t['color']),
               'grad': f"linear-gradient(135deg, {t['color']} 0%, {lighten(t['color'])} 100%)", 'icon': t['icon']} for t in lib['topics']]
    return {
        'generated': datetime.date.today().isoformat(),
        'library': {'key': lib['key'], 'title': lib['title'], 'spaceId': lib['spaceId']},
        'topics': topics, 'items': out,
    }

SECTION_ORDER = ['financial', 'business', 'jobs', 'health', 'mentoring', 'housing']
NOTE_CAP = 190

def trim(text, cap):
    t = ' '.join((text or '').split())
    if len(t) <= cap: return t
    cut = t[:cap]
    dot = max(cut.rfind('. '), cut.rfind('? '), cut.rfind('! '))
    return (cut[:dot + 1] if dot > cap * 0.5 else cut.rstrip() + '\u2026')

def state_summary(name, n, total, live):
    """One honest line per state: how much is in there, and what is missing."""
    if not n:
        return f"Six reports for {name}: money help, business, jobs, health, free local mentoring and housing."
    base = f"{n} places to call and apply in {name}, across money help, business, jobs, health, free local mentoring and housing."
    missing = total - live
    if missing:
        base += f" {missing} of the {total} reports could not be opened."
    return base

def state_library_data(lib):
    """One row per state; the viewer shows that state's links instead of a PDF."""
    reports = load_json(os.path.join(SRC, lib['stateReports']))
    keys = [t['key'] for t in lib['topics']]
    labels = lib['sectionLabels']
    out = []
    for name, meta in lib['states'].items():
        rec = reports.get(name, {})
        secs = []
        for key in SECTION_ORDER:
            s = rec.get(key)
            if not s: continue
            entries = []
            for e in s.get('entries', []):
                title = ' '.join((e.get('title') or '').split())
                if not title: continue
                entries.append({'title': trim(title, 130), 'note': trim(e.get('note', ''), NOTE_CAP),
                                'links': [{'href': l['href'], 'label': l.get('label') or ''} for l in e.get('links', []) if l.get('href')]})
            secs.append({'key': key, 'label': labels.get(key, key.title()), 'note': trim(s.get('note', ''), 160),
                         'intro': trim(s.get('intro', ''), 260), 'source': s.get('url') or '',
                         'accessible': bool(s.get('accessible', True)), 'entries': entries})
        n = sum(len(x['entries']) for x in secs)
        live = [x for x in secs if x['accessible']]
        out.append({
            'id': 'us-' + meta['abbr'].lower(), 'code': meta['abbr'], 'title': name, 'kind': 'state', 'status': 'POSTED',
            'topic': meta['region'], 'topicOrder': keys.index(meta['region']),
            'series': f"{meta['abbr']} {name}", 'seriesOrder': 0, 'order': 0,
            'space': lib['title'], 'spaceId': '', 'spaceUrl': '', 'collection': '',
            'url': lib.get('source', ''),
            'summary': state_summary(name, n, len(secs), len(live)),
            'pdfs': [], 'drive': [], 'links': [], 'video': None, 'download': None, 'preview': None,
            'isLesson': False, 'lessonNo': None, 'sections': secs, 'entryCount': n, 'reportCount': len(live),
        })
    out.sort(key=lambda i: (i['topicOrder'], i['title']))
    topics = [{'key': t['key'], 'label': t['label'], 'color': t['color'], 'tint': mix(t['color']),
               'grad': f"linear-gradient(135deg, {t['color']} 0%, {lighten(t['color'])} 100%)", 'icon': t['icon']} for t in lib['topics']]
    return {'generated': datetime.date.today().isoformat(),
            'library': {'key': lib['key'], 'title': lib['title'], 'spaceId': ''},
            'topics': topics, 'items': out}

def read(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()

MARK_SVG = {
    'map-pin': '<path d="M20 10.2c0 5.8-8 11.8-8 11.8s-8-6-8-11.8a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
}

def brand_mark_html(lib):
    """The library's own icon, inlined as a data URI, for the white square in the top bar."""
    if lib.get('markSvg') in MARK_SVG:
        return ('<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + MARK_SVG[lib['markSvg']] + '</svg></span>')
    name = lib.get('mark')
    if not name:
        return None
    path = os.path.join(ROOT, 'brand', name)
    if not os.path.exists(path):
        return None
    b64 = base64.b64encode(open(path, 'rb').read()).decode('ascii')
    return f'<span class="brand-mark has-img" aria-hidden="true"><img src="data:image/png;base64,{b64}" alt=""></span>'

def single_file(data_js, title, mark=None, placeholder=None):
    """Inline styles, font, data and script into one HTML page."""
    css = read('assets/styles.css')
    font_path = os.path.join(ROOT, 'assets', 'fonts', 'inter-var.woff2')
    if os.path.exists(font_path):
        b64 = base64.b64encode(open(font_path, 'rb').read()).decode('ascii')
        css = css.replace('url("fonts/inter-var.woff2")', f'url("data:font/woff2;base64,{b64}")')
    page = read('index.html')
    if placeholder:
        page = page.replace('placeholder="Search quick guides, lessons and organizations"',
                            'placeholder="%s"' % html.escape(placeholder, quote=True))
    if mark:
        page = re.sub(r'<span class="brand-mark[^"]*"[^>]*>.*?</span>', lambda m: mark, page, count=1, flags=re.S)
    page = page.replace('<title>Lesko Help Quick Guide Library</title>', f'<title>{html.escape(title)}</title>')
    page = page.replace('<link rel="stylesheet" href="assets/styles.css">', '<style>\n' + css + '\n</style>')
    page = page.replace('<script src="data/guides.js"></script>', '<script>\n' + data_js + '\n</script>')
    page = page.replace('<script src="assets/app.js"></script>', '<script>\n' + read('assets/app.js') + '\n</script>')
    return page

def main():
    items = build_catalogue()
    with open(os.path.join(ROOT, 'data', 'guides.json'), 'w', encoding='utf-8') as f:
        json.dump({'generated': datetime.date.today().isoformat(), 'topics': [{'key': k, 'label': l} for k, l in TOPICS], 'items': items}, f, ensure_ascii=False, indent=1)
    for path in sorted(glob.glob(os.path.join(LIB, '*.json'))):
        lib = load_json(path)
        data = state_library_data(lib) if lib.get('stateReports') else library_data(lib, items)
        data_js = '/* Generated by scripts/build_data.py */\nwindow.LESKO_GUIDES = ' + json.dumps(data, ensure_ascii=False) + ';\n'
        if lib['key'] == 'business':
            open(os.path.join(ROOT, 'data', 'guides.js'), 'w', encoding='utf-8').write(data_js)
        out_dir = os.path.join(ROOT, 'dist', lib['key']); os.makedirs(out_dir, exist_ok=True)
        open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(single_file(data_js, 'Lesko Help ' + lib['title'], brand_mark_html(lib), lib.get('searchPlaceholder')))
        extra = (f", {sum(i.get('entryCount', 0) for i in data['items'])} links" if lib.get('stateReports') else '')
        print(f"{lib['key']:10} {len(data['items']):3} items, {sum(1 for i in data['items'] if i['download'])} with PDFs, {sum(1 for i in data['items'] if i['isLesson'])} lessons{extra} -> dist/{lib['key']}/index.html")

if __name__ == '__main__':
    main()
