# -*- coding: utf-8 -*-
"""sentorder 无头自测：verify 13 单元（U13 六词面已扩——r45 段二联动）+ 真实页教学链/点击 pageerror
用法: python batch34/sentorder/_src/_selftest.py"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

URL = 'file:///' + (Path(os.path.dirname(os.path.abspath(__file__))).parent / 'index.html').as_posix()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])   # 独立实例（不弹 Chrome 不 connect）
        # ---- 1) verify 页（加载即跑 runVerify——先等 title） ----
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '?verify=1')
        title = ''
        for _ in range(300):
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title and title != 'VERIFY':
                break
            await pg.wait_for_timeout(500)
        print('verify title =', title)
        v = await pg.evaluate('window.VERIFY || null')
        if v:
            print('verify units %s/%s:' % (v['pass'], v['total']))
            for u in v['units']:
                print('  [%s] %-8s %s' % ('PASS' if u['ok'] else 'FAIL', u['name'], u['note']))
        print('verify pageerrors:', errs[:3])
        await pg.close()

        # ---- 2) 真实页（教学链首段 + 一轮点击 + pageerror=0） ----
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(2500)
        demo_r = None
        for _ in range(80):
            demo_r = await pg.evaluate('window.__soDemoR || null')
            if demo_r:
                break
            await pg.wait_for_timeout(500)
        tut = 'watch'
        for _ in range(60):                       # 等教学链离开 watch 演示段（吞入窗内点卡=设计行为）
            tut = await pg.evaluate('SO.tutorial')
            if tut != 'watch':
                break
            await pg.wait_for_timeout(500)
        # 一轮点击：help/solo 态点下一正确词（真实判定链）
        tap_r = await pg.evaluate('(i)=>(async()=>{ const q = SO.quiz; if(!q) return "noquiz";'
                                  ' const k = q.opts.findIndex(c=>!c.used && c.w===q.words[q.picked.length]);'
                                  ' return await SO.tapWord(k); })()')
        q_after = await pg.evaluate('SO.quiz ? {picked: SO.quiz.picked, miss: SO.quiz.miss, step: SO.quiz.step} : null')
        print('real: demoR=%s tut=%s tap=%s after=%s' % (demo_r, tut, tap_r, q_after))
        print('real pageerrors:', errs[:3], '(total %d)' % len(errs))
        await pg.close()
        await b.close()

asyncio.run(main())
