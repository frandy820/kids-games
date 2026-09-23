# -*- coding: utf-8 -*-
"""batch28 独立复验：coder / shapecount / conserve（断言从 SPEC-BATCH28 推导，期望值独立硬编码）
用法: python verify_batch28.py <coder|shapecount|conserve>
口径：verify 页 (?verify=1) 引擎同作用域；tapX 均 async（await 包装/fire-and-forget 防重入）；
     conserve ch2+（flat≥5）每题有变换演出窗 ~1.6s+语音——驱动前 prewait 2600（探针实证窗内 tap 恒 false 含 oob）；
     coder run 题逐卡驱动间 800ms（走格动画锁窗）；真实路径推进由 verify_final28.py R8 承担，本脚本不重复。
字段口径（探针+源码核对）：coder 钩子 quiz={kind,grid{start,goal,stones},pool,seq,opts,answer,step,miss}（内部表示顶层=两层结构）；
     conserve 钩子 quiz={kind,family,left/right{n,spread},addSide,opts,answer,step,miss}（不暴露 base/delta——
     rows 按最终计数复算，pour/clay add 按 SPEC 固定变换语义复算）。"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'coder': 'CD', 'shapecount': 'SC', 'conserve': 'CV'}[GAME]
TAP = {'coder': 'tapCard', 'shapecount': 'tapOpt', 'conserve': 'tapOpt'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码表（禁 import 实现） ----
DIRS = {'up': (-1, 0), 'down': (1, 0), 'left': (0, -1), 'right': (0, 1)}
SC_NEAR = {'triangle': 'diamond', 'diamond': 'triangle', 'circle': 'heart', 'heart': 'circle'}   # 近形封闭 2 对（square/star 无近形）
# r3 候选数字规则（SPEC §0.68 r3 版本块，域 1-20 独立推导）：t≤2 正侧 / 3-6 中心 / t≥7 下邻域
SC_NUMSET_R3 = {}
for _t in range(1, 21):
    if _t <= 2: SC_NUMSET_R3[_t] = [_t, _t + 1, _t + 2, _t + 3]
    elif _t <= 6: SC_NUMSET_R3[_t] = [_t - 2, _t - 1, _t, _t + 1]
    else: SC_NUMSET_R3[_t] = [_t - 3, _t - 2, _t - 1, _t]
# count 候选数字分布（探针 0-39 实况；规则=t≤2:[t..t+3] / t=3,4:[t-2..t+1] / t≥5:[t-3..t]）
SC_NUMSET = SC_NUMSET_R3   # r3 改造后统一走 1-20 域规则表（旧 1-6 字面量表 2026-09-13 废）
CV_TEXTS = {'L': '左边的多', 'S': '一样多', 'R': '右边的多'}
CLIPS = {'coder': {'wrong': 2568}, 'shapecount': {'wrong': 1968}, 'conserve': {'wrong': 2184}}

# ---- coder 卡池可达性独立 DFS（SPEC §0.67 数学先验，python 侧实现禁读引擎） ----
def dfs_reach(pool_dirs, start, goal, stones, gn=3):   # r40：网格参数化（dch>=3 g=4）
    stones = set((s['r'], s['c']) for s in stones)
    from collections import Counter
    cnt = Counter(pool_dirs)
    def go(r, c, rem):
        if (r, c) == (goal['r'], goal['c']):
            return []
        if rem == 0:
            return None
        for d, n in list(cnt.items()):
            if n <= 0:
                continue
            dr, dc = DIRS[d]
            nr, nc = r + dr, c + dc
            if not (0 <= nr < gn and 0 <= nc < gn) or (nr, nc) in stones:
                continue
            cnt[d] -= 1
            sub = go(nr, nc, rem - 1)
            cnt[d] += 1
            if sub is not None:
                return [d] + sub
        return None
    return go(start['r'], start['c'], len(pool_dirs))

async def wait_verify_title(pg):
    for _ in range(90):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t:
            return t
        await pg.wait_for_timeout(500)
    return ''

async def poll_step(pg, want, timeout=15000):
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate('%s.quiz.step' % HOOK)
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False

# ---------- T3 每题审计（返回错误串或 None） ----------
async def q_coder(pg, flat, k, q, dch):
    s, g, pool = q['grid']['start'], q['grid']['goal'], q['pool']
    gn = q.get('g') or 3                # r40 网格档（SPEC-R40 §R2）：dch<3 g=3 / dch>=3 g=4，q.g 全题落盘
    md = abs(s['r'] - g['r']) + abs(s['c'] - g['c'])
    if q['kind'] == 'run':
        # r40 池先验（SPEC-R40 §R3 阶梯）：dch1/2 池=距恰等（旧「ch1 池1距1」已废——flat0q0 教学锚点 dist1 池1 自然满足恰等）；dch3/4 距<=池<=距+1
        if dch <= 2 and len(pool) != md:
            return 'f%dq%d ch%d 池%d≠距%d' % (flat, k, dch, len(pool), md)
        if not (md <= len(pool) <= md + 1):
            return 'f%dq%d 池长%d vs 距离%d' % (flat, k, len(pool), md)
        seq = dfs_reach([c['dir'] for c in pool], s, g, q['grid']['stones'], gn)
        if seq is None:
            return 'f%dq%d 卡池不可达' % (flat, k)
        for d in seq:
            idx = await pg.evaluate('(d => %s.quiz.pool.findIndex(c => c.dir === d && !c.used))("%s")' % (HOOK, d))
            if idx < 0:
                return 'f%dq%d 未用卡缺 %s' % (flat, k, d)
            r = await pg.evaluate('(async () => %s.tapCard(%d))()' % (HOOK, idx))
            if r in ('right', 'done'):
                return None                              # 到达即对（殊途同达）
            if r != 'moved':
                return 'f%dq%d tap=%s' % (flat, k, r)
            await pg.wait_for_timeout(800)               # 走格动画锁窗
        return 'f%dq%d 序尽未到达' % (flat, k)
    # path（r40，SPEC-R40 §R2/§R3）：seq 坡表 dch3 lv<2（flat<12）→2、dch3 lv>=2 与 dch4 →3；opts=seq+1；界内按 gn；落点==answer 且唯一；末段中间格陷阱恒在场
    want_s = 2 if (dch == 3 and flat % 5 < 2) else 3   # r40 审查 M2：SPEC §R2 同式 lv=flat%5 全域推导（生成关 dch3 lv0/1 亦 seq2），非静态谱 shortcut
    if len(q['seq']) != want_s or len(q['opts']) != want_s + 1:
        return 'f%dq%d path seq=%d opts=%d want %d/%d' % (flat, k, len(q['seq']), len(q['opts']), want_s, want_s + 1)
    r0, c0 = s['r'], s['c']
    for d in q['seq']:
        r0 += DIRS[d][0]; c0 += DIRS[d][1]
        if not (0 <= r0 < gn and 0 <= c0 < gn):
            return 'f%dq%d seq 出界' % (flat, k)
    opt = q['opts'][q['answer']]
    if (opt['r'], opt['c']) != (r0, c0):
        return 'f%dq%d path 落点(%d,%d)!=opts[ans](%d,%d)' % (flat, k, r0, c0, opt['r'], opt['c'])
    if sum(1 for o in q['opts'] if (o['r'], o['c']) == (r0, c0)) != 1:
        return 'f%dq%d path 候选落点不唯一' % (flat, k)
    dr, dc = DIRS[q['seq'][-1]]
    if (r0 - dr, c0 - dc) not in [(o['r'], o['c']) for o in q['opts']]:
        return 'f%dq%d path 末段中间格缺席' % (flat, k)
    r = await pg.evaluate('(async () => %s.tapCard(%d))()' % (HOOK, q['answer']))
    return None if r in ('right', 'done') else 'f%dq%d path tap=%s' % (flat, k, r)

async def q_shapecount(pg, flat, k, q, dch):
    # r3 四型（SPEC §0.68 r3 版本块独立对账：count/grid/gridmiss/dual；more 已下线）
    scene = q['scene']
    t = q['n']
    nums = sorted(o['num'] for o in q['opts'])
    if t not in SC_NUMSET_R3 or nums != SC_NUMSET_R3[t] or q['opts'][q['answer']]['num'] != t:
        return 'f%dq%d numset t=%s nums=%s' % (flat, k, t, nums)
    if q['kind'] == 'count':
        if scene.get(q['ask']) != t:
            return 'f%dq%d count scene/ask' % (flat, k)
        if dch == 1:
            if len(scene) != 1 or not (5 <= t <= 10):
                return 'f%dq%d ch1 单形域 n=%s' % (flat, k, t)
        else:                                            # ch4 近形版（近形必在场）
            near = SC_NEAR.get(q['ask'])
            if near is None or near not in scene:
                return 'f%dq%d ch4 近形缺席 ask=%s' % (flat, k, q['ask'])
            m = scene[near]
            if not (5 <= t <= 9) or not (3 <= m <= 8) or t + m > 12:
                return 'f%dq%d ch4 域 n=%s m=%s' % (flat, k, t, m)
    elif q['kind'] in ('grid', 'gridmiss'):
        r, c = q['rows'], q['cols']
        if not (2 <= r <= 4 and 3 <= c <= 5):
            return 'f%dq%d rc=%dx%d' % (flat, k, r, c)
        tot = r * c
        mc = q.get('missCells') or []
        if q['kind'] == 'grid':
            if not (10 <= tot <= 20) or t != tot or mc:
                return 'f%dq%d grid tot=%d n=%s' % (flat, k, tot, t)
        else:
            if not (12 <= tot <= 20) or not (1 <= len(mc) <= 4) or tot - len(mc) < 10 or t != tot - len(mc):
                return 'f%dq%d gm tot=%d k=%d n=%s' % (flat, k, tot, len(mc), t)
            if len(set(mc)) != len(mc) or any(not (0 <= i < tot) for i in mc):
                return 'f%dq%d miss 域 %s' % (flat, k, mc)
        if scene != {q['ask']: t}:
            return 'f%dq%d 阵列 scene=%s' % (flat, k, scene)
    elif q['kind'] == 'dual':
        d = q['dual']
        if q['ask'] != d['shape'] + ':' + d['color'] or scene.get(q['ask']) != t:
            return 'f%dq%d dual ask=%s' % (flat, k, q['ask'])
        if d['d1s'] == d['shape'] or d['d2c'] == d['color']:
            return 'f%dq%d dual 干扰同值' % (flat, k)
        # 双干扰必在场（SPEC r3：同色异形+同形异色——组合键独立拼）
        if scene.get(d['d1s'] + ':' + d['color']) != d['d1'] or scene.get(d['shape'] + ':' + d['d2c']) != d['d2']:
            return 'f%dq%d dual 双干扰缺席' % (flat, k)
        if not (3 <= t <= 6) or not (2 <= d['d1'] <= 5) or not (2 <= d['d2'] <= 5) or t + d['d1'] + d['d2'] > 12:
            return 'f%dq%d dual 域 n=%s d1=%s d2=%s' % (flat, k, t, d['d1'], d['d2'])
    else:
        return 'f%dq%d 型=%s' % (flat, k, q['kind'])
    r = await pg.evaluate('(async () => %s.tapOpt(%d))()' % (HOOK, q['answer']))
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_conserve(pg, flat, k, q, dch):
    texts = [o['text'] for o in q['opts']]
    if sorted(texts) != sorted(CV_TEXTS.values()):
        return 'f%dq%d 卡文案 %s' % (flat, k, texts)
    fam, kind = q['family'], q['kind']
    # answer 独立复算（钩子只暴露最终 n）：rows=比最终计数（SPEC 5-7 等量/差1）；
    # pour/clay add=SPEC 固定变换语义（右杯倒入→右多 / 右条切走→左多），addSide 恒=+1（右侧变更）
    if fam == 'rows':
        nL, nR = q['left']['n'], q['right']['n']
        # SPEC「数量域 rows 5-7」指基量（源码实证 base∈5-7）；add ±1 后终量合法域 4-8
        if kind == 'same':
            if nL != nR or not (5 <= nL <= 7):
                return 'f%dq%d same n=%d/%d' % (flat, k, nL, nR)
        else:
            if abs(nL - nR) != 1 or not (4 <= min(nL, nR) and max(nL, nR) <= 8):
                return 'f%dq%d add n=%d/%d' % (flat, k, nL, nR)
        want = texts.index(CV_TEXTS['L'] if nL > nR else (CV_TEXTS['R'] if nR > nL else CV_TEXTS['S']))
    else:
        if kind == 'same':
            want = texts.index(CV_TEXTS['S'])
        elif fam == 'pour':
            if q['addSide'] != 1:
                return 'f%dq%d pour addSide=%s' % (flat, k, q['addSide'])
            want = texts.index(CV_TEXTS['R'])
        elif fam == 'clay':
            if q['addSide'] != 1:
                return 'f%dq%d clay addSide=%s' % (flat, k, q['addSide'])
            want = texts.index(CV_TEXTS['L'])
        else:
            return 'f%dq%d 族=%s' % (flat, k, fam)
    if q['answer'] != want:
        return 'f%dq%d %s/%s answer=%d want=%d' % (flat, k, kind, fam, q['answer'], want)
    r = await pg.evaluate('(async () => %s.tapOpt(%d))()' % (HOOK, q['answer']))
    if r not in ('right', 'done'):
        return 'f%dq%d tap=%s' % (flat, k, r)
    if flat >= 5:
        await pg.wait_for_timeout(2300)                  # 下一题变换演出窗
    return None

QF = {'coder': q_coder, 'shapecount': q_shapecount, 'conserve': q_conserve}

async def audit_static(pg):
    bad = []
    for flat in range(20):
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(300)
        dch = await pg.evaluate('%s.currentLevel.dch' % HOOK)
        if GAME == 'conserve' and flat >= 5:
            await pg.wait_for_timeout(2300)              # ch2+ 变换演出窗
        fam_seen, same_n, add_n = set(), 0, 0
        for k in range(5):
            q = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            if GAME == 'conserve':
                fam_seen.add(q['family'])
                same_n += q['kind'] == 'same'; add_n += q['kind'] == 'add'
            else:
                fam_seen.add(q['kind'])
            err = await QF[GAME](pg, flat, k, q, dch)
            if err:
                bad.append(err); break
            if k < 4 and not await poll_step(pg, k + 1):
                bad.append('f%dq%d step 未推进' % (flat, k)); break
        if len(bad) > 12:
            break
        # 章型家族断言（SPEC §0.67-69）
        if GAME == 'coder':
            if dch == 1 and fam_seen != {'run'}:
                bad.append('f%d ch1 型 %s' % (flat, fam_seen))
            if dch <= 2 and 'path' in fam_seen:
                bad.append('f%d dch%d 出 path' % (flat, dch))
        elif GAME == 'shapecount':                       # r3 章型：ch1 全 count/ch2 全 grid/ch3 两子型都在场
            if dch == 1 and fam_seen != {'count'}:
                bad.append('f%d ch1 型 %s' % (flat, fam_seen))
            if dch == 2 and fam_seen != {'grid'}:
                bad.append('f%d ch2 型 %s' % (flat, fam_seen))
            if dch == 3 and fam_seen != {'gridmiss', 'dual'}:
                bad.append('f%d ch3 型 %s' % (flat, fam_seen))
            if 'more' in fam_seen:
                bad.append('f%d dch%d 出 more（r3 已下线）' % (flat, dch))
        else:
            fam_ok = (dch in (1, 2) and fam_seen <= {'rows'}) or (dch == 3 and fam_seen <= {'pour', 'clay'}) or dch == 4
            if not fam_ok:
                bad.append('f%d dch%d 族 %s' % (flat, dch, fam_seen))
            if same_n < 1 or add_n < 1:                  # 每关 same/add 混出（防恒答一样多）
                bad.append('f%d same=%d add=%d' % (flat, same_n, add_n))
    return bad

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # T1 verify selftest 复跑
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_V)
        t1 = await wait_verify_title(pg)
        rec('T1 selftest 复跑', 'VERIFY PASS' in t1 and not errs, t1)
        await ctx.close()

        # T2 真实页预置存档
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_R)
        await pg.wait_for_timeout(3000)
        sv = await pg.evaluate("localStorage.getItem('%s')" % SAVEKEY)
        sv = json.loads(sv) if sv else None
        rec('T2 真实页预置存档 v1.0', bool(sv and sv.get('v') == '1.0'), 'v=%s' % (sv and sv.get('v')))
        await ctx.close()

        # T3 静态 0-19 全题 SPEC 对账+驱动
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        bad = await audit_static(pg)
        rec('T3 静态 0-19 全题 SPEC 对账+驱动', not bad and not errs3, (bad[:6] or '') if bad else 'err=%s' % errs3[:2])

        # T4 生成关 20-39 dch+四型全现
        gen = []
        for flat in range(20, 40):
            r = await pg.evaluate('%s.start(%d), %s.currentLevel.dch' % (HOOK, flat, HOOK))
            gen.append(r)
        rec('T4 生成关 dch∈1-4 且四型全现', all(g in (1, 2, 3, 4) for g in gen) and set(gen) == {1, 2, 3, 4}, gen)

        # T5 确定性
        same = True
        for flat in (22, 27, 33, 39):
            a = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            c = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        # coder T6-T8 需 path 题（run 题无 answer/miss 语义）——在 10-15 内确定性找
        flatx = 10
        if GAME == 'coder':
            flatx = await pg.evaluate('(function(){ for (var f=10; f<=15; f++){ %s.start(f); var q=%s.quiz; if (q && q.kind==="path") return f; } return 10; })()' % (HOOK, HOOK))
        win = 2600 if GAME == 'conserve' else 400

        # T6 tapX 返回值族（oob 前置——避开 right 后下一题变换窗；conserve 先过窗）
        prewait = 'await new Promise(r=>setTimeout(r,2600));' if GAME == 'conserve' else ''
        r3 = await pg.evaluate('async () => { %s.start(%d); %s const r = await %s.%s(99); return r === null ? "null" : String(r); }' % (HOOK, flatx, prewait, HOOK, TAP))
        r1 = await pg.evaluate("""async () => { const q = %s.quiz; let w = q.answer === 0 ? 1 : 0;
            const raw = await %s.%s(w); return { raw: String(raw), miss: %s.quiz.miss, step: %s.quiz.step, kind: q.kind }; }""" % (HOOK, HOOK, TAP, HOOK, HOOK))
        await pg.wait_for_timeout(win)
        r2 = await pg.evaluate('async () => { const q = %s.quiz; return String(await %s.%s(q.answer)); }' % (HOOK, HOOK, TAP))
        rec('T6 tapX 返回值族', r3 == 'null' and r1['raw'] == 'wrong' and r1['miss'] == 1 and r1['step'] == 0 and r2 == 'right',
            'oob=%s wrong=%s miss=%s right=%s f%d %s' % (r3, r1['raw'], r1['miss'], r2, flatx, r1['kind']))

        # T7 双错防重入（fire-and-forget 窗内二击 miss 只+1）
        await pg.evaluate('%s.start(%d)' % (HOOK, flatx))
        if GAME == 'conserve':
            await pg.wait_for_timeout(2600)
        await pg.evaluate('() => { const q = %s.quiz; %s.%s(q.answer === 0 ? 1 : 0); return 1; }' % (HOOK, HOOK, TAP))
        await pg.wait_for_timeout(40)
        await pg.evaluate('() => { const q = %s.quiz; %s.%s(q.answer === 0 ? 1 : 0); return 1; }' % (HOOK, HOOK, TAP))
        await pg.wait_for_timeout(3000 if GAME == 'conserve' else 2200)
        m = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T7 双错防重入 miss 只+1', m == 1, 'miss=%d' % m)

        # T8 星级三档（0 错 3★ / 2 错 2★ / ≥3 错 1★）
        async def stars_after(nwrong):
            await pg.evaluate('%s.start(%d)' % (HOOK, flatx))
            await pg.wait_for_timeout(win)
            for _ in range(nwrong):
                await pg.evaluate('async () => { const q = %s.quiz; await %s.%s(q.answer === 0 ? 1 : 0); }' % (HOOK, HOOK, TAP))
                await pg.wait_for_timeout(3000 if GAME == 'conserve' else 2200)
            await pg.evaluate('%s.autoSolve()' % HOOK)
            for _ in range(40):
                st = await pg.evaluate('%s.currentLevel' % HOOK)
                if st['won']:
                    return st['stars']
                await pg.wait_for_timeout(500)
            return None
        s0, s2, s3 = await stars_after(0), await stars_after(2), await stars_after(3)
        rec('T8 星级三档', s0 == 3 and s2 == 2 and s3 == 1, '0错=%s 2错=%s 3错=%s' % (s0, s2, s3))
        await ctx.close()

        # T9 家族 A 源码正则 + K 面板守卫（b28 契约 K）
        main_js = (BASE / GAME / '_src' / 'game-main.js').read_text(encoding='utf-8')
        data_js = (BASE / GAME / '_src' / 'game-data.js').read_text(encoding='utf-8')
        rec('T9 家族 A nextHint 双形态',
            re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js) is not None and
            re.search(r'nextHint\(\s*null\s*\)', main_js) is not None)
        rec('T9b 契约 K 面板守卫在场', "querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')" in main_js)

        # T10 C7 章末预告（4 章非空+生成关 nextHint 实算=GEN_HINTS[dch-1]，家族 F）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        hints = re.findall(r"hint:\s*'([^']+)'", data_js)
        ghints = re.findall(r"GEN_HINTS\s*=\s*\[([^\]]+)\]", data_js)
        gh = re.findall(r"'([^']+)'", ghints[0]) if ghints else []
        sem = (len(hints) == 4 and all(len(h) >= 6 for h in hints) and len(gh) == 4 and
               all(len(x) >= 6 for x in gh))
        # r40 审查 m6：旧式 nextHint(f)===GEN_HINTS[genLevel(f+1).dch-1] 与 nextHint 实现同表达式=恒真，
        # 改关键词对账——实算下一关 dch，预告文案须含该 dch 特征词（SPEC 章表硬编码，与页面 verify ⑬ hintOk 同源）
        genok = await pg.evaluate("(() => { const KW = ['两步','三步','猜','集合'];"
                                  "return [24,29,34,39].every(f => nextHint(f).indexOf(KW[genLevel(f+1).dch-1]) >= 0); })()")
        rec('T10 C7 预告在场+生成关实算', sem and genok, 'hints=%d gh=%d genok=%s' % (len(hints), len(gh), genok))
        await ctx.close()

        # T11 契约 I 豁免窗≥错链实长+300 + 守卫 + startLevel 重置
        # 多窗取最大（coder 有撞石豁免 3700/错链 7800 两窗，约束取错链窗）；
        # 引导句拼接族（conserve guideOf 函数内串联）无统一表——取 data 全文件中文串最大长为上界代理
        n_win = max((int(x) for x in re.findall(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*(\d+)', main_js)), default=0)
        zh = re.findall(r"'([^']*[一-鿿][^']*)'", data_js.replace('{d}', 'X'))
        zh = [s for s in zh if re.fullmatch(r'[一-鿿0-9，。！？、：…X]+', s)]   # 纯句串（跨注释引号配对伪串剔除）
        maxlen = max((len(s) for s in zh), default=0)
        lb = CLIPS[GAME]['wrong'] + 150 + 345 * maxlen + 300
        guard = 'Date.now() < wrongChainUntil' in main_js
        reset = re.search(r'lastWrongVoice\s*=\s*0;\s*wrongChainUntil\s*=\s*0', main_js) is not None
        rec('T11 契约 I 豁免窗≥链实长+300', n_win > 0 and n_win >= lb and guard and reset,
            'N=%d L=%d字 下界=%d guard=%s reset=%s' % (n_win, maxlen, lb, guard, reset))
        await b.close()
    fails = [n for n, ok in RES if not ok]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)

asyncio.run(main())
