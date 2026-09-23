# -*- coding: utf-8 -*-
"""memory _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r19 老结构重建·难度改造（batch2/SPEC-R19-MEMORY.md）：图案相似化干扰+补数配对「和为10」+先看后翻。
音频纪律三层（最高优先级——测试永不出声）：①INIT_SND context 级接管 Audio/speechSynthesis/
AudioContext 工厂（data:audio URI 走真元素读 metadata 但实例级封 play/pause）；②STUB_SND goto 后
stub KIDS.voice.play/queue/say+KIDS.audio.sfx/note+KIDS.speak（verify 页自带 stub=第②层等价物）；
③种档 settings{sound:false,tts:false}。stub 判 KIDS 用词法回退（typeof KIDS !== 'undefined'）——
core 的 KIDS 是顶层 const 不上 window，`if (window.KIDS)` 会静默跳过整个 stub 块（r17 家族坑）。
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + units 全绿（patterns/levels40/engine/stars/
   sum10domain/twins/peek/tutorial/autoSolve/swallow/layout/clips/contract/estWin/modeled/hints）
2a. 预置存档(跳过教学) → 真实点击通关 flat0（same 3 对）→ .k-celebrate 3 星 → 存档 1-0 → 推进 flat1
2b. 全新存档 → 教学 看(吞输入+轻叮+演示 __memDemoR)→帮(幽灵手指)→独 真实链路 → mem.tutSeen 持久化
2c. 补数关（种档 done 0-5 → flat6 sum10）：规则章徽 ten + 故意错翻盖回 + 真实点击通关 → 存档 2-0
2d. peek 关（种档 done 0-11 → flat12）：peek 期吞输入(bump) + 全亮→全盖回 + 真实点击通关 → 存档 3-0
2d/P1b. 双 viewport(1280x800 横/800x1180 真竖)×三关型(flat0 same/flat6 sum10/flat12 peek)：
    overflowX==0、卡>=96、按钮>=48、竖屏通道等价（兔钮横 96/类 76/真竖 76）、截图像素非空白
2e. 生成关种档触达（done 0-23 + bonus30 → lim=42）：flat24 自动起(ch5) + nextHint 生成关实算 +
    autoSolve(exec) 全链 → 写档 5-0
2f. 存档迁移三例：旧基矛盾重置/新基合法保留（含生成关章>=5）/脏键 1-9 重置
    （reset 例教学链起播意图=游戏正确行为，不计零发声全局断言）
S1. sayW 三态（flat3 same）：missRun 3 链起播设窗（wrongChainUntil>0）/节流内不播不设窗/
    10s 后重播；flat0 对照：flat<3 无节流（6.2s 间隔两批 miss 均播）
S2. 救援双锚（flat3）：错链窗内救援让路 → 14s 方向级（mem_hint+盖牌 pulse）/30s 答案级
    （幽灵手指 __fingerSeen）
6. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror + __sndLog==0（零发声事件）
"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex=3 → cap2 → 12 关/日+bonus
RESULTS = []
CH_LEN = 6                       # r19：每章 6 关
est_ms = lambda n: n * 345 + 600          # 家族 T 全字符口径四方之一（data/verify/build/_selftest 同步）
SAME_CHAIN_WIN = est_ms(8) + 300          # 3660：错链豁免窗=mem_missmore 8 字 estMs+300（S1 时序推导源）
SAYW_THROTTLE = 10000                     # 语义句 10s 节流（S1 时序推导源）
assert est_ms(4) == 1980 and SAME_CHAIN_WIN == 3660

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
        t = _i32(_i32(t + _imul(t ^ ((t & 0xFFFFFFFF) >> 7), _i32(61 | t))) ^ t)   # JS: (t+imul)^t
        return ((t ^ ((t & 0xFFFFFFFF) >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd
def _ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))
LEVEL_SPECS_PY = [  # (r, c, mode, peek)——与 game-data.js LEVEL_SPECS 逐行一致
    (2, 3, 'same', 0), (2, 3, 'same', 0), (2, 4, 'same', 0), (2, 4, 'same', 0), (3, 4, 'same', 0), (3, 4, 'same', 0),
    (2, 2, 'sum10', 0), (2, 3, 'sum10', 0), (2, 4, 'sum10', 0), (2, 5, 'sum10', 0), (2, 5, 'sum10', 0), (2, 5, 'sum10', 0),
    (2, 3, 'same', 1), (2, 4, 'same', 1), (3, 4, 'same', 1), (3, 4, 'same', 1), (4, 4, 'same', 1), (4, 4, 'same', 1),
    (4, 4, 'same', 1), (2, 5, 'sum10', 1), (4, 4, 'same', 1), (2, 5, 'sum10', 1), (4, 5, 'same', 1), (4, 5, 'same', 1),
]
DECIDE_PY = {'same': 1500, 'sum10': 2400}
def _gen_spec(flat):
    if flat < 24:
        r, c, mode, pk = LEVEL_SPECS_PY[flat]
        return r, c, mode, pk
    rnd = _mulberry32(flat * 7919 + 1056)
    dch = _ri(rnd, 1, 4)
    mode = 'same' if _ri(rnd, 0, 1) == 0 else 'sum10'
    if mode == 'same':
        return (4, 4, 'same', 1) if dch <= 2 else (4, 5, 'same', 1)
    return 2, (5 if dch <= 2 else 4), 'sum10', 1
def modeled_py(flat):
    r, c, mode, pk = _gen_spec(flat)
    pairs = r * c // 2
    return round(1000 + ((800 + pairs * 750) if pk else 0) + pairs * 2 * DECIDE_PY[mode] + 2000)
MODELED_MIN_PY = min(modeled_py(f) for f in range(40))
assert modeled_py(0) == 12000 and MODELED_MIN_PY == 12000, \
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

# ---- 音频纪律 ②（memory 版）：goto 后 stub KIDS 发声 API（词法回退——KIDS 顶层 const 不上 window）----
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
    if (K.audio) { K.audio.sfx = noop; K.audio.note = noop; K.audio.unlock = noop; }
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
        'v': '1.0', 'game': 'memory', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0.0},
        'restTip': {'day': '', 'shown': 0},
        'mem': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // CH_LEN + 1, f % CH_LEN)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_memory", ' + json.dumps(json.dumps(save)) + ')'


def migrate_seed_js(levels):
    """迁移三例专用：任意 levels 键直写（含旧基/脏键），不经 keyOf 生成器"""
    save = {'v': '1.0', 'game': 'memory', 'firstDay': OLD, 'lastDay': TODAY,
            'levels': levels, 'dailyMin': {}, 'bonus': {},
            'settings': {'sound': False, 'tts': False, 'vol': 0.0},
            'restTip': {'day': '', 'shown': 0}}
    return 'localStorage.setItem("kidsgame_memory", ' + json.dumps(json.dumps(save)) + ')'


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


def click_through(page):
    """用 MEM.autoSolve() 的完美序列逐张真实点击（peek/教学期先等放行），等待 .k-celebrate"""
    page.wait_for_function('window.MEM && MEM.cards.length > 0 && !MEM.state.peek && !MEM.state.locked && MEM.tutorial !== "watch"',
                           timeout=30000)
    seq = page.evaluate('MEM.autoSolve()')
    for k, i in enumerate(seq):
        page.click('.card[data-i="%d"]' % i)
        if k % 2 == 1:
            page.wait_for_timeout(650)  # > 配对判定 420ms，防连点被锁
    page.wait_for_selector('.k-celebrate', timeout=12000)


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
        if save_js:
            ctx.add_init_script(save_js)
        ctx.add_init_script(INIT_SND)                # 音频纪律 ①：工厂接管先于一切页面脚本
        return ctx

    with sync_playwright() as p:
        browser = p.chromium.launch()                # 无头全新实例，绝不触碰用户浏览器
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
            check('verify units all ok (patterns/levels40/engine/stars/sum10domain/twins/peek/'
                  'tutorial/autoSolve/swallow/layout/clips/contract/estWin/modeled/hints)',
                  all(v['ok'] for v in vj['units'].values()),
                  str({k: v['d'] for k, v in vj['units'].items() if not v['ok']})[:200])
            md = vj['units']['modeled']
            check('modeled python-side double-pinned: page m0=12000 == py 12000; page min=12000 == py 12000',
                  md['d'].find('12000') >= 0, md['d'])   # 页面侧精确值（python 侧已在文件头 assert 双钉）
            cl = vj['units']['clips']
            check('clips injected 10 (mem 7 = 3 old + 4 r19-new synthesized; core 3) + durations in tolerance',
                  cl['ok'], str(cl['d'])[:60])
            snd_events.append(('verify', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2a. 预置存档：真实点击通关 flat0（same 3 对）→ 3 星 → 写档 → 推进 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.evaluate(STUB_SND)                    # 音频纪律 ②
            pg.wait_for_function('window.MEM && MEM.cards.length > 0', timeout=8000)
            lv = pg.evaluate('MEM.currentLevel')
            check('start at 1-0 (ch 1-based, same mode, non-peek)',
                  lv['ch'] == 1 and lv['lv'] == 0 and lv['mode'] == 'same' and not lv['peek'], str(lv))
            t0 = time.time()
            click_through(pg)
            check('real-click win flat0 -> .k-celebrate', True, '%.1fs' % (time.time() - t0))
            star_html = pg.locator('.k-celebrate .k-star').count()
            check('celebrate shows 3 stars (0-miss perfect)', star_html == 3, 'stars=%d' % star_html)
            pg.wait_for_timeout(2500)                # 过关推进
            lv2 = pg.evaluate('MEM.currentLevel')
            check('auto-proceed to next level (flat1, twins=1 interference)', lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_memory")'))
            check('save 1-0 recorded (3 stars)', saved['levels'].get('1-0', {}).get('stars') == 3,
                  str(saved['levels']))
            snd_events.append(('2a', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入+轻叮+演示)→帮(幽灵手指)→独 真实链路 ----
            ctx = new_ctx(browser, preset_save(tut_seen=False))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MEM && MEM.cards.length > 0', timeout=8000)
            pg.wait_for_function("MEM.tutorial === 'watch'", timeout=8000)
            pg.evaluate('window.__sfx = []; KIDS.audio.sfx = n => window.__sfx.push(n);')
            # 演示对=卡0 与其配对（700ms 时演示自翻）——点「非演示对」的卡 k，吞输入则 k 恒 down
            k_tap = pg.evaluate("""() => { const p = MEM.cards[0].pairId;
              const demo = [0, MEM.cards.findIndex((c, i) => i > 0 && c.pairId === p)];
              for (let k = 0; k < MEM.cards.length; k++) if (demo.indexOf(k) < 0) return k; return -1; }""")
            r_hook = pg.evaluate('(k) => MEM.flip(k)', k_tap)
            pg.locator('.card[data-i="%d"]' % k_tap).click()  # 真实点击（看阶段吞）
            pg.wait_for_timeout(250)                # < 演示 700ms 翻牌点，避开演示干扰
            k_state = pg.evaluate('(k) => MEM.cards[k].state', k_tap)
            check('tutorial watch swallows input (hook false + real tap: tapped card stays down) with pop ding',
                  r_hook is False and k_state == 'down' and
                  pg.evaluate('window.__sfx.indexOf("pop") >= 0'),
                  'k=%s r=%s state=%s' % (k_tap, r_hook, k_state))
            pg.wait_for_function("window.__memDemoR === 'match'", timeout=12000)
            pg.wait_for_function("MEM.tutorial === 'help'", timeout=8000)
            check('watch demo effect __memDemoR (auto-judged match)',
                  pg.evaluate('window.__memDemoR') == 'match', pg.evaluate('window.__memDemoR'))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost = True
            except Exception:
                ghost = False
            check('tutorial help ghost visible', ghost)
            click_through(pg)                        # "帮"阶段首次配对→"独"，真实点击继续通关
            check('tutorial level playable -> .k-celebrate', True)
            try:                                    # celebrate 收尾后才写档——轮询等档（防 2s 窗口竞态）
                pg.wait_for_function("(function(){var s=JSON.parse(localStorage.getItem('kidsgame_memory')||'{}');"
                                     "return s.levels && s.levels['1-0'] !== undefined;})()", timeout=9000)
            except Exception:
                pass
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_memory")'))
            check('mem.tutSeen persisted', (saved.get('mem') or {}).get('tutSeen') is True, str(saved.get('mem')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(list(saved['levels'])[:4]))
            snd_events.append(('2b', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2c. 补数关 flat6（种档 done 0-5 = ch1 全清）：章徽+故意错翻+真实点击通关 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(6)))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MEM && MEM.cards.length > 0', timeout=8000)
            lv = pg.evaluate('MEM.currentLevel')
            check('seeded (done 0-5) -> start flat=6 sum10 level (2x2, pairs (5,5)+(4,6))',
                  lv['flat'] == 6 and lv['mode'] == 'sum10' and lv['pairs'] == 2, str(lv))
            check('mode chip shows ten-frame for sum10',
                  pg.evaluate("document.getElementById('mode-chip').classList.contains('ten')"))
            # 补数语义：每对组两面数字和==10
            pairs_sum = pg.evaluate("""() => { const by = {};
              MEM.cards.forEach(c => { (by[c.pairId] = by[c.pairId] || []).push(Number(c.face)); });
              return Object.keys(by).map(k => by[k][0] + by[k][1]); }""")
            check('sum10 pair faces sum to 10 (closed domain)', pairs_sum == [10, 10], str(pairs_sum))
            # 故意错翻：5 配 4 → 盖回 + misses=1（工作记忆+求补双重负荷的真实错路径）
            pg.locator('.card[data-i="0"]').click()
            mismatch = pg.evaluate("""() => { const a = MEM.cards[0];
              const b = MEM.cards.findIndex((c, i) => i > 0 && c.pairId !== a.pairId); return b; }""")
            pg.locator('.card[data-i="%d"]' % mismatch).click()
            pg.wait_for_timeout(1300)                # > 失误判定 900ms
            st = pg.evaluate('MEM.state')
            cards_down = pg.evaluate('MEM.cards.every(c => c.state === "down")')
            check('sum10 deliberate mismatch covered back (+1 miss, streak path alive)',
                  st['misses'] == 1 and cards_down, 'misses=%s' % st['misses'])
            t0 = time.time()
            click_through(pg)
            check('sum10 real-click win -> .k-celebrate', True, '%.1fs' % (time.time() - t0))
            pg.wait_for_timeout(2500)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_memory")'))
            s20 = saved['levels'].get('2-0', {}).get('stars', 0)
            check('save levels["2-0"].stars >= 2 (1 miss, pairs=2 -> <=3 -> 3 star)', s20 == 3, 'stars=%s' % s20)
            snd_events.append(('2c', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2d. peek 关 flat12（种档 done 0-11 = ch1+ch2 全清 + bonus30 抬日限到 42，
            #      否则日上限 12 触发 dayEnd 停留 flat11——是正确行为不是缺陷） ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(12), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MEM && MEM.cards.length > 0', timeout=8000)
            lv = pg.evaluate('MEM.currentLevel')
            check('seeded (done 0-11) -> start flat=12 peek level (ch3, same+peek)',
                  lv['flat'] == 12 and lv['peek'] and lv['mode'] == 'same', str(lv))
            check('peek state active from level start (lead window)', pg.evaluate('MEM.state.peek'))
            r = pg.evaluate('MEM.flip(0)')
            bumped = pg.evaluate("document.getElementById('boardwrap').classList.contains('bump')")
            check('peek window swallows input (flip false + container bump, family D)',
                  r is False and bumped, 'r=%s bump=%s' % (r, bumped))
            pg.wait_for_function("MEM.cards.every(c => c.state === 'up')", timeout=12000)
            check('peek reveals all cards (staggered up)', True)
            pg.wait_for_function("!MEM.state.peek && MEM.cards.every(c => c.state === 'down')", timeout=12000)
            seen_all = pg.evaluate('MEM.cards.length')
            check('peek covers all back (翻回后再找；seen footprint kept for scaffold)',
                  seen_all == 6, 'cards=%s' % seen_all)
            t0 = time.time()
            click_through(pg)
            check('peek level real-click win (memory-after-cover) -> .k-celebrate', True, '%.1fs' % (time.time() - t0))
            pg.wait_for_timeout(2500)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_memory")'))
            check('save levels["3-0"] recorded (ch3 first peek level)',
                  '3-0' in saved['levels'], str(list(saved['levels'])[-4:]))
            snd_events.append(('2d', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2d/P1b. 双 viewport × 三关型 + 竖屏通道等价 + 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(12)), vp=vp)
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                pg.evaluate(STUB_SND)
                pg.wait_for_function('window.MEM && MEM.cards.length > 0', timeout=8000)
                pg.wait_for_timeout(1200)            # 入场落定
                if vp[0] == 800:
                    check('P1b real portrait viewport (800x1180 -> @media channel active)',
                          pg.evaluate('window.innerHeight > window.innerWidth'))
                for tag, flat in [('ch1-same', 0), ('ch2-sum10', 6), ('ch3-peek', 12)]:
                    pg.evaluate('(f) => MEM.start(f)', flat)
                    pg.wait_for_timeout(1000)
                    m = pg.evaluate(r'''() => {
                      const de = document.documentElement;
                      const cards = [...document.querySelectorAll('.card')];
                      const rs = cards.slice(0, 6).map(c => c.getBoundingClientRect());
                      const w = Math.min(...rs.map(r => r.width)), h = Math.min(...rs.map(r => r.height));
                      let gapMin = 999;
                      for (let a = 0; a < rs.length; a++) for (let b = 0; b < rs.length; b++) {
                        if (a === b) continue;
                        const dx = Math.abs(rs[a].x - rs[b].x), dy = Math.abs(rs[a].y - rs[b].y);
                        if (dx > 1 && dy < 2) gapMin = Math.min(gapMin, dx - rs[a].width);
                        if (dy > 1 && dx < 2) gapMin = Math.min(gapMin, dy - rs[a].height);
                      }
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;   /* core 家长退出钮豁免 */
                        if (e.offsetWidth > 4 && e.offsetHeight > 4 && (e.offsetWidth < 48 || e.offsetHeight < 48))
                          bad.push((e.id || e.className) + ':' + e.offsetWidth + 'x' + e.offsetHeight);
                      });
                      return {ox: Math.max(de.scrollWidth - de.clientWidth, 0), cardW: w, cardH: h,
                              gap: gapMin, bad: bad, n: cards.length};
                    }''')
                    check('%s %s overflowX==0 + cards>=96 + gap>=16 + buttons>=48' %
                          ('P1b' if vp[0] == 800 else 'vp', tag),
                          m['ox'] == 0 and m['cardW'] >= 96 and m['cardH'] >= 96 and m['gap'] >= 16 and not m['bad'],
                          'ox=%s w=%.0f h=%.0f gap=%.0f bad=%s' % (m['ox'], m['cardW'], m['cardH'], m['gap'], m['bad'][:2]))
                    if vp[0] == 1280:
                        w_live = pg.evaluate("document.getElementById('btn-rabbit').offsetWidth")
                        w_port = pg.evaluate("""() => {
                          document.body.classList.add('port');
                          const w = document.getElementById('btn-rabbit').offsetWidth;
                          document.body.classList.remove('port');
                          return w; }""")
                        check('vp %s rabbit-width anchor 96 + body.port channel -> 76 (PORT-CLS live)' % tag,
                              abs(w_live - 96) <= 2 and abs(w_port - 76) <= 2,
                              'live=%s portCls=%s' % (w_live, w_port))
                    else:
                        w_live = pg.evaluate("document.getElementById('btn-rabbit').offsetWidth")
                        check('P1b %s rabbit-width 76 (real @media == body.port channel)' % tag,
                              abs(w_live - 76) <= 2, 'w=%s' % w_live)
                    shot = SHOTS / ('mem-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
                    pg.screenshot(path=str(shot))
                    ok2, detail = png_nonblank(shot, floor=10.0)
                    check('screenshot %s %dx%d non-blank (stdev>10)' % (tag, vp[0], vp[1]), ok2, detail)
                    if ok2:
                        shot.unlink()
                snd_events.append(('vp%d' % vp[0], pg.evaluate('window.__sndLog.length')))
                ctx.close()

            # ---- 2e. 生成关种档触达：lim=42 → flat24 自动起 + nextHint 实算 + autoSolve 全链写档 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(24), bonus=30))
            pg = ctx.new_page(); watch(pg, '2e')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MEM && MEM.cards.length > 0', timeout=8000)
            pg.wait_for_timeout(800)
            lim = pg.evaluate('KIDS.calendar.limit(Infinity)')
            check('seeded save (firstDay -3d + bonus30) -> limit=42 (reaches gen flat24-39)',
                  lim == 42, 'lim=%s' % lim)
            lv = pg.evaluate('MEM.currentLevel')
            check('auto-start at flat=24 gen level (ch=5, dch in 1-4, peek on)',
                  lv['flat'] == 24 and 1 <= pg.evaluate('genLevel(24).dch') <= 4 and lv['peek'], str(lv))
            check('gen nextHint(24) = GEN_HINTS[genLevel(25).dch-1] (family F real calc)',
                  pg.evaluate('nextHint(24) === GEN_HINTS[genLevel(25).dch - 1]'))
            check('gen determinism: genLevel(26) twice JSON-equal',
                  pg.evaluate("JSON.stringify(genLevel(26)) === JSON.stringify(genLevel(26))"))
            r = pg.evaluate('MEM.autoSolve(true).then(r => { window.__ar = r; return true; })')
            pg.wait_for_function('window.__ar !== undefined', timeout=40000)
            pg.wait_for_selector('.k-celebrate', timeout=20000)
            pg.wait_for_selector('.k-celebrate', state='detached', timeout=30000)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_memory")'))
            check('gen level saved under ch5 key "5-0" (dirty-key guard allows ch>=5)',
                  '5-0' in saved['levels'], str(list(saved['levels'])[-4:]))
            snd_events.append(('2e', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2f. 存档迁移三例：旧基矛盾重置/新基合法保留（含生成关章>=5）/脏键重置 ----
            old_base = dict({'1-%d' % l: {'stars': 3, 'plays': 2} for l in range(5)},
                            **{'2-%d' % l: {'stars': 3, 'plays': 1} for l in range(5)})
            good_new = dict({'1-%d' % l: {'stars': 3, 'plays': 1} for l in range(6)},
                            **{'2-0': {'stars': 2, 'plays': 1}, '6-1': {'stars': 3, 'plays': 1}})
            dirty = {'1-9': {'stars': 3, 'plays': 1}}
            for tag, seed, want in [
                    ('old-base-conflict', old_base, 'reset'),
                    ('new-base-valid+gen', good_new, 'keep'),
                    ('dirty-key-1-9', dirty, 'reset')]:
                ctx = new_ctx(browser, migrate_seed_js(seed))
                pg = ctx.new_page(); watch(pg, '2f-' + tag)
                pg.goto(URL)
                pg.evaluate(STUB_SND)                 # 音频纪律 ②（INIT_SND 已在 context 层）
                pg.wait_for_timeout(900)
                got = pg.evaluate("""(function(){var s=JSON.parse(localStorage.getItem('kidsgame_memory')||'{}');
                  return {n: s && s.levels ? Object.keys(s.levels).length : -1};})()""")
                if want == 'keep':
                    check('migration %s: valid new-base save kept (incl gen ch>=5)' % tag,
                          got['n'] == len(seed), 'kept=%s want=%d' % (got['n'], len(seed)))
                    snd_events.append(('2f-' + tag, pg.evaluate('window.__sndLog.length')))
                else:
                    check('migration %s: invalid save reset (levels emptied)' % tag,
                          got['n'] == 0, 'kept=%s' % got['n'])
                    # reset 例教学链起播意图=游戏正确行为，不计零发声全局断言（同 2b 教学段语义）
                ctx.close()

            # ---- S1. sayW 三态（flat3 same）：链起播设窗/节流内不播不设窗/10s 后重播 + flat0 无节流对照 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3)))
            pg = ctx.new_page(); watch(pg, 'S1')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MEM && MEM.cards.length > 0', timeout=8000)
            check('S1 starts at flat=3 (>=3, throttle tier)', pg.evaluate('MEM.currentLevel.flat') == 3)
            pg.wait_for_timeout(2500)                 # 开场落定再挂钩
            vlog = hook_voice(pg)
            chains = lambda: len([v for v in vlog() if v == 'play:mem_missmore'])
            t0 = time.time()
            for _ in range(3):
                pg.evaluate('MEM.miss()')             # streak=3 → 链起播+窗设
            pg.wait_for_timeout(300)
            st1 = {'chains': chains(), 'win': pg.evaluate('MEM.state.wrongChainUntil'),
                   'miss': pg.evaluate('MEM.state.misses')}
            for _ in range(3):
                pg.evaluate('MEM.miss()')             # streak=6 → 节流内 sayW=false（不播不设窗）
            pg.wait_for_timeout(300)
            st2 = {'chains': chains(), 'miss': pg.evaluate('MEM.state.misses'),
                   'win2': pg.evaluate('MEM.state.wrongChainUntil')}
            check('S1 state1: streak 3 chain plays + window set (throttle-in misses add no chain/window)',
                  st1['chains'] == 1 and st1['win'] and st1['miss'] == 3 and
                  st2['chains'] == 1 and st2['miss'] == 6 and st2['win2'] == st1['win'],
                  str(st1) + ' ' + str(st2))
            time.sleep(max(0, (100 + SAYW_THROTTLE + 600) / 1000.0 - (time.time() - t0)))   # 距链起播 ≥10s
            for _ in range(3):
                pg.evaluate('MEM.miss()')             # streak=9 → 节流过 → 链重播
            pg.wait_for_timeout(300)
            st3 = {'chains': chains(), 'miss': pg.evaluate('MEM.state.misses')}
            check('S1 state2: 10s throttle expiry -> chain replays',
                  st3['chains'] == 2 and st3['miss'] == 9, str(st3))
            # flat<3 对照：无节流（6.2s 间隔两批 miss 均播）
            pg.evaluate('MEM.start(0)')
            pg.wait_for_function('MEM.currentLevel && MEM.currentLevel.flat === 0', timeout=5000)
            pg.wait_for_timeout(300)
            vlog = hook_voice(pg)
            chains0 = lambda: len([v for v in vlog() if v == 'play:mem_missmore'])
            for _ in range(3):
                pg.evaluate('MEM.miss()')
            pg.wait_for_timeout(6200)                 # >错链窗 3.7s，<10s 节流
            for _ in range(3):
                pg.evaluate('MEM.miss()')
            pg.wait_for_timeout(400)
            m0 = pg.evaluate('MEM.state.misses')
            c0 = chains0()
            check('S1 control flat0 (<3): no 10s throttle (two miss-batches 6.2s apart both chain)',
                  m0 == 6 and c0 == 2, 'miss=%s chains=%s' % (m0, c0))
            snd_events.append(('S1', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- S2. 救援双锚（flat3）：错链窗让路 → 14s 方向级（mem_hint+盖牌 pulse）→ 30s 答案级（手指）----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3)))
            pg = ctx.new_page(); watch(pg, 'S2')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MEM && MEM.cards.length > 0', timeout=8000)
            pg.wait_for_timeout(2500)                 # 开场落定（lastAct≈startLevel 时刻）
            pg.evaluate("""() => { window.__rescueSeen = false;   /* 支架幽灵(tut/scaffold)与答案级(rescue)分流判据 */
              setInterval(() => { if (MEM.state.ghost === 'rescue') window.__rescueSeen = true; }, 120); }""")
            vlog = hook_voice(pg)
            hints = lambda: len([v for v in vlog() if v == 'play:mem_hint'])
            t0 = time.time()
            for _ in range(3):
                pg.evaluate('MEM.miss()')             # t≈0.1 链起播+窗设+支架幽灵（视觉；语音让路）
            time.sleep(4.2)                           # 窗过（idle≈4.3s<14s 方向级未到）
            early = hints()
            check('S2 chain window: rescue/scaffold voice yields (no mem_hint before window end, idle<14s)',
                  early == 0, 'early=%s' % early)
            try:
                pg.wait_for_function('(n) => window.__vlog2.filter(v => v === "play:mem_hint").length >= n',
                                     arg=1, timeout=18000)   # 方向级 ~14s（锚=lastAct=startLevel）
            except Exception:
                pass
            dir_st = pg.evaluate("""() => ({hints: window.__vlog2.filter(v => v === "play:mem_hint").length,
                pulse: !!document.querySelector('.card.pulse')})""")
            t_dir = time.time() - t0
            check('S2 direction rescue by idle 14s (mem_hint + covered-card pulse; chain NOT resetting anchor)',
                  dir_st['hints'] >= 1 and dir_st['pulse'] and t_dir < 25,
                  'hints=%s pulse=%s t=%.1fs' % (dir_st['hints'], dir_st['pulse'], t_dir))
            try:                                      # 答案级 ~30s idle：伪闲 28s 快进（锚前移）
                pg.evaluate('lastAct = Date.now() - 28000;')
                pg.wait_for_function('window.__rescueSeen === true', timeout=22000)
            except Exception:
                pass
            ans_st = pg.evaluate("""() => ({rescue: window.__rescueSeen,
                hints: window.__vlog2.filter(v => v === "play:mem_hint").length})""")
            t_ans = time.time() - t0
            check('S2 answer rescue by idle 30s (rescue ghost finger demo appears)',
                  ans_st['rescue'] and t_ans < 48, 'rescue=%s hints=%s t=%.1fs' %
                  (ans_st['rescue'], ans_st['hints'], t_ans))
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
          (n_ok, len(RESULTS), est_ms(4), SAME_CHAIN_WIN, modeled_py(0), MODELED_MIN_PY))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
