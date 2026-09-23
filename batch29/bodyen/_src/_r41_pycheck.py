# -*- coding: utf-8 -*-
"""r41 pycheck：Python 同源副本对拍 + SPEC 独立表断言（三层独立的第三层；r39/r40 范式）
层：① 页内 verify（SPEC 表对账+聚合分布）② 页内 structWhy（引擎自带规则）
    ③ 本脚本——JS 引擎 mulberry32/shuffled/ri/dchOf/familyIdx/deckOf/specSeqOf/buildQuiz
    的 Python 逐函数同源副本（机械翻译，含 JS 位运算语义）对拍页内观测谱 r41-post.json
    全字段（dch + 每题 [kind, ask, optIds, answer]），断言则从 SPEC-R41 §R2/§R3 文字
    独立推导（硬编码表，禁读页面常量）。
用法: python _r41_pycheck.py   （需先跑 _r41_extract.py --out r41-post.json）
退出码 0=全绿；非 0=FAIL（逐条打印）。"""
import json, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
SRC = Path(__file__).resolve().parent
POST = json.loads((SRC / 'r41-post.json').read_text(encoding='utf-8'))

FAILS = []
NCHECK = [0]
def check(name, cond, detail=''):
    NCHECK[0] += 1
    if cond:
        print('PASS', name)
    else:
        print('FAIL', name, detail)
        FAILS.append(name)

# ========== SPEC 独立表（§R2/§R3 文字硬编码——禁抄页面/game-data） ==========
SPEC_WORDS = ['head', 'face', 'hair', 'eyebrow', 'eye', 'ear', 'nose', 'mouth',
              'tooth', 'tongue', 'chin', 'cheek', 'neck', 'shoulder', 'arm', 'elbow',
              'hand', 'finger', 'thumb', 'leg', 'knee', 'foot', 'toe', 'belly']
SPEC_NEAR = {
    'head': ['hand', 'hair'], 'face': [], 'hair': ['head', 'hand'],
    'eyebrow': ['eye', 'ear'], 'eye': ['ear', 'eyebrow'], 'ear': ['eye', 'eyebrow'],
    'nose': ['toe', 'neck'], 'mouth': [], 'tooth': ['tongue', 'toe', 'foot'],
    'tongue': ['tooth', 'toe'], 'chin': ['cheek', 'tooth'], 'cheek': ['chin', 'tongue'],
    'neck': ['knee', 'nose'], 'shoulder': [], 'arm': ['leg', 'elbow'],
    'elbow': ['arm', 'leg'], 'hand': ['head', 'hair', 'finger'],
    'finger': ['thumb', 'hand'], 'thumb': ['finger', 'hand'],
    'leg': ['arm', 'knee'], 'knee': ['neck', 'leg', 'toe'],
    'foot': ['toe', 'tooth'], 'toe': ['foot', 'nose', 'knee'], 'belly': [],
}
SPEC_NEAR20 = [w for w in SPEC_WORDS if SPEC_NEAR[w]]
SPEC_VERBS = ['touch', 'clap', 'shake', 'stomp', 'wave']
SPEC_ACTS = ['clap', 'shake', 'stomp', 'wave']
CH_LEN, STATIC = 5, 20

# ========== JS 同源副本（机械翻译；位运算按 ToInt32/uint32 语义） ==========
def i32(x):
    x &= 0xFFFFFFFF
    return x - 0x100000000 if x >= 0x80000000 else x

def imul(x, y):
    return i32(x * y)

def u32(x):
    return x & 0xFFFFFFFF

def mulberry32(seed):
    a = i32(seed)
    def rnd():
        nonlocal a
        a = i32(a)                                   # a |= 0
        a = i32(a + 0x6D2B79F5)                      # a = a + 0x6D2B79F5 | 0
        t = imul(a ^ u32(a) >> 15, 1 | a)            # imul(a ^ a>>>15, 1|a)
        t = i32(t + imul(t ^ u32(t) >> 7, 61 | t)) ^ t   # (t + imul)^t，+先于^
        return u32(t ^ u32(t) >> 14) / 4294967296    # ((t ^ t>>>14)>>>0)/2^32
    return rnd

def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))                     # Math.floor(rnd()*(i+1))
        a[i], a[j] = a[j], a[i]
    return a

def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))

def ch_of_flat(flat):
    return flat // CH_LEN + 1

