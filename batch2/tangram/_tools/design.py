# -*- coding: utf-8 -*-
"""tangram 模板设计与校验：
- 七巧板 7 块经典分割（正方形 [0,4]x[0,4]，单位格）
- 图形模板 = [{t,x,y,r}]（r=45°步数；锚点=旋转后顶点0 落在 (x,y)）
- 校验：块间两两凸多边形裁剪面积 ≈0（Sutherland-Hodgman）
- 渲染：PIL 预览图（按块着色），人工核对可辨识度
输出：templates.js 数据段（贴入 _src/game.js）
"""
import math, json, sys

S2 = math.sqrt(2)
# 旋转 45°*k：屏幕 y 向下坐标系（顺时针视觉），一致的数学旋转即可
def rot(p, k):
    a = math.pi / 4 * k
    c, s = math.cos(a), math.sin(a)
    return (p[0] * c - p[1] * s, p[0] * s + p[1] * c)

# 规范形状（单位坐标）：LT大三角 MT中三角 ST小三角 SQ正方 PA平行四边形
SHAPES = {
    'LT': [(0, 0), (4, 0), (2, 2)],
    'MT': [(0, 0), (2, 0), (0, 2)],
    'ST': [(0, 0), (2, 0), (1, 1)],
    'SQ': [(0, 0), (1, 1), (2, 0), (1, -1)],
    'PA': [(0, 0), (2, 0), (3, 1), (1, 1)],
}
AREA = {'LT': 4, 'MT': 2, 'ST': 1, 'SQ': 2, 'PA': 2}

def verts_of(pc):
    vs = [rot(p, pc['r']) for p in SHAPES[pc['t']]]
    dx, dy = pc['x'] - vs[0][0], pc['y'] - vs[0][1]
    return [(x + dx, y + dy) for (x, y) in vs]

def poly_area(vs):
    s = 0.0
    for i in range(len(vs)):
        x1, y1 = vs[i]; x2, y2 = vs[(i + 1) % len(vs)]
        s += x1 * y2 - x2 * y1
    return s / 2.0

def inside(p, a, b):
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) <= 1e-9

def clip(subject, clipper):
    out = subject
    n = len(clipper)
    for i in range(n):
        a, b = clipper[i], clipper[(i + 1) % n]
        inp, out2 = out, []
        if not inp: return []
        for j in range(len(inp)):
            cur, prev = inp[j], inp[j - 1]
            cin, pin = inside(cur, a, b), inside(prev, a, b)
            if cin:
                if not pin: out2.append(intersect(prev, cur, a, b))
                out2.append(cur)
            elif pin:
                out2.append(intersect(prev, cur, a, b))
        out = out2
    return out

def intersect(p1, p2, a, b):
    d1 = (b[0] - a[0]) * (p1[1] - a[1]) - (b[1] - a[1]) * (p1[0] - a[0])
    d2 = (b[0] - a[0]) * (p2[1] - a[1]) - (b[1] - a[1]) * (p2[0] - a[0])
    if abs(d1 - d2) < 1e-12: return p2
    t = d1 / (d1 - d2)
    return (p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]))

def overlap_area(A, B):
    # 凸×凸：A∩B 面积（先把 B 转成逆时针一致方向再裁剪）
    def cw(v): return v[::-1] if poly_area(v) > 0 else v
    inter = clip(cw(A), cw(B))
    return abs(poly_area(inter)) if len(inter) >= 3 else 0.0

def centroid(vs):
    return (sum(x for x, _ in vs) / len(vs), sum(y for _, y in vs) / len(vs))

def check_fig(name, pcs, n_expect=None):
    errs = []
    vs = [verts_of(p) for p in pcs]
    n = len(pcs)
    for i in range(n):
        for j in range(i + 1, n):
            a = overlap_area(vs[i], vs[j])
            if a > 0.02: errs.append('%s/%s overlap %.3f' % (pcs[i]['t'], pcs[j]['t'], a))
    if n_expect and n != n_expect: errs.append('pieces %d != %d' % (n, n_expect))
    tot = sum(AREA[p['t']] for p in pcs)
    return errs, tot

