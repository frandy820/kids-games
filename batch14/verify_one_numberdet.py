# -*- coding: utf-8 -*-
"""batch14 numberdet 首单元独立复验（不信 agent 自报）
N1 verify title / N2 钩子契约 / N3 真实键盘 flat0 通关（big/small/got 三态=3 星）
N4 区间收紧对账 / N5 已排除数不计次 / N6 超次扣星 / N7 救援 14s / N8 教学 demoR
N9 双 viewport+离线+截图+clip≥17"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = 'numberdet'
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
    return """const sv = KIDS._save() || { levels: {} };
  sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%%5)] = { stars: 1 };
  sv.numberdet = { tutSeen: true };
  %s
  KIDS.store.persist();""" % (n, 'KIDS.calendar.bonusSet(10);' if n >= 10 else '')

async def key_in(pg, num):
    """真实键盘输入数字并确认"""
    for ch in str(num):
        await pg.locator('.key[data-d="%s"]' % ch).first.click(force=True)
        await pg.wait_for_timeout(140)
    await pg.locator('#ok-btn').click(force=True)
    await pg.wait_for_timeout(1300)   # 猜中演出窗 1050ms（agent 坑⑤）

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        url = 'file:///' + (BASE / GAME / 'index.html').as_posix()

        # N1 verify title
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
        rec('N1 verify title', 'VERIFY PASS' in title and not errs, 'title=%s errs=%s' % (title, errs[:1]))
        await ctx.close()

        # N2 钩子契约 flat0（ch1：lo=1 hi=20 secret∈域 base=5 guesses=0）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(0))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        q = await pg.evaluate('ND.quiz')
        hook_ok = q and q['kind'] == 'hunt' and q['lo'] == 1 and q['hi'] == 20 and \
            1 <= q['secret'] <= 20 and q['base'] == 5 and q['guesses'] == 0 and q['miss'] == 0
        rec('N2 钩子契约(ch1 1-20 base5 初态)', hook_ok and not errs,
            'lo=%s hi=%s secret=%s base=%s g=%s' % (q and q['lo'], q and q['hi'], q and q['secret'], q and q['base'], q and q['guesses']))
        await ctx.close()

        # N3+N4 真实键盘 flat0 通关（big/small 收紧对账+got 通关=3 星）
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
        tight_ok = True
        # 第一题：构造 big→small 两次收紧，再二分收尾
        q = await pg.evaluate('ND.quiz')
        sec = q['secret']
        gbig = sec + 3 if sec + 3 <= 20 else sec - 3   # 必在域内
        if gbig > sec:
            await key_in(pg, gbig)
            st = await pg.evaluate('ND.quiz')
            if st['hi'] != gbig - 1: tight_ok = False
            if not await pg.evaluate("window.__vlog.some(x => x === 'P:num_big')"): tight_ok = False
        gsmall = max(1, sec - 4)
        await key_in(pg, gsmall)
        st = await pg.evaluate('ND.quiz')
        if st['lo'] != gsmall + 1 or st['hi'] != (gbig - 1 if gbig > sec else sec + 3): tight_ok = False
        if not await pg.evaluate("window.__vlog.some(x => x === 'P:num_small')"): tight_ok = False
        # 二分收尾第一题 + autoSolve 余题
        r = await pg.evaluate('ND.autoSolve()')
        await pg.wait_for_timeout(3200)   # celebrate+写档
        got_play = await pg.evaluate("window.__vlog.some(x => x === 'P:num_got')")
        rec('N3 真实键盘通关+big/small反馈+got', tight_ok and r and r['done'] and got_play and not errs,
            'tight=%s done=%s got=%s errs=%s' % (tight_ok, r and r['done'], got_play, errs[:1]))
        await ctx.close()

        # N4 超次扣星：三次 big 浪费（15/14/13，secret=12 恒定）→ 首题 3+二分4=7 次 → 超 2 → 2 星
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(0))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        for g in (15, 14, 13):
            await key_in(pg, g)
        r4 = await pg.evaluate('ND.autoSolve()')
        await pg.wait_for_timeout(3200)
        stars4 = await pg.evaluate("(KIDS._save().levels['1-0'] || {}).stars || 0")
        g4 = (r4 or {}).get('per') or []
        rec('N4 超次扣星(浪费3次=2星)', r4 and r4['done'] and stars4 == 2, 'stars=%s per=%s' % (stars4, g4))
        await ctx.close()

        # N5 已排除数再猜不计次（num_gone+guesses 不变）
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
        q = await pg.evaluate('ND.quiz')
        sec = q['secret']
        gbig = sec + 2 if sec + 2 <= 20 else sec - 2
        await key_in(pg, gbig)          # 一次合法猜测（big 或 small）
        g0 = await pg.evaluate('ND.quiz.guesses')
        await pg.evaluate('window.__vlog = []')
        await key_in(pg, gbig)          # 已排除数再猜
        g1 = await pg.evaluate('ND.quiz.guesses')
        gone = await pg.evaluate("window.__vlog.some(x => x === 'P:num_gone')")
        rec('N5 已排除数不计次(gone 播报+guesses 不变)', g1 == g0 and gone and not errs,
            'g=%s→%s gone=%s' % (g0, g1, gone))
        await ctx.close()

        # N6 纯二分=3 星（autoSolve 无浪费）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(0))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        r = await pg.evaluate('ND.autoSolve()')
        await pg.wait_for_timeout(3200)
        stars = await pg.evaluate("(KIDS._save().levels['1-0'] || {}).stars || 0")
        per = (r or {}).get('per') or []
        rec('N6 纯二分通关=3星(每题≤base)', r and r['done'] and stars == 3 and all(x <= 5 for x in per),
            'stars=%s per=%s' % (stars, per))
        await ctx.close()

        # N7 救援 14s（num_hint+中点 pulse）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(0))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        await pg.evaluate('window.__vlog = []')
        rescue, at, src = False, -1, ''
        for i in range(24):
            await pg.wait_for_timeout(1000)
            v = await pg.evaluate('window.__vlog')
            hit = [x for x in v if x == 'P:num_hint']
            pu = await pg.evaluate("!!document.querySelector('.pulse, .breathe, .mid3')")
            if hit or pu:
                rescue, at, src = True, i + 1, ('hint' if hit else 'visual')
                break
        rec('N7 救援 14s 触发', rescue and 10 <= at <= 19, 'at=%ss src=%s' % (at, src))
        await ctx.close()

        # N8 教学 watch 吞输入+demoR（清档首访立即抓窗口）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        tut = None
        for _ in range(24):
            tut = await pg.evaluate('ND.tutorial')
            if tut == 'watch':
                break
            await pg.wait_for_timeout(200)
        st0 = await pg.evaluate('ND.quiz ? ND.quiz.guesses : -1')
        for _ in range(4):
            try:
                await pg.locator('.key[data-d="5"]').first.click(force=True, timeout=1500)
            except Exception:
                pass
            await pg.wait_for_timeout(250)
        st1 = await pg.evaluate('ND.quiz ? ND.quiz.guesses : -1')
        demoR = None
        for _ in range(60):
            demoR = await pg.evaluate('window.__ndDemoR')
            if demoR:
                break
            await pg.wait_for_timeout(250)
        rec('N8 教学 watch 吞输入+demoR=got', tut == 'watch' and st1 in (st0, -1) and demoR == 'got' and not errs,
            'tut=%s g=%s→%s demoR=%s errs=%s' % (tut, st0, st1, demoR, errs[:1]))
        await ctx.close()

        # N9 双 viewport+离线+截图+clip≥17
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
        key1 = await pg.evaluate("(() => { const e = [...document.querySelectorAll('.key')]; return e.length ? Math.min(...e.map(x => { const b = x.getBoundingClientRect(); return Math.min(b.width, b.height); })) : 999; })()")
        ok1 = await pg.evaluate("(() => { const b = document.getElementById('ok-btn').getBoundingClientRect(); return Math.min(b.width, b.height); })()")
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
        key2 = await pg2.evaluate("(() => { const e = [...document.querySelectorAll('.key')]; return e.length ? Math.min(...e.map(x => { const b = x.getBoundingClientRect(); return Math.min(b.width, b.height); })) : 999; })()")
        await vp2.close()
        html = (BASE / GAME / 'index.html').read_text(encoding='utf-8')
        offline = ('src="http' not in html) and ('href="http' not in html)
        nclip = html.count('data:audio')
        rec('N9 双viewport+离线+截图+clip≥17', ox1 == 0 and ox2 == 0 and key1 >= 64 and key2 >= 64 and
            ok1 >= 96 and offline and nclip >= 17 and sd1 > 2 and not errs,
            'ox=%d/%d key=%d/%d ok=%d offline=%s clip=%d sd=%.1f' % (ox1, ox2, key1, key2, ok1, offline, nclip, sd1))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
