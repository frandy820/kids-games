# -*- coding: utf-8 -*-
"""r29 compare Python 独立复算（双侧 verify 的 Python 侧）
按 SPEC-R29-COMPARE §R3 生成律在 Python 独立实现 genLevel（mulberry32/shuffled/
pairOf/eqNOf/triOf/nearOf/mixPairOf/eqSet 符号槽律/平衡器），与真实页（index.html
页内 JS genLevel）提取的 40 关 quizzes JSON 全量比对——两侧逐题一致 = r29 生成律独立验证。
另附：与 r29-baseline.json（改造前）的谱变更对照（保留/变更声明机检）。
用法: python _r29_pycheck.py   （先 python _r29_extract.py r29-post.json）"""
import json, math, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
POST = HERE / 'r29-post.json'
BASELINE = HERE / 'r29-baseline.json'
CH_LEN = 5
KINDS = ['apple', 'orange', 'pear', 'berry']
SYMS = ['>', '<', '=']

# ---------- 确定性随机（与 game-core.js mulberry32 逐位同实现，r27/r28 pycheck 先例） ----------
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

# ---------- r29 生成律（SPEC-R29 §R3 独立副本，与 game-core.js 同源誊抄） ----------
def pair_of(dch, mode, rnd):
    if dch == 1:
        diff = ri(rnd, 1, 3)
        small = ri(rnd, 1, 8 - diff)
        return [small, small + diff]
    if dch == 2:
        diff = ri(rnd, 1, 3)
        small = ri(rnd, 1, 10 - diff)
        return [small, small + diff]
    if dch == 3:
        small = ri(rnd, 1, 9)
        return [small, small + 1]
    diff = ri(rnd, 1, 4)
    if mode == 'count':
        small = ri(rnd, 4, 12 - diff)
        return [small, small + diff]
    small = ri(rnd, 6, 20 - diff)
    return [small, small + diff]

def mix_pair_of(rnd, big_on_items):
    diff = ri(rnd, 1, 4)
    if big_on_items:
        big = ri(rnd, max(6, diff + 1), 12)
        return [big - diff, big]
    small = ri(rnd, 4, 12)
    return [small, small + diff]

def eq_n_of(dch, mode, rnd):
    if dch == 1: return ri(rnd, 2, 7)
    if dch == 2: return ri(rnd, 2, 9)
    if dch == 3: return ri(rnd, 2, 10)
    return ri(rnd, 10, 20) if mode == 'num' else ri(rnd, 6, 10)

def tri_of(rnd):
    span = ri(rnd, 2, 4)
    lo = ri(rnd, 1, 10 - span)
    win = list(range(lo, lo + span + 1))
    three = shuffled(win, rnd)[:3]
    qtype = 'max' if rnd() < 0.5 else 'min'
    return {'cards': [{'n': n} for n in three], 'qtype': qtype}

def near_of(rnd):
    N = ri(rnd, 8, 17)
    d1 = ri(rnd, 2, 4)
    d2 = ri(rnd, d1 + 1, d1 + 2)
    d3 = ri(rnd, d2 + 1, 7)
    def mk(d):
        if N - d >= 1 and N + d <= 20:
            return {'n': (N - d) if rnd() < 0.5 else (N + d), 'd': d}
        return {'n': (N - d) if N - d >= 1 else (N + d), 'd': d}
    return {'target': N, 'cards': shuffled([mk(d1), mk(d2), mk(d3)], rnd)}

def gen_quizzes(flat):
    ch = ch_of_flat(flat)
    dch = diff_of_ch(ch)
    lv = flat % CH_LEN
    rnd = mulberry32(flat * 7919 + 13)
    modes = None
    if dch == 2:
        modes = ['num'] * 5
    elif dch == 3:
        modes = shuffled(['num', 'num', 'num', 'tri', 'tri'], rnd)
    elif dch == 4:
        modes = shuffled(['count', 'num', 'mix', 'near', ['count', 'num', 'mix'][ri(rnd, 0, 2)]], rnd)
    sym_slots = ([i for i, m in enumerate(modes) if m not in ('tri', 'near')]
                 if modes else [0, 1, 2, 3, 4])
    eq_cnt = 1 if dch in (1, 3) else (2 if lv % 2 == 1 else 1)
    eq_set = set(shuffled(sym_slots, rnd)[:min(eq_cnt, len(sym_slots))])
    quizzes = []
    gt = lt = 0
    for qi in range(CH_LEN):
        mode = modes[qi] if modes else 'count'
        if mode == 'tri':
            t = tri_of(rnd)
            ns = [c['n'] for c in t['cards']]
            want = ns.index(max(ns) if t['qtype'] == 'max' else min(ns))
            quizzes.append({'mode': 'tri', 'qtype': t['qtype'], 'cards': t['cards'], 'answer': want})
            continue
        if mode == 'near':
            t = near_of(rnd)
            want = 0
            for i, c in enumerate(t['cards']):
                if c['d'] < t['cards'][want]['d']:
                    want = i
            quizzes.append({'mode': 'near', 'target': t['target'], 'cards': t['cards'], 'answer': want})
            continue
        is_eq = qi in eq_set
        if is_eq:
            answer = '='
        elif gt > lt:
            answer = '<'
        elif lt > gt:
            answer = '>'
        else:
            answer = '>' if rnd() < 0.5 else '<'
        if answer == '>':
            gt += 1
        elif answer == '<':
            lt += 1
        num_on_left = (rnd() < 0.5) if mode == 'mix' else False
        if is_eq:
            n_l = n_r = eq_n_of(dch, mode, rnd)
        elif dch == 4 and mode == 'mix':
            left_is_big = answer == '>'
            big_on_items = (left_is_big and not num_on_left) or (not left_is_big and num_on_left)
            pr = mix_pair_of(rnd, big_on_items)
            n_l, n_r = (pr[1], pr[0]) if left_is_big else (pr[0], pr[1])
        else:
            pr = pair_of(dch, mode, rnd)
            n_l, n_r = (pr[1], pr[0]) if answer == '>' else (pr[0], pr[1])
        ka = ri(rnd, 0, len(KINDS) - 1)
        kb = ri(rnd, 0, len(KINDS) - 2)
        if kb >= ka:
            kb += 1
        def mk_side(n, kind, is_num):
            return ({'n': n, 'kind': 'num', 'items': []} if is_num
                    else {'n': n, 'kind': kind,
                          'items': [{'r': ri(rnd, -8, 8), 's': (94 + ri(rnd, 0, 12)) / 100} for _ in range(n)]})
        left = mk_side(n_l, KINDS[ka], mode == 'num' or (mode == 'mix' and num_on_left))
        right = mk_side(n_r, KINDS[kb], mode == 'num' or (mode == 'mix' and not num_on_left))
        quizzes.append({'mode': mode, 'left': left, 'right': right, 'answer': answer})
    return {'ch': ch, 'dch': dch, 'lv': lv, 'quizzes': quizzes}

