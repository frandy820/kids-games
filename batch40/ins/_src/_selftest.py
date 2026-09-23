# -*- coding: utf-8 -*-
"""ins 昆虫还是蜘蛛 自测（交付门禁）：
  相 1 verify 页：等 document.title 含 VERIFY PASS → 15 单元全绿断言（r26：
    +⑬ dch4UI 谱驱动/⑭ rescueLayers 救援分层/⑮ dch4Sweep 谱聚合）
  相 2 真实页：stub 发声 → 教学链（watch 看昆虫蜘蛛→幽灵手指点昆虫按钮
    __insDemoR='picked' → turn ant 题（帮）真实点击契合项一击 'done' 帮→独——
    b37 探针教训：必含真实点击）→ 正式关 flat0 autoSolve 通关（5 题 5 点）
    → 存档 kidsgame_ins v1.0 + levels['1-0'].stars=3 → clips 子集式 ≥20 条
    （ins ≥17+core 3——r26 主线注册 8 新键后 28 亦过）
    → flat15（r26 dch4 谱）开题实测（judge3 题 8731ms 窗——SAY_T4 17 字尾段
    实证）+ autoSolve taps==5 通关 + levels['4-0'].stars=3 → pageerror 0
    → b40 挂账② flat15 qi3（judge3 snail 干扰主角——谱推导）真实点错一次：
    voice.queue 记录钩子断言错链段 [ins_wrong, ins_sci_none]+miss==1
  相 3 真竖屏视口页（r25 P3 范式：portrait 媒体查询只应视口宽高比，verify sims
    的 #game 盒模拟对它无效——真竖屏 800×1180 视口下 dch4 三选盘实测）
  MUTE 静音双保险（r19 红线）：两相页 goto 前挂 init_script——种档
    kidsgame_ins sound:false/tts:false/vol:0 + speechSynthesis/Audio.play no-op。
纪律：独立 chromium.launch(--mute-audio)（禁 connect/禁杀任何浏览器）；单 page 串行测完即关。"""
import json, pathlib, sys, time
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)

