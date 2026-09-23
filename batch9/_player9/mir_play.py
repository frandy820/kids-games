# -*- coding: utf-8 -*-
"""mirror 对称贴贴画 · 6 岁半女孩试玩
场景A 全新开档：教学（乱点吞输入）→ 第 1 关通关 levels['1-0']
场景B 1-1：连错 2 次（干扰项全灰）+ 点灰卡防御 → 静置 17s 救援 → 纠正通关
场景C 种档 6(第2天) → 2-1 章 2 不对称镜像：模拟"选了原形"典型错误 → 纠正通关
"""
import json, os, random, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kidplay import Kid, SEED_JS, YDAY, BASE

random.seed(20260908)
OUT = {'game': 'mirror 对称贴贴画', 'scens': {}}
OPT = '.opt[data-i="%d"]'

def wait_tut(kid, want, timeout=15):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if kid.js('MIR.tutorial') == want: return True
        time.sleep(0.25)
    return False

def quiz_info(kid):
    return kid.js("(() => { const q = MIR.quiz; if (!q) return null; return { axis:q.axis,N:q.N,step:q.step,miss:q.miss, dead:q.dead, ans_mid:q.answer.mid, ans_mir:q.answer.mirrored, opts:q.options.map(o=>({mid:o.mid,mir:o.mirrored,color:o.color})) }; })()")

def solve_rest(kid, wrong_plan=None, pick_as_child=None):
    """答完当前关。wrong_plan={step:次数} 用"干扰项"错；pick_as_child(step,q) 自定义选错下标"""
    guard = 0
    while guard < 40:
        guard += 1
        q = quiz_info(kid)
        if not q: break
        n_wrong = (wrong_plan or {}).get(q['step'], 0)
        for w in range(n_wrong):
            # 错项=非 answer 且未 dead 的第一项
            qn = quiz_info(kid)
            wrongs = [i for i in range(3) if not qn['dead'][i] and not (qn['opts'][i]['mid']==qn['ans_mid'] and qn['opts'][i]['mir']==qn['ans_mir'])]
            if not wrongs: break
            wi = wrongs[0] if pick_as_child is None else pick_as_child(q, w)
            kid.tap(OPT % wi, wait=0.9, note='第%d次故意错(卡%d)' % (w+1, wi))
            st = kid.js("(() => { const q = MIR.quiz; const opts=[...document.querySelectorAll('.opt')]; return { miss:q.miss, dead:q.dead, shake:opts.filter(o=>o.className.includes('wrong')).length, pulse:opts.filter(o=>o.className.includes('pulse')).length }; })()")
            kid.ev('wrong_dom', step=q['step'], **st)
            kid.ev('vlog', v=kid.vlog()[-1:])
        # 点正确
        ok = False
        for _ in range(12):
            q2 = kid.js('(() => { const q = MIR.quiz; if (!q) return -1;\n  for (let i=0;i<q.options.length;i++) { const o=q.options[i];\n    if (o.mid===q.answer.mid && o.color===q.answer.color && o.mirrored===q.answer.mirrored) return i; }\n  return -1; })()')
            if q2 is None: ok = True; break
            if q2 >= 0:
                try:
                    kid.tap(OPT % q2, wait=1.3, note='答对')
                    ok = True; break
                except Exception: pass
            time.sleep(0.4)
        if not ok:
            kid.ev('tap_stuck'); break
        for _ in range(14):
            q3 = quiz_info(kid)
            if not q3 or q3['step'] != q['step']: break
            time.sleep(0.5)
    return guard

