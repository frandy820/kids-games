# -*- coding: utf-8 -*-
"""soundcount 听音计数 自测（交付门禁）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 全单元/冒烟/40 关审计全绿断言
  相 2 真实页：stub 发声 → 教学链（watch 演示 __scDemoR='right' → turn 2 下点对）
    → 正式关 autoSolve 通关 → 存档 kidsgame_soundcount v1.0 + levels['1-0'].stars=3
    → r24 flat15（dch4 纯听+大域+双问）autoSolve taps=7 + levels['4-0'].stars=3
      + sv.soundcount.earsSeen=true（纯听预告一次性落档）
    → clips ≥16 条（sc ≥13+core 3 子集式——r24 新 7 键注册前后同过）
纪律：独立 chromium.launch(--mute-audio)（禁 connect/禁杀任何浏览器）；单 page 串行测完即关；
静音双保险：每页面 goto 前挂静音 init_script（speak/Audio no-op+种档 sound:false，
r19 外放事故纪律——MUTE 块用任务书原文，r22 教训种子档含 core 默认档全字段）。"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)

# 静音双保险 init_script（r19 教训：speechSynthesis no-op + Audio.play 派发 ended + 种档
# sound:false；r22 教训：种子档须含 core 默认档全字段（dailyMin 等）。块体=任务书指定原文）
MUTE = """(() => {
  try {
    const _d = new Date();
    const _t = _d.getFullYear() + '-' + String(_d.getMonth()+1).padStart(2,'0') + '-' + String(_d.getDate()).padStart(2,'0');
    localStorage.setItem('kidsgame_soundcount', JSON.stringify({v:'1.0',game:'soundcount',
      firstDay:_t, lastDay:_t, levels:{}, dailyMin:{},
      settings:{sound:false,tts:false,vol:0}}));
  } catch(e){}
  window.speechSynthesis && (speechSynthesis.speak = () => {}, speechSynthesis.cancel = () => {});
  const ap = Audio.prototype.play; Audio.prototype.play = function(){ try{ this.dispatchEvent(new Event('ended')); }catch(e){} return Promise.resolve(); };
})();"""


def main():
    ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])
        try:
            # ---- 相 1：verify 页 ----
            pg = browser.new_page()
            pg.add_init_script(MUTE)                       # 静音双保险（r19 纪律）
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY PASS') >= 0", timeout=180000)
            title = pg.title()
            vlog = pg.evaluate('window.__scVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            bad_sm = [k for k, u in vlog['smokes'].items() if not u.get('ok')]
            lv_bad = [k for k, u in vlog['levels'].items() if not u.get('ok')]
            gen_bad = [k for k, u in vlog['gen'].items() if not u.get('ok')]
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v)
            print('P1 bad units:', bad_units, '| bad smokes:', bad_sm,
                  '| bad levels:', len(lv_bad), lv_bad[:5], '| bad gen:', len(gen_bad), gen_bad[:5])
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False))
            if not title.startswith('VERIFY PASS') or bad_units or bad_sm or lv_bad or gen_bad:
                ok = False
            pg.close()

            # ---- 相 2：真实页 ----
            pg = browser.new_page()
            pg.add_init_script(MUTE)                       # 静音双保险（r19 纪律）
            pg.goto(URL, timeout=60000)
            pg.wait_for_timeout(2500)
            pg.evaluate("""() => {
                KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {};
                KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {};
            }""")
            # 教学链：watch 演示（3 下鼓+幽灵手指点数字 3 卡）→ __scDemoR='right'
            print('P2 step1: waiting __scDemoR', flush=True)
            pg.wait_for_function("window.__scDemoR === 'right'", timeout=90000)
            print('P2 step2: waiting turn quiz', flush=True)
            # turn 题（你来数一数=2 下，帮阶段）出现 → 点对应选卡（末题 → 'done'，帮→独进正式关）
            pg.wait_for_function(
                "window.SC && window.SC.quiz && window.SC.quiz.count === 2 && SC.tutorial === 'help' && !state.locked",
                timeout=90000)
            print('P2 step5: real level open', flush=True)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            print('P2 step3: tap turn answer', flush=True)
            r_tut = pg.evaluate('window.SC.tapOpt(window.SC.quiz.answer)')
            print('P2 step4: turn tap returned', r_tut, flush=True)
            # 正式关 flat0 开题解锁 → autoSolve 通关（5 题 3 星）
            pg.wait_for_function(
                "window.SC.currentLevel && window.SC.currentLevel.flat === 0 && !state.locked",
                timeout=90000)
            print('P2 step5: real level open', flush=True)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            pg.evaluate('() => { window.__scAutoP = window.SC.autoSolve(); }')
            pg.wait_for_function(
                'window.SC.currentLevel && window.SC.currentLevel.done && window.SC.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__scAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（celebrate≈2.6s+400ms）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_soundcount') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_soundcount') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            sc_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('sc_') === 0).length")

            # r24 flat15（dch4 纯听+大域+双问）真实主流程：等 proceed 落 flat1 后手动切 15
            #（防 celebrate 后续 proceed 覆盖手动 start），autoSolve taps=7=3 单步+2 双问×2
            pg.wait_for_function(
                "window.SC.currentLevel && window.SC.currentLevel.flat === 1", timeout=60000)
            pg.evaluate('window.SC.start(15)')
            pg.wait_for_function(
                "window.SC.currentLevel && window.SC.currentLevel.flat === 15 && !state.locked",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_dch4_quiz.jpg'), quality=70, type='jpeg')
            pg.evaluate('() => { window.__scAuto15 = window.SC.autoSolve(); }')
            pg.wait_for_function(
                'window.SC.currentLevel && window.SC.currentLevel.done && window.SC.currentLevel.won',
                timeout=240000)
            res15 = pg.evaluate('window.__scAuto15')
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_soundcount') || 'null');"
                " return !!(s && s.levels && s.levels['4-0'] && s.soundcount && s.soundcount.earsSeen); }",
                timeout=30000)
            sv15 = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_soundcount') || 'null')")
            print('P2 teach: tapOpt(turn)=', r_tut, '| autoSolve=', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'))
            print('P2 dch4: autoSolve15=', res15,
                  "| levels['4-0']=", sv15.get('levels', {}).get('4-0'),
                  '| earsSeen=', sv15.get('soundcount', {}).get('earsSeen'))
            print('P2 clips:', n_clip, '(sc_', sc_keys, '+ core', n_clip - sc_keys, ')')
            p2_ok = (r_tut == 'done' and res and res.get('done') and res.get('taps') == 5 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     res15 and res15.get('done') and res15.get('taps') == 7 and
                     sv15.get('levels', {}).get('4-0', {}).get('stars') == 3 and
                     sv15.get('soundcount', {}).get('earsSeen') is True and
                     n_clip >= 16 and sc_keys >= 13)
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
