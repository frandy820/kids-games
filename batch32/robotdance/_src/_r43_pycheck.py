# -*- coding: utf-8 -*-
"""robotdance r43 pycheck：Python 侧独立复算生成律 × index.html 引擎谱 逐字段对拍。
三层：
  ① mulberry32/shuffled/ri 位级复刻（JS 32 位语义：Math.imul/|0/>>> 全程无符号位域）
     + SPEC-R43 §R4 生成律独立实现（消耗序：dch→kq→每题 shuffled(POOL10)9rnd→重复注入
     2rnd/个+3连顺移0rnd→fix(k 1rnd+bad 掷位1rnd+顺移0rnd)→干扰 shuffled(rest)→块洗牌）
  ② 40 关 × 5 题 = 200 题逐字段对拍（dch/steps/anims/fix 的 k+bad+disp/kind）
  ③ 分布断言（与 game-verify ②b 双落，r39-bis ①铁律）：步数谱按 dch 精确计数/重复律
     （ch1/2 恒 0、ch3 恒 1、ch4 恒 2）/干扰恒值 NEW_CAP/禁 3 连（steps+disp）全 0/
     fix 错步位 k 直方图散布 distinct≥4 且 max≤fixN//2+1（防恒位，r39-bis F1 同族）/
     fix 题位 kq 散布 distinct≥3/每关恰 1 fix（dch4）
  ④ flat0 q0 锚面 × r43-baseline.json 逐字节对拍（SPEC-R43 §R10 存档兼容实证）
用法: python batch32/robotdance/_src/_r43_pycheck.py"""
import io, json, pathlib, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from _r43_extract import extract_from

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

# ---- SPEC-R43 §R3 表（从 SPEC 文字独立重列）----
POOL10 = ['jump', 'spin', 'clap', 'stomp', 'wave', 'nod', 'kick', 'shake', 'bow', 'stretch']
OLD5 = ['jump', 'spin', 'clap', 'stomp', 'wave']
CH1_STEPS = [3, 4, 4, 5, 5]
DCH_STEPS = {2: 6, 3: 7, 4: 8}
U_CAP = {1: 5, 2: 6, 3: 6, 4: 6}
NEW_CAP = {1: 3, 2: 3, 3: 4, 4: 4}

def makes_triple(arr, p, a):
    if p > 0 and arr[p - 1] == a:
        if p > 1 and arr[p - 2] == a:
            return True
        if p < len(arr) and arr[p] == a:
            return True
    if p < len(arr) and arr[p] == a and p + 1 < len(arr) and arr[p + 1] == a:
        return True
    return False

def has_triple(arr):
    return any(arr[i] == arr[i - 1] == arr[i - 2] for i in range(2, len(arr)))

def build_quiz(dch, rnd, qi, is_fix):
    n = CH1_STEPS[qi] if dch == 1 else DCH_STEPS[dch]
    u = min(n, U_CAP[dch])
    moves = shuffled(POOL10, rnd)[:u]
    steps = moves[:n]
    while len(steps) < n:                                      # u<n（ch3/4）：重复注入（每 2 rnd）
        a = moves[ri(rnd, 0, u - 1)]
        p = ri(rnd, 0, len(steps))
        if makes_triple(steps, p, a):
            q2 = (p + 1) % (len(steps) + 1)
            while q2 != p and makes_triple(steps, q2, a):
                q2 = (q2 + 1) % (len(steps) + 1)
            p = q2
        steps = steps[:p] + [a] + steps[p:]
    if is_fix:
        k = ri(rnd, 0, n - 1)
        uniq = [x for x in dict.fromkeys(steps) if x != steps[k]]
        bi = ri(rnd, 0, len(uniq) - 1)
        bad = uniq[bi]
        for t in range(1, len(uniq)):
            cand = uniq[(bi + t) % len(uniq)]
            test = steps[:]; test[k] = cand
            if not has_triple(test):
                bad = cand; break
        disp = steps[:]; disp[k] = bad
        return {'kind': 'fix', 'steps': steps, 'k': k, 'bad': bad, 'disp': disp, 'anims': []}
    sset = set(steps)
    rest = [x for x in POOL10 if x not in sset]
    extras = shuffled(rest, rnd)[:NEW_CAP[dch]]
    order = shuffled(steps + extras, rnd)
    return {'kind': 'seq', 'steps': steps, 'anims': order}

def legacy_quiz(rnd):                                          # flat0 q0 锚面（旧律逐字节）
    pool = shuffled(OLD5, rnd)
    steps = pool[:3]
    order = shuffled(steps, rnd)
    return {'kind': 'seq', 'steps': steps, 'anims': order}

def gen_level(flat):
    ch = flat // 5 + 1
    rnd = mulberry32(flat * 7919 + 823)
    dch = (ch - 1) % 4 + 1 if flat < 20 else ri(rnd, 1, 4)
    kq = ri(rnd, 0, 4) if dch == 4 else -1
    quizzes = []
    for qi in range(5):
        if flat == 0 and qi == 0:
            quizzes.append(legacy_quiz(rnd))
        else:
            quizzes.append(build_quiz(dch, rnd, qi, qi == kq))
    return dch, kq, quizzes

