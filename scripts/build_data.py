#!/usr/bin/env python3
"""Build data/guides.js and data/guides.json from the raw community export in data/source/.

Usage:  python3 scripts/build_data.py
The raw files are the per-space post exports pulled from the Lesko Help community
(Mighty Networks) plus the Google Drive folder listing of PDFs.
"""
import json, re, glob, os, datetime, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data', 'source')
OUT_JS = os.path.join(ROOT, 'data', 'guides.js')
OUT_JSON = os.path.join(ROOT, 'data', 'guides.json')

# Topic taxonomy: key, label, colour, order. Sections map into these.
TOPICS = [
    ('business',  'Start a Business',        '#2C4DC9'),
    ('nonprofit', 'Launch a Nonprofit',      '#E2483A'),
    ('career',    'Boost Your Career',       '#2F8F5B'),
    ('grants',    'Grant Basics',            '#F3C23A'),
    ('housing',   'Home & Housing',          '#7A4FBF'),
    ('bills',     'Bills & Debt',            '#D9772B'),
    ('cars',      'Cars & Car Repairs',      '#1F8BA8'),
    ('health',    'Healthcare',              '#C2386F'),
    ('taxes',     'Taxes',                   '#5B6B2F'),
    ('legal',     'Legal Help',              '#8A5A2B'),
    ('families',  'Families & Children',     '#3A9C8F'),
    ('seniors',   'Seniors & Disabilities',  '#6C6F9B'),
    ('veterans',  'Veterans',                '#9C2F2F'),
]
TOPIC_ORDER = {k: i for i, (k, _, _) in enumerate(TOPICS)}

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
    if space_id == '20982255':
        return 'taxes' if 'tax' in s else 'legal'
    if space_id == '20982263':
        return 'seniors' if 'senior' in s else 'families'
    if space_id == '21731257': return 'cars'
    if space_id == '22214038': return 'veterans'
    return 'grants'

def clean_title(t):
    t = html.unescape(t or '')
    t = re.sub(r'<[^>]+>', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    t = t.replace('&', '&')
    return t

CODE_RE = re.compile(r'Lesko_Help_(?:(HC|TL|CB|FC)_?)?([A-Z]?\d{1,2})_', re.I)
def norm_code(prefix, num):
    """HC07 -> 'HC 07', TL_A02 -> 'TL A02', FC_A1 -> 'FC A1', 04 -> 'QG 04'."""
    prefix = (prefix or 'QG').upper()
    num = num.upper()
    if num.isdigit(): num = num.zfill(2)
    return f"{prefix} {num}"
def code_from(item):
    for f in item.get('pdfs', []) + item.get('drive', []):
        name = f.get('name') or f.get('title') or ''
        m = CODE_RE.search(name)
        if m: return norm_code(m.group(1), m.group(2))
    return None

def main():
    manifest = json.load(open(os.path.join(SRC, 'manifest.json')))
    drive = {d['code']: d for d in json.load(open(os.path.join(SRC, 'drive_folder.json')))}
    posts = {}
    for f in sorted(glob.glob(os.path.join(SRC, 'posts_*.json'))):
        for p in json.load(open(f)):
            if 'id' in p and 'error' not in p:
                posts[str(p['id'])] = p
    items = []
    series_order = {}
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
                extra_links = [{'label': x['name'], 'href': x['href']} for x in p.get('pdfs', []) if 'mightynetworks' not in x['href']]
                drv = [{'title': html.unescape(x.get('title') or ''), 'viewUrl': x.get('viewUrl'), 'previewUrl': x.get('previewUrl')} for x in p.get('drive', []) if x.get('viewUrl') or x.get('previewUrl')]
                # Cross-reference the shared Google Drive folder by code (CB_A01 etc.)
                if code:
                    dkey = code.replace(' ', '_')
                    if dkey in drive and not any(drive[dkey]['id'] in (d.get('viewUrl') or '') for d in drv):
                        d = drive[dkey]
                        drv.append({'title': d['title'], 'viewUrl': f"https://drive.google.com/file/d/{d['id']}/view", 'previewUrl': f"https://drive.google.com/file/d/{d['id']}/preview"})
                links = []
                seen = set()
                for l in p.get('links', []) + extra_links:
                    h = l.get('href'); 
                    if not h or h in seen: continue
                    if re.search(r'(mightynetworks\.com|mn\.co|drive\.google\.com)', h): continue
                    seen.add(h)
                    links.append({'label': clean_title(l.get('label')) or h, 'href': h})
                kind = p.get('kind') or ('quick_guide' if pdfs else 'lesson')
                items.append({
                    'id': str(lid), 'code': code, 'title': title, 'kind': kind, 'status': status,
                    'topic': topic, 'topicOrder': TOPIC_ORDER[topic],
                    'series': sec['section'], 'seriesOrder': si, 'order': li,
                    'space': sp['space'], 'spaceId': sp['spaceId'], 'spaceUrl': sp['url'], 'collection': sp['collection'],
                    'url': p.get('url') or f"https://lesko-help-2.mn.co/posts/{lid}",
                    'summary': (p.get('summary') or '').strip() or ('Draft lesson, not yet published in the community.' if status == 'HIDDEN' else ''),
                    'fetched': 'error' not in p and bool(p),
                    'pdfs': pdfs, 'drive': drv, 'links': links,
                    'download': (pdfs[0]['href'] if pdfs else (drv[0]['viewUrl'].replace('/view', '/view?usp=sharing') if drv and drv[0].get('viewUrl') else None)),
                    'wordCount': p.get('wordCount', 0),
                })
    data = {
        'generated': datetime.date.today().isoformat(),
        'community': 'https://lesko-help-2.mn.co',
        'topics': [{'key': k, 'label': l, 'color': c} for k, l, c in TOPICS],
        'items': items,
    }
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('/* Generated by scripts/build_data.py — do not edit by hand. */\n')
        app_data = dict(data, items=[i for i in items if i['status'] == 'POSTED'])
        f.write('window.LESKO_GUIDES = ' + json.dumps(app_data, ensure_ascii=False) + ';\n')
    print(f"{len(items)} items, {sum(1 for i in items if i['pdfs'])} with PDFs, {sum(1 for i in items if not i['summary'])} missing summaries")

if __name__ == '__main__':
    main()
