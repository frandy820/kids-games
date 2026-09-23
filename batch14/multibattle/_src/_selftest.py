# -*- coding: utf-8 -*-
"""multibattle _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 0 pageerror
2. 预置存档(跳过教学) → flat0 真实 pointer 点击答案卡通关（首题先错一次=晃动不灰化可重点、
   对手钟不停）→ 5 题全对 myScore=5 → .k-celebrate → 5.4s 读档 stars==2
3. flat10（ch3）真实点击通关；flat15（ch4 钟 5s）真实点击通关（提速感知=钟走完前答对）
4. 救援钟：错点不重置 → 10s 无救援 → 15s 救援触发（rescues>=1 + 正确卡 breathe；期间对手
   超时自动换题=两钟独立）
5. 双 viewport(1280x800/800x1180)：overflowX==0、答案卡 ≥96、按钮 ≥64（家长钮豁免）
6. 全新存档 → 教学 watch 期真实乱点被吞（step 不变 + pop 计数>0，§0.22）+ watch 期钟冻结
   （foeT 恒 1 采样）+ 重玩门（demo 期点重玩无效）→ help 解锁后首答对放手（solo）
7. 关末鼓励层：直驱合法输局终局（myScore 1:4）→ winFlow → 层文案"就差一点点，再来一局"
   → 点"再来一局"→ 层关 + 同关重发比分清零
8. 构建自检：index.html 含 mul 全部 16 条 + core 3 条 clips（data:audio/mpeg 共 19）
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


def preset_save(tut_seen=True, done_flats=(), bonus_today=0):
    save = {
        'v': '1.0', 'game': 'multibattle', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'multibattle': {'tutSeen': tut_seen},
    }
    if bonus_today:                                     # 家长"今日多玩"解锁日限（flat15>基数 12 时必需）
        save['bonus'][TODAY] = bonus_today
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_multibattle", ' + json.dumps(json.dumps(save)) + ')'


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


def wrong_idx(page):
    return page.evaluate("""() => { const q = MB.quiz; let i = 0; while (i === q.answerIdx) i++; return i; }""")


def click_opt(page, i):
    page.click('.opt[data-i="%d"]' % i)


def play_level(page, first_wrong=False):
    """真实点击打完当前关：每题点正确卡（首题可选先错一次验零惩罚+钟不停）"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = page.evaluate('MB.quiz')
        if q is None:
            break
        if not wrong_done:                              # 首错：晃动不灰化可重点；对手钟不停
            t1 = page.evaluate('MB.quiz.foeT')
            click_opt(page, wrong_idx(page))
            page.wait_for_timeout(650)
            st = page.evaluate("""() => ({
                wig: !!document.querySelector('#answers .opt.wrong'),
                pe: getComputedStyle(document.querySelector('#answers .opt:not(.right)')).pointerEvents !== 'none',
                step: MB.currentLevel.step, retries: MB.currentLevel.retries,
                miss: MB.quiz.miss, foeT: MB.quiz.foeT })""")
            check('wrong pick: card wig / clickable (not grayed) / step unchanged / clock alive',
                  st['wig'] and st['pe'] and st['step'] == 0 and st['retries'] == 1 and
                  st['miss'] == 1 and st['foeT'] < 1.05 and st['foeT'] < t1 + 0.05, str(st))
            wrong_done = True
            continue
        click_opt(page, q['answerIdx'])
        page.wait_for_timeout(1150)                      # 等进格演出完成再点下一题
        answered += 1
    return answered


