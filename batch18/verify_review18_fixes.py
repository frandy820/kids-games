# -*- coding: utf-8 -*-
"""batch18 审查修复实证（F1/F2/M1/M2）
T1(F1) bounce 错向 150ms×5 真实鼠标连击 miss 仅+1（防重入窗 900→1000ms 对齐家族口径）
T2(F2) coder2 嵌套拦截：rep 卡落另一 rep 作用域=放置拒绝（钩子 false+程序不增+提示语音）
T3(M1) coder2 救援前缀+尾卡：REF 排满再补干扰→rescueTarget 指 undo（非 run 误导）
T4(M2) coder2 循环作用域分组框：rep 卡入列后 .pgroup 在场含 3 槽（作用域可视化）"""
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

        # T1 bounce 连击（真实页，seed 跳教学）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'bounce' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(RESUME % 'bounce')
        await pg.reload()
        await pg.wait_for_timeout(2000)
        await pg.evaluate('BC.start(0)')
        q = await pg.evaluate('BC.quiz')
        # 找一个必错方向（不入洞的）
        wrong = 0 if q['answer'] != 0 else 1
        m0 = q['miss']
        pos = await pg.evaluate("""(i) => { const c = document.querySelector('.dcard[data-i="' + i + '"]');
          if (!c) return null; const b = c.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height / 2}; }""", wrong)
        for _ in range(5):
            await pg.mouse.click(pos['x'], pos['y'])
            await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(1800)               # 飞行+错后窗收尾
        m1 = (await pg.evaluate('BC.quiz'))['miss']
        rec('T1 bounce 5连击 miss仅+1（1000ms 窗）', pos and m1 == m0 + 1 and not errs,
            'm=%s→%s errs=%s' % (m0, m1, errs[:1]))
        await ctx.close()

        # T2+T3+T4 coder2（verify 页引擎直驱+真实页 DOM 各取所需）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        await pg.goto('file:///' + (BASE / 'coder2' / 'index.html').as_posix() + '?verify=1')
        title = ''
        for _ in range(120):
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        await pg.wait_for_timeout(800)

        # T2 嵌套拦截（引擎层：ch2+ 池含两张 rep）
        r = await pg.evaluate("""(() => {
          const out = [];
          for (let flat = 5; flat < 20; flat++) {      // ch2-ch4 均试
            const L = genLevel(flat);
            const q = L.quizzes[0];
            const reps = q.pool.map((c, i) => (c.t === 'rep2' || c.t === 'rep3') ? i : -1).filter(i => i >= 0);
            if (reps.length < 2) continue;
            const a = engTapPool(L, reps[0]);
            const n1 = q._prog.length;
            const bres = engTapPool(L, reps[1]);
            out.push({flat: flat, a: a, b: bres, len: q._prog.length, n1: n1});
            if (a === 'placed' && bres === null && q._prog.length === 1) return {ok: true, flat: flat};
            return {ok: false, flat: flat, a: a, b: bres, len: q._prog.length};
          }
          return {ok: false, why: 'no-two-reps'};
        })()""")
        rec('T2 嵌套 rep 放置拒绝（引擎层）', r.get('ok') and not errs2, '%s' % r)

        # T3 救援前缀+尾卡→undo
        r3 = await pg.evaluate("""(() => {
          const L = genLevel(5);
          const q = L.quizzes[0];
          for (const t of q.ref) engTapPool(L, (() => { for (let i = 0; i < q.pool.length; i++) if (!q._used[i] && q.pool[i].t === t) return i; return -1; })());
          if (q._prog.length !== q.ref.length) return {ok: false, why: 'ref-not-full', n: q._prog.length};
          const di = (() => { for (let i = 0; i < q.pool.length; i++) if (q.ref.indexOf(q.pool[i].t) < 0) return i; return -1; })();
          if (di < 0) return {ok: false, why: 'no-distract'};
          engTapPool(L, di);                           // 尾巴多一张
          const rt = rescueTarget(q);
          engTapProg(L, q._prog.length - 1);            // 清尾
          const rt2 = rescueTarget(q);
          return {ok: rt && rt.act === 'undo' && rt.j === q.ref.length && rt2 && rt2.act === 'run',
                  rt: rt, rt2: rt2};
        })()""")
        rec('T3 救援前缀+尾卡→undo（清尾后 run）', r3.get('ok') and not errs2, '%s' % r3)
        await ctx.close()

        # T4 分组框 DOM（真实页：教学 seed→start→放 rep 卡→.pgroup 在场 3 槽）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        await pg.goto('file:///' + (BASE / 'coder2' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(RESUME % 'coder2')
        await pg.reload()
        await pg.wait_for_timeout(2000)
        r4 = await pg.evaluate("""(() => {
          for (let flat = 5; flat < 20; flat++) {
            CD2.start(flat);
            const q = CD2.quiz;
            const ri = q.pool.findIndex(c => c.t === 'rep2' || c.t === 'rep3');
            if (ri < 0) continue;
            CD2.tapPool(ri);
            const grp = document.querySelector('#prog-bar .pgroup');
            const slots = grp ? grp.querySelectorAll('.pslot').length : 0;
            const head = grp ? grp.querySelector('.pslot.full.t-rep2, .pslot.full.t-rep3') : null;
            return {ok: !!grp && slots === 3 && !!head, slots: slots, flat: flat};
          }
          return {ok: false, why: 'no-rep'};
        })()""")
        rec('T4 循环作用域分组框（3 槽+rep 头）', r4.get('ok') and not errs3, '%s' % r4)
        await ctx.close()
        await b.close()

    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
