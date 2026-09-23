# -*- coding: utf-8 -*-
"""七巧板精确拼合搜索（整数网格）：rot 只用偶数(0/90/180/270°) → 顶点恒整数格。
- square7：画布恰 4x4（7 块面积=16=画布 → 无重叠铺满即解）
- 自由形：8x8 画布内 7 块连通拼合（轮廓=任意凹多边形，供模板池）
输出：模板 JS 段（贴 game-data.js 的 TPL）+ 预览 PNG
"""
import math, json, random, sys

def rot(p, k):  # 90°步
    return [(p[1], -p[0]), (-p[0], -p[1]), (-p[1], p[0]), (p[0], p[1])][k % 4]

SHAPES = {  # 45°基准形状以 90° 步表达的整数版（与 design.py SHAPES 等价：rot 偶数时一致）
  'LT': {0: [(0,0),(4,0),(2,2)], 1: [(0,0),(0,4),(-2,2)], 2: [(0,0),(-4,0),(-2,-2)], 3: [(0,0),(0,-4),(2,-2)]},
  'MT': {0: [(0,0),(2,0),(0,2)], 1: [(0,0),(0,2),(-2,0)], 2: [(0,0),(-2,0),(0,-2)], 3: [(0,0),(0,-2),(2,0)]},
  'ST': {0: [(0,0),(2,0),(1,1)], 1: [(0,0),(0,2),(-1,1)], 2: [(0,0),(-2,0),(-1,-1)], 3: [(0,0),(0,-2),(1,-1)]},
  # SQ 基准=斜放(45°)；90° 步在 45° 体系=rot 偶数：[(0,0),(1,1),(2,0),(1,-1)] 转 90°k
  'SQ': {}, 'PA': {},
}
# SQ/PA 在 90° 步下的整数顶点：45° 体系 rot=2k → 顶点 = rot45(基准, 2k)；直接算
def rot45(p, k):
    a = math.pi / 4 * k; c, s = round(math.cos(a)), round(math.sin(a) * math.sqrt(2) / 2 * 2) / 2
    # 45°*k 旋转作用于整数点会产生 √2 分量；k 偶时仍是整数（cos/sin ∈ {0,±1}）
    a2 = k % 8
    tbl = {0: (1, 0), 1: None, 2: (0, 1), 3: None, 4: (-1, 0), 5: None, 6: (0, -1), 7: None}
    m = tbl[a2]
    if m is None:
        # k 奇：产生 √2/2 分量——本搜索不用（SQ/PA 基准含 (1,1) 斜边，rot 偶保持整数）
        c2, s2 = round(math.cos(math.pi/4*k), 10), round(math.sin(math.pi/4*k), 10)
        return (round(p[0]*c2 - p[1]*s2, 6), round(p[0]*s2 + p[1]*c2, 6))
    c, s = m
    return (p[0]*c - p[1]*s, p[0]*s + p[1]*c)

BASE = {'LT': [(0,0),(4,0),(2,2)], 'MT': [(0,0),(2,0),(0,2)], 'ST': [(0,0),(2,0),(1,1)],
        'SQ': [(0,0),(1,1),(2,0),(1,-1)], 'PA': [(0,0),(2,0),(3,1),(1,1)]}
AREA = {'LT': 4, 'MT': 2, 'ST': 1, 'SQ': 2, 'PA': 2}

def verts(t, x, y, r):  # r=45°步（本搜索只用偶数）
    vs = [rot45(p, r) for p in BASE[t]]
    x0, y0 = vs[0]
    return [(px - x0 + x, py - y0 + y) for px, py in vs]

def area(vs):
    s = 0
    for i in range(len(vs)):
        x1, y1 = vs[i]; x2, y2 = vs[(i+1) % len(vs)]
        s += x1*y2 - x2*y1
    return s / 2.0

def inside(p, a, b, eps=1e-9):
    return (b[0]-a[0])*(p[1]-a[1]) - (b[1]-a[1])*(p[0]-a[0]) <= eps

