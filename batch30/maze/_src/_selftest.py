# -*- coding: utf-8 -*-
"""maze _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程；单 page 串行）
1. ?verify=1 → title=VERIFY PASS n/n（n>=50）+ __mzVlog.pass==total+layoutOk + 0 pageerror
2. python 侧独立 DFS 复算对账：__mzMazeDump 120 局（40 关×3 局）——
   sub1/2 entry→goal 连通；sub3 分段三验（门关 entry→key 通 + 门开 key→goal 通 +
   门关 entry→goal 不通=门必经）——禁复用页面 JS，python 自带 BFS
3. 真实页（新 context 空存档）：教学 watch 期真实乱点被吞（小兔不动）→ watch 演示走完
   → ghost .show（help 帮指）→ 真实点格走通首局 → 换局（章节点/局点变化）→ ghost 收（solo 放手）
4. 真实页 MZ 钩子暴露（window.MZ 在场，quiz 形状正确，tapCell/start/autoSolve 可用）+ 截图像素非空白
5. 全程 0 pageerror
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
RESULTS = []

def check(name, ok, info=''):
    RESULTS.append((name, bool(ok), info))
    print(('PASS ' if ok else 'FAIL ') + name + (' | ' + str(info)[:220] if info else ''))

def bfs(size, walls, block, frm, to):
    """python 独立 BFS（禁复用页面 JS）：walls=墙格集，block=额外障碍（门关=[door]）"""
    bad = {(w['r'], w['c']) for w in walls} | {(b['r'], b['c']) for b in block}
    tgt = (to['r'], to['c'])
    if tgt in bad:
        return False
    seen = {(frm['r'], frm['c'])}
    q = [(frm['r'], frm['c'])]
    while q:
        r, c = q.pop(0)
        if (r, c) == tgt:
            return True
        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < size and 0 <= nc < size and (nr, nc) not in bad and (nr, nc) not in seen:
                seen.add((nr, nc))
                q.append((nr, nc))
    return False

with sync_playwright() as pw:
    browser = pw.chromium.launch()

    # ---- 1. verify 页 ----
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL + '?verify=1')
    title = None
    try:
        page.wait_for_function("document.title.indexOf('VERIFY') === 0", timeout=240000)
        title = page.title()
    except Exception as e:
        title = 'TIMEOUT: ' + repr(e)[:120]
    check('verify title', title and title.startswith('VERIFY PASS'), title)
    vlog = page.evaluate("window.__mzVlog ? {total:__mzVlog.total, pass:__mzVlog.pass, layoutOk:__mzVlog.layoutOk,"
                         "units:__mzVlog.units, smokes:__mzVlog.smokes, genN:Object.keys(__mzVlog.gen||{}).length} : null")
    if vlog:
        check('verify pass==total', vlog['pass'] == vlog['total'], '%s/%s layoutOk=%s' % (vlog['pass'], vlog['total'], vlog['layoutOk']))
        check('verify n>=50', vlog['total'] >= 50, vlog['total'])
        bad = [k for k, v in (vlog.get('units') or {}).items() if not v.get('ok')]
        badL = [k for k, v in (vlog.get('smokes') or {}).items() if not v.get('ok')]
        check('verify all units ok', not bad and not badL, 'bad=%s badSmoke=%s' % (bad, badL))
        lv = vlog.get('units', {}).get('tutorial', {})
        check('tutorial chain', lv.get('ok'), 'demoR=%s watchMs=%s' % (lv.get('demoR'), lv.get('watchMs')))
        fr = vlog.get('units', {}).get('frame', {})
        check('frame-content M', fr.get('ok'), fr.get('bad'))
        kd = vlog.get('smokes', {}).get('keydrive', {})
        check('ch3 keydoor drive', kd.get('ok'), 'keyTurns=%s doorPasses=%s' % (kd.get('keyTurns'), kd.get('doorPasses')))
        sm = vlog.get('smokes', {}).get('flat0', {})
        check('flat0 autoSolve', sm.get('ok'), 'taps=%s stars=%s' % (sm.get('taps'), sm.get('stars')))
        cl = vlog.get('units', {}).get('clips', {})
        check('clips 10 injected', cl.get('ok'), 'n=%s durs=%s' % (cl.get('n'), cl.get('durs')))
    check('verify 0 pageerror', not errors, errors[:3])

    # ---- 2. python 侧独立 DFS 复算（120 局：可解性 + ch3 分段三验） ----
    dump = page.evaluate('window.__mzMazeDump || null')
    ok_reach, ok_door, n_run = True, True, 0
    bad_case = ''
    if not dump:
        ok_reach = False
        bad_case = 'no dump'
    else:
        for f, runs in dump.items():
            for i, q in enumerate(runs):
                n_run += 1
                size, walls = q['size'], q['walls']
                if q['sub'] < 3:
                    if not bfs(size, walls, [], q['entry'], q['goal']):
                        ok_reach = False; bad_case = 'unreach %s/%d' % (f, i); break
                else:
                    k, d = q['key'], q['door']
                    if not bfs(size, walls, [d], q['entry'], k):                      # 门关 entry→key
                        ok_door = False; bad_case = 'segKey %s/%d' % (f, i); break
                    if not bfs(size, walls, [], k, q['goal']):                        # 门开 key→goal
                        ok_door = False; bad_case = 'segGoal %s/%d' % (f, i); break
                    if bfs(size, walls, [d], q['entry'], q['goal']):                  # 门关 entry→goal 必不通
                        ok_door = False; bad_case = 'doorBypass %s/%d' % (f, i); break
            if not (ok_reach and ok_door):
                break
    check('python DFS solvable 120 runs', n_run == 120 and ok_reach, 'runs=%d %s' % (n_run, bad_case))
    check('python DFS ch3 tri-segment', ok_door, bad_case)

    # flat0-19 全量 UI autoSolve（verify 跑完后同页追加——不占 gate G1 轮询窗）
    full20 = page.evaluate("""(async () => {
      const out = [];
      for (let flat = 0; flat < 20; flat++) {
        MZ.start(flat);
        const a = await MZ.autoSolve();
        const lv = MZ.currentLevel;
        out.push(flat + ':' + (a.done ? '1' : '0') + '/t' + a.taps + '/s' + (lv ? lv.stars : '?'));
      }
      return out;
    })()""")
    check('flat0-19 full autoSolve', all(x.split(':')[1].startswith('1/') and x.endswith('s3') for x in full20), full20[:8])
    page.screenshot(path=str(SHOTS / 'verify.png'))
    ctx.close()

    # ---- 3. 真实页：教学三段（watch→help→solo）+ 乱点吞输入 ----
    ctx2 = browser.new_context(viewport={'width': 1280, 'height': 800})
    page2 = ctx2.new_page()
    errors2 = []
    page2.on('pageerror', lambda e: errors2.append(str(e)))
    page2.goto(URL)
    page2.wait_for_selector('#scene .grid .bun', timeout=10000)
    # 教学演示期乱点：被吞（小兔不动——步数恒 0）
    page2.click('#scene .cell[data-r="3"][data-c="3"]', timeout=3000)
    page2.wait_for_timeout(400)
    step0 = page2.evaluate('window.MZ.quiz.step')
    check('tutorial swallow taps', step0 == 0, 'step=' + str(step0))
    # watch 演示走完（真实 ~9.4s：tut watch→help 判据；ghost.show 在 watch 早期即出现
    # （演示指向），禁用它当 help 信号——b30 实测坑）→ help 期 ghost 帮指在场
    page2.wait_for_function("window.MZ.tutorial === 'help'", timeout=30000)
    page2.wait_for_selector('#ghost.show', timeout=8000)
    check('tutorial help ghost', True)
    # 教学期真实点格：走 2 步到萝卜（help 期点击有效）→ 首局 right → 换局
    # 锚点局 entry(1,1)→goal(1,3)：点 (1,2) 再点 (1,3)——走真实 pointer 路径
    page2.click('#scene .cell[data-r="1"][data-c="2"]', timeout=5000)
    page2.wait_for_timeout(700)
    page2.click('#scene .cell[data-r="1"][data-c="3"]', timeout=5000)
    page2.wait_for_function('(window.MZ.currentLevel && window.MZ.currentLevel.step) === 1', timeout=15000)
    check('advance next run', True, 'run 0 -> 1')
    page2.wait_for_timeout(800)
    ghostGone = page2.evaluate("!document.querySelector('#ghost.show')")
    check('solo ghost released', ghostGone)
    mzShape = page2.evaluate("(function(){ if (!window.MZ) return null; const q = window.MZ.quiz;"
                             "return q && q.maze && typeof q.maze.size==='number' && Array.isArray(q.maze.walls)"
                             " && q.maze.walls.every(w=>typeof w.r==='number' && typeof w.c==='number')"
                             " && typeof q.maze.entry.r==='number' && typeof q.maze.goal.r==='number'"
                             " && typeof q.pos.r==='number' && typeof q.hasKey==='boolean'"
                             " && typeof q.step==='number' && typeof q.miss==='number'"
                             " && typeof window.MZ.tapCell==='function' && typeof window.MZ.start==='function'"
                             " && typeof window.MZ.autoSolve==='function' && typeof window.MZ.currentLevel==='object'"
                             " ? {size:q.maze.size, walls:q.maze.walls.length, step:q.step, hasKey:q.hasKey} : null; })()")
    check('real page MZ.quiz shape', bool(mzShape), mzShape)
    page2.screenshot(path=str(SHOTS / 'real.png'))
    check('real 0 pageerror', not errors2, errors2[:3])
    try:
        from PIL import Image, ImageStat
        img = Image.open(str(SHOTS / 'real.png')).convert('L')
        st = ImageStat.Stat(img).stddev
        check('screenshot non-blank', st[0] > 5, 'stdev=%.1f' % st[0])
    except ImportError:
        print('SKIP screenshot pixel check (no PIL)')
    ctx2.close()
    browser.close()

fails = [r for r in RESULTS if not r[1]]
print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
sys.exit(1 if fails else 0)
