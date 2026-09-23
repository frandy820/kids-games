# -*- coding: utf-8 -*-
"""r27 verify 判别力红测：页内篡改八型，断言对应单元变红（不改源码）
r27 原始五型（SPEC-R27 §R6）：①模板几何 ②保留关谱动 ③图标预算崩（pageerror 路径红）
④生成池丢 dualP ⑤低段 AB 混回。
r27② 扩型（审查 m3，2026-09-23）：
  ⑥ compound 半对干扰 d1 → 真对（=answer 本体）：newKinds 红 + 复合关 uniq/distinct/out 红
  ⑦ compound 半对干扰 d1 → 双轴全错（形错+数也错，仍规律外互异）：仅 newKinds 红（pass=44，
     其余 44 单元全绿——判别力自证：红只来自半对轴性质违约，非连带破坏）
  ⑧ dualP 色轴退化回周期 2（colors 3→2，谱退化注入，seq/answer/items 同步重生成保持
     其余全律成立）：仅 newKinds 红（pass=44）
双向自证：每型违约注入真红 + 正常谱真绿（绿腿 G0 整页 VERIFY PASS 45/45；G1 正常谱
compound 每题两半对干扰轴均在场；G2 正常谱 dualP colors=3 且合成周期 6 且 6 项互异）。
位置：本件=r27 原始位置（SPEC §R6 锚）；同内容随款归档副本
batch3/pattern/_src/_r27_redtest.py（r28+ 谱证据随款归档惯例）。
"""
import json
import sys
from playwright.sync_api import sync_playwright

URL = 'file:///F:/claudecode/projects/active/kids-games/batch3/pattern/index.html?verify=1'
MUTE_INIT = "(() => { const P = Audio.prototype.play; Audio.prototype.play = function(){ setTimeout(()=>{ try{ this.dispatchEvent(new Event('ended')); }catch(e){} }, 1500); return P.call(this); }; Audio.prototype.pause = function(){}; })()"

# ---------- r27 原始五型（期望来自 SPEC-R27 §R6：哪型该红哪些单元） ----------
PROBES = [
    ('tamper1 ABCD total 8->6', "QUIZ_T.ABCD_END.total = 6",
     {'spec27': False, 'red': True}),
    ('tamper2 preserved flat10 row', "STATIC_SPECS[10] = ['DUAL_END','DUAL_END','DUAL_END','DUAL_END']",
     {'spec27': False, 'red': True}),
    ('tamper3 budget flat8 4xABCD(16>12)', "STATIC_SPECS[8] = ['ABCD_END','ABCD_END','ABCD_END','ABCD_END']",
     {'throws': True, 'red': True}),
    ('tamper4 gen theme2 dualP out', "CH_TPL[2] = ['DUAL_END','DUAL_MID','DUAL_END','DUAL_MID']",
     {'spec27': False, 'newKinds': False, 'red': True}),
    ('tamper5 low-tier AB into flat1', "STATIC_SPECS[1] = ['AB_END','AB_END','AB_END']",
     {'spec27': False, 'newKinds': False, 'red': True}),
]

# ---------- r27② 扩型 ----------
# ⑥ 半对 d1 → 真对（=answer）：破坏「d1 形错数对」+ 唯一性/互异/规律外
PATCH6 = """(() => {
  const orig = compoundDistractors;
  compoundDistractors = function(rule, outs, answer) {
    const ds = orig(rule, outs, answer);
    return [ { shape: answer.shape, color: rule.color, count: answer.count }, ds[1] ];
  };
  return 'wrapped';
})()"""
# ⑦ 半对 d1 → 双轴全错：形仍错（otherShape）+ 数也错（未用量 c≠answer.count），
#    仍规律外（c∉usedC）/互异/≠answer —— 其余 44 单元须全绿，仅 newKinds 红
PATCH7 = """(() => {
  const orig = compoundDistractors;
  compoundDistractors = function(rule, outs, answer) {
    const ds = orig(rule, outs, answer);
    const usedC = outs.map(function(o) { return o.count; });
    let c = 1;
    while (usedC.indexOf(c) >= 0 || c === answer.count || c === ds[1].count) c++;
    return [ { shape: ds[0].shape, color: rule.color, count: c }, ds[1] ];
  };
  return 'wrapped';
})()"""
# ⑧ dualP 色轴退化回周期 2：colors 3→2，seq/answer/items 同步按退化 rule 重生成
#    （干扰项保留=池内、退化规律外、互异、≠answer）—— 其余全律成立，仅合成周期违约
PATCH8 = """(() => {
  const orig = makeLevel;
  makeLevel = function(flat) {
    const L = orig(flat);
    L.quizzes.forEach(function(q) {
      if (q.rule.kind !== 'dualP') return;
      q.rule.colors = [ q.rule.colors[0], q.rule.colors[1] ];
      q.seq = [];
      for (let i = 0; i < q.len; i++) q.seq.push(ruleAt(q.rule, i));
      q.answer = ruleAt(q.rule, q.missingIdx);
      q.items = [ q.answer, q.items[(q.correctIdx + 1) % 3], q.items[(q.correctIdx + 2) % 3] ];
      q.correctIdx = 0;
    });
    return L;
  };
  return 'wrapped';
})()"""