def diff_of_ch(ch):
    return (ch - 1) % 4 + 1

def dch_of(flat):
    if flat < STATIC:
        return diff_of_ch(ch_of_flat(flat))
    return ri(mulberry32(flat * 7919 + 71), 1, 4)

def family_idx(flat, dch):
    return sum(1 for p in range(flat) if dch_of(p) == dch)

DOM_OF = lambda dch: SPEC_NEAR20 if dch >= 3 else SPEC_WORDS
def deck_of(dch):
    return shuffled(DOM_OF(dch), mulberry32(dch * 104729 + 41))

def spec_seq_of(dch, rnd, flat):
    dom, deck = DOM_OF(dch), deck_of(dch)
    ln = len(deck)
    idx = family_idx(flat, dch)
    key = lambda s: ('do:' + s['verb'] + ':' + s['ask']) if s['kind'] == 'do' else (s['kind'] + ':' + s['ask'])
    coin = lambda: 'hear' if rnd() < 0.5 else 'see'
    pick = lambda pool: pool[int(rnd() * len(pool))]
    kind_of = lambda: 'hear' if dch == 1 else 'see' if dch == 2 else coin()
    specs = []
    for qi in range(CH_LEN):
        if dch == 4 and qi in (1, 3):
            verb = SPEC_VERBS[(2 * idx + (0 if qi == 1 else 1)) % len(SPEC_VERBS)]
            specs.append({'kind': 'do', 'verb': verb,
                          'ask': deck[(idx * CH_LEN + qi) % ln] if verb == 'touch' else verb})
        else:
            specs.append({'kind': kind_of(), 'ask': deck[(idx * CH_LEN + qi) % ln]})
    if dch >= 3:                                      # 混出：非 do 全同翻 1
        hs = [s for s in specs if s['kind'] != 'do']
        nh = sum(1 for s in hs if s['kind'] == 'hear')
        if hs and (nh == 0 or nh == len(hs)):
            for i in range(len(specs)):
                if specs[i]['kind'] != 'do':
                    specs[i]['kind'] = 'hear' if nh == 0 else 'see'
                    break
    if flat == 0:
        specs[0] = {'kind': 'hear', 'ask': 'eye'}     # 教学演示锚
    prev = None                                       # 相邻题互异（≤8 重掷兜底）
    for qi in range(CH_LEN):
        s = specs[qi]
        pk = key(prev) if prev else None
        g = 0
        while g < 8 and key(s) == pk:
            s = ({'kind': 'do', 'verb': s['verb'],
                  'ask': pick(dom) if s['verb'] == 'touch' else s['verb']}
                 if s['kind'] == 'do' else {'kind': kind_of(), 'ask': pick(dom)})
            specs[qi] = s
            g += 1
        prev = specs[qi]
    return specs

def build_quiz(spec, dch, rnd):
    order, opts = [], []
    answer = -1
    if spec['kind'] == 'do':
        if spec['verb'] == 'touch':
            picks = [spec['ask']]
            if SPEC_NEAR[spec['ask']]:
                picks.append(SPEC_NEAR[spec['ask']][0])
            others = shuffled([w for w in SPEC_WORDS if w not in picks], rnd)
            for w in others:
                if len(picks) >= 4:
                    break
                picks.append(w)
            order.extend(shuffled(picks, rnd))
            answer = order.index(spec['ask'])
            opts = [{'id': 't:' + w, 'part': w} for w in order]
        else:
            order.extend(shuffled(SPEC_ACTS, rnd))
            answer = order.index(spec['verb'])
            opts = [{'id': 'a:' + v, 'verb': v} for v in order]
    else:
        picks = [spec['ask']]
        if dch >= 2 and SPEC_NEAR[spec['ask']]:
            picks.append(SPEC_NEAR[spec['ask']][0])
        others = shuffled([w for w in SPEC_WORDS if w not in picks], rnd)
        for w in others:
            if len(picks) >= 4:
                break
            picks.append(w)
        order.extend(shuffled(picks, rnd))
        answer = order.index(spec['ask'])
        opts = ([{'id': 'p:' + w, 'part': w} for w in order] if spec['kind'] == 'hear'
                else [{'id': 'w:' + w, 'text': w} for w in order])
    return {'kind': spec['kind'], 'ask': spec['ask'], 'verb': spec.get('verb'),
            'opts': opts, 'answer': answer}

