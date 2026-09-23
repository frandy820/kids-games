# -*- coding: utf-8 -*-
"""words 识字积木 首单元门禁独立复验（batch6 · 2026-09-06）
①verify title ②无头真实操作通关第 1 关（真实 pointer 点部件）③双 viewport overflowX=0+热区
④完全离线 ⑤截图 stdev ⑥钩子 ⑦0 pageerror ⑧教学吞输入 ⑨clips 3 条 ⑩零惩罚+首错不 pulse"""
import asyncio, os, statistics, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'words', 'index.html').replace('\\', '/')
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
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '?verify=1')
        title = ''
        for _ in range(15):                          # 40 关审计+双 viewport sims 约 3-5s，轮询至 title 更新
            await pg.wait_for_timeout(1000)
            title = await pg.title()
            if 'VERIFY' in title:
                break
        rec('① verify title', title.startswith('VERIFY PASS'), title)
        await ctx.close()

        # ---------- ②-⑩ 主流程（干净存档走教学→真实通关） ----------
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        reqs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('request', lambda r: reqs.append(r.url) if r.url.startswith('http') else None)
        await pg.goto(URL)
        await pg.wait_for_timeout(800)

        # ⑧ 教学吞输入：watch 期间真实点击 tile 不进槽
        tut_seen = False
        for _ in range(30):
            t = await pg.evaluate('WRD && WRD.tutorial')
            if t == 'watch':
                slots0 = (await pg.evaluate('WRD.quiz.slots'))[:]
                n = await pg.evaluate("""() => {
                  const el = document.querySelector('.tile');
                  if (!el) return null;
                  const r = el.getBoundingClientRect();
                  return [r.left + r.width/2, r.top + r.height/2];
                }""")
                if n:
                    await pg.mouse.click(n[0], n[1])
                    await pg.wait_for_timeout(400)
                    slots1 = await pg.evaluate('WRD.quiz.slots')
                    rec('⑧ 教学看阶段吞输入', all(s1 == s0 for s1, s0 in zip(slots1, slots0)),
                        '点击前=%s 后=%s' % (slots0, slots1))
                    tut_seen = True
                    break
                break
            elif t in ('help', 'solo', 'none'):
                break
            await pg.wait_for_timeout(500)
        if not tut_seen:
            rec('⑧ 教学看阶段吞输入', False, '未捕获 watch 阶段（tutorial=%s）' % t)

        # 等教学结束进入可玩
        for _ in range(40):
            t = await pg.evaluate('WRD && WRD.tutorial')
            lv = await pg.evaluate('WRD.currentLevel')
            if t in ('help', 'solo', 'none') and lv:
                break
            await pg.wait_for_timeout(500)

        # ② 真实操作通关第 1 关：按槽序真实 click 正确 tile
        async def click_next_tile():
            q = await pg.evaluate('WRD.quiz')
            if not q:
                return None
            j = next((i for i, v in enumerate(q['slots']) if v is None), None)
            if j is None:
                return 'full'
            need = q['parts'][j]
            used = q['slotTileIdx']
            cand = None
            for i, ch in enumerate(q['tiles']):
                if ch == need and i not in used:
                    cand = i
                    break
            if cand is None:
                return None
            pos = await pg.evaluate("""i => {
              const el = document.querySelector('.tile[data-i="' + i + '"]');
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return [r.left + r.width/2, r.top + r.height/2];
            }""", cand)
            await pg.mouse.click(pos[0], pos[1])
            return 'clicked'

        steps0 = None
        won = False
        clicks = 0
        for _ in range(120):
            lv = await pg.evaluate('WRD.currentLevel')
            if lv and lv.get('done'):
                won = True
                break
            r = await click_next_tile()
            if r is None:
                await pg.wait_for_timeout(300)
                continue
            if r == 'full':                          # 本字槽满判定中，等亮起动画
                clicks += 1
                await pg.wait_for_timeout(2300)
            else:
                clicks += 1
                await pg.wait_for_timeout(350)
        lv = await pg.evaluate('WRD.currentLevel')
        cel = await pg.evaluate("!!document.querySelector('.k-celebrate')")
        await pg.wait_for_timeout(2500)
        lv2 = await pg.evaluate('WRD.currentLevel')
        rec('② 真实操作通关第 1 关', lv and lv.get('done') or cel or (lv2 and lv2.get('won')),
            'clicks=%d done=%s celebrate=%s won=%s' % (clicks, lv and lv.get('done'), cel, lv and lv.get('won')))

        # ⑦ 0 pageerror / ④ 离线
        rec('⑦ 0 pageerror', len(errs) == 0, errs[:2])
        rec('④ 完全离线（运行时 0 http 请求）', len(reqs) == 0, 'http 请求 %d' % len(reqs))

        # ⑨ clips
        r9 = await pg.evaluate("""() => {
          const need = ['core_chapter_end','core_day_end','core_rest','wrd_tut_watch','wrd_tut_turn','wrd_hint'];
          const miss = need.filter(k => !KIDS.voice.clips[k]);
          return {n: Object.keys(KIDS.voice.clips).length, miss};
        }""")
        rec('⑨ clips 3+3 内嵌', not r9['miss'], 'clips=%d missing=%s' % (r9['n'], r9['miss']))

        # ⑩ 零惩罚+首错不 pulse：种档进 flat1，点干扰块
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          sv.levels['1-0'] = {stars: 3};
          sv.wrd = sv.wrd || {}; sv.wrd.tutSeen = true;
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(1000)
        flat = await pg.evaluate('WRD.currentLevel.flat')
        q = await pg.evaluate('WRD.quiz')
        d = next((i for i, t in enumerate(q['tileTypes']) if t == 'd'), None)
        if d is not None:
            pos = await pg.evaluate("""i => {
              const el = document.querySelector('.tile[data-i="' + i + '"]');
              const r = el.getBoundingClientRect();
              return [r.left + r.width/2, r.top + r.height/2];
            }""", d)
            before = await pg.evaluate('WRD.quiz.slots')
            pulses0 = await pg.evaluate("document.querySelectorAll('.tile.pulse').length")
            await pg.mouse.click(pos[0], pos[1])
            await pg.wait_for_timeout(600)
            pulses1 = await pg.evaluate("document.querySelectorAll('.tile.pulse').length")
            after = await pg.evaluate('WRD.quiz.slots')
            misses = await pg.evaluate('WRD.currentLevel.misses')
            rec('⑩ 干扰块零惩罚+首错不 pulse', pulses1 == pulses0 and misses == 1,
                'pulse %d→%d misses=%s' % (pulses0, pulses1, misses))
        else:
            rec('⑩ 干扰块零惩罚', False, '本关无干扰块')

        # ⑥ 钩子齐全
        r6 = await pg.evaluate("""() => {
          const w = window.WRD;
          return {cl: !!w.currentLevel, q: !!w.quiz, tp: typeof w.tapPart,
                  ts: typeof w.tapSlot, au: typeof w.autoSolve, tut: typeof (w.tutorial)};
        }""")
        rec('⑥ 钩子齐全', all(r6.values()), r6)

        # ③ 双 viewport
        for vp in ((1280, 800), (800, 1180)):
            await pg.set_viewport_size({'width': vp[0], 'height': vp[1]})
            await pg.wait_for_timeout(500)
            m = await pg.evaluate("""() => {
              const ow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
              const tiles = [...document.querySelectorAll('.tile')].map(e => e.getBoundingClientRect());
              const slots = [...document.querySelectorAll('.slot')].map(e => e.getBoundingClientRect());
              return {ow, minTile: tiles.length ? Math.min(...tiles.map(r => Math.min(r.width, r.height))) : -1,
                      minSlot: slots.length ? Math.min(...slots.map(r => Math.min(r.width, r.height))) : -1};
            }""")
            rec('③ viewport %dx%d' % vp, m['ow'] <= 0 and m['minTile'] >= 64 and m['minSlot'] >= 96,
                'overflowX=%s tile≥%s slot≥%s' % (m['ow'], m['minTile'], m['minSlot']))

        # ⑤ 截图 stdev
        shot = os.path.join(BASE, 'words', '_shots')
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