# ---------- 提取口径对照（_r29_extract.py 同构：符号题取 n/kind、tri 取 cards/qtype、near 取 target/dists） ----------
def to_extract_form(L):
    qs = []
    for q in L['quizzes']:
        if q['mode'] == 'tri':
            qs.append({'mode': 'tri', 'qtype': q['qtype'],
                       'cards': [c['n'] for c in q['cards']], 'answer': q['answer']})
        elif q['mode'] == 'near':
            qs.append({'mode': 'near', 'target': q['target'],
                       'cards': [c['n'] for c in q['cards']],
                       'dists': [c['d'] for c in q['cards']], 'answer': q['answer']})
        else:
            qs.append({'mode': q['mode'], 'answer': q['answer'], 'isEq': q['answer'] == '=',
                       'L': q['left']['n'], 'Lk': q['left']['kind'],
                       'R': q['right']['n'], 'Rk': q['right']['kind']})
    return {'ch': L['ch'], 'dch': L['dch'], 'lv': L['lv'], 'quizzes': qs}

def main():
    if not POST.exists():
        print('FATAL: 先跑 _r29_extract.py _src/r29-post.json'); sys.exit(1)
    post = json.loads(POST.read_text(encoding='utf-8'))
    bad = []
    dist = {'>': 0, '<': 0, '=': 0}
    modes = {'count': 0, 'num': 0, 'mix': 0, 'tri': 0, 'near': 0}
    for f in range(40):
        mine = to_extract_form(gen_quizzes(f))
        theirs = post[str(f)]
        if json.dumps(mine, sort_keys=True) != json.dumps(theirs, sort_keys=True):
            bad.append(f)
        for q in mine['quizzes']:
            modes[q['mode']] += 1
            if q['mode'] not in ('tri', 'near'):
                dist[q['answer']] += 1
    print('PYCHECK %s: %d/40 levels identical' % ('PASS' if not bad else 'FAIL', 40 - len(bad)))
    if bad:
        print('mismatch flats:', bad)
        mine = to_extract_form(gen_quizzes(bad[0]))
        theirs = post[str(bad[0])]
        for i, (a, b) in enumerate(zip(mine['quizzes'], theirs['quizzes'])):
            if json.dumps(a, sort_keys=True) != json.dumps(b, sort_keys=True):
                print('  flat %d quiz %d: py=%s js=%s' % (bad[0], i, a, b))
    print('py-side dist:', dist, 'modes:', modes)   # 应与 verify dist 一致：gt62/lt60/eq48 + tri20/near10

    # ---- 谱变更对照（保留/变更声明机检，SPEC §R6） ----
    if BASELINE.exists():
        base = json.loads(BASELINE.read_text(encoding='utf-8'))
        b_flat0_first = base['0']['quizzes'][0]
        p_flat0_first = post['0']['quizzes'][0]
        sym0 = p_flat0_first['mode'] in ('count', 'num', 'mix')
        ident = sum(1 for f in range(40)
                    if json.dumps(base[str(f)], sort_keys=True) == json.dumps(post[str(f)], sort_keys=True))
        print('ANCHOR: flat0 first quiz symbol-mode (tutorial-safe) = %s (mode=%s)'
              % (sym0, p_flat0_first['mode']))
        print('CHANGE: byte-identical levels = %d/40 (expected 0 = full refresh by design)' % ident)
        print('CHANGE: baseline modes count/num/mix -> post +tri +near (audit 承接)')
    sys.exit(0 if not bad else 1)

if __name__ == '__main__':
    main()
