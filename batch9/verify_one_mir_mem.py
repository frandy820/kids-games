# -*- coding: utf-8 -*-
"""batch9 复验 · mirror + memgrid（不信任 agent 自报，全读实际产物）
①verify title ②真实点击通关 ③双 viewport+触摸目标 ④离线 ⑤截图非空白 ⑥钩子
⑦0 pageerror ⑧教学吞输入 ⑨首错零惩罚+连错2 pulse ⑩sayW 节流+豁免恰一次
⑪救援钟 12语音对账 13教学窗重玩门｜memgrid 特有 14 show 期吞输入｜mirror 特有 15 dst 镜像坐标"""
import asyncio, json, os, re, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = {'mirror': 'file:///' + os.path.join(BASE, 'mirror', 'index.html').replace('\\', '/'),
       'memgrid': 'file:///' + os.path.join(BASE, 'memgrid', 'index.html').replace('\\', '/')}
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('K:' + k); return _p(k, t); };
  const _s = KIDS.speak.bind(KIDS);
  KIDS.speak = t => { window.__vlog.push('TTS:' + t); return _s(t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : p.key).join(',')); return _q(parts); };
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

async def seed(pg, key, flats):
    await pg.evaluate(SEED_JS.replace('__KEY__', key), flats)

# ============ mirror ============
async def verify_mirror(browser):
    G = 'mirror'
    # ① verify title
    ctx, pg, errs = await newpage(browser, G, verify=True)
    title = ''
    for _ in range(18):
        title = await pg.title()
        if 'VERIFY' in title: break
        await pg.wait_for_timeout(1000)
    rec('M① verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title)
    # 15 dst 镜像坐标抽查（读 verify-result）
    r = await pg.evaluate("JSON.parse(document.getElementById('verify-result').textContent)")
    lv1 = (r.get('levels') or {}).get('1-1') or {}
    rec('M15 verify 含镜像坐标断言(抽查 lv 结构)', 'qs' in lv1 or 'ok' in lv1, str(lv1)[:60])
    await ctx.close()

    # ②⑥⑦⑨ 真实通关 flat1
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, 'mir', 1); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    hk = await pg.evaluate("(() => ({ has: !!window.MIR, lvl: typeof MIR.currentLevel, quiz: typeof MIR.quiz, tap: typeof MIR.tapOption, auto: typeof MIR.autoSolve }))()")
    rec('M⑥ 钩子 MIR 齐', hk['has'] and hk['quiz'] != 'undefined' and hk['tap'] == 'function' and hk['auto'] == 'function', str(hk))
    q0 = await pg.evaluate("(() => { const q = MIR.quiz; const a = q.answer; return { ai: q.options.findIndex(o => o.mid === a.mid && o.color === a.color && o.mirrored === a.mirrored), n: q.options.length }; })()")
    await pg.locator('button.opt').nth(0 if q0['ai'] != 0 else 1).click()
    await pg.wait_for_timeout(700)
    st = await pg.evaluate("(() => { const els = [...document.querySelectorAll('button.opt')]; return { wrong: els.filter(e => e.classList.contains('wrong')).length, br: els.filter(e => e.classList.contains('pulse')).length }; })()")
    rec('M9 first-wrong no-pulse', st['wrong'] >= 1 and st['br'] == 0, str(st))
    clicks, done = 1, False
    for step in range(16):
        st = await pg.evaluate("(() => { const q = MIR.quiz; if (!q) return { ai: -1, step: 99, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 }; const a = q.answer; return { ai: q.options.findIndex(o => o.mid === a.mid && o.color === a.color && o.mirrored === a.mirrored), step: q.step, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 }; })()")
        if st['saved'] or st['ai'] < 0: done = True; break
        await pg.locator('button.opt').nth(st['ai']).click()
        clicks += 1
        for _ in range(10):
            await pg.wait_for_timeout(600)
            s2 = await pg.evaluate("(() => { const q = MIR.quiz; return { step: q ? q.step : 99, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 }; })()")
            if s2['step'] != st['step'] or s2['saved']: break
            if _ >= 1:
                try: await pg.locator('button.opt').nth(st['ai']).click(timeout=1500)
                except Exception: pass
    await pg.wait_for_timeout(5200)
    won = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
    rec('M② 真实点击通关 flat1', done and won >= 1, 'clicks=%d stars=%s' % (clicks, won))
    rec('M⑦ 0 pageerror', not errs, str(errs[:1]))
    await ctx.close()

    # ⑨b 连错2 pulse + ⑩ sayW（flat5=ch2 3 选：错1 播/错2 豁免=2 条；灰化后跨题新错静默）
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, 'mir', 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    q = await pg.evaluate("(() => { const q = MIR.quiz; const a = q.answer; return { ai: q.options.findIndex(o => o.mid === a.mid && o.color === a.color && o.mirrored === a.mirrored), n: q.options.length }; })()")
    wrongs = [i for i in range(q['n']) if i != q['ai']]
    await pg.locator('button.opt').nth(wrongs[0]).click()
    await pg.wait_for_timeout(800)
    await pg.locator('button.opt').nth(wrongs[1]).click()
    await pg.wait_for_timeout(800)
    br = await pg.evaluate("[...document.querySelectorAll('button.opt')].filter(e => e.classList.contains('pulse')).length")
    v = await pg.evaluate('window.__vlog')
    wrongv = [x for x in v if x.startswith('K:mir_wrong')]
    rec('M⑨b 连错2次 pulse', br >= 1, 'breathe=%d' % br)
    rec('M⑩ sayW 两态(错1播/错2豁免)', len(wrongv) == 2, 'wrongv=%s' % [x[:16] for x in wrongv])
    # 跨题第三错静默：点对推进→新题错 1（10s 窗内 miss=1）
    st2 = await pg.evaluate("(() => { const q = MIR.quiz; const a = q.answer; return q.options.findIndex(o => o.mid === a.mid && o.color === a.color && o.mirrored === a.mirrored); })()")
    await pg.locator('button.opt').nth(st2).click()
    await pg.wait_for_timeout(2400)
    st3 = await pg.evaluate("(() => { const q = MIR.quiz; if (!q) return -1; const a = q.answer; return q.options.findIndex(o => o.mid === a.mid && o.color === a.color && o.mirrored === a.mirrored); })()")
    if st3 >= 0:
        w3 = 0 if st3 != 0 else 1
        await pg.locator('button.opt').nth(w3).click()
        await pg.wait_for_timeout(800)
        v2 = await pg.evaluate('window.__vlog')
        wrongv2 = [x for x in v2 if x.startswith('K:mir_wrong')]
        rec('M⑩b 跨题第三错静默', len(wrongv2) == 2, 'total=%d' % len(wrongv2))
    else:
        rec('M⑩b 跨题第三错静默', False, 'quiz gone')
    await ctx.close()

    # ⑪ 救援（静置臂）+ ⑧13 教学
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, 'mir', 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    await pg.wait_for_timeout(16500)
    v = await pg.evaluate('window.__vlog')
    rescue = [x for x in v if x.startswith('K:mir_q') or x.startswith('TTS:')]
    rec('M11 静置16s 救援触发', bool(rescue) and not errs, 'rescue=%s' % [x[:22] for x in rescue[:2]])
    await ctx.close()
    # ⑪b 错点不重置（审查m4）：静置 12s→错点 1 次→再等 10s（总 22s）。若错点重置计时须 12+15=27s 才触发=此处应无救援
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, 'mir', 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    await pg.wait_for_timeout(12000)
    ai = await pg.evaluate("(() => { const q = MIR.quiz; if (!q) return -1; const a = q.answer; return q.options.findIndex(o => o.mid === a.mid && o.color === a.color && o.mirrored === a.mirrored); })()")
    if ai >= 0:
        await pg.locator('button.opt').nth(0 if ai != 0 else 1).click()
        await pg.wait_for_timeout(10000)
        v2 = await pg.evaluate('window.__vlog')
        res2 = [x for x in v2 if x.startswith('K:mir_q') or x.startswith('TTS:')]
        rec('M11b 错点不重置救援(22s 处已触发)', bool(res2) and not errs, 'rescue=%s' % [x[:22] for x in res2[:2]])
    else:
        rec('M11b 错点不重置救援(22s 处已触发)', False, 'quiz gone')
    await ctx.close()
    ctx, pg, errs = await newpage(browser, G)
    tut = await pg.evaluate('MIR.tutorial')
    st0 = await pg.evaluate("(() => MIR.currentLevel && MIR.currentLevel.step)()")
    bb = await pg.locator('button.opt').first.bounding_box()
    await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
    await pg.wait_for_timeout(500)
    st1 = await pg.evaluate("(() => MIR.currentLevel && MIR.currentLevel.step)()")
    rec('M⑧ 教学期真实点击被吞', tut == 'watch' and st1 == st0, 'tut=%s step %s->%s' % (tut, st0, st1))
    await pg.locator('#btn-replay').dispatch_event('pointerdown')
    await pg.wait_for_timeout(9000)
    st = await pg.evaluate("!!(KIDS._save().mir && KIDS._save().mir.tutSeen)")
    rec('M13 教学窗点重玩=教学照常完成', st and not errs, 'seen=%s errs=%s' % (st, errs[:1]))
    await ctx.close()

    # ③④⑤ 12
    for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
        ctx, pg, errs = await newpage(browser, G, vp=vp)
        await seed(pg, 'mir', 1); await pg.reload(); await pg.wait_for_timeout(900)
        ox = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        small = await pg.evaluate("""(() => {
          const out = [];
          document.querySelectorAll('button').forEach(el => {
            if (el.classList.contains('k-parentbtn')) return;
            const r = el.getBoundingClientRect();
            if (r.width > 2 && r.height > 2 && (r.width < 64 || r.height < 64)) out.push(el.className + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
          });
          return out;
        })()""")
        rec('M③ viewport %dx%d overflowX=0+触摸≥64' % (vp['width'], vp['height']), ox == 0 and not small, 'ox=%s small=%s' % (ox, small[:2]))
        await ctx.close()
    src = open(os.path.join(BASE, 'mirror', 'index.html'), encoding='utf-8').read()
    bad = re.findall(r'(?:src|href)\s*=\s*["\']https?://[^"\']+', src)
    rec('M④ 离线断言', not bad and 'http://' not in src.replace('http://www.w3.org', ''), str(bad[:2]))
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, 'mir', 5); await pg.reload(); await pg.wait_for_timeout(1200)
    shot = os.path.join(BASE, '_v9_shot_mir.png')
    await pg.screenshot(path=shot)
    from PIL import Image
    import statistics
    im = Image.open(shot).convert('L').resize((160, 100))
    px = list(im.getdata())
    rec('M⑤ 截图非空白', statistics.pstdev(px) > 8, 'stdev=%.1f' % statistics.pstdev(px))
    os.remove(shot)
    await ctx.close()
    mf = json.load(open(os.path.join(os.path.dirname(BASE), 'voice', 'clips', 'manifest.json'), encoding='utf-8'))
    keys = [k for k, v2 in mf.items() if 'mirror' in v2['games']]
    n_audio = src.count('data:audio/mpeg;base64')  # 审查M1：key 名在 VOICE 表恒出现使 missing 判据 vacuous，主判据=data:audio 实嵌计数
    missing = [k for k in keys if src.count(k) == 0]
    rec('M12 语音注入对账', n_audio >= len(keys) and not missing, 'audio=%d keys=%d missing=%s' % (n_audio, len(keys), missing[:3]))

