# -*- coding: utf-8 -*-
"""r27 pattern Python 独立复算（双侧 verify 的 Python 侧）
按 SPEC-R27-PATTERN.md 生成律在 Python 独立实现 makeLevel（mulberry32/材料袋/
五规则族组题/干扰项），与真实页（?verify=1 页内 JS makeLevel）提取的 40 关
quizzes JSON 全量比对——两侧逐字节一致=新规则族推导律独立验证。
用法: python _r27_pycheck.py  （先跑 F:/claudecode/test/_r27_pattern_extract.py 产出 post.json）
"""
import json, math, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
POST = Path('F:/claudecode/test/_r27_pattern_post.json')
BASELINE = Path('F:/claudecode/test/_r27_pattern_baseline.json')

# ---------- 确定性随机（与 game-data.js mulberry32 逐位同实现） ----------
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

# ---------- 数据域（与 game-data.js 同源） ----------
POOL = [dict(zip(('shape', 'color'), p), count=1) for p in [
    ('ball', 'red'), ('cushion', 'yellow'), ('drop', 'orange'), ('star', 'red'), ('heart', 'blue'), ('flower', 'orange'),
    ('ball', 'blue'), ('cushion', 'green'), ('drop', 'purple'), ('star', 'yellow'), ('heart', 'green'), ('flower', 'purple')]]
COLOR_KEYS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']

def pool_item(shape, color):
    for p in POOL:
        if p['shape'] == shape and p['color'] == color:
            return dict(p)
    return {'shape': 'ball', 'color': 'red', 'count': 1}

def same_shape(item):
    for p in POOL:
        if p['shape'] == item['shape'] and p['color'] != item['color']:
            return dict(p)
    return None

def same_color(item):
    for p in POOL:
        if p['color'] == item['color'] and p['shape'] != item['shape']:
            return dict(p)
    return None

def clone(it):
    return {'shape': it['shape'], 'color': it['color'], 'count': it.get('count', 1)}

def item_key(a):
    return '%s|%s|%d' % (a['shape'], a['color'], a.get('count', 1))

def same_item(a, b):
    return a['shape'] == b['shape'] and a['color'] == b['color'] and a.get('count', 1) == b.get('count', 1)

