# -*- coding: utf-8 -*-
"""Patch t4_play.py: rewrite run_sudoku + add wait_win + cellW snapshot field."""
import io

p = r'F:/claudecode/projects/active/kids-games/batch4/shots/t4_play.py'
src = io.open(p, encoding='utf-8').read()

# 1) sudoku snapshot: add cell size
old = "    out.lamps = qa('#hint-lamps i').map(e=>String(e.className));"
new = ("    out.lamps = qa('#hint-lamps i').map(e=>String(e.className));\n"
       "    const fc = q('#board .cell');\n"
       "    out.cellW = fc ? Math.round(fc.getBoundingClientRect().width) : 0;")
assert old in src
src = src.replace(old, new)

# 2) add wait_win helper
old = "    def wait_unlock(self, timeout=6):"
new = """    def wait_win(self, timeout=8):
        t0 = time.time()
        while time.time() - t0 < timeout:
            lv = self.hook_level()
            if lv and lv.get('won'): return True
            self.page.wait_for_timeout(250)
        return False

    def wait_unlock(self, timeout=6):"""
assert old in src
src = src.replace(old, new, 1)

# 3) replace run_sudoku entirely
start = src.index('def run_sudoku(browser):')
end = src.index('# ============================ main')
new_fn = u'''def run_sudoku(browser):
    S = Session(browser, 'sudoku', (820, 1180))
    print('[sudoku] pre-measure singles solvability')
    S.goto()
    meas = S.page.evaluate(SUD_MEASURE)
    six = {int(k): v for k, v in meas.items() if v['n'] == 6}
    four = {int(k): v for k, v in meas.items() if v['n'] == 4}
    S.stats['measure6x6'] = six
    print('  6x6 all singles-solvable:', all(v['bySingles'] for v in six.values()),
          ' 4x4:', all(v['bySingles'] for v in four.values()))

    print('[sudoku] A: tutorial')
    for t in range(5):
        S.page.wait_for_timeout(700)
        s = S.snap('tut_watch_%d' % t)
        if t == 1: S.shot('tut_conflict_demo')
    # 等"帮"手指出现（重发后 +700ms 才 pointGhost）
    help_s = None
    for _ in range(10):
        S.page.wait_for_timeout(400)
        s = S.snap('tut_help_poll')
        if s['pulseCells'] and s['pulseAbtn']:
            help_s = s; break
    if help_s:
        S.shot('tut_help_ghost')
        S.ev('tut_help', 'ghostAt=%s ghost=%s pulseCells=%s pulseAbtn=%s cellW=%s' % (
            help_s.get('ghostAt'), help_s['ghost'], help_s['pulseCells'], help_s['pulseAbtn'], help_s.get('cellW')))
        S.think(1.0, 1.8)
        cell, ani = help_s['pulseCells'][0], help_s['pulseAbtn'][0]
        S.click('#board .cell[data-i="%d"]' % cell)
        S.page.wait_for_timeout(250)
        # 双击习惯：再点同格=取消选中
        S.page.mouse.click(*center_of(S.page, '#board .cell[data-i="%d"]' % cell))
        S.page.wait_for_timeout(250)
        s2 = S.snap('A_doubleclick_cell')
        S.ev('A_doubleclick_deselect', 'sel=%s' % s2['sel'])
        S.click('#board .cell[data-i="%d"]' % cell)
        S.think(0.8, 1.4)
        S.click('#animals .abtn[data-a="%d"]' % ani)
        S.page.wait_for_timeout(700)
        s3 = S.snap('A_help_filled')
        S.ev('A_solo', 'tut=%s' % s3['hk']['tut'])
    else:
        S.ev('tut_help', 'GHOST NOT FOUND within 4s')
    # 人设好奇乱点：没选格直接点动物（应无反应）
    bd0 = S.page.evaluate("() => SUD.board")
    S.click('#animals .abtn[data-a="0"]')
    S.page.wait_for_timeout(300)
    bd1 = S.page.evaluate("() => SUD.board")
    S.ev('A_animal_without_sel', 'board unchanged=%s' % (bd0['cells'] == bd1['cells']))

    # 1-0 其余：单候选扫描 + 保证冲突演示 + 双击清空演示
    done_deliberate = done_dbl = False
    for it in range(14):
        bd = S.page.evaluate("() => SUD.board")
        lv = S.hook_level()
        if bd is None or (lv and lv.get('won')): break
        n, cells = bd['n'], bd['cells']
        empt = [i for i, v in enumerate(cells) if v < 0]
        if not empt: break
        sol = S.page.evaluate("() => SUD.solution")
        if not done_deliberate:
            # 构造必然冲突：取同行已填格的动物填到另一空格
            i = empt[0]
            r = i // n
            src_j = next((j for j in range(r * n, r * n + n) if cells[j] >= 0 and j != i), None)
            if src_j is not None:
                done_deliberate = True
                S.click('#board .cell[data-i="%d"]' % i); S.think(0.7, 1.2)
                S.click('#animals .abtn[data-a="%d"]' % cells[src_j])
                S.page.wait_for_timeout(400)
                sc = S.snap('A_conflict_shown')
                S.shot('conflict_feedback')
                S.ev('A_conflict', 'conflict=%s wrongs=%s' % (sc['conflict'], sc['hk']['level']['wrongs']))
                S.page.wait_for_timeout(1100)
                sc2 = S.snap('A_conflict_after_1s')
                S.ev('A_conflict_cleared', 'conflict=%s' % sc2['conflict'])
                S.click('#board .cell[data-i="%d"]' % i)  # 点已填格=清除
                S.page.wait_for_timeout(300)
                sc3 = S.page.evaluate("() => SUD.board.cells[%d]" % i)
                S.ev('A_conflict_cleared_by_tap', 'cell=%d now=%s' % (i, sc3))
                S.think(0.9, 1.5)
                S.click('#animals .abtn[data-a="%d"]' % sol[i])
                S.page.wait_for_timeout(400)
                continue
        tgt = None
        for i in empt:
            c = candidates(cells, i, n, 2, 2 if n == 4 else 3)
            if len(c) == 1: tgt = (i, c[0]); break
        if tgt is None:
            S.ev('A_unexpected_stuck_flat0', 'empt=%d' % len(empt)); break
        i, v = tgt
        S.think(0.9, 1.8)
        S.click('#board .cell[data-i="%d"]' % i)
        S.page.wait_for_timeout(220)
        S.click('#animals .abtn[data-a="%d"]' % v)
        S.page.wait_for_timeout(320)
        if not done_dbl and it >= 2:
            done_dbl = True
            b0 = S.page.evaluate("() => SUD.board.cells[%d]" % i)
            S.page.mouse.click(*center_of(S.page, '#board .cell[data-i="%d"]' % i))
            S.page.wait_for_timeout(140)
            S.page.mouse.click(*center_of(S.page, '#board .cell[data-i="%d"]' % i))
            S.page.wait_for_timeout(300)
            b1 = S.page.evaluate("() => SUD.board.cells[%d]" % i)
            sdc = S.snap('A_doubleclick_filled_cell')
            S.ev('A_doubleclick_filled', 'cell %d: %s -> %s sel=%s' % (i, b0, b1, sdc['sel']))
            if b1 == -1:
                S.think(0.8, 1.4)
                S.click('#board .cell[data-i="%d"]' % i)
                S.page.wait_for_timeout(200)
                S.click('#animals .abtn[data-a="%d"]' % v)
                S.page.wait_for_timeout(300)
    S.idle_probe('flat0_stuck', 21)
    S.wait_win(10)
    S.snap('A_win'); S.shot('celebrate_flat0')
    S.page.wait_for_timeout(3000)
    S.stats['levelsPlayed'].append({'flat': 0})

    print('[sudoku] B: flat1 quick')
    ok = S.wait_level(1)
    t0 = time.time(); fills = 0
    while fills < 16:
        bd = S.page.evaluate("() => SUD.board")
        lv = S.hook_level()
        if bd is None or (lv and lv.get('won')): break
        cells, n = bd['cells'], bd['n']
        empt = [i for i, v in enumerate(cells) if v < 0]
        if not empt: break
        tgt = None
        for i in empt:
            c = candidates(cells, i, n, 2, 2 if n == 4 else 3)
            if len(c) == 1: tgt = (i, c[0]); break
        if tgt is None:
            S.ev('B_stuck_flat1', 'remaining=%d' % len(empt)); break
        i, v = tgt
        S.think(0.8, 1.6)
        S.click('#board .cell[data-i="%d"]' % i)
        S.page.wait_for_timeout(200)
        S.click('#animals .abtn[data-a="%d"]' % v)
        S.page.wait_for_timeout(260)
        fills += 1
    S.wait_win(8)
    S.page.wait_for_timeout(2600)
    S.stats['levelsPlayed'].append({'flat': 1, 'fills': fills, 'sec': round(time.time() - t0, 1)})

    print('[sudoku] C: jump flat10 (6x6)')
    S.jump_save(list(range(10)))
    ok = S.wait_level(10)
    s = S.snap('C_flat10_loaded')
    S.shot('six_by_six')
    S.ev('C_loaded', 'level=%s cellW=%s lamps=%s' % (s['hk']['level'], s.get('cellW'), s.get('lamps')))
    hints_used, wrongs, stuck_events = 0, 0, 0
    idle_done, given_tap_done, mash_done = False, False, False
    for it in range(40):
        bd = S.page.evaluate("() => SUD.board")
        lv = S.hook_level()
        if bd is None or (lv and lv.get('won')): break
        cells, n = bd['cells'], bd['n']
        empt = [i for i, v in enumerate(cells) if v < 0]
        if not empt:
            break
        if not given_tap_done and it == 1:
            given_tap_done = True
            gi = next(i for i in range(n * n) if bd['given'][i])
            S.click('#board .cell[data-i="%d"]' % gi)
            S.page.wait_for_timeout(400)
            sg = S.snap('C_given_cell_tap')
            S.ev('C_given_tap', 'sel=%s (given not selectable)' % sg['sel'])
        if not idle_done and it == 2:
            idle_done = True
            S.idle_probe('flat10_mid', 23)
        if not mash_done and it == 3:
            mash_done = True
            S.think(1.2, 2.0)
            for _ in range(4):   # 连按提示灯 4 下（3 额度+1 超限）
                S.click('#btn-hint')
                S.page.wait_for_timeout(700)
                sm = S.snap('C_hint_mash_%d' % hints_used)
                hints_used += 1
                S.ev('C_hint_press', 'ghost=%s pulseCells=%s pulseAbtn=%s lamps=%s spent=%s' % (
                    sm['ghost'], sm['pulseCells'], sm['pulseAbtn'], sm['lamps'], sm['hintBtn']))
                if sm['pulseCells'] and sm['pulseAbtn']:
                    S.think(1.2, 2.0)
                    S.click('#board .cell[data-i="%d"]' % sm['pulseCells'][0])
                    S.page.wait_for_timeout(220)
                    S.click('#animals .abtn[data-a="%d"]' % sm['pulseAbtn'][0])
                    S.page.wait_for_timeout(300)
        tgt = None
        for i in empt:
            c = candidates(cells, i, n, 2, 3)
            if len(c) == 1: tgt = (i, c[0]); break
        if tgt is not None:
            i, v = tgt
            S.think(1.4, 2.6)
            S.click('#board .cell[data-i="%d"]' % i)
            S.page.wait_for_timeout(220)
            S.click('#animals .abtn[data-a="%d"]' % v)
            S.page.wait_for_timeout(300)
            continue
        stuck_events += 1
        S.ev('C_stuck_no_single', 'remaining=%d hintsUsed=%d' % (len(empt), lv['hintsUsed']))
        if lv['hintsUsed'] < 3:
            S.click('#btn-hint')
            S.page.wait_for_timeout(1300)
            sm = S.snap('C_hint_stuck')
            hints_used += 1
            S.ev('C_hint_stuck_follow', 'pulseCells=%s pulseAbtn=%s' % (sm['pulseCells'], sm['pulseAbtn']))
            if sm['pulseCells'] and sm['pulseAbtn']:
                S.think(1.4, 2.2)
                S.click('#board .cell[data-i="%d"]' % sm['pulseCells'][0])
                S.page.wait_for_timeout(220)
                S.click('#animals .abtn[data-a="%d"]' % sm['pulseAbtn'][0])
                S.page.wait_for_timeout(300)
            continue
        i = empt[0]
        cands = candidates(cells, i, n, 2, 3)
        sol = S.page.evaluate("() => SUD.solution")
        guess = cands[0] if cands else 0
        S.think(1.6, 2.6)
        S.click('#board .cell[data-i="%d"]' % i)
        S.page.wait_for_timeout(200)
        S.click('#animals .abtn[data-a="%d"]' % guess)
        S.page.wait_for_timeout(600)
        sc = S.page.evaluate("() => ({conflict: Array.from(document.querySelectorAll('#board .cell.conflict')).map(e=>Number(e.dataset.i)), board: SUD.board})")
        if sc['conflict']:
            wrongs += 1
            S.ev('C_guess_conflict', 'cell=%d guess=%d' % (i, guess))
            S.page.wait_for_timeout(1000)
            S.click('#board .cell[data-i="%d"]' % i)
            S.page.wait_for_timeout(250)
            if wrongs >= 3:
                S.ev('C_giveup', 'wrong guesses=%d' % wrongs)
                S.idle_probe('flat10_giveup', 23)
                for _ in range(3):
                    S.page.mouse.click(*center_of(S.page, '#board .cell'))
                    S.page.wait_for_timeout(400)
                S.snap('C_after_giveup'); S.shot('giveup_state')
                S.stats['levelsPlayed'].append({'flat': 10, 'hints': hints_used, 'guessConflicts': wrongs,
                                                'gaveUp': True, 'stuckEvents': stuck_events})
                return S
        elif guess != sol[i]:
            S.ev('C_silent_wrong_fill', 'cell=%d guess=%d sol=%d no-conflict-but-wrong' % (i, guess, sol[i]))
    won = S.wait_win(12)
    s = S.snap('C_win')
    S.ev('C_win', 'won=%s ov=%s hints=%d' % (won, s['ov'], hints_used))
    if s['ov']: S.shot('celebrate_6x6')
    S.page.wait_for_timeout(3200)
    S.stats['levelsPlayed'].append({'flat': 10, 'hints': hints_used, 'guessConflicts': wrongs,
                                    'gaveUp': False, 'stuckEvents': stuck_events})
    return S

'''
src = src[:start] + new_fun_marker(src, start, end, new_fn) if False else src[:start] + new_fn + src[end:]
io.open(p, 'w', encoding='utf-8').write(src)
print('sudoku runner rewritten OK')