def gen_level(flat):
    ch = ch_of_flat(flat)
    rnd = mulberry32(flat * 7919 + 71)
    dch = diff_of_ch(ch) if flat < STATIC else ri(rnd, 1, 4)
    specs = spec_seq_of(dch, rnd, flat)
    quizzes = [build_quiz(s, dch, rnd) for s in specs]
    return {'dch': dch, 'quizzes': quizzes}

# ========== ① 同源对拍：40 关全字段（dch/kind/ask/optIds/answer） ==========
mismatch = []
for lv in POST:
    f = lv['flat']
    exp = gen_level(f)
    if exp['dch'] != lv['dch']:
        mismatch.append('flat%d dch %s!=%s' % (f, exp['dch'], lv['dch']))
        continue
    for qi, (eq, gq) in enumerate(zip(exp['quizzes'], lv['q'])):
        got = [gq[0], gq[1], gq[2], gq[3]]
        want = [eq['kind'], eq['ask'], [o['id'] for o in eq['opts']], eq['answer']]
        if got != want:
            mismatch.append('flat%d q%d %s != %s' % (f, qi, got, want))
check('py-same-source: 40 levels x 5 q full field', not mismatch,
      '; '.join(mismatch[:4]) + (' (%d)' % len(mismatch) if mismatch else ''))

# ========== ② SPEC 独立断言（对观测谱 post.json 直接推导，禁抄实现行为） ==========
cov1, cov2, cov3 = set(), set(), set()
hist = {'all': [0]*4, 'hear': [0]*4, 'see': [0]*4}
kinds = {'hear': 0, 'see': 0, 'do': 0}
verb_hist = {}
ndch4 = 0
bad = []
for lv in POST:
    f, dch = lv['flat'], lv['dch']
    # 章参数：静态 dch=flat//5+1；生成 dch∈[1,4]
    if f < 20 and dch != f // 5 + 1:
        bad.append('flat%d static dch %s' % (f, dch))
    if f >= 20 and not 1 <= dch <= 4:
        bad.append('flat%d gen dch %s' % (f, dch))
    if f == 0 and (lv['q'][0][0] != 'hear' or lv['q'][0][1] != 'eye'):
        bad.append('anchor flat0q0')
    prev_key = None
    ndo = 0
    for qi, (kind, ask, ids, ans) in enumerate(lv['q']):
        kinds[kind] = kinds.get(kind, 0) + 1
        # 锚点后按章型
        if dch == 1 and kind != 'hear':
            bad.append('flat%dq%d dch1 kind %s' % (f, qi, kind))
        if dch == 2 and kind != 'see':
            bad.append('flat%dq%d dch2 kind %s' % (f, qi, kind))
        if dch == 4 and ((qi in (1, 3)) != (kind == 'do')):
            bad.append('flat%dq%d dch4slot %s' % (f, qi, kind))
        key = ('do:' + ids[ans]) if kind == 'do' else kind + ':' + ask
        if prev_key == key:
            bad.append('flat%dq%d adjacent dup %s' % (f, qi, key))
        prev_key = key
        # 候选结构：恒 4 互异；前缀按题型；answer=真值位
        if len(ids) != 4 or len(set(ids)) != 4:
            bad.append('flat%dq%d opts %s' % (f, qi, ids))
            continue
        pre = {'hear': 'p:', 'see': 'w:'}[kind] if kind in ('hear', 'see') else None
        if kind == 'do':
            if ids[ans].startswith('t:'):
                ndo += 1
                vals = [i[2:] for i in ids]
                if ask not in SPEC_NEAR20:
                    bad.append('flat%dq%d touch ask %s not NEAR20' % (f, qi, ask))
                if vals[ans] != ask:
                    bad.append('flat%dq%d touch ans' % (f, qi))
                fam = SPEC_NEAR[ask]
                if fam and not any(n in vals for n in fam):
                    bad.append('flat%dq%d touch nearMiss %s' % (f, qi, vals))
            elif ids[ans].startswith('a:'):
                ndo += 1
                verbs = [i[2:] for i in ids]
                if ask not in SPEC_ACTS or sorted(verbs) != sorted(SPEC_ACTS) or verbs[ans] != ask:
                    bad.append('flat%dq%d act %s %s' % (f, qi, ask, verbs))
            else:
                bad.append('flat%dq%d do ids %s' % (f, qi, ids))
        else:
            vals = [i[2:] for i in ids]
            if any(i[:2] != pre for i in ids):
                bad.append('flat%dq%d prefix %s' % (f, qi, ids))
            if ask not in SPEC_WORDS or any(v not in SPEC_WORDS for v in vals):
                bad.append('flat%dq%d closed %s' % (f, qi, vals))
            if vals[ans] != ask:
                bad.append('flat%dq%d ans' % (f, qi))
            fam = SPEC_NEAR[ask]
            if dch >= 2 and fam and not any(n in vals for n in fam):
                bad.append('flat%dq%d nearMiss %s' % (f, qi, vals))
            if dch >= 3 and ask not in SPEC_NEAR20:
                bad.append('flat%dq%d ask not NEAR20 %s' % (f, qi, ask))
        if 0 <= ans < 4:
            hist['all'][ans] += 1
            if kind in hist:
                hist[kind][ans] += 1
    # 覆盖素材
    if f < 5:
        cov1 |= {q[1] for q in lv['q'] if q[0] == 'hear'}
    if 5 <= f < 10:
        cov2 |= {q[1] for q in lv['q'] if q[0] == 'see'}
    if 10 <= f < 15:
        cov3 |= {q[1] for q in lv['q']}
    if dch == 4:
        ndch4 += 1
    if dch == 4 and ndo != 2:
        bad.append('flat%d dch4 do=%d' % (f, ndo))
    if dch == 3 and not ({'hear', 'see'} <= {q[0] for q in lv['q']}):
        bad.append('flat%d dch3 not mixed' % f)

