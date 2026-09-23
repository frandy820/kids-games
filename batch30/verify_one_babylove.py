# -*- coding: utf-8 -*-
"""babylove r10 独立复验（SPEC-BATCH30 §0.73 r10 块分源）——断言从 SPEC 推导，禁从实现行为归纳
D1 表结构先验（Python 独立重列 SPEC：配对封闭 12/幼成体集各 12/近形 2 对/发育链 6/生境映射 30）
D2 45 关引擎级审计（flat0-44：章型 kind 域/候选 4 互异含真值 ⊆对应集/answer 逐步复算/
   dch≥2 findbaby 近形伴恰 1/habitat (hab×stage) 2×2+want 两态/grow 链全量逐点/章聚合）
D3 多步状态机（UI 级 flat0/10/15：'step'×2→'right'/'done'；错='wrong'+miss 不推进）
D4 星级（0 错=3★/1 错=2★，永不 0★）/ D5 确定性（双读 sig）/ D6 flat0q0 教学锚
D7 家族 A+B 源码级 / D8 autoSolve flat0 taps=15"""
import json, sys, os, io, re
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'babylove', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# ---- SPEC r10 表独立重列（Python 侧先验——不 evaluate 页面引擎常量互证） ----
SPEC_PAIRS = {'tadpole': 'frog', 'caterpillar': 'butterfly', 'chick': 'hen',
              'puppy': 'dog', 'kitten': 'cat', 'calf': 'cow',
              'fishfry': 'fish', 'duckling': 'duck', 'grub': 'beetle',
              'lamb': 'sheep', 'piglet': 'pig', 'foal': 'horse'}
SPEC_INV = {v: k for k, v in SPEC_PAIRS.items()}
SPEC_BABIES = list(SPEC_PAIRS.keys())
SPEC_ADULTS = list(SPEC_PAIRS.values())
SPEC_CONF = {'tadpole': 'fishfry', 'fishfry': 'tadpole',
             'caterpillar': 'grub', 'grub': 'caterpillar'}
SPEC_GROWTH = {'frog': ['egg_frog', 'tadpole', 'frog'],
               'butterfly': ['egg_butterfly', 'caterpillar', 'butterfly'],
               'beetle': ['egg_beetle', 'grub', 'beetle'],
               'fish': ['egg_fish', 'fishfry', 'fish'],
               'hen': ['egg_hen', 'chick', 'hen'],
               'duck': ['egg_duck', 'duckling', 'duck']}
SPEC_HAB = {}
for _b, _h in {'tadpole': 'water', 'fishfry': 'water', 'duckling': 'water',
               'caterpillar': 'forest', 'grub': 'forest', 'chick': 'grass',
               'puppy': 'grass', 'kitten': 'grass', 'calf': 'grass',
               'lamb': 'grass', 'piglet': 'grass', 'foal': 'grass'}.items():
    SPEC_HAB[_b] = _h
    SPEC_HAB[SPEC_PAIRS[_b]] = _h
