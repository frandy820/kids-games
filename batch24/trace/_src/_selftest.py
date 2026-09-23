# -*- coding: utf-8 -*-
"""trace _selftest r5 — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + 0 pageerror
2. Python 侧独立生成器对拍（r5 算法从 SPEC §7 独立重实现，禁抄页面代码）：40 关（flat 0-39）
   [kind,num,cards,right,hintMode,phase] 全等——确定性+双实现互证
3. 引擎级语义：错型方向对拍（Python 从 SPEC 锚点表独立重算）/ 不重头 / 选卡相位守卫
4. TR.start(15) 外部切关生效（b21 三款系统性遗漏教训）
5. 双 viewport(1280x800/800x1180) flat 0/5/10/15（write+pick 两相位）：锚点与卡 ≥64、
   overflowX≤0、截图像素非空白
6. 正常模式（非 verify 页）真实主流程：全新存档 → 教学看→帮（__trDemoR）→
   包 voice.queue 记 log → tapAnchor 循环点完题 0（数字 1）数词 clip tra_n_1 触发 →
   autoSolve 通关 → celebrate → 写档 v1.0 + stars=3 + trace.tutSeen
7. 正常模式听数题流（预置 tutSeen 存档 + TR.start(10)）：题面链 [tra_l_q,tra_n_x] /
   选错 tra_w_pick / 选对进 write 相位
8. 单关净时长 wall-clock：flat1（dch1 自推，18 锚）与 flat5（dch2，26 锚）各独立浏览器，
   模拟幼儿自推 dwell 1200ms/锚 → ≥40s 硬指标（§7）
"""
import json, statistics, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


# ---------- Python 独立生成器（SPEC-BATCH24 §7 r5 算法独立重实现，禁抄页面产物） ----------
M = 0xFFFFFFFF


def mulberry32(seed):
    a = seed & M
    while True:
        a = (a + 0x6D2B79F5) & M
        t = (a ^ (a >> 15)) * (1 | a) & M                      # Math.imul 位型
        t = ((t + ((t ^ (t >> 7)) * (61 | t) & M)) & M) ^ t
        yield ((t ^ (t >> 14)) & M) / 4294967296


def ri(rnd, lo, hi):
    return lo + int(rnd.__next__() * (hi - lo + 1))


SPEC_NEAR = {4: [10], 10: [4], 6: [9], 9: [6], 2: [5], 5: [2]}   # 听数干扰伙伴（§7 封闭 6 对）
SPEC_MIRROR_POOL = [2, 3, 5, 6, 9]                                # 镜像题目标池（§7 封闭 5）
# SPEC 笔顺锚点表（§0.56 承袭——Python 独立重列，禁引页面常量）
SPEC_DIGITS = {
    1:  [[50, 8], [50, 92]],
    2:  [[30, 16], [64, 44], [28, 88]],
    3:  [[28, 20], [52, 52], [30, 90]],
    4:  [[28, 16], [54, 74], [82, 74], [54, 16], [54, 66]],
    5:  [[30, 12], [30, 42], [72, 42], [72, 56], [32, 82]],
    6:  [[30, 16], [28, 44], [44, 80], [76, 70], [52, 40]],
    7:  [[24, 16], [78, 16], [64, 24], [36, 88]],
    8:  [[36, 12], [26, 34], [52, 58], [24, 78], [46, 93], [40, 42]],
    9:  [[58, 12], [33, 34], [54, 55], [69, 40], [58, 88]],
    10: [[14, 16], [14, 88], [46, 17], [67, 50], [46, 86], [26, 50]],
}


def shuffle(a, rnd):
    a = list(a)
    for i in range(len(a) - 1, 0, -1):
        j = ri(rnd, 0, i)
        a[i], a[j] = a[j], a[i]
    return a


def listen_cards(num, rnd):
    cards = [num]
    for p in SPEC_NEAR.get(num, []):
        if len(cards) >= 4:
            break
        if p not in cards:
            cards.append(p)
    while len(cards) < 4:
        c = ri(rnd, 1, 10)
        if c not in cards:
            cards.append(c)
    return shuffle(cards, rnd)


def mirror_cards(num, rnd):
    return shuffle([str(num), '%dm' % num, '%dr' % num, '%df' % num], rnd)


