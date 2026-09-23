# -*- coding: utf-8 -*-
"""mirrormaze _selftest（r14 轴向族版）— headless playwright 自测（独立 chromium.launch，
不连/不杀任何浏览器进程；禁 analyze_image——一律 DOM/像素统计断言）
P1  ?verify=1（横 1280×800）→ title=VERIFY PASS + JSON pass==total + layoutOk +
    40 关审计全绿（levels+gen）+ 单元全绿（anchor/duration/tutorial/sayW/tap/stars/dist）
    + duration：40 关 modeled 最低 ≥40000 且 ===93275 精确 + parity + 每步 DECIDE≥voiceWin
P1b 真竖视口轮（800×1180 真实 @media 通道——与 body.port 模拟通道互补）：
    flat0/5/10/15（四 dch）→ 量测前清面板残留（.k-panel/.k-celebrate/.pop 等）→
    格数=W×H、格 ≥64（g4 84/g5 72/g6 66 竖档）+ 轴向线段数按 kind（vv 双线/r180 十字）+
    提示按钮 ≥96 + 全按钮 ≥64（.k-parentbtn 豁免）+ overflowX==0 + 截图非空白（stdev>5）
P2  真实页（预置存档）：flat0 真实点击（首错零惩罚→2 星→写档→自动推进 flat1）；
    flat15（ch4 双镜）MM.start+autoSolve→3 星写档；全新存档教学链 看→帮→独 真实跑通
    （tutSeen 落档）；clips 10 注入；完全离线 + 0 pageerror
"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
SOTS_DBG = SHOTS / 'debug-timeout.png'          # 超时现场截图（排障用）
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3
RESULTS = []

AXIS_N = {'v': 1, 'h': 1, 'd1': 1, 'd2': 1, 'pv': 1, 'ph': 1, 'vv': 2, 'r180': 2}
PORT_CS = {4: 84, 5: 72, 6: 66}                 # 竖屏格档（head.html @media 与 body.port 等值双通道）


def safe(s):                                   # GBK 控制台打不出中文 → ASCII 转义后再打印
    return str(s).encode('ascii', 'backslashreplace').decode('ascii')


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', safe(name), ('| ' + safe(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=30):
    save = {
        'v': '1.0', 'game': 'mirrormaze', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'mirrormaze': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_mirrormaze", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path, floor=5.0):
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


def click_center(page, loc):
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def click_cell(page, x, y):
    click_center(page, page.locator('.cell[data-x="%d"][data-y="%d"]' % (x, y)))


def cell_of(page, x, y):
    return page.locator('.cell[data-x="%d"][data-y="%d"]' % (x, y))


def empty_cell(q):
    occ = set()
    for c in q['given'] + q['targets']:
        occ.add((c['x'], c['y']))
    for y in range(q['H']):
        for x in range(q['W']):
            if (x, y) not in occ:
                return x, y
    return None


def solve_quiz_real(page, prev_step, tag=''):
    """真实点击答完当前一题（按 MM.quiz.targets 逐格点镜像位）；
    等本题推进（right 演出 2000ms 真时钟）且 locked 释放"""
    q = page.evaluate('MM.quiz')
    if q is None:
        return 'done'
    for t in q['targets']:
        click_cell(page, t['x'], t['y'])
        page.wait_for_timeout(150)
    try:
        page.wait_for_function(
            "() => { const L = MM.currentLevel; return L.done || (L.step > %d && !L.locked); }" % prev_step,
            timeout=15000)
    except Exception:
        print('QUIZ-WAIT-TIMEOUT', safe(tag))
        print('  cur:', page.evaluate('MM.currentLevel'))
        page.screenshot(path=str(SOTS_DBG))
        return 'timeout'
    page.wait_for_timeout(400)                  # renderQuiz 新题 DOM 落地
    return 'next'


def solve_level_real(page, tag=''):
    quizzes = 0
    while quizzes < 30:
        st = page.evaluate('MM.currentLevel.step')
        r = solve_quiz_real(page, st, tag='%sq%d' % (tag, quizzes))
        if r != 'next':
            break
        quizzes += 1
    return quizzes


def measure(page, flat):
    """P1b 量测：跳关 flat → 清面板残留 → DOM 几何断言（真竖 @media 通道）"""
    page.evaluate('MM.start(%d)' % flat)
    page.wait_for_timeout(700)                  # 盘入场动画 .4s 落定
    page.evaluate(                              # 量测前清面板/弹层残留（含 .pop 类）
        "document.querySelectorAll('.k-panel,.k-celebrate,.k-dayend,.k-chapterend,"
        ".k-resttip,.pop').forEach(e => e.remove())")
    return page.evaluate('''() => {
      const de = document.documentElement;
      const bad = [];
      document.querySelectorAll('button').forEach(e => {
        if (e.classList.contains('k-parentbtn')) return;
        const r = e.getBoundingClientRect();
        if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
          bad.push((e.className || e.id) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
      });
      const cells = [...document.querySelectorAll('#grid .cell')];
      const cs = cells.length ? cells[0].offsetWidth : 0;
      const cMin = cells.length ? Math.round(Math.min(...cells.map(c => Math.min(c.offsetWidth, c.offsetHeight)))) : 0;
      const hb = document.getElementById('hint-btn').getBoundingClientRect();
      const q = MM.quiz;
      return {ox: de.scrollWidth - de.clientWidth, bad: bad, n: cells.length, cs: cs, cMin: cMin,
              hint: [Math.round(hb.width), Math.round(hb.height)],
              kind: q ? q.kind : '', W: q ? q.W : 0,
              axN: document.querySelectorAll('#axis .axl').length,
              gcls: document.getElementById('board').className};
    }''')


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
            # ---- P1. verify=1（横 1280×800） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = ctx.new_page(); watch(pg, 'P1')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=90000)
            title = pg.title()
            check('P1 verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('P1 verify JSON pass==total + layoutOk',
                  vj['pass'] == vj['total'] and vj['layoutOk'], 'pass=%s/%s' % (vj['pass'], vj['total']))
            check('P1 40-level audit all ok (levels+gen, 6-kind structure closed-form recheck)',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('P1 units all ok', all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('P1 dual-viewport sims all pass (4 dch x 2 vp)',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str([s for s in vj['smokes']['layout']['sims'] if not s['pass']]))
            an = vj['units']['anchor']
            check('P1 anchor: templates>=2 answer-sigs >=5 + pv/ph both sides',
                  an['ok'] and an['templatesWithTwoSigs'] >= 5 and
                  sorted(an['pvSides']) == ['A', 'B'] and sorted(an['phSides']) == ['A', 'B'],
                  'n=%s pv=%s ph=%s' % (an['templatesWithTwoSigs'], an['pvSides'], an['phSides']))
            d = vj['units']['duration']
            check('P1 duration gate: 40-level min === 93275 exact + >=40000 + parity + DECIDE>=voiceWin',
                  d['ok'] and d['minMs'] == 93275 and d['minMs'] >= 40000 and
                  d['parity'] and d['voiceNeverDominates'] and d['constOk'],
                  'minMs=%s@flat%s' % (d['minMs'], d['minFlat']))
            tc = vj['units']['tutorial']
            check('P1 tutorial chain (watch -> mm right -> handoff turn -> help)',
                  tc['ok'] and tc['demoR'] == 'right', str(tc)[:140])
            sw = vj['units']['sayW']
            check('P1 sayW tri-state + axis routing (flat0 mm_wrong x2 / flat5 mm_wrong2 x2)',
                  sw['ok'] and sw['nFlat0'] == 2 and sw['nFlat5'] == 2, str(sw)[:140])
            dist = vj['units']['dist']
            check('P1 dist: 10 clips + opening chain + hint2 axis routing + tip-by-axis',
                  dist['ok'] and dist['clips'] and dist['openChain'] and dist['hint2'] and dist['tipOk'],
                  str(dist)[:160])
            ctx.close()

            # ---- P1b. 真竖视口轮（800×1180 真实 @media 通道）×四 dch ----
            ctx = browser.new_context(viewport={'width': 800, 'height': 1180})
            pg = ctx.new_page(); watch(pg, 'P1b')
            pg.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg.goto(URL)
            pg.wait_for_function('window.MM && MM.currentLevel', timeout=8000)
            real_port = pg.evaluate('window.innerHeight > window.innerWidth')
            check('P1b real portrait viewport (800x1180 -> @media channel active)', real_port)
            for flat, want_kindset in [(0, ('v', 'h')), (5, ('d1', 'd2')),
                                       (10, ('pv', 'ph')), (15, ('vv', 'r180'))]:
                m = measure(pg, flat)
                want_cs = PORT_CS[m['W']]
                ax_ok = m['axN'] == AXIS_N[m['kind']]
                check('P1b flat%d (%s %dx%d): ox==0 + %d cells >=64 + port cs=%d + axis lines=%d + hint>=96 + btns>=64'
                      % (flat, m['kind'], m['W'], m['W'], m['n'], want_cs, AXIS_N[m['kind']]),
                      m['ox'] == 0 and m['n'] == m['W'] * m['W'] and m['cMin'] >= 64 and
                      abs(m['cs'] - want_cs) <= 2 and m['kind'] in want_kindset and ax_ok and
                      m['hint'][0] >= 96 and m['hint'][1] >= 96 and not m['bad'] and
                      ('g%d' % m['W']) in m['gcls'],
                      'cs=%s cMin=%s axN=%s hint=%s bad=%s' %
                      (m['cs'], m['cMin'], m['axN'], m['hint'], m['bad'][:2]))
                shot = SHOTS / ('mm-p1b-flat%d.png' % flat)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=5.0)
                check('P1b flat%d screenshot non-blank (stdev>5)' % flat, ok, detail)
            ctx.close()

            # ---- P2. 真实页：首错零惩罚→2 星→写档→推进；flat15 autoSolve→3 星；教学链 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = ctx.new_page(); watch(pg, 'P2')
            pg.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg.goto(URL)
            pg.wait_for_function('window.MM && MM.currentLevel', timeout=8000)
            n_clips = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('mm_') === 0).length")
            n_core = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('core_') === 0).length")
            check('P2 clips injected = 10 (mm_ 7 + core 3)', n_clips == 7 and n_core == 3,
                  'mm=%s core=%s' % (n_clips, n_core))
            pg.wait_for_timeout(3600)            # 等开场链落定
            lv = pg.evaluate('MM.currentLevel')
            check('P2 start at flat0 (dch1)', lv and lv['flat'] == 0 and lv['dch'] == 1, str(lv))
            q = pg.evaluate('MM.quiz')
            check('P2 quiz hook contract {kind,W,H,axis,given[role],targets[sx,sy],step,miss}',
                  q and q['W'] in (4, 5, 6) and q['axis'] and q['axis']['kind'] == q['kind'] and
                  q['given'] and all(c['role'] in ('src', 'axis') for c in q['given']) and
                  all(('sx' in t and 'sy' in t) for t in q['targets']) and
                  q['step'] == 0 and q['miss'] == 0, str(q and q['kind']))
            # 首错：点空格（非 given 非 target）→ 零惩罚可重点 + miss 计一次
            ex, ey = empty_cell(q)
            click_cell(pg, ex, ey)
            pg.wait_for_timeout(1400)            # 错点防重入窗 1000ms 真时钟
            st = pg.evaluate('''(p) => {
              const b = document.querySelector('.cell[data-x="' + p[0] + '"][data-y="' + p[1] + '"]');
              return {retries: MM.currentLevel.retries, miss: MM.quiz.miss,
                      lit: b.classList.contains('lit'), blink: b.classList.contains('blink')};
            }''', [ex, ey])
            check('P2 first wrong: zero penalty (not lit, re-tappable) + miss=1',
                  st['retries'] == 1 and st['miss'] == 1 and not st['lit'], str(st))
            n = solve_level_real(pg, tag='[P2-flat0] ')
            check('P2 flat0 finished 5 quizzes by real clicks (after 1 wrong)', n == 5, 'quizzes=%d' % n)
            pg.wait_for_selector('.k-celebrate', timeout=25000)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('P2 real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)            # celebrate + 写档 + 推进
            lv2 = pg.evaluate('MM.currentLevel')
            check('P2 auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_mirrormaze")'))
            s10 = saved['levels'].get('1-0', {}).get('stars', 0)
            check('P2 save levels["1-0"].stars >= 1 (actual 2)', s10 >= 1, 'stars=%s' % s10)
            check('P2 mirrormaze.tutSeen kept true',
                  (saved.get('mirrormaze') or {}).get('tutSeen') is True, str(saved.get('mirrormaze')))
            # flat15（ch4 双镜复合）：MM.start + autoSolve → 3 星写档
            pg.evaluate('MM.start(15)')
            pg.wait_for_timeout(500)
            k15 = pg.evaluate('MM.quiz.kind')
            check('P2 flat15 quiz kind in (vv, r180) W=6', k15 in ('vv', 'r180'), str(k15))
            rB = pg.evaluate('MM.autoSolve()')
            check('P2 flat15 autoSolve -> done 5 quizzes ok', rB and rB['done'] and rB['ok'] and
                  rB['quizzes'] == 5, str(rB))
            pg.wait_for_selector('.k-celebrate', timeout=25000)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_mirrormaze")'))
            s40 = saved['levels'].get('4-0', {}).get('stars', 0)
            check('P2 save levels["4-0"].stars >= 1 (actual 3)', s40 >= 1, 'stars=%s' % s40)
            ctx.close()

            # ---- P2c. 全新存档：教学 看（自动演示）→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = ctx.new_page(); watch(pg, 'P2c')
            pg.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg.goto(URL)
            pg.wait_for_function('window.MM && MM.currentLevel', timeout=8000)
            pg.wait_for_function("MM.tutorial === 'watch'", timeout=5000)
            check('P2c fresh save -> tutorial watch auto-starts (demo)', True)
            pg.evaluate('window.__sl = startLevel; let __n = 0;'
                        ' startLevel = function (f) { __n++; return window.__sl(f); };'
                        ' window.__slN = () => __n;')
            n0 = pg.evaluate('window.__slN()')
            click_center(pg, pg.locator('#btn-replay'))     # 教学期重玩门：真实点 replay 不重启
            pg.wait_for_timeout(500)
            st2 = pg.evaluate('window.__slN()')
            check('P2c replay gate during watch (startLevel not called)', st2 == n0, 'n=%s' % st2)
            pg.evaluate('startLevel = window.__sl;')       # 还原
            pg.wait_for_function("MM.tutorial === 'help'", timeout=30000)   # 等"看"演示完成（≤16s 设计）
            q = pg.evaluate('MM.quiz')
            check('P2c watch done -> level reset fresh (step 0, miss 0, kind v)',
                  q and q['step'] == 0 and q['miss'] == 0 and q['kind'] == 'v', str(q and q['kind']))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')",
                                     timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('P2c tutorial help ghost visible', ghost_shown)
            n = solve_level_real(pg, tag='[P2c] ')
            check('P2c tutorial level playable -> win (5 quizzes)', n == 5, 'quizzes=%d' % n)
            pg.wait_for_selector('.k-celebrate', timeout=25000)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_mirrormaze")'))
            check('P2c mirrormaze.tutSeen persisted after tutorial',
                  (saved.get('mirrormaze') or {}).get('tutSeen') is True, str(saved.get('mirrormaze')))
            check('P2c tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()
        finally:
            browser.close()

    # ---- 收尾：完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
