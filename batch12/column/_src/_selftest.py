# -*- coding: utf-8 -*-
"""column _selftest — headless playwright 自测（独立 chromium.launch --mute-audio，不连/不杀任何浏览器进程）
r15（2026-09-16：每关 8 题+进退位操作步+三位数+两步竖式）：
P1. ?verify=1 横 1280x800 → title=VERIFY PASS n/n（120s 轮询）+ JSON pass==total +
    40 关审计/units/smokes 全绿（units 键=engine/sayW/opening/clips/getter/swallow/tutChain/markFlow；
    smokes 键=flat0/flat8/flat24/layout）
P1b. 真竖 800x1180 独立 context 全量 verify 重跑（竖屏三件套：body.port 类通道已在 P1 simView 验，
     真竖实测通道在此验）→ 全绿 + pageerror 0
2a. 预置存档(跳过教学) → 真实指针：首错零惩罚（题级 miss=1 同格可重填）→ 相位感知真实点键盘
    （fill=点数字键 / carry·borrow=点标记槽）通关 flat0 8 题（23 正确动作）→ .k-celebrate 2 星 →
    写档 stars>=1 + 推进 flat=1
2b. flat8（ch2 退位章，首题热身）：热身不退位 + 借位题开题即标记相位（真实点退位点槽）→
    真实通关 → save '2-0' stars>=1
2c. 全新存档 → 教学 看(固定演示题 36+47：真实点键盘吞输入)→帮(幽灵手指)→独 真实链路 →
    column.tutSeen 持久化 + '1-0' 写档
3. flat≥3 救援钟：真实错点不重置 → 静置救援触发（重读题面 clm_q_* + 应填键 breathe）；
    标记相位救援由 verify markFlow + 救援 interval 分支覆盖（headless 等待 2×14s 过长不重跑）
4. 双 viewport(1280x800/800x1180)：overflowX==0、按钮 ≥64、键盘 10 键 ≥64、黑板数字 ≥40、
    截图非空白（flat16=ch3 三位数板面）
5. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限已放开
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'column', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'column': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 8 + 1, f % 8)] = {'stars': 3, 'plays': 1}   # r15：8 题/关
    return 'localStorage.setItem("kidsgame_column", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path, floor=6.0):
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


def click_key(page, d):
    loc = page.locator('.key[data-d="%d"]' % d)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def click_zone(page, t, col):
    """真实指针点标记槽（r15 操作步：进位小 1 / 退位点）"""
    loc = page.locator('#mz-%s%d' % (t, col))
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def wrong_digit(q):
    return (q['need'] + 1) % 10   # 必不等于当前应填位


def prog(q):
    """进度复合键：填格/标记/换步/换题 单调递增（r15 相位感知）"""
    return (q['step'], q['si'],
            sum(1 for c in q['cells'] if c is not None), len(q['marks']))


def do_act(page, q):
    """按相位驱动一步真实点击：fill=数字键 / carry|borrow=标记槽"""
    if q['phase'] == 'fill':
        click_key(page, q['need'])
    else:
        click_zone(page, q['mark']['t'], q['mark']['col'])


def play_level(page, first_wrong=False, tag=''):
    """相位感知真实指针答完当前关（首题可选先错一次）
    返回被接受的动作数（板擦/晃动窗内被吞的点击不计）——guard 硬上限防卡死"""
    wrong_done = not first_wrong
    accepted = 0
    guard = 0
    while guard < 400:
        guard += 1
        q = page.evaluate('CL.quiz')
        if q is None:
            break                                # 关已答完（celebrate 在函数尾等）
        if not wrong_done:
            wrong_done = True
            click_key(page, wrong_digit(q))
            page.wait_for_timeout(400)
            st = page.evaluate('''() => {
              const lv = CL.currentLevel, qz = CL.quiz;
              return {retries: lv.retries, step: lv.step, won: lv.won, miss: qz.miss,
                      phase: qz.phase, cells: qz.cells};
            }''')
            check('%sfirst wrong: zero penalty / same-cell refill (miss counted once)' % tag,
                  st['retries'] == 1 and st['step'] == 0 and not st['won'] and
                  st['miss'] == 1 and st['phase'] == 'fill' and st['cells'][0] is None, str(st))
            continue
        before = page.evaluate('CL.quiz')
        if before is None:
            break
        do_act(page, before)
        page.wait_for_timeout(220)
        after = page.evaluate('CL.quiz')
        if after is None:                        # 末题末位：整关通关（celebrate 在途）
            accepted += 1
            break
        if prog(after) > prog(before):
            accepted += 1                        # 动作被接受（填格/标记/换步/换题）
    page.wait_for_selector('.k-celebrate', timeout=20000)
    return accepted


def verify_phase(browser, watch, vp, tag):
    """P1/P1b：verify 页全量断言（横/真竖两轮）"""
    ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
    pg = ctx.new_page(); watch(pg, tag)
    pg.goto(URL + '?verify=1', timeout=60000)
    deadline = time.time() + 120
    title = ''
    while time.time() < deadline:
        title = pg.title()
        if title.startswith('VERIFY'):
            break
        pg.wait_for_timeout(500)
    check('%s verify title (poll <=120s, n/n suffix)' % tag, title.startswith('VERIFY PASS'), title)
    vj = json.loads(pg.locator('#verify-result').text_content())
    check('%s verify JSON pass==total' % tag, vj['pass'] == vj['total'] and vj['layoutOk'],
          'pass=%s/%s' % (vj['pass'], vj['total']))
    check('%s verify 40-level audit all ok (plan/marks/chapter-profile/a>b/no-dup)' % tag,
          all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()),
          'static=%d gen=%d' % (len(vj['levels']), len(vj['gen'])))
    check('%s verify units all ok' % tag, all(v['ok'] for v in vj['units'].values()),
          str({k: v for k, v in vj['units'].items() if not v['ok']}))
    check('%s verify dual-viewport sims all pass' % tag,
          all(s['pass'] for s in vj['smokes']['layout']['sims']))
    for key in ('engine', 'sayW', 'opening', 'clips', 'getter', 'swallow', 'tutChain', 'markFlow'):
        check('%s verify unit [%s] ok' % (tag, key), vj['units'].get(key, {}).get('ok') is True)
    for key in ('flat0', 'flat8', 'flat24', 'layout'):
        check('%s verify smoke [%s] ok' % (tag, key), vj['smokes'].get(key, {}).get('ok') is True)
    n_clip = pg.evaluate('Object.keys(KIDS.voice.clips).length')
    check('%s clips injected = 14 (clm_ 11 + core 3)' % tag, n_clip == 14, 'clips=%s' % n_clip)
    dur = vj['units'].get('duration', {})
    check('%s duration: dMin === 117600 (r15 anti-drift)' % tag,
          dur.get('ok') and dur.get('dMin') == 117600, str(dur))
    ctx.close()


def main():
    offline_bad = []
    page_errors = []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])
        try:
            # ---- P1. verify=1（横 1280x800）----
            verify_phase(browser, watch, (1280, 800), 'P1')
            # ---- P1b. 真竖 800x1180 全量重跑（竖屏三件套实测通道）----
            verify_phase(browser, watch, (800, 1180), 'P1b')

            # ---- 2a. 预置存档：首错零惩罚 + 真实点击通关 flat0（2 星）→ 推进写档 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.CL && CL.currentLevel', timeout=8000)
            lv = pg.evaluate('CL.currentLevel')
            check('start at 1-0 (ch 1-based, add warmup)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('r15: 8 quizzes per level', lv and lv['n'] == 8, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('CL.tutorial') == 'none')
            q = pg.evaluate('CL.quiz')
            check('quiz hook shape (op/a/b/ans/need/cells/miss/carry)',
                  q and q['op'] == 'add' and q['form'] is None and 10 <= q['a'] <= 99 and 10 <= q['b'] <= 99 and
                  q['ans'] == q['a'] + q['b'] and len(q['cells']) == 2 and
                  q['phase'] == 'fill' and q['need'] == q['ans'] % 10 and
                  q['cells'] == [None, None] and q['miss'] == 0 and q['carry'] is False and
                  q['a'] % 10 + q['b'] % 10 < 10, str(q))
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('answered 8 quizzes by real keyboard (2+7x3 actions)', n == 23, 'accepted=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)            # celebrate 收起+写档+推进（2.3s 收起+缓冲）
            lv2 = pg.evaluate('CL.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_column")'))
            check('save 1-0 recorded stars>=1 (2 stars)', saved['levels'].get('1-0', {}).get('stars', 0) >= 1,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. flat8（ch2 退位章，首题热身）：开题借位相位+真实点退位点+通关（3 星） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(8), bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.CL && CL.currentLevel', timeout=8000)
            lv = pg.evaluate('CL.currentLevel')
            check('starts at flat=8 (ch2 borrow chapter)', lv and lv['flat'] == 8 and lv['ch'] == 2, str(lv))
            q0 = pg.evaluate('CL.quiz')
            check('ch2 first quiz = warmup no-borrow (ones enough)',
                  q0 and q0['op'] == 'sub' and q0['borrow'] is False and
                  q0['a'] % 10 >= q0['b'] % 10, str(q0))
            do_act(pg, q0); pg.wait_for_timeout(250)          # 热身个位
            do_act(pg, pg.evaluate('CL.quiz')); pg.wait_for_timeout(1500)   # 热身十位 → 板擦换题
            q1 = pg.evaluate('CL.quiz')
            check('quiz2 is borrow: opens in borrow phase (dot unlit, keys dim)',
                  q1 and q1['step'] == 1 and q1['borrow'] is True and q1['phase'] == 'borrow' and
                  q1['mark'] == {'t': 'b', 'col': 1} and q1['a'] % 10 < q1['b'] % 10 and
                  pg.evaluate("document.getElementById('mz-b1').classList.contains('cur')") is True and
                  pg.evaluate("document.getElementById('mz-b1').classList.contains('lit')") is False and
                  pg.evaluate("document.getElementById('keys').classList.contains('dim')") is True, str(q1))
            click_zone(pg, 'b', 1)                            # 真实点退位点槽
            pg.wait_for_timeout(300)
            q1b = pg.evaluate('CL.quiz')
            check('borrow dot lit -> phase back to fill',
                  q1b and q1b['phase'] == 'fill' and len(q1b['marks']) == 1 and
                  pg.evaluate("document.getElementById('mz-b1').classList.contains('lit')") is True, str(q1b))
            n = play_level(pg, tag='[2b] ')                   # 余本题 2 键 + 后 6 题（3 动作/题）
            check('flat8 remaining answered by real keyboard (2+6x3=20 actions)', n == 20, 'accepted=%d' % n)
            pg.wait_for_selector('.k-celebrate', timeout=20000)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_column")'))
            stars8 = saved['levels'].get('2-0', {}).get('stars', 0)
            check('flat8 win saved stars>=1 (3 stars, no wrong)', stars8 >= 1, 'stars=%s' % stars8)
            ctx.close()

            # ---- 2c. 全新存档：教学 看(吞输入)→帮(幽灵手指)→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.CL && CL.currentLevel', timeout=8000)
            pg.wait_for_function("CL.tutorial === 'watch'", timeout=5000)
            q0 = pg.evaluate('CL.quiz')                       # 演示题 36+47（进位链）
            check('tutorial demo quiz = 36+47 (carry chain)',
                  q0 and q0['a'] == 36 and q0['b'] == 47 and q0['ans'] == 83, str(q0))
            click_key(pg, q0['need'])                         # 教学看演期真实点键盘：吞输入不推进
            pg.wait_for_timeout(300)
            st = pg.evaluate('CL.quiz')
            swallowed = (st['miss'] == 0 and st['step'] == 0 and st['cells'] == [None, None])
            check('tutorial watch swallows real keyboard tap (pop feedback, no advance)', swallowed, str(st))
            check('tutorial watch tapKey() returns false',
                  pg.evaluate('CL.tapKey(%d)' % q0['need']) is False)
            pg.wait_for_function("CL.tutorial === 'help'", timeout=30000)   # 等"看"演示完成（真实演示）
            q = pg.evaluate('CL.quiz')
            check('tutorial watch done -> level reset to quiz 0 (fresh, miss 0)',
                  q and q['step'] == 0 and q['si'] == 0 and q['miss'] == 0 and
                  q['cells'] == [None, None] and q['marks'] == [], str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')",
                                     timeout=6000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> first action target (key or mark zone)', ghost_shown)
            n = play_level(pg, tag='[2c] ')
            check('tutorial level playable -> .k-celebrate (23 actions)', n == 23, 'accepted=%d' % n)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_column")'))
            check('column.tutSeen persisted', (saved.get('column') or {}).get('tutSeen') is True)
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 3. flat≥3 救援钟：真实错点不重置 → 静置救援（重读题面+键 breathe） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.CL && CL.currentLevel', timeout=8000)
            lv = pg.evaluate('CL.currentLevel')
            check('rescue test starts at flat=3 (flat>=3)', lv and lv['flat'] == 3, str(lv))
            pg.evaluate('''() => { window.__rp = [];
              KIDS.voice.play = (k) => { window.__rp.push(k); }; KIDS.voice.queue = () => {}; }''')
            pg.wait_for_timeout(2300)            # 开题语音已落地（stub 前不计）
            q = pg.evaluate('CL.quiz')
            t0 = time.time()
            click_key(pg, wrong_digit(q))        # t≈+2.4s 真实错点：不重置救援钟
            pg.wait_for_timeout(13500)           # 至 t≈+15.9s：不重置→救援(+14~15s)已来；若重置→+16.4s 仍无
            rec = pg.evaluate('window.__rp')
            rescues = pg.evaluate('CL.rescues')
            breathe = pg.evaluate("document.querySelectorAll('.key.breathe').length")
            qz = pg.evaluate('CL.quiz')
            el = time.time() - t0
            check('rescue ~14s (wrong tap did NOT reset clock; re-read clm_q_* + hint)',
                  rescues >= 1 and any(('clm_q' in k) for k in rec) and ('clm_hint' in rec),
                  'rescues=%d plays=%s elapsed=%.1fs' % (rescues, rec, el))
            check('rescue visual: needed-digit key breathing (>=1)', breathe >= 1, 'breathing keys=%d' % breathe)
            check('rescue keeps quiz (same quiz, miss preserved)', qz and qz['miss'] == 1, str(qz))
            ctx.close()

            # ---- 4. 双 viewport：overflowX==0 / 按钮 ≥64 / 键盘 ≥64 / 黑板数字 ≥40 / 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(16), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.CL && CL.currentLevel', timeout=8000)
                lv = pg.evaluate('CL.currentLevel')
                check('vp %dx%d starts flat16 (ch3 three-digit board)' % vp,
                      lv and lv['flat'] == 16 and lv['ch'] == 3, str(lv))
                pg.wait_for_timeout(900)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    if (e.offsetParent === null) return;
                    if (e.offsetWidth > 4 && e.offsetHeight > 4 && (e.offsetWidth < 64 || e.offsetHeight < 64))
                      bad.push((e.id || e.className) + ':' + e.offsetWidth + 'x' + e.offsetHeight);
                  });
                  const keys = [...document.querySelectorAll('.key')].map(c => Math.min(c.offsetWidth, c.offsetHeight));
                  const bn = document.querySelector('.bn');
                  const fs = bn ? Math.round(parseFloat(getComputedStyle(bn).fontSize)) : 0;
                  const tip = document.getElementById('tip').getBoundingClientRect();
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad, nKeys: keys.length,
                          keyMin: keys.length ? Math.min(...keys) : 0, bbfs: fs, tipH: Math.round(tip.height)};
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64 (incl mark zones, excl .k-parentbtn/hidden)' % vp,
                      not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d 10 digit keys >=64, board digits >=40px' % vp,
                      m['nKeys'] == 10 and m['keyMin'] >= 64 and m['bbfs'] >= 40,
                      'keys=%d min=%s bbfs=%s' % (m['nKeys'], m['keyMin'], m['bbfs']))
                shot = SHOTS / ('column-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=6.0)
                check('screenshot %dx%d non-blank (stdev>5)' % vp, ok, detail)
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
