# -*- coding: utf-8 -*-
"""batch14 试玩 P1×4+P2 处置定向实证（2026-09-08）
T1 P1-2 blocks 日终重玩不再回 1-1（dayDone 启动 first=lim-1）
T2 P1-3 numberdet 帮期 breathe 单键指向（键+确认 breathe 总数 ≤1）
T3 P1-4 multibattle 钟长分段 8000/7000/7000/6500
T4 P1-1 负局鼓励层可见（误报关闭：.mb-ov 含 AGAIN_TEXT）
T5 P2③ blocks 教学逐柱高亮演示（误报关闭：.cu.lit 峰值+dbadge 可见）
T6 P2⑥ numberdet 救援中点 pulse3（误报关闭）
T7 P2② multibattle 单错=2★（误报关闭：真实 1 错通关档星=2）
T8 P2④ 帮期换题重播"你来抢答"（10s 节流，第 2 次换题过窗）
T9 P2① core 同类型层去重（连续 dayEnd 只剩 1 层）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : (p.key || 'null')).join('|')); return _q(parts); };
  return true;
})()"""

def seed(game, n, stars=1):
    return """const sv = KIDS._save() || { levels: {} };
  sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%%5)] = { stars: %d };
  sv.%s = { tutSeen: true };
  %s
  KIDS.store.persist();""" % (n, stars, game, 'KIDS.calendar.bonusSet(10);' if n >= 10 else '')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # T1 blocks 日终重玩不回 1-1
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'blocks' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('blocks', 6))       # lim=6 全通 → dayDone
        await pg.reload()
        await pg.wait_for_timeout(2400)
        flat = await pg.evaluate('BK.currentLevel ? BK.currentLevel.flat : -1')
        ovs = await pg.evaluate("document.querySelectorAll('.k-ov.k-dayend').length")
        # 点"再玩玩旧关卡"关层，flat 停留
        await pg.locator('.k-ov.k-dayend button', has_text='再玩玩旧关卡').first.click(force=True, timeout=3000)
        await pg.wait_for_timeout(600)
        flat2 = await pg.evaluate('BK.currentLevel ? BK.currentLevel.flat : -1')
        rec('T1 P1-2 日终重玩落最后一关(非1-1)', flat == 5 and ovs == 1 and flat2 == 5 and not errs,
            'flat=%s→%s ovs=%s errs=%s' % (flat, flat2, ovs, errs[:1]))
        await ctx.close()

        # T2 numberdet 帮期 breathe 单键指向
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        await pg.goto('file:///' + (BASE / 'numberdet' / 'index.html').as_posix())
        await pg.wait_for_timeout(1500)
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(1200)
        # 等教学演示完成（tutSeen 落盘）+ 帮期就位
        tut_seen = False
        for _ in range(80):
            s = await pg.evaluate("(KIDS._save().numberdet || {}).tutSeen")
            if s:
                tut_seen = True
                break
            await pg.wait_for_timeout(400)
        await pg.wait_for_timeout(1800)
        cnt = await pg.evaluate("document.querySelectorAll('#keys .breathe').length + (document.getElementById('ok-btn').classList.contains('breathe') ? 1 : 0)")
        # 逐位点中点数（帮期引导路径），每步后采 breathe 总数
        maxb = cnt
        steps = 0
        while steps < 4:
            mid = await pg.evaluate('ND.quiz ? String(engMid(ND.quiz)) : null')
            if not mid:
                break
            for ch in mid:
                await pg.locator('.key[data-d="%s"]' % ch).first.click(force=True)
                await pg.wait_for_timeout(700)
                c2 = await pg.evaluate("document.querySelectorAll('#keys .breathe').length + (document.getElementById('ok-btn').classList.contains('breathe') ? 1 : 0)")
                maxb = max(maxb, c2)
            await pg.locator('#ok-btn').click(force=True)
            await pg.wait_for_timeout(900)
            steps += 1
            st = await pg.evaluate('ND.quiz')
            if not st:
                break
        rec('T2 P1-3 帮期单键指向(breathe总数≤1)', tut_seen and maxb <= 1 and not errs2,
            'tutSeen=%s maxb=%s errs=%s' % (tut_seen, maxb, errs2[:1]))
        await ctx.close()

        # T3 multibattle 钟长分段
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'multibattle' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        fm = await pg.evaluate('FOE_MS')
        rec('T3 P1-4 钟长分段 8/7/7/6.5s', fm == {'1': 8000, '2': 7000, '3': 7000, '4': 6500}, 'FOE_MS=%s' % fm)
        # T9 core 层去重（同页顺手）
        await pg.evaluate("KIDS.ui.dayEnd({}); KIDS.ui.dayEnd({});")
        n9 = await pg.evaluate("document.querySelectorAll('.k-ov.k-dayend').length")
        rec('T9 P2① core 同类型层去重(连弹两层只留1)', n9 == 1, 'layers=%s' % n9)
        await ctx.close()

        # T4 负局鼓励层可见（ch4 钟改 6.5s：5 题全超时 ≈ 33s+演出）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs4 = []
        pg.on('pageerror', lambda e: errs4.append(str(e)))
        await pg.goto('file:///' + (BASE / 'multibattle' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('multibattle', 15))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        vis = False
        txt = ''
        for _ in range(60):
            ov = await pg.evaluate("(() => { const o = document.querySelector('.mb-ov.show'); return o ? o.textContent : null; })()")
            if ov:
                vis = True
                txt = ov
                break
            await pg.wait_for_timeout(800)
        rec('T4 P1-1 负局层可见含鼓励文案(误报关闭)', vis and ('就差一点点' in txt) and not errs4,
            'vis=%s txt=%s errs=%s' % (vis, txt[:20], errs4[:1]))
        await ctx.close()

        # T5 blocks 教学逐柱高亮（清档首访 watch 期采样）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs5 = []
        pg.on('pageerror', lambda e: errs5.append(str(e)))
        await pg.goto('file:///' + (BASE / 'blocks' / 'index.html').as_posix())
        await pg.wait_for_timeout(1500)
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(800)
        lit_peak, badge_seen = 0, False
        for _ in range(40):
            r = await pg.evaluate("""(() => {
              const lits = document.querySelectorAll('.cu.lit').length;
              const bd = document.querySelectorAll('.dbadge').length;
              const on = document.querySelectorAll('.dbadge:not([style*="display:none"])').length;
              return { l: lits, bd: bd, on: on };
            })()""")
            lit_peak = max(lit_peak, r['l'])
            if r['on'] > 0:
                badge_seen = True
            t = await pg.evaluate("BK.tutorial || 'none'")
            if t != 'watch':
                break
            await pg.wait_for_timeout(350)
        rec('T5 P2③ 教学逐柱高亮+角标可见(误报关闭)', lit_peak >= 1 and badge_seen and not errs5,
            'litPeak=%s badge=%s errs=%s' % (lit_peak, badge_seen, errs5[:1]))
        await ctx.close()

        # T6 numberdet 救援中点 pulse3
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'numberdet' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('numberdet', 1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await pg.wait_for_timeout(16000)            # 静置过 14s 救援阈值
        cls = await pg.evaluate("document.getElementById('mid-dot') ? document.getElementById('mid-dot').className : (document.querySelector('.mid-dot') ? document.querySelector('.mid-dot').className : '')")
        rec('T6 P2⑥ 救援中点 pulse3(误报关闭)', ('pulse3' in cls) and ('on' in cls), 'cls=%s' % cls)
        await ctx.close()

        # T7 multibattle 单错=2★（真实 1 错通关）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs7 = []
        pg.on('pageerror', lambda e: errs7.append(str(e)))
        await pg.goto('file:///' + (BASE / 'multibattle' / 'index.html').as_posix())
        await pg.wait_for_timeout(1500)
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(2200)
        # 等教学结束（help 期首题答对即放手）
        for _ in range(60):
            t = await pg.evaluate("MB.tutorial || 'none'")
            if t in ('none', 'solo'):
                break
            q = await pg.evaluate('MB.quiz')
            if q and t == 'help':
                await pg.locator('.opt[data-i="%d"]' % q['answerIdx']).first.click(force=True)
            await pg.wait_for_timeout(800)
        # 第一题先点 1 次错再点对，其余答对（先等教学收尾演出 880ms 窗结束，否则首错点被 locked 吞）
        await pg.wait_for_timeout(1500)
        first = True
        for _ in range(14):
            q = await pg.evaluate('MB.quiz')
            if not q:
                break
            if first:
                wi = [i for i in range(3) if i != q['answerIdx']][0]
                await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
                await pg.wait_for_timeout(1700)
                first = False
            q = await pg.evaluate('MB.quiz')
            if not q:
                break
            await pg.locator('.opt[data-i="%d"]' % q['answerIdx']).first.click(force=True)
            await pg.wait_for_timeout(1700)
        await pg.wait_for_timeout(3200)
        st7 = await pg.evaluate("(KIDS._save().levels['1-0'] || {}).stars || 0")
        rec('T7 P2② 单错通关=2★(SPEC口径,误报关闭)', st7 == 2 and not errs7, 'stars=%s errs=%s' % (st7, errs7[:1]))
        await ctx.close()

        # T8 帮期换题重播"你来抢答"（开场 1 次+帮期换题 ≥1 次）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs8 = []
        pg.on('pageerror', lambda e: errs8.append(str(e)))
        await pg.goto('file:///' + (BASE / 'multibattle' / 'index.html').as_posix())
        await pg.wait_for_timeout(1500)
        await pg.evaluate(HOOK)
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(800)
        await pg.evaluate(HOOK)                     # reload 后重装
        # 帮期静置：watch(~4s)+交接+对手 8s×2 题 → 第 2 次换题过 10s 节流窗
        for _ in range(60):
            t = await pg.evaluate("MB.tutorial || 'none'")
            if t == 'solo' or t == 'none':
                break
            await pg.wait_for_timeout(1000)
        await pg.wait_for_timeout(2000)
        turns = await pg.evaluate("window.__vlog ? window.__vlog.filter(x => x === 'P:mul_tut_turn').length : -1")
        rec('T8 P2④ 帮期换题重播你来抢答(turn≥2)', turns >= 2 and not errs8, 'turns=%s errs=%s' % (turns, errs8[:1]))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
