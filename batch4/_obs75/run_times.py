# -*- coding: utf-8 -*-
"""times 乘法捕鱼：7岁半修复复核（教学/真实通关含答错/分组图扩章/miss语音/首错pulse/救援/布局）"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
from obs75_lib import ensure_hook, game_url, seed_levels, layout_check

GAME, H = 'times', 'TIM'
URL = game_url(GAME)

async def vc(page): return await page.evaluate('window.__vc || []')
async def stars(page): return await page.evaluate('window.__stars || []')

async def wait_flat(page, flat, timeout=25000):
    await page.wait_for_function('%s && %s.currentLevel && %s.currentLevel.flat===%d' % (H, H, H, flat), timeout=timeout)

async def level_stars(page, flat):
    key = '%d-%d' % (flat // 5 + 1, flat % 5)
    try:  # level.pass 在 celebrate(2.3s) then 里写档 → 等键出现
        await page.wait_for_function('(KIDS._save().levels||{})["%s"]' % key, timeout=9000)
    except Exception:
        pass
    return await page.evaluate('(KIDS._save().levels || {})["%s"] || null' % key)

async def fish_clickable(page, i):
    return await page.evaluate('(() => { const e=document.querySelector(".fish-btn[data-i=\\"%d\\"]"); if(!e) return null; return {wrong: e.classList.contains("wrong"), right: e.classList.contains("right"), txt: e.textContent.replace(/\\s+/g,"")}; })()' % i)

async def quiz_state(page, q):
    """当前题：正确鱼/正确气泡的 pulse 与 aid 开闭"""
    return await page.evaluate('(() => { const f=document.querySelector(".fish-btn[data-i=\\"%d\\"]"); const ab=document.querySelector("#aid .aid-ans[data-i=\\"%d\\"]"); return {aidOpen: !!document.querySelector("#aid.open"), fishPulse: f ? f.classList.contains("pulse") : null, ansPulse: ab ? ab.classList.contains("pulse") : null, step: %s.currentLevel.step}; })()' % (q['answerIdx'], q['answerIdx'], H))

async def solve_rest(page, wrong_first=None, via='fish'):
    """答完当前关剩余题；wrong_first=先点错项下标（fish 或 aid-ans）"""
    picked = 0
    for it in range(14):
        lv = await page.evaluate('%s.currentLevel' % H)
        if not lv or lv.get('done'): break
        q = await page.evaluate('%s.quiz' % H)
        if not q: break
        if wrong_first is not None:
            sel = ('.fish-btn[data-i="%d"]' % wrong_first) if via == 'fish' else ('#aid .aid-ans[data-i="%d"]' % wrong_first)
            try:
                await page.locator(sel).first.click(timeout=4000)
                picked += 1
            except Exception:
                pass
            wrong_first = None
            await page.wait_for_timeout(800)
            continue
        try:
            await page.locator('.fish-btn[data-i="%d"]' % q['answerIdx']).first.click(timeout=4000)
        except Exception:
            break
        picked += 1
        try:
            await page.wait_for_function('%s.currentLevel.step > %d || %s.currentLevel.done' % (H, q['step'], H), timeout=8000)
        except Exception:
            pass
        await page.wait_for_timeout(250)
    return picked

async def main():
    out = {'game': GAME, 'steps': {}, 'pageerrors': []}
    try:
        await run(out)
    finally:
        save(out)
        print('SAVED pageerrors=%d' % len(out['pageerrors']))

def save(out):
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data_times.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

async def run(out):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await ctx.new_page()
        page.on('pageerror', lambda e: out['pageerrors'].append(str(e)))
        await page.goto(URL, wait_until='load')
        out['hook_install'] = await ensure_hook(page)
        await page.wait_for_function('window.%s && %s.currentLevel' % (H, H), timeout=15000)

        # ---- A 教学 flat0：看(分组demo+转化) → 帮(点看一看+面板答案) → 独 ----
        A = {}
        try:
            await page.wait_for_function("%s.tutorial==='watch'" % H, timeout=3000)
            st = await page.evaluate('%s.currentLevel.step' % H)
            try:
                await page.locator('.fish-btn').first.click(timeout=900)
            except Exception:
                pass
            A['watch_click_swallowed'] = (await page.evaluate('%s.currentLevel.step' % H)) == st
        except Exception:
            A['watch_captured'] = False
        await page.wait_for_function("%s.tutorial==='help'" % H, timeout=30000)
        A['tut_help_reached_ms'] = await page.evaluate('Date.now()-window.__t0')
        # 独阶段第一步：真实点"看一看"→ 面板开 → 真实点面板内正确答案气泡
        await page.locator('#btn-groups').click(timeout=4000)
        await page.wait_for_timeout(600)
        A['aid_open_after_groups_btn'] = await page.evaluate('!!document.querySelector("#aid.open")')
        q = await page.evaluate('%s.quiz' % H)
        await page.locator('#aid .aid-ans[data-i="%d"]' % q['answerIdx']).first.click(timeout=4000)
        try:
            await page.wait_for_function("%s.tutorial==='solo'" % H, timeout=9000)
            A['solo_reached'] = True
        except Exception:
            A['solo_reached'] = False
        A['vc_teach'] = [c['k'] for c in await vc(page)]
        out['steps']['A_tutorial'] = A

        # ---- B flat0 剩余（真实点鱼）----
        n = await solve_rest(page)
        out['steps']['B_flat0'] = {'picks': n, 'saved': await level_stars(page, 0), 'celebrate': (await stars(page))[-2:]}
        await wait_flat(page, 1)

        # ---- C flat1 连错支架链（首错不直给 + 分组图自动亮起）----
        C = {}
        q = await page.evaluate('%s.quiz' % H)
        ok, wrongs = q['answerIdx'], [i for i in range(len(q['items'])) if i != q['answerIdx']]
        C['q'] = {'type': q['type'], 'text': q['text'], 'ok': ok, 'wrongs': wrongs}
        chain = []
        for j, wi in enumerate(wrongs):
            sel = '.fish-btn[data-i="%d"]' % wi if j == 0 else '#aid .aid-ans[data-i="%d"]' % wi  # 错1后面板自动开→错2/3走气泡
            try:
                await page.locator(sel).first.click(timeout=4000)
            except Exception as e:
                chain.append({'miss': j + 1, 'click_fail': str(e)[:80]})
                continue
            await page.wait_for_timeout(800)
            st = await quiz_state(page, q)
            vcn = [c['k'] for c in (await vc(page))[-2:]]
            chain.append({'miss': j + 1, **st, 'vc': vcn})
        C['chain'] = chain
        # 收尾答对（面板开着走气泡，否则走鱼）
        via = 'aid' if chain and chain[-1].get('aidOpen') else 'fish'
        if via == 'aid':
            await page.locator('#aid .aid-ans[data-i="%d"]' % ok).first.click(timeout=4000)
        else:
            await page.locator('.fish-btn[data-i="%d"]' % ok).first.click(timeout=4000)
        await page.wait_for_timeout(2500)
        await solve_rest(page)
        out['steps']['C_flat1_miss_chain'] = C
        out['steps']['C_flat1_star'] = {'saved': await level_stars(page, 1)}
        await wait_flat(page, 2)

        # ---- B2 flat2 全对 ----
        await solve_rest(page)
        out['steps']['B2_flat2_star'] = {'saved': await level_stars(page, 2)}

        # ---- E flat10（×6×7，dch3）：分组图扩章 + 首错pulse + 救援 ----
        E = {}
        await seed_levels(page, 10, 5)
        await wait_flat(page, 10)
        await page.wait_for_timeout(600)
        E['groups_btn_visible'] = await page.evaluate('(() => { const b=document.getElementById("btn-groups"); return b && b.style.display !== "none"; })()')
        q = await page.evaluate('%s.quiz' % H)
        E['q'] = {'type': q['type'], 'text': q['text'], 'items': q['items']}
        ok, wrongs = q['answerIdx'], [i for i in range(len(q['items'])) if i != q['answerIdx']]
        # 错1（真实点错鱼）
        await page.locator('.fish-btn[data-i="%d"]' % wrongs[0]).first.click(timeout=4000)
        await page.wait_for_timeout(800)
        E['miss1'] = await quiz_state(page, q)
        E['miss1_vc'] = [c['k'] for c in (await vc(page))[-2:]]
        # 错2（面板气泡）
        if len(wrongs) > 1:
            try:
                await page.locator('#aid .aid-ans[data-i="%d"]' % wrongs[1]).first.click(timeout=4000)
                await page.wait_for_timeout(800)
                E['miss2'] = await quiz_state(page, q)
            except Exception as e:
                E['miss2_click_fail'] = str(e)[:100]
        # 救援：静置 25.5s（flat>=3，sayR 不受门限）
        vc0 = [c['k'] for c in await vc(page)]
        await page.wait_for_timeout(25500)
        vc1 = [c['k'] for c in await vc(page)]
        E['rescue'] = {'before_n': len(vc0), 'new_keys': vc1[len(vc0):],
                       'rescue_played': any('hint' in k for k in vc1[len(vc0):])}
        out['steps']['E_flat10'] = E

        # ---- F flat15（dch4 缺因数）：miss 题语音 + 无辅助 ----
        F = {}
        await seed_levels(page, 15, 10)
        await wait_flat(page, 15)
        await page.wait_for_timeout(600)
        F['groups_btn_visible'] = await page.evaluate('(() => { const b=document.getElementById("btn-groups"); return b && b.style.display !== "none"; })()')
        # 真实答对直到 miss 题（点击可能被锁定窗吞——同题重试直到 step 推进）
        miss_q = None
        for it in range(14):
            lv = await page.evaluate('%s.currentLevel' % H)
            if not lv or lv.get('done'): break
            q = await page.evaluate('%s.quiz' % H)
            if not q: break
            if q['type'] == 'miss':
                miss_q = q
                break
            await page.locator('.fish-btn[data-i="%d"]' % q['answerIdx']).first.click(timeout=4000)
            try:
                await page.wait_for_function('%s.currentLevel.step > %d || %s.currentLevel.done' % (H, q['step'], H), timeout=8000)
            except Exception:
                pass
            await page.wait_for_timeout(250)
        if not miss_q:
            miss_q = await page.evaluate('%s.quiz' % H)
        F['miss_q'] = {'type': miss_q.get('type'), 'text': miss_q.get('text'), 'items': miss_q.get('items')}
        ok = miss_q['answerIdx']
        wrongs = [i for i in range(len(miss_q['items'])) if i != ok]

        async def miss_click(wi):
            """点错鱼并确认生效（鱼出现 wrong 类），锁定窗吞点击则重试"""
            for t in range(5):
                try:
                    await page.locator('.fish-btn[data-i="%d"]' % wi).first.click(timeout=4000)
                except Exception:
                    return False
                try:
                    await page.wait_for_function(
                        'document.querySelector(".fish-btn[data-i=\\"%d\\"]") && document.querySelector(".fish-btn[data-i=\\"%d\\"]").classList.contains("wrong")' % (wi, wi),
                        timeout=1200)
                    return True
                except Exception:
                    await page.wait_for_timeout(400)
            return False

        vcn0 = len(await vc(page))
        F['miss1_click_landed'] = await miss_click(wrongs[0])
        await page.wait_for_timeout(800)
        F['miss1'] = await quiz_state(page, miss_q)
        F['miss1_vc'] = [c['k'] for c in (await vc(page))[vcn0:]]
        if len(wrongs) > 1:
            vcn1 = len(await vc(page))
            F['miss2_click_landed'] = await miss_click(wrongs[1])
            await page.wait_for_timeout(800)
            F['miss2'] = await quiz_state(page, miss_q)
            F['miss2_vc'] = [c['k'] for c in (await vc(page))[vcn1:]]
        out['steps']['F_flat15_miss'] = F

        # ---- G 双 viewport 布局 ----
        L = []
        await layout_check(browser, GAME, H, 10, 5, ['.fish-btn'], L)
        out['steps']['G_layout'] = L

        await ctx.close()
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data_times.json'), encoding='utf-8') as f:
            d = json.load(f)
        for k, v in d['steps'].items():
            print('--', k, json.dumps(v, ensure_ascii=False)[:600])
        print('pageerrors:', d['pageerrors'])
    except Exception as e:
        print('print fail', e)
