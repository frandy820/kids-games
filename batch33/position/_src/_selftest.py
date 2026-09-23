# -*- coding: utf-8 -*-
"""position _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器
进程；每页 goto 前挂静音 init_script r28 定稿 function 版+种档 settings{sound:false,tts:false,vol:0}
双保险）。单元=SPEC-R44-POSITION §R9：
1. ?verify=1 复跑 → title=VERIFY PASS + pass==total + layoutOk + 40 关审计全绿 + 专项分布
   （r44 谱：dual 组合 4 值覆盖/flip ask 6 值覆盖/answer 位直方图 ≥14/kinds 四型构成）
2a. 预置存档(跳过教学) → 真实 pointer：首错（wig+零惩罚+miss=1+正确格不 breathe）→
    错链豁免窗后二错（miss=2 → 正确格 breathe 答案级梯度）→ 答对 lit+locked 窗 hook 拦截
    → 真实点击通关 → .k-celebrate 2 星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看（真实点击+hook 全吞）→帮→独 真实链路 → position.tutSeen 持久化
2c. flat10（ch3 房子来帮啦：3 dual+findpos 热身）真实点击通关 + dual 三元组组合封闭表
    独立复算（SPEC §R4 字面表推导 answer=树约束格）+房子 DOM 取证（data-on/g[data-scene=
    "house"]/dual 帧零兔）
2d. flat15（ch4 转过身啦：3 flip+findpos 热身）真实点击通关 + flip 180° 映射律独立复算
    （SPEC §R4 FLIP_MAP 字面表）+背面兔 DOM 取证（data-face="back"+.bunny.back）
2e. 双 viewport(1280x800/800x1180)：恒 6 格 ≥96、overflowX==0、截图像素非空白（_shots/）
3. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
4. 救援钟（§0.7a）：flat≥3 静置 14s+ 重读题面（开题链 queue 记录）；11s 处错点不重置
"""
import json
import sys
import time
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')
RESULTS = []

# 静音纪律（r28 定稿 function 版，段二 2026-09-22 起 ended 5ms→1500ms 口径）：ctx 级静音
# （speechSynthesis no-op+Audio.play no-op+1500ms ended——防外放兜底更保守，测试页
#  voice 全 stub/settings sound:false，此层零触发仅双保险）
MUTE_JS = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
           "speechSynthesis.cancel=function(){};}}catch(e){}"
           "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
           "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},1500);"
           "return Promise.resolve();};p.pause=function(){};}catch(e){};")


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=()):
    """种档：settings 全静音（任务书口径）+ 可选已通关 flats + position.tutSeen"""
    save = {
        'v': '1.0', 'game': 'position', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: 0},
        'settings': {'sound': False, 'tts': False, 'vol': 0},
        'restTip': {'day': '', 'shown': 0},
        'position': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return MUTE_JS + 'localStorage.setItem("kidsgame_position", ' + \
        json.dumps(json.dumps(save)) + ')'


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


