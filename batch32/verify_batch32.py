# -*- coding: utf-8 -*-
"""batch32 独立复验：senses / robotdance / evidence（断言从 SPEC-BATCH32 推导，期望值独立硬编码）
用法: python verify_batch32.py <senses|robotdance|evidence>
口径：verify 页 (?verify=1)；tapOpt/tapBlock 均 async；错链豁免窗内错点被吞——wrong 后等过窗再驱动：
     sen≈10100 / rbd≈5000 / evi≈4900（T46 链构成：sen=wrong1656+150+感官名1440+150+anti_base2880+150+感官名1440+150+anti_tail1248+300=9564（anti 最长族，窗 9800）；rbd=wrong+hint 全 clip 4650；evi=wrong+evi_again clip 尾段 4242）
探针实证形状（2026-09-11；senses r11 四族 2026-09-14）：
  senses   quiz={kind('findsense'|'findthing'|'multi'|'anti'|'comp'), ask, opts[{anim}], answer,
            step, miss；multi 加 answers[]·picked[]，comp 加 blocked}——multi 判定步在 tapSubmit
  robotdance quiz={steps[], blocks[{anim}] 含干扰, filled[], step, miss, phase('watch'|'build'|'dance')}
  evidence r17 quiz={kind('findexact'|'findall'|'reverse'), concl, opts[{img,label}]×4, answer(findexact 真/reverse 非真),
            answers(findall 3 真升序), picked[](findall 已勾), step, miss}——findall 判定步在 tapSubmit（勾选零惩罚）
"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'senses': 'SE', 'robotdance': 'RD', 'evidence': 'EV'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码表（禁 import 实现） ----
SEN = {'rainbow': 'eye', 'star': 'eye', 'bell': 'ear', 'birdsong': 'ear',
       'flower': 'nose', 'cookie': 'nose', 'softtoy': 'hand', 'ice': 'hand',
       'lemon': 'mouth', 'candy': 'mouth'}                       # §0.76 物品→感官
SEN_R = {v: k for k, v in SEN.items()}                           # 感官→物品集（一对多，单独处理）
SENSES5 = {'eye', 'ear', 'nose', 'hand', 'mouth'}
SEN_CN = {'eye': '眼睛', 'ear': '耳朵', 'nose': '鼻子', 'hand': '小手', 'mouth': '嘴巴',
          'rainbow': '彩虹', 'star': '星星闪闪', 'bell': '闹钟响响', 'birdsong': '小鸟唱歌',
          'flower': '花儿香香', 'cookie': '饼干香香', 'softtoy': '毛绒软软', 'ice': '冰块凉凉',
          'lemon': '柠檬酸酸', 'candy': '糖果甜甜'}
# §6 r11 四族封闭表（独立硬编码：多感官物 5 每物恰 3 感官 + 章型位序 q0 恒单选题型）
SEN_M = {'popcorn': ['eye', 'ear', 'nose'], 'watermelon': ['eye', 'ear', 'mouth'],
         'kitten': ['eye', 'ear', 'hand'], 'soup': ['eye', 'nose', 'mouth'],
         'drum': ['eye', 'ear', 'hand']}
CH_FAM = {1: ['find', 'multi', 'find', 'multi', 'multi'],
          2: ['anti', 'multi', 'anti', 'find', 'anti'],
          3: ['anti', 'multi', 'comp', 'multi', 'anti'],
          4: ['comp', 'multi', 'anti', 'comp', 'find']}
RBD_POOL = {'jump', 'spin', 'clap', 'stomp', 'wave'}             # §0.77 动作池 5
# §-r17-evidence §1 结论封闭 20（每条真 3+weak 2+none 3；独立硬编码自 SPEC，禁 import 实现；
# 真场景全局互异断言=「真场景不得跨结论复用」的 Python 侧独立验算）
EV_TRUE = {
    'rainwet': ['puddle', 'umbrella2', 'wetground'], 'snowplay': ['snowman', 'icicle', 'snowground'],
    'birthday': ['cake', 'gift', 'candles'], 'cooked': ['steam', 'smell', 'dishes'],
    'doghere': ['paw', 'doghair', 'bonebone'], 'windbig': ['treebend', 'leaves', 'hatfly'],
    'paintday': ['painthand', 'paintjar', 'paper'], 'nightowl': ['lamp', 'cup', 'nightnoodles'],
    'washhands': ['wettowel', 'sinkdrops', 'soapbub'], 'ateorange': ['peelings', 'halforange', 'trashpeel'],
    'haircut': ['hairfloor', 'haircollar', 'broomhair'], 'waterplant': ['drops', 'traywater', 'soilwet'],
    'mopped': ['wetshine', 'mopdrip', 'watertrail'], 'brushed': ['brushwet', 'pasteopen', 'cupdrain'],
    'fedfish': ['feedcan', 'feedfloat', 'feedspill'], 'playedblocks': ['blocksout', 'towerhalf', 'sortbox'],
    'drankmilk': ['milkring', 'milkdrop', 'milkhalf'], 'wrotehomework': ['notebookopen', 'eraserdust', 'pencilrest'],
    'fixedbike': ['greasehand', 'toolslay', 'chainoff'], 'playedsandbox': ['sandcastle', 'bucket', 'sandshoes']}
EV_WEAK = {
    'rainwet': ['cloudy', 'wetdog'], 'snowplay': ['coldboy', 'mittens'], 'birthday': ['balloon', 'snackplate'],
    'cooked': ['apron', 'basket'], 'doghere': ['leash', 'dogbowl'], 'windbig': ['cloudy2', 'scarfman'],
    'paintday': ['brush', 'watercup'], 'nightowl': ['clock', 'curtain'], 'washhands': ['sleeves', 'towelneat'],
    'ateorange': ['orangeplate', 'napkins'], 'haircut': ['scissors', 'barberchair'],
    'waterplant': ['wateringcan', 'blooming'], 'mopped': ['dooropen', 'slippers'],
    'brushed': ['toothlay', 'mirrorspots'], 'fedfish': ['fishup', 'tanklight'],
    'playedblocks': ['blockbox', 'playmat'], 'drankmilk': ['fridge', 'milkcup'],
    'wrotehomework': ['bagopen', 'pencilcase'], 'fixedbike': ['toolbox', 'pump'],
    'playedsandbox': ['toybox', 'dustypants']}
EV_NONE = {
    'rainwet': ['flowerbed', 'toycar', 'tvon'], 'snowplay': ['toycar', 'birdfly', 'calendar'],
    'birthday': ['tvon', 'storybook', 'plant'], 'cooked': ['fridge', 'calendar', 'flowerpot'],
    'doghere': ['ball', 'catsleep', 'bench'], 'windbig': ['flowerpot', 'trafficlight', 'stone'],
    'paintday': ['storybook', 'plant', 'catsleep'], 'nightowl': ['plant', 'snail', 'bench'],
    'washhands': ['tvon', 'flowerbed', 'trafficlight'], 'ateorange': ['ball', 'bench', 'calendar'],
    'haircut': ['tvon', 'plant', 'stone'], 'waterplant': ['toycar', 'storybook', 'trafficlight'],
    'mopped': ['birdfly', 'flowerpot', 'snail'], 'brushed': ['ball', 'calendar', 'bench'],
    'fedfish': ['flowerbed', 'storybook', 'stone'], 'playedblocks': ['tvon', 'snail', 'trafficlight'],
    'drankmilk': ['birdfly', 'catsleep', 'plant'], 'wrotehomework': ['bench', 'stone', 'snail'],
    'fixedbike': ['birdfly', 'flowerbed', 'calendar'], 'playedsandbox': ['tvon', 'trafficlight', 'plant']}
CONCLS20 = set(EV_TRUE)
_ALL_TRUE = [x for c in EV_TRUE for x in EV_TRUE[c]]
assert len(_ALL_TRUE) == len(set(_ALL_TRUE)) == 60, '真场景跨结论复用（§1 全局互异违约）'
# 错链窗（SPEC §4 实长表推导，独立验算：T46 sen 最长族 anti 5 段=wrong1656+150+感官名1440+150+anti_base2880+150+感官名1440+150+anti_tail1248+300=9564→窗 9800、驱动等 10100；
#          rbd=1656+150+2544+300=4650→等 5000；evi T46=2112+150+evi_again 1680+300=4242→等 4900）
WRONG_WAIT = {'senses': 10100, 'robotdance': 5000, 'evidence': 4900}

def est_ms(n):  # 家族 T 全字符口径
    return n * 345 + 600

async def wait_verify_title(pg):
    for _ in range(150):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t and t != 'VERIFY':
            return t
        await pg.wait_for_timeout(500)
    return ''

async def poll_step(pg, want, timeout=20000):
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate('%s.quiz.step' % HOOK)
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False

async def tap(pg, i):
    fn = 'tapBlock' if GAME == 'robotdance' else 'tapOpt'
    return await pg.evaluate('(async () => { const r = await %s.%s(%d); return r === null ? "null" : String(r); })()' % (HOOK, fn, i))

async def wait_build(pg, timeout=30000):
    """robotdance：等演示相位结束（phase→build）"""
    for _ in range(int(timeout / 300)):
        ph = await pg.evaluate('%s.quiz.phase' % HOOK)
        if ph == 'build':
            return True
        await pg.wait_for_timeout(300)
    return False

async def wait_quiz_next(pg, old, timeout=20000):
    for _ in range(int(timeout / 300)):
        cur = await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK)
        if cur != old:
            return True
        await pg.wait_for_timeout(300)
    return False

# ---------- T3 每题审计（20 关×5 题） ----------
async def q_senses(pg, flat, k, q, dch):
    """r11 四族逐题独立对账+驱动：find 恒 4（findthing 防双真值）/multi 感官 5 全集+answers 恰 3
    （勾满+tapSubmit 提交判定）/anti 相关恰 3+不相关恰 1=answer/comp 诱惑恒在+真值恰 1+集外恰 2。"""
    kind = q['kind']
    fam = 'find' if kind in ('findsense', 'findthing') else kind
    if CH_FAM[dch][k] != fam:
        return 'f%dq%d 章型位序 %s≠%s dch%d' % (flat, k, kind, CH_FAM[dch][k], dch)
    ask = q['ask']
    anims = [o['anim'] for o in q['opts']]
    if flat == 0 and k == 0 and (kind != 'findsense' or ask != 'bell'):
        return 'f%dq%d 教学锚' % (flat, k)
    if kind in ('findsense', 'findthing'):
        n = len(anims)
        if n != 4 or len(set(anims)) != n:
            return 'f%dq%d find 候选=%d %s' % (flat, k, n, anims)
        if kind == 'findsense':
            want = SEN.get(ask)
            if want is None or not set(anims) <= SENSES5 or want not in anims:
                return 'f%dq%d findsense 域 %s %s' % (flat, k, ask, anims)
            if q['answer'] != anims.index(want):
                return 'f%dq%d answer 错' % (flat, k)
        else:
            if ask not in SENSES5 or not set(anims) <= set(SEN):
                return 'f%dq%d findthing 域 %s %s' % (flat, k, ask, anims)
            trues = [a for a in anims if SEN[a] == ask]
            if len(trues) != 1 or q['answer'] != anims.index(trues[0]):
                return 'f%dq%d findthing 真值 %s' % (flat, k, anims)   # 防双真值
        r = await tap(pg, q['answer'])
        return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    if kind == 'multi':
        if ask not in SEN_M:
            return 'f%dq%d multi 物 %s' % (flat, k, ask)
        if len(anims) != 5 or set(anims) != SENSES5:
            return 'f%dq%d multi 候选 %s' % (flat, k, anims)
        exp = sorted(anims.index(v) for v in SEN_M[ask])
        if sorted(q.get('answers', [])) != exp or q.get('answer') != -1 or q.get('picked') != []:
            return 'f%dq%d multi answers=%s exp=%s' % (flat, k, q.get('answers'), exp)
        rr = await pg.evaluate(                       # 驱动：勾满 answers+提交（判定步在 tapSubmit）
            '(async () => { for (const j of SE.quiz.answers) { let ok = false;'
            ' for (let t = 0; t < 40 && !ok; t++) { const r = await SE.tapOpt(j);'
            ' if (r === "pick") ok = true; else await new Promise(w => setTimeout(w, 150)); } }'
            ' for (let t = 0; t < 30; t++) { const r = await SE.tapSubmit();'
            ' if (r === "right" || r === "done") return String(r);'
            ' await new Promise(w => setTimeout(w, 250)); } return "stuck"; })()')
        return None if rr in ('right', 'done') else 'f%dq%d submit=%s' % (flat, k, rr)
    if kind == 'anti':
        if ask not in SENSES5:
            return 'f%dq%d anti 感官 %s' % (flat, k, ask)
        if len(anims) != 4 or len(set(anims)) != 4 or not all(a in SEN or a in SEN_M for a in anims):
            return 'f%dq%d anti 候选 %s' % (flat, k, anims)
        rel_s = [a for a in anims if a in SEN and SEN[a] == ask]
        rel_m = [a for a in anims if a in SEN_M and ask in SEN_M[a]]
        unrel = [a for a in anims if (a in SEN and SEN[a] != ask) or (a in SEN_M and ask not in SEN_M[a])]
        if len(rel_s) != 2 or len(rel_m) != 1 or len(unrel) != 1:   # 相关恰 3（2 单感官+1 多感官）
            return 'f%dq%d anti 相关/不相关 %s' % (flat, k, anims)
        if q['answer'] != anims.index(unrel[0]):
            return 'f%dq%d anti answer' % (flat, k)
        r = await tap(pg, q['answer'])
        return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    # comp
    if ask not in SEN_M:
        return 'f%dq%d comp 物 %s' % (flat, k, ask)
    blocked = q.get('blocked')
    if blocked not in SEN_M[ask]:
        return 'f%dq%d comp blocked=%s' % (flat, k, blocked)
    if len(anims) != 4 or len(set(anims)) != 4 or not set(anims) <= SENSES5:
        return 'f%dq%d comp 候选 %s' % (flat, k, anims)
    ms = SEN_M[ask]
    avail = [v for v in anims if v in ms and v != blocked]
    outside = [v for v in anims if v not in ms]
    if anims.count(blocked) != 1 or len(avail) != 1 or len(outside) != 2:
        return 'f%dq%d comp 先验 %s b=%s' % (flat, k, anims, blocked)
    if q['answer'] != anims.index(avail[0]):
        return 'f%dq%d comp answer' % (flat, k)
    r = await tap(pg, q['answer'])
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_robotdance(pg, flat, k, q, dch):
    steps, blocks = q['steps'], q['blocks']
    ns = len(steps)
    anims = [b['anim'] for b in blocks]
    if not set(steps) <= RBD_POOL or len(set(steps)) != ns:
        return 'f%dq%d steps=%s' % (flat, k, steps)                 # 无重复先验
    if ns != (3 if dch == 1 else 4 if dch == 2 else 5 if dch == 3 else ns):
        if dch in (1, 2, 3):
            return 'f%dq%d ch%d 步数=%d' % (flat, k, dch, ns)
    if dch == 4 and ns not in (3, 4, 5):
        return 'f%dq%d ch4 步数=%d' % (flat, k, ns)
    if len(set(anims)) != len(anims):
        return 'f%dq%d blocks 重复 %s' % (flat, k, anims)
    if not set(anims) <= RBD_POOL:
        return 'f%dq%d blocks 越池 %s' % (flat, k, anims)
    if not set(steps) <= set(anims):
        return 'f%dq%d steps 有动作不在 blocks' % (flat, k)
    ndistr = len(anims) - ns
    # 干扰数=min(池5-步数, 章上限)——实现定版（探针+core 实证：cap{ch1:0,ch2:1,ch3:2,ch4:2}，
    # ch3 5 步→0 数学唯一解；ch1 0=教学章简化；blocks 3/5/5/5）
    cap = {1: 0, 2: 1, 3: 2, 4: 2}[dch]
    if ndistr != min(5 - ns, cap):
        return 'f%dq%d 干扰=%d 应=%d' % (flat, k, ndistr, min(5 - ns, cap))
    if not await wait_build(pg):
        return 'f%dq%d 演示相位未结束' % (flat, k)
    for si in range(ns):
        q2 = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
        live = [b['anim'] for b in q2['blocks']]
        want = steps[si]
        if want not in live:
            return 'f%dq%d 第%d步 %s 不在 blocks' % (flat, k, si, want)
        i = live.index(want)
        exp = 'done' if si == ns - 1 else 'fill'
        r = await tap(pg, i)
        if r != exp:
            return 'f%dq%d 第%d步 tap=%s 应=%s' % (flat, k, si, r, exp)
        q3 = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
        if si < ns - 1:
            if q3['filled'][:si + 1] != steps[:si + 1]:
                return 'f%dq%d 契约M 填槽=%s 应=%s' % (flat, k, q3['filled'], steps)
        else:
            return None                                              # 末槽 done → 题完成
    return None

async def q_evidence(pg, flat, k, q, dch):
    """r17 三族逐题独立对账+驱动：findexact 恰 1 真（ch1 二分=干扰全 none / ch2 三档=weak≥1+none≥1）/
    findall 真 3 全在场+干扰 1（勾满 answers+tapSubmit 判定）/reverse 真 3+非真 1（answer=非真）。"""
    kind = q['kind']
    if kind not in ('findexact', 'findall', 'reverse'):
        return 'f%dq%d kind=%s' % (flat, k, kind)
    c = q['concl']
    if c not in CONCLS20:
        return 'f%dq%d concl=%s 非封闭 20' % (flat, k, c)
    imgs = [o['img'] for o in q['opts']]
    if any(not o.get('label') for o in q['opts']):
        return 'f%dq%d 卡缺标签' % (flat, k)
    if len(imgs) != 4 or len(set(imgs)) != len(imgs):
        return 'f%dq%d 候选 %s' % (flat, k, imgs)
    pool_true = set(EV_TRUE[c])
    weak, none = set(EV_WEAK[c]), set(EV_NONE[c])
    if not set(imgs) <= pool_true | weak | none:
        return 'f%dq%d 候选越池 %s' % (flat, k, imgs)
    tiers = ['true' if x in pool_true else 'weak' if x in weak else 'none' for x in imgs]
    n_true = tiers.count('true')
    if kind == 'findexact':
        if n_true != 1:
            return 'f%dq%d 真值数=%d（防双真值）' % (flat, k, n_true)
        if q['answer'] != imgs.index(next(x for x in imgs if x in pool_true)):
            return 'f%dq%d answer 错' % (flat, k)
        dis = [t for t in tiers if t != 'true']
        if dch == 1 and set(dis) != {'none'}:
            return 'f%dq%d ch1 二分干扰 %s' % (flat, k, dis)
        if dch == 2 and ('weak' not in dis or 'none' not in dis):
            return 'f%dq%d ch2 三档干扰 %s' % (flat, k, dis)
        r = await tap(pg, q['answer'])
        return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    if kind == 'findall':
        if dch < 3:
            return 'f%dq%d findall 在 ch%d 提前出' % (flat, k, dch)
        if n_true != 3:
            return 'f%dq%d findall 真=%d' % (flat, k, n_true)
        ans = q.get('answers') or []
        if sorted(ans) != sorted(imgs.index(x) for x in imgs if x in pool_true):
            return 'f%dq%d answers=%s 错' % (flat, k, ans)
        rr = await pg.evaluate(               # 驱动：勾满 answers+tapSubmit（判定步；勾选零惩罚）
            '(async () => { for (const j of EV.quiz.answers) { let ok = false;'
            ' for (let t = 0; t < 40 && !ok; t++) { const r = await EV.tapOpt(j);'
            ' if (r === "pick") ok = true; else await new Promise(w => setTimeout(w, 150)); } }'
            ' for (let t = 0; t < 30; t++) { const r = await EV.tapSubmit();'
            ' if (r === "right" || r === "done") return String(r);'
            ' await new Promise(w => setTimeout(w, 250)); } return "stuck"; })()')
        return None if rr in ('right', 'done') else 'f%dq%d submit=%s' % (flat, k, rr)
    # reverse（ch4 反问：真 3+非真 1，answer=非真卡）
    if dch < 4:
        return 'f%dq%d reverse 在 ch%d 提前出' % (flat, k, dch)
    if n_true != 3:
        return 'f%dq%d reverse 真=%d' % (flat, k, n_true)
    if q['answer'] != imgs.index(next(x for x in imgs if x not in pool_true)):
        return 'f%dq%d reverse answer 错' % (flat, k)
    r = await tap(pg, q['answer'])
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

QF = {'senses': q_senses, 'robotdance': q_robotdance, 'evidence': q_evidence}

async def audit_static(pg):
    bad = []
    # r17：evidence CH_LEN 8/静态 32 关/8 题（sen/rbd 维持 20 关 5 题）
    n_flat = 32 if GAME == 'evidence' else 20
    n_q = 8 if GAME == 'evidence' else 5
    for flat in range(n_flat):
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(400)
        dch = await pg.evaluate('%s.currentLevel.dch' % HOOK)
        kinds = set()
        concls = set()
        for k in range(n_q):
            old = await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK)
            q = json.loads(old)
            if q is None:
                bad.append('f%dq%d quiz null（演出期/提前终局）' % (flat, k))
                break
            kinds.add(q['kind'] if GAME != 'robotdance' else 'seq')
            if GAME == 'evidence':
                concls.add(q['concl'])
            err = await QF[GAME](pg, flat, k, q, dch)
            if err:
                bad.append(err); break
            if k < n_q - 1:
                if not await poll_step(pg, k + 1) and not await wait_quiz_next(pg, old):
                    bad.append('f%dq%d 未推进' % (flat, k)); break
        if len(bad) > 8:
            break
        # 章型族断言（sen r11 位序 / r17 evidence：ch1·ch2 恒 findexact/ch3 恒 findall/ch4 三族混出各≥1）
        if GAME == 'senses':
            if dch == 1 and not (kinds <= {'findsense', 'findthing', 'multi'} and 'multi' in kinds
                                 and kinds & {'findsense', 'findthing'}):
                bad.append('f%d ch1 型 %s' % (flat, kinds))
            if dch == 2 and not ({'anti', 'multi'} < kinds <=
                                 {'anti', 'multi', 'findsense', 'findthing'} and len(kinds) == 3):
                bad.append('f%d ch2 型 %s' % (flat, kinds))
            if dch == 3 and kinds != {'anti', 'multi', 'comp'}:
                bad.append('f%d ch3 混出 %s' % (flat, kinds))
            if dch == 4 and not ({'anti', 'multi', 'comp'} <= kinds <=
                                 {'anti', 'multi', 'comp', 'findsense', 'findthing'} and len(kinds) == 4):
                bad.append('f%d ch4 型 %s' % (flat, kinds))
        elif GAME == 'evidence':
            if dch in (1, 2) and kinds != {'findexact'}:
                bad.append('f%d ch%d 型 %s' % (flat, dch, kinds))
            if dch == 3 and kinds != {'findall'}:
                bad.append('f%d ch3 型 %s' % (flat, kinds))
            if dch == 4 and kinds != {'findexact', 'findall', 'reverse'}:
                bad.append('f%d ch4 三族混出 %s' % (flat, kinds))
            if len(concls) != n_q:                                # 同关结论去重（§-r17 同关去重）
                bad.append('f%d 同关结论重复 %s' % (flat, sorted(concls)))
    return bad

async def wrong_once_js(restart=True):
    """错一次。robotdance 须 build 相位（watch/dance 吞输入返 false）；
    T7/T8 复用时 restart=False（不重开当前关）。f10=ch3 5 步 0 干扰→点顺序错位块（≠当前步动作）。"""
    if GAME == 'evidence':
        # r17 三族错路径：findexact=点干扰 / reverse=点真值卡（answer=非真，tap 真=wrong）/
        # findall=勾 1 干扰+提交（勾选中性零惩罚，多选=提交步 wrong）
        return ('(async () => { const q = %s.quiz;'
                ' if (q.kind === "findall") { const cand = [0,1,2,3].filter(i => !(q.answers || []).includes(i));'
                ' await %s.tapOpt(cand[0]); await %s.tapSubmit(); }'
                ' else if (q.kind === "reverse") { const trues = [0,1,2,3].filter(i => i !== q.answer);'
                ' await %s.tapOpt(trues[0]); }'
                ' else { const cand = [0,1,2,3].filter(i => i !== q.answer);'
                ' await %s.tapOpt(cand[0]); } })()' % (HOOK, HOOK, HOOK, HOOK, HOOK))
    if GAME == 'senses':
        return '(async () => { const q = %s.quiz; await %s.tapOpt(q.answer === 0 ? 1 : 0); })()' % (HOOK, HOOK)
    pre = ('const H = %s; %s await new Promise(w=>setTimeout(w,600));'
           ' for (let i = 0; i < 100; i++) { if (H.quiz.phase === "build") break; await new Promise(w=>setTimeout(w,300)); }'
           ) % (HOOK, ('await H.start(10);' if restart else ''))
    return ('(async () => { %s'
            ' const q = H.quiz; const live = q.blocks.map(b => b.anim);'
            ' const wrongIdx = live.findIndex(a => !q.steps.includes(a));'
            ' const alt = live.findIndex(a => a !== q.steps[0]);'   # 快照 pos=null（getter 不暴露）；wrong 不推进 pos→恒 0 安全
            ' const i = wrongIdx >= 0 ? wrongIdx : alt;'
            ' await H.tapBlock(i < 0 ? 99 : i); })()' % pre)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])   # 静音纪律：无头默认外放
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

        # T3 全量 SPEC 对账+驱动（20 关×5 题）+T4 生成关+T5 确定性（同 ctx）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        bad = await audit_static(pg)
        rec('T3 全量 SPEC 对账+驱动', not bad and not errs3, (bad[:6] or '') if bad else 'err=%s' % errs3[:2])

        gen = []
        gen_lo, gen_hi = (32, 52) if GAME == 'evidence' else (20, 40)   # r17 evidence 静态 32→生成 flat≥32
        for flat in range(gen_lo, gen_hi):
            r = await pg.evaluate('%s.start(%d), %s.currentLevel.dch' % (HOOK, flat, HOOK))
            gen.append(r)
        run = mx = 1
        for a, bch in zip(gen, gen[1:]):
            run = run + 1 if a == bch else 1
            mx = max(mx, run)
        rec('T4 生成关 dch∈1-4 且四型全现且非循环', all(g in (1, 2, 3, 4) for g in gen) and set(gen) == {1, 2, 3, 4} and mx < 5,
            '%s maxrun=%d' % (gen, mx))

        same = True
        for flat in ((35, 40, 45, 50) if GAME == 'evidence' else (22, 27, 33, 39)):
            a = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            c = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        # T6 tapX 返回值族（robotdance 须 build 相位——watch/dance 吞输入返 false）
        if GAME == 'robotdance':
            r0 = await pg.evaluate('(async () => { %s.start(10); await new Promise(w=>setTimeout(w,500)); const r = await %s.tapBlock(99); return r === null ? "null" : String(r); })()' % (HOOK, HOOK))
            r1 = await pg.evaluate('(async () => { const H = %s; for (let i = 0; i < 100; i++) { if (H.quiz.phase === "build") break; await new Promise(w=>setTimeout(w,300)); }'
                                   ' const q = H.quiz; const live = q.blocks.map(b=>b.anim);'
                                   ' const wi = live.findIndex(a => !q.steps.includes(a));'
                                   ' const alt = live.findIndex(a => a !== q.steps[0]);'
                                   ' const raw = await H.tapBlock(wi >= 0 ? wi : alt);'
                                   ' return { raw: String(raw), miss: H.quiz.miss, step: H.quiz.step }; })()' % HOOK)
        else:
            r0 = await pg.evaluate('(async () => { %s.start(10); await new Promise(w=>setTimeout(w,400)); const r = await %s.tapOpt(99); return r === null ? "null" : String(r); })()' % (HOOK, HOOK))
            r1 = await pg.evaluate('(async () => { const q = %s.quiz; const pool = q.kind === "findall" ? (q.answers || []) : [q.answer];'
                                   ' const cand = [0,1,2,3].filter(i => !pool.includes(i));'
                                   ' const raw = await %s.tapOpt(cand.length ? cand[0] : (q.answer === 0 ? 1 : 0));'
                                   ' return { raw: String(raw), miss: %s.quiz.miss, step: %s.quiz.step }; })()' % (HOOK, HOOK, HOOK, HOOK))
        await pg.wait_for_timeout(WRONG_WAIT[GAME])
        if GAME == 'robotdance':
            r2 = await pg.evaluate('(async () => { const q = %s.quiz; const live = q.blocks.map(b=>b.anim);'
                                   ' return String(await %s.tapBlock(live.indexOf(q.steps[q.step]))); })()' % (HOOK, HOOK))
        elif GAME == 'evidence':
            r2 = await pg.evaluate('(async () => { const q = %s.quiz; const t = q.kind === "findall" ? q.answers[0] : q.answer; return String(await %s.tapOpt(t)); })()' % (HOOK, HOOK))
        else:
            r2 = await pg.evaluate('(async () => { const q = %s.quiz; return String(await %s.tapOpt(q.answer)); })()' % (HOOK, HOOK))
        rec('T6 tapX 返回值族', r0 == 'null' and r1['raw'] == 'wrong' and r1['miss'] == 1 and r1['step'] == 0 and r2 in ('right', 'lit', 'fill'),
            'oob=%s wrong=%s miss=%s next=%s' % (r0, r1['raw'], r1['miss'], r2))

        # T7 双错防重入（窗内 40ms 二错被吞，miss 只+1）
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600 if GAME == 'robotdance' else 400)
        if GAME == 'robotdance':
            await wait_build(pg)
        for _ in range(2):
            await pg.evaluate(await wrong_once_js(restart=False))
            await pg.wait_for_timeout(40)
        await pg.wait_for_timeout(WRONG_WAIT[GAME])
        m = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T7 双错防重入 miss 只+1', m == 1, 'miss=%s' % m)

        # T8 星级三档（robotdance wrong 不重开当前关——restart=False）
        flatx = 10
        async def stars_after(nwrong):
            await pg.evaluate('%s.start(%d)' % (HOOK, flatx))
            await pg.wait_for_timeout(600 if GAME == 'robotdance' else 400)
            if GAME == 'robotdance':
                await wait_build(pg)
            for _ in range(nwrong):
                await pg.evaluate(await wrong_once_js(restart=False))
                await pg.wait_for_timeout(WRONG_WAIT[GAME])
            await pg.evaluate('%s.autoSolve()' % HOOK)
            for _ in range(90):
                st = await pg.evaluate('%s.currentLevel' % HOOK)
                if st['won']:
                    return st['stars']
                await pg.wait_for_timeout(500)
            return None
        s0, s2, s3 = await stars_after(0), await stars_after(2), await stars_after(3)
        rec('T8 星级三档', s0 == 3 and s2 == 2 and s3 == 1, '0错=%s 2错=%s 3错=%s' % (s0, s2, s3))
        await ctx.close()

        # T9 家族 A 源码正则 + K 面板守卫
        main_js = (BASE / GAME / '_src' / 'game-main.js').read_text(encoding='utf-8')
        data_js = (BASE / GAME / '_src' / 'game-data.js').read_text(encoding='utf-8')
        if GAME == 'evidence':
            # r17 家族 A 定版（E-M1 修复对齐）：双 lim-1+null 形态禁再现（含注释）
            rec('T9 家族 A 双 lim-1（r17 定版）',
                len(re.findall(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js)) == 2 and
                re.search(r'nextHint\(\s*null\s*\)', main_js) is None)
        else:
            rec('T9 家族 A nextHint 双形态',
                re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js) is not None and
                re.search(r'nextHint\(\s*null\s*\)', main_js) is not None)
        rec('T9b 契约 K 面板守卫在场', "querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')" in main_js)

        # T10 C7 章末预告（4 章非空+生成关实算=GEN_HINTS[dch-1]，家族 F）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        data_nc = re.sub(r'//[^\n]*', '', data_js)     # 剥行注释（r11 注释含章型方括号会截断 [] 匹配）
        hints = re.findall(r"hint:\s*'([^']+)'", data_nc)
        ghints = re.findall(r'GEN_HINTS\s*=\s*\[([^\]]+)\]', data_nc)
        gh = re.findall(r"'([^']+)'", ghints[0]) if ghints else []
        sem = (len(hints) == 4 and all(len(h) >= 4 for h in hints) and len(gh) == 4 and
               all(len(x) >= 4 for x in gh))
        genok = await pg.evaluate('[%s].every(f => nextHint(f) === GEN_HINTS[genLevel(f+1).dch-1])' %
                                  (','.join(map(str, (35, 38, 42, 47) if GAME == 'evidence' else (24, 29, 34, 39)))))
        rec('T10 C7 预告在场+生成关实算', sem and genok, 'hints=%d gh=%d genok=%s' % (len(hints), len(gh), genok))
        await ctx.close()

        # T11 契约 I 豁免窗+N keyless 恒尾（静态）
        vals = []
        for x in re.findall(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*([A-Za-z0-9_]+)', main_js):
            if x.isdigit():
                vals.append(int(x))
            else:
                # 常量可为算术表达式（如 2112 + 150 + 1680 + 300）：取整条赋值右侧数字求和
                c = re.search(r'\b%s\s*=\s*([\d+\s]+)' % re.escape(x), main_js) or \
                    re.search(r'\b%s\s*=\s*([\d+\s]+)' % re.escape(x), data_js)
                if c:
                    vals.append(sum(int(t) for t in c.group(1).split('+') if t.strip()))
        n_win = max(vals, default=0)
        dyn = re.search(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*\(\s*estMs\([A-Za-z]+\)\s*\+\s*300\s*\)', main_js)
        if n_win == 0 and dyn:
            n_win = est_ms({'senses': 9, 'robotdance': 0, 'evidence': 4}[GAME]) + 300
        lb = {'senses': 9564, 'robotdance': 4650, 'evidence': 4242}[GAME]   # SPEC §4 独立验算下界（sen T46 anti 5 段=1656+150+1440+150+2880+150+1440+150+1248+300；evi T46=2112+150+evi_again 1680+300）
        guard = 'Date.now() < wrongChainUntil' in main_js
        reset = re.search(r'lastWrongVoice\s*=\s*0;\s*wrongChainUntil\s*=\s*0', main_js) is not None
        n_static = True
        for m in re.finditer(r'\{\s*key:\s*null[^}]*\}\s*(\S)', main_js):
            if m.group(1) != ']':
                n_static = False
        rec('T11 契约 I+N 豁免窗≥下界+keyless 恒尾', n_win > 0 and n_win >= lb and guard and reset and n_static,
            'N=%d 下界=%d guard=%s reset=%s keyless静态=%s' % (n_win, lb, guard, reset, n_static))
        await b.close()
    fails = [n for n, ok in RES if not ok]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)

asyncio.run(main())
