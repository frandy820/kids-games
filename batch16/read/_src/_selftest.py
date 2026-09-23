# -*- coding: utf-8 -*-
"""read _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 0 pageerror
2. 预置存档(跳过教学) → flat0 真实 pointer：首题先错一次（选项卡晃动不灰化可重点+关键句高亮）
   → 全对 5 题通关 → .k-celebrate → 5.4s 读档 stars==2
3. M2：正确反馈演出窗内再点选项卡 → pop 轻叮 + miss 零增量（§0.22）
4. 听读真实点击：rd_listen 播出+当前句 reading 高亮+正文句走 rd_s_ clip（T46，零 TTS）
5. flat10（ch3 推断）真实点击通关（预置 done 0-9）→ celebrate → 写档 3-0 stars==3
6. 救援钟：错点（不重置）→ 10s 无救援 → 15.2s 救援触发（rescues>=1 + 正确选项卡 breathe）
7. 双 viewport(1280x800/800x1180)：overflowX==0、选项卡 ≥96、按钮 ≥64（家长钮豁免）
8. 全新存档 → 教学 watch 期真实乱点被吞（step 不变 + pop 计数>0 §0.22）+ 重玩门（demo 期无效）
   → watch 演示完成 __rdDemoR==='right' → tut='help' → 真实点对首题 → tut='solo'（看-帮-独链走完）
9. 构建自检：index.html 含 rd_ 38 条 + rd_s_ 174 条 + core 3 条 clips（data:audio/mpeg 共 215）+ 完全离线 + 无字面 </script>
10. 全程 0 pageerror + 截图像素非空白（PIL stdev>5）
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

# 声音纪律（2026-09-19 主线强制）：全部页面先挂底层静音（speechSynthesis no-op 计数 +
# Audio.prototype.play no-op+异步 ended——queue 播报链语义保留，对 KIDS.voice 层断言透明）
SND_MUTE = """(() => {
  if (window.__sndMuted) return; window.__sndMuted = 1;
  try { if (window.speechSynthesis) { speechSynthesis.speak = function () {};
    speechSynthesis.cancel = function () {}; } } catch (e) {}
  try {
    const proto = window.Audio.prototype;
    proto.play = function () {
      const self = this;
      setTimeout(() => { try { self.dispatchEvent(new Event('ended')); } catch (e) {} }, 5);
      return Promise.resolve();
    };
    proto.pause = function () {};
  } catch (e) {}
})();"""


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=()):
    save = {
        'v': '1.0', 'game': 'read', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'read': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_read", ' + json.dumps(json.dumps(save)) + ')'


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


def card_center(page, i):
    return page.evaluate("""(i) => {
        const el = document.querySelector('#cards .card[data-i="' + i + '"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {x: r.left + r.width / 2, y: r.top + r.height / 2};
    }""", i)


def tap_card(page, i):
    pos = card_center(page, i)
    if pos is None:
        return False
    page.mouse.click(pos['x'], pos['y'])
    return True


def play_level(page, first_wrong=False):
    """真实点击打完当前关：每题点正确选项卡（首题可选先错一次）；
    每次点对后等 step 真实推进（2100ms 反馈演出窗），防止演出窗内空点计次"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = page.evaluate('RD.quiz')
        if q is None:
            break
        if not wrong_done:
            wi = [i for i in range(3) if i != q['answer']][0]
            tap_card(page, wi)
            page.wait_for_timeout(800)
            st = page.evaluate("""() => ({
                wig: !!document.querySelector('.card.wig'),
                kf: !!document.querySelector('.psent.flash'),
                pe: getComputedStyle(document.querySelector('#cards .card')).pointerEvents !== 'none',
                step: RD.currentLevel.step, miss: RD.quiz.miss })""")
            check('wrong tap: card wig + keyline flash / clickable (not grayed) / step unchanged',
                  st['wig'] and st['kf'] and st['pe'] and st['step'] == 0 and st['miss'] == 1, str(st))
            wrong_done = True
            page.wait_for_timeout(600)   # 错点防重入窗 1000ms（b16 P2-1）：800+600 确保出窗再点对，防边缘竞速吞点对
            continue
        step_before = page.evaluate('RD.currentLevel.step')
        tap_card(page, q['answer'])
        # 等 UI 真就绪：step 同步推进 ≠ DOM 换题（2100ms 反馈演出窗内 locked，窗内点击被吞 §0.22）
        target = step_before + 1
        ok_adv = False
        t_wait = time.time() + 12
        while time.time() < t_wait:
            st = page.evaluate('({step: RD.currentLevel ? RD.currentLevel.step : -1, locked: RD.currentLevel ? !!RD.currentLevel.locked : true, done: RD.currentLevel ? !!RD.currentLevel.done : false})')
            if st['done'] or (st['step'] >= target and not st['locked']):
                ok_adv = True
                break
            page.wait_for_timeout(150)
        if not ok_adv:
            dbg = page.evaluate('({step: RD.currentLevel ? RD.currentLevel.step : null, quiz: RD.quiz ? RD.quiz.step : null, won: RD.currentLevel ? RD.currentLevel.won : null})')
            check('quiz %d advanced after correct tap' % answered, False, str(dbg))
            return answered
        page.wait_for_timeout(250)
        answered += 1
    return answered


def tap_targets(page):
    """触摸目标审计：选项卡 ≥96、全按钮 ≥64（家长钮豁免）"""
    cards = page.evaluate("""() => [...document.querySelectorAll('#cards .card')].map(
        e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })""")
    cardOk = (len(cards) == 3) and all(w >= 96 and h >= 96 for w, h in cards)
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
    return cardOk, btnOk, ox


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
        page.add_init_script(SND_MUTE)
        page.on('pageerror', lambda e: errors.append('verify: ' + str(e)))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.startsWith('VERIFY')", timeout=60000)
        r = json.loads(page.eval_on_selector('#verify-result', 'el => el.textContent'))
        check('verify=1 title PASS', page.title().startswith('VERIFY PASS'), page.title())
        check('verify pass==total', r['pass'] == r['total'],
              '%s/%s layoutOk=%s' % (r['pass'], r['total'], r['layoutOk']))
        u = r.get('units', {})
        check('verify §0.31 uniqAll (all 40 levels)', all(v.get('uniqAll', False) for v in r['levels'].values())
              and all(v.get('uniqAll', False) for v in r.get('gen', {}).values()), 'uniq gate')
        check('verify tutorial demoR', u.get('tutorial', {}).get('demoR') == 'right', str(u.get('tutorial', {}).get('demoR')))
        page.close()

        # ---------- 2. 真实点击通关 flat0（预置存档跳教学；首错一次 → 1 错=2 星） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.add_init_script(SND_MUTE)
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.RD && RD.quiz', timeout=8000)
        q0 = page.evaluate('RD.quiz')
        check('flat0 loaded (read)', q0['step'] == 0 and q0['miss'] == 0 and len(q0['options']) == 3,
              str(q0)[:140])
        page.screenshot(path=str(SHOTS / 'read_1280.png'))
        answered = play_level(page, first_wrong=True)
        check('played 5 quizzes by real clicks', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('celebrate overlay shown', True)
        page.wait_for_timeout(5400)                      # celebrate 2.3s+收尾→写档，等足 5.4s 再读
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_read'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('save after win: 1-0 stars==2 (1 wrong tap)', bool(saved) and saved['stars'] == 2, str(saved))

        # ---------- 3. M2：正确反馈演出窗内再点选项卡 → pop 轻叮+零 miss 增量（§0.22） ----------
        page.evaluate(preset_save(tut_seen=True))        # 重置到 flat0（1-0 已写→preset 覆盖）
        page.reload()
        page.wait_for_function('window.RD && RD.quiz', timeout=8000)
        wrap_pop_count(page)
        qa = page.evaluate('RD.quiz')
        tap_card(page, qa['answer'])                     # 正确 → 2100ms 演出窗（locked）
        page.wait_for_timeout(200)
        tap_card(page, [i for i in range(3) if i != qa['answer']][0])   # 窗内再点：吞输入+pop+nudge
        page.wait_for_timeout(1200)
        st = page.evaluate("""() => ({pops: window.__popCount,
            misses: RD.currentLevel.misses, step: RD.currentLevel.step,
            nudge: !!document.querySelector('#cards .card.nudge') })""")
        check('M2: option card swallowed in window → pop + no extra miss + advances',
              st['pops'] >= 1 and st['misses'] == 0 and st['step'] == 1, str(st))

        # ---------- 4. 听读真实点击：rd_listen + 当前句 reading 高亮 + rd_s_ clip 通道 ----------
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.RD && RD.quiz', timeout=8000)
        page.evaluate("""() => { window.__sayLog = []; window.__playLog = [];
            const o = KIDS.voice.say, p = KIDS.voice.play;
            KIDS.voice.say = function (t) { window.__sayLog.push(String(t)); return o.call(KIDS.voice, t); };
            KIDS.voice.play = function (k, t) { window.__playLog.push(String(k)); return p.call(KIDS.voice, k, t); }; }""")
        pos = page.evaluate("""() => { const r = document.querySelector('#btn-hear').getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
        page.mouse.click(pos['x'], pos['y'])
        page.wait_for_timeout(1500)                      # rd_listen≈0.8s+首句开读
        st = page.evaluate("""() => ({
            reading: !!document.querySelector('.psent.reading'),
            says: window.__sayLog.length,
            listenPlayed: window.__playLog.indexOf('rd_listen') >= 0,
            sentClipPlayed: window.__playLog.some(k => k.indexOf('rd_s_') === 0) })""")
        check('hear button: sentence highlighted + rd_s_ clip channel (T46, zero TTS)',
              st['reading'] and st['says'] == 0 and st['listenPlayed'] and st['sentClipPlayed'], str(st))
        page.screenshot(path=str(SHOTS / 'hear_reading.png'))

        # ---------- 5. flat10（ch3 推断）真实点击通关（预置 done 0-9） ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(10)))
        page.reload()
        page.wait_for_function('window.RD && RD.quiz', timeout=8000)
        q10 = page.evaluate('RD.quiz')
        check('flat10 loaded (ch3 inference)', q10['optKeys'] == [None, None, None] and
              q10['askKey'] in ('rd_q3a', 'rd_q3b', 'rd_q3c'), str(q10)[:140])
        page.screenshot(path=str(SHOTS / 'flat10_1280.png'))
        answered = play_level(page)
        check('flat10: played 5 quizzes by real clicks', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.wait_for_timeout(5400)
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_read'));
            return s && s.levels && s.levels['3-0'] ? s.levels['3-0'] : null; }""")
        check('flat10 save: 3-0 stars==3', bool(saved) and saved['stars'] == 3, str(saved))

        # ---------- 6. 救援钟：错点（不重置）→ 14s 后救援（正确选项卡 breathe） ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(10)))
        page.reload()
        page.wait_for_function('window.RD && RD.quiz', timeout=8000)
        qs = page.evaluate('RD.quiz')
        tap_card(page, [i for i in range(3) if i != qs['answer']][0])   # 错点=不重置救援钟
        page.wait_for_timeout(500)
        t0 = time.time()
        page.wait_for_timeout(10000)
        st = page.evaluate('({rescues: RD.rescues})')
        check('no rescue before 14s after wrong tap (did not reset)', st['rescues'] == 0, str(st))
        page.wait_for_timeout(5200)                      # 总静置 ≈15.7s
        st = page.evaluate("""() => ({rescues: RD.rescues,
            breathe: !!document.querySelector('#cards .card.breathe') })""")
        check('rescue fired after 14s idle (correct card breathes)',
              st['rescues'] >= 1 and st['breathe'], str(st))
        check('rescue timing sane (wrong tap did not reset clock)', st['rescues'] >= 1,
              'elapsed=%.1fs' % (time.time() - t0))

        # ---------- 7. 双 viewport 触摸目标与 overflowX ----------
        for vp in [(1280, 800), (800, 1180)]:
            page.set_viewport_size({'width': vp[0], 'height': vp[1]})
            page.wait_for_timeout(800)                    # 等入场动画结束再量（transform 中途陷阱）
            c1, b1, ox1 = tap_targets(page)
            check('viewport %dx%d: cards>=96 & buttons>=64 & overflowX==0' % vp,
                  c1 and b1 and ox1 == 0, 'card=%s btn=%s ox=%s' % (c1, b1, ox1))
            page.screenshot(path=str(SHOTS / ('vp_%dx%d.png' % vp)))
        page.close()

        # ---------- 8. 教学看-帮-独链（全新存档）：watch 乱点被吞+重玩门 → demoR → help → solo ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.add_init_script(SND_MUTE)
        page.on('pageerror', lambda e: errors.append('tut: ' + str(e)))
        page.goto(URL)
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_function('window.RD && RD.tutorial === "watch"', timeout=8000)
        wrap_pop_count(page)
        page.wait_for_timeout(600)                       # watch 演示进行中
        for _ in range(3):                               # 真实乱点选项卡（主交互区）
            qd = page.evaluate('RD.quiz')
            if qd:
                tap_card(page, [i for i in range(3) if i != qd['answer']][0])
                page.wait_for_timeout(160)
        # 重玩门：demo 期点"再玩一次"无效（flat 不变、教学不中断）
        rp = page.evaluate("""() => { const r = document.querySelector('#btn-replay').getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
        flatBefore = page.evaluate('RD.currentLevel.flat')
        page.mouse.click(rp['x'], rp['y'])
        page.wait_for_timeout(400)
        st = page.evaluate('({step: RD.currentLevel.step, pops: window.__popCount, tut: RD.tutorial, flat: RD.currentLevel.flat})')
        check('tutorial watch: option clicks swallowed (step==0)', st['step'] == 0, str(st))
        check('tutorial watch: pop feedback fired (>=1)', st['pops'] >= 1, str(st))
        check('replay gate: demo 期重玩无效 (flat unchanged)',
              st['flat'] == flatBefore and st['tut'] == 'watch', str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_watch.png'))
        page.wait_for_function('RD.tutorial === "help"', timeout=30000)   # 演示完成→重发同关→帮
        st = page.evaluate("""() => ({demoR: window.__rdDemoR, flat: RD.currentLevel.flat,
            step: RD.quiz ? RD.quiz.step : null, miss: RD.quiz ? RD.quiz.miss : null })""")
        check('tutorial handoff: __rdDemoR=="right" + re-issued flat0 + fresh quiz',
              st['demoR'] == 'right' and st['flat'] == 0 and st['step'] == 0 and st['miss'] == 0, str(st))
        qh = page.evaluate('RD.quiz')                    # "独"：孩子真实点对首题 → 放手
        tap_card(page, qh['answer'])
        page.wait_for_timeout(1200)
        st = page.evaluate('({tut: RD.tutorial, step: RD.currentLevel.step})')
        check('tutorial solo: first correct tap releases hand (tut=solo, step advanced)',
              st['tut'] == 'solo' and st['step'] == 1, str(st))
        page.close()
        browser.close()

    # ---------- 9. 构建自检：clips 注入条数 + 完全离线 + 无字面 </script> ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('data:audio/mpeg')
    check('index.html clips: 215 data:audio (38 rd_* + 174 rd_s_* + 3 core_*)', n_audio == 215, n_audio)
    stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
    check('single file fully offline',
          'http://' not in stripped and 'https://' not in stripped and ' src=' not in stripped and ' href=' not in stripped)
    check('no literal </script> inside JS payloads', html.count('</script>') == 3, html.count('</script>'))

    # ---------- 10. 截图非空白 ----------
    for shot, floor in [('read_1280.png', 5.0), ('flat10_1280.png', 5.0), ('celebrate.png', 4.0),
                        ('hear_reading.png', 5.0), ('vp_1280x800.png', 5.0), ('vp_800x1180.png', 5.0),
                        ('tutorial_watch.png', 5.0)]:
        ok, detail = png_nonblank(SHOTS / shot, floor)
        check('screenshot non-blank: ' + shot, ok, detail)

    check('0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