# ---------------- 图形库 ----------------
def figs():
    F = {}
    # -- 第一章 2-3 块 --
    F['mountain2'] = [  # 小山：大三角+中三角 双峰
        {'t': 'LT', 'x': 4, 'y': 3, 'r': 4},
        {'t': 'MT', 'x': 6, 'y': 3, 'r': 4}]
    F['mountain3'] = [  # 三峰小山
        {'t': 'LT', 'x': 4, 'y': 3, 'r': 4},
        {'t': 'MT', 'x': 6, 'y': 3, 'r': 4},
        {'t': 'ST', 'x': 8, 'y': 3, 'r': 4}]
    F['tree'] = [  # 小树：三角树冠 + 方形树干
        {'t': 'LT', 'x': 4, 'y': 2, 'r': 4},
        {'t': 'SQ', 'x': 2 - S2 / 2, 'y': 2, 'r': 1}]
    F['flag'] = [  # 小旗：平行四边形旗杆 + 方旗 + 三角旗尾
        {'t': 'PA', 'x': 2, 'y': 1, 'r': 2},
        {'t': 'SQ', 'x': 2, 'y': 1, 'r': 1},
        {'t': 'ST', 'x': 2 + S2, 'y': 1 + S2, 'r': 6}]
    F['rocket'] = [  # 小火箭：三角头 + 平行四边形身 + 方形尾翼
        {'t': 'ST', 'x': 3, 'y': 3, 'r': 4},
        {'t': 'PA', 'x': 2, 'y': 3, 'r': 2},
        {'t': 'SQ', 'x': 2, 'y': 5, 'r': 1}]
    # -- 第二章 4-5 块 --
    F['house4'] = [  # 房子：三角顶 + 方身(MT+2ST 拼 2x2)
        {'t': 'LT', 'x': 4, 'y': 2, 'r': 4},
        {'t': 'MT', 'x': 1, 'y': 2, 'r': 0},
        {'t': 'ST', 'x': 3, 'y': 2, 'r': 2},
        {'t': 'ST', 'x': 3, 'y': 4, 'r': 0}]
    F['candle4'] = [  # 蜡烛：PA 烛身 + SQ 烛根 + ST 火苗 + ST 火苗心
        {'t': 'PA', 'x': 2, 'y': 1, 'r': 2},
        {'t': 'ST', 'x': 2, 'y': 1, 'r': 4},
        {'t': 'MT', 'x': 0, 'y': 4, 'r': 0},
        {'t': 'SQ', 'x': 2, 'y': 5, 'r': 1}]
    F['fish5'] = [  # 小鱼：2LT 菱形身 + MT 尾 + ST 鳍 + SQ 鳍
        {'t': 'LT', 'x': 4, 'y': 2, 'r': 0},
        {'t': 'LT', 'x': 4, 'y': 2, 'r': 4},
        {'t': 'MT', 'x': 0, 'y': 2, 'r': 4},
        {'t': 'ST', 'x': 2, 'y': 0, 'r': 6},
        {'t': 'SQ', 'x': 3 + S2 / 2, 'y': 1 + S2 / 2, 'r': 1}]
    F['boat5'] = [  # 帆船：LT 大帆 + ST 小帆 + PA 船身 + MT 船头 + SQ 窗
        {'t': 'LT', 'x': 4, 'y': 4, 'r': 4},
        {'t': 'ST', 'x': 4, 'y': 4, 'r': 0},
        {'t': 'PA', 'x': 0, 'y': 6, 'r': 0},
        {'t': 'PA', 'x': 3, 'y': 6, 'r': 2},
        {'t': 'MT', 'x': 3, 'y': 7, 'r': 2}]
    F['bridge5'] = [  # 小桥：2ST 桥墩 + SQ 桥面 + 2PA 斜坡
        {'t': 'ST', 'x': 0, 'y': 2, 'r': 2},
        {'t': 'ST', 'x': 4, 'y': 2, 'r': 0},
        {'t': 'SQ', 'x': 1, 'y': 1 - S2 / 2, 'r': 0},
        {'t': 'PA', 'x': 1, 'y': 4, 'r': 0},
        {'t': 'PA', 'x': 4, 'y': 3, 'r': 4}]
    # -- 第三/四章 7 块（生成关模板池 12 形）--
    F['square7'] = [  # 经典正方形
        {'t': 'LT', 'x': 4, 'y': 0, 'r': 0},
        {'t': 'LT', 'x': 0, 'y': 0, 'r': 2},
        {'t': 'ST', 'x': 4, 'y': 0, 'r': 0},
        {'t': 'SQ', 'x': 2, 'y': 2, 'r': 6},
        {'t': 'MT', 'x': 4, 'y': 2, 'r': 0},
        {'t': 'PA', 'x': 0, 'y': 4, 'r': 4},
        {'t': 'ST', 'x': 1, 'y': 3, 'r': 2}]
    F['house7'] = F['house4'] + [  # 房子+烟囱+门
        {'t': 'PA', 'x': 4, 'y': 2, 'r': 2},
        {'t': 'ST', 'x': 1, 'y': 3, 'r': 6},
        {'t': 'ST', 'x': 3, 'y': 3, 'r': 4}]
    F['fish7'] = F['fish5'] + [
        {'t': 'MT', 'x': 6, 'y': 2, 'r': 2},
        {'t': 'ST', 'x': 6, 'y': 2, 'r': 6}]
    F['candle7'] = F['candle4'] + [
        {'t': 'ST', 'x': 1, 'y': 2, 'r': 6},
        {'t': 'LT', 'x': 5, 'y': 7, 'r': 4},
        {'t': 'ST', 'x': 3, 'y': 7, 'r': 4}]
    F['boat7'] = F['boat5'] + [
        {'t': 'LT', 'x': 6, 'y': 4, 'r': 4},
        {'t': 'ST', 'x': 6, 'y': 4, 'r': 0}]
    F['swan7'] = [  # 天鹅：2LT 菱形身 + 长颈 + 头
        {'t': 'LT', 'x': 6, 'y': 3, 'r': 4},
        {'t': 'LT', 'x': 6, 'y': 3, 'r': 0},
        {'t': 'PA', 'x': 6, 'y': 1, 'r': 2},
        {'t': 'MT', 'x': 6, 'y': 0, 'r': 0},
        {'t': 'ST', 'x': 6, 'y': 1, 'r': 0},
        {'t': 'ST', 'x': 6, 'y': 2, 'r': 2},
        {'t': 'SQ', 'x': 6, 'y': 2, 'r': 0}]
    F['cat7'] = [  # 小猫：LT 头 + ST 耳 + 方脸 + PA 身 + 尾
        {'t': 'LT', 'x': 2, 'y': 0, 'r': 4},
        {'t': 'ST', 'x': 0, 'y': 0, 'r': 0},
        {'t': 'ST', 'x': 0, 'y': 0, 'r': 4},
        {'t': 'PA', 'x': 0, 'y': 2, 'r': 0},
        {'t': 'MT', 'x': 3, 'y': 2, 'r': 2},
        {'t': 'LT', 'x': 5, 'y': 2, 'r': 4},
        {'t': 'SQ', 'x': 6, 'y': 0, 'r': 0}]
    F['rabbit7'] = [  # 奔跑兔子
        {'t': 'LT', 'x': 3, 'y': 1, 'r': 4},
        {'t': 'ST', 'x': 1, 'y': 1, 'r': 6},
        {'t': 'ST', 'x': 3, 'y': 1, 'r': 2},
        {'t': 'PA', 'x': 2, 'y': 3, 'r': 0},
        {'t': 'MT', 'x': 5, 'y': 1, 'r': 2},
        {'t': 'LT', 'x': 5, 'y': 3, 'r': 6},
        {'t': 'SQ', 'x': 1, 'y': 6, 'r': 0}]
    F['bridge7'] = [  # 桥
        {'t': 'LT', 'x': 4, 'y': 2, 'r': 4},
        {'t': 'LT', 'x': 4, 'y': 2, 'r': 0},
        {'t': 'MT', 'x': 0, 'y': 2, 'r': 4},
        {'t': 'ST', 'x': 0, 'y': 4, 'r': 0},
        {'t': 'ST', 'x': 2, 'y': 4, 'r': 2},
        {'t': 'PA', 'x': 4, 'y': 2, 'r': 6},
        {'t': 'SQ', 'x': 0, 'y': 6, 'r': 1}]
    F['arrow7'] = [  # 火箭（竖直）
        {'t': 'LT', 'x': 2, 'y': 2, 'r': 4},
        {'t': 'SQ', 'x': 2 - S2 / 2, 'y': 2, 'r': 1},
        {'t': 'PA', 'x': 1, 'y': 2 + S2, 'r': 2},
        {'t': 'MT', 'x': 1, 'y': 5, 'r': 4},
        {'t': 'MT', 'x': 3, 'y': 5, 'r': 6},
        {'t': 'ST', 'x': 0, 'y': 4, 'r': 4},
        {'t': 'ST', 'x': 4, 'y': 4, 'r': 4}]
    F['bigtriangle7'] = [  # 大三角形（等腰直角 腰 4√2）
        {'t': 'LT', 'x': 4, 'y': 4, 'r': 4},
        {'t': 'LT', 'x': 4, 'y': 4, 'r': 6},
        {'t': 'MT', 'x': 0, 'y': 4, 'r': 2},
        {'t': 'ST', 'x': 0, 'y': 4, 'r': 0},
        {'t': 'ST', 'x': 1, 'y': 3, 'r': 2},
        {'t': 'SQ', 'x': 3, 'y': 1, 'r': 0},
        {'t': 'PA', 'x': 2, 'y': 4, 'r': 6}]
    F['rectangle7'] = [  # 长方形 8x2
        {'t': 'LT', 'x': 2, 'y': 2, 'r': 6},
        {'t': 'LT', 'x': 6, 'y': 2, 'r': 4},
        {'t': 'MT', 'x': 2, 'y': 0, 'r': 0},
        {'t': 'MT', 'x': 4, 'y': 2, 'r': 0},
        {'t': 'SQ', 'x': 4, 'y': 0, 'r': 1},
        {'t': 'ST', 'x': 6, 'y': 0, 'r': 0},
        {'t': 'ST', 'x': 8, 'y': 0, 'r': 4}]
    F['bowtie7'] = [  # 蝴蝶结
        {'t': 'LT', 'x': 2, 'y': 2, 'r': 0},
        {'t': 'LT', 'x': 2, 'y': 2, 'r': 4},
        {'t': 'LT', 'x': 6, 'y': 2, 'r': 0},
        {'t': 'LT', 'x': 6, 'y': 2, 'r': 4},
        {'t': 'ST', 'x': 4, 'y': 2, 'r': 2},
        {'t': 'ST', 'x': 4, 'y': 2, 'r': 6},
        {'t': 'SQ', 'x': 3, 'y': 3, 'r': 0}]
    return F

