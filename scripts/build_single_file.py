#!/usr/bin/env python3
"""Inline styles, data and script into one self-contained HTML file (dist/index.html).
Handy for previewing as an Artifact or emailing the app as a single file."""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def read(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
html = read('index.html')
html = html.replace('<link rel="stylesheet" href="assets/styles.css">', '<style>\n' + read('assets/styles.css') + '\n</style>')
html = html.replace('<script src="data/guides.js"></script>', '<script>\n' + read('data/guides.js') + '\n</script>')
html = html.replace('<script src="assets/app.js"></script>', '<script>\n' + read('assets/app.js') + '\n</script>')
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
open(os.path.join(ROOT, 'dist', 'index.html'), 'w', encoding='utf-8').write(html)
print('wrote dist/index.html', len(html), 'bytes')
