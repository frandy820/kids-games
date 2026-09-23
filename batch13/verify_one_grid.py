# -*- coding: utf-8 -*-
"""batch13 · grid 坐标寻宝（r13：8×8 相对导航版）独立复验（不信 agent 自报，读实际产物）
①verify title+clips≥29(26 gri+core3) ②钩子 GR 契约 ③mulberry32 Python 复刻 dch 首抽对账(flat20-39)
  +Python 独立 BFS 40 关全部题依序可达+opt 对账+exec 指令回放到达
④真实点击通关 flat0(exec1,先错配1次=2星)/flat10(plan)/flat15(maze)——Python BFS+朝向换算点指令键
⑤救援视觉+重读题面 ⑥教学吞输入+重玩门 ⑦双 viewport(格64枚≥44) ⑧离线+截图+data:audio 对账"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from collections import deque
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
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : 'K:' + p.key).join(',')); return _q(parts); };
  const _s = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 6)); return _s(t); };
  const _a = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _a(n); };
  return true;
})()"""

SEED = """const sv = KIDS._save() || { levels: {} };
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.grid = { tutSeen: true };
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();"""

# ---- Python 独立复算：mulberry32（与 JS 同式 32 位补码语义）+ BFS + 朝向状态机 ----
def _i32(x):
    x &= 0xFFFFFFFF
    return x - 0x100000000 if x >= 0x80000000 else x


def mulberry32(a):
    """与 game-core.js mulberry32 逐算子对齐（|0 / >>> / imul 均按 32 位补码）"""
    a = _i32(a)

    def rnd():
        nonlocal a
        a = _i32(a + 0x6D2B79F5)
        t = _i32(_i32(a ^ ((a & 0xFFFFFFFF) >> 15)) * _i32(a | 1))          # imul(a^a>>>15, 1|a)
        u = _i32(t ^ ((t & 0xFFFFFFFF) >> 7))
        w = _i32((t & 0xFFFFFFFF) | 61)
        t = _i32(_i32(t + _i32(u * w)) ^ t)                                  # t + imul(t^t>>>7, 61|t) ^ t
        y = _i32(t ^ ((t & 0xFFFFFFFF) >> 14))
        return (y & 0xFFFFFFFF) / 4294967296
    return rnd


DELTA = {'N': (-1, 0), 'S': (1, 0), 'E': (0, 1), 'W': (0, -1)}
TURN_L = {'N': 'W', 'W': 'S', 'S': 'E', 'E': 'N'}
TURN_R = {v: k for k, v in TURN_L.items()}


def bfs_dist(fr, fc, tr, tc, walls):
    wl = {(w['r'], w['c']) for w in walls}
    if (fr, fc) == (tr, tc):
        return 0
    dist = {(fr, fc): 0}
    dq = deque([(fr, fc)])
    while dq:
        r, c = dq.popleft()
        for h in ('N', 'S', 'E', 'W'):
            nr, nc = r + DELTA[h][0], c + DELTA[h][1]
            if not (1 <= nr <= 8 and 1 <= nc <= 8) or (nr, nc) in wl or (nr, nc) in dist:
                continue
            dist[(nr, nc)] = dist[(r, c)] + 1
            if (nr, nc) == (tr, tc):
                return dist[(nr, nc)]
            dq.append((nr, nc))
    return -1


def bfs_first_step(fr, fc, tr, tc, walls):
    wl = {(w['r'], w['c']) for w in walls}
    dist = {(fr, fc): 0}
    first = {}
    dq = deque([(fr, fc)])
    while dq:
        r, c = dq.popleft()
        for h in ('N', 'S', 'E', 'W'):
            nr, nc = r + DELTA[h][0], c + DELTA[h][1]
            if not (1 <= nr <= 8 and 1 <= nc <= 8) or (nr, nc) in wl or (nr, nc) in dist:
                continue
            dist[(nr, nc)] = dist[(r, c)] + 1
            first[(nr, nc)] = h if (r, c) == (fr, fc) else first[(r, c)]
            if (nr, nc) == (tr, tc):
                return first[(nr, nc)]
            dq.append((nr, nc))
    return None


