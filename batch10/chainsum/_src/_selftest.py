# -*- coding: utf-8 -*-
"""chainsum _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 40 关审计全绿 + 专项分布
   （链首尾相接/参数域/op 约束/numCn+qSpeech 对账/开场链 stub/cs_* clips）
2a. 预置存档(跳过教学) → 真实 pointer：首错(晃动+灰掉 pointer-events:none+零惩罚+dead 标记+正确卡
    不 pulse) → 已灰卡 hook=again → 答对 lit+空车厢填数亮起(演出窗内) + locked 窗内 hook 拦截
    → 真实点击通关 → .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(真实点击+hook 全吞)→帮(幽灵手指)→独 真实链路 → cs.tutSeen 持久化
2c. flat10（ch3 大数字域：链值∈[0,20] d∈[2,5]）+ flat17（ch4：±各≥1+高频交替）真实点击通关
2d. 双 viewport(1280x800/800x1180) 首题 2 节车 + 6 节车最宽链：overflowX==0、候选卡 ≥96、
    触摸目标 ≥64（.k-parentbtn 豁免）、截图像素非空白（存 _shots/）
3. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
4. 救援钟（§0.7a/§0.21）：flat≥3 静置 14s+ 重读题面（TTS '等于几呀'）+ 正确卡视觉重现；
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

# 静音纪律（T46 阶段2 2026-09-19）：无种子页（verify 页）ctx 级静音——同 preset_save _mute
MUTE_JS = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
           "speechSynthesis.cancel=function(){};}}catch(e){}"
           "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
           "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},5);"
           "return Promise.resolve();};p.pause=function(){};}catch(e){};")


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'chainsum', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'cs': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    # 静音纪律（T46 阶段2 2026-09-19）：规范 INIT_SND（原型级 play/pause no-op+5ms ended 派发）随种子注入
    _mute = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
             "speechSynthesis.cancel=function(){};}}catch(e){}"
             "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
             "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},5);"
             "return Promise.resolve();};p.pause=function(){};}catch(e){};")
    return _mute + 'localStorage.setItem("kidsgame_chainsum", ' + json.dumps(json.dumps(save)) + ')'


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
    loc = page.locator('.cardbtn[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def quiz_of(page):
    return page.evaluate('CS.quiz')


def play_level(page, first_wrong=False, tag='', on_quiz=None):
    """真实点击打完当前关：每题点正确数字卡（可先错一张干扰卡）；on_quiz(q) 在答每题前回调"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = quiz_of(page)
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = next(k for k, v in enumerate(q['options']) if v != q['answer'])
            click_card(page, wi)
            page.wait_for_timeout(600)
            st = page.evaluate('''(wi) => {
              const q = CS.quiz;
              const w = document.querySelector('.cardbtn[data-i="' + wi + '"]');
              const ok = document.querySelector('.cardbtn[data-i="' + q.options.indexOf(q.answer) + '"]');
              return {retries: CS.currentLevel.retries, step: CS.currentLevel.step, miss: q.miss,
                      dead: q.dead[wi], wig: w.classList.contains('wig'), dim: w.classList.contains('dim'),
                      pe: getComputedStyle(w).pointerEvents,
                      breathe: ok.classList.contains('breathe')};
            }''', wi)
            # 已灰卡 hook 点击：again 早退零惩罚（§0.7 防御层，miss/retries 不变）
            st['again'] = page.evaluate('CS.tapCard(%d)' % wi)
            st['retries2'] = page.evaluate('CS.currentLevel.retries')
            check('%sfirst wrong: wig + dimmed + pointer-events none + dead flag + zero penalty + no pulse' % tag,
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and st['dead'] and
                  st['wig'] and st['dim'] and st['pe'] == 'none' and not st['breathe'], str(st))
            check('%sdimmed card hook tap -> again (zero penalty)' % tag,
                  st['again'] == 'again' and st['retries2'] == 1 and
                  page.evaluate('CS.quiz.miss') == 1, 'ret=%s retries2=%s' % (st['again'], st['retries2']))
            continue
        if on_quiz:
            on_quiz(q)
        click_card(page, q['options'].index(q['answer']))
        page.wait_for_timeout(1400)              # > 答对亮起 950ms 演出窗
        answered += 1
    page.wait_for_selector('.k-celebrate', timeout=15000)
    return answered


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
            ctx.add_init_script(MUTE_JS)
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
            check('chainsum specifics: op dist, d coverage, numCn+qSpeech, clips, opening chain',
                  dist['ok'] and dist['numCn'] and dist['speech'] and dist['clips'] and
                  dist['openQ'],
                  'op=%s gen=%s dMax=%s' % (dist['opDist'], dist['genOp'], dist['dMax']))
            check('28 cs_* clips injected (data:audio)',
                  pg.evaluate('Object.keys(KIDS.voice.clips).filter(k => k.indexOf("cs_") === 0).length') == 28,
                  str(pg.evaluate('Object.keys(KIDS.voice.clips)')))
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + lit + locked 窗 + 真实点击通关（2 星） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.CS && CS.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)             # 等开场链+入场动画落定再点击
            lv = pg.evaluate('CS.currentLevel')
            check('start at 1-0 (ch 1-based)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('CS.tutorial') == 'none')
            q = quiz_of(pg)
            exp = q['cur'] + q['d'] if q['op'] == '+' else q['cur'] - q['d']
            check('quiz hook contract {cur,op,d,answer,options,dead,step,miss}',
                  q and isinstance(q['cur'], int) and q['op'] in ('+', '-') and
                  isinstance(q['d'], int) and 1 <= q['d'] <= 2 and
                  q['answer'] == exp and
                  len(q['options']) == 3 and len(set(q['options'])) == 3 and
                  q['answer'] in q['options'] and 0 <= q['cur'] <= 10 and 0 <= q['answer'] <= 10 and
                  q['step'] == 0 and q['miss'] == 0, str(q))
            # 首错零惩罚 + 已灰卡 hook=again（均在 play_level 内断言）→ 通关
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('answered 5 quizzes by real click', n == 5, 'answered=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('CS.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_chainsum")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            # 新关第一题答对：演出窗内同步读 lit + 空车厢填数 + locked 窗内 hook 拦截
            q1 = quiz_of(pg)
            ai = q1['options'].index(q1['answer'])
            click_card(pg, ai)
            fs = pg.evaluate('''(ai) => {
              const c = document.querySelector('.cardbtn[data-i="' + ai + '"]');
              const slot = document.querySelectorAll('.carslot')[CS.currentLevel.step];
              return {lit: c.classList.contains('lit'), step: CS.currentLevel.step,
                      won: CS.currentLevel.won,
                      carFill: slot && slot.querySelector('.cv').textContent,
                      carLit: slot && slot.querySelector('.car').classList.contains('justlit')};
            }''', ai)
            check('correct tap -> card lit + car filled with answer inside 950ms show window',
                  fs['lit'] and fs['step'] == 1 and not fs['won'] and
                  fs['carFill'] == str(q1['answer']) and fs['carLit'], str(fs))
            locked_ret = pg.evaluate('CS.tapCard(0)')   # 演出窗内：locked 门拦 hook
            check('hook tap inside show window -> false (locked guard)', locked_ret is False,
                  'ret=%s' % locked_ret)
            pg.wait_for_timeout(1300)            # 演出窗收尾 → 下一题（尾部挂新空车厢）
            q2 = quiz_of(pg)
            grow = pg.evaluate('''() => ({cars: document.querySelectorAll('.carslot').length,
                tail: document.querySelector('.carslot.tail .cv') &&
                      document.querySelector('.carslot.tail .cv').textContent,
                sign: document.querySelector('.carslot.tail .opsign b') &&
                      document.querySelector('.carslot.tail .opsign b').textContent})''')
            check('next quiz: chain grows (3 cars, tail empty with new op sign)',
                  q2 and grow['cars'] == 3 and grow['tail'] == '?' and
                  grow['sign'] == q2['op'] + str(q2['d']) and q2['step'] == 1,
                  'cars=%s tail=%s sign=%s' % (grow['cars'], grow['tail'], grow['sign']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.CS && CS.currentLevel', timeout=8000)
            pg.wait_for_function("CS.tutorial === 'watch'", timeout=5000)
            swallowed_hook = pg.evaluate('CS.tapCard(0)') is False    # 演示期 hook 输入全吞
            qw0 = quiz_of(pg)
            click_card(pg, qw0['options'].index(qw0['answer']))   # 演示期真实点击也吞
            pg.wait_for_timeout(600)
            st = pg.evaluate('''() => ({step: CS.currentLevel.step, retries: CS.currentLevel.retries,
                                        tut: CS.tutorial})''')
            check('tutorial watch swallows input (real click + hook)',
                  swallowed_hook and st['step'] <= 1 and st['retries'] == 0 and
                  st['tut'] == 'watch', str(st))
            pg.wait_for_function("CS.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and
                  q['miss'] == 0, str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> correct card', ghost_shown)
            n = play_level(pg, tag='[2b] ')       # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_chainsum")'))
            check('cs.tutSeen persisted', (saved.get('cs') or {}).get('tutSeen') is True, str(saved.get('cs')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c1. flat10（ch3 大数字域）：链值∈[0,20] d∈[2,5] + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c1')
            pg.goto(URL)
            pg.wait_for_function('window.CS && CS.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)
            lv = pg.evaluate('CS.currentLevel')
            check('ch3 level start at flat=10', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            c3 = pg.evaluate('''() => {
              const qs = genLevel(10).quizzes;
              const ops = qs.map(q => q.op);
              let sw = 0;
              for (let k = 1; k < ops.length; k++) if (ops[k] !== ops[k - 1]) sw++;
              let chainOk = true, c = genLevel(10).s0;
              qs.forEach(q => { if (q.cur !== c) chainOk = false; c = q.answer; });
              return {dOk: qs.every(q => q.d >= 2 && q.d <= 5),
                      domOk: qs.every(q => q.cur >= 0 && q.cur <= 20 && q.answer >= 0 && q.answer <= 20),
                      both: ops.indexOf('+') >= 0 && ops.indexOf('-') >= 0, switches: sw,
                      chainOk: chainOk, s0: genLevel(10).s0};
            }''')
            check('ch3: d in [2,5], all chain values in [0,20], both ops, chain linked from s0',
                  c3['dOk'] and c3['domOk'] and c3['both'] and c3['chainOk'], str(c3))
            n = play_level(pg, tag='[2c1] ')
            check('ch3 real-click win (5 quizzes, TTS question sentences)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('CS.currentLevel')
            check('ch3 win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            ctx.close()

            # ---- 2c2. flat17（ch4 高频交替）：±各≥1 + 切换≥3 + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(17), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c2')
            pg.goto(URL)
            pg.wait_for_function('window.CS && CS.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)
            lv = pg.evaluate('CS.currentLevel')
            check('ch4 level start at flat=17', lv and lv['flat'] == 17 and lv['dch'] == 4, str(lv))
            c4 = pg.evaluate('''() => {
              const L = genLevel(17), qs = L.quizzes;
              const ops = qs.map(q => q.op);
              let sw = 0;
              for (let k = 1; k < ops.length; k++) if (ops[k] !== ops[k - 1]) sw++;
              return {ops: ops, switches: sw,
                      mix: ops.indexOf('+') >= 0 && ops.indexOf('-') >= 0,
                      dOk: qs.every(q => q.d >= 1 && q.d <= 6),
                      s0Ok: L.s0 >= 10 && L.s0 <= 15};
            }''')
            check('ch4: s0 in [10,15], d in [1,6], both ops, high alternation (switches>=3)',
                  c4['mix'] and c4['switches'] >= 3 and c4['dOk'] and c4['s0Ok'],
                  'ops=%s sw=%s' % (c4['ops'], c4['switches']))
            n = play_level(pg, tag='[2c2] ')
            check('ch4 real-click win (5 mixed quizzes)', n == 5, 'answered=%d' % n)
            ctx.close()

            # ---- 2d. 双 viewport：首题 2 节车 + 6 节车最宽链 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(17), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.CS && CS.currentLevel', timeout=8000)
                pg.wait_for_timeout(1000)        # 入场动画落定

                def vp_metrics():
                    return pg.evaluate('''() => {
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;
                        const r = e.getBoundingClientRect();
                        if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                          bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                      });
                      const cards = [...document.querySelectorAll('.cardbtn')];
                      const cr = cards.map(c => c.getBoundingClientRect());
                      const cMin = cr.length ? Math.round(Math.min(...cr.map(r => Math.min(r.width, r.height)))) : 0;
                      const slots = [...document.querySelectorAll('.carslot')].map(s => s.getBoundingClientRect());
                      const carMin = slots.length ? Math.round(Math.min(...slots.map(r => r.width))) : 0;
                      const sign = document.querySelector('.carslot.tail .opsign b');
                      const sr = sign ? sign.getBoundingClientRect() : null;
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad, cards: cards.length,
                              cMin: cMin, cars: slots.length, carMin: carMin,
                              signOk: !!sr && sr.width >= 36 && sr.height >= 22};
                    }''')

                m = vp_metrics()
                check('vp %dx%d 2-car state: ox==0 + 3 cards>=96 + buttons>=64 + car>=64w + sign visible' % vp,
                      m['ox'] == 0 and m['cards'] == 3 and m['cMin'] >= 96 and not m['bad'] and
                      m['cars'] == 2 and m['carMin'] >= 64 and m['signOk'],
                      'ox=%s cards=%s cMin=%s cars=%s carMin=%s sign=%s bad=%s' %
                      (m['ox'], m['cards'], m['cMin'], m['cars'], m['carMin'], m['signOk'], m['bad'][:3]))
                shot = SHOTS / ('chainsum-2car-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot 2-car %dx%d non-blank (stdev>10)' % vp, ok, detail)
                # 6 节车最宽链（推进 4 题）同 viewport 复测
                pg.evaluate('''() => {
                  for (let k = 0; k < 4; k++)
                    engTap(cur, cur.quizzes[k].options.indexOf(cur.quizzes[k].answer));
                  renderQuiz();
                }''')
                pg.wait_for_timeout(1000)
                m2 = vp_metrics()
                check('vp %dx%d 6-car widest chain: ox==0 + 6 cars>=64w + sign visible' % vp,
                      m2['ox'] == 0 and m2['cars'] == 6 and m2['carMin'] >= 64 and
                      m2['signOk'] and m2['cMin'] >= 96 and not m2['bad'],
                      'ox=%s cars=%s carMin=%s sign=%s' %
                      (m2['ox'], m2['cars'], m2['carMin'], m2['signOk']))
                shot2 = SHOTS / ('chainsum-6car-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot2))
                ok, detail = png_nonblank(shot2, floor=10.0)
                check('screenshot 6-car %dx%d non-blank (stdev>10)' % vp, ok, detail)
                ctx.close()

            # ---- 4. 救援钟（§0.7a/§0.21）：flat>=3 静置 14s+ 重读题面+正确卡视觉重现；
            #      11s 处错点不重置 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.CS && CS.currentLevel', timeout=8000)
            check('rescue scenario starts at flat=3 (>=3)', pg.evaluate('CS.currentLevel.flat') == 3)
            pg.wait_for_timeout(2500)            # 等开场链（queue 段链）落完再挂钩
            t0 = time.time()
            pg.evaluate('''() => {
              window.__vlog = [];
              window.__wrapT = performance.now();
              const wp = (name, fn) => function(a, b) {
                window.__vlog.push({n: name, k: a == null ? null : String(a), t: performance.now()});
                return fn.call(this, a, b);
              };
              KIDS.voice.play = wp('play', KIDS.voice.play);
              KIDS.voice.say = wp('say', KIDS.voice.say);
              KIDS.voice.queue = wp('queue', KIDS.voice.queue);
            }''')
            pg.wait_for_timeout(8000)            # 静置 8s → 错点一次（不该重置救援钟）
            qw = quiz_of(pg)
            wi = next(k for k, v in enumerate(qw['options']) if v != qw['answer'])
            click_card(pg, wi)
            pg.wait_for_timeout(1500)            # T0+9.5s：14s 阈值未到，救援不应响
            early = pg.evaluate('''() => window.__vlog
              .filter(e => e.t > window.__wrapT + 5000 && e.n === 'queue' &&
                e.k && e.k.split(',').indexOf('cs_tail') >= 0).length''')
            check('rescue not fired before 14s threshold', early == 0, 'early=%s' % early)
            pg.wait_for_timeout(6000)            # T0+15.5s：若错点(T0+8s)未重置 → 救援已在 ~14-15s 响
            rescue = pg.evaluate('''() => {
              const qs = window.__vlog.filter(e => e.t > window.__wrapT + 5000);
              const qk = qs.filter(e => e.n === 'queue' && e.k && e.k.split(',').indexOf('cs_tail') >= 0);
              const breathe = !!document.querySelector('.cardbtn.breathe');
              return {qk: qk.length, firstAt: qk.length ? qk[0].t - window.__wrapT : -1,
                      breathe: breathe, texts: qk.map(e => e.k).slice(0, 2)};
            }''')
            elapsed = time.time() - t0
            # 错点在 wrap 后 ~8s：若它重置救援钟，首次救援将落在 ~22s（此处 T0+15.5s 时仍为 0）
            check('rescue by idle 14s: re-read question TTS + correct card visual replay (wrong tap at +8s did NOT reset)',
                  rescue['qk'] >= 1 and rescue['firstAt'] <= 15500 and elapsed < 17 and
                  rescue['breathe'],
                  'qk=%s firstAt=%sms breathe=%s wall=%.1fs' %
                  (rescue['qk'], round(rescue['firstAt']), rescue['breathe'], elapsed))
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
