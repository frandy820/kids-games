# -*- coding: utf-8 -*-
"""batch17 独立复验：mirrormaze r14 轴向族（断言全部从 SPEC-BATCH17 §6+§0.36 推导，
Python 侧第三源独立闭式代数 T 复算六 kind（v/h/d1/d2/pv·ph/vv/r180），禁复用游戏侧函数；
结构/公平性/周期反相/双镜复合/反启发式锚/时长模型/行为分源断言）"""
import asyncio, io, json, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'mirrormaze' / 'index.html').as_posix() + '?verify=1'
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

# ---- Python 独立真值（第三源闭式代数 T——SPEC §6 镜射变换群真值表逐 kind 直译） ----
def ref_t(kind, x, y, k1=0, k2=0):
    if kind == 'v':    return (3 - x, y)                      # 竖直居中（4×4）
    if kind == 'h':    return (x, 3 - y)                      # 水平居中（4×4）
    if kind == 'd1':   return (y, x)                          # 主对角 x=y（5×5，对合）
    if kind == 'd2':   return (4 - y, 4 - x)                  # 反对角 x+y=4（5×5，对合）
    if kind == 'pv':   return (5 - x, y)                      # 6×6 竖直 K=5
    if kind == 'ph':   return (x, 5 - y)                      # 6×6 水平 L=5
    if kind == 'vv':   return (x + (k2 - k1), y)              # 双平行镜复合=平移 k2-k1（恒等式）
    if kind == 'r180': return (5 - x, 5 - y)                  # 双垂直镜复合=转 180°（交换律）
    return None

REF_W = {'v': 4, 'h': 4, 'd1': 5, 'd2': 5, 'pv': 6, 'ph': 6, 'vv': 6, 'r180': 6}
REF_TGT = {'v': (3, 4), 'h': (3, 4), 'd1': (4, 5), 'd2': (4, 5),
           'pv': (6, 6), 'ph': (6, 6), 'vv': (4, 6), 'r180': (4, 6)}
KINDS_OF_DCH = {1: ('v', 'h'), 2: ('d1', 'd2'), 3: ('pv', 'ph'), 4: ('vv', 'r180')}
PALETTE = {'#E8975A', '#8FBF7F', '#C98B9B'}
# 时长模型独立副本（r14 §6 定版；全字符口径 estMs）
EST = lambda n: n * 345 + 600
DECIDE = {'v': 4000, 'h': 5500, 'd1': 7500, 'd2': 7500, 'pv': 8000, 'ph': 8000, 'vv': 10000, 'r180': 9500}
ADV_STEP, ADV_QUIZ, ENTER, STAGE, LEVEL_MIN = 600, 7 * 345 + 600, 400, 400, 40000
D_MIN_EXACT = 93275        # 40 关实测最低（flat0 全 v 关 17 格；防回漂精确锚）

def py_dur(L):
    s = 0
    for q in L['quizzes']:
        for k in range(len(q['targets'])):
            s += max(ENTER if k == 0 else STAGE, DECIDE[q['kind']]) + ADV_STEP
        s += ADV_QUIZ
    return s

def ans_sig(q):
    src = [c for c in q['given'] if c['role'] == 'src']
    xs = [c['x'] for c in src]
    ys = [c['y'] for c in src]
    side = ''
    if q['kind'] == 'v':  side = 'L' if max(xs) <= 1 else 'R'
    if q['kind'] == 'h':  side = 'T' if max(ys) <= 1 else 'B'
    if q['kind'] == 'pv': side = 'A' if max(xs) <= 1 else 'B'
    if q['kind'] == 'ph': side = 'A' if max(ys) <= 1 else 'B'
    if q['kind'] == 'vv': side = 'L' if (q['axis']['k2'] - q['axis']['k1']) > 0 else 'R'
    ax = ':%s,%s' % (q['axis'].get('k1'), q['axis'].get('k2')) if q['kind'] == 'vv' else ''
    return q['kind'] + ax + ':' + side

