# -*- coding: utf-8 -*-
"""quickcmp r46 pycheck：Python 侧独立复算生成律 × index.html 引擎谱 逐字段对拍。
四层：
  ① mulberry32/shuffled/ri 位级复刻（JS 32 位语义：Math.imul/|0/>>> 全程无符号位域）
     + SPEC-R46 §R3 生成律独立实现（消耗序：dch 先取（生成关 1rnd）→ 每题 buildQuiz：
     dch1 池取 1rnd / dch2 掷 1rnd+池取 1rnd（等数掷 <0.3 走 POOL_EQ2 否则 POOL_R2）/
     dch3 池取 1rnd / dch4 池取 1rnd → scatter(nL)+scatter(nR)：n≤12 十二格 / n≥13 二十格
     （shuffled 1rnd/元素 + 每点 2rnd 抖动））
  ② 40 关 × 5 题 = 200 题逐字段对拍（kind/nL/nR/d+phase（dual）/optsN/flash/pL/pR
     坐标 toFixed(2) 字符串——布点同源）
  ③ 分布断言（与 game-verify ③⑥⑬ 双落，r39-bis 铁律——下界独立推导禁抄观测）：
     池计数精确 20/16/14/42/11（独立枚举）/ch1 禁相等/ch2 等数在场 ≥1+等数域 10-20/
     ch2 比例带 [0.85,0.92) 差≥2 全域复算 0 违例/ch3 [0.85,0.90) 恒非等 0 违例/
     dual 档 {2,4,6} 各 ≥1+镜像侧 L/R 各 ≥1+phase 恒 0/flash 按章对 1200|1400/
     生成关 flat20-39 dch 四型全现
  ④ flat0-4 锚面（ch1 全 25 题）× r46-baseline.json 逐字节对拍（谱零改动实证——
     审计要求 flat0 q0 逐字节保留，本款超额全章保留）
用法: python batch36/quickcmp/_src/_r46_pycheck.py"""
import io, json, pathlib, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from _r46_extract import extract_from

# ---- ① JS 位级复刻（全 32 位无符号位域——与 Math.imul/|0/>>> 位模式一致）----
def _imul(a, b):
    return ((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF)) & 0xFFFFFFFF  # 低 32 位（位模式等价 Math.imul）

def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF                      # a = a + 0x6D2B79F5 | 0
        t = _imul(a ^ (a >> 15), 1 | a)                        # Math.imul(a ^ a>>>15, 1|a)
        t = (((t + _imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t) & 0xFFFFFFFF   # (t+imul)^t（+ 的 ToInt32 截断）
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0   # (t ^ t>>>14)>>>0 / 2^32
    return rnd

def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))                               # Math.floor(rnd()*(i+1))
        a[i], a[j] = a[j], a[i]
    return a

def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))

# ---- SPEC-R46 §R3 池独立枚举（序=引擎双循环同构——对拍吃池序）----
def pairs_where(lo, hi, min_diff, max_ratio):
    out = []
    for a in range(lo, hi + 1):
        for b in range(lo, hi + 1):
            if abs(a - b) < min_diff:
                continue
            if min(a, b) / max(a, b) > max_ratio:
                continue
            out.append((a, b))
    return out

def pairs_band(lo, hi, min_diff, r_lo, r_hi):
    out = []
    for a in range(lo, hi + 1):
        for b in range(lo, hi + 1):
            if abs(a - b) < min_diff:
                continue
            r = min(a, b) / max(a, b)
            if r < r_lo or r >= r_hi:
                continue
            out.append((a, b))
    return out

POOL_SUB = pairs_where(1, 5, 1, 1)                              # ch1 subitizing（锚面不动）
POOL_R2 = pairs_band(10, 20, 2, 0.85, 0.92)                     # ch2 比例带收紧（r46 主承载）
POOL_R3 = pairs_band(10, 20, 2, 0.85, 0.90)                     # ch3 窄带提速
POOL_EQ2 = [(n, n) for n in range(10, 21)]                      # ch2 等数（域 10-20）
POOL_DUAL = []                                                  # ch4 dual 双闪（含镜像）
for d in (2, 4, 6):
    for base in range(10, 21 - d):
        POOL_DUAL.append((base + d, base))
        POOL_DUAL.append((base, base + d))

def flash_ms(dch):                                              # SPEC-R46 §R8
    return 1400 if dch in (2, 4) else 1200

