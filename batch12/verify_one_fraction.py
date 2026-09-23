# -*- coding: utf-8 -*-
"""batch12 首单元门禁 · fraction 分数披萨独立复验（不信 agent 自报，读实际产物）
r15 难度改造（2026-09-16，AUDIT-78:78）：五章×8 题+eq 等值题型+cut 4 选 1。
①verify title 90/90 ②钩子 FR 齐 ③Python 引擎独立复算：mulberry32 复刻+分数域独立函数——
  80 关与页面 genLevel 逐关全量对账（题型/选项/answerIdx/pk）+规则域 0 违约+dMin=72265@flat24
  +genDch/eqPairs 定值 ④真实点击通关 flat0+flat16 ⑤灰化链(错1灰/错2 pulse)+eq ref 钩子契约
  ⑥sayW 三态 ⑦救援 14s+错点不重置 ⑧教学吞输入+重玩门 ⑨双 viewport ⑩离线+截图+语音注入 21 条"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from collections import Counter
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k + '#' + String(t || '').slice(0, 4)); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : (p.key || '')).join(',')); return _q(parts); };
  const _sy = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 6)); return _sy(t); };
  const _s = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _s(n); };
  return true;
})()"""

SEED = """const sv = KIDS._save();
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/8)+1)+'-'+(i%8)] = { stars: 3 };   // r15：CH_LEN=8
  sv.fraction = { tutSeen: true };
  if (n >= 16) KIDS.calendar.bonusSet(30);                                              // flat16 需日限>16
  else if (n >= 3) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();"""

async def newpage(b, n, vp={'width': 1280, 'height': 800}, verify=False, delay=900):
    ctx = await b.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + (BASE / 'fraction' / 'index.html').as_posix() + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(delay)
    if n is not None:
        await pg.evaluate('(n) => {%s}' % SEED, n)
        await pg.reload()
        await pg.wait_for_timeout(delay)
    return ctx, pg, errs

# ================= Python 引擎独立复算（SPEC 推导，不抄页面实现；与 prior_check.py 定版一致） =================
def _i32(x):
    x &= 0xFFFFFFFF
    return x - 0x100000000 if x >= 0x80000000 else x

def mulberry32js(seed):
    a = _i32(seed)
    def rnd():
        nonlocal a
        a = _i32(a + 0x6D2B79F5)
        t = _i32(_i32(a ^ ((a & 0xFFFFFFFF) >> 15)) * _i32(a | 1))
        u = _i32(t ^ ((t & 0xFFFFFFFF) >> 7))
        w = _i32((t & 0xFFFFFFFF) | 61)
        t = _i32(_i32(t + _i32(u * w)) ^ t)
        y = _i32(t ^ ((t & 0xFFFFFFFF) >> 14))
        return (y & 0xFFFFFFFF) / 4294967296
    return rnd

def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a

def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))

CH_LEN, STATIC_LEVELS, N_CHAPTERS = 8, 40, 5
READ_SET = [[2, 4], [3, 4], [2, 3]]
CMP_SET = [[1, 2, 1, 3], [1, 3, 1, 4], [2, 3, 2, 4]]
CMP2_SET = [[1, 4, 3, 4], [1, 4, 2, 4], [2, 4, 3, 4], [1, 3, 2, 3]]
EQ_DIST = [[1, 3], [1, 4], [2, 3], [3, 4]]
UN_TPL = {2: [0.63, 0.37], 3: [0.46, 0.27, 0.27], 4: [0.33, 0.185, 0.25, 0.235], 5: [0.30, 0.16, 0.22, 0.16, 0.16]}

def unequal_weights(n, rnd):
    w = [v + (rnd() - 0.5) * 0.028 for v in UN_TPL[n]]
    s = sum(w)
    return shuffled([v / s for v in w], rnd)

def pick_diff(pool, keyfn, rnd, last_key):
    for _ in range(8):
        c = pool[int(rnd() * len(pool))]
        if keyfn(c) != last_key:
            return c
    for c in pool:
        if keyfn(c) != last_key:
            return c
    return pool[0]