def audit_quiz(dch, q, whys, tag):
    kind = q['kind']
    if kind not in KINDS_OF_DCH[dch]:
        whys.append('%s kind %s 不属 dch%d' % (tag, kind, dch)); return
    if q['W'] != REF_W[kind] or q['H'] != REF_W[kind]:
        whys.append('%s 盘面 %sx%s' % (tag, q['W'], q['H']))
    seen = set()
    n_src = n_axis = 0
    for c in q['given']:
        p = (c['x'], c['y'])
        if not (0 <= c['x'] < q['W'] and 0 <= c['y'] < q['H']):
            whys.append('%s given 越界 %s' % (tag, p))
        if c['c'] not in PALETTE:
            whys.append('%s 色域 %s' % (tag, c['c']))
        if p in seen:
            whys.append('%s given 重复 %s' % (tag, p))
        seen.add(p)
        if c['role'] == 'src': n_src += 1
        elif c['role'] == 'axis': n_axis += 1
        else: whys.append('%s role 非法' % tag)
    # 公平性不变式+targets 分源复算（坐标/色/sx/sy 多重集精确匹配）
    exp = {}
    for c in q['given']:
        if c['role'] != 'src':
            T = ref_t(kind, c['x'], c['y'], q['axis'].get('k1', 0), q['axis'].get('k2', 0))
            if T != (c['x'], c['y']):
                whys.append('%s axis 非自映 %s' % (tag, (c['x'], c['y'])))
            continue
        T = ref_t(kind, c['x'], c['y'], q['axis'].get('k1', 0), q['axis'].get('k2', 0))
        exp[(T[0], T[1], c['c'], c['x'], c['y'])] = exp.get((T[0], T[1], c['c'], c['x'], c['y']), 0) + 1
    got = {}
    for t in q['targets']:
        k = (t['x'], t['y'], t['c'], t['sx'], t['sy'])
        got[k] = got.get(k, 0) + 1
        if not (0 <= t['x'] < q['W'] and 0 <= t['y'] < q['H']):
            whys.append('%s target 越界 %s' % (tag, (t['x'], t['y'])))
        if (t['x'], t['y']) in seen:
            whys.append('%s target 与 given 重叠 %s' % (tag, (t['x'], t['y'])))
    if exp != got:
        whys.append('%s targets 分源不符' % tag)
    lo, hi = REF_TGT[kind]
    if not (lo <= len(q['targets']) <= hi):
        whys.append('%s 补格数 %d 越域' % (tag, len(q['targets'])))
    src = [c for c in q['given'] if c['role'] == 'src']
    # 章别源侧结构
    if dch == 1:
        if n_axis: whys.append('%s ch1 含 axis 格' % tag)
        if kind == 'v' and any(c['x'] > 1 for c in src): whys.append('%s v 源非左半' % tag)
        if kind == 'h' and any(c['y'] > 1 for c in src): whys.append('%s h 源非上半' % tag)
    if dch == 2:
        if not 1 <= n_axis <= 2: whys.append('%s ch2 轴上格 %d' % (tag, n_axis))
        if kind == 'd1':
            if any(c['y'] <= c['x'] for c in src): whys.append('%s d1 源非 y>x' % tag)
            if any(c['x'] != c['y'] for c in q['given'] if c['role'] == 'axis'): whys.append('%s d1 轴格非 x=y' % tag)
        else:
            if any(c['x'] + c['y'] >= 4 for c in src): whys.append('%s d2 源非 x+y<4' % tag)
            if any(c['x'] + c['y'] != 4 for c in q['given'] if c['role'] == 'axis'): whys.append('%s d2 轴格非 x+y=4' % tag)
    if dch == 3:
        if n_axis: whys.append('%s ch3 含 axis 格' % tag)
        ph = {0: None, 1: None}
        for c in src:                              # 周期棋盘格：同相位恒同色/异相位恒异色
            p = (c['x'] + c['y']) % 2
            if ph[p] is None: ph[p] = c['c']
            elif ph[p] != c['c']: whys.append('%s 相位色不一致' % tag)
        if not ph[0] or not ph[1] or ph[0] == ph[1]: whys.append('%s 非双色棋盘格' % tag)
        for t in q['targets']:                     # 周期反相：位置相位与源格相位互反（续延必错）
            if (t['x'] + t['y']) % 2 == (t['sx'] + t['sy']) % 2:
                whys.append('%s 周期同相' % tag)
        if kind == 'pv':
            band = (0, 1) if max(c['x'] for c in src) <= 1 else (4, 5)
            if any(not (band[0] <= c['x'] <= band[1]) for c in src): whys.append('%s pv 源带' % tag)
        else:
            band = (0, 1) if max(c['y'] for c in src) <= 1 else (4, 5)
            if any(not (band[0] <= c['y'] <= band[1]) for c in src): whys.append('%s ph 源带' % tag)
    if dch == 4:
        if n_axis: whys.append('%s ch4 含 axis 格' % tag)
        if kind == 'vv':
            d = q['axis']['k2'] - q['axis']['k1']
            if any(t['x'] - t['sx'] != d for t in q['targets']): whys.append('%s vv 平移≠Δ' % tag)
            x0 = 0 if d > 0 else 4
            if any(not (x0 <= c['x'] <= x0 + 1) for c in src): whys.append('%s vv 源带' % tag)
        else:
            if any(c['x'] > 2 for c in src): whys.append('%s r180 源带非 cols0-2' % tag)
            if any((t['x'], t['y']) != (5 - t['sx'], 5 - t['sy']) for t in q['targets']): whys.append('%s r180 非转半圈' % tag)

