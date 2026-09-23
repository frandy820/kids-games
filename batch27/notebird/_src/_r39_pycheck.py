# -*- coding: utf-8 -*-
"""r39 Python 独立复算（r26/r33/r36 范式）：按 SPEC-R39-NOTEBIRD §R3 生成律 Python 独立实现
mulberry32/shuffled/ri（与 JS 同源副本，逐位一致），40 关 genLevel 全字段与页内提取的
r39-post.json 对拍；顺带产出谱投影（--extract 重提取）。
用法: python _r39_pycheck.py            # 对拍已提取的 r39-post.json
      python _r39_pycheck.py --extract  # playwright 重提取 r39-post.json 后对拍"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CH_LEN = 5
STATIC_LEVELS = 20
ORDER = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'dop']
IDX = {n: i for i, n in enumerate(ORDER)}
IV_KEYS = ['iv_near', 'iv_mid', 'iv_far']


def _u32(x):
    return x & 0xFFFFFFFF


def mulberry32(a):
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


def no_sort(arr):
    """r39 乱序兜底：完全升序时对调前两位（0 rnd 消耗，确定性）——与 JS noSort 同式"""
    asc = all(IDX[arr[j]] > IDX[arr[j - 1]] for j in range(1, len(arr)))
    if not asc or len(arr) < 2:
        return list(arr)
    a = list(arr)
    a[0], a[1] = a[1], a[0]
    return a


def pick_note(rnd, prev):
    s = ORDER[int(next(rnd) * len(ORDER))]
    g = 0
    while g < 8 and s == prev:
        s = ORDER[int(next(rnd) * len(ORDER))]
        g += 1
    return s


def pick_pair(rnd, prev):
    lo = hi = 0
    for g in range(8):
        d = 1 if next(rnd) < 0.7 else 2
        lo = ri(rnd, 0, len(ORDER) - 1 - d)
        hi = lo + d
        if ORDER[hi] != prev:
            break
    return lo, hi


def pick_melody(rnd, prev):
    mel4 = shuffled(ORDER, rnd)[:4]                       # 3 rnd
    sang = shuffled(mel4[:3], rnd)                        # 2 rnd
    g = 0
    while sang[0] == prev and g < 4:
        sang = shuffled(mel4[:3], rnd)
        g += 1
    return mel4, sang


def pick_iv(rnd):
    cls = ri(rnd, 0, 2)                                   # 1 rnd
    d = 1 if cls == 0 else 2 if cls == 1 else ri(rnd, 3, 7)
    lo = ri(rnd, 0, len(ORDER) - 1 - d)                   # 1 rnd
    return cls, lo, lo + d


def spec_seq_of(dch, rnd, flat):
    seq = []
    prev = None
    if dch in (1, 2):
        for qi in range(CH_LEN):
            note = 'do' if (flat == 0 and qi == 0) else pick_note(rnd, prev)
            seq.append({'kind': 'find', 'note': note})
            prev = note
        return seq
    if dch == 3:
        for qi in range(CH_LEN):
            lo, hi = pick_pair(rnd, prev)
            seq.append({'kind': 'higher', 'lo': lo, 'hi': hi})
            prev = ORDER[hi]
        return seq
    coin = 'higher' if next(rnd) < 0.5 else 'find'        # 1 rnd
    kseq = shuffled(['find', 'higher', 'melody', 'iv', coin], rnd)   # 4 rnd
    for k in kseq:
        if k == 'find':
            note = pick_note(rnd, prev); seq.append({'kind': 'find', 'note': note}); prev = note
        elif k == 'higher':
            lo, hi = pick_pair(rnd, prev); seq.append({'kind': 'higher', 'lo': lo, 'hi': hi}); prev = ORDER[hi]
        elif k == 'melody':
            mel4, sang = pick_melody(rnd, prev); seq.append({'kind': 'melody', 'mel4': mel4, 'sang': sang}); prev = sang[0]
        else:
            cls, lo, hi = pick_iv(rnd); seq.append({'kind': 'iv', 'cls': cls, 'lo': lo, 'hi': hi}); prev = None
    return seq


def build_quiz(spec, dch, rnd):
    """r39-bis 生成律（与 game-core.js buildQuiz 逐位对齐）：find dch≥2 站位真洗牌
    （shuffled 4 元=3 rnd，防答案恒 index0——F1）；higher 站位真洗牌（3 rnd）+
    唱序随机 [lo,hi]|[hi,lo]（1 rnd，M1 方案 c——后亮不再恒=hi）；dch1 分支与
    melody/iv 消耗不变（specSeqOf 先行取尽 rnd 流 → melody/iv 谱面与 dch4 题序不变）"""
    if spec['kind'] == 'find':
        ds = shuffled([x for x in ORDER if x != spec['note']], rnd)[:3]   # 6 rnd
        if dch == 1:
            notes = sorted([spec['note']] + ds, key=lambda x: IDX[x])
        else:
            notes = no_sort(shuffled([spec['note']] + ds, rnd))           # r39-bis：+3 rnd 真洗牌
        return {'kind': 'find', 'notes': notes, 'ansNote': spec['note'], 'answer': notes.index(spec['note']),
                'sang': [spec['note']], 'freeOrder': dch != 1, '_miss': 0, '_answered': False}
    if spec['kind'] == 'higher':
        lo, hi = ORDER[spec['lo']], ORDER[spec['hi']]
        near_pool = [x for x in ORDER if x not in (lo, hi) and
                     (abs(IDX[x] - IDX[lo]) == 1 or abs(IDX[x] - IDX[hi]) == 1)]
        near = near_pool[int(next(rnd) * len(near_pool))]                 # 1 rnd
        other = None
        while True:
            other = ORDER[int(next(rnd) * len(ORDER))]
            if other not in (lo, hi, near):
                break
        notes = no_sort(shuffled([lo, hi, near, other], rnd))             # r39-bis：+3 rnd 真洗牌
        sang = [lo, hi] if next(rnd) < 0.5 else [hi, lo]                  # r39-bis：+1 rnd 唱序随机
        return {'kind': 'higher', 'notes': notes, 'ansNote': hi, 'answer': notes.index(hi),
                'sang': sang, 'freeOrder': True, '_miss': 0, '_answered': False}
    if spec['kind'] == 'melody':
        notes = no_sort(spec['mel4'])
        return {'kind': 'melody', 'notes': notes, 'ansNote': spec['sang'][0],
                'answer': notes.index(spec['sang'][0]), 'sang': list(spec['sang']),
                'freeOrder': True, '_prog': 0, '_miss': 0, '_answered': False}
    notes = list(IV_KEYS)
    return {'kind': 'iv', 'notes': notes, 'ansNote': IV_KEYS[spec['cls']], 'answer': spec['cls'],
            'sang': [ORDER[spec['lo']], ORDER[spec['hi']]],
            'freeOrder': True, '_miss': 0, '_answered': False}


def gen_level(flat):
    flat = max(0, int(flat))
    ch = flat // CH_LEN + 1
    dch0 = (ch - 1) % 4 + 1
    rnd = mulberry32(flat * 7919 + 13)
    dch = dch0 if flat < STATIC_LEVELS else ri(rnd, 1, 4)
    specs = spec_seq_of(dch, rnd, flat)
    quizzes = [build_quiz(sp, dch, rnd) for sp in specs]
    return {'flat': flat, 'ch': ch, 'dch': dch, 'lv': flat % CH_LEN,
            'quizzes': quizzes, 'step': 0, 'retries': 0, 'done': False}


def hist_check(levels):
    """r39-bis F1/minor2 防回归：答案位直方图+iv 三类计数聚合断言（40 关）。
    从 SPEC 均匀分布推导半值下限（禁抄实现观测）：find/higher 答案位期望 n/4 →
    各位 ≥ceil(n/8)；iv 三类期望 n/3 → 各类 ≥ceil(n/6)（主线原案 n/4 在 40 关
    确定性流 12 题实测 near=2<3 假阳，按同款半值律取 n/6——恒类/双类回归 0<2 必拦）。
    levels: [{dch, quizzes:[{kind, answer, ...}]}]（gen_level 产物列表）。
    返回 (ok, stats)；与 game-verify.js ④ dist 同律。"""
    import math
    find_c = [0, 0, 0, 0]
    hi_c = [0, 0, 0, 0]
    iv_c = [0, 0, 0]
    for L in levels:
        if L['dch'] < 2:
            continue          # r39-bis 复审 m5：dch1 教学升序场答案位由排序决定，不入防恒位口径（与 game-verify ④ 同律）
        for q in L['quizzes']:
            if q['kind'] == 'find' and 0 <= q['answer'] < 4:
                find_c[q['answer']] += 1
            elif q['kind'] == 'higher' and 0 <= q['answer'] < 4:
                hi_c[q['answer']] += 1
            elif q['kind'] == 'iv' and 0 <= q['answer'] < 3:
                iv_c[q['answer']] += 1
    n_f, n_h, n_i = sum(find_c), sum(hi_c), sum(iv_c)
    ok = (all(c >= math.ceil(n_f / 8) for c in find_c) and
          all(c >= math.ceil(n_h / 8) for c in hi_c) and
          all(c >= math.ceil(n_i / 6) for c in iv_c))
    return ok, {'find': find_c, 'higher': hi_c, 'iv': iv_c,
                'lb': [math.ceil(n_f / 8), math.ceil(n_h / 8), math.ceil(n_i / 6)]}


JS_EXPR = """(() => {
  const o = {};
  for (let f = 0; f < 40; f++) {
    const L = genLevel(f);
    o[f] = { dch: L.dch, ch: L.ch, q: L.quizzes.map(q => ({ kind: q.kind, notes: q.notes.slice(),
      ansNote: q.ansNote, sang: q.sang.slice(), answer: q.answer, freeOrder: !!q.freeOrder })) };
  }
  return o;
})()"""


def extract():
    from playwright.sync_api import sync_playwright
    url = 'file:///' + str(HERE.parent / 'index.html').replace(chr(92), '/')
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto(url)
        out = pg.evaluate(JS_EXPR)
        pg.close(); b.close()
    Path(HERE / 'r39-post.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    return out


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    if '--extract' in sys.argv:
        page = extract()
    else:
        page = json.loads((HERE / 'r39-post.json').read_text(encoding='utf-8'))
    nok = 0
    py_levels = []
    for f in range(40):
        L = gen_level(f)
        py_levels.append(L)
        pv = page[str(f)]
        assert L['dch'] == pv['dch'], 'flat%d dch %s!=%s' % (f, L['dch'], pv['dch'])
        same = len(L['quizzes']) == len(pv['q'])
        if same:
            for k, (my, pq) in enumerate(zip(L['quizzes'], pv['q'])):
                if (my['kind'] != pq['kind'] or my['notes'] != pq['notes'] or my['ansNote'] != pq['ansNote'] or
                        my['sang'] != pq['sang'] or my['answer'] != pq['answer'] or
                        bool(my['freeOrder']) != bool(pq.get('freeOrder'))):
                    same = False
                    print('flat%d q%d mismatch:\n  py=%s\n  js=%s' % (f, k, my, pq))
                    break
        if same:
            nok += 1
        else:
            print('flat%d mismatch' % f)
    print('PYCHECK %d/40 identical' % nok)
    ok_h, stats = hist_check(py_levels)            # r39-bis：答案位直方图+iv 三类（同 game-verify ④ 律）
    print('HIST %s find=%s higher=%s iv=%s lb(n/8,n/8,n/6)=%s' %
          ('OK' if ok_h else 'FAIL', stats['find'], stats['higher'], stats['iv'], stats['lb']))
    sys.exit(0 if (nok == 40 and ok_h) else 1)


if __name__ == '__main__':
    main()
