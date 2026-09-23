# -*- coding: utf-8 -*-
"""slide 生成器原型验证（与 JS 实现严格同构）：
mulberry32 确定性 / K 步合法滑动构造 / 禁立即回退 / 终态防完成态 /
BFS 全表证可解 + opt<=K + opt>=2 / 逆路径回完成态 / 盘型-K 章约束 / dch4 轮换"""
import sys
from collections import deque
sys.stdout.reconfigure(encoding='utf-8')

M = 0xFFFFFFFF

def mulberry32(a):
    a |= 0
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & M
        t = (a ^ (a >> 15)) & M
        t = (t * (1 | a)) & M
        t2 = (t ^ (t >> 7)) & M
        t = (t2 * (61 | t2)) & M
        t = (t ^ (t >> 14)) & M
        return t / 4294967296.0
    return rnd

def shuffled(arr, rnd):
    a = arr[:]
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a

def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))

def neighbors(p, W, H):
    x, y = p % W, p // W
    out = []
    if x > 0: out.append(p - 1)
    if x < W - 1: out.append(p + 1)
    if y > 0: out.append(p - W)
    if y < H - 1: out.append(p + W)
    return out

CH_PARAMS = {1: dict(W=2, H=2, kLo=3, kHi=6),
             2: dict(W=3, H=2, kLo=6, kHi=12),
             3: dict(W=3, H=3, kLo=12, kHi=20)}
CH_LEN = 5
STATIC = 20

def gen_one(P, rnd):
    W, H, n = P['W'], P['H'], P['W'] * P['H']
    K = ri(rnd, P['kLo'], P['kHi'])
    for _attempt in range(40):
        barr = list(range(n - 1)) + [-1]      # barr[pos] = 块 id（-1=空格）
        blank, prev = n - 1, -1
        path = []                             # 每步滑入空格的块 id（构造序）
        for _k in range(K):
            cands = [p for p in neighbors(blank, W, H) if p != prev]
            pick = cands[int(rnd() * len(cands))]
            path.append(barr[pick])
            barr[blank] = barr[pick]; barr[pick] = -1
            prev, blank = blank, pick
        if barr == list(range(n - 1)) + [-1]:
            continue                          # 终态=完成态：重摇
        # opt=1 模式拒绝（非平凡，SPEC「K 下限保证非平凡」滑块特化）：
        # 完成态上把块 m 与空格互换 = blank===m 且 barr[n-1]===m 且其余全归位
        m = barr[n - 1]
        if (m is not None and m >= 0 and blank == m and
                all(barr[p] == p for p in range(n - 1) if p != m)):
            continue
        return dict(W=W, H=H, K=K, barr=barr, blank=blank, path=path)
    raise RuntimeError('gen_one exhausted')

def gen_level(flat):
    ch = flat // CH_LEN + 1
    dch = (ch - 1) % 4 + 1
    rnd = mulberry32(flat * 7919 + 13)
    dch = dch if flat < STATIC else ri(rnd, 1, 4)
    if dch == 4:
        plan = shuffled([1, 2, 3, 1, 2], rnd)  # 每题盘型轮换（≥2 种）
    else:
        plan = [dch] * CH_LEN
    quizzes = [gen_one(CH_PARAMS[p], rnd) for p in plan]
    return dict(flat=flat, ch=ch, dch=dch, plan=plan, quizzes=quizzes)

# ---------- BFS 全表距离（从完成态反向） ----------
def dist_table(W, H):
    n = W * H
    goal = tuple(list(range(n - 1)) + [-1])
    dist = {goal: 0}
    dq = deque([goal])
    while dq:
        s = dq.popleft()
        d = dist[s]
        b = s.index(-1)
        for p in neighbors(b, W, H):
            t = list(s); t[b] = t[p]; t[p] = -1
            t = tuple(t)
            if t not in dist:
                dist[t] = d + 1
                dq.append(t)
    return dist

def opt_of(q, tables):
    return tables[(q['W'], q['H'])][tuple(q['barr'])]

def path_replay_ok(q):
    """逆路径：玩家按 path 反序滑回完成态"""
    W, H, n = q['W'], q['H'], q['W'] * q['H']
    barr = q['barr'][:]; blank = q['blank']
    for tid in reversed(q['path']):
        pos = barr.index(tid)
        if pos not in neighbors(blank, W, H):
            return False
        barr[blank] = tid; barr[pos] = -1; blank = pos
    return barr == list(range(n - 1)) + [-1] and blank == n - 1

tables = {(P['W'], P['H']): dist_table(P['W'], P['H']) for P in CH_PARAMS.values()}
PARAM_BY_SIZE = {(P['W'], P['H']): P for P in CH_PARAMS.values()}
fails, opts, ks = [], [], []
for flat in range(40):
    L1, L2 = gen_level(flat), gen_level(flat)
    if L1 != L2: fails.append((flat, 'determinism'))
    for q in L1['quizzes']:
        P = PARAM_BY_SIZE[(q['W'], q['H'])]
        if not (P['kLo'] <= q['K'] <= P['kHi']): fails.append((flat, 'Kband'))
        opt = opt_of(q, tables)
        opts.append(opt); ks.append(q['K'])
        if opt > q['K']: fails.append((flat, 'opt>K', opt, q['K']))
        if opt < 2: fails.append((flat, 'opt<2', opt, q['K']))
        if not path_replay_ok(q): fails.append((flat, 'pathReplay'))
    if L1['dch'] == 4 and len(set(L1['plan'])) < 2: fails.append((flat, 'dch4mono'))
    if L1['dch'] in (1, 2, 3) and len(set(L1['plan'])) != 1: fails.append((flat, 'planMono'))

print('fails:', fails[:10], 'total', len(fails))
print('opt range:', min(opts), '-', max(opts), ' K range:', min(ks), '-', max(ks))
import statistics
slack = [k - o for o, k in zip(opts, ks)]
print('K-opt slack: mean %.1f max %d  (slack==0 count %d/%d)' % (statistics.mean(slack), max(slack), slack.count(0), len(slack)))
ratio = [o / k for o, k in zip(opts, ks)]
print('opt/K: min %.2f mean %.2f' % (min(ratio), statistics.mean(ratio)))
# 章分布
from collections import Counter
print('plan cover:', Counter((q['W'], q['H']) for f in range(40) for q in gen_level(f)['quizzes']))
