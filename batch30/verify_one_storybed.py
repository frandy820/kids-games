# -*- coding: utf-8 -*-
"""storybed 独立复验 r10 三型版（SPEC-BATCH30 §0.74+§6 分源）——断言从 SPEC 推导，禁从实现行为归纳
S0 verify 全绿+0 pageerror / S0b rec 序号化（levels=1-0..4-4 / gen=20..39）
S1a 表结构先验（FLOWS 6×4 逐字 / DEPS 依赖表 / RAIN_DEPS / COG 认知模型数字——python 独立副本）
S1b 40 关审计（kind 按章+三型封闭规则：ch1 order 池4、ch2 order 池4+1 干扰、ch3 题0 恒 rain 且
    ≥2 rain/关+order 流程∉out 互异、ch4 miss 候选4=真值+3 干扰；flat0q0=sleep 3 步锚点）
S2 多解状态机（flat0q0 3 合法卡=多解 / flat5 wrong miss+1 / doneAgain 同口径）
S3 引擎直驱 40 关（python 独立依赖表算合法集驱动——禁用页面 answers）
S4a 星级全最优 3★ / S4b 探测 1 错=2★（三型分流错击 flat3/9/17）
S5 确定性 / S6 家族 A+B+F 源码级 / S7 autoSolve flat0
S8 认知时长独立对账（python COG 副本逐关 ≥40000ms 且 >动画基线）"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'storybed', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# ---------- SPEC 结构性质（Python 侧先验独立副本——§0.74+§6 文字口径，禁抄页面实现） ----------
PY_FLOWS = {
    'sleep':    ['刷牙', '洗脸', '穿睡衣', '上床睡觉'],
    'getup':    ['睁开眼睛', '穿衣', '刷牙', '吃早餐'],
    'washhand': ['卷起袖子', '冲湿小手', '搓搓泡泡', '擦干小手'],
    'eat':      ['洗手', '坐坐好', '吃饭饭', '擦擦嘴巴'],
    'out':      ['穿衣服', '穿鞋子', '背小书包', '出门玩'],
    'bath':     ['脱衣服', '冲冲水', '搓搓澡', '擦干穿衣'],
}
PY_DEPS = {
    'sleep':    {0: [], 1: [], 2: [], 3: [0, 1, 2]},
    'getup':    {0: [], 1: [0], 2: [0], 3: [1, 2]},
    'washhand': {0: [], 1: [0], 2: [1], 3: [2]},
    'eat':      {0: [], 1: [], 2: [0, 1], 3: [2]},
    'out':      {0: [], 1: [0], 2: [0], 3: [1, 2]},
    'bath':     {0: [], 1: [0], 2: [1], 3: [2]},
}
PY_RAIN_DEPS = {0: [], 1: [0], 2: [0], 4: [0], 3: [1, 2, 4]}
PY_COG = {'baseStep': 2200, 'swapPair': 900, 'distract': 1100, 'condRead': 2600,
          'missScan': 1000, 'missInfer': 2000, 'missCand': 900}
PY_RAIN_STEP = '带小伞'
T_MIN, T_ANIM_STEP, T_ANIM_JUDGE = 40000, 640, 5200


def reach(dep, a, b):
    if b in dep[a]:
        return True
    return any(reach(dep, m, b) for m in dep[a])


def swap_pairs(dep, ids):
    n = 0
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if not reach(dep, ids[i], ids[j]) and not reach(dep, ids[j], ids[i]):
                n += 1
    return n


SWAP4 = {f: swap_pairs(d, [0, 1, 2, 3]) for f, d in PY_DEPS.items()}
SWAP_RAIN = swap_pairs(PY_RAIN_DEPS, [0, 1, 2, 3, 4])


def legal_of(q, placed):
    """python 独立合法集（§6.1 口径：未完成∧前置⊆已完成；miss 题=[缺失步]）"""
    kind, flow = q['kind'], q['flow']
    if kind == 'miss':
        return [flow + '_' + str(q['chain'].index(None))]
    dep = PY_RAIN_DEPS if kind == 'rain' else PY_DEPS[flow]
    done = set(placed)
    out = []
    for s in q['steps']:
        sid = s['stepId']
        if sid in done or sid.split('_')[0] != flow:
            continue
        n = int(sid.split('_')[1])
        if all((flow + '_' + str(d)) in done for d in dep[n]):
            out.append(sid)
    return out


def cog_of(meta_q):
    kind, flow, step_n, pool_n = meta_q
    if kind == 'miss':
        return 3 * PY_COG['missScan'] + PY_COG['missInfer'] + pool_n * PY_COG['missCand']
    if kind == 'rain':
        return 5 * PY_COG['baseStep'] + SWAP_RAIN * PY_COG['swapPair'] + PY_COG['condRead']
    return step_n * PY_COG['baseStep'] + SWAP4[flow] * PY_COG['swapPair'] + \
        (pool_n - step_n) * PY_COG['distract']


def anim_of(meta_q):
    kind, flow, step_n, pool_n = meta_q
    return T_ANIM_JUDGE if kind == 'miss' else step_n * T_ANIM_STEP + T_ANIM_JUDGE


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
    chk('S0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    # S0b rec 序号化（levels 按章-关序号键 / gen 按 flat 数字键；40 关齐）
    raw = pg.eval_on_selector('#verify-result', 'el => el.textContent')
    out = json.loads(raw)
    lv_keys = sorted(out['levels'].keys())
    gen_keys = sorted(out['gen'].keys(), key=int)
    want_lv = sorted('%d-%d' % (c, l) for c in range(1, 5) for l in range(5))
    chk('S0b rec 序号化（levels=1-0..4-4 / gen=20..39，共 40）',
        lv_keys == want_lv and gen_keys == [str(f) for f in range(20, 40)],
        'lv=%d gen=%d' % (len(lv_keys), len(gen_keys)))

    # S1a 表结构先验（页面 FLOWS/DEPS/RAIN_DEPS/COG 对拍 python 独立副本）
    got = pg.evaluate('''() => ({
      flows: (() => { const r = {}; FLOW_IDS.forEach(f => r[f] = FLOWS[f].steps.map(s => s.t)); return r; })(),
      ids: FLOW_IDS.slice(),
      deps: DEPS, rainDeps: RAIN_DEPS, cog: COG
    })''')
    tbl_fail = []
    if list(got['flows']) != list(PY_FLOWS) or any(got['flows'][f] != PY_FLOWS[f] for f in PY_FLOWS):
        tbl_fail.append('FLOWS 逐字不符')
    if {f: {int(k): v for k, v in d.items()} for f, d in got['deps'].items()} != \
            {f: {int(k): v for k, v in d.items()} for f, d in PY_DEPS.items()}:
        tbl_fail.append('DEPS 不符 SPEC §6.1')
    if {int(k): v for k, v in got['rainDeps'].items()} != PY_RAIN_DEPS:
        tbl_fail.append('RAIN_DEPS 不符 SPEC §6.2')
    if got['cog'] != PY_COG:
        tbl_fail.append('COG 不符 SPEC §6.5: %s' % got['cog'])
    chk('S1a 表结构先验（FLOWS 6×4/DEPS/RAIN_DEPS/COG）', not tbl_fail, str(tbl_fail))

    def read_q():
        return pg.evaluate('() => SB.quiz')
    def read_lv():
        return pg.evaluate('() => SB.currentLevel ? {step: SB.currentLevel.step, done: SB.currentLevel.done, stars: SB.currentLevel.stars} : null')
    def tapC(i):
        return pg.evaluate('(i) => (async () => { try { return await SB.tapCard(i) } catch(e){ return "ERR" } })()', i)
    def wait_quiz():
        for _ in range(300):
            q = read_q()
            if q:
                return q
            pg.wait_for_timeout(30)
        return None
    def stepped(k):
        lv = read_lv()
        return (lv and lv['step'] > k) or bool(lv and lv['done'])
    def wait_step(k, timeout_ms=9000):
        for _ in range(int(timeout_ms / 30)):
            if stepped(k):
                return True
            pg.wait_for_timeout(30)
        return False

    # 探测关错击（三型分流：order=前置未完卡 / rain=缺前置步 / miss=干扰候选）
    def probe_wrong(q):
        legal = legal_of(q, [])
        pool = [s['stepId'] for s in q['steps']]
        wi = next((i for i, sid in enumerate(pool) if sid not in legal), None)
        if wi is None:
            return False
        return tapC(wi) == 'wrong'

    all_snaps = {}
    ch_fail, drive_fail, star_fail = [], [], []
    PROBE = {3, 9, 17}                                  # 三章型各一（order+干扰/rain/miss）
    for flat in range(40):
        pg.evaluate('(f) => { SB.start(f) }', flat)
        snaps = []
        ok_break = False
        kinds_here = []
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            snaps.append(json.dumps(q, sort_keys=True))
            kind, flow = q['kind'], q['flow']
            kinds_here.append(kind)
            pool_t = [s['text'] for s in q['steps']]
            pool_i = [s['stepId'] for s in q['steps']]
            own = PY_FLOWS[flow]
            # S1b：章约束（静态 20 关 kind 按章；生成关只验三型自身规则）
            if flow not in PY_FLOWS:
                ch_fail.append((flat, k, 'flow∉6', flow))
            if flat < 20:
                dch = flat // 5 + 1
                if dch == 1 and kind != 'order':
                    ch_fail.append((flat, k, 'ch1 非 order', kind))
                if dch == 2 and kind != 'order':
                    ch_fail.append((flat, k, 'ch2 非 order', kind))
                if dch == 4 and kind != 'miss':
                    ch_fail.append((flat, k, 'ch4 非 miss', kind))
            # 三型封闭规则（全部关）
            if kind == 'miss':
                if len(pool_i) != 4:
                    ch_fail.append((flat, k, 'miss 候选≠4', len(pool_i)))
                ext = [t for t, sid in zip(pool_t, pool_i) if sid.split('_')[0] != flow]
                if len(ext) != 3 or set(ext) & set(own):
                    ch_fail.append((flat, k, 'miss 干扰域', ext))
                if sum(1 for sid in pool_i if sid.split('_')[0] == flow) != 1:
                    ch_fail.append((flat, k, 'miss 真值≠1'))
                if None not in q.get('chain') or q['chain'].count(None) != 1:
                    ch_fail.append((flat, k, 'chain 缺口≠1'))
            elif kind == 'rain':
                if flow != 'out' or len(pool_i) != 5:
                    ch_fail.append((flat, k, 'rain 结构', flow, len(pool_i)))
                if pool_t.count(PY_RAIN_STEP) != 1:
                    ch_fail.append((flat, k, 'rain 缺带小伞'))
                if any(sid.split('_')[0] != 'out' for sid in pool_i):
                    ch_fail.append((flat, k, 'rain 池含外流程'))
            else:
                if kind != 'order':
                    ch_fail.append((flat, k, 'kind 未知', kind))
                else:
                    want_n = 3 if (flat == 0 and k == 0) else 4
                    if len(pool_i) not in (want_n, want_n + 1):
                        ch_fail.append((flat, k, 'order 池深', len(pool_i)))
                    ext = [t for t, sid in zip(pool_t, pool_i) if sid.split('_')[0] != flow]
                    if len(ext) > 1 or (len(ext) == 1 and (ext[0] in own or len(pool_i) != want_n + 1)):
                        ch_fail.append((flat, k, 'order 干扰域', ext))
            if len(set(pool_i)) != len(pool_i):
                ch_fail.append((flat, k, '候选重复'))
            # 探测关 1 错（星级口径）
            if flat in PROBE and k == 0:
                probe_wrong(q)
                pg.wait_for_timeout(120)
            # 驱动：python 独立合法集逐题点完
            placed = []
            guard = 0
            while guard < 24:
                lv = read_lv()
                if (lv and lv['step'] > k) or (lv and lv['done']):
                    break
                qd = read_q()
                if not qd:
                    pg.wait_for_timeout(120)
                    guard += 1
                    continue
                legal = legal_of(qd, placed)
                if not legal:
                    drive_fail.append((flat, k, '合法集空'))
                    ok_break = True
                    break
                pool_now = [s['stepId'] for s in qd['steps']]
                if legal[0] not in pool_now:
                    drive_fail.append((flat, k, '合法步不在池'))
                    ok_break = True
                    break
                r = tapC(pool_now.index(legal[0]))
                if r == 'ERR':
                    drive_fail.append((flat, k, 'tap ERR'))
                    ok_break = True
                    break
                if r in ('step', 'right', 'done'):
                    placed.append(legal[0])
                elif r == 'wrong':
                    drive_fail.append((flat, k, '独立合法集被判 wrong', legal[0]))
                    ok_break = True
                    break
                pg.wait_for_timeout(60)
                guard += 1
            if not ok_break and not wait_step(k):
                drive_fail.append((flat, k, '驱动未推进'))
                ok_break = True
            if ok_break:
                break
        all_snaps[flat] = snaps
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE and not ok_break:
            st = -1
            for _ in range(8):
                pg.wait_for_timeout(200)
                st = pg.evaluate('() => SB.currentLevel && SB.currentLevel.stars != null ? SB.currentLevel.stars : -1')
                if st != -1:
                    break
            if st != 3 and st != -1:
                star_fail.append((flat, '全最优非3★', st))
        # ch3 混合章规则（rain≥2/题0 rain/order 流程∉out 互异）
        if not ok_break and len(snaps) == 5:
            ks = [json.loads(s)['kind'] for s in snaps]
            fl = [json.loads(s)['flow'] for s in snaps]
            if flat < 20 and flat // 5 + 1 == 3:
                if ks[0] != 'rain' or ks.count('rain') < 2:
                    ch_fail.append((flat, 'ch3 rain 分布', ks))
                of = [f for kk, f in zip(ks, fl) if kk == 'order']
                if 'out' in of or len(set(of)) != len(of):
                    ch_fail.append((flat, 'ch3 order 流程', of))
            if flat < 20 and flat // 5 + 1 in (1, 2, 4) and len(set(fl)) != 5:
                ch_fail.append((flat, '流程重复', fl))
        if ok_break:
            continue
    chk('S1b 40 关审计（kind 按章+三型封闭+干扰域+链缺口）', not ch_fail, str(ch_fail[:4]))
    chk('S3 引擎直驱 40 关（python 独立合法集）', not drive_fail, str(drive_fail[:4]))
    chk('S4a 星级（全最优=3★，排探测）', not star_fail, str(star_fail[:3]))

    # 锚点复核（flat0q0=sleep 3 步 / flat10q0=rain 5 卡）
    pg.evaluate('() => { SB.start(0) }')
    q0 = wait_quiz()
    pg.evaluate('() => { SB.start(10) }')
    q10 = wait_quiz()
    a0 = q0 and q0['flow'] == 'sleep' and len(q0['steps']) == 3
    a10 = q10 and q10['kind'] == 'rain' and len(q10['steps']) == 5
    chk('S1b-anchor 锚点（flat0q0=sleep3 / flat10q0=rain5）', a0 and a10,
        '%s/%s' % (q0 and q0['flow'], q10 and q10['kind']))

    # S2 多解状态机（flat0q0 3 合法卡多解 / flat5 wrong miss+1 / doneAgain 同口径）
    pg.evaluate('() => { SB.start(0) }')
    q = wait_quiz()
    r_bad = tapC(99)
    i0 = next(i for i, s in enumerate(q['steps']) if s['stepId'] == legal_of(q, [])[0])
    r_step = tapC(i0)
    phase1 = read_q()['phase']
    chk('S2a 多解首点（3 合法卡/step/越界 null）',
        len(legal_of(q, [])) == 3 and r_bad is None and r_step == 'step' and phase1 == 1,
        'legal=%d r=%s' % (len(legal_of(q, [])), r_step))
    pg.evaluate('() => { SB.start(5) }')
    q5 = wait_quiz()
    legal5 = legal_of(q5, [])
    wi = next(i for i, s in enumerate(q5['steps']) if s['stepId'] not in legal5)
    r_w = tapC(wi)
    m1 = read_q()['miss']
    r_w2 = tapC(wi)
    m2 = read_q()['miss']
    chk('S2b wrong 状态机（miss+1/再点同口径）',
        r_w == 'wrong' and m1 == 1 and r_w2 == 'wrong' and m2 == 2,
        str([r_w, m1, r_w2, m2]))

    # S5 确定性（双读 sig 相同）
    det_fail = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { SB.start(f) }', flat)
        a = json.dumps(read_q(), sort_keys=True)
        pg.evaluate('(f) => { SB.start(f) }', flat)
        c = json.dumps(read_q(), sort_keys=True)
        if a != c:
            det_fail.append(flat)
    chk('S5 确定性（双读 sig 相同）', not det_fail, str(det_fail))

    # S4b 探测关 1 错=2★（三型分流错击）
    s4b = []
    for flat in (3, 9, 17):
        pg.evaluate('(f) => { SB.start(f) }', flat)
        wronged = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                break
            if not wronged:
                wronged = probe_wrong(q)
                pg.wait_for_timeout(120)
            placed = []
            guard = 0
            while guard < 24:
                lv = read_lv()
                if (lv and lv['step'] > k) or (lv and lv['done']):
                    break
                qd = read_q()
                if not qd:
                    pg.wait_for_timeout(120); guard += 1; continue
                legal = legal_of(qd, placed)
                if not legal:
                    break
                pool_now = [s['stepId'] for s in qd['steps']]
                if legal[0] not in pool_now:
                    break
                r = tapC(pool_now.index(legal[0]))
                if r in ('step', 'right', 'done'):
                    placed.append(legal[0])
                elif r == 'wrong':
                    break
                pg.wait_for_timeout(60); guard += 1
            wait_step(k)
        st = -1
        for _ in range(8):
            pg.wait_for_timeout(200)
            st = pg.evaluate('() => SB.currentLevel && SB.currentLevel.stars != null ? SB.currentLevel.stars : -1')
            if st != -1:
                break
        if not wronged or st != 2:
            s4b.append((flat, st, wronged))
    chk('S4b 探测关 1 错=2★（三型错击）', not s4b, str(s4b))

    # S7 autoSolve flat0 done
    pg.evaluate('() => { SB.start(0) }')
    r = pg.evaluate('() => (async () => { try { return await SB.autoSolve() } catch(e){ return "ERR" } })()')
    d7 = isinstance(r, dict) and r.get('done') and r.get('taps', 0) > 0
    chk('S7 autoSolve flat0 done', bool(d7), str(r)[:80])

    # S8 认知时长独立对账（python COG 副本逐关 ≥40000 且 >动画基线）
    meta = pg.evaluate('Array.from({length:40}, (_, f) => { const L = genLevel(f); '
                       'return L.quizzes.map(q => [q.kind, q.flow, q.stepIds.length, q.pool.length]); })')
    dur_fail, dmin, dmin_flat, anim_bad = [], 1 << 60, -1, []
    for flat, quizzes in enumerate(meta):
        cog = sum(cog_of(mq) for mq in quizzes)
        anim = sum(anim_of(mq) for mq in quizzes)
        if cog < dmin:
            dmin, dmin_flat = cog, flat
        if cog < T_MIN:
            dur_fail.append((flat, cog))
        if cog <= anim:
            anim_bad.append((flat, cog, anim))
    chk('S8 认知时长独立对账（40 关 modeled ≥40000ms 且 >动画）',
        not dur_fail and not anim_bad and len(meta) == 40,
        'min=%dms@flat%d fail=%s animBad=%s' % (dmin, dmin_flat, str(dur_fail[:3]), str(anim_bad[:3])))
    pg.close(); b.close()

# S6 家族 A+B+F 源码级
src = io.open(os.path.join(BASE, 'storybed', '_src', 'game-main.js'), encoding='utf-8').read()
s6 = []
if src.count('nextHint(lim - 1)') < 1:
    s6.append('dayEnd lim-1 缺失')
if 'nextHint(null)' not in src:
    s6.append('winFlow dayEnd 缺 nextHint(null)')
if 'GEN_HINTS[genLevel(f + 1).dch - 1]' not in src:
    s6.append('生成关 hint 非实算（家族 F）')
if '(ci + 1) % 4' in src:
    s6.append('禁章序推进 (ci+1)%4 在场')
if 'lastDir' not in src or 'lastAct' not in src:
    s6.append('无救援双锚')
if 'wrongChainUntil = Date.now() + 7100' not in src:
    s6.append('错链豁免窗缺失')
chk('S6 家族 A+B+F 源码级', not s6, str(s6))

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
