# -*- coding: utf-8 -*-
"""batch17 mm 连点竞态压力复测（试玩 P2-1：真实连点错 3 次后正确点击偶发停滞 2/4；
M1 已改 1000ms——0/4 复现才算修复生效）
S1 错×3 连点→窗后点对推进（4 轮：flat0/1=ch1 v/h、flat10=ch3 pv/ph 周期反相、flat15=ch4 双镜复合）
S2 错对交替狂点 10 击→点满 targets 推进（4 轮：flat10/11=ch3、flat15/16=ch4——含周期/双镜 kind）"""
import asyncio, io, os, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'mirrormaze' / 'index.html').as_posix()
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

async def cell_pos(pg, x, y):
    r = await pg.evaluate("""(xy) => {
      const cells = Array.from(document.querySelectorAll('[data-x][data-y]'));
      for (const c of cells) if (Number(c.dataset.x) === xy[0] && Number(c.dataset.y) === xy[1]) {
        const b = c.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height / 2};
      } return null; }""", [x, y])
    return r

async def click(pg, pos):
    await pg.mouse.click(pos['x'], pos['y'])

def find_wrong(q):
    """r14 模型：非 given 非 target 空格（given 含 src/axis 双角色）"""
    occ = {(c['x'], c['y']) for c in q['given']} | {(t['x'], t['y']) for t in q['targets']}
    for x in range(q['W']):
        for y in range(q['H']):
            if (x, y) not in occ:
                return (x, y)
    return None

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {};
          sv.mirrormaze = { tutSeen: true }; KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(2000)

        # S1×4 轮：每轮错×3 连点（150ms）→1.2s 窗后点满 targets→断言题推进（10s 上限）
        # 轮面：flat0/1=ch1（v/h）、flat10=ch3（pv/ph 周期反相）、flat15=ch4（vv/r180 双镜）
        for rnd, flat in enumerate([0, 1, 10, 15]):
            await pg.evaluate('MM.start(%d)' % flat)
            q = await pg.evaluate('MM.quiz')
            wrong = find_wrong(q)
            wpos = await cell_pos(pg, *wrong)
            t0 = time.time()
            for _ in range(3):
                await click(pg, wpos)
                await pg.wait_for_timeout(150)
            await pg.wait_for_timeout(1200)          # 窗收尾
            st0 = (await pg.evaluate('MM.currentLevel'))['step']
            for t in q['targets']:
                pos = await cell_pos(pg, t['x'], t['y'])
                await click(pg, pos)
                await pg.wait_for_timeout(220)
            advanced = False
            for _ in range(50):
                st1 = (await pg.evaluate('MM.currentLevel'))['step']
                if st1 > st0 or (await pg.evaluate('MM.quiz')) is None:
                    advanced = True
                    break
                await pg.wait_for_timeout(200)
            dt = time.time() - t0
            rec('S1-r%d flat%d(%s) 错×3→窗后点对推进' % (rnd, flat, q['kind']),
                advanced and dt < 10 and not errs, 'dt=%.1fs errs=%s' % (dt, errs[:1]))

        # S2×4 轮：错对交替狂点 10 击（150ms）→2s 收尾→点满 targets→推进
        # 轮面：flat10/11=ch3（周期反相判别）、flat15/16=ch4（双镜复合）
        for rnd, flat in enumerate([10, 11, 15, 16]):
            await pg.evaluate('MM.start(%d)' % flat)
            q = await pg.evaluate('MM.quiz')
            wrong = find_wrong(q)
            wpos = await cell_pos(pg, *wrong)
            tpos = await cell_pos(pg, q['targets'][0]['x'], q['targets'][0]['y'])
            t0 = time.time()
            for k in range(10):
                await click(pg, wpos if k % 2 == 0 else tpos)
                await pg.wait_for_timeout(150)
            await pg.wait_for_timeout(2000)
            st0 = (await pg.evaluate('MM.currentLevel'))['step']
            for t in q['targets']:
                pos = await cell_pos(pg, t['x'], t['y'])
                await click(pg, pos)
                await pg.wait_for_timeout(220)
            advanced = False
            for _ in range(50):
                st1 = (await pg.evaluate('MM.currentLevel'))['step']
                if st1 > st0 or (await pg.evaluate('MM.quiz')) is None:
                    advanced = True
                    break
                await pg.wait_for_timeout(200)
            dt = time.time() - t0
            rec('S2-r%d flat%d(%s) 交替狂点→点满推进' % (rnd, flat, q['kind']),
                advanced and dt < 12 and not errs, 'dt=%.1fs errs=%s' % (dt, errs[:1]))

        await ctx.close()
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
