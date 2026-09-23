# -*- coding: utf-8 -*-
"""batch7 两级入口验证：链接目标存在（文件系统直查）+ 双 viewport overflowX=0 + 0 pageerror"""
import asyncio, os, re, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B7 = os.path.dirname(os.path.abspath(__file__))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

# 链接目标存在性（file:// 下 XHR HEAD 全误报，用文件系统直查）
for page, pdir in [('index.html', B7), ('index.html', BASE)]:
    src = open(os.path.join(pdir, page), encoding='utf-8').read()
    hrefs = re.findall(r'href="([^"#]+/index\.html)"', src)
    missing = [h for h in hrefs if not os.path.exists(os.path.normpath(os.path.join(pdir, h)))]
    rec('%s 链接 %d 个全有效' % (page, len(hrefs)), not missing and len(hrefs) > 0, 'missing=%s' % missing)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for f in [os.path.join(B7, 'index.html'), os.path.join(BASE, 'index.html')]:
            for vp in [(1280, 800), (800, 1180)]:
                ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = await ctx.new_page()
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('file:///' + f.replace('\\', '/'))
                await pg.wait_for_timeout(700)
                ov = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                name = '%s vp%s' % (os.path.basename(os.path.dirname(f)) + '/' + os.path.basename(f), vp)
                rec('%s overflowX=0+0err' % name, ov <= 0 and not errs, 'ov=%s errs=%s' % (ov, errs[:1]))
                await ctx.close()
        await b.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
