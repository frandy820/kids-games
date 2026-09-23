# -*- coding: utf-8 -*-
"""share _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + 0 pageerror
2. Python 侧独立对账（SPEC-BATCH23 §0.53/§2 + SPEC-R22-SHARE 文字口径重算，不引用页面引擎）：
   a. 判定规则：全部 (n,k,counts) 组合态 spec_judge vs 页面 engJudge 全等（含 r22 k4）
   b. 章池约束：flat 0-39 全部题独立复算——split 池（ch1/2/3 REM14）+ r22 dch4 cmp/rev 域
      （CMP_WHO/CMP_DIFF 唯一性+opts / REV x*k）+ ch3 恰 2 题 k4 聚合
   c. r22 作答语义对拍：pickAnimal/pickNum 的 wrong/same/right Python 复算全等
3. 两击制 UI 状态机：未选糖点碗 false、pick/swap/drop、takeBack 联动 miss++、
   SH.start(12) 外部切关生效（b21 三款系统性遗漏教训）
4. 双 viewport(1280x800/800x1180) k2/k3/k4/cmp 作答关：糖/碗内糖/站/数字钮/问号钮 ≥64、
   overflowX≤0、截图像素非空白
5. 正常模式（非 verify 页）真实主流程：全新存档 → 教学自动触发（看→帮）→
   真实 pointer 两击制分完 flat0 → celebrate → 写档 kidsgame_share stars=3
6b. r22 ansSeen 种档断言：种 ansSeen:true → flat15（dch4）无 .tease（一次性语义）
静音双保险：每页面 goto 前挂静音 init_script（speak/Audio no-op）+种档 sound:false（r19 外放事故纪律）"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []

# 静音双保险 init_script（r19 教训：speechSynthesis no-op + Audio.play 派发 ended + 种档 sound:false）
# 审查M2连带：种子档须含 core 默认档全字段（dailyMin 等）——极简档在页面满 60s 时
# session.settle() 读 save.dailyMin[today] 抛 pageerror（r22 修复闭环实测抓出）
MUTE = """(() => {
  try {
    const _d = new Date();
    const _t = _d.getFullYear() + '-' + String(_d.getMonth()+1).padStart(2,'0') + '-' + String(_d.getDate()).padStart(2,'0');
    localStorage.setItem('kidsgame_share', JSON.stringify({v:'1.0',game:'share',
      firstDay:_t, lastDay:_t, levels:{}, dailyMin:{},
      settings:{sound:false,tts:false,vol:0}}));
  } catch(e){}
  window.speechSynthesis && (speechSynthesis.speak = () => {}, speechSynthesis.cancel = () => {});
  const ap = Audio.prototype.play; Audio.prototype.play = function(){ try{ this.dispatchEvent(new Event('ended')); }catch(e){} return Promise.resolve(); };
})();"""


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


# ---------- Python 独立判定口径（SPEC §0.53/§2 文字逐条转译，禁抄页面 engJudge） ----------
def py_judge(n, k, counts):
    tray = n - sum(counts)
    equal = all(c == counts[0] for c in counts)
    if equal and tray == 0:
        return 'complete'                       # 每碗相等且糖分完
    if n % k != 0 and equal and 0 < tray < k:
        return 'plate'                          # 剩余题：每碗相等且剩 <K 放盘
    return 'none'                               # 不等/有剩 >=K = 未完成（无错误路径）


# ---------- Python 独立章池（SPEC-BATCH23 §2 + SPEC-R22-SHARE §R2/§R3——四方同步红线之一） ----------
PY_POOL_D2 = {2, 4, 6, 8, 10}                       # ch1 平分 2 份
PY_POOL_D3 = {3, 6, 9, 12}                          # ch2 平分 3 份
PY_POOL_REM = {(5, 2), (5, 3), (7, 2), (7, 3), (8, 3), (10, 3), (11, 2), (11, 3)}
PY_POOL_REM4 = {(5, 4), (6, 4), (7, 4), (9, 4), (10, 4), (11, 4)}   # r22 k4 剩余六对
PY_CMP_WHO = [(4, 2), (4, 3), (5, 3), (5, 4), (6, 4), (6, 5),
              (3, 2, 2), (4, 2, 2), (4, 3, 3), (5, 3, 3), (3, 2, 2, 2)]
PY_CMP_DIFF = [(3, 2), (4, 2), (5, 2), (5, 3), (6, 3), (6, 4), (7, 4),
               (4, 3, 1), (4, 3, 2), (5, 3, 2), (5, 4, 2)]
PY_REV_XK = {(2, 2), (2, 3), (2, 4), (3, 2), (3, 3), (3, 4)}


def py_param_ok(dch, q):
    """SPEC 独立复算一题参数合法性（q=quiz dict；split=池+整除口径 / cmp·rev=域+唯一性+opts）"""
    n, k, mode = q['n'], q['k'], q.get('mode', 'split')
    if mode == 'split':
        if k not in (2, 3, 4):
            return False
        if dch == 1:
            return k == 2 and n in PY_POOL_D2 and n % k == 0
        if dch == 2:
            return k == 3 and n in PY_POOL_D3 and n % k == 0
        if dch == 3:
            return ((n, k) in PY_POOL_REM or (n, k) in PY_POOL_REM4) and n % k != 0
        return False                             # r22 dch4 无 split 题
    if dch != 4:
        return False
    dist = tuple(q['bowls'])
    if mode == 'cmp':
        if dist.count(max(dist)) != 1:
            return False                         # 唯一最多
        if q['ask'] == 'who':
            return dist in PY_CMP_WHO
        if q['ask'] != 'diff':
            return False
        d = max(dist) - min(dist)
        if dist not in PY_CMP_DIFF or not (1 <= d <= 3) or dist.count(min(dist)) != 1:
            return False
        opts = q.get('opts')
        return bool(opts) and len(opts) == 4 and len(set(opts)) == 4 and \
            d in opts and all(1 <= v <= 5 for v in opts)
    if mode == 'rev':
        x = q.get('x')
        if (x, k) not in PY_REV_XK or n != x * k:
            return False
        opts = q.get('opts')
        return bool(opts) and len(opts) == 4 and len(set(opts)) == 4 and \
            n in opts and all(1 <= v <= 12 for v in opts)
    return False


def main():
    page_errors, http_reqs = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()                          # 独立 headless，不弹不连不杀
        page = browser.new_page()
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('request', lambda r: http_reqs.append(r.url) if r.url.startswith('http') else None)
        page.add_init_script(MUTE)                             # 静音双保险（每 goto 生效，r19 纪律）

        # ---- 1. verify=1 自检 ----
        page.goto(URL + '?verify=1')
        title = ''
        for _ in range(120):                                   # runVerify 异步（教学链+布局冒烟），轮询 title
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

        # ---- 2a. Python 独立判定规则全组合对拍（含 r22 k4） ----
        cases = []
        for n, k in [(2, 2), (6, 2), (10, 2), (3, 3), (9, 3), (12, 3), (5, 2), (7, 3), (8, 3), (11, 3),
                     (5, 4), (11, 4)]:
            if k == 2:
                for a in range(n + 1):
                    for b in range(n - a + 1):
                        cases.append((n, k, [a, b]))
            elif k == 3:
                for a in range(n + 1):
                    for b in range(n - a + 1):
                        for c in range(n - a - b + 1):
                            cases.append((n, k, [a, b, c]))
            else:
                for a in range(n + 1):
                    for b in range(n - a + 1):
                        for c in range(n - a - b + 1):
                            for d in range(n - a - b - c + 1):
                                cases.append((n, k, [a, b, c, d]))
        got = page.evaluate('''cs => cs.map(([n,k,counts]) => {
          const q = mkQuiz(n, k, ANIMAL_KEYS.slice(0, k));
          let used = 0;
          for (let j = 0; j < k; j++) for (let t = 0; t < counts[j]; t++) q._bowlIds[j].push(used++);
          q.trayIds = [];
          for (let id = used; id < n; id++) q.trayIds.push(id);
          return engJudge(q);
        })''', cases)
        bad = [(c, g, py_judge(c[0], c[1], c[2])) for c, g in zip(cases, got) if g != py_judge(c[0], c[1], c[2])]
        check('python-side judge parity (%d cases, incl k4)' % len(cases), not bad, bad[:3])

        # ---- 2a2. r22 作答语义对拍（pickAnimal/pickNum：wrong/same/right Python 复算；
        #     每钮全新 genLevel 实例——一次 engAdvance 后同题再调返 null，状态污染陷阱） ----
        ans_cases = page.evaluate('''() => {
          const out = [];
          const L0 = genLevel(15);                       // dch4 首（qi0=cmp-who）
          const q1 = L0.quizzes[0];
          for (let j = 0; j < q1.k; j++) {
            const L = genLevel(15);
            out.push(['animal', j, engPickAnimal(L, j), q1.dist]);
          }
          const L2 = genLevel(15);                       // 数字钮题（找首道 opts 题）
          let qi = -1, q = null;
          for (let i = 0; i < 5; i++) { if (L2.quizzes[i].opts) { qi = i; q = L2.quizzes[i]; break; } }
          if (q) {
            for (let t = 0; t < q.opts.length; t++) {
              const L = genLevel(15);
              for (let m = 0; m < qi; m++) {             // 前面题正确作答推进到目标题
                const qq = L.quizzes[m];
                if (qq.mode === 'cmp' && qq.ask === 'who') {
                  let j = 0;
                  for (let s = 1; s < qq.k; s++) if (qq.dist[s] > qq.dist[j]) j = s;
                  engPickAnimal(L, j);
                } else if (qq.opts) {
                  const a = qq.mode === 'rev' ? qq.x * qq.k
                          : Math.max.apply(null, qq.dist) - Math.min.apply(null, qq.dist);
                  engPickNum(L, qq.opts.indexOf(a));
                }
              }
              out.push(['num', qi, t, engPickNum(L, t), q.opts[t], q.mode, q.x, q.k, q.dist]);
            }
          }
          return out;
        }''')
        bad2 = []
        for row in ans_cases:
            if row[0] == 'animal':
                _, j, r, dist = row
                # cmp-who（SPEC 独立域：唯一 argmax=right / 其余 wrong）
                want = 'right' if dist[j] == max(dist) else 'wrong'
                if r != want:
                    bad2.append((row, want))
            else:
                _, qi, t, r, val, mode, x, k, dist = row
                ans = x * k if mode == 'rev' else max(dist) - min(dist)
                want = 'right' if val == ans else 'wrong'
                if r != want:
                    bad2.append((row, want))
        check('python-side answer parity (r22 pickAnimal/pickNum)', not bad2, bad2[:3])

        # ---- 2b. Python 独立章池约束（flat 0-39 全题独立复算 + ch3 恰 2 题 k4 聚合） ----
        params = page.evaluate('''() => {
          const r = [];
          for (let f = 0; f < 40; f++) {
            const L = genLevel(f);
            r.push([f, L.dch, L.quizzes.map(q => q.mode === 'split'
              ? {mode:'split', n:q.n, k:q.k}
              : {mode:q.mode, ask:q.ask, x:q.x, n:q.n, k:q.k, bowls:q._bowlIds.map(a=>a.length), opts:q.opts})]);
          }
          return r;
        }''')
        badp = []
        k4_bad = []
        flat0q0_ok = params[0][2][0] == {'mode': 'split', 'n': 2, 'k': 2}   # 教学演示题钉 (2,2)
        for f, dch, qs in params:
            n_k4 = 0
            for q in qs:
                if not py_param_ok(dch, q):
                    badp.append((f, dch, q))
                if dch == 3 and q.get('k') == 4:
                    n_k4 += 1
            if dch == 3 and n_k4 != 2:
                k4_bad.append((f, n_k4))               # r22 ch3 恰 2 题 k4（Python 聚合）
        check('python-side chapter pools (r22 REM14+cmp/rev 域; flat0 q0 = [2,2])',
              not badp and flat0q0_ok, {'bad': badp[:3], 'flat0q0': params[0][2][0]})
        check('python-side dch3 exactly-2 k4 (r22)', not k4_bad, k4_bad[:3])

        # ---- 3. 两击制 UI 状态机 + SH.start(12) 外部切关 ----
        page.evaluate('SH.start(0)')
        st = page.evaluate('''async () => {
          const out = {};
          out.noSel = await SH.tapBowl(0);                    // 未选糖点碗=无效 false
          out.pick = SH.tapCandy(0);                          // 提起
          out.drop = SH.tapCandy(0);                          // 放回
          SH.tapCandy(1);
          out.swap = SH.tapCandy(0);                          // 换选
          out.badCandy = SH.tapCandy(99);                     // 越界=无效
          out.move = await SH.tapBowl(0);                     // quiz0 (2,2)：[1,0]
          out.q1 = SH.quiz;
          SH.tapCandy(0);
          out.right = await SH.tapBowl(1);                    // [1,1] → right 推进
          out.q2 = SH.quiz;
          return out;
        }''')
        sm_ok = (st['noSel'] is False and st['pick'] == 'pick' and st['drop'] == 'drop' and
                 st['swap'] == 'swap' and st['badCandy'] is False and st['move'] == 'moved' and
                 st['q1']['bowls'] == [1, 0] and st['q1']['tray'] == 1 and
                 st['right'] == 'right' and st['q2']['step'] == 1 and st['q2']['tray'] == st['q2']['n'])
        check('UI two-click state machine', sm_ok, st)
        tb = page.evaluate('''async () => {
          const b = { miss0: SH.currentLevel.miss };
          SH.tapCandy(0);
          await SH.tapBowl(0);
          b.put = { tray: SH.quiz.tray, b0: SH.quiz.bowls[0] };
          b.back = await SH.takeBack(0, 0);
          b.after = SH.quiz;
          b.lvMiss = SH.currentLevel.miss;
          return b;
        }''')
        tb_ok = (tb['back'] == tb['put']['b0'] - 1 and tb['after']['tray'] == tb['put']['tray'] + 1 and
                 tb['after']['bowls'][0] == tb['put']['b0'] - 1 and
                 tb['after']['miss'] == 1 and tb['lvMiss'] == tb['miss0'] + 1)
        check('UI takeBack semantics (miss++)', tb_ok, tb)
        page.evaluate('SH.start(12)')
        lv = page.evaluate('() => SH.currentLevel')
        check('SH.start(12) takes effect', lv['flat'] == 12 and lv['ch'] == 3 and lv['dch'] == 3, lv)

        # ---- 4. 双 viewport 布局 + 截图非空白（k2/k3/k4 分糖关 + r22 dch4 作答关） ----
        flats = page.evaluate('''() => {
          let k2 = -1, k3 = -1, k4 = -1;
          for (let f = 0; f < 40; f++) {
            const q0 = genLevel(f).quizzes[0];
            if (k2 < 0 && q0.k === 2 && q0.n >= 8) k2 = f;
            if (k3 < 0 && q0.k === 3 && q0.n % 3 !== 0) k3 = f;
            if (k4 < 0 && q0.k === 4 && (q0.mode || 'split') === 'split') k4 = f;
          }
          return [k2 < 0 ? 1 : k2, k3 < 0 ? 10 : k3, k4 < 0 ? 10 : k4, 15];
        }''')
        for w, h, flat in [(1280, 800, flats[0]), (800, 1180, flats[0]),
                           (1280, 800, flats[1]), (800, 1180, flats[1]),
                           (1280, 800, flats[2]), (800, 1180, flats[2]),
                           (1280, 800, flats[3]), (800, 1180, flats[3])]:
            page.set_viewport_size({'width': w, 'height': h})
            page.goto(URL + '?verify=1')
            t = ''                                        # 等 runVerify 跑完再接管（防并行 startLevel 抢测）
            for _ in range(200):
                page.wait_for_timeout(500)
                t = page.title()
                if t.startswith('VERIFY'):
                    break
            if not t.startswith('VERIFY PASS'):
                check('layout %dx%d flat%d (verify page ready)' % (w, h, flat), False, t)
                continue
            page.evaluate('SH.start(%d)' % flat)
            page.wait_for_timeout(200)
            m = page.evaluate('''async () => {
              const q = cur.quizzes[cur.step];
              const isAns = !!q.mode && q.mode !== 'split';
              if (!isAns) {
                const placed = q.n - 1;
                const per = Math.floor(placed / q.k), rem = placed % q.k;
                for (let j = 0; j < q.k; j++) {
                  const cnt = per + (j < rem ? 1 : 0);
                  for (let t = 0; t < cnt; t++) { SH.tapCandy(0); await SH.tapBowl(j); }
                }
              }
              const cs = [...document.querySelectorAll('.candy')].map(b => [b.offsetWidth, b.offsetHeight]);
              const bs = [...document.querySelectorAll('.bcandy')].map(b => [b.offsetWidth, b.offsetHeight]);
              const ss = [...document.querySelectorAll('.station')].map(b => [b.offsetWidth, b.offsetHeight]);
              const nk = [...document.querySelectorAll('.numkey, .askbtn')].map(b => [b.offsetWidth, b.offsetHeight]);
              const p = document.getElementById('btn-plate');
              const g = document.getElementById('game');
              const f = a => a.length ? Math.min(...a.flat()) : 9999;
              return { n: q.n, k: q.k, mode: q.mode || 'split', nc: cs.length, nb: bs.length,
                       ns: ss.length, nk: nk.length, minC: f(cs), minB: f(bs), minS: f(ss), minK: f(nk),
                       plate: [p.offsetWidth, p.offsetHeight],
                       plateOn: p.classList.contains('show'),
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
            ok = ((m['mode'] != 'split' or (m['nc'] >= 1 and m['minC'] >= 64)) and
                  m['nb'] >= 1 and m['minB'] >= 64 and m['ns'] == m['k'] and m['minS'] >= 64 and
                  (m['nk'] == 0 or m['minK'] >= 64) and
                  (not m['plateOn'] or (m['plate'][0] >= 64 and m['plate'][1] >= 64)) and
                  m['ox'] <= 0 and nonblank)
            check('layout %dx%d flat%d (n=%d k=%d %s)' % (w, h, flat, m['n'], m['k'], m['mode']), ok,
                  {'minC': m['minC'], 'minB': m['minB'], 'minS': m['minS'], 'minK': m['minK'],
                   'plate': m['plate'], 'ox': m['ox'], 'pixelSd': round(sd, 1)})

        # ---- 5. 正常模式（非 verify 页）真实主流程：教学 → pointer 两击制通关 flat0 ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx.add_init_script(MUTE)                   # 静音双保险（r19 外放事故纪律——含正常模式）
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        pg2.goto(URL)
        tut = ''
        for _ in range(40):                       # watch ≈7s（真实 SPEED=1）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('SH.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__shDemoR')
        check('normal-mode tutorial watch->help', tut == 'help' and demo_r == 'right',
              {'tut': tut, '__shDemoR': demo_r})
        # 真实 pointer 两击制逐题分完（help 首次入碗即放手 solo；最少糖碗策略）
        guard = 0
        while guard < 220:
            guard += 1
            st = pg2.evaluate('''() => {
              const q = SH.quiz;
              if (!q) return null;
              let j = 0;
              for (let i = 1; i < q.bowls.length; i++) if (q.bowls[i] < q.bowls[j]) j = i;
              return { done: SH.currentLevel.done, ready: q.ready, sel: q.sel, j: j };
            }''')
            if not st or st['done']:
                break
            if st['ready']:
                pg2.click('#btn-plate', timeout=5000, force=True)   # .wants/.ready 无限动画→force 跳过稳定等待
                pg2.wait_for_timeout(2300)        # 判对窗 1600ms + 读题
                continue
            if st['sel'] is None:
                # timeout 5000 > 判对演出窗 3200ms：题际交界 SH.quiz 已是下一题而 DOM 新糖在窗后渲染，
                # locator 等待需能穿过演出窗（3000 临界竞态实锤——r22 实测挂点）
                pg2.click('.candy[data-i="0"]', timeout=5000, force=True)
                pg2.wait_for_timeout(150)
                continue
            pg2.click('.station[data-j="%d"]' % st['j'], timeout=5000, force=True)
            pg2.wait_for_timeout(400)             # 飞糖 busy 240ms（真实页）后释放
        lv_done = pg2.evaluate('() => SH.currentLevel.done')
        cel = False
        for _ in range(16):                       # 轮询 4800ms > 判对演出窗 3200ms（done→winFlow 有窗，
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('SH.currentLevel.won')   # 8×300 临界竞态实锤——r22 扩窗）
            if cel:
                break
            pg2.wait_for_timeout(300)
        pg2.wait_for_timeout(3200)                # celebrate 2.3s + pass 写档
        sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_share")||"null")')
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('normal-mode solve & celebrate & save',
              lv_done and cel and (sv or {}).get('v') == '1.0' and
              (sv or {}).get('share', {}).get('tutSeen') and st1.get('stars') == 3,
              {'done': lv_done, 'celebrate': cel, 'v': (sv or {}).get('v'),
               'tutSeen': (sv or {}).get('share'), 'stars10': st1.get('stars')})
        # ---- 5b. dch4 作答面真实 pointer 通关（审查M2）：flat15 含一次故意错选 ----
        pg2.evaluate('SH.start(15)')
        guard5 = 0
        wrong_done = saw_who = saw_num = False
        qmiss_mid = -1
        while guard5 < 60:
            guard5 += 1
            st2 = pg2.evaluate('() => ({done: SH.currentLevel.done, quiz: SH.quiz})')
            if st2['done'] or not st2['quiz']:
                break
            qz = st2['quiz']
            if qz['mode'] == 'split':
                errs2.append('flat15 意外 split 题')
                break
            if qz['ask'] == 'who':
                saw_who = True
                bowls = qz['bowls']
                j = bowls.index(max(bowls))
                if not wrong_done:
                    pg2.click('.station[data-j="%d"]' % ((j + 1) % len(bowls)), timeout=5000)
                    pg2.wait_for_timeout(600)      # 报数让位窗（M1 修复后 wrong 延迟 500ms）
                    qmiss_mid = pg2.evaluate('() => SH.currentLevel ? SH.currentLevel.qmiss : -1')
                    wrong_done = True
                pg2.click('.station[data-j="%d"]' % j, timeout=5000)
            else:
                saw_num = True
                bowls = qz['bowls']
                ans = qz['x'] * qz['k'] if qz['mode'] == 'rev' else max(bowls) - min(bowls)
                i = qz['opts'].index(ans)
                if not wrong_done:
                    pg2.click('.numkey[data-i="%d"]' % ((i + 1) % len(qz['opts'])), timeout=5000)
                    pg2.wait_for_timeout(600)
                    qmiss_mid = pg2.evaluate('() => SH.currentLevel ? SH.currentLevel.qmiss : -1')
                    wrong_done = True
                pg2.click('.numkey[data-i="%d"]' % i, timeout=5000)
            pg2.wait_for_timeout(3700)             # finishQuiz 3200ms 演出窗（真实页 SPEED=1）
        pg2.wait_for_timeout(2600)                 # celebrate 2.3s + pass 写档（proceed 或已切新关，
                                                   # 终态以存档为准——通关后内存 cur 不可靠）
        sv2 = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_share")||"null")')
        st40 = (sv2 or {}).get('levels', {}).get('4-0', {})
        check('normal-mode flat15 dch4 pointer 通关（含1次错选=2★）',
              qmiss_mid == 1 and saw_who and saw_num and st40.get('stars') == 2
              and st40.get('plays') == 1,
              {'qmiss_mid': qmiss_mid, 'save40': st40,
               'saw_who': saw_who, 'saw_num': saw_num, 'guard': guard5})
        check('0 pageerror (normal mode)', not errs2, errs2[:3])
        ctx.close()

        # ---- 6b. r22 ansSeen 种档断言（一次性预告语义）：无档=flat15 有 .tease；
        #     种 ansSeen:true=flat15 无 .tease（每存档一次，SPEC-R22 §R4） ----
        ctxA = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctxA.add_init_script(MUTE)                  # 无 ansSeen（MUTE 档=levels 空档）
        pA = ctxA.new_page()
        pA.goto(URL)
        pA.wait_for_timeout(800)
        pA.evaluate('SH.start(15)')
        teasedA = False
        for _ in range(12):                         # 50ms 轮询 1.2s（tease 次第延迟 ≤4×260ms）
            pA.wait_for_timeout(50)
            if pA.evaluate('!!document.querySelector(".numkey.tease, .askbtn.tease, .station.tease")'):
                teasedA = True
                break
        ctxA.close()
        ctxB = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctxB.add_init_script(MUTE.replace(
            'levels:{},',
            'levels:{},share:{tutSeen:true,ansSeen:true},'))   # 种档：已预告过
        pB = ctxB.new_page()
        pB.goto(URL)
        pB.wait_for_timeout(800)
        pB.evaluate('SH.start(15)')
        pB.wait_for_timeout(1200)                   # 1.2s 静默观察窗
        teasedB = pB.evaluate('!!document.querySelector(".numkey.tease, .askbtn.tease, .station.tease")')
        ctxB.close()
        check('r22 ansSeen one-shot tease (no-save=tease / ansSeen=true=none)',
              teasedA and not teasedB, {'fresh': teasedA, 'seeded': teasedB})

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
