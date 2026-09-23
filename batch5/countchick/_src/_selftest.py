# -*- coding: utf-8 -*-
"""countchick _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r19 难度改造（2026-09-18，AUDIT-56 黄款 #7）：量域 11-20（十加几锚）/两群比较/限时快数。
音频纪律三层（最高优先级——测试永不出声）：①INIT_SND context 级接管 speechSynthesis/AudioContext
工厂（data:audio URI 走真元素读 metadata 但实例级封 play/pause——r17 教训：禁整体换 Audio 假工厂）；
②STUB_SND goto 后 stub KIDS.voice.play/say/queue+KIDS.audio.sfx/note+KIDS.speak（typeof KIDS 词法回退，
r18 坑①：core KIDS=顶层 const 不上 window，if(window.KIDS) 恒跳过）；③种档 settings{sound:false,tts:false}。
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 20 静态关/20 生成关审计全绿
   + 专项单元全绿（tapChick+ten/compare/flash/contract/clips/estWin/modeled/scatter/dist）
   + modeled(0)==81765 双钉（JS==python _model_calc 独立复算）
2a. 预置存档 → 真实指针点数角标 + 十加几 chip（第10只「满 10 啦」→「10+1」→重数灭）
    + 首错零惩罚 + 窗内二错吞（pulse 出 retries 不增）→ 真实点击通关 2 星 → 写档 → 推进 flat=1
2b. 全新存档 → 教学 看(真实点击吞+demo)→帮(幽灵手指)→独(首次判对) 真实链路 → chk.tutSeen 持久化
2c. flat10（ch3 两群比较）：tally 双群真实点数 + 小鸭角标 + 通关 3 星 → 推进
2d. flat15（ch4 限时快数）：呈现期真实页遮盖→再看一眼重播（同窗）→真实点击答对→autoSolve 通关
2e. 生成关种档触达（firstDay -3d + bonus30 → lim=42）：flat20 自动起(ch5) + nextHint 生成关实算
    （家族 F 行为级）+ autoSolve 通关写档 5-0
2f. 存档守卫三例：合法旧基保留（键基未变续玩 flat10）/ 脏键 1-9 重置 / 损坏 JSON 重置
P1b. 双 viewport(1280x800/800x1180 真竖)×三章型：overflowX==0、按钮≥48（家长钮豁免）、答案 ≥96、
    竖屏通道等价（真竖 150 == body.port 类 150 == 横 132 切换）、截图像素非空白
S1. sayW 三态（flat3 count）：错#1 起播设窗（窗内二错吞）/ 节流内不播不设窗（窗后错照计全量）/
    10s 后重播；flat0 对照：无节流（6.2s 间隔两错均播）
S2. 救援双锚（flat3）：14s 方向级（动物 pulse 无 .opt pulse 不泄答案）→ 30s 答案级（.opt pulse）
6. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror + __sndLog==0（零发声事件；教学重置例不计）
"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _model_calc as MC          # 独立于 JS 的模型复算（SPEC §-r19 §4 双钉另一方）

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex=4 → cap2 → 6*2+bonus
RESULTS = []
CH_LEN = 5
est_ms = lambda n: n * 345 + 600          # 家族 T 全字符口径四方之一（data/verify/build/_selftest 同步）
MODELED_MIN = 81765                       # §-r19 §4：modeled(0)（与 verify SPEC_MODELED_MIN 双钉一致）
MODELED_GLOBAL_MIN = 56840                # 0-39 全域最小（flat18 flash 关无点数链）
WRONG_WIN_COUNT = est_ms(7) + 450         # 3465：count 错链豁免窗（S1 时序推导源）
SAYW_THROTTLE = 10000                     # 语义句 10s 节流（S1 时序推导源）
assert WRONG_WIN_COUNT == 3465 and est_ms(9) + 450 == 4155 and est_ms(11) + 450 == 4845
assert MC.modeled(0) == MODELED_MIN, 'python 独立复算 modeled(0) != 81765（SPEC/实现漂移）'

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

# ---- 音频纪律 ②：goto 后 stub KIDS 发声 API（r18 坑①：词法回退禁 if(window.KIDS)）----
STUB_SND = r"""
(() => {
  const noop = () => {};
  window.__voiceLog = [];
  if (typeof KIDS !== 'undefined') {   /* core KIDS=顶层 const 词法绑定不上 window（r18 修复闭环） */
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
        'v': '1.0', 'game': 'countchick', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0.0},
        'restTip': {'day': '', 'shown': 0},
        'chk': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // CH_LEN + 1, f % CH_LEN)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_countchick", ' + json.dumps(json.dumps(save)) + ')'


def seed_raw_js(raw):
    """守卫三例专用：直写任意原始存档串（含脏键/损坏 JSON）"""
    return 'localStorage.setItem("kidsgame_countchick", ' + json.dumps(raw) + ')'


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


def tap_all(page, selector):
    """真实 pointer：点选中队列每只动物中心（y 取 0.6 防角标遮挡）"""
    els = page.locator(selector)
    for i in range(els.count()):
        box = els.nth(i).bounding_box()
        page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] * 0.6)
        page.wait_for_timeout(60)


