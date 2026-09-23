# -*- coding: utf-8 -*-
"""batch19 审查修复定向实证（verify_review19_fixes.py）
T1 M1 ≥4 连即胜：五连即胜+XX_XX 补空档即胜（engScanWin/makesFourAt 双函数直测）
T2 M2 负局换先手：ch3 送死负局 → 重开局 first 翻转（AI 先→玩家先）
T3 M3 死局救援：构造「合规但非解」死局 → engTeachCell 返 dead=true 且指向错格（非 0 候选格）
T4 m1 cipher 救援答案级 miss≥2 门控：0 错触发 rescueAct 无正确首卡 breathe；miss≥2 有
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
BASE = os.path.dirname(os.path.abspath(__file__))
results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok), note))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- T1 gomoku4 ≥4 连即胜 ----
    pg = b.new_page()
    pg.goto('file:///' + os.path.join(BASE, 'gomoku4', 'index.html').replace('\\', '/') + '?verify=1')
    for _ in range(300):
        pg.wait_for_timeout(500)
        if 'VERIFY' in pg.title():
            break
    r = pg.evaluate("""() => {
      const b5 = new Array(25).fill(0);
      [10,11,12,13,14].forEach(i => b5[i] = 1);           // 玩家整行五连
      const w1 = engScanWin(b5.slice(), 5);
      const b2 = new Array(25).fill(0);
      [10,11,12,14].forEach(i => b2[i] = 1);               // XX_XX 型
      const mk = makesFourAt(b2.slice(), 5, 13, 1);        // 补中间空档
      const b3 = new Array(16).fill(0);
      [5,6,9,10].forEach(i => b3[i] = 2);                  // AI 2×2 块（横 2 竖 2 不胜）
      const w3 = engScanWin(b3.slice(), 4);
      return { five: !!(w1 && w1.who === 1 && w1.line.length === 5),
               gap: mk, block2: !w3 };
    }""")
    chk('T1a 五连即胜（engScanWin 返 5 格线）', r['five'], str(r))
    chk('T1b XX_XX 补空档即胜（makesFourAt）', r['gap'])
    chk('T1c 二连/2×2 块不误判', r['block2'])
    # ---- T2 负局换先手 ----
    pg.evaluate("""() => { const _sg = startGame;
      startGame = function() { try {
        if (typeof curGame !== 'undefined' && curGame && curGame.phase !== 'play')
          window.__finalSnap = { board: curGame.board.slice(), phase: curGame.phase, n: curGame.n };
      } catch(e) {} return _sg.apply(this, arguments); }; }""")   # 终局 tap 的 await 已含重开（本批实锤）
    pg.evaluate("(f) => GK.start(12)", 12)   # ch3：AI 先手 full
    for _ in range(160):
        st = pg.evaluate("() => GK.currentLevel ? GK.currentLevel.locked : 1")
        if not st:
            break
        pg.wait_for_timeout(50)
    r_last, tries = 'moved', 0
    while tries < 80:
        tries += 1
        q = pg.evaluate("() => GK.quiz")
        if not q or q['phase'] != 'play':
            break
        if q['turn'] == 1:
            i = pg.evaluate("() => engSuicidePick(GK.quiz.board.slice(), GK.quiz.N)")
            r_last = pg.evaluate("(i) => (async () => { try { return String(await GK.tapCell(i)) } catch(e){ return 'E' } })()", i)
            if r_last != 'moved':
                break                                  # 终局手（lose/…）
        else:
            pg.evaluate("() => (async () => { try { await GK.aiMove() } catch(e){} })()")
            pg.wait_for_timeout(150)
    pg.wait_for_timeout(800)
    snap = pg.evaluate("() => window.__finalSnap || null")
    q2 = pg.evaluate("() => GK.quiz")
    lose_seen = bool(snap and snap['phase'] == 'lose') or r_last == 'wrong'  # 引擎负局字串='wrong'
    reopened = q2 and q2['phase'] == 'play' and q2['board'].count(0) == q2['N'] * q2['N']
    chk('T2 负局出现+盘面重开', lose_seen and reopened, 'lose=%s reopened=%s r=%s' % (lose_seen, reopened, r_last))
    chk('T2 重开换先手（空盘 turn=1 玩家先）', reopened and q2['turn'] == 1,
        'turn=%s（ch3 原为 AI 先手）' % (q2 and q2['turn']))
    pg.close()
    # ---- T3 sudokunum 死局救援 ----
    pg = b.new_page()
    pg.goto('file:///' + os.path.join(BASE, 'sudokunum', 'index.html').replace('\\', '/') + '?verify=1')
    for _ in range(300):
        pg.wait_for_timeout(500)
        if 'VERIFY' in pg.title():
            break
    r = pg.evaluate("""() => {
      SN.start(25);                            // ch3：空格 12-14——死局构造需空邻位（ch1 空格仅 6 且
      const q = cur.quizzes[cur.step];          // 每格 cand=1、given 邻值集 5 值+空邻位线冲突=结构性不可达）
      const base = q.grid.slice();
      const nbrs = j => {                       // j 的行/列/宫邻位（不含 j）
        const out = [], r0 = (j / 6) | 0, c0 = j % 6;
        for (let k = 0; k < 36; k++) {
          if (k === j) continue;
          const rk = (k / 6) | 0, ck = k % 6;
          if (rk === r0 || ck === c0 || (rk >> 1 === r0 >> 1 && ((ck / 3) | 0) === ((c0 / 3) | 0))) out.push(k);
        }
        return out;
      };
      // 按 j 定向：贪心把 j 的每个空邻位填「能补新值的合规非解值」，追求 j 候选=0
      for (let j = 0; j < 36; j++) {
        if (base[j] !== 0) continue;
        const g = base.slice();
        const seen = new Set(nbrs(j).filter(k => g[k]).map(k => g[k]));
        const mines = [];
        for (const k of nbrs(j)) {
          if (g[k] !== 0) continue;
          let cands = candOf(g, k, true).filter(v => v !== q.sol[k]);
          if (!cands.length) continue;
          cands.sort((a, b) => (seen.has(a) ? 1 : 0) - (seen.has(b) ? 1 : 0));   // 新值优先
          g[k] = cands[0];
          seen.add(cands[0]);
          mines.push(k);
        }
        if (candOf(g, j, true).length === 0 && mines.length) {
          q.grid = g;                            // 孩子已放错若干格的死局（M3 场景）
          const tc = engTeachCell(q);
          q.grid = base;
          return { mines: mines, j: j, t: tc && { i: tc.i, dead: !!tc.dead, n: tc.n } };
        }
      }
      return { mines: [] };
    }""")
    t = r.get('t')
    ok3 = bool(r.get('mines')) and t and t['dead'] is True and t['i'] in r['mines'] and t['n'] is None
    chk('T3 死局救援指错格（dead+指向 mine+无值）', ok3, str(r))
    pg.close()
    # ---- T4 cipher 救援答案级门控 ----
    pg = b.new_page()
    pg.goto('file:///' + os.path.join(BASE, 'cipher', 'index.html').replace('\\', '/') + '?verify=1')
    for _ in range(300):
        pg.wait_for_timeout(500)
        if 'VERIFY' in pg.title():
            break
    r = pg.evaluate("""() => {
      CI.start(0);
      const q = cur.quizzes[cur.step];
      const out = {};
      // 0 错：rescueAct 应只 pulse 表行（方向级），不给正确首卡 breathe（答案级）
      clearRescueVisual();
      rescueAct(q);
      const cardBreathes0 = document.querySelectorAll('.optcard.breathe, .card.breathe').length;
      const rowPulse0 = document.querySelectorAll('.ctab-row.pulse, .row.pulse, .ctrow.pulse').length;
      out.zero = { cards: cardBreathes0, rows: rowPulse0, miss: q.miss };
      // miss≥2：rescueAct 应给正确首卡 breathe
      q.miss = 2;
      clearRescueVisual();
      rescueAct(q);
      out.two = { cards: document.querySelectorAll('.optcard.breathe, .card.breathe').length };
      return out;
    }""")
    ok4 = r['zero']['cards'] == 0 and r['zero']['rows'] >= 0 and r['two']['cards'] >= 1
    chk('T4 cipher 救援：0 错无答案级卡 breathe/miss≥2 有', ok4, str(r))
    pg.close()
    b.close()

fails = [x for x in results if not x[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
