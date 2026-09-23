# -*- coding: utf-8 -*-
"""divide _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 0 pageerror
2. 预置存档(跳过教学) → 真实 pointer 点糖发放（逐颗飞盘+盘角标递增）→ ask 亮卡 →
   首题先错一次（晃动不灰化可重点）→ 点正确卡 → 5 题通关 → .k-celebrate → 等 5.4s 读档 stars>=1
3. 双 viewport(1280x800/800x1180)：overflowX==0、糖 ≥64、答案卡 ≥96、按钮 ≥64（家长钮豁免）
4. 全新存档 → 教学 watch 期真实乱点被吞（step 不变 + pop 轻叮计数>0，§0.22）
5. 构建自检：index.html 含 div 全部 19 条 + core 3 条 clips（data:audio/mpeg 共 22）
6. 全程 0 pageerror + 截图像素非空白（PIL stdev>10）
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
        'v': '1.0', 'game': 'divide', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'divide': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_divide", ' + json.dumps(json.dumps(save)) + ')'


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


def deal_all_by_click(page, q):
    """真实 pointer 发放：逐颗点未发的糖（中心偏下），断言 given 推进+糖 DOM gone"""
    need = q['total'] - q.get('rem', 0)
    for k in range(need):
        st = page.evaluate('DV.quiz')
        idx = next(i for i in range(st['total']) if st['given'] and True) if False else None
        # 找第一颗未 gone 的糖按钮（DOM 顺序即 data-i）
        vis = page.evaluate("""() => {
            const els = [...document.querySelectorAll('#candy-tray .candy')];
            const el = els.find(e => !e.classList.contains('gone'));
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {i: Number(el.dataset.i), x: r.left + r.width / 2, y: r.top + r.height * 0.6};
        }""")
        if vis is None:
            break
        page.mouse.click(vis['x'], vis['y'])
        page.wait_for_timeout(140)
        after = page.evaluate('DV.quiz')
        if after['phase'] == 'ask':
            break
    page.wait_for_timeout(900)          # 等 showAsk 亮卡（620ms 真实页）+入场动画
    return page.evaluate('DV.quiz')


def play_level(page, first_wrong=False):
    """真实点击打完当前关：每题发放→（首题可选先错一次）→点正确答案卡"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = page.evaluate('DV.quiz')
        if q is None:
            break
        q = deal_all_by_click(page, q)
        if q['phase'] != 'ask':
            check('quiz %d reaches ask' % answered, False, str(q))
            return False
        if not wrong_done:
            widx = next(i for i, v in enumerate(q['options']) if i != q['answerIdx'])
            page.click('.opt[data-i="%d"]' % widx)
            page.wait_for_timeout(700)
            wEl = page.evaluate("""(i) => {
                const e = document.querySelector('.opt[data-i="' + i + '"]');
                return { wig: e.classList.contains('wrong'),
                         pe: getComputedStyle(e).pointerEvents !== 'none' };
            }""", widx)
            okEl = page.evaluate("""(i) => !document.querySelector('.opt[data-i="' + i + '"]').classList.contains('breathe')""", q['answerIdx'])
            check('wrong pick: shake / not grayed (no pointer-events none) / no pulse on correct',
                  wEl['wig'] and wEl['pe'] and okEl, str(wEl))
            wrong_done = True
            continue
        page.click('.opt[data-i="%d"]' % q['answerIdx'])
        page.wait_for_timeout(1100)
        answered += 1
    return answered


