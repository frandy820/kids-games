# -*- coding: utf-8 -*-
"""batch31 独立复验：animalmenu / iftrain / chartread（断言从 SPEC-BATCH31 推导，期望值独立硬编码）
用法: python verify_batch31.py <animalmenu|iftrain|chartread>
口径：verify 页 (?verify=1)；tapOpt 均 async；错链豁免窗内输入被吞——wrong 后等过窗再驱动：
     anm≈7800 / if≈8000 / chr≈5000（本批链构成：anm/if=clip头+名音+keyless 尾；chr=T46 全 clip 单段）
探针实证形状（2026-09-11）：
  animalmenu/iftrain quiz={kind, ask, opts[{anim}], answer, step, miss} 平铺
  chartread quiz={chart{cats[],values[]}, kind, target, pair, opts, answer, text, step, miss} 平铺（无嵌套 q）
"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'animalmenu': 'AN', 'iftrain': 'IF', 'chartread': 'CH'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码表（禁 import 实现） ----
ANM = {'rabbit': 'carrot', 'panda': 'bamboo', 'monkey': 'banana', 'cat': 'fish',
       'dog': 'bone', 'mouse': 'cheese', 'bear': 'honey', 'squirrel': 'pinecone'}   # §0.76 动物→食物
ANM_R = {v: k for k, v in ANM.items()}
# r11 难度改造新增表（SPEC §0.76 r11；ch2-4 题域=封闭 10 动物×15 食物+三盘+17 链对）
ANM_A10 = set(ANM) | {'wolf', 'sheep'}                                              # 动物 10
ANM_F15 = set(ANM.values()) | {'apple', 'greens', 'berry', 'meat', 'grass', 'corn', 'acorn'}   # 食物 15
ANM_MULTI = {'rabbit': ['carrot', 'greens'], 'panda': ['bamboo', 'apple'],
             'monkey': ['banana', 'apple'],  'cat': ['fish', 'meat'],
             'dog': ['bone', 'meat'],        'mouse': ['cheese', 'corn'],
             'bear': ['honey', 'berry'],     'squirrel': ['pinecone', 'acorn'],
             'wolf': ['meat', 'bone'],       'sheep': ['grass', 'greens']}           # ch2 多食表
ANM_DIET = {'cat': 'meat', 'wolf': 'meat', 'rabbit': 'grass', 'panda': 'grass',
            'sheep': 'grass', 'monkey': 'mix', 'dog': 'mix', 'mouse': 'mix',
            'bear': 'mix', 'squirrel': 'mix'}                                        # ch3 食性表
ANM_PLATES = {'meat': 'plmeat', 'grass': 'plgrass', 'mix': 'plmix'}                 # 三盘映射
ANM_PLATE_SET = {'plmeat', 'plgrass', 'plmix'}
ANM_CHAIN = {('wolf', 'sheep'), ('cat', 'mouse'), ('cat', 'fish'), ('bear', 'fish'),
             ('bear', 'honey'), ('sheep', 'grass'), ('panda', 'bamboo'), ('rabbit', 'carrot'),
             ('monkey', 'banana'), ('mouse', 'cheese'), ('dog', 'bone'), ('squirrel', 'pinecone'),
             ('squirrel', 'acorn'), ('monkey', 'apple'), ('mouse', 'corn'), ('wolf', 'meat'),
             ('rabbit', 'greens')}                                                   # ch4 食物链 17 对
ANM_DIS = {'rabbit': ['fish', 'bone', 'cheese', 'meat'], 'panda': ['fish', 'bone', 'cheese', 'meat'],
           'sheep': ['fish', 'bone', 'cheese', 'meat'], 'cat': ['carrot', 'bamboo', 'banana', 'pinecone'],
           'wolf': ['carrot', 'banana', 'apple', 'corn'], 'monkey': ['cheese', 'bone', 'fish'],
           'dog': ['bamboo', 'cheese', 'pinecone'], 'mouse': ['bone', 'bamboo', 'honey'],
           'bear': ['cheese', 'bamboo', 'carrot'], 'squirrel': ['fish', 'cheese', 'meat']}   # 干扰白名单
# ---- iftrain v2（SPEC-BATCH31 §0.77 v2/r3——2026-09-19 联动重列：五族题型
# single/multi/best/conflict/ruleback，旧 v1 ruleapply/ruleback 两族断言作废）----
IFT = {'rain': 'umbrella', 'sun': 'sunhat', 'snow': 'scarf', 'cold': 'coat',       'hot': 'fan', 'wind': 'kite'}                                                  # §0.77 情境→装备
IFT_R = {v: k for k, v in IFT.items()}
IFT_SEC = {'rain': 'coat', 'sun': 'umbrella', 'snow': 'coat',
           'cold': 'scarf', 'hot': 'sunhat', 'wind': 'scarf'}          # 次配 6（封闭 12）
IFT_SITS = sorted(IFT)
IFT_GEARS = sorted(IFT.values())
IFT_COMBOS = [('rain', 'wind', 'umbrella', 'coat'),                    # ch2 组合表（conds→两件）
              ('cold', 'rain', 'coat', 'umbrella'),
              ('snow', 'wind', 'scarf', 'coat'),
              ('sun', 'wind', 'sunhat', 'kite'),
              ('sun', 'hot', 'sunhat', 'fan')]
IFT_CONFLICTS = [('hot', 'rain', 'rain', 'umbrella', 'fan'),           # ch3 冲突表（conds, key, gear 答案, tempt 诱惑）
                 ('rain', 'sun', 'rain', 'umbrella', 'sunhat'),
                 ('cold', 'wind', 'cold', 'coat', 'kite')]
IFT_VALID = {}                                                         # 装备→主∪次情境（ruleback 干扰禁区）
for _s, _g in IFT.items():
    IFT_VALID.setdefault(_g, []).append(_s)
for _s, _g in IFT_SEC.items():
    IFT_VALID.setdefault(_g, []).append(_s)
CHR_CATS = {'rabbit', 'cat', 'dog', 'bird', 'fish', 'chick'}                          # §0.78 v2 类目封闭 6
# r17 §3 v2：八族题型池+值域 10-20（互异先验=most/least/second 唯一性）
CHR_KINDS = {'most', 'least', 'second', 'howmany', 'total', 'compare', 'constraint', 'twocompare'}
# 错链窗（SPEC §4 实长表推导：链头 clip+150+名音 max+语义句 clip 实长+300；T46 阶段2 chr=AGAIN_DUR 动态最长 3384+300=3684）
WRONG_WAIT = {'animalmenu': 7800, 'iftrain': 8000, 'chartread': 5400}
# T11 下界=wrong/hint 链头 clip+300（b30 定版防同源；完整链动态断言归 verify 页 selftest T1）
HEAD_CLIP = {'animalmenu': 2016, 'iftrain': 1656, 'chartread': 2016}   # anm 链头=anm_hint 2016 / if=rai_wrong 1656 / chr 错链纯 TTS 下界用 chr_wrong 2016
KEYLESS_CHARS = {'animalmenu': (8, 8), 'iftrain': (10, 9), 'chartread': (12, 12)}  # (ruleapply/findfood 句, ruleback/findwho 句) / chr=r17 八句实长 7-12 取 max

async def wait_verify_title(pg):
    # r17：chartread verify 实测 56.3s>旧窗 45s 纯超时假 FAIL——放大到 120s
    for _ in range(240):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t:
            return t
        await pg.wait_for_timeout(500)
    return ''

async def poll_quiz_change(pg, old, timeout=15000):
    for _ in range(int(timeout / 300)):
        cur = await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK)
        if cur != old:
            return True
        await pg.wait_for_timeout(300)
    return False

async def poll_step(pg, want, timeout=15000):
    # null 保护：并行跑多浏览器时 evaluate 可撞演出期 quiz=null 瞬态（b37 坑③同族）
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate('%s.quiz && %s.quiz.step' % (HOOK, HOOK))
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False

async def tap(pg, i):
    return await pg.evaluate('(async () => { const r = await %s.tapOpt(%d); return r === null ? "null" : String(r); })()' % (HOOK, i))

def est_ms(n):  # 家族 T 全字符口径
    return n * 345 + 600

# ---------- T3 每题审计（20 关×5 题） ----------
async def q_anm_if(pg, flat, k, q, dch):
    if GAME == 'animalmenu':
        table, rev = (ANM, ANM_R) if q['kind'] == 'findfood' else (ANM_R, ANM)
        kinds = {'findfood', 'findwho'}
    else:
        return await q_iftrain(pg, flat, k, q, dch)
    if q['kind'] not in kinds:
        return 'f%dq%d kind=%s' % (flat, k, q['kind'])
    ask = q['ask']
    want = table.get(ask)
    if want is None:
        return 'f%dq%d ask=%s 非封闭集' % (flat, k, ask)
    anims = [o['anim'] for o in q['opts']]
    n = len(anims)
    pool = set(table.values())
    if dch == 1 and n != 2:
        return 'f%dq%d ch1 候选=%d' % (flat, k, n)
    if dch in (2, 3) and n != 4:
        return 'f%dq%d ch%d 候选=%d' % (flat, k, dch, n)
    if dch == 4 and n not in (2, 4):
        return 'f%dq%d ch4 候选=%d' % (flat, k, n)
    if len(set(anims)) != n or want not in anims or not set(anims) <= pool:
        return 'f%dq%d 候选 %s' % (flat, k, anims)
    if q['answer'] != anims.index(want):
        return 'f%dq%d answer=%d want=%d' % (flat, k, q['answer'], anims.index(want))
    if anims.count(want) != 1 or any(a == ask or a == want for a in anims if a != want) is False:
        pass  # 干扰≠真值已由 set 覆盖；干扰恰 n-1 由 n-len({want}) 结构性成立
    r = await tap(pg, q['answer'])
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)


async def q_iftrain(pg, flat, k, q, dch):
    """iftrain v2/r3 每题审计+驱动（SPEC §0.77 v2 五族，期望独立硬编码禁引页面表）：
    single=PRIMARY[sit] 单选/conflict=冲突表 gear 单选（诱惑项恒在候选）/ruleback=IF_INV[ask] 单选
    ——点卡判定；multi=COMBOS 两件/best=PRIMARY+SECONDARY 两件——勾选+tapSubmit 提交制。"""
    kind = q['kind']
    if kind not in ('single', 'multi', 'best', 'conflict', 'ruleback'):
        return 'f%dq%d kind=%s' % (flat, k, kind)
    conds, ask = q.get('conds'), q.get('ask')
    if kind == 'ruleback':
        if ask not in IFT_GEARS:
            return 'f%dq%d ask=%s 非装备集' % (flat, k, ask)
    else:
        want_n = 2 if kind in ('multi', 'conflict') else 1
        if not conds or len(conds) != want_n or any(c not in IFT_SITS for c in conds):
            return 'f%dq%d conds=%s' % (flat, k, conds)
    vals = [o['anim'] for o in q['opts']]
    pool = IFT_SITS if kind == 'ruleback' else IFT_GEARS
    if len(vals) != 4 or len(set(vals)) != 4 or any(v not in pool for v in vals):
        return 'f%dq%d 候选 %s' % (flat, k, vals)          # v2 候选恒 4（含 ch1）
    if kind == 'single':
        exp = [IFT[conds[0]]]
    elif kind == 'multi':
        cb = next((c for c in IFT_COMBOS if tuple(c[:2]) == tuple(conds)), None)
        exp = [cb[2], cb[3]] if cb else None
    elif kind == 'best':
        exp = [IFT[conds[0]], IFT_SEC[conds[0]]]
    elif kind == 'conflict':
        cf = next((c for c in IFT_CONFLICTS if tuple(c[:2]) == tuple(conds)), None)
        exp = [cf[3]] if cf else None
    else:
        exp = [IFT_R[ask]]
    if not exp or len(q['need']) != len(exp) or any(x not in q['need'] for x in exp):
        return 'f%dq%d need=%s exp=%s' % (flat, k, q['need'], exp)
    if any(x not in vals for x in exp):
        return 'f%dq%d 真值不在候选 %s' % (flat, k, exp)
    inters = [v for v in vals if v not in exp]
    if len(inters) != 4 - len(exp):
        return 'f%dq%d 干扰数 %d' % (flat, k, len(inters))
    if kind == 'single' and IFT_SEC[conds[0]] not in inters:
        return 'f%dq%d 近义干扰缺' % (flat, k)             # 同域近义恒在（选错件也是错）
    if kind == 'conflict':
        cf = next(c for c in IFT_CONFLICTS if tuple(c[:2]) == tuple(conds))
        if cf[4] not in vals:
            return 'f%dq%d 诱惑项缺' % (flat, k)           # 诱惑恒在候选（推理靶心）
        if IFT_SEC[cf[2]] in inters:
            return 'f%dq%d 干扰含 key 次配' % (flat, k)
    if kind == 'multi' and any(IFT_SEC[c] in inters for c in conds):
        return 'f%dq%d multi 半有效干扰' % (flat, k)
    if kind == 'ruleback' and any(v in IFT_VALID[ask] for v in inters):
        return 'f%dq%d 反向干扰禁区' % (flat, k)           # 干扰 ∉ valid_sits(gear)
    if kind in ('multi', 'best'):                          # 提交制：勾满 need+tapSubmit
        if q['answer'] != -1:
            return 'f%dq%d answer=%s 应 -1' % (flat, k, q['answer'])
        for g in q['need']:
            await tap(pg, vals.index(g))
        r = await pg.evaluate('(async () => { const r = await %s.tapSubmit(); return r === null ? "null" : String(r); })()' % HOOK)
        return None if r in ('right', 'done') else 'f%dq%d submit=%s' % (flat, k, r)
    want_ans = vals.index(exp[0])
    if q['answer'] != want_ans:
        return 'f%dq%d answer=%d want=%d' % (flat, k, q['answer'], want_ans)
    r = await tap(pg, q['answer'])
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_chr(pg, flat, k, q, dch):
    """chartread r17 每题审计（§3 v2 八族+值域 10-20+unit=2 换算；期望独立复算，禁引页面表）"""
    ch = q['chart']
    cats, vals, unit = ch['cats'], ch['values'], ch['unit']
    nc = len(cats)
    if not set(cats) <= CHR_CATS or len(set(cats)) != nc:
        return 'f%dq%d 类目 %s' % (flat, k, cats)
    if not all(10 <= v <= 20 for v in vals):
        return 'f%dq%d 值域 %s' % (flat, k, vals)
    if len(set(vals)) != nc:
        return 'f%dq%d 值并列 %s' % (flat, k, vals)                 # 互异先验（most/least/second 唯一性）
    if unit == 2 and any(v % 2 for v in vals):
        return 'f%dq%d unit=2 值非偶 %s' % (flat, k, vals)
    if q['kind'] == 'twocompare':
        # §3 v2：twocompare=上午/下午双 sub-chart 各 2 类目（「4 类目」是章常规图规格）；ch3 起（ch4 全池混出）
        if nc != 2:
            return 'f%dq%d twocompare nc=%d' % (flat, k, nc)
        if dch < 3:
            return 'f%dq%d twocompare 在 ch%d 提前出' % (flat, k, dch)
    else:
        if dch == 1 and (nc != 3 or unit != 1 or q['kind'] not in ('most', 'least', 'howmany', 'total')):
            return 'f%dq%d ch1 nc=%d unit=%s kind=%s' % (flat, k, nc, unit, q['kind'])
        if dch == 2 and (nc != 3 or unit != 2 or q['kind'] not in ('howmany', 'total', 'compare')):
            return 'f%dq%d ch2 nc=%d unit=%s kind=%s' % (flat, k, nc, unit, q['kind'])
        if dch == 3 and (nc != 4 or unit != 1 or q['kind'] not in ('twocompare', 'constraint', 'compare', 'howmany')):
            return 'f%dq%d ch3 nc=%d unit=%s kind=%s' % (flat, k, nc, unit, q['kind'])
        if dch == 4 and (nc != 4 or q['kind'] not in CHR_KINDS):
            return 'f%dq%d ch4 nc=%d kind=%s' % (flat, k, nc, q['kind'])
    d = dict(zip(cats, vals))
    opts = q['opts']
    is_num = 'num' in opts[0]
    nums = [o['num'] for o in opts] if is_num else None
    anims = None if is_num else [o['anim'] for o in opts]
    CN = {'rabbit': '兔子', 'cat': '猫', 'dog': '狗', 'bird': '小鸟', 'fish': '鱼', 'chick': '小鸡'}
    txt = q['text'] or ''

    def num_family(truth, tag):
        if len(set(nums)) != len(nums) or truth not in nums:
            return 'f%dq%d %s候选 %s truth=%d' % (flat, k, tag, nums, truth)
        if q['answer'] != nums.index(truth):
            return 'f%dq%d %s answer 错' % (flat, k, tag)
        if unit == 2 and truth // 2 not in [n for n in nums if n != truth]:
            return 'f%dq%d %s ch2 缺格数误读干扰 %s' % (flat, k, tag, nums)   # §0.78 v2 读图错因直指
        return None

    kind = q['kind']
    if kind in ('most', 'least', 'second'):
        if is_num:
            return 'f%dq%d %s 应图卡' % (flat, k, kind)
        srt = sorted(cats, key=lambda c: d[c])
        want = {'most': srt[-1], 'least': srt[0], 'second': srt[-2]}[kind]
        if set(anims) != set(cats):
            return 'f%dq%d 候选≠类目全集 %s' % (flat, k, anims)
        if q['answer'] != anims.index(want):
            return 'f%dq%d %s answer 错' % (flat, k, kind)
    elif kind == 'howmany':
        if q['target'] not in d:
            return 'f%dq%d target=%s' % (flat, k, q['target'])
        e = num_family(d[q['target']], 'howmany')
        if e:
            return e
        if CN[q['target']] not in txt:
            return 'f%dq%d 题面缺主语 %s' % (flat, k, txt)
    elif kind == 'total':
        e = num_family(sum(vals), 'total')
        if e:
            return e
    elif kind == 'compare':
        a, bb = q['pair'] or (None, None)
        if a not in d or bb not in d or a == bb or d[a] <= d[bb]:
            return 'f%dq%d pair=%s' % (flat, k, q['pair'])
        e = num_family(d[a] - d[bb], 'compare')
        if e:
            return e
        if CN[a] not in txt or CN[bb] not in txt:
            return 'f%dq%d 题面缺主语 %s' % (flat, k, txt)
    elif kind == 'twocompare':
        ch2 = q.get('chart2')
        if not ch2 or sorted(ch2['cats']) != sorted(cats):
            return 'f%dq%d chart2=%s' % (flat, k, ch2 and ch2.get('cats'))
        d2 = dict(zip(ch2['cats'], ch2['values']))
        if q['target'] not in d or q['target'] not in d2:
            return 'f%dq%d target=%s' % (flat, k, q['target'])
        truth = d2[q['target']] - d[q['target']]
        if not 2 <= truth <= 8:
            return 'f%dq%d 双图差=%d' % (flat, k, truth)
        e = num_family(truth, 'twocompare')
        if e:
            return e
        if CN[q['target']] not in txt:
            return 'f%dq%d 题面缺主语 %s' % (flat, k, txt)
    else:  # constraint：pair=[下邻,上邻]，开区间夹层恰 1（SPEC §3 v2 唯一解）
        lo_c, hi_c = q['pair'] or (None, None)
        if lo_c not in d or hi_c not in d or d[lo_c] >= d[hi_c]:
            return 'f%dq%d pair=%s' % (flat, k, q['pair'])
        mid = [c for c in cats if d[lo_c] < d[c] < d[hi_c]]
        if len(mid) != 1:
            return 'f%dq%d 夹层=%d' % (flat, k, len(mid))
        if is_num:
            return 'f%dq%d constraint 应图卡' % (flat, k)
        if q['answer'] != anims.index(mid[0]):
            return 'f%dq%d constraint answer 错' % (flat, k)
        if CN[lo_c] not in txt or CN[hi_c] not in txt:
            return 'f%dq%d 题面缺主语 %s' % (flat, k, txt)
    r = await tap(pg, q['answer'])
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

QF = {'animalmenu': None, 'iftrain': q_anm_if, 'chartread': q_chr}   # animalmenu 在下方替换为 r11 审计


async def q_anm_r11(pg, flat, k, q, dch):
    """animalmenu r11 每题审计+驱动（五题型：findfood/findwho/multifood/dietclass/chaindir；
    期望独立硬编码，禁引页面表；multifood=勾满 need+tapSubmit 提交制驱动）。"""
    kind = q['kind']
    anims = [o['anim'] for o in q['opts']]
    n = len(anims)
    if kind in ('findfood', 'findwho'):
        table, rev = (ANM, ANM_R) if kind == 'findfood' else (ANM_R, ANM)
        want = table.get(q['ask'])
        if want is None:
            return 'f%dq%d ask=%s 非封闭 8' % (flat, k, q['ask'])
        if n != 4 or len(set(anims)) != n or want not in anims or not set(anims) <= set(table.values()):
            return 'f%dq%d 候选 %s' % (flat, k, anims)
        if q['answer'] != anims.index(want):
            return 'f%dq%d answer=%d want=%d' % (flat, k, q['answer'], anims.index(want))
        r = await tap(pg, q['answer'])
        return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    if kind == 'multifood':
        want = ANM_MULTI.get(q['ask'])
        if q['ask'] not in ANM_A10 or want is None:
            return 'f%dq%d ask=%s 非封闭 10' % (flat, k, q['ask'])
        if sorted(q['need']) != sorted(want):
            return 'f%dq%d need=%s exp=%s' % (flat, k, q['need'], want)
        if n != 4 or len(set(anims)) != n or not set(anims) <= ANM_F15:
            return 'f%dq%d 候选 %s' % (flat, k, anims)
        if not all(a in want or a in ANM_DIS[q['ask']] for a in anims):
            return 'f%dq%d 干扰越白名单 %s' % (flat, k, anims)                 # 半有效排除（公平性）
        if q['answer'] != -1:
            return 'f%dq%d 提交型 answer=%s' % (flat, k, q['answer'])
        for g in want:                                                          # 勾满 need
            r = await tap(pg, anims.index(g))
            if r != 'pick':
                return 'f%dq%d pick(%s)=%s' % (flat, k, g, r)
        r = await pg.evaluate('(async () => { const x = await %s.tapSubmit(); return x === null || x === false ? String(x) : String(x); })()' % HOOK)
        return None if r in ('right', 'done') else 'f%dq%d sub=%s' % (flat, k, r)
    if kind == 'dietclass':
        if q['ask'] not in ANM_A10:
            return 'f%dq%d ask=%s 非封闭 10' % (flat, k, q['ask'])
        want = ANM_PLATES[ANM_DIET[q['ask']]]
        if set(anims) != ANM_PLATE_SET or n != 3:
            return 'f%dq%d 三盘 %s' % (flat, k, anims)
        if q['need'] != [want] or q['answer'] != anims.index(want):
            return 'f%dq%d need=%s/answer=%s want=%s' % (flat, k, q['need'], q['answer'], want)
        r = await tap(pg, q['answer'])
        return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    if kind == 'chaindir':
        pr = tuple(q['pair'] or ())
        if pr not in ANM_CHAIN:
            return 'f%dq%d pair=%s 表外' % (flat, k, pr)
        if n != 2 or set(anims) != set(pr):
            return 'f%dq%d 候选 %s' % (flat, k, anims)
        if q['need'] != [pr[0]] or q['answer'] != anims.index(pr[0]):
            return 'f%dq%d 方向 need=%s/answer=%s' % (flat, k, q['need'], q['answer'])
        r = await tap(pg, q['answer'])
        return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    return 'f%dq%d kind=%s' % (flat, k, kind)


QF['animalmenu'] = q_anm_r11

async def audit_static(pg):
    bad = []
    ch3_union = set()
    ch4_union = set()
    # r17：chartread CH_LEN 8/静态 32 关/8 题（anm/if 维持 20 关 5 题）
    n_flat = 32 if GAME == 'chartread' else 20
    n_q = 8 if GAME == 'chartread' else 5
    for flat in range(n_flat):
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(400)
        dch = await pg.evaluate('%s.currentLevel.dch' % HOOK)
        kinds = set()
        for k in range(n_q):
            old = await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK)
            q = json.loads(old)
            if q is None:
                bad.append('f%dq%d quiz null（演出期/提前终局）' % (flat, k))
                break
            kinds.add(q['kind'])
            err = await QF[GAME](pg, flat, k, q, dch)
            if err:
                bad.append(err); break
            if k < n_q - 1:
                if not await poll_step(pg, k + 1) and not await poll_quiz_change(pg, old):
                    bad.append('f%dq%d 未推进' % (flat, k)); break
        if len(bad) > 8:
            break
        # 章型族断言（anm r11 / if r3 / chr r17 v2：ch3 对比约束族并集+ch4 八族全池）
        if GAME == 'animalmenu':
            if dch == 1 and kinds != {'findfood', 'findwho'}:
                bad.append('f%d ch1 混出 %s' % (flat, kinds))
            if dch == 2 and kinds != {'multifood'}:
                bad.append('f%d ch2 型 %s' % (flat, kinds))
            if dch == 3 and kinds != {'dietclass'}:
                bad.append('f%d ch3 型 %s' % (flat, kinds))
            if dch == 4 and kinds != {'chaindir'}:
                bad.append('f%d ch4 型 %s' % (flat, kinds))
        elif GAME == 'iftrain':
            # v2 章型域（§0.77）：ch1 single×5 / ch2 multi×5 / ch3 best×3+conflict×2 / ch4 五族各 1
            if dch == 1 and kinds != {'single'}:
                bad.append('f%d ch1 型 %s' % (flat, kinds))
            if dch == 2 and kinds != {'multi'}:
                bad.append('f%d ch2 型 %s' % (flat, kinds))
            if dch == 3 and kinds != {'best', 'conflict'}:
                bad.append('f%d ch3 型 %s' % (flat, kinds))
            if dch == 4 and not kinds <= {'single', 'multi', 'best', 'conflict', 'ruleback'}:
                bad.append('f%d ch4 型 %s' % (flat, kinds))
        else:
            if dch == 1 and not kinds <= {'most', 'least', 'howmany', 'total'}:
                bad.append('f%d ch1 型 %s' % (flat, kinds))
            if dch == 2 and not kinds <= {'howmany', 'total', 'compare'}:
                bad.append('f%d ch2 型 %s' % (flat, kinds))
            if dch == 3:
                if not kinds <= {'twocompare', 'constraint', 'compare', 'howmany'}:
                    bad.append('f%d ch3 型 %s' % (flat, kinds))
                ch3_union |= kinds
            if dch == 4:
                if not kinds <= CHR_KINDS:
                    bad.append('f%d ch4 型 %s' % (flat, kinds))
                ch4_union |= kinds
    if GAME == 'chartread':
        if ch3_union != {'twocompare', 'constraint', 'compare', 'howmany'}:
            bad.append('ch3 跨关并集缺族 %s' % sorted(ch3_union))
        if ch4_union != CHR_KINDS:
            bad.append('ch4 跨关并集缺族 %s' % sorted(CHR_KINDS - ch4_union))
    return bad

async def wrong_once_js():
    if GAME == 'chartread':
        return '(async () => { const q = %s.quiz; const w = q.answer === 0 ? q.opts.length - 1 : 0; await %s.tapOpt(w); })()' % (HOOK, HOOK)
    return '(async () => { const q = %s.quiz; await %s.tapOpt(q.answer === 0 ? 1 : 0); })()' % (HOOK, HOOK)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # T1 verify selftest 复跑
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_V)
        t1 = await wait_verify_title(pg)
        rec('T1 selftest 复跑', 'VERIFY PASS' in t1 and not errs, t1)
        await ctx.close()

        # T2 真实页预置存档
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_R)
        await pg.wait_for_timeout(3000)
        sv = await pg.evaluate("localStorage.getItem('%s')" % SAVEKEY)
        sv = json.loads(sv) if sv else None
        rec('T2 真实页预置存档 v1.0', bool(sv and sv.get('v') == '1.0'), 'v=%s' % (sv and sv.get('v')))
        await ctx.close()

        # T3 全量 SPEC 对账+驱动（20 关×5 题）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        bad = await audit_static(pg)
        rec('T3 全量 SPEC 对账+驱动', not bad and not errs3, (bad[:6] or '') if bad else 'err=%s' % errs3[:2])

        # T4 生成关 dch∈1-4 全现非循环（b30 M2 定版断言；chr r17 静态 32→生成 flat≥32）
        gen_lo, gen_hi = (32, 52) if GAME == 'chartread' else (20, 40)
        gen = []
        for flat in range(gen_lo, gen_hi):
            r = await pg.evaluate('%s.start(%d), %s.currentLevel.dch' % (HOOK, flat, HOOK))
            gen.append(r)
        run = mx = 1
        for a, bch in zip(gen, gen[1:]):
            run = run + 1 if a == bch else 1
            mx = max(mx, run)
        rec('T4 生成关 dch∈1-4 且四型全现且非循环', all(g in (1, 2, 3, 4) for g in gen) and set(gen) == {1, 2, 3, 4} and mx < 5,
            '%s maxrun=%d' % (gen, mx))

        # T5 确定性
        same = True
        for flat in ((35, 40, 45, 50) if GAME == 'chartread' else (22, 27, 33, 39)):
            a = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            c = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        # T6 tapOpt 返回值族
        r0 = await pg.evaluate('(async () => { %s.start(10); await new Promise(w=>setTimeout(w,400)); const r = await %s.tapOpt(99); return r === null ? "null" : String(r); })()' % (HOOK, HOOK))
        r1 = await pg.evaluate('(async () => { const q = %s.quiz; const w = q.answer === 0 ? 1 : 0; const raw = await %s.tapOpt(w); return { raw: String(raw), miss: %s.quiz.miss, step: %s.quiz.step }; })()' % (HOOK, HOOK, HOOK, HOOK))
        await pg.wait_for_timeout(WRONG_WAIT[GAME])
        r2 = await pg.evaluate('(async () => { const q = %s.quiz; return String(await %s.tapOpt(q.answer)); })()' % (HOOK, HOOK))
        rec('T6 tapOpt 返回值族', r0 == 'null' and r1['raw'] == 'wrong' and r1['miss'] == 1 and r1['step'] == 0 and r2 == 'right',
            'oob=%s wrong=%s miss=%s right=%s' % (r0, r1['raw'], r1['miss'], r2))

        # T7 双错防重入
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(400)
        for _ in range(2):
            await pg.evaluate(await wrong_once_js())
            await pg.wait_for_timeout(40)
        await pg.wait_for_timeout(WRONG_WAIT[GAME])
        m = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T7 双错防重入 miss 只+1', m == 1, 'miss=%s' % m)

        # T8 星级三档
        flatx = 10
        async def stars_after(nwrong):
            await pg.evaluate('%s.start(%d)' % (HOOK, flatx))
            await pg.wait_for_timeout(400)
            for _ in range(nwrong):
                await pg.evaluate(await wrong_once_js())
                await pg.wait_for_timeout(WRONG_WAIT[GAME])
            await pg.evaluate('%s.autoSolve()' % HOOK)
            for _ in range(60):
                st = await pg.evaluate('%s.currentLevel' % HOOK)
                if st['won']:
                    return st['stars']
                await pg.wait_for_timeout(500)
            return None
        s0, s2, s3 = await stars_after(0), await stars_after(2), await stars_after(3)
        rec('T8 星级三档', s0 == 3 and s2 == 2 and s3 == 1, '0错=%s 2错=%s 3错=%s' % (s0, s2, s3))
        await ctx.close()

        # T9 家族 A 源码正则 + K 面板守卫（r11 animalmenu 升级=双 lim-1；iftrain/chartread 维持双形态）
        main_js = (BASE / GAME / '_src' / 'game-main.js').read_text(encoding='utf-8')
        data_js = (BASE / GAME / '_src' / 'game-data.js').read_text(encoding='utf-8')
        if GAME == 'animalmenu':
            rec('T9 家族 A 双 lim-1（r11 升级，weather M2/iftrain r3 同款）',
                len(re.findall(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js)) == 2 and
                re.search(r'nextHint\(\s*null\s*\)', main_js) is None)
        elif GAME == 'iftrain':
            rec('T9 家族 A 双 lim-1（r3 增补块契约 A 升级定版，同 anm/weather M2）',
                len(re.findall(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js)) == 2 and
                re.search(r'nextHint\(\s*null\s*\)', main_js) is None)
        else:
            rec('T9 家族 A 双 lim-1（r17 升级定版，同 anm/if；null 形态禁再现）',
                len(re.findall(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js)) == 2 and
                re.search(r'nextHint\(\s*null\s*\)', main_js) is None)
        rec('T9b 契约 K 面板守卫在场', "querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')" in main_js)

        # T10 C7 章末预告（4 章非空+生成关实算=GEN_HINTS[dch-1]，家族 F）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        hints = re.findall(r"hint:\s*'([^']+)'", data_js)
        ghints = re.findall(r'GEN_HINTS\s*=\s*\[([^\]]+)\]', data_js)
        gh = re.findall(r"'([^']+)'", ghints[0]) if ghints else []
        sem = (len(hints) == 4 and all(len(h) >= 4 for h in hints) and len(gh) == 4 and
               all(len(x) >= 4 for x in gh))
        genok = await pg.evaluate('[%s].every(f => nextHint(f) === GEN_HINTS[genLevel(f+1).dch-1])' %
                                  (','.join(map(str, (35, 38, 42, 47) if GAME == 'chartread' else (24, 29, 34, 39)))))
        rec('T10 C7 预告在场+生成关实算', sem and genok, 'hints=%d gh=%d genok=%s' % (len(hints), len(gh), genok))
        await ctx.close()

        # T11 契约 I 豁免窗+N keyless 恒尾（静态）
        vals = []
        for x in re.findall(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*([A-Za-z0-9_]+)', main_js):
            if x.isdigit():
                vals.append(int(x))
            else:
                c = re.search(r'\b%s\s*=\s*(\d+)' % re.escape(x), main_js) or \
                    re.search(r'\b%s\s*=\s*(\d+)' % re.escape(x), data_js)
                if c:
                    vals.append(int(c.group(1)))
        n_win = max(vals, default=0)
        dyn = re.search(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*\(\s*estMs\([A-Za-z]+\)\s*\+\s*300\s*\)', main_js)
        dyn46 = re.search(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*\(\s*AGAIN_DUR\[[A-Za-z]+\]\s*\+\s*300\s*\)', main_js)
        if GAME == 'chartread' and n_win == 0 and dyn:
            n_win = est_ms(12) + 300          # 纯 TTS 链动态窗下界（r17 八句实长 7-12 取 max 12 字，独立推导）
        if GAME == 'chartread' and n_win == 0 and dyn46:
            n_win = 3384 + 300                # T46 阶段2 语义句 clip 化：AGAIN_DUR 最长键 chr_again_unit2 3384（独立硬编码）
        lb = HEAD_CLIP[GAME] + 300
        guard = 'Date.now() < wrongChainUntil' in main_js
        reset = re.search(r'lastWrongVoice\s*=\s*0;\s*wrongChainUntil\s*=\s*0', main_js) is not None
        n_static = True
        for m in re.finditer(r'\{\s*key:\s*null[^}]*\}\s*(\S)', main_js):
            if m.group(1) != ']':
                n_static = False
        # keyless estMs 链下界（chr=纯 TTS 单段：estMs(11)+300；anm/if=链头+名音 max+estMs(keyless)+450 需 verify selftest 承担，此处静态下界）
        rec('T11 契约 I+N 豁免窗≥下界+keyless 恒尾', n_win > 0 and n_win >= lb and guard and reset and n_static,
            'N=%d 下界=%d guard=%s reset=%s keyless静态=%s' % (n_win, lb, guard, reset, n_static))
        await b.close()
    fails = [n for n, ok in RES if not ok]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)

asyncio.run(main())
