# -*- coding: utf-8 -*-
"""conserve verify 页复跑（独立 headless chromium.launch，禁 connect/禁杀浏览器）
+ 真实页冒烟（0 pageerror）。用法: python batch28/conserve/_src/_selftest.py"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent.parent
URL_V = 'file:///' + (BASE / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / 'index.html').as_posix()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # verify 页
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_V)
        title = ''
        for _ in range(120):
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        print('VERIFY title:', title, 'pageerrors:', errs[:3])
        res = await pg.evaluate('document.getElementById("verify-result").textContent')
        try:
            import json
            j = json.loads(res)
            print('pass/total:', j['pass'], '/', j['total'], 'layoutOk:', j['layoutOk'])
            for k in ('audit', 'numcn', 'tap', 'intro', 'tutorial', 'swallow', 'clips',
                      'stars', 'contract', 'hints', 'estWin', 'speed'):
                if k in j.get('units', {}):
                    u = j['units'][k]
                    print(' unit %-9s ok=%s %s' % (k, u.get('ok'),
                          {x: u[x] for x in u if x not in ('ok',) and not isinstance(u[x], (dict, list))}))
            for k, s in j.get('smokes', {}).items():
                if k == 'layout':
                    for one in s.get('sims', []):
                        print(' layout %s flat%-3s svgH=%s cards=%s hit=%s scene=%s ox=%s pass=%s' %
                              (one['vp'], one['flat'], one['svgH'], one['cards'], one['hitOk'],
                               one['sceneOk'], one['ox'], one['pass']))
                else:
                    print(' smoke %-7s ok=%s %s' % (k, s.get('ok'),
                          {x: s[x] for x in s if x not in ('ok',)}))
            bad = [k for k, v in list(j.get('levels', {}).items()) + list(j.get('gen', {}).items()) if not v.get('ok')]
            print(' bad levels:', bad[:10])
        except Exception as e:
            print('parse fail:', e, res[:400])
        await pg.close()

        # 真实页冒烟
        pg2 = await b.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        await pg2.goto(URL_R)
        await pg2.wait_for_timeout(2500)
        demo = None
        for _ in range(60):
            demo = await pg2.evaluate('window.__cvDemoR || null')
            if demo:
                break
            await pg2.wait_for_timeout(500)
        tut = 'watch'
        for _ in range(40):
            tut = await pg2.evaluate('window.CV && CV.tutorial')
            if tut != 'watch':
                break
            await pg2.wait_for_timeout(500)
        r = await pg2.evaluate('CV.autoSolve()')
        lv = await pg2.evaluate('CV.currentLevel')
        sv = await pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_conserve") || "{}")')
        print('REAL demo=%s tut=%s autoSolve=%s lv=%s errs=%s saveKeys=%s levels1=%s' %
              (demo, tut, r, lv, errs2[:3], sorted(sv.keys()), len(sv.get('levels', {}))))
        await pg2.close()
        await b.close()

asyncio.run(main())