# ---------- 谱与模板（SPEC-R27 §R2/§R3 独立副本） ----------
QUIZ_T = {
    'AB_END': {'kind': 'cycle', 'pat': [0, 1], 'total': 5, 'miss': 4},
    'ABB_END': {'kind': 'cycle', 'pat': [0, 1, 1], 'total': 6, 'miss': 5},
    'ABC_END': {'kind': 'cycle', 'pat': [0, 1, 2], 'total': 6, 'miss': 5},
    'ABCD_END': {'kind': 'cycle', 'pat': [0, 1, 2, 3], 'total': 8, 'miss': 7},
    'ABC_MID': {'kind': 'cycle', 'pat': [0, 1, 2], 'total': 7, 'miss': 4},
    'ABCD_MID': {'kind': 'cycle', 'pat': [0, 1, 2, 3], 'total': 7, 'miss': 4},
    'ABBC_END': {'kind': 'cycle', 'pat': [0, 1, 1, 2], 'total': 8, 'miss': 7},
    'ABBC_MID': {'kind': 'cycle', 'pat': [0, 1, 1, 2], 'total': 8, 'miss': 5},
    'DUAL_END': {'kind': 'dual', 'total': 5, 'miss': 4},
    'DUAL_MID': {'kind': 'dual', 'total': 5, 'miss': 2},
    'DUALP_END': {'kind': 'dualP', 'total': 6, 'miss': 5},
    'DUALP_MID': {'kind': 'dualP', 'total': 6, 'miss': 3},
    'CNT_UP1': {'kind': 'count', 'step': 1, 'total': 5, 'miss': 4},
    'CNT_DN1': {'kind': 'count', 'step': -1, 'total': 5, 'miss': 4},
    'CNT_UP2': {'kind': 'count', 'step': 2, 'total': 5, 'miss': 4},
    'CNT_UP1M': {'kind': 'count', 'step': 1, 'total': 5, 'miss': 2},
    'CMP_END': {'kind': 'compound', 'step': 1, 'total': 5, 'miss': 4},
    'CMP_MID': {'kind': 'compound', 'step': 1, 'total': 5, 'miss': 2},
    'CMP2_END': {'kind': 'compound', 'step': 2, 'total': 5, 'miss': 4},
}
STATIC_SPECS = [
    ['AB_END', 'ABB_END', 'ABC_END'],
    ['ABC_END', 'ABC_MID', 'ABC_END'],
    ['ABC_END', 'DUAL_END', 'ABBC_END'],
    ['ABCD_END', 'ABC_END', 'DUAL_END'],
    ['ABCD_END', 'ABBC_END', 'DUAL_MID'],
    ['ABC_MID', 'ABBC_END', 'ABC_MID', 'ABBC_END'],
    ['ABCD_MID', 'ABC_MID', 'DUAL_MID', 'ABBC_END'],
    ['ABCD_MID', 'ABBC_END', 'DUAL_END', 'ABBC_MID'],
    ['ABBC_MID', 'ABCD_MID', 'ABC_MID', 'DUAL_MID'],
    ['ABCD_MID', 'ABBC_MID', 'DUAL_MID', 'ABC_END'],
    ['DUAL_END', 'DUAL_END', 'DUAL_MID', 'DUAL_END'],
    ['DUAL_END', 'DUAL_MID', 'DUAL_END', 'DUAL_MID'],
    ['DUAL_MID', 'DUAL_END', 'DUAL_END', 'DUAL_MID'],
    ['DUAL_END', 'DUAL_MID', 'DUAL_MID', 'DUAL_END'],
    ['DUAL_END', 'DUALP_END', 'DUAL_MID', 'DUALP_END'],
    ['CNT_UP1', 'CNT_UP1', 'CNT_DN1', 'CNT_UP1', 'CNT_UP1'],
    ['CNT_UP1', 'CNT_DN1', 'CNT_UP2', 'CNT_UP1', 'CNT_DN1'],
    ['CMP_END', 'CNT_UP2', 'CNT_DN1', 'CMP_MID', 'CMP_END'],
    ['CNT_UP2', 'CMP2_END', 'CNT_DN1', 'CMP_MID', 'CMP_END'],
    ['CMP2_END', 'CNT_UP1M', 'CMP_MID', 'CNT_UP2', 'CMP_END'],
]
CH_TPL = [
    ['ABC_END', 'ABBC_END', 'ABCD_END', 'ABC_MID', 'DUAL_END'],
    ['ABCD_MID', 'ABBC_MID', 'DUAL_END', 'ABC_MID', 'DUAL_MID'],
    ['DUAL_END', 'DUAL_MID', 'DUALP_END', 'DUALP_MID'],
    ['CNT_UP1', 'CNT_DN1', 'CNT_UP2', 'CNT_UP1M', 'CMP_END', 'CMP_MID', 'CMP2_END'],
]
CH_QUIZN = [3, 4, 4, 5]
CH_LEN = 5

def level_spec(flat):
    if flat < len(STATIC_SPECS):
        return flat // CH_LEN + 1, list(STATIC_SPECS[flat])
    ch = flat // CH_LEN + 1
    theme = (ch - 1) % 4
    pool, n = CH_TPL[theme], CH_QUIZN[theme]
    return ch, [pool[(flat + i) % len(pool)] for i in range(n)]

