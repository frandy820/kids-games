# -*- coding: utf-8 -*-
"""补充核验（batch6/_obs6 · 2026-09-07）
① 三款教学 help 阶段幽灵手指实际显示（主测脚本查得太早=600ms 定时器未到，主测 ghost_show=False 待核）
② subbug flat10 q2（18-18=0 全飞走）：放飞全部后叶子可见绿虫=0 的 UI 断言 + 答案 0 可通关
③ words flat≥3 点干扰块的语音静默（sayP 受 flat 门）——错误时 vlog 无 wrd_hint 佐证"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from obs_common import INIT_SCRIPT, install_logger, vlog, click_sel, SEED_SAVE
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []
def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

async def game_url(g):
    return 'file:///' + os.path.join(BASE, g, 'index.html').replace(chr(92), '/')

async def wait_help(pg, hook):
    for _ in range(120):
        t = await pg.evaluate('%s && %s.tutorial' % (hook, hook))
        if t in ('help', 'solo'):
            return t
        await pg.wait_for_timeout(400)
    return None

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # ① 三款教学 help 后 1.2s ghost 显示
        for g, hook in (('words', 'WRD'), ('compare', 'CMP'), ('subbug', 'SUB')):
            ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = await ctx.new_page()
            await pg.goto(await game_url(g))
            t = await wait_help(pg, hook)
            await pg.wait_for_timeout(1300)      # pointHelpNext 的 600ms 定时器后
            show = await pg.evaluate("!!document.querySelector('#ghost.show')")
            rec('%s 教学 help 幽灵手指显示' % g, t == 'help' and show, 'tut=%s ghost=%s' % (t, show))
            await ctx.close()

        # ② subbug flat10 q2 全飞走空叶 UI
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SCRIPT)
        pg = await ctx.new_page()
        await pg.goto(await game_url('subbug'))
        await pg.wait_for_timeout(800)
        await install_logger(pg)
        await pg.evaluate(SEED_SAVE, {'n': 10, 'g': 'sub'})
        await pg.reload()
        await pg.wait_for_timeout(1000)
        await install_logger(pg)
        # 前两题（q0 12-6 q1 18-17）真实解
        for _ in range(2):
            q = await pg.evaluate('SUB.quiz')
            for i in range(q['m']):
                pos = await pg.evaluate("""() => {
                  const q = SUB.quiz;
                  const i = q.flown.findIndex(v => !v);
                  const el = document.querySelector('.animal[data-k="b"][data-i="' + i + '"]');
                  const r = el.getBoundingClientRect();
                  return [r.left + r.width/2, r.top + r.height/2];
                }""")
                await pg.mouse.click(pos[0], pos[1])
                await pg.wait_for_timeout(300)
            ok = await click_sel(pg, '.opt[data-i="%d"]' % q['answerIdx'])
            await pg.wait_for_timeout(1600)
        q = await pg.evaluate('SUB.quiz')
        rec('subbug flat10 q2 为 18-18=0 题', q and q['n'] == 18 and q['m'] == 18 and q['answer'] == 0,
            'n=%s m=%s ans=%s' % (q['n'], q['m'], q['answer']))
        # 放飞全部 18 只
        for i in range(18):
            pos = await pg.evaluate("""() => {
              const q = SUB.quiz;
              if (q.flyCount >= q.m) return null;
              const i = q.flown.findIndex(v => !v);
              const el = document.querySelector('.animal[data-k="b"][data-i="' + i + '"]');
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return [r.left + r.width/2, r.top + r.height/2];
            }""")
            if not pos:
                break
            await pg.mouse.click(pos[0], pos[1])
            await pg.wait_for_timeout(280)
        st = await pg.evaluate("""() => ({
          fly: SUB.currentLevel.flyCount,
          flownAll: SUB.quiz.flown.every(v => v),
          opts: SUB.quiz.items})""")
        await pg.wait_for_timeout(1300)          # 末批飞走动画 780ms 完成
        st2 = await pg.evaluate("""() => ({
          visible: document.querySelectorAll('.animal[data-k="b"]:not(.gone)').length,
          breathe: document.querySelectorAll('.animal[data-k="b"].breathe').length})""")
        st['visible'] = st2['visible']
        st['breathe'] = st2['breathe']
        rec('全飞走后叶子可见绿虫=0（空叶）',
            st['fly'] == 18 and st.get('flownAll') and st['visible'] == 0 and st['breathe'] == 0,
            'fly=%s flownAll=%s visible=%s breathe=%s opts=%s' % (st['fly'], st.get('flownAll'), st['visible'], st['breathe'], st['opts']))
        # 答案 0 可选对推进
        idx = st['opts'].index(0)
        v0 = len(await vlog(pg))
        await click_sel(pg, '.opt[data-i="%d"]' % idx)
        await pg.wait_for_timeout(1400)
        q2 = await pg.evaluate('SUB.quiz')
        rec('答案 0 选对推进（step 2→3）', q2 and q2['step'] == 3, 'step=%s' % (q2 and q2['step']))
        await ctx.close()

        # ③ words flat5 点干扰块：语音层静默（sayP flat 门）——DOM 反馈在（wig）主测已证
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SCRIPT)
        pg = await ctx.new_page()
        await pg.goto(await game_url('words'))
        await pg.wait_for_timeout(800)
        await install_logger(pg)
        await pg.evaluate(SEED_SAVE, {'n': 5, 'g': 'words'})
        await pg.reload()
        await pg.wait_for_timeout(1200)
        await install_logger(pg)
        d = await pg.evaluate("""() => {
          const q = WRD.quiz;
          return q.tileTypes.findIndex(t => t === 'd');
        }""")
        v0 = len(await vlog(pg))
        await click_sel(pg, '.tile[data-i="%d"]' % d)
        await pg.wait_for_timeout(900)
        v1 = await vlog(pg)
        new = [e for e in v1[v0:]]
        rec('words flat5 点干扰块零语音（sayP flat 门）', len(new) == 0, 'vlog新增=%s' % new)
        await ctx.close()
        await browser.close()
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
