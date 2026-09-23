# -*- coding: utf-8 -*-
"""area 铺砖面积 自测（交付门禁；r14 难度改造 2026-09-15）：
  相 1 verify 页（横视口 1280x800：body.port 类通道轮）：VERIFY PASS 53/53+
    units 全 ok+clips 109（T46 阶段2：ar_ 106+core 3 含 11..20 补齐）+pageerror 0
  相 1b 真实竖视口轮（r9 M-A1/r11 M-1/r12 M3）：独立 context 800x1180 真竖屏再跑
    verify 全绿（@media 真通道；相 1 横视口已验 body.port 类通道——双通道各验一轮）
    + 竖屏样式锚（#prompt-chip .ask 字号 横 26/竖 22）
  相 2 真实页：stub 发声 -> 教学链（watch 演示数格子->幽灵手指点答案卡 __arDemoR='right'
    -> 重发同关 turn 题（帮）点对 'right' -> 独放手）-> autoSolve 通关 -> 存档
    kidsgame_area v1.0 + levels['1-0'].stars=3 -> clips 109 条（ar 106+core 3）-> pageerror 0
纪律：独立 chromium.launch(--mute-audio)（禁 connect/禁杀任何浏览器）；单 page 串行测完即关。"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)

# 静音纪律（2026-09-19 用户三诉外放后全线强制）：任何 goto 前先挂页级静音——
# speechSynthesis.speak no-op + Audio.play/pause no-op（5ms 补发 ended 防 queue 链卡，
# 元数据加载不受影响）+ AudioContext 工厂接管（sfx 无声）。模板同 test/t46_speak0_gate.py INIT_SND。
SND = """(() => {
  const noop = () => {};
  try { const ss = window.speechSynthesis;   // 方法级 patch（整体对象替换在本 chromium 无效=假静音）
    if (ss) { ss.speak = function () {}; ss.cancel = noop; ss.pause = noop; ss.resume = noop; } } catch (e) {}
  try { const proto = window.Audio.prototype;
    proto.play = function () { const s = this;
      setTimeout(function () { try { s.dispatchEvent(new Event('ended')); } catch (e) {} }, 5);
      return Promise.resolve(); };
    proto.pause = noop; } catch (e) {}
  try { const OC = window.AudioContext || window.webkitAudioContext;
    if (OC) { const S = function () { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 44100;
      this.destination = {}; this.listener = {};
      this.createOscillator = () => ({ connect: noop, start: noop, stop: noop,
        frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop,
        linearRampToValueAtTime: noop }, type: '' });
      this.createBuffer = () => ({ getChannelData: () => new Float32Array(0) });
      this.createBufferSource = () => ({ buffer: null, connect: noop, start: noop, stop: noop });
      this.createBiquadFilter = () => ({ connect: noop, start: noop, stop: noop, type: '',
        frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop,
        linearRampToValueAtTime: noop } });
      this.createGain = () => ({ connect: noop, gain: { value: 0, setValueAtTime: noop,
        exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop } });
      this.resume = () => Promise.resolve(); this.close = () => Promise.resolve(); };
      window.AudioContext = S; window.webkitAudioContext = S; } } catch (e) {}
})();"""


def snd_page(browser, viewport=None):
    """静音开页（纪律：每个页面 goto 前必挂 SND init_script）"""
    ctx = browser.new_context(**(viewport and {'viewport': viewport} or {}))
    ctx.add_init_script(SND)
    return ctx.new_page()


def main():
    ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])
        try:
            # ---- 相 1：verify 页（横视口 1280x800：body.port 类通道轮） ----
            pg = snd_page(browser, {'width': 1280, 'height': 800})
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
            title = pg.title()
            vlog = pg.evaluate('window.__arVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            ask_fs = pg.evaluate(
                "(document.querySelector('#prompt-chip .ask') && getComputedStyle(document.querySelector('#prompt-chip .ask')).fontSize) || ''")
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v, '| askFs:', ask_fs, '| pageerror:', len(errors))
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False))
            if not title.startswith('VERIFY PASS') or bad_units or errors or n_clip_v != 109:
                ok = False
            pg.close()

            # ---- 相 1b：真实竖视口轮（800x1180 @media 真通道；verify 全绿+竖屏锚） ----
            pg = snd_page(browser, {'width': 800, 'height': 1180})
            errors_b = []
            pg.on('pageerror', lambda e: errors_b.append(str(e)))
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
            title_b = pg.title()
            ask_fs_b = pg.evaluate(
                "(document.querySelector('#prompt-chip .ask') && getComputedStyle(document.querySelector('#prompt-chip .ask')).fontSize) || ''")
            print('P1b verify(portrait 800x1180):', title_b, '| askFs:', ask_fs_b,
                  '| pageerror:', len(errors_b))
            if not title_b.startswith('VERIFY PASS') or ask_fs_b != '22px' or errors_b:
                ok = False
            pg.close()

            # ---- 相 2：真实页（教学链->turn 点对->autoSolve 通关->存档->clips） ----
            pg = snd_page(browser)
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(URL, timeout=60000)
            pg.wait_for_timeout(2000)
            pg.evaluate("""() => {
                KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {};
                KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {};
            }""")
            # 教学链：watch 演示（读题->数格子->幽灵手指点答案卡，demo 通道真实答对）
            print('P2 step1: waiting __arDemoR', flush=True)
            pg.wait_for_function("window.__arDemoR === 'right'", timeout=90000)
            print('P2 step2: waiting help quiz', flush=True)
            pg.wait_for_function(
                "window.AR && window.AR.tutorial === 'help' && !state.locked && !state.won"
                " && window.AR.quiz && window.AR.quiz.step === 0", timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_turn.jpg'), quality=70, type='jpeg')
            r_tut = pg.evaluate('window.AR.tapCard(window.AR.quiz.answer)')
            print('P2 step3: turn tap returned', r_tut, flush=True)
            # autoSolve 通关（turn 题点对后 step=1，余 4 题真值直驱；全对=3 星）
            pg.wait_for_function(
                "window.AR.currentLevel && window.AR.currentLevel.flat === 0"
                " && !state.locked && !state.won", timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            pg.evaluate('() => { window.__arAutoP = window.AR.autoSolve(); }')
            pg.wait_for_function(
                'window.AR.currentLevel && window.AR.currentLevel.done'
                ' && window.AR.currentLevel.won', timeout=240000)
            res = pg.evaluate('window.__arAutoP')
            # won 置位先于 celebrate 收尾的 level.pass 落盘——等存档真写入
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_area') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=30000)
            sv = pg.evaluate(
                "() => JSON.parse(localStorage.getItem('kidsgame_area') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            ar_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('ar_') === 0).length")
            stars = (sv.get('levels', {}).get('1-0') or {}).get('stars')
            print('P2 teach: tapCard(turn)=', r_tut, '| autoSolve=', res)
            print('P2 save v=', sv and sv.get('v'),
                  "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('area', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(ar_', ar_keys, '+ core', n_clip - ar_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (r_tut == 'right' and res and res.get('done') and res.get('taps') == 4 and
                     sv and sv.get('v') == '1.0' and stars == 3 and
                     sv.get('area', {}).get('tutSeen') is True and
                     n_clip == 109 and ar_keys == 106 and not errors)   # 09-19 补 ar_cf_s_11..20 后 99/96→109/106
            if not p2_ok:
                ok = False
            pg.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
