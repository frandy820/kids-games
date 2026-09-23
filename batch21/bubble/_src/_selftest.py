# -*- coding: utf-8 -*-
"""bubble _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r9 玩法（v2 去计数器+颜色子集+提交制 / r9 倒计时收尾）：
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 双 viewport sims 全过
   （40 关审计=20 静态+20 生成 + modeled 时长 >=40s 硬断言 + r9 倒计时单元/estMs/nextHint）
2a. 预置存档(跳过教学) → 真实指针点泡 + 首错双路径（少点 wrong_less 零惩罚继续点 /
    多点 wrong_more 清零重数）→ 真实点击「好了」通关（child 节奏 wall-clock >=40s）→
    .k-celebrate 2 星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(吞输入)→帮(幽灵手指)→独 真实链路 → bubble.tutSeen 持久化
2c. r9 倒计时真实页全周期（flat3=章后段 lv3 计时关）：quiet 静默(#timer 不显)→点泡仍计数→
    count 可见(琥珀条 on+截图)→超时 sleep(泡泡缓浮不爆+点泡/提交软吞 'sleep' 零惩罚+
    bub_timeup→题面重读 queue 链)→自动温和重来(计数清零零 miss)→autoSolve 收尾
3. 双 viewport(1280x800/800x1180)×(flat0/flat3)：overflowX==0、全按钮触摸目标 >=64、截图存 _shots/
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex>=3 → 日限 12
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'bubble', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'bubble': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_bubble", ' + json.dumps(json.dumps(save)) + ')'


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


def quiz(page):
    return page.evaluate('BB.quiz')


def dom_pop(page, bid):
    """真实 DOM pointerdown 点泡（移动目标：dispatchEvent 走真实监听链，等价 verify ⑪）"""
    page.evaluate("""(i) => { const el = document.querySelector('.bubble[data-id="' + i + '"]');
      if (el) el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); }""", bid)


def pop_to(page, want, dwell=0):
    """点目标色泡至 count==want（dwell=每点停留 ms——child 节奏）"""
    guard = 0
    while guard < 80:
        q = quiz(page)
        if q is None or q['count'] >= want:
            break
        ids = page.evaluate('() => BB.bubbles.filter(x => x.kind === "color" && x.color === BB.quiz.color).map(x => x.id)')
        if ids:
            dom_pop(page, ids[0])
            page.wait_for_timeout(dwell if dwell else 120)
        else:
            page.wait_for_timeout(60)
        guard += 1
    return quiz(page)


def click_submit(page):
    box = page.locator('#btn-submit').bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def wait_step(page, s0, timeout=9000):
    for _ in range(int(timeout / 100)):
        lv = page.evaluate('BB.currentLevel')
        if lv and (lv['step'] > s0 or lv['done']):
            return lv
        page.wait_for_timeout(100)
    return page.evaluate('BB.currentLevel')


def wait_phase(page, ph, timeout_ms):
    for _ in range(int(timeout_ms / 100)):
        if page.evaluate('BB.timer.phase') == ph:
            return True
        page.wait_for_timeout(100)
    return page.evaluate('BB.timer.phase') == ph


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
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=60000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str(vj['smokes']['layout']['sims']))
            check('verify 40-level audit all ok (章规则/时长>=40s/timed 规则)',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify modeled durMin >= 40000ms (r9 时长硬断言)',
                  vj['units']['r9fam']['durMin'] >= 40000,
                  'durMin=%sms durMax=%sms levels=%s' % (vj['units']['r9fam']['durMin'],
                                                         vj['units']['r9fam']['durMax'],
                                                         vj['units']['r9fam']['durLevels']))
            check('verify r9 specifics all ok (countdown cycle/estMs/nextHint)',
                  vj['units']['r9count']['ok'] and vj['units']['r9fam']['ok'],
                  'r9count=%s r9fam=%s' % (vj['units']['r9count']['ok'], vj['units']['r9fam']['ok']))
            clips_v = pg.evaluate("""() => {
              const c = (typeof KIDS !== 'undefined' && KIDS.voice && KIDS.voice.clips) || {};
              return Object.keys(c).filter(k => k.indexOf('bub_') === 0)
                .map(k => k + ':' + String(c[k]).slice(0, 22));
            }""")
            check('bub_ clips injected in-page (7 game keys incl bub_timeup)',
                  any(x.startswith('bub_timeup:data:audio/mpeg;base64') for x in clips_v) and
                  len(clips_v) >= 7, str(sorted(clips_v)))
            ctx.close()

            # ---- 2a. 预置存档：真实点击通关 + 首错双路径 + wall-clock >=40s（child 节奏） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.BB && BB.currentLevel', timeout=8000)
            lv = pg.evaluate('BB.currentLevel')
            check('start at 1-0 (v2 ch1 单色场 N∈[3,5])', lv and lv['ch'] == 1 and lv['flat'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('BB.tutorial') == 'none')
            check('flat0 untimed (教学关不计时)', lv and lv['timed'] is False, str(lv))
            t0 = time.time()
            # 首错双路径（题0 n=3）：少点提交=wrong_less 零惩罚继续点；多点提交=wrong_more 清零重数
            pop_to(pg, 2, dwell=900)
            click_submit(pg)
            pg.wait_for_timeout(700)             # wrong_less 500ms 防重入窗走完
            ql = quiz(pg)
            less_ok = ql and ql['count'] == 2 and ql['miss'] == 0 and ql['submitErr'] == 0 and ql['step'] == 0
            check('under-submit wrong_less: count kept, zero penalty', bool(less_ok), str(ql))
            pop_to(pg, 4, dwell=900)             # N+1=多点
            click_submit(pg)
            pg.wait_for_timeout(800)
            qm = quiz(pg)
            more_ok = qm and qm['count'] == 0 and qm['submitErr'] == 1 and qm['miss'] == 1 and qm['step'] == 0
            check('over-submit wrong_more: cleared + miss=1 (field reset)', bool(more_ok), str(qm))
            quizzes_done = 0
            while quizzes_done < 6:
                q = quiz(pg)
                if q is None:
                    break
                s0 = q['step']
                pg.wait_for_timeout(2200 if quizzes_done == 0 else 1200)   # 听题窗
                pop_to(pg, q['n'], dwell=2000)   # child 节奏：每泡 2s（=SPEC TAP_MS 模型口径）
                click_submit(pg)
                lv2 = wait_step(pg, s0)
                if not (lv2['step'] > s0 or lv2['done']):
                    check('quiz %d advanced by real taps' % s0, False, str(lv2))
                    break
                quizzes_done += 1
                if lv2['done']:
                    break
                pg.wait_for_timeout(800)         # 题间演出窗
            elapsed = time.time() - t0
            check('real-click level finished (5 quizzes, wall-clock >=40s child-paced)',
                  quizzes_done == 5 and elapsed >= 40.0, 'quizzes=%d elapsed=%.1fs' % (quizzes_done, elapsed))
            pg.wait_for_selector('.k-celebrate', timeout=8000)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 retry)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)             # celebrate 收起+写档+推进
            lv3 = pg.evaluate('BB.currentLevel')
            check('auto-proceed to flat=1', lv3 and lv3['flat'] == 1, str(lv3))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_bubble")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.BB && BB.currentLevel', timeout=8000)
            pg.wait_for_function("BB.tutorial === 'watch'", timeout=5000)
            bid = pg.evaluate('() => BB.bubbles.length ? BB.bubbles[0].id : 1')
            swallowed = pg.evaluate('(i) => BB.tapBubble(i)', bid) is None   # 演示期真实/hook 输入全吞
            check('tutorial watch swallows input (locked demo)', swallowed)
            pg.wait_for_function("BB.tutorial === 'help'", timeout=30000)    # 等"看"演示完成
            q = quiz(pg)
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0, str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> next tap target', ghost_shown)
            a = pg.evaluate('BB.autoSolve()')     # "帮"首次点破→"独"，继续通关
            lvb = pg.evaluate('BB.currentLevel')
            check('tutorial level playable -> done (autoSolve)', a and a['done'] and lvb['done'], str(a))
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_bubble")'))
            check('bubble.tutSeen persisted', (saved.get('bubble') or {}).get('tutSeen') is True, str(saved.get('bubble')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. r9 倒计时真实页全周期（flat3=章后段 lv3） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.BB && BB.currentLevel', timeout=8000)
            lv = pg.evaluate('BB.currentLevel')
            check('chapter-back level start at flat=3 (timed)', lv and lv['flat'] == 3 and lv['timed'] is True, str(lv))
            # 语音链 spy（queue 捕获 bub_timeup→题面重读；函数形式+实参守卫——裸字符串 evaluate
            # 会被 playwright 包装调用产生伪 TypeError，r9 实测探针定版写法）
            pg.evaluate(r"""() => {
              window.__qLog = [];
              const oq = KIDS.voice.queue.bind(KIDS.voice);
              KIDS.voice.queue = function (parts) {
                if (!Array.isArray(parts)) { window.__qLog.push('BAD:' + String(parts)); return; }
                window.__qLog.push(parts.map(p => (p && typeof p === 'object')
                  ? (p.key == null ? '<TTS:' + p.text + '>' : p.key) : p));
                return oq(parts);
              };
            }""")
            q = quiz(pg)
            n3 = q['n']
            check('timed level starts in quiet (#timer hidden)',
                  pg.evaluate('BB.timer.phase') == 'quiet' and
                  not pg.evaluate("document.getElementById('timer').classList.contains('on')"),
                  'n=%d phase=%s' % (n3, pg.evaluate('BB.timer.phase')))
            pop_to(pg, min(2, n3), dwell=800)     # quiet 期点泡仍计数（计时不打断数数）
            cnt0 = quiz(pg)['count']
            check('pops count during quiet window', cnt0 == min(2, n3), 'count=%d' % cnt0)
            ok_cnt = wait_phase(pg, 'count', 40000)   # 静默窗 QUIET_SEC(n) 秒（n=4 → 24s 真实）
            tim_on = pg.evaluate("document.getElementById('timer').classList.contains('on')")
            shot = SHOTS / 'bubble-countdown.png'
            pg.screenshot(path=str(shot))
            ok_shot, det_shot = png_nonblank(shot)
            check('quiet -> visible countdown (#timer.on) + shot non-blank',
                  ok_cnt and tim_on and ok_shot, 'phase=%s on=%s %s' %
                  (pg.evaluate('BB.timer.phase'), tim_on, det_shot))
            ok_slp = wait_phase(pg, 'sleep', 20000)   # 倒计时 12s 走完 → 泡泡缓浮不爆
            slp_cls = pg.evaluate("document.getElementById('field').classList.contains('sleep')")
            shot2 = SHOTS / 'bubble-sleep.png'
            pg.screenshot(path=str(shot2))
            ok_shot2, det_shot2 = png_nonblank(shot2)
            # 静息软吞：点目标色泡/提交均 'sleep'，泡不破计数不动零惩罚
            tid = pg.evaluate('() => { const t = BB.bubbles.filter(x => x.kind === "color" && x.color === BB.quiz.color).sort((a,b)=>a.y-b.y); return t.length ? t[0].id : null; }')
            r_slp = pg.evaluate('(i) => BB.tapBubble(i)', tid)
            r_sub = pg.evaluate('() => BB.tapSubmit()')
            live = pg.evaluate('(i) => BB.bubbles.some(x => x.id === i)', tid)
            q2 = quiz(pg)
            qlog = pg.evaluate('window.__qLog')
            check('timeout -> sleep: bubbles drift (no pop), taps/submit soft-swallowed, zero penalty',
                  ok_slp and slp_cls and r_slp == 'sleep' and r_sub == 'sleep' and live and
                  q2['count'] == cnt0 and q2['miss'] == 0 and q2['submitErr'] == 0 and q2['step'] == 0 and
                  ok_shot2, 'slp=%s r=%s/%s live=%s q=%s %s' %
                  (ok_slp, r_slp, r_sub, live, q2, det_shot2))
            check('timeup voice chain queued (bub_timeup then quiz re-read clip)',
                  any(l and len(l) >= 2 and l[0] == 'bub_timeup' and str(l[1]).startswith('bub_q_') for l in qlog),
                  str(qlog))   # T46 阶段2：题面重读段 keyless→bub_q_{n}_{色} clip（链尾）
            ok_roll = wait_phase(pg, 'quiet', 10000)  # 静息 4s → 自动温和重来
            q3 = quiz(pg)
            awake = pg.evaluate("document.getElementById('field').classList.contains('sleep')")
            check('auto re-roll: count cleared, zero miss, field awake',
                  ok_roll and q3['count'] == 0 and not awake and q3['miss'] == 0, 'q=%s awake=%s' % (q3, awake))
            a = pg.evaluate('BB.autoSolve()')
            lvc = pg.evaluate('BB.currentLevel')
            check('timed level finishable after re-roll (autoSolve)',
                  a and a['done'] and lvc['done'] and lvc['miss'] == 0, str(lvc))
            ctx.close()

            # ---- 3+4. 双 viewport ×(flat0/flat3 章后段)：触摸/截图 ----
            for vp, flats in [((1280, 800), [0, 3]), ((800, 1180), [0, 3])]:
                for flat in flats:
                    ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                    if flat:
                        ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(flat), bonus=30))
                    else:
                        ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
                    pg = ctx.new_page(); watch(pg, 'vp%d-f%d' % (vp[0], flat))
                    pg.goto(URL)
                    pg.wait_for_function('window.BB && BB.currentLevel', timeout=8000)
                    pg.wait_for_timeout(600)
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
                              bubbles: document.querySelectorAll('.bubble').length,
                              timed: BB.currentLevel && BB.currentLevel.timed};
                    }""")
                    check('vp %dx%d flat%d overflowX==0 + touch >=64' % (vp + (flat,)),
                          m['ox'] == 0 and not m['bad'] and m['bubbles'] >= 4,
                          'ox=%s bad=%s bubbles=%s' % (m['ox'], m['bad'][:3], m['bubbles']))
                    shot = SHOTS / ('bubble-vp%dx%d-flat%d.png' % (vp + (flat,)))
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
