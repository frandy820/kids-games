# -*- coding: utf-8 -*-
"""zilearn _selftest — headless playwright 自测（独立 chromium.launch，禁连/禁杀任何浏览器）
P1 ?verify=1 → title=VERIFY PASS + JSON pass==total（含深对账/防泄露键账/救援直驱/双视口 sim）
P2 真实页（SPEED=1 全速演出，MUTE 静音）：
  2a flat0 真实鼠标通关（watch 亮相→听音→词挖空→组词→小测）3 星→写档→推进 flat1
     flat1/flat2 autoSolve（真实 uiPick 通路 taps=7）→ 家长面板识字进度摘要对账
  2b flat13 句子填空关：题面含 ＿ 挖空 + 4 选项 + 通关 → 累计读句账
  2c flat20 生成关：亮相恰 2 新引入字 + autoSolve taps=7 通关
  2d 全新存档：教学 看（亮相+听音演示）→操作（幽灵手指+soft 不计 miss）→独 → tutSeen 持久化
  2e 救援真实页：静置 16s → 方向级重播题面（语音键账）
P3 双 viewport 真实页（1280×800 + 800×1180 独立视口——portrait 媒体查询实测）：
  选项 ≥96、题面/选项物理分离、overflowX==0、截图非空白
P4 完全离线（无 http(s) 请求）+ 全程 0 pageerror
P5 变异测试 ≥3 HIT（改坏产物副本 → verify 必红）
MUTE 静音双保险（r19 红线 + r28 function 版 1500ms ended）：每 context 挂 MUTE_INIT
init_script + 种档 settings sound:false/tts:false/vol:0。"""
import io, json, re, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
CHARS_PY = {c: v['py'] for c, v in json.load(open(HERE / 'chars.json', encoding='utf-8'))['chars'].items()}
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=7)).strftime('%Y-%m-%d')   # dayIndex=8 → ziBase=39 关（r1-m5：2+3+4+6×5）
RESULTS = []

MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ const _a=this; setTimeout(function(){ try { _a.dispatchEvent(new Event('ended')); } catch(e){} }, 1500); return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed',
  resume:function(){},
  createOscillator:function(){ return {
    connect:function(){ return { connect:function(){} }; },
    start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime(){} } }; },
  createGain:function(){ return {
    connect:function(){},
    gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime(){} } }; },
  destination:{}, currentTime:0, sampleRate:44100 }; };"""


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0, fresh=False):
    save = {
        'v': '1.0', 'game': 'zilearn', 'firstDay': TODAY if fresh else OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0},          # MUTE 双保险之二（r19）
        'restTip': {'day': '', 'shown': 0},
        'zi': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_zilearn", ' + json.dumps(json.dumps(save)) + ')'


def new_ctx(browser, vp, seed=None):
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


def wait_quiz(pg, timeout=40000):
    """等 watch 亮相演出走完、点选题面就位（真实页 SPEED=1：5 字×2.8s+余量）"""
    pg.wait_for_function("window.ZIL && ZIL.quiz && ZIL.quiz.kind && ZIL.quiz.kind !== 'watch'", timeout=timeout)


def tap_correct(pg):
    """真实鼠标点当前题正确项（从 ZIL.quiz 目标+CHARS 首词独立推导下标——非引擎答案直读）
    bounding_box 不 auto-wait：题位过渡窗口（反馈演出重绘/换题瞬间）可能 None——短重试。"""
    q = pg.evaluate('''() => {
      const z = ZIL.quiz;
      if (!z || z.kind === 'watch') return null;
      const want = z.kind === 'match' ? CHARS[z.target].words[0][0] : z.target;
      return { kind: z.kind, want: want, idx: z.opts.indexOf(want) };
    }''')
    if q is None or q['idx'] < 0:
        return None, q
    loc = pg.locator('.opt[data-i="%d"]' % q['idx'])
    box = None
    for _ in range(6):
        box = loc.bounding_box()
        if box:
            break
        pg.wait_for_timeout(250)
    if not box:
        return None, q
    pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    return q['idx'], q


def state_key(pg):
    return pg.evaluate('''() => {
      const s = ZIL.currentLevel, q = ZIL.quiz;
      return { step: s.step, round: (q && q.round) || 0, done: s.done };
    }''')


ADVANCED = '''(prev) => {
  const s = ZIL.currentLevel, q = ZIL.quiz;
  const cur = { step: s.step, round: (q && q.round) || 0, done: s.done };
  return cur.done || cur.step > prev.step || (cur.step === prev.step && cur.round > prev.round);
}'''


def tap_and_wait_advance(pg, timeout=15000):
    """点正确项并等 (step,round) 推进——反馈演出窗（~6s）内点击会被演出锁吞掉，
    状态未推进就不计数（真实页全速演出节奏）。返回是否推进。"""
    prev = state_key(pg)
    r = tap_correct(pg)
    if r[0] is None:
        return False
    try:
        pg.wait_for_function(ADVANCED, arg=prev, timeout=timeout)
        return True
    except Exception:
        return False


def play_level_real(pg):
    """真实鼠标答完当前关：每步从 ZIL.quiz 目标+CHARS 首词独立推导正确项，返回 (taps, misses)"""
    wait_quiz(pg)
    taps = 0
    deadline = time.time() + 300
    while time.time() < deadline:
        if state_key(pg)['done']:
            break
        if tap_and_wait_advance(pg):
            taps += 1
        else:
            pg.wait_for_timeout(300)
    pg.wait_for_selector('.k-celebrate', timeout=45000)
    st = pg.evaluate('ZIL.currentLevel')
    return taps, st['misses']


def settle_win(pg, tap_first=True):
    """F1 生字墙（r2）：celebrate 后等墙出现→点首卡断言 zi_ch_<py> 键账→等墙隐藏+winFlow 链落定。
    返回 (wall_shown, card_key_ok)——纯复习关（newChars=[]）wall_shown=False 属正常。"""
    try:
        pg.wait_for_selector('#result-wall:not(.hide)', timeout=8000)
        shown = True
    except Exception:
        shown = False
    key_ok = None
    if shown and tap_first:
        card = pg.locator('.rw-card').first
        zi = card.locator('.rw-zi').inner_text()
        py = CHARS_PY.get(zi, '')
        n0 = pg.evaluate('ZIL._voiceLog.length')
        card.click(timeout=8000, force=True)        # force：卡 rotate 动画致 stable 检测每张耗 3-4s，
        pg.wait_for_timeout(400)                    # 5 张普通 click ≈12s 会撞上墙的 12s 超时兜底
        tail = pg.evaluate('ZIL._voiceLog.slice(%d)' % n0)
        key_ok = any(e[0] == 'p' and e[1] == 'zi_ch_' + py for e in tail) if py else (len(tail) > 0)
        rest = pg.locator('.rw-card')               # 点亮其余卡快速过墙（替代 12s 超时等待）
        for i in range(1, rest.count()):
            rest.nth(i).click(timeout=3000, force=True)
            pg.wait_for_timeout(80)
    if shown:
        pg.wait_for_selector('#result-wall.hide', timeout=22000, state='attached')   # hide 类=hidden 元素，attached 判类不看可见性
    pg.wait_for_timeout(4200)                       # pass 落账+proceed/章末日末弹层窗
    return shown, key_ok


def open_parent_panel(pg):
    pg.click('.k-parentbtn')
    pg.wait_for_selector('.k-panel', timeout=4000)
    txt = pg.locator('.k-panel .box').inner_text()
    m = re.search(r'(\d+)\s*\+\s*(\d+)\s*=\s*\?', txt)
    assert m, '家长门算式未找到: %r' % txt[:80]
    total = str(int(m.group(1)) + int(m.group(2)))
    for d in total:
        pg.locator('.k-numrow button', has_text=d).first.click()
    pg.locator('.k-panel .mbtn', has_text='确定').click()
    pg.wait_for_selector('.k-panel .box h3', timeout=4000)


def main():
    offline_bad, page_errors = [], []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            # ---- P1. verify=1 ----
            ctx = new_ctx(browser, (1280, 800))
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=60000)
            title = pg.title()
            check('P1 verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('P1 verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('P1 50-flat audit (static20+gen30) all ok',
                  all(r['ok'] for r in vj['levels'].values()) and all(r['ok'] for r in vj['gen'].values()),
                  'static=%d gen=%d' % (len(vj['levels']), len(vj['gen'])))
            check('P1 deep SPEC-recompute + antiLeak + rescue + calendar units',
                  all(vj['units'][k]['ok'] for k in ('deep', 'antiLeak', 'rescue', 'autoSolve', 'calendar', 'scriptBlocks', 'coverage')),
                  str({k: vj['units'][k]['ok'] for k in vj['units']}))
            ctx.close()

            # ---- P2a. flat0 真实鼠标通关 + flat1/2 autoSolve + 家长摘要 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.ZIL && ZIL.currentLevel', timeout=8000)
            lv = pg.evaluate('ZIL.currentLevel')
            check('2a start at flat=0 (ch1)', lv and lv['flat'] == 0 and lv['ch'] == 1, str(lv))
            # watch 亮相期：演出锁防误触（选项区隐藏）
            wt = pg.evaluate('ZIL.quiz')
            check('2a qi0 watch stage (5 chars, options hidden)',
                  wt and wt.get('kind') == 'watch' and len(wt.get('chars', [])) == 5 and
                  pg.evaluate("document.getElementById('opts').classList.contains('hide')"),
                  str(wt)[:80])
            # r1-M1 防回归：watch 亮相期象形面板须真有 svg（裸 path 无 wrapper=26 字全空白根因）
            check('2a qi0 picto svg rendered (M1 wrapper)',
                  pg.locator('#w-side svg').count() >= 1,
                  'svg=%d' % pg.locator('#w-side svg').count())
            taps, misses = play_level_real(pg)
            check('2a flat0 real-mouse win: 7 taps, 0 miss, 3 stars',
                  taps == 7 and misses == 0 and pg.locator('.k-celebrate .k-star').count() == 3,
                  'taps=%d misses=%d' % (taps, misses))
            wall_a, wall_key_a = settle_win(pg)
            check('2a F1 result-wall shown after flat0 win', wall_a, 'wall=%s' % wall_a)
            check('2a F1 wall card tap plays zi_ch_<py>', wall_key_a is True, str(wall_key_a))
            lv1 = pg.evaluate('ZIL.currentLevel')
            check('2a proceed to flat=1', lv1 and lv1['flat'] == 1, str(lv1))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_zilearn")'))
            check('2a save 1-0 recorded (3 stars)', saved['levels'].get('1-0', {}).get('stars') == 3,
                  str(saved['levels']))
            for flat in (1, 2):
                r = pg.evaluate('ZIL.autoSolve()')
                pg.wait_for_selector('.k-celebrate', timeout=40000)
                settle_win(pg)                      # r2F1：autoSolve 关也过生字墙（全点快速过）
                st = pg.evaluate('ZIL.currentLevel')
                check('2a flat%d autoSolve taps=7 win (real uiPick path)' % flat,
                      r['done'] and r['taps'] == 7 and st['flat'] == flat + 1,
                      'r=%s next=%s' % (r, st['flat'] if st else None))
            # 家长面板识字摘要（已学 15 字/今日 15/读句 0）
            open_parent_panel(pg)
            ptxt = pg.locator('.k-panel .box').inner_text()
            check('2a parent panel 识字进度 (已学15/今日新15/读句0)',
                  '识字进度' in ptxt and '已学汉字' in ptxt and '15 字' in ptxt and '累计读句' in ptxt and '0 句' in ptxt,
                  re.sub(r'\s+', ' ', ptxt)[:160])
            ctx.close()

            # ---- P2b. flat13 句子填空关 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, done_flats=range(13)))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.ZIL && ZIL.currentLevel', timeout=8000)
            lv = pg.evaluate('ZIL.currentLevel')
            check('2b start at flat=13 (ch3, sentence era)', lv and lv['flat'] == 13, str(lv))
            wait_quiz(pg)
            # 走到句子题位（step 2）：qi1 三轮听音先答完（每步等推进——反馈窗内点击被锁吞）
            walk_taps = 0
            for _ in range(6):
                st = state_key(pg)
                if st['done'] or st['step'] >= 2:
                    break
                if tap_and_wait_advance(pg):
                    walk_taps += 1
            # 引擎 step 已进但 DOM 在反馈窗后才重绘——等句子题面真上屏再断言
            pg.wait_for_function('''() => {
              const t = document.getElementById('q-text');
              return t.classList.contains('sent') && t.textContent.indexOf('＿') >= 0;
            }''', timeout=15000)
            q = pg.evaluate('ZIL.quiz')
            sent_ok = False
            if q and q['kind'] == 'sentence':
                blank = q['display'].count('＿') >= 1
                dom = pg.evaluate('''() => {
                  const t = document.getElementById('q-text');
                  return { text: t.textContent, sent: t.classList.contains('sent'),
                           opts: document.querySelectorAll('.opt').length };
                }''')
                sent_ok = blank and dom['sent'] and dom['opts'] == 4 and '＿' in dom['text'] and q['target'] not in dom['text']
            check('2b sentence quiz: ＿挖空+4 选项+题面不含目标字', sent_ok, str(q)[:110])
            taps, misses = play_level_real(pg)
            check('2b flat13 real win (walk3+play4=7 taps)', walk_taps + taps == 7,
                  'walk=%d play=%d' % (walk_taps, taps))
            settle_win(pg)                                # r2F1：过生字墙+pass 落账（winFlow 异步链）
            open_parent_panel(pg)
            ptxt = pg.locator('.k-panel .box').inner_text()
            check('2b 累计读句=4（flat10-13 已过）', '累计读句' in ptxt and '4 句' in ptxt,
                  re.sub(r'\s+', ' ', ptxt)[:120])
            ctx.close()

            # ---- P2c. flat20 生成关（+2 新字渐进引入） ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, done_flats=range(20)))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.ZIL && ZIL.currentLevel', timeout=8000)
            lv = pg.evaluate('ZIL.currentLevel')
            check('2c start at flat=20 (first gen level)', lv and lv['flat'] == 20 and lv['ch'] == 5, str(lv))
            wt = pg.evaluate('ZIL.quiz')
            check('2c gen watch introduces exactly 2 new chars', wt and wt.get('kind') == 'watch' and len(wt.get('chars', [])) == 2,
                  str(wt)[:80])
            r = pg.evaluate('ZIL.autoSolve()')
            pg.wait_for_selector('.k-celebrate', timeout=40000)
            check('2c flat20 autoSolve taps=7 win', r['done'] and r['taps'] == 7, str(r))
            ctx.close()

            # ---- P2d. 全新存档教学链：看→操作→独 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=False, fresh=True, bonus=4))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.ZIL && ZIL.currentLevel', timeout=8000)
            pg.wait_for_function("ZIL.tutorial === 'turn'", timeout=40000)   # 等演示（亮相+听音点选）走完
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_zilearn")'))
            check('2d tutorial demo done → zi.tutSeen persisted',
                  (saved.get('zi') or {}).get('tutSeen') is True, str(saved.get('zi')))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=5000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('2d tutorial turn ghost → correct option', ghost_shown)
            taps, misses = play_level_real(pg)       # 操作 1 字（soft 不计 miss）→独→通关
            check('2d tutorial level win (7 taps, 0 miss=soft 生效)',
                  taps == 7 and misses == 0 and pg.locator('.k-celebrate .k-star').count() == 3,
                  'taps=%d misses=%d' % (taps, misses))
            settle_win(pg)                                # r2F1：过生字墙+pass 落账（winFlow 异步链）
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_zilearn")'))
            check('2d tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- P2e. 救援真实页：静置 16s → 方向级重播题面 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, done_flats=range(2)))
            pg = ctx.new_page(); watch(pg, '2e')
            pg.goto(URL)
            wait_quiz(pg)
            n0 = pg.evaluate('ZIL._voiceLog.length')
            pg.wait_for_timeout(16500)               # 真实时钟静置（无任何交互）
            log = pg.evaluate('ZIL._voiceLog')
            tail = log[n0:]
            replayed = any(e[0] == 'q' and any(k == 'zi_listen' for k in e[1]) for e in tail) or \
                       any(e == ['p', 'zi_listen'] for e in tail)
            check('2e rescue 14s direction tier replays question voice (real clock)',
                  replayed, str(tail[:4]))
            ctx.close()

            # ---- P3. 双 viewport 真实页（含真竖屏 800×1180——portrait 媒体查询实测） ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = new_ctx(browser, vp, preset_save(tut_seen=True, done_flats=range(3)))
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                wait_quiz(pg)
                pg.wait_for_timeout(600)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const opts = [...document.querySelectorAll('.opt')].map(b => b.getBoundingClientRect());
                  const stage = document.getElementById('stage').getBoundingClientRect();
                  const bad = [];
                  document.querySelectorAll('button').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.className || e.tagName) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  return { ox: de.scrollWidth - de.clientWidth, bad: bad, n: opts.length,
                           optMin: opts.length ? Math.round(Math.min(...opts.map(r => Math.min(r.width, r.height)))) : 0,
                           sep: opts.length ? Math.round(Math.min(...opts.map(r => r.top - stage.bottom))) : -999 };
                }''')
                check('P3 vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('P3 vp %dx%d 4 options ≥96 (portrait media query real)' % vp,
                      m['n'] == 4 and m['optMin'] >= 96, 'n=%d optMin=%d' % (m['n'], m['optMin']))
                check('P3 vp %dx%d stage/opts 物理分离 (gap>0)' % vp, m['sep'] > 0, 'sep=%d' % m['sep'])
                check('P3 vp %dx%d 其他按钮触摸面 ≥64' % vp, not m['bad'], str(m['bad'][:3]))
                shot = SHOTS / ('zilearn-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot)
                check('P3 screenshot %dx%d non-blank' % vp, ok, detail)
                if ok:
                    shot.unlink()
                ctx.close()
        finally:
            browser.close()

    # ---- P4. 离线 + 0 pageerror ----
    check('P4 fully offline (no http(s) at runtime)', not offline_bad, str(offline_bad[:4]))
    check('P4 zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    # ---- P5. 变异测试（改坏产物副本 → verify 必红；≥3 HIT） ----
    src = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    MUTS = [
        ('M1 seed 97→98 (engine only)', 'flat * 7919 + 97', 'flat * 7919 + 98', 1),
        ('M2 ZI_DAY_NEW [2,3,4]→[6,6,6]', 'const ZI_DAY_NEW = [2, 3, 4];', 'const ZI_DAY_NEW = [6, 6, 6];', 0),
        ('M3 review pick flat%len→[0]', 'q4b = rv.length ? rv[flat % rv.length]', 'q4b = rv.length ? rv[0]', 0),
        ('M4 WRONG_CHAIN_WIN 300→100 (window < chain lower bound)',
         'const WRONG_CHAIN_WIN = estMs("不对哦，再想一想") + 300;',
         'const WRONG_CHAIN_WIN = estMs("不对哦，再想一想") + 100;', 0),
    ]
    hits = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for name, old, new, nth in MUTS:
                idx = -1
                pos = -1
                for i in range(nth + 1):
                    pos = src.find(old, pos + 1)
                    assert pos >= 0, '变异锚未找到: %s' % old
                    idx = pos
                mut = src[:idx] + new + src[idx + len(old):]
                mut_path = HERE / ('_r_zi_mut_%s.html' % name.split()[0])
                mut_path.write_text(mut, encoding='utf-8')
                pg = browser.new_page()
                errs_m = []
                pg.on('pageerror', lambda e: errs_m.append(str(e)))
                pg.goto(mut_path.as_uri() + '?verify=1')
                try:
                    pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=45000)
                    t = pg.title()
                except Exception:
                    t = 'TIMEOUT:' + pg.title()
                caught = t.startswith('VERIFY FAIL') or t.startswith('TIMEOUT')
                hits += 1 if caught else 0
                check('P5 %s → verify red' % name, caught,
                      t + (' (pageerror:%d)' % len(errs_m)))
                pg.close()
                mut_path.unlink()
        finally:
            browser.close()
    check('P5 mutation hits ≥3', hits >= 3, 'hits=%d' % hits)

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
