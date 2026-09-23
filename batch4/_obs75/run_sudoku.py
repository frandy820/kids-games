# -*- coding: utf-8 -*-
"""sudoku 数独小动物：7岁半修复复核（教学/真实通关/双击保护/首提示不扣星/wig/连错/救援/布局）"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
from obs75_lib import ensure_hook, game_url, seed_levels, layout_check

GAME, H = 'sudoku', 'SUD'
URL = game_url(GAME)

async def vc(page): return await page.evaluate('window.__vc || []')

async def wait_flat(page, flat, timeout=25000):
    await page.wait_for_function('%s && %s.currentLevel && %s.currentLevel.flat===%d && !%s.currentLevel.won' % (H, H, H, flat, H), timeout=timeout)

async def level_stars(page, flat):
    key = '%d-%d' % (flat // 5 + 1, flat % 5)
    try:
        await page.wait_for_function('(KIDS._save().levels||{})["%s"]' % key, timeout=10000)
    except Exception:
        pass
    return await page.evaluate('(KIDS._save().levels || {})["%s"] || null' % key)

async def fill_one(page, i, v):
    """真实点击：选格 → 点动物"""
    await page.locator('.cell[data-i="%d"]' % i).first.click(timeout=4000)
    await page.wait_for_timeout(80)
    await page.locator('.abtn[data-a="%d"]' % v).first.click(timeout=4000)
    await page.wait_for_timeout(150)

async def fill_all(page):
    """按解真实填完当前关剩余空格（含锁定窗重试）；返回 {fills, conflicts}"""
    fills = 0
    for it in range(30):
        b = await page.evaluate('%s.board' % H)
        lv = await page.evaluate('%s.currentLevel' % H)
        if not b or lv.get('won'): break
        empt = [k for k in range(len(b['cells'])) if not b['given'][k] and b['cells'][k] < 0]
        if not empt: break
        i = empt[0]
        sol = (await page.evaluate('%s.solution' % H))[i]
        await fill_one(page, i, sol)
        b2 = await page.evaluate('%s.board' % H)
        if b2['cells'][i] >= 0:
            fills += 1
        else:  # 点击被锁定窗吞 → 重试
            await page.wait_for_timeout(400)
            await fill_one(page, i, sol)
            b3 = await page.evaluate('%s.board' % H)
            if b3['cells'][i] >= 0: fills += 1
        await page.wait_for_timeout(120)
    return fills

async def main():
    out = {'game': GAME, 'steps': {}, 'pageerrors': []}
    try:
        await run(out)
    finally:
        save(out)
        print('SAVED pageerrors=%d' % len(out['pageerrors']))

def save(out):
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data_sudoku.json'), 'w', encoding='utf-8') as f:
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

        # ---- A 教学 flat0：看(错晃→清→放对) → 帮(ghost 指目标) → 独(真实点击首格) ----
        A = {}
        try:
            await page.wait_for_function("%s.tutorial==='watch'" % H, timeout=2500)
            b0 = await page.evaluate('%s.board' % H)
            A['watch_board_moves'] = None  # 演示期间棋盘变化较难原子捕捉，记录吞输入即可
            st = await page.evaluate('%s.currentLevel.wrongs' % H)
            try:
                empt = [k for k in range(16) if not b0['given'][k] and b0['cells'][k] < 0]
                if empt:
                    await page.locator('.cell[data-i="%d"]' % empt[0]).first.click(timeout=900)
            except Exception:
                pass
            A['watch_click_cells_changed'] = None
        except Exception:
            A['watch_captured'] = False
        await page.wait_for_function("%s.tutorial==='help'" % H, timeout=30000)
        A['tut_help_reached_ms'] = await page.evaluate('Date.now()-window.__t0')
        # 独阶段第一步：真实点第一个空格 + 正确动物
        b = await page.evaluate('%s.board' % H)
        sol = await page.evaluate('%s.solution' % H)
        i0 = next(k for k in range(len(b['cells'])) if not b['given'][k] and b['cells'][k] < 0)
        await fill_one(page, i0, sol[i0])
        b2 = await page.evaluate('%s.board' % H)
        A['solo_first_fill'] = {'i': i0, 'v': sol[i0], 'cells_i': b2['cells'][i0], 'ok': b2['cells'][i0] == sol[i0]}
        try:
            await page.wait_for_function("%s.tutorial==='solo'" % H, timeout=6000)
            A['solo_reached'] = True
        except Exception:
            A['solo_reached'] = False
        A['vc_teach'] = [c['k'] for c in await vc(page)]
        out['steps']['A_tutorial'] = A

        # ---- B flat0 剩余：真实填 + 中途一次冲突演示 ----
        B = {'fills': 0}
        # 冲突演示：找下一个空格，填同行任一格的解值（必冲突）
        b = await page.evaluate('%s.board' % H)
        sol = await page.evaluate('%s.solution' % H)
        n = b['n']
        empt = [k for k in range(len(b['cells'])) if not b['given'][k] and b['cells'][k] < 0]
        ic = empt[0]
        vconf = sol[(ic // n) * n + ((ic % n) + 1) % n]  # 同行相邻格的解值 ≠ sol[ic] → 必冲突
        if vconf == sol[ic]:
            vconf = (sol[ic] + 1) % n
        wrongs0 = await page.evaluate('%s.currentLevel.wrongs' % H)
        await fill_one(page, ic, vconf)
        cstate = await page.evaluate('(() => { const e=document.querySelector(".cell[data-i=\\"%d\\"]"); return {conflictCls: e.classList.contains("conflict"), val: SUD.board.cells[%d]}; })()' % (ic, ic))
        await page.wait_for_timeout(1300)  # conflict 1s 自动消
        # 清除该格（>250ms 后点击）再填对
        await page.locator('.cell[data-i="%d"]' % ic).first.click(timeout=4000)
        await page.wait_for_timeout(300)
        vAfterClear = await page.evaluate('%s.board.cells[%d]' % (H, ic))
        await fill_one(page, ic, sol[ic])
        B['conflict_demo'] = {'i': ic, 'vconf': vconf, **cstate, 'cleared': vAfterClear == -1, 'wrongs_before': wrongs0,
                              'wrongs_after': await page.evaluate('%s.currentLevel.wrongs' % H)}
        B['fills'] = await fill_all(page)
        lv = await page.evaluate('%s.currentLevel' % H)
        if not lv.get('won'):  # 锁定窗漏填兜底
            B['fills'] += await fill_all(page)
        B['saved'] = await level_stars(page, 0)
        out['steps']['B_flat0'] = B
        await wait_flat(page, 1)

        # ---- C flat1：真实点 1 次提示按钮 → 填完 → 3 星（首次提示不扣星）----
        C = {}
        C['hint_state_before'] = await page.evaluate('(() => { const b=document.getElementById("btn-hint"); return {spent: b.classList.contains("spent"), lamps: SUD.currentLevel.hints, used: SUD.currentLevel.hintsUsed}; })()')
        await page.locator('#btn-hint').first.click(timeout=4000)
        await page.wait_for_timeout(1200)  # ghost 演示 800ms + press
        C['after_hint'] = await page.evaluate('(() => { const c=SUD.currentLevel; return {hintsUsed: c.hintsUsed, lamps: c.hints, filled: SUD.board.cells.filter(v=>v>=0).length}; })()')
        C['fills'] = await fill_all(page)
        lv = await page.evaluate('%s.currentLevel' % H)
        if not lv.get('won'):
            C['fills'] += await fill_all(page)
        C['saved'] = await level_stars(page, 1)
        out['steps']['C_flat1_hint1'] = C
        await wait_flat(page, 2)

        # ---- B2 flat2 全净 → 3 星 ----
        f2 = await fill_all(page)
        lv = await page.evaluate('%s.currentLevel' % H)
        if not lv.get('won'):
            f2 += await fill_all(page)
        out['steps']['B2_flat2'] = {'fills': f2, 'saved': await level_stars(page, 2)}
        await wait_flat(page, 3)

        # ---- D flat3：连错3次 + 双击保护 + wig + 救援 ----
        D = {}
        b = await page.evaluate('%s.board' % H)
        sol = await page.evaluate('%s.solution' % H)
        n = b['n']
        empt = [k for k in range(len(b['cells'])) if not b['given'][k] and b['cells'][k] < 0]
        ie = empt[0]
        vconf = sol[(ie // n) * n + ((ie % n) + 1) % n]
        if vconf == sol[ie]:
            vconf = (sol[ie] + 1) % n
        # 连错 3 次：填冲突→清→再填→再清→再填（每次 wrongs+1，conflict 红框 1s）
        chain = []
        for r in range(3):
            w0 = await page.evaluate('%s.currentLevel.wrongs' % H)
            await fill_one(page, ie, vconf)
            st = await page.evaluate('(() => { const e=document.querySelector(".cell[data-i=\\"%d\\"]"); return {conflict: e.classList.contains("conflict"), wrongs: SUD.currentLevel.wrongs, vc: (window.__vc||[]).slice(-1).map(c=>c.k)}; })()' % ie)
            chain.append({'round': r + 1, 'wrongs_before': w0, **st})
            await page.wait_for_timeout(1200)  # 等 conflict 消
            await page.locator('.cell[data-i="%d"]' % ie).first.click(timeout=4000)  # 清除
            await page.wait_for_timeout(350)
        D['chain3'] = chain
        # 双击保护：<250ms 连点同格不清除（同步 dispatch 保证间隔为 0）
        D['dblclick'] = await page.evaluate("""(() => {
          const b = SUD.board, sol = SUD.solution;
          const empt = []; b.cells.forEach((v,k)=>{ if(!b.given[k] && v<0) empt.push(k); });
          if (!empt.length) return {skip: 'no empty'};
          const i = empt[0];
          const cell = document.querySelector('.cell[data-i="'+i+'"]');
          const pe = () => new PointerEvent('pointerdown', {bubbles:true, isPrimary:true, pointerId:1});
          cell.dispatchEvent(pe());
          const ab = document.querySelector('.abtn[data-a="'+sol[i]+'"]');
          ab.dispatchEvent(pe());
          const vAfterFill = SUD.board.cells[i];
          const tFill = Date.now();
          cell.dispatchEvent(pe());               // 立即连点（0ms < 250ms 保护窗）
          const vQuickTap = SUD.board.cells[i];
          return {i: i, vAfterFill: vAfterFill, vQuickTap: vQuickTap,
                  kept: vQuickTap === vAfterFill && vAfterFill >= 0, dt: Date.now()-tFill};
        })()""")
        # 对照：>250ms 后再点 → 清除
        iDbl = D['dblclick'].get('i')
        if iDbl is not None:
            await page.wait_for_timeout(450)
            await page.locator('.cell[data-i="%d"]' % iDbl).first.click(timeout=4000)
            await page.wait_for_timeout(200)
            D['slowtap_cleared'] = await page.evaluate('%s.board.cells[%d]' % (H, iDbl)) == -1
        # wig：无选中状态点动物按钮
        D['wig'] = await page.evaluate("""(() => {
          const sel = SUD.board.sel;
          const ab = document.querySelector('.abtn[data-a="0"]');
          const had = ab.classList.contains('wig');
          ab.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, isPrimary:true, pointerId:1}));
          const has = ab.classList.contains('wig');
          return {selBefore: sel, wigAfter: has};
        })()""")
        # 救援：静置 25.5s（flat>=3）
        vc0 = [c['k'] for c in await vc(page)]
        await page.wait_for_timeout(25500)
        vc1 = [c['k'] for c in await vc(page)]
        D['rescue'] = {'before': vc0[-3:], 'new_keys': vc1[len(vc0):],
                       'rescue_played': any('hint' in k for k in vc1[len(vc0):])}
        out['steps']['D_flat3'] = D

        # ---- E 双 viewport 布局（flat0 4×4 + flat10 6×6）----
        L = []
        await layout_check(browser, GAME, H, 10, 5, ['.cell', '.abtn'], L)
        out['steps']['E_layout'] = L

        await ctx.close()
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data_sudoku.json'), encoding='utf-8') as f:
            d = json.load(f)
        for k, v in d['steps'].items():
            print('--', k, json.dumps(v, ensure_ascii=False)[:600])
        print('pageerrors:', d['pageerrors'])
    except Exception as e:
        print('print fail', e)