def build_quiz(dch, rnd):                                       # 消耗序见头部注释（§R3）
    kind = 'cmp'
    if dch == 1:
        pair = POOL_SUB[ri(rnd, 0, len(POOL_SUB) - 1)]          # 1 rnd
    elif dch == 2:
        is_eq = rnd() < 0.3                                     # 掷（1 rnd）
        pool = POOL_EQ2 if is_eq else POOL_R2
        pair = pool[ri(rnd, 0, len(pool) - 1)]                  # 取（1 rnd）
    elif dch == 3:
        pair = POOL_R3[ri(rnd, 0, len(POOL_R3) - 1)]            # 1 rnd
    else:
        kind = 'dual'
        pair = POOL_DUAL[ri(rnd, 0, len(POOL_DUAL) - 1)]        # 1 rnd（镜像在池内）
    q = {'kind': kind, 'nL': pair[0], 'nR': pair[1],
         'optsN': 2 if dch == 1 else 3, 'flash': flash_ms(dch)}
    if kind == 'dual':
        q['d'] = abs(pair[0] - pair[1])
        q['phase'] = 0
    return q

def scatter(n, rnd):                                            # 布点（§R3 网格分支）
    small = n <= 12
    cells = shuffled(list(range(12)) if small else list(range(20)), rnd)[:n]
    cols, jx, jy = (4, 2.8, 7) if small else (5, 2, 4)
    out = []
    for c in cells:
        col, row = c % cols, c // cols
        x = 10 + (2.5 if small else 0) + col * (25 if small else 20) + (rnd() * 2 - 1) * jx
        y = (50 / 3 if small else 12.5) + row * (100 / 3 if small else 25) + (rnd() * 2 - 1) * jy
        out.append(['%.2f' % x, '%.2f' % y])                    # list（JSON 投影同型对拍）
    return out

def gen_level(flat):
    ch = flat // 5 + 1
    rnd = mulberry32(flat * 7919 + 887)                         # 本款常量 887（SPEC §0.89 不变）
    dch = (ch - 1) % 4 + 1 if flat < 20 else ri(rnd, 1, 4)      # 生成关先取 dch（1 rnd）
    quizzes = []
    for _ in range(5):
        q = build_quiz(dch, rnd)
        q['pL'] = scatter(q['nL'], rnd)
        q['pR'] = scatter(q['nR'], rnd)
        quizzes.append(q)
    return dch, quizzes

