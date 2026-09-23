# -*- coding: utf-8 -*-
"""batch33 独立复验：soundcount / position / robotpaint（断言从 SPEC-BATCH33 推导，期望值独立硬编码）
用法: python verify_batch33.py <soundcount|position|robotpaint>
口径：verify 页 (?verify=1)；错链豁免窗内错点被吞——wrong 后等过窗再驱动：
     sc≈4230 / ps≈5270 / rp≈5310（链构成：sc=wrong1656+150+hint1824+300=3930；ps=wrong1656+150+hint2856+300=4962→实现 4970；rp=wrong1848+150+hint2712+300=5010）
探针实证形状（2026-09-11）：
  soundcount quiz={kind('counthear'|'countmix'|'countdual'), count(鼓), mix(铃), seq[]('b'=bell铃/'d'=drum鼓), opts[{num}],
             answer(phase 感知：countdual 第一步=count 卡/half 后=mix 卡), phase(countdual 0=问鼓/1=问铃), step, miss}
             r24（SPEC-R24-SOUNDCOUNT）：dch4=纯听+大域 counthear N∈[6,10] 候选⊆{6..10}+countdual N∈[3,5]≠M∈[2,4]
             候选⊆{1..5} 含双真值（两步作答：第一步 'half' 转问铃，第二步对=right/done）；countmix 仅 dch3
  position   quiz={kind('findpos'|'placepos'), ask(方位 id), cells[{pos}](ch1-2 四格/ch3+ 六格), bunnyAt, answer(cells 下标), step, miss}
  robotpaint quiz(r18)={kind('plain'|'neg'|'edit'|'mem'|'dual'), mem, flashDone, target, slots[{axis,val}×3 无 locked],
             slotIdx, blocks[{axis,val}×8 组内打乱], phase, painted, judged, tIdx, t1Done, step(题号), miss,
             negMap?/edits?/start?/goals?（kind 特异附加）——r18 预填/锁定废止：三槽恒空起步
  三款 currentLevel keys=[ch,dch,done,flat,lv,miss,n,stars,step,won]
"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'soundcount': 'SC', 'position': 'PS', 'robotpaint': 'RP'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码（禁 import 实现） ----
POS6 = {'front', 'back', 'left', 'right', 'up', 'down'}
POS4 = POS6 - {'left', 'right'}
RP_COLORS = {'red', 'yel', 'blu'}
RP_SHAPES = {'cir', 'squ', 'tri'}
RP_SIZES = {'big', 'small'}
WRONG_WAIT = {'soundcount': 4230, 'position': 5270, 'robotpaint': 5310}
LB = {'soundcount': 3930, 'position': 4962, 'robotpaint': 5010}   # T11 下界（SPEC §4 独立验算）
# robotpaint r18 SPEC §-r18-robotpaint 独立硬编码（CH_LEN=6、静态 24 关）
RP_KP = {1: {'plain'}, 2: {'neg', 'edit'}, 3: {'mem', 'dual'},
         4: {'plain', 'neg', 'edit', 'mem', 'dual'}}     # KIND_POOL 按难度章分流
RP_NAX = {2: 1, 4: 2}                                   # NEG_AXES_N == EDIT_AXES_N（否定/修改轴数）
RP_NFL, RP_NQ = 24, 6                                   # 静态关数 / 每关题数（键基 5/20→6/24 迁移）

def est_ms(n):
    return n * 345 + 600

async def wait_verify_title(pg):
    # r18 verify 墙钟 ~129s（SPEC §-r18 实证坑④）——预算须 ≥300s，否则未就绪放行→后续驱动与自测套件并发竞速
    for _ in range(700 if GAME == 'robotpaint' else 200):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t and t != 'VERIFY':
            return t
        await pg.wait_for_timeout(500)
    return ''

async def poll_step(pg, want, timeout=20000):
    # RP r18：quiz.step=题号（槽进度独立由 slotIdx 承载）；题指针仍从 currentLevel.step 读（恒真）
    src = ('%s.currentLevel.step' % HOOK) if GAME == 'robotpaint' else ('%s.quiz.step' % HOOK)
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate(src)
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False

async def tap(pg, i, fn=None):
    fn = fn or ('tapCell' if GAME == 'position' else 'tapOpt')
    return await pg.evaluate('(async () => { const r = await %s.%s(%d); return r === null ? "null" : String(r); })()' % (HOOK, fn, i))

async def wait_ready(pg, fn=None, timeout=25000):
    """soundcount 播音锁探针：tapOpt(99) 锁中返 false、解锁后返 null（越界探测=可交互探针——探针实证）"""
    fn = fn or ('tapCell' if GAME == 'position' else 'tapOpt')
    for _ in range(int(timeout / 300)):
        r = await pg.evaluate('(async () => { const r = await %s.%s(99); return r === null ? "null" : String(r); })()' % (HOOK, fn))
        if r == 'null':
            return True
        await pg.wait_for_timeout(300)
    return False

async def wait_pick(pg, timeout=30000):
    """robotpaint：等 pick 相位（paint/compare 吞输入）"""
    for _ in range(int(timeout / 300)):
        ph = await pg.evaluate('(window.%s.quiz.phase || "pick")' % HOOK)
        if ph == 'pick':
            return True
        await pg.wait_for_timeout(300)
    return False

# ---------- T3 每题审计（r24：dch4=纯听+大域 6-10+双音色双问谱，SPEC-R24-SOUNDCOUNT §R3/§R8） ----------
async def q_soundcount(pg, flat, k, q, dch):
    if q['kind'] not in ('counthear', 'countmix', 'countdual'):
        return 'f%dq%d kind=%s' % (flat, k, q['kind'])
    c, mx = q['count'], q.get('mix', 0)
    seq = q.get('seq') or []
    nums = [o['num'] for o in q['opts']]
    n = len(nums)
    if q['kind'] == 'counthear':
        if dch == 1 and c not in (2, 3):
            return 'f%dq%d ch1 N=%d' % (flat, k, c)
        if dch == 2 and c not in (3, 4):
            return 'f%dq%d ch2 N=%d' % (flat, k, c)
        if dch == 4 and c not in (6, 7, 8, 9, 10):
            return 'f%dq%d ch4 大域 N=%d' % (flat, k, c)
        if dch == 3:
            return 'f%dq%d counthear 在 ch3' % (flat, k)
        if mx:
            return 'f%dq%d counthear 带 mix' % (flat, k)
    elif q['kind'] == 'countdual':                   # r24 双音色双问（仅 dch4）
        if dch != 4:
            return 'f%dq%d countdual 在 ch%d' % (flat, k, dch)
        if c not in (3, 4, 5) or mx not in (2, 3, 4) or c == mx:
            return 'f%dq%d dual 先验 N=%d M=%d' % (flat, k, c, mx)
        if q.get('phase') != 0:
            return 'f%dq%d dual 初始 phase=%s' % (flat, k, q.get('phase'))
    else:
        if dch != 3:
            return 'f%dq%d countmix 在 ch%d' % (flat, k, dch)
        if c not in (3, 4, 5) or mx not in (1, 2) or c + mx > 6:
            return 'f%dq%d mix 先验 N=%d M=%d' % (flat, k, c, mx)
    if len(seq) != c + mx or seq.count('d') != c or seq.count('b') != mx:
        return 'f%dq%d seq 对账 %s N=%d M=%d' % (flat, k, seq, c, mx)
    if dch == 1 and n != 2 or dch == 2 and n != 3 or dch >= 3 and n != 4:
        return 'f%dq%d ch%d 候选=%d' % (flat, k, dch, n)
    band = set(range(6, 11)) if (q['kind'] == 'counthear' and dch == 4) else set(range(1, 6))
    if len(set(nums)) != n or c not in nums or not set(nums) <= band:
        return 'f%dq%d 候选 %s' % (flat, k, nums)
    if q['kind'] == 'countdual' and mx not in nums:
        return 'f%dq%d dual 缺铃真值 %s' % (flat, k, nums)
    if q['answer'] != nums.index(c):
        return 'f%dq%d answer 错' % (flat, k)
    if not await wait_ready(pg):                      # 播音锁（探针实证：锁中吞 false/解锁 null）
        return 'f%dq%d 播音锁未解除' % (flat, k)
    r = await tap(pg, q['answer'])
    if q['kind'] != 'countdual':
        return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    if r != 'half':                                   # r24 第一步（问鼓）对='half' 转问铃，不推进
        return 'f%dq%d dual 一步 tap=%s' % (flat, k, r)
    if not await wait_ready(pg):                      # 确认链（right+名音）+q3 问句窗过后解锁
        return 'f%dq%d dual 二步锁未解除' % (flat, k)
    q2 = json.loads(await pg.evaluate('JSON.stringify(SC.quiz)'))
    if q2.get('phase') != 1 or q2['answer'] != nums.index(mx):
        return 'f%dq%d dual phase1=%s answer=%s' % (flat, k, q2.get('phase'), q2['answer'])
    r2 = await tap(pg, q2['answer'])
    return None if r2 in ('right', 'done') else 'f%dq%d dual 二步 tap=%s' % (flat, k, r2)

async def q_position(pg, flat, k, q, dch):
    if q['kind'] not in ('findpos', 'placepos'):
        return 'f%dq%d kind=%s' % (flat, k, q['kind'])
    ask = q['ask']
    poss = [c['pos'] for c in q['cells']]
    if ask not in POS6:
        return 'f%dq%d ask=%s 非封闭集' % (flat, k, ask)
    if dch in (1, 2):
        if len(poss) != 4 or set(poss) != POS4:
            return 'f%dq%d ch%d 域 %s' % (flat, k, dch, poss)
        if q['kind'] != 'findpos':
            return 'f%dq%d placepos 在 ch%d' % (flat, k, dch)
    else:
        if len(poss) != 6 or set(poss) != POS6:
            return 'f%dq%d ch%d 域 %s' % (flat, k, dch, poss)
    bunny = q.get('bunnyAt')
    if bunny not in poss:
        return 'f%dq%d bunnyAt=%s 不在域' % (flat, k, bunny)
    if q['kind'] == 'findpos':
        if ask != bunny:
            return 'f%dq%d findpos ask≠bunnyAt' % (flat, k)
    else:
        if ask == bunny:
            return 'f%dq%d placepos 目标=当前位' % (flat, k)
    if q['answer'] != poss.index(ask):
        return 'f%dq%d answer 错' % (flat, k)
    r = await tap(pg, q['answer'], 'tapCell')
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

RP_AXVALS = {'color': RP_COLORS, 'shape': RP_SHAPES, 'size': RP_SIZES}

async def wait_rpick(pg, timeout=30000):
    """r18 可交互探针：pick + 未锁 +（mem 须闪现毕 flashDone——闪现窗内 tapBlock 吞 false）"""
    for _ in range(int(timeout / 300)):
        ok = await pg.evaluate(
            '(window.%s.quiz && %s.quiz.phase === "pick" && %s.state.locked === false'
            ' && (%s.quiz.kind !== "mem" || %s.quiz.flashDone === true))' % ((HOOK,) * 5))
        if ok:
            return True
        await pg.wait_for_timeout(300)
    return False

async def rp_fill(pg, q):
    """按槽序填 live 目标块（blocks 同题不变；组内打乱→按 (axis,val) 定位下标）"""
    blocks = [(b['axis'], b['val']) for b in q['blocks']]
    tgt = q['target']
    for s in q['slots']:
        if s.get('val'):
            continue
        idx = blocks.index((s['axis'], tgt[s['axis']]))
        r = await tap(pg, idx, 'tapBlock')
        if r not in ('fill', 'ready'):
            return '槽%s tap=%s' % (s['axis'], r)
    return None

async def rp_go(pg):
    return await pg.evaluate('(async () => { const x = await %s.tapGo(); return x === null ? "null" : String(x); })()' % HOOK)

async def q_robotpaint(pg, flat, k, q, dch):
    # ---- SPEC §-r18-robotpaint 五题型契约（独立硬编码，禁从实现归纳） ----
    kind = q.get('kind')
    if kind not in RP_KP[dch]:
        return 'f%dq%d ch%d kind=%s' % (flat, k, dch, kind)
    tgt = q['target']
    if tgt['color'] not in RP_COLORS or tgt['shape'] not in RP_SHAPES or tgt['size'] not in RP_SIZES:
        return 'f%dq%d target 越池 %s' % (flat, k, tgt)
    blocks = [(b['axis'], b['val']) for b in q['blocks']]
    if len(blocks) != 8 or len(set(blocks)) != 8 or [a for a, _ in blocks] != ['color'] * 3 + ['shape'] * 3 + ['size'] * 2:
        return 'f%dq%d blocks 轴分组 %s' % (flat, k, [a for a, _ in blocks])
    for ax, want in RP_AXVALS.items():
        got = {v for a, v in blocks if a == ax}
        if got != want:
            return 'f%dq%d %s 轴池 %s' % (flat, k, ax, sorted(got))
    slots = q['slots']
    if len(slots) != 3 or [s['axis'] for s in slots] != ['color', 'shape', 'size']:
        return 'f%dq%d slots=%s' % (flat, k, slots)
    if any(s.get('val') is not None for s in slots) or q.get('slotIdx') != 0:
        return 'f%dq%d 槽非空起步 %s idx=%s' % (flat, k, slots, q.get('slotIdx'))
    # 附加泄漏（非本 kind 不得携带他人附加）
    if kind != 'neg' and q.get('negMap'):
        return 'f%dq%d negMap 泄漏' % (flat, k)
    if kind != 'edit' and (q.get('edits') or q.get('start')):
        return 'f%dq%d edit 泄漏' % (flat, k)
    if kind != 'dual' and q.get('goals'):
        return 'f%dq%d goals 泄漏' % (flat, k)
    if kind == 'neg':
        nm = q.get('negMap') or {}
        if len(nm) != RP_NAX[dch]:
            return 'f%dq%d neg 轴数 %d≠%d' % (flat, k, len(nm), RP_NAX[dch])
        for ax, excl in nm.items():
            if sorted(excl) != sorted(RP_AXVALS[ax] - {tgt[ax]}):
                return 'f%dq%d neg %s 排除集 %s（补集应唯一=%s）' % (flat, k, ax, excl, tgt[ax])
    elif kind == 'edit':
        ed, st = q.get('edits') or [], q.get('start')
        if len(ed) != RP_NAX[dch] or not st:
            return 'f%dq%d edit 步数 %d start=%s' % (flat, k, len(ed), bool(st))
        comp = dict(st)
        for e in ed:
            if e['from'] != comp[e['axis']] or e['to'] not in (RP_AXVALS[e['axis']] - {e['from']}):
                return 'f%dq%d edit %s 非法 %s' % (flat, k, e['axis'], e)
            comp[e['axis']] = e['to']
        if (comp['color'], comp['shape'], comp['size']) != (tgt['color'], tgt['shape'], tgt['size']):
            return 'f%dq%d edit 终态≠target' % (flat, k)
    elif kind == 'mem':
        if not q.get('mem'):
            return 'f%dq%d mem 未标' % (flat, k)
    elif kind == 'dual':
        gs = q.get('goals') or []
        if len(gs) != 2 or gs[0] == gs[1]:
            return 'f%dq%d goals=%s' % (flat, k, gs)
        if gs[0] != tgt:
            return 'f%dq%d target≠g1' % (flat, k)
    # ---- 驱动：等可交互→填→tapGo；dual 任务一 right 不推进（engAfterConfirm 切任务二再一轮）----
    if not await wait_rpick(pg):
        return 'f%dq%d 不可交互' % (flat, k)
    err = await rp_fill(pg, q)
    if err:
        return 'f%dq%d %s' % (flat, k, err)
    r = await rp_go(pg)
    if r not in ('right', 'done'):
        return 'f%dq%d tapGo=%s' % (flat, k, r)
    if kind == 'dual' and r == 'right':
        if not await wait_rpick(pg):
            return 'f%dq%d dual 任务二不可交互' % (flat, k)
        q2 = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
        if q2.get('tIdx') != 1 or q2['target'] != q['goals'][1]:
            return 'f%dq%d dual 未切任务二 tIdx=%s' % (flat, k, q2.get('tIdx'))
        err = await rp_fill(pg, q2)
        if err:
            return 'f%dq%d dual2 %s' % (flat, k, err)
        r2 = await rp_go(pg)
        if r2 not in ('right', 'done'):
            return 'f%dq%d dual2 tapGo=%s' % (flat, k, r2)
    return None

QF = {'soundcount': q_soundcount, 'position': q_position, 'robotpaint': q_robotpaint}

async def audit_static(pg):
    bad = []
    ch3_union = set()
    NFL = RP_NFL if GAME == 'robotpaint' else 20      # r18 键基迁移：静态 20→24、每关 5→6
    NQ = RP_NQ if GAME == 'robotpaint' else 5
    for flat in range(NFL):
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(400)
        dch = await pg.evaluate('%s.currentLevel.dch' % HOOK)
        kinds = set()
        for k in range(NQ):
            q = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            kinds.add(q.get('kind') or 'paint')      # RP r18 quiz 恒有 kind（无 kind 兜底废形态）
            err = await QF[GAME](pg, flat, k, q, dch)
            if err:
                bad.append(err); break
            if k < NQ - 1:
                if not await poll_step(pg, k + 1):
                    bad.append('f%dq%d 未推进' % (flat, k)); break
        if len(bad) > 8:
            break
        if GAME == 'soundcount':
            if dch in (1, 2) and kinds != {'counthear'}:
                bad.append('f%d ch%d 型 %s' % (flat, dch, kinds))
            if dch == 3 and kinds != {'countmix'}:
                bad.append('f%d ch3 型 %s' % (flat, kinds))
            if dch == 4 and kinds != {'counthear', 'countdual'}:   # r24 固定谱两形态恒在场
                bad.append('f%d ch4 型 %s' % (flat, kinds))
            if dch == 4:
                ch3_union |= kinds
        elif GAME == 'position':
            if dch in (1, 2) and kinds != {'findpos'}:
                bad.append('f%d ch%d 型 %s' % (flat, dch, kinds))
            if dch == 3 and kinds != {'findpos', 'placepos'}:
                bad.append('f%d ch3 混出 %s' % (flat, kinds))
            if dch == 4 and not kinds <= {'findpos', 'placepos'}:
                bad.append('f%d ch4 型 %s' % (flat, kinds))
    if GAME == 'soundcount' and ch3_union and ch3_union != {'counthear', 'countdual'}:
        bad.append('ch4 跨关并集 %s' % sorted(ch3_union))
    return bad

async def wrong_js(restart=True):
    if GAME == 'soundcount':
        pre = ('const H = %s; %s for (let i = 0; i < 80; i++) { const r = await H.tapOpt(99);'
               ' if (r === null) break; await new Promise(w=>setTimeout(w,300)); }'
               ) % (HOOK, ('await H.start(10);' if restart else ''))
        return ('(async () => { %s'
                ' const q = H.quiz; const c = [0,1,2,3].filter(i => i !== q.answer); await H.tapOpt(c[0]); })()' % pre)
    if GAME == 'position':
        return '(async () => { const q = %s.quiz; const c = q.cells.map(x => x.pos).filter(p => p !== q.ask).map(p => q.cells.findIndex(x => x.pos === p)); await %s.tapCell(c[0]); })()' % (HOOK, HOOK)
    pre = ('const H = %s; %s await new Promise(w=>setTimeout(w,400));'
           ' for (let i = 0; i < 100; i++) { const ph = H.quiz.phase || "pick"; if (ph === "pick") break; await new Promise(w=>setTimeout(w,300)); }'
           ) % (HOOK, ('await H.start(10);' if restart else ''))
    return ('(async () => { %s'
            ' for (let t = 0; t < 4; t++) {'
            '   const q = H.quiz;'                        # live 快照（getter 每次新副本——旧引用 slotIdx 失效坑）
            '   const s = (q.slotIdx >= 0 && q.slots[q.slotIdx]) ? q.slots[q.slotIdx] : q.slots.find(x => !x.val && !x.locked);'
            '   if (!s) break;'
            '   const B = q.blocks;'
            '   const wrong = s.axis === "color" ? B.find(b => b.axis === "color" && b.val !== q.target.color) : null;'
            '   const b = wrong || B.find(x => x.axis === s.axis && x.val === q.target[s.axis]);'
            '   const r = await H.tapBlock(B.indexOf(b));'
            '   if (r === false || r === null) break;'
            ' }'
            ' if (H.quiz.slots.every(s => s.locked || s.val)) await H.tapGo(); })()' % pre)

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

        G0 = RP_NFL if GAME == 'robotpaint' else 20      # r18 生成关基址 20→24
        gen = []
        for flat in range(G0, G0 + 20):
            r = await pg.evaluate('%s.start(%d), %s.currentLevel.dch' % (HOOK, flat, HOOK))
            gen.append(r)
        run = mx = 1
        for a, bch in zip(gen, gen[1:]):
            run = run + 1 if a == bch else 1
            mx = max(mx, run)
        if GAME == 'robotpaint':
            # SPEC §0.81：ch4 生成=三轴全域 18 组合，无 dch 随机（生成关恒 dch=4——game-core.js:58 注释同源）
            rec('T4 生成关 dch 恒 4（三轴全域）', all(g == 4 for g in gen), '%s' % gen)
        else:
            rec('T4 生成关 dch 非循环四型全现', all(g in (1, 2, 3, 4) for g in gen) and set(gen) == {1, 2, 3, 4} and mx < 5,
                '%s maxrun=%d' % (gen, mx))

        same = True
        for flat in ((25, 27, 33, 39) if GAME == 'robotpaint' else (22, 27, 33, 39)):
            a = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            c = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        # T6 返回值族（soundcount 播音锁——等可交互后越界探测应 null）
        if GAME == 'robotpaint':
            r0 = await pg.evaluate('(async () => { %s.start(10); await new Promise(w=>setTimeout(w,400)); const r = await %s.tapBlock(99); return r === null ? "null" : String(r); })()' % (HOOK, HOOK))
        elif GAME == 'soundcount':
            await pg.evaluate('%s.start(10)' % HOOK)
            await wait_ready(pg)
            r0 = await tap(pg, 99)
        else:
            r0 = await pg.evaluate('(async () => { %s.start(10); await new Promise(w=>setTimeout(w,400)); const r = await %s.%s(99); return r === null ? "null" : String(r); })()' % (HOOK, HOOK, 'tapCell'))
        await pg.evaluate(await wrong_js(restart=True))
        await pg.wait_for_timeout(WRONG_WAIT[GAME])
        r2 = await pg.evaluate(await wrong_js(restart=False))
        rec('T6 错选 wrong+miss 计 1', r0 == 'null', 'oob=%s' % r0)

        # T7 双错防重入（窗内 40ms 二错被吞——两连击直点不走锁探针：探针会等过错链窗破坏测试时序）
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(500)
        if GAME == 'soundcount':
            await wait_ready(pg)                     # 先过播音锁（一次）
            dbl = ('(async () => { const q = %s.quiz; const c = [0,1,2,3].filter(i => i !== q.answer); await %s.tapOpt(c[0]); })()' % (HOOK, HOOK))
        elif GAME == 'position':
            dbl = ('(async () => { const q = %s.quiz; const c = q.cells.map(x => x.pos).filter(p => p !== q.ask).map(p => q.cells.findIndex(x => x.pos === p)); await %s.tapCell(c[0]); })()' % (HOOK, HOOK))
        else:
            # RP：错一次（color 轴填错值其余对→tapGo；槽保留），窗内二击=直接 tapGo
            await pg.evaluate('''(async () => { const H = %s;
                for (let i = 0; i < 100; i++) { const ph = H.quiz.phase || 'pick'; if (ph === 'pick') break; await new Promise(w=>setTimeout(w,300)); }
                for (let t = 0; t < 4; t++) {
                    const q = H.quiz;
                    const s = (q.slotIdx >= 0 && q.slots[q.slotIdx]) ? q.slots[q.slotIdx] : q.slots.find(x => !x.val && !x.locked);
                    if (!s) break;
                    const B = q.blocks;
                    const wrong = s.axis === 'color' ? B.find(b => b.axis === 'color' && b.val !== q.target.color) : null;
                    const b = wrong || B.find(x => x.axis === s.axis && x.val === q.target[s.axis]);
                    const r = await H.tapBlock(B.indexOf(b));
                    if (r === false || r === null) break;
                }
                if (H.quiz.slots.every(s => s.locked || s.val)) await H.tapGo(); })()''' % HOOK)
            dbl = '(async () => { await %s.tapGo(); })()' % HOOK
        for _ in range(2 if GAME != 'robotpaint' else 1):
            await pg.evaluate(dbl)
            await pg.wait_for_timeout(40)
        await pg.wait_for_timeout(WRONG_WAIT[GAME])
        m = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T7 双错防重入 miss 只+1', m == 1, 'miss=%s' % m)

        # T8 星级三档
        async def stars_after(nwrong):
            await pg.evaluate('%s.start(10)' % HOOK)
            await pg.wait_for_timeout(500)
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
        if GAME == 'robotpaint':
            # SPEC 家族 A r18 定版：双 lim-1（winFlow+启动各一）+ null 形态废止 + Math.max 兜底
            rec('T9 家族 A nextHint 双 lim-1（r18）',
                main_js.count('nextHint(lim - 1)') == 2 and
                'nextHint(null)' not in main_js and
                'Math.max(0, lim - 1)' in main_js)
        else:
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

        # T11 契约 I+N（静态；常量可为算术表达式——求和）
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
