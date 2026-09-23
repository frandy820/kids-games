# -*- coding: utf-8 -*-
"""babylove verify 页复跑（独立 headless chromium.launch，禁 connect/禁杀浏览器）
+ 真实页冒烟（0 pageerror + 教学链 + autoSolve + 写档）。用法: python batch30/babylove/_src/_selftest.py"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent.parent
URL_V = 'file:///' + (BASE / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / 'index.html').as_posix()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # verify 页
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_V)
        title = ''
        for _ in range(120):
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        print('VERIFY title:', title, 'pageerrors:', errs[:3])
        res = await pg.evaluate('document.getElementById("verify-result").textContent')
        try:
            import json
            j = json.loads(res)
            print('pass/total:', j['pass'], '/', j['total'], 'layoutOk:', j['layoutOk'])
            for k in ('audit', 'tap', 'grow', 'habitat', 'frame', 'tutorial', 'swallow', 'clips',
                      'stars', 'contract', 'hints', 'estWin', 'modeled', 'speed'):
                if k in j.get('units', {}):
                    u = j['units'][k]
                    print(' unit %-11s ok=%s %s' % (k, u.get('ok'),
                          {x: u[x] for x in u if x not in ('ok',) and not isinstance(u[x], (dict, list))}))
            for k, s in j.get('smokes', {}).items():
                if k == 'layout':
                    for one in s.get('sims', []):
                        print(' layout %s flat%-3s svgH=%s cards=%s hit=%s scene=%s ox=%s pass=%s' %
                              (one['vp'], one['flat'], one['svgH'], one['cards'], one['hitOk'],
                               one['sceneOk'], one['ox'], one['pass']))
                else:
                    print(' smoke %-7s ok=%s %s' % (k, s.get('ok'),
                          {s[x] for x in s if x not in ('ok',)} if False else
                          {x: s[x] for x in s if x not in ('ok',)}))
            bad = [k for k, v in list(j.get('levels', {}).items()) + list(j.get('gen', {}).items()) if not v.get('ok')]
            print(' bad levels:', bad[:10])
        except Exception as e:
            print('parse fail:', e, res[:400])
        await ctx.close()

        # 真实页冒烟（新 context=干净 localStorage，首日 6 关+教学链）
        ctx2 = await b.new_context()
        pg2 = await ctx2.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        await pg2.goto(URL_R)
        await pg2.wait_for_timeout(2500)
        demo = None
        for _ in range(60):
            demo = await pg2.evaluate('window.__blDemoR || null')
            if demo:
                break
            await pg2.wait_for_timeout(500)
        tut = 'watch'
        for _ in range(40):
            tut = await pg2.evaluate('window.BL && BL.tutorial')
            if tut != 'watch':
                break
            await pg2.wait_for_timeout(500)
        r = await pg2.evaluate('BL.autoSolve()')
        lv = await pg2.evaluate('BL.currentLevel')
        stars = None
        for _ in range(30):                       # 写档在 winFlow celebrate 链异步落（≤15s）
            stars = await pg2.evaluate("(KIDS._save()||{levels:{}}).levels['1-0'] ? KIDS._save().levels['1-0'].stars : null")
            if stars is not None:
                break
            await pg2.wait_for_timeout(500)
        sv = await pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_babylove") || "{}")')
        print('REAL demo=%s tut=%s autoSolve=%s lv=%s stars=%s errs=%s saveKeys=%s v=%s levels=%s' %
              (demo, tut, r, lv, stars, errs2[:3], sorted(sv.keys()), sv.get('v'), len(sv.get('levels', {}))))
        await ctx2.close()

        # flat0-24 静态 25 关全 autoSolve（r10：每题 3 步/小问 → taps=15/关）
        # + 生成关 flat25-29 抽验（dch 随机 1-5，taps 恒 15）
        ctx3 = await b.new_context()
        pg3 = await ctx3.new_page()
        errs3 = []
        pg3.on('pageerror', lambda e: errs3.append(str(e)))
        await pg3.goto(URL_V)
        for _ in range(120):                      # 等 runVerify 收尾（title 落定）再切关，防互相干扰
            t3 = await pg3.evaluate('document.title')
            if 'VERIFY' in t3:
                break
            await pg3.wait_for_timeout(500)
        results = await pg3.evaluate('''(async () => {
          const out = [];
          for (let f = 0; f < 30; f++) {
            BL.start(f);
            const r = await BL.autoSolve();
            out.push({ f: f, done: r.done, taps: r.taps,
                       dch: (BL.currentLevel && BL.currentLevel.dch) || null });
          }
          return out;
        })()''')
        bad = [x for x in results if not x['done'] or x['taps'] != 15]
        print('FLAT0-29 autoSolve: %d/30 done, bad=%s errs=%s dchSeq=%s' %
              (sum(1 for x in results if x['done']), bad[:5], errs3[:3],
               [x['dch'] for x in results]))
        await ctx3.close()
        await b.close()
        # ---- 硬断言（r10 口径）：任一不满足 exit 1 ----
        ok = (title == 'VERIFY PASS 64/64' and not errs and j.get('pass') == 64
              and j.get('total') == 64 and j.get('layoutOk')
              and all(u.get('ok') for u in j.get('units', {}).values())
              and all(s.get('ok') for s in j.get('smokes', {}).values())
              and demo == 'step' and not errs2
              and r.get('done') and r.get('taps') == 15 and stars == 3
              and not bad and not errs3
              and [x['dch'] for x in results[:25]] ==
                  [1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5])
        print('SELFTEST', 'PASS' if ok else 'FAIL')
        if not ok:
            sys.exit(1)

asyncio.run(main())
