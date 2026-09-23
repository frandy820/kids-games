# -*- coding: utf-8 -*-
"""slide verify=1 自检驱动：独立 chromium.launch() headless，title 断言 + 0 pageerror"""
import asyncio, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

URL = 'file:///F:/claudecode/projects/active/kids-games/batch22/slide/index.html?verify=1'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        title = ''
        for _ in range(180):                     # BFS 3×3 全表 + IDA* 交叉验证较重，放宽到 90s
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        print('TITLE:', title)
        print('PAGEERRORS:', len(errs), errs[:3])
        if 'PASS' not in title:
            r = await pg.evaluate("document.getElementById('verify-result').textContent")
            import json
            try:
                j = json.loads(r)
                print('json keys:', list(j.keys()), 'pass', j.get('pass'), '/', j.get('total'))
                for sec in ('units', 'smokes'):
                    for k, v in j.get(sec, {}).items():
                        if isinstance(v, dict) and not v.get('ok', True):
                            print('FAIL:', sec, k, {kk: vv for kk, vv in v.items() if kk != 'sims'})
                for s in j.get('smokes', {}).get('layout', {}).get('sims', []):
                    if not s.get('pass'):
                        print('BADSIM:', s)
                bad = {k: v for k, v in {**j.get('levels', {}), **j.get('gen', {})}.items() if not v.get('ok')}
                for k, v in list(bad.items())[:5]:
                    print('BADLV:', k, {kk: vv for kk, vv in v.items() if kk != 'qs'})
            except Exception as e:
                print('RAW:', r[:2000])
        await ctx.close()
        await b.close()

asyncio.run(main())