def kind_of(dch, qi):
    if dch in (1, 2): return 'cut' if qi % 2 == 0 else 'read'
    if dch == 3: return 'read'
    if dch == 4: return 'cmp' if qi % 2 == 0 else 'read'
    if qi == 0: return 'cmp'
    return 'eq' if qi % 2 == 1 else 'cmp'

def gen_one(dch, qi, rnd, last):
    kind = kind_of(dch, qi)
    if kind == 'cut':
        n = 2 if dch == 1 else (3 if (qi // 2) % 2 == 0 else 4)
        opts = [{'t': 'eq', 'n': n, 'w': [1.0 / n] * n}, {'t': 'un', 'n': n, 'w': unequal_weights(n, rnd)},
                {'t': 'eq', 'n': n + 1, 'w': [1.0 / (n + 1)] * (n + 1)}, {'t': 'un', 'n': n + 1, 'w': unequal_weights(n + 1, rnd)}]
        opts[0]['rot'] = int(rnd() * 360)
        for o in opts[1:]:
            o['rot'] = int(rnd() * 360)
        options = shuffled(opts, rnd)
        answerIdx = next(i for i, o in enumerate(options) if o['t'] == 'eq' and o['n'] == n)
        return {'kind': 'cut', 'n': n, 'options': options, 'answerIdx': answerIdx}
    if kind == 'read':
        if dch == 1:
            k, n = 1, 2
        elif dch == 2:
            n = 3 if (qi // 2) % 2 == 0 else 4
            k = 1
        elif dch == 3 and qi == 0:
            k, n = 1, 2
        else:
            lk = ('%d/%d' % (last['k'], last['n'])) if (last and last.get('kind') == 'read') else None
            k, n = pick_diff(READ_SET, lambda c: '%d/%d' % (c[0], c[1]), rnd, lk)
        cand = [(n, k), (k, n + 1), (k + 1, n)]
        seen = ['%d/%d' % (k, n)]
        opts = [(k, n)]
        for a, b in cand:
            if b < 2 or a < 1 or a > b: continue
            key = '%d/%d' % (a, b)
            if key in seen: continue
            seen.append(key); opts.append((a, b))
        options = shuffled(opts, rnd)
        answerIdx = next(i for i, o in enumerate(options) if o == (k, n))
        return {'kind': 'read', 'n': n, 'k': k, 'options': options, 'answerIdx': answerIdx,
                'c0': ri(rnd, 0, n - 1), 'rot': int(rnd() * 360)}
    if kind == 'cmp':
        if qi == 0:
            pair = [1, 2, 1, 4]
        else:
            lk = last.get('pk') if (last and last.get('kind') == 'cmp') else None
            pool = CMP_SET if dch == 4 else CMP2_SET
            pair = pick_diff(pool, lambda p: '%d/%d|%d/%d' % (p[0], p[1], p[2], p[3]), rnd, lk)
        opts = shuffled([{'k': pair[0], 'n': pair[1]}, {'k': pair[2], 'n': pair[3]}], rnd)
        big = max(pair[0] / pair[1], pair[2] / pair[3])
        answerIdx = next(i for i, o in enumerate(opts) if o['k'] / o['n'] == big)
        return {'kind': 'cmp', 'options': opts, 'answerIdx': answerIdx,
                'pk': '%d/%d|%d/%d' % (pair[0], pair[1], pair[2], pair[3])}
    fwd = ((qi - 1) // 2) % 2 == 0
    rk, rn = (1, 2) if fwd else (2, 4)
    ak, an = (2, 4) if fwd else (1, 2)
    dists = shuffled(EQ_DIST, rnd)[:2]
    opts = shuffled([{'k': ak, 'n': an}] + [{'k': d[0], 'n': d[1]} for d in dists], rnd)
    answerIdx = next(i for i, o in enumerate(opts) if o['k'] / o['n'] == rk / rn)
    return {'kind': 'eq', 'rk': rk, 'rn': rn, 'options': opts, 'answerIdx': answerIdx,
            'pk': '%d/%d=%d/%d' % (rk, rn, ak, an)}

def gen_level(flat):
    ch = flat // CH_LEN + 1
    rnd = mulberry32js(flat * 7919 + 13)
    dch = ((ch - 1) % N_CHAPTERS + 1) if flat < STATIC_LEVELS else ri(rnd, 1, N_CHAPTERS)
    quizzes, last = [], None
    for qi in range(CH_LEN):
        last = gen_one(dch, qi, rnd, last)
        quizzes.append(last)
    return {'flat': flat, 'ch': ch, 'dch': dch, 'quizzes': quizzes}

def canon(L):
    """对账口径（舍浮点 w/rot：权重域由规则审计独立覆盖）"""
    out = []
    for q in L['quizzes']:
        if q['kind'] == 'cut':
            out.append(['cut', q['n'], [[o['t'], o['n']] for o in q['options']], q['answerIdx']])
        elif q['kind'] == 'read':
            out.append(['read', q['k'], q['n'], [[a, b] for a, b in q['options']], q['answerIdx']])
        elif q['kind'] == 'cmp':
            out.append(['cmp', q['pk'], [[o['k'], o['n']] for o in q['options']], q['answerIdx']])
        else:
            out.append(['eq', q['rk'], q['rn'], [[o['k'], o['n']] for o in q['options']], q['answerIdx']])
    return [L['ch'], L['dch'], out]

PAGE_CANON = """(flat) => {
  const L = genLevel(flat);
  return [L.ch, L.dch, L.quizzes.map(q => q.kind === 'cut' ?
    ['cut', q.n, q.options.map(o => [o.t, o.n]), q.answerIdx] :
    q.kind === 'read' ? ['read', q.k, q.n, q.options.map(o => [o.num, o.den]), q.answerIdx] :
    q.kind === 'cmp' ? ['cmp', q.pk, q.options.map(o => [o.k, o.n]), q.answerIdx] :
    ['eq', q.rk, q.rn, q.options.map(o => [o.k, o.n]), q.answerIdx])];
}"""

def est_ms(s): return len(s) * 345 + 600

def audit_levels():
    """独立规则审计（prior_check.py 定版口径）：返回 fails / 统计 / 时长"""
    OPEN_MS = est_ms('看一看，每份一样大') + 2000
    VOICE = {'cut': est_ms('哪一个平均分成了') + est_ms('两') + est_ms('份') + 2 * 150,
             'read': est_ms('涂色部分是几分之几'), 'cmp': est_ms('哪一块大'), 'eq': est_ms('哪一块和它一样大')}
    DECIDE = {'cut': 8500, 'read': 7000, 'cmp': 5500, 'eq': 7500}
    ADV_B, ADV_W = 620, 1450
    fails, durs = [], []
    kind_dist, read_ans, cmp_pairs, eq_pairs, gen_dch = Counter(), Counter(), Counter(), Counter(), Counter()
    for flat in range(80):
        L = gen_level(flat)
        durs.append((OPEN_MS + sum(max(VOICE[q['kind']], DECIDE[q['kind']]) + ADV_B +
                                    (0 if q['kind'] == 'cut' else ADV_W) for q in L['quizzes']), flat))
        prev = None
        for qi, q in enumerate(L['quizzes']):
            kind_dist[q['kind']] += 1
            if q['kind'] == 'read': read_ans['%d/%d' % (q['k'], q['n'])] += 1
            if q['kind'] == 'cmp': cmp_pairs[q['pk']] += 1
            if q['kind'] == 'eq': eq_pairs[q['pk']] += 1
            if q['kind'] == 'cut':
                forms = sorted((o['t'], o['n']) for o in q['options'])
                if forms != [('eq', q['n']), ('eq', q['n'] + 1), ('un', q['n']), ('un', q['n'] + 1)]:
                    fails.append((flat, qi, 'cutForm'))
                if len({(o['t'], o['n']) for o in q['options']}) != 4: fails.append((flat, qi, 'cutDup'))
                for o in q['options']:
                    mx, mn = max(o['w']), min(o['w'])
                    if o['t'] == 'eq' and mx / mn > 1.001: fails.append((flat, qi, 'eqUneven'))
                    if o['t'] == 'un' and mx / mn < 1.5: fails.append((flat, qi, 'unTooEven %.3f' % (mx / mn)))
                    if abs(sum(o['w']) - 1) > 0.01 or min(o['w']) <= 0.05: fails.append((flat, qi, 'wSum/wMin'))
            if q['kind'] == 'read':
                keys = ['%d/%d' % o for o in q['options']]
                if len(set(keys)) != 3: fails.append((flat, qi, 'readDup'))
                if keys[q['answerIdx']] != '%d/%d' % (q['k'], q['n']): fails.append((flat, qi, 'readAns'))
                if any(a < 1 or b < 2 or a > b for a, b in q['options']): fails.append((flat, qi, 'readRange'))
            if q['kind'] == 'cmp':
                v = [o['k'] / o['n'] for o in q['options']]
                if len(set(v)) != 2: fails.append((flat, qi, 'cmpEq'))
                if q['options'][q['answerIdx']]['k'] / q['options'][q['answerIdx']]['n'] != max(v): fails.append((flat, qi, 'cmpAns'))
            if q['kind'] == 'eq':
                vals = [o['k'] / o['n'] for o in q['options']]
                if len(set(vals)) != 3: fails.append((flat, qi, 'eqDup'))
                if vals[q['answerIdx']] != q['rk'] / q['rn']: fails.append((flat, qi, 'eqAns'))
                if abs(vals[q['answerIdx']] - 0.5) > 1e-9: fails.append((flat, qi, 'eqNotHalf'))
                if any(not (1 <= o['k'] < o['n'] <= 4) for o in q['options']): fails.append((flat, qi, 'eqRange'))
            dch = L['dch']
            if dch == 1:
                if q['kind'] != ('cut' if qi % 2 == 0 else 'read'): fails.append((flat, qi, 'dch1kind'))
                if q['kind'] == 'cut' and q['n'] != 2: fails.append((flat, qi, 'dch1n'))
                if q['kind'] == 'read' and not (q['k'] == 1 and q['n'] == 2): fails.append((flat, qi, 'dch1read'))
            elif dch == 2:
                en = 3 if (qi // 2) % 2 == 0 else 4
                if q['kind'] != ('cut' if qi % 2 == 0 else 'read'): fails.append((flat, qi, 'dch2kind'))
                if q['kind'] == 'cut' and q['n'] != en: fails.append((flat, qi, 'dch2n'))
                if q['kind'] == 'read' and not (q['k'] == 1 and q['n'] == en): fails.append((flat, qi, 'dch2read'))
                if qi > 0 and prev['kind'] == q['kind'] and prev.get('n') == q.get('n'): fails.append((flat, qi, 'dch2adj'))
            elif dch == 3:
                if q['kind'] != 'read': fails.append((flat, qi, 'dch3kind'))
                if qi == 0 and not (q['k'] == 1 and q['n'] == 2): fails.append((flat, qi, 'dch3warm'))
                if qi > 0 and [q['k'], q['n']] not in READ_SET: fails.append((flat, qi, 'dch3pool'))
                if qi > 0 and prev['k'] == q['k'] and prev['n'] == q['n']: fails.append((flat, qi, 'dch3adj'))
            elif dch == 4:
                if q['kind'] != ('cmp' if qi % 2 == 0 else 'read'): fails.append((flat, qi, 'dch4kind'))
                if qi == 0 and q['pk'] != '1/2|1/4': fails.append((flat, qi, 'dch4warm'))
                if qi > 0 and q['kind'] == 'cmp' and q['pk'] not in ('1/2|1/3', '1/3|1/4', '2/3|2/4'): fails.append((flat, qi, 'dch4pool'))
                if qi > 0 and prev['kind'] == q['kind'] and prev.get('pk', prev.get('n')) == q.get('pk', q.get('n')): fails.append((flat, qi, 'dch4adj'))
            else:
                if qi == 0:
                    if q['kind'] != 'cmp' or q['pk'] != '1/2|1/4': fails.append((flat, qi, 'dch5warm'))
                elif qi % 2 == 1:
                    if q['kind'] != 'eq': fails.append((flat, qi, 'dch5eq'))
                elif q['kind'] != 'cmp' or q['pk'] not in ('1/4|3/4', '1/4|2/4', '2/4|3/4', '1/3|2/3'):
                    fails.append((flat, qi, 'dch5pool'))
            prev = q
        if flat >= STATIC_LEVELS: gen_dch[L['dch']] += 1
    dmin = min(durs)
    return fails, dmin, gen_dch, eq_pairs, kind_dist

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ① verify title
        ctx, pg, errs = await newpage(b, None, verify=True)
        title = ''
        for _ in range(45):                                   # r15 verify 更重（8 sims+教学链+时长单元）——45s 轮询窗
            title = await pg.title()
            if 'VERIFY' in title: break
            await pg.wait_for_timeout(1000)
        rec('F1 verify title', 'VERIFY PASS 90/90' in title and 'FAIL' not in title, title + ' errs=%s' % errs[:1])
        await ctx.close()

        # ② Python 引擎独立复算：80 关逐关对账 + 确定性 + 规则审计 + 定值
        fails, dmin, gen_dch, eq_pairs, kind_dist = audit_levels()
        ctx, pg, errs = await newpage(b, 0)
        det_ok, diff = True, []
        for flat in range(80):
            py = canon(gen_level(flat))
            p1 = await pg.evaluate(PAGE_CANON, flat)
            p2 = await pg.evaluate(PAGE_CANON, flat)
            if p1 != p2: det_ok = False
            if p1 != py and len(diff) < 3: diff.append((flat, py, p1))
        rec('F2a 引擎复算 80 关逐关对账(含确定性)', det_ok and not diff and not errs,
            'diff=%s det=%s errs=%s' % (diff[:1], det_ok, errs[:1]))
        rec('F2b 规则审计 0 违约(结构/章规则/相邻/权重域)', not fails, 'fails=%s' % fails[:4])
        rec('F2c 时长模型定值 dMin=72265@flat24 + LEVEL_MIN 40000',
            dmin == (72265, 24), 'dMin=%s' % (dmin,))
        rec('F2d 分布定值 genDch={1:11,2:4,3:9,4:11,5:5} eq双向26/26 kind四型齐',
            dict(gen_dch) == {1: 11, 2: 4, 3: 9, 4: 11, 5: 5} and
            dict(eq_pairs) == {'1/2=2/4': 26, '2/4=1/2': 26} and
            set(kind_dist) == {'cut', 'read', 'cmp', 'eq'},
            'genDch=%s eq=%s kind=%s' % (dict(gen_dch), dict(eq_pairs), dict(kind_dist)))
        hk = await pg.evaluate("(() => ({ has: !!window.FR, quiz: typeof FR.quiz, tap: typeof FR.tapCard, auto: typeof FR.autoSolve }))()")
        rec('F2e 钩子 FR 齐', hk['has'] and hk['quiz'] == 'object' and hk['tap'] == 'function' and hk['auto'] == 'function', str(hk))
        # eq ref 钩子契约（r15）：ch5 qi1 ref ∈ {1/2,2/4}、答案=参照等值、选项值互异
        eqc = await pg.evaluate("""(() => {
          startLevel(32);
          engTap(cur, cur.quizzes[0].answerIdx);
          renderQuiz();
          const q = FR.quiz;
          const vals = q.options.map(o => o.k / o.n);
          return { kind: q.kind, ref: q.ref,
            refOk: !!q.ref && (q.ref.k + '/' + q.ref.n === '1/2' || q.ref.k + '/' + q.ref.n === '2/4'),
            n: q.options.length,
            ansEq: q.options[q.answerIdx].k / q.options[q.answerIdx].n === q.ref.k / q.ref.n,
            uniq: new Set(vals).size === q.options.length,
            cards: document.querySelectorAll('#board .card').length,
            k: document.querySelector('#board').dataset.k,
            pw: !!document.querySelector('#prompt-chip .pwrap'),
            small: (document.querySelector('#prompt-chip .qtext.small') || {}).textContent || '' };
        })()""")
        rec('F2f eq 题钩子契约(ref/三块卡/答案=参照等值/问句)',
            eqc['kind'] == 'eq' and eqc['refOk'] and eqc['n'] == 3 and eqc['ansEq'] and eqc['uniq'] and
            eqc['cards'] == 3 and eqc['k'] == 'eq' and eqc['pw'] and '一样大' in eqc['small'], str(eqc)[:160])
        await ctx.close()

        # ③ 真实通关 flat0(ch1 cut/read) / flat16(ch3 read，r15 扁号)
        for n, tag in ((0, 'ch1'), (16, 'ch3')):
            ctx, pg, errs = await newpage(b, n)
            clicks = 0
            for _ in range(40):
                q = await pg.evaluate('FR.quiz')
                if not q: break
                await pg.locator('.card[data-i="%d"]' % q['answerIdx']).click()
                clicks += 1
                await pg.wait_for_timeout(650)
            await pg.wait_for_timeout(5200)
            stars = await pg.evaluate("(KIDS._save().levels['%d-0'] || {}).stars || 0" % (n // 8 + 1))
            rec('F3 真实点击通关 flat%d(%s)' % (n, tag), stars >= 1 and not errs,
                'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
            await ctx.close()

        # ④ 灰化链（flat3 ch1 cut r15 四选一：错1灰不pulse/错2正确卡pulse）
        ctx, pg, errs = await newpage(b, 3, delay=3200)
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(2200)
        await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate('FR.quiz')
        ws = [i for i in range(len(q['options'])) if i != q['answerIdx']]
        await pg.locator('.card[data-i="%d"]' % ws[0]).click()
        await pg.wait_for_timeout(700)
        st1 = await pg.evaluate("(() => { const x = FR.quiz; return { miss: x.miss, dead: x.dead.length, pu: !!document.querySelector('.card.pulse') }; })()")
        v1 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:fra_wrong') || x.startsWith('P:fra_hint')).length")
        await pg.locator('.card[data-i="%d"]' % ws[1]).click()
        await pg.wait_for_timeout(700)
        st2 = await pg.evaluate("(() => { const x = FR.quiz; return { miss: x.miss, dead: x.dead.length, pu: !!document.querySelector('.card.pulse') }; })()")
        v2 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:fra_wrong') || x.startsWith('P:fra_hint')).length")
        rec('F4 灰化链(错1灰不pulse/错2正确卡pulse)',
            st1['miss'] == 1 and st1['dead'] == 1 and not st1['pu'] and st2['miss'] == 2 and st2['pu'],
            'st1=%s st2=%s' % (st1, st2))
        rec('F4b sayW flat0 两错两条', v1 == 1 and v2 == 2, 'v1=%d v2=%d' % (v1, v2))
        await ctx.close()
        # sayW flat3 节流+跨题静默
        ctx, pg, errs = await newpage(b, 3, delay=3200)
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(2200)
        await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate('FR.quiz')
        ws = [i for i in range(len(q['options'])) if i != q['answerIdx']]
        await pg.locator('.card[data-i="%d"]' % ws[0]).click()
        await pg.wait_for_timeout(500)
        v1 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:fra_wrong') || x.startsWith('P:fra_hint')).length")
        await pg.locator('.card[data-i="%d"]' % q['answerIdx']).click()
        await pg.wait_for_timeout(900)
        q2 = await pg.evaluate('FR.quiz')
        if q2:
            ws2 = [i for i in range(len(q2['options'])) if i != q2['answerIdx']]
            await pg.locator('.card[data-i="%d"]' % ws2[0]).click()
            await pg.wait_for_timeout(700)
        v2 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:fra_wrong') || x.startsWith('P:fra_hint')).length")
        rec('F4c flat3 节流+跨题静默', v1 == 1 and v2 == 1, 'v1=%d v2=%d' % (v1, v2))
        await ctx.close()

        # ⑤ 救援：静置轮询 breathe/重读（全 clip 队列）→错点→二次触发（错点不重置）
        ctx, pg, errs = await newpage(b, 5, delay=3200)
        await pg.evaluate(HOOK)
        await pg.evaluate('window.__vlog = []')
        vis = False
        for _ in range(22):
            vis = await pg.evaluate("!!document.querySelector('.card.breathe, .card.pulse')")
            if vis: break
            await pg.wait_for_timeout(1000)
        v = await pg.evaluate('window.__vlog')
        res = [x for x in v if x.startswith('Q:') or x.startswith('P:fra_q') or x.startswith('P:fra_hint') or x.startswith('T:')]
        rec('F5 救援(重读题面全clip队列+视觉线索)', bool(res) and vis and not errs,
            'rescue=%s vis=%s' % (res[:1], vis))
        await pg.evaluate('window.__vlog = []')
        qw = await pg.evaluate("(() => { const x = FR.quiz; return x ? x.options.map((o, i) => i).filter(i => i !== x.answerIdx)[0] : null; })()")
        if qw is not None:
            await pg.locator('.card[data-i="%d"]' % qw).click()
        res2 = []
        for _ in range(18):
            await pg.wait_for_timeout(1000)
            v2 = await pg.evaluate('window.__vlog')
            res2 = [x for x in v2 if x.startswith('Q:') or x.startswith('P:fra_q') or x.startswith('P:fra_hint')]
            if res2: break
        rec('F5b 错点不重置救援(二次触发)', bool(res2), 'post=%s' % res2[:1])
        await ctx.close()

        # ⑥ 教学吞输入 + 重玩门
        ctx, pg, errs = await newpage(b, None)
        await pg.evaluate(HOOK)
        tut = await pg.evaluate('FR.tutorial')
        st0 = await pg.evaluate('FR.currentLevel && FR.currentLevel.step')
        bb = await pg.locator('.card').first.bounding_box()
        pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
        await pg.wait_for_timeout(500)
        pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        st1 = await pg.evaluate('FR.currentLevel && FR.currentLevel.step')
        rec('F6 教学期点击被吞+轻叮', tut == 'watch' and st1 == st0 and pops1 > pops0,
            'tut=%s step %s->%s pops+%d' % (tut, st0, st1, pops1 - pops0))
        await pg.locator('#btn-replay').dispatch_event('pointerdown')
        seen = False
        for _ in range(16):
            await pg.wait_for_timeout(1000)
            seen = await pg.evaluate("!!(KIDS._save().fraction && KIDS._save().fraction.tutSeen)")
            if seen: break
        rec('F6b 教学窗重玩门', seen and not errs, 'seen=%s errs=%s' % (seen, errs[:1]))
        await ctx.close()

        # ⑦ 双 viewport
        for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
            ctx, pg, errs = await newpage(b, 5, vp=vp)
            ox = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            small = await pg.evaluate("""[...document.querySelectorAll('button, .card')].filter(e => !e.closest('.k-panel') && !e.classList.contains('k-parentbtn'))
              .map(e => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)).filter(v => v < 64).length""")
            rec('F7 viewport %dx%d' % (vp['width'], vp['height']), ox == 0 and small == 0 and not errs,
                'ox=%s small=%s' % (ox, small))
            await ctx.close()

        # ⑧ 离线+截图+语音对账
        ctx, pg, errs = await newpage(b, 5)
        src = await pg.evaluate("document.documentElement.outerHTML")
        rec('F8a 离线断言', 'http://' not in src.replace('http://www.w3.org', '') and 'https://' not in src, '')
        shot = await pg.screenshot()
        import statistics
        from PIL import Image
        img = Image.open(io.BytesIO(shot)).convert('L')
        sd = statistics.pstdev(list(img.resize((160, 100)).getdata()))
        rec('F8b 截图非空白', sd > 5, 'stdev=%.1f' % sd)
        await ctx.close()
        html = (BASE / 'fraction' / 'index.html').read_text(encoding='utf-8')
        n_audio = html.count('data:audio')
        rec('F8c 语音注入对账(18 fra+3 core=21)', n_audio == 21, 'audio=%d' % n_audio)

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
