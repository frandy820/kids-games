# -*- coding: utf-8 -*-
"""batch18 独立复验：bounce（断言从 SPEC §3+§0.39 推导；Python 侧独立反射模拟器——
镜面反射公式 v'=v-2(v·n)n 物理推导（H 墙 v'=(dx,-dy)/V 墙 (-dx,dy)/D+ (dy,dx)/D- (-dy,-dx)），
禁复用游戏侧 simShot/wallKind/buildOcc）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'bounce' / 'index.html').as_posix() + '?verify=1'
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

# ---- Python 独立反射模拟器（§0.39 分源） ----
def wall_pts(w):
    sx = (w['x2'] > w['x1']) - (w['x2'] < w['x1'])
    sy = (w['y2'] > w['y1']) - (w['y2'] < w['y1'])
    n = max(abs(w['x2'] - w['x1']), abs(w['y2'] - w['y1']))
    return [(w['x1'] + sx * k, w['y1'] + sy * k) for k in range(n + 1)]

def wall_kind(w):
    dx, dy = w['x2'] - w['x1'], w['y2'] - w['y1']
    if dx == 0:
        return 'V'
    if dy == 0:
        return 'H'
    return 'D+' if (dx > 0) == (dy > 0) else 'D-'

def ref_sim(W, H, ball, dirn, holes, max_bounce=8, max_steps=80):
    """格点反弹：到点先查洞（捕获即止），后按该点墙反射；边界恒反弹；贴墙滑不计反弹"""
    hmap = {(h['x'], h['y']): i for i, h in enumerate(holes)}
    occ = {}
    for w in walls_cache:
        for pt in wall_pts(w):
            occ.setdefault(pt, []).append(wall_kind(w))
    x, y, (dx, dy) = ball['x'], ball['y'], dirn
    bounces = 0
    for _ in range(max_steps):
        if (x, y) in hmap:
            return {'outcome': 'hole', 'holeIdx': hmap[(x, y)], 'bounces': bounces}
        ndx, ndy = dx, dy
        if x == 0 or x == W:
            ndx = -ndx
        if y == 0 or y == H:
            ndy = -ndy
        for kk in occ.get((x, y), ()):
            if kk == 'H':
                ndy = -ndy
            elif kk == 'V':
                ndx = -ndx
            elif kk == 'D+':
                ndx, ndy = ndy, ndx
            else:
                ndx, ndy = -ndy, -ndx
        if (ndx, ndy) != (dx, dy):
            if bounces >= max_bounce:
                return {'outcome': 'limit', 'holeIdx': -1, 'bounces': bounces}
            bounces += 1
            dx, dy = ndx, ndy
        x, y = x + dx, y + dy
        if not (0 <= x <= W and 0 <= y <= H):
            return {'outcome': 'out', 'holeIdx': -1, 'bounces': bounces}
    return {'outcome': 'steps', 'holeIdx': -1, 'bounces': bounces}

walls_cache = []

RESUME_SEED = """(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {};
  sv.bounce = { tutSeen: true }; KIDS.store.persist(); })()"""

async def main():
    global walls_cache
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
            rec('B-1 selftest 前置完成', False, 'title=%r' % title)
        await pg.wait_for_timeout(800)

        # B1 确定性
        a = await pg.evaluate('BC.start(7), BC.quiz')
        bb = await pg.evaluate('BC.start(7), BC.quiz')
        rec('B1 确定性', a == bb, '')

        # B2/B3/B4/B6 40 关全量分源审计（§0.39 洞唯一命中+章号反弹数+斜墙+sig）
        bad = {'uniq': [], 'bnc': [], 'diag': [], 'sig': [], 'stuck': []}
        want_b = {1: 1, 2: 2, 3: 3}
        for flat in range(20):
            await pg.evaluate('BC.start(%d)' % flat)
            ch = (await pg.evaluate('BC.currentLevel'))['ch']
            sigs = []
            for qi in range(5):
                q = await pg.evaluate('BC.quiz')
                if q is None:
                    bad['sig'].append('flat%d q%d None' % (flat, qi)); break
                walls_cache = q['walls']
                # answer 方向模拟：必入洞 h_ans
                ra = ref_sim(q['W'], q['H'], q['ball'], q['dirs'][q['answer']], q['holes'])
                if ra['outcome'] != 'hole':
                    bad['uniq'].append('flat%d q%d answer 不入洞 %s' % (flat, qi, ra['outcome'])); continue
                h_ans = ra['holeIdx']
                # 干扰方向禁入正确洞（§0.39 唯一命中）
                for di in range(len(q['dirs'])):
                    if di == q['answer']:
                        continue
                    ri_ = ref_sim(q['W'], q['H'], q['ball'], q['dirs'][di], q['holes'])
                    if ri_['outcome'] == 'hole' and ri_['holeIdx'] == h_ans:
                        bad['uniq'].append('flat%d q%d 干扰%d 同洞' % (flat, qi, di))
                # 章号反弹数（ch1=1/ch2=2/ch3=3；ch4 ≥1）
                if ch in want_b and ra['bounces'] != want_b[ch]:
                    bad['bnc'].append('flat%d q%d ch%d b=%d' % (flat, qi, ch, ra['bounces']))
                if ch == 4 and ra['bounces'] < 1:
                    bad['bnc'].append('flat%d q%d ch4 b=%d' % (flat, qi, ra['bounces']))
                # ch3 斜墙在场
                if ch == 3 and not any(wall_kind(w).startswith('D') for w in q['walls']):
                    bad['diag'].append('flat%d q%d' % (flat, qi))
                sigs.append(str((q['ball']['x'], q['ball']['y'],
                                 sorted((h['x'], h['y']) for h in q['holes']),
                                 sorted((w['x1'], w['y1'], w['x2'], w['y2']) for w in q['walls']),
                                 sorted(map(tuple, q['dirs'])))))
                # 推进：先等可交互（换题庆祝窗 locked 释放，phase 回 aim——否则 tap 被吞=假卡死）
                for _ in range(80):
                    qn = await pg.evaluate('BC.quiz')
                    if qn and qn.get('phase') == 'aim':
                        break
                    await pg.wait_for_timeout(120)
                await pg.evaluate('BC.tapDir(%d), 0' % q['answer'])
                adv = False
                for _ in range(80):
                    await pg.wait_for_timeout(150)
                    qn = await pg.evaluate('BC.quiz')
                    if qn is None or qn['step'] != q['step']:
                        adv = True; break
                if not adv:
                    bad['stuck'].append('flat%d q%d' % (flat, qi))
            if len(set(sigs)) != 5:
                bad['sig'].append('flat%d sig 重复' % flat)
        rec('B2 §0.39 洞唯一命中（独立模拟器）', not bad['uniq'], bad['uniq'][:3])
        rec('B3 answer 路径推进', not bad['stuck'], bad['stuck'][:3])
        rec('B4 章号反弹数（1/2/3，ch4≥1）', not bad['bnc'], bad['bnc'][:3])
        rec('B5 ch3 斜墙在场', not bad['diag'], bad['diag'][:3])
        rec('B6 同关 5 题 sig 互异', not bad['sig'], bad['sig'][:3])
        rec('B0 页面零 pageerror', not errs, '%s' % errs[:2])

        # B7 行为：错方向 tapDir=miss+1 零惩罚可重点
        await pg.evaluate('BC.start(0)')
        q = await pg.evaluate('BC.quiz')
        walls_cache = q['walls']
        wrong = None
        for di in range(len(q['dirs'])):
            if di == q['answer']:
                continue
            r = ref_sim(q['W'], q['H'], q['ball'], q['dirs'][di], q['holes'])
            if r['outcome'] != 'hole':
                wrong = di; break
        if wrong is None:
            wrong = 0 if q['answer'] != 0 else 1
        m0 = q['miss']
        await pg.evaluate('BC.tapDir(%d), 0' % wrong)
        miss_seen = m0
        for _ in range(60):
            await pg.wait_for_timeout(150)
            qn = await pg.evaluate('BC.quiz')
            if qn and qn['miss'] > miss_seen:
                miss_seen = qn['miss']
                break
        q2 = await pg.evaluate('BC.quiz')
        rec('B7 错方向 miss+1 可重点', q2 and miss_seen == m0 + 1 and q2['miss'] == m0 + 1,
            'm=%s→%s' % (m0, miss_seen))

        await ctx.close()

        # B8 救援 14s 计数（真实页）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        await pg.goto('file:///' + (BASE / 'bounce' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(RESUME_SEED)
        await pg.reload()
        await pg.wait_for_timeout(2000)
        r0 = await pg.evaluate('BC.rescues')
        await pg.evaluate('BC.start(1)')
        await pg.wait_for_timeout(16500)
        r1 = await pg.evaluate('BC.rescues')
        rec('B8 救援 14s 计数（真实页）', r1 >= r0 + 1 and not errs2, 'rescues=%s→%s errs=%s' % (r0, r1, errs2[:1]))
        await ctx.close()
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
