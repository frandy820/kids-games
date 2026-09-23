# -*- coding: utf-8 -*-
"""storybed _selftest v2（r10 三型玩法）— headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + 0 pageerror
2. Python 侧独立对账（SPEC-BATCH30 §0.74+§6 文字口径重算，不引用页面引擎）：
   a. 流程封闭 6×4 步文本表（py 独立硬编码 vs 页面 FLOWS 逐字）
   b. 章型三题 kind 约束（flat 0-39 全题复算）：ch1 全 order 池 4（flat0q0=sleep 3 步教学特例）/
      ch2 全 order 池 4+1 干扰 / ch3 题0 恒 rain（out 5 步含带小伞）且每关 ≥2 rain、order 题流程
      ∉{out} 互异 / ch4 全 miss（链 4 步候选 4=真值+3 干扰）/ 生成关 dch 1-4；
      干扰∉本流程（stepId 域+文本域）
3. tapCard UI 状态机：flat0（3 合法卡多解）step/phase + flat5（约束+干扰）wrong/miss/doneAgain
   + 越界 null + SB.start(12) 外部切关生效（b21 三款系统性遗漏教训）
4. 双 viewport(1280x800/800x1180) 三关型布局：ch1 教学特例 3 卡 / ch3 rain 5 卡 / ch4 miss 4 候选：
   卡/槽/题面 ≥阈值、overflowX≤0、截图像素非空白
5. 正常模式（非 verify 页）真实主流程：全新存档 → 教学自动触发（看→帮→solo）→
   真实 pointer 逐点排完 flat0 → celebrate → 写档 kidsgame_storybed stars=3
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


# ---------- Python 独立流程表（SPEC-BATCH30 §0.74 字面，禁抄页面 FLOWS） ----------
PY_FLOWS = {
    'sleep':    ['刷牙', '洗脸', '穿睡衣', '上床睡觉'],
    'getup':    ['睁开眼睛', '穿衣', '刷牙', '吃早餐'],
    'washhand': ['卷起袖子', '冲湿小手', '搓搓泡泡', '擦干小手'],
    'eat':      ['洗手', '坐坐好', '吃饭饭', '擦擦嘴巴'],
    'out':      ['穿衣服', '穿鞋子', '背小书包', '出门玩'],
    'bath':     ['脱衣服', '冲冲水', '搓搓澡', '擦干穿衣'],
}
PY_RAIN_STEP = '带小伞'          # §6.2 条件步文本


def py_quiz_ok(dch, kind, flow, texts, pool_texts, pool_ids, flat, is_first):
    """章型三题独立复算：返回失败原因或 None（kind=order/rain/miss；§0.74+§6 口径）"""
    own = PY_FLOWS[flow]
    if kind == 'miss':                                    # ch4/生成 dch4：链 4 步 + 候选 4=真值+3 干扰
        if texts != own:
            return 'texts'
        if len(pool_texts) != 4 or len(pool_ids) != 4:
            return 'poolN'
        ext = [t for t, sid in zip(pool_texts, pool_ids) if sid.split('_')[0] != flow]
        if len(ext) != 3:
            return 'disN'
        if set(ext) & set(own):
            return 'disText'
        if sum(1 for sid in pool_ids if sid.split('_')[0] == flow) != 1:
            return 'truthN'                          # 池内本流程步恰 1 张=缺失步真值（链 3 步不在池）
        return None
    if kind == 'rain':                                    # ch3/生成 dch3：out 5 步含带小伞、无干扰
        if flow != 'out':
            return 'rainFlow'
        if texts != own + [PY_RAIN_STEP]:
            return 'texts'
        if len(pool_texts) != 5:
            return 'poolN'
        if any(sid.split('_')[0] != 'out' for sid in pool_ids):
            return 'rainPool'
        return None
    # order：池 4（ch1）/4+1 干扰（ch2 与 ch3 的 order 题）；flat0q0=sleep 前 3 步教学特例
    if kind != 'order':
        return 'kind'
    want_n = 3 if (flat == 0 and is_first) else 4
    if texts != own[:want_n]:
        return 'texts'
    want_d = 1 if dch in (2, 3) else 0
    if len(pool_texts) != want_n + want_d:
        return 'poolN'
    ext = [t for t, sid in zip(pool_texts, pool_ids) if sid.split('_')[0] != flow]
    if want_d == 1:
        if len(ext) != 1:
            return 'disN'
        if ext[0] in own:
            return 'disText'
    elif ext:
        return 'noDis'
    if set(texts) - set(pool_texts):
        return 'poolMiss'
    return None


def main():
    page_errors, http_reqs = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()                          # 独立 headless，不弹不连不杀
        page = browser.new_page()
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('request', lambda r: http_reqs.append(r.url) if r.url.startswith('http') else None)

        # ---- 1. verify=1 自检 ----
        page.goto(URL + '?verify=1')
        title = ''
        for _ in range(160):                                   # runVerify 异步（教学链+布局冒烟），轮询 title
            page.wait_for_timeout(500)
            title = page.title()
            if title.startswith('VERIFY'):
                break
        check('verify title', title.startswith('VERIFY PASS') and '/' in title, title)
        raw = page.eval_on_selector('#verify-result', 'el => el.textContent')
        out = json.loads(raw)
        check('verify pass==total', out['pass'] == out['total'], "%s/%s" % (out['pass'], out['total']))
        check('verify total >= 60 units', out['total'] >= 60, out['total'])
        check('verify layoutOk', out['layoutOk'] is True)
        units_fail = {k: v for k, v in out['units'].items() if not v.get('ok')}
        smokes_fail = {k: v for k, v in out['smokes'].items() if not v.get('ok')}
        lv_fail = {k: v for k, v in {**out['levels'], **out['gen']}.items() if not v.get('ok')}
        check('verify units all green', not units_fail, units_fail)
        check('verify smokes all green', not smokes_fail, smokes_fail)
        check('verify 40 levels all green', not lv_fail and len(out['levels']) + len(out['gen']) == 40,
              'n=%d' % (len(out['levels']) + len(out['gen'])))
        # 认知时长门禁抽样复核（cog≥40000 且 >anim——审计「时长全靠动画撑」正面回应）
        cog_bad = {k: (v.get('cog'), v.get('anim')) for k, v in {**out['levels'], **out['gen']}.items()
                   if v.get('cog', 0) < 40000 or v.get('cog', 1) <= v.get('anim', 0)}
        check('cog >=40000 & >anim (40 levels)', not cog_bad, dict(list(cog_bad.items())[:3]))
        check('0 pageerror (verify page)', not page_errors, page_errors[:3])

        # ---- 2a. Python 独立流程表全量对账（页面 FLOWS 逐字） ----
        got = page.evaluate('''() => {
          const r = {};
          FLOW_IDS.forEach(f => r[f] = FLOWS[f].steps.map(s => s.t));
          return {ids: FLOW_IDS.slice(), flows: r};
        }''')
        flows_ok = list(got['flows']) == list(PY_FLOWS) and \
            all(got['flows'][f] == PY_FLOWS[f] for f in PY_FLOWS)
        check('python-side flow table (6x4 verbatim)', flows_ok,
              {f: got['flows'][f] for f in PY_FLOWS if got['flows'][f] != PY_FLOWS[f]})

        # ---- 2b. Python 独立章型约束（flat 0-39 全题复算：kind 三型+池深+干扰域） ----
        params = page.evaluate('''() => {
          const r = [];
          for (let f = 0; f < 40; f++) {
            const L = genLevel(f);
            r.push([f, L.dch, L.quizzes.map(q => ({
              kind: q.kind, flow: q.flow,
              texts: q.texts.slice(),
              poolT: q.pool.map(p => p.text), poolI: q.pool.map(p => p.stepId)
            }))]);
          }
          return r;
        }''')
        badp = []
        anchor_ok = params[0][2][0]['kind'] == 'order' and params[0][2][0]['flow'] == 'sleep' and \
            params[0][2][0]['texts'] == PY_FLOWS['sleep'][:3]
        rain_anchor_ok = params[10][2][0]['kind'] == 'rain' and params[10][2][0]['flow'] == 'out'
        for f, dch, qs in params:
            kinds = [q['kind'] for q in qs]
            if dch == 1 and set(kinds) != {'order'}:
                badp.append((f, 'ch1kind'))
            if dch == 2 and set(kinds) != {'order'}:
                badp.append((f, 'ch2kind'))
            if dch == 3:
                if kinds[0] != 'rain' or kinds.count('rain') < 2:
                    badp.append((f, 'ch3rain'))
                if {q['flow'] for q in qs if q['kind'] == 'order'} & {'out'} or \
                        len({q['flow'] for q in qs if q['kind'] == 'order'}) != 5 - kinds.count('rain'):
                    badp.append((f, 'ch3orderFlow'))
            if dch == 4 and set(kinds) != {'miss'}:
                badp.append((f, 'ch4kind'))
            if dch in (1, 2, 4) and len({q['flow'] for q in qs}) != 5:
                badp.append((f, 'flowDup'))
            for i, q in enumerate(qs):
                why = py_quiz_ok(dch, q['kind'], q['flow'], q['texts'], q['poolT'], q['poolI'], f, i == 0)
                if why:
                    badp.append((f, q['kind'], q['flow'], why))
        check('python-side kind/pool rules (anchor=sleep3 & rain)', not badp and anchor_ok and rain_anchor_ok,
              {'bad': badp[:4], 'anchor0': params[0][2][0]['flow'], 'anchor10': params[10][2][0]['kind']})

        # ---- 3. tapCard UI 状态机（flat0 多解 3 卡 + flat5 约束/干扰撞点）+ SB.start(12) ----
        page.evaluate('SB.start(0)')
        st = page.evaluate('''async () => {
          const out = {};
          out.bad = await SB.tapCard(99);                     // 越界=null
          const q = SB.quiz;                                  // flat0q0=sleep 3 步：依赖裁剪后全合法（多解）
          out.ansN = q.answers.length;
          out.i0 = q.steps.findIndex(s => s.stepId === q.answers[0]);
          out.step = await SB.tapCard(out.i0);                // 合法首点='step'
          out.phase = SB.quiz.phase;
          return out;
        }''')
        page.evaluate('SB.start(5)')
        st2 = page.evaluate('''async () => {
          const out = {};
          const q = SB.quiz;                                  // ch2 order+干扰：有前置未完撞点
          out.wrongI = q.steps.findIndex(s => q.answers.indexOf(s.stepId) < 0);
          out.wrong = await SB.tapCard(out.wrongI);           // 前置未完/干扰='wrong'
          out.miss1 = SB.quiz.miss;
          out.doneAgain = await SB.tapCard(out.wrongI);       // 同一非法卡再点='wrong' 同口径
          out.miss2 = SB.quiz.miss;
          return out;
        }''')
        sm_ok = (st['bad'] is None and st['ansN'] == 3 and st['step'] == 'step' and st['phase'] == 1 and
                 st2['wrong'] == 'wrong' and st2['miss1'] == 1 and
                 st2['doneAgain'] == 'wrong' and st2['miss2'] == 2)
        check('UI tapCard state machine (multi/step/wrong)', sm_ok, {'flat0': st, 'flat5': st2})
        page.evaluate('SB.start(12)')
        lv = page.evaluate('() => SB.currentLevel')
        check('SB.start(12) takes effect', lv['flat'] == 12 and lv['ch'] == 3 and lv['dch'] == 3, lv)

        # ---- 4. 双 viewport 布局 + 截图非空白（三关型：ch1 3卡 / ch3 rain 5卡 / ch4 miss 4候选） ----
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 10), (800, 1180, 10),
                           (1280, 800, 15), (800, 1180, 15)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.goto(URL + '?verify=1')
            t = ''                                        # 等 runVerify 跑完再接管（防并行 startLevel 抢测）
            for _ in range(200):
                page.wait_for_timeout(500)
                t = page.title()
                if t.startswith('VERIFY'):
                    break
            if not t.startswith('VERIFY PASS'):
                try:
                    bad = json.loads(page.eval_on_selector('#verify-result', 'el => el.textContent'))
                    det = {'title': t,
                           'units': {k: v for k, v in bad.get('units', {}).items() if not v.get('ok')},
                           'smokes': {k: v for k, v in bad.get('smokes', {}).items() if not v.get('ok')},
                           'levels': {k: v for k, v in {**bad.get('levels', {}), **bad.get('gen', {})}.items()
                                      if not v.get('ok')},
                           'pass': bad.get('pass'), 'total': bad.get('total')}
                except Exception as e:
                    det = {'title': t, 'dumpErr': str(e)[:120]}
                check('layout %dx%d flat%d (verify page ready)' % (w, h, flat), False, det)
                continue
            page.evaluate('SB.start(%d)' % flat)
            page.wait_for_timeout(250)
            m = page.evaluate('''() => {
              const cs = [...document.querySelectorAll('.card')].map(b => [b.offsetWidth, b.offsetHeight]);
              const ss = [...document.querySelectorAll('.slot')].map(b => [b.offsetWidth, b.offsetHeight]);
              const ch = document.getElementById('prompt-chip');
              const g = document.getElementById('game');
              return { n: cs.length, minC: Math.min(...cs.flat()), minS: Math.min(...ss.flat()),
                       chip: [ch.offsetWidth, ch.offsetHeight],
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
            want_n = {0: 3, 10: 5, 15: 4}[flat]
            ok = (m['n'] == want_n and m['minC'] >= 96 and m['minS'] >= 56 and
                  m['chip'][0] >= 64 and m['chip'][1] >= 64 and m['ox'] <= 0 and nonblank)
            check('layout %dx%d flat%d (%d cards)' % (w, h, flat, m['n']), ok,
                  {'minC': m['minC'], 'minS': m['minS'], 'chip': m['chip'], 'ox': m['ox'],
                   'pixelSd': round(sd, 1)})

        # ---- 5. 正常模式（非 verify 页）真实主流程：教学 → pointer 逐点排完 flat0 ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        import time as _time
        _t0 = _time.time()                        # 教学链 16s 门禁真实计时（m-3：verify/build 层
        pg2.goto(URL)                             # 皆为结构断言，本层是唯一可信墙钟——SPEC 预算 12600）
        tut = ''
        for _ in range(50):                       # watch ≈14s（真实 SPEED=1，演示三步+确认链）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('SB.tutorial')
            if tut in ('help', 'solo'):
                break
        _tut_ms = (_time.time() - _t0) * 1000
        demo_r = pg2.evaluate('window.__sbDemoR')
        check('normal-mode tutorial watch->help + <=16s 真实墙钟', tut == 'help' and demo_r == 'right'
              and _tut_ms <= 16000,
              {'tut': tut, '__sbDemoR': demo_r, 'tut_ms': round(_tut_ms)})
        # 真实 pointer 逐点排完（help 首步排对即放手 solo；answer=answers[0] 合法集首步——多解任一合法）
        guard = 0
        while guard < 260:
            guard += 1
            st = pg2.evaluate('''() => {
              const q = SB.quiz;
              if (!q) return null;
              return { done: SB.currentLevel.done, answer: q.answer, kind: q.kind };
            }''')
            if not st or st['done']:
                break
            # 判对演出窗 5200ms 内 board 仍是旧题（renderQuiz 在窗后重建）——等新 answer 卡出现
            sel = '.card[data-sid="%s"]' % st['answer']
            pg2.wait_for_selector(sel, timeout=9000)
            pg2.click(sel, timeout=3000, force=True)
            pg2.wait_for_timeout(700)             # step 锁窗 640ms 真实页
        lv_done = pg2.evaluate('() => SB.currentLevel.done')
        # 末题 done 后仍有 5200ms 判对演出窗才 winFlow→celebrate（2.3s）→pass 写档——轮询覆盖全程
        cel = False
        for _ in range(36):                       # 18s：5.2s 演出窗 + celebrate 2.3s + 写档余量
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('SB.currentLevel.won')
            if cel:
                break
            pg2.wait_for_timeout(500)
        sv = None
        for _ in range(30):                       # 等写档落盘（celebrate 收起后 pass 执行）
            sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_storybed")||"null")')
            if (sv or {}).get('levels', {}).get('1-0'):
                break
            pg2.wait_for_timeout(500)
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('normal-mode solve & celebrate & save',
              lv_done and cel and (sv or {}).get('v') == '1.0' and
              (sv or {}).get('storybed', {}).get('tutSeen') and st1.get('stars') == 3,
              {'done': lv_done, 'celebrate': cel, 'v': (sv or {}).get('v'),
               'tutSeen': (sv or {}).get('storybed'), 'stars10': st1.get('stars')})
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
