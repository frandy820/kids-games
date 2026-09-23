# -*- coding: utf-8 -*-
"""batch14 blocks 首单元独立复验（不信 agent 自报）
B1 verify title / B2 钩子契约+count 域 / B3 真实点击 flat0 通关（首错=2 星）
B4 数域抽验（fill 缺块/front/top） / B5 投影与缺块独立复算 / B6 sayW ===2
B7 救援 14s / B8 教学 demoR / B9 双 viewport+离线+截图+clip≥23"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = 'blocks'
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : (p.key || 'null')).join('|')); return _q(parts); };
  const _a = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _a(n); };
  return true;
})()"""

def seed(n):
    """种 n 关（=起始 flat n；stars=1 防写档 max 保星挡断言）"""
    return """const sv = KIDS._save() || { levels: {} };
  sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%%5)] = { stars: 1 };
  sv.blocks = { tutSeen: true };
  %s
  KIDS.store.persist();""" % (n, 'KIDS.calendar.bonusSet(10);' if n >= 10 else '')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        url = 'file:///' + (BASE / GAME / 'index.html').as_posix()

        # B1 verify title
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url + '?verify=1')
        title = ''
        for _ in range(30):
            await pg.wait_for_timeout(1000)
            title = await pg.title()
            if 'VERIFY' in title:
                break
        rec('B1 verify title', 'VERIFY PASS' in title and not errs, 'title=%s errs=%s' % (title, errs[:1]))
        await ctx.close()

        # B2 钩子契约 flat0（count：总块=Σh 6-12、答案卡含 Σh、干扰互异禁0）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(0))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        q = await pg.evaluate('BK.quiz')
        total = await pg.evaluate('BK.quiz.cols.reduce((s,r)=>s+r.reduce((a,b)=>a+b,0),0)')
        opt_ok = q and q['kind'] == 'count' and len(q['options']) == 3 and \
            all(isinstance(v, (int, float)) for v in q['options']) and \
            q['options'][q['answerIdx']] == total and \
            len(set(q['options'])) == 3 and all(v > 0 for v in q['options']) and \
            6 <= total <= 12
        rec('B2 钩子契约(count 总块=答案 域6-12 干扰互异禁0)', opt_ok and not errs,
            'kind=%s total=%s opts=%s ans=%s' % (q and q['kind'], total, q and q['options'], q and q['answerIdx']))
        await ctx.close()

        # B3 真实点击 flat0 通关（首错一次=2 星；空档起始 flat0）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(0))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        ok3 = True
        for s in range(5):
            q = await pg.evaluate('BK.quiz')
            if not q:
                ok3 = False
                break
            if s == 0:
                wi = [i for i in range(3) if i != q['answerIdx']][0]
                await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
                await pg.wait_for_timeout(900)
                if await pg.evaluate('BK.quiz.miss') != 1:
                    ok3 = False
            got = None
            for _ in range(3):
                try:
                    await pg.locator('.opt[data-i="%d"]' % q['answerIdx']).first.click(force=True, timeout=3000)
                    got = True
                    break
                except Exception:
                    await pg.wait_for_timeout(600)
            if not got:
                ok3 = False
                break
            await pg.wait_for_timeout(1600)
        lvA = await pg.evaluate('BK.currentLevel')
        await pg.wait_for_timeout(3200)   # celebrate 2.3s+320ms 后写档
        stars = await pg.evaluate("(KIDS._save().levels['1-0'] || {}).stars || 0")
        rec('B3 真实点击 flat0 通关(首错=2星)', ok3 and lvA and lvA['done'] and stars == 2 and not errs,
            'stars=%s done=%s errs=%s' % (stars, lvA and lvA['done'], errs[:1]))
        await ctx.close()

        # B4+B5 数域抽验+独立复算（flat5 fill / flat10 front / flat15 top）
        for flat, kind in ((5, 'fill'), (10, 'front'), (15, 'top')):
            ctx = await b.new_context()
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(url)
            await pg.wait_for_timeout(1200)
            await pg.evaluate(seed(flat))
            await pg.reload()
            await pg.wait_for_timeout(2200)
            # 跳过首题热身（ch2/3/4 首题=count 型），验第二题起的本章题型
            k0 = await pg.evaluate('BK.quiz.kind')
            if k0 != kind:
                q0 = await pg.evaluate('BK.quiz')
                await pg.locator('.opt[data-i="%d"]' % q0['answerIdx']).first.click(force=True)
                await pg.wait_for_timeout(1600)
            q = await pg.evaluate('BK.quiz')
            calc = await pg.evaluate("""(() => {
              const q = BK.quiz;
              if (!q) return null;
              if (q.kind === 'fill') {
                const need = q.goal.reduce((s,r)=>s+r.reduce((a,b)=>a+b,0),0) -
                             q.cols.reduce((s,r)=>s+r.reduce((a,b)=>a+b,0),0);
                return { need: need, opt: q.options[q.answerIdx] };
              }
              if (q.kind === 'front') {
                const f = q.cols[0].map((_, c) => Math.max(...q.cols.map(r => r[c])));
                return { calc: f, opt: q.options[q.answerIdx] };
              }
              const t = q.cols.map(r => r.map(h => h > 0 ? 1 : 0));
              return { calc: t, opt: q.options[q.answerIdx] };
            })()""")
            import json as _j
            if kind == 'fill':
                ok = calc and q['kind'] == 'fill' and calc['opt'] == calc['need'] and 2 <= calc['need'] <= 6 and \
                    all(abs(v - calc['need']) <= 2 and v != calc['need'] and v > 0
                        for i, v in enumerate(q['options']) if i != q['answerIdx'])
                det = 'need=%s opts=%s' % (calc and calc['need'], q and q['options'])
            else:
                ok = calc and q['kind'] == kind and _j.dumps(calc['calc']) == _j.dumps(calc['opt']) and len(q['options']) == 3
                det = 'calc=%s opts#%s' % (calc and _j.dumps(calc['calc'])[:36], q and q['answerIdx'])
            rec('B45 flat%d %s 独立复算(答案=投影/缺块)' % (flat, kind), ok and not errs, det)
            await ctx.close()

        # B6 sayW ===2（flat0 一错不播二错播）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(0))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        q = await pg.evaluate('BK.quiz')
        wi = [i for i in range(3) if i != q['answerIdx']][0]
        await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
        await pg.wait_for_timeout(1000)
        w1 = await pg.evaluate("window.__vlog.filter(x => x === 'P:blo_wrong').length")
        await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
        await pg.wait_for_timeout(1000)
        w2 = await pg.evaluate("window.__vlog.filter(x => x === 'P:blo_wrong').length")
        rec('B6 sayW 不灰化===2(两错两条)', w1 == 1 and w2 == 2, 'w1=%s w2=%s' % (w1, w2))
        await ctx.close()

        # B7 救援 14s（blo_hint 播报或正确卡 breathe；首错 miss=1 无视觉）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(0))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        q = await pg.evaluate('BK.quiz')
        wi = [i for i in range(3) if i != q['answerIdx']][0]
        await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
        await pg.evaluate('window.__vlog = []')
        rescue, at, src = False, -1, ''
        for i in range(24):
            await pg.wait_for_timeout(1000)
            v = await pg.evaluate('window.__vlog')
            hit = [x for x in v if x == 'P:blo_hint']
            br = await pg.evaluate("!!document.querySelector('.opt.breathe')")
            if hit or br:
                rescue, at, src = True, i + 1, ('hint' if hit else 'breathe')
                break
        rec('B7 救援 14s 触发(错点不重置钟)', rescue and 8 <= at <= 19, 'at=%ss src=%s' % (at, src))
        await ctx.close()

        # B8 教学 watch 吞输入+demoR（清档首访立即抓窗口）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        tut = None
        for _ in range(24):
            tut = await pg.evaluate('BK.tutorial')
            if tut == 'watch':
                break
            await pg.wait_for_timeout(200)
        st0 = await pg.evaluate('BK.quiz ? BK.quiz.miss : -1')
        for _ in range(3):
            try:
                await pg.locator('.opt').first.click(force=True, timeout=1500)
            except Exception:
                pass
            await pg.wait_for_timeout(300)
        st1 = await pg.evaluate('BK.quiz ? BK.quiz.miss : -1')
        demoR = None
        for _ in range(40):
            demoR = await pg.evaluate('window.__bkDemoR')
            if demoR:
                break
            await pg.wait_for_timeout(250)
        rec('B8 教学 watch 吞输入+demoR=right', tut == 'watch' and st1 in (st0, -1) and demoR == 'right' and not errs,
            'tut=%s m=%s→%s demoR=%s errs=%s' % (tut, st0, st1, demoR, errs[:1]))
        await ctx.close()

        # B9 双 viewport+离线+截图+clip≥23
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(0))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        ox1 = await pg.evaluate("Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, 0)")
        opt1 = await pg.evaluate("(() => { const e = [...document.querySelectorAll('.opt')]; return e.length ? Math.min(...e.map(x => { const b = x.getBoundingClientRect(); return Math.min(b.width, b.height); })) : 999; })()")
        btn1 = await pg.evaluate("(() => { let m = 999; document.querySelectorAll('button').forEach(b => { if (b.classList.contains('k-parentbtn')) return; const r = b.getBoundingClientRect(); if (r.width > 4 && r.height > 4) m = Math.min(m, r.width, r.height); }); return m; })()")
        shot1 = await pg.screenshot()
        import statistics as st_
        sd1 = st_.pstdev(shot1[500:50000:97])
        vp2 = await b.new_context(viewport={'width': 800, 'height': 1180})
        pg2 = await vp2.new_page()
        await pg2.goto(url)
        await pg2.wait_for_timeout(1200)
        await pg2.evaluate(seed(0))
        await pg2.reload()
        await pg2.wait_for_timeout(2400)
        ox2 = await pg2.evaluate("Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, 0)")
        opt2 = await pg2.evaluate("(() => { const e = [...document.querySelectorAll('.opt')]; return e.length ? Math.min(...e.map(x => { const b = x.getBoundingClientRect(); return Math.min(b.width, b.height); })) : 999; })()")
        await vp2.close()
        html = (BASE / GAME / 'index.html').read_text(encoding='utf-8')
        offline = ('src="http' not in html) and ('href="http' not in html)
        nclip = html.count('data:audio')
        rec('B9 双viewport+离线+截图+clip≥23', ox1 == 0 and ox2 == 0 and opt1 >= 96 and opt2 >= 96 and
            btn1 >= 64 and offline and nclip >= 23 and sd1 > 2 and not errs,
            'ox=%d/%d opt=%d/%d btn=%d offline=%s clip=%d sd=%.1f' % (ox1, ox2, opt1, opt2, btn1, offline, nclip, sd1))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