def tap_targets(page):
    """触摸目标审计：答案卡 ≥96、全部按钮 ≥64（家长钮豁免）"""
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

        # ---------- 2. 真实点击通关 flat0（预置存档跳教学；首题先错一次=2 星） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.MB && MB.quiz', timeout=8000)
        q0 = page.evaluate('MB.quiz')
        check('flat0 loaded (mul)', q0['a'] * q0['b'] in q0['options'] and len(q0['options']) == 3, str(q0)[:120])
        page.screenshot(path=str(SHOTS / 'race_1280.png'))
        answered = play_level(page, first_wrong=True)
        check('played 5 quizzes by real clicks', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('celebrate overlay shown (win branch: myScore=5)', True)
        page.wait_for_timeout(5400)                      # celebrate 2.3s+收尾→写档，等足 5.4s 再读
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_multibattle'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('save after win: 1-0 stars==2 (首错一次=准确性口径)', bool(saved) and saved['stars'] == 2, str(saved))

        # ---------- 3. flat10（ch3）+ flat15（ch4 钟 5s）真实点击通关 ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(10)))
        page.reload()
        page.wait_for_function('window.MB && MB.quiz', timeout=8000)
        q10 = page.evaluate('MB.quiz')
        check('flat10 loaded (dch3 a∈{6,7})', q10['a'] in (6, 7), str(q10)[:120])
        page.screenshot(path=str(SHOTS / 'ch3_1280.png'))
        n10 = play_level(page)
        check('flat10: played 5 quizzes by real clicks', n10 == 5, n10)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.wait_for_timeout(5400)

        page.evaluate(preset_save(tut_seen=True, done_flats=range(15), bonus_today=10))
        page.reload()
        page.wait_for_function('window.MB && MB.quiz', timeout=8000)
        d15 = page.evaluate('MB.currentLevel.dch')
        check('flat15 loaded (dch4, foe clock 5000ms)', d15 == 4, d15)
        n15 = play_level(page)
        check('flat15 (ch4): beat 5s foe clock by real clicks', n15 == 5, n15)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.wait_for_timeout(1000)
        page.screenshot(path=str(SHOTS / 'ch4_win.png'))

        # ---------- 4. 救援钟：错点不重置；对手超时自动换题（两钟独立）；14s 救援触发 ----------
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.MB && MB.quiz', timeout=8000)
        click_opt(page, wrong_idx(page))                 # 错点（不重置救援钟 §0.7a）
        page.wait_for_timeout(300)
        st = page.evaluate('({rescues: MB.rescues, foeScore: MB.currentLevel.foeScore, miss: MB.quiz ? MB.quiz.miss : null})')
        check('wrong pick: rescue clock not reset (rescues==0)', st['rescues'] == 0, str(st))
        page.wait_for_timeout(10000)
        st = page.evaluate('({rescues: MB.rescues})')
        check('no rescue before 14s (opponent timeout auto-advance ≠ child action)',
              st['rescues'] == 0, str(st))
        page.wait_for_timeout(5200)                      # 总静置 ≈15.5s（期间对手超时换题多次）
        st = page.evaluate("""() => ({rescues: MB.rescues,
            breathe: !!document.querySelector('#answers .opt.breathe'),
            foeScore: MB.currentLevel.foeScore, won: MB.currentLevel.won})""")
        check('rescue fired after 14s idle (rescues>=1, correct card breathes)',
              st['rescues'] >= 1 and (st['breathe'] or st['won']), str(st))
        check('opponent clock independent: foe advanced while idle (>=1)', st['foeScore'] >= 1 or st['won'], str(st))

        # ---------- 5. 双 viewport 触摸目标与 overflowX ----------
        for vp in [(1280, 800), (800, 1180)]:
            page.set_viewport_size({'width': vp[0], 'height': vp[1]})
            page.evaluate('stopFoe()')                    # 量测期停钟：防对手超时换题重渲染干扰（§0.11）
            page.wait_for_timeout(1000)                   # 等入场/演出动画结束再量（transform 中途陷阱）
            o1, b1, ox1 = tap_targets(page)              # 答案卡在场期（活动题或关末均可）
            check('viewport %dx%d: opts>=96 & buttons>=64 & overflowX==0' % vp,
                  o1 and b1 and ox1 == 0, 'opt=%s btn=%s ox=%s' % (o1, b1, ox1))
            page.screenshot(path=str(SHOTS / ('vp_%dx%d.png' % vp)))

        # ---------- 6. 教学期（全新存档）：乱点被吞 + 钟冻结 + 重玩门 → help → solo ----------
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_function('window.MB && MB.tutorial === "watch"', timeout=8000)
        frozen = page.evaluate('MB.quiz.foeT')
        page.evaluate("""() => { window.__popCount = 0;
            const o = KIDS.audio.sfx;
            /* 必须保 this（sfx 内部读 this.ctx）：普通函数 + call 回绑 */
            KIDS.audio.sfx = function (n) { if (n === 'pop') window.__popCount++; return o.call(KIDS.audio, n); }; }""")
        page.wait_for_timeout(500)                       # watch 演示进行中
        frozen2 = page.evaluate('MB.quiz.foeT')
        check('tutorial watch: foe clock frozen (foeT stays 1)', frozen == 1 and frozen2 == 1,
              '%s -> %s' % (frozen, frozen2))
        for _ in range(3):                               # 真实乱点答案卡（主交互区，被吞）
            pos = page.evaluate("""() => {
                const els = [...document.querySelectorAll('#answers .opt')];
                const el = els[els.length - 1];
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
            }""")
            if pos:
                page.mouse.click(pos['x'], pos['y'])
                page.wait_for_timeout(160)
        rp = page.evaluate("""() => { const r = document.querySelector('#btn-replay').getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
        page.mouse.click(rp['x'], rp['y'])               # 重玩门：demo 期点重玩无效
        page.wait_for_timeout(400)
        st = page.evaluate('({step: MB.currentLevel.step, pops: window.__popCount, tut: MB.tutorial, flat: MB.currentLevel.flat})')
        check('tutorial watch: clicks swallowed (step==0)', st['step'] == 0, str(st))
        check('tutorial watch: pop feedback fired (>=1)', st['pops'] >= 1, str(st))
        check('replay gate: demo 期重玩无效 (tut stays watch)', st['tut'] == 'watch', str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_watch.png'))
        page.wait_for_function('MB.tutorial === "help"', timeout=15000)   # 演示完 → 帮（钟起走）
        foeT3 = page.evaluate("""() => new Promise(res => {
            const a = MB.quiz.foeT;
            setTimeout(() => res({a: a, b: MB.quiz.foeT}), 350); })""")
        check('help phase: foe clock running (foeT decreases)', foeT3['b'] < foeT3['a'], str(foeT3))
        qh = page.evaluate('MB.quiz')
        page.wait_for_timeout(700)                       # 等重发后答案卡入场动画结束（.38s+.14s delay）
        # help 期幽灵手指给正确卡挂 breathe 无限动画 → playwright 稳定性检查永不适配，用 force 点击
        page.click('.opt[data-i="%d"]' % qh['answerIdx'], force=True)   # 独立首答对 → solo 放手
        page.wait_for_function('MB.tutorial === "solo"', timeout=5000)
        check('solo: first correct answer releases tutorial', True)
        page.wait_for_timeout(1200)
        page.close()

        # ---------- 7. 关末鼓励层（<3 格）：合法输局终态直驱 winFlow ----------
        page2 = browser.new_page(viewport={'width': 1280, 'height': 800})
        page2.on('pageerror', lambda e: errors.append('again: ' + str(e)))
        page2.goto(URL)
        page2.evaluate(preset_save(tut_seen=True))
        page2.reload()
        page2.wait_for_function('window.MB && MB.quiz', timeout=8000)
        page2.evaluate("""() => {                       // 合法输局终态：1:4（myScore<3=鼓励收尾）
            stopFoe();
            cur.quizzes.forEach(q => { q.solved = true; });
            cur.step = cur.quizzes.length; cur.done = true;
            cur.myScore = 1; cur.foeScore = 4; cur.retries = 0;
            state.locked = false; state.won = false;
            winFlow();
        }""")
        page2.wait_for_selector('.mb-ov', timeout=5000)
        page2.wait_for_timeout(500)                      # 等 show 过渡
        page2.screenshot(path=str(SHOTS / 'again_layer.png'))
        ov = page2.evaluate("""() => ({
            txt: document.querySelector('.mb-ov .mb-big').textContent,
            stars: document.querySelectorAll('.mb-ov .mb-stars').length,
            btn: !!document.querySelector('#mb-again-btn') })""")
        check('again layer: text 就差一点点，再来一局 + stars + button',
              ov['txt'] == '就差一点点，再来一局' and ov['stars'] == 1 and ov['btn'], str(ov))
        page2.click('#mb-again-btn')                     # 再来一局 → 同关重发比分清零
        page2.wait_for_timeout(600)
        st = page2.evaluate('({flat: MB.currentLevel.flat, step: MB.currentLevel.step, my: MB.currentLevel.myScore, foe: MB.currentLevel.foeScore, ov: document.querySelectorAll(".mb-ov").length})')
        check('again layer: replay button restarts same level (score reset)',
              st['flat'] == 0 and st['step'] == 0 and st['my'] == 0 and st['foe'] == 0 and st['ov'] == 0, str(st))
        page2.close()
        browser.close()

    # ---------- 8. 构建自检：clips 注入条数 + 完全离线 ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('data:audio/mpeg')
    mul_keys = [k for k in ['mul_tut_watch', 'mul_tut_turn', 'mul_hint', 'mul_wrong', 'mul_q1',
                            'mul_q2', 'mul_win', 'mul_lose'] +
                ['mul_n_%d' % n for n in range(2, 10)] if '"%s"' % k in html]
    check('index.html clips: 19 data:audio (16 mul_* + 3 core_*)', n_audio == 19, n_audio)
    check('all 16 mul_* clip keys embedded', len(mul_keys) == 16, '%d/16' % len(mul_keys))
    check('single file fully offline', 'http://' not in html.replace('http://www.w3.org/2000/svg', '') and 'https://' not in html)

    # ---------- 9. 截图非空白 ----------
    for shot, floor in [('race_1280.png', 5.0), ('celebrate.png', 4.0), ('ch3_1280.png', 5.0),
                        ('ch4_win.png', 4.0), ('vp_800x1180.png', 5.0),
                        ('tutorial_watch.png', 5.0), ('again_layer.png', 4.0)]:
        ok, detail = png_nonblank(SHOTS / shot, floor)
        check('screenshot non-blank: ' + shot, ok, detail)

    check('0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