def isect(p1, p2, a, b):
    d1 = (b[0]-a[0])*(p1[1]-a[1]) - (b[1]-a[1])*(p1[0]-a[0])
    d2 = (b[0]-a[0])*(p2[1]-a[1]) - (b[1]-a[1])*(p2[0]-a[0])
    if abs(d1-d2) < 1e-12: return p2
    t = d1/(d1-d2)
    return (p1[0]+t*(p2[0]-p1[0]), p1[1]+t*(p2[1]-p1[1]))

def overlap(A, B):
    def cw(v): return v[::-1] if area(v) > 0 else v
    out = cw(A); cl = cw(B); n = len(cl)
    for i in range(n):
        a, b = cl[i], cl[(i+1) % n]
        inp, out2 = out, []
        if not inp: return 0.0
        for j in range(len(inp)):
            cur, prev = inp[j], inp[j-1]
            ci, pi = inside(cur, a, b), inside(prev, a, b)
            if ci:
                if not pi: out2.append(isect(prev, cur, a, b))
                out2.append(cur)
            elif pi:
                out2.append(isect(prev, cur, a, b))
        out = out2
    return abs(area(out)) if len(out) >= 3 else 0.0

BAG = ['LT', 'LT', 'MT', 'ST', 'ST', 'SQ', 'PA']

def search(W, H, want=6, seed=1, require_fill=False, max_nodes=4000000, grow=False):
    """回溯放置：块按 BAG 序；位置枚举 (x,y) 整数 0..W/H。
    grow=True：第 2 块起必须与已放集合共享 >=0.15 边段（边邻接生长 → 连通由构造保证）。
    随机散装+事后过滤在严格共享边判据下产出≈0（点接触不视觉连通，T7B 教训）。"""
    rnd = random.Random(seed)
    sols = []
    nodes = [0]
    def bt(i, placed):
        if len(sols) >= want or nodes[0] > max_nodes: return
        if i == len(BAG):
            sols.append(list(placed)); return
        t = BAG[i]
        rots = [0, 2, 4, 6]
        rnd.shuffle(rots)
        xs = list(range(0, W+1)); ys = list(range(0, H+1))
        rnd.shuffle(xs); rnd.shuffle(ys)
        for r in rots:
            for x in xs:
                for y in ys:
                    nodes[0] += 1
                    if nodes[0] > max_nodes: return
                    vs = verts(t, x, y, r)
                    if any(px < 0 or px > W or py < 0 or py > H for px, py in vs): continue
                    if any(overlap(vs, q[4]) > 0.02 for q in placed): continue
                    if grow and placed:
                        ev = [(vs[k], vs[(k+1) % len(vs)]) for k in range(len(vs))]
                        if not any(shared_edge_len(*e1, *e2) >= 0.15
                                   for q in placed for e2 in
                                   [(q[4][k], q[4][(k+1) % len(q[4])]) for k in range(len(q[4]))]
                                   for e1 in ev):
                            continue
                    bt(i+1, placed + [(t, x, y, r, vs)])
                    if len(sols) >= want: return
    bt(0, [])
    return sols

def shared_edge_len(a1, a2, b1, b2, eps=1e-6):
    """两线段共线时的重叠长度（不平行/不共线=0）"""
    d1 = (a2[0]-a1[0], a2[1]-a1[1]); d2 = (b2[0]-b1[0], b2[1]-b1[1])
    L1 = math.hypot(*d1); L2 = math.hypot(*d2)
    if L1 < eps or L2 < eps: return 0.0
    n1 = (d1[0]/L1, d1[1]/L1)
    if abs(n1[0]*d2[0] + n1[1]*d2[1]) < L2 - 1e-6: return 0.0   # 不平行（与 L2 比，勿用 max(L1,L2)）
    def dst(p): return abs((a2[0]-a1[0])*(p[1]-a1[1]) - (a2[1]-a1[1])*(p[0]-a1[0])) / L1
    if dst(b1) > 1e-6 or dst(b2) > 1e-6: return 0.0              # 不共线
    t1 = (b1[0]-a1[0])*n1[0] + (b1[1]-a1[1])*n1[1]
    t2 = (b2[0]-a1[0])*n1[0] + (b2[1]-a1[1])*n1[1]
    lo, hi = sorted((t1, t2))
    return max(0.0, min(hi, L1) - max(lo, 0.0))

