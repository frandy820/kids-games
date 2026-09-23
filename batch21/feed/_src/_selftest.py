# -*- coding: utf-8 -*-
"""feed _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r8 六章玩法（量域 6-10 / left 剩题真心算 / combo 双食物合计订单）：
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 双 viewport sims 全过
   （60 关审计=30 静态+30 生成六章循环 + modeled 时长 ≥40s 硬断言）
2a. 预置存档(跳过教学) → 真实 pointer 点堆取物 + 首错(空碗提交=零惩罚碗不动) →
    真实点击通关（child 节奏 wall-clock ≥40s）→ .k-celebrate 2 星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(吞输入)→帮(幽灵手指)→独 真实链路 → feed.tutSeen 持久化
2c. left 剩题（flat20=dch5）：先取 n→吃掉不清屏（剩 rem 件上垫+chip '?'，无自动计数器）→
    连错 2 次恒无逐根高亮（r8 去逐根高亮兜底）→ 真实点剩物 3 件=3 圆点+数词「一二三」（点数圆点支持）→
    真实取 rem 件镜像作答 → autoSolve 通关
2d. combo 合计订单（flat25=dch6）：chip 双组图形+数字+加号 / 点干扰堆=wig 不计数 / 真实填双类 →
    autoSolve 3 星
3. 双 viewport(1280x800/800x1180)×(flat0 单堆/flat20 问句态/flat25 combo)：overflowX==0、
   全按钮触摸目标 ≥64（家长按钮豁免）、剩物垫件数==rem、截图存 _shots/
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
        'v': '1.0', 'game': 'feed', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'feed': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_feed", ' + json.dumps(json.dumps(save)) + ')'


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


def tap_pile(page, food):
    box = page.locator('.pile[data-food="%s"]' % food).bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def tap_leftover(page, i):
    box = page.locator('.leftover[data-idx="%d"]' % i).bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def click_feed(page):
    box = page.locator('#btn-feed').bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def quiz(page):
    return page.evaluate('FD.quiz')


def wait_step(page, s0, timeout=9000):
    for _ in range(int(timeout / 100)):
        lv = page.evaluate('FD.currentLevel')
        if lv and (lv['step'] > s0 or lv['done']):
            return lv
        page.wait_for_timeout(100)
    return page.evaluate('FD.currentLevel')


def real_fill(page, food, target, dwell=1500):
    """真实 pointer 逐件取到该食物碗计数=target（step 被 grace 自动判推进即停手）"""
    guard = 0
    while guard < 40:
        q = quiz(page)
        if q is None or (q['bowl'].get(food, 0) >= target):
            break
        tap_pile(page, food)
        page.wait_for_timeout(dwell)
        guard += 1
    return quiz(page)


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
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=20000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str(vj['smokes']['layout']['sims']))
            check('verify 60-level audit all ok (r8 六章/时长>=40s)',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify modeled durMin >= 40000ms (r8 时长硬断言)',
                  vj['units']['dist']['durMin'] >= 40000,
                  'durMin=%sms durMax=%sms levels=%s' % (vj['units']['dist']['durMin'],
                                                         vj['units']['dist']['durMax'],
                                                         vj['units']['dist']['durLevels']))
            check('verify r8 specifics all ok (left/combo/nextHint/estMs)',
                  vj['units']['left']['ok'] and vj['units']['combo']['ok'] and
                  vj['units']['dist']['hintOk'] and vj['units']['dist']['estMs'],
                  'left=%s combo=%s' % (vj['units']['left']['ok'], vj['units']['combo']['ok']))
            # r8 新 clip 实体在页内（键名 vlog 命中≠clip 在场；TTS 兜底同记键名）
            clips_v = pg.evaluate("""() => {
              const c = (typeof KIDS !== 'undefined' && KIDS.voice && KIDS.voice.clips) || {};
              return Object.keys(c).filter(k => k.indexOf('fed_') === 0)
                .map(k => k + ':' + String(c[k]).slice(0, 22));
            }""")
            check('fed_ clips injected in-page (7 game keys incl fed_left_q/fed_left_do)',
                  any(x.startswith('fed_left_q:data:audio/mpeg;base64') for x in clips_v) and
                  any(x.startswith('fed_left_do:data:audio/mpeg;base64') for x in clips_v) and
                  len(clips_v) >= 7, str(sorted(clips_v)))
            ctx.close()

            # ---- 2a. 预置存档：真实点击通关 + 首错零惩罚 + wall-clock ≥40s（child 节奏） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.FD && FD.currentLevel', timeout=8000)
            lv = pg.evaluate('FD.currentLevel')
            check('start at 1-0 (r8 ch1 量域 6-7)', lv and lv['ch'] == 1 and lv['flat'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('FD.tutorial') == 'none')
            t0 = time.time()
            # 首错：空碗点喂食按钮 → wrong 零惩罚（碗仍 0、miss=1）
            click_feed(pg)
            pg.wait_for_timeout(1300)             # 1000ms 防重入窗走完
            q0 = quiz(pg)
            first_wrong = q0 and q0['miss'] == 1 and q0['bowl'].get(q0['food'], 0) == 0
            check('first empty submit = wrong, zero penalty (bowl kept)', bool(first_wrong), str(q0))
            quizzes_done = 0
            while quizzes_done < 6:
                q = quiz(pg)
                if q is None:
                    break
                s0 = q['step']
                # child 节奏：听题窗（首题已含开场链等待）
                pg.wait_for_timeout(2200 if quizzes_done == 0 else 900)
                for f in q['need']:
                    while True:
                        qq = quiz(pg)
                        if qq is None or qq['step'] != s0:
                            break
                        if qq['bowl'].get(f, 0) >= q['need'][f]:
                            break
                        tap_pile(pg, f)
                        pg.wait_for_timeout(1500)
                lv2 = wait_step(pg, s0)           # grace(1.3s) 自动判 + 吃食演出
                if not (lv2['step'] > s0 or lv2['done']):
                    check('quiz %d advanced by real taps' % s0, False, str(lv2))
                    break
                quizzes_done += 1
                if lv2['done']:
                    break
            elapsed = time.time() - t0
            check('real-click level finished (5 quizzes, wall-clock >=40s child-paced)',
                  quizzes_done == 5 and elapsed >= 40.0, 'quizzes=%d elapsed=%.1fs' % (quizzes_done, elapsed))
            pg.wait_for_selector('.k-celebrate', timeout=8000)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 retry)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)             # celebrate 收起+写档+推进
            lv3 = pg.evaluate('FD.currentLevel')
            check('auto-proceed to flat=1', lv3 and lv3['flat'] == 1, str(lv3))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_feed")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.FD && FD.currentLevel', timeout=8000)
            pg.wait_for_function("FD.tutorial === 'watch'", timeout=5000)
            swallowed = pg.evaluate('FD.tapFood("carrot")') is False   # 演示期真实/hook 输入全吞
            check('tutorial watch swallows input (locked demo)', swallowed)
            pg.wait_for_function("FD.tutorial === 'help'", timeout=30000)  # 等"看"演示完成（取6根）
            q = quiz(pg)
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0, str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> next tap target', ghost_shown)
            a = pg.evaluate('FD.autoSolve()')     # "帮"首次喂对→"独"，继续通关
            lvb = pg.evaluate('FD.currentLevel')
            check('tutorial level playable -> done (autoSolve)', a and a['done'] and lvb['done'], str(a))
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_feed")'))
            check('feed.tutSeen persisted', (saved.get('feed') or {}).get('tutSeen') is True, str(saved.get('feed')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. left 剩题（flat20=dch5）：不清屏+问句态+点数圆点+去逐根高亮 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(20), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.FD && FD.currentLevel', timeout=8000)
            lv = pg.evaluate('FD.currentLevel')
            check('dch5 level start at flat=20', lv and lv['flat'] == 20 and lv['dch'] == 5, str(lv))
            q = quiz(pg)
            check('dch5 quiz kind=left', q and q['kind'] == 'left', str(q))
            n, rem, food = q['n'], q['rem'], q['food']
            # 阶段一：真实取 n 件 → grace 自动判 'eat'（吃掉不清屏）
            for i in range(n):
                tap_pile(pg, food)
                pg.wait_for_timeout(300)
            q2 = None
            for _ in range(150):                  # 等吃掉演出+问句态【DOM】渲染（引擎 phase 在演出前先翻转，
                q2 = quiz(pg)                     # 须等 chip 切'?'防轮询断在演出空窗——真实 SPEED=1）
                if q2 and q2['phase'] == 2 and \
                        pg.evaluate("document.querySelector('#prompt-chip .num').textContent") == '?':
                    break
                pg.wait_for_timeout(100)
            if not (q2 and q2['phase'] == 2):      # 失败诊断：判别 grace 未点火 vs 守卫返回
                diag = pg.evaluate("""() => ({btn: document.getElementById('btn-feed').className,
                  q: FD.quiz, lv: FD.currentLevel})""")
                print('DIAG 2c no-phase2:', diag)
            m = pg.evaluate("""() => ({
              lo: document.querySelectorAll('#leftovers .leftover').length,
              num: document.querySelector('#prompt-chip .num').textContent,
              left2: document.getElementById('field').classList.contains('left2'),
              bowl: document.querySelectorAll('#bowl-items .bitem').length})""")
            check('eat -> NOT cleared: rem items on mat visible, chip = ? (no counter)',
                  q2 and q2['phase'] == 2 and m['lo'] == rem and m['num'] == '?' and m['left2'] and
                  m['bowl'] == 0, 'rem=%d m=%s q2=%s' % (rem, m, q2 and q2['phase']))
            # 连错 2 次（空碗提交）：零惩罚+恒无逐根高亮（r8 去逐根高亮兜底）
            miss0 = quiz(pg)['miss']
            for _ in range(2):
                click_feed(pg)
                pg.wait_for_timeout(1300)
            no_hi = pg.evaluate("""() => ({
              miss: FD.quiz.miss, step: FD.quiz.step,
              lo: document.querySelectorAll('#leftovers .leftover').length,
              hi: document.querySelectorAll('.leftover.breathe,.leftover.pulse,.bitem.breathe').length})""")
            check('2 wrongs -> zero penalty, NO per-item highlight (r8)',
                  no_hi['miss'] == miss0 + 2 and no_hi['step'] == 0 and no_hi['lo'] == rem and
                  no_hi['hi'] == 0, str(no_hi))
            # 点数圆点支持：真实点剩物 3 件 = 3 圆点 + 数词 clip（fed_n_1..3，T46 阶段2）
            pg.evaluate("window.__sayLog = []; const op = KIDS.voice.play; " +
                        "KIDS.voice.play = function (key) { window.__sayLog.push(String(key)); " +
                        "if (key == null) window.__sayNull = String(new Error().stack); };")
            for i in range(3):
                tap_leftover(pg, i)
                pg.wait_for_timeout(350)
            cnt = pg.evaluate("""() => ({
              dots: document.querySelectorAll('#leftovers .leftover.counted').length,
              counted: FD.quiz.counted, log: window.__sayLog, nullAt: window.__sayNull || null})""")
            if cnt.get('nullAt'):
                print('SAY-NULL-STACK:', cnt['nullAt'][:400])
            numsaid = [x for x in cnt['log'] if x.startswith('fed_n_')]   # 仅数词 clip（并行演出句不计）
            check('tap leftovers -> 3 dots + spoken yi-er-san (counting support, child-initiated)',
                  cnt['dots'] == 3 and cnt['counted'] == 3 and
                  numsaid == ['fed_n_1', 'fed_n_2', 'fed_n_3'],
                  str(cnt))
            # 镜像作答：真实取 rem 件 → grace 自动判对推进
            s0 = 0
            for i in range(rem):
                qq = quiz(pg)
                if qq is None or qq['step'] != s0:
                    break
                tap_pile(pg, food)
                pg.wait_for_timeout(300)
            lv2 = wait_step(pg, s0)
            check('mirror-fetch rem items -> quiz advances', lv2['step'] > s0 or lv2['done'], str(lv2))
            a = pg.evaluate('FD.autoSolve()')
            lvc = pg.evaluate('FD.currentLevel')
            check('dch5 win -> done (2 retries from the 2 probe wrongs)',
                  a['done'] and lvc['done'] and lvc['retries'] == miss0 + 2, str(lvc))
            ctx.close()

            # ---- 2d. combo 合计订单（flat25=dch6） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(25), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.FD && FD.currentLevel', timeout=8000)
            lv = pg.evaluate('FD.currentLevel')
            check('dch6 level start at flat=25 (combo)', lv and lv['flat'] == 25 and lv['dch'] == 6, str(lv))
            q = quiz(pg)
            check('dch6 quiz kind=combo (dual-food order)', q and q['kind'] == 'combo', str(q))
            nums = pg.evaluate("""() => Array.from(document.querySelectorAll('#prompt-chip .num'))
              .map(e => e.textContent)""")
            plus = pg.evaluate("!!document.querySelector('#prompt-chip .plus svg')")
            check('combo chip = dual glyph+num+plus (a=%s b=%s)', nums == [str(q['a']), str(q['b'])] and plus,
                  'nums=%s plus=%s' % (nums, plus))
            wf = next(x for x in q['piles'] if x not in q['foods'])
            tap_pile(pg, wf)                      # 干扰堆：wig 不计数
            pg.wait_for_timeout(400)
            dd = pg.evaluate("""(wf) => ({
              wig: document.querySelector('.pile[data-food="' + wf + '"]').classList.contains('wig'),
              bowl: FD.quiz.bowl, miss: FD.quiz.miss})""", wf)
            check('distractor pile tap = wig, not counted, no miss',
                  dd['wig'] and dd['bowl'].get(wf) is None and dd['miss'] == 0, str(dd))
            s0 = 0
            for f in q['foods']:
                for i in range(q['need'][f]):
                    tap_pile(pg, f)
                    pg.wait_for_timeout(250)
            lv2 = wait_step(pg, s0)               # grace 自动判（合计满足）
            check('dual-category fill -> combined judge advances', lv2['step'] > s0 or lv2['done'], str(lv2))
            a = pg.evaluate('FD.autoSolve()')
            lvd = pg.evaluate('FD.currentLevel')
            check('dch6 autoSolve win (0 retry -> 3 stars)',
                  a['done'] and lvd['done'] and lvd['retries'] == 0, str(lvd))
            ctx.close()

            # ---- 3+4. 双 viewport ×(flat0/flat20 问句态/flat25 combo)：触摸/剩物/截图 ----
            def drive_to_ask(pg):
                q = quiz(pg)
                for i in range(q['n']):
                    tap_pile(pg, q['food'])
                    pg.wait_for_timeout(150)
                for _ in range(150):              # 等【DOM】问句态（chip'?'）——引擎 phase 先翻转防踩演出空窗
                    if pg.evaluate("document.querySelector('#prompt-chip .num').textContent") == '?':
                        break
                    pg.wait_for_timeout(100)
                tap_pile(pg, q['food']); tap_pile(pg, q['food'])
                return quiz(pg)

            for vp, flats, tag in [((1280, 800), [0, 20, 25], 'land'),
                                   ((800, 1180), [0, 20, 25], 'port')]:
                for flat in flats:
                    ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                    if flat:
                        ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(flat), bonus=30))
                    else:
                        ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
                    pg = ctx.new_page(); watch(pg, 'vp%d-f%d' % (vp[0], flat))
                    pg.goto(URL)
                    pg.wait_for_function('window.FD && FD.currentLevel', timeout=8000)
                    pg.wait_for_timeout(600)
                    rem_now = None
                    if flat == 20:
                        qq = drive_to_ask(pg)
                        rem_now = qq['rem']
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
                              lo: document.querySelectorAll('#leftovers .leftover').length,
                              piles: document.querySelectorAll('.pile').length,
                              kind: FD.quiz && FD.quiz.kind};
                    }""")
                    check('vp %dx%d flat%d overflowX==0 + touch >=64' % (vp + (flat,)),
                          m['ox'] == 0 and not m['bad'], 'ox=%s bad=%s' % (m['ox'], m['bad'][:3]))
                    if flat == 20:
                        check('vp %dx%d ask-state: leftovers==%d on mat' % (vp + (rem_now,)),
                              m['lo'] == rem_now, 'lo=%s rem=%s' % (m['lo'], rem_now))
                    shot = SHOTS / ('feed-vp%dx%d-flat%d.png' % (vp + (flat,)))
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
