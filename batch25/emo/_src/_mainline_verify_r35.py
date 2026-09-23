# -*- coding: utf-8 -*-
# r35 主线复验①：VERIFY 双视口（r30-r34 同口径；挂 words MUTE 定稿版）
import asyncio, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

URL = 'file:///F:/claudecode/projects/active/kids-games/batch25/emo/index.html?verify=1'
MUTE = open('F:/claudecode/projects/active/kids-games/batch6/words/_src/_selftest.py', encoding='utf-8').read().split('MUTE_INIT = """')[1].split('"""')[0]

async def one(w, h):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': w, 'height': h})
        await ctx.add_init_script(MUTE)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        try:
            await pg.wait_for_function("() => document.title.startsWith('VERIFY')", timeout=180000)
        except Exception:
            print(f'{w}x{h}: TIMEOUT pageerror={len(errs)} {errs[:1]}')
            await b.close(); return
        t = await pg.evaluate('document.title')
        print(f'{w}x{h}: {t} pageerror={len(errs)}')
        await b.close()

asyncio.run(one(1280, 800))
asyncio.run(one(800, 1180))
