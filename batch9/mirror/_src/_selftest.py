# -*- coding: utf-8 -*-
"""mirror _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS（3-15s 轮询）+ JSON pass==total + levels/gen/units/smokes 全绿
   （含 40 关确定性 / dst=src 镜像坐标 / 章 2+ 原形干扰+answer=镜像形 / 两轴两规格覆盖 / SVG>=64）
2a. 预置存档(跳过教学) → 真实点击通关第 1 关 flat0：首错零惩罚不 pulse → .k-celebrate 2星 → 推进 flat=1 写档
2b. 全新存档 → 教学 看(吞输入)→帮(幽灵手指)→独 真实链路 → mir.tutSeen 持久化
2c. 第 10 关 flat10（章 3 竖轴 5×5 多色，种档）：镜像坐标断言 + 原形/异色干扰在场 + 真实点击通关
2d. flat15（章 4 横轴）：axis=h + 题面 clip=mir_q_h（点目标格重听）+ 真实点击通关
3. flat≥3 救援钟：真实错点不重置 → 静置 16s 救援触发（重读题面 stub 计数）
4. 双 viewport(1280x800/800x1180)：overflowX==0、触摸目标 >=64（含格按钮）、候选卡 >=96、SVG>=64、截图非空白
5. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex>=3 → 日限 12
RESULTS = []
SYM = ['star', 'flower', 'heart', 'circle', 'square']
ASYM = ['flag', 'fish', 'crescent', 'boot', 'broom']


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'mirror', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'mir': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_mirror", ' + json.dumps(json.dumps(save)) + ')'


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


def ans_index(q):
    a = q['answer']
    return next(i for i, o in enumerate(q['options'])
                if o['mid'] == a['mid'] and o['color'] == a['color'] and o['mirrored'] == a['mirrored'])


def click_opt(page, i):
    loc = page.locator('.opt[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def play_level(page, first_wrong=False, tag=''):
    """真实点击贴完当前关（每题贴正确卡；首题可选先错一次）"""
    wrong_done = not first_wrong
    clicks = 0
    for _ in range(12):
        q = page.evaluate('MIR.quiz')
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = next(i for i, o in enumerate(q['options'])
                      if not (o['mid'] == q['answer']['mid'] and o['color'] == q['answer']['color']
                              and o['mirrored'] == q['answer']['mirrored']))
            click_opt(page, wi)
            page.wait_for_timeout(400)
            st = page.evaluate('''() => {
              const lv = MIR.currentLevel;
              const q = MIR.quiz;
              const t = q.options.findIndex(o => o.mid === q.answer.mid &&
                o.color === q.answer.color && o.mirrored === q.answer.mirrored);
              const el = document.querySelector('.opt[data-i="'+t+'"]');
              return {retries: lv.retries, step: lv.step, won: lv.won,
                      pulse: !!(el && el.classList.contains('pulse')),
                      grey: !!document.querySelector('.opt.wrong')};
            }''')
            check('%sfirst wrong: zero penalty / no pulse / greyed' % tag,
                  st['retries'] == 1 and st['step'] == 0 and not st['won'] and
                  not st['pulse'] and st['grey'], str(st))
            continue
        click_opt(page, ans_index(q))
        clicks += 1
        page.wait_for_timeout(1250)              # > 答对演出窗 950ms
    page.wait_for_selector('.k-celebrate', timeout=15000)
    return clicks


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
            deadline = time.time() + 15
            title = ''
            while time.time() < deadline:
                title = pg.title()
                if title.startswith('VERIFY'):
                    break
                pg.wait_for_timeout(500)
            check('verify title (poll <=15s)', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify 40-level audit all ok',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify units all ok', all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']))
            check('verify mirror math (dst=mirror of src) both axes', vj['units']['mirrorMath']['ok'])
            check('verify motif/axis/size coverage over 40 levels', vj['units']['cover']['ok'],
                  str(vj['units']['cover']))
            ctx.close()

            # ---- 2a. 预置存档：第 1 关 flat0 首错零惩罚 + 真实点击通关（2 星）→ 推进写档 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.MIR && MIR.currentLevel', timeout=8000)
            lv = pg.evaluate('MIR.currentLevel')
            check('start at 1-0 (ch 1-based, v-axis 4x4)', lv and lv['ch'] == 1 and lv['lv'] == 0
                  and lv['axis'] == 'v' and lv['N'] == 4, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('MIR.tutorial') == 'none')
            q = pg.evaluate('MIR.quiz')
            check('quiz hook shape (v-axis mirror math + 3 options)',
                  q and q['axis'] == 'v' and len(q['options']) == 3 and
                  q['dst']['c'] == q['N'] - 1 - q['src']['c'] and q['dst']['r'] == q['src']['r'], str(q))
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('level 1 real-click win: 5 quizzes pasted', n == 5, 'correct clicks=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('MIR.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_mirror")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.MIR && MIR.currentLevel', timeout=8000)
            pg.wait_for_function("MIR.tutorial === 'watch'", timeout=5000)
            swallowed = pg.evaluate('MIR.tapOption(0)') is False   # 演示期真实/hook 输入全吞
            check('tutorial watch swallows input (locked demo)', swallowed)
            pg.wait_for_function("MIR.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = pg.evaluate('MIR.quiz')
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and
                  not q['answered'], str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')",
                                     timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> correct option', ghost_shown)
            n = play_level(pg, tag='[2b] ')
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'clicks=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_mirror")'))
            check('mir.tutSeen persisted', (saved.get('mir') or {}).get('tutSeen') is True)
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. 第 10 关 flat10（章 3 竖轴 5×5 多色，种档）：干扰结构 + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.MIR && MIR.currentLevel', timeout=8000)
            lv = pg.evaluate('MIR.currentLevel')
            check('ch3 level start at flat=10 (v-axis 5x5)', lv and lv['flat'] == 10 and
                  lv['dch'] == 3 and lv['axis'] == 'v' and lv['N'] == 5, str(lv))
            q = pg.evaluate('MIR.quiz')
            a = q['answer']
            orig = [o for o in q['options'] if o['mid'] == a['mid'] and o['color'] == a['color']
                    and not o['mirrored']]
            difcol = [o for o in q['options'] if o['mid'] == a['mid'] and o['mirrored']
                      and o['color'] != a['color']]
            check('ch3: original-form distractor on field (mirror soul)',
                  a['mirrored'] and len(orig) == 1 and a['mid'] in ASYM, str(q['options']))
            check('ch3: different-color distractor on field', len(difcol) == 1, str(q['options']))
            check('ch3: dst mirror coords (col N-1-c)',
                  q['dst']['c'] == 4 - q['src']['c'] and q['dst']['r'] == q['src']['r'], str(q))
            n = play_level(pg, tag='[2c] ')
            check('level 10 real-click win', n == 5, 'clicks=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('MIR.currentLevel')
            check('ch3 win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            ctx.close()

            # ---- 2d. flat15（章 4 横轴）：axis=h + 题面 mir_q_h + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.MIR && MIR.currentLevel', timeout=8000)
            lv = pg.evaluate('MIR.currentLevel')
            check('ch4 start at flat=15 (h-axis)', lv and lv['flat'] == 15 and lv['axis'] == 'h',
                  str(lv))
            q = pg.evaluate('MIR.quiz')
            check('h-axis mirror math (row N-1-r)',
                  q['dst']['r'] == q['N'] - 1 - q['src']['r'] and q['dst']['c'] == q['src']['c'],
                  str(q))
            pg.evaluate('''() => { window.__pl = []; const o = KIDS.voice.play;
              KIDS.voice.play = (k) => { window.__pl.push(k); return o.call(KIDS.voice, k); }; }''')
            box = pg.locator('#board .cell.target').bounding_box()
            pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
            pg.wait_for_timeout(300)
            plays = pg.evaluate('window.__pl')
            check('tap target cell re-reads h-axis question (mir_q_h)',
                  any(k == 'mir_q_h' for k in plays) and not any(k == 'mir_q_v' for k in plays),
                  str(plays))
            n = play_level(pg, tag='[2d] ')
            check('h-axis real-click win', n == 5, 'clicks=%d' % n)
            ctx.close()

            # ---- 3. flat≥3 救援钟：错点不重置 → 静置 16s 救援触发（14s 阈值） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.MIR && MIR.currentLevel', timeout=8000)
            lv = pg.evaluate('MIR.currentLevel')
            check('rescue test starts at flat=3 (flat>=3)', lv and lv['flat'] == 3, str(lv))
            pg.evaluate('''() => { window.__rp = [];
              KIDS.voice.play = (k) => { window.__rp.push([k, Date.now()]); };
              KIDS.voice.queue = () => {}; }''')
            pg.wait_for_timeout(2200)            # 开题读题已落地（stub 前不计）
            q = pg.evaluate('MIR.quiz')
            wi = next(i for i, o in enumerate(q['options'])
                      if not (o['mid'] == q['answer']['mid'] and o['color'] == q['answer']['color']
                              and o['mirrored'] == q['answer']['mirrored']))
            click_opt(pg, wi)                    # t≈+3s 真实错点：不重置救援钟
            pg.wait_for_timeout(13500)           # 至 t≈+16.5s：不重置→救援 14s 已来；若重置→17s 仍无
            rec = pg.evaluate('window.__rp')
            qplays = [r for r in rec if r[0] in ('mir_q_v', 'mir_q_h')]
            check('rescue re-reads question at ~14s (wrong tap did not reset clock)',
                  len(qplays) >= 1 and any(r[0] == 'mir_wrong' for r in rec), str(rec))
            ctx.close()

            # ---- 4. 双 viewport：overflowX==0 / 触摸目标 >=64 / 候选卡 >=96 / SVG>=64 / 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.MIR && MIR.currentLevel', timeout=8000)
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
                  const mainBad = [];
                  document.querySelectorAll('.opt').forEach(e => {
                    const r = e.getBoundingClientRect();
                    if (r.width < 96 || r.height < 96)
                      mainBad.push(e.className + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const svgs = [...document.querySelectorAll('.opt svg, #board .cell svg')].map(s => {
                    const r = s.getBoundingClientRect(); return Math.min(r.width, r.height); });
                  const mirror = document.querySelector('#board .mirror');
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad, mainBad: mainBad,
                          svgMin: svgs.length ? Math.round(Math.min(...svgs)) : 0,
                          mirrorCells: document.querySelectorAll('#board .cell').length};
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64 (excl .k-parentbtn)' % vp, not m['bad'],
                      str(m['bad'][:4]))
                check('vp %dx%d opt cards >=96 & svg >=64' % vp,
                      not m['mainBad'] and m['svgMin'] >= 64, 'svgMin=%s %s' % (m['svgMin'], m['mainBad']))
                shot = SHOTS / ('mirror-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d non-blank' % vp, ok, detail)
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
