# -*- coding: utf-8 -*-
"""verify_one_coder_r40.py — coder r40 难度加深 独立复验（Executor 归档版，禁整替主线版）
主线 verify_batch28.py coder 段的 r40 适配参照：旧 3×3 界内与 ch1 池1 距1 规则已过时。
口径：?verify=1 页（引擎同作用域）驱动；断言从 SPEC-R40-CODER §R2 独立推导（禁读引擎实现常量）。
12 项：
  T1 谱阶梯（40 关全量 python 复算）：dch1 dist2（flat0q0 锚 dist1）/dch2 3/dch3 4/dch4 5
  T2 网格档：dch<3 → g=3；dch≥3 → g=4（40 关逐题）
  T3 卡池先验：池=dist±1（ch1/2 恰=dist）；python DFS 可达；最短路不被石头挡死
  T4 path 谱：seq=(dch3,lv<2)?2:3；opts=seq+1；落点/末段中间格 python 重放复算
  T5 确定性：同 flat 两次 genLevel JSON 一致（抽 0/10/12/17/23/39）
  T6 锚面：flat0 题0 = (1,1)→(0,1) 池[up] 无石（教学锚不动）
  T7 键链直调：pathKeys seq2=7 段/seq3=9 段（cod_ps_zai×2），texts 拼接===pathSpeak（r34 M1）
  T8 UI 锚点驱动：flat0 点 0 卡 → right；autoSolve taps=9（锚1+4×2）
  T9 seq3 UI：flat12 首个 path 点错 wrong(miss1) → 点对 right 推进
  T10 错反馈链：run 错链 __lastQueue=[cod_wrong,cod_gw1,cod_d_X,cod_gw2]（拼接=SPEC 方向句）
  T11 many 紧凑档：run 池≥5 关 board.many 类在场；卡 ≥64×64（双视口）
  T12 clips：cod_ 24 + core 3 = 27 注入
用法: python verify_one_coder_r40.py
"""
import asyncio, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent
URL = 'file:///' + (BASE.parent / 'index.html').as_posix() + '?verify=1'
MUTE = open('F:/claudecode/projects/active/kids-games/batch6/words/_src/_selftest.py', encoding='utf-8').read().split('MUTE_INIT = """')[1].split('"""')[0]

# ---- SPEC 独立表（SPEC-R40 §R2；禁 import 游戏 JS） ----
DIRS = {'up': (-1, 0), 'down': (1, 0), 'left': (0, -1), 'right': (0, 1)}
LADDER = {1: 2, 2: 3, 3: 4, 4: 5}
GOF = lambda dch: 4 if dch >= 3 else 3
PATHSEQ = lambda dch, lv: 2 if (dch == 3 and lv < 2) else 3
SPEC_RUN_WRONG = lambda d: '小兔没走到萝卜，先往' + d + '走'
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

def pkey(p): return (p['r'], p['c'])
def pdist(a, b): return abs(a['r'] - b['r']) + abs(a['c'] - b['c'])

def py_reach(start, goal, stones, dirs, g):
    """python 独立 DFS：方向多重集可拼出 ≥1 条到达路径"""
    st = set(pkey(s) for s in stones)
    from collections import Counter
    cnt = Counter(dirs)
    def go(r, c):
        if (r, c) == (goal['r'], goal['c']): return True
        for d, n in list(cnt.items()):
            if n <= 0: continue
            dr, dc = DIRS[d]
            nr, nc = r + dr, c + dc
            if not (0 <= nr < g and 0 <= nc < g) or (nr, nc) in st: continue
            cnt[d] -= 1
            ok = go(nr, nc)
            cnt[d] += 1
            if ok: return True
        return False
    return go(start['r'], start['c'])

