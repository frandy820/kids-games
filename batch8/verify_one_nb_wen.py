# -*- coding: utf-8 -*-
"""batch8 复验 · neighbors + worden（首单元 picto 已 18/18 过闸放行）
18 项同 picto 口径 + 款差异项：neighbors 数学断言(answer=n±1/mid 两邻)；
worden sound2pic 开题自动播 en clip + replay() 钩子"""
import asyncio, json, os, re, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('K:' + k); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = (a) => { window.__vlog.push('Q:' + (a && a.map ? a.map(x => typeof x === 'string' ? x : x.key).join(',') : String(a))); return _q(a); };
  const _s = KIDS.speak.bind(KIDS);
  KIDS.speak = t => { window.__vlog.push('TTS:' + t); return _s(t); };
  return true;
})()"""

CFG = {
    'neighbors': dict(key='neb', hk='NEB', skey='neb', sel='button.platebtn', star_lv='1-1',
                      qidx="(() => { const q = NEB.quiz; return q.options.indexOf(q.answer); })()"),
    'worden': dict(key='wen', hk='WEN', skey='wen', sel='button.opt', star_lv='1-1',
                   qidx="(() => { const q = WEN.quiz; return q.options.indexOf(q.target); })()"),
}

async def newpage(browser, game, vp={'width': 1280, 'height': 800}, verify=False):
    ctx = await browser.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    url = 'file:///' + os.path.join(BASE, game, 'index.html').replace('\\', '/') + ('?verify=1' if verify else '')
    await pg.goto(url)
    await pg.wait_for_timeout(900)
    return ctx, pg, errs

async def seed(pg, flats, key):
    await pg.evaluate("""(a) => {
      const sv = KIDS._save();
      for (let i = 0; i < a[0]; i++) sv.levels[(Math.floor(i / 5) + 1) + '-' + (i %% 5)] = {stars: 3};
      sv.%s = sv.%s || {}; sv.%s.tutSeen = true;
      if (a[0] >= 10) KIDS.calendar.bonusSet(10);
      KIDS.store.persist();
    }""" % (key, key, key), (flats,))

async def clearsave(ctx):
    await ctx.clear_cookies()

async def run_game(browser, game):
    c = CFG[game]
    tag = game

    # ① verify title
    ctx, pg, errs = await newpage(browser, game, verify=True)
    title = ''
    for _ in range(18):
        title = await pg.title()
        if 'VERIFY' in title: break
        await pg.wait_for_timeout(1000)
    rec('%s 1 verify title' % tag, 'VERIFY PASS' in title and 'FAIL' not in title, title)
    await ctx.close()

    # ② 真实通关 flat1 + ⑥ 钩子 + ⑦ + ⑨ 首错
    ctx, pg, errs = await newpage(browser, game)
    await seed(pg, 1, c['key'])
    await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    hk = await pg.evaluate("(() => { const H = window.%s; return { has: !!H, lvl: typeof H.currentLevel, quiz: typeof H.quiz, tap: typeof H.tapOption, auto: typeof H.autoSolve }; })()" % c['hk'])
    rec('%s 6 钩子齐' % tag, hk['has'] and hk['lvl'] != 'undefined' and hk['quiz'] != 'undefined' and hk['tap'] == 'function' and hk['auto'] == 'function', str(hk))
    sel = c['sel']
    ai0 = await pg.evaluate(c['qidx'])
    wi = 0 if ai0 != 0 else 1
    await pg.locator(sel).nth(wi).click()
    await pg.wait_for_timeout(800)
    st = await pg.evaluate("""(s) => { const els = [...document.querySelectorAll(s)]; return { dim: els.filter(e => e.className.indexOf('dim') >= 0 || e.className.indexOf('wrong') >= 0 || e.className.indexOf('grey') >= 0).length, br: els.filter(e => e.className.indexOf('breathe') >= 0 || e.className.indexOf('pulse') >= 0).length }; }""", sel)
    rec('%s 9 首错零惩罚不 pulse' % tag, st['dim'] >= 1 and st['br'] == 0, str(st))
    clicks = 1
    done = False
    for step in range(14):
        stq = await pg.evaluate("(() => { const q = %s.quiz; return { q: q, saved: (KIDS._save().levels['%s'] || {}).stars || 0 }; })()" % (c['hk'], c['star_lv']))
        if stq['saved'] or not stq['q']: done = True; break
        ai = await pg.evaluate(c['qidx'])
        await pg.locator(sel).nth(ai).click()
        clicks += 1
        stp0 = stq['q'].get('step', 0)
        for _ in range(10):
            await pg.wait_for_timeout(700)
            s2 = await pg.evaluate("(() => ({ step: %s.quiz ? %s.quiz.step : 99, saved: (KIDS._save().levels['%s'] || {}).stars || 0 }))()" % (c['hk'], c['hk'], c['star_lv']))
            if s2['step'] != stp0 or s2['saved']: break
            if _ >= 1:
                try: await pg.locator(sel).nth(ai).click(timeout=1500)
                except Exception: pass
    await pg.wait_for_timeout(5200)
    won = await pg.evaluate("(() => ({ stars: (KIDS._save().levels['%s'] || {}).stars || 0 }))()" % c['star_lv'])
    rec('%s 2 真实点击通关 flat1' % tag, done and won['stars'] >= 1, 'clicks=%d stars=%s' % (clicks, won['stars']))
    rec('%s 7 0 pageerror' % tag, not errs, str(errs[:1]))
    await ctx.close()

    # ⑨b 连错 2 次 pulse（3 选题：neighbors flat5=3 选；worden flat10 章 3 3 选）
    flat9b = 5 if game == 'neighbors' else 10
    ctx, pg, errs = await newpage(browser, game)
    await seed(pg, flat9b, c['key'])
    await pg.reload(); await pg.wait_for_timeout(900)
    found = False
    qn = 0
    for probe in range(5):
        q = await pg.evaluate("(() => %s.quiz)()" % c['hk'])
        qn = len(q['options'])
        if qn >= 3: found = True; break
        ai = await pg.evaluate(c['qidx'])
        await pg.locator(sel).nth(ai).click()
        await pg.wait_for_timeout(2300)
    if found:
        ai = await pg.evaluate(c['qidx'])
        wrongs = [i for i in range(qn) if i != ai]
        await pg.locator(sel).nth(wrongs[0]).click()
        await pg.wait_for_timeout(1000)
        try: await pg.locator(sel).nth(wrongs[1]).click(timeout=2000)
        except Exception: pass
        await pg.wait_for_timeout(800)
        st2 = await pg.evaluate("""(s) => [...document.querySelectorAll(s)].filter(e => e.className.indexOf('breathe') >= 0 || e.className.indexOf('pulse') >= 0).length""", sel)
        rec('%s 9b 连错2次 pulse' % tag, st2 >= 1, 'nOpt=%d pulse=%d' % (qn, st2))
    else:
        rec('%s 9b 连错2次 pulse' % tag, False, '前 5 题均非 3 选')
    await ctx.close()

    # ⑩ sayW flat5 两错节流 ≤1（第二点坐标点灰卡位）
    ctx, pg, errs = await newpage(browser, game)
    await seed(pg, 5, c['key'])
    await pg.reload(); await pg.wait_for_timeout(900)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    ai = await pg.evaluate(c['qidx'])
    wi = 0 if ai != 0 else 1
    await pg.locator(sel).nth(wi).click()
    await pg.wait_for_timeout(900)
    bb = await pg.locator(sel).nth(wi).bounding_box()
    await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
    await pg.wait_for_timeout(900)
    v = await pg.evaluate('window.__vlog')
    wrongv = [x for x in v if (x.startswith('TTS:') and ('再想' in x or '不对' in x or '再听' in x)) or ':None:' in x or (x.startswith('K:') and 'wrong' in x)]
    rec('%s 10 sayW 两错节流 ≤1' % tag, len(wrongv) <= 1, 'v=%s' % [x[:22] for x in v][:5])
    await ctx.close()

    # 11 救援钟 7a：静置 16s + 乱点 24s
    for label, wild in (('11a 静置16s', False), ('11b 乱点24s', True)):
        ctx, pg, errs = await newpage(browser, game)
        await seed(pg, 5, c['key'])
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        if wild:
            for k in range(6):
                bb = await pg.locator(sel).first.bounding_box()
                await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
                await pg.wait_for_timeout(4000)
        else:
            await pg.wait_for_timeout(16500)
        v = await pg.evaluate('window.__vlog')
        rescue = [x for x in v if any(t in x for t in ('%s_q' % c['key'], 'TTS:', 'wen_w_', 'Q:'))]
        rec('%s %s 救援' % (tag, label), bool(rescue) and not errs, 'rescue=%s' % [x[:26] for x in rescue[:2]])
        await ctx.close()

    # ⑧ 教学吞输入 + 13 教学窗点重玩（干净档）
    ctx, pg, errs = await newpage(browser, game)
    tut = await pg.evaluate('%s.tutorial' % c['hk'])
    st0 = await pg.evaluate("(() => %s.currentLevel && %s.currentLevel.step)()" % (c['hk'], c['hk']))
    bb = await pg.locator(sel).first.bounding_box()
    await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
    await pg.wait_for_timeout(600)
    st1 = await pg.evaluate("(() => %s.currentLevel && %s.currentLevel.step)()" % (c['hk'], c['hk']))
    rec('%s 8 教学期真实点击被吞' % tag, tut == 'watch' and st1 == st0, 'tut=%s step %s->%s' % (tut, st0, st1))
    await pg.locator('#btn-replay').dispatch_event('pointerdown')
    await pg.wait_for_timeout(9000)
    st = await pg.evaluate("(() => ({ seen: !!(KIDS._save().%s && KIDS._save().%s.tutSeen) }))()" % (c['key'], c['key']))
    rec('%s 13 教学窗点重玩=教学照常' % tag, st['seen'] and not errs, 'seen=%s errs=%s' % (st['seen'], errs[:1]))
    await ctx.close()

    # ③ 双 viewport + ④ 离线 + ⑤ 截图 + 12 语音对账
    for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
        ctx, pg, errs = await newpage(browser, game, vp=vp)
        await seed(pg, 1, c['key'])
        await pg.reload(); await pg.wait_for_timeout(900)
        ox = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        small = await pg.evaluate("""() => {
          const out = [];
          document.querySelectorAll('button').forEach(el => {
            if (el.classList.contains('k-parentbtn')) return;
            const r = el.getBoundingClientRect();
            if (r.width > 2 && r.height > 2 && (r.width < 64 || r.height < 64)) out.push(el.className + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
          });
          return out;
        }""")
        rec('%s 3 viewport %dx%d' % (tag, vp['width'], vp['height']), ox == 0 and not small, 'ox=%s small=%s' % (ox, small[:2]))
        await ctx.close()
    src = open(os.path.join(BASE, game, 'index.html'), encoding='utf-8').read()
    bad = re.findall(r'(?:src|href)\s*=\s*["\']https?://[^"\']+', src)
    rec('%s 4 离线' % tag, not bad, str(bad[:2]))

    ctx, pg, errs = await newpage(browser, game)
    await seed(pg, 5, c['key'])
    await pg.reload(); await pg.wait_for_timeout(1200)
    shot = os.path.join(BASE, '_v8_shot_%s.png' % game)
    await pg.screenshot(path=shot)
    from PIL import Image
    import statistics
    im = Image.open(shot).convert('L').resize((160, 100))
    px = list(im.getdata())
    rec('%s 5 截图非空白' % tag, statistics.pstdev(px) > 8, 'stdev=%.1f' % statistics.pstdev(px))
    os.remove(shot)
    await ctx.close()
    mf = json.load(open(os.path.join(os.path.dirname(BASE), 'voice', 'clips', 'manifest.json'), encoding='utf-8'))
    gk = [k for k, vv in mf.items() if game in vv['games']]
    n_audio = src.count('data:audio')
    rec('%s 12 语音注入对账' % tag, len(gk) >= 6 and n_audio >= len(gk), 'keys=%d audio=%d' % (len(gk), n_audio))

    # ---- 款差异项 ----
    if game == 'neighbors':
        # 数学断言：flat5/flat12 直驱 5 题 answer=n±1 / mid=两邻中点（r31 修复 m3：mid 恒
        # answer=n+1 与 SPEC §R3 一致——旧写 n-1 or n+1 宽于规范，收紧）
        ctx, pg, errs = await newpage(browser, game)
        okall = True; det = ''
        for flat in (5, 12):
            await seed(pg, flat, c['key'])
            await pg.reload(); await pg.wait_for_timeout(900)
            for s in range(5):
                q = await pg.evaluate('NEB.quiz')
                good = (q['mode'] == 'plus' and q['answer'] == q['n'] + 1) or (q['mode'] == 'minus' and q['answer'] == q['n'] - 1) or (q['mode'] == 'mid' and q['answer'] == q['n'] + 1) or (q['mode'] == 'plus2' and q['answer'] == q['n'] + 2) or (q['mode'] == 'minus2' and q['answer'] == q['n'] - 2) or (q['mode'] == 'mid4' and q['answer'] == q['n'] + 2) or (q['mode'] == 'dualA' and q['answer'] == q['n'] - 1) or (q['mode'] == 'dualB' and q['answer'] == q['n'] + 1)
                uniq = len(set(q['options'])) == len(q['options']) and q['answer'] in q['options'] and all(o >= 1 for o in q['options'])
                if not (good and uniq): okall = False; det = 'flat%d %s' % (flat, json.dumps(q)[:120]); break
                await pg.evaluate('NEB.tapOption(NEB.quiz.options.indexOf(NEB.quiz.answer))')
                await pg.wait_for_timeout(350)
        rec('neighbors 14 数学断言(answer=±1/选项互异)', okall and not errs, det)
        await ctx.close()
    else:
        # sound2pic 开题自动播 en clip + replay() 钩子 + flat10 章 3 形近 3 选不发音干扰
        ctx, pg, errs = await newpage(browser, game)
        await seed(pg, 5, c['key'])   # flat5=章2 sound2pic
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        await pg.locator('#btn-replay').dispatch_event('pointerdown')   # 重开同关=开题 qSpeak
        await pg.wait_for_timeout(2000)
        v = await pg.evaluate('window.__vlog')
        en = [x for x in v if x.startswith('Q:wen_w_') or 'wen_w_' in x]
        rec('worden 14 sound2pic 开题自动播 en', bool(en), 'v=%s' % [x[:26] for x in v][:4])
        rp = await pg.evaluate("typeof WEN.replay")
        rec('worden 6b replay() 钩子', rp == 'function', rp)
        await ctx.close()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for game in ('neighbors', 'worden'):
            await run_game(browser, game)
        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
