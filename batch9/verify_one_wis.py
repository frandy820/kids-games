# -*- coding: utf-8 -*-
"""batch9 首单元门禁 · whereistand 独立复验（不信任 agent 自报，全读实际产物）
①verify title ②真实点击通关 ③双 viewport+触摸目标 ④离线 ⑤截图非空白 ⑥钩子
⑦0 pageerror ⑧教学吞输入 ⑨首错零惩罚不 pulse+连错2次 pulse ⑩sayW flat≥3 节流+豁免恰一次(===2 三态)
⑪救援钟 7a（静置 16s+乱点不重置）12语音注入对账 13§0.20 教学窗点重玩门"""
import asyncio, json, os, re, sys
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(BASE, 'whereistand', 'index.html')
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
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : p.key).join(',')); return _q(parts); };
  return true;
})()"""

CARD = '.card[data-i="%d"]'

async def newpage(browser, vp={'width': 1280, 'height': 800}, verify=False):
    ctx = await browser.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(900)
    return ctx, pg, errs

SEED_JS = """(n) => {
  const sv = KIDS._save();
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.__KEY__ = sv.__KEY__ || {}; sv.__KEY__.tutSeen = true;
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();
}"""

async def seed(pg, flats, key='wis'):
    await pg.evaluate(SEED_JS.replace('__KEY__', key), flats)

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

        # ② 真实点击通关 flat1 ＋ ⑥ 钩子 ＋ ⑦ 0 pageerror ＋ ⑨ 首错零惩罚（场景卡 wig 不灰）
        ctx, pg, errs = await newpage(browser)
        await seed(pg, 1)
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        hk = await pg.evaluate("(() => ({ has: !!window.WIS, lvl: typeof WIS.currentLevel, quiz: typeof WIS.quiz, tap: typeof WIS.tapSlot, auto: typeof WIS.autoSolve }))()")
        rec('⑥ 钩子 WIS 齐', hk['has'] and hk['lvl'] != 'undefined' and hk['quiz'] != 'undefined' and hk['tap'] == 'function' and hk['auto'] == 'function', str(hk))
        q0 = await pg.evaluate("WIS.quiz")
        wrong_i = 0 if q0['answerIdx'] != 0 else 1
        await pg.locator(CARD % wrong_i).click()
        await pg.wait_for_timeout(700)
        st = await pg.evaluate("(() => { const els = [...document.querySelectorAll('.card')]; return { dim: els.filter(e => e.classList.contains('dim')).length, wig: els.filter(e => e.classList.contains('wig')).length, br: els.filter(e => e.classList.contains('breathe')).length }; })()")
        rec('⑨ 首错零惩罚不 pulse（wig 不灰）', st['wig'] >= 1 and st['br'] == 0, str(st))
        # 真实通关（判据=存档写档；换题过渡窗吞点击→自适应重试）
        clicks = 1
        done = False
        for step in range(16):
            st = await pg.evaluate("(() => ({ q: WIS.quiz, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 }))()")
            if st['saved'] or not st['q']: done = True; break
            ai = st['q']['answerIdx']
            await pg.locator(CARD % ai).click()
            clicks += 1
            for _ in range(10):
                await pg.wait_for_timeout(600)
                s2 = await pg.evaluate("(() => ({ step: WIS.quiz ? WIS.quiz.step : 99, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 }))()")
                if s2['step'] != st['q']['step'] or s2['saved']: break
                if _ >= 1:
                    try: await pg.locator(CARD % ai).click(timeout=1500)
                    except Exception: pass
        await pg.wait_for_timeout(5200)
        won = await pg.evaluate("(() => ({ cel: !!document.querySelector('.k-celebrate'), stars: (KIDS._save().levels['1-1'] || {}).stars || 0 }))()")
        rec('② 真实点击通关 flat1', done and won['stars'] >= 1, 'clicks=%d stars=%s' % (clicks, won['stars']))
        rec('⑦ 0 pageerror(通关全程)', not errs, str(errs[:1]))
        await ctx.close()

        # ⑩ sayW flat≥3 节流+豁免恰一次：flat5 同题连错 3 次（场景卡不灰可任意连点）→ 语音恰 2 条
        #    （第 1 错=节流窗外播；第 2 错=miss===2 豁免播；第 3 错=不再豁免且 10s 窗内静默）
        ctx, pg, errs = await newpage(browser)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate("WIS.quiz")
        wrongs = [i for i in range(len(q['line'])) if i != q['answerIdx']]
        for w in wrongs[:1] + wrongs[:1] + wrongs[1:2]:
            await pg.locator(CARD % w).click()
            await pg.wait_for_timeout(800)
        v = await pg.evaluate('window.__vlog')
        # wrong clip 已注册（Task#46 wis_wrong）→ vlog 形态 K:wis_wrong（r33 前旧判据 K:null=注册前
        # 无 clip 落空路径，基线存量红根因；题面=K:wis_q_*|K:wis2_*、开场=Q:）
        wrongv = [x for x in v if x.startswith('K:wis_wrong')]
        rec('⑩ sayW 三态（错1播/错2豁免/错3静默）', len(wrongv) == 2, 'wrongv=%s' % [x[:18] for x in wrongv])
        await ctx.close()

        # ⑪ 救援钟 7a：静置 16s 触发
        ctx, pg, errs = await newpage(browser)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        await pg.wait_for_timeout(16500)
        v = await pg.evaluate('window.__vlog')
        rescue = [x for x in v if x.startswith('K:wis_q') or x.startswith('TTS:')]
        rec('11a 静置16s 救援触发(14s)', bool(rescue) and not errs, 'rescue=%s' % [x[:22] for x in rescue[:2]])
        await ctx.close()
        # 11b 乱点错卡 24s 救援仍触发（错点不重置钟）
        ctx, pg, errs = await newpage(browser)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate("WIS.quiz")
        w = 0 if q['answerIdx'] != 0 else 1
        bb = await pg.locator(CARD % w).bounding_box()
        for k in range(6):
            await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
            await pg.wait_for_timeout(4000)
        v = await pg.evaluate('window.__vlog')
        rescue = [x for x in v if x.startswith('K:wis_q') or (x.startswith('TTS:') and '谁在' not in x and '第' not in x)]
        rec('11b 乱点24s 救援仍触发', bool(rescue), 'rescue=%s' % [x[:22] for x in rescue[:2]])
        await ctx.close()

        # ⑧ 教学吞输入 + 13 教学窗点重玩门（干净档 flat0）
        ctx, pg, errs = await newpage(browser)
        # r33 m1 根治（同帧断言）：wait_for_function 捕获点若落在 watch 起点+1.4~1.9s，watch 内
        # demo 点击（game-main.js tutorialWatch ~1.92s uiTapSlot）会把 step 0→1 → 旧判据
        # st1!=st0 假红。三道防线：① st0/st1 同帧读 {tut,step}；② 点击后 tut 仍 'watch' 才比
        # step（已跨 demo 捕获点不比）；③ 零竞态主判据=点非答案卡零副作用——泄漏路径必播
        # wis_wrong 且 demo 点 answerIdx 恒答对不播（vlog 无 wis_wrong 即吞输入成立，与 demo 时序无关）
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        await pg.wait_for_function("() => WIS.tutorial === 'watch'", timeout=8000)
        st0 = await pg.evaluate("(() => ({ tut: WIS.tutorial, step: WIS.currentLevel ? WIS.currentLevel.step : -1 }))()")
        q0 = await pg.evaluate('WIS.quiz')
        wi = 0 if q0['answerIdx'] != 0 else 1    # 点非答案卡：泄漏必走 wrong 路径（wig+播 wis_wrong）
        bb = await pg.locator(CARD % wi).first.bounding_box()
        await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
        await pg.wait_for_timeout(500)
        st1 = await pg.evaluate("(() => ({ tut: WIS.tutorial, step: WIS.currentLevel ? WIS.currentLevel.step : -1 }))()")
        v = await pg.evaluate('window.__vlog')
        leak = [x for x in v if x.startswith('K:wis_wrong')]
        step_ok = st1['tut'] != 'watch' or st1['step'] == st0['step']
        rec('⑧ 教学期真实点击被吞（同帧 tut 守卫+错卡零副作用）',
            st0['tut'] == 'watch' and not leak and step_ok and not errs,
            'tut=%s->%s step %s->%s leak=%s' % (st0['tut'], st1['tut'], st0['step'], st1['step'], leak))
        await pg.locator('#btn-replay').dispatch_event('pointerdown')
        await pg.wait_for_timeout(9000)
        st = await pg.evaluate("(() => ({ seen: !!(KIDS._save().wis && KIDS._save().wis.tutSeen), step: WIS.currentLevel && WIS.currentLevel.step }))()")
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

        # ⑤ 截图非空白 + 12 语音注入对账
        ctx, pg, errs = await newpage(browser)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(1200)
        shot = os.path.join(BASE, '_v9_shot_wis.png')
        await pg.screenshot(path=shot)
        from PIL import Image
        import statistics
        im = Image.open(shot).convert('L').resize((160, 100))
        px = list(im.getdata())
        rec('⑤ 截图非空白', statistics.pstdev(px) > 8, 'stdev=%.1f' % statistics.pstdev(px))
        os.remove(shot)
        await ctx.close()
        mf = json.load(open(os.path.join(os.path.dirname(BASE), 'voice', 'clips', 'manifest.json'), encoding='utf-8'))
        wis_keys = [k for k, v in mf.items() if 'whereistand' in v['games']]
        missing = [k for k in wis_keys if src.count(k) == 0]
        n_audio = src.count('data:audio')
        rec('12 语音注入对账', len(wis_keys) >= 10 and not missing and n_audio >= 10, 'wis_keys=%d missing=%s audio=%d' % (len(wis_keys), missing[:3], n_audio))

        await browser.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
