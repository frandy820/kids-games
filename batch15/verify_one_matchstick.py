# -*- coding: utf-8 -*-
"""batch15 matchstick 独立复验（第三侧：不复用游戏 SEGSET/evalCells/engSolve）
M1 VERIFY | M2 钩子契约 | M3 flat1 真实通关 3★ | M4 中间态零惩罚+一错 2★+错后可再移
M5 有解性分源穷举(40关：谜面不成立+≥1解+存储解有效+ch1-3纯数字+ch4符号参与)
M6 教学链（吞输入+demoR）| M7 sayW 三态 | M8 救援 14s（探索不重置）
M9 段集渲染对账+双viewport+触摸命中≥64+离线+clip | M10 flat10 ch3 两位数通关+flat15 ch4 通关"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'matchstick' / 'index.html').as_posix()
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
  sv.matchstick = { tutSeen: true };
  %s
  KIDS.store.persist();""" % (n, stars, 'KIDS.calendar.bonusSet(10);' if n >= 10 else '')

# 第三侧独立库：段集表/求值/槽枚举全部自写（禁读页面 SEGSET/evalCells/engSolve）
MYLIB = """
  const SS = {0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgcde',7:'abc',8:'abcdefg',9:'abcdfg'};
  const REF = [];
  for (let d = 0; d <= 9; d++) { const o = [0,0,0,0,0,0,0]; for (const ch of SS[d]) o['abcdefg'.indexOf(ch)] = 1; REF.push(o); }
  const myDigit = segs => { for (let d = 0; d <= 9; d++) { let eq = true; for (let i = 0; i < 7; i++) if (!!REF[d][i] !== !!segs[i]) { eq = false; break; } if (eq) return d; } return null; };
  const myEval = cells => { let phase = 0, nums = [0,0,0], op = null, hasOp = false, valid = true;
    for (const c of cells) {
      if (c.kind === 'd') { const d = myDigit(c.segs); if (d == null) { valid = false; break; } nums[phase] = nums[phase] * 10 + d; }
      else if (c.kind === 'op') { if (hasOp || phase !== 0 || !c.segs[0]) { valid = false; break; } op = c.segs[1] ? '+' : '-'; hasOp = true; phase = 1; }
      else { if (phase !== 1) { valid = false; break; } phase = 2; } }
    if (!valid || !hasOp || phase !== 2) return { valid: false, ok: false };
    return { valid: true, ok: (op === '+' ? nums[0] + nums[1] : nums[0] - nums[1]) === nums[2] }; };
  const mySlots = cells => { const O = [], E = []; for (let i = 0; i < cells.length; i++) { if (cells[i].kind === 'eq') continue; for (let j = 0; j < cells[i].segs.length; j++) (cells[i].segs[j] ? O : E).push(i * 8 + j); } return [O, E]; };
  const myApply = (cells, src, dst) => { const c = cells.map(x => ({ kind: x.kind, segs: x.segs.map(Boolean) })); c[Math.floor(src / 8)].segs[src % 8] = false; c[Math.floor(dst / 8)].segs[dst % 8] = true; return c; };
"""

SOLVE_JS = "(() => {" + MYLIB + """
  const q = MS.quiz; if (!q) return null;
  const cells = q.expr.map(c => ({ kind: c.kind, segs: c.segs.map(Boolean) }));
  const [O, E] = mySlots(cells);
  for (const src of O) for (const dst of E) if (dst !== src) {
    if (myEval(myApply(cells, src, dst)).ok) return { src: src, dst: dst };
  }
  return null;
})()"""

WRONG_JS = "(() => {" + MYLIB + """
  const q = MS.quiz; if (!q) return null;
  const cells = q.expr.map(c => ({ kind: c.kind, segs: c.segs.map(Boolean) }));
  const [O, E] = mySlots(cells);
  let fallback = null;
  for (const src of O) for (const dst of E) if (dst !== src) {
    const ev = myEval(myApply(cells, src, dst));
    if (ev.valid && !ev.ok) return { src: src, dst: dst };
    if (!ev.ok && !fallback) fallback = { src: src, dst: dst };
  }
  return fallback;
})()"""

