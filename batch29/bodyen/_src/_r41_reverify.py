# -*- coding: utf-8 -*-
"""r42 主线复验：VERIFY 双视口（title 断言）"""
import asyncio, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

URL = 'file:///F:/claudecode/projects/active/kids-games/batch29/bodyen/index.html?verify=1'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in ((1280, 800), (800, 1180)):
            ctx = await b.new_context(viewport={'width': w, 'height': h})
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL)
            title = ''
            for _ in range(360):
                title = await pg.evaluate('document.title')
                if 'VERIFY' in title:
                    break
                await pg.wait_for_timeout(500)
            print('[%dx%d] %s errs=%d' % (w, h, title, len(errs)))
            await ctx.close()
        await b.close()

asyncio.run(main())
