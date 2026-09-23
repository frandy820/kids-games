# -*- coding: utf-8 -*-
"""batch34 首单元门禁（通用版）：verify selftest 复跑 + 真实页教学链/通关/写档 + clips 注入
用法: python gate_common34.py <game> <hook> [clips_n]
  game: hidecup|sentorder|datacollect  hook: HC|SO|DC
  clips_n: manifest games 计数（hidecup=14/sentorder=165/datacollect=16——含 core_* 3；
           sentorder r45 段二注册后 9→165=so 6+so_s 40+so_w 116+core 3，2026-09-22）"""
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
        b = await p.chromium.launch(args=['--mute-audio'])
        # G1 verify selftest 复跑（结果在 document.title）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_V)
        title = ''
        for _ in range(240):                       # 三 agent 并行期 selftest 可达 45s+（b32 坑⑥放宽）
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        rec('G1 verify selftest 复跑', 'VERIFY PASS' in title and not errs, 'title=%r errs=%s' % (title, errs[:1]))
        await ctx.close()

        # G2 真实页教学链+通关+写档（autoSolve 一口气走完首关——done 判定同口径）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_R)
        await pg.wait_for_timeout(2500)
        demo_var = {'HC': '__hcDemoR', 'SO': '__soDemoR', 'DC': '__dcDemoR'}[HOOK]
        demo_r = None
        for _ in range(60):
            demo_r = await pg.evaluate('window.%s || null' % demo_var)
            if demo_r:
                break
            await pg.wait_for_timeout(500)
        tut = 'watch'
        for _ in range(40):
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
        demo_ok = demo_r == {'HC': 'right', 'SO': 'done', 'DC': 'right'}[HOOK]   # 教学末步期望分款（sentorder 末词=done 整题完成——SPEC §2 定版）
        rec('G2 教学链+通关+写档', demo_ok and r.get('done') and stars == 3 and not errs,
            'demoR=%s tut=%s auto=%s stars=%s errs=%s' % (demo_r, tut, r, stars, errs[:1]))
        await ctx.close()

        # G3 clips 注入（manifest games 全集+计数对账 hc=14/so=165(r45 段二)/dc=16）
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
