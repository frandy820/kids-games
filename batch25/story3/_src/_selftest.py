# -*- coding: utf-8 -*-
"""story3 _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r34 难度谱版（SPEC-R34-STORY3 §R8）：
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + units/levels/gen 全绿 + 0 pageerror
2. Python 独立 genLevel 镜像（mulberry32/shuffled 本地副本，r32 同源范式）× 40 关全量对拍
   （story/frames{id,pos}/why.opts 全字段；禁引用页内函数——同源陷阱防线）
3. 真实页（种档 tutSeen=false）：教学自动触发（看→帮，__stDemoR='right'）→ 真实 pointer
   排完故事 0 → autoSolve 通关 → celebrate → 写档 stars=3 + story3.tutSeen + v1.0
4. 真实页（种档 tutSeen=true，ST.start(5)）：dch2 干扰帧在场 5 卡 → 干扰帧错点=
   miss+1+不放置+__stoVlog 'sto_w_out'；自有帧错点='sto_hint'；全 vlog 无 wFirst/wMid（去泄序）
5. 真实页（ST.start(10)）：dch3 5 帧+why——排完 qi0/qi1 → why 面板 2 选项卡（文本=why.a/b）+
   槽 1 why-first pulse；真实 pointer 点错选项=miss+1+step 不推；点对=step 推进+sto_why_right
6. 双 viewport(1280x800/800x1180)×(flat0 3 卡/flat12 6 卡 5 槽/why 面板)：卡与选项卡 ≥96、
   槽 ≥64、overflowX≤0、PIL 像素非空白取证 _shots/
MUTE 静音双保险（r19/r28 红线）：每 context 挂 MUTE_INIT init_script（words r28 定稿 function 版）
+ 种档 settings sound:false/tts:false/vol:0。
"""
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = '2026-09-18'
RESULTS = []

MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed',
  resume:function(){},
  createOscillator:function(){ return {
    connect:function(){ return { connect:function(){} }; },
    start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  createGain:function(){ return {
    connect:function(){},
    gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  destination:{}, currentTime:0, sampleRate:44100
}; };"""

# ---------- Python 独立表（SPEC-R34 §R2 文字逐条转译，禁抄页面 STORY_LIB） ----------
ALL12 = ['wake', 'meal', 'laundry', 'night', 'seed', 'cate', 'rain', 'chick',
         'sunwalk', 'bird', 'meals', 'shadow']                    # 页内对象插入序（CH_IDS 过滤序）
PY_POOL = {1: ALL12[0:4], 2: ALL12[4:8], 3: ALL12[8:12]}
PY_FRAMES = {'wake': 3, 'meal': 3, 'laundry': 3, 'night': 3,
             'seed': 4, 'cate': 4, 'rain': 4, 'chick': 4,
             'sunwalk': 5, 'bird': 5, 'meals': 5, 'shadow': 5}
PY_WHY_QI = (1, 3)                                                # dch3/4 因果问句触发位
MASK = 0xFFFFFFFF


def mulberry32(a):
    a = int(a) & MASK
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & MASK
        t = ((a ^ (a >> 15)) * (1 | a)) & MASK
        imul2 = ((t ^ (t >> 7)) * (61 | t)) & MASK
        t = (((t + imul2) & MASK) ^ t) & MASK
        return ((t ^ (t >> 14)) & MASK) / 4294967296
    return nxt


def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a


def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))


def py_story_seq(dch, rnd):
    pool = list(ALL12) if dch == 4 else list(PY_POOL[dch])
    if len(pool) >= 5:
        return shuffled(pool, rnd)[:5]
    order = shuffled(pool, rnd)
    rest = [s for s in pool if s != order[-1]]
    order.append(rest[int(rnd() * len(rest))])
    return order


def py_build_quiz(story, rnd, dch, qi):
    n = PY_FRAMES[story]
    order = shuffled(list(range(n)), rnd)
    if all(v == k for k, v in enumerate(order)):
        order[0], order[1] = order[1], order[0]
    frames = [{'id': '%s-f%d' % (story, p), 'pos': p} for p in order]
    if dch >= 2:
        pool = [s for s in (ALL12 if dch == 4 else PY_POOL[dch]) if s != story]
        ds = pool[int(rnd() * len(pool))]
        df = int(rnd() * PY_FRAMES[ds])
        at = int(rnd() * (n + 1))
        frames.insert(at, {'id': '%s-f%d' % (ds, df), 'pos': -1})
    why = {'opts': shuffled(['a', 'b'], rnd)} if (dch in (3, 4) and qi in PY_WHY_QI) else None
    return {'story': story, 'frames': frames, 'why': why}


def py_gen_level(flat):
    ch = flat // 5 + 1
    dch0 = (ch - 1) % 4 + 1
    rnd = mulberry32(flat * 7919 + 25)
    dch = dch0 if flat < 20 else ri(rnd, 1, 4)
    seq = py_story_seq(dch, rnd)
    return {'dch': dch, 'quizzes': [py_build_quiz(seq[qi], rnd, dch, qi) for qi in range(5)]}


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=()):
    save = {
        'v': '1.0', 'game': 'story3', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': False, 'tts': False, 'vol': 0},          # MUTE 双保险之一（r19）
        'restTip': {'day': '', 'shown': 0},
        'story3': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_story3", ' + json.dumps(json.dumps(save)) + ')'


def new_ctx(browser, vp, seed=None):
    ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
    ctx.add_init_script(MUTE_INIT)
    if seed:
        ctx.add_init_script(seed)
    return ctx


def png_nonblank(path, floor=10.0):
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(path)).convert('L').resize((160, 100))
        sd = statistics.pstdev(list(im.getdata()))
        return sd > floor, 'PIL pixel stdev=%.1f' % sd
    except ImportError:
        return path.stat().st_size > 30000, 'size=%d' % path.stat().st_size


def drive_story(pg, n_frames):
    """钩子通道排完当前故事（逐槽点正确帧）"""
    for _ in range(n_frames):
        q = pg.evaluate('() => ST.quiz')
        if not q or q.get('answered'):
            break
        idx = next((i for i, f in enumerate(q['frames'])
                    if not f['placed'] and f['pos'] == q['slot']), None)
        if idx is None:
            break
        pg.evaluate('(i) => ST.tapFrame(i)', idx)
        pg.wait_for_timeout(120)


def main():
    page_errors, http_reqs = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---- 1. verify=1 自检（MUTE context） ----
        ctx = new_ctx(browser, (1280, 800))
        page = ctx.new_page()
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('request', lambda r: http_reqs.append(r.url) if r.url.startswith('http') else None)
        page.goto(URL + '?verify=1')
        title = ''
        for _ in range(240):
            page.wait_for_timeout(500)
            title = page.title()
            if title.startswith('VERIFY'):
                break
        check('verify title', title.startswith('VERIFY PASS') and '/' in title, title)
        raw = page.eval_on_selector('#verify-result', 'el => el.textContent')
        out = json.loads(raw)
        check('verify pass==total', out['pass'] == out['total'], '%s/%s' % (out['pass'], out['total']))
        check('verify layoutOk', out['layoutOk'] is True)
        units_fail = {k: v for k, v in out['units'].items() if not v.get('ok')}
        smokes_fail = {k: v for k, v in out['smokes'].items() if not v.get('ok')}
        lv_fail = {k: v for k, v in {**out['levels'], **out['gen']}.items() if not v.get('ok')}
        check('verify units all green', not units_fail, list(units_fail)[:4])
        check('verify smokes all green', not smokes_fail, list(smokes_fail)[:4])
        check('verify 40 levels all green',
              not lv_fail and len(out['levels']) + len(out['gen']) == 40,
              'n=%d fail=%s' % (len(out['levels']) + len(out['gen']), list(lv_fail)[:4]))

        # ---- 2. Python 独立 genLevel 镜像 × 40 关对拍 ----
        page_js = page.evaluate('''Array.from({length:40}, (_, f) => { const L = genLevel(f);
          return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({
            story: q.story,
            frames: q.frames.map(x => ({ id: x.id, pos: x.pos })),
            why: q.why ? { opts: q.why.opts } : null })) }; })''')
        mism = []
        for lv in page_js:
            want = py_gen_level(lv['flat'])
            if lv['dch'] != want['dch']:
                mism.append((lv['flat'], 'dch', lv['dch'], want['dch']))
                continue
            for k, (qa, qb) in enumerate(zip(lv['quizzes'], want['quizzes'])):
                if qa['story'] != qb['story']:
                    mism.append((lv['flat'], k, 'story', qa['story'], qb['story']))
                elif qa['frames'] != qb['frames']:
                    mism.append((lv['flat'], k, 'frames', qa['frames'], qb['frames']))
                elif (qa['why'] or {}).get('opts') != (qb['why'] or {}).get('opts'):
                    mism.append((lv['flat'], k, 'why', qa['why'], qb['why']))
        check('python genLevel mirror 40/40 identical', not mism, mism[:3])
        check('0 pageerror (verify page)', not page_errors, page_errors[:3])
        ctx.close()

        # ---- 3. 真实页主流程：教学（看→帮）→ pointer 排故事0 → autoSolve → 写档 ----
        ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=False))
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL)
        tut = ''
        for _ in range(50):                        # watch 链真实 SPEED=1：≈700+3×1780+500≈6.6s+turn
            pg.wait_for_timeout(500)
            tut = pg.evaluate('ST.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg.evaluate('window.__stDemoR')
        check('tutorial watch->help + demoR', tut == 'help' and demo_r == 'right',
              {'tut': tut, 'demoR': demo_r})
        # 真实 pointer 排完故事 0（help 首点对即放手 solo；3 帧真实链）
        solo = False
        for s in range(3):
            q = pg.evaluate('() => ST.quiz')
            idx = next(i for i, f in enumerate(q['frames'])
                       if not f['placed'] and f['pos'] == q['slot'])
            pg.click('.card[data-i="%d"]' % idx, timeout=5000)
            pg.wait_for_timeout(800)               # 飞入窗 560ms
            if pg.evaluate('ST.tutorial') == 'solo':
                solo = True                        # 首点对即放手（r34 教学语义）
        # 末槽点击后复述窗（wake 实测 8400+300）+sto_right 3150 → step 推进+新故事渲染（locked 释放），
        # 轮询：step>=1 且新故事 3 卡全未放置（渲染完成才可继续驱动）
        step0 = 0
        for _ in range(50):
            st = pg.evaluate('() => ({ step: ST.currentLevel.step, '
                             'fresh: document.querySelectorAll("#board .card:not(.gone)").length })')
            step0 = st['step']
            if step0 >= 1 and st['fresh'] == 3:
                break
            pg.wait_for_timeout(500)
        pg.wait_for_timeout(300)
        check('pointer solve story0 (help->solo)', solo and step0 >= 1,
              {'solo': solo, 'step': step0})
        r = pg.evaluate('() => ST.autoSolve()')    # 其余故事走真实钩子链
        lv = pg.evaluate('() => ST.currentLevel')
        check('flat0 autoSolve done 3 stars', r['done'] and r['taps'] == 12 and lv['done'] and lv['stars'] == 3,
              {'r': r, 'lv': {'done': lv['done'], 'stars': lv['stars']}})
        cel = False
        for _ in range(12):
            cel = pg.evaluate('!!document.querySelector(".k-celebrate")') or pg.evaluate('ST.currentLevel.won')
            if cel:
                break
            pg.wait_for_timeout(400)
        pg.wait_for_timeout(3600)                  # celebrate+pass 写档
        sv = pg.evaluate('JSON.parse(localStorage.getItem("kidsgame_story3")||"null")')
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('save write (v1.0/tutSeen/stars3/celebrate)',
              cel and (sv or {}).get('v') == '1.0' and (sv or {}).get('story3', {}).get('tutSeen')
              and st1.get('stars') == 3,
              {'celebrate': cel, 'v': (sv or {}).get('v'), 'story3': (sv or {}).get('story3'),
               'stars': st1.get('stars')})
        check('0 pageerror (main flow)', not errs, errs[:3])
        pg.screenshot(path=str(SHOTS / 'r34-main-flat0-solved.png'))
        ctx.close()

        # ---- 4. 真实页 dch2 干扰帧（ST.start(5)）：错点/反馈分流/去泄序 ----
        ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True))
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL)
        pg.wait_for_timeout(1800)
        pg.evaluate('() => ST.start(5)')
        pg.wait_for_timeout(400)
        q = pg.evaluate('() => ST.quiz')
        n_cards = pg.evaluate('document.querySelectorAll("#board .card").length')
        di = next((i for i, f in enumerate(q['frames']) if f['pos'] == -1), None)
        check('dch2 board: 5 cards with distractor', n_cards == 5 and di is not None
              and len(q['frames']) == PY_FRAMES[q['story']] + 1,
              {'cards': n_cards, 'story': q['story'], 'di': di})
        vl0 = pg.evaluate('window.__stoVlog.length')
        pg.evaluate('(i) => ST.tapFrame(i)', di)          # 干扰帧错点（fire-and-forget，错窗内）
        pg.wait_for_timeout(1200)
        q2 = pg.evaluate('() => ST.quiz')
        seg = pg.evaluate('(a) => window.__stoVlog.slice(a)', vl0)
        placed_own = [f['placed'] for f in q2['frames'] if f['pos'] >= 0]
        check('distractor tap: wrong+miss+no place+sto_w_out',
              q2['miss'] == 1 and q2['slot'] == 0 and not any(placed_own)
              and any(e['k'] == 'sto_w_out' for e in seg),
              {'miss': q2['miss'], 'seg': [e['k'] for e in seg]})
        vl1 = pg.evaluate('window.__stoVlog.length')
        wi = next(i for i, f in enumerate(q2['frames']) if f['pos'] >= 0 and f['pos'] != q2['slot'])
        pg.evaluate('(i) => ST.tapFrame(i)', wi)          # 自有帧错点
        pg.wait_for_timeout(1200)
        seg2 = pg.evaluate('(a) => window.__stoVlog.slice(a)', vl1)
        check('own-frame wrong: sto_hint (non-leak)',
              pg.evaluate('() => ST.quiz')['miss'] == 2
              and any(e['k'] == 'sto_hint' for e in seg2),
              {'seg': [e['k'] for e in seg2]})
        allv = pg.evaluate('() => window.__stoVlog.map(e => e.k)')
        check('vlog free of retired positional keys',
              'sto_w_first' not in allv and 'sto_w_mid' not in allv)
        check('0 pageerror (distractor flow)', not errs, errs[:3])
        pg.screenshot(path=str(SHOTS / 'r34-dch2-distractor-board.png'))
        ctx.close()

        # ---- 5. 真实页 dch3 5 帧+why（ST.start(10)）：面板/错选不推/对选推进 ----
        ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True))
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL)
        pg.wait_for_timeout(1800)
        pg.evaluate('() => ST.start(10)')
        pg.wait_for_timeout(400)
        q0 = pg.evaluate('() => ST.quiz')
        check('dch3 quiz0: 6 cards 5 slots no why',
              pg.evaluate('document.querySelectorAll("#board .card").length') == 6
              and pg.evaluate('document.querySelectorAll("#scene .slot").length') == 5
              and q0['why'] is None and PY_FRAMES[q0['story']] == 5,
              {'story': q0['story'], 'why': q0['why']})
        drive_story(pg, 5)                          # qi0（无 why，完成即推）
        drive_story(pg, 5)                          # qi1（why 待答）
        q1 = pg.evaluate('() => ST.quiz')
        opts = pg.evaluate('''Array.from(document.querySelectorAll('#board .optcard'))
                             .map(b => ({ w: b.dataset.w, t: b.textContent }))''')
        pulse = pg.evaluate('!!document.querySelector("#scene .slot[data-k=\\"0\\"].why-first")')
        lib = pg.evaluate('(s) => STORY_LIB[s].why', q1['story'])
        check('why panel: 2 optcards (texts=why.a/b) + slot0 pulse',
              q1['answered'] is True and q1['why'] and q1['why']['on'] and not q1['why']['done']
              and len(opts) == 2 and sorted(o['t'] for o in opts) == sorted([lib['a'], lib['b']])
              and pulse,
              {'story': q1['story'], 'opts': opts, 'pulse': pulse})
        bad_w = next(o['w'] for o in opts if o['t'] == lib['b'])
        pg.click('.optcard[data-w="%s"]' % bad_w, timeout=5000)   # 真实 pointer 点错
        pg.wait_for_timeout(1300)
        stw = pg.evaluate('() => ({ step: ST.currentLevel.step, done: ST.quiz.why.done, miss: ST.quiz.miss })')
        check('why wrong: miss+1, step not advanced',
              stw['step'] == 1 and stw['done'] is False and stw['miss'] == 1, stw)
        good_w = next(o['w'] for o in opts if o['t'] == lib['a'])
        vl2 = pg.evaluate('window.__stoVlog.length')
        pg.click('.optcard[data-w="%s"]' % good_w, timeout=5000)  # 真实 pointer 点对
        pg.wait_for_timeout(4300)                   # why_right 窗 3700
        stg = pg.evaluate('() => ({ step: ST.currentLevel.step })')
        seg3 = pg.evaluate('(a) => window.__stoVlog.slice(a)', vl2)
        check('why right: step advanced + sto_why_right',
              stg['step'] == 2 and any(e['k'] == 'sto_why_right' for e in seg3),
              {'st': stg, 'seg': [e['k'] for e in seg3]})
        r10 = pg.evaluate('() => ST.autoSolve()')   # 收尾（qi2-4 含 qi3 why）
        check('flat10 finish after why (2 stars: 1 wrong)', r10['done'] and
              pg.evaluate('ST.currentLevel.stars') == 2, {'r': r10})
        pg.screenshot(path=str(SHOTS / 'r34-dch3-why-panel.png'))
        check('0 pageerror (why flow)', not errs, errs[:3])
        ctx.close()

        # ---- 6. 双 viewport 布局 + 像素取证 ----
        for vp in [(1280, 800), (800, 1180)]:
            for tag, setup in [('flat0', ('() => ST.start(0)', 'card')),
                               ('flat12', ('() => ST.start(12)', 'card'))]:
                ctx = new_ctx(browser, vp, preset_save(tut_seen=True))
                pgx = ctx.new_page()
                pgx.on('pageerror', lambda e: page_errors.append(str(e)))
                pgx.goto(URL)
                pgx.wait_for_timeout(1500)
                pgx.evaluate(setup[0])
                pgx.wait_for_timeout(600)
                m = pgx.evaluate('''() => {
                  const cards = Array.from(document.querySelectorAll('#board .card')).map(b => [b.offsetWidth, b.offsetHeight]);
                  const slots = Array.from(document.querySelectorAll('#scene .slot')).map(b => [b.offsetWidth, b.offsetHeight]);
                  const g = document.getElementById('game');
                  return { n: cards.length, min: Math.min(...cards.flat()),
                           sn: slots.length, smin: Math.min(...slots.flat()),
                           ox: Math.max(g.scrollWidth - g.clientWidth,
                                        document.documentElement.scrollWidth - document.documentElement.clientWidth) };
                }''')
                shot = SHOTS / ('r34-vp%d-%s-%s.png' % (vp[0], tag, setup[1]))
                pgx.screenshot(path=str(shot))
                nb, why = png_nonblank(shot)
                exp_n = 3 if tag == 'flat0' else 6
                exp_s = 3 if tag == 'flat0' else 5
                check('layout %dx%d %s (%d cards %d slots)' % (vp[0], vp[1], tag, exp_n, exp_s),
                      m['n'] == exp_n and m['sn'] == exp_s and m['min'] >= 96 and m['smin'] >= 64
                      and m['ox'] <= 0 and nb,
                      {'m': m, 'pixel': why})
                ctx.close()
            # why 面板视口
            ctx = new_ctx(browser, vp, preset_save(tut_seen=True))
            pgx = ctx.new_page()
            pgx.on('pageerror', lambda e: page_errors.append(str(e)))
            pgx.goto(URL)
            pgx.wait_for_timeout(1500)
            pgx.evaluate('() => ST.start(10)')
            pgx.wait_for_timeout(400)
            drive_story(pgx, 5)
            drive_story(pgx, 5)
            m = pgx.evaluate('''() => {
              const o = Array.from(document.querySelectorAll('#board .optcard')).map(b => [b.offsetWidth, b.offsetHeight]);
              const g = document.getElementById('game');
              return { n: o.length, min: Math.min(...o.flat()),
                       ox: Math.max(g.scrollWidth - g.clientWidth,
                                    document.documentElement.scrollWidth - document.documentElement.clientWidth) };
            }''')
            shot = SHOTS / ('r34-vp%d-whypanel.png' % vp[0])
            pgx.screenshot(path=str(shot))
            nb, why = png_nonblank(shot)
            check('layout %dx%d why panel (2 optcards >=96)' % (vp[0], vp[1]),
                  m['n'] == 2 and m['min'] >= 96 and m['ox'] <= 0 and nb, {'m': m, 'pixel': why})
            ctx.close()

        # ---- 离线复核：全程无 http(s) 请求 ----
        check('offline (no http requests)',
              not [u for u in http_reqs if not u.startswith('file://')],
              [u for u in http_reqs if not u.startswith('file://')][:3])
        check('0 pageerror (overall)', not page_errors, page_errors[:3])
        browser.close()

    fails = [r for r in RESULTS if not r[1]]
    print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
    if fails:
        for n, _, d in fails:
            print('FAIL:', n, d)
        sys.exit(1)
    sys.exit(0)


if __name__ == '__main__':
    main()
