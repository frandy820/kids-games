# -*- coding: utf-8 -*-
"""r39 notebird 适配版单款复验（基于 verify_batch27.py notebird 段 11 腿，谱按 SPEC-R39 适配）
归档 _src/，禁整替主线 verify_batch27.py（主线侧收编时以本文件核对——SPEC-R39 §R7 声明）。
r39 适配面：
  T3 静态 0-19：ch1(0-4) 有序+free 特例原样 / dch2(5-9) find 乱序 / dch3(10-14) higher 乱序 /
     dch4(15-19) 四型混合（每关 melody==1+iv==1+find≥1+higher≥1）——melody 逐位点+错点进度保留 /
     iv 三分类（notes 固定序+answer=分类独立复算+错对判定）
  T4 生成关：dch∈1-4 + 首题按型结构合规 + 乱序律（dch≥2 音系题非全升序/dch1 升序）
  T6 增 melody 返回值族（step×2+right|done+wrong 进度保留）
  T11 引导句长从 r39 四型 GUIDE 表提取（GUIDE_FIND2 对象+GUIDE_H2/MEL/IV 串）
用法: python verify_one_notebird_r39.py"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

HERE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = 'notebird'
HOOK, TAP = 'NB', 'NB.tapBird'
SAVEKEY = 'kidsgame_notebird'
URL_V = 'file:///' + (HERE.parent / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (HERE.parent / 'index.html').as_posix()
RES = []


def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))


# ---- SPEC 独立硬编码表（禁 import 实现） ----
NB_FREQ = {'do': 261.63, 're': 293.66, 'mi': 329.63, 'fa': 349.23,
           'sol': 392.00, 'la': 440.00, 'si': 493.88, 'dop': 523.25}
NB_IDX = {n: i for i, n in enumerate(NB_FREQ)}
IV_KEYS = ['iv_near', 'iv_mid', 'iv_far']            # SPEC-R39 §R1 维度三：固定序三卡
CLIPS_WRONG = 2832                                    # not_wrong mp3 实长（SPEC §4）


def iv_cls(d):
    return 0 if d == 1 else 1 if d == 2 else 2        # SPEC-R39：d=1 挨着/2 隔一个/≥3 隔好几个


def win_ms(kind):
    """题面唱窗（不乘 SPEED，SPEC-R39 §R9）：find 1000/higher|iv 2000/melody 3000 + 余量"""
    return {'find': 1100, 'higher': 2300, 'iv': 2300, 'melody': 3100}[kind]


async def wait_verify_title(pg):
    for _ in range(300):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t:
            return t
        await pg.wait_for_timeout(500)
    return ''


async def poll_step(pg, want, timeout=9000):
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate('%s.quiz.step' % HOOK)
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False


async def quiz_json(pg):
    return json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))


async def drive_to_kind(pg, flat, kind):
    """驱动 flat 关至指定型题位（中途题按真实路径点完；返回命中题 JSON 或 None）"""
    for f in ([flat] + [x for x in (15, 16, 17, 18, 19) if x != flat]):
        r = await pg.evaluate("""async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          NB.start(%d);
          for (let g = 0; g < 8; g++) {
            let w = 0; while (state.singing && w++ < 150) await wait(50);
            const q = cur.quizzes[cur.step];
            if (!q) return null;
            if (q.kind === '%s') return JSON.stringify({step: cur.step});
            if (q.kind === 'melody') { let m = 0; while (!q._answered && m++ < 6) await NB.tapBird(q.notes.indexOf(q.sang[q._prog])); }
            else await NB.tapBird(q.answer);
            await wait(6200);
          }
          return null;
        }""" % (f, kind))
        if r is not None:
            return json.loads(r)
    return None


def struct_check(flat, dch, k, q, bad):
    """单题结构对账（SPEC-R39 §R3 独立复算；bad 累积）"""
    kind, ans, notes = q['kind'], q['answer'], q['notes']
    if kind == 'iv':
        if notes != IV_KEYS:
            bad.append('f%dq%d iv notes %s' % (flat, k, notes))
        d = NB_IDX[q['sang'][1]] - NB_IDX[q['sang'][0]]
        if d < 1 or ans != iv_cls(d):
            bad.append('f%dq%d iv d=%d ans=%s' % (flat, k, d, ans))
        return
    idxs = [NB_IDX[n] for n in notes]
    if len(set(notes)) != 4:
        bad.append('f%dq%d notes 互异 %s' % (flat, k, notes))
    asc = idxs == sorted(idxs)
    if dch == 1 and not asc:
        bad.append('f%dq%d ch1 应有序 %s' % (flat, k, notes))
    if dch >= 2 and asc:
        bad.append('f%dq%d ch2+ 应乱序 %s' % (flat, k, notes))
    if kind == 'find':
        if q['sang'] != [notes[ans]]:
            bad.append('f%dq%d find sang %s ans=%s' % (flat, k, q['sang'], notes[ans]))
    elif kind == 'higher':
        si = [NB_IDX[n] for n in q['sang']]
        if NB_IDX[notes[ans]] != max(si) or max(si) - min(si) > 2:
            bad.append('f%dq%d higher sang=%s ans=%s' % (flat, k, q['sang'], notes[ans]))
        near = [NB_IDX[n] for n in notes if n not in q['sang'] and any(abs(NB_IDX[n] - s) == 1 for s in si)]
        if not near:
            bad.append('f%dq%d higher 近邻干扰缺席' % (flat, k))
    elif kind == 'melody':
        sang = q['sang']
        if len(sang) != 3 or len(set(sang)) != 3 or any(s not in notes for s in sang):
            bad.append('f%dq%d melody sang %s notes %s' % (flat, k, sang, notes))
        if len([n for n in notes if n not in sang]) != 1:
            bad.append('f%dq%d melody 干扰!=1' % (flat, k))
        if q.get('prog') != 0:
            bad.append('f%dq%d melody 初始 prog=%s' % (flat, k, q.get('prog')))


async def tap_quiz(pg, q):
    """按型点完当前题（错点一路径只入 T6；T3 全对路径）：
       melody 逐位点 3 位；其余单点 answer。返回末次 tap 返回值。"""
    if q['kind'] == 'melody':
        # 页内原子例程：live _answered 判停（python 侧轮询会跨题误点下一题），全返回值序列断言
        out = await pg.evaluate("""async () => {
          const q = cur.quizzes[cur.step];
          if (!q || q.kind !== 'melody') return 'notmel';
          const rets = [];
          while (!q._answered && rets.length < 6) rets.push(String(await NB.tapBird(q.notes.indexOf(q.sang[q._prog]))));
          return rets.join(',');
        }""")
        return out
    return await pg.evaluate('%s(%d)' % (TAP, q['answer']))


async def audit_static(pg):
    """T3 静态关 0-19 全 5 题对账（r39 谱：ch1 有序特例 / dch2-4 乱序+四型）"""
    bad = []
    for flat in range(20):
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(250)
        dch = await pg.evaluate('%s.currentLevel.dch' % HOOK)
        if flat < 5:
            # ch1 自由探索关（教学特例原样）：点对=right；点错=free 不罚不计 miss；过关走 autoSolve
            q = await quiz_json(pg)
            if q['sang'] != [q['notes'][q['answer']]]:
                bad.append('f%d ch1 结构 %s' % (flat, q['sang']))
            struct_check(flat, 1, 0, q, bad)
            await pg.wait_for_timeout(1100)
            raw_r = await pg.evaluate('%s(%d)' % (TAP, q['answer']))
            if raw_r != 'right':
                bad.append('f%d ch1 点对应 right 实得 %s' % (flat, raw_r))
            await pg.wait_for_timeout(2000)
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
        kinds = {}
        for k in range(5):
            q = await quiz_json(pg)
            kind = q['kind']
            kinds[kind] = kinds.get(kind, 0) + 1
            struct_check(flat, dch, k, q, bad)
            await pg.wait_for_timeout(win_ms(kind))    # 唱窗（不乘 SPEED）过后判定才开
            ok = await tap_quiz(pg, q)
            if kind == 'melody':
                seq = ok.split(',') if isinstance(ok, str) else [ok]
                if seq not in (['step', 'step', 'right'], ['step', 'step', 'done']):
                    bad.append('f%dq%d(melody) seq=%s' % (flat, k, ok))
                    continue
            elif ok not in ('right', 'done'):
                bad.append('f%dq%d(%s) tap=%s' % (flat, k, kind, ok))
                continue
            if k < 4 and not await poll_step(pg, k + 1):
                bad.append('f%dq%d step 未推进' % (flat, k))
        if dch == 4 and not (kinds.get('melody') == 1 and kinds.get('iv') == 1
                             and kinds.get('find', 0) >= 1 and kinds.get('higher', 0) >= 1):
            bad.append('f%d dch4 构成 %s' % (flat, kinds))
    return bad


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # T1 verify selftest 复跑（59 单元，r39 ⑰⑱⑲ 含防泄露/melody/iv）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_V)
        t1 = await wait_verify_title(pg)
        rec('T1 selftest 复跑（59 单元）', 'VERIFY PASS 59/59' in t1 and not errs, t1)
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

        # T3 静态关 0-19 全题 SPEC 对账（r39 四型谱）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        bad = await audit_static(pg)
        rec('T3 静态 0-19 全题 SPEC 对账（四型+乱序律+dch4 构成）', not bad, bad[:6])

        # T4 生成关 20-39 dch+首题结构（dch 钩子直读，b25 坑④；r39 增首题型合规）
        gen, dchb = [], []
        for flat in range(20, 40):
            r = await pg.evaluate('%s.start(%d), JSON.stringify({dch: %s.currentLevel.dch, q: %s.quiz})' % (HOOK, flat, HOOK, HOOK))
            g = json.loads(r)
            gen.append(g)
            b2 = []
            struct_check(flat, g['dch'], 0, g['q'], b2)   # 首题按型独立复算（含乱序律）
            dchb += b2
        dch_ok = all(g['dch'] in (1, 2, 3, 4) for g in gen) and not dchb
        rec('T4 生成关 dch∈1-4+首题型合规', dch_ok, [g['dch'] for g in gen] + dchb[:3])

        # T5 确定性（生成关同 flat 两次 quiz 全等）
        same = True
        for flat in (22, 27, 33, 39):
            a = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            c = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        # T6 tapX 返回值族（flat10 dch3 higher 演出窗 + r39 melody step 族）
        prewait = 'await new Promise(r=>setTimeout(r,2500));'
        r = await pg.evaluate("""async () => { NB.start(10); const q = NB.quiz; await new Promise(r=>setTimeout(r,2500)); let w = q.answer === 0 ? 1 : 0;
            const raw = await NB.tapBird(w); return { raw: String(raw), miss: NB.quiz.miss, step: NB.quiz.step }; }""")
        t6 = [r['raw'] == 'wrong', r['miss'] == 1, r['step'] == 0]
        await pg.wait_for_timeout(2500)
        r2 = await pg.evaluate("""async () => { const q = NB.quiz; await new Promise(r=>setTimeout(r,2500)); const raw = await NB.tapBird(q.answer); return String(raw); }""")
        t6.append(r2 == 'right')
        await pg.wait_for_timeout(2300)                 # 越界探测先过新题唱窗（审查 m3）
        r3 = await pg.evaluate('async () => { const r = await NB.tapBird(99); return r === null ? "null" : String(r); }')
        t6.append(r3 == 'null')
        r4 = await pg.evaluate("""async () => { NB.start(10); const q0 = NB.quiz; let w = q0.answer === 0 ? 1 : 0;
            await new Promise(r => setTimeout(r, 300)); const raw = await NB.tapBird(w);
            return { raw: String(raw), miss: NB.quiz.miss }; }""")
        t6.append(r4['raw'] == 'false' and r4['miss'] == 0)
        # r39 melody 族：错点 wrong+进度保留 → step → step → right|done
        hit = await drive_to_kind(pg, 15, 'melody')
        mel = None
        if hit:
            await pg.wait_for_timeout(3100)
            mel = await pg.evaluate("""async () => {
              const wait = ms => new Promise(r => setTimeout(r, ms));
              let w = 0; while (state.singing && w++ < 150) await wait(50);
              const Q = JSON.parse(JSON.stringify(NB.quiz));
              const di = Q.notes.findIndex(n => !Q.sang.includes(n));
              const rw = String(await NB.tapBird(di));           // 错点干扰鸟
              const keep = NB.quiz.prog;                          // 进度保留（=0）
              const r1 = String(await NB.tapBird(NB.quiz.notes.indexOf(Q.sang[0])));
              const picked = document.querySelectorAll('.bird-card.picked').length;
              const r2 = String(await NB.tapBird(NB.quiz.notes.indexOf(Q.sang[1])));
              const r3 = String(await NB.tapBird(NB.quiz.notes.indexOf(Q.sang[2])));
              return { rw, keep, r1, picked, r2, r3 };
            }""")
        mel_ok = (hit is not None and mel and mel['rw'] == 'wrong' and mel['keep'] == 0 and
                  mel['r1'] == 'step' and mel['picked'] == 1 and
                  mel['r2'] == 'step' and mel['r3'] in ('right', 'done'))
        t6.append(mel_ok)
        rec('T6 tapX 返回值族+演出窗吞点+r39 melody step 族', all(t6),
            'wrong=%s miss=%s right=%s oob=%s 锁定=%s melody=%s' % (
                r['raw'], r['miss'], r2, r3, r4, mel))

        # T7 双错防重入（fire-and-forget 窗内二击 miss 只+1，b25 坑①；先过演出窗）
        await pg.wait_for_timeout(2500)
        await pg.evaluate('NB.start(10)')
        await pg.wait_for_timeout(2500)
        await pg.evaluate("() => { const q = NB.quiz; let w = q.answer === 0 ? 1 : 0; NB.tapBird(w); return 1; }")
        await pg.wait_for_timeout(40)
        await pg.evaluate("() => { const q = NB.quiz; let w = q.answer === 0 ? 1 : 0; NB.tapBird(w); return 1; }")
        await pg.wait_for_timeout(2500)
        m = await pg.evaluate('NB.quiz.miss')
        rec('T7 双错防重入 miss 只+1', m == 1, 'miss=%d' % m)

        # T8 星级三档（0 错 3★ / 2 错 2★ / 3 错 1★；retries 全关累计口径不变）
        async def stars_after(nwrong):
            await pg.evaluate('NB.start(10)')
            await pg.wait_for_timeout(2500)
            for _ in range(nwrong):
                await pg.evaluate("""async () => { const q = NB.quiz; let w = q.answer === 0 ? 1 : 0; await NB.tapBird(w); }""")
                await pg.wait_for_timeout(2000)
            await pg.evaluate('NB.autoSolve()')
            for _ in range(30):
                st = await pg.evaluate('NB.currentLevel')
                if st['won']:
                    return st['stars']
                await pg.wait_for_timeout(400)
            return None
        s0, s2, s3 = await stars_after(0), await stars_after(2), await stars_after(3)
        rec('T8 星级三档', s0 == 3 and s2 == 2 and s3 == 1, '0错=%s 2错=%s 3错=%s' % (s0, s2, s3))
        # r39 段二修：ctx.close 延后到 T10 evaluate 之后（原 L325 在 T9 前关页 → T10 复用 pg=死页 TargetClosed）

        # T9 家族 A 源码正则
        main_js = (HERE / 'game-main.js').read_text(encoding='utf-8')
        data_js = (HERE / 'game-data.js').read_text(encoding='utf-8')
        rec('T9 家族 A nextHint 双形态',
            re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js) and re.search(r'nextHint\(\s*null\s*\)', main_js) is not None)

        # T10 C7：预告关键词独立表 + 生成关 nextHint 实算对账（章末文案零改动声明核）
        # r39 段二修：不再新开第三个 verify 页（同进程三实例=渲染进程内存峰值崩，2026-09-22 实测
        # Target crashed ×3）——genok 改复用 T3/T4 存活 pg evaluate
        hints = re.findall(r"hint:\s*'([^']+)'", data_js)
        titles = re.findall(r"name:\s*'([^']+)'", data_js)
        ghints = re.findall(r'GEN_HINTS\s*=\s*\[([^\]]+)\]', data_js)
        gh = re.findall(r"'([^']+)'", ghints[0]) if ghints else []
        KW = [['听', '找'], ['比', '高', '低'], ['混', '挑战'], ['新', '开始']]
        sem = (len(hints) == 4 and len(titles) >= 4 and len(gh) == 4 and
               all(any(w in hints[i] for w in KW[i]) for i in range(4)) and
               all(len(set(gh[k]) & set(titles[k])) >= 1 for k in range(4)))
        genok = await pg.evaluate('[24,29,34,39].every(f => nextHint(f) === GEN_HINTS[genLevel(f+1).dch-1])')
        rec('T10 C7 关键词+生成关实算', sem and genok, 'hints=%d gh=%d genok=%s' % (len(hints), len(gh), genok))
        await ctx.close()   # r39 段二：T10 用完才关（T11 起纯源码正则无页面）

        # T11 契约 I/J：豁免窗在场+数字下界（r39 引导句从四型 GUIDE 表提取）+救援守卫+startLevel 重置
        mw = re.search(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*(\d+)', main_js)
        n_win = int(mw.group(1)) if mw else 0
        obj_segs = re.findall(r'GUIDE\w*\s*=\s*\{([^}]*)\}', data_js)
        str_segs = re.findall(r"GUIDE\w*\s*=\s*'([^']+)'", data_js)
        zh = [s for blob in obj_segs for s in re.findall(r"'([^']*[一-鿿][^']*)'", blob)] + \
             [s for s in str_segs if re.search(r'[一-鿿]', s)]
        maxlen = max((len(s) for s in zh), default=0)
        lb = CLIPS_WRONG + 150 + 345 * maxlen + 300
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
