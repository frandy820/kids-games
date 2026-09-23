# -*- coding: utf-8 -*-
"""bridge 独立复验（SPEC-BATCH21 §3-r9+§0.48-r9 分源）——断言从 SPEC 推导，禁从实现行为归纳
r9 纠错式玩法：石桥序列完整给出+恰 1 错石，find 找错（点出错石）→ fix 修错（3 候选修对）
→ 修对后兔子逐石过河（walk 演出）→ 下一题。
B0 verify selftest 全绿+0 pageerror
B1 章约束（flat//5+1：ch1 'ab' / ch2 'abc' / ch3 'abcd' / ch4 'aabb' / ch5 'dual' /
   ch6 静态混合 ≥3 型；flat≥30 生成关 seeded dch∈[1,6]、六章循环）
B2 Python 独立纠错计算器对账（核心）：
   周期重建——从行首 per 位读周期元（ab/abc=2/3 互异色、abcd=4 互异色、aabb=同同异异成对、
   dual=2 位双属性对色形各自互异）→ 逐位比对 → 唯一不符位=badPos（且 badPos≥per 首周期完整）；
   石数：abcd/aabb=8、其余=6；恰一错石；单色章错石值∈行用色且≠应值、禁 shape；
   dual 章石头必带 shape∈{square,round} 且错石与应值恰差一属性（色同形异/异色同形）；
   候选 3 块互异、应值恰一次（candOk 指向它）、每块干扰与应值恰差一属性
B2b badPos/candOk 独立对账（每题）+ modeled 时长（Python 独立副本重算 ≥40000ms）
B3 引擎直驱：find 点非错石='wrong'+miss+1+phase 仍 find；点错石='found'→phase fix；
   fix 点错候选='wrong'零惩罚；点对='goal'/'done'+walk；find 期点候选/fix 期点石头=null（阶段门）
B4 确定性（flat 0/12/27/39/45 双读 stones JSON）
B5 0 pageerror
纪律：tapStone/tapCand async——evaluate 侧 await；先等 title=VERIFY PASS（b17）。"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'bridge', 'index.html').replace('\\', '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok), note))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

def expect_kinds(flat):
    """SPEC §3-r9 章规格（ch=flat//5+1，静态 30 关；flat≥30 生成关按 seeded dch 单型/混合）"""
    if flat < 30:
        ch = flat // 5 + 1
        single = {1: 'ab', 2: 'abc', 3: 'abcd', 4: 'aabb', 5: 'dual'}
        if ch in single:
            return {single[ch]}
        return {'ab', 'abc', 'abcd', 'aabb', 'dual'}      # ch6 混合 ≥3 型（型集校验另判）
    return None                                            # 生成关 dch 由引擎 seeded 决定

PERIOD = {'ab': 2, 'abc': 3, 'abcd': 4, 'aabb': 4, 'dual': 2}
COLORS5 = {'red', 'blue', 'green', 'purple', 'orange'}

def cycle_calc(q):
    """Python 独立周期计算器（SPEC §3-r9 口径）：从行首 per 位读周期元重建，
    返回 (badPos, exp_color, exp_shape)；非法题面返回 (None, None, None)"""
    kind, stones = q['kind'], sorted(q['stones'], key=lambda s: s['pos'])
    per = PERIOD[kind]
    n = len(stones)
    if n != (8 if per == 4 else 6):
        return None, None, None
    hc = [s['color'] for s in stones[:per]]
    hs = [s.get('shape') for s in stones[:per]]
    if kind == 'aabb':
        if hc[0] != hc[1] or hc[2] != hc[3] or hc[0] == hc[2]:
            return None, None, None
    elif len(set(hc)) != per:
        return None, None, None
    if kind == 'dual' and (hs[0] is None or hs[0] == hs[1]):
        return None, None, None
    bad = -1
    for i, s in enumerate(stones):
        wrong = s['color'] != hc[i % per] or (kind == 'dual' and s.get('shape') != hs[i % per])
        if wrong:
            if bad >= 0:
                return None, None, None                    # 不符位必须恰一
            bad = i
    if bad < per:
        return None, None, None                            # 首周期完整（不变量）
    return bad, hc[bad % per], (hs[bad % per] if kind == 'dual' else None)

