# -*- coding: utf-8 -*-
"""hidecup 藏猫猫摄像头 自测（交付门禁）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 15 单元全绿断言（r25：
    +⑬ dual 两步/⑭ swapSpeed 提速档/⑮ dualFrame+重演回归）
  相 2 真实页：stub 发声 → 教学链（watch 2 杯 1 换慢速演示 __hcDemoR='right'
    → turn 猫猫题点对 'done' 帮→独）→ 正式关 flat0 autoSolve 通关
    → 存档 kidsgame_hidecup v1.0 + levels['1-0'].stars=3 → clips ≥14 条（hc ≥11+core 3）
    → flat15（r25 dch4 谱）autoSolve taps==7 通关 + levels['4-0'].stars=3
    + 开题时长实测（dch4 演出窗真实值≈9.1s——r23 P2-1 时序实测红线）
    → pageerror 0（教学链首段+一轮点击全程）
  MUTE 静音双保险（r19 红线）：两相页 goto 前挂 init_script——种档
    kidsgame_hidecup sound:false/tts:false/vol:0 + speechSynthesis/Audio.play no-op。
纪律：独立 chromium.launch(--mute-audio)（禁 connect/禁杀任何浏览器）；单 page 串行测完即关。"""
import json, pathlib, sys, time
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)

