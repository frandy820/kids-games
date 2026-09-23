# -*- coding: utf-8 -*-
"""batch17 独立复验：area r14（断言从 SPEC-BATCH17 §7+§0.35 推导；Python 侧独立复刻
mulberry32+生成器全流程与页面 genLevel 逐关 JSON 对账（分源双实现）+面积/周长独立函数
复算答案+结构分源审计+时长独立复算（最低 77975）+行为/数格子/语音+救援 14s 真实页）"""
import asyncio, io, json, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'area' / 'index.html').as_posix() + '?verify=1'
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

# ================= Python 独立复刻（与 game-core.js 分源；seed=mulberry32(flat*7919+13)） =================
M32 = 0xFFFFFFFF

def mulberry32(a):
    a = a & M32
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & M32
        t = ((a ^ (a >> 15)) * (1 | a)) & M32          # Math.imul 低 32 位（无符号表示位模式一致）
        t = (t + (((t ^ (t >> 7)) * (61 | t)) & M32) ^ t) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296.0
    return rnd

def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a

def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))              # [lo,hi] 闭区间（hi<lo 时仍消耗一次 rnd）

def pick(rnd, arr):
    return arr[int(rnd() * len(arr))]

def norm_cells(cells):
    mx = min(p[0] for p in cells); my = min(p[1] for p in cells)
    return sorted([[p[0] - mx, p[1] - my] for p in cells], key=lambda p: (p[1], p[0]))   # 行优先

def rot_cells(cells):
    return norm_cells([[-p[1], p[0]] for p in cells])

def ser(cells):
    return ';'.join('%d,%d' % (p[0], p[1]) for p in cells)

def canon(cells):
    best, c = None, norm_cells(cells)
    for _ in range(4):
        s = ser(c)
        if best is None or s < best:
            best = s
        c = rot_cells(c)
    return best

SHAPES = {
    'b1': [[0, 0]],
    'b2': [[0, 0], [1, 0]],
    'b3': [[0, 0], [1, 0], [2, 0]],
    'sq': [[0, 0], [1, 0], [0, 1], [1, 1]],
    'l3': [[0, 0], [0, 1], [1, 1]],
    't4': [[0, 0], [1, 0], [2, 0], [1, 1]],
    'z4': [[0, 0], [1, 0], [1, 1], [2, 1]],
}
KINDS = ['b1', 'b2', 'b3', 'sq', 'l3', 't4', 'z4']      # Object.keys 插入序
AREA_GROUP = {3: ['b3', 'l3'], 4: ['sq', 't4', 'z4']}
CALC_COMPOSE = ['area', 'area', 'area', 'perim', 'perim']
CH_LEN, STATIC_LEVELS = 5, 20
DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]

def pose_of(rnd, kind):
    c = [list(p) for p in SHAPES[kind]]
    n = ri(rnd, 0, 3)
    for _ in range(n):
        c = rot_cells(c)
    return norm_cells(c)

def hole_single(rnd):
    return pose_of(rnd, pick(rnd, KINDS))

def hole_pair(rnd):
    for _ in range(60):
        ka, kb = pick(rnd, KINDS), pick(rnd, KINDS)
        area = len(SHAPES[ka]) + len(SHAPES[kb])
        if area < 4 or area > 8:
            continue
        A, B = pose_of(rnd, ka), pose_of(rnd, kb)
        Aset = set('%d,%d' % tuple(p) for p in A)
        cands, candKeys = [], set()
        for b in B:                                    # B 外层 / A 中层 / DIRS 内层（JS 遍历序）
            for a in A:
                for d in DIRS:
                    dx, dy = a[0] + d[0] - b[0], a[1] + d[1] - b[1]
                    dk = '%d,%d' % (dx, dy)
                    if dk in candKeys:
                        continue
                    placed = [[p[0] + dx, p[1] + dy] for p in B]
                    if any('%d,%d' % tuple(p) in Aset for p in placed):
                        continue
                    xs = [p[0] for p in A + placed]; ys = [p[1] for p in A + placed]
                    if max(xs) - min(xs) >= 5 or max(ys) - min(ys) >= 5:
                        continue
                    candKeys.add(dk); cands.append((dx, dy))
        if not cands:
            continue
        cc = pick(rnd, cands)
        placedB = [[p[0] + cc[0], p[1] + cc[1]] for p in B]
        allc = A + placedB
        mx = min(p[0] for p in allc); my = min(p[1] for p in allc)
        sh = lambda p: [p[0] - mx, p[1] - my]
        return {'hole': norm_cells(allc), 'a': [sh(p) for p in A], 'b': [sh(p) for p in placedB]}
    A = [[0, 0], [1, 0], [2, 0], [1, 1]]; B = [[0, 2], [1, 2], [0, 3], [1, 3]]
    return {'hole': norm_cells(A + B), 'a': [list(p) for p in A], 'b': [list(p) for p in B]}

