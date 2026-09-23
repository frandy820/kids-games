# -*- coding: utf-8 -*-
"""memgrid 记忆亮亮格 · 6 岁半女孩试玩
场景A 全新开档：教学两态（show 期乱点=吞输入断言）→ 第 1 关真实闪现等待通关
场景B 1-1：input 期故意点错 3 格 → 静置 17s 救援（reflash+rescues）→ 纠正通关
场景C 种档 6(第2天) → 2-1 章 2 k=3（记忆量 2→3 跳跃）：记混一次后通关
"""
import json, os, random, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kidplay import Kid, SEED_JS, YDAY, BASE

random.seed(20260909)
OUT = {'game': 'memgrid 记忆亮亮格', 'scens': {}}
CELL = '.cell[data-i="%d"]'

def wait_tut(kid, want, timeout=15):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if kid.js('MEMG.tutorial') == want: return True
        time.sleep(0.25)
    return False

def quiz_info(kid):
    return kid.js("(() => { const q = MEMG.quiz; if (!q) return null; return { N:q.N,k:q.k,phase:q.phase,cells:q.cells,picked:q.picked,miss:q.miss,step:q.step }; })()")

def wait_input(kid, timeout=12):
    t0 = time.time()
    while time.time() - t0 < timeout:
        q = quiz_info(kid)
        if not q: return None
        if q['phase'] == 'input': return q
        time.sleep(0.2)
    return None

def pick_cell(kid, i, note='', wait=0.8):
    kid.tap(CELL % i, wait=wait, note=note)

def solve_quiz_as_child(kid, wrong_n=0, think=1.0):
    """当前题：等 input（真实看闪现）→ 先错 wrong_n 个格 → 逐格点对"""
    q = wait_input(kid)
    if not q:
        kid.ev('no_input_timeout'); return False
    time.sleep(think)
    for w in range(wrong_n):
        wrongs = [i for i in range(q['N']*q['N']) if i not in q['cells']]
        random.shuffle(wrongs)
        wi = None
        for c in wrongs:
            if c not in [x for x in kid.js("MEMG.quiz.picked")]: wi = c; break
        if wi is None: break
        pick_cell(kid, wi, note='第%d次点错格' % (w+1), wait=0.9)
        st = kid.js("(() => { const q=MEMG.quiz; const cs=[...document.querySelectorAll('.cell')]; return { miss:q.miss, picked:q.picked, bad:cs.filter(c=>c.className.includes('bad')).length, pulse:cs.filter(c=>c.className.includes('pulse')).length, on:cs.filter(c=>c.className.includes(' on')).length }; })()")
        kid.ev('wrong_dom', step=q['step'], **st)
        kid.ev('vlog_w', v=kid.vlog()[-1:])
    # 逐格点对（模拟回忆，每格间隔）
    for c in q['cells']:
        if c not in kid.js("MEMG.quiz.picked"):
            pick_cell(kid, c, note='点对记忆格', wait=1.0)
    st = kid.js("(() => ({ solved: MEMG.quiz ? MEMG.quiz.picked.length : -1, done: MEMG.currentLevel.done }))()")
    return True

def solve_rest(kid, wrong_plan=None):
    guard = 0
    while guard < 50:
        guard += 1
        cur = kid.js("MEMG.currentLevel")
        if not cur or cur['done']: break
        q = quiz_info(kid)
        if not q: break
        if q['phase'] != 'input':
            solve_quiz_as_child(kid, wrong_n=(wrong_plan or {}).get(q['step'], 0))
        else:
            # 上题残留（已点部分）：补完
            for c in q['cells']:
                if c not in q['picked']:
                    pick_cell(kid, c, note='补点记忆格', wait=1.0)
        time.sleep(1.2)
    return guard

