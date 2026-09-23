# -*- coding: utf-8 -*-
"""batch15 试玩修复实证（b15 player：matchstick 2P1+1P2 修，logicwho 徽记 P2 修；cashier P2 登记）
U1(P1-1) held 时点 '-' op 交叉区中心=放置竖槽（意图分发，不再被横杆截获）
U2(P1-2) ch2+ 谜面多解偏好（dch2/3 题	nsols≥2 占比）
U3(P2) 换手=自动放回旧的再拿起新的（直接点下一根火柴）
U4(P2) logicwho 徽记放大 ≥38px（左右混淆视觉锚点）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
U = lambda g: 'file:///' + (BASE / g / 'index.html').as_posix()
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

# 第三侧独立库（复用 verify_one_matchstick 的 MYLIB 结构）
srcm = (BASE / 'verify_one_matchstick.py').read_text(encoding='utf-8')
srcm = srcm.replace("sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')", "pass")
nsm = {'__file__': 'verify_one_matchstick.py'}
exec(compile(srcm.split('async def click_svg_el')[0], 'consts', 'exec'), nsm)
SOLVE_JS, MYLIB = nsm['SOLVE_JS'], nsm['MYLIB']

NSOLS_JS = "(() => {" + MYLIB + """
  const out = { t23: 0, m23: 0, t4: 0, m4: 0 };
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    for (const q of L.quizzes) {
      const cells = q.cells.map(c => ({ kind: c.kind, segs: c.segs.map(Boolean) }));
      let n = 0;
      const [O, E] = mySlots(cells);
      for (const src of O) for (const dst of E) if (dst !== src) {
        if (myEval(myApply(cells, src, dst)).ok) n++;
      }
      if (L.dch === 2 || L.dch === 3) { out.t23++; if (n >= 2) out.m23++; }
      if (L.dch === 4) { out.t4++; if (n >= 2) out.m4++; }
    }
  }
  out.r23 = out.m23 / out.t23; out.r4 = out.m4 / out.t4;
  return out;
})()"""

async def click_center(pg, pred):
    pos = await pg.evaluate("""(p => { const e = document.querySelector(p); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })('%s')""" % pred)
    if pos is None:
        return False
    await pg.mouse.click(pos['x'], pos['y'])
    return True

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # U2 多解占比（verify 页 genLevel 直调+第三侧穷举）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(U('matchstick') + '?verify=1')
        for _ in range(70):
            if 'VERIFY' in (await pg.title()):
                break
            await pg.wait_for_timeout(500)
        r2 = await pg.evaluate(NSOLS_JS)
        rec('U2 ch2/3 多解占比≥70% (ch4≥40%)', r2['r23'] >= 0.7 and r2['r4'] >= 0.4,
            'ch23=%d/%d=%.0f%% ch4=%d/%d=%.0f%%' % (r2['m23'], r2['t23'], r2['r23'] * 100, r2['m4'], r2['t4'], r2['r4'] * 100))
        await ctx.close()

        # U1 held 点 '-' op 交叉中心=放置竖槽（flat5 ch2 减法）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(U('matchstick'))
        await pg.wait_for_timeout(1200)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} };
          sv.levels = {}; for (let i = 0; i < 5; i++) sv.levels['1-'+i] = { stars: 1 };
          sv.matchstick = { tutSeen: true }; KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(2200)
        q = await pg.evaluate('MS.quiz')
        op_ci = next(i for i, c in enumerate(q['expr']) if c['kind'] == 'op')
        is_minus = not q['expr'][op_ci]['segs'][1]
        miss0 = q['miss']
        # 拿起一根数字段 ON 杆
        src = next(s for s in await pg.evaluate("""(() => { const q = MS.quiz; const out = [];
          q.expr.forEach((c, ci) => { if (c.kind !== 'd') return; c.segs.forEach((v, j) => { if (v) out.push(ci * 8 + j); }); });
          return out; })()"""))
        await click_center(pg, '.stk[data-slot="%d"]' % src)
        await pg.wait_for_timeout(400)
        held_mid = await pg.evaluate('MS.quiz.held')
        # 点 op 交叉区中心（横杆 hit 在上层——修复前此处被截获为探索 pop）
        vci = op_ci * 8 + 1
        placed = await click_center(pg, '.slot[data-slot="%d"]' % vci)
        await pg.wait_for_timeout(600)
        after = await pg.evaluate("""(ci) => { const q = MS.quiz; if (!q) return { advanced: true };
          return { held: q.held, v: q.expr[ci].segs[1], miss: q.miss }; }""", op_ci)
        # 放置发生的三种合法表现：等式成立推进(advanced) / 竖槽点亮成立(v) / 不成立弹回(miss+1)
        placed_happened = after.get('advanced') or (after['held'] is None and (after['v'] is True or after['miss'] == miss0 + 1))
        ok1 = is_minus and held_mid == src and placed and placed_happened
        rec('U1 held点op交叉中心=放竖槽(意图分发)', ok1,
            'minus=%s held=%s miss=%s→%s v=%s adv=%s' % (is_minus, held_mid, miss0, after.get('miss'), after.get('v'), after.get('advanced')))
        await ctx.close()

        # U3 换手：拿 A→点 B（数字段另一根 ON 杆，中心点击）→held==B+miss=0+A 杆 held class 清
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(U('matchstick'))
        await pg.wait_for_timeout(1200)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} };
          sv.levels = {}; sv.levels['1-0'] = { stars: 1 };
          sv.matchstick = { tutSeen: true }; KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(2200)
        sticks = await pg.evaluate("""(() => { const q = MS.quiz; const out = [];
          q.expr.forEach((c, ci) => { if (c.kind !== 'd') return; c.segs.forEach((v, j) => { if (v) out.push(ci * 8 + j); }); });
          return out.slice(0, 2); })()""")
        a, bb = sticks[0], sticks[1]
        await click_center(pg, '.stk[data-slot="%d"]' % a)
        await pg.wait_for_timeout(400)
        await click_center(pg, '.stk[data-slot="%d"]' % bb)   # 换手（修复前=pop 卡住）
        await pg.wait_for_timeout(500)
        st = await pg.evaluate("""(() => ({ held: MS.quiz.held, miss: MS.quiz.miss,
          aHeld: !!document.querySelector('.stk[data-slot="%d"].held') }))()""" % a)
        rec('U3 换手自动放回再拿起', st['held'] == bb and st['miss'] == 0 and not st['aHeld'],
            'A=%s B=%s st=%s' % (a, bb, st))
        await ctx.close()

        # U4 logicwho 徽记放大（flat10 ch3 有 rel 线索）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(U('logicwho'))
        await pg.wait_for_timeout(1200)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} };
          sv.levels = {}; for (let i = 0; i < 10; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 1 };
          sv.logicwho = { tutSeen: true }; KIDS.calendar.bonusSet(10); KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(2400)
        r4 = await pg.evaluate("""(() => { const cbs = [...document.querySelectorAll('.clue .cb')];
          return { n: cbs.length, min: Math.min(...cbs.map(e => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height))),
            fs: cbs.length ? getComputedStyle(cbs[0]).fontSize : '' }; })()""")
        rec('U4 logicwho 徽记≥38px', r4['n'] >= 1 and r4['min'] >= 38, 'n=%s min=%s fs=%s' % (r4['n'], r4['min'], r4['fs']))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