# ---------- 引擎（SPEC-R27 §R3 生成律） ----------
def rule_at(rule, i):
    k = rule['kind']
    if k == 'cycle':
        it = rule['icons'][i % len(rule['icons'])]
        return {'shape': it['shape'], 'color': it['color'], 'count': 1}
    if k == 'dual':
        return {'shape': rule['shapes'][i % 2], 'color': rule['colors'][i % 2], 'count': 1}
    if k == 'dualP':
        return {'shape': rule['shapes'][i % len(rule['shapes'])], 'color': rule['colors'][i % len(rule['colors'])], 'count': 1}
    if k == 'compound':
        return {'shape': rule['shapes'][i % 2], 'color': rule['color'], 'count': rule['start'] + rule['step'] * i}
    return {'shape': rule['shape'], 'color': rule['color'], 'count': rule['start'] + rule['step'] * i}

def rule_outputs(rule, n):
    return [rule_at(rule, i) for i in range(n)]

class Bag:
    def __init__(self, rnd):
        self.rnd = rnd
        self.bag = shuffled(POOL, rnd)

    def _refill(self, keep):
        self.bag = shuffled(POOL, self.rnd)
        for k in keep:
            for idx, b in enumerate(self.bag):
                if item_key(b) == item_key(k):
                    self.bag.pop(idx)
                    break

    def take(self, k, keep=None):
        if len(self.bag) < k:
            self._refill(keep or [])
        out = self.bag[:k]
        del self.bag[:k]
        return out

    def dual_pair(self):
        for _t in range(8):
            for i in range(len(self.bag)):
                for j in range(i + 1, len(self.bag)):
                    if self.bag[i]['shape'] != self.bag[j]['shape'] and self.bag[i]['color'] != self.bag[j]['color']:
                        a = self.bag.pop(i)
                        b = self.bag.pop(j - 1)
                        return [a, b]
            self.bag = shuffled(POOL, self.rnd)
        return [pool_item('ball', 'red'), pool_item('cushion', 'green')]

def icon_distractors(outs, answer, rnd):
    out_keys = [item_key(o) for o in outs]
    cand = [p for p in shuffled(POOL, rnd) if item_key(p) not in out_keys]
    cand.sort(key=lambda a: 0 if (a['shape'] == answer['shape'] or a['color'] == answer['color']) else 1)
    return [dict(c) for c in cand[:2]]

def count_distractors(outs, answer, rnd):
    used = [o['count'] for o in outs]
    cand = [c for c in range(1, 10) if c not in used and c != answer['count']]
    cand.sort(key=lambda c: abs(c - answer['count']))
    return [{'shape': answer['shape'], 'color': answer['color'], 'count': c} for c in cand[:2]]

def compound_distractors(rule, outs, answer):
    other = rule['shapes'][1] if rule['shapes'][0] == answer['shape'] else rule['shapes'][0]
    used = [o['count'] for o in outs]
    cand = [c for c in range(1, 10) if c not in used and c != answer['count']]
    cand.sort(key=lambda c: abs(c - answer['count']))
    return [{'shape': other, 'color': rule['color'], 'count': answer['count']},
            {'shape': answer['shape'], 'color': rule['color'], 'count': cand[0]}]

