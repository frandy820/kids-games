# -*- coding: utf-8 -*-
"""thanks 感谢的话 自测（交付门禁；r12 难度改造扩容 2026-09-15）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 16 单元全绿断言
  相 1b 真实竖视口轮（r9 M-A1/r11 M-1）：独立 context 800×1180 真竖屏再跑 verify
    全绿（@media 真通道；相 1 横视口已验 body.port 类通道——双通道各验一轮）
  相 2 真实页：stub 发声 → 教学链（watch 情景+tha_fit 锚→幽灵手指点感谢卡→朋友开心
    __thDemoR='right' → turn 题（帮）点对 'done' 帮→独）→ 正式关 flat0 autoSolve 通关
    → 存档 kidsgame_thanks v1.0 + levels['1-0'].stars=3 → clips 12 条（th 5+tha 4+core 3）
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
            # ---- 相 1：verify 页（横视口 1280×800：body.port 类通道轮） ----
            pg = browser.new_context(viewport={'width': 1280, 'height': 800}).new_page()
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
            title = pg.title()
            vlog = pg.evaluate('window.__thVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v, '| pageerror:', len(errors))
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False))
            if not title.startswith('VERIFY PASS') or bad_units or errors or n_clip_v != 12:
                ok = False
            pg.close()

            # ---- 相 1b：真实竖视口轮（800×1180 @media 真通道；verify 全绿断言） ----
            pg = browser.new_context(viewport={'width': 800, 'height': 1180}).new_page()
            errors_b = []
            pg.on('pageerror', lambda e: errors_b.append(str(e)))
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
            title_b = pg.title()
            fw_b = pg.evaluate("document.getElementById('friend').offsetWidth")
            print('P1b verify(portrait 800x1180):', title_b, '| friendW:', fw_b,
                  '| pageerror:', len(errors_b))
            if not title_b.startswith('VERIFY PASS') or abs(fw_b - 140) > 2 or errors_b:
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
            # 教学链：watch 演示（朋友期待出场+情景句+tha_fit 框架锚+幽灵手指点感谢卡→朋友开心）
            print('P2 step1: waiting __thDemoR', flush=True)
            pg.wait_for_function("window.__thDemoR === 'right'", timeout=90000)
            print('P2 step2: waiting turn quiz (help)', flush=True)
            pg.wait_for_function(
                "window.TH && window.TH.quiz && window.TH.quiz.kind === 'fit'"
                " && window.TH.quiz.cards.length === 2 && TH.tutorial === 'help'"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            r_tut = pg.evaluate('window.TH.tapCard(window.TH.quiz.answer)')
            print('P2 step3: turn tap returned', r_tut, flush=True)
            # 正式关 flat0 开题解锁 → autoSolve 通关（5 题 3 星）
            pg.wait_for_function(
                "window.TH.currentLevel && window.TH.currentLevel.flat === 0"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            pg.evaluate('() => { window.__thAutoP = window.TH.autoSolve(); }')
            pg.wait_for_function(
                'window.TH.currentLevel && window.TH.currentLevel.done && window.TH.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__thAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（celebrate≈2.6s+400ms）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_thanks') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_thanks') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            th_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('th_') === 0).length")
            tha_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('tha_') === 0).length")
            print('P2 teach: tapCard(turn)=', r_tut, '| autoSolve=', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('thanks', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(th_', th_keys, '+ tha_', tha_keys,
                  '+ core', n_clip - th_keys - tha_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (r_tut == 'done' and res and res.get('done') and res.get('taps') == 5 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 12 and th_keys == 5 and tha_keys == 4 and not errors)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
