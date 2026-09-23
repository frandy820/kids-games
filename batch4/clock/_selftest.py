# -*- coding: utf-8 -*-
"""clock _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk
2a. 预置存档(跳过教学) → 首题先错一次(晃+灰)再答对 → 真实点击通关 → .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看→帮→独 真实链路 → tutSeen 持久化
2c. 章 3 拨针：真实 PointerEvent 拖动（先错拖 retries+1 不推进，再对拖推进通关）+ 首进拨针演示动画
2d. 章 4 经过时间：真实点击通关
3. 双 viewport(1280x800/800x1180)：overflowX==0、触摸目标 ≥64（家长按钮豁免）、钟面 ≥200
4. 全页截图非空白（PIL 像素 stdev>10）
5. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
"""
import json, math, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, dial_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'clock', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'clock': {'tutSeen': tut_seen, 'dialSeen': dial_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_clock", ' + json.dumps(json.dumps(save)) + ')'


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


def drag_minute(page, target_min):
    """真实指针拖动：从钟面 12 点方向按下，扫到目标分钟角度松手（playwright mouse 产生 pointer 事件）"""
    box = page.locator('#clock-zone svg.clock').bounding_box()
    cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    R = box['width'] * 0.38                    # 落点须在钟面内（svg 半径=0.5×宽，取 0.38 稳妥）
    ang = target_min * 6
    a0 = math.radians(0)
    page.mouse.move(cx + math.sin(a0) * R, cy - math.cos(a0) * R)
    page.mouse.down()
    for step in range(1, 13):                    # 分 12 步扫过去（真实 pointermove 序列）
        a = math.radians(ang * step / 12)
        page.mouse.move(cx + math.sin(a) * R, cy - math.cos(a) * R)
        page.wait_for_timeout(20)
    page.mouse.move(cx + math.sin(math.radians(ang)) * R, cy - math.cos(math.radians(ang)) * R)
    page.mouse.up()


def play_click(page, first_wrong=False):
    """真实点击答完当前关（read/elapsed 题）；first_wrong=首题先点一次错误项"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = page.evaluate('CLK.quiz')
        if q is None:
            break
        if not wrong_done:
            widx = next(i for i, v in enumerate(q['items']) if i != q['answer'])
            page.click('.opt[data-i="%d"]' % widx)
            page.wait_for_timeout(700)
            grayed = page.evaluate('!!document.querySelector(".opt[data-i=\\"%d\\"].wrong")' % widx)
            check('wrong pick: shake+gray (zero penalty)', grayed)
            wrong_done = True
            continue
        page.click('.opt[data-i="%d"]' % q['answer'])
        answered += 1
        page.wait_for_timeout(1100)              # > 答对推进窗口 880ms
    page.wait_for_selector('.k-celebrate', timeout=9000)
    return answered


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
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=15000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s dist=%s' % (vj['pass'], vj['total'], vj['dist']))
            ctx.close()

            # ---- 2a. 预置存档：错题路径 + 真实点击通关（2 星） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, dial_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.CLK && CLK.currentLevel', timeout=8000)
            lv = pg.evaluate('CLK.currentLevel')
            check('start at 1-0 (ch 1-based, read)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('CLK.tutorial') == 'none')
            play_click(pg, first_wrong=True)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 retry)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('CLK.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_clock")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, dial_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.CLK && CLK.currentLevel', timeout=8000)
            pg.wait_for_function("CLK.tutorial === 'help'", timeout=15000)   # 等"看"演示完成
            q = pg.evaluate('CLK.quiz')
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and q['type'] == 'read', str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> correct option', ghost_shown)
            play_click(pg)                       # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate', True)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_clock")'))
            check('clock.tutSeen persisted', (saved.get('clock') or {}).get('tutSeen') is True, str(saved.get('clock')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. 章 3 拨针：首进演示 + 真实 PointerEvent 拖动（先错后对通关） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, dial_seen=False, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c-demo')
            pg.goto(URL)
            pg.wait_for_function('window.CLK && CLK.currentLevel', timeout=8000)
            lv = pg.evaluate('CLK.currentLevel')
            check('dial level start at flat=10 (ch3)', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            pg.wait_for_function("CLK.tutorial === 'help'", timeout=20000)   # 等"看"拨针演示动画放完
            check('dial demo (watch) done -> help', True)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_clock")'))
            check('clock.dialSeen persisted after demo', (saved.get('clock') or {}).get('dialSeen') is True,
                  str(saved.get('clock')))
            # 错拖：+10 分钟刻度 → retries+1 不推进 + 摆动
            q = pg.evaluate('CLK.quiz')
            t = q['targetMin']
            w = (t + 10) % 60
            drag_minute(pg, w)
            pg.wait_for_timeout(400)
            st = pg.evaluate('CLK.currentLevel')
            check('wrong drag: retries+1, no advance', st['retries'] == 1 and st['step'] == 0, str(st))
            # 对拖：扫到目标刻度 → 推进；逐题拖完通关
            for k in range(5):
                q = pg.evaluate('CLK.quiz')
                if q is None:
                    break
                drag_minute(pg, q['targetMin'])
                pg.wait_for_timeout(300)
                ro = pg.locator('#dial-readout').text_content()
                card_ok = pg.evaluate('!!document.querySelector(".clock-card.ok")')
                check('correct drag #%d: readout=target + ok flash' % (k + 1),
                      ro == '%d:%02d' % (q['clockMin'] // 60 if q['clockMin'] // 60 else 12, q['clockMin'] % 60) and card_ok,
                      'readout=%s target=%s ok=%s' % (ro, q['clockMin'], card_ok))
                pg.wait_for_timeout(1000)        # > 推进窗口 880ms
            pg.wait_for_selector('.k-celebrate', timeout=9000)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('dial real-drag win -> 2 stars (1 wrong release)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('CLK.currentLevel')
            check('dial win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_clock")'))
            check('save 3-0 recorded', '3-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2d. 章 4 经过时间：真实点击通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, dial_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.CLK && CLK.currentLevel', timeout=8000)
            lv = pg.evaluate('CLK.currentLevel')
            check('elapsed level start at flat=15 (ch4)', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            q = pg.evaluate('CLK.quiz')
            two = pg.evaluate('document.querySelectorAll("#clock-zone svg.clock").length')
            check('elapsed: two clocks rendered', two == 2 and q['type'] == 'elapsed', 'clocks=%d' % two)
            n = play_click(pg)
            check('elapsed real-click win', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('CLK.currentLevel')
            check('elapsed win proceeds to flat=16', lv2 and lv2['flat'] == 16, str(lv2))
            ctx.close()

            # ---- 3+4. 双 viewport：overflowX==0、触摸目标 ≥64、钟面 ≥200、截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, dial_seen=True, done_flats=range(15), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.CLK && CLK.currentLevel', timeout=8000)
                pg.wait_for_timeout(900)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button, [data-i], .k-btn').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.className || e.tagName) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const clk = document.querySelector('#clock-zone svg.clock');
                  const cr = clk ? clk.getBoundingClientRect() : {width: 0, height: 0};
                  const opts = [...document.querySelectorAll('.opt')].map(b => b.getBoundingClientRect());
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad,
                          clkW: Math.round(cr.width), clkH: Math.round(cr.height),
                          optW: opts.length ? Math.round(Math.min(...opts.map(r => r.width))) : 0};
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64' % vp, not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d clock >=200 / opts >=96' % vp,
                      m['clkW'] >= 200 and m['clkH'] >= 200 and m['optW'] >= 96,
                      'clk=%dx%d optW=%d' % (m['clkW'], m['clkH'], m['optW']))
                shot = SHOTS / ('clock-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d non-blank (stdev>10)' % vp, ok, detail)
                if ok:
                    shot.unlink()
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