def click_cell(page, i):
    loc = page.locator('.cell[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def quiz_of(page):
    return page.evaluate('window.PS.quiz')


def wait_step(page, expect, timeout_ms):
    """等关内题号推进到 expect（答对演出窗真实页 findpos/placepos/dual 5500ms/flip 9000ms）"""
    page.wait_for_function(
        'e => window.PS.currentLevel && (window.PS.currentLevel.step === e || window.PS.currentLevel.done)',
        arg=expect, timeout=timeout_ms)


def play_level(page, tag='', on_quiz=None):
    """真实点击打完当前关：每题点正确格（PS.quiz 独立取 answer）。演出窗内点击会被 locked
    门吞（返回 false 不推进）→ 点击后短轮询 step 推进、未推进即重点，直至推进（窗 ≤9s）。
    on_quiz(q) 在答每题前回调（回调内自带帧等待——q 快照取自引擎，DOM 帧滞后至 renderQuiz）。"""
    answered = 0
    while answered < 30:
        q = quiz_of(page)
        if q is None:
            break
        if on_quiz:
            on_quiz(q)
        s0 = page.evaluate('PS.currentLevel.step')
        moved = False
        deadline = time.time() + 30
        while time.time() < deadline:
            click_cell(page, q['answer'])
            try:
                page.wait_for_function(
                    'e => window.PS.currentLevel && (window.PS.currentLevel.step === e ||'
                    ' window.PS.currentLevel.done)', arg=s0 + 1, timeout=1500)
                moved = True
                break
            except Exception:
                continue                       # 窗内被吞 → 窗过后重点
        if not moved:
            break
        answered += 1
    page.wait_for_selector('.k-celebrate', timeout=20000)
    return answered


# SPEC-R44 §R4 封闭表 Python 侧字面重列（帧身份等待+q-text 视觉承载断言依据；禁抄页面）
POS_NAME = {'front': '前面', 'back': '后面', 'left': '左边', 'right': '右边',
            'up': '上面', 'down': '下面'}
DUAL_TTS = {'lu': '兔子藏在树的左边，也在房子的上面',
            'dr': '兔子藏在树的下面，也在房子的右边',
            'ru': '兔子藏在树的右边，也在房子的上面',
            'dl': '兔子藏在树的下面，也在房子的左边'}


def wait_qtext(page, text, timeout_ms=12000):
    """等题面条渲染为目标全句（帧身份判据：renderCells 时 qTextEl.textContent=Q_TEXT(q)）"""
    page.wait_for_function('t => document.querySelector(".q-text").textContent === t',
                           arg=text, timeout=timeout_ms)


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
            # ---- 1. verify=1 复跑 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_JS)
            pg = ctx.new_page()
            watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=120000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total + layoutOk',
                  vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify 40-level audit all ok',
                  all(v['ok'] for v in vj['levels'].values()) and
                  all(v['ok'] for v in vj['gen'].values()))
            check('verify units all ok', all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str([s for s in vj['smokes']['layout']['sims'] if not s['pass']]))
            audit = vj['units']['audit']
            # r44 专项分布（SPEC §R9：组合 4 值/ask 6 值覆盖+answer 位 ≥14 下界——期望半独立推导）
            check('r44 specifics: dual combo x4 + flip ask x6 + answer buckets >=14 + gen dch 1-4',
                  all(v >= 1 for v in audit['dualComboN'].values()) and
                  all(v >= 1 for v in audit['flipAskN'].values()) and
                  all(v >= 14 for v in audit['ansBucket'].values()) and
                  all(audit['genDch'].get(str(d), 0) >= 1 for d in (1, 2, 3, 4)),
                  'combo=%s flip=%s ans=%s genDch=%s' %
                  (audit['dualComboN'], audit['flipAskN'], audit['ansBucket'], audit['genDch']))
            ctx.close()

            # ---- 2a. 预置存档：首错/二错梯度/lit+locked 拦截/真实通关 2 星/写档 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.PS && PS.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)               # 等开场链+入场动画落定再点击
            lv = pg.evaluate('PS.currentLevel')
            check('start at 1-0 (ch 1-based)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('PS.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook contract {kind,ask,ask2,house,face,cells,bunnyAt,answer,step,miss}',
                  q and q['kind'] == 'findpos' and q['ask'] == 'front' and
                  q['ask2'] is None and q['house'] is None and q['face'] is None and
                  len(q['cells']) == 6 and q['bunnyAt'] == 'front' and
                  q['answer'] == 0 and q['step'] == 0 and q['miss'] == 0, str(q))
            wi = (q['answer'] + 1) % 6             # 首错格
            click_cell(pg, wi)
            pg.wait_for_timeout(600)
            st = pg.evaluate('''(wi) => {
              const q = PS.quiz;
              const w = document.querySelector('.cell[data-i="' + wi + '"]');
              const ok = document.querySelector('.cell[data-i="' + q.answer + '"]');
              return {retries: PS.currentLevel.miss, step: PS.currentLevel.step, miss: q.miss,
                      wig: w.classList.contains('wig'), pe: getComputedStyle(w).pointerEvents,
                      breathe: ok.classList.contains('breathe')};
            }''', wi)
            check('first wrong: wig + pointer-events kept + miss=1 + zero penalty + no breathe yet',
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and st['wig'] and
                  st['pe'] != 'none' and not st['breathe'], str(st))
            # 错链豁免窗（真时钟 4970）后二错 → miss=2 答案级 breathe（b31 家族口径：窗内二错吞）
            pg.wait_for_timeout(5100)
            click_cell(pg, wi)
            pg.wait_for_timeout(1100)             # 二错 1000ms 防重入窗过后再点对
            st2 = pg.evaluate('(wi) => ({miss: PS.quiz.miss, retries: PS.currentLevel.miss,'
                              ' breathe: document.querySelector(".cell[data-i=\\"" + PS.quiz.answer + "\\"]").classList.contains("breathe")})', wi)
            check('second wrong after exempt window: miss=2 + correct cell breathe (answer-level)',
                  st2['miss'] == 2 and st2['retries'] == 2 and st2['breathe'], str(st2))
            click_cell(pg, q['answer'])            # 答对（豁免窗已过+防重入窗已过）
            pg.wait_for_timeout(400)
            fs = pg.evaluate('''() => ({
              lit: !!document.querySelector('.cell.lit'), step: PS.currentLevel.step})''')
            check('correct tap -> cell lit inside show window', fs['lit'] and fs['step'] == 1, str(fs))
            locked_ret = pg.evaluate('PS.tapCell(0)')   # 演出窗内 locked 门拦 hook
            check('hook tap inside show window -> false (locked guard)', locked_ret is False,
                  'ret=%s' % locked_ret)
            wait_step(pg, 1, 8000)
            n = play_level(pg, tag='[2a] ')       # 首题已由探针点对（step=1），余 4 题真实点
            check('answered remaining 4 quizzes by real click', n == 4, 'answered=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (2 wrong taps = 1-2=2 stars)',
                  stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(4200)              # celebrate 收起+写档+推进
            lv2 = pg.evaluate('PS.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_position")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮(placepos/front 定制)→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False))
            pg = ctx.new_page()
            watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.PS && PS.currentLevel', timeout=8000)
            pg.wait_for_function("PS.tutorial === 'watch'", timeout=5000)
            swallowed_hook = pg.evaluate('PS.tapCell(0)') is False   # 演示期 hook 输入全吞
            qw0 = quiz_of(pg)
            click_cell(pg, qw0['answer'])           # 演示期真实点击也吞
            pg.wait_for_timeout(600)
            st = pg.evaluate('() => ({step: PS.currentLevel.step, retries: PS.currentLevel.miss,'
                             ' tut: PS.tutorial})')
            check('tutorial watch swallows input (real click + hook)',
                  swallowed_hook and st['step'] <= 1 and st['retries'] == 0 and
                  st['tut'] == 'watch', str(st))
            pg.wait_for_function("PS.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = quiz_of(pg)
            check('tutorial turn -> placepos/front custom quiz (SPEC-R44 §R6 教学链)',
                  q and q['kind'] == 'placepos' and q['ask'] == 'front' and
                  q['bunnyAt'] == 'back' and q['step'] == 0, str(q))
            try:
                pg.wait_for_function(
                    "document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> correct cell', ghost_shown)
            n = play_level(pg, tag='[2b] ')         # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(4200)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_position")'))
            check('position.tutSeen persisted', (saved.get('position') or {}).get('tutSeen') is True,
                  str(saved.get('position')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. flat10（ch3 dual 主载）：组合封闭表独立复算+房子 DOM+真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10)))
            pg = ctx.new_page()
            watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.PS && PS.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)
            pg.evaluate('PS.start(10)')
            pg.wait_for_timeout(600)
            lv = pg.evaluate('PS.currentLevel')
            check('ch3 level start at flat=10', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            c3 = pg.evaluate(r'''() => {
              // SPEC-R44 §R4 组合封闭表独立字面重列（禁引用页面 DUAL_COMBOS）
              const DUAL = [ {key:'lu', house:'left-down',  tree:'left',  houseDir:'up'},
                             {key:'dr', house:'left-down',  tree:'down',  houseDir:'right'},
                             {key:'ru', house:'right-down', tree:'right', houseDir:'up'},
                             {key:'dl', house:'right-down', tree:'down',  houseDir:'left'} ];
              const qs = genLevel(10).quizzes;
              const cnt = {findpos: 0, placepos: 0, dual: 0, flip: 0};
              qs.forEach(q => cnt[q.kind]++);
              const dualOk = qs.filter(q => q.kind === 'dual').every(q => {
                const c = DUAL.find(x => x.house === q.house && x.tree === q.ask && x.houseDir === q.ask2);
                return !!c && q.bunnyAt === null && q.cells[q.answer].pos === q.ask;
              });
              return {cnt: cnt, dualOk: dualOk};
            }''')
            check('ch3: 3 dual + findpos warmup, combo triple in closed table, answer=tree cell',
                  c3['cnt']['dual'] == 3 and c3['cnt']['findpos'] >= 1 and c3['cnt']['flip'] == 0 and
                  c3['dualOk'], str(c3))
            dual_dom = []

            def on_quiz3(q):
                if q['kind'] == 'dual':
                    # 组合独立复算（SPEC §R4 字面表）：三元组→combo key→TTS 全句帧身份等待
                    combo = next(k for k, (house, tree, hd) in
                                 {'lu': ('left-down', 'left', 'up'),
                                  'dr': ('left-down', 'down', 'right'),
                                  'ru': ('right-down', 'right', 'up'),
                                  'dl': ('right-down', 'down', 'left')}.items()
                                 if house == q['house'] and tree == q['ask'] and hd == q['ask2'])
                    wait_qtext(pg, DUAL_TTS[combo])     # q-text 全句=视觉承载面（注册后语音+文字双承载）
                    st = pg.evaluate(r'''() => ({
                      on: document.getElementById('house').dataset.on,
                      anchor: !!document.querySelector('#house g[data-scene="house"]'),
                      z: getComputedStyle(document.getElementById('house')).zIndex,
                      noBunny: !document.querySelector('.cell .bunny')})''')
                    dual_dom.append(st)
                else:
                    pg.wait_for_function(
                        '() => document.getElementById("house").dataset.on === "0"', timeout=12000)
                    if pg.evaluate('document.getElementById("house").dataset.on') != '0':
                        dual_dom.append({'leak': True})

            n = play_level(pg, tag='[2c] ', on_quiz=on_quiz3)
            check('ch3 real-click win (5 quizzes incl. 3 dual)', n == 5, 'answered=%d' % n)
            check('dual frame DOM: house data-on=1 + g[data-scene=house] + z=15 + no bunny; '
                  'non-dual house cleared',
                  dual_dom and all(d.get('on') == '1' and d.get('anchor') and d.get('z') == '15'
                                   and d.get('noBunny') for d in dual_dom),
                  str(dual_dom))
            pg.wait_for_timeout(4200)
            lv2 = pg.evaluate('PS.currentLevel')
            check('ch3 win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            ctx.close()

            # ---- 2d. flat15（ch4 flip 主载）：映射律独立复算+背面兔 DOM+真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.PS && PS.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)
            pg.evaluate('PS.start(15)')
            pg.wait_for_timeout(600)
            lv = pg.evaluate('PS.currentLevel')
            check('ch4 level start at flat=15', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            c4 = pg.evaluate(r'''() => {
              // SPEC-R44 §R4 FLIP_MAP 独立字面重列（禁引用页面 FLIP_MAP）
              const FM = {left: 'right', right: 'left', front: 'back', back: 'front', up: 'up', down: 'down'};
              const qs = genLevel(15).quizzes;
              const cnt = {findpos: 0, placepos: 0, dual: 0, flip: 0};
              qs.forEach(q => cnt[q.kind]++);
              const flipOk = qs.filter(q => q.kind === 'flip').every(q =>
                q.face === 'back' && q.cells[q.answer].pos === FM[q.ask] &&
                q.bunnyAt !== FM[q.ask] && q.bunnyAt !== null);
              return {cnt: cnt, flipOk: flipOk, asks: qs.filter(q => q.kind === 'flip').map(q => q.ask)};
            }''')
            check('ch4: 3 flip + findpos warmup, answer=FLIP_MAP[ask] cell, bunny off answer',
                  c4['cnt']['flip'] == 3 and c4['cnt']['findpos'] >= 1 and c4['cnt']['dual'] == 0 and
                  c4['flipOk'], str(c4))
            flip_dom = []

            def on_quiz4(q):
                if q['kind'] == 'flip':
                    # FLIP_MAP 独立复算帧身份等待：q-text 全句（视觉承载）+背面兔在 bunnyAt 格
                    wait_qtext(pg, '兔子转过身去啦，它的%s是树的哪边呀' % POS_NAME[q['ask']])
                    st = pg.evaluate(r'''(bp) => {
                      const b = document.querySelector('.cell[data-face="back"] .bunny.back');
                      return {back: !!b, at: b ? b.closest('.cell').dataset.pos : null,
                              atOk: !!b && b.closest('.cell').dataset.pos === bp,
                              anchor: !!document.querySelector('.bunny.back g[data-anim="bunny"]')};
                    }''', q['bunnyAt'])
                    flip_dom.append(st)

            n = play_level(pg, tag='[2d] ', on_quiz=on_quiz4)
            check('ch4 real-click win (5 quizzes incl. 3 flip)', n == 5, 'answered=%d' % n)
            check('flip frame DOM: back bunny at bunnyAt cell + g[data-anim=bunny] anchor',
                  len(flip_dom) == 3 and all(d['back'] and d['atOk'] and d['anchor'] for d in flip_dom),
                  str(flip_dom))
            ctx.close()

            # ---- 2e. 双 viewport：恒 6 格 >=96 + overflowX==0 + 截图非空白（采样帧=flat10 qi0
            #      findpos 帧非 dual 帧、房子不渲染——文件名 position-dual-vp 系历史沿用，
            #      修复轮 m3 勘注；dual 帧房子布局归 ⑪ ox 总闸+真机域）----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                ctx.add_init_script(preset_save(tut_seen=True))
                pg = ctx.new_page()
                watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                pg.wait_for_function('window.PS && PS.currentLevel', timeout=8000)
                pg.wait_for_timeout(1000)
                pg.evaluate('PS.start(10)')
                pg.wait_for_timeout(800)           # 入场动画落定
                m = pg.evaluate(r'''() => {
                  const de = document.documentElement;
                  const cells = [...document.querySelectorAll('.cell')];
                  const cr = cells.map(c => c.getBoundingClientRect());
                  const cMin = cr.length ? Math.round(Math.min(...cr.map(r => Math.min(r.width, r.height)))) : 0;
                  return {ox: de.scrollWidth - de.clientWidth, cells: cells.length, cMin: cMin,
                          house: document.getElementById('house').dataset.on};
                }''')
                check('vp %dx%d overflowX==0 + 6 cells >=96 (dual chapter)' % vp,
                      m['ox'] == 0 and m['cells'] == 6 and m['cMin'] >= 96,
                      'ox=%s cells=%s cMin=%s' % (m['ox'], m['cells'], m['cMin']))
                shot = SHOTS / ('position-dual-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot dual %dx%d non-blank (stdev>10)' % vp, ok, detail)
                ctx.close()

            # ---- 4. 救援钟（§0.7a）：flat>=3 静置 14s+ 重读题面（开题链 queue）；错点不重置 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.PS && PS.currentLevel', timeout=8000)
            pg.evaluate('PS.start(3)')
            pg.wait_for_timeout(2500)              # 等开场链落完再挂钩
            t0 = time.time()
            pg.evaluate(r'''() => {
              window.__vlog = [];
              window.__wrapT = performance.now();
              const wq = fn => function(parts) {
                window.__vlog.push({t: performance.now(), parts: parts});
                return fn.call(this, parts);
              };
              KIDS.voice.queue = wq(KIDS.voice.queue);
              KIDS.voice.play = wq(function(k) { window.__vlog.push({t: performance.now(), parts: [k]}); });
            }''')
            pg.wait_for_timeout(8000)              # 静置 8s → 错点一次（不该重置救援钟）
            qw = quiz_of(pg)
            click_cell(pg, (qw['answer'] + 1) % 6)
            pg.wait_for_timeout(1500)              # T0+9.5s：14s 阈值未到，救援不应响
            early = pg.evaluate(r'''() => window.__vlog
              .filter(e => e.t > window.__wrapT + 5000 && e.parts &&
                (e.parts[0] === 'ps_q1' || e.parts[0] === 'ps_place_front')).length''')
            check('rescue not fired before 14s threshold', early == 0, 'early=%s' % early)
            pg.wait_for_timeout(6000)              # T0+15.5s：错点(+8s)未重置 → 救援已响
            rescue = pg.evaluate(r'''() => {
              const qs = window.__vlog.filter(e => e.t > window.__wrapT + 5000 && e.parts &&
                (e.parts[0] === 'ps_q1' || (typeof e.parts[0] === 'string' && e.parts[0].indexOf('ps_place_') === 0)));
              return {n: qs.length, firstAt: qs.length ? qs[0].t - window.__wrapT : -1};
            }''')
            elapsed = time.time() - t0
            check('rescue fired by idle 14s+ (wrong tap at +8s did NOT reset clock)',
                  rescue['n'] >= 1 and rescue['firstAt'] <= 15500 and elapsed < 17,
                  'n=%s firstAt=%sms wall=%.1fs' % (rescue['n'], round(rescue['firstAt']), elapsed))
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