def pad_site(rnd, hole):
    w = max(p[0] for p in hole) + 1; h = max(p[1] for p in hole) + 1
    pl = ri(rnd, 0, min(1, 5 - w)); pt = ri(rnd, 0, min(1, 5 - h))
    pr = min(ri(rnd, 0, 1), 5 - w - pl); pb = min(ri(rnd, 0, 1), 5 - h - pt)
    sh = lambda p: [p[0] + pl, p[1] + pt]
    return {'hole': [sh(p) for p in hole], 'GW': w + pl + pr, 'GH': h + pt + pb}

def num_items(rnd, ans):
    pool = []
    for v in (ans - 2, ans - 1, ans + 1, ans + 2):
        if v > 0 and v != ans and v not in pool:
            pool.append(v)
    ds = shuffled(pool, rnd)[:2]
    items = shuffled([ans, ds[0], ds[1]], rnd)
    return {'items': items, 'answerIdx': items.index(ans)}

def num_cards(rnd, ans, d1, d2):
    items = shuffled([ans, d1, d2], rnd)
    return {'items': items, 'answerIdx': items.index(ans)}

def sig_of(q):
    s = q['kind'] + (':' + q['sub'] if q.get('sub') else '') + '|' + \
        (ser(q['hole']) if q.get('hole') is not None else '-') + '|'
    if q.get('bricks'):
        s += '+'.join(b['kind'] + ':' + ser(b['cells']) for b in q['bricks']) + '|'
    s += '/'.join(str(c) if isinstance(c, int) else c['kind'] + ':' + ser(c['cells']) for c in q['cards'])
    s += '|' + json.dumps(q['answer'], separators=(',', ':'))
    return s

def gen_calc(rnd, sub, maxDim, avoid):
    for _ in range(40):
        L, W = ri(rnd, 2, maxDim), ri(rnd, 2, maxDim)
        if L * W > 20:
            continue
        A, P = L * W, 2 * (L + W)
        ans = A if sub == 'area' else P
        confPool = []
        for v in ([L + W, P] if sub == 'area' else [L + W, A]):
            if v > 0 and v != ans and v not in confPool:
                confPool.append(v)
        d1 = pick(rnd, confPool)
        nearPool = []
        for v in (ans - 2, ans - 1, ans + 1, ans + 2):
            if v > 0 and v != ans and v != d1 and v not in confPool and v not in nearPool:
                nearPool.append(v)
        d2 = pick(rnd, nearPool)
        opt = num_cards(rnd, ans, d1, d2)
        rect = [[x, y] for y in range(W) for x in range(L)]
        site = pad_site(rnd, rect)
        q = {'kind': 'calc', 'sub': sub, 'L': L, 'W': W, 'hole': site['hole'],
             'GW': site['GW'], 'GH': site['GH'], 'cards': opt['items'], 'answer': opt['answerIdx'],
             'ans': ans, 'placed': None, 'sel': None, 'miss': 0, 'solved': False, 'warm': False}
        if sig_of(q) not in avoid:
            return q
    rect = [[x, y] for y in range(4) for x in range(3)]
    opt = num_cards(rnd, 12, 14, 11)
    return {'kind': 'calc', 'sub': 'area', 'L': 3, 'W': 4, 'hole': rect, 'GW': 3, 'GH': 4,
            'cards': opt['items'], 'answer': opt['answerIdx'], 'ans': 12,
            'placed': None, 'sel': None, 'miss': 0, 'solved': False, 'warm': False}

