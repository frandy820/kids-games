# -*- coding: utf-8 -*-
"""batch7 独立复验 fishcolor（r7 改造版：两步序/间色合成/鱼群游散）
①verify title ②真实点鱼通关 flat0 ③双 viewport+触摸目标 ④离线 ⑤stdev ⑥钩子
⑦0 pageerror ⑧教学吞输入（locked 守卫经公共钩子路径） ⑨零惩罚+首错不 pulse
⑩flat5 sayW 纠错分流（点后步色=fis_wrong_seq / 点干扰色=fis_wrong，均不泄答案）"""
import asyncio, os, sys, statistics
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'fishcolor', 'index.html').replace('\\', '/')
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push(k); return _p(k, t); };
  return true;
})()"""

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # ① verify title
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        title = ''
        await pg.goto(URL + '?verify=1')
        for _ in range(60):                    # r7 verify 含游散轮询单元，放宽到 60s
            title = await pg.title()
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(1000)
        rec('(1) verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title)
        rec('(1) 0 pageerror(verify)', not errs, errs[:1])
        await ctx.close()

        # ⑧ 教学吞输入（watch 锁定窗：真实点击经同一 pointer 处理函数，锁内 tapFish 返回 false）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        r = await pg.evaluate("""async () => {
          const tut = FIS.tutorial;
          const n = document.querySelectorAll('.animal').length;
          const a = await FIS.tapFish(0);
          await new Promise(r2 => setTimeout(r2, 200));
          const b = await FIS.tapFish(Math.min(1, n - 1));
          return {tut, a, b};
        }""")
        rec('(8) 教学吞输入(locked 返回 false)', r.get('tut') == 'watch' and not r.get('a') and not r.get('b'),
            str(r))
        await ctx.close()

        # ②⑨⑩ 真实通关 + 首错零惩罚 + flat5 sayW 纠错分流
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          sv.fis = sv.fis || {}; sv.fis.tutSeen = true;
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(900)
        # 首错：点非目标色鱼（零惩罚+不推进+不 pulse）
        w = await pg.evaluate("""async () => {
          const q = FIS.quiz;
          const act = q.act;
          const i = q.fishes.findIndex((f, idx) => f.c !== q.targets[act] && !q.gone[idx]);
          if (i < 0) return null;
          await FIS.tapFish(i);
          await new Promise(r => setTimeout(r, 500));
          const q2 = FIS.quiz;
          return { miss: q2.miss, step: q2.step, pulse: !!document.querySelector('.pulse') };
        }""")
        rec('(9) 首错零惩罚不 pulse', w and w.get('miss') == 1 and w.get('step') == 0 and not w.get('pulse'),
            str(w))
        # 真实 pointer 逐鱼钓完 5 题
        clicks = await pg.evaluate("""async () => {
          let n = 0;
          for (let s = 0; s < 5; s++) {
            let guard = 0;
            while (guard++ < 12) {
              const q = FIS.quiz;
              if (!q) return n;
              const act = q.act;
              const i = q.fishes.findIndex((f, idx) => f.c === q.targets[act] && !q.gone[idx]);
              if (i < 0) break;
              const el = document.querySelector('.animal[data-i="' + i + '"]');
              if (!el) break;
              el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
              n++;
              await new Promise(r => setTimeout(r, 1000));
            }
            await new Promise(r => setTimeout(r, 1400));
          }
          return n;
        }""")
        lv = await pg.evaluate('FIS.currentLevel')
        celeb = await pg.evaluate("!!document.querySelector('.k-celebrate')")
        rec('(2) 真实点鱼通关 flat0', clicks >= 5 and celeb and lv and lv.get('won'),
            'clicks=%d won=%s flat=%s' % (clicks, lv and lv.get('won'), lv and lv.get('flat')))
        rec('(2) 0 pageerror', not errs, errs[:1])
        # ⑤ stdev
        await pg.wait_for_timeout(400)
        shot = os.path.join(BASE, '_tmp_fis.png')
        await pg.screenshot(path=shot)
        from PIL import Image
        im = Image.open(shot).convert('L')
        sd = statistics.pstdev(list(im.getdata())[::37])
        os.remove(shot)
        rec('(5) 截图非空白 stdev', sd > 5, 'stdev=%.1f' % sd)
        await ctx.close()

        # ⑩ flat5（章 2 两步序）sayW 纠错分流：序错/色错两键分别命中（不泄答案）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          for (let i = 0; i < 5; i++) sv.levels['1-' + i] = {stars: 3};
          sv.fis = sv.fis || {}; sv.fis.tutSeen = true;
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK)
        got = await pg.evaluate("""async () => {
          const realNow = Date.now; let t = realNow() + 20000;   // 起点即过 10s 节流窗
          Date.now = () => t;
          const q = FIS.quiz;
          const out = {};
          const iSeq = q.fishes.findIndex((f, idx) => f.c === q.targets[1] && !q.gone[idx]);
          if (iSeq >= 0) { await FIS.tapFish(iSeq); out.seqR = 'wrong'; }
          t += 11000;                                            // 快进过节流窗再点干扰色
          const iCol = q.fishes.findIndex((f, idx) =>
            f.c !== q.targets[0] && f.c !== q.targets[1] && !q.gone[idx]);
          if (iCol >= 0) { const r = await FIS.tapFish(iCol); out.colR = r; }
          Date.now = realNow;
          out.kind = q.kind;
          out.log = window.__vlog.slice();
          return out;
        }""")
        seq_ok = got and got.get('kind') == 'two' and 'fis_wrong_seq' in (got.get('log') or [])
        col_ok = got and got.get('colR') == 'wrong' and 'fis_wrong' in (got.get('log') or [])
        rec('(10) flat5 sayW 纠错分流(seq=fis_wrong_seq, color=fis_wrong)',
            seq_ok and col_ok, 'vlog=%s' % (got and got.get('log')))
        await ctx.close()

        # ③ 双 viewport
        for vp in [(1280, 800), (800, 1180)]:
            ctx = await browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
            pg = await ctx.new_page()
            await pg.goto(URL)
            await pg.wait_for_timeout(900)
            ov = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            sizes = await pg.evaluate("""() => {
              const out = [];
              document.querySelectorAll('.animal, button').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width > 4 && r.height > 4 && !el.closest('.k-panel') && !el.classList.contains('k-parentbtn')) out.push(Math.min(r.width, r.height));
              });
              return out;
            }""")
            rec('(3) vp%s overflowX=0' % (vp,), ov <= 0, 'ov=%s' % ov)
            rec('(3) vp%s 触摸目标>=64' % (vp,), sizes and min(sizes) >= 64, 'min=%.0f' % (min(sizes) if sizes else -1))
            await ctx.close()

        # ④ 离线
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        reqs = []
        pg.on('request', lambda r: reqs.append(r.url) if r.url.startswith('http') else None)
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        rec('(4) 离线零 http 请求', not reqs, reqs[:2])
        await ctx.close()

        # ⑥ 钩子齐（r7：kind/mix/school）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(900)
        h = await pg.evaluate("""() => {
          const q = FIS.quiz;
          return { cl: !!FIS.currentLevel, q: !!q,
            fields: q ? ['kind','mix','targets','need','got','fishes','gone'].every(k => k in q) : false,
            tap: typeof FIS.tapFish, solve: typeof FIS.autoSolve, tut: typeof FIS.tutorial,
            school: !!FIS.school && typeof FIS.school === 'object' && 'phase' in FIS.school };
        }""")
        rec('(6) 钩子 FIS 齐全(含 kind/mix/school)', h.get('cl') and h.get('q') and h.get('fields') and
            h.get('tap') == 'function' and h.get('solve') == 'function' and
            h.get('tut') != 'undefined' and h.get('school'), str(h))
        await ctx.close()

        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
