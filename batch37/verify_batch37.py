# -*- coding: utf-8 -*-
"""batch37 独立复验：thanks / plant / teach（断言从 SPEC-BATCH37 推导，期望值独立硬编码）
用法: python verify_batch37.py <thanks|plant|teach>
口径：verify 页 (?verify=1)；错链豁免窗内错点被吞——wrong 后等过窗再驱动：
     th≈4800（链=wrong2040+150+hint1944+300=4434）/ pl≈5500（=2064+150+2568+300=5082）
     / tch≈5200（=2064+150+2352+300=4866）
钩子形状（SPEC §1-3；agent 交付后探针实证校准）：
  thanks  quiz={scene(0-19), kind(fit|size|anti), say(情景句), cards[{tier(best|gray|bad|ok),label}](2-3), answer(答案卡下标), step(题号), miss}——r12：answer=fit/size 唯一 best/anti 唯一 bad
  plant   quiz={row(1-N), col(1-N), n(3|4), planted[](扁平下标), card('第X行第Y列'), step(题号), miss}
          tapCell 枚举 planted/done/wrong/false(已种)/null(演出窗)——开题窗=ask+卡句×SPEED，探针分段等窗实证
  teach   quiz={phase('show'|'rabbit'|'fix'), n, m(fix 真值), bowl(show 进度), delta(±1), cards[](fix 两卡), answer, step, miss}
          tapApple(i)=托盘槽位（苹果点走后重排——循环点 0 槽，b23 坑① share 同款）；tapFix 枚举 right/done/wrong/null
主线锁域不锁流：plant 坐标/teach 逐题取数的 seeded 流复算在 agent selftest ③ 已过（G1 复跑），
主线独立锚=SPEC 域约束+互异+确定性（b36 坑③取材序禁锁精神）
"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'thanks': 'TH', 'plant': 'PL', 'teach': 'TCH'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码（禁 import 实现） ----
WRONG_WAIT = {'thanks': 4800, 'plant': 5500, 'teach': 5200}
LB = {'thanks': 4434, 'plant': 5082, 'teach': 4866}           # T11 下界（SPEC §4 独立验算）
SEEDC = {'thanks': 727, 'plant': 737, 'teach': 747}           # plant=静态 dch 档（T4 分款）
# thanks 题库 20 题静态全表（SPEC §7 r12 现行版照录——verify 双录对账真值源）
# 结构：(情景句, kind, [(label, tier), ...])——answer=fit/size 唯一 best / anti 唯一 bad
# （对账用 set 多重集比较，呈现序是实现自由；同 label 跨情景 tier 翻转=SPEC §7 反启发式设计）
TH_BANK = [
    ('小鹿老师帮你捡蜡笔', 'fit', [('鞠躬说谢谢', 'best'), ('大声说谢谢', 'gray')]),
    ('小鹿老师帮你修小车', 'fit', [('鞠躬说谢谢', 'best'), ('击掌说谢谢', 'gray')]),
    ('小鹿老师递给你一本书', 'fit', [('鞠躬说谢谢', 'best'), ('说声谢谢', 'gray')]),
    ('小鹿老师帮你搬积木', 'fit', [('鞠躬说谢谢', 'best'), ('大声说谢谢', 'gray')]),
    ('下雨小鹿老师给你撑伞', 'fit', [('鞠躬说谢谢', 'best'), ('击掌说谢谢', 'gray')]),
    ('熊奶奶帮你找帽子', 'fit', [('抱抱奶奶', 'best'), ('鞠躬说谢谢', 'gray')]),
    ('熊奶奶给你留了蛋糕', 'fit', [('抱抱奶奶', 'best'), ('说声谢谢', 'gray')]),
    ('小猴陪你搭好了积木', 'fit', [('击掌说谢谢', 'best'), ('鞠躬说谢谢', 'gray')]),
    ('小狗帮你推秋千', 'fit', [('大声说谢谢', 'best'), ('鞠躬说谢谢', 'gray')]),
    ('小猴帮你修好了小车', 'fit', [('击掌说谢谢', 'best'), ('鞠躬说谢谢', 'gray')]),
    ('小兔帮你找回了玩具球', 'size', [('抱抱它', 'best'), ('小声说谢谢', 'gray'), ('转身就走', 'bad')]),
    ('小羊递给你一张纸', 'size', [('小声说谢谢', 'best'), ('送朵小花', 'gray'), ('一声不吭', 'bad')]),
    ('小狗陪你等到了妈妈', 'size', [('大声说谢谢', 'best'), ('小声说谢谢', 'gray'), ('说好无聊', 'bad')]),
    ('小鸡借你一支蜡笔', 'size', [('小声说谢谢', 'best'), ('抱抱它', 'gray'), ('嫌它小气', 'bad')]),
    ('小猪分给你半块蛋糕', 'size', [('抱抱它', 'best'), ('小声说谢谢', 'gray'), ('嫌蛋糕小', 'bad')]),
    ('赛跑你输给了小狗', 'anti', [('对他说谢谢', 'ok'), ('说恭喜你呀', 'ok'), ('说我不玩了', 'bad')]),
    ('小松鼠抢走了你的玩具', 'anti', [('大声说还给我', 'ok'), ('请老师帮忙', 'ok'), ('对他说谢谢', 'bad')]),
    ('小马排队插到你前面', 'anti', [('说请你排队', 'ok'), ('请老师帮忙', 'ok'), ('说谢谢你呀', 'bad')]),
    ('小猪弄脏了你的画', 'anti', [('说没关系', 'ok'), ('和她再画', 'ok'), ('叫她小笨蛋', 'bad')]),
    ('下棋小猫赢了你', 'anti', [('说恭喜你呀', 'ok'), ('约下次再玩', 'ok'), ('说她耍赖了', 'bad')]),
]

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
async def q_thanks(pg, flat, k, q, dch):
    """r12 口径：kind 域（ch1-2 fit/ch3 size/ch4 anti——章档 kind-pure）+tier 多重集
    对账+answer 按 kind 分流独立推导（fit/size=唯一 best / anti=唯一 bad）"""
    say, kind, cards = q.get('say'), q.get('kind'), q.get('cards') or []
    ncards = 2 if dch in (1, 2) else 3          # ch1-2 两选/ch3-4 三选（SPEC §7 章档卡数不变）
    if len(cards) != ncards:
        return 'f%dq%d ch%d 卡数=%d' % (flat, k, dch, len(cards))
    rows = [r_ for r_ in TH_BANK if r_[0] == say and r_[1] == kind and len(r_[2]) == ncards]
    if not rows:
        return 'f%dq%d 情景句/kind 不在 SPEC 题库（%d 卡域）%s/%s' % (flat, k, ncards, say, kind)
    labels = [(c.get('label'), c.get('tier')) for c in cards]
    if set(labels) != set(rows[0][2]):
        return 'f%dq%d 卡集≠SPEC %s' % (flat, k, labels)
    want = 'bad' if kind == 'anti' else 'best'  # r12 答案档分流（anti 反向=点不该说的）
    goods = [i for i, c in enumerate(cards) if c.get('tier') == want]
    if len(goods) != 1:
        return 'f%dq%d 答案卡非唯一 %s' % (flat, k, goods)
    if q.get('answer') != goods[0]:
        return 'f%dq%d answer≠唯一%s' % (flat, k, want)
    r = await tap_retry(pg, '%s.tapCard(%d)' % (HOOK, goods[0]), ('right', 'done'))
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_plant(pg, flat, k, q, dch):
    """域约束锚（SPEC §0.89）：n=3|3|4|4 按 ch；row/col∈[1,n]；关内 5 格互异（seeded 流复算在
    selftest ③——主线不锁取数流）"""
    n, row, col = q.get('n'), q.get('row'), q.get('col')
    planted = q.get('planted') or []
    exp_n = 3 if dch in (1, 2) else 4
    if n != exp_n:
        return 'f%dq%d n=%s≠%d' % (flat, k, n, exp_n)
    if not (isinstance(row, int) and isinstance(col, int) and 1 <= row <= n and 1 <= col <= n):
        return 'f%dq%d 坐标越域 %s/%s' % (flat, k, row, col)
    card = q.get('card') or ''
    # 卡句骨架=「第X行第Y列」（6 字——数字可为一二三四，域 1-4 单字）
    if not re.match(r'^第[一二三四]行第[一二三四]列$', card):
        return 'f%dq%d 卡句形态 %s' % (flat, k, card)
    numcn = {'一': 1, '二': 2, '三': 3, '四': 4}
    if numcn.get(card[1]) != row or numcn.get(card[4]) != col:
        return 'f%dq%d 卡句≠坐标 %s vs %d/%d' % (flat, k, card, row, col)
    target = (row - 1) * n + (col - 1)
    if target in planted:
        return 'f%dq%d 目标格已种 %s' % (flat, k, planted)
    if len(set(planted)) != len(planted):
        return 'f%dq%d planted 含重复 %s' % (flat, k, planted)
    r = await tap_retry(pg, '%s.tapCell(%d)' % (HOOK, target), ('planted', 'done'), timeout=20000)
    return None if r in ('planted', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_teach(pg, flat, k, q, dch):
    """三步小课驱动（python 侧轮询——页内 30s 长 evaluate 在多浏览器并行下 renderer 崩溃
    TargetClosed 教训，b37 首跑实证；每次 evaluate ≤2s）：
    段1 show 循环 tapApple(0)（页内 N≤7×120ms 短循环）→段2 python 轮询 fix→段3 域断言+tapFix 重试
    域锚（SPEC-BATCH37 §6 r5 定版，2026-09-19 与 build.py NDOM/卡模板断言同源）：
    N 域 ch1[4,9]/ch2[4,9]/ch3[10,20]/ch4[6,20]；m=seq.length（skip=n-1/dup=n+1/swap=n）；
    好卡 label=skip'漏数了X'/dup'X数了两遍'/swap'数反了'（pre-r5 的 δ±1+拿走/再加口径已废）"""
    ndom = {1: (4, 9), 2: (4, 9), 3: (10, 20), 4: (6, 20)}.get(dch)
    # 段1：show 驱动（点满 N 个入碗——页内短循环）
    r1 = await pg.evaluate('''(async () => { const H = %s;
        let g = 0;
        while (g++ < 90 && H.quiz && H.quiz.phase === 'show') {
            const q = H.quiz;
            if (q.n >= 10 && q.group === 1) { await H.setGroup(5); await new Promise(w => setTimeout(w, 90)); continue; }
            const idx = q.group > 1 ? Math.floor(q.bowl / q.group) : q.bowl;
            await H.tapApple(idx);
            await new Promise(w => setTimeout(w, 90));
        }
        return H.quiz ? H.quiz.phase : 'noquiz';
    })()''' % HOOK)
    # 段2：python 轮询等 fix（rabbit 演出窗——只读 phase 的短 evaluate）
    phase = r1
    for _ in range(200):
        if phase == 'fix':
            break
        await pg.wait_for_timeout(300)
        phase = await pg.evaluate('%s.quiz ? %s.quiz.phase : "noquiz"' % (HOOK, HOOK))
    if phase != 'fix':
        return 'f%dq%d nofix phase=%s' % (flat, k, phase)
    # 段3：域断言（读 quiz 一次）+ tapFix（好卡下标+null 重试）
    q2 = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
    goods = [i for i, c in enumerate(q2.get('cards') or []) if c.get('good')]
    if len(goods) != 1:
        return 'f%dq%d good 非唯一 %s' % (flat, k, goods)
    n, m, et, ea = q2.get('n'), q2.get('m'), q2.get('etype'), q2.get('errAt')
    if et not in ('skip', 'dup', 'swap'):
        return 'f%dq%d etype=%s' % (flat, k, et)
    exp_m = {'skip': n - 1, 'dup': n + 1, 'swap': n}[et]
    exp_label = {'skip': '漏数了' + str(ea), 'dup': str(ea) + '数了两遍',
                 'swap': str(ea) + '和' + str(ea + 1) + '数反了'}[et]
    if q2['cards'][goods[0]].get('label') != exp_label:
        return 'f%dq%d 好卡≠诊断卡 %s（期望 %s）' % (flat, k, q2['cards'][goods[0]].get('label'), exp_label)
    if ndom is not None and not (ndom[0] <= n <= ndom[1]):
        return 'f%dq%d N=%s 不在 ch%d 域 %s' % (flat, k, n, dch, ndom)
    if not (4 <= n <= 20):
        return 'f%dq%d N 越全域 %s' % (flat, k, n)
    if m != exp_m:
        return 'f%dq%d m=%s≠etype 期望=%s' % (flat, k, m, exp_m)
    rr = None
    for _ in range(30):
        rr = await pg.evaluate('(async () => { const r = await %s.tapFix(%d); return r === null ? "null" : (r === false ? "false" : String(r)); })()' % (HOOK, goods[0]))
        if rr != 'null':
            break
        await pg.wait_for_timeout(300)      # locked/尾窗 140ms——重试至窗过
    if rr not in ('right', 'done'):
        return 'f%dq%d tapFix=%s' % (flat, k, rr)
    return None

QF = {'thanks': q_thanks, 'plant': q_plant, 'teach': q_teach}

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
                if not await poll_step(pg, k + 1, timeout=90000):
                    bad.append('f%dq%d 未推进' % (flat, k)); break
        if len(bad) > 8:
            break
    return bad

async def wrong_js(restart=True):
    rst = 'await H.start(10);' if restart else ''
    if GAME == 'thanks':
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
                ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || !q.cards) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const bad = q.cards.findIndex((c, j) => j !== q.answer);'
                ' const r = await H.tapCard(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
                ' return "noreach"; })()'
                ) % (HOOK, rst)
    if GAME == 'plant':
        # 错=非目标非已种格（等开题窗过——演出窗内 tapCell=null 重试）
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
                ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || !q.row) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const n = q.n, target = (q.row - 1) * n + (q.col - 1);'
                ' const planted = q.planted || [];'
                ' let cell = -1;'
                ' for (let c = 0; c < n * n; c++) { if (c !== target && !planted.includes(c)) { cell = c; break; } }'
                ' if (cell < 0) return "nocell";'
                ' const r = await H.tapCell(cell); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
                ' return "noreach"; })()'
                ) % (HOOK, rst)
    # teach：三阶段流程款——先驱动 show（tapApple×N 入碗）→等 fix→点错卡（b37 首跑教训：
    # 错点驱动没先完成 show 则 phase 永停 'show'，60s 等不到 fix）
    return ('(async () => { const H = %s; %s'
            ' let g = 0;'
            ' while (g++ < 60 && H.quiz && H.quiz.phase === "show") { await H.tapApple(0); await new Promise(w=>setTimeout(w,120)); }'
            ' g = 0;'
            ' while (g++ < 100 && H.quiz && H.quiz.phase !== "fix") { await new Promise(w=>setTimeout(w,200)); }'
            ' for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || q.phase !== "fix" || !q.cards) { await new Promise(w=>setTimeout(w,400)); continue; }'
            ' const bad = q.cards.findIndex((c, j) => !c.good);'
            ' if (bad < 0) return "nobad";'
            ' const r = await H.tapFix(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
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

        if GAME == 'plant':
            # T4 分款：plant 生成关 dch=静态 ch 档（域承诺型——SPEC §0.89）
            gen = []
            for flat in range(20, 40):
                r = await pg.evaluate('%s.start(%d), %s.currentLevel.dch' % (HOOK, flat, HOOK))
                gen.append(r)
            exp = [(f // 5) % 4 + 1 for f in range(20, 40)]   # 生成关 dch=(ch-1)%4+1 循环档
            # （flat20-39 obs 全匹配；首版 exp=f//5+1=5-8 系越域笔误——GEN_HINTS[dch-1] 域 1-4，
            #  静态承诺型在生成关=5-8 章循环复用 1-4 档，网格渐大承诺保持——2026-09-12 裁决）
            rec('T4 生成关 dch 静态档对账', gen == exp, 'obs=%s exp=%s' % (gen, exp))
        else:
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

        # T6：错选/错格/错卡 wrong+miss 计 1（plant 已种格 false 不计 miss 另断言）
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600)
        w1 = await pg.evaluate(await wrong_js(restart=False))
        m1 = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T6 错选 wrong+miss 计 1', w1 == 'wrong' and m1 == 1, 'r=%s miss=%s' % (w1, m1))
        await pg.wait_for_timeout(WRONG_WAIT[GAME])
        if GAME == 'plant':
            # T6b：已种格 false 不计 miss（SPEC §2——探索不罚）——前置：先种一棵树（T6 错格后 planted 空）
            r = await pg.evaluate('''(async () => { const H = %s;
                for (let i = 0; i < 45; i++) { const q = H.quiz; if (!q || !q.row) { await new Promise(w=>setTimeout(w,400)); continue; }
                    const t = (q.row - 1) * q.n + (q.col - 1);
                    const rr = await H.tapCell(t);
                    if (rr === 'planted' || rr === 'done') break;
                    await new Promise(w=>setTimeout(w,500)); } return "sown"; })()''' % HOOK)
            r2 = await pg.evaluate('''(async () => { const H = %s;
                for (let i = 0; i < 40; i++) { const q = H.quiz; if (!q || !q.planted || !q.planted.length) { await new Promise(w=>setTimeout(w,400)); continue; }
                    const occ = q.planted[0];
                    const m0 = q.miss; const rr = await H.tapCell(occ);
                    if (rr === null) { await new Promise(w=>setTimeout(w,500)); continue; }   // 种树后新题开题窗——null 重试
                    const m2 = H.quiz ? H.quiz.miss : null;
                    return rr === false && m2 === m0 ? "ok" : ("r=" + String(rr) + " m=" + m0 + ">" + m2); } return "noreach"; })()''' % HOOK)
            rec('T6b 已种格 false 不计 miss', r2 == 'ok', r2)

        # T7：双错防重入 miss 只+1（豁免窗内二击吞）
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600)
        if GAME == 'thanks':
            await pg.wait_for_timeout(1500)     # 情景句 say 窗（9 字 verify 折算）余量后直点
            dbl = ('(async()=>{const H=%s;const q=H.quiz;const bad=q.cards.findIndex((c,j)=>j!==q.answer);'
                   'const r=await H.tapCard(bad);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
        elif GAME == 'plant':
            await pg.wait_for_timeout(1500)     # 开题窗（ask+卡句 verify 折算≈620ms+）余量后直点——b37 首跑 600ms 不足实证
            dbl = ('(async()=>{const H=%s;const q=H.quiz;const n=q.n,target=(q.row-1)*n+(q.col-1),pl=q.planted||[];'
                   'let cell=-1;for(let c=0;c<n*n;c++){if(c!==target&&!pl.includes(c)){cell=c;break;}}'
                   'const r=await H.tapCell(cell);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
        else:
            dbl = ('(async()=>{const H=%s;'
                   'let g=0;while(g++<60&&H.quiz&&H.quiz.phase==="show"){await H.tapApple(0);await new Promise(w=>setTimeout(w,120));}'
                   'g=0;while(g++<100&&H.quiz&&H.quiz.phase!=="fix"){await new Promise(w=>setTimeout(w,200));}'
                   'await new Promise(w=>setTimeout(w,600));'
                   'const qq=H.quiz;if(!qq||qq.phase!=="fix")return "nofix";'
                   'const bad=qq.cards.findIndex(c=>!c.good);'
                   'const r=await H.tapFix(bad);return r===null?"null":(r===false?"false":String(r));})()' % HOOK)
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

        # T11：契约 I+N 豁免窗≥下界+keyless 恒尾（三款全有错链）
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
