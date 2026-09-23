# -*- coding: utf-8 -*-
"""memduel 独立复验（SPEC-BATCH20 §1-r17-memduel 分源）——断言从 SPEC 推导，禁从实现行为归纳
r17 五型改造后口径（2026-09-17 主线适配）：
M1 确定性（flat 0/12/24/35 四型各一 双读全量 JSON 对比）
M2 串互异（48 关×8 题=384 题 seq 无重复元素=倒背多解非法）
M3 章约束（五型表：dch1 df/dgt/fwd len6-7、dch2 dr/dgt/rev len5-6、dch3 lf|cf/let|col/fwd len5-6、
    dch4 dx/dgt/双向 len5-6+delay；lf↔let/cf↔col 配对；生成关 flat≥40 dch seeded 1-4 按同表）
M4 Python 独立逆序对账（fwd: answer==seq / rev: answer==seq 逆序——纯 Python 列表反转，与引擎分源）
M5 展示期锁定（phase='show' 时 tapNum 拒绝且不吞题）
M6 池=answer 多重集∪干扰（干扰 ∉ answer 值集+干扰数 len≥7→2 其余 3）
M7 同关 8 题 sig 互异 / M8 引擎直驱：错拼=miss 恰一次+错位清空对位保留（强断言 kept==len-1）+补位推进
M9 dx 延迟相位（gap 态 tapNum 不吞题——SPEC：gap=干扰小任务窗，作答动作不生效）
纪律：tapNum 是 async——evaluate 侧 await promise（b19）；先等 title 含 VERIFY PASS（b17）；
等 phase='recall' 才作答（dx 穿 gap）；键基每章 10 关（LEVELS_PER_CH=10）静态 40+生成 flat≥40。
"""
import json, os, sys
from collections import Counter
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'memduel', 'index.html').replace('\\', '/') + '?verify=1'
AUDIT_FLATS = list(range(40)) + list(range(40, 48))   # 静态 40 关 + 生成关 8 关抽查
N_Q = 8

# SPEC §1-r17-memduel 章规格（静态关与生成关同表；生成关 dch seeded 1-4）
CHAP = {
    1: dict(kinds={'df'}, pairs={('df', 'dgt')}, modes={'fwd'}, lo=6, hi=7, delay=False),
    2: dict(kinds={'dr'}, pairs={('dr', 'dgt')}, modes={'rev'}, lo=5, hi=6, delay=False),
    3: dict(kinds={'lf', 'cf'}, pairs={('lf', 'let'), ('cf', 'col')}, modes={'fwd'}, lo=5, hi=6, delay=False),
    4: dict(kinds={'dx'}, pairs={('dx', 'dgt')}, modes={'fwd', 'rev'}, lo=5, hi=6, delay=True),
}