def turn_to(cur_h, want):
    if cur_h == want:
        return []
    if TURN_L[cur_h] == want:
        return ['L']
    if TURN_R[cur_h] == want:
        return ['R']
    return ['L', 'L']


def replay_exec(q):
    """exec 指令序列独立回放（位置+朝向状态机）：到达首箱=True"""
    r, c, h = q['fr'], q['fc'], q['h0']
    wl = {(w['r'], w['c']) for w in q['walls']}
    for cm in q['seq']:
        if cm['t'] == 'L':
            h = TURN_L[h]
        elif cm['t'] == 'R':
            h = TURN_R[h]
        elif cm['t'] == 'fwd':
            for _ in range(cm.get('n') or 1):
                r += DELTA[h][0]
                c += DELTA[h][1]
                if not (1 <= r <= 8 and 1 <= c <= 8) or (r, c) in wl:
                    return False
    return r == q['chests'][0]['r'] and c == q['chests'][0]['c']


async def newpage(b, n, vp={'width': 1280, 'height': 800}, verify=False, delay=1500):
    ctx = await b.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + (BASE / 'grid' / 'index.html').as_posix() + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(delay)
    if n is not None:
        await pg.evaluate('(n) => {%s}' % SEED, n)
        await pg.reload()
        await pg.wait_for_timeout(delay)
    return ctx, pg, errs


async def click_cmd(pg, c):
    await pg.locator('.cmdb[data-c="%s"]' % c).first.click(force=True)


