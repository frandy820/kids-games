# -*- coding: utf-8 -*-
"""whereistand 方位排排队 · 6 岁半女孩试玩
场景A 全新开档：教学看-帮-独（乱点测试）→ 第 1 关真实点击通关（目标 levels['1-0'].stars>=1）
场景B 第 2 关(1-1)：故意连错 3 次看提示支架 → 静置 17s 看救援 → 纠正通关
场景C 种档 6 关(第2天) → 玩第 2 章 2-1（左右方位，观察左右混淆）
"""
import json, os, random, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kidplay import Kid, SEED_JS, YDAY, BASE

random.seed(20260907)
OUT = {'game': 'whereistand 方位排排队', 'scens': {}}

CARD = '.card[data-i="%d"]'

def wait_tut(kid, want, timeout=15):
    t0 = time.time()
    while time.time() - t0 < timeout:
        st = kid.js("WIS.tutorial")
        if st == want: return True
        time.sleep(0.25)
    return False

def quiz_info(kid):
    return kid.js("(() => { const q = WIS.quiz; if (!q) return null; return {mode:q.mode,dir:q.dir,k:q.k,orient:q.orient,answerIdx:q.answerIdx,step:q.step,miss:q.miss}; })()")

def solve_rest(kid, tag, wrong_plan=None):
    """答完当前关剩余题：默认全对；wrong_plan={step:错误次数} 模拟先错后对"""
    guard = 0
    while guard < 40:
        guard += 1
        q = quiz_info(kid)
        if not q:
            break
        n_wrong = (wrong_plan or {}).get(q['step'], 0)
        for w in range(n_wrong):
            wrong_i = 0 if q['answerIdx'] != 0 else 4
            kid.tap(CARD % wrong_i, wait=0.9, note='故意错%d %s 题 ans=%d' % (w+1, q['dir'], q['answerIdx']))
            st = kid.js("(() => { const q = WIS.quiz; const ok = document.querySelector('.card[data-i=\"'+q.answerIdx+'\"]'); return { miss: q.miss, breathe: ok ? ok.className : '' }; })()")
            kid.ev('wrong_feedback', step=q['step'], miss=st['miss'], correct_card_class=st['breathe'])
        # 等待演出锁释放后点正确
        ok = False
        for _ in range(12):
            q2 = quiz_info(kid)
            if not q2: ok = True; break
            try:
                kid.pg.locator(CARD % q2['answerIdx']).first.wait_for(state='visible', timeout=1200)
                kid.tap(CARD % q2['answerIdx'], wait=1.3, note='答对')
                ok = True; break
            except Exception:
                time.sleep(0.4)
        if not ok:
            kid.ev('tap_stuck'); break
        # 等换题
        for _ in range(14):
            q3 = quiz_info(kid)
            if not q3 or q3['step'] != q['step']: break
            time.sleep(0.5)
    return guard

def scen_a(browser):
    kid = Kid(browser, 'wis')
    kid.goto()
    kid.hook_voice()
    kid.ev('scen_a_start', title=kid.js('document.title'))

    # --- 教学期"看"阶段乱点（吞输入断言） ---
    tut = kid.js('WIS.tutorial')
    kid.ev('tut_state', phase=tut)
    st0 = kid.js("WIS.currentLevel.step")
    kid.tap_blank(500, 120)                       # 点天空
    kid.tap(CARD % 0, note='watch期点动物卡')
    kid.tap('#btn-rabbit', note='watch期点兔子')
    kid.tap('#prompt-chip', note='watch期点题面卡')
    st1 = kid.js("WIS.currentLevel.step")
    v_after_watch = kid.vlog()
    kid.ev('watch_swallow_check', step_before=st0, step_after=st1,
           tut_now=kid.js('WIS.tutorial'), vlog=v_after_watch)

    # --- 等"帮"阶段（ghost 手指出现） ---
    reached = wait_tut(kid, 'help', 20)
    kid.ev('tut_help_reached', ok=reached)
    ghost = kid.js("(() => ({ show: document.getElementById('ghost').className.includes('show'), n_cards: document.querySelectorAll('.card').length }))()")
    kid.ev('ghost_state', **ghost)
    kid.shot('A_tut_help')
    # 乱点一次空白再跟点（儿童先点歪）
    kid.tap_blank(300, 400)
    q = quiz_info(kid)
    kid.tap(CARD % q['answerIdx'], note='跟手指点正确动物')
    solo = wait_tut(kid, 'solo', 8)
    kid.ev('tut_solo', ok=solo)

    # --- 剩余 4 题自主答（全对模拟"听懂了"） ---
    solve_rest(kid, 'A')
    # 等 celebrate + 写档（celebrate 2.3s + 收起，任务要求等≥5s）
    time.sleep(6)
    cel = kid.js("(() => ({ seen: true, stars: (KIDS._save().levels['1-0']||{}).stars||0, plays: (KIDS._save().levels['1-0']||{}).plays||0, tutSeen: !!(KIDS._save().wis||{}).tutSeen, next: WIS.currentLevel ? WIS.currentLevel.flat : null }))()")
    kid.ev('level1_result', **cel)
    kid.shot('A_after_win')
    OUT['scens']['A_教学+第1关'] = {
        '通关': cel['stars'] >= 1, 'stars': cel['stars'], 'plays': cel['plays'],
        'tutSeen': cel['tutSeen'], '教学吞输入': st1 == st0,
        '教学期乱点无pageerror': len(kid.errs) == 0,
        'vlog': v_after_watch,
    }
    kid.close()
    return cel['stars']

