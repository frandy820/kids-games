# -*- coding: utf-8 -*-
"""iftrain v2 独立复验（SPEC-BATCH31 §0.77 v2——r3 难度改造；断言从 SPEC 文字独立推导，禁抄实现）
W1 章约束（Python 封闭表 × 40 关全题）：
   single=主配表(情境→装备 1 件)+候选恒 4 含真值+近义干扰(SECONDARY[sit])恒在 /
   multi=组合表(两情境口播序→2 件)+干扰 ∉need∪SECONDARY[conds] /
   best=双装备表(情境→[主配,次配] 2 件)+干扰 ∉need /
   conflict=冲突表(两情境→1 件)+诱惑(软条件主配)恒在+干扰 ∉{gear,tempt,SECONDARY[key]} /
   ruleback=主配逆(装备→情境)+干扰 ∉valid_sits(主∪次)
W1b 覆盖（ch1 五关 6 情境全现 / ch2 每关 5 组合全现 / ch3 每关 best≥1+conflict≥1 且五关
   best 6 sit·conflict 3 行全现 / ch4 每关五型各 1 / 生成关 dch1-4 全现 / flat0 q0 锚 single/rain）
W2 提交状态机（含错件=wrong_more 清空+miss / 少选=wrong_less 保留 / 取消=零惩罚）
W3 星级（全最优=3★；故意 1 错=2★ 探测关）/ W4 确定性双读 / W5 引擎直驱+autoSolve 整关 /
W6 钩子契约（quiz 字段/answer 单答案=下标·multi·best=-1/need 恒列表/tapSubmit 单答案=false）
   +语音表（r3 六新句）+clips 28+0 pageerror
纪律：先等 title=VERIFY PASS（runVerify 自身 startLevel 竞态）；tapOpt/tapSubmit async——evaluate 侧 await；
     驱动前等 locked/demo 释放（verify SPEED=0.12，窗 ≤1s）。"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'iftrain', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# ---------- Python 独立封闭真值表（SPEC §0.77 v2 文字逐条转译，不引用页面符号） ----------
SITS = ['rain', 'sun', 'snow', 'cold', 'hot', 'wind']
GEARS = ['umbrella', 'sunhat', 'scarf', 'coat', 'fan', 'kite']
PRIMARY = {'rain': 'umbrella', 'sun': 'sunhat', 'snow': 'scarf',
           'cold': 'coat', 'hot': 'fan', 'wind': 'kite'}          # 主配 6
SECONDARY = {'rain': 'coat', 'sun': 'umbrella', 'snow': 'coat',
             'cold': 'scarf', 'hot': 'sunhat', 'wind': 'scarf'}   # 次配 6（封闭 12）
INV = {v: k for k, v in PRIMARY.items()}                          # 主配逆（ruleback）
VALID = {g: [s for s in SITS if PRIMARY[s] == g or SECONDARY[s] == g] for g in GEARS}
COMBOS = { ('rain', 'wind'): ['umbrella', 'coat'],                # 组合表 5（口播序键）
           ('cold', 'rain'): ['coat', 'umbrella'],
           ('snow', 'wind'): ['scarf', 'coat'],
           ('sun', 'wind'):  ['sunhat', 'kite'],
           ('sun', 'hot'):   ['sunhat', 'fan'] }
CONFLICTS = { ('hot', 'rain'):  {'key': 'rain', 'gear': 'umbrella', 'tempt': 'fan'},
              ('rain', 'sun'):  {'key': 'rain', 'gear': 'umbrella', 'tempt': 'sunhat'},
              ('cold', 'wind'): {'key': 'cold', 'gear': 'coat',    'tempt': 'kite'} }
SUBMIT_KINDS = {'multi', 'best'}
ANCHOR = {'kind': 'single', 'sit': 'rain', 'need': 'umbrella'}    # flat0 题0 教学锚
VOICE_R3 = { 'qTwo': ('rai_q_two', '要带两样呀'),
             'hMulti': ('rai_multi_hint', '两个天气都要想到哦'),
             'hBest': ('rai_best_hint', '要带两样才够哦'),
             'hConflict': ('rai_conflict_hint', '先想一定要带的哦'),
             'less': ('rai_less', '还差一样，再找一找哦'),
             'more': ('rai_more', '多带了一样，重新挑一挑哦') }


def check_quiz(flat, k, q, bad):
    """单题独立对账（期望全从上表推导）；返回 None（lawful）或原因串。"""
    kind, ids = q['kind'], [o['anim'] for o in q['opts']]
    need = list(q['need'])
    if len(ids) != 4:
        return 'optLen %s' % len(ids)
    if len(set(ids)) != 4:
        return 'optDup %s' % ids
    if kind == 'single':
        if len(q['conds']) != 1 or q['conds'][0] not in SITS:
            return 'singleCond %s' % q['conds']
        exp = [PRIMARY[q['conds'][0]]]
        if need != exp:
            return 'singleNeed %s exp=%s' % (need, exp)
        if SECONDARY[q['conds'][0]] not in ids:
            return 'singleNear %s' % ids                       # 同域近义恒在（§0.77 v2）
    elif kind == 'multi':
        sig = (q['conds'][0], q['conds'][1])
        exp = COMBOS.get(sig)
        if not exp or len(q['conds']) != 2:
            return 'comboSig %s' % (sig,)
        if sorted(need) != sorted(exp):
            return 'comboNeed %s exp=%s' % (need, exp)
        for c in sig:                                          # 半有效干扰排除
            if SECONDARY[c] in ids and SECONDARY[c] not in exp:
                return 'multiBan %s has %s' % (ids, SECONDARY[c])
    elif kind == 'best':
        if len(q['conds']) != 1 or q['conds'][0] not in SITS:
            return 'bestCond %s' % q['conds']
        exp = [PRIMARY[q['conds'][0]], SECONDARY[q['conds'][0]]]
        if sorted(need) != sorted(exp):
            return 'bestNeed %s exp=%s' % (need, exp)
    elif kind == 'conflict':
        sig = (q['conds'][0], q['conds'][1])
        cf = CONFLICTS.get(sig)
        if not cf or len(q['conds']) != 2:
            return 'cfSig %s' % (sig,)
        if need != [cf['gear']]:
            return 'cfNeed %s exp=%s' % (need, cf['gear'])
        if cf['tempt'] not in ids:
            return 'cfTempt %s' % ids                          # 诱惑恒在（推理靶心）
        for semi in (SECONDARY[cf['key']],):
            if semi in ids and semi not in need:
                return 'cfBan %s has %s' % (ids, semi)
    elif kind == 'ruleback':
        if q['ask'] not in GEARS:
            return 'backAsk %s' % q['ask']
        if need != [INV[q['ask']]]:
            return 'backNeed %s exp=%s' % (need, INV[q['ask']])
        for v in ids:
            if v != need[0] and v in VALID[q['ask']]:
                return 'backInvalid %s has %s' % (ids, v)      # 反向干扰禁区
    else:
        return 'kind %s' % kind
    pool = GEARS if kind != 'ruleback' else SITS
    if not all(v in pool for v in ids):
        return 'pool %s' % ids
    for n in need:                                             # 含全部真值
        if n not in ids:
            return 'truthMiss %s need=%s' % (ids, need)
    if kind in SUBMIT_KINDS:
        if q['answer'] != -1:
            return 'ansSubmit %s' % q['answer']
    else:
        if not (0 <= q['answer'] < 4) or ids[q['answer']] != need[0]:
            return 'ans %s need=%s' % (q['answer'], need)
    if q['picked'] != [] or q['miss'] != 0:
        return 'init'
    return None


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    t = ''
    for _ in range(240):                    # 先等 runVerify 收尾（防其内部 startLevel 与切关竞态）
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('W0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_q():
        return pg.evaluate('() => IF.quiz')

    def read_lv():
        return pg.evaluate('() => IF.currentLevel ? {step: IF.currentLevel.step, done: IF.currentLevel.done, dch: IF.currentLevel.dch, miss: IF.currentLevel.miss} : null')

    def call(fn_expr):
        return pg.evaluate('(async () => { try { return await (%s) } catch(e){ return "ERR" } })()' % fn_expr)

    def tap(i):
        return call('IF.tapOpt(%d)' % i)

    def submit():
        return call('IF.tapSubmit()')

    def wait_quiz(timeout_ms=5000):
        for _ in range(int(timeout_ms / 30)):
            q = read_q()
            if q:
                return q
            pg.wait_for_timeout(30)
        return None

    def stepped(k):
        lv = read_lv()
        return bool(lv) and (lv['step'] > k or lv['done'])

    def wait_step(k, timeout_ms=9000):
        for _ in range(int(timeout_ms / 30)):
            if stepped(k):
                return True
            pg.wait_for_timeout(30)
        return False

    def snapshot(q):
        return json.dumps({'kind': q['kind'], 'conds': q.get('conds'), 'ask': q.get('ask'),
                           'opts': [o['anim'] for o in q['opts']], 'need': q['need']}, sort_keys=True)

    def wait_unlock(timeout_ms=4000):
        """等演出窗/教学锁释放（finishWait 6400*SPEED=768ms、错防重入 120ms；state 为
        顶层 const，evaluate 可读——in-page verify 同款直读先例）。"""
        for _ in range(int(timeout_ms / 30)):
            if not pg.evaluate('() => state.locked || state.demo'):
                return True
            pg.wait_for_timeout(30)
        return False

    def drive_quiz(q):
        """最优驱动当前题到推进；返回 (ok, taps)。提交题=勾满 need+提交；单答案=点 answer。
        tap 被吞（False）=演出窗未放行，等待后重试不判失败。"""
        taps = 0
        guard = 0
        while guard < 24:
            guard += 1
            qq = read_q()
            if not qq:
                return (False, taps)
            if not wait_unlock():
                return (False, taps)
            if qq['kind'] in SUBMIT_KINDS:
                todo = next((i for i, cid in enumerate([o['anim'] for o in qq['opts']])
                             if cid in qq['need'] and i not in qq['picked']), None)
                if todo is not None:
                    r = tap(todo)
                    taps += 1
                    if r == 'pick':
                        pg.wait_for_timeout(60)
                        continue
                    if r is False:                 # 被锁吞：重试
                        pg.wait_for_timeout(120)
                        continue
                    return (False, taps)
                r = submit()
                if r is False:
                    pg.wait_for_timeout(120)
                    continue
                if r not in ('right', 'done'):
                    return (False, taps)
                return (True, taps)
            r = tap(qq['answer'])
            taps += 1
            if r is False:
                pg.wait_for_timeout(120)
                continue
            if r not in ('right', 'done'):
                return (False, taps)
            return (True, taps)
        return (False, taps)

    # ---- W1/W1b 全量审计：40 关 × 5 题（章约束+覆盖+锚定） ----
    all_snaps = {}
    ch_fail, drive_fail, star_fail = [], [], []
    PROBE_1WRONG = {3, 9, 17}         # 故意 1 错→2★ 探测关
    PROBE_STATE = {5}                 # W2 提交状态机探测关（miss 污染——从 3★ 断言排除）
    ch1_sits, ch3_best, ch3_cf = set(), set(), set()
    kind_seen_gen = {}
    for flat in range(40):
        pg.evaluate('(f) => { IF.start(f) }', flat)
        lv0 = read_lv()
        dch = lv0['dch']
        snaps, kinds = [], []
        ok_break = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            why = check_quiz(flat, k, q, ch_fail)
            if why:
                ch_fail.append((flat, k, why))
            snaps.append(snapshot(q))
            kinds.append(q['kind'])
            if flat < 20:                                  # 静态关：章型硬约束
                exp_dch = (flat // 5) + 1
                if dch != exp_dch:
                    ch_fail.append((flat, 'dch', dch, exp_dch))
                if exp_dch == 1 and q['kind'] != 'single':
                    ch_fail.append((flat, k, 'dch1 非 single', q['kind']))
                if exp_dch == 2 and q['kind'] != 'multi':
                    ch_fail.append((flat, k, 'dch2 非 multi', q['kind']))
                if exp_dch == 3 and q['kind'] not in ('best', 'conflict'):
                    ch_fail.append((flat, k, 'dch3 非 best/conflict', q['kind']))
            else:
                kind_seen_gen[dch] = kind_seen_gen.get(dch, set()) | {q['kind']}
            if dch == 4 and len(kinds) == 5 and len(set(kinds)) != 5:
                ch_fail.append((flat, k, 'dch4 五型不齐', kinds))
            if flat < 20 and dch == 1:
                ch1_sits.add(q['conds'][0])
            if flat < 20 and dch == 3:
                if q['kind'] == 'best':
                    ch3_best.add(q['conds'][0])
                if q['kind'] == 'conflict':
                    ch3_cf.add((q['conds'][0], q['conds'][1]))
            # flat0 q0 教学锚定：single/rain→umbrella
            if flat == 0 and k == 0:
                if q['kind'] != ANCHOR['kind'] or q['conds'][0] != ANCHOR['sit'] or \
                   q['need'] != [ANCHOR['need']]:
                    ch_fail.append((flat, k, 'anchor', q['need']))
            # ---- W2 提交状态机探测（flat5 题0，multi 关） ----
            if flat in PROBE_STATE and k == 0:
                anims = [o['anim'] for o in q['opts']]
                wi = next(i for i, c in enumerate(anims) if c not in q['need'])
                ni = [i for i, c in enumerate(anims) if c in q['need']]
                pW = tap(wi)                                   # 勾错件（判定在提交）
                sW = submit()                                  # 含错件=wrong_more 清空+miss
                m1 = read_q()
                p1 = tap(ni[0])                                # 勾 1 件
                sL = submit()                                  # 少选=wrong_less 保留
                m2 = read_q()
                pU = tap(ni[0])                                # 取消勾选零惩罚
                m3 = read_q()
                st_ok = (pW == 'pick' and sW == 'wrong_more' and m1['picked'] == [] and m1['miss'] == 1
                         and p1 == 'pick' and sL == 'wrong_less' and m2['picked'] == [ni[0]] and m2['miss'] == 1
                         and pU == 'unpick' and m3['picked'] == [] and m3['miss'] == 1)
                if not st_ok:
                    ch_fail.append((flat, k, 'submit 状态机', (pW, sW, p1, sL, pU)))
            # ---- W3b 1 错探测（flat3/9/17 首题故意错一次→2★） ----
            if flat in PROBE_1WRONG and k == 0:
                if q['kind'] in SUBMIT_KINDS:
                    wi = next(i for i, o in enumerate(q['opts']) if o['anim'] not in q['need'])
                    tap(wi)
                    submit()                                   # wrong_more：miss+1
                else:
                    wi = next(i for i in range(4) if i != q['answer'])
                    rW = tap(wi)
                    if rW != 'wrong':
                        ch_fail.append((flat, k, 'single wrong 探测', rW))
            ok, _ = drive_quiz(q)
            if not ok or not wait_step(k):
                drive_fail.append((flat, k, '驱动未推进'))
                ok_break = True
                break
        all_snaps[flat] = snaps
        # dch2 每关 5 组合全现 / dch3 每关 best+conflict 各 ≥1
        if len(kinds) == 5 and dch == 2 and len(set(tuple(s['conds']) for s in
           [json.loads(x) for x in snaps])) != 5:
            ch_fail.append((flat, 'dch2 组合覆盖', kinds))
        if len(kinds) == 5 and dch == 3 and ('best' not in kinds or 'conflict' not in kinds):
            ch_fail.append((flat, 'dch3 覆盖', kinds))
        # W3 星级（最优关=3★ / 1 错探测关=2★；状态机探测关污染排除）
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE_STATE and not ok_break:
            st = -1
            for _ in range(8):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => IF.currentLevel && IF.currentLevel.stars != null ? IF.currentLevel.stars : -1')
                if st != -1:
                    break
            if flat in PROBE_1WRONG:
                if st != 2 and st != -1:
                    star_fail.append((flat, '1 错非 2★', st))
            elif st != 3 and st != -1:
                star_fail.append((flat, '全最优非3★', st))
    chk('W1 章约束（封闭表/恒 4/干扰公平性/answer 语义/dch 章型/锚定）', not ch_fail, str(ch_fail[:5]))
    chk('W1b 覆盖（ch1 六情境全现/ch3 best 六 sit·conflict 三行全现）',
        ch1_sits == set(SITS) and ch3_best == set(SITS) and ch3_cf == set(CONFLICTS),
        'ch1=%d ch3best=%d ch3cf=%d' % (len(ch1_sits), len(ch3_best), len(ch3_cf)))
    gen_dchs = set(kind_seen_gen)
    gen_ok = (gen_dchs == {1, 2, 3, 4} and
              kind_seen_gen.get(1) == {'single'} and kind_seen_gen.get(2) == {'multi'} and
              kind_seen_gen.get(3) <= {'best', 'conflict'} and kind_seen_gen.get(3) and
              kind_seen_gen.get(4) == {'single', 'multi', 'best', 'conflict', 'ruleback'})
    chk('W1c 生成关 dch1-4 全现（dch1=single/dch2=multi/dch3⊆best·conflict 非空/dch4 五型全）',
        gen_ok, str({d: sorted(v) for d, v in kind_seen_gen.items()}))
    chk('W5 引擎直驱（need 逐题推进）', not drive_fail, str(drive_fail[:4]))
    chk('W3 星级（全最优=3★ / 1 错=2★ 探测关 flat3·9·17）', not star_fail, str(star_fail[:3]))

    # ---- W4 确定性：4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { IF.start(f) }', flat)
        snaps2 = []
        for k in range(5):
            q = wait_quiz()
            snaps2.append(snapshot(q) if q else None)
            if not q:
                diff.append((flat, k, 'unreadable'))
                break
            ok, _ = drive_quiz(q)
            if not ok or not wait_step(k):
                diff.append((flat, k, 'drive'))
                break
        if snaps2 != all_snaps.get(flat):
            diff.append(flat)
    chk('W4 确定性（flat 0/12/27/39 双读一致）', not diff, str(diff))

    # ---- W6 钩子契约+语音表+clips+非法 ----
    pg.evaluate('() => { IF.start(0) }')           # flat0 q0=single（answer=下标）；先刷新关
    wait_unlock()                                  # 清 won/locked 态（W4 通关残留会吞入口门）
    bad_idx = call('IF.tapOpt(99)')                # 非法下标=null（不炸）
    contract = pg.evaluate('''() => {
      const q = IF.quiz, lv = IF.currentLevel;
      const has = k => Object.prototype.hasOwnProperty.call(q, k);
      return { fields: ['kind','conds','ask','opts','answer','need','picked','step','miss'].every(has),
               needList: Array.isArray(q.need) && q.need.length === 1,
               ansIdx: typeof q.answer === 'number' && q.answer >= 0,
               lvFields: ['flat','ch','dch','step','done','stars'].every(k => k in lv) };
    }''')
    sub_single = call('IF.tapSubmit()')            # 单答案题 tapSubmit=false（不适用通道）
    pg.evaluate('() => { IF.start(5) }')           # flat5=multi（answer=-1）
    q5 = wait_quiz()
    multi_ok = q5['answer'] == -1 and len(q5['need']) == 2
    # 语音表（r3 delta 定版文案——与 manifest 严格一致）+clips 计数
    voice = pg.evaluate('() => ({ V: VOICE, clips: Object.keys(KIDS.voice.clips).length })')
    V = voice['V']
    voice_ok = all(V[k]['key'] == kv[0] and V[k]['text'] == kv[1] for k, kv in VOICE_R3.items()) and \
               voice['clips'] == 28
    chk('W6 钩子契约（字段/need 列表/answer 语义/单答案 tapSubmit/语音表 6 新句/clips 28）+0 pageerror',
        contract['fields'] and contract['needList'] and contract['ansIdx'] and contract['lvFields'] and
        bad_idx is None and sub_single is False and multi_ok and voice_ok and not errs,
        str((contract, bad_idx, sub_single, voice['clips'], errs[:1])))

    # ---- W5b autoSolve 整关（生成关 flat27） ----
    pg.evaluate('() => { IF.start(27) }')
    r = call('IF.autoSolve()')
    lv = read_lv()
    chk('W5b autoSolve 整关通关（flat27 生成关）',
        bool(r) and r != 'ERR' and r.get('done') and lv.get('done'), str((r, lv)))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
