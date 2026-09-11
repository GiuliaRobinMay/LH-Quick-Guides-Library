#!/usr/bin/env python3
"""Merge the per-state extraction files into data/source/state_reports.json.

The extraction reads the six Google Drive reports linked for each state from the
Lesko "500+ Money & Help Benefit Programs" index document and writes one JSON
file per state. This merges them, keeping the index blurb for each section.

    python3 scripts/merge_state_reports.py <index.json> <states_dir>
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ['financial', 'business', 'jobs', 'health', 'mentoring', 'housing']

def slug(s): return re.sub(r'[^a-z]+', '-', s.lower())

def main(index_path, states_dir):
    index = json.load(open(index_path, encoding='utf-8'))
    out = {}
    for state, sections in index.items():
        path = os.path.join(states_dir, slug(state) + '.json')
        got = {}
        if os.path.exists(path):
            try:
                data = json.load(open(path, encoding='utf-8'))
                got = {s['key']: s for s in data.get('sections', []) if s.get('key')}
            except (ValueError, KeyError, TypeError) as exc:
                print(f"  ! {state}: unreadable extraction ({exc})")
        rec = {}
        for key in ORDER:
            src = sections.get(key)
            if not src: continue
            ex = got.get(key, {})
            rec[key] = {
                'url': src['url'], 'fileId': src['fileId'], 'note': src['note'],
                'accessible': bool(ex.get('accessible', True)) if ex else True,
                'intro': ex.get('intro', ''), 'entries': ex.get('entries', []),
                'truncated': bool(ex.get('truncated')),
            }
        out[state] = rec
    dest = os.path.join(ROOT, 'data', 'source', 'state_reports.json')
    json.dump(out, open(dest, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    entries = sum(len(s['entries']) for r in out.values() for s in r.values())
    dead = [(st, k) for st, r in out.items() for k, s in r.items() if not s['accessible']]
    print(f"{len(out)} states, {sum(len(r) for r in out.values())} sections, {entries} links, {len(dead)} unreachable")
    return out

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
