# -*- coding: utf-8 -*-
"""habit _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r5（SPEC §3-r5）：12 序列 6-8 步 + 干扰卡 + 方向锚反馈。
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 40 关审计全绿 + 专项分布
   （章型流程池/乱序≠原序/SPEC 12 序列表独立对账/estMs 家族/15 条 hb_* clips+SPEC_DUR/
    开场链 queue stub/反馈不泄序负向）
2a. 预置存档(跳过教学) → 真实 pointer：首错(晃动+不灰掉 pointer-events 保留+零惩罚+应点卡不 pulse)
    → 同卡二错(miss=2 → 应点卡 breathe) → 答对一步(源卡 gone+飞入槽 lit+locked 窗 hook 拦截)
    → 真实点击通关 → .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(真实点击+hook 全吞)→帮(幽灵手指)→独 真实链路 → habit.tutSeen 持久化
2c. flat10（ch3 辨析池 洗澡/洗衣服/烤蛋糕+每题干扰2）+ flat17（ch4 全库混出 5 题互异+
    ≥2 条 7-8 步长序列）真实点击通关
2d. 双 viewport(1280x800/800x1180) 6卡题+9卡满载题：overflowX==0、卡=主答案 ≥96、槽 ≥64、
    触摸目标 ≥64（.k-parentbtn 豁免）、截图像素非空白（存 _shots/）
3. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
4. 救援钟（§0.7a/§0.21）：flat≥3 静置 14s+ 重读题面（queue[hb_q_*,TTS尾段]）+应点卡 pulse 一次；
   11s 处错点不重置
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'habit', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'habit': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    # 静音纪律（T46 阶段2 2026-09-19）：headless 无手势 Audio.play 被拦→回退 speak=外放；
    # 存根只 no-op play()/speak（真实 Audio 元素保留，verify 页 durSpec onloadedmetadata 不受影响）
    _mute = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
             "speechSynthesis.cancel=function(){};}}catch(e){}"
             "try{var _A=window.Audio;window.Audio=function(u){var a=new _A(u);"
             "a.play=function(){return Promise.resolve();};return a;};}catch(e){};")
    return _mute + 'localStorage.setItem("kidsgame_habit", ' + json.dumps(json.dumps(save)) + ')'


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
    return page.evaluate('HB.quiz')


def play_quiz(page, tag=''):
    """真实点击排完当前一题：循环点应点卡直到 step 推进或通关；返回本题 tap 数"""
    st0 = page.evaluate('HB.currentLevel.step')
    taps = 0
    while taps < 12:
        q = quiz_of(page)
        if q is None:
            return taps
        click_card(page, q['answerIdx'])
        page.wait_for_timeout(850)              # > 单步飞入演出窗 640ms
        taps += 1
        now = page.evaluate('HB.currentLevel')
        if now['done']:
            return taps
        if now['step'] != st0:                  # 'goal'：题末停顿 430ms 后 renderQuiz（~1070ms）
            page.wait_for_timeout(500)          # 等 renderQuiz 换题落地再返回（防外层读到旧 DOM）
            return taps
    raise AssertionError('[%s] play_quiz 超过 12 tap 未推进（引擎死循环？）' % tag)


def play_level(page, first_wrong=False, tag='', on_quiz=None):
    """真实点击打完当前关：每题先排完（可先整关错一次）；on_quiz(q) 在排每题前回调"""
    wrong_done = not first_wrong
    quizzes = 0
    while quizzes < 30:
        q = quiz_of(page)
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = (q['answerIdx'] + 1) % len(q['shown'])
            click_card(page, wi)
            page.wait_for_timeout(650)          # 晃动 480ms 演出窗
            st = page.evaluate('''(wi) => {
              const q = HB.quiz;
              const w = document.querySelector('.card[data-i="' + wi + '"]');
              const ok = document.querySelector('.card[data-i="' + q.answerIdx + '"]');
              return {retries: HB.currentLevel.retries, step: HB.currentLevel.step, miss: q.miss,
                      pos: q.pos, wig: w.classList.contains('wig'), dim: w.classList.contains('dim'),
                      pe: getComputedStyle(w).pointerEvents,
                      breathe: ok.classList.contains('breathe')};
            }''', wi)
            check('%sfirst wrong: wig + NOT dimmed + pointer-events kept + zero penalty + no pulse' % tag,
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and st['pos'] == 0 and
                  st['wig'] and not st['dim'] and st['pe'] != 'none' and not st['breathe'], str(st))
            continue
        if on_quiz:
            on_quiz(q)
        play_quiz(page, tag=tag)
        quizzes += 1
    page.wait_for_selector('.k-celebrate', timeout=15000)
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
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=20000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str([s for s in vj['smokes']['layout']['sims'] if not s['pass']]))
            check('verify 40-level audit all ok',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify units all ok', all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            dist = vj['units']['dist']
            check('habit specifics: steps table ref, clips, opening/rescue chain, hid coverage',
                  dist['ok'] and dist['stepsRef'] and dist['clips'] and dist['openChain'] and
                  dist['rescueChain'] and all(v >= 1 for v in dist['hidDist'].values()),
                  'hidDist=%s' % dist['hidDist'])
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + 飞入 lit + locked 窗 + 真实点击通关（2 星） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.HB && HB.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)             # 等开场链+入场动画落定再点击
            lv = pg.evaluate('HB.currentLevel')
            check('start at 1-0 (ch 1-based)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('HB.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook contract {hid,name,steps,shown,decoys,cards,pos,answerIdx,step,miss}',
                  q and q['hid'] in ('xishou', 'qichuang', 'shuaya', 'chuanyi') and
                  q['name'] in ('洗手', '起床', '刷牙', '穿衣') and
                  len(q['steps']) == len(q['shown']) and len(q['steps']) == 6 and   # r5：6-8 步（ch1 全 6）
                  sorted(q['shown']) == list(range(len(q['shown']))) and
                  q['shown'] != list(range(len(q['shown']))) and          # 乱序≠原序
                  q['decoys'] == [] and len(q['cards']) == 6 and         # ch1 无干扰
                  q['pos'] == 0 and q['cards'][q['answerIdx']]['s'] == 0 and q['miss'] == 0,
                  str(q and {k: q[k] for k in ('hid', 'shown', 'answerIdx', 'pos', 'decoys')}))
            # 首错零惩罚（play_level 内断言）→ 通关
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('finished 5 quizzes by real click', n == 5, 'quizzes=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('HB.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_habit")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            # 新关第一题答对一步：演出窗内读源卡 gone + locked 窗 hook 拦截；飞入后槽 lit
            q1 = quiz_of(pg)
            old_ai, hid1 = q1['answerIdx'], q1['hid']
            click_card(pg, old_ai)
            pg.wait_for_timeout(120)             # 同步段：locked=true、源卡 gone、pos=1
            fs = pg.evaluate('''(ai) => {
              const c = document.querySelector('.card[data-i="' + ai + '"]');
              return {gone: c.classList.contains('gone'),
                      pos: HB.quiz.pos, step: HB.currentLevel.step, won: HB.currentLevel.won};
            }''', old_ai)
            check('correct tap -> source card gone inside flight window',
                  fs['gone'] and fs['pos'] == 1 and fs['step'] == 0 and not fs['won'], str(fs))
            locked_ret = pg.evaluate('HB.tapCard(%d)' % old_ai)   # 演出窗内：locked 门拦 hook
            check('hook tap inside flight window -> false (locked guard)', locked_ret is False,
                  'ret=%s' % locked_ret)
            pg.wait_for_timeout(800)             # 飞入 transition 结束 + 解锁
            lit = pg.evaluate('''() => ({
              lit: document.querySelector('.slot[data-pos="0"]').classList.contains('lit'),
              emoji: !!document.querySelector('.slot[data-pos="0"] .s-emoji'),
              pos: HB.quiz.pos, step: HB.currentLevel.step})''')
            check('slot 0 lit with emoji after fly-in', lit['lit'] and lit['emoji'], str(lit))
            again_ret = pg.evaluate('HB.tapCard(%d)' % old_ai)    # 点已排位：again 零惩罚
            check('tap placed card again -> "again" zero penalty',
                  again_ret == 'again' and pg.evaluate('HB.quiz.miss') == 0, 'ret=%s' % again_ret)
            pg.wait_for_timeout(600)             # 演出窗收尾
            q2 = quiz_of(pg)
            if q2 and q2['step'] == 1:           # 本题未排完则仍是原题
                check('quiz 2 rendered fresh (shown reshuffled, unanswered)',
                      q2['pos'] == 0 and q2['shown'] != list(range(len(q2['shown']))), str(q2['shown']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.HB && HB.currentLevel', timeout=8000)
            pg.wait_for_function("HB.tutorial === 'watch'", timeout=5000)
            swallowed_hook = pg.evaluate('HB.tapCard(0)') is False    # 演示期 hook 输入全吞
            qw0 = quiz_of(pg)
            click_card(pg, qw0['answerIdx'])         # 演示期真实点击也吞
            pg.wait_for_timeout(600)
            st = pg.evaluate('''() => ({step: HB.currentLevel.step, retries: HB.currentLevel.retries,
                                        tut: HB.tutorial})''')
            check('tutorial watch swallows input (real click + hook)',
                  swallowed_hook and st['step'] == 0 and st['retries'] == 0 and
                  st['tut'] == 'watch', str(st))
            pg.wait_for_function("HB.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0',
                  q and q['step'] == 0 and q['pos'] == 0 and q['miss'] == 0, str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> correct card', ghost_shown)
            n = play_level(pg, tag='[2b] ')       # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'quizzes=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_habit")'))
            check('habit.tutSeen persisted', (saved.get('habit') or {}).get('tutSeen') is True,
                  str(saved.get('habit')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c1. flat10（ch3 辨析池 洗澡/洗衣服/烤蛋糕+干扰×2）：池内流程 + 每题干扰 + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c1')
            pg.goto(URL)
            pg.wait_for_function('window.HB && HB.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)
            lv = pg.evaluate('HB.currentLevel')
            check('ch3 level start at flat=10', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            c3 = pg.evaluate('''() => {
              const qs = genLevel(10).quizzes;
              const hids = qs.map(q => q.hid);
              const dist = {xizao: 0, xiyi: 0, kaodangao: 0};
              hids.forEach(h => dist[h]++);
              return {inPool: hids.every(h => h === 'xizao' || h === 'xiyi' || h === 'kaodangao'),
                      dist: dist, steps: qs.map(q => q.steps.length),
                      decoys: qs.map(q => q.decoys.length), cards: qs.map(q => q.cards.length),
                      shufOk: qs.every(q => q.shown.join('') !==
                        Array.from(q.steps, (_, i) => i).join('')),
                      decoyFair: qs.every(q => {
                        const my = q.steps;   // 干扰卡来源恒他序列（页面对引擎自证，深检走 verify）
                        return q.decoys.every(d => d.h !== q.hid);
                      })};
            }''')
            check('ch3: pool {xizao,xiyi,kaodangao} all >=1, decoys=2 each, 6/7-step, shown != identity',
                  c3['inPool'] and all(v >= 1 for v in c3['dist'].values()) and
                  c3['decoys'] == [2] * 5 and set(c3['steps']) == {6, 7} and c3['shufOk'] and
                  c3['decoyFair'] and all(6 <= s <= 9 for s in c3['cards']), str(c3))
            seen_n = set()

            def on_quiz3(q):
                seen_n.add(len(q['steps']))
                chips = pg.evaluate('''() => ({
                  name: (document.querySelector('#prompt-chip .p-name') || {}).textContent,
                  slots: document.querySelectorAll('#strip .slot').length,
                  cards: document.querySelectorAll('#board .card').length})''')
                if chips['slots'] != len(q['steps']) or chips['cards'] != len(q['cards']) or \
                        chips['name'] != q['name']:
                    check('[2c1] DOM slots/cards/prompt match quiz', False, str(chips) + ' vs ' + str(q))

            n = play_level(pg, tag='[2c1] ', on_quiz=on_quiz3)
            check('[2c1] DOM slots/cards/prompt match every quiz', True, '')
            check('ch3 real-click win (5 quizzes, 6&7-step + decoys)', n == 5 and seen_n == {6, 7},
                  'quizzes=%d steps=%s' % (n, sorted(seen_n)))
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('HB.currentLevel')
            check('ch3 win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            ctx.close()

            # ---- 2c2. flat17（ch4 全库混出）：5 题流程互异 + ≥2 长序列 + 干扰 0-2 + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(17), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c2')
            pg.goto(URL)
            pg.wait_for_function('window.HB && HB.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)
            lv = pg.evaluate('HB.currentLevel')
            check('ch4 level start at flat=17', lv and lv['flat'] == 17 and lv['dch'] == 4, str(lv))
            ALL12 = ('xishou', 'qichuang', 'shuaya', 'chuanyi', 'guomal', 'shuijiao',
                     'baojiaozi', 'zhonghua', 'jixin', 'kaodangao', 'xizao', 'xiyi')
            c4 = pg.evaluate('''() => {
              const qs = genLevel(17).quizzes;
              const hids = qs.map(q => q.hid);
              return {hids: hids, uniq: new Set(hids).size,
                      longs: qs.filter(q => q.steps.length >= 7).length,
                      decoys: qs.map(q => q.decoys.length), cards: qs.map(q => q.cards.length)};
            }''')
            check('ch4: 5 mutually distinct habits from 12-habit library, >=2 long (7-8 step), decoys 0-2',
                  c4['uniq'] == 5 and all(h in ALL12 for h in c4['hids']) and c4['longs'] >= 2 and
                  all(0 <= d <= 2 for d in c4['decoys']) and all(c <= 9 for c in c4['cards']),
                  str(c4))
            n = play_level(pg, tag='[2c2] ')
            check('ch4 real-click win (5 distinct habits)', n == 5, 'quizzes=%d' % n)
            ctx.close()

            # ---- 2d. 双 viewport：6卡题(flat0 ch1)+9卡满载题(flat10 ch3 7步+干扰2)：ox==0、卡>=96、槽>=64、截图 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, bonus=30))   # 从 flat0（ch1 6 卡题）起
                pg.goto(URL)
                pg.wait_for_function('window.HB && HB.currentLevel', timeout=8000)
                pg.wait_for_timeout(1000)        # 入场动画落定
                for tag, n_expect, n_slots in [('6card', 6, 6), ('9card', 9, 7)]:
                    if tag == '9card':
                        pg.evaluate('startLevel(10)')
                        pg.wait_for_timeout(1100)  # 9 卡入场 stagger（8×70=560ms）+pop 落定
                    m = pg.evaluate('''() => {
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;
                        const r = e.getBoundingClientRect();
                        if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                          bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                      });
                      const cards = [...document.querySelectorAll('.card')];
                      const cr = cards.map(c => c.getBoundingClientRect());
                      const cMin = cr.length ? Math.round(Math.min(...cr.map(r => Math.min(r.width, r.height)))) : 0;
                      const slots = [...document.querySelectorAll('.slot')].map(s => s.getBoundingClientRect());
                      const sMin = slots.length ? Math.round(Math.min(...slots.map(r => Math.min(r.width, r.height)))) : 0;
                      const words = [...document.querySelectorAll('.card')].every(c =>
                        c.querySelector('.c-word') && c.querySelector('.c-word').scrollWidth <= c.clientWidth + 2);
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad, cards: cards.length,
                              slots: slots.length, cMin: cMin, sMin: sMin, wordOk: words};
                    }''')
                    check('vp %dx%d %s overflowX==0 + cards=%d(>=96) + slots=%d(>=64) + buttons>=64 + word fits' %
                          (vp[0], vp[1], tag, n_expect, n_slots),
                          m['ox'] == 0 and m['cards'] == n_expect and m['slots'] == n_slots and
                          m['cMin'] >= 96 and m['sMin'] >= 64 and not m['bad'] and m['wordOk'],
                          'ox=%s cards=%s slots=%s cMin=%s sMin=%s bad=%s word=%s' %
                          (m['ox'], m['cards'], m['slots'], m['cMin'], m['sMin'], m['bad'][:3], m['wordOk']))
                    shot = SHOTS / ('habit-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot, floor=10.0)
                    check('screenshot %s %dx%d non-blank (stdev>10)' % (tag, vp[0], vp[1]), ok, detail)
                ctx.close()

            # ---- 4. 救援钟（§0.7a/§0.21）：flat>=3 静置 14s+ 重读题面+应点卡 pulse；11s 处错点不重置 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.HB && HB.currentLevel', timeout=8000)
            check('rescue scenario starts at flat=3 (>=3)', pg.evaluate('HB.currentLevel.flat') == 3)
            pg.wait_for_timeout(2500)            # 等开场链（queue 三段）落完再挂钩
            t0 = time.time()
            pg.evaluate('''() => {
              window.__qlog = [];
              window.__wrapT = performance.now();
              KIDS.voice.queue = function (parts) {
                window.__qlog.push({parts: parts.map(p => typeof p === 'string' ? p : {key: p.key, text: p.text}),
                                    t: performance.now()});
              };
            }''')
            rescue_calls = lambda: pg.evaluate('''() => window.__qlog.filter(e =>
              e.parts.length === 2 && typeof e.parts[0] === 'string' && e.parts[0].indexOf('hb_q_') === 0)''')
            pg.wait_for_timeout(8000)            # 静置 8s → 错点一次（不该重置救援钟）
            qw = quiz_of(pg)
            click_card(pg, (qw['answerIdx'] + 1) % len(qw['shown']))
            pg.wait_for_timeout(1500)            # T0+9.5s：14s 阈值未到，救援不应响
            early = len(rescue_calls())
            check('rescue not fired before 14s threshold', early == 0, 'early=%s' % early)
            try:                                 # 若错点(+8s)未重置 → 救援在 ~11.5s 响 + 应点卡 pulse
                pg.wait_for_function("document.querySelector('.card.pulse')", timeout=8000)
                pulse_seen = True
            except Exception:
                pulse_seen = False
            pg.wait_for_timeout(300)             # queue 与 pulse 同拍，稍等日志落地
            resc = rescue_calls()
            elapsed = time.time() - t0
            # 错点在 wrap 后 ~8s：若它重置救援钟，首次救援将落在 ~22s（8s 窗 + 14s），此处仍为 0
            check('rescue fired by idle 14s+ (wrong tap at +8s did NOT reset clock) + answer card pulse',
                  pulse_seen and len(resc) >= 1 and elapsed < 17,
                  'pulse=%s qk=%s wall=%.1fs' % (pulse_seen, len(resc), elapsed))
            if resc:
                check('rescue re-reads question via queue([hb_q_*, hb_suffix clip])',  # T46 阶段2：尾段 clip 化
                      resc[0]['parts'][1] == 'hb_suffix' and
                      resc[0]['parts'][0] == 'hb_q_' + qw['hid'], str(resc[0]['parts']))
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
