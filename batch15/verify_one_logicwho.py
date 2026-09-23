# -*- coding: utf-8 -*-
"""batch15 logicwho 独立复验
L1 VERIFY | L2 钩子契约 | L3 flat1 真实通关 3★ | L4 错点（wig+flash+1错=2★）
L5 唯一解分源穷举（自写判定器全 40 关）| L6 教学链（吞输入+demoR）
L7 sayW 三态 | L8 救援 14s | L9 双viewport+触摸+离线+clip"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'logicwho' / 'index.html').as_posix()
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
  const _a = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _a(n); };
  return true;
})()"""

def seed(n, stars=1):
    return """const sv = KIDS._save() || { levels: {} };
  sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%%5)] = { stars: %d };
  sv.logicwho = { tutSeen: true };
  %s
  KIDS.store.persist();""" % (n, stars, 'KIDS.calendar.bonusSet(10);' if n >= 10 else '')

async def tap_right(pg):
    q = await pg.evaluate('LW.quiz')
    if not q:
        return None
    return await tap_card(pg, q['choices'].index(q['answerAnimal']))

async def tap_wrong(pg):
    q = await pg.evaluate('LW.quiz')
    if not q:
        return None
    wi = next(i for i in range(3) if q['choices'][i] != q['answerAnimal'])
    return await tap_card(pg, wi)

async def tap_card(pg, i):
    pos = await pg.evaluate("""(i => { const e = document.querySelector('.card[data-i="'+i+'"]'); if (!e) return null; const b = e.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height * 0.6}; })(%d)""" % i)
    if pos is None:
        return False
    await pg.mouse.click(pos['x'], pos['y'])
    await pg.wait_for_timeout(250)
    return True

# 分源穷举判定器（不复用游戏 clueTrueEng——独立实现；X/W/Y=动物名字符串，assign=座位→名字）
SOLVE_JS = """(() => {
  const permsOf = a => [[a[0],a[1],a[2]],[a[0],a[2],a[1]],[a[1],a[0],a[2]],[a[1],a[2],a[0]],[a[2],a[0],a[1]],[a[2],a[1],a[0]]];
  const chk = (c, asg, hats, items) => {
    if (c.t === 'pos') { for (let s = 0; s < 3; s++) if (hats[s] === c.hat) return asg[s] === c.X; return false; }
    if (c.t === 'neg') { for (let s = 0; s < 3; s++) if (hats[s] === c.hat) return asg[s] !== c.W; return false; }
    if (c.t === 'rel') { const sx = asg.indexOf(c.X), sy = asg.indexOf(c.Y); return sx === sy - 1; }   // 相邻左
    if (c.t === 'abs') { return c.edge === 'L' ? asg[0] === c.X : asg[2] === c.X; }
    if (c.t === 'ipos') { for (let s = 0; s < 3; s++) if (items && items[s] === c.item) return asg[s] === c.X; return false; }
    return false;
  };
  const bad = [];
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (const qx of L.quizzes) {
      const oks = permsOf(qx.animals).filter(asg => qx.clues.every(c => chk(c, asg, qx.hats, qx.items)));
      const askSeat = qx.ask.kind === 'hat' ? qx.hats.indexOf(qx.ask.value) : (qx.items ? qx.items.indexOf(qx.ask.value) : -1);
      const ansSet = new Set(oks.map(asg => asg[askSeat]));   // 问句答案唯一（ch1 单线索下全排列自由但答案恒一致）
      const solved = oks.length >= 1 && ansSet.size === 1 && oks.some(asg => JSON.stringify(asg) === JSON.stringify(qx.animals)) && askSeat === qx.answer;
      if (!solved) bad.push({flat: flat, n: oks.length, askSeat: askSeat, ans: qx.answer});
    }
  }
  return bad.slice(0, 3);
})()"""