def scen_a(browser):
    kid = Kid(browser, 'memg')
    kid.goto(); kid.hook_voice()
    kid.ev('scen_a_start', title=kid.js('document.title'))
    tut = kid.js('MEMG.tutorial')
    kid.ev('tut_state', phase=tut)
    q0 = quiz_info(kid)
    kid.ev('tut_show_phase_quiz', phase=q0 and q0['phase'], k=q0 and q0['k'], cells=q0 and q0['cells'])
    # --- show 期乱点（吞输入断言：picked 不变、phase 仍 show） ---
    kid.tap_blank(500, 120)
    pick_cell(kid, 0, note='show期点格子', wait=0.5)
    pick_cell(kid, 4, note='show期再点一格', wait=0.5)
    kid.tap('#btn-rabbit', note='show期点兔子')
    st = kid.js("(() => { const q=MEMG.quiz; return { phase:q.phase, picked:q.picked }; })()")
    kid.ev('show_swallow_check', **st, tut_now=kid.js('MEMG.tutorial'))
    kid.shot('A_tut_show')
    # --- 等 help（重发后再闪现一轮） → input 期跟手指点 ---
    reached = wait_tut(kid, 'help', 25)
    kid.ev('tut_help_reached', ok=reached)
    # help 期 show 阶段也乱点一次
    ph = kid.js("MEMG.quiz.phase")
    if ph == 'show':
        pick_cell(kid, 2, note='help期show阶段点格(应吞)', wait=0.5)
        st2 = kid.js("(() => ({ phase: MEMG.quiz.phase, picked: MEMG.quiz.picked }))()")
        kid.ev('help_show_swallow', **st2)
    q = wait_input(kid)
    kid.shot('A_tut_help_input')
    ghost = kid.js("(() => ({ show: document.getElementById('ghost').className.includes('show') }))()")
    kid.ev('ghost_in_help', **ghost)
    time.sleep(0.8)
    # 跟手指点第一格 → solo；第二格自主
    if q:
        pick_cell(kid, q['cells'][0], note='跟手指点记忆格', wait=1.2)
        kid.ev('tut_solo', ok=wait_tut(kid, 'solo', 6))
        rem = kid.js("MEMG.quiz")
        if rem and rem['cells'][1] not in rem['picked']:
            pick_cell(kid, rem['cells'][1], note='教学题第二格自主点', wait=1.2)
    time.sleep(1.5)
    solve_rest(kid)
    time.sleep(6)
    cel = kid.js("(() => ({ stars: (KIDS._save().levels['1-0']||{}).stars||0, plays:(KIDS._save().levels['1-0']||{}).plays||0, tutSeen: !!(KIDS._save().memg||{}).tutSeen }))()")
    kid.ev('level1_result', **cel)
    kid.shot('A_after_win')
    OUT['scens']['A_教学+第1关'] = {'通关': cel['stars']>=1, 'stars': cel['stars'], 'tutSeen': cel['tutSeen'],
        'show期吞输入': st['picked'] == [], '教学期乱点无pageerror': len(kid.errs)==0}
    kid.close()

