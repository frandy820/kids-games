# -*- coding: utf-8 -*-
"""batch15 首单元门禁：cashier 独立复验（不信 agent 自报）
C1 VERIFY title 轮询 | C2 钩子契约 | C3 flat1 真实贪心放币通关+写档
C4 空/错提交口径（空不计次/1 错=2★） | C5 flat10 带角通关+ch3 域 | C6 教学链（吞输入+demoR）
C7 sayW 三态 | C8 救援（放币不重置+15s 触发） | C9 演出窗内点提交键 pop
C10 双 viewport+触摸目标 | C11 离线+clip 注入 | C12 ch4 数词 queue 拼接全 clip"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'cashier' / 'index.html').as_posix()
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
  sv.cashier = { tutSeen: true };
  %s
  KIDS.store.persist();""" % (n, stars, 'KIDS.calendar.bonusSet(10);' if n >= 10 else '')

async def mouse_click_el(pg, css_pred):
    """取首匹配元素坐标真实点击（mouse.click——dispatchEvent 单发 pointerdown 不触发游戏监听）"""
    pos = await pg.evaluate("""(p => { const els = [...document.querySelectorAll(p)]; for (const e of els) { const b = e.getBoundingClientRect(); if (b.width > 0) return {x: b.left + b.width / 2, y: b.top + b.height * 0.6}; } return null; })('%s')""" % css_pred)
    if pos is None:
        return False
    await pg.mouse.click(pos['x'], pos['y'])
    await pg.wait_for_timeout(200)
    return True

async def greedy_fill(pg):
    """贪心放币：5→2→1→0.5 真实点击 #coin-tray .coin 直到 sum==change"""
    for _ in range(30):
        q = await pg.evaluate('CS.quiz')
        if not q:
            return True
        rem = round(q['change'] - q.get('sum', 0), 2)
        if abs(rem) < 0.01:
            return True
        v = 5 if rem >= 5 else (2 if rem >= 2 else (1 if rem >= 1 else 0.5))
        got = await mouse_click_el(pg, '#coin-tray .coin:not(.gone)[data-v="%s"]' % v)
        if not got:
            return False
        await pg.wait_for_timeout(150)
    return False

