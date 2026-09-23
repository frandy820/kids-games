# -*- coding: utf-8 -*-
"""batch12 复验 · column 竖式小黑板（r15 难度改造 2026-09-16 独立拆出——原 verify_one_div_clm
column 段为 r12 五题/键 digits 驱动，r15 八题+计划驱动标记操作步全失配，改 divide 专属）
①verify 53/53 ②钩子（tapKey+tapMark 双通道）③真实通关 flat0(ch1)/flat8(ch2 借位)/flat24(ch4 两步)
  ——动作数 SPEC 精确推导：23=2+7×3 / 23=2+7×3 / 42=4+4×5+3×6 ④错按零惩罚(题级 miss+同格重填)
⑤sayW flat≥3 节流首条 ⑥救援填位相位+错点不重置 ⑥c/d 救援标记相位（进位句+槽 breathe/退位句+槽 breathe）
⑦教学吞输入(键+标记槽)+重玩门 ⑧双 viewport ⑨离线+截图+clips=14（clm_11+core_3）
断言全部从 SPEC-BATCH12 §3-r15 独立推导，不复用实现侧观察值。"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.join(',')); return _q(parts); };
  const _s = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _s(n); };
  return true;
})()"""

SEED = """const sv = KIDS._save();
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/8)+1)+'-'+(i%8)] = { stars: 3 };   // r15: 8 题/关
  sv.column = { tutSeen: true };
  if (n >= 8) KIDS.calendar.bonusSet(30);   // 撑日限≥n+1（limit=dayIndex×6+bonus，flat24 需≥25）
  KIDS.store.persist();"""

async def newpage(b, n, vp={'width': 1280, 'height': 800}, verify=False, delay=900):
    G = 'column'
    ctx = await b.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + (BASE / G / 'index.html').as_posix() + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(delay)
    if n is not None:
        await pg.evaluate('(n) => {%s}' % SEED, n)
        await pg.reload()
        await pg.wait_for_timeout(delay)
    return ctx, pg, errs

async def act(pg, q):
    """相位感知真实点击：fill=数字键 / carry|borrow=标记槽（r15 操作步）"""
    if q['phase'] == 'fill':
        await pg.locator('.key[data-d="%d"]' % q['need']).first.click(timeout=3000)
    else:
        await pg.locator('#mz-%s%d' % (q['mark']['t'], q['mark']['col'])).first.click(timeout=3000)

async def drive_column(pg):
    """真实点击整关通关（照 SPEC 顺序：加=填后标/减=标后填/两步=步1→步2）；返回 clicks+所见相位。
    每击前等 state.locked 解除——pointerdown 处理器不等 uiKey 异步收尾，过题板擦/换步锁窗内
    的点击会被吞（题界+1 假击）；quiz 空或 flat 变化（过关推进）即止，clicks=精确动作数。"""
    clicks = 0
    seen = {'carry': False, 'borrow': False, 'step2': False}
    flat0 = await pg.evaluate('CL.currentLevel.flat')
    for _ in range(400):
        q = await pg.evaluate('CL.quiz')
        if not q:
            break                                   # celebrate/通关窗（cur.done）
        if (await pg.evaluate('CL.currentLevel.flat')) != flat0:
            break                                   # 关已通关并推进（时序兜底）
        await pg.wait_for_function('!state.locked', timeout=8000)
        q = await pg.evaluate('CL.quiz')
        if not q:
            break
        seen['carry'] = seen['carry'] or q['phase'] == 'carry'
        seen['borrow'] = seen['borrow'] or q['phase'] == 'borrow'
        seen['step2'] = seen['step2'] or q.get('si') == 1
        try:
            await act(pg, q)
            clicks += 1
        except Exception:
            break
        await pg.wait_for_timeout(700)
    return clicks, seen