def scen_a(browser):
    kid = Kid(browser, 'mir')
    kid.goto(); kid.hook_voice()
    kid.ev('scen_a_start', title=kid.js('document.title'))
    tut = kid.js('MIR.tutorial')
    kid.ev('tut_state', phase=tut)
    st0 = kid.js("MIR.currentLevel.step")
    # watch 期乱点
    kid.tap_blank(500, 120)
    kid.tap(OPT % 0, note='watch期点选项卡')
    kid.tap('#btn-rabbit', note='watch期点兔子')
    st1 = kid.js("MIR.currentLevel.step")
    kid.ev('watch_swallow_check', step_before=st0, step_after=st1, tut_now=kid.js('MIR.tutorial'), vlog=kid.vlog())
    # help：ghost 指正确选项
    reached = wait_tut(kid, 'help', 20)
    kid.ev('tut_help_reached', ok=reached)
    kid.shot('A_tut_help')
    kid.tap_blank(300, 400)
    q = quiz_info(kid)
    ci = kid.js('(() => { const q = MIR.quiz; if (!q) return -1;\n  for (let i=0;i<q.options.length;i++) { const o=q.options[i];\n    if (o.mid===q.answer.mid && o.color===q.answer.color && o.mirrored===q.answer.mirrored) return i; }\n  return -1; })()')
    kid.tap(OPT % ci, wait=1.5, note='跟手指贴对')
    kid.ev('tut_solo', ok=wait_tut(kid, 'solo', 8))
    solve_rest(kid)
    time.sleep(6)
    cel = kid.js("(() => ({ stars: (KIDS._save().levels['1-0']||{}).stars||0, plays:(KIDS._save().levels['1-0']||{}).plays||0, tutSeen: !!(KIDS._save().mir||{}).tutSeen }))()")
    kid.ev('level1_result', **cel)
    kid.shot('A_after_win')
    OUT['scens']['A_教学+第1关'] = {'通关': cel['stars']>=1, 'stars': cel['stars'], 'tutSeen': cel['tutSeen'],
        '教学吞输入': st1==st0, '教学期乱点无pageerror': len(kid.errs)==0}
    kid.close()

def scen_b(browser):
    kid = Kid(browser, 'mir')
    kid.goto()
    kid.js(SEED_JS.replace('__KEY__', 'mir'), {'n': 1})
    kid.pg.reload(); kid.pg.wait_for_timeout(800)
    kid.hook_voice()
    kid.ev('scen_b_start', flat=kid.js('MIR.currentLevel.flat'))
    kid.shot('B_start_1-1')
    # 第 1 题连错 2 次（两个干扰全灰）→ 再点灰卡一次（儿童重复点灰卡）
    q = quiz_info(kid)
    kid.ev('q0', axis=q['axis'], ans=q['ans_mid'], opts=[(o['mid'], o['mir']) for o in q['opts']])
    for w in range(2):
        qn = quiz_info(kid)
        wrongs = [i for i in range(3) if not qn['dead'][i] and not (qn['opts'][i]['mid']==qn['ans_mid'] and qn['opts'][i]['mir']==qn['ans_mir'])]
        if not wrongs: break
        kid.tap(OPT % wrongs[0], wait=1.0, note='第%d次错' % (w+1))
        st = kid.js("(() => { const q=MIR.quiz; const opts=[...document.querySelectorAll('.opt')]; return { miss:q.miss, dead:q.dead, wrong_cls:opts.filter(o=>o.className.includes('wrong')).length, pulse:opts.filter(o=>o.className.includes('pulse')).length }; })()")
        kid.ev('wrong%d_dom' % (w+1), **st)
        kid.ev('vlog_w%d' % (w+1), v=kid.vlog()[-1:])
    kid.shot('B_miss2_pulse')
    # 点一次已灰卡（again 路径）
    dead_i = [i for i in range(3) if kid.js("MIR.quiz").get('dead', [False]*3)[i]]
    if dead_i:
        kid.tap(OPT % dead_i[0], wait=0.8, note='重复点灰卡')
        st = kid.js("(() => ({ miss: MIR.quiz.miss, step: MIR.quiz.step }))()")
        kid.ev('dead_tap_check', **st)
    # 纠正
    ci = kid.js('(() => { const q = MIR.quiz; if (!q) return -1;\n  for (let i=0;i<q.options.length;i++) { const o=q.options[i];\n    if (o.mid===q.answer.mid && o.color===q.answer.color && o.mirrored===q.answer.mirrored) return i; }\n  return -1; })()')
    kid.tap(OPT % ci, wait=1.5, note='排除后点对')
    kid.ev('self_corrected', q=quiz_info(kid) and {'step': kid.js('MIR.quiz.step')})
    # 第 2 题静置 17s
    q = kid.js("(() => ({ step: MIR.quiz.step }))()")
    kid.pg.evaluate('window.__vlog = []')
    kid.idle(17, note='第2题静置等救援')
    v = kid.vlog()
    kid.ev('idle_vlog', v=v)
    solve_rest(kid)
    time.sleep(6)
    cel = kid.js("(() => ({ stars: (KIDS._save().levels['1-1']||{}).stars||0 }))()")
    kid.ev('level2_result', **cel)
    kid.shot('B_after_win')
    OUT['scens']['B_1-1_连错+灰卡+救援'] = {'通关': cel['stars']>=1, 'stars': cel['stars'],
        '静置17s救援语音': v, 'pageerrors': kid.errs[:2]}
    kid.close()

