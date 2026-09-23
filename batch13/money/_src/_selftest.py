# -*- coding: utf-8 -*-
"""money _selftest — headless playwright 自测（独立 chromium.launch --mute-audio，不连/不杀任何浏览器进程）
r15（数字键盘找零版）：ch1 凑零钱含角/ch2 买两件合计/ch3·ch4 键盘找零（0-9+清空+退格+5 角键）
1a ?verify=1 横视口 → title=VERIFY PASS + JSON pass==total + layoutOk + 0 pageerror
1b P1b 真竖轮（portrait 800×1180 @media 真通道 verify PASS + #logo 锚宽 42）
2. 预置存档(跳过教学) → flat0 gather 真实 pointer 逐币点击（贪心凑价，含 5 角币）→ 首题先错一次
   （篮晃动不灰化可调整）→ 移除回落 → 凑齐点"给钱啦"→ 5 题通关 → .k-celebrate → 5.4s 读档 stars>=1
3. flat10 找零真实键盘打字通关（预置 done 0-9；逐题 清空→数字键→"算好啦"）→ celebrate
3b. flat15 ch4 带 5 角键：缺角先错一次（显示区 wig 不灰化）→ 补 5 角键通关
4. 救援钟：键盘期错确认不重置 → 10s 无救援 → 15s 救援触发（rescues>=1 + 正确键 breathe）
5. 双 viewport(1280x800/800x1180)：overflowX==0、币/键 ≥64、答案显示/给钱啦/算好啦 ≥96、按钮 ≥64（家长钮豁免）
6. 全新存档 → 教学 watch 期真实乱点被吞（step 不变 + pop 轻叮计数>0，§0.22）+ 重玩门（demo 期点重玩无效）
7. 构建自检：index.html 含 men 全部 33 条 + core 3 条 clips（data:audio/mpeg 共 36）+ script 块=4
8. 全程 0 pageerror + 截图像素非空白（PIL stdev>5）
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


def preset_save(tut_seen=True, done_flats=()):
    # 日限=dayIndex 封顶 2×6=12 关（core calendar.limit）——打 flat15 须家长 bonus 抬到 16
    done = list(done_flats)
    bonus = {TODAY: max(0, len(done) - 11)} if len(done) >= 12 else {}
    save = {
        'v': '1.0', 'game': 'money', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': bonus,
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'money': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_money", ' + json.dumps(json.dumps(save)) + ')'


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


def gather_coin_click(page):
    """按贪心选一枚该点的币并真实点击，返回 {ok, sum}（gather/pair 共用）"""
    st = page.evaluate('MN.quiz')
    if st is None or st['kind'] not in ('gather', 'pair'):
        return None
    pos = page.evaluate("""(st) => {
        const need = st['price'] - st['sum'];
        const els = [...document.querySelectorAll('#coin-tray .coin')].filter(e => !e.classList.contains('gone'));
        let best = null, bv = 0;
        els.forEach(e => {
            const v = st['coins'][Number(e.dataset.i)];
            if (v <= need && v > bv) { bv = v; best = e; }
        });
        if (!best && els.length) best = els[0];        // need=0 或无可加：返回首枚（供错放场景）
        if (!best) return null;
        const r = best.getBoundingClientRect();
        return {x: r.left + r.width / 2, y: r.top + r.height * 0.6, v: st['coins'][Number(best.dataset.i)]};
    }""", st)
    if pos is None:
        return None
    page.mouse.click(pos['x'], pos['y'])
    page.wait_for_timeout(160)
    return page.evaluate('MN.quiz')


def play_gather_level(page, first_wrong=False):
    """真实点击打完当前 gather/pair 关：每题贪心逐币点击→（首题可选先错一次）→点给钱啦"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = page.evaluate('MN.quiz')
        if q is None or q['kind'] not in ('gather', 'pair'):
            break
        if not wrong_done:                              # 首错：放 1 枚错币→提交→晃动不灰化
            pos = page.evaluate("""() => {
                const els = [...document.querySelectorAll('#coin-tray .coin')].filter(e => !e.classList.contains('gone'));
                if (!els.length) return null;
                const r = els[els.length - 1].getBoundingClientRect();
                return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
            }""")
            page.mouse.click(pos['x'], pos['y'])
            page.wait_for_timeout(300)
            btn = page.evaluate("""() => { const r = document.querySelector('#pay-btn').getBoundingClientRect();
                return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
            page.mouse.click(btn['x'], btn['y'])
            page.wait_for_timeout(700)
            st = page.evaluate("""() => ({
                wig: document.getElementById('basket').classList.contains('wig'),
                pe: getComputedStyle(document.querySelector('#coin-tray .coin:not(.gone)')).pointerEvents !== 'none',
                step: MN.currentLevel.step, retries: MN.currentLevel.retries,
                sum: MN.quiz.sum })""")
            check('wrong submit: basket wig / coins clickable (not grayed) / step unchanged',
                  st['wig'] and st['pe'] and st['step'] == 0 and st['retries'] == 1, str(st))
            wrong_done = True
            continue
        q = page.evaluate('MN.quiz')
        guard = 0
        while q['sum'] < q['price'] and guard < 12:
            r = gather_coin_click(page)
            if r is None:
                break
            q = r
            guard += 1
        page.wait_for_timeout(700)                       # 等飞入落地+篮渲染
        q = page.evaluate('MN.quiz')
        if q['sum'] != q['price']:
            check('gather quiz %d sum==price before pay' % answered, False, str(q))
            return False
        btn = page.evaluate("""() => { const r = document.querySelector('#pay-btn').getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
        page.mouse.click(btn['x'], btn['y'])
        page.wait_for_timeout(1100)
        answered += 1
    return answered


def key_pos(page, sel):
    return page.evaluate("""(sel) => { const r = document.querySelector(sel).getBoundingClientRect();
        return {x: r.left + r.width / 2, y: r.top + r.height * 0.55}; }""", sel)


def type_answer(page, q, skip_jiao=False):
    """真实键盘点击清空→元位数字→（带角题）5 角键"""
    page.mouse.click(**key_pos(page, '.key[data-k="clr"]'))
    page.wait_for_timeout(140)
    for ch in str(int(q['answer'])):
        page.mouse.click(**key_pos(page, '.key[data-k="%s"]' % ch))
        page.wait_for_timeout(140)
    if q['kind'] == 'jiao' and not skip_jiao:
        page.mouse.click(**key_pos(page, '#jiao-chip'))
        page.wait_for_timeout(140)


def play_change_level(page, first_wrong_no_jiao=False):
    """真实键盘打完当前 change/jiao 关：每题 清空→数字→(5 角键)→"算好啦"确认"""
    wrong_done = not first_wrong_no_jiao
    answered = 0
    while answered < 30:
        q = page.evaluate('MN.quiz')
        if q is None or q['kind'] not in ('change', 'jiao'):
            break
        if not wrong_done:                              # 首个 jiao 题缺角错一次（ch4）：显示区 wig 不灰化
            step_before = q['step']
            type_answer(page, q, skip_jiao=True)
            page.mouse.click(**key_pos(page, '#confirm-btn'))
            page.wait_for_timeout(700)
            st = page.evaluate("""() => ({
                wig: document.getElementById('ans-display').classList.contains('wig'),
                pe: getComputedStyle(document.querySelector('.key[data-k=\\'1\\']')).pointerEvents !== 'none',
                miss: MN.quiz.miss, step: MN.currentLevel.step })""")
            check('wrong confirm (no jiao): display wig / keys clickable / step unchanged',
                  st['wig'] and st['pe'] and st['miss'] == 1 and st['step'] == step_before, str(st))
            wrong_done = True
            continue
        type_answer(page, q)
        page.mouse.click(**key_pos(page, '#confirm-btn'))
        page.wait_for_timeout(1100)
        answered += 1
    return answered


def tap_targets(page, phase):
    """触摸目标审计：币 ≥64（gather 期）/ 键盘键 ≥64（keyboard 期）、答案显示/给钱啦/算好啦 ≥96、按钮 ≥64（家长钮豁免）"""
    coins = page.evaluate("""() => {
        const els = [...document.querySelectorAll('#coin-tray .coin')].filter(e => !e.classList.contains('gone'));
        return els.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
    }""")
    coinOk = (len(coins) == 0) or all(w >= 64 and h >= 64 for w, h in coins)
    keys = page.evaluate("""() => [...document.querySelectorAll('#keypad .key')].map(
        e => { const r = e.getBoundingClientRect(); return [r.width, r.height, getComputedStyle(e).display]; })""")
    vis = [(w, h) for w, h, d in keys if w > 0 and h > 0]   # 键盘隐藏时子键 rect=0（display:none 父级）
    if phase == 'gather':
        keyOk = len(keys) == 12 and len(vis) == 0      # gather 期键盘整体隐藏
    else:
        keyOk = len(keys) == 12 and len(vis) == 12 and all(w >= 64 and h >= 64 for w, h in vis)
    big = page.evaluate("""() => {
        const out = [];
        ['#pay-btn', '#confirm-btn', '#ans-display', '#jiao-chip'].forEach(s => {
            const b = document.querySelector(s);
            if (b) { const r = b.getBoundingClientRect(); out.push([s, r.width, r.height]); }
        });
        return out;
    }""")
    bigOk = all(w >= 96 and h >= 96 for _, w, h in big) and len(big) >= 1
    btns = page.evaluate("""() => {
        const out = [];
        document.querySelectorAll('button').forEach(b => {
            if (b.classList.contains('k-parentbtn')) return;
            const r = b.getBoundingClientRect();
            if (r.width > 4 && r.height > 4) out.push([r.width, r.height]);
        });
        return out;
    }""")
    btnOk = all(w >= 64 and h >= 64 for w, h in btns)
    ox = page.evaluate('Math.max(document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth)')
    if phase == 'gather':
        return coinOk and keyOk, bigOk, btnOk, ox
    return keyOk and coinOk, bigOk, btnOk, ox


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])

        # ---------- 1a. verify=1（横视口） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('verify: ' + str(e)))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.startsWith('VERIFY')", timeout=60000)
        r = json.loads(page.eval_on_selector('#verify-result', 'el => el.textContent'))
        check('verify=1 title PASS', page.title().startswith('VERIFY PASS'), page.title())
        check('verify pass==total', r['pass'] == r['total'], '%s/%s layoutOk=%s' % (r['pass'], r['total'], r['layoutOk']))
        page.close()

        # ---------- 1b. P1b 真竖轮（800×1180 @media 真通道；M3——verify 全绿+#logo 锚宽 42） ----------
        page = browser.new_page(viewport={'width': 800, 'height': 1180})
        page.on('pageerror', lambda e: errors.append('verifyP: ' + str(e)))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.startsWith('VERIFY')", timeout=90000)
        title_b = page.title()
        logo_w = page.evaluate("document.getElementById('logo') && document.getElementById('logo').offsetWidth")
        check('P1b verify(portrait 800x1180) PASS + logoW=42',
              title_b.startswith('VERIFY PASS') and logo_w and abs(logo_w - 42) <= 1,
              '%s | logoW=%s' % (title_b, logo_w))
        page.close()

        # ---------- 2. 真实点击通关 flat0 gather（预置存档跳教学；含 5 角币） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.MN && MN.quiz', timeout=8000)
        q0 = page.evaluate('MN.quiz')
        check('flat0 loaded (gather, r15 含角池)', q0['kind'] == 'gather' and q0['sum'] == 0, str(q0)[:120])
        page.screenshot(path=str(SHOTS / 'gather_1280.png'))
        answered = play_gather_level(page, first_wrong=True)
        check('played 5 quizzes by real clicks', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('celebrate overlay shown', True)
        page.wait_for_timeout(5400)                      # celebrate 2.3s+收尾→写档，等足 5.4s 再读
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_money'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('save after win: 1-0 stars>=1', bool(saved) and saved['stars'] >= 1, str(saved))

        # ---------- 2b. flat5（ch2 买两件合计）真实通关 ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(5)))
        page.reload()
        page.wait_for_function('window.MN && MN.quiz', timeout=8000)
        st5 = page.evaluate('({dch: MN.currentLevel.dch, warm: MN.quiz.kind, a: MN.quiz.priceA, b: MN.quiz.priceB})')
        check('flat5 warmup = ch1 型（dch2 首题 gather）', st5['dch'] == 2 and st5['warm'] == 'gather', str(st5))
        page.screenshot(path=str(SHOTS / 'pair_1280.png'))
        answered = play_gather_level(page)
        check('flat5 pair level played through (5 quizzes)', answered == 5, answered)

        # ---------- 3. flat10 找零真实键盘打字通关（预置 done 0-9） ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(10)))
        page.reload()
        page.wait_for_function('window.MN && MN.quiz', timeout=8000)
        q10 = page.evaluate('MN.quiz')
        check('flat10 loaded (change keyboard)', q10['kind'] == 'change' and q10['digits'] == '', str(q10)[:120])
        page.screenshot(path=str(SHOTS / 'change_1280.png'))
        answered = play_change_level(page)
        check('flat10: played 5 change quizzes by real key clicks', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.wait_for_timeout(5400)
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_money'));
            return s && s.levels && s.levels['3-0'] ? s.levels['3-0'] : null; }""")
        check('flat10 save: 3-0 stars>=1', bool(saved) and saved['stars'] >= 1, str(saved))

        # ---------- 3b. flat15 ch4 带 5 角键：缺角先错一次再补角通关 + 救援钟 ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(15)))
        page.reload()
        page.wait_for_function('window.MN && MN.quiz', timeout=8000)
        # 先打热身题进 jiao 题
        q0c = page.evaluate('MN.quiz')
        type_answer(page, q0c)
        page.mouse.click(**key_pos(page, '#confirm-btn'))
        page.wait_for_timeout(1100)
        qj = page.evaluate('MN.quiz')
        check('flat15 qi1 = jiao with 5角 key', qj['kind'] == 'jiao' and qj['answer'] % 1 == 0.5, str(qj)[:120])
        page.screenshot(path=str(SHOTS / 'jiao_1280.png'))
        answered = play_change_level(page, first_wrong_no_jiao=True)
        check('flat15 jiao level played (warm+4 jiao, 1 wrong)', answered == 4, answered)
        # 救援钟：错确认不重置，14s 救援触发（键盘期正确键 breathe）
        page.evaluate('localStorage.clear()')
        page.evaluate(preset_save(tut_seen=True, done_flats=range(15)))
        page.reload()
        page.wait_for_function('window.MN && MN.quiz', timeout=8000)
        q0c = page.evaluate('MN.quiz')
        type_answer(page, q0c)
        page.mouse.click(**key_pos(page, '#confirm-btn'))
        page.wait_for_timeout(1100)
        page.mouse.click(**key_pos(page, '.key[data-k="9"]'))   # 错一位数字（不重置救援钟 §0.7a）
        page.mouse.click(**key_pos(page, '#confirm-btn'))
        t0 = time.time()
        page.wait_for_timeout(10000)
        st = page.evaluate('({rescues: MN.rescues, miss: MN.quiz ? MN.quiz.miss : null})')
        check('no rescue before 14s after wrong confirm (miss=%s)' % st['miss'], st['rescues'] == 0, str(st))
        page.wait_for_timeout(5200)                     # 总静置 ≈15.2s
        st = page.evaluate("""() => ({rescues: MN.rescues,
            breathe: !!document.querySelector('#keypad .key.breathe, #confirm-btn.breathe, #jiao-chip.breathe')})""")
        check('rescue fired after 14s idle (rescues>=1, correct key breathes)',
              st['rescues'] >= 1 and st['breathe'], str(st))
        check('rescue timing sane (wrong confirm did not reset clock)', st['rescues'] >= 1,
              'elapsed=%.1fs' % (time.time() - t0))

        # ---------- 5. 双 viewport 触摸目标与 overflowX ----------
        for vp in [(1280, 800), (800, 1180)]:
            page.set_viewport_size({'width': vp[0], 'height': vp[1]})
            page.wait_for_timeout(800)                    # 等入场动画结束再量（transform 中途陷阱）
            tp, big, b1, ox1 = tap_targets(page, 'keyboard')   # 当前 jiao 期（键盘+5 角键）
            check('viewport %dx%d: keys>=64 & big>=96 & buttons>=64 & overflowX==0 (keyboard)' % vp,
                  tp and big and b1 and ox1 == 0, 'tap=%s big=%s btn=%s ox=%s' % (tp, big, b1, ox1))
            page.screenshot(path=str(SHOTS / ('vp_%dx%d_keyboard.png' % vp)))
        # gather 期另一页量币
        page2 = browser.new_page(viewport={'width': 800, 'height': 1180})
        page2.on('pageerror', lambda e: errors.append('vp: ' + str(e)))
        page2.goto(URL)
        page2.evaluate(preset_save(tut_seen=True))
        page2.reload()
        page2.wait_for_function('window.MN && MN.quiz', timeout=8000)
        page2.wait_for_timeout(800)
        tp2, big2, b2, ox2 = tap_targets(page2, 'gather')
        check('viewport 800x1180: coins>=64 & pay-btn>=96 & buttons>=64 & overflowX==0 (gather)',
              tp2 and big2 and b2 and ox2 == 0, 'tap=%s big=%s btn=%s ox=%s' % (tp2, big2, b2, ox2))
        page2.screenshot(path=str(SHOTS / 'vp_800x1180_gather.png'))
        page2.close()

        # ---------- 6. 教学期乱点被吞 + 重玩门（全新存档 → watch demo 期） ----------
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_function('window.MN && MN.tutorial === "watch"', timeout=8000)
        page.evaluate("""() => { window.__popCount = 0;
            const o = KIDS.audio.sfx;
            /* 必须保 this（sfx 内部读 this.ctx）：普通函数 + call 回绑 */
            KIDS.audio.sfx = function (n) { if (n === 'pop') window.__popCount++; return o.call(KIDS.audio, n); }; }""")
        page.wait_for_timeout(600)                       # watch 演示进行中
        for _ in range(4):                               # 真实乱点币（主交互区）
            pos = page.evaluate("""() => {
                const els = [...document.querySelectorAll('#coin-tray .coin')].filter(e => !e.classList.contains('gone'));
                const el = els[Math.min(1, els.length - 1)];
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
            }""")
            if pos:
                page.mouse.click(pos['x'], pos['y'])
                page.wait_for_timeout(160)
        # 重玩门：demo 期点"再玩一次"无效（flat 不变、教学不中断）
        rp = page.evaluate("""() => { const r = document.querySelector('#btn-replay').getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
        flatBefore = page.evaluate('MN.currentLevel.flat')
        page.mouse.click(rp['x'], rp['y'])
        page.wait_for_timeout(400)
        st = page.evaluate('({step: MN.currentLevel.step, pops: window.__popCount, tut: MN.tutorial, flat: MN.currentLevel.flat, demoFlat: MN.currentLevel.flat})')
        check('tutorial watch: clicks swallowed (step==0)', st['step'] == 0, str(st))
        check('tutorial watch: pop feedback fired (>=1)', st['pops'] >= 1, str(st))
        check('replay gate: demo 期重玩无效 (flat unchanged)',
              st['flat'] == flatBefore and st['tut'] == 'watch', str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_watch.png'))
        page.close()
        browser.close()

    # ---------- 7. 构建自检：clips 注入条数 + script 块数 ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('data:audio/mpeg')
    men_keys = [k for k in ['men_tut_watch', 'men_tut_turn', 'men_hint', 'men_wrong',
                            'men_q_buy', 'men_q_buy2', 'men_q_buy_j', 'men_q_and', 'men_q_and_j',
                            'men_q_pay', 'men_q_pay2', 'men_q_pay3', 'men_q_jiao'] +
                ['men_n_%d' % n for n in range(1, 21)] if '"%s"' % k in html]
    check('index.html clips: 36 data:audio (33 men_* + 3 core_*)', n_audio == 36, n_audio)
    check('all 33 men_* clip keys embedded', len(men_keys) == 33, '%d/33' % len(men_keys))
    check('script blocks == 4 (verify 独立第 4 块)', html.count('<script>') == 4, html.count('<script>'))
    check('single file fully offline', 'http://' not in html.replace('http://www.w3.org/2000/svg', '') and 'https://' not in html)

    # ---------- 8. 截图非空白（celebrate 覆盖层=core 大面积纯色暖米底，阈值放宽到 4） ----------
    for shot, floor in [('gather_1280.png', 5.0), ('pair_1280.png', 5.0), ('change_1280.png', 5.0),
                        ('jiao_1280.png', 5.0), ('celebrate.png', 4.0),
                        ('vp_800x1180_gather.png', 5.0), ('vp_800x1180_keyboard.png', 5.0),
                        ('tutorial_watch.png', 5.0)]:
        ok, detail = png_nonblank(SHOTS / shot, floor)
        check('screenshot non-blank: ' + shot, ok, detail)

    check('0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