def tap_targets(page):
    """触摸目标审计：糖 ≥64（deal 期可见糖）、答案卡 ≥96（ask 期）、按钮 ≥64（家长钮豁免）"""
    candy = page.evaluate("""() => {
        const els = [...document.querySelectorAll('#candy-tray .candy')].filter(e => !e.classList.contains('gone'));
        return els.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
    }""")
    candyOk = len(candy) > 0 and all(w >= 64 and h >= 64 for w, h in candy)
    opts = page.evaluate("""() => [...document.querySelectorAll('#answers .opt')].map(
        e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })""")
    optOk = (len(opts) == 0) or all(w >= 96 and h >= 96 for w, h in opts)
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
    return candyOk, optOk, btnOk, ox


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

        # ---------- 2. 真实点击通关 flat0（预置存档跳教学） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.DV && DV.quiz', timeout=8000)
        q0 = page.evaluate('DV.quiz')
        check('flat0 loaded (deal phase)', q0['phase'] == 'deal', str(q0)[:120])
        page.screenshot(path=str(SHOTS / 'deal_1280.png'))
        answered = play_level(page, first_wrong=True)
        check('played 5 quizzes by real clicks', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('celebrate overlay shown', True)
        page.wait_for_timeout(5400)                      # celebrate 2.3s+收尾→写档，等足 5.4s 再读
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_divide'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('save after win: 1-0 stars>=1', bool(saved) and saved['stars'] >= 1, str(saved))

        # ---------- 3. 双 viewport 触摸目标与 overflowX（deal 期+ask 期） ----------
        for vp in [(1280, 800), (800, 1180)]:
            ph = page.evaluate('DV.quiz ? DV.quiz.phase : null')
            if ph == 'ask':                             # 上一轮停在 ask：先答对推进回 deal 期再量
                aidx = page.evaluate('DV.quiz.answerIdx')
                page.click('.opt[data-i="%d"]' % aidx)
                page.wait_for_timeout(1300)
            page.set_viewport_size({'width': vp[0], 'height': vp[1]})
            page.wait_for_timeout(800)                  # 等新关糖果入场动画结束再量（transform 中途陷阱）
            c1, o1, b1, ox1 = tap_targets(page)          # 通关后停留：新关 deal 期或旧关重玩态
            # 发放到 ask 期再量答案卡
            q = page.evaluate('DV.quiz')
            if q:
                deal_all_by_click(page, q)
            c2, o2, b2, ox2 = tap_targets(page)
            check('viewport %dx%d: candy>=64 & buttons>=64 & overflowX==0 (deal)' % vp,
                  c1 and b1 and ox1 == 0, 'candy=%s btn=%s ox=%s' % (c1, b1, ox1))
            check('viewport %dx%d: opt>=96 & overflowX==0 (ask)' % vp,
                  o2 and b2 and ox2 == 0, 'opt=%s btn=%s ox=%s' % (o2, b2, ox2))
            page.screenshot(path=str(SHOTS / ('vp_%dx%d_ask.png' % vp)))
        page.close()

        # ---------- 4. 教学期乱点被吞（全新存档 → watch demo 期真实乱点） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('tut: ' + str(e)))
        page.goto(URL)
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_function('window.DV && DV.tutorial === "watch"', timeout=8000)
        page.evaluate("""() => { window.__popCount = 0;
            const o = KIDS.audio.sfx;
            /* 必须保 this（sfx 内部读 this.ctx）：普通函数 + call 回绑 */
            KIDS.audio.sfx = function (n) { if (n === 'pop') window.__popCount++; return o.call(KIDS.audio, n); }; }""")
        page.wait_for_timeout(600)                       # watch 演示发放进行中
        for _ in range(4):                               # 真实乱点糖（主交互区）
            pos = page.evaluate("""() => {
                const els = [...document.querySelectorAll('#candy-tray .candy')].filter(e => !e.classList.contains('gone'));
                const el = els[Math.min(1, els.length - 1)];
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
            }""")
            if pos:
                page.mouse.click(pos['x'], pos['y'])
                page.wait_for_timeout(160)
        st = page.evaluate('({step: DV.currentLevel.step, pops: window.__popCount, tut: DV.tutorial})')
        check('tutorial watch: clicks swallowed (step==0)', st['step'] == 0, str(st))
        check('tutorial watch: pop feedback fired (>=1)', st['pops'] >= 1, str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_watch.png'))
        page.close()
        browser.close()

    # ---------- 5. 构建自检：clips 注入条数 ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('data:audio/mpeg')
    div_keys = [k for k in ['div_hint', 'div_q1', 'div_q2', 'div_q3', 'div_rem1', 'div_rem2',
                            'div_tut_watch', 'div_tut_turn'] +
                ['div_n_%d' % n for n in range(2, 13)] if '"%s"' % k in html]
    check('index.html clips: 22 data:audio (19 div_* + 3 core_*)', n_audio == 22, n_audio)
    check('all 19 div_* clip keys embedded', len(div_keys) == 19, '%d/19' % len(div_keys))
    check('single file fully offline', 'http://' not in html.replace('http://www.w3.org/2000/svg', '') and 'https://' not in html)

    # ---------- 6. 截图非空白（celebrate 覆盖层=core 设计大面积纯色暖米底，阈值放宽到 4） ----------
    for shot, floor in [('deal_1280.png', 10.0), ('celebrate.png', 4.0),
                        ('vp_800x1180_ask.png', 10.0), ('tutorial_watch.png', 10.0)]:
        ok, detail = png_nonblank(SHOTS / shot, floor)
        check('screenshot non-blank: ' + shot, ok, detail)

    check('0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
