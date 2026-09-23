# -*- coding: utf-8 -*-
"""fraction _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r15 难度改造（2026-09-16，AUDIT-78:78）：五章×8 题+eq 等值题型+cut 4 选 1+竖屏三件套。
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 80 关审计全绿（静态 40+生成 40）
   + 专项单元全绿（tapCard/sayW/tutChain/dist/duration）
2a. 预置存档(跳过教学) → 真实 pointer：首错(晃动+灰掉 pointer-events:none+零惩罚+应点卡不 pulse)
    → 真实点击通关 8 题 → .k-celebrate 2星 → 等 5.4s → 存档 levels['1-0'].stars>=1 → 推进 flat=1
2b. 全新存档 → 教学 看(真实点击+hook 全吞+轻叮 sfx('pop'))→帮(幽灵手指)→独 真实链路
    → fraction.tutSeen 持久化 → 1-0 写档
2c. flat16（第 17 关·章 3 read 型，r15 扁号）：首题热身 1/2 + 池内答案+相邻互异 → 真实点击通关
    → .k-celebrate 3 星 → 等 5.4s → 存档 levels['3-0'].stars>=1
2d/P1b. 双 viewport(1280x800/800x1180)×四题型(cut 4 卡/read 3 分数卡/cmp 2 块卡/eq 3 块卡)：
    overflowX==0、答案卡=主答案 ≥96、全按钮 ≥64（.k-parentbtn 豁免）、截图像素非空白（存 _shots/）；
    P1b 真竖轮：800x1180 真实 @media 通道（innerHeight>innerWidth）+竖屏卡宽锚（cut/read 120、cmp/eq 156）
4. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror + fra_* 18 条 clips 注入（r15=17+fra_q_eq）
5. 救援钟（§0.7a/§0.21）：flat≥3 静置 14s+ 重读题面(queue 全 clip 三段)+正确卡 breathe 循环；
   11s 处错点不重置
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
CH_LEN = 8                       # r15：每关 8 题（AUDIT-78:78）


def safe(s):                                   # GBK 控制台打不出中文/emoji → ASCII 转义后再打印
    return str(s).encode('ascii', 'backslashreplace').decode('ascii')


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', safe(name), ('| ' + safe(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'fraction', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'fraction': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // CH_LEN + 1, f % CH_LEN)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_fraction", ' + json.dumps(json.dumps(save)) + ')'


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
    return page.evaluate('FR.quiz')


def install_fp(page):
    """DOM↔引擎指纹对账工具：等答案演出窗结束、新题 DOM 落地再继续（read/cmp/eq 答对有分数词停留）"""
    page.evaluate('''() => {
      window.__domFp = () => [...document.querySelectorAll('#board .card')].map(c =>
        c.dataset.opt ? c.dataset.opt + '@' + c.dataset.rot :
        c.dataset.num ? c.dataset.num + '/' + c.dataset.den : c.dataset.val).join('|');
      window.__engFp = () => {
        const q = FR.quiz; if (!q) return null;
        return q.options.map(o => q.kind === 'cut' ? o.t + o.n + '@' + o.rot :
               q.kind === 'read' ? o.num + '/' + o.den : o.k + '-' + o.n).join('|');
      };
    }''')


def play_quiz(page, tag=''):
    """真实点击答完当前一题（单步制：点正确卡一次即推进）；返回本题 tap 数"""
    q = quiz_of(page)
    if q is None:
        return 0
    f0 = page.evaluate('window.__domFp()')
    click_card(page, q['answerIdx'])
    page.wait_for_function(
        "(f) => { const L = FR.currentLevel; if (L && L.done) return true;"
        " const d = window.__domFp(), e = window.__engFp();"
        " return e !== null && d !== f && d === e; }", arg=f0, timeout=9000)
    page.wait_for_timeout(300)                   # renderQuiz 后新题 DOM 完全落地
    return 1


def play_level(page, first_wrong=False, tag=''):
    """真实点击打完当前关（可先在首题整关错一次）"""
    wrong_done = not first_wrong
    quizzes = 0
    while quizzes < 30:
        q = quiz_of(page)
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = (q['answerIdx'] + 1) % len(q['options'])
            click_card(page, wi)
            page.wait_for_timeout(700)           # 晃动 480ms 演出窗
            st = page.evaluate('''(wi) => {
              const q = FR.quiz;
              const w = document.querySelector('.card[data-i="' + wi + '"]');
              const ok = document.querySelector('.card[data-i="' + q.answerIdx + '"]');
              return {retries: FR.currentLevel.retries, step: FR.currentLevel.step, miss: q.miss,
                      dead: q.dead, wig: w.classList.contains('wig'), dim: w.classList.contains('dim'),
                      pe: getComputedStyle(w).pointerEvents,
                      pulse: ok.classList.contains('pulse')};
            }''', wi)
            check('%sfirst wrong: wig + dimmed + pointer-events none + zero penalty + no pulse' % tag,
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and
                  st['dead'] == [wi] and st['wig'] and st['dim'] and st['pe'] == 'none' and
                  not st['pulse'], str(st))
            continue
        play_quiz(page, tag=tag)
        quizzes += 1
    page.wait_for_selector('.k-celebrate', timeout=25000)
    return quizzes


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
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=30000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify 80-level audit all ok (static 40 + gen 40)',
                  len(vj['levels']) == 40 and len(vj['gen']) == 40 and
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()),
                  'static=%d gen=%d' % (len(vj['levels']), len(vj['gen'])))
            check('verify units all ok (tapCard/sayW/tutChain/dist/duration)',
                  all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify dual-viewport sims all pass (cut/read/cmp/eq x2 vp)',
                  len(vj['smokes']['layout']['sims']) == 8 and
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str([s for s in vj['smokes']['layout']['sims'] if not s['pass']]))
            dist = vj['units']['dist']
            check('fraction specifics: FRA_NUM/FRAC_NAME literals, 18 clips, opening chain, coverage',
                  dist['ok'] and dist['fraNum'] and dist['fracName'] and dist['clips'] and
                  dist['openHint'] and dist['openQ'] and
                  all(v >= 1 for v in dist['genDch'].values()) and
                  all(v >= 1 for v in dist['kindDist'].values()) and
                  all(v >= 1 for v in dist['readAns'].values()) and
                  all(v >= 1 for v in dist['cmpPairs'].values()) and
                  all(v >= 1 for v in dist['eqPairs'].values()),
                  'genDch=%s kind=%s read=%s cmp=%s eq=%s' % (dist['genDch'], dist['kindDist'],
                                                              dist['readAns'], dist['cmpPairs'],
                                                              dist['eqPairs']))
            dur = vj['units']['duration']
            check('duration model: dMin=72265@flat24, 80-flat parity, LEVEL_MIN 40000',
                  dur['ok'] and dur['minMs'] == 72265 and dur['minFlat'] == 24 and dur['parity'],
                  str(dur))
            tc = vj['units']['tutChain']
            check('verify tutorial chain unit (watch->turn->quiz relay, cut parts liang fen)',
                  tc['ok'], str(tc)[:160])
            sw = vj['units']['sayW']
            check('verify sayW tri-state unit (flat0x2/throttle0/force2)', sw['ok'], str(sw)[:160])
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + 真实点击通关（2 星）+ 写档 + 推进 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.FR && FR.currentLevel', timeout=8000)
            n_clips = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('fra_') === 0).length")
            check('fra_* clips injected = 18 (r15: 17 + fra_q_eq)', n_clips == 18, 'n=%s' % n_clips)
            pg.wait_for_timeout(2500)            # 等开场链（hint clip + 2000ms 接力题面）落定
            install_fp(pg)
            lv = pg.evaluate('FR.currentLevel')
            check('start at 1-0 (ch 1-based)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('FR.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook contract {kind,n,k,ref,options,answerIdx,step,miss,dead}',
                  q and q['kind'] == 'cut' and q['n'] == 2 and q['k'] is None and q['ref'] is None and
                  len(q['options']) == 4 and q['options'][q['answerIdx']]['t'] == 'eq' and
                  q['options'][q['answerIdx']]['n'] == 2 and q['step'] == 0 and q['miss'] == 0 and
                  q['dead'] == [] and isinstance(q['options'][0]['w'], list),
                  str(q and {k: q[k] for k in ('kind', 'n', 'k', 'ref', 'options', 'answerIdx', 'dead')}))
            dom = pg.evaluate('''() => {
              const chipB = document.querySelector('#prompt-chip .qtext b').textContent;
              const cards = [...document.querySelectorAll('#board .card')].map(c => c.dataset.opt);
              const eng = FR.quiz.options.map(o => o.t + o.n);
              return {chipB: chipB, n: cards.length, align: JSON.stringify(cards.sort()) === JSON.stringify(eng.sort()),
                      k: document.querySelector('#board').dataset.k};
            }''')
            check('DOM matches quiz (chip big number=2, 4 pizza cards data-opt aligned, board k=cut)',
                  dom['chipB'] == '2' and dom['n'] == 4 and dom['align'] and dom['k'] == 'cut',
                  str(dom))
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('finished 8 quizzes by real click', n == CH_LEN, 'quizzes=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)            # celebrate 2.3s + 写档 + 推进（任务口径：等 5.4s 再读）
            lv2 = pg.evaluate('FR.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_fraction")'))
            s10 = saved['levels'].get('1-0', {}).get('stars', 0)
            check('save levels["1-0"].stars >= 1 (actual 2)', s10 >= 1, 'stars=%s' % s10)
            check('fraction.tutSeen kept true', (saved.get('fraction') or {}).get('tutSeen') is True,
                  str(saved.get('fraction')))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入+轻叮)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.FR && FR.currentLevel', timeout=8000)
            pg.wait_for_function("FR.tutorial === 'watch'", timeout=5000)
            pg.evaluate('window.__sfx = []; KIDS.audio.sfx = n => window.__sfx.push(n);')
            install_fp(pg)
            swallowed_hook = pg.evaluate('FR.tapCard(0)') is False    # 演示期 hook 输入全吞
            qw0 = quiz_of(pg)
            click_card(pg, qw0['answerIdx'])         # 演示期真实点击也吞（uiTapCard locked 门 → sfx pop）
            pg.wait_for_timeout(700)
            st = pg.evaluate('''() => ({step: FR.currentLevel.step, retries: FR.currentLevel.retries,
                                        tut: FR.tutorial, pop: window.__sfx.indexOf('pop') >= 0})''')
            check('tutorial watch swallows input (real click + hook) with pop ding (0x22)',
                  swallowed_hook and st['step'] == 0 and st['retries'] == 0 and
                  st['tut'] == 'watch' and st['pop'], str(st))
            pg.wait_for_function("FR.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0',
                  q and q['step'] == 0 and q['miss'] == 0 and q['dead'] == [], str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost visible', ghost_shown)
            n = play_level(pg, tag='[2b] ')       # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (8 quizzes)', n == CH_LEN, 'quizzes=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_fraction")'))
            check('fraction.tutSeen persisted after tutorial',
                  (saved.get('fraction') or {}).get('tutSeen') is True, str(saved.get('fraction')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. flat16（第 17 关·章 3 read 型，r15 扁号）：热身+池规则 → 真实通关 3 星 → 写档 3-0 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(16), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.FR && FR.currentLevel', timeout=8000)
            pg.wait_for_timeout(2500)
            install_fp(pg)
            lv = pg.evaluate('FR.currentLevel')
            check('level 17 starts at flat=16 ch=3', lv and lv['flat'] == 16 and lv['ch'] == 3 and lv['dch'] == 3,
                  str(lv))
            c3 = pg.evaluate('''() => {
              const L = genLevel(16);
              const POOL = [[2,4],[3,4],[2,3]];
              const qs = L.quizzes;
              return {dch: L.dch,
                allRead: qs.every(q => q.kind === 'read'),
                warm: qs[0].k === 1 && qs[0].n === 2,
                inPool: qs.every((q, i) => i === 0 || POOL.some(p => p[0] === q.k && p[1] === q.n)),
                adjDiff: qs.every((q, i) => i === 0 || qs[i-1].k !== q.k || qs[i-1].n !== q.n),
                uniq: qs.every(q => new Set(q.options.map(o => o.num + '/' + o.den)).size === 3),
                cards: document.querySelectorAll('#board .card').length,
                k: document.querySelector('#board').dataset.k,
                pizza: !!document.querySelector('#prompt-chip .pwrap')};
            }''')
            check('ch3: all read, qi0 warmup 1/2, answers in pool, adjacent differ, options unique, 3 frac cards',
                  c3['dch'] == 3 and c3['allRead'] and c3['warm'] and c3['inPool'] and c3['adjDiff'] and
                  c3['uniq'] and c3['cards'] == 3 and c3['k'] == 'read' and c3['pizza'], str(c3))
            n = play_level(pg, tag='[2c] ')
            check('level 17 real-click win (8 quizzes)', n == CH_LEN, 'quizzes=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('level 17 win 3 stars (0 wrong)', stars == 3, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)             # 任务口径：celebrate 后等 5.4s 再读档
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_fraction")'))
            s30 = saved['levels'].get('3-0', {}).get('stars', 0)
            check('save levels["3-0"].stars >= 1 (actual 3)', s30 >= 1, 'stars=%s' % s30)
            ctx.close()

            # ---- 2d/P1b. 双 viewport × 四题型：overflowX==0 + 卡>=96 + 按钮>=64 + 竖屏锚 + 截图非空白 ----
            # P1b 真竖轮：800x1180 为真实 @media 通道（innerHeight>innerWidth 断言）+竖屏卡宽锚
            # （cut/read 120、cmp/eq 156——与横屏 136/172 档位区分，证竖屏 CSS 实际生效）
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(5), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.FR && FR.currentLevel', timeout=8000)
                pg.wait_for_timeout(1200)        # 入场动画落定
                if vp[0] == 800:
                    real_port = pg.evaluate('window.innerHeight > window.innerWidth')
                    check('P1b real portrait viewport (800x1180 -> @media channel active)', real_port)
                for tag, setup, expect_n in [
                        ('cut', 'startLevel(0)', 4),
                        ('read', 'startLevel(16)', 3),
                        ('cmp', 'startLevel(24)', 2),
                        ('eq', 'startLevel(32); engTap(cur, cur.quizzes[0].answerIdx); renderQuiz();', 3)]:
                    pg.evaluate(setup)
                    pg.wait_for_timeout(1200)
                    m = pg.evaluate('''() => {
                      document.querySelectorAll('#board .card').forEach(c => c.classList.remove('pop'));
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;
                        if (e.offsetWidth > 4 && e.offsetHeight > 4 && (e.offsetWidth < 64 || e.offsetHeight < 64))
                          bad.push((e.id || e.className) + ':' + e.offsetWidth + 'x' + e.offsetHeight);
                      });
                      const cards = [...document.querySelectorAll('#board .card')];
                      const cMin = cards.length ? Math.min(...cards.map(c => Math.min(c.offsetWidth, c.offsetHeight))) : 0;
                      const cw = cards.length ? cards[0].offsetWidth : 0;
                      const chip = document.querySelector('#prompt-chip');
                      const q = FR.quiz;
                      const inside = cards.every(c => {
                        const inner = c.querySelector('.gwrap') || c.querySelector('.frac');
                        return inner.offsetLeft >= -8 && inner.offsetTop >= -8 &&
                               inner.offsetLeft + inner.offsetWidth <= c.offsetWidth + 8 &&
                               inner.offsetTop + inner.offsetHeight <= c.offsetHeight + 8;
                      });
                      const chipOk = q.kind === 'cut' ?
                          document.querySelector('#prompt-chip .qtext b').textContent === String(q.n) :
                        q.kind === 'read' ? !!document.querySelector('#prompt-chip .pwrap') :
                        q.kind === 'eq' ? (!!document.querySelector('#prompt-chip .pwrap') &&
                          document.querySelector('#prompt-chip .qtext.small').textContent.indexOf('一样大') >= 0) :
                          document.querySelector('#prompt-chip .qtext').textContent.indexOf(String.fromCharCode(0x5927)) >= 0;
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad, cards: cards.length,
                              cMin: cMin, cw: cw, chipW: chip.offsetWidth, inside: inside, chipOk: chipOk};
                    }''')
                    port_w = {'cut': 120, 'read': 120, 'cmp': 156, 'eq': 156}[tag]
                    land_w = {'cut': 136, 'read': 136, 'cmp': 172, 'eq': 172}[tag]
                    anchor_ok = (abs(m['cw'] - port_w) <= 2) if vp[0] == 800 else (abs(m['cw'] - land_w) <= 2)
                    check('%s %s overflowX==0 + cards=%d(>=96) + buttons>=64 + chip>=64 + glyph inside + chip content' %
                          ('P1b' if vp[0] == 800 else 'vp', tag, expect_n),
                          m['ox'] == 0 and m['cards'] == expect_n and m['cMin'] >= 96 and
                          not m['bad'] and m['chipW'] >= 64 and m['inside'] and m['chipOk'],
                          'ox=%s cards=%s cMin=%s bad=%s chipW=%s inside=%s chipOk=%s' %
                          (m['ox'], m['cards'], m['cMin'], m['bad'][:3], m['chipW'], m['inside'], m['chipOk']))
                    if vp[0] == 800:
                        check('P1b %s portrait card width anchor %dpx (landscape %d)' % (tag, port_w, land_w),
                              anchor_ok, 'cw=%s' % m['cw'])
                    shot = SHOTS / ('fraction-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot, floor=10.0)
                    check('screenshot %s %dx%d non-blank (stdev>10)' % (tag, vp[0], vp[1]), ok, detail)
                ctx.close()

            # ---- 5. 救援钟：flat>=3 静置 14s+ 重读题面(全 clip queue) + 正确卡 breathe；11s 处错点不重置 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.FR && FR.currentLevel', timeout=8000)
            check('rescue scenario starts at flat=3 (>=3)', pg.evaluate('FR.currentLevel.flat') == 3)
            pg.wait_for_timeout(2500)            # 等开场链（hint clip + 2000ms 接力）落完再挂钩
            t0 = time.time()
            pg.evaluate('''() => {
              window.__qlog = [];
              KIDS.voice.queue = parts => window.__qlog.push(parts);
            }''')
            rescue_q = lambda: pg.evaluate(
                "window.__qlog.filter(p => p[0] === 'fra_q_cut')")
            pg.wait_for_timeout(8000)            # 静置 8s → 错点一次（不该重置救援钟）
            qw = quiz_of(pg)
            click_card(pg, (qw['answerIdx'] + 1) % len(qw['options']))
            pg.wait_for_timeout(1500)            # t0+9.5s：14s 阈值未到，救援不应响
            early = len(rescue_q())
            check('rescue not fired before 14s threshold', early == 0, 'early=%s' % early)
            try:                                 # 若错点(+8s)未重置 → 救援在 ~14s 响 + 正确卡 breathe
                pg.wait_for_function("document.querySelector('.card.breathe')", timeout=8000)
                pulse_seen = True
            except Exception:
                pulse_seen = False
            pg.wait_for_timeout(400)             # queue 与 breathe 同拍，稍等日志落地
            resc = rescue_q()
            elapsed = time.time() - t0
            check('rescue fired by idle 14s+ (wrong tap at +8s did NOT reset clock) + answer card breathe loop',
                  pulse_seen and len(resc) >= 1 and elapsed < 17,
                  'breathe=%s rescues=%s wall=%.1fs' % (pulse_seen, len(resc), elapsed))
            if resc:
                check('rescue re-reads question via all-clip queue (fra_q_cut + fra_num_N + fra_q_cut2, no TTS segment)',
                      len(resc[0]) == 3 and resc[0][0] == 'fra_q_cut' and
                      str(resc[0][1]).startswith('fra_num_') and resc[0][2] == 'fra_q_cut2', str(resc[0]))
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
