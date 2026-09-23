# -*- coding: utf-8 -*-
"""r44 VERIFY 双视口跑器（六门禁②）：?verify=1 真页跑 runVerify，
断言 title='VERIFY PASS n/n' 且 __psVlog.layoutOk；双视口 1280x800 + 800x1180。
用法: python _r44_verify_run.py"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri() + '?verify=1'

# 静音纪律（r28 定稿 function 版，段二 2026-09-22 起 ended 5ms→1500ms 口径）：verify 页
# stub 全发声 API，双保险仍挂 ctx 级静音
MUTE_JS = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
           "speechSynthesis.cancel=function(){};}}catch(e){}"
           "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
           "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},1500);"
           "return Promise.resolve();};p.pause=function(){};}catch(e){};")


def main():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w, h in [(1280, 800), (800, 1180)]:
            ctx = browser.new_context(viewport={'width': w, 'height': h})
            ctx.add_init_script(MUTE_JS)
            pg = ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(URL)
            try:
                pg.wait_for_function("() => /VERIFY (PASS|FAIL)/.test(document.title)",
                                     timeout=120000)
            except Exception:
                print('VIEWPORT %dx%d: title never settled: %r' % (w, h, pg.title()))
                print(pg.evaluate('() => window.__psVlog ? JSON.stringify(window.__psVlog).slice(0, 2000) : "no vlog"'))
                browser.close()
                sys.exit(2)
            title = pg.title()
            vlog = pg.evaluate('() => window.__psVlog')
            layout_ok = bool(vlog and vlog.get('layoutOk'))
            bad = []
            if vlog:
                for k, u in (vlog.get('units') or {}).items():
                    if not u.get('ok'):
                        bad.append(k)
                for k, s in (vlog.get('smokes') or {}).items():
                    if not s.get('ok'):
                        bad.append('smoke:' + k)
                for k, r in (vlog.get('levels') or {}).items():
                    if not r.get('ok'):
                        bad.append('lv:' + k)
                for k, r in (vlog.get('gen') or {}).items():
                    if not r.get('ok'):
                        bad.append('gen:' + k)
            results.append({'vp': '%dx%d' % (w, h), 'title': title,
                            'layoutOk': layout_ok, 'pageerrors': errs, 'bad': bad,
                            'pass': title.startswith('VERIFY PASS') and layout_ok and not errs})
            ctx.close()
        browser.close()
    ok = all(r['pass'] for r in results)
    for r in results:
        print('%(vp)s title=%(title)s layoutOk=%(layoutOk)s pageerrors=%(pageerrors)s bad=%(bad)s' % r)
    if not ok:
        sys.exit(1)
    print('VERIFY-RUN OK: both viewports green')


if __name__ == '__main__':
    main()
