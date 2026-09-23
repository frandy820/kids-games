# -*- coding: utf-8 -*-
"""brk 问题拆解小博士 自测（交付门禁，照 etm/_selftest.py 形态——N3 定版：
  探针=钩子枚举定形状，真实 DOM 点击验证由本文件承担（pg.click 真实 DOM
  .tcard[data-i] 至少一次——卡池 pointerdown 绑定断裂时钩子链全绿盲区）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 12 单元全绿断言
  相 2 真实页：stub 发声 → 教学链（watch 演示三张点完首题 __brkDemoR='done'
    → help 段真实 DOM 点击正确卡 → __brkTutSolo=true → 点满 3 张进正式关
    flat0）→ autoSolve 通关 → 存档 kidsgame_brk v1.0 + levels['1-0'].stars=3
    → clips 57 条（brk 54+core 3——T46 阶段2 模板+40 步序卡）→ pageerror 0
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
            vlog = pg.evaluate('window.__brkVlog')
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
            # 教学链：watch 演示（题面链+demo 三张点完首题——第 3 张 fire 异步）
            #   → __brkDemoR='done'（教学末步=首题整题完成）→ turn 'help' 段
            print('P2 step1: waiting __brkDemoR', flush=True)
            pg.wait_for_function("window.__brkDemoR === 'done'", timeout=90000)
            print('P2 step2: waiting help quiz (unlocked)', flush=True)
            pg.wait_for_function(
                "window.BRK && window.BRK.quiz && window.BRK.quiz.cards.length === 5"
                " && window.BRK.tutorial === 'help' && !state.locked"
                " && !state.demo && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_help.jpg'), quality=70, type='jpeg')
            # 真实 DOM 点击（N3：事件绑定链验证——pointerdown→uiTapCard(dataset.i)）
            #   帮→独：点首张正确卡（turn 迷你关 birthday，answerList[0]）
            quiz0 = pg.evaluate('window.BRK.quiz')
            good_id = quiz0['answerList'][0]
            good_i = next(i for i, c in enumerate(quiz0['cards']) if c['id'] == good_id)
            pg.click('.tcard[data-i="%d"]' % good_i, timeout=10000)
            print('P2 step3: real click on tcard i=%d (id=%s)' % (good_i, good_id), flush=True)
            pg.wait_for_function("window.__brkTutSolo === true", timeout=30000)
            # 点满 3 张（每步重读 quiz——禁缓存题初序列；每次点击后等演出锁过——
            # 真实页 SPEED=1，fill 锁 1140ms/done 后 presentQuiz 锁 6097ms，固定 400ms 会被吞 null）
            for _ in range(6):
                fl = pg.evaluate('window.BRK.currentLevel ? window.BRK.currentLevel.flat : -99')
                if fl != -1:
                    break   # turn 题完成（done）已 startLevel 切正式关——停手防误点新关
                st = pg.evaluate(
                    "() => window.BRK.quiz ? window.BRK.quiz.picked.length : -1")
                if st >= 3 or st == -1:
                    break
                q2 = pg.evaluate('window.BRK.quiz')
                nid = next(i for i, c in enumerate(q2['cards'])
                           if c['id'] in q2['answerList'] and c['id'] not in q2['picked'])
                pg.click('.tcard[data-i="%d"]' % nid, timeout=10000)
                pg.wait_for_function(
                    "!state.locked && !state.demo && Date.now() >= (state.showUntil || 0)"
                    " && !document.querySelector('.k-celebrate')",
                    timeout=15000)
            pg.wait_for_function(
                "window.BRK.currentLevel && window.BRK.currentLevel.flat === 0"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            # 正式关 flat0 autoSolve 通关（5 题 pick=15 taps，3 星）
            pg.evaluate('() => { window.__brkAutoP = window.BRK.autoSolve(); }')
            pg.wait_for_function(
                'window.BRK.currentLevel && window.BRK.currentLevel.done && window.BRK.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__brkAutoP')
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_brk') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_brk') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            brk_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('brk_') === 0).length")
            print('P2 teach: realClick → solo =', True, '| autoSolve =', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('brk', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(brk_', brk_keys, '+ core', n_clip - brk_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (res and res.get('done') and res.get('taps') == 15 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 57 and brk_keys == 54 and not errors)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