def main():
    idx = (ROOT.parent / 'index.html').read_text(encoding='utf-8')
    spectra = extract_from(idx, 60)                            # 引擎谱（r43 minor6：40→60 关，dch4 样本翻倍）
    n_q = sum(len(L['q']) for L in spectra)
    assert n_q == 300, '引擎谱题数 %d != 300（60 关×5 题）' % n_q
    # ---- ② 逐字段对拍 ----
    mism = []
    nHist, dupHist, disHist, kHist, kqHist = {}, {}, {}, {}, {}
    triple_cnt = 0
    for L in spectra:
        dch, kq, mine = gen_level(L['flat'])                   # Python 独立复算
        if dch != L['dch']:
            mism.append('flat%d dch %s!=%s' % (L['flat'], dch, L['dch']))
        fix_seen = 0
        for qi, (ref, my) in enumerate(zip(L['q'], mine)):
            if ref['kind'] != my['kind'] or ref['steps'] != my['steps'] or ref['anims'] != my['anims']:
                mism.append('flat%d/q%d core %s|%s vs %s|%s' %
                            (L['flat'], qi, ref['kind'], ','.join(ref['steps']), my['kind'], ','.join(my['steps'])))
                continue
            if my['kind'] == 'fix':
                if ref.get('k') != my['k'] or ref.get('bad') != my['bad'] or ref.get('disp') != my['disp']:
                    mism.append('flat%d/q%d fix k/bad/disp %s/%s vs %s/%s' %
                                (L['flat'], qi, ref.get('k'), ref.get('bad'), my['k'], my['bad']))
                fix_seen += 1
                kHist[my['k']] = kHist.get(my['k'], 0) + 1
                if has_triple(my['disp']):
                    triple_cnt += 1
            else:
                dis = len([a for a in my['anims'] if a not in set(my['steps'])])
                disHist['%d:%d' % (dch, dis)] = disHist.get('%d:%d' % (dch, dis), 0) + 1
        if dch == 4:
            if fix_seen != 1:
                mism.append('flat%d dch4 fix 题数 %d != 1' % (L['flat'], fix_seen))
            kqHist[kq] = kqHist.get(kq, 0) + 1
        else:
            assert kq == -1 and fix_seen == 0
        # 聚合桶
        for ref in L['q']:
            u = len(set(ref['steps']))
            nHist['%d:%d' % (L['dch'], ref['n'])] = nHist.get('%d:%d' % (L['dch'], ref['n']), 0) + 1
            dupHist['%d:%d' % (L['dch'], ref['n'] - u)] = dupHist.get('%d:%d' % (L['dch'], ref['n'] - u), 0) + 1
            if has_triple(ref['steps']):
                triple_cnt += 1
    assert not mism, '对拍失败 %d 处，首 5 处: %s' % (len(mism), mism[:5])
    print('PYCHECK MATCH: 60 levels x 5 quizzes = 300/300 (dch/steps/anims/fix k+bad+disp 全字段一致)')
    # ---- ③ 分布断言（HIST OK——与 game-verify ②b 双落）----
    lv_by_dch = {}
    for L in spectra:
        lv_by_dch[L['dch']] = lv_by_dch.get(L['dch'], 0) + 1
    d = lv_by_dch                                              # 本统计含静态 20+生成 40 全部 60 关（minor6 扩面）
    assert nHist['1:3'] == d[1] and nHist['1:4'] == d[1] * 2 and nHist['1:5'] == d[1] * 2, nHist
    assert nHist['2:6'] == d[2] * 5 and nHist['3:7'] == d[3] * 5 and nHist['4:8'] == d[4] * 5, nHist
    assert dupHist['1:0'] == d[1] * 5 and dupHist['2:0'] == d[2] * 5 and \
           dupHist['3:1'] == d[3] * 5 and dupHist['4:2'] == d[4] * 5, dupHist
    assert disHist['1:3'] == d[1] * 5 - 1 and disHist['2:3'] == d[2] * 5 and \
           disHist['3:4'] == d[3] * 5 and disHist['4:4'] == d[4] * 4, disHist
    assert triple_cnt == 0, '禁 3 连违约 %d 处' % triple_cnt
    fix_n = sum(kHist.values())
    k_max = max(kHist.values())
    assert fix_n == d[4] and len(kHist) >= 4 and k_max <= fix_n // 2 + 1, \
        'fix k 直方图散布不足: %s (fixN=%d)' % (kHist, fix_n)
    assert len(kqHist) >= 3, 'fix 题位 kq 散布不足: %s' % kqHist
    print('HIST OK: nHist=%s dupHist=%s disHist=%s' % (nHist, dupHist, disHist))
    print('HIST OK: fix kHist=%s (distinct=%d max=%d cap=%d) kqHist=%s (distinct=%d) fixN=%d' %
          (kHist, len(kHist), k_max, fix_n // 2 + 1, kqHist, len(kqHist), fix_n))
    # ---- ④ flat0 q0 锚面 × baseline 逐字节 ----
    base = json.loads((ROOT / 'r43-baseline.json').read_text(encoding='utf-8'))
    b0 = base['spectra'][0]['q'][0]
    now0 = spectra[0]['q'][0]
    assert now0['kind'] == 'seq' and now0['steps'] == b0['steps'] and now0['anims'] == b0['anims'], \
        '锚面漂移: %s vs %s' % (now0, b0)
    print('ANCHOR OK: flat0 q0 steps=%s blocks=%s（与 r43-baseline 逐字节一致，§R10）' %
          (now0['steps'], now0['anims']))
    print('PYCHECK PASS')

if __name__ == '__main__':
    main()
