# -*- coding: utf-8 -*-
"""grid _selftest（r13：8×8 相对导航版）— headless playwright 自测（独立 chromium.launch，
不连/不杀任何浏览器进程；禁 analyze_image——一律 DOM/像素统计断言）
1.  ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 40 关审计全绿 + 单元全绿
    （duration 单元：40 关 modeled 最低 ≥40000 + 独立副本逐关对账 + 每步 DECIDE≥voiceWin）
2a. 预置存档(跳过教学) flat0=ch1 exec1 → 真实点击：首错(指令错配：晃动+零惩罚+当前命令键不 pulse)
    → 指令键真实点击通关 5 题 → .k-celebrate 2 星 → 等 5.4s → 存档 levels['1-0'].stars>=1 → 推进 flat=1
2b. flat5（ch2 exec2）：热身 exec1 答对 → qi1 exec2（3 移动命令+T，墙 0-2）真实点击通关 3 星写档；
    flat10（ch3 plan）：Python 独立 BFS+朝向状态机相对换算 → 真实点指令键依序收集 2 箱通关 3 星写档；
    fwd 步播绝对方向词 gri_d_*（相对→绝对桥接）
2c. 全新存档 → 教学 看：真实点指令键+hook 全吞+轻叮 sfx('pop')（§0.22）→ 帮 ghost → 独通关
2d. 重玩门：教学 watch 期（demo/locked）真实点 replay → startLevel 未被调（哨兵计数不变）
2e. 救援钟（§0.7a/§0.21）：flat3 静置：8s 处错点（不重置救援钟）→ 14s 阈值前不响 →
    阈值后重读题面(exec=queue 指令句全 clip / 当前命令键 breathe 循环)
2f. 双 viewport(1280x800/800x1180)×四型(exec1/exec2/plan/maze)：ox==0、格 64 格>=44、
    指令键 4 枚>=96、退一步>=64、全按钮>=64（.k-parentbtn 豁免）、兔箭头旋转角、截图非空白(stdev>5)
3.  完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror + gri_* 26 条 clips 注入
"""
import json, sys, time
from collections import deque
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
SOTS_DBG = SHOTS / 'debug-timeout.png'          # 超时现场截图（排障用）
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12
RESULTS = []

# ---- Python 独立复算（朝向状态机+BFS——与游戏 JS 双实现，互证口径） ----
DELTA = {'N': (-1, 0), 'S': (1, 0), 'E': (0, 1), 'W': (0, -1)}
TURN_L = {'N': 'W', 'W': 'S', 'S': 'E', 'E': 'N'}
TURN_R = {v: k for k, v in TURN_L.items()}


def bfs_first_step(fr, fc, tr, tc, walls):
    """自由格 BFS：返回从 (fr,fc) 到 (tr,tc) 最短路的第一步绝对朝向；不可达 None"""
    wl = {(w['r'], w['c']) for w in walls}
    if (fr, fc) == (tr, tc):
        return 'HERE'
    dist = {(fr, fc): 0}
    first = {}
    dq = deque([(fr, fc)])
    while dq:
        r, c = dq.popleft()
        for h in ('N', 'S', 'E', 'W'):
            nr, nc = r + DELTA[h][0], c + DELTA[h][1]
            if not (1 <= nr <= 8 and 1 <= nc <= 8) or (nr, nc) in wl:
                continue
            if (nr, nc) in dist:
                continue
            dist[(nr, nc)] = dist[(r, c)] + 1
            first[(nr, nc)] = first.get((r, c), h) if (r, c) != (fr, fc) else h
            if (nr, nc) == (tr, tc):
                return first[(nr, nc)]
            dq.append((nr, nc))
    return None


def turn_to(cur_h, want):
    """从 cur_h 转到 want 的按键序列（'L'/'R' 列表；180°=两次同侧转）"""
    if cur_h == want:
        return []
    if TURN_L[cur_h] == want:
        return ['L']
    if TURN_R[cur_h] == want:
        return ['R']
    return ['L', 'L']          # 反向：两次左转（同游戏参考解同侧策略）


def safe(s):                                   # GBK 控制台打不出中文 → ASCII 转义后再打印
    return str(s).encode('ascii', 'backslashreplace').decode('ascii')


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', safe(name), ('| ' + safe(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'grid', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'grid': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_grid", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path, floor=5.0):
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(path)).convert('L').resize((160, 100))
        px = list(im.getdata())
        sd = statistics.pstdev(px)
        return sd > floor, 'PIL pixel stdev=%.1f' % sd
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL unavailable)' % n


