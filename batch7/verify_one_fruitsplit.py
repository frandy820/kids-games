# -*- coding: utf-8 -*-
"""batch7 首单元门禁·独立复验 fruitsplit r7（读实际产物，不采信 agent 自报；断言从 SPEC 推导）
①verify title ②真实点击通关 flat0（cut 两段） ③双 viewport+触摸目标 ④离线 ⑤stdev ⑥钩子
⑦0 pageerror ⑧教学吞输入 ⑨零惩罚+首错不 pulse ⑩flat5 sayW 纠错 ⑪cut 真实点刀→判定段
⑫r7 玩法专项：等分选择（人数图示+切法三选项+分块等角）/ 非等分陷阱（不公平指出→重切）/
   多人等分分布（2/3/4 人数全覆盖）+ 单关 modeled 时长 ≥40s 硬断言"""
import asyncio, os, sys, statistics
from datetime import date, timedelta
from playwright.async_api import async_playwright

OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12（可到 flat10+）

BASE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(BASE, 'fruitsplit', 'index.html')
URL = 'file:///' + GAME.replace('\\', '/')
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

SEED_TUT = """() => {
  const sv = KIDS._save();
  sv.fru = sv.fru || {}; sv.fru.tutSeen = true;
  KIDS.store.persist();
}"""

# SPEC 推导常量（独立重列，禁从实现归纳）：n 人正确切法 / 份数不对干扰 / 展示角跨度
CORRECT_CUT = {2: 'halves', 3: 'thirds', 4: 'quarters'}
WRONGN_CUT = {2: 'quarters', 3: 'quarters', 4: 'thirds'}
SPAN_EQUAL, SPAN_UNFAIR = 180, 120


