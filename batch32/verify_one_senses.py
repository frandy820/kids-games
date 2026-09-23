# -*- coding: utf-8 -*-
"""senses v2 独立复验（SPEC-BATCH32 §6 r11——四族难度改造；断言从 SPEC 文字独立推导，禁抄实现）
W1 章约束（Python 封闭表 × 40 关全题）：
   find=findsense（物品→主感官，候选感官互异含真值恒 4）/findthing（感官→物品，干扰不含同感官
   另一物——防双真值）；multi=候选感官 5 全集+answers=该物感官集下标恰 3+answer=-1；
   anti=相关恰 3（2 单感官物+1 含 S 多感官物）+不相关恰 1=answer；
   comp=blocked∈该物感官集+诱惑（被捂）恒在场恰 1+可用真值恰 1（另一剩余禁在场）+集外恰 2
W1b 覆盖（静态 20 关 multi 5 物全现·anti 5 感官全现·ch3 每关 comp 1·ch4 每关 comp 2·
   ch1 find 两子族全现 / 生成关 dch1-4 全现+五 kind 全现）
W1c r11 认知建模（Python 独立 MODELED 表逐关复算 ≥40000）
W2 multi 提交状态机（flat5 q1：错选集=wrong 清空+miss/取消零惩罚/空选 false 不计 miss）
W3 星级（全最优=3★ / 1 错=2★ 探测关 flat3·9·17）/ W4 确定性双读 /
W5 引擎直驱+W5b autoSolve（flat27 生成关）
W6 钩子契约（quiz 字段/answer 单选=下标·multi=-1/tapSubmit 单选=false）+语音表（r11 六新句）
   +clips 36+章末预告独立对账+off-by-one 哨兵+生成关预告实算+0 pageerror
W7 anti 抑制（flat6 q0：点相关=wrong；answer=唯一不相关——Python 独立复算）
W8 comp 代偿（flat16 q0：点被捂诱惑=wrong；真值=唯一可用感官——Python 独立复算）
纪律：先等 title=VERIFY PASS；tapOpt/tapSubmit async——evaluate 侧 await；错链豁免窗 9.5ms 真时钟
     内提交被吞——错后统一等 9.7s 再驱动后续 multi 提交。"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'senses', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# ---------- Python 独立封闭真值表（SPEC §6 r11 文字逐条转译，不引用页面符号） ----------
SENSES = ['eye', 'ear', 'nose', 'hand', 'mouth']
THINGS = ['rainbow', 'star', 'bell', 'birdsong', 'flower',
          'cookie', 'softtoy', 'ice', 'lemon', 'candy']
SENSE_OF = {'rainbow': 'eye', 'star': 'eye', 'bell': 'ear', 'birdsong': 'ear',
            'flower': 'nose', 'cookie': 'nose', 'softtoy': 'hand', 'ice': 'hand',
            'lemon': 'mouth', 'candy': 'mouth'}
MULTI = {'popcorn': ['eye', 'ear', 'nose'], 'watermelon': ['eye', 'ear', 'mouth'],
         'kitten': ['eye', 'ear', 'hand'], 'soup': ['eye', 'nose', 'mouth'],
         'drum': ['eye', 'ear', 'hand']}
CH_FAMILY = {1: ['find', 'multi', 'find', 'multi', 'multi'],
             2: ['anti', 'multi', 'anti', 'find', 'anti'],
             3: ['anti', 'multi', 'comp', 'multi', 'anti'],
             4: ['comp', 'multi', 'anti', 'comp', 'find']}
MODELED = {'find': 4500, 'anti': 7500, 'multi': 15000, 'comp': 9000}   # r11 认知建模 ms/题
MODELED_FLOOR = 40000
CHAPTER_HINTS = {1: '接下来，要找一个不一样的哦', 2: '捂住一个感官，还能用什么呀',
                 3: '什么都混在一起，大挑战', 4: '新一轮五感大挑战'}
GEN_HINTS = ['选感官，还要找全哦', '找一个不一样的哦', '捂住一个，想一想哦', '五感大集合，来挑战']
ANCHOR = {'kind': 'findsense', 'ask': 'bell'}          # flat0 题0 教学锚（闹钟响响点耳朵）
VOICE_R11 = {'q3':    ('sen_q3', '都用什么呢，找全哦'),
             'qNot':  ('sen_q_not', '哪个不是用'),
             'qNot2': ('sen_q_not2', '的呀'),
             'qCov1': ('sen_q_cov1', '捂住了'),
             'qCov2': ('sen_q_cov2', '还能用什么呀'),
             'mw':    ('sen_mw', '没有找全哦')}
WINDOW_WAIT = 9700          # 错链豁免窗 9500ms 真时钟 + 余量


def fam_of(kind):
    return 'find' if kind in ('findsense', 'findthing') else kind


def check_quiz(flat, k, q, dch, bad):
    """单题独立对账（期望全从上表推导）；返回 None（lawful）或原因串。"""
    kind, ids = q['kind'], [o['anim'] for o in q['opts']]
    if CH_FAMILY[dch][k] != fam_of(kind):
        return 'chFam %s/%s dch%s' % (kind, k, dch)
    if flat == 0 and k == 0 and (kind != ANCHOR['kind'] or q['ask'] != ANCHOR['ask']):
        return 'anchor %s/%s' % (kind, q['ask'])
    if kind in ('findsense', 'findthing'):
        if len(ids) != 4 or len(set(ids)) != 4:
            return 'findLen %s' % ids
        if kind == 'findsense':
            if q['ask'] not in THINGS:
                return 'fsAsk %s' % q['ask']
            if not all(v in SENSES for v in ids):
                return 'fsPool %s' % ids
            truth = SENSE_OF[q['ask']]
            if ids[q['answer']] != truth:
                return 'fsAns %s truth=%s' % (q['answer'], truth)
        else:
            if q['ask'] not in SENSES:
                return 'ftAsk %s' % q['ask']
            if not all(v in THINGS for v in ids):
                return 'ftPool %s' % ids
            same = [v for v in ids if SENSE_OF[v] == q['ask']]
            if len(same) != 1 or ids[q['answer']] != same[0]:
                return 'ftTruth %s' % ids                     # 防双真值：同感官对至多 1 物
            senses_seen = [SENSE_OF[v] for v in ids]
            if len(set(senses_seen)) != 4:
                return 'ftPair %s' % ids                      # 同感官另一物禁在场
    elif kind == 'multi':
        if q['ask'] not in MULTI:
            return 'muAsk %s' % q['ask']
        if len(ids) != 5 or len(set(ids)) != 5 or set(ids) != set(SENSES):
            return 'muSet %s' % ids                           # 候选=感官 5 全集
        exp = sorted(i for i, v in enumerate(ids) if v in MULTI[q['ask']])
        if sorted(q['answers']) != exp:
            return 'muAns %s exp=%s' % (q['answers'], exp)
        if q['answer'] != -1:
            return 'muAnsIdx %s' % q['answer']
    elif kind == 'anti':
        if q['ask'] not in SENSES:
            return 'anAsk %s' % q['ask']
        if len(ids) != 4 or len(set(ids)) != 4:
            return 'anLen %s' % ids
        if not all(v in THINGS or v in MULTI for v in ids):
            return 'anPool %s' % ids
        rel_single = [v for v in ids if v in THINGS and SENSE_OF[v] == q['ask']]
        rel_multi = [v for v in ids if v in MULTI and q['ask'] in MULTI[v]]
        unrel = [v for v in ids if (v in THINGS and SENSE_OF[v] != q['ask']) or
                 (v in MULTI and q['ask'] not in MULTI[v])]
        if len(rel_single) != 2 or len(rel_multi) != 1 or len(unrel) != 1:
            return 'anRel s=%s m=%s u=%s' % (rel_single, rel_multi, unrel)
        if ids[q['answer']] != unrel[0]:
            return 'anAns %s unrel=%s' % (q['answer'], unrel)
    elif kind == 'comp':
        if q['ask'] not in MULTI:
            return 'coAsk %s' % q['ask']
        if q['blocked'] not in MULTI[q['ask']]:
            return 'coBlocked %s' % q['blocked']
        if len(ids) != 4 or len(set(ids)) != 4 or not all(v in SENSES for v in ids):
            return 'coSet %s' % ids
        ms = MULTI[q['ask']]
        blocked_n = sum(1 for v in ids if v == q['blocked'])
        avail = [v for v in ids if v in ms and v != q['blocked']]
        outside = [v for v in ids if v not in ms]
        if blocked_n != 1 or len(avail) != 1 or len(outside) != 2:
            return 'coPrior b=%d a=%s o=%d' % (blocked_n, avail, len(outside))
        if ids[q['answer']] != avail[0]:
            return 'coAns %s avail=%s' % (q['answer'], avail)
    else:
        return 'kind %s' % kind
    if q['miss'] != 0:
        return 'init'
    if kind == 'multi' and q['picked'] != []:
        return 'initPicked'
    return None


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    t = ''
    for _ in range(300):                    # 先等 runVerify 收尾（防其内部 startLevel 与切关竞态）
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('W0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_q():
        return pg.evaluate('() => SE.quiz')

    def read_lv():
        return pg.evaluate('() => SE.currentLevel ? {step: SE.currentLevel.step, done: SE.currentLevel.done, dch: SE.currentLevel.dch, miss: SE.currentLevel.miss} : null')

    def call(fn_expr):
        return pg.evaluate('(async () => { try { return await (%s) } catch(e){ return "ERR" } })()' % fn_expr)

    def tap(i):
        return call('SE.tapOpt(%d)' % i)

    def submit():
        return call('SE.tapSubmit()')

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

    def wait_unlock(timeout_ms=4000):
        for _ in range(int(timeout_ms / 30)):
            if not pg.evaluate('() => state.locked || state.demo'):
                return True
            pg.wait_for_timeout(30)
        return False

    def snapshot(q):
        d = {'kind': q['kind'], 'ask': q['ask'], 'opts': [o['anim'] for o in q['opts']]}
        if 'answers' in q:
            d['answers'] = q['answers']
        if 'blocked' in q:
            d['blocked'] = q['blocked']
        return json.dumps(d, sort_keys=True)

    def drive_quiz(qq_unused):
        """最优驱动当前题到推进：multi=勾满 answers+提交；单选=点 answer。
        tap/submit 被吞（False）=演出窗未放行，等待后重试不判失败。"""
        guard = 0
        while guard < 120:
            guard += 1
            qq = read_q()
            if not qq:
                return False
            if not wait_unlock():
                return False
            if qq['kind'] == 'multi':
                todo = next((i for i in qq['answers'] if i not in qq['picked']), None)
                if todo is not None:
                    r = tap(todo)
                    if r == 'pick':
                        pg.wait_for_timeout(60)
                        continue
                    if r is False:
                        pg.wait_for_timeout(200)
                        continue
                    return False
                r = submit()
                if r is False:
                    pg.wait_for_timeout(200)
                    continue
                return r in ('right', 'done')
            r = tap(qq['answer'])
            if r is False:
                pg.wait_for_timeout(200)
                continue
            return r in ('right', 'done')
        return False

    # ---- W1/W1b/W1c 全量审计：40 关 × 5 题 ----
    all_snaps, kinds_by_flat = {}, {}
    ch_fail, drive_fail, star_fail, mod_fail = [], [], [], []
    PROBE_1WRONG = {3, 9, 17}         # 故意 1 错→2★ 探测关（q0 恒单选题型）
    PROBE_POLLUTED = {5, 6, 16}       # W2/W7/W8 探测关（miss 污染——从 3★ 断言排除）
    static_multi, static_anti = set(), set()
    ch1_find_kinds = set()
    gen_dch_kinds = {}
    for flat in range(40):
        pg.evaluate('(f) => { SE.start(f) }', flat)
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
            if flat < 20 and dch != (flat // 5) + 1:
                ch_fail.append((flat, 'dch', dch))
            why = check_quiz(flat, k, q, dch, ch_fail)
            if why:
                ch_fail.append((flat, k, why))
            snaps.append(snapshot(q))
            kinds.append(q['kind'])
            if flat < 20:
                if q['kind'] == 'multi':
                    static_multi.add(q['ask'])
                if q['kind'] == 'anti':
                    static_anti.add(q['ask'])
                if dch == 1 and q['kind'] in ('findsense', 'findthing'):
                    ch1_find_kinds.add(q['kind'])
            else:
                gen_dch_kinds.setdefault(dch, set()).add(q['kind'])
            # ---- W7 anti 抑制探测（flat6 q0）：点相关=wrong；answer=Python 独立复算不相关 ----
            advanced = False            # 探测终点若已答对本题（rR=right），跳过 drive 防双推进
            if flat == 6 and k == 0:
                ids = [o['anim'] for o in q['opts']]
                unrel = [i for i, v in enumerate(ids)
                         if (v in THINGS and SENSE_OF[v] != q['ask']) or
                            (v in MULTI and q['ask'] not in MULTI[v])]
                rel = next(i for i in range(4) if i != q['answer'])
                rW = tap(rel)
                m1 = read_q()
                rR = tap(q['answer'])
                w7 = (rW == 'wrong' and m1['miss'] == 1 and len(unrel) == 1 and
                      ids[q['answer']] == ids[unrel[0]] and rR == 'right')
                if not w7:
                    ch_fail.append((flat, k, 'anti 抑制探测', (rW, rR, unrel)))
                advanced = (rR == 'right')
                pg.wait_for_timeout(WINDOW_WAIT)      # 错链豁免窗让路（后续 multi 提交）
            # ---- W8 comp 代偿探测（flat16 q0）：点被捂诱惑=wrong；真值=唯一可用 ----
            if flat == 16 and k == 0:
                ids = [o['anim'] for o in q['opts']]
                tI = ids.index(q['blocked'])
                avail = [v for v in ids if v in MULTI[q['ask']] and v != q['blocked']]
                rW = tap(tI)
                m1 = read_q()
                rR = tap(q['answer'])
                w8 = (rW == 'wrong' and m1['miss'] == 1 and len(avail) == 1 and
                      ids[q['answer']] == avail[0] and tI != q['answer'] and rR == 'right')
                if not w8:
                    ch_fail.append((flat, k, 'comp 代偿探测', (rW, rR, avail)))
                advanced = (rR == 'right')
                pg.wait_for_timeout(WINDOW_WAIT)
            # ---- W3b 1 错探测（flat3/9/17 q0 故意错一次→2★；后续提交等豁免窗） ----
            if flat in PROBE_1WRONG and k == 0:
                wi = next(i for i in range(4) if i != q['answer'])
                rW = tap(wi)
                if rW != 'wrong':
                    ch_fail.append((flat, k, '1 错探测', rW))
                pg.wait_for_timeout(WINDOW_WAIT)
            # ---- W2 multi 提交状态机探测（flat5 q1：错选集→wrong 清空+miss/取消零惩罚/空选 false） ----
            if flat == 5 and k == 1 and q['kind'] == 'multi':
                ids = [o['anim'] for o in q['opts']]
                wi = next(i for i, v in enumerate(ids) if i not in q['answers'])
                pW = tap(wi)                          # 勾干扰（勾选中性不吞）
                pA = tap(q['answers'][0])             # 勾真值 1
                sW = submit()                         # 错选集（多选干扰+漏选）=wrong 清空+miss
                m1 = read_q()
                p2 = tap(q['answers'][0])             # 重勾真值
                pU = tap(q['answers'][0])             # 取消勾选零惩罚
                m2 = read_q()
                sE = submit()                         # 空选不判：false 不计 miss
                m3 = read_q()
                st_ok = (pW == 'pick' and pA == 'pick' and sW == 'wrong' and
                         m1['picked'] == [] and m1['miss'] == 1 and
                         p2 == 'pick' and pU == 'unpick' and m2['picked'] == [] and
                         m2['miss'] == 1 and
                         sE is False and m3['miss'] == 1)
                if not st_ok:
                    ch_fail.append((flat, k, 'submit 状态机', (pW, pA, sW, p2, pU, sE, m1, m2, m3)))
                pg.wait_for_timeout(WINDOW_WAIT)      # 错链豁免窗让路
            if advanced:                 # 探测已答对本题（一步推进）——只确认推进，不再 drive
                ok = wait_step(k)
            else:
                ok = drive_quiz(q) and wait_step(k)
            if not ok:
                drive_fail.append((flat, k, '驱动未推进'))
                ok_break = True
                break
        all_snaps[flat] = snaps
        kinds_by_flat[flat] = kinds
        # 覆盖（ch3 每关 comp 恰 1 / ch4 每关 comp 恰 2）
        if flat < 20 and len(kinds) == 5:
            dchx = (flat // 5) + 1
            if dchx == 3 and kinds.count('comp') != 1:
                ch_fail.append((flat, 'ch3 comp 数', kinds.count('comp')))
            if dchx == 4 and kinds.count('comp') != 2:
                ch_fail.append((flat, 'ch4 comp 数', kinds.count('comp')))
        # W3 星级（最优关=3★ / 1 错探测关=2★；探测污染关排除）
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE_POLLUTED and not ok_break:
            st = -1
            for _ in range(8):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => SE.currentLevel && SE.currentLevel.stars != null ? SE.currentLevel.stars : -1')
                if st != -1:
                    break
            if flat in PROBE_1WRONG:
                if st != 2 and st != -1:
                    star_fail.append((flat, '1 错非 2★', st))
            elif st != 3 and st != -1:
                star_fail.append((flat, '全最优非3★', st))
    chk('W1 章约束（封闭表/四族先验/防双真值/answer(s) 语义/dch 章型/锚定）+W7 anti+W8 comp+'
        'W2 multi 状态机探测', not ch_fail, str(ch_fail[:5]))
    chk('W1b 覆盖（静态 20 关 multi 5 物·anti 5 感官全现·ch1 find 两子族全现）',
        static_multi == set(MULTI) and static_anti == set(SENSES) and
        ch1_find_kinds == {'findsense', 'findthing'},
        'multi=%d anti=%d ch1find=%s' % (len(static_multi), len(static_anti), sorted(ch1_find_kinds)))
    gen_ok = (set(gen_dch_kinds) == {1, 2, 3, 4} and
              set().union(*gen_dch_kinds.values()) == {'findsense', 'findthing', 'multi', 'anti', 'comp'})
    chk('W1b 生成关 dch1-4 全现+五 kind 全现', gen_ok,
        str({d: sorted(v) for d, v in gen_dch_kinds.items()}))
    mod_bad = []
    for flat, kinds in kinds_by_flat.items():
        s = sum(MODELED[fam_of(k2)] for k2 in kinds)
        if s < MODELED_FLOOR:
            mod_bad.append((flat, s))
    for d, fams in CH_FAMILY.items():
        s = sum(MODELED[f] for f in fams)
        if s < MODELED_FLOOR:
            mod_bad.append(('dch%d' % d, s))
    chk('W1c r11 认知建模（Python 独立表 40 关复算 ≥40000）', not mod_bad and len(kinds_by_flat) == 40,
        str(mod_bad[:4]))
    chk('W5 引擎直驱（answers/answer 逐题推进）', not drive_fail, str(drive_fail[:4]))
    chk('W3 星级（全最优=3★ / 1 错=2★ 探测关 flat3·9·17）', not star_fail, str(star_fail[:3]))

    # ---- W4 确定性：4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { SE.start(f) }', flat)
        snaps2 = []
        for k in range(5):
            q = wait_quiz()
            snaps2.append(snapshot(q) if q else None)
            if not q:
                diff.append((flat, k, 'unreadable'))
                break
            ok = drive_quiz(q)
            if not ok or not wait_step(k):
                diff.append((flat, k, 'drive'))
                break
        if snaps2 != all_snaps.get(flat):
            diff.append(flat)
    chk('W4 确定性（flat 0/12/27/39 双读一致）', not diff, str(diff))

    # ---- W6 钩子契约+语音表+clips+章末预告+生成关预告+非法 ----
    pg.evaluate('() => { SE.start(0) }')           # flat0 q0=findsense（answer=下标）
    wait_unlock()
    bad_idx = call('SE.tapOpt(99)')                # 非法下标=null（不炸）
    q0 = wait_quiz()
    contract0 = pg.evaluate('''() => {
      const q = SE.quiz, lv = SE.currentLevel;
      const has = k => Object.prototype.hasOwnProperty.call(q, k);
      return { fields: ['kind','ask','opts','answer','step','miss'].every(has),
               noMulti: !('answers' in q) && !('picked' in q),
               ansIdx: typeof q.answer === 'number' && q.answer >= 0,
               lvFields: ['flat','ch','dch','step','done','stars'].every(k => k in lv) };
    }''')
    sub_single = call('SE.tapSubmit()')            # 单选题 tapSubmit=false（不适用通道）
    pg.evaluate('() => { SE.start(15) }')          # flat15 q0=comp（blocked 字段）
    qc = wait_quiz()
    comp_hook = ('blocked' in qc and qc['blocked'] in MULTI.get(qc['ask'], []))
    rC = call('SE.quiz')                           # 仍停 q0（未驱动）
    pg.evaluate('() => { SE.start(5) }')           # 驱动到 flat5 q1=multi（answer=-1）
    qm0 = wait_quiz()
    ok_m = False
    if drive_quiz(qm0):                            # 过 q0 anti
        qm = wait_quiz()
        ok_m = bool(qm) and qm['kind'] == 'multi' and qm['answer'] == -1 and \
               len(qm.get('answers', [])) == 3 and qm.get('picked') == []
    voice = pg.evaluate('() => ({ V: VOICE, clips: Object.keys(KIDS.voice.clips).length })')
    V = voice['V']
    voice_ok = all(V[k]['key'] == kv[0] and V[k]['text'] == kv[1] for k, kv in VOICE_R11.items()) and \
               voice['clips'] == 36
    # 章末预告独立对账+off-by-one 哨兵（Python 表硬编码；两两互异先行——哨兵非空转）
    hints_indep = pg.evaluate('() => [nextHint(4), nextHint(9), nextHint(14), nextHint(19)]')
    end_ok = (len(set(CHAPTER_HINTS.values())) == 4 and
              hints_indep == [CHAPTER_HINTS[1], CHAPTER_HINTS[2], CHAPTER_HINTS[3], CHAPTER_HINTS[4]] and
              hints_indep[0] != CHAPTER_HINTS[2] and hints_indep[1] != CHAPTER_HINTS[3])
    gen_hints_ok = True
    gen_note = []
    for f in (24, 29, 34, 39):                     # 生成关预告=实算下一关随机章型（家族 F）
        h = pg.evaluate('(f) => nextHint(f)', f)
        dch2 = pg.evaluate('(f) => { SE.start(f + 1); return SE.currentLevel.dch }', f)
        if h != GEN_HINTS[dch2 - 1]:
            gen_hints_ok = False
            gen_note.append((f, h, dch2))
    chk('W6 钩子契约（字段/单选 answer=下标·multi=-1·comp blocked/单选 tapSubmit=false）+'
        '语音表 r11 六新句+clips 36+章末预告独立对账+off-by-one 哨兵+生成关预告实算+0 pageerror',
        contract0['fields'] and contract0['noMulti'] and contract0['ansIdx'] and
        contract0['lvFields'] and bad_idx is None and sub_single is False and
        comp_hook and ok_m and voice_ok and end_ok and gen_hints_ok and not errs,
        str((contract0, bad_idx, sub_single, comp_hook, ok_m, voice['clips'],
             hints_indep, gen_note[:2], errs[:1])))

    # ---- W5b autoSolve 整关（生成关 flat27） ----
    pg.evaluate('() => { SE.start(27) }')
    r = call('SE.autoSolve()')
    lv = read_lv()
    chk('W5b autoSolve 整关通关（flat27 生成关，multi 走真实提交链）',
        bool(r) and r != 'ERR' and r.get('done') and r.get('taps') == 5 and lv.get('done'),
        str((r, lv)))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