# MUTE 静音双保险 init_script（r19 红线；档键 kidsgame_hidecup——KIDS.init game:'hidecup'）
MUTE_INIT = """(() => {
  try {
    const _d = new Date();
    const _t = _d.getFullYear() + '-' + String(_d.getMonth()+1).padStart(2,'0') + '-' + String(_d.getDate()).padStart(2,'0');
    localStorage.setItem('kidsgame_hidecup', JSON.stringify({v:'1.0',game:'hidecup',
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
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.add_init_script(MUTE_INIT)                 # 静音双保险（r19 红线）
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
            title = pg.title()
            vlog = pg.evaluate('window.__hcVlog')
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
            pg.add_init_script(MUTE_INIT)                 # 静音双保险（r19 红线）
            pg.goto(URL, timeout=60000)
            pg.wait_for_timeout(2500)
            pg.evaluate("""() => {
                KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {};
                KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {};
            }""")
            # 教学链：watch 演示（兔子亮相躲杯+1 次慢速换位+幽灵手指点正确杯）
            print('P2 step1: waiting __hcDemoR', flush=True)
            pg.wait_for_function("window.__hcDemoR === 'right'", timeout=90000)
            print('P2 step2: waiting turn quiz (help)', flush=True)
            pg.wait_for_function(
                "window.HC && window.HC.quiz && window.HC.quiz.cups === 2 && HC.tutorial === 'help'"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            r_tut = pg.evaluate('window.HC.tapCup(window.HC.quiz.answer)')
            print('P2 step3: turn tap returned', r_tut, flush=True)
            # 正式关 flat0 开题解锁 → autoSolve 通关（5 题 3 星）
            pg.wait_for_function(
                "window.HC.currentLevel && window.HC.currentLevel.flat === 0"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            pg.evaluate('() => { window.__hcAutoP = window.HC.autoSolve(); }')
            pg.wait_for_function(
                'window.HC.currentLevel && window.HC.currentLevel.done && window.HC.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__hcAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（celebrate≈2.6s+400ms）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_hidecup') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_hidecup') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            hc_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('hc_') === 0).length")
            print('P2 teach: tapCup(turn)=', r_tut, '| autoSolve=', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('hidecup', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(hc_', hc_keys, '+ core', n_clip - hc_keys, ')')
            p2_ok = (r_tut == 'done' and res and res.get('done') and res.get('taps') == 5 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip >= 14 and hc_keys >= 11 and not errors)

            # ---- P2 flat15（r25 dch4 谱：4杯4换+提速 700ms+双动物两步）真实主流程 ----
            pg.wait_for_timeout(3600)   # 等 flat0 celebrate→proceed(3400ms) 切关落定（防 start(15) 被覆盖）
            t0 = time.time()
            pg.evaluate('HC.start(15)')
            pg.wait_for_function(
                "window.HC.currentLevel && window.HC.currentLevel.flat === 15"
                " && !state.locked && Date.now() >= (state.showUntil || 0) && window.HC.quiz"
                " && window.HC.quiz.cups === 4",                    # qi0=hide c4s4（4 杯开题实证）
                timeout=60000)
            open15_ms = round((time.time() - t0) * 1000)
            pg.screenshot(path=str(SHOTS / 'real_dch4.jpg'), quality=70, type='jpeg')
            print('P2 flat15: 开题实测', open15_ms,
                  'ms（qi0=hide 腿：SHOW_WIN4300+4×700+800+锁余量140≈8040——4×700 提速档实证）',
                  flush=True)
            pg.evaluate('() => { window.__hcAutoP15 = window.HC.autoSolve(); }')
            pg.wait_for_function(
                'window.HC.currentLevel && window.HC.currentLevel.done && window.HC.currentLevel.won',
                timeout=240000)
            res15 = pg.evaluate('window.__hcAutoP15')
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_hidecup') || 'null');"
                " return !!(s && s.levels && s.levels['4-0']); }", timeout=20000)
            sv15 = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_hidecup') || 'null')")
            stars15 = sv15 and sv15.get('levels', {}).get('4-0', {}).get('stars')
            print('P2 flat15: autoSolve=', res15, "| levels['4-0'].stars=", stars15,
                  '| pageerror:', len(errors))
            # taps==7：3 hide×1 判对+2 hidedual×2 步（r25 §R4 判对次数口径）；
            # 开题时长 qi0=hide 腿期望 4300+4×700+800+140=8040ms（审查M1 r25 收紧上界：
            # 1100 坏档值 9640 须 FAIL——上界 8840=(8040+9640)/2，判别「提速档接错」）
            p15_ok = (res15 and res15.get('done') and res15.get('taps') == 7 and
                      stars15 == 3 and 7500 <= open15_ms <= 8840 and not errors)
            if not p15_ok:
                ok = False
            print('P2 pageerror:', len(errors), errors[:3])
            if not p2_ok:
                ok = False
            pg.close()

            # ---- P3 真竖屏视口页（审查M3 r25：portrait 媒体查询只应视口宽高比，verify sims
            #      的 #game 盒模拟对它无效——真竖屏 800×1180 视口下 4 杯档实测） ----
            pg3 = browser.new_page(viewport={'width': 800, 'height': 1180})
            errs3 = []
            pg3.on('pageerror', lambda e: errs3.append(str(e)))
            pg3.add_init_script(MUTE_INIT)                 # 静音双保险（r19 红线）
            pg3.goto(URL, timeout=60000)
            pg3.wait_for_timeout(2500)
            pg3.evaluate('HC.start(15)')
            pg3.wait_for_function(
                "window.HC.currentLevel && window.HC.currentLevel.flat === 15"
                " && !state.locked && Date.now() >= (state.showUntil || 0) && window.HC.quiz"
                " && window.HC.quiz.cups === 4", timeout=60000)
            v_geo = pg3.evaluate('''() => {
                const cups = document.getElementById('cups');
                const wraps = [...cups.querySelectorAll('.cup-wrap')];
                const r0 = wraps[0].getBoundingClientRect();
                return { n: wraps.length, dataCups: cups.dataset.cups,
                         w: Math.round(r0.width), h: Math.round(r0.height),
                         overflowX: cups.scrollWidth - cups.clientWidth,
                         bodyOverflowX: document.documentElement.scrollWidth - 800,
                         portrait: matchMedia('(orientation:portrait)').matches };
            }''')
            pg3.screenshot(path=str(SHOTS / 'real_dch4_portrait.jpg'), quality=70, type='jpeg')
            print('P3 竖屏 4 杯:', v_geo)
            # wrap 竖屏 portrait 档=102×150（±10 容差容 border/缩放取整）；触摸面 w/h≥96（审查n1：
            # 下界 96 与红线一致——92 会放过 94 不达标档）；无横溢
            p3_ok = (v_geo['n'] == 4 and v_geo['dataCups'] == '4' and v_geo['portrait']
                     and 96 <= v_geo['w'] <= 112 and 140 <= v_geo['h']
                     and v_geo['overflowX'] <= 0 and v_geo['bodyOverflowX'] <= 0
                     and not errs3)
            if not p3_ok:
                ok = False
            print('P3 portrait:', 'PASS' if p3_ok else 'FAIL', '| pageerror:', len(errs3))
            pg3.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
