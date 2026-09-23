# -*- coding: utf-8 -*-
"""simon _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS（40s 轮询）+ JSON pass==total + units/smokes 全绿
   （40 关审计含确定性/序列长+禁三连+速度章型/两态吞输入/autoSolve 3 星/len 分布/双 viewport 鼓面 ≥96）
2a. 预置存档(跳过教学) → 真实指针：watch 期点鼓零响应 → 真实等演示期结束 → 首错零惩罚（重播重试）
    → 真实点完 5 题 .k-celebrate 2 星 → 推进 flat=1 写档
2b. 全新存档 → 教学 看(吞输入)→帮(幽灵手指)→独 真实链路 → simon.tutSeen 持久化
2c. 第 10 关（flat10，章 3 长 4）：真实指针+真实演示等待通关 → 推进 flat=11
3. flat≥3 救援钟：真实错点不重置 → 静置 16s 救援触发（重播序列+si_hint，SI.rescues 计数）
4. 双 viewport(1280x800/800x1180)：overflowX==0、触摸目标 ≥64、鼓面 4 面 ≥96、截图非空白(stdev>5)
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'simon', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'simon': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_simon", ' + json.dumps(json.dumps(save)) + ')'


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


def click_pad(page, i):
    loc = page.locator('.pad[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def wait_input(page, timeout=9000):
    """真实等演示期结束（lead 1.2-1.9s + 序列 ≤4 键 × 500ms，不猜时长轮询 phase）"""
    page.wait_for_function("SI.quiz && SI.quiz.phase === 'input'", timeout=timeout)


def play_level(page, first_wrong=False, tag=''):
    """真实指针答完当前关（每题：真实等演示结束→照序敲 seq；首题可选先错一次）
    返回被接受的正确敲击次数（watch 期被吞的点击不计）"""
    wrong_done = not first_wrong
    clicks = 0
    for _ in range(60):
        q = page.evaluate('SI.quiz')
        if q is None:
            break                                # 关已答完（celebrate 在函数尾等）
        wait_input(page, timeout=12000)
        q = page.evaluate('SI.quiz')
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = next(i for i in range(4) if i != q['seq'][q['pos']])
            click_pad(page, wi)
            page.wait_for_timeout(400)
            st = page.evaluate('''() => {
              const lv = SI.currentLevel;
              const qz = SI.quiz;
              return {retries: lv.retries, step: lv.step, won: lv.won, miss: qz.miss,
                      phase: qz.phase, pos: qz.pos};
            }''')
            check('%sfirst wrong: zero penalty / replay retry (miss counted once)' % tag,
                  st['retries'] == 1 and st['step'] == 0 and not st['won'] and
                  st['miss'] == 1 and st['phase'] == 'watch' and st['pos'] == 0, str(st))
            wait_input(page, timeout=12000)      # 等错后重播完成回 input
            q = page.evaluate('SI.quiz')
        while q is not None:
            before = page.evaluate('SI.quiz')
            if before is None or before['pos'] >= before['len']:
                break
            click_pad(page, before['seq'][before['pos']])
            page.wait_for_timeout(200)
            after = page.evaluate('SI.quiz')
            if after is None or after['step'] != before['step']:
                clicks += 1                      # 解题末锤：整条敲对换题（step 只因敲对而推进）
                break                            # 本题已答完（换题/通关）
            if after['pos'] == before['pos'] + 1:
                clicks += 1                      # 敲击被接受（watch 吞掉的点击不计）
            q = after
    page.wait_for_selector('.k-celebrate', timeout=20000)
    return clicks


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
            deadline = time.time() + 40
            title = ''
            while time.time() < deadline:
                title = pg.title()
                if title.startswith('VERIFY'):
                    break
                pg.wait_for_timeout(500)
            check('verify title (poll <=40s)', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify 40-level audit all ok',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify units all ok', all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']))
            dist = vj['units']['dist']
            check('verify len distribution over 40 levels (2/3/4 all >=40)',
                  dist['ok'] and all(dist['len'].get(str(k), 0) >= 40 for k in (2, 3, 4)), str(dist['len']))
            check('verify ch4 speedup measured (500>=75, 380>=25)',
                  dist['speed'].get('500', 0) >= 75 and dist['speed'].get('380', 0) >= 25, str(dist['speed']))
            check('verify two-phase swallow + skipWatch', vj['units']['twophase']['ok'])
            check('verify sayW throttle + miss===2 force', vj['units']['sayW']['ok'])
            check('verify opening chain queue([si_hint])', vj['units']['opening']['ok'])
            ctx.close()

            # ---- 2a. 预置存档：watch 期吞输入 + 首错零惩罚 + 真实点击通关（2 星）→ 推进写档 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.SI && SI.currentLevel', timeout=8000)
            lv = pg.evaluate('SI.currentLevel')
            check('start at 1-0 (ch 1-based, len 2)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('SI.tutorial') == 'none')
            q = pg.evaluate('SI.quiz')
            check('quiz hook shape (seq/len/phase/pos/speed/miss)',
                  q and len(q['seq']) == 2 and q['len'] == 2 and
                  q['phase'] in ('watch', 'input') and q['pos'] == 0 and q['miss'] == 0 and
                  q['speed'] in (380, 440, 500) and all(0 <= k <= 3 for k in q['seq']), str(q))
            # watch 期吞输入：确保处于 watch 期（开场链后 4.4s 窗口内抢测；错过则点重玩重开）
            for _ in range(3):
                if pg.evaluate('SI.quiz.phase') == 'watch':
                    break
                rb = pg.locator('#btn-replay').bounding_box()
                pg.mouse.click(rb['x'] + rb['width'] / 2, rb['y'] + rb['height'] / 2)
                pg.wait_for_timeout(300)
            check('watch phase secured for swallow test',
                  pg.evaluate('SI.quiz.phase') == 'watch')
            q = pg.evaluate('SI.quiz')
            click_pad(pg, q['seq'][0])           # watch 期真实点鼓：零响应
            pg.wait_for_timeout(300)
            st = pg.evaluate('SI.quiz')
            check('watch-phase real tap swallowed (pos stays 0)',
                  st['pos'] == 0 and st['phase'] == 'watch', str(st))
            check('watch-phase tapPad() returns false',
                  pg.evaluate('SI.tapPad(%d)' % q['seq'][0]) is False)
            check('skipWatch() fast-forwards to input',
                  pg.evaluate('SI.skipWatch()') is True and
                  pg.evaluate('SI.quiz.phase') == 'input')
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('answered 5 quizzes by real pointer (len-2 seq each)', n == 10, 'correct taps=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('SI.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_simon")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮(幽灵手指)→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.SI && SI.currentLevel', timeout=8000)
            pg.wait_for_function("SI.tutorial === 'watch'", timeout=5000)
            q0 = pg.evaluate('SI.quiz')
            swallowed = pg.evaluate('SI.tapPad(%d)' % q0['seq'][0]) is False   # 演示期输入全吞
            check('tutorial watch swallows input (locked demo)', swallowed)
            pg.wait_for_function("SI.tutorial === 'help'", timeout=30000)   # 等"看"演示完成（真实演示）
            q = pg.evaluate('SI.quiz')
            check('tutorial watch done -> level reset to quiz 0 (watch phase)',
                  q and q['step'] == 0 and q['phase'] == 'watch' and q['pos'] == 0, str(q))
            wait_input(pg, timeout=12000)
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')",
                                     timeout=5000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> next drum to tap (input phase)', ghost_shown)
            n = play_level(pg, tag='[2b] ')
            check('tutorial level playable -> .k-celebrate', n == 10, 'clicks=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_simon")'))
            check('simon.tutSeen persisted', (saved.get('simon') or {}).get('tutSeen') is True)
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. 第 10 关（flat10，章 3 长 4）：真实演示等待+真实指针通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.SI && SI.currentLevel', timeout=8000)
            lv = pg.evaluate('SI.currentLevel')
            check('ch3 level start at flat=10 (len 4 speed 500)', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            q = pg.evaluate('SI.quiz')
            check('ch3 quiz len 4 keys 0-3 no-triple',
                  q and q['len'] == 4 and len(q['seq']) == 4 and
                  all(0 <= k <= 3 for k in q['seq']) and
                  not any(q['seq'][i] == q['seq'][i+1] == q['seq'][i+2] for i in range(2)) and
                  q['speed'] == 500, str(q))
            n = play_level(pg, tag='[2c] ')
            check('ch3 real-pointer win (len-4 seq x 5 quizzes)', n == 20, 'clicks=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('SI.currentLevel')
            check('ch3 win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            ctx.close()

            # ---- 3. flat≥3 救援钟：真实错点不重置 → 静置 16s 救援（重播序列+si_hint） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.SI && SI.currentLevel', timeout=8000)
            lv = pg.evaluate('SI.currentLevel')
            check('rescue test starts at flat=3 (flat>=3)', lv and lv['flat'] == 3, str(lv))
            pg.evaluate('''() => { window.__rp = [];
              KIDS.voice.play = (k) => { window.__rp.push(k); }; KIDS.voice.queue = () => {}; }''')
            wait_input(pg, timeout=10000)
            pg.wait_for_timeout(2200)            # 开题语音已落地（stub 前不计）
            q = pg.evaluate('SI.quiz')
            wi = next(i for i in range(4) if i != q['seq'][q['pos']])
            t0 = time.time()
            click_pad(pg, wi)                    # t≈+6.6s 真实错点：不重置救援钟（重播重试）
            pg.wait_for_timeout(9500)            # 至 t≈+16.1s：不重置→救援(≤+15s)已来；若重置→+20.6s 仍无
            rec = pg.evaluate('window.__rp')
            rescues = pg.evaluate('SI.rescues')
            el = time.time() - t0
            check('rescue fires ~14s (wrong tap did NOT reset clock; seq replay + si_hint)',
                  rescues >= 1 and 'si_hint' in rec and 'si_wrong' in rec and 'si_replay' in rec,
                  'rescues=%d plays=%s elapsed=%.1fs' % (rescues, rec, el))
            check('rescue visual replay happened (SI.rescues >= 1, pos preserved)',
                  pg.evaluate('SI.rescues') >= 1)
            ctx.close()

            # ---- 4. 双 viewport：overflowX==0 / 触摸目标 ≥64 / 鼓面 4 面 ≥96 / 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.SI && SI.currentLevel', timeout=8000)
                pg.wait_for_timeout(900)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const pads = [...document.querySelectorAll('.pad')].map(c => {
                    const r = c.getBoundingClientRect(); return Math.min(r.width, r.height); });
                  const tip = document.getElementById('tip').getBoundingClientRect();
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad,
                          padMin: pads.length ? Math.round(Math.min(...pads)) : 0,
                          nPads: pads.length, tipH: Math.round(tip.height)};
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64 (excl .k-parentbtn)' % vp, not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d 4 drum pads >=96 (main answer), tip visible' % vp,
                      m['padMin'] >= 96 and m['nPads'] == 4 and m['tipH'] >= 40,
                      'padMin=%s n=%s tipH=%s' % (m['padMin'], m['nPads'], m['tipH']))
                shot = SHOTS / ('simon-vp%dx%d.png' % vp)
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
