# -*- coding: utf-8 -*-
"""emo 独立复验 r35 适配版（SPEC-R35-EMO 分源；原版=verify_one_emo.py SPEC-BATCH25 口径）
——断言从 SPEC 推导，禁从实现行为归纳。r35 改动腿：
  T1 ch1 全池（旧 BASIC4 断言退役）+ 近伙伴恒在场（NEAR 三对全域律）
  T3 近对在场从「仅 ch3」扩为全 40 关（三对）
  T2/T8 right 卡判定两向化（fwd=emo / rev=scene）+ faces 契约含 scene
  T4/T5/T6/T10/T11 语义不变
Python 侧独立封闭集（SPEC 真值，非游戏侧取）：
  EMOS6 = {happy,sad,angry,scared,surprised,worried}
  NEAR = {sad↔worried, angry↔scared, happy↔surprised}（r35 封闭三对）
  HARD4 = {sad,worried,angry,scared}（dch3 目标域）"""
import json, sys, os, io, re
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))          # batch25/（主线收编 r35 适配版；URL/静态源路径按主线布局改写）
URL = 'file:///' + os.path.join(HERE, 'emo', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

EMOS6 = {'happy', 'sad', 'angry', 'scared', 'surprised', 'worried'}   # SPEC-R35 封闭 6
NEAR = {'sad': 'worried', 'worried': 'sad', 'angry': 'scared', 'scared': 'angry',
        'happy': 'surprised', 'surprised': 'happy'}                   # r35 封闭三对
HARD4 = {'sad', 'worried', 'angry', 'scared'}                         # dch3 目标域


def right_idx(q):
    """两向 right 卡下标：rev=scene===quiz.scene；fwd=emo===quiz.emo"""
    if q.get('mode') == 'rev':
        for i, f in enumerate(q['faces']):
            if f.get('scene') == q['scene']:
                return i
        return None
    for i, f in enumerate(q['faces']):
        if f['emo'] == q['emo']:
            return i
    return None


def wrong_idx(q):
    ri = right_idx(q)
    if ri is None:
        return None
    for i in range(len(q['faces'])):
        if i != ri:
            return i
    return None


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
    chk('T0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_q():
        return pg.evaluate('() => EM.quiz')
    def read_lv():
        return pg.evaluate('() => EM.currentLevel ? {step: EM.currentLevel.step, done: EM.currentLevel.done, stars: EM.currentLevel.stars} : null')
    def tap(i):
        return pg.evaluate('(i) => (async () => { try { return await EM.tapFace(i) } catch(e){ return "ERR" } })()', i)
    def wait_quiz(timeout_ms=12000):
        for _ in range(int(timeout_ms / 30)):
            q = read_q()
            if q:
                return q
            pg.wait_for_timeout(30)
        return None
    def stepped(k):
        lv = read_lv()
        return (lv and lv['step'] > k) or bool(lv and lv['done'])
    def wait_step(k, timeout_ms=20000):
        for _ in range(int(timeout_ms / 60)):
            if stepped(k):
                return True
            pg.wait_for_timeout(60)
        return False

    # 40 关全量审计
    scene_emo = {}          # 情境→情绪映射收集（一致性+≥20）
    close_fail, near_fail, map_fail, drive_fail = [], [], [], []
    PROBE = {3, 9, 17}      # 探测关（1 错）从 3★ 断言排除
    DW = {5, 12}            # 双错防重入探测关
    star3_fail = []
    for flat in range(40):
        pg.evaluate('(f) => { EM.start(f) }', flat)
        dch = flat // 5 + 1 if flat < 20 else None
        if dch is None:
            dch = pg.evaluate('() => EM.currentLevel.dch')
        ok_break = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            emo, faces, mode = q['emo'], q['faces'], q.get('mode')
            femos = [f['emo'] for f in faces]
            # T1 封闭+两向契约
            if emo not in EMOS6 or not set(femos) <= EMOS6:
                close_fail.append((flat, k, '封闭集外', emo, femos))
            if mode not in ('fwd', 'rev'):
                close_fail.append((flat, k, 'mode 域', mode))
            if mode == 'fwd' and any(f.get('scene') is not None for f in faces):
                close_fail.append((flat, k, 'fwd 候选带 scene'))
            if mode == 'rev' and any(not f.get('scene') for f in faces):
                close_fail.append((flat, k, 'rev 候选缺 scene'))
            # T1b 近伙伴恒在场（r35 全域律）
            if NEAR.get(emo) not in femos:
                near_fail.append((flat, k, '近伙伴不在场', emo, femos))
            # T2 答案恰一次+干扰互异（两向：right 卡=fwd 情绪 / rev 情境）
            if mode == 'rev':
                scn = [f['scene'] for f in faces]
                if len(set(scn)) != 4 or q['scene'] not in scn:
                    close_fail.append((flat, k, 'rev 情境形状', scn))
            if femos.count(emo) != 1 or len(set(femos)) != 4:
                close_fail.append((flat, k, '答案/干扰形状', emo, femos))
            # T4 映射一致性：本题全部情境（fwd=答案情境 / rev=4 候选情境）出现即绑定情绪，
            # 任何情境再见不同情绪=失败（rev 候选绑定其候选情绪；答案情境绑定答案情绪——
            # 若引擎给 rev 答案候选配错情绪，两条绑定在同一 sid 上冲突即红）
            sids = [q['scene']] if mode == 'fwd' else [f['scene'] for f in faces]
            semos = [emo] if mode == 'fwd' else [
                emo if f['scene'] == q['scene'] else f['emo'] for f in faces]
            for sid, se in zip(sids, semos):
                prev = scene_emo.setdefault(sid, se)
                if prev != se:
                    map_fail.append((flat, k, '同情境两答案', sid, prev, se))
            # dch3 目标域
            if dch == 3 and emo not in HARD4:
                close_fail.append((flat, k, 'ch3 非 HARD4', emo))
            # T8 双错防重入（miss 只 +1）——首击 fire-and-forget
            if flat in DW and k == 0:
                wi = wrong_idx(q)
                m0 = q['miss']
                pg.evaluate('(i) => { EM.tapFace(i); return 1; }', wi)
                pg.wait_for_timeout(40)
                tap(wi)
                pg.wait_for_timeout(600)
                qd = read_q()
                if not (qd and qd['miss'] == m0 + 1):
                    drive_fail.append((flat, '窗内二击 miss 应只+1', m0, qd and qd['miss']))
                pg.wait_for_timeout(600)
            # 推进：点对（两向下标）
            if not stepped(k):
                ri = right_idx(q)
                r = tap(ri)
                if r not in ('right', 'done'):
                    drive_fail.append((flat, k, '点对返回非 right', r))
                if not wait_step(k):
                    drive_fail.append((flat, k, '驱动未推进'))
                    ok_break = True
                    break
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE and flat not in DW and not ok_break:
            st = -1
            for _ in range(6):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => EM.currentLevel && EM.currentLevel.stars != null ? EM.currentLevel.stars : -1')
                if st != -1: break
            if st not in (3, -1):
                star3_fail.append((flat, '全最优非3★', st))

    chk('T1 情绪封闭 6+两向契约+ch3 HARD4（40 关全量）', not close_fail, str(close_fail[:4]))
    chk('T3 近伙伴恒在场（三对，全 40 关）', not near_fail, str(near_fail[:4]))
    chk('T4 情境→情绪映射一致+情境 ≥20', not map_fail and len(scene_emo) >= 20,
        'n_scenes=%d %s' % (len(scene_emo), str(map_fail[:3])))
    chk('T8 驱动+双错防重入（miss 只 +1，两向下标）', not drive_fail, str(drive_fail[:4]))
    chk('T6a 星级全最优=3★（排探测）', not star3_fail, str(star3_fail[:3]))

    # T5 确定性
    det_fail = []
    for flat in (0, 10, 12, 27, 39):
        pg.evaluate('(f) => { EM.start(f) }', flat)
        a = json.dumps(read_q(), sort_keys=True)
        pg.evaluate('(f) => { EM.start(f) }', flat)
        c = json.dumps(read_q(), sort_keys=True)
        if a != c:
            det_fail.append(flat)
    chk('T5 确定性（双读 sig 相同）', not det_fail, str(det_fail))

    # T6b/c 探测关 1 错=2★、3 错=1★（两向 wrong 卡）
    s2, s1 = [], []
    for flat in (3, 9):
        pg.evaluate('(f) => { EM.start(f) }', flat)
        wronged = 0
        for k in range(5):
            q = wait_quiz()
            if not q: break
            if wronged < 1:
                wi = wrong_idx(q)
                tap(wi); wronged += 1
                pg.wait_for_timeout(1100)
            if not stepped(k):
                ri = right_idx(q)
                tap(ri); wait_step(k)
        st = -1
        for _ in range(8):
            pg.wait_for_timeout(200)
            st = pg.evaluate('() => EM.currentLevel && EM.currentLevel.stars != null ? EM.currentLevel.stars : -1')
            if st != -1: break
        if st != 2: s2.append((flat, st))
    for _ in range(1):
        flat = 17
        pg.evaluate('(f) => { EM.start(f) }', flat)
        wronged = 0
        for k in range(5):
            q = wait_quiz()
            if not q: break
            if wronged < 3:
                for _w in range(3 - wronged):
                    wi = wrong_idx(q)
                    tap(wi); pg.wait_for_timeout(1100)
                wronged = 3
            if not stepped(k):
                ri = right_idx(q)
                tap(ri); wait_step(k)
        st = -1
        for _ in range(8):
            pg.wait_for_timeout(200)
            st = pg.evaluate('() => EM.currentLevel && EM.currentLevel.stars != null ? EM.currentLevel.stars : -1')
            if st != -1: break
        if st != 1: s1.append((flat, st))
    chk('T6b 1 错=2★', not s2, str(s2))
    chk('T6c 3 错=1★', not s1, str(s1))
    pg.close(); b.close()

# T10 家族 A+B 源码级（SPEC 契约：启动 lim-1 / winFlow / 方向级独立锚不重置 lastAct）
src = io.open(os.path.join(HERE, 'emo', '_src', 'game-main.js'), encoding='utf-8').read()
s10 = []
if src.count('nextHint(lim - 1)') < 1:
    s10.append('启动 dayEnd 无 lim-1')
if 'dayEnd({ nextHint: nextHint(null) })' not in src and src.count('nextHint(lim - 1)') < 2:
    s10.append('winFlow dayEnd 非定版形态')
if 'lastDir' not in src:
    s10.append('无方向级独立节流锚')
m = re.search(r'lastDir[\s\S]{0,400}', src)
if m and 'lastAct = ' in m.group(0)[:400]:
    s10.append('方向级段 400 字内重置 lastAct')
chk('T10 家族 A+B 源码级', not s10, str(s10))

# T11 hint 结构源码存在（C7 型）+ r35 门族（hearBtn 四门——r34 F1 防复发）
data_src = io.open(os.path.join(HERE, 'emo', '_src', 'game-data.js'), encoding='utf-8').read()
s11 = []
if not re.search(r'CHAPTERS\s*[:=]', data_src):
    s11.append('game-data 无 CHAPTERS')
if data_src.count('hint:') < 4:
    s11.append('章对象 hint 字段不足 4')
if not re.search(r'GEN_HINTS\s*[:=]\s*\[', data_src):
    s11.append('无 GEN_HINTS 数组')
if "happy: 'surprised', surprised: 'happy'" not in data_src:
    s11.append('NEAR 缺第三对（r35 全域律前提）')
if "'emo_rev_q'" not in data_src:
    s11.append('VOICE 缺 emo_rev_q（TODO 键）')
hear_seg = src.split('hearBtn.addEventListener')[1][:400] if 'hearBtn.addEventListener' in src else ''
if 'state.locked || state.demo || state.won' not in hear_seg:
    s11.append('hearBtn 门缺四件（r34 F1 防复发）')
chk('T11 hint/CHAPTERS/GEN_HINTS/NEAR 三对/门族（game-data+game-main，C7 细判交审查）',
    not s11, str(s11))

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
