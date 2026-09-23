# -*- coding: utf-8 -*-
"""clock 章 3 拖拨分针独立复验：种档直进 flat10（dial 题型），真实 PointerEvent
①错拖→retries+1 不推进 ②对拖→readout=目标+推进。独立 chromium.launch 无头。"""
import asyncio, io, sys, json, math
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.async_api import async_playwright

URL = 'file:///F:/claudecode/projects/active/kids-games/batch4/clock/index.html'

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 800, 'height': 1180})
        page = await ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(URL)
        await page.evaluate("""() => {
            const sv = KIDS._save();
            for (let f = 0; f < 10; f++) sv.levels[(Math.floor(f/5)+1)+'-'+(f%5)] = {stars:3};
            sv.clock = Object.assign({}, sv.clock, {dialSeen: true});   // 跳过章3首进拨针演示（约3.8s，教学链路已另行验证）
            KIDS.calendar.bonusSet(6); KIDS.store.persist();
        }""")
        await page.reload()
        await page.wait_for_timeout(700)
        lv = await page.evaluate('() => CLK.currentLevel')
        print('level:', json.dumps(lv))
        assert lv['flat'] == 10, '未进章3首关'

        DRAG = """(target) => {
            const card = document.querySelector('.clock-card.drag');
            if (!card) return {err: 'no card'};
            const svg = card.querySelector('svg.clock');
            const r = svg.getBoundingClientRect();
            const cx = r.left + r.width/2, cy = r.top + r.height/2, R = r.width * 0.38;
            const ang = target * 6 * Math.PI / 180;          // 分钟→角度（12点=0 顺时针）
            const x = cx + R * Math.sin(ang), y = cy - R * Math.cos(ang);
            const ev = (t, px, py) => new PointerEvent(t, {bubbles:true, composed:true, pointerId:5, isPrimary:true, clientX:px, clientY:py});
            card.dispatchEvent(ev('pointerdown', cx + 5, cy - 5));
            card.dispatchEvent(ev('pointermove', x, y));
            card.dispatchEvent(ev('pointerup', x, y));
            return {readout: document.getElementById('dial-readout') ? document.getElementById('dial-readout').textContent : null};
        }"""
        # ① 错拖：拖到 (m+15)%60
        q = await page.evaluate('() => CLK.quiz')
        m = q['clockMin'] % 60
        wrong = (m + 15) % 60
        await page.evaluate(DRAG, wrong)
        await page.wait_for_timeout(400)
        s1 = await page.evaluate('() => CLK.currentLevel')
        q2 = await page.evaluate('() => CLK.quiz')
        ok1 = s1['retries'] == 1 and q2 and q2['step'] == q['step'] and not s1['done']
        print('① 错拖不推进:', 'PASS' if ok1 else 'FAIL', json.dumps({**s1, 'step2': q2 and q2['step']}))

        # ② 对拖 5 题直到过关
        won, steps = False, 0
        for _ in range(12):
            q = await page.evaluate('() => CLK.quiz')
            if not q: break
            mm = q['clockMin'] % 60
            await page.evaluate(DRAG, mm)
            await page.wait_for_timeout(450)
            steps += 1
            c = await page.evaluate('() => CLK.currentLevel')
            if c['done'] or c['won']: won = True; break
        ok2 = won
        print('② 对拖通关:', 'PASS' if ok2 else 'FAIL', 'steps:', steps)
        print('JS errors:', len(errs), errs[:2])
        print('RESULT:', 'ALL PASS' if (ok1 and ok2 and not errs) else 'FAIL')
        await browser.close()
        sys.exit(0 if (ok1 and ok2 and not errs) else 1)

asyncio.run(main())
