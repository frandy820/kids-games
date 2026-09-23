# -*- coding: utf-8 -*-
"""colormix _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r21（SPEC-R21-COLORMIX）：章型=ch2 恰2二级+3浅原色 / ch3 恰2棕+3浅二级 / ch4 配方反推
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + 0 pageerror
2. Python 侧独立混色表对账（SPEC-R21 §R3 文字口径重算，不引用页面 MIX 表）：
   {红,黄,蓝,白}全部非空子集 + 带重复样例（含白+两原色=浅二级）→ 页面 engMix 对拍全等
3. FIFO 缸语义：genLevel(0) 序列 [红,黄,蓝,红,红] → pot=[蓝,红,红]（第 4/5 罐替换最早球）
   + 集合未变步='same' 不罚 + 超深后按新 contents 重算（purple）
4. CM.start(12) 外部切关生效（b21 三款系统性遗漏教训）+ UI 级 tapJar FIFO 对账
   + r21 反推关驱动（flat15：Python 侧推导正确卡索引 pickRecipe 全通关 3★）
5. 双 viewport(1280x800/800x1180) ch1 罐/ch4 反推配方卡：≥64、overflowX≤0、截图像素非空白
6. 正常模式真实主流程（教学→通关→写档）——MUTE 静音双保险（r19 外放事故纪律：
   每页面 goto 前挂静音 init_script + 种档 sound:false）
"""
import itertools, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []

# 静音双保险 init_script（r19 教训：speechSynthesis no-op + Audio.play 派发 ended + 种档 sound:false）
MUTE = """(() => {
  try { localStorage.setItem('kidsgame_colormix', JSON.stringify({v:'1.0',game:'colormix',levels:{},settings:{sound:false,tts:false,vol:0}})); } catch(e){}
  window.speechSynthesis && (speechSynthesis.speak = () => {}, speechSynthesis.cancel = () => {});
  const ap = Audio.prototype.play; Audio.prototype.play = function(){ try{ this.dispatchEvent(new Event('ended')); }catch(e){} return Promise.resolve(); };
})();"""


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


# ---------- Python 独立混色口径（SPEC-R21-COLORMIX §R3 文字逐条转译，禁抄页面 MIX 表） ----------
def py_mix(colors):
    s = set(colors)
    if len(s) == 1:
        return next(iter(s))                                   # 单色=原色
    if 'white' in s:
        rest = s - {'white'}
        if len(rest) == 1:
            return 'light' + next(iter(rest))                  # 白+单原色=浅原色
        if rest == {'red', 'yellow'}: return 'lightorange'     # 白+红黄=浅橙（传递组合律）
        if rest == {'yellow', 'blue'}: return 'lightgreen'     # 白+黄蓝=浅绿
        if rest == {'red', 'blue'}: return 'lightpurple'       # 白+红蓝=浅紫
        return 'mud'                                           # 白+三原色（4 色）=表外兜底
    if len(s) == 2:
        if s == {'red', 'yellow'}: return 'orange'             # 红+黄=橙
        if s == {'yellow', 'blue'}: return 'green'             # 黄+蓝=绿
        if s == {'red', 'blue'}: return 'purple'               # 红+蓝=紫
    if s == {'red', 'yellow', 'blue'}: return 'brown'          # 红+黄+蓝=棕
    return 'mud'


