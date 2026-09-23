# -*- coding: utf-8 -*-
"""r36 Python 独立复算（r26/r27/r33 范式）：按 SPEC-R36-SIGN §R3 生成律 Python 独立实现
mulberry32/shuffled/ri（与 JS 同源副本，逐位一致），40 关 genLevel 全字段与页内提取的
r36-post.json 对拍。用法: python _r36_pycheck.py"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
CH_LEN = 5
STATIC_LEVELS = 20

WALK5 = ['light', 'zebra', 'bridge', 'tunnel', 'walk']
DENY15 = ['noentry', 'nocar', 'noped', 'nobike', 'horn', 'stop', 'yield',
          'ped', 'child', 'work', 'slow', 'cross', 'turn', 'slip', 'rail']
ALL24 = WALK5 + DENY15 + ['oneway', 'straight', 'goleft', 'goright']   # = Object.keys(SIGNS) 声明序（rnd 索引敏感）
NEAR = {'noentry': 'nocar', 'nocar': 'noentry', 'noped': 'nobike', 'nobike': 'noped',
        'stop': 'yield', 'yield': 'stop', 'ped': 'child', 'child': 'ped',
        'cross': 'turn', 'turn': 'cross', 'slip': 'slow', 'slow': 'slip',
        'oneway': 'straight', 'straight': 'oneway', 'goleft': 'goright', 'goright': 'goleft',
        'zebra': 'walk', 'walk': 'zebra'}
NEAR_POOL = list(NEAR.keys())
SYSTEM = {'light': 'signal',
          'noentry': 'red', 'nocar': 'red', 'noped': 'red', 'nobike': 'red', 'horn': 'red',
          'stop': 'redoct', 'yield': 'redtri',
          'ped': 'yellow', 'child': 'yellow', 'work': 'yellow', 'slow': 'yellow',
          'cross': 'yellow', 'turn': 'yellow', 'slip': 'yellow', 'rail': 'yellow',
          'zebra': 'blue', 'bridge': 'blue', 'tunnel': 'blue', 'oneway': 'blue', 'walk': 'blue',
          'straight': 'bluec', 'goleft': 'bluec', 'goright': 'bluec'}


def _u32(x):
    return x & 0xFFFFFFFF


def mulberry32(a):
    a = _u32(a)
    while True:
        a = _u32(a + 0x6D2B79F5)
        t = _u32((a ^ (a >> 15)) * (1 | a))
        t = _u32(t + _u32((t ^ (t >> 7)) * (61 | t)) ^ t)
        yield ((t ^ (t >> 14)) >> 0) / 4294967296.0


def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(next(rnd) * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a


def ri(rnd, lo, hi):
    return lo + int(next(rnd) * (hi - lo + 1))


def pick_diff(pool, rnd, prev):
    s = pool[int(next(rnd) * len(pool))]
    g = 0
    while g < 8 and s == prev:
        s = pool[int(next(rnd) * len(pool))]
        g += 1
    return s


def spec_seq_of(dch, rnd, flat):
    seq = []
    if dch == 1:
        s0 = 0 if flat == 0 else int(next(rnd) * len(WALK5))
        for qi in range(CH_LEN):
            seq.append({'sign': WALK5[(s0 + qi) % len(WALK5)], 'kind': 'mean',
                        'flash': False, 'near': False})
        return seq
    if dch == 2:
        fp = shuffled([0, 1, 2, 3, 4], rnd)
        prev = None
        for qi in range(CH_LEN):
            s = pick_diff(DENY15, rnd, prev)
            seq.append({'sign': s, 'kind': 'mean',
                        'flash': qi == fp[0] or qi == fp[1], 'near': False})
            prev = s
        return seq
    if dch == 3:
        fp = ri(rnd, 1, 4)
        prev = None
        for qi in range(CH_LEN):
            s = pick_diff(NEAR_POOL, rnd, prev)
            seq.append({'sign': s, 'kind': 'mean', 'flash': qi == fp, 'near': True})
            prev = s
        return seq
    kseq = shuffled(['nm', 'nm', 'act', 'act', 'boss'], rnd)
    prev = None
    for qi in range(CH_LEN):
        k = kseq[qi]
        pool = ALL24 if k == 'act' else NEAR_POOL
        s = pick_diff(pool, rnd, prev)
        seq.append({'sign': s, 'kind': 'act' if k == 'act' else 'mean',
                    'flash': k == 'boss', 'near': k != 'act'})
        prev = s
    return seq


def build_quiz(spec, dch, rnd):
    s = spec['sign']
    if dch == 1:
        ds = shuffled([x for x in WALK5 if x != s], rnd)[:3]
    elif spec['kind'] == 'act':
        sys_ = SYSTEM[s]
        same = shuffled([x for x in ALL24 if x != s and SYSTEM[x] == sys_], rnd)
        ds = same[:3]
        if len(ds) < 3:
            ds = ds + shuffled([x for x in ALL24 if x != s and x not in ds], rnd)[:3 - len(ds)]
    elif dch == 2:
        sys_ = SYSTEM[s]
        same = shuffled([x for x in DENY15 if x != s and SYSTEM[x] == sys_], rnd)
        ds = same[:3]
        if len(ds) < 3:
            ds = ds + shuffled([x for x in DENY15 if x != s and x not in ds], rnd)[:3 - len(ds)]
    elif spec['near']:
        ds = [NEAR[s]] + shuffled([x for x in ALL24 if x != s and x != NEAR[s]], rnd)[:2]
    else:
        ds = shuffled([x for x in ALL24 if x != s], rnd)[:3]
    order = shuffled([s] + ds, rnd)
    return {'sign': s, 'kind': spec['kind'], 'flash': bool(spec['flash']),
            'near': bool(spec['near']), 'cards': list(order)}


def gen_level(flat):
    flat = max(0, int(flat))
    ch = flat // CH_LEN + 1
    rnd = mulberry32(flat * 7919 + 13)
    if flat < STATIC_LEVELS:
        dch = (ch - 1) % 4 + 1
    else:
        dch = ri(rnd, 1, 4)
    specs = spec_seq_of(dch, rnd, flat)
    return {'flat': flat, 'dch': dch,
            'quizzes': [build_quiz(sp, dch, rnd) for sp in specs]}


def main():
    post = json.loads((HERE / 'r36-post.json').read_text(encoding='utf-8'))
    nbad = 0
    for lv in post:
        mine = gen_level(lv['flat'])
        if mine['dch'] != lv['dch'] or mine['quizzes'] != lv['quizzes']:
            nbad += 1
            if nbad <= 3:
                print('MISMATCH flat', lv['flat'])
                print('  page:', json.dumps(lv['quizzes'][:2], ensure_ascii=False)[:200])
                print('  mine:', json.dumps(mine['quizzes'][:2], ensure_ascii=False)[:200])
    n = len(post)
    print('PYCHECK %d/%d identical' % (n - nbad, n))
    return nbad


if __name__ == '__main__':
    import sys
    sys.exit(1 if main() else 0)
