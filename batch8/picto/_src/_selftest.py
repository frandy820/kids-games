# -*- coding: utf-8 -*-
"""picto _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 40 关审计全绿 + r12 delta 单元
    （40 字库/形近对 19 实锤新对 ≥6/ch2+恒 3-4 全形近/evo 在场/时长模型 ≥40s 对账）
2a. 预置存档(跳过教学) → 真实点击：首错(灰掉+零惩罚+不pulse+灰卡重点again) → 通关 .k-celebrate 2星
    → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(真实点击+钩子输入全被吞)→帮(幽灵手指)→独 真实链路 → pic.tutSeen 持久化
2c. 章 3 形近辨析（flat10）：干扰 ∈同形近族(sameFam)+恒 3-4 选 + 真实点击通关 → flat11
2d. 章 4 字源推演（flat15）：evo 题面=两段演变[data-k0 古形, data-k 甲骨]+问号、题面零字形泄漏
    （判定=推演非匹配）→ 真实点击通关
3. 双 viewport(1280x800/800x1180)×(章1 字卡/章2 图卡/章4 evo)：overflowX==0、触摸目标 ≥64
    （排除 .k-parentbtn）、选项卡 ≥96、象形图 SVG ≥64、汉字 ≥80px、截图像素非空白
4. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
5. 救援钟（§0.7a）：flat≥3 静置 → 14s 阈值触发重读题面；中途错点不重置救援钟
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
        'v': '1.0', 'game': 'picto', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'pic': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_picto", ' + json.dumps(json.dumps(save)) + ')'


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


def click_opt(page, i):
    loc = page.locator('.opt[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def quiz_of(page):
    return page.evaluate('PIC.quiz')


def play_level(page, first_wrong=False, tag=''):
    """真实点击打完当前关：每题点正确卡；（首题可选先错一次：灰掉零惩罚+灰卡重点 again）"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = quiz_of(page)
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = next(i for i in range(len(q['options'])) if i != q['answerIdx'])
            click_opt(page, wi)
            page.wait_for_timeout(420)
            lv = page.evaluate('PIC.currentLevel')
            breathe = page.evaluate('!!document.querySelector(".opt.breathe")')
            dim = page.evaluate('!!document.querySelector(".opt.dim")')
            check('%swrong tap: dim / no pulse / zero penalty' % tag,
                  lv['misses'] == 1 and lv['step'] == q['step'] and dim and not breathe,
                  'misses=%s step=%s dim=%s breathe=%s' % (lv['misses'], lv['step'], dim, breathe))
            again = page.evaluate('PIC.tapOption(%d)' % wi)   # 灰卡重点（钩子路径）：again 零惩罚
            lv2 = page.evaluate('PIC.currentLevel')
            check('%sgrey re-tap -> again (zero penalty)' % tag,
                  again == 'again' and lv2['misses'] == 1 and lv2['step'] == q['step'], 'r=%s' % again)
            continue
        click_opt(page, q['answerIdx'])
        page.wait_for_timeout(2400)              # > 组词演出窗 1900ms + 渲染
        answered += 1
    page.wait_for_selector('.k-celebrate', timeout=20000)
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
            d = vj['units']['delta']
            check('verify r12 delta: 40-char lib + 19 pairs (new>=6) + sentinel',
                  d['keys40'] and d['pairs'] and d['newPairs'] >= 6 and d['sentinel'],
                  str({k: d[k] for k in ('keys40', 'pairs', 'newPairs', 'sentinel')}))
            check('verify r12 delta: coverage d1=40/d2=d3=d4=18/evo=12 + pools',
                  d['coverage'] and d['pools'], str(d['cov']))
            check('verify r12 delta: 46 clips embedded + evo DOM unit',
                  d['clips46'] and vj['units']['evoDom']['ok'], str(vj['units']['evoDom']))
            check('verify r12 duration model: durMin >= 40000 (levels all >=40s)',
                  d['durMin'] >= 40000 and d['estMs'] and d['n4Levels'] >= 5,
                  'durMin=%s n4=%s' % (d['durMin'], d['n4Levels']))
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + 真实点击通关（2 星） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.PIC && PIC.currentLevel', timeout=8000)
            lv = pg.evaluate('PIC.currentLevel')
            check('start at 1-0 (ch 1-based)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('PIC.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook shape (toChar 2-opt / target in options / answered=false)',
                  q and q['mode'] == 'toChar' and q['nOpt'] == 2 and len(q['options']) == 2 and
                  q['target'] in q['options'] and q['answered'] is False and q['char'] == '日',
                  'mode=%s char=%s opts=%s' % (q['mode'], q['char'], q['options']))
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('answered 5 quizzes by real click', n == 5, 'answered=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong tap)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('PIC.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_picto")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.PIC && PIC.currentLevel', timeout=8000)
            pg.wait_for_function("PIC.tutorial === 'watch'", timeout=5000)
            # 演示期真实点击被吞（locked 吞输入）：点正确卡中心 → 关卡不推进
            q0 = quiz_of(pg)
            click_opt(pg, q0['answerIdx'])
            pg.wait_for_timeout(400)
            swallowed_real = pg.evaluate('PIC.currentLevel.step') == 0 and \
                pg.evaluate('PIC.currentLevel.misses') == 0
            swallowed_hook = pg.evaluate('PIC.tapOption(0)') is False
            check('tutorial watch swallows real click + hook input', swallowed_real and swallowed_hook,
                  'real=%s hook=%s' % (swallowed_real, swallowed_hook))
            pg.wait_for_function("PIC.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and
                  q['answered'] is False and q['miss'] == 0, str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> correct option', ghost_shown)
            n = play_level(pg, tag='[2b] ')      # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_picto")'))
            check('pic.tutSeen persisted', (saved.get('pic') or {}).get('tutSeen') is True, str(saved.get('pic')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. 章 3 形近辨析（flat10）：干扰 ∈同形近族 + 恒 3-4 选 + 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.PIC && PIC.currentLevel', timeout=8000)
            lv = pg.evaluate('PIC.currentLevel')
            check('ch3 level start at flat=10 (dch 3)', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            near = pg.evaluate('''() => {
              const q = PIC.quiz;
              return {distr: q.distractors, nOpt: q.nOpt,
                      ok: q.distractors.every(k => sameFam(k, q.target)) && q.nOpt >= 3 && q.nOpt <= 4,
                      chars: q.distractors.map(k => PIC_BY[k].ch)};
            }''')
            check('ch3: distractors all same-family + 3-4 options', near['ok'],
                  'target=%s distractors=%s(%s) nOpt=%s' % (quiz_of(pg)['char'], near['chars'], near['distr'], near['nOpt']))
            n = play_level(pg, tag='[2c] ')
            check('ch3 real-click win', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('PIC.currentLevel')
            check('ch3 win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            ctx.close()

            # ---- 2d. 章 4 字源推演（flat15）：evo 题面两段演变+零字形泄漏 → 真实通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.PIC && PIC.currentLevel', timeout=8000)
            lv = pg.evaluate('PIC.currentLevel')
            check('ch4 level start at flat=15 (dch 4)', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            evo_seen = False
            for _ in range(2):                    # 前两题答对 → 第 3 题=evo（MIX_PAT[2]）
                q = quiz_of(pg)
                click_opt(pg, q['answerIdx'])
                pg.wait_for_timeout(2400)
            q3 = quiz_of(pg)
            evo = pg.evaluate('''() => {
              const q = PIC.quiz;
              const s0 = document.querySelector('#prompt-card .pic.p0');
              const s1 = document.querySelector('#prompt-card .pic[data-k]');
              return {evo: q.evo, mode: q.mode, nOpt: q.nOpt,
                      k0: s0 ? s0.getAttribute('data-k0') : null,
                      k1: s1 ? s1.getAttribute('data-k') : null,
                      q: !!document.querySelector('#prompt-card .evo-q'),
                      leak: !!document.querySelector('#prompt-card .zi'),
                      zi: document.querySelector('#prompt-card .zi') ? document.querySelector('#prompt-card .zi').textContent : null,
                      fam: q.distractors.every(k => sameFam(k, q.target))};
            }''') if q3 else {}
            evo_seen = evo.get('evo') is True and evo.get('mode') == 'evo'
            check('ch4 evo question reached (MIX_PAT step2)', evo_seen and q3 is not None, str(q3 and q3.get('mode')))
            check('evo prompt = [archaic data-k0 -> oracle data-k -> ?] with no glyph leak',
                  evo_seen and evo['k0'] == q3['target'] and evo['k1'] == q3['target'] and
                  evo['q'] and not evo['leak'] and evo['fam'] and 3 <= evo['nOpt'] <= 4,
                  str({k: evo.get(k) for k in ('k0', 'k1', 'q', 'leak', 'fam', 'nOpt')}))
            n = play_level(pg, tag='[2d] ')      # 从 evo 题继续打完（前 2 题已点 → 余 3 题）
            check('ch4 real-click win (evo included)', n == 3, 'answered=%d (+2 pre-clicked)' % n)
            ctx.close()

            # ---- 3. 双 viewport ×（章1 字卡 flat2 / 章2 图卡 flat7 / 章4 evo flat15）：几何+截图 ----
            for vp in [(1280, 800), (800, 1180)]:
                for tag, done in [('zi', range(2)), ('pic', range(7)), ('evo', range(15))]:
                    ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                    pg = ctx.new_page(); watch(pg, 'vp%d-%s' % (vp[0], tag))
                    pg.add_init_script(preset_save(tut_seen=True, done_flats=done, bonus=30))
                    pg.goto(URL)
                    pg.wait_for_function('window.PIC && PIC.currentLevel', timeout=8000)
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
                      const opts = [...document.querySelectorAll('.opt')].map(e => e.getBoundingClientRect());
                      const optMin = opts.length ? Math.min(...opts.map(r => Math.min(r.width, r.height))) : 0;
                      const svgs = [...document.querySelectorAll('.opt .pic')].map(e => e.getBoundingClientRect());
                      const svgMin = svgs.length ? Math.min(...svgs.map(r => Math.min(r.width, r.height))) : -1;
                      const zi = document.querySelector('.opt .zi');
                      const font = zi ? parseFloat(getComputedStyle(zi).fontSize) : -1;
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad, nOpt: opts.length,
                              optMin: Math.round(optMin), svgMin: Math.round(svgMin), font: font};
                    }''')
                    check('vp %dx%d [%s] overflowX==0' % (vp + (tag,)), m['ox'] == 0, 'ox=%s' % m['ox'])
                    check('vp %dx%d [%s] touch targets >=64 (excl .k-parentbtn)' % (vp + (tag,)),
                          not m['bad'], str(m['bad'][:4]))
                    check('vp %dx%d [%s] option cards >=96 & pict SVG >=64 & char >=80px' % (vp + (tag,)),
                          m['optMin'] >= 96 and (m['svgMin'] < 0 or m['svgMin'] >= 64) and
                          (m['font'] < 0 or m['font'] >= 80),
                          'optMin=%s svgMin=%s font=%s' % (m['optMin'], m['svgMin'], m['font']))
                    shot = SHOTS / ('picto-vp%dx%d-%s.png' % (vp + (tag,)))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot)
                    check('screenshot %dx%d [%s] non-blank' % (vp + (tag,)), ok, detail)
                    ctx.close()

            # ---- 5. 救援钟（§0.7a）：flat3 静置；中途错点不重置救援钟 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=[0, 1, 2], bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.PIC && PIC.currentLevel', timeout=8000)
            lv = pg.evaluate('PIC.currentLevel')
            check('rescue test starts at flat=3 (>=3)', lv and lv['flat'] == 3, str(lv))
            pg.evaluate('''() => {           // 包装发声 API 记日志（rescue=play(pic_q1/pic_q2)）
              window.__vlog = [];
              window.__t0 = Date.now();
              for (const m of ['play', 'queue']) {
                const orig = KIDS.voice[m].bind(KIDS.voice);
                KIDS.voice[m] = function () {
                  window.__vlog.push([Date.now() - window.__t0, m, arguments[0] || '', arguments[1] || '']);
                  return orig.apply(this, arguments);
                };
              }
            }''')
            pg.wait_for_timeout(5000)            # t=5s：真实错点一张（不得重置救援钟）
            qw = quiz_of(pg)
            wi = next(i for i in range(len(qw['options'])) if i != qw['answerIdx'])
            click_opt(pg, wi)
            pg.wait_for_timeout(11_500)          # t=16.5s：若未重置应在 ~14s 触发救援；若被重置则 ~19s 尚无
            log = pg.evaluate('window.__vlog')
            wrong_at_5s = [e for e in log if e[1] == 'play' and e[2] == 'pic_wrong' and 4000 < e[0] < 7000]
            rescue = [e for e in log if e[1] == 'play' and e[2] in ('pic_q1', 'pic_q2') and e[0] > 13000]
            check('rescue fires at ~14s idle (re-reads quiz speech)', len(rescue) >= 1,
                  str([e for e in log if e[1] == 'play']))
            check('wrong tap at 5s did NOT reset rescue clock',
                  len(rescue) >= 1 and rescue[0][0] <= 17000 and len(wrong_at_5s) >= 1,
                  'rescue_at=%s wrong=%s' % (rescue[0][0] if rescue else None, len(wrong_at_5s)))
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
