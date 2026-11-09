#!/bin/sh
# Assemble src/ en un seul index.html : src/page.html, avec src/css/*.css et src/js/*.js en ligne (dans l'ordre des noms).
set -e
cd "$(dirname "$0")"
python3 - <<'PY'
import glob
page = open('src/page.html', encoding='utf8').read()
css = ''.join(open(f, encoding='utf8').read() for f in sorted(glob.glob('src/css/*.css')))
js = ''.join(open(f, encoding='utf8').read() for f in sorted(glob.glob('src/js/*.js')))
assert '/*@CSS@*/' in page and '/*@JS@*/' in page
open('index.html', 'w', encoding='utf8').write(page.replace('/*@CSS@*/', css).replace('/*@JS@*/', js))
PY
