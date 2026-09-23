# -*- coding: utf-8 -*-
"""cbx 冷静工具箱 自测（交付门禁，照 batch39/etm/_selftest.py 形态——b39 N3 定版：
  探针=钩子枚举定形状；真实 DOM 点击验证由本文件承担（pg.click('.pick[data-i]')
  真实点击补上事件绑定链——picksEl pointerdown 绑定断裂时钩子链照绿的盲区）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 12 单元全绿断言
  相 2 真实页：stub 发声 → 教学链（watch 演示 __cbxDemoR='picked' → help 段
    真实 DOM 点击好卡 → __cbxTutSolo=true → 进正式关 flat0）→ autoSolve 通关
    → 存档 kidsgame_cbx v1.0 + levels['1-0'].stars=3 → clips 39 条（cbx 36+core 3——T46 阶段2 情境句 +20）
    → pageerror 0
纪律：独立 chromium.launch(--mute-audio)（禁 connect/禁杀任何浏览器）；单 page 串行测完即关。"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)


def main():
    ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])
        try:
            # ---- 相 1：verify 页 ----
            pg = browser.new_page()
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
            title = pg.title()
            vlog = pg.evaluate('window.__cbxVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v, '| pageerror:', len(errors))
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False))
            if not title.startswith('VERIFY PASS') or bad_units or errors:
                ok = False
            pg.close()

            # ---- 相 2：真实页 ----
            pg = browser.new_page()
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(URL, timeout=60000)
            pg.wait_for_timeout(2500)
            pg.evaluate("""() => {
                KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {};
                KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {};
            }""")
            # 教学链：watch 演示（情境句+demo 点好卡）→ __cbxDemoR='picked'
            print('P2 step1: waiting __cbxDemoR', flush=True)
            pg.wait_for_function("window.__cbxDemoR === 'picked'", timeout=90000)
            print('P2 step2: waiting help quiz (unlocked)', flush=True)
            pg.wait_for_function(
                "window.CBX && window.CBX.quiz && window.CBX.quiz.picks.length === 3"
                " && window.CBX.tutorial === 'help' && !state.locked"
                " && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_help.jpg'), quality=70, type='jpeg')
            # 真实 DOM 点击（b39 N3：事件绑定链验证——pointerdown→uiTapPick(dataset.i)）
            good_i = pg.evaluate('window.CBX.quiz.answer')
            pg.click('.pick[data-i="%d"]' % good_i, timeout=10000)
            print('P2 step3: real click on pick i=%d' % good_i, flush=True)
            # help 首次指对 → solo → 进正式关 flat0（taps 不锁形状——SPEC 未定死 autoSolve 计数字段）
            pg.wait_for_function(
                "window.__cbxTutSolo === true && window.CBX.currentLevel"
                " && window.CBX.currentLevel.flat === 0 && !state.locked",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            # 正式关 flat0 autoSolve 通关（5 题，3 星）
            pg.evaluate('() => { window.__cbxAutoP = window.CBX.autoSolve(); }')
            pg.wait_for_function(
                'window.CBX.currentLevel && window.CBX.currentLevel.done && window.CBX.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__cbxAutoP')
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_cbx') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_cbx') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            cbx_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('cbx_') === 0).length")
            print('P2 teach: realClick → solo =', True, '| autoSolve =', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('cbx', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(cbx_', cbx_keys, '+ core', n_clip - cbx_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (res and res.get('done') and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 39 and cbx_keys == 36 and not errors)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