def main():
    # ---- ③-a 池计数独立断言（SPEC-R46 §R3 精确值——写前验算的独立复核）----
    assert len(POOL_SUB) == 20, 'POOL_SUB %d != 20' % len(POOL_SUB)
    assert len(POOL_R2) == 16, 'POOL_R2 %d != 16（差2×7+差3×1 ×镜像）' % len(POOL_R2)
    assert len(POOL_R3) == 14, 'POOL_R3 %d != 14（差2×6+差3×1 ×镜像）' % len(POOL_R3)
    assert len(POOL_EQ2) == 11, 'POOL_EQ2 %d != 11（10-20 等数）' % len(POOL_EQ2)
    assert len(POOL_DUAL) == 42, 'POOL_DUAL %d != 42（d{2,4,6}×base×镜像）' % len(POOL_DUAL)
    print('POOLS OK: SUB=%d R2=%d R3=%d EQ2=%d DUAL=%d（§R3 精确计数一致）' %
          (len(POOL_SUB), len(POOL_R2), len(POOL_R3), len(POOL_EQ2), len(POOL_DUAL)))

    idx = (ROOT.parent / 'index.html').read_text(encoding='utf-8')
    spectra = extract_from(idx, 40)                             # 引擎谱（node 跑 index 内 genLevel）
    n_q = sum(len(L['q']) for L in spectra)
    assert n_q == 200, '引擎谱题数 %d != 200（40 关×5 题）' % n_q

    # ---- ② 逐字段对拍（Python 独立复算 vs 引擎投影）----
    mism = []
    for L in spectra:
        dch, mine = gen_level(L['flat'])
        if dch != L['dch']:
            mism.append('flat%d dch %s!=%s' % (L['flat'], dch, L['dch']))
            continue
        for qi, (ref, my) in enumerate(zip(L['q'], mine)):
            for f in ('kind', 'nL', 'nR', 'optsN', 'flash', 'pL', 'pR'):
                if ref.get(f) != my[f]:
                    mism.append('flat%d/q%d %s %r != %r' % (L['flat'], qi, f, ref.get(f), my[f]))
            if my['kind'] == 'dual' and (ref.get('d') != my['d'] or ref.get('phase') != 0):
                mism.append('flat%d/q%d dual d/phase %s/%s != %s/0' % (L['flat'], qi, ref.get('d'), ref.get('phase'), my['d']))
    assert not mism, '对拍失败 %d 处，首 5 处: %s' % (len(mism), mism[:5])
    print('PYCHECK MATCH: 40 levels x 5 quizzes = 200/200（kind/nL/nR/optsN/flash/pL/pR+dual d 全字段一致）')

    # ---- ③ 分布断言（独立推导——SPEC-R46 §R2/§R3 域表逐题复算 0 违例）----
    eq2_n, d_hist, s_hist, gen_dch = 0, {}, {}, {}
    viol = []
    for L in spectra:
        for q in L['q']:
            nL, nR, same = q['nL'], q['nR'], q['nL'] == q['nR']
            r = min(nL, nR) / max(nL, nR)
            dch = L['dch']
            if dch == 1:                                        # ch1：1-5 差≥1 禁相等 两按钮
                if same or not (1 <= nL <= 5 and 1 <= nR <= 5) or q['optsN'] != 2 or q['kind'] != 'cmp':
                    viol.append('ch1 flat%d %dvs%d' % (L['flat'], nL, nR))
            elif dch == 2:                                      # ch2：比例带 [0.85,0.92) 差≥2 / 等数 10-20
                if q['kind'] != 'cmp' or q['optsN'] != 3:
                    viol.append('ch2 kind/opts flat%d' % L['flat'])
                elif same:
                    if not (10 <= nL <= 20):
                        viol.append('ch2 eq-domain flat%d %d' % (L['flat'], nL))
                    eq2_n += 1
                else:
                    if not (10 <= nL <= 20 and 10 <= nR <= 20 and abs(nL - nR) >= 2
                            and 0.85 <= r < 0.92):
                        viol.append('ch2 band flat%d %dvs%d r=%.4f' % (L['flat'], nL, nR, r))
            elif dch == 3:                                      # ch3：窄带 [0.85,0.90) 恒非等
                if same or not (10 <= nL <= 20 and 10 <= nR <= 20 and abs(nL - nR) >= 2
                                and 0.85 <= r < 0.90) or q['optsN'] != 3 or q['kind'] != 'cmp':
                    viol.append('ch3 flat%d %dvs%d same=%s r=%.4f' % (L['flat'], nL, nR, same, r))
            else:                                               # ch4：dual 域+档+镜像
                if q['kind'] != 'dual' or same or not (10 <= nL <= 20 and 10 <= nR <= 20):
                    viol.append('ch4 flat%d kind/same/domain' % L['flat'])
                else:
                    d = abs(nL - nR)
                    if q['d'] != d or d not in (2, 4, 6) or q.get('phase') != 0 or q['optsN'] != 3:
                        viol.append('ch4 flat%d d=%s phase=%s' % (L['flat'], q['d'], q.get('phase')))
                    d_hist[q['d']] = d_hist.get(q['d'], 0) + 1
                    s_hist['L' if nL > nR else 'R'] = s_hist.get('L' if nL > nR else 'R', 0) + 1
            if q['flash'] != flash_ms(dch):
                viol.append('flash flat%d dch%d %s' % (L['flat'], dch, q['flash']))
        if L['flat'] >= 20:                                     # 生成关 dch 聚合（四型全现）
            gen_dch[L['dch']] = gen_dch.get(L['dch'], 0) + 1
    assert not viol, '域违例 %d 处，首 5 处: %s' % (len(viol), viol[:5])
    assert eq2_n >= 1, 'ch2 等数题 0 在场（25 题掷 <0.3 全空=生成律坏）'
    assert d_hist.get(2, 0) >= 1 and d_hist.get(4, 0) >= 1 and d_hist.get(6, 0) >= 1, \
        'dual 档直方图 {2,4,6} 未全覆盖: %s' % d_hist
    assert s_hist.get('L', 0) >= 1 and s_hist.get('R', 0) >= 1, 'dual 镜像侧未散布: %s' % s_hist
    assert all(gen_dch.get(k, 0) > 0 for k in (1, 2, 3, 4)), '生成关 dch 四型未全现: %s' % gen_dch
    print('HIST OK: ch2eq=%d dualD=%s dualSide=%s genDch=%s（分布断言独立推导全过）' %
          (eq2_n, d_hist, s_hist, gen_dch))

    # ---- ④ flat0-4 锚面 × r46-baseline.json 逐字节（ch1 全 25 题——超额保留实证）----
    base = json.loads((ROOT / 'r46-baseline.json').read_text(encoding='utf-8'))
    for bi in range(5):
        bL, nL_ = base['spectra'][bi], spectra[bi]
        assert bL['flat'] == nL_['flat'] == bi and bL['dch'] == nL_['dch'] == 1, \
            '锚面关序漂移 flat%d' % bi
        for qi, (bq, nq) in enumerate(zip(bL['q'], nL_['q'])):
            assert bq == nq, '锚面漂移 flat%d/q%d:\n base=%s\n now =%s' % (bi, qi, bq, nq)
    print('ANCHOR OK: flat0-4 ch1 全 25 题与 r46-baseline 逐字节一致（谱零改动——flat0 q0 超额）')
    print('PYCHECK PASS')


if __name__ == '__main__':
    main()
