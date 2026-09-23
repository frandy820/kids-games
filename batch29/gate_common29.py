# -*- coding: utf-8 -*-
"""batch29 首单元门禁（通用版）：verify selftest 复跑 + 真实页教学链/通关/写档 + clips 注入
用法: python gate_common29.py <game> <hook> [clips_n]
  game: bodyen|poem|wordpuz  hook: BE|PM|WP
  clips_n: 该款 manifest 注入条数（bod=15/poe=27/wpu=26——G3 计数对账）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME, HOOK = sys.argv[1], sys.argv[2]
NCLIPS = int(sys.argv[3]) if len(sys.argv) > 3 else None
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # G1 verify selftest 复跑（结果在 document.title）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_V)
        title = ''
        for _ in range(90):
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        rec('G1 verify selftest 复跑', 'VERIFY PASS' in title and not errs, 'title=%r errs=%s' % (title, errs[:1]))
        await ctx.close()

        # G2 真实页教学链+通关+写档
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_R)
        await pg.wait_for_timeout(2500)
        demo_var = {'BE': '__beDemoR', 'PM': '__pmDemoR', 'WP': '__wpDemoR'}[HOOK]
        demo_r = None
        for _ in range(60):
            demo_r = await pg.evaluate('window.%s || null' % demo_var)
            if demo_r:
                break
            await pg.wait_for_timeout(500)
        tut = 'watch'
        for _ in range(40):                       # 等教学 handoff 完成（watch→help/solo；教学 watch 演示）
            tut = await pg.evaluate('window.%s && %s.tutorial' % (HOOK, HOOK))
            if tut != 'watch':
                break
            await pg.wait_for_timeout(500)
        r = await pg.evaluate('%s.autoSolve()' % HOOK)
        stars = None
        for _ in range(30):
            stars = await pg.evaluate("(KIDS._save()||{levels:{}}).levels['1-0'] ? KIDS._save().levels['1-0'].stars : null")
            if stars is not None:
                break
            await pg.wait_for_timeout(500)
        # 演示返回值按款语义（SPEC-BATCH29）：三款演示完成一题均='right'
        # （bodyen 听音点中 eye/body 图卡、poem 找到下一行、wordpuz 按序点满 cat 槽位）
        demo_ok = demo_r == 'right'
        rec('G2 教学链+通关+写档', demo_ok and r.get('done') and stars == 3 and not errs,
            'demoR=%s tut=%s auto=%s stars=%s errs=%s' % (demo_r, tut, r, stars, errs[:1]))
        await ctx.close()

        # G3 clips 注入（manifest games 全集 + 条数对账 bod=15/poe=27/wpu=26）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_R)
        await pg.wait_for_timeout(1800)
        mani = open(BASE.parent / 'voice' / 'clips' / 'manifest.json', encoding='utf-8').read()
        js = "((g, m) => { const miss = []; let n = 0; for (const k in m) if (m[k].games.includes(g)) {" \
             "n++; if (!KIDS.voice.clips[k] || !KIDS.voice.clips[k].startsWith('data:audio/mpeg;base64,')) miss.push(k); }" \
             "return {n, miss}; })('%s', %s)" % (GAME, mani)
        r = await pg.evaluate(js)
        n_ok = (NCLIPS is None or r['n'] == NCLIPS)
        rec('G3 clips 全注入', not r['miss'] and n_ok, 'n=%d miss=%s' % (r['n'], r['miss'][:3]))
        await ctx.close()
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
