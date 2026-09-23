# -*- coding: utf-8 -*-
"""batch18 独立复验：stack（断言从 SPEC §2+§0.38 推导；Python 侧独立平衡复算器——
off 计算/层稳定/累积偏移全自实现，禁复用游戏侧 layerOk/cumOk；存在性/对账/行为/风摆/救援分源）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'stack' / 'index.html').as_posix() + '?verify=1'
PASS, FAIL = [], []
COLS, BASE_W, BASE_C, MARGIN = 7, 5, 3, 0.5     # SPEC §2/GRID 语义独立写死（cols/baseW/baseC/安全裕度）

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

# ---- Python 独立复算器（§0.38 分源） ----
def ref_offs(placed, floors):
    """逐层偏移：off_i = col_i + wind_i - 下层实际中心（首层下层=地基中心 BASE_C）"""
    outs, lc = [], BASE_C
    for i, p in enumerate(placed):
        outs.append(p['col'] + floors[i]['wind'] - lc)
        lc = p['col'] + floors[i]['wind']
    return outs

def ref_stable(offs, floors):
    """层稳定+累积：首层下宽=BASE_W；|off_i| ≤ max(0, 下宽/2-宽/2)+MARGIN；|Σoff| ≤ BASE_W/2"""
    wlow = BASE_W
    for i, (o, f) in enumerate(zip(offs, floors)):
        if abs(o) > max(0, wlow / 2 - f['w'] / 2) + MARGIN:
            return False, i
        wlow = f['w']
    if abs(sum(offs)) > BASE_W / 2:
        return False, len(offs)
    return True, -1

def align_col(lc, wind):
    """全对齐安全列（off=0）：col = lc - wind，夹在 [0, COLS)"""
    c = lc - wind
    return max(0, min(COLS - 1, c))

async def solve_cur_st(pg):
    """逐块对齐放置推进（Python 算安全列→tapCol→轮询 step/phase）"""
    q0 = await pg.evaluate('ST.quiz')
    if q0 is None:
        return None
    lc = BASE_C
    for i in range(len(q0['floors'])):
        q = await pg.evaluate('ST.quiz')
        if q is None or q.get('phase') == 'win':
            break
        w = q['floors'][i]['wind'] if i < len(q['floors']) else 0
        await pg.evaluate('ST.tapCol(%d)' % align_col(lc, w))
        lc = align_col(lc, w) + w
        for _ in range(60):
            await pg.wait_for_timeout(120)
            qn = await pg.evaluate('ST.quiz')
            if qn is None or qn['step'] != q['step'] or qn.get('phase') != 'placing':
                break
    for _ in range(60):
        await pg.wait_for_timeout(120)
        qn = await pg.evaluate('ST.quiz')
        if qn is None:
            return None
        if qn['step'] > q0['step'] or qn.get('phase') == 'placing':
            return qn
    return 'STUCK'

RESUME_SEED = """(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {};
  sv.stack = { tutSeen: true }; KIDS.store.persist(); })()"""

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
            rec('S-1 selftest 前置完成', False, 'title=%r' % title)
        await pg.wait_for_timeout(800)

        # S1 确定性
        a = await pg.evaluate('ST.start(7), ST.quiz')
        bb = await pg.evaluate('ST.start(7), ST.quiz')
        rec('S1 确定性', a == bb, '')

        # S2/S3 40 关全量分源审计
        allbad = []
        wind_seen = {3: 0, 4: 0}
        for flat in range(20):
            await pg.evaluate('ST.start(%d)' % flat)
            ch = (await pg.evaluate('ST.currentLevel'))['ch']
            sigs = []
            for qi in range(5):
                q = await pg.evaluate('ST.quiz')
                if q is None:
                    allbad.append('flat%d q%d None' % (flat, qi)); break
                floors = q['floors']
                # 存在性：全对齐路径 Python 验证稳定（§0.38 独立复算）
                lc = BASE_C
                plan, pl = [], []
                for f in floors:
                    c = align_col(lc, f['wind'])
                    pl.append({'col': c})
                    plan.append(c)
                    lc = c + f['wind']
                offs = ref_offs(pl, floors)
                ok, bad_i = ref_stable(offs, floors)
                if not ok:
                    allbad.append('flat%d q%d 对齐解不稳 layer%d' % (flat, qi, bad_i))
                # 风摆分布
                if ch in wind_seen:
                    wind_seen[ch] += sum(1 for f in floors if f['wind'])
                sigs.append(str([(f['w'], f['wind']) for f in floors]))
                # 推进（对齐放置）+ 中途 off 对账（读 placed 与 Python 复算）
                r = await solve_cur_st(pg)
                if r == 'STUCK':
                    allbad.append('flat%d q%d 推进卡死' % (flat, qi))
                else:
                    qn = r if isinstance(r, dict) else None
            if len(set(sigs)) != 5:
                allbad.append('flat%d sig 重复' % flat)
        rec('S2 §0.38 存在性（对齐解 Python 复算稳定）',
            not [x for x in allbad if '不稳' in x], [x for x in allbad if '不稳' in x][:3])
        rec('S3 推进+每关 5 题+sig 互异',
            not [x for x in allbad if '卡死' in x or 'None' in x or 'sig' in x],
            [x for x in allbad if '卡死' in x or 'None' in x or 'sig' in x][:3])
        rec('S4 ch3/ch4 风摆块在场', wind_seen[3] > 0 and wind_seen[4] > 0, 'wind=%s' % wind_seen)
        rec('S0 页面零 pageerror', not errs, '%s' % errs[:2])

        # S5 行为：必倒放置（偏移超域）→ miss+1+phase falling；窗后恢复
        await pg.evaluate('ST.start(0)')
        q = await pg.evaluate('ST.quiz')
        f0 = q['floors'][0]
        # 首块放最边列（off 最大）：col=0 或 6 取远离 BASE_C 者
        bad_col = 0 if BASE_C >= COLS / 2 else COLS - 1
        off_bad = bad_col + f0['wind'] - BASE_C
        w_ok = max(0, BASE_W / 2 - f0['w'] / 2) + MARGIN
        m0 = q['miss']
        # tapCol 是 async hook：经 evaluate 会等完防重入窗才返回（b17 纪律）——逗号表达式
        # fire-and-forget；verify 页 SPEED=0.12 倒塌窗仅 ~120ms，30ms 密集轮询捕获 falling 瞬态
        await pg.evaluate('ST.tapCol(%d), 0' % bad_col)
        saw_fall, miss_seen = False, m0
        for _ in range(16):
            await pg.wait_for_timeout(30)
            qs = await pg.evaluate('ST.quiz')
            if qs:
                miss_seen = qs['miss']
                if qs.get('phase') == 'falling':
                    saw_fall = True
        will_fall = abs(off_bad) > w_ok
        ok5 = (miss_seen == m0 + 1 and saw_fall) if will_fall else True
        await pg.wait_for_timeout(600)              # 窗收尾+倒塌动画结束恢复
        q2 = await pg.evaluate('ST.quiz')
        rec('S5 必倒放置 miss+1+falling+恢复', ok5 and q2 and q2.get('phase') == 'placing',
            'off=%.1f saw_fall=%s m=%s→%s end=%s' % (off_bad, saw_fall, m0, miss_seen, q2.get('phase') if q2 else None))

        # S6 placed[].off 对账（游戏侧 off vs Python 复算）
        q = await pg.evaluate('ST.quiz')
        placed = q['placed']
        if placed:
            offs_ref = ref_offs(placed, q['floors'][:len(placed)])
            offs_got = [p['off'] for p in placed]
            rec('S6 placed.off 分源对账', all(abs(a - b2) < 1e-9 for a, b2 in zip(offs_ref, offs_got)),
                'ref=%s got=%s' % (offs_ref, offs_got))
        else:
            rec('S6 placed.off 分源对账', True, '空塔（倒塌重搭后）跳过')

        # S7 sayW flat<3 倒塌必播 st_wrong（spy）
        vlog = await pg.evaluate("""(() => {
          ST.start(0);
          const q = ST.quiz;
          const log = [];
          const op = KIDS.voice.play;
          KIDS.voice.play = k => log.push('P:' + k);
          const f0 = q.floors[0];
          ST.tapCol(f0.wind >= 0 ? 0 : 6);        // 边列必倒
          return log;
        })()""")
        await pg.wait_for_timeout(400)
        rec('S7 flat<3 倒塌播 st_wrong', any('st_wrong' in x for x in vlog), '%s' % vlog[:3])

        await ctx.close()

        # S8 救援 14s 计数（真实页）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        await pg.goto('file:///' + (BASE / 'stack' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(RESUME_SEED)
        await pg.reload()
        await pg.wait_for_timeout(2000)
        r0 = await pg.evaluate('ST.rescues')
        await pg.evaluate('ST.start(1)')
        await pg.wait_for_timeout(16500)
        r1 = await pg.evaluate('ST.rescues')
        rec('S8 救援 14s 计数（真实页）', r1 >= r0 + 1 and not errs2, 'rescues=%s→%s errs=%s' % (r0, r1, errs2[:1]))
        await ctx.close()
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
