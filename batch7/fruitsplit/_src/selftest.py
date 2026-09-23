# -*- coding: utf-8 -*-
"""fruitsplit _selftest（r7 五玩法）— headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk
2a. 预置存档(跳过教学) flat0：首题 pick 2 选 1 + 首错(晃+灰+不pulse正确项+零惩罚) → 真实流程通关
    （pick/cut 两段/choose/fair）2 星 → 推进 flat1 → 写档 + getter 拷贝
2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 → fru.tutSeen 持久化
2c. 章 2 flat5 公平判断：quiz0=fair（展示 spans 与公平性一致）→ 切分题两半等大（DOM 盒）→
    真实点刀 → #judge-row 2 按钮 → 点"公平"推进 → 通关
2d. 章 3 flat10 等分选择：quiz0=choose(3 人)（人数图示=3/切法卡=3/含 unfair 干扰）→
    点正确切法 → 分块 span 全等 120° + 3 娃娃各拿一块 → 通关
2e. flat≥3 纠错 sayW 节流（choose 题 3 选 1 双错：首错播 fru_wrong/10s 内次错静默）
3. 双 viewport(1280x800/800x1180)：overflowX==0、可点按钮 ≥64、主触摸目标 ≥96
4. 全页截图非空白（存 _src/_shots/；模式帧：fair/choose/ch4/cut 演出中）
5. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror + 钩子齐全（getter 拷贝）
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
        'v': '1.0', 'game': 'fruitsplit', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'fru': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    # 静音纪律（T46 阶段2 2026-09-19）：headless 无手势 Audio.play 被拦→回退 speak=外放；
    # 规范 INIT_SND（原型级 play/pause no-op+5ms ended 派发）随种子串注入，先于页面 JS
    _mute = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
             "speechSynthesis.cancel=function(){};}}catch(e){}"
             "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
             "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},5);"
             "return Promise.resolve();};p.pause=function(){};}catch(e){};")
    return _mute + 'localStorage.setItem("kidsgame_fruitsplit", ' + json.dumps(json.dumps(save)) + ')'


VLOG = """(() => { window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push(k); return _p(k, t); };
  return true; })()"""

# r7 模式等待窗（真实页 SPEED=1）：cut 刀阶段 1250 / 判定+choose+fair 演出 ~2800-3200 / pick·match 880
WAIT = {'knife': 1600, 'show': 3600, 'tap': 1300}


def play_level(page, first_wrong=False, tag=''):
    """真实点击打完当前关：pick/choose/fair→.card，match→.mopt，cut→点刀→点"公平"（两段）
    返回操作步数（cut 两段计 2 步）"""
    wrong_done = not first_wrong
    acts = 0
    for _ in range(40):
        lv = page.evaluate('FRU.currentLevel')
        if lv and lv.get('done'):
            break
        q = page.evaluate('FRU.quiz')
        if not q:
            page.wait_for_timeout(300)
            continue
        if q['mode'] == 'cut':
            if not q['cutDone']:
                box = page.locator('#btn-knife').bounding_box()
                page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
                page.wait_for_timeout(WAIT['knife'])
            else:
                page.click('.card[data-i="%d"]' % q['answerIdx'])
                page.wait_for_timeout(WAIT['show'])
            acts += 1
            continue
        if not wrong_done:
            widx = next(i for i in range(len(q['options'])) if i != q['answerIdx'])
            page.click('.card[data-i="%d"]' % widx)
            page.wait_for_timeout(750)
            grayed = page.evaluate("!!document.querySelector('.card[data-i=\"%d\"].wrong')" % widx)
            pulsed = page.evaluate("!!document.querySelector('.card[data-i=\"%d\"].pulse')" % q['answerIdx'])
            check('%s wrong pick: shake+gray / no pulse on correct (zero penalty)' % tag, grayed and not pulsed,
                  'grayed=%s pulsed=%s' % (grayed, pulsed))
            wrong_done = True
            continue
        sel = '.mopt[data-i="%d"]' % q['answerIdx'] if q['mode'] == 'match' else '.card[data-i="%d"]' % q['answerIdx']
        page.click(sel)
        acts += 1
        page.wait_for_timeout(WAIT['show'] if q['mode'] in ('choose', 'fair') else WAIT['tap'])
    page.wait_for_selector('.k-celebrate', timeout=15000)
    return acts


def png_nonblank(path, floor=10.0):
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(path)).convert('L').resize((160, 100))
        sd = statistics.pstdev(list(im.getdata()))
        return sd > floor, 'PIL pixel stdev=%.1f' % sd
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL 不可用，按体积判定)' % n


def main():
    offline_bad, page_errors = [], []

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
                  'pass=%s/%s dist=%s' % (vj['pass'], vj['total'], vj['units']['dist']))
            check('verify halves-equal + judge-row unit (mirror symmetric, equal size)',
                  vj['units']['halves']['ok'], str(vj['units']['halves']['judge']))
            check('verify equal-piece unit (choose spans / fair show)',
                  vj['units']['pieces']['ok'], str(vj['units']['pieces']))
            check('verify duration modeled >=40s per level',
                  all(v['durOk'] for v in list(vj['levels'].values()) + list(vj['gen'].values())),
                  'min ms=%s' % min(v['ms'] for v in list(vj['levels'].values()) + list(vj['gen'].values())))
            check('verify family-F unit', vj['units']['family']['ok'], str(vj['units']['family']))
            check('verify estMs family unit', vj['units']['estMs']['ok'], str(vj['units']['estMs']))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  'n=%d %s' % (len(vj['smokes']['layout']['sims']),
                               [s['mode'] for s in vj['smokes']['layout']['sims']]))
            clips_ok = pg.evaluate("""['fru_tut_watch','fru_tut_turn','fru_hint','fru_fair_q',
                'fru_fair_yes','fru_fair_no','fru_recut','fru_choose',
                'core_chapter_end','core_day_end','core_rest'].filter(k => !KIDS.voice.clips[k])""")
            check('verify clips embedded (3 既有 + 5 r7 新键 + core)',
                  not clips_ok,
                  'clips=%d missing=%s' % (pg.evaluate('Object.keys(KIDS.voice.clips).length'), clips_ok))
            ctx.close()

            # ---- 2a. flat0：首题 pick 2 选 1 + 首错零惩罚 + 真实流程通关（2 星）----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.FRU && FRU.currentLevel', timeout=8000)
            pg.evaluate(VLOG)
            lv = pg.evaluate('FRU.currentLevel')
            check('start at 1-0 (ch 1-based, pick mode)', lv and lv['ch'] == 1 and lv['lv'] == 0
                  and lv['mode'] == 'pick', str(lv))
            q0 = pg.evaluate('FRU.quiz')
            cards = pg.locator('.card').count()
            check('flat0 quiz0 = pick 2-option (whole vs half)', q0['mode'] == 'pick' and cards == 2,
                  'cards=%s' % cards)
            n = play_level(pg, first_wrong=True, tag='2a')
            check('flat0 answered by real click (5 quizzes, cut 2-phase -> 7 acts)', n == 7, 'acts=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 retry)', stars == 2, 'stars=%d' % stars)
            v = pg.evaluate('window.__vlog')
            check('2a flat<3 wrong voice always plays (fru_wrong x1)', v.count('fru_wrong') == 1, str(v))
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('FRU.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_fruitsplit")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            # getter 拷贝（非活引用）
            cp = pg.evaluate("""() => {
              const q1 = FRU.quiz; if (!q1) return null;
              const before = q1.options.length; q1.options.push('x'); q1.target = -99;
              const q2 = FRU.quiz;
              return {before, len: q2.options.length, target: q2.target};
            }""")
            check('hook getters return copies', cp and cp['len'] == cp['before'] and cp['target'] != -99, str(cp))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.FRU && FRU.currentLevel', timeout=8000)
            captured = False
            for _ in range(40):
                t = pg.evaluate('FRU && FRU.tutorial')
                if t == 'watch':
                    step0 = pg.evaluate('FRU.currentLevel.step')
                    card = pg.locator('.card').first
                    box = card.bounding_box()
                    if box:
                        pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
                        pg.wait_for_timeout(500)
                        step1 = pg.evaluate('FRU.currentLevel.step')
                        t1 = pg.evaluate('FRU.tutorial')
                        check('tutorial watch swallows input', step1 == step0 and t1 == 'watch',
                              'step %s->%s tut=%s' % (step0, step1, t1))
                        captured = True
                    break
                pg.wait_for_timeout(400)
            if not captured:
                check('tutorial watch swallows input', False, '未捕获 watch（tut=%s）' % t)
            pg.wait_for_function("FRU.tutorial === 'help'", timeout=25000)
            q = pg.evaluate('FRU.quiz')
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0, str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> correct card', ghost_shown)
            n = play_level(pg)
            check('tutorial level playable -> .k-celebrate (7 acts)', n == 7, 'acts=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_fruitsplit")'))
            check('fru.tutSeen persisted', (saved.get('fru') or {}).get('tutSeen') is True, str(saved.get('fru')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. 章 2 flat5 公平判断 + 切分两段（两半等大 + judge-row）----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(5), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.FRU && FRU.currentLevel', timeout=8000)
            lv = pg.evaluate('FRU.currentLevel')
            q5 = pg.evaluate('FRU.quiz')
            check('ch2 start at flat=5 first quiz fair (judge mode)', lv and lv['flat'] == 5 and lv['ch'] == 2
                  and q5['mode'] == 'fair' and len(q5['options']) == 2, str(q5))
            fair_show = pg.evaluate("""() => {
              const ps = [...document.querySelectorAll('#fair-show .fpiece')].map(p => +p.getAttribute('data-span'));
              return {spans: ps, people: document.querySelectorAll('#fair-people .dhead').length,
                      btns: document.querySelectorAll('.card.fbtn').length,
                      fair: FRU.quiz.fairIsFair};
            }""")
            spans_ok = (len(fair_show['spans']) == 2 and
                        (fair_show['spans'][0] == fair_show['spans'][1]) == fair_show['fair'])
            check('fair show spans match fairness (equal<->fair)', spans_ok and fair_show['people'] == 2
                  and fair_show['btns'] == 2, str(fair_show))
            # 真实点公平按钮答对 → 推进到 cut（quiz1）
            pg.click('.card[data-i="%d"]' % q5['answerIdx'])
            pg.wait_for_timeout(WAIT['show'])
            qc = pg.evaluate('FRU.quiz')
            check('fair correct -> advance to cut quiz', qc and qc['mode'] == 'cut' and not qc['cutDone'], str(qc))
            halves = pg.evaluate("""() => {
              const l = document.getElementById('half-l').getBoundingClientRect();
              const r = document.getElementById('half-r').getBoundingClientRect();
              return {lw: l.width, lh: l.height, rw: r.width, rh: r.height};
            }""")
            check('cut scene: two halves strictly equal size',
                  abs(halves['lw'] - halves['rw']) < 0.5 and abs(halves['lh'] - halves['rh']) < 0.5,
                  str(halves))
            kb = pg.locator('#btn-knife').bounding_box()
            pg.mouse.click(kb['x'] + kb['width'] / 2, kb['y'] + kb['height'] / 2)
            pg.wait_for_timeout(WAIT['knife'])
            judge = pg.evaluate("""() => ({
              row: !!document.getElementById('judge-row'),
              btns: document.querySelectorAll('#judge-row .card').length,
              judging: FRU.currentLevel.judging, cutDone: FRU.currentLevel.cutDone,
              chips: document.querySelector('#prompt-chip .big').textContent});""")
            check('knife -> judge row (2 fair buttons, judging=true)',
                  judge['row'] and judge['btns'] == 2 and judge['judging'] and judge['cutDone'], str(judge))
            # 判定错点（不公平）→ 零惩罚灰掉；再点对推进
            qj = pg.evaluate('FRU.quiz')
            jw = next(i for i in range(2) if i != qj['answerIdx'])
            pg.click('#judge-row .card[data-i="%d"]' % jw)
            pg.wait_for_timeout(750)
            jwrong = pg.evaluate("""() => ({retries: FRU.currentLevel.retries, step: FRU.currentLevel.step,
              gray: !!document.querySelector('#judge-row .card[data-i="%d"].wrong')});""" % jw)
            check('judge wrong answer: zero penalty (gray + stay)', jwrong['retries'] == 1 and jwrong['step'] == 1
                  and jwrong['gray'], str(jwrong))
            n = play_level(pg)
            # 场景已手动做 3 步（quiz0 公平 + 点刀 + 判定错），此处续打判定对+fair/choose/fair = 4 步
            check('ch2 real fair/cut/choose win (4 remaining acts)', n == 4, 'acts=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('FRU.currentLevel')
            check('ch2 win proceeds to flat=6', lv2 and lv2['flat'] == 6, str(lv2))
            ctx.close()

            # ---- 2d. 章 3 flat10 等分选择（3 人）----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.FRU && FRU.currentLevel', timeout=8000)
            q10 = pg.evaluate('FRU.quiz')
            cho = pg.evaluate("""() => ({
              people: document.querySelectorAll('#cho-people .dhead').length,
              cards: document.querySelectorAll('.card.cutcard').length,
              cuts: [...document.querySelectorAll('.card.cutcard svg[data-cut]')].map(s => s.getAttribute('data-cut')),
              parts: FRU.quiz.parts});""")
            cut_ok = (cho['cuts'] and sorted(cho['cuts']) == sorted(
                [{2: 'halves', 3: 'thirds', 4: 'quarters'}[cho['parts']],
                 'unfair',
                 {2: 'quarters', 3: 'quarters', 4: 'thirds'}[cho['parts']]]))
            check('ch3 quiz0 = choose, people icons = parts (3)', q10 and q10['mode'] == 'choose'
                  and q10['parts'] == 3 and cho['people'] == 3 and cho['cards'] == 3, str(cho))
            check('choose options = correct cut + unfair + wrongN', cut_ok, str(cho['cuts']))
            pg.click('.card[data-i="%d"]' % q10['answerIdx'])
            pg.wait_for_timeout(1400)              # 分块演出中段
            mid = pg.evaluate("""() => ({
              spans: [...document.querySelectorAll('#cho-fruit .chop svg')].map(s => +s.getAttribute('data-span')),
              takers: document.querySelectorAll('#cho-takers .taker').length});""")
            check('choose correct -> pieces split equal (span=120 x3) + 3 takers',
                  mid['spans'] == [120, 120, 120] and mid['takers'] == 3, str(mid))
            # r7 审查 m-2：choose 分块演出共 2800ms 且期间 step 已推进但交互锁定——step 变化≠可交互。
            # 等足演出窗（mid 检查在 1400ms 中段，再补 1800ms 共 3200>2800）再进 play_level，
            # 否则首轮点击被吞也计入 acts（原 n==6=1 被吞+5 真实，把竞态烘进了断言）
            pg.wait_for_timeout(1800)
            n = play_level(pg)
            check('ch3 real choose win (5 acts, no swallowed click)', n == 5, 'acts=%d' % n)
            ctx.close()

            # ---- 2e. flat≥3 纠错 sayW 节流（flat10 choose 3 选 1 双错）----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2e')
            pg.goto(URL)
            pg.wait_for_function('window.FRU && FRU.currentLevel', timeout=8000)
            pg.evaluate(VLOG)
            q = pg.evaluate('FRU.quiz')
            wrongs = [i for i in range(3) if i != q['answerIdx']]
            pg.click('.card[data-i="%d"]' % wrongs[0])
            pg.wait_for_timeout(700)
            v1 = pg.evaluate('window.__vlog')
            pg.click('.card[data-i="%d"]' % wrongs[1])
            pg.wait_for_timeout(700)
            v2 = pg.evaluate('window.__vlog')
            check('flat>=3 sayW: 1st wrong plays fru_wrong, 2nd within 10s throttled',
                  v1.count('fru_wrong') == 1 and v2.count('fru_wrong') == 1, 'v1=%s v2=%s' % (v1, v2))
            ctx.close()

            # ---- 3+4. 双 viewport：overflowX==0、触摸目标、主目标 ≥96、截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.FRU && FRU.currentLevel', timeout=8000)
                pg.wait_for_timeout(900)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button, .k-btn').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.className || e.tagName) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const mains = [...document.querySelectorAll('.card, .mopt, #btn-knife')].map(b => b.getBoundingClientRect());
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad, n: mains.length,
                          mainMin: mains.length ? Math.round(Math.min(...mains.map(r => Math.min(r.width, r.height)))) : 0};
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64' % vp, not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d main targets (card/mopt/knife) >=96' % vp,
                      m['n'] > 0 and m['mainMin'] >= 96, 'n=%s min=%s' % (m['n'], m['mainMin']))
                shot = SHOTS / ('fruitsplit-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d non-blank (stdev>10)' % vp, ok, detail)
                ctx.close()

            # ---- 额外模式截图：公平判断/等分选择/章4/切分演出各留一帧 ----
            for flats, name in [(5, 'fair'), (10, 'choose'), (15, 'ch4')]:
                ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
                pg = ctx.new_page(); watch(pg, 'shot')
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(flats), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.FRU && FRU.currentLevel', timeout=8000)
                pg.wait_for_timeout(700)
                if name == 'fair':                 # 不公平题：点对看重切演出帧
                    qf = pg.evaluate('FRU.quiz')
                    if not qf['fairIsFair']:
                        pg.click('.card[data-i="%d"]' % qf['answerIdx'])
                        pg.wait_for_timeout(1800)
                pg.screenshot(path=str(SHOTS / ('fruitsplit-mode-%s.png' % name)))
                ctx.close()
            # cut 演出中一帧（flat1 quiz1：先答 quiz0 再点刀）
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = ctx.new_page(); watch(pg, 'shot')
            pg.add_init_script(preset_save(tut_seen=True, done_flats=range(1), bonus=30))
            pg.goto(URL)
            pg.wait_for_function('window.FRU && FRU.currentLevel', timeout=8000)
            q1 = pg.evaluate('FRU.quiz')
            pg.click('.card[data-i="%d"]' % q1['answerIdx'])
            pg.wait_for_timeout(WAIT['tap'])
            kb = pg.locator('#btn-knife').bounding_box()
            pg.mouse.click(kb['x'] + kb['width'] / 2, kb['y'] + kb['height'] / 2)
            pg.wait_for_timeout(1000)
            pg.screenshot(path=str(SHOTS / 'fruitsplit-mode-cut.png'))
            ctx.close()
        finally:
            browser.close()

    # ---- 5. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
