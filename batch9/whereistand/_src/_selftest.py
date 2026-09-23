# -*- coding: utf-8 -*-
"""whereistand _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 40 关审计全绿 + 专项分布
   （r33 谱=SPEC-R33：5 只互异/edge 首末位/ordinal 起点第 k 位/two 参照邻位/flip 镜像律/
     章型分布/ordinalCn·twoCn·flipCn 对账/WIS2 28 键/开场链 stub——SPEC-R33 §R8）
2a. 预置存档(跳过教学) → 真实 pointer：首错(晃动+不灰掉 pointer-events 保留+零惩罚+正确卡不 pulse)
    → 同卡二错(miss=2 → pulse 正确位) → 答对 lit(演出窗内) + locked 窗内 hook 拦截
    → 真实点击通关 → .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(真实点击+hook 全吞)→帮(幽灵手指)→独 真实链路 → wis.tutSeen 持久化
2c1. flat10（ch3 转个弯：3 two+2 ordinal，qi0 恒 ordinal）真实点击通关
     + two 公式独立复算（参照位±1、k∈2-4）+ two 题面行双箭头 DOM 取证
2c2. flat17（ch4 全都要：四型各 ≥1）真实点击通关 + flip 镜像律独立复算
     （横排它的左=屏幕右/竖排上下不镜像）+ flip 题面行参照头像 DOM 对账
2d. 双 viewport(1280x800/800x1180) 横排+竖排：overflowX==0、卡=主答案 ≥96、动物 SVG ≥64、
    触摸目标 ≥64（.k-parentbtn 豁免）、截图像素非空白（存 _shots/；横排=r33 谱内谓词定位）
3. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
4. 救援钟（§0.7a）：flat≥3 静置 14s+ 重读题面（flat3=dch1 qi0 恒 edge up→wis_q_* clip）；11s 处错点不重置
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
        'v': '1.0', 'game': 'whereistand', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'wis': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    # 静音纪律（T46 阶段2 2026-09-19）：规范 INIT_SND（原型级 play/pause no-op+5ms ended 派发）随种子注入
    _mute = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
             "speechSynthesis.cancel=function(){};}}catch(e){}"
             "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
             "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},5);"
             "return Promise.resolve();};p.pause=function(){};}catch(e){};")
    return _mute + 'localStorage.setItem("kidsgame_whereistand", ' + json.dumps(json.dumps(save)) + ')'


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
    return page.evaluate('WIS.quiz')


def play_level(page, first_wrong=False, tag='', on_quiz=None):
    """真实点击打完当前关：每题点正确位置（可先错一次）；on_quiz(q) 在答每题前回调"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = quiz_of(page)
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = (q['answerIdx'] + 1) % 5
            click_card(page, wi)
            page.wait_for_timeout(600)
            st = page.evaluate('''(wi) => {
              const q = WIS.quiz;
              const w = document.querySelector('.card[data-i="' + wi + '"]');
              const ok = document.querySelector('.card[data-i="' + q.answerIdx + '"]');
              return {retries: WIS.currentLevel.retries, step: WIS.currentLevel.step, miss: q.miss,
                      wig: w.classList.contains('wig'), dim: w.classList.contains('dim'),
                      pe: getComputedStyle(w).pointerEvents,
                      breathe: ok.classList.contains('breathe')};
            }''', wi)
            check('%sfirst wrong: wig + NOT dimmed + pointer-events kept + zero penalty + no pulse' % tag,
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and st['wig'] and
                  not st['dim'] and st['pe'] != 'none' and not st['breathe'], str(st))
            continue
        if on_quiz:
            on_quiz(q)
        click_card(page, q['answerIdx'])
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
            check('whereistand specifics: mode/dir dist, k coverage, ordinalCn, clips, opening chain',
                  dist['ok'] and dist['numCn'] and dist['clips'] and dist['openEdge'] and dist['openOrd'] and
                  all(k >= 1 for k in dist['kDist']),
                  'static=%s gen=%s k=%s' % (dist['staticDist'], dist['genMode'], dist['kDist']))
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + lit + locked 窗 + 真实点击通关（2 星） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.WIS && WIS.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)             # 等开场链+入场动画落定再点击
            lv = pg.evaluate('WIS.currentLevel')
            check('start at 1-0 (ch 1-based)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('WIS.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook contract {mode,dir,k,orient,line,answerIdx,answered}',
                  q and q['mode'] == 'edge' and q['dir'] in ('up', 'down') and q['k'] is None and
                  q['orient'] == 'vert' and len(q['line']) == 5 and len(set(q['line'])) == 5 and
                  q['answerIdx'] in (0, 4) and not q['answered'], str(q))
            # 首错零惩罚（play_level 内断言）→ 通关
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('answered 5 quizzes by real click', n == 5, 'answered=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('WIS.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_whereistand")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            # 新关第一题答对：演出窗内同步读 lit + locked 窗内 hook 拦截
            q1 = quiz_of(pg)
            click_card(pg, q1['answerIdx'])
            fs = pg.evaluate('''(ai) => {
              const c = document.querySelector('.card[data-i="' + ai + '"]');
              return {lit: c.classList.contains('lit'),
                      step: WIS.currentLevel.step, won: WIS.currentLevel.won};
            }''', q1['answerIdx'])
            check('correct tap -> card lit inside 950ms show window',
                  fs['lit'] and fs['step'] == 1 and not fs['won'], str(fs))
            locked_ret = pg.evaluate('WIS.tapSlot(0)')   # 演出窗内：locked 门拦 hook
            check('hook tap inside show window -> false (locked guard)', locked_ret is False,
                  'ret=%s' % locked_ret)
            pg.wait_for_timeout(1300)            # 演出窗收尾 → 下一题（新排列）
            q2 = quiz_of(pg)
            check('next quiz rendered (fresh line, unanswered)',
                  q2 and not q2['answered'] and len(set(q2['line'])) == 5, str(q2 and q2['line']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.WIS && WIS.currentLevel', timeout=8000)
            pg.wait_for_function("WIS.tutorial === 'watch'", timeout=5000)
            swallowed_hook = pg.evaluate('WIS.tapSlot(0)') is False    # 演示期 hook 输入全吞
            qw0 = quiz_of(pg)
            click_card(pg, qw0['answerIdx'])         # 演示期真实点击也吞
            pg.wait_for_timeout(600)
            st = pg.evaluate('''() => ({step: WIS.currentLevel.step, retries: WIS.currentLevel.retries,
                                        tut: WIS.tutorial})''')
            check('tutorial watch swallows input (real click + hook)',
                  swallowed_hook and st['step'] <= 1 and st['retries'] == 0 and
                  st['tut'] == 'watch', str(st))
            pg.wait_for_function("WIS.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and
                  not q['answered'], str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> correct animal', ghost_shown)
            n = play_level(pg, tag='[2b] ')       # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_whereistand")'))
            check('wis.tutSeen persisted', (saved.get('wis') or {}).get('tutSeen') is True, str(saved.get('wis')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c1. flat10（ch3 转个弯）：3 two+2 ordinal + two 公式复算 + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c1')
            pg.goto(URL)
            pg.wait_for_function('window.WIS && WIS.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)
            lv = pg.evaluate('WIS.currentLevel')
            check('ch3 level start at flat=10', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            c3 = pg.evaluate('''() => {
              const qs = genLevel(10).quizzes;
              const cnt = {edge: 0, ordinal: 0, two: 0, flip: 0};
              qs.forEach(q => cnt[q.mode]++);
              // two 公式独立字面复算（SPEC-R33 §R1：参照位=ordinal 公式，answer=起点侧邻/末点侧邻）
              let twoOk = qs.filter(q => q.mode === 'two').every(q => {
                const ref = (q.dir === 'up' || q.dir === 'left') ? q.k - 1 : 5 - q.k;
                const want = (q.dir2 === 'up' || q.dir2 === 'left') ? ref - 1 : ref + 1;
                return q.k >= 2 && q.k <= 4 && q.answerIdx === want &&
                  q.orient === (q.dir === 'left' || q.dir === 'right' ? 'horiz' : 'vert');
              });
              const ordOk = qs.filter(q => q.mode === 'ordinal').every(q =>
                q.k >= 1 && q.k <= 5 &&
                q.answerIdx === ((q.dir === 'up' || q.dir === 'left') ? q.k - 1 : 5 - q.k));
              return {cnt: cnt, twoOk: twoOk, ordOk: ordOk, modes: qs.map(q => q.mode)};
            }''')
            check('ch3: 3 two + 2 ordinal, two formula (ref+-1, k 2-4) + ordinal k-th from dir start',
                  c3['cnt']['two'] == 3 and c3['cnt']['ordinal'] == 2 and c3['cnt']['edge'] == 0 and
                  c3['cnt']['flip'] == 0 and c3['twoOk'] and c3['ordOk'], str(c3))
            two_chip_seen = []

            def on_quiz3(q):
                o = pg.evaluate('document.getElementById("line").className')
                if q['orient'] != o:
                    check('[2c1] DOM orient matches quiz', False, '%s vs %s' % (o, q['orient']))
                if q['mode'] == 'two':           # r33：two 题面行=双方向箭头+第k个
                    st = pg.evaluate('''() => {
                      const dirs = document.querySelectorAll('#prompt-chip .fdir').length;
                      const b = document.querySelector('#prompt-chip .fk b');
                      return {dirs: dirs, k: b ? b.textContent : ''};
                    }''')
                    if st['dirs'] == 2 and st['k'] == str(q['k']):
                        two_chip_seen.append(True)
                    else:
                        two_chip_seen.append(False)

            n = play_level(pg, tag='[2c1] ', on_quiz=on_quiz3)
            check('ch3 real-click win (5 quizzes: two-chain questions)', n == 5, 'answered=%d' % n)
            check('ch3 two-quiz chip shows 2 arrows + k', two_chip_seen and all(two_chip_seen),
                  'seen=%d' % len(two_chip_seen))
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('WIS.currentLevel')
            check('ch3 win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            ctx.close()

            # ---- 2c2. flat17（ch4 全都要）：四型各 ≥1 + flip 镜像律复算 + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(17), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c2')
            pg.goto(URL)
            pg.wait_for_function('window.WIS && WIS.currentLevel', timeout=8000)
            pg.wait_for_timeout(900)
            lv = pg.evaluate('WIS.currentLevel')
            check('ch4 level start at flat=17', lv and lv['flat'] == 17 and lv['dch'] == 4, str(lv))
            c4 = pg.evaluate('''() => {
              const qs = genLevel(17).quizzes;
              const m = qs.map(q => q.mode);
              // flip 镜像律独立字面复算（SPEC-R33 §R1：横排它的左=屏幕右；竖排上下不镜像）
              const flipOk = qs.filter(q => q.mode === 'flip').every(q => {
                const want = q.orient === 'horiz'
                  ? (q.dir2 === 'left' ? q.refIdx + 1 : q.refIdx - 1)
                  : (q.dir2 === 'up' ? q.refIdx - 1 : q.refIdx + 1);
                return q.refIdx >= 1 && q.refIdx <= 3 && q.answerIdx === want;
              });
              return {modes: m, flipOk: flipOk,
                      fourTypes: ['edge','ordinal','two','flip'].every(x => m.indexOf(x) >= 0)};
            }''')
            check('ch4: all four types + flip mirror law (horiz mirrored / vert not)',
                  c4['fourTypes'] and c4['flipOk'], str(c4['modes']) + ' flipOk=%s' % c4['flipOk'])
            flip_chip_seen = []

            def on_quiz4(q):
                if q['mode'] == 'flip':           # r33：flip 题面行=参照动物头像+双向箭头
                    st = pg.evaluate('''(q) => {
                      const fan = document.querySelector('#prompt-chip .fan svg');
                      return {a: fan ? fan.getAttribute('data-a') : null,
                              dirs: document.querySelectorAll('#prompt-chip .fdir').length};
                    }''', q)
                    if st['a'] == q['line'][q['refIdx']] and st['dirs'] == 1:
                        flip_chip_seen.append(True)
                    else:
                        flip_chip_seen.append(False)

            n = play_level(pg, tag='[2c2] ', on_quiz=on_quiz4)
            check('ch4 real-click win (5 mixed quizzes incl. flip)', n == 5, 'answered=%d' % n)
            check('ch4 flip chip shows reference animal face + mirror arrow',
                  flip_chip_seen and all(flip_chip_seen), 'seen=%d' % len(flip_chip_seen))
            ctx.close()

            # ---- 2d. 双 viewport：横排(flat7 谱内谓词定位)+竖排(flat0)：ox==0、卡>=96、SVG>=64、按钮>=64、截图 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(7), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.WIS && WIS.currentLevel', timeout=8000)
                pg.wait_for_timeout(1000)        # 入场动画落定
                # r33 谱：flat7=dch2，qi0=edge 但 dir 随机→朝向不恒定；跳到关内首个 horiz 题再量
                pg.evaluate("""() => {
                  const i = cur.quizzes.findIndex(q => q.orient === 'horiz');
                  if (i >= 0) { cur.step = i; renderQuiz(); }
                }""")
                pg.wait_for_timeout(1000)
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
                  const svgs = [...document.querySelectorAll('.card svg')].map(s => s.getBoundingClientRect());
                  const sMin = svgs.length ? Math.round(Math.min(...svgs.map(r => Math.min(r.width, r.height)))) : 0;
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad, cards: cards.length,
                          cMin: cMin, sMin: sMin, orient: document.getElementById('line').className};
                }''')
                check('vp %dx%d horiz overflowX==0 + cards>=96 + svg>=64 + buttons>=64' % vp,
                      m['ox'] == 0 and m['cards'] == 5 and m['cMin'] >= 96 and m['sMin'] >= 64 and
                      not m['bad'] and m['orient'] == 'horiz',
                      'ox=%s cards=%s cMin=%s sMin=%s bad=%s' %
                      (m['ox'], m['cards'], m['cMin'], m['sMin'], m['bad'][:3]))
                shot = SHOTS / ('whereistand-horiz-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot horiz %dx%d non-blank (stdev>10)' % vp, ok, detail)
                # 竖排（flat0 dch1 上下）同 viewport 复测
                pg.evaluate('startLevel(0)')
                pg.wait_for_timeout(1000)
                m2 = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const cards = [...document.querySelectorAll('.card')];
                  const cr = cards.map(c => c.getBoundingClientRect());
                  const svgs = [...document.querySelectorAll('.card svg')].map(s => s.getBoundingClientRect());
                  return {ox: de.scrollWidth - de.clientWidth, cards: cards.length,
                          cMin: cr.length ? Math.round(Math.min(...cr.map(r => Math.min(r.width, r.height)))) : 0,
                          sMin: svgs.length ? Math.round(Math.min(...svgs.map(r => Math.min(r.width, r.height)))) : 0,
                          orient: document.getElementById('line').className};
                }''')
                check('vp %dx%d vert overflowX==0 + cards>=96 + svg>=64' % vp,
                      m2['ox'] == 0 and m2['cards'] == 5 and m2['cMin'] >= 96 and m2['sMin'] >= 64 and
                      m2['orient'] == 'vert',
                      'ox=%s cards=%s cMin=%s sMin=%s' % (m2['ox'], m2['cards'], m2['cMin'], m2['sMin']))
                shot2 = SHOTS / ('whereistand-vert-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot2))
                ok, detail = png_nonblank(shot2, floor=10.0)
                check('screenshot vert %dx%d non-blank (stdev>10)' % vp, ok, detail)
                ctx.close()

            # ---- 4. 救援钟（§0.7a）：flat>=3 静置 14s+ 重读题面；11s 处错点不重置 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.WIS && WIS.currentLevel', timeout=8000)
            check('rescue scenario starts at flat=3 (>=3)', pg.evaluate('WIS.currentLevel.flat') == 3)
            pg.wait_for_timeout(2500)            # 等开场链（queue 两段 clip）落完再挂钩
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
            }''')
            pg.wait_for_timeout(8000)            # 静置 8s → 错点一次（不该重置救援钟）
            qw = quiz_of(pg)
            click_card(pg, (qw['answerIdx'] + 1) % 5)
            pg.wait_for_timeout(1500)            # T0+9.5s：14s 阈值未到，救援不应响
            early = pg.evaluate('''() => window.__vlog
              .filter(e => e.t > window.__wrapT + 5000 && e.n === 'play' &&
                (e.k === 'wis_q_up' || e.k === 'wis_q_down' || e.k === 'wis_q_left' || e.k === 'wis_q_right')).length''')
            check('rescue not fired before 14s threshold', early == 0, 'early=%s' % early)
            pg.wait_for_timeout(6000)            # T0+15.5s：若错点(T0+8s)未重置 → 救援已在 ~14-15s 响
            rescue = pg.evaluate('''() => {
              const qs = window.__vlog.filter(e => e.t > window.__wrapT + 5000);
              const qk = qs.filter(e => e.n === 'play' &&
                (e.k === 'wis_q_up' || e.k === 'wis_q_down' || e.k === 'wis_q_left' || e.k === 'wis_q_right'));
              return {qk: qk.length, firstAt: qk.length ? qk[0].t - window.__wrapT : -1};
            }''')
            elapsed = time.time() - t0
            # 错点在 wrap 后 ~8s：若它重置救援钟，首次救援将落在 ~22s（此处 T0+15.5s 时仍为 0）
            check('rescue fired by idle 14s+ (wrong tap at +8s did NOT reset clock)',
                  rescue['qk'] >= 1 and rescue['firstAt'] <= 15500 and elapsed < 17,
                  'qk=%s firstAt=%sms wall=%.1fs' % (rescue['qk'], round(rescue['firstAt']), elapsed))
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
