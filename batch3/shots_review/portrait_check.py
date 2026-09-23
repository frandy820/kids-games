# -*- coding: utf-8 -*-
"""竖屏图内容分布检测：按行统计非背景像素占比，找大空白带"""
from PIL import Image

BG = (251, 243, 228)  # #FBF3E4

def row_profile(path, name):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    im = im.resize((200, h // 4))
    w2, h2 = im.size
    px = im.load()
    rows = []
    for y in range(h2):
        n = 0
        for x in range(w2):
            r, g, b = px[x, y]
            if abs(r - BG[0]) + abs(g - BG[1]) + abs(b - BG[2]) > 36:
                n += 1
        rows.append(n / w2)
    # 找连续内容带和空白带
    bands = []
    cur = None
    for y, v in enumerate(rows):
        if v > 0.02 and cur is None:
            cur = [y, y]
        elif v > 0.02:
            cur[1] = y
        elif cur is not None:
            bands.append((cur[0] * 4, cur[1] * 4, (cur[1] - cur[0]) * 4))
            cur = None
    if cur: bands.append((cur[0] * 4, cur[1] * 4, (cur[1] - cur[0]) * 4))
    # 大空白带（内容带之间 >=90px）
    gaps = []
    for i in range(1, len(bands)):
        g = bands[i][0] - bands[i - 1][1]
        if g >= 90: gaps.append((bands[i - 1][1], bands[i][0], g))
    print(f"== {name} ({w}x{h}) ==")
    print("  content bands (y0,y1,h):", bands[:8])
    print("  gaps>=90px:", gaps if gaps else "none")
    top_pad = bands[0][0] if bands else -1
    bot_pad = h - bands[-1][1] if bands else -1
    print(f"  top_pad={top_pad}px bottom_pad={bot_pad}px")

for f, n in [
    ("pinyin-05-portrait.png", "pinyin-portrait"),
    ("math-05-portrait.png", "math-portrait"),
    ("pattern-05-portrait.png", "pattern-portrait"),
    ("entry-02-portrait.png", "entry-portrait"),
]:
    row_profile(f"F:/claudecode/projects/active/kids-games/batch3/shots_review/{f}", n)