def seq_check(q):
    """B2 结构与规则全检（Python 独立——不读引擎 badPos/candOk，由 cycle_calc 重建）"""
    bad, expc, exps = cycle_calc(q)
    if bad is None:
        return False, '周期重建失败 %s' % [s['color'][:1] + (s.get('shape') or '')[:1] for s in sorted(q['stones'], key=lambda x: x['pos'])]
    if bad != q['badPos']:
        return False, 'badPos 引擎=%s 独立=%s' % (q['badPos'], bad)
    stones = sorted(q['stones'], key=lambda s: s['pos'])
    if sum(1 for s in stones if s['bad']) != 1 or not stones[bad]['bad']:
        return False, '错石标记数≠1'
    if q['kind'] == 'dual':
        for s in stones:
            if s.get('shape') not in ('square', 'round'):
                return False, 'dual 缺形状'
        bs = stones[bad]
        csame, ssame = bs['color'] == expc, bs['shape'] == exps
        if csame == ssame:
            return False, 'dual 错石非恰差一属性 got=(%s,%s) exp=(%s,%s)' % (bs['color'], bs['shape'], expc, exps)
    else:
        for s in stones:
            if s.get('shape'):
                return False, '单色章 shape 泄漏'
        row = {s['color'] for s in stones}
        if stones[bad]['color'] == expc or stones[bad]['color'] not in row:
            return False, '错石值不在行用色/等于应值'
        want = 2 if q['kind'] in ('ab', 'aabb') else PERIOD[q['kind']]
        if len(row) != want:
            return False, '行用色数 %d≠%d' % (len(row), want)
    for c in stones:
        if c['color'] not in COLORS5:
            return False, '色库外 %s' % c['color']
    cand = q['cand']
    if len(cand) != 3:
        return False, '候选 %d' % len(cand)
    keys = [(c['color'], c.get('shape')) for c in cand]
    if len(set(keys)) != 3:
        return False, '候选重复'
    exp_key = (expc, exps if q['kind'] == 'dual' else None)
    if keys.count(exp_key) != 1:
        return False, '应值候选≠恰一次'
    if keys.index(exp_key) != q['candOk']:
        return False, 'candOk 不指向应值'
    for c in cand:
        ck = (c['color'], c.get('shape'))
        if ck == exp_key:
            continue
        dc = ck[0] != expc
        ds = q['kind'] == 'dual' and ck[1] != exps
        if dc == ds:
            return False, '候选干扰非恰差一属性 %s' % (ck,)
    return True, ''

