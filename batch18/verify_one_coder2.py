# -*- coding: utf-8 -*-
"""batch18 独立复验：coder2（断言从 SPEC §1+§0.37 推导；Python 侧独立指令模拟器——
方位角度制+镜面式独立展开语义，禁复用游戏侧 simSteps/expandProg/DIRV）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'coder2' / 'index.html').as_posix() + '?verify=1'
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

# ---- Python 独立指令模拟器（§0.37 分源：方位角度制，独立于游戏侧 DIRV 数值向量） ----
VEC = {0: (0, -1), 90: (1, 0), 180: (0, 1), 270: (-1, 0)}    # 屏幕坐标 y 向下：0=北 90=东 180=南 270=西

def ref_expand(prog):
    """repN 单卡：重复其后紧邻 min(2, 剩余数) 条指令 N 次（SPEC §1 重复块子序列 ≤2 指令）"""
    out, i = [], 0
    while i < len(prog):
        t = prog[i]
        if t in ('rep2', 'rep3'):
            n = 2 if t == 'rep2' else 3
            body = prog[i + 1:i + 1 + min(2, len(prog) - 1 - i)]
            out.extend(body * n)
            i += 1 + len(body)
        else:
            out.append(t)
            i += 1
    return out

def ref_sim(start, prog, walls, W, H):
    """执行展开后程序；左转 -90°/右转 +90°/前进；越界或撞障碍=停撞前格（hit 1/2）"""
    x, y, ang = start['x'], start['y'], start['dir'] * 90
    wset = {(w[0], w[1]) for w in walls}
    hit = 0
    for t in ref_expand(prog):
        if t == 'l':
            ang = (ang - 90) % 360
        elif t == 'r':
            ang = (ang + 90) % 360
        elif t == 'f':
            dx, dy = VEC[ang]
            nx, ny = x + dx, y + dy
            if not (0 <= nx < W and 0 <= ny < H):
                return {'end': (x, y), 'hit': 1}
            if (nx, ny) in wset:
                return {'end': (x, y), 'hit': 2}
            x, y = nx, ny
        else:
            raise ValueError('unknown op ' + t)
    return {'end': (x, y), 'hit': 0}

def ref_solve(pool, start, goal, walls, W, H):
    """池内可解性：multiset 去重全排列枚举 + 叶子 ref_sim 真值验证（池 ≤8 张且类型
    计数重复度高，去重排列数小；rep 展开语义统一在 ref_expand 处理）"""
    from collections import Counter
    cnt = Counter(pc['t'] for pc in pool)

    def perms(c, prog):
        if not any(c.values()):
            yield list(prog)
            return
        for op in sorted(c):
            if c[op] > 0:
                c[op] -= 1
                prog.append(op)
                yield from perms(c, prog)
                prog.pop()
                c[op] += 1

    for prog in perms(Counter(cnt), []):
        ex = ref_expand(prog)
        if len(ex) > 24:
            continue
        if any(t in ('rep2', 'rep3') for t in ex):
            continue          # rep 体内再嵌 rep：SPEC 未定义语义（游戏侧当作 f），非正常解
        r = ref_sim(start, prog, walls, W, H)
        if r['hit'] == 0 and r['end'] == (goal['x'], goal['y']):
            return prog
    return None

RESUME_SEED = """(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {};
  sv.coder2 = { tutSeen: true }; KIDS.store.persist(); })()"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        title = ''
        for _ in range(120):                     # 等 selftest 完成（b17 时序纪律）
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        if 'VERIFY PASS' not in title:
            rec('C-1 selftest 前置完成', False, 'title=%r' % title)
        await pg.wait_for_timeout(800)

        # C1 确定性
        a = await pg.evaluate('CD2.start(7), CD2.quiz')
        bb = await pg.evaluate('CD2.start(7), CD2.quiz')
        rec('C1 确定性', a == bb, '')

        # C2/C3/C4/C6 40 关全量分源审计（§0.37：池内可解+展开 ≤24+界内+sig 互异）
        bad = {'solve': [], 'steps': [], 'sim': [], 'sig': [], 'ch': []}
        from collections import Counter
        for flat in range(20):
            await pg.evaluate('CD2.start(%d)' % flat)
            ch = (await pg.evaluate('CD2.currentLevel'))['ch']
            sigs = []
            for qi in range(5):
                q = await pg.evaluate('CD2.quiz')
                if q is None:
                    bad['sig'].append('flat%d q%d None' % (flat, qi)); break
                sol = ref_solve(q['pool'], q['start'], q['goal'], q['walls'], q['W'], q['H'])
                if sol is None:
                    bad['solve'].append('flat%d q%d' % (flat, qi)); continue
                r = ref_sim(q['start'], sol, q['walls'], q['W'], q['H'])
                if r['hit'] != 0 or r['end'] != (q['goal']['x'], q['goal']['y']):
                    bad['sim'].append('flat%d q%d %s' % (flat, qi, r))
                if len(ref_expand(sol)) > 24:
                    bad['steps'].append('flat%d q%d n=%d' % (flat, qi, len(ref_expand(sol))))
                # 章型：ch1 无循环块（SPEC §1）
                if ch == 1 and any(t in ('rep2', 'rep3') for t in q['pool']):
                    bad['ch'].append('flat%d q%d ch1 池含循环' % (flat, qi))
                sigs.append(str((q['start']['x'], q['start']['y'], q['start']['dir'],
                                 q['goal']['x'], q['goal']['y'], sorted(map(str, q['walls'])),
                                 sorted(pc['t'] for pc in q['pool']))))
                # 推进：先等可交互（换题庆祝窗 locked，runState 回 idle——否则编排被吞=假卡死）
                for _ in range(80):
                    qn = await pg.evaluate('CD2.quiz')
                    if qn and qn.get('runState') == 'idle':
                        break
                    await pg.wait_for_timeout(120)
                # Python 解逐卡 tapPool（池按类型计数编排）→run→轮询换题
                idx_by_t = {}
                for pi, pc in enumerate(q['pool']):
                    idx_by_t.setdefault(pc['t'], []).append(pi)
                ok_place = True
                for t in sol:
                    if not idx_by_t.get(t):
                        ok_place = False; break
                    await pg.evaluate('CD2.tapPool(%d)' % idx_by_t[t].pop())
                    await pg.wait_for_timeout(60)
                if ok_place:
                    await pg.evaluate('CD2.run(), 0')
                    adv = False
                    for _ in range(80):
                        await pg.wait_for_timeout(150)
                        qn = await pg.evaluate('CD2.quiz')
                        if qn is None or qn['step'] != q['step']:
                            adv = True; break
                    if not adv:
                        bad['sim'].append('flat%d q%d 推进卡死' % (flat, qi))
                else:
                    bad['sim'].append('flat%d q%d 池张数不足' % (flat, qi))
            if len(set(sigs)) != 5:
                bad['sig'].append('flat%d sig 重复' % flat)
        rec('C2 §0.37 池内可解（Python DFS）', not bad['solve'], bad['solve'][:3])
        rec('C3 独立模拟到达+run 推进', not bad['sim'], bad['sim'][:3])
        rec('C4 展开 ≤24 基本步', not bad['steps'], bad['steps'][:3])
        rec('C5 ch1 无循环块（章型）', not bad['ch'], bad['ch'][:3])
        rec('C6 同关 5 题 sig 互异', not bad['sig'], bad['sig'][:3])
        rec('C0 页面零 pageerror', not errs, '%s' % errs[:2])

        # C7 行为：错程序 run=miss+1 零惩罚回起点可改；tapProg 退回
        await pg.evaluate('CD2.start(0)')
        q = await pg.evaluate('CD2.quiz')
        m0 = q['miss']
        # 编排一个明显错的程序：池里取 1 张 f（若首张是 rep 也行——随便放一张再 run）
        await pg.evaluate('CD2.tapPool(0)')
        await pg.wait_for_timeout(80)
        pl = await pg.evaluate('CD2.quiz')
        if pl['prog'] and any(x for x in pl['prog']):
            await pg.evaluate('CD2.run(), 0')
            for _ in range(60):
                await pg.wait_for_timeout(150)
                qn = await pg.evaluate('CD2.quiz')
                if qn and qn.get('runState') in (None, 'idle', ''):
                    break
            q2 = await pg.evaluate('CD2.quiz')
            # SPEC §1「可改程序」=可退回重排（C8 验 tapProg），不要求自动清空
            rec('C7 错程序 miss+1 零惩罚', q2 and q2['miss'] == m0 + 1,
                'm=%s→%s prog=%s' % (m0, q2['miss'] if q2 else None, q2['prog'] if q2 else None))
        else:
            rec('C7 错程序 miss+1+程序清空可重排', False, 'tapPool 未入卡 prog=%s' % pl['prog'])
        # tapProg 退回
        await pg.evaluate('CD2.start(0)')
        q = await pg.evaluate('CD2.quiz')
        await pg.evaluate('CD2.tapPool(0)')
        await pg.wait_for_timeout(80)
        q1 = await pg.evaluate('CD2.quiz')
        used_slots = [i for i, v in enumerate(q1['prog'] or []) if v]
        if used_slots:
            await pg.evaluate('CD2.tapProg(%d)' % used_slots[0])
            await pg.wait_for_timeout(80)
            q2 = await pg.evaluate('CD2.quiz')
            n2 = sum(1 for v in (q2['prog'] or []) if v)
            rec('C8 tapProg 退回指令', n2 == len(used_slots) - 1, '%d→%d' % (len(used_slots), n2))
        else:
            rec('C8 tapProg 退回指令', False, '无已用槽')

        await ctx.close()

        # C9 救援 14s 计数（真实页）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        await pg.goto('file:///' + (BASE / 'coder2' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(RESUME_SEED)
        await pg.reload()
        await pg.wait_for_timeout(2000)
        r0 = await pg.evaluate('CD2.rescues')
        await pg.evaluate('CD2.start(1)')
        await pg.wait_for_timeout(16500)
        r1 = await pg.evaluate('CD2.rescues')
        rec('C9 救援 14s 计数（真实页）', r1 >= r0 + 1 and not errs2, 'rescues=%s→%s errs=%s' % (r0, r1, errs2[:1]))
        await ctx.close()
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
