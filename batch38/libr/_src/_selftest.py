# -*- coding: utf-8 -*-
"""libr _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程；模板=batch6/words 定稿）
R48（恒四格+维度句去泄漏+ch4 跨维二级题 pick）：
1. ?verify=1 → title=VERIFY PASS + __lbVlog pass==total(12) 无坏单元
2a. 预置存档(跳过教学) flat0：真实 pointer sort 流——错格弹回（.miss 窗内采样+miss=1）
    → 收集全关 5 题 say（row4 小鸡维度句「它住在农场里」去泄漏锚）→ 真实点击通关
    → .k-celebrate 2 星（1 错）→ 推进 flat=1 → 写档 levels['1-0'].stars=2
2b. 全新存档：教学 看→帮→独 真实链路（__lbDemoR='shelved'→help 真实点正确格→
    __lbTutSolo→正式关 flat0 恒四格）→ libr.tutSeen 持久化
2c. flat10（ch3 冲突章）：5 题全维度行（hint!=none、say=去泄漏维度句表）+真实点击通关→flat11
2d. flat15（ch4 pick 章）：盘 DOM（.tray 3 卡+目标格 .target）+真实点干扰卡错击
    （.miss 采样+miss=1）+真实点击 5 题 pick 通关→flat16
2e. 双 viewport(1280x800/800x1180)：格 ≥96/盘卡 ≥96/overflowX==0/截图非空白
3. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
MUTE 静音双保险（r19 红线）：每 context 挂 MUTE_INIT init_script + 种档 sound:false/tts:false/vol:0
答案独立推导（铁律⑦）：sort=shelf.index(卡主题)/pick=盘内唯一属目标格卡下标——THEME 表
本文件独立硬编码，禁读 quiz.answer 当期望源（驱动点击用推导值，断言不抄实现）。
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12+bonus
RESULTS = []

MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed', resume:function(){},
  createOscillator:function(){ return { connect:function(){ return { connect:function(){} }; }, start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){}, linearRampToValueAtTime:function(){} } }; },
  createGain:function(){ return { connect:function(){}, gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} } }; },
  destination:{}, currentTime:0, sampleRate:44100 }; };"""

# 卡主题独立硬编码（SPEC-R48 §R2 卡池——期望源=SPEC，非页面实现）
THEME = {}
for _grp, _th in [
    (['cat', 'dog', 'cow', 'chick', 'goldfish', 'elephant', 'rabbit', 'bird'], 'animal'),
    (['apple', 'carrot', 'bread', 'egg', 'milk', 'banana', 'rice', 'cake'], 'food'),
    (['coat', 'shoe', 'hat', 'skirt', 'glove', 'scarf', 'sock', 'sweater'], 'clothes'),
    (['car', 'bus', 'bike', 'plane', 'ship', 'train', 'ambulance', 'firetruck'], 'vehicle')]:
    for _c in _grp:
        THEME[_c] = _th
DIM2_SAY = {'farm': '它住在农场里', 'eat': '我们能吃它', 'pet': '它是我们的好朋友', 'wear': '天冷了要穿上它'}
NORM_SAY = '它住哪一格呢'


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=30):
    save = {
        'v': '1.0', 'game': 'libr', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0},          # MUTE 双保险之一（r19）
        'restTip': {'day': '', 'shown': 0},
        'libr': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_libr", ' + json.dumps(json.dumps(save)) + ')'


def new_ctx(browser, vp, seed=None):
    """每 context 必挂 MUTE_INIT（r19 双保险之二）+ 可选种档"""
    ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
    ctx.add_init_script(MUTE_INIT)
    if seed:
        ctx.add_init_script(seed)
    return ctx


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
        return n >= 40000, 'PNG %d bytes (PIL 不可用，按体积判定)' % n


def derive_answer(q):
    """答案独立推导（铁律⑦：从 SPEC 主题表推，禁读 q['answer'] 当期望）"""
    if q['kind'] == 'pick':
        return next(i for i, c in enumerate(q['cards']) if THEME[c] == q['target'])
    return q['shelf'].index(THEME[q['card']])


def unlocked_js():
    return '!state.locked && !state.demo && Date.now() >= (state.showUntil || 0)'


def wait_quiz(pg, step, timeout=30000):
    """等第 step 题开题且解锁（presentQuiz 演出锁过）"""
    pg.wait_for_function(
        '() => { const q = window.LB.quiz; return q && q.step === %d && %s; }' % (step, unlocked_js()),
        timeout=timeout)


def real_click(pg, sel):
    box = pg.locator(sel).bounding_box()
    pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def tap_quiz(pg, q):
    """真实 pointer 点当前题答案体（sort=格/pick=卡，独立推导下标）"""
    i = derive_answer(q)
    real_click(pg, '.tray-card[data-i="%d"]' % i if q['kind'] == 'pick'
               else '.shelf-slot[data-i="%d"]' % i)


