# -*- coding: utf-8 -*-
"""logicwho _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk
2a. 预置存档(跳过教学) → 真实 pointer：首题错点（晃动+关键线索卡高亮）→ 点对（座位揭幕+跳）
    → 通关 .k-celebrate 2 星 → 写档 kidsgame_logicwho
2b. flat10（ch3 位置线索）真实点击通关
2c. 全新存档 → 教学 看→帮→独 真实链路（__lwDemoR==='right'）→ logicwho.tutSeen 持久化
3. 双 viewport(1280x800/800x1180)：overflowX==0、动物卡 ≥96、全按钮 ≥64、截图非空白
4. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
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
        'v': '1.0', 'game': 'logicwho', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'logicwho': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_logicwho", ' + json.dumps(json.dumps(save)) + ')'


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


def tap_idx(page, sel):
    box = page.locator(sel).bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    page.wait_for_timeout(120)


def play_level(page, first_wrong=False):
    """真实 pointer 点击通关当前关：每轮取 LW.quiz，先可选错点一次再点正确动物卡。
    每次点对后等演出窗收尾（locked 解除或 won）再取下一题（引擎同步推进但 UI 演出 1.75s）。"""
    wrong_seen = not first_wrong
    quizzes = 0
    for _ in range(120):
        q = page.evaluate('LW.quiz')
        if q is None:
            break
        if not wrong_seen:
            wi = next(i for i in range(3) if q['choices'][i] != q['answerAnimal'])
            tap_idx(page, '.card[data-i="%d"]' % wi)
            page.wait_for_timeout(900)
            wig = page.evaluate('!!document.querySelector(".card.wig")')
            clue_flash = page.evaluate('!!document.querySelector(".clue.flash")')
            check('wrong tap: wiggle + key clue flash, zero penalty',
                  wig and clue_flash and page.evaluate('LW.currentLevel.misses === 1'))
            wrong_seen = True
            continue
        ri = q['choices'].index(q['answerAnimal'])
        tap_idx(page, '.card[data-i="%d"]' % ri)
        quizzes += 1
        page.wait_for_function('!LW.currentLevel.locked || LW.currentLevel.won', timeout=6000)
        page.wait_for_timeout(150)
    return quizzes


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        # ---- 1. verify=1 ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        reqs = []
        page.on('request', lambda r: reqs.append(r.url))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.indexOf('VERIFY') === 0", timeout=30000)
        title = page.title()
        vr = page.evaluate('JSON.parse(document.getElementById("verify-result").textContent)')
        check('verify title PASS', title.startswith('VERIFY PASS'), title)
        check('verify pass==total', vr['pass'] == vr['total'], '%s/%s' % (vr['pass'], vr['total']))
        check('verify layoutOk', vr['layoutOk'])
        offline1 = [u for u in reqs if u.startswith('http://') or u.startswith('https://')]
        check('verify page offline (no http/s)', not offline1, offline1[:3])
        page.screenshot(path=str(SHOTS / 'verify.png'))

        # ---- 2a. 预置存档：真实点击通关第 1 关（首题一错） ----
        ctx2 = browser.new_context(viewport={'width': 1280, 'height': 800})
        page2 = ctx2.new_page()
        err2 = []
        page2.on('pageerror', lambda e: err2.append(str(e)))
        req2 = []
        page2.on('request', lambda r: req2.append(r.url))
        page2.add_init_script(preset_save(tut_seen=True))
        page2.goto(URL)
        page2.wait_for_selector('.card', timeout=10000)
        n = play_level(page2, first_wrong=True)
        check('flat0 real-tap level done (5 quizzes)', n == 5, 'quizzes=%s' % n)
        page2.wait_for_selector('.k-celebrate', timeout=8000)
        check('flat0 celebrate appears', page2.locator('.k-celebrate').count() == 1)
        page2.wait_for_timeout(3200)                       # celebrate 2.3s + 缓冲 → 推进 flat1
        cur = page2.evaluate('LW.currentLevel')
        check('level 1-0 written & advanced', cur and cur['flat'] == 1,
              'flat=%s' % (cur or {}).get('flat'))
        saved = page2.evaluate('JSON.parse(localStorage.getItem("kidsgame_logicwho"))')
        check('stars persisted (1 miss=2star)', saved['levels'].get('1-0', {}).get('stars') == 2,
              saved['levels'].get('1-0'))
        offline2 = [u for u in req2 if u.startswith('http://') or u.startswith('https://')]
        check('game page offline', not offline2, offline2[:3])

        # ---- 2b. flat10（ch3）真实点击通关 ----
        page2.evaluate('LW.start(10)')
        page2.wait_for_timeout(300)
        q10 = page2.evaluate('LW.quiz')
        has_pos = any(c['t'] in ('rel', 'abs') for c in q10['clues'])
        check('flat10 ch3 has position clues', has_pos, [c['t'] for c in q10['clues']])
        n10 = play_level(page2)
        page2.wait_for_function('LW.currentLevel.won', timeout=6000)    # 末题 winFlow 在演出窗后
        c10 = page2.evaluate('LW.currentLevel')
        check('flat10 real-tap done 3star', n10 == 5 and c10['done'] and c10['won'] and c10['misses'] == 0, c10)

        # ---- 2c. 全新存档：教学 看→帮→独 真实链路 ----
        ctx3 = browser.new_context(viewport={'width': 1280, 'height': 800})
        page3 = ctx3.new_page()
        err3 = []
        page3.on('pageerror', lambda e: err3.append(str(e)))
        page3.goto(URL)
        page3.wait_for_selector('.card', timeout=10000)
        page3.wait_for_function('LW.tutorial === "help"', timeout=20000)   # 看演完自动交接到帮
        demo_r = page3.evaluate('window.__lwDemoR')
        check('tutorial demo real effect (__lwDemoR)', demo_r == 'right', demo_r)
        dim_gone = page3.evaluate('!document.querySelector(".card.dim")')
        check('tutorial handoff: no dim residue', dim_gone)
        q3 = page3.evaluate('LW.quiz')
        ri3 = q3['choices'].index(q3['answerAnimal'])
        tap_idx(page3, '.card[data-i="%d"]' % ri3)         # 独：首次答对放手
        page3.wait_for_timeout(300)
        t3 = page3.evaluate('LW.tutorial')
        check('tutorial solo after first right', t3 == 'solo', t3)
        sv3 = page3.evaluate('JSON.parse(localStorage.getItem("kidsgame_logicwho"))')
        check('tutSeen persisted', sv3.get('logicwho', {}).get('tutSeen') is True)

        # ---- 2d. 救援 14s：静置真实触发（问句重读+正确动物卡 breathe） ----
        page2.wait_for_timeout(2600)                     # flat10 celebrate 收尾
        page2.evaluate('LW.start(0)')
        page2.wait_for_timeout(400)
        r0 = page2.evaluate('LW.rescues')
        page2.wait_for_timeout(15500)                    # 静置 >14s（救援钟 14s 阈值）
        r1 = page2.evaluate('LW.rescues')
        breathe = page2.evaluate('!!document.querySelector(".card.breathe")')
        check('rescue fires after 14s idle (ask replay + answer card breathe)',
              r0 == 0 and r1 >= 1 and breathe, 'rescues=%s->%s breathe=%s' % (r0, r1, breathe))

        # ---- 3. 双 viewport 布局 ----
        for w, h in [(1280, 800), (800, 1180)]:
            pv = browser.new_context(viewport={'width': w, 'height': h})
            pg = pv.new_page()
            pg.add_init_script(preset_save(tut_seen=True))
            pg.goto(URL)
            pg.wait_for_selector('.card', timeout=10000)
            m = pg.evaluate('''() => {
              const g = document.getElementById('game');
              const ox = Math.max(g.scrollWidth - g.clientWidth,
                document.documentElement.scrollWidth - document.documentElement.clientWidth);
              const cards = [...document.querySelectorAll('.card')].map(b => b.getBoundingClientRect());
              const cardOk = cards.length === 3 && cards.every(r => r.width >= 96 && r.height >= 96);
              let btnOk = true;
              document.querySelectorAll('button').forEach(b => {
                if (b.classList.contains('k-parentbtn')) return;
                const r = b.getBoundingClientRect();
                if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
              });
              return { ox, cardOk, btnOk };
            }''')
            shot = SHOTS / ('game_%dx%d.png' % (w, h))
            pg.screenshot(path=str(shot))
            nb, detail = png_nonblank(shot)
            check('layout %dx%d: ox=0 cards>=96 btns>=64' % (w, h),
                  m['ox'] == 0 and m['cardOk'] and m['btnOk'], 'ox=%s cardOk=%s btnOk=%s' %
                  (m['ox'], m['cardOk'], m['btnOk']))
            check('screenshot %dx%d non-blank' % (w, h), nb, detail)
            pv.close()

        check('0 pageerror (all pages)', not errors and not err2 and not err3,
              (errors + err2 + err3)[:3])
        browser.close()

    bad = [r for r in RESULTS if not r[1]]
    print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(bad), len(RESULTS)))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(run())
