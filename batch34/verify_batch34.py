# -*- coding: utf-8 -*-
"""batch34 独立复验：hidecup / sentorder / datacollect（断言从 SPEC-BATCH34 推导，期望值独立硬编码）
用法: python verify_batch34.py <hidecup|sentorder|datacollect>
口径：verify 页 (?verify=1)；错链豁免窗内错点被吞——wrong 后等过窗再驱动：
     hc≈5450 / so≈6300 / dc≈4450（链构成：hc=wrong1656+150+hint3048+300=5154；so 两级取 max=wrong_word2784+150+hint2760+300=5994；dc=wrong1800+150+hint1896+300=4146）
钩子形状（SPEC §1-3；agent 交付后探针实证校准——本文件标 [探针校准] 处）：
  hidecup    quiz={kind('hide'|'hidedual'|'hidetriple'), cups(3|4), swaps[[a,b]], start, answer(动态：多动物=当前步真值),
             anim, animA/animB[/animC]/startA/startB[/startC]/answerA/answerB[/answerC]/phase(0=问A/1=问B/2=问C), step(题号), miss}
             r51（SPEC-R51-HIDECUP）：ch1 c3s2 900ms / ch2 c4s3 800 / ch3 c4s4 谱(3hide+2dual) 700 / ch4 c4s5 谱(2hide+2dual+1triple) 600
  sentorder  quiz={words[](正确语序), opts[{w}](恒全摆 L+d), picked[], step(题号), miss}
  datacollect quiz={kind('count'|'sum'|'diff'|'mostdiff'|'change'|'totalchange'), scene{类目id:数量}(这次调查),
              scene1{...}|null(dch4 上次调查), up|null, ask, answer, options[4], answerIdx, grid[], step(题号), miss}
驱动策略：三款演出窗吞输入返回值不一（null/false）——统一重试循环（tap 目标→吞则等 400ms 重试，上限 40 次覆盖 ~16s 演出+链窗）
hidecup T12（维护轮 m 批① 2026-09-23，r25 审查 m2 挂账）：40 关谱 Python 复刻对拍
  （hc_rng/hc_gen_swaps/hc_build_quiz/hc_gen_level 从 SPEC §0.82+§R2/R3 独立写出）——
  dch1-3 逐字节（页面 genLevel JSON == Python 串）+全 40 关结构；hidecup 跑 13 腿
  （其余两款不受影响恒 12 腿）
datacollect r14（2026-09-15 红款清零批）：count=点 answer/2 格（一格=2 只）+settle 900ms 自动 right；
  数值题=4 选 1 数值卡 tapCard(answerIdx)（answer 从 scene/scene1 独立推导对账）；
  T6/T7/T8 错路径走数值题错卡（DC.dcStartNumeric(6) 快进——单发判定时序稳定，不与 900ms 窗竞速）
"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'hidecup': 'HC', 'sentorder': 'SO', 'datacollect': 'DC'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码（禁 import 实现） ----
HC_ANIMALS = {'rabbit', 'cat', 'bear', 'dog', 'duck'}
# r51（SPEC-R51-HIDECUP §R2/§R3）四档章型域：hide 腿 c/s、hidedual 腿 dc/ds、hidetriple 腿 tc/ts
HC_CH = {1: dict(c=3, s=2), 2: dict(c=4, s=3),
         3: dict(c=4, s=4, dc=4, ds=4),
         4: dict(c=4, s=5, dc=4, ds=5, tc=4, ts=4)}
HC_KINDS3 = ['hide', 'hidedual', 'hide', 'hidedual', 'hide']           # dch3 谱（3 单+2 双）
HC_KINDS4 = ['hide', 'hidedual', 'hidetriple', 'hidedual', 'hide']     # dch4 谱（2 单+2 双+1 三）


def hc_kind_of(dch, qi):
    """r51 §R3 谱查位：dch1/2 无谱=全 hide；dch3/dch4 按 KINDS3/4"""
    if dch <= 2:
        return 'hide'
    return (HC_KINDS3 if dch == 3 else HC_KINDS4)[qi]
DC_CATS = {'rabbit', 'bird', 'cat', 'chick', 'sheep', 'duck'}
SO_LEN = {1: 3, 2: 4, 3: 5}                  # ch4=3-6 混合（r45 §R1 词域上探 6）
SO_DIST = {1: 0, 2: 1, 3: 2}                 # ch4=1-2
WRONG_WAIT = {'hidecup': 5450, 'sentorder': 6300, 'datacollect': 4450}
LB = {'hidecup': 5154, 'sentorder': 5994, 'datacollect': 4146}   # T11 下界（SPEC §4 独立验算）

def dch_reseed(flat, c):
    """生成关 dch 独立复算：mulberry32 标准算法 python 移植（从算法定义写，非抄实现）首随机数 ri(1,4)"""
    a = (flat * 7919 + c) & 0xFFFFFFFF
    a = (a + 0x6D2B79F5) & 0xFFFFFFFF
    t = a
    t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
    t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
    r = ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return 1 + int(r * 4)

def hc_answer(start, swaps):
    """SPEC §0.82 对账锚：answer=start 经 swaps 逐次互换推导（verify 独立复算）"""
    pos = start
    for a, b in swaps:
        if pos == a:
            pos = b
        elif pos == b:
            pos = a
    return pos


# ---------- m 批①（r25 审查 m2 挂账）：hidecup 40 关谱 Python 复刻（T12 对拍腿） ----------
# r51（SPEC-R51-HIDECUP §R3 取数时机逐位）：
# 种子 mulberry32(flat*7919+311) → [flat>=20: dch=ri(1,4)] → anim=池5 → [dch>=3:
# anim2 同掷取数+单次 +1 环取替换保≠anim] → [dch==4: anim3 同掷取数+while 环取
# 替换保∉{anim,anim2}] → 逐题 buildQuiz（hide: start=ri(0,c-1)→swaps；hidedual:
# startA=ri(0,c-1)+startB=ri(0,c-2) 压缩互异→swaps；hidetriple: startA/startB
# 同 dual+startC=rem[ri(0,c-3)] rem=[0,c)\{A,B}→swaps）；
# genSwaps 候选=行序全对 (a,b) a≠b，优先异集合，取 floor(rnd()*len)。
HC_ANIMALS_ORDER = ['rabbit', 'cat', 'bear', 'dog', 'duck']   # SPEC §0.82 动物池 5（序=取数域）
# r51：CH_CFG 即上方 HC_CH（SPEC-R51 §R2 真值表）

def hc_rng(seed):
    """mulberry32 全序列 python 移植（32 位乘后取低位=JS Math.imul 等价；口径同 dch_reseed）"""
    a = [seed & 0xFFFFFFFF]
    def rnd():
        a[0] = (a[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = a[0]
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd

def hc_gen_swaps(c, s, rnd):
    """SPEC §0.82 genSwaps：相邻两次换位至少一杯不同——异集合对优先，c=2 数值交替"""
    swaps = []
    prev = None
    norm = lambda p: (p[0], p[1]) if p[0] < p[1] else (p[1], p[0])
    for _ in range(s):
        allp = [[a, b] for a in range(c) for b in range(c) if a != b]
        cand = [p for p in allp if norm(p) != norm(prev)] if prev else allp
        if not cand:
            cand = [p for p in allp if not (p[0] == prev[0] and p[1] == prev[1])]
        p = cand[int(rnd() * len(cand))]
        swaps.append([p[0], p[1]])
        prev = p
    return swaps

def hc_build_quiz(dch, qi, rnd, anim, anim2, anim3):
    """SPEC-R51 §R3 buildQuiz：dch3/dch4 按 KINDS3/4[qi] 分腿（hide/hidedual/hidetriple）
    键序=JS 对象字面量序（JSON.stringify 对拍逐字节前提）"""
    cfg = HC_CH[dch]
    kind = hc_kind_of(dch, qi)
    if kind == 'hidetriple':
        c, s = cfg['tc'], cfg['ts']
        start_a = int(rnd() * c)
        start_b = int(rnd() * (c - 1))
        if start_b >= start_a:
            start_b += 1
        rem = [k for k in range(c) if k != start_a and k != start_b]
        start_c = rem[int(rnd() * len(rem))]
        swaps = hc_gen_swaps(c, s, rnd)
        aa, ab, ac = (hc_answer(start_a, swaps), hc_answer(start_b, swaps),
                      hc_answer(start_c, swaps))
        return {'kind': 'hidetriple', 'cups': c, 'swaps': swaps,
                'startA': start_a, 'startB': start_b, 'startC': start_c,
                'answerA': aa, 'answerB': ab, 'answerC': ac,
                'animA': anim, 'animB': anim2, 'animC': anim3, 'phase': 0,
                'start': start_a, 'answer': aa,
                'anim': anim, '_miss': 0, '_answered': False}
    if kind == 'hidedual':
        c, s = cfg['dc'], cfg['ds']
        start_a = int(rnd() * c)
        start_b = int(rnd() * (c - 1))
        if start_b >= start_a:
            start_b += 1
        swaps = hc_gen_swaps(c, s, rnd)
        return {'kind': 'hidedual', 'cups': c, 'swaps': swaps,
                'startA': start_a, 'startB': start_b,
                'answerA': hc_answer(start_a, swaps), 'answerB': hc_answer(start_b, swaps),
                'animA': anim, 'animB': anim2, 'phase': 0,
                'start': start_a, 'answer': hc_answer(start_a, swaps),
                'anim': anim, '_miss': 0, '_answered': False}
    c, s = cfg['c'], cfg['s']
    start = int(rnd() * c)
    swaps = hc_gen_swaps(c, s, rnd)
    return {'kind': 'hide', 'cups': c, 'start': start, 'swaps': swaps,
            'answer': hc_answer(start, swaps), 'anim': anim, '_miss': 0, '_answered': False}

def hc_gen_level(flat):
    """SPEC-BATCH34 §0.82 + SPEC-R51 §R3 genLevel：静态 20 关与生成关同一确定性通道
    取数时机（r51 §R3 逐位）：dch(flat≥20)→anim→anim2(dch≥3 单次+1 替换)→anim3(dch==4 while 替换)"""
    flat = max(0, int(flat))
    ch = flat // 5 + 1
    lv = flat % 5
    rnd = hc_rng(flat * 7919 + 311)
    dch = ((ch - 1) % 4 + 1) if flat < 20 else 1 + int(rnd() * 4)
    anim = HC_ANIMALS_ORDER[int(rnd() * len(HC_ANIMALS_ORDER))]
    anim2 = None
    if dch >= 3:
        anim2 = HC_ANIMALS_ORDER[int(rnd() * len(HC_ANIMALS_ORDER))]
        if anim2 == anim:
            anim2 = HC_ANIMALS_ORDER[(HC_ANIMALS_ORDER.index(anim) + 1) % 5]
    anim3 = None
    if dch == 4:
        anim3 = HC_ANIMALS_ORDER[int(rnd() * len(HC_ANIMALS_ORDER))]
        while anim3 == anim or anim3 == anim2:
            anim3 = HC_ANIMALS_ORDER[(HC_ANIMALS_ORDER.index(anim3) + 1) % 5]
    quizzes = [hc_build_quiz(dch, qi, rnd, anim, anim2, anim3) for qi in range(5)]
    return {'flat': flat, 'ch': ch, 'dch': dch, 'lv': lv, 'anim': anim, 'anim2': anim2,
            'anim3': anim3, 'quizzes': quizzes, 'step': 0, 'retries': 0, 'done': False}

def hc_spec_json(flat):
    """与页面 JSON.stringify(genLevel(flat)) 同构（键序=构造序，紧凑分隔符）"""
    return json.dumps(hc_gen_level(flat), separators=(',', ':'), ensure_ascii=False)

def hc_struct_bad(flat, L):
    """全 40 关结构对账（期望源=SPEC-R51 表+dch_reseed 首取数复算，禁读实现）"""
    ch_e, lv_e = flat // 5 + 1, flat % 5
    dch_e = (flat // 5 + 1) if flat < 20 else dch_reseed(flat, 311)
    if L.get('ch') != ch_e or L.get('lv') != lv_e or L.get('dch') != dch_e:
        return 'f%d 章号/档 %s/%s/%s exp %s/%s/%s' % (flat, L.get('ch'), L.get('lv'), L.get('dch'), ch_e, lv_e, dch_e)
    if L.get('anim') not in HC_ANIMALS:
        return 'f%d anim 越池' % flat
    if L.get('step') != 0 or L.get('retries') != 0 or L.get('done') is not False:
        return 'f%d 初始态脏' % flat
    if dch_e < 3 and L.get('anim2') is not None:
        return 'f%d dch%d anim2 非 null（rnd 序列被动）' % (flat, dch_e)
    if dch_e >= 3 and (L.get('anim2') not in HC_ANIMALS or L.get('anim2') == L.get('anim')):
        return 'f%d anim2 越池/同主' % flat
    if dch_e != 4 and L.get('anim3') is not None:
        return 'f%d 非dch4 anim3 非 null（rnd 序列被动）' % flat
    if dch_e == 4 and (L.get('anim3') not in HC_ANIMALS or
                      L.get('anim3') in (L.get('anim'), L.get('anim2'))):
        return 'f%d anim3 越池/撞主副' % flat
    for k, q in enumerate(L.get('quizzes') or []):
        kind_e = hc_kind_of(dch_e, k)
        if q.get('kind') != kind_e:
            return 'f%dq%d 谱位 kind=%s exp=%s' % (flat, k, q.get('kind'), kind_e)
        cfg = HC_CH[dch_e]
        leg = {'hide': ('c', 's'), 'hidedual': ('dc', 'ds'), 'hidetriple': ('tc', 'ts')}[kind_e]
        c_e, s_e = cfg[leg[0]], cfg[leg[1]]
        if q.get('cups') != c_e or len(q.get('swaps') or []) != s_e:
            return 'f%dq%d c/s %s/%s exp %s/%s' % (flat, k, q.get('cups'), len(q.get('swaps') or []), c_e, s_e)
        for j, (a, b) in enumerate(q['swaps']):
            if a == b or not (0 <= a < c_e and 0 <= b < c_e):
                return 'f%dq%d swap%d 非法' % (flat, k, j)
            if j and ((a, b) == tuple(q['swaps'][j - 1]) or
                      (c_e >= 3 and {a, b} == set(q['swaps'][j - 1]))):
                return 'f%dq%d swap%d 假换' % (flat, k, j)
        if kind_e == 'hide':
            if not (0 <= q.get('start', -1) < c_e):
                return 'f%dq%d start 域' % (flat, k)
            if q.get('answer') != hc_answer(q['start'], q['swaps']):
                return 'f%dq%d answer 对账错' % (flat, k)
            if q.get('anim') != L.get('anim'):
                return 'f%dq%d 非关主' % (flat, k)
        else:
            if kind_e == 'hidedual':
                starts = [q.get('startA', -1), q.get('startB', -1)]
                anims_e = [L.get('anim'), L.get('anim2')]
            else:                                          # hidetriple（仅 dch4 qi2）
                starts = [q.get('startA', -1), q.get('startB', -1), q.get('startC', -1)]
                anims_e = [L.get('anim'), L.get('anim2'), L.get('anim3')]
            if any(not (0 <= s < c_e) for s in starts) or len(set(starts)) != len(starts):
                return 'f%dq%d %s start %s' % (flat, k, kind_e, starts)
            answers = [hc_answer(s, q['swaps']) for s in starts]
            ans_keys = ['answerA', 'answerB'] + (['answerC'] if kind_e == 'hidetriple' else [])
            if any(q.get(ans_keys[i]) != answers[i] for i in range(len(answers))) \
                    or len(set(answers)) != len(answers):
                return 'f%dq%d %s answer 双射互异破' % (flat, k, kind_e)
            anim_keys = ['animA', 'animB'] + (['animC'] if kind_e == 'hidetriple' else [])
            if any(q.get(anim_keys[i]) != anims_e[i] for i in range(len(anims_e))):
                return 'f%dq%d %s 非主/副/三' % (flat, k, kind_e)
            if q.get('phase') != 0 or q.get('answer') != answers[0]:
                return 'f%dq%d %s phase/answer' % (flat, k, kind_e)
        if q.get('_miss') != 0 or q.get('_answered') is not False:
            return 'f%dq%d 初始态脏' % (flat, k)
    return None

async def wait_verify_title(pg):
    for _ in range(240):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t and t != 'VERIFY':
            return t
        await pg.wait_for_timeout(500)
    return ''

async def poll_step(pg, want, timeout=30000):
    # 三款 quiz.step=全关题号（SPEC §1-3 step 语义列——b33 坑① 家族对齐）
    src = '%s.currentLevel.step' % HOOK
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate(src)
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False

async def tap_retry(pg, expr, wants, timeout=16000):
    """统一重试驱动：evaluate expr→返回值在 wants 内即返回；吞（null/false）等 400ms 重试（上限覆盖演出+链窗）"""
    for _ in range(int(timeout / 400)):
        r = await pg.evaluate('(async () => { const r = await (%s); return r === null ? "null" : (r === false ? "false" : String(r)); })()' % expr)
        if r in wants:
            return r
        await pg.wait_for_timeout(400)
    return r

# ---------- T3 每题审计 ----------
async def q_hidecup(pg, flat, k, q, dch):
    if q.get('kind') not in ('hide', 'hidedual', 'hidetriple', None):   # [探针校准] r51 增 hidetriple
        return 'f%dq%d kind=%s' % (flat, k, q.get('kind'))
    kind = q.get('kind')
    kind_e = hc_kind_of(dch, k)
    if kind != kind_e:
        return 'f%dq%d 谱位 kind=%s exp=%s' % (flat, k, kind, kind_e)
    cfg = HC_CH[dch]
    # r51 四档按腿取域：hide c/s、hidedual dc/ds、hidetriple tc/ts
    leg = {'hide': ('c', 's'), 'hidedual': ('dc', 'ds'), 'hidetriple': ('tc', 'ts')}[kind_e]
    cups = cfg[leg[0]]
    nsw_want = cfg[leg[1]]
    cups_q, nsw = q.get('cups'), len(q.get('swaps') or [])
    if cups_q != cups:
        return 'f%dq%d ch%d%s cups=%s' % (flat, k, dch, kind_e, cups_q)
    if nsw != nsw_want:
        return 'f%dq%d ch%d%s swaps=%d' % (flat, k, dch, kind_e, nsw)
    for i, (a, b) in enumerate(q['swaps']):
        if a == b or not (0 <= a < cups_q and 0 <= b < cups_q):
            return 'f%dq%d swap%d=(%d,%d) 非法' % (flat, k, i, a, b)
        if i:
            pa, pb = q['swaps'][i - 1]
            # SPEC「禁回滚式假换」裁决：c=2 唯一解=数值交替（已随 r51 退役）；
            # r51 全档 c>=3：同集合相邻=真回滚拒，完全同序=同对重复拒
            if (a, b) == (pa, pb) or (cups_q >= 3 and {a, b} == {pa, pb}):
                return 'f%dq%d swap%d 回滚式假换' % (flat, k, i)
    if kind_e == 'hide':
        if q.get('anim') not in HC_ANIMALS:
            return 'f%dq%d anim=%s 越池' % (flat, k, q.get('anim'))
        if q['answer'] != hc_answer(q['start'], q['swaps']):
            return 'f%dq%d answer 对账错' % (flat, k)
        ans = hc_answer(q['start'], q['swaps'])
        r = await tap_retry(pg, '%s.tapCup(%d)' % (HOOK, ans), ('right', 'done'))
        return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    # ---- r51 多动物腿（hidedual dch3/4 qi1/3 两步 / hidetriple dch4 qi2 三步）----
    sk = ['startA', 'startB'] + (['startC'] if kind_e == 'hidetriple' else [])
    ak = ['answerA', 'answerB'] + (['answerC'] if kind_e == 'hidetriple' else [])
    starts = [q.get(s) for s in sk]
    if any(not (0 <= s < cups_q) for s in starts) or len(set(starts)) != len(starts):
        return 'f%dq%d %s start %s' % (flat, k, kind_e, starts)
    answers = [hc_answer(s, q['swaps']) for s in starts]
    if any(q.get(ak[i]) != answers[i] for i in range(len(answers))) or len(set(answers)) != len(answers):
        return 'f%dq%d %s answer %s' % (flat, k, kind_e, [q.get(a) for a in ak])
    if q.get('phase') != 0 or q['answer'] != answers[0]:   # 初始步=问 A；answer=当前步真值（动态口径）
        return 'f%dq%d %s phase=%s answer=%s' % (flat, k, kind_e, q.get('phase'), q['answer'])
    # 逐步驱动：tapCup(当前步真值)→'half'（phase 推进+answer 动态切）；末步 right/done
    for i, ans in enumerate(answers):
        last = i == len(answers) - 1
        wants = ('right', 'done') if last else ('half',)
        r = await tap_retry(pg, '%s.tapCup(%d)' % (HOOK, ans), wants)
        if r not in wants:
            return 'f%dq%d %s 步%d tap=%s' % (flat, k, kind_e, i + 1, r)
        if not last:
            q2 = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            if q2.get('phase') != i + 1 or q2.get('answer') != answers[i + 1]:
                return 'f%dq%d %s phase%d=%s answer=%s' % (flat, k, kind_e, i + 1,
                                                            q2.get('phase'), q2.get('answer'))
    return None

async def q_sentorder(pg, flat, k, q, dch):
    words, opts = q.get('words') or [], q.get('opts') or []
    picked = q.get('picked') or []
    L, d = len(words), len(opts) - len(words)
    if dch in (1, 2, 3):
        if L != SO_LEN[dch]:
            return 'f%dq%d ch%d L=%d' % (flat, k, dch, L)
        if d != SO_DIST[dch]:
            return 'f%dq%d ch%d d=%d' % (flat, k, dch, d)
    else:
        if L not in (3, 4, 5, 6) or d not in (1, 2):   # r45（SPEC-R45 §R1）：ch4 词域 3-5 → 3-6（六词句 s40）
            return 'f%dq%d ch4 L=%d d=%d' % (flat, k, L, d)
    ow = [o['w'] for o in opts]
    if len(ow) != L + d or len(set(ow)) != len(ow):
        return 'f%dq%d opts 重复/非全摆 %s' % (flat, k, ow)
    if not set(words) <= set(ow):
        return 'f%dq%d 本句词不全在池' % (flat, k)
    if picked:
        return 'f%dq%d 首题 picked 非空' % (flat, k)
    for i, w in enumerate(words):
        want = ('done' if i == L - 1 else 'fill')
        r = await tap_retry(pg, '%s.tapWord(%d)' % (HOOK, ow.index(w)), (want,))
        if r != want:
            return 'f%dq%d 词%d tap=%s' % (flat, k, i, r)
    return None

async def dc_solve_count(pg, q):
    for i in range(q['answer'] // 2):              # r14 一格=2 只：answer/2 格
        r = await tap_retry(pg, '%s.tapCell(%d)' % (HOOK, i), ('lit',))
        if r != 'lit':
            return 'tapCell(%d)=%s' % (i, r)
    return None


# r14 章型值域先验（SPEC §3-r14：全部偶数域；flat0 教学锚 crafted 豁免）
def dc_scene_ok(flat, dch, scene, scene1):
    ns = list(scene.values())
    if flat == 0:                                   # 教学锚 {rabbit:8, chick:10}
        return sorted(scene.items()) == [('chick', 10), ('rabbit', 8)] and scene1 is None
    if dch == 1:
        return len(ns) == 2 and all(10 <= v <= 20 and v % 2 == 0 for v in ns) and ns[0] != ns[1]
    if dch == 2:
        return (len(ns) == 2 and all(12 <= v <= 30 and v % 2 == 0 for v in ns) and
                ns[0] != ns[1] and abs(ns[0] - ns[1]) >= 4)
    if dch == 3:
        return (len(ns) == 3 and all(10 <= v <= 24 and v % 2 == 0 for v in ns) and
                len(set(ns)) == 3 and sum(ns) <= 60)
    # dch4：这次=survey2 偶 10-16 互异；上次=survey2∓Δ（Δ 偶 2-8 同向）
    cats = list(scene)
    if len(ns) != 2 or not all(10 <= v <= 16 and v % 2 == 0 for v in ns) or ns[0] == ns[1]:
        return False
    if not isinstance(scene1, dict) or set(scene1) != set(cats):
        return False
    ds = [scene[c] - scene1[c] for c in cats]
    return all(d != 0 and d % 2 == 0 and abs(d) in (2, 4, 6, 8) for d in ds) and         (ds[0] > 0) == (ds[1] > 0)                  # 同向


def dc_expect_answer(q):
    """数值题 answer 独立推导（SPEC §3-r14 运算定义——禁读 q.answer 当期望源）"""
    sc, s1 = q['scene'], q.get('scene1')
    kd = q['kind']
    if kd == 'sum':
        return sc[q['ask'][0]] + sc[q['ask'][1]]
    if kd == 'diff':
        return abs(sc[q['ask'][0]] - sc[q['ask'][1]])
    if kd == 'mostdiff':
        return max(sc.values()) - min(sc.values())
    if kd == 'change':
        return abs(sc[q['ask']] - s1[q['ask']])
    return sum(abs(sc[c] - s1[c]) for c in sc)      # totalchange


async def q_datacollect(pg, flat, k, q, dch):
    if q.get('kind') not in ('count', 'sum', 'diff', 'mostdiff', 'change', 'totalchange'):
        return 'f%dq%d kind=%s' % (flat, k, q.get('kind'))
    scene = q.get('scene') or {}
    cats = set(scene)
    if not cats or not cats <= DC_CATS:
        return 'f%dq%d scene 越池 %s' % (flat, k, sorted(cats))
    if not dc_scene_ok(flat, dch, scene, q.get('scene1')):
        return 'f%dq%d ch%d 值域 scene=%s s1=%s' % (flat, k, dch, sorted(scene.items()),
                                                    q.get('scene1') and sorted(q['scene1'].items()))
    if q['kind'] == 'count':
        ask = q.get('ask')
        if ask not in cats:
            return 'f%dq%d ask=%s 不在场景' % (flat, k, ask)
        if q['answer'] != scene[ask]:                 # 独立推导（禁读实现函数）
            return 'f%dq%d answer≠scene[ask]' % (flat, k)
        err = await dc_solve_count(pg, q)
        if err:
            return 'f%dq%d %s' % (flat, k, err)
        return None                                    # 点满 answer/2 格 900ms 待决窗自动 right 推进
    # 数值题（sum/diff/mostdiff/change/totalchange）：4 选 1 数值卡
    exp = dc_expect_answer(q)
    if q['answer'] != exp:
        return 'f%dq%d %s ans=%s exp=%s' % (flat, k, q['kind'], q['answer'], exp)
    opts = q.get('options') or []
    if len(opts) != 4 or len(set(opts)) != 4 or opts[q.get('answerIdx', -1)] != exp:
        return 'f%dq%d card 4 选 1 不自洽 %s' % (flat, k, opts)
    if any(v % 2 or not 2 <= v <= 60 for v in opts):
        return 'f%dq%d 卡值域 %s' % (flat, k, opts)
    if q['kind'] in ('change', 'totalchange'):        # dch4 同向 up 与真值一致
        s1 = q['scene1']
        ck = list(scene)
        upTrue = (scene[q['ask']] > s1[q['ask']]) if q['kind'] == 'change'             else (scene[ck[0]] > s1[ck[0]])
        if q.get('up') is not upTrue:
            return 'f%dq%d up 方向不自洽' % (flat, k)
    r = await tap_retry(pg, '%s.tapCard(%d)' % (HOOK, q['answerIdx']), ('right', 'done'))
    return None if r in ('right', 'done') else 'f%dq%d card tap=%s' % (flat, k, r)

QF = {'hidecup': q_hidecup, 'sentorder': q_sentorder, 'datacollect': q_datacollect}

async def audit_static(pg):
    bad = []
    for flat in range(20):
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(400)
        dch = await pg.evaluate('%s.currentLevel.dch' % HOOK)
        kinds = []
        for k in range(5):
            q = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            kinds.append(q.get('kind'))
            err = await QF[GAME](pg, flat, k, q, dch)
            if err:
                bad.append(err); break
            if k < 4:
                if not await poll_step(pg, k + 1):
                    bad.append('f%dq%d 未推进' % (flat, k)); break
        if len(bad) > 8:
            break
        # datacollect r14 章型题序关级对账（SPEC §3-r14：数值题恒居制表完成后）
        if GAME == 'datacollect':
            KS = {1: ['count'] * 5,
                  2: ['count'] * 3 + ['sum', 'diff'],
                  3: ['count'] * 3 + ['sum', 'mostdiff'],
                  4: ['count'] * 2 + ['change', 'change', 'totalchange']}
            if kinds != KS[dch]:
                bad.append('f%d ch%d 型 %s' % (flat, dch, kinds))
        # hidecup r51 谱关级对账（SPEC-R51 §R2：dch1/2 恒 5 hide、dch3 恰 3hide+2dual、dch4 恰 2hide+2dual+1triple）
        if GAME == 'hidecup':
            want_kinds = {1: ['hide'] * 5, 2: ['hide'] * 5, 3: HC_KINDS3, 4: HC_KINDS4}[dch]
            if kinds != want_kinds:
                bad.append('f%d ch%d 谱 %s' % (flat, dch, kinds))
    return bad

async def wrong_js(restart=True):
    if GAME == 'hidecup':
        # 错杯=answer 复算后的非答案杯（verify 独立推导）
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
                ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || q.answer === undefined) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const bad = [0,1,2].filter(i => i !== q.answer && i < q.cups)[0];'
                ' if (bad === undefined) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const r = await H.tapCup(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); } })()'
                ) % (HOOK, ('await H.start(10);' if restart else ''))
    if GAME == 'sentorder':
        # 错=干扰词（错因=wrong_word 路径）
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
                ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || !q.opts) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const ow = q.opts.map(o=>o.w); const bad = ow.findIndex(w => !q.words.includes(w));'
                ' if (bad < 0) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const r = await H.tapWord(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); } })()'
                ) % (HOOK, ('await H.start(10);' if restart else ''))
    # datacollect r14：数值题错卡（dcStartNumeric(6) 快进——flat6 dch2 首数值题=sum）
    return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,400));'
            ' const q = H.quiz; if (!q || !q.options) return "noquiz";'
            ' const bad = q.options.findIndex((v, i) => i !== q.answerIdx);'
            ' if (bad < 0) return "nobad";'
            ' const r = await H.tapCard(bad); return r === null ? "null" : (r === false ? "false" : String(r)); })()'
            ) % (HOOK, ('await H.dcStartNumeric(6);' if restart else ''))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_V)
        t1 = await wait_verify_title(pg)
        rec('T1 selftest 复跑', 'VERIFY PASS' in t1 and not errs, t1)
        await ctx.close()

        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_R)
        await pg.wait_for_timeout(3000)
        sv = await pg.evaluate("localStorage.getItem('%s')" % SAVEKEY)
        sv = json.loads(sv) if sv else None
        rec('T2 真实页预置存档 v1.0', bool(sv and sv.get('v') == '1.0'), 'v=%s' % (sv and sv.get('v')))
        await ctx.close()

        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        bad = await audit_static(pg)
        rec('T3 全量 SPEC 对账+驱动', not bad and not errs3, (bad[:6] or '') if bad else 'err=%s' % errs3[:2])

        gen = []
        for flat in range(20, 40):
            r = await pg.evaluate('%s.start(%d), %s.currentLevel.dch' % (HOOK, flat, HOOK))
            gen.append(r)
        # 生成关 dch 独立复算全序列对账（判别力>maxrun 形状启发式——hc seed 序列 7 连 3 是数学真值，实测复算 MATCH）
        SEEDC = {'hidecup': 311, 'sentorder': 601, 'datacollect': 809}
        exp = [dch_reseed(f, SEEDC[GAME]) for f in range(20, 40)]
        rec('T4 生成关 dch 独立复算对账+四型全现', gen == exp and set(gen) == {1, 2, 3, 4},
            'obs=%s exp_match=%s' % (gen, gen == exp))

        same = True
        for flat in (22, 27, 33, 39):
            a = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            c = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        # T6 返回值族+错选 wrong（datacollect 走数值题错卡——dcStartNumeric(6) 快进；hidecup 重试版=演出期 null 等到可交互落错）
        if GAME == 'datacollect':
            await pg.evaluate('%s.dcStartNumeric(6)' % HOOK)
        else:
            await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600)
        w1 = await pg.evaluate(await wrong_js(restart=False))
        m1 = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T6 错选 wrong+miss 计 1', w1 == 'wrong' and m1 == 1, 'r=%s miss=%s' % (w1, m1))
        await pg.wait_for_timeout(WRONG_WAIT[GAME])

        # T7 双错防重入（错链窗内二击**直点**被吞——不走重试版：重试会等过窗落第三错破坏语义，b33 T7 同构）
        await pg.evaluate('%s.start(10)' % HOOK)
        if GAME == 'hidecup':
            await pg.wait_for_timeout(8600)   # r51 flat10=dch3 hide 腿：亮相4300+换位4×700=2800+静止800+余量（40ms 内二击返 null 口径沿袭）
            dbl = ('(async()=>{const H=%s;const q=H.quiz;const bad=[0,1,2].filter(i=>i!==q.answer&&i<q.cups)[0];'
                   'const r=await H.tapCup(bad);return r===null?"null":String(r);})()' % HOOK)
        elif GAME == 'sentorder':
            dbl = ('(async()=>{const H=%s;const q=H.quiz;const bad=q.opts.map(o=>o.w).findIndex(w=>!q.words.includes(w));'
                   'const r=await H.tapWord(bad);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
        else:
            await pg.evaluate('%s.dcStartNumeric(6)' % HOOK)   # 快进数值题（r14 探针面）
            await pg.wait_for_timeout(400)
            dbl = ('(async()=>{const H=%s;const q=H.quiz;const bad=q.options.findIndex((v,i)=>i!==q.answerIdx);'
                   'const r=await H.tapCard(bad);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
        if dbl:
            d1 = await pg.evaluate(dbl)
            await pg.wait_for_timeout(40)
            d2 = await pg.evaluate(dbl)
            await pg.wait_for_timeout(WRONG_WAIT[GAME])
            m = await pg.evaluate('%s.quiz.miss' % HOOK)
            rec('T7 双错防重入 miss 只+1', d1 == 'wrong' and m == 1, 'd1=%s d2=%s miss=%s' % (d1, d2, m))
        else:
            rec('T7 双错防重入 miss 只+1', False, '待探针校准')

        # T8 星级三档（datacollect 错落数值题——dcStartNumeric(6) 快进前置）
        async def stars_after(nwrong):
            if GAME == 'datacollect':
                await pg.evaluate('%s.dcStartNumeric(6)' % HOOK)
            else:
                await pg.evaluate('%s.start(10)' % HOOK)
            await pg.wait_for_timeout(600)
            for _ in range(nwrong):
                await pg.evaluate(await wrong_js(restart=False))
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

        main_js = (BASE / GAME / '_src' / 'game-main.js').read_text(encoding='utf-8')
        data_js = (BASE / GAME / '_src' / 'game-data.js').read_text(encoding='utf-8')
        rec('T9 家族 A nextHint 双形态',
            re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js) is not None and
            re.search(r'nextHint\(\s*null\s*\)', main_js) is not None)
        rec('T9b 契约 K 面板守卫在场', "querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')" in main_js)

        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        hints = re.findall(r"hint:\s*'([^']+)'", data_js)
        ghints = re.findall(r'GEN_HINTS\s*=\s*\[([^\]]+)\]', data_js)
        gh = re.findall(r"'([^']+)'", ghints[0]) if ghints else []
        sem = (len(hints) == 4 and all(len(h) >= 4 for h in hints) and len(gh) == 4 and
               all(len(x) >= 4 for x in gh))
        genok = await pg.evaluate('[24,29,34,39].every(f => nextHint(f) === GEN_HINTS[genLevel(f+1).dch-1])')
        rec('T10 C7 预告在场+生成关实算', sem and genok, 'hints=%d gh=%d genok=%s' % (len(hints), len(gh), genok))
        await ctx.close()

        # T12（hidecup 专属，m 批① 立项 + r51 升格）：40 关谱 Python 复刻对拍——
        # r51 起全 40 关逐字节（页面 genLevel JSON 串 == Python 复刻串 = rnd 消耗
        # 序列+全部派生字段一致；r25 期仅 dch1-3 逐字节为「基线不动」主张，r51
        # 全档内容变化后升格全量）+全 40 关结构（章号/档/谱位/c/s/swap 形状/
        # answer=derive 复算/双·三动物互异/anim2·anim3 取数时机）
        if GAME == 'hidecup':
            ctx = await b.new_context()
            pg = await ctx.new_page()
            await pg.goto(URL_V)
            await wait_verify_title(pg)
            byte_bad, struct_bad = [], []
            for flat in range(40):
                page_js = await pg.evaluate('JSON.stringify(genLevel(%d))' % flat)
                py_js = hc_spec_json(flat)
                L = json.loads(page_js)
                why = hc_struct_bad(flat, L)
                if why:
                    struct_bad.append(why)
                if page_js != py_js:
                    byte_bad.append('f%d' % flat)
            rec('T12 hidecup 40 关谱 Python 对拍（全量逐字节）', not byte_bad and not struct_bad,
                '逐字节 %d/%d bad=%s; 结构 40 bad=%s' %
                (40 - len(byte_bad), 40, byte_bad[:4], struct_bad[:4]))
            await ctx.close()

        # T11 契约 I+N（静态；常量可为算术表达式——求和；sentorder 两级链取 max 落在实现单窗）
        vals = []
        for x in re.findall(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*([A-Za-z0-9_]+)', main_js):
            if x.isdigit():
                vals.append(int(x))
            else:
                c = re.search(r'\b%s\s*=\s*([\d+\s]+)' % re.escape(x), main_js) or \
                    re.search(r'\b%s\s*=\s*([\d+\s]+)' % re.escape(x), data_js)
                if c:
                    vals.append(sum(int(t) for t in c.group(1).split('+') if t.strip()))
        n_win = max(vals, default=0)
        guard = 'Date.now() < wrongChainUntil' in main_js
        reset = re.search(r'lastWrongVoice\s*=\s*0;\s*wrongChainUntil\s*=\s*0', main_js) is not None
        n_static = True
        for m in re.finditer(r'\{\s*key:\s*null[^}]*\}\s*(\S)', main_js):
            if m.group(1) != ']':
                n_static = False
        rec('T11 契约 I+N 豁免窗≥下界+keyless 恒尾', n_win >= LB[GAME] and guard and reset and n_static,
            'N=%d 下界=%d guard=%s reset=%s keyless静态=%s' % (n_win, LB[GAME], guard, reset, n_static))
        await b.close()
    fails = [n for n, ok in RES if not ok]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)

asyncio.run(main())