SPEC_HABS = ['water', 'forest', 'grass']
STATIC_N = 25
CH_LEN = 5
SPEC = {'pairs': SPEC_PAIRS, 'conf': SPEC_CONF, 'growth': SPEC_GROWTH,
        'hab': SPEC_HAB, 'habs': SPEC_HABS, 'staticN': STATIC_N, 'chLen': CH_LEN}

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    for _ in range(240):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('D0 verify 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_q():
        return pg.evaluate('() => window.BL ? BL.quiz : null')
    def read_lv():
        return pg.evaluate('() => BL.currentLevel')
    def tap(i):
        return pg.evaluate('(i) => (async () => { try { return await BL.tapOpt(i) } catch(e){ return "ERR" } })()', i)
    def start(f):
        pg.evaluate('(f) => { BL.start(f) }', f)
    def wait_quiz(timeout_ms=8000):
        for _ in range(int(timeout_ms / 30)):
            q = read_q()
            if q:
                return q
            pg.wait_for_timeout(30)
        return None

    # ---- D2：45 关引擎级审计（页面内 genLevel+quizView+engTapOpt 全速驱动） ----
    audit = pg.evaluate('''(SPEC) => {
      const bad = [];
      for (let flat = 0; flat < 45; flat++) {
        const L = genLevel(flat);
        const dch = flat < SPEC.staticN ? Math.floor(flat / SPEC.chLen) + 1 : L.dch;
        if (L.ch !== Math.floor(flat / SPEC.chLen) + 1) bad.push([flat, 'ch 错', L.ch]);
        if (flat < SPEC.staticN && L.dch !== dch) bad.push([flat, '静态 dch 错', L.dch]);
        const kinds = new Set();
        for (let k = 0; k < SPEC.chLen; k++) {
          const q = L.quizzes[k];
          kinds.add(q.kind);
          if (flat === 0 && k === 0 && (q.kind !== 'findmom' || q.subs[0].ask !== 'tadpole'))
            bad.push([flat, k, 'flat0q0 锚点']);
          if (q.kind === 'grow') {
            const chain = SPEC.growth[q.ask];
            const vals = q.opts.map(o => o.anim);
            if (!chain || vals.length !== 3 || new Set(vals).size !== 3 ||
                chain.some(st => vals.indexOf(st) < 0)) bad.push([flat, k, 'grow 链卡池']);
            for (let s = 0; s < 3; s++) {                    // 逐点 answer 复算（engTapOpt 推进）
              const v = quizView(L);
              if (!v || v.step !== k || v.substep !== s || vals[v.answer] !== chain[s])
                { bad.push([flat, k, s, 'grow answer', v && v.substep]); break; }
              engTapOpt(L, v.answer);
            }
          } else if (q.kind === 'habitat') {
            if (SPEC.habs.indexOf(q.ask) < 0) bad.push([flat, k, 'hab ask']);
            const wants = q.subs.map(s => s.want);
            if (new Set(wants).size !== 2) bad.push([flat, k, 'want 无两态']);
            for (const sub of q.subs) {
              const vals = sub.opts.map(o => o.anim);
              const isMom = sub.want === 'mom';
              const same = vals.filter(v => SPEC.hab[v] === q.ask);
              const stg = vals.filter(v => (SPEC.adultsA.indexOf(v) >= 0) === isMom);
              const truth = vals.filter(v => SPEC.hab[v] === q.ask && (SPEC.adultsA.indexOf(v) >= 0) === isMom);
              if (vals.length !== 4 || new Set(vals).size !== 4 || same.length !== 2 ||
                  stg.length !== 2 || truth.length !== 1 || vals[sub.answer] !== truth[0])
                bad.push([flat, k, 'habitat 2x2', q.ask]);
            }
            for (let s = 0; s < 3; s++) {                    // 步进推进（engTapOpt answer）
              const v = quizView(L);
              if (v && v.step === k) engTapOpt(L, v.answer);
            }
          } else {
            for (const sub of q.subs) {
              const isMom = q.kind === 'findmom';
              const askPool = isMom ? SPEC.babiesA : SPEC.adultsA;   // ask 域：findmom=幼体/findbaby=成体
              const pool = isMom ? SPEC.adultsA : SPEC.babiesA;      // 候选域：与 ask 域相对
              const vals = sub.opts.map(o => o.anim);
              const truth = isMom ? SPEC.pairs[sub.ask] : SPEC.inv[sub.ask];
              if (askPool.indexOf(sub.ask) < 0 || vals.length !== 4 || new Set(vals).size !== 4 ||
                  vals.some(v => pool.indexOf(v) < 0) || vals[sub.answer] !== truth)
                bad.push([flat, k, '配对域/answer', q.kind, sub.ask]);
              if (q.kind === 'findbaby' && dch >= 2 && SPEC.conf[truth] &&
                  vals.indexOf(SPEC.conf[truth]) < 0)
                bad.push([flat, k, 'findbaby 近形缺伴', truth]);
            }
            for (let s = 0; s < 3; s++) {
              const v = quizView(L);
              if (v && v.step === k) engTapOpt(L, v.answer);
            }
          }
        }
        if (!L.done || L.step !== SPEC.chLen) bad.push([flat, '驱动未完成']);
        if (flat < SPEC.staticN) {
          const ks = Array.from(kinds);
          if (dch === 1 && (ks.length !== 1 || ks[0] !== 'findmom')) bad.push([flat, 'dch1', ks]);
          if (dch === 2 && !ks.every(x => x === 'findmom' || x === 'findbaby')) bad.push([flat, 'dch2', ks]);
          if (dch === 3 && (ks.length !== 1 || ks[0] !== 'grow')) bad.push([flat, 'dch3', ks]);
          if (dch === 4 && (ks.length !== 1 || ks[0] !== 'habitat')) bad.push([flat, 'dch4', ks]);
          if (dch === 5 && ks.length < 3) bad.push([flat, 'dch5 型<3', ks]);
        }
      }
      return bad;
    }''', {**SPEC, 'babiesA': SPEC_BABIES, 'adultsA': SPEC_ADULTS, 'inv': SPEC_INV})
    chk('D2 45 关引擎级审计（域/answer 逐步/近形/2×2/链/章聚合）', not audit, str(audit[:5]))

    # ---- D3：UI 级多步状态机（flat0 findmom / flat10 grow / flat15 habitat 各 1 题全程） ----
    sm_fail = []
    for flat in (0, 10, 15):
        start(flat)
        q = wait_quiz()
        if not q:
            sm_fail.append((flat, 'quiz null'))
            continue
        wi = next(i for i in range(len(q['opts'])) if i != q['answer'])
        rw = tap(wi)                                    # 错=wrong+miss 不推进
        q2 = read_q()
        if rw != 'wrong' or q2['miss'] != 1 or q2['substep'] != 0 or q2['step'] != 0:
            sm_fail.append((flat, 'wrong 语义', rw, q2 and (q2['miss'], q2['step'], q2['substep'])))
        seq = []
        for s in range(3):
            qq = read_q()
            exp = 'step' if s < 2 else 'right'
            r = tap(qq['answer'])
            seq.append(r)
            if r != exp:
                sm_fail.append((flat, '步 %s 期望 %s 得 %s' % (s, exp, r)))
        if seq != ['step', 'step', 'right']:
            sm_fail.append((flat, 'step 序列', seq))
    chk('D3 UI 级多步状态机（wrong 不推进/step×2→right）', not sm_fail, str(sm_fail[:4]))

    # D4：星级（flat 0 错 1 次→autoSolve=2★；flat 10 全对 autoSolve=3★）
    start(0)
    q = wait_quiz()
    wi = next(i for i in range(len(q['opts'])) if i != q['answer'])
    tap(wi)
    r4 = pg.evaluate('() => (async () => { try { return await BL.autoSolve() } catch(e){ return "ERR" } })()')
    lv4 = read_lv()
    d4a = r4 and r4.get('done') and lv4 and lv4.get('stars') == 2 and lv4.get('miss') == 1
    start(10)
    r4b = pg.evaluate('() => (async () => { try { return await BL.autoSolve() } catch(e){ return "ERR" } })()')
    lv4b = read_lv()
    d4b = r4b and r4b.get('done') and lv4b and lv4b.get('stars') == 3 and lv4b.get('miss') == 0
    chk('D4 星级（1 错=2★ miss=1 / 全对=3★）', bool(d4a and d4b),
        '2★=%s 3★=%s' % (lv4 and lv4.get('stars'), lv4b and lv4b.get('stars')))

    # D5 确定性（双读 sig）
    det_fail = []
    for flat in (0, 7, 13, 26, 41):
        start(flat)
        a = json.dumps(read_q(), sort_keys=True)
        start(flat)
        c = json.dumps(read_q(), sort_keys=True)
        if a != c:
            det_fail.append(flat)
    chk('D5 确定性（双读 sig 相同）', not det_fail, str(det_fail))

    # D6 flat0 q0 教学锚（findmom/tadpole——SPEC §1 演示锚点）
    start(0)
    q0 = read_q()
    chk('D6 flat0q0 锚（findmom tadpole answer=frog）',
        bool(q0 and q0['kind'] == 'findmom' and q0['ask'] == 'tadpole'
        and q0['opts'][q0['answer']]['anim'] == 'frog'
        and [o['anim'] for o in q0['opts']].count('frog') == 1),
        str(q0)[:120])

    # D8 autoSolve flat0（taps=15=3 步×5 题）
    start(0)
    r8 = pg.evaluate('() => (async () => { try { return await BL.autoSolve() } catch(e){ return "ERR" } })()')
    d8 = isinstance(r8, dict) and r8.get('done') and r8.get('taps') == 15
    chk('D8 autoSolve flat0（done+taps=15）', bool(d8), str(r8))
    pg.close(); b.close()

# D7 家族 A+B 源码级（Python 侧读源文件）
src = io.open(os.path.join(BASE, 'babylove', '_src', 'game-main.js'), encoding='utf-8').read()
s7 = []
if src.count('nextHint(lim - 1)') + src.count('nextHint(null)') < 2:
    s7.append('dayEnd 预告 <2 处')
if 'lastDir' not in src or 'lastAct' not in src:
    s7.append('救援双锚缺 lastDir/lastAct')
m = re.search(r'idle > 14000[\s\S]{0,400}', src)
if m and 'lastAct = ' in m.group(0)[:400]:
    s7.append('方向级段 400 字内重置 lastAct（30s 答案级被饿死）')
if 'idle > 30000' not in src:
    s7.append('缺 30s 答案级')
chk('D7 家族 A+B 源码级', not s7, str(s7))

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
