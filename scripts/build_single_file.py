#!/usr/bin/env python3
"""Inline styles, font, data and script into one self-contained HTML file (dist/index.html).
Handy for previewing as an Artifact or emailing the app as a single file."""
import os, base64
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def read(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
css = read('assets/styles.css')
font_path = os.path.join(ROOT, 'assets', 'fonts', 'inter-var.woff2')
if os.path.exists(font_path):
    b64 = base64.b64encode(open(font_path, 'rb').read()).decode('ascii')
    css = css.replace('url("fonts/inter-var.woff2")', f'url("data:font/woff2;base64,{b64}")')
html = read('index.html')
html = html.replace('<link rel="stylesheet" href="assets/styles.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="data/guides.js"></script>', '<script>\n' + read('data/guides.js') + '\n</script>')
html = html.replace('<script src="assets/app.js"></script>', '<script>\n' + read('assets/app.js') + '\n</script>')
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
open(os.path.join(ROOT, 'dist', 'index.html'), 'w', encoding='utf-8').write(html)
print('wrote dist/index.html', len(html), 'bytes')
