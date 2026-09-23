# -*- coding: utf-8 -*-
"""r30 subbug Python 独立复算（SPEC-R30-SUBBUG §R3 生成律的 Python 侧副本）
在 Python 独立实现 genLevel（mulberry32/shuffled/ri/CANDS/CANDS_DUAL/distractorsOf/
genOne 含 dch3 模式与 dch4 槽位/genDual 装饰域），与真实页（index.html 页内 JS genLevel）
提取的 40 关 quizzes JSON 全量比对——两侧逐题一致 = r30 生成律独立验证。
另附：与 r30-baseline.json（改造前）的谱变更对照（保留/变更声明机检，r28/r29 范式）。
用法: python _r30_pycheck.py   （先 python _r30_extract.py r30-post.json）"""
import json, math, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
POST = HERE / 'r30-post.json'
BASELINE = HERE / 'r30-baseline.json'
CH_LEN = 5
D_MIN, D_MAX = 2, 4
CHAPTERS = {
    1: {'nMin': 4, 'nMax': 8},
    2: {'nMin': 6, 'nMax': 10},
    3: {'nMin': 12, 'nMax': 20},
    4: {'nMin': 9, 'nMax': 14},
}

# ---------- 确定性随机（与 game-core.js mulberry32 逐位同实现，r27-r29 pycheck 先例） ----------
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

# ---------- r30 生成律（SPEC-R30 §R3 独立副本，与 game-core.js 同源誊抄） ----------
CANDS = {}
for d in range(1, 5):
    C = CHAPTERS[d]
    lst = []
    for n in range(C['nMin'], C['nMax'] + 1):
        m_max = n if d == 3 else n - 1
        for m in range(1, m_max + 1):
            lst.append({'n': n, 'm': m, 'r': n - m, 'cross': (m % 10) > (n % 10)})
    CANDS[d] = lst

CANDS_DUAL = {'A': [], 'B': []}
for n in range(10, 16):
    for b in range(2, 7):
        for c in range(2, 7):
            if b <= 4 and c != b and n + b <= 18 and n + b - c >= 6 and \
                    ((n % 10) + (b % 10) > 9 or (c % 10) > ((n + b) % 10)):
                CANDS_DUAL['B'].append({'n': n, 'b': b, 'c': c, 's': n + b, 'answer': n + b - c})
            if c <= 4 and n - b >= 5 and \
                    ((b % 10) > (n % 10) or (((n - b) % 10) + c > 9)):
                CANDS_DUAL['A'].append({'n': n, 'b': b, 'c': c, 's': n - b, 'answer': n - b + c})

def distractors_of(r):
    pool = []
    for v in (r - 1, r + 1, r - 2, r + 2):
        if v > 0 and v != r and v not in pool:
            pool.append(v)
    return pool[:2]

def gen_dual(form, rnd, last_ans):
    pool = CANDS_DUAL[form]
    p = pool if last_ans is None else [cc for cc in pool if cc['answer'] != last_ans]
    if not p:
        p = pool
    cc = p[math.floor(rnd() * len(p))]
    d2 = cc['answer'] + 1 if form == 'A' else cc['answer'] - 1
    for _ in range(cc['n'] * 4):        # 装饰域 rnd 消耗同构（f/e/s/g ×4）
        rnd()
    in_n = cc['c'] if form == 'A' else cc['b']
    for _ in range(in_n * 4):
        rnd()
    items = shuffled([cc['answer'], cc['s'], d2], rnd)
    return {'type': 'dual', 'form': form, 'n': cc['n'], 'b': cc['b'], 'c': cc['c'],
            's': cc['s'], 'm': cc['b'] if form == 'A' else cc['c'], 'flyIn': in_n,
            'answer': cc['answer'], 'items': items, 'answerIdx': items.index(cc['answer']),
            'lady': 0}

