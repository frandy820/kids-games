# -*- coding: utf-8 -*-
"""sortsize _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r19 难度改造（2026-09-18，AUDIT-56 #15 黄款）：三题型 sort 全排序 6-7 物相近档 / dual 双属性
（3 档×红蓝皮球，先大小再颜色）/ ord 序数（第 N 大/N 小单点）；键基不变（CH_LEN=5）——
r19 无迁移 IIFE，原「迁移三例」以「存量档兼容三例」等价覆盖（SPEC §-r19 §7 记载决策）。
音频纪律三层（最高优先级——测试永不出声）：①INIT_SND context 级接管 Audio/speechSynthesis/
AudioContext 工厂（data:audio URI 走真元素读 metadata 但实例级封 play/pause）；②STUB_SND goto 后
stub KIDS.voice.play/queue/say+KIDS.audio.sfx/note+KIDS.speak（verify 页自带 stub=第②层等价物，
不重复覆盖防干扰其断言）；③种档 settings{sound:false,tts:false}。
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 20 静态关/20 生成关审计全绿
   + 专项单元全绿（tapCard/tapDual/tapOrd/sayW/tutorial/dist/modeled）+ modeled(0)=88650 min=82760
2a. 预置存档(跳过教学) → 真实指针：首错(wig+零惩罚 step 不动+应点卡不 breathe) →
    真实点击通关 5 题(sort) → .k-celebrate 2星 → 存档 levels['1-0'].stars>=1 → 推进 flat=1
2b. 全新存档 → 教学 看(hook+真实点击全吞+轻叮 pop)→帮(幽灵手指)→独(首次判对) 真实链路
    → sortsize.tutSeen 持久化 → 1-0 写档
2c. flat10（ch3 双属性关）：legend 首色=红（热身）+真实点击通关 5 题（含平局翻转逐步重读应点）
    → 3 星 → 写档 3-0
2d. flat15（ch4 序数关）：题型序列 ord×4+dual 回顾 + ord 单点/锚跟随 → 3 星 → 写档 4-0
2e. 生成关种档触达（firstDay -3d + bonus30）：flat20 自动起(ch5 dch 1-4) + nextHint 生成关实算
    （家族 F 行为级）+ 全链真实点击通关 → 写档 5-0
2f/P1b. 双 viewport(1280x800 横/800x1180 真竖)×四章型(sort obv6/close7/dual/ord)：
    overflowX==0、卡≥96、按钮≥64、槽宽通道等价（横 84 == body.port 类 76 == 真竖 76）、
    截图像素非空白（存 _shots/）
2g. 存量档兼容三例（键基不变等价）：全旧基完成档保留+日末面板/含生成关合法档保留+续玩 flat5/
    脏键 1-9 无害不清洗
S1. sayW 行为级（flat3）：链起播设窗（窗内二错吞）/miss==2 force 起播（节流内亦播）/
    节流内非 force 静默不设窗（后续错不被吞实证）/10s 节流过期重播；flat0 对照：无节流
S2. 救援双锚（flat3）：错点只设链窗不重置 30s 锚 → 14s 方向级（重排题面 sor_q_* 链+题面卡
    pulse，无 breathe 泄答案）→ 30s 答案级（应点卡 breathe）
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex=3 → 种档触达生成关
RESULTS = []
CH_LEN = 5                        # r19：键基不变（SPEC §-r19 §7）
est_ms = lambda n: n * 345 + 600          # 家族 T 全字符口径四方之一（data/verify/build/_selftest 同步）
WRONG_CHAIN_WIN = est_ms(10) + 300        # 4350：错反馈豁免窗（S1 时序推导源，契约 I）
SAYW_THROTTLE = 10000                              # 语义句 10s 节流（契约 J）
assert WRONG_CHAIN_WIN == 4350 and est_ms(10) == 4050
SPEC_MODELED_FLAT0 = 88650                 # §-r19 §4 双钉（build/verify/_selftest 三方字面）
SPEC_MODELED_MIN = 82760

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
        'v': '1.0', 'game': 'sortsize', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0.0},
        'restTip': {'day': '', 'shown': 0},
        'sortsize': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // CH_LEN + 1, f % CH_LEN)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_sortsize", ' + json.dumps(json.dumps(save)) + ')'


def compat_seed_js(levels, tut=True):
    """存量档兼容三例专用：任意 levels 键直写（含全旧基/生成关/脏键），不经 keyOf 生成器"""
    save = {'v': '1.0', 'game': 'sortsize', 'firstDay': OLD, 'lastDay': TODAY,
            'levels': levels, 'dailyMin': {}, 'bonus': {},
            'settings': {'sound': False, 'tts': False, 'vol': 0.0},
            'restTip': {'day': '', 'shown': 0}, 'sortsize': {'tutSeen': tut}}
    return 'localStorage.setItem("kidsgame_sortsize", ' + json.dumps(json.dumps(save)) + ')'


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


def quiz_of(page):
    return page.evaluate('SO.quiz')


def wrong_idx(page):
    """当前题的一个错点位（≠answerIdx；避开已 gone 卡——gone 卡 bounding box 中心点击无意义）"""
    return page.evaluate("""(() => {
      const q = SO.quiz;
      const gone = [...document.querySelectorAll('#board .card.gone')].map(c => Number(c.dataset.i));
      let i = 0;
      while (i === q.answerIdx || gone.indexOf(i) >= 0) i++;
      return i;
    })()""")


STEP_WAIT = 950        # 判对演出窗（飞入 420+220 await+槽亮）+ 落定余量


def play_level_real(page):
    """真实点击打完当前关（三题型通用：逐步重读 SO.quiz.answerIdx——sort/dual 平局翻转即由它承载；
    ord 单点即换题）"""
    quizzes = 0
    kinds = []
    while quizzes < 12:
        q = quiz_of(page)
        if q is None:
            break
        kinds.append(q['kind'])
        st0 = page.evaluate('SO.currentLevel.step')
        guard = 0
        while guard < 12:
            qq = quiz_of(page)
            cur_step = page.evaluate('SO.currentLevel.step')
            if qq is None or cur_step != st0:
                break
            click_card(page, qq['answerIdx'])
            page.wait_for_timeout(STEP_WAIT)
            guard += 1
        page.wait_for_timeout(500)             # 换题渲染余量
        quizzes += 1
    page.wait_for_selector('.k-celebrate', timeout=30000)
    return quizzes, kinds


def hook_wrong_plays(page):
    """覆盖 STUB 层挂 play 记录器（仍是 stub——不出声）；wrong 句 key='sor_wrong'（T46 阶段2 键化）"""
    page.evaluate("""() => {
      window.__wlog = [];
      KIDS.voice.play = (k, t) => window.__wlog.push(String(k));
    }""")
    return lambda: page.evaluate(
        "(window.__wlog || []).filter(s => s === 'sor_wrong').length")


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
            check('verify 20 static levels all ok (5 quizzes each)',
                  len(vj['levels']) == 20 and all(v['ok'] for v in vj['levels'].values()),
                  'levels=%d' % len(vj['levels']))
            check('verify gen levels flat20-39 all ok (random pdch 1-4)',
                  len(vj['gen']) == 20 and all(v['ok'] for v in vj['gen'].values()),
                  str({k: v['pdch'] for k, v in list(vj['gen'].items())[:6]}))
            check('verify units all ok (tapCard/tapDual/tapOrd/sayW/tutorial/dist/modeled)',
                  all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify layout sims 8/8 (4 flats x 2 viewports)',
                  len(vj['smokes']['layout']['sims']) == 8 and
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str([s for s in vj['smokes']['layout']['sims'] if not s['pass']])[:160])
            md = vj['units']['modeled']
            check('duration model r19: modeled(0)=%d min=%d (SPEC pins, no rounding)'
                  % (SPEC_MODELED_FLAT0, SPEC_MODELED_MIN),
                  md['ok'] and md['flat0'] == SPEC_MODELED_FLAT0 and md['min'] == SPEC_MODELED_MIN,
                  str(md)[:160])
            cl_ok = vj['units']['dist']['clips']
            check('clips injected 20 (sor 17 + core 3)', cl_ok, '')
            snd_events.append(('verify', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + 真实点击通关（2 星）+ 写档 + 推进 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.evaluate(STUB_SND)                    # 音频纪律 ②
            pg.wait_for_function('window.SO && SO.currentLevel', timeout=8000)
            n_clips = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('sor_') === 0).length")
            check('sor_* clips injected = 18 (r19 17 + T46 阶段2 sor_wrong)', n_clips == 18, 'n=%s' % n_clips)
            pg.wait_for_timeout(2500)                # 开场链落定
            lv = pg.evaluate('SO.currentLevel')
            check('start at flat0 ch1 (5 quizzes)', lv and lv['ch'] == 1 and lv['n'] == 5, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('SO.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook contract {kind,tier,qi,kindId,order,first,rank,items,colors,left,pos,answerIdx,step,miss}',
                  q and q['kind'] == 'sort' and q['tier'] == 'obv6' and q['order'] == 'big' and
                  len(q['items']) == 6 and q['colors'] is None and q['first'] is None and
                  q['rank'] is None and len(q['left']) == 6 and q['pos'] == 0 and
                  q['answerIdx'] >= 0 and q['step'] == 0 and q['miss'] == 0 and
                  isinstance(q['kindId'], str), str(q and q['kind']))
            # 首错（真实点击错卡）：wig+step 不动+miss=1+应点卡不 breathe（首错不 pulse）
            wi = wrong_idx(pg)
            click_card(pg, wi)
            pg.wait_for_timeout(1300)
            st = pg.evaluate('''(wi) => {
              const q = SO.quiz;
              const w = document.querySelector('.card[data-i="' + wi + '"]');
              const ok = document.querySelector('.card[data-i="' + q.answerIdx + '"]');
              return {retries: SO.currentLevel.retries, step: SO.currentLevel.step, miss: q.miss,
                      wig: w.classList.contains('wig'), dim: w.classList.contains('dim'),
                      clickable: getComputedStyle(w).pointerEvents !== 'none',
                      breathe: ok.classList.contains('breathe')};
            }''', wi)
            check('first wrong: wig + step unchanged + miss=1 + card stays clickable + no breathe',
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and
                  st['wig'] and not st['dim'] and st['clickable'] and not st['breathe'], str(st))
            n, kinds = play_level_real(pg)
            check('finished 5 quizzes by real click (flat0 all sort obv6→close ladder)',
                  n == CH_LEN and set(kinds) == {'sort'}, 'quizzes=%d kinds=%s' % (n, set(kinds)))
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)                # celebrate + 写档 + 推进
            lv2 = pg.evaluate('SO.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_sortsize")'))
            s10 = saved['levels'].get('1-0', {}).get('stars', 0)
            check('save levels["1-0"].stars >= 1 (actual 2)', s10 >= 1, 'stars=%s' % s10)
            check('sortsize.tutSeen kept true', (saved.get('sortsize') or {}).get('tutSeen') is True,
                  str(saved.get('sortsize')))
            snd_events.append(('2a', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入+轻叮)→帮(幽灵手指)→独(首次判对) 真实链路 ----
            ctx = new_ctx(browser, preset_save(tut_seen=False))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.SO && SO.currentLevel', timeout=8000)
            pg.wait_for_function("SO.tutorial === 'watch'", timeout=5000)
            pg.evaluate('window.__sfx = []; KIDS.audio.sfx = n => window.__sfx.push(n);')
            qw = quiz_of(pg)
            swallowed_hook = pg.evaluate('SO.tapCard(0)') is False   # 演示期 hook 输入全吞
            click_card(pg, qw['answerIdx'])          # 演示期真实点击也吞（locked 门 → pop）
            pg.wait_for_timeout(700)
            st = pg.evaluate('''() => ({step: SO.currentLevel.step, retries: SO.currentLevel.retries,
                                        tut: SO.tutorial, pop: window.__sfx.indexOf('pop') >= 0})''')
            check('tutorial watch swallows input (real click + hook) with pop ding',
                  swallowed_hook and st['step'] == 0 and st['retries'] == 0 and
                  st['tut'] == 'watch' and st['pop'], str(st))
            pg.wait_for_function("SO.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q2 = quiz_of(pg)
            check('tutorial watch done -> level re-issued to quiz 0 (fresh board)',
                  q2 and q2['step'] == 0 and q2['miss'] == 0 and q2['pos'] == 0, str(q2 and q2['kind']))
            try:
                pg.wait_for_function(
                    "document.getElementById('ghost').classList.contains('show')", timeout=5000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost visible (points answer card)', ghost_shown)
            # "独"：首次判对 → 放手（tut=solo+ghost 收；sort 题单步只推进 quiz.pos——完成整题才推 level step）
            p0 = pg.evaluate('SO.quiz.pos')
            click_card(pg, q2['answerIdx'])
            pg.wait_for_function("SO.tutorial === 'solo'", timeout=9000)
            solo_st = pg.evaluate(
                "() => ({tut: SO.tutorial, ghost: document.getElementById('ghost').classList.contains('show'),"
                " pos: SO.quiz ? SO.quiz.pos : -1})")
            check('first correct -> solo (ghost hidden + quiz pos advanced)',
                  solo_st['tut'] == 'solo' and not solo_st['ghost'] and solo_st['pos'] == p0 + 1, str(solo_st))
            pg.wait_for_timeout(STEP_WAIT)
            n, kinds = play_level_real(pg)
            check('tutorial level playable -> .k-celebrate (solo tap is a partial step, all 5 quizzes counted)',
                  n == CH_LEN, 'quizzes=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_sortsize")'))
            check('sortsize.tutSeen persisted after tutorial',
                  (saved.get('sortsize') or {}).get('tutSeen') is True, str(saved.get('sortsize')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            snd_events.append(('2b', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2c. flat10（ch3 双属性）：热身 first=r + 真实通关（平局翻转逐步重读）3 星 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.SO && SO.currentLevel', timeout=8000)
            pg.wait_for_timeout(2500)
            lv = pg.evaluate('SO.currentLevel')
            check('seeded (done 0-9 + bonus30) -> start flat=10 ch=3 dch=3',
                  lv and lv['flat'] == 10 and lv['ch'] == 3 and lv['dch'] == 3, str(lv))
            q = quiz_of(pg)
            legend_ok = pg.evaluate("""(() => {
              const lgs = [...document.querySelectorAll('#prompt-chip .lg')];
              return q0.first === 'r' && document.getElementById('prompt-chip').dataset.first === 'r' &&
                lgs.length === 2 && lgs[0].textContent === '\\uD83D\\uDD34' && lgs[1].textContent === '\\uD83D\\uDD35';
            })()""".replace('q0', 'SO.quiz'))
            check('dual warmup: first=r legend red->blue on prompt chip', q and q['kind'] == 'dual' and legend_ok,
                  'kind=%s first=%s' % (q and q['kind'], q and q['first']))
            n, kinds = play_level_real(pg)
            check('ch3 dual level: 5 dual quizzes by real click (tie-flip via answerIdx re-read)',
                  n == CH_LEN and set(kinds) == {'dual'}, 'quizzes=%d kinds=%s' % (n, set(kinds)))
            stars = pg.locator('.k-celebrate .k-star').count()
            check('level flat10 real-click win 3 stars (0 wrong)', stars == 3, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_sortsize")'))
            s30 = saved['levels'].get('3-0', {}).get('stars', 0)
            check('save levels["3-0"].stars >= 1 (actual 3)', s30 >= 1, 'stars=%s' % s30)
            snd_events.append(('2c', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2d. flat15（ch4 序数）：题型序列 ord×4+dual + 通关 3 星 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.SO && SO.currentLevel', timeout=8000)
            pg.wait_for_timeout(2500)
            lv = pg.evaluate('SO.currentLevel')
            check('seeded (done 0-14 + bonus30) -> start flat=15 ch=4 dch=4',
                  lv and lv['flat'] == 15 and lv['ch'] == 4 and lv['dch'] == 4, str(lv))
            q = quiz_of(pg)
            ord_dom = pg.evaluate("""(() => {
              const strip = document.getElementById('strip');
              const num = strip.querySelector('.slot .s-num');
              const oas = [...document.querySelectorAll('#prompt-chip .oa')];
              const ring = oas.findIndex(e => e.classList.contains('ring'));
              return q0.kind === 'ord' && q0.rank === 2 && strip.classList.contains('ord') &&
                strip.querySelectorAll('.slot').length === 1 && num.textContent === '2' &&
                oas.length === q0.items.length && ring === q0.rank - 1;
            })()""".replace('q0', 'SO.quiz'))
            check('ord warmup: single slot num=2 + anchor dots ring at rank-1 (visual=SIZE order)',
                  q and q['kind'] == 'ord' and ord_dom, 'kind=%s rank=%s' % (q and q['kind'], q and q['rank']))
            n, kinds = play_level_real(pg)
            check('ch4 level: kind sequence ord,ord,ord,ord,dual (plan warmup+review)',
                  n == CH_LEN and kinds == ['ord', 'ord', 'ord', 'ord', 'dual'],
                  'quizzes=%d kinds=%s' % (n, kinds))
            stars = pg.locator('.k-celebrate .k-star').count()
            check('level flat15 real-click win 3 stars (0 wrong)', stars == 3, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_sortsize")'))
            s40 = saved['levels'].get('4-0', {}).get('stars', 0)
            check('save levels["4-0"].stars >= 1 (actual 3)', s40 >= 1, 'stars=%s' % s40)
            snd_events.append(('2d', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2e. 生成关种档触达：lim 扩后 flat20 自动起 + nextHint 实算 + 全链通关写 5-0 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(20), bonus=30))
            pg = ctx.new_page(); watch(pg, '2e')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.SO && SO.currentLevel', timeout=8000)
            pg.wait_for_timeout(2000)
            lim = pg.evaluate('KIDS.calendar.limit(Infinity)')
            check('seeded save (firstDay -3d + bonus30) -> limit>=21 (reaches gen flat20)',
                  lim >= 21, 'lim=%s' % lim)
            lv = pg.evaluate('SO.currentLevel')
            check('auto-start at flat=20 gen level (ch=5, dch in 1-4)',
                  lv and lv['flat'] == 20 and lv['ch'] == 5 and 1 <= lv['dch'] <= 4, str(lv))
            check('gen nextHint(20) = GEN_HINTS[genLevel(21).dch-1] (family F real calc)',
                  pg.evaluate('nextHint(20) === GEN_HINTS[genLevel(21).dch - 1]'))
            n, kinds = play_level_real(pg)
            check('gen level 20 real-click full chain win (5 quizzes -> celebrate)',
                  n == CH_LEN, 'quizzes=%d kinds=%s' % (n, sorted(set(kinds))))
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_sortsize")'))
            check('gen level saved under ch5 key "5-0"', '5-0' in saved['levels'],
                  str(list(saved['levels'])[-4:]))
            snd_events.append(('2e', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2f/P1b. 双 viewport × 四章型 + 槽宽通道等价 + 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(5)), vp=vp)
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                pg.evaluate(STUB_SND)
                pg.wait_for_function('window.SO && SO.currentLevel', timeout=8000)
                pg.wait_for_timeout(1200)            # 入场动画落定
                if vp[0] == 800:
                    check('P1b real portrait viewport (800x1180 -> @media channel active)',
                          pg.evaluate('window.innerHeight > window.innerWidth'))
                for tag, flat in [('ch1-sort', 0), ('ch2-close7', 3), ('ch3-dual', 10), ('ch4-ord', 15)]:
                    pg.evaluate('(f) => startLevel(f)', flat)
                    pg.wait_for_timeout(1200)
                    m = pg.evaluate(r'''() => {
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;   /* core 家长退出钮全家族豁免 */
                        if (e.offsetWidth > 4 && e.offsetHeight > 4 && (e.offsetWidth < 64 || e.offsetHeight < 64))
                          bad.push((e.id || e.className) + ':' + e.offsetWidth + 'x' + e.offsetHeight);
                      });
                      const cards = [...document.querySelectorAll('#board .card')];
                      const slot = document.querySelector('#strip .slot');
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad, cards: cards.length,
                              cMin: cards.length ? Math.min(...cards.map(c => Math.min(c.offsetWidth, c.offsetHeight))) : 0,
                              slotW: slot ? slot.offsetWidth : 0, slotN: document.querySelectorAll('#strip .slot').length,
                              kind: SO.quiz.kind};
                    }''')
                    want_slots = 1 if m['kind'] == 'ord' else m['cards']
                    check('%s %s overflowX==0 + cards>=96 + buttons>=64 + slots=%d' %
                          ('P1b' if vp[0] == 800 else 'vp', tag, want_slots),
                          m['ox'] == 0 and m['cards'] in (6, 7) and m['cMin'] >= 96 and
                          not m['bad'] and m['slotN'] == want_slots,
                          'ox=%s cards=%s cMin=%s bad=%s slotN=%s kind=%s' %
                          (m['ox'], m['cards'], m['cMin'], m['bad'][:2], m['slotN'], m['kind']))
                    # 槽宽通道等价：横 84 / body.port 类 76 / 真竖 76（ord 单槽 110/96）
                    if vp[0] == 1280:
                        w_live = m['slotW']
                        w_port = pg.evaluate('''() => {
                          document.body.classList.add('port');
                          const w = document.querySelector('#strip .slot').offsetWidth;
                          document.body.classList.remove('port');
                          return w;
                        }''')
                        expect_live, expect_port = (110, 96) if m['kind'] == 'ord' else (84, 76)
                        check('vp %s slot width %d + body.port channel -> %d (PORT-CLS live)' %
                              (tag, expect_live, expect_port),
                              abs(w_live - expect_live) <= 2 and abs(w_port - expect_port) <= 2,
                              'live=%s portCls=%s' % (w_live, w_port))
                    else:
                        expect_port = 96 if m['kind'] == 'ord' else 76
                        check('P1b %s slot width %d (real @media == body.port channel)' % (tag, expect_port),
                              abs(m['slotW'] - expect_port) <= 2, 'slotW=%s' % m['slotW'])
                    shot = SHOTS / ('sortsize-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot, floor=10.0)
                    check('screenshot %s %dx%d non-blank (stdev>10)' % (tag, vp[0], vp[1]), ok, detail)
                snd_events.append(('vp%d' % vp[0], pg.evaluate('window.__sndLog.length')))
                ctx.close()

            # ---- 2g. 存量档兼容三例（键基不变等价，SPEC §-r19 §7）----
            old_full = dict({'%d-%d' % (c, l): {'stars': 3, 'plays': 2} for c in range(1, 5)
                             for l in range(CH_LEN)})
            gen_save = dict({'1-%d' % l: {'stars': 3, 'plays': 1} for l in range(CH_LEN)},
                            **{'5-0': {'stars': 3, 'plays': 1}})
            dirty = {'1-9': {'stars': 3, 'plays': 1}}
            for tag, seed, want_flat in [('old-full', old_full, None),
                                         ('gen-key', gen_save, 5),
                                         ('dirty-1-9', dirty, 0)]:
                ctx = new_ctx(browser, compat_seed_js(seed))
                pg = ctx.new_page(); watch(pg, '2g-' + tag)
                pg.goto(URL)
                pg.evaluate(STUB_SND)
                pg.wait_for_function('window.SO && SO.currentLevel', timeout=8000)
                pg.wait_for_timeout(900)
                kept = pg.evaluate(
                    "(function(){var s=JSON.parse(localStorage.getItem('kidsgame_sortsize')||'{}');"
                    "return s && s.levels ? Object.keys(s.levels).length : -1;})()")
                check('compat %s: save kept intact (no reset — keybase unchanged)' % tag,
                      kept == len(seed), 'kept=%s want=%d' % (kept, len(seed)))
                if want_flat is not None:
                    lv = pg.evaluate('SO.currentLevel')
                    check('compat %s: starts at flat=%d (dirty key harmless)' % (tag, want_flat),
                          lv and lv['flat'] == want_flat, str(lv))
                else:
                    dayend = pg.evaluate("!!document.querySelector('.k-dayend')")
                    check('compat old-full: today done -> dayEnd panel (not a reset)', dayend, '')
                snd_events.append(('2g-' + tag, pg.evaluate('window.__sndLog.length')))
                ctx.close()

            # ---- S1. sayW 行为级（flat3）：窗设/吞/force/节流静默不设窗/节流过期；flat0 对照 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3)))
            pg = ctx.new_page(); watch(pg, 'S1')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.SO && SO.currentLevel', timeout=8000)
            check('S1 starts at flat=3 (>=3, throttle tier)', pg.evaluate('SO.currentLevel.flat') == 3)
            pg.wait_for_timeout(2500)                # 开场链落完再挂钩
            wrong_plays = hook_wrong_plays(pg)
            t0 = time.time()
            # 绝对时间调度：sayW 锚=各 tap 内 sayW 调用时刻（tap 发起后同步判定）；
            # 每次 wrong tap 承诺内含 480ms 演出锁窗才 resolve——固定 sleep 会漂过锚点，必须按表走
            r1 = pg.evaluate('(i) => SO.tapCard(i)', wrong_idx(pg))   # t0+0.1 错#1：播+设窗(4350)
            pg.wait_for_timeout(800)
            st1 = {'r1': r1, 'miss': pg.evaluate('SO.quiz.miss'), 'plays': wrong_plays()}
            r2 = pg.evaluate('(i) => SO.tapCard(i)', wrong_idx(pg))   # t0+1.0 窗内二错：吞
            st2 = {'r2': r2, 'miss': pg.evaluate('SO.quiz.miss'), 'plays': wrong_plays()}
            check('S1 state1: wrong#1 plays + sets window (in-window tap#2 swallowed, miss stays 1)',
                  st1['r1'] == 'wrong' and st1['miss'] == 1 and st1['plays'] == 1 and
                  r2 is False and st2['miss'] == 1 and st2['plays'] == 1, '%s %s' % (st1, st2))
            time.sleep(max(0, (WRONG_CHAIN_WIN + 1000 + 300) / 1000.0 - (time.time() - t0)))
            r3 = pg.evaluate('(i) => SO.tapCard(i)', wrong_idx(pg))   # t0+5.7 窗过+节流内：miss==2 force 播+设窗
            pg.wait_for_timeout(800)
            st3 = {'r3': r3, 'miss': pg.evaluate('SO.quiz.miss'), 'plays': wrong_plays()}
            r4 = pg.evaluate('(i) => SO.tapCard(i)', wrong_idx(pg))   # t0+6.6 窗内：吞
            st4 = {'r4': r4, 'miss': pg.evaluate('SO.quiz.miss'), 'plays': wrong_plays()}
            check('S1 state2: force on miss==2 plays within throttle + window re-set (tap#4 swallowed)',
                  st3['r3'] == 'wrong' and st3['miss'] == 2 and st3['plays'] == 2 and
                  r4 is False and st4['miss'] == 2 and st4['plays'] == 2, '%s %s' % (st3, st4))
            time.sleep(max(0, (5700 + WRONG_CHAIN_WIN + 900) / 1000.0 - (time.time() - t0)))
            r5 = pg.evaluate('(i) => SO.tapCard(i)', wrong_idx(pg))   # t0+11.0 窗#2 过（锚=tap#3=t0+5.7+4.35）+节流内：miss==3 无 force 静默不设窗
            pg.wait_for_timeout(800)
            st5 = {'r5': r5, 'miss': pg.evaluate('SO.quiz.miss'), 'plays': wrong_plays()}
            r6 = pg.evaluate('(i) => SO.tapCard(i)', wrong_idx(pg))   # t0+11.9 无窗实证：不被吞
            st6 = {'r6': r6, 'miss': pg.evaluate('SO.quiz.miss'), 'plays': wrong_plays()}
            check('S1 state3: throttle silence (no force) -> no window set (tap#6 NOT swallowed, miss grows)',
                  st5['r5'] == 'wrong' and st5['miss'] == 3 and st5['plays'] == 2 and
                  st6['r6'] == 'wrong' and st6['miss'] == 4 and st6['plays'] == 2, '%s %s' % (st5, st6))
            # 节流锚=force 播时刻（t0+5.7）→ t0+15.7 过期
            time.sleep(max(0, (5700 + SAYW_THROTTLE + 700) / 1000.0 - (time.time() - t0)))
            r7 = pg.evaluate('(i) => SO.tapCard(i)', wrong_idx(pg))   # t0+16.7 节流过：重播+设窗
            pg.wait_for_timeout(800)
            st7 = {'r7': r7, 'miss': pg.evaluate('SO.quiz.miss'), 'plays': wrong_plays()}
            r8 = pg.evaluate('(i) => SO.tapCard(i)', wrong_idx(pg))   # t0+17.6 窗内：吞
            st8 = {'r8': r8, 'miss': pg.evaluate('SO.quiz.miss'), 'plays': wrong_plays()}
            check('S1 state4: 10s throttle expiry -> replays + window (tap#8 swallowed)',
                  st7['r7'] == 'wrong' and st7['miss'] == 5 and st7['plays'] == 3 and
                  r8 is False and st8['miss'] == 5, '%s %s' % (st7, st8))
            # flat<3 对照：无节流（5.6s 间隔两错均播——第二错虽 miss==2 但 flat0 本就每错必播）
            pg.evaluate('startLevel(0)')
            pg.wait_for_timeout(2000)
            wrong_plays0 = hook_wrong_plays(pg)
            pg.evaluate('(i) => SO.tapCard(i)', wrong_idx(pg))
            pg.wait_for_timeout(int(WRONG_CHAIN_WIN + 1000 + 300))    # >窗，远 <10s
            pg.evaluate('(i) => SO.tapCard(i)', wrong_idx(pg))
            pg.wait_for_timeout(900)
            m0 = pg.evaluate('SO.quiz.miss')
            c0 = wrong_plays0()
            check('S1 control flat0 (<3): no 10s throttle (two wrongs 5.7s apart both play)',
                  m0 == 2 and c0 == 2, 'miss=%s plays=%s' % (m0, c0))
            snd_events.append(('S1', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- S2. 救援双锚（flat3）：错点只设链窗 → 14s 方向级（题面链+chip pulse 无 breathe）
            #      → 30s 答案级（应点卡 breathe）；错点不重置 30s 锚 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3)))
            pg = ctx.new_page(); watch(pg, 'S2')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.SO && SO.currentLevel', timeout=8000)
            pg.wait_for_timeout(2500)                # 开场链落完再挂钩（lastAct≈页面启动）
            pg.evaluate("""() => {
              window.__qlog = [];
              KIDS.voice.queue = parts => window.__qlog.push((parts || []).map(p => typeof p === 'string' ? p : (p && p.key)));
            }""")
            rescue_cnt = lambda: pg.evaluate(
                "(window.__qlog || []).filter(a => a.length === 1 && String(a[0]).indexOf('sor_q_') === 0).length")
            t0 = time.time()
            pg.evaluate('(i) => SO.tapCard(i)', wrong_idx(pg))   # t≈0.3 错点一次（设 4.35s 链窗——不该重置 30s 锚）
            time.sleep(6.0)                          # 等链窗过（救援 interval 恢复扫描）
            early = rescue_cnt()
            check('S2 rescue not fired before 14s idle (wrong tap set chain window only)',
                  early == 0, 'early=%s' % early)
            try:
                pg.wait_for_function(
                    "() => (window.__qlog || []).filter(a => a.length === 1 && String(a[0]).indexOf('sor_q_') === 0).length >= 1",
                    timeout=18000)                   # 方向级 ~14s（锚=启动，早于 t0）
            except Exception:
                pass
            dir_st = pg.evaluate(r'''() => ({
                rescues: window.__qlog.filter(a => a.length === 1 && String(a[0]).indexOf('sor_q_') === 0).length,
                pulse: document.getElementById('prompt-chip').classList.contains('pulse'),
                breathe: !!document.querySelector('.card.breathe')})''')
            t_dir = time.time() - t0
            check('S2 direction rescue by idle 14s (re-queue quiz chain + chip pulse, wrong tap NOT resetting anchor)',
                  dir_st['rescues'] >= 1 and dir_st['pulse'] and t_dir < 22,
                  'rescues=%s pulse=%s breathe=%s t=%.1fs' %
                  (dir_st['rescues'], dir_st['pulse'], dir_st['breathe'], t_dir))
            check('S2 direction tier leaks no answer (no .breathe at direction fire)',
                  not dir_st['breathe'], str(dir_st))
            try:                                     # 答案级 ~30s idle：应点卡 breathe
                pg.wait_for_function("!!document.querySelector('.card.breathe')", timeout=22000)
            except Exception:
                pass
            ans_st = pg.evaluate(r'''() => ({
                breathe: !!document.querySelector('.card.breathe'),
                rescues: window.__qlog.filter(a => a.length === 1 && String(a[0]).indexOf('sor_q_') === 0).length})''')
            t_ans = time.time() - t0
            check('S2 answer rescue by idle 30s (answer card breathe appears)',
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
    print('\n==== SELFTEST %d/%d PASS (estMs(10)=%d chain-win=%d modeled0=%d min=%d) ====' %
          (n_ok, len(RESULTS), est_ms(10), WRONG_CHAIN_WIN, SPEC_MODELED_FLAT0, SPEC_MODELED_MIN))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