def scen_b(browser):
    kid = Kid(browser, 'wis')
    kid.goto()
    kid.js(SEED_JS.replace('__KEY__', 'wis'), {'n': 1})
    kid.pg.reload(); kid.pg.wait_for_timeout(800)
    kid.hook_voice()
    kid.ev('scen_b_start', flat=kid.js('WIS.currentLevel.flat'))
    kid.shot('B_start_1-1')

    # --- 第 1 题故意连错 3 次 ---
    q = quiz_info(kid)
    kid.ev('q0', **q)
    for w in range(3):
        wrong_i = 0 if q['answerIdx'] != 0 else 4
        kid.tap(CARD % wrong_i, wait=1.0, note='第%d次故意错' % (w+1))
        st = kid.js("(() => { const q = WIS.quiz; const cards = [...document.querySelectorAll('.card')]; return { miss: q.miss, wig: cards.filter(c=>c.className.includes('wig')).length, dim: cards.filter(c=>c.className.includes('dim')).length, breathe: cards.filter(c=>c.className.includes('breathe')).length }; })()")
        kid.ev('wrong%d_dom' % (w+1), **st)
        kid.ev('vlog_after_wrong%d' % (w+1), v=kid.vlog()[-2:])
    kid.shot('B_miss2_pulse')
    # pulse 后自我纠正
    kid.tap(CARD % q['answerIdx'], wait=1.3, note='靠高亮纠正点对')
    kid.ev('self_corrected', q=quiz_info(kid))

    # --- 第 2 题静置 17s 看救援 ---
    q = quiz_info(kid)
    kid.ev('q1_before_idle', **q)
    kid.pg.evaluate('window.__vlog = []')
    kid.idle(17, note='第2题静置等救援')
    v = kid.vlog()
    kid.ev('idle_vlog', v=v)
    kid.tap(CARD % q['answerIdx'], wait=1.3, note='救援后答对')

    # --- 剩余题全对，通关 ---
    solve_rest(kid, 'B')
    time.sleep(6)
    cel = kid.js("(() => ({ stars: (KIDS._save().levels['1-1']||{}).stars||0, plays: (KIDS._save().levels['1-1']||{}).plays||0 }))()")
    kid.ev('level2_result', **cel)
    kid.shot('B_after_win')
    OUT['scens']['B_第2关_错3次+静置救援'] = {
        '通关': cel['stars'] >= 1, 'stars': cel['stars'],
        'miss2后正确卡高亮': None, '静置17s救援语音': v,
        'pageerrors': kid.errs[:2],
    }
    kid.close()

def scen_c(browser):
    kid = Kid(browser, 'wis')
    kid.goto()
    kid.js(SEED_JS.replace('__KEY__', 'wis'), {'n': 6, 'firstDay': YDAY})
    kid.pg.reload(); kid.pg.wait_for_timeout(800)
    kid.hook_voice()
    lv = kid.js("(() => ({ flat: WIS.currentLevel.flat, ch: WIS.currentLevel.ch, limit: KIDS.calendar.limit(Infinity) }))()")
    kid.ev('scen_c_start', **lv)
    kid.shot('C_start_2-1')

    # 记录第 2 章题型变化（ch2=左右）
    q0 = quiz_info(kid)
    kid.ev('ch2_first_quiz', **q0)
    # 模拟 6 岁左右混淆：第 1 题先点错边（把"最右"点成最左）
    wrong_i = 0 if q0['answerIdx'] != 0 else 4
    kid.tap(CARD % wrong_i, wait=1.1, note='左右混淆点错边')
    st = kid.js("(() => { const q = WIS.quiz; return { miss: q.miss }; })()")
    kid.ev('lr_confuse_wrong', **st)
    kid.tap(CARD % q0['answerIdx'], wait=1.3, note='看高亮后纠正')

    solve_rest(kid, 'C', wrong_plan={1: 1, 3: 1})   # 中途再各混淆一次
    time.sleep(6)
    cel = kid.js("(() => ({ stars: (KIDS._save().levels['2-1']||{}).stars||0, plays: (KIDS._save().levels['2-1']||{}).plays||0 }))()")
    kid.ev('ch2_result', **cel)
    kid.shot('C_after_win')
    OUT['scens']['C_第2章2-1'] = {
        '通关': cel['stars'] >= 1, 'stars': cel['stars'], '章': lv['ch'],
        '题型': q0, 'pageerrors': kid.errs[:2],
    }
    kid.close()

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch()
        s1 = scen_a(browser)
        scen_b(browser)
        scen_c(browser)
        browser.close()
    OUT['pageerror_total'] = []
    with open(os.path.join(BASE, 'results', 'wis_result.json'), 'w', encoding='utf-8') as f:
        json.dump(OUT, f, ensure_ascii=False, indent=1)
    print('\nDONE wis, level1 stars =', s1)

if __name__ == '__main__':
    main()