def gen_one(dch, qi, rnd, last_ans):
    if dch == 4 and qi in (1, 3):
        return gen_dual('A' if qi == 1 else 'B', rnd, last_ans)
    want_cross = dch == 3 and qi in (0, 3)
    want_zero = dch == 3 and qi == 2
    pool = [c for c in CANDS[dch]
            if (c['cross'] if want_cross else True) and (c['r'] == 0 if want_zero else c['r'] > 0)]
    p = pool if last_ans is None else [c for c in pool if c['r'] != last_ans]
    if not p:
        p = pool
    c = p[math.floor(rnd() * len(p))]
    for _ in range(c['n'] * 4):
        rnd()
    lady = 0
    if dch == 4:
        lady = ri(rnd, D_MIN, D_MAX)
        for _ in range(lady * 2):
            rnd()
    items = shuffled([c['r']] + distractors_of(c['r']), rnd)
    return {'type': 'sub', 'n': c['n'], 'm': c['m'], 'answer': c['r'],
            'items': items, 'answerIdx': items.index(c['r']), 'lady': lady}

def gen_quizzes(flat):
    ch = ch_of_flat(flat)
    dch = diff_of_ch(ch)
    rnd = mulberry32(flat * 7919 + 13)
    quizzes = []
    last_ans = None
    for qi in range(CH_LEN):
        q = gen_one(dch, qi, rnd, last_ans)
        last_ans = q['answer']
        quizzes.append(q)
    return {'ch': ch, 'dch': dch, 'lv': flat % CH_LEN, 'quizzes': quizzes}

def norm(rec):
    """提取侧 sub 题的 b/c/s/flyIn/form 为 null 键（playwright 序列化 undefined→null），
    与 py 侧（省略键）对齐——r28 教训：口径精确定义防外部复算假差异"""
    rec = dict(rec)
    rec['quizzes'] = [{k: v for k, v in q.items() if v is not None} for q in rec['quizzes']]
    return rec

def main():
    if not POST.exists():
        print('FATAL: 先跑 _r30_extract.py r30-post.json'); sys.exit(1)
    post = json.loads(POST.read_text(encoding='utf-8'))
    bad = []
    kinds = {'sub': 0, 'dualA': 0, 'dualB': 0}
    for f in range(40):
        mine = gen_quizzes(f)
        theirs = norm(post[str(f)])
        if json.dumps(mine, sort_keys=True) != json.dumps(theirs, sort_keys=True):
            bad.append(f)
        for q in mine['quizzes']:
            if q['type'] == 'dual':
                kinds['dualA' if q['form'] == 'A' else 'dualB'] += 1
            else:
                kinds['sub'] += 1
    print('PYCHECK %s: %d/40 levels identical' % ('PASS' if not bad else 'FAIL', 40 - len(bad)))
    if bad:
        print('mismatch flats:', bad)
        mine = gen_quizzes(bad[0])
        theirs = post[str(bad[0])]
        for i, (a, b) in enumerate(zip(mine['quizzes'], theirs['quizzes'])):
            if json.dumps(a, sort_keys=True) != json.dumps(b, sort_keys=True):
                print('  flat %d quiz %d: py=%s js=%s' % (bad[0], i, a, b))
    print('py-side kinds:', kinds, '(expect sub=180, dualA=10, dualB=10)')

    # ---- 谱变更对照（保留/变更声明机检，SPEC §R6） ----
    if BASELINE.exists():
        base = json.loads(BASELINE.read_text(encoding='utf-8'))
        ident = [f for f in range(40)
                 if json.dumps(base[str(f)], sort_keys=True) == json.dumps(post[str(f)], sort_keys=True)]
        by_dch = {}
        for f in range(40):
            d = post[str(f)]['dch']
            by_dch.setdefault(d, []).append(f in ident)
        print('ANCHOR: flat0 first quiz = scaffold sub (tutorial-safe) = %s'
              % (post['0']['quizzes'][0]['type'] == 'sub'))
        print('CHANGE: byte-identical levels = %d/40 -> %s' %
              (len(ident), 'ch2+ch3 全保留' if sorted(set(f % 20 // 5 for f in ident)) == [1, 2] else ident))
        for d in sorted(by_dch):
            v = by_dch[d]
            print('  dch%d: identical %d/%d (flats %s)' %
                  (d, sum(v), len(v), [f for f in range(40) if diff_of_ch(ch_of_flat(f)) == d]))
    sys.exit(0 if not bad else 1)

if __name__ == '__main__':
    main()
