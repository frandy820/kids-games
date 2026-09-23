# -*- coding: utf-8 -*-
"""poemfill 古诗连句 自测（交付门禁；r13 难度改造 2026-09-15）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 10 单元 49 记全绿 + clips 165
  相 1b 真实竖视口轮（r9 M-A1/r11 M-1）：独立 context 800×1180 真竖屏再跑 verify
    全绿（@media 真通道；相 1 横视口已验 body.port 类通道——双通道各验一轮）
    + 竖屏样式锚（.scard 高 66，横 76）
  相 2 真实页：stub 发声 → 教学链（watch 演示读题面句→幽灵手指点答案句卡
    __pfDemoR='right' → 重发同关 turn 题（帮）点对 'right' → 独放手）→
    autoSolve 通关 → 存档 kidsgame_poemfill v1.0 + levels['1-0'].stars=3 →
    clips 165 条（pf_ 132=句 6+T46 行 120+飞花令 6+pf_poem 30+core 3）→ pageerror 0
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
            vlog = pg.evaluate('window.__pfVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v, '| pageerror:', len(errors))
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False))
            if not title.startswith('VERIFY PASS') or bad_units or errors or n_clip_v != 165:
                ok = False
            pg.close()

            # ---- 相 1b：真实竖视口轮（800×1180 @media 真通道；verify 全绿+竖屏锚） ----
            pg = browser.new_context(viewport={'width': 800, 'height': 1180}).new_page()
            errors_b = []
            pg.on('pageerror', lambda e: errors_b.append(str(e)))
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
            title_b = pg.title()
            card_h_b = pg.evaluate(
                "(document.querySelector('#card-pool .scard') || {}).offsetHeight || 0")
            print('P1b verify(portrait 800x1180):', title_b, '| scardH:', card_h_b,
                  '| pageerror:', len(errors_b))
            if not title_b.startswith('VERIFY PASS') or abs(card_h_b - 66) > 2 or errors_b:
                ok = False
            pg.close()

            # ---- 相 2：真实页（教学链→turn 点对→autoSolve 通关→存档→clips） ----
            pg = browser.new_page()
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(URL, timeout=60000)
            pg.wait_for_timeout(2000)
            pg.evaluate("""() => {
                KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {};
                KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {};
            }""")
            # 教学链：watch 演示（读题面句→指空槽→幽灵手指点答案句卡，demo 通道真实入槽）
            print('P2 step1: waiting __pfDemoR', flush=True)
            pg.wait_for_function("window.__pfDemoR === 'right'", timeout=90000)
            print('P2 step2: waiting turn quiz (help)', flush=True)
            pg.wait_for_function(
                "window.PF && window.PF.quiz && window.PF.quiz.type === 'F'"
                " && window.PF.quiz.cards.length === 3"
                " && window.PF.tutorial === 'help' && !state.locked && !state.won",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            r_tut = pg.evaluate(
                'PF.tapCard(PF.quiz.cards.indexOf(PF.quiz.slots[0]))')
            print('P2 step3: turn tap returned', r_tut, flush=True)
            # autoSolve 通关（turn 题点对后 step=1，余 4 题引擎真值直驱；全对=3 星）
            pg.wait_for_function(
                "window.PF.currentLevel && window.PF.currentLevel.flat === 0"
                " && !state.locked && !state.won", timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            pg.evaluate('() => { window.__pfAutoP = window.PF.autoSolve(); }')
            pg.wait_for_function(
                'window.PF.currentLevel && window.PF.currentLevel.done'
                ' && window.PF.currentLevel.won', timeout=240000)
            res = pg.evaluate('window.__pfAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_poemfill') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=30000)
            sv = pg.evaluate(
                "() => JSON.parse(localStorage.getItem('kidsgame_poemfill') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            poem_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('pf_poem_') === 0).length")
            pf_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter("
                "k => k.indexOf('pf_') === 0 && k.indexOf('pf_poem_') !== 0).length")
            pf_l_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('pf_l_') === 0).length")
            pf_ff_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('pf_ff_') === 0).length")
            print('P2 teach: tapCard(turn)=', r_tut, '| autoSolve=', res)
            print('P2 save v=', sv and sv.get('v'),
                  "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('poemfill', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(pf_', pf_keys, '=句6+行', pf_l_keys, '+飞花令',
                  pf_ff_keys, ' + pf_poem_', poem_keys,
                  '+ core', n_clip - pf_keys - poem_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (r_tut == 'right' and res and res.get('done') and res.get('ok') and
                     res.get('quizzes') == 4 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     sv.get('poemfill', {}).get('tutSeen') is True and
                     n_clip == 165 and pf_keys == 132 and pf_l_keys == 120 and
                     pf_ff_keys == 6 and poem_keys == 30 and not errors)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
