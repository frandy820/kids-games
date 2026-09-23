# -*- coding: utf-8 -*-
"""batch27 独立复验：ruler / coin / notebird（断言从 SPEC-BATCH27 推导，期望值独立硬编码）
用法: python verify_batch27.py <ruler|coin|notebird>
口径：verify 页 (?verify=1) 引擎同作用域；tapX 均 async（b19 坑① await 包装/fire-and-forget）；
     notebird higher 演出窗 1700ms 不乘 SPEED（探针实证 d2500 才开点选）。"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'ruler': 'RU', 'coin': 'CO', 'notebird': 'NB'}[GAME]
TAP = HOOK + ('.tapOpt' if GAME != 'notebird' else '.tapBird')
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码表（禁 import 实现） ----
RULER_BASE = {'pencil': 4, 'crayon': 3, 'eraser': 2, 'scissors': 4, 'toycar': 5, 'book': 6}
RULER_UNIT = {'clip': 1, 'stick': 2, 'block': 3}
COIN_TEXT = {'jiao1': '1角', 'jiao5': '5角', 'yuan1': '1元', 'yuan1p': '1元', 'yuan5': '5元', 'yuan10': '10元', 'yuan20': '20元'}
COIN_VAL = {'jiao1': 1, 'jiao5': 5, 'yuan1': 10, 'yuan1p': 10, 'yuan5': 50, 'yuan10': 100, 'yuan20': 200}  # 角制
COMBO_ID = {'c_yj_j': ('yuan1', 'jiao5', 15), 'c_j5j5': ('jiao5', 'jiao5', 10), 'c_yy': ('yuan1', 'yuan1', 20)}
COMBO_TEXT = {10: '1元', 15: '1元5角', 20: '2元'}
NB_FREQ = {'do': 261.63, 're': 293.66, 'mi': 329.63, 'fa': 349.23, 'sol': 392.00, 'la': 440.00, 'si': 493.88, 'dop': 523.25}
NB_IDX = {n: i for i, n in enumerate(NB_FREQ)}
CLIPS = {'ruler': {'watch': 3360, 'turn': 1896, 'hint': 2544, 'right': 2496, 'wrong': 2880, 'q': 2448},
         'coin': {'watch': 2976, 'turn': 1752, 'hint': 2232, 'right': 2472, 'wrong': 2568, 'q': 1944},
         'notebird': {'watch': 3096, 'turn': 1752, 'hint': 2304, 'right': 2664, 'wrong': 2832, 'q': 2448}}
PRE = {'ruler': 'rul', 'coin': 'coi', 'notebird': 'not'}[GAME]

async def wait_verify_title(pg):
    for _ in range(90):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t:
            return t
        await pg.wait_for_timeout(500)
    return ''

async def poll_step(pg, want, timeout=9000):
    """tap 对后轮询 step 推进（判定链异步，探针实证立即读恒 0）"""
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate('%s.quiz.step' % HOOK)
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False

async def audit_static(pg):
    """T3 静态关 0-19 全 5 题对账（SPEC 独立表）"""
    bad = []
    for flat in range(20):
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(250)
        if GAME == 'notebird' and flat < 5:
            # ch1 自由探索关（SPEC §0.66 教学特例）：点对=right 判对；点错=free 唱歌不罚不计 miss；过关走 autoSolve
            q = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            if q['sang'] != [q['notes'][q['answer']]] or q['notes'][q['answer']] not in q['sang']:
                bad.append('f%d ch1 结构 %s' % (flat, q['sang']))
            await pg.wait_for_timeout(1100)             # 题面唱窗过后判定才开（find 700ms+缓冲）
            raw_r = await pg.evaluate('%s(%d)' % (TAP, q['answer']))
            if raw_r != 'right':
                bad.append('f%d ch1 点对应 right 实得 %s' % (flat, raw_r))
            await pg.wait_for_timeout(2000)
            m0 = await pg.evaluate('%s.quiz.miss' % HOOK)
            await pg.evaluate('%s.start(%d)' % (HOOK, flat))
            await pg.wait_for_timeout(1100)
            raw_w = await pg.evaluate('%s(%d)' % (TAP, 0 if q['answer'] != 0 else 1))
            mw = await pg.evaluate('%s.quiz.miss' % HOOK)
            if raw_w not in ('free', 'wrong') or mw != 0:
                bad.append('f%d ch1 点错应 free 不罚 实得 %s miss=%d' % (flat, raw_w, mw))
            await pg.evaluate('%s.autoSolve()' % HOOK)
            won = False
            for _ in range(30):
                st = await pg.evaluate('%s.currentLevel' % HOOK)
                if st['won']:
                    won = True
                    break
                await pg.wait_for_timeout(400)
            if not won:
                bad.append('f%d ch1 autoSolve 未过关' % flat)
            continue
        for k in range(5):
            q = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            kind, ans = q.get('kind'), q['answer']
            if GAME == 'ruler':
                if kind == 'count':
                    if RULER_BASE[q['item']] % RULER_UNIT[q['unit']] != 0 or q['units'] != RULER_BASE[q['item']] // RULER_UNIT[q['unit']]:
                        bad.append('f%dq%d count %s/%s=%s' % (flat, k, q['item'], q['unit'], q['units']))
                    nums = sorted(o['num'] for o in q['opts'])
                    if len(set(nums)) != 4 or q['opts'][ans]['num'] != q['units']:
                        bad.append('f%dq%d nums %s' % (flat, k, nums))
                    d = sorted(abs(n - q['units']) for n in nums if n != q['units'])
                    if 1 not in d or 2 not in d:
                        bad.append('f%dq%d dist %s' % (flat, k, d))
                else:
                    lens = [RULER_BASE[o['id']] for o in q['opts']]
                    if lens[ans] <= lens[1 - ans]:
                        bad.append('f%dq%d cmp ans=%s lens=%s' % (flat, k, ans, lens))
                    if flat >= 10 and q['opts'][0]['unit'] == q['opts'][1]['unit']:
                        bad.append('f%dq%d cmp 同单位干扰' % (flat, k))
            elif GAME == 'coin':
                if kind in ('coin', 'bill'):
                    if q['opts'][ans]['text'] != COIN_TEXT[q['face']]:
                        bad.append('f%dq%d %s face=%s' % (flat, k, kind, q['face']))
                elif kind == 'sameval':
                    if q['opts'][ans]['text'] != COIN_TEXT[q['face']]:
                        bad.append('f%dq%d sameval ans' % (flat, k))
                    if not any(o['text'] == '1角' for o in q['opts']):
                        bad.append('f%dq%d sameval 近对缺席' % (flat, k))
                else:
                    c = COMBO_ID[q['face']]
                    if COIN_VAL[c[0]] + COIN_VAL[c[1]] != c[2] or q['opts'][ans]['text'] != COMBO_TEXT[c[2]]:
                        bad.append('f%dq%d combo %s' % (flat, k, q['face']))
                    if not any(o['text'] == '1角' for o in q['opts']):
                        bad.append('f%dq%d combo 近对缺席' % (flat, k))
            else:
                idxs = [NB_IDX[n] for n in q['notes']]
                if idxs != sorted(idxs) or len(set(q['notes'])) != 4:
                    bad.append('f%dq%d notes %s' % (flat, k, q['notes']))
                if q['notes'][ans] not in q['sang']:
                    bad.append('f%dq%d 答案不在 sang' % (flat, k))
                if kind == 'find':
                    if q['sang'] != [q['notes'][ans]]:
                        bad.append('f%dq%d find sang %s' % (flat, k, q['sang']))
                else:
                    si = [NB_IDX[n] for n in q['sang']]
                    if NB_IDX[q['notes'][ans]] != max(si) or max(si) - min(si) > 2:
                        bad.append('f%dq%d higher sang=%s ans=%s' % (flat, k, q['sang'], q['notes'][ans]))
                    near = [NB_IDX[n] for n in q['notes'] if n not in q['sang'] and any(abs(NB_IDX[n] - s) == 1 for s in si)]
                    if not near:
                        bad.append('f%dq%d higher 近邻干扰缺席' % (flat, k))
            if GAME == 'notebird':   # 题面鸟唱演出窗（find 700ms/higher 1700ms，不乘 SPEED）：唱完才开判定
                await pg.wait_for_timeout(1100 if kind == 'find' else 2300)
            ok = await pg.evaluate('%s(%d)' % (TAP, ans))
            if ok not in ('right', 'done'):   # 末题判对=关终局 'done'（返回值族，b22 坑②）
                bad.append('f%dq%d tap=%s' % (flat, k, ok))
                continue
            if k < 4 and not await poll_step(pg, k + 1):
                bad.append('f%dq%d step 未推进' % (flat, k))
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

        # T2 真实页预置存档（第二 page，无 ?verify=1）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_R)
        await pg.wait_for_timeout(3000)
        sv = await pg.evaluate("localStorage.getItem('%s')" % SAVEKEY)
        sv = json.loads(sv) if sv else None
        rec('T2 真实页预置存档 v1.0', bool(sv and sv.get('v') == '1.0'), 'v=%s' % (sv and sv.get('v')))
        await ctx.close()

        # T3 静态关 0-19 全题对账
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        bad = await audit_static(pg)
        rec('T3 静态 0-19 全题 SPEC 对账', not bad, bad[:6])

        # T4 生成关 20-39 dch+首题快照（dch 钩子直读，b25 坑④）
        gen = []
        for flat in range(20, 40):
            r = await pg.evaluate('%s.start(%d), JSON.stringify({dch: %s.currentLevel.dch, q: %s.quiz})' % (HOOK, flat, HOOK, HOOK))
            gen.append(json.loads(r))
        dch_ok = all(g['dch'] in (1, 2, 3, 4) for g in gen)
        rec('T4 生成关 dch∈1-4', dch_ok, [g['dch'] for g in gen])

        # T5 确定性（生成关同 flat 两次 quiz 全等）
        same = True
        for flat in (22, 27, 33, 39):
            a = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            c = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        # T6 tapX 返回值族（notebird 先过题面演出窗再错击）
        prewait = 'await new Promise(r=>setTimeout(r,2500));' if GAME == 'notebird' else ''
        r = await pg.evaluate("""async () => { %s.start(10); const q = %s.quiz; %s let w = q.answer === 0 ? 1 : 0;
            const raw = await %s(w); return { raw: String(raw), miss: %s.quiz.miss, step: %s.quiz.step }; }""" % (HOOK, HOOK, prewait, TAP, HOOK, HOOK))
        t6 = [r['raw'] == 'wrong', r['miss'] == 1, r['step'] == 0]
        await pg.wait_for_timeout(2500)
        r2 = await pg.evaluate("""async () => { const q = %s.quiz; %s const raw = await %s(q.answer); return String(raw); }""" % (HOOK, prewait, TAP))
        t6.append(r2 == 'right')
        if GAME == 'notebird':          # 越界探测先过新题唱窗（否则 false 是唱窗锁定非越界——审查 m3）
            await pg.wait_for_timeout(2300)
        r3 = await pg.evaluate('async () => { const r = await %s(99); return r === null ? "null" : String(r); }' % TAP)
        oob_ok = r3 == 'null'   # 三款越界均 null+pop+bump（notebird 唱窗内 false=锁定，非越界——审查 m3 澄清）
        t6.append(oob_ok)
        if GAME == 'notebird':
            r4 = await pg.evaluate("""async () => { NB.start(10); const q0 = NB.quiz; let w = q0.answer === 0 ? 1 : 0;
                await new Promise(r => setTimeout(r, 300)); const raw = await NB.tapBird(w);
                return { raw: String(raw), miss: NB.quiz.miss }; }""")
            t6.append(r4['raw'] == 'false' and r4['miss'] == 0)
        rec('T6 tapX 返回值族' + ('+演出窗吞点' if GAME == 'notebird' else ''), all(t6),
            'wrong=%s miss=%s right=%s oob=%s %s' % (r['raw'], r['miss'], r2, r3, r4 if GAME == 'notebird' else ''))

        # T7 双错防重入（fire-and-forget 窗内二击 miss 只+1，b25 坑①；notebird 先过演出窗）
        await pg.wait_for_timeout(2500)
        r = await pg.evaluate("""() => { %s.start(10); return 1; }""" % HOOK)
        if GAME == 'notebird':
            await pg.wait_for_timeout(2500)
        r = await pg.evaluate("""() => { const q = %s.quiz; let w = q.answer === 0 ? 1 : 0; %s(w); return 1; }""" % (HOOK, TAP))
        await pg.wait_for_timeout(40)
        await pg.evaluate("""() => { const q = %s.quiz; let w = q.answer === 0 ? 1 : 0; %s(w); return 1; }""" % (HOOK, TAP))
        await pg.wait_for_timeout(2500)
        m = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T7 双错防重入 miss 只+1', m == 1, 'miss=%d' % m)

        # T8 星级三档（0 错 3★ / 2 错 2★ / 3 错 1★）
        async def stars_after(nwrong):
            await pg.evaluate('%s.start(10)' % HOOK)
            await pg.wait_for_timeout(2500)
            for _ in range(nwrong):
                await pg.evaluate("""async () => { const q = %s.quiz; let w = q.answer === 0 ? 1 : 0; await %s(w); }""" % (HOOK, TAP))
                await pg.wait_for_timeout(2000)
            await pg.evaluate('%s.autoSolve()' % HOOK)
            for _ in range(30):
                st = await pg.evaluate('%s.currentLevel' % HOOK)
                if st['won']:
                    return st['stars']
                await pg.wait_for_timeout(400)
            return None
        s0, s2, s3 = await stars_after(0), await stars_after(2), await stars_after(3)
        rec('T8 星级三档', s0 == 3 and s2 == 2 and s3 == 1, '0错=%s 2错=%s 3错=%s' % (s0, s2, s3))
        await ctx.close()

        # T9 家族 A 源码正则 + T10 C7 + T11 契约 I/J（源码级）
        main_js = (BASE / GAME / '_src' / 'game-main.js').read_text(encoding='utf-8')
        data_js = (BASE / GAME / '_src' / 'game-data.js').read_text(encoding='utf-8')
        rec('T9 家族 A nextHint 双形态',
            re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js) and re.search(r'nextHint\(\s*null\s*\)', main_js) is not None)
        # T10 C7：预告关键词独立表（字符计分对内容词预告失效——ruler「小棒积木」vs「换个单位量」教训）
        # + GEN_HINTS[k] 与 titles[k] 共享 ≥1 + 生成关 nextHint 实算对账
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        hints = re.findall(r"hint:\s*'([^']+)'", data_js)
        titles = re.findall(r"name:\s*'([^']+)'", data_js)
        ghints = re.findall(r"GEN_HINTS\s*=\s*\[([^\]]+)\]", data_js)
        gh = re.findall(r"'([^']+)'", ghints[0]) if ghints else []
        # 关键词表（从 SPEC 章型语义独立硬编码：hints[i] 预告 titles[i+1]，任一关键词组命中）
        KW = {'ruler': [['小棒', '积木'], ['根数', '长短', '不一样'], ['混', '挑战'], ['新', '开始']],
              'coin':  [['纸币'], ['一样多', '算'], ['混', '挑战'], ['新', '开始']],
              'notebird': [['听', '找'], ['比', '高', '低'], ['混', '挑战'], ['新', '开始']]}[GAME]
        sem = (len(hints) == 4 and len(titles) >= 4 and len(gh) == 4 and
               all(any(w in hints[i] for w in KW[i]) for i in range(4)) and
               all(len(set(gh[k]) & set(titles[k])) >= 1 for k in range(4)))
        genok = await pg.evaluate('[24,29,34,39].every(f => nextHint(f) === GEN_HINTS[genLevel(f+1).dch-1])')
        rec('T10 C7 关键词+生成关实算', sem and genok, 'hints=%d gh=%d genok=%s' % (len(hints), len(gh), genok))
        await ctx.close()
        # T11 契约 I/J：豁免窗在场+数字下界（引导句长从 data.js GUIDE 表块提取）+救援守卫+startLevel 重置
        m = re.search(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*(\d+)', main_js)
        n_win = int(m.group(1)) if m else 0
        obj_segs = re.findall(r"GUIDE\w*\s*=\s*\{([^}]*)\}", data_js)
        str_segs = re.findall(r"GUIDE\w*\s*=\s*'([^']+)'", data_js)
        zh_strs = [s for blob in obj_segs for s in re.findall(r"'([^']*[一-鿿][^']*)'", blob)] + \
                  [s for s in str_segs if re.search(r'[一-鿿]', s)]
        maxlen = max((len(s) for s in zh_strs), default=0)
        wrong_ms = CLIPS[GAME]['wrong']
        lb = wrong_ms + 150 + 345 * maxlen + 300
        guard = 'Date.now() < wrongChainUntil' in main_js
        reset = re.search(r'lastWrongVoice\s*=\s*0;\s*wrongChainUntil\s*=\s*0', main_js) is not None
        j_sem = re.search(r'flat\s*<\s*3|10000', main_js) is not None and 'lastWrongVoice' in main_js
        rec('T11 契约 I 豁免窗≥链实长+300 / J',
            n_win > 0 and n_win >= lb and guard and reset and j_sem,
            'N=%d L=%d字 下界=%d guard=%s reset=%s' % (n_win, maxlen, lb, guard, reset))
        await b.close()
    fails = [n for n, ok in RES if not ok]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)

asyncio.run(main())
