# -*- coding: utf-8 -*-
"""compare 比较大小 独立复验（batch6 · 2026-09-06）
①verify title ②无头真实点数+选符号通关第 1 关 ③双 viewport ④离线 ⑤截图 stdev
⑥钩子 ⑦0 pageerror ⑧教学吞输入 ⑨clips ⑩零惩罚+首错不 pulse + (11) 点数角标辅助"""
import asyncio, os, statistics, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'compare', 'index.html').replace('\\', '/')
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # ---------- ① verify ----------
        ctx = await browser.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL + '?verify=1')
        title = ''
        for _ in range(15):
            await pg.wait_for_timeout(1000)
            title = await pg.title()
            if 'VERIFY' in title:
                break
        rec('① verify title', title.startswith('VERIFY PASS'), title)
        await ctx.close()

        # ---------- 主流程 ----------
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs, reqs = [], []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('request', lambda r: reqs.append(r.url) if r.url.startswith('http') else None)
        await pg.goto(URL)
        await pg.wait_for_timeout(800)

        # ⑧ 教学吞输入
        captured = False
        for _ in range(30):
            t = await pg.evaluate('CMP && CMP.tutorial')
            if t == 'watch':
                c0 = await pg.evaluate('CMP.currentLevel.countedL + CMP.currentLevel.countedR')
                n = await pg.evaluate("""() => {
                  const el = document.querySelector('.item');
                  if (!el) return null;
                  const r = el.getBoundingClientRect();
                  return [r.left + r.width/2, r.top + r.height/2];
                }""")
                if n:
                    await pg.mouse.click(n[0], n[1])
                    await pg.wait_for_timeout(500)
                    c1 = await pg.evaluate('CMP.currentLevel.countedL + CMP.currentLevel.countedR')
                    rec('⑧ 教学看阶段吞输入', c1 == c0, '点击前 counted=%s 后=%s' % (c0, c1))
                    captured = True
                    break
                break
            elif t in ('help', 'solo', 'none'):
                break
            await pg.wait_for_timeout(500)
        if not captured:
            rec('⑧ 教学看阶段吞输入', False, '未捕获 watch（tut=%s）' % t)

        for _ in range(40):
            t = await pg.evaluate('CMP && CMP.tutorial')
            lv = await pg.evaluate('CMP.currentLevel')
            if t in ('help', 'solo', 'none') and lv:
                break
            await pg.wait_for_timeout(500)

        # ② 真实点数+选符号通关第 1 关（每题：点满两侧物品角标→点正确符号）
        clicks = 0
        for _ in range(200):
            lv = await pg.evaluate('CMP.currentLevel')
            if lv and lv.get('done'):
                break
            q = await pg.evaluate('CMP.quiz')
            if not q:
                await pg.wait_for_timeout(300)
                continue
            # 点未数过的物品（真实 click .item）
            pos = await pg.evaluate("""() => {
              for (const side of ['L', 'R']) {
                for (const el of document.querySelectorAll('#g-' + (side === 'L' ? 'left' : 'right') + ' .item')) {
                  if (el.dataset.counted !== '1' && !el.querySelector('.badge.on')) {
                    const r = el.getBoundingClientRect();
                    return [r.left + r.width/2, r.top + r.height/2];
                  }
                }
              }
              return null;
            }""")
            if pos:
                await pg.mouse.click(pos[0], pos[1])
                clicks += 1
                await pg.wait_for_timeout(150)
                continue
            # 全数完：点正确符号
            sp = await pg.evaluate("""(s) => {
              const el = document.querySelector('.sym[data-s="' + s + '"]');
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return [r.left + r.width/2, r.top + r.height/2];
            }""", q['answer'])
            await pg.mouse.click(sp[0], sp[1])
            clicks += 1
            await pg.wait_for_timeout(1600)
        lv = await pg.evaluate('CMP.currentLevel')
        cel = await pg.evaluate("!!document.querySelector('.k-celebrate')")
        rec('② 真实点数+选符号通关第 1 关', (lv and lv.get('done')) or cel,
            'clicks=%d done=%s celebrate=%s' % (clicks, lv and lv.get('done'), cel))

        rec('⑦ 0 pageerror', len(errs) == 0, errs[:2])
        rec('④ 完全离线', len(reqs) == 0, 'http 请求 %d' % len(reqs))
        r9 = await pg.evaluate("""() => {
          const need = ['core_chapter_end','core_day_end','core_rest','cmp_tut_watch','cmp_tut_turn','cmp_hint'];
          return {n: Object.keys(KIDS.voice.clips).length, miss: need.filter(k => !KIDS.voice.clips[k])};
        }""")
        rec('⑨ clips 内嵌', not r9['miss'], 'clips=%d missing=%s' % (r9['n'], r9['miss']))

        # (11) 点数角标辅助：flat1 种档，真实点物品 countedL/R 递增
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          sv.levels['1-0'] = {stars: 3};
          sv.cmp = sv.cmp || {}; sv.cmp.tutSeen = true;
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(1000)
        flat = await pg.evaluate('CMP.currentLevel.flat')
        q = await pg.evaluate('CMP.quiz')
        c0 = q['countedL'] + q['countedR']
        pos = await pg.evaluate("""() => {
          const el = document.querySelector('#g-left .item, #g-right .item');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return [r.left + r.width/2, r.top + r.height/2];
        }""")
        await pg.mouse.click(pos[0], pos[1])
        await pg.wait_for_timeout(300)
        q2 = await pg.evaluate('CMP.quiz')
        c1 = q2['countedL'] + q2['countedR']
        rec('(11) 点数角标辅助', flat == 1 and c1 == c0 + 1, 'flat=%s counted %s→%s' % (flat, c0, c1))

        # ⑩ 零惩罚+首错不 pulse
        wrong = '<' if q['answer'] != '<' else '>'
        p0 = await pg.evaluate("document.querySelectorAll('.sym.pulse').length")
        sp = await pg.evaluate("""(s) => {
          const el = document.querySelector('.sym[data-s="' + s + '"]');
          const r = el.getBoundingClientRect();
          return [r.left + r.width/2, r.top + r.height/2];
        }""", wrong)
        await pg.mouse.click(sp[0], sp[1])
        await pg.wait_for_timeout(900)
        p1 = await pg.evaluate("document.querySelectorAll('.sym.pulse').length")
        r1 = await pg.evaluate('CMP.currentLevel.retries')
        rec('⑩ 答错零惩罚+首错不 pulse', p1 == p0 and r1 == 1, 'pulse %d→%d retries=%s' % (p0, p1, r1))

        # ⑥ 钩子
        r6 = await pg.evaluate("""() => {
          const w = window.CMP;
          return {cl: !!w.currentLevel, q: !!w.quiz, ti: typeof w.tapItem,
                  rc: typeof w.recount, pk: typeof w.pick, au: typeof w.autoSolve};
        }""")
        rec('⑥ 钩子齐全', all(r6.values()), r6)

        # ③ 双 viewport
        for vp in ((1280, 800), (800, 1180)):
            await pg.set_viewport_size({'width': vp[0], 'height': vp[1]})
            await pg.wait_for_timeout(600)
            m = await pg.evaluate("""() => {
              const ow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
              const its = [...document.querySelectorAll('.item')].map(e => e.getBoundingClientRect());
              const syms = [...document.querySelectorAll('.sym')].map(e => e.getBoundingClientRect());
              return {ow, minItem: its.length ? Math.min(...its.map(r => Math.min(r.width, r.height))) : -1,
                      minSym: syms.length ? Math.min(...syms.map(r => Math.min(r.width, r.height))) : -1};
            }""")
            rec('③ viewport %dx%d' % vp, m['ow'] <= 0 and m['minItem'] >= 64 and m['minSym'] >= 96,
                'overflowX=%s item≥%s sym≥%s' % (m['ow'], m['minItem'], m['minSym']))

        # ⑤ 截图
        shot = os.path.join(BASE, 'compare', '_shots')
        os.makedirs(shot, exist_ok=True)
        f = os.path.join(shot, 'reverify.png')
        await pg.screenshot(path=f)
        from PIL import Image
        im = Image.open(f).convert('L')
        sd = statistics.pstdev(list(im.getdata())[::37])
        rec('⑤ 截图像素非空白', sd > 5, 'stdev=%.1f' % sd)
        await ctx.close()
        await browser.close()

    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
