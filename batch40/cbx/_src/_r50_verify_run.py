# -*- coding: utf-8 -*-
"""r50 verify 双视口驱动：?verify=1 在 1280x800+800x1180 各跑一遍，
title='VERIFY PASS n/n'+pageerror=0+__cbxVlog 单元明细打印。
独立 chromium（禁杀用户浏览器进程）；MUTE init_script+种档双保险（verify 页
KIDS 未 init，种档为防御性）。用法: python _r50_verify_run.py"""
import io, json, pathlib, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri() + '?verify=1'

MUTE = """
(function(){
  try{const AP=window.AudioContext||window.webkitAudioContext;
    if(AP){window.AudioContext=function(){const c=new AP();c.currentTime=1e6;try{c.suspend();}catch(e){}return c;};window.AudioContext.prototype=AP.prototype;}}catch(e){}
  try{HTMLMediaElement.prototype.play=function(){this.muted=true;const p=Promise.resolve();p.then=function(){return p;};return p;};}catch(e){}
})();
"""


def main():
    ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])
        for (w, h) in [(1280, 800), (800, 1180)]:
            pg = browser.new_page(viewport={'width': w, 'height': h})
            pg.add_init_script(MUTE)
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(URL, timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
            title = pg.title()
            vlog = pg.evaluate('window.__cbxVlog')
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad = [k for k, u in vlog['units'].items() if not u.get('ok')]
            print('VIEWPORT %dx%d: %s | units %s/%s | clips %d | pageerror %d'
                  % (w, h, title, vlog['pass'], vlog['total'], n_clip, len(errors)))
            if bad:
                print('  bad units:', json.dumps({k: vlog['units'][k] for k in bad},
                                                 ensure_ascii=False)[:1200])
            gen = vlog['units'].get('gen', {})
            if 'ansPos' in gen:
                print('  gen ansPos:', gen['ansPos'])
            if not title.startswith('VERIFY PASS') or errors:
                ok = False
            pg.close()
        browser.close()
    print('VERIFY-RUN', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
