# -*- coding: utf-8 -*-
"""r44 Python 独立复算（r33/r26 范式）：按 SPEC-R44-POSITION §R3 生成律 Python 实现
mulberry32（Math.imul 截断乘/全程 &0xFFFFFFFF）/shuffled/ri，40 关 genLevel 全字段
（kind/ask/ask2/house/face/bunnyAt/answer/cells/_miss/_answered）与页内提取的
r44-post-full.json 逐关逐题对拍。断言从 SPEC §R3/§R4 文字推导（独立重列封闭表），
禁抄 game-core.js 实现。用法: python _r44_pycheck.py"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
CH_LEN = 5                # SPEC-R44 §R2：CH_LEN=5 不变
STATIC_LEVELS = 20        # 静态 20 关=4 章×5 关
# SPEC-R44 §R4 封闭表（独立重列）
POS6 = ['front', 'back', 'left', 'right', 'up', 'down']
FLIP_MAP = {'left': 'right', 'right': 'left', 'front': 'back',
            'back': 'front', 'up': 'up', 'down': 'down'}
DUAL_COMBOS = [
    {'key': 'lu', 'house': 'left-down',  'tree': 'left',  'houseDir': 'up'},
    {'key': 'dr', 'house': 'left-down',  'tree': 'down',  'houseDir': 'right'},
    {'key': 'ru', 'house': 'right-down', 'tree': 'right', 'houseDir': 'up'},
    {'key': 'dl', 'house': 'right-down', 'tree': 'down',  'houseDir': 'left'},
]


def _u32(x):
    return x & 0xFFFFFFFF


def mulberry32(a):
    """与 JS Math.imul 位级同源（32 位截断乘/加法回绕/无符号位移）"""
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


def spec_seq(dch, rnd, flat):
    """SPEC §R3 specSeqOf：coin/pick 各 1 次 rnd；shuffled 元素先求值后 shuffle"""
    def coin():
        return 'findpos' if next(rnd) < 0.5 else 'placepos'

    def pick():
        return POS6[int(next(rnd) * len(POS6))]

    def mk_dual():
        return {'kind': 'dual', 'combo': ri(rnd, 0, len(DUAL_COMBOS) - 1)}

    def mk_flip():
        return {'kind': 'flip', 'pos': pick()}

    def mk_coin():
        k = coin()
        return {'kind': k, 'pos': pick()}

    def spec_key(s):
        if s['kind'] == 'dual':
            c = DUAL_COMBOS[s['combo']]
            return 'dual:' + c['tree'] + '/' + c['houseDir']
        return s['kind'] + ':' + s['pos']

    def reroll(s):
        if s['kind'] == 'dual':
            return mk_dual()
        if s['kind'] == 'flip':
            return mk_flip()
        return {'kind': s['kind'], 'pos': pick()}

    specs = []
    if dch == 1:
        for _ in range(CH_LEN):
            specs.append({'kind': 'findpos', 'pos': pick()})
    elif dch == 2:
        for _ in range(CH_LEN):
            specs.append(mk_coin())
        n_fp = sum(1 for s in specs if s['kind'] == 'findpos')
        if n_fp == 0:
            specs[0]['kind'] = 'findpos'          # 全同翻 1（SPEC §R3 后置）
        elif n_fp == CH_LEN:
            specs[0]['kind'] = 'placepos'
    elif dch == 3:
        specs.append({'kind': 'findpos', 'pos': pick()})
        specs += shuffled([mk_dual(), mk_dual(), mk_dual(), mk_coin()], rnd)
    else:
        specs.append({'kind': 'findpos', 'pos': pick()})
        specs += shuffled([mk_flip(), mk_flip(), mk_flip(), mk_coin()], rnd)
    if flat == 0:
        specs[0] = {'kind': 'findpos', 'pos': 'front'}     # 教学锚（覆写）
    prev = None
    for qi in range(CH_LEN):
        s = specs[qi]
        pk = spec_key(prev) if prev is not None else None
        g = 0
        while spec_key(s) == pk and g < 8:
            s = reroll(s)
            g += 1
        specs[qi] = s
        prev = s
    return specs


def build_quiz(spec, rnd):
    """SPEC §R3 buildQuiz：cells=POS6 恒全摆；placepos/flip 各 1 次 rnd 取 bunnyAt"""
    cells = [{'pos': p} for p in POS6]
    bunny_at = ask2 = house = face = None
    if spec['kind'] == 'findpos':
        bunny_at = spec['pos']
    elif spec['kind'] == 'placepos':
        others = [p for p in POS6 if p != spec['pos']]
        bunny_at = others[int(next(rnd) * len(others))]
    elif spec['kind'] == 'dual':
        c = DUAL_COMBOS[spec['combo']]
        ask2 = c['houseDir']
        house = c['house']
    else:
        mirror = FLIP_MAP[spec['pos']]
        others = [p for p in POS6 if p != mirror]
        bunny_at = others[int(next(rnd) * len(others))]
        face = 'back'
    target = (DUAL_COMBOS[spec['combo']]['tree'] if spec['kind'] == 'dual'
              else FLIP_MAP[spec['pos']] if spec['kind'] == 'flip' else spec['pos'])
    answer = -1
    for j, c in enumerate(cells):
        if c['pos'] == target:
            answer = j
    ask = DUAL_COMBOS[spec['combo']]['tree'] if spec['kind'] == 'dual' else spec['pos']
    q = {'kind': spec['kind'], 'ask': ask, 'cells': cells, 'bunnyAt': bunny_at,
         'answer': answer, '_miss': 0, '_answered': False}
    if spec['kind'] == 'dual':
        q['ask2'] = ask2
        q['house'] = house
    if spec['kind'] == 'flip':
        q['face'] = face
    return q


def gen_level(flat):
    ch = flat // CH_LEN + 1
    dch0 = (ch - 1) % 4 + 1
    rnd = mulberry32(flat * 7919 + 977)      # SPEC-R44 §R0：seed 不变
    dch = dch0 if flat < STATIC_LEVELS else ri(rnd, 1, 4)
    specs = spec_seq(dch, rnd, flat)
    quizzes = [build_quiz(s, rnd) for s in specs]
    return {'flat': flat, 'ch': ch, 'dch': dch, 'lv': flat % CH_LEN, 'quizzes': quizzes}


# 对拍字段（post-full 投影含全部生成字段；answer 位直方图按 SPEC §R4 FLIP_MAP 独立复算）
FIELDS = ['kind', 'ask', 'ask2', 'house', 'face', 'bunnyAt', 'answer',
          'cells', '_miss', '_answered']


def main():
    src = json.loads((HERE / 'r44-post-full.json').read_text(encoding='utf-8'))
    identical = 0
    diffs = []
    for f in range(40):
        L = gen_level(f)
        exp = src[str(f)]
        ok = (L['ch'] == exp['ch'] and L['dch'] == exp['dch'] and L['lv'] == exp['lv'] and
              len(L['quizzes']) == len(exp['qs']) and
              all(all(a.get(k_) == b.get(k_) for k_ in FIELDS)
                  for a, b in zip(L['quizzes'], exp['qs'])))
        if ok:
            identical += 1
        else:
            diffs.append(f)
    print('PYCHECK %d/40 identical' % identical)
    if diffs:
        for f in diffs[:3]:
            py = gen_level(f)
            print(' flat %d py=%s' % (f, json.dumps(py['quizzes'][0], ensure_ascii=False)[:200]))
            print('        js=%s' % json.dumps(src[str(f)]['qs'][0], ensure_ascii=False)[:200])
        raise SystemExit(1)
    # 谱面先验自证（从 SPEC 文字推导，非抄观测）：dch3/4 主载构成律 + 锚面
    bad_law = [f for f in range(40)
               for L in [gen_level(f)]
               if (L['dch'] == 3 and sum(1 for q in L['quizzes'] if q['kind'] == 'dual') != 3)
               or (L['dch'] == 4 and sum(1 for q in L['quizzes'] if q['kind'] == 'flip') != 3)
               or (L['dch'] == 1 and any(q['kind'] != 'findpos' for q in L['quizzes']))
               or (L['dch'] == 2 and len({q['kind'] for q in L['quizzes']}) != 2)]
    anchor = gen_level(0)['quizzes'][0]
    anchor_ok = (anchor['kind'] == 'findpos' and anchor['ask'] == 'front'
                 and anchor['bunnyAt'] == 'front' and anchor['answer'] == 0
                 and 'ask2' not in anchor and 'face' not in anchor)
    print('LAW bad=%s anchor=%s' % (bad_law, anchor_ok))
    if bad_law or not anchor_ok:
        raise SystemExit(2)


if __name__ == '__main__':
    main()
