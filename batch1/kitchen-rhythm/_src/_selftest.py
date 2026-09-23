# -*- coding: utf-8 -*-
"""kitchen-rhythm _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r18 老结构重建·难度改造（SPEC-R18-KITCHEN）：曲库 10（含变速/长曲/双轨）+连击门槛星级+双轨双时间轴。
音频纪律三层（最高优先级——测试永不出声）：①INIT_SND context 级接管 Audio/speechSynthesis/
AudioContext 工厂（data:audio URI 走真元素读 metadata 但实例级封 play/pause）；②STUB_SND goto 后
stub KIDS.voice.play/queue/say+KIDS.audio.sfx/note+KIDS.speak（verify 页自带 stub=第②层等价物）；
③种档 settings{sound:false,tts:false}。
本款特有（节奏游戏时钟）：STUB 层补 KIDS.audio.ctx 时钟旁路（getter→performance.now/1000，
state='running'）——INIT_SND 的 Silent ctx currentTime 恒 0 会冻结音符流；时钟非发声，stub 合规。
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + units 全绿（songs/levels40/judge/stars/dual/
   secAt/tutorial/autoRun/missTone/swallow/layout/clips/contract/estWin/modeled/hints/speed）
2a. 预置存档(跳过教学) → 真实指针逐音符窗内点击通关 flat0（28 音全连击）→ .k-song-end →
    .se-go → .k-celebrate 3星 → 存档 levels['1-0'].stars>=3 → 解锁推进 unlockedCount==2
2b. 全新存档 → 教学 看(hook 吞+真实点击吞+轻叮 pop+演示实证 __krDemoR)→帮(幽灵手指)→
    独(第9音起手指收) 真实链路 → kitchen.tutSeen 持久化 → 1-0 写档
2c. flat24（ch4 双轨首教）：kr_dual 播+lead≥3.3+dual 钮形态 → 真实点击上下半屏分流 24 音 →
    3 星（连击 24≥gate3 19）→ 写档 4-0 + kitchen.dualSeen 持久化
2d/P1b. 双 viewport(1280x800 横/800x1180 真竖)×三关型(flat0 恒速/flat8 变速/flat24 双轨)：
    overflowX==0、按钮≥48、切钮≥88、竖屏切钮通道等价（横132/类116/真竖116）、截图像素非空白
2e. 生成关种档触达（done 0-31 + bonus30 → lim=42）：flat32 自动起(ch5) + nextHint 生成关实算 +
    autoRun(33) 全链 → 写档 5-1
2f. 存档迁移四例：旧基矛盾重置/新基合法保留（含生成关章≥5）/脏键 1-9 重置/k_tut 转译
    （reset 例教学链起播不计零发声全局断言——教学意图即游戏正确行为）
S1. sayW 三态（flat3）：missRun 3 链起播设窗（wrongChainUntil>0）/节流内不播不设窗/10s 后重播；
    flat0 对照：flat<3 无节流（6.2s 间隔两批 miss 均播）
S2. 救援双锚（flat3）：错链窗内救援让路 → 14s 方向级（kr_hint+判定圈 pulse）/30s 答案级
    （幽灵手指 __fingerSeen）
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex=3 → cap2 → 12*2+bonus
RESULTS = []
CH_LEN = 8                       # r18：每章 8 关
est_ms = lambda n: n * 345 + 600          # 家族 T 全字符口径四方之一（data/verify/build/_selftest 同步）
WRONG_CHAIN_WIN = 3216 + 300              # 3516：错链豁免窗=kr_missmore 3216+300（S1 时序推导源）
SAYW_THROTTLE = 10000                     # 语义句 10s 节流（S1 时序推导源）
assert est_ms(4) == 1980 and WRONG_CHAIN_WIN == 3516

# ---- python 侧 modeled 独立复算（双钉之二；与 _spec_calc.py 同公式同序，mulberry32 int32 位级）----
def _i32(v):
    v &= 0xFFFFFFFF
    return v - 0x100000000 if v >= 0x80000000 else v
def _imul(x, y):
    return _i32((x * y) & 0xFFFFFFFF)
def _mulberry32(a):
    a = _i32(a)
    def rnd():
        nonlocal a
        a = _i32(a + 0x6D2B79F5)
        t = _imul(a ^ ((a & 0xFFFFFFFF) >> 15), _i32(1 | a))
        t = _i32(t + (_imul(t ^ ((t & 0xFFFFFFFF) >> 7), _i32(61 | t)) ^ t))
        return ((t ^ ((t & 0xFFFFFFFF) >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd
def _ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))
def _sec_at(seg, t):
    s, prev, bpm = 0.0, 0.0, seg[0][0]
    for i in range(1, len(seg)):
        f = seg[i][1]
        if t <= f:
            break
        s += (f - prev) * 60.0 / bpm
        prev, bpm = f, seg[i][0]
    return s + (t - prev) * 60.0 / bpm
SONGS_PY = {   # (style, seg[(bpm[, from])...], t 数组)
    'star': ('steady', [(88,)], [0,1,2,3,4,5,6,8,9,10,11,12,13,14,16,17,18,19,20,21,22,24,25,26,27,28,29,30]),
    'tiger': ('steady', [(92,)], [0,1,2,3,4,5,6,7,8,9,10,11,12,13,16,17,18,19,20,21,24,25,26,27,28,29]),
    'ode': ('steady', [(84,)], [0,1,2,3,4,5,6,7,8,9,10,11,16,17,18,19,20,21,22,23,24,25,26,27]),
    'bee': ('tempo', [(88,), (110, 16)], [0,1,2,4,5,6,8,9,10,11,12,13,14,16,17,18,20,21,22]),
    'brush': ('tempo', [(104,), (84, 12)], [0,1,2,3,4,5,8,9,10,11,12,13,14,15,16,17,20,21]),
    'bridge': ('tempo', [(96,), (120, 16)], [0,1,2,3,4,5,6,8,9,10,12,13,14,16,17,18,19,20,21,22]),
    'jingle': ('long', [(96,)], [0,1,2,4,5,6,8,9,10,11,12,16,17,18,19,20,21,22,23,24,25,26,27,28]),
    'birthday': ('long', [(84,), (100, 24)], [0,1,2,3,4,6,8,9,10,11,12,14,16,17,18,19,20,22,24,25,26,27,28,30,32]),
    'symph': ('dual', [(90,)], [0,1,2,3,4,5,6,7,8,9,10,11,12,13,16,17,18,19,20,21,22,23,24,25]),
    'chef': ('dual', [(88,), (104, 24)], [0,1,2,3,4,5,6,7,8,9,10,11,14,15,16,17,18,19,20,21,22,23,26,27,28,29,30,31]),
}
SONG_IDS = list(SONGS_PY.keys())
SONG_OF = [0,1,2,0,1,2,0,1, 3,4,5,3,4,5,3,4, 6,7,6,7,6,7,6,7, 8,9,8,9,8,9,8,9]
DECIDE = {'steady': 550, 'tempo': 620, 'long': 620, 'dual': 800}
def _gen_song(flat):
    if flat < 32:
        return SONG_OF[flat]
    rnd = _mulberry32(flat * 7919 + 1002)
    _ri(rnd, 1, 4)
    return _ri(rnd, 0, 9)
def modeled_py(flat):
    style, seg, ts = SONGS_PY[SONG_IDS[_gen_song(flat)]]
    play = 0.0
    for i in range(len(ts) - 1):
        play += max((_sec_at(seg, ts[i + 1]) - _sec_at(seg, ts[i])) * 1000.0, DECIDE[style])
    play += max((_sec_at(seg, ts[-1] + 1.5) - _sec_at(seg, ts[-1])) * 1000.0, DECIDE[style])
    return round(900 + play + 1800)
MODELED_MIN_PY = min(modeled_py(f) for f in range(40))
assert modeled_py(0) == 24177 and MODELED_MIN_PY == 17170, \
    'python 侧 modeled 双钉失败: %s / %s' % (modeled_py(0), MODELED_MIN_PY)

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
        this.createGain = () => ({ connect: noop, gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop } });
        this.createBuffer = () => ({ getChannelData: () => new Float32Array(0) });
        this.createBufferSource = () => ({ connect: noop, start: noop, buffer: null });
        this.resume = () => Promise.resolve(); this.close = () => Promise.resolve();
      };
      window.AudioContext = Silent; window.webkitAudioContext = Silent;
    }
  } catch (e) {}
})();
"""

