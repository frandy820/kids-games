# -*- coding: utf-8 -*-
"""batch36 独立复验：comfort / quickcmp / tictac（断言从 SPEC-BATCH36 推导，期望值独立硬编码）
用法: python verify_batch36.py <comfort|quickcmp|tictac>
口径：verify 页 (?verify=1)；错链豁免窗内错点被吞——wrong 后等过窗再驱动：
     co≈6300（链=wrong2544+150+hint2904+300=5898）/ qc≈5350（=wrong1992+150+hint2496+300=4938）
     tk=残局关错链窗 2748（§-r18 §5 tk_wrong 2448+300 真时钟——T11 行为三态；对战关 miss 恒 0）
钩子形状（SPEC §1-3/§6 r11；agent 交付后探针实证校准——本文件标 [探针校准] 处）：
  comfort   quiz={scene(0-19), say(情景句), cards[{tier:'best'|'gray'|'bad',label}](2-3 张),
            kind('best2'|'grad3'), answer(best 卡下标), step(题号), miss}（r11 tier 模型）
  quickcmp  quiz={nL, nR, flash(1200|900), same, options(2|3), step(题号), miss}
  tictac r18 quiz 分题型（§-r18 §1-3）：battle/vroll={board[9]（vroll 另有 xq/oq FIFO 队列+moves）}、
            v44={board[16]}、puzzle={ptype('win1'|'block1'|'fork'),board[9],answer,round=题号1-5,
            step=flat*5+题号-1,miss 累计}；battle/v44 同旧域（round1-3/score0-3 步进0.5/miss 恒0）；
            章映射 CH_LEN=6：ch1-4=battle（dch1-4）/ch5=puzzle/ch6=v44/ch7=vroll/flat≥42=生成 battle
驱动策略：演出窗吞输入返回值不一（null/false）——统一重试循环带间隔（b34 坑④）
tictac 特殊：tapCell 空格='moved'/局终='win'|'draw'|'lose'/已占=false（b19 坑②终局字串分流不自动重开）
"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'comfort': 'CO', 'quickcmp': 'QC', 'tictac': 'TK'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码（禁 import 实现） ----
WRONG_WAIT = {'comfort': 6300, 'quickcmp': 5350, 'tictac': 0}
LB = {'comfort': 5898, 'quickcmp': 4938, 'tictac': 2748}        # T11 下界（SPEC §4；tk=§-r18 §5 2448+300）
# 生成关域+确定性抽点（tk r18 STATIC_LEVELS=42→生成域 42-61 §-r18 §1；co/qc=20 域不变）
GEN_RANGE = {'comfort': (20, 40), 'quickcmp': (20, 40), 'tictac': (42, 62)}
DET_FLATS = {'comfort': (22, 27, 33, 39), 'quickcmp': (22, 27, 33, 39), 'tictac': (44, 49, 55, 59)}
SEEDC = {'comfort': 757, 'quickcmp': 887, 'tictac': 911}
# comfort 题库 20 题静态全表（SPEC §6 r11 照录——verify 双录对账真值源）
# 结构：(情景句, [(label, tier), ...])——best2 恰 [best,gray] / grad3 恰 [best,gray,bad]；
# answer=唯一 best 下标（verify 独立推导）；复现句前后池同句异卡集——按卡数区分
CO_BANK = [
    ('小熊的冰淇淋掉了，好想吃', [('递自己的', 'best'), ('抱抱它', 'gray')]),
    ('小兔摔了一跤，膝盖流血了', [('找老师帮', 'best'), ('扶它起来', 'gray')]),
    ('小猫的积木塔塌了，好想搭好', [('一起搭', 'best'), ('说没关系', 'gray')]),
    ('小狗的风筝挂树上了，够不到', [('找大人帮', 'best'), ('换样玩', 'gray')]),
    ('小羊的水杯打翻了', [('拿纸巾', 'best'), ('等水干', 'gray')]),
    ('小猴想妈妈了，眼泪汪汪', [('陪它等', 'best'), ('给块糖', 'gray')]),
    ('小熊害怕打雷声，躲起来了', [('抱抱它', 'best'), ('陪它玩', 'gray')]),
    ('小兔跑步输了，好难过', [('说没关系', 'best'), ('再跑一次', 'gray')]),
    ('小猫的小汽车不见了', [('一起找', 'best'), ('抱抱它', 'gray')]),
    ('小狗把画画坏了，想哭', [('夸它努力', 'best'), ('陪它再画', 'gray')]),
    ('小熊的冰淇淋掉了，好想吃', [('递自己的', 'best'), ('抱抱它', 'gray'), ('笑话它', 'bad')]),
    ('小猴想妈妈了，眼泪汪汪', [('陪它等', 'best'), ('给块糖', 'gray'), ('催别哭', 'bad')]),
    ('小鸡的气球飞走了', [('再送一个', 'best'), ('陪它玩', 'gray'), ('说活该', 'bad')]),
    ('小兔跑步输了，好难过', [('说没关系', 'best'), ('再跑一次', 'gray'), ('嘲笑它', 'bad')]),
    ('小猪午睡被吵醒了', [('轻声说话', 'best'), ('拍拍它', 'gray'), ('大声吵', 'bad')]),
    ('小鹿的新鞋踩脏了', [('帮它擦', 'best'), ('说没关系', 'gray'), ('踩一脚', 'bad')]),
    ('小猫的小汽车不见了', [('帮着找', 'best'), ('抱抱它', 'gray'), ('藏起来偷笑', 'bad')]),
    ('小松鼠的拼图少一块', [('一起找', 'best'), ('夸它努力', 'gray'), ('推乱拼图', 'bad')]),
    ('小熊害怕打雷声', [('抱抱它', 'best'), ('陪它玩', 'gray'), ('关灯吓它', 'bad')]),
    ('小马摔破了膝盖，流血了', [('找老师帮', 'best'), ('扶它起来', 'gray'), ('说娇气', 'bad')]),
]
LINES = ((0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6))   # 井字胜线（独立硬编码）

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
async def q_comfort(pg, flat, k, q, dch):
    scene, say, cards = q.get('scene'), q.get('say'), q.get('cards') or []
    # 题库对账=say 反查 SPEC 全表（复现句前后池同句异卡集——按卡数区分；取材序是实现自由禁锁=b15 同源陷阱）
    ncards = 2 if dch in (1, 2) else 3
    if len(cards) != ncards:
        return 'f%dq%d ch%d 卡数=%d' % (flat, k, dch, len(cards))
    rows = [r_ for r_ in CO_BANK if r_[0] == say and len(r_[1]) == ncards]
    if not rows:
        return 'f%dq%d 情景句不在 SPEC 题库（%d 卡域）%s' % (flat, k, ncards, say)
    labels = [(c.get('label'), c.get('tier')) for c in cards]        # r11 tier 对账
    if set(labels) != set(rows[0][1]):
        return 'f%dq%d 卡集≠SPEC %s' % (flat, k, labels)
    bests = [i for i, c in enumerate(cards) if c.get('tier') == 'best']
    if len(bests) != 1:
        return 'f%dq%d best 卡非唯一 %s' % (flat, k, bests)
    if q.get('answer') != bests[0]:
        return 'f%dq%d answer≠唯一best' % (flat, k)
    r = await tap_retry(pg, '%s.tapCard(%d)' % (HOOK, bests[0]), ('right', 'done'))
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_quickcmp(pg, flat, k, q, dch):
    nL, nR, same = q.get('nL'), q.get('nR'), q.get('same')
    flash, options = q.get('flash'), q.get('options')
    # 域先验（SPEC §0.89 独立验算——nL/nR 可能数值型）
    try:
        nl, nr = int(nL), int(nR)
    except (TypeError, ValueError):
        return 'f%dq%d nL/nR=%s/%s 非数' % (flat, k, nL, nR)
    if (nl == nr) != bool(same):
        return 'f%dq%d same=%s vs %d/%d' % (flat, k, same, nl, nr)
    if dch == 1:
        if not (1 <= nl <= 5 and 1 <= nr <= 5 and abs(nl - nr) >= 1):
            return 'f%dq%d ch1 域 %d/%d' % (flat, k, nl, nr)
        if options != 2:
            return 'f%dq%d ch1 options=%s' % (flat, k, options)
        if flash != 1200:
            return 'f%dq%d ch1 flash=%s' % (flat, k, flash)
    elif dch == 2:
        if same:
            if not (2 <= nl <= 5):
                return 'f%dq%d ch2 等数域 %d' % (flat, k, nl)
        elif not (1 <= nl <= 5 and 1 <= nr <= 5 and abs(nl - nr) >= 1):
            return 'f%dq%d ch2 域 %d/%d' % (flat, k, nl, nr)
        if options != 3 or flash != 1200:
            return 'f%dq%d ch2 opt=%s flash=%s' % (flat, k, options, flash)
    elif dch == 3:
        if not (5 <= nl <= 10 and 5 <= nr <= 10 and abs(nl - nr) >= 2 and min(nl, nr) / max(nl, nr) <= 0.8):
            return 'f%dq%d ch3 Weber 域 %d/%d' % (flat, k, nl, nr)
        if options != 3 or flash != 900:
            return 'f%dq%d ch3 opt=%s flash=%s' % (flat, k, options, flash)
    else:
        okd = (1 <= nl <= 5 and 1 <= nr <= 5 and abs(nl - nr) >= 1) or \
              (5 <= nl <= 10 and 5 <= nr <= 10 and abs(nl - nr) >= 2 and min(nl, nr) / max(nl, nr) <= 0.8) or nl == nr
        if not okd:
            return 'f%dq%d ch4 域 %d/%d' % (flat, k, nl, nr)
        if options != 3 or flash != 900:
            return 'f%dq%d ch4 opt=%s flash=%s' % (flat, k, options, flash)
    # 答侧独立推导
    side = 'S' if nl == nr else ('L' if nl > nr else 'R')
    r = await tap_retry(pg, '(async () => { const q = %s.quiz; if (q && q.flash && document.querySelector("[data-flash]")) return "flash"; return await %s.tapSide("%s"); })()' % (HOOK, HOOK, side),
                        ('right', 'done'), timeout=30000)
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_tictac(pg, flat, k, q, dch):
    # 局驱动：tapCell 空格（首个空位贪心——autoSolve 才是最优，本函数只验合法推进）
    # [探针校准：局内驱动策略——终局字串 win/draw/lose 分流后 round 推进]
    r = await pg.evaluate('(async () => { const H = %s; const q = H.quiz; if (!q) return "noq";'
                          ' const i = q.board.findIndex(c => c === ""); if (i < 0) return "nocomplete";'
                          ' const rr = await H.tapCell(i); return rr === null ? "null" : (rr === false ? "false" : String(rr)); })()' % HOOK)
    return r   # 调用方按局终字串判定

QF = {'comfort': q_comfort, 'quickcmp': q_quickcmp, 'tictac': q_tictac}

async def audit_static(pg):
    bad = []
    if GAME == 'tictac':
        # r18 分题型逐关审计（SPEC §-r18 §1/§2/§3，期望独立硬编码禁从实现归纳）：
        # flat0-23 classic 四章 battle（miss 恒 0）/24-29 残局 puzzle（5 题 miss 制）/
        # 30-35 v44（board 16）/36-41 vroll（xq/oq FIFO 队列）——起关形状先验+autoSolve 通关复核
        for flat in range(42):
            kind = 'battle' if flat < 24 else 'puzzle' if flat < 30 else 'v44' if flat < 36 else 'vroll'
            await pg.evaluate('%s.start(%d)' % (HOOK, flat))
            q = None
            for _ in range(40):                        # 等题面/局面就绪
                q = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
                if q:
                    break
                await pg.wait_for_timeout(300)
            if not q:
                bad.append('f%d 无 quiz' % flat); continue
            if q.get('kind') != kind:
                bad.append('f%d kind=%s≠%s' % (flat, q.get('kind'), kind)); continue
            if kind == 'v44' and len(q.get('board') or []) != 16:
                bad.append('f%d v44 board=%d' % (flat, len(q.get('board') or [])))
            if kind == 'vroll' and not (isinstance(q.get('xq'), list) and isinstance(q.get('oq'), list)
                                        and isinstance(q.get('moves'), int)):
                bad.append('f%d vroll 队列缺' % flat)
            if kind == 'puzzle' and not (q.get('ptype') in ('win1', 'block1', 'fork')
                                         and isinstance(q.get('answer'), int)
                                         and q.get('board', [None] * 9)[q.get('answer', -1)] == ''):
                bad.append('f%d puzzle 题面 ptype=%s answer=%s' % (flat, q.get('ptype'), q.get('answer')))
            if len(bad) > 8:
                break
            for _ in range(240):                       # autoSolve 通关复核（won/n/miss/星域）
                if await pg.evaluate('%s.currentLevel.won' % HOOK):
                    break
                await pg.evaluate('%s.autoSolve()' % HOOK)
                await pg.wait_for_timeout(400)
            lv = json.loads(await pg.evaluate('JSON.stringify(%s.currentLevel)' % HOOK))
            if not lv.get('won'):
                bad.append('f%d 未通关' % flat); continue
            if lv.get('kind') != kind or lv.get('n') != (5 if kind == 'puzzle' else 3):
                bad.append('f%d n=%s kind=%s' % (flat, lv.get('n'), lv.get('kind')))
            if kind == 'puzzle':
                if lv.get('miss') != 0:                # autoSolve 全对=0 错（miss 制 §-r18 §1）
                    bad.append('f%d puzzle miss=%s' % (flat, lv.get('miss')))
                if lv.get('stars') != 3:
                    bad.append('f%d puzzle stars=%s' % (flat, lv.get('stars')))
            else:
                sc = lv.get('score')
                if not (isinstance(sc, (int, float)) and 0 <= sc <= 3 and (sc * 2) % 1 == 0):
                    bad.append('f%d score=%s' % (flat, sc))
                if lv.get('miss') != 0:                # 对战恒 0（策略款 SPEC 备案）
                    bad.append('f%d miss=%s' % (flat, lv.get('miss')))
                if flat < 6 and lv.get('stars') != 3:  # ch1 随机兔+最优=3.0（T8 局果档静态锚）
                    bad.append('f%d stars=%s' % (flat, lv.get('stars')))
            if len(bad) > 8:
                break
        return bad
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
                if not await poll_step(pg, k + 1, timeout=60000):
                    bad.append('f%dq%d 未推进' % (flat, k)); break
        if len(bad) > 8:
            break
    return bad

async def wrong_js(restart=True):
    rst = 'await H.start(10);' if restart else ''
    if GAME == 'comfort':
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
                ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || !q.cards) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const bad = q.cards.findIndex((c, j) => j !== q.answer);'
                ' const r = await H.tapCard(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
                ' return "noreach"; })()'
                ) % (HOOK, rst)
    if GAME == 'quickcmp':
        # 错=非答案侧（等数题错点 L）
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,1200));'
                ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || typeof q.nL !== "number") { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const s = q.nL === q.nR ? "L" : (q.nL > q.nR ? "R" : "L");'
                ' const r = await H.tapSide(s); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
                ' return "noreach"; })()'
                ) % (HOOK, rst)
    # tictac：先落一子（fresh 关棋盘全空）→点已占格（T6 分款——false+miss 恒 0）
    return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,800));'
            ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q) { await new Promise(w=>setTimeout(w,400)); continue; }'
            ' const emp = q.board.findIndex(c => c === ""); if (emp < 0) return "nospace";'
            ' const mv = await H.tapCell(emp);'
            ' if (mv === null || mv === false) { await new Promise(w=>setTimeout(w,400)); continue; }'
            ' const occ = H.quiz.board.findIndex(c => c !== ""); if (occ < 0) return "noocc";'
            ' const r = await H.tapCell(occ); return r === null ? "null" : (r === false ? "false" : String(r)); }'
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
        for flat in range(*GEN_RANGE[GAME]):
            r = await pg.evaluate('%s.start(%d), %s.currentLevel.dch' % (HOOK, flat, HOOK))
            gen.append(r)
        exp = [dch_reseed(f, SEEDC[GAME]) for f in range(*GEN_RANGE[GAME])]
        rec('T4 生成关 dch 独立复算对账+四型全现', gen == exp and set(gen) == {1, 2, 3, 4},
            'obs=%s exp_match=%s' % (gen, gen == exp))

        same = True
        for flat in DET_FLATS[GAME]:
            a = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            c = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        # T6 分款：co/qc=错选 wrong+miss 计 1；tk=已占格 false+miss 恒 0
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600)
        w1 = await pg.evaluate(await wrong_js(restart=False))
        m1 = await pg.evaluate('%s.quiz.miss' % HOOK)
        if GAME == 'tictac':
            rec('T6 已占格 false+miss 恒 0', w1 in ('false', 'null') and m1 == 0, 'r=%s miss=%s' % (w1, m1))
        else:
            rec('T6 错选 wrong+miss 计 1', w1 == 'wrong' and m1 == 1, 'r=%s miss=%s' % (w1, m1))
            await pg.wait_for_timeout(WRONG_WAIT[GAME])

        # T7 分款：co/qc=双错防重入；tk=已占格连点不炸（先落一子再连点已占格）
        if GAME == 'tictac':
            await pg.evaluate('%s.start(10)' % HOOK)
            await pg.wait_for_timeout(800)
            occ = await pg.evaluate('(async H => { for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q) continue;'
                                    ' const emp = q.board.findIndex(c => c === ""); if (emp < 0) return -1;'
                                    ' const mv = await H.tapCell(emp); if (mv !== null && mv !== false) return H.quiz.board.findIndex(c => c !== "");'
                                    ' await new Promise(w => setTimeout(w, 400)); } return -1; })(%s)' % HOOK)
            if occ is not None and occ >= 0:
                d1 = await pg.evaluate('(async () => { const r = await %s.tapCell(%d); return r === false || r === null ? "ok" : String(r); })()' % (HOOK, occ))
                d2 = await pg.evaluate('(async () => { const r = await %s.tapCell(%d); return r === false || r === null ? "ok" : String(r); })()' % (HOOK, occ))
                rec('T7 已占格连点不炸', d1 == 'ok' and d2 == 'ok', 'd1=%s d2=%s errs=%s' % (d1, d2, errs3[:2]))
            else:
                rec('T7 已占格连点不炸', False, '无可占格')
        else:
            await pg.evaluate('%s.start(10)' % HOOK)
            await pg.wait_for_timeout(600)
            if GAME == 'comfort':
                await pg.wait_for_timeout(1200)     # r11 情景句窗（12 字≈0.65s@SPEED.12）过后再直点——窗内 tapCard=null 吞
                dbl = ('(async()=>{const H=%s;const q=H.quiz;const bad=q.cards.findIndex((c,j)=>j!==q.answer);'
                       'const r=await H.tapCard(bad);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
            else:
                dbl = ('(async()=>{const H=%s;const q=H.quiz;const s=q.nL===q.nR?"L":(q.nL>q.nR?"R":"L");'
                       'const r=await H.tapSide(s);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
            d1 = await pg.evaluate(dbl)
            await pg.wait_for_timeout(40)
            d2 = await pg.evaluate(dbl)
            await pg.wait_for_timeout(WRONG_WAIT[GAME])
            m = await pg.evaluate('%s.quiz.miss' % HOOK)
            rec('T7 双错防重入 miss 只+1', d1 == 'wrong' and m == 1, 'd1=%s d2=%s miss=%s' % (d1, d2, m))

        # T8 分款：co/qc=星级三档（miss 口径）；tk=r18 星级双口径（对战分值三档+残局 miss 制）
        if GAME == 'tictac':
            # ch1 random 兔子+autoSolve 最优→预期全胜 3.0=3★
            await pg.evaluate('%s.start(0)' % HOOK)
            await pg.wait_for_timeout(600)
            await pg.evaluate('%s.autoSolve()' % HOOK)
            s_hi = None
            for _ in range(120):
                st = await pg.evaluate('%s.currentLevel' % HOOK)
                if st.get('won'):
                    s_hi = st['stars']; break
                await pg.wait_for_timeout(500)
            # 故意输：ch4 完美兔（r18 章映射 ch4=flat18-23——旧 15 已是 ch3）+连续点首空格不防守
            #（perfect 兔必全杀→0 分=1★ 完成）
            await pg.evaluate('%s.start(18)' % HOOK)
            await pg.wait_for_timeout(600)
            for _ in range(200):
                r = await pg.evaluate('(async () => { const H = %s; if (H.currentLevel.won) return "won";'
                                      ' const q = H.quiz; if (!q) return "noq"; const i = q.board.findIndex(c => c === "");'
                                      ' if (i < 0) return "full"; const rr = await H.tapCell(i); return String(rr); })()' % HOOK)
                if r == 'won':
                    break
                await pg.wait_for_timeout(400)
            s_lo = await pg.evaluate('%s.currentLevel.stars' % HOOK)
            # 残局 miss 制（§-r18 §1）：flat24 首 2 错（错链窗 2748 真时钟——分两次）→autoSolve 补完→2★
            await pg.evaluate('%s.start(24)' % HOOK)
            await pg.wait_for_timeout(500)
            wr = ('(async () => { const H = %s; const q = H.quiz; if (!q || q.kind !== "puzzle") return "noq";'
                  ' const i = q.board.findIndex((c, j) => c === "" && j !== q.answer); if (i < 0) return "nocomplete";'
                  ' const rr = await H.tapCell(i); return rr === null ? "null" : (rr === false ? "false" : String(rr)); })()' % HOOK)
            w1 = await tap_retry(pg, wr, ('wrong',), timeout=8000)
            await pg.wait_for_timeout(3100)             # 过窗（2448+300 真时钟）再错第 2 次
            w2 = await tap_retry(pg, wr, ('wrong',), timeout=8000)
            await pg.evaluate('%s.autoSolve()' % HOOK)
            s_pz = None
            for _ in range(90):
                st = await pg.evaluate('%s.currentLevel' % HOOK)
                if st.get('won'):
                    s_pz = st['stars']; break
                await pg.wait_for_timeout(500)
            rec('T8 星级双口径（对战分值+残局 miss）',
                s_hi == 3 and s_lo == 1 and s_pz == 2 and w1 == 'wrong' and w2 == 'wrong',
                '胜3★=%s 负1★=%s 残局2★=%s w=%s/%s' % (s_hi, s_lo, s_pz, w1, w2))
        else:
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
        if GAME == 'tictac':
            # r17 家族 A 双 lim-1（启动+winFlow 两处——日末停留 Math.max；无 null 形态）
            rec('T9 家族 A r17 双 lim-1（无 null 形态）',
                len(re.findall(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js)) == 2 and
                re.search(r'nextHint\(\s*null\s*\)', main_js) is None and
                re.search(r'Math\.max\(\s*0\s*,\s*lim\s*-\s*1\s*\)', main_js) is not None)
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
        if GAME == 'tictac':                            # r18：7 章（§-r18 §1）+生成域 42-61 抽点实算
            n_hint, gen_flats = 7, [47, 53, 59]
        else:
            n_hint, gen_flats = 4, [24, 29, 34, 39]
        sem = (len(hints) == n_hint and all(len(h) >= 4 for h in hints) and len(gh) == 4 and
               all(len(x) >= 4 for x in gh))
        genok = await pg.evaluate('%s.every(f => nextHint(f) === GEN_HINTS[genLevel(f+1).dch-1])'
                                  % json.dumps(gen_flats))
        rec('T10 C7 预告在场+生成关实算', sem and genok,
            'hints=%d/%d gh=%d genok=%s' % (len(hints), n_hint, len(gh), genok))
        await ctx.close()

        # T11 分款：co/qc=契约 I+N 豁免窗下界；tk=r18 契约 I 残局错链（窗 2448+300+guard+重置+让路+
        # 行为三态：错计1/窗内吞/窗后计2）+J 语义句节流+N keyless 恒尾（SPEC §-r18 §5——独立硬编码）
        if GAME == 'tictac':
            lit_win = 'WRONG_CHAIN_WIN = 2448 + 300' in main_js
            guard = 'if (wrongChainUntil && Date.now() < wrongChainUntil)' in main_js
            reset = 'wrongChainUntil = 0; lastWrongVoice = 0;' in main_js
            yield_w = 'if (Date.now() < wrongChainUntil) return;' in main_js
            throttle = 'now - lastWrongVoice > 10000' in main_js
            n_static = True
            for m in re.finditer(r'\{\s*key:\s*null[^}]*\}\s*(\S)', main_js):
                if m.group(1) != ']':
                    n_static = False
            ctx11 = await b.new_context()
            pg11 = await ctx11.new_page()
            await pg11.goto(URL_V)
            await wait_verify_title(pg11)
            await pg11.evaluate('%s.start(24)' % HOOK)
            await pg11.wait_for_timeout(500)
            wr11 = ('(async () => { const H = %s; const q = H.quiz; if (!q || q.kind !== "puzzle") return "noq";'
                    ' const i = q.board.findIndex((c, j) => c === "" && j !== q.answer); if (i < 0) return "nocomplete";'
                    ' const rr = await H.tapCell(i); return rr === null ? "null" : (rr === false ? "false" : String(rr)); })()' % HOOK)
            w1 = await tap_retry(pg11, wr11, ('wrong',), timeout=8000)   # 错 1：miss=1+设窗
            m1 = await pg11.evaluate('%s.quiz.miss' % HOOK)
            w2 = await tap_retry(pg11, wr11, ('false',), timeout=1600)   # 窗内同错：吞（false+miss 不增）
            m2 = await pg11.evaluate('%s.quiz.miss' % HOOK)
            await pg11.wait_for_timeout(3100)                             # 过窗（2748 真时钟）
            w3 = await tap_retry(pg11, wr11, ('wrong',), timeout=8000)   # 窗后照计：miss=2
            m3 = await pg11.evaluate('%s.quiz.miss' % HOOK)
            await ctx11.close()
            rec('T11 契约 I r18 残局错链窗+N 恒尾',
                lit_win and guard and reset and yield_w and throttle and n_static and
                w1 == 'wrong' and m1 == 1 and w2 == 'false' and m2 == 1 and w3 == 'wrong' and m3 == 2,
                'win=%s guard=%s reset=%s yield=%s J=%s N尾=%s 行为=%s/%s/%s miss=%s/%s/%s' %
                (lit_win, guard, reset, yield_w, throttle, n_static, w1, w2, w3, m1, m2, m3))
        else:
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
