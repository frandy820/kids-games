# -*- coding: utf-8 -*-
"""comfort 安慰选择 自测（交付门禁 r11）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 14 单元全绿断言
    相 1b：verify 页真实竖视口轮 800×1180（M-1：@media 跟真实视口，竖屏 CSS 实跑）
  相 2 真实页：stub 发声 → 教学链（watch 情景+择优锚→幽灵手指点好卡→破涕为笑
    __coDemoR='right' → turn 题（帮）点对 'done' 帮→独）→ 正式关 flat0 autoSolve 通关
    → 存档 kidsgame_comfort v1.0 + levels['1-0'].stars=3 → clips 10 条（co 7+core 3）
    → pageerror 0（教学链首段+一轮点击全程）
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
            vlog = pg.evaluate('window.__coVlog')
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

            # ---- 相 1b：verify 页真实竖视口轮（M-1：@media 跟真实视口——与 body.port
            #      类通道正交的双保险，竖屏 CSS 在真实竖视口下实跑一遍） ----
            ctx_p = browser.new_context(viewport={'width': 800, 'height': 1180})
            pg = ctx_p.new_page()
            errors_p = []
            pg.on('pageerror', lambda e: errors_p.append(str(e)))
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
            title_p = pg.title()
            fw = pg.evaluate("document.getElementById('friend').offsetWidth")
            print('P1b verify(portrait 800x1180):', title_p, '| friendW:', fw, '| pageerror:', len(errors_p))
            if not title_p.startswith('VERIFY PASS') or abs(fw - 140) > 2 or errors_p:
                ok = False
            ctx_p.close()

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
            # 教学链：watch 演示（朋友伤心出场+情景句+幽灵手指点好卡→破涕为笑）
            print('P2 step1: waiting __coDemoR', flush=True)
            pg.wait_for_function("window.__coDemoR === 'right'", timeout=90000)
            print('P2 step2: waiting turn quiz (help)', flush=True)
            pg.wait_for_function(
                "window.CO && window.CO.quiz && window.CO.quiz.cards.length === 2 && CO.tutorial === 'help'"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            r_tut = pg.evaluate('window.CO.tapCard(window.CO.quiz.answer)')
            print('P2 step3: turn tap returned', r_tut, flush=True)
            # 正式关 flat0 开题解锁 → autoSolve 通关（5 题 3 星）
            pg.wait_for_function(
                "window.CO.currentLevel && window.CO.currentLevel.flat === 0"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            pg.evaluate('() => { window.__coAutoP = window.CO.autoSolve(); }')
            pg.wait_for_function(
                'window.CO.currentLevel && window.CO.currentLevel.done && window.CO.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__coAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（celebrate≈2.6s+400ms）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_comfort') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_comfort') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            co_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('co_') === 0).length")
            print('P2 teach: tapCard(turn)=', r_tut, '| autoSolve=', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('comfort', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(co_', co_keys, '+ core', n_clip - co_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (r_tut == 'done' and res and res.get('done') and res.get('taps') == 5 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 10 and co_keys == 7 and not errors)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