PROBES += [
    ('tamper6 compound d1 half->true(answer)', PATCH6,
     {'spec27': True, 'newKinds': False, 'red': True}),
    ('tamper7 compound d1 half->both-wrong', PATCH7,
     {'spec27': True, 'newKinds': False, 'pass': 44, 'red': True}),
    ('tamper8 dualP color axis 3->2 (degraded)', PATCH8,
     {'spec27': True, 'newKinds': False, 'pass': 44, 'red': True}),
]

# ---------- 绿腿：正常谱该型性质在場（SPEC §R3 推导，不经篡改通道） ----------
GREEN_PROPS = [
    ('green1 compound half-pair axes present (SPEC R3)',
     """(() => {
       const bad = [];
       for (let f = 0; f < 40; f++) makeLevel(f).quizzes.forEach(function(q) {
         if (q.rule.kind !== 'compound') return;
         const wrongs = q.items.filter(function(it, i) { return i !== q.correctIdx; });
         const half1 = wrongs.some(function(w) { return w.count === q.answer.count && w.shape !== q.answer.shape; });
         const half2 = wrongs.some(function(w) { return w.shape === q.answer.shape && w.count !== q.answer.count; });
         if (!half1 || !half2) bad.push(f + ':' + q.tk);
       });
       return { ok: bad.length === 0, bad: bad.slice(0, 3) };
     })()"""),
    ('green2 dualP colors=3 period=6 distinct6 (SPEC R3)',
     """(() => {
       const bad = []; let n = 0;
       for (let f = 0; f < 40; f++) makeLevel(f).quizzes.forEach(function(q) {
         if (q.rule.kind !== 'dualP') return;
         n++;
         if (q.rule.colors.length !== 3 || rulePeriod(q.rule) !== 6 ||
             new Set(ruleOutputs(q.rule, 6).map(itemKey)).size !== 6) bad.push(f + ':' + q.tk);
       });
       return { ok: bad.length === 0 && n > 0, n: n, bad: bad.slice(0, 3) };
     })()"""),
]

RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok))
    print('%s | %s | %s' % ('PASS' if ok else 'FAIL', name, detail))


def load_verify(pg, errs):
    title = pg.title()
    vj = json.loads(pg.locator('#verify-result').text_content())
    units = {k: v.get('ok') for k, v in vj['units'].items()}
    return title, vj, units


with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- G0 整页绿基线：无篡改 runVerify 全绿（双向自证之绿面） ----
    ctx = b.new_context(viewport={'width': 1280, 'height': 800})
    ctx.add_init_script(MUTE_INIT)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:90]))
    pg.goto(URL)
    pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=15000)
    t0, vj0, u0 = load_verify(pg, errs)
    check('G0 clean spectrum VERIFY PASS 45/45', t0 == 'VERIFY PASS 45/45' and not errs,
          'title=%r pass=%s/%s errs=%s' % (t0, vj0['pass'], vj0['total'], errs[:1]))
    for gname, gjs in GREEN_PROPS:
        r = pg.evaluate(gjs)
        check(gname, r.get('ok') is True, json.dumps(r, ensure_ascii=True)[:120])
    ctx.close()

    # ---- 红腿：篡改注入 ----
    for name, patch, exp in PROBES:
        ctx = b.new_context(viewport={'width': 1280, 'height': 800})
        ctx.add_init_script(MUTE_INIT)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:90]))
        pg.goto(URL)
        pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=15000)
        pg.evaluate(patch)
        try:
            pg.evaluate('runVerify()')
        except Exception as ex:
            check(name + ' [red]', exp.get('throws') is True, 'runVerify THREW: %s' % str(ex)[:70])
            ctx.close()
            continue
        try:
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=8000)
            title, vj, units = load_verify(pg, errs)
            red = title == 'VERIFY FAIL' or vj['pass'] < vj['total']
            ok = red is True and exp.get('red') is True
            for k in ('spec27', 'newKinds'):
                if k in exp:
                    if units.get(k) != exp[k]:
                        ok = False
            if 'pass' in exp and vj['pass'] != exp['pass']:
                ok = False
            check(name + ' [red]', ok,
                  'title=%r spec27=%s newKinds=%s pass=%s/%s errs=%s' % (
                      title[:13], units.get('spec27'), units.get('newKinds'), vj['pass'], vj['total'], errs[:1]))
        except Exception:
            # runVerify 中途死（title/JSON 停留在旧态且 evaluate 未抛=异常吞进 promise 链）
            check(name + ' [red]', exp.get('throws') is True, 'NO FRESH RESULT errs=%s' % errs[:1])
        ctx.close()
    b.close()

n_ok = sum(1 for _, ok in RESULTS if ok)
print('\n==== REDTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
sys.exit(0 if n_ok == len(RESULTS) else 1)
