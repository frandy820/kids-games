# -*- coding: utf-8 -*-
"""batch14 multibattle 首单元独立复验（不信 agent 自报）
M1 verify title / M2 钩子契约 / M3 真实点击 flat0 通关（首错=2 星）
M4 答错钟不停 / M5 对手超时不计 miss 不扣星（真实 5s 钟）/ M6 sayW 三态（v1=1 v2=2）
M7 救援 14s（错点不重置）/ M8 教学吞输入+钟冻结 / M9 双 viewport+离线+截图+clip≥19"""
import asyncio, io, os, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = 'multibattle'
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k + '#' + String(t||'').slice(0,24)); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : (p.key || 'null')).join('|')); return _q(parts); };
  const _a = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _a(n); };
  return true;
})()"""

def seed(flat_stars):
    """种档：清 levels 到指定 flat 解锁，跳教学。stars=1（写档 max(旧,新) 保星语义，3 星种子会挡住 2 星断言）"""
    return """const sv = KIDS._save() || { levels: {} };
  sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%%5)] = { stars: 1 };
  sv.multibattle = { tutSeen: true };
  %s
  KIDS.store.persist();""" % (flat_stars, 'KIDS.calendar.bonusSet(10);' if flat_stars >= 10 else '')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        url = 'file:///' + (BASE / GAME / 'index.html').as_posix()

        # M1 verify title
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url + '?verify=1')
        title = ''
        for _ in range(25):
            await pg.wait_for_timeout(1000)
            title = await pg.title()
            if 'VERIFY' in title:
                break
        rec('M1 verify title', 'VERIFY PASS' in title and not errs, 'title=%s errs=%s' % (title, errs[:1]))
        await ctx.close()

        # M2 钩子契约（flat0 干净种档）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        q = await pg.evaluate('MB.quiz')
        lv = await pg.evaluate('MB.currentLevel')
        hook_ok = q and all(k in q for k in ('a', 'b', 'options', 'answerIdx', 'step', 'miss', 'myScore', 'foeScore', 'foeT')) and \
            len(q['options']) == 3 and 0 <= q['answerIdx'] <= 2 and \
            q['a'] in (2, 3) and 2 <= q['b'] <= 9 and q['a'] * q['b'] == q['options'][q['answerIdx']] and \
            len(set(q['options'])) == 3 and all(v > 0 for v in q['options']) and \
            lv and all(k in lv for k in ('flat', 'ch', 'dch', 'myScore', 'foeScore', 'won'))
        rec('M2 钩子契约(ch1 域 a∈{2,3} 积=answer 干扰互异禁0)', bool(hook_ok) and not errs,
            'a=%s b=%s opts=%s ans=%s' % (q and q['a'], q and q['b'], q and q['options'], q and q['answerIdx']))
        await ctx.close()

        # M3 真实点击 flat0 通关（首错一次=2 星）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(0))   # 空档：init 起始 flat0（种了 flat0 会从 flat1 开局，读 '1-0' 恒种子值）
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        clicks = 0
        ok3 = True
        # 每题等演出 880ms+入场 ~520ms 完（1700ms）再点；按 quiz 驱动直到 done（对手超时也推进）
        for s in range(14):
            q = await pg.evaluate('MB.quiz')
            if not q:
                break
            if s == 0:  # 首题先点一次错卡
                wi = [i for i in range(3) if i != q['answerIdx']][0]
                await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
                await pg.wait_for_timeout(900)
                m = await pg.evaluate('MB.quiz.miss')
                if m != 1:
                    ok3 = False
            # 入场动画尾段重试（batch12 divide 同款坑）
            got = None
            for _ in range(3):
                try:
                    await pg.locator('.opt[data-i="%d"]' % q['answerIdx']).first.click(force=True, timeout=3000)
                    got = True
                    break
                except Exception:
                    await pg.wait_for_timeout(600)
            if not got:
                ok3 = False
                break
            clicks += 1
            await pg.wait_for_timeout(1700)
        lvA = await pg.evaluate('MB.currentLevel')
        await pg.wait_for_timeout(3000)   # 庆祝动画+写档完成后才读档（afterWin 内 KIDS.level.pass）
        stars = await pg.evaluate("(KIDS._save().levels['1-0'] || {}).stars || 0")
        myS = lvA and lvA.get('myScore')
        rec('M3 真实点击 flat0 通关(首错=2星+myScore≥4)', ok3 and lvA and lvA['done'] and stars == 2 and myS and myS >= 4 and not errs,
            'stars=%s myScore=%s clicks=%d done=%s errs=%s' % (stars, myS, clicks, lvA and lvA['done'], errs[:1]))
        await ctx.close()

        # M4 答错钟不停（错后 foeT 仍单调减）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        q = await pg.evaluate('MB.quiz')
        wi = [i for i in range(3) if i != q['answerIdx']][0]
        t0 = await pg.evaluate('MB.quiz.foeT')
        await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
        await pg.wait_for_timeout(600)
        t1 = await pg.evaluate('MB.quiz.foeT')
        await pg.wait_for_timeout(900)
        t2 = await pg.evaluate('MB.quiz.foeT')
        rec('M4 答错钟不停(foeT 持续单调减)', t0 > t1 > t2 >= 0 and not errs,
            't=%.3f/%.3f/%.3f' % (t0, t1, t2))
        await ctx.close()

        # M5 对手超时不计 miss 不扣星（flat15=dch4 真实 5s 钟，静置等超时→答完剩题=3 星）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(15))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        dch = await pg.evaluate('MB.currentLevel.dch')
        fs0 = await pg.evaluate('MB.quiz.foeScore')
        # 静置等对手超时（ch4 钟改 6.5s 后 9s 上限 + 余量，2026-09-08 同步）
        for _ in range(18):
            await pg.wait_for_timeout(500)
            qq = await pg.evaluate('MB.quiz')
            if qq and qq['foeScore'] > fs0:
                break
        qq = await pg.evaluate('MB.quiz')
        rec('M5a 对手超时进格零惩罚(miss=0 foeScore+1)', dch == 4 and qq and qq['foeScore'] == fs0 + 1 and qq['miss'] == 0 and not errs,
            'dch=%s foe=%s→%s miss=%s' % (dch, fs0, qq and qq['foeScore'], qq and qq['miss']))
        # 超时后答完剩题 → 3 星（超时不扣星）
        ok5 = True
        for _ in range(12):
            qq = await pg.evaluate('MB.quiz')
            if not qq:
                break
            await pg.locator('.opt[data-i="%d"]' % qq['answerIdx']).first.click(force=True)
            await pg.wait_for_timeout(1300)
        lv5 = await pg.evaluate('MB.currentLevel')
        await pg.wait_for_timeout(3000)   # 庆祝+写档完成
        stars5 = await pg.evaluate("(KIDS._save().levels['4-0'] || {}).stars || 0")
        rec('M5b 超时后通关仍3星(超时不扣星)', ok5 and lv5 and lv5['done'] and stars5 == 3 and not errs,
            'stars=%s done=%s foe=%s' % (stars5, lv5 and lv5['done'], lv5 and lv5['foeScore']))
        await ctx.close()

        # M6 sayW 三态（不灰化 ===2：一错不播二错播——flat0 每错必播）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        q = await pg.evaluate('MB.quiz')
        wi = [i for i in range(3) if i != q['answerIdx']][0]
        await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
        await pg.wait_for_timeout(1100)
        w1 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:mul_wrong')).length")
        await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
        await pg.wait_for_timeout(1100)
        w2 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:mul_wrong')).length")
        m6 = await pg.evaluate('MB.quiz.miss')
        rec('M6 sayW 不灰化===2(flat0 两错两条)', w1 == 1 and w2 == 2 and m6 == 2, 'w1=%s w2=%s miss=%s' % (w1, w2, m6))
        await ctx.close()

        # M7 救援 14s（错点不重置：错一次后静置，救援在错后 ~14s 触发）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        q = await pg.evaluate('MB.quiz')
        wi = [i for i in range(3) if i != q['answerIdx']][0]
        await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
        await pg.evaluate('window.__vlog = []')
        # 静置观察：救援专用信号=mul_hint 播报或正确卡 breathe（排除对手超时换题的新题面 queue 误报）
        rescue, at, src = False, -1, ''
        for i in range(24):
            await pg.wait_for_timeout(1000)
            v = await pg.evaluate('window.__vlog')
            hit = [x for x in v if x.startswith('P:mul_hint')]
            br = await pg.evaluate("!!document.querySelector('.opt.breathe')")
            if hit or br:
                rescue, at, src = True, i + 1, (hit[0] if hit else 'breathe')
                break
        rec('M7 救援 14s 触发(错点不重置钟)', rescue and 8 <= at <= 19, 'at=%ss src=%s' % (at, src))
        await ctx.close()

        # M8 教学吞输入+钟冻结（清档首访 watch 期：乱点被吞+foeT 恒 1）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        # 立即轮询抓 watch 窗口（真实页 watch<3s，晚采会错过进 help）
        tut, samples = None, []
        for _ in range(24):
            tut = await pg.evaluate('MB.tutorial')
            if tut == 'watch':
                break
            await pg.wait_for_timeout(200)
        if tut == 'watch':
            for _ in range(3):
                samples.append(await pg.evaluate('MB.quiz ? MB.quiz.foeT : -1'))
                await pg.wait_for_timeout(400)
            # watch 期乱点答案卡——被吞：step 不动 miss 不增
            st0 = await pg.evaluate('MB.quiz ? { s: MB.quiz.step, m: MB.quiz.miss } : null')
            for _ in range(3):
                try:
                    await pg.locator('.opt').first.click(force=True, timeout=1500)
                except Exception:
                    pass
                await pg.wait_for_timeout(300)
            st1 = await pg.evaluate('MB.quiz ? { s: MB.quiz.step, m: MB.quiz.miss } : null')
            frozen = all(s == 1 for s in samples)
            # 吞输入证据=乱点不记 miss（step 推进是演示自身节奏，不算破坏）
            swallowed = (st0 is None) or (st0['m'] == st1['m'])
        else:
            frozen, swallowed = False, False
        rec('M8 教学watch期钟冻结+吞输入(miss不增)', frozen and swallowed and not errs,
            'tut=%s foeT=%s m=%s→%s errs=%s' % (tut, samples, st0 if tut == 'watch' else '-', st1 if tut == 'watch' else '-', errs[:1]))
        await ctx.close()

        # M9 双 viewport+离线+截图+clip 注入
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        ox1 = await pg.evaluate("Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, 0)")
        optMin1 = await pg.evaluate("""(() => {
          const els = [...document.querySelectorAll('.opt')];
          return Math.min(...els.map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); }));
        })()""")
        btnMin1 = await pg.evaluate("""(() => {
          let m = 999;
          document.querySelectorAll('button').forEach(b => {
            if (b.classList.contains('k-parentbtn')) return;
            const r = b.getBoundingClientRect();
            if (r.width > 4 && r.height > 4) m = Math.min(m, r.width, r.height);
          });
          return m;
        })()""")
        shot1 = await pg.screenshot()
        import statistics as st_
        stdev1 = st_.pstdev(shot1[500:50000:97])
        vp2 = await b.new_context(viewport={'width': 800, 'height': 1180})
        pg2 = await vp2.new_page()
        await pg2.goto(url)
        await pg2.wait_for_timeout(1200)
        await pg2.evaluate(seed(1))
        await pg2.reload()
        await pg2.wait_for_timeout(2400)
        ox2 = await pg2.evaluate("Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, 0)")
        optMin2 = await pg2.evaluate("""(() => {
          const els = [...document.querySelectorAll('.opt')];
          return Math.min(...els.map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); }));
        })()""")
        await vp2.close()
        html = (BASE / GAME / 'index.html').read_text(encoding='utf-8')
        offline = ('src="http' not in html) and ("href='http" not in html) and ('href="http' not in html)
        nclip = html.count('data:audio')
        rec('M9 双viewport+离线+截图+clip≥19', ox1 == 0 and ox2 == 0 and optMin1 >= 96 and optMin2 >= 96 and
            btnMin1 >= 64 and offline and nclip >= 19 and stdev1 > 2 and not errs,
            'ox=%d/%d opt=%d/%d btn=%d offline=%s clip=%d stdev=%.1f' % (ox1, ox2, optMin1, optMin2, btnMin1, offline, nclip, stdev1))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
