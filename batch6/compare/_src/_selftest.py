# -*- coding: utf-8 -*-
"""compare _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r29 谱（SPEC-R29-COMPARE）：dch1 8 内差1-3+/ / dch2 全数字卡 / dch3 num+tri 三数 / dch4 三模式+near
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 双 viewport sims 全过（含三卡腿）
2a. 预置存档(跳过教学) → 真实 pointer 点物品（角标逐个出现，左右独立）→ 首错(晃+灰+不pulse正确项+零惩罚)
    → 点对符号（飞行+两组被圈）→ 通关 .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(演示期真实点击被吞) →帮→独 真实链路 → cmp.tutSeen 持久化
2c. 章 4 混合（flat15）：三模式+near 在关内出现 + 数字卡上屏 + 点数字卡读数不报错 + 真实点击通关
2d. 章 2 全数字卡（flat5，r29）：5 题全 num + 点卡读数角标 + 真实通关推进 flat6
2e. 章 3 三数比大小（flat10，r29）：tri 三卡真实上屏 + 三卡错选零惩罚 + 真实通关推进 flat11
3. 双 viewport(1280x800/800x1180) 三形态：ch1 实物 / ch2 数字卡 / ch3 tri 三卡——
    overflowX==0、触摸目标 ≥64（家长按钮豁免）、物品/数字卡 ≥64 且不重叠、符号按钮 ≥96
4. 全页截图非空白（PIL 像素 stdev>10）
5. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
MUTE 静音双保险（r19 红线，r28 function 版照抄）：每 context MUTE_INIT init_script +
种档 sound:false/tts:false/vol:0
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12
RESULTS = []

# MUTE 静音双保险（r19 红线；r28 定稿 function 版照抄——任务书内嵌旧版语法错已废）
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
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  createGain:function(){ return {
    connect:function(){},
    gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  destination:{}, currentTime:0, sampleRate:44100
}; };"""


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'compare', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0},          # MUTE 双保险之一（r19）
        'restTip': {'day': '', 'shown': 0},
        'cmp': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_compare", ' + json.dumps(json.dumps(save)) + ')'


def new_ctx(browser, vp, seed=None):
    """每 context 必挂 MUTE_INIT（r19 双保险之二）+ 可选种档（完整 core 字段，防新档重建丢 cmp 款字段）"""
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


def tap_side_items(page, panel_sel, side):
    """真实 pointer 点击：按 data-i 顺序点该侧每个物品中心，断言角标 1..n 逐个出现"""
    els = page.locator(panel_sel + ' .item')
    n = els.count()
    for i in range(n):
        box = els.nth(i).bounding_box()
        page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] * 0.6)
        page.wait_for_timeout(110)
        badge = els.nth(i).locator('.badge').get_attribute('class') or ''
        txt = els.nth(i).locator('.badge').text_content()
        if 'on' not in badge or txt != str(i + 1):
            check('%s item #%d badge=%s' % (side, i + 1, txt), False, badge)
            return False
    return True


def advance(page):
    """页内推进一题（r29 三卡分派）：tri/near → pickPos / 符号题 → pick"""
    q = page.evaluate('CMP.quiz')
    if q['mode'] in ('tri', 'near'):
        return page.evaluate('CMP.pickPos(CMP.quiz.answer)')
    return page.evaluate('CMP.pick(CMP.quiz.answer)')