def gen_samearea(rnd, avoid):
    for _ in range(40):
        G = 3 if rnd() < 0.5 else 4
        X = pick(rnd, AREA_GROUP[G])
        Y = pick(rnd, [k for k in AREA_GROUP[G] if k != X])
        if G == 3:
            dk = [pick(rnd, [k for k in KINDS if len(SHAPES[k]) == 2]), pick(rnd, AREA_GROUP[4])]
        else:
            dk = ['b3', 'l3']
        hole = pose_of(rnd, X)
        cards = shuffled([{'cells': pose_of(rnd, Y), 'kind': Y},
                          {'cells': pose_of(rnd, dk[0]), 'kind': dk[0]},
                          {'cells': pose_of(rnd, dk[1]), 'kind': dk[1]}], rnd)
        answer = next(i for i, c in enumerate(cards) if c['kind'] == Y)
        site = pad_site(rnd, hole)
        q = {'kind': 'samearea', 'hole': site['hole'], 'GW': site['GW'], 'GH': site['GH'],
             'cards': cards, 'answer': answer, 'ans': len(hole),
             'placed': None, 'sel': None, 'miss': 0, 'solved': False, 'warm': False}
        if sig_of(q) not in avoid:
            return q
    cards = shuffled([{'cells': [[0, 0], [0, 1], [1, 1]], 'kind': 'l3'},
                      {'cells': [[0, 0], [1, 0]], 'kind': 'b2'},
                      {'cells': [[0, 0], [1, 0], [0, 1], [1, 1]], 'kind': 'sq'}], rnd)
    return {'kind': 'samearea', 'hole': [[0, 0], [1, 0], [2, 0]], 'GW': 3, 'GH': 1,
            'cards': cards, 'answer': next(i for i, c in enumerate(cards) if c['kind'] == 'l3'),
            'ans': 3, 'placed': None, 'sel': None, 'miss': 0, 'solved': False, 'warm': False}

def gen_combo(rnd, avoid):
    for _ in range(60):
        N = ri(rnd, 3, 4)
        kinds = shuffled(KINDS, rnd)[:N]
        bricks = [{'cells': pose_of(rnd, k), 'kind': k} for k in kinds]
        total = sum(len(b['cells']) for b in bricks)
        if total < 6 or total > 12:
            continue
        partials = []
        for b in bricks:
            v = total - len(b['cells'])
            if v not in partials:
                partials.append(v)
        d1 = pick(rnd, partials)
        nearPool = []
        for v in (total - 2, total - 1, total + 1, total + 2):
            if v > 0 and v != d1 and v not in nearPool:
                nearPool.append(v)
        d2 = pick(rnd, nearPool)
        opt = num_cards(rnd, total, d1, d2)
        q = {'kind': 'combo', 'hole': None, 'GW': 0, 'GH': 0, 'bricks': bricks,
             'cards': opt['items'], 'answer': opt['answerIdx'], 'ans': total,
             'placed': None, 'sel': None, 'miss': 0, 'solved': False, 'warm': False}
        if sig_of(q) not in avoid:
            return q
    bricks = [{'cells': [[0, 0], [1, 0], [2, 0]], 'kind': 'b3'},
              {'cells': [[0, 0], [1, 0], [0, 1], [1, 1]], 'kind': 'sq'},
              {'cells': [[0, 0], [1, 0]], 'kind': 'b2'}]
    opt = num_cards(rnd, 9, 6, 10)
    return {'kind': 'combo', 'hole': None, 'GW': 0, 'GH': 0, 'bricks': bricks,
            'cards': opt['items'], 'answer': opt['answerIdx'], 'ans': 9,
            'placed': None, 'sel': None, 'miss': 0, 'solved': False, 'warm': False}

def gen_unit2(rnd, avoid):
    for _ in range(60):
        bare = hole_single(rnd) if rnd() < 0.45 else hole_pair(rnd)['hole']
        if not (2 <= len(bare) <= 8):
            continue
        G = len(bare); ans = 2 * G
        nearPool = []
        for v in (ans - 2, ans + 2):
            if v > 0 and v != G and v != ans and v not in nearPool:
                nearPool.append(v)
        d2 = pick(rnd, nearPool)
        opt = num_cards(rnd, ans, G, d2)
        site = pad_site(rnd, bare)
        q = {'kind': 'unit2', 'hole': site['hole'], 'GW': site['GW'], 'GH': site['GH'],
             'cards': opt['items'], 'answer': opt['answerIdx'], 'ans': ans,
             'placed': None, 'sel': None, 'miss': 0, 'solved': False, 'warm': False}
        if sig_of(q) not in avoid:
            return q
    opt = num_cards(rnd, 4, 2, 6)
    return {'kind': 'unit2', 'hole': [[0, 0], [1, 0]], 'GW': 2, 'GH': 1,
            'cards': opt['items'], 'answer': opt['answerIdx'], 'ans': 4,
            'placed': None, 'sel': None, 'miss': 0, 'solved': False, 'warm': False}

