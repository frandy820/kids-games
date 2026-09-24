# -*- coding: utf-8 -*-
"""hidecup 藏猫猫摄像头 自测（交付门禁）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 16 单元全绿断言（r51：
    +⑯ triple 三步/⑭ swapSpeed 四档/⑮ dualFrame+重演回归——r25 ⑬⑭⑮ 沿袭）
  相 2 真实页：stub 发声 → 教学链（watch 2 杯 1 换慢速演示 __hcDemoR='right'
    → turn 猫猫题点对 'done' 帮→独）→ 正式关 flat0 autoSolve 通关
    → 存档 kidsgame_hidecup v1.0 + levels['1-0'].stars=3 → clips ≥14 条（hc ≥11+core 3）
    → flat5（dch2 4杯3换）taps==5 → flat10（dch3 谱）taps==7+开题实测 700 档
    → flat15（r51 dch4 谱）taps==9 通关 + levels['4-0'].stars=3
    + 开题时长实测（700/600 档演出窗真实值——r23 P2-1 时序实测红线）
    → pageerror 0（教学链首段+一轮点击全程）
  相 3 真竖屏 800×1180：flat1（dch1 3 杯——r51 起步杯数竖屏档 132×172）+
    flat15（4 杯 102×150 档）触摸面≥96/overflowX≤0/截图。
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

            # ---- P2 flat5/flat10/flat15（r51 四档谱 taps 口径=判对次数 5/5/7/9）真实主流程 ----
            def run_flat(flat, exp_taps, cups, lo, hi, note, shot=None):
                pg.wait_for_timeout(3600)   # 等上一关 celebrate→proceed(3400ms) 落定（防 start 被覆盖）
                t0 = time.time()
                pg.evaluate('HC.start(%d)' % flat)
                pg.wait_for_function(
                    "window.HC.currentLevel && window.HC.currentLevel.flat === %d"
                    " && !state.locked && Date.now() >= (state.showUntil || 0) && window.HC.quiz"
                    " && window.HC.quiz.cups === %d" % (flat, cups),
                    timeout=60000)
                open_ms = round((time.time() - t0) * 1000)
                if shot:
                    pg.screenshot(path=str(SHOTS / shot), quality=70, type='jpeg')
                print('P2 flat%d: 开题实测' % flat, open_ms, 'ms（%s）' % note, flush=True)
                pg.evaluate('() => { window.__hcAutoPx = window.HC.autoSolve(); }')
                pg.wait_for_function(
                    'window.HC.currentLevel && window.HC.currentLevel.done && window.HC.currentLevel.won',
                    timeout=240000)
                res = pg.evaluate('window.__hcAutoPx')
                fok = (res and res.get('done') and res.get('taps') == exp_taps and
                       lo <= open_ms <= hi and not errors)
                print('P2 flat%d:' % flat, 'PASS' if fok else 'FAIL',
                      '| autoSolve=', res, '| open_ms=', open_ms,
                      'want [%d,%d]' % (lo, hi))
                return fok

            # dch2 c=4 s=3 全 hide：taps=5（4 杯 3 换基线档 800ms）
            p5_ok = run_flat(5, 5, 4, 6900, 8800,
                             'dch2 qi0=hide c4s3：SHOW_WIN4300+3×800+800+140≈7640——800 档实证（r51-m1 勘正 7740 笔误）')
            # dch3 谱（4杯4换+双动物）：taps=7=3×1+2×2（r51 §R4 判对次数口径）；
            # 开题 qi0=hide 腿期望 4300+4×700+800+140=8040ms（上界 8840=(8040+1100坏档9640)/2
            # ——1100 旧档接错必 FAIL；相邻档精细判别由 verify ⑭ 精确串 84ms 承担）
            p10_ok = run_flat(10, 7, 4, 7500, 8840,
                              'dch3 qi0=hide c4s4：SHOW_WIN4300+4×700+800+140≈8040——700 档实证')
            # dch4 谱（4杯5换+双动物+三动物）：taps=9=2×1+2×2+1×3；
            # 开题 qi0=hide 腿期望 4300+5×600+800+140=8240ms（上界 9700<1100 坏档 10740
            # ——旧档接错必 FAIL；600 精确档由 verify ⑭ 72ms 串断言）
            p15_ok = run_flat(15, 9, 4, 7700, 9700,
                              'dch4 qi0=hide c4s5：SHOW_WIN4300+5×600+800+140≈8240——600 档实证',
                              'real_dch4.jpg')
            if not (p5_ok and p10_ok and p15_ok):
                ok = False
            # flat15 存档断言（r51：dch4 关三星通关写 levels['4-0']）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_hidecup') || 'null');"
                " return !!(s && s.levels && s.levels['4-0']); }", timeout=20000)
            sv15 = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_hidecup') || 'null')")
            stars15 = sv15 and sv15.get('levels', {}).get('4-0', {}).get('stars')
            print("P2 flat15: levels['4-0'].stars=", stars15, '| pageerror:', len(errors))
            if stars15 != 3:
                ok = False
            print('P2 pageerror:', len(errors), errors[:3])
            if not p2_ok:
                ok = False
            pg.close()

            # ---- P3 真竖屏视口页（审查M3 r25：portrait 媒体查询只应视口宽高比，verify sims
            #      的 #game 盒模拟对它无效——真竖屏 800×1180 视口下 3 杯/4 杯档实测） ----
            pg3 = browser.new_page(viewport={'width': 800, 'height': 1180})
            errs3 = []
            pg3.on('pageerror', lambda e: errs3.append(str(e)))
            pg3.add_init_script(MUTE_INIT)                 # 静音双保险（r19 红线）
            pg3.goto(URL, timeout=60000)
            pg3.wait_for_timeout(2500)
            # 3 杯竖屏（r51 ch1 起步 c=3——默认档 wrap 150>slot 144 溢 3px，独立档 132×172）
            pg3.evaluate('HC.start(1)')
            pg3.wait_for_function(
                "window.HC.currentLevel && window.HC.currentLevel.flat === 1"
                " && !state.locked && Date.now() >= (state.showUntil || 0) && window.HC.quiz"
                " && window.HC.quiz.cups === 3", timeout=60000)
            v3 = pg3.evaluate('''() => {
                const cups = document.getElementById('cups');
                const wraps = [...cups.querySelectorAll('.cup-wrap')];
                const r0 = wraps[0].getBoundingClientRect();
                return { n: wraps.length, dataCups: cups.dataset.cups,
                         w: Math.round(r0.width), h: Math.round(r0.height),
                         overflowX: cups.scrollWidth - cups.clientWidth,
                         bodyOverflowX: document.documentElement.scrollWidth - 800,
                         portrait: matchMedia('(orientation:portrait)').matches };
            }''')
            pg3.screenshot(path=str(SHOTS / 'real_dch1_3cups_portrait.jpg'), quality=70, type='jpeg')
            print('P3 竖屏 3 杯:', v3)
            # wrap 竖屏 3 杯档=132×172（±10 容差）；触摸面 w/h≥96；无横溢
            p3a_ok = (v3['n'] == 3 and v3['dataCups'] == '3' and v3['portrait']
                      and 122 <= v3['w'] <= 142 and v3['h'] >= 140
                      and v3['overflowX'] <= 0 and v3['bodyOverflowX'] <= 0)
            # 4 杯竖屏（102×150 档——r25 已验证形态，r51 沿用）
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
            p3b_ok = (v_geo['n'] == 4 and v_geo['dataCups'] == '4' and v_geo['portrait']
                      and 96 <= v_geo['w'] <= 112 and 140 <= v_geo['h']
                      and v_geo['overflowX'] <= 0 and v_geo['bodyOverflowX'] <= 0)
            p3_ok = p3a_ok and p3b_ok and not errs3
            if not p3_ok:
                ok = False
            print('P3 portrait 3cups:', 'PASS' if p3a_ok else 'FAIL',
                  '| 4cups:', 'PASS' if p3b_ok else 'FAIL', '| pageerror:', len(errs3))
            pg3.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
