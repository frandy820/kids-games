# -*- coding: utf-8 -*-
"""quickcmp 快速比大小 自测（交付门禁）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 全单元/13 单元全绿断言（r46 双 13）
  相 2 真实页：stub 发声 → 教学链（watch 演示 __qcDemoR='right' → turn 2 vs 4 点对）
    → 正式关 autoSolve 通关 → 存档 kidsgame_quickcmp v1.0 + levels['1-0'].stars=3
    → clips 32 条（qc 29+core 3）注入无缺（r46 段二注册 11 新键后口径 09-22）
  相 3 dual 真实驱动腿（r46）：start(15) ch4 双闪两段式——tapSide(正确侧)='half'
    转 phase=1 → tapSide(正确档)='right' step+1（两段判定真实页实证）
纪律：独立 chromium.launch(--mute-audio)（禁 connect/禁杀任何浏览器）；单 page 串行测完即关；
  每页 goto 前 add_init_script 静音+种档 settings{sound:false,tts:false,vol:0}（r19 外放事故）。"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)

MUTE_INIT = """(() => {
  try {
    const s = JSON.parse(localStorage.getItem('kidsgame_quickcmp') || 'null') || {};
    s.settings = Object.assign(s.settings || {}, { sound: false, tts: false, vol: 0 });
    localStorage.setItem('kidsgame_quickcmp', JSON.stringify(s));
  } catch (e) {}
})();"""


def main():
    ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])
        try:
            # ---- 相 1：verify 页 ----
            pg = browser.new_page()
            pg.add_init_script(MUTE_INIT)
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY PASS') >= 0", timeout=240000)
            title = pg.title()
            vlog = pg.evaluate('window.__qcVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v)
            print('P1 bad units:', bad_units)
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False))
            if not title.startswith('VERIFY PASS') or bad_units or vlog['pass'] != vlog['total']:
                ok = False
            pg.close()

            # ---- 相 2：真实页 ----
            pg = browser.new_page()
            pg.add_init_script(MUTE_INIT)
            pg.goto(URL, timeout=60000)
            pg.wait_for_timeout(2500)
            pg.evaluate("""() => {
                KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {};
                KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {};
            }""")
            # 教学链：watch 演示（3 vs 5 闪现+幽灵手指点「右边多」）→ __qcDemoR='right'
            print('P2 step1: waiting __qcDemoR', flush=True)
            pg.wait_for_function("window.__qcDemoR === 'right'", timeout=90000)
            print('P2 step2: waiting turn quiz', flush=True)
            # turn 题（你来比一比=2 vs 4，帮阶段）出现 → 点正确侧（末题 → 'done'，帮→独进正式关）
            pg.wait_for_function(
                "window.QC && window.QC.quiz && window.QC.quiz.nL === 2 && window.QC.quiz.nR === 4"
                " && QC.tutorial === 'help' && !state.locked", timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            print('P2 step3: tap turn answer', flush=True)
            r_tut = pg.evaluate('window.QC.tapSide(window.QC.quiz.nL > window.QC.quiz.nR ? "L" : "R")')
            print('P2 step4: turn tap returned', r_tut, flush=True)
            # 正式关 flat0 开题解锁 → autoSolve 通关（5 题 3 星）
            pg.wait_for_function(
                "window.QC.currentLevel && window.QC.currentLevel.flat === 0 && !state.locked",
                timeout=90000)
            print('P2 step5: real level open', flush=True)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            pg.evaluate('() => { window.__qcAutoP = window.QC.autoSolve(); }')
            pg.wait_for_function(
                'window.QC.currentLevel && window.QC.currentLevel.done && window.QC.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__qcAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（celebrate≈2.6s+400ms）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_quickcmp') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_quickcmp') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            qc_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('qc_') === 0).length")
            print('P2 teach: tapSide(turn)=', r_tut, '| autoSolve=', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'))
            print('P2 clips:', n_clip, '(qc_', qc_keys, '+ core', n_clip - qc_keys, ')')
            p2_ok = (r_tut == 'done' and res and res.get('done') and res.get('taps') == 5 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 32 and qc_keys == 29)   # r46 段二注册后 32 条（qc 29+core 3）
            if not p2_ok:
                ok = False

            # ---- 相 3：dual 真实驱动腿（r46 两段式 SPEC-R46 §R3）----
            print('P3 step1: start(15) dual level', flush=True)
            pg.evaluate('window.QC.start(15)')
            # 等双闪毕开放（第一问 phase=0：方向三选）
            pg.wait_for_function(
                "window.QC.quiz && window.QC.quiz.kind === 'dual' && window.QC.quiz.phase === 0"
                " && !state.locked && !state.flashOn", timeout=60000)
            q3 = pg.evaluate('window.QC.quiz')
            pg.screenshot(path=str(SHOTS / 'real_dual_p0.jpg'), quality=70, type='jpeg')
            print('P3 step2: dual p0 quiz', q3 and {k: q3[k] for k in ('nL', 'nR', 'd', 'phase')}, flush=True)
            # 第一问：独立正确侧（nL>nR?'L':'R'——dual 恒非等）
            r1 = pg.evaluate('window.QC.tapSide(window.QC.quiz.nL > window.QC.quiz.nR ? "L" : "R")')
            # half → phase=1 差值档按钮（第二问问句窗 2700 后开放）
            pg.wait_for_function(
                "window.QC.quiz && window.QC.quiz.phase === 1 && !state.locked", timeout=30000)
            pg.screenshot(path=str(SHOTS / 'real_dual_p1.jpg'), quality=70, type='jpeg')
            # 第二问：正确档 String(d)（独立推导 d=|nL-nR|）
            r2 = pg.evaluate('window.QC.tapSide(String(window.QC.quiz.d))')
            step3 = pg.evaluate('window.QC.currentLevel.step')
            p3_ok = (r1 == 'half' and r2 == 'right' and step3 == 1 and
                     q3 and q3['d'] == abs(q3['nL'] - q3['nR']) and q3['d'] in (2, 4, 6))
            print('P3 dual: half=', r1, '| gapRight=', r2, '| step=', step3, '| d=', q3 and q3['d'])
            if not p3_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