def gen_count(rnd, avoid):
    FALLBACK = [[[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]],
                [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]]]
    def mk(cells):
        site = pad_site(rnd, cells)
        opt = num_items(rnd, len(site['hole']))
        return {'kind': 'count', 'hole': site['hole'], 'GW': site['GW'], 'GH': site['GH'],
                'cards': opt['items'], 'answer': opt['answerIdx'], 'ans': len(site['hole']),
                'placed': None, 'sel': None, 'miss': 0, 'solved': False, 'warm': False}
    for _ in range(40):
        bare = hole_single(rnd) if rnd() < 0.45 else hole_pair(rnd)['hole']
        q = mk(bare)
        if sig_of(q) not in avoid:
            return q
    for f in FALLBACK:
        q = mk(f)
        if sig_of(q) not in avoid:
            return q
    return mk([[0, 0], [1, 0], [2, 0]])

def gen_one(dch, qi, rnd, avoid):
    if dch == 1:
        q = gen_calc(rnd, CALC_COMPOSE[qi], 4 if qi <= 2 else 5, avoid)
    elif dch == 2:
        q = gen_count(rnd, avoid) if qi == 0 else gen_samearea(rnd, avoid)
    elif dch == 3:
        q = gen_count(rnd, avoid) if qi == 0 else gen_combo(rnd, avoid)
    else:
        q = gen_count(rnd, avoid) if qi == 0 else gen_unit2(rnd, avoid)
    q['warm'] = (qi == 0 and dch != 1)
    return q

def gen_level(flat):
    flat = int(flat)
    ch = flat // CH_LEN + 1
    rnd = mulberry32(flat * 7919 + 13)
    dch = (ch - 1) % 4 + 1 if flat < STATIC_LEVELS else ri(rnd, 1, 4)
    quizzes, sigs = [], []
    for qi in range(CH_LEN):
        q = gen_one(dch, qi, rnd, sigs)
        sigs.append(sig_of(q))
        quizzes.append(q)
    return {'flat': flat, 'ch': ch, 'dch': dch, 'lv': flat % CH_LEN, 'quizzes': quizzes,
            'step': 0, 'retries': 0, 'done': False}

# ================= SPEC §7 独立断言（从 SPEC 推导；作用于 Python 复刻产物=页面产物） =================
def area_fn(L, W):
    return L * W

def perim_fn(L, W):
    return 2 * (L + W)

def connected(hole):
    vis = {tuple(hole[0])}
    stack = [tuple(hole[0])]
    while stack:
        x, y = stack.pop()
        for dx, dy in DIRS:
            n = (x + dx, y + dy)
            if n not in vis and n in set(map(tuple, hole)):
                vis.add(n); stack.append(n)
    return len(vis) == len(hole)

