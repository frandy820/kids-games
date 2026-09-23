# -*- coding: utf-8 -*-
"""animalmenu v2 独立复验（SPEC-BATCH31 §0.76 r11——r11 难度改造；断言从 SPEC 文字独立推导，禁抄实现）
W1 章约束（Python 封闭表 × 40 关全题）：
   findfood=配对表(动物8→食物)+候选恒 4 ⊆食物8 含真值 / findwho=主配逆(食物8→动物)+⊆动物8 /
   multifood=多食表(动物10→恰 2 食)+干扰 ⊆DISTRACT_OK[动物] 公平白名单+answer=-1 /
   dietclass=食性表(动物10→类别→盘)+候选=三盘全+answer 指真值盘 /
   chaindir=食物链表(17 对 eater→eaten)+候选=对成员+answer 指 eater（方向锚）
W1b 覆盖（ch1 每关两族在场 / ch2 五关动物 10 全现 / ch3 每关 ≥1 肉食+≥1 草食 /
   ch4 每关 ≥2 动物-动物对 / 生成关 dch1-4 全现五题型全现 / flat0 q0 锚 findfood/rabbit）
W2 提交状态机（含错件=wrong_more 清空+miss / 少选=wrong_less 保留 / 取消=零惩罚）
W3 星级（全最优=3★；故意 1 错=2★ 探测关）/ W4 确定性双读 / W5 引擎直驱+autoSolve 整关 /
W6 钩子契约（quiz 字段含 need/picked/pair/answer 单答案=下标·multifood=-1/tapSubmit 单答案=false）
   +语音表（r11 七新句）+clips 42+0 pageerror
W7 modeled 时长 python 侧独立重算（SPEC_DUR 39 键实测表重列：listen+nOpts×1500+taps×1200
   ≥40000 全 40 关——认知步主体非演出窗）
W8 nextHint 章末 off-by-one 哨兵（4/9/14/19 章末预告=下一章文案≠本章+生成关 20-38 实算对账）
纪律：先等 title=VERIFY PASS（runVerify 自身 startLevel 竞态）；tapOpt/tapSubmit async——evaluate 侧 await；
     驱动前等 locked/demo 释放（verify SPEED=0.12，窗 ≤1s）。"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'animalmenu', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# ---------- Python 独立封闭真值表（SPEC §0.76 r11 文字逐条转译，不引用页面符号） ----------
ANIMALS8 = ['rabbit', 'panda', 'monkey', 'cat', 'dog', 'mouse', 'bear', 'squirrel']
FOODS8 = ['carrot', 'bamboo', 'banana', 'fish', 'bone', 'cheese', 'honey', 'pinecone']
PAIRS8 = {'rabbit': 'carrot', 'panda': 'bamboo', 'monkey': 'banana', 'cat': 'fish',
          'dog': 'bone', 'mouse': 'cheese', 'bear': 'honey', 'squirrel': 'pinecone'}
INV8 = {v: k for k, v in PAIRS8.items()}                            # 食物→动物（findwho）
ANIMALS10 = ANIMALS8 + ['wolf', 'sheep']
FOODS15 = FOODS8 + ['apple', 'greens', 'berry', 'meat', 'grass', 'corn', 'acorn']
DIET = {'cat': 'meat', 'wolf': 'meat',
        'rabbit': 'grass', 'panda': 'grass', 'sheep': 'grass',
        'monkey': 'mix', 'dog': 'mix', 'mouse': 'mix', 'bear': 'mix', 'squirrel': 'mix'}
DIET_PLATE = {'meat': 'plmeat', 'grass': 'plgrass', 'mix': 'plmix'}
PLATES = ['plmeat', 'plgrass', 'plmix']
MULTI = {'rabbit': ['carrot', 'greens'], 'panda': ['bamboo', 'apple'],
         'monkey': ['banana', 'apple'],  'cat': ['fish', 'meat'],
         'dog': ['bone', 'meat'],        'mouse': ['cheese', 'corn'],
         'bear': ['honey', 'berry'],     'squirrel': ['pinecone', 'acorn'],
         'wolf': ['meat', 'bone'],       'sheep': ['grass', 'greens']}
DISTRACT_OK = {'rabbit': ['fish', 'bone', 'cheese', 'meat'],
               'panda': ['fish', 'bone', 'cheese', 'meat'],
               'sheep': ['fish', 'bone', 'cheese', 'meat'],
               'cat': ['carrot', 'bamboo', 'banana', 'pinecone'],
               'wolf': ['carrot', 'banana', 'apple', 'corn'],
               'monkey': ['cheese', 'bone', 'fish'],
               'dog': ['bamboo', 'cheese', 'pinecone'],
               'mouse': ['bone', 'bamboo', 'honey'],
               'bear': ['cheese', 'bamboo', 'carrot'],
               'squirrel': ['fish', 'cheese', 'meat']}
CHAIN = {('wolf', 'sheep'), ('cat', 'mouse'), ('cat', 'fish'), ('bear', 'fish'),
         ('bear', 'honey'), ('sheep', 'grass'), ('panda', 'bamboo'), ('rabbit', 'carrot'),
         ('monkey', 'banana'), ('mouse', 'cheese'), ('dog', 'bone'), ('squirrel', 'pinecone'),
         ('squirrel', 'acorn'), ('monkey', 'apple'), ('mouse', 'corn'), ('wolf', 'meat'),
         ('rabbit', 'greens')}
PREY = {(e, t) for (e, t) in CHAIN if t in ANIMALS10 or t == 'fish'}   # 动物-动物子集
SUBMIT_KINDS = {'multifood'}
ANCHOR = {'kind': 'findfood', 'ask': 'rabbit', 'need': 'carrot'}      # flat0 题0 教学锚
VOICE_R11 = {'qMulti': ('anm_q_multi', '它爱吃的都要呀'),
             'qDiet': ('anm_q_diet', '它该吃哪一盘呀'),
             'qChain': ('anm_q_chain', '谁吃谁呀'),
             'less': ('anm_less', '还差一样，再找一找哦'),
             'more': ('anm_more', '多选了一样，重新挑一挑哦'),
             'hDiet': ('anm_h_diet', '想一想，它爱吃什么'),
             'hChain': ('anm_h_chain', '想一想，谁吃谁')}
CH_HINTS = {1: '爱吃的可能不止一样哦', 2: '有的吃肉，有的吃草',
            3: '谁吃谁，想一想', 4: '新一轮帮小动物点餐'}
GEN_HINTS = ['正着问反着问都要会', '爱吃的都要点上哦', '想想它吃肉还是吃草', '谁吃谁，想一想']
# SPEC §4 v1+r11 clip 实长表（_clipdur31.json 浏览器 Audio 实测，±60ms 口径源）
DUR = {'anm_tut_watch': 3096, 'anm_tut_turn': 1824, 'anm_hint': 2016, 'anm_right': 2256,
       'anm_wrong': 1656, 'anm_q1': 1968, 'anm_q2': 1944,
       'anm_q_multi': 2160, 'anm_q_diet': 2184, 'anm_q_chain': 1776, 'anm_less': 2832,
       'anm_more': 3072, 'anm_h_diet': 2736, 'anm_h_chain': 2544,
       'anm_n_rabbit': 1368, 'anm_n_panda': 1392, 'anm_n_monkey': 1368, 'anm_n_cat': 1368,
       'anm_n_dog': 1416, 'anm_n_mouse': 1416, 'anm_n_bear': 1440, 'anm_n_squirrel': 1464,
       'anm_n_carrot': 1560, 'anm_n_bamboo': 1368, 'anm_n_banana': 1416, 'anm_n_fish': 1416,
       'anm_n_bone': 1344, 'anm_n_cheese': 1344, 'anm_n_honey': 1368, 'anm_n_pinecone': 1440,
       'anm_n_wolf': 1584, 'anm_n_sheep': 1632, 'anm_n_apple': 1440, 'anm_n_greens': 1392,
       'anm_n_berry': 1680, 'anm_n_meat': 1392, 'anm_n_grass': 1416, 'anm_n_corn': 1344,
       'anm_n_acorn': 1464}
M_OPT, M_TAP, M_LEVEL_MIN = 1500, 1200, 40000


def listen_ms(q):
    """开题链实长（python 独立重算——SPEC §0.76 r11 各题型链构成）"""
    k = q['kind']
    if k == 'findfood':
        return DUR['anm_n_' + q['ask']] + 150 + DUR['anm_q1']
    if k == 'findwho':
        return DUR['anm_n_' + q['ask']] + 150 + DUR['anm_q2']
    if k == 'multifood':
        return DUR['anm_n_' + q['ask']] + 150 + DUR['anm_q_multi']
    if k == 'dietclass':
        return DUR['anm_n_' + q['ask']] + 150 + DUR['anm_q_diet']
    o = [x['anim'] for x in q['opts']]
    return DUR['anm_n_' + o[0]] + 150 + DUR['anm_n_' + o[1]] + 150 + DUR['anm_q_chain']


def modeled_of(quizzes):
    s = 0
    for q in quizzes:
        n_opts = 3 if q['kind'] == 'dietclass' else 2 if q['kind'] == 'chaindir' else 4
        taps = 3 if q['kind'] in SUBMIT_KINDS else 1
        s += listen_ms(q) + n_opts * M_OPT + taps * M_TAP
    return s


def check_quiz(flat, k, q, bad):
    """单题独立对账（期望全从上表推导）；返回 None（lawful）或原因串。"""
    kind, ids = q['kind'], [o['anim'] for o in q['opts']]
    need = list(q['need'])
    if len(set(ids)) != len(ids):
        return 'optDup %s' % ids
    if kind == 'findfood' or kind == 'findwho':
        if len(ids) != 4:
            return 'optLen %s' % len(ids)
        if kind == 'findfood':
            if q['ask'] not in ANIMALS8:
                return 'ffAsk %s' % q['ask']
            exp, pool = [PAIRS8[q['ask']]], FOODS8
        else:
            if q['ask'] not in FOODS8:
                return 'fwAsk %s' % q['ask']
            exp, pool = [INV8[q['ask']]], ANIMALS8
    elif kind == 'multifood':
        if len(ids) != 4:
            return 'optLen %s' % len(ids)
        if q['ask'] not in ANIMALS10:
            return 'mfAsk %s' % q['ask']
        exp, pool = MULTI[q['ask']], FOODS15
        for v in ids:                                    # 干扰公平性：半有效排除白名单
            if v not in exp and v not in DISTRACT_OK[q['ask']]:
                return 'mfFair %s has %s' % (ids, v)
    elif kind == 'dietclass':
        if len(ids) != 3:
            return 'optLen %s' % len(ids)
        if q['ask'] not in ANIMALS10:
            return 'dcAsk %s' % q['ask']
        exp, pool = [DIET_PLATE[DIET[q['ask']]]], PLATES
        if sorted(ids) != sorted(PLATES):
            return 'dcPlates %s' % ids                   # 三盘全出示
    elif kind == 'chaindir':
        if len(ids) != 2:
            return 'optLen %s' % len(ids)
        pr = tuple(q['pair']) if q.get('pair') else None
        if pr not in CHAIN:
            return 'cdPair %s' % (pr,)
        exp, pool = [pr[0]], list(pr)
    else:
        return 'kind %s' % kind
    if sorted(need) != sorted(exp):
        return 'need %s exp=%s' % (need, exp)
    if not all(v in pool for v in ids):
        return 'pool %s' % ids
    for n in need:                                        # 含全部真值
        if n not in ids:
            return 'truthMiss %s need=%s' % (ids, need)
    if kind in SUBMIT_KINDS:
        if q['answer'] != -1:
            return 'ansSubmit %s' % q['answer']
    else:
        if not (0 <= q['answer'] < len(ids)) or ids[q['answer']] != need[0]:
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
        return pg.evaluate('() => AN.quiz')

    def read_lv():
        return pg.evaluate('() => AN.currentLevel ? {step: AN.currentLevel.step, done: AN.currentLevel.done, dch: AN.currentLevel.dch, miss: AN.currentLevel.miss} : null')

    def call(fn_expr):
        return pg.evaluate('(async () => { try { return await (%s) } catch(e){ return "ERR" } })()' % fn_expr)

    def tap(i):
        return call('AN.tapOpt(%d)' % i)

    def submit():
        return call('AN.tapSubmit()')

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
        return json.dumps({'kind': q['kind'], 'ask': q.get('ask'), 'pair': q.get('pair'),
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

    # ---- W1/W1b/W7 全量审计：40 关 × 5 题（章约束+覆盖+锚定+modeled 重算） ----
    all_snaps, all_raw = {}, {}
    ch_fail, drive_fail, star_fail, dur_fail = [], [], [], []
    PROBE_1WRONG = {3, 9, 17}         # 故意 1 错→2★ 探测关
    PROBE_STATE = {5}                 # W2 提交状态机探测关（miss 污染——从 3★ 断言排除）
    ch2_animals, kind_all = set(), set()
    dch_seq = {}                      # flat→dch（W8 生成关 nextHint 实算对账用）
    kind_seen_gen = {}
    for flat in range(40):
        pg.evaluate('(f) => { AN.start(f) }', flat)
        lv0 = read_lv()
        dch = lv0['dch']
        dch_seq[flat] = dch
        snaps, kinds, raws = [], [], []
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
            raws.append(q)
            kind_all.add(q['kind'])
            if flat < 20:                                  # 静态关：章型硬约束
                exp_dch = (flat // 5) + 1
                if dch != exp_dch:
                    ch_fail.append((flat, 'dch', dch, exp_dch))
                if exp_dch == 1 and q['kind'] not in ('findfood', 'findwho'):
                    ch_fail.append((flat, k, 'dch1 非配对族', q['kind']))
                if exp_dch == 2 and q['kind'] != 'multifood':
                    ch_fail.append((flat, k, 'dch2 非 multifood', q['kind']))
                if exp_dch == 3 and q['kind'] != 'dietclass':
                    ch_fail.append((flat, k, 'dch3 非 dietclass', q['kind']))
                if exp_dch == 4 and q['kind'] != 'chaindir':
                    ch_fail.append((flat, k, 'dch4 非 chaindir', q['kind']))
            else:
                kind_seen_gen[dch] = kind_seen_gen.get(dch, set()) | {q['kind']}
            # 覆盖素材
            if flat < 20 and dch == 2:
                ch2_animals.add(q['ask'])
            # flat0 q0 教学锚定：findfood/rabbit→carrot
            if flat == 0 and k == 0:
                if q['kind'] != ANCHOR['kind'] or q['ask'] != ANCHOR['ask'] or \
                   q['need'] != [ANCHOR['need']]:
                    ch_fail.append((flat, k, 'anchor', q['need']))
            # ---- W2 提交状态机探测（flat5 题0，multifood 关） ----
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
                    wi = next(i for i in range(len(q['opts'])) if i != q['answer'])
                    rW = tap(wi)
                    if rW != 'wrong':
                        ch_fail.append((flat, k, 'single wrong 探测', rW))
            ok, _ = drive_quiz(q)
            if not ok or not wait_step(k):
                drive_fail.append((flat, k, '驱动未推进'))
                ok_break = True
                break
        all_snaps[flat] = snaps
        all_raw[flat] = raws
        # 聚合覆盖：ch1 每关两族 / ch3 每关 ≥1 肉食+≥1 草食 / ch4 每关 ≥2 动物-动物
        if len(kinds) == 5:
            if dch == 1 and len(set(kinds)) != 2:
                ch_fail.append((flat, 'ch1 两族', kinds))
            if dch == 3:
                meat = sum(1 for q in raws if DIET[q['ask']] == 'meat')
                grass = sum(1 for q in raws if DIET[q['ask']] == 'grass')
                if meat < 1 or grass < 1:
                    ch_fail.append((flat, 'ch3 两类', (meat, grass)))
            if dch == 4:
                prey = sum(1 for q in raws if tuple(q['pair']) in PREY)
                if prey < 2:
                    ch_fail.append((flat, 'ch4 猎物对', prey))
        # W7 modeled python 独立重算
        if len(raws) == 5:
            mo = modeled_of(raws)
            if mo < M_LEVEL_MIN:
                dur_fail.append((flat, mo))
        # W3 星级（最优关=3★ / 1 错探测关=2★；状态机探测关污染排除）
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE_STATE and not ok_break:
            st = -1
            for _ in range(8):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => AN.currentLevel && AN.currentLevel.stars != null ? AN.currentLevel.stars : -1')
                if st != -1:
                    break
            if flat in PROBE_1WRONG:
                if st != 2 and st != -1:
                    star_fail.append((flat, '1 错非 2★', st))
            elif st != 3 and st != -1:
                star_fail.append((flat, '全最优非3★', st))
    chk('W1 章约束（封闭表/长度/干扰公平/answer 语义/dch 章型/锚定）', not ch_fail, str(ch_fail[:5]))
    chk('W1b 覆盖（ch1 两族/ch2 动物 10 全现/ch3·ch4 两类在场/五题型全现）',
        ch2_animals == set(ANIMALS10) and kind_all == {'findfood', 'findwho', 'multifood', 'dietclass', 'chaindir'},
        'ch2=%d kinds=%d' % (len(ch2_animals), len(kind_all)))
    gen_dchs = set(kind_seen_gen)
    gen_ok = (gen_dchs == {1, 2, 3, 4} and
              kind_seen_gen.get(1) <= {'findfood', 'findwho'} and kind_seen_gen.get(1) == {'findfood', 'findwho'} and
              kind_seen_gen.get(2) == {'multifood'} and
              kind_seen_gen.get(3) == {'dietclass'} and
              kind_seen_gen.get(4) == {'chaindir'})
    chk('W1c 生成关 dch1-4 全现（章型映射正确）',
        gen_ok, str({d: sorted(v) for d, v in kind_seen_gen.items()}))
    chk('W5 引擎直驱（need 逐题推进）', not drive_fail, str(drive_fail[:4]))
    chk('W3 星级（全最优=3★ / 1 错=2★ 探测关 flat3·9·17）', not star_fail, str(star_fail[:3]))
    chk('W7 modeled 时长 python 独立重算（40 关全 ≥%dms，认知步主体非演出窗）' % M_LEVEL_MIN,
        not dur_fail, str(dur_fail[:3]))

    # ---- W4 确定性：4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { AN.start(f) }', flat)
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
    pg.evaluate('() => { AN.start(0) }')           # flat0 q0=findfood（answer=下标）；先刷新关
    wait_unlock()                                  # 清 won/locked 态（W4 通关残留会吞入口门）
    bad_idx = call('AN.tapOpt(99)')                # 非法下标=null（不炸）
    contract = pg.evaluate('''() => {
      const q = AN.quiz, lv = AN.currentLevel;
      const has = k => Object.prototype.hasOwnProperty.call(q, k);
      return { fields: ['kind','ask','pair','opts','answer','need','picked','step','miss'].every(has),
               needList: Array.isArray(q.need) && q.need.length === 1,
               pairNull: q.pair === null,
               ansIdx: typeof q.answer === 'number' && q.answer >= 0,
               lvFields: ['flat','ch','dch','step','done','stars'].every(k => k in lv) };
    }''')
    sub_single = call('AN.tapSubmit()')            # 单答案题 tapSubmit=false（不适用通道）
    pg.evaluate('() => { AN.start(5) }')           # flat5=multifood（answer=-1）
    q5 = wait_quiz()
    multi_ok = q5['answer'] == -1 and len(q5['need']) == 2 and q5['pair'] is None
    # 语音表（r11 七新句定版文案——与 manifest 严格一致）+clips 计数
    voice = pg.evaluate('() => ({ V: VOICE, clips: Object.keys(KIDS.voice.clips).length })')
    V = voice['V']
    voice_ok = all(V[k]['key'] == kv[0] and V[k]['text'] == kv[1] for k, kv in VOICE_R11.items()) and \
               voice['clips'] == 42
    chk('W6 钩子契约（字段含 need/picked/pair/answer 语义/单答案 tapSubmit/语音表 7 新句/clips 42）+0 pageerror',
        contract['fields'] and contract['needList'] and contract['pairNull'] and contract['ansIdx'] and
        contract['lvFields'] and bad_idx is None and sub_single is False and multi_ok and
        voice_ok and not errs,
        str((contract, bad_idx, sub_single, voice['clips'], errs[:1])))

    # ---- W8 nextHint 章末 off-by-one 哨兵+生成关实算对账（行为级：预告=下一关实际章型文案） ----
    nh = pg.evaluate('() => [4, 9, 14, 19].concat(Array.from({length: 19}, (_, i) => i + 20))' +
                     '.map(f => String(f) + "|" + nextHint(f))')
    nh_bad = []
    for item in nh:
        f_raw, txt = item.split('|', 1)
        f = int(f_raw)
        if f <= 19:                                        # 章末：预告=下一章文案（≠本章=off-by-one 哨兵；
            exp = CH_HINTS[f // 5 + 1]                     # CH_HINTS[i]=打完第 i 章时的预告（f=19→CH4「新一轮」））
            if txt != exp:
                nh_bad.append((f, txt, exp))
        else:                                              # 生成关：实算下一关 dch（W1 实测序）
            if f + 1 in dch_seq:
                exp = GEN_HINTS[dch_seq[f + 1] - 1]
                if txt != exp:
                    nh_bad.append((f, txt, exp))
    chk('W8 nextHint 章末 off-by-one+生成关实算（4/9/14/19 章末+20-38 实测 dch 对账）',
        not nh_bad and len(nh) == 23, str(nh_bad[:4]))

    # ---- W5b autoSolve 整关（生成关 flat27） ----
    pg.evaluate('() => { AN.start(27) }')
    r = call('AN.autoSolve()')
    lv = read_lv()
    chk('W5b autoSolve 整关通关（flat27 生成关）',
        bool(r) and r != 'ERR' and r.get('done') and lv.get('done'), str((r, lv)))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
