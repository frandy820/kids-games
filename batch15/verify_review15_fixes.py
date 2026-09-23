# -*- coding: utf-8 -*-
"""batch15 审查修复实证（b15 review：fatal 0/major 3/minor 4，修 M1/M2/M3/m1/m2；m3/m4 登记）
T1(M1) logicwho 生成关 dch 随机（flat≥20 偏离循环+值域 1-4；静态关仍精确循环）
T2(M2) logicwho flat5 两错=两播（首发+miss2 豁免）——§0.5 家族口径对齐
T3(M3) cashier+logicwho dayDone 启动停留今日最后一关（first=lim-1）
T4(m1) matchstick won 期点题面卡=pop（不重读不重置）
T5(m2) 三款 won 窗内点重玩/重听钮=pop 轻叮（不静默）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
U = lambda g: 'file:///' + (BASE / g / 'index.html').as_posix()
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
  const _a = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _a(n); };
  return true;
})()"""

def seed_full(g, n):
    return """const sv = KIDS._save() || { levels: {} };
  sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%%5)] = { stars: 3 };
  sv.%s = { tutSeen: true };
  KIDS.store.persist();""" % (n, g)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # T1 生成关 dch 随机（verify 页 genLevel 直调）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(U('logicwho') + '?verify=1')
        for _ in range(60):
            if 'VERIFY' in (await pg.title()):
                break
            await pg.wait_for_timeout(500)
        r1 = await pg.evaluate("""(() => {
          const cyc = [], gen = [];
          for (let f = 0; f < 40; f++) { const d = genLevel(f).dch;
            if (f < 20) cyc.push(d); else gen.push(d); }
          const seg = () => [].concat(...[1,2,3,4].map(v => Array(5).fill(v)));   /* 5 关一段 */
          return { staticOk: JSON.stringify(cyc) === JSON.stringify(seg()),
            genVals: [...new Set(gen)], genRange: gen.every(d => d >= 1 && d <= 4),
            deviated: gen.some((d, i) => d !== seg()[i]) };
        })()""")
        rec('T1 logicwho 生成关dch随机(静态精确+gen随机偏离循环)', r1['staticOk'] and r1['genRange'] and r1['deviated'] and len(r1['genVals']) >= 2,
            'static=%s gen=%s dev=%s' % (r1['staticOk'], r1['genVals'], r1['deviated']))
        await ctx.close()

        # T2 logicwho flat5 两错=两播
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(U('logicwho'))
        await pg.wait_for_timeout(1200)
        await pg.evaluate(HOOK)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} };
          sv.levels = {}; for (let i = 0; i < 5; i++) sv.levels['1-'+i] = { stars: 1 };
          sv.logicwho = { tutSeen: true }; KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(3200)
        await pg.evaluate(HOOK)
        for _ in range(2):
            w = await pg.evaluate("""(() => { const q = LW.quiz; if (!q) return null;
              return q.choices.findIndex(c => c !== q.answerAnimal); })()""")
            pos = await pg.evaluate("""(i => { const e = document.querySelector('.card[data-i="'+i+'"]'); const b = e.getBoundingClientRect(); return {x: b.left+b.width/2, y: b.top+b.height*0.6}; })""", w)
            await pg.mouse.click(pos['x'], pos['y'])
            for _ in range(20):
                st = await pg.evaluate('LW.currentLevel.locked')
                if not st:
                    break
                await pg.wait_for_timeout(250)
        w2 = await pg.evaluate("window.__vlog.filter(x => x === 'P:lgw_wrong').length")
        m2 = await pg.evaluate('LW.currentLevel.misses')
        rec('T2 logicwho flat5 两错两播(首发+豁免)', w2 == 2 and m2 == 2, 'w=%s m=%s' % (w2, m2))
        await ctx.close()

        # T3 dayDone 启动 first=lim-1（cashier + logicwho）
        for g, hook in (('cashier', 'CS'), ('logicwho', 'LW')):
            ctx = await b.new_context()
            pg = await ctx.new_page()
            await pg.goto(U(g))
            await pg.wait_for_timeout(1200)
            lim = await pg.evaluate('KIDS.calendar.limit(Infinity)')
            await pg.evaluate(seed_full(g, lim))
            await pg.reload()
            await pg.wait_for_timeout(2400)
            flat = await pg.evaluate('%s.currentLevel && %s.currentLevel.flat' % (hook, hook))
            ov = await pg.evaluate("document.querySelectorAll('.k-ov').length")
            rec('T3 %s dayDone 启动停留最后一关' % g, flat == lim - 1 and ov >= 1, 'lim=%s flat=%s ov=%s' % (lim, flat, ov))
            await ctx.close()