# ============ memgrid ============
async def verify_memgrid(browser):
    G = 'memgrid'
    CELL = '.cell[data-i="%d"]'
    ctx, pg, errs = await newpage(browser, G, verify=True)
    title = ''
    for _ in range(18):
        title = await pg.title()
        if 'VERIFY' in title: break
        await pg.wait_for_timeout(1000)
    rec('G① verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title)
    await ctx.close()

    # ②⑥⑦14 真实通关 flat1（等 show→input 逐格点；show 期 tapCell=false）
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, 'mg', 1); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    hk = await pg.evaluate("(() => ({ has: !!window.MEMG, quiz: typeof MEMG.quiz, tap: typeof MEMG.tapCell, auto: typeof MEMG.autoSolve, skip: typeof MEMG.skipShow }))()")
    rec('G⑥ 钩子 MEMG 齐', hk['has'] and hk['quiz'] != 'undefined' and hk['tap'] == 'function' and hk['auto'] == 'function', str(hk))
    # 14 show 期吞输入：第一题 show 窗内点格零响应
    ph = await pg.evaluate("MEMG.quiz && MEMG.quiz.phase")
    if ph == 'show':
        c = await pg.evaluate("MEMG.quiz.cells[0]")
        r0 = await pg.evaluate("MEMG.tapCell(%d)" % c)
        rec('G14 show 期 tapCell=false 吞输入', r0 is False, 'tapCell=%s' % r0)
    else:
        rec('G14 show 期 tapCell=false 吞输入', False, 'phase=%s(未捕获 show 窗)' % ph)
    # ⑨ input 期首错（点非记忆格）
    for _ in range(10):
        ph = await pg.evaluate("MEMG.quiz && MEMG.quiz.phase")
        if ph == 'input': break
        await pg.wait_for_timeout(600)
    q = await pg.evaluate("MEMG.quiz")
    notcell = next(i for i in range(q['N'] * q['N']) if i not in q['cells'])
    await pg.locator(CELL % notcell).click()
    await pg.wait_for_timeout(700)
    st = await pg.evaluate("(() => { const els = [...document.querySelectorAll('.cell')]; return { bad: els.filter(e => e.classList.contains('bad')).length, br: els.filter(e => e.classList.contains('pulse')).length, miss: MEMG.quiz.miss }; })()")
    rec('G9 first-wrong bad-no-pulse', st['bad'] >= 1 and st['br'] == 0 and st['miss'] == 1, str(st))
    # 真实通关 flat1：自适应轮询（phase=input 时点未点的 cell；过题等下一题 show）
    clicks = 1
    done = False
    for step in range(60):
        st = await pg.evaluate("(() => { const q = MEMG.quiz; return q ? { ph: q.phase, cells: q.cells, picked: q.picked, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 } : { saved: (KIDS._save().levels['1-1'] || {}).stars || 0, gone: true }; })()")
        if st.get('saved') or st.get('gone'): done = True; break
        if st['ph'] == 'input':
            todo = [c for c in st['cells'] if c not in st['picked']]
            if not todo:
                await pg.wait_for_timeout(700); continue
            await pg.locator(CELL % todo[0]).click()
            clicks += 1
        await pg.wait_for_timeout(500)
    await pg.wait_for_timeout(5200)
    won = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
    rec('G② 真实通关 flat1(含等闪现)', done and won >= 1, 'clicks=%d stars=%s' % (clicks, won))
    rec('G⑦ 0 pageerror', not errs, str(errs[:1]))
    await ctx.close()

    # ⑨b+⑩ flat5：input 期连错 2 次（两个不同非记忆格）pulse+豁免；第 3 错（再一个非记忆格）静默
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, 'mg', 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    for _ in range(12):
        ph = await pg.evaluate("MEMG.quiz && MEMG.quiz.phase")
        if ph == 'input': break
        await pg.wait_for_timeout(500)
    q = await pg.evaluate("MEMG.quiz")
    nots = [i for i in range(q['N'] * q['N']) if i not in q['cells']][:3]
    for n in nots[:2]:
        await pg.locator(CELL % n).click()
        await pg.wait_for_timeout(800)
    br = await pg.evaluate("[...document.querySelectorAll('.cell')].filter(e => e.classList.contains('pulse')).length")
    await pg.locator(CELL % nots[2]).click()
    await pg.wait_for_timeout(800)
    v = await pg.evaluate('window.__vlog')
    wrongv = [x for x in v if x.startswith('K:mg_wrong')]
    rec('G⑨b 连错2次 pulse', br >= 1, 'breathe=%d' % br)
    rec('G⑩ sayW 三态(错1播/错2豁免/错3静默)', len(wrongv) == 2, 'wrongv=%s' % [x[:14] for x in wrongv])
    await ctx.close()

    # ⑪ 救援（静置臂：重闪+mg_q）
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, 'mg', 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    for _ in range(12):
        ph = await pg.evaluate("MEMG.quiz && MEMG.quiz.phase")
        if ph == 'input': break
        await pg.wait_for_timeout(500)
    await pg.wait_for_timeout(16500)
    v = await pg.evaluate('window.__vlog')
    rescue = [x for x in v if x.startswith('K:mg_q') or x.startswith('K:mg_hint')]
    rec('G11 静置16s 救援触发(重闪+mg_q)', bool(rescue) and not errs, 'rescue=%s' % [x[:20] for x in rescue[:2]])
    await ctx.close()
    # ⑪b 错点不重置（审查m4）：input 期静置 12s→点错格→再等 10s（总 22s）
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, 'mg', 5); await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    for _ in range(12):
        ph = await pg.evaluate("MEMG.quiz && MEMG.quiz.phase")
        if ph == 'input': break
        await pg.wait_for_timeout(500)
    await pg.wait_for_timeout(12000)
    q = await pg.evaluate("MEMG.quiz")
    nc = next((i for i in range(q['N'] * q['N']) if i not in q['cells']), None)
    if nc is not None:
        await pg.locator(CELL % nc).click()
        await pg.wait_for_timeout(10000)
        v2 = await pg.evaluate('window.__vlog')
        res2 = [x for x in v2 if x.startswith('K:mg_q') or x.startswith('K:mg_hint')]
        rec('G11b 错点不重置救援(22s 处已触发)', bool(res2) and not errs, 'rescue=%s' % [x[:20] for x in res2[:2]])
    else:
        rec('G11b 错点不重置救援(22s 处已触发)', False, '无非记忆格')
    await ctx.close()

    # ⑧13 教学（show 期 locked/演示吞输入；重玩门）
    ctx, pg, errs = await newpage(browser, G)
    tut = await pg.evaluate('MEMG.tutorial')
    st0 = await pg.evaluate("(() => MEMG.currentLevel && MEMG.currentLevel.step)()")
    bb = await pg.locator('.cell').first.bounding_box()
    await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
    await pg.wait_for_timeout(500)
    st1 = await pg.evaluate("(() => MEMG.currentLevel && MEMG.currentLevel.step)()")
    rec('G⑧ 教学期真实点击被吞', tut == 'watch' and st1 == st0, 'tut=%s step %s->%s' % (tut, st0, st1))
    await pg.locator('#btn-replay').dispatch_event('pointerdown')
    st = False
    for _ in range(16):
        await pg.wait_for_timeout(1000)
        st = await pg.evaluate("!!(KIDS._save().memg && KIDS._save().memg.tutSeen)")
        if st: break
    rec('G13 教学窗点重玩=教学照常完成', st and not errs, 'seen=%s errs=%s' % (st, errs[:1]))
    await ctx.close()

    # ③④⑤ 12
    for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
        ctx, pg, errs = await newpage(browser, G, vp=vp)
        await seed(pg, 'mg', 1); await pg.reload(); await pg.wait_for_timeout(900)
        ox = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        small = await pg.evaluate("""(() => {
          const out = [];
          document.querySelectorAll('button').forEach(el => {
            if (el.classList.contains('k-parentbtn')) return;
            const r = el.getBoundingClientRect();
            if (r.width > 2 && r.height > 2 && (r.width < 64 || r.height < 64)) out.push(el.className + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
          });
          return out;
        })()""")
        rec('G③ viewport %dx%d overflowX=0+触摸≥64' % (vp['width'], vp['height']), ox == 0 and not small, 'ox=%s small=%s' % (ox, small[:2]))
        await ctx.close()
    src = open(os.path.join(BASE, 'memgrid', 'index.html'), encoding='utf-8').read()
    bad = re.findall(r'(?:src|href)\s*=\s*["\']https?://[^"\']+', src)
    rec('G④ 离线断言', not bad and 'http://' not in src.replace('http://www.w3.org', ''), str(bad[:2]))
    ctx, pg, errs = await newpage(browser, G)
    await seed(pg, 'mg', 5); await pg.reload(); await pg.wait_for_timeout(1200)
    shot = os.path.join(BASE, '_v9_shot_mg.png')
    await pg.screenshot(path=shot)
    from PIL import Image
    import statistics
    im = Image.open(shot).convert('L').resize((160, 100))
    px = list(im.getdata())
    rec('G⑤ 截图非空白', statistics.pstdev(px) > 8, 'stdev=%.1f' % statistics.pstdev(px))
    os.remove(shot)
    await ctx.close()
    mf = json.load(open(os.path.join(os.path.dirname(BASE), 'voice', 'clips', 'manifest.json'), encoding='utf-8'))
    keys = [k for k, v2 in mf.items() if 'memgrid' in v2['games']]
    n_audio = src.count('data:audio/mpeg;base64')  # 审查M1：主判据=data:audio 实嵌计数（missing 判据 vacuous 仅留作辅）
    missing = [k for k in keys if src.count(k) == 0]
    rec('G12 语音注入对账', n_audio >= len(keys) and not missing, 'audio=%d keys=%d missing=%s' % (n_audio, len(keys), missing[:3]))

async def main():
    only = sys.argv[1:] or ['mirror', 'memgrid']
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        if 'mirror' in only: await verify_mirror(browser)
        if 'memgrid' in only: await verify_memgrid(browser)
        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