AUDIT_JS = "(() => {" + MYLIB + """
  const bad = [];
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    let opQuiz = 0;
    for (const q of L.quizzes) {
      const cells = q.cells.map(c => ({ kind: c.kind, segs: c.segs.map(Boolean) }));
      const face = myEval(cells);
      let solN = 0;
      const [O, E] = mySlots(cells);
      for (const src of O) for (const dst of E) if (dst !== src) {
        if (myEval(myApply(cells, src, dst)).ok) solN++;
      }
      const solOk = myEval(myApply(cells, q.solution.src, q.solution.dst)).ok;
      const isOpSlot = s => cells[Math.floor(s / 8)].kind === 'op';
      const solOp = isOpSlot(q.solution.src) || isOpSlot(q.solution.dst);
      if (solOp) opQuiz++;
      if (!face.valid || face.ok || solN < 1 || !solOk) bad.push({ flat: flat, v: face.valid, ok: face.ok, solN: solN, solOk: solOk });
      if (L.dch < 4 && solOp) bad.push({ flat: flat, dch: L.dch, leakOp: true });
    }
    if (L.dch === 4 && opQuiz < 1) bad.push({ flat: flat, dch: 4, noOpQuiz: true });
  }
  return bad.slice(0, 3);
})()"""

async def click_svg_el(pg, pred):
    """采样找「命中该元素自身」的坐标再真实点击——op 竖槽与横杆同心交叉，
    后画横杆在上层，点包围盒中心会被横杆截获（须点竖槽外露端带，同真实玩家）"""
    pos = await pg.evaluate("""(p => { const e = document.querySelector(p); if (!e) return null;
      const b = e.getBoundingClientRect();
      const cands = [{ x: b.left + b.width / 2, y: b.top + b.height / 2 }];
      for (const fy of [0.08, 0.14, 0.86, 0.92]) cands.push({ x: b.left + b.width / 2, y: b.top + b.height * fy });
      for (const fx of [0.08, 0.14, 0.86, 0.92]) cands.push({ x: b.left + b.width * fx, y: b.top + b.height / 2 });
      for (const c of cands) { const hit = document.elementFromPoint(c.x, c.y); if (hit && e.contains(hit)) return c; }
      return null; })('%s')""" % pred)
    if pos is None:
        return False
    await pg.mouse.click(pos['x'], pos['y'])
    return True

async def wait_ready(pg, timeout=9000):
    for _ in range(int(timeout / 250)):
        st = await pg.evaluate('MS.currentLevel')
        if st is None or (not st['locked'] or st['won']):
            return
        await pg.wait_for_timeout(250)

async def do_move(pg, mv):
    ok1 = await click_svg_el(pg, '.stk[data-slot="%d"]' % mv['src'])
    await pg.wait_for_timeout(450)
    ok2 = await click_svg_el(pg, '.slot[data-slot="%d"]' % mv['dst'])
    return ok1 and ok2

