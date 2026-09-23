# -*- coding: utf-8 -*-
"""timecalc _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r16 难度改造（2026-09-16，AUDIT-78:83）：ch1 5 分钟刻+经过时间/ch3 跨日跨周复合/ch4 作息表读表，
每关 5→8 题（CH_LEN=8，键基 LEVELS_PER_CH=10 恒定）。
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 40 关审计全绿
   + 生成关抽样全绿 + 专项单元全绿（tapOpt/sayW/duration/angles/tutorial/dist/spanM1）
2a. 预置存档(跳过教学) → 真实指针：首错(卡抖+零惩罚+应点卡不 breathe) → 窗后重选 →
    真实点击通关 8 题 → .k-celebrate 2星 → 等 5.4s → 存档 levels['1-0'].stars>=1 → 推进 flat=1
2b. 全新存档 → 教学 看(真实点击+hook 全吞+轻叮 sfx('pop'))→帮(幽灵手指)→独 真实链路
    → timecalc.tutSeen 持久化 → 1-0 写档
2c. flat30（ch4 sched 作息表关·r16）：首题= dur 型+表 4 行渲染对账（行数/表内一致性/行可点朗读）
    → 真实点击通关 8 题 → 3 星 → 写档 4-0
2d/P1b. 三通道双 viewport(1280x800 横/800x1180 真竖/port 类)×四题型(clock5/elapse/comp/sched)：
    overflowX==0、答案卡=主答案 ≥64、全按钮 ≥64（.k-parentbtn 豁免）、竖屏卡宽锚 98（横 110）、
    截图像素非空白（存 _shots/）；P1b 真竖轮：800x1180 真实 @media 通道（innerHeight>innerWidth）
2e. 生成关种档触达（硬契约 4）：firstDay=3 天前+bonus30 → lim=6*2+30=42 → flat40/41 生成关
    可达：CL.start(41) 全链通关 → dayEnd 预告=GEN_HINTS 实算真值（家族 F 行为级）
5. 救援钟（§0.7a/§0.21）：flat≥3 静置 14s+ 重读题面(tc_hint2 分型)+正确卡 breathe 循环；
   11s 处错点不重置
6. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror + tc_* 224 条 clips 注入（T46 拆段）
"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥2 → 日限 6*2+30=42
RESULTS = []
CH_LEN = 8                       # r16：每关 8 题（AUDIT-78:83）

# T46 静音纪律（协调员令）：每个 context 级挂静音——speak/Audio.play no-op（ended 5ms 派发
# 推进 queue 段链），防外放；对断言零影响（verify 页自带 stub，2x 场景断言 UI 状态）
SND = ('try{if(window.speechSynthesis){speechSynthesis.speak=function(){};'
       'speechSynthesis.cancel=function(){};}}catch(e){}'
       'try{window.Audio.prototype.play=function(){const s=this;'
       'setTimeout(function(){try{s.dispatchEvent(new Event("ended"))}catch(e){}},5);'
       'return Promise.resolve();};window.Audio.prototype.pause=function(){};}catch(e){}')


def safe(s):                                   # GBK 控制台打不出中文/emoji → ASCII 转义后再打印
    return str(s).encode('ascii', 'backslashreplace').decode('ascii')


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', safe(name), ('| ' + safe(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'timecalc', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'timecalc': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 10 + 1, f % 10)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_timecalc", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path, floor=10.0):
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


def click_card(page, i):
    loc = page.locator('.card[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def quiz_of(page):
    return page.evaluate('TC.quiz')


def play_level(page, first_wrong=False, tag=''):
    """真实点击打完当前关（可先在首题整关错一次）"""
    wrong_done = not first_wrong
    quizzes = 0
    while quizzes < 30:
        st0 = page.evaluate('TC.currentLevel ? TC.currentLevel.step : -1')
        q = quiz_of(page)
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = (q['answer'] + 1) % len(q['opts'])
            click_card(page, wi)
            page.wait_for_timeout(1300)          # 错点防重入窗 1000ms + 抖动演出
            st = page.evaluate('''(wi) => {
              const q = TC.quiz;
              const w = document.querySelector('.card[data-i="' + wi + '"]');
              const ok = document.querySelector('.card[data-i="' + q.answer + '"]');
              return {retries: TC.currentLevel.retries, step: TC.currentLevel.step, miss: q.miss,
                      wig: w.classList.contains('wig'),
                      breathe: ok.classList.contains('breathe')};
            }''', wi)
            check('%sfirst wrong: wig + zero penalty (step/miss) + no breathe on answer card' % tag,
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and
                  st['wig'] and not st['breathe'], str(st))
            continue
        click_card(page, q['answer'])
        page.wait_for_function(
            '(s) => { const L = TC.currentLevel; return !!L && (L.done || L.step === s + 1); }',
            arg=st0, timeout=9000)
        page.wait_for_function(                  # 答对演出窗 2100ms：等 locked 解锁再点下一题
            '() => { const L = TC.currentLevel; return !L || L.done || !L.locked; }', timeout=9000)
        page.wait_for_timeout(250)               # renderQuiz 后新题 DOM 完全落地
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
            ctx.add_init_script(SND)
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=60000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total + layoutOk', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify 40-level audit all ok (8 quizzes each)',
                  len(vj['levels']) == 40 and all(v['ok'] for v in vj['levels'].values()),
                  'levels=%d' % len(vj['levels']))
            check('verify gen-level sample all ok (flat40-44)',
                  len(vj['gen']['sample']) == 5 and all(v['ok'] for v in vj['gen']['sample'].values()),
                  str({k: v['dch'] for k, v in vj['gen']['sample'].items()}))
            check('verify units all ok (tapOpt/sayW/duration/angles/tutorial/dist/spanM1)',
                  all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify layout sims 12/12 (3 channels x 4 flats)',
                  len(vj['smokes']['layout']['sims']) == 12 and
                  all(s['pass'] for s in vj['smokes']['layout']['sims']) and vj['smokes']['layout']['anchorOk'],
                  str([s for s in vj['smokes']['layout']['sims'] if not s['pass']])[:200])
            dur = vj['units']['duration']
            check('duration model: dMin=91040@flat0, voiceWin<=DECIDE all, parity, LEVEL_MIN 40000',
                  dur['ok'] and dur['minMs'] == 91040 and dur['minFlat'] == 0 and dur['winOk'] and dur['parity'],
                  str(dur))
            sw = vj['units']['sayW']
            check('verify sayW tri-state + r16 typing (flat0 tc_wrong2 x2 / flat10 tc_wrong / throttle0 / force2)',
                  sw['ok'] and sw['flat0Plays'] == 2 and sw['flat0OldKey'] == 0 and sw['flat10Cal'] >= 1,
                  str(sw))
            tc = vj['units']['tutorial']
            check('verify tutorial chain unit (watch->demo right->turn handoff, clock5 branch)',
                  tc['ok'], str(tc)[:160])
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + 真实点击通关（2 星）+ 写档 + 推进 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(SND)
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.TC && TC.currentLevel', timeout=8000)
            n_clips = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('tc_') === 0).length")
            check('tc_* clips injected = 232 (r16 7 + T46 225 含 09-19 补 8 拆段)', n_clips == 232, 'n=%s' % n_clips)
            pg.wait_for_timeout(2500)            # 等开场链落定
            lv = pg.evaluate('TC.currentLevel')
            check('start at flat0 ch1 (8 quizzes)', lv and lv['ch'] == 1 and lv['n'] == 8, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('TC.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook contract {kind,stype,hour,minute,dur,startH,endH,table,askRow,ask,answer,opts,step,miss}',
                  q and q['kind'] == 'clock5' and q['opts'][q['answer']]['v'].index(':') >= 0 and
                  len(q['opts']) == 4 and q['step'] == 0 and q['miss'] == 0 and
                  isinstance(q['ask'], str) and len(q['ask']) >= 8, str(q and q['kind']))
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('finished 8 quizzes by real click', n == CH_LEN, 'quizzes=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)            # celebrate + 写档 + 推进
            lv2 = pg.evaluate('TC.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_timecalc")'))
            s10 = saved['levels'].get('1-0', {}).get('stars', 0)
            check('save levels["1-0"].stars >= 1 (actual 2)', s10 >= 1, 'stars=%s' % s10)
            check('timecalc.tutSeen kept true', (saved.get('timecalc') or {}).get('tutSeen') is True,
                  str(saved.get('timecalc')))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入+轻叮)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(SND)
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.TC && TC.currentLevel', timeout=8000)
            pg.wait_for_function("TC.tutorial === 'watch'", timeout=5000)
            pg.evaluate('window.__sfx = []; KIDS.audio.sfx = n => window.__sfx.push(n);')
            swallowed_hook = pg.evaluate('TC.tapOpt(0)') is False    # 演示期 hook 输入全吞
            qw0 = quiz_of(pg)
            click_card(pg, qw0['answer'])         # 演示期真实点击也吞（locked 门 → sfx pop）
            pg.wait_for_timeout(700)
            st = pg.evaluate('''() => ({step: TC.currentLevel.step, retries: TC.currentLevel.retries,
                                        tut: TC.tutorial, pop: window.__sfx.indexOf('pop') >= 0})''')
            check('tutorial watch swallows input (real click + hook) with pop ding (0x22)',
                  swallowed_hook and st['step'] == 0 and st['retries'] == 0 and
                  st['tut'] == 'watch' and st['pop'], str(st))
            pg.wait_for_function("TC.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0',
                  q and q['step'] == 0 and q['miss'] == 0, str(q and q['kind']))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost visible', ghost_shown)
            n = play_level(pg, tag='[2b] ')       # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (8 quizzes)', n == CH_LEN, 'quizzes=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_timecalc")'))
            check('timecalc.tutSeen persisted after tutorial',
                  (saved.get('timecalc') or {}).get('tutSeen') is True, str(saved.get('timecalc')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. flat30（ch4 sched 作息表关）：表渲染对账+行朗读 → 通关 3 星 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(SND)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(30), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.TC && TC.currentLevel', timeout=8000)
            pg.wait_for_timeout(2500)
            lv = pg.evaluate('TC.currentLevel')
            check('level 31 starts at flat=30 ch=4 dch=4', lv and lv['flat'] == 30 and lv['ch'] == 4, str(lv))
            c4 = pg.evaluate('''() => {
              const q = TC.quiz;
              const rows = [...document.querySelectorAll('#sched-box .srow')];
              return {kind: q.kind, stype: q.stype, nRows: rows.length, qRows: q.table.length,
                      domTable: rows.map(r => r.textContent.trim()),
                      engTable: q.table.map(r => r.name + fmtTime(r.sh, r.sm) + fmtTime(r.eh, r.em)),
                      header: !!document.querySelector('#sched-box th'),
                      tipHasName: document.getElementById('tip-text').textContent.indexOf(q.table[q.askRow].name) >= 0};
            }''')
            check('ch4 sched: kind=sched, 4 rows rendered = engine table, header, tip targets row',
                  c4['kind'] == 'sched' and c4['nRows'] == c4['qRows'] == 4 and c4['header'] and
                  c4['domTable'] == c4['engTable'] and c4['tipHasName'], str(c4)[:200])
            row_said = pg.evaluate('''() => {
              window.__q = []; const orig = KIDS.voice.queue; KIDS.voice.queue = p => window.__q.push(p.slice());
              const r = TC.tapRow(0); KIDS.voice.queue = orig;
              return {ok: r, chain: window.__q, name: ACTS.indexOf(cur.quizzes[cur.step].table[0].name)};
            }''')
            q0 = quiz_of(pg)
            r0 = q0['table'][0]
            want_chain = ['tc_act_%d' % row_said['name'], 'tc_t_%d_%d' % (r0['sh'], r0['sm']),
                          'tc_s_to', 'tc_t_%d_%d' % (r0['eh'], r0['em'])]
            check('tapRow reads row aloud via clip chain (active learning, no step advance)',
                  row_said['ok'] and want_chain in row_said['chain'] and quiz_of(pg)['step'] == 0,
                  str(row_said['chain'])[:120])
            n = play_level(pg, tag='[2c] ')
            check('level 31 real-click win (8 quizzes)', n == CH_LEN, 'quizzes=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('level 31 win 3 stars (0 wrong)', stars == 3, 'stars=%d' % stars)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_timecalc")'))
            s40 = saved['levels'].get('4-0', {}).get('stars', 0)
            check('save levels["4-0"].stars >= 1 (actual 3)', s40 >= 1, 'stars=%s' % s40)
            ctx.close()

            # ---- 2d/P1b. 双 viewport × 四题型 + 竖屏卡宽锚 98 + 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                ctx.add_init_script(SND)
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(5), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.TC && TC.currentLevel', timeout=8000)
                pg.wait_for_timeout(1200)        # 入场动画落定
                if vp[0] == 800:
                    real_port = pg.evaluate('window.innerHeight > window.innerWidth')
                    check('P1b real portrait viewport (800x1180 -> @media channel active)', real_port)
                for tag, flat, kind in [('clock5', 0, 'clock5'), ('elapse', 2, 'elapse'),
                                        ('comp', 20, 'comp'), ('sched', 30, 'sched')]:
                    pg.evaluate('(f) => TC.start(f)', flat)
                    pg.wait_for_timeout(1200)
                    m = pg.evaluate('''() => {
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;
                        if (e.offsetWidth > 4 && e.offsetHeight > 4 && (e.offsetWidth < 64 || e.offsetHeight < 64))
                          bad.push((e.id || e.className) + ':' + e.offsetWidth + 'x' + e.offsetHeight);
                      });
                      const cards = [...document.querySelectorAll('#card-pool .card')];
                      const cw = cards.length ? cards[0].offsetWidth : 0;
                      const cMin = cards.length ? Math.min(...cards.map(c => Math.min(c.offsetWidth, c.offsetHeight))) : 0;
                      const q = TC.quiz;
                      const rows = document.querySelectorAll('#sched-box .srow').length;
                      const wkdays = document.querySelectorAll('#week-box .wday').length;
                      const ncards = document.querySelectorAll('#night-box .ncard').length;
                      const clock = document.getElementById('clock-box');
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad, cards: cards.length,
                              cw: cw, cMin: cMin, kind: q.kind, rows: rows, wkdays: wkdays,
                              ncards: ncards, clockShown: clock.classList.contains('show'),
                              clockW: clock.offsetWidth};
                    }''')
                    expect_w = 98 if vp[0] == 800 else 110
                    show_ok = (m['kind'] == 'sched' and m['rows'] == 4) or \
                              (m['kind'] in ('plus', 'minus', 'span') and m['wkdays'] == 7) or \
                              (m['kind'] == 'night' and m['ncards'] == 2) or \
                              (m['clockShown'] and m['clockW'] >= 140)
                    check('%s %s overflowX==0 + cards=4(>=64) + buttons>=64 + show-area rendered' %
                          ('P1b' if vp[0] == 800 else 'vp', tag),
                          m['ox'] == 0 and m['cards'] == 4 and m['cMin'] >= 64 and not m['bad'] and show_ok,
                          'ox=%s cards=%s cMin=%s bad=%s kind=%s rows=%s clock=%s' %
                          (m['ox'], m['cards'], m['cMin'], m['bad'][:2], m['kind'], m['rows'], m['clockW']))
                    anchor_ok = abs(m['cw'] - expect_w) <= 2
                    check('%s %s card width anchor %dpx (%s landscape)' %
                          ('P1b' if vp[0] == 800 else 'vp', tag, expect_w, 110 if vp[0] == 800 else 98),
                          anchor_ok, 'cw=%s' % m['cw'])
                    shot = SHOTS / ('timecalc-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot, floor=10.0)
                    check('screenshot %s %dx%d non-blank (stdev>10)' % (tag, vp[0], vp[1]), ok, detail)
                ctx.close()

            # ---- 2e. 生成关种档触达（硬契约 4）：lim=42 → flat40/41 生成关全链 ----
            # done 0-39（40 静态关全完成、41 未完成→dayDone=false 不弹日终层）；first=flat40
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(SND)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(40), bonus=30))
            pg = ctx.new_page(); watch(pg, '2e')
            pg.goto(URL)
            pg.wait_for_function('window.TC && TC.currentLevel', timeout=8000)
            lim = pg.evaluate('KIDS.calendar.limit(Infinity)')
            check('seeded save (firstDay -3d + bonus30) -> limit=42 (reaches gen flat40/41)',
                  lim == 42, 'lim=%s' % lim)
            started = pg.evaluate('(f) => TC.start(f)', 41)
            pg.wait_for_timeout(1200)
            lv41 = pg.evaluate('TC.currentLevel')
            check('TC.start(41) reachable -> flat=41 gen level (ch=5, dch in 1-4)',
                  started and lv41 and lv41['flat'] == 41 and lv41['ch'] == 5 and 1 <= lv41['dch'] <= 4,
                  str(lv41))
            hint41 = pg.evaluate('nextHint(41)')          # 家族 F：生成关预告=实算下一关难度章
            want41 = pg.evaluate('GEN_HINTS[genLevel(42).dch - 1]')
            check('gen level nextHint(41) = GEN_HINTS[genLevel(42).dch-1] (family F real calc)',
                  hint41 == want41, 'got=%s want=%s' % (hint41, want41))
            hint40 = pg.evaluate('nextHint(40)')
            want40 = pg.evaluate('GEN_HINTS[genLevel(41).dch - 1]')
            check('gen level nextHint(40) real calc too', hint40 == want40, 'got=%s' % hint40)
            n = play_level(pg, tag='[2e] ')
            check('gen level 41 real-click full chain win (8 quizzes -> celebrate)', n == CH_LEN,
                  'quizzes=%d' % n)
            ctx.close()

            # ---- 5. 救援钟：flat>=3 静置 14s+ 重读题面(tc_hint2 分型)+正确卡 breathe；错点不重置 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(SND)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.TC && TC.currentLevel', timeout=8000)
            check('rescue scenario starts at flat=3 (>=3)', pg.evaluate('TC.currentLevel.flat') == 3)
            pg.wait_for_timeout(2500)            # 等开场链落完再挂钩
            t0 = time.time()
            pg.evaluate('''() => {
              window.__plog = []; window.__slog = []; window.__qlog = [];
              KIDS.voice.play = k => window.__plog.push(String(k));
              KIDS.voice.say = t => window.__slog.push(String(t));
              KIDS.voice.queue = parts => window.__qlog.push(parts.map(p => typeof p === 'string' ? p : (p && p.key)));   // T-M2 修复后救援/读题=queue 单通道（play/say 路径零记录）
            }''')
            rescue_hint = lambda: pg.evaluate("(window.__qlog || []).filter(a => a.indexOf('tc_hint2') >= 0)")
            pg.wait_for_timeout(8000)            # 静置 8s → 错点一次（不该重置救援钟）
            qw = quiz_of(pg)
            click_card(pg, (qw['answer'] + 1) % len(qw['opts']))
            pg.wait_for_timeout(1500)            # t0+9.5s：14s 阈值未到，救援不应响
            early = len(rescue_hint())
            check('rescue not fired before 14s threshold (wrong tap did NOT reset)', early == 0,
                  'early=%s' % early)
            try:                                 # miss=2 错点（答案级 breathe 梯度口径：miss≥2 才出 §1）
                pg.wait_for_function(
                    "() => { const L = TC.currentLevel; return !L || L.done || !L.locked; }", timeout=5000)
                qw2 = quiz_of(pg)
                if qw2:
                    click_card(pg, (qw2['answer'] + 1) % len(qw2['opts']))
                pg.wait_for_timeout(1200)        # 错 2 演出落定（不重置救援钟 §0.7a）
            except Exception:
                pass
            pulse_seen = bool(pg.evaluate(        # miss=2 答案级 breathe 已在场（错 2 演出即时出）
                "!!document.querySelector('.card.breathe')"))
            try:                                 # 救援在 ~14s 响（静置钟不被错点重置 §0.7a；qLog 口径）
                pg.wait_for_function(
                    "() => (window.__qlog || []).filter(a => a.indexOf('tc_hint2') >= 0).length >= 1", timeout=9000)
            except Exception:
                pass
            pg.wait_for_timeout(300)
            resc = rescue_hint()
            elapsed = time.time() - t0
            check('rescue fired by idle 14s+ (wrong taps did NOT reset clock) + answer breathe (miss>=2 tier)',
                  pulse_seen and len(resc) >= 1 and elapsed < 22,   # 钟起点=开场 lastAct（早于挂钩 t0，无下限）
                  'breathe=%s rescues=%s wall=%.1fs' % (pulse_seen, len(resc), elapsed))
            if qw['kind'] != 'plus' and qw['kind'] != 'minus':
                check('rescue re-read uses typed tc_hint2 (clock-family kinds)', len(resc) >= 1, str(resc))
            ctx.close()
        finally:
            browser.close()

    # ---- 6. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