def audit_q(flat, qi, q, bad, anchor):
    kind, hole, cards = q['kind'], q.get('hole'), q['cards']
    ans, ai = q.get('ans'), q['answer']            # ans=数值答案；ai=答案卡索引
    tid = (flat, qi)
    if hole is not None:
        if len(set(map(tuple, hole))) != len(hole):
            bad.append('flat%d q%d hole 重复坐标' % (flat, qi))
        if any(x < 0 or y < 0 or x >= q['GW'] or y >= q['GH'] for x, y in hole):
            bad.append('flat%d q%d hole 越界' % (flat, qi))
        if q['GW'] > 5 or q['GH'] > 5:
            bad.append('flat%d q%d 网格超 5x5' % (flat, qi))
        if not connected(hole):
            bad.append('flat%d q%d hole 不连通' % (flat, qi))
    else:
        if q['GW'] != 0 or q['GH'] != 0:
            bad.append('flat%d q%d combo 网格应 0' % (flat, qi))
    if kind == 'count':
        if not (1 <= len(hole) <= 8) or cards[ai] != len(hole) or len(cards) != 3:
            bad.append('flat%d q%d count 域/答案' % (flat, qi))
        if len([c for c in cards if c == len(hole)]) != 1:
            bad.append('flat%d q%d count 真值非恰一' % (flat, qi))
        pool = [v for v in (len(hole) - 2, len(hole) - 1, len(hole) + 1, len(hole) + 2)
                if v > 0 and v != len(hole)]
        if not all(c == len(hole) or c in pool for c in cards):
            bad.append('flat%d q%d count 干扰池' % (flat, qi))
    elif kind == 'calc':
        L, W = q['L'], q['W']
        want = area_fn(L, W) if q['sub'] == 'area' else perim_fn(L, W)   # 独立面积/周长函数
        if not (2 <= L <= 5 and 2 <= W <= 5 and L * W <= 20):
            bad.append('flat%d q%d calc 域 L%d W%d' % (flat, qi, L, W))
        if ans != want or cards[ai] != want or len([c for c in cards if c == want]) != 1:
            bad.append('flat%d q%d calc 答案 %s!=%s' % (flat, qi, ans, want))
        if len(hole) != area_fn(L, W):
            bad.append('flat%d q%d calc 格数!=积' % (flat, qi))
        xs = [p[0] for p in hole]; ys = [p[1] for p in hole]
        if max(xs) - min(xs) + 1 != L or max(ys) - min(ys) + 1 != W:
            bad.append('flat%d q%d calc 非完整矩形' % (flat, qi))
        typ = [v for v in (L + W, area_fn(L, W), perim_fn(L, W)) if v != want]
        dis = [c for i, c in enumerate(cards) if i != ai]
        if not any(c in typ for c in dis):
            bad.append('flat%d q%d calc 典型错缺' % (flat, qi))
        if not any(abs(c - want) in (1, 2) for c in dis):
            bad.append('flat%d q%d calc 近误缺' % (flat, qi))
    elif kind == 'samearea':
        if not (3 <= len(hole) <= 4):
            bad.append('flat%d q%d samearea 域' % (flat, qi))
        hit_idx = [i for i, c in enumerate(cards) if len(c['cells']) == len(hole)]
        if hit_idx != [ai]:
            bad.append('flat%d q%d samearea 恰一同面积/answer' % (flat, qi))
        if canon(cards[ai]['cells']) == canon(hole):
            bad.append('flat%d q%d samearea 正解同形（轮廓匹配可解）' % (flat, qi))
        if q['ans'] != len(hole):
            bad.append('flat%d q%d samearea ans' % (flat, qi))
        for c in cards:
            if canon(c['cells']) != canon(SHAPES[c['kind']]):
                bad.append('flat%d q%d samearea 卡非池内形状' % (flat, qi))
    elif kind == 'combo':
        bricks = q['bricks']
        T = sum(len(b['cells']) for b in bricks)
        if not (3 <= len(bricks) <= 4 and 6 <= T <= 12) or ans != T:
            bad.append('flat%d q%d combo 域/答案' % (flat, qi))
        if len([c for c in cards if c == T]) != 1 or cards[ai] != T:
            bad.append('flat%d q%d combo 真值非恰一' % (flat, qi))
        partials = [T - len(b['cells']) for b in bricks]
        dis = [c for i, c in enumerate(cards) if i != ai]
        if not any(c in partials for c in dis):
            bad.append('flat%d q%d combo 部分和缺' % (flat, qi))
        if len(set(canon(b['cells']) for b in bricks)) != len(bricks):
            bad.append('flat%d q%d combo 砖互异' % (flat, qi))
    elif kind == 'unit2':
        G = len(hole)
        if not (2 <= G <= 8) or ans != 2 * G or cards[ai] != 2 * G:
            bad.append('flat%d q%d unit2 域/答案' % (flat, qi))
        if G not in cards or cards.index(G) == ai:
            bad.append('flat%d q%d unit2 G 陷阱缺' % (flat, qi))
        third = [c for i, c in enumerate(cards) if i != ai and c != G]
        if len(third) != 1 or abs(third[0] - 2 * G) != 2:
            bad.append('flat%d q%d unit2 第三卡非 2G±2' % (flat, qi))
    else:
        bad.append('flat%d q%d 未知 kind %s' % (flat, qi, kind))
    if isinstance(cards[0], int):                       # 数值题收集反启发式锚
        anchor['ans'].setdefault(ans, []).append(tid)
        for i, v in enumerate(cards):
            if i != ai:
                anchor['dis'].setdefault(v, []).append(tid)