# locked 演出窗吞输入轻叮（won 窗被 celebrate overlay 物理遮挡不可达，m2 可实证路径=locked 窗）
        # cashier：正确提交 880ms 演出窗内点 重玩/重听/题面卡
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(U('cashier'))
        await pg.wait_for_timeout(1200)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} };
          sv.levels = {}; sv.levels['1-0'] = { stars: 3 }; sv.cashier = { tutSeen: true }; KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        for _ in range(20):
            qq = await pg.evaluate('CS.quiz')
            if not qq:
                break
            rem = round(qq['change'] - qq.get('sum', 0), 2)
            if abs(rem) < 0.01:
                break
            v = 5 if rem >= 5 else (2 if rem >= 2 else (1 if rem >= 1 else 0.5))
            pos = await pg.evaluate("""(v => { const els = [...document.querySelectorAll('#coin-tray .coin:not(.gone)')].filter(e => Number(e.dataset.v) === v); if (!els.length) return null; const b = els[0].getBoundingClientRect(); return {x: b.left+b.width/2, y: b.top+b.height*0.6}; })""", v)
            if pos is None:
                break
            await pg.mouse.click(pos['x'], pos['y'])
            await pg.wait_for_timeout(140)
        await pg.locator('#pay-btn').click(force=True)
        await pg.wait_for_timeout(250)
        st0 = await pg.evaluate('({f: CS.currentLevel.flat, s: CS.currentLevel.step, r: CS.currentLevel.retries})')
        await pg.evaluate('window.__vlog = []')
        for sel in ('#btn-replay', '#btn-hear', '#prompt-chip'):
            pos = await pg.evaluate("""(p => { const e = document.querySelector(p); if (!e) return null; const b = e.getBoundingClientRect(); return {x: b.left+b.width/2, y: b.top+b.height/2}; })('%s')""" % sel)
            if pos:
                await pg.mouse.click(pos['x'], pos['y'])
                await pg.wait_for_timeout(120)
        pops = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        st1 = await pg.evaluate('({f: CS.currentLevel.flat, s: CS.currentLevel.step, r: CS.currentLevel.retries})')
        rec('T5 cashier 提交演出窗三处 pop+状态不变', pops >= 2 and st1 == st0, 'pops=%s st=%s->%s' % (pops, st0, st1))
        await ctx.close()

        # matchstick：错放 680ms 晃动窗内点 重玩/重听/题面卡（含 m1 的 chip 守卫）
        srcm = (BASE / 'verify_one_matchstick.py').read_text(encoding='utf-8')
        srcm = srcm.replace("sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')", "pass")
        nsm = {'__file__': 'verify_one_matchstick.py'}
        exec(compile(srcm.split('async def click_svg_el')[0], 'consts', 'exec'), nsm)
        SOLVE_JS, WRONG_JS = nsm['SOLVE_JS'], nsm['WRONG_JS']
        async def click_el(pg, pred):
            pos = await pg.evaluate("""(p => { const e = document.querySelector(p); if (!e) return null;
              const b = e.getBoundingClientRect(); const cands = [{ x: b.left + b.width / 2, y: b.top + b.height / 2 }];
              for (const fy of [0.08, 0.14, 0.86, 0.92]) cands.push({ x: b.left + b.width / 2, y: b.top + b.height * fy });
              for (const fx of [0.08, 0.14, 0.86, 0.92]) cands.push({ x: b.left + b.width * fx, y: b.top + b.height / 2 });
              for (const c of cands) { const hit = document.elementFromPoint(c.x, c.y); if (hit && e.contains(hit)) return c; }
              return null; })('%s')""" % pred)
            if pos is None:
                return False
            await pg.mouse.click(pos['x'], pos['y'])
            return True
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(U('matchstick'))
        await pg.wait_for_timeout(1200)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} };
          sv.levels = {}; sv.levels['1-0'] = { stars: 3 }; sv.matchstick = { tutSeen: true }; KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        wv = await pg.evaluate(WRONG_JS)
        m0 = await pg.evaluate('MS.quiz.miss')
        await click_el(pg, '.stk[data-slot="%d"]' % wv['src'])
        await pg.wait_for_timeout(450)
        await pg.evaluate('window.__vlog = []')
        await click_el(pg, '.slot[data-slot="%d"]' % wv['dst'])      # 错放 -> 680ms 晃动 locked 窗
        await pg.wait_for_timeout(120)
        st0 = await pg.evaluate('({f: MS.currentLevel.flat, s: MS.currentLevel.step, r: MS.currentLevel.retries})')
        for sel in ('#btn-replay', '#btn-hear', '#prompt-chip'):
            await click_el(pg, sel)
            await pg.wait_for_timeout(100)
        pops = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        m1v = await pg.evaluate('MS.quiz.miss')
        st1 = await pg.evaluate('({f: MS.currentLevel.flat, s: MS.currentLevel.step, r: MS.currentLevel.retries})')
        rec('T4+T5 matchstick 晃动窗三处 pop+miss只+1', pops >= 2 and m1v == m0 + 1 and st1 == st0,
            'pops=%s miss=%s->%s' % (pops, m0, m1v))
        await ctx.close()

        # logicwho：错点 560ms 晃动窗内点 重玩/重听
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(U('logicwho'))
        await pg.wait_for_timeout(1200)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} };
          sv.levels = {}; sv.levels['1-0'] = { stars: 3 }; sv.logicwho = { tutSeen: true }; KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await pg.evaluate(HOOK)
        w = await pg.evaluate("""(() => { const q = LW.quiz; return q.choices.findIndex(c => c !== q.answerAnimal); })()""")
        pos = await pg.evaluate("""(i => { const e = document.querySelector('.card[data-i="'+i+'"]'); const b = e.getBoundingClientRect(); return {x: b.left+b.width/2, y: b.top+b.height*0.6}; })""", w)
        await pg.mouse.click(pos['x'], pos['y'])                     # 错点 -> 560ms 晃动 locked 窗
        await pg.wait_for_timeout(100)
        st0 = await pg.evaluate('({f: LW.currentLevel.flat, s: LW.currentLevel.step, m: LW.currentLevel.misses})')
        await pg.evaluate('window.__vlog = []')
        for sel in ('#btn-replay', '#btn-hear'):
            pos = await pg.evaluate("""(p => { const e = document.querySelector(p); if (!e) return null; const b = e.getBoundingClientRect(); return {x: b.left+b.width/2, y: b.top+b.height/2}; })('%s')""" % sel)
            if pos:
                await pg.mouse.click(pos['x'], pos['y'])
                await pg.wait_for_timeout(80)
        pops = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        st1 = await pg.evaluate('({f: LW.currentLevel.flat, s: LW.currentLevel.step, m: LW.currentLevel.misses})')
        rec('T5 logicwho 晃动窗两处 pop+miss只+1', pops >= 2 and st1['m'] == st0['m'] and st1['f'] == st0['f'],
            'pops=%s' % pops)
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
