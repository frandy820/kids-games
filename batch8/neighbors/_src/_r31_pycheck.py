# -*- coding: utf-8 -*-
"""r31 neighbors Python 独立复算（SPEC-R31-NEIGHBORS §R3 生成律的 Python 侧副本）
在 Python 独立实现 genLevel（mulberry32/shuffled/ri/drawN 8 型/genOne 干扰池/
hiddenNums 藏牌律/genLevel 章结构），与真实页（index.html 页内 JS genLevel）提取的
40 关 quizzes JSON 全量比对——两侧逐题一致 = r31 生成律独立验证。
另附：与 r31-baseline.json（改造前）的谱变更对照（保留/变更声明机检，r28-r30 范式）。
用法: python _r31_pycheck.py   （先 python _r31_extract.py r31-post.json）"""
import json, math, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
POST = HERE / 'r31-post.json'
BASELINE = HERE / 'r31-baseline.json'
CH_LEN = 5

# ---------- 确定性随机（与 game-core.js mulberry32 逐位同实现，r27-r30 pycheck 先例） ----------
def i32(x):
    x &= 0xFFFFFFFF
    return x - 0x100000000 if x >= 0x80000000 else x

def imul(a, b):
    return i32(a * b)

def mulberry32(seed):
    a = i32(seed)
    def rnd():
        nonlocal a
        a = i32(a + 0x6D2B79F5)
        t = imul(i32(a) ^ i32((a & 0xFFFFFFFF) >> 15), 1 | i32(a))
        t = i32(i32(t + imul(i32(t) ^ i32((t & 0xFFFFFFFF) >> 7), 61 | i32(t))) ^ i32(t))
        return ((i32(t) ^ i32((t & 0xFFFFFFFF) >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return rnd

def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = math.floor(rnd() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a

def ri(rnd, lo, hi):
    return lo + math.floor(rnd() * (hi - lo + 1))

def ch_of_flat(flat):
    return flat // CH_LEN + 1

def diff_of_ch(ch):
    return (ch - 1) % 4 + 1

# ---------- r31 生成律（SPEC-R31 §R3 独立副本，与 game-core.js 同源誊抄） ----------
def draw_n(dch, mode, rnd):
    if dch == 1:
        return ri(rnd, 1, 9)
    if dch == 2:
        return ri(rnd, 2, 10)
    if dch == 3:
        if mode == 'plus2':
            return ri(rnd, 10, 18)
        if mode == 'minus2':
            return ri(rnd, 12, 19)
        return ri(rnd, 10, 19)
    if mode == 'plus':
        return ri(rnd, 1, 19)
    if mode == 'minus':
        return ri(rnd, 2, 20)
    if mode == 'mid':
        return ri(rnd, 1, 18)
    if mode == 'plus2':
        return ri(rnd, 1, 18)
    if mode == 'minus2':
        return ri(rnd, 3, 20)
    if mode == 'mid4':
        return ri(rnd, 1, 16)
    return ri(rnd, 12, 18)          # dualA/dualB

def ref_nums(q):
    if q['mode'] == 'mid':
        return [q['n'], q['n'] + 2]
    if q['mode'] == 'mid4':
        return [q['n'], q['n'] + 4]
    return [q['n']]

def hidden_nums(q, dch):
    if dch < 3:
        return []
    refs = ref_nums(q)
    return [x for x in (q['answer'] - 1, q['answer'] + 1)
            if 1 <= x <= 20 and x not in refs]

POOLS = {
    'plus':   lambda n, s: [n + 2, n - 1, n + 3, n - 2, n + 4, n + 6],
    'minus':  lambda n, s: [n - 2, n + 1, n - 3, n + 2, n - 4, n + 6],
    'plus2':  lambda n, s: [n + 3, n + 1, n + 4, n - 1, n + 5, n - 2],
    'minus2': lambda n, s: [n - 3, n - 1, n - 4, n + 1, n - 5, n + 2],
    'mid':    lambda n, s: [n + 3, n - 1, n + 4, n + 5, n - 2, n + 6],
    'mid4':   lambda n, s: [n + 1, n + 3, n - 1, n + 5, n + 6, n - 2],
    'dualA':  lambda n, s: [s, n - 2, n + 2, n - 3, n + 3],
    'dualB':  lambda n, s: [s, n + 3, n - 1, n + 4, n - 2],
}

def gen_one(dch, qi, rnd, force, last_key):
    if force and force.get('n') is not None:
        mode, n = force['mode'], force['n']
    else:
        if force:
            mode = force['mode']
        elif dch == 1:
            mode = 'plus'
        elif dch == 2:
            mode = 'minus'
        elif dch == 3:
            mode = 'plus' if rnd() < 0.5 else 'minus'
        else:
            mode = ['plus', 'minus', 'mid'][ri(rnd, 0, 2)]   # r31 后 dch4 恒走 force（保留兼容）
        n = draw_n(dch, mode, rnd)
        t = 0
        while t < 6 and last_key == mode + ':' + str(n):
            n = draw_n(dch, mode, rnd)
            t += 1
    s = None
    if mode in ('plus', 'mid'):
        answer = n + 1
    elif mode in ('minus',):
        answer = n - 1
    elif mode in ('plus2', 'mid4'):
        answer = n + 2
    elif mode == 'minus2':
        answer = n - 2
    elif mode == 'dualA':
        s = n + 1
        answer = n - 1
    else:                        # dualB
        s = n + 2
        answer = n + 1
    pool = POOLS[mode](n, s)
    seen, ds = [answer], []
    for v in pool:
        if len(ds) >= 2:
            break
        if 1 <= v <= 20 and v not in seen:
            seen.append(v)
            ds.append(v)
    options = shuffled([answer, ds[0], ds[1]], rnd)
    q = {'mode': mode, 'n': n, 'answer': answer, 'options': options, 'hidden': None}
    if s is not None:
        q['s'] = s
    q['hidden'] = hidden_nums(q, dch)
    return q

def gen_level(flat):
    flat = max(0, int(flat))
    ch = ch_of_flat(flat)
    dch = diff_of_ch(ch)
    lv = flat % CH_LEN
    rnd = mulberry32(flat * 7919 + 13)
    quizzes = []
    last_key = None
    sp = shuffled([0, 1, 2, 3, 4], rnd)
    specials = {}
    if dch == 3:
        specials[sp[0]] = {'mode': 'plus', 'n': 19}
        specials[sp[1]] = {'mode': 'minus', 'n': 10}
        specials[sp[2]] = {'mode': ['plus2', 'minus2'][ri(rnd, 0, 1)]}
    m4 = None
    if dch == 4:
        X = ['plus2', 'minus2', 'mid4'][ri(rnd, 0, 2)]
        m4 = shuffled(['plus', 'minus', 'mid', X], rnd)
        m4.append(['dualA', 'dualB'][ri(rnd, 0, 1)])
    for qi in range(CH_LEN):
        force = specials.get(qi)
        if not force and dch == 4:
            force = {'mode': m4[qi]}
        q = gen_one(dch, qi, rnd, force, last_key)
        last_key = q['mode'] + ':' + str(q['n'])
        quizzes.append(q)
    return {'ch': ch, 'dch': dch, 'lv': lv, 'quizzes': quizzes}

def norm(rec):
    """提取侧 s 键（非 dual 题无 s，playwright 序列化 undefined→丢键）与 py 侧对齐；
    键序 sort 后比对——r28 教训：口径精确定义防外部复算假差异"""
    rec = dict(rec)
    out = []
    for q in rec['quizzes']:
        qq = {k: v for k, v in q.items() if v is not None}
        out.append(qq)
    rec['quizzes'] = out
    return rec

def main():
    if not POST.exists():
        print('FATAL: 先跑 _r31_extract.py r31-post.json'); sys.exit(1)
    post = json.loads(POST.read_text(encoding='utf-8'))
    bad = []
    kinds = {}
    for f in range(40):
        mine = gen_level(f)
        theirs = norm(post[str(f)])
        if json.dumps(mine, sort_keys=True) != json.dumps(theirs, sort_keys=True):
            bad.append(f)
        for q in mine['quizzes']:
            kinds[q['mode']] = kinds.get(q['mode'], 0) + 1
    print('PYCHECK %s: %d/40 levels identical' % ('PASS' if not bad else 'FAIL', 40 - len(bad)))
    if bad:
        print('mismatch flats:', bad)
        mine = gen_level(bad[0])
        theirs = json.loads(POST.read_text(encoding='utf-8'))[str(bad[0])]
        for i, (a, b) in enumerate(zip(mine['quizzes'], theirs['quizzes'])):
            if json.dumps(a, sort_keys=True) != json.dumps(b, sort_keys=True):
                print('  flat %d quiz %d: py=%s js=%s' % (bad[0], i, a, b))
    print('py-side kinds:', dict(sorted(kinds.items())))

    # ---- 谱变更对照（保留/变更声明机检，SPEC-R31 §R6 语义投影口径） ----
    if BASELINE.exists():
        base = json.loads(BASELINE.read_text(encoding='utf-8'))
        def proj(rec):
            return [[q['mode'], q['n'], q['answer'], q['options']] for q in rec['quizzes']]
        ident = [f for f in range(40)
                 if json.dumps(proj(base[str(f)]), sort_keys=True) == json.dumps(proj(post[str(f)]), sort_keys=True)]
        dch_of = lambda f: diff_of_ch(ch_of_flat(f))
        by_dch = {}
        for f in range(40):
            by_dch.setdefault(dch_of(f), []).append(f in ident)
        print('ANCHOR: flat0 first quiz = dch1 plus (tutorial-safe) = %s'
              % (post['0']['quizzes'][0]['mode'] == 'plus' and post['0']['dch'] == 1))
        print('CHANGE(proj [mode,n,answer,options]): byte-identical levels = %d/40 -> %s'
              % (len(ident), 'ch1+ch2 全保留' if sorted(set(dch_of(f) for f in ident)) == [1, 2] else ident))
        for d in sorted(by_dch):
            v = by_dch[d]
            print('  dch%d: identical %d/%d' % (d, sum(v), len(v)))
    sys.exit(0 if not bad else 1)

if __name__ == '__main__':
    main()
