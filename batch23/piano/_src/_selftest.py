# -*- coding: utf-8 -*-
"""piano _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + 0 pageerror
2. Python 侧独立生成器对拍：mulberry32/genSeq/genLevel 从 SPEC-R23 §R3 算法独立重实现
   （不引用页面代码），40 关（flat 0-39）seq+mode+longIdx 全等——确定性+双实现互证
   （r23：dch3=5 音；dch4=题型谱 echo6/rhythm4/echo5/chord2/echo5）
3. Python 侧频率表对拍：SPEC §0.54 定值 vs 页面 FREQ ±0.01Hz
4. 引擎级不重头语义：弹错 miss+1 且 pos 不进 → 重试弹对 pos 进 → 序列完成
5. PI.start(12) 外部切关生效（b21 三款系统性遗漏教训）+ PI.setMode 自由/跟弹往返
6. 双 viewport(1280x800/800x1180) flat0/flat15：琴键与按钮 ≥64、overflowX≤0、截图像素非空白
7. 正常模式（非 verify 页）真实主流程：全新存档 → 教学看→帮 → 真实 pointer 弹完 flat0
   → celebrate → 写档 v1.0 + stars=3 + tutSeen；模式按钮真实点击往返
静音双保险：每页面 goto 前挂静音 init_script（speak/Audio no-op+种档 sound:false，
r19 外放事故纪律——MUTE 块用任务书原文，r22 教训种子档含 core 默认档全字段）"""
import json, statistics, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []

# 静音双保险 init_script（r19 教训：speechSynthesis no-op + Audio.play 派发 ended + 种档 sound:false；
# r22 教训：种子档须含 core 默认档全字段（dailyMin 等）——极简档在页面满 60s 时
# session.settle() 读 save.dailyMin[today] 抛 pageerror。块体=任务书指定原文）
MUTE = """(() => {
  try {
    const _d = new Date();
    const _t = _d.getFullYear() + '-' + String(_d.getMonth()+1).padStart(2,'0') + '-' + String(_d.getDate()).padStart(2,'0');
    localStorage.setItem('kidsgame_piano', JSON.stringify({v:'1.0',game:'piano',
      firstDay:_t, lastDay:_t, levels:{}, dailyMin:{},
      settings:{sound:false,tts:false,vol:0}}));
  } catch(e){}
  window.speechSynthesis && (speechSynthesis.speak = () => {}, speechSynthesis.cancel = () => {});
  const ap = Audio.prototype.play; Audio.prototype.play = function(){ try{ this.dispatchEvent(new Event('ended')); }catch(e){} return Promise.resolve(); };
})();"""


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


# ---------- Python 独立生成器（SPEC-R23-PIANO §R3 算法独立重实现，禁抄页面产物） ----------
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


def py_gen_seq(rnd, ln, dch, force_repeat=False, force_high=False):
    seq = [ri(rnd, 0, 6)]
    cur = seq[0]
    for i in range(1, ln):
        if force_repeat and i == 1:
            seq.append(cur)
            continue
        if force_high and i == ln - 1:
            seq.append(7)
            cur = 7
            continue
        pool = [-3, -2, -1, 0, 1, 2, 3] if dch == 4 else [-3, -2, -1, 1, 2, 3]
        nxt = cur + pool[ri(rnd, 0, len(pool) - 1)]
        if nxt < 0 or nxt > 7:
            nxt = cur - (nxt - cur)
        nxt = max(0, min(7, nxt))
        seq.append(nxt)
        cur = nxt
    if force_high and 7 not in seq:
        seq[-1] = 7
    return seq


def py_gen_rhythm(rnd):
    pool = [0, 1, 2, 3, 4, 5, 6, 7]                            # 域 0-7 洗牌取前 4（互异）
    for i in range(len(pool) - 1, 0, -1):
        j = ri(rnd, 0, i)
        pool[i], pool[j] = pool[j], pool[i]
    return pool[:RHY_LEN], ri(rnd, 0, RHY_LEN - 1)


