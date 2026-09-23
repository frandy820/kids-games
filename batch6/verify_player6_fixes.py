# -*- coding: utf-8 -*-
"""batch6 6 岁试玩报告修复实证（REPORT-PLAYER-6yo.md 修复优先级 1-5 条）
F1 三款 flat>=3 纠错轻语音（sayW：flat<3 每错必播 / flat>=3 10s 节流）
F2 compare 数字卡点数角标 1..n 循环（num 模式点数支架）
F3 subbug 章4 每关首次点瓢虫播 sub_lady
F4 subbug 大 m 题（m>=12）放飞过半播一次 sub_cheer
F5 words 章4 首次错播 wrd_fam（家族辨析），第 2 错起走 sayW"""
import asyncio, os, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {           // 语音调用记录（reload 后重装）
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push(k); return _p(k, t); };
  return true;
})()"""

def seed_js(n, game_key):
    return """() => {
      const sv = KIDS._save();
      for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%%5)] = {stars:3};
      sv.%s = sv.%s || {}; sv.%s.tutSeen = true;
      if (%d >= 10) KIDS.calendar.bonusSet(10);
      KIDS.store.persist();
    }""" % (n, game_key, game_key, game_key, n)

async def setup(browser, game, flat, game_key):
    ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + os.path.join(BASE, game, 'index.html').replace('\\', '/'))
    await pg.wait_for_timeout(800)
    await pg.evaluate(seed_js(flat, game_key))
    await pg.reload()
    await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK)
    return ctx, pg, errs

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # ---------- F1a words flat5：首错播 wrd_wrong，10s 内第 2 错静默 ----------
        ctx, pg, errs = await setup(browser, 'words', 5, 'wrd')
        dis = await pg.evaluate("WRD.quiz.tileTypes.indexOf('d')")
        await pg.evaluate("WRD.tapPart(%d)" % dis)
        v1 = await pg.evaluate("window.__vlog.slice()")
        await pg.evaluate("WRD.tapPart(%d)" % dis)
        v2 = await pg.evaluate("window.__vlog.slice()")
        ok = v1.count('wrd_wrong') == 1 and v2.count('wrd_wrong') == 1
        rec('F1a words flat5 首错播 wrong+节流', ok, '1st=%s 2nd=%s' % (v1, v2))
        rec('F1a words 0 pageerror', not errs, errs[:1])
        await ctx.close()

        # ---------- F5 words flat15：章4 首错播 wrd_fam，第 2 错播 wrd_wrong，第 3 错节流 ----------
        ctx, pg, errs = await setup(browser, 'words', 15, 'wrd')
        dis = await pg.evaluate("WRD.quiz.tileTypes.indexOf('d')")
        await pg.evaluate("WRD.tapPart(%d)" % dis)
        await pg.evaluate("WRD.tapPart(%d)" % dis)
        await pg.evaluate("WRD.tapPart(%d)" % dis)
        v = await pg.evaluate("window.__vlog.slice()")
        ok = v.count('wrd_fam') == 1 and v.count('wrd_wrong') == 1
        rec('F5 words flat15 章4 首错 fam/次错 wrong/三错节流', ok, 'vlog=%s' % v)
        rec('F5 words 0 pageerror', not errs, errs[:1])
        await ctx.close()

        # ---------- F1b compare flat5：首错播 cmp_wrong，10s 内第 2 错静默 ----------
        ctx, pg, errs = await setup(browser, 'compare', 5, 'cmp')
        syms = await pg.evaluate("['>','<','='].filter(s => s !== CMP.quiz.answer)")
        await pg.evaluate("CMP.pick(%r)" % syms[0])
        v1 = await pg.evaluate("window.__vlog.slice()")
        await pg.evaluate("CMP.pick(%r)" % syms[1])
        v2 = await pg.evaluate("window.__vlog.slice()")
        ok = v1.count('cmp_wrong') == 1 and v2.count('cmp_wrong') == 1
        rec('F1b compare flat5 首错播 wrong+节流', ok, '1st=%s 2nd=%s' % (v1, v2))
        rec('F1b compare 0 pageerror', not errs, errs[:1])
        await ctx.close()

        # ---------- F2 compare flat10：数字卡点数角标 1..n 循环 ----------
        ctx, pg, errs = await setup(browser, 'compare', 10, 'cmp')
        info = await pg.evaluate("""() => {
          const q = CMP.quiz;
          const side = q.left.kind === 'num' ? 'L' : (q.right.kind === 'num' ? 'R' : null);
          return side ? {side, n: (side === 'L' ? q.left : q.right).n} : null;
        }""")
        if info:
            sel = "#g-left .numcard" if info['side'] == 'L' else "#g-right .numcard"
            seq = []
            for k in range(info['n'] + 1):          # 点 n+1 次：1..n 后循环回 1
                await pg.locator(sel).dispatch_event('pointerdown')
                await pg.wait_for_timeout(60)
                seq.append(await pg.evaluate("document.querySelector('%s .badge').textContent" % sel))
            expect = [str(k + 1) for k in range(info['n'])] + ['1']
            oncls = await pg.evaluate("document.querySelector('%s .badge').classList.contains('on')" % sel)
            rec('F2 compare 数字卡点数角标 1..n 循环', seq == expect and oncls,
                'n=%d seq=%s' % (info['n'], seq))
        else:
            rec('F2 compare 数字卡点数角标', False, 'flat10 首题无 num 侧')
        rec('F2 compare 0 pageerror', not errs, errs[:1])
        await ctx.close()

        # ---------- F1c subbug flat5：首错播 sub_wrong，10s 内第 2 错静默 ----------
        ctx, pg, errs = await setup(browser, 'subbug', 5, 'sub')
        wrongs = await pg.evaluate("""() => {
          const q = SUB.quiz;
          return [0,1,2].filter(i => i !== q.answerIdx);
        }""")
        await pg.evaluate("SUB.pick(%d)" % wrongs[0])
        v1 = await pg.evaluate("window.__vlog.slice()")
        await pg.evaluate("SUB.pick(%d)" % wrongs[1])
        v2 = await pg.evaluate("window.__vlog.slice()")
        ok = v1.count('sub_wrong') == 1 and v2.count('sub_wrong') == 1
        rec('F1c subbug flat5 首错播 wrong+节流', ok, '1st=%s 2nd=%s' % (v1, v2))
        rec('F1c subbug 0 pageerror', not errs, errs[:1])
        await ctx.close()

        # ---------- F3 subbug flat15：每关首次点瓢虫播 sub_lady，二次不播 ----------
        ctx, pg, errs = await setup(browser, 'subbug', 15, 'sub')
        await pg.evaluate("SUB.tapLady(0)")
        v1 = await pg.evaluate("window.__vlog.slice()")
        await pg.evaluate("SUB.tapLady(1)")
        v2 = await pg.evaluate("window.__vlog.slice()")
        ok = v1.count('sub_lady') == 1 and v2.count('sub_lady') == 1
        rec('F3 subbug flat15 首次点瓢虫播 lady/二次不播', ok, '1st=%s 2nd=%s' % (v1, v2))
        rec('F3 subbug 0 pageerror', not errs, errs[:1])
        await ctx.close()

        # ---------- F4 subbug flat10：大 m 题放飞过半播一次 sub_cheer ----------
        ctx, pg, errs = await setup(browser, 'subbug', 10, 'sub')
        hit = await pg.evaluate("""async () => {
          for (let s = 0; s < 5; s++) {
            const q = SUB.quiz;
            if (!q) return {found: false};
            if (q.m >= 12) {                       // 大 m 题：放飞 ceil(m/2) 只
              const half = Math.ceil(q.m / 2);
              for (let i = 0; i < q.n && SUB.quiz.flyCount < half; i++) {
                await SUB.tapBug(i);
              }
              return {found: true, m: q.m, half: half, fly: SUB.quiz.flyCount};
            }
            await SUB.pick(q.answerIdx);
            await new Promise(r => setTimeout(r, 1300));
          }
          return {found: false};
        }""")
        v = await pg.evaluate("window.__vlog.slice()")
        ok = hit and hit.get('found') and v.count('sub_cheer') == 1 and hit.get('fly') == hit.get('half')
        rec('F4 subbug 大m放飞过半播 cheer 一次', ok, 'hit=%s vlog(cheer相关)=%s' % (
            hit, [k for k in v if 'cheer' in k]))
        rec('F4 subbug 0 pageerror', not errs, errs[:1])
        await ctx.close()

        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
