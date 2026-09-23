# -*- coding: utf-8 -*-
"""7 岁半玩家评估修复项定向实证（2026-09-06）：
① 三款 flat≥3 静置 25s → 救援语音 ≥1 次（sayR 不受 flat 门）；同时入场常规语音不播（sayP 门仍有效）
② clock 首错不 pulse 正确项 / 连错 2 次 pulse
③ times miss 题（dch4）答错 → tim_miss_hint 专用救援语音
④ times dch3（flat10）答错分组图自动亮起（AID_MAX_DCH=3）且首错不 pulse 答案气泡/鱼，二错才 pulse
⑤ sudoku 填入后 250ms 内连点不清除，超时可清
⑥ sudoku 首次提示不扣星（celebrate stars=3）
⑦ sudoku 无选中点动物 → 按钮 wig 反馈非静默
独立 chromium.launch 无头；不写真实档（每游戏独立 context，种档后即测）。"""
import asyncio, io, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.async_api import async_playwright

BASE = 'file:///F:/claudecode/projects/active/kids-games/batch4'
results = []

def rec(name, ok, detail=''):
    results.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), name, detail)

async def new_ready(ctx, game, seed_flats, extra=''):
    page = await ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    await page.goto(BASE + '/' + game + '/index.html')
    await page.evaluate("""(flats) => {
        const sv = KIDS._save();
        sv.levels = {};                              // 清档再种（同 ctx 前序页面的通关记录会干扰目标关）
        flats.forEach(f => sv.levels[(Math.floor(f/5)+1)+'-'+(f%5)] = {stars:3});
        KIDS.calendar.bonusSet(30); KIDS.store.persist();
    }""", seed_flats)
    await page.reload()
    await page.wait_for_timeout(600)
    await page.evaluate("""() => {          // 语音计数 hook（运行时属性查找，替换即生效）
        window.__vcalls = [];
        const op = KIDS.voice.play.bind(KIDS.voice);
        KIDS.voice.play = (k, t) => { window.__vcalls.push(k); };
    }""")
    return page, errs

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # ============ ① 三款 flat≥3 静置救援 + 入场静音 ============
        for game, key in [('clock', 'clk_hint'), ('times', 'tim_hint'), ('sudoku', 'sud_hint')]:
            ctx = await browser.new_context(viewport={'width': 800, 'height': 1180})
            page, errs = await new_ready(ctx, game, [0, 1, 2])
            lv = await page.evaluate('() => (%s.currentLevel.flat)' %
                                     {'clock': 'CLK', 'times': 'TIM', 'sudoku': 'SUD'}[game])
            await page.wait_for_timeout(1500)
            early = await page.evaluate('() => window.__vcalls.slice()')
            await page.wait_for_timeout(23000)      # idle>20s + 1s 轮询
            calls = await page.evaluate('() => window.__vcalls.slice()')
            ok = lv == 3 and key not in early and key in calls and not errs
            rec('① %s flat3 静置救援(early=%d calls=%s)' % (game, len(early), calls), ok,
                '' if ok else 'lv=%d early=%s calls=%s errs=%s' % (lv, early, calls, errs[:2]))
            await ctx.close()

        # ============ ② clock 首错不 pulse / 二错 pulse ============
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page, errs = await new_ready(ctx, 'clock', [0])
        q = await page.evaluate('() => CLK.quiz')
        w1 = (q['answer'] + 1) % 3
        w2 = (q['answer'] + 2) % 3                  # 二错须换一个错项（同项已灰返回 again 不计数）
        await page.evaluate('() => CLK.pick(%d)' % w1)
        await page.wait_for_timeout(800)
        s1 = await page.evaluate("""() => ({
            pulses: document.querySelectorAll('#answers .opt.pulse').length,
            wrongs: document.querySelectorAll('#answers .opt.wrong').length })""")
        await page.evaluate('() => CLK.pick(%d)' % w2)
        await page.wait_for_timeout(800)
        s2 = await page.evaluate("""() => ({
            pulses: document.querySelectorAll('#answers .opt.pulse').length })""")
        ok = s1['pulses'] == 0 and s1['wrongs'] >= 1 and s2['pulses'] == 1 and not errs
        rec('② clock 首错不pulse/二错pulse', ok, json.dumps({'一错': s1, '二错': s2}))

        # ============ ③④ times：miss 题专用语音 + dch3 辅助 + 首错不指答案 ============
        # ③ dch4 flat15 逐题答对推进到 miss 题
        page, errs = await new_ready(ctx, 'times', list(range(15)))
        lv = await page.evaluate('() => TIM.currentLevel')
        found = False
        for _ in range(6):
            q = await page.evaluate('() => TIM.quiz')
            if not q: break
            if q['type'] == 'miss':
                found = True
                w = (q['answerIdx'] + 1) % 4
                await page.evaluate('() => TIM.pick(%d)' % w)
                await page.wait_for_timeout(700)
                calls = await page.evaluate('() => window.__vcalls.slice()')
                break
            await page.evaluate('() => TIM.pick(TIM.quiz.answerIdx)')
            await page.wait_for_timeout(900)
        ok = found and 'tim_miss_hint' in calls and not errs
        rec('③ times miss题专用救援语音', ok, 'miss=%d calls=%s' % (found, calls))

        # ④ dch3 flat10 答错自动亮分组图；首错无 pulse；二错 pulse（两次须点不同错项——已灰项返回 again）
        page, errs = await new_ready(ctx, 'times', list(range(10)))
        q = await page.evaluate('() => TIM.quiz')
        wrongs = [i for i in range(4) if i != q['answerIdx']]
        await page.evaluate('() => TIM.pick(%d)' % wrongs[0])
        await page.wait_for_timeout(800)
        s1 = await page.evaluate("""() => ({
            aidOpen: document.getElementById('aid').classList.contains('open'),
            aidPulse: document.querySelectorAll('#aid .aid-ans.pulse').length,
            fishPulse: document.querySelectorAll('#fish-grid .fish-btn.pulse').length })""")
        await page.evaluate('() => TIM.pick(%d)' % wrongs[1])
        await page.wait_for_timeout(800)
        s2 = await page.evaluate("""() => ({
            aidOpen: document.getElementById('aid').classList.contains('open'),
            aidPulse: document.querySelectorAll('#aid .aid-ans.pulse').length,
            fishPulse: document.querySelectorAll('#fish-grid .fish-btn.pulse').length })""")
        ok = s1['aidOpen'] and s1['aidPulse'] == 0 and s1['fishPulse'] == 0 and \
             s2['aidPulse'] == 1 and s2['fishPulse'] == 1 and not errs
        rec('④ times dch3辅助+首错不指答案', ok, json.dumps({'一错': s1, '二错': s2}))
        await ctx.close()

        # ============ ⑤⑥⑦ sudoku ============
        ctx = await browser.new_context(viewport={'width': 800, 'height': 1180})
        page, errs = await new_ready(ctx, 'sudoku', [0])
        # ⑤ 双击保护：钩子 fill 记 lastFill → 立即 DOM 点同格（<250ms）不清；等 320ms 再点可清
        st = await page.evaluate("""() => {
            const b = SUD.board, sol = SUD.solution;
            let i = -1;
            for (let k = 0; k < b.cells.length; k++) if (!b.given[k] && b.cells[k] < 0) { i = k; break; }
            SUD.fill(i, sol[i]);
            return { i: i, v: sol[i] };
        }""")
        await page.click('.cell[data-i="%d"]' % st['i'])   # 立即（<250ms）
        c1 = await page.evaluate('(i) => SUD.board.cells[i]', st['i'])
        await page.wait_for_timeout(320)
        await page.click('.cell[data-i="%d"]' % st['i'])   # 超时后可清
        c2 = await page.evaluate('(i) => SUD.board.cells[i]', st['i'])
        ok = c1 == st['v'] and c2 == -1 and not errs
        rec('⑤ sudoku 双击不清/超时可清', ok, '立即=%s(期望%d) 超时=%s(期望-1)' % (c1, st['v'], c2))

        # ⑦ 无选中点动物 → wig 反馈
        await page.evaluate('() => SUD.fill(%d, %d)' % (st['i'], st['v']))  # 复原格值（sel 已被清空路径置 -1 或保持）
        sel_before = await page.evaluate('() => SUD.board.sel')
        await page.click('.abtn[data-a="0"]')
        wig = await page.evaluate("""() => document.querySelector('.abtn[data-a="0"]').classList.contains('wig')""")
        ok = sel_before == -1 and wig and not errs
        rec('⑦ sudoku 无选中点动物wig反馈', ok, 'sel=%s wig=%s' % (sel_before, wig))

        # ⑥ 首次提示不扣星：新关 hint 1 次 → autoSolve → celebrate stars=3
        await page.evaluate("""() => {
            window.__stars = [];
            KIDS.ui.celebrate = (s) => { window.__stars.push(s); return Promise.resolve({closed:true}); };
        }""")
        await page.evaluate('() => SUD.hint()')
        used = await page.evaluate('() => SUD.currentLevel.hintsUsed')
        await page.evaluate('() => SUD.autoSolve()')
        await page.wait_for_timeout(800)
        stars = await page.evaluate('() => window.__stars')
        ok = used == 1 and stars == [3] and not errs
        rec('⑥ sudoku 首次提示不扣星', ok, 'hintsUsed=%d stars=%s' % (used, stars))
        await ctx.close()

        await browser.close()

    n_ok = sum(1 for _, ok, _ in results if ok)
    print('\nRESULT: %d/%d' % (n_ok, len(results)))
    sys.exit(0 if n_ok == len(results) else 1)

asyncio.run(main())
