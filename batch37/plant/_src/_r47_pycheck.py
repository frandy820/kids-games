# -*- coding: utf-8 -*-
"""r47 pycheck——Python 位级复刻 mulberry32 对账谱 40 关逐字段（独立复验，禁读引擎期望）
用法:
  python _r47_pycheck.py                    # 先验自证（生成律复算+不变量+分布下界，无需浏览器）
  python _r47_pycheck.py <post_full.json>   # 先验自证 + 与谱提取器产物逐字段对拍（40 关 200 题）
复刻口径（SPEC-R47 §R3）：
  abs 流 = mulberry32(flat*7919 + 737 + qi*131)   （v1 原样——ch1 全 abs ⇒ flat0-4 锚面）
  rel 流 = mulberry32(flat*7919 + 9973 + qi*131)  （r47 rel 流常量 9973）
  rel 约束重抽同流：star∉used → feasDirs（DIRS 'r','d','l','u' 固定序过滤 margin≥1）
  → d=集[floor(rnd*len)]、s=ri(1,min(3,margin)) 两段 → 中途/终点在格 → 净≠0 →
  终点∉used → 违者整组重抽（rnd 流不复位）
Math.imul 位级：Python 全程 & 0xFFFFFFFF 无符号模式跟踪（xor/add/imul 低位比特恒等），
>>> 逻辑右移按无符号值 >> ——与 JS 位模式逐位一致（r44 _r44_pycheck 同范式）。
"""
import json
import sys

CH_LEN = 5
SPEC_N = {1: 3, 2: 4, 3: 5, 4: 6}
SPEC_REL_PLAN = {1: [], 2: [1, 3], 3: [1, 3], 4: [0, 2, 4]}
DIRS = ['r', 'd', 'l', 'u']
DRC = {'r': (0, 1), 'd': (1, 0), 'l': (0, -1), 'u': (-1, 0)}


def _imul(x, y):
    """Math.imul 低 32 位（无符号模式——xor/add 后续全按位模式操作，符号解释无差）"""
    return ((x & 0xFFFFFFFF) * (y & 0xFFFFFFFF)) & 0xFFFFFFFF


def mulberry32(a):
    a &= 0xFFFFFFFF
    state = [a]

    def rnd():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = _imul((state[0] ^ (state[0] >> 15)) & 0xFFFFFFFF, (1 | state[0]) & 0xFFFFFFFF)
        t = ((t + _imul((t ^ (t >> 7)) & 0xFFFFFFFF, (61 | t) & 0xFFFFFFFF)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd


def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))          # floor(rnd*(hi-lo+1))——JS Math.floor 同口径


def margin_of(r, c, n, d):
    return n - c if d == 'r' else n - r if d == 'd' else c - 1 if d == 'l' else r - 1


def feas_dirs(r, c, n):
    return [d for d in DIRS if margin_of(r, c, n, d) >= 1]


def spec_abs_one(flat, qi, n, used):
    rnd = mulberry32(flat * 7919 + 737 + qi * 131)
    while True:
        row = ri(rnd, 1, n)
        col = ri(rnd, 1, n)
        idx = (row - 1) * n + (col - 1)
        if idx not in used:
            break
    used.append(idx)
    return {'mode': 'abs', 'row': row, 'col': col, 'star': None, 'moves': None,
            'idx': idx, 'starIdx': -1}


def spec_rel(flat, qi, n, used):
    rnd = mulberry32(flat * 7919 + 9973 + qi * 131)
    while True:
        sr, sc = ri(rnd, 1, n), ri(rnd, 1, n)
        star_i = (sr - 1) * n + (sc - 1)
        if star_i in used:
            continue
        f1 = feas_dirs(sr, sc, n)
        if not f1:
            continue
        d1 = f1[int(rnd() * len(f1))]               # floor(rnd*len)
        s1 = ri(rnd, 1, min(3, margin_of(sr, sc, n, d1)))
        r1 = sr + DRC[d1][0] * s1
        c1 = sc + DRC[d1][1] * s1
        f2 = feas_dirs(r1, c1, n)
        if not f2:
            continue
        d2 = f2[int(rnd() * len(f2))]
        s2 = ri(rnd, 1, min(3, margin_of(r1, c1, n, d2)))
        tr = r1 + DRC[d2][0] * s2
        tc = c1 + DRC[d2][1] * s2
        tgt_i = (tr - 1) * n + (tc - 1)
        if tgt_i == star_i or tgt_i in used:
            continue
        break
    used.append(tgt_i)
    return {'mode': 'rel', 'row': tr, 'col': tc, 'star': {'row': sr, 'col': sc},
            'moves': [[d1, s1], [d2, s2]], 'idx': tgt_i, 'starIdx': star_i}


def spec_dch(flat):
    return flat // CH_LEN % 4 + 1


def spec_level(flat):
    dch = spec_dch(flat)
    n = SPEC_N[dch]
    rel_at = SPEC_REL_PLAN[dch]
    used, qs = [], []
    for qi in range(CH_LEN):
        if qi in rel_at:
            qs.append(spec_rel(flat, qi, n, used))
        else:
            qs.append(spec_abs_one(flat, qi, n, used))
    return {'dch': dch, 'n': n, 'qs': qs}


