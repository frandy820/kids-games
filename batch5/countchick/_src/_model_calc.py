# -*- coding: utf-8 -*-
"""r19 countchick 模型复算（独立于 JS 实现，供 SPEC/verify/selftest 三方钉死对账）
   复刻 mulberry32+genOne/genLevel，输出 40 关题面分布 + modeledMs 值。"""
import json

def mulberry32(a):
    a |= 0
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((a ^ (a >> 15)) * (1 | a)) & 0xFFFFFFFF
        # JS: t = t + Math.imul(t ^ t>>>7, 61|t) ^ t → (t + imul) ^ t（+ 优先于 ^）
        im = ((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF
        t = ((t + im) ^ t) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt

def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))

def shuffled(arr, rnd):
    a = arr[:]
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a

CH = {
    1: dict(kind='count', nMin=11, nMax=14),
    2: dict(kind='count', nMin=15, nMax=20, mix=True),
    3: dict(kind='compare', nMin=7, nMax=12, dMin=1, dMax=5),
    4: dict(kind='flash', nMin=8, nMax=16),
}
CH_LEN = 5
D_MIN, D_MAX = 2, 4

def distractors_of(n):
    pool = []
    for v in (n - 1, n + 1, n - 2, n + 2):
        if v > 0 and v != n and v not in pool:
            pool.append(v)
    return pool[:2]

def gen_one(dch, rnd, last_key):
    C = CH[dch]
    if C['kind'] == 'compare':
        n = ri(rnd, C['nMin'], C['nMax']); diff = ri(rnd, C['dMin'], C['dMax'])
        for _ in range(8):
            if 'c%d-%d' % (n, diff) != last_key: break
            n = ri(rnd, C['nMin'], C['nMax']); diff = ri(rnd, C['dMin'], C['dMax'])
        m = n - diff
        d = 'more' if rnd() < 0.5 else 'less'
        items = shuffled([diff] + distractors_of(diff), rnd)
        for _ in range(3 * (n + m)): rnd()      # mkChicks 消耗（流对齐）
        return dict(type='compare', n=n, m=m, diff=diff, dir=d, items=items,
                    answer=items.index(diff), others=0)
    if C['kind'] == 'flash':
        n = ri(rnd, C['nMin'], C['nMax'])
        for _ in range(8):
            if 'f%d' % n != last_key: break
            n = ri(rnd, C['nMin'], C['nMax'])
        items = shuffled([n, n - 3, n + 3], rnd)
        for _ in range(3 * n): rnd()            # mkChicks 消耗（流对齐）
        return dict(type='flash', n=n, items=items, answer=items.index(n),
                    others=0, flashMs=1200 + n * 100)
    n = ri(rnd, C['nMin'], C['nMax'])
    for _ in range(8):
        if 'c%d' % n != last_key: break
        n = ri(rnd, C['nMin'], C['nMax'])
    n_other = 0
    if C.get('mix'):
        n_other = ri(rnd, D_MIN, D_MAX)
        for _ in range(n_other):
            rnd(); rnd(); rnd()                 # kind/f/e（消耗次数须与 JS 一致 = 3 次/只）
    items = shuffled([n] + distractors_of(n), rnd)
    for _ in range(3 * n): rnd()                # mkChicks 消耗（流对齐）
    return dict(type='count', n=n, items=items,
                answer=None, others=n_other)

def gen_level(flat):
    ch = flat // CH_LEN + 1
    dch = (ch - 1) % 4 + 1
    rnd = mulberry32(flat * 7919 + 13)
    out, last = [], None
    for qi in range(CH_LEN):
        q = gen_one(dch, rnd, last)
        out.append(q)
        last = 'c%d-%d' % (q['n'], q['diff']) if q['type'] == 'compare' else q['type'][0] + str(q['n'])
    return dch, out

# ---- modeled 常量（与 game-data.js 字面一致，独立重列=SPEC 推导） ----
est = lambda n: n * 345 + 600
TAP_MS, COUNT_BASE, CMP_BASE, FLASH_BASE = 950, 2600, 4200, 3000
RIGHT_MS, GAP_MS = 880, 600
INTRO_MS = est(len('点一点，数一数')) + 400
QWIN_CMP = est(len('小鸡比小鸭多几只')) + 300
QWIN_FLASH = est(len('看一眼，有几只小鸡')) + 300

def modeled(flat):
    dch, qs = gen_level(flat)
    t = INTRO_MS
    for q in qs:
        if q['type'] == 'compare':
            dec = CMP_BASE + TAP_MS * (q['n'] + q['m']); qw = QWIN_CMP
        elif q['type'] == 'flash':
            dec = FLASH_BASE + q['flashMs']; qw = QWIN_FLASH
        else:
            dec = COUNT_BASE + TAP_MS * q['n']; qw = 0
        t += qw + dec + RIGHT_MS + GAP_MS
    return t

if __name__ == '__main__':
    stat = {}
    for flat in range(40):
        dch, qs = gen_level(flat)
        modeled(flat)
        stat[flat] = dict(dch=dch, q=[(q['type'], q['n'], q.get('m', 0), q.get('diff', 0), q.get('others', 0)) for q in qs])
    print('INTRO_MS=%d QWIN_CMP=%d QWIN_FLASH=%d' % (INTRO_MS, QWIN_CMP, QWIN_FLASH))
    print('WRONG_WIN count=%d compare=%d flash=%d' % (
        est(len('点一点，数一数')) + 450, est(len('先数小鸡，再数小鸭')) + 450, est(len('别急着数，看一眼猜一猜')) + 450))
    print('modeled(0)=%d' % modeled(0))
    vals = {f: modeled(f) for f in range(40)}
    mn = min(vals.values())
    print('modeled min over 0-39 = %d (at flats %s)' % (mn, [f for f, v in vals.items() if v == mn]))
    print('modeled range: %d..%d' % (mn, max(vals.values())))
    for f in (0, 5, 10, 15, 20, 25, 30, 35):
        print(f, stat[f]['dch'], stat[f]['q'])
    # 分布审计
    from collections import Counter
    kinds = Counter(); ns = Counter(); diffs = Counter(); dirs = Counter(); others = Counter()
    adj_same = 0; total_q = 0
    for flat in range(40):
        dch, qs = gen_level(flat)
        prev = None
        for q in qs:
            total_q += 1
            kinds[q['type']] += 1
            ns[q['n']] += 1
            if q['type'] == 'compare': diffs[q['diff']] += 1; dirs[q['dir']] += 1
            if q['type'] == 'count' and q['others']: others[q['others']] += 1
            key = (q['n'], q.get('m', 0), q.get('diff', 0))
            if prev == key: adj_same += 1
            prev = key
    print('kinds=%s' % dict(kinds))
    print('n dist=%s' % dict(sorted(ns.items())))
    print('diff dist=%s dirs=%s' % (dict(sorted(diffs.items())), dict(dirs)))
    print('others dist(ch2)=%s' % dict(sorted(others.items())))
    print('adjacent same key count=%d / %d' % (adj_same, total_q))
    print(json.dumps({str(f): vals[f] for f in range(8)}))
