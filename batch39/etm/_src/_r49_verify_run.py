# -*- coding: utf-8 -*-
"""r49 verify 快速跑（迭代用）：verify 页 → title + 单元明细（失败单元 JSON dump）。
静音纪律（r28 定稿 function 版 1500ms ended）：ctx 级静音。"""
import io
import json
import sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri() + '?verify=1'

MUTE_JS = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
           "speechSynthesis.cancel=function(){};}}catch(e){}"
           "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
           "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},1500);"
           "return Promise.resolve();};p.pause=function(){};}catch(e){};")


def main():
    vp = tuple(int(x) for x in sys.argv[1:3]) if len(sys.argv) >= 3 else (1280, 800)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
        ctx.add_init_script(MUTE_JS)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL, timeout=60000)
        pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
        title = pg.title()
        vlog = pg.evaluate('window.__etmVlog')
        print('TITLE:', title, '| vp:', vp, '| pageerror:', len(errs))
        if errs:
            print('ERRORS:', errs[:5])
        if vlog:
            bad = {k: u for k, u in vlog['units'].items() if not u.get('ok')}
            print('units:', vlog['pass'], '/', vlog['total'])
            if bad:
                print('BAD DETAIL:')
                print(json.dumps(bad, ensure_ascii=False, indent=1)[:4000])
        browser.close()
        sys.exit(0 if title.startswith('VERIFY PASS') and not errs else 1)


if __name__ == '__main__':
    main()
