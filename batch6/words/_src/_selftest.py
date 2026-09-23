# -*- coding: utf-8 -*-
"""words _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r28：字库 55（ch2 声旁家族重建+ch4 19 字）/干扰 nDisEff（ch1/ch3 lv≥2 上探 3）/家族优先干扰律
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk（含 famOk 单元/六块布局腿）
2a. 预置存档(跳过教学) → 真实 pointer 点部件块进槽（槽内逐块出现）→ 干扰块晃动弹回
    → 全字拼对 → .k-celebrate 2 星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看→帮→独 真实链路 → wrd.tutSeen 持久化
2c. 章 3 三部件（flat13"树"）：乱序槽满 fail → 对槽保留错槽弹回 + 真实点击通关（r28：3 干扰 6 块）
2d. 章 2 声旁家族（flat5，r28 新形态）：家族干扰在场断言 + 真实点家族干扰块弹回 + 真实通关推进
2e. 章 4 大池（flat15，19 字池 r28）：块数 ≤6 + 家族干扰在场 + 真实通关推进 flat16
3. 双 viewport(1280x800/800x1180)：overflowX==0、部件块 ≥64、槽 ≥96、大字卡 ≥96、截图非空白
4. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
MUTE 静音双保险（r19 红线）：每 context 挂 MUTE_INIT init_script + 种档 sound:false/tts:false/vol:0
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

# 家族干扰律页内独立复算副本（与 SPEC-R28 §R3 公式一致，不复用引擎函数——同源陷阱防线）
FAM_JS = """(q) => {
  const pool = CHARS[WRD.currentLevel.dch];
  const entry = pool.find(e => e.c === q.target);
  const shared = {}, seen = {};
  entry.parts.forEach(p => { shared[p] = 1; seen[p] = 1; });
  const cands = [];
  pool.forEach(e => {
    if (e === entry || !e.parts.some(p => shared[p])) return;
    e.parts.forEach(p => { if (!seen[p]) { seen[p] = 1; cands.push(p); } });
  });
  return cands;
}"""


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'words', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0},          # MUTE 双保险之一（r19）
        'restTip': {'day': '', 'shown': 0},
        'wrd': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_words", ' + json.dumps(json.dumps(save)) + ')'


def new_ctx(browser, vp, seed=None):
    """每 context 必挂 MUTE_INIT（r19 双保险之二）+ 可选种档"""
    ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
    ctx.add_init_script(MUTE_INIT)
    if seed:
        ctx.add_init_script(seed)
    return ctx


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
        return n >= 40000, 'PNG %d bytes (PIL 不可用，按体积判定)' % n


def tap_tile(page, ch):
    """真实 pointer 点击池中字面匹配且未入槽的部件块，返回是否点到"""
    idx = page.evaluate('''(ch) => {
      const els = [...document.querySelectorAll('.tile:not(.used)')];
      const e = els.find(t => t.textContent === ch);
      return e ? +e.dataset.i : -1;
    }''', ch)
    if idx < 0:
        return False
    box = page.locator('.tile[data-i="%d"]' % idx).bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    page.wait_for_timeout(160)
    return True


def play_level(page, first_distractor=False):
    """真实点击拼完当前关：每轮取 WRD.quiz，从第一个空槽对应的部件续接点（支持乱序场景
    留下的半完成状态）；首字可选先点一次干扰块。返回完成的字数（按 target 变化计）。"""
    distr_done = not first_distractor
    solved, last_target = 0, None
    for _ in range(200):
        q = page.evaluate('WRD.quiz')
        if q is None:
            break
        if q['target'] != last_target:
            last_target = q['target']
            solved += 1
        if not distr_done:
            di = q['tileTypes'].index('d')
            box = page.locator('.tile[data-i="%d"]' % di).bounding_box()
            page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
            page.wait_for_timeout(500)
            wig = page.evaluate('!!document.querySelector(".tile[data-i=\\"%d\\"].wig")' % di)
            slots_empty = page.evaluate('WRD.quiz.slots.every(s => s === null)')
            check('distractor tile: wiggle bounce, no slot (zero penalty)', wig and slots_empty,
                  'wig=%s' % wig)
            distr_done = True
            continue
        j = next((i for i, s in enumerate(q['slots']) if s is None), None)
        if j is None:                            # 槽满判定中：等推进
            page.wait_for_timeout(400)
            continue
        if not tap_tile(page, q['parts'][j]):
            check('tile %r found' % q['parts'][j], False, 'tile missing')
            return solved
        page.wait_for_timeout(220)
        # 引擎与 DOM 同步门：最后一块触发字亮起（1900ms 演出窗口）后才 renderQuiz 重绘新题
        page.wait_for_function('''() => {
          const q = WRD.quiz; if (!q) return true;
          const els = [...document.querySelectorAll('.tile')];
          return els.length === q.tiles.length && els.every((e, i) => e.textContent === q.tiles[i]);
        }''', timeout=6000)
    page.wait_for_selector('.k-celebrate', timeout=12000)
    return solved


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
            ctx = new_ctx(browser, (1280, 800))
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
                  all(r['ok'] for r in vj['levels'].values()) and all(r['ok'] for r in vj['gen'].values()),
                  'static=%d gen=%d' % (len(vj['levels']), len(vj['gen'])))
            check('verify chapter coverage pools 12/12/12/19', vj['units']['chCov']['ok'],
                  str(vj['units']['chCov']))
            check('verify famOk (family distractor law, r28)', vj['units']['famOk']['ok'],
                  str(vj['units']['famOk']))
            ctx.close()

            # ---- 2a. 预置存档：真实点击拼字链路 + 干扰弹回 + 通关（2 星）----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.WRD && WRD.currentLevel', timeout=8000)
            lv = pg.evaluate('WRD.currentLevel')
            check('start at 1-0 (ch 1-based)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('WRD.tutorial') == 'none')
            q1 = pg.evaluate('WRD.quiz')
            check('quiz hook fields (r28: 2 distractors, 4 tiles)', q1 and q1['target'] and
                  len(q1['parts']) == 2 and
                  len(q1['distractors']) == 2 and len(q1['tiles']) == 4 and
                  q1['slots'] == [None, None], str(q1)[:120])
            # 真实 pointer 点第一块 → 槽内出现部件字
            ok1 = tap_tile(pg, q1['parts'][0])
            slot_state = pg.evaluate('WRD.quiz.slots')
            dom_slot = pg.evaluate('''() => {
              const s = document.querySelector('.slot[data-i="0"]');
              return { fill: s.classList.contains('fill'), text: s.textContent };
            }''')
            check('real tap part -> slot 0 filled (DOM + hook)', ok1 and slot_state[0] == q1['parts'][0]
                  and dom_slot['fill'] and dom_slot['text'] == q1['parts'][0],
                  'hook=%s dom=%s' % (slot_state, dom_slot))
            # 撤回：点已填槽 → 块回池
            box = pg.locator('.slot[data-i="0"]').bounding_box()
            pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
            pg.wait_for_timeout(200)
            back = pg.evaluate('WRD.quiz.slots')
            check('tap filled slot -> withdraw part', back == [None, None], str(back))
            n = play_level(pg, first_distractor=True)
            check('solved 5 words by real click', n == 5, 'words=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 miss)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('WRD.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_words")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看→帮→独 真实链路 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.WRD && WRD.currentLevel', timeout=8000)
            pg.wait_for_function("WRD.tutorial === 'help'", timeout=25000)   # 等"看"演示完成
            q = pg.evaluate('WRD.quiz')
            check('tutorial watch done -> level reset to word 0',
                  q and q['step'] == 0 and q['slots'] == [None] * len(q['parts']), str(q)[:100])
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> next tile', ghost_shown)
            n = play_level(pg)                   # "帮"首次拼对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 words)', n == 5, 'words=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_words")'))
            check('wrd.tutSeen persisted', (saved.get('wrd') or {}).get('tutSeen') is True, str(saved.get('wrd')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. 章 3 三部件（flat13 首题"树"）：乱序槽满 fail 对槽保留 + 真实通关 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, done_flats=range(13), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.WRD && WRD.currentLevel', timeout=8000)
            lv = pg.evaluate('WRD.currentLevel')
            check('ch3 level start at flat=13', lv and lv['flat'] == 13 and lv['dch'] == 3, str(lv))
            q = pg.evaluate('WRD.quiz')
            check('ch3: 3 parts + 3 distractors = 6 tiles (r28 lv3 上探)',
                  len(q['parts']) == 3 and len(q['distractors']) == 3 and len(q['tiles']) == 6,
                  'parts=%s tiles=%s' % (q['parts'], q['tiles']))
            # 乱序：parts[0] 对 → parts[2] 错 → parts[1] 错 → 槽满 fail → 对槽保留错槽弹回
            tap_tile(pg, q['parts'][0])
            tap_tile(pg, q['parts'][2])
            miss_before = pg.evaluate('WRD.currentLevel.misses')
            tap_tile(pg, q['parts'][1])
            st = pg.evaluate('WRD.quiz')
            miss_after = pg.evaluate('WRD.currentLevel.misses')
            check('disorder full-slots -> fail, right slot kept, wrong bounced',
                  st['slots'][0] == q['parts'][0] and st['slots'][1] is None and st['slots'][2] is None
                  and miss_after == miss_before + 1,
                  'slots=%s miss %d->%d' % (st['slots'], miss_before, miss_after))
            n = play_level(pg)
            check('ch3 real-click win', n == 5, 'words=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('WRD.currentLevel')
            check('ch3 win proceeds to flat=14', lv2 and lv2['flat'] == 14, str(lv2))
            ctx.close()

            # ---- 2d. 章 2 声旁家族（flat5，r28 新形态：真实页真实点击不止 verify 提速页）----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, done_flats=range(5), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.WRD && WRD.currentLevel', timeout=8000)
            lv = pg.evaluate('WRD.currentLevel')
            check('ch2 family level start at flat=5', lv and lv['flat'] == 5 and lv['dch'] == 2, str(lv))
            q = pg.evaluate('WRD.quiz')
            fam = pg.evaluate(FAM_JS, q)
            hit = [d for d in q['distractors'] if d in fam]
            check('ch2 q0 family nonempty + >=1 family distractor (r28 生成律)',
                  len(fam) > 0 and len(hit) >= 1,
                  'target=%s parts=%s fam=%s dis=%s hit=%s' % (q['target'], q['parts'], fam, q['distractors'], hit))
            check('ch2 q0 distractors disjoint from parts (反向泄题防护)',
                  not [d for d in q['distractors'] if d in q['parts']],
                  'dis=%s parts=%s' % (q['distractors'], q['parts']))
            # 真实点家族干扰块（如 晴 题点 氵=清 的形旁）→ wrong 弹回零惩罚不进槽
            fdis_idx = next(i for i, t in enumerate(q['tileTypes']) if t == 'd' and q['tiles'][i] in fam)
            box = pg.locator('.tile[data-i="%d"]' % fdis_idx).bounding_box()
            pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
            pg.wait_for_timeout(500)
            st = pg.evaluate('WRD.quiz')
            wig = pg.evaluate('!!document.querySelector(".tile[data-i=\\"%d\\"].wig")' % fdis_idx)
            check('tap family distractor -> wiggle bounce, zero penalty',
                  wig and all(s is None for s in st['slots']) and
                  pg.evaluate('WRD.currentLevel.misses') == 1,
                  'wig=%s slots=%s' % (wig, st['slots']))
            n = play_level(pg)
            check('ch2 family real-click win (5 words)', n == 5, 'words=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('WRD.currentLevel')
            check('ch2 win proceeds to flat=6', lv2 and lv2['flat'] == 6, str(lv2))
            ctx.close()

            # ---- 2e. 章 4 大池（flat17=花谢梦奶河，19 字池）：块数预算 + 家族干扰 + 真实通关 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True, done_flats=range(17), bonus=30))
            pg = ctx.new_page(); watch(pg, '2e')
            pg.goto(URL)
            pg.wait_for_function('window.WRD && WRD.currentLevel', timeout=8000)
            lv = pg.evaluate('WRD.currentLevel')
            check('ch4 big-pool level start at flat=17', lv and lv['flat'] == 17 and lv['dch'] == 4, str(lv))
            budget = pg.evaluate('''() => genLevel(17).quizzes.map(q => q.tiles.length)''')
            check('ch4 level tiles budget <=6 (r28 块预算)', all(t <= 6 for t in budget) and max(budget) == 6,
                  'tiles=%s' % budget)       # flat17 序列含 3 部件字 谢/梦 → 必现 6 块最大面
            famall = pg.evaluate('''() => {
              const L = genLevel(17);
              const pool = CHARS[4];
              const byChar = {}; pool.forEach(e => { byChar[e.c] = e; });
              const famOf = (entry) => {                 // 独立复算副本（SPEC-R28 §R3，不用引擎函数）
                const shared = {}, seen = {};
                entry.parts.forEach(p => { shared[p] = 1; seen[p] = 1; });
                const cands = [];
                pool.forEach(e => {
                  if (e === entry || !e.parts.some(p => shared[p])) return;
                  e.parts.forEach(p => { if (!seen[p]) { seen[p] = 1; cands.push(p); } });
                });
                return cands;
              };
              return L.quizzes.map(q => {
                const fam = famOf(byChar[q.c]);
                return { c: q.c, famN: fam.length, hit: q.distractors.some(d => fam.indexOf(d) >= 0) };
              });
            }''')
            check('ch4 family law: fam nonempty => distractor hit',
                  all((f['famN'] == 0) or f['hit'] for f in famall) and
                  any(f['famN'] > 0 and f['hit'] for f in famall),
                  str(famall))
            n = play_level(pg)
            check('ch4 real-click win (5 words)', n == 5, 'words=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('WRD.currentLevel')
            check('ch4 win proceeds to flat=18', lv2 and lv2['flat'] == 18, str(lv2))
            ctx.close()

            # ---- 3+4. 双 viewport：overflowX==0、触摸目标、截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = new_ctx(browser, vp, preset_save(tut_seen=True, done_flats=range(13), bonus=30))
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                pg.wait_for_function('window.WRD && WRD.currentLevel', timeout=8000)
                pg.wait_for_timeout(900)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button, [data-i], .k-btn').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.className || e.tagName) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const tiles = [...document.querySelectorAll('.tile')].map(b => b.getBoundingClientRect());
                  const slots = [...document.querySelectorAll('.slot')].map(b => b.getBoundingClientRect());
                  const tc = document.querySelector('#target-card').getBoundingClientRect();
                  return { ox: de.scrollWidth - de.clientWidth, bad: bad,
                           tiles: tiles.length,
                           tileMin: tiles.length ? Math.round(Math.min(...tiles.map(r => Math.min(r.width, r.height)))) : 0,
                           slotMin: slots.length ? Math.round(Math.min(...slots.map(r => Math.min(r.width, r.height)))) : 0,
                           card: Math.round(Math.min(tc.width, tc.height)) };
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64' % vp, not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d tiles >=64 / slots+card >=96 (ch3 lv3 6 tiles, r28)' % vp,
                      m['tileMin'] >= 64 and m['slotMin'] >= 96 and m['card'] >= 96 and m['tiles'] == 6,
                      'tile=%d slot=%d card=%d n=%d' % (m['tileMin'], m['slotMin'], m['card'], m['tiles']))
                shot = SHOTS / ('words-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d non-blank (stdev>10)' % vp, ok, detail)
                if ok:
                    shot.unlink()
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
