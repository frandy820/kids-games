# -*- coding: utf-8 -*-
"""bodyen r41 独立复验（verify_batch29.py bodyen 腿的 r41 适配版——归档于 _src/；
主线 verify_batch29.py 的 8 词/两族谱断言在 r41 词库 24+do 题型后过时，主线收编由主线
决定（r39 notebird 先例：Executor 交付归档适配版+声明，不动主线文件））
用法: python verify_one_bodyen_r41.py
口径：同 verify_batch29.py（verify 页 ?verify=1 引擎同作用域；tapOpt async）；
r41 增：do 题驱动（touch 族 part 卡/动作族 verb 卡四短语恰全集）、词封闭 24、
NEAR 族表（偏好序，ch2+ 首族干扰在场）、ch3+ 真值∈NEAR20、dch4 do==2、do 链下界。"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__))).parent          # batch29/bodyen/
URL_V = 'file:///' + (BASE / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC-R41 §R2 独立硬编码表（禁 import 实现；24 词头→脚序+族表+动词域） ----
BE_WORDS = ['head', 'face', 'hair', 'eyebrow', 'eye', 'ear', 'nose', 'mouth',
            'tooth', 'tongue', 'chin', 'cheek', 'neck', 'shoulder', 'arm', 'elbow',
            'hand', 'finger', 'thumb', 'leg', 'knee', 'foot', 'toe', 'belly']
BE_NEAR = {
    'head': ['hand', 'hair'], 'face': [], 'hair': ['head', 'hand'],
    'eyebrow': ['eye', 'ear'], 'eye': ['ear', 'eyebrow'], 'ear': ['eye', 'eyebrow'],
    'nose': ['toe', 'neck'], 'mouth': [], 'tooth': ['tongue', 'toe', 'foot'],
    'tongue': ['tooth', 'toe'], 'chin': ['cheek', 'tooth'], 'cheek': ['chin', 'tongue'],
    'neck': ['knee', 'nose'], 'shoulder': [], 'arm': ['leg', 'elbow'],
    'elbow': ['arm', 'leg'], 'hand': ['head', 'hair', 'finger'],
    'finger': ['thumb', 'hand'], 'thumb': ['finger', 'hand'],
    'leg': ['arm', 'knee'], 'knee': ['neck', 'leg', 'toe'],
    'foot': ['toe', 'tooth'], 'toe': ['foot', 'nose', 'knee'], 'belly': [],
}
BE_NEAR20 = [w for w in BE_WORDS if BE_NEAR[w]]
BE_ACTS = ['clap', 'shake', 'stomp', 'wave']
# T11 错链下界（SPEC §4 实长 + est 口径）：hear 链=wrong+again_hear+词音 max；do 链=wrong+estMs(8)
# 修复轮 m-1 勘误 2026-09-22：词音 max 1536→1656（r41 终态 bod_w_shoulder，旧 1536=bod_w_nose 8 词口径）→ 6264
CHAIN_HEAR_LB = 1656 + 150 + 2352 + 150 + 1656 + 300
CHAIN_DO_LB = 1656 + 150 + (8 * 345 + 600) + 300       # again_do est（注册后实长复核）

async def wait_verify_title(pg):
    for _ in range(90):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t:
            return t
        await pg.wait_for_timeout(500)
    return ''

async def poll_step(pg, want, timeout=15000):
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate('BE.quiz.step')
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False

async def tap(pg, i):
    return await pg.evaluate('(async () => BE.tapOpt(%d))()' % i)

async def q_bodyen(pg, flat, k, q, dch):
    kind = q['kind']
    if kind == 'do':
        verb = q.get('verb')
        if verb == 'touch':                            # do-touch：4 部位卡（真值∈NEAR20+族干扰）
            vals = [o.get('part') for o in q['opts']]
            if any(v is None for v in vals):
                return 'f%dq%d touch opts 字段 %s' % (flat, k, q['opts'])
            if len(vals) != 4 or len(set(vals)) != 4 or q['ask'] not in vals:
                return 'f%dq%d touch 候选 %s' % (flat, k, vals)
            if any(v not in BE_WORDS for v in vals):
                return 'f%dq%d touch 出封闭表 %s' % (flat, k, vals)
            if q['ask'] not in BE_NEAR20:
                return 'f%dq%d touch 真值 %s 不在 NEAR20' % (flat, k, q['ask'])
            if BE_NEAR[q['ask']][0] not in vals:
                return 'f%dq%d touch 族干扰 %s 缺席 %s' % (flat, k, BE_NEAR[q['ask']][0], vals)
            want = vals.index(q['ask'])
            if q['answer'] != want:
                return 'f%dq%d answer=%d want=%d' % (flat, k, q['answer'], want)
        else:                                          # do-action：四动作卡恰全集
            vs = [o.get('verb') for o in q['opts']]
            if q['ask'] != verb:
                return 'f%dq%d act ask=%s verb=%s' % (flat, k, q['ask'], verb)
            if sorted(vs or []) != sorted(BE_ACTS):
                return 'f%dq%d act 候选 %s' % (flat, k, vs)
            if q['answer'] != vs.index(verb):
                return 'f%dq%d act answer=%d want=%d' % (flat, k, q['answer'], vs.index(verb))
        r = await tap(pg, q['answer'])
        return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    ask = q['ask']
    if ask not in BE_WORDS:
        return 'f%dq%d ask=%s 出封闭表' % (flat, k, ask)
    if kind == 'hear':
        vals = [o['part'] for o in q['opts']]
    elif kind == 'see':
        vals = [o['text'] for o in q['opts']]
    else:
        return 'f%dq%d kind=%s' % (flat, k, kind)
    if len(vals) != 4 or len(set(vals)) != 4 or ask not in vals:
        return 'f%dq%d %s 候选 %s' % (flat, k, kind, vals)
    want = vals.index(ask)
    if q['answer'] != want:
        return 'f%dq%d answer=%d want=%d' % (flat, k, q['answer'], want)
    if dch >= 2 and BE_NEAR[ask] and BE_NEAR[ask][0] not in vals:   # ch2+ 族干扰在场
        return 'f%dq%d 族干扰 %s 缺席 %s' % (flat, k, BE_NEAR[ask][0], vals)
    if dch >= 3 and ask not in BE_NEAR20:                # ch3+ 真值∈NEAR20
        return 'f%dq%d ch%d 真值 %s 不在 NEAR20' % (flat, k, dch, ask)
    r = await tap(pg, q['answer'])
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def audit_static(pg):
    bad = []
    for flat in range(20):
        await pg.evaluate('BE.start(%d)' % flat)
        await pg.wait_for_timeout(300)
        st = json.loads(await pg.evaluate('JSON.stringify(BE.currentLevel)'))
        dch = st['dch']
        if dch != 1 + flat // 5:
            bad.append('f%d dch=%d want=%d' % (flat, dch, 1 + flat // 5))
        kinds, ndo = set(), 0
        for k in range(5):
            q = json.loads(await pg.evaluate('JSON.stringify(BE.quiz)'))
            kinds.add(q['kind'])
            if q['kind'] == 'do':
                ndo += 1
                if dch == 4 and k not in (1, 3):
                    bad.append('f%dq%d do 槽位错 %s' % (flat, k, q['verb']))
            err = await q_bodyen(pg, flat, k, q, dch)
            if err:
                bad.append(err); break
            if k < 4 and not await poll_step(pg, k + 1):
                bad.append('f%dq%d step 未推进' % (flat, k)); break
        if len(bad) > 12:
            break
        if dch == 1 and kinds != {'hear'}:
            bad.append('f%d ch1 型 %s' % (flat, kinds))
        if dch == 2 and kinds != {'see'}:
            bad.append('f%d ch2 型 %s' % (flat, kinds))
        if dch == 3 and kinds != {'hear', 'see'}:
            bad.append('f%d ch3 混出 %s' % (flat, kinds))
        if dch == 4 and (kinds != {'hear', 'see', 'do'} or ndo != 2):
            bad.append('f%d ch4 型 %s do=%d' % (flat, kinds, ndo))
    return bad

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
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
        sv = await pg.evaluate("localStorage.getItem('kidsgame_bodyen')")
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
        rec('T3 静态 0-19 全题 SPEC 对账+驱动（24 词+do 两子型+族干扰+NEAR20）',
            not bad and not errs3, (bad[:6] or '') if bad else 'err=%s' % errs3[:2])

        gen = []
        for flat in range(20, 40):
            r = await pg.evaluate('BE.start(%d), BE.currentLevel.dch' % flat)
            gen.append(r)
        rec('T4 生成关 dch∈1-4 且四型全现', all(g in (1, 2, 3, 4) for g in gen) and set(gen) == {1, 2, 3, 4}, gen)

        same = True
        for flat in (22, 27, 33, 39):
            a = await pg.evaluate('BE.start(%d), JSON.stringify(BE.quiz)' % flat)
            c = await pg.evaluate('BE.start(%d), JSON.stringify(BE.quiz)' % flat)
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        r3 = await pg.evaluate('async () => { BE.start(10); const r = await BE.tapOpt(99); return r === null ? "null" : String(r); }')
        r1 = await pg.evaluate("""async () => { const q = BE.quiz; let w = q.answer === 0 ? 1 : 0;
            const raw = await BE.tapOpt(w); return { raw: String(raw), miss: BE.quiz.miss, step: BE.quiz.step, kind: q.kind }; }""")
        await pg.wait_for_timeout(2200)
        r2 = await pg.evaluate('async () => { const q = BE.quiz; return String(await BE.tapOpt(q.answer)); }')
        rec('T6 tapOpt 返回值族', r3 == 'null' and r1['raw'] == 'wrong' and r1['miss'] == 1 and r1['step'] == 0 and r2 == 'right',
            'oob=%s wrong=%s miss=%s right=%s %s' % (r3, r1['raw'], r1['miss'], r2, r1['kind']))

        await pg.evaluate('BE.start(10)')
        await pg.evaluate('() => { const q = BE.quiz; BE.tapOpt(q.answer === 0 ? 1 : 0); return 1; }')
        await pg.wait_for_timeout(40)
        await pg.evaluate('() => { const q = BE.quiz; BE.tapOpt(q.answer === 0 ? 1 : 0); return 1; }')
        await pg.wait_for_timeout(2200)
        m = await pg.evaluate('BE.quiz.miss')
        rec('T7 双错防重入 miss 只+1', m == 1, 'miss=%s' % m)

        async def wrong_once():
            await pg.evaluate('async () => { const q = BE.quiz; await BE.tapOpt(q.answer === 0 ? 1 : 0); }')
        async def stars_after(nwrong):
            await pg.evaluate('BE.start(10)')
            await pg.wait_for_timeout(400)
            for _ in range(nwrong):
                await wrong_once()
                await pg.wait_for_timeout(2400)
            await pg.evaluate('BE.autoSolve()')
            for _ in range(40):
                st = await pg.evaluate('BE.currentLevel')
                if st['won']:
                    return st['stars']
                await pg.wait_for_timeout(500)
            return None
        s0, s2, s3 = await stars_after(0), await stars_after(2), await stars_after(3)
        rec('T8 星级三档', s0 == 3 and s2 == 2 and s3 == 1, '0错=%s 2错=%s 3错=%s' % (s0, s2, s3))
        await ctx.close()

        main_js = (BASE / '_src' / 'game-main.js').read_text(encoding='utf-8')
        rec('T9 家族 A nextHint 双形态',
            re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js) is not None and
            re.search(r'nextHint\(\s*null\s*\)', main_js) is not None)
        rec('T9b 契约 K 面板守卫在场', "querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')" in main_js)

        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        genok = await pg.evaluate('[24,29,34,39].every(f => nextHint(f) === GEN_HINTS[genLevel(f+1).dch-1])')
        rec('T10 C7 生成关 nextHint 实算', genok)
        await ctx.close()

        vals = [int(x) for x in re.findall(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*(\d+)', main_js)]
        n_win = max(vals, default=0)
        sent_ok = '再听一遍这个指令' in main_js or '再听一遍这个指令' in (BASE / '_src' / 'game-data.js').read_text(encoding='utf-8')
        guard = 'Date.now() < wrongChainUntil' in main_js
        reset = re.search(r'lastWrongVoice\s*=\s*0;\s*wrongChainUntil\s*=\s*0', main_js) is not None
        rec('T11 契约 I 豁免窗≥hear/do 链下界+守卫+重置',
            n_win > 0 and n_win >= CHAIN_HEAR_LB and n_win >= CHAIN_DO_LB and sent_ok and guard and reset,
            'N=%d hearLb=%d doLb=%d(est) 句在源码=%s guard=%s reset=%s' %
            (n_win, CHAIN_HEAR_LB, CHAIN_DO_LB, sent_ok, guard, reset))
        await b.close()
    fails = [n for n, ok in RES if not ok]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)

asyncio.run(main())
