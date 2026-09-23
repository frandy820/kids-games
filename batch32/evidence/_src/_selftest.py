# -*- coding: utf-8 -*-
"""evidence _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r17 难度改造（2026-09-17，AUDIT-78 黄款 9）：结论池 20+三档干扰+findall 三真值多选+反问+同关去重，
每关 5→8 题（CH_LEN=8，键基迁移 IIFE 已随启动执行）。
音频纪律三层（最高优先级——测试永不出声）：①INIT_SND context 级接管 Audio/speechSynthesis/
AudioContext 工厂（data:audio URI 走真元素读 metadata 但实例级封 play/pause）；②STUB_SND goto 后
stub KIDS.voice.play/queue/say+KIDS.audio.sfx/note+KIDS.speak（verify 页自带 stub=第②层等价物，
不重复覆盖防干扰其 __lastQueue 断言）；③种档 settings{sound:false,tts:false}。
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 32 静态关/8 生成关审计全绿
   + 专项单元全绿（tapFindexact/tapFindall/tapReverse/findallEnd/frame/tutorial/swallow/
   clips/stars/contract/hints/estWin/modeled/speed）+ modeled 最低 88100
2a. 预置存档(跳过教学) → 真实指针：首错(wig+零惩罚 step/miss+应点卡不 breathe) →
    真实点击通关 8 题(findexact) → .k-celebrate 2星 → 存档 levels['1-0'].stars>=1 → 推进 flat=1
2b. 全新存档 → 教学 看(hook+真实点击全吞+轻叮 pop)→帮(幽灵手指)→独(首次判对) 真实链路
    → evidence.tutSeen 持久化 → 1-0 写档
2c. flat24（ch4 三族混出关）：三族都在场+提交钮随题型显隐 → 真实点击通关 8 题 → 3 星 → 写档 4-0
2d/P1b. 双 viewport(1280x800 横/800x1180 真竖)×三章型(findexact/findall/混合)：
    overflowX==0、证据卡≥96、按钮≥48、竖屏卡宽通道等价（真竖 104 == body.port 类 104 == 横 126 切换）、
    截图像素非空白（存 _shots/）
2e. 生成关种档触达（firstDay -3d + bonus30 → lim=2*6+30=42）：flat32 自动起(ch5) +
    EV.start(41) 全链真实点击通关 → 写档 6-1；nextHint 生成关实算（家族 F 行为级）
2f. 存档迁移三例（E-m3，照 chartread GATE-G）：旧基矛盾态重置/新基合法保留（含生成关章≥5）/脏键 1-9 重置
S1. sayW 三态（flat3）：链起播设窗（窗内二错吞）/10s 节流内返 false 不设窗（窗后错照计不吞）/
    10s 后重播；flat0 对照：flat<3 无节流（6.2s 间隔两错均播）
S2. 救援双锚（flat3）：14s 方向级（重播题面链 evi_c_*+结论卡 pulse，无 breathe 泄答案）
    → 30s 答案级（正确卡 breathe）；错点不重置 30s 锚（仅链豁免窗暂让路）
6. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror + __sndLog==0（零发声事件）
"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex=3 → cap2 → 6*2+bonus
RESULTS = []
CH_LEN = 8                       # r17：每关 8 题
est_ms = lambda n: n * 345 + 600          # E-m2：家族 T 全字符口径四方之一（data/verify/build/_selftest 同步）
WRONG_CHAIN_WIN = 2112 + 150 + 1680 + 300          # 4242：错链豁免窗（T46 clip 实长口径，S1 时序推导源）
SAYW_THROTTLE = 10000                              # 语义句 10s 节流（S1 时序推导源）
assert WRONG_CHAIN_WIN == 4242

# ---- 音频纪律 ①：context 级工厂接管（任何页面脚本 new Audio/tts/AudioContext 全部无声）----
INIT_SND = r"""
(() => {
  const noop = () => {};
  window.__sndLog = [];
  try { window.speechSynthesis = { speak: u => window.__sndLog.push('tts:' + (u && u.text || '')), cancel: noop, pause: noop, resume: noop, getVoices: () => [] }; } catch (e) {}
  try {
    const OrigAudio = window.Audio;
    window.Audio = function (src) {
      /* data:audio URI → 真 Audio 元素读 metadata（离线无声），实例级封 play/pause */
      if (OrigAudio && typeof src === 'string' && src.indexOf('data:audio/') === 0) {
        const a = new OrigAudio(src);
        a.play = () => { window.__sndLog.push('audio:blocked:' + src.slice(0, 30)); return Promise.resolve(); };
        a.pause = () => {};
        return a;
      }
      this.__silent = true; this.__src = src || '';
      this.play = () => { window.__sndLog.push('audio:' + String(this.__src).slice(0, 40)); return Promise.resolve(); };
      this.pause = noop; this.load = noop;
      this.addEventListener = noop; this.removeEventListener = noop;
      Object.defineProperty(this, 'src', { get: () => this.__src, set: v => { this.__src = v; }, configurable: true });
      Object.defineProperty(this, 'duration', { get: () => 0, configurable: true });
      Object.defineProperty(this, 'paused', { get: () => false, configurable: true });
    };
  } catch (e) {}
  try {
    const OrigCtx = window.AudioContext || window.webkitAudioContext;
    if (OrigCtx) {
      const Silent = function () { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 44100;
        this.destination = {}; this.listener = {};
        this.createOscillator = () => ({ connect: noop, start: noop, stop: noop, frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop }, type: '' });
        this.createGain = () => ({ connect: noop, gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop } });
        this.createBuffer = () => ({ getChannelData: () => new Float32Array(0) });
        this.createBufferSource = () => ({ connect: noop, start: noop, stop: noop, buffer: null });
        this.resume = () => Promise.resolve(); this.close = () => Promise.resolve();
      };
      window.AudioContext = Silent; window.webkitAudioContext = Silent;
    }
  } catch (e) {}
})();
"""

# ---- 音频纪律 ②：goto 后 stub KIDS 发声 API（core voice.queue 全旁路 play，三处全 stub）----
STUB_SND = r"""
(() => {
  const noop = () => {};
  window.__voiceLog = [];
  if (typeof KIDS !== 'undefined') {   /* core KIDS=顶层 const 词法绑定不上 window，if(window.KIDS) 恒跳过——r18 修复闭环（kitchen :155 词法回退同款） */
    if (KIDS.voice) {
      KIDS.voice.play = (k, t) => { window.__voiceLog.push('play:' + k); };
      KIDS.voice.say = t => { window.__voiceLog.push('say:' + t); };
      KIDS.voice.queue = parts => { window.__voiceLog.push('queue:' + (parts || []).map(p => typeof p === 'string' ? p : (p.key || 'TTS')).join('|')); };
    }
    if (KIDS.audio) { KIDS.audio.sfx = noop; KIDS.audio.note = noop; }
    if (KIDS.speak) KIDS.speak = noop;
  }
})();
"""


def safe(s):                                   # GBK 控制台打不出中文 → ASCII 转义后再打印
    return str(s).encode('ascii', 'backslashreplace').decode('ascii')


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', safe(name), ('| ' + safe(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    """音频纪律 ③：settings sound/tts 全 false（core 层静音）"""
    save = {
        'v': '1.0', 'game': 'evidence', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0.0},
        'restTip': {'day': '', 'shown': 0},
        'evidence': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // CH_LEN + 1, f % CH_LEN)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_evidence", ' + json.dumps(json.dumps(save)) + ')'


def migrate_seed_js(levels, tut=True):
    """迁移三例专用（E-m3）：任意 levels 键直写（含旧基/脏键），不经 keyOf 生成器"""
    save = {'v': '1.0', 'game': 'evidence', 'firstDay': OLD, 'lastDay': TODAY,
            'levels': levels, 'dailyMin': {}, 'bonus': {},
            'settings': {'sound': False, 'tts': False, 'vol': 0.0},
            'restTip': {'day': '', 'shown': 0}, 'evidence': {'tutSeen': tut}}
    return 'localStorage.setItem("kidsgame_evidence", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path, floor=10.0):
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(path)).convert('L').resize((160, 100))
        px = list(im.getdata())
        sd = statistics.pstdev(px)
        return sd > floor, 'PIL pixel stdev=%.1f' % sd
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL unavailable)' % n


def click_card(page, i):
    loc = page.locator('.card[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def click_submit(page):
    loc = page.locator('#btn-submit')
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def quiz_of(page):
    return page.evaluate('EV.quiz')


STEP_WAIT = 3100      # 判对演出窗 1600+1300=2900 + 落定余量


def play_level(page, tag=''):
    """真实点击打完当前关（三族通用：findexact/reverse 点 answer 卡 / findall 勾满+提交）"""
    quizzes = 0
    kinds = []
    sub_vis_ok = True
    while quizzes < 30:
        q = quiz_of(page)
        if q is None:
            break
        kinds.append(q['kind'])
        hidden = page.evaluate("document.getElementById('btn-submit').classList.contains('hidden')")
        if (q['kind'] == 'findall') == hidden:      # 提交钮随题型显隐（findexact/reverse=藏）
            sub_vis_ok = False
        st0 = page.evaluate('EV.currentLevel.step')
        if q['kind'] == 'findall':
            for a in q['answers']:
                click_card(page, a)
                page.wait_for_timeout(140)
            click_submit(page)
        else:
            click_card(page, q['answer'])
        page.wait_for_function(
            '(s) => { const L = EV.currentLevel; return !!L && (L.done || L.step === s + 1); }',
            arg=st0, timeout=9000)
        page.wait_for_timeout(STEP_WAIT)             # 演出窗（locked）走完再点下一题
        quizzes += 1
    page.wait_for_selector('.k-celebrate', timeout=25000)
    return quizzes, kinds, sub_vis_ok


def hook_queue(page):
    """覆盖 STUB 层挂队列记录器（仍是 stub——不出声）"""
    page.evaluate("""() => {
      window.__qlog = [];
      KIDS.voice.queue = parts => window.__qlog.push((parts || []).map(p => typeof p === 'string' ? p : (p && p.key)));
    }""")
    return lambda: page.evaluate(
        "(window.__qlog || []).filter(a => a.length && String(a[0]).indexOf('evi_wrong') === 0).length")


def main():
    offline_bad = []
    page_errors = []
    snd_events = []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    def new_ctx(browser, save_js, vp=(1280, 800)):
        ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
        ctx.add_init_script(save_js)
        ctx.add_init_script(INIT_SND)                # 音频纪律 ①：工厂接管先于一切页面脚本
        return ctx

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            # ---- 1. verify=1（verify 分支自带 stub=纪律②等价层；INIT_SND=纪律①照挂）----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(INIT_SND)
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=90000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total + layoutOk', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify 32 static levels all ok (8 quizzes each)',
                  len(vj['levels']) == 32 and all(v['ok'] for v in vj['levels'].values()),
                  'levels=%d' % len(vj['levels']))
            check('verify gen levels flat32-39 all ok',
                  len(vj['gen']) == 8 and all(v['ok'] for v in vj['gen'].values()),
                  str({k: v['dch'] for k, v in vj['gen'].items()}))
            check('verify units all ok (tapFindexact/tapFindall/tapReverse/findallEnd/frame/'
                  'tutorial/swallow/clips/stars/contract/hints/estWin/modeled/speed)',
                  all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify layout sims 6/6 (3 flats x 2 viewports)',
                  len(vj['smokes']['layout']['sims']) == 6 and
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str([s for s in vj['smokes']['layout']['sims'] if not s['pass']])[:160])
            md = vj['units']['modeled']
            check('duration model r17: modeled(0)=88100 min, DECIDE 3-kind, voiceWin<=DECIDE',
                  md['ok'] and md['flat0'] == 88100 and md['min'] == 88100, str(md)[:160])
            cl = vj['units']['clips']
            check('clips injected 32 (evi 29 + core 3) + durations in tolerance', cl['ok'],
                  'n=%s' % cl['n'])
            snd_events.append(('verify', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + 真实点击通关（2 星）+ 写档 + 推进 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.evaluate(STUB_SND)                    # 音频纪律 ②
            pg.wait_for_function('window.EV && EV.currentLevel', timeout=8000)
            n_clips = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('evi_') === 0).length")
            check('evi_* clips injected = 29 (r17: 7 + evi_q3 + 20 concl + T46 evi_again)', n_clips == 29,
                  'n=%s' % n_clips)
            pg.wait_for_timeout(2500)                # 开场链落定
            lv = pg.evaluate('EV.currentLevel')
            check('start at flat0 ch1 (8 quizzes)', lv and lv['ch'] == 1 and lv['n'] == 8, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('EV.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook contract {kind,concl,opts,answer,answers,picked,text,step,miss}',
                  q and q['kind'] == 'findexact' and len(q['opts']) == 4 and
                  q['answer'] >= 0 and q['answers'] is None and q['picked'] == [] and
                  q['step'] == 0 and q['miss'] == 0 and isinstance(q['text'], str) and
                  len(q['text']) >= 6 and q['concl'] in pg.evaluate('EV.conclPool'),
                  str(q and q['kind']))
            # 首错（真实点击干扰卡）：wig+零惩罚（step/miss）+应点卡不 breathe
            wi = (q['answer'] + 1) % 4
            click_card(pg, wi)
            pg.wait_for_timeout(1300)                # 错点防重入窗 1000ms
            st = pg.evaluate('''(wi) => {
              const q = EV.quiz;
              const w = document.querySelector('.card[data-i="' + wi + '"]');
              const ok = document.querySelector('.card[data-i="' + q.answer + '"]');
              return {retries: EV.currentLevel.miss, step: EV.currentLevel.step, miss: q.miss,
                      wig: w.classList.contains('wig'),
                      breathe: ok.classList.contains('breathe')};
            }''', wi)
            check('first wrong: wig + zero penalty (step/miss) + no breathe on answer card',
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and
                  st['wig'] and not st['breathe'], str(st))
            n, kinds, sub_ok = play_level(pg, tag='[2a] ')
            check('finished 8 quizzes by real click (flat0 all findexact)',
                  n == CH_LEN and set(kinds) == {'findexact'}, 'quizzes=%d kinds=%s' % (n, set(kinds)))
            check('submit button hidden for findexact level (2a)', sub_ok)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)                # celebrate + 写档 + 推进
            lv2 = pg.evaluate('EV.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_evidence")'))
            s10 = saved['levels'].get('1-0', {}).get('stars', 0)
            check('save levels["1-0"].stars >= 1 (actual 2)', s10 >= 1, 'stars=%s' % s10)
            check('evidence.tutSeen kept true', (saved.get('evidence') or {}).get('tutSeen') is True,
                  str(saved.get('evidence')))
            snd_events.append(('2a', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入+轻叮)→帮(幽灵手指)→独(首次判对) 真实链路 ----
            ctx = new_ctx(browser, preset_save(tut_seen=False))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.EV && EV.currentLevel', timeout=8000)
            pg.wait_for_function("EV.tutorial === 'watch'", timeout=5000)
            pg.evaluate('window.__sfx = []; KIDS.audio.sfx = n => window.__sfx.push(n);')
            qw = quiz_of(pg)
            swallowed_hook = pg.evaluate('EV.tapOpt(0)') is False   # 演示期 hook 输入全吞
            click_card(pg, qw['answer'])            # 演示期真实点击也吞（locked 门 → pop）
            pg.wait_for_timeout(700)
            st = pg.evaluate('''() => ({step: EV.currentLevel.step, miss: EV.currentLevel.miss,
                                        tut: EV.tutorial, pop: window.__sfx.indexOf('pop') >= 0})''')
            check('tutorial watch swallows input (real click + hook) with pop ding',
                  swallowed_hook and st['step'] == 0 and st['miss'] == 0 and
                  st['tut'] == 'watch' and st['pop'], str(st))
            pg.wait_for_function("EV.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            check('watch demo effect __evDemoR === right (ghost tapped puddle ~7.7s)',
                  pg.evaluate('window.__evDemoR') == 'right',
                  str(pg.evaluate('window.__evDemoR')))
            q2 = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0',
                  q2 and q2['step'] == 0 and q2['miss'] == 0, str(q2 and q2['kind']))
            try:
                pg.wait_for_function(
                    "document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost visible', ghost_shown)
            # "独"：首次判对 → 放手（tut=solo+ghost 收）
            st0 = pg.evaluate('EV.currentLevel.step')
            click_card(pg, q2['answer'])
            pg.wait_for_function('(s) => EV.currentLevel.step === s + 1', arg=st0, timeout=9000)
            solo_st = pg.evaluate(
                "() => ({tut: EV.tutorial, ghost: document.getElementById('ghost').classList.contains('show')})")
            check('first correct -> solo (ghost hidden)',
                  solo_st['tut'] == 'solo' and not solo_st['ghost'], str(solo_st))
            pg.wait_for_timeout(STEP_WAIT)
            n, kinds, _ = play_level(pg, tag='[2b] ')
            check('tutorial level playable -> .k-celebrate (8 quizzes total)',
                  n == CH_LEN - 1, 'remaining quizzes=%d' % n)   # 首题已手动完成
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_evidence")'))
            check('evidence.tutSeen persisted after tutorial',
                  (saved.get('evidence') or {}).get('tutSeen') is True, str(saved.get('evidence')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            snd_events.append(('2b', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2c. flat24（ch4 三族混出）：三族在场+提交钮显隐 → 真实通关 3 星 → 写档 4-0 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(24), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.EV && EV.currentLevel', timeout=8000)
            pg.wait_for_timeout(2500)
            lv = pg.evaluate('EV.currentLevel')
            check('seeded (done 0-23 + bonus30) -> start flat=24 ch=4 dch=4',
                  lv and lv['flat'] == 24 and lv['ch'] == 4 and lv['dch'] == 4, str(lv))
            n, kinds, sub_ok = play_level(pg, tag='[2c] ')
            check('ch4 mixed level: all three kinds present (findexact/findall/reverse)',
                  n == CH_LEN and set(kinds) == {'findexact', 'findall', 'reverse'},
                  'quizzes=%d kinds=%s' % (n, sorted(set(kinds))))
            check('submit button visibility follows kind (findall shown / others hidden)', sub_ok)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('level flat24 real-click win 3 stars (0 wrong)', stars == 3, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_evidence")'))
            s40 = saved['levels'].get('4-0', {}).get('stars', 0)
            check('save levels["4-0"].stars >= 1 (actual 3)', s40 >= 1, 'stars=%s' % s40)
            snd_events.append(('2c', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2d/P1b. 双 viewport × 三章型 + 竖屏通道等价 + 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(5)), vp=vp)
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                pg.evaluate(STUB_SND)
                pg.wait_for_function('window.EV && EV.currentLevel', timeout=8000)
                pg.wait_for_timeout(1200)            # 入场动画落定
                if vp[0] == 800:
                    check('P1b real portrait viewport (800x1180 -> @media channel active)',
                          pg.evaluate('window.innerHeight > window.innerWidth'))
                for tag, flat in [('ch1-findexact', 0), ('ch3-findall', 16), ('ch4-mixed', 24)]:
                    pg.evaluate('(f) => EV.start(f)', flat)
                    pg.wait_for_timeout(1200)
                    m = pg.evaluate(r'''() => {
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;   /* core 家长退出钮 44px 全家标准（豁免） */
                        if (e.offsetWidth > 4 && e.offsetHeight > 4 && (e.offsetWidth < 48 || e.offsetHeight < 48))
                          bad.push((e.id || e.className) + ':' + e.offsetWidth + 'x' + e.offsetHeight);
                      });
                      const cards = [...document.querySelectorAll('#board .card')];
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad, cards: cards.length,
                              cMin: cards.length ? Math.min(...cards.map(c => Math.min(c.offsetWidth, c.offsetHeight))) : 0,
                              cw: cards.length ? cards[0].offsetWidth : 0,
                              kind: EV.quiz.kind,
                              subShown: !document.getElementById('btn-submit').classList.contains('hidden'),
                              subW: document.getElementById('btn-submit').offsetWidth};
                    }''')
                    ok_vis = (m['kind'] == 'findall') == m['subShown']
                    check('%s %s overflowX==0 + cards=4(>=96) + buttons>=48 + submit visibility' %
                          ('P1b' if vp[0] == 800 else 'vp', tag),
                          m['ox'] == 0 and m['cards'] == 4 and m['cMin'] >= 96 and not m['bad'] and ok_vis,
                          'ox=%s cards=%s cMin=%s bad=%s kind=%s subW=%s' %
                          (m['ox'], m['cards'], m['cMin'], m['bad'][:2], m['kind'], m['subW']))
                    # 竖屏卡宽通道等价：横=126 / 竖(@media 或 body.port)=104
                    if vp[0] == 1280:
                        expect_w, alt_w = 126, 104
                        w_live = m['cw']
                        w_port = pg.evaluate('''() => {
                          document.body.classList.add('port');
                          const w = document.querySelector('#board .card').offsetWidth;
                          document.body.classList.remove('port');
                          return w;
                        }''')
                        check('vp %s card width anchor 126 + body.port channel -> 104 (PORT-CLS live)' % tag,
                              abs(w_live - expect_w) <= 2 and abs(w_port - alt_w) <= 2,
                              'live=%s portCls=%s' % (w_live, w_port))
                    else:
                        check('P1b %s card width 104 (real @media == body.port channel)' % tag,
                              abs(m['cw'] - 104) <= 2, 'cw=%s' % m['cw'])
                    shot = SHOTS / ('evidence-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot, floor=10.0)
                    check('screenshot %s %dx%d non-blank (stdev>10)' % (tag, vp[0], vp[1]), ok, detail)
                snd_events.append(('vp%d' % vp[0], pg.evaluate('window.__sndLog.length')))
                ctx.close()

            # ---- 2e. 生成关种档触达：lim=42 → flat32 自动起 + flat41 全链真实通关 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(32), bonus=30))
            pg = ctx.new_page(); watch(pg, '2e')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.EV && EV.currentLevel', timeout=8000)
            pg.wait_for_timeout(2000)
            lim = pg.evaluate('KIDS.calendar.limit(Infinity)')
            check('seeded save (firstDay -3d + bonus30) -> limit=42 (reaches gen flat32-41)',
                  lim == 42, 'lim=%s' % lim)
            lv = pg.evaluate('EV.currentLevel')
            check('auto-start at flat=32 gen level (ch=5, dch in 1-4)',
                  lv and lv['flat'] == 32 and lv['ch'] == 5 and 1 <= lv['dch'] <= 4, str(lv))
            check('gen nextHint(32) = GEN_HINTS[genLevel(33).dch-1] (family F real calc)',
                  pg.evaluate('nextHint(32) === GEN_HINTS[genLevel(33).dch - 1]'))
            pg.evaluate('(f) => EV.start(f)', 41)    # start 无返回值；以 lv41 状态为准
            pg.wait_for_timeout(1500)
            lv41 = pg.evaluate('EV.currentLevel')
            check('flat41 level state (ch=6, lv=1, dch 1-4)',
                  lv41 and lv41['flat'] == 41 and lv41['ch'] == 6 and lv41['lv'] == 1 and
                  1 <= lv41['dch'] <= 4, str(lv41))
            check('gen nextHint(41) real calc too',
                  pg.evaluate('nextHint(41) === GEN_HINTS[genLevel(42).dch - 1]'))
            n, kinds, _ = play_level(pg, tag='[2e] ')
            check('gen level 41 real-click full chain win (8 quizzes -> celebrate)', n == CH_LEN,
                  'quizzes=%d kinds=%s' % (n, sorted(set(kinds))))
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_evidence")'))
            check('gen level saved under ch6 key "6-1" (dirty-key guard allows ch>=5)',
                  '6-1' in saved['levels'], str(list(saved['levels'])[-4:]))
            snd_events.append(('2e', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2f. 存档迁移三例（E-m3）：旧基矛盾重置/新基合法保留（含生成关章≥5）/脏键重置 ----
            old_base = dict({'1-%d' % l: {'stars': 3, 'plays': 2} for l in range(5)},
                            **{'2-%d' % l: {'stars': 3, 'plays': 1} for l in range(5)})
            good_new = dict({'1-%d' % l: {'stars': 3, 'plays': 1} for l in range(8)},
                            **{'2-0': {'stars': 2, 'plays': 1}, '6-1': {'stars': 3, 'plays': 1}})
            dirty = {'1-9': {'stars': 3, 'plays': 1}}
            for tag, seed, want_kept in [('old-base-conflict', old_base, False),
                                         ('new-base-valid+gen', good_new, True),
                                         ('dirty-key-1-9', dirty, False)]:
                ctx = new_ctx(browser, migrate_seed_js(seed))
                pg = ctx.new_page(); watch(pg, '2f-' + tag)
                pg.goto(URL)
                pg.evaluate(STUB_SND)                 # 音频纪律 ②（同 2a：INIT_SND 已在 context 层）
                pg.wait_for_timeout(900)
                kept = pg.evaluate(
                    "(function(){var s=JSON.parse(localStorage.getItem('kidsgame_evidence')||'{}');"
                    "return s && s.levels ? Object.keys(s.levels).length : -1;})()")
                if want_kept:
                    check('migration %s: valid new-base save kept (incl gen ch>=5)' % tag,
                          kept == len(seed), 'kept=%s want=%d' % (kept, len(seed)))
                else:
                    check('migration %s: invalid save reset (levels emptied)' % tag,
                          kept == 0, 'kept=%s' % kept)
                if want_kept:
                    snd_events.append(('2f-' + tag, pg.evaluate('window.__sndLog.length')))
                # reset 例：档被清 → fresh 教学链按设计起播（INIT_SND 工厂拦截记 sndLog，不出声）
                # ——教学链意图是游戏正确行为，不计入「零发声意图」全局断言（同 2b 教学段语义）
                ctx.close()

            # ---- S1. sayW 三态（flat3 判 findexact：窗设/节流不设窗/10s 后重播 + flat0 无节流对照）----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3)))
            pg = ctx.new_page(); watch(pg, 'S1')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.EV && EV.currentLevel', timeout=8000)
            check('S1 starts at flat=3 (>=3, throttle tier)', pg.evaluate('EV.currentLevel.flat') == 3)
            pg.wait_for_timeout(2500)                # 开场链落完再挂钩
            chains = hook_queue(pg)
            q = quiz_of(pg)
            wi = (q['answer'] + 1) % 4
            t0 = time.time()
            # 绝对时间调度：sayW 锚=各 tap 调用发起时刻（错#1 链起播≈t0+0.1；窗 4.5s/节流 10s 均自锚起算；
            # 每次 wrong tapOpt 承诺内含 1000ms 锁窗才 resolve——固定 sleep 会漂过节流点，必须按表走）
            r1 = pg.evaluate('(i) => EV.tapOpt(i)', wi)      # t0+0.1 错#1：链起播+窗设
            pg.wait_for_timeout(1300)
            st1 = {'r1': r1, 'miss': pg.evaluate('EV.currentLevel.miss'), 'chains': chains()}
            r2 = pg.evaluate('(i) => EV.tapOpt(i)', wi)      # t0+1.5 窗内二错：吞
            st2 = {'r2': r2, 'miss': pg.evaluate('EV.currentLevel.miss'), 'chains': chains()}
            check('S1 state1: wrong#1 plays chain + sets window (in-window tap#2 swallowed, miss stays 1)',
                  st1['r1'] == 'wrong' and st1['miss'] == 1 and st1['chains'] == 1 and
                  r2 is False and st2['miss'] == 1 and st2['chains'] == 1, '%s %s' % (st1, st2))
            time.sleep(max(0, (WRONG_CHAIN_WIN + 1000 + 500) / 1000.0 - (time.time() - t0)))   # 窗+锁+余量已过、节流未到
            r3 = pg.evaluate('(i) => EV.tapOpt(i)', wi)      # t0+6.1 错#3：节流内 sayW=false 不播不设窗
            st3 = {'r3': r3, 'miss': pg.evaluate('EV.currentLevel.miss'), 'chains': chains()}
            r4 = pg.evaluate('(i) => EV.tapOpt(i)', wi)      # t0+8.2 错#4：不被吞（窗未设实证）
            st4 = {'r4': r4, 'miss': pg.evaluate('EV.currentLevel.miss'), 'chains': chains()}
            check('S1 state2: throttle window sayW=false (no chain, no window set -> tap#4 NOT swallowed)',
                  st3['r3'] == 'wrong' and st3['miss'] == 2 and st3['chains'] == 1 and
                  st4['r4'] == 'wrong' and st4['miss'] == 3 and st4['chains'] == 1,
                  '%s %s' % (st3, st4))
            time.sleep(max(0, (100 + SAYW_THROTTLE + 700) / 1000.0 - (time.time() - t0)))   # 距错#1 链起播 ≥10s（节流过期）
            r5 = pg.evaluate('(i) => EV.tapOpt(i)', wi)      # t0+10.9 错#5：节流过 → 链重播
            pg.wait_for_timeout(1300)
            st5 = {'r5': r5, 'miss': pg.evaluate('EV.currentLevel.miss'), 'chains': chains()}
            check('S1 state3: 10s throttle expiry -> chain replays',
                  st5['r5'] == 'wrong' and st5['miss'] == 4 and st5['chains'] == 2, str(st5))
            # flat<3 对照：无节流（6.2s 间隔两错均播）
            pg.evaluate('EV.start(0)')
            pg.wait_for_timeout(2000)
            chains0 = hook_queue(pg)
            q0 = quiz_of(pg)
            w0 = (q0['answer'] + 1) % 4
            pg.evaluate('(i) => EV.tapOpt(i)', w0)
            pg.wait_for_timeout(int(WRONG_CHAIN_WIN + 1000 + 700))   # >窗+锁 1s，<10s 节流
            pg.evaluate('(i) => EV.tapOpt(i)', w0)
            pg.wait_for_timeout(1300)
            m0 = pg.evaluate('EV.currentLevel.miss')
            c0 = chains0()
            check('S1 control flat0 (<3): no 10s throttle (two wrongs 6.2s apart both chain)',
                  m0 == 2 and c0 == 2, 'miss=%s chains=%s' % (m0, c0))
            snd_events.append(('S1', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- S2. 救援双锚（flat3）：14s 方向级（题面链+pulse 无 breathe）→ 30s 答案级（breathe）----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3)))
            pg = ctx.new_page(); watch(pg, 'S2')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.EV && EV.currentLevel', timeout=8000)
            pg.wait_for_timeout(2500)                # 开场链落完再挂钩（lastAct≈页面启动）
            pg.evaluate("""() => {
              window.__qlog = [];
              KIDS.voice.queue = parts => window.__qlog.push((parts || []).map(p => typeof p === 'string' ? p : (p && p.key)));
            }""")
            rescue_cnt = lambda: pg.evaluate(
                "(window.__qlog || []).filter(a => a.length && String(a[0]).indexOf('evi_c_') === 0).length")
            t0 = time.time()
            q = quiz_of(pg)
            wi = (q['answer'] + 1) % 4
            pg.evaluate('(i) => EV.tapOpt(i)', wi)   # t≈0.3 错点一次（设 4.2s 链窗——不该重置 30s 锚）
            time.sleep(6.0)                          # 等链窗过（救援 interval 恢复扫描）
            early = rescue_cnt()
            check('S2 rescue not fired before 14s idle (wrong tap set chain window only)',
                  early == 0, 'early=%s' % early)
            try:
                pg.wait_for_function(
                    "() => (window.__qlog || []).filter(a => a.length && String(a[0]).indexOf('evi_c_') === 0).length >= 1",
                    timeout=18000)                   # 方向级 ~12-14s（锚=启动，早于 t0）
            except Exception:
                pass
            dir_st = pg.evaluate(r'''() => ({
                rescues: window.__qlog.filter(a => String(a[0]).indexOf('evi_c_') === 0).length,
                pulse: document.getElementById('concl').classList.contains('pulse'),
                breathe: !!document.querySelector('.card.breathe')})''')
            t_dir = time.time() - t0
            check('S2 direction rescue by idle 14s (re-queue concl+q chain + pulse, wrong tap NOT resetting anchor)',
                  dir_st['rescues'] >= 1 and dir_st['pulse'] and t_dir < 22,
                  'rescues=%s pulse=%s breathe=%s t=%.1fs' %
                  (dir_st['rescues'], dir_st['pulse'], dir_st['breathe'], t_dir))
            check('S2 direction tier leaks no answer (no .breathe at direction fire)',
                  not dir_st['breathe'], str(dir_st))
            try:                                     # 答案级 ~30s idle：正确卡 breathe
                pg.wait_for_function("!!document.querySelector('.card.breathe')", timeout=22000)
            except Exception:
                pass
            ans_st = pg.evaluate(r'''() => ({
                breathe: !!document.querySelector('.card.breathe'),
                rescues: window.__qlog.filter(a => String(a[0]).indexOf('evi_c_') === 0).length})''')
            t_ans = time.time() - t0
            check('S2 answer rescue by idle 30s (correct card breathe appears)',
                  ans_st['breathe'] and t_ans < 45, 'breathe=%s rescues=%s t=%.1fs' %
                  (ans_st['breathe'], ans_st['rescues'], t_ans))
            snd_events.append(('S2', pg.evaluate('window.__sndLog.length')))
            ctx.close()
        finally:
            browser.close()

    # ---- 6. 完全离线 + 0 pageerror + 0 发声事件（三层音频纪律实证）----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))
    bad_snd = [t for t, n in snd_events if n]
    check('zero sound events across all scenarios (INIT_SND+STUB_SND+sound:false)',
          not bad_snd, str([('ctx', t, n) for t, n in snd_events]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS (estMs(4)=%d chain-win=%d) ====' % (n_ok, len(RESULTS), est_ms(4), WRONG_CHAIN_WIN))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
