# -*- coding: utf-8 -*-
"""R48 pycheck：Python 位级复刻 mulberry32+genLevel（R48 消耗序列：生成关 dch→
本章池无放回抽 5→格序 shuffle 4 元素→pick 题盘序 shuffle 按题序），
对拍 r48-post-full.json 40 关 200 题逐字段；律断言（SPEC 表独立硬编码，禁读
游戏源归纳）：题库 20 行/DIM2_TARGET 定约全枚举/pick 候选恰一张属目标格+
三主题互异/冲突行 11>半/flat0 q0 锚/恒四格排列/静态覆盖每行恰 5 次/
dch=第一个随机数/分布下界（sort 4 桶 ≥17·pick 3 桶 ≥10·pick 目标 ≥5）。
用法: python -X utf8 _r48_pycheck.py   （依赖同目录 r48-post-full.json）"""
import json
import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
M32 = 0xFFFFFFFF


def i32(x):
    x &= M32
    return x - (1 << 32) if x & (1 << 31) else x


def imul(a, b):                       # JS Math.imul 位级
    return i32(a * b)


def mulberry32(seed):
    """JS mulberry32 位级复刻（a|=0 / imul / >>>0 除 2^32——全整数路径直到除法，
    IEEE754 double 除法 Python/JS 同值）"""
    a = i32(seed)
    while True:
        a = i32(a + 0x6D2B79F5)
        t = imul((a ^ ((a & M32) >> 15)), (1 | a))
        t = i32((t + imul((t ^ ((t & M32) >> 7)), (61 | t))) ^ t)
        yield ((t ^ ((t & M32) >> 14)) & M32) / 4294967296


def ri(rnd, lo, hi):
    return lo + math.floor(next(rnd) * (hi - lo + 1))