def quiz_of(page):
    return page.evaluate('GR.quiz')


def click_center(page, loc):
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def click_cmd(page, c):
    if c == 'T':
        click_center(page, page.locator('.cmdb[data-c="T"]'))
    else:
        click_center(page, page.locator('.cmdb[data-c="%s"]' % c))


def click_cell(page, r, c):
    click_center(page, page.locator('.cell[data-r="%d"][data-c="%d"]' % (r, c)))


def wait_quiz_step(page, prev_step, timeout=15000, dbg=''):
    """等本题答完且开箱演出窗结束（advance 950ms 真时钟；locked 释放后再点，§0.20）"""
    try:
        page.wait_for_function(
            "() => { const L = GR.currentLevel; if (L && L.done) return true;"
            " const n = GR.quiz; return n && n.step > %d && !state.locked && !state.demo; }" % prev_step,
            timeout=timeout)
        return True
    except Exception:
        print('STEP-WAIT-TIMEOUT %s prev=%s' % (dbg, prev_step))
        print('  cur:', page.evaluate('GR.currentLevel'))
        print('  quiz:', page.evaluate('GR.quiz'))
        print('  locked/demo:', page.evaluate('[state.locked, state.demo, state.tut]'))
        page.screenshot(path=str(SOTS_DBG))
        return False


def play_quiz(page, tag=''):
    """真实点击答完当前一题（exec=按指令条当前命令；plan/maze=Python BFS+相对换算逐步按键依序收集）。
    绑定进入时的题号 run——题推进即止（advance 950ms 演出窗内的点击被 locked 吞零惩罚）"""
    q = quiz_of(page)
    if q is None:
        return 0
    run = q['step']
    for _ in range(300):
        q = quiz_of(page)
        if q is None or q['step'] != run or page.evaluate('GR.currentLevel.done'):
            break
        if q['kind'] in ('exec1', 'exec2'):
            click_cmd(page, q['seq'][q['seqIdx']]['t'])
        else:
            tr, tc = q['chests'][q['next']]['r'], q['chests'][q['next']]['c']
            if q['pos']['r'] == tr and q['pos']['c'] == tc:
                click_cmd(page, 'T')
            else:
                want = bfs_first_step(q['pos']['r'], q['pos']['c'], tr, tc, q['walls'])
                if want is None:
                    print('BFS-NOPATH', tag, q)
                    return 0
                for c in turn_to(q['heading'], want):
                    click_cmd(page, c)
                    page.wait_for_timeout(120)
                click_cmd(page, 'fwd')
        page.wait_for_timeout(150)
    if not wait_quiz_step(page, run, dbg='%s%s' % (tag, q['kind'] if q else '')):
        return 0
    page.wait_for_timeout(350)                  # renderQuiz 新题 DOM 落地
    return 1


def play_level(page, first_wrong=False, tag=''):
    wrong_done = not first_wrong
    quizzes = 0
    while quizzes < 30:
        q = quiz_of(page)
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            act = q['seq'][q['seqIdx']]['t']
            bad = 'L' if act == 'fwd' else 'fwd'      # 非当前命令类型=错配
            click_cmd(page, bad)
            page.wait_for_timeout(700)          # 晃动 480ms 演出窗
            st = page.evaluate('''(bc) => {
              const q = GR.quiz;
              const b = document.querySelector('.cmdb[data-c="' + bc + '"]');
              const okBtn = document.querySelector('.cmdb[data-c="' + q.seq[q.seqIdx].t + '"]');
              return {retries: GR.currentLevel.retries, step: GR.currentLevel.step, miss: q.miss,
                      seqIdx: q.seqIdx, wig: b.classList.contains('wig'),
                      pulse: okBtn.classList.contains('pulse')};
            }''', bad)
            check('%sfirst wrong (cmd mismatch): wig + zero penalty + no pulse on current cmd' % tag,
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and
                  st['seqIdx'] == 0 and st['wig'] and not st['pulse'], str(st))
            continue
        if not play_quiz(page, tag=tag):
            break
        quizzes += 1
    page.wait_for_selector('.k-celebrate', timeout=25000)
    return quizzes