def main():
    page_errors, http_reqs = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()                          # 独立 headless，不弹不连不杀
        page = browser.new_page()
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('request', lambda r: http_reqs.append(r.url) if r.url.startswith('http') else None)
        page.add_init_script(MUTE)                             # 静音双保险（每 goto 生效）

        # ---- 1. verify=1 自检 ----
        page.goto(URL + '?verify=1')
        title = ''
        for _ in range(120):                                   # runVerify 异步（教学链+冒烟），轮询 title
            page.wait_for_timeout(500)
            title = page.title()
            if title.startswith('VERIFY'):
                break
        check('verify title', title.startswith('VERIFY PASS') and '/' in title, title)
        raw = page.eval_on_selector('#verify-result', 'el => el.textContent')
        out = json.loads(raw)
        check('verify pass==total', out['pass'] == out['total'], "%s/%s" % (out['pass'], out['total']))
        check('verify layoutOk', out['layoutOk'] is True)
        units_fail = {k: v for k, v in out['units'].items() if not v.get('ok')}
        smokes_fail = {k: v for k, v in out['smokes'].items() if not v.get('ok')}
        lv_fail = {k: v for k, v in {**out['levels'], **out['gen']}.items() if not v.get('ok')}
        check('verify units all green', not units_fail, units_fail)
        check('verify smokes all green', not smokes_fail, smokes_fail)
        check('verify 40 levels all green', not lv_fail and len(out['levels']) + len(out['gen']) == 40,
              'n=%d' % (len(out['levels']) + len(out['gen'])))
        check('0 pageerror (verify page)', not page_errors, page_errors[:3])

        # ---- 2. Python 独立混色表全组合对账 ----
        base = ['red', 'yellow', 'blue', 'white']
        cases = []
        for n in range(1, 5):
            for combo in itertools.combinations(base, n):
                cases.append(list(combo))
        cases += [['red', 'red'], ['red', 'red', 'blue'], ['white', 'white'],
                  ['red', 'yellow', 'red'], ['blue', 'yellow', 'yellow'],
                  ['red', 'yellow', 'blue', 'white']]          # 缸深3截不到4球，集合口径兜底
        got = page.evaluate('cs => cs.map(c => engMix(c))', cases)
        bad = [(c, g, py_mix(c)) for c, g in zip(cases, got) if g != py_mix(c)]
        check('python-side mix table parity (%d cases)' % len(cases), not bad, bad[:3])

        # ---- 3. FIFO 缸语义（引擎级，genLevel(0) 题0=green 绝无中途 right） ----
        fifo = page.evaluate('''() => {
          const L = genLevel(0), q = L.quizzes[0];
          const seq = ['red','yellow','blue','red','red'].map(c => engTapJar(L, c));
          return { target: q.target, seq: seq, pot: q.pot, result: q.result, tries: q.tries };
        }''')
        check('fifo depth3 shift', fifo['pot'] == ['blue', 'red', 'red'], fifo['pot'])
        check('fifo recompute result', fifo['result'] == 'purple', fifo['result'])
        check('fifo same-not-judged',
              fifo['seq'] == ['wrong', 'wrong', 'wrong', 'same', 'wrong'], fifo['seq'])
        check('fifo tries = 4 (same 不罚)', fifo['tries'] == 4, fifo['tries'])

        # ---- 4. CM.start(12) 外部切关 + UI 级 tapJar FIFO + r21 反推关驱动 ----
        page.evaluate('CM.start(12)')
        lv = page.evaluate('() => CM.currentLevel')
        check('CM.start(12) takes effect', lv['flat'] == 12 and lv['ch'] == 3 and lv['dch'] == 3, lv)
        page.evaluate('CM.start(0)')
        seq_r = []
        for c in ['red', 'yellow', 'blue', 'red', 'red']:
            seq_r.append(page.evaluate('c => CM.tapJar(c)', c))
        qz = page.evaluate('() => CM.quiz')
        check('UI tapJar fifo parity', qz['pot'] == ['blue', 'red', 'red'] and qz['result'] == 'purple',
              {'pot': qz['pot'], 'result': qz['result']})
        check('UI tapJar miss = 4 tries (same 不罚)', qz['tries'] == 4 and qz['miss'] == 4, qz['tries'])

        # ---- 4b. r21 反推关驱动（flat15=dch4：Python 侧推导正确卡索引 → pickRecipe 全通关）----
        page.evaluate('CM.start(15)')
        drv_ok, drv_note = True, []
        for k in range(5):
            q15 = page.evaluate('() => CM.quiz')
            if not q15 or q15.get('mode') != 'reverse' or len(q15['picks']) != 3:
                drv_ok, drv_note = False, 'quiz%d 结构 %s' % (k, q15)
                break
            n_right = sum(1 for p in q15['picks'] if py_mix(p) == q15['target'])
            if n_right != 1:                                   # 正确卡恰 1（干扰族独立复算）
                drv_ok, drv_note = False, 'quiz%d 正确卡 %d' % (k, n_right)
                break
            idx = next(i for i, p in enumerate(q15['picks']) if py_mix(p) == q15['target'])
            r15 = page.evaluate('(i) => (async () => { try { return await CM.pickRecipe(i) } catch(e){ return "ERR" } })()', idx)
            exp = 'done' if k == 4 else 'right'
            if r15 != exp:
                drv_ok, drv_note = False, 'quiz%d pick=%s' % (k, r15)
                break
            page.wait_for_timeout(120)
        lv15 = page.evaluate('() => CM.currentLevel')
        check('r21 reverse-drive flat15 (5 题 pickRecipe 全通关 3★)',
              drv_ok and lv15['done'] and lv15['miss'] == 0 and lv15['stars'] == 3,
              drv_note or lv15)

        # ---- 5. 双 viewport 布局 + 截图非空白（正常模式页；r21：flat35=dch4 量配方卡） ----
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 35), (800, 1180, 35)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.goto(URL + '?verify=1')
            page.wait_for_timeout(300)
            page.evaluate('CM.start(%d)' % flat)
            page.wait_for_timeout(200)
            m = page.evaluate('''() => {
              const jars = [...document.querySelectorAll('.jar, .recipick')].map(b => [b.offsetWidth, b.offsetHeight]);
              const t = document.getElementById('target-card');
              const g = document.getElementById('game');
              return { jars: jars, minWH: jars.length ? Math.min(...jars.flat()) : 0,
                       tgt: [t.offsetWidth, t.offsetHeight],
                       ox: Math.max(g.scrollWidth - g.clientWidth,
                                    document.documentElement.scrollWidth - document.documentElement.clientWidth) };
            }''')
            shot = HERE / '_shots' / ('vp%d_%d_f%d.png' % (w, h, flat))
            shot.parent.mkdir(exist_ok=True)
            page.screenshot(path=str(shot))
            try:
                from PIL import Image
                import statistics
                im = Image.open(str(shot)).convert('L').resize((160, 100))
                sd = statistics.pstdev(list(im.getdata()))
                nonblank = sd > 10
            except ImportError:
                nonblank, sd = shot.stat().st_size > 30000, -1
            check('layout %dx%d flat%d' % (w, h, flat),
                  m['minWH'] >= 64 and m['tgt'][0] >= 64 and m['tgt'][1] >= 64 and m['ox'] <= 0 and nonblank,
                  {'minWH': m['minWH'], 'tgt': m['tgt'], 'ox': m['ox'], 'pixelSd': round(sd, 1)})

        # ---- 6. 正常模式（非 verify 页）真实主流程：全新存档 → 教学自动触发（看→帮）
        #      → 真实 pointer 点罐调绿 → 4 题原色直击通关 → celebrate → 写档 stars=3
        #      （MUTE 静音双保险：ctx 级 init_script，防外放事故 r19） ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx.add_init_script(MUTE)
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        pg2.goto(URL)
        tut = ''
        for _ in range(40):                       # watch ≈6.2s（真实 SPEED=1）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('CM.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__cmDemoR')
        check('normal-mode tutorial watch->help', tut == 'help' and demo_r == 'right',
              {'tut': tut, '__cmDemoR': demo_r})
        # 真实 pointer 逐题调色（help 首点即放手 solo；每题按配方点罐；r21 补浅二级配方）
        guard = 0
        while guard < 60:
            guard += 1
            st = pg2.evaluate('() => ({done: CM.currentLevel.done, target: CM.quiz && CM.quiz.target})')
            if st['done']:
                break
            rec = {'red': ['red'], 'yellow': ['yellow'], 'blue': ['blue'],
                   'orange': ['red', 'yellow'], 'green': ['yellow', 'blue'],
                   'purple': ['red', 'blue'], 'brown': ['red', 'yellow', 'blue'],
                   'lightred': ['red', 'white'], 'lightyellow': ['yellow', 'white'],
                   'lightblue': ['blue', 'white'],
                   'lightorange': ['red', 'yellow', 'white'],
                   'lightgreen': ['yellow', 'blue', 'white'],
                   'lightpurple': ['red', 'blue', 'white']}[st['target']]
            for c in rec:
                pg2.click('.jar[data-color="%s"]' % c, timeout=3000)
                pg2.wait_for_timeout(350)         # busy 占位锁 240ms（真实页 SPEED=1）后释放
            pg2.wait_for_timeout(900)             # right 演出窗 650ms + 读题
        cel = False
        for _ in range(8):                        # celebrate 层存在 2.3s，轮询抓取
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('CM.currentLevel.done')
            if cel:
                break
            pg2.wait_for_timeout(300)
        pg2.wait_for_timeout(3200)                # celebrate 2.3s + pass 写档
        sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_colormix")||"null")')
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('normal-mode solve & celebrate & save',
              cel and (sv or {}).get('colormix', {}).get('tutSeen') and st1.get('stars') == 3,
              {'celebrate_or_done': cel, 'tutSeen': (sv or {}).get('colormix'),
               'stars10': st1.get('stars')})
        # ---- 6b. revSeen 一次性语义（审查 m3 补门禁面）：置内存档 revSeen:true →
        #      flat15（dch4 反推）首题渲染全程无 .tease（50ms 轮询防瞬态漏检）。
        #      注：must走 KIDS._save() 内存引用——maybeRevIntro 读内存档，直写 localStorage
        #      不更新内存态（本测试首轮 FAIL 根因）；写档路径本体由试玩 D4 实证 ----
        pg2.evaluate('''() => {
          const sv = KIDS._save();
          sv.colormix = sv.colormix || {}; sv.colormix.revSeen = true;
          CM.start(15);
        }''')
        rev_mode = pg2.evaluate('CM.quiz && CM.quiz.mode')
        saw_tease = False
        for _ in range(24):                        # 采 1.2s：tease 次第 150-450ms+bounce 窗
            if pg2.evaluate('!!document.querySelector(".recipick.tease")'):
                saw_tease = True
                break
            pg2.wait_for_timeout(50)
        check('revSeen seeded -> no tease (flat15 rev)', (not saw_tease) and rev_mode == 'reverse',
              {'tease_seen': saw_tease, 'mode': rev_mode})
        check('0 pageerror (normal mode)', not errs2, errs2[:3])
        ctx.close()

        # ---- 离线复核：全程无 http(s) 请求（file:// 本页除外） ----
        check('offline (no http requests)', not [u for u in http_reqs if not u.startswith('file://')],
              [u for u in http_reqs if not u.startswith('file://')][:3])
        check('0 pageerror (overall)', not page_errors, page_errors[:3])
        browser.close()

    fails = [r for r in RESULTS if not r[1]]
    print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
    if fails:
        for n, _, d in fails:
            print('FAIL:', n, d)
        sys.exit(1)


if __name__ == '__main__':
    main()
