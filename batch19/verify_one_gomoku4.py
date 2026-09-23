# -*- coding: utf-8 -*-
"""gomoku4 独立复验（SPEC-BATCH19 §2+§0.41 分源）——断言从 SPEC 推导
K1 确定性（抽 flat 双跑棋谱一致）/ K2 每步合法（空位+轮替+界内，200 局 Python 逐差分校验）
K3 独立棋盘扫描对账（Python 恰四连扫描器：横/竖/双斜连长==4 才胜，五连不判——对账 phase/winline）
K4 AI 必备两断言（构造局面 evaluate engAiPick：AI 活三必下第四子；玩家活三必堵——多 seed）
K5 章约束（dch1 N=4/dch2-4 N=5）/ K6 同关 5 局棋谱互异
K7 负局零惩罚（engSuicidePick 驱动送死→miss+1+step 不变+盘面重开）
纪律：tapCell/aiMove 均 async——evaluate await promise；终局庆祝窗轮询等可交互态
"""
import json, os, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'gomoku4', 'index.html').replace('\\', '/') + '?verify=1'
DIRS = [(0, 1), (1, 0), (1, 1), (1, -1)]

def scan_win(board, n):
    """Python 独立扫描器：≥4 连即胜（审查 M1 裁决：Connect-Four 惯例，连五补空档应奖励）。
    返回 (winner, line) 或 None。line=整条极大段索引升序。"""
    for r in range(n):
        for c in range(n):
            v = board[r * n + c]
            if not v:
                continue
            for dr, dc in DIRS:
                pr, pc = r - dr, c - dc
                if 0 <= pr < n and 0 <= pc < n and board[pr * n + pc] == v:
                    continue                       # 非起点
                k = 0
                while (r + k * dr in range(n)) and (c + k * dc in range(n)) and \
                        board[(r + k * dr) * n + (c + k * dc)] == v:
                    k += 1
                if k >= 4:                         # ≥4 连即胜
                    line = sorted((r + j * dr) * n + (c + j * dc) for j in range(k))
                    return v, line
    return None