def build_quiz(tk, rnd, bag, used):
    t = QUIZ_T[tk]
    k = t['kind']
    if k == 'cycle':
        icons = bag.take(max(t['pat']) + 1, used)
        used.extend(icons)
        rule = {'kind': 'cycle', 'icons': [dict(icons[p]) for p in t['pat']]}
    elif k == 'dual':
        pair = bag.dual_pair()
        used.extend(pair)
        rule = {'kind': 'dual', 'shapes': [pair[0]['shape'], pair[1]['shape']],
                'colors': [pair[0]['color'], pair[1]['color']]}
    elif k == 'dualP':
        pair = bag.dual_pair()
        used.extend(pair)
        c2 = shuffled([c for c in COLOR_KEYS if c != pair[0]['color'] and c != pair[1]['color']], rnd)[0]
        rule = {'kind': 'dualP', 'shapes': [pair[0]['shape'], pair[1]['shape']],
                'colors': [pair[0]['color'], pair[1]['color'], c2]}
    elif k == 'compound':
        it = bag.take(1, used)[0]
        used.append(it)
        other = same_color(it)
        used.append(other)
        start = 1 if t['step'] == 2 else 1 + math.floor(rnd() * 3)
        rule = {'kind': 'compound', 'shapes': [it['shape'], other['shape']], 'color': it['color'],
                'start': start, 'step': t['step']}
    else:
        it = bag.take(1, used)[0]
        used.append(it)
        start = 1 if t['step'] == 2 else (5 + math.floor(rnd() * 5) if t['step'] < 0 else 1 + math.floor(rnd() * 5))
        rule = {'kind': 'count', 'shape': it['shape'], 'color': it['color'], 'start': start, 'step': t['step']}
    ln, miss = t['total'], t['miss']
    seq = [rule_at(rule, i) for i in range(ln)]
    answer = rule_at(rule, miss)
    outs = rule_outputs(rule, ln)
    if k == 'dual':
        ds = shuffled([same_shape(answer), same_color(answer)], rnd)
    elif k == 'count':
        ds = count_distractors(outs, answer, rnd)
    elif k == 'compound':
        ds = compound_distractors(rule, outs, answer)
    else:
        ds = icon_distractors(outs, answer, rnd)
    items = shuffled([clone(answer), dict(ds[0]), dict(ds[1])], rnd)
    correct = next(i for i, it in enumerate(items) if same_item(it, answer))
    return {'tk': tk, 'rule': rule, 'len': ln, 'miss': miss, 'seq': seq,
            'answer': answer, 'items': items, 'correctIdx': correct}

def make_level(flat):
    rnd = mulberry32(flat * 7919 + 13)
    ch, tks = level_spec(flat)
    bag, used = Bag(rnd), []
    return ch, [build_quiz(tk, rnd, bag, used) for tk in tks]

# ---------- 比对 ----------
def norm_quiz(q):
    r = q['rule'] if 'rule' in q else q
    return {'kind': r['kind'], 'rule': r, 'len': q['len'], 'miss': q['miss'] if 'miss' in q else q['missingIdx'],
            'seq': q['seq'], 'answer': q['answer'], 'items': q['items'], 'correctIdx': q['correctIdx']}

def main():
    post = json.loads(POST.read_text(encoding='utf-8'))
    n_ok, bad = 0, []
    for f in range(40):
        ch, quizzes = make_level(f)
        page = post[str(f)]
        if ch != page['ch']:
            bad.append((f, 'ch mismatch'))
            continue
        if len(quizzes) != len(page['quizzes']):
            bad.append((f, 'quiz count'))
            continue
        ok = all(json.dumps(norm_quiz(m), sort_keys=True) == json.dumps(norm_quiz(p), sort_keys=True)
                 for m, p in zip(quizzes, page['quizzes']))
        if ok:
            n_ok += 1
        else:
            for qi, (m, p) in enumerate(zip(quizzes, page['quizzes'])):
                if json.dumps(norm_quiz(m), sort_keys=True) != json.dumps(norm_quiz(p), sort_keys=True):
                    bad.append((f, 'quiz %d (%s)' % (qi, m['tk'])))
                    break
    print('PYCHECK %d/%d levels identical' % (n_ok, 40))
    if bad:
        print('MISMATCH:', bad[:8])
        return 1
    # 附：保留基线再证（6 关逐字节=改造前）
    base = json.loads(BASELINE.read_text(encoding='utf-8'))
    kept = [f for f in range(40) if json.dumps(base[str(f)], sort_keys=True) == json.dumps(post[str(f)], sort_keys=True)]
    print('BASELINE-KEPT (byte-identical vs pre-r27):', kept)
    return 0

if __name__ == '__main__':
    sys.exit(main())