# ---- B2b Python 独立时长模型副本（SPEC §3-r9 数值重列，禁引引擎常量互证） ----
V_EST = lambda c: c * 345 + 600
V_SCAN = {'ab': 4200, 'abc': 5200, 'abcd': 6800, 'aabb': 6300, 'dual': 7800}
V_FIX, V_FOUND, V_STEP, V_BANK, V_RIGHT = 3000, 1600, 460, 900, 2400
V_FIXQ, V_FIXDO = '小桥上有一块石头放错啦，找一找', '选一块对的石头，补上去'
def dur_calc(L):
    tot = 0
    for i, q in enumerate(L):
        tot += V_EST(len(V_FIXQ)) + V_SCAN[q['kind']] + V_FOUND + \
               (V_EST(len(V_FIXDO)) if i == 0 else 0) + V_FIX + \
               len(q['stones']) * V_STEP + V_BANK + V_RIGHT
    return tot

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
    chk('B0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_q():
        return pg.evaluate('BG.quiz')

    def read_lv():
        return pg.evaluate('() => BG.currentLevel ? {step: BG.currentLevel.step, done: BG.currentLevel.done, dch: BG.currentLevel.dch} : null')

    def tap(i):
        return pg.evaluate('(i) => (async () => { try { const r = await BG.tapStone(i); return r } catch(e){ return "ERR" } })()', i)

    def fix(i):
        return pg.evaluate('(i) => (async () => { try { const r = await BG.tapCand(i); return r } catch(e){ return "ERR" } })()', i)

    # ---- 全量审计：40 关 × 5 题（每题 find 错点探针 → found → fix 错点探针 → 修对） ----
    all_levels = {}
    ch_fail, seq_fail, nxt_fail, drive_fail, dis_fail, dur_fail = [], [], [], [], [], []
    GEN_SNAP = '() => JSON.stringify(genLevel(%d).quizzes.map(q => ({kind:q.kind,stones:q.stones,badPos:q.badPos,cand:q.cand,candOk:q.candOk})))'
    for flat in range(40):
        gen_json_1 = pg.evaluate(GEN_SNAP % flat)          # 确定性快照（genLevel 侧，双读在 B4）
        pg.evaluate('(f) => { BG.start(f) }', flat)
        snaps = [gen_json_1]
        for k in range(5):
            for _ in range(300):
                q = read_q()
                if q:
                    break
                pg.wait_for_timeout(30)
            q = read_q()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                break
            snaps.append(json.dumps(q, sort_keys=True))
            kinds_expect = expect_kinds(flat)
            if kinds_expect is not None and q['kind'] not in kinds_expect:
                ch_fail.append((flat, k, q['kind']))
            if flat // 5 + 1 == 6 and flat < 30:
                pass                                          # ch6 混合 ≥3 型在关级判（下方）
            ok2, note2 = seq_check(q)
            if not ok2:
                seq_fail.append((flat, k, note2))
            # B2b：badPos/candOk 独立对账（每题）
            bad_c, expc_c, exps_c = cycle_calc(q)
            exp_key = (expc_c, exps_c if q['kind'] == 'dual' else None)
            cand_keys = [(c['color'], c.get('shape')) for c in q['cand']]
            if bad_c != q['badPos'] or cand_keys.index(exp_key) != q['candOk']:
                nxt_fail.append((flat, k, q['badPos'], bad_c, q['candOk']))
            # 逐题驱动：find 非错石错点 → found → fix 错候选 → 修对（walk 完成换题）
            non_bad = 0 if q['badPos'] != 0 else 1
            r = tap(non_bad)
            q2 = read_q()
            if not (r == 'wrong' and q2['miss'] == q['miss'] + 1 and q2['phase'] == 'find'):
                drive_fail.append((flat, k, 'find 错点语义', r, q2 and q2['miss'], q2 and q2['phase']))
            r = tap(q['badPos'])
            q3 = read_q()
            if not (r == 'found' and q3['phase'] == 'fix'):
                drive_fail.append((flat, k, 'found 语义', r, q3 and q3['phase']))
            bad_cand = 0 if q['candOk'] != 0 else 1
            r = fix(bad_cand)
            q4 = read_q()
            if not (r == 'wrong' and q4['miss'] == q3['miss'] + 1):
                drive_fail.append((flat, k, 'fix 错候选语义', r, q4 and q4['miss']))
            r = fix(q['candOk'])
            if r not in ('goal', 'done'):
                drive_fail.append((flat, k, '修对语义', r))
            for _ in range(400):                              # 等 walk 演出完成换题（verify SPEED=0.12≈0.6s；
                lv = read_lv()                                # 引擎 step 同步翻转不可作完成标志——
                dots = pg.evaluate("document.querySelectorAll('#step-dots i.done').length")
                if (lv and lv['done']) or (lv and lv['step'] > k and dots == k + 1):
                    break
                pg.wait_for_timeout(30)
        all_levels[flat] = snaps
        # ch6 静态混合 ≥3 型 / 生成关 dch 六章循环
        lv0 = pg.evaluate('() => { BG.start(%d); return {dch: BG.currentLevel.dch, kinds: BG.currentLevel.kinds}; }' % flat)
        if flat in (25, 26, 27, 28, 29) and len(set(lv0['kinds'])) < 3:
            ch_fail.append((flat, 'mix', lv0['kinds']))
        if flat >= 30 and not (1 <= lv0['dch'] <= 6):
            ch_fail.append((flat, 'gendch', lv0['dch']))
        # B2b：modeled 时长 Python 独立副本 ≥40s
        L_full = json.loads(gen_json_1)
        d_ms = dur_calc(L_full)
        if d_ms < 40000:
            dur_fail.append((flat, d_ms))
    chk('B1 章约束（40 关 kind 分布+ch6 混合+生成关 dch）', not ch_fail, str(ch_fail[:4]))
    chk('B2 纠错序列独立计算器（周期/恰一错石/恰差一属性/候选 3）', not seq_fail, str(seq_fail[:4]))
    chk('B2b badPos/candOk 独立对账（每题）', not nxt_fail, str(nxt_fail[:4]))
    chk('B3 引擎直驱（find wrong→found→fix wrong→修对 walk 换题）', not drive_fail, str(drive_fail[:4]))
    chk('B2c modeled 时长 Python 副本 ≥40000ms（40 关）', not dur_fail, str(dur_fail[:3]))

    # ---- B3b 阶段门：find 期点候选/fix 期点石头=null（防跨阶段输入） ----
    pg.evaluate('() => { BG.start(0) }')
    qg = read_q()
    g1 = fix(0)                                             # find 期点候选：UI 阶段门=拒绝 false
    tap(qg['badPos'])
    pg.wait_for_timeout(400)                                # FOUND_MS*0.12≈190ms 反馈窗后
    g2 = tap(0)                                             # fix 期点石头：拒绝 false
    g3 = pg.evaluate('engFix(genLevel(0), 0)')              # 引擎层：find 期 engFix=null
    g4 = pg.evaluate('engTap(genLevel(0), 0)')              # 引擎层：fresh 关 find 期 engTap(0) 非错石='wrong'
    chk('B3b 阶段门（find 期 tapCand=false / fix 期 tapStone=false / fresh 期非错石=wrong）',
        g1 is False and g2 is False and g3 is None and g4 == 'wrong', 'g1=%s g2=%s g3=%s g4=%s' % (g1, g2, g3, g4))

    # ---- B4 确定性：4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39, 45):
        gen_json_2 = pg.evaluate(GEN_SNAP % flat)           # 同 flat 双读（genLevel 确定性通道）
        gen_json_3 = pg.evaluate(GEN_SNAP % flat)
        snap1 = all_levels.get(flat, [None])[0]             # 主审计采集快照（flat<40 才有）
        if gen_json_2 != gen_json_3 or (snap1 is not None and gen_json_2 != snap1):
            diff.append(flat)
    chk('B4 确定性（flat 0/12/27/39/45 genLevel 双读 quizzes 一致）', not diff, str(diff))
    chk('B5 0 pageerror（复验全程）', not errs, str(errs[:2]))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
