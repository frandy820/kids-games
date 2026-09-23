# -*- coding: utf-8 -*-
"""fishcolor _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r7 改造版（两步序/间色合成/鱼群游散）：
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 40 关审计全绿 + 新单元
   （seqWrong/mix/school/duration ≥40s modeled）
2a. 预置存档(跳过教学) → 真实 pointer：首错(非目标鱼躲开+零惩罚+不pulse) → 钓起角标/色卡圆点
    → 真实点击通关 → .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(吞输入)→帮(幽灵手指)→独 真实链路 → fis.tutSeen 持久化
2c. 章 4 混排（flat15）：题型三型各 ≥1 + 近似色干扰鱼在场 + 真实点它躲开不计数 + 真实通关
2d. 章 3 间色（flat10）：场上无间色目标鱼 + 点第二成分=wrong + 真实点击按序合成通关
2e. wall-clock 时长硬指标（r7 ≥40s/关）：flat1（章1）/flat12（章3）真实点击，
    口径=听题窗 estMs(len)+300 + 每钓 3.2s dwell + 推进窗，实测 elapsed ≥40s
3. 双 viewport(1280x800/800x1180)：overflowX==0、触摸目标 ≥64（含游动内层 .swim 实时盒）、
    鱼两两中心距 ≥90px、底栏按钮 ≥64、截图像素非空白
4. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
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
DWELL_MS = 3200        # 5-6 岁每钓一条典型决策+操作 dwell（与 verify modeled 口径一致）
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
        'v': '1.0', 'game': 'fishcolor', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'fis': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    # 静音纪律（T46 阶段2 2026-09-19）：规范 INIT_SND（原型级 play/pause no-op+5ms ended 派发）随种子注入
    _mute = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
             "speechSynthesis.cancel=function(){};}}catch(e){}"
             "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
             "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},5);"
             "return Promise.resolve();};p.pause=function(){};}catch(e){};")
    return _mute + 'localStorage.setItem("kidsgame_fishcolor", ' + json.dumps(json.dumps(save)) + ')'


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


def wait_fish_present(page, timeout=15000):
    """r7 游散：鱼散去期不可点——点击前等鱼群回场"""
    try:
        page.wait_for_function("!FIS.school.on || FIS.school.phase === 'present'", timeout=timeout)
        return True
    except Exception:
        return False


def click_fish(page, i):
    loc = page.locator('.animal[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] * 0.55)


def quiz_of(page):
    return page.evaluate('FIS.quiz')


def live_target(page, q=None):
    """当前步第一条没钓起的目标色鱼下标"""
    q = q or quiz_of(page)
    col = q['targets'][q['act']]
    return next(k for k, f in enumerate(q['fishes']) if f['c'] == col and not q['gone'][k])


def play_level(page, first_wrong=False, tag=''):
    """真实点击打完当前关：每题钓满当前步目标色鱼（两步/间色自动跟步）→（首题可选先错一次）"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = quiz_of(page)
        if q is None:
            break
        guard = 0
        while guard < 14:
            qq = quiz_of(page)
            if qq is None or qq['step'] != q['step']:
                break
            if not wrong_done:
                wrong_done = True
                col = qq['targets'][qq['act']]
                wi = next(k for k, f in enumerate(qq['fishes']) if f['c'] != col)
                wait_fish_present(page)
                click_fish(page, wi)
                page.wait_for_timeout(350)
                lv = page.evaluate('FIS.currentLevel')
                breathe = page.evaluate('!!document.querySelector(".animal.breathe")')
                check('%swrong tap: dodge / no pulse / zero penalty' % tag,
                      lv['retries'] == 1 and lv['step'] == q['step'] and not breathe,
                      'retries=%s step=%s breathe=%s' % (lv['retries'], lv['step'], breathe))
                continue
            wait_fish_present(page)
            click_fish(page, live_target(page, qq))
            page.wait_for_timeout(200)
            guard += 1
        page.wait_for_timeout(1000)              # > 题成推进窗口 880ms
        answered += 1
    page.wait_for_selector('.k-celebrate', timeout=20000)
    return answered


