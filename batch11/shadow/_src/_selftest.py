# -*- coding: utf-8 -*-
"""shadow _selftest（r8 难度改造版）— headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 40 关审计全绿 + 专项单元全绿
   （r8：时长模型 minMs≥40000 + 决策步≥13 + nextHint 独立副本 + 多物/重叠/遮蔽单元）
2a. 预置存档(跳过教学) → 真实 pointer：首错(晃动+灰掉 pointer-events:none+零惩罚+应点卡不 pulse)
    → 真实点击通关 5 题（multi 逐物连对）→ .k-celebrate 2星 → 等 5.2s → 存档 levels['1-0'].stars>=1 → 推进 flat=1
2b. 全新存档 → 教学 看(真实点击+hook 全吞+轻叮 sfx('pop'))→帮(幽灵手指)→独 真实链路
    → sha.tutSeen 持久化 → 1-0 写档
2c. flat5（第 6 关·章 2 旋转）：qi0 热身零旋转四卡 → 真实点击通关（含旋转题）→ 存档 levels['2-0'].stars>=1
2d. flat15（第 16 关·章 4）：qi1 起重叠双选+混排（遮蔽+旋转）真实点击通关
2e. 双 viewport(1280x800/800x1180)：overflowX==0、剪影卡=主答案 ≥96、全按钮 ≥64
    （.k-parentbtn 豁免）、遮蔽层几何（若在场 70%±10%）、截图像素非空白（存 _shots/）
3. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
4. 救援钟（§0.7a/§0.21）：flat≥3 静置 14s+ 重读题面(TTS 整句)+当前应点剪影 breathe 循环；
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


def safe(s):                                   # GBK 控制台打不出中文/emoji → ASCII 转义后再打印
    return str(s).encode('ascii', 'backslashreplace').decode('ascii')


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', safe(name), ('| ' + safe(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'shadow', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'sha': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_shadow", ' + json.dumps(json.dumps(save)) + ')'


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
    return page.evaluate('SH.quiz')


def play_quiz(page, tag=''):
    """真实点击答完当前一题（r8 multi=逐物连对至换题 / overlap=双选两步）；返回本题 tap 数"""
    st0 = page.evaluate('SH.currentLevel.step')
    taps = 0
    while taps < 12:
        q = quiz_of(page)
        if q is None:
            return taps
        click_card(page, q['answerIdx'])
        page.wait_for_timeout(1750)              # > 连对 620+700 / 题完成 620+430+renderQuiz
        taps += 1
        now = page.evaluate('SH.currentLevel')
        if now['done']:
            return taps
        if now['step'] != st0:
            page.wait_for_timeout(400)           # 等 renderQuiz 换题落地（防外层读到旧 DOM）
            return taps
    raise AssertionError('[%s] play_quiz over 12 taps without advance' % tag)


def play_level(page, first_wrong=False, tag=''):
    """真实点击打完当前关：每题逐物连对（可先整关错一次干扰卡）"""
    wrong_done = not first_wrong
    quizzes = 0
    while quizzes < 30:
        q = quiz_of(page)
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = next(i for i, v in enumerate(q['options']) if v not in q['targets'])  # 干扰卡（r8：错它才灰）
            click_card(page, wi)
            page.wait_for_timeout(700)           # 晃动 480ms 演出窗
            st = page.evaluate('''(wi) => {
              const q = SH.quiz;
              const w = document.querySelector('.card[data-i="' + wi + '"]');
              const ok = document.querySelector('.card[data-i="' + q.answerIdx + '"]');
              return {retries: SH.currentLevel.retries, step: SH.currentLevel.step, miss: q.miss,
                      dead: q.dead, wig: w.classList.contains('wig'), dim: w.classList.contains('dim'),
                      pe: getComputedStyle(w).pointerEvents,
                      breathe: ok.classList.contains('breathe')};
            }''', wi)
            check('%sfirst wrong: wig + dimmed + pointer-events none + zero penalty + no pulse' % tag,
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and
                  st['dead'] == [wi] and st['wig'] and st['dim'] and st['pe'] == 'none' and
                  not st['breathe'], str(st))
            continue
        play_quiz(page, tag=tag)
        quizzes += 1
    page.wait_for_selector('.k-celebrate', timeout=30000)
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
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=30000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify 40-level audit all ok',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify units all ok', all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str([s for s in vj['smokes']['layout']['sims'] if not s['pass']]))
            dist = vj['units']['dist']
            check('shadow specifics: lib ref 15, speech+pair, new clips x5, estMs, opening chain, nextHint, gen dch + coverage',
                  dist['ok'] and dist['libRef'] and dist['speech'] and dist['clips'] and dist['estMs'] and
                  dist['openHint'] and dist['openQ'] and dist['nextHint'] and
                  all(v >= 1 for v in dist['genDch'].values()) and
                  all(v >= 1 for v in dist['rotCov'].values()) and
                  all(v >= 1 for v in dist['libDist'].values()),
                  'genDch=%s rotCov=%s libDist0=%s' % (dist['genDch'], dist['rotCov'],
                                                        {k: v for k, v in dist['libDist'].items() if v == 0}))
            dm = vj['units']['durModel']
            check('r8 time model: 40-level minMs>=40000 & minSteps>=13',
                  dm['ok'] and dm['minMs'] >= 40000 and dm['minSteps'] >= 13, str(dm))
            tc = vj['units']['tutChain']
            check('verify tutorial chain unit (watch->turn->quiz relay)', tc['ok'], str(tc)[:160])
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + 真实点击通关（2 星）+ 写档 + 推进 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.SH && SH.currentLevel', timeout=8000)
            pg.wait_for_timeout(2500)            # 等开场链（hint clip + 2000ms 接力题面）落定
            lv = pg.evaluate('SH.currentLevel')
            check('start at 1-0 (ch 1-based)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('SH.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook contract r8 {mode,target,name,targets,options,rot,veil,answerIdx,phase,picked,step,miss,dead}',
                  q and q['mode'] == 'multi' and
                  q['target'] in ('cat', 'dog', 'rabbit', 'bear', 'hamster', 'fox',
                                  'apple', 'ball', 'sun', 'orange', 'star', 'balloon',
                                  'butterfly', 'fish', 'frog') and
                  isinstance(q['name'], str) and len(q['name']) >= 2 and
                  len(q['targets']) == 2 and len(q['options']) == 3 and
                  len(q['rot']) == 3 and len(q['veil']) == 3 and
                  q['options'][q['answerIdx']] == q['target'] and
                  all(v == 0 for v in q['rot']) and not any(q['veil']) and
                  q['step'] == 0 and q['phase'] == 0 and q['miss'] == 0 and
                  q['picked'] == [] and q['dead'] == [],
                  str(q and {k: q[k] for k in ('mode', 'targets', 'options', 'rot', 'veil', 'answerIdx', 'picked')}))
            dom = pg.evaluate('''() => {
              const items = [...document.querySelectorAll('#prompt-chip .t-item .t-glyph')].map(e => e.textContent);
              const cur = document.querySelector('#prompt-chip .t-item.cur .t-glyph');
              const cards = [...document.querySelectorAll('#board .card')].map(c => c.querySelector('.glyph').textContent);
              return {items: items, n: cards.length, okGlyph: cards[SH.quiz.answerIdx] === (cur && cur.textContent),
                      sidOk: [...document.querySelectorAll('#board .card')].every((c, i) => c.dataset.sid === SH.quiz.options[i]),
                      curOk: document.querySelectorAll('#prompt-chip .t-item.cur').length === 1};
            }''')
            check('DOM matches quiz (chip t-row=2 targets, 3 cards, cur highlight, data-sid aligned)',
                  dom['items'] and len(dom['items']) == 2 and dom['n'] == 3 and dom['okGlyph'] and
                  dom['sidOk'] and dom['curOk'],
                  'items=%s cards=%d sidOk=%s curOk=%s' % (dom['items'], dom['n'], dom['sidOk'], dom['curOk']))
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('finished 5 quizzes by real click', n == 5, 'quizzes=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(5200)            # celebrate 2.3s + 写档 + 推进（任务口径：等 5.2s 再读）
            lv2 = pg.evaluate('SH.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_shadow")'))
            s10 = saved['levels'].get('1-0', {}).get('stars', 0)
            check('save levels["1-0"].stars >= 1 (actual 2)', s10 >= 1, 'stars=%s' % s10)
            check('sha.tutSeen kept true', (saved.get('sha') or {}).get('tutSeen') is True,
                  str(saved.get('sha')))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入+轻叮)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.SH && SH.currentLevel', timeout=8000)
            pg.wait_for_function("SH.tutorial === 'watch'", timeout=5000)
            pg.evaluate('window.__sfx = []; KIDS.audio.sfx = n => window.__sfx.push(n);')
            swallowed_hook = pg.evaluate('SH.tapCard(0)') is False    # 演示期 hook 输入全吞
            qw0 = quiz_of(pg)
            click_card(pg, qw0['answerIdx'])         # 演示期真实点击也吞（落 .card 分支 → sfx('pop')）
            pg.wait_for_timeout(700)
            st = pg.evaluate('''() => ({step: SH.currentLevel.step, retries: SH.currentLevel.retries,
                                        tut: SH.tutorial, pop: window.__sfx.indexOf('pop') >= 0})''')
            check('tutorial watch swallows input (real click + hook) with pop ding (0x22)',
                  swallowed_hook and st['step'] == 0 and st['retries'] == 0 and
                  st['tut'] == 'watch' and st['pop'], str(st))
            pg.wait_for_function("SH.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0 (multi phase 0)',
                  q and q['step'] == 0 and q['phase'] == 0 and q['miss'] == 0 and q['dead'] == [] and
                  q['picked'] == [], str(q and {k: q[k] for k in ('step', 'phase', 'picked', 'dead')}))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost visible', ghost_shown)
            n = play_level(pg, tag='[2b] ')       # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'quizzes=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_shadow")'))
            check('sha.tutSeen persisted after tutorial', (saved.get('sha') or {}).get('tutSeen') is True,
                  str(saved.get('sha')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. flat5（第 6 关·章 2 旋转）：qi0 热身零旋转 → 旋转题真实通关 → 写档 2-0 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(5), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.SH && SH.currentLevel', timeout=8000)
            pg.wait_for_timeout(2500)
            lv = pg.evaluate('SH.currentLevel')
            check('level 6 starts at flat=5 ch=2 dch=2', lv and lv['flat'] == 5 and lv['ch'] == 2 and lv['dch'] == 2,
                  str(lv))
            c2 = pg.evaluate('''() => {
              const L = genLevel(5);
              const qs = L.quizzes;
              const rotOf = q => q.targets.map(t => q.rot[q.options.indexOf(t)]);
              return {dch: L.dch,
                warm: qs[0].mode === 'multi' && qs[0].rot.every(v => v === 0) && !qs[0].veil.some(v => v),
                multi3: qs.every(q => q.mode === 'multi' && q.targets.length === 3),
                fourCards: qs.every(q => q.options.length === 4),
                uniq: qs.every(q => new Set(q.options).size === 4),
                rotSpin: qs.slice(1).every(q => rotOf(q).every(v => v === 90 || v === 180 || v === 270)),
                rotAny: qs.slice(1).every(q => q.rot.every(v => [0, 90, 180, 270].includes(v))),
                veilOff: qs.every(q => !q.veil.some(v => v)),
                adjDiff: qs.every((q, i) => i === 0 || qs[i-1].targets[0] !== q.targets[0]),
                cards: document.querySelectorAll('#board .card').length};
            }''')
            check('ch2 r8: qi0 warm zero-rot, qi1+ multi3 all-cards rot 4-way, target card 90/180/270',
                  c2['dch'] == 2 and c2['warm'] and c2['multi3'] and c2['fourCards'] and c2['uniq'] and
                  c2['rotSpin'] and c2['rotAny'] and c2['veilOff'] and c2['adjDiff'] and c2['cards'] == 4, str(c2))
            n = play_level(pg, tag='[2c] ')
            check('level 6 real-click win (5 quizzes, rotation steps)', n == 5, 'quizzes=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('level 6 win 3 stars (0 wrong)', stars == 3, 'stars=%d' % stars)
            pg.wait_for_timeout(5200)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_shadow")'))
            s20 = saved['levels'].get('2-0', {}).get('stars', 0)
            check('save levels["2-0"].stars >= 1 (actual 3)', s20 >= 1, 'stars=%s' % s20)
            ctx.close()

            # ---- 2d. flat15（第 16 关·章 4）：重叠双选+混排（遮蔽+旋转）真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.SH && SH.currentLevel', timeout=8000)
            pg.wait_for_timeout(2500)
            lv = pg.evaluate('SH.currentLevel')
            check('level 16 starts at flat=15 ch=4 dch=4', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            c4 = pg.evaluate('''() => {
              const L = genLevel(15);
              const qs = L.quizzes;
              return {ovl: qs.slice(1, 3).every(q => q.mode === 'overlap' && q.options.length === 4 &&
                    q.rot.every(v => v === 0) && !q.veil.some(v => v)),
                    pairGrp: qs.slice(1, 3).every(q => {
                      const G = {cat:'quad',dog:'quad',rabbit:'quad',bear:'quad',hamster:'quad',fox:'quad',
                                 apple:'round',ball:'round',sun:'round',orange:'round',
                                 star:'feat',balloon:'feat',butterfly:'feat',fish:'feat',frog:'feat'};
                      return q.options.every(o => G[o] === G[q.pair[0]]);
                    }),
                    mixVeil: qs.slice(3).every(q => q.mode === 'multi' && q.veil.every(v => v)),
                    domOvl: document.querySelectorAll('#board .card').length === 4};
            }''')
            check('ch4 r8: qi1-2 overlap (pair same-group 4 cards) + qi3-4 veiled multi',
                  c4['ovl'] and c4['pairGrp'] and c4['mixVeil'] and c4['domOvl'], str(c4))
            n = play_level(pg, tag='[2d] ')
            check('level 16 real-click win (overlap double-pick + veiled mix, 5 quizzes)', n == 5, 'quizzes=%d' % n)
            pg.wait_for_timeout(5200)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_shadow")'))
            s40 = saved['levels'].get('4-0', {}).get('stars', 0)
            check('save levels["4-0"].stars >= 1', s40 >= 1, 'stars=%s' % s40)
            ctx.close()

            # ---- 2e. 双 viewport：overflowX==0 + 卡>=96(3/4 卡两形态) + 按钮>=64 + 遮蔽几何 + 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.SH && SH.currentLevel', timeout=8000)
                pg.wait_for_timeout(1200)        # 入场动画落定
                for tag, expect_n in [('ch3-veil4cards', 4), ('ch1-3cards', 3)]:
                    if tag == 'ch1-3cards':
                        pg.evaluate('startLevel(0)')
                        pg.wait_for_timeout(1200)
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
                      const chip = document.querySelector('#prompt-chip').getBoundingClientRect();
                      const inside = cards.every(c => {
                        const g = c.querySelector('.glyph').getBoundingClientRect();
                        const b = c.getBoundingClientRect();
                        return g.left >= b.left - 8 && g.right <= b.right + 8 &&
                               g.top >= b.top - 8 && g.bottom <= b.bottom + 8;
                      });
                      const veils = [...document.querySelectorAll('.card .veil')];
                      const veilOk = veils.every(v => {
                        const r = v.getBoundingClientRect();
                        const c = v.parentElement.getBoundingClientRect();
                        return r.height >= c.height * 0.6 && r.height <= c.height * 0.8;
                      });
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad, cards: cards.length,
                              cMin: cMin, chipH: Math.round(chip.height), rotInside: inside, veilOk: veilOk,
                              veilN: veils.length};
                    }''')
                    check('vp %dx%d %s overflowX==0 + cards=%d(>=96) + buttons>=64 + chip>=64 + glyph inside + veil geo' %
                          (vp[0], vp[1], tag, expect_n),
                          m['ox'] == 0 and m['cards'] == expect_n and m['cMin'] >= 96 and
                          not m['bad'] and m['chipH'] >= 64 and m['rotInside'] and m['veilOk'],
                          'ox=%s cards=%s cMin=%s bad=%s chipH=%s rotIn=%s veilN=%s' %
                          (m['ox'], m['cards'], m['cMin'], m['bad'][:3], m['chipH'], m['rotInside'], m['veilN']))
                    shot = SHOTS / ('shadow-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot, floor=10.0)
                    check('screenshot %s %dx%d non-blank (stdev>10)' % (tag, vp[0], vp[1]), ok, detail)
                ctx.close()

            # ---- 4. 救援钟：flat>=3 静置 14s+ 重读题面 TTS + 当前应点剪影 breathe 循环；11s 处错点不重置 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.SH && SH.currentLevel', timeout=8000)
            check('rescue scenario starts at flat=3 (>=3)', pg.evaluate('SH.currentLevel.flat') == 3)
            pg.wait_for_timeout(2500)            # 等开场链（hint clip + 2000ms 接力）落完再挂钩
            t0 = time.time()
            pg.evaluate('''() => {
              window.__vlog = [];
              const _p = KIDS.voice.play.bind(KIDS.voice);
              KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
              const _s = KIDS.voice.say.bind(KIDS.voice);
              KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 6)); return _s(t); };
            }''')
            # r8 题面句=晓晓 clip（play 'sha_q_*' 通道；T:=缺 clip 兜底）——play+say 双通道记录
            rescue_says = lambda: pg.evaluate(
                "window.__vlog.filter(x => x.indexOf('P:sha_q_') === 0 || x.indexOf('T:\\u627e\\u4e00\\u627e') === 0)")
            pg.wait_for_timeout(8000)            # 静置 8s → 错点一次（不该重置救援钟）
            qw = quiz_of(pg)
            click_card(pg, (qw['answerIdx'] + 1) % len(qw['options']))
            pg.wait_for_timeout(1500)            # t0+9.5s：14s 阈值未到，救援不应响
            early = len(rescue_says())
            check('rescue not fired before 14s threshold', early == 0, 'early=%s' % early)
            try:                                 # 若错点(+8s)未重置 → 救援在 ~14s 响 + 当前应点剪影 breathe
                pg.wait_for_function("document.querySelector('.card.breathe')", timeout=8000)
                pulse_seen = True
            except Exception:
                pulse_seen = False
            pg.wait_for_timeout(400)             # say 与 breathe 同拍，稍等日志落地
            resc = rescue_says()
            elapsed = time.time() - t0
            check('rescue fired by idle 14s+ (wrong tap at +8s did NOT reset clock) + answer card breathe loop',
                  pulse_seen and len(resc) >= 1 and elapsed < 17,
                  'breathe=%s says=%s wall=%.1fs' % (pulse_seen, len(resc), elapsed))
            if resc:
                check('rescue re-reads question voice (P:sha_q_ clip channel or T: TTS fallback)',
                      resc[0].startswith('P:sha_q_') or resc[0].startswith('T:'), resc[0])
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
