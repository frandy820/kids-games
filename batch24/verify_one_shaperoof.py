# -*- coding: utf-8 -*-
"""shaperoof 独立复验（5.5-6.5 段 v2 改造 delta 分源）——断言从 SPEC delta 推导，禁从实现行为归纳
S1 章约束（Python 独立封闭表：ch1=rot/洞∈有向4形+偏转1-3；ch2=mirror/镜像陷阱在场；
   ch3=combo/分解=SPEC 表；ch4=三型各≥1；瓦片 4 互异；ch 纯度）
S2 分离交互语义（sel/rotate 圈数 Python 独立复算/place 枚举 right|done|half|rot|mir|wrong|
   false；combo used 复放=false；combo 无朝向 tapRotate=False；镜像手性=转任意次仍 mir）
S3 确定性（flat 0/10/17/27/39 双读）/ S4 引擎直驱 40 关（选瓦→转到位→放置全链）
S5 星级 3★（排探测）/ S6 探测关 1 错=2★ / S7 家族 A+B 源码级（dayEnd 两处 lim-1+救援双锚）"""
import json, sys, os, io
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'shaperoof', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# ---- Python 独立封闭表（改造 delta 文字口径，禁抄页面） ----
PY_DIR4 = ['triangle', 'arrow', 'crescent', 'flag']
PY_MIRROR = {'flag': 'flagm', 'flagm': 'flag', 'bsh': 'dsh', 'dsh': 'bsh',
             'fish': 'fishm', 'fishm': 'fish'}
