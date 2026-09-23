# -*- coding: utf-8 -*-
"""sudokunum 独立复验（SPEC-BATCH19 §3+§0.42 分源）——断言从 SPEC 推导
S1 确定性（抽 4 flat 双读全量对比）/ S2 唯一解：Python 朴素回溯计数===1（200 盘；
游戏侧=位掩码+MRV，verify 侧=顺序回溯，本侧=带限位掩码计数——三分源）
S3 sol 为有效完整解（行/列/2×3 宫 1-6 恰一次）+given 格===sol / S4 章空格区间
（dch：1=6-8/2=9-11/3=12-14/4=12-14）/ S5 ch3 宫必用（行列-only 裸单链不可解）
S6 同关 5 盘 sig 互异（sig=挖空位元组+sol 串——同解不同挖空=体验不同）
S7 引擎直驱：错填（违反约束值）=miss 恰一次+格子回空零惩罚；正确填满推进
纪律：tapCell/tapNum 均 async——evaluate 侧 await promise（cipher 批实锤：
promise===false 恒 true 吞拒绝）；先等 title=VERIFY PASS；推进轮询等可交互态
"""
import json, os, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'sudokunum', 'index.html').replace('\\', '/') + '?verify=1'
FULL = set(range(1, 7))

def box_of(r, c):                      # 2 行×3 列宫（与游戏侧 verBox 同口径，SPEC §3）
    return (r // 2) * 2 + c // 3

def solve_count(grid, limit=2):
    """独立回溯计数：返回 (计数, 到 limit 即停)。位掩码实现（与游戏侧 MRV 路径不同）"""
    rows = [0] * 6; cols = [0] * 6; boxes = [0] * 6
    empties = []
    for i, v in enumerate(grid):
        r, c = divmod(i, 6)
        if v:
            b = 1 << v
            rows[r] |= b; cols[c] |= b; boxes[box_of(r, c)] |= b
        else:
            empties.append(i)
    cnt = 0
    def bt(k):
        nonlocal cnt
        if cnt >= limit:
            return
        if k == len(empties):
            cnt += 1
            return
        i = empties[k]
        r, c = divmod(i, 6)
        bx = box_of(r, c)
        for v in range(1, 7):
            b = 1 << v
            if not (rows[r] & b or cols[c] & b or boxes[bx] & b):
                rows[r] |= b; cols[c] |= b; boxes[bx] |= b
                bt(k + 1)
                rows[r] &= ~b; cols[c] &= ~b; boxes[bx] &= ~b
                if cnt >= limit:
                    return
    bt(0)
    return cnt

def valid_full(sol):
    for r in range(6):
        if {sol[r * 6 + c] for c in range(6)} != FULL:
            return False
    for c in range(6):
        if {sol[r * 6 + c] for r in range(6)} != FULL:
            return False
    for br in range(0, 6, 2):
        for bc in range(0, 6, 3):
            if {sol[(br + dr) * 6 + bc + dc] for dr in range(2) for dc in range(3)} != FULL:
                return False
    return True

def rowcol_solvable(grid):
    """行列-only 裸单链（ch3 宫必用断言：可解=FAIL）"""
    g = list(grid)
    while True:
        moved = False
        for i, v in enumerate(g):
            if v:
                continue
            r, c = divmod(i, 6)
            cand = FULL - {g[r * 6 + k] for k in range(6)} - {g[k * 6 + c] for k in range(6)}
            if len(cand) == 1:
                g[i] = cand.pop()
                moved = True
            elif len(cand) == 0:
                return False
        if not moved:
            return all(g)
    return all(g)

def wrong_val_for(grid, i):
    """找一个违反约束的值（该行/列/宫已有）"""
    r, c = divmod(i, 6)
    used = {grid[r * 6 + k] for k in range(6)} | {grid[k * 6 + c] for k in range(6)}
    used |= {grid[(r // 2 * 2 + dr) * 6 + c // 3 * 3 + dc] for dr in range(2) for dc in range(3)}
    used.discard(0)
    return sorted(used)[0]

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok), note))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    for _ in range(240):
        if 'VERIFY' in pg.title():
            break
        pg.wait_for_timeout(500)
    chk('S0 selftest 全绿+0 pageerror', 'VERIFY PASS' in pg.title() and not errs, pg.title())

    TAP_CELL = "(i) => (async () => { try { const r = await SN.tapCell(i); return r !== false && r != null } catch(e){ return false } })()"
    TAP_NUM = "(n) => (async () => { try { const r = await SN.tapNum(n); return r !== false && r != null } catch(e){ return false } })()"

    def level_state():
        return pg.evaluate("() => SN.currentLevel ? {done:SN.currentLevel.done, step:SN.currentLevel.step, locked:SN.currentLevel.locked} : null")

    def wait_playable():
        for _ in range(160):
            st = level_state()
            if st and not st['locked'] and not st['done']:
                return True
            pg.wait_for_timeout(50)
        return False

    def read_quiz():
        return pg.evaluate("() => SN.quiz")

    def fill_all(q):
        """逐空格 tapCell+tapNum(sol 值) 正确填满"""
        for i, v in enumerate(q['grid']):
            if v == 0:
                if not pg.evaluate(TAP_CELL, i):
                    return False
                if not pg.evaluate(TAP_NUM, q['sol'][i]):
                    return False
        return True

    all_levels = {}
    c2 = c3 = c4 = c6 = 0
    uniq_fail, sol_fail, hole_fail, mustbox_fail, sig_fail = [], [], [], [], []
    for flat in range(40):
        pg.evaluate("(f) => SN.start(f)", flat)
        if not wait_playable():
            chk('S-start flat%d 可玩态' % flat, False)
            break
        qs, sigs = [], set()
        for k in range(5):
            q = read_quiz()
            qs.append(q)
            grid = q['grid']; sol = q['sol']
            # S2 唯一解（Python 独立计数）
            n = solve_count(grid)
            if n != 1:
                uniq_fail.append((flat, k, n))
            else:
                c2 += 1
            # S3 完整解+given===sol
            okS3 = valid_full(sol) and all(grid[i] == sol[i] for i in range(36) if q['given'][i])
            if okS3:
                c3 += 1
            else:
                sol_fail.append((flat, k))
            # S4 章空格区间（dch 口径）
            holes = sum(1 for v in grid if v == 0)
            lo, hi = {1: (6, 8), 2: (9, 11), 3: (12, 14), 4: (12, 14)}[q.get('dch') or pg.evaluate("() => SN.currentLevel.dch")]
            if not (lo <= holes <= hi):
                hole_fail.append((flat, k, holes))
            else:
                c4 += 1
            # S5 ch3 宫必用（dch==3：行列-only 不可解）
            if (q.get('dch') or 0) == 3 and rowcol_solvable(grid):
                mustbox_fail.append((flat, k))
            # S6 sig 互异（挖空位+sol）
            s = (tuple(i for i, v in enumerate(grid) if v == 0), ''.join(map(str, sol)))
            if s in sigs:
                sig_fail.append((flat, k))
            sigs.add(s)
            if k < 4:
                if not fill_all(q):
                    chk('S-推进 flat%d q%d 填格失败' % (flat, k), False)
                    break
                adv = False
                for _ in range(200):
                    st = level_state()
                    if st and st['step'] == k + 1:
                        adv = True
                        break
                    pg.wait_for_timeout(50)
                if not adv or not wait_playable():
                    chk('S-推进 flat%d q%d 未换题/锁死' % (flat, k), False)
                    break
        all_levels[flat] = qs
        c6 += len(sigs) == 5
    chk('S2 唯一解===1（200 盘 Python 独立计数）', not uniq_fail and c2 == 200, 'c2=%d %s' % (c2, uniq_fail[:2]))
    chk('S3 sol 完整解+given===sol', not sol_fail and c3 == 200, str(sol_fail[:2]))
    chk('S4 章空格区间', not hole_fail and c4 == 200, str(hole_fail[:3]))
    chk('S5 ch3 宫必用（行列-only 不可解）', not mustbox_fail, str(mustbox_fail[:3]))
    chk('S6 同关 5 盘 sig 互异（40 关）', not sig_fail and c6 == 40, str(sig_fail[:3]))

    # ---- S1 确定性抽验 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate("(f) => SN.start(f)", flat)
        if not wait_playable():
            diff.append((flat, 'start 失败'))
            continue
        qs2 = []
        for k in range(5):
            qs2.append(read_quiz())
            if k < 4:
                q = qs2[k]
                if not fill_all(q):
                    diff.append((flat, k, '填格失败'))
                    break
                for _ in range(200):
                    st = level_state()
                    if st and st['step'] == k + 1:
                        break
                    pg.wait_for_timeout(50)
                wait_playable()
        if [json.dumps(x, sort_keys=True) for x in qs2] != [json.dumps(x, sort_keys=True) for x in all_levels[flat]]:
            diff.append((flat, '双读不一致'))
    chk('S1 确定性（flat 0/12/27/39 双读一致）', not diff, str(diff[:3]))

    # ---- S7 引擎直驱：错填零惩罚+清除+重填推进（flat0 首盘）----
    pg.evaluate("(f) => SN.start(f)", 0)
    wait_playable()
    q0 = read_quiz()
    i0 = q0['grid'].index(0)
    wv = wrong_val_for(q0['grid'], i0)
    seq_ok, notes = True, []
    if not pg.evaluate(TAP_CELL, i0):
        seq_ok = False; notes.append('选中失败')
    else:
        pg.evaluate(TAP_NUM, wv)
        pg.wait_for_timeout(500)
        q1 = read_quiz()
        if not (q1 and q1['miss'] == 1):
            seq_ok = False; notes.append('miss!=1 got %s' % (q1 and q1['miss']))
        if q1 and q1['grid'][i0] != 0:
            seq_ok = False; notes.append('错值入格=%s' % q1['grid'][i0])
    if seq_ok and fill_all(read_quiz()):
        adv = False
        for _ in range(200):
            st = level_state()
            if st and st['step'] == 1:
                adv = True
                break
            pg.wait_for_timeout(50)
        if not adv:
            seq_ok = False; notes.append('重填未推进')
    elif seq_ok:
        seq_ok = False; notes.append('重填失败')
    chk('S7 错填=miss 恰一次+错值不入格零惩罚+重填推进', seq_ok, ';'.join(notes))
    chk('S-end 0 pageerror（复验全程）', not errs, str(errs[:2]))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
