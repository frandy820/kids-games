# -*- coding: utf-8 -*-
"""weather v2 独立复验（SPEC-BATCH23 §1 v2 条件推理——断言从 delta 独立推导，禁抄实现）
W1 章约束（Python 封闭表 × 40 关全题）：
   one=行表(天气,场景)→核心 1 件+候选当题天气类唯一 / multi=组合表(两条件签名)→2 件+类排他唯一 /
   temp=区间表(<0 羽绒+手套 / 0-8 厚外套+围巾 / 9-16 小外套 / 17-24 长袖 / 25+ 短袖+太阳帽)+
   候选当区间恰 outfit / who=梯子升降档(怕冷-1/怕热+1)+梯子 5 卡 / anti=∉场景 used 恰 1 件+卡数 4
W1b 覆盖（ch1 静态 5 关 9 行全现 / ch3 静态 5 关 9 档全现+每关 ≥1 边界 8/16/24 /
   ch4 每关 who·anti 各 ≥1+相邻题型互异 / 生成关 dch1-4 全现 / flat0 q0 锚定 multi=雨衣+小外套）
W2 提交状态机（含错件=wrong_more 清空+miss / 少选=wrong_less 保留 / 取消=零惩罚）
W3 星级（全最优=3★；故意 1 错=2★ 抽关）/ W4 确定性双读 / W5 autoSolve 整关 /
W6 钩子契约（quiz 契约字段+need 单件=字符串/多件=集；tapCloth 非法=false；tapCard 别名；
   单件题 tapSubmit=false）+语音表（4 新 hint+提交反馈文案）+0 pageerror
W7 nextHint 章末逐点独立副本（契约 A/F/M1）：静态 f=4/9/14/19=CHAPTERS[floor(f/5)+1] +
   生成关 f=24/29/34/39=GEN_HINTS[genLevel(f+1).dch-1] 实算 + off-by-one 哨兵（非上一章/非下下章/
   字面 (ci+1)%4 撞点时 nextHint 必须跟实算不跟字面）
W8 r9 时长硬断言 python 第二副本：40 关 modeled min ≥40000ms（py 常量重列）+与源 levelDurMs 逐关对账
纪律：先等 title=VERIFY PASS（runVerify 自身 startLevel 竞态）；tapCloth/tapSubmit async——evaluate 侧 await。"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'weather', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# ---------- Python 独立封闭真值表（SPEC v2 delta 文字逐条转译，不引用页面符号） ----------
POOL = {  # id: (天气类, 唯一温度区间 1-5 / 0=雨具)
    'downcoat': ('snow', 1), 'gloves': ('snow', 1), 'snowboots': ('snow', 1),
    'coat': ('snow', 2), 'scarf': ('snow', 2),
    'jacket': ('wind', 3), 'longsleeve': ('mild', 4),
    'shorts': ('sun', 5), 'sunhat': ('sun', 5), 'sandals': ('sun', 5), 'swimwear': ('sun', 5),
    'raincoat': ('rain', 0), 'rainboots': ('rain', 0),
}
def zone_of(t):  # <0→1 / 0-8→2 / 9-16→3 / 17-24→4 / ≥25→5
    return 1 if t < 0 else 2 if t <= 8 else 3 if t <= 16 else 4 if t <= 24 else 5
OUTFIT = {1: ['downcoat', 'gloves'], 2: ['coat', 'scarf'], 3: ['jacket'],
          4: ['longsleeve'], 5: ['shorts', 'sunhat']}
LADDER = ['downcoat', 'coat', 'jacket', 'longsleeve', 'shorts']
WHO_SHIFT = {'mom': -1, 'bunny': 1}
WHO_TEMPS = {5, 8, 12, 16, 18, 24}
ROWS = {  # ch1 行表：(天气, 场景) → 核心 1 件（9 行，键唯一）
    ('rain', 'school'): 'raincoat', ('rain', 'puddle'): 'rainboots',
    ('sun', 'school'): 'sunhat', ('sun', 'beach'): 'shorts', ('sun', 'swim'): 'swimwear',
    ('snow', 'school'): 'coat', ('snow', 'snowman'): 'gloves', ('snow', 'snowwalk'): 'snowboots',
    ('wind', 'park'): 'jacket',
}
def _cs(a, b):  # 组合条件签名（k 无关序）
    return tuple(sorted([a, b]))
COMBOS = {  # ch2 组合表：两条件签名 → 2 件
    _cs(('weather', 'rain'), ('weather', 'wind')): ['raincoat', 'jacket'],
    _cs(('weather', 'cold'), ('weather', 'rain')): ['coat', 'rainboots'],
    _cs(('weather', 'hot'), ('weather', 'sun')): ['sunhat', 'shorts'],
    _cs(('weather', 'cold'), ('weather', 'wind')): ['scarf', 'coat'],
    _cs(('weather', 'snow'), ('scene', 'snowman')): ['downcoat', 'gloves'],
}
ANTI = {  # 反向题：场景 → 会用上全集（干扰恰「会用上」；need=唯一 ∉ used）
    'beach': ['shorts', 'sunhat', 'sandals', 'swimwear'],
    'snowman': ['downcoat', 'gloves', 'scarf', 'snowboots'],
    'swim': ['swimwear', 'sandals', 'sunhat'],
}
TEMPS_ALL = {-5, 5, 8, 12, 16, 18, 24, 25, 32}
BOUNDARY = {8, 16, 24}
ANCHOR = ['raincoat', 'jacket']  # flat0 题0 教学锚定（雨+风）


def conds_sig(conds):
    return tuple(sorted((c['k'], c['v']) for c in conds))


def norm_need(q):
    n = q['need']
    return [n] if isinstance(n, str) else list(n)


def check_quiz(flat, k, q, bad):
    """单题独立对账（期望全从上表推导）；返回 None（ lawful）或原因串。"""
    kind, conds, ids = q['kind'], q['conds'], q['picks']
    if any(i not in POOL for i in ids):
        return 'lib'
    need = norm_need(q)
    if kind == 'one':
        w, sc = conds[0]['v'], conds[1]['v']
        exp = ROWS.get((w, sc))
        if not exp or conds[0]['k'] != 'weather' or conds[1]['k'] != 'scene':
            return 'rowCond %s/%s' % (w, sc)
        if need != [exp]:
            return 'rowNeed %s->%s exp=%s' % (w, sc, need)
        n_cls = sum(1 for i in ids if POOL[i][0] == w)
        if n_cls != 1 or len(ids) != 6 or ids.count(exp) != 1:
            return 'oneUni %s' % ids
    elif kind == 'multi':
        sig = conds_sig(conds)
        exp = COMBOS.get(sig)
        if not exp or len(conds) != 2:
            return 'comboSig %s' % (sig,)
        if sorted(need) != sorted(exp):
            return 'comboNeed %s exp=%s' % (need, exp)
        n_cls = sum(1 for i in ids if POOL[i][0] in {POOL[e][0] for e in exp})
        if n_cls != 2 or len(ids) != 6:
            return 'multiUni %s' % ids
    elif kind == 'temp':
        if conds[0]['k'] != 'temp':
            return 'tempCond'
        t = conds[0]['v']
        if sorted(need) != sorted(OUTFIT[zone_of(t)]):
            return 'outfit t=%s need=%s' % (t, need)
        z_in = [i for i in ids if POOL[i][1] == zone_of(t)]
        if sorted(z_in) != sorted(OUTFIT[zone_of(t)]) or len(ids) != 6:
            return 'tempUni t=%s %s' % (t, ids)
    elif kind == 'who':
        if conds[0]['k'] != 'temp' or conds[1]['k'] != 'person':
            return 'whoCond'
        t, p = conds[0]['v'], conds[1]['v']
        if t not in WHO_TEMPS or p not in WHO_SHIFT:
            return 'whoParam %s/%s' % (t, p)
        exp = LADDER[max(0, min(4, zone_of(t) - 1 + WHO_SHIFT[p]))]
        if need != [exp] or sorted(ids) != sorted(LADDER) or len(ids) != 5:
            return 'who t=%s p=%s need=%s exp=%s' % (t, p, need, exp)
    elif kind == 'anti':
        if conds[0]['k'] != 'scene':
            return 'antiCond'
        used = ANTI.get(conds[0]['v'])
        if not used or need[0] in used:
            return 'antiNeed %s' % conds[0]['v']
        n_out = sum(1 for i in ids if i not in used)
        if n_out != 1 or len(ids) != 4:
            return 'antiUni %s' % ids
    else:
        return 'kind %s' % kind
    if len(set(ids)) != len(ids):
        return 'dup'
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
        return pg.evaluate('() => WE.quiz')

    def read_lv():
        return pg.evaluate('() => WE.currentLevel ? {step: WE.currentLevel.step, done: WE.currentLevel.done, dch: WE.currentLevel.dch} : null')

    def call(fn_expr):
        return pg.evaluate('(async () => { try { return await (%s) } catch(e){ return "ERR" } })()' % fn_expr)

    def tap(i):
        return call('WE.tapCloth(%d)' % i)

    def submit():
        return call('WE.tapSubmit()')

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

    def wait_step(k, timeout_ms=8000):
        for _ in range(int(timeout_ms / 30)):
            if stepped(k):
                return True
            pg.wait_for_timeout(30)
        return False

    def snapshot(q):
        return json.dumps({'kind': q['kind'], 'conds': q['conds'], 'picks': q['picks'], 'need': q['need']}, sort_keys=True)

    def drive_quiz(q):
        """最优驱动当前题到推进；返回 (ok, taps)。多件=勾满 need+提交；单件=点 right 卡。"""
        taps = 0
        need = norm_need(q)
        guard = 0
        while guard < 24:
            guard += 1
            qq = read_q()
            if not qq:
                return (False, taps)
            nd = norm_need(qq)
            if len(nd) > 1:
                todo = next((i for i, cid in enumerate(qq['picks'])
                             if cid in nd and i not in qq['picked']), None)
                if todo is not None:
                    r = tap(todo)
                    taps += 1
                    if r != 'pick':
                        return (False, taps)
                    pg.wait_for_timeout(120)
                    continue
                r = submit()
                if r not in ('right', 'done'):
                    return (False, taps)
                return (True, taps)
            idx = qq['picks'].index(nd[0])
            r = tap(idx)
            taps += 1
            if r not in ('right', 'done'):
                return (False, taps)
            return (True, taps)
        return (False, taps)

    # ---- W1/W1b 全量审计：40 关 × 5 题（章约束+覆盖+锚定） ----
    all_snaps = {}
    ch_fail, drive_fail, star_fail = [], [], []
    PROBE_1WRONG = {3, 9, 17}         # 故意 1 错→2★ 探测关
    PROBE_STATE = {5}                 # W2 提交状态机探测关（miss 污染——从 3★ 断言排除）
    rows_seen, temps_seen, kind_seen_gen = set(), set(), {}
    for flat in range(40):
        pg.evaluate('(f) => { WE.start(f) }', flat)
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
                if exp_dch == 1 and not (flat == 0 and k == 0) and q['kind'] != 'one':
                    ch_fail.append((flat, k, 'dch1 非单件', q['kind']))
                if exp_dch == 2 and q['kind'] != 'multi':
                    ch_fail.append((flat, k, 'dch2 非 multi', q['kind']))
                if exp_dch == 3 and q['kind'] != 'temp':
                    ch_fail.append((flat, k, 'dch3 非 temp', q['kind']))
            else:
                kind_seen_gen[dch] = kind_seen_gen.get(dch, set()) | {q['kind']}
            if dch == 4:
                if k > 0 and q['kind'] == kinds[k - 1]:
                    ch_fail.append((flat, k, 'dch4 相邻同型'))
            if q['kind'] == 'one':
                rows_seen.add((q['conds'][0]['v'], q['conds'][1]['v']))
            if q['kind'] == 'temp':
                temps_seen.add(q['conds'][0]['v'])
            # flat0 q0 教学锚定：multi 且 need=雨衣+小外套（双条件 雨+风）
            if flat == 0 and k == 0:
                if q['kind'] != 'multi' or sorted(norm_need(q)) != sorted(ANCHOR):
                    ch_fail.append((flat, k, 'anchor', q['need']))
            # ---- W2 提交状态机探测（flat5 题0，全 multi 关） ----
            if flat in PROBE_STATE and k == 0:
                nd = norm_need(q)
                wi = next(i for i, cid in enumerate(q['picks']) if cid not in nd)
                ni = [i for i, cid in enumerate(q['picks']) if cid in nd]
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
                nd = norm_need(q)
                if len(nd) > 1:
                    wi = next(i for i, cid in enumerate(q['picks']) if cid not in nd)
                    tap(wi)
                    submit()                                   # wrong_more：miss+1
                else:
                    wi = next(i for i, cid in enumerate(q['picks']) if cid != nd[0])
                    rW = tap(wi)
                    if rW != 'wrong':
                        ch_fail.append((flat, k, 'single wrong 探测', rW))
            ok, _ = drive_quiz(q)
            if not ok or not wait_step(k):
                drive_fail.append((flat, k, '驱动未推进'))
                ok_break = True
                break
        all_snaps[flat] = snaps
        # dch4 每关 who/anti 各 ≥1
        if len(kinds) == 5 and dch == 4 and ('who' not in kinds or 'anti' not in kinds):
            ch_fail.append((flat, 'dch4 覆盖', kinds))
        # W3 星级（最优关=3★ / 1 错探测关=2★；状态机探测关污染排除）
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE_STATE and not ok_break:
            st = -1
            for _ in range(8):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => WE.currentLevel && WE.currentLevel.stars != null ? WE.currentLevel.stars : -1')
                if st != -1:
                    break
            if flat in PROBE_1WRONG:
                if st != 2 and st != -1:
                    star_fail.append((flat, '1 错非 2★', st))
            elif st != 3 and st != -1:
                star_fail.append((flat, '全最优非3★', st))
    chk('W1 章约束（封闭表/唯一正确/卡数 6-5-4/锚定/dch4 覆盖）', not ch_fail, str(ch_fail[:5]))
    chk('W1b 覆盖（ch1 九行全现/ch3 九档全现+边界）',
        rows_seen == set(ROWS) and temps_seen == TEMPS_ALL and BOUNDARY <= temps_seen,
        'rows=%d temps=%s' % (len(rows_seen), sorted(temps_seen)))
    gen_dchs = set(kind_seen_gen)
    gen_ok = (gen_dchs == {1, 2, 3, 4} and
              kind_seen_gen.get(1) == {'one'} and kind_seen_gen.get(2) == {'multi'} and
              kind_seen_gen.get(3) == {'temp'} and
              {'who', 'anti'} <= kind_seen_gen.get(4, set()))
    chk('W1c 生成关 dch1-4 全现（dch1=one/dch2=multi/dch3=temp/dch4 含 who·anti）',
        gen_ok, str({d: sorted(v) for d, v in kind_seen_gen.items()}))
    chk('W5 引擎直驱（need 逐题推进）', not drive_fail, str(drive_fail[:4]))
    chk('W3 星级（全最优=3★ / 1 错=2★ 探测关 flat3·9·17）', not star_fail, str(star_fail[:3]))

    # ---- W4 确定性：4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { WE.start(f) }', flat)
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

    # ---- W6 钩子契约+语音表+非法 ----
    bad_idx = call('WE.tapCloth(99)')                # 非法下标=false（不炸）
    bad_alias = call('WE.tapCard(99)')               # 既有别名同语义
    pg.evaluate('WE.start(0)')                       # flat0 q0=multi（need=集）
    contract = pg.evaluate('''() => {
      const q = WE.quiz, lv = WE.currentLevel;
      const has = k => Object.prototype.hasOwnProperty.call(q, k);
      return { fields: ['kind','conds','picks','need','picked','step','miss'].every(has),
               multiNeedList: Array.isArray(q.need) && q.need.length === 2,
               condsKv: q.conds.every(c => 'k' in c && 'v' in c),
               lvFields: ['flat','ch','dch','step','done','stars'].every(k => k in lv),
               alias: WE.tapCard !== undefined && WE.tapCloth !== undefined };
    }''')
    # 单件题 tapSubmit=false（不适用通道）
    pg.evaluate('() => { WE.start(2) }')             # flat2=dch1 单件章
    q2 = wait_quiz()
    sub_single = call('WE.tapSubmit()')
    single_ok = isinstance(q2['need'], str) and not sub_single
    # 语音表（delta 定版文案——与 manifest 严格一致）
    voice = pg.evaluate('() => ({ V: VOICE, S: SUBMIT_TEXT, clips: Object.keys(KIDS.voice.clips).length })')
    # T46（2026-09-19 主线补键后）：SUBMIT_TEXT 升 {key,text}（wea_sub_less/more clip 化），
    # clips=59（wea 16+T46 题面 17+提交 2+temp/who 21 + core 3）——期望从 manifest/SPEC 推导
    voice_ok = (voice['V']['hintMulti'] == {'key': 'wea_multi_hint', 'text': '两个条件都要想到哦'} and
                voice['V']['hintTemp'] == {'key': 'wea_temp_hint', 'text': '看看温度计，几度呀'} and
                voice['V']['hintWho'] == {'key': 'wea_who_hint', 'text': '想一想，谁更怕冷呀'} and
                voice['V']['hintAnti'] == {'key': 'wea_anti_hint', 'text': '找一找，哪件用不上'} and
                voice['S']['less'] == {'key': 'wea_sub_less', 'text': '还差一件，再找一找哦'} and
                voice['S']['more'] == {'key': 'wea_sub_more', 'text': '多选了一件，重新挑一挑哦'} and
                voice['clips'] == 59)
    chk('W6 钩子契约（字段/need 类型/别名/单件 tapSubmit/语音表/非法下标）+0 pageerror',
        contract['fields'] and contract['multiNeedList'] and contract['condsKv'] and
        contract['lvFields'] and contract['alias'] and
        bad_idx is False and bad_alias is False and single_ok and voice_ok and not errs,
        str((contract, bad_idx, sub_single, voice['clips'], errs[:1])))

    # ---- W7 nextHint 章末逐点独立副本（契约 A/F/M1）+off-by-one 哨兵 ----
    nh_fail = []
    chapters = pg.evaluate('[1, 2, 3, 4].map(i => CHAPTERS[i].hint)')   # chapters[k]=CHAPTERS[k+1]
    gens = pg.evaluate('GEN_HINTS')
    for f in (4, 9, 14, 19):
        ci = f // 5
        got = pg.evaluate('nextHint(%d)' % f)
        if got != chapters[ci]:
            nh_fail.append((f, 'expected CHAPTERS[%d]' % (ci + 1), got))
        if ci > 0 and got == chapters[ci - 1]:
            nh_fail.append((f, 'off-by-one 上一章', got))
        if got == chapters[min(3, ci + 1)] and ci < 3:
            nh_fail.append((f, 'off-by-one 下下章', got))
    for f in (24, 29, 34, 39):
        exp_idx = pg.evaluate('genLevel(%d).dch - 1' % (f + 1))
        got = pg.evaluate('nextHint(%d)' % f)
        if got != gens[exp_idx]:
            nh_fail.append((f, 'expected GEN_HINTS[%d]' % exp_idx, got))
    # 字面哨兵：找生成关使实算 dch-1 ≠ 字面 (ci+1)%4 → nextHint 必须跟实算不跟字面
    sent = pg.evaluate('''(() => {
      for (let f = 24; f < 60; f++) {
        const ci = Math.floor(f / 5), real = genLevel(f + 1).dch - 1, lit = (ci + 1) % 4;
        if (ci >= 4 && real !== lit) return { f: f, real: real, lit: lit, got: nextHint(f) };
      }
      return null;
    })()''')
    if sent:
        if not (sent['got'] == gens[sent['real']] and sent['got'] != gens[sent['lit']]):
            nh_fail.append(('sentinel', sent))
    else:
        # m5：找不到撞点=哨兵失效（恒真路径），须 fail 而非静默通过
        nh_fail.append(('sentinel', 'no-diff-found in f=24..59'))
    chk('W7 nextHint 章末逐点（静态 4 点+生成关 4 点实算）+off-by-one/字面哨兵', not nh_fail,
        str((nh_fail[:3], sent)))

    # ---- W8 r9 时长硬断言 python 第二副本（常量重列，禁页内模型互证）+源对账 ----
    qs = pg.evaluate('Array.from({length:40}, (_, f) => genLevel(f).quizzes.map('
                     'q => ({ k: q.kind, n: q.need.length, s: q.stem.length })))')
    py_est = lambda c: c * 345 + 600
    py_decide = {'one': 7400, 'multi': 8000, 'temp': 7800, 'who': 8200, 'anti': 7000}
    dur_py = [sum(max(py_est(q['s']), py_decide[q['k']]) + (1600 if q['n'] > 1 else 0)
                  for q in lvq) + 5 * 900 for lvq in qs]
    src = pg.evaluate('Array.from({length:40}, (_, f) => levelDurMs(genLevel(f)))')
    chk('W8 modeled duration >=40s/关（python 第二副本）+与源模型逐关对账',
        min(dur_py) >= 40000 and dur_py == src, 'min=%d ms' % min(dur_py))

    # ---- W5b autoSolve 整关（生成关 flat27） ----
    pg.evaluate('() => { WE.start(27) }')
    r = call('WE.autoSolve()')
    lv = read_lv()
    chk('W5b autoSolve 整关通关（flat27 生成关）',
        bool(r) and r != 'ERR' and r.get('done') and lv.get('done'), str((r, lv)))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
