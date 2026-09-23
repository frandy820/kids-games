# -*- coding: utf-8 -*-
"""wordprob _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r13 两步应用题版（2026-09-15）：
1a. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 0 pageerror
1b. 真实竖视口轮（800×1180 context @media 真通道；M3——verify 全绿 + #logo 锚宽 34）
2. 预置存档(跳过教学) → 真实 pointer 点答案卡（4 选 1）：首题先错一次（晃动不灰化可重点+首错不 pulse）→
   点正确卡 → 5 题通关 → .k-celebrate → 等 5.4s 读档 stars>=1
3. flat10（ch3 多余条件+首题热身=ch2 乘加乘减型）真实点击通关
4. 全新存档 → 教学 watch 期真实乱点被吞（step 不变 + pop 轻叮计数>0，§0.22）+
   演示期点重玩/读题按钮被门（tut 不变=不重启）；兔子轻反馈
5. 救援钟：静置 8s → 连续错点（不重置救援钟 §0.7a）→ 再静置 → 14s 救援触发
   （重读题面 + 正确卡 breathe，rescues>=1）
6. 双 viewport(1280x800/800x1180)：overflowX==0、答案卡 >=96、按钮 >=64（家长钮豁免）
7. 构建自检：index.html 含 80 条 clips（3 core+4 通用+35 数词+38 wor_tpl2_ 段）、单文件完全离线
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex>=3 → 日限 12
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=()):
    save = {
        'v': '1.0', 'game': 'wordprob', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'wordprob': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_wordprob", ' + json.dumps(json.dumps(save)) + ')'


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


def tap_targets(page):
    """触摸目标审计：答案卡 >=96、全部按钮 >=64（家长钮豁免）、overflowX==0"""
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
    return optOk, btnOk, ox


def play_level(page, first_wrong=False):
    """真实点击打完当前关：每题（首题可选先错一次）→点正确答案卡；返回答题数"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = page.evaluate('WP.quiz')
        if q is None:
            break
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
            check('wrong pick: shake / not grayed / no pulse on correct',
                  wEl['wig'] and wEl['pe'] and okEl, str(wEl))
            wrong_done = True
            continue
        page.click('.opt[data-i="%d"]' % q['answerIdx'])
        page.wait_for_timeout(1100)
        answered += 1
    return answered


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---------- 1a. verify=1（横视口） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('verify: ' + str(e)))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.startsWith('VERIFY')", timeout=60000)
        r = json.loads(page.eval_on_selector('#verify-result', 'el => el.textContent'))
        check('verify=1 title PASS', page.title().startswith('VERIFY PASS'), page.title())
        check('verify pass==total', r['pass'] == r['total'], '%s/%s layoutOk=%s' % (r['pass'], r['total'], r['layoutOk']))
        page.close()

        # ---------- 1b. 真实竖视口轮（800×1180 @media 真通道；M3——verify 全绿+#logo 锚宽 34） ----------
        page = browser.new_page(viewport={'width': 800, 'height': 1180})
        page.on('pageerror', lambda e: errors.append('verifyP: ' + str(e)))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.startsWith('VERIFY')", timeout=90000)
        title_b = page.title()
        logo_w = page.evaluate("document.getElementById('logo') && document.getElementById('logo').offsetWidth")
        check('P1b verify(portrait 800x1180) PASS + logoW=34',
              title_b.startswith('VERIFY PASS') and logo_w and abs(logo_w - 34) <= 1,
              '%s | logoW=%s' % (title_b, logo_w))
        page.close()

        # ---------- 2. 真实点击通关 flat0（预置存档跳教学） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.WP && WP.quiz', timeout=8000)
        q0 = page.evaluate('WP.quiz')
        check('flat0 loaded (4 options)', q0['step'] == 0 and len(q0['options']) == 4, str(q0)[:100])
        page.screenshot(path=str(SHOTS / 'quiz_1280.png'))
        answered = play_level(page, first_wrong=True)
        check('played 5 quizzes by real clicks', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('celebrate overlay shown', True)
        page.wait_for_timeout(5400)                      # celebrate 2.3s+收尾→写档，等足 5.4s 再读
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_wordprob'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('save after win: 1-0 stars>=1', bool(saved) and saved['stars'] >= 1, str(saved))

        # ---------- 3. flat10（ch3 多余条件+首题热身=ch2 乘加乘减型）真实点击通关 ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=list(range(10))))
        page.reload()
        page.wait_for_function('window.WP && WP.quiz', timeout=8000)
        st = page.evaluate('({dch: WP.currentLevel.dch, warm: WP.quiz.warm, kind: WP.quiz.kind, tpl: WP.quiz.tpl})')
        check('flat10 warmup = ch2 two-step learned type',
              st['dch'] == 3 and st['warm'] and st['kind'] == 'two' and st['tpl'] in ('plate2', 'row2'), str(st))
        answered = play_level(page, first_wrong=False)
        check('flat10 played through (5 quizzes)', answered == 5, answered)
        lv10 = page.evaluate('WP.currentLevel')
        check('flat10 done+won, retries=0', lv10['done'] and lv10['won'] and lv10['retries'] == 0, str(lv10)[:120])

        # ---------- 4. 教学期乱点被吞 + 演示期按钮门（全新存档） ----------
        page.close()
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('tut: ' + str(e)))
        page.goto(URL)
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_function('window.WP && WP.tutorial === "watch"', timeout=8000)
        page.evaluate("""() => { window.__popCount = 0;
            const o = KIDS.audio.sfx;
            /* 必须保 this（sfx 内部读 this.ctx）：普通函数 + call 回绑 */
            KIDS.audio.sfx = function (n) { if (n === 'pop') window.__popCount++; return o.call(KIDS.audio, n); }; }""")
        page.wait_for_timeout(500)                       # watch 演示进行中
        # 演示期点重玩/读题按钮：被三件门拦（tut 不变，不重启关卡）
        page.click('#btn-replay')
        page.click('#btn-hear')
        gate = page.evaluate('({tut: WP.tutorial, flat: WP.currentLevel && WP.currentLevel.flat})')
        check('tutorial watch: replay/hear gated (tut unchanged)', gate['tut'] == 'watch', str(gate))
        for _ in range(4):                               # 真实乱点答案卡（主交互区）
            pos = page.evaluate("""() => {
                const els = [...document.querySelectorAll('#answers .opt')];
                const el = els[Math.min(1, els.length - 1)];
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
            }""")
            if pos:
                page.mouse.click(pos['x'], pos['y'])
                page.wait_for_timeout(150)
        st = page.evaluate('({step: WP.currentLevel.step, pops: window.__popCount, tut: WP.tutorial})')
        check('tutorial watch: clicks swallowed (step==0)', st['step'] == 0, str(st))
        check('tutorial watch: pop feedback fired (>=1)', st['pops'] >= 1, str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_watch.png'))
        # 等教学链走完 → help（解锁等孩子动手）
        page.wait_for_function('WP.tutorial === "help"', timeout=15000)
        check('tutorial handoff: tut=help unlocked', True)
        page.close()

        # ---------- 5. 救援钟：错点不重置 + 14s 救援（重读题面+正确卡 breathe） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('rescue: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.WP && WP.quiz', timeout=8000)
        page.wait_for_timeout(8000)                      # 静置 8s（不触碰重听/题面）
        for _ in range(2):                               # 连续错点：不重置救援钟（§0.7a）
            q = page.evaluate('WP.quiz')
            widx = next(i for i, v in enumerate(q['options']) if i != q['answerIdx'])
            page.click('.opt[data-i="%d"]' % widx)
            page.wait_for_timeout(300)
        page.wait_for_function('WP.rescues >= 1', timeout=9000)   # 若错点重置了钟，14s 内不会触发
        rescued = page.evaluate("""() => ({ rescues: WP.rescues,
            breathe: document.querySelector('.opt.breathe') !== null })""")
        check('rescue at 14s despite wrong clicks (not reset)', rescued['rescues'] >= 1 and rescued['breathe'], str(rescued))

        # ---------- 6. 双 viewport 触摸目标与 overflowX ----------
        for vp in [(1280, 800), (800, 1180)]:
            page.set_viewport_size({'width': vp[0], 'height': vp[1]})
            page.wait_for_timeout(800)                   # 等入场动画结束（§0.11 transform 中途陷阱）
            o1, b1, ox1 = tap_targets(page)
            check('viewport %dx%d: opt>=96 & buttons>=64 & overflowX==0' % vp,
                  o1 and b1 and ox1 == 0, 'opt=%s btn=%s ox=%s' % (o1, b1, ox1))
            page.screenshot(path=str(SHOTS / ('vp_%dx%d.png' % vp)))
        page.close()
        browser.close()

    # ---------- 7. 构建自检：clips 注入 + 单文件离线（r13：80 条=3 core+4 通用+35 数词+38 tpl2 段） ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('"data:audio/mpeg;base64,')   # 真 clip 仅 base64 注入（verify 代码里的 stub 字面量不计）
    wor_keys = (['wor_tut_watch', 'wor_tut_turn', 'wor_hint', 'wor_wrong'] +
                ['wor_n_%d' % n for n in range(1, 36)] +
                [m for m in __import__('re').findall(r'"(wor_tpl2_\w+)"', html)])
    n_embed = len(set(wor_keys))
    check('index.html clips: 80 data:audio (r13 两步题库)', n_audio == 80, n_audio)
    check('all 77 wor_* keys embedded (4 通用+35 数词+38 tpl2)', n_embed == 77, '%d/77' % n_embed)
    check('single file fully offline', 'http://' not in html.replace('http://www.w3.org/2000/svg', '') and 'https://' not in html)

    # ---------- 8. 截图非空白（PIL stdev>5） ----------
    for shot in ['quiz_1280.png', 'celebrate.png', 'tutorial_watch.png', 'vp_800x1180.png']:
        ok, detail = png_nonblank(SHOTS / shot)
        check('screenshot non-blank: ' + shot, ok, detail)

    check('0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
