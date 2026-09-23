# -*- coding: utf-8 -*-
"""batch12 复验 · divide 除法分糖（divide 专属——2026-09-16 r15 拆分：
column 竖式小黑板 r15 改造（8 题/关+计划驱动标记操作步）后本脚本 column 段全失配，
已拆出独立 verify_one_column.py；首单元 fraction 已 16/16 过闸）
①verify ②钩子 ③真实通关 flat0+flat10 ④错点零惩罚(不灰化:可重点+首错不 pulse)
⑤sayW 三态 ⑥救援+错点不重置 ⑦教学吞输入+重玩门 ⑧双viewport ⑨离线+截图+语音"""
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
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k + '#' + String(t || '').slice(0, 4)); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : (p.key || '')).join(',')); return _q(parts); };
  const _sy = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 6)); return _sy(t); };
  const _s = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _s(n); };
  return true;
})()"""

SEED = """const sv = KIDS._save();
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.GAME = { tutSeen: true };
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();"""

async def newpage(b, game, n, vp={'width': 1280, 'height': 800}, verify=False, delay=900):
    ctx = await b.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + (BASE / game / 'index.html').as_posix() + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(delay)
    if n is not None:
        await pg.evaluate('(n) => {%s}' % SEED.replace('GAME', game), n)
        await pg.reload()
        await pg.wait_for_timeout(delay)
    return ctx, pg, errs

async def drive_divide(pg, extra=None):
    """真实点击通关：deal 期点糖 / ask 期点答案卡；返回 clicks"""
    clicks = 0
    carry_seen = False
    for _ in range(400):
        q = await pg.evaluate('DV.quiz')
        if not q: break
        if q['phase'] == 'deal':
            try:
                await pg.locator('.candy[data-i]:not(.gone)').first.click(timeout=3000, force=True)
                clicks += 1
            except Exception:
                break
        else:
            done = False
            for attempt in range(3):  # .opt 入场动画尾段可能在视口外，等动画完成重试
                try:
                    await pg.locator('.opt[data-i="%d"]' % q['answerIdx']).first.click(timeout=4000, force=True)
                    clicks += 1; done = True; break
                except Exception:
                    await pg.wait_for_timeout(600)
            if not done: break
        await pg.wait_for_timeout(750)
        if extra == 'carry' and await pg.evaluate("!!document.querySelector('#carry.show')"):
            carry_seen = True
    return clicks, carry_seen

async def drive_column(pg, extra=None):
    """[r15 已拆出 verify_one_column.py，此函数退役留空]"""
    raise NotImplementedError('column 段已拆出 verify_one_column.py（2026-09-16 r15）')

async def suite_divide(b):
    G = 'divide'
    # ① verify
    ctx, pg, errs = await newpage(b, G, None, verify=True)
    title = ''
    for _ in range(20):
        title = await pg.title()
        if 'VERIFY' in title: break
        await pg.wait_for_timeout(1000)
    rec('D1 verify title', 'VERIFY PASS 48/48' in title and 'FAIL' not in title, title + ' errs=%s' % errs[:1])
    await ctx.close()
    # ②③ 通关 flat0/flat10
    for n, tag in ((0, 'ch1'), (10, 'ch3')):
        ctx, pg, errs = await newpage(b, G, n, delay=1500)
        if n == 0:
            hk = await pg.evaluate("(() => ({ has: !!window.DV, tapC: typeof DV.tapCandy, tapA: typeof DV.tapAnswer }))()")
            rec('D2 钩子 DV 齐', hk['has'] and hk['tapC'] == 'function' and hk['tapA'] == 'function', str(hk))
        clicks, _ = await drive_divide(pg)
        await pg.wait_for_timeout(5300)
        stars = await pg.evaluate("(KIDS._save().levels['%d-0'] || {}).stars || 0" % (n // 5 + 1))
        rec('D3 真实通关 flat%d(%s)' % (n, tag), stars >= 1 and not errs, 'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
        await ctx.close()
    # ④ 错点零惩罚 + ⑤ sayW 三态（flat5：ask 期两错）
    ctx, pg, errs = await newpage(b, G, 5, delay=3200)
    await pg.evaluate(HOOK)
    await pg.evaluate("""(() => {  /* 推进到首个 ask 期 */
      return true;
    })()""")
    # 快速分完糖进 ask
    for _ in range(40):
        q = await pg.evaluate('DV.quiz')
        if not q or q['phase'] != 'deal': break
        try:
            await pg.locator('.candy[data-i]:not(.gone)').first.click(timeout=3000, force=True)
        except Exception:
            break
        await pg.wait_for_timeout(700)
    await pg.evaluate('window.__vlog = []')
    q = await pg.evaluate('DV.quiz')
    ws = [i for i in range(len(q['options'])) if i != q['answerIdx']]
    await pg.locator('.opt[data-i="%d"]' % ws[0]).first.click(force=True)
    await pg.wait_for_timeout(800)
    st1 = await pg.evaluate("(() => { const x = DV.quiz; return { miss: x.miss, step: x.step, pu: !!document.querySelector('.opt.pulse, .opt.breathe') }; })()")
    v1 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:null#再') || x.startsWith('P:div_')).length")
    await pg.locator('.opt[data-i="%d"]' % ws[1]).first.click(force=True)
    await pg.wait_for_timeout(800)
    st2 = await pg.evaluate("(() => { const x = DV.quiz; return { miss: x.miss, pu: !!document.querySelector('.opt.pulse, .opt.breathe') }; })()")
    v2 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:null#再') || x.startsWith('P:div_')).length")
    # 可重点：错后点对推进
    q3 = await pg.evaluate('DV.quiz')
    await pg.locator('.opt[data-i="%d"]' % q3['answerIdx']).first.click(force=True)
    await pg.wait_for_timeout(1000)
    st3 = await pg.evaluate("(() => { const x = DV.quiz; return x ? x.step : -1; })()")
    rec('D4 错点零惩罚(两错可重点推进)', st1['miss'] == 1 and st2['miss'] == 2 and st3 > st2.get('step', st1['step']), 'st1=%s st2=%s step->%s' % (st1, st2, st3))
    rec('D5 sayW flat5 两错两条(节流)', v1 >= 1 and v2 >= v1, 'v1=%d v2=%d' % (v1, v2))
    await ctx.close()
    # ⑥ 救援：ask 期静置 → 重读+正确卡 breathe；错点不重置
    ctx, pg, errs = await newpage(b, G, 5, delay=3200)
    await pg.evaluate(HOOK)
    for _ in range(40):
        q = await pg.evaluate('DV.quiz')
        if not q or q['phase'] != 'deal': break
        try:
            await pg.locator('.candy[data-i]:not(.gone)').first.click(timeout=3000, force=True)
        except Exception:
            break
        await pg.wait_for_timeout(700)
    await pg.evaluate('window.__vlog = []')
    vis, resc = False, []
    for _ in range(24):
        vis = await pg.evaluate("!!document.querySelector('.opt.breathe, .opt.pulse, .candy.breathe')")
        v = await pg.evaluate('window.__vlog')
        resc = [x for x in v if x.startswith('Q:') or x.startswith('P:div_') or x.startswith('T:')]
        if vis and resc: break
        await pg.wait_for_timeout(1000)
    rec('D6 救援(重读+视觉线索)', bool(resc) and vis and not errs, 'rescue=%s vis=%s' % ([x[:12] for x in resc[:1]], vis))
    await pg.evaluate('window.__vlog = []')
    q = await pg.evaluate('DV.quiz')
    if q:
        ws = [i for i in range(len(q['options'])) if i != q['answerIdx']]
        if ws:
            await pg.locator('.opt[data-i="%d"]' % ws[0]).first.click(force=True)
    resc2 = []
    for _ in range(20):
        await pg.wait_for_timeout(1000)
        v = await pg.evaluate('window.__vlog')
        resc2 = [x for x in v if x.startswith('Q:') or x.startswith('P:div_') or x.startswith('T:')]
        if resc2: break
    rec('D6b 错点不重置救援', bool(resc2), 'post=%s' % [x[:12] for x in resc2[:1]])
    await ctx.close()
    # ⑦ 教学吞输入+重玩门
    ctx, pg, errs = await newpage(b, G, None)
    await pg.evaluate(HOOK)
    tut = await pg.evaluate('DV.tutorial')
    pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
    try:
        await pg.locator('.candy[data-i]:not(.gone)').first.click(timeout=3000, force=True)
    except Exception:
        pass
    await pg.wait_for_timeout(600)
    pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
    sw = await pg.evaluate("DV.tapCandy(0)")
    rec('D7 教学期点击被吞+轻叮', tut == 'watch' and pops1 > pops0 and sw is False, 'tut=%s pops+%d tapCandy=%s' % (tut, pops1 - pops0, sw))
    await pg.locator('#btn-replay').dispatch_event('pointerdown')
    seen = False
    for _ in range(18):
        await pg.wait_for_timeout(1000)
        seen = await pg.evaluate("!!(KIDS._save().divide && KIDS._save().divide.tutSeen)")
        if seen: break
    rec('D7b 教学窗重玩门', seen and not errs, 'seen=%s errs=%s' % (seen, errs[:1]))
    await ctx.close()
    # ⑧⑨
    for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
        ctx, pg, errs = await newpage(b, G, 5, vp=vp)
        ox = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        small = await pg.evaluate("[...document.querySelectorAll('button, .candy, .opt, .key')].filter(e => !e.closest('.k-panel') && !e.classList.contains('k-parentbtn')).map(e => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)).filter(v => v < 64).length")
        rec('D8 viewport %dx%d' % (vp['width'], vp['height']), ox == 0 and small == 0 and not errs, 'ox=%s small=%s' % (ox, small))
        await ctx.close()
    ctx, pg, errs = await newpage(b, G, 5)
    src = await pg.evaluate("document.documentElement.outerHTML")
    rec('D9a 离线断言', 'http://' not in src.replace('http://www.w3.org', '') and 'https://' not in src, '')
    import statistics
    from PIL import Image
    shot = await pg.screenshot()
    img = Image.open(io.BytesIO(shot)).convert('L')
    sd = statistics.pstdev(list(img.resize((160, 100)).getdata()))
    rec('D9b 截图非空白', sd > 5, 'stdev=%.1f' % sd)
    await ctx.close()
    html = (BASE / G / 'index.html').read_text(encoding='utf-8')
    rec('D9c 语音注入对账(19div+3core)', html.count('data:audio') >= 22, 'audio=%d' % html.count('data:audio'))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await suite_divide(b)
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