def scen_b(browser):
    kid = Kid(browser, 'memg')
    kid.goto()
    kid.js(SEED_JS.replace('__KEY__', 'memg'), {'n': 1})
    kid.pg.reload(); kid.pg.wait_for_timeout(800)
    kid.hook_voice()
    kid.ev('scen_b_start', flat=kid.js('MEMG.currentLevel.flat'))
    kid.shot('B_start_1-1')
    # 第 1 题：input 期连点 3 个错格
    q = wait_input(kid)
    kid.ev('q0', k=q['k'], cells=q['cells'])
    wrongs = [i for i in range(9) if i not in q['cells']]
    for w in range(3):
        pick_cell(kid, wrongs[w], note='第%d次点错格%d' % (w+1, wrongs[w]), wait=0.9)
        st = kid.js("(() => { const q=MEMG.quiz; const cs=[...document.querySelectorAll('.cell')]; return { miss:q.miss, bad:cs.filter(c=>c.className.includes('bad')).length, pulse:cs.filter(c=>c.className.includes('pulse')).length }; })()")
        kid.ev('wrong%d_dom' % (w+1), **st)
        kid.ev('vlog_w%d' % (w+1), v=kid.vlog()[-1:])
    kid.shot('B_miss2_pulse')
    for c in q['cells']:
        pick_cell(kid, c, note='靠高亮点对', wait=1.0)
    kid.ev('q0_solved', step=kid.js("MEMG.quiz && MEMG.quiz.step"))
    # 第 2 题：input 期静置 17s → 救援 reflash
    q2 = wait_input(kid)
    kid.ev('q1_before_idle', k=q2['k'], cells=q2['cells'])
    kid.pg.evaluate('window.__vlog = []')
    kid.js("MEMG.rescues")   # 引用一次确认钩子在
    r0 = kid.js("MEMG.rescues")
    kid.idle(17, note='第2题input期静置等救援')
    r1 = kid.js("MEMG.rescues")
    refl = kid.js("(() => { const cs=[...document.querySelectorAll('.cell')]; return cs.filter(c=>c.className.includes('reflash')).length; })()")
    v = kid.vlog()
    kid.ev('rescue_check', rescues_before=r0, rescues_after=r1, reflash_cells=refl, vlog=v)
    kid.shot('B_rescue_reflash')
    for c in q2['cells']:
        pick_cell(kid, c, note='救援后点对', wait=1.0)
    time.sleep(1.5)
    solve_rest(kid)
    time.sleep(6)
    cel = kid.js("(() => ({ stars: (KIDS._save().levels['1-1']||{}).stars||0 }))()")
    kid.ev('level2_result', **cel)
    kid.shot('B_after_win')
    OUT['scens']['B_1-1_错3格+静置救援'] = {'通关': cel['stars']>=1, 'stars': cel['stars'],
        'rescues_delta': r1 - r0, '救援重闪reflash格数': refl, '救援语音': v, 'pageerrors': kid.errs[:2]}
    kid.close()

def scen_c(browser):
    kid = Kid(browser, 'memg')
    kid.goto()
    kid.js(SEED_JS.replace('__KEY__', 'memg'), {'n': 6, 'firstDay': YDAY})
    kid.pg.reload(); kid.pg.wait_for_timeout(800)
    kid.hook_voice()
    lv = kid.js("(() => ({ flat: MEMG.currentLevel.flat, ch: MEMG.currentLevel.ch, limit: KIDS.calendar.limit(Infinity) }))()")
    kid.ev('scen_c_start', **lv)
    kid.shot('C_start_2-1')
    q0 = wait_input(kid)
    kid.ev('ch2_first_quiz', N=q0['N'], k=q0['k'], cells=q0['cells'])
    # 模拟记混：点 1 个错格再点对 3 格
    wrongs = [i for i in range(9) if i not in q0['cells']]
    pick_cell(kid, wrongs[0], note='记混点错一格', wait=0.9)
    kid.ev('memory_slip', **kid.js("(() => ({ miss: MEMG.quiz.miss }))()"))
    for c in q0['cells']:
        pick_cell(kid, c, note='回忆点对', wait=1.0)
    time.sleep(1.5)
    solve_rest(kid, wrong_plan={2: 1})
    time.sleep(6)
    cel = kid.js("(() => ({ stars: (KIDS._save().levels['2-1']||{}).stars||0 }))()")
    kid.ev('ch2_result', **cel)
    kid.shot('C_after_win')
    OUT['scens']['C_第2章2-1'] = {'通关': cel['stars']>=1, 'stars': cel['stars'], '章': lv['ch'],
        '难度': '3x3 k=3(记忆量2→3)', 'pageerrors': kid.errs[:2]}
    kid.close()

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch()
        scen_a(browser); scen_b(browser); scen_c(browser)
        browser.close()
    with open(os.path.join(BASE, 'results', 'memg_result.json'), 'w', encoding='utf-8') as f:
        json.dump(OUT, f, ensure_ascii=False, indent=1)
    print('\nDONE memg')

if __name__ == '__main__':
    main()
