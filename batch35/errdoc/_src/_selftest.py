# -*- coding: utf-8 -*-
"""errdoc 错题小医生 自测（交付门禁）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 12 单元全绿断言
  相 2 真实页：stub 发声 → 教学链（watch 完整三步演示 __edDemoR='done' → turn
    7+6=12 三步走完帮→独 __edTutSolo）→ 正式关 flat0 autoSolve 通关
    → 存档 kidsgame_errdoc v1.0 + levels['1-0'].stars=3 → clips 12 条（ed 9+core 3）
    → pageerror 0（教学链+一轮点击全程）
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
            vlog = pg.evaluate('window.__edVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v, '| pageerror:', len(errors))
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False)[:1500])
            if not title.startswith('VERIFY PASS') or title != 'VERIFY PASS 12/12' \
               or bad_units or errors:
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
            # 教学链：watch 完整三步演示（点答案病灶→选药→归因）→ 'done'
            print('P2 step1: waiting __edDemoR', flush=True)
            pg.wait_for_function("window.__edDemoR === 'done'", timeout=90000)
            print('P2 step2: waiting turn quiz (help)', flush=True)
            pg.wait_for_function(
                "window.ED && window.ED.quiz && window.ED.quiz.shown.a === 7 && ED.tutorial === 'help'"
                " && !state.locked && Date.now() >= (state.showUntil || 0)", timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            # turn 题 7+6=12 三步走完（步1 起帮；ghost 指病灶，孩子点）
            r1 = pg.evaluate('window.ED.tapPart(2)')
            pg.wait_for_function("window.ED.quiz && window.ED.quiz.phase === 'fix'"
                                 " && !state.locked && Date.now() >= (state.showUntil || 0)", timeout=60000)
            pg.screenshot(path=str(SHOTS / 'real_pills.jpg'), quality=70, type='jpeg')
            pi = pg.evaluate("(() => { const bs = document.querySelectorAll('#pills .pill');"
                             " for (let i = 0; i < bs.length; i++) if (bs[i].textContent === '13') return i;"
                             " return -1; })()")
            r2 = pg.evaluate('window.ED.tapFix(%d)' % pi)
            pg.wait_for_function("window.ED.quiz && window.ED.quiz.phase === 'why'"
                                 " && !state.locked && Date.now() >= (state.showUntil || 0)", timeout=60000)
            r3 = pg.evaluate('window.ED.tapWhy(0)')
            print('P2 step3: turn taps =', r1, r2, r3, flush=True)
            # 正式关 flat0 开题解锁 → autoSolve 通关（5 题 × 三步 = 15 taps）
            pg.wait_for_function(
                "window.ED.currentLevel && window.ED.currentLevel.flat === 0"
                " && !state.locked && Date.now() >= (state.showUntil || 0)", timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            pg.evaluate('() => { window.__edAutoP = window.ED.autoSolve(); }')
            pg.wait_for_function(
                'window.ED.currentLevel && window.ED.currentLevel.done && window.ED.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__edAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（celebrate≈2.6s+400ms）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_errdoc') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_errdoc') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            ed_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('ed_') === 0).length")
            tut_solo = pg.evaluate('window.__edTutSolo')
            print('P2 teach: taps =', [r1, r2, r3], '| autoSolve =', res, '| tutSolo =', tut_solo)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('errdoc', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(ed_', ed_keys, '+ core', n_clip - ed_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (r1 == 'spot' and r2 == 'fix' and r3 == 'done' and tut_solo is True and
                     res and res.get('done') and res.get('taps') == 15 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 12 and ed_keys == 9 and not errors)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
