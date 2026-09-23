# -*- coding: utf-8 -*-
"""shapeshome _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r8 难度改造（2026-09-14，AUDIT-56 #14）后口径：
1. ?verify=1 → title=VERIFY PASS（3-15s 轮询）+ JSON pass==total + levels/gen/units/smokes 全绿
   （含 40 关确定性 / 三题型规则（tri 恰差一维 / neg 恰违反一条件 / grid 恰对一规则）/ 热身 /
   ch4 hard 参数 / 混排题序 / 教学链 / sayW 三态 / clipOk（r8 新键）/ 开场 queue 链 /
   时长硬断言 ≥40s modeled + estMs 字面 / nextHint 章末独立副本）
2a. 预置存档(跳过教学) → 真实点击通关第 1 关 flat0（tri 三维）：首错零惩罚不 pulse →
    .k-celebrate 2星 → 写档 → levels['1-0'].stars>=1 → 推进 flat=1
2b. 全新存档 → 教学期乱点不跳（locked 吞输入 + 轻叮 sfx('pop')，flat/step 不变）→
    看(吞输入)→帮(幽灵手指)→独 真实链路 → shp.tutSeen 持久化
2c. 第 11 关 flat10（章 3 九宫格，种档）：grid 钩子结构（行恒形/列恒色/缺格/热身）+
    第2题起恰对一规则 + 真实点击通关 → levels['3-0'].stars>=1
3. flat≥3 救援钟：真实错点不重置 → 静置 16s 救援触发（重读题面(play 通道文本) + 正确卡 breathe 循环）
4. 双 viewport(1280x800/800x1180)：overflowX==0、按钮 >=64（.k-parentbtn 豁免）、卡 >=96、
    图形 SVG >=64、截图非空白
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

SAVE_KEY = 'kidsgame_shapeshome'

# 静音纪律（2026-09-19 用户三诉外放后全线强制）：任何 goto 前先挂 ctx 级静音——
# speechSynthesis.speak no-op + Audio.play/pause no-op（5ms 补发 ended 防 queue 链卡）+
# AudioContext 工厂接管（sfx 无声）。模板同 test/t46_speak0_gate.py INIT_SND。
SND = """(() => {
  const noop = () => {};
  try { const ss = window.speechSynthesis;   // 方法级 patch（整体对象替换在本 chromium 无效=假静音）
    if (ss) { ss.speak = function () {}; ss.cancel = noop; ss.pause = noop; ss.resume = noop; } } catch (e) {}
  try { const proto = window.Audio.prototype;
    proto.play = function () { const s = this;
      setTimeout(function () { try { s.dispatchEvent(new Event('ended')); } catch (e) {} }, 5);
      return Promise.resolve(); };
    proto.pause = noop; } catch (e) {}
  try { const OC = window.AudioContext || window.webkitAudioContext;
    if (OC) { const S = function () { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 44100;
      this.destination = {}; this.listener = {};
      this.createOscillator = () => ({ connect: noop, start: noop, stop: noop,
        frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop,
        linearRampToValueAtTime: noop }, type: '' });
      this.createBuffer = () => ({ getChannelData: () => new Float32Array(0) });
      this.createBufferSource = () => ({ buffer: null, connect: noop, start: noop, stop: noop });
      this.createBiquadFilter = () => ({ connect: noop, start: noop, stop: noop, type: '',
        frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop,
        linearRampToValueAtTime: noop } });
      this.createGain = () => ({ connect: noop, gain: { value: 0, setValueAtTime: noop,
        exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop } });
      this.resume = () => Promise.resolve(); this.close = () => Promise.resolve(); };
      window.AudioContext = S; window.webkitAudioContext = S; } } catch (e) {}
})();"""



def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'shapeshome', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'shp': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("%s", %s)' % (SAVE_KEY, json.dumps(json.dumps(save)))


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


def play_level(page, first_wrong=False, tag=''):
    """真实点击送完当前关（每题点正确卡；首题可选先错一次）"""
    wrong_done = not first_wrong
    clicks = 0
    for _ in range(14):
        q = page.evaluate('SP.quiz')
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = next(i for i in range(3) if i != q['answerIdx'])
            click_card(page, wi)
            page.wait_for_timeout(450)
            st = page.evaluate('''() => {
              const lv = SP.currentLevel;
              const el = document.querySelector('.card[data-i="' + SP.quiz.answerIdx + '"]');
              return {retries: lv.retries, step: lv.step, won: lv.won,
                      pulse: !!(el && el.classList.contains('pulse')),
                      grey: !!document.querySelector('.card.wrong')};
            }''')
            check('%sfirst wrong: zero penalty / no pulse / greyed' % tag,
                  st['retries'] == 1 and st['step'] == 0 and not st['won'] and
                  not st['pulse'] and st['grey'], str(st))
            continue
        click_card(page, q['answerIdx'])
        clicks += 1
        page.wait_for_timeout(1300)              # > 答对演出窗 980ms
    page.wait_for_selector('.k-celebrate', timeout=15000)
    return clicks


def read_save(page):
    return json.loads(page.evaluate('localStorage.getItem("%s")' % SAVE_KEY) or 'null')


def main():
    offline_bad = []
    page_errors = []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    with sync_playwright() as p:
        browser = p.chromium.launch()


        def sctx(viewport=None):
            ctx = browser.new_context(**(viewport and {'viewport': viewport} or {}))
            ctx.add_init_script(SND)
            return ctx

        try:
            # ---- 1. verify=1 ----
            ctx = sctx({'width': 1280, 'height': 800})
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
            check('verify cover: 6 colors x 4 shapes x 2 sizes x neg/grid x 4 chapters x 9 miss cells',
                  vj['units']['cover']['ok'], str(vj['units']['cover']))
            check('verify duration hard floor (r8 >=40s modeled + estMs literals + speech copy)',
                  vj['units']['duration']['ok'] and vj['units']['duration']['minMs'] >= 40000,
                  str(vj['units']['duration']))
            check('verify nextHint chapter-end independent copies (M1/F contract)',
                  vj['units']['hints']['ok'], str(vj['units']['hints']))
            check('verify sayW three states', vj['units']['sayW']['ok'], str(vj['units']['sayW']))
            check('verify tutorial chain', vj['units']['tutorial']['ok'], str(vj['units']['tutorial']))
            check('verify clips injected (r8 new keys + legacy)', vj['units']['clips']['ok'])
            check('verify opening queue chain + replay', vj['units']['chain']['ok'])
            check('verify swallow pop feedback', vj['units']['swallow']['ok'])
            check('verify mix level flat15 kind cycle smoke', vj['smokes']['flat15']['ok'],
                  str(vj['smokes']['flat15']))
            ctx.close()

            # ---- 2a. 第 1 关 flat0（tri 三维）：首错零惩罚 + 真实点击通关（2 星）→ 等 5.2s 读档 ----
            ctx = sctx({'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.SP && SP.currentLevel', timeout=8000)
            lv = pg.evaluate('SP.currentLevel')
            check('start at 1-0 (ch 1-based, kind=tri)', lv and lv['ch'] == 1 and lv['lv'] == 0
                  and lv['flat'] == 0 and lv['dch'] == 1, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('SP.tutorial') == 'none')
            q = pg.evaluate('SP.quiz')
            check('quiz hook shape (kind=tri / tz in big|small / 3 options / answerIdx 3-dim match)',
                  q and q['kind'] == 'tri' and q['tz'] in ('big', 'small') and len(q['options']) == 3 and
                  q['options'][q['answerIdx']]['c'] == q['tc'] and
                  q['options'][q['answerIdx']]['s'] == q['ts'] and
                  q['options'][q['answerIdx']]['z'] == q['tz'], str(q))
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('level 1 real-click win: 5 quizzes delivered home', n == 5, 'correct clicks=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(5200)            # celebrate 2.3s 收起 + 写档 + 推进（>5.2s 再读）
            saved = read_save(pg)
            stars_saved = (saved or {}).get('levels', {}).get('1-0', {}).get('stars', 0)
            check("save levels['1-0'].stars >= 1 after celebrate", stars_saved >= 1,
                  'stars=%s' % stars_saved)
            lv2 = pg.evaluate('SP.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            ctx.close()

            # ---- 2b. 全新存档：教学期乱点不跳（吞输入+pop）→ 看→帮→独 真实链路 ----
            ctx = sctx({'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.SP && SP.currentLevel', timeout=8000)
            pg.wait_for_function("SP.tutorial === 'watch'", timeout=5000)
            pg.evaluate('''() => { window.__sfx = []; const o = KIDS.audio.sfx;
              KIDS.audio.sfx = (n) => { window.__sfx.push(n); return o.call(KIDS.audio, n); }; }''')
            # 教学演示期真实乱点第一张卡：locked 吞输入 + 轻叮 pop + 关/步不跳
            click_card(pg, 0)
            pg.wait_for_timeout(300)
            st = pg.evaluate('''() => ({sfx: window.__sfx.slice(),
              flat: SP.currentLevel.flat, step: SP.currentLevel.step,
              retries: SP.currentLevel.retries, tut: SP.tutorial})''')
            check('tutorial watch: random tap swallowed with pop sfx, level not skipped',
                  st['tut'] == 'watch' and st['flat'] == 0 and st['step'] == 0 and
                  st['retries'] == 0 and 'pop' in st['sfx'], str(st))
            pg.wait_for_function("SP.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = pg.evaluate('SP.quiz')
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0, str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')",
                                     timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> correct card', ghost_shown)
            n = play_level(pg, tag='[2b] ')
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'clicks=%d' % n)
            pg.wait_for_timeout(5200)
            saved = read_save(pg)
            check('shp.tutSeen persisted', (saved.get('shp') or {}).get('tutSeen') is True)
            check('tutorial level 1-0 saved with stars>=1',
                  (saved.get('levels', {}).get('1-0', {}) or {}).get('stars', 0) >= 1,
                  str(saved.get('levels')))
            ctx.close()

            # ---- 2c. 第 11 关 flat10（章 3 九宫格，种档）：结构断言 + 真实通关 ----
            ctx = sctx({'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.SP && SP.currentLevel', timeout=8000)
            lv = pg.evaluate('SP.currentLevel')
            check('level 11 starts at flat=10 (ch3 grid)', lv and lv['flat'] == 10 and
                  lv['dch'] == 3 and lv['ch'] == 3, str(lv))
            q = pg.evaluate('SP.quiz')
            rows_distinct = q and len(set(q['rows'])) == 3 and len(set(q['cols'])) == 3
            warm_ok = all(q['options'][i]['c'] != q['cols'][q['miss']['c']] and
                          q['options'][i]['s'] != q['rows'][q['miss']['r']]
                          for i in range(3) if i != q['answerIdx'])
            grid_dom = pg.evaluate("!!document.querySelector('#home .gmiss') && "
                                   "document.querySelectorAll('#home .gcell').length === 9")
            check('ch3 grid quiz1: rows/cols distinct + warmup distractors break both rules + ? cell on screen',
                  q and q['kind'] == 'grid' and rows_distinct and warm_ok and grid_dom, str(q))
            click_card(pg, q['answerIdx'])       # 推进第 2 题
            pg.wait_for_timeout(1300)
            q2 = pg.evaluate('SP.quiz')
            rc = [i for i in range(3) if i != q2['answerIdx'] and
                  q2['options'][i]['c'] == q2['cols'][q2['miss']['c']] and
                  q2['options'][i]['s'] != q2['rows'][q2['miss']['r']]]
            rs = [i for i in range(3) if i != q2['answerIdx'] and
                  q2['options'][i]['c'] != q2['cols'][q2['miss']['c']] and
                  q2['options'][i]['s'] == q2['rows'][q2['miss']['r']]]
            check('ch3 quiz2+: exactly one right-color-wrong-shape + one wrong-color-right-shape',
                  len(rc) == 1 and len(rs) == 1, str(q2['options']))
            n = play_level(pg, tag='[2c] ')
            check('level 11 real-click win: 5 quizzes (1 manual + 4 loop)', n == 4,
                  'loop clicks=%d' % n)
            pg.wait_for_timeout(5200)
            saved = read_save(pg)
            stars11 = (saved or {}).get('levels', {}).get('3-0', {}).get('stars', 0)
            check("save levels['3-0'].stars >= 1 after celebrate", stars11 >= 1,
                  'stars=%s' % stars11)
            ctx.close()

            # ---- 3. flat≥3 救援钟：错点不重置 → 静置 16s 救援（重读题面 + breathe 循环） ----
            ctx = sctx({'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.SP && SP.currentLevel', timeout=8000)
            lv = pg.evaluate('SP.currentLevel')
            check('rescue test starts at flat=3 (flat>=3)', lv and lv['flat'] == 3, str(lv))
            # r8 修正：题面句走 voice.play(key,text)（clip 化）——救援重读须记录 play 通道文本
            pg.evaluate('''() => { window.__say = [];
              KIDS.voice.say = (t) => { window.__say.push([String(t), Date.now()]); };
              KIDS.voice.play = (k, t) => { window.__say.push([String(t || k), Date.now()]); }; }''')
            pg.wait_for_timeout(2400)            # 开题接力读题已落地（stub 前不计）
            q = pg.evaluate('SP.quiz')
            wi = next(i for i in range(3) if i != q['answerIdx'])
            click_card(pg, wi)                   # t≈+3s 真实错点：不重置救援钟
            pg.wait_for_timeout(13600)           # 至 t≈+16.6s：不重置→救援 14s 已来
            rec = pg.evaluate('''() => ({say: window.__say,
              breathe: !!document.querySelector('.card.breathe'),
              idx: SP.quiz ? SP.quiz.answerIdx : -1})''')
            qsay = [r for r in rec['say'] if r[0].startswith('找一找')]
            ai = rec['idx']
            breathe_on_answer = pg.evaluate('''() => {
              const el = document.querySelector('.card[data-i="' + SP.quiz.answerIdx + '"]');
              return !!(el && el.classList.contains('breathe')); }''')
            check('rescue re-reads question at ~14s (wrong tap did not reset clock)',
                  len(qsay) >= 1, str(rec['say'])[:200])
            check('rescue visual: correct card breathe loop on screen', breathe_on_answer,
                  'answerIdx=%s' % ai)
            ctx.close()

            # ---- 4. 双 viewport：overflowX==0 / 触摸目标 >=64 / 卡 >=96 / SVG>=64 / 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = sctx({'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.SP && SP.currentLevel', timeout=8000)
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
                  document.querySelectorAll('.card').forEach(e => {
                    const r = e.getBoundingClientRect();
                    if (r.width < 96 || r.height < 96)
                      mainBad.push(e.className + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const svgs = [...document.querySelectorAll('.card svg')].map(s => {
                    const r = s.getBoundingClientRect(); return Math.min(r.width, r.height); });
                  const hs = document.querySelector('#home .hshape');
                  const hr = hs ? hs.getBoundingClientRect() : {width: 0, height: 0};
                  const tz = SP.quiz && SP.quiz.kind === 'tri' ? SP.quiz.tz : null;
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad, mainBad: mainBad,
                          svgMin: svgs.length ? Math.round(Math.min(...svgs)) : 0,
                          homeShape: Math.round(Math.min(hr.width, hr.height)), tz: tz};
                }''')
                # 家内目标图形：大=全幅 ≥56；小=0.6 档（大小维本体）≥36
                need = 36 if m['tz'] == 'small' else 56
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64 (excl .k-parentbtn)' % vp, not m['bad'],
                      str(m['bad'][:4]))
                check('vp %dx%d cards >=96 & svg >=64 & home shape >=%d (tz-aware)' % (vp[0], vp[1], need),
                      not m['mainBad'] and m['svgMin'] >= 64 and m['homeShape'] >= need,
                      'svgMin=%s homeShape=%s tz=%s %s' % (m['svgMin'], m['homeShape'], m['tz'], m['mainBad']))
                shot = SHOTS / ('shp-vp%dx%d.png' % vp)
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