PY_CHIRAL6 = list(PY_MIRROR)
PY_SLABS = ['bar2v', 'bar2h', 'bar3v', 'bar3h', 'sq2']
PY_DECOMP = {'L': ['bar3v', 'bar2h'], 'T': ['bar3h', 'bar2v'], 'Z': ['bar2h', 'bar2v']}

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
    chk('S0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_q():
        return pg.evaluate('() => SR.quiz')
    def read_lv():
        return pg.evaluate('() => SR.currentLevel ? {step: SR.currentLevel.step, done: SR.currentLevel.done, stars: SR.currentLevel.stars} : null')
    def tap_piece(i):
        return pg.evaluate('(i) => (async () => { try { return await SR.tapPiece(i) } catch(e){ return "ERR" } })()', i)
    def tap_place(i):
        return pg.evaluate('(i) => (async () => { try { return await SR.tapPlace(i) } catch(e){ return "ERR" } })()', i)
    def tap_rotate():
        return pg.evaluate('() => (async () => { try { return await SR.tapRotate() } catch(e){ return "ERR" } })()')
    def wait_quiz():
        for _ in range(300):
            if read_q():
                return read_q()
            pg.wait_for_timeout(30)
        return None
    def stepped(k):
        lv = read_lv()
        return (lv and lv['step'] > k) or bool(lv and lv['done'])
    def wait_step(k, timeout_ms=8000):
        for _ in range(int(timeout_ms / 30)):
            if stepped(k):
                return True
            pg.wait_for_timeout(30)
        return False

    # ---- S1+S4 全量驱动 + 封闭表逐题断言（Python 表 + Python 复算圈数） ----
    ch_fail, near_fail, drive_fail, star_fail, wrong_probe, sem_fail = [], [], [], [], [], []
    PROBE = {3, 9, 17}
    for flat in range(40):
        pg.evaluate('(f) => { SR.start(f) }', flat)
        lv0 = pg.evaluate('() => SR.currentLevel')
        kinds_seen = []
        ok_break = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            kinds_seen.append(q['kind'])
            shape, tiles = q['hole'], q['tiles']
            # S1 章约束（Python 独立表逐题）
            if len(tiles) != 4 or len(set(t2['shape'] for t2 in tiles)) != 4:
                ch_fail.append((flat, k, '瓦片≠4 或重复', [t2['shape'] for t2 in tiles]))
            if q['kind'] == 'combo':
                if shape not in PY_DECOMP:
                    ch_fail.append((flat, k, '洞∉L/T/Z', shape))
                else:
                    need = PY_DECOMP[shape]
                    got = sorted(t2['shape'] for t2 in tiles if t2['right'])
                    if got != sorted(need):
                        ch_fail.append((flat, k, '分解≠SPEC 表', got, need))
                    if any(t2['shape'] not in PY_SLABS for t2 in tiles):
                        ch_fail.append((flat, k, '瓦∉板瓦表'))
            else:
                pool = PY_DIR4 if q['kind'] == 'rot' else PY_CHIRAL6
                if shape not in pool or not (0 <= q['need']['dir'] <= 3):
                    ch_fail.append((flat, k, '洞∉封闭表', shape))
                if any(t2['shape'] not in pool for t2 in tiles):
                    ch_fail.append((flat, k, '瓦∉封闭表', [t2['shape'] for t2 in tiles]))
                rights = [t2 for t2 in tiles if t2['right']]
                if len(rights) != 1 or rights[0]['shape'] != shape:
                    ch_fail.append((flat, k, 'right≠恰1=洞形'))
                elif not (1 <= (q['need']['dir'] - rights[0]['dir']) % 4 <= 3):
                    ch_fail.append((flat, k, '偏转∉1-3'))
                if q['kind'] == 'mirror' and PY_MIRROR[shape] not in [t2['shape'] for t2 in tiles]:
                    near_fail.append((flat, k, 'ch2 镜像陷阱不在场', shape))
            # 探测关 1 错（首题：rot=朝向错探测 / mirror=镜像错 / combo=干扰瓦）
            if flat in PROBE and k == 0:
                if q['kind'] == 'combo':
                    wi = [i for i, t2 in enumerate(tiles) if not t2['right']]
                    rw = tap_place(wi[0])
                    probe_exp = 'wrong'
                elif q['kind'] == 'mirror':
                    mi = [i for i, t2 in enumerate(tiles) if t2['shape'] == PY_MIRROR[q['hole']]]
                    tap_piece(mi[0])
                    rw = tap_place(mi[0])
                    probe_exp = 'mir'
                else:
                    ri = [i for i, t2 in enumerate(tiles) if t2['right']]
                    tap_piece(ri[0])
                    rw = tap_place(ri[0])      # 未转就放=朝向错
                    probe_exp = 'rot'
                pg.wait_for_timeout(150)
                qd = read_q()
                if not (rw == probe_exp and qd and qd['miss'] == 1):
                    wrong_probe.append((flat, k, probe_exp, rw, qd and qd['miss']))
            # S4 收敛驱动（Python 复算圈数 → 分离交互三入口）
            if not stepped(k):
                guard = 0
                while guard < 14:
                    qd = read_q()
                    if not qd:
                        pg.wait_for_timeout(220)
                        if stepped(k):
                            break
                        continue
                    if qd['kind'] == 'combo':
                        ri = [i for i, t2 in enumerate(qd['tiles']) if t2['right'] and not t2['used']]
                        if not ri:
                            break
                        tap_piece(ri[0])
                        pg.wait_for_timeout(80)
                        r = tap_place(ri[0])
                        if r not in ('half', 'right', 'done'):
                            drive_fail.append((flat, k, 'combo 放置失败', r))
                            break
                    else:
                        ri = [i for i, t2 in enumerate(qd['tiles']) if t2['right']]
                        if not ri:
                            break
                        i = ri[0]
                        tap_piece(i)
                        pg.wait_for_timeout(80)
                        turns = (qd['need']['dir'] - qd['tiles'][i]['dir']) % 4   # Python 独立复算
                        for _ in range(turns):
                            tap_rotate()
                            pg.wait_for_timeout(40)
                        r = tap_place(i)
                        if r not in ('right', 'done'):
                            drive_fail.append((flat, k, 'rot 放置失败', r, turns))
                            break
                    pg.wait_for_timeout(120)
                    guard += 1
                    if stepped(k):
                        break
                if not wait_step(k):
                    drive_fail.append((flat, k, '驱动未推进'))
                    ok_break = True
                    break
        # 章纯度 + 混合分布
        if not ok_break:
            if lv0['dch'] == 1 and set(kinds_seen) != {'rot'}:
                ch_fail.append((flat, 'dch1 纯度', kinds_seen))
            if lv0['dch'] == 2 and set(kinds_seen) != {'mirror'}:
                ch_fail.append((flat, 'dch2 纯度', kinds_seen))
            if lv0['dch'] == 3 and set(kinds_seen) != {'combo'}:
                ch_fail.append((flat, 'dch3 纯度', kinds_seen))
            if lv0['dch'] == 4 and set(kinds_seen) != {'rot', 'mirror', 'combo'}:
                ch_fail.append((flat, 'ch4 三型缺一', kinds_seen))
        # S5 星级（排探测关）
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE and not ok_break:
            st = -1
            for _ in range(6):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => SR.currentLevel && SR.currentLevel.stars != null ? SR.currentLevel.stars : -1')
                if st != -1:
                    break
            if st != 3 and st != -1:
                star_fail.append((flat, '全最优非3★', st))

    chk('S1 章约束（封闭表/瓦片互异/分解/偏转/章纯度/混合）', not ch_fail, str(ch_fail[:4]))
    chk('S2a ch2 镜像陷阱在场（flat5-9 含于全量）', not near_fail, str(near_fail[:4]))
    chk('S4 引擎直驱 40 关（选瓦→Python复算圈数→旋转→放置）', not drive_fail, str(drive_fail[:4]))
    chk('S5 星级（全最优=3★，排探测）', not star_fail, str(star_fail[:3]))

    # ---- S2b 分离交互语义单元（flat0 真实状态机） ----
    sem = []
    pg.evaluate('() => { SR.start(0) }')
    q0 = wait_quiz()
    ri0 = next(i for i, t2 in enumerate(q0['tiles']) if t2['right'])
    if tap_piece(99) is not False:
        sem.append('非法 tapPiece≠False')
    if tap_place(99) is not False:
        sem.append('非法 tapPlace≠False')
    if tap_rotate() is not False:
        sem.append('无选中 rotate≠False')
    tap_piece(ri0)
    turns0 = (q0['need']['dir'] - q0['tiles'][ri0]['dir']) % 4
    for n in range(turns0):
        r = tap_rotate()
        if not (isinstance(r, int) and 0 <= r <= 3):
            sem.append('rotate 返回非 dir:%r' % r)
    r_place = tap_place(ri0)
    if r_place != 'right':
        sem.append('转到位放置≠right:%r' % r_place)
    # 过转一轮再回正（mod 4 全环）
    pg.evaluate('() => { SR.start(0) }')
    q0b = wait_quiz()
    ri0b = next(i for i, t2 in enumerate(q0b['tiles']) if t2['right'])
    tap_piece(ri0b)
    seq = [tap_rotate() for _ in range(4)]      # +4 圈=回原位（mod4 全环）
    if q0b['tiles'][ri0b]['dir'] == 0 and seq != [1, 2, 3, 0]:
        sem.append('旋转圈序异常:%r' % seq)
    r_over = tap_place(ri0b)
    if r_over != 'rot':
        sem.append('转 4 圈（回原偏转）放置≠rot:%r' % r_over)
    pg.wait_for_timeout(1300)
    # combo：无朝向/used/half→right
    pg.evaluate('() => { SR.start(10) }')
    qc = wait_quiz()
    if tap_rotate() is not False:
        sem.append('combo 无选中 rotate≠False')
    i1 = next(i for i, t2 in enumerate(qc['tiles']) if t2['right'])
    tap_piece(i1)
    if tap_rotate() is not False:
        sem.append('combo 有选中 rotate≠False（无朝向）')
    r_half = tap_place(i1)
    used1 = pg.evaluate('() => SR.quiz.tiles[%d].used' % i1)
    r_reuse = tap_place(i1)
    i2 = pg.evaluate('() => SR.quiz.tiles.findIndex(t => t.right && !t.used)')
    r_2nd = tap_place(i2)
    if not (r_half == 'half' and used1 and r_reuse is False and r_2nd == 'right'):
        sem.append('combo 语义 half/used/2nd:%r/%r/%r' % (r_half, r_reuse, r_2nd))
    chk('S2b 分离交互语义（sel/rotate/place 枚举/combo/used）', not sem, str(sem[:4]))

    # ---- S3 确定性 ----
    det_fail = []
    for flat in (0, 10, 17, 27, 39):
        pg.evaluate('(f) => { SR.start(f) }', flat)
        a = json.dumps(read_q(), sort_keys=True)
        pg.evaluate('(f) => { SR.start(f) }', flat)
        c = json.dumps(read_q(), sort_keys=True)
        if a != c:
            det_fail.append(flat)
    chk('S3 确定性（双读 sig 相同）', not det_fail, str(det_fail))

    # ---- S6 探测关 1 错=2★（含分型探测 rot/mir/wrong——见 PROBE 段） ----
    s6_fail = []
    for flat in (3, 9, 17):
        pg.evaluate('(f) => { SR.start(f) }', flat)
        wronged = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                break
            if not wronged:
                if q['kind'] == 'combo':
                    wi = [i for i, t2 in enumerate(q['tiles']) if not t2['right']]
                    tap_place(wi[0]); wronged = True
                elif q['kind'] == 'mirror':
                    mi = [i for i, t2 in enumerate(q['tiles']) if t2['shape'] == PY_MIRROR[q['hole']]]
                    tap_piece(mi[0]); tap_place(mi[0]); wronged = True
                else:
                    ri = [i for i, t2 in enumerate(q['tiles']) if t2['right']]
                    tap_piece(ri[0]); tap_place(ri[0]); wronged = True
                pg.wait_for_timeout(1300)
                continue
            guard = 0
            while guard < 14 and not stepped(k):
                qd = read_q()
                if not qd:
                    pg.wait_for_timeout(220); continue
                if qd['kind'] == 'combo':
                    ri = [i for i, t2 in enumerate(qd['tiles']) if t2['right'] and not t2['used']]
                    if not ri: break
                    tap_piece(ri[0]); pg.wait_for_timeout(80); tap_place(ri[0])
                else:
                    ri = [i for i, t2 in enumerate(qd['tiles']) if t2['right']]
                    if not ri: break
                    i = ri[0]
                    tap_piece(i); pg.wait_for_timeout(80)
                    for _ in range((qd['need']['dir'] - qd['tiles'][i]['dir']) % 4):
                        tap_rotate(); pg.wait_for_timeout(40)
                    tap_place(i)
                pg.wait_for_timeout(120); guard += 1
            wait_step(k)
        st = -1
        for _ in range(8):
            pg.wait_for_timeout(200)
            st = pg.evaluate('() => SR.currentLevel && SR.currentLevel.stars != null ? SR.currentLevel.stars : -1')
            if st != -1: break
        if st != 2:
            s6_fail.append((flat, st))
    chk('S6 探测关 1 错=2★（rot/mir/wrong 分型探测）', not s6_fail and not wrong_probe,
        str(s6_fail) + str(wrong_probe[:2]))
    pg.close(); b.close()

# S7 家族 A+B 源码级
src = io.open(os.path.join(BASE, 'shaperoof', '_src', 'game-main.js'), encoding='utf-8').read()
s7 = []
if src.count('nextHint(lim - 1)') < 2:
    s7.append('dayEnd lim-1 <2 处: %d' % src.count('nextHint(lim - 1)'))
if 'lastDir' not in src:
    s7.append('无 lastDir 独立锚')
else:
    import re
    m = re.search(r'if \(idle > 14000[^{]*\{[\s\S]{0,600}?\n  \}', src)
    if m and 'lastAct = ' in m.group(0):
        s7.append('方向级分支仍重置 lastAct')
# v2 契约源码级：三入口在场 + 旧口已废 + 演示旋转实证
for sym in ('tapPiece', 'tapRotate', 'tapPlace', '__srDemoRot'):
    if sym not in src:
        s7.append('缺 v2 符号 %s' % sym)
if 'tapTile(' in src:
    s7.append('旧 tapTile 残留')
chk('S7 家族 A+B+v2 契约源码级', not s7, str(s7))

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