def quiz_of(page):
    return page.evaluate('CHK.quiz')


def play_level(page, first_wrong=False):
    """真实点击打完当前关：每题点满两群角标→（首题可选先错一次）→点正确答案"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = quiz_of(page)
        if q is None:
            break
        if q['type'] != 'flash':
            tap_all(page, '.animal[data-k="c"]')
            if q['type'] == 'compare':
                tap_all(page, '.animal[data-k="d"]')
        else:
            page.wait_for_function('!CHK.quiz.flashing', timeout=12000)
        if not wrong_done:
            widx = next(i for i, v in enumerate(q['items']) if i != q['answerIdx'])
            page.click('.opt[data-i="%d"]' % widx)
            page.wait_for_timeout(700)
            grayed = page.evaluate('!!document.querySelector(".opt[data-i=\\"%d\\"].wrong")' % widx)
            pulsed = page.evaluate('!!document.querySelector(".opt[data-i=\\"%d\\"].pulse")' % q['answerIdx'])
            check('wrong pick: shake+gray / no pulse on correct (zero penalty)', grayed and not pulsed,
                  'grayed=%s pulsed=%s' % (grayed, pulsed))
            wrong_done = True
            continue
        page.click('.opt[data-i="%d"]' % q['answerIdx'])
        answered += 1
        page.wait_for_timeout(1150)              # > 答对推进窗口 880ms
    page.wait_for_selector('.k-celebrate', timeout=15000)
    return answered


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
            check('verify gen levels flat20-39 all ok',
                  len(vj['gen']) == 20 and all(v['ok'] for v in vj['gen'].values()),
                  str({k: v['dch'] for k, v in list(vj['gen'].items())[:6]}))
            check('verify units all ok (tapChick+ten/compare/flash/contract/clips/estWin/modeled/scatter/dist)',
                  all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify layout sims 6/6 (3 flats x 2 viewports)',
                  len(vj['smokes']['layout']['sims']) == 6 and
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str([s for s in vj['smokes']['layout']['sims'] if not s['pass']])[:160])
            md = vj['units']['modeled']
            check('duration model r19: modeled(0)=81765 == python MC (dual pin), global min 56840',
                  md['ok'] and md['flat0'] == MODELED_MIN and md['min'] == MODELED_GLOBAL_MIN and
                  MC.modeled(0) == MODELED_MIN, 'flat0=%s min=%s py=%s' % (md['flat0'], md['min'], MC.modeled(0)))
            snd_events.append(('verify', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2a. 预置存档：角标+十加几 chip+错链吞+真实通关（2 星）+写档+推进 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.CHK && CHK.currentLevel', timeout=8000)
            lv = pg.evaluate('CHK.currentLevel')
            q = quiz_of(pg)
            check('start at flat0 ch1 (count 11-14)', lv and lv['ch'] == 1 and q['type'] == 'count' and
                  11 <= q['n'] <= 14, 'n=%s' % (q and q['n']))
            check('tutorial skipped (preset)', pg.evaluate('CHK.tutorial') == 'none')
            # 真实点数：角标逐只 + 第 10 只出「满 10 啦」+ 第 11 只「10 + 1」
            els = pg.locator('.animal[data-k="c"]')
            ten_states = []
            for i in range(els.count()):
                box = els.nth(i).bounding_box()
                pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] * 0.6)
                pg.wait_for_timeout(60)
                if i >= 8:
                    ten_states.append(pg.evaluate(
                        '() => ({on: document.getElementById("ten-chip").classList.contains("on"),'
                        ' t: document.getElementById("ten-chip").textContent})'))
            badge_n = pg.evaluate('document.querySelectorAll(".animal .badge.on").length')
            ok_ten = ten_states[0]['on'] is False and ten_states[1]['on'] is True and \
                ten_states[1]['t'] == '满 10 啦' and ten_states[2]['t'] == '10 + 1' and \
                all(s['on'] for s in ten_states[2:])
            check('real pointer taps -> badges 1..n + ten-chip 满10/10+1 (structured ten anchor)',
                  badge_n == q['n'] and ok_ten, 'badges=%s ten=%s' % (badge_n, ten_states[:3]))
            cnt = pg.evaluate('CHK.currentLevel.counted')
            check('counted == n after tapping all', cnt == q['n'], 'counted=%s n=%s' % (cnt, q['n']))
            rc = pg.evaluate('CHK.recount()')
            pg.wait_for_timeout(200)
            left = pg.evaluate('document.querySelectorAll(".badge.on").length')
            ten_off = pg.evaluate('!document.getElementById("ten-chip").classList.contains("on")')
            check('recount clears badges + ten-chip', rc and left == 0 and ten_off, 'left=%s' % left)
            # 首错零惩罚 + 窗内二错吞（pulse 出、retries 不增）
            widx = next(i for i, v in enumerate(q['items']) if i != q['answerIdx'])
            widx2 = next(i for i, v in enumerate(q['items']) if i not in (q['answerIdx'], widx))
            r1 = pg.evaluate('(i) => CHK.pick(i)', widx)
            pg.wait_for_timeout(300)
            r2 = pg.evaluate('(i) => CHK.pick(i)', widx2)
            st = pg.evaluate('''(q) => ({retries: CHK.currentLevel.retries, step: CHK.currentLevel.step,
                pulse: !!document.querySelector('.opt[data-i="' + q.answerIdx + '"].pulse'),
                bump: !!document.querySelector('#answers.bump')})''', q)
            check('first wrong full + in-window 2nd swallowed (pulse hint, retries stay 1)',
                  r1 == 'wrong' and r2 is False and st['retries'] == 1 and st['step'] == 0 and st['pulse'],
                  'r1=%s r2=%s st=%s' % (r1, r2, st))
            pg.wait_for_timeout(int(WRONG_WIN_COUNT - 800))       # 等错链窗过再走 play_level
            n = play_level(pg)                    # 后 4 题直通（wrong_done=True）
            check('answered 5 quizzes by real click (flat0)', n == 5, 'answered=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 retry)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('CHK.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_countchick")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            snd_events.append(('2a', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞)→帮→独 真实链路 ----
            ctx = new_ctx(browser, preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.CHK && CHK.currentLevel', timeout=8000)
            pg.wait_for_function("CHK.tutorial === 'watch'", timeout=5000)
            q = quiz_of(pg)
            sw_hook = pg.evaluate('CHK.pick(0)') is False          # 演示期 hook 输入全吞
            els = pg.locator('.opt[data-i="%d"]' % q['answerIdx'])
            box = els.bounding_box()
            pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)   # 真实点击也吞
            pg.wait_for_timeout(700)
            st = pg.evaluate('''() => ({step: CHK.currentLevel.step, retries: CHK.currentLevel.retries,
                                        tut: CHK.tutorial})''')
            check('tutorial watch swallows input (real click + hook)', sw_hook and st['step'] == 0 and
                  st['retries'] == 0 and st['tut'] == 'watch', str(st))
            pg.wait_for_function("CHK.tutorial === 'help'", timeout=30000)   # 演示≤10s（4 只+答对）
            q2 = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0', q2 and q2['step'] == 0 and
                  q2['counted'] == 0, str(q2 and q2['n']))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> next uncounted chick', ghost_shown)
            n = play_level(pg)                   # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_countchick")'))
            check('chk.tutSeen persisted', (saved.get('chk') or {}).get('tutSeen') is True, str(saved.get('chk')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            snd_events.append(('2b', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2c. flat10（ch3 两群比较）：tally 真实点数 + 通关 3 星 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.CHK && CHK.currentLevel', timeout=8000)
            lv = pg.evaluate('CHK.currentLevel')
            q = quiz_of(pg)
            check('ch3 level start at flat=10 (compare)', lv and lv['flat'] == 10 and q['type'] == 'compare',
                  'type=%s' % (q and q['type']))
            check('compare shape: n>m, diff 1-5, dir valid, answer==diff',
                  q['n'] == q['m'] + q['diff'] and 1 <= q['diff'] <= 5 and q['dir'] in ('more', 'less') and
                  q['answer'] == q['diff'] and q['chicks'] == q['n'] and q['ducks'] == q['m'],
                  'n=%s m=%s diff=%s dir=%s' % (q['n'], q['m'], q['diff'], q['dir']))
            qtext = pg.evaluate('document.querySelector("#prompt-chip .big").textContent')
            check('compare question text matches clip closure (多几/少几)',
                  qtext in ('小鸡比小鸭多几只？', '小鸭比小鸡少几只？'), qtext)
            tap_all(pg, '.animal[data-k="c"]')
            tap_all(pg, '.animal[data-k="d"]')
            st = pg.evaluate('''(q) => ({c: document.getElementById('tally-c').textContent,
                d: document.getElementById('tally-d').textContent,
                bc: document.querySelectorAll('.animal[data-k="c"] .badge.on').length,
                bd: document.querySelectorAll('.animal[data-k="d"] .badge.on').length})''', q)
            check('both groups tallied live (tally + per-species badges)', st['c'] == str(q['n']) and
                  st['d'] == str(q['m']) and st['bc'] == q['n'] and st['bd'] == q['m'], str(st))
            n = play_level(pg)
            check('ch3 real-click win (5 quizzes)', n == 5, 'answered=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('ch3 win 3 stars (0 wrong)', stars == 3, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('CHK.currentLevel')
            check('ch3 win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            snd_events.append(('2c', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2d. flat15（ch4 限时快数）：真实页呈现/遮盖/再看一眼/作答 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.CHK && CHK.currentLevel', timeout=8000)
            lv = pg.evaluate('CHK.currentLevel')
            q = quiz_of(pg)
            check('ch4 level start at flat=15 (flash 8-16)', lv and lv['flat'] == 15 and q['type'] == 'flash' and
                  8 <= q['n'] <= 16, 'n=%s' % (q and q['n']))
            check('flash window formula 1200+n*100 + options spaced 3',
                  q['flashMs'] == 1200 + q['n'] * 100 and
                  sorted(q['distractors']) == sorted([q['n'] - 3, q['n'] + 3]),
                  'ms=%s d=%s' % (q['flashMs'], q['distractors']))
            hid = pg.evaluate('''() => new Promise(res => {
              const t0 = Date.now();
              const iv = setInterval(() => {
                const qq = CHK.quiz;
                if (qq && !qq.flashing) {
                  clearInterval(iv);
                  res({fieldHid: document.getElementById('field').classList.contains('hid'),
                       resee: document.getElementById('btn-resee').classList.contains('on'),
                       big: document.querySelector('#prompt-chip .big').textContent,
                       waitMs: Date.now() - t0});
                } else if (Date.now() - t0 > 15000) { clearInterval(iv); res(null); }
              }, 120);
            })''')
            check('flash hides after window (real clock) + resee appears + question swaps',
                  bool(hid) and hid['fieldHid'] and hid['resee'] and hid['big'] == '刚才有几只小鸡？' and
                  hid['waitMs'] >= q['flashMs'] * 0.9, str(hid))
            # 遮盖后真实点击小鸡原坐标：角标零（估计任务禁逐格数）
            els = pg.locator('.animal[data-k="c"]')
            box = els.first.bounding_box()
            pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] * 0.6)
            pg.wait_for_timeout(300)
            no_cnt = pg.evaluate('CHK.quiz.counted === 0 && CHK.quiz.resees === 0')
            check('covered chicks not tappable (no badges, no count)', no_cnt)
            rr = pg.evaluate('CHK.resee()')
            pg.wait_for_function('!CHK.quiz.flashing', timeout=8000)
            resee_st = pg.evaluate('CHK.quiz.resees')
            check('resee replays same window (flash again then hide, resee counted)',
                  rr is True and resee_st == 1 and
                  pg.evaluate("document.getElementById('field').classList.contains('hid')"),
                  'resees=%s' % resee_st)
            els = pg.locator('.opt[data-i="%d"]' % q['answerIdx'])
            box = els.bounding_box()
            pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
            pg.wait_for_function('(s) => CHK.currentLevel.step === s + 1', arg=0, timeout=6000)
            a = pg.evaluate('CHK.autoSolve()')
            lv2 = pg.evaluate('CHK.currentLevel')
            check('flash real-click answer + autoSolve finish (3 stars)',
                  bool(a) and a['done'] and lv2['done'] and lv2['retries'] == 0, str(a))
            snd_events.append(('2d', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2e. 生成关种档触达：lim=42 → flat20 自动起 + nextHint 实算 + 通关写档 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(20), bonus=30))
            pg = ctx.new_page(); watch(pg, '2e')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.CHK && CHK.currentLevel', timeout=8000)
            pg.wait_for_timeout(1500)
            lim = pg.evaluate('KIDS.calendar.limit(Infinity)')
            lv = pg.evaluate('CHK.currentLevel')
            check('seeded save (firstDay -3d + bonus30) -> limit=42 (reaches gen flat20-41)',
                  lim == 42, 'lim=%s' % lim)
            check('auto-start at flat=20 gen level (ch=5, dch=1)',
                  lv and lv['flat'] == 20 and lv['ch'] == 5 and lv['dch'] == 1, str(lv))
            check('gen nextHint(20) = GEN_HINTS[genLevel(21).dch-1] (family F real calc)',
                  pg.evaluate('nextHint(20) === GEN_HINTS[genLevel(21).dch - 1]'))
            a = pg.evaluate('CHK.autoSolve()')
            check('gen level 20 full-chain win (5 quizzes)', bool(a) and a['done'], str(a))
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_countchick")'))
            check('gen level saved under ch5 key "5-0"', '5-0' in saved['levels'],
                  str(list(saved['levels'])[-4:]))
            snd_events.append(('2e', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- 2f. 存档守卫三例（键基未变=兼容 + 脏键/损坏重置）----
            old_base = dict({'1-%d' % l: {'stars': 3, 'plays': 2} for l in range(5)},
                            **{'2-%d' % l: {'stars': 3, 'plays': 1} for l in range(5)})
            dirty = {'1-9': {'stars': 3, 'plays': 1}, '2-0': {'stars': 2, 'plays': 1}}
            # 例1 合法旧基：保留 → 续玩 flat10
            ctx = new_ctx(browser, seed_raw_js(json.dumps(
                {'v': '1.0', 'game': 'countchick', 'firstDay': OLD, 'lastDay': TODAY,
                 'levels': old_base, 'dailyMin': {}, 'bonus': {TODAY: 30},
                 'settings': {'sound': False, 'tts': False, 'vol': 0.0},
                 'restTip': {'day': '', 'shown': 0}, 'chk': {'tutSeen': True}})))
            pg = ctx.new_page(); watch(pg, '2f-keep')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.CHK && CHK.currentLevel', timeout=8000)
            pg.wait_for_timeout(1200)
            kept = pg.evaluate('Object.keys(JSON.parse(localStorage.getItem("kidsgame_countchick")).levels).length')
            lvf = pg.evaluate('CHK.currentLevel.flat')
            check('guard case1: valid old-base save kept (10 keys) + resume at flat=10',
                  kept == 10 and lvf == 10, 'kept=%s flat=%s' % (kept, lvf))
            snd_events.append(('2f-keep', pg.evaluate('window.__sndLog.length')))
            ctx.close()
            # 例2 脏键 1-9（lv>CH_LEN-1）：levels 清空 → 教学重播（fresh 链，sndLog 拦截不出声不计入全局）
            ctx = new_ctx(browser, seed_raw_js(json.dumps(
                {'v': '1.0', 'game': 'countchick', 'firstDay': OLD, 'lastDay': TODAY,
                 'levels': dirty, 'dailyMin': {}, 'bonus': {},
                 'settings': {'sound': False, 'tts': False, 'vol': 0.0},
                 'restTip': {'day': '', 'shown': 0}, 'chk': {'tutSeen': True}})))
            pg = ctx.new_page(); watch(pg, '2f-dirty')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_timeout(900)
            kept2 = pg.evaluate('Object.keys(JSON.parse(localStorage.getItem("kidsgame_countchick")).levels).length')
            check('guard case2: dirty key 1-9 -> levels emptied', kept2 == 0, 'kept=%s' % kept2)
            ctx.close()
            # 例3 损坏 JSON：core 兜底重置（v1.0 空档）
            ctx = new_ctx(browser, seed_raw_js('{broken json!!'))
            pg = ctx.new_page(); watch(pg, '2f-corrupt')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_timeout(900)
            sv3 = pg.evaluate('JSON.parse(localStorage.getItem("kidsgame_countchick") || "{}")')
            check('guard case3: corrupt JSON -> fresh save (v1.0, levels empty)',
                  sv3.get('v') == '1.0' and sv3.get('levels') == {}, str(sv3.get('v')))
            ctx.close()

            # ---- P1b. 双 viewport × 三章型 + 竖屏通道等价 + 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(5), bonus=30), vp=vp)
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                pg.evaluate(STUB_SND)
                pg.wait_for_function('window.CHK && CHK.currentLevel', timeout=8000)
                pg.wait_for_timeout(1000)            # 入场落定
                if vp[0] == 800:
                    check('P1b real portrait viewport (800x1180 -> @media channel active)',
                          pg.evaluate('window.innerHeight > window.innerWidth'))
                for tag, flat in [('ch1-count', 0), ('ch2-mix', 5), ('ch3-compare', 10)]:
                    pg.evaluate('(f) => CHK.start(f)', flat)
                    pg.wait_for_timeout(1100)
                    m = pg.evaluate(r'''() => {
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;   /* core 家长退出钮 44px 全家标准（豁免） */
                        if (e.offsetWidth > 4 && e.offsetHeight > 4 && (e.offsetWidth < 48 || e.offsetHeight < 48))
                          bad.push((e.id || e.className) + ':' + e.offsetWidth + 'x' + e.offsetHeight);
                      });
                      const ans = [...document.querySelectorAll('.opt')].map(b => b.getBoundingClientRect());
                      const animals = [...document.querySelectorAll('.animal')].map(b => {
                        const r = b.getBoundingClientRect();
                        return {x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height};
                      });
                      let minD = 1e9;
                      for (let i = 0; i < animals.length; i++)
                        for (let j = i + 1; j < animals.length; j++) {
                          const d = Math.hypot(animals[i].x - animals[j].x, animals[i].y - animals[j].y);
                          if (d < minD) minD = d;
                        }
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad, animals: animals.length,
                          hitMin: animals.length ? Math.round(Math.min(...animals.map(a => Math.min(a.w, a.h)))) : 0,
                          minD: Math.round(minD),
                          optW: ans.length ? Math.round(Math.min(...ans.map(r => r.width))) : 0,
                          optH: ans.length ? Math.round(Math.min(...ans.map(r => r.height))) : 0};
                    }''')
                    check('%s %s overflowX==0 + buttons>=48 + animals>=64 + dist>=90 + opts>=96' %
                          ('P1b' if vp[0] == 800 else 'vp', tag),
                          m['ox'] == 0 and not m['bad'] and m['hitMin'] >= 64 and m['minD'] >= 90 and
                          m['optW'] >= 96 and m['optH'] >= 96,
                          'ox=%s bad=%s hit=%s d=%s opt=%sx%s' %
                          (m['ox'], m['bad'][:2], m['hitMin'], m['minD'], m['optW'], m['optH']))
                    # 竖屏通道等价：横=132 / 竖(@media 或 body.port)=150（PORT-CLS 双通道）
                    if vp[0] == 1280:
                        w_live = m['optW']
                        w_port = pg.evaluate('''() => {
                          document.body.classList.add('port');
                          const w = document.querySelector('.opt').getBoundingClientRect().width;
                          document.body.classList.remove('port');
                          return Math.round(w);
                        }''')
                        check('vp %s opt width anchor 132 + body.port channel -> 150 (PORT-CLS live)' % tag,
                              abs(w_live - 132) <= 2 and abs(w_port - 150) <= 2,
                              'live=%s portCls=%s' % (w_live, w_port))
                    else:
                        check('P1b %s opt width 150 (real @media == body.port channel)' % tag,
                              abs(m['optW'] - 150) <= 2, 'optW=%s' % m['optW'])
                    shot = SHOTS / ('countchick-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot, floor=10.0)
                    check('screenshot %s %dx%d non-blank (stdev>10)' % (tag, vp[0], vp[1]), ok, detail)
                    if ok: shot.unlink()   # 验毕即删（r19 审查 m4：交付目录不留 _shots 中间产物）
                snd_events.append(('vp%d' % vp[0], pg.evaluate('window.__sndLog.length')))
                ctx.close()

            # ---- S1. sayW 三态（flat3 count）：窗设/窗内吞/节流不播不设窗/10s 后重播 + flat0 对照 ----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'S1')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.CHK && CHK.currentLevel', timeout=8000)
            check('S1 starts at flat=3 (>=3, throttle tier)', pg.evaluate('CHK.currentLevel.flat') == 3)
            pg.wait_for_timeout(2500)                # 开场链落定再挂钩
            q = quiz_of(pg)
            wa = next(i for i, v in enumerate(q['items']) if i != q['answerIdx'])
            wb = next(i for i, v in enumerate(q['items']) if i not in (q['answerIdx'], wa))
            pg.evaluate("window.__plog = []; KIDS.voice.play = (k, t) => window.__plog.push(k);")
            plays = lambda: pg.evaluate("(window.__plog || []).filter(k => k === 'chk_hint').length")
            base = plays()                          # 含开场 hint（若有）
            t0 = time.time()
            r1 = pg.evaluate('(i) => CHK.pick(i)', wa)      # 错#1：起播+设窗
            pg.wait_for_timeout(1300)
            st1 = {'r1': r1, 'plays': plays(), 'retries': pg.evaluate('CHK.currentLevel.retries')}
            r2 = pg.evaluate('(i) => CHK.pick(i)', wb)      # 窗内二错：吞
            st2 = {'r2': r2, 'retries': pg.evaluate('CHK.currentLevel.retries'), 'plays': plays()}
            check('S1 state1: wrong#1 plays chain + sets window (in-window tap#2 swallowed, retries stay 1)',
                  st1['r1'] == 'wrong' and st1['plays'] == base + 1 and r2 is False and
                  st2['retries'] == 1 and st2['plays'] == base + 1, '%s %s' % (st1, st2))
            time.sleep(max(0, (WRONG_WIN_COUNT + 1000 + 500) / 1000.0 - (time.time() - t0)))   # 窗+锁过、节流未到
            r3 = pg.evaluate('(i) => CHK.pick(i)', wb)      # 错#3：节流内不播（wb 已灰 → again？先解一题）
            st3 = {'r3': r3, 'plays': plays(), 'retries': pg.evaluate('CHK.currentLevel.retries')}
            # wb 已在错#1 后灰掉？错#1 用 wa、错#2 吞未入 wrong 表 → wb 仍可全量错
            check('S1 state2: throttle window sayW=false (no replay, full wrong counted)',
                  st3['r3'] == 'wrong' and st3['plays'] == base + 1 and st3['retries'] == 2, str(st3))
            # 窗未设实证：下一错不被吞（wa 已灰→again；改用下一题）
            pg.evaluate('(i) => CHK.pick(i)', q['answerIdx'])
            pg.wait_for_timeout(1400)
            q4 = quiz_of(pg)
            wa4 = next(i for i, v in enumerate(q4['items']) if i != q4['answerIdx'])
            time.sleep(max(0, (100 + SAYW_THROTTLE + 500) / 1000.0 - (time.time() - t0)))   # 距错#1 ≥10s（节流过期）
            r5 = pg.evaluate('(i) => CHK.pick(i)', wa4)     # 错#5：节流过 → 重播
            pg.wait_for_timeout(300)
            st5 = {'r5': r5, 'plays': plays()}
            check('S1 state3: 10s throttle expiry -> chain replays on next-quiz wrong',
                  st5['r5'] == 'wrong' and st5['plays'] == base + 2, str(st5))
            # flat<3 对照：无节流（6.2s 间隔两错均播）
            pg.evaluate('CHK.start(0)')
            pg.wait_for_timeout(2000)
            pg.evaluate("window.__plog = [];")
            q0 = quiz_of(pg)
            w0a = next(i for i, v in enumerate(q0['items']) if i != q0['answerIdx'])
            w0b = next(i for i, v in enumerate(q0['items']) if i not in (q0['answerIdx'], w0a))
            pg.evaluate('(i) => CHK.pick(i)', w0a)
            pg.wait_for_timeout(int(WRONG_WIN_COUNT + 1000 + 700))   # >窗+锁 1s，<10s 节流
            pg.evaluate('(i) => CHK.pick(i)', w0b)
            pg.wait_for_timeout(400)
            m0 = pg.evaluate('(window.__plog || []).filter(k => k === "chk_hint").length')
            check('S1 control flat0 (<3): no 10s throttle (two wrongs 6.2s apart both chain)',
                  m0 == 2, 'plays=%s' % m0)
            snd_events.append(('S1', pg.evaluate('window.__sndLog.length')))
            ctx.close()

            # ---- S2. 救援双锚（flat3 count）：14s 方向级（动物 pulse）→ 30s 答案级（.opt pulse）----
            ctx = new_ctx(browser, preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'S2')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.CHK && CHK.currentLevel', timeout=8000)
            pg.wait_for_timeout(2500)                # 开场链落完再挂钩（lastAct≈页面启动）
            pg.evaluate("window.__plog = []; KIDS.voice.play = (k, t) => window.__plog.push(k);")
            hint_n = lambda: pg.evaluate("(window.__plog || []).filter(k => k === 'chk_hint').length")
            t0 = time.time()
            q = quiz_of(pg)
            wa = next(i for i, v in enumerate(q['items']) if i != q['answerIdx'])
            pg.evaluate('(i) => CHK.pick(i)', wa)    # t≈0.3 错一次（设 3.5s 链窗——不该重置救援锚）
            base_n = hint_n()                        # 开场 hint + 错#1 链
            time.sleep(6.0)                          # 等链窗过（救援 interval 恢复扫描）
            early = hint_n() - base_n
            check('S2 rescue not fired before 14s idle (wrong tap set chain window only)',
                  early == 0, 'early=%s' % early)
            try:
                pg.wait_for_function(
                    "(b) => (window.__plog || []).filter(k => k === 'chk_hint').length >= b + 1",
                    arg=base_n, timeout=18000)       # 方向级 ~14s（锚=启动/错#1 中较晚者）
            except Exception:
                pass
            dir_st = pg.evaluate(r'''() => ({
                plays: (window.__plog || []).filter(k => k === 'chk_hint').length,
                animalPulse: !!document.querySelector('.animal.pulse'),
                optPulse: !!document.querySelector('.opt.pulse')})''')
            t_dir = time.time() - t0
            check('S2 direction rescue by idle 14s (animal pulse + hint voice, wrong tap NOT resetting anchor)',
                  dir_st['plays'] >= base_n + 1 and dir_st['animalPulse'] and t_dir < 24,
                  'plays=%s aPulse=%s t=%.1fs' % (dir_st['plays'], dir_st['animalPulse'], t_dir))
            check('S2 direction tier leaks no answer (no .opt pulse at direction fire)',
                  not dir_st['optPulse'], str(dir_st))
            try:                                     # 答案级 ~30s idle：正确项 pulse
                pg.wait_for_function("!!document.querySelector('.opt.pulse')", timeout=22000)
            except Exception:
                pass
            ans_st = pg.evaluate(r'''() => ({
                optPulse: !!document.querySelector('.opt.pulse'),
                plays: (window.__plog || []).filter(k => k === 'chk_hint').length})''')
            t_ans = time.time() - t0
            check('S2 answer rescue by idle 30s (correct opt pulse appears)',
                  ans_st['optPulse'] and t_ans < 48, 'optPulse=%s t=%.1fs' % (ans_st['optPulse'], t_ans))
            snd_events.append(('S2', pg.evaluate('window.__sndLog.length')))
            ctx.close()
        finally:
            browser.close()

    # ---- 6. 完全离线 + 0 pageerror + 0 发声事件（三层音频纪律实证；教学重置例不计）----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))
    bad_snd = [t for t, n in snd_events if n]
    check('zero sound events across all scenarios (INIT_SND+STUB_SND+sound:false)',
          not bad_snd, str([('ctx', t, n) for t, n in snd_events]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS (estMs(7)=%d count-win=%d modeledMin=%d/%d) ====' %
          (n_ok, len(RESULTS), est_ms(7), WRONG_WIN_COUNT, MODELED_MIN, MODELED_GLOBAL_MIN))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
