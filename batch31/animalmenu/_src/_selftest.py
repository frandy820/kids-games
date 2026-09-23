# -*- coding: utf-8 -*-
"""animalmenu r11 verify 页复跑（独立 headless chromium.launch，禁 connect/禁杀浏览器；
双 viewport 1280x800/800x1180 各跑一轮）+ 离线扫描 + 真实页冒烟（0 pageerror + 教学链 +
autoSolve + 写档）+ flat0-39 全 autoSolve（静态 20+生成 20）。
用法: python batch31/animalmenu/_src/_selftest.py"""
import asyncio, io, json, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent.parent
URL_V = 'file:///' + (BASE / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / 'index.html').as_posix()

async def verify_round(b, w, h):
    ctx = await b.new_context(viewport={'width': w, 'height': h})
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
    res = await pg.evaluate('document.getElementById("verify-result").textContent')
    ok = title.startswith('VERIFY PASS') and not errs
    print('VERIFY %dx%d: %s pageerrors=%d' % (w, h, title, len(errs)))
    if errs:
        print('  PAGEERRORS:', errs[:3])
    try:
        j = json.loads(res)
        if j.get('pass') != j.get('total'):
            for k, v in list(j.get('units', {}).items()) + list(j.get('smokes', {}).items()):
                if not v.get('ok'):
                    print('  FAIL-UNIT %s: %s' % (k, {x: v[x] for x in v if x != 'ok' and not isinstance(v[x], (dict, list))}))
        return ok and j.get('pass') == j.get('total')
    except Exception as e:
        print('  parse fail:', e, res[:200])
        return False
    finally:
        await ctx.close()

async def main():
    # 离线扫描：除 SVG xmlns 命名空间外无任何外链（build 同口径双保险）
    html = (BASE / 'index.html').read_text(encoding='utf-8')
    stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
    bads = [b for b in ('http://', 'https://', '<link', ' src=', ' href=') if b in stripped]
    print('OFFLINE scan:', 'OK' if not bads else 'FAIL %s' % bads)
    assert not bads, '发现外部引用: %s' % bads

    async with async_playwright() as p:
        b = await p.chromium.launch()
        # verify 页双 viewport
        ok1 = await verify_round(b, 1280, 800)
        ok2 = await verify_round(b, 800, 1180)

        # 真实页冒烟（新 context=干净 localStorage，教学链+autoSolve+写档）
        ctx2 = await b.new_context(viewport={'width': 1280, 'height': 800})
        pg2 = await ctx2.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        await pg2.goto(URL_R)
        await pg2.wait_for_timeout(2500)
        demo = None
        for _ in range(60):
            demo = await pg2.evaluate('window.__anDemoR || null')
            if demo:
                break
            await pg2.wait_for_timeout(500)
        tut = 'watch'
        for _ in range(40):
            tut = await pg2.evaluate('window.AN && AN.tutorial')
            if tut != 'watch':
                break
            await pg2.wait_for_timeout(500)
        r = await pg2.evaluate('AN.autoSolve()')
        lv = await pg2.evaluate('AN.currentLevel')
        stars = None
        for _ in range(30):                       # 写档在 winFlow celebrate 链异步落（≤15s）
            stars = await pg2.evaluate("(KIDS._save()||{levels:{}}).levels['1-0'] ? KIDS._save().levels['1-0'].stars : null")
            if stars is not None:
                break
            await pg2.wait_for_timeout(500)
        sv = await pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_animalmenu") || "{}")')
        print('REAL demo=%s tut=%s autoSolve=%s lv=%s stars=%s errs=%s saveKeys=%s v=%s levels=%s' %
              (demo, tut, r, lv, stars, errs2[:3], sorted(sv.keys()), sv.get('v'), len(sv.get('levels', {}))))
        await ctx2.close()

        # flat0-39 全 autoSolve 通关（verify 页跑：无 winFlow/proceed 定时器竞态，UI 判定链全真）
        ctx3 = await b.new_context(viewport={'width': 1280, 'height': 800})
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
          for (let f = 0; f < 40; f++) {
            AN.start(f);
            const r = await AN.autoSolve();
            out.push({ f: f, done: r.done, taps: r.taps,
                       dch: (AN.currentLevel && AN.currentLevel.dch) || null });
          }
          return out;
        })()''')
        bad = [x for x in results if not x['done'] or x['taps'] != 5]
        print('FLAT0-39 autoSolve: %d/40 done, bad=%s errs=%s dchSeq=%s' %
              (sum(1 for x in results if x['done']), bad[:5], errs3[:3],
               [x['dch'] for x in results]))
        await ctx3.close()
        await b.close()
        all_ok = ok1 and ok2 and not errs2 and not errs3 and not bad and \
                 demo == 'right' and r.get('done') and stars == 3
        print('SELFTEST', 'PASS' if all_ok else 'FAIL')

asyncio.run(main())