def py_gen_chord(rnd):
    a = ri(rnd, 0, 5)
    b = a + ri(rnd, 2, 3)
    if b > 7:
        b = a + 2
    return [a, b]


CH_LEN = 5
D4_KINDS = ['echo', 'rhythm', 'echo', 'chord', 'echo']         # r23 题型谱（qi 定位）
D4_ECHO_LEN = [6, 5, 5]
RHY_LEN = 4
CHAPTER_LEN = {1: 2, 2: 3, 3: 5}                               # r23：dch3 4→5


def py_gen_level(flat):
    ch = flat // CH_LEN + 1
    dch = (ch - 1) % 4 + 1
    rnd = mulberry32(flat * 7919 + 13)
    seqs, sigs, guard = [], {}, 0
    while len(seqs) < CH_LEN and guard < 600:
        guard += 1
        qi = len(seqs)
        if dch == 4:
            kind = D4_KINDS[qi]
            e_idx = sum(1 for k in D4_KINDS[:qi + 1] if k == 'echo') - 1
            if kind == 'rhythm':
                s, long_idx = py_gen_rhythm(rnd)
                mode, li = 'rhythm', long_idx
            elif kind == 'chord':
                s = py_gen_chord(rnd)
                mode, li = 'chord', None
            else:
                fr = qi == 0
                fh = qi == CH_LEN - 1
                s = py_gen_seq(rnd, D4_ECHO_LEN[e_idx], dch, fr, fh)
                mode, li = 'echo', None
        else:
            s = [0, 4] if (flat == 0 and qi == 0) else py_gen_seq(rnd, CHAPTER_LEN[dch], dch)
            mode, li = 'echo', None
        sig = ','.join(map(str, s))
        if sig in sigs:
            if guard > 400:
                s = [(v + 1) % 8 for v in s]
                sig = ','.join(map(str, s))
            if sig in sigs:
                continue
        sigs[sig] = 1
        seqs.append({'seq': s, 'mode': mode, 'longIdx': li})
    bk = 0
    while len(seqs) < CH_LEN:
        qi = len(seqs)
        kind = D4_KINDS[qi] if dch == 4 else 'echo'
        e_idx = sum(1 for k in D4_KINDS[:qi + 1] if k == 'echo') - 1 if dch == 4 else 0
        ln = RHY_LEN if kind == 'rhythm' else 2 if kind == 'chord' else \
            (D4_ECHO_LEN[e_idx] if dch == 4 else CHAPTER_LEN[dch])
        s = [(bk + i * 3) % 8 for i in range(ln)]
        bk += 1
        if ','.join(map(str, s)) in sigs:
            continue
        sigs[','.join(map(str, s))] = 1
        seqs.append({'seq': s, 'mode': kind, 'longIdx': 0 if kind == 'rhythm' else None})
    return seqs


SPEC_FREQ = {'do': 261.63, 're': 293.66, 'mi': 329.63, 'fa': 349.23,
             'sol': 392.00, 'la': 440.00, 'si': 493.88, 'dosi': 523.25}


