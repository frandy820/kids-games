# -*- coding: utf-8 -*-
"""batch39 独立复验：crd / etm / cir（断言从 SPEC-BATCH39 推导，期望值独立硬编码）
用法: python verify_batch39.py <crd|etm|cir>
错链豁免窗（SPEC §4 实长表 r12）：crd 四链窗 like4626/clash4554/wish4674/theme5010（max 5010）
/etm 4626/cir 4266——wrong 后等窗再驱动 5100/4700/4400
钩子形状（SPEC §1-3；crd r12 表驱动 2026-09-15；探针=钩子枚举定形状；真实 DOM 点击验证由各款 _src/_selftest.py 承担）：
  crd  quiz={scene(题表行号), kind('like'|'clash'|'wish'|'mix'), occ(场合), who(收卡人),
            stage(题内步号), nstage(2|3), col('bg'|'st'|'wish'), picks[](候选 id 3), answer,
            step(全关题号), miss, say(线索句), h(步型 like/clash/wish/theme)}；
       tapPick 枚举 placed/done/wrong/null(+false 豁免吞)
  etm  quiz={scene, kind('face'|'level'), text, picks[](族全集 4/3), answer, step, miss, say}；
       tapPick 枚举 picked/done/wrong/null
  cir  quiz={slots[{i,fixed,part,on}], blank, picks[](S/M/L 3), answer, needSize, bunny, bunnySize,
            step, miss, say}；tapPart 枚举 lit/done/wrong/null(+false)；hook 另含 reread
b38 六坑预防：独立表照实现 id 抄录（crd r12 题表 20 行+wish 5 枚 wkang；etm scene id 表；cir 固定槽 part 恒 'M'）
  /crd 连选驱动 nstage 步每步重读 quiz/锁窗总窗口径 T11 提取含尾窗常数（r12 CHAIN_WIN 对象四值提取）
"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'crd': 'CRD', 'etm': 'ETM', 'cir': 'CIR'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码（禁 import 实现；id 照实现 data.js 抄录——r12 题表 2026-09-15） ----
WRONG_WAIT = {'crd': 5100, 'etm': 4700, 'cir': 4400}
LBWIN = {'crd': 4554, 'etm': 4626, 'cir': 4266}              # T11 下界（SPEC §4 r12 四链窗最小值 clash 4554）
SEEDC = {'crd': 857, 'etm': 867, 'cir': 877}                 # 三款均 seeded dch（§0.94-96）
OPEN_WAIT = {'crd': 4800, 'etm': 6000, 'cir': 5000}          # T7 dbl 前开题句窗余量（探针实证窗 4.4/5.1/4.6s+边距）

# crd r12 题表（实现 SPEC_TABLE 照录——(kind, occ, who, nstage, [(correct, d1, d2)×步])；
# 偏好/冲突/语用三 delta 表驱动判定；wish id 定版 wbd/wny/wth/wsr/wkang）
CRD_COLS = ('bg', 'st', 'wish')
CRD_ROWS = [  # flat0-19（ch1 like/ch2 clash 两步；ch3 wish/ch4 mix 三步）
    ('like', 'birthday', 'grandma', 2, [('clouds', 'flags', 'lant'), ('flower', 'cake', 'heart')]),
    ('like', 'newyear', 'monkey', 2, [('hearts', 'lant', 'flags'), ('bear', 'lant2', 'heart')]),
    ('like', 'newyear', 'grandma', 2, [('clouds', 'lant', 'hearts'), ('flower', 'lant2', 'bear')]),
    ('like', 'birthday', 'monkey', 2, [('hearts', 'flags', 'lant'), ('bear', 'cake', 'heart')]),
    ('like', 'birthday', 'friend', 2, [('flags', 'clouds', 'hearts'), ('cake', 'horn', 'heart')]),
    ('clash', 'newyear', 'friend', 2, [('lant', 'flags', 'hearts'), ('lant2', 'tree', 'cake')]),
    ('clash', 'newyear', 'friend', 2, [('lant', 'hearts', 'clouds'), ('lant2', 'tree', 'heart')]),
    ('clash', 'birthday', 'friend', 2, [('flags', 'lant', 'clouds'), ('cake', 'mum', 'lant2')]),
    ('clash', 'birthday', 'friend', 2, [('flags', 'hearts', 'clouds'), ('cake', 'mum', 'bear')]),
    ('clash', 'newyear', 'friend', 2, [('lant', 'clouds', 'flags'), ('lant2', 'tree', 'bear')]),
    ('wish', 'birthday', 'grandma', 3, [('flags', 'lant', 'hearts'), ('cake', 'heart', 'bear'), ('wbd', 'wny', 'wth')]),
    ('wish', 'sick', 'grandma', 3, [('hearts', 'flags', 'lant'), ('heart', 'cake', 'lant2'), ('wkang', 'wbd', 'wth')]),
    ('wish', 'thanks', 'teacher', 3, [('hearts', 'flags', 'clouds'), ('heart', 'cake', 'lant2'), ('wth', 'wbd', 'wsr')]),
    ('wish', 'sick', 'monkey', 3, [('hearts', 'clouds', 'lant'), ('heart', 'cake', 'lant2'), ('wkang', 'wny', 'wbd')]),
    ('wish', 'newyear', 'grandma', 3, [('lant', 'flags', 'hearts'), ('lant2', 'heart', 'bear'), ('wny', 'wbd', 'wkang')]),
    ('mix', 'birthday', 'grandma', 3, [('clouds', 'flags', 'lant'), ('flower', 'cake', 'heart'), ('wbd', 'wkang', 'wth')]),
    ('mix', 'newyear', 'friend', 3, [('lant', 'flags', 'hearts'), ('lant2', 'tree', 'cake'), ('wny', 'wbd', 'wkang')]),
    ('mix', 'sick', 'monkey', 3, [('hearts', 'clouds', 'lant'), ('bear', 'heart', 'cake'), ('wkang', 'wny', 'wth')]),
    ('mix', 'birthday', 'friend', 3, [('flags', 'lant', 'clouds'), ('cake', 'mum', 'heart'), ('wbd', 'wny', 'wsr')]),
    ('mix', 'newyear', 'monkey', 3, [('hearts', 'lant', 'flags'), ('bear', 'lant2', 'heart'), ('wny', 'wbd', 'wkang')]),
]
# etm 20 题 (scene, kind, text, ans) 照实现题表逐字
ETM_BANK = [
    ('flower', 'face', '朋友送你一朵小花', 'happy'),
    ('blocksdown', 'face', '妹妹把你的积木推倒了', 'angry'),
    ('balloonfly', 'face', '心爱的气球飞走了', 'sad'),
    ('thunder', 'face', '打雷轰隆隆响', 'scared'),
    ('singsong', 'face', '大家一起唱歌', 'happy'),
    ('painting', 'face', '你的画被弄坏了', 'sad'),
    ('shoutloud', 'face', '有人对你大喊大叫', 'scared'),
    ('towertop', 'face', '你搭的高塔成功了', 'happy'),
    ('grabtoy', 'face', '玩具被人抢走了', 'angry'),
    ('lostmom', 'face', '迷路找不到妈妈', 'scared'),
    ('crayondrop', 'level', '有人不小心碰掉了你的蜡笔', 'l1'),
    ('snatchtoy', 'level', '有人抢走你手里的玩具', 'l2'),
    ('ruinlaugh', 'level', '有人弄坏了你的画还笑你', 'l3'),
    ('stepfoot', 'level', '排队时被轻轻踩了一脚', 'l1'),
    ('swinggrab', 'level', '有人一直抢你的秋千', 'l2'),
    ('interrupt', 'level', '你说话总是被人打断', 'l2'),
    ('castlekick', 'level', '辛苦搭的城堡被故意踢倒', 'l3'),
    ('paintspill', 'level', '画画时颜料被碰撒了一点', 'l1'),
    ('tearbook', 'level', '有人撕了你的故事书还做鬼脸', 'l3'),
    ('longwait', 'level', '等了很久的玩具又被拿走了', 'l2'),
]
ETM_FACES = ('happy', 'angry', 'sad', 'scared')
ETM_LEVELS = ('l1', 'l2', 'l3')
# cir 20 题 (nslots, blank, needSize, bunny, bunnySize) 照实现题表逐行
CIR_TABLE = [
    (3, 1, 'M', -1, None), (3, 2, 'L', -1, None), (3, 0, 'S', -1, None), (3, 1, 'L', -1, None), (3, 2, 'M', -1, None),
    (3, 0, 'M', -1, None), (3, 1, 'S', -1, None), (3, 2, 'L', -1, None), (3, 1, 'M', -1, None), (3, 0, 'L', -1, None),
    (5, 2, 'M', 1, 'S'), (5, 3, 'L', 2, 'M'), (5, 2, 'S', 1, 'L'), (5, 3, 'M', 2, 'S'), (5, 2, 'L', 1, 'M'),
    (5, 2, 'M', 1, 'S'), (5, 3, 'L', 2, 'M'), (5, 2, 'S', 1, 'L'), (5, 3, 'M', 2, 'S'), (5, 2, 'L', 1, 'M'),
]

def dch_reseed(flat, c):
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
    r = None
    for _ in range(int(timeout / 400)):
        r = await pg.evaluate('(async () => { const r = await (%s); return r === null ? "null" : (r === false ? "false" : String(r)); })()' % expr)
        if r in wants:
            return r
        await pg.wait_for_timeout(400)
    return r

# ---------- T3 每题审计 ----------
# 题值索引口径（_dump39 三款实证+数据层注释「每章封闭题池 5 题，关内 rotate 取题——thanks 先例」）：
#   题(flat,k) = 表行[(flat//5)*5 + ((flat%5)+k)%5]——20 行表=4 章池×5 行，非关级线性表
def rowidx(flat, k):
    return (flat // 5) * 5 + ((flat % 5) + k) % 5

async def q_crd(pg, flat, k, q, dch):
    """§1 r12 锚：题表行 (kind,occ,who,nstage,steps) 按章池+rotate 行对账（scene/kind/occ/who/nstage/say
    由 audit_static 外层 q 读表核对——此处逐步）；nstage 章常数（ch1-2=2/ch3-4=3）；
    col=CRD_COLS[stage]；picks=同列 3 枚含表 correct；answer=picks.indexOf(correct)；
    驱动=nstage 连选每步重读 quiz（b38 坑③）"""
    kind, occ, who, nstage, steps = CRD_ROWS[rowidx(flat, k)]
    if q.get('kind') != kind or q.get('occ') != occ or q.get('who') != who:
        return 'f%dq%d k/o/w=%s/%s/%s≠%s/%s/%s' % (flat, k, q.get('kind'), q.get('occ'), q.get('who'), kind, occ, who)
    if q.get('nstage') != nstage:
        return 'f%dq%d nstage=%s≠%s' % (flat, k, q.get('nstage'), nstage)
    exp_dch = {2: (1, 2), 3: (3, 4)}[nstage]
    if dch not in exp_dch:
        return 'f%dq%d ch%d nstage=%d 域错' % (flat, k, dch, nstage)
    for st in range(nstage):
        qq = None
        for _ in range(25):  # 换盘窗 ~400ms——轮询等 quiz 到达本步（b38 坑③连选驱动）
            cand = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            if cand and cand.get('stage') == st and cand.get('col') == CRD_COLS[st]:
                qq = cand
                break
            await pg.wait_for_timeout(400)
        if qq is None:
            return 'f%dq%d s%d quiz 未达 stage/col=%s/%s' % (flat, k, st, cand and cand.get('stage'), cand and cand.get('col'))
        good = steps[st][0]                                  # r12 表步三元组 correct
        picks = qq.get('picks') or []
        if len(picks) != 3 or good not in picks:
            return 'f%dq%d s%d picks=%s 缺正确 %s' % (flat, k, st, picks, good)
        if qq.get('answer') != picks.index(good):
            return 'f%dq%d s%d answer≠indexOf(正确)' % (flat, k, st)
        r = await tap_retry(pg, '%s.tapPick(%d)' % (HOOK, picks.index(good)), ('placed', 'done'))
        if r not in ('placed', 'done'):
            return 'f%dq%d s%d tap=%s' % (flat, k, st, r)
    return None

async def q_etm(pg, flat, k, q, dch):
    """§2 锚：scene→ETM_BANK 行对账（章池+rotate 索引；kind/text/ans）；picks=族全集；answer=indexOf(ans)"""
    scene, kind, text, ans = ETM_BANK[rowidx(flat, k)]
    if q.get('scene') != scene or q.get('kind') != kind:
        return 'f%dq%d scene=%s kind=%s（期 %s/%s）' % (flat, k, q.get('scene'), q.get('kind'), scene, kind)
    if q.get('text') != text:
        return 'f%dq%d text≠题表' % (flat, k)
    want = ETM_FACES if kind == 'face' else ETM_LEVELS
    picks = q.get('picks') or []
    if sorted(picks) != sorted(want):
        return 'f%dq%d picks=%s≠族全集' % (flat, k, picks)
    if q.get('answer') != picks.index(ans):
        return 'f%dq%d answer≠indexOf(%s)' % (flat, k, ans)
    r = await tap_retry(pg, '%s.tapPick(%d)' % (HOOK, picks.index(ans)), ('picked', 'done'))
    return None if r in ('picked', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_cir(pg, flat, k, q, dch):
    """§3 锚：槽数按 ch/blank 槽 part=null+兔槽 part=bunnySize/answer=picks.indexOf(needSize)
    /needSize+bunny+bunnySize 与表逐字段（章池+rotate 索引）/picks 恒 S/M/L"""
    nslots, blank, needSize, bunny, bunnySize = CIR_TABLE[rowidx(flat, k)]
    slots = q.get('slots') or []
    if len(slots) != nslots:
        return 'f%dq%d 槽数=%d≠%d' % (flat, k, len(slots), nslots)
    exp_dch = {3: (1, 2), 5: (3, 4)}[nslots]
    if dch not in exp_dch:
        return 'f%dq%d ch%d nslots=%d 域错' % (flat, k, dch, nslots)
    if q.get('blank') != blank or q.get('needSize') != needSize:
        return 'f%dq%d blank/needSize=%s/%s≠%s/%s' % (flat, k, q.get('blank'), q.get('needSize'), blank, needSize)
    if q.get('bunny') != bunny or q.get('bunnySize') != bunnySize:
        return 'f%dq%d bunny=%s/%s≠%s/%s' % (flat, k, q.get('bunny'), q.get('bunnySize'), bunny, bunnySize)
    for s in slots:
        if s.get('i') == blank:
            if s.get('part') is not None or s.get('fixed'):
                return 'f%dq%d blank 槽非空' % (flat, k)
        elif bunny >= 0 and s.get('i') == bunny:
            if s.get('part') is not None or s.get('fixed'):
                return 'f%dq%d 兔槽非空（待兔补齐）part=%s' % (flat, k, s.get('part'))
    picks = q.get('picks') or []
    if sorted(picks) != ['L', 'M', 'S']:
        return 'f%dq%d picks=%s≠S/M/L' % (flat, k, picks)
    if q.get('answer') != picks.index(needSize):
        return 'f%dq%d answer≠indexOf(needSize)' % (flat, k)
    r = await tap_retry(pg, '%s.tapPart(%d)' % (HOOK, picks.index(needSize)), ('lit', 'done'), timeout=20000)
    return None if r in ('lit', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

QF = {'crd': q_crd, 'etm': q_etm, 'cir': q_cir}

async def audit_static(pg):
    bad = []
    for flat in range(20):
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(400)
        lv = json.loads(await pg.evaluate('JSON.stringify(%s.currentLevel)' % HOOK))
        dch = lv.get('dch')
        for k in range(5):
            q = None  # 换题/送出演出窗内 quiz 可空——轮询等本题（quiz.step==k）
            for _ in range(25):
                cand = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
                if cand and cand.get('step') == k:
                    q = cand
                    break
                await pg.wait_for_timeout(400)
            if q is None:
                bad.append('f%dq%d quiz 未达' % (flat, k)); break
            err = await QF[GAME](pg, flat, k, q, dch)
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
    if GAME == 'crd':
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
                ' for (let i = 0; i < 50; i++) { const q = H.quiz; if (!q || !q.picks) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const bad = q.picks.findIndex((p, j) => j !== q.answer);'
                ' const r = await H.tapPick(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
                ' return "noreach"; })()'
                ) % (HOOK, rst)
    if GAME == 'etm':
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
                ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || !q.picks) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const bad = q.picks.findIndex((p, j) => j !== q.answer);'
                ' const r = await H.tapPick(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
                ' return "noreach"; })()'
                ) % (HOOK, rst)
    return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
            ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || !q.picks) { await new Promise(w=>setTimeout(w,400)); continue; }'
            ' const bad = q.picks.findIndex((p, j) => j !== q.answer);'
            ' const r = await H.tapPart(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
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

        # T7：双错防重入 miss 只+1——开题句窗余量后单次直点
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600)
        await pg.wait_for_timeout(OPEN_WAIT[GAME])
        tap = 'tapPick' if GAME != 'cir' else 'tapPart'
        dbl = ('(async()=>{const H=%s;const q=H.quiz;const bad=q.picks.findIndex((p,j)=>j!==q.answer);'
               'const r=await H.%s(bad);return r===null?"null":(r===false?"false":String(r));})()' % (HOOK, tap))
        d1 = await pg.evaluate(dbl)
        await pg.wait_for_timeout(40)
        d2 = await pg.evaluate(dbl)
        await pg.wait_for_timeout(WRONG_WAIT[GAME])
        m = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T7 双错防重入 miss 只+1', d1 == 'wrong' and m == 1, 'd1=%s d2=%s miss=%s' % (d1, d2, m))

        # T8：星级三档
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

        # T11：契约 I+N 豁免窗≥下界（总窗口径：提取算式值——含常量与表达式和）+keyless 恒尾
        vals = []
        for x in re.findall(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*([A-Za-z0-9_]+)', main_js):
            if x.isdigit():
                vals.append(int(x))
            elif GAME == 'crd' and x == 'CHAIN_WIN':
                # r12 分流形态：wrongChainUntil = Date.now() + CHAIN_WIN[st.h]——
                # 链窗为对象字面量四值（like4626/clash4554/wish4674/theme5010），
                # 从 data.js CHAIN_WIN 对象提取全部数值（下界=四值最小 4554）。
                # 注意须先于通用常量正则：([\d+\s]+) 含 \s 可回溯只匹配到 '=' 后
                # 一个空格（'CHAIN_WIN = {' 形态）——假真值 sum=0 击穿下界
                obj = re.search(r'CHAIN_WIN\s*=\s*\{([^}]*)\}', data_js)
                if obj:
                    vals.extend(int(v) for v in re.findall(r':\s*(\d+)', obj.group(1)))
            else:
                c = re.search(r'\b%s\s*=\s*([\d+\s]+)' % re.escape(x), main_js) or \
                    re.search(r'\b%s\s*=\s*([\d+\s]+)' % re.escape(x), data_js)
                if c:
                    vals.append(sum(int(t) for t in c.group(1).split('+') if t.strip()))
        n_win = min(vals, default=0)   # m10：注释「四值最小」口径——min 对比 LBWIN=4554（原 max 弱于注释）
        guard = 'Date.now() < wrongChainUntil' in main_js
        reset = re.search(r'lastWrongVoice\s*=\s*0;\s*wrongChainUntil\s*=\s*0', main_js) is not None
        n_static = True
        for m in re.finditer(r'\{\s*key:\s*null[^}]*\}\s*(\S)', main_js):
            if m.group(1) != ']':
                n_static = False
        rec('T11 契约 I+N 豁免窗≥下界+keyless 恒尾', n_win >= LBWIN[GAME] and guard and reset and n_static,
            'N=%d 下界=%d guard=%s reset=%s keyless静态=%s' % (n_win, LBWIN[GAME], guard, reset, n_static))
        await b.close()
    fails = [n for n, ok in RES if not ok]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)

asyncio.run(main())