def play_level(page, first_wrong=False, tri_dom_check=False):
    """真实点击打完当前关：符号题点满两侧物品角标→（首题可选先错一次）→点正确符号；
    r29 三卡题（tri/near）点正确卡（first_wrong 按当前题 mode 分派错选路径）；
    modes_seen 按 step 防重（错选零惩罚不推进，同题重进不重复计数）；tri_dom_check=首个 tri 题做三卡 DOM 断言"""
    wrong_done = not first_wrong
    answered = 0
    last_step = -1
    tri_checked = not tri_dom_check
    modes_seen = {'count': 0, 'num': 0, 'mix': 0, 'tri': 0, 'near': 0}
    numcard_seen = False
    while answered < 30:
        q = page.evaluate('CMP.quiz')
        if q is None:
            break
        if last_step != q['step']:                 # 防重：错选轮同题重进只计一次
            modes_seen[q['mode']] += 1
            last_step = q['step']
        if page.locator('.numcard').count() > 0:
            numcard_seen = True
        if q['mode'] in ('tri', 'near'):
            if not tri_checked:                    # r29 首个 tri：三卡真实上屏 + 符号区置灰 + 题面 chip
                tri_checked = True
                tri_dom = page.evaluate('''() => ({
                  tri: document.querySelectorAll('.group.tri').length,
                  cards: document.querySelectorAll('.group.tri .numcard').length,
                  off: document.getElementById('symbols').classList.contains('off'),
                  chip: (document.querySelector('#prompt-chip .big') || {}).textContent || ''})''')
                check('tri on field: 3 card groups, symbols grayed', tri_dom['tri'] == 3 and
                      tri_dom['cards'] == 3 and tri_dom['off'], str(tri_dom))
                check('tri prompt chip says max/min', '最大' in tri_dom['chip'] or '最小' in tri_dom['chip'],
                      tri_dom['chip'])
            if not wrong_done:                     # r29 三卡错选：晃动+灰掉零惩罚，首错不 pulse 正确卡
                wp = next(i for i in range(3) if i != q['answer'])
                page.click('.group.tri[data-pos="%d"]' % wp)
                page.wait_for_timeout(700)
                grayed = page.evaluate('!!document.querySelector(".group.tri[data-pos=\\"%d\\"].wrong")' % wp)
                pulsed = page.evaluate('!!document.querySelector(".group.tri[data-pos=\\"%d\\"] .numcard.pulse")' % q['answer'])
                check('tri wrong pick: shake+gray / no pulse on correct (zero penalty)', grayed and not pulsed,
                      'grayed=%s pulsed=%s' % (grayed, pulsed))
                wrong_done = True
                continue
            page.click('.group.tri[data-pos="%d"]' % q['answer'])
            answered += 1
            page.wait_for_timeout(1750)            # 980ms 停留 + 渲染窗口（三卡无飞入 470ms）
            continue
        ok_tap = True
        if q['items']['left']:
            ok_tap &= tap_side_items(page, '#g-left', 'L')
        if q['items']['right']:
            ok_tap &= tap_side_items(page, '#g-right', 'R')
        if not ok_tap:
            break
        if not wrong_done:
            wsym = next(s for s in ['>', '<', '='] if s != q['answer'])
            page.click('.sym[data-s="%s"]' % wsym)
            page.wait_for_timeout(700)
            grayed = page.evaluate('!!document.querySelector(".sym[data-s=\\"%s\\"].wrong")' % wsym)
            pulsed = page.evaluate('!!document.querySelector(".sym[data-s=\\"%s\\"].pulse")' % q['answer'])
            check('wrong pick: shake+gray / no pulse on correct (zero penalty)', grayed and not pulsed,
                  'grayed=%s pulsed=%s' % (grayed, pulsed))
            wrong_done = True
            continue
        page.click('.sym[data-s="%s"]' % q['answer'])
        answered += 1
        page.wait_for_timeout(1750)              # > 飞入 470 + 停留 980 + 渲染窗口
    page.wait_for_selector('.k-celebrate', timeout=9000)
    return answered, modes_seen, numcard_seen


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
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=15000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s dist=%s' % (vj['pass'], vj['total'], vj['dist']))
            d = vj['dist']
            sym_n = d['>'] + d['<'] + d['=']
            check("verify dist: r29 exact gt+lt=122/eq=48 + tri=20/near=10",
                  d['>'] + d['<'] == 122 and d['='] == 48 and vj['modes']['tri'] == 20 and
                  vj['modes']['near'] == 10 and 58 <= d['>'] <= 64 and 58 <= d['<'] <= 64,
                  'gt=%d lt=%d eq=%d tri=%d near=%d sym=%d' % (d['>'], d['<'], d['='],
                  vj['modes']['tri'], vj['modes']['near'], sym_n))
            check('verify dual-viewport sims all pass (incl tri legs)',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']) and
                  all(s['pass'] for s in vj['smokes']['layout']['triSims']),
                  str(vj['smokes']['layout']['sims']) + str(vj['smokes']['layout']['triSims']))
            ctx.close()

            # ---- 2a. 预置存档：双侧角标链路 + 错题零惩罚 + 真实点击通关（2 星） ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.CMP && CMP.currentLevel', timeout=8000)
            lv = pg.evaluate('CMP.currentLevel')
            check('start at 1-0 (ch 1-based)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('CMP.tutorial') == 'none')
            ok_l = tap_side_items(pg, '#g-left', 'L')    # 真实 pointer：左右角标独立递增
            ok_r = tap_side_items(pg, '#g-right', 'R')
            check('real pointer taps -> badges 1..n both sides', ok_l and ok_r)
            qn = pg.evaluate('CMP.quiz')
            cl = pg.evaluate('CMP.currentLevel')
            check('countedL/R == n after tapping all', cl['countedL'] == len(qn['items']['left']) and
                  cl['countedR'] == len(qn['items']['right']),
                  'L=%s/%s R=%s/%s' % (cl['countedL'], len(qn['items']['left']),
                                       cl['countedR'], len(qn['items']['right'])))
            rc = pg.evaluate('CMP.recount()')            # 重新数：清零两侧角标
            pg.wait_for_timeout(200)
            badges_left = pg.evaluate('document.querySelectorAll(".badge.on").length')
            check('recount clears badges', rc and badges_left == 0, 'left=%s' % badges_left)
            n, _, _ = play_level(pg, first_wrong=True)
            check('answered 5 quizzes by real click', n == 5, 'answered=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 retry)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)                    # celebrate 收起+写档+推进
            lv2 = pg.evaluate('CMP.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_compare")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(演示吞输入)→帮→独 真实链路 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.CMP && CMP.currentLevel', timeout=8000)
            check('fresh save -> tutorial watch', pg.evaluate('CMP.tutorial') == 'watch')
            q = pg.evaluate('CMP.quiz')
            # 教学吞输入：演示期真实点击正确符号被 locked 门拦下（step 不动、仍 watch）
            pg.click('.sym[data-s="%s"]' % q['answer'])
            pg.wait_for_timeout(600)
            st = pg.evaluate('CMP.currentLevel')
            check('tutorial demo swallows real input (locked)', st['step'] == 0 and
                  pg.evaluate('CMP.tutorial') == 'watch', str(st))
            pg.wait_for_function("CMP.tutorial === 'help'", timeout=30000)  # 等"看"演示完成
            q = pg.evaluate('CMP.quiz')
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and
                  q['countedL'] == 0, str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> next uncounted item', ghost_shown)
            n, _, _ = play_level(pg)                     # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_compare")'))
            check('cmp.tutSeen persisted', (saved.get('cmp') or {}).get('tutSeen') is True, str(saved.get('cmp')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. 章 4 混合（flat15）：三模式+near + 数字卡 + 点数字卡读数 + 真实通关 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.CMP && CMP.currentLevel', timeout=8000)
            lv = pg.evaluate('CMP.currentLevel')
            check('ch4 level start at flat=15', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            # 第一题若为数字卡/三卡：点它读数（不计数零惩罚、不报错）
            if pg.locator('.numcard').count() > 0:
                box = pg.locator('.numcard').first.bounding_box()
                pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
                pg.wait_for_timeout(300)
            st = pg.evaluate('CMP.currentLevel')
            check('tap numcard: readback, no advance (zero penalty)', st['step'] == 0, str(st))
            n, modes, numcard = play_level(pg)
            check('ch4: all three modes + near seen in level',
                  modes['count'] >= 1 and modes['num'] >= 1 and modes['mix'] >= 1 and modes['near'] >= 1,
                  str(modes))
            check('ch4: numcard rendered on field', numcard)
            check('ch4 real-click win', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('CMP.currentLevel')
            check('ch4 win proceeds to flat=16', lv2 and lv2['flat'] == 16, str(lv2))
            ctx.close()

            # ---- 2d. 章 2 全数字卡（flat5，r29）：5 题全 num + 点卡读数角标 + 真实通关 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, done_flats=range(5), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.CMP && CMP.currentLevel', timeout=8000)
            lv = pg.evaluate('CMP.currentLevel')
            check('ch2 level start at flat=5 (dch=2)', lv and lv['flat'] == 5 and lv['dch'] == 2, str(lv))
            check('ch2 first quiz is num (no items)', pg.evaluate('CMP.quiz.mode') == 'num' and
                  pg.evaluate('CMP.quiz.items.left') == [] and pg.evaluate('CMP.quiz.items.right') == [])
            # 点数字卡读数：角标 1 出现（cmp_n 跟读支架，r29 ch2 主策略）
            box = pg.locator('.numcard').first.bounding_box()
            pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
            pg.wait_for_timeout(300)
            badge = pg.locator('.numcard .badge.on').first
            check('ch2 tap numcard -> badge 1 (counting scaffold)', badge.count() > 0 and
                  badge.text_content() == '1', badge.text_content() if badge.count() else 'none')
            st = pg.evaluate('CMP.currentLevel')
            check('ch2 tap numcard: no advance (zero penalty)', st['step'] == 0, str(st))
            n, modes, numcard = play_level(pg)
            check('ch2: all 5 quizzes are num (r29 all-digit-cards)',
                  modes['num'] == 5 and modes['count'] == 0 and modes['mix'] == 0 and
                  modes['tri'] == 0 and modes['near'] == 0, str(modes))
            check('ch2 real-click win', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('CMP.currentLevel')
            check('ch2 win proceeds to flat=6', lv2 and lv2['flat'] == 6, str(lv2))
            ctx.close()

            # ---- 2e. 章 3 三数比大小（flat10，r29）：tri 真实上屏 + 错选零惩罚 + 通关 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2e')
            pg.goto(URL)
            pg.wait_for_function('window.CMP && CMP.currentLevel', timeout=8000)
            lv = pg.evaluate('CMP.currentLevel')
            check('ch3 level start at flat=10 (dch=3)', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            # 完整通关（tri DOM/错选断言在 play_level 内按题触发，不预推进——题位完整计 5）
            n, modes, _ = play_level(pg, first_wrong=True, tri_dom_check=True)
            check('ch3: exactly 2 tri + 3 num in level', modes['tri'] == 2 and modes['num'] == 3, str(modes))
            check('ch3 real-click win', n == 5, 'answered=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('ch3 win -> 2 stars (1 tri retry)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('CMP.currentLevel')
            check('ch3 win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            ctx.close()

            # ---- 3+4. 双 viewport 三形态：ch1 实物(flat0) / ch2 数字卡(flat5) / ch3 tri 三卡(flat10)
            for vp in [(1280, 800), (800, 1180)]:
                # 形态 A：ch1 实物（种档空 → flat0 count）
                ctx = new_ctx(browser, vp, preset_save(tut_seen=True, done_flats=(), bonus=30))
                pg = ctx.new_page(); watch(pg, 'vp%d-items' % vp[0])
                pg.goto(URL)
                pg.wait_for_function('window.CMP && CMP.currentLevel', timeout=8000)
                pg.wait_for_timeout(600)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button, [data-i], .k-btn').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.className || e.tagName) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const syms = [...document.querySelectorAll('.sym')].map(b => b.getBoundingClientRect());
                  const items = [...document.querySelectorAll('.item')].map(b => {
                    const r = b.getBoundingClientRect();
                    return {x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height};
                  });
                  let overlap = false;
                  for (let i = 0; i < items.length; i++)
                    for (let j = i + 1; j < items.length; j++) {
                      const a = items[i], b = items[j];
                      if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 2) overlap = true;
                    }
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad, items: items.length,
                          overlap: overlap,
                          hitMin: items.length ? Math.round(Math.min(...items.map(a => Math.min(a.w, a.h)))) : 0,
                          symW: syms.length ? Math.round(Math.min(...syms.map(r => r.width))) : 0,
                          symH: syms.length ? Math.round(Math.min(...syms.map(r => r.height))) : 0};
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64' % vp, not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d ch1 items >=64, no overlap' % vp,
                      m['items'] > 0 and m['hitMin'] >= 64 and not m['overlap'],
                      'items=%d hitMin=%d overlap=%s' % (m['items'], m['hitMin'], m['overlap']))
                check('vp %dx%d symbol buttons >=96x96' % vp, m['symW'] >= 96 and m['symH'] >= 96,
                      'sym=%dx%d' % (m['symW'], m['symH']))
                shot = SHOTS / ('compare-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d non-blank (stdev>10)' % vp, ok, detail)
                if ok:
                    shot.unlink()
                ctx.close()

                # 形态 B：ch2 数字卡符号题（flat5 全 num）
                ctx = new_ctx(browser, vp, preset_save(tut_seen=True, done_flats=range(5), bonus=30))
                pg = ctx.new_page(); watch(pg, 'vp%d-num' % vp[0])
                pg.goto(URL)
                pg.wait_for_function('window.CMP && CMP.currentLevel', timeout=8000)
                pg.wait_for_timeout(600)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const ncs = [...document.querySelectorAll('.numcard')].map(b => b.getBoundingClientRect());
                  const syms = [...document.querySelectorAll('.sym')].map(b => b.getBoundingClientRect());
                  return {ox: de.scrollWidth - de.clientWidth, nc: ncs.length,
                          ncMin: ncs.length ? Math.round(Math.min(...ncs.map(r => Math.min(r.width, r.height)))) : 0,
                          symMin: syms.length ? Math.round(Math.min(...syms.map(r => Math.min(r.width, r.height)))) : 0};
                }''')
                check('vp %dx%d ch2 numcards >=64 (2 cards)' % vp,
                      m['ox'] == 0 and m['nc'] == 2 and m['ncMin'] >= 64 and m['symMin'] >= 96,
                      'ox=%s nc=%d ncMin=%d symMin=%d' % (m['ox'], m['nc'], m['ncMin'], m['symMin']))
                ctx.close()

                # 形态 C：ch3 tri 三卡（flat10 推进到首个 tri）
                ctx = new_ctx(browser, vp, preset_save(tut_seen=True, done_flats=range(10), bonus=30))
                pg = ctx.new_page(); watch(pg, 'vp%d-tri' % vp[0])
                pg.goto(URL)
                pg.wait_for_function('window.CMP && CMP.currentLevel', timeout=8000)
                for _ in range(5):
                    q = pg.evaluate('CMP.quiz')
                    if q and q['mode'] == 'tri':
                        break
                    advance(pg)
                    pg.wait_for_timeout(400)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const cards = [...document.querySelectorAll('.group.tri .numcard')].map(b => {
                    const r = b.getBoundingClientRect();
                    return {x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height};
                  });
                  let overlap = false;
                  for (let i = 0; i < cards.length; i++)
                    for (let j = i + 1; j < cards.length; j++) {
                      const a = cards[i], b = cards[j];
                      if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 2) overlap = true;
                    }
                  return {ox: de.scrollWidth - de.clientWidth, n: cards.length,
                          hitMin: cards.length ? Math.round(Math.min(...cards.map(a => Math.min(a.w, a.h)))) : 0,
                          overlap: overlap,
                          off: document.getElementById('symbols').classList.contains('off')};
                }''')
                check('vp %dx%d ch3 tri: 3 cards >=64, no overlap, symbols off' % vp,
                      m['n'] == 3 and m['hitMin'] >= 64 and not m['overlap'] and m['off'] and m['ox'] == 0,
                      'n=%d hitMin=%d overlap=%s off=%s ox=%s' % (m['n'], m['hitMin'], m['overlap'], m['off'], m['ox']))
                ctx.close()
        finally:
            browser.close()

    # ---- 5. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
