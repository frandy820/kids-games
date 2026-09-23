# -*- coding: utf-8 -*-
"""r34 VERIFY 页运行器：双视口跑 ?verify=1，取 title+JSON 全文（gate ②用）
用法: python _r34_verify_run.py"""
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri() + '?verify=1'
MUTE = "Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});"

with sync_playwright() as p:
    b = p.chromium.launch()
    ok_all = True
    for vp in [(1280, 800), (800, 1180)]:
        pg = b.new_page(viewport={'width': vp[0], 'height': vp[1]})
        pg.add_init_script(MUTE)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL)
        title = ''
        for _ in range(240):
            title = pg.title()
            if 'VERIFY' in title and title != 'VERIFY':
                break
            pg.wait_for_timeout(500)
        js = pg.evaluate('() => document.getElementById("verify-result").textContent')
        print('=== %dx%d === %s  errs=%s  json_len=%d' % (vp[0], vp[1], title, errs[:2], len(js or '')))
        if js:
            (HERE / ('r34-verify-debug-%dx%d.json' % vp[:2])).write_text(js, encoding='utf-8')
        if not ('VERIFY PASS' in title and not errs):
            ok_all = False
        pg.close()
    b.close()
    print('VERIFY-RUN', 'PASS' if ok_all else 'FAIL')
    sys.exit(0 if ok_all else 1)
