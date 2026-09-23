# -*- coding: utf-8 -*-
"""像素级非空白抽检：真实页 flat0/flat10 截图 → PIL 统计颜色多样性（非底色像素占比）"""
import asyncio, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

URL = 'file:///F:/claudecode/projects/active/kids-games/batch22/slide/index.html'
SHOTS = r'F:/claudecode/projects/active/kids-games/batch22/slide/_src/_shots'

async def main():
    import os
    os.makedirs(SHOTS, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for flat, name in [(0, 'flat0'), (10, 'flat10')]:
            ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL)
            await pg.wait_for_timeout(2500)
            await pg.evaluate('SL.start(%d)' % flat)
            await pg.wait_for_timeout(1200)          # 入场 stagger 完成
            path = SHOTS + '/%s.png' % name
            await pg.screenshot(path=path)
            await ctx.close()
            from PIL import Image
            im = Image.open(path).convert('RGB')
            px = list(im.getdata())
            n = len(px)
            # 底色 #FBF6EC=(251,246,236)；统计非底色占比与独立色数
            nonbg = sum(1 for c in px if abs(c[0]-251)+abs(c[1]-246)+abs(c[2]-236) > 24)
            colors = len(set(px[::37]))
            print('%s: %dx%d nonBg=%.1f%% colors=%d errs=%d' % (name, im.width, im.height, nonbg*100.0/n, colors, len(errs)))
        await b.close()

asyncio.run(main())