COL = {'LT': '#E8975A', 'MT': '#8FBF7F', 'ST': '#F2B8C6', 'SQ': '#E8B04F', 'PA': '#8A9BAE'}

def render_all(F, path):
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print('PIL 不可用，跳过渲染'); return
    names = list(F.keys())
    cols = 5
    rows = (len(names) + cols - 1) // cols
    CELL = 170
    im = Image.new('RGB', (CELL * cols, CELL * rows), (251, 243, 228))
    dr = ImageDraw.Draw(im)
    for idx, nm in enumerate(names):
        pcs = F[nm]
        vs = [verts_of(p) for p in pcs]
        xs = [x for v in vs for x, _ in v]; ys = [y for v in vs for _, y in v]
        w, h = max(xs) - min(xs), max(ys) - min(ys)
        sc = 130.0 / max(w, h, 1)
        ox, oy = (idx % cols) * CELL + (CELL - w * sc) / 2 - min(xs) * sc, (idx // cols) * CELL + 22 + (CELL - 34 - h * sc) / 2 - min(ys) * sc
        for p, v in zip(pcs, vs):
            pts = [(x * sc + ox, y * sc + oy) for x, y in v]
            dr.polygon(pts, fill=COL[p['t']], outline=(74, 59, 46))
        dr.text(((idx % cols) * CELL + 8, (idx // cols) * CELL + 4), nm, fill=(74, 59, 46))
    im.save(path)
    print('preview ->', path)

def main():
    F = figs()
    bad = 0
    for nm, pcs in F.items():
        errs, tot = check_fig(nm, pcs)
        st = 'OK ' if not errs else 'BAD'
        if errs: bad += 1
        print('%s %-14s n=%d area=%g %s' % (st, nm, len(pcs), tot, '; '.join(errs)))
    render_all(F, 'preview.png')
    if bad:
        print('\n%d 个图形待修' % bad); sys.exit(1)
    # 输出 JS 数据
    print('\n// === templates（design.py 生成）===')
    print('const TPL = ' + json.dumps(F, separators=(',', ':')) + ';')

if __name__ == '__main__':
    main()
