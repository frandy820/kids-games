# -*- coding: utf-8 -*-
"""batch38 独立复验：stamp / libr / gear（断言从 SPEC-BATCH38 推导，期望值独立硬编码）
用法: python verify_batch38.py <stamp|libr|gear>
口径：verify 页 (?verify=1)；错链豁免窗内错点被吞——wrong 后等过窗再驱动：
     spm≈5100（=2016+150+2232+300=4698 占位实长）/ lb≈4500 / gr≈6200（v3 三链最长
     DIR_CHAIN_WIN 5538=2760+150+2328+300+缓冲——真时钟不随 SPEED 提速）
钩子形状（SPEC §1-3 v3；stamp/gear 2026-09-13 升档后实证，均含真实点击）：
  stamp  quiz={kind('next'|'fix'), unit('ABC'|'AABB'|'ABCC'|{colors[3],shapes[6]}), seq[](示范段图案 id),
              blank(当前判定格序号), picks[](印章盘 3-4), answer, step, miss, badIdx(ch4 错章位/-1),
              found(ch4 找错进度)}+扩展{say(任务框架句), blanks, scene}；
         tapStamp 枚举 stamped/fixed/done/wrong/null/false；tapCell 枚举 found/wrong/null/false
  libr   quiz={card, label, shelf[](格主题 id 2-4——实现自由排列), hint('none'|'farm'|'eat'|'pet'|'wear'), answer,
              step, miss}+扩展{say}；tapShelf 枚举 shelved/done/wrong/null
  gear   quiz={kind('dir'|'speed'|'conflict'), layout(记法原串), slots[]({i, fixed, gear(档id|'D'/'W'/'B'/null),
              teeth(数|null), dir, type('D'|'W'|'B'|'fix'|'blank'), meshed}), blank, picks[](齿数档 3),
              answer, need(档id), dteeth(驱动档), dirAns('cw'/'ccw'/'jam'/'small'/'same'), jam, phase(1|2),
              obs, step, miss}；tapDir 枚举 ok/wrong/false/null；tapGear 枚举 meshed/done/wrong/false/null；
              hook 另含 reread/autoSolve(两段式 taps=题数×2)
主线独立锚（v3）：stamp=双周期 python 独立复算（单属性 seq[blank%plen]；双属性
  colors[blank%3]+shapes[blank%6] 颜色/形状数组各自取模推导每空位真值）+ch4 错章位
  seeded 复算（mulberry32 消耗序镜像）+干扰章单属性恰满足验算/libr=§2 题表卡→主题对账/
  gear=§3 v3 三判据独立复算（dirAt k%2／conflict jam=(blank%2)!=((n-1-blank)%2) iff
  n 偶代数双验／speed dteeth==need?'same':'small'）+候选去恒等（|齿数差|∈{2,4}）+
  picks seeded 镜像（mulberry32 消耗序：生成关首数耗 dch+5 数耗抽序+每题打散 2 数）
"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'stamp': 'ST', 'libr': 'LB', 'gear': 'GR'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码（禁 import 实现） ----
WRONG_WAIT = {'stamp': 6400, 'libr': 4500, 'gear': 6200}   # gear v3：三链最长 5538+缓冲（真时钟）
LBWIN = {'stamp': 6066, 'libr': 4170, 'gear': 5538}          # T11 下界（SPEC §4 独立验算；gear v3=DIR 链）
SEEDC = {'stamp': 827, 'libr': 837, 'gear': 847}             # 三款均 seeded dch（§0.91-93）

# ---- stamp v3 SPEC 20 题全表（独立硬编码；§1 v3 升档定版 2026-09-13）----
# 单属性 (scene, kind, unit, period, seqLen)；双属性 (scene, kind, colors, shapes)——seqLen 恒 12
ST_SINGLE = [
    (0, 'next', 'ABC', 'FSH', 6), (1, 'next', 'ABC', 'FSH', 7),
    (2, 'next', 'ABC', 'SHO', 6), (3, 'next', 'ABC', 'SHO', 8),
    (4, 'next', 'ABC', 'HOF', 9),
    (5, 'next', 'AABB', 'FFSS', 8), (6, 'next', 'AABB', 'HHOO', 8),
    (7, 'next', 'ABCC', 'FHOO', 9), (8, 'next', 'AABB', 'OOFF', 8),
    (9, 'next', 'ABCC', 'SHOO', 10),
]
ST_DUAL = [
    (10, 'next', ['R', 'Y', 'B'], ['T', 'C', 'S', 'C', 'S', 'T']),
    (11, 'next', ['B', 'Y', 'R'], ['S', 'C', 'T', 'T', 'S', 'C']),
    (12, 'next', ['B', 'R', 'Y'], ['S', 'T', 'C', 'T', 'C', 'S']),
    (13, 'next', ['R', 'Y', 'B'], ['C', 'S', 'T', 'T', 'C', 'S']),
    (14, 'next', ['G', 'R', 'Y'], ['C', 'T', 'C', 'H', 'C', 'S']),
    (15, 'fix', ['Y', 'B', 'R'], ['C', 'S', 'T', 'S', 'T', 'C']),
    (16, 'fix', ['B', 'G', 'R'], ['S', 'C', 'T', 'T', 'C', 'C']),
    (17, 'fix', ['R', 'G', 'Y'], ['T', 'C', 'S', 'T', 'C', 'C']),
    (18, 'fix', ['G', 'Y', 'R'], ['C', 'S', 'T', 'C', 'C', 'T']),
    (19, 'fix', ['Y', 'B', 'G'], ['C', 'S', 'C', 'S', 'T', 'H']),
]
ST_POOL8 = ['RT', 'YC', 'BS', 'GH', 'RC', 'YS', 'BT', 'GC']
ST_MOTIF4 = ['F', 'S', 'H', 'O']
ST_COLOR_MATE = {'RT': 'RC', 'RC': 'RT', 'YC': 'YS', 'YS': 'YC',
                 'BS': 'BT', 'BT': 'BS', 'GC': 'GH', 'GH': 'GC'}
ST_SHAPE_MATE = {'RT': 'BT', 'BT': 'RT', 'YC': 'RC', 'RC': 'GC',
                 'GC': 'YC', 'BS': 'YS', 'YS': 'BS', 'GH': None}
ST_BAD_LO, ST_BAD_HI = 6, 10

def st_val(scene, c):
    """SPEC v3 真值律：单属性=period[c%plen]；双属性=colors[c%3]+shapes[c%6]（独立取模）"""
    if scene < 10:
        return ST_SINGLE[scene][3][c % len(ST_SINGLE[scene][3])]
    _, _, cols, shs = ST_DUAL[scene - 10]
    return cols[c % 3] + shs[c % 6]

def st_mirror(flat):
    """引擎 rnd 消耗序 python 镜像（seeded badIdx 复算——SPEC v3 引擎头声明消耗序）：
    genLevel：[flat≥20] dch 1 draw → [生成关] 5 draws 取题 → 逐题：
    scene<10：2 ri+shuffled(3)=4；scene10-14：shuffled(4)=3；scene15-19：badIdx 1 ri+shuffled(4)=4"""
    a = (flat * 7919 + 827) & 0xFFFFFFFF
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    def ri(lo, hi):
        return lo + int(rnd() * (hi - lo + 1))
    def shuffled(arr):
        b = list(arr)
        for i in range(len(b) - 1, 0, -1):
            j = int(rnd() * (i + 1))
            b[i], b[j] = b[j], b[i]
        return b
    if flat >= 20:
        dch = ri(1, 4)
        pool = list(range(0, 10)) if dch <= 2 else list(range(10, 20))
        scenes = [pool.pop(ri(0, len(pool) - 1)) for _ in range(5)]
    else:
        dch = flat // 5 + 1
        scenes = [(dch - 1) * 5 + (flat % 5 + k) % 5 for k in range(5)]
    out = []
    for s in scenes:
        if s < 10:
            ln = ST_SINGLE[s][4]
            truth = st_val(s, ln)
            rest = [m for m in ST_MOTIF4 if m != truth]
            d1 = rest.pop(ri(0, len(rest) - 1))
            d2 = rest.pop(ri(0, len(rest) - 1))
            picks = shuffled([truth, d1, d2])
            bad = -1
        else:
            bad = ri(ST_BAD_LO, ST_BAD_HI) if s >= 15 else -1
            truth = st_val(s, bad if s >= 15 else 12)
            cand = [truth, ST_COLOR_MATE[truth], ST_SHAPE_MATE[truth]]
            extra = next(x for x in ST_POOL8 if x not in cand)
            picks = shuffled(cand + [extra])
        out.append({'scene': s, 'badIdx': bad, 'picks': picks})
    return dch, out

def st_rowof(seq):
    """SPEC 反查：单属性全 seq 串唯一；双属性首组合周期（6 项=12 字符）唯一
    （ch4 含错章但首周期 0-5 恒真值——公平锚）"""
    full = ''.join(seq)
    for i, (_, _, _, period, ln) in enumerate(ST_SINGLE):
        if full == ''.join(period[c % len(period)] for c in range(ln)):
            return i
    for j, (_, _, cols, shs) in enumerate(ST_DUAL):
        pre = ''.join(cols[c % 3] + shs[c % 6] for c in range(6))
        if full[:len(pre)] == pre:
            return 10 + j
    return -1


# libr 题表 20 题照录（SPEC §2——卡→主题；冲突卡 hint 维度；主题 id：animal/food/clothes/vehicle
#   ——首跑主线笔误两处：cloth→clothes（实现 id）+⑬裙子 skirt 抄成 dress，均以实现 game-data.js 为真值源）
LB_BANK = [
    ('cat', 'animal', 'none'), ('apple', 'food', 'none'), ('cow', 'animal', 'none'),
    ('bread', 'food', 'none'), ('chick', 'animal', 'none'),
    ('goldfish', 'animal', 'none'), ('banana', 'food', 'none'), ('elephant', 'animal', 'none'),
    ('milk', 'food', 'none'), ('rabbit', 'animal', 'none'),
    ('coat', 'clothes', 'none'), ('car', 'vehicle', 'none'), ('skirt', 'clothes', 'none'),
    ('plane', 'vehicle', 'none'), ('cow', 'animal', 'farm'),
    ('egg', 'food', 'eat'), ('glove', 'clothes', 'none'), ('rabbit', 'animal', 'pet'),
    ('ship', 'vehicle', 'none'), ('scarf', 'clothes', 'wear'),
]
# gear v3（§3 2026-09-13 r3 升档定版）：齿数制 5 档+邻档干扰池+SPEC 20 题全表独立硬编码
# 布局记法：'D'=驱动轮(0 号恒 cw) / 'W'=风车(链尾) / 'B'=右手柄第二驱动(链尾，恒 cw——
# conflict 专用) / 'x'=固定轮(fixes 表给齿数档) / '_'=判定空槽(blank)
GR_TEETH = {'t8': 8, 't10': 10, 't12': 12, 't14': 14, 't16': 16}
GR_NEIGHBOR = {'t8': ('t10', 't12'), 't10': ('t8', 't12'), 't12': ('t10', 't14'),
               't14': ('t12', 't16'), 't16': ('t12', 't14')}   # 去恒等邻档池（差 2/4）
GR_SPEC = [
    dict(kind='dir', layout='D_W', blank=1, need='t10', fixes={}),
    dict(kind='dir', layout='Dx_W', blank=2, need='t12', fixes={1: 't10'}),
    dict(kind='dir', layout='D_W', blank=1, need='t14', fixes={}),
    dict(kind='dir', layout='Dx_W', blank=2, need='t8', fixes={1: 't16'}),
    dict(kind='dir', layout='D_W', blank=1, need='t12', fixes={}),
    dict(kind='dir', layout='Dx_W', blank=2, need='t10', fixes={1: 't14'}),
    dict(kind='dir', layout='D_xxW', blank=1, need='t16', fixes={2: 't8', 3: 't12'}),
    dict(kind='dir', layout='Dxxx_W', blank=4, need='t14', fixes={1: 't12', 2: 't8', 3: 't16'}),
    dict(kind='dir', layout='D_W', blank=1, need='t12', fixes={}),
    dict(kind='dir', layout='Dxx_W', blank=3, need='t8', fixes={1: 't12', 2: 't16'}),
    dict(kind='speed', layout='D_W', blank=1, need='t8', dteeth='t16', fixes={}),
    dict(kind='speed', layout='D_W', blank=1, need='t16', dteeth='t8', fixes={}),
    dict(kind='speed', layout='D_W', blank=1, need='t12', dteeth='t12', fixes={}),
    dict(kind='speed', layout='D_W', blank=1, need='t10', dteeth='t16', fixes={}),
    dict(kind='speed', layout='D_W', blank=1, need='t10', dteeth='t10', fixes={}),
    dict(kind='dir', layout='Dxx_W', blank=3, need='t12', fixes={1: 't8', 2: 't14'}),
    dict(kind='conflict', layout='D_xB', blank=1, need='t10', fixes={2: 't14'}),
    dict(kind='conflict', layout='Dxx_B', blank=3, need='t8', fixes={1: 't12', 2: 't16'}),
    dict(kind='conflict', layout='Dxxx_B', blank=4, need='t16', fixes={1: 't10', 2: 't8', 3: 't14'}),
    dict(kind='dir', layout='Dx_W', blank=2, need='t10', fixes={1: 't16'}),
]

def gr_mirror(flat):
    """gear v3 引擎 rnd 消耗序 python 镜像（seeded picks 复算）：
    genLevel：[flat≥20] dch 1 draw → 5 draws 无放回抽行 → 逐题 shuffled(3)=2 draws
    （静态关零前置消耗；picks=[need]+NEIGHBOR 打散——与引擎 buildQuiz 同构）"""
    a = (flat * 7919 + 847) & 0xFFFFFFFF
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    def ri(lo, hi):
        return lo + int(rnd() * (hi - lo + 1))
    def shuffled(arr):
        b = list(arr)
        for i in range(len(b) - 1, 0, -1):
            j = int(rnd() * (i + 1))
            b[i], b[j] = b[j], b[i]
        return b
    if flat >= 20:
        dch = ri(1, 4)
        pool = list(range((dch - 1) * 5, (dch - 1) * 5 + 5))
        rows = [pool.pop(ri(0, len(pool) - 1)) for _ in range(5)]
    else:
        dch = flat // 5 + 1
        rows = [(dch - 1) * 5 + (flat % 5 + k) % 5 for k in range(5)]
    out = []
    for ridx in rows:
        need = GR_SPEC[ridx]['need']
        picks = shuffled([need] + list(GR_NEIGHBOR[need]))
        out.append({'row': ridx, 'picks': picks, 'answer': picks.index(need)})
    return dch, out

def dch_reseed(flat, c):
    """生成关 dch 独立复算：mulberry32 标准算法 python 移植首随机数 ri(1,4)"""
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
    """统一重试驱动（400ms 间隔——b34 坑④；含 locked/尾窗 140ms 吞——b37 教训 null 重试）"""
    r = None
    for _ in range(int(timeout / 400)):
        r = await pg.evaluate('(async () => { const r = await (%s); return r === null ? "null" : (r === false ? "false" : String(r)); })()' % expr)
        if r in wants:
            return r
        await pg.wait_for_timeout(400)
    return r

# ---------- T3 每题审计 ----------
_MIRROR_CACHE = {}
_MIRROR_FN = {'stamp': st_mirror, 'gear': gr_mirror}
def mirror_of(flat):
    if flat not in _MIRROR_CACHE:
        _MIRROR_CACHE[flat] = _MIRROR_FN[GAME](flat)[1]   # [1]=逐题镜像列表（[0]=dch）
    return _MIRROR_CACHE[flat]

async def q_stamp(pg, flat, k, q, dch, mir=None):
    """SPEC v3 双周期律锚（独立复算禁抄实现）：真值=单属性 period[c%plen]／双属性
    colors[c%3]+shapes[c%6] 各自取模；seq 反查 SPEC 20 行全表定位（单全串/双 6 位
    前缀唯一）→ 行号落本章程；ch4：错章位 seeded 复算（mulberry32 消耗序镜像）+
    错章≠真值·其余格恒真值·badIdx∈[6,10]+找错门禁（未 found 点盘=null）；
    干扰章单属性验算（恰一属性同——单色对/单形对各≥1）；answer=独立推导真值
    在盘内唯一；驱动：ch4 先 tapCell(badIdx) found 再 tapStamp"""
    kind, seq, picks = q.get('kind'), q.get('seq') or [], q.get('picks') or []
    row = st_rowof(seq)
    if row < 0:
        return 'f%dq%d seq 反查失败 %s' % (flat, k, ''.join(seq))
    if row < (dch - 1) * 5 or row >= dch * 5:
        return 'f%dq%d 行%d 越章域 ch%d' % (flat, k, row, dch)
    scene = row
    if kind != ('next' if scene < 15 else 'fix'):
        return 'f%dq%d kind=%s 行%d' % (flat, k, kind, scene)
    if q.get('scene') != scene:
        return 'f%dq%d scene=%s≠反查行%d' % (flat, k, q.get('scene'), scene)
    m = (mir or mirror_of(flat))[k]        # seeded 镜像对账（picks 全序+badIdx）
    if m['scene'] != scene or m['picks'] != picks:
        return 'f%dq%d 镜像不符 %s/%s' % (flat, k, m['scene'], m['picks'])
    if q.get('blanks') != 1:
        return 'f%dq%d blanks=%s（v3 每题单判定）' % (flat, k, q.get('blanks'))
    if scene < 10:
        _, kspec, unit_s, period, ln = ST_SINGLE[scene]
        if q.get('unit') != unit_s:
            return 'f%dq%d unit=%s≠%s' % (flat, k, q.get('unit'), unit_s)
        if len(seq) != ln or len(seq) < 2 * len(period):
            return 'f%dq%d 示范段长 %d≠%d' % (flat, k, len(seq), ln)
        if len(picks) != 3:
            return 'f%dq%d 盘数 %d≠3' % (flat, k, len(picks))
        if q.get('blank') != ln:
            return 'f%dq%d blank=%s≠%d' % (flat, k, q.get('blank'), ln)
        exp = st_val(scene, ln)
    else:
        _, kspec, cols, shs = ST_DUAL[scene - 10]
        u = q.get('unit') or {}
        if u.get('colors') != cols or u.get('shapes') != shs:
            return 'f%dq%d unit 双数组不符' % (flat, k)
        if len(seq) != 12:
            return 'f%dq%d 双属性段长 %d' % (flat, k, len(seq))
        if len(picks) != 4:
            return 'f%dq%d 盘数 %d≠4' % (flat, k, len(picks))
        if all(shs[i] == shs[i + 3] for i in range(3)):
            return 'f%dq%d 形状周期塌缩（≠6）' % (flat, k)
        if kind == 'fix':
            bi = q.get('badIdx')
            if not (isinstance(bi, int) and ST_BAD_LO <= bi <= ST_BAD_HI):
                return 'f%dq%d badIdx=%s' % (flat, k, bi)
            if bi != m['badIdx']:
                return 'f%dq%d badIdx seeded 不符 %s≠%s' % (flat, k, bi, m['badIdx'])
            exp = st_val(scene, bi)
            if seq[bi] == exp:
                return 'f%dq%d 错章位=真值' % (flat, k)
            for i in range(12):
                if i != bi and seq[i] != st_val(scene, i):
                    return 'f%dq%d 格%d 非真值' % (flat, k, i)
            if q.get('blank') != bi:
                return 'f%dq%d fix blank=%s≠badIdx' % (flat, k, q.get('blank'))
            if q.get('found') is not False:
                return 'f%dq%d 找错期 found=%s' % (flat, k, q.get('found'))
            rg = await tap_retry(pg, '%s.tapStamp(0)' % HOOK, ('null',), timeout=4000)
            if rg != 'null':
                return 'f%dq%d 找错门禁 tap=%s' % (flat, k, rg)
            rf = await tap_retry(pg, '%s.tapCell(%d)' % (HOOK, bi), ('found',), timeout=8000)
            if rf != 'found':
                return 'f%dq%d tapCell=%s' % (flat, k, rf)
        else:
            if ''.join(seq) != ''.join(st_val(scene, i) for i in range(12)):
                return 'f%dq%d 双属性 seq 非真值串' % (flat, k)
            if q.get('blank') != 12:
                return 'f%dq%d blank=%s' % (flat, k, q.get('blank'))
            exp = st_val(scene, 12)
        # 干扰章单属性验算（ch3-4）：恰一属性同（单色对/单形对各≥1，余=双异 extra）
        cmate, smate = 0, 0
        for pk in picks:
            if pk == exp:
                continue
            cm, sm = pk[0] == exp[0], pk[1] == exp[1]
            if cm and sm:
                return 'f%dq%d 盘内重复真值 %s' % (flat, k, pk)
            if cm and not sm:
                cmate += 1
            elif sm and not cm:
                smate += 1
        if cmate < 1 or smate < 1:
            return 'f%dq%d 干扰章缺单属性对 单色%d/单形%d' % (flat, k, cmate, smate)
        if exp not in ST_POOL8:
            return 'f%dq%d 真值 %s 不在池' % (flat, k, exp)
    goods = [i for i, x in enumerate(picks) if x == exp]
    if len(goods) != 1:
        return 'f%dq%d 正确章非唯一 %s/%s' % (flat, k, picks, exp)
    if q.get('answer') != goods[0]:
        return 'f%dq%d answer≠唯一正确章' % (flat, k)
    wants = ('fixed', 'done') if kind == 'fix' else ('stamped', 'done')
    r = await tap_retry(pg, '%s.tapStamp(%d)' % (HOOK, goods[0]), wants)
    if r not in wants:
        return 'f%dq%d tap=%s' % (flat, k, r)
    return None

async def q_libr(pg, flat, k, q, dch, mir=None):
    """§2 题表锚：card→主题+hint 维度对账；shelf 格数按 ch（2/2/4/4）；answer=shelf.index(主题)"""
    card, shelf, hint = q.get('card'), q.get('shelf') or [], q.get('hint')
    ncells = {1: 2, 2: 2, 3: 4, 4: 4}[dch]
    if len(shelf) != ncells:
        return 'f%dq%d ch%d 格数=%d' % (flat, k, dch, len(shelf))
    rows = [r_ for r_ in LB_BANK if r_[0] == card]
    # 同 card 复现题（cow ch1 vs ch3 冲突/rabbit ch2 vs ch4 冲突）按 hint 维度区分
    rows = [r_ for r_ in rows if r_[2] == hint]
    if not rows:
        return 'f%dq%d card=%s hint=%s 不在 §2 表' % (flat, k, card, hint)
    theme = rows[0][1]
    if theme not in shelf:
        return 'f%dq%d 主题 %s 不在 shelf %s' % (flat, k, theme, shelf)
    if q.get('answer') != shelf.index(theme):
        return 'f%dq%d answer≠shelf.index(主题)' % (flat, k)
    r = await tap_retry(pg, '%s.tapShelf(%d)' % (HOOK, q.get('answer')), ('shelved', 'done'))
    return None if r in ('shelved', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_gear(pg, flat, k, q, dch, mir=None):
    """§3 v3 三判据独立复算（禁抄引擎 deriveDirAns/dirAt）：
    dir     dirAns = blank%2==0?'cw':'ccw'（驱动 0 号 cw，相邻反向交替）
    conflict jam    = (blank%2)!=((n-1-blank)%2)，代数双验 iff n 偶（双驱两端 cw）
    speed   dirAns  = dteeth==need?'same':'small'（角速度∝1/齿数——'big' 恒干扰）
    +SPEC 行镜像对账（kind/layout/blank/need/dteeth+章域）+槽位真值（D/B 恒 cw，
    fix/W=转向律，齿数对账）+候选去恒等（3 枚/need 恰 1/|齿数差|∈{2,4}/picks 全序镜像）
    +驱动两段：tapDir(dirAns)→'ok'→tapGear(answer)→meshed/done"""
    kind, layout, blank = q.get('kind'), q.get('layout'), q.get('blank')
    need, dteeth = q.get('need'), q.get('dteeth')
    dirAns, jam = q.get('dirAns'), q.get('jam')
    picks, slots = q.get('picks') or [], q.get('slots') or []
    m = (mir or mirror_of(flat))[k]
    row = GR_SPEC[m['row']]
    if kind != row['kind'] or layout != row['layout'] or blank != row['blank'] or need != row['need']:
        return 'f%dq%d SPEC 行不符 mirror=%d' % (flat, k, m['row'])
    if dteeth != row.get('dteeth', 't12'):
        return 'f%dq%d dteeth=%s≠%s' % (flat, k, dteeth, row.get('dteeth', 't12'))
    if not ((dch - 1) * 5 <= m['row'] < dch * 5):
        return 'f%dq%d 行%d 越章域 ch%d' % (flat, k, m['row'], dch)
    n = len(layout)
    # 阶段1 真值三判据（python 独立推导）
    if kind == 'speed':
        exp_ans = 'same' if dteeth == need else 'small'
    elif kind == 'conflict':
        jam_exp = (blank % 2) != ((n - 1 - blank) % 2)
        if jam_exp != (n % 2 == 0):
            return 'f%dq%d 冲突代数不自洽（n=%d）' % (flat, k, n)
        exp_ans = 'jam' if jam_exp else ('cw' if blank % 2 == 0 else 'ccw')
    else:
        exp_ans = 'cw' if blank % 2 == 0 else 'ccw'
    if dirAns != exp_ans:
        return 'f%dq%d dirAns=%s≠%s（%s）' % (flat, k, dirAns, exp_ans, kind)
    if jam != (exp_ans == 'jam'):
        return 'f%dq%d jam=%s≠%s' % (flat, k, jam, exp_ans == 'jam')
    # 候选去恒等（3 枚/need 恰 1/answer 唯一/齿数差邻档/picks 镜像全序）
    if len(picks) != 3 or picks.count(need) != 1:
        return 'f%dq%d 候选 %s 非去恒等' % (flat, k, picks)
    if q.get('answer') != picks.index(need):
        return 'f%dq%d answer≠indexOf(need)' % (flat, k)
    for p in picks:
        if p != need and abs(GR_TEETH[p] - GR_TEETH[need]) not in (2, 4):
            return 'f%dq%d 干扰 %s 齿数差 %d 非邻档' % (flat, k, p, abs(GR_TEETH[p] - GR_TEETH[need]))
    if m['picks'] != picks or m['answer'] != q.get('answer'):
        return 'f%dq%d picks 镜像不符 %s≠%s' % (flat, k, picks, m['picks'])
    # 槽位真值（布局域封闭+齿数+转向律；D/B 恒 cw，W/fix=dirAt(k)，blank 空槽）
    if len(slots) != n:
        return 'f%dq%d 槽数 %d≠%d' % (flat, k, len(slots), n)
    for s in slots:
        i, c = s.get('i'), layout[s.get('i', -1)] if s.get('i') is not None else '?'
        if c == '_':
            if i != blank or s.get('gear') is not None or s.get('dir') is not None:
                return 'f%dq%d 槽%d 非判定空槽' % (flat, k, i)
        elif c == 'D':
            if s.get('gear') != 'D' or s.get('dir') != 'cw' or s.get('teeth') != GR_TEETH[dteeth]:
                return 'f%dq%d D 槽不符' % (flat, k)
        elif c == 'B':
            if s.get('gear') != 'B' or s.get('dir') != 'cw' or s.get('teeth') != 12:
                return 'f%dq%d B 槽不符' % (flat, k)
        elif c == 'W':
            expd = 'cw' if i % 2 == 0 else 'ccw'
            if s.get('gear') != 'W' or s.get('dir') != expd or s.get('teeth') is not None:
                return 'f%dq%d W 槽 dir=%s≠%s' % (flat, k, s.get('dir'), expd)
        else:  # 'x' 固定轮（fixes 表给档）
            fx = row['fixes'].get(i)
            if not fx:
                return 'f%dq%d x 位 %d 无 fixes 档' % (flat, k, i)
            expd = 'cw' if i % 2 == 0 else 'ccw'
            if s.get('gear') != fx or s.get('teeth') != GR_TEETH[fx] or s.get('dir') != expd:
                return 'f%dq%d fix 槽 %d 不符（%s）' % (flat, k, i, fx)
    if q.get('phase') != 1:
        return 'f%dq%d phase=%s≠1（开题应处预判阶段）' % (flat, k, q.get('phase'))
    # 驱动两段：先答预判（tapDir 'ok'）→演出尾净过→再放对齿轮（meshed/done）
    r1 = await tap_retry(pg, '%s.tapDir("%s")' % (HOOK, exp_ans), ('ok',), timeout=12000)
    if r1 != 'ok':
        return 'f%dq%d tapDir=%s' % (flat, k, r1)
    await pg.wait_for_timeout(300)   # DIR_OK_MS*SPEED+140 演出尾（b37 教训 null 重试兜）
    r = await tap_retry(pg, '%s.tapGear(%d)' % (HOOK, q.get('answer')), ('meshed', 'done'), timeout=20000)
    return None if r in ('meshed', 'done') else 'f%dq%d tapGear=%s' % (flat, k, r)

QF = {'stamp': q_stamp, 'libr': q_libr, 'gear': q_gear}

async def audit_static(pg):
    bad = []
    # gear v3 全量 40 关（任务书：20 静态+20 生成×5 题封闭真值）；stamp/libr 静态 20 关
    for flat in range(40 if GAME == 'gear' else 20):
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(400)
        lv = json.loads(await pg.evaluate('JSON.stringify(%s.currentLevel)' % HOOK))
        dch = lv.get('dch')
        mir = mirror_of(flat) if GAME in _MIRROR_FN else None   # seeded 镜像（stamp/gear v3）
        for k in range(5):
            q = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            err = await QF[GAME](pg, flat, k, q, dch, mir)
            if err:
                bad.append(err); break
            if k < 4:
                if not await poll_step(pg, k + 1, timeout=90000):
                    bad.append('f%dq%d 未推进' % (flat, k)); break
        if len(bad) > 8:
            break
    return bad

async def wrong_js(restart=True):
    rst = 'await H.start(10);' if restart else ''
    if GAME == 'stamp':
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
                ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || !q.picks) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const bad = q.picks.findIndex((p, j) => j !== q.answer);'
                ' const r = await H.tapStamp(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
                ' return "noreach"; })()'
                ) % (HOOK, rst)
    if GAME == 'libr':
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
                ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || !q.shelf) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const bad = (q.shelf||[]).findIndex((s, j) => j !== q.answer);'
                ' const r = await H.tapShelf(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
                ' return "noreach"; })()'
                ) % (HOOK, rst)
    # gear v3 双答制：phase1 先答预判（tapDir dirAns→ok），再 phase2 错选尺寸（tapGear 干扰）
    return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
            ' for (let i = 0; i < 60; i++) { const q = H.quiz; if (!q || !q.picks) { await new Promise(w=>setTimeout(w,400)); continue; }'
            ' if (q.phase === 1) { const rd = await H.tapDir(q.dirAns);'
            '  if (rd === "ok") { await new Promise(w=>setTimeout(w,300)); continue; }'
            '  if (rd) return "dir:" + String(rd); await new Promise(w=>setTimeout(w,400)); continue; }'
            ' const bad = q.picks.findIndex((p, j) => j !== q.answer);'
            ' const r = await H.tapGear(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
            ' return "noreach"; })()'
            ) % (HOOK, rst)

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

        # T6：错选 wrong+miss 计 1
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600)
        w1 = await pg.evaluate(await wrong_js(restart=False))
        m1 = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T6 错选 wrong+miss 计 1', w1 == 'wrong' and m1 == 1, 'r=%s miss=%s' % (w1, m1))
        await pg.wait_for_timeout(WRONG_WAIT[GAME])

        # T7：双错防重入 miss 只+1（豁免窗内二击吞）——开题窗余量后单次直点
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600)
        await pg.wait_for_timeout(1500)     # 开题演出窗余量（题面句窗——三款同款点选结构）
        if GAME == 'stamp':
            dbl = ('(async()=>{const H=%s;const q=H.quiz;const bad=q.picks.findIndex((p,j)=>j!==q.answer);'
                   'const r=await H.tapStamp(bad);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
        elif GAME == 'libr':
            dbl = ('(async()=>{const H=%s;const q=H.quiz;const bad=(q.shelf||[]).findIndex((s,j)=>j!==q.answer);'
                   'const r=await H.tapShelf(bad);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
        else:
            # gear v3：首次调用 phase1→先答预判再错选；二调 phase2→直错选（豁免窗内吞）
            dbl = ('(async()=>{const H=%s;const q=H.quiz;'
                   'if(q.phase===1){const rd=await H.tapDir(q.dirAns);'
                   'if(rd!=="ok")return "dir:"+(rd===null?"null":(rd===false?"false":String(rd)));'
                   'await new Promise(w=>setTimeout(w,300));}'
                   'const bad=q.picks.findIndex((p,j)=>j!==q.answer);'
                   'const r=await H.tapGear(bad);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
        d1 = await pg.evaluate(dbl)
        await pg.wait_for_timeout(40)
        d2 = await pg.evaluate(dbl)
        await pg.wait_for_timeout(WRONG_WAIT[GAME])
        m = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T7 双错防重入 miss 只+1', d1 == 'wrong' and m == 1, 'd1=%s d2=%s miss=%s' % (d1, d2, m))

        # T8：星级三档（miss 口径：0=3★/2=2★/3=1★）
        async def stars_after(nwrong):
            await pg.evaluate('%s.start(10)' % HOOK)
            await pg.wait_for_timeout(600)
            for _ in range(nwrong):
                await pg.evaluate(await wrong_js(restart=False))
                await pg.wait_for_timeout(WRONG_WAIT[GAME])
            await pg.evaluate('%s.autoSolve()' % HOOK)
            for _ in range(150):
                st = await pg.evaluate('%s.currentLevel' % HOOK)
                if st['won']:
                    return st['stars']
                await pg.wait_for_timeout(500)
            return None
        s0, s2, s3 = await stars_after(0), await stars_after(2), await stars_after(3)
        rec('T8 星级三档', s0 == 3 and s2 == 2 and s3 == 1, '0错=%s 2错=%s 3错=%s' % (s0, s2, s3))

        # T12（stamp 专属）：ch4 找错修章 UI 链——点非错章 wrong+miss+found 不受影响
        # →点错章 found+suspect DOM 标记→修章 fixed+错章位替换正确章（Bloom 升档主路径）
        if GAME == 'stamp':
            await pg.evaluate('%s.start(15)' % HOOK)
            await pg.wait_for_timeout(800)
            qf = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            bi = qf.get('badIdx')
            exp15 = st_val(qf.get('scene', 15), bi)
            wc = (bi + 3) % 12                      # 非错章位（+3 mod 12 恒≠badIdx∈[6,10]）
            rw12 = await tap_retry(pg, '%s.tapCell(%d)' % (HOOK, wc), ('wrong',), timeout=8000)
            mw = await pg.evaluate('%s.quiz.miss' % HOOK)
            fw = await pg.evaluate('%s.quiz.found' % HOOK)
            await pg.wait_for_timeout(WRONG_WAIT[GAME])   # FIX_WRONG 窗 2316<5100 兜底过窗
            rf12 = await tap_retry(pg, '%s.tapCell(%d)' % (HOOK, bi), ('found',), timeout=8000)
            sus_n = await pg.evaluate("document.querySelectorAll('#strip .cell.suspect').length")
            # 修章断言须页内同 evaluate：tap 前捕获格引用（fixed 后下一题重渲 strip，
            # python 侧事后查询会拿到新题格子——game-verify ③ 同款引用捕获口径）
            r12d = await pg.evaluate(
                '(async () => { const c = document.querySelectorAll("#strip .cell")[%d];'
                ' let r = null;'
                ' for (let t = 0; t < 20; t++) { r = await %s.tapStamp(%d);'
                '  if (r === "fixed") break; await new Promise(w => setTimeout(w, 400)); }'
                ' return JSON.stringify({ r: String(r), stamped: c.classList.contains("stamped"),'
                '  motif: !!c.querySelector(\'svg[data-motif="%s"]\') }); })()' % (bi, HOOK, qf.get('answer'), exp15))
            r12j = json.loads(r12d or '{}')
            st12 = await pg.evaluate('%s.quiz.step' % HOOK)
            rec('T12 ch4 找错修章链', rw12 == 'wrong' and mw == 1 and fw is False and
                rf12 == 'found' and sus_n == 1 and
                r12j.get('r') == 'fixed' and r12j.get('stamped') and r12j.get('motif') and
                st12 == 1,
                'rw=%s miss=%s found=%s rf=%s sus=%s r=%s stamped=%s motif=%s step=%s' %
                (rw12, mw, fw, rf12, sus_n, r12j.get('r'), r12j.get('stamped'),
                 r12j.get('motif'), st12))
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
        # libr 题级 hint 枚举字段撞章预告 hint 名（'none' 恰 4 字符过长度滤）——枚举黑名单排除
        hints = [h for h in hints if h not in ('none', 'farm', 'eat', 'pet', 'wear')]
        ghints = re.findall(r'GEN_HINTS\s*=\s*\[([^\]]+)\]', data_js)
        gh = re.findall(r"'([^']+)'", ghints[0]) if ghints else []
        sem = (len(hints) == 4 and all(len(h) >= 4 for h in hints) and len(gh) == 4 and
               all(len(x) >= 4 for x in gh))
        genok = await pg.evaluate('[24,29,34,39].every(f => nextHint(f) === GEN_HINTS[genLevel(f+1).dch-1])')
        rec('T10 C7 预告在场+生成关实算', sem and genok, 'hints=%d gh=%d genok=%s' % (len(hints), len(gh), genok))
        await ctx.close()

        # T11：契约 I+N 豁免窗≥下界+keyless 恒尾
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
        chain_calc = True
        if GAME == 'gear':
            # v3 三链常量（data 独立硬编码；chainWin 三元在 main 解析不出数值→直接抽常量）
            # +三算式恒等（错 clip+150+hint 2328+300 / 首错锁=clip+150——b37 R3 口径）
            cw = dict((kk, int(vv)) for kk, vv in re.findall(
                r'\b(WRONG_CHAIN_WIN|DIR_CHAIN_WIN|SPEED_CHAIN_WIN|WRONG_LOCK_1|DIR_LOCK_1|SPEED_LOCK_1)'
                r'\s*=\s*(\d+)', data_js))
            for nm in ('WRONG_CHAIN_WIN', 'DIR_CHAIN_WIN', 'SPEED_CHAIN_WIN'):
                vals.append(cw.get(nm, 0))
            n_win = max(vals, default=0)
            chain_calc = (cw.get('WRONG_CHAIN_WIN') == 2184 + 150 + 2328 + 300 and
                          cw.get('DIR_CHAIN_WIN') == 2760 + 150 + 2328 + 300 and
                          cw.get('SPEED_CHAIN_WIN') == 2664 + 150 + 2328 + 300 and
                          cw.get('WRONG_LOCK_1') == 2184 + 150 and
                          cw.get('DIR_LOCK_1') == 2760 + 150 and
                          cw.get('SPEED_LOCK_1') == 2664 + 150)
        guard = 'Date.now() < wrongChainUntil' in main_js
        reset = re.search(r'lastWrongVoice\s*=\s*0;\s*wrongChainUntil\s*=\s*0', main_js) is not None
        n_static = True
        for m in re.finditer(r'\{\s*key:\s*null[^}]*\}\s*(\S)', main_js):
            if m.group(1) != ']':
                n_static = False
        rec('T11 契约 I+N 豁免窗≥下界+keyless 恒尾', n_win >= LBWIN[GAME] and guard and reset and n_static and chain_calc,
            'N=%d 下界=%d guard=%s reset=%s keyless静态=%s 算式=%s' % (n_win, LBWIN[GAME], guard, reset, n_static, chain_calc))
        await b.close()
    fails = [n for n, ok in RES if not ok]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)

asyncio.run(main())
