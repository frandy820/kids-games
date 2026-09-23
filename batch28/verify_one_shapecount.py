# -*- coding: utf-8 -*-
"""shapecount 独立复验（r3 难度改造 delta 分源）——断言从 SPEC-BATCH28 §0.68 r3 版本块推导，禁从实现行为归纳
S0 selftest 全绿+0 pageerror
S1 题表封闭真值独立对账（40 关×5 题=200 题，Python 独立封闭表）：
   ch1=count 散点 5-10 单形 / ch4=count 近形 5-9+干扰 3-8 和 ≤12 / ch2=grid 满阵 r2-4×c3-5
   tot 10-20 n=r*c / gridmiss tot 12-20 k1-4 总≥10 n=r*c-k（减法独立算术）miss 位置互异界内 /
   dual n3-6 d2-5 和≤12 双干扰在场（同色异形+同形异色 Python 解析组合键独立判）/
   numSet 独立规则复算（t≤2 正侧/3-6 中心/t≥7 下邻域）/ opts 互异含真值 answer=下标 /
   章纯度（dch1 全 count/dch2 全 grid/dch3 两子型 3+2/dch4 ≥2 型）/ 锚点 flat0q0=circle×6
S2 确定性（flat 0/9/15/19/27/39 双读 JSON 全等）
S3 UI 钩子契约（真实 UI 状态机抽验）：SC.quiz 字段与题表一致（rows/cols/miss/dual/drift）/
   越界 tapOpt=null / 错点 wrong+miss / 对点 right 推进 / 漂移钩子标记 dch4=True·ch1-3=False
S4 ch3 两子型交替结构（gm/du 相邻异型=交替排列）+ dual 三键 scene 与 DOM 无关的纯数据对账"""
import asyncio, io, json, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

URL = 'file:///F:/claudecode/projects/active/kids-games/batch28/shapecount/index.html?verify=1'
results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# ---- Python 独立封闭表（SPEC r3 delta 文字口径，禁抄页面） ----
PY_SHAPES6 = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond']
PY_NEAR = {'triangle': 'diamond', 'diamond': 'triangle', 'circle': 'heart', 'heart': 'circle'}
PY_NEAR_KEYS = ['triangle', 'diamond', 'circle', 'heart']
PY_COLORS4 = ['red', 'blue', 'yellow', 'green']
CH1_N, CH4_N, DIST4 = (5, 10), (5, 9), (3, 8)
GRID_R, GRID_C, GRID_TOT = (2, 4), (3, 5), (10, 20)
MISS_TOT, MISS_K, FLOOR = (12, 20), (1, 4), 10
DUAL_N, DUAL_D = (3, 6), (2, 5)

def py_numset(t):                       # 候选数字分布规则（SPEC 独立复算）
    if t <= 2: return [t, t + 1, t + 2, t + 3]
    if t <= 6: return [t - 2, t - 1, t, t + 1]
    return [t - 3, t - 2, t - 1, t]