# MUTE 静音双保险 init_script（r19 红线；档键 kidsgame_ins——KIDS.init game:'ins'）
# b40 维护：种档补全 core 字段（+bonus/restTip/款字段 ins——ins 留空对象保教学链）
MUTE_INIT = """(() => {
  try {
    const _d = new Date();
    const _t = _d.getFullYear() + '-' + String(_d.getMonth()+1).padStart(2,'0') + '-' + String(_d.getDate()).padStart(2,'0');
    localStorage.setItem('kidsgame_ins', JSON.stringify({v:'1.0',game:'ins',
      firstDay:_t, lastDay:_t, levels:{}, dailyMin:{}, bonus:{},
      settings:{sound:false,tts:false,vol:0},
      restTip:{day:'',shown:0}, ins:{}}));
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
            vlog = pg.evaluate('window.__insVlog')
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
            # 教学链：watch 演示（动物图出场+题面链+幽灵手指点昆虫按钮→闪亮）
            print('P2 step1: waiting __insDemoR', flush=True)
            pg.wait_for_function("window.__insDemoR === 'picked'", timeout=90000)
            print('P2 step2: waiting turn quiz (help)', flush=True)
            pg.wait_for_function(
                "window.INS && window.INS.quiz && window.INS.quiz.picks.length === 2 && INS.tutorial === 'help'"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            # 真实点击（b37 探针教训：驱动路径必含一次真实 DOM 点击——非仅钩子驱动）
            # turn 迷你关单题一击：真实点击契合项 → done → 帮→独 → 进正式关 flat0
            good_j = pg.evaluate('window.INS.quiz.answer')
            pg.click('.pick[data-i="%d"]' % good_j, timeout=10000)
            print('P2 step3: real click on pick j=%d (turn)' % good_j, flush=True)
            pg.wait_for_function(
                "window.INS.currentLevel && window.INS.currentLevel.flat === 0"
                " && !state.locked && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            tut_solo = pg.evaluate('window.__insTutSolo === true')
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            # 正式关 flat0 autoSolve 通关（5 题 5 点，3 星）
            pg.evaluate('() => { window.__insAutoP = window.INS.autoSolve(); }')
            pg.wait_for_function(
                'window.INS.currentLevel && window.INS.currentLevel.done && window.INS.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__insAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入（celebrate≈2.6s+400ms）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_ins') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_ins') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            ins_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('ins_') === 0).length")
            print('P2 teach: realClick x1 → solo =', tut_solo, '| autoSolve =', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('ins', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(ins_', ins_keys, '+ core', n_clip - ins_keys, ')')
            p2_ok = (tut_solo and res and res.get('done') and res.get('taps') == 5 and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip >= 20 and ins_keys >= 17 and not errors)   # r26 子集式（主线注册新键后 28 亦过）

            # ---- P2 flat15（r26 dch4 谱：judge3/legs3 藏腿/bodyseg/judge3/mixfind）
            #      真实主流程：开题窗实测+谱首题形态+autoSolve 5 点通关+写档 ----
            pg.wait_for_timeout(3600)   # 等 flat0 celebrate→proceed(3400ms) 切关落定（防 start(15) 被覆盖）
            t0 = time.time()
            pg.evaluate('INS.start(15)')
            pg.wait_for_function(
                "window.INS.currentLevel && window.INS.currentLevel.dch === 4"
                " && !state.locked && Date.now() >= (state.showUntil || 0) && window.INS.quiz"
                " && window.INS.quiz.kind === 'judge3' && window.INS.quiz.picks.length === 3",
                timeout=60000)          # qi0=judge3（谱首题——三选盘+DCH4_KINDS[0] 实证）
            open15_ms = round((time.time() - t0) * 1000)
            q15 = pg.evaluate('window.INS.quiz')
            pg.screenshot(path=str(SHOTS / 'real_dch4.jpg'), quality=70, type='jpeg')
            print('P2 flat15: 开题实测', open15_ms, 'ms | qi0 =', q15['kind'],
                  q15['anim'], 'picks', q15['picks'],
                  '（窗=400+1416+150+estMs(17字)6465+300=8731——SAY_T4 尾段实证）', flush=True)
            pg.evaluate('() => { window.__insAutoP15 = window.INS.autoSolve(); }')
            pg.wait_for_function(
                'window.INS.currentLevel && window.INS.currentLevel.done && window.INS.currentLevel.won',
                timeout=240000)
            res15 = pg.evaluate('window.__insAutoP15')
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_ins') || 'null');"
                " return !!(s && s.levels && s.levels['4-0']); }", timeout=20000)
            sv15 = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_ins') || 'null')")
            stars15 = sv15 and sv15.get('levels', {}).get('4-0', {}).get('stars')
            print('P2 flat15: autoSolve=', res15, "| levels['4-0'].stars=", stars15,
                  '| pageerror:', len(errors))
            # 开题时长判别（r25 审查M1 范式）：judge3 题 8731+140锁余量≈8871 理论；
            # 若尾段错接 SAY_T.judge（11 字 estMs 4395）→ 窗 6661+140≈6801 < 下界 FAIL
            # （判别「SAY_T4 分流被删」）；上界容轮询/调度开销。单步题 taps==5。
            p15_ok = (res15 and res15.get('done') and res15.get('taps') == 5 and
                      stars15 == 3 and 8500 <= open15_ms <= 9800 and not errors)
            if not p15_ok:
                ok = False

            # ---- b40 维护挂账②：干扰主角错链运行时演练（⑭ 同范式）——judge3 干扰
            #      动物主角点错一次的反馈链 sciNone 此前无任何运行时断言（删掉不红）。
            #      谱推导锚：flat15 谱 [judge3:jumpspider, legs3:centipede, bodyseg:bee,
            #      judge3:snail, mixfind]——qi3=judge3 snail 主角；错链走 sayW→
            #      KIDS.voice.queue(['ins_wrong','ins_sci_none'])，真实页在 stub 之上
            #      包记录钩子（款内等价 verify 页 __queueHist） ----
            pg.wait_for_timeout(3600)          # 等 flat15 celebrate→proceed 收尾（防 start 被覆盖）
            pg.evaluate("""() => {
                window.__qhist = [];
                const vq = KIDS.voice.queue;
                KIDS.voice.queue = function(parts) {
                    if (parts) window.__qhist.push(parts.map(p => typeof p === 'string' ? p : (p && p.key)));
                    return vq && vq.call(KIDS.voice, parts);
                };
            }""")
            pg.evaluate('INS.start(15)')
            pg.wait_for_function(
                "window.INS.quiz && window.INS.quiz.step === 0 && window.INS.quiz.kind === 'judge3'"
                " && !state.locked && Date.now() >= (state.showUntil || 0)", timeout=60000)
            for stp in (1, 2, 3):              # 钩子答对 qi0-qi2 → 推进到 qi3（snail 主角）
                pg.evaluate('window.INS.tapPick(window.INS.quiz.answer)')
                pg.wait_for_function(
                    "window.INS.quiz && window.INS.quiz.step === %d" % stp, timeout=60000)
                pg.wait_for_function("!state.locked && Date.now() >= (state.showUntil || 0)", timeout=60000)
            q3 = pg.evaluate('window.INS.quiz')
            bad3 = (q3['answer'] + 1) % 3      # 任一非答案项（错链构成与点位无关）
            h0 = pg.evaluate('window.__qhist.length')
            pg.click('.pick[data-i="%d"]' % bad3, timeout=10000)   # 真实点击点错（b37 探针范式）
            pg.wait_for_function(
                "window.__qhist.slice(%d).some(h => h.length === 2 && h[0] === 'ins_wrong'"
                " && h[1] === 'ins_sci_none')" % h0, timeout=12000)
            miss3 = pg.evaluate('window.INS.quiz.miss')
            seg_bad = pg.evaluate('window.__qhist.slice(%d)' % h0)
            print('P2 flat15 演练: qi3 =', q3['kind'], q3['anim'], '| 真实点错 j=%d →' % bad3,
                  'miss=%s | 队列新增:' % miss3, seg_bad, flush=True)
            p15d_ok = (q3['kind'] == 'judge3' and q3['anim'] == 'snail' and miss3 == 1 and
                       any(h == ['ins_wrong', 'ins_sci_none'] for h in seg_bad))
            if not p15d_ok:
                ok = False
            if not p2_ok:
                ok = False
            pg.close()

            # ---- P3 真竖屏视口页（r25 P3 范式：portrait 媒体查询只应视口宽高比，
            #      verify sims 的 #game 盒模拟对它无效——真竖屏 800×1180 下 dch4 三选盘） ----
            pg3 = browser.new_page(viewport={'width': 800, 'height': 1180})
            errs3 = []
            pg3.on('pageerror', lambda e: errs3.append(str(e)))
            pg3.add_init_script(MUTE_INIT)                 # 静音双保险（r19 红线）
            pg3.goto(URL, timeout=60000)
            pg3.wait_for_timeout(2500)
            pg3.evaluate('INS.start(15)')
            pg3.wait_for_function(
                "window.INS.currentLevel && window.INS.currentLevel.dch === 4"
                " && !state.locked && Date.now() >= (state.showUntil || 0) && window.INS.quiz"
                " && window.INS.quiz.picks.length === 3", timeout=60000)
            v_geo = pg3.evaluate('''() => {
                const tray = document.getElementById('tray');
                const picks = [...tray.querySelectorAll('.pick')];
                const r0 = picks[0].getBoundingClientRect();
                return { n: picks.length, dataN: tray.dataset.n,
                         w: Math.round(r0.width), h: Math.round(r0.height),
                         overflowX: tray.scrollWidth - tray.clientWidth,
                         bodyOverflowX: document.documentElement.scrollWidth - 800,
                         portrait: matchMedia('(orientation:portrait)').matches };
            }''')
            pg3.screenshot(path=str(SHOTS / 'real_dch4_portrait.jpg'), quality=70, type='jpeg')
            print('P3 竖屏 3 选盘:', v_geo)
            # 竖屏 portrait 档 .pick=132×132（±8 容差容取整）；触摸面 w/h≥96；
            # 无横溢（盘 3 枚 ×132+gap16×2+padding ≤560 max-width）
            p3_ok = (v_geo['n'] == 3 and v_geo['dataN'] == '3' and v_geo['portrait']
                     and 96 <= v_geo['w'] <= 142 and v_geo['h'] >= 96
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
