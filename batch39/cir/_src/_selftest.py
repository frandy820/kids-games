# -*- coding: utf-8 -*-
"""cir 电路小灯泡 r4 自测（交付门禁——双答制）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 12 单元全绿断言
  相 2 真实页：stub 发声 → 教学链（watch 双答演示：先猜步 __cirDemoPredR='ok' →
    再连步 __cirDemoR='lit' → turn 单灯板单题双答）→ 正式关 flat0 autoSolve
    通关（taps=10=题数×2 双答）→ 存档 kidsgame_cir v1.0 + levels['1-0'].stars=3
    → clips 14 条（cir 11+core 3——T46 阶段2 观察句 +4）注入无缺
    + 真实点击教学题两步（b34-b38 坑带入：探针必须含真实点击——预判按钮+元件候选）
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
            pg.wait_for_function("document.title.indexOf('VERIFY PASS') >= 0", timeout=180000)
            title = pg.title()
            vlog = pg.evaluate('window.__cirVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v, '| pageerrors:', errors[:2])
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False))
            if not title.startswith('VERIFY PASS') or bad_units or vlog['pass'] != vlog['total'] or errors:
                ok = False
            pg.close()

            # ---- 相 2：真实页 ----
            pg = browser.new_page()
            errors2 = []
            pg.on('pageerror', lambda e: errors2.append(str(e)))
            pg.goto(URL, timeout=60000)
            pg.wait_for_timeout(2500)
            pg.evaluate("""() => {
                KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {};
                KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {};
            }""")
            # 教学链 watch 双答演示：先猜步（幽灵手指①指预判按钮 → 'ok' 钉 chip）→
            # 再连步（手指②指正确导线 → 落位灯亮）→ __cirDemoPredR='ok' + __cirDemoR='lit'
            print('P2 step1: waiting watch dual demo', flush=True)
            pg.wait_for_function(
                "window.__cirDemoPredR === 'ok' && window.__cirDemoR === 'lit'", timeout=90000)
            print('P2 step2: waiting turn quiz (phase 1)', flush=True)
            # turn 题（你来连一连=单灯板单题双答，帮阶段先猜）出现 → 真实点击预判按钮
            pg.wait_for_function(
                "window.CIR && window.CIR.quiz && window.CIR.quiz.slots.length === 4"
                " && window.CIR.quiz.phase === 1 && CIR.tutorial === 'help'"
                " && !state.locked && Date.now() >= state.showUntil",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn_pred.jpg'), quality=70, type='jpeg')
            print('P2 step3: real click turn pred button', flush=True)
            # 真实点击先猜步（pointerdown 派发命中 .guess-btn——DOM 链路非钩子直调）
            pg.evaluate("""() => {
                const d = window.CIR.quiz.predAns;
                document.querySelector('.guess-btn[data-guess="' + d + '"]')
                        .dispatchEvent(new Event('pointerdown', { bubbles: true }));
            }""")
            pg.wait_for_function("window.CIR.quiz && window.CIR.quiz.phase === 2", timeout=30000)
            pg.wait_for_function("!state.locked && Date.now() >= state.showUntil", timeout=30000)
            pg.screenshot(path=str(SHOTS / 'real_turn_part.jpg'), quality=70, type='jpeg')
            print('P2 step4: real click turn correct pick', flush=True)
            # 再连步：真实点击正确候选 → 'done' 的可观测结果=__cirTutSolo 置位+进正式关 flat0
            pg.evaluate("""() => {
                const i = window.CIR.quiz.answer;
                document.querySelector('.pick[data-i="' + i + '"]')
                        .dispatchEvent(new Event('pointerdown', { bubbles: true }));
            }""")
            pg.wait_for_function(
                "() => window.__cirTutSolo === true && window.CIR.currentLevel"
                " && window.CIR.currentLevel.flat === 0", timeout=60000)
            r_tut = 'done' if pg.evaluate('window.__cirTutSolo') else None
            print('P2 step5: turn dual real-click done, solo=True, entered flat0', flush=True)
            # 正式关 flat0 开题解锁 → autoSolve 通关（5 题×双答 2 taps=10）
            pg.wait_for_function(
                "window.CIR.currentLevel && window.CIR.currentLevel.flat === 0 && !state.locked"
                " && Date.now() >= state.showUntil", timeout=90000)
            print('P2 step6: real level open', flush=True)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            pg.evaluate('() => { window.__cirAutoP = window.CIR.autoSolve(); }')
            pg.wait_for_function(
                'window.CIR.currentLevel && window.CIR.currentLevel.done && window.CIR.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__cirAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（泛光+celebrate≈5s）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_cir') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_cir') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            cir_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('cir_') === 0).length")
            print('P2 teach: realClick(turn dual)=', r_tut, '| autoSolve=', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'))
            print('P2 clips:', n_clip, '(cir_', cir_keys, '+ core', n_clip - cir_keys, ')',
                  '| pageerrors:', errors2[:2])
            p2_ok = (r_tut == 'done' and res and res.get('done') and res.get('taps') == 10 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 14 and cir_keys == 11 and not errors2)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
