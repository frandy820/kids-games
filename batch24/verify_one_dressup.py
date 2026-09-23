# -*- coding: utf-8 -*-
"""dressup 独立复验 r10 三族版（SPEC-BATCH24 §0.57+§8 分源）——断言从 SPEC 推导，禁从实现行为归纳
D0 verify 全绿+0 pageerror / D0b rec 序号化（levels=1-0..4-4 / gen=20..39）
D1a 表结构先验（6 主题件数 3/3/3/3/2/3+并集 17+free 2=19；MISFIT 每主题 ≥2；PAIR 对称；
    BUDGET_THEMES=5 无 rain）/ D1b 40 关审计（kind 按章+三族封闭规则+相邻主题互异）
D2a conflict 两击状态机（未选 False/sel/hold/错片 wrong miss+1）
D2b budget 装包状态机（错件 hold 无即时反馈/满员 [对,对,错]=wrong 错退对留 miss+1/peel 零惩罚）
D2c anti 单击即判（合适件 wrong miss+1 不推进 / 错位件 right 推进）
D3 budget 装 2/3 停 1.2s 不推进 / D4a 星级全最优 3★ / D4b 探测 1 错=2★（三族分流错击）
D5 free 零写档 / D6 确定性 / D7 家族 A+B 源码级 / D8 autoSolve flat0
D9 时长独立对账（Python 独立副本模型 40 关逐关 ≥40000ms；estMs 家族定版 n*345+600）"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'dressup', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# ---------- SPEC 结构性质（Python 侧先验独立副本——不依赖实现 id 拼写，§0.57+§8） ----------
SPEC_N_ITEMS = {'school': 3, 'sports': 3, 'nap': 3, 'party': 3, 'rain': 2, 'winter': 3}
SPEC_POOL = 19
SPEC_KIND = {1: 'conflict', 2: 'budget', 3: 'anti', 4: 'mix'}       # 难度章 dch=flat//5%4+1（静态 20 关）
SPEC_POOL_OF_KIND = {'conflict': 7, 'budget': 6}                    # anti=主题全集+1 错位件（3-4）
SPEC_BUDGET_THEMES = {'school', 'sports', 'nap', 'party', 'winter'}  # rain 2 件不入预算章
SPEC_PAIR = {'rain': 'winter', 'winter': 'rain', 'school': 'sports',
             'sports': 'school', 'nap': 'party', 'party': 'nap'}
# 时长模型独立副本（§8 定版；estMs 家族 n*345+600 禁 +300 变体）
T_EST = lambda c: c * 345 + 600
T_DECIDE = {'conflict': 6200, 'budget': 7800, 'anti': 5400}
T_TAP, T_ADV, T_SW, T_MIN = 430, 3200, 900, 40000


def dur_of(kind, stem_len, need_n):
    return max(T_EST(stem_len), T_DECIDE[kind]) + (0 if kind == 'anti' else need_n * T_TAP) + T_ADV


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    for _ in range(240):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('D0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    # D0b rec 序号化（levels 按章-关序号键 / gen 按 flat 数字键；40 关齐）
    raw = pg.eval_on_selector('#verify-result', 'el => el.textContent')
    out = json.loads(raw)
    lv_keys = sorted(out['levels'].keys())
    gen_keys = sorted(out['gen'].keys(), key=int)
    want_lv = sorted('%d-%d' % (c, l) for c in range(1, 5) for l in range(5))
    chk('D0b rec 序号化（levels=1-0..4-4 / gen=20..39，共 40）',
        lv_keys == want_lv and gen_keys == [str(f) for f in range(20, 40)] and
        all(re.match(r'^[1-9][0-9]*-[0-4]$', k) for k in lv_keys),
        'lv=%d gen=%d' % (len(lv_keys), len(gen_keys)))

    # 页面主题表（对拍基准；先按 SPEC 结构性质校验它本身）
    THEMES = pg.evaluate('() => THEMES') or {}
    MISFIT = pg.evaluate('() => MISFIT') or {}
    PAIR = pg.evaluate('() => PAIR_OF') or {}
    BUDGET_THEMES = pg.evaluate('() => BUDGET_THEMES') or []
    tbl_fail = []
    if set(THEMES.keys()) != set(SPEC_N_ITEMS.keys()):
        tbl_fail.append('主题集≠6: %s' % sorted(THEMES.keys()))
    pool = set()
    for th, d in THEMES.items():
        items = d.get('items') if isinstance(d, dict) else d
        if len(items) != SPEC_N_ITEMS[th]:
            tbl_fail.append((th, len(items)))
        pool.update(items)
    if len(pool) != 17:
        tbl_fail.append('并集≠17: %d' % len(pool))
    if PAIR != SPEC_PAIR:
        tbl_fail.append('PAIR 不对称/不符 SPEC: %s' % PAIR)
    mis_bad = []
    for th, v in MISFIT.items():
        if len(v) < 2 or set(v) - pool or (set(v) & set(THEMES[th]['items'])):
            mis_bad.append((th, v))
    if set(MISFIT.keys()) != set(SPEC_N_ITEMS.keys()) or mis_bad:
        tbl_fail.append('MISFIT 每主题 ≥2/池内/不在主题自身表: %s' % (mis_bad or MISFIT))
    if set(BUDGET_THEMES) != SPEC_BUDGET_THEMES:
        tbl_fail.append('BUDGET_THEMES≠5 无 rain: %s' % BUDGET_THEMES)

    def read_q():
        return pg.evaluate('() => DR.quiz')
    def read_lv():
        return pg.evaluate('() => DR.currentLevel ? {step: DR.currentLevel.step, done: DR.currentLevel.done, stars: DR.currentLevel.stars} : null')
    def tapS(i):
        return pg.evaluate('(i) => (async () => { try { return await DR.tapSticker(i) } catch(e){ return "ERR" } })()', i)
    def tapR():
        return pg.evaluate('() => (async () => { try { return await DR.tapRabbit() } catch(e){ return "ERR" } })()')
    def wait_quiz():
        for _ in range(300):
            if read_q():
                return read_q()
            pg.wait_for_timeout(30)
        return None
    def stepped(k):
        lv = read_lv()
        return (lv and lv['step'] > k) or bool(lv and lv['done'])
    def wait_step(k, timeout_ms=6000):
        for _ in range(int(timeout_ms / 30)):
            if stepped(k):
                return True
            pg.wait_for_timeout(30)
        return False

    # 探测关错击（三族分流：conflict/budget 两击错片——budget 须满员才计 miss；anti 单击合适件）
    def probe_wrong(q):
        if q['kind'] == 'anti':
            wi = next((i for i, s in enumerate(q['stickers']) if not s['right']), None)
            return wi is not None and tapS(wi) == 'wrong'
        if q['kind'] == 'budget':
            ri = [i for i, s in enumerate(q['stickers']) if s['right']]
            wi = next((i for i, s in enumerate(q['stickers']) if not s['right']), None)
            if wi is None or len(ri) < 3:
                return False
            for i in ri[:2]:
                tapS(i); tapR(); pg.wait_for_timeout(80)
            tapS(wi)
            return tapR() == 'wrong'
        wi = next((i for i, s in enumerate(q['stickers']) if not s['right']), None)
        if wi is None:
            return False
        tapS(wi)
        return tapR() == 'wrong'

    all_levels = {}
    ch_fail, drive_fail, star_fail = [], [], []
    PROBE = {3, 9, 17}                                  # 三章族各一（conflict/budget/anti）
    free_ids = set()
    kind_stat = {}
    for flat in range(40):
        pg.evaluate('(f) => { DR.start(f) }', flat)
        snaps = []
        ok_break = False
        kinds_here = set()
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            snaps.append(json.dumps(q, sort_keys=True))
            theme, need, stickers = q['theme'], q['need'], q['stickers']
            kind = q['kind']
            kinds_here.add(kind)
            kind_stat.setdefault(kind, 0)
            kind_stat[kind] += 1
            items = set(THEMES.get(theme, {}).get('items', []))
            ids = [s['id'] for s in stickers]
            # D1b：章约束（静态 20 关 kind 按章；生成关只验三族自身规则）
            if theme not in SPEC_N_ITEMS:
                ch_fail.append((flat, k, 'theme∉6', theme))
            if flat < 20:
                dch = flat // 5 + 1
                want = SPEC_KIND[dch]
                if want != 'mix' and kind != want:
                    ch_fail.append((flat, k, 'kind≠章', dch, kind))
                if want == 'mix' and kinds_here != {'conflict', 'budget', 'anti'} and k == 4:
                    ch_fail.append((flat, 'mix 缺族', sorted(kinds_here)))
            # 三族封闭规则（全部关）
            if kind == 'anti':
                if len(need) != 1 or need[0] not in MISFIT.get(theme, []):
                    ch_fail.append((flat, k, 'anti.need≠[错位件]∈MISFIT', theme, need))
                fits = sorted(s['id'] for s in stickers if not s['right'])
                if fits != sorted(items):
                    ch_fail.append((flat, k, 'anti.其余≠主题全集', theme, fits))
                if len(ids) != len(items) + 1:
                    ch_fail.append((flat, k, 'anti.候选数≠全集+1', len(ids)))
            else:
                if set(need) != items:
                    ch_fail.append((flat, k, 'need≠全集', theme, need))
                want_pool = SPEC_POOL_OF_KIND[kind]
                if len(ids) != want_pool:
                    ch_fail.append((flat, k, '候选数', kind, len(ids)))
                pair = PAIR.get(theme)
                pair_n = sum(1 for s in stickers if not s['right'] and s['id'] in THEMES.get(pair, {}).get('items', []))
                want_pair = 2 if kind == 'budget' else min(3, SPEC_N_ITEMS[pair])
                if pair_n < want_pair:
                    ch_fail.append((flat, k, '配对干扰不足', kind, pair_n))
                if kind == 'budget':
                    if theme not in SPEC_BUDGET_THEMES:
                        ch_fail.append((flat, k, 'budget 主题', theme))
                    if q.get('budget') != 3:
                        ch_fail.append((flat, k, 'budget≠3', q.get('budget')))
            # 通用：候选互异/need 在场/池封闭/相邻主题互异
            if len(set(ids)) != len(ids):
                ch_fail.append((flat, k, '候选重复', ids))
            if not set(need) <= set(ids):
                ch_fail.append((flat, k, 'need 不在候选', need, ids))
            for s in stickers:
                if s['theme'] == 'free':
                    free_ids.add(s['id'])
                elif s['id'] not in pool:
                    ch_fail.append((flat, k, '候选∉池', s))
            if k > 0 and snaps and theme == json.loads(snaps[k - 1])['theme']:
                ch_fail.append((flat, k, '相邻主题同', theme))
            # 探测关 1 错（星级口径）
            if flat in PROBE and k == 0:
                probe_wrong(q)
                pg.wait_for_timeout(120)
            # 驱动：三族分流逐题完成
            if not stepped(k):
                guard = 0
                while guard < 30 and not stepped(k):
                    qd = read_q()
                    if not qd:
                        pg.wait_for_timeout(200)
                        continue
                    if qd['kind'] == 'anti':
                        ri = next((i for i, s in enumerate(qd['stickers']) if s['right']), None)
                        if ri is None:
                            break
                        if tapS(ri) == 'ERR':
                            drive_fail.append((flat, k, 'tap ERR'))
                            break
                    else:
                        rem = [i for i, s in enumerate(qd['stickers'])
                               if s['id'] in qd['need'] and s['id'] not in (qd.get('placed') or [])]
                        if not rem:
                            break
                        tapS(rem[0])
                        rr = tapR()
                        if rr == 'ERR':
                            drive_fail.append((flat, k, 'tap ERR'))
                            break
                    pg.wait_for_timeout(80)
                    guard += 1
                if not wait_step(k):
                    drive_fail.append((flat, k, '驱动未推进'))
                    ok_break = True
                    break
        all_levels[flat] = snaps
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE and not ok_break:
            st = -1
            for _ in range(6):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => DR.currentLevel && DR.currentLevel.stars != null ? DR.currentLevel.stars : -1')
                if st != -1: break
            if st != 3 and st != -1:
                star_fail.append((flat, '全最优非3★', st))

    if len(pool) + len(free_ids) != SPEC_POOL:
        tbl_fail.append('池≠19: 并集 %d + free %s' % (len(pool), sorted(free_ids)))
    chk('D1a 表结构先验（6 主题件数/并集+free=19/PAIR/MISFIT/BUDGET_THEMES）', not tbl_fail, str(tbl_fail[:4]))
    chk('D1b 40 关审计（kind 按章+三族封闭+配对干扰+相邻互异）', not ch_fail, str(ch_fail[:4]))
    chk('D3 引擎直驱 40 关（三族分流驱动全推进）', not drive_fail, str(drive_fail[:4]))
    chk('D4a 星级（全最优=3★，排探测）', not star_fail, str(star_fail[:3]))

    # D2a conflict 两击状态机（flat1=ch1 纯 conflict 章）
    pg.evaluate('() => { DR.start(1) }')
    q = wait_quiz()
    ri = next(i for i, s in enumerate(q['stickers']) if s['id'] in q['need'])
    r0 = tapR()                                   # 未选中=False（无第二击语义）
    r1 = tapS(ri)                                 # 选中
    m0 = read_q()['miss']
    r2 = tapR()                                   # 贴对首件=hold
    wi = next(i for i, s in enumerate(q['stickers']) if s['id'] not in q['need'])
    r3 = tapS(wi); r4 = tapR()                    # 错片两击=wrong miss+1
    qd = read_q()
    chk('D2a conflict 两击状态机（False/sel/hold/wrong miss+1）',
        r0 is False and r1 == 'sel' and r2 in ('hold', 'right', 'done') and
        r3 == 'sel' and r4 == 'wrong' and qd['miss'] == m0 + 1,
        str([r0, r1, r2, r3, r4, qd['miss']]))

    # D2b budget 装包状态机（flat6=ch2 首关）：错件 hold 无反馈→peel 零惩罚→满员[对,对,错]=wrong 错退对留
    pg.evaluate('() => { DR.start(6) }')
    qb = wait_quiz()
    wi = next(i for i, s in enumerate(qb['stickers']) if not s['right'])
    ri = [i for i, s in enumerate(qb['stickers']) if s['right']]
    tapS(wi)
    h1 = tapR()                                   # 装入错件=hold（不判不弹）
    s_hold = read_q()
    pe = pg.evaluate('() => (async () => { try { return await DR.peel(0) } catch(e){ return "ERR" } })()')
    s_peel = read_q()
    tapS(ri[0]); tapR(); pg.wait_for_timeout(80)  # 2 对件
    tapS(ri[1]); tapR(); pg.wait_for_timeout(80)
    tapS(wi)
    cw = tapR()                                   # 满员 [对,对,错]=wrong
    s_w = read_q()
    lv_w = read_lv()
    chk('D2b budget 状态机（错件 hold/peel 零惩罚/满员 wrong 错退对留）',
        h1 == 'hold' and s_hold['miss'] == 0 and len(s_hold['placed']) == 1 and
        pe == qb['stickers'][wi]['id'] and s_peel['miss'] == 0 and len(s_peel['placed']) == 0 and
        cw == 'wrong' and s_w['miss'] == 1 and len(s_w['placed']) == 2 and
        all(x in qb['need'] for x in s_w['placed']) and lv_w['step'] == 0,
        str([h1, pe, cw, s_w['miss'], s_w['placed']]))

    # D2c anti 单击即判（flat10=ch3 首关）
    pg.evaluate('() => { DR.start(10) }')
    qa = wait_quiz()
    wi = next(i for i, s in enumerate(qa['stickers']) if not s['right'])
    ri = next(i for i, s in enumerate(qa['stickers']) if s['right'])
    aw = tapS(wi)                                 # 合适件=wrong miss+1 不推进
    pg.wait_for_timeout(200)
    s_aw = read_q()
    step_aw = read_lv()['step']                   # wrong 后先快照（right 单击会立刻推进）
    ar = tapS(ri)                                 # 错位件=right 推进
    ok_adv = wait_step(0)
    chk('D2c anti 单击即判（wrong miss+1 不推进 / right 推进）',
        qa['kind'] == 'anti' and aw == 'wrong' and s_aw['miss'] == 1 and step_aw == 0 and
        ar == 'right' and ok_adv,
        str([aw, ar, s_aw['miss'], step_aw]))

    # D3 预算装 2/3 停 1.2s 不推进（满员即检：未满不判）
    pg.evaluate('() => { DR.start(8) }')
    q8 = wait_quiz()
    ri8 = [i for i, s in enumerate(q8['stickers']) if s['right']][:2]
    for i in ri8:
        tapS(i); tapR(); pg.wait_for_timeout(80)
    lv0 = read_lv()
    qz = read_q()
    pg.wait_for_timeout(1200)
    lv1 = read_lv()
    q1 = read_q()
    d3 = (lv0 and lv1 and lv1['step'] == lv0['step'] and not lv1['done'] and
          len(qz.get('placed') or []) == 2 and len(q1.get('placed') or []) == 2)
    chk('D3 budget 装满才检（2/3 件停 1.2s 不推进）', bool(d3),
        'placed=%s step=%s' % (q1 and q1.get('placed'), lv1 and lv1['step']))

    # D6 确定性
    det_fail = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { DR.start(f) }', flat)
        a = json.dumps(read_q(), sort_keys=True)
        pg.evaluate('(f) => { DR.start(f) }', flat)
        c = json.dumps(read_q(), sort_keys=True)
        if a != c:
            det_fail.append(flat)
    chk('D6 确定性（双读 sig 相同）', not det_fail, str(det_fail))

    # D4b 探测关 1 错=2★（三族分流错击；flat3=conflict/flat9=budget/flat17=anti）
    s6 = []
    for flat in (3, 9, 17):
        pg.evaluate('(f) => { DR.start(f) }', flat)
        wronged = False
        for k in range(5):
            q = wait_quiz()
            if not q: break
            if not wronged:
                wronged = probe_wrong(q)
                pg.wait_for_timeout(120)
            guard = 0
            while guard < 30 and not stepped(k):
                qd = read_q()
                if not qd:
                    pg.wait_for_timeout(200); continue
                if qd['kind'] == 'anti':
                    ri = next((i for i, s in enumerate(qd['stickers']) if s['right']), None)
                    if ri is None: break
                    tapS(ri)
                else:
                    rem = [i for i, s in enumerate(qd['stickers'])
                           if s['id'] in qd['need'] and s['id'] not in (qd.get('placed') or [])]
                    if not rem: break
                    tapS(rem[0]); tapR()
                pg.wait_for_timeout(80); guard += 1
            wait_step(k)
        st = -1
        for _ in range(8):
            pg.wait_for_timeout(200)
            st = pg.evaluate('() => DR.currentLevel && DR.currentLevel.stars != null ? DR.currentLevel.stars : -1')
            if st != -1: break
        if st != 2:
            s6.append((flat, st))
    chk('D4b 探测关 1 错=2★（三族错击）', not s6, str(s6))

    # D5 free 零写档
    pg.evaluate('() => { DR.start(2) }')
    wait_quiz()
    snap_q = pg.evaluate('() => JSON.stringify(DR.quiz)')
    snap_lv = pg.evaluate('() => JSON.stringify(DR.currentLevel)')
    pg.evaluate('() => { DR.setMode("free") }')
    pg.wait_for_timeout(200)
    st0 = pg.evaluate('() => localStorage.getItem("kidsgame_dressup")')
    for i in range(3):
        pg.evaluate('(i) => (async () => { try { await DR.tapSticker(i) } catch(e){} })()', i)
        pg.evaluate('() => (async () => { try { await DR.tapRabbit() } catch(e){} })()')
        pg.wait_for_timeout(60)
    pg.evaluate('() => { try { DR.freePeel && DR.freePeel(0) } catch(e){} }')
    pg.evaluate('() => { try { DR.freeClear && DR.freeClear() } catch(e){} }')
    pg.wait_for_timeout(300)
    snap_q2 = pg.evaluate('() => JSON.stringify(DR.quiz)')
    snap_lv2 = pg.evaluate('() => JSON.stringify(DR.currentLevel)')
    st1 = pg.evaluate('() => localStorage.getItem("kidsgame_dressup")')
    d5 = snap_q2 == snap_q and snap_lv2 == snap_lv and (st0 is None or st0 == st1)
    chk('D5 free 零写档（quiz/关模型静止+存档不变）', bool(d5),
        'q=%s lv=%s save_same=%s' % (snap_q2 == snap_q, snap_lv2 == snap_lv, st0 == st1))

    # D8 autoSolve flat0
    pg.evaluate('() => { DR.setMode("task") }')
    pg.wait_for_timeout(200)
    pg.evaluate('() => { DR.start(0) }')
    r = pg.evaluate('() => (async () => { try { return await DR.autoSolve() } catch(e){ return "ERR" } })()')
    d8 = isinstance(r, dict) and r.get('done')
    chk('D8 autoSolve flat0 done', bool(d8), str(r)[:80])

    # D9 时长独立对账（Python 独立副本模型逐关重算 ≥40000ms）
    meta = pg.evaluate('Array.from({length:40}, (_, f) => { const L = genLevel(f); '
                       'return L.quizzes.map(q => [q.kind, q.stem.length, q.need.length]); })')
    dur_fail, dmin, dmin_flat = [], 1 << 60, -1
    for flat, quizzes in enumerate(meta):
        d = sum(dur_of(k, sl, nn) for k, sl, nn in quizzes) + 5 * T_SW
        if d < dmin:
            dmin, dmin_flat = d, flat
        if d < T_MIN:
            dur_fail.append((flat, d))
    chk('D9 时长独立对账（40 关 modeled ≥40000ms）', not dur_fail and len(meta) == 40,
        'min=%dms@flat%d fail=%s' % (dmin, dmin_flat, str(dur_fail[:3])))
    pg.close(); b.close()

# D7 家族 A+B 源码级
src = io.open(os.path.join(BASE, 'dressup', '_src', 'game-main.js'), encoding='utf-8').read()
s7 = []
if src.count('nextHint(lim - 1)') < 2:
    s7.append('dayEnd lim-1 <2 处: %d' % src.count('nextHint(lim - 1)'))
if 'rescueDirDone' not in src and 'lastDir' not in src:
    s7.append('无方向级独立节流锚')
m = re.search(r'idle > 14000[\s\S]{0,500}', src)
if m and 'lastAct = ' in m.group(0)[:500]:
    s7.append('方向级段 500 字内重置 lastAct')
chk('D7 家族 A+B 源码级', not s7, str(s7))

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
print('kind_stat:', json.dumps(kind_stat, ensure_ascii=False))
sys.exit(1 if fails else 0)
