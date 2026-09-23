# -*- coding: utf-8 -*-
"""numberdet _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 0 pageerror
2. 预置存档(跳过教学) → flat0 ch1 真实指针键盘点击通关：一次范围外 99（键盘 shake+guesses 不变）+
   猜大 20（hi 收紧+数轴剩余区间文字实时）+ 猜小 1（lo 收紧）+ 恒中点二分 → 5 题通关 →
   .k-celebrate → 5.4s 读档 1-0 stars>=1
3. flat10 ch3(N=50) 真实指针二分通关：逐题 guesses ≤ base=6 → celebrate → 读档 3-0
4. 各章冒烟：flat5 ch2(N=30)/flat15 ch4(N=99) ND.autoSolve（UI 路径恒中点）逐题 ≤base + 3★
5. 全新存档 → 教学 watch 期真实乱点被吞（step 不变 + pop 轻叮计数>0，§0.22）+ 重玩门（demo 期无效）
6. 救援钟（真实页 interval）：15s 静置 → rescues>=1 + 剩余段中点 pulse（num_hint 救援=教二分）
7. 双 viewport(1280x800/800x1180)：overflowX==0、数字键/删除键 >=64、确认 >=96、按钮 >=64（家长钮豁免）
8. 构建自检：index.html 含 num 14 条 + core 3 条 clips（data:audio/mpeg 共 17）+ 完全离线
9. 全程 0 pageerror + 截图像素非空白（PIL stdev>5）
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex>=3 -> 日限 12
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=()):
    save = {
        'v': '1.0', 'game': 'numberdet', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'numberdet': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_numberdet", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path, floor=5.0):
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


def click_key(page, d):
    """真实指针点数字键/删除键（d=0-9 或 'del'）"""
    pos = page.evaluate(
        "(d) => { const el = document.querySelector('.key[data-d=\"' + d + '\"]');"
        " if (!el) return null; const r = el.getBoundingClientRect();"
        " return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }", str(d))
    page.mouse.click(pos['x'], pos['y'])
    page.wait_for_timeout(120)


def click_ok(page, wait_ms=1150):
    """点确认；默认等 1150ms 覆盖最长的猜中演出窗 1050ms（防下一击落进 locked 窗被吞）"""
    pos = page.evaluate("""() => { const r = document.querySelector('#ok-btn').getBoundingClientRect();
        return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
    page.mouse.click(pos['x'], pos['y'])
    page.wait_for_timeout(wait_ms)


def type_guess(page, v):
    for ch in str(v):
        click_key(page, int(ch))


def play_level(page, force_states=False):
    """真实指针打完当前关：恒中点二分；force_states=True 时首题先走 范围外99+猜大N+猜小lo 三态。
    返回 (答完题数, 逐题猜测次数增量列表, 三态记录)"""
    answered, per = 0, []
    saw = {'gone': 0, 'big': 0, 'small': 0}
    while answered < 30:
        q = page.evaluate('ND.quiz')
        if q is None:
            break
        r0 = page.evaluate('ND.currentLevel.retries')
        if force_states and answered == 0:
            type_guess(page, 99)                       # 范围外：键盘 shake + guesses 不变
            okpos = page.evaluate("""() => { const r = document.querySelector('#ok-btn').getBoundingClientRect();
                return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
            page.mouse.click(okpos['x'], okpos['y'])
            page.wait_for_timeout(180)                 # shake 动画 0.45s 中段量（演出窗内）
            anim = page.evaluate(
                'getComputedStyle(document.getElementById("keys")).animationName')
            st = page.evaluate('ND.quiz')
            saw['gone'] += (anim == 'keys-shake' and st['guesses'] == 0)
            page.wait_for_timeout(600)                 # 等 gone 演出窗（520ms）结束
            q = st
        if force_states and answered == 0 and q['secret'] < q['hi']:
            n0 = q['guesses']
            type_guess(page, q['hi'])                  # 猜大
            click_ok(page)
            st = page.evaluate('ND.quiz')
            saw['big'] += (st['hi'] == q['hi'] - 1 and st['guesses'] == n0 + 1)
            q = st
        if force_states and answered == 0 and q['secret'] > q['lo']:
            type_guess(page, q['lo'])                  # 猜小
            click_ok(page)
            st = page.evaluate('ND.quiz')
            saw['small'] += (st['lo'] == q['lo'] + 1)
            q = st
        guard = 0
        while guard < 25:
            qq = page.evaluate('ND.quiz')
            if qq is None or qq['step'] != answered:
                break
            mid = (qq['lo'] + qq['hi']) // 2
            type_guess(page, mid)
            click_ok(page)
            guard += 1
        r1 = page.evaluate('ND.currentLevel.retries')
        per.append(r1 - r0)
        answered += 1
        if page.evaluate('ND.currentLevel.done'):
            break
    return answered, per, saw


def tap_targets(page):
    """触摸目标审计：数字键/删除键 >=64、确认 >=96、全按钮 >=64（家长钮豁免）"""
    keys = page.evaluate("""() => [...document.querySelectorAll('.key')].map(
        e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })""")
    keyOk = len(keys) == 11 and all(w >= 64 and h >= 64 for w, h in keys)
    okb = page.evaluate("""() => { const r = document.querySelector('#ok-btn').getBoundingClientRect();
        return [r.width, r.height]; }""")
    okOk = okb[0] >= 96 and okb[1] >= 96
    btns = page.evaluate("""() => { const out = [];
        document.querySelectorAll('button').forEach(b => {
            if (b.classList.contains('k-parentbtn')) return;
            const r = b.getBoundingClientRect();
            if (r.width > 4 && r.height > 4) out.push([r.width, r.height]); });
        return out; }""")
    btnOk = all(w >= 64 and h >= 64 for w, h in btns)
    ox = page.evaluate('Math.max(document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth)')
    return keyOk, okOk, btnOk, ox


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---------- 1. verify=1 ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('verify: ' + str(e)))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.startsWith('VERIFY')", timeout=60000)
        r = json.loads(page.eval_on_selector('#verify-result', 'el => el.textContent'))
        check('verify=1 title PASS', page.title().startswith('VERIFY PASS'), page.title())
        check('verify pass==total', r['pass'] == r['total'], '%s/%s layoutOk=%s' % (r['pass'], r['total'], r['layoutOk']))
        page.close()

        # ---------- 2. flat0 ch1 真实指针键盘通关（范围外轻抖+猜大+猜小+二分） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.ND && ND.quiz', timeout=8000)
        q0 = page.evaluate('ND.quiz')
        check('flat0 loaded (ch1 N=20 base=5)', q0['N'] == 20 and q0['base'] == 5, str(q0)[:120])
        # 剩余区间文字实时：初始 1..20
        rng = page.evaluate("""() => ({lo: document.getElementById('r-lo').textContent,
            hi: document.getElementById('r-hi').textContent})""")
        check('axis range text initial 1..20', rng['lo'] == '1' and rng['hi'] == '20', str(rng))
        page.screenshot(path=str(SHOTS / 'hunt_1280.png'))
        answered, per, saw = play_level(page, force_states=True)
        check('real-key play: gone shake + big + small all seen',
              saw['gone'] == 1 and saw['big'] >= 1 and saw['small'] >= 1, str(saw))
        check('played 5 quizzes by real pointer keys', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('celebrate overlay shown', True)
        page.wait_for_timeout(5400)
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_numberdet'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('save after win: 1-0 stars>=1', bool(saved) and saved['stars'] >= 1, str(saved))

        # ---------- 3. flat10 ch3(N=50) 真实指针二分通关（逐题 guesses<=6） ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(10)))
        page.reload()
        page.wait_for_function('window.ND && ND.quiz', timeout=8000)
        q10 = page.evaluate('ND.quiz')
        check('flat10 loaded (ch3 N=50 base=6)', q10['N'] == 50 and q10['base'] == 6, str(q10)[:120])
        page.screenshot(path=str(SHOTS / 'hunt50_1280.png'))
        answered10, per10, _ = play_level(page)
        check('flat10: played 5 quizzes by real clicks, per-quiz bisect <=6',
              answered10 == 5 and len(per10) == 5 and all(g <= 6 for g in per10), str(per10))
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.wait_for_timeout(5400)
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_numberdet'));
            return s && s.levels && s.levels['3-0'] ? s.levels['3-0'] : null; }""")
        check('flat10 save: 3-0 stars>=1', bool(saved) and saved['stars'] >= 1, str(saved))

        # ---------- 4. 各章冒烟：flat5 ch2 / flat15 ch4 ND.autoSolve 恒中点 <=base + 3★ ----------
        for flat, N, base in [(5, 30, 5), (15, 99, 7)]:
            page.evaluate('ND.start(%d)' % flat)
            page.wait_for_function('window.ND && ND.quiz', timeout=8000)
            qf = page.evaluate('ND.quiz')
            a = page.evaluate('ND.autoSolve()')
            check('ch smoke flat%d: N=%d base=%d, autoSolve done, per-quiz<=base'
                  % (flat, N, base),
                  qf['N'] == N and qf['base'] == base and a['done'] and
                  len(a['perQuiz']) == 5 and all(g <= base for g in a['perQuiz']),
                  'perQuiz=%s' % a['perQuiz'])
            # 等 winFlow 全部延迟切换落定：celebrate 2.3s + 章末仪式 chapterEnd 的
            # setTimeout(proceed, 3400)（合计 ~5.7s）——不足则会打断下一章 autoSolve（实测教训）
            page.wait_for_timeout(6800)

        # ---------- 5. 救援钟（真实页 interval）：15s 静置 → num_hint 救援+中点 pulse ----------
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.ND && ND.quiz', timeout=8000)
        t0 = time.time()
        page.wait_for_timeout(10000)
        st = page.evaluate('ND.rescues')
        check('no rescue before 14s idle', st == 0, 'rescues=%s elapsed=%.1fs' % (st, time.time() - t0))
        page.wait_for_timeout(5300)                       # 总静置 ~15.3s
        st = page.evaluate("""() => ({rescues: ND.rescues,
            mid: document.getElementById('mid-dot').className})""")
        check('rescue fired after 14s idle (num_hint + mid pulse x3)',
              st['rescues'] >= 1 and 'on' in st['mid'] and 'pulse3' in st['mid'], str(st))

        # ---------- 6. 教学期乱点被吞 + 重玩门（全新存档 → watch demo 期） ----------
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_function('window.ND && ND.tutorial === "watch"', timeout=8000)
        page.evaluate("""() => { window.__popCount = 0;
            const o = KIDS.audio.sfx;
            /* 必须保 this（sfx 内部读 this.ctx）：普通函数 + call 回绑 */
            KIDS.audio.sfx = function (n) { if (n === 'pop') window.__popCount++; return o.call(KIDS.audio, n); }; }""")
        page.wait_for_timeout(600)                       # watch 演示进行中
        for d in [1, 5, 9, 0]:                           # 真实乱点数字键（主交互区）
            click_key(page, d)
        rp = page.evaluate("""() => { const r = document.querySelector('#btn-replay').getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
        flatBefore = page.evaluate('ND.currentLevel.flat')
        page.mouse.click(rp['x'], rp['y'])
        page.wait_for_timeout(400)
        st = page.evaluate('({step: ND.currentLevel.step, pops: window.__popCount, tut: ND.tutorial, flat: ND.currentLevel.flat, input: ND.quiz ? ND.quiz.input : null})')
        check('tutorial watch: key clicks swallowed (step==0, input null)',
              st['step'] == 0 and st['input'] is None, str(st))
        check('tutorial watch: pop feedback fired (>=1)', st['pops'] >= 1, str(st))
        check('replay gate: demo 期重玩无效 (flat unchanged)',
              st['flat'] == flatBefore and st['tut'] == 'watch', str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_watch.png'))

        # ---------- 7. 双 viewport 触摸目标与 overflowX ----------
        for vp in [(1280, 800), (800, 1180)]:
            page.set_viewport_size({'width': vp[0], 'height': vp[1]})
            page.wait_for_timeout(900)                    # 等布局+入场动画（transform 中途陷阱）
            k1, o1, b1, ox1 = tap_targets(page)
            check('viewport %dx%d: keys>=64 & ok>=96 & buttons>=64 & overflowX==0' % vp,
                  k1 and o1 and b1 and ox1 == 0, 'keys=%s ok=%s btn=%s ox=%s' % (k1, o1, b1, ox1))
            page.screenshot(path=str(SHOTS / ('vp_%dx%d.png' % vp)))
        page.close()
        browser.close()

    # ---------- 8. 构建自检：clips 注入 + 完全离线 ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('data:audio/mpeg')
    num_keys = ['num_tut_watch', 'num_tut_turn', 'num_hint', 'num_q1', 'num_q2',
                'num_big', 'num_small', 'num_got', 'num_gone',
                'num_n_10', 'num_n_20', 'num_n_30', 'num_n_50', 'num_n_99']
    embedded = [k for k in num_keys if '"%s"' % k in html]
    core_keys = [k for k in ['core_chapter_end', 'core_day_end', 'core_rest'] if '"%s"' % k in html]
    check('index.html clips: 17 data:audio (14 num_* + 3 core_*)', n_audio == 17, n_audio)
    check('all 14 num_* clip keys embedded', len(embedded) == 14, '%d/14' % len(embedded))
    check('core 3 clips embedded', len(core_keys) == 3, '%d/3' % len(core_keys))
    check('single file fully offline',
          'http://' not in html.replace('http://www.w3.org/2000/svg', '') and 'https://' not in html)

    # ---------- 9. 截图非空白 ----------
    for shot, floor in [('hunt_1280.png', 5.0), ('hunt50_1280.png', 5.0),
                        ('celebrate.png', 4.0), ('tutorial_watch.png', 5.0),
                        ('vp_800x1180.png', 5.0)]:
        ok, detail = png_nonblank(SHOTS / shot, floor)
        check('screenshot non-blank: ' + shot, ok, detail)

    check('0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
