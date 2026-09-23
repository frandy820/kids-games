# -*- coding: utf-8 -*-
"""crd 贺卡工坊 自测（交付门禁）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → r12 14 单元全绿断言
  相 2 真实页：stub 发声 → 教学链（watch 线索句→幽灵手指点契合项→落位
    __crdDemoR='placed' → turn 卡（帮）真实点击契合项×2 步 'done' 帮→独——
    b37 探针教训：必含真实点击）→ 正式关 flat0 autoSolve 通关（5 卡×2 步=10 放）
    → 存档 kidsgame_crd v1.0 + levels['1-0'].stars=3 → clips 31 条（crd 28+core 3——T46 阶段2 情境句 +20）
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
            vlog = pg.evaluate('window.__crdVlog')
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

            # ---- 相 1b：真实竖视口轮（800×1180 @media 真通道；M3——verify 全绿+artW=72 断言） ----
            pg = browser.new_context(viewport={'width': 800, 'height': 1180}).new_page()
            errors_b = []
            pg.on('pageerror', lambda e: errors_b.append(str(e)))
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
            title_b = pg.title()
            aw_b = pg.evaluate(
                "document.querySelector('.pick-wrap .art') && document.querySelector('.pick-wrap .art').offsetWidth")
            print('P1b verify(portrait 800x1180):', title_b, '| artW:', aw_b,
                  '| pageerror:', len(errors_b))
            if not title_b.startswith('VERIFY PASS') or not aw_b or abs(aw_b - 72) > 2 or errors_b:
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
            # 教学链：watch 演示（画布出场+主题句+幽灵手指点契合项→底纹落位）
            print('P2 step1: waiting __crdDemoR', flush=True)
            pg.wait_for_function("window.__crdDemoR === 'placed'", timeout=90000)
            print('P2 step2: waiting turn quiz (help)', flush=True)
            pg.wait_for_function(
                "window.CRD && window.CRD.quiz && window.CRD.quiz.picks.length === 3 && CRD.tutorial === 'help'"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            # 真实点击（b37 探针教训：驱动路径必含一次真实 DOM 点击——非仅钩子驱动）
            # turn 卡两步连做：每步重读 quiz（一题多步——b38 坑③）
            for step_i in range(2):
                good_j = pg.evaluate('window.CRD.quiz.answer')
                pg.click('.pick-wrap[data-j="%d"]' % good_j, timeout=10000)
                print('P2 step3: real click on pick j=%d (stage %d)' % (good_j, step_i), flush=True)
                if step_i == 0:
                    pg.wait_for_function(
                        "window.CRD.quiz && window.CRD.quiz.stage === 1 && !state.locked"
                        " && Date.now() >= (state.showUntil || 0)", timeout=90000)
            # turn 迷你关单卡两步：真实点击做完 → done → 帮→独 → 进正式关 flat0
            pg.wait_for_function(
                "window.CRD.currentLevel && window.CRD.currentLevel.flat === 0"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            tut_solo = pg.evaluate('window.__crdTutSolo === true')
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            # 正式关 flat0 autoSolve 通关（5 卡×2 步=10 放，3 星）
            pg.evaluate('() => { window.__crdAutoP = window.CRD.autoSolve(); }')
            pg.wait_for_function(
                'window.CRD.currentLevel && window.CRD.currentLevel.done && window.CRD.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__crdAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（celebrate≈2.6s+400ms）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_crd') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_crd') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            crd_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('crd_') === 0).length")
            print('P2 teach: realClick x2 → solo =', tut_solo, '| autoSolve =', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('crd', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(crd_', crd_keys, '+ core', n_clip - crd_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (tut_solo and res and res.get('done') and res.get('taps') == 10 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 31 and crd_keys == 28 and not errors)   # T46：crd_ 28+core 3
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
