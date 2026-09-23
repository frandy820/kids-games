# -*- coding: utf-8 -*-
"""外部自证：SL.start(flat) 切关生效（真实页切 7=ch2 与 23=生成关，盘型/章号随动）"""
import asyncio, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

URL = 'file:///F:/claudecode/projects/active/kids-games/batch22/slide/index.html'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(2500)
        checks = []
        for flat, want in [(7, {'ch': 2, 'W': 3, 'H': 2}), (23, None), (0, {'ch': 1, 'W': 2, 'H': 2})]:
            r = await pg.evaluate("""(f) => { SL.start(f);
              const c = SL.currentLevel, q = SL.quiz;
              return {flat: c.flat, ch: c.ch, dch: c.dch, lv: c.lv, n: c.n,
                      W: q.grid.W, H: q.grid.H, K: q.K, moves: q.moves,
                      tiles: q.tiles.length, step: q.step}; }""", flat)
            ok = r['flat'] == flat and r['moves'] == 0 and r['step'] == 0 and r['tiles'] == r['W'] * r['H'] - 1
            if want:
                ok = ok and r['ch'] == want['ch'] and r['W'] == want['W'] and r['H'] == want['H']
            checks.append((flat, ok, r))
        for flat, ok, r in checks:
            print('start(%d): %s %s' % (flat, 'OK' if ok else 'FAIL', r))
        # 23 = 生成关：lv=flat%5, dch 随机，盘型合法
        r23 = checks[1][2]
        print('gen-level 23 dch=%d lv=%d board=%dx%d' % (r23['dch'], r23['lv'], r23['W'], r23['H']))
        all_ok = all(c[1] for c in checks) and r23['lv'] == 3 and 1 <= r23['dch'] <= 4 and not errs
        print('ALL:', 'PASS' if all_ok else 'FAIL', 'errs:', errs[:2])
        await ctx.close()
        await b.close()

asyncio.run(main())