def mk_board(n, pieces):
    b = [0] * (n * n)
    for i, v in pieces:
        b[i] = v
    return b

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
    for _ in range(300):
        if 'VERIFY' in pg.title():
            break
        pg.wait_for_timeout(500)
    chk('K0 selftest 全绿+0 pageerror', 'VERIFY PASS' in pg.title() and not errs, pg.title())

    def state():
        return pg.evaluate("() => GK.currentLevel ? {done:GK.currentLevel.done, step:GK.currentLevel.step, locked:GK.currentLevel.locked, n:GK.currentLevel.n} : null")

    def quiz():
        return pg.evaluate("() => GK.quiz")

    def wait_board_change(q0):
        """等 board 相对 q0 变化或终局（tapCell 的 await 已含 aiTurn——tap 返回时
        玩家+AI 可能都已落，不能等 turn 翻转，本批实锤）；返回 (flag, q)"""
        for _ in range(400):
            q = quiz()
            if q is None:
                return 'none', q0
            if q['board'] != q0['board'] or q['phase'] != 'play':
                return 'ok', q
            pg.wait_for_timeout(30)
        return 'timeout', q0

    # hook 重开点抓终局快照（终局 tap/aiMove 的 await 已含重开——返回时盘已清，本批实锤）
    pg.evaluate("""() => { const _sg = startGame;
      startGame = function() { try {
        if (typeof curGame !== 'undefined' && curGame && curGame.phase !== 'play')
          window.__finalSnap = { board: curGame.board.slice(), phase: curGame.phase,
            winline: curGame.winline ? curGame.winline.slice() : null, n: curGame.n, miss: curGame.miss };
      } catch(e) {} return _sg.apply(this, arguments); }; }""")

    def play_game(record):
        """Python 主导一局：玩家=solver（evaluate），AI=aiMove 真实通道；落子后差分校验
        （玩家 tap：差分 ≤2 位全原空+含玩家子 1；aiMove：差分恰 1 位值=2；终局直收）。
        返回 (ok, final_q)；record 收落子序列"""
        while True:
            q = quiz()
            if q is None:
                return False, None
            if q['phase'] != 'play':
                return True, q
            if q['turn'] == 1:
                i = pg.evaluate("() => engSolverPick(GK.quiz.board.slice(), GK.quiz.N)")
                if i is None or i < 0:
                    return False, q
                r = pg.evaluate("(i) => (async () => { try { return String(await GK.tapCell(i)) } catch(e){ return 'E' } })()", i)
                if r == 'E':
                    return False, q
            else:
                r = pg.evaluate("() => (async () => { try { const r = await GK.aiMove(); return r === false ? 'retry' : 'ok' } catch(e){ return 'retry' } })()")
                if r == 'retry':
                    pg.wait_for_timeout(60)
                    continue
            flag, q2 = wait_board_change(q)
            if flag == 'none':
                # 关终局：最后一局打完 cur.done（quiz None 非异常）
                if pg.evaluate("() => !!(GK.currentLevel && GK.currentLevel.done)"):
                    snap = pg.evaluate("() => window.__finalSnap || null")
                    if snap:
                        return True, {'N': snap['n'], 'board': snap['board'], 'phase': snap['phase'],
                                      'winline': snap['winline'], 'step': q['step'], 'miss': snap['miss']}
                return False, None
            if flag == 'timeout':
                return False, q2
            if r != 'moved' or q2['phase'] != 'play':
                # 终局手（tap 返回终局字串或终局后已重开）→ 终局快照
                snap = pg.evaluate("() => window.__finalSnap || null")
                if snap:
                    fq = {'N': snap['n'], 'board': snap['board'], 'phase': snap['phase'],
                          'winline': snap['winline'], 'step': q['step'], 'miss': snap['miss']}
                    return True, fq
                return False, q2
            if q2['phase'] == 'play':
                diff = [k for k in range(len(q['board'])) if q['board'][k] != q2['board'][k]]
                if q['turn'] == 1:
                    # 玩家 tap：1 位（值 1，AI 未落）或 2 位（值 1+2）——await 已含 AI 应手
                    if not (1 <= len(diff) <= 2) or any(q['board'][k] != 0 for k in diff) or \
                       q2['board'][i] != 1 or (len(diff) == 2 and q2['board'][diff[1 - diff.index(i)]] != 2):
                        return False, q2
                    record.extend(sorted(diff, key=lambda k: q2['board'][k]))
                else:
                    if len(diff) != 1 or q['board'][diff[0]] != 0 or q2['board'][diff[0]] != 2:
                        return False, q2
                    record.append(diff[0])
                if q2['turn'] not in (1, 2):
                    return False, q2
            else:
                diff = [k for k in range(len(q['board'])) if q['board'][k] != q2['board'][k]]
                if any(q['board'][k] != 0 for k in diff):
                    return False, q2
                record.extend(diff)

    # ---- K2+K3+K5+K6 全量：40 关×5 局 ----
    all_tracks = {}
    bad_leg, bad_scan, bad_n, dup_game = [], [], [], []
    for flat in range(40):
        pg.evaluate("(f) => GK.start(f)", flat)
        for _ in range(160):
            st = state()
            if st and not st['locked']:
                break
            pg.wait_for_timeout(50)
        q = quiz()
        if not q:
            chk('K-start flat%d' % flat, False)
            break
        dch = pg.evaluate("() => GK.currentLevel.dch")
        want_n = 4 if dch == 1 else 5
        tracks = []
        for g in range(5):
            rec = []
            ok, fq = play_game(rec)
            if not ok or fq is None:
                bad_leg.append((flat, g, '驱动失败'))
                break
            # K5 棋盘规格
            if fq['N'] != want_n:
                bad_n.append((flat, g, fq['N']))
            # K3 终局对账（Python 独立扫描）
            w = scan_win(fq['board'], fq['N'])
            if fq['phase'] == 'win':
                if not (w and w[0] == 1):
                    bad_scan.append((flat, g, 'win 无玩家四连'))
                elif fq['winline'] and sorted(fq['winline']) != w[1]:
                    bad_scan.append((flat, g, 'winline 不一致'))
            elif fq['phase'] == 'lose':
                if not (w and w[0] == 2):
                    bad_scan.append((flat, g, 'lose 无 AI 四连'))
            elif fq['phase'] == 'draw':
                if w or 0 in fq['board']:
                    bad_scan.append((flat, g, 'draw 有四连或未满'))
            tracks.append(tuple(rec[:12]))
            # 推进下一局（终局庆祝窗）
            for _ in range(400):
                st = state()
                qn = quiz()
                if qn and qn['phase'] == 'play' and (qn['step'] != fq['step'] or qn['board'] != fq['board']):
                    break
                if st and (st['step'] == fq['step'] + 1 or st['done']):
                    break
                pg.wait_for_timeout(40)
        all_tracks[flat] = tracks
        if len(set(tracks)) != 5:
            dup_game.append(flat)
    chk('K2 每步合法（空位+轮替+界内差分）', not bad_leg, str(bad_leg[:3]))
    chk('K3 独立恰四连扫描对账终局', not bad_scan, str(bad_scan[:3]))
    chk('K5 章棋盘规格（dch1=4×4 余 5×5）', not bad_n, str(bad_n[:3]))
    chk('K6 同关 5 局棋谱互异', not dup_game and len(all_tracks) == 40, str(dup_game[:3]))

    # ---- K4 AI 必备两断言（构造局面，多 seed）----
    # 局面 A：AI(2) 横向活三 [6,7,8]（5×5 第 2 行），两端 5/9 空 → full 必下 5 或 9（成四）
    bA = mk_board(5, [(6, 2), (7, 2), (8, 2)])
    # 局面 B：玩家(1) 竖向活三 [5,10,15]，两端 0/20 空 → AI 必堵 0 或 20
    bB = mk_board(5, [(5, 1), (10, 1), (15, 1)])
    missA, missB = [], []
    for seed in (1, 2, 3, 5, 8):
        mv = pg.evaluate("(b) => engAiPick(b.slice(), 5, 'full', %d)" % seed, bA)
        if mv not in (5, 9):
            missA.append((seed, mv))
        mv2 = pg.evaluate("(b) => engAiPick(b.slice(), 5, 'full', %d)" % seed, bB)
        if mv2 not in (0, 20):
            missB.append((seed, mv2))
    chk('K4a AI 己方活三必下第四子（full×5 seed）', not missA, str(missA))
    chk('K4b 玩家活三 AI 必堵（full×5 seed）', not missB, str(missB))

    # ---- K1 确定性：抽 flat 双跑棋谱对比 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate("(f) => GK.start(f)", flat)
        for _ in range(160):
            st = state()
            if st and not st['locked']:
                break
            pg.wait_for_timeout(50)
        tracks2 = []
        for g in range(5):
            rec = []
            ok, fq = play_game(rec)
            if not ok:
                diff.append((flat, g, '驱动失败'))
                break
            tracks2.append(tuple(rec[:12]))
            for _ in range(400):
                st = state()
                qn = quiz()
                if qn and qn['phase'] == 'play' and qn['board'] != fq['board']:
                    break
                if st and (st['step'] == fq['step'] + 1 or st['done']):
                    break
                pg.wait_for_timeout(40)
        if tracks2 != all_tracks.get(flat):
            diff.append((flat, '棋谱不一致'))
    chk('K1 确定性（flat 0/12/27/39 双跑棋谱一致）', not diff, str(diff[:3]))

    # ---- K7 负局零惩罚：engSuicidePick 送死 → retries+1+step 不变+盘面重开
    # （用 ch3=full AI——会一步制胜；ch1 block AI 只堵不攻，送死局只会平局收） ----
    pg.evaluate("(f) => GK.start(f)", 12)
    for _ in range(160):
        st = state()
        if st and not st['locked']:
            break
        pg.wait_for_timeout(50)
    lose_ok, notes = True, []
    st0 = state()
    r0 = pg.evaluate("() => GK.currentLevel ? GK.currentLevel.retries : null")
    tries = 0
    r_last = 'moved'
    while tries < 60:
        tries += 1
        q = quiz()
        if q is None:
            lose_ok = False; notes.append('quiz None')
            break
        if q['phase'] != 'play':
            lose_ok = False; notes.append('终局态直读: %s' % q['phase'])
            break
        if q['turn'] == 1:
            i = pg.evaluate("() => engSuicidePick(GK.quiz.board.slice(), GK.quiz.N)")
            if i is None or i < 0:
                lose_ok = False; notes.append('suicide 无点')
                break
            r_last = pg.evaluate("(i) => (async () => { try { return String(await GK.tapCell(i)) } catch(e){ return 'E' } })()", i)
            if r_last == 'E':
                lose_ok = False; notes.append('suicide 落子失败')
                break
            if r_last != 'moved':
                break                                # 终局手（lose/draw/win/…）
        else:
            pg.evaluate("() => (async () => { try { await GK.aiMove() } catch(e){} })()")
            flag, _ = wait_board_change(q)
    if r_last == 'moved':
        lose_ok = False; notes.append('60 手未分胜负')
    else:
        pg.wait_for_timeout(600)                     # 等负局重下
        st2 = state()
        q2 = quiz()
        snap = pg.evaluate("() => window.__finalSnap || null")
        if not (snap and snap['phase'] == 'lose'):
            lose_ok = False; notes.append('终局快照非负: %s' % (snap and snap['phase']))
        r2 = pg.evaluate("() => GK.currentLevel ? GK.currentLevel.retries : null")
        if not (r2 == (r0 or 0) + 1):
            lose_ok = False; notes.append('retries 未+1: %s->%s' % (r0, r2))
        if not (st2 and st2['step'] == st0['step']):
            lose_ok = False; notes.append('负局推进了 step')
        if not (q2 and q2['phase'] == 'play' and 0 in q2['board']):
            lose_ok = False; notes.append('未重开: %s' % (q2 and q2['phase']))
    chk('K7 负局=miss+1+step 不变+盘面重开', lose_ok and tries < 60, ';'.join(notes))
    chk('K-end 0 pageerror（复验全程）', not errs, str(errs[:2]))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