def connectivity(pcs, min_shared=0.15):
    """严格连通：块间共享 >=min_shared 的正长度边段才算相邻（真平铺接触=共享边；
    角对角点接触视觉漂浮，T7A/bridge7/T7B 三例实证）。已知真值：T7S=True 其余断。"""
    def edges(vs):
        return [(vs[i], vs[(i+1) % len(vs)]) for i in range(len(vs))]
    E = [edges(p[4]) for p in pcs]
    n = len(pcs)
    par = list(range(n))
    def find(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    for i in range(n):
        for j in range(i+1, n):
            if any(shared_edge_len(*e1, *e2) >= min_shared for e1 in E[i] for e2 in E[j]):
                par[find(i)] = find(j)
    return len({find(i) for i in range(n)}) == 1

def render(sols, path, CELL=200, cols=4):
    from PIL import Image, ImageDraw
    COL = {'LT': '#E8975A', 'MT': '#8FBF7F', 'ST': '#F2B8C6', 'SQ': '#E8B04F', 'PA': '#8A9BAE'}
    rows = (len(sols) + cols - 1) // cols
    im = Image.new('RGB', (CELL*cols, CELL*rows), (251, 243, 228))
    dr = ImageDraw.Draw(im)
    for idx, pcs in enumerate(sols):
        vs = [p[4] for p in pcs]
        xs = [x for v in vs for x, _ in v]; ys = [y for v in vs for _, y in v]
        w, h = max(xs)-min(xs), max(ys)-min(ys)
        sc = 150.0 / max(w, h, 1)
        ox = (idx % cols)*CELL + (CELL - w*sc)/2 - min(xs)*sc
        oy = (idx // cols)*CELL + 26 + (CELL-40-h*sc)/2 - min(ys)*sc
        for p in pcs:
            pts = [(x*sc+ox, y*sc+oy) for x, y in p[4]]
            dr.polygon(pts, fill=COL[p[0]], outline=(74, 59, 46))
        dr.text(((idx % cols)*CELL+8, (idx // cols)*CELL+6), '#%d' % idx, fill=(74, 59, 46))
    im.save(path)
    print('preview ->', path)

def render_one(pcs, path, CELL=460):
    """单形大图（VLM 逐形复核用——网格图 VLM 会漏看格）"""
    render([pcs], path, CELL=CELL, cols=1)

def main():
    out = {}
    # square7：4x4 铺满（无重叠+面积相等=铺满）——严格判据下仍连通
    sq = search(4, 4, want=1, seed=42)
    if sq:
        out['T7S'] = sq[0]
        assert connectivity(sq[0]), 'T7S 应连通'
        print('square7 found & connected')
    # 自由形：8x8 边邻接生长（grow=True，连通由构造保证）+ 严格判据复核
    free = []
    seen_keys = set()
    for seed in (7, 11, 13, 17, 23, 31, 101, 202, 303, 404, 505, 606, 707, 808, 909, 121, 141, 161):
        for s in search(8, 8, want=6, seed=seed, grow=True):
            if not connectivity(s):
                continue
            vs = [p[4] for p in s]
            xs = [x for v in vs for x, _ in v]; ys = [y for v in vs for _, y in v]
            w, h = max(xs)-min(xs), max(ys)-min(ys)
            if max(w, h) < 5:      # 过小形状（孩子不好摆）不要
                continue
            norm = tuple(sorted((p[0], p[1]-min(xs), p[2]-min(ys), p[3]) for p in s))
            if norm in seen_keys: continue
            seen_keys.add(norm)
            free.append(s)
            break                   # 本 seed 到手，换下一 seed
        if len(free) >= 6: break
    print('free forms:', len(free), '(seeds used till here)')
    for i, s in enumerate(free):
        out['N%d' % (i+1)] = s
        render_one(s, 'preview_f%d.png' % (i+1))   # VLM 逐形复核
    # 输出 JS（45° 体系 r 即搜索的 r）
    js = {k: [{'t': t, 'x': x, 'y': y, 'r': r} for t, x, y, r, _ in v] for k, v in out.items()}
    print('\n// === solve7.py 产出（贴入 TPL）===')
    print(json.dumps(js, separators=(',', ':')))

if __name__ == '__main__':
    main()