async def wait_ready(pg, timeout=8000):
    """等演出窗结束（locked 解除或 won）——点击间隔不足会被吞"""
    for _ in range(int(timeout / 300)):
        st = await pg.evaluate('LW.currentLevel ? {l: LW.currentLevel.locked, w: LW.currentLevel.won} : null')
        if st is None or (not st['l'] or st['w']):
            return
        await pg.wait_for_timeout(300)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # L1 VERIFY + L5 分源穷举
        ctx = await b.new_context()
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
        rec('L1 VERIFY title', title == 'VERIFY PASS 48/48' and not errs, 'title=%s errs=%s' % (title, errs[:1]))
        bad = await pg.evaluate(SOLVE_JS)
        rec('L5 唯一解分源穷举(40关全量+answer一致)', len(bad) == 0, 'bad=%s' % bad)
        await ctx.close()

        # L2 钩子 + L3 flat1 通关
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        q = await pg.evaluate('LW.quiz')
        hook_ok = q and all(k in q for k in ('animals', 'clues', 'ask', 'answer', 'step')) and len(q['animals']) == 3 and 1 <= len(q['clues']) <= 3
        rec('L2 钩子契约(animals3+clues1-3+ask+answer)', bool(hook_ok), 'q=%s clues=%s' % (q and {k: q[k] for k in ('animals', 'ask', 'answer')}, q and len(q['clues'])))
        clicks = 0
        for _ in range(10):
            if not await pg.evaluate('LW.quiz'):
                break
            await tap_right(pg)
            clicks += 1
            await wait_ready(pg)
        await pg.wait_for_timeout(3200)
        stars = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
        rec('L3 flat1 真实点击通关3★', stars == 3 and not errs, 'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
        await ctx.close()

        # L4 错点（wig+flash+misses=1）+1 错=2★
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await tap_wrong(pg)
        await pg.wait_for_timeout(800)
        wig = await pg.evaluate("!!document.querySelector('.card.wig')")
        fl = await pg.evaluate("!!document.querySelector('.clue.flash')")
        m4 = await pg.evaluate('LW.currentLevel.misses')
        for _ in range(10):
            if not await pg.evaluate('LW.quiz'):
                break
            await tap_right(pg)
            await wait_ready(pg)
        await pg.wait_for_timeout(3200)
        stars4 = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
        rec('L4 错点wig+线索flash+1错=2★', wig and fl and m4 == 1 and stars4 == 2 and not errs,
            'wig=%s flash=%s m=%s stars=%s errs=%s' % (wig, fl, m4, stars4, errs[:1]))
        await ctx.close()

        # L6 教学链
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1500)
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(800)
        sw = False
        demo_r = None
        sw_done = False
        for _ in range(60):
            t = await pg.evaluate('LW.tutorial || "none"')
            if t == 'watch' and not sw_done:
                st0 = await pg.evaluate('LW.quiz ? LW.quiz.step : -1')
                for _ in range(3):
                    q0 = await pg.evaluate('LW.quiz')
                    if q0:
                        await tap_card(pg, [i for i in range(3) if i != q0['answer']][0])
                st1 = await pg.evaluate('LW.quiz ? LW.quiz.step : -1')
                sw = st1 == st0
                sw_done = True
            demo_r = await pg.evaluate('window.__lwDemoR || null')
            if demo_r or t == 'help':
                break
            await pg.wait_for_timeout(400)
        if demo_r is None:
            demo_r = await pg.evaluate('window.__lwDemoR || null')
        rec('L6 教学 watch 吞输入+demoR', sw and demo_r == 'right' and not errs,
            'swallow=%s demoR=%s errs=%s' % (sw, demo_r, errs[:1]))
        await ctx.close()

        # L7 sayW 三态
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(HOOK)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await pg.evaluate(HOOK)
        for _ in range(2):                       # 同题两错（第二错换另一张）
            await tap_wrong(pg)
            await wait_ready(pg)
        w1 = await pg.evaluate("window.__vlog.filter(x => x === 'P:lgw_wrong').length")
        await pg.evaluate(seed(5))
        await pg.reload()
        await pg.wait_for_timeout(3200)          # ch2 揭幕+开场链更长
        await pg.evaluate(HOOK)
        for k in range(2):
            await tap_wrong(pg)
            await wait_ready(pg)
        w2 = await pg.evaluate("window.__vlog.filter(x => x === 'P:lgw_wrong').length")
        m7 = await pg.evaluate('LW.currentLevel.misses')
        rec('L7 sayW 三态(flat1 两错播2/flat5 首发+豁免2)', w1 == 2 and w2 == 2 and m7 == 2, 'w1=%s w2=%s m=%s' % (w1, w2, m7))
        await ctx.close()

        # L8 救援（错点不重置→触发+breathe）
        ctx = await b.new_context()
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
        await pg.wait_for_timeout(8500)           # 关起累计 ~12s（错点后不重置，未到 14s 阈值）
        r0 = await pg.evaluate('LW.rescues')
        await pg.wait_for_timeout(5000)           # 累计 ~17s 过阈值
        r1 = await pg.evaluate('LW.rescues')
        br = await pg.evaluate("!!document.querySelector('.card.breathe')")
        rec('L8 救援错点不重置+14s触发', r0 == 0 and r1 >= 1 and br and not errs,
            'r=%s→%s breathe=%s errs=%s' % (r0, r1, br, errs[:1]))
        await ctx.close()

        # L9 双 viewport+触摸+离线+clip
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1800)
        r9 = await pg.evaluate("""(() => {
          const cards = [...document.querySelectorAll('.card')].map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); });
          const btns = [...document.querySelectorAll('button')].filter(x => !x.className.includes('k-parentbtn')).map(x => { const b = x.getBoundingClientRect(); return Math.min(b.width, b.height); }).filter(v => v > 0);
          return { minCard: Math.min(...cards), minBtn: Math.min(...btns), ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        vp2 = await b.new_context(viewport={'width': 800, 'height': 1180})
        pg2 = await vp2.new_page()
        await pg2.goto(URL)
        await pg2.wait_for_timeout(1800)
        r9b = await pg2.evaluate("""(() => {
          const cards = [...document.querySelectorAll('.card')].map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); });
          return { minCard: Math.min(...cards), ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        html = (BASE / 'logicwho' / 'index.html').read_text(encoding='utf-8')
        nclip = html.count('data:audio')
        offline = ('src="http' not in html) and ("href='http" not in html) and ('href="http' not in html)
        rec('L9 双viewport+触摸+离线+clip', r9['minCard'] >= 96 and r9['minBtn'] >= 64 and r9['ox'] == 0 and r9b['minCard'] >= 96 and r9b['ox'] == 0 and offline and nclip >= 31 and not errs,
            'desk card=%s btn=%s ox=%s | pad card=%s ox=%s offline=%s clip=%s' % (r9['minCard'], r9['minBtn'], r9['ox'], r9b['minCard'], r9b['ox'], offline, nclip))
        await ctx.close()
        await vp2.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
