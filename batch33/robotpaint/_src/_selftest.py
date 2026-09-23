# -*- coding: utf-8 -*-
"""robotpaint _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r18 难度改造（2026-09-18，AUDIT-78 黄款 robotpaint）：五题型（plain/neg/edit/mem/dual）+
块池组内打乱（防位置查表）+ 每关 6 题（CH_LEN=6，键基迁移 IIFE 已随启动执行）。
音频纪律三层（最高优先级——测试永不出声）：①INIT_SND context 级接管 Audio/speechSynthesis/
AudioContext 工厂（data:audio URI 走真元素读 metadata 但实例级封 play/pause）；②STUB_SND goto 后
stub KIDS.voice.play/queue/say+KIDS.audio.sfx/note+KIDS.speak（verify 页自带 stub=第②层等价物，
不重复覆盖防干扰其 __lastQueue 断言）；③种档 settings{sound:false,tts:false}。
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 24 静态关/16 生成关审计全绿
   + 专项单元全绿（tap/neg/edit/mem/dual/tutorial/frame/clips/stars/contract/hints/estWin/
   modeled/speed）+ modeled 最低 134472（=900+6*(8000+14262)）
2a. 预置存档(跳过教学) → 真实点击：首错（槽保留+忠实执行+无 breathe（dch1）+不像印记）
    → 改槽重画 → 真实点击通关 6 题 → .k-celebrate 2 星 → 存档 levels['1-0'].stars>=1 → 推进 flat=1
2b. 全新存档 → 教学 看(演示期真实点击吞+轻叮 pop)→帮(幽灵手指)→独(首次有效填入放手) 真实链路
    → robotpaint.tutSeen 持久化 → 1-0 写档
2c. 五题型真实点击链（plain flat0/neg flat6/edit flat10/mem flat13/dual flat12 各解 quiz0：
    双任务两轮/闪现后凭记忆罩住态填）+ flat24 生成关（dch4 混出）全链真实通关 → 3 星 → 写档 4-0
2d. 双 viewport(1280x800 横/800x1180 真竖)×五题型：overflowX==0、块 8 个≥48、按钮≥48、
    dual 四框≥120、竖屏块宽通道等价（真竖 88 == body.port 类 88 == 横 96 切换）、截图像素非空白
2e. 生成关种档触达（firstDay -3d + bonus30 → lim=42）：flat32 自动起(ch6 恒 dch4) +
    RP.start(41) 全链真实点击通关 → 写档 7-5（脏键守卫放行章≥5）；nextHint 生成关实算（家族 F）
2f. 存档迁移三例（CH_LEN 5→6）：旧基矛盾态重置（2-0 在而 1-5 缺）/新基合法保留（含生成关
    章≥5 关号 5）/脏键 '1-6'（关号>5）重置；reset 例教学链按设计起播（不出声——INIT_SND 工厂
    拦截；教学链意图是游戏正确行为，不计入「零发声意图」全局断言）
S1. sayW 三态（flat3）：链起播设窗（窗内二错吞）/节流内返 false 不设窗（窗后错不被吞实证：
    miss 推进）/节流过期链重播；flat0 对照：flat<3 无节流（窗后两错均播）
S2. 救援双锚（flat3）：14s 方向级（rp_q+当前槽 pulse，无 breathe 泄答案）→ 30s 答案级
    （应选块 breathe+目标值名音）；方向级不动 30s 锚（lastAct 分离——答案级仍按 30s 节奏到达）
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex=3 → cap → +bonus30
RESULTS = []
CH_LEN = 6                       # r18：每关 6 题
est_ms = lambda n: n * 345 + 600          # 家族 T 全字符口径四方之一（data/verify/build/_selftest 同步）
SPEC_MODELED_MIN = 134472                  # =900+6*(8000+14262)（verify+_selftest 双钉）
WRONG_CHAIN_WIN = 5010                     # 错链豁免窗（真时钟；S1 时序推导源）
SAYW_THROTTLE = 10000                      # 语义句 10s 节流（S1 时序推导源）
assert est_ms(17) == 6465 and SPEC_MODELED_MIN == 900 + 6 * (8000 + 14262)

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
        this.createBufferSource = () => ({ connect: noop, start: noop, buffer: null });
        this.resume = () => Promise.resolve(); this.close = () => Promise.resolve();
      };
      window.AudioContext = Silent; window.webkitAudioContext = Silent;
    }
  } catch (e) {}
})();
"""

