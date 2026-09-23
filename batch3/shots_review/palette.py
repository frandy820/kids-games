# -*- coding: utf-8 -*-
"""色板一致性：各游戏主背景色/前景色提取对比 + math 竖屏补充测量"""
import asyncio
from playwright.async_api import async_playwright
from PIL import Image
from collections import Counter

SHOTS = "F:/claudecode/projects/active/kids-games/batch3/shots_review"

def top_colors(path, n=8, box=None):
    im = Image.open(path).convert("RGB")
    if box: im = im.crop(box)
    im = im.resize((160, 100))
    cnt = Counter(im.getdata())
    tot = 160 * 100
    out = []
    for rgb, c in cnt.most_common(400):
        if len(out) >= n: break
        # 跳过接近已有色的重复项（delta<24）
        if any(sum(abs(a - b) for a, b in zip(rgb, o[0])) < 36 for o in out):
            continue
        out.append((rgb, round(c / tot * 100, 1)))
    return out

def hx(rgb): return "#%02X%02X%02X" % rgb

async def math_portrait_extras():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 800, "height": 1180})
        pg = await ctx.new_page()
        await pg.goto("file:///F:/claudecode/projects/active/kids-games/batch3/math/index.html")
        await pg.wait_for_timeout(1300)
        data = await pg.evaluate("""() => {
          const g = s => { const n = document.querySelector(s); if(!n) return null;
            const r = n.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
          return { mapwrap: g('#mapwrap'), bun: g('#bun'), aid: g('#aid'),
                   quiz: g('#quiz-card'), answers: g('#answers') };
        }""")
        print("math/portrait extras:", data)
        await b.close()

if __name__ == "__main__":
    import sys
    asyncio.run(math_portrait_extras())
    files = [
        ("ref-pipe",    f"{SHOTS}/ref-pipe-01-home.png", None),
        ("ref-tangram", f"{SHOTS}/ref-tangram-01-home.png", None),
        ("pinyin",      f"{SHOTS}/pinyin-01-home.png", None),
        ("math",        f"{SHOTS}/math-01-home.png", None),
        ("pattern",     f"{SHOTS}/pattern-01-home.png", None),
        ("entry",       f"{SHOTS}/entry-01-desktop.png", None),
    ]
    for name, path, box in files:
        cs = top_colors(path, 7, box)
        print(f"{name:12s}", " ".join(f"{hx(c[0])}({c[1]}%)" for c in cs))
