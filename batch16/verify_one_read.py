# -*- coding: utf-8 -*-
"""batch16 read 独立复验（断言从 SPEC-BATCH16 §0/§1/§0.31 推导，禁从实现行为归纳）
R1 VERIFY | R2 钩子契约+aria | R3 flat1 真实通关 3★ | R4 一错2★+keyLine flash
R5 §0.31 分源复算 200 题（Python 独立判定器：正确项被关键句支撑+干扰不被支撑+互异+40-80字+同关互异）
R6 教学链 | R7 sayW 三态 | R8 救援错点不重置 | R9 听读重置救援钟
R10 双viewport+离线+clip | R11 flat10/15 通关 | R12 ch3 选项 TTS 兜底(无 clip)"""
import asyncio, io, json, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
# 声音纪律①（r16 收口）：底层通道接管（context 级 add_init_script，新文档/reload 自动生效；
# 对断言透明——idiom 静默副本 read 12/12 / spellen 13/14 实证同模式）
INIT_SND = '''(() => {
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
})();'''

URL = 'file:///' + (BASE / 'read' / 'index.html').as_posix()
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : (p && p.key || 'null')).join('|')); return _q(parts); };
  const _s = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 12)); return _s(t); };
  return true;
})()"""

def seed(n, stars=1):
    return """const sv = KIDS._save() || { levels: {} };
  sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%%5)] = { stars: %d };
  sv.read = { tutSeen: true };
  %s
  KIDS.store.persist();""" % (n, stars, 'KIDS.calendar.bonusSet(10);' if n >= 10 else '')

def lcs(a, b):
    """最长公共连续子串长度（Python 独立实现，分源于游戏 JS）"""
    if not a or not b:
        return 0
    prev = [0] * (len(b) + 1)
    best = 0
    for i in range(1, len(a) + 1):
        cur = [0] * (len(b) + 1)
        ai = a[i - 1]
        for j in range(1, len(b) + 1):
            if ai == b[j - 1]:
                cur[j] = prev[j - 1] + 1
                if cur[j] > best:
                    best = cur[j]
        prev = cur
    return best

DUMP_JS = """(() => {
  const out = [];
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    out.push(L.quizzes.map(q => ({
      dch: q.dch, keyLine: q.keyLine, answer: q.answer, options: q.options.slice(),
      passage: q.passage.slice(), sents: q.sents.slice(), question: q.question, optKeys: q.optKeys.slice()
    })));
  }
  return out;
})()"""

async def tap_card(pg, i):
    pos = await pg.evaluate("""(i => { const e = document.querySelector('#cards .card[data-i="'+i+'"]'); if (!e) return null; const b = e.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height * 0.55}; })(%d)""" % i)
    if pos is None:
        return False
    await pg.mouse.click(pos['x'], pos['y'])
    await pg.wait_for_timeout(250)
    return True

async def tap_right(pg):
    q = await pg.evaluate('RD.quiz')
    if not q:
        return None
    return await tap_card(pg, q['answer'])

async def tap_wrong(pg):
    q = await pg.evaluate('RD.quiz')
    if not q:
        return None
    return await tap_card(pg, next(i for i in range(3) if i != q['answer']))

async def wait_ready(pg, timeout=14000):
    for _ in range(int(timeout / 300)):
        st = await pg.evaluate('RD.currentLevel ? {l: RD.currentLevel.locked, w: RD.currentLevel.won} : null')
        if st is None or (not st['l'] or st['w']):
            return
        await pg.wait_for_timeout(300)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # R1 VERIFY + R5 分源复算（Python 独立判定）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '?verify=1')
        title = ''
        for _ in range(60):
            title = await pg.title()
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        rec('R1 VERIFY title', title == 'VERIFY PASS 48/48' and not errs, 'title=%s errs=%s' % (title, errs[:1]))
        data = await pg.evaluate(DUMP_JS)
        bad = []
        nq = 0
        n_ch3 = 0
        for flat, qs in enumerate(data):
            sigs = set()
            for q in qs:
                nq += 1
                opts, ans = q['options'], q['answer']
                kl = q['sents'][q['keyLine']]               # sents=句数组（passage=整段串）
                uniq = len(set(opts)) == 3
                ansdom = 0 <= ans <= 2
                ln = sum(len(s) for s in q['sents'])
                len_ok = 40 <= ln <= 80                      # §1 硬指标 40-80 字
                sig = ''.join(q['passage']) + q['question']  # 题目互异口径=短文+问句（ch2 同文两问合法）
                sig_ok = sig not in sigs
                sigs.add(sig)
                if q['dch'] == 3:
                    # ch3 推断题：正确项=推断结论，字面 LCS 原理上不可判（干扰可共享实体字）——仅结构断言
                    n_ch3 += 1
                    right_ok = wrong_ok = True
                else:
                    right_ok = lcs(opts[ans], kl) >= 2      # §0.31 正确项=关键句支撑
                    wrong_ok = all(lcs(o, kl) < 2 for i, o in enumerate(opts) if i != ans)  # 干扰不被关键句支撑
                if not (uniq and ansdom and right_ok and wrong_ok and len_ok and sig_ok):
                    bad.append({'flat': flat, 'dch': q['dch'], 'ln': ln, 'uniq': uniq, 'r': right_ok,
                                'w': wrong_ok, 'len': len_ok, 'sig': sig_ok, 'opts': opts, 'kl': kl})
        rec('R5 §0.31分源复算200题(支撑/互斥/互异/40-80字/题目互异;ch3推断章仅结构断言)',
            nq == 200 and n_ch3 > 0 and not bad, 'n=%d ch3=%d bad=%s' % (nq, n_ch3, bad[:2]))
        await ctx.close()

        # R2 钩子+aria | R3 flat1 真实通关
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        q = await pg.evaluate('RD.quiz')
        aria = await pg.evaluate("""(() => { const cs = [...document.querySelectorAll('#cards .card')]; return { n: cs.length,
          psent: document.querySelectorAll('#passage .psent').length,
          ariaOk: cs.every(e => (e.getAttribute('aria-label') || '').length >= 2) }; })()""")
        hook_ok = q and all(k in q for k in ('passage', 'keyLine', 'question', 'options', 'answer', 'step', 'miss'))
        rec('R2 钩子契约+选项aria+短文句数', bool(hook_ok) and aria['n'] == 3 and aria['ariaOk'] and 2 <= aria['psent'] <= 4,
            'psent=%d opts=%d aria=%s' % (aria['psent'], aria['n'], aria['ariaOk']))
        clicks = 0
        for _ in range(8):
            if not await pg.evaluate('RD.quiz'):
                break
            await tap_right(pg)
            clicks += 1
            await wait_ready(pg)
        await pg.wait_for_timeout(3600)
        stars = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
        rec('R3 flat1 真实点击通关3★', stars == 3 and not errs, 'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
        await ctx.close()

        # R4 一错=2★ + keyLine flash 高亮（点错后 250ms 窗内查）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        kl = await pg.evaluate('RD.quiz.keyLine')
        a4 = (await pg.evaluate('RD.quiz'))['answer']
        await pg.evaluate('RD.tapOption(%d)' % next(i for i in range(3) if i != a4))
        await pg.wait_for_timeout(200)
        flash = await pg.evaluate("!!document.querySelector('.psent[data-i=\"%d\"].flash')" % kl)
        m4 = await pg.evaluate('RD.currentLevel.misses')
        for _ in range(8):
            if not await pg.evaluate('RD.quiz'):
                break
            await tap_right(pg)
            await wait_ready(pg)
        await pg.wait_for_timeout(3600)
        stars4 = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
        rec('R4 一错2★+关键句flash高亮', m4 == 1 and flash and stars4 == 2 and not errs,
            'm=%s flash=%s stars=%s errs=%s' % (m4, flash, stars4, errs[:1]))
        await ctx.close()

        # R6 教学链
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1500)
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(1000)
        sw, demo_r, sw_done = False, None, False
        for _ in range(80):
            t = await pg.evaluate('RD.tutorial')
            if t == 'watch' and not sw_done:
                st0 = await pg.evaluate('RD.quiz ? RD.quiz.step : -1')
                for _ in range(3):
                    await pg.evaluate('RD.tapOption(0)')
                st1 = await pg.evaluate('RD.quiz ? RD.quiz.step : -1')
                sw = st1 == st0
                sw_done = True
            demo_r = await pg.evaluate('window.__rdDemoR || null')
            if demo_r or t == 'help':
                break
            await pg.wait_for_timeout(400)
        if demo_r is None:
            demo_r = await pg.evaluate('window.__rdDemoR || null')
        rec('R6 教学 watch 吞输入+demoR', sw and demo_r == 'right' and not errs,
            'swallow=%s demoR=%s errs=%s' % (sw, demo_r, errs[:1]))
        await ctx.close()

        # R7 sayW 三态
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(HOOK)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await pg.evaluate(HOOK)
        for _ in range(2):
            await tap_wrong(pg)
            await wait_ready(pg)
        w1 = await pg.evaluate("window.__vlog.filter(x => x === 'P:rd_wrong').length")
        await pg.evaluate(seed(5))
        await pg.reload()
        await pg.wait_for_timeout(3200)
        await pg.evaluate(HOOK)
        for _ in range(3):
            await tap_wrong(pg)
            await wait_ready(pg)
        w2 = await pg.evaluate("window.__vlog.filter(x => x === 'P:rd_wrong').length")
        m7 = await pg.evaluate('RD.quiz.miss')
        rec('R7 sayW 三态(flat1 两错播2/flat5 首发+豁免2+第三错静默)', w1 == 2 and w2 == 2 and m7 == 3,
            'w1=%s w2=%s m=%s' % (w1, w2, m7))
        await ctx.close()

        # R8 救援错点不重置 | R9 听读重置
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await tap_wrong(pg)
        await wait_ready(pg)
        await pg.wait_for_timeout(8500)
        r0 = await pg.evaluate('RD.rescues')
        await pg.wait_for_timeout(5000)
        r1 = await pg.evaluate('RD.rescues')
        # 听读重置：换关后空 6s 再听读 → 13s 窗（查点 t=19s）：未重置钟起点=换关刻(t=14s 已触发)；重置起点=听读刻(t=20s 未触发)
        await pg.evaluate('RD.start(2)')
        await pg.wait_for_timeout(6000)
        rb = await pg.evaluate('RD.rescues')
        await pg.evaluate('RD.hearPassage()')
        await pg.wait_for_timeout(13000)
        r2 = await pg.evaluate('RD.rescues')
        rec('R8 救援错点不重置+14s触发', r0 == 0 and r1 >= 1 and not errs, 'r=%s→%s errs=%s' % (r0, r1, errs[:1]))
        rec('R9 听读重置救援钟(空6s+13s窗未触发)', r2 == rb, 'r=%s→%s' % (rb, r2))
        await ctx.close()

        # R10 双viewport+离线+clip | R12 ch3 选项 TTS 兜底
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1800)
        r10 = await pg.evaluate("""(() => {
          const cards = [...document.querySelectorAll('#cards .card')].map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); });
          const btns = [...document.querySelectorAll('button')].filter(x => !x.className.includes('k-parentbtn')).map(x => { const b = x.getBoundingClientRect(); return Math.min(b.width, b.height); }).filter(v => v > 0);
          return { minCard: Math.min(...cards), minBtn: Math.min(...btns), ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        vp2 = await b.new_context(viewport={'width': 800, 'height': 1180})
        pg2 = await vp2.new_page()
        await pg2.goto(URL)
        await pg2.wait_for_timeout(1800)
        r10b = await pg2.evaluate("""(() => {
          const cards = [...document.querySelectorAll('#cards .card')].map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); });
          return { minCard: Math.min(...cards), ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        html = (BASE / 'read' / 'index.html').read_text(encoding='utf-8')
        nclip = html.count('data:audio')
        offline = ('src="http' not in html) and ('href="http' not in html) and ('url(http' not in html)
        rec('R10 双viewport+触摸+离线+clip', r10['minCard'] >= 96 and r10['minBtn'] >= 64 and r10['ox'] == 0 and
            r10b['minCard'] >= 96 and r10b['ox'] == 0 and offline and nclip == 215 and not errs,
            'desk card=%s btn=%s ox=%s | pad card=%s ox=%s offline=%s clip=%s' % (r10['minCard'], r10['minBtn'], r10['ox'], r10b['minCard'], r10b['ox'], offline, nclip))
        # R12：ch3 选项 optKeys=null → 播放走 say（TTS 兜底）而非 play(null)
        await pg.evaluate(seed(10))
        await pg.reload()
        await pg.wait_for_timeout(2600)
        await pg.evaluate(HOOK)
        q3 = await pg.evaluate('RD.quiz')
        await pg.evaluate('RD.tapOption(%d)' % q3['answer'])
        await pg.wait_for_timeout(800)
        v12 = await pg.evaluate('window.__vlog')
        ok12 = q3['dch'] == 3 and any(k is None for k in q3['optKeys']) and \
            not any(x.endswith('|null') or x == 'P:null' or x == 'P:undefined' for x in v12)
        rec('R12 ch3 选项optKeys=null禁play(null)', ok12, 'dch=%s optKeys=%s vlog=%s' % (q3['dch'], q3['optKeys'], v12[:6]))
        await ctx.close()
        await vp2.close()

        # R11 flat10 ch3 + flat15 ch4 真实通关
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(10))
        await pg.reload()
        await pg.wait_for_timeout(2600)
        d10 = await pg.evaluate('RD.currentLevel.dch')
        for _ in range(8):
            if not await pg.evaluate('RD.quiz'):
                break
            await tap_right(pg)
            await wait_ready(pg)
        await pg.wait_for_timeout(3600)
        stars10 = await pg.evaluate("(KIDS._save().levels['3-0'] || {}).stars || 0")
        await pg.evaluate(seed(15))
        await pg.reload()
        await pg.wait_for_timeout(2600)
        d15 = await pg.evaluate('RD.currentLevel.dch')
        for _ in range(8):
            if not await pg.evaluate('RD.quiz'):
                break
            await tap_right(pg)
            await wait_ready(pg)
        await pg.wait_for_timeout(3600)
        stars15 = await pg.evaluate("(KIDS._save().levels['4-0'] || {}).stars || 0")
        rec('R11 flat10 ch3+flat15 ch4 通关', d10 == 3 and stars10 == 3 and d15 == 4 and stars15 == 3 and not errs,
            'ch3 d=%s stars=%s | ch4 d=%s stars=%s errs=%s' % (d10, stars10, d15, stars15, errs[:1]))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