def play_timed(page, tag):
    """wall-clock 时长实测：每题听题窗 estMs(len)+300 → 每钓 DWELL_MS；
    终点=最后一钓 done 翻转（决策完成即停表，不含演出窗）→ 另探 celebrate 在场"""
    t0 = time.time()
    win_ms = None
    while win_ms is None:
        q = quiz_of(page)
        if q is None:
            break
        slen = page.evaluate('quizSpeech(FIS.quiz).length')
        page.wait_for_timeout(slen * 345 + 600 + 300)     # 听题窗（家族 T estMs）
        guard = 0
        while guard < 14:
            qq = quiz_of(page)
            if qq is None or qq['step'] != q['step']:
                break
            if not wait_fish_present(page):
                check('%s wall-clock fish present timeout' % tag, False)
                return -1, False
            click_fish(page, live_target(page, qq))
            if page.evaluate('FIS.currentLevel.done'):     # 最后一钓：停表
                win_ms = (time.time() - t0) * 1000
                break
            page.wait_for_timeout(DWELL_MS)
            guard += 1
        if win_ms is None:
            page.wait_for_timeout(1000)                    # 题成推进窗
    if win_ms is None:
        win_ms = (time.time() - t0) * 1000
    try:
        page.wait_for_selector('.k-celebrate', timeout=5000)
        celeb = True
    except Exception:
        celeb = False
    return win_ms, celeb


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
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=90000)
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
            hist = vj['units']['colorDist']
            check('verify coverage: 5 target colors + 3 mixes + 9 field colors',
                  all(hist['targets'].get(c, 0) >= 1
                      for c in ('red', 'yellow', 'blue', 'green', 'orange')) and
                  all(v >= 1 for v in hist['mixes'].values()) and len(hist['mixes']) == 3 and
                  all(v >= 1 for v in hist['fishes'].values()) and len(hist['fishes']) == 9,
                  str(hist))
            dur = vj['units']['duration']
            check('verify modeled duration >=40s all 40 levels', dur['ok'] and dur['minMs'] >= 40000,
                  'minMs=%s' % dur['minMs'])
            check('verify school/scatter + mix + seqWrong units', vj['units']['school']['ok'] and
                  vj['units']['mix']['ok'] and vj['units']['seqWrong']['ok'])
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + 钓起角标/色卡 + 真实点击通关（2 星） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.FIS && FIS.currentLevel', timeout=8000)
            lv = pg.evaluate('FIS.currentLevel')
            check('start at 1-0 (ch 1-based)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('FIS.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook shape (r7 single K=2-3, 6-8 fish)', q and q['kind'] == 'single' and
                  len(q['targets']) == 1 and 2 <= q['need'][0] <= 3 and
                  6 <= len(q['fishes']) <= 8, str(q['targets']) + ' need=' + str(q['need']))
            check('school off in ch1', pg.evaluate('FIS.school.on') is False)
            # 首错：点非目标色鱼 → 躲开零惩罚（play_level 内断言）
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('answered 5 quizzes by real click', n == 5, 'answered=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('FIS.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_fishcolor")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            # 单独验证角标+色卡圆点链路（新关第一题钓 1 条即断言）
            q1 = quiz_of(pg)
            wait_fish_present(pg)
            i = live_target(pg, q1)
            click_fish(pg, i)
            page_state = pg.evaluate('''() => {
              const el = document.querySelector('.animal[data-i="%d"]');
              const badge = el ? el.querySelector('.badge') : null;
              return {badgeOn: !!(badge && badge.classList.contains('on')),
                      badgeText: badge ? badge.textContent : '',
                      rise: !!(el && el.classList.contains('rise')),
                      pips: document.querySelectorAll('#prompt-chip .card.cur .pips i.on').length,
                      got: FIS.quiz.got[FIS.quiz.act], caught: FIS.currentLevel.caught};
            }''' % i)
            check('catch: badge 1 + rise anim + pip lit + got=1',
                  page_state['badgeOn'] and page_state['badgeText'] == '1' and page_state['rise'] and
                  page_state['pips'] == 1 and page_state['got'] == 1 and page_state['caught'] == 1,
                  str(page_state))
            # 已钓起的鱼再点 = 'again' 零惩罚
            again = pg.evaluate('FIS.tapFish(%d)' % i)
            lv3 = pg.evaluate('FIS.currentLevel')
            check('tap caught fish -> again (zero penalty)', again == 'again' and
                  lv3['caught'] == 1 and lv3['retries'] == 0, 'r=%s' % again)
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.FIS && FIS.currentLevel', timeout=8000)
            pg.wait_for_function("FIS.tutorial === 'watch'", timeout=5000)
            swallowed = pg.evaluate('FIS.tapFish(0)') is False    # 演示期真实/hook 输入全吞
            check('tutorial watch swallows input (locked demo)', swallowed)
            pg.wait_for_function("FIS.tutorial === 'help'", timeout=30000)   # 等"看"演示完成（钓满 K+题成）
            q = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and q['got'][0] == 0, str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> next target fish', ghost_shown)
            n = play_level(pg, tag='[2b] ')       # "帮"首次钓对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_fishcolor")'))
            check('fis.tutSeen persisted', (saved.get('fis') or {}).get('tutSeen') is True, str(saved.get('fis')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. 章 4 混排（flat15）：三题型 + 近似干扰 + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.FIS && FIS.currentLevel', timeout=8000)
            lv = pg.evaluate('FIS.currentLevel')
            check('ch4 level start at flat=15', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            kinds = pg.evaluate('genLevel(15).quizzes.map(q => q.kind)')
            check('ch4 mixed kinds: all 3 types present', len(set(kinds)) == 3, str(kinds))
            near = pg.evaluate('''() => {
              const NEAR = {red:['orange'], orange:['red','yellow'], yellow:['orange'],
                            blue:['purple'], purple:['blue'], green:[], pink:[], black:[], white:[]};
              const q = FIS.quiz, t = q.targets[0];
              return q.fishes.filter(f => q.targets.indexOf(f.c) < 0 &&
                (NEAR[t].indexOf(f.c) >= 0 || (NEAR[f.c] || []).indexOf(t) >= 0)).length;
            }''')
            check('ch4 single question: near-pair distractor fish >=2 on field', near >= 2, 'nearFish=%s' % near)
            q15 = quiz_of(pg)
            wi = next(k for k, f in enumerate(q15['fishes']) if f['c'] != q15['targets'][q15['act']])
            wait_fish_present(pg)
            click_fish(pg, wi)                    # 真实点近似色干扰鱼：躲开不计数
            pg.wait_for_timeout(350)
            wig = pg.evaluate('!!document.querySelector(".animal[data-i=\\"%d\\"].wig")' % wi)
            cnt = pg.evaluate('FIS.currentLevel.caught')
            check('tap near-pair fish: wiggle dodge, no catch (zero penalty)',
                  wig and cnt == 0, 'wig=%s caught=%s' % (wig, cnt))
            n = play_level(pg, tag='[2c] ')
            check('ch4 real-click win', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('FIS.currentLevel')
            check('ch4 win proceeds to flat=16', lv2 and lv2['flat'] == 16, str(lv2))
            ctx.close()

            # ---- 2d. 章 3 间色（flat10）：无间色鱼 + 序错=wrong + 按序合成真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.FIS && FIS.currentLevel', timeout=8000)
            lv = pg.evaluate('FIS.currentLevel')
            check('ch3 mix level start at flat=10', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            q10 = quiz_of(pg)
            check('ch3 first quiz is mix kind', q10 and q10['kind'] == 'mix' and
                  q10['need'] == [1, 1] and q10['targets'][0] != q10['targets'][1],
                  'kind=%s mix=%s' % (q10['kind'], q10.get('mix')))
            nomix = all(f['c'] != q10['mix'] for f in q10['fishes'])
            comp = [sum(1 for f in q10['fishes'] if f['c'] == c) for c in q10['targets']]
            check('mix field: no target-color fish + 2 components x2', nomix and comp == [2, 2],
                  'mix=%s comp=%s' % (q10['mix'], comp))
            early = next(k for k, f in enumerate(q10['fishes']) if f['c'] == q10['targets'][1])
            wait_fish_present(pg)
            click_fish(pg, early)                 # 先点第二成分：序错躲开零惩罚
            pg.wait_for_timeout(350)
            r_early = pg.evaluate('''() => ({retries: FIS.currentLevel.retries,
              step: FIS.currentLevel.step, caught: FIS.currentLevel.caught})''')
            check('mix early-2nd-component tap: wrong dodge, zero penalty',
                  r_early['retries'] == 1 and r_early['step'] == 0 and r_early['caught'] == 0, str(r_early))
            n = play_level(pg, tag='[2d] ')
            check('ch3 mix real-click win (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('FIS.currentLevel')
            check('ch3 win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            ctx.close()

            # ---- 2e. wall-clock 时长硬指标（r7 ≥40s/关）：flat1 章1 / flat12 章3 ----
            for flats, tag, want_flat in [((0,), 'wc1', 1), (tuple(range(12)), 'wc3', 12)]:
                ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
                ctx.add_init_script(preset_save(tut_seen=True, done_flats=flats, bonus=30))
                pg = ctx.new_page(); watch(pg, tag)
                pg.goto(URL)
                pg.wait_for_function('window.FIS && FIS.currentLevel', timeout=8000)
                lv = pg.evaluate('FIS.currentLevel')
                check('%s start flat ok' % tag, lv['flat'] == want_flat, str(lv['flat']))
                ms, celeb = play_timed(pg, tag)
                check('%s wall-clock level >=40s (listening+dwell 3.2s/catch)' % tag,
                      ms >= 40000, 'elapsed=%.0fms' % ms)
                check('%s celebrate shown' % tag, celeb)
                ctx.close()

            # ---- 3+4. 双 viewport：overflowX==0、触摸目标(含游动实时盒)、距离 ≥90、截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.FIS && FIS.currentLevel', timeout=8000)
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
                  const fish = [...document.querySelectorAll('.animal')].map(b => {
                    const r = b.getBoundingClientRect();
                    const sw = b.querySelector('.swim');
                    const sr = sw ? sw.getBoundingClientRect() : r;   // 游动实时盒
                    return {x: r.left + r.width / 2, y: r.top + r.height / 2,
                            w: r.width, h: r.height, lw: sr.width, lh: sr.height};
                  });
                  let minD = 1e9;
                  for (let i = 0; i < fish.length; i++)
                    for (let j = i + 1; j < fish.length; j++) {
                      const d = Math.hypot(fish[i].x - fish[j].x, fish[i].y - fish[j].y);
                      if (d < minD) minD = d;
                    }
                  const hitMin = fish.length ? Math.round(Math.min(...fish.map(a => Math.min(a.w, a.h)))) : 0;
                  const liveMin = fish.length ? Math.round(Math.min(...fish.map(a => Math.min(a.lw, a.lh)))) : 0;
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad, fish: fish.length,
                          minD: Math.round(minD), hitMin: hitMin, liveMin: liveMin};
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64' % vp, not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d fish >=64 (button + live swim box) & center-dist >=90' % vp,
                      m['hitMin'] >= 64 and m['liveMin'] >= 64 and m['minD'] >= 90 and m['fish'] >= 6,
                      'fish=%d hit=%d live=%d minD=%d' % (m['fish'], m['hitMin'], m['liveMin'], m['minD']))
                shot = SHOTS / ('fishcolor-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d non-blank (stdev>10)' % vp, ok, detail)
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
