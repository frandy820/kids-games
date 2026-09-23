# -*- coding: utf-8 -*-
"""batch8 首单元门禁 · picto 独立复验（不信任 agent 自报，全读实际产物）
①verify title ②真实点击通关 ③双 viewport+触摸目标 ④离线 ⑤截图非空白 ⑥钩子
⑦0 pageerror ⑧教学吞输入 ⑨首错零惩罚不 pulse ⑩sayW flat≥3 节流
⑪救援钟 7a（静置 16s+乱点不重置）12语音注入对账 13§0.20 教学窗点重玩门"""
import asyncio, json, os, re, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(BASE, 'picto', 'index.html')
URL = 'file:///' + GAME.replace('\\', '/')
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
  return true;
})()"""

async def newpage(browser, vp={'width': 1280, 'height': 800}, verify=False):
    ctx = await browser.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(900)
    return ctx, pg, errs

async def seed(pg, flats, key='pic'):
    """种档：0..flats-1 全 3★ + tutSeen（flats>=10 时提 lim 防 dayEnd 落回）"""
    await pg.evaluate("""(n) => {
      const sv = KIDS._save();
      for (let i = 0; i < n; i++) sv.levels['1-' + i] = {stars: 3};
      sv.%s = sv.%s || {}; sv.%s.tutSeen = true;
      if (n >= 10) KIDS.calendar.bonusSet(10);
      KIDS.store.persist();
    }""" % (key, key, key), flats)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # ① verify title（轮询 3-15s）
        ctx, pg, errs = await newpage(browser, verify=True)
        title = ''
        for _ in range(18):
            title = await pg.title()
            if 'VERIFY' in title: break
            await pg.wait_for_timeout(1000)
        rec('① verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title)
        await ctx.close()

        # ② 真实点击通关 flat1（种档跳教学）＋ ⑥ 钩子 ＋ ⑦ 0 pageerror ＋ ⑨ 首错零惩罚
        ctx, pg, errs = await newpage(browser)
        await seed(pg, 1)
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        hk = await pg.evaluate("(() => ({ has: !!window.PIC, lvl: typeof PIC.currentLevel, quiz: typeof PIC.quiz, tap: typeof PIC.tapOption, auto: typeof PIC.autoSolve }))()")
        rec('⑥ 钩子 PIC 齐', hk['has'] and hk['lvl'] != 'undefined' and hk['quiz'] != 'undefined' and hk['tap'] == 'function' and hk['auto'] == 'function', str(hk))
        # 首错：第一题点一个错卡（2 选 1 只一个错卡，灰掉后重点正确=零惩罚重点路径）
        q0 = await pg.evaluate("(() => { const q = PIC.quiz; return { ai: q.answerIdx, n: q.options.length }; })()")
        wrong_i = 0 if q0['ai'] != 0 else 1
        await pg.locator('button.opt').nth(wrong_i).click()
        await pg.wait_for_timeout(700)
        st = await pg.evaluate("(() => { const els = [...document.querySelectorAll('button.opt')]; return { dim: els.filter(e => e.classList.contains('dim')).length, wig: els.filter(e => e.classList.contains('wig')).length, br: els.filter(e => e.classList.contains('breathe')).length }; })()")
        rec('⑨ 首错零惩罚不 pulse', st['dim'] == 1 and st['br'] == 0, str(st))
        # 真实通关：灰掉错卡后点正确卡 + 其余 4 题（换题过渡窗吞点击→重试；判据=存档写档硬证据）
        clicks = 1
        done = False
        for step in range(14):
            st = await pg.evaluate("(() => ({ q: PIC.quiz, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 }))()")
            if st['saved'] or not st['q']: done = True; break
            ai = st['q']['answerIdx']
            await pg.locator('button.opt').nth(ai).click()
            clicks += 1
            for _ in range(10):
                await pg.wait_for_timeout(600)
                s2 = await pg.evaluate("(() => ({ step: PIC.quiz ? PIC.quiz.step : 99, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 }))()")
                if s2['step'] != st['q']['step'] or s2['saved']: break
                if _ >= 1:   # 换题过渡窗吞点击 → 1.2s 未推进重试
                    try: await pg.locator('button.opt').nth(ai).click(timeout=1500)
                    except Exception: pass
        await pg.wait_for_timeout(5200)   # 等 winFlow：celebrate(2.3s) 完成后才写档
        won = await pg.evaluate("(() => ({ cel: !!document.querySelector('.k-celebrate'), stars: (KIDS._save().levels['1-1'] || {}).stars || 0 }))()")
        rec('② 真实点击通关 flat1', done and won['stars'] >= 1, 'clicks=%d stars=%s cel=%s' % (clicks, won['stars'], won['cel']))
        rec('⑦ 0 pageerror(通关全程)', not errs, str(errs[:1]))
        await ctx.close()

        # ⑨b 连错 2 次 pulse（flat3=全 3 选关——两错互异可行）
        ctx, pg, errs = await newpage(browser)
        await seed(pg, 3); await pg.reload(); await pg.wait_for_timeout(900)
        found = False
        for probe in range(4):
            q = await pg.evaluate("(() => { const q = PIC.quiz; return { ai: q.answerIdx, n: q.options.length }; })()")
            if q['n'] >= 3: found = True; break
            await pg.locator('button.opt').nth(q['ai']).click()
            await pg.wait_for_timeout(2200)
        if found:
            wrongs = [i for i in range(q['n']) if i != q['ai']]
            await pg.locator('button.opt').nth(wrongs[0]).click()
            await pg.wait_for_timeout(900)
            await pg.locator('button.opt').nth(wrongs[1]).click()
            await pg.wait_for_timeout(700)
            st2 = await pg.evaluate("(() => [...document.querySelectorAll('button.opt')].filter(e => e.classList.contains('breathe')).length)()")
            rec('⑨b 连错2次 pulse 正确项', st2 >= 1, 'nOpt=%d breathe=%d' % (q['n'], st2))
        else:
            rec('⑨b 连错2次 pulse 正确项', False, 'flat10 前 4 题均非 3 选')
        await ctx.close()

        # ⑩ sayW flat≥3 节流（flat5 两错 10s 内语音 ≤1 次纠错；第二点用坐标点灰卡位=空白路径）
        ctx, pg, errs = await newpage(browser)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        ai = await pg.evaluate('PIC.quiz.answerIdx')
        wi = 0 if ai != 0 else 1
        await pg.locator('button.opt').nth(wi).click()
        await pg.wait_for_timeout(900)
        bb = await pg.locator('button.opt').nth(wi).bounding_box()
        await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
        await pg.wait_for_timeout(900)
        v = await pg.evaluate('window.__vlog')
        # 纠错语音=TTS 兜底或 K:null（sayW 无专属 clip）——两错 10s 内应 ≤1 条非题面语音
        wrongv = [x for x in v if x.startswith('TTS:') and ('再想' in x or '不对' in x)]
        rec('⑩ sayW flat5 两错节流 ≤1', len(wrongv) <= 1, 'v=%s' % [x[:20] for x in v][:5])
        await ctx.close()

        # ⑪ 救援钟 7a：静置 16s 触发 + 乱点错卡不重置
        ctx, pg, errs = await newpage(browser)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        await pg.wait_for_timeout(16500)
        v = await pg.evaluate('window.__vlog')
        rescue = [x for x in v if x.startswith('K:pic_q') or x.startswith('TTS:')]
        rec('11a 静置16s 救援触发(14s)', bool(rescue) and not errs, 'rescue=%s' % [x[:22] for x in rescue[:2]])
        await ctx.close()
        ctx, pg, errs = await newpage(browser)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        for k in range(6):   # 每 4s 点一次错卡位持续 24s（灰化后同位=空白路径，均不推进）
            bb = await pg.locator('button.opt').first.bounding_box()
            await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
            await pg.wait_for_timeout(4000)
        v = await pg.evaluate('window.__vlog')
        rescue = [x for x in v if x.startswith('K:pic_q') or x.startswith('TTS:')]
        rec('11b 乱点24s 救援仍触发', bool(rescue), 'rescue=%s' % [x[:22] for x in rescue[:2]])
        await ctx.close()

        # ⑧ 教学吞输入 + 13 §0.20 教学窗点重玩（干净档 flat0）
        ctx, pg, errs = await newpage(browser)
        tut = await pg.evaluate('PIC.tutorial')
        st0 = await pg.evaluate("(() => PIC.currentLevel && PIC.currentLevel.step)()")
        bb = await pg.locator('button.opt').first.bounding_box()
        await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
        await pg.wait_for_timeout(500)
        st1 = await pg.evaluate("(() => PIC.currentLevel && PIC.currentLevel.step)()")
        rec('⑧ 教学期真实点击被吞', tut == 'watch' and st1 == st0, 'tut=%s step %s->%s' % (tut, st0, st1))
        await pg.locator('#btn-replay').dispatch_event('pointerdown')
        await pg.wait_for_timeout(9000)
        st = await pg.evaluate("(() => ({ seen: !!(KIDS._save().pic && KIDS._save().pic.tutSeen), step: PIC.currentLevel && PIC.currentLevel.step }))()")
        rec('13 教学窗点重玩=教学照常完成', st['seen'] and not errs, 'seen=%s errs=%s' % (st['seen'], errs[:1]))
        await ctx.close()

        # ③ 双 viewport overflowX + 触摸目标（.k-parentbtn 豁免）+ ④ 离线
        for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
            ctx, pg, errs = await newpage(browser, vp=vp)
            await seed(pg, 1); await pg.reload(); await pg.wait_for_timeout(900)
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
            rec('③ viewport %dx%d overflowX=0' % (vp['width'], vp['height']), ox == 0, 'ox=%s' % ox)
            rec('③b 触摸目标 ≥64px', not small, str(small[:3]))
            await ctx.close()
        src = open(GAME, encoding='utf-8').read()
        bad = re.findall(r'(?:src|href)\s*=\s*["\']https?://[^"\']+', src)
        rec('④ 离线断言', not bad and 'http://' not in src.replace('http://www.w3.org', ''), str(bad[:2]))

        # ⑤ 截图非空白（像素方差）+ 12 语音注入对账
        ctx, pg, errs = await newpage(browser)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(1200)
        shot = os.path.join(BASE, '_v8_shot_picto.png')
        await pg.screenshot(path=shot)
        from PIL import Image
        import statistics
        im = Image.open(shot).convert('L').resize((160, 100))
        px = list(im.getdata())
        rec('⑤ 截图非空白', statistics.pstdev(px) > 8, 'stdev=%.1f' % statistics.pstdev(px))
        os.remove(shot)
        await ctx.close()
        mf = json.load(open(os.path.join(os.path.dirname(BASE), 'voice', 'clips', 'manifest.json'), encoding='utf-8'))
        pic_keys = [k for k, v in mf.items() if 'picto' in v['games']]
        missing = [k for k in pic_keys if src.count(k) == 0]   # m11：删恒真子式（'data:audio' not in src or True 恒真）
        n_audio = src.count('data:audio')
        rec('12 语音注入对账', len(pic_keys) >= 25 and not missing and n_audio >= 28, 'pic_keys=%d missing=%s audio=%d' % (len(pic_keys), missing[:3], n_audio))

        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
