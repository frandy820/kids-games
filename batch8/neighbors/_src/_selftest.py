# -*- coding: utf-8 -*-
"""neighbors _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 40 关审计全绿 + 专项分布
   （跨十 19→20/10→9 各 ≥1、ch1 全 plus/ch2 全 minus/ch4 三型、numCn 1-20 对账）
2a. 预置存档(跳过教学) → 真实 pointer：首错(晃动+灰掉 pointer-events:none+零惩罚+正确牌不 pulse)
    → 答对(空房挂上号+亮灯+小动物) → 真实点击通关 → .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(真实点击+hook 全吞)→帮(幽灵手指)→独 真实链路 → neb.tutSeen 持久化
2c. flat12（dch3 大数字+跨十）：街道 8-20 十三房、19→20 与 10→9 专项在场、±2 题在场+
    盲牌 DOM（牌面 '·' 恒不泄号）、真实点击通关
2d. flat17（dch4）：mid 题空房居中+两侧锚点房 .ref 恒亮+dual 两步题在场+盲牌+答对两跳
    演出（__dualJumpN）、真实点击通关
2d2. flat15（dch4）：dual miss≥2 支架演示真实链——连错 2 次=pulse+650ms 后街道两跳演示
    （dualB 藏牌 s=揭示→复盲 / dualA 亮牌 s=仅 reveal 高亮恒真数字，r31 修复 M1）+
    演示不刷救援钟（静置 12s 判别窗内重读题面可达——窗口取 T∈(10.5,14)s：守约演示后
    ~9s 触发被捕获 / 违约（演示收尾刷钟）14s 阈值落窗后不触发即红，r31 修复 M3）+
    演示后答对通关
3. 双 viewport(1280x800/800x1180)：overflowX==0、触摸目标 ≥64（.k-parentbtn 豁免）、
    候选门牌 ≥96、空房恰 1 且=?、问号旗可见、截图像素非空白（存 _shots/）
4. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
5. 救援钟（§0.7a）：flat≥3 静置 14s+ 重读题面（数词+neb_q* clip）；11s 处错点不重置
   （错点后救援仍在 ~14s 而非 ~25s 触发）
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
        'v': '1.0', 'game': 'neighbors', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        # 静音纪律（T46 阶段2 2026-09-19）：种档 sound:false+tts:true——语音路径全开供断言、不外放
        'settings': {'sound': False, 'tts': True, 'vol': 0.0},
        'restTip': {'day': '', 'shown': 0},
        'neb': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_neighbors", ' + json.dumps(json.dumps(save)) + ')'


# 规范静音模板（r31 修复轮换 batch6/words/_src/_selftest.py 定稿 MUTE_INIT L28 function 版
# ——r19 测试外放事故双保险定稿：HTMLMediaElement.muted 锁 true+Audio.play 即 ended
# +AudioContext 假 ctx；先于一切页面 JS 挂载）
MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed',
  resume:function(){},
  createOscillator:function(){ return {
    connect:function(){ return { connect:function(){} }; },
    start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  createGain:function(){ return {
    connect:function(){},
    gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  destination:{}, currentTime:0, sampleRate:44100
}; };"""


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