def py_gen_level(flat):
    ch = flat // 5 + 1
    dch = (ch - 1) % 4 + 1
    rnd = mulberry32(flat * 7919 + 13)
    quizzes = []
    if dch == 1:
        off = 0 if flat == 0 else ri(rnd, 0, 4)
        quizzes = [['trace', ((off + i) % 5) + 1, None, -1, 'ends', 'write'] for i in range(5)]
    elif dch == 2:
        off = ri(rnd, 0, 4)
        quizzes = [['trace', ((off + i) % 5) + 6, None, -1, 'start', 'write'] for i in range(5)]
    elif dch == 3:
        off = ri(rnd, 0, 9)
        for i in range(5):
            num = ((off + i) % 10) + 1
            cards = listen_cards(num, rnd)
            quizzes.append(['listen', num, cards, cards.index(num), 'start', 'pick'])
    else:
        mOff, lOff, tOff = ri(rnd, 0, 4), ri(rnd, 0, 9), ri(rnd, 0, 9)
        mi = li = ti = 0
        for kk in ['mirror', 'listen', 'trace', 'mirror', 'trace']:
            if kk == 'mirror':
                num = SPEC_MIRROR_POOL[(mOff + mi) % 5]
                mi += 1
                cards = mirror_cards(num, rnd)
                quizzes.append(['mirror', num, cards, cards.index(str(num)), 'start', 'pick'])
            elif kk == 'listen':
                num = ((lOff + li) % 10) + 1
                li += 1
                cards = listen_cards(num, rnd)
                quizzes.append(['listen', num, cards, cards.index(num), 'start', 'pick'])
            else:
                num = ((tOff + ti) % 10) + 1
                ti += 1
                quizzes.append(['trace', num, None, -1, 'start', 'write'])
    return quizzes


def spec_wrong_type(num, pos, i):
    """错型方向规则（§7）Python 独立重算：skip / back:<主轴方向>"""
    a = SPEC_DIGITS[num]
    if i == pos:
        return None
    if i > pos:
        return 'skip'
    j = pos + 1 if pos + 1 < len(a) else len(a) - 1
    k = pos - 1 if j == pos else pos
    dx, dy = a[j][0] - a[k][0], a[j][1] - a[k][1]
    d = ('down' if dy > 0 else 'up') if abs(dy) >= abs(dx) else ('right' if dx > 0 else 'left')
    return 'back:' + d


DWELL_PLAY = """async () => {
  TR.start(%d);
  const t0 = Date.now();
  const dwell = ms => new Promise(r => setTimeout(r, ms));
  let guard = 0;
  while (!TR.currentLevel.done && guard++ < 600) {
    const q = TR.quiz;
    if (!q) break;
    if (state.busy || state.won || state.demo || state.locked) { await dwell(50); continue; }
    await dwell(1200);                     // 幼儿自推决策下界（SPEC §7 口径）
    if (q.phase === 'pick') await TR.tapCard(q.right);
    else await TR.tapAnchor(q.pos);
  }
  return { ms: Date.now() - t0, done: TR.currentLevel.done, stars: TR.currentLevel.stars,
           miss: TR.currentLevel.miss };
}"""


