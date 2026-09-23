# -*- coding: utf-8 -*-
"""hopscotch _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r7 六章玩法（数域 1-20 / 跳 2 格 / 藏格心算）：
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 双 viewport sims 全过（50 关审计+时长≥40s）
2a. 预置存档(跳过教学) → 真实 pointer 逐格点击（cur 逐步推进+兔子跳到格上）→ 首错(晃+零惩罚) →
    真实点击通关 → .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(吞输入)→帮(幽灵手指)→独 真实链路 → hop.tutSeen 持久化
2c. 藏格心算（flat15=dch4）：途中格全藏=inner 全集（数字 visibility:hidden/点数保留）+不涉起终点 →
    踩上点亮 → 连错 2 次恒无 pulse（r7 去逐格发光兜底）→ 真实通关
2d. 跳两格（flat25=dch6）：±1 点=far 不推进 / ±2 跳=step / autoSolve 通关 3 星
3. 双 viewport(1280x800/800x1180)×(span10 藏格关+span20 跳2关)：overflowX==0、全部按钮触摸目标 ≥64
    （家长按钮豁免）、格数=当关 span 且 ≥64、旗可见、点数圆点齐全（.dots i 总数=n，十点阵计入）→
    截图存 _shots/（按任务要求保留）
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

# 静音纪律（T46 阶段2 2026-09-19）：无种子页（verify 页）ctx 级静音——同 preset_save _mute
MUTE_JS = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
           "speechSynthesis.cancel=function(){};}}catch(e){}"
           "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
           "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},5);"
           "return Promise.resolve();};p.pause=function(){};}catch(e){};")


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'hopscotch', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'hop': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    # 静音纪律（T46 阶段2 2026-09-19）：规范 INIT_SND（原型级 play/pause no-op+5ms ended 派发）随种子注入
    _mute = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
             "speechSynthesis.cancel=function(){};}}catch(e){}"
             "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
             "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},5);"
             "return Promise.resolve();};p.pause=function(){};}catch(e){};")
    return _mute + 'localStorage.setItem("kidsgame_hopscotch", ' + json.dumps(json.dumps(save)) + ')'


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


def click_cell(page, n, frac_y=0.5):
    box = page.locator('.cell[data-n="%d"]' % n).bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] * frac_y)


def play_level(page, first_wrong=False):
    """真实 pointer 逐落点打完当前关：每题从 cur 按当题步长（mode1=±1/mode2=±2）点到 to
    （goal 窗口 900ms 等足），可先错一次（far=步长外格）"""
    wrong_done = not first_wrong
    quizzes = 0
    while quizzes < 30:
        q = page.evaluate('HOP.quiz')
        if q is None:
            break
        step = q.get('mode') == 2 and 2 or 1
        if not wrong_done:
            far = q['cur'] + (step + 1 if q['dir'] == 1 else -(step + 1))
            click_cell(page, far)
            page.wait_for_timeout(600)
            shaken = page.evaluate(
                'document.querySelector(".cell[data-n=\\"%d\\"]").classList.contains("shake")' % far)
            retries = page.evaluate('HOP.currentLevel.retries')
            check('first far tap: shake + zero penalty',
                  shaken and retries == 1, 'shaken=%s retries=%s' % (shaken, retries))
            wrong_done = True
            continue
        s0 = q['step']
        hops = 0
        while hops < 14:
            qq = page.evaluate('HOP.quiz')
            if qq is None or qq['step'] != s0:
                break                      # goal 已判（step 同步推进，演出窗 900ms）
            nxt = qq['cur'] + (step if qq['to'] > qq['cur'] else -step)
            click_cell(page, nxt)
            hops += 1
            page.wait_for_timeout(160)
        page.wait_for_timeout(1100)       # goal 庆祝窗口走完再点下一题
        quizzes += 1
    page.wait_for_selector('.k-celebrate', timeout=12000)
    return quizzes


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
            ctx.add_init_script(MUTE_JS)
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=15000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str(vj['smokes']['layout']['sims']))
            check('verify 50-level audit all ok (r7 六章/时长>=40s)',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify hopscotch specifics: hidden=inner 全集 / mode2 链 / span / dur>=40s',
                  all(v['ok'] for v in list(vj['levels'].values()) + list(vj['gen'].values())),
                  'durMin=%sms' % vj['units']['dist']['durMin'])
            # r7 审查 M3：页内新 clip 实体存在（键名 vlog 命中≠clip 在场，TTS 兜底同记键名）
            clips_v = pg.evaluate("""() => {
              const c = (typeof KIDS !== 'undefined' && KIDS.voice && KIDS.voice.clips) || {};
              return Object.keys(c).filter(k => k.indexOf('hop_') === 0)
                .map(k => k + ':' + String(c[k]).slice(0, 22));
            }""")
            check('hop_ clips injected in-page (4 game keys incl hop_wrong2)',
                  any(x.startswith('hop_wrong2:data:audio/mpeg;base64') for x in clips_v) and len(clips_v) >= 4,
                  str(sorted(clips_v)))
            ctx.close()

            # ---- 2a. 预置存档：逐格真实点击 + 首错零惩罚 + 通关（2 星） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.HOP && HOP.currentLevel', timeout=8000)
            lv = pg.evaluate('HOP.currentLevel')
            check('start at 1-0 (ch 1-based, span10)', lv and lv['ch'] == 1 and lv['lv'] == 0
                  and lv['span'] == 10, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('HOP.tutorial') == 'none')
            q = pg.evaluate('HOP.quiz')
            check('quiz hook contract {from,to,dir,mode,span,cur,hidden}',
                  all(k in q for k in ('from', 'to', 'dir', 'mode', 'span', 'cur', 'hidden'))
                  and q['from'] != q['to'], str(q))
            # 逐格真实点击：cur 逐步推进 + 兔子跳到格上（left/top 过渡后落在格内）
            nxt = q['cur'] + (1 if q['to'] > q['cur'] else -1)
            click_cell(pg, nxt)
            pg.wait_for_timeout(500)      # 兔子 left/top 过渡 340ms 走完（§0.11 等 transition 结束再量）
            q2 = pg.evaluate('HOP.quiz')
            on_cell = pg.evaluate('''() => {
              const q = HOP.quiz, el = document.querySelector('.cell[data-n="' + q.cur + '"]');
              const r = el.getBoundingClientRect(), b = document.getElementById('rabbit').getBoundingClientRect();
              const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
              return Math.abs(cx - (r.left + r.width / 2)) < r.width * 0.45 &&
                     Math.abs(cy - (r.top + r.height * 0.6)) < r.height * 0.55;
            }''')
            check('real tap -> cur advances + rabbit hops onto the cell', q2['cur'] == nxt and on_cell,
                  'cur=%s want=%s rabbitOnCell=%s' % (q2['cur'], nxt, on_cell))
            n = play_level(pg, first_wrong=True)
            check('finished 5 quizzes by real cell-by-cell click', n == 5, 'quizzes=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 retry)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)     # celebrate 收起+写档+推进
            lv2 = pg.evaluate('HOP.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_hopscotch")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.HOP && HOP.currentLevel', timeout=8000)
            pg.wait_for_function("HOP.tutorial === 'watch'", timeout=5000)
            swallowed = pg.evaluate('HOP.tapCell(2)') is False   # 演示期真实/hook 输入全吞
            check('tutorial watch swallows input (locked demo)', swallowed)
            pg.wait_for_function("HOP.tutorial === 'help'", timeout=30000)  # 等"看"演示完成
            q = pg.evaluate('HOP.quiz')
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and q['cur'] == q['from'], str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> next hop cell', ghost_shown)
            n = play_level(pg)            # "帮"首次跳对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'quizzes=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_hopscotch")'))
            check('hop.tutSeen persisted', (saved.get('hop') or {}).get('tutSeen') is True, str(saved.get('hop')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. 藏格心算（flat15=dch4）：途中格全藏 + 不涉起终点 + 踩上点亮 + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.HOP && HOP.currentLevel', timeout=8000)
            lv = pg.evaluate('HOP.currentLevel')
            check('ch4 level start at flat=15', lv and lv['flat'] == 15 and lv['dch'] == 4
                  and lv['span'] == 10, str(lv))
            q = pg.evaluate('HOP.quiz')
            masked = pg.evaluate('''() => [...document.querySelectorAll('.cell.masked')].map(e => +e.dataset.n)''')
            inner = list(range(min(q['from'], q['to']) + 1, max(q['from'], q['to'])))
            hid_ok = (sorted(masked) == sorted(q['hidden']) == inner and
                      all(h not in (q['from'], q['to']) for h in q['hidden']))
            check('ch4: ALL inner cells masked (r7 藏格加大), never endpoints', hid_ok,
                  'hidden=%s masked=%s inner=%s' % (q['hidden'], masked, inner))
            vis = pg.evaluate('''() => {
              const m = document.querySelector('.cell.masked .num');
              return m ? getComputedStyle(m).visibility : 'none';
            }''')
            check('masked cell number is visibility:hidden (dots only)', vis == 'hidden', vis)
            hid = q['hidden'][0]          # 真实逐格踩到第一块藏格：数字点亮
            walk = q['from']
            while walk != hid:
                walk += 1 if hid > walk else -1
                click_cell(pg, walk)
                pg.wait_for_timeout(180)
            revealed = pg.evaluate('''() => {
              const el = document.querySelector('.cell[data-n="%d"]');
              return [!el.classList.contains('masked'), getComputedStyle(el.querySelector('.num')).visibility];
            }''' % hid)
            check('step onto masked cell reveals its number', revealed[0] and revealed[1] == 'visible',
                  str(revealed))
            # 连错两次：r7 去逐格发光兜底——全场恒无 pulse
            cur = pg.evaluate('HOP.quiz.cur')
            for _ in range(2):
                click_cell(pg, cur + 2)
                pg.wait_for_timeout(600)
            no_pulse = pg.evaluate('document.querySelectorAll(".cell.pulse").length') == 0
            check('2 far taps -> zero pulse highlight (r7 去逐格发光)', no_pulse)
            n = play_level(pg)
            check('ch4 real-click win', n == 5, 'quizzes=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('HOP.currentLevel')
            check('ch4 win proceeds to flat=16', lv2 and lv2['flat'] == 16, str(lv2))
            ctx.close()

            # ---- 2d. 跳两格（flat25=dch6）：±1=far / ±2=step / autoSolve ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(25), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.HOP && HOP.currentLevel', timeout=8000)
            lv = pg.evaluate('HOP.currentLevel')
            check('ch6 level start at flat=25 (span20 mode2)', lv and lv['flat'] == 25 and lv['dch'] == 6
                  and lv['span'] == 20, str(lv))
            r = pg.evaluate('''async () => {
              const q = HOP.quiz;
              const a = await HOP.tapCell(q.cur + 1);          // 只跳一格：far
              const b = await HOP.tapCell(q.from + 2 * q.dir); // 跳两格：step
              return {far: a, step: b, cur: HOP.quiz.cur, want: q.from + 2 * q.dir,
                      miss: HOP.quiz.miss, off: [...document.querySelectorAll('.cell.off')].length};
            }''')
            check('mode2: +1 tap = far / +2 tap = step / non-chain dimmed',
                  r['far'] == 'far' and r['step'] == 'step' and r['cur'] == r['want'] and r['miss'] == 1
                  and r['off'] == 10, str(r))
            a = pg.evaluate('HOP.autoSolve()')
            lv2 = pg.evaluate('HOP.currentLevel')
            check('ch6 autoSolve win (1 far -> 2 stars)', a['done'] and lv2['won'] and lv2['retries'] == 1,
                  str(a) + ' retries=%s' % lv2['retries'])
            ctx.close()

            # ---- 3+4. 双 viewport ×(span10 藏格/span20 跳2)：触摸目标/旗/圆点/截图 ----
            for vp, flats, tag in [((1280, 800), range(15), 'hidden10'),
                                   ((800, 1180), range(25), 'skip20')]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=flats, bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.HOP && HOP.currentLevel', timeout=8000)
                pg.wait_for_timeout(900)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.className || e.tagName) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const cells = [...document.querySelectorAll('.cell')].map(b => b.getBoundingClientRect());
                  const flag = document.querySelector('.cell.goal .flag');
                  const fr = flag ? flag.getBoundingClientRect() : null;
                  const dotsOk = [...document.querySelectorAll('.cell')].every(
                    e => e.querySelectorAll('.dots i').length === +e.dataset.n);
                  const cellMin = cells.length ? Math.round(Math.min(...cells.map(r => Math.min(r.width, r.height)))) : 0;
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad, cells: cells.length,
                          span: HOP.currentLevel.span, cellMin: cellMin,
                          flag: !!fr && fr.width >= 14 && fr.height >= 16, dotsOk: dotsOk};
                }''')
                check('vp %dx%d(%s) overflowX==0' % (vp + (tag,)), m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d(%s) touch targets >=64 (buttons)' % (vp + (tag,)), not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d(%s) cells==span >=64 + flag + dots(i==n)' % (vp + (tag,)),
                      m['cells'] == m['span'] and m['cellMin'] >= 64 and m['flag'] and m['dotsOk'],
                      'cells=%s span=%s cellMin=%s flag=%s dotsOk=%s'
                      % (m['cells'], m['span'], m['cellMin'], m['flag'], m['dotsOk']))
                shot = SHOTS / ('hopscotch-vp%dx%d-%s.png' % (vp + (tag,)))
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d(%s) non-blank (stdev>10), kept in _shots'
                      % (vp + (tag,)), ok, detail)
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