def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = math.floor(next(rnd) * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a


# ===== SPEC-R48 §R4 独立硬编码（期望源=SPEC 表，非实现行为归纳） =====
SPEC_QUESTIONS = [
    {'card': 'cat', 'hint': 'none'}, {'card': 'apple', 'hint': 'none'},
    {'card': 'coat', 'hint': 'none'}, {'card': 'car', 'hint': 'none'},
    {'card': 'chick', 'hint': 'farm'},
    {'card': 'goldfish', 'hint': 'pet'}, {'card': 'banana', 'hint': 'eat'},
    {'card': 'hat', 'hint': 'wear'}, {'card': 'cow', 'hint': 'farm'},
    {'card': 'rice', 'hint': 'eat'},
    {'card': 'egg', 'hint': 'eat'}, {'card': 'dog', 'hint': 'pet'},
    {'card': 'scarf', 'hint': 'wear'}, {'card': 'milk', 'hint': 'eat'},
    {'card': 'rabbit', 'hint': 'pet'},
    {'pick': 'food', 'cards': ['apple', 'rabbit', 'train']},
    {'pick': 'clothes', 'cards': ['scarf', 'dog', 'bus']},
    {'pick': 'animal', 'cards': ['elephant', 'bread', 'shoe']},
    {'pick': 'vehicle', 'cards': ['plane', 'milk', 'hat']},
    {'pick': 'food', 'cards': ['carrot', 'bird', 'sweater']},
]
SPEC_THEME = {}
for _grp, _th in [
    (['cat', 'dog', 'cow', 'chick', 'goldfish', 'elephant', 'rabbit', 'bird'], 'animal'),
    (['apple', 'carrot', 'bread', 'egg', 'milk', 'banana', 'rice', 'cake'], 'food'),
    (['coat', 'shoe', 'hat', 'skirt', 'glove', 'scarf', 'sock', 'sweater'], 'clothes'),
    (['car', 'bus', 'bike', 'plane', 'ship', 'train', 'ambulance', 'firetruck'], 'vehicle')]:
    for _c in _grp:
        SPEC_THEME[_c] = _th
SPEC_DIM2_TARGET = {'farm': 'animal', 'eat': 'food', 'pet': 'animal', 'wear': 'clothes'}
SPEC_DIM2 = {'farm': '它住在农场里', 'eat': '我们能吃它', 'pet': '它是我们的好朋友', 'wear': '天冷了要穿上它'}
SPEC_DIM2_KEYS = {'farm': 'lb_d2_farm', 'eat': 'lb_d2_eat', 'pet': 'lb_d2_pet', 'wear': 'lb_d2_wear'}
SPEC_NORM = '它住哪一格呢'
SPEC_PICK = {'animal': '帮动物格挑一本新书', 'food': '帮食物格挑一本新书',
             'clothes': '帮衣物格挑一本新书', 'vehicle': '帮交通格挑一本新书'}
SPEC_PICK_KEYS = {'animal': 'lb_pick_animal', 'food': 'lb_pick_food',
                  'clothes': 'lb_pick_clothes', 'vehicle': 'lb_pick_vehicle'}
SPEC_LABEL = {'cat': '小猫', 'apple': '苹果', 'coat': '外套', 'car': '小汽车',
              'chick': '小鸡', 'goldfish': '金鱼', 'banana': '香蕉', 'hat': '帽子',
              'cow': '奶牛', 'rice': '米饭', 'egg': '鸡蛋', 'dog': '小狗',
              'scarf': '围巾', 'milk': '牛奶', 'rabbit': '兔子'}
THEMES4 = ['animal', 'food', 'clothes', 'vehicle']
CH_LEN, STATIC_LEVELS = 5, 20


def py_gen(flat):
    """genLevel 位级复刻（SPEC-R48 §R3 消耗序列）"""
    flat = max(0, int(flat))
    ch = flat // CH_LEN + 1
    dch0 = (ch - 1) % 4 + 1
    lv = flat % CH_LEN
    rnd = mulberry32(flat * 7919 + 837)
    dch = dch0 if flat < STATIC_LEVELS else ri(rnd, 1, 4)
    if flat < STATIC_LEVELS:
        base = (dch - 1) * 5
        rows = [base + (lv + k) % 5 for k in range(CH_LEN)]
    else:
        pool = list(range((dch - 1) * 5, dch * 5))
        rows = []
        for _ in range(CH_LEN):
            rows.append(pool.pop(ri(rnd, 0, len(pool) - 1)))
    shelf = shuffled(THEMES4, rnd)
    quizzes = []
    for qrow in rows:
        qs = SPEC_QUESTIONS[qrow]
        if 'pick' in qs:
            tray = shuffled(qs['cards'], rnd)
            answer = next(k for k in range(3) if SPEC_THEME[tray[k]] == qs['pick'])
            quizzes.append({'row': qrow, 'kind': 'pick', 'target': qs['pick'],
                            'theme': qs['pick'], 'cards': tray, 'label': '',
                            'say': SPEC_PICK[qs['pick']], 'sayKey': SPEC_PICK_KEYS[qs['pick']],
                            'hint': 'none', 'shelf': shelf, 'answer': answer,
                            '_miss': 0, '_answered': False})
        else:
            theme = SPEC_THEME[qs['card']]
            quizzes.append({'row': qrow, 'kind': 'sort', 'card': qs['card'],
                            'label': SPEC_LABEL[qs['card']], 'theme': theme,
                            'say': SPEC_NORM if qs['hint'] == 'none' else SPEC_DIM2[qs['hint']],
                            'sayKey': 'lb_hint' if qs['hint'] == 'none' else SPEC_DIM2_KEYS[qs['hint']],
                            'hint': qs['hint'], 'shelf': shelf,
                            'answer': shelf.index(theme), '_miss': 0, '_answered': False})
    return {'flat': flat, 'ch': ch, 'dch': dch, 'lv': lv, 'rows': rows,
            'shelf': shelf, 'quizzes': quizzes}


def main():
    spec = json.loads((HERE / 'r48-post-full.json').read_text(encoding='utf-8'))
    fails = []
    # ---- ① 位级对拍：40 关全字段（ch/dch/lv/rows/shelf + 200 题逐字段） ----
    nq = 0
    for f in range(40):
        mine = py_gen(f)
        got = spec[str(f)]
        for k in ('ch', 'dch', 'lv', 'shelf'):   # 谱投影键集（rows 逐题 row 已在 qs 内）
            if mine[k] != got[k]:
                fails.append('flat%d %s: py=%r js=%r' % (f, k, mine[k], got[k]))
        for qi in range(CH_LEN):
            nq += 1
            a, b = mine['quizzes'][qi], got['qs'][qi]
            if a != b:
                diff = {k for k in set(list(a) + list(b)) if a.get(k) != b.get(k)}
                fails.append('flat%d q%d 字段差 %s: py=%s js=%s' %
                             (f, qi, sorted(diff),
                              json.dumps({k: a.get(k) for k in sorted(diff)}, ensure_ascii=False),
                              json.dumps({k: b.get(k) for k in sorted(diff)}, ensure_ascii=False)))
    # ---- ② 律断言（独立于实现） ----
    # 冲突行 11>半
    conflict = sum(1 for s in SPEC_QUESTIONS if 'pick' not in s and s['hint'] != 'none')
    if not (conflict == 11 and conflict > 10):
        fails.append('冲突行 %d != 11/不超半' % conflict)
    # DIM2_TARGET 定约全枚举（题表 hint 行卡主题==定约值）
    for i, s in enumerate(SPEC_QUESTIONS):
        if 'pick' not in s and s['hint'] != 'none':
            if SPEC_THEME[s['card']] != SPEC_DIM2_TARGET[s['hint']]:
                fails.append('行%d DIM2_TARGET 定约违例 %s/%s' % (i, s['card'], s['hint']))
    # pick 候选定约：恰一张属目标格+三主题互异
    for i, s in enumerate(SPEC_QUESTIONS):
        if 'pick' in s:
            th = [SPEC_THEME[c] for c in s['cards']]
            if th.count(s['pick']) != 1 or len(set(th)) != 3:
                fails.append('行%d pick 候选定约违例' % i)
    # flat0 q0 锚（题面逐字节：cat/none/普通句——AUDIT 教学锚）
    q0 = spec['0']['qs'][0]
    if not (q0['card'] == 'cat' and q0['hint'] == 'none' and q0['say'] == SPEC_NORM
            and q0['sayKey'] == 'lb_hint'):
        fails.append('flat0 q0 锚破坏: %s' % json.dumps(q0, ensure_ascii=False)[:160])
    # 恒四格+排列
    for f in range(40):
        for qi, q in enumerate(spec[str(f)]['qs']):
            if len(q['shelf']) != 4 or sorted(q['shelf']) != sorted(THEMES4):
                fails.append('flat%d q%d 格非四主题排列' % (f, qi))
    # 静态覆盖：每行恰 5 次
    cnt = {}
    for f in range(20):
        for q in spec[str(f)]['qs']:
            cnt[q['row']] = cnt.get(q['row'], 0) + 1
    if sorted(cnt) != list(range(20)) or any(cnt[i] != 5 for i in range(20)):
        fails.append('静态覆盖非每行 5 次: %s' % sorted(cnt.items()))
    # dch=第一个随机数（flats 20-39 独立复算）
    for f in range(20, 40):
        r = mulberry32(f * 7919 + 837)
        exp = 1 + math.floor(next(r) * 4)
        if spec[str(f)]['dch'] != exp:
            fails.append('flat%d dch %s != 首随机 %d' % (f, spec[str(f)]['dch'], exp))
    # 分布下界（独立推导：sort 期望 140/4=35 取半 17；pick 位 60/3=20 取半 10；
    # pick 目标=行 rotate 数学下界每行 5 次→每目标 ≥5）
    sort_hist, pick_hist, pick_tgt = [0] * 4, [0] * 3, {}
    for f in range(40):
        for q in spec[str(f)]['qs']:
            if q['kind'] == 'pick':
                pick_hist[q['answer']] += 1
                pick_tgt[q['target']] = pick_tgt.get(q['target'], 0) + 1
            else:
                sort_hist[q['answer']] += 1
    if min(sort_hist) < 17:
        fails.append('sort 答案位分布 %s 下界 17 不达' % sort_hist)
    if min(pick_hist) < 10:
        fails.append('pick 答案位分布 %s 下界 10 不达' % pick_hist)
    if any(pick_tgt.get(t, 0) < 5 for t in THEMES4):
        fails.append('pick 目标分布 %s 下界 5 不达' % pick_tgt)
    # 报告
    print('pycheck: 40 levels, %d quizzes, 位级对拍+律断言' % nq)
    print('sort_hist=%s pick_hist=%s pick_tgt=%s' % (sort_hist, pick_hist, pick_tgt))
    if fails:
        print('FAIL x%d:' % len(fails))
        for x in fails[:20]:
            print(' -', x)
        sys.exit(1)
    print('PYCHECK PASS (bit-exact 40/40 levels, laws OK)')


if __name__ == '__main__':
    main()
