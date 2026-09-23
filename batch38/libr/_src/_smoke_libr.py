# -*- coding: utf-8 -*-
"""libr 冒烟：verify selftest（等 title）+ 真实页教学链/首关（watch→turn→autoSolve）。
无头独立 launch（--mute-audio），单 page 串行；禁 connect/禁杀浏览器。"""
import asyncio, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

URL = 'file:///F:/claudecode/projects/active/kids-games/batch38/libr/index.html'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])
        # ---- verify 页 ----
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '?verify=1')
        title = ''
        for _ in range(240):
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        print('VERIFY title =', title, '| pageerrors =', errs[:2])
        if title and 'PASS' not in title:
            units = await pg.evaluate('window.__lbVlog ? window.__lbVlog.units : {}')
            for name, u in units.items():
                if not u.get('ok'):
                    print('FAIL unit', name, repr(u)[:500])
        await pg.close()
        # ---- 真实页（教学链+首关） ----
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(2500)
        demo_r = None
        for _ in range(60):
            demo_r = await pg.evaluate('window.__lbDemoR || null')
            if demo_r:
                break
            await pg.wait_for_timeout(500)
        tut = 'watch'
        for _ in range(40):
            tut = await pg.evaluate('window.LB && LB.tutorial')
            if tut != 'watch':
                break
            await pg.wait_for_timeout(500)
        r = await pg.evaluate('LB.autoSolve()')
        stars = None
        for _ in range(30):
            stars = await pg.evaluate("(KIDS._save()||{levels:{}}).levels['1-0'] ? KIDS._save().levels['1-0'].stars : null")
            if stars is not None:
                break
            await pg.wait_for_timeout(500)
        print('REAL: demoR=%s tut=%s auto=%s stars=%s errs=%s' % (demo_r, tut, r, stars, errs[:2]))
        lv = await pg.evaluate('LB.currentLevel ? JSON.stringify(LB.currentLevel) : null')
        print('currentLevel after =', lv)
        await pg.close()
        await b.close()

asyncio.run(main())
