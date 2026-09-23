# -*- coding: utf-8 -*-
"""r33 Python 独立复算（r26/r27 范式）：按 SPEC-R33-WHEREISTAND §R3 生成律 Python 实现
mulberry32/shuffled/ri（与 JS 同源副本，逐位一致），40 关 genLevel 全字段（含 line）与页内
提取的 r33-post-full.json 对拍。用法: python _r33_pycheck.py"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
CH_LEN = 5
STATIC_LEVELS = 20
ALL_DIRS = ['up', 'down', 'left', 'right']
DIRS_OF_ORIENT = {'horiz': ['left', 'right'], 'vert': ['up', 'down']}
ORIENT_OF_DIR = {'up': 'vert', 'down': 'vert', 'left': 'horiz', 'right': 'horiz'}
ANIMAL_IDS = ['rabbit', 'cat', 'dog', 'bear', 'elephant', 'monkey', 'frog', 'duck']


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


def answer_idx_of(mode, d, k):
    from_start = d in ('up', 'left')
    if mode == 'edge':
        return 0 if from_start else CH_LEN - 1
    return (k - 1) if from_start else (CH_LEN - k)


def two_answer_idx(d, k, d2):
    ref = answer_idx_of('ordinal', d, k)
    return (ref - 1) if d2 in ('up', 'left') else (ref + 1)


def flip_answer_idx(orient, d2, ref):
    if orient == 'horiz':
        return ref + 1 if d2 == 'left' else ref - 1
    return ref - 1 if d2 == 'up' else ref + 1


def gen_one(dch, qi, rnd, mode_seq, dir_seq):
    mode = dir = k = dir2 = ref_idx = None
    if dch == 1:
        mode, dir = 'edge', ('up' if qi == 0 else dir_seq[qi - 1])
    elif mode_seq is not None:
        mode = mode_seq[qi]
    else:
        mode = ['edge', 'ordinal', 'two', 'flip'][ri(rnd, 0, 3)]
    if mode == 'edge':
        if dir is None:
            dir = ALL_DIRS[ri(rnd, 0, 3)]
    elif mode == 'ordinal':
        dir = ALL_DIRS[ri(rnd, 0, 3)]
        k = ri(rnd, 1, 5)
    elif mode == 'two':
        o = ['horiz', 'vert'][ri(rnd, 0, 1)]
        dir = DIRS_OF_ORIENT[o][ri(rnd, 0, 1)]
        k = ri(rnd, 2, 4)
        dir2 = DIRS_OF_ORIENT[o][ri(rnd, 0, 1)]
    else:
        o = ['horiz', 'vert'][ri(rnd, 0, 1)]
        dir2 = DIRS_OF_ORIENT[o][ri(rnd, 0, 1)]
        ref_idx = ri(rnd, 1, 3)
    line = shuffled(ANIMAL_IDS, rnd)[:5]
    orient = ORIENT_OF_DIR[dir2 if mode == 'flip' else dir]
    if mode == 'two':
        answer = two_answer_idx(dir, k, dir2)
    elif mode == 'flip':
        answer = flip_answer_idx(orient, dir2, ref_idx)
    else:
        answer = answer_idx_of(mode, dir, k)
    q = {'mode': mode, 'orient': orient, 'line': line, 'answerIdx': answer,
         '_miss': 0, '_answered': False}
    q['dir'] = None if mode == 'flip' else dir
    q['k'] = None if mode in ('edge', 'flip') else k
    q['dir2'] = dir2
    q['refIdx'] = ref_idx
    return q


def gen_level(flat):
    ch = flat // CH_LEN + 1
    dch = (ch - 1) % 4 + 1
    rnd = mulberry32(flat * 7919 + 13)
    mode_seq = dir_seq = None
    if flat < STATIC_LEVELS:
        if dch == 1:
            dir_seq = shuffled(['down', 'left', 'right', 'up'], rnd)
        elif dch == 2:
            mode_seq = ['edge'] + shuffled(['edge', 'ordinal', 'ordinal', 'ordinal'], rnd)
        elif dch == 3:
            mode_seq = ['ordinal'] + shuffled(['two', 'two', 'two', 'ordinal'], rnd)
        else:
            mode_seq = shuffled(['edge', 'ordinal', 'two', 'flip'], rnd)
            mode_seq.append(['edge', 'ordinal', 'two', 'flip'][ri(rnd, 0, 3)])
    eff_dch = None if flat >= STATIC_LEVELS else dch
    quizzes = [gen_one(eff_dch, qi, rnd, mode_seq, dir_seq) for qi in range(CH_LEN)]
    return {'ch': ch, 'dch': dch, 'lv': flat % CH_LEN, 'quizzes': quizzes}


def main():
    src = json.loads((HERE / 'r33-post-full.json').read_text(encoding='utf-8'))
    identical = 0
    diffs = []
    for f in range(40):
        L = gen_level(f)
        exp = src[str(f)]
        ok = (L['ch'] == exp['ch'] and L['dch'] == exp['dch'] and L['lv'] == exp['lv'] and
              all(_q_match(a, b) for a, b in zip(L['quizzes'], exp['qs'])))
        if ok:
            identical += 1
        else:
            diffs.append(f)
    print('PYCHECK %d/40 identical' % identical)
    if diffs:
        for f in diffs[:3]:
            print(' flat %d py=%s' % (f, json.dumps(gen_level(f)['quizzes'][0], ensure_ascii=False)[:160]))
            print('        js=%s' % json.dumps(src[str(f)]['qs'][0], ensure_ascii=False)[:160])
        raise SystemExit(1)


def _q_match(a, b):
    keys = ['mode', 'dir', 'k', 'dir2', 'refIdx', 'orient', 'answerIdx', 'line']
    return all(a.get(k_) == b.get(k_) for k_ in keys)


if __name__ == '__main__':
    main()