def scen_c(browser):
    kid = Kid(browser, 'mir')
    kid.goto()
    kid.js(SEED_JS.replace('__KEY__', 'mir'), {'n': 6, 'firstDay': YDAY})
    kid.pg.reload(); kid.pg.wait_for_timeout(800)
    kid.hook_voice()
    lv = kid.js("(() => ({ flat: MIR.currentLevel.flat, ch: MIR.currentLevel.ch, limit: KIDS.calendar.limit(Infinity) }))()")
    kid.ev('scen_c_start', **lv)
    kid.shot('C_start_2-1')
    q0 = quiz_info(kid)
    kid.ev('ch2_first_quiz', axis=q0['axis'], ans_mid=q0['ans_mid'], ans_mir=q0['ans_mir'],
           opts=[(o['mid'], '镜' if o['mir'] else '原') for o in q0['opts']])
    # 模拟典型错误：章 2 选"原形"（未翻转）——6 岁不理解镜像翻转
    def pick_original(q, w):
        for i, o in enumerate(q['opts']):
            if o['mid'] == q['ans_mid'] and not o['mir'] and not q['dead'][i]: return i
        for i, o in enumerate(q['opts']):
            if not q['dead'][i] and not (o['mid']==q['ans_mid'] and o['mir']==q['ans_mir']): return i
        return 0
    q = quiz_info(kid)
    wi = pick_original(q, 0)
    kid.tap(OPT % wi, wait=1.1, note='选了原形(没翻转的)')
    kid.ev('original_wrong', **kid.js("(() => ({ miss: MIR.quiz.miss }))()"))
    ci = kid.js('(() => { const q = MIR.quiz; if (!q) return -1;\n  for (let i=0;i<q.options.length;i++) { const o=q.options[i];\n    if (o.mid===q.answer.mid && o.color===q.answer.color && o.mirrored===q.answer.mirrored) return i; }\n  return -1; })()')
    kid.tap(OPT % ci, wait=1.4, note='改成镜像形贴对')
    # 第 2 题再犯一次原形错误后纠正
    solve_rest(kid, wrong_plan={1: 1}, pick_as_child=pick_original)
    time.sleep(6)
    cel = kid.js("(() => ({ stars: (KIDS._save().levels['2-1']||{}).stars||0 }))()")
    kid.ev('ch2_result', **cel)
    kid.shot('C_after_win')
    OUT['scens']['C_第2章2-1'] = {'通关': cel['stars']>=1, 'stars': cel['stars'], '章': lv['ch'],
        '题型': 'answer=镜像形, 干扰含原形' if q0['ans_mir'] else '?', 'pageerrors': kid.errs[:2]}
    kid.close()

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch()
        scen_a(browser); scen_b(browser); scen_c(browser)
        browser.close()
    with open(os.path.join(BASE, 'results', 'mir_result.json'), 'w', encoding='utf-8') as f:
        json.dump(OUT, f, ensure_ascii=False, indent=1)
    print('\nDONE mir')

if __name__ == '__main__':
    main()
