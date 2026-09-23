# -*- coding: utf-8 -*-
"""batch7 反方审查修复实证（fatal 0 / major 1 / minor 7 → 修 M1+m1/m2/m3/m5/m7）
M1 三款教学锁定窗内真实点 #btn-replay：cur 未重建、教学链照常完成（tutSeen 落盘+进入 help）
m1 教学开场语音播报（sayR 化后行为不变，flat0 等价）
m2 fishcolor black 色值加深生效
m3 structOk 强化后 40 关审计仍全过（rebuild 后 ?verify=1）
m5 fruitsplit/hopscotch flat5 静置 25s 救援=重读题面（TTS 文本含任务内容）
m7 fruitsplit 教学演示经 demo 豁免通道正常完成"""
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
  KIDS.voice.play = (k, t) => { window.__vlog.push(k); return _p(k, t); };
  const _s = KIDS.speak.bind(KIDS);
  KIDS.speak = t => { window.__vlog.push('TTS:' + t); return _s(t); };
  return true;
})()"""

GAMES = [('fishcolor', 'fis', 'FIS'), ('fruitsplit', 'fru', 'FRU'), ('hopscotch', 'hop', 'HOP')]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # ---------- M1+m1+m7：教学锁定窗内真实点重玩，教学链照常完成 ----------
        for game, key, hook in GAMES:
            ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('file:///' + os.path.join(BASE, game, 'index.html').replace('\\', '/'))
            await pg.wait_for_timeout(850)
            tut = await pg.evaluate('%s.tutorial' % hook)
            await pg.evaluate(HOOK)                     # 教学期语音（m1）
            await pg.locator('#btn-replay').dispatch_event('pointerdown')   # M1：锁定窗内真实点重玩
            await pg.wait_for_timeout(8000)             # 等教学演示走完（fishcolor 演示钓多鱼较长）
            st = await pg.evaluate("""() => {
              const sv = KIDS._save();
              return { seen: !!(sv.%s && sv.%s.tutSeen), step: %s.currentLevel && %s.currentLevel.step };
            }""" % (key, key, hook, hook))
            tut2 = await pg.evaluate('%s.tutorial' % hook)
            v = await pg.evaluate('window.__vlog.filter(k => String(k).indexOf("tut_") >= 0)')
            rec('M1 %s 教学窗内点重玩=教学照常完成' % game,
                tut == 'watch' and st.get('seen') and not errs,
                'tut=%s->%s seen=%s step=%s errs=%s' % (tut, tut2, st.get('seen'), st.get('step'), errs[:1]))
            rec('m1 %s 教学语音播报' % game, bool(v) and any(k.startswith('%s_tut' % key) for k in v), str(v)[:80])
            await ctx.close()

        # ---------- M1 演出窗内点重玩（won/locked 门双保险，抽 fruitsplit） ----------
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + os.path.join(BASE, 'fruitsplit', 'index.html').replace('\\', '/'))
        await pg.wait_for_timeout(800)
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          sv.fru = sv.fru || {}; sv.fru.tutSeen = true;
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(900)
        n0 = await pg.evaluate("Object.keys(KIDS._save().levels).length")
        await pg.evaluate("""async () => {     // 快进 4 题，末题点对触发演出
          for (let s = 0; s < 4; s++) {
            const q = FRU.quiz;
            if (q.mode === 'cut') { await FRU.doCut(); }
            else { await FRU.tapOption(q.answerIdx); }
            await new Promise(r => setTimeout(r, 1700));
          }
          const q = FRU.quiz;
          if (q.mode === 'cut') FRU.doCut(); else FRU.tapOption(q.answerIdx);
        }""")
        await pg.wait_for_timeout(300)
        await pg.locator('#btn-replay').dispatch_event('pointerdown')   # 演出窗内
        await pg.wait_for_timeout(4500)
        # 被门拦=winFlow 正常完成写档 1-0 并推进；重玩生效=关卡重开 step0 且无写档
        w = await pg.evaluate("""() => ({
          stars: (KIDS._save().levels['1-0'] || {}).stars || 0,
          flat: FRU.currentLevel && FRU.currentLevel.flat })""")
        rec('M1 fruitsplit 演出窗内点重玩被门拦', w.get('stars', 0) > 0 and not errs,
            'stars=%s flat=%s errs=%s' % (w.get('stars'), w.get('flat'), errs[:1]))
        await ctx.close()

        # ---------- m2：black 色值 ----------
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        await pg.goto('file:///' + os.path.join(BASE, 'fishcolor', 'index.html').replace('\\', '/'))
        await pg.wait_for_timeout(800)
        body = await pg.evaluate("COLORS.black.body")
        rec('m2 fishcolor black 色值加深', body == '#3A3633', 'body=%s' % body)
        await ctx.close()

        # ---------- m3：rebuild 后 verify 仍全过 ----------
        for game, _, _ in GAMES:
            ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = await ctx.new_page()
            title = ''
            await pg.goto('file:///' + os.path.join(BASE, game, 'index.html').replace('\\', '/') + '?verify=1')
            for _ in range(15):
                title = await pg.title()
                if 'VERIFY' in title:
                    break
                await pg.wait_for_timeout(1000)
            rec('m3 %s verify 仍全过' % game, 'VERIFY PASS' in title and 'FAIL' not in title, title)
            await ctx.close()

        # ---------- m5：flat5 静置 25s 救援=重读题面 ----------
        for game, key, hook in [('fruitsplit', 'fru', 'FRU'), ('hopscotch', 'hop', 'HOP')]:
            ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = await ctx.new_page()
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
            await pg.wait_for_timeout(26000)            # 静置 25s+（idle 计时从 lastAct 起）
            v = await pg.evaluate("window.__vlog.filter(k => String(k).indexOf('TTS:') === 0)")
            ok = bool(v) and any(('两半' in k or '切' in k) if game == 'fruitsplit' else ('跳到' in k) for k in v)
            rec('m5 %s 救援重读题面' % game, ok, 'TTS=%s' % [k[:26] for k in v][:3])
            await ctx.close()

        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
