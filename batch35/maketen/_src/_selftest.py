# -*- coding: utf-8 -*-
"""maketen 凑十小铺 自测（交付门禁）：
  相 1 verify 页：等 document.title 含 VERIFY → 12 单元全绿断言
  相 2 真实页：stub 发声 → 教学链（watch 3+7 收银演示 __mtDemoR='right'
    → turn 2+□=10 题点对 'done' 帮→独）→ 正式关 flat0 autoSolve 通关
    → 存档 kidsgame_maketen v1.0 + levels['1-0'].stars=3 → clips 9 条（mt 6+core 3）
    → pageerror 0（教学链首段+一轮点击全程）
纪律：独立 chromium.launch(--mute-audio)（禁 connect/禁杀任何浏览器）；单 page 串行测完即关。"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()


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
            vlog = pg.evaluate('window.__mtVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v, '| pageerror:', len(errors))
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False)[:3000])
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
            # 教学链：watch 演示（3+7 收银+幽灵手指点补数卡）
            print('P2 step1: waiting __mtDemoR', flush=True)
            pg.wait_for_function("window.__mtDemoR === 'right'", timeout=90000)
            print('P2 step2: waiting turn quiz (help)', flush=True)
            pg.wait_for_function(
                "window.MT && window.MT.quiz && window.MT.quiz.a === 2 && MT.tutorial === 'help'"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            r_tut = pg.evaluate('window.MT.tapCard(window.MT.quiz.answer)')
            print('P2 step3: turn tap returned', r_tut, flush=True)
            # 正式关 flat0 题面开放 → autoSolve 通关（5 题 3 星）
            pg.wait_for_function(
                "window.MT.currentLevel && window.MT.currentLevel.flat === 0"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.evaluate('() => { window.__mtAutoP = window.MT.autoSolve(); }')
            pg.wait_for_function(
                'window.MT.currentLevel && window.MT.currentLevel.done && window.MT.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__mtAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（celebrate≈2.6s+400ms）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_maketen') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_maketen') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            mt_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('mt_') === 0).length")
            print('P2 teach: tapCard(turn)=', r_tut, '| autoSolve=', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('maketen', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(mt_', mt_keys, '+ core', n_clip - mt_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (r_tut == 'done' and res and res.get('done') and res.get('taps') == 5 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 9 and mt_keys == 6 and not errors)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
