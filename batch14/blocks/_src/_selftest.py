# -*- coding: utf-8 -*-
"""blocks _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 0 pageerror
2. 预置存档(跳过教学) → flat0 count 真实 pointer 逐题点答案卡 → 首题先错一次（卡晃动不灰化
   可重点）→ 5 题通关 → .k-celebrate → 5.4s 读档 stars==2（1 错=2★）
3. flat10（ch3 front）真实点图卡通关（预置 done 0-9）→ celebrate → 读档
4. 双 viewport(1280x800/800x1180)：overflowX==0、答案卡(数字/图卡) ≥96、按钮 ≥64（家长钮豁免）、
   场景 svg 非零
5. 全新存档 → 教学 watch 期真实乱点被吞（step 不变 + pop 轻叮计数>0，§0.22）+ 重玩门（demo 期
   点重玩无效）+ 演示答对 __bkDemoR==='right'（§0.27）+ 交接到 help
6. 救援钟：错点不重置 → 10s 无救援 → 15s 救援触发（rescues>=1 + 正确卡 breathe）
7. 构建自检：index.html 含 blo 全部 20 条 + core 3 条 clips（data:audio/mpeg 共 23）+ 无外链
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
    save = {
        'v': '1.0', 'game': 'blocks', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'blocks': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_blocks", ' + json.dumps(json.dumps(save)) + ')'


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
    return page.evaluate("""() => { const q = BK.quiz; let i = 0; while (i === q.answerIdx) i++; return i; }""")


def play_level(page, first_wrong=False):
    """真实点击打完当前关（四题型通用：每题点正确答案卡，可选首题先错一次）"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = page.evaluate('BK.quiz')
        if q is None:
            break
        if not wrong_done:                              # 首错：点错卡 → 晃动不灰化可重点
            page.click('.opt[data-i="%d"]' % wrong_idx(page))
            page.wait_for_timeout(700)
            st = page.evaluate("""() => {
                const q = BK.quiz;
                const els = [...document.querySelectorAll('#answers .opt')];
                const w = els.find(e => e.classList.contains('wrong'));
                return { wig: !!w, pe: w ? getComputedStyle(w).pointerEvents !== 'none' : false,
                    step: BK.currentLevel.step, retries: BK.currentLevel.retries, miss: q ? q.miss : null };
            }""")
            check('wrong pick: card wiggles / not grayed / step unchanged',
                  st['wig'] and st['pe'] and st['step'] == 0 and st['retries'] == 1, str(st))
            wrong_done = True
            continue
        page.click('.opt[data-i="%d"]' % q['answerIdx'])
        page.wait_for_timeout(1100)
        answered += 1
    return answered