async def play_level(pg):
    """真实点击通关整关（exec=按指令条当前命令；plan/maze=Python BFS+朝向换算逐步按键依序收集）"""
    clicks = 0
    for _ in range(900):
        done = await pg.evaluate('GR.currentLevel.done')
        q = await pg.evaluate('GR.quiz')
        if done or not q:
            break
        if q['kind'] in ('exec1', 'exec2'):
            await click_cmd(pg, q['seq'][q['seqIdx']]['t'])
            clicks += 1
        else:
            ch = q['chests'][q['next']]
            if q['pos']['r'] == ch['r'] and q['pos']['c'] == ch['c']:
                await click_cmd(pg, 'T')
                clicks += 1
            else:
                want = bfs_first_step(q['pos']['r'], q['pos']['c'], ch['r'], ch['c'], q['walls'])
                for c in turn_to(q['heading'], want):
                    await click_cmd(pg, c)
                    clicks += 1
                    await pg.wait_for_timeout(110)
                await click_cmd(pg, 'fwd')
                clicks += 1
        await pg.wait_for_timeout(170)
    return clicks


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ① verify title + clips
        ctx, pg, errs = await newpage(b, None, verify=True)
        title = ''
        for _ in range(25):
            title = await pg.title()
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(1000)
        rec('G1 verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title + ' errs=%s' % errs[:1])
        nclips = await pg.evaluate('Object.keys(KIDS.voice.clips).length')
        n_gri = await pg.evaluate("Object.keys(KIDS.voice.clips).filter(k => k.indexOf('gri_') === 0).length")
        rec('G1b clips 注入(gri26+core3=29)', nclips >= 29 and n_gri == 26,
            'clips=%d gri=%d' % (nclips, n_gri))
        await ctx.close()

        # ③ mulberry32 复刻 dch 首抽对账 + Python BFS 全量可达 + opt 对账 + exec 回放
        ctx, pg, errs = await newpage(b, None, delay=800)
        dch_bad, reach_bad, opt_bad, replay_bad = [], [], [], []
        n_q = 0
        for flat in range(40):
            L = await pg.evaluate('genLevel(%d)' % flat)
            if flat >= 20:                       # 生成关：dch=首抽 ri(rnd,1,4)——Python 复刻对账
                r = mulberry32(flat * 7919 + 13)
                py_dch = 1 + int(r() * 4)
                if py_dch != L['dch']:
                    dch_bad.append((flat, py_dch, L['dch']))
            for q in L['quizzes']:
                n_q += 1
                ar, ac, tot = q['fr'], q['fc'], 0
                for ch in q['chests']:           # 依序分段 BFS：全可达且和=opt
                    d = bfs_dist(ar, ac, ch['r'], ch['c'], q['walls'])
                    if d < 0:
                        reach_bad.append((flat, q['kind']))
                        break
                    tot += d
                    ar, ac = ch['r'], ch['c']
                else:
                    if tot != q['opt']:
                        opt_bad.append((flat, tot, q['opt']))
                if q['kind'] in ('exec1', 'exec2') and not replay_exec(q):
                    replay_bad.append((flat, q['kind']))
        rec('G3 mulberry32 dch 首抽对齐(flat20-39)', not dch_bad, 'bad=%s' % dch_bad[:4])
        rec('G3b Python BFS 40关全题依序可达(200题)', not reach_bad and n_q == 200,
            'bad=%s n=%d' % (reach_bad[:4], n_q))
        rec('G3c 依序分段距离和=opt 对账', not opt_bad, 'bad=%s' % opt_bad[:4])
        rec('G3d exec 指令回放到达(独立状态机)', not replay_bad, 'bad=%s' % replay_bad[:4])
        await ctx.close()

        # ② 钩子契约（flat0 exec1）
        ctx, pg, errs = await newpage(b, 0, delay=3600)
        hk = await pg.evaluate("""(() => ({ has: !!window.GR, fwd: typeof GR.tapFwd,
          turn: typeof GR.tapTurn, take: typeof GR.tapTake, undo: typeof GR.tapUndo,
          auto: typeof GR.autoSolve, rescues: typeof (Object.getOwnPropertyDescriptor(GR, 'rescues').get) }))()""")
        q = await pg.evaluate('GR.quiz')
        contract = q and q['kind'] == 'exec1' and all(k in q for k in (
            'kind,pos,heading,walls,chests,next,seq,seqIdx,fwdLeft,steps,optSteps,collected,step,miss'.split(',')))
        rec('G2 钩子 GR 契约(r13 字段族)', all(hk.values()) and contract,
            'hk=%s contract=%s' % (hk, bool(contract)))

        # ④a flat0：先错配 1 次（miss+零惩罚可推进）再真实点击通关=2 星
        act = q['seq'][q['seqIdx']]['t']
        bad = 'L' if act == 'fwd' else 'fwd'
        await click_cmd(pg, bad)
        await pg.wait_for_timeout(800)
        st = await pg.evaluate("""(bc) => { const x = GR.quiz, b = document.querySelector('.cmdb[data-c="' + bc + '"]');
          return { miss: x.miss, retries: GR.currentLevel.retries, step: x.step,
                   wig: b.classList.contains('wig'), posSame: x.pos.r + ',' + x.pos.c }; }""", bad)
        rec('G4a 错配=miss 晃动零惩罚', st['miss'] == 1 and st['retries'] == 1 and st['step'] == 0 and st['wig'],
            str(st))
        clicks = await play_level(pg)
        await pg.wait_for_timeout(6200)
        stars = await pg.evaluate("(KIDS._save().levels['1-0'] || {}).stars || 0")
        rec('G4b 真实通关 flat0(exec1 指令键)', stars == 2 and not errs,
            'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
        await ctx.close()

        # ④b/c flat10(plan) / flat15(maze)
        for n, key, tag in ((10, '3-0', 'plan'), (15, '4-0', 'maze')):
            ctx, pg, errs = await newpage(b, 5, delay=2000)
            await pg.evaluate('startLevel(%d)' % n)
            await pg.wait_for_timeout(3600)      # 开场链（hint+3000ms 接力）落定
            clicks = await play_level(pg)
            await pg.wait_for_timeout(6200)
            stars = await pg.evaluate("(KIDS._save().levels['%s'] || {}).stars || 0" % key)
            rec('G4c 真实通关 flat%d(%s Python BFS+换算)' % (n, tag), stars == 3 and not errs,
                'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
            await ctx.close()

        # ⑤ 救援：静置→当前命令键 breathe+重读题面（exec 全 clip queue）
        ctx, pg, errs = await newpage(b, 3, delay=3600)
        await pg.evaluate(HOOK)
        await pg.evaluate('window.__vlog = []')
        vis, resc, rqs = False, 0, []
        for _ in range(18):
            vis = await pg.evaluate("!!document.querySelector('.cmdb.breathe, .cell.breathe')")
            resc = await pg.evaluate('GR.rescues')
            rqs = await pg.evaluate("window.__vlog.filter(x => x.indexOf('Q:gri_') === 0)")
            if vis and resc >= 1 and rqs:
                break
            await pg.wait_for_timeout(1000)
        head_ok = bool(rqs) and rqs[0].split('Q:')[1].split(',')[0] == 'gri_i_fwd'
        rec('G5 救援(breathe+重读题面全clip queue)', vis and resc >= 1 and head_ok and not errs,
            'vis=%s rescues=%s q=%s' % (vis, resc, rqs[:1]))
        await ctx.close()

        # ⑥ 教学吞输入 + 重玩门
        ctx, pg, errs = await newpage(b, None, delay=800)
        await pg.evaluate(HOOK)
        tut = await pg.evaluate('GR.tutorial')
        pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        st0 = await pg.evaluate('(GR.quiz ? GR.quiz.step : -1)')
        await pg.locator('.cmdb[data-c="fwd"]').first.click(force=True)   # 演示期点指令键=吞+轻叮
        await pg.wait_for_timeout(600)
        pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        st1 = await pg.evaluate('(GR.quiz ? GR.quiz.step : -1)')
        tut1 = await pg.evaluate('GR.tutorial')
        rec('G6 教学期点指令键被吞+轻叮', tut == 'watch' and st1 == st0 and pops1 > pops0 and tut1 == 'watch',
            'tut=%s pops+%d step=%s->%s' % (tut, pops1 - pops0, st0, st1))
        await pg.locator('#btn-replay').dispatch_event('pointerdown')
        seen = False
        for _ in range(18):
            await pg.wait_for_timeout(1000)
            seen = await pg.evaluate("!!(KIDS._save().grid && KIDS._save().grid.tutSeen)")
            if seen:
                break
        rec('G6b 教学窗重玩门(不重启关)', seen and not errs, 'seen=%s errs=%s' % (seen, errs[:1]))
        await ctx.close()

        # ⑦ 双 viewport：64 格 ≥44（r13 8×8 触控下限）+ 无 <64 按钮 + ox==0
        for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
            ctx, pg, errs = await newpage(b, 0, vp=vp)
            m = await pg.evaluate("""(() => {
              const de = document.documentElement;
              const cells = [...document.querySelectorAll('#board .cell')].map(e => e.getBoundingClientRect());
              const cMin = cells.length ? Math.min(...cells.map(r => Math.min(r.width, r.height))) : 0;
              const small = [...document.querySelectorAll('button')].filter(e => {
                if (e.classList.contains('k-parentbtn')) return false;
                const b = e.getBoundingClientRect();
                return b.width > 4 && b.height > 4 && Math.min(b.width, b.height) < 64;
              }).length;
              return { ox: de.scrollWidth - de.clientWidth, n: cells.length, cMin: Math.round(cMin), small: small,
                       cmdb: document.querySelectorAll('#pad-area .cmdb').length };
            })()""")
            rec('G7 viewport %dx%d' % (vp['width'], vp['height']),
                m['ox'] == 0 and m['n'] == 64 and m['cMin'] >= 44 and m['small'] == 0 and m['cmdb'] == 4
                and not errs, 'm=%s' % m)
            await ctx.close()

        # ⑧ 离线+截图+data:audio 对账
        ctx, pg, errs = await newpage(b, 0)
        src = await pg.evaluate('document.documentElement.outerHTML')
        rec('G8a 离线断言', 'http://' not in src.replace('http://www.w3.org', '') and 'https://' not in src, '')
        import statistics
        from PIL import Image
        shot = await pg.screenshot()
        img = Image.open(io.BytesIO(shot)).convert('L')
        sd = statistics.pstdev(list(img.resize((160, 100)).getdata()))
        rec('G8b 截图非空白', sd > 5, 'stdev=%.1f' % sd)
        await ctx.close()
        html = (BASE / 'grid' / 'index.html').read_text(encoding='utf-8')
        n_audio = html.count('data:audio')
        rec('G8c 语音注入对账(≥29 data:audio)', n_audio >= 29, 'audio=%d' % n_audio)

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)


asyncio.run(main())
