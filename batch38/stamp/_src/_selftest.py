# -*- coding: utf-8 -*-
"""stamp 规律画画 自测（交付门禁 v3 升档）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 12 单元全绿断言
  相 2 真实页：stub 发声 → 教学链（watch 任务句→幽灵手指点正确章→盖印留格
    __stDemoR='stamped' → turn 题（帮，3 枚盘）真实点击正确章 'done' 帮→独
    ——b37 探针教训：必含一次真实点击）→ 正式关 flat0 autoSolve 通关 → 存档
    kidsgame_stamp v1.0 + levels['1-0'].stars=3 → clips 12 条（spm 9+core 3，
    4 条新增为占位复制）→ pageerror 0
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
            vlog = pg.evaluate('window.__stVlog')
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
            # 教学链：watch 演示（载体出场+规律句+幽灵手指点正确章→盖印留格）
            print('P2 step1: waiting __stDemoR', flush=True)
            pg.wait_for_function("window.__stDemoR === 'stamped'", timeout=90000)
            print('P2 step2: waiting turn quiz (help)', flush=True)
            pg.wait_for_function(
                "window.ST && window.ST.quiz && window.ST.quiz.picks.length === 3 && ST.tutorial === 'help'"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            # 真实点击（b37 探针教训：驱动路径必含一次真实 DOM 点击——非仅钩子驱动）
            good_j = pg.evaluate('window.ST.quiz.answer')
            pg.click('.stamp-wrap[data-j="%d"]' % good_j, timeout=10000)
            print('P2 step3: real click on stamp j=%d' % good_j, flush=True)
            # turn 迷你关单题：真实点击盖对 → done → 帮→独 → 进正式关 flat0
            pg.wait_for_function(
                "window.ST.currentLevel && window.ST.currentLevel.flat === 0"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            tut_solo = pg.evaluate('window.__stTutSolo === true')
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            # 正式关 flat0 autoSolve 通关（5 题 3 星）
            pg.evaluate('() => { window.__stAutoP = window.ST.autoSolve(); }')
            pg.wait_for_function(
                'window.ST.currentLevel && window.ST.currentLevel.done && window.ST.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__stAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（celebrate≈2.6s+400ms）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_stamp') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_stamp') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            spm_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('spm_') === 0).length")
            print('P2 teach: realClick→solo=', tut_solo, '| autoSolve=', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('stamp', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(spm_', spm_keys, '+ core', n_clip - spm_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (tut_solo and res and res.get('done') and res.get('taps') == 5 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 12 and spm_keys == 9 and not errors)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
