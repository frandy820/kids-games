# -*- coding: utf-8 -*-
"""batch7 独立复验 hopscotch（r7 难度改造后；首单元门禁已由 fruitsplit 15/15 过闸）
①verify title ②真实逐格点击通关 flat0 ③双 viewport+触摸目标（span10+span20 两场景）④离线
⑤stdev ⑥钩子（含 mode/span）⑦0 pageerror ⑧教学吞输入 ⑨零惩罚+首错不泄（r7 恒无 pulse）
⑩flat5 sayW 播 hop_wrong ⑪r7 规则审计（六章 span/藏格=inner 全集/跳 2 链/确定性/时长≥40s 独立副本）
⑫跳 2 模式（±1=far±2=step + sayW 播 hop_wrong2）
断言从 SPEC-BATCH7 §3-r7 文字重列推导，禁从实现归纳。"""
import asyncio, os, sys, statistics
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'hopscotch', 'index.html').replace('\\', '/')
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

# 独立副本：SPEC §3-r7 时长模型（estMs=n*345+600；hop 1800/藏格 2600/到旗 900；单关 ≥40000ms）
DUR_JS = """(() => {
  const EST = c => c * 345 + 600, HOP = 1800, HID = 2600, GOAL = 900, MIN = 40000;
  const num = n => n <= 9 ? '一二三四五六七八九'[n - 1] : n === 10 ? '十'
    : n <= 19 ? '十' + '一二三四五六七八九'[n - 11] : '二十';
  const out = [];
  for (let f = 0; f < 50; f++) {   // r7 审查 m-3：对齐页内 50 关（flat45-49 也入独立复算）
    const L = genLevel(f);
    let ms = 0;
    for (const q of L.quizzes) {
      const st = q.mode === 2 ? 2 : 1;
      let pos = q.from;
      for (let h = 0; h < q.len / st; h++) {
        pos += st * q.dir;
        ms += q.hidden.indexOf(pos) >= 0 ? HID : HOP;
      }
      const head = q.mode === 2 ? (q.dir > 0 ? '两块两块跳，跳到' : '两块两块往回跳，跳到')
                                : (q.dir > 0 ? '跳到' : '往回跳，跳到');
      ms += EST((head + num(q.to)).length) + GOAL;
    }
    out.push({f, dch: L.dch, ms});
  }
  return {n: out.length, minMs: Math.min(...out.map(o => o.ms)),
          bad: out.filter(o => o.ms < MIN).map(o => o.f)};
})()"""

