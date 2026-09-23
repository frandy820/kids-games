# -*- coding: utf-8 -*-
"""idiom _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r16 难度改造（2026-09-16）：情境句填成语（6 fill+2 near/关）+库 80 五章+CH_LEN 8+STATIC 40+旧档迁移 IIFE。
1. ?verify=1 → title=VERIFY PASS（startswith 口径）+ JSON pass==total + units.layout.ok + 0 pageerror
2. 预置存档(跳过教学) → flat0 真实 pointer：首题错点（卡晃可重点不灰化）→ 错第二次（白话小注 §0.33
   +正确卡 breathe）→ 听句子 hear → 点对（空位填入成语四字+确认链）→ 8 题通关（fill/near 双型）
   → .k-celebrate → 读档 stars==2（2 错）
3. flat8（ch2 数字章）真实点击通关 3 星 → 写档 2-0
4. 救援钟（§0.7a 判别式）：静置 14s 触发第一次救援 → 4s 后戳兔子（探索点击不重置钟）
   → 静置 11.5s → 第二次救援触发 rescues>=2（若重置则停 1，FAIL 判别）
5. 双 viewport(1280x800/800x1180)：候选卡横>=96/竖>=84、全按钮 >=64、ox==0、截图非空白
6. 全新存档 → 教学 watch 期真实乱点被吞（step 不变+pop 计数）→ watch 演示完成 __idmDemoR=='right'
   → tut='help'（重发同关）→ 真实点对首题 → tut='solo'（看-帮-独链走完）→ tutSeen 持久化
P1b 真竖视口轮（800×1180 独立 context=真实 @media 通道——与 verify body.port 模拟通道互补）：
   喇叭 64±2（横 72 → 竖规则真生效判别锚）+候选卡 >=84+ox==0+截图非空白 ×flat0/8/16/24/32/39
8. 生成关真页触达（种档 firstDay=昨天+bonus[today]=30 → lim>STATIC=40）→ flat40 通关写档 6-0
9. 旧档迁移 IIFE：矛盾态（有 '2-0' 缺 '1-5'）→ 整档重置（教学重现）；正常第 1 章档 → 不误删
10. 构建自检：index.html 含 data:audio/mpeg 恰 250 条（T46：+ctx/def 各 80）+ 完全离线（无 http(s)/src/href）
11. 全程 0 pageerror + 截图像素非空白（PIL stdev>5）
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
YDAY = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex>=3 → 日限 12
RESULTS = []

# ---------- 声音纪律（主线强制 2026-09-16：chrome-headless-shell 不认 --mute-audio，音频直走
# 系统输出——三层保险，所有 goto/reload 全覆盖）：
# ① INIT_SND（context.add_init_script，先于页面 JS）：接管底层 new Audio/speechSynthesis/
#    AudioContext——goto/reload 返回前 init+开题链已跑，仅靠事后 stub 拦不住这段窗口
# ② STUB_SND（goto/reload 后立即 evaluate）：KIDS.voice.play/queue/say+KIDS.audio.sfx/note
#    置空（零声，原实现不调）
# ③ preset_save settings sound/tts=false（core 级开关）。
# verify 页（?verify=1）game-verify.js 已自 stub——只走 ①③ 不覆盖 ②（保其 __lastQueue 断言）。
INIT_SND = """(() => {
  if (window.__sndStubbed) return; window.__sndStubbed = 1;
  try { if (window.speechSynthesis) { speechSynthesis.speak = function () {};
    speechSynthesis.cancel = function () {}; } } catch (e) {}
  try { window.Audio = function () { return { play: function () { return Promise.resolve(); },
    pause: function () {}, load: function () {}, canPlayType: function () { return ''; },
    volume: 0, muted: true, autoplay: false }; }; } catch (e) {}
  try { var AC0 = window.AudioContext || window.webkitAudioContext;
    if (AC0) { var fac = function () { return {
      resume: function () { return Promise.resolve(); },
      close: function () { return Promise.resolve(); }, state: 'running', currentTime: 0,
      destination: {},
      createOscillator: function () { return { frequency: { value: 0, setValueAtTime: function () {} },
        connect: function () {}, start: function () {}, stop: function () {} }; },
      createGain: function () { return { gain: { value: 0, setValueAtTime: function () {},
        linearRampToValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} },
        connect: function () {} }; } }; };
      window.AudioContext = fac; window.webkitAudioContext = fac; } } catch (e) {}
})();"""

STUB_SND = """(() => {
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  KIDS.voice.say = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.audio.note = function () {};
  return true;
})()"""


def stub(page):
    page.evaluate(STUB_SND)


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), first_day=None, bonus_today=0):
    save = {
        'v': '1.0', 'game': 'idiom', 'firstDay': first_day or OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': False, 'tts': False, 'vol': 0},   # 声音纪律③：core 级开关
        'restTip': {'day': '', 'shown': 0},
        'idiom': {'tutSeen': tut_seen},
    }
    for f in done_flats:                                   # r16 键基：CH_LEN=8（c=f//8+1, l=f%8）
        save['levels']['%d-%d' % (f // 8 + 1, f % 8)] = {'stars': 3, 'plays': 1}
    if bonus_today:
        save['bonus'][TODAY] = bonus_today
    return 'localStorage.setItem("kidsgame_idiom", ' + json.dumps(json.dumps(save)) + ')'


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


def tap_card(page, i):
    pos = page.evaluate("""(i) => { const e = document.querySelector('.card[data-i="' + i + '"]');
        if (!e) return null; const b = e.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height * 0.6 }; }""", i)
    if pos is None:
        return False
    page.mouse.click(pos['x'], pos['y'])
    page.wait_for_timeout(150)
    return True


def wait_ready(page, timeout=16000):
    """等演出/错点/教学窗结束（locked·demo 解除或 won）——确认链窗 1600+confirmTailMs 最坏 ~12.4s"""
    page.wait_for_function(
        'IDM.currentLevel ? ((!IDM.currentLevel.locked && !IDM.currentLevel.demo) ||'
        ' IDM.currentLevel.won) : true',
        timeout=timeout)


def play_level(page, first_wrong=False, twice_wrong=False):
    """真实 pointer 点击通关当前关 8 题：可选首题错点一次/两次（白话小注断言）再点正确候选卡。
    每次点对后等演出窗收尾（确认链 1600+confirmTailMs）再取下一题。返回 (答题数, 小注出现)。"""
    wrongs = 1 if first_wrong else (2 if twice_wrong else 0)
    done_wrong, answered, note_seen = 0, 0, False
    for _ in range(60):
        q = page.evaluate('IDM.quiz')
        if q is None:
            break
        if done_wrong < wrongs:
            wi = next(i for i in range(len(q['optionIdxs'])) if i != q['answer'])
            m0 = q['miss']
            for _ in range(40):                        # 错链豁免窗（6480 真时钟）吞窗内错卡
                tap_card(page, wi)                     # →轮询重试至 miss 递增（窗过期照计）
                page.wait_for_timeout(500)
                if page.evaluate('IDM.quiz && IDM.quiz.step') == q['step'] and \
                        page.evaluate('IDM.quiz.miss') == m0 + 1:
                    break
            page.wait_for_timeout(1200)                # 错点防重入窗 1000ms 过后再量 UI
            if wrongs >= 2 and done_wrong == 1:
                note_seen = page.evaluate(
                    'document.getElementById("note").classList.contains("show")')
                br = page.evaluate('IDM.quiz && IDM.quiz.hinted === true')
                check('2 misses: plain-text note + hinted (答案级)', note_seen and br)
            done_wrong += 1
            continue
        page.evaluate('IDM.hear()')                     # 模拟孩子：先听句子再点卡
        page.wait_for_timeout(200)
        tap_card(page, q['answer'])
        answered += 1
        wait_ready(page)
        page.wait_for_timeout(120)
    return answered, note_seen


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])

        # ---------- 1. verify=1（verify 页自 stub——只走 INIT_SND 底层接管） ----------
        ctx_v = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx_v.add_init_script(INIT_SND)
        page = ctx_v.new_page()
        page.on('pageerror', lambda e: errors.append('verify: ' + str(e)))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.startsWith('VERIFY')", timeout=180000)
        r = json.loads(page.eval_on_selector('#verify-result', 'el => el.textContent'))
        check('verify=1 title PASS', page.title().startswith('VERIFY PASS'), page.title())
        check('verify pass==total', r['pass'] == r['total'],
              '%s/%s units=%d' % (r['pass'], r['total'], len(r['units'])))
        check('verify units.layout ok', r['units']['layout']['ok'], r['units']['layout'].get('note'))
        page.close()

        # ---------- 2. 真实点击通关 flat0（预置存档跳教学；首题连错两次 → 2 错=2 星） ----------
        ctx_p = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx_p.add_init_script(INIT_SND)
        page = ctx_p.new_page()
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.goto(URL)
        stub(page)                                    # 声音纪律②
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        stub(page)                                    # reload 后 KIDS 重建——重新 stub
        page.wait_for_function('window.IDM && IDM.quiz', timeout=8000)
        q0 = page.evaluate('IDM.quiz')
        kinds = page.evaluate('genLevel(0).quizzes.map(q => q.kind)')
        check('flat0 loaded (r16: 8 题=6fill+2near, q0 ctx 含空位)',
              q0 and '____' in (q0['ctx'] or '') and
              kinds.count('fill') == 6 and kinds.count('near') == 2,
              'kinds=%s' % kinds)
        n_opt0 = len(q0['optionIdxs'])
        check('q0 options by kind (fill=4/near=2)', n_opt0 == (2 if q0['kind'] == 'near' else 4),
              'kind=%s nOpt=%d' % (q0['kind'], n_opt0))
        page.screenshot(path=str(SHOTS / 'idiom_1280.png'))
        answered, _ = play_level(page, twice_wrong=True)
        page.wait_for_selector('.k-celebrate', timeout=10000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('celebrate overlay shown', True)
        page.wait_for_timeout(4600)                     # celebrate 2.6s+收尾 400 → 写档完成
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_idiom'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('flat0 save: 1-0 stars==2 (2 wrongs), 8 quizzes answered',
              answered == 8 and bool(saved) and saved['stars'] == 2, 'answered=%s %s' % (answered, saved))

        # 空位填入断言（点对瞬间）：重开 flat0 由 verify ④ 已深检，此处真页点对后取一帧
        page.evaluate('IDM.start(0)')
        page.wait_for_function('window.IDM && IDM.quiz', timeout=8000)
        q = page.evaluate('IDM.quiz')
        tap_card(page, q['answer'])
        page.wait_for_timeout(300)
        filled = page.evaluate("""(q) => document.getElementById('q-text').textContent ===
            q.ctx.replace('____', q.optionIds[q.answer])""", q)
        check('blank filled with idiom text on correct tap', filled)
        wait_ready(page)

        # ---------- 3. flat8（ch2 数字成语章）真实点击通关 3 星 → 写档 2-0 ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(8), bonus_today=30))
        page.reload()
        stub(page)
        page.wait_for_function('window.IDM && IDM.quiz', timeout=8000)
        d8 = page.evaluate('IDM.currentLevel.dch')
        answered8 = play_level(page)[0]
        page.wait_for_selector('.k-celebrate', timeout=10000)
        page.wait_for_timeout(4600)
        saved8 = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_idiom'));
            return s && s.levels && s.levels['2-0'] ? s.levels['2-0'] : null; }""")
        check('flat8 (dch=2) real-tap done 3star', d8 == 2 and answered8 == 8 and
              bool(saved8) and saved8['stars'] == 3, 'dch=%s answered=%s %s' % (d8, answered8, saved8))

        # ---------- 4. 救援钟（§0.7a 判别式）：先等第一次自然触发，4s 后戳兔子（探索），
        # 再静置 11.5s：不重置 → idle>14 → 第二次触发；若重置 → 停 1（FAIL 判别） ----------
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        stub(page)
        page.wait_for_function('window.IDM && IDM.quiz', timeout=8000)
        t0 = time.time()
        rescued1 = False
        while time.time() - t0 < 30:
            if page.evaluate('IDM.rescues') >= 1:
                rescued1 = True
                break
            page.wait_for_timeout(500)
        check('rescue fired on 14s idle', rescued1, 'elapsed=%.1fs' % (time.time() - t0))
        page.wait_for_timeout(4000)
        rp = page.evaluate("""() => { const r = document.getElementById('btn-rabbit')
            .getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }""")
        page.mouse.click(rp['x'], rp['y'])              # 戳兔子=探索点击（不重置救援钟 §0.7a）
        page.wait_for_timeout(11500)
        r2 = page.evaluate('IDM.rescues')
        check('rabbit tap did NOT reset rescue clock (second rescue fired)', r2 >= 2, 'rescues=%s' % r2)
        page.close()

        # ---------- 5. 双 viewport 触摸目标与 overflowX（near 面在 6 补） ----------
        for w, h in [(1280, 800), (800, 1180)]:
            pv = browser.new_context(viewport={'width': w, 'height': h})
            pv.add_init_script(INIT_SND)
            pg = pv.new_page()
            pg.on('pageerror', lambda e: errors.append('vp: ' + str(e)))
            pg.add_init_script(preset_save(tut_seen=True))
            pg.goto(URL)
            stub(pg)
            pg.wait_for_function('window.IDM && IDM.quiz', timeout=8000)
            pg.wait_for_timeout(600)
            m = pg.evaluate("""() => {
                const ox = Math.max(document.getElementById('game').scrollWidth -
                    document.getElementById('game').clientWidth,
                    document.documentElement.scrollWidth - document.documentElement.clientWidth);
                const cards = [...document.querySelectorAll('.card')].map(
                    b => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height));
                let btnOk = true;
                document.querySelectorAll('button').forEach(b => {
                    if (b.classList.contains('k-parentbtn')) return;
                    const r = b.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
                });
                return { ox, nCards: cards.length, minCard: cards.length ? Math.min(...cards) : 0, btnOk };
            }""")
            need = 96 if w >= h else 84                 # 横 96 / 竖 84（head 竖 .card clamp 104 下限）
            shot = SHOTS / ('vp_%dx%d.png' % (w, h))
            pg.screenshot(path=str(shot))
            nb, detail = png_nonblank(shot)
            check('viewport %dx%d: cards>=%d btns>=64 ox==0' % (w, h, need),
                  m['ox'] == 0 and m['nCards'] in (2, 4) and m['minCard'] >= need and m['btnOk'],
                  'minCard=%.0f n=%s btnOk=%s ox=%s' % (m['minCard'], m['nCards'], m['btnOk'], m['ox']))
            check('screenshot %dx%d non-blank' % (w, h), nb, detail)
            pv.close()

        # ---------- 6. 教学看-帮-独链（全新存档）：watch 乱点被吞 → demoR → help → solo ----------
        ctx_t = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx_t.add_init_script(INIT_SND)
        page = ctx_t.new_page()
        page.on('pageerror', lambda e: errors.append('tut: ' + str(e)))
        page.goto(URL)
        stub(page)
        page.evaluate('localStorage.clear()')
        page.reload()
        stub(page)
        page.wait_for_function('window.IDM && IDM.tutorial === "watch"', timeout=10000)
        page.evaluate("""() => { window.__popCount = 0; const o = KIDS.audio.sfx;
            KIDS.audio.sfx = function (n) { if (n === 'pop') window.__popCount++;
            return o.call(KIDS.audio, n); }; }""")
        page.wait_for_timeout(800)                      # watch 演示进行中（3660 窗内）
        sw = page.evaluate('IDM.currentLevel.step')
        for _ in range(3):                              # 真实乱点候选卡（主交互区）
            tap_card(page, 0)
        st = page.evaluate('({step: IDM.currentLevel.step, pops: window.__popCount,'
                           ' tut: IDM.tutorial})')
        check('tutorial watch: clicks swallowed (step==0) + pop feedback',
              st['step'] == 0 and st['step'] == sw and st['pops'] >= 1, str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_watch.png'))
        page.wait_for_function('IDM.tutorial === "help"', timeout=40000)   # 演示完→重发同关→帮
        st2 = page.evaluate("""({ demoR: window.__idmDemoR, flat: IDM.currentLevel.flat,
            step: IDM.quiz ? IDM.quiz.step : null })""")
        check('tutorial handoff: __idmDemoR=="right" + re-issued flat0',
              st2['demoR'] == 'right' and st2['flat'] == 0 and st2['step'] == 0, str(st2))
        q3 = page.evaluate('IDM.quiz')
        tap_card(page, q3['answer'])                    # 独：孩子真实点对首题 → 放手
        wait_ready(page)
        t3 = page.evaluate('IDM.tutorial')
        check('tutorial solo after first right', t3 == 'solo', t3)
        sv3 = page.evaluate('JSON.parse(localStorage.getItem("kidsgame_idiom") || "{}")')
        check('tutSeen persisted', sv3.get('idiom', {}).get('tutSeen') is True)
        page.close()

        # ---------- P1b. 真竖视口轮（800×1180 独立 context=真实 @media 通道）×六章首关+末关 ----------
        ctx = browser.new_context(viewport={'width': 800, 'height': 1180})
        ctx.add_init_script(INIT_SND)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append('P1b: ' + str(e)))
        pg.goto(URL)
        stub(pg)
        pg.evaluate(preset_save(tut_seen=True, done_flats=range(40)))
        pg.reload()
        stub(pg)
        pg.wait_for_function('window.IDM && IDM.quiz', timeout=8000)
        real_port = pg.evaluate('innerHeight > innerWidth')
        check('P1b real portrait viewport (800x1180 -> @media channel active)', real_port)
        for flat in (0, 8, 16, 24, 32, 39):
            pg.evaluate('IDM.start(%d)' % flat)
            pg.wait_for_timeout(700)
            st = pg.evaluate("""() => {
                const cards = [...document.querySelectorAll('.card')].map(
                    e => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height));
                const spk = document.getElementById('q-spk').offsetWidth;
                return { minCard: cards.length ? Math.min(...cards) : 0, spkW: spk,
                    nCards: cards.length, dch: IDM.currentLevel.dch,
                    ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
            }""")
            check('P1b flat%d (dch=%s): @media spk=64±2 + cards>=84 + ox==0' % (flat, st['dch']),
                  62 <= st['spkW'] <= 66 and st['minCard'] >= 84 and st['ox'] == 0 and
                  st['nCards'] in (2, 4),
                  'spkW=%s minCard=%.0f n=%s ox=%s' % (st['spkW'], st['minCard'], st['nCards'], st['ox']))
            pg.screenshot(path=str(SHOTS / ('p1b_flat%d.png' % flat)))
        ctx.close()

        # ---------- 8. 生成关真页触达（种档 firstDay=昨天+bonus=30 → lim>40）→ flat40 通关 ----------
        ctx_g = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx_g.add_init_script(INIT_SND)
        page = ctx_g.new_page()
        page.on('pageerror', lambda e: errors.append('gen: ' + str(e)))
        page.goto(URL)
        stub(page)
        page.evaluate(preset_save(tut_seen=True, done_flats=range(40), first_day=YDAY, bonus_today=30))
        page.reload()
        stub(page)
        page.wait_for_function('window.IDM && IDM.quiz', timeout=8000)
        lim = page.evaluate('KIDS.calendar.limit(Infinity)')
        check('gen-level reachable via seeded save (lim > STATIC=40)', lim > 40, 'lim=%s' % lim)
        page.evaluate('IDM.start(40)')
        page.wait_for_function('window.IDM && IDM.quiz', timeout=8000)
        g40 = page.evaluate('({flat: IDM.currentLevel.flat, ch: IDM.currentLevel.ch, n: IDM.currentLevel.n})')
        check('flat40 loaded as generated level (ch>=6, 8 quizzes)',
              g40['flat'] == 40 and g40['ch'] >= 6 and g40['n'] == 8, str(g40))
        answered40 = play_level(page)[0]
        page.wait_for_selector('.k-celebrate', timeout=10000)
        page.wait_for_timeout(4600)
        saved40 = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_idiom'));
            return s && s.levels && s.levels['6-0'] ? s.levels['6-0'] : null; }""")
        check('flat40 save: 6-0 stars==3 (generated level writes save)',
              answered40 == 8 and bool(saved40) and saved40['stars'] == 3,
              'answered=%s %s' % (answered40, saved40))

        # ---------- 9. 旧档迁移 IIFE：矛盾态重置 / 正常档不误删 ----------
        # 9a 矛盾态（旧 5 基残留：有 '2-0' 缺 '1-5'）→ 整档重置 → 教学重现
        legacy = {'v': '1.0', 'game': 'idiom', 'firstDay': OLD, 'lastDay': TODAY,
                  'levels': {'1-0': {'stars': 3, 'plays': 2}, '2-0': {'stars': 2, 'plays': 1}},
                  'dailyMin': {}, 'bonus': {}, 'settings': {'sound': False, 'tts': False, 'vol': 0},
                  'restTip': {'day': '', 'shown': 0}, 'idiom': {'tutSeen': True}}
        page.evaluate('localStorage.setItem("kidsgame_idiom", %s)' % json.dumps(json.dumps(legacy)))
        page.reload()
        stub(page)
        page.wait_for_function('window.IDM && IDM.tutorial', timeout=8000)
        st = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_idiom') || '{}');
            return { levels: s.levels || {}, tut: IDM.tutorial }; }""")
        check('legacy 5-base save reset (no 2-0, tutorial restarted)',
              not st['levels'].get('2-0') and st['tut'] == 'watch', str(st)[:120])
        # 9b 正常档（第 1 章齐全，无矛盾）→ 不删
        page.evaluate(preset_save(tut_seen=True, done_flats=range(8)))
        page.reload()
        stub(page)
        page.wait_for_function('window.IDM && IDM.quiz', timeout=8000)
        st = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_idiom') || '{}');
            return { has13: !!s.levels['1-3'], tut: IDM.tutorial }; }""")
        check('normal 8-base chapter-1 save preserved (1-3 kept, no tutorial restart)',
              st['has13'] and st['tut'] != 'watch', str(st))
        page.close()
        browser.close()

    # ---------- 10. 构建自检：clips 注入条数 + 完全离线 ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('data:audio/mpeg')
    check('index.html clips: exactly 250 data:audio (3 core + 7 idm_ 句 + 80 idm_w_ 读音 + 80 idm_ctx_ 情境句 + 80 idm_def_ 释义)',
          n_audio == 250, n_audio)
    for k in ['idm_tut_watch2', 'idm_tut_turn2', 'idm_hint2', 'idm_right2', 'idm_wrong2',
              'idm_q_fill', 'idm_q_near', 'idm_w_1', 'idm_w_33', 'idm_w_80',
              'idm_ctx_1', 'idm_ctx_80', 'idm_def_1', 'idm_def_80']:
        if '"%s"' % k not in html:
            check('clip key embedded: ' + k, False)
            break
    else:
        check('spot-check clip keys embedded', True)
    for k in ['idm_tut_watch"', 'idm_t_1"', 'idm_t_30"']:    # 旧键冻结=不得注入（r16 口径）
        if k in html:
            check('frozen legacy key absent: ' + k, False)
            break
    else:
        check('frozen legacy keys absent (idm_t_*/old 5)', True)
    stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
    check('single file fully offline',
          'http://' not in stripped and 'https://' not in stripped and
          ' src=' not in stripped and ' href=' not in stripped)

    # ---------- 11. 截图非空白 ----------
    for shot, floor in [('idiom_1280.png', 5.0), ('celebrate.png', 4.0), ('tutorial_watch.png', 5.0),
                        ('vp_1280x800.png', 5.0), ('vp_800x1180.png', 5.0),
                        ('p1b_flat0.png', 5.0), ('p1b_flat16.png', 5.0), ('p1b_flat39.png', 5.0)]:
        ok, detail = png_nonblank(SHOTS / shot, floor)
        check('screenshot non-blank: ' + shot, ok, detail)

    check('0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
