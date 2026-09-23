# -*- coding: utf-8 -*-
"""cashier _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 0 pageerror
2. 预置存档(跳过教学) → flat0 真实 pointer：空提交不计次 → 首题先错一次（托盘晃动不灰化可调整）
   → 移回落 → 贪心逐币点击 → 点"找零"→ 5 题通关 → .k-celebrate → 5.4s 读档 stars>=1
3. flat10（ch3 付20）真实贪心点击通关（预置 done 0-9）→ celebrate → 写档 3-0
4. M2（batch14 教训）：正确提交演出窗内再点"找零"提交键 → pop 轻叮+miss 零增量
5. 救援钟：放币（探索）不重置 → 10s 无救援 → 15s 救援触发（rescues>=1 + find-card 亮起 + 首币 breathe）
6. 双 viewport(1280x800/800x1180)：overflowX==0、币/托盘币 ≥64、"找零" ≥96、按钮 ≥64（家长钮豁免）
7. 全新存档 → 教学 watch 期真实乱点被吞（step 不变 + pop 计数>0 §0.22）+ 重玩门（demo 期无效）
   → watch 演示完成 __csDemoR==='right' → tut='help' → 真实点对首题 → tut='solo'（看-帮-独链走完）
8. 构建自检：index.html 含 cas 全部 46 条 + core 3 条 clips（data:audio/mpeg 共 49）+ 完全离线
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=()):
    save = {
        'v': '1.0', 'game': 'cashier', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'cashier': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_cashier", ' + json.dumps(json.dumps(save)) + ')'


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


def coin_click(page, yuan_v):
    """真实点击一枚指定面值（元制 data-v：5/2/1/0.5，§0.28 真实人民币面值）未入盘币"""
    pos = page.evaluate("""(v) => {
        const els = [...document.querySelectorAll('#coin-tray .coin')].filter(
            e => Number(e.dataset.v) === v && !e.classList.contains('gone'));
        if (!els.length) return null;
        const r = els[0].getBoundingClientRect();
        return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
    }""", yuan_v)
    if pos is None:
        return False
    page.mouse.click(pos['x'], pos['y'])
    page.wait_for_timeout(140)
    return True


def greedy_click(page):
    """对当前题按贪心（5→2→1→0.5 元）逐枚真实点击至合计=找零，返回终态 quiz"""
    guard = 0
    q = page.evaluate('CS.quiz')
    while q and q['sum'] < q['change'] and guard < 14:
        need = round(q['change'] - q['sum'], 2)
        picked = False
        for yv in (5, 2, 1, 0.5):
            if need + 1e-9 >= yv:
                if coin_click(page, yv):
                    picked = True
                break
        if not picked:
            break
        q = page.evaluate('CS.quiz')
        guard += 1
    return page.evaluate('CS.quiz')


def click_submit(page):
    pos = page.evaluate("""() => { const r = document.querySelector('#pay-btn').getBoundingClientRect();
        return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
    page.mouse.click(pos['x'], pos['y'])


def clear_tray(page):
    """真实点击移回全部托盘币"""
    guard = 0
    while guard < 16:
        pos = page.evaluate("""() => {
            const els = [...document.querySelectorAll('#basket .tcoin')];
            if (!els.length) return null;
            const r = els[els.length - 1].getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
        }""")
        if pos is None:
            break
        page.mouse.click(pos['x'], pos['y'])
        page.wait_for_timeout(120)
        guard += 1


def play_level(page, first_wrong=False, empty_first=False):
    """真实点击打完当前关：每题贪心逐币点击→（首题可选空提交/错一次）→点找零"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = page.evaluate('CS.quiz')
        if q is None:
            break
        if not wrong_done:
            if empty_first:                      # 空提交：不计次（§1 口径）
                click_submit(page)
                page.wait_for_timeout(500)
                st = page.evaluate("""() => ({
                    nudge: document.getElementById('basket').classList.contains('nudge'),
                    retries: CS.currentLevel.retries, miss: CS.quiz.miss })""")
                check('empty submit: nudge + no miss counted',
                      st['nudge'] and st['retries'] == 0 and st['miss'] == 0, str(st))
            wv = 5 if q['change'] != 5 else 2    # 放一枚保证 ≠找零 → 错提交（元制面值）
            coin_click(page, wv)
            page.wait_for_timeout(300)
            click_submit(page)
            page.wait_for_timeout(700)
            st = page.evaluate("""() => ({
                wig: document.getElementById('basket').classList.contains('wig'),
                pe: getComputedStyle(document.querySelector('#coin-tray .coin:not(.gone)')).pointerEvents !== 'none',
                step: CS.currentLevel.step, retries: CS.currentLevel.retries,
                find: document.getElementById('find-card').classList.contains('show') })""")
            check('wrong submit: tray wig / coins clickable (not grayed) / step unchanged / first miss no rescue card',
                  st['wig'] and st['pe'] and st['step'] == 0 and st['retries'] == 1 and not st['find'], str(st))
            wrong_done = True
            clear_tray(page)
            st2 = page.evaluate('({sum: CS.quiz.sum})')
            if st2['sum'] != 0:
                check('coins removable back to zero', False, str(st2))
            continue
        q = greedy_click(page)
        page.wait_for_timeout(700)               # 等飞入落地+托盘渲染
        if q is None or abs(q['sum'] - q['change']) > 1e-9:
            check('quiz %d greedy sum==change before submit' % answered, False, str(q))
            return False
        click_submit(page)
        page.wait_for_timeout(1100)
        answered += 1
    return answered


def tap_targets(page):
    """触摸目标审计：币 ≥64、托盘币 ≥64、找零按钮 ≥96、按钮 ≥64（家长钮豁免）"""
    coins = page.evaluate("""() => [...document.querySelectorAll('#coin-tray .coin')].map(
        e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })""")
    coinOk = (len(coins) == 0) or all(w >= 64 and h >= 64 for w, h in coins)
    tks = page.evaluate("""() => [...document.querySelectorAll('#basket .tcoin')].map(
        e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })""")
    tkOk = (len(tks) == 0) or all(w >= 64 and h >= 64 for w, h in tks)
    pay = page.evaluate("""() => { const b = document.querySelector('#pay-btn');
        if (!b) return null; const r = b.getBoundingClientRect(); return [r.width, r.height]; }""")
    payOk = pay is None or (pay[0] >= 96 and pay[1] >= 96)
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
    return coinOk, tkOk, payOk, btnOk, ox


def wrap_pop_count(page):
    page.evaluate("""() => { window.__popCount = 0;
        const o = KIDS.audio.sfx;
        /* 必须保 this（sfx 内部读 this.ctx）：普通函数 + call 回绑 */
        KIDS.audio.sfx = function (n) { if (n === 'pop') window.__popCount++; return o.call(KIDS.audio, n); }; }""")


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

        # ---------- 2. 真实点击通关 flat0（预置存档跳教学；空提交+首错各一次 → 1 错=2 星） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.CS && CS.quiz', timeout=8000)
        q0 = page.evaluate('CS.quiz')
        check('flat0 loaded (cashier)', q0['sum'] == 0 and q0['tray'] == [], str(q0)[:120])
        page.screenshot(path=str(SHOTS / 'cashier_1280.png'))
        answered = play_level(page, first_wrong=True, empty_first=True)
        check('played 5 quizzes by real clicks', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('celebrate overlay shown', True)
        page.wait_for_timeout(5400)                      # celebrate 2.3s+收尾→写档，等足 5.4s 再读
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_cashier'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('save after win: 1-0 stars==2 (1 wrong submit)', bool(saved) and saved['stars'] == 2, str(saved))

        # ---------- 3. M2：正确提交演出窗内再点提交键 → pop 轻叮+零 miss 增量（§0.22） ----------
        page.evaluate(preset_save(tut_seen=True))        # 重置到 flat0（1-0 未写过）
        page.reload()
        page.wait_for_function('window.CS && CS.quiz', timeout=8000)
        wrap_pop_count(page)
        greedy_click(page)
        page.wait_for_timeout(700)
        click_submit(page)                               # 正确提交 → 880ms 演出窗（locked）
        page.wait_for_timeout(200)
        click_submit(page)                               # 窗内再点提交键：吞输入+pop+nudge
        page.wait_for_timeout(1000)
        st = page.evaluate("""() => ({pops: window.__popCount,
            retries: CS.currentLevel.retries, step: CS.currentLevel.step,
            nudge: !!document.querySelector('#pay-btn.nudge') })""")
        check('M2: submit key swallowed in window → pop + no extra miss + advances',
              st['pops'] >= 1 and st['retries'] == 0 and st['step'] == 1, str(st))

        # ---------- 4. flat10（ch3 付20）真实贪心点击通关（预置 done 0-9） ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(10)))
        page.reload()
        page.wait_for_function('window.CS && CS.quiz', timeout=8000)
        q10 = page.evaluate('CS.quiz')
        check('flat10 loaded (pay 20)', q10['paid'] == 20, str(q10)[:120])
        board = page.evaluate("""() => ({
            chalk: document.getElementById('chalk').textContent.indexOf('付了') >= 0,
            bill: !!document.querySelector('#prompt-chip .bill svg') })""")
        check('flat10 board: chalk 付了 + bill svg', board['chalk'] and board['bill'], str(board))
        page.screenshot(path=str(SHOTS / 'flat10_1280.png'))
        answered = play_level(page)
        check('flat10: played 5 quizzes by real clicks', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.wait_for_timeout(5400)
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_cashier'));
            return s && s.levels && s.levels['3-0'] ? s.levels['3-0'] : null; }""")
        check('flat10 save: 3-0 stars==3', bool(saved) and saved['stars'] == 3, str(saved))

        # ---------- 5. 救援钟：放币（探索）不重置 → 14s 救援（find-card 亮起+首币 breathe） ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(10)))
        page.reload()
        page.wait_for_function('window.CS && CS.quiz', timeout=8000)
        wrap_pop_count(page)
        coin_click(page, 5)                              # 放一枚 5 元币=探索（§0.7a 不重置救援钟）
        t0 = time.time()
        page.wait_for_timeout(10000)
        st = page.evaluate('({rescues: CS.rescues})')
        check('no rescue before 14s after coin placement (explore did not reset)', st['rescues'] == 0, str(st))
        page.wait_for_timeout(5200)                      # 总静置 ≈15.2s
        st = page.evaluate("""() => ({rescues: CS.rescues,
            find: document.getElementById('find-card').classList.contains('show'),
            findTxt: document.getElementById('find-card').querySelector('.main').textContent,
            breathe: !!document.querySelector('#coin-tray .coin.breathe') })""")
        check('rescue fired after 14s idle (find-card shows Z + first coin breathes)',
              st['rescues'] >= 1 and st['find'] and st['breathe'], str(st))
        check('rescue timing sane (coin placement did not reset clock)', st['rescues'] >= 1,
              'elapsed=%.1fs' % (time.time() - t0))

        # ---------- 6. 双 viewport 触摸目标与 overflowX ----------
        for vp in [(1280, 800), (800, 1180)]:
            page.set_viewport_size({'width': vp[0], 'height': vp[1]})
            page.wait_for_timeout(800)                    # 等入场动画结束再量（transform 中途陷阱）
            c1, t1, p1, b1, ox1 = tap_targets(page)
            check('viewport %dx%d: coins+tray>=64 & pay>=96 & buttons>=64 & overflowX==0' % vp,
                  c1 and t1 and p1 and b1 and ox1 == 0, 'coin=%s tk=%s pay=%s btn=%s ox=%s' % (c1, t1, p1, b1, ox1))
            page.screenshot(path=str(SHOTS / ('vp_%dx%d.png' % vp)))
        page.close()

        # ---------- 7. 教学看-帮-独链（全新存档）：watch 乱点被吞+重玩门 → demoR → help → solo ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('tut: ' + str(e)))
        page.goto(URL)
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_function('window.CS && CS.tutorial === "watch"', timeout=8000)
        wrap_pop_count(page)
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
        flatBefore = page.evaluate('CS.currentLevel.flat')
        page.mouse.click(rp['x'], rp['y'])
        page.wait_for_timeout(400)
        st = page.evaluate('({step: CS.currentLevel.step, pops: window.__popCount, tut: CS.tutorial, flat: CS.currentLevel.flat})')
        check('tutorial watch: clicks swallowed (step==0)', st['step'] == 0, str(st))
        check('tutorial watch: pop feedback fired (>=1)', st['pops'] >= 1, str(st))
        check('replay gate: demo 期重玩无效 (flat unchanged)',
              st['flat'] == flatBefore and st['tut'] == 'watch', str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_watch.png'))
        page.wait_for_function('CS.tutorial === "help"', timeout=30000)   # 演示完成→重发同关→帮
        st = page.evaluate("""() => ({demoR: window.__csDemoR, flat: CS.currentLevel.flat,
            step: CS.quiz ? CS.quiz.step : null, sum: CS.quiz ? CS.quiz.sum : null,
            handoff: true })""")
        check('tutorial handoff: __csDemoR=="right" + re-issued flat0 + fresh empty tray',
              st['demoR'] == 'right' and st['flat'] == 0 and st['step'] == 0 and st['sum'] == 0, str(st))
        q = greedy_click(page)                           # "独"：孩子真实点对首题 → 放手
        page.wait_for_timeout(700)
        click_submit(page)
        page.wait_for_timeout(1100)
        st = page.evaluate('({tut: CS.tutorial, step: CS.currentLevel.step})')
        check('tutorial solo: first correct submit releases hand (tut=solo, step advanced)',
              st['tut'] == 'solo' and st['step'] == 1, str(st))
        page.close()
        browser.close()

    # ---------- 8. 构建自检：clips 注入条数 + 完全离线 ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('data:audio/mpeg')
    cas_keys = [k for k in ['cas_tut_watch', 'cas_tut_turn', 'cas_hint', 'cas_right', 'cas_wrong',
                            'cas_q_more', 'cas_q_less', 'cas_q1', 'cas_q2', 'cas_q3', 'cas_q3j'] +
                ['cas_n_%d' % n for n in range(1, 36)] if '"%s"' % k in html]
    check('index.html clips: 49 data:audio (46 cas_* + 3 core_*)', n_audio == 49, n_audio)
    check('all 46 cas_* clip keys embedded', len(cas_keys) == 46, '%d/46' % len(cas_keys))
    stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
    check('single file fully offline',
          'http://' not in stripped and 'https://' not in stripped and ' src=' not in stripped and ' href=' not in stripped)

    # ---------- 9. 截图非空白 ----------
    for shot, floor in [('cashier_1280.png', 5.0), ('flat10_1280.png', 5.0), ('celebrate.png', 4.0),
                        ('vp_1280x800.png', 5.0), ('vp_800x1180.png', 5.0), ('tutorial_watch.png', 5.0)]:
        ok, detail = png_nonblank(SHOTS / shot, floor)
        check('screenshot non-blank: ' + shot, ok, detail)

    check('0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