def tap_targets(page):
    """触摸目标审计：答案卡(数字/图卡) ≥96、按钮 ≥64（家长钮豁免）、场景 svg 非零"""
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
    scene = page.evaluate("""() => { const s = document.querySelector('#scene svg.scene');
        if (!s) return null; const r = s.getBoundingClientRect(); return [r.width, r.height]; }""")
    sceneOk = scene is not None and scene[0] >= 100 and scene[1] >= 80
    ox = page.evaluate('Math.max(document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth)')
    return optOk, btnOk, sceneOk, ox


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
        check('verify demoR === right (§0.27)', r['units']['tutorial']['demoR'] == 'right',
              str(r['units']['tutorial']))
        page.close()

        # ---------- 2. 真实点击通关 flat0 count（预置存档跳教学；首题先错一次=2 星） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.BK && BK.quiz', timeout=8000)
        q0 = page.evaluate('BK.quiz')
        check('flat0 loaded (count)', q0['kind'] == 'count' and q0['cols'] and q0['R'] == 3 and q0['C'] == 2, str(q0)[:120])
        scene_ok = page.evaluate("""() => {
            const cuN = document.querySelectorAll('#scene .cu').length;
            let tot = 0; BK.quiz.cols.forEach(r => r.forEach(v => tot += v));
            return { cuN: cuN, tot: tot, gndN: document.querySelectorAll('#scene .ground path').length };
        }""")
        check('scene svg: cubes==total blocks, ground==R*C',
              scene_ok['cuN'] == scene_ok['tot'] and scene_ok['gndN'] == 6, str(scene_ok))
        page.screenshot(path=str(SHOTS / 'count_1280.png'))
        answered = play_level(page, first_wrong=True)
        check('played 5 quizzes by real clicks', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('celebrate overlay shown', True)
        page.wait_for_timeout(5400)                      # celebrate 2.3s+收尾→写档，等足 5.4s 再读
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_blocks'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('save after win: 1-0 stars==2 (1 wrong = 2 stars)',
              bool(saved) and saved['stars'] == 2, str(saved))

        # ---------- 3. flat10（ch3 front）真实点图卡通关（预置 done 0-9） ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(10)))
        page.reload()
        page.wait_for_function('window.BK && BK.quiz', timeout=8000)
        q10 = page.evaluate('BK.quiz')
        check('flat10 first quiz = count warmup', q10['kind'] == 'count', str(q10)[:100])
        page.click('.opt[data-i="%d"]' % q10['answerIdx'])
        page.wait_for_timeout(1100)
        q10b = page.evaluate('BK.quiz')
        cards = page.evaluate("""() => ({
            n: document.querySelectorAll('#answers .opt.card').length,
            rects: document.querySelectorAll('#answers .opt.card svg rect').length })""")
        check('flat10 second quiz = front view cards (svg, not text)',
              q10b['kind'] == 'front' and cards['n'] == 3 and cards['rects'] > 0,
              'kind=%s cards=%s' % (q10b['kind'] if q10b else None, cards))
        page.screenshot(path=str(SHOTS / 'front_1280.png'))
        answered = play_level(page)
        check('flat10: played remaining quizzes by real clicks', answered == 4, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.wait_for_timeout(5400)
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_blocks'));
            return s && s.levels && s.levels['3-0'] ? s.levels['3-0'] : null; }""")
        check('flat10 save: 3-0 stars>=1', bool(saved) and saved['stars'] >= 1, str(saved))

        # ---------- 3b. 救援钟：错点不重置，14s 救援触发 ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(10)))
        page.reload()
        page.wait_for_function('window.BK && BK.quiz', timeout=8000)
        page.click('.opt[data-i="%d"]' % wrong_idx(page))   # 错点（不重置救援钟 §0.7a）
        t0 = time.time()
        page.wait_for_timeout(10000)
        st = page.evaluate('({rescues: BK.rescues, miss: BK.quiz ? BK.quiz.miss : null})')
        check('no rescue before 14s after wrong pick (miss=%s)' % st['miss'], st['rescues'] == 0, str(st))
        page.wait_for_timeout(5200)                       # 总静置 ≈15.2s
        st = page.evaluate("""() => ({rescues: BK.rescues,
            breathe: !!document.querySelector('#answers .opt.breathe')})""")
        check('rescue fired after 14s idle (rescues>=1, correct card breathes)',
              st['rescues'] >= 1 and st['breathe'], str(st))
        check('rescue timing sane (wrong pick did not reset clock)', st['rescues'] >= 1,
              'elapsed=%.1fs' % (time.time() - t0))

        # ---------- 4. 双 viewport 触摸目标与 overflowX（count 期 + front 期） ----------
        for vp in [(1280, 800), (800, 1180)]:
            page.set_viewport_size({'width': vp[0], 'height': vp[1]})
            page.wait_for_timeout(800)                    # 等入场动画结束再量（transform 中途陷阱）
            o1, b1, s1, ox1 = tap_targets(page)           # front 期（图卡）
            check('viewport %dx%d: opt>=96 & buttons>=64 & scene>0 & overflowX==0 (front)' % vp,
                  o1 and b1 and s1 and ox1 == 0, 'opt=%s btn=%s scene=%s ox=%s' % (o1, b1, s1, ox1))
            page.screenshot(path=str(SHOTS / ('vp_%dx%d_front.png' % vp)))
        # count 期另一页量数字卡
        page2 = browser.new_page(viewport={'width': 800, 'height': 1180})
        page2.on('pageerror', lambda e: errors.append('vp: ' + str(e)))
        page2.goto(URL)
        page2.evaluate(preset_save(tut_seen=True))
        page2.reload()
        page2.wait_for_function('window.BK && BK.quiz', timeout=8000)
        page2.wait_for_timeout(800)
        o2, b2, s2, ox2 = tap_targets(page2)
        check('viewport 800x1180: opt>=96 & buttons>=64 & scene>0 & overflowX==0 (count)',
              o2 and b2 and s2 and ox2 == 0, 'opt=%s btn=%s scene=%s ox=%s' % (o2, b2, s2, ox2))
        page2.screenshot(path=str(SHOTS / 'vp_800x1180_count.png'))
        page2.close()

        # ---------- 5. 教学期乱点被吞 + 重玩门 + demoR（全新存档 → watch demo 期） ----------
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_function('window.BK && BK.tutorial === "watch"', timeout=8000)
        page.evaluate("""() => { window.__popCount = 0;
            const o = KIDS.audio.sfx;
            /* 必须保 this（sfx 内部读 this.ctx）：普通函数 + call 回绑 */
            KIDS.audio.sfx = function (n) { if (n === 'pop') window.__popCount++; return o.call(KIDS.audio, n); }; }""")
        page.wait_for_timeout(600)                       # watch 演示进行中（逐柱点数）
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
                page.wait_for_timeout(160)
        # 重玩门：demo 期点"再玩一次"无效（flat 不变、教学不中断）
        rp = page.evaluate("""() => { const r = document.querySelector('#btn-replay').getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
        flatBefore = page.evaluate('BK.currentLevel.flat')
        page.mouse.click(rp['x'], rp['y'])
        page.wait_for_timeout(400)
        st = page.evaluate('({step: BK.currentLevel.step, pops: window.__popCount, tut: BK.tutorial, flat: BK.currentLevel.flat})')
        check('tutorial watch: clicks swallowed (step==0)', st['step'] == 0, str(st))
        check('tutorial watch: pop feedback fired (>=1)', st['pops'] >= 1, str(st))
        check('replay gate: demo 期重玩无效 (flat unchanged)',
              st['flat'] == flatBefore and st['tut'] == 'watch', str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_watch.png'))
        # 演示答对实证（§0.27）+ 交接 help
        page.wait_for_function('BK.tutorial === "help"', timeout=20000)
        st = page.evaluate('({demoR: window.__bkDemoR, tut: BK.tutorial, step: BK.currentLevel.step})')
        check('tutorial demo answered right (__bkDemoR==="right", §0.27)',
              st['demoR'] == 'right' and st['tut'] == 'help' and st['step'] == 0, str(st))
        page.close()
        browser.close()

    # ---------- 6. 构建自检：clips 注入条数 + 离线 ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('data:audio/mpeg')
    blo_keys = [k for k in ['blo_tut_watch', 'blo_tut_turn', 'blo_hint', 'blo_wrong',
                            'blo_q_count', 'blo_q_fill', 'blo_q_front', 'blo_q_top'] +
                ['blo_n_%d' % n for n in range(1, 13)] if '"%s"' % k in html]
    core_keys = [k for k in ['core_chapter_end', 'core_day_end', 'core_rest'] if '"%s"' % k in html]
    check('index.html clips: 23 data:audio (20 blo_* + 3 core_*)', n_audio == 23, n_audio)
    check('all 20 blo_* clip keys embedded', len(blo_keys) == 20, '%d/20' % len(blo_keys))
    check('all 3 core_* clip keys embedded', len(core_keys) == 3, '%d/3' % len(core_keys))
    check('single file fully offline', 'http://' not in html.replace('http://www.w3.org/2000/svg', '') and 'https://' not in html)

    # ---------- 7. 截图非空白 ----------
    for shot, floor in [('count_1280.png', 5.0), ('front_1280.png', 5.0),
                        ('celebrate.png', 4.0), ('vp_800x1180_count.png', 5.0),
                        ('tutorial_watch.png', 5.0)]:
        ok, detail = png_nonblank(SHOTS / shot, floor)
        check('screenshot non-blank: ' + shot, ok, detail)

    check('0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