def in_rng(v, rng): return rng[0] <= v <= rng[1]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        title = ''
        for _ in range(480):
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title and title != 'VERIFY':
                break
            await pg.wait_for_timeout(500)
        chk('S0 selftest 全绿+0 pageerror', 'VERIFY PASS' in title and not errs, title)

        # ---- S1 题表封闭真值独立对账（40 关×5 题） ----
        bad = []
        lvl_cache = {}
        for flat in range(40):
            L = json.loads(await pg.evaluate('JSON.stringify(genLevel(%d))' % flat))
            lvl_cache[flat] = L
            if L['ch'] != flat // 5 + 1: bad.append((flat, 'ch', L['ch']))
            if flat < 20 and L['dch'] != (flat // 5) % 4 + 1: bad.append((flat, 'dch', L['dch']))
            if flat >= 20 and not (1 <= L['dch'] <= 4): bad.append((flat, 'gendch', L['dch']))
            kinds = [q['kind'] for q in L['quizzes']]
            dch = L['dch']
            if dch == 1 and set(kinds) != {'count'}: bad.append((flat, 'dch1kind', kinds))
            if dch == 2 and set(kinds) != {'grid'}: bad.append((flat, 'dch2kind', kinds))
            if dch == 3:
                gm, du = kinds.count('gridmiss'), kinds.count('dual')
                if not ((gm == 3 and du == 2) or (gm == 2 and du == 3)): bad.append((flat, 'dch3split', kinds))
                for i in range(1, 5):                      # S4 交替结构：相邻子型必异
                    if L['quizzes'][i]['kind'] == L['quizzes'][i - 1]['kind']:
                        bad.append((flat, 'ch3adjacent', i))
            if dch == 4 and len(set(kinds)) < 2: bad.append((flat, 'dch4kinds', kinds))
            for k, q in enumerate(L['quizzes']):
                tag = 'f%d/q%d' % (flat, k)
                if flat == 0 and k == 0:
                    if not (q['kind'] == 'count' and q['ask'] == 'circle' and q['n'] == 6
                            and list(q['scene'].keys()) == ['circle']):
                        bad.append((tag, 'anchor'))
                if q['kind'] == 'count':
                    if q['ask'] not in PY_SHAPES6: bad.append((tag, 'askLib'))
                    if dch == 1:
                        if len(q['scene']) != 1 or not in_rng(q['n'], CH1_N): bad.append((tag, 'dch1n', q['n']))
                    else:
                        if q['ask'] not in PY_NEAR_KEYS: bad.append((tag, 'ch4pool'))
                        near = PY_NEAR[q['ask']]
                        m = q['scene'].get(near)
                        if not m or not in_rng(m, DIST4): bad.append((tag, 'mRange', m))
                        if not in_rng(q['n'], CH4_N): bad.append((tag, 'ch4n', q['n']))
                        if q['n'] + (m or 0) > 12: bad.append((tag, 'slots'))
                elif q['kind'] in ('grid', 'gridmiss'):
                    r, c = q['rows'], q['cols']
                    if not in_rng(r, GRID_R) or not in_rng(c, GRID_C): bad.append((tag, 'rc', (r, c)))
                    tot = r * c
                    if q['kind'] == 'grid':
                        if not in_rng(tot, GRID_TOT): bad.append((tag, 'tot', tot))
                        if q['n'] != tot: bad.append((tag, 'nTot', (q['n'], tot)))
                    else:
                        if not in_rng(tot, MISS_TOT): bad.append((tag, 'gmTot', tot))
                        if not in_rng(len(q['miss']), MISS_K): bad.append((tag, 'kRange'))
                        if tot - len(q['miss']) < FLOOR: bad.append((tag, 'floor'))
                        if q['n'] != tot - len(q['miss']): bad.append((tag, 'nSub', (q['n'], tot, len(q['miss']))))
                        if len(set(q['miss'])) != len(q['miss']): bad.append((tag, 'missDup'))
                        if any(not (0 <= i < tot) for i in q['miss']): bad.append((tag, 'missRange'))
                    if q['scene'] != {q['ask']: q['n']}: bad.append((tag, 'gmScene', q['scene']))
                elif q['kind'] == 'dual':
                    d = q['dual']
                    if d['shape'] not in PY_SHAPES6 or d['color'] not in PY_COLORS4: bad.append((tag, 'dualLib'))
                    if d['d1s'] not in PY_SHAPES6 or d['d2c'] not in PY_COLORS4: bad.append((tag, 'dualDLib'))
                    if d['d1s'] == d['shape']: bad.append((tag, 'd1sSame'))
                    if d['d2c'] == d['color']: bad.append((tag, 'd2cSame'))
                    if not in_rng(d['n'], DUAL_N): bad.append((tag, 'dualN', d['n']))
                    if not (in_rng(d['d1'], DUAL_D) and in_rng(d['d2'], DUAL_D)): bad.append((tag, 'dualD'))
                    if d['n'] + d['d1'] + d['d2'] > 12: bad.append((tag, 'dualSlots'))
                    if q['ask'] != d['shape'] + ':' + d['color']: bad.append((tag, 'askPair'))
                    # 双干扰在场独立判（组合键 Python 独立拼）
                    k1, k2 = d['d1s'] + ':' + d['color'], d['shape'] + ':' + d['d2c']
                    if q['scene'].get(k1) != d['d1']: bad.append((tag, 'd1Missing', k1))
                    if q['scene'].get(k2) != d['d2']: bad.append((tag, 'd2Missing', k2))
                    if q['scene'].get(q['ask']) != d['n']: bad.append((tag, 'sceneN'))
                else:
                    bad.append((tag, 'kind', q['kind']))
                # 数字卡通用（四型同构）
                nums = [o['num'] for o in q['opts']]
                if len(nums) != 4 or len(set(nums)) != 4: bad.append((tag, 'dup', nums))
                if not all(1 <= x <= 20 for x in nums): bad.append((tag, 'range', nums))
                if nums.count(q['n']) != 1 or q['answer'] != nums.index(q['n']): bad.append((tag, 'ans', nums))
                if sorted(nums) != sorted(py_numset(q['n'])): bad.append((tag, 'numSet', (nums, q['n'])))
                # 相邻同型身份互异
                if k > 0 and L['quizzes'][k - 1]['kind'] == q['kind'] and L['quizzes'][k - 1]['ask'] == q['ask']:
                    bad.append((tag, 'adjacent'))
        chk('S1 题表封闭真值 200 题独立对账', not bad, bad[:5])

        # ---- S2 确定性（双读全等） ----
        det_bad = []
        for flat in [0, 9, 15, 19, 27, 39]:
            j1 = await pg.evaluate('JSON.stringify(genLevel(%d))' % flat)
            j2 = await pg.evaluate('JSON.stringify(genLevel(%d))' % flat)
            if j1 != j2: det_bad.append(flat)
        chk('S2 确定性双读全等', not det_bad, det_bad)

        # ---- S3 UI 钩子契约抽验（真实 UI 状态机） ----
        await pg.evaluate('SC.start(0)')
        q = json.loads(await pg.evaluate('JSON.stringify(SC.quiz)'))
        ok_quiz = (q['kind'] == 'count' and q['ask'] == 'circle' and q['n'] == 6 and
                   q['drift'] == False and q['rows'] is None and q['missCells'] is None and
                   q['dual'] is None and q['answer'] == [o['num'] for o in q['opts']].index(6))
        r_bad = await pg.evaluate('SC.tapOpt(99)') is None
        wi = [i for i, o in enumerate(q['opts']) if o['num'] != 6][0]
        rw = await pg.evaluate('SC.tapOpt(%d)' % wi)
        m1 = json.loads(await pg.evaluate('JSON.stringify(SC.quiz)'))['miss']
        ri = await pg.evaluate('SC.tapOpt(%d)' % q['answer'])
        q2 = json.loads(await pg.evaluate('JSON.stringify(SC.quiz)'))
        s3a = ok_quiz and r_bad and rw == 'wrong' and m1 == 1 and ri == 'right' and q2['step'] == 1 and q2['miss'] == 0
        # 漂移钩子标记 + grid 题型钩子字段
        await pg.evaluate('SC.start(15)')
        q15 = json.loads(await pg.evaluate('JSON.stringify(SC.quiz)'))
        s3b = q15['drift'] == True
        await pg.evaluate('SC.start(7)')                      # dch2 grid 关
        q7 = json.loads(await pg.evaluate('JSON.stringify(SC.quiz)'))
        s3c = (q7['kind'] == 'grid' and 2 <= q7['rows'] <= 4 and 3 <= q7['cols'] <= 5
               and q7['n'] == q7['rows'] * q7['cols'] and q7['drift'] == False)
        # gridmiss 钩子字段（ch3 首个 gm 关）
        gm_flat = du_flat = -1
        for f in range(10, 15):
            k0 = lvl_cache[f]['quizzes'][0]['kind']
            if k0 == 'gridmiss' and gm_flat < 0: gm_flat = f
            if k0 == 'dual' and du_flat < 0: du_flat = f
        await pg.evaluate('SC.start(%d)' % gm_flat)
        qg = json.loads(await pg.evaluate('JSON.stringify(SC.quiz)'))
        s3d = (qg['kind'] == 'gridmiss' and sorted(qg['missCells']) == sorted(lvl_cache[gm_flat]['quizzes'][0]['miss'])
               and qg['n'] == qg['rows'] * qg['cols'] - len(qg['missCells']))
        await pg.evaluate('SC.start(%d)' % du_flat)
        qd = json.loads(await pg.evaluate('JSON.stringify(SC.quiz)'))
        dd = lvl_cache[du_flat]['quizzes'][0]['dual']
        s3e = (qd['kind'] == 'dual' and qd['dual'] == dd and qd['ask'] == dd['shape'] + ':' + dd['color'])
        chk('S3 UI 钩子契约（字段/越界/错对推进/漂移标记）', s3a and s3b and s3c and s3d and s3e,
            'a=%s b=%s c=%s d=%s e=%s gm=%d du=%d' % (s3a, s3b, s3c, s3d, s3e, gm_flat, du_flat))

        await b.close()
    n = sum(1 for _, ok in results if ok)
    print('')
    print('TOTAL %d/%d PASS' % (n, len(results)))
    sys.exit(0 if n == len(results) else 1)

asyncio.run(main())