# ---- 音频纪律 ②：goto 后 stub KIDS 发声 API（core voice.queue 全旁路 play，三处全 stub）
# 注：KIDS 是 script 级词法绑定不在 window 上（window.KIDS 恒 undefined——家族模板
# `if (window.KIDS)` 守卫=静默 no-op，r18 实证），守卫必须用 typeof 裸名解析 ----
STUB_SND = r"""
(() => {
  const noop = () => {};
  window.__voiceLog = [];
  if (typeof KIDS !== 'undefined' && KIDS) {
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
        'v': '1.0', 'game': 'robotpaint', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0.0},
        'restTip': {'day': '', 'shown': 0},
        'robotpaint': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // CH_LEN + 1, f % CH_LEN)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_robotpaint", ' + json.dumps(json.dumps(save)) + ')'


def migrate_seed_js(levels, tut=True):
    """迁移三例专用：任意 levels 键直写（含旧基/脏键），不经 keyOf 生成器"""
    save = {'v': '1.0', 'game': 'robotpaint', 'firstDay': OLD, 'lastDay': TODAY,
            'levels': levels, 'dailyMin': {}, 'bonus': {},
            'settings': {'sound': False, 'tts': False, 'vol': 0.0},
            'restTip': {'day': '', 'shown': 0}, 'robotpaint': {'tutSeen': tut}}
    return 'localStorage.setItem("kidsgame_robotpaint", ' + json.dumps(json.dumps(save)) + ')'


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


def click_block(page, i):
    loc = page.locator('.block[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def click_slot(page, i):
    loc = page.locator('.slot[data-slot="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def click_go(page):
    loc = page.locator('#btn-go')
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def rp_state(page):
    return page.evaluate('({L: RP.currentLevel, q: RP.quiz, s: RP.state})')


def block_idx_for(q, axis, val):
    for i, b in enumerate(q['blocks']):
        if b['axis'] == axis and b['val'] == val:
            return i
    return -1


def wait_pick_open(page, timeout=15000):
    """等当前题可交互（pick+未锁；mem 闪现窗毕 flashDone）"""
    t0 = time.time()
    while time.time() - t0 < timeout / 1000.0:
        st = rp_state(page)
        q, s = st['q'], st['s']
        if q and q['phase'] == 'pick' and not s['locked'] and not s['demo'] \
           and (q['kind'] != 'mem' or q['flashDone']):
            return True
        page.wait_for_timeout(200)
    return False


def play_quiz(page, timeout=75000):
    """真实点击解完当前题（dual 两任务/mem 罩住态填；含豁免窗自旋重试），返回步进数"""
    t0 = time.time()
    st0 = rp_state(page)
    s0 = st0['L']['step'] if st0['L'] else 0
    while time.time() - t0 < timeout / 1000.0:
        st = rp_state(page)
        L, q, s = st['L'], st['q'], st['s']
        if not L or L['done'] or s['won']:
            return (L['step'] if L else s0) - s0
        if L['step'] > s0:
            return L['step'] - s0
        if q and q['phase'] == 'pick' and not s['locked'] and not s['demo']:
            if q['slotIdx'] < 3:                     # 待填槽：真实点当前槽轴应选块
                ax = q['slots'][q['slotIdx']]['axis']
                i = block_idx_for(q, ax, q['target'][ax])
                if i < 0:
                    return -1
                click_block(page, i)
                page.wait_for_timeout(430)           # 填槽 pop 260ms + 余量
                continue
            # 三槽满：错值槽先清再补（豁免窗只拦「画！」，槽操作不拦）
            wrong_si = -1
            for si, sl in enumerate(q['slots']):
                if sl['val'] != q['target'][sl['axis']]:
                    wrong_si = si
                    break
            if wrong_si >= 0:
                click_slot(page, wrong_si)
                page.wait_for_timeout(360)
                continue
            click_go(page)
            page.wait_for_timeout(450)
            continue
        page.wait_for_timeout(280)
    return -1


def play_level(page, max_sec=480):
    """真实点击打完当前关（返回题型列表——按题号去重，dual 记一次）"""
    kinds = []
    t0 = time.time()
    last_step = -1
    while time.time() - t0 < max_sec:
        st = rp_state(page)
        L, q, s = st['L'], st['q'], st['s']
        if not L or L['done'] or s['won']:
            break
        if q and q['phase'] == 'pick' and not s['locked'] and not s['demo']:
            if q['step'] != last_step:
                kinds.append(q['kind'])
                last_step = q['step']
            if q['slotIdx'] < 3:
                ax = q['slots'][q['slotIdx']]['axis']
                i = block_idx_for(q, ax, q['target'][ax])
                if i < 0:
                    break
                click_block(page, i)
                page.wait_for_timeout(430)
                continue
            wrong_si = -1
            for si, sl in enumerate(q['slots']):
                if sl['val'] != q['target'][sl['axis']]:
                    wrong_si = si
                    break
            if wrong_si >= 0:
                click_slot(page, wrong_si)
                page.wait_for_timeout(360)
                continue
            click_go(page)
            page.wait_for_timeout(450)
            continue
        page.wait_for_timeout(280)
    page.wait_for_selector('.k-celebrate', timeout=30000)
    return kinds


def find_flat_of(page, kind, lo, hi):
    """页内引擎真值找 quiz0=kind 的 flat（seeded 确定性；python 侧禁复算——探针移植有
    mulberry32 运算符优先级坑，flat→kind 表以引擎为准动态取）"""
    return page.evaluate(
        '(a) => { for (let f = a[0]; f <= a[1]; f++)'
        ' if (genLevel(f).quizzes[0].kind === a[2]) return f; return -1; }', [lo, hi, kind])


def hook_chain(page):
    """覆盖 STUB 层挂 queue 记录器（仍是 stub——不出声）；返回错链计数器"""
    page.evaluate("""() => {
      window.__qlog = [];
      KIDS.voice.queue = parts => window.__qlog.push((parts || []).map(p => typeof p === 'string' ? p : (p && p.key)));
    }""")
    return lambda: page.evaluate(
        "(window.__qlog || []).filter(a => a.length && String(a[0]) === 'rp_wrong').length")


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
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=300000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total + layoutOk', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify 24 static levels all ok (6 quizzes each)',
                  len(vj['levels']) == 24 and all(v['ok'] for v in vj['levels'].values()),
                  'levels=%d' % len(vj['levels']))
            check('verify gen levels flat24-39 all ok (dch=4)',
                  len(vj['gen']) == 16 and all(v['ok'] and v['dch'] == 4 for v in vj['gen'].values()),
                  str({k: v['dch'] for k, v in list(vj['gen'].items())[:4]}))
            check('verify units all ok (tap/neg/edit/mem/dual/tutorial/frame/clips/stars/'
                  'contract/hints/estWin/modeled/speed)',
                  all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify audit shuffled quizzes >=200/240 (anti lookup-table)',
                  vj['units']['audit']['ok'] and vj['units']['audit']['shuffledQ'] >= 200,
                  str(vj['units']['audit'])[:160])
            check('verify layout sims 10/10 (5 kind-flats x 2 viewports)',
                  len(vj['smokes']['layout']['sims']) == 10 and
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str([s for s in vj['smokes']['layout']['sims'] if not s['pass']])[:160])
            md = vj['units']['modeled']
            check('duration model r18: modeled(0)=134472 min, DECIDE 5-kind, voiceWin<=DECIDE',
                  md['ok'] and md['flat0'] == SPEC_MODELED_MIN and md['min'] == SPEC_MODELED_MIN,
                  str(md)[:160])
            cl = vj['units']['clips']
            check('clips injected 22 (rp 19 + core 3) + durations in tolerance', cl['ok'],
                  'n=%s' % cl['n'])
            snd_events.append(('verify', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2a. 预置存档：首错（槽保留+忠实执行+无 breathe）→ 改槽重画 → 真实通关 2 星 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.evaluate(STUB_SND)                    # 音频纪律 ②
            pg.wait_for_function('window.RP && RP.currentLevel', timeout=8000)
            n_clips = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('rp_') === 0).length")
            check('rp_* clips injected = 19 (r18: 11 + 名音 8)', n_clips == 19, 'n=%s' % n_clips)
            pg.wait_for_timeout(1200)                # 开题落定
            lv = pg.evaluate('RP.currentLevel')
            check('start at flat0 ch1 (6 quizzes plain)', lv and lv['ch'] == 1 and lv['n'] == 6,
                  str(lv))
            check('tutorial skipped (preset)', pg.evaluate('RP.tutorial') == 'none')
            q = pg.evaluate('RP.quiz')
            check('quiz hook contract {kind,target,slots,blocks,phase,painted,judged,miss}',
                  q and q['kind'] == 'plain' and len(q['slots']) == 3 and len(q['blocks']) == 8 and
                  q['slotIdx'] == 0 and q['phase'] == 'pick' and q['painted'] is None and
                  q['judged'] is None and q['miss'] == 0, str(q and q['kind']))
            # 首错（真实点击错色填满+画）：槽保留+忠实执行 painted=所选≠目标+无 breathe（dch1）
            COLORS = ['red', 'yel', 'blu']
            wrong_c = next(c for c in COLORS if c != q['target']['color'])
            click_block(pg, block_idx_for(q, 'color', wrong_c))
            pg.wait_for_timeout(430)
            click_block(pg, block_idx_for(q, 'shape', q['target']['shape']))
            pg.wait_for_timeout(430)
            click_block(pg, block_idx_for(q, 'size', q['target']['size']))
            pg.wait_for_timeout(430)
            click_go(pg)
            t0 = time.time()
            while time.time() - t0 < 15:             # 等错链+晃动+回 pick（真时钟）
                qw = pg.evaluate('RP.quiz')
                if qw and qw['phase'] == 'pick' and qw['judged'] == 'diff':
                    break
                pg.wait_for_timeout(400)
            st = pg.evaluate('''(wc) => ({
                miss: RP.currentLevel.miss, step: RP.currentLevel.step, qmiss: RP.quiz.miss,
                s0: RP.quiz.slots[0].val, painted: RP.quiz.painted.color,
                judge: RP.quiz.painted && RP.quiz.judged,
                breathe: !!document.querySelector('.block.breathe'),
                stamp: !!document.querySelector('.frame[data-role="painted"] .stamp[data-judge="diff"]'),
                plog: window.__rpPaintLog.join(',')})''', wrong_c)
            check('first wrong: miss=1 step=0 + slots kept + faithful paint (chosen != target) '
                  '+ diff stamp + no breathe (dch1)',
                  st['miss'] == 1 and st['step'] == 0 and st['qmiss'] == 1 and
                  st['s0'] == wrong_c and st['painted'] == wrong_c and st['judge'] == 'diff' and
                  st['stamp'] and not st['breathe'] and st['plog'] == 'color,shape,size', str(st))
            kinds = play_level(pg)
            check('finished 6 quizzes by real click (flat0 all plain, repaint after wrong)',
                  len(kinds) == CH_LEN and set(kinds) == {'plain'},
                  'quizzes=%d kinds=%s' % (len(kinds), sorted(set(kinds))))
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)                # celebrate + 写档 + 推进
            lv2 = pg.evaluate('RP.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_robotpaint")'))
            s10 = saved['levels'].get('1-0', {}).get('stars', 0)
            check('save levels["1-0"].stars >= 1 (actual 2)', s10 >= 1, 'stars=%s' % s10)
            check('robotpaint.tutSeen kept true',
                  (saved.get('robotpaint') or {}).get('tutSeen') is True,
                  str(saved.get('robotpaint')))
            snd_events.append(('2a', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入+轻叮)→帮(幽灵手指)→独(首次有效填入) 真实链路 ----
            ctx = new_ctx(browser, preset_save(tut_seen=False))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.RP && RP.currentLevel', timeout=8000)
            pg.wait_for_function("RP.tutorial === 'watch'", timeout=5000)
            pg.evaluate('window.__sfx = []; KIDS.audio.sfx = n => window.__sfx.push(n);')
            qw = pg.evaluate('RP.quiz')
            i0 = block_idx_for(qw, 'color', qw['target']['color'])
            click_block(pg, i0)                      # 演示期真实点击也吞（demo 门 → pop）
            pg.wait_for_timeout(700)
            st = pg.evaluate('''() => ({step: RP.currentLevel.step, miss: RP.currentLevel.miss,
                                        tut: RP.tutorial, pop: window.__sfx.indexOf('pop') >= 0,
                                        locked: RP.state.locked, demo: RP.state.demo})''')
            check('tutorial watch swallows real click with pop ding (step/miss untouched)',
                  st['step'] == 0 and st['miss'] == 0 and st['tut'] == 'watch' and st['pop'] and
                  (st['locked'] or st['demo']), str(st))
            pg.wait_for_function("RP.tutorial === 'help'", timeout=45000)   # 等"看"演示完成（真实页 ~26s）
            check('watch demo effect __rpDemoR === right (ghost tapped red/cir/big)',
                  pg.evaluate('window.__rpDemoR') == 'right',
                  str(pg.evaluate('window.__rpDemoR')))
            check('watch demo fill log == red,cir,big',
                  pg.evaluate('window.__rpDemoLog.join(",")') == 'red,cir,big',
                  str(pg.evaluate('window.__rpDemoLog')))
            q2 = pg.evaluate('RP.quiz')
            check('turn first quiz customized yellow-small-square, 3 empty slots (plain)',
                  q2 and q2['kind'] == 'plain' and q2['step'] == 0 and q2['miss'] == 0 and
                  q2['target']['color'] == 'yel' and q2['target']['shape'] == 'squ' and
                  q2['target']['size'] == 'small' and
                  all(sl['val'] is None for sl in q2['slots']), str(q2 and q2['target']))
            try:
                pg.wait_for_function(
                    "document.getElementById('ghost').classList.contains('show')", timeout=8000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost visible (points correct block)', ghost_shown)
            # "独"：首次有效填入 → 放手（tut=solo+ghost 收）
            click_block(pg, block_idx_for(q2, 'color', 'yel'))
            pg.wait_for_timeout(700)
            solo_st = pg.evaluate(
                "() => ({tut: RP.tutorial, ghost: document.getElementById('ghost').classList.contains('show')})")
            check('first valid fill -> solo (ghost hidden)',
                  solo_st['tut'] == 'solo' and not solo_st['ghost'], str(solo_st))
            kinds = play_level(pg)
            check('tutorial level playable -> .k-celebrate (6 quizzes total, 3 stars)',
                  len(kinds) == CH_LEN and set(kinds) == {'plain'},
                  'quizzes=%d kinds=%s' % (len(kinds), sorted(set(kinds))))
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_robotpaint")'))
            check('robotpaint.tutSeen persisted after tutorial',
                  (saved.get('robotpaint') or {}).get('tutSeen') is True, str(saved.get('robotpaint')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            snd_events.append(('2b', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2c. 五题型真实点击链（各解 quiz0）+ flat24 生成关全链 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(24), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.RP && RP.currentLevel', timeout=8000)
            pg.wait_for_timeout(1200)
            lv = pg.evaluate('RP.currentLevel')
            check('seeded (done 0-23) -> start flat=24 ch=5 dch=4 (gen five-kind)',
                  lv and lv['flat'] == 24 and lv['ch'] == 5 and lv['dch'] == 4, str(lv))
            # 五题型 flat 页内动态取（引擎真值；python 探针 mulberry32 移植不可信——r18 实证）
            kind_flats = [('plain', 0)]
            for kind, lo, hi in [('neg', 6, 11), ('edit', 6, 11), ('mem', 12, 17), ('dual', 12, 17)]:
                f = find_flat_of(pg, kind, lo, hi)
                if f < 0:
                    f = find_flat_of(pg, kind, 24, 39)
                kind_flats.append((kind, f))
            check('2c five-kind flats found in engine (quiz0 per kind)',
                  all(f >= 0 for _, f in kind_flats), str(kind_flats))
            for kind, flat in kind_flats:
                pg.evaluate('(f) => RP.start(f)', flat)
                ok_open = wait_pick_open(pg, timeout=20000)   # mem 闪现窗（真实 ~6.8s）
                qk = pg.evaluate('RP.quiz')
                ok_q = ok_open and qk and qk['kind'] == kind and qk['step'] == 0
                if kind == 'mem':
                    ok_q = ok_q and pg.evaluate(
                        "!!document.querySelector('.memcover[data-covered=\"1\"]')")
                if kind == 'dual':
                    ok_q = ok_q and pg.evaluate(
                        "document.getElementById('easel').classList.contains('dual') && "
                        "document.querySelectorAll('#easel .frame').length === 4 && "
                        "document.querySelectorAll('#easel .frame.dual-only').length === 2")
                adv = play_quiz(pg)
                check('2c real-click solve quiz0 of kind=%s (flat%d, step+1; mem covered-fill; '
                      'dual two tasks)' % (kind, flat),
                      ok_q and adv == 1, 'open=%s kind=%s adv=%s' %
                      (ok_open, qk and qk['kind'], adv))
            pg.evaluate('RP.start(24)')
            pg.wait_for_timeout(1200)
            kinds = play_level(pg)
            check('gen flat24 (dch4 mixed) real-click full chain win (6 quizzes)',
                  len(kinds) == CH_LEN and len(set(kinds)) >= 3,
                  'quizzes=%d kinds=%s' % (len(kinds), sorted(set(kinds))))
            stars = pg.locator('.k-celebrate .k-star').count()
            check('level flat24 real-click win 3 stars (0 wrong)', stars == 3, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_robotpaint")'))
            s40 = saved['levels'].get('4-0', {}).get('stars', 0)
            check('save levels["4-0"].stars >= 1 (actual 3)', s40 >= 1, 'stars=%s' % s40)
            snd_events.append(('2c', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2d. 双 viewport × 五题型 + 竖屏通道等价 + 截图非空白（flats 承 2c 页内动态取）----
            KIND_FLATS = [kf for kf in kind_flats if kf[1] >= 0]
            for vp in [(1280, 800), (800, 1180)]:
                ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(5)), vp=vp)
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                pg.evaluate(STUB_SND)
                pg.wait_for_function('window.RP && RP.currentLevel', timeout=8000)
                pg.wait_for_timeout(1000)
                if vp[0] == 800:
                    check('2d real portrait viewport (800x1180 -> @media channel active)',
                          pg.evaluate('window.innerHeight > window.innerWidth'))
                for tag, flat in KIND_FLATS:
                    pg.evaluate('(f) => RP.start(f)', flat)
                    wait_pick_open(pg, timeout=20000)
                    pg.wait_for_timeout(250)
                    m = pg.evaluate(r'''() => {
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;   /* core 家长退出钮 44px 全家标准（豁免） */
                        if (e.offsetWidth > 4 && e.offsetHeight > 4 && (e.offsetWidth < 48 || e.offsetHeight < 48))
                          bad.push((e.id || e.className) + ':' + e.offsetWidth + 'x' + e.offsetHeight);
                      });
                      const blocks = [...document.querySelectorAll('#board .block')];
                      const frames = [...document.querySelectorAll('#easel .frame')]
                        .filter(f => f.offsetWidth > 0);
                      return {ox: Math.max(de.scrollWidth - de.clientWidth,
                                          document.getElementById('game').scrollWidth -
                                          document.getElementById('game').clientWidth),
                              bad: bad, blocks: blocks.length,
                              bMin: blocks.length ? Math.min(...blocks.map(b => Math.min(b.offsetWidth, b.offsetHeight))) : 0,
                              bw: blocks.length ? blocks[0].offsetWidth : 0,
                              frames: frames.length,
                              fMin: frames.length ? Math.min(...frames.map(f => f.offsetWidth)) : 0,
                              kind: RP.quiz.kind};
                    }''')
                    want_frames = 4 if tag == 'dual' else 2
                    check('%s %s overflowX==0 + blocks=8(>=48) + buttons>=48 + frames=%d(>=120)' %
                          ('P1b' if vp[0] == 800 else 'vp', tag, want_frames),
                          m['ox'] == 0 and m['blocks'] == 8 and m['bMin'] >= 48 and not m['bad'] and
                          m['frames'] == want_frames and m['fMin'] >= 120,
                          'ox=%s blocks=%s bMin=%s bad=%s frames=%s fMin=%s' %
                          (m['ox'], m['blocks'], m['bMin'], m['bad'][:2], m['frames'], m['fMin']))
                    # 竖屏块宽通道等价：横=96 / 竖(@media 或 body.port)=88
                    if vp[0] == 1280:
                        w_live = m['bw']
                        w_port = pg.evaluate('''() => {
                          document.body.classList.add('port');
                          const w = document.querySelector('#board .block').offsetWidth;
                          document.body.classList.remove('port');
                          return w;
                        }''')
                        check('vp %s block width 96 + body.port channel -> 88 (PORT-CLS live)' % tag,
                              abs(w_live - 96) <= 2 and abs(w_port - 88) <= 2,
                              'live=%s portCls=%s' % (w_live, w_port))
                    else:
                        check('P1b %s block width 88 (real @media == body.port channel)' % tag,
                              abs(m['bw'] - 88) <= 2, 'bw=%s' % m['bw'])
                    shot = SHOTS / ('rp-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
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
            pg.wait_for_function('window.RP && RP.currentLevel', timeout=8000)
            pg.wait_for_timeout(1500)
            lim = pg.evaluate('KIDS.calendar.limit(Infinity)')
            check('seeded save (firstDay -3d + bonus30) -> limit=42 (reaches gen flat32-41)',
                  lim == 42, 'lim=%s' % lim)
            lv = pg.evaluate('RP.currentLevel')
            check('auto-start at flat=32 gen level (ch=6, dch=4)',
                  lv and lv['flat'] == 32 and lv['ch'] == 6 and lv['dch'] == 4, str(lv))
            check('gen nextHint(32) = GEN_HINTS[genLevel(33).dch-1] (family F real calc)',
                  pg.evaluate('nextHint(32) === GEN_HINTS[genLevel(33).dch - 1]'))
            pg.evaluate('(f) => RP.start(f)', 41)
            pg.wait_for_timeout(1500)
            lv41 = pg.evaluate('RP.currentLevel')
            check('flat41 level state (ch=7, lv=5, dch=4)',
                  lv41 and lv41['flat'] == 41 and lv41['ch'] == 7 and lv41['lv'] == 5 and
                  lv41['dch'] == 4, str(lv41))
            check('gen nextHint(41) real calc too',
                  pg.evaluate('nextHint(41) === GEN_HINTS[genLevel(42).dch - 1]'))
            kinds = play_level(pg)
            check('gen level 41 real-click full chain win (6 quizzes -> celebrate)',
                  len(kinds) == CH_LEN, 'quizzes=%d kinds=%s' % (len(kinds), sorted(set(kinds))))
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_robotpaint")'))
            check('gen level saved under ch7 key "7-5" (dirty-key guard allows ch>=5)',
                  '7-5' in saved['levels'], str(list(saved['levels'])[-4:]))
            snd_events.append(('2e', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2f. 存档迁移三例（CH_LEN 5→6）：旧基矛盾/新基合法（含生成关）/脏键 1-6 ----
            old_base = dict({'1-%d' % l: {'stars': 3, 'plays': 2} for l in range(5)},
                            **{'2-%d' % l: {'stars': 3, 'plays': 1} for l in range(5)})
            good_new = dict({'1-%d' % l: {'stars': 3, 'plays': 1} for l in range(6)},
                            **{'2-0': {'stars': 2, 'plays': 1}, '6-1': {'stars': 3, 'plays': 1}})
            dirty = {'1-6': {'stars': 3, 'plays': 1}}
            for tag, seed, want_kept in [('old-base-conflict', old_base, False),
                                         ('new-base-valid+gen', good_new, True),
                                         ('dirty-key-1-6', dirty, False)]:
                ctx = new_ctx(browser, migrate_seed_js(seed))
                pg = ctx.new_page(); watch(pg, '2f-' + tag)
                pg.goto(URL)
                pg.evaluate(STUB_SND)                 # 音频纪律 ②（同 2a：INIT_SND 已在 context 层）
                pg.wait_for_timeout(900)
                kept = pg.evaluate(
                    "(function(){var s=JSON.parse(localStorage.getItem('kidsgame_robotpaint')||'{}');"
                    "return s && s.levels ? Object.keys(s.levels).length : -1;})()")
                if want_kept:
                    check('migration %s: valid new-base save kept (incl gen ch>=5, lv 0-5)' % tag,
                          kept == len(seed), 'kept=%s want=%d' % (kept, len(seed)))
                    snd_events.append(('2f-' + tag, pg.evaluate('window.__sndLog.length')))
                else:
                    check('migration %s: invalid save reset (levels emptied)' % tag,
                          kept == 0, 'kept=%s' % kept)
                    # reset 例：档被清+delete sv.robotpaint → fresh 教学链按设计起播（INIT_SND 工厂
                    # 拦截不出声）——教学链意图是游戏正确行为，不计入「零发声意图」全局断言
                    tut_reset = pg.evaluate(
                        "(function(){var s=JSON.parse(localStorage.getItem('kidsgame_robotpaint')||'{}');"
                        "return !(s.robotpaint && s.robotpaint.tutSeen);})()")
                    check('migration %s: tutSeen cleared too (tutorial replays)' % tag, tut_reset)
                ctx.close()

            # ---- S1. sayW 三态（flat3）：窗设吞/节流不设窗（窗后不被吞实证）/过期重播 + flat0 对照 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3)))
            pg = ctx.new_page(); watch(pg, 'S1')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.RP && RP.currentLevel', timeout=8000)
            check('S1 starts at flat=3 (>=3, throttle tier)',
                  pg.evaluate('RP.currentLevel.flat') == 3)
            pg.wait_for_timeout(1500)                 # 开题落定再挂钩
            chains = hook_chain(pg)
            q = pg.evaluate('RP.quiz')
            wrong_c = next(c for c in ['red', 'yel', 'blu'] if c != q['target']['color'])
            for ax, val in [('color', wrong_c), ('shape', q['target']['shape']),
                            ('size', q['target']['size'])]:
                pg.evaluate('(i) => RP.tapBlock(i)', block_idx_for(q, ax, val))
            # 绝对时间调度（承诺返回锚定：判定=tapGo入口+3.6s（错链锚 lastWrongVoice），
            # 承诺返回=判定+2.6s（晃动窗）→ 豁免窗终点=承诺返回+2.4s；节流 10s 自判定起算）
            r1 = pg.evaluate('RP.tapGo()')            # 错#1：链起播+窗设
            t_r1 = time.time()                        # = 判定+2.6s；窗终点 ≈ t_r1+2.4
            pg.wait_for_timeout(200)
            r2 = pg.evaluate('RP.tapGo()')            # 窗内二错：入口吞（miss 不动）
            st1 = {'r1': r1, 'r2': r2, 'miss': pg.evaluate('RP.currentLevel.miss'),
                   'chains': chains()}
            check('S1 state1: wrong#1 plays chain + sets window (in-window tap#2 swallowed, miss stays 1)',
                  st1['r1'] == 'wrong' and r2 is False and st1['miss'] == 1 and
                  st1['chains'] == 1, str(st1))
            # 窗过期（t_r1+2.4 < 入口 t_r1+2.7）但节流未到（判定=入口+3.6s → 距锚 ≈8.9s <10s）
            time.sleep(max(0, 2.71 - (time.time() - t_r1)))
            r3 = pg.evaluate('RP.tapGo()')            # 错#3：节流内 sayW=false → 不播不设窗
            st3 = {'r3': r3, 'miss': pg.evaluate('RP.currentLevel.miss'), 'chains': chains()}
            r4 = pg.evaluate('RP.tapGo()')            # 错#4：#3 未设窗 → 入口不被吞（miss 推进）
            st4 = {'r4': r4, 'miss': pg.evaluate('RP.currentLevel.miss'), 'chains': chains()}
            check('S1 state2: throttle window sayW=false (no chain, no window -> tap#4 NOT '
                  'swallowed, miss advances) then >10s replay',
                  st3['r3'] == 'wrong' and st3['miss'] == 2 and st3['chains'] == 1 and
                  st4['r4'] == 'wrong' and st4['miss'] == 3 and st4['chains'] == 2,
                  '%s %s' % (st3, st4))
            # flat<3 对照：无节流（窗后两错均播）
            pg.evaluate('RP.start(0)')
            pg.wait_for_timeout(1500)
            chains0 = hook_chain(pg)
            q0 = pg.evaluate('RP.quiz')
            w0 = next(c for c in ['red', 'yel', 'blu'] if c != q0['target']['color'])
            for ax, val in [('color', w0), ('shape', q0['target']['shape']),
                            ('size', q0['target']['size'])]:
                pg.evaluate('(i) => RP.tapBlock(i)', block_idx_for(q0, ax, val))
            pg.evaluate('RP.tapGo()')                 # flat0 错#1：无节流必播
            t0c = time.time()
            time.sleep(max(0, 2.71 - (time.time() - t0c)))
            pg.evaluate('RP.tapGo()')                 # 窗后错#2：仍播（~6s 间隔无节流）
            pg.wait_for_timeout(700)
            m0 = pg.evaluate('RP.currentLevel.miss')
            c0 = chains0()
            check('S1 control flat0 (<3): no 10s throttle (two wrongs ~6s apart both chain)',
                  m0 == 2 and c0 == 2, 'miss=%s chains=%s' % (m0, c0))
            snd_events.append(('S1', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- S2. 救援双锚（flat3）：14s 方向级（rp_q+槽 pulse 无 breathe）→ 30s 答案级（breathe+名音）----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3)))
            pg = ctx.new_page(); watch(pg, 'S2')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.RP && RP.currentLevel', timeout=8000)
            pg.wait_for_timeout(1500)                 # 开题落定（lastAct≈开题时刻）
            base_q = pg.evaluate(
                "(window.__voiceLog || []).filter(e => e === 'play:rp_q').length")
            t0 = time.time()
            early = pg.evaluate(
                "(window.__voiceLog || []).filter(e => e === 'play:rp_q').length")
            check('S2 rescue not fired before 14s idle (baseline opener only)',
                  early == base_q, 'base=%s now=%s' % (base_q, early))
            try:
                pg.wait_for_function(
                    "(window.__voiceLog || []).filter(e => e === 'play:rp_q').length >= " +
                    str(base_q + 1), timeout=22000)   # 方向级 ~14s（锚=开题）
            except Exception:
                pass
            dir_st = pg.evaluate(r'''() => ({
                qs: (window.__voiceLog || []).filter(e => e === 'play:rp_q').length,
                flash: !!document.querySelector('.slot.flash'),
                breathe: !!document.querySelector('.block.breathe')})''')
            t_dir = time.time() - t0
            check('S2 direction rescue by idle 14s (rp_q replay + current slot pulse)',
                  dir_st['qs'] >= base_q + 1 and dir_st['flash'] and t_dir < 26,
                  'qs=%s flash=%s t=%.1fs' % (dir_st['qs'], dir_st['flash'], t_dir))
            check('S2 direction tier leaks no answer (no .breathe at direction fire)',
                  not dir_st['breathe'], str(dir_st))
            try:                                      # 答案级 ~30s idle：应选块 breathe+目标值名音
                pg.wait_for_function(
                    "!!document.querySelector('.block.breathe') || "
                    "(window.__voiceLog || []).some(e => e.indexOf('play:rp_n_') === 0)",
                    timeout=26000)
            except Exception:
                pass
            ans_st = pg.evaluate(r'''() => ({
                breathe: !!document.querySelector('.block.breathe'),
                namePlay: (window.__voiceLog || []).filter(e => e.indexOf('play:rp_n_') === 0).length})''')
            t_ans = time.time() - t0
            check('S2 answer rescue by idle 30s (correct block breathe + target-name clip; '
                  'direction tier did not reset lastAct)',
                  ans_st['breathe'] and ans_st['namePlay'] >= 1 and t_ans < 55,
                  'breathe=%s namePlay=%s t=%.1fs' %
                  (ans_st['breathe'], ans_st['namePlay'], t_ans))
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
    print('\n==== SELFTEST %d/%d PASS (estMs(17)=%d flashWin=%d modeledMin=%d) ====' %
          (n_ok, len(RESULTS), est_ms(17), est_ms(17) + 300, SPEC_MODELED_MIN))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
