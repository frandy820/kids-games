# -*- coding: utf-8 -*-
"""subbug 减法捕虫 独立复验（batch6 · 2026-09-06）
①verify title ②无头真实放飞+选答案通关第 1 关 ③双 viewport ④离线 ⑤截图 stdev
⑥钩子 ⑦0 pageerror ⑧教学吞输入 ⑨clips ⑩零惩罚+首错不 pulse + ⑪章4瓢虫不计数"""
import asyncio, os, statistics, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'subbug', 'index.html').replace('\\', '/')
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
            t = await pg.evaluate('SUB && SUB.tutorial')
            if t == 'watch':
                f0 = await pg.evaluate('SUB.currentLevel.flyCount')
                n = await pg.evaluate("""() => {
                  const el = document.querySelector('.animal[data-k="b"]');
                  if (!el) return null;
                  const r = el.getBoundingClientRect();
                  return [r.left + r.width/2, r.top + r.height/2];
                }""")
                if n:
                    await pg.mouse.click(n[0], n[1])
                    await pg.wait_for_timeout(500)
                    f1 = await pg.evaluate('SUB.currentLevel.flyCount')
                    rec('⑧ 教学看阶段吞输入', f1 == f0, '点击前 fly=%s 后=%s' % (f0, f1))
                    captured = True
                    break
                break
            elif t in ('help', 'solo', 'none'):
                break
            await pg.wait_for_timeout(500)
        if not captured:
            rec('⑧ 教学看阶段吞输入', False, '未捕获 watch（tut=%s）' % t)

        for _ in range(40):
            t = await pg.evaluate('SUB && SUB.tutorial')
            lv = await pg.evaluate('SUB.currentLevel')
            if t in ('help', 'solo', 'none') and lv:
                break
            await pg.wait_for_timeout(500)

        # ② 真实放飞+选答案通关第 1 关
        clicks = 0
        for _ in range(200):
            lv = await pg.evaluate('SUB.currentLevel')
            if lv and lv.get('done'):
                break
            q = await pg.evaluate('SUB.quiz')
            if not q:
                await pg.wait_for_timeout(300)
                continue
            if q['flyCount'] < q['m']:              # 放飞：真实点未飞的虫
                idx = next((i for i, f in enumerate(q['flown']) if not f), None)
                if idx is None:
                    await pg.wait_for_timeout(200)
                    continue
                pos = await pg.evaluate("""i => {
                  const el = document.querySelector('.animal[data-k="b"][data-i="' + i + '"]');
                  if (!el) return null;
                  const r = el.getBoundingClientRect();
                  return [r.left + r.width/2, r.top + r.height/2];
                }""", idx)
                await pg.mouse.click(pos[0], pos[1])
                clicks += 1
                await pg.wait_for_timeout(300)
            else:                                    # 飞满：真实点答案
                pos = await pg.evaluate("""i => {
                  const el = document.querySelector('.opt[data-i="' + i + '"]');
                  if (!el) return null;
                  const r = el.getBoundingClientRect();
                  return [r.left + r.width/2, r.top + r.height/2];
                }""", q['answerIdx'])
                await pg.mouse.click(pos[0], pos[1])
                clicks += 1
                await pg.wait_for_timeout(1400)
        lv = await pg.evaluate('SUB.currentLevel')
        cel = await pg.evaluate("!!document.querySelector('.k-celebrate')")
        rec('② 真实放飞+答题通关第 1 关', (lv and lv.get('done')) or cel,
            'clicks=%d done=%s celebrate=%s' % (clicks, lv and lv.get('done'), cel))

        rec('⑦ 0 pageerror', len(errs) == 0, errs[:2])
        rec('④ 完全离线', len(reqs) == 0, 'http 请求 %d' % len(reqs))
        r9 = await pg.evaluate("""() => {
          const need = ['core_chapter_end','core_day_end','core_rest','sub_tut_watch','sub_tut_turn','sub_hint'];
          return {n: Object.keys(KIDS.voice.clips).length, miss: need.filter(k => !KIDS.voice.clips[k])};
        }""")
        rec('⑨ clips 内嵌', not r9['miss'], 'clips=%d missing=%s' % (r9['n'], r9['miss']))

        # ⑩ 零惩罚+首错不 pulse（flat1 种档）
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          sv.levels['1-0'] = {stars: 3};
          sv.sub = sv.sub || {}; sv.sub.tutSeen = true;
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(1000)
        q = await pg.evaluate('SUB.quiz')
        wrong = next((i for i in range(len(q['items'])) if i != q['answerIdx']), None)
        p0 = await pg.evaluate("document.querySelectorAll('.opt.pulse').length")
        pos = await pg.evaluate("""i => {
          const el = document.querySelector('.opt[data-i="' + i + '"]');
          const r = el.getBoundingClientRect();
          return [r.left + r.width/2, r.top + r.height/2];
        }""", wrong)
        await pg.mouse.click(pos[0], pos[1])
        await pg.wait_for_timeout(800)
        p1 = await pg.evaluate("document.querySelectorAll('.opt.pulse').length")
        r1 = await pg.evaluate('SUB.currentLevel.retries')
        rec('⑩ 答错零惩罚+首错不 pulse', p1 == p0 and r1 == 1, 'pulse %d→%d retries=%s' % (p0, p1, r1))

        # ⑪ 章 4 瓢虫不计数（flat15 种档；lim 封顶 12（DAY_CAP=2）种 15 关必全通→dayEnd 落回 flat0，
        #    用官方 API bonusSet 提 lim=22 绕开——比手改 firstDay 可靠）
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          for (let f = 0; f < 15; f++) sv.levels[(Math.floor(f/5)+1)+'-'+(f%5)] = {stars:3};
          sv.sub.tutSeen = true;
          KIDS.calendar.bonusSet(10);
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(1000)
        flat = await pg.evaluate('SUB.currentLevel.flat')
        nl = await pg.evaluate("document.querySelectorAll('.animal[data-k=o]').length")
        f0 = await pg.evaluate('SUB.currentLevel.flyCount')
        pos = await pg.evaluate("""() => {
          const el = document.querySelector('.animal[data-k="o"]');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return [r.left + r.width/2, r.top + r.height/2];
        }""")
        ok11 = False
        if pos:
            await pg.mouse.click(pos[0], pos[1])
            await pg.wait_for_timeout(400)
            f1 = await pg.evaluate('SUB.currentLevel.flyCount')
            ok11 = f1 == f0
        rec('(11) 章4瓢虫不计数', flat == 15 and nl >= 2 and ok11,
            'flat=%s 瓢虫=%s fly %s→%s' % (flat, nl, f0, f1 if pos else '-'))

        # ⑥ 钩子
        r6 = await pg.evaluate("""() => {
          const w = window.SUB;
          return {cl: !!w.currentLevel, q: !!w.quiz, tb: typeof w.tapBug,
                  rc: typeof w.recount, pk: typeof w.pick, au: typeof w.autoSolve};
        }""")
        rec('⑥ 钩子齐全', all(r6.values()), r6)

        # ③ 双 viewport
        for vp in ((1280, 800), (800, 1180)):
            await pg.set_viewport_size({'width': vp[0], 'height': vp[1]})
            await pg.wait_for_timeout(600)
            m = await pg.evaluate("""() => {
              const ow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
              const bugs = [...document.querySelectorAll('.animal[data-k="b"]')].map(e => e.getBoundingClientRect());
              const opts = [...document.querySelectorAll('.opt')].map(e => e.getBoundingClientRect());
              let minD = 1e9;
              const bs = [...document.querySelectorAll('.animal')].map(e => ({x: e.getBoundingClientRect().left + e.getBoundingClientRect().width/2, y: e.getBoundingClientRect().top + e.getBoundingClientRect().height/2}));
              for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++)
                minD = Math.min(minD, Math.hypot(bs[i].x-bs[j].x, bs[i].y-bs[j].y));
              return {ow, minBug: bugs.length ? Math.min(...bugs.map(r => Math.min(r.width, r.height))) : -1,
                      minOpt: opts.length ? Math.min(...opts.map(r => Math.min(r.width, r.height))) : -1, minD};
            }""")
            rec('③ viewport %dx%d' % vp, m['ow'] <= 0 and m['minBug'] >= 64 and m['minOpt'] >= 96 and m['minD'] >= 90,
                'overflowX=%s bug≥%s opt≥%s minD=%d' % (m['ow'], m['minBug'], m['minOpt'], m['minD']))

        # ⑤ 截图
        shot = os.path.join(BASE, 'subbug', '_shots')
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