# ---- 音频纪律 ②（kitchen 版）：goto 后 stub KIDS 发声 API + 音频时钟旁路（节奏游戏专用）
# 注意：core 的 KIDS 是全局词法绑定（顶层 const，不上 window）——`if (window.KIDS)` 会静默跳过
# 整个 stub 块（evidence r17 同款隐性坑，本款首次真依赖）——必须词法回退引用 ----
STUB_SND = r"""
(() => {
  const noop = () => {};
  window.__voiceLog = [];
  const K = window.KIDS || (typeof KIDS !== 'undefined' ? KIDS : null);
  if (K) {
    if (K.voice) {
      K.voice.play = (k, t) => { window.__voiceLog.push('play:' + k); };
      K.voice.say = t => { window.__voiceLog.push('say:' + t); };
      K.voice.queue = parts => { window.__voiceLog.push('queue:' + (parts || []).map(p => typeof p === 'string' ? p : (p.key || 'TTS')).join('|')); };
    }
    if (K.audio) {
      K.audio.sfx = noop; K.audio.note = noop;
      /* 时钟旁路：Silent ctx currentTime 恒 0 → 音符流冻结；时钟非发声，stub 合规 */
      K.audio.ctx = { get currentTime() { return performance.now() / 1000; }, state: 'running', sampleRate: 44100 };
      K.audio.unlock = noop;
    }
    if (K.speak) K.speak = noop;
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
        'v': '1.0', 'game': 'kitchen', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0.0},
        'restTip': {'day': '', 'shown': 0},
        'kitchen': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // CH_LEN + 1, f % CH_LEN)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_kitchen", ' + json.dumps(json.dumps(save)) + ')'


def migrate_seed_js(levels, extra=None):
    """迁移四例专用：任意 levels 键直写（含旧基/脏键/k_tut），不经 keyOf 生成器"""
    save = {'v': '1.0', 'game': 'kitchen', 'firstDay': OLD, 'lastDay': TODAY,
            'levels': levels, 'dailyMin': {}, 'bonus': {},
            'settings': {'sound': False, 'tts': False, 'vol': 0.0},
            'restTip': {'day': '', 'shown': 0}}
    if extra:
        save.update(extra)
    return 'localStorage.setItem("kidsgame_kitchen", ' + json.dumps(json.dumps(save)) + ')'


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


NEXT_NOTE_JS = """(() => { const R = G.R; if (!R || G.ended) return null;
  for (const n of R.notes) if (!n.done) return { T: noteT(R, n), lane: n.l, i: n.i, dual: G.dual };
  return null; })()"""


def tap_lane(page, nxt):
    """真实指针点击 stage-wrap 对应半屏（lane 分流：上=lane0 下=lane1；单轨点下半偏中）"""
    box = page.locator('#stage-wrap').bounding_box()
    if nxt['dual']:
        fy = 0.25 if nxt['lane'] == 0 else 0.75
    else:
        fy = 0.55
    page.mouse.click(box['x'] + box['width'] * 0.5, box['y'] + box['height'] * fy)


def play_song(page, max_notes=999, tag=''):
    """真实点击打当前曲：逐音符在窗内点按（等待绝对时刻 T-0.10 早侧起拍，吸收进程间点击延迟；
    偶发晚击=swipe 属冷却语义，不重试——命中/漏数由结算层断言），返回点击数"""
    hits = 0
    while hits < max_notes:
        nxt = page.evaluate(NEXT_NOTE_JS)
        if nxt is None:
            break
        page.wait_for_function('(t) => performance.now() / 1000 >= t',
                               arg=nxt['T'] - 0.10, timeout=30000)
        tap_lane(page, nxt)
        page.wait_for_function('(i) => { const n = G.R && G.R.notes[i]; return !n || n.done || G.ended; }',
                               arg=nxt['i'], timeout=5000)
        hits += 1
    return hits


def finish_level(page, tag=''):
    """等曲终结算 → 点 .se-go → 等 celebrate 出现；返回 (结算层数据, 星数)"""
    page.wait_for_selector('.k-song-end', timeout=40000)
    page.wait_for_timeout(500)
    stars = page.evaluate("""(() => { const ov = document.querySelector('.k-song-end');
      return { hit: parseInt(ov.querySelector('.se-row b').textContent, 10),
               combo: parseInt(ov.querySelectorAll('.se-row b')[1].textContent.slice(1), 10),
               miss: parseInt(ov.querySelectorAll('.se-row b')[2].textContent, 10),
               stars: ov.querySelectorAll('.se-stars span.on').length }; })()""")
    page.locator('.k-song-end .se-go').click()
    page.wait_for_selector('.k-celebrate', timeout=20000)
    cel = page.locator('.k-celebrate .k-star').count()
    return stars, cel


def unlock_tap(page):
    """首关手势解锁：goto 同步起播时 STUB 时钟旁路尚未生效（Silent ctx suspended →
    等手势分支），点一次 stage-wrap 触发 document 级 anchor → beginT0 锚定 G.R"""
    box = page.locator('#stage-wrap').bounding_box()
    page.mouse.click(box['x'] + box['width'] * 0.5, box['y'] + box['height'] * 0.3)
    page.wait_for_function('!!G.R', timeout=5000)


def hook_voice(page):
    """重挂 voice 记录器（仍是 stub——不出声）"""
    page.evaluate("""() => { window.__vlog2 = [];
      const f = (k) => window.__vlog2.push(k);
      KIDS.voice.play = (k) => f('play:' + k);
      KIDS.voice.queue = (parts) => f('queue:' + (parts || []).map(p => typeof p === 'string' ? p : (p && p.key)).join('|'));
      KIDS.voice.say = (t) => f('say:' + t); }""")
    return lambda: page.evaluate('window.__vlog2 || []')


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
            check('verify JSON pass==total', vj['pass'] == vj['total'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify units all ok (songs/levels40/judge/stars/dual/secAt/tutorial/autoRun/'
                  'missTone/swallow/layout/clips/contract/estWin/modeled/hints/speed)',
                  all(v['ok'] for v in vj['units'].values()),
                  str({k: v['d'] for k, v in vj['units'].items() if not v['ok']})[:200])
            md = vj['units']['modeled']
            check('modeled python-side double-pinned: page m0=24177 == py 24177; page min=17170 == py 17170',
                  md['d'].find('24177') >= 0, md['d'])   # 页面侧精确值（python 侧已在文件头 assert 双钉）
            cl = vj['units']['clips']
            check('clips injected 70 (kitchen 33 + kr 34 incl T46 + core 3) + durations in tolerance',
                  cl['ok'], str(cl['d'])[:60])
            snd_events.append(('verify', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2a. 预置存档：真实逐音点击通关 flat0（3星）→ 写档 → 解锁推进 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.evaluate(STUB_SND)                    # 音频纪律 ②
            pg.wait_for_function('window.RHY && RHY.state.scene === "play"', timeout=8000)
            unlock_tap(pg)                      # goto 同步起播走等手势分支，点一次锚定
            st = pg.evaluate('RHY.state')
            check('start at flat0 (star, single-lane, non-tut preset)', st['flat'] == 0 and not st['dual'] and st['tut'] == 'none', str(st))
            n = play_song(pg, tag='[2a] ')
            check('real-tap all 28 notes (perfect window; taps>=28, jitter-tolerant)',
                  n >= 28, 'taps=%s' % n)
            stars, cel = finish_level(pg, tag='[2a] ')
            check('song-end stats hit>=26 combo>=gate3(14) miss<=2 stars=3',
                  stars['hit'] >= 26 and stars['combo'] >= 14 and stars['miss'] <= 2 and
                  stars['stars'] == 3, str(stars))
            check('.k-celebrate 3 stars (combo>=gate3)', cel == 3, 'stars=%s' % cel)
            pg.wait_for_selector('.k-celebrate', state='detached', timeout=30000)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_kitchen")'))
            s10 = saved['levels'].get('1-0', {}).get('stars', 0)
            check('save levels["1-0"].stars == 3', s10 == 3, 'stars=%s' % s10)
            lim2 = pg.evaluate('KIDS.calendar.limit(Infinity)')
            check('unlock proceeds (limit>=2 after pass)', lim2 >= 2, 'lim=%s' % lim2)
            check('back to home scene after win flow', pg.evaluate('RHY.state.scene') == 'home')
            snd_events.append(('2a', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入+轻叮+演示)→帮(幽灵手指)→独 真实链路 ----
            ctx = new_ctx(browser, preset_save(tut_seen=False))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.RHY && RHY.state.scene === "play"', timeout=8000)
            unlock_tap(pg)
            pg.wait_for_function("RHY.state.tut === 'watch'", timeout=8000)
            pg.evaluate('window.__sfx = []; KIDS.audio.sfx = n => window.__sfx.push(n);')
            r_hook = pg.evaluate('RHY.hit(0)')
            h0 = pg.evaluate('RHY.state.hit')
            box = pg.locator('#stage-wrap').bounding_box()
            pg.mouse.click(box['x'] + box['width'] * 0.5, box['y'] + box['height'] * 0.55)   # 真实点击（吞）
            pg.wait_for_timeout(400)
            st2 = pg.evaluate('RHY.state')
            check('tutorial watch swallows input (hook r=tut + real tap: hit unchanged) with pop ding',
                  r_hook['r'] == 'tut' and st2['hit'] == h0 and
                  pg.evaluate('window.__sfx.indexOf("pop") >= 0'), 'r=%s hit=%s/%s' % (r_hook['r'], h0, st2['hit']))
            pg.wait_for_function("window.__krDemoR === 'perfect' || window.__krDemoR === 'good'", timeout=15000)
            pg.wait_for_function("RHY.state.tut === 'help'", timeout=8000)
            check('watch demo effect __krDemoR (auto-hit at perfect time)',
                  pg.evaluate('window.__krDemoR') == 'perfect', pg.evaluate('window.__krDemoR'))
            try:
                pg.wait_for_function("document.getElementById('tut-finger').classList.contains('on')", timeout=4000)
                ghost = True
            except Exception:
                ghost = False
            check('tutorial help ghost finger visible', ghost)
            n1 = play_song(pg, max_notes=4, tag='[2b-help] ')     # 帮：第5-8音真实点击（手指提示在）
            check('help-phase 4 notes real-tapped', n1 == 4, 'n=%s' % n1)
            pg.wait_for_function("RHY.state.tut === 'solo'", timeout=8000)
            check('solo at note 9+ (ghost hidden)',
                  not pg.evaluate("document.getElementById('tut-finger').classList.contains('on')"))
            n2 = play_song(pg, tag='[2b-solo] ')                  # 独：剩余 20 音
            check('solo-phase remaining 20 notes real-tapped', n2 == 20, 'n=%s' % n2)
            stars, cel = finish_level(pg, tag='[2b] ')
            check('tutorial level win (stars>=1, never 0)', stars['stars'] >= 1 and cel >= 1, str(stars))
            pg.wait_for_selector('.k-celebrate', state='detached', timeout=30000)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_kitchen")'))
            check('kitchen.tutSeen persisted after tutorial',
                  (saved.get('kitchen') or {}).get('tutSeen') is True, str(saved.get('kitchen')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(list(saved['levels'])[:4]))
            snd_events.append(('2b', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2c. flat24（ch4 双轨首教）：kr_dual+双钮形态 → 上下半屏分流 24 音 → 3星 → dualSeen ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(24), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.RHY && RHY.state.scene === "play"', timeout=8000)
            unlock_tap(pg)
            pg.wait_for_timeout(600)
            st = pg.evaluate('RHY.state')
            check('seeded (done 0-23) -> start flat=24 dual level (ch4)', st['flat'] == 24 and st['dual'], str(st))
            check('dual first-teach lead>=3.3 active (kr_dual reserved; sound-off preset silent by design)',
                  pg.evaluate('!!G.R && (G.R.t0 - nowSec()) > 2.2'),
                  'lead_left=%.2f' % pg.evaluate('G.R ? (G.R.t0 - nowSec()) : -1'))
            check('dual buttons form (#btn-cut.dual + #btn-cut-l1.dual)',
                  pg.evaluate("document.getElementById('btn-cut').classList.contains('dual') && document.getElementById('btn-cut-l1').classList.contains('dual')"))
            n = play_song(pg, tag='[2c] ')
            check('dual level 24 notes real-tapped (upper/lower half split)', n == 24, 'taps=%s' % n)
            stars, cel = finish_level(pg, tag='[2c] ')
            check('dual win 3 stars (combo 24 >= gate3 19)', stars['stars'] == 3 and cel == 3, str(stars))
            pg.wait_for_selector('.k-celebrate', state='detached', timeout=30000)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_kitchen")'))
            s40 = saved['levels'].get('4-0', {}).get('stars', 0)
            check('save levels["4-0"].stars == 3', s40 == 3, 'stars=%s' % s40)
            check('kitchen.dualSeen persisted', (saved.get('kitchen') or {}).get('dualSeen') is True,
                  str(saved.get('kitchen')))
            snd_events.append(('2c', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2d/P1b. 双 viewport × 三关型 + 竖屏通道等价 + 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(5)), vp=vp)
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                pg.evaluate(STUB_SND)
                pg.wait_for_function('window.RHY && RHY.state.scene === "play"', timeout=8000)
                pg.wait_for_timeout(1200)            # 入场落定
                if vp[0] == 800:
                    check('P1b real portrait viewport (800x1180 -> @media channel active)',
                          pg.evaluate('window.innerHeight > window.innerWidth'))
                for tag, flat in [('ch1-steady', 0), ('ch2-tempo', 8), ('ch4-dual', 24)]:
                    pg.evaluate('(f) => RHY.start(f)', flat)
                    pg.wait_for_timeout(1000)
                    m = pg.evaluate(r'''() => {
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;   /* core 家长退出钮豁免 */
                        if (e.offsetWidth > 4 && e.offsetHeight > 4 && (e.offsetWidth < 48 || e.offsetHeight < 48))
                          bad.push((e.id || e.className) + ':' + e.offsetWidth + 'x' + e.offsetHeight);
                      });
                      const cut = document.getElementById('btn-cut');
                      return {ox: Math.max(de.scrollWidth - de.clientWidth, 0), bad: bad,
                              cutW: cut.offsetWidth, dual: cut.classList.contains('dual')};
                    }''')
                    check('%s %s overflowX==0 + buttons>=48 + cut>=88' %
                          ('P1b' if vp[0] == 800 else 'vp', tag),
                          m['ox'] == 0 and not m['bad'] and m['cutW'] >= 88,
                          'ox=%s bad=%s cutW=%s dual=%s' % (m['ox'], m['bad'][:2], m['cutW'], m['dual']))
                    if vp[0] == 1280:
                        w_live = m['cutW']
                        w_port = pg.evaluate("""() => {
                          document.body.classList.add('port');
                          const w = document.getElementById('btn-cut').offsetWidth;
                          document.body.classList.remove('port');
                          return w; }""")
                        expect_live = 104 if m['dual'] else 132
                        expect_port = 88 if m['dual'] else 116
                        check('vp %s cut-width anchor %d + body.port channel -> %d (PORT-CLS live)' %
                              (tag, expect_live, expect_port),
                              abs(w_live - expect_live) <= 2 and abs(w_port - expect_port) <= 2,
                              'live=%s portCls=%s' % (w_live, w_port))
                    else:
                        expect = 88 if m['dual'] else 116
                        check('P1b %s cut-width %d (real @media == body.port channel)' % (tag, expect),
                              abs(m['cutW'] - expect) <= 2, 'cutW=%s' % m['cutW'])
                    shot = SHOTS / ('kitchen-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot, floor=10.0)
                    check('screenshot %s %dx%d non-blank (stdev>10)' % (tag, vp[0], vp[1]), ok, detail)
                snd_events.append(('vp%d' % vp[0], pg.evaluate('window.__sndLog.length')))
                ctx.close()

            # ---- 2e. 生成关种档触达：lim=42 → flat32 自动起 + nextHint 实算 + autoRun(33) 全链写档 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(32), bonus=30))
            pg = ctx.new_page(); watch(pg, '2e')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.RHY && RHY.state.scene === "play"', timeout=8000)
            unlock_tap(pg)
            pg.wait_for_timeout(800)
            lim = pg.evaluate('KIDS.calendar.limit(Infinity)')
            check('seeded save (firstDay -3d + bonus30) -> limit=42 (reaches gen flat32-39)',
                  lim == 42, 'lim=%s' % lim)
            lv = pg.evaluate('RHY.state')
            check('auto-start at flat=32 gen level (ch=5, dch in 1-4)',
                  lv['flat'] == 32 and 1 <= lv['dch'] <= 4, str(lv))
            check('gen nextHint(32) = GEN_HINTS[genLevel(33).dch-1] (family F real calc)',
                  pg.evaluate('nextHint(32) === GEN_HINTS[genLevel(33).dch - 1]'))
            song33 = pg.evaluate('genLevel(33).song')
            r = pg.evaluate('RHY.autoRun(33).then(r => { window.__ar33 = r; return r; })')
            pg.wait_for_function('window.__ar33 && window.__ar33.ok', timeout=30000)
            ar = pg.evaluate('window.__ar33')
            check('gen flat33 autoRun full chain (hit==total, all notes)', ar['hit'] == ar['total'],
                  'hit=%s/%s song=%s' % (ar['hit'], ar['total'], song33))
            pg.locator('.k-song-end .se-go').click()
            pg.wait_for_selector('.k-celebrate', timeout=20000)
            pg.wait_for_selector('.k-celebrate', state='detached', timeout=30000)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_kitchen")'))
            check('gen level saved under ch5 key "5-1" (dirty-key guard allows ch>=5)',
                  '5-1' in saved['levels'], str(list(saved['levels'])[-4:]))
            snd_events.append(('2e', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2f. 存档迁移四例：旧基矛盾重置/新基合法保留（含生成关章≥5）/脏键重置/k_tut 转译 ----
            old_base = dict({'1-%d' % l: {'stars': 3, 'plays': 2} for l in range(5)},
                            **{'2-%d' % l: {'stars': 3, 'plays': 1} for l in range(5)})
            good_new = dict({'1-%d' % l: {'stars': 3, 'plays': 1} for l in range(8)},
                            **{'2-0': {'stars': 2, 'plays': 1}, '6-1': {'stars': 3, 'plays': 1}})
            dirty = {'1-9': {'stars': 3, 'plays': 1}}
            ktut = {'1-0': {'stars': 2, 'plays': 1}}
            for tag, seed, extra, want in [
                    ('old-base-conflict', old_base, None, 'reset'),
                    ('new-base-valid+gen', good_new, None, 'keep'),
                    ('dirty-key-1-9', dirty, None, 'reset'),
                    ('k_tut-translate', ktut, {'k_tut': 1}, 'translate')]:
                ctx = new_ctx(browser, migrate_seed_js(seed, extra))
                pg = ctx.new_page(); watch(pg, '2f-' + tag)
                pg.goto(URL)
                pg.evaluate(STUB_SND)                 # 音频纪律 ②（INIT_SND 已在 context 层）
                pg.wait_for_timeout(900)
                got = pg.evaluate("""(function(){var s=JSON.parse(localStorage.getItem('kidsgame_kitchen')||'{}');
                  return {n: s && s.levels ? Object.keys(s.levels).length : -1,
                          tutSeen: !!(s && s.kitchen && s.kitchen.tutSeen), ktut: !!(s && s.k_tut)};})()""")
                if want == 'keep':
                    check('migration %s: valid new-base save kept (incl gen ch>=5)' % tag,
                          got['n'] == len(seed), 'kept=%s want=%d' % (got['n'], len(seed)))
                    snd_events.append(('2f-' + tag, pg.evaluate('window.__sndLog.length')))
                elif want == 'reset':
                    check('migration %s: invalid save reset (levels emptied)' % tag,
                          got['n'] == 0, 'kept=%s' % got['n'])
                    # reset 例教学链起播意图=游戏正确行为，不计零发声全局断言（同 2b 教学段语义）
                else:
                    check('migration %s: k_tut -> kitchen.tutSeen translated (old key removed)' % tag,
                          got['tutSeen'] and not got['ktut'] and got['n'] == 1, str(got))
                    snd_events.append(('2f-' + tag, pg.evaluate('window.__sndLog.length')))
                ctx.close()

            # ---- S1. sayW 三态（flat3）：链起播设窗/节流内不播不设窗/10s 后重播 + flat0 无节流对照 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3)))
            pg = ctx.new_page(); watch(pg, 'S1')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.RHY && RHY.state.scene === "play"', timeout=8000)
            unlock_tap(pg)
            check('S1 starts at flat=3 (>=3, throttle tier)', pg.evaluate('RHY.state.flat') == 3)
            pg.wait_for_timeout(2500)                 # 开场落定再挂钩
            vlog = hook_voice(pg)
            chains = lambda: len([v for v in vlog() if v.startswith('queue:kr_missmore')])
            # 冻结曲推进（playing=false 挂起 tick/checkMiss）——missRun 完全由 RHY.miss 手动控制
            pg.evaluate('RHY.start(3); G.playing = false;')
            pg.wait_for_timeout(300)
            t0 = time.time()
            for _ in range(3):
                pg.evaluate('RHY.miss()')             # missRun=3 → 链起播+窗设
            pg.wait_for_timeout(300)
            st1 = {'chains': chains(), 'win': pg.evaluate('RHY.state.wrongChainUntil'),
                   'miss': pg.evaluate('RHY.state.miss')}
            for _ in range(3):
                pg.evaluate('RHY.miss()')             # missRun=6 → 节流内 sayW=false（不播不设窗）
            pg.wait_for_timeout(300)
            st2 = {'chains': chains(), 'miss': pg.evaluate('RHY.state.miss'),
                   'win2': pg.evaluate('RHY.state.wrongChainUntil')}
            check('S1 state1: missRun 3 chain plays + window set (throttle-in misses add no chain/window)',
                  st1['chains'] == 1 and st1['win'] and st1['miss'] == 3 and
                  st2['chains'] == 1 and st2['miss'] == 6 and st2['win2'] == st1['win'],
                  str(st1) + ' ' + str(st2))
            time.sleep(max(0, (100 + SAYW_THROTTLE + 600) / 1000.0 - (time.time() - t0)))   # 距链起播 ≥10s
            for _ in range(3):
                pg.evaluate('RHY.miss()')             # missRun=9 → 节流过 → 链重播
            pg.wait_for_timeout(300)
            st3 = {'chains': chains(), 'miss': pg.evaluate('RHY.state.miss')}
            check('S1 state2: 10s throttle expiry -> chain replays',
                  st3['chains'] == 2 and st3['miss'] == 9, str(st3))
            # flat<3 对照：无节流（6.2s 间隔两批 miss 均播）
            pg.evaluate('RHY.start(0); G.playing = false;')
            pg.wait_for_timeout(300)
            vlog = hook_voice(pg)
            chains0 = lambda: len([v for v in vlog() if v.startswith('queue:kr_missmore')])
            for _ in range(3):
                pg.evaluate('RHY.miss()')
            pg.wait_for_timeout(6200)                 # >错链窗 3.5s，<10s 节流
            for _ in range(3):
                pg.evaluate('RHY.miss()')
            pg.wait_for_timeout(400)
            m0 = pg.evaluate('RHY.state.miss')
            c0 = chains0()
            check('S1 control flat0 (<3): no 10s throttle (two miss-batches 6.2s apart both chain)',
                  m0 == 6 and c0 == 2, 'miss=%s chains=%s' % (m0, c0))
            snd_events.append(('S1', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- S2. 救援双锚（flat3）：错链窗让路 → 14s 方向级（kr_hint+pulse）→ 30s 答案级（手指）----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3)))
            pg = ctx.new_page(); watch(pg, 'S2')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.RHY && RHY.state.scene === "play"', timeout=8000)
            unlock_tap(pg)
            pg.wait_for_timeout(2500)                 # 开场落定（lastAct≈startSong 时刻）
            pg.evaluate("""() => { window.__fingerSeen = false;
              setInterval(() => { const f = document.getElementById('tut-finger');
                if (f && f.classList.contains('on')) window.__fingerSeen = true; }, 150); }""")
            vlog = hook_voice(pg)
            hints = lambda: len([v for v in vlog() if v == 'play:kr_hint'])
            t0 = time.time()
            for _ in range(3):
                pg.evaluate('RHY.miss()')             # t≈0.1 链起播+窗设（3.5s 内救援让路）
            time.sleep(4.2)                           # 窗过（idle≈4.3s<14s 方向级未到）
            early = hints()
            check('S2 chain window: rescue yields (no kr_hint before window end, idle<14s)',
                  early == 0, 'early=%s' % early)
            try:
                pg.wait_for_function('(n) => window.__vlog2.filter(v => v === "play:kr_hint").length >= n',
                                     arg=1, timeout=18000)   # 方向级 ~14s（锚=lastAct=startSong）
            except Exception:
                pass
            dir_st = pg.evaluate(r'''() => ({hints: window.__vlog2.filter(v => v === "play:kr_hint").length,
                pulse: !!(G._pulseJudge && Date.now() - G._pulseJudge < 2400)})''')
            t_dir = time.time() - t0
            check('S2 direction rescue by idle 14s (kr_hint + judge-ring pulse; wrong chain NOT resetting anchor)',
                  dir_st['hints'] >= 1 and dir_st['pulse'] and t_dir < 25,
                  'hints=%s pulse=%s t=%.1fs' % (dir_st['hints'], dir_st['pulse'], t_dir))
            try:                                      # 答案级 ~30s idle：幽灵手指演示
                # 曲目 19s 内会自然 miss 完（无 pending 音符则手指无目标）→ 重开一曲+锚前移伪闲 28s
                pg.evaluate('RHY.start(3); lastAct = Date.now() - 28000;')
                pg.wait_for_function('window.__fingerSeen === true', timeout=22000)
            except Exception:
                pass
            ans_st = pg.evaluate(r'''() => ({finger: window.__fingerSeen,
                hints: window.__vlog2.filter(v => v === "play:kr_hint").length})''')
            t_ans = time.time() - t0
            check('S2 answer rescue by idle 30s (ghost finger demo appears)',
                  ans_st['finger'] and t_ans < 48, 'finger=%s hints=%s t=%.1fs' %
                  (ans_st['finger'], ans_st['hints'], t_ans))
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
    print('\n==== SELFTEST %d/%d PASS (estMs(4)=%d chain-win=%d modeled_py: m0=%d min=%d) ====' %
          (n_ok, len(RESULTS), est_ms(4), WRONG_CHAIN_WIN, modeled_py(0), MODELED_MIN_PY))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