async def play_level(pg, errs):
    """真实通关当前关：贪心放币+提交循环；返回 (clicks, ok)"""
    clicks = 0
    for _ in range(12):
        q = await pg.evaluate('CS.quiz')
        if not q:
            break
        ok = await greedy_fill(pg)
        if not ok:
            return clicks, False
        clicks += 1
        await pg.locator('#pay-btn').click(force=True)
        await pg.wait_for_timeout(1300)
    lv = await pg.evaluate('CS.currentLevel')
    return clicks, bool(lv and lv.get('done'))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # C1 VERIFY
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
        rec('C1 VERIFY title', title == 'VERIFY PASS 49/49' and not errs, 'title=%s errs=%s' % (title, errs[:1]))
        await ctx.close()

        # C2 钩子契约 + C3 flat1 真实通关
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        q = await pg.evaluate('CS.quiz')
        lv = await pg.evaluate('CS.currentLevel')
        hook_ok = q and all(k in q for k in ('price', 'paid', 'change', 'tray', 'step', 'miss')) and \
            lv and 'flat' in lv and q['change'] == round(q['paid'] - q['price'], 2) and q['paid'] in (10, 20, 50)
        rec('C2 钩子契约(change=paid-price)', bool(hook_ok), 'q=%s' % (q and {k: q[k] for k in ('price', 'paid', 'change')},))
        clicks, done = await play_level(pg, errs)
        await pg.wait_for_timeout(3200)
        stars = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
        rec('C3 flat1 真实贪心放币通关', done and stars == 3 and not errs, 'clicks=%d done=%s stars=%s errs=%s' % (clicks, done, stars, errs[:1]))
        await ctx.close()

        # C4 空/错提交口径
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        # 空提交：不计 miss
        await pg.locator('#pay-btn').click(force=True)
        await pg.wait_for_timeout(700)
        m0 = await pg.evaluate('CS.quiz.miss')
        # 放错币（多放一枚 5 元后提交=超额）→ 错一次；移回再通关
        await mouse_click_el(pg, '#coin-tray .coin:not(.gone)[data-v="5"]')
        await pg.wait_for_timeout(300)
        await pg.locator('#pay-btn').click(force=True)
        await pg.wait_for_timeout(700)
        m1 = await pg.evaluate('CS.quiz.miss')
        # 移回（点托盘币）再通关
        await mouse_click_el(pg, '#basket .tcoin')
        await pg.wait_for_timeout(400)
        clicks, done = await play_level(pg, errs)
        await pg.wait_for_timeout(3200)
        stars4 = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
        rec('C4 空提交不计次+1错=2★', m0 == 0 and m1 == 1 and done and stars4 == 2 and not errs,
            'm=%s→%s done=%s stars=%s errs=%s' % (m0, m1, done, stars4, errs[:1]))
        await ctx.close()

        # C5 flat10 ch3 带角通关
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(10))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        q5 = await pg.evaluate('CS.quiz')
        clicks, done = await play_level(pg, errs)
        await pg.wait_for_timeout(3200)
        stars5 = await pg.evaluate("(KIDS._save().levels['3-0'] || {}).stars || 0")
        has_jiao = q5 and (q5['price'] * 10) % 10 != 0
        rec('C5 flat10 ch3 通关(付20)', q5 and q5['paid'] == 20 and done and stars5 == 3 and not errs,
            'paid=%s clicks=%d done=%s stars=%s errs=%s' % (q5 and q5['paid'], clicks, done, stars5, errs[:1]))
        await ctx.close()

        # C6 教学链
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1500)
        await pg.evaluate(HOOK)
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(1000)
        await pg.evaluate(HOOK)
        # watch 期乱点（被吞 step 不动）；demoR 轮询等演示完成后出现
        sw = False
        demo_r = None
        sw_done = False
        for _ in range(60):
            t = await pg.evaluate('CS.tutorial || "none"')
            if t == 'watch' and not sw_done:
                st0 = await pg.evaluate('CS.quiz ? CS.quiz.step : -1')
                for _ in range(3):
                    await pg.evaluate("""(() => { const els = document.querySelectorAll('#coin-tray .coin:not(.gone)'); if (els.length) els[0].dispatchEvent(new PointerEvent('pointerdown', {bubbles:true,isPrimary:true})); })()""")
                    await pg.wait_for_timeout(300)
                st1 = await pg.evaluate('CS.quiz ? CS.quiz.step : -1')
                sw = st1 == st0
                sw_done = True
            demo_r = await pg.evaluate('window.__csDemoR || null')
            if demo_r or t == 'help':
                break
            await pg.wait_for_timeout(400)
        if demo_r is None:
            demo_r = await pg.evaluate('window.__csDemoR || null')
        rec('C6 教学 watch 吞输入+demoR', sw and demo_r == 'right' and not errs,
            'swallow=%s demoR=%s errs=%s' % (sw, demo_r, errs[:1]))
        await ctx.close()

        # C7 sayW 三态 + C12 ch4 数词拼接
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(HOOK)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        # flat1 两错：sayW 两条（flat<3 每错必播）
        for _ in range(2):
            await mouse_click_el(pg, '#coin-tray .coin:not(.gone)[data-v="5"]')
            await pg.wait_for_timeout(300)
            await pg.locator('#pay-btn').click(force=True)
            await pg.wait_for_timeout(900)
            await mouse_click_el(pg, '#basket .tcoin')
            await pg.wait_for_timeout(400)
        w1 = await pg.evaluate("window.__vlog.filter(x => x === 'P:cas_wrong' || (x.startsWith('Q:') && x.includes('cas_wrong'))).length")
        # flat5：三错=miss1 首发播+miss2 ===2 豁免播+miss3 节流静默（SPEC §0.5 口径）
        await pg.evaluate(seed(5))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        for _ in range(3):
            await mouse_click_el(pg, '#coin-tray .coin:not(.gone)[data-v="5"]')
            await pg.wait_for_timeout(300)
            await pg.locator('#pay-btn').click(force=True)
            await pg.wait_for_timeout(900)
            await mouse_click_el(pg, '#basket .tcoin')
            await pg.wait_for_timeout(400)
        w2 = await pg.evaluate("window.__vlog.filter(x => x === 'P:cas_wrong' || (x.startsWith('Q:') && x.includes('cas_wrong'))).length")
        m7c = await pg.evaluate('CS.quiz.miss')
        rec('C7 sayW 三态(flat1 两错播2/flat5 首发+豁免2+第三错静默)', w1 == 2 and w2 == 2 and m7c == 3, 'w1=%s w2=%s m=%s' % (w1, w2, m7c))
        # C12 ch4 题面 queue 全 clip（无 null 段）
        await pg.evaluate(seed(15))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await pg.evaluate(HOOK)
        await pg.evaluate("KIDS.voice._stop && KIDS.voice._stop(); window.__vlog = []")
        await pg.locator('#btn-hear, .hear-btn, #hear-btn').first.click(force=True, timeout=2500)
        await pg.wait_for_timeout(1500)
        qs = await pg.evaluate("window.__vlog.filter(x => x.startsWith('Q:'))")
        nullseg = any('null' in s for s in qs)
        big = await pg.evaluate('CS.quiz.paid')
        rec('C12 ch4 题面 queue 拼接全 clip', big == 50 and len(qs) >= 1 and not nullseg,
            'paid=%s q=%s' % (big, qs[:1]))
        await ctx.close()

        # C8 救援 + C9 演出窗 pop
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        # 放一枚探索币 → 10s 时应无救援
        await mouse_click_el(pg, '#coin-tray .coin:not(.gone)[data-v="5"]')
        await pg.wait_for_timeout(10000)
        r0 = await pg.evaluate('CS.rescues')
        await pg.wait_for_timeout(7000)              # 累计 17s > 14s 阈值
        r1 = await pg.evaluate('CS.rescues')
        fc = await pg.evaluate("(() => { const f = document.getElementById('find-card'); return f && f.classList.contains('show'); })()")
        br = await pg.evaluate("!!document.querySelector('#coin-tray .coin.breathe')")
        # C9 清托盘后正确提交，演出窗内连点 pay-btn
        while await pg.evaluate("!!document.querySelector('#basket .tcoin')"):
            await mouse_click_el(pg, '#basket .tcoin')
        await pg.wait_for_timeout(400)
        await greedy_fill(pg)
        await pg.evaluate('window.__vlog = []')
        await pg.locator('#pay-btn').click(force=True)
        await pg.wait_for_timeout(250)
        await pg.locator('#pay-btn').click(force=True)
        await pg.wait_for_timeout(500)
        pops = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        m9 = await pg.evaluate('CS.currentLevel.retries')
        rec('C8 救援放币不重置+15s触发', r0 == 0 and r1 >= 1 and fc and br and not errs,
            'r=%s→%s find=%s breathe=%s errs=%s' % (r0, r1, fc, br, errs[:1]))
        rec('C9 演出窗内提交键 pop', pops >= 1 and m9 == 0, 'pops=%s retries=%s' % (pops, m9))
        await ctx.close()

        # C10/C11 双 viewport+触摸+离线+clip
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(1800)
        r10 = await pg.evaluate("""(() => {
          const coins = [...document.querySelectorAll('#coin-tray .coin:not(.gone)')].map(c => Math.min(c.getBoundingClientRect().width, c.getBoundingClientRect().height));
          const pay = document.getElementById('pay-btn').getBoundingClientRect();
          const btns = [...document.querySelectorAll('button')].filter(x => !x.className.includes('k-parentbtn')).map(x => Math.min(x.getBoundingClientRect().width, x.getBoundingClientRect().height));
          return { minC: Math.min(...coins), pay: Math.min(pay.width, pay.height), minB: Math.min(...btns.filter(v => v > 0)), ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        offline = await pg.evaluate("![...document.querySelectorAll('*')].some(e => /https?:\\/\\/|src=|href=/.test((e.getAttribute && (e.getAttribute('src') || e.getAttribute('href'))) || '') || (e.style && String(e.style.backgroundImage).includes('http')))")
        html = (BASE / 'cashier' / 'index.html').read_text(encoding='utf-8')
        clip = html.count('data:audio')
        vp2 = await b.new_context(viewport={'width': 800, 'height': 1180})
        pg2 = await vp2.new_page()
        await pg2.goto(URL)
        await pg2.wait_for_timeout(1800)
        r10b = await pg2.evaluate("""(() => {
          const coins = [...document.querySelectorAll('#coin-tray .coin:not(.gone)')].map(c => Math.min(c.getBoundingClientRect().width, c.getBoundingClientRect().height));
          const pay = document.getElementById('pay-btn').getBoundingClientRect();
          return { minC: Math.min(...coins), pay: Math.min(pay.width, pay.height), ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        rec('C10 双viewport 触摸目标', r10['minC'] >= 64 and r10['pay'] >= 96 and r10['minB'] >= 64 and r10['ox'] == 0 and r10b['minC'] >= 64 and r10b['pay'] >= 96 and r10b['ox'] == 0,
            'desk c=%s pay=%s ox=%s | pad c=%s pay=%s ox=%s' % (r10['minC'], r10['pay'], r10['ox'], r10b['minC'], r10b['pay'], r10b['ox']))
        rec('C11 离线+clip注入', offline and clip >= 49, 'offline=%s clips=%s' % (offline, clip))
        await ctx.close()
        await vp2.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
