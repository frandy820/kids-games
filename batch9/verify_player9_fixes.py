# -*- coding: utf-8 -*-
"""batch9 试玩修复定向实证（T1-T4）
T1 wis 救援视觉：静置救援触发时正确动物 breathe 一次（静音也能看见）
T2 mirror 救援视觉：静置救援触发时正确贴纸 pulse 一次
T3 memgrid show 空窗轻叮：show 期点格 tapCell=false + audio.sfx('pop') 被调
T4 memgrid 救援重闪延长：救援触发后 1.0s 处 reflash 类仍在（旧 0.8s 已移除）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = lambda g: 'file:///' + os.path.join(BASE, g, 'index.html').replace('\\', '/')
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('K:' + k); return _p(k, t); };
  const _s = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _s(n); };
  return true;
})()"""

SEED_JS = """(n) => {
  const sv = KIDS._save();
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.__KEY__ = sv.__KEY__ || {}; sv.__KEY__.tutSeen = true;
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();
}"""

async def newpage(browser, game):
    ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL(game))
    await pg.wait_for_timeout(900)
    return ctx, pg, errs

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # T1 wis 救援视觉
        ctx, pg, errs = await newpage(b, 'whereistand')
        await pg.evaluate(SEED_JS.replace('__KEY__', 'wis'), 5)
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        ai = await pg.evaluate("WIS.quiz.answerIdx")
        br0 = await pg.evaluate("(i) => document.querySelector('.card[data-i=\"' + i + '\"]').classList.contains('breathe')", ai)
        await pg.wait_for_timeout(16500)
        v = await pg.evaluate('window.__vlog')
        br1 = await pg.evaluate("(i) => document.querySelector('.card[data-i=\"' + i + '\"]').classList.contains('breathe')", ai)
        rescue = [x for x in v if x.startswith('K:wis_q') or x.startswith('TTS:')]
        rec('T1 wis 救援视觉(题面+正确动物 breathe)', bool(rescue) and not br0 and br1 and not errs,
            'rescue=%s breathe %s->%s' % ([x[:14] for x in rescue[:1]], br0, br1))
        await ctx.close()

        # T2 mirror 救援视觉
        ctx, pg, errs = await newpage(b, 'mirror')
        await pg.evaluate(SEED_JS.replace('__KEY__', 'mir'), 5)
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        ai = await pg.evaluate("(() => { const q = MIR.quiz; const a = q.answer; return q.options.findIndex(o => o.mid === a.mid && o.color === a.color && o.mirrored === a.mirrored); })()")
        pu0 = await pg.evaluate("(i) => document.querySelectorAll('.opt')[i].classList.contains('pulse')", ai)
        await pg.wait_for_timeout(16500)
        v = await pg.evaluate('window.__vlog')
        pu1 = await pg.evaluate("(i) => document.querySelectorAll('.opt')[i].classList.contains('pulse')", ai)
        rescue = [x for x in v if x.startswith('K:mir_q') or x.startswith('TTS:')]
        rec('T2 mirror 救援视觉(题面+正确贴纸 pulse)', bool(rescue) and not pu0 and pu1 and not errs,
            'rescue=%s pulse %s->%s' % ([x[:14] for x in rescue[:1]], pu0, pu1))
        await ctx.close()

        # T3 memgrid show 空窗轻叮
        ctx, pg, errs = await newpage(b, 'memgrid')
        await pg.evaluate(SEED_JS.replace('__KEY__', 'memg'), 1)
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        ph = await pg.evaluate("MEMG.quiz && MEMG.quiz.phase")
        tapped = False
        for _ in range(16):
            if ph == 'show':
                c = await pg.evaluate("MEMG.quiz.cells[0]")
                r = await pg.evaluate("MEMG.tapCell(%d)" % c)
                tapped = r is False
                break
            await pg.wait_for_timeout(400)
            ph = await pg.evaluate("MEMG.quiz && MEMG.quiz.phase")
        await pg.wait_for_timeout(400)
        v = await pg.evaluate('window.__vlog')
        pops = [x for x in v if x == 'S:pop']
        rec('T3 memgrid show 期轻叮(tapCell=false+sfx pop)', tapped and len(pops) >= 1 and not errs,
            'tapped=%s pops=%d' % (tapped, len(pops)))
        await ctx.close()

        # T4 memgrid 救援重闪 0.8→1.2s：救援触发后 1.0s 处 reflash 仍在
        ctx, pg, errs = await newpage(b, 'memgrid')
        await pg.evaluate(SEED_JS.replace('__KEY__', 'memg'), 5)
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        for _ in range(12):
            ph = await pg.evaluate("MEMG.quiz && MEMG.quiz.phase")
            if ph == 'input': break
            await pg.wait_for_timeout(500)
        seen = False
        for _ in range(110):                       # 轮询至救援触发（200ms 步进）
            await pg.wait_for_timeout(200)
            v = await pg.evaluate('window.__vlog')
            if any(x.startswith('K:mg_q') for x in v): seen = True; break
        ref_at0 = await pg.evaluate("[...document.querySelectorAll('.cell')].filter(e => e.classList.contains('reflash')).length")
        await pg.wait_for_timeout(1000)            # 触发后 1.0s：旧 0.8s 已移除 / 新 1.2s 仍在
        ref_1s = await pg.evaluate("[...document.querySelectorAll('.cell')].filter(e => e.classList.contains('reflash')).length")
        rec('T4 memgrid 重闪延长(触发后1.0s仍亮)', seen and ref_at0 >= 1 and ref_1s >= 1 and not errs,
            'seen=%s reflash@0=%d @1.0s=%d' % (seen, ref_at0, ref_1s))
        await ctx.close()

        await b.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