def main():
    offline_bad = []
    page_errors = []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            # ---- 1. verify=1 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=90000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify 40-level audit all ok',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify units all ok', all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify dual-viewport sims all pass (exec1/exec2/plan/maze x2 vp)',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str([s for s in vj['smokes']['layout']['sims'] if not s['pass']]))
            d = vj['units']['dist']
            check('grid specifics: VOICE literals, 26 clips, opening chain, gen dch coverage, both bump kinds',
                  d['ok'] and d['clips'] and d['openHint'] and d['openQ'] and
                  d['bumpEdge'] >= 1 and d['bumpWall'] >= 1 and
                  all(v >= 1 for v in d['genDch'].values()), str(d)[:200])
            dur = vj['units']['duration']
            check('duration gate: 40-level min modeled >= 40000 + parity + DECIDE>=voiceWin',
                  dur['ok'] and dur['minMs'] >= 40000 and dur['parity'] and dur['voiceNeverDominates'],
                  'minMs=%s@flat%s' % (dur['minMs'], dur['minFlat']))
            tc = vj['units']['tutChain']
            check('verify tutorial chain (watch->turn->quiz relay all-clip parts)', tc['ok'], str(tc)[:160])
            sw = vj['units']['sayW']
            check('verify sayW tri-state (2/0/2)', sw['ok'], str(sw)[:160])
            oru = vj['units']['order']
            check('verify order unit (wrong-order take -> miss + direction queue; nope not penalized)',
                  oru['ok'], str(oru)[:160])
            ctx.close()

            # ---- 2a. 预置存档 flat0=exec1：首错零惩罚 + 指令键真实点击通关（2 星）+ 写档 + 推进 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.GR && GR.currentLevel', timeout=8000)
            n_clips = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('gri_') === 0).length")
            check('gri_* clips injected = 26', n_clips == 26, 'n=%s' % n_clips)
            pg.wait_for_timeout(3600)            # 等开场链（hint clip 2640 + 3000ms 接力题面）落定
            lv = pg.evaluate('GR.currentLevel')
            check('start at 1-0 (ch 1-based, dch1 exec1)', lv and lv['ch'] == 1 and lv['dch'] == 1, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('GR.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook contract {kind,pos,heading,walls,chests,next,seq,seqIdx,fwdLeft,steps,optSteps,collected,step,miss}',
                  q and q['kind'] == 'exec1' and 1 <= q['pos']['r'] <= 8 and 1 <= q['pos']['c'] <= 8 and
                  q['heading'] in ('N', 'E', 'S', 'W') and q['walls'] == [] and len(q['chests']) == 1 and
                  q['next'] == 0 and q['collected'] == 0 and q['seq'] and q['seqIdx'] == 0 and
                  q['fwdLeft'] >= 0 and q['steps'] == 0 and q['optSteps'] >= 1 and
                  q['step'] == 0 and q['miss'] == 0,
                  str(q and {k: q[k] for k in ('kind', 'pos', 'heading', 'seq', 'seqIdx', 'fwdLeft', 'optSteps')}))
            dom = pg.evaluate('''() => {
              const chips = [...document.querySelectorAll('#prompt-chip .schip')];
              return {cells: document.querySelectorAll('#board .cell').length,
                      cmdb: document.querySelectorAll('#pad-area .cmdb').length,
                      undo: !!document.getElementById('btn-undo'),
                      chips: chips.length,
                      curTxt: (document.querySelector('#prompt-chip .schip.cur .st') || {}).textContent || '',
                      meter: document.getElementById('stepmeter').textContent,
                      rabbit: !!document.querySelector('#rabbit .hwrap')};
            }''')
            check('DOM matches quiz (64 cells, 4 cmd keys + undo, chip strip, step meter, rabbit arrow)',
                  dom['cells'] == 64 and dom['cmdb'] == 4 and dom['undo'] and
                  dom['chips'] == len(q['seq']) and dom['curTxt'] and
                  dom['meter'].find(str(q['optSteps'])) >= 0 and dom['rabbit'], str(dom)[:200])
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('finished 5 quizzes by real cmd clicks', n == 5, 'quizzes=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)            # celebrate + 写档 + 推进
            lv2 = pg.evaluate('GR.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_grid")'))
            s10 = saved['levels'].get('1-0', {}).get('stars', 0)
            check('save levels["1-0"].stars >= 1 (actual 2)', s10 >= 1, 'stars=%s' % s10)
            check('grid.tutSeen kept true', (saved.get('grid') or {}).get('tutSeen') is True,
                  str(saved.get('grid')))
            ctx.close()

            # ---- 2b. flat5（ch2 exec2）+ flat10（ch3 plan Python BFS 相对换算）----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(5), bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.GR && GR.currentLevel', timeout=8000)
            pg.wait_for_timeout(3600)
            lv = pg.evaluate('GR.currentLevel')
            check('done 1-5 -> start flat=5 ch=2 dch=2', lv and lv['flat'] == 5 and lv['ch'] == 2, str(lv))
            play_quiz(pg)                        # qi0 热身 exec1
            q = quiz_of(pg)
            check('ch2 qi1 = exec2 (3 move cmds + T, walls 0-2)',
                  q and q['kind'] == 'exec2' and len(q['walls']) <= 2 and
                  q['seq'][-1]['t'] == 'T' and
                  1 <= len([c for c in q['seq'] if c['t'] != 'T']) <= 3, str(q and {k: q[k] for k in ('kind', 'seq', 'walls')}))
            chips = pg.evaluate(
                "document.querySelectorAll('#prompt-chip .schip').length")
            check('exec2 chip strip = seq length', chips == len(q['seq']), 'chips=%s seq=%s' % (chips, len(q['seq'])))
            n2 = play_level(pg, tag='[2b-flat5] ')   # 含 qi1（首题已答）……play_level 从当前题继续
            total_q = 1 + n2
            check('flat5 finished 5 quizzes by real click (warm exec1 + 4 exec2)', total_q == 5,
                  'quizzes=%s' % total_q)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('flat5 real-click win 3 stars (0 wrong)', stars == 3, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_grid")'))
            s20 = saved['levels'].get('2-0', {}).get('stars', 0)
            check('save levels["2-0"].stars >= 1 (actual 3)', s20 >= 1, 'stars=%s' % s20)
            # flat10 ch3 plan：真实按键 + Python 独立 BFS 相对换算
            pg.evaluate('startLevel(10)')
            pg.wait_for_timeout(400)
            lv = pg.evaluate('GR.currentLevel')
            check('flat=10 ch=3 dch=3 (plan)', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            w0 = quiz_of(pg)
            check('ch3 qi0 warmup = exec type (1-2 move cmds)',
                  w0 and w0['kind'] in ('exec1', 'exec2') and w0['step'] == 0,
                  str(w0 and w0['kind']))
            play_quiz(pg)
            q = quiz_of(pg)
            check('ch3 qi1 = plan (free planning, 2 chests ordered, walls 2-4)',
                  q and q['kind'] == 'plan' and len(q['chests']) == 2 and
                  2 <= len(q['walls']) <= 4 and q['seq'] is None and q['next'] == 0,
                  str(q and {k: q[k] for k in ('kind', 'chests', 'walls', 'next')}))
            dirWords = []
            pg.evaluate('window.__plog = []; const op = KIDS.voice.play.bind(KIDS.voice);'
                        ' KIDS.voice.play = function (k, t) { window.__plog.push(String(k)); return op(k, t); };')
            n3 = play_level(pg, tag='[2b-flat10] ')   # 从 qi1 续（qi0 已 play_quiz）
            dirWords = pg.evaluate('window.__plog')
            check('flat10 finished remaining 4 plan quizzes by real cmd clicks (Python BFS + relative conversion)',
                  n3 == 4, 'quizzes=%d' % n3)
            check('every fwd step plays absolute direction word (gri_d_* bridge)',
                  any(k.startswith('gri_d_') for k in dirWords),
                  'words=%s' % [k for k in dirWords if k.startswith('gri_d_')][:6])
            stars = pg.locator('.k-celebrate .k-star').count()
            check('flat10 real-click win 3 stars', stars == 3, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_grid")'))
            s30 = saved['levels'].get('3-0', {}).get('stars', 0)
            check('save levels["3-0"].stars >= 1 (actual 3)', s30 >= 1, 'stars=%s' % s30)
            ctx.close()

            # ---- 2c. 全新存档：教学 看（真实点指令键+hook 全吞+轻叮）→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.GR && GR.currentLevel', timeout=8000)
            pg.wait_for_function("GR.tutorial === 'watch'", timeout=5000)
            pg.evaluate('window.__sfx = []; KIDS.audio.sfx = n => window.__sfx.push(n);')
            q0 = quiz_of(pg)
            check('tutorial on flat0 exec1 quiz', q0 and q0['kind'] == 'exec1' and q0['step'] == 0)
            swallowed_hook = pg.evaluate('GR.tapFwd()') is False   # 演示期 hook 输入全吞
            click_cmd(pg, 'fwd')                 # 演示期真实点击也吞（locked 门 → sfx pop）
            pg.wait_for_timeout(700)
            st = pg.evaluate('''() => ({step: GR.currentLevel.step, retries: GR.currentLevel.retries,
                                        tut: GR.tutorial, pop: window.__sfx.indexOf('pop') >= 0,
                                        locked: state.locked, demo: state.demo})''')
            check('tutorial watch swallows input (real click + hook) with pop ding (0x22)',
                  swallowed_hook and st['step'] == 0 and st['retries'] == 0 and
                  st['tut'] == 'watch' and st['pop'] and st['locked'] and st['demo'], str(st))
            # ---- 2d. 重玩门：教学 watch 期真实点 replay → startLevel 未被调 ----
            pg.evaluate('window.__sl = startLevel; let __n = 0;'
                        ' startLevel = function (f) { __n++; return window.__sl(f); };'
                        ' window.__slN = () => __n;')
            n0 = pg.evaluate('window.__slN()')
            click_center(pg, pg.locator('#btn-replay'))
            pg.wait_for_timeout(500)
            st2 = pg.evaluate('() => ({n: window.__slN(), tut: GR.tutorial,'
                              ' step: GR.currentLevel.step, retries: GR.currentLevel.retries})')
            check('replay gate: replay during tutorial watch does NOT restart (startLevel not called)',
                  st2['n'] == n0 and st2['tut'] == 'watch' and st2['step'] == 0 and st2['retries'] == 0, str(st2))
            pg.evaluate('startLevel = window.__sl;')   # 还原
            pg.wait_for_function("GR.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0 (fresh)',
                  q and q['step'] == 0 and q['miss'] == 0, str(q and q['step']))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost visible', ghost_shown)
            n = play_level(pg, tag='[2c] ')       # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'quizzes=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_grid")'))
            check('grid.tutSeen persisted after tutorial',
                  (saved.get('grid') or {}).get('tutSeen') is True, str(saved.get('grid')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2e. 救援钟：flat3 静置 14s+ 重读题面 + 当前命令键 breathe；8s 处错点不重置 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.GR && GR.currentLevel', timeout=8000)
            check('rescue scenario starts at flat=3 (>=3)', pg.evaluate('GR.currentLevel.flat') == 3)
            pg.wait_for_timeout(3600)            # 等开场链（hint + 3000ms 接力）落完再挂钩
            t0 = time.time()
            pg.evaluate('''() => {
              window.__qlog = [];
              KIDS.voice.queue = parts => window.__qlog.push(parts);
            }''')
            rescue_q = lambda: pg.evaluate(
                "window.__qlog.filter(p => p[0] === 'gri_i_fwd' || p[0] === 'gri_i_left' || p[0] === 'gri_i_right')")
            pg.wait_for_timeout(7000)            # 静置 7s → 错点一次（不该重置救援钟）
            qw = quiz_of(pg)
            act = qw['seq'][qw['seqIdx']]['t']
            click_cmd(pg, 'L' if act == 'fwd' else 'fwd')
            pg.wait_for_timeout(1500)            # idle≈12.1s（lastAct=startLevel 时刻，t0=+3.6s）：14s 阈值未到
            early = len(rescue_q())
            check('rescue not fired before 14s threshold', early == 0, 'early=%s' % early)
            try:                                 # 若错点(+8s)未重置 → 救援在 ~14s 响 + 命令键 breathe
                pg.wait_for_function(
                    "document.querySelector('.cmdb.breathe') || document.querySelector('.cell.breathe')",
                    timeout=8000)
                breathe_seen = True
            except Exception:
                breathe_seen = False
            pg.wait_for_timeout(400)             # queue 与 breathe 同拍，稍等日志落地
            resc = rescue_q()
            rc = pg.evaluate('GR.rescues')
            elapsed = time.time() - t0
            check('rescue fired by idle 14s+ (wrong tap at +8s did NOT reset clock) + answer breathe',
                  breathe_seen and len(resc) >= 1 and rc >= 1 and elapsed < 17,
                  'breathe=%s rescues=%s GR.rescues=%s wall=%.1fs' % (breathe_seen, len(resc), rc, elapsed))
            if resc:
                exp_head = {'fwd': 'gri_i_fwd', 'L': 'gri_i_left', 'R': 'gri_i_right'}[act]
                check('rescue re-reads question via all-clip cmd sentence queue (head=%s)' % exp_head,
                      resc[0][0] == exp_head and all(k and k.startswith('gri_') for k in resc[0]),
                      str(resc[0]))
            ctx.close()

            # ---- 2f. 双 viewport × 四型：ox==0 + 触摸目标 + 兔箭头旋转 + 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(5), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.GR && GR.currentLevel', timeout=8000)
                pg.wait_for_timeout(1200)        # 入场动画落定
                for tag, setup in [
                        ('exec1', 'startLevel(0)'),
                        ('exec2', 'startLevel(5)'),
                        ('plan', 'startLevel(10)'),
                        ('maze', 'startLevel(15)')]:
                    pg.evaluate(setup)
                    pg.wait_for_timeout(300)
                    if tag != 'exec1':           # 热身题答对 → qi1（目标题型；ch3/ch4 热身=plan 型 seq=null）
                        pg.evaluate('''async () => {
                          const q0 = GR.quiz;
                          for (let i = 0; i < 200 && GR.quiz && GR.quiz.step === q0.step; i++) {
                            const q = GR.quiz;
                            let c;
                            if (q.seq) c = q.seq[q.seqIdx].t;
                            else {
                              const pl = engPlanRef({ fr: q.pos.r, fc: q.pos.c, h0: q.heading,
                                chests: q.chests.slice(q.collected), walls: q.walls });
                              if (!pl || !pl.length) break;
                              c = pl[0].t;
                            }
                            const r = await GR[c === 'fwd' ? 'tapFwd' : (c === 'T' ? 'tapTake' : 'tapTurn')]
                              .call(null, c === 'L' ? 'left' : 'right');
                            if (r === false || r === null) break;
                          }
                        }''')
                        pg.wait_for_timeout(1400)   # 真实页 advance 演出 950ms + 渲染
                    pg.evaluate("GR.tapTurn('left')")   # 转一次 → 兔箭头有旋转角可断言
                    pg.wait_for_timeout(600)
                    m = pg.evaluate('''() => {
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;
                        const r = e.getBoundingClientRect();
                        if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                          bad.push((e.className || e.id) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                      });
                      const cells = [...document.querySelectorAll('#board .cell')];
                      const cr = cells.map(c => c.getBoundingClientRect());
                      const cMin = cr.length ? Math.round(Math.min(...cr.map(r => Math.min(r.width, r.height)))) : 0;
                      const dirs = [...document.querySelectorAll('#pad-area .cmdb')].map(b => b.getBoundingClientRect());
                      const dMin = dirs.length ? Math.round(Math.min(...dirs.map(r => Math.min(r.width, r.height)))) : 0;
                      const u = document.getElementById('btn-undo').getBoundingClientRect();
                      const rab = document.getElementById('rabbit').getBoundingClientRect();
                      const hw = document.querySelector('#rabbit .hwrap');
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad, n: cells.length,
                              cMin: cMin, dMin: dMin, dN: dirs.length,
                              uMin: Math.round(Math.min(u.width, u.height)),
                              rabH: Math.round(rab.height),
                              rot: hw.style.transform || '', kind: GR.quiz ? GR.quiz.kind : '',
                              stones: document.querySelectorAll('#board .stone').length,
                              walls: GR.quiz ? GR.quiz.walls.length : -1};
                    }''')
                    rotOk = ('rotate(' in m['rot'])
                    check('vp %dx%d %s ox==0 + 64 cells>=44 + 4 cmd>=96 + undo>=64 + btns>=64 + rabbit rot' %
                          (vp[0], vp[1], tag),
                          m['ox'] == 0 and m['n'] == 64 and m['cMin'] >= 44 and
                          m['dN'] == 4 and m['dMin'] >= 96 and m['uMin'] >= 64 and
                          not m['bad'] and m['rabH'] >= 50 and rotOk and
                          m['stones'] == m['walls'],
                          'ox=%s cMin=%s dMin=%s uMin=%s rabH=%s rot=%s stones=%s/%s bad=%s' %
                          (m['ox'], m['cMin'], m['dMin'], m['uMin'], m['rabH'], m['rot'],
                           m['stones'], m['walls'], m['bad'][:3]))
                    shot = SHOTS / ('grid-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot, floor=5.0)
                    check('screenshot %s %dx%d non-blank (stdev>5)' % (tag, vp[0], vp[1]), ok, detail)
                ctx.close()
        finally:
            browser.close()

    # ---- 3. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