def play_win(pg, collect=None, timeout=90000):
    """真实点击点完当前关 5 题（题序 0-4；每题等开题解锁→推导→真实点击）"""
    t0 = time.time()
    for step in range(5):
        wait_quiz(pg, step, timeout=max(5000, int(timeout - (time.time() - t0) * 1000)))
        q = pg.evaluate('window.LB.quiz')
        if collect is not None:
            collect.append(q)
        tap_quiz(pg, q)
        pg.wait_for_timeout(300)      # 演出锁起（错击采样窗在调用方做）
    pg.wait_for_selector('.k-celebrate', timeout=20000)


def main():
    offline_bad = []
    page_errors = []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            # ---- 1. verify=1 ----
            ctx = new_ctx(browser, (1280, 800))
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=180000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = pg.evaluate('window.__lbVlog')
            bad = [k for k, u in vj['units'].items() if not u.get('ok')]
            check('verify 12/12 units, no bad', vj['pass'] == vj['total'] == 12 and not bad,
                  'pass=%s/%s bad=%s' % (vj['pass'], vj['total'], bad))
            ctx.close()

            # ---- 2a. 预置存档 flat0：真实 sort 流 + 错格弹回 + 维度句 + 2 星通关 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.LB && window.LB.currentLevel', timeout=8000)
            lv = pg.evaluate('window.LB.currentLevel')
            check('start at flat0 (ch1)', lv and lv['flat'] == 0 and lv['ch'] == 1, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('window.LB.tutorial') == 'none')
            wait_quiz(pg, 0)
            q1 = pg.evaluate('window.LB.quiz')
            check('q0 anchor: cat/none/普通句 + 恒四格（R48）',
                  q1['kind'] == 'sort' and q1['card'] == 'cat' and q1['hint'] == 'none'
                  and q1['say'] == NORM_SAY and len(q1['shelf']) == 4, str(q1)[:120])
            # 错格真实点击：.miss 窗内采样（BOUNCE_MS=1100 真时钟）+ miss=1 + say 播报史
            bad_i = next(i for i in range(4) if i != derive_answer(q1))
            real_click(pg, '.shelf-slot[data-i="%d"]' % bad_i)
            pg.wait_for_timeout(400)   # 弹回窗内（1100ms 前）采样
            wig = pg.evaluate('!!document.querySelector(".shelf-slot[data-i=\\"%d\\"].miss")' % bad_i)
            pg.wait_for_function('!state.locked', timeout=8000)
            miss1 = pg.evaluate('window.LB.quiz.miss')
            check('wrong slot: .miss wiggle + miss=1 (real clock)', wig and miss1 == 1,
                  'wig=%s miss=%s' % (wig, miss1))
            qsays = []
            play_win(pg, collect=qsays)
            check('flat0 say set: 4 普通句+row4 维度句去泄漏「它住在农场里」',
                  sorted(q['say'] for q in qsays) ==
                  sorted([NORM_SAY] * 4 + [DIM2_SAY['farm']]),
                  str([q['say'] for q in qsays]))
            check('flat0 all sort + shelf 4 + answer 独立推导一致',
                  all(q['kind'] == 'sort' and len(q['shelf']) == 4
                      and q['answer'] == derive_answer(q) for q in qsays))
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 miss)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_function('window.LB.currentLevel && window.LB.currentLevel.flat === 1',
                                 timeout=15000)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_libr")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看→帮→独 真实链路 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=False))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function("window.LB && window.LB.currentLevel && window.__lbDemoR === 'shelved'"
                                 " && window.LB.tutorial === 'help'", timeout=60000)
            wait_quiz(pg, 0, timeout=30000)
            qt = pg.evaluate('window.LB.quiz')
            check('tutorial mini level: 2-slot 降坡锚（教学恒两格）+ row0 小猫',
                  qt['card'] == 'cat' and len(qt['shelf']) == 2 and qt['kind'] == 'sort',
                  str(qt)[:100])
            tap_quiz(pg, qt)                       # 真实点正确格 → 帮→独 → 进正式关
            pg.wait_for_function("window.__lbTutSolo === true && window.LB.currentLevel"
                                 " && window.LB.currentLevel.flat === 0", timeout=20000)
            q0 = pg.evaluate('window.LB.quiz')
            check('after solo: 正式关 flat0 恒四格（教学两格→正式四格坡度）',
                  q0 and len(q0['shelf']) == 4, str(q0)[:100])
            res = pg.evaluate('window.LB.autoSolve()')   # 剩余 5 题钩子通关（真实点击覆盖在 2a/2c/2d）
            pg.wait_for_function(
                "() => { const s = JSON.parse(localStorage.getItem('kidsgame_libr') || 'null');"
                " return !!(s && s.levels && s.levels['1-0']); }", timeout=30000)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_libr")'))
            check('tut chain: autoSolve done + libr.tutSeen persisted + 1-0 3 星',
                  res['done'] and res['taps'] == 5 and
                  (saved.get('libr') or {}).get('tutSeen') is True and
                  saved['levels']['1-0']['stars'] == 3,
                  'res=%s tutSeen=%s' % (res, saved.get('libr')))
            ctx.close()

            # ---- 2c. flat10（ch3 冲突章）：全维度行+真实通关 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, done_flats=range(10)))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.LB && window.LB.currentLevel', timeout=8000)
            lv = pg.evaluate('window.LB.currentLevel')
            check('ch3 conflict level start at flat=10', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            qs = []
            play_win(pg, collect=qs)
            check('ch3: 5 题全维度行（hint!=none，say=去泄漏维度句表）',
                  all(q['kind'] == 'sort' and q['hint'] in DIM2_SAY and
                      q['say'] == DIM2_SAY[q['hint']] for q in qs) and len(qs) == 5,
                  str([(q['hint'], q['say']) for q in qs]))
            check('ch3 维度行 answer=定约格（DIM2_TARGET 独立推导）',
                  all(q['answer'] == q['shelf'].index(
                      {'farm': 'animal', 'eat': 'food', 'pet': 'animal', 'wear': 'clothes'}[q['hint']])
                      for q in qs))
            pg.wait_for_function('window.LB.currentLevel && window.LB.currentLevel.flat === 11',
                                 timeout=15000)
            ctx.close()

            # ---- 2d. flat15（ch4 pick 章）：盘 DOM+干扰卡错击+真实通关 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, done_flats=range(15)))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.LB && window.LB.currentLevel', timeout=8000)
            lv = pg.evaluate('window.LB.currentLevel')
            check('ch4 pick level start at flat=15', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            wait_quiz(pg, 0, timeout=20000)
            qp = pg.evaluate('window.LB.quiz')
            check('pick quiz shape: kind/target/3 卡盘',
                  qp['kind'] == 'pick' and qp['target'] in ('animal', 'food', 'clothes', 'vehicle') and
                  len(qp['cards']) == 3, str(qp)[:120])
            dom = pg.evaluate('''() => ({
              tray: document.getElementById('card-big').classList.contains('tray'),
              n: document.querySelectorAll('.tray-card').length,
              tgt: !!document.querySelector('.shelf-slot.target') })''')
            check('pick DOM: .tray 盘 3 卡 + 目标格 .target 恒亮', dom['tray'] and dom['n'] == 3 and dom['tgt'], str(dom))
            # 干扰卡真实错击：.miss 采样 + miss=1（豁免窗 4170 真时钟；窗内正确卡放行）
            ans_i = derive_answer(qp)
            bad_i = next(i for i in range(3) if i != ans_i)
            real_click(pg, '.tray-card[data-i="%d"]' % bad_i)
            pg.wait_for_timeout(400)
            wig = pg.evaluate('!!document.querySelector(".tray-card[data-i=\\"%d\\"].miss")' % bad_i)
            pg.wait_for_function('!state.locked', timeout=8000)
            check('wrong tray card: .miss wiggle + miss=1', wig and pg.evaluate('window.LB.quiz.miss') == 1,
                  'wig=%s' % wig)
            qs = []
            play_win(pg, collect=qs, timeout=120000)
            check('ch4: 5 题全 pick + answer=盘内唯一目标卡（独立推导）+ 恰一张属目标格',
                  all(q['kind'] == 'pick' and len(q['cards']) == 3 and
                      q['answer'] == derive_answer(q) and
                      [THEME[c] for c in q['cards']].count(q['target']) == 1 for q in qs) and len(qs) == 5,
                  str([(q['target'], q['cards']) for q in qs]))
            pg.wait_for_function('window.LB.currentLevel && window.LB.currentLevel.flat === 16',
                                 timeout=15000)
            ctx.close()

            # ---- 2e. 双 viewport：格/盘卡 ≥96、overflowX==0、截图非空白（flat15 pick 帧） ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = new_ctx(browser, vp, preset_save(tut_seen=True, done_flats=range(15)))
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                pg.wait_for_function('window.LB && window.LB.currentLevel', timeout=8000)
                wait_quiz(pg, 0, timeout=20000)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const slots = [...document.querySelectorAll('.shelf-slot')].map(b => b.getBoundingClientRect());
                  const tray = [...document.querySelectorAll('.tray-card')].map(b => b.getBoundingClientRect());
                  return { ox: de.scrollWidth - de.clientWidth,
                           slotMin: Math.round(Math.min(...slots.map(r => Math.min(r.width, r.height)))),
                           slotN: slots.length,
                           trayMin: tray.length ? Math.round(Math.min(...tray.map(r => Math.min(r.width, r.height)))) : 0,
                           trayN: tray.length };
                }''')
                check('vp %dx%d overflowX==0 + 格/盘卡 ≥96（恒四格+3 卡盘）' % vp,
                      m['ox'] == 0 and m['slotN'] == 4 and m['trayN'] == 3 and
                      m['slotMin'] >= 96 and m['trayMin'] >= 96, str(m))
                shot = SHOTS / ('libr-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d non-blank (stdev>10)' % vp, ok, detail)
                if ok:
                    shot.unlink()
                ctx.close()
        finally:
            browser.close()

    # ---- 3. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