async def warmup_clicks(pg, k):
    """过热身题前 k 个正确动作（每击前等解锁；读相位驱动）"""
    for _ in range(k):
        await pg.wait_for_function('!state.locked', timeout=8000)
        q = await pg.evaluate('CL.quiz')
        if not q:
            break
        await act(pg, q)
        await pg.wait_for_timeout(700)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])
        try:
            # ---- C1 verify（横 1280x800；真竖全量重跑在 _selftest P1b） ----
            ctx, pg, errs = await newpage(b, None, verify=True)
            title = ''
            for _ in range(60):
                title = await pg.title()
                if 'VERIFY' in title:
                    break
                await pg.wait_for_timeout(1000)
            rec('C1 verify title 53/53', 'VERIFY PASS 53/53' in title and 'FAIL' not in title,
                title + ' errs=%s' % errs[:1])
            await ctx.close()

            # ---- C2/C3 真实通关 flat0(ch1)/flat8(ch2)/flat24(ch4)——动作数 SPEC 精确 ----
            for n, tag, want_clicks, want in ((0, 'ch1 加进位章', 23, ('carry',)),
                                              (8, 'ch2 退位章', 23, ('borrow',)),
                                              (24, 'ch4 两步章', 42, ('carry', 'borrow', 'step2'))):
                ctx, pg, errs = await newpage(b, n, delay=1500)
                if n == 0:
                    hk = await pg.evaluate(
                        "(() => ({ has: !!window.CL, tapK: typeof CL.tapKey, tapM: typeof CL.tapMark }))()")
                    rec('C2 钩子 CL 齐（tapKey+tapMark）',
                        hk['has'] and hk['tapK'] == 'function' and hk['tapM'] == 'function', str(hk))
                clicks, seen = await drive_column(pg)
                await pg.wait_for_timeout(5300)
                stars = await pg.evaluate("(KIDS._save().levels['%d-0'] || {}).stars || 0" % (n // 8 + 1))
                rec('C3 真实通关 flat%d(%s) 动作数=%d' % (n, tag, want_clicks),
                    stars >= 3 and clicks == want_clicks and not errs and all(seen[w] for w in want),
                    'clicks=%d stars=%s seen=%s errs=%s' % (clicks, stars, seen, errs[:1]))
                await ctx.close()

            # ---- C4 错按零惩罚（题级 miss=1+同格可重填）+ C5 sayW flat≥3 节流首条 ----
            ctx, pg, errs = await newpage(b, 5, delay=3200)
            await pg.evaluate(HOOK)
            await pg.evaluate('window.__vlog = []')
            q = await pg.evaluate('CL.quiz')
            wrong = (q['need'] + 1) % 10
            await pg.locator('.key[data-d="%d"]' % wrong).first.click()
            await pg.wait_for_timeout(800)
            st1 = await pg.evaluate(
                "(() => { const x = CL.quiz; return { miss: x.miss, phase: x.phase, cells: x.cells.slice() }; })()")
            v1 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:clm_')).length")
            q2 = await pg.evaluate('CL.quiz')
            await act(pg, q2)                      # 可重点：点对推进
            await pg.wait_for_timeout(800)
            st2 = await pg.evaluate("(() => { const x = CL.quiz; return x ? { step: x.step } : null; })()")
            rec('C4 错按零惩罚(题级miss+同格重填推进)',
                st1['miss'] == 1 and st1['phase'] == 'fill' and st1['cells'][0] is None and bool(st2),
                'st1=%s st2=%s' % (st1, st2))
            rec('C5 sayW flat5 一错一条(clm_hint)', v1 >= 1, 'v1=%d' % v1)
            await ctx.close()

            # ---- C6 救援填位相位：静置→重读题面+应填键 breathe；错点不重置 ----
            ctx, pg, errs = await newpage(b, 5, delay=3200)
            await pg.evaluate(HOOK)
            await pg.evaluate('window.__vlog = []')
            vis, resc = False, []
            for _ in range(24):
                vis = await pg.evaluate("!!document.querySelector('.key.breathe')")
                v = await pg.evaluate('window.__vlog')
                resc = [x for x in v if x.startswith('Q:') or x.startswith('P:clm_q')]
                if vis and resc:
                    break
                await pg.wait_for_timeout(1000)
            rec('C6 救援填位相位(重读clm_q+应填键breathe)', bool(resc) and vis and not errs,
                'rescue=%s vis=%s' % ([x[:14] for x in resc[:1]], vis))
            await pg.evaluate('window.__vlog = []')
            q = await pg.evaluate('CL.quiz')
            if q and q['phase'] == 'fill':
                await pg.locator('.key[data-d="%d"]' % ((q['need'] + 3) % 10)).first.click()
            resc2 = []
            for _ in range(20):
                await pg.wait_for_timeout(1000)
                v = await pg.evaluate('window.__vlog')
                resc2 = [x for x in v if x.startswith('Q:') or x.startswith('P:clm_')]
                if resc2:
                    break
            rec('C6b 错点不重置救援', bool(resc2), 'post=%s' % [x[:14] for x in resc2[:1]])
            await ctx.close()

            # ---- C6c 救援标记相位（进位）：flat5 热身 2 击后填个位→carry 相位静置→carry_go+槽 breathe ----
            ctx, pg, errs = await newpage(b, 5, delay=3200)
            await pg.evaluate(HOOK)
            await warmup_clicks(pg, 2)             # 热身题恰 2 填（SPEC：qi0 无标记）
            q = await pg.evaluate('CL.quiz')
            if q and q['phase'] == 'fill':
                await pg.wait_for_function('!state.locked', timeout=8000)
                await act(pg, q)                   # 进位题填个位 → carry 相位
                await pg.wait_for_timeout(700)
            await pg.evaluate('window.__vlog = []')
            ph = await pg.evaluate('CL.quiz.phase')
            vis, resc = False, []
            for _ in range(24):
                vis = await pg.evaluate("!!document.querySelector('.mzone.breathe')")
                v = await pg.evaluate('window.__vlog')
                resc = [x for x in v if x.startswith('P:clm_carry_go')]
                if vis and resc:
                    break
                await pg.wait_for_timeout(1000)
            rec('C6c 救援标记相位(进位句clm_carry_go+标记槽breathe)',
                ph == 'carry' and bool(resc) and vis and not errs,
                'phase=%s rescue=%s vis=%s' % (ph, resc[:1], vis))
            await ctx.close()

            # ---- C6d 救援标记相位（退位）：flat8 热身 2 击后借位题开题即 borrow 相位 ----
            ctx, pg, errs = await newpage(b, 8, delay=3200)
            await pg.evaluate(HOOK)
            await warmup_clicks(pg, 2)             # 热身题恰 2 填（SPEC：qi0 无标记）
            await pg.evaluate('window.__vlog = []')
            ph = await pg.evaluate('CL.quiz.phase')
            vis, resc = False, []
            for _ in range(24):
                vis = await pg.evaluate("!!document.querySelector('.mzone.breathe')")
                v = await pg.evaluate('window.__vlog')
                resc = [x for x in v if x.startswith('P:clm_borrow_go')]
                if vis and resc:
                    break
                await pg.wait_for_timeout(1000)
            rec('C6d 救援标记相位(退位句clm_borrow_go+标记槽breathe)',
                ph == 'borrow' and bool(resc) and vis and not errs,
                'phase=%s rescue=%s vis=%s' % (ph, resc[:1], vis))
            await ctx.close()

            # ---- C7 教学吞输入(键+标记槽)+重玩门 ----
            ctx, pg, errs = await newpage(b, None)
            await pg.evaluate(HOOK)
            tut = await pg.evaluate('CL.tutorial')
            pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
            await pg.locator('.key[data-d="1"]').first.click(timeout=3000, force=True)
            await pg.wait_for_timeout(600)
            pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
            sw = await pg.evaluate('CL.tapKey(1)')
            swm = await pg.evaluate("CL.tapMark('c', 1)")
            rec('C7 教学期点击被吞+轻叮(键与标记槽双通道)',
                tut == 'watch' and pops1 > pops0 and sw is False and swm is False,
                'tut=%s pops+%d tapKey=%s tapMark=%s' % (tut, pops1 - pops0, sw, swm))
            await pg.locator('#btn-replay').dispatch_event('pointerdown')
            seen = False
            for _ in range(18):
                await pg.wait_for_timeout(1000)
                seen = await pg.evaluate("!!(KIDS._save().column && KIDS._save().column.tutSeen)")
                if seen:
                    break
            rec('C7b 教学窗重玩门', seen and not errs, 'seen=%s errs=%s' % (seen, errs[:1]))
            await ctx.close()

            # ---- C8 双 viewport ----
            for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
                ctx, pg, errs = await newpage(b, 5, vp=vp)
                ox = await pg.evaluate(
                    "document.documentElement.scrollWidth - document.documentElement.clientWidth")
                small = await pg.evaluate(
                    "[...document.querySelectorAll('button, .key')].filter(e => !e.closest('.k-panel')"
                    " && !e.classList.contains('k-parentbtn') && e.offsetParent !== null)"
                    ".map(e => Math.min(e.offsetWidth, e.offsetHeight)).filter(v => v < 64).length")
                rec('C8 viewport %dx%d' % (vp['width'], vp['height']),
                    ox == 0 and small == 0 and not errs, 'ox=%s small=%s' % (ox, small))
                await ctx.close()

            # ---- C9 离线+截图+clips ----
            ctx, pg, errs = await newpage(b, 5)
            src = await pg.evaluate('document.documentElement.outerHTML')
            rec('C9a 离线断言',
                'http://' not in src.replace('http://www.w3.org', '') and 'https://' not in src, '')
            import statistics
            from PIL import Image
            shot = await pg.screenshot()
            img = Image.open(io.BytesIO(shot)).convert('L')
            sd = statistics.pstdev(list(img.resize((160, 100)).getdata()))
            rec('C9b 截图非空白', sd > 5, 'stdev=%.1f' % sd)
            n_clip = await pg.evaluate('Object.keys(KIDS.voice.clips).length')
            rec('C9c 语音注入对账(11clm+3core=14)', n_clip == 14, 'clips=%d' % n_clip)
            await ctx.close()
        finally:
            await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
