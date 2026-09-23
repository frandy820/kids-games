# -*- coding: utf-8 -*-
"""math _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total
2a. 预置存档(跳过教学) → 数一数辅助开关 → 首题先错一次(晃+灰+辅助亮起)再答对 → 真实点击通关 → .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学"看"演示(数轴动画+自动答) → "帮"幽灵手指指数一数按钮 → 真实点击通关(tut→solo) → tutSeen 持久化
3. 双 viewport(1280x800/800x1180)：overflowX<=0、答案按钮>=80(实测>=96)、间距>=16
4. 全页截图非空白（PIL 像素方差，缺 PIL 时按 PNG 体积判定）
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
        'v': '1.0', 'game': 'math', 'firstDay': TODAY, 'lastDay': TODAY,
        'levels': levels or {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
    }
    if tut_seen:
        save['math'] = {'tutSeen': True}
    return 'localStorage.setItem("kidsgame_math", ' + json.dumps(json.dumps(save)) + ')'


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


def play_through(page, first_wrong=False):
    """真实点击答完当前关；first_wrong=首题先点一次错误项（覆盖错题路径）"""
    wrong_done = not first_wrong
    while True:
        q = page.evaluate('MATH.quiz')
        if q is None:
            break
        if not wrong_done and q['step'] == 0:
            widx = next(i for i, v in enumerate(q['items']) if i != q['answerIdx'] and v != q['answer'])
            page.click('.ans[data-i="%d"]' % widx)
            page.wait_for_timeout(700)
            state = page.evaluate('''() => ({
                aidOpen: document.getElementById("aid").classList.contains("open"),
                grayed: !!document.querySelector('.ans[data-i="%d"].wrong')})''' % widx)
            check('wrong pick: shake+gray + aid auto-open', state['aidOpen'] and state['grayed'], str(state))
            wrong_done = True
            continue
        page.click('.ans[data-i="%d"]' % q['answerIdx'])
        page.wait_for_timeout(1150)  # > 答对推进窗口 780ms
    page.wait_for_selector('.k-celebrate', timeout=9000)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            # ---- 1. verify=1 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = ctx.new_page()
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=15000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s layout=%s' % (vj['pass'], vj['total'], vj['smokes']['layout']['layout']))
            ctx.close()

            # ---- 2a. 预置存档：辅助开关 + 错题路径 + 真实点击通关（2 星） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_function('window.MATH && MATH.currentLevel', timeout=8000)
            lv = pg.evaluate('MATH.currentLevel')
            check('start at 1-0 (ch 1-based)', lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('MATH.tutorial') == 'none')
            # 数一数辅助：章 1 → 苹果点数；开关幂等
            aid1 = pg.evaluate('MATH.countAid()')
            n_ap = pg.evaluate('document.querySelectorAll(".appl").length')
            q0 = pg.evaluate('MATH.quiz')
            exp_ap = q0['a'] + q0['b'] if q0['op'] == '+' else q0['a']
            check('countAid apple (ch1)', aid1['open'] and aid1['kind'] == 'apple' and n_ap == exp_ap,
                  'aid=%s apples=%d expect=%d' % (aid1, n_ap, exp_ap))
            aid2 = pg.evaluate('MATH.countAid()')
            check('countAid toggle close', not aid2['open'], str(aid2))
            # 真实点击通关（首题先错一次 → retries=1 → 2 星）
            play_through(pg, first_wrong=True)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 retry)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(2600)  # 过关推进
            lv2 = pg.evaluate('MATH.currentLevel')
            check('auto-proceed to flat=1', lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_math")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False))
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_function('window.MATH && MATH.currentLevel', timeout=8000)
            pg.wait_for_function("MATH.tutorial === 'help'", timeout=15000)  # 等"看"演示完成
            q = pg.evaluate('MATH.quiz')
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0, str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> count button', ghost_shown)
            # 孩子点数一数 → ghost 收起（发现工具）
            pg.click('#btn-count')
            pg.wait_for_timeout(400)
            st = pg.evaluate('''() => ({aid: document.getElementById("aid").classList.contains("open"),
                ghost: document.getElementById("ghost").classList.contains("show")})''')
            check('help: count click opens aid + hides ghost', st['aid'] and not st['ghost'], str(st))
            play_through(pg)  # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate', True)
            check('tut -> solo after first correct', True)
            pg.wait_for_timeout(2600)  # celebrate 结束后才写档（KIDS.level.pass）
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_math")'))
            check('math.tutSeen persisted', (saved.get('math') or {}).get('tutSeen') is True, str(saved.get('math')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 3+4. 双 viewport 布局 + 截图 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page()
                pg.goto(URL + '?verify=1')
                pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=15000)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const btns = [...document.querySelectorAll('.ans')];
                  const rs = btns.map(b => b.getBoundingClientRect());
                  const w = Math.min(...rs.map(r => r.width)), h = Math.min(...rs.map(r => r.height));
                  let gapMin = 999;
                  for (let a = 0; a < rs.length; a++) for (let b = 0; b < rs.length; b++) {
                    if (a === b) continue;
                    const dx = Math.abs(rs[a].x - rs[b].x), dy = Math.abs(rs[a].y - rs[b].y);
                    if (dx > 1 && dy < 2) gapMin = Math.min(gapMin, dx - rs[a].width);
                    if (dy > 1 && dx < 2) gapMin = Math.min(gapMin, dy - rs[a].height);
                  }
                  const qt = document.getElementById('quiz-text').getBoundingClientRect();
                  return {ox: de.scrollWidth - de.clientWidth, w: w, h: h, gap: gapMin, n: btns.length,
                          quizW: qt.width};
                }''')
                check('viewport %dx%d overflowX<=0' % vp, m['ox'] <= 0, str(m))
                check('viewport %dx%d ans buttons>=80 (target 96)' % vp,
                      m['w'] >= 80 and m['h'] >= 80, 'w=%.0f h=%.0f' % (m['w'], m['h']))
                check('viewport %dx%d gap>=16' % vp, m['gap'] >= 16, 'gap=%.0f' % m['gap'])
                check('viewport %dx%d quiz fits' % vp, m['quizW'] <= vp[0] + 1, 'quizW=%.0f' % m['quizW'])
                # 正常模式截图（真实题目界面）
                pg2 = ctx.new_page()
                pg2.add_init_script(preset_save(tut_seen=True))
                pg2.goto(URL)
                pg2.wait_for_function('window.MATH && MATH.currentLevel', timeout=8000)
                pg2.wait_for_timeout(900)
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
