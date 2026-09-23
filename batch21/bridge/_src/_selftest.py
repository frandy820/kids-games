# -*- coding: utf-8 -*-
"""bridge _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r9 纠错式玩法（规律纠错双步 + ABCD/AABB 周期 + 色+形双属性）：
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 双 viewport sims 全过
   （60 关审计=30 静态六章+30 生成 + modeled 时长 ≥40s 硬断言 + nextHint/estMs）
2a. 预置存档(跳过教学) → 真实 pointer find 找错(先错一次=零惩罚) → fix 修对 → walk 过河 →
    真实点击通关（child 节奏 wall-clock ≥40s）→ .k-celebrate 2 星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(吞输入)→帮(幽灵手指)→独 真实链路 → bridge.tutSeen 持久化
2c-1. flat10（dch3 abcd）：8 石在场+四色全行内候选+真实双步通关
2c-2. flat15（dch4 aabb）：8 石+两色成对结构+autoSolve
2c-3. flat20（dch5 dual）：色+形双属性+连错 2 次=pattern 提示条浮现（周期色点，
      不指认错石——错石无视觉标记）+真实双步通关
3. 双 viewport(1280x800/800x1180)×(flat0 六石/flat10 八石/flat20 dual 候选态)：overflowX==0、
   石头与候选触摸目标 ≥64（家长按钮豁免）、截图存 _shots/
4. 截图非空白（PIL 像素 stdev>10）
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
        'v': '1.0', 'game': 'bridge', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'bridge': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_bridge", ' + json.dumps(json.dumps(save)) + ')'


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


def tap_stone(page, i):
    box = page.locator('.stone[data-i="%d"]' % i).bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def tap_cand(page, i):
    box = page.locator('.cand[data-ci="%d"]' % i).bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def quiz(page):
    return page.evaluate('BG.quiz')


def wait_step(page, s0, timeout=15000):
    """等 walk 演出完成换题——引擎 step 在修对瞬间同步翻转，但新桥要等 walk 走完
    renderQuiz 才渲染；进度点（#step-dots i.done）只在 renderQuiz 刷新=walk 完成标志。
    末题走 winFlow（celebrate）不刷新进度点，用 done+celebrate 兜底。"""
    for _ in range(int(timeout / 100)):
        lv = page.evaluate('BG.currentLevel')
        dots = page.evaluate("document.querySelectorAll('#step-dots i.done').length")
        if lv and lv['done']:
            return lv
        if lv and lv['step'] > s0 and dots == s0 + 1:
            return lv
        page.wait_for_timeout(100)
    return page.evaluate('BG.currentLevel')


def real_solve(page, first_pause=2200, scan=2500, found_pause=2100):
    """真实 pointer 双步通关当前关：逐题 find 找错（scan 观察窗）→ fix 修对 → walk
    （found_pause 须 > FOUND_MS=1600ms 反馈窗——窗内 locked 门吞点击）"""
    for s in range(5):
        q = quiz(page)
        if q is None:
            return s
        if s == 0:
            page.wait_for_timeout(first_pause)
        page.wait_for_timeout(scan)
        tap_stone(page, q['badPos'])
        page.wait_for_timeout(found_pause)
        q2 = quiz(page)
        if q2 is None:
            return s + 1
        tap_cand(page, q2['candOk'])
        lv = wait_step(page, s)
        if not (lv['step'] > s or lv['done']):
            return -1
        if lv['done']:
            return s + 1
    return 5


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
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=120000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  'n=%d' % len(vj['smokes']['layout']['sims']))
            check('verify 60-level audit all ok (r9 六章/纠错双步/时长>=40s)',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify modeled durMin >= 40000ms (r9 时长硬断言)',
                  vj['units']['dist']['durMin'] >= 40000,
                  'durMin=%sms durMax=%sms levels=%s' % (vj['units']['dist']['durMin'],
                                                         vj['units']['dist']['durMax'],
                                                         vj['units']['dist']['durLevels']))
            check('verify r9 specifics all ok (dualStep/abcd+aabb+dual/nextHint/estMs)',
                  vj['units']['dualStep']['ok'] and vj['smokes']['flat10']['ok'] and
                  vj['smokes']['flat15']['ok'] and vj['smokes']['flat20']['ok'] and
                  vj['units']['dist']['hintOk'] and vj['units']['dist']['estMs'],
                  'dual=%s b1=%s b2=%s b3=%s' % (vj['units']['dualStep']['ok'],
                                                  vj['smokes']['flat10']['ok'],
                                                  vj['smokes']['flat15']['ok'],
                                                  vj['smokes']['flat20']['ok']))
            # r9 新 clip 实体在页内（8 游戏键）
            clips_v = pg.evaluate("""() => {
              const c = (typeof KIDS !== 'undefined' && KIDS.voice && KIDS.voice.clips) || {};
              return Object.keys(c).filter(k => k.indexOf('brg_') === 0)
                .map(k => k + ':' + String(c[k]).slice(0, 22));
            }""")
            check('brg_ clips injected in-page (8 game keys incl fix_q/fix_do/found)',
                  any(x.startswith('brg_fix_q:data:audio/mpeg;base64') for x in clips_v) and
                  any(x.startswith('brg_fix_do:data:audio/mpeg;base64') for x in clips_v) and
                  any(x.startswith('brg_found:data:audio/mpeg;base64') for x in clips_v) and
                  len(clips_v) >= 8, str(sorted(clips_v)))
            ctx.close()

            # ---- 2a. 预置存档：真实双步通关 + 首错零惩罚 + wall-clock ≥40s（child 节奏） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.BG && BG.currentLevel', timeout=8000)
            lv = pg.evaluate('BG.currentLevel')
            check('start at 1-0 (r9 ch1 ab 找错)', lv and lv['ch'] == 1 and lv['flat'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('BG.tutorial') == 'none')
            t0 = time.time()
            # 首错：find 点一块非错石 → wrong 零惩罚（miss=1、phase 仍 find、无提示条）
            q0 = quiz(pg)
            wrong_i = 0 if q0['badPos'] != 0 else 1
            tap_stone(pg, wrong_i)
            pg.wait_for_timeout(1300)             # 1000ms 防重入窗走完
            qw = quiz(pg)
            first_wrong = qw and qw['miss'] == 1 and qw['phase'] == 'find' and \
                not pg.evaluate("document.getElementById('pat-tip').classList.contains('show')")
            check('first find-wrong = zero penalty (phase kept, no tip leak)', bool(first_wrong), str(qw))
            n_done = real_solve(pg)
            elapsed = time.time() - t0
            check('real-click level finished (5 quizzes, wall-clock >=40s child-paced)',
                  n_done == 5 and elapsed >= 40.0, 'quizzes=%d elapsed=%.1fs' % (n_done, elapsed))
            pg.wait_for_selector('.k-celebrate', timeout=10000)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 retry)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)             # celebrate 收起+写档+推进
            lv3 = pg.evaluate('BG.currentLevel')
            check('auto-proceed to flat=1', lv3 and lv3['flat'] == 1, str(lv3))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_bridge")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.BG && BG.currentLevel', timeout=8000)
            pg.wait_for_function("BG.tutorial === 'watch'", timeout=5000)
            swallowed = pg.evaluate('BG.tapStone(0)') is False   # 演示期真实/hook 输入全吞
            check('tutorial watch swallows input (locked demo)', swallowed)
            pg.wait_for_function("BG.tutorial === 'help'", timeout=60000)  # 等演示（双步+walk 演出）
            q = quiz(pg)
            check('tutorial watch done -> level reset to quiz 0 find', q and q['step'] == 0 and
                  q['phase'] == 'find', str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> next action target', ghost_shown)
            a = pg.evaluate('BG.autoSolve()')     # "帮"首次找对→"独"，继续通关
            lvb = pg.evaluate('BG.currentLevel')
            check('tutorial level playable -> done (autoSolve)', a and a['done'] and lvb['done'], str(a))
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_bridge")'))
            check('bridge.tutSeen persisted', (saved.get('bridge') or {}).get('tutSeen') is True, str(saved.get('bridge')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c-1. flat10（dch3 abcd）：8 石+四色+候选全行内+真实双步通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c1')
            pg.goto(URL)
            pg.wait_for_function('window.BG && BG.currentLevel', timeout=8000)
            lv = pg.evaluate('BG.currentLevel')
            check('dch3 level start at flat=10 (abcd)', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            q = quiz(pg)
            n8 = pg.evaluate("document.querySelectorAll('#stones .stone').length")
            row_colors = {s['color'] for s in q['stones']}
            check('abcd quiz: 8 stones + 4 colors in-row', q['kind'] == 'abcd' and n8 == 8 and
                  len(row_colors) == 4, 'kind=%s n=%d colors=%d' % (q['kind'], n8, len(row_colors)))
            t0c = time.time()
            n_done = real_solve(pg)
            check('abcd real dual-step win (5 quizzes)', n_done == 5, 'done=%d' % n_done)
            ctx.close()

            # ---- 2c-2. flat15（dch4 aabb）：8 石两色+autoSolve ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c2')
            pg.goto(URL)
            pg.wait_for_function('window.BG && BG.currentLevel', timeout=8000)
            lv = pg.evaluate('BG.currentLevel')
            check('dch4 level start at flat=15 (aabb)', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            q = quiz(pg)
            row_colors = {s['color'] for s in q['stones']}
            check('aabb quiz: 8 stones + 2 colors paired', q['kind'] == 'aabb' and
                  len(q['stones']) == 8 and len(row_colors) == 2)
            a = pg.evaluate('BG.autoSolve()')
            lvc = pg.evaluate('BG.currentLevel')
            check('aabb autoSolve win (0 retry -> 3 stars)', a['done'] and lvc['done'] and
                  lvc['retries'] == 0, str(lvc))
            ctx.close()

            # ---- 2c-3. flat20（dch5 dual）：双属性+miss2 提示条不指认+真实双步通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(20), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c3')
            pg.goto(URL)
            pg.wait_for_function('window.BG && BG.currentLevel', timeout=8000)
            lv = pg.evaluate('BG.currentLevel')
            check('dch5 level start at flat=20 (dual)', lv and lv['flat'] == 20 and lv['dch'] == 5, str(lv))
            q = quiz(pg)
            check('dual quiz: stones carry color+shape', q['kind'] == 'dual' and
                  all(s['shape'] in ('square', 'round') for s in q['stones']), str(q['stones'][:3]))
            # 独立周期重建（Python 侧）：错石=恰差一属性
            st = sorted(q['stones'], key=lambda s: s['pos'])
            hc = [st[0]['color'], st[1]['color']]
            hs = [st[0]['shape'], st[1]['shape']]
            bad, expc, exps = -1, None, None
            for i, s in enumerate(st):
                if s['color'] != hc[i % 2] or s['shape'] != hs[i % 2]:
                    bad, expc, exps = i, hc[i % 2], hs[i % 2]
            csame = st[bad]['color'] == expc
            ssame = st[bad]['shape'] == exps
            check('dual bad stone differs in EXACTLY ONE attribute',
                  bad == q['badPos'] and csame != ssame,
                  'bad=%d exp=(%s,%s) got=(%s,%s)' % (bad, expc, exps, st[bad]['color'], st[bad]['shape']))
            # 连错 2 次：pattern 提示条浮现（周期色点），错石无视觉标记（不指认）
            for _ in range(2):
                tap_stone(pg, 0 if q['badPos'] != 0 else 1)
                pg.wait_for_timeout(1300)
            tip = pg.evaluate("""() => ({
              show: document.getElementById('pat-tip').classList.contains('show'),
              dots: document.querySelectorAll('#pat-tip i').length,
              badie: document.querySelectorAll('#stones .stone.baddie').length})""")
            check('2 wrongs -> pat-tip shows cycle dots, bad stone NOT marked (no leak)',
                  tip['show'] and tip['dots'] == 4 and tip['badie'] == 0, str(tip))
            n_done = real_solve(pg)
            check('dual real dual-step win (5 quizzes)', n_done == 5, 'done=%d' % n_done)
            ctx.close()

            # ---- 3+4. 双 viewport ×(flat0 六石/flat10 八石/flat20 dual 候选态) ----
            for vp, flats, tag in [((1280, 800), [0, 10, 20], 'land'),
                                   ((800, 1180), [0, 10, 20], 'port')]:
                for flat in flats:
                    ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                    if flat:
                        ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(flat), bonus=30))
                    else:
                        ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
                    pg = ctx.new_page(); watch(pg, 'vp%d-f%d' % (vp[0], flat))
                    pg.goto(URL)
                    pg.wait_for_function('window.BG && BG.currentLevel', timeout=8000)
                    pg.wait_for_timeout(600)
                    if flat == 20:                 # 进 fix 候选态（候选盘在场量测）
                        pg.evaluate('BG.tapStone(BG.quiz.badPos)')
                        pg.wait_for_timeout(800)
                    pg.wait_for_timeout(400)
                    m = pg.evaluate("""() => {
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;
                        const w = e.offsetWidth, h = e.offsetHeight;
                        if (w > 4 && h > 4 && (w < 64 || h < 64))
                          bad.push((e.className || e.tagName) + ':' + Math.round(w) + 'x' + Math.round(h));
                      });
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad,
                              stones: document.querySelectorAll('#stones .stone').length,
                              cands: document.querySelectorAll('#cands .cand').length,
                              candShow: document.getElementById('cands').classList.contains('show'),
                              kind: BG.quiz && BG.quiz.kind};
                    }""")
                    check('vp %dx%d flat%d overflowX==0 + touch >=64' % (vp + (flat,)),
                          m['ox'] == 0 and not m['bad'], 'ox=%s bad=%s' % (m['ox'], m['bad'][:3]))
                    if flat == 20:
                        check('vp %dx%d flat20 dual: cands tray 3 stones >=64 shown' % vp,
                              m['candShow'] and m['cands'] == 3,
                              'show=%s n=%d' % (m['candShow'], m['cands']))
                    shot = SHOTS / ('bridge-vp%dx%d-flat%d.png' % (vp + (flat,)))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot, floor=10.0)
                    check('screenshot vp%dx%d-flat%d non-blank (kept in _shots)' % (vp + (flat,)), ok, detail)
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
