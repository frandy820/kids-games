# -*- coding: utf-8 -*-
"""batch8 两级入口验证：batch8/index.html 三卡 + 主入口 6-7 岁区 9→12 卡
链接文件系统直查（XHR HEAD 在 file:// 下误报不可用——batch5 教训）+ 双 viewport + 0 错误"""
import asyncio, os, re, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

B8 = os.path.join(BASE, 'index.html')
MAIN = os.path.join(ROOT, 'index.html')

async def main():
    # 链接目标文件系统直查
    for label, path, base in (('batch8 入口', B8, BASE), ('主入口', MAIN, ROOT)):
        src = open(path, encoding='utf-8').read()
        hrefs = re.findall(r'href="([^"#]+\.html)"', src)
        hrefs = [h for h in hrefs if not h.startswith('http')]
        bad = [h for h in hrefs if not os.path.exists(os.path.normpath(os.path.join(base, h)))]
        rec('%s %d 链接全有效' % (label, len(hrefs)), not bad, 'bad=%s' % bad[:3])

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for label, path in (('batch8 入口', B8), ('主入口', MAIN)):
            for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
                ctx = await browser.new_context(viewport=vp)
                pg = await ctx.new_page()
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('file:///' + path.replace('\\', '/'))
                await pg.wait_for_timeout(600)
                ox = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                cards = await pg.evaluate("document.querySelectorAll('a.card').length")
                rec('%s %dx%d overflowX=0 卡片%d' % (label, vp['width'], vp['height'], cards), ox == 0 and not errs and cards >= 3,
                    'ox=%s errs=%s' % (ox, errs[:1]))
                await ctx.close()
        # 主入口 batch8 三卡锚点在
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        await pg.goto('file:///' + MAIN.replace('\\', '/'))
        await pg.wait_for_timeout(600)
        hits = await pg.evaluate("""(() => ['batch8/neighbors/index.html','batch8/picto/index.html','batch8/worden/index.html']
          .map(h => !!document.querySelector('a.card[href="' + h + '"]')))()""")
        rec('主入口含 batch8 三卡', all(hits), str(hits))
        await ctx.close()
        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
