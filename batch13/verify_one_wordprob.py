# -*- coding: utf-8 -*-
"""batch13 首单元门禁 · wordprob 应用题剧场独立复验（不信 agent 自报，读实际产物）
r13 两步应用题版：①verify title ②钩子 WP 齐 ③真实点击通关 flat0+flat10 ④错点零惩罚(不灰化可重点+首错不pulse)
⑤sayW 三态 ⑥救援+错点不重置 ⑦教学吞输入+重玩门 ⑧双 viewport ⑨离线+截图+语音对账(80=3core+4通用+35数词+38tpl2段)"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : 'K:' + p.key).join(',')); return _q(parts); };
  const _s = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 6)); return _s(t); };
  const _a = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _a(n); };
  return true;
})()"""

SEED = """const sv = KIDS._save() || { levels: {} };
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.wordprob = { tutSeen: true };
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();"""

async def newpage(b, n, vp={'width': 1280, 'height': 800}, verify=False, delay=900):
    ctx = await b.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + (BASE / 'wordprob' / 'index.html').as_posix() + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(delay)
    if n is not None:
        await pg.evaluate('(n) => {%s}' % SEED, n)
        await pg.reload()
        await pg.wait_for_timeout(delay)
    return ctx, pg, errs

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ① verify title
        ctx, pg, errs = await newpage(b, None, verify=True)
        title = ''
        for _ in range(25):
            title = await pg.title()
            if 'VERIFY' in title: break
            await pg.wait_for_timeout(1000)
        rec('W1 verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title + ' errs=%s' % errs[:1])
        nclips = await pg.evaluate('Object.keys(KIDS.voice.clips).length')
        rec('W1b clips 注入(80=3core+4通用+35数词+38tpl2段,r13)', nclips == 80, 'clips=%d' % nclips)
        await ctx.close()

        # ②③ 通关 flat0/flat10（r13：ch1 两步加减 / ch3 多余条件）
        for n, tag in ((0, 'ch1两步加减'), (10, 'ch3多余条件')):
            ctx, pg, errs = await newpage(b, n, delay=1200)
            if n == 0:
                hk = await pg.evaluate("(() => ({ has: !!window.WP, tap: typeof WP.tapAnswer, auto: typeof WP.autoSolve }))()")
                rec('W2 钩子 WP 齐', hk['has'] and hk['tap'] == 'function' and hk['auto'] == 'function', str(hk))
            clicks = 0
            for _ in range(40):
                q = await pg.evaluate('WP.quiz')
                if not q: break
                await pg.locator('.opt[data-i="%d"]' % q['answerIdx']).first.click(force=True)
                clicks += 1
                await pg.wait_for_timeout(700)
            await pg.wait_for_timeout(5300)
            stars = await pg.evaluate("(KIDS._save().levels['%d-0'] || {}).stars || 0" % (n // 5 + 1))
            rec('W3 真实通关 flat%d(%s)' % (n, tag), stars >= 1 and not errs, 'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
            await ctx.close()

        # ④⑤ 错点零惩罚 + sayW（flat5：两错→重点对推进）
        ctx, pg, errs = await newpage(b, 5, delay=2600)
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(1000)
        await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate('WP.quiz')
        ws = [i for i in range(len(q['options'])) if i != q['answerIdx']]
        await pg.locator('.opt[data-i="%d"]' % ws[0]).first.click(force=True)
        await pg.wait_for_timeout(800)
        st1 = await pg.evaluate("(() => { const x = WP.quiz; return { miss: x.miss, dim: !!document.querySelector('.opt.dim'), pu: !!document.querySelector('.opt.pulse, .opt.breathe') }; })()")
        v1 = await pg.evaluate("window.__vlog.filter(x => x === 'P:wor_wrong' || x === 'P:wor_hint').length")
        await pg.locator('.opt[data-i="%d"]' % ws[1]).first.click(force=True)
        await pg.wait_for_timeout(800)
        st2 = await pg.evaluate("(() => { const x = WP.quiz; return { miss: x.miss, pu: !!document.querySelector('.opt.pulse, .opt.breathe') }; })()")
        v2 = await pg.evaluate("window.__vlog.filter(x => x === 'P:wor_wrong' || x === 'P:wor_hint').length")
        q3 = await pg.evaluate('WP.quiz')
        await pg.locator('.opt[data-i="%d"]' % q3['answerIdx']).first.click(force=True)
        await pg.wait_for_timeout(900)
        st3 = await pg.evaluate("(() => { const x = WP.quiz; return x ? x.step : -1; })()")
        rec('W4 错点零惩罚(两错可重点推进)', st1['miss'] == 1 and st2['miss'] == 2 and st3 > 0, 'st1=%s st2=%s step->%s' % (st1, st2, st3))
        rec('W5 sayW 两错两条(或节流+豁免)', v1 >= 1 and v2 >= v1, 'v1=%d v2=%d' % (v1, v2))
        await ctx.close()

        # ⑥ 救援：静置→重读+正确卡 breathe；错点不重置
        ctx, pg, errs = await newpage(b, 5, delay=2600)
        await pg.evaluate(HOOK)
        await pg.evaluate('window.__vlog = []')
        vis, resc = False, []
        for _ in range(24):
            vis = await pg.evaluate("!!document.querySelector('.opt.breathe, .opt.pulse')")
            v = await pg.evaluate('window.__vlog')
            resc = [x for x in v if 'wor_tpl_' in x or 'wor_tpl2_' in x or x.startswith('P:wor_')]
            if vis and resc: break
            await pg.wait_for_timeout(1000)
        rec('W6 救援(重读题面+视觉线索)', bool(resc) and vis and not errs, 'rescue=%s vis=%s' % (resc[:1][:40], vis))
        await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate('WP.quiz')
        w = [i for i in range(len(q['options'])) if i != q['answerIdx']][0]
        await pg.locator('.opt[data-i="%d"]' % w).first.click(force=True)
        resc2 = []
        for _ in range(20):
            await pg.wait_for_timeout(1000)
            v = await pg.evaluate('window.__vlog')
            resc2 = [x for x in v if 'wor_tpl_' in x or x.startswith('P:wor_')]
            if resc2: break
        rec('W6b 错点不重置救援', bool(resc2), 'post=%s' % resc2[:1][:40])
        await ctx.close()

        # ⑦ 教学吞输入 + 重玩门
        ctx, pg, errs = await newpage(b, None)
        await pg.evaluate(HOOK)
        tut = await pg.evaluate('WP.tutorial')
        pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        st0 = await pg.evaluate('WP.quiz ? WP.quiz.step : -1')
        await pg.locator('.opt').first.click(force=True)
        await pg.wait_for_timeout(600)
        pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        st1 = await pg.evaluate('WP.quiz ? WP.quiz.step : -1')
        rec('W7 教学期点击被吞+轻叮', tut == 'watch' and pops1 > pops0, 'tut=%s pops+%d' % (tut, pops1 - pops0))
        await pg.locator('#btn-replay').dispatch_event('pointerdown')
        seen = False
        for _ in range(18):
            await pg.wait_for_timeout(1000)
            seen = await pg.evaluate("!!(KIDS._save().wordprob && KIDS._save().wordprob.tutSeen)")
            if seen: break
        rec('W7b 教学窗重玩门', seen and not errs, 'seen=%s errs=%s' % (seen, errs[:1]))
        await ctx.close()

        # ⑧ 双 viewport
        for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
            ctx, pg, errs = await newpage(b, 5, vp=vp)
            ox = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            small = await pg.evaluate("[...document.querySelectorAll('button, .opt')].filter(e => !e.closest('.k-panel') && !e.classList.contains('k-parentbtn')).map(e => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)).filter(v => v < 64).length")
            rec('W8 viewport %dx%d' % (vp['width'], vp['height']), ox == 0 and small == 0 and not errs, 'ox=%s small=%s' % (ox, small))
            await ctx.close()

        # ⑨ 离线+截图+clips
        ctx, pg, errs = await newpage(b, 5)
        src = await pg.evaluate("document.documentElement.outerHTML")
        rec('W9a 离线断言', 'http://' not in src.replace('http://www.w3.org', '') and 'https://' not in src, '')
        import statistics
        from PIL import Image
        shot = await pg.screenshot()
        img = Image.open(io.BytesIO(shot)).convert('L')
        sd = statistics.pstdev(list(img.resize((160, 100)).getdata()))
        rec('W9b 截图非空白', sd > 5, 'stdev=%.1f' % sd)
        await ctx.close()
        html = (BASE / 'wordprob' / 'index.html').read_text(encoding='utf-8')
        n_aud = html.count('"data:audio/mpeg;base64,')   # 真 clip 仅 base64 注入（verify stub 字面量不计）
        rec('W9c 语音注入对账(80 data:audio,r13)', n_aud == 80, 'audio=%d' % n_aud)

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
