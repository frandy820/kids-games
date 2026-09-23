# -*- coding: utf-8 -*-
"""batch10 首单元门禁 · habit 好习惯排序（不信任 agent 自报，全读实际产物）
①verify title ②真实点击通关 flat1（乱序卡逐点应点卡）③双 viewport+触摸目标 ④离线
⑤截图非空白 ⑥钩子 ⑦0 pageerror ⑧教学吞输入 ⑨首错零惩罚+连错2 breathe
⑩sayW 三态（K:null'再想'前缀：错1播/错2豁免/跨题静默）⑪救援（重读题面+应点卡 breathe）+错点不重置
⑫语音注入 data:audio 计数 ⑬教学窗重玩门 ⑭乱序≠原序 ⑮点对推进（pos++/槽 lit/卡 gone）"""
import asyncio, io, json, os, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'habit', 'index.html').replace('\\', '/')
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
  return true;
})()"""

SEED_JS = """(n) => {
  const sv = KIDS._save();
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.habit = sv.habit || {}; sv.habit.tutSeen = true;
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();
}"""

async def newpage(browser, vp={'width': 1280, 'height': 800}, verify=False):
    ctx = await browser.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(900)
    return ctx, pg, errs

async def seed(pg, n):
    await pg.evaluate(SEED_JS, n)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ① verify title
        ctx, pg, errs = await newpage(b, verify=True)
        title = ''
        for _ in range(18):
            title = await pg.title()
            if 'VERIFY' in title: break
            await pg.wait_for_timeout(1000)
        rec('H1 verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title)
        r = await pg.evaluate("JSON.parse(document.getElementById('verify-result').textContent)")
        rec('H1b verify 含 sayW 三态+clipOk 单元', (r.get('units', {}).get('sayW', {}) or {}).get('ok') is True and (r.get('units', {}).get('dist', {}) or {}).get('clips') is True, '')
        await ctx.close()

        # ②⑥⑦⑭⑮ 真实通关 flat1（seed 1 → 进 1-1）
        ctx, pg, errs = await newpage(b)
        await seed(pg, 1); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        hk = await pg.evaluate("(() => ({ has: !!window.HB, quiz: typeof HB.quiz, tap: typeof HB.tapCard, auto: typeof HB.autoSolve, tut: typeof HB.tutorial }))()")
        rec('H6 钩子 HB 齐', hk['has'] and hk['quiz'] != 'undefined' and hk['tap'] == 'function' and hk['auto'] == 'function', str(hk))
        q0 = await pg.evaluate("HB.quiz")
        shuffled = q0['shown'] != list(range(len(q0['steps'])))
        rec('H14 乱序不等于原序', shuffled, 'shown=%s' % q0['shown'])
        # ⑮ 点对推进：点应点卡 → pos++/槽 lit/卡 gone
        a0 = q0['answerIdx']
        await pg.locator('.card[data-i="%d"]' % a0).click()
        await pg.wait_for_timeout(800)
        st1 = await pg.evaluate("(() => ({ pos: HB.quiz.pos, gone: document.querySelector('.card[data-i=\"%d\"]').classList.contains('gone'), lit: document.querySelectorAll('#strip .lit, #strip .slot.lit, .stripline .lit').length }))()" % a0)
        rec('H15 点对推进(pos++/卡gone/槽lit)', st1['pos'] == 1 and st1['gone'] and st1['lit'] >= 1, str(st1))
        # ② 继续真实通关（轮询 pos 到尾 → 下一题 → 5 题完成）
        clicks, done = 1, False
        for step in range(70):
            st = await pg.evaluate("(() => { const q = HB.quiz; return q ? { ai: q.answerIdx, step: q.step, saved: (KIDS._save().levels['1-1'] || {}).stars || 0 } : { saved: (KIDS._save().levels['1-1'] || {}).stars || 0, gone: true }; })()")
            if st.get('saved') or st.get('gone'): done = True; break
            await pg.locator('.card[data-i="%d"]' % st['ai']).click()
            clicks += 1
            await pg.wait_for_timeout(600)
        await pg.wait_for_timeout(5200)
        won = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
        rec('H2 真实点击通关 1-1', done and won >= 1, 'clicks=%d stars=%s' % (clicks, won))
        rec('H7 0 pageerror', not errs, str(errs[:1]))
        await ctx.close()

        # ⑨b+⑩ flat5：点错（非应点卡）错1 播/错2 豁免=2 条+breathe；跨题第三错静默
        ctx, pg, errs = await newpage(b)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate("HB.quiz")
        wrongs = [i for i in q['shown'] if i != q['answerIdx']][:2]
        for w in wrongs:
            await pg.locator('.card[data-i="%d"]' % w).click()
            await pg.wait_for_timeout(800)
        br = await pg.evaluate("(() => { const ok = document.querySelector('.card[data-i=\"' + HB.quiz.answerIdx + '\"]'); return ok && ok.classList.contains('breathe'); })()")
        v = await pg.evaluate('window.__vlog')
        wrongv = [x for x in v if x.startswith('P:null#再想')]
        rec('H9 连错2次 breathe 应点卡', br, 'breathe=%s' % br)
        rec('H10 sayW 两态(错1播/错2豁免)', len(wrongv) == 2, 'wrongv=%s' % wrongv)
        # 同题第三错静默（错3 miss=3：豁免 ===2 只一次，第三错在 10s 节流窗内静默；batch9 G⑩ 同构）
        q = await pg.evaluate("HB.quiz")
        w3 = [i for i in q['shown'] if i != q['answerIdx']][2]
        await pg.locator('.card[data-i="%d"]' % w3).click()
        await pg.wait_for_timeout(800)
        v2 = await pg.evaluate('window.__vlog')
        wrongv2 = [x for x in v2 if x.startswith('P:null#再想')]
        rec('H10b 同题第三错静默(豁免恰一次)', len(wrongv2) == 2, 'total=%d' % len(wrongv2))
        await ctx.close()

        # ⑪ 救援（静置臂：重读题面+应点卡 breathe）+错点不重置臂
        ctx, pg, errs = await newpage(b)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        ai = await pg.evaluate("HB.quiz.answerIdx")
        br0 = await pg.evaluate("(i) => document.querySelector('.card[data-i=\"' + i + '\"]').classList.contains('pulse')", ai)
        await pg.wait_for_timeout(16500)
        v = await pg.evaluate('window.__vlog')
        rescue = [x for x in v if 'hb_q_' in x]
        br1 = await pg.evaluate("(i) => document.querySelector('.card[data-i=\"' + i + '\"]').classList.contains('pulse')", ai)
        rec('H11 静置16s 救援(题面+应点卡 pulse)', bool(rescue) and not br0 and br1, 'rescue=%s pulse %s->%s' % ([x[:16] for x in rescue[:1]], br0, br1))
        await ctx.close()
        ctx, pg, errs = await newpage(b)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        await pg.wait_for_timeout(12000)
        w = await pg.evaluate("(() => { const q = HB.quiz; return q.shown.filter(i => i !== q.answerIdx)[0]; })()")
        await pg.locator('.card[data-i="%d"]' % w).click()
        await pg.wait_for_timeout(10000)
        v = await pg.evaluate('window.__vlog')
        res2 = [x for x in v if 'hb_q_' in x and x.startswith('Q:')]
        rec('H11b 错点不重置救援(22s 处已触发)', bool(res2) and not errs, 'rescue=%s' % [x[:20] for x in res2[:1]])
        await ctx.close()

        # ⑧⑬ 教学（乱点不跳；重玩门）
        ctx, pg, errs = await newpage(b)
        await pg.evaluate(HOOK)
        tut = await pg.evaluate('HB.tutorial')
        st0 = await pg.evaluate("HB.currentLevel && HB.currentLevel.step")
        bb = await pg.locator('.card').first.bounding_box()
        pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
        await pg.wait_for_timeout(500)
        pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        st1 = await pg.evaluate("HB.currentLevel && HB.currentLevel.step")
        rec('H8 教学期真实点击被吞+轻叮', tut == 'watch' and st1 == st0 and pops1 > pops0, 'tut=%s step %s->%s pops+%d' % (tut, st0, st1, pops1 - pops0))
        await pg.locator('#btn-replay').dispatch_event('pointerdown')
        st = False
        for _ in range(16):
            await pg.wait_for_timeout(1000)
            st = await pg.evaluate("!!(KIDS._save().habit && KIDS._save().habit.tutSeen)")
            if st: break
        rec('H13 教学窗点重玩=教学照常完成', st and not errs, 'seen=%s errs=%s' % (st, errs[:1]))
        await ctx.close()

        # ③④⑤⑫
        for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
            ctx, pg, errs = await newpage(b, vp=vp)
            await seed(pg, 1); await pg.reload(); await pg.wait_for_timeout(900)
            ox = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            small = await pg.evaluate("""(() => {
              const out = [];
              document.querySelectorAll('button, .card').forEach(el => {
                if (el.classList.contains('k-parentbtn')) return;
                const r = el.getBoundingClientRect();
                if (r.width > 2 && r.height > 2 && (r.width < 64 || r.height < 64)) out.push(el.className + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
              });
              return out;
            })()""")
            rec('H3 viewport %dx%d overflowX=0+触摸≥64' % (vp['width'], vp['height']), ox == 0 and not small, 'ox=%s small=%s' % (ox, small[:2]))
            await ctx.close()
        src = open(os.path.join(BASE, 'habit', 'index.html'), encoding='utf-8').read()
        bad = re.findall(r'(?:src|href)\s*=\s*["\']https?://[^"\']+', src)
        rec('H4 离线断言', not bad and 'http://' not in src.replace('http://www.w3.org', ''), str(bad[:2]))
        ctx, pg, errs = await newpage(b)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(1200)
        shot = os.path.join(BASE, '_v10_shot_hb.png')
        await pg.screenshot(path=shot)
        from PIL import Image
        import statistics
        im = Image.open(shot).convert('L').resize((160, 100))
        px = list(im.getdata())
        rec('H5 截图非空白', statistics.pstdev(px) > 8, 'stdev=%.1f' % statistics.pstdev(px))
        os.remove(shot)
        await ctx.close()
        mf = json.load(open(os.path.join(os.path.dirname(BASE), 'voice', 'clips', 'manifest.json'), encoding='utf-8'))
        keys = [k for k, v2 in mf.items() if 'habit' in v2['games']]
        n_audio = src.count('data:audio/mpeg;base64')
        rec('H12 语音注入对账', n_audio >= len(keys), 'audio=%d keys=%d' % (n_audio, len(keys)))

        await b.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
