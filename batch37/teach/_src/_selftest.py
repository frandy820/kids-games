# -*- coding: utf-8 -*-
"""teach 教会小兔子 自测（交付门禁；r5 难度改造版 2026-09-13）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 13 单元全绿断言
  相 2 真实页：stub 发声 → 教学链（watch 完整三步演示 N=4/skip 缺3 __tchDemoR='done'
    → turn N=5/dup 重3 三步走完帮→独 __tchTutSolo）→ 正式关 flat0 autoSolve 通关
    → 存档 kidsgame_teach v1.0 + levels['1-0'].stars=3 + r5 教到会 hits 写档
    （ch1 全 skip 5 题首选对→hits.skip=5+mastered.skip=true）→ clips 9 条（tch 6+core 3）
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
            vlog = pg.evaluate('window.__tchVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v, '| pageerror:', len(errors))
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False)[:1500])
            if not title.startswith('VERIFY PASS') or title != 'VERIFY PASS 13/13' \
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
            # 教学链：watch 完整三步演示（r5：N=4 示范 4 颗→兔子摆 1,2,4 漏 3→点「漏数了3」）
            print('P2 step1: waiting __tchDemoR', flush=True)
            pg.wait_for_function("window.__tchDemoR === 'done'", timeout=90000)
            watch_ms = pg.evaluate('window.__tchWatchMs')
            print('P2 step2: waiting turn quiz (help)', flush=True)
            pg.wait_for_function(
                "window.TCH && window.TCH.quiz && window.TCH.quiz.n === 5 && TCH.tutorial === 'help'"
                " && !state.locked && Date.now() >= (state.showUntil || 0)", timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            # turn 题 N=5/dup/重3 三步走完（示范步起帮；ghost 指托盘苹果，孩子点 5 颗）
            turn_r = [pg.evaluate('window.TCH.tapApple(%d)' % a) for a in range(5)]
            pg.wait_for_function("window.TCH.quiz && window.TCH.quiz.phase === 'fix'"
                                 " && !state.locked && Date.now() >= (state.showUntil || 0)", timeout=60000)
            pg.screenshot(path=str(SHOTS / 'real_fix.jpg'), quality=70, type='jpeg')
            ans = pg.evaluate('window.TCH.quiz.answer')      # 唯一 good=「3数了两遍」
            r_fix = pg.evaluate('window.TCH.tapFix(%d)' % ans)
            print('P2 step3: turn taps =', turn_r, r_fix, flush=True)
            # 正式关 flat0 开题解锁 → autoSolve 通关（5 题 ×（N 颗苹果+1 卡）=Σ(n+1) taps）
            pg.wait_for_function(
                "window.TCH.currentLevel && window.TCH.currentLevel.flat === 0"
                " && !state.locked && Date.now() >= (state.showUntil || 0)", timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            # flat0 期望 taps=Σ(n+1)（SPEC 语义：每题 n 颗苹果+1 好卡——ch1 n<10 恒逐个）——
            # 从题面真值推导，非读 autoSolve 被测行为（verify-assertion-same-source-trap 纪律）
            exp_taps = pg.evaluate('genLevel(0).quizzes.reduce((s, q) => s + q.n + 1, 0)')
            pg.evaluate('() => { window.__tchAutoP = window.TCH.autoSolve(); }')
            pg.wait_for_function(
                'window.TCH.currentLevel && window.TCH.currentLevel.done && window.TCH.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__tchAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（celebrate≈2.6s+800ms）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_teach') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_teach') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            tch_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('tch_') === 0).length")
            tut_solo = pg.evaluate('window.__tchTutSolo')
            taps_ok = res and res.get('done') and res.get('taps') == exp_taps
            hits_ok = (sv and sv.get('teach', {}).get('hits', {}).get('skip') == 5 and
                       sv.get('teach', {}).get('mastered', {}).get('skip') is True)
            print('P2 teach: taps =', turn_r, r_fix, '| autoSolve =', res,
                  '| watchMs =', watch_ms, '| tutSolo =', tut_solo)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| teach.hits=', sv and sv.get('teach', {}).get('hits'),
                  '| mastered=', sv and sv.get('teach', {}).get('mastered'))
            print('P2 clips:', n_clip, '(tch_', tch_keys, '+ core', n_clip - tch_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (turn_r[:4] == ['in'] * 4 and turn_r[4] == 'confirmed' and r_fix == 'done' and
                     tut_solo is True and
                     taps_ok and watch_ms and watch_ms <= 22000 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     hits_ok and
                     n_clip == 9 and tch_keys == 6 and not errors)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
