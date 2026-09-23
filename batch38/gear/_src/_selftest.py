# -*- coding: utf-8 -*-
"""gear 齿轮转起来 自测（交付门禁）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 12 单元全绿断言
  相 2 真实页：stub 发声 → 教学链（watch 演示 __grDemoR='meshed' → turn 三槽
    D_M_W 单题点正确候选 'done' 帮→独）→ 正式关 flat0 autoSolve 通关 → 存档
    kidsgame_gear v1.0 + levels['1-0'].stars=3 → clips 14 条（gr 11+core 3）注入无缺
  （T46 阶段2 2026-09-19：v3 双答制 turn 题先 tapDir 预判再 tapGear——修 v3 遗留
  P2 既有失败：直接 tapGear 被 !q._dirOk 吞返回 None；计数 8/5 → v3 后 10/7 →
  T46 后 14/11 两轮未跟=本文件欠账）
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
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY PASS') >= 0", timeout=180000)
            title = pg.title()
            vlog = pg.evaluate('window.__grVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v)
            print('P1 bad units:', bad_units)
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False))
            if not title.startswith('VERIFY PASS') or bad_units or vlog['pass'] != vlog['total']:
                ok = False
            pg.close()

            # ---- 相 2：真实页 ----
            pg = browser.new_page()
            pg.goto(URL, timeout=60000)
            pg.wait_for_timeout(2500)
            pg.evaluate("""() => {
                KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {};
                KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {};
            }""")
            # 教学链：watch 演示（看！齿轮咬齿轮 → 观察句 → 幽灵手指点齿轮库正确候选 →
            # 咬合+全链联动）→ __grDemoR='meshed'（题 0 非末题——SPEC §3 钩子枚举）
            print('P2 step1: waiting __grDemoR', flush=True)
            pg.wait_for_function("window.__grDemoR === 'meshed'", timeout=90000)
            print('P2 step2: waiting turn quiz', flush=True)
            # turn 题（你来放一放=单槽 D_W 单题，帮阶段）出现 → v3 双答制：先答
            # 预判 tapDir（DIR_OK_MS 短锁）→ 再点正确候选（末题 → 'done'，帮→独进正式关）
            pg.wait_for_function(
                "window.GR && window.GR.quiz && window.GR.quiz.layout === 'D_W'"
                " && GR.tutorial === 'help' && !state.locked && Date.now() >= state.showUntil",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            print('P2 step3: tap turn dir answer', flush=True)
            r_dir = pg.evaluate('window.GR.tapDir(GR.quiz.dirAns)')
            pg.wait_for_function(
                "window.GR && window.GR.quiz && window.GR.quiz.phase === 2"
                " && !state.locked && Date.now() >= state.showUntil", timeout=30000)
            print('P2 step3b: tap turn correct pick', flush=True)
            r_tut = pg.evaluate('window.GR.tapGear(GR.quiz.answer)')
            print('P2 step4: turn taps returned', r_dir, r_tut, flush=True)
            # 正式关 flat0 开题解锁 → autoSolve 通关（5 题 3 星）
            pg.wait_for_function(
                "window.GR.currentLevel && window.GR.currentLevel.flat === 0 && !state.locked"
                " && Date.now() >= state.showUntil", timeout=90000)
            print('P2 step5: real level open', flush=True)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            pg.evaluate('() => { window.__grAutoP = window.GR.autoSolve(); }')
            pg.wait_for_function(
                'window.GR.currentLevel && window.GR.currentLevel.done && window.GR.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__grAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（全速+celebrate≈5s）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_gear') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_gear') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            gr_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('gr_') === 0).length")
            print('P2 teach: tapGear(turn)=', r_tut, '| autoSolve=', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'))
            print('P2 clips:', n_clip, '(gr_', gr_keys, '+ core', n_clip - gr_keys, ')')
            p2_ok = (r_tut == 'done' and res and res.get('done') and res.get('taps') == 10 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 14 and gr_keys == 11)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
