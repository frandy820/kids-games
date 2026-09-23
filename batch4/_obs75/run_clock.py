# -*- coding: utf-8 -*-
"""clock 时间小管家：7岁半修复复核（教学/真实通关/首错pulse/救援/拨针拖拽/双viewport）"""
import asyncio, json, math, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
from obs75_lib import ensure_hook, game_url, seed_levels, layout_check

GAME, H = 'clock', 'CLK'
URL = game_url(GAME)

async def vc(page): return await page.evaluate('window.__vc || []')
async def stars(page): return await page.evaluate('window.__stars || []')

async def wait_flat(page, flat, timeout=25000):
    await page.wait_for_function('%s && %s.currentLevel && %s.currentLevel.flat===%d' % (H, H, H, flat), timeout=timeout)

async def level_stars(page, flat):
    key = '%d-%d' % (flat // 5 + 1, flat % 5)
    return await page.evaluate('(KIDS._save().levels || {})["%s"] || null' % key)

async def wait_ov(page, timeout=10000):
    try:
        await page.wait_for_selector('.k-ov', state='attached', timeout=3500)
    except Exception:
        pass
    await page.wait_for_selector('.k-ov', state='detached', timeout=timeout)

async def opt_state(page, i):
    return await page.evaluate('(() => { const e=document.querySelectorAll(".opt")[%d]; if(!e) return null; const r=e.getBoundingClientRect(); return {wrong: e.classList.contains("wrong"), right: e.classList.contains("right"), text: e.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height)}; })()' % i)

async def solve_rest(page, wrong_first=None):
    """答完当前关剩余题。等 DOM 选项文本与 quiz.items 同步后再点，并等 step 推进。"""
    picked = 0
    for it in range(14):
        lv = await page.evaluate('%s.currentLevel' % H)
        if not lv or lv.get('done'): break
        q = await page.evaluate('%s.quiz' % H)
        if not q: break
        if wrong_first is not None:
            try:
                await page.locator('.opt').nth(wrong_first).click(timeout=4000)
                picked += 1
            except Exception:
                pass
            wrong_first = None
            await page.wait_for_timeout(700)
            continue
        # 等该题 DOM 渲染完成（answer 选项文本 == items[answer]）
        want = q['items'][q['answer']]
        try:
            await page.wait_for_function(
                '(() => { const e=document.querySelectorAll(".opt")[%d]; return e && e.textContent.trim() === %s; })()' % (q['answer'], json.dumps(want)),
                timeout=6000)
        except Exception:
            break
        try:
            await page.locator('.opt').nth(q['answer']).click(timeout=4000)
        except Exception:
            break
        picked += 1
        try:
            await page.wait_for_function(
                '%s.currentLevel.step > %d || %s.currentLevel.done' % (H, q['step'], H), timeout=6000)
        except Exception:
            pass
        await page.wait_for_timeout(250)
    return picked

def save(out):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data_clock.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

async def main():
    out = {'game': GAME, 'steps': {}, 'pageerrors': []}
    try:
        await run(out)
    finally:
        save(out)
        print('SAVED pageerrors=%d' % len(out['pageerrors']))

async def run(out):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await ctx.new_page()
        page.on('pageerror', lambda e: out['pageerrors'].append(str(e)))
        await page.goto(URL, wait_until='load')
        out['hook_install'] = await ensure_hook(page)
        await page.wait_for_function('window.%s && %s.currentLevel' % (H, H), timeout=15000)

        # ---- A 教学 flat0（看-帮-独）----
        A = {}
        try:
            await page.wait_for_function("%s.tutorial==='watch'" % H, timeout=2500)
            st = await page.evaluate('%s.currentLevel.step' % H)
            try:
                await page.locator('.opt').first.click(timeout=900)
            except Exception:
                pass
            A['watch_click_step'] = await page.evaluate('%s.currentLevel.step' % H)
            A['watch_click_swallowed'] = (A['watch_click_step'] == st)
        except Exception:
            A['watch_captured'] = False
        await page.wait_for_function("%s.tutorial==='help'" % H, timeout=25000)
        A['tut_help_reached_ms'] = await page.evaluate('Date.now()-window.__t0')
        q = await page.evaluate('%s.quiz' % H)
        await page.locator('.opt').nth(q['answer']).click()   # 独阶段第一步=真实 pointer 点击
        await page.wait_for_function("%s.tutorial==='solo'" % H, timeout=6000)
        A['solo_reached'] = True
        A['vc_teach'] = [c['k'] for c in await vc(page)]
        out['steps']['A_tutorial'] = A

        # ---- B flat0 剩余题（真实点击）通关 ----
        n = await solve_rest(page)
        try:
            await wait_ov(page)
        except Exception:
            pass
        out['steps']['B_flat0'] = {'picks': n, 'saved_star_flat0': await level_stars(page, 0), 'celebrate_calls': (await stars(page))[-3:]}
        await wait_flat(page, 1)

        # ---- C flat1 连错支架链（首错不直给答案复核）----
        C = {}
        q = await page.evaluate('%s.quiz' % H)
        okIdx = q['answer']
        wrongs = [i for i in range(len(q['items'])) if i != okIdx]
        chain = []
        for j, wi in enumerate(wrongs):
            pre = await opt_state(page, wi)
            if not pre or pre['wrong'] or pre['right']:
                chain.append({'miss': j + 1, 'skipped': 'already grayed'})
                continue
            await page.locator('.opt').nth(wi).click(timeout=4000)
            await page.wait_for_timeout(700)
            st = await page.evaluate('(() => { const o=document.querySelectorAll(".opt"); return {pulse: o[%d].classList.contains("pulse"), wrongCls: o[%d].classList.contains("wrong"), step: %s.currentLevel.step}; })()' % (okIdx, wi, H))
            chain.append({'miss': j + 1, 'pre': pre['text'], **st})
        C['items_n'] = len(q['items'])
        C['okIdx'], C['wrongs'] = okIdx, wrongs
        C['chain'] = chain
        vc0 = await vc(page)
        if wrongs:
            try:
                await page.locator('.opt').nth(wrongs[0]).click(timeout=2000, force=True)  # 再点已灰错项（force 绕过命中拦截）
            except Exception:
                pass
            await page.wait_for_timeout(300)
        C['grayed_reclick_step'] = await page.evaluate('%s.currentLevel.step' % H)
        C['vc_after_misses'] = [c['k'] for c in vc0][-6:]
        await solve_rest(page)
        try:
            await wait_ov(page)
        except Exception:
            pass
        out['steps']['C_flat1_miss_chain'] = C
        out['steps']['C_flat1_star'] = {'saved': await level_stars(page, 1), 'misses': len(wrongs)}

        # ---- B2 flat2 全对通关 ----
        await wait_flat(page, 2)
        await solve_rest(page)
        try:
            await wait_ov(page)
        except Exception:
            pass
        out['steps']['B2_flat2_star'] = {'saved': await level_stars(page, 2)}

        # ---- D 救援语音 flat>=3 静置 25s ----
        await wait_flat(page, 3)
        vc0 = [c['k'] for c in await vc(page)]
        await page.wait_for_timeout(25500)
        vc1 = [c['k'] for c in await vc(page)]
        new = vc1[len(vc0):]
        out['steps']['D_rescue_flat3'] = {
            'vc_before': vc0, 'vc_after': vc1, 'new_keys': new,
            'rescue_played': any(('hint' in k or 'again' in k or 'help' in k) for k in new)}

        # ---- E 拨针关 flat10（种档 bonus5）+ dialDemo + 真实拖拽 ----
        E = {}
        await seed_levels(page, 10, 5)
        await page.wait_for_function('%s.currentLevel.flat===10' % H, timeout=15000)
        t_re = await page.evaluate('Date.now()')
        try:
            await page.wait_for_function("%s.tutorial==='watch'" % H, timeout=3000)
            st = await page.evaluate('%s.currentLevel.step' % H)
            try:
                await page.locator('.clock-card').first.click(timeout=800)
            except Exception:
                pass
            E['dialdemo_click_swallowed'] = (await page.evaluate('%s.currentLevel.step' % H)) == st
        except Exception:
            E['dialdemo_watch_captured'] = False
        await page.wait_for_function("%s.tutorial==='help'" % H, timeout=45000)
        E['dialdemo_ms'] = (await page.evaluate('Date.now()')) - t_re
        attempts = []
        for qi in range(6):
            lv = await page.evaluate('%s.currentLevel' % H)
            if lv.get('done'): break
            q = await page.evaluate('%s.quiz' % H)
            m = q.get('targetMin', q.get('clockMin', 0) % 60 if isinstance(q.get('clockMin'), int) else 0)
            card = page.locator('.clock-card.drag').first
            box = await card.bounding_box()
            cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            R = box['width'] * 0.38
            ang = math.radians(m * 6)
            tx, ty = cx + R * math.sin(ang), cy - R * math.cos(ang)
            tries = 0
            for t in range(4):
                tries += 1
                await page.mouse.move(cx, cy)
                await page.mouse.down()
                await page.mouse.move(tx, ty, steps=14)
                await page.mouse.up()
                await page.wait_for_timeout(650)
                if await page.evaluate('%s.currentLevel.step' % H) > q['step']:
                    break
            attempts.append({'q': qi, 'type': q['type'], 'target': m, 'tries': tries})
        E['dial_attempts'] = attempts
        try:
            E['card_size'] = await page.evaluate('(() => { const r=document.querySelector(".clock-card.drag"); if(!r) return null; const b=r.getBoundingClientRect(); return {w: Math.round(b.width), h: Math.round(b.height)}; })()')
        except Exception:
            E['card_size'] = None
        try:
            await wait_ov(page, timeout=6000)
        except Exception:
            pass
        E['flat10_star'] = await level_stars(page, 10)
        E['celebrate_calls'] = (await stars(page))[-3:]
        out['steps']['E_dial_flat10'] = E

        # ---- F 双 viewport 布局 ----
        L = []
        await layout_check(browser, GAME, H, 10, 5, ['.opt', '.clock-card'], L)
        out['steps']['F_layout'] = L

        await ctx.close()
        await browser.close()
    out['hookErr'] = None

if __name__ == '__main__':
    asyncio.run(main())
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data_clock.json'), encoding='utf-8') as f:
            d = json.load(f)
        for k, v in d['steps'].items():
            print('--', k, json.dumps(v, ensure_ascii=False)[:500])
        print('pageerrors:', d['pageerrors'])
    except Exception as e:
        print('print fail', e)