# 独立副本：SPEC §3-r7 六章规则审计（章区间/藏格=inner 全集/跳 2 偶奇链/确定性/span）
RULES_JS = """(() => {
  const SP = {1: 10, 2: 20, 3: 20, 4: 10, 5: 20, 6: 20};
  const bad = [];
  for (let f = 0; f < 30; f++) {
    const L1 = genLevel(f), L2 = genLevel(f);
    if (JSON.stringify(L1.quizzes) !== JSON.stringify(L2.quizzes)) bad.push(f + ':nondet');
    if (L1.span !== SP[L1.dch]) bad.push(f + ':span');
    L1.quizzes.forEach((q, k) => {
      const inner = [];
      for (let v = Math.min(q.from, q.to) + 1; v < Math.max(q.from, q.to); v++) inner.push(v);
      const hidAll = q.hidden.length === inner.length && inner.every(v => q.hidden.indexOf(v) >= 0);
      let ok = true;
      if (L1.dch === 1) ok = q.from === 1 && q.to >= 5 && q.to <= 8 && q.dir === 1 && !q.hidden.length;
      else if (L1.dch === 2) ok = q.dir === 1 && q.to >= 15 && q.to <= 20 && q.len >= 4 && q.len <= 8 && !q.hidden.length;
      else if (L1.dch === 3) ok = q.dir === -1 && q.len >= 5 && q.len <= 8 && !q.hidden.length;
      else if (L1.dch === 4) ok = q.len >= 4 && q.len <= 8 && hidAll &&
        (k % 2 === 0 ? q.from === 1 : q.to === 1);
      else if (L1.dch === 5) ok = q.len >= 4 && q.len <= 8 && hidAll && Math.max(q.from, q.to) >= 14;
      else ok = q.mode === 2 && q.dir === 1 && !q.hidden.length && q.len % 2 === 0 &&
        q.len >= 6 && q.len <= 14 &&
        (k % 2 === 0 ? q.from === 2 && q.to % 2 === 0 : q.from === 1 && q.to % 2 === 1);
      if (!ok) bad.push(f + ':q' + k);
    });
  }
  return {n: 30, bad: bad.slice(0, 5), badN: bad.length};
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
        for _ in range(15):
            title = await pg.title()
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(1000)
        rec('(1) verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title)
        rec('(1) 0 pageerror(verify)', not errs, errs[:1])
        await ctx.close()

        # ⑧ 教学吞输入（watch 锁定窗内 tapCell 经公共钩子返回 false）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        r = await pg.evaluate("""async () => {
          const tut = HOP.tutorial;
          const a = await HOP.tapCell(2);
          const b = await HOP.tapCell(3);
          return {tut, a, b};
        }""")
        rec('(8) 教学吞输入(locked 返回 false)',
            r.get('tut') == 'watch' and not r.get('a') and not r.get('b'), str(r))
        await ctx.close()

        # ②⑨ 真实通关 + 首错零惩罚（flat0=dch1 mode1）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          sv.hop = sv.hop || {}; sv.hop.tutSeen = true;
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(900)
        # 首错：点步长外格——零惩罚不推进且 r7 全场无 pulse（去逐格发光兜底）
        w = await pg.evaluate("""async () => {
          const q = HOP.quiz;
          const step = q.mode === 2 ? 2 : 1;
          const far = q.cur + (q.to > q.from ? step + 1 : -(step + 1));
          if (far < 1 || far > HOP.currentLevel.span) return null;
          await HOP.tapCell(far);
          await new Promise(r => setTimeout(r, 500));
          const q2 = HOP.quiz;
          return { cur: q2.cur, step: q2.step, pulse: document.querySelectorAll('.cell.pulse').length,
                   miss: q2.miss };
        }""")
        rec('(9) 首错零惩罚+恒无 pulse', w and w.get('cur') is not None and not w.get('pulse')
            and w.get('miss') == 1, str(w))
        # 真实 pointer 逐落点通关 5 题
        clicks = await pg.evaluate("""async () => {
          let n = 0;
          for (let s = 0; s < 5; s++) {
            let guard = 0;
            while (guard++ < 10) {
              const q = HOP.quiz;
              if (!q) return n;
              const st = q.mode === 2 ? 2 : 1;
              const next = q.cur + (q.to > q.cur ? st : -st);
              const el = document.querySelector('.cell[data-n="' + next + '"]');
              if (!el) break;
              el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
              n++;
              await new Promise(r => setTimeout(r, 700));
              const q2 = HOP.quiz;
              if (!q2 || q2.step !== s) break;   // 该题完成（quiz 换题或 null）
            }
            await new Promise(r => setTimeout(r, 1300));
          }
          return n;
        }""")
        lv = await pg.evaluate('HOP.currentLevel')
        celeb = await pg.evaluate("!!document.querySelector('.k-celebrate')")
        rec('(2) 真实逐格通关 flat0', clicks >= 5 and celeb and lv and lv.get('won'),
            'clicks=%d won=%s flat=%s' % (clicks, lv and lv.get('won'), lv and lv.get('flat')))
        rec('(2) 0 pageerror', not errs, errs[:1])
        # ⑤ stdev
        await pg.wait_for_timeout(400)
        shot = os.path.join(BASE, '_tmp_hop.png')
        await pg.screenshot(path=shot)
        from PIL import Image
        im = Image.open(shot).convert('L')
        sd = statistics.pstdev(list(im.getdata())[::37])
        os.remove(shot)
        rec('(5) 截图非空白 stdev', sd > 5, 'stdev=%.1f' % sd)
        await ctx.close()

        # ⑩ flat5(=dch2) sayW 首错播 hop_wrong（mode1 纠错）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          for (let i = 0; i < 5; i++) sv.levels['1-' + i] = {stars: 3};
          sv.hop = sv.hop || {}; sv.hop.tutSeen = true;
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK)
        got = await pg.evaluate("""async () => {
          const q = HOP.quiz;
          const step = q.mode === 2 ? 2 : 1;
          const far = q.cur + (q.to > q.from ? step + 2 : -(step + 2));
          if (far < 1 || far > HOP.currentLevel.span) return null;
          await HOP.tapCell(far);
          return window.__vlog;
        }""")
        rec('(10) flat5(dch2) 首错 sayW 播 hop_wrong', got is not None and 'hop_wrong' in got,
            'vlog=%s' % got)
        await ctx.close()

        # ⑪ r7 规则审计（独立副本：六章规则/确定性/span + 时长 ≥40s）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        rules = await pg.evaluate(RULES_JS)
        rec('(11) r7 六章规则+确定性+span 审计 30 关', rules.get('n') == 30 and not rules.get('badN'),
            str(rules))
        dur = await pg.evaluate(DUR_JS)
        rec('(11) r7 时长独立副本 50 关每关 ≥40s',
            dur.get('n') == 50 and not dur.get('bad'), 'minMs=%s bad=%s' % (dur.get('minMs'), dur.get('bad')))
        await ctx.close()

        # ⑫ 跳 2 模式（flat25=dch6：±1=far/±2=step + sayW 播 hop_wrong2 + 非链减淡）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          for (let i = 0; i < 25; i++) sv.levels[(i / 5 | 0) + 1 + '-' + i % 5] = {stars: 3};
          sv.hop = sv.hop || {}; sv.hop.tutSeen = true;
          KIDS.calendar.bonusSet(30);   // 日限加成→今日新关未完，可进 flat25（r7 修复：原手拼 toISOString
                                        // =UTC 日期键，本地凌晨 0-8 点与 core 本地日期键错位→bonus 失效）
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK)
        r6 = await pg.evaluate("""async () => {
          const lv = HOP.currentLevel, q = HOP.quiz;
          if (!q || q.mode !== 2) return null;
          const a = await HOP.tapCell(q.cur + 1);           // 只跳一格：far
          const b = await HOP.tapCell(q.from + 2 * q.dir);  // 跳两格：step
          return { far: a, step: b, cur: HOP.quiz.cur, want: q.from + 2 * q.dir,
                   miss: HOP.quiz.miss, span: lv.span, vlog: window.__vlog,
                   off: [...document.querySelectorAll('.cell.off')].length };
        }""")
        rec('(12) flat25(dch6) mode2: ±1=far ±2=step 链减淡',
            r6 and r6.get('far') == 'far' and r6.get('step') == 'step'
            and r6.get('cur') == r6.get('want') and r6.get('span') == 20
            and r6.get('off') == 10, str(r6))
        rec('(12) mode2 首错 sayW 播 hop_wrong2',
            r6 and 'hop_wrong2' in (r6.get('vlog') or []), 'vlog=%s' % (r6 and r6.get('vlog')))
        rec('(12) 0 pageerror', not errs, errs[:1])
        await ctx.close()

        # ③ 双 viewport（fresh=flat0 span10 / 预置25关=flat25 dch6 span20）
        for vp, flats in [((1280, 800), ()), ((800, 1180), tuple(range(25)))]:
            ctx = await browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
            pg = await ctx.new_page()
            if flats:
                import time as _t
                from datetime import date as _d, timedelta as _td
                today = _t.strftime('%Y-%m-%d')
                old = (_d.today() - _td(days=3)).strftime('%Y-%m-%d')
                save = {'v': '1.0', 'game': 'hopscotch', 'firstDay': old,
                        'lastDay': today, 'levels': {}, 'dailyMin': {}, 'bonus': {today: 30},
                        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
                        'restTip': {'day': '', 'shown': 0}, 'hop': {'tutSeen': True}}
                import json as _j
                for f in flats:
                    save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
                await pg.add_init_script(
                    'localStorage.setItem("kidsgame_hopscotch", %s)' % _j.dumps(_j.dumps(save)))
            await pg.goto(URL)
            await pg.wait_for_timeout(900)
            ov = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            sizes = await pg.evaluate("""() => {
              const out = [];
              document.querySelectorAll('.cell, button').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width > 4 && r.height > 4 && !el.closest('.k-panel') && !el.classList.contains('k-parentbtn')) out.push(Math.min(r.width, r.height));
              });
              return out;
            }""")
            cells = await pg.evaluate("document.querySelectorAll('.cell').length")
            span = await pg.evaluate('HOP.currentLevel && HOP.currentLevel.span')
            rec('(3) vp%s overflowX=0' % (vp,), ov <= 0, 'ov=%s' % ov)
            rec('(3) vp%s 触摸目标>=64' % (vp,), sizes and min(sizes) >= 64,
                'min=%.0f' % (min(sizes) if sizes else -1))
            rec('(3) vp%s 格数=span(%s)' % (vp, span), cells == span, 'cells=%s' % cells)
            await ctx.close()

        # ④ 离线 + ⑥ 钩子
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        reqs = []
        pg.on('request', lambda r: reqs.append(r.url) if r.url.startswith('http') else None)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        rec('(4) 离线零 http 请求', not reqs, reqs[:2])
        h = await pg.evaluate("""() => {
          const q = HOP.quiz;
          return { cl: !!HOP.currentLevel,
            fields: q ? ['from','to','dir','mode','span','cur'].every(k => k in q) : false,
            tap: typeof HOP.tapCell, solve: typeof HOP.autoSolve, tut: typeof HOP.tutorial };
        }""")
        rec('(6) 钩子 HOP 齐全(含 mode/span)', h.get('cl') and h.get('fields') and h.get('tap') == 'function'
            and h.get('solve') == 'function' and h.get('tut') != 'undefined', str(h))
        rec('(4) 0 pageerror', not errs, errs[:1])
        await ctx.close()

        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