check('spec: chapter params + anchor + per-quiz structure', not bad,
      '; '.join(bad[:6]) + (' (%d)' % len(bad) if bad else ''))
check('spec: ch1 hear covers ALL24', cov1 == set(SPEC_WORDS), 'missing=%s' % sorted(set(SPEC_WORDS) - cov1))
check('spec: ch2 see covers ALL24', cov2 == set(SPEC_WORDS), 'missing=%s' % sorted(set(SPEC_WORDS) - cov2))
check('spec: ch3 covers NEAR20', cov3 == set(SPEC_NEAR20), 'missing=%s' % sorted(set(SPEC_NEAR20) - cov3))

# do 计数精确 + 动词旋转直方图（SPEC §R3：族内 do 依序 VERBS[c%5]）
n_do = kinds['do']
check('spec: do count == 2 x dch4 levels', n_do == 2 * ndch4, 'do=%d dch4=%d' % (n_do, ndch4))
# 动词从谱恢复：do-touch（t: 前缀真值）的 verb 恒 touch；do-action verb=ask。
# 全局 do 序（flat 升序、qi 升序）第 c 个 verb 应 = SPEC_VERBS[c%5]（旋转律跨关族连续）
seq = []
for lv in POST:
    if lv['dch'] != 4:
        continue
    for qi, (kind, ask, ids, ans) in enumerate(lv['q']):
        if kind == 'do':
            seq.append('touch' if ids[ans].startswith('t:') else ask)
exp_seq = [SPEC_VERBS[c % 5] for c in range(len(seq))]
check('spec: verb rotation VERBS[c%5] exact', seq == exp_seq,
      'got=%s' % seq[:10])
for v in seq:
    verb_hist[v] = verb_hist.get(v, 0) + 1

# 答案位直方图（r41 界值口径：合并 ceil(N/8)=25；分题型 ceil(n/16)——期望 1/4 律）
lb_all = 25
lb_kind = lambda n: -(-n // 16)
check('spec: ans hist all >= %d' % lb_all, min(hist['all']) >= lb_all, str(hist['all']))
check('spec: ans hist hear >= %d' % lb_kind(kinds['hear']),
      min(hist['hear']) >= lb_kind(kinds['hear']), str(hist['hear']))
check('spec: ans hist see >= %d' % lb_kind(kinds['see']),
      min(hist['see']) >= lb_kind(kinds['see']), str(hist['see']))

print('\nsummary: kinds=%s verbs=%s hist=%s' % (kinds, verb_hist, hist))
print('RESULT:', 'PASS ALL (%d checks)' % NCHECK[0] if not FAILS else 'FAIL %s' % FAILS)
sys.exit(0 if not FAILS else 1)
