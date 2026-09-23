# -*- coding: utf-8 -*-
"""batch10 试玩 P1/M1 修复定向实证（全读实际产物，无头独立 chromium）
T1 simon P1① 错键重播 pos 保留：len3 敲对 1 锤(pos=1)→错第 2 锤→重播回 input→pos 仍=1 且敲对下一锤推进 2
   （旧行为 pos 清零=0，本用例判别力：保留→1 清零→0）
T2 chainsum P1② 首题热身 d≤2：四章首关（flat0/5/10/15）step=0 题 d≤2（40 关全量审计=页面 verify 47/47 内规则臂）
T3 habit P1③ 词短化+字号：当题全部步骤卡词 ≤3 字；.c-word 桌面 ≥21px / 800 宽 ≥18px
T4 habit P3 救援三连脉冲：14s 救援触发后 +1.3s 应点卡仍有 running 动画（单次 1.2s 脉冲此时刻已 finished——判别力）
T5 simon P2 watch 吞输入鼓圈轻闪：真实点击 watch 期鼓→.nudge 类出现（0.34s 窗内）
M1 numCn(0)='零'：页面 verify qSpeech 零型断言（产物 grep 2 处+47/47 PASS）覆盖，本脚本不复测
habit 章池扩容（P2）：页面 verify ①单元 POOLS 三流程池各≥1 规则臂覆盖（47/47 PASS），不复测"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

SEED_JS = """(n) => {
  const sv = KIDS._save();
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.habit = sv.habit || {}; sv.habit.tutSeen = true;
  sv.cs = sv.cs || {}; sv.cs.tutSeen = true;
  sv.si = sv.si || {}; sv.si.tutSeen = true;
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();
}"""

async def newpage(b, game, n, vp={'width': 1280, 'height': 800}):
    ctx = await b.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + (BASE / game / 'index.html').as_posix())
    await pg.wait_for_timeout(900)
    await pg.evaluate(SEED_JS, n)
    await pg.reload()
    await pg.wait_for_timeout(900)
    return ctx, pg, errs

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ---- T1 simon 错键重播 pos 保留（len3 敲对 1 锤后错） ----
        ctx, pg, errs = await newpage(b, 'simon', 5)
        for _ in range(24):
            ph = await pg.evaluate("SI.quiz && SI.quiz.phase")
            if ph == 'input': break
            await pg.wait_for_timeout(500)
        q = await pg.evaluate("SI.quiz")
        await pg.locator('.pad[data-i="%d"]' % q['seq'][0]).click()   # 敲对第 1 锤
        await pg.wait_for_timeout(300)
        pos1 = await pg.evaluate("SI.quiz.pos")
        wp = (q['seq'][1] + 1) % 4                                    # 错第 2 锤
        await pg.locator('.pad[data-i="%d"]' % wp).click()
        await pg.wait_for_timeout(900)
        stw = await pg.evaluate("(() => { const x = SI.quiz; return { ph: x.phase, pos: x.pos, miss: x.miss }; })()")
        for _ in range(20):                                           # 等重播完回 input
            ph = await pg.evaluate("SI.quiz && SI.quiz.phase")
            if ph == 'input': break
            await pg.wait_for_timeout(600)
        q2 = await pg.evaluate("SI.quiz")
        posBack = q2['pos']
        await pg.locator('.pad[data-i="%d"]' % q2['seq'][posBack]).click()   # 从已敲对处继续敲下一锤
        await pg.wait_for_timeout(300)
        posNext = await pg.evaluate("SI.quiz.pos")
        rec('T1 错键重播pos保留(敲对1锤错1锤:回input pos=1非0,再敲推进2)',
            stw['miss'] == 1 and pos1 == 1 and posBack == 1 and posNext == 2 and not errs,
            'pos1=%s miss=%s posBack=%s posNext=%s errs=%s' % (pos1, stw['miss'], posBack, posNext, errs[:1]))
        await ctx.close()

        # ---- T2 chainsum 四章首题热身 d≤2 ----
        ds = {}
        for n in (0, 5, 10, 15):
            ctx, pg, errs = await newpage(b, 'chainsum', n)
            d0 = st = None
            for _ in range(10):
                r = await pg.evaluate("(() => { const q = CS.quiz; return q ? { d: q.d, st: q.step } : null; })()")
                if r: d0, st = r['d'], r['st']; break
                await pg.wait_for_timeout(400)
            ds[n] = d0
            await ctx.close()
        rec('T2 首题热身d<=2(四章flat0/5/10/15)', all(v is not None and v <= 2 for v in ds.values()), 'd=%s' % ds)

        # ---- T3 habit 词短化+字号（桌面/800 宽） ----
        ctx, pg, errs = await newpage(b, 'habit', 5)
        words = await pg.evaluate("[...document.querySelectorAll('.card .c-word')].map(e => e.innerText.trim())")
        fsz = await pg.evaluate("getComputedStyle(document.querySelector('.card .c-word')).fontSize")
        rec('T3a 当题步骤词全<=3字', len(words) >= 4 and all(0 < len(w) <= 3 for w in words), 'words=%s' % words)
        rec('T3b 桌面字号>=21px', fsz and int(fsz.replace('px', '')) >= 21, 'fsz=%s' % fsz)
        await ctx.close()
        ctx, pg, errs = await newpage(b, 'habit', 5, vp={'width': 800, 'height': 1180})
        fsz2 = await pg.evaluate("getComputedStyle(document.querySelector('.card .c-word')).fontSize")
        rec('T3c 800宽字号>=18px', fsz2 and int(fsz2.replace('px', '')) >= 18, 'fsz=%s' % fsz2)
        await ctx.close()

        # ---- T4 habit 救援三连脉冲（+1.3s 仍 running） ----
        ctx, pg, errs = await newpage(b, 'habit', 5)
        await pg.evaluate("window.__t0 = 0; new MutationObserver(rs => { for (const r of rs) if ([...r.target.classList].includes('pulse')) window.__t0 = performance.now(); })"
                          ".observe(document.querySelector('.cards') || document.querySelector('.card').parentElement, { subtree: true, attributes: true, attributeFilter: ['class'] })")
        for _ in range(120):                                          # 静置等 14s 救援
            if await pg.evaluate("window.__t0") > 0: break
            await pg.wait_for_timeout(150)
        t0 = await pg.evaluate("window.__t0")
        await pg.wait_for_timeout(150)
        now = await pg.evaluate("performance.now()")
        await pg.wait_for_timeout(int(1300 - (now - t0)))             # 对齐到脉冲启动后 ~1.3s
        anims = await pg.evaluate("(() => { const el = document.querySelector('.card.pulse'); return el ? el.getAnimations().map(a => a.playState) : []; })()")
        rec('T4 救援三连脉冲(+1.3s仍running)', 'running' in anims, 'anims=%s t0=%s' % (anims, bool(t0)))
        await ctx.close()

        # ---- T5 simon watch 吞输入鼓圈轻闪 ----
        ctx, pg, errs = await newpage(b, 'simon', 5)
        ph = await pg.evaluate("SI.quiz && SI.quiz.phase")
        if ph == 'watch':
            bb = await pg.locator('.pad[data-i="0"]').bounding_box()
            await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
            await pg.wait_for_timeout(120)
            nud = await pg.evaluate("!!document.querySelector('.pad.nudge')")
            ph2 = await pg.evaluate("SI.quiz && SI.quiz.phase")
            rec('T5 watch点击鼓圈nudge轻闪(状态不变)', nud and ph2 == 'watch', 'nudge=%s ph=%s' % (nud, ph2))
        else:
            rec('T5 watch点击鼓圈nudge轻闪(状态不变)', False, 'phase=%s' % ph)
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
