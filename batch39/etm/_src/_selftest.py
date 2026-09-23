# -*- coding: utf-8 -*-
"""etm 表情温度计 r49 自测（交付门禁；模板=batch6/words/_src/_selftest.py 定稿实现）：
  P1 verify 页：等 document.title 含 VERIFY PASS → 12 单元全绿断言 + clips 48
     （r49 段二注册收口：etm 45=5 系统+etm_sc 40+core 3；2 孤儿键已清退）
  P2 真实页教学链（b39 坑③铁律——必须真实 DOM 点击腿）：全新档（muted 种档）→
     watch 演示 __etmDemoR='picked' → help 段 pg.click('.pick[data-i]') 真实点击
     正确脸谱 → __etmTutSolo=true → 进正式关 flat0 → autoSolve 通关 → 存档
     kidsgame_etm v1.0 levels['1-0'].stars=3 → pageerror 0
  P3 r49 新内容腿（muted 种档 tutSeen 跳教学）：
     3a 五档温度计可辨性：flat10（level 族）data-lv=1..5 实测 .t-mercury 高度
         单调递增且相邻 Δ≥15px（b39 l1/l2 subtle 前科门禁）+5 刻度在场
     3b mix 族形态：flat15 四组合脸 data-anim=组合 id+温度计隐藏+新键 play 记录
         （r49 段二注册收口：play 键值在册=播报路径实证）
MUTE 静音双保险（r19 红线+r28 定稿 function 版 1500ms ended）：每 context 挂
MUTE_INIT init_script + 种档 settings sound:false/tts:false/vol:0。
纪律：独立 chromium.launch（禁 connect/禁杀任何浏览器）；单 page 串行测完即关。"""
import io
import json
import sys
import time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HERE = pathlib = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')

MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed',
  resume:function(){},
  createOscillator:function(){ return {
    connect:function(){ return { connect:function(){} }; },
    start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){}} }; },
  createGain:function(){ return {
    connect:function(){},
    gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){}} }; },
  destination:{}, currentTime:0, sampleRate:44100 }; };"""


def preset_save(tut_seen):
    """种档：settings 全静音（MUTE 双保险之二）+ etm.tutSeen 分流"""
    save = {
        'v': '1.0', 'game': 'etm', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {},
        'settings': {'sound': False, 'tts': False, 'vol': 0},
        'restTip': {'day': '', 'shown': 0},
        'etm': {'tutSeen': tut_seen},
    }
    return 'localStorage.setItem("kidsgame_etm", ' + json.dumps(json.dumps(save)) + ')'


STUB_VOICE = """() => {
    KIDS.voice.play = function (k, t) { window.__r49PlayKey = k || null; window.__r49PlayText = t || null;
        (window.__r49Keys = window.__r49Keys || []).push(k); };
    KIDS.voice.queue = function () {}; KIDS.voice.say = function () {};
    KIDS.speak = function () {}; KIDS.audio.note = function () {}; KIDS.audio.sfx = function () {};
}"""


def main():
    ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])
        try:
            # ---- P1：verify 页 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            pg = ctx.new_page()
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(URL + '?verify=1', timeout=60000)
            pg.wait_for_function("document.title.indexOf('VERIFY') >= 0", timeout=180000)
            title = pg.title()
            vlog = pg.evaluate('window.__etmVlog')
            n_clip_v = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
            print('P1 verify:', title, '| units:', vlog['pass'], '/', vlog['total'],
                  '| clips:', n_clip_v, '| pageerror:', len(errors))
            if bad_units:
                print('P1 detail:', json.dumps({k: vlog['units'][k] for k in bad_units},
                                               ensure_ascii=False)[:2000])
            if not title.startswith('VERIFY PASS') or bad_units or errors or n_clip_v != 48:
                ok = False
            ctx.close()

            # ---- P2：真实页教学链（真实 DOM 点击腿——b39 坑③）----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=False))   # 全新档（muted）→ 教学链
            pg = ctx.new_page()
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(URL, timeout=60000)
            pg.wait_for_timeout(2500)
            pg.evaluate(STUB_VOICE)
            print('P2 step1: waiting __etmDemoR', flush=True)
            pg.wait_for_function("window.__etmDemoR === 'picked'", timeout=90000)
            print('P2 step2: waiting help quiz (unlocked)', flush=True)
            pg.wait_for_function(
                "window.ETM && window.ETM.quiz && window.ETM.quiz.picks.length >= 3"
                " && window.ETM.tutorial === 'help' && !state.locked"
                " && Date.now() >= (state.showUntil || 0)",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_help.jpg'), quality=70, type='jpeg')
            # 真实 DOM 点击（事件绑定链验证——pointerdown→uiTapPick(dataset.i)）
            good_i = pg.evaluate('window.ETM.quiz.answer')
            pg.click('.pick[data-i="%d"]' % good_i, timeout=10000)
            print('P2 step3: real click on pick i=%d' % good_i, flush=True)
            pg.wait_for_function(
                "window.__etmTutSolo === true && window.ETM.currentLevel"
                " && window.ETM.currentLevel.flat === 0 && !state.locked",
                timeout=90000)
            pg.screenshot(path=str(SHOTS / 'real_quiz.jpg'), quality=70, type='jpeg')
            # 正式关 flat0 autoSolve 通关（5 题，3 星）
            pg.evaluate('() => { window.__etmAutoP = window.ETM.autoSolve(); }')
            pg.wait_for_function(
                'window.ETM.currentLevel && window.ETM.currentLevel.done && window.ETM.currentLevel.won',
                timeout=240000)
            res = pg.evaluate('window.__etmAutoP')
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_etm') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=20000)
            sv = pg.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_etm') || 'null')")
            n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            etm_keys = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('etm_') === 0).length")
            print('P2 teach: realClick → solo =', True, '| autoSolve =', res)
            print('P2 save v=', sv and sv.get('v'), "| levels['1-0']=", sv and sv.get('levels', {}).get('1-0'),
                  '| tutSeen=', sv and sv.get('etm', {}).get('tutSeen'))
            print('P2 clips:', n_clip, '(etm_', etm_keys, '+ core', n_clip - etm_keys, ')')
            print('P2 pageerror:', len(errors), errors[:3])
            p2_ok = (res and res.get('done') and
                     sv and sv.get('v') == '1.0' and
                     sv.get('levels', {}).get('1-0', {}).get('stars') == 3 and
                     n_clip == 48 and etm_keys == 45 and not errors)
            if not p2_ok:
                ok = False
            ctx.close()

            # ---- P3a：五档温度计可辨性（flat10 level 族）----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True))    # 跳教学直达
            pg = ctx.new_page()
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(URL, timeout=60000)
            pg.wait_for_timeout(1500)
            pg.evaluate(STUB_VOICE)
            pg.evaluate('window.ETM.start(10)')
            pg.wait_for_function(
                "window.ETM.quiz && window.ETM.quiz.kind === 'level' && !state.locked"
                " && Date.now() >= (state.showUntil || 0)", timeout=60000)
            heights = {}
            for lv in range(1, 6):
                pg.evaluate("(v) => { document.querySelector('#thermo .t-tube').dataset.lv = String(v); }", lv)
                pg.wait_for_timeout(1050)                      # 水银 transition .9s
                heights[lv] = pg.evaluate(
                    "() => document.querySelector('#thermo .t-mercury').getBoundingClientRect().height")
            n_ticks = pg.evaluate("document.querySelectorAll('#thermo .t-tick').length")
            deltas = [round(heights[k + 1] - heights[k], 1) for k in range(1, 5)]
            mono = all(heights[k] < heights[k + 1] for k in range(1, 5))
            d_ok = all(d >= 15 for d in deltas)
            pg.screenshot(path=str(SHOTS / 'lv5_thermo.jpg'), quality=70, type='jpeg')
            print('P3a mercury heights:', heights, '| Δ:', deltas,
                  '| ticks:', n_ticks, '| mono:', mono, 'Δ≥15px:', d_ok)
            if not (mono and d_ok and n_ticks == 5 and not errors):
                ok = False
            ctx.close()

            # ---- P3b：mix 族形态+新键 play 记录（flat15 ch4）----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(URL, timeout=60000)
            pg.wait_for_timeout(1500)
            pg.evaluate(STUB_VOICE)
            pg.evaluate('window.ETM.start(15)')
            pg.wait_for_function(
                "window.ETM.quiz && window.ETM.quiz.kind === 'mix' && !state.locked"
                " && Date.now() >= (state.showUntil || 0)", timeout=60000)
            mix_dom = pg.evaluate("""() => {
                const anims = Array.from(document.querySelectorAll('.pick .art svg > g[data-anim]'))
                    .map(g => g.dataset.anim);
                const clipKeys = Object.keys(KIDS.voice.clips);
                return { anims: anims, nPicks: anims.length,
                         thermoShow: document.getElementById('thermo').classList.contains('show'),
                         quizPicks: window.ETM.quiz.picks.slice(),
                         playKey: window.__r49PlayKey,
                         keyRegistered: clipKeys.indexOf(window.__r49PlayKey) >= 0 };
            }""")
            SPEC_MIX = ['happy+scared', 'happy+sad', 'angry+sad', 'angry+scared']
            b_ok = (mix_dom['nPicks'] == 4 and
                    sorted(mix_dom['anims']) == sorted(SPEC_MIX) and
                    sorted(mix_dom['quizPicks']) == sorted(SPEC_MIX) and
                    not mix_dom['thermoShow'] and
                    (mix_dom['playKey'] or '').startswith('etm_sc_') and
                    mix_dom['keyRegistered'] is True)           # 段二注册收口：新键在册（播报实证）
            pg.screenshot(path=str(SHOTS / 'mix_quiz.jpg'), quality=70, type='jpeg')
            print('P3b mix:', json.dumps(mix_dom, ensure_ascii=False), '| ok:', b_ok,
                  '| pageerror:', len(errors))
            if not (b_ok and not errors):
                ok = False
            ctx.close()
        finally:
            browser.close()
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
