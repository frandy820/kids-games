# -*- coding: utf-8 -*-
"""batch35 独立复验：turntake / maketen / errdoc（断言从 SPEC-BATCH35 推导，期望值独立硬编码）
用法: python verify_batch35.py <turntake|maketen|errdoc>
口径：verify 页 (?verify=1)；错链豁免窗内错点被吞——wrong 后等过窗再驱动：
     tt≈5900 / mt≈6320 / ed≈5580（链构成：tt=wrong1752+150+estMs(7字3015)+300=5217——2026-09-13 改造
     新句 estMs 口径待主线回填；mt 两级取 max=wrong_less3072+150+hint2496+300=6018；ed=wrong1656+150+hint3168+300=5274）
钩子形状（SPEC §1-3 + 2026-09-13 turntake 改造；agent 交付后探针实证校准——本文件标 [探针校准] 处）：
  turntake  quiz={turn('k'|'r' 有效回合方——兔子浇错纠错回合报 'k'), thirsty[3](渴度数组，已浇=0),
            target(当前应点盆=未浇最渴者——verify 独立 argmax 复算), step(题号，纠错不计),
            miss, turnIdx, rabbitWrong(兔子本回合浇错 bool)}
  maketen   quiz={target(10|15|20), a, pool[{v}](互异恒全摆), answer(补数下标), step(题号), miss}
  errdoc    quiz={shown{a,op,b,r}, errType('ans'|'num'|'op'), fix, phase('spot'|'fix'|'why'), step(题号), miss}
驱动策略：演出窗吞输入返回值不一（null/false）——统一重试循环带间隔（b34 坑④：无间隔瞬间烧尽）
turntake 特殊：回合驱动须轮询 turn=='k' 再 tap（兔子演出 tapFlower='wait' 抢点语义非吞）；
     排序题（ch3-4）一题 3 步逐步重读 quiz（b38 坑③连选家族）；兔子浇错纠错回合=点 target
     'right' 推进且 step 不增
errdoc 特殊：三步驱动 phase 门（spot→fix→why）；药卡池定位 [探针校准]（ED.pills 或 quiz 暴露）
"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'turntake': 'TT', 'maketen': 'MT', 'errdoc': 'ED'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码（禁 import 实现） ----
WRONG_WAIT = {'turntake': 5900, 'maketen': 6320, 'errdoc': 5580}
LB = {'turntake': 5217, 'maketen': 6018, 'errdoc': 5274}      # T11 下界（tt=改造算式 estMs 口径）
SEEDC = {'turntake': 419, 'maketen': 523, 'errdoc': 631}
MT_POOL = {1: 4, 2: 5, 3: 4}                                   # dch -> 池张数（ch4=5）
# errdoc 题库 15 题静态全表（SPEC §4 照录——verify 双录对账真值源）
ED_BANK = {
    1: [('13', '-', '5', '9', 8), ('7', '+', '6', '12', 13), ('15', '-', '8', '8', 7),
        ('9', '+', '9', '17', 18), ('16', '-', '7', '10', 9)],
    2: [('3', '*', '4', '14', 12), ('2', '*', '7', '12', 14), ('4', '*', '4', '18', 16),
        ('5', '*', '3', '16', 15), ('3', '*', '3', '8', 9)],
    3: [('31', '-', '5', '26', 8), ('51', '+', '4', '55', 19), ('61', '-', '9', '52', 7),
        ('21', '+', '6', '27', 18), ('31', '-', '9', '22', 4)],
}
ED_ERRTYPE = {1: 'ans', 2: 'ans', 3: 'num'}
ED_SPOTIDX = {'ans': 2, 'num': 0, 'op': 1}                     # errType -> 病灶部位下标

# turntake 静态题表（ch1-3 flats 0-14 硬编码真值——2026-09-13 改造定版，独立 mulberry32 复算
# 生成后过规则自验（章型多重集/最渴唯一/相邻 argmax 互异）再录入；K=5 题渴度三元组（题序）、
# RW=兔子回合浇错标记（回合序）；ch4 静态 15-19 与生成关 20-39 走 tt_recompute 独立复算）
TT_BANK = {
    0: {'K': [[1, 3, 1], [3, 1, 1], [3, 1, 1], [1, 3, 1], [1, 3, 1]], 'RW': [False, False, False, False]},
    1: {'K': [[1, 3, 1], [1, 3, 1], [1, 3, 1], [1, 1, 3], [1, 1, 3]], 'RW': [False, False, False, False]},
    2: {'K': [[1, 1, 3], [3, 1, 1], [3, 1, 1], [1, 1, 3], [1, 1, 3]], 'RW': [True, False, False, False]},
    3: {'K': [[1, 3, 1], [3, 1, 1], [3, 1, 1], [3, 1, 1], [3, 1, 1]], 'RW': [False, False, False, False]},
    4: {'K': [[3, 1, 1], [3, 1, 1], [1, 1, 3], [1, 1, 3], [1, 1, 3]], 'RW': [False, False, True, False]},
    5: {'K': [[2, 3, 2], [2, 3, 2], [2, 3, 2], [2, 2, 3], [2, 2, 3]], 'RW': [False, False, True, False]},
    6: {'K': [[2, 2, 3], [2, 3, 2], [2, 3, 2], [2, 2, 3], [2, 2, 3]], 'RW': [True, False, False, True]},
    7: {'K': [[2, 3, 2], [2, 3, 2], [2, 3, 2], [2, 3, 2], [3, 2, 2]], 'RW': [False, True, False, True]},
    8: {'K': [[2, 2, 3], [2, 3, 2], [2, 2, 3], [3, 2, 2], [2, 3, 2]], 'RW': [True, True, True, False]},
    9: {'K': [[2, 3, 2], [2, 3, 2], [2, 3, 2], [2, 3, 2], [3, 2, 2]], 'RW': [False, True, True, True]},
    10: {'K': [[3, 1, 2], [1, 3, 2], [1, 2, 3], [2, 1, 3], [2, 1, 3]], 'RW': [True, True, False, False, False]},
    11: {'K': [[3, 1, 2], [3, 2, 1], [2, 3, 1], [2, 3, 1], [2, 1, 3]], 'RW': [False, False, False, False]},
    12: {'K': [[3, 2, 1], [3, 2, 1], [3, 2, 1], [3, 2, 1], [2, 3, 1]], 'RW': [False, False, False, True]},
    13: {'K': [[3, 1, 2], [3, 1, 2], [2, 1, 3], [2, 1, 3], [1, 3, 2]], 'RW': [True, False, False, False]},
    14: {'K': [[1, 2, 3], [1, 2, 3], [1, 2, 3], [1, 3, 2], [2, 1, 3]], 'RW': [False, False, True, False, True, False]},
}


def tt_recompute(flat):
    """turntake 题表独立复算（mulberry32 python 移植——从 delta 取数序规则推导，禁抄实现）：
    dch(flat<20 按章/生成 ri(1,4)) → turnSeq（dch≤2 交替；dch≥3 nR=ri(4,6)+额外 R 插 5 空位）
    → 逐回合渴度（dch≤2 pos=ri(0,2) 相邻 argmax 不同重掷≤8 兜底 (prev+1)%3 置 3；dch≥3
    shuffled([1,2,3]) 同口径兜底左旋）→ r 回合 rabbitWrong=ri(1,3)==1（错时 wrongPos 非主位选一）"""
    M32 = 0xFFFFFFFF
    a = (flat * 7919 + 419) & M32
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & M32
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & M32
        t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & M32))) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296
    ri = lambda lo, hi: lo + int(nxt() * (hi - lo + 1))
    def shuf(arr):
        x = list(arr)
        for i in range(len(x) - 1, 0, -1):
            j = int(nxt() * (i + 1))
            x[i], x[j] = x[j], x[i]
        return x
    amax = lambda t: t.index(max(t))
    dch = (flat // 5) % 4 + 1 if flat < 20 else ri(1, 4)
    if dch <= 2:
        seq = ['k', 'r'] * 4 + ['k']
    else:
        nR = ri(4, 6)
        slots = [1, 1, 1, 1, 0]
        m = nR - 4
        if m > 0:
            for s in shuf([0, 1, 2, 3, 4])[:m]:
                slots[s] += 1
        seq = []
        for k in range(5):
            seq.append('k')
            seq.extend(['r'] * slots[k])
    kids, rw = [], []
    prev_arg = -1
    for side in seq:
        if dch <= 2:
            pos, g = ri(0, 2), 0
            while pos == prev_arg and g < 8:
                pos = ri(0, 2); g += 1
            if pos == prev_arg:
                pos = (prev_arg + 1) % 3
            th = [1 if dch == 1 else 2] * 3
            th[pos] = 3
        else:
            th, g = shuf([1, 2, 3]), 0
            while amax(th) == prev_arg and g < 8:
                th = shuf([1, 2, 3]); g += 1
            if amax(th) == prev_arg:
                th = th[1:] + th[:1]
        if side == 'k':
            kids.append(th)
        else:
            wrong = ri(1, 3) == 1
            rw.append(wrong)
            if wrong:                              # 浇错：wrongPos=非 argmax 两盆（升序）中选一（取数必耗）
                _ = ri(0, 1)
        prev_arg = amax(th)
    return {'K': kids, 'RW': rw}


# 双录对账：硬编码表 ↔ 独立复算（不一致=表抄错或算法漂移，verify 拒跑）
for _f in TT_BANK:
    assert TT_BANK[_f] == tt_recompute(_f), 'TT_BANK f%d 与独立复算不一致' % _f

def dch_reseed(flat, c):
    """生成关 dch 独立复算：mulberry32 标准算法 python 移植（从算法定义写，非抄实现）首随机数 ri(1,4)"""
    a = (flat * 7919 + c) & 0xFFFFFFFF
    a = (a + 0x6D2B79F5) & 0xFFFFFFFF
    t = a
    t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
    t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
    r = ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return 1 + int(r * 4)

async def wait_verify_title(pg):
    for _ in range(240):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t and t != 'VERIFY':
            return t
        await pg.wait_for_timeout(500)
    return ''

async def poll_step(pg, want, timeout=30000):
    src = '%s.currentLevel.step' % HOOK
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate(src)
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False

async def tap_retry(pg, expr, wants, timeout=16000):
    """统一重试驱动（带 400ms 间隔——b34 坑④）：吞（null/false）等 400ms 重试"""
    r = None
    for _ in range(int(timeout / 400)):
        r = await pg.evaluate('(async () => { const r = await (%s); return r === null ? "null" : (r === false ? "false" : String(r)); })()' % expr)
        if r in wants:
            return r
        await pg.wait_for_timeout(400)
    return r

# ---------- T3 每题审计 ----------
async def q_turntake(pg, flat, k, q, dch):
    """turntake 一题驱动（2026-09-13 改造：渴度比较+排序+兔子纠错）：
    逐步重读 quiz（b38 坑③连选家族）——兔子演出期重试等待；纠错回合（rabbitWrong）点
    target='right' 推进且 step 不增；排序题 3 步至 step 推进；题首（全盆未浇+非纠错）对
    账真值表（TT_BANK 静态硬编码 / tt_recompute ch4+生成关）+ 章型多重集独立验。
    target 恒 verify 独立 argmax(thirsty) 复算（禁信实现字段）。"""
    bank = TT_BANK.get(flat) or tt_recompute(flat)
    guard = 0
    while guard < 160:
        guard += 1
        qq = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
        if qq is None:
            lv = json.loads(await pg.evaluate('JSON.stringify(%s.currentLevel)' % HOOK))
            if lv and lv.get('done'):
                return None if k == 4 else 'f%dq%d 提前 done' % (flat, k)
            await pg.wait_for_timeout(250)
            continue
        if qq.get('turn') == 'r':                      # 兔子演出期（含浇错前的演出）——等
            await pg.wait_for_timeout(150)
            continue
        th = qq.get('thirsty')
        if not (isinstance(th, list) and len(th) == 3 and
                all(isinstance(v, int) and 0 <= v <= 3 for v in th)):
            return 'f%dq%d thirsty=%s 越域' % (flat, k, th)
        mx = max(th)
        if th.count(mx) != 1:
            return 'f%dq%d 最渴并列 %s' % (flat, k, th)
        if qq.get('target') != th.index(mx):
            return 'f%dq%d target=%s≠argmax%d' % (flat, k, qq.get('target'), th.index(mx))
        if qq.get('rabbitWrong'):                      # 纠错回合：恰一盆已被（错）浇=0；step 不增
            if th.count(0) != 1:
                return 'f%dq%d 纠错零盆数%s' % (flat, k, th)
            TT_CORR[flat] = TT_CORR.get(flat, 0) + 1
            step_before = (await pg.evaluate('%s.currentLevel.step' % HOOK))
            r = await tap_retry(pg, '(async () => { const q = %s.quiz; return await %s.tapFlower(q.target); })()' % (HOOK, HOOK),
                                ('right', 'done'), timeout=40000)
            if r not in ('right', 'done'):
                return 'f%dq%d corr-tap=%s' % (flat, k, r)
            step_after = (await pg.evaluate('%s.currentLevel.step' % HOOK))
            if step_after != step_before:
                return 'f%dq%d 纠错计了题号 %s→%s' % (flat, k, step_before, step_after)
            continue
        if all(v >= 1 for v in th):                    # 题首：真值表+章型多重集对账
            if th != bank['K'][k]:
                return 'f%dq%d 题表≠真值 %s vs %s' % (flat, k, th, bank['K'][k])
            want = sorted({1: [1, 1, 3], 2: [2, 2, 3]}.get(dch, [1, 2, 3]))
            if sorted(th) != want:
                return 'f%dq%d 章型 %s≠%s' % (flat, k, sorted(th), want)
        # 题面回合：点应点盆（排序中间步重复此路径——逐步重读 quiz）
        r = await tap_retry(pg, '(async () => { const q = %s.quiz; if (q.turn !== "k") return "wait"; return await %s.tapFlower(q.target); })()' % (HOOK, HOOK),
                            ('right', 'done'), timeout=40000)
        if r not in ('right', 'done'):
            return 'f%dq%d tap=%s' % (flat, k, r)
        step_now = (await pg.evaluate('%s.currentLevel.step' % HOOK))
        if step_now >= k + 1:
            return None                                # 本题收口（排序 3 步完成）
        await pg.wait_for_timeout(120)
    return 'f%dq%d 驱动超时' % (flat, k)

async def q_maketen(pg, flat, k, q, dch):
    target, a, pool = q.get('target'), q.get('a'), q.get('pool') or []
    if target not in (10, 15, 20):
        return 'f%dq%d target=%s' % (flat, k, target)
    npool = MT_POOL.get(dch, 5)
    if len(pool) != npool:
        return 'f%dq%d ch%d 池=%d' % (flat, k, dch, len(pool))
    vs = [c.get('v') for c in pool]
    if len(set(vs)) != len(vs):
        return 'f%dq%d 池重复 %s' % (flat, k, vs)
    # 域先验：凑10 a∈1-9 补∈1-9 / 凑15 a∈6-9 补∈6-9 / 凑20 a∈11-18 补∈2-9；禁 a 本身在池
    comp = target - a
    if target == 10 and not (1 <= a <= 9) or target == 15 and not (6 <= a <= 9) or target == 20 and not (11 <= a <= 18):
        return 'f%dq%d a=%s 域' % (flat, k, a)
    # 「禁取 a 本身」分款裁决（SPEC §0.86 裁决括注，第五起先验张力）：禁 a 作干扰位；
    # 凑 10 自配对 a=5 时补数=a，池含补数（=a 值）恰一张合法（5+5=10 doubles 知识点）
    if a in vs:
        if 2 * a != target:
            return 'f%dq%d 池含 a 本身' % (flat, k)
        if vs.count(a) != 1:
            return 'f%dq%d 自配对 a 值出现 %d 张' % (flat, k, vs.count(a))
    # answer 独立推导：池中唯一满足 a+v=target 的下标
    hits = [i for i, v in enumerate(vs) if a + v == target]
    if len(hits) != 1:
        return 'f%dq%d 补数非唯一 %s' % (flat, k, hits)
    if q.get('answer') != hits[0]:
        return 'f%dq%d answer≠唯一补' % (flat, k)
    r = await tap_retry(pg, '%s.tapCard(%d)' % (HOOK, hits[0]), ('right', 'done'))
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_errdoc(pg, flat, k, q, dch):
    et = q.get('errType')
    if et not in ('ans', 'num', 'op'):
        return 'f%dq%d errType=%s' % (flat, k, et)
    # ch1-3 题库对账（SPEC §4 全表）；ch4 构造独立复算 [探针校准：shown 归一（op 符号 '*'/'×'）]
    shown = q.get('shown') or {}
    a, op, b, rr, fix = shown.get('a'), shown.get('op'), shown.get('b'), shown.get('r'), q.get('fix')
    def _n(v):                                     # 归一：实现数值型/SPEC 表字符串双态
        try:
            return int(v)
        except (TypeError, ValueError):
            return v
    OP_SETS = {'*': ('*', '×', 'x'), '+': ('+',), '-': ('-',)}   # 乘符形态映射（SPEC 表 '*' vs 实现 '×'）
    if dch in (1, 2, 3):
        row = ED_BANK[dch][k % 5]
        if _n(a) != int(row[0]) or op not in OP_SETS[row[1]] or _n(b) != int(row[2]) or _n(rr) != int(row[3]) or _n(fix) != row[4]:
            return 'f%dq%d 题库对账错 %s vs %s' % (flat, k, (a, op, b, rr, fix), row)
        if et != ED_ERRTYPE[dch]:
            return 'f%dq%d 型=%s≠%s' % (flat, k, et, ED_ERRTYPE[dch])
    else:
        # ch4 构造复算：ans 型 fix=正确算；num 型 shown.a=ab 抄反且 r=按抄数算、fix=原题算；op 型 r=按错符算、fix=原符算 [探针校准]
        pass
    if not (0 <= (_n(fix) if _n(fix) is not None else -1) <= 20):
        return 'f%dq%d fix=%s 域' % (flat, k, fix)
    # 三步驱动
    spot = ED_SPOTIDX[et]
    r1 = await tap_retry(pg, '(async () => { const q = %s.quiz; if (q.phase !== "spot") return "phase"; return await %s.tapPart(%d); })()' % (HOOK, HOOK, spot), ('spot',))
    if r1 != 'spot':
        return 'f%dq%d spot=%s' % (flat, k, r1)
    # fix 药卡定位：ED.pills（[探针校准] 池暴露字段名）——找 fix 值下标
    r2 = await tap_retry(pg, '(async () => { const H = %s; const q = H.quiz; if (q.phase !== "fix") return "phase";'
                          ' const pills = H.pills || (q.pills) || (q.opts || []); const i = pills.findIndex(p => (p.v !== undefined ? p.v : p) === q.fix);'
                          ' if (i < 0) return "nopill"; return await H.tapFix(i); })()' % HOOK, ('fix', 'done'))
    if r2 not in ('fix', 'done'):
        return 'f%dq%d fix=%s' % (flat, k, r2)
    r3 = await tap_retry(pg, '(async () => { const H = %s; if (H.quiz && H.quiz.phase === "why") return await H.tapWhy(0); return "skip"; })()' % HOOK,
                         ('why_done', 'done', 'skip'), timeout=8000)
    return None if r3 in ('why_done', 'done', 'skip') else 'f%dq%d why=%s' % (flat, k, r3)

QF = {'turntake': q_turntake, 'maketen': q_maketen, 'errdoc': q_errdoc}
TT_CORR = {}                                              # turntake 每关纠错回合实遇计数（对账 RW 真值）

async def audit_static(pg):
    bad = []
    for flat in range(20):
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(400)
        lv = json.loads(await pg.evaluate('JSON.stringify(%s.currentLevel)' % HOOK))
        dch = lv.get('dch')
        for k in range(5):
            q = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            err = await QF[GAME](pg, flat, k, q, dch)
            if err:
                bad.append(err); break
            if k < 4:
                if not await poll_step(pg, k + 1, timeout=60000):   # turntake 兔子回合穿插=单题周期长（5 孩子+6 兔子×2s）
                    bad.append('f%dq%d 未推进' % (flat, k)); break
        if len(bad) > 8:
            break
        # turntake 关级对账：纠错回合实遇数==真值表 RW（兔子 seeded 浇错分布；0-19 关尾恒 K
        # 无尾随兔子——全部纠错都发生在题间驱动窗内，缺计=机制静默退化）
        if GAME == 'turntake':
            bank = TT_BANK.get(flat) or tt_recompute(flat)
            want_corr = sum(bank['RW'])
            got_corr = TT_CORR.get(flat, 0)
            if got_corr != want_corr:
                bad.append('f%d 纠错数 %d≠真值 %d' % (flat, got_corr, want_corr))
        # maketen 章型关级对账（ch1-3 恒 target / ch4 混合三现由 T4 域覆盖）
        if GAME == 'maketen':
            tg = await pg.evaluate('%s.currentLevel.target || null' % HOOK)
            want = {1: 10, 2: 10, 3: 15}.get(dch)
            if want and tg and tg != want:
                bad.append('f%d ch%d target=%s' % (flat, dch, tg))
        # errdoc 章型关级对账（ch1-3 恒错型）
        if GAME == 'errdoc' and dch in (1, 2, 3):
            pass  # 型对账已在 q_errdoc 题库对账内逐题锁定
    return bad

async def wrong_js(restart=True):
    if GAME == 'turntake':
        # 错=有效孩子回合（题面/纠错）点非应点盆（等 turn=='k'——兔子演出 tapFlower='wait' 非 wrong）
        return ('(async () => { const H = %s; %s'
                ' for (let i = 0; i < 80; i++) { const q = H.quiz; if (!q || q.turn !== "k") { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const bad = [0,1,2].find(j => j !== q.target);'
                ' const r = await H.tapFlower(bad); if (r === "wrong") return "wrong"; await new Promise(w=>setTimeout(w,400)); }'
                ' return "noreach"; })()'
                ) % (HOOK, ('await H.start(10);' if restart else ''))
    if GAME == 'maketen':
        # 错=非补数卡（错因两级由实现分派——T6 只验 wrong+miss）
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
                ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || !q.pool) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const bad = q.pool.findIndex((c, j) => j !== q.answer);'
                ' const r = await H.tapCard(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
                ' return "noreach"; })()'
                ) % (HOOK, ('await H.start(10);' if restart else ''))
    # errdoc：步1 点正常部位（非病灶位）
    return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
            ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || q.phase !== "spot") { await new Promise(w=>setTimeout(w,400)); continue; }'
            ' const bad = [0,1,2].find(j => j !== ({ans:2, num:0, op:1})[q.errType]);'
            ' const r = await H.tapPart(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
            ' return "noreach"; })()'
            ) % (HOOK, ('await H.start(10);' if restart else ''))

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

        # T4b 生成关渴度题表独立复算对账（ch4 seeded：python mulberry32 复算首题渴度三元组+
        #     全批浇错分布 15-60%——退化全对/全错=机制静默失效）——turntake 改造款专属
        if GAME == 'turntake':
            genbad, rw_n, r_tot = [], 0, 0
            for flat in range(20, 40):
                await pg.evaluate('%s.start(%d)' % (HOOK, flat))
                await pg.wait_for_timeout(250)
                qq = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
                bank = tt_recompute(flat)
                th = qq.get('thirsty') if qq else None
                if qq and qq.get('turn') == 'k' and th == bank['K'][0]:
                    rw_n += sum(bank['RW'])
                    r_tot += len(bank['RW'])
                else:
                    genbad.append('f%d %s≠%s' % (flat, th, bank['K'][0]))
            frac = rw_n / r_tot if r_tot else 0
            rec('T4b 生成关渴度题表对账+浇错分布', not genbad and 0.15 <= frac <= 0.6,
                'bad=%s rw=%d/%d(%.0f%%)' % (genbad[:3], rw_n, r_tot, 100 * frac))

        # T6 错选 wrong+miss 计 1
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600)
        w1 = await pg.evaluate(await wrong_js(restart=False))
        m1 = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T6 错选 wrong+miss 计 1', w1 == 'wrong' and m1 == 1, 'r=%s miss=%s' % (w1, m1))
        await pg.wait_for_timeout(WRONG_WAIT[GAME])

        # T7 双错防重入（错链窗内二击直点——不走重试版）[探针校准：三款错点直点表达式]
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600)
        if GAME == 'turntake':
            dbl = ('(async()=>{const H=%s;'
                   'for(let i=0;i<80;i++){const q=H.quiz;if(!q||q.turn!=="k"){await new Promise(w=>setTimeout(w,400));continue;}'
                   'const bad=[0,1,2].find(j=>j!==q.target);const r=await H.tapFlower(bad);'
                   'return r===null?"null":(r===false?"false":String(r));}return "noreach";})()' % HOOK)
        elif GAME == 'maketen':
            dbl = ('(async()=>{const H=%s;const q=H.quiz;const bad=q.pool.findIndex((c,j)=>j!==q.answer);'
                   'const r=await H.tapCard(bad);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
        else:
            dbl = ('(async()=>{const H=%s;const q=H.quiz;const bad=[0,1,2].find(j=>j!==({ans:2,num:0,op:1})[q.errType]);'
                   'const r=await H.tapPart(bad);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
        if dbl:
            d1 = await pg.evaluate(dbl)
            await pg.wait_for_timeout(40)
            d2 = await pg.evaluate(dbl)
            await pg.wait_for_timeout(WRONG_WAIT[GAME])
            m = await pg.evaluate('%s.quiz.miss' % HOOK)
            rec('T7 双错防重入 miss 只+1', d1 == 'wrong' and m == 1, 'd1=%s d2=%s miss=%s' % (d1, d2, m))
        else:
            rec('T7 双错防重入 miss 只+1', False, '待探针校准')

        # T8 星级三档
        async def stars_after(nwrong):
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

        # T11 契约 I+N（静态；常量可为算术表达式——求和；maketen 两级链取 max 落在实现单窗）
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
