# -*- coding: utf-8 -*-
"""libr 真实点击探针（b37 盲区教训：探针必含一次真实点击）：
真实 pointer 事件驱动 教学turn→独→正式关 + 错格→对格 两条路径 + 截图非空白。"""
import asyncio, io, sys, pathlib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

URL = 'file:///F:/claudecode/projects/active/kids-games/batch38/libr/index.html'
SHOT = pathlib.Path('F:/claudecode/projects/active/kids-games/batch38/libr/_src/_shot_real.png')

async def real_click(pg, i):
    """对 .shelf-slot[data-i=i] 发真实鼠标点击（元素坐标居中）"""
    box = await pg.evaluate('''i => { const el = document.querySelector('.shelf-slot[data-i="'+i+'"]');
        const r = el.getBoundingClientRect(); return {x: r.left + r.width/2, y: r.top + r.height/2}; }''', i)
    await pg.mouse.click(box['x'], box['y'])

async def wait_open(pg, cond, tries=60):
    for _ in range(tries):
        if await pg.evaluate(cond):
            return True
        await pg.wait_for_timeout(300)
    return False

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])
        pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        # 1) 等教学 turn 阶段且输入开放（presentQuiz 演出锁结束）
        ok1 = await wait_open(pg, 'window.LB && LB.tutorial === "help" && LB.quiz && !state.locked && Date.now() >= state.showUntil')
        q = await pg.evaluate('LB.quiz ? {card: LB.quiz.card, ans: LB.quiz.answer} : null')
        await real_click(pg, q['ans'])                     # 真实点击正确格（教学独）
        await wait_open(pg, 'window.__lbTutSolo === true')
        solo = await pg.evaluate('window.__lbTutSolo === true')
        print('T1 教学真实点击→独: open=%s solo=%s（点了 %s 的第 %d 格）' % (ok1, solo, q['card'], q['ans']))
        # 2) 正式关 flat0：真实点击错格 → miss=1；再真实点击对格 → 书立起+推进
        #（等待条件须含真时钟锁 Date.now() >= state.showUntil——presentQuiz 解锁后
        #  仍留 140ms 演出余量窗，演出期点击=正常吞输入非缺陷）
        ok2 = await wait_open(pg, 'LB.currentLevel && LB.currentLevel.flat === 0 && LB.quiz && !state.locked && Date.now() >= state.showUntil')
        q0 = await pg.evaluate('LB.quiz ? {card: LB.quiz.card, ans: LB.quiz.answer, n: LB.quiz.shelf.length} : null')
        wrong_i = 0 if q0['ans'] != 0 else (q0['n'] - 1)
        bk0 = await pg.evaluate('document.querySelectorAll(".shelf-slot .bk").length')
        # 截图（题面态——像素级非空白自检素材）
        SHOT.write_bytes(await pg.screenshot())
        size = SHOT.stat().st_size
        await real_click(pg, wrong_i)                      # 真实点击错格
        await wait_open(pg, 'LB.quiz && LB.quiz.miss === 1 && !state.locked && Date.now() >= state.showUntil')
        miss = await pg.evaluate('LB.quiz.miss')
        await wait_open(pg, 'Date.now() >= state.showUntil && !state.locked')
        await real_click(pg, q0['ans'])                    # 真实点击正确格
        await wait_open(pg, 'LB.quiz && LB.quiz.step === 1 && !state.locked')
        step = await pg.evaluate('LB.quiz.step')
        bks = await pg.evaluate('document.querySelectorAll(".shelf-slot .bk").length')
        print('T2 正式关开放: %s 卡=%s 错格#%d → miss=%s（真实 pointer 事件）' % (ok2, q0['card'], wrong_i, miss))
        print('T3 真实点击对格: step=%s 书立起 .bk 数 %s→%s（+1=书立起 DOM）' % (step, bk0, bks))
        print('T4 截图: %s bytes（>50KB=非空白渲染）errs=%s' % (size, errs[:2]))
        await pg.close()
        await b.close()

asyncio.run(main())
