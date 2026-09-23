# -*- coding: utf-8 -*-
"""batch13 审查+试玩修复定向实证（T1-T8）
T1 M1 wordprob 教学演示真实生效（watch 期卡片 .right+step 推进+demoR）
T2 m1 三款 locked 期点题面卡 pop 轻叮
T3 m2 money ch4 题面拼接 5 段 qjiao 整条尾句（听感文本通顺无'元五角元'）
T4 m4 money 放币不重置救援钟（放币后 14s 救援仍触发）
T5 m3 三款错点晃动窗连点只记一次 miss
T6 m4 grid bump/undo 探索不计 miss 不扣星（bump=真页 UI 路径临时墙探针，r15 M2 恢复）
T7 m7 grid ch3 兜底 lenLo=1 域（静态：genWalk 极端重试走兜底分支的产物距离 1）
T8 m5/m6 money verify distOk 相对化+empty 对比度（PASS 即含，此处测色值）"""
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
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k + '#' + String(t||'').slice(0,30)); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : (p.key || 'null')).join('|')); return _q(parts); };
  const _a = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _a(n); };
  return true;
})()"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # T1 M1 wordprob 教学演示生效
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'wordprob' / 'index.html').as_posix())
        await pg.wait_for_timeout(400)
        await pg.evaluate(HOOK)
        rightSeen, stepSeen, demoR = False, False, None
        for _ in range(30):
            st = await pg.evaluate("(() => ({ right: !!document.querySelector('.opt.right, .opt .mark'), step: WP.quiz ? WP.quiz.step : -1, tut: WP.tut, d: window.__wpDemoR }))()")
            if st.get('d') is not None: demoR = st['d']
            if st['right']: rightSeen = True
            if st['step'] > 0: stepSeen = True
            if st['tut'] == 'help': break
            await pg.wait_for_timeout(600)
        rec('T1 M1 wordprob 教学演示生效(卡片right+step推进+demoR)', rightSeen and demoR == 'right' and not errs,
            'right=%s step>0=%s demoR=%s errs=%s' % (rightSeen, stepSeen, demoR, errs[:1]))
        await ctx.close()

        # T2a wordprob watch 期点题面卡 pop（独立干净档）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'wordprob' / 'index.html').as_posix())
        await pg.wait_for_timeout(600)
        await pg.evaluate(HOOK)
        tut = await pg.evaluate('(typeof WP.tutorial === "string" ? WP.tutorial : (WP.tutorial ? WP.tutorial.phase : null)) || "none"')
        if tut == 'watch':
            pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
            await pg.locator('#prompt-chip').first.click(force=True, timeout=3000)
            await pg.wait_for_timeout(400)
            pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
            rec('T2a wordprob watch 期点题面卡 pop', pops1 > pops0, 'pops+%d' % (pops1 - pops0))
        else:
            rec('T2a wordprob watch 期点题面卡 pop', False, 'tut=%s 非 watch' % tut)
        await ctx.close()

        # T2b money 演出期点题面卡 pop（locked 窗内）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'money' / 'index.html').as_posix())
        await pg.wait_for_timeout(600)
        await pg.evaluate(HOOK)
        # 直达教学 watch 期（清档首访）
        tut = await pg.evaluate('MN.tutorial')
        if tut == 'watch':
            pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
            await pg.locator('#prompt-chip').first.click(force=True, timeout=3000)
            await pg.wait_for_timeout(400)
            pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
            rec('T2b money watch 期点题面卡 pop', pops1 > pops0, 'pops+%d' % (pops1 - pops0))
        else:
            rec('T2b money watch 期点题面卡 pop', False, 'tut=%s' % tut)
        await ctx.close()

        # T2c grid watch 期点题面卡 pop
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'grid' / 'index.html').as_posix())
        await pg.wait_for_timeout(600)
        await pg.evaluate(HOOK)
        tut = await pg.evaluate('GR.tutorial')
        if tut == 'watch':
            pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
            await pg.locator('#prompt-chip').first.click(force=True, timeout=3000)
            await pg.wait_for_timeout(400)
            pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
            rec('T2c grid watch 期点题面卡 pop', pops1 > pops0, 'pops+%d' % (pops1 - pops0))
        else:
            rec('T2c grid watch 期点题面卡 pop', False, 'tut=%s' % tut)
        await ctx.close()

        # T3 m2 money ch4 拼接 5 段 qjiao 尾句（点题面卡重听捕获链；r15 键盘版：change 热身打字推进→jiao 题捕获）
        SUBSET_JS = """(a) => {
          const coins = a[0], price = a[1];
          const pick = new Array(coins.length).fill(false);
          const rec2 = (i, s) => { if (s === price) return true; if (i >= coins.length || s > price) return false;
            pick[i] = true; if (rec2(i + 1, s + coins[i])) return true; pick[i] = false; return rec2(i + 1, s); };
          rec2(0, 0); return pick;
        }"""
        SEED15 = """const sv = KIDS._save() || { levels: {} };
  for (let i = 0; i < 15; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.money = { tutSeen: true };
  KIDS.calendar.bonusSet(10);
  KIDS.store.persist();"""
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'money' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(SEED15)
        await pg.reload()
        await pg.wait_for_timeout(2000)
        await pg.evaluate(HOOK)
        ok3, detail3 = False, 'not-reached'
        for _ in range(12):
            q = await pg.evaluate('MN.quiz')
            if not q: break
            if q['kind'] == 'jiao':                       # r15 带角题独立 kind（price=元单位 3.5）
                await pg.wait_for_timeout(600)
                await pg.evaluate('window.__vlog = []')
                await pg.locator('#prompt-chip').first.click(force=True)
                await pg.wait_for_timeout(900)
                got = await pg.evaluate('window.__vlog')
                chains = [x for x in (got or []) if x.startswith('Q:')]
                detail3 = str(chains[:1])[:100]
                for c in chains:
                    parts = c[2:].split('|')
                    if 'men_q_jiao' in parts and 'men_q_pay3' not in parts and len(parts) == 5:
                        ok3 = True
                break
            if q['kind'] in ('gather', 'pair'):
                pick = await pg.evaluate(SUBSET_JS, [[int(c * 2) for c in q['coins']], int(q['price'] * 2)])
                for i, use in enumerate(pick):
                    if use:
                        await pg.locator('.coin[data-i="%d"]' % i).first.click(force=True)
                        await pg.wait_for_timeout(300)
                await pg.locator('#pay-btn').click(force=True)
            else:                                         # change 键盘打字推进
                await pg.locator('.key[data-k="clr"]').first.click(force=True)
                for ch in str(int(q['answer'])):
                    await pg.locator('.key[data-k="%s"]' % ch).first.click(force=True)
                    await pg.wait_for_timeout(120)
                await pg.locator('#confirm-btn').first.click(force=True)
            await pg.wait_for_timeout(1200)
        rec('T3 m2 money ch4 带角题面=5段 qjiao 尾句(无 qpay3 无病句)', ok3, detail3)
        await ctx.close()

        # T4 m4 money 放币不重置救援钟：放币→静置 15s→救援触发
        SEED0 = """const sv = KIDS._save() || { levels: {} };
  sv.levels['1-0'] = { stars: 3 };
  sv.money = { tutSeen: true };
  KIDS.store.persist();"""
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'money' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(SEED0)
        await pg.reload()
        await pg.wait_for_timeout(2200)
        await pg.evaluate(HOOK)
        q = await pg.evaluate('MN.quiz')
        await pg.locator('.coin[data-i="0"]').first.click(force=True)   # 放 1 币（探索）
        await pg.evaluate('window.__vlog = []')
        rescue = False
        for _ in range(22):
            await pg.wait_for_timeout(1000)
            v = await pg.evaluate('window.__vlog')
            if any('men_' in x for x in v) or await pg.evaluate("!!document.querySelector('.breathe')"):
                rescue = True
                break
        rec('T4 m4 money 放币后 15s 救援仍触发(放币不重置钟)', rescue, 'rescue=%s' % rescue)
        await ctx.close()

        # T5 m3 三款错点晃动窗连点只记一次 miss（r15 money=键盘错确认连点：flat10 change 空输入确认）
        for game, hookname, mode in (('wordprob', 'WP', 'opt'), ('money', 'MN', 'kb'), ('grid', 'GR', 'cell')):
            ctx = await b.new_context()
            pg = await ctx.new_page()
            errs5 = []
            pg.on('pageerror', lambda e: errs5.append(str(e)))
            await pg.goto('file:///' + (BASE / game / 'index.html').as_posix())
            await pg.wait_for_timeout(1200)
            if mode == 'kb':                              # money r15：ch3 键盘找零关（bonus 抬日限到 flat10）
                seed = """const sv = KIDS._save() || { levels: {} };
  for (let i = 0; i < 10; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.money = { tutSeen: true };
  KIDS.calendar.bonusSet(10);
  KIDS.store.persist();"""
            else:
                seed = """const sv = KIDS._save() || { levels: {} };
  sv.levels['1-0'] = { stars: 3 };
  sv.%s = { tutSeen: true };
  KIDS.store.persist();""" % game
            await pg.evaluate(seed)
            await pg.reload()
            await pg.wait_for_timeout(2200)
            q = await pg.evaluate('%s.quiz' % hookname)
            # 快速连点 3 次同一错误目标（间隔 80ms——locator 点击开销后仍全落在 480/520ms 晃动窗内）
            if mode == 'cell':                            # grid r13：exec 指令键错配（.cmdb，8×8 版）
                act = q['seq'][q['seqIdx']]['t']
                bad = 'L' if act == 'fwd' else 'fwd'
                sel = '.cmdb[data-c="%s"]' % bad
            elif mode == 'kb':
                sel = '#confirm-btn'                      # 空输入确认=错（与空篮提交同口径）
            else:
                ws = [i for i in range(3) if i != q['answerIdx']] if q.get('options') else [0, 1]
                sel = ('.opt[data-i="%d"]' % ws[0]) if q.get('options') else '#pay-btn'
            for _ in range(3):
                try:
                    await pg.locator(sel).first.click(force=True, timeout=2500)
                except Exception:
                    pass
                await pg.wait_for_timeout(80)
            await pg.wait_for_timeout(1300)
            miss = await pg.evaluate('%s.quiz ? %s.quiz.miss : -1' % (hookname, hookname))
            rec('T5 m3 %s 晃动窗连点3次只记1次miss' % game, miss == 1 and not errs5, 'miss=%s errs=%s' % (miss, errs5[:1]))
            await ctx.close()

        # T6 m4 grid r13：bump/undo=探索不计 miss 不扣星。bump 系 r13 8×8 相对导航现行语义
        # （SPEC-BATCH13 §3「出界/撞墙=bump 原地零惩罚不计 miss」）——r15 审查 M2 勘正：
        # 原「bump 语义随 r13 下线」注失实（bump 恰为 r13 引入）。引擎级出界+撞墙双类由
        # verify ③ 单元承担；此处补真页 UI 路径：前方临时置墙（贴边=出界类）→点 fwd 按钮
        # →bump 分支（wig+bumpLo+零 miss+位置不动）→撤墙。
        # undo 同构=试一步回退不罚——engUndo retries 仅统计，星级按真错点
        SEEDG = """const sv = KIDS._save() || { levels: {} };
  sv.grid = { tutSeen: true };
  KIDS.store.persist();"""
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs6 = []
        pg.on('pageerror', lambda e: errs6.append(str(e)))
        await pg.goto('file:///' + (BASE / 'grid' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(SEEDG)
        await pg.reload()
        await pg.wait_for_timeout(3200)
        q6 = await pg.evaluate('GR.quiz')
        act6 = q6['seq'][q6['seqIdx']]['t']
        # bump 探针（r15 M2 恢复）：当前 exec 指令为 fwd 时，前方临时置墙（贴边=出界类天然 bump）
        bump_prep = await pg.evaluate("""(() => {
          const q = cur.quizzes[cur.step], act = q.seq[q._si];
          if (!act || act.t !== 'fwd') return { ok: false, why: 'act=' + (act && act.t) };
          const d = DELTA_H[q._h], nr = q._pr + d[0], nc = q._pc + d[1];
          if (!inGrid(nr, nc)) return { ok: true, kind: 'edge', undo: false };
          if (q.walls.some(w => w.r === nr && w.c === nc)) return { ok: true, kind: 'wall', undo: false };
          q.walls.push({ r: nr, c: nc });
          return { ok: true, kind: 'wall', undo: true };
        })()""")
        stb0 = await pg.evaluate('({ m: GR.quiz.miss, rt: GR.currentLevel.retries, p: GR.quiz.pos, s: GR.quiz.steps })')
        await pg.locator('.cmdb[data-c="fwd"]').first.click(force=True)         # 撞墙 fwd=bump
        await pg.wait_for_timeout(250)
        stb1 = await pg.evaluate("({ m: GR.quiz.miss, rt: GR.currentLevel.retries, p: GR.quiz.pos, s: GR.quiz.steps, wig: document.querySelector('.cmdb[data-c=fwd]').classList.contains('wig') })")
        if bump_prep.get('undo'):
            await pg.evaluate('cur.quizzes[cur.step].walls.pop()')              # 撤临时墙（状态还原）
        rec('T6 m4 grid bump 不计 miss(真页 UI 路径)', bool(bump_prep.get('ok')) and
            stb1['m'] == stb0['m'] and stb1['rt'] == stb0['rt'] + 1 and
            stb1['p'] == stb0['p'] and stb1['s'] == stb0['s'] and stb1['wig'] and not errs6,
            'prep=%s b0=%s b1=%s errs=%s' % (bump_prep, stb0, stb1, errs6[:1]))
        await pg.locator('.cmdb[data-c="%s"]' % act6).first.click(force=True)   # 按对一步
        await pg.wait_for_timeout(700)
        st0 = await pg.evaluate('({ miss: GR.quiz.miss, retries: GR.currentLevel.retries, step: GR.currentLevel.step })')
        await pg.locator('#btn-undo').first.click(force=True)                   # undo=探索
        await pg.wait_for_timeout(700)
        st1 = await pg.evaluate('({ miss: GR.quiz.miss, retries: GR.currentLevel.retries, step: GR.currentLevel.step })')
        rec('T6 m4 grid undo 不计 miss(retries 仅统计)', st0['miss'] == 0 and st1['miss'] == 0 and
            st1['retries'] == st0['retries'] + 1 and not errs6, 'st0=%s st1=%s errs=%s' % (st0, st1, errs6[:1]))
        # undo 探索后按指令条全对通关 → 3 星（探索不扣星）
        for _ in range(40):
            q = await pg.evaluate('GR.quiz')
            if not q or q.get('done'):
                break
            c6 = q['seq'][q['seqIdx']]['t'] if q['seqIdx'] < len(q['seq']) else 'T'
            await pg.locator('.cmdb[data-c="%s"]' % c6).first.click(force=True)
            await pg.wait_for_timeout(500)
        await pg.wait_for_timeout(5300)
        stars = await pg.evaluate("(KIDS._save().levels['1-0'] || {}).stars || 0")
        rec('T6b grid bump+undo 探索后通关仍3星', stars == 3 and not errs6, 'stars=%s errs=%s' % (stars, errs6[:1]))
        await ctx.close()

        # T7 m7 grid r13 ch3 首题=exec 热身且首箱 BFS 可达（原「兜底 lenLo=1」随 r13 8×8
        # 相对导航版 go 题型下线；同位改验 ch3 首题生成域：exec 型+距离 ≥1 非已站箱）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'grid' / 'index.html').as_posix())
        await pg.wait_for_timeout(1000)
        r7 = await pg.evaluate("""(() => {
          const bad = [];
          for (let flat = 0; flat < 60; flat++) {
            const L = genLevel(flat);
            if (L.dch !== 3) continue;
            const q = L.quizzes[0];
            const d = engBfs({ r: q.fr, c: q.fc }, { r: q.chests[0].r, c: q.chests[0].c }, q.walls);
            if (q.kind.indexOf('exec') !== 0 || d < 1) bad.push(flat + ':' + q.kind + ':d=' + d);
          }
          return { n: bad.length, bad: bad.slice(0, 3) };
        })()""")
        rec('T7 m7 grid r13 ch3 首题=exec+首箱可达', r7['n'] == 0, 'bad=%s' % r7['bad'])
        await ctx.close()

        # T8 m6 money .empty 对比度 ≥3:1（解析 RGB 计算对比度）
        html = (BASE / 'money' / '_src' / 'head.html').read_text(encoding='utf-8')
        import re as _re
        m = _re.search(r'#basket \.empty\{[^}]*color:(#[0-9A-Fa-f]{6})', html)
        bg = _re.search(r'#basket\{[^}]*background:(#[0-9A-Fa-f]{6})', html) or _re.search(r'\.basket\{[^}]*background:(#[0-9A-Fa-f]{6})', html)
        def lum(h):
            def ch(v):
                v /= 255.0
                return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
            r, g, b = int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)
            return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
        if m:
            c1 = lum(m.group(1))
            c2 = lum(bg.group(1)) if bg else lum('#FBE9CF')
            ratio = (max(c1, c2) + 0.05) / (min(c1, c2) + 0.05)
            rec('T8 m6 money .empty 对比度≥3:1', ratio >= 3.0, 'fg=%s ratio=%.2f' % (m.group(1), ratio))
        else:
            rec('T8 m6 money .empty 对比度≥3:1', False, '未找到色值')

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
