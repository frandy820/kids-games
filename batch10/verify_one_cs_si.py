# -*- coding: utf-8 -*-
"""batch10 复验 · chainsum + simon（不信任 agent 自报，全读实际产物）
chainsum：①verify ②真实通关 ③双viewport ④离线 ⑤截图 ⑥钩子 ⑦0err ⑧教学吞输入（审查m6：恒等=flat5 当前题抽查，全量由页面 verify 40 关 structWhy 覆盖）
  ⑨首错零惩罚+连错2 breathe ⑩sayW 灰化款三态+跨题静默 ⑪救援(动态TTS题面+正确卡breathe)+错点不重置
  ⑫语音 ⑬教学重玩门 16数学恒等(外部抽查 flat5/flat12)
simon：同基线 + 14 watch 吞输入+轻叮 + 9 错键重播(phase 回 watch) + 15 pos 推进 + 11 救援重播(rescues 计数)"""
import asyncio, io, json, os, re, sys
from playwright.async_api import async_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.abspath(__file__))
URL = {'chainsum': 'file:///' + os.path.join(BASE, 'chainsum', 'index.html').replace('\\', '/'),
       'simon': 'file:///' + os.path.join(BASE, 'simon', 'index.html').replace('\\', '/')}
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k + '#' + String(t || '').slice(0, 4)); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : p.key).join(',')); return _q(parts); };
  const _s = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _s(n); };
  const _y = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 6)); return _y(t); };
  return true;
})()"""

SEED_JS = """(n) => {
  const sv = KIDS._save();
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.__KEY__ = sv.__KEY__ || {}; sv.__KEY__.tutSeen = true;
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();
}"""

async def newpage(browser, game, vp={'width': 1280, 'height': 800}, verify=False):
    ctx = await browser.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL[game] + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(900)
    return ctx, pg, errs

async def seed(pg, key, n):
    await pg.evaluate(SEED_JS.replace('__KEY__', key), n)

async def wait_tut(pg):
    for _ in range(24):
        st = await pg.evaluate("!!(KIDS._save().__KEY__ && KIDS._save().__KEY__.tutSeen)".replace('__KEY__', 'x') if False else "true")
        break

# ============ chainsum ============
async def verify_chainsum(browser):
    G, K = 'chainsum', 'chainsum'
    # ① verify title + 单元
    ctx, pg, errs = await newpage(browser, G, verify=True)
    title = ''
    for _ in range(18):
        title = await pg.title()
        if 'VERIFY' in title: break
        await pg.wait_for_timeout(1000)
    rec('C1 verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title)
    await ctx.close()

    # ②⑥⑦⑯ 真实通关 flat1 + 数学恒等
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, K, 1); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    hk = await pg.evaluate("(() => ({ has: !!window.CS, quiz: typeof CS.quiz, tap: typeof CS.tapCard, auto: typeof CS.autoSolve }))()")
    rec('C6 钩子 CS 齐', hk['has'] and hk['quiz'] != 'undefined' and hk['tap'] == 'function', str(hk))
    # 16 数学恒等（当前题）：answer=cur±d / 干扰 |v-a|∈{1,2,d} / 互异非负
    mq = await pg.evaluate("(() => { const q = CS.quiz; return { cur: q.cur, op: q.op, d: q.d, a: q.answer, o: q.options }; })()")
    okm = (mq['a'] == mq['cur'] + mq['d'] if mq['op'] == '+' else mq['a'] == mq['cur'] - mq['d']) and \
          len(set(mq['o'])) == 3 and all(v >= 0 for v in mq['o']) and mq['a'] in mq['o'] and \
          all(abs(v - mq['a']) in (1, 2, mq['d']) for v in mq['o'] if v != mq['a'])
    rec('C16 数学恒等(cur±d/干扰|v-a|∈{1,2,d})', okm, str(mq))
    clicks, done = 0, False
    for step in range(30):
        st = await pg.evaluate("(() => { const q = CS.quiz; return q ? { ai: q.options.indexOf(q.answer), step: q.step, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 } : { saved: (KIDS._save().levels['1-1'] || {}).stars || 0, gone: true }; })()")
        if st.get('saved') or st.get('gone'): done = True; break
        await pg.locator('.cardbtn[data-i="%d"]' % st['ai']).click()
        clicks += 1
        for _ in range(8):
            await pg.wait_for_timeout(600)
            s2 = await pg.evaluate("(() => { const q = CS.quiz; return { step: q ? q.step : 99, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 }; })()")
            if s2['step'] != st['step'] or s2['saved']: break
            try: await pg.locator('.cardbtn[data-i="%d"]' % st['ai']).click(timeout=1200)
            except Exception: pass
    await pg.wait_for_timeout(5200)
    won = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
    rec('C2 真实点击通关 1-1', done and won >= 1, 'clicks=%d stars=%s' % (clicks, won))
    rec('C7 0 pageerror', not errs, str(errs[:1]))
    await ctx.close()

    # ⑨b+⑩ flat5：灰化款 错1播/错2豁免(miss封顶2)；错光后点对推进→新题错1静默
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, K, 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    q = await pg.evaluate("(() => { const q = CS.quiz; return { ai: q.options.indexOf(q.answer), n: q.options.length }; })()")
    wrongs = [i for i in range(q['n']) if i != q['ai']]
    for w in wrongs:
        await pg.locator('.cardbtn[data-i="%d"]' % w).click()
        await pg.wait_for_timeout(800)
    br = await pg.evaluate("(() => { const els = [...document.querySelectorAll('.cardbtn')]; return els.filter(e => e.classList.contains('breathe')).length; })()")
    v = await pg.evaluate('window.__vlog')
    wrongv = [x for x in v if x.startswith('P:null#再想')]
    rec('C9 连错2次 正确卡 breathe', br >= 1, 'breathe=%d' % br)
    rec('C10 sayW 两态(错1播/错2豁免)', len(wrongv) == 2, 'wrongv=%s' % [x[:14] for x in wrongv])
    # 跨题第三错静默：点对推进→新题错 1（10s 窗内 miss=1）
    ai2 = await pg.evaluate("(() => { const q = CS.quiz; return q ? q.options.indexOf(q.answer) : -1; })()")
    await pg.locator('.cardbtn[data-i="%d"]' % ai2).click()
    await pg.wait_for_timeout(2400)
    st3 = await pg.evaluate("(() => { const q = CS.quiz; return q ? { ai: q.options.indexOf(q.answer), miss: q.miss } : null; })()")
    ok3 = False
    if st3 and st3['miss'] == 0:
        w3 = 0 if st3['ai'] != 0 else 1
        await pg.locator('.cardbtn[data-i="%d"]' % w3).click()
        await pg.wait_for_timeout(800)
        v2 = await pg.evaluate('window.__vlog')
        wrongv2 = [x for x in v2 if x.startswith('P:null#再想')]
        ok3 = len(wrongv2) == 2
    rec('C10b 跨题第三错静默', ok3, 'st3=%s' % st3)
    await ctx.close()

    # ⑪ 救援（动态 TTS 题面+正确卡 breathe）+错点不重置
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, K, 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    ai = await pg.evaluate("(() => CS.quiz.options.indexOf(CS.quiz.answer))()")
    br0 = await pg.evaluate("(i) => document.querySelector('.cardbtn[data-i=\"' + i + '\"]').classList.contains('breathe')", ai)
    await pg.wait_for_timeout(16500)
    v = await pg.evaluate('window.__vlog')
    rescue = [x for x in v if x.startswith('T:') and '等于' in x or 'P:cs_hint' in x]
    br1 = await pg.evaluate("(i) => document.querySelector('.cardbtn[data-i=\"' + i + '\"]').classList.contains('breathe')", ai)
    rec('C11 静置16s 救援(TTS题面+正确卡breathe)', bool(rescue) and not br0 and br1, 'rescue=%s br %s->%s' % ([x[:14] for x in rescue[:1]], br0, br1))
    await ctx.close()
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, K, 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    await pg.wait_for_timeout(12000)
    w = await pg.evaluate("(() => { const q = CS.quiz; return q.options.findIndex((v, i) => v !== q.answer); })()")
    if w >= 0: await pg.locator('.cardbtn[data-i="%d"]' % w).click()
    await pg.wait_for_timeout(10000)
    v = await pg.evaluate('window.__vlog')
    res2 = [x for x in v if (x.startswith('T:') and '等于' in x) or 'P:cs_hint' in x]
    rec('C11b 错点不重置救援(22s 处已触发)', bool(res2) and not errs, 'rescue=%s' % [x[:16] for x in res2[:1]])
    await ctx.close()

    # ⑧⑬ 教学
    ctx, pg, errs = await newpage(browser, G)
    await pg.evaluate(HOOK)
    tut = await pg.evaluate('CS.tutorial')
    st0 = await pg.evaluate("CS.currentLevel && CS.currentLevel.step")
    bb = await pg.locator('.cardbtn').first.bounding_box()
    pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
    await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
    await pg.wait_for_timeout(500)
    pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
    st1 = await pg.evaluate("CS.currentLevel && CS.currentLevel.step")
    rec('C8 教学期真实点击被吞+轻叮', tut == 'watch' and st1 == st0 and pops1 > pops0, 'tut=%s step %s->%s pops+%d' % (tut, st0, st1, pops1 - pops0))
    await pg.locator('#btn-replay').dispatch_event('pointerdown')
    st = False
    for _ in range(16):
        await pg.wait_for_timeout(1000)
        st = await pg.evaluate("!!(KIDS._save().cs && KIDS._save().cs.tutSeen)")
        if st: break
    rec('C13 教学窗点重玩=教学照常完成', st and not errs, 'seen=%s' % st)
    await ctx.close()

    # ③④⑤⑫
    for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
        ctx, pg, errs = await newpage(browser, G, vp=vp)
        await seed(pg, K, 1); await pg.reload(); await pg.wait_for_timeout(900)
        ox = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        small = await pg.evaluate("""(() => { const out = [];
          document.querySelectorAll('button, .cardbtn').forEach(el => {
            if (el.classList.contains('k-parentbtn')) return;
            const r = el.getBoundingClientRect();
            if (r.width > 2 && r.height > 2 && (r.width < 64 || r.height < 64)) out.push(el.className + Math.round(r.width) + 'x' + Math.round(r.height));
          }); return out; })()""")
        rec('C3 viewport %dx%d overflowX=0+触摸≥64' % (vp['width'], vp['height']), ox == 0 and not small, 'ox=%s small=%s' % (ox, small[:2]))
        await ctx.close()
    src = open(os.path.join(BASE, G, 'index.html'), encoding='utf-8').read()
    bad = re.findall(r'(?:src|href)\s*=\s*["\']https?://[^"\']+', src)
    rec('C4 离线断言', not bad, str(bad[:2]))
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, K, 5); await pg.reload(); await pg.wait_for_timeout(1200)
    shot = os.path.join(BASE, '_v10_shot_cs.png')
    await pg.screenshot(path=shot)
    from PIL import Image
    import statistics
    im = Image.open(shot).convert('L').resize((160, 100))
    px = list(im.getdata())
    rec('C5 截图非空白', statistics.pstdev(px) > 8, 'stdev=%.1f' % statistics.pstdev(px))
    os.remove(shot)
    await ctx.close()
    mf = json.load(open(os.path.join(os.path.dirname(BASE), 'voice', 'clips', 'manifest.json'), encoding='utf-8'))
    keys = [k for k, v2 in mf.items() if G in v2['games']]
    n_audio = src.count('data:audio/mpeg;base64')
    rec('C12 语音注入对账', n_audio >= len(keys), 'audio=%d keys=%d' % (n_audio, len(keys)))

# ============ simon ============
async def verify_simon(browser):
    G, K = 'simon', 'simon'
    ctx, pg, errs = await newpage(browser, G, verify=True)
    title = ''
    for _ in range(18):
        title = await pg.title()
        if 'VERIFY' in title: break
        await pg.wait_for_timeout(1000)
    rec('S1 verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title)
    await ctx.close()

    # ②⑥⑦14⑮ 真实通关 flat1（watch 吞输入+轻叮 → input 逐 pad）
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, K, 1); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    hk = await pg.evaluate("(() => ({ has: !!window.SI, quiz: typeof SI.quiz, tap: typeof SI.tapPad, auto: typeof SI.autoSolve, skip: typeof SI.skipWatch, resc: typeof SI.rescues }))()")
    rec('S6 钩子 SI 齐', hk['has'] and hk['tap'] == 'function' and hk['skip'] == 'function', str(hk))
    # 14 watch 吞输入+轻叮
    ph = await pg.evaluate("SI.quiz && SI.quiz.phase")
    if ph == 'watch':
        r0 = await pg.evaluate("SI.tapPad(0)")
        pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        rec('S14 watch 期 tapPad=false+轻叮', r0 is False and pops0 >= 1, 'tap=%s pops=%d' % (r0, pops0))
    else:
        rec('S14 watch 期 tapPad=false+轻叮', False, 'phase=%s' % ph)
    # 15 pos 推进 + ② 通关
    clicks, done = 0, False
    for step in range(60):
        st = await pg.evaluate("(() => { const q = SI.quiz; return q ? { ph: q.phase, pos: q.pos, seq: q.seq, step: q.step, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 } : { saved: (KIDS._save().levels['1-1'] || {}).stars || 0, gone: true }; })()")
        if st.get('saved') or st.get('gone'): done = True; break
        if st['ph'] == 'input':
            await pg.locator('.pad[data-i="%d"]' % st['seq'][st['pos']]).click()
            clicks += 1
        await pg.wait_for_timeout(450)
    await pg.wait_for_timeout(5200)
    won = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
    rec('S2 真实通关 1-1(等watch演示)', done and won >= 1, 'clicks=%d stars=%s' % (clicks, won))
    rec('S7 0 pageerror', not errs, str(errs[:1]))
    await ctx.close()

    # 9 错键重播 + 10 sayW（===2 恰一次豁免；重播 si_replay）
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, K, 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    for _ in range(16):
        ph = await pg.evaluate("SI.quiz && SI.quiz.phase")
        if ph == 'input': break
        await pg.wait_for_timeout(500)
    q = await pg.evaluate("SI.quiz")
    wrongpad = (q['seq'][q['pos']] + 1) % 4
    wig0 = await pg.evaluate("SI.quiz.pos")
    await pg.locator('.pad[data-i="%d"]' % wrongpad).click()
    await pg.wait_for_timeout(1200)
    stw = await pg.evaluate("(() => { const q = SI.quiz; return { ph: q.phase, pos: q.pos, miss: q.miss }; })()")
    wig = await pg.evaluate("[...document.querySelectorAll('.pad')].some(e => e.classList.contains('wig'))")
    v = await pg.evaluate('window.__vlog')
    wrongv = [x for x in v if x.startswith('P:si_wrong')]
    rec('S9 错键 wig+重播(phase回watch,首锤错pos仍0)', wig and stw['ph'] == 'watch' and stw['pos'] == 0 and stw['miss'] == 1,
        'wig=%s ph=%s pos=%s miss=%s' % (wig, stw['ph'], stw['pos'], stw['miss']))
    rec('S10 sayW 错1播', len(wrongv) == 1, 'wrongv=%s' % wrongv)
    # 等 watch 完→input 第二次错（miss=2 豁免播）
    for _ in range(20):
        ph = await pg.evaluate("SI.quiz && SI.quiz.phase")
        if ph == 'input': break
        await pg.wait_for_timeout(600)
    q2 = await pg.evaluate("SI.quiz")
    wp2 = (q2['seq'][q2['pos']] + 1) % 4
    await pg.locator('.pad[data-i="%d"]' % wp2).click()
    await pg.wait_for_timeout(1200)
    v2 = await pg.evaluate('window.__vlog')
    wrongv2 = [x for x in v2 if x.startswith('P:si_wrong')]
    rep = [x for x in v2 if 'P:si_replay' in x or 'Q:si_replay' in x]
    rec('S10b 错2豁免恰一次(两错=2条)+重播si_replay', len(wrongv2) == 2 and bool(rep), 'wrong=%d replay=%s' % (len(wrongv2), [x[:12] for x in rep[:1]]))
    # m4：第三错（miss=3）静默——豁免恰一次的 ===2 另一臂
    for _ in range(20):
        ph = await pg.evaluate("SI.quiz && SI.quiz.phase")
        if ph == 'input': break
        await pg.wait_for_timeout(600)
    q3 = await pg.evaluate("SI.quiz")
    wp3 = (q3['seq'][q3['pos']] + 1) % 4
    await pg.locator('.pad[data-i="%d"]' % wp3).click()
    await pg.wait_for_timeout(1200)
    v3 = await pg.evaluate('window.__vlog')
    wrongv3 = [x for x in v3 if x.startswith('P:si_wrong')]
    rec('S10c 第三错静默(miss=3 豁免恰一次)', len(wrongv3) == 2, 'total=%d' % len(wrongv3))
    await ctx.close()

    # 11 救援（input 期静置 14s：rescues+1+si_hint+phase 回 watch；错点不重置）
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, K, 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    for _ in range(16):
        ph = await pg.evaluate("SI.quiz && SI.quiz.phase")
        if ph == 'input': break
        await pg.wait_for_timeout(500)
    # m5：先敲对 1 键 pos=1，救援重播后 pos 应保留（与错键清零语义相反）
    q0 = await pg.evaluate("SI.quiz")
    await pg.locator('.pad[data-i="%d"]' % q0['seq'][q0['pos']]).click()
    await pg.wait_for_timeout(400)
    pos0 = await pg.evaluate("SI.quiz.pos")
    r0 = await pg.evaluate("SI.rescues")
    ph0 = await pg.evaluate("SI.quiz.phase")
    await pg.wait_for_timeout(16500)
    r1 = await pg.evaluate("SI.rescues")
    ph1 = await pg.evaluate("SI.quiz && SI.quiz.phase")
    pos1 = None
    for _ in range(14):                            # 等重播完回 input 再读 pos
        phx = await pg.evaluate("SI.quiz && SI.quiz.phase")
        if phx == 'input': pos1 = await pg.evaluate("SI.quiz.pos"); break
        await pg.wait_for_timeout(500)
    v = await pg.evaluate('window.__vlog')
    hint = [x for x in v if 'si_hint' in x]
    rec('S11 静置16s 救援重播(rescues+1+si_hint+pos保留)', r1 == r0 + 1 and ph0 == 'input' and ph1 and bool(hint) and pos0 == 1 and pos1 == 1,
        'rescues %s->%s ph %s->%s pos %s->%s' % (r0, r1, ph0, ph1, pos0, pos1))
    await ctx.close()
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, K, 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    for _ in range(16):
        ph = await pg.evaluate("SI.quiz && SI.quiz.phase")
        if ph == 'input': break
        await pg.wait_for_timeout(500)
    await pg.wait_for_timeout(12000)
    q = await pg.evaluate("SI.quiz")
    wrongpad = (q['seq'][q['pos']] + 1) % 4
    await pg.locator('.pad[data-i="%d"]' % wrongpad).click()
    await pg.wait_for_timeout(11000)
    r1 = await pg.evaluate("SI.rescues")
    rec('S11b 错点不重置救援(23s 处已触发)', r1 >= 1 and not errs, 'rescues=%s' % r1)
    await ctx.close()

    # 8 13 教学
    ctx, pg, errs = await newpage(browser, G)
    tut = await pg.evaluate('SI.tutorial')
    st0 = await pg.evaluate("SI.currentLevel && SI.currentLevel.step")
    bb = await pg.locator('.pad').first.bounding_box()
    await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
    await pg.wait_for_timeout(500)
    st1 = await pg.evaluate("SI.currentLevel && SI.currentLevel.step")
    rec('S8 教学期真实点击被吞', tut == 'watch' and st1 == st0, 'tut=%s step %s->%s' % (tut, st0, st1))
    await pg.locator('#btn-replay').dispatch_event('pointerdown')
    st = False
    for _ in range(16):
        await pg.wait_for_timeout(1000)
        st = await pg.evaluate("!!(KIDS._save().simon && KIDS._save().simon.tutSeen)")
        if st: break
    rec('S13 教学窗点重玩=教学照常完成', st and not errs, 'seen=%s' % st)
    await ctx.close()

    # 3 4 5 12
    for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
        ctx, pg, errs = await newpage(browser, G, vp=vp)
        await seed(pg, K, 1); await pg.reload(); await pg.wait_for_timeout(900)
        ox = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        small = await pg.evaluate("""(() => { const out = [];
          document.querySelectorAll('button, .pad').forEach(el => {
            if (el.classList.contains('k-parentbtn')) return;
            const r = el.getBoundingClientRect();
            if (r.width > 2 && r.height > 2 && (r.width < 64 || r.height < 64)) out.push(el.className + Math.round(r.width) + 'x' + Math.round(r.height));
          }); return out; })()""")
        rec('S3 viewport %dx%d overflowX=0+触摸≥64' % (vp['width'], vp['height']), ox == 0 and not small, 'ox=%s small=%s' % (ox, small[:2]))
        await ctx.close()
    src = open(os.path.join(BASE, G, 'index.html'), encoding='utf-8').read()
    bad = re.findall(r'(?:src|href)\s*=\s*["\']https?://[^"\']+', src)
    rec('S4 离线断言', not bad, str(bad[:2]))
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, K, 5); await pg.reload(); await pg.wait_for_timeout(1200)
    shot = os.path.join(BASE, '_v10_shot_si.png')
    await pg.screenshot(path=shot)
    from PIL import Image
    import statistics
    im = Image.open(shot).convert('L').resize((160, 100))
    px = list(im.getdata())
    rec('S5 截图非空白', statistics.pstdev(px) > 8, 'stdev=%.1f' % statistics.pstdev(px))
    os.remove(shot)
    await ctx.close()
    mf = json.load(open(os.path.join(os.path.dirname(BASE), 'voice', 'clips', 'manifest.json'), encoding='utf-8'))
    keys = [k for k, v2 in mf.items() if G in v2['games']]
    n_audio = src.count('data:audio/mpeg;base64')
    rec('S12 语音注入对账', n_audio >= len(keys), 'audio=%d keys=%d' % (n_audio, len(keys)))

async def main():
    only = sys.argv[1:] or ['chainsum', 'simon']
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        if 'chainsum' in only: await verify_chainsum(browser)
        if 'simon' in only: await verify_simon(browser)
        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
