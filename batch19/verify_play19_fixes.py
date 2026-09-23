# -*- coding: utf-8 -*-
"""batch19 试玩修复定向实证（verify_play19_fixes.py）
U1 P1 cipher 判错保留对位：错误序列（位 0 干扰+其余按 answer）判错后——位 0 卡回池、
   对位卡留槽（built=idx→值等 answer[k]），重拼从半程推进
U2 P5 sudokunum ghost 延迟：scheduleHelpGhost(1500)（代码级）+错后 300ms 窗内 ghost 不可见（时序）
U3 P4 gomoku4 教学期可见反馈：watch 期 tap 空格 → 该格 .breathe 在场（无声环境可见反馈）
"""
import sys, os, io, re
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
BASE = os.path.dirname(os.path.abspath(__file__))
results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok), note))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# U2 代码级（verify 页 pointGhostAt 有 VERIFY 守卫=ghost 恒隐，DOM 时序断言不可测，以代码级为准）
src = io.open(os.path.join(BASE, 'sudokunum', '_src', 'game-main.js'), encoding='utf-8').read()
chk('U2a scheduleHelpGhost(1500)（代码级）', 'scheduleHelpGhost(1500)' in src)
chk('U2b verify 页 ghost 恒隐守卫在场（防演出污染断言）', 'VERIFY || !el' in src.split('function pointGhostAt')[1][:200])

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- U1 cipher 判错保留对位 ----
    pg = b.new_page()
    pg.goto('file:///' + os.path.join(BASE, 'cipher', 'index.html').replace('\\', '/') + '?verify=1')
    for _ in range(300):
        pg.wait_for_timeout(500)
        if 'VERIFY' in pg.title():
            break
    pg.evaluate("() => CI.start(0)")
    pg.wait_for_timeout(300)
    q0 = pg.evaluate("() => CI.quiz")
    dist_i = next((i for i, o in enumerate(q0['opts']) if o['v'] not in set(q0['answer'])), None)
    if len(q0['answer']) >= 2 and dist_i is not None:
        pg.evaluate("(i) => (async () => { await CI.tapOpt(i) })()", dist_i)
        for kk in range(1, len(q0['answer'])):
            val = q0['answer'][kk]
            for i, o in enumerate(q0['opts']):
                if o['v'] == val and pg.evaluate("(i) => (async () => { try { const r = await CI.tapOpt(i); return r !== false && r != null } catch(e){ return false } })()", i):
                    break
        pg.wait_for_timeout(600)
        q1 = pg.evaluate("() => CI.quiz")
        kept = [k for k, bv in enumerate(q1['built']) if bv is not None and q1['opts'][bv]['v'] == q0['answer'][k]]
        cleared0 = q1['built'][0] is None
        miss1 = q1['miss'] == 1
        chk('U1a 判错=miss 恰一次', miss1, 'miss=%s' % (q1 and q1['miss']))
        chk('U1b 错位清空（位 0 干扰回池）', cleared0, str(q1['built']))
        chk('U1c 对位保留（位 1+ 值等 answer）', len(kept) == len(q0['answer']) - 1, 'kept=%s' % kept)
        # 重拼推进
        adv = False
        for i, o in enumerate(q0['opts']):
            pass
        val0 = q0['answer'][0]
        for i, o in enumerate(q0['opts']):
            if o['v'] == val0 and pg.evaluate("(i) => (async () => { try { const r = await CI.tapOpt(i); return r !== false && r != null } catch(e){ return false } })()", i):
                break
        for _ in range(200):
            st = pg.evaluate("() => CI.currentLevel ? CI.currentLevel.step : null")
            if st == 1:
                adv = True
                break
            pg.wait_for_timeout(50)
        chk('U1d 补错位即推进（半程重拼）', adv)
    else:
        chk('U1 前置（flat0 题型适用）', False, 'answer=%s dist=%s' % (q0 and len(q0['answer']), dist_i))
    pg.close()
    # ---- U3 gomoku4 教学期可见反馈 ----
    pg = b.new_page()
    pg.goto('file:///' + os.path.join(BASE, 'gomoku4', 'index.html').replace('\\', '/') + '?verify=1')
    for _ in range(300):
        pg.wait_for_timeout(500)
        if 'VERIFY' in pg.title():
            break
    r = pg.evaluate("""() => {
      GK.start(0);
      state.demo = true;                   // 直构吞输入期（与教学 watch 同态；教学函数时序不稳不直调）
      const cell = document.querySelector('.cell:not(.p1):not(.p2)');
      if (!cell) return { ok: false, why: 'no cell' };
      cell.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));   // 棋盘绑 pointerdown 非 click
      return { ok: true, cls: cell.className };
    }""")
    # 教学 watch 期点空格：cell 应获 breathe 类（600ms 后移除——采样窗口内）
    pg.wait_for_timeout(200)
    r2 = pg.evaluate("""() => {
      const cells = document.querySelectorAll('.breathe');
      return cells.length;
    }""")
    chk('U3 教学期 tap 空格可见反馈（.breathe 在场）', r.get('ok') and r2 >= 1, 'cls=%s breathe=%s' % (r.get('cls'), r2))
    pg.close()
    b.close()

fails = [x for x in results if not x[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