def find_empty(q):
    occ = {(c['x'], c['y']) for c in q['given']} | {(t['x'], t['y']) for t in q['targets']}
    for y in range(q['H']):
        for x in range(q['W']):
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
        # 等 verify selftest 完全跑完（title=VERIFY PASS）再审计——selftest 异步调 MM.start
        # 会与外部审计互踩换 cur（测试侧时序，b17 旧根因）
        title = ''
        for _ in range(120):
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        rec('M-1 页面 selftest 前置完成（VERIFY PASS）', 'VERIFY PASS' in title, 'title=%r' % title)
        await pg.wait_for_timeout(800)

        # M1 确定性：同 flat 两次 genLevel JSON 一致
        a = await pg.evaluate('JSON.stringify(genLevel(7))')
        bb = await pg.evaluate('JSON.stringify(genLevel(7))')
        rec('M1 确定性（同 flat 一致）', a == bb, '')

        # M2 40 关全量分源审计（Python 第三源闭式代数 T 复算六 kind+公平性+周期+双镜+锚+时长）
        whys = []
        tpl_sigs = {}
        side_seen = {'pv': set(), 'ph': set()}
        d_min, d_flat = None, None
        parity_bad = 0
        for flat in range(40):
            L = await pg.evaluate('genLevel(%d)' % flat)
            dch = L['dch']
            if flat < 20 and dch != (L['ch'] - 1) % 4 + 1:
                whys.append('flat%d 静态章映射 dch=%s' % (flat, dch))
            if len(L['quizzes']) != 5:
                whys.append('flat%d 题数 %d' % (flat, len(L['quizzes'])))
            sigs = set()
            for qi, q in enumerate(L['quizzes']):
                audit_quiz(dch, q, whys, 'flat%d-q%d' % (flat, qi))
                ax = ':%s,%s' % (q['axis'].get('k1'), q['axis'].get('k2')) if q['kind'] == 'vv' else ''
                sigs.add((q['kind'], ax, tuple(sorted((c['x'], c['y'], c['c']) for c in q['given']))))
                if q.get('tpl', -1) >= 0:
                    tpl_sigs.setdefault((q['kind'], q['tpl']), set()).add(ans_sig(q))
                if q['kind'] in ('pv', 'ph'):
                    side_seen[q['kind']].add(q['side'])
            if len(sigs) != 5:
                whys.append('flat%d 同关 sig 重复' % flat)
            # 时长模型：Python 独立副本复算+与源模型逐关对账（第三源 parity）
            pd = py_dur(L)
            if d_min is None or pd < d_min:
                d_min, d_flat = pd, flat
            src_d = await pg.evaluate('levelDurMs(genLevel(%d))' % flat)
            if src_d != pd:
                parity_bad += 1
        anchor_n = sum(1 for v in tpl_sigs.values() if len(v) >= 2)
        # r14 审查 M-2 修复：判据从关键词过滤改全量——audit_quiz push 的任何 why（含色域/given 重复/
        # role 非法/target 重叠/target 重复/含 axis 格等旧漏网类）都 FAIL；detail 仅作分段展示
        rec('M2 六 kind 闭式 T 分源对账 40 关×5 题（全量 why 判据——含公平性/周期反相/双镜）',
            not whys, 'whys=%d %s' % (len(whys), whys[:3]))
        rec('M3 章域/源带/结构（全量 why 判据——章映射/题数/sig/色域/role/重叠/重复）',
            not whys, 'whys=%d %s' % (len(whys), whys[:3]))
        rec('M4 反启发式锚（≥2 答案签名模板 ≥5）+pv/ph 双向覆盖',
            anchor_n >= 5 and side_seen['pv'] == {'A', 'B'} and side_seen['ph'] == {'A', 'B'},
            'anchor=%s pv=%s ph=%s' % (anchor_n, sorted(side_seen['pv']), sorted(side_seen['ph'])))
        rec('M5 时长模型（40 关 modeled ≥40000+最低 93275 精确+与源模型逐关对账）',
            d_min == D_MIN_EXACT and d_min >= LEVEL_MIN and parity_bad == 0,
            'min=%s@flat%s parity_bad=%s' % (d_min, d_flat, parity_bad))
        rec('M0 页面零 pageerror', not errs, str(errs[:2]))

        # M6 tapCell 行为：错点=miss+1 不点亮；点对=step+1；重点已亮=null 不再计；越界 false
        await pg.evaluate('MM.start(0)')
        q = await pg.evaluate('MM.quiz')
        wrong = find_empty(q)
        m0 = q['miss']; st0 = q['step']
        await pg.evaluate('MM.tapCell(%d, %d)' % wrong)
        await pg.wait_for_timeout(700)
        q1 = await pg.evaluate('MM.quiz')
        m1, st1 = q1['miss'], q1['step']
        t0 = q1['targets'][0]
        await pg.evaluate('MM.tapCell(%d, %d)' % (t0['x'], t0['y']))
        await pg.wait_for_timeout(300)
        q2 = await pg.evaluate('MM.quiz')
        st2 = q2['step'] if q2 else None
        done_tap = await pg.evaluate('MM.quiz ? MM.tapCell(%d, %d) : "NQ"' % (t0['x'], t0['y']))
        oob = await pg.evaluate('MM.tapCell(99, 0)')
        rec('M6 错点计 miss 不点亮/对点点亮/重点不再计/越界 false',
            m1 == m0 + 1 and st1 == st0 and st2 == st1 + 1 and done_tap in (None, False, 'NQ') and oob is False,
            'miss=%s→%s step=%s→%s→%s retap=%s oob=%s' % (m0, m1, st0, st1, st2, done_tap, oob))

        # M7 轴向语音分流：flat0 v=mm_wrong 必播 / flat5 d1·d2=mm_wrong2（spy 捕获）
        vlog = await pg.evaluate("""(async () => {
          const log = [];
          const op = KIDS.voice.play;
          KIDS.voice.play = k => log.push(String(k));
          MM.start(0);
          let q = MM.quiz; let w = null;
          const occ = new Set(q.given.map(c => c.x + ',' + c.y).concat(q.targets.map(t => t.x + ',' + t.y)));
          for (let y = 0; y < q.H && !w; y++) for (let x = 0; x < q.W; x++) if (!occ.has(x + ',' + y)) { w = [x, y]; break; }
          MM.tapCell(w[0], w[1]);                       // flat0 v 轴 → mm_wrong
          await new Promise(r => setTimeout(r, 400));
          MM.start(5);
          q = MM.quiz; w = null;
          const occ2 = new Set(q.given.map(c => c.x + ',' + c.y).concat(q.targets.map(t => t.x + ',' + t.y)));
          for (let y = 0; y < q.H && !w; y++) for (let x = 0; x < q.W; x++) if (!occ2.has(x + ',' + y)) { w = [x, y]; break; }
          MM.tapCell(w[0], w[1]);                       // flat5 斜轴 → mm_wrong2
          await new Promise(r => setTimeout(r, 400));
          KIDS.voice.play = op;
          return {log: log, kind5: q.kind};
        })()""")
        rec('M7 轴向语音分流（v=mm_wrong / 斜轴=mm_wrong2）',
            'mm_wrong' in vlog['log'] and 'mm_wrong2' in vlog['log'] and vlog['kind5'] in ('d1', 'd2'),
            str(vlog))

        # M8 autoSolve 通关（flat15 ch4 双镜复合：hook 驱动全通路）
        r15 = await pg.evaluate('MM.start(15), MM.autoSolve()')
        rec('M8 flat15 autoSolve 通关（双镜 5 题全解）',
            r15 and r15['done'] and r15['ok'] and r15['quizzes'] == 5, str(r15))

        await ctx.close()

        # M9 救援 14s（真实页：verify 页 interval 被 VERIFY 门禁——seed tutSeen 跳教学+start(1) idle）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        await pg.goto('file:///' + (BASE / 'mirrormaze' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {};
          sv.mirrormaze = { tutSeen: true }; KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(2000)
        r0 = await pg.evaluate('MM.rescues')
        await pg.evaluate('MM.start(1)')
        await pg.wait_for_timeout(16500)
        r1 = await pg.evaluate('MM.rescues')
        rec('M9 救援 14s 计数（真实页）', r1 >= r0 + 1 and not errs2, 'rescues=%s→%s errs=%s' % (r0, r1, errs2[:1]))
        await ctx.close()
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
