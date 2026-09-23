# -*- coding: utf-8 -*-
"""batch15 两级入口验证：①batch15/index.html 三卡 ②主入口 7-8 岁区 batch15 三卡锚点
③链接目标文件系统直查 ④双 viewport overflowX ⑤0 错误"""
import asyncio, io, os, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

async def main():
    # ③ 链接目标存在性（文件系统直查）
    ok_all, miss = True, []
    n_links = 0
    for page in ('batch15/index.html', 'index.html'):
        src = open(os.path.join(ROOT, page), encoding='utf-8').read()
        for m in re.findall(r'href="([^"]+)"', src):
            if m.startswith('http') or m == '#':
                continue
            n_links += 1
            target = os.path.normpath(os.path.join(ROOT, page.replace('index.html', ''), m))
            if not os.path.exists(target):
                ok_all = False
                miss.append('%s -> %s' % (page, m))
    rec('3 link targets exist (fs)', ok_all, 'links=%d missing=%s' % (n_links, miss[:3]))

    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, rel in (('batch15/index.html', os.path.join(BASE, 'index.html')),
                          ('main index.html', os.path.join(ROOT, 'index.html'))):
            for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
                ctx = await b.new_context(viewport=vp)
                pg = await ctx.new_page()
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('file:///' + rel.replace('\\', '/'))
                await pg.wait_for_timeout(700)
                ox = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                rec('%s %dx%d overflowX=0+0err' % (name, vp['width'], vp['height']), ox == 0 and not errs, 'ox=%s errs=%s' % (ox, errs[:1]))
                await ctx.close()
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + os.path.join(ROOT, 'index.html').replace('\\', '/'))
        await pg.wait_for_timeout(700)
        cards = await pg.evaluate("""(() => ['batch15/cashier/index.html', 'batch15/logicwho/index.html', 'batch15/matchstick/index.html']
          .map(h => !!document.querySelector('a.card[href="' + h + '"]')))()""")
        rec('2 main-index batch15 3 cards', all(cards) and not errs, 'cards=%s' % cards)
        await pg.goto('file:///' + os.path.join(BASE, 'index.html').replace('\\', '/'))
        await pg.wait_for_timeout(700)
        cards2 = await pg.evaluate("""(() => ['cashier/index.html', 'logicwho/index.html', 'matchstick/index.html']
          .map(h => !!document.querySelector('a.card[href="' + h + '"]')))()""")
        rec('1 batch15-index 3 cards', all(cards2) and not errs, 'cards=%s' % cards2)
        await ctx.close()
        await b.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