def main():
    page_errors, http_reqs = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()                          # 独立 headless，不弹不连不杀
        page = browser.new_page()
        page.add_init_script(MUTE)                             # 静音双保险（每 goto 生效，r19 纪律）
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

        # ---- 2. Python 独立生成器 40 关对拍（双实现互证确定性；r23 含 mode/longIdx 字段） ----
        bad = []
        for flat in range(40):
            got = page.evaluate('''f => genLevel(f).seqs.map(q => ({seq: q.seq, mode: q.mode || 'echo',
                longIdx: q.longIdx == null ? null : q.longIdx}))''', flat)
            want = py_gen_level(flat)
            if got != want:
                bad.append((flat, got, want))
        check('python-side generator parity (40 levels, seq+mode+longIdx)', not bad, bad[:2])

        # ---- 3. Python 侧频率表对拍（SPEC §0.54 定值） ----
        freq = page.evaluate('FREQ')
        badf = [(k, freq.get(k), v) for k, v in SPEC_FREQ.items()
                if k not in freq or abs(freq[k] - v) > 0.01]
        check('python-side freq table parity (8 keys +/-0.01Hz)', not badf and len(freq) == 8, badf)

        # ---- 4. 引擎级不重头语义（genLevel(0) 序列0=do sol） ----
        eng = page.evaluate('''() => {
          const L = genLevel(0), q = L.seqs[0];
          const r1 = engTapKey(L, 'mi');   // 错：miss+1，pos 不进
          const s1 = { pos: q.pos, miss: q.miss, mt: L.missTotal };
          const r2 = engTapKey(L, 'do');   // 当前音重试对：pos 1
          const s2 = { pos: q.pos, miss: q.miss };
          const r3 = engTapKey(L, 're');   // 再错：pos 仍 1（不重头）
          const s3 = { pos: q.pos, miss: q.miss, mt: L.missTotal };
          const r4 = engTapKey(L, 'sol');  // 序列完成
          return { r: [r1, r2, r3, r4], s1: s1, s2: s2, s3: s3, step: L.step };
        }''')
        check('engine wrong->miss+1 pos stays',
              eng['r'][0] == 'wrong' and eng['s1']['pos'] == 0 and eng['s1']['miss'] == 1, eng)
        check('engine retry-right advances', eng['r'][1] == 'right' and eng['s2']['pos'] == 1, eng['s2'])
        check('engine no-restart (2nd wrong keeps pos)',
              eng['r'][2] == 'wrong' and eng['s3']['pos'] == 1 and eng['s3']['miss'] == 2 and
              eng['s3']['mt'] == 2, eng['s3'])
        check('engine seq done advances step', eng['r'][3] == 'done' and eng['step'] == 1, eng['step'])

        # ---- 5. PI.start(12) 外部切关 + setMode 往返 ----
        page.evaluate('PI.start(12)')
        lv = page.evaluate('() => PI.currentLevel')
        check('PI.start(12) takes effect', lv['flat'] == 12 and lv['ch'] == 3 and lv['dch'] == 3, lv)
        fm = page.evaluate('() => PI.setMode("free")')
        fz = page.evaluate('() => ({mode: PI.mode(), phase: PI.phase, r: PI.tapKey("mi")})')
        bk = page.evaluate('() => PI.setMode("follow")')
        check('PI.setMode free/follow roundtrip',
              fm == 'free' and fz['mode'] == 'free' and fz['r'] == 'free' and bk == 'follow' and
              page.evaluate('PI.currentLevel.flat') == 12,
              {'free': fm, 'tap': fz, 'back': bk})

        # ---- 6. 双 viewport 布局 + 截图非空白（verify 页内直测） ----
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 15), (800, 1180, 15)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.goto(URL + '?verify=1')
            page.wait_for_timeout(300)
            page.evaluate('PI.start(%d)' % flat)
            page.wait_for_timeout(250)
            m = page.evaluate('''() => {
              const keys = [...document.querySelectorAll('.key')].map(b => [b.offsetWidth, b.offsetHeight]);
              const btns = ['btn-mode-free','btn-mode-follow','btn-rabbit','btn-replay']
                .map(id => document.getElementById(id))
                .map(b => [b.offsetWidth, b.offsetHeight]);
              const g = document.getElementById('game');
              return { keys: keys, minKey: Math.min(...keys.flat()),
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
            check('layout %dx%d flat%d' % (w, h, flat),
                  m['minKey'] >= 64 and m['minBtn'] >= 64 and m['ox'] <= 0 and nonblank,
                  {'minKey': m['minKey'], 'minBtn': m['minBtn'], 'ox': m['ox'], 'pixelSd': round(sd, 1)})

        # ---- 7. 正常模式（非 verify 页）真实主流程：全新存档 → 教学（看→帮）
        #      → 真实 pointer 逐音弹完 flat0 → celebrate → 写档 v1.0 stars=3 tutSeen ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx.add_init_script(MUTE)                   # 静音双保险（r19 纪律——正常模式页含 KIDS.init 真实音频路径）
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        pg2.goto(URL)
        tut = ''
        for _ in range(40):                       # watch ≈5.8s（真实 SPEED=1）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('PI.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__piDemoR')
        check('normal-mode tutorial watch->help', tut == 'help' and demo_r == 'right',
              {'tut': tut, '__piDemoR': demo_r})
        # 真实 pointer 逐音弹（phase=play 才点；错锁窗 340ms 后放行）
        guard = 0
        while guard < 200:
            guard += 1
            st = pg2.evaluate('() => ({done: PI.currentLevel.done, phase: PI.phase})')
            if st['done']:
                break
            if st['phase'] != 'play':
                pg2.wait_for_timeout(200)
                continue
            nm = pg2.evaluate('() => PI.quiz.seq[PI.quiz.pos]')
            try:                                   # click 偶发卡 performing（环境负载）——宽限+重试一次
                pg2.click('#key-' + nm, timeout=8000)
            except Exception:
                pg2.wait_for_timeout(400)
                pg2.click('#key-' + nm, timeout=8000)
            pg2.wait_for_timeout(480)             # busy 反馈窗 340ms + 余量
        cel = False
        for _ in range(10):                       # celebrate 层存在 2.3s，轮询抓取
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('PI.currentLevel.done')
            if cel:
                break
            pg2.wait_for_timeout(300)
        pg2.wait_for_timeout(3200)                # celebrate 2.3s + pass 写档
        sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_piano")||"null")')
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('normal-mode solve & celebrate & save',
              cel and (sv or {}).get('v') == '1.0' and (sv or {}).get('piano', {}).get('tutSeen')
              and st1.get('stars') == 3,
              {'celebrate_or_done': cel, 'v': (sv or {}).get('v'),
               'tutSeen': (sv or {}).get('piano'), 'stars10': st1.get('stars')})
        # 模式按钮真实点击往返（自由弹=零判定，再回跟弹）
        pg2.click('#btn-mode-free', timeout=3000)
        pg2.wait_for_timeout(300)
        fm2 = pg2.evaluate('PI.mode()')
        pg2.click('#key-mi', timeout=3000)        # 自由弹真点（不判不计数）
        pg2.wait_for_timeout(300)
        pg2.click('#btn-mode-follow', timeout=3000)
        pg2.wait_for_timeout(500)
        bk2 = pg2.evaluate('() => ({mode: PI.mode(), flat: PI.currentLevel.flat})')
        sv2 = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_piano"))')
        stars_after_free = (sv2 or {}).get('levels', {}).get('1-0', {}).get('stars')
        check('normal-mode mode buttons roundtrip (free zero-judge)',
              fm2 == 'free' and bk2['mode'] == 'follow' and stars_after_free == 3,
              {'free': fm2, 'back': bk2, 'stars': stars_after_free})
        check('0 pageerror (normal mode)', not errs2, errs2[:3])
        ctx.close()

        # ---- 离线复核：全程无 http(s) 请求（file:// 本页除外） ----
        check('offline (no http requests)', not [u for u in http_reqs if not u.startswith('file://')],
              [u for u in http_reqs if not u.startswith('file://')][:3])
        check('0 pageerror (overall)', not page_errors, page_errors[:3])
        browser.close()

    fails = [r for r in RESULTS if not r[1]]
    print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
    if fails:
        for n, _, d in fails:
            print('FAIL:', n, d)
        sys.exit(1)


if __name__ == '__main__':
    main()