def main():
    page_errors, http_reqs = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()                          # 独立 headless，不弹不连不杀
        page = browser.new_page()
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('request', lambda r: http_reqs.append(r.url) if r.url.startswith('http') else None)

        # ---- 1. verify=1 自检 ----
        page.goto(URL + '?verify=1')
        title = ''
        for _ in range(120):                                   # runVerify 异步（教学链+冒烟），轮询 title
            page.wait_for_timeout(500)
            title = page.title()
            if title.startswith('VERIFY'):
                break
        check('verify title', title.startswith('VERIFY PASS') and '/' in title, title)
        raw = page.eval_on_selector('#verify-result', 'el => el.textContent')
        out = json.loads(raw)
        check('verify pass==total', out['pass'] == out['total'], "%s/%s" % (out['pass'], out['total']))
        check('verify layoutOk', out['layoutOk'] is True)
        units_fail = {k: v for k, v in out['units'].items() if not v.get('ok')}
        smokes_fail = {k: v for k, v in out['smokes'].items() if not v.get('ok')}
        lv_fail = {k: v for k, v in {**out['levels'], **out['gen']}.items() if not v.get('ok')}
        check('verify units all green', not units_fail, units_fail)
        check('verify smokes all green', not smokes_fail, smokes_fail)
        check('verify 40 levels all green', not lv_fail and len(out['levels']) + len(out['gen']) == 40,
              'n=%d' % (len(out['levels']) + len(out['gen'])))
        check('0 pageerror (verify page)', not page_errors, page_errors[:3])

        # ---- 2. Python 独立生成器 40 关对拍（双实现互证确定性；含 cards/right 全形） ----
        bad = []
        for flat in range(40):
            got = page.evaluate(
                'f => genLevel(f).quizzes.map(q => [q.kind, q.num, q.cards ? q.cards.slice() : null, q.right, q.hintMode, q.phase])',
                flat)
            want = py_gen_level(flat)
            if got != want:
                bad.append((flat, got, want))
        check('python-side generator parity (40 levels, r5 shape)', not bad, bad[:2])

        # ---- 3a. 错型方向对拍（引擎 engWrongType vs Python SPEC 独立重算，全数字全 pos 全错点） ----
        eng = page.evaluate("""() => {
          const res = {};
          for (const num of Object.keys(DIGITS).map(Number)) {
            const n = DIGITS[num].anchors.length;
            res[num] = [];
            for (let pos = 0; pos < n; pos++) {
              const L = genLevel(0), q = L.quizzes[0];
              q.num = num; q.anchors = DIGITS[num].anchors.map(x => x.slice()); q.pos = pos; q.phase = 'write';
              const row = [];
              for (let i = 0; i < n; i++) {
                const w = engWrongType(q, i);
                row.push(w ? (w.type + (w.dir ? ':' + w.dir : '')) : null);
              }
              res[num].push(row);
            }
          }
          return res;
        }""")
        badw = []
        for num, rows in eng.items():
            a = SPEC_DIGITS[int(num)]
            for pos in range(len(a)):
                for i in range(len(a)):
                    if rows[pos][i] != spec_wrong_type(int(num), pos, i):
                        badw.append((num, pos, i, rows[pos][i], spec_wrong_type(int(num), pos, i)))
        check('wrong-type direction parity (engine vs python SPEC recompute)', not badw, badw[:3])

        # ---- 3b. 引擎级不重头 + 相位守卫（genLevel(0) 题0=数字 1） ----
        eng2 = page.evaluate('''() => {
          const L = genLevel(0), q = L.quizzes[0];
          const r1 = engTapAnchor(L, 1);   // 错：miss+1，pos 不进
          const s1 = { pos: q.pos, miss: q.miss, mt: L.missTotal };
          const r2 = engTapAnchor(L, 0);   // 当前锚点重试点对：pos 1
          const s2 = { pos: q.pos, miss: q.miss };
          const r3 = engTapAnchor(L, 0);   // 再错：pos 仍 1（不重头）
          const s3 = { pos: q.pos, miss: q.miss, mt: L.missTotal };
          const r4 = engTapAnchor(L, 1);   // 题完成
          const L10 = genLevel(10);
          const pickGuard = engTapAnchor(L10, 0) === null && engPickCard(L10, L10.quizzes[0].right) === 'right'
                            && L10.quizzes[0].phase === 'write'
                            && engPickCard(L10, 0) === null;
          return { r: [r1, r2, r3, r4], s1: s1, s2: s2, s3: s3, step: L.step, pickGuard: pickGuard };
        }''')
        check('engine wrong->miss+1 pos stays',
              eng2['r'][0] == 'wrong' and eng2['s1']['pos'] == 0 and eng2['s1']['miss'] == 1, eng2)
        check('engine retry-right advances',
              eng2['r'][1] == 'right' and eng2['s2']['pos'] == 1, eng2['s2'])
        check('engine no-restart (2nd wrong keeps pos)',
              eng2['r'][2] == 'wrong' and eng2['s3']['pos'] == 1 and eng2['s3']['miss'] == 2 and
              eng2['s3']['mt'] == 2, eng2['s3'])
        check('engine quiz done advances step', eng2['r'][3] == 'done' and eng2['step'] == 1, eng2['step'])
        check('engine pick/write phase guards', eng2['pickGuard'] is True, eng2['pickGuard'])

        # ---- 4. TR.start(15) 外部切关（flat15=ch4 dch4 镜像混出；单 evaluate 原子读防 verify 竞态） ----
        both = page.evaluate('() => { TR.start(15); return { lv: TR.currentLevel, q: TR.quiz }; }')
        lv, qz = both['lv'], both['q']
        check('TR.start(15) takes effect (dch4 mirror-mix)',
              lv['flat'] == 15 and lv['ch'] == 4 and lv['dch'] == 4 and
              qz['kind'] == 'mirror' and qz['phase'] == 'pick', {'lv': lv, 'q': qz})

        # ---- 5. 双 viewport 布局 + 截图非空白（write+pick 两相位） ----
        # r5 verify 含长异步单元（③自推走查等）——先等 title=VERIFY（runVerify 收束）再测，
        # 免 TR.start 与 verify 内部切关竞态（v1 靠时序侥幸通过，r5 收紧）
        page.goto(URL + '?verify=1')
        for _ in range(120):
            page.wait_for_timeout(500)
            if page.title().startswith('VERIFY'):
                break
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 5), (800, 1180, 5),
                           (1280, 800, 10), (800, 1180, 10), (1280, 800, 15), (800, 1180, 15)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.evaluate('TR.start(%d)' % flat)
            page.wait_for_timeout(250)
            m = page.evaluate('''() => {
              const q = TR.quiz;
              const targets = q.phase === 'pick'
                ? [...document.querySelectorAll('.card')].map(b => [b.offsetWidth, b.offsetHeight])
                : [...document.querySelectorAll('.anchor')].map(b => [b.offsetWidth, b.offsetHeight]);
              const btns = ['btn-rabbit','btn-demo'].map(id => document.getElementById(id))
                .map(b => [b.offsetWidth, b.offsetHeight]);
              const g = document.getElementById('game');
              return { phase: q.phase, n: targets.length,
                       minT: targets.length ? Math.min(...targets.flat()) : 0,
                       minBtn: Math.min(...btns.flat()), ox: Math.max(g.scrollWidth - g.clientWidth,
                                    document.documentElement.scrollWidth - document.documentElement.clientWidth) };
            }''')
            shot = HERE / '_shots' / ('vp%d_%d_f%d.png' % (w, h, flat))
            shot.parent.mkdir(exist_ok=True)
            page.screenshot(path=str(shot))
            try:
                from PIL import Image
                im = Image.open(str(shot)).convert('L').resize((160, 100))
                sd = statistics.pstdev(list(im.getdata()))
                nonblank = sd > 10
            except ImportError:
                nonblank, sd = shot.stat().st_size > 30000, -1
            check('layout %dx%d flat%d (%s)' % (w, h, flat, m['phase']),
                  m['n'] >= 2 and m['minT'] >= 64 and m['minBtn'] >= 64 and m['ox'] <= 0 and nonblank,
                  {'phase': m['phase'], 'targets': m['n'], 'minT': m['minT'], 'minBtn': m['minBtn'],
                   'ox': m['ox'], 'pixelSd': round(sd, 1)})
        page.set_viewport_size({'width': 1280, 'height': 800})

        # ---- 6. 正常模式主流程：全新存档 → 教学（看→帮）→ 点完题 0 → autoSolve → 写档 ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        pg2.goto(URL)
        tut = ''
        for _ in range(40):                       # watch ≈5s（真实 SPEED=1）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('TR.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__trDemoR')
        check('normal-mode tutorial watch->help', tut == 'help' and demo_r == 'right',
              {'tut': tut, '__trDemoR': demo_r})
        # 包装 voice.queue 记录数词朗读 log（不动主流程）
        pg2.evaluate('() => { window.__vlog = []; const o = KIDS.voice.queue; ' +
                     'KIDS.voice.queue = function (parts) { parts.forEach(p => ' +
                     'window.__vlog.push(typeof p === "string" ? p : p.key)); return o.apply(this, arguments); }; }')
        # 点一个数字完整走完：tapAnchor 循环到题 0 done（数字 1 两锚点）
        step0 = pg2.evaluate('''async () => {
          let guard = 0;
          while (!TR.currentLevel.done && TR.currentLevel.step === 0 && guard++ < 80) {
            const q = TR.quiz;
            if (!q) break;
            const r = await TR.tapAnchor(q.pos);
            if (r === false) await new Promise(rs => setTimeout(rs, 100));
          }
          return TR.currentLevel.step;
        }''')
        vlog1 = pg2.evaluate('window.__vlog')
        check('tapAnchor loop finishes quiz0 (num-1 word clip fired)',
              step0 == 1 and 'tra_n_1' in vlog1 and 'tra_right' in vlog1,
              {'step': step0, 'vlog': vlog1})
        # autoSolve 通关剩余 4 题 → celebrate → 写档
        r2 = pg2.evaluate('TR.autoSolve()')
        cel = False
        for _ in range(12):                       # celebrate 层存在 2.3s，轮询抓取
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('TR.currentLevel.done')
            if cel:
                break
            pg2.wait_for_timeout(300)
        pg2.wait_for_timeout(3200)                # celebrate 2.3s + pass 写档
        sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_trace")||"null")')
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        vlog2 = pg2.evaluate('window.__vlog')
        nums_done = [k for k in vlog2 if k.startswith('tra_n_')]
        check('normal-mode solve & celebrate & save',
              cel and r2.get('done') and (sv or {}).get('v') == '1.0' and
              (sv or {}).get('game') == 'trace' and (sv or {}).get('trace', {}).get('tutSeen') and
              st1.get('stars') == 3 and len(nums_done) == 5,
              {'celebrate_or_done': cel, 'auto': r2, 'v': (sv or {}).get('v'),
               'game': (sv or {}).get('game'), 'tutSeen': (sv or {}).get('trace'),
               'stars10': st1.get('stars'), 'numClips': len(nums_done)})
        check('0 pageerror (normal mode)', not errs2, errs2[:3])
        ctx.close()

        # ---- 7. 正常模式听数题流（tutSeen 预置 + TR.start(10)） ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg3 = ctx.new_page()
        errs3 = []
        pg3.on('pageerror', lambda e: errs3.append(str(e)))
        pg3.add_init_script('localStorage.setItem("kidsgame_trace", JSON.stringify(' +
                            '{v:"1.0",game:"trace",settings:{tts:true,vol:0.6,sfx:true},levels:{},trace:{tutSeen:true}}))')
        pg3.goto(URL)
        pg3.wait_for_timeout(1200)
        lg = pg3.evaluate('''() => {
          window.__qlog = []; window.__plog = [];
          const oq = KIDS.voice.queue, op = KIDS.voice.play;
          KIDS.voice.queue = function (parts) { window.__qlog.push(parts.map(p => typeof p === "string" ? p : p.key)); return oq.apply(this, arguments); };
          KIDS.voice.play = function (k) { window.__plog.push(typeof k === "string" ? k : k.key); return op.apply(this, arguments); };
          return true;
        }''')
        qz3 = pg3.evaluate('() => { TR.start(10); return TR.quiz; }')
        stem = pg3.evaluate('() => { playCue(); return window.__qlog.slice(-1)[0]; }')
        rw3 = pg3.evaluate('() => TR.tapCard((TR.quiz.right + 1) % 4)')
        st3 = pg3.evaluate('() => TR.quiz')
        check('listen question flow (stem chain + wrong pick + phase switch)',
              lg and qz3['kind'] == 'listen' and qz3['phase'] == 'pick' and
              stem == ['tra_l_q', 'tra_n_' + str(qz3['num'])] and
              rw3 == 'wrong' and 'tra_w_pick' in pg3.evaluate('window.__plog') and
              st3['phase'] == 'pick' and st3['miss'] == 1,
              {'stem': stem, 'rw': rw3, 'phase': st3['phase'], 'miss': st3['miss']})
        rr3 = pg3.evaluate('() => TR.tapCard(TR.quiz.right)')
        st4 = pg3.evaluate('() => TR.quiz')
        check('listen right pick -> write phase (hint2 fired)',
              rr3 == 'right' and st4['phase'] == 'write' and 'tra_hint2' in pg3.evaluate('window.__plog'),
              {'rr': rr3, 'phase': st4['phase']})
        check('0 pageerror (listen flow)', not errs3, errs3[:3])
        ctx.close()

        browser.close()

        # ---- 8. 单关净时长 wall-clock（§7 ≥40s 硬指标；>60s 会话分独立 browser） ----
        for flat, want_min in [(1, 40000), (5, 40000)]:
            b2 = p.chromium.launch()
            c2 = b2.new_context(viewport={'width': 1280, 'height': 800})
            pg4 = c2.new_page()
            errs4 = []
            pg4.on('pageerror', lambda e: errs4.append(str(e)))
            pg4.add_init_script('localStorage.setItem("kidsgame_trace", JSON.stringify(' +
                                '{v:"1.0",game:"trace",settings:{tts:true,vol:0.6,sfx:true},levels:{},trace:{tutSeen:true}}))')
            pg4.goto(URL)
            pg4.wait_for_timeout(800)
            tm = pg4.evaluate(DWELL_PLAY % flat)
            check('wall-clock level flat%d >= 40s (dwell 1200ms/anchor)' % flat,
                  tm['done'] and tm['stars'] == 3 and tm['ms'] >= want_min and not errs4,
                  {'ms': tm['ms'], 'done': tm['done'], 'stars': tm['stars'], 'errs': errs4[:1]})
            c2.close()
            b2.close()

        # ---- 离线复核：全程无 http(s) 请求（file:// 本页除外） ----
        check('offline (no http requests)', not [u for u in http_reqs if not u.startswith('file://')],
              [u for u in http_reqs if not u.startswith('file://')][:3])
        check('0 pageerror (overall)', not page_errors, page_errors[:3])

    fails = [r for r in RESULTS if not r[1]]
    print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
    if fails:
        for n, _, d in fails:
            print('FAIL:', n, d)
        sys.exit(1)


if __name__ == '__main__':
    main()