# ---- 时长独立复算（SPEC §7 常量与公式；与页面 levelDurMs 对账） ----
DECIDE = {'count': 8000, 'calcarea': 11000, 'calcperim': 11500, 'samearea': 9000,
          'combo': 10500, 'unit2': 11000}
ASK = {'count': '挖空区有几格？', 'samearea': '哪块砖和挖空区一样大？',
       'combo': '这些砖拼在一起，一共几格？', 'unit2': '每格住 2 只小蚂蚁，一共住几只？'}
RIGHT = '铺好啦，真整齐'

def est(n):
    return n * 345 + 600

def ask_of(q):
    if q['kind'] == 'calc':
        if q['sub'] == 'area':
            return '长 %d 宽 %d，铺满要几格？' % (q['L'], q['W'])
        return '长 %d 宽 %d，一圈是几格边？' % (q['L'], q['W'])
    return ASK[q['kind']]

def adv_of(q):
    if q['kind'] == 'calc' and q['sub'] == 'perim':
        return '一圈 %d 格，%s' % (q['ans'], RIGHT)
    if q['kind'] == 'combo':
        return '一共 %d 格，%s' % (q['ans'], RIGHT)
    if q['kind'] == 'unit2':
        return '一共 %d 只，%s' % (q['ans'], RIGHT)
    g = q['ans'] if q['kind'] == 'samearea' else len(q['hole'])
    return '%d 格，%s' % (g, RIGHT)

def quiz_dur(q):
    k = ('calcperim' if q['sub'] == 'perim' else 'calcarea') if q['kind'] == 'calc' else q['kind']
    vw = 400 + est(len(ask_of(q))) + 300
    return max(vw, DECIDE[k]) + 2000 + est(len(adv_of(q))) + 400

