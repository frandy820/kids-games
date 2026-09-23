# -*- coding: utf-8 -*-
"""r32 门禁②：VERIFY 双视口（1280x800 + 800x1180）——wait_for_function 箭头函数形式"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
VP = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1280, 800)

errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': VP[0], 'height': VP[1]})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL + '?verify=1')
    deadline = time.time() + 30
    title = ''
    while time.time() < deadline:
        title = pg.title()
        if title.startswith('VERIFY'):
            break
        pg.wait_for_timeout(500)
    vj = {}
    try:
        vj = json.loads(pg.locator('#verify-result').text_content())
    except Exception as e:
        print('RESULT PARSE FAIL:', e)
    b.close()

print('VP %dx%d | title=%s | pass=%s/%s | pageerror=%d' %
      (VP[0], VP[1], title, vj.get('pass'), vj.get('total'), len(errs)))
if errs:
    print('ERRORS:', errs[:3])
bad = [k for k, v in (vj.get('levels') or {}).items() if not v.get('ok')] + \
      [k for k, v in (vj.get('gen') or {}).items() if not v.get('ok')]
if bad:
    print('BAD LEVELS:', bad[:6])
    for k in bad[:2]:
        src = (vj.get('levels') or {}).get(k) or (vj.get('gen') or {}).get(k)
        print(' ', k, {kk: vv for kk, vv in src.items() if kk not in ('qs',) and vv is False})
badu = [k for k, v in (vj.get('units') or {}).items() if not v.get('ok')]
if badu:
    print('BAD UNITS:', badu)
    for k in badu:
        print(' ', k, json.dumps(vj['units'][k], ensure_ascii=False)[:400])
sm = vj.get('smokes') or {}
bads = [k for k, v in sm.items() if not v.get('ok')]
if bads:
    print('BAD SMOKES:', bads)
sys.exit(0 if (title.startswith('VERIFY PASS') and not errs) else 1)