def prior_checks():
    """先验自证（禁读页面/引擎——纯 Python 生成律复算推导）"""
    fails = []
    dist = {'dir': {}, 'step': {}, 'rowN': {}}
    rel_total = 0
    for flat in range(40):
        exp = spec_level(flat)
        # ① 章谱：dch 静态档 + n 块（静态 ch1-4=n1-4；生成 20-24=3/25-29=4/30-34=5/35-39=6）
        blk = flat // 5 if flat < 20 else (flat - 20) // 5
        if exp['n'] != [3, 4, 5, 6][blk]:
            fails.append('nblk flat=%d' % flat)
        # ② REL_PLAN 计数 + 题位
        rel_at = [k for k, q in enumerate(exp['qs']) if q['mode'] == 'rel']
        if rel_at != SPEC_REL_PLAN[exp['dch']]:
            fails.append('relAt flat=%d %s' % (flat, rel_at))
        if flat < 5 and any(q['mode'] != 'abs' for q in exp['qs']):
            fails.append('ch1-anchor flat=%d 含 rel（锚面破坏）' % flat)   # §R5：ch1 全 abs
        # ③ 关内 5 格互异
        if len(set(q['idx'] for q in exp['qs'])) != CH_LEN:
            fails.append('uniq flat=%d' % flat)
        # ④ 坐标域 + rel 不变量组（star∉used 前置/路径在格/净≠0/moves 域）
        for k, q in enumerate(exp['qs']):
            if not (1 <= q['row'] <= exp['n'] and 1 <= q['col'] <= exp['n']):
                fails.append('dom flat=%d/%d' % (flat, k))
            if q['mode'] == 'rel':
                rel_total += 1
                if q['idx'] == q['starIdx']:
                    fails.append('net0 flat=%d/%d' % (flat, k))
                r, c = q['star']['row'], q['star']['col']
                ok_path = True
                for m in q['moves']:
                    if m[0] not in DRC or not (1 <= m[1] <= 3):
                        ok_path = False
                        break
                    r += DRC[m[0]][0] * m[1]
                    c += DRC[m[0]][1] * m[1]
                    if not (1 <= r <= exp['n'] and 1 <= c <= exp['n']):
                        ok_path = False
                        break
                if not ok_path or (r, c) != (q['row'], q['col']):
                    fails.append('path flat=%d/%d' % (flat, k))
            # 分布聚合（全 40 关）
            key = 'n%d' % exp['n']
            dist['rowN'][key] = dist['rowN'].setdefault(key, {})
            dist['rowN'][key][q['row']] = dist['rowN'][key].get(q['row'], 0) + 1
            if q['mode'] == 'rel':
                for m in q['moves']:
                    dist['dir'][m[0]] = dist['dir'].get(m[0], 0) + 1
                    dist['step'][m[1]] = dist['step'].get(m[1], 0) + 1
    # ⑤ 分布断言（r39-bis：下界从均匀期望独立推导——140 段方向期望 35/值取 8；
    #    行覆盖 n=6 桶 50 题期望 8.3/值取 2——verify ⑧ 同口径双防线）
    for d in DIRS:
        if dist['dir'].get(d, 0) < 8:
            fails.append('dist-dir %s=%d' % (d, dist['dir'].get(d, 0)))
    for s in (1, 2, 3):
        if dist['step'].get(s, 0) < 8:
            fails.append('dist-step %d=%d' % (s, dist['step'].get(s, 0)))
    for n in (5, 6):
        t = dist['rowN'].get('n%d' % n, {})
        for r in range(1, n + 1):
            if t.get(r, 0) < 2:
                fails.append('dist-row n%d r%d=%d' % (n, r, t.get(r, 0)))
    return fails, dist, rel_total


def compare(post_path):
    """与谱提取器产物（--full 全字段）逐字段对拍：40 关 200 题 mode/row/col/star/moves"""
    post = json.loads(open(post_path, encoding='utf-8').read())
    fails = []
    n_cmp = 0
    for flat_s, lv in post.items():
        flat = int(flat_s)
        exp = spec_level(flat)
        if lv['n'] != exp['n'] or lv['dch'] != exp['dch']:
            fails.append('meta flat=%d page(n=%s,dch=%s) py(n=%d,dch=%d)'
                         % (flat, lv['n'], lv['dch'], exp['n'], exp['dch']))
        if len(lv['qs']) != CH_LEN:
            fails.append('qlen flat=%d=%d' % (flat, len(lv['qs'])))
            continue
        for k, q in enumerate(lv['qs']):
            e = exp['qs'][k]
            n_cmp += 1
            for f in ('mode', 'row', 'col', 'star', 'moves'):
                if q.get(f) != e[f]:
                    fails.append('field flat=%d/%d %s page=%r py=%r' % (flat, k, f, q.get(f), e[f]))
    return fails, n_cmp


def main():
    fails, dist, rel_total = prior_checks()
    print('PRIOR: %d fails; rel questions=%d/200; dir=%s; step=%s' %
          (len(fails), rel_total,
           {d: dist['dir'].get(d, 0) for d in DIRS},
           {s: dist['step'].get(s, 0) for s in (1, 2, 3)}))
    print('rowN(n5)=%s' % dist['rowN'].get('n5'))
    print('rowN(n6)=%s' % dist['rowN'].get('n6'))
    for f in fails[:20]:
        print('  PRIOR-FAIL:', f)
    if len(sys.argv) > 1:
        cfails, n_cmp = compare(sys.argv[1])
        print('COMPARE(%s): %d quizzes, %d fails' % (sys.argv[1], n_cmp, len(cfails)))
        for f in cfails[:20]:
            print('  CMP-FAIL:', f)
        fails += cfails
    print('PYCHECK', 'PASS' if not fails else 'FAIL(%d)' % len(fails))
    sys.exit(0 if not fails else 1)


if __name__ == '__main__':
    main()