def py_shortest_alive(start, goal, stones, g):
    """python 定向 DFS：至少一条最短路绕开全部石头"""
    st = set(pkey(s) for s in stones)
    def walk(r, c):
        if (r, c) == (goal['r'], goal['c']): return True
        mv = []
        if goal['r'] > r: mv.append('down')
        if goal['r'] < r: mv.append('up')
        if goal['c'] > c: mv.append('right')
        if goal['c'] < c: mv.append('left')
        for d in mv:
            dr, dc = DIRS[d]
            nr, nc = r + dr, c + dc
            if not (0 <= nr < g and 0 <= nc < g) or (nr, nc) in st: continue
            if walk(nr, nc): return True
        return False
    return walk(start['r'], start['c'])

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(MUTE)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        # 等页内 ?verify=1 自检流跑完（VERIFY title）再驱动 UI——否则与 runVerify 并发抢 cur（r30 重入）
        for _ in range(600):
            t = await pg.evaluate('document.title')
            if t and t.startswith('VERIFY'): break
            await pg.wait_for_timeout(300)
        else:
            rec('T0 页内自检完成', False, t)
        rec('T0 页内自检完成', 'VERIFY PASS' in t, t)

        # ---- T5/T1-T4 数据源：页内 genLevel 直读（引擎同作用域，断言在 python 侧独立推导）----
        raw = await pg.evaluate("""() => Array.from({length: 40}, (_, f) => {
          const L = genLevel(f);
          return { flat: f, ch: L.ch, dch: L.dch, lv: L.lv, g: L.g,
                   quizzes: L.quizzes.map(q => ({ kind: q.kind, g: q.g || 3,
                     start: {r: q.start.r, c: q.start.c}, goal: {r: q.goal.r, c: q.goal.c},
                     stones: q.stones.map(s => ({r: s.r, c: s.c})),
                     pool: q.kind === 'run' ? q.pool.map(c => c.dir) : null,
                     seq: q.kind === 'path' ? q.seq.slice() : null,
                     opts: q.kind === 'path' ? q.opts.map(o => ({r: o.r, c: o.c})) : null,
                     answer: q.kind === 'path' ? q.answer : -1 })) };
        })""")
        det_ok = True
        for f in [0, 10, 12, 17, 23, 39]:
            a = await pg.evaluate('(f => JSON.stringify(genLevel(f).quizzes))(%d)' % f)
            bb = await pg.evaluate('(f => JSON.stringify(genLevel(f).quizzes))(%d)' % f)
            if a != bb: det_ok = False
        rec('T5 确定性(抽6关双跑)', det_ok)

        t1 = t2 = t3 = t4 = True; t1b = t2b = t3b = t4b = ''
        for lv in raw:
            dch, lvn = lv['dch'], lv['lv']
            for k, q in enumerate(lv['quizzes']):
                g, want_g = q['g'], GOF(dch)
                if g != want_g: t2 = False; t2b = 'f%dq%d g=%d want %d' % (lv['flat'], k, g, want_g)
                if q['kind'] == 'run':
                    d = pdist(q['start'], q['goal'])
                    if lv['flat'] == 0 and k == 0:
                        if d != 1: t1 = False; t1b = 'anchor dist=%d' % d
                    else:
                        want = LADDER[dch]
                        if d != want: t1 = False; t1b = 'f%dq%d dist=%d want %d' % (lv['flat'], k, d, want)
                        np_ = len(q['pool'])
                        if dch in (1, 2):
                            if np_ != d: t3 = False; t3b = 'f%dq%d 池%d≠%d' % (lv['flat'], k, np_, d)
                        else:
                            if not (d <= np_ <= d + 1): t3 = False; t3b = 'f%dq%d 池%d dist%d' % (lv['flat'], k, np_, d)
                    if not py_reach(q['start'], q['goal'], q['stones'], q['pool'], g):
                        t3 = False; t3b = 'f%dq%d 卡池不可达' % (lv['flat'], k)
                    if not py_shortest_alive(q['start'], q['goal'], q['stones'], g):
                        t3 = False; t3b = 'f%dq%d 石头挡死' % (lv['flat'], k)
                else:
                    want_s = PATHSEQ(dch, lvn)
                    if len(q['seq']) != want_s: t4 = False; t4b = 'f%dq%d seq=%d want %d' % (lv['flat'], k, len(q['seq']), want_s)
                    if len(q['opts']) != want_s + 1: t4 = False; t4b = 'f%dq%d opts=%d' % (lv['flat'], k, len(q['opts']))
                    r0, c0 = q['start']['r'], q['start']['c']
                    for d in q['seq']:
                        r0 += DIRS[d][0]; c0 += DIRS[d][1]
                        if not (0 <= r0 < g and 0 <= c0 < g): t4 = False; t4b = 'f%dq%d seq 出界' % (lv['flat'], k)
                    if pkey(q['opts'][q['answer']]) != (r0, c0): t4 = False; t4b = 'f%dq%d 落点≠answer' % (lv['flat'], k)
                    dr, dc = DIRS[q['seq'][-1]]
                    if (r0 - dr, c0 - dc) not in [pkey(o) for o in q['opts']]:
                        t4 = False; t4b = 'f%dq%d 末段中间格缺席' % (lv['flat'], k)
        rec('T1 dist 阶梯 2/3/4/5(锚1)', t1, t1b)
        rec('T2 网格档 ch1/2=3 ch3+=4', t2, t2b)
        rec('T3 卡池先验+石头不挡死', t3, t3b)
        rec('T4 path seq 坡表+opts+陷阱格', t4, t4b)

        # ---- T6 锚面 ----
        q0 = raw[0]['quizzes'][0]
        rec('T6 flat0q0 教学锚面', q0['start'] == {'r': 1, 'c': 1} and q0['goal'] == {'r': 0, 'c': 1} and
            q0['pool'] == ['up'] and q0['stones'] == [] and q0['g'] == 3)

        # ---- T7 键链直调（r34 M1：期望链从 SPEC 推导）----
        ck = await pg.evaluate("""() => {
          const q2 = {seq: ['left', 'down']}, q3 = {seq: ['left', 'down', 'right']};
          return { k2: pathKeys(q2), s2: pathSpeak(q2), k3: pathKeys(q3), s3: pathSpeak(q3) };
        }""")
        j2 = ''.join(x['text'] for x in ck['k2']); j3 = ''.join(x['text'] for x in ck['k3'])
        rec('T7 pathKeys 链(seq2=7段/seq3=9段)', len(ck['k2']) == 7 and len(ck['k3']) == 9 and
            j2 == ck['s2'] == '走两步，先往左，再往下，小兔子会走到哪' and
            j3 == ck['s3'] == '走三步，先往左，再往下，再往右，小兔子会走到哪' and
            ck['k3'][4]['key'] == 'cod_ps_zai' and ck['k3'][6]['key'] == 'cod_ps_zai')

        # ---- T8 UI 锚点驱动 + autoSolve（manual 锚击后重开再 autoSolve——计数器只计自身 tap）----
        await pg.evaluate('CD.start(0)')
        r0t = await pg.evaluate('(async () => CD.tapCard(0))()')
        await pg.evaluate('CD.start(0)')
        a0 = await pg.evaluate('CD.autoSolve()')
        rec('T8 flat0 锚点 right+autoSolve taps=9', r0t == 'right' and a0['done'] and a0['taps'] == 9)

        # ---- T9 seq3 UI（flat12 首个 path）----
        await pg.evaluate('CD.start(12)')
        pk3 = await pg.evaluate("cur.quizzes.findIndex(x => x.kind === 'path')")
        adv = await pg.evaluate("""(async (pk) => {
          let g = 0;
          while (CD.quiz && CD.quiz.step < pk && g++ < 60) {
            const q = cur.quizzes[cur.step];
            const i = q.kind === 'path' ? q.answer : solveNext(q);
            if (i < 0) return false;
            await CD.tapCard(i);
          }
          return !!(CD.quiz && CD.quiz.step === pk);
        })(%d)""" % pk3)
        st3 = await pg.evaluate('(CD.quiz && CD.quiz.seq.length === 3 && CD.quiz.opts.length === 4 && CD.quiz.g === 4)')
        w3 = await pg.evaluate('(async () => CD.tapCard(CD.quiz.opts.findIndex((o, i) => i !== CD.quiz.answer)))()')
        m3 = await pg.evaluate('CD.quiz.miss')
        r3 = await pg.evaluate('(async () => CD.tapCard(CD.quiz.answer))()')
        s3 = await pg.evaluate('CD.quiz.step')
        rec('T9 flat12 seq3 结构+错/对驱动', adv and st3 and w3 == 'wrong' and m3 == 1 and
            r3 == 'right' and s3 == pk3 + 1)

        # ---- T10 错反馈链（dch3/4 run 卡尽错）：python 预演独立找 wrong 序（禁用引擎求解器）----
        def py_wrong_seq(qz):
            """python DFS 预演：找一条以 wrong 结尾的点卡下标序（specTap 语义独立复刻）"""
            stones = set(pkey(s) for s in qz['stones'])
            g = qz['g']
            def tap(state, i):
                pool, walked = state
                if pool[i][1]: return None            # used
                dr, dc = DIRS[pool[i][0]]
                nr, nc = walked[0] + dr, walked[1] + dc
                np_ = pool[:i] + [(pool[i][0], True)] + pool[i + 1:]
                if not (0 <= nr < g and 0 <= nc < g) or (nr, nc) in stones:
                    return ('false', (np_, walked))
                if (nr, nc) == (qz['goal']['r'], qz['goal']['c']):
                    return ('right', (np_, (nr, nc)))
                if all(p[1] for p in np_):
                    return ('wrong', ([ (d, False) for d, _ in np_ ], (qz['start']['r'], qz['start']['c'])))
                return ('moved', (np_, (nr, nc)))
            ans = []
            def rec_dfs(state, seq):
                if ans: return
                for i in range(len(state[0])):
                    if state[0][i][1]: continue
                    r = tap(state, i)
                    if r is None or r[0] == 'right': continue
                    if r[0] == 'wrong':
                        ans.extend(seq + [i]); return
                    rec_dfs(r[1], seq + [i])
            rec_dfs(([(d, False) for d in qz['pool']], (qz['start']['r'], qz['start']['c'])), [])
            return ans
        # flat15+ 找首个含 wrong 序的 run 题（页内只读 genLevel 数据）
        wq = await pg.evaluate("""() => {
          for (let f = 15; f < 20; f++) {
            const qs = genLevel(f).quizzes;
            for (let k = 0; k < qs.length; k++) {
              if (qs[k].kind !== 'run') continue;
              return { flat: f, qi: k, kind: 'run', g: qs[k].g,
                start: {r: qs[k].start.r, c: qs[k].start.c}, goal: {r: qs[k].goal.r, c: qs[k].goal.c},
                stones: qs[k].stones.map(s => ({r: s.r, c: s.c})),
                pool: qs[k].pool.map(c => c.dir) };
            }
          }
          return null;
        }""")
        wseq = py_wrong_seq(wq) if wq else None
        made = False
        if wq and wseq:
            advw = await pg.evaluate("""(async (flat, qi) => {
              CD.start(flat);
              let g = 0;
              while (CD.quiz && CD.quiz.step < qi && g++ < 60) {
                const q = cur.quizzes[cur.step];
                const i = q.kind === 'path' ? q.answer : solveNext(q);
                if (i < 0) return false;
                await CD.tapCard(i);
              }
              return !!(CD.quiz && CD.quiz.step === qi && CD.quiz.kind === 'run');
            })(%d, %d)""" % (wq['flat'], wq['qi']))
            for i in wseq:
                rr = await pg.evaluate('(async (i) => CD.tapCard(i))(%d)' % i)
                if rr == 'wrong': made = True; break
        lq = await pg.evaluate('window.__lastQueue && window.__lastQueue.map(p => typeof p === "string" ? p : [p.key, p.text])')
        chain_ok = made and lq and len(lq) == 4 and lq[0] == 'cod_wrong' and lq[1][0] == 'cod_gw1' and \
            lq[3][0] == 'cod_gw2' and lq[2][0].startswith('cod_d_') and \
            lq[1][1] + lq[2][1] + lq[3][1] == SPEC_RUN_WRONG(lq[2][1])
        rec('T10 run 错链四段(cod_wrong+gw1+d+gw2)', bool(chain_ok),
            ('wseq=%s %s' % (wseq, str(lq)[:70])) if not chain_ok else '')

        # ---- T11 many 紧凑档 + 卡尺寸（双视口）----
        async def probe(vp_w, vp_h):
            await pg.set_viewport_size({'width': vp_w, 'height': vp_h})
            await pg.evaluate('CD.start(17)')
            many = await pg.evaluate("(CD.quiz.kind === 'run' && CD.quiz.pool.length >= 5) ? document.getElementById('board').classList.contains('many') : 'n/a-run'")
            if many == 'n/a-run':  # flat17 q0 是 path 则推进到 run 题
                await pg.evaluate('(async () => { await CD.tapCard(CD.quiz.answer); })()')
                many = await pg.evaluate("(CD.quiz.kind === 'run' && CD.quiz.pool.length >= 5) ? document.getElementById('board').classList.contains('many') : 'skip'")
            cells = await pg.evaluate("Array.from(document.querySelectorAll('#scene .cell')).map(b => [b.offsetWidth, b.offsetHeight])")
            cards = await pg.evaluate("Array.from(document.querySelectorAll('#board .card')).map(b => [b.offsetWidth, b.offsetHeight])")
            gn = await pg.evaluate('CD.quiz.g')
            return many, gn, cells, cards
        m1, gn1, c1, cd1 = await probe(1280, 800)
        m2, gn2, c2, cd2 = await probe(800, 1180)
        rec('T11 many 档+触摸地板(双视口)', m1 in (True, 'skip') and m2 in (True, 'skip') and
            len(c1) == gn1 * gn1 and len(c2) == gn2 * gn2 and
            all(w >= 72 and h >= 72 for w, h in c1 + c2) and
            all(w >= 64 and h >= 64 for w, h in cd1 + cd2),
            'many=%s/%s g=%d/%d' % (m1, m2, gn1, gn2))

        # ---- T12 clips ----
        n_clips = await pg.evaluate("Object.keys(KIDS.voice.clips).length")
        cod_n = await pg.evaluate("Object.keys(KIDS.voice.clips).filter(k => k.startsWith('cod_')).length")
        rec('T12 clips 27(cod 24+core 3)', n_clips == 27 and cod_n == 24, 'n=%d cod=%d' % (n_clips, cod_n))

        await b.close()
    npass = sum(1 for _, ok in RES if ok)
    print('RESULT: %d/%d pageerror=%d' % (npass, len(RES), len(errs)))
    if errs: print('pageerrors:', errs[:3])
    return 0 if npass == len(RES) and not errs else 1

sys.exit(asyncio.run(main()))