async def play_level(pg):
    clicks = 0
    for _ in range(8):
        if not await pg.evaluate('MS.quiz'):
            break
        mv = await pg.evaluate(SOLVE_JS)
        if not mv:
            return clicks, False
        if not await do_move(pg, mv):
            return clicks, False
        clicks += 1
        await wait_ready(pg)
        await pg.wait_for_timeout(250)
    lv = await pg.evaluate('MS.currentLevel')
    return clicks, bool(lv and lv.get('done'))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # M1 VERIFY + M5 40 关分源穷举
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
        rec('M1 VERIFY title', title == 'VERIFY PASS 50/50' and not errs, 'title=%s errs=%s' % (title, errs[:1]))
        bad = await pg.evaluate(AUDIT_JS)
        rec('M5 有解性分源穷举(40关:不成立+≥1解+存储解+ch1-3纯数字+ch4符号)', len(bad) == 0, 'bad=%s' % bad)
        await ctx.close()

        # M2 钩子 + M3 flat1 真实通关
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        q = await pg.evaluate('MS.quiz')
        lv = await pg.evaluate('MS.currentLevel')
        hook_ok = q and all(k in q for k in ('expr', 'left', 'right', 'ok', 'step', 'miss', 'held')) and \
            lv and 'dch' in lv and q['ok'] is False and q['left'] is not None
        rec('M2 钩子契约(expr+left/right+ok=false 谜面)', bool(hook_ok), 'q.ok=%s left=%s right=%s dch=%s' % (q and q['ok'], q and q['left'], q and q['right'], lv and lv['dch']))
        clicks, done = await play_level(pg)
        await pg.wait_for_timeout(3400)
        stars = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
        rec('M3 flat1 真实拿放通关3★', done and stars == 3 and not errs, 'clicks=%d done=%s stars=%s errs=%s' % (clicks, done, stars, errs[:1]))
        await ctx.close()

        # M4 中间态零惩罚 + 一错 2★ + 错后火柴回原位可再移
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        mv = await pg.evaluate(SOLVE_JS)
        # 拿起→再点同根=放回（中间态零惩罚）
        await click_svg_el(pg, '.stk[data-slot="%d"]' % mv['src'])
        await pg.wait_for_timeout(400)
        held_mid = await pg.evaluate('MS.quiz.held')
        await click_svg_el(pg, '.stk[data-slot="%d"]' % mv['src'])
        await pg.wait_for_timeout(400)
        st_back = await pg.evaluate('({miss: MS.quiz.miss, held: MS.quiz.held})')
        # 拿起→错放：miss+1，火柴回原位（原槽火柴仍在=可再移）
        wv = await pg.evaluate(WRONG_JS)
        await click_svg_el(pg, '.stk[data-slot="%d"]' % wv['src'])
        await pg.wait_for_timeout(450)
        await click_svg_el(pg, '.slot[data-slot="%d"]' % wv['dst'])
        await pg.wait_for_timeout(500)
        wig = await pg.evaluate("!!document.querySelector('svg.eq.shake')")
        await wait_ready(pg)
        st_w = await pg.evaluate('({miss: MS.quiz.miss, held: MS.quiz.held})')
        back_ok = await pg.evaluate("(!!document.querySelector('.stk[data-slot=\"%d\"]'))" % wv['src'])
        clicks, done = await play_level(pg)
        await pg.wait_for_timeout(3400)
        stars4 = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
        rec('M4 中间态零惩罚(拿起放回miss=0)+一错2★+错后可再移',
            held_mid == mv['src'] and st_back['miss'] == 0 and st_back['held'] is None and
            wig and st_w['miss'] == 1 and st_w['held'] is None and back_ok and done and stars4 == 2 and not errs,
            'mid=%s back=%s wig=%s w=%s backOk=%s done=%s stars=%s errs=%s' % (held_mid == mv['src'], st_back, wig, st_w, back_ok, done, stars4, errs[:1]))
        await ctx.close()

        # M6 教学链
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
        sw = False
        demo_r = None
        sw_done = False
        for _ in range(70):
            t = await pg.evaluate('MS.tutorial')
            if t == 'watch' and not sw_done:
                st0 = await pg.evaluate('MS.quiz ? MS.quiz.step : -1')
                for _ in range(3):
                    await pg.evaluate("""(() => { const e = document.querySelector('.stk:not(.locked)'); if (e) e.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, isPrimary: true})); })()""")
                    await pg.wait_for_timeout(300)
                st1 = await pg.evaluate('MS.quiz ? MS.quiz.step : -1')
                sw = st1 == st0
                sw_done = True
            demo_r = await pg.evaluate('window.__msDemoR || null')
            if demo_r or t == 'help':
                break
            await pg.wait_for_timeout(400)
        if demo_r is None:
            demo_r = await pg.evaluate('window.__msDemoR || null')
        rec('M6 教学 watch 吞输入+demoR', sw and demo_r == 'right' and not errs,
            'swallow=%s demoR=%s errs=%s' % (sw, demo_r, errs[:1]))
        await ctx.close()

        # M7 sayW 三态
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(HOOK)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        for _ in range(2):                       # flat1（<3）两错：每错必播
            wv = await pg.evaluate(WRONG_JS)
            await do_move(pg, wv)
            await wait_ready(pg)
        w1 = await pg.evaluate("window.__vlog.filter(x => x === 'P:ms_wrong').length")
        await pg.evaluate(seed(5))
        await pg.reload()
        await pg.wait_for_timeout(3200)
        await pg.evaluate(HOOK)
        for _ in range(3):                       # flat5（≥3）三错：首发+miss2豁免+第三错节流静默
            wv = await pg.evaluate(WRONG_JS)
            await do_move(pg, wv)
            await wait_ready(pg)
        w2 = await pg.evaluate("window.__vlog.filter(x => x === 'P:ms_wrong').length")
        m7 = await pg.evaluate('MS.quiz.miss')
        rec('M7 sayW 三态(flat1 两错播2/flat5 首发+豁免2+第三错静默)', w1 == 2 and w2 == 2 and m7 == 3, 'w1=%s w2=%s m=%s' % (w1, w2, m7))
        await ctx.close()

        # M8 救援（探索拿起放回不重置 → 14s 触发）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2200)
        mv = await pg.evaluate(SOLVE_JS)
        await click_svg_el(pg, '.stk[data-slot="%d"]' % mv['src'])
        await pg.wait_for_timeout(350)
        await click_svg_el(pg, '.stk[data-slot="%d"]' % mv['src'])   # 放回=探索，不重置
        await pg.wait_for_timeout(8500)          # 钟龄 ~11.5s < 14s
        r0 = await pg.evaluate('MS.rescues')
        await pg.wait_for_timeout(6000)          # 钟龄 ~17.5s > 14s
        r1 = await pg.evaluate('MS.rescues')
        pu = await pg.evaluate("!!document.querySelector('.stk.pulse3')")
        rec('M8 救援探索不重置+14s触发', r0 == 0 and r1 >= 1 and pu and not errs,
            'r=%s→%s pulse=%s errs=%s' % (r0, r1, pu, errs[:1]))
        await ctx.close()

        # M9 段集渲染对账 + 双 viewport + 触摸命中 + 离线 + clip
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(15))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        recon = await pg.evaluate("""(() => {
          const q = MS.quiz; const bad = [];
          const scene = document.getElementById('scene');
          const inCell = (ci, sel) => [...scene.querySelectorAll(sel)].filter(e => { const s = +e.dataset.slot; return Math.floor(s / 8) === ci; });
          q.expr.forEach((c, ci) => {
            if (c.kind === 'd') {
              const want = 'abcdefg'.split('').filter((s, j) => c.segs[j]).sort().join('');
              const st = inCell(ci, '.stk[data-slot]').map(e => e.dataset.seg).sort().join('');
              const nSlot = inCell(ci, '.slot[data-slot]').length;
              if (st !== want || nSlot !== 7 - want.length) bad.push({ ci: ci, dom: st, want: want, nSlot: nSlot });
            }
            if (c.kind === 'op') {
              const nStk = inCell(ci, '.stk[data-slot]').length, nSlot = inCell(ci, '.slot[data-slot]').length;
              if (c.segs[1] ? (nStk !== 2 || nSlot !== 0) : (nStk !== 1 || nSlot !== 1)) bad.push({ ci: ci, op: c.segs, nStk: nStk, nSlot: nSlot });
            }
          });
          const eqStk = scene.querySelectorAll('.stk.locked').length;
          if (eqStk !== 2) bad.push({ eq: eqStk });
          return bad.slice(0, 3);
        })()""")
        r9 = await pg.evaluate("""(() => {
          const hits = [...document.querySelectorAll('#scene .hit')].map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); });
          const btns = [...document.querySelectorAll('button')].filter(x => !x.className.includes('k-parentbtn')).map(x => { const b = x.getBoundingClientRect(); return Math.min(b.width, b.height); }).filter(v => v > 0);
          const eq = document.querySelector('svg.eq').getBoundingClientRect();
          return { minHit: Math.min(...hits), minBtn: Math.min(...btns), eqW: eq.width, eqH: eq.height,
            ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        vp2 = await b.new_context(viewport={'width': 800, 'height': 1180})
        pg2 = await vp2.new_page()
        await pg2.goto(URL)
        await pg2.wait_for_timeout(2000)
        r9b = await pg2.evaluate("""(() => {
          const hits = [...document.querySelectorAll('#scene .hit')].map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); });
          return { minHit: Math.min(...hits), eqW: document.querySelector('svg.eq').getBoundingClientRect().width,
            ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        html = (BASE / 'matchstick' / 'index.html').read_text(encoding='utf-8')
        nclip = html.count('data:audio')
        offline = ('src="http' not in html) and ("href='http" not in html) and ('href="http' not in html)
        rec('M9 段集渲染对账(ch4 含符号/等号)', len(recon) == 0, 'bad=%s' % recon)
        rec('M9 双viewport+触摸命中≥64+场景+离线+clip',
            r9['minHit'] >= 64 and r9['minBtn'] >= 64 and r9['eqW'] >= 200 and r9['eqH'] >= 150 and r9['ox'] == 0 and
            r9b['minHit'] >= 64 and r9b['eqW'] >= 200 and r9b['ox'] == 0 and offline and nclip == 11 and not errs,
            'desk hit=%s btn=%s eq=%sx%s ox=%s | pad hit=%s ox=%s offline=%s clip=%s' % (r9['minHit'], r9['minBtn'], r9['eqW'], r9['eqH'], r9['ox'], r9b['minHit'], r9b['ox'], offline, nclip))
        # M10a flat15 ch4 真实通关
        clicks15, done15 = await play_level(pg)
        await pg.wait_for_timeout(3400)
        stars15 = await pg.evaluate("(KIDS._save().levels['4-0'] || {}).stars || 0")
        await ctx.close()
        await vp2.close()

        # M10b flat10 ch3 两位数通关
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(10))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        nD = await pg.evaluate("MS.quiz.expr.filter(c => c.kind === 'd').length")
        clicks10, done10 = await play_level(pg)
        await pg.wait_for_timeout(3400)
        stars10 = await pg.evaluate("(KIDS._save().levels['3-0'] || {}).stars || 0")
        rec('M10 flat10 ch3 两位数通关+flat15 ch4 通关', nD >= 3 and done10 and stars10 == 3 and done15 and stars15 == 3 and not errs,
            'ch3 nD=%s clicks=%d stars=%s | ch4 clicks=%d stars=%s errs=%s' % (nD, clicks10, stars10, clicks15, stars15, errs[:1]))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