RESUME_SEED = """(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {};
  sv.area = { tutSeen: true }; KIDS.store.persist(); })()"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        title = ''
        for _ in range(120):                     # 等 selftest 完成（时序教训）
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        if 'VERIFY PASS' not in title:
            rec('A-1 selftest 前置完成', False, 'title=%r' % title)
        else:
            rec('A-1 selftest 前置完成', True, title)
        await pg.wait_for_timeout(600)

        # A2 mulberry32 复刻 40 关逐关 JSON 对账（分源双实现同 seed 全等）
        mism = []
        for flat in range(40):
            page_json = await pg.evaluate('JSON.stringify(genLevel(%d))' % flat)
            py = json.dumps(gen_level(flat), ensure_ascii=False, separators=(',', ':'))
            if page_json != py:
                mism.append(flat)
        rec('A2 mulberry32 复刻 40 关逐关 JSON 对账', not mism,
            '首差 flat=%s' % mism[:3] if mism else '40/40 全等')

        # A3 结构分源审计（SPEC §7 独立断言，作用于复刻产物）+ A9 反启发式锚
        bad, anchor = [], {'ans': {}, 'dis': {}}
        dmin, dmin_flat = None, None
        dur_bad = []
        for flat in range(40):
            L = gen_level(flat)
            if flat < 20 and L['dch'] != (L['ch'] - 1) % 4 + 1:
                bad.append('flat%d 静态关章型' % flat)
            kinds = [q['kind'] for q in L['quizzes']]
            want = (['calc'] * 5) if L['dch'] == 1 else \
                (['count'] + [{'2': 'samearea', '3': 'combo', '4': 'unit2'}[str(L['dch'])]] * 4)
            if kinds != want:
                bad.append('flat%d 章型构成 %s' % (flat, kinds))
            if L['dch'] == 1 and [q['sub'] for q in L['quizzes']] != CALC_COMPOSE:
                bad.append('flat%d calc 子型构成' % flat)
            for qi, q in enumerate(L['quizzes']):
                audit_q(flat, qi, q, bad, anchor)
            sigs = [sig_of(q) for q in L['quizzes']]
            if len(set(sigs)) != 5:
                bad.append('flat%d sig 重复' % flat)
            # 时长独立复算（与页面 levelDurMs 对账）
            row = await pg.evaluate('(flat => ({ dch: genLevel(flat).dch, modeled: levelDurMs(genLevel(flat)) }))(%d)' % flat)
            py_total = sum(quiz_dur(q) for q in L['quizzes'])
            if py_total != row['modeled']:
                dur_bad.append('flat%d 时长 %d!=%d' % (flat, py_total, row['modeled']))
            if dmin is None or py_total < dmin:
                dmin, dmin_flat = py_total, flat
        rec('A3 40 关结构分源审计（面积/周长独立函数复算）',
            not bad, bad[:3])
        anchors = [v for v in anchor['ans']
                   if v in anchor['dis'] and
                   any(t2 != t1 for t2 in anchor['dis'][v] for t1 in anchor['ans'][v])]
        rec('A9 反启发式锚（数值跨题正解+干扰双现 >=5）', len(anchors) >= 5,
            'n=%d sample=%s' % (len(anchors), sorted(anchors)[:10]))
        rec('A4 时长独立复算（最低 %d@flat%d，门禁 40000）' % (dmin, dmin_flat),
            not dur_bad and dmin == 77975 and dmin >= 40000, dur_bad[:3])
        rec('A0 页面零 pageerror', not errs, '%s' % errs[:2])

        # A5 tapCard 错=miss+1 可重点（flat0 calc 首题找非 answer 卡）
        await pg.evaluate('AR.start(0)')
        q = await pg.evaluate('AR.quiz')
        wrongs = [i for i in range(len(q['cards'])) if i != q['answer']]
        m0 = q['miss']
        await pg.evaluate('AR.tapCard(%d)' % wrongs[0])
        await pg.wait_for_timeout(900)
        q1 = await pg.evaluate('AR.quiz')
        rec('A5 错点 miss+1 可重点', q1['miss'] == m0 + 1 and not q1.get('solved'),
            'miss=%s->%s' % (m0, q1['miss']))

        # A6 countCells：逐格数数+ar_count clip（spy）
        vlog = await pg.evaluate("""(() => {
          AR.start(5);
          const log = [];
          KIDS.voice.play = k => log.push('P:' + k);
          AR.countCells();
          return log;
        })()""")
        await pg.wait_for_timeout(600)
        cnt_ok = any('ar_count_' in x for x in vlog)
        rec('A6 countCells 播 ar_count*', cnt_ok, '%s' % vlog[:6])

        # A7 sayW flat<3 错点必播 ar_wrong
        vlog3 = await pg.evaluate("""(() => {
          AR.start(0);
          const q = AR.quiz;
          const log = [];
          KIDS.voice.play = k => log.push('P:' + k);
          const w = q.cards.findIndex((c, i) => i !== q.answer);
          AR.tapCard(w);
          return log;
        })()""")
        await pg.wait_for_timeout(400)
        rec('A7 flat<3 错播 ar_wrong', any('ar_wrong' in x for x in vlog3), '%s' % vlog3[:3])

        # A7b modeled 钩子对账（AR.modeled vs levelDurMs）
        mm = await pg.evaluate('[AR.modeled(5), levelDurMs(genLevel(5)), AR.modeled(0)]')
        rec('A7b AR.modeled 钩子对账', mm[0] == mm[1] and mm[2] >= 40000, '%s' % mm)

        await ctx.close()

        # A8 救援 14s 计数（真实页：verify 页 interval 被 VERIFY 门禁；seed tutSeen 跳教学）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        await pg.goto('file:///' + (BASE / 'area' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(RESUME_SEED)
        await pg.reload()
        await pg.wait_for_timeout(2000)
        r0 = await pg.evaluate('AR.rescues')
        await pg.evaluate('AR.start(1)')
        await pg.wait_for_timeout(16500)
        r1 = await pg.evaluate('AR.rescues')
        rec('A8 救援 14s 计数（真实页）', r1 >= r0 + 1 and not errs2,
            'rescues=%s->%s errs=%s' % (r0, r1, errs2[:1]))
        await ctx.close()
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
