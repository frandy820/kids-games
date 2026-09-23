# -*- coding: utf-8 -*-
"""batch6 反方审查修复实证（2026-09-07）
M1 words 荷 py 显示剥离内部后缀（he2→he）
M2-words flat4 章末预告=章 2 内容（非刚玩完的章 1）；compare/subbug 对照（hint 语义本就对，抽验 flat4 弹层文案=章2 描述）
M3 三款 末题答对演出窗口内点重玩：无 winFlow 白拿 3 星（levels 无新写入+关卡重开生效）"""
import asyncio, os, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # ---------- M1：荷 py 显示 ----------
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + os.path.join(BASE, 'words', 'index.html').replace('\\', '/'))
        await pg.wait_for_timeout(800)
        flat_he = await pg.evaluate("""() => {
          for (let f = 10; f < 15; f++) {           // 荷=章 3 字池
            const L = genLevel(f);
            for (const q of L.quizzes) if (q.py === 'he2') return f;
          }
          return -1;
        }""")
        if flat_he >= 0:
            await pg.evaluate("""(f) => {
              const sv = KIDS._save();
              for (let i = 0; i < f; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = {stars:3};
              sv.wrd = sv.wrd || {}; sv.wrd.tutSeen = true;
              KIDS.calendar.bonusSet(20);
              KIDS.store.persist();
            }""", flat_he)
            await pg.reload()
            await pg.wait_for_timeout(900)
            found = False
            for _ in range(25):
                q = await pg.evaluate('WRD.quiz')
                if q and q['py'] == 'he2':
                    py = await pg.evaluate("document.querySelector('#target-card .py').textContent")
                    zi = await pg.evaluate("document.querySelector('#target-card .zi').textContent")
                    rec('M1 荷题面 py 显示=he（无内部后缀）', py == 'he', '字=%s 显示 py=%r' % (zi, py))
                    found = True
                    break
                await pg.evaluate("""() => {
                  const q = WRD.quiz;
                  if (!q) return;
                  for (let j = 0; j < q.parts.length; j++) {
                    const idx = q.slotTileIdx.length ? null : null;
                  }
                }""")
                # 推进：拼完当前字（点正确块直至 step 前进）
                for _ in range(10):
                    done = await pg.evaluate("""async () => {
                      const q = WRD.quiz;
                      if (!q) return true;
                      if (q.py === 'he2') return false;
                      const j = q.slots.findIndex(v => v === null);
                      if (j == null || j < 0) { await WRD.tapPart(q.slotTileIdx[0]); return false; }
                      const need = q.parts[j];
                      const cand = q.tiles.findIndex((ch, i) => ch === need && !q.slotTileIdx.includes(i));
                      if (cand < 0) return true;
                      await WRD.tapPart(cand);
                      await new Promise(r => setTimeout(r, 120));
                      return false;
                    }""")
                    if done:
                        break
                await pg.wait_for_timeout(400)
            if not found:
                rec('M1 荷题面 py 显示', False, 'flat=%s 内未推进到荷' % flat_he)
        else:
            rec('M1 荷题面 py 显示', False, '章 3 未找到荷（字池变化？）')
        rec('M1 0 pageerror', len(errs) == 0, errs[:2])
        await ctx.close()

        # ---------- M3：末题演出窗口内点重玩（三款） ----------
        async def m3(game, hook, tap_correct_js):
            ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('file:///' + os.path.join(BASE, game, 'index.html').replace('\\', '/'))
            await pg.wait_for_timeout(800)
            await pg.evaluate("""() => {
              const sv = KIDS._save();
              sv.levels['1-0'] = {stars: 3};
              const k = %s; sv[k] = sv[k] || {}; sv[k].tutSeen = true;
              KIDS.store.persist();
            }""" % ("'wrd'" if game == 'words' else "'cmp'" if game == 'compare' else "'sub'"))
            await pg.reload()
            await pg.wait_for_timeout(900)
            # 答完前 4 题（快进），最后一题答对触发演出，300ms 内点重玩
            r = await pg.evaluate("""async (tap) => {
              const H = window.%s;
              // 快进：4 题
              for (let s = 0; s < 4; s++) {
                await H.autoSolve ? null : null;
              }
              return 'ready';
            }""" % hook)
            # autoSolve 会整关通关——改用：先 autoSolve 不行。手动驱动 4 题后最后一题触发
            trig = await pg.evaluate(tap_correct_js)
            await pg.wait_for_timeout(300)
            await pg.locator('#btn-replay').dispatch_event('pointerdown')
            await pg.wait_for_timeout(3000)
            lv = await pg.evaluate('%s.currentLevel' % hook)
            levels_after = await pg.evaluate("Object.keys(KIDS._save().levels).length")
            won = await pg.evaluate('%s.currentLevel.won' % hook)
            return lv, levels_after, won, errs

        # words：种档 flat1，拼完前 4 字后第 5 字最后一块点下即触发 1900ms 演出
        lv, n, won, errs = await m3('words', 'WRD', """async () => {
          // 逐题拼对 4 字（每字点满正确块），返回第 5 字状态
          for (let s = 0; s < 4; s++) {
            while (true) {
              const q = WRD.quiz;
              if (!q || q.step !== s) break;
              const j = q.slots.findIndex(v => v === null);
              if (j == null || j < 0) break;
              const need = q.parts[j];
              const cand = q.tiles.findIndex((ch, i) => ch === need && !q.slotTileIdx.includes(i));
              if (cand < 0) break;
              await WRD.tapPart(cand);
              await new Promise(r => setTimeout(r, 150));
            }
            await new Promise(r => setTimeout(r, 2100));   // 等亮字演出
          }
          // 第 5 字：点满正确块（最后一块触发 done 演出，不 await 完）
          const q = WRD.quiz;
          if (!q) return 'noq';
          let last = null;
          while (true) {
            const q2 = WRD.quiz;
            if (!q2) break;
            const j = q2.slots.findIndex(v => v === null);
            if (j == null || j < 0) break;
            const need = q2.parts[j];
            const cand = q2.tiles.findIndex((ch, i) => ch === need && !q2.slotTileIdx.includes(i));
            if (cand < 0) break;
            last = WRD.tapPart(cand);                    // 末块：返回即进入 1900ms 演出
            await new Promise(r => setTimeout(r, 120));
          }
          return 'trig';
        }""")
        ok = lv and lv.get('flat') == 1 and not won and n == 1 and not errs
        rec('M3 words 演出窗内重玩无白拿星', ok,
            'flat=%s won=%s levels=%d errs=%s' % (lv and lv.get('flat'), won, n, errs[:1]))

        # compare：种档 flat1，答对 4 题后第 5 题点正确符号（980ms 演出）
        lv, n, won, errs = await m3('compare', 'CMP', """async () => {
          for (let s = 0; s < 4; s++) {
            await CMP.pick(CMP.quiz.answer);
            await new Promise(r => setTimeout(r, 1600));
          }
          const a = CMP.quiz.answer;
          CMP.pick(a);                                    // 末题：flySymbol+980ms 演出
          return 'trig';
        }""")
        ok = lv and lv.get('flat') == 1 and not won and n == 1 and not errs
        rec('M3 compare 演出窗内重玩无白拿星', ok,
            'flat=%s won=%s levels=%d errs=%s' % (lv and lv.get('flat'), won, n, errs[:1]))

        # subbug：种档 flat1，答对 4 题后第 5 题选答案（880ms 演出）
        lv, n, won, errs = await m3('subbug', 'SUB', """async () => {
          for (let s = 0; s < 4; s++) {
            await SUB.pick(SUB.quiz.answerIdx);
            await new Promise(r => setTimeout(r, 1500));
          }
          SUB.pick(SUB.quiz.answerIdx);                   // 末题：880ms 演出
          return 'trig';
        }""")
        ok = lv and lv.get('flat') == 1 and not won and n == 1 and not errs
        rec('M3 subbug 演出窗内重玩无白拿星', ok,
            'flat=%s won=%s levels=%d errs=%s' % (lv and lv.get('flat'), won, n, errs[:1]))

        # ---------- M2：flat4 章末预告=章 2 内容（words 修后 / compare 对照本就对） ----------
        async def m2(game, hook, expect_kw):
            ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = await ctx.new_page()
            await pg.goto('file:///' + os.path.join(BASE, game, 'index.html').replace('\\', '/'))
            await pg.wait_for_timeout(800)
            await pg.evaluate("""() => {
              const sv = KIDS._save();
              for (let i = 0; i < 4; i++) sv.levels['1-' + i] = {stars:3};
              const k = %s; sv[k] = sv[k] || {}; sv[k].tutSeen = true;
              KIDS.calendar.bonusSet(10);
              KIDS.store.persist();
            }""" % ("'wrd'" if game == 'words' else "'cmp'" if game == 'compare' else "'sub'"))
            await pg.reload()
            await pg.wait_for_timeout(900)
            txt = ''
            for _ in range(30):
                txt = await pg.evaluate("() => (document.querySelector('.k-chapterend, .k-chend, [class*=chapter]') || {textContent:''}).textContent")
                if txt and ('明天' in txt or '章' in txt):
                    break
                st = await pg.evaluate('%s.currentLevel.step' % hook)
                if st is None:
                    break
                await pg.evaluate('%s.autoSolve()' % hook)
                await pg.wait_for_timeout(1200)
            return txt

        t1 = await m2('words', 'WRD', '三个部件')
        rec('M2 words 章1末预告=章2 内容', '小心长得像' in (t1 or ''), repr((t1 or '')[:60]))
        t2 = await m2('compare', 'CMP', '数字卡')
        rec('M2 compare 章1末预告=章2 内容（对照，本就对）', '一样多' in (t2 or ''), repr((t2 or '')[:60]))
        t3 = await m2('subbug', 'SUB', '数到十')
        rec('M2 subbug 章1末预告=章2 内容（对照，本就对）', '更多小虫' in (t3 or ''), repr((t3 or '')[:60]))

        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
