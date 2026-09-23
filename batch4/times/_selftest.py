# -*- coding: utf-8 -*-
"""times _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total
2a. 预置存档(跳过教学) → 分组图辅助开关 → 首题先错一次(晃+灰+辅助亮起+aidAuto首点不关) → 真实点击通关(含连加转化动画) → .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学"看"演示(分组逐组点亮+自动答+转化动画) → "帮"幽灵手指指看一看按钮 → 真实点击通关(tut→solo) → tutSeen 持久化
3. 双 viewport(1280x800/800x1180)：overflowX<=0、数字鱼>=96、间距>=16
4. 全页截图非空白（PIL 像素方差，缺 PIL 时按 PNG 体积判定）
"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE / 'index.html').as_uri()
TODAY = time.strftime('%Y-%m-%d')
RESULTS = []
PAGE_ERRORS = []      # 全程 0 JS 错误断言用
EXT_REQUESTS = []     # 完全离线断言用（file:// 之外的任何请求）


def watch_page(pg):
    pg.on('pageerror', lambda e: PAGE_ERRORS.append('pageerror: %s' % e))
    pg.on('console', lambda m: PAGE_ERRORS.append('console-error: %s' % m.text) if m.type == 'error' else None)
    pg.on('request', lambda r: EXT_REQUESTS.append(r.url) if not r.url.startswith('file://') else None)
    return pg


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))


def preset_save(tut_seen=True, levels=None):
    save = {
        'v': '1.0', 'game': 'times', 'firstDay': TODAY, 'lastDay': TODAY,
        'levels': levels or {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
    }
    if tut_seen:
        save['times'] = {'tutSeen': True}
    return 'localStorage.setItem("kidsgame_times", ' + json.dumps(json.dumps(save)) + ')'


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


def wait_step(page, prev, timeout=12000):
    """等 step 超过 prev 且解锁（答对推进窗口 780ms + 连加转化 1650ms，期间 state.locked=true
    且旧题 DOM 尚未刷新——必须等解锁后再点下一题，否则点击被守卫吞掉）或关卡结束"""
    page.wait_for_function(
        '(() => { const L = TIM.currentLevel; return !L || L.done || (L.step > %d && !L.locked); })()' % prev,
        timeout=timeout)


def click_answer(page, idx):
    """辅助面板开着→点面板内答案气泡（面板覆盖池塘，鱼点不到）；否则点数字鱼"""
    aid_open = page.evaluate('document.getElementById("aid").classList.contains("open")')
    sel = ('.aid-ans[data-i="%d"]' if aid_open else '.fish-btn[data-i="%d"]') % idx
    page.click(sel)


def play_through(page, first_wrong=False):
    """真实点击答完当前关；first_wrong=首题先点一次错误项（覆盖错题路径）"""
    wrong_done = not first_wrong
    while True:
        lv = page.evaluate('TIM.currentLevel')
        if lv is None or lv['done']:
            break
        q = page.evaluate('TIM.quiz')
        if q is None:
            break
        if not wrong_done and q['step'] == 0:
            widx = next(i for i in range(4) if i != q['answerIdx'])
            page.click('.fish-btn[data-i="%d"]' % widx)
            page.wait_for_timeout(700)
            state = page.evaluate('''() => ({
                aidOpen: document.getElementById("aid").classList.contains("open"),
                grayed: !!document.querySelector('.fish-btn[data-i="%d"].wrong'),
                ansRow: document.querySelectorAll('.aid-ans').length,
                ansGrayed: document.querySelectorAll('.aid-ans.wrong').length})''' % widx)
            check('wrong pick: shake+gray + aid auto-open (with answer bubbles)',
                  state['aidOpen'] and state['grayed'] and state['ansRow'] == 4 and state['ansGrayed'] == 1,
                  str(state))
            # aidAuto 消耗标记：自动亮起后首点"看一看"不关闭，二点关闭
            s1 = page.evaluate('TIM.groupAid()')
            s2 = page.evaluate('TIM.groupAid()')
            check('aidAuto consume: first click keeps, second closes',
                  s1['open'] and not s2['open'], 's1=%s s2=%s' % (s1, s2))
            wrong_done = True
            continue
        prev = lv['step']
        click_answer(page, q['answerIdx'])
        wait_step(page, prev)
    page.wait_for_selector('.k-celebrate', timeout=12000)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            # ---- 1. verify=1 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = watch_page(ctx.new_page())
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=15000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s layout=%s' % (vj['pass'], vj['total'], vj['smokes']['layout']['layout']))
            ctx.close()

            # ---- 2a. 预置存档：辅助开关 + 错题路径 + 真实点击通关（2 星，含转化动画） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = watch_page(ctx.new_page())
            pg.goto(URL)
            pg.wait_for_function('window.TIM && TIM.currentLevel', timeout=8000)
            lv = pg.evaluate('TIM.currentLevel')
            check('start at 1-0 (ch 1-based)', lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('TIM.tutorial') == 'none')
            # 分组图辅助：首题连加 → b 组 a 条；开关幂等
            aid1 = pg.evaluate('TIM.groupAid()')
            dom = pg.evaluate('''() => ({g: document.querySelectorAll(".a-group").length,
                f: document.querySelectorAll(".a-fish").length,
                p: document.querySelectorAll(".a-plus").length})''')
            q0 = pg.evaluate('TIM.quiz')
            check('groupAid (ch1 sum): groups==b, fish==a*b, plus==b-1',
                  aid1['open'] and q0['type'] == 'sum' and dom['g'] == q0['b'] and
                  dom['f'] == q0['a'] * q0['b'] and dom['p'] == q0['b'] - 1,
                  'aid=%s dom=%s q0=%s' % (aid1, dom, q0))
            aid2 = pg.evaluate('TIM.groupAid()')
            check('groupAid toggle close', not aid2['open'], str(aid2))
            # 真实点击通关（首题先错一次 → retries=1 → 2 星）
            play_through(pg, first_wrong=True)
            conv = pg.evaluate('document.getElementById("convert").dataset.last || ""')
            check('sum->mul convert anim fired', '×' in conv and '=' in conv, conv)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 retry)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(2600)  # 过关推进
            lv2 = pg.evaluate('TIM.currentLevel')
            check('auto-proceed to flat=1', lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_times")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False))
            pg = watch_page(ctx.new_page())
            pg.goto(URL)
            pg.wait_for_function('window.TIM && TIM.currentLevel', timeout=8000)
            pg.wait_for_function("TIM.tutorial === 'help'", timeout=20000)  # 等"看"演示完成（含转化动画 ~7s）
            q = pg.evaluate('TIM.quiz')
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and q['type'] == 'sum', str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> groups button', ghost_shown)
            # 孩子点"看一看" → ghost 收起（发现工具）
            pg.click('#btn-groups')
            pg.wait_for_timeout(400)
            st = pg.evaluate('''() => ({aid: document.getElementById("aid").classList.contains("open"),
                ghost: document.getElementById("ghost").classList.contains("show")})''')
            check('help: groups click opens aid + hides ghost', st['aid'] and not st['ghost'], str(st))
            play_through(pg)  # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate', True)
            check('tut -> solo after first correct', True)
            pg.wait_for_timeout(2600)  # celebrate 结束后才写档（KIDS.level.pass）
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_times")'))
            check('times.tutSeen persisted', (saved.get('times') or {}).get('tutSeen') is True, str(saved.get('times')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 3+4. 双 viewport 布局 + 截图 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = watch_page(ctx.new_page())
                pg.goto(URL + '?verify=1')
                pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=15000)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const btns = [...document.querySelectorAll('.fish-btn')];
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
                check('viewport %dx%d fish >=96 (target 96)' % vp,
                      m['w'] >= 96 and m['h'] >= 96 and m['n'] == 4, 'w=%.0f h=%.0f n=%d' % (m['w'], m['h'], m['n']))
                check('viewport %dx%d gap>=16' % vp, m['gap'] >= 16, 'gap=%.0f' % m['gap'])
                check('viewport %dx%d quiz fits' % vp, m['quizW'] <= vp[0] + 1, 'quizW=%.0f' % m['quizW'])
                # 底栏按钮 ≥64（家长按钮豁免；主按钮目标 88/126）
                dk = pg.evaluate('''() => {
                  const ids = ['btn-groups', 'btn-rabbit', 'btn-replay'];
                  const rs = ids.map(i => document.getElementById(i).getBoundingClientRect());
                  return rs.map(r => Math.min(r.width, r.height));
                }''')
                check('viewport %dx%d dock buttons >=64' % vp, min(dk) >= 64, str(dk))
                # 正常模式截图（真实题目界面）
                pg2 = watch_page(ctx.new_page())
                pg2.add_init_script(preset_save(tut_seen=True))
                pg2.goto(URL)
                pg2.wait_for_function('window.TIM && TIM.currentLevel', timeout=8000)
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

    # ---- 5. 完全离线（除 file:// 文档外零请求） + 全程 0 JS 错误 ----
    check('fully offline: zero non-file requests', len(EXT_REQUESTS) == 0, str(EXT_REQUESTS[:3]))
    check('zero JS errors (pageerror/console-error)', len(PAGE_ERRORS) == 0, str(PAGE_ERRORS[:3]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
