# -*- coding: utf-8 -*-
"""sudoku _selftest — headless playwright 自测（不弹窗/不连已开浏览器/不杀进程）
1. ?verify=1 → title=VERIFY PASS（40 关唯一解+约束+单元+布局）+ 零外部资源（离线断言）
2a. 预置存档(跳过教学) → SUD.board/solution 逐格真实点击（点格→点动物按钮）通关 → .k-celebrate 3 星 → 写档推进
2b. 全新存档 → 教学"看"（冲突演示：先错晃再放对）→"帮"高亮+幽灵手指 → 真实点击 →"独" → tutSeen 持久化
2c. 冲突零惩罚：填冲突动物 → 该格+源格 .conflict、wrongs=1 → 点该格清除 → 填对
2d. 提示消耗：hint×3（灯逐个灭、按钮 spent）→ 第 4 次 null
3. 双 viewport(1280x800/800x1180)：overflowX<=0、6×6 格 >=64、4×4 >=72、动物按钮 >=64、按钮间距 >=16
4. 全页截图非空白；全程 0 JS 错误（pageerror+console.error）
"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE / 'index.html').as_uri()
TODAY = time.strftime('%Y-%m-%d')
RESULTS = []
JS_ERRORS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))


def preset_save(tut_seen=True):
    save = {
        'v': '1.0', 'game': 'sudoku', 'firstDay': TODAY, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
    }
    if tut_seen:
        save['sud'] = {'tutSeen': True}
    return 'localStorage.setItem("kidsgame_sudoku", ' + json.dumps(json.dumps(save)) + ')'


def watch_page(pg):
    pg.on('pageerror', lambda e: JS_ERRORS.append('pageerror: %s' % e))
    pg.on('console', lambda m: JS_ERRORS.append('console.error: %s' % m.text) if m.type == 'error' else None)


def png_nonblank(path):
    try:
        from PIL import Image
        import statistics
        im = Image.open(path).convert('L').resize((160, 100))
        px = list(im.getdata())
        return statistics.pstdev(px) > 4, 'PIL pixel stdev=%.1f' % statistics.pstdev(px)
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL 不可用，按体积判定)' % n


FIND_WRONG = '''() => {
  const b = SUD.board, sol = SUD.solution;
  const n = b.n, boxC = n === 4 ? 2 : 3;
  for (let i = 0; i < b.cells.length; i++) {
    if (b.given[i] || b.cells[i] >= 0) continue;
    const r = (i / n) | 0, c = i % n;
    for (let v = 0; v < n; v++) {
      if (v === sol[i]) continue;
      let conf = false;
      for (let j = 0; j < b.cells.length; j++) {
        if (j === i || b.cells[j] < 0) continue;
        const r2 = (j / n) | 0, c2 = j % n;
        const sameBox = r2 >= ((r / 2) | 0) * 2 && r2 < ((r / 2) | 0) * 2 + 2 &&
                        c2 >= ((c / boxC) | 0) * boxC && c2 < ((c / boxC) | 0) * boxC + boxC;
        if ((r2 === r || c2 === c || sameBox) && b.cells[j] === v) { conf = true; break; }
      }
      if (conf) return { cell: i, bad: v, good: sol[i] };
    }
  }
  return null;
}'''


def click_solve(pg):
    """逐空格真实点击：点格选中 → 点正确动物按钮 → 等 .k-celebrate"""
    t0 = time.time()
    for _ in range(48):
        b = pg.evaluate('SUD.board')
        sol = pg.evaluate('SUD.solution')
        empties = [i for i in range(len(b['cells'])) if not b['given'][i] and b['cells'][i] < 0]
        if not empties:
            break
        i = empties[0]
        pg.click('.cell[data-i="%d"]' % i)
        pg.click('.abtn[data-a="%d"]' % sol[i])
        pg.wait_for_timeout(90)
    pg.wait_for_selector('.k-celebrate', timeout=6000)
    return time.time() - t0


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()  # 无头全新实例，绝不触碰用户浏览器
        try:
            # ---- 1. verify=1 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = ctx.new_page()
            watch_page(pg)
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=20000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s layoutOk=%s' % (vj['pass'], vj['total'], vj['layoutOk']))
            uniq40 = all(r['unique'] and r['solutionValid'] and r['ok'] for r in
                         list(vj['levels'].values()) + list(vj['gen'].values()))
            check('40 levels unique+valid', uniq40 and len(vj['levels']) == 20 and len(vj['gen']) == 20,
                  'static=%d gen=%d' % (len(vj['levels']), len(vj['gen'])))
            res = pg.evaluate('performance.getEntriesByType("resource").length')
            check('offline: zero resource entries', res == 0, 'resources=%s' % res)
            ctx.close()

            # ---- 2a. 预置存档跳过教学，真实点击通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            watch_page(pg)
            pg.goto(URL)
            pg.wait_for_function('window.SUD && SUD.board !== null', timeout=8000)
            lv = pg.evaluate('SUD.currentLevel')
            check('start at 1-0 (ch 1-based)', lv['ch'] == 1 and lv['lv'] == 0 and lv['flat'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('SUD.tutorial') == 'none')
            b0 = pg.evaluate('SUD.board')
            check('board shape 4x4, holes 5-7', b0['n'] == 4 and len(b0['cells']) == 16 and
                  5 <= b0['cells'].count(-1) <= 7, 'holes=%d' % b0['cells'].count(-1))
            dt = click_solve(pg)
            check('real-click win -> .k-celebrate', True, '%.1fs' % dt)
            star_html = pg.locator('.k-celebrate .k-star').count()
            check('celebrate shows 3 stars (0 hint 0 wrong)', star_html == 3, 'stars=%d' % star_html)
            pg.wait_for_timeout(2600)  # 过关推进
            lv2 = pg.evaluate('SUD.currentLevel')
            check('auto-proceed to next level', lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_sudoku")'))
            check('save 1-0 recorded (3 stars)', saved['levels'].get('1-0', {}).get('stars') == 3,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学"看→帮→独"真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False))
            pg = ctx.new_page()
            watch_page(pg)
            pg.goto(URL)
            pg.wait_for_function('window.SUD && SUD.board !== null', timeout=8000)
            pg.wait_for_function("SUD.tutorial === 'help'", timeout=15000)  # 等"看"演示完成
            check('tutorial watch done -> re-dealt level', pg.evaluate('SUD.currentLevel.flat') == 0)
            try:  # "帮"阶段 pointGhost 在 help 开始后 ~700ms 触发，等待而非立即断言
                pg.wait_for_function("document.querySelectorAll('.cell.pulse').length >= 1", timeout=4500)
                pulse = pg.evaluate("document.querySelectorAll('.cell.pulse, .abtn.pulse').length")
            except Exception:
                pulse = 0
            check('help: determinable cell highlighted (pulse)', pulse >= 1, 'pulse=%d' % pulse)
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4500)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost visible', ghost_shown)
            click_solve(pg)  # "帮"首次正确填入→"独"，真实点击继续通关
            check('tutorial level playable -> .k-celebrate', True)
            tut_end = pg.evaluate('SUD.tutorial')
            check('tutorial reached solo after first correct', tut_end == 'solo', 'tut=%s' % tut_end)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_sudoku")'))
            check('sud.tutSeen persisted', (saved.get('sud') or {}).get('tutSeen') is True, str(saved.get('sud')))
            ctx.close()

            # ---- 2c. 冲突零惩罚：错填→红框晃→点格清除→填对 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            watch_page(pg)
            pg.goto(URL)
            pg.wait_for_function('window.SUD && SUD.board !== null', timeout=8000)
            w = pg.evaluate(FIND_WRONG)
            check('conflict probe found', w is not None, str(w))
            pg.click('.cell[data-i="%d"]' % w['cell'])
            pg.click('.abtn[data-a="%d"]' % w['bad'])
            pg.wait_for_timeout(300)
            st = pg.evaluate('''() => ({
              nconf: document.querySelectorAll('.cell.conflict').length,
              wrongs: SUD.currentLevel.wrongs, won: SUD.currentLevel.won,
              val: SUD.board.cells[%d]
            })''' % w['cell'])
            check('wrong fill: cell+source conflict shake, zero punishment',
                  st['nconf'] >= 2 and st['wrongs'] == 1 and not st['won'] and st['val'] == w['bad'], str(st))
            pg.click('.cell[data-i="%d"]' % w['cell'])  # 再点已填格=清除
            pg.wait_for_timeout(150)
            st2 = pg.evaluate('SUD.board.cells[%d]' % w['cell'])
            check('tap filled cell -> cleared', st2 == -1, 'cell=%s' % st2)
            pg.click('.cell[data-i="%d"]' % w['cell'])
            pg.click('.abtn[data-a="%d"]' % w['good'])
            pg.wait_for_timeout(150)
            st3 = pg.evaluate('''() => ({ val: SUD.board.cells[%d], wrongs: SUD.currentLevel.wrongs })''' % w['cell'])
            check('refill correct -> no conflict, wrongs kept', st3['val'] == w['good'] and st3['wrongs'] == 1, str(st3))
            ctx.close()

            # ---- 2d. 提示消耗（3 次用尽）----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            watch_page(pg)
            pg.goto(URL)
            pg.wait_for_function('window.SUD && SUD.board !== null', timeout=8000)
            h1 = pg.evaluate('SUD.hint()')
            sol = pg.evaluate('SUD.solution')
            check('hint returns determinable cell == solution',
                  h1 and h1['animal'] == sol[h1['cell']], str(h1))
            lamps1 = pg.evaluate('document.querySelectorAll("#hint-lamps i.off").length')
            pg.evaluate('SUD.hint()')
            pg.evaluate('SUD.hint()')
            st = pg.evaluate('''() => ({
              used: SUD.currentLevel.hintsUsed, lamps: document.querySelectorAll("#hint-lamps i.off").length,
              spent: document.getElementById("btn-hint").classList.contains("spent"),
              again: SUD.hint()
            })''')
            check('hint x3 consumed, lamp dims, button spent, 4th null',
                  lamps1 == 1 and st['used'] == 3 and st['lamps'] == 3 and st['spent'] and st['again'] is None, str(st))
            ctx.close()

            # ---- 3+4. 双 viewport 布局 + 截图（verify 页实建 6×6 供测量）----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page()
                watch_page(pg)
                pg.goto(URL + '?verify=1')
                pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=20000)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const cells = [...document.querySelectorAll('.cell')];
                  const abtns = [...document.querySelectorAll('.abtn')];
                  const cr = cells[0].getBoundingClientRect(), ar = abtns[0].getBoundingClientRect();
                  const rs = abtns.map(b => b.getBoundingClientRect());
                  let gapMin = 999;
                  for (let a = 0; a < rs.length; a++) for (let b = 0; b < rs.length; b++) {
                    if (a === b) continue;
                    gapMin = Math.min(gapMin, Math.abs(rs[a].x - rs[b].x) - rs[a].width);
                  }
                  return { ox: de.scrollWidth - de.clientWidth, n: cells.length,
                           cellW: cr.width, cellH: cr.height,
                           abtnW: ar.width, abtnH: ar.height, abtnGap: gapMin };
                }''')
                check('viewport %dx%d overflowX<=0' % vp, m['ox'] <= 0, str(m))
                check('viewport %dx%d 6x6 cells>=64 abtn>=64 gap>=16' % vp,
                      m['n'] == 36 and m['cellW'] >= 64 and m['cellH'] >= 64 and
                      m['abtnW'] >= 64 and m['abtnH'] >= 64 and m['abtnGap'] >= 16,
                      'cell=%.0fx%.0f abtn=%.0fx%.0f gap=%.0f' % (m['cellW'], m['cellH'], m['abtnW'], m['abtnH'], m['abtnGap']))
                # 正常模式截图（真实棋盘+动物面板）
                pg2 = ctx.new_page()
                watch_page(pg2)
                pg2.goto(URL)
                pg2.wait_for_function('window.SUD && SUD.board !== null', timeout=8000)
                pg2.wait_for_timeout(800)
                shot = HERE / ('_shot_%dx%d.png' % vp)
                pg2.screenshot(path=str(shot), full_page=True)
                ok, detail = png_nonblank(shot)
                check('screenshot %dx%d non-blank' % vp, ok, detail)
                if ok:
                    shot.unlink()
                ctx.close()
        finally:
            browser.close()

    check('zero JS errors all pages', len(JS_ERRORS) == 0, '; '.join(JS_ERRORS[:5]))
    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
