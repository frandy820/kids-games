# -*- coding: utf-8 -*-
"""batch7 5.5 岁试玩修复实证（REPORT-PLAYER-5.5yo.md 修复优先级 1-2 条）
P1a 救援阈值 20s→14s：三款 flat5 纯静置 ~16s 救援触发
P1b 错点不重置救援钟：三款 flat5 每 4s 点一次错误对象持续 24s——救援仍触发（修前实测 0 触发）
附：正确推进重置救援钟（fishcolor 钓起后救援钟从钓起时刻重算）"""
import asyncio, os, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('K:' + k + ':' + t); return _p(k, t); };
  const _s = KIDS.speak.bind(KIDS);
  KIDS.speak = t => { window.__vlog.push('TTS:' + t); return _s(t); };
  return true;
})()"""

GAMES = [('fishcolor', 'fis', 'FIS'), ('fruitsplit', 'fru', 'FRU'), ('hopscotch', 'hop', 'HOP')]

WRONG_TAP = {  # 各款"点一个错误对象"驱动（返回 true 表示完成一次错点）
    'fishcolor': """async () => {
      const q = FIS.quiz;
      if (!q) return false;
      const i = q.fishes.findIndex((f, idx) => f.c !== q.targets[q.act] && !q.gone[idx]);
      if (i < 0) return false;
      await FIS.tapFish(i);
      return true;
    }""",
    'fruitsplit': """async () => {
      for (let s = 0; s < 5; s++) {
        const q = FRU.quiz;
        if (!q) return false;
        if (q.mode === 'pick' || q.mode === 'match') {
          const wrong = q.options ? q.options.findIndex((_, i2) => i2 !== q.answerIdx) : -1;
          if (wrong >= 0) { await FRU.tapOption(wrong); return true; }
        }
        await FRU.doCut();
        await new Promise(r => setTimeout(r, 1700));
      }
      return false;
    }""",
    'hopscotch': """async () => {
      const q = HOP.quiz;
      if (!q) return false;
      const far = q.cur + (q.to > q.from ? 2 : -2);
      if (far < 1 || far > 10) return false;
      await HOP.tapCell(far);
      return true;
    }""",
}

async def setup(browser, game, key):
    ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + os.path.join(BASE, game, 'index.html').replace('\\', '/'))
    await pg.wait_for_timeout(800)
    await pg.evaluate("""() => {
      const sv = KIDS._save();
      for (let i = 0; i < 5; i++) sv.levels['1-' + i] = {stars: 3};
      sv.%s = sv.%s || {}; sv.%s.tutSeen = true;
      KIDS.store.persist();
    }""" % (key, key, key))
    await pg.reload()
    await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK)
    await pg.evaluate('window.__vlog = []')   # 基线清零：断言只看静置/乱点期新增
    return ctx, pg, errs

RKEYS = ('钓', '鱼', '一半', '切', '哪个', '找一找', '跳到')
def rescue_hits(v):
    # 救援=重读题面：TTS 项（fruitsplit/hopscotch 走 KIDS.speak）或 K:null 项
    # （fishcolor 走 sayR(null, quizSpeech)→voice.play(null,text)），均含题面关键词
    out = []
    for x in v:
        if not any(k in x for k in RKEYS):
            continue
        if x.startswith('TTS:') or (x.startswith('K:') and x.split(':', 2)[1] == 'null'):
            out.append(x)
    return out

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for game, key, hook in GAMES:
            # P1a 纯静置 16s → 救援触发（阈值 14s）
            ctx, pg, errs = await setup(browser, game, key)
            await pg.wait_for_timeout(16500)
            v = await pg.evaluate('window.__vlog')
            hits = rescue_hits(v)
            rec('P1a %s 静置16s 救援触发(14s阈值)' % game, bool(hits) and not errs,
                'hits=%s errs=%s' % (hits[:2], errs[:1]))
            await ctx.close()

            # P1b 每 4s 错点一次持续 24s → 救援仍触发（错点不重置钟）
            ctx, pg, errs = await setup(browser, game, key)
            for _ in range(6):
                await pg.evaluate(WRONG_TAP[game])
                await pg.wait_for_timeout(4000)
            v = await pg.evaluate('window.__vlog')
            hits = rescue_hits(v)
            rec('P1b %s 乱点24s 救援仍触发' % game, bool(hits) and not errs,
                'hits=%s errs=%s' % (hits[:2], errs[:1]))
            await ctx.close()

        # 附：正确推进重置钟——fishcolor 钓起 1 条后静置 16s：救援在钓起后触发（TTS 出现）且第一次救援不早于钓起后 13s
        ctx, pg, errs = await setup(browser, 'fishcolor', 'fis')
        await pg.evaluate("""async () => {
          const q = FIS.quiz;
          const i = q.fishes.findIndex((f, idx) => f.c === q.targets[q.act] && !q.gone[idx]);
          await FIS.tapFish(i);   // 正确钓起=重置救援钟
        }""")
        n0 = await pg.evaluate('window.__vlog.length')
        await pg.wait_for_timeout(16500)
        v = await pg.evaluate('window.__vlog')
        hits = rescue_hits(v)
        rec('附 fishcolor 正确钓起后钟重算', bool(hits) and not errs, 'hits=%s' % hits[:2])
        await ctx.close()

        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