async def drive_win(pg):
    """真实 PointerEvent 打完当前关：pick/choose/fair→.card，cut→刀+公平判定两段"""
    n = 0
    for _ in range(14):
        q = await pg.evaluate('FRU.quiz')
        if not q:
            break
        if q['mode'] == 'cut':
            if not q['cutDone']:
                await pg.evaluate(
                    "document.getElementById('btn-knife').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))")
                await pg.wait_for_timeout(1500)
            else:
                await pg.evaluate(
                    "document.querySelector('#judge-row .card[data-i=\"%d\"]').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))"
                    % q['answerIdx'])
                await pg.wait_for_timeout(2900)
            n += 1
            continue
        sel = ('.mopt' if q['mode'] == 'match' else '.card') + '[data-i="%d"]' % q['answerIdx']
        await pg.evaluate(
            "document.querySelector('%s').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))" % sel)
        n += 1
        await pg.wait_for_timeout(1300 if q['mode'] in ('pick', 'match') else 3000)
    return n


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # ① verify title（轮询：40 关审计+时长分账耗时）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '?verify=1')
        title = ''
        for _ in range(20):
            title = await pg.title()
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(1000)
        rec('(1) verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title)
        rec('(1) 0 pageerror(verify)', not errs, errs[:1])
        vj = await pg.evaluate("JSON.parse(document.getElementById('verify-result').textContent)")
        lv_all = list(vj['levels'].values()) + list(vj['gen'].values())
        rec('(12d) 单关 modeled 时长全部 ≥40s（40 关硬断言）',
            vj['pass'] == vj['total'] and all(v['durOk'] for v in lv_all) and min(v['ms'] for v in lv_all) >= 40000,
            'min=%dms' % min(v['ms'] for v in lv_all))
        pd = vj['units']['dist']['parts']
        rec('(12c) 多人等分全覆盖（2/3/4 人数都出现）',
            pd['2'] > 0 and pd['3'] > 0 and pd['4'] > 0, str(pd))
        await ctx.close()

        # ⑧ 教学吞输入（干净档教学锁定窗内点击不推进——演示 tap 前读 step 恒 0）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        tut = await pg.evaluate('FRU.tutorial')
        for _ in range(2):
            await pg.locator('.card').first.dispatch_event('pointerdown')
            await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(400)          # t≈1500 < 演示 tap ~1920
        st = await pg.evaluate('FRU.currentLevel && FRU.currentLevel.step')
        rec('(8) 教学吞输入', tut and st == 0, 'tut=%s step@1500ms=%s' % (bool(tut), st))
        await ctx.close()

        # ②⑨ 真实点击通关 flat0（种 tutSeen 跳教学）+ 首错零惩罚不 pulse
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        await pg.evaluate(SEED_TUT)
        await pg.reload()
        await pg.wait_for_timeout(900)
        first_wrong = await pg.evaluate("""async () => {
          const q = FRU.quiz;
          if (q.mode !== 'pick') return 'notpick';
          const wrong = q.options.findIndex((_, i) => i !== q.answerIdx);
          await FRU.tapOption(wrong);
          await new Promise(r => setTimeout(r, 500));
          const card = document.querySelector('.card[data-i="' + wrong + '"]');
          return { grey: card && card.classList.contains('wrong'),
                   pulse: !!document.querySelector('.pulse') };
        }""")
        ok = isinstance(first_wrong, dict) and first_wrong.get('grey') and not first_wrong.get('pulse')
        rec('(9) 首错零惩罚灰掉+不 pulse', ok, str(first_wrong))
        clicks = await drive_win(pg)            # 首错后从 quiz0 续打（灰卡不阻）
        lv = await pg.evaluate('FRU.currentLevel')
        celeb = await pg.evaluate("!!document.querySelector('.k-celebrate')")
        rec('(2) 真实点击通关 flat0（cut 两段=7 acts）',
            clicks >= 7 and celeb and lv and lv.get('won'),
            'clicks=%d won=%s flat=%s' % (clicks, lv and lv.get('won'), lv and lv.get('flat')))
        rec('(2) 0 pageerror', not errs, errs[:1])
        # ⑤ stdev 非空白
        await pg.wait_for_timeout(400)
        shot = os.path.join(BASE, '_tmp_fru.png')
        await pg.screenshot(path=shot)
        from PIL import Image
        im = Image.open(shot).convert('L')
        sd = statistics.pstdev(list(im.getdata())[::37])
        os.remove(shot)
        rec('(5) 截图非空白 stdev', sd > 5, 'stdev=%.1f' % sd)
        # ⑥ 钩子（r7 扩展字段 parts/fairIsFair/judging + getter 拷贝）
        hooks = await pg.evaluate("""() => {
          const out = {};
          out.present = !!(FRU && FRU.currentLevel && FRU.tapOption && FRU.doCut && FRU.autoSolve
            && FRU.tutorial !== undefined && typeof FRU.quiz !== 'undefined');
          const cp = FRU.quiz;                     // 关间空窗 quiz 可为 null：拷贝检查只在有题时做
          if (cp) { const b = cp.options.length; cp.options.push('x'); cp.target = -99;
            out.copy = FRU.quiz.options.length === b && FRU.quiz.target !== -99; out.hadQuiz = true; }
          return out;
        }""")
        rec('(6) 钩子齐全+getter 拷贝', hooks.get('present') and (not hooks.get('hadQuiz') or hooks.get('copy')), str(hooks))
        await ctx.close()

        # ⑩ flat5 sayW 纠错（quiz0=fair 首错播 fru_wrong）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          for (let i = 0; i < 5; i++) sv.levels['1-' + i] = {stars: 3};
          sv.fru = sv.fru || {}; sv.fru.tutSeen = true;
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK)
        got = await pg.evaluate("""async () => {
          const q = FRU.quiz;
          if (!q || q.mode !== 'fair') return null;
          const wrong = q.options.findIndex((_, i) => i !== q.answerIdx);
          await FRU.tapOption(wrong);
          return window.__vlog;
        }""")
        rec('(10) flat5 首错 sayW 播 fru_wrong', got is not None and 'fru_wrong' in got, 'vlog=%s' % got)
        await ctx.close()

        # ③ 双 viewport overflowX+触摸目标（card/cutcard/fbtn/mopt/knife 全查）
        for vp in [(1280, 800), (800, 1180)]:
            ctx = await browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
            pg = await ctx.new_page()
            await pg.goto(URL)
            await pg.wait_for_timeout(900)
            ov = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            sizes = await pg.evaluate("""() => {
              const out = [];
              document.querySelectorAll('.card, .mopt, #btn-knife, .k-replay').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width > 4 && r.height > 4) out.push(Math.min(r.width, r.height));
              });
              return out;
            }""")
            rec('(3) vp%s overflowX=0' % (vp,), ov <= 0, 'ov=%s' % ov)
            rec('(3) vp%s 触摸目标>=64' % (vp,), sizes and min(sizes) >= 64, 'min=%.0f' % (min(sizes) if sizes else -1))
            await ctx.close()

        # ④ 离线断言（运行时零 http 请求）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        reqs = []
        pg.on('request', lambda r: reqs.append(r.url) if r.url.startswith('http') else None)
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        rec('(4) 离线零 http 请求', not reqs, reqs[:2])
        await ctx.close()

        # ⑪ cut 真实点刀端到端（flat1 quiz1：答 quiz0 → 点刀 → judge-row → 点公平推进）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          sv.levels['1-0'] = {stars: 3};
          sv.fru = sv.fru || {}; sv.fru.tutSeen = true;
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(900)
        r = await pg.evaluate("""async () => {
          const q0 = FRU.quiz;
          await FRU.tapOption(q0.answerIdx);           // quiz0(pick) 推进到 quiz1(cut)
          await new Promise(r2 => setTimeout(r2, 1200));
          const q = FRU.quiz;
          if (!q || q.mode !== 'cut') return {skip: true, mode: q && q.mode};
          document.getElementById('btn-knife').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
          await new Promise(r2 => setTimeout(r2, 1600));
          const row = !!document.getElementById('judge-row');
          const nbtn = document.querySelectorAll('#judge-row .card').length;
          const judging = FRU.currentLevel.judging;
          const rj = await FRU.tapOption(q.answerIdx); // 判定对
          await new Promise(r2 => setTimeout(r2, 2900));
          return {skip: false, row, nbtn, judging, judged: rj,
                  step: FRU.currentLevel.step, done: FRU.currentLevel.done};
        }""")
        ok11 = (not r.get('skip')) and r.get('row') and r.get('nbtn') == 2 and r.get('judging') and \
               r.get('judged') in ('right', 'done')
        rec('(11) cut 真实点刀→判定段→点公平推进', ok11, str(r))
        rec('(11) 0 pageerror', not errs, errs[:1])
        await ctx.close()

        # ⑫a 等分选择专项（flat10 quiz0=choose 3 人：图示/切法选项/分块等角）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          sv.firstDay = '__OLD__';                // dayIndex≥3 → 日限 12（flat10 可达）
          for (let i = 0; i < 10; i++) sv.levels[(i / 5 | 0) + 1 + '-' + i % 5] = {stars: 3};
          sv.fru = sv.fru || {}; sv.fru.tutSeen = true;
          KIDS.store.persist();
        }""".replace('__OLD__', OLD))
        await pg.reload()
        await pg.wait_for_timeout(900)
        q10 = await pg.evaluate('FRU.quiz')
        cho = await pg.evaluate("""() => ({
          people: document.querySelectorAll('#cho-people .dhead').length,
          cuts: [...document.querySelectorAll('.card.cutcard svg[data-cut]')].map(s => s.getAttribute('data-cut')),
          parts: FRU.quiz.parts});""")
        want = {CORRECT_CUT[cho['parts']], 'unfair', WRONGN_CUT[cho['parts']]}
        rec('(12a) 等分选择：人数图示=parts+切法三选项（正确+unfair+wrongN）',
            q10 and q10['mode'] == 'choose' and cho['people'] == cho['parts']
            and set(cho['cuts']) == want, 'parts=%s people=%s cuts=%s' % (cho['parts'], cho['people'], cho['cuts']))
        mid = await pg.evaluate("""async () => {
          FRU.tapOption(FRU.quiz.answerIdx);            // 不 await：演出窗内轮询取样（渲染替换前）
          let got = null;
          for (let t = 0; t < 12 && !got; t++) {        // 300ms×12=3.6s 内捕获分块+娃娃
            await new Promise(r => setTimeout(r, 300));
            const spans = [...document.querySelectorAll('#cho-fruit .chop svg')].map(s => +s.getAttribute('data-span'));
            const takers = document.querySelectorAll('#cho-takers .taker').length;
            if (spans.length && takers) got = {spans, takers};
          }
          return Object.assign({spans: [], takers: 0, parts: %d}, got || {});
        }""" % cho['parts'])
        rec('(12a) 等分切开：n 块等角(360/n)+n 娃娃各拿一块',
            mid['spans'] == [360 // cho['parts']] * cho['parts'] and mid['takers'] == cho['parts'], str(mid))
        await ctx.close()

        # ⑫b 非等分陷阱专项（flat5：quiz0/quiz2 fair 双态互补——不公平题指出后重切成等大）
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(800)
        await pg.evaluate("""() => {
          const sv = KIDS._save();
          for (let i = 0; i < 5; i++) sv.levels['1-' + i] = {stars: 3};
          sv.fru = sv.fru || {}; sv.fru.tutSeen = true;
          KIDS.store.persist();
        }""")
        await pg.reload()
        await pg.wait_for_timeout(900)
        trap = await pg.evaluate("""async () => {
          const out = {seen: []};
          for (let s = 0; s < 5; s++) {
            const q = FRU.quiz;
            if (!q) break;
            if (q.mode === 'fair') {
              const spans = [...document.querySelectorAll('#fair-show .fpiece')].map(p => +p.getAttribute('data-span'));
              out.seen.push({fair: q.fairIsFair, spans});
              if (q.fairIsFair === false) {              // 不公平题：展示不等大→答对→重切成等大
                out.unfairShow = spans[0] !== spans[1];
                FRU.tapOption(q.answerIdx);            // 不 await：重切演出窗内轮询取样
                for (let t = 0; t < 12 && !out.recut; t++) {   // 300ms×12：捕获 .recut 与等大两块
                  await new Promise(r => setTimeout(r, 300));
                  if (document.querySelector('#fair-show.recut')) {
                    out.recut = true;
                    out.after = [...document.querySelectorAll('#fair-show .fpiece')].map(p => +p.getAttribute('data-span'));
                  }
                }
                break;
              }
              await FRU.tapOption(q.answerIdx);          // 公平题直接过
              await new Promise(r => setTimeout(r, 2900));
            } else if (q.mode === 'cut') {
              if (!q.cutDone) await FRU.doCut();
              else await FRU.tapOption(q.answerIdx);
              await new Promise(r => setTimeout(r, 2200));
            } else {
              await FRU.tapOption(q.answerIdx);
              await new Promise(r => setTimeout(r, 2900));
            }
          }
          return out;
        }""")
        seen_ok = len(trap.get('seen') or []) >= 1 and \
            all((s['spans'][0] == s['spans'][1]) == s['fair'] for s in trap['seen'])
        unfair_ok = trap.get('unfairShow') and trap.get('recut') and \
                    trap.get('after') == [SPAN_EQUAL, SPAN_EQUAL]
        rec('(12b) 非等分陷阱：不公平展示一大一小+指出后重切等大',
            unfair_ok, 'seen=%s after=%s recut=%s' % (trap.get('seen'), trap.get('after'), trap.get('recut')))
        rec('(12b) fair 展示与判定一致（公平=等大/不公平=不等大）', seen_ok, str(trap.get('seen')))
        rec('(12b) 0 pageerror', not errs, errs[:1])
        await ctx.close()

        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
