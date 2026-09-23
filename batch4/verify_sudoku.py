# -*- coding: utf-8 -*-
"""sudoku 独立复验：①verify=1 全量 ②全新存档真实点击通关第 1 关（含教学等待）
③冲突零惩罚路径（错填→conflict+wrongs，点格清除）④双 viewport/离线/截图/0 错误。
独立 chromium.launch 无头。"""
import asyncio, io, sys, json, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.async_api import async_playwright

BASE = 'F:/claudecode/projects/active/kids-games/batch4/sudoku'
URL = 'file:///' + BASE + '/index.html'
results = []
def rec(name, ok, info=''):
    results.append(ok)
    print(('PASS' if ok else 'FAIL'), name, str(info)[:160])

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # -- ① verify --
        pg = await browser.new_page(viewport={'width': 1280, 'height': 800})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '?verify=1')
        await pg.wait_for_timeout(3500)
        t = await pg.title()
        rec('verify-title', t.startswith('VERIFY PASS'), t)
        html = open(BASE + '/index.html', encoding='utf-8').read()
        ext = re.findall(r'(?:src|href)\s*=\s*["\'](?:https?:)?//[^"\']+', html)
        rec('offline', len(ext) == 0, ext[:2])
        await pg.close()

        # -- ②③ 真实通关 + 冲突路径（全新存档） --
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(5500)          # 教学"看"演示（冲突演示+放对）
        CELL = """(cell) => {
            const c = document.querySelector('.cell[data-i="'+cell+'"]');
            if (c) c.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, pointerId:3, isPrimary:true, clientX:0, clientY:0}));
            return !!c;
        }"""
        ANIMAL = """(a) => {
            const el = document.querySelector('.abtn[data-a="'+a+'"]');
            if (el) el.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, pointerId:3, isPrimary:true, clientX:0, clientY:0}));
            return !!el;
        }"""
        # 冲突路径：给定格同行的空格填给定格动物=必即时冲突
        b = await pg.evaluate('() => SUD.board')
        sol = await pg.evaluate('() => SUD.solution')
        n = await pg.evaluate('() => SUD.currentLevel.n')
        cells = b['cells']
        given = b['given']
        N = n * n
        tgt = None
        for g in range(N):
            if not given[g] or not isinstance(cells[g], int) or cells[g] < 0: continue
            gr, gc2 = g // n, g % n
            for c2 in range(N):
                if c2 == g or isinstance(cells[c2], int) and cells[c2] >= 0: continue
                if (c2 // n == gr) or (c2 % n == gc2): tgt = (c2, cells[g]); break
            if tgt: break
        await pg.evaluate(CELL, tgt[0])
        await pg.evaluate(ANIMAL, tgt[1])
        await pg.wait_for_timeout(300)
        st = await pg.evaluate("""() => ({
            conflict: document.querySelectorAll('.cell.conflict').length,
            wrongs: SUD.currentLevel.wrongs})""")
        okc = st['conflict'] >= 1 and st['wrongs'] >= 1
        rec('conflict-path', okc, json.dumps(st))
        # 清除（点已填格=清除）
        await pg.evaluate(CELL, tgt[0])
        await pg.wait_for_timeout(250)
        b3 = await pg.evaluate('() => SUD.board.cells')
        rec('clear-refill', (not isinstance(b3[tgt[0]], int) or b3[tgt[0]] < 0), str(b3[tgt[0]]))
        # 真实逐格通关
        won, steps = False, 0
        for _ in range(40):
            b = await pg.evaluate('() => SUD.board')
            cells = b['cells'] if isinstance(b, dict) else b
            holes = [i for i, v in enumerate(cells) if not isinstance(v, int) or v < 0]
            if not holes: break
            c = holes[0]
            await pg.evaluate(CELL, c)
            await pg.evaluate(ANIMAL, sol[c])
            await pg.wait_for_timeout(120)
            steps += 1
            lv = await pg.evaluate('() => SUD.currentLevel')
            if lv['won']: won = True; break
        cele = await pg.evaluate("() => !!document.querySelector('.k-celebrate')")
        rec('real-play-won', won and cele, 'steps=%d celebrate=%s' % (steps, cele))
        await pg.evaluate("() => localStorage.clear()")
        await pg.close()

        # -- ④ 双 viewport 布局 --
        for vw, vh in [(1280, 800), (800, 1180)]:
            ctxv = await browser.new_context(viewport={'width': vw, 'height': vh})
            pg = await ctxv.new_page()
            await pg.goto(URL)
            await pg.wait_for_timeout(1500)
            m = await pg.evaluate("""() => {
                const de = document.documentElement;
                let bad = [];
                document.querySelectorAll('.abtn, .cell').forEach(e => {
                    const r = e.getBoundingClientRect();
                    if (Math.min(r.width, r.height) < 56) bad.push(e.className + ':' + Math.round(Math.min(r.width, r.height)));
                });
                return {ox: de.scrollWidth - de.clientWidth, bad: bad.slice(0, 3)};
            }""")
            rec('vp-%dx%d' % (vw, vh), m['ox'] == 0 and not m['bad'], json.dumps(m, ensure_ascii=False))
            await pg.close()

        # 截图非空白
        ctxs = await browser.new_context(viewport={'width': 800, 'height': 1180})
        pg = await ctxs.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path='F:/claudecode/projects/active/kids-games/batch4/shots/sudoku_init.png')
        from PIL import Image
        im = Image.open('F:/claudecode/projects/active/kids-games/batch4/shots/sudoku_init.png').convert('L')
        import statistics
        sd = statistics.pstdev(list(im.getdata())[::37])
        rec('shot-nonblank', sd > 10, 'stdev=%.1f' % sd)
        await pg.close()

        rec('js-errors', not errs and not errs2, (errs + errs2)[:2])
        print('RESULT sudoku %d/%d' % (sum(results), len(results)))
        await browser.close()
        sys.exit(0 if all(results) else 1)

asyncio.run(main())
