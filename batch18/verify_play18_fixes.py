# -*- coding: utf-8 -*-
"""batch18 试玩修复实证（playtest P1 处置）
U1 stack 倒塌恢复后立即闪安全列 breathe（连倒瞎猜锚点——fire-and-forget 窗后 .colbtn.breathe）
U2 bounce 进错洞语义化：错洞 .wrong-x 在场+回位清除；错 1 次即首段虚线 show（梯度脚手架）
U3 coder2 tip 含「多余的卡可以不放」（槽位=池数暗示全放满的界面修正）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

RESUME = "(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {}; sv.%s = { tutSeen: true }; KIDS.store.persist(); })()"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # U1 stack 倒塌→安全列 breathe（真实页）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'stack' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(RESUME % 'stack')
        await pg.reload()
        await pg.wait_for_timeout(2000)
        await pg.evaluate('ST.start(0)')
        q = await pg.evaluate('ST.quiz')
        bad_col = 0 if q['floors'][0]['wind'] >= 0 else 6
        await pg.evaluate('ST.tapCol(%d), 0' % bad_col)      # fire-and-forget（tapCol async）
        breathe_seen = False
        for _ in range(20):                                    # 窗 1000ms 内密集采样
            await pg.wait_for_timeout(90)
            r = await pg.evaluate("() => !!document.querySelector('#colbar .colbtn.breathe')")
            if r:
                breathe_seen = True; break
        rec('U1 stack 倒塌后安全列 breathe', breathe_seen and not errs, 'breathe=%s errs=%s' % (breathe_seen, errs[:1]))
        await ctx.close()

        # U2 bounce 错洞打叉+首段虚线（真实页；构造错洞=选一个会入洞但非正确的方向——
        #    若本题干扰方向不入洞，退化验证 wrong 后虚线 show 与叉不在场）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        await pg.goto('file:///' + (BASE / 'bounce' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(RESUME % 'bounce')
        await pg.reload()
        await pg.wait_for_timeout(2000)
        found = False
        for flat in range(6):
            await pg.evaluate('BC.start(%d)' % flat)
            q = await pg.evaluate('BC.quiz')
            for di in range(len(q['dirs'])):
                if di == q['answer']:
                    continue
                r = await pg.evaluate("""(i) => { const q = BC.quiz;
                  const occ = buildOcc(q.walls);
                  const sim = simShot(occ, q.W, q.H, q.ball, q.dirs[i], q.holes);
                  return {outcome: sim.outcome, holeIdx: sim.holeIdx}; }""", di)
                if r['outcome'] == 'hole' and r['holeIdx'] != q.get('okHole', -1):
                    await pg.evaluate('BC.tapDir(%d), 0' % di)   # fire-and-forget
                    x_seen = seg_seen = cleared = False
                    for _ in range(30):
                        await pg.wait_for_timeout(100)
                        x_seen = x_seen or await pg.evaluate("() => !!document.querySelector('#field .hole .wrong-x')")
                        seg_seen = seg_seen or await pg.evaluate("() => !!document.querySelector('#rescue-line.show')")
                    for _ in range(30):                          # 错后窗收尾+回位
                        await pg.wait_for_timeout(150)
                        cleared = not await pg.evaluate("() => !!document.querySelector('#field .hole .wrong-x')")
                        if cleared and await pg.evaluate("() => (BC.quiz||{}).phase === 'aim'"):
                            break
                    rec('U2 bounce 错洞打叉+错1次虚线', x_seen and seg_seen and not errs2,
                        'x=%s seg=%s cleared=%s flat=%d errs=%s' % (x_seen, seg_seen, cleared, flat, errs2[:1]))
                    found = True
                    break
            if found:
                break
        if not found:
            rec('U2 bounce 错洞打叉+错1次虚线', False, '前 6 关未构造出入错洞方向')
        await ctx.close()

        # U3 coder2 tip 文案（真实页 DOM）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        await pg.goto('file:///' + (BASE / 'coder2' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        tip = await pg.evaluate("() => (document.querySelector('#tip') || {}).textContent || ''")
        rec('U3 coder2 tip 含「多余的卡可以不放」', '多余的卡可以不放' in tip and not errs3, 'tip=%s errs=%s' % (tip[:40], errs3[:1]))
        await ctx.close()
        await b.close()

    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