def click_plate(page, i):
    loc = page.locator('.platebtn[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def quiz_of(page):
    return page.evaluate('NEB.quiz')


def play_level(page, first_wrong=False, tag='', on_quiz=None):
    """真实点击打完当前关：每题点正确门牌（可先错一次）；on_quiz(q) 在答每题前回调（mid DOM 断言用）"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = quiz_of(page)
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = next(k for k, v in enumerate(q['options']) if v != q['answer'])
            click_plate(page, wi)
            page.wait_for_timeout(600)
            st = page.evaluate('''() => {
              const q = NEB.quiz;
              const w = document.querySelector('.platebtn[data-i="%d"]');
              const ok = document.querySelector('.platebtn[data-i="%d"]');
              return {retries: NEB.currentLevel.retries, step: NEB.currentLevel.step, miss: q.miss,
                      dim: w.classList.contains('dim'),
                      pe: getComputedStyle(w).pointerEvents,
                      wig: w.classList.contains('wig'),
                      breathe: ok.classList.contains('breathe')};
            }''' % (wi, q['options'].index(q['answer'])))
            check('%sfirst wrong: dim + pointer-events:none + zero penalty + no pulse' % tag,
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and st['dim'] and
                  st['pe'] == 'none' and st['wig'] and not st['breathe'], str(st))
            continue
        if on_quiz:
            on_quiz(q)
        click_plate(page, q['options'].index(q['answer']))
        page.wait_for_timeout(1400)              # > 填房亮灯 950ms 演出窗
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
            ctx.add_init_script(MUTE_INIT)
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
                  str(vj['smokes']['layout']['sims']))
            check('verify 40-level audit all ok',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify units all ok', all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            dist = vj['units']['dist']
            check('neighbors specifics: cross-ten 19->20 & 10->9 each >=1, mode dist, numCn',
                  dist['ok'] and dist['crossUp'] >= 1 and dist['crossDown'] >= 1 and dist['numCn'],
                  'crossUp=%s crossDown=%s numCn=%s' % (dist['crossUp'], dist['crossDown'], dist['numCn']))
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + 填房亮灯 + 真实点击通关（2 星） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.NEB && NEB.currentLevel', timeout=8000)
            lv = pg.evaluate('NEB.currentLevel')
            check('start at 1-0 (ch 1-based)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('NEB.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook contract {mode,n,answer,options,filled}',
                  q and q['mode'] == 'plus' and q['answer'] == q['n'] + 1 and
                  len(q['options']) == 3 and len(set(q['options'])) == 3 and not q['filled'], str(q))
            empty = pg.evaluate('''() => {
              const q = NEB.quiz, h = document.querySelector('.house[data-n="' + q.answer + '"]');
              return {empty: !!h && h.classList.contains('empty'),
                      plate: h ? h.querySelector('.plate').textContent : '',
                      flag: h ? !!h.querySelector('.qflag') : false,
                      houses: document.querySelectorAll('.house').length};
            }''')
            check('empty house: ? plate + question flag, street has 10 houses',
                  empty['empty'] and empty['plate'] == '?' and empty['flag'] and empty['houses'] == 10,
                  str(empty))
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('answered 5 quizzes by real click', n == 5, 'answered=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('NEB.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_neighbors")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            # 单独验证填房亮灯链路（新关第一题答对即断言；fill 演出窗 950ms 内查 DOM）
            q1 = quiz_of(pg)
            a1 = q1['answer']
            click_plate(pg, q1['options'].index(a1))
            fs = pg.evaluate('''(a) => {
              const h = document.querySelector('.house[data-n="' + a + '"]');
              return {filled: h.classList.contains('filled'), empty: h.classList.contains('empty'),
                      plate: h.querySelector('.plate').textContent,
                      animal: !!h.querySelector('.win svg'),
                      glow: getComputedStyle(h.querySelector('.win')).boxShadow !== 'none'};
            }''', a1)
            check('correct tap -> house filled: plate number + animal in window + window lit',
                  fs['filled'] and not fs['empty'] and fs['plate'] == str(a1) and fs['animal'] and
                  fs['glow'], str(fs))
            pg.wait_for_timeout(1300)            # 演出窗收尾 → 下一题（挂上的门牌号永久保留）
            perm = pg.evaluate('(a) => document.querySelector(".house[data-n=\\"" + a + "\\"] .plate").textContent', a1)
            check('filled plate number persists after re-render', perm == str(a1), 'plate=%s' % perm)
            # 已灰门牌 hook 点击 = 'again' 零惩罚（沿用本关：先点一张错的再点它）
            qw = quiz_of(pg)
            if qw:
                wi = next(k for k, v in enumerate(qw['options']) if v != qw['answer'])
                click_plate(pg, wi)
                pg.wait_for_timeout(500)
                again = pg.evaluate('NEB.tapOption(%d)' % wi)
                lv3 = pg.evaluate('NEB.currentLevel')
                check('tap dimmed plate -> again (zero penalty)',
                      again == 'again' and lv3['retries'] == 1 and lv3['step'] == qw['step'],
                      'r=%s' % again)
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.NEB && NEB.currentLevel', timeout=8000)
            pg.wait_for_function("NEB.tutorial === 'watch'", timeout=5000)
            swallowed_hook = pg.evaluate('NEB.tapOption(0)') is False    # 演示期 hook 输入全吞
            qw0 = quiz_of(pg)
            click_plate(pg, qw0['options'].index(qw0['answer']))         # 演示期真实点击也吞
            pg.wait_for_timeout(700)
            st = pg.evaluate('''() => ({step: NEB.currentLevel.step, retries: NEB.currentLevel.retries,
                                        tut: NEB.tutorial})''')
            check('tutorial watch swallows input (real click + hook)',
                  swallowed_hook and st['step'] == 0 and st['retries'] == 0 and st['tut'] == 'watch', str(st))
            pg.wait_for_function("NEB.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and not q['filled'], str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> correct plate', ghost_shown)
            n = play_level(pg, tag='[2b] ')       # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_neighbors")'))
            check('neb.tutSeen persisted', (saved.get('neb') or {}).get('tutSeen') is True, str(saved.get('neb')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. flat12（dch3 大数字+跨十+±2+盲牌）：街道 8-20 + 专项在场 + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(12), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.NEB && NEB.currentLevel', timeout=8000)
            lv = pg.evaluate('NEB.currentLevel')
            check('dch3 level start at flat=12', lv and lv['flat'] == 12 and lv['dch'] == 3, str(lv))
            c3 = pg.evaluate('''() => {
              const qs = genLevel(12).quizzes;
              const nums = [...document.querySelectorAll('.house')].map(h => +h.dataset.n);
              const q = NEB.quiz;
              const bl = [...document.querySelectorAll('.house.blind')];
              return {up: qs.filter(q => q.mode === 'plus' && q.n === 19).length,
                      down: qs.filter(q => q.mode === 'minus' && q.n === 10).length,
                      pm2: qs.filter(q => q.mode === 'plus2' || q.mode === 'minus2').length,
                      nums: nums, modes: qs.map(q => q.mode),
                      allN: qs.every(q => q.n >= 10 && q.n <= 19),
                      blindN: bl.length, qHidden: q.hidden.length,
                      blindOk: bl.every(h => h.querySelector('.plate').textContent === '\\u00b7' &&
                        q.hidden.includes(+h.dataset.n))};
            }''')
            check('dch3: street 8-20 (13 houses), big numbers 10-19',
                  c3['nums'] == list(range(8, 21)) and c3['allN'], str(c3['nums']))
            check('dch3: cross-ten specials 19->20 & 10->9 each >=1 per level',
                  c3['up'] >= 1 and c3['down'] >= 1 and 'plus' in c3['modes'] and 'minus' in c3['modes'],
                  'up=%s down=%s' % (c3['up'], c3['down']))
            check('dch3 r31: exactly 1 plus2/minus2 quiz per level',
                  c3['pm2'] == 1, 'pm2=%s modes=%s' % (c3['pm2'], c3['modes']))
            check('dch3 r31: blind plates = hidden count, plate text = dot (no number leak)',
                  c3['blindN'] == c3['qHidden'] and c3['blindOk'],
                  'blind=%s hidden=%s ok=%s' % (c3['blindN'], c3['qHidden'], c3['blindOk']))
            n = play_level(pg, tag='[2c] ')
            check('dch3 real-click win (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('NEB.currentLevel')
            check('dch3 win proceeds to flat=13', lv2 and lv2['flat'] == 13, str(lv2))
            ctx.close()

            # ---- 2d. flat17（dch4 五槽）：mid 空房居中+refs+dual 两步+盲牌+两跳演出+真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(17), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.NEB && NEB.currentLevel', timeout=8000)
            lv = pg.evaluate('NEB.currentLevel')
            check('dch4 level start at flat=17', lv and lv['flat'] == 17 and lv['dch'] == 4, str(lv))
            modes17 = pg.evaluate('genLevel(17).quizzes.map(q => q.mode)')
            check('dch4 r31: plus/minus/mid each >=1 + X-family + dual at qi4',
                  all(m in modes17 for m in ('plus', 'minus', 'mid')) and
                  modes17[4] in ('dualA', 'dualB') and
                  any(m in modes17 for m in ('plus2', 'minus2', 'mid4')), str(modes17))
            jump0 = pg.evaluate('window.__dualJumpN')

            def on_quiz(q):
                dom = pg.evaluate('''() => {
                    const q = NEB.quiz;
                    const bl = [...document.querySelectorAll('.house.blind')];
                    return {blindN: bl.length, qHidden: q.hidden.length,
                            blindOk: bl.every(h => h.querySelector('.plate').textContent === '\\u00b7' &&
                              q.hidden.includes(+h.dataset.n)),
                            sBlind: (q.s === undefined) ? true :
                              ((q.hidden.includes(q.s)) ?
                                (document.querySelector('.house[data-n="' + q.s + '"] .plate').textContent === '\\u00b7') : true),
                            answerS: q.answer,
                            sS: q.s};
                }''')
                check('[2d] blind plates = hidden count + plate dot + dualB s-blind (per %s)' % q['mode'],
                      dom['blindN'] == dom['qHidden'] and dom['blindOk'] and dom['sBlind'],
                      str(dom))
                if q['mode'] == 'mid':
                    mid_dom = pg.evaluate('''() => {
                        const q = NEB.quiz;
                        const e = document.querySelector('.house[data-n="' + q.answer + '"]');
                        const l = document.querySelector('.house[data-n="' + q.n + '"]');
                        const r = document.querySelector('.house[data-n="' + (q.n + 2) + '"]');
                        return {midOk: q.answer === q.n + 1,
                                emptyRef: e && e.classList.contains('empty'),
                                lp: l ? l.querySelector('.plate').textContent : '',
                                rp: r ? r.querySelector('.plate').textContent : '',
                                lref: l ? l.classList.contains('ref') : false,
                                rref: r ? r.classList.contains('ref') : false};
                    }''')
                    check('mid quiz: empty in middle, both anchor houses lit .ref',
                          mid_dom['midOk'] and mid_dom['emptyRef'] and
                          mid_dom['lp'] == str(q['n']) and mid_dom['rp'] == str(q['n'] + 2) and
                          mid_dom['lref'] and mid_dom['rref'], str(mid_dom))
                if q['mode'] == 'dualA' or q['mode'] == 'dualB':
                    # dual 题面自洽：s=第一步（A:n+1/B:n+2）、answer=A:n-1/B:n+1、s 在候选中
                    s_expect = q['n'] + 1 if q['mode'] == 'dualA' else q['n'] + 2
                    a_expect = q['n'] - 1 if q['mode'] == 'dualA' else q['n'] + 1
                    check('[2d] dual formula: s and answer + s in options (diagnostic distractor)',
                          q['s'] == s_expect and q['answer'] == a_expect and q['s'] in q['options'],
                          str(q))
            n = play_level(pg, tag='[2d] ', on_quiz=on_quiz)
            check('dch4 real-click win (5 quizzes incl mid+dual)', n == 5, 'answered=%d' % n)
            jn = pg.evaluate('window.__dualJumpN')
            check('[2d] dual correct tap -> two-jump show (__dualJumpN incremented)',
                  jn > jump0, 'jump %s -> %s' % (jump0, jn))
            # dualB 关末（qi4=末题）winFlow 不重建街：s 牌两跳演出揭示后必须复盲（防残留）
            sback = pg.evaluate('''() => {
                const q = genLevel(17).quizzes[4];
                const sH = document.querySelector('.house[data-n="' + q.s + '"]');
                return {mode: q.mode, s: q.s, hidden: q.hidden,
                        plate: sH ? sH.querySelector('.plate').textContent : 'gone'};
            }''')
            s_should_blind = sback['s'] in sback['hidden']
            check('[2d] dual s plate after win show: dualB re-blinded / dualA stays lit (M1)',
                  (sback['plate'] == chr(183)) if s_should_blind else (sback['plate'] == str(sback['s'])),
                  str(sback))
            ctx.close()

            # ---- 2d2. flat15（dch4）：dual miss≥2 支架演示链（pulse+两跳演示+s 揭示→复盲+keepIdle+通关） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d2')
            pg.goto(URL)
            pg.wait_for_function('window.NEB && NEB.currentLevel', timeout=8000)
            lv = pg.evaluate('NEB.currentLevel')
            check('[2d2] start at flat=15 (dch4)', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            # 逐题真实点击答对推进到 qi4=dual（真实页 SPEED=1）
            for s in range(4):
                q = quiz_of(pg)
                check('[2d2] quiz %d of flat15 answered' % s, q is not None, str(q)[:80])
                if not q:
                    break
                click_plate(pg, q['options'].index(q['answer']))
                pg.wait_for_timeout(1400)
            qd = quiz_of(pg)
            check('[2d2] reached dual quiz at qi4', qd and qd['mode'] in ('dualA', 'dualB'), str(qd)[:120])
            j0 = pg.evaluate('window.__dualJumpN')
            # 连错 2 次（两张错牌各点一次，真实点击）
            wrongs = [i for i, v in enumerate(qd['options']) if v != qd['answer']]
            click_plate(pg, wrongs[0]); pg.wait_for_timeout(600)
            click_plate(pg, wrongs[1]); pg.wait_for_timeout(400)
            st2 = pg.evaluate('''() => {
                const q = NEB.quiz;
                const ok = document.querySelector('.platebtn[data-i="' + q.options.indexOf(q.answer) + '"]');
                return {miss: q.miss, retries: NEB.currentLevel.retries, pulse: ok.classList.contains('breathe')};
            }''')
            check('[2d2] dual two wrongs -> miss=2 + pulse correct plate',
                  st2['miss'] == 2 and st2['retries'] == 2 and st2['pulse'], str(st2))
            pg.wait_for_timeout(1150)            # 演示中单点检查：锚=错#2 后 400ms+eval，落 ~1600ms 在 s 揭示窗 [1070,1890] 内
                                                   # r31③：原 1300 落 ~1750ms 距 1890 复盲仅 ~190ms，慢环境过冲假红；1150 尾余量 ~290ms
            demo = pg.evaluate('''() => {
                const q = NEB.quiz;
                const sH = document.querySelector('.house[data-n="' + q.s + '"]');
                return {jn: window.__dualJumpN, j0: window.__j0,
                        sPlate: sH ? sH.querySelector('.plate').textContent : '',
                        sReveal: sH ? sH.classList.contains('reveal') : false};
            }''')
            check('[2d2] demo fired: __dualJumpN incremented + s reveal + s plate shows s',
                  demo['jn'] > j0 and demo['sReveal'] and demo['sPlate'] == str(qd['s']),
                  'jn=%s (was %s) sPlate=%s reveal=%s' % (demo['jn'], j0, demo['sPlate'], demo['sReveal']))
            pg.wait_for_timeout(1200)            # 演示收尾（820ms 段）→ dualB 复盲 / dualA 恒亮
            rb = pg.evaluate('''() => {
                const q = NEB.quiz;
                const sH = document.querySelector('.house[data-n="' + q.s + '"]');
                return {sPlate: sH ? sH.querySelector('.plate').textContent : '',
                        sHidden: q.hidden.includes(q.s)};
            }''')
            check('[2d2] s plate after demo: dualB re-blinded / dualA stays lit (M1)',
                  (rb['sPlate'] == chr(183)) if rb['sHidden'] else (rb['sPlate'] == str(qd['s'])), str(rb))
            # keepIdle 证据（r24 M1 同型）：演示完成段不刷救援钟——静置 12s 判别窗内重读题面可达。
            # 判别窗推演（r31 修复 M3，原 16.5s 静置守约/违约皆绿=无判别力）：lastAct 末次刷新
            # =第 4 题答对（T0）；演示收尾 ≈T0+4.0s；本 hook 挂载 ≈T0+5.0s。守约（演示零 lastAct
            # 写入）→救援在 T0+14~15s=挂后 ~9s 触发→12s 窗内捕获 n≥1 绿；违约（演示收尾刷钟）
            # →救援在 T0+18~19s=挂后 ~13.5s>12s 窗→n=0 红。窗口安全边界=挂后 (10.5, 14)s 取 12s。
            # r31 修复 m2：53 键已全注册嵌入，playChain keys.every 恒真走 queue 真链——
            # 断言锁 queue 通道（Q: 段链含 neb_q* 句式键），say 兜底退役转正锁
            pg.evaluate('''() => {
                window.__vlog = [];
                const _q = KIDS.voice.queue.bind(KIDS.voice);
                KIDS.voice.queue = (a) => { window.__vlog.push('Q:' + a.join(',')); return _q(a); };
            }''')
            pg.wait_for_timeout(12000)
            rescue = pg.evaluate('''() => {
                const qk = window.__vlog.filter(x => x.startsWith('Q:') &&
                    x.split(',').some(p => p === 'neb_q1' || p === 'neb_q2' || p === 'neb_q4' ||
                                           p === 'neb_qp2' || p === 'neb_qm2' ||
                                           p === 'neb_dual_a' || p === 'neb_dual_b'));
                return {n: qk.length, chains: qk.slice(0, 2)};
            }''')
            check('[2d2] rescue reachable after demo within 12s window (keepIdle, queue channel)',
                  rescue['n'] >= 1, str(rescue))
            # 演示后答对通关（真实点击；两跳演出再演一次）
            click_plate(pg, qd['options'].index(qd['answer']))
            pg.wait_for_timeout(2600)            # dual 1790ms 演出窗+余量
            fin = pg.evaluate('''() => ({done: NEB.currentLevel.done, won: NEB.currentLevel.won,
                                         retries: NEB.currentLevel.retries, jn: window.__dualJumpN})''')
            check('[2d2] answer correct after demo -> level done (retries=2 -> 2 stars)',
                  fin['done'] and fin['won'] and fin['retries'] == 2 and fin['jn'] > demo['jn'], str(fin))
            ctx.close()

            # ---- 3. 双 viewport：overflowX==0、触摸目标 ≥64、候选 ≥96、空房/问号旗、截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                ctx.add_init_script(MUTE_INIT)
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(17), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.NEB && NEB.currentLevel', timeout=8000)
                pg.wait_for_timeout(900)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const plates = [...document.querySelectorAll('.platebtn')].map(b => b.getBoundingClientRect());
                  const pMin = plates.length ? Math.round(Math.min(...plates.map(r => Math.min(r.width, r.height)))) : 0;
                  const houses = [...document.querySelectorAll('.house')];
                  const hMin = houses.length ? Math.round(Math.min(...houses.map(h => {
                    const r = h.getBoundingClientRect(); return Math.min(r.width, r.height);
                  }))) : 0;
                  const eq = document.querySelectorAll('.house.empty').length;
                  const flag = document.querySelector('.house.empty .qflag');
                  const fr = flag ? flag.getBoundingClientRect() : null;
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad, plates: plates.length,
                          pMin: pMin, houses: houses.length, hMin: hMin,
                          empty: eq, flagOk: !!fr && fr.width >= 12 && fr.height >= 14};
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64 (buttons, parent exempt)' % vp, not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d 3 plates >=96 + empty house=? with flag + 20 houses' % vp,
                      m['plates'] == 3 and m['pMin'] >= 96 and m['empty'] == 1 and m['flagOk'] and
                      m['houses'] == 20, 'plates=%s pMin=%s empty=%s flag=%s houses=%s' %
                      (m['plates'], m['pMin'], m['empty'], m['flagOk'], m['houses']))
                shot = SHOTS / ('neighbors-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d non-blank (stdev>10), kept in _shots' % vp, ok, detail)
                ctx.close()

            # ---- 5. 救援钟（§0.7a）：flat>=3 静置 14s+ 重读题面；11s 处错点不重置 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.NEB && NEB.currentLevel', timeout=8000)
            check('rescue scenario starts at flat=3 (>=3)', pg.evaluate('NEB.currentLevel.flat') == 3)
            pg.wait_for_timeout(2500)            # 等开题链（queue 段链）落完再挂钩
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
            click_plate(pg, wi)
            pg.wait_for_timeout(1500)            # T0+9.5s：14s 阈值未到，救援不应响
            early = pg.evaluate('''() => window.__vlog
              .filter(e => e.t > window.__wrapT + 5000 && e.n === 'queue' && e.k &&
                e.k.split(',').some(p => p === 'neb_q1' || p === 'neb_q2' || p === 'neb_q4')).length''')
            check('rescue not fired before 14s threshold', early == 0, 'early=%s' % early)
            pg.wait_for_timeout(6000)            # T0+15.5s：若错点(T0+8s)未重置 → 救援已在 ~14-15s 响
            rescue = pg.evaluate('''() => {
              const qs = window.__vlog.filter(e => e.t > window.__wrapT + 5000);
              const qk = qs.filter(e => e.n === 'queue' && e.k &&
                e.k.split(',').some(p => p === 'neb_q1' || p === 'neb_q2' || p === 'neb_q4'));
              return {qk: qk.length, firstAt: qk.length ? qk[0].t - window.__wrapT : -1,
                      says: qk.map(e => e.k).slice(0, 3)};
            }''')
            elapsed = time.time() - t0
            # 错点在 wrap 后 ~8s：若它重置救援钟，首次救援将落在 ~22s（此处 T0+15.5s 时仍为 0）
            # T46 阶段2：重读题面=queue 段链 [neb_n_n|neb_mid_n, neb_q*]（数词段在链内，SPEC 推导）
            check('rescue fired by idle 14s+ (wrong tap at +8s did NOT reset clock)',
                  rescue['qk'] >= 1 and rescue['firstAt'] <= 15500 and elapsed < 17,
                  'qk=%s firstAt=%sms chains=%s wall=%.1fs' %
                  (rescue['qk'], round(rescue['firstAt']), rescue['says'], elapsed))
            ctx.close()
        finally:
            browser.close()

    # ---- 4. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
