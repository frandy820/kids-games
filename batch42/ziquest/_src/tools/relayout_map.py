# -*- coding: utf-8 -*-
"""relayout_map.py — v55 地图节点重排：消灭视觉重叠 + 章法化布局

2026-10-01 家长反馈（v54 后）：圈圈相互重叠（min 间距 30svg vs 底盘直径 90）、
一坨挤在一起没章法——上一轮「点最近的圈」治标不治本，这次重排坐标从根上消灭。

方案：每区域蛇形 3 列（x=230/500/770±扰动，行距 130±8），链序（nodes 数组序）自底行
S 形上行，boss（链尾）落区域顶行中央；区域起折方向左右交替（区域间节奏变化）。
R0（calib/story 3 节点）居中纵排。y0/y1 地块迷雾由节点 bbox 动态算（game-main）自动适配。

硬门禁：全图 130 节点两两距 ≥108（底盘 r45×2=90 + 呼吸 18），不足即 exit 1。
幂等：扰动=hash(key) 确定性，重跑同结果。写回 data/map.json（仅 x/y/canvas.h）。
"""
import hashlib, io, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAP = os.path.join(HERE, '..', 'data', 'map.json')
COLS = [230, 500, 770]
ROW_H = 130
MIN_DIST = 108          # 硬门禁（底盘 90 + 呼吸 18）
JX, JY = 26, 8           # 扰动幅度（同列最小距 130-2*8=114 ≥108 ✓ 同行 270-2*26=218 ✓）


def jit(key, salt):
    h = hashlib.md5((key + '|' + str(salt)).encode('utf-8')).hexdigest()
    return (int(h[:4], 16) / 65535.0 - 0.5) * 2     # [-1, 1) 确定性


def main():
    mp = json.load(io.open(MAP, encoding='utf-8'))
    regions = sorted(mp['regions'], key=lambda r: -min(n['y'] for n in r['nodes']) if r['nodes'] else 0)
    # regions 处理顺序无关紧要；布局自 R0（最底）向上叠
    regions = sorted(mp['regions'], key=lambda r: r['id'])   # id 0=最底 R0，7=最顶
    cursor = mp['meta']['canvas']['h'] - 170                 # 底部留白（R0 起始行 y）
    placed = []
    for ri, rg in enumerate(regions):
        ns = rg['nodes']
        if rg['id'] == 0:                                    # R0 起始区：居中纵排
            y0 = cursor
            for i, n in enumerate(ns):
                n['y'] = int(y0 - i * 160)
                n['x'] = int(500 + jit(n['key'], 'x0') * JX)
                placed.append(n)
            cursor = y0 - len(ns) * 160 - 150
            continue
        # 顶行（链尾收口）特殊排：boss 居中，其余占旁列（c0/c2）——boss 居中曾与顶行
        # 中列节点相撞 18svg（首版 bug），顶行禁用中列即根治
        tail = ns[-3:]
        body = ns[:-3] if len(ns) >= 3 else []
        rows = [body[i:i + 3] for i in range(0, len(body), 3)] + [tail]
        l2r = (ri % 2 == 1)                                  # 区域起折方向交替（章法节奏）
        for r_i, row in enumerate(rows):
            is_tail = (r_i == len(rows) - 1)
            y = cursor - r_i * ROW_H
            if is_tail and len(row) >= 2:                    # 尾行：boss 中+旁列
                boss = row[-1]
                boss['x'] = int(500 + jit(boss['key'], 'x') * 10)
                boss['y'] = int(y - 26 + jit(boss['key'], 'y') * 6)   # 略上抬=区域收口感
                placed.append(boss)
                side = [c for c in [0, 2]][:len(row) - 1]
                for c_i, n in zip(side, row[:-1]):
                    n['x'] = int(COLS[c_i] + jit(n['key'], 'x') * JX)
                    n['y'] = int(y + jit(n['key'], 'y') * JY)
                    placed.append(n)
            else:                                            # 普通行 3 列蛇形
                order = row if l2r else list(reversed(row))
                for c_i, n in enumerate(order):
                    n['x'] = int(COLS[c_i] + jit(n['key'], 'x') * JX)
                    n['y'] = int(y + jit(n['key'], 'y') * JY)
                    placed.append(n)
        cursor -= len(rows) * ROW_H + 165                     # 区域间隔（外扩 bbox 另 +130）
    mp['meta']['canvas']['h'] = int(math.ceil((7230 - min(n['y'] for n in placed) + 170) / 100.0) * 100)

    # ===== 硬门禁：全图两两最小距 =====
    worst = (1e9, None, None)
    for i in range(len(placed)):
        for j in range(i + 1, len(placed)):
            a, b = placed[i], placed[j]
            d = math.hypot(a['x'] - b['x'], a['y'] - b['y'])
            if d < worst[0]:
                worst = (d, a['key'], b['key'])
    print('canvas.h=%d  min-dist=%.0f (%s<->%s)' % (mp['meta']['canvas']['h'], worst[0], worst[1], worst[2]))
    if worst[0] < MIN_DIST:
        print('FAIL: min-dist %.0f < %d' % (worst[0], MIN_DIST))
        sys.exit(1)
    io.open(MAP, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(mp, ensure_ascii=False, indent=1))
    print('OK written %s (only x/y/canvas.h touched)' % MAP)


if __name__ == '__main__':
    main()
