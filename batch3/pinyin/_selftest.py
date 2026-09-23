# -*- coding: utf-8 -*-
"""pinyin _selftest — headless playwright 自测（不弹窗/不连已开浏览器/不杀任何进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total
2a. 预置存档(跳过教学) → PYI.quiz 取答案 → page.click 真实点击通关 → .k-celebrate → 3星写档 → 推进
2b. 全新存档 → 教学"看"演示自动完成 → "帮"阶段 ghost 可见 → 真实点击通关 → tutSeen 持久化
3. 双 viewport(1280x800/800x1180)：overflowX<=0、车厢>=96、间距>=16、重听>=80
4. 全页截图非空白（PIL 可用时做像素方差检查，否则按 PNG 体积判定）
"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE / 'index.html').as_uri()
TODAY = time.strftime('%Y-%m-%d')
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))


def preset_save(tut_seen=True, levels=None):
    save = {
        'v': '1.0', 'game': 'pinyin', 'firstDay': TODAY, 'lastDay': TODAY,
        'levels': levels or {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': False, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
    }
    if tut_seen:
        save['py'] = {'tutSeen': True}
    return 'localStorage.setItem("kidsgame_pinyin", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path):
    try:
        from PIL import Image
        import statistics
        im = Image.open(path).convert('L').resize((160, 100))
        px = list(im.getdata())
        return statistics.pstdev(px) > 4, 'PIL pixel stdev=%.1f' % statistics.pstdev(px)
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL 不可用，按体积判定)' % n


def click_through(page):
    """读 PYI.quiz 答案逐题真实点击，直到 quiz 为空，等待 .k-celebrate"""
    steps = 0
    while steps < 12:
        quiz = page.evaluate('PYI.quiz')
        if quiz is None:
            break
        page.click('.car[data-i="%d"]' % quiz['answer'])
        steps += 1
        page.wait_for_timeout(1250)  # > 答对演出 900ms，防连点被锁
    page.wait_for_selector('.k-celebrate', timeout=8000)
    return steps


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()  # 无头全新实例，绝不触碰用户/并行浏览器
        try:
            # ---- 1. verify=1 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = ctx.new_page()
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=10000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s layoutOk=%s' % (vj['pass'], vj['total'], vj['layoutOk']))
            units = vj['units']
            check('syllib twoPin ~120-130 legal', 120 <= units['twoPin']['count'] <= 130 and units['twoPin']['ok'],
                  str(units['twoPin']))
            check('syllib ztr 16', units['ztr']['count'] == 16 and units['ztr']['ok'], str(units['ztr']))
            check('autoSolve all 25 stars==3',
                  all(v['stars'] == 3 and v['retries'] == 0 for v in vj['auto'].values()),
                  'n=%d' % len(vj['auto']))
            ctx.close()

            # ---- 2a. 预置存档跳过教学，真实点击通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_function('window.PYI && PYI.quiz !== null', timeout=8000)
            lv = pg.evaluate('PYI.currentLevel')
            check('start at 1-0 (ch 1-based)', lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('PYI.tutorial') == 'none')
            n_q = lv['n']
            steps = click_through(pg)
            check('real-click win -> .k-celebrate', True, '%d questions, %d clicks' % (n_q, steps))
            star_html = pg.locator('.k-celebrate .k-star').count()
            check('celebrate shows 3 stars (0-retry perfect)', star_html == 3, 'stars=%d' % star_html)
            pg.wait_for_timeout(2600)  # 过关推进（celebrate 1.7s + 后续）
            lv2 = pg.evaluate('PYI.currentLevel')
            check('auto-proceed to next level', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_pinyin")'))
            check('save 1-0 recorded (3 stars)', saved['levels'].get('1-0', {}).get('stars') == 3,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学"看→帮"真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False))
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_function('window.PYI && PYI.quiz !== null', timeout=8000)
            pg.wait_for_function("PYI.tutorial === 'help'", timeout=15000)  # 等"看"演示(~3.5s)完成
            idx = pg.evaluate('PYI.currentLevel.idx')
            check('tutorial watch done -> level reset for help (idx==0)', idx == 0, 'idx=%s' % idx)
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost visible', ghost_shown)
            click_through(pg)
            check('tutorial level playable -> .k-celebrate', True)
            pg.wait_for_timeout(3000)  # celebrate 1.7s 后才异步写档
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_pinyin")'))
            check('py.tutSeen persisted', (saved.get('py') or {}).get('tutSeen') is True, str(saved.get('py')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels'].keys()))
            ctx.close()

            # ---- 3+4. 双 viewport 布局 + 截图（verify 页实建 4 选项最密布局） ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page()
                pg.goto(URL + '?verify=1')
                pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=10000)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const cars = [...document.querySelectorAll('.car')];
                  const rs = cars.map(c => c.getBoundingClientRect());
                  const w = Math.min(...rs.map(r => r.width)), h = Math.min(...rs.map(r => r.height));
                  let gapMin = 999;
                  for (let a = 0; a < rs.length; a++) for (let b = 0; b < rs.length; b++) {
                    if (a === b) continue;
                    const dx = Math.abs(rs[a].x - rs[b].x), dy = Math.abs(rs[a].y - rs[b].y);
                    if (dx > 1 && dy < 2) gapMin = Math.min(gapMin, dx - rs[a].width);
                    if (dy > 1 && dx < 2) gapMin = Math.min(gapMin, dy - rs[a].height);
                  }
                  const hear = document.getElementById('btn-hear').getBoundingClientRect();
                  return {ox: de.scrollWidth - de.clientWidth, carW: w, carH: h, gap: gapMin,
                          hearW: hear.width, hearH: hear.height, n: cars.length};
                }''')
                check('viewport %dx%d overflowX<=0' % vp, m['ox'] <= 0, str(m))
                check('viewport %dx%d cars>=96' % vp, m['carW'] >= 96 and m['carH'] >= 96,
                      'w=%.0f h=%.0f' % (m['carW'], m['carH']))
                check('viewport %dx%d gap>=16 hear>=80' % vp,
                      m['gap'] >= 16 and m['hearW'] >= 80 and m['hearH'] >= 80,
                      'gap=%.0f hear=%.0fx%.0f' % (m['gap'], m['hearW'], m['hearH']))
                # 正常模式截图（预置存档跳教学，真实题面）
                pg2 = ctx.new_page()
                ctx.add_init_script(preset_save(tut_seen=True))
                pg2.goto(URL)
                pg2.wait_for_function('window.PYI && PYI.quiz !== null', timeout=8000)
                pg2.wait_for_timeout(800)
                shot = HERE / ('_shot_%dx%d.png' % vp)
                pg2.screenshot(path=str(shot), full_page=True)
                ok, detail = png_nonblank(shot)
                check('screenshot %dx%d non-blank' % vp, ok, detail)
                if ok:
                    shot.unlink()
                ctx.close()
        finally:
            browser.close()

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