def sig_of(q):
    return '|'.join([''.join(map(str, sorted(q['seq']))), q['mode'], ''.join(map(str, q['answer']))])

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok), note))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
    pg.goto(URL)
    for _ in range(240):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('M0 selftest 全绿+0 pageerror', 'VERIFY PASS' in pg.title() and not errs, pg.title())

    def read_quiz():
        return pg.evaluate("() => MD.quiz")

    def level_state():
        return pg.evaluate("() => MD.currentLevel ? {done:MD.currentLevel.done, step:MD.currentLevel.step, locked:MD.currentLevel.locked} : null")

    def wait_recall(tag):
        for _ in range(500):
            q = read_quiz()
            if q and q['phase'] == 'recall':
                return q
            st = level_state()
            if q is None and st and st['done']:
                return None
            pg.wait_for_timeout(30)
        return False

    def tap(i):
        return pg.evaluate("(i) => (async () => { try { const r = await MD.tapNum(i); return r !== false && r != null } catch(e){ return false } })()", i)

    def fill_answer(q):
        for k in range(len(q['answer'])):
            st = level_state()
            if st and q is not None and st['step'] > q['step']:
                return True                                 # 拼满判对已推进（tap 返 'right' 即满）——停手防污染新题
            cur = read_quiz()
            if cur and cur['built'][k] is not None and cur['opts'][cur['built'][k]]['v'] == q['answer'][k]:
                continue                                    # 对位已保留（b19 P1 口径）
            val = q['answer'][k]
            done = False
            for i, o in enumerate(cur['opts'] if cur else q['opts']):
                if o['v'] != val:
                    continue
                if tap(i):
                    done = True
                    break
            if not done:
                return False
        return True

    # ---- 全量审计：48 关 × 8 题 ----
    all_levels = {}
    c2 = c3 = c4 = c6 = c7 = 0
    dup_fail, ch_fail, dec_fail, pool_fail, sig_fail = [], [], [], [], []
    for flat in AUDIT_FLATS:
        pg.evaluate("(f) => MD.start(f)", flat)
        qs, sigs = [], set()
        for k in range(N_Q):
            q = wait_recall(flat)
            if q is None:
                break
            if q is False:
                chk('M-start flat%d q%d 展示期超时' % (flat, k), False)
                q = None
                break
            qs.append(q)
            # M2 串互异（同串重复=倒背多解=非法题——数字/字母/颜色串同口径）
            if len(set(map(str, q['seq']))) != len(q['seq']):
                dup_fail.append((flat, k, q['seq']))
            # M3 章约束（五型表；生成关同表）
            spec = CHAP[q['dch']]
            bad = []
            if (q['kind'], q['mat']) not in spec['pairs']:
                bad.append('kind=%s mat=%s' % (q['kind'], q['mat']))
            if q['mode'] not in spec['modes']:
                bad.append('mode=%s' % q['mode'])
            if not (spec['lo'] <= len(q['seq']) <= spec['hi']):
                bad.append('len=%d' % len(q['seq']))
            if bool(q['delay']) != spec['delay']:
                bad.append('delay=%s' % q['delay'])
            if bad:
                ch_fail.append((flat, k, q['dch'], bad))
            else:
                c3 += 1
            # M4 Python 独立对账（分源第三实现：纯列表反转）
            want = list(q['seq']) if q['mode'] == 'fwd' else list(q['seq'])[::-1]
            if q['answer'] != want:
                dec_fail.append((flat, k, q['mode'], q['seq'], q['answer']))
            else:
                c4 += 1
            # M6 池对账（干扰 ∉ answer 值集 + 干扰数 len>=7→2 其余 3）
            ans_cnt = Counter(map(str, q['answer']))
            opt_cnt = Counter(str(o['v']) for o in q['opts'])
            extras = opt_cnt - ans_cnt
            short = ans_cnt - opt_cnt
            n_extra = sum(extras.values())
            want_extra = 2 if len(q['seq']) >= 7 else 3
            if any(v in set(map(str, q['answer'])) for v in extras.elements()) or short or n_extra != want_extra:
                pool_fail.append((flat, k, n_extra, sorted(extras.elements()), dict(short)))
            else:
                c6 += 1
            # M7 sig 互异
            s = sig_of(q)
            if s in sigs:
                sig_fail.append((flat, k))
            sigs.add(s)
            # 推进
            if k < N_Q - 1:
                if not fill_answer(q):
                    chk('M-推进 flat%d q%d 填卡失败' % (flat, k), False)
                    break
                adv = False
                for _ in range(300):
                    st = level_state()
                    if st and st['step'] == k + 1:
                        adv = True
                        break
                    pg.wait_for_timeout(30)
                if not adv:
                    chk('M-推进 flat%d q%d 未换题' % (flat, k), False)
                    break
        all_levels[flat] = qs
        c7 += len(sigs) == N_Q and len(qs) == N_Q
    N_TOTAL = len(AUDIT_FLATS) * N_Q
    chk('M2 串互异（%d 题）' % N_TOTAL, not dup_fail and len(all_levels) == len(AUDIT_FLATS), str(dup_fail[:3]))
    chk('M3 章约束（五型表 kind/mat/mode/len/delay）', not ch_fail and c3 == N_TOTAL, 'c3=%d %s' % (c3, ch_fail[:2]))
    chk('M4 Python 独立逆序对账', not dec_fail and c4 == N_TOTAL, 'c4=%d %s' % (c4, dec_fail[:2]))
    chk('M6 池=answer∪干扰（干扰∉answer+数 2/3）', not pool_fail and c6 == N_TOTAL, str(pool_fail[:2]))
    chk('M7 同关 %d 题 sig 互异（%d 关）' % (N_Q, len(AUDIT_FLATS)),
        not sig_fail and c7 == len(AUDIT_FLATS), str(sig_fail[:2]))

    # ---- M1 确定性：四型各抽 1 flat 双读对比 ----
    diff = []
    for flat in (0, 12, 24, 35):
        pg.evaluate("(f) => MD.start(f)", flat)
        qs2 = []
        for k in range(N_Q):
            q = wait_recall(flat)
            if not q:
                diff.append((flat, k, '展示超时'))
                break
            qs2.append(q)
            if k < N_Q - 1:
                if not fill_answer(q):
                    diff.append((flat, k, '填卡失败'))
                    break
                for _ in range(300):
                    st = level_state()
                    if st and st['step'] == k + 1:
                        break
                    pg.wait_for_timeout(30)
        if [json.dumps(x, sort_keys=True) for x in qs2] != [json.dumps(x, sort_keys=True) for x in all_levels.get(flat, [])]:
            diff.append((flat, '双读不一致'))
    chk('M1 确定性（flat 0/12/24/35 四型双读一致）', not diff, str(diff[:3]))

    # ---- M5 展示期锁定：start 后立即 tap → 拒绝且不吞题 ----
    pg.evaluate("(f) => MD.start(f)", 0)
    q0 = read_quiz()
    show_ok, notes = True, []
    if q0 and q0['phase'] == 'show':
        r = pg.evaluate("(i) => (async () => { try { return (await MD.tapNum(0)) === false } catch(e){ return false } })()")
        q1 = read_quiz()
        if r is not True:
            show_ok = False; notes.append('tapNum 未拒绝')
        if q1 and (q1['built'] and any(x is not None for x in q1['built'])):
            show_ok = False; notes.append('吞题 built=%s' % q1['built'])
        q2 = wait_recall(0)
        if not q2:
            show_ok = False; notes.append('遮盖后未进 recall')
    else:
        show_ok = False; notes.append('初相非 show: %s' % (q0 and q0['phase']))
    chk('M5 展示期锁定（拒绝+不吞题+recall 转移）', show_ok, ';'.join(notes))

    # ---- M9 dx 延迟相位：gap 态 tapNum 不吞题（SPEC：gap=干扰小任务窗） ----
    pg.evaluate("(f) => MD.start(f)", 35)
    gap_q, gnotes = None, []
    for _ in range(600):
        q = read_quiz()
        if q and q['phase'] == 'gap':
            gap_q = q
            break
        if q and q['phase'] == 'recall':
            break                                       # gap 窗短可能已穿过——不强断在场，只在在场时验
        pg.wait_for_timeout(30)
    if gap_q:
        pg.evaluate("(i) => (async () => { try { await MD.tapNum(0); } catch(e){} })()", 0)
        pg.wait_for_timeout(200)
        qa = read_quiz()
        if qa and qa.get('built') and any(x is not None for x in qa['built']):
            gnotes.append('gap 吞题 built=%s' % qa['built'])
        if qa and qa.get('phase') == 'show':
            gnotes.append('相位回退 show')
        q2 = wait_recall(35)
        if not q2:
            gnotes.append('gap 后未进 recall')
    chk('M9 dx 延迟相位（gap 态 tapNum 不吞题）', not gnotes, 'gap_seen=%s %s' % (bool(gap_q), ';'.join(gnotes)))

    # ---- M8 引擎直驱：flat0 首题错拼 → miss 恰一次 + 对位保留（强断言）+ 补位推进 ----
    pg.evaluate("(f) => MD.start(f)", 0)
    q0 = wait_recall(0)
    dist_i = next((i for i, o in enumerate(q0['opts']) if o['v'] not in set(q0['answer'])), None)
    ok8, notes8 = True, []
    if dist_i is not None:
        pg.evaluate("(i) => (async () => { await MD.tapNum(i) })()", dist_i)
        for kk in range(1, len(q0['answer'])):
            val = q0['answer'][kk]
            hit = False
            for i, o in enumerate(q0['opts']):
                if o['v'] == val and tap(i):
                    hit = True
                    break
            if not hit:
                ok8 = False; notes8.append('位 %d 填不进' % kk)
                break
        pg.wait_for_timeout(400)
        q1 = read_quiz()
        if not (q1 and q1['miss'] == 1):
            ok8 = False; notes8.append('miss!=1 got %s' % (q1 and q1['miss']))
        # 强断言：错位清空 + 对位恰保留 len-1（b19 弱断言教训——全清也过=无效断言）
        def cleaned_strong(qq):
            if not qq:
                return False
            kept = [k for k, bv in enumerate(qq['built']) if bv is not None]
            return qq['built'][0] is None and \
                all(qq['opts'][qq['built'][k]]['v'] == q0['answer'][k] for k in kept) and \
                len(kept) == len(q0['answer']) - 1
        got_strong = False
        for _ in range(60):
            q1 = read_quiz()
            if cleaned_strong(q1):
                got_strong = True
                break
            pg.wait_for_timeout(50)
        if not got_strong:
            ok8 = False; notes8.append('对位保留失败 built=%s' % (q1 and q1['built']))
        if ok8 and fill_answer(q1 or q0):
            adv = False
            for _ in range(300):
                st = level_state()
                if st and st['step'] == 1:
                    adv = True
                    break
                pg.wait_for_timeout(30)
            if not adv:
                ok8 = False; notes8.append('补位后未推进')
        elif ok8:
            ok8 = False; notes8.append('补位重拼失败')
    chk('M8 错拼=miss 恰一次+错位清空对位恰保留+补位推进', ok8, ';'.join(notes8))
    chk('M-end 0 pageerror（复验全程）', not errs, str(errs[:2]))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
