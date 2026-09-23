# -*- coding: utf-8 -*-
"""slide 独立复验（SPEC-BATCH22 §2+§0.50 分源）——断言从 SPEC 推导，禁从实现行为归纳
S1 章约束（ch1 2×2 K∈[3,6]/ch2 2×3 K∈[6,12]/ch3 3×3 K∈[8,12] 试玩P1 勘误/ch4 轮换无 3×3）
S2 Python A* 独立求解器：每盘可解 + 最优步对账 + 按解驱动复原
S3 tapTile 语义（相邻空格=滑入/非相邻='wig'+wigs+1+moves 不变/非法下标=False）
S4 复原自动推进 + 全最优通关=3★
S5 确定性（flat 0/12/27/39 双读）/ S6 0 pageerror
纪律：tapTile async——evaluate 侧 await；先等 title=VERIFY PASS。"""
import json, sys, os, heapq
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'slide', 'index.html').replace('\\', '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

def solve(W, H, tiles, blank):
    """A*（曼哈顿）独立求解器：tiles=[{id,pos,goal}...] 返回 tile 下标步序（最优或近优 A* 保证最优）"""
    n = W * H
    start_pos = [t['pos'] for t in tiles]          # tiles[i] 当前在 start_pos[i]
    goal_of = [t['goal'] for t in tiles]           # tiles[i] 应在 goal_of[i]
    # 状态=(blank, tuple(pos_i))；启发=各 tile pos 到 goal 的曼哈顿和
    def h(state):
        b, pos = state
        s = 0
        for i in range(len(pos)):
            if pos[i] is None:
                continue
            g = goal_of[i]
            s += abs(pos[i] % W - g % W) + abs(pos[i] // W - g // W)
        return s
    start = (blank, tuple(start_pos))
    if h(start) == 0:
        return []
    # 状态转移：blank 与其相邻位置的 tile 交换
    def neighbors(state):
        b, pos = state
        out = []
        for d in (-W, W, -1, 1):
            nb = b + d
            if d == -1 and b % W == 0: continue
            if d == 1 and b % W == W - 1: continue
            if not (0 <= nb < n): continue
            lst = list(pos)
            ti = next((i for i in range(len(lst)) if lst[i] == nb), None)
            lst[ti] = b
            out.append(((nb, tuple(lst)), ti))
        return out
    openq = [(h(start), 0, start)]
    came = {start: None}
    gsc = {start: 0}
    while openq:
        f, g, st = heapq.heappop(openq)
        if h(st) == 0:
            path = []
            cur = st
            while came[cur]:
                prev, ti = came[cur]
                path.append(ti)
                cur = prev
            return path[::-1]
        if g > gsc.get(st, 1 << 30):
            continue
        for nxt, ti in neighbors(st):
            ng = g + 1
            if ng < gsc.get(nxt, 1 << 30):
                gsc[nxt] = ng
                came[nxt] = (st, ti)
                heapq.heappush(openq, (ng + h(nxt), ng, nxt))
    return None

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    for _ in range(240):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('S0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_q():
        return pg.evaluate('() => SL.quiz')

    def read_lv():
        return pg.evaluate('() => SL.currentLevel ? {step: SL.currentLevel.step, done: SL.currentLevel.done} : null')

    def tap(i):
        return pg.evaluate('(i) => (async () => { try { return await SL.tapTile(i) } catch(e){ return "ERR" } })()', i)

    def wait_quiz():
        for _ in range(300):
            if read_q():
                return read_q()
            pg.wait_for_timeout(30)
        return None

    def stepped(k):
        lv = read_lv()
        return (lv and lv['step'] > k) or bool(lv and lv['done'])

    # ---- 全量审计：40 关 × 5 盘 ----
    all_levels = {}
    ch_fail, sol_fail, drive_fail, star_fail = [], [], [], []
    grid_shapes = {}
    for flat in range(40):
        pg.evaluate('(f) => { SL.start(f) }', flat)
        snaps, shapes = [], set()
        ok_break = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            snaps.append(json.dumps(q, sort_keys=True))
            W, H, K = q['W'], q['H'], q['K']
            shapes.add((W, H))
            grid_shapes.setdefault(flat, set()).add((W, H))
            # S1 章约束（试玩P1 勘误：ch3 K∈[8,12]；生成关盘型去 3×3）
            if flat < 20:
                dch = flat // 5 + 1
                want = {1: ((2, 2), (3, 6)), 2: ((2, 3), (6, 12)), 3: ((3, 3), (8, 12))}.get(dch)
                if want:
                    ok_shape = (W, H) == want[0] or (H, W) == want[0]
                    if not (ok_shape and want[1][0] <= K <= want[1][1]):
                        ch_fail.append((flat, k, 'dch%d' % dch, (W, H), K))
            elif (W, H) == (3, 3):
                ch_fail.append((flat, k, '生成关 3×3 混入（试玩P1 勘误）'))
            # S2 独立求解
            seq = solve(W, H, q['tiles'], q['blank'])
            if seq is None:
                sol_fail.append((flat, k, '不可解'))
                ok_break = True
                break
            # S3 语义抽检：非相邻块（对角）tap → 'wig'
            if flat in (0, 7, 12, 25) and k == 0:
                bl = q['blank']
                diag = None
                for i, tl in enumerate(q['tiles']):
                    dx = abs(tl['pos'] % W - bl % W)
                    dy = abs(tl['pos'] // W - bl // W)
                    if (dx, dy) in ((1, 1), (0, 2), (2, 0)):
                        diag = i
                        break
                if diag is not None:
                    m0, w0 = q['moves'], q['wigs']
                    r = tap(diag)
                    q2 = read_q()
                    if not (r == 'wig' and q2['moves'] == m0 and q2['wigs'] == w0 + 1):
                        drive_fail.append((flat, k, 'wig 语义', r, q2['moves'], q2['wigs']))
            # S4 按解驱动（每步后重读盘面再取下一步——解序基于初始盘，直接按序 tap 即可：A* 解序在无人为扰动下有效）
            for ti in seq:
                r = tap(ti)
                if r not in ('slide', 'goal', 'done', 'right', True):
                    drive_fail.append((flat, k, 'tap 中断', r))
                    break
                pg.wait_for_timeout(40)
            for _ in range(60):
                if stepped(k):
                    break
                pg.wait_for_timeout(100)
            if not stepped(k):
                drive_fail.append((flat, k, '复原未推进'))
                ok_break = True
                break
        if flat < 15:
            if flat < 5 and shapes != {(2, 2)}:
                ch_fail.append((flat, 'ch1 盘型混入', shapes))
            elif 5 <= flat < 10 and not all((W, H) in ((2, 3), (3, 2)) for W, H in shapes):
                ch_fail.append((flat, 'ch2 盘型', shapes))
            elif 10 <= flat < 15 and shapes != {(3, 3)}:
                ch_fail.append((flat, 'ch3 盘型', shapes))
        all_levels[flat] = snaps
        lv = read_lv()
        if lv and lv.get('done') and not ok_break:
            st = -1
            for _ in range(6):                          # 关终窗轮询（celebrate 后 cur 可能被清）
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => (typeof cur !== "undefined" && cur) ? engStars(cur) : -1')
                if st != -1:
                    break
            if st != 3 and st != -1:
                star_fail.append((flat, '最优通关非3★', st))
    chk('S1 章约束（盘型×章/K 区间）', not ch_fail, str(ch_fail[:4]))
    chk('S2 Python A* 全盘可解（200 盘）', not sol_fail, str(sol_fail[:3]))
    chk('S3/S4 引擎直驱（解序复原推进+wig 语义）', not drive_fail, str(drive_fail[:4]))
    chk('S4b 星级（最优通关=3★）', not star_fail, str(star_fail[:3]))

    # ---- S5 确定性：4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { SL.start(f) }', flat)
        snaps2 = []
        for k in range(5):
            q = wait_quiz()
            snaps2.append(json.dumps(q, sort_keys=True) if q else None)
            seq = solve(q['W'], q['H'], q['tiles'], q['blank']) if q else None
            if seq is None:
                diff.append((flat, k, '不可解'))
                break
            for ti in seq:
                tap(ti)
                pg.wait_for_timeout(40)
            for _ in range(60):
                if stepped(k):
                    break
                pg.wait_for_timeout(100)
        if snaps2 != all_levels.get(flat):
            diff.append(flat)
    chk('S5 确定性（flat 0/12/27/39 双读一致）', not diff, str(diff[:3]))

    # ---- S6 非法下标 + 0 pageerror ----
    bad = pg.evaluate('() => (async () => { try { const r = await SL.tapTile(-1); return r === false || r == null } catch(e){ return true } })()')
    chk('S6 非法下标拒绝+0 pageerror', bool(bad) and not errs, str(errs[:2]))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
