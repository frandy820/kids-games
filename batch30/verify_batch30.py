# -*- coding: utf-8 -*-
"""batch30 独立复验：babylove / storybed / maze（断言从 SPEC-BATCH30 推导，期望值独立硬编码）
用法: python verify_batch30.py <babylove|storybed|maze>
口径：verify 页 (?verify=1) 引擎同作用域；tapX 均 async；等待窗按 SPEC 实长表（错链豁免窗内输入被吞——
     wrong 后必须等过窗再驱动：bab≈7000/stb≈6500/maz≈7400；storybed 逐点反馈窗=步实长+300→步间 2300）。
字段口径（探针实证 2026-09-10）：
  babylove quiz={kind('findmom'|'findbaby'),ask(动物 id),opts[{anim}],answer,step,miss}——findmom ask=幼体答成体/findbaby ask=成体答幼体
  storybed quiz={flow,steps[{stepId,text,done}],answer(当前应做 stepId),phase,miss}——tapCard 返回 step/right/done/wrong/null
  maze quiz={maze{size,walls,key,door,entry,goal},pos{r,c},hasKey,step,miss}——tapCell(r,c) 返回 moved/back/right/done/wrong/null
  T8 currentLevel={won,stars}（b29 校准口径）"""
import asyncio, io, os, re, sys, json
from collections import deque
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'babylove': 'BL', 'storybed': 'SB', 'maze': 'MZ'}[GAME]
TAP = {'babylove': 'tapOpt', 'storybed': 'tapCard', 'maze': 'tapCell'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码表（禁 import 实现） ----
MOM = {'tadpole': 'frog', 'caterpillar': 'butterfly', 'chick': 'hen',
       'puppy': 'dog', 'kitten': 'cat', 'calf': 'cow',
       'fishfry': 'fish', 'duckling': 'duck', 'grub': 'beetle',
       'lamb': 'sheep', 'piglet': 'pig', 'foal': 'horse'}   # §0.73 r10 配对封闭 12（幼体→成体）
BABY = {v: k for k, v in MOM.items()}
ALL_ADULT = set(MOM.values())
ALL_BABY = set(MOM)
CONF = {'tadpole': 'fishfry', 'fishfry': 'tadpole',
        'caterpillar': 'grub', 'grub': 'caterpillar'}       # r10 近形干扰对
GROWTH = {'frog': ['egg_frog', 'tadpole', 'frog'],
          'butterfly': ['egg_butterfly', 'caterpillar', 'butterfly'],
          'beetle': ['egg_beetle', 'grub', 'beetle'],
          'fish': ['egg_fish', 'fishfry', 'fish'],
          'hen': ['egg_hen', 'chick', 'hen'],
          'duck': ['egg_duck', 'duckling', 'duck']}         # r10 发育链 6（卵→幼→成）
HAB = {}
for _b, _h in {'tadpole': 'water', 'fishfry': 'water', 'duckling': 'water',
               'caterpillar': 'forest', 'grub': 'forest', 'chick': 'grass',
               'puppy': 'grass', 'kitten': 'grass', 'calf': 'grass',
               'lamb': 'grass', 'piglet': 'grass', 'foal': 'grass'}.items():
    HAB[_b] = _h
    HAB[MOM[_b]] = _h
HABS = {'water', 'forest', 'grass'}
FLOWS = {                                                        # §0.74 流程封闭 6×4 步（与 SPEC 表严格一致）
    'sleep': ['刷牙', '洗脸', '穿睡衣', '上床睡觉'],
    'getup': ['睁开眼睛', '穿衣', '刷牙', '吃早餐'],
    'washhand': ['卷起袖子', '冲湿小手', '搓搓泡泡', '擦干小手'],
    'eat': ['洗手', '坐坐好', '吃饭饭', '擦擦嘴巴'],
    'out': ['穿衣服', '穿鞋子', '背小书包', '出门玩'],
    'bath': ['脱衣服', '冲冲水', '搓搓澡', '擦干穿衣'],
}
# 错链=wrong clip+150+语义句 clip 实长+300（家族 I/J；T46 阶段2 2026-09-19 语义句 clip 化——
# 下界从 estMs 字数口径改按 clip 实长推导，ffprobe=SPEC_DUR 口径：bab_again_mom 2904 /
# stb_g_wrong 3120 / maze hint 族沿用 estMs(9)（救援重读句未 clip 化，非本波点位））
CHAIN = {
    'babylove': (1656 + 150 + 2904 + 300, ['再看看它的妈妈长什么样', '再看看这个宝宝是谁',
                                           '再想想长大的顺序', '再看看它住在哪里']),
    'storybed': (2496 + 150 + 3120 + 300, ['再想想现在做哪一件事', '这一步不在这个流程里',
                                           '再看看少了哪一步']),   # r10 三句族（T46 clip 实长 3120/2880/2592）
    'maze':     (2664 + 150 + (345 * 9 + 600) + 300, ['看看旁边能走的格子', '先找钥匙哦']),
}
WRONG_WAIT = {'babylove': 7000, 'storybed': 7500, 'maze': 7400}   # 错链窗+余量（窗内驱动会被吞；r10 stb 三句族最长 6996）

async def wait_verify_title(pg):
    for _ in range(90):
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
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate('%s.quiz.step' % HOOK)
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False

async def tap(pg, arg):
    if GAME == 'maze':
        return await pg.evaluate('(async () => %s.tapCell(%d, %d))()' % (HOOK, arg[0], arg[1]))
    return await pg.evaluate('(async () => %s.%s(%d))()' % (HOOK, TAP, arg))

def bfs_grid(size, wallset, a, b, block=frozenset()):
    """python 侧独立 BFS：a→b 最短路（不含 a 含 b）；不可达 None"""
    q, seen, prev = deque([a]), {a}, {a: None}
    while q:
        cur = q.popleft()
        if cur == b:
            path = []
            while cur != a:
                path.append(cur); cur = prev[cur]
            return list(reversed(path))
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nxt = (cur[0] + dr, cur[1] + dc)
            if not (0 <= nxt[0] < size and 0 <= nxt[1] < size):
                continue
            if nxt in wallset or nxt in block or nxt in seen:
                continue
            seen.add(nxt); prev[nxt] = cur; q.append(nxt)
    return None

# ---------- T3 每题/每局审计 ----------
async def q_babylove(pg, flat, k, q, dch):
    """r10 每题 3 步/小问：逐步读 quiz 实算 answer 点对（SPEC 步级独立对账）
    findmom ask=幼体答成体/findbaby ask=成体答幼体（dch≥2 近形伴在场恰 1）
    /grow 逐点 answer=chain[s]/habitat (hab×stage) 2×2——tapOpt 期望 step×2→right/done"""
    for s in range(3):
        q = json.loads(await pg.evaluate('JSON.stringify(BL.quiz)'))
        if not q or q['step'] != k:
            return 'f%dq%d step 错位' % (flat, k)
        kind, ask = q['kind'], q['ask']
        anims = [o['anim'] for o in q['opts']]
        if kind == 'findmom':
            want, pool = MOM.get(ask), ALL_ADULT
            if want is None or not set(anims) <= pool or len(anims) != 4 or len(set(anims)) != 4:
                return 'f%dq%ds%d findmom 域 %s/%s' % (flat, k, s, ask, anims)
            if q['answer'] != anims.index(want):
                return 'f%dq%ds%d findmom answer' % (flat, k, s)
        elif kind == 'findbaby':
            want, pool = BABY.get(ask), ALL_BABY
            if want is None or not set(anims) <= pool or len(anims) != 4 or len(set(anims)) != 4:
                return 'f%dq%ds%d findbaby 域 %s/%s' % (flat, k, s, ask, anims)
            if q['answer'] != anims.index(want):
                return 'f%dq%ds%d findbaby answer' % (flat, k, s)
            if dch >= 2 and CONF.get(want) and CONF[want] not in anims:
                return 'f%dq%ds%d findbaby 近形缺伴 %s' % (flat, k, s, want)
        elif kind == 'grow':
            chain = GROWTH.get(ask)
            if not chain or sorted(anims) != sorted(chain) or anims[q['answer']] != chain[s]:
                return 'f%dq%ds%d grow 链/answer %s' % (flat, k, s, ask)
        elif kind == 'habitat':
            if ask not in HABS or len(anims) != 4 or len(set(anims)) != 4:
                return 'f%dq%ds%d habitat 域 %s' % (flat, k, s, ask)
            is_mom = q.get('want') == 'mom'
            same = [a for a in anims if HAB.get(a) == ask]
            stg = [a for a in anims if (a in ALL_ADULT) == is_mom]
            truth = [a for a in anims if HAB.get(a) == ask and (a in ALL_ADULT) == is_mom]
            if len(same) != 2 or len(stg) != 2 or len(truth) != 1 or anims[q['answer']] != truth[0]:
                return 'f%dq%ds%d habitat 2x2 %s' % (flat, k, s, ask)
        else:
            return 'f%dq%d kind=%s' % (flat, k, kind)
        exp = 'step' if s < 2 else ('done' if k == 4 else 'right')
        r = await tap(pg, q['answer'])
        if r != exp:
            return 'f%dq%ds%d tap=%s 期望 %s' % (flat, k, s, r, exp)
        await pg.wait_for_timeout(120)
    return None

async def q_storybed(pg, flat, k, q, dch):
    """r10 三题型独立驱动（SPEC §0.74+§6）：order=canonical 前缀序（依赖图下恒合法）/
    rain=out 5 步含伞按依赖序（伞插穿衣后）/miss=点池内唯一本流程真值卡
    池复算：ch1=4（flat0q0=3 教学特例）/ch2=4+1 干扰/ch3=rain 5+order 4+1/ch4=候选 4=真值+3 干扰"""
    kind = q.get('kind', 'order')
    flow = q['flow']
    if flow not in FLOWS:
        return 'f%dq%d flow=%s 出封闭表' % (flat, k, flow)
    steps4 = FLOWS[flow]
    texts = [s['text'] for s in q['steps']]
    ids = [s['stepId'] for s in q['steps']]
    n = len(texts)
    if len(set(texts)) != n:
        return 'f%dq%d 池重复 %s' % (flat, k, texts)
    ext = [t for t, sid in zip(texts, ids) if sid.split('_')[0] != flow]
    if kind == 'miss':                                # ch4：链缺 1 步，候选 4=真值+3 干扰
        if n != 4 or len(ext) != 3:
            return 'f%dq%d miss 池=%d ext=%d' % (flat, k, n, len(ext))
        if set(ext) & set(steps4):
            return 'f%dq%d miss 干扰∈本流程 %s' % (flat, k, ext)
        idx = next(i for i, sid in enumerate(ids) if sid.split('_')[0] == flow)
        r = await tap(pg, idx)                        # 点真值卡=一次补对
        if r not in ('right', 'done'):
            return 'f%dq%d miss 真值 tap=%s' % (flat, k, r)
        await pg.wait_for_timeout(2300)
        return None
    if kind == 'rain':                                # ch3 条件分支：out 4 步+带小伞
        if flow != 'out' or n != 5 or ext or texts.count('带小伞') != 1:
            return 'f%dq%d rain 结构 n=%d ext=%d' % (flat, k, n, len(ext))
        if set(t for t in texts if t != '带小伞') != set(steps4):
            return 'f%dq%d rain 流程步集 %s' % (flat, k, texts)
        order = ['穿衣服', '带小伞', '穿鞋子', '背小书包', '出门玩']   # 依赖合法变通序（§6.2）
        for si, st in enumerate(order):
            idx = next((i for i, s in enumerate(q['steps']) if s['text'] == st), -1)
            if idx < 0:
                return 'f%dq%d rain 池缺 %s' % (flat, k, st)
            r = await tap(pg, idx)
            last = si == len(order) - 1
            if last and r not in ('right', 'done'):
                return 'f%dq%d rain 末步 tap=%s' % (flat, k, r)
            if not last and r != 'step':
                return 'f%dq%d rain 步%d(%s) tap=%s' % (flat, k, si, st, r)
            await pg.wait_for_timeout(2300)
        return None
    # order：canonical 前缀序（步骤固有号 0..n-1——依赖表下恒合法）
    want_n = 3 if (flat == 0 and k == 0) else 4
    want_d = 1 if dch in (2, 3) else 0
    if len(ext) != want_d or len(texts) != want_n + want_d:
        return 'f%dq%d order 池=%d ext=%d (want %d+%d)' % (flat, k, n, len(ext), want_n, want_d)
    if set(ext) & set(steps4):
        return 'f%dq%d order 干扰∈本流程 %s' % (flat, k, ext)
    want = steps4[:want_n]
    for si, st in enumerate(want):                    # 逐点驱动（步间=步音反馈窗）
        idx = next((i for i, s in enumerate(q['steps']) if s['text'] == st), -1)
        if idx < 0:
            return 'f%dq%d 池缺 %s' % (flat, k, st)
        r = await tap(pg, idx)
        last = si == len(want) - 1
        if last and r not in ('right', 'done'):
            return 'f%dq%d 末步 tap=%s' % (flat, k, r)
        if not last and r != 'step':
            return 'f%dq%d 步%d tap=%s' % (flat, k, si, r)
        await pg.wait_for_timeout(2300)
    return None

async def q_maze(pg, flat, gidx, q, dch):
    mz = q['maze']
    size, walls = mz['size'], mz.get('walls') or []
    entry = (mz['entry']['r'], mz['entry']['c'])
    goal = (mz['goal']['r'], mz['goal']['c'])
    wallset = set((w['r'], w['c']) if isinstance(w, dict) else tuple(w) for w in walls)
    if dch == 1 and size != 5:
        return 'f%d g%d ch1 size=%s' % (flat, gidx, size)
    if dch in (2, 3) and size != 7:
        return 'f%d g%d ch%d size=%s' % (flat, gidx, dch, size)
    if dch == 4 and size not in (5, 7):
        return 'f%d g%d ch4 size=%s' % (flat, gidx, size)
    maxw = 4 if size == 5 else 10
    if len(wallset) > maxw:
        return 'f%d g%d 障碍=%d>%d' % (flat, gidx, len(wallset), maxw)
    key, door = mz.get('key'), mz.get('door')
    if (key is None) != (door is None):
        return 'f%d g%d 钥匙门不对称' % (flat, gidx)
    if dch == 3 and key is None:
        return 'f%d g%d ch3 无钥匙门' % (flat, gidx)
    if dch in (1, 2) and key is not None:
        return 'f%d g%d ch%d 不应有钥匙门' % (flat, gidx, dch)
    if entry in wallset or goal in wallset:
        return 'f%d g%d 入口/出口在墙上' % (flat, gidx)
    if key is not None:
        kp, dp = (key['r'], key['c']), (door['r'], door['c'])
        if kp in wallset or dp in wallset or kp == goal or dp == goal:
            return 'f%d g%d 钥匙/门位置非法' % (flat, gidx)
        if bfs_grid(size, wallset, entry, goal, frozenset([dp])) is not None:
            return 'f%d g%d 门不挡路（无钥可达出口）' % (flat, gidx)   # SPEC：门挡在通路上
        s1 = bfs_grid(size, wallset, entry, kp, frozenset([dp]))      # 入口→钥匙（门不通）
        s2 = bfs_grid(size, wallset, kp, goal)                        # 钥匙→出口（门可通行）
        if s1 is None or s2 is None:
            return 'f%d g%d 钥匙路不可解 s1=%s s2=%s' % (flat, gidx, s1 is None, s2 is None)
        path = s1 + s2
    else:
        path = bfs_grid(size, wallset, entry, goal)
        if path is None:
            return 'f%d g%d 不可解' % (flat, gidx)
    for i, cell in enumerate(path):                    # 逐格驱动（含拾钥 'moved'；两段拼接重访足迹='back' 合法）
        ret = await tap(pg, cell)
        last = i == len(path) - 1
        if last and ret not in ('right', 'done'):
            return 'f%d g%d 末格 tap=%s' % (flat, gidx, ret)
        if not last and ret not in ('moved', 'back'):
            return 'f%d g%d 格%d(%s) tap=%s' % (flat, gidx, i, cell, ret)
        await pg.wait_for_timeout(800)
    return None

QF = {'babylove': q_babylove, 'storybed': q_storybed, 'maze': q_maze}

async def audit_static(pg):
    bad = []
    for flat in range(25 if GAME == 'babylove' else 20):   # r10 babylove 静态 25 关（5 章×5）
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(400)
        dch = await pg.evaluate('%s.currentLevel.dch' % HOOK)
        if GAME == 'maze':
            for gidx in range(3):                       # 每关 3 局（SPEC 明示）
                old = await pg.evaluate('JSON.stringify(%s.quiz.maze)' % HOOK)   # 局切换基线
                q = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
                err = await q_maze(pg, flat, gidx, q, dch)
                if err:
                    bad.append(err); break
                if gidx < 2:                            # 等下一局生成（庆祝窗+新局）
                    if not await poll_quiz_change(pg, old, 15000):
                        bad.append('f%d g%d 局未切换' % (flat, gidx)); break
        else:
            kinds = set()
            flows = set()
            first_kind = None
            for k in range(5):
                old = await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK)
                q = json.loads(old)
                if GAME == 'storybed':
                    kinds.add(q.get('kind', 'order'))
                    flows.add(q['flow'])
                    if k == 0:
                        first_kind = q.get('kind', 'order')
                else:
                    kinds.add(q['kind'])
                err = await QF[GAME](pg, flat, k, q, dch)
                if err:
                    bad.append(err); break
                if k < 4:                               # 等下一题（确认链窗）
                    if GAME == 'babylove' and not await poll_step(pg, k + 1):
                        bad.append('f%dq%d step 未推进' % (flat, k)); break
                    if GAME == 'storybed' and not await poll_quiz_change(pg, old):
                        bad.append('f%dq%d 题未切换' % (flat, k)); break
        if len(bad) > 8:
            break
        if GAME == 'babylove':
            if dch == 1 and kinds != {'findmom'}:
                bad.append('f%d dch1 型 %s' % (flat, kinds))
            if dch == 2 and not kinds <= {'findmom', 'findbaby'}:
                bad.append('f%d dch2 出两族外 %s' % (flat, kinds))
            if dch == 3 and kinds != {'grow'}:
                bad.append('f%d dch3 非 grow %s' % (flat, kinds))
            if dch == 4 and kinds != {'habitat'}:
                bad.append('f%d dch4 非 habitat %s' % (flat, kinds))
            if dch == 5 and len(kinds) < 3:
                bad.append('f%d dch5 型<3 %s' % (flat, kinds))
        elif GAME == 'storybed':                        # r10 章型（§6.4）：ch1/2 全 order、ch3 rain+order 混合（题0 恒 rain）、ch4 全 miss
            if dch == 1 and kinds != {'order'}:
                bad.append('f%d ch1 型 %s' % (flat, kinds))
            if dch == 2 and kinds != {'order'}:
                bad.append('f%d ch2 型 %s' % (flat, kinds))
            if dch == 3 and (kinds != {'rain', 'order'} or first_kind != 'rain'):
                bad.append('f%d ch3 型 %s 首=%s' % (flat, kinds, first_kind))
            if dch == 4 and kinds != {'miss'}:
                bad.append('f%d ch4 型 %s' % (flat, kinds))
            if dch in (1, 2, 4) and len(flows) != 5:    # 5 题=5 流程互异
                bad.append('f%d 流程数=%d %s' % (flat, len(flows), flows))
    return bad

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

        # T3 全量 SPEC 对账+驱动（maze=静态 20 关×3 局；余=20 关×5 题）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        bad = await audit_static(pg)
        rec('T3 全量 SPEC 对账+驱动', not bad and not errs3, (bad[:6] or '') if bad else 'err=%s' % errs3[:2])

        # T4 生成关（babylove r10: flat25-44 dch∈1-5 且五型全现；他款 20-39 dch∈1-4）
        gf = (25, 45) if GAME == 'babylove' else (20, 40)
        gen = []
        for flat in range(*gf):
            r = await pg.evaluate('%s.start(%d), %s.currentLevel.dch' % (HOOK, flat, HOOK))
            gen.append(r)
        # 审查 M2 升级：循环取材（每 5 关一段同型）必现 ≥5 长度同值连续段；随机 seeded 概率≈0——可区分两种取法
        run = mx = 1
        for a, bch in zip(gen, gen[1:]):
            run = run + 1 if a == bch else 1
            mx = max(mx, run)
        dset = {1, 2, 3, 4, 5} if GAME == 'babylove' else {1, 2, 3, 4}
        rec('T4 生成关 dch∈%s 且全现且非循环' % (sorted(dset)),
            all(g in dset for g in gen) and set(gen) == dset and mx < 5,
            '%s maxrun=%d' % (gen, mx))

        # T5 确定性
        same = True
        dfl = (27, 33, 39, 43) if GAME == 'babylove' else (22, 27, 33, 39)
        for flat in dfl:
            a = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            c = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        # T6 tapX 返回值族
        if GAME == 'maze':
            r0 = await pg.evaluate('(async () => { %s.start(10); await new Promise(w=>setTimeout(w,400)); return String(await %s.tapCell(99, 99)); })()' % (HOOK, HOOK))
            r1 = await pg.evaluate('(async () => { const w = %s.quiz.maze.walls[0]; const r = await %s.tapCell(w.r, w.c); return {raw: String(r), miss: %s.quiz.miss}; })()' % (HOOK, HOOK, HOOK))
            await pg.wait_for_timeout(WRONG_WAIT['maze'])          # 过错链窗（窗内驱动被吞）
            mz = json.loads(await pg.evaluate('JSON.stringify(%s.quiz.maze)' % HOOK))
            pos = json.loads(await pg.evaluate('JSON.stringify(%s.quiz.pos)' % HOOK))
            W = set((w['r'], w['c']) for w in mz['walls'])
            goal = (mz['goal']['r'], mz['goal']['c'])
            far = next((r, c) for r in range(mz['size']) for c in range(mz['size'])
                       if abs(r - pos['r']) + abs(c - pos['c']) > 1 and (r, c) != goal and (r, c) not in W)
            r2 = await pg.evaluate('(async () => { return String(await %s.tapCell(%d, %d)); })()' % (HOOK, far[0], far[1]))
            await pg.wait_for_timeout(WRONG_WAIT['maze'])
            prev = tuple(pos.values())
            mv = await pg.evaluate("""(async () => { const q = %s.quiz; const mz = q.maze;
                const W = new Set(mz.walls.map(w => w.r + ',' + w.c));
                for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                    const r = q.pos.r + dr, c = q.pos.c + dc;
                    if (r < 0 || c < 0 || r >= mz.size || c >= mz.size) continue;
                    if (W.has(r + ',' + c)) continue;
                    if (mz.door && !q.hasKey && r === mz.door.r && c === mz.door.c) continue;
                    return String(await %s.tapCell(r, c));
                } return 'none'; })()""" % (HOOK, HOOK))
            await pg.wait_for_timeout(1200)
            m_pre = await pg.evaluate('%s.quiz.miss' % HOOK)
            r4 = await tap(pg, prev)                                # 回退刚走的格
            await pg.wait_for_timeout(800)
            m_post = await pg.evaluate('%s.quiz.miss' % HOOK)       # SPEC §0.75：回退不记 miss（审查 m3）
            r5 = await pg.evaluate("""(async () => { const H = %s;
                for (;;) { const q = H.quiz, mz = q.maze;
                    const target = (mz.key && !q.hasKey) ? mz.key : mz.goal;   // 未拿钥先奔钥匙
                    const W = new Set(mz.walls.map(w => w.r + ',' + w.c));
                    const door = mz.door ? mz.door.r + ',' + mz.door.c : null;
                    const start = q.pos.r + ',' + q.pos.c, goal = target.r + ',' + target.c;
                    const prev = {[start]: null}, qq = [start];
                    let found = false;
                    while (qq.length) { const cur = qq.shift();
                        if (cur === goal) { found = true; break; }
                        const [r, c] = cur.split(',').map(Number);
                        for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                            const nr = r + dr, nc = c + dc, ns = nr + ',' + nc;
                            if (nr < 0 || nc < 0 || nr >= mz.size || nc >= mz.size) continue;
                            if (W.has(ns)) continue;
                            if (ns === door && !q.hasKey) continue;
                            if (ns in prev) continue;
                            prev[ns] = cur; qq.push(ns);
                        } }
                    if (!found) return 'nosolve';
                    let path = []; let cur = goal;
                    while (cur !== start) { path.unshift(cur); cur = prev[cur]; }
                    const nxt = path[0].split(',').map(Number);
                    const r = await H.tapCell(nxt[0], nxt[1]);
                    if (r === 'right' || r === 'done') return String(r);
                    if (r !== 'moved') return String(r);
                    await new Promise(w => setTimeout(w, 700)); } })()""" % HOOK)
            rec('T6 tapCell 返回值族', r0 == 'null' and r1['raw'] == 'wrong' and r1['miss'] == 1 and r2 == 'wrong' and
                mv == 'moved' and r4 == 'back' and m_pre == m_post and r5 in ('right', 'done'),
                'oob=%s wall=%s miss=%s far=%s moved=%s back=%s back_miss=%s->%s finish=%s' % (r0, r1['raw'], r1['miss'], r2, mv, r4, m_pre, m_post, r5))
        elif GAME == 'storybed':
            r0 = await pg.evaluate('(async () => { %s.start(10); await new Promise(w=>setTimeout(w,400)); const r = await %s.tapCard(99); return r === null ? "null" : String(r); })()' % (HOOK, HOOK))
            r1 = await pg.evaluate('(async () => { const q = %s.quiz; const cand = q.steps.filter(s => s.stepId !== q.answer); const raw = await %s.tapCard(q.steps.indexOf(cand[0])); return { raw: String(raw), miss: %s.quiz.miss }; })()' % (HOOK, HOOK, HOOK))
            await pg.wait_for_timeout(WRONG_WAIT['storybed'])
            r2 = await pg.evaluate("""(async () => { const H = %s;
                for (;;) { const q = H.quiz; if (!q || !q.steps) return '?';
                    const i = q.steps.findIndex(s => s.stepId === q.answer);
                    if (i < 0) return '?';
                    const r = await H.tapCard(i);
                    if (r === 'right' || r === 'done') return String(r);
                    if (r !== 'step') return String(r);
                    await new Promise(w => setTimeout(w, 2300)); } })()""" % HOOK)
            rec('T6 tapCard 返回值族', r0 == 'null' and r1['raw'] == 'wrong' and r1['miss'] == 1 and r2 in ('right', 'done'),
                'oob=%s wrong=%s miss=%s finish=%s' % (r0, r1['raw'], r1['miss'], r2))
        else:
            r3 = await pg.evaluate('async () => { %s.start(10); await new Promise(w=>setTimeout(w,400)); const r = await %s.%s(99); return r === null ? "null" : String(r); }' % (HOOK, HOOK, TAP))
            r1 = await pg.evaluate("""async () => { const q = %s.quiz; const w = q.answer === 0 ? 1 : 0;
                const raw = await %s.%s(w); return { raw: String(raw), miss: %s.quiz.miss, step: %s.quiz.step,
                    sub: %s.quiz.substep, kind: q.kind }; }""" % (HOOK, HOOK, TAP, HOOK, HOOK, HOOK))
            await pg.wait_for_timeout(WRONG_WAIT['babylove'])
            r2 = await pg.evaluate('async () => { const q = %s.quiz; return String(await %s.%s(q.answer)); }' % (HOOK, HOOK, TAP))
            # r10 步语义：错不推进（step=0 sub=0）；首步点对='step'（题内第 1 小问完成非题尾）
            rec('T6 tapX 返回值族', r3 == 'null' and r1['raw'] == 'wrong' and r1['miss'] == 1 and
                r1['step'] == 0 and r1.get('sub') == 0 and r2 == 'step',
                'oob=%s wrong=%s miss=%s sub=%s step-hit=%s %s' % (r3, r1['raw'], r1['miss'], r1.get('sub'), r2, r1['kind']))

        # T7 双错防重入
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(400)
        if GAME == 'maze':
            for _ in range(2):
                await pg.evaluate('() => { const w = %s.quiz.maze.walls[0]; %s.tapCell(w.r, w.c); return 1; }' % (HOOK, HOOK))
                await pg.wait_for_timeout(40)
        elif GAME == 'storybed':
            for _ in range(2):
                await pg.evaluate('() => { const q = %s.quiz; const cand = q.steps.filter(s => s.stepId !== q.answer); %s.tapCard(q.steps.indexOf(cand[0])); return 1; }' % (HOOK, HOOK))
                await pg.wait_for_timeout(40)
        else:
            for _ in range(2):
                await pg.evaluate('() => { const q = %s.quiz; %s.%s(q.answer === 0 ? 1 : 0); return 1; }' % (HOOK, HOOK, TAP))
                await pg.wait_for_timeout(40)
        await pg.wait_for_timeout(WRONG_WAIT[GAME])
        m = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T7 双错防重入 miss 只+1', m == 1, 'miss=%s' % m)

        # T8 星级三档（0 错 3★ / 2 错 2★ / ≥3 错 1★）
        flatx = 10
        async def wrong_once():
            if GAME == 'maze':
                await pg.evaluate('async () => { const w = %s.quiz.maze.walls[0]; await %s.tapCell(w.r, w.c); }' % (HOOK, HOOK))
            elif GAME == 'storybed':
                await pg.evaluate('async () => { const q = %s.quiz; const cand = q.steps.filter(s => s.stepId !== q.answer); await %s.tapCard(q.steps.indexOf(cand[0])); }' % (HOOK, HOOK))
            else:
                await pg.evaluate('async () => { const q = %s.quiz; await %s.%s(q.answer === 0 ? 1 : 0); }' % (HOOK, HOOK, TAP))
        async def stars_after(nwrong):
            await pg.evaluate('%s.start(%d)' % (HOOK, flatx))
            await pg.wait_for_timeout(400)
            for _ in range(nwrong):
                await wrong_once()
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

        # T9 家族 A 源码正则 + K 面板守卫（契约 K）
        main_js = (BASE / GAME / '_src' / 'game-main.js').read_text(encoding='utf-8')
        data_js = (BASE / GAME / '_src' / 'game-data.js').read_text(encoding='utf-8')
        rec('T9 家族 A nextHint 双形态',
            re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js) is not None and
            re.search(r'nextHint\(\s*null\s*\)', main_js) is not None)
        rec('T9b 契约 K 面板守卫在场', "querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')" in main_js)

        # T10 C7 章末预告（4 章非空+生成关 nextHint 实算=GEN_HINTS[dch-1]，家族 F）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        hints = re.findall(r"hint:\s*'([^']+)'", data_js)
        ghints = re.findall(r"GEN_HINTS\s*=\s*\[([^\]]+)\]", data_js)
        gh = re.findall(r"'([^']+)'", ghints[0]) if ghints else []
        nh, ng = (5, 5) if GAME == 'babylove' else (4, 4)   # r10 babylove 五章/五型
        sem = (len(hints) == nh and all(len(h) >= 6 for h in hints) and len(gh) == ng and
               all(len(x) >= 6 for x in gh))
        gfl = '[25,29,34,39,44]' if GAME == 'babylove' else '[24,29,34,39]'
        genok = await pg.evaluate('%s.every(f => nextHint(f) === GEN_HINTS[genLevel(f+1).dch-1])' % gfl)
        rec('T10 C7 预告在场+生成关实算', sem and genok, 'hints=%d gh=%d genok=%s' % (len(hints), len(gh), genok))
        await ctx.close()

        # T11 契约 I 豁免窗（每款链构成独立核算）+ N keyless 恒尾源码断言
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
        lb_spec, chain_sents = CHAIN[GAME]
        sent_ok = all(s in main_js or s in data_js for s in chain_sents)
        # T11 下界=wrong clip+300（SPEC 独立可推导——错链必以 wrong clip 起头 §0.73-75）；
        # 完整链构成（keyless 句 estMs/窗≥链/keylessLast）由 verify 页 selftest 动态断言承担（T1），
        # 此处避免从实现文本构造期望值（断言同源陷阱——keyless 句为变量两跳引用且非错链独有）
        wrong_clip = {'babylove': 1656, 'storybed': 2496, 'maze': 2664}[GAME]
        lb = wrong_clip + 300
        guard = 'Date.now() < wrongChainUntil' in main_js
        reset = re.search(r'lastWrongVoice\s*=\s*0;\s*wrongChainUntil\s*=\s*0', main_js) is not None
        n_static = True
        for m in re.finditer(r'\{\s*key:\s*null[^}]*\}\s*(\S)', main_js):
            if m.group(1) != ']':
                n_static = False
        rec('T11 契约 I+N 豁免窗≥链实长+keyless 恒尾', n_win > 0 and n_win >= lb and sent_ok and guard and reset and n_static,
            'N=%d 下界=%d 句在源码=%s guard=%s reset=%s keyless静态=%s' % (n_win, lb, sent_ok, guard, reset, n_static))
        await b.close()
    fails = [n for n, ok in RES if not ok]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)

asyncio.run(main())
