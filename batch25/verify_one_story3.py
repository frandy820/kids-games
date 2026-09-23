# r34 主线收编（2026-09-21）：本文件=Executor 适配副本 _src/_r34_verify_one_adapted.py 整替
# （URL 改回主线相对路径）；4 腿适配详情见头部 docstring 与 SPEC-R34-STORY3 §R7。
# -*- coding: utf-8 -*-
"""story3 独立复验——r34 难度谱适配版（SPEC-R34-STORY3 §R7 逐腿适配清单的执行体）
与主线 batch25/verify_one_story3.py 的差异（仅 4 腿适配，其余逐字保持）：
  T2 帧形状：3 帧恒形 → 按 SPEC-R34 §R2 帧数表（ch1=3/ch2=4/ch3=5）+ 干扰帧律
      （dch≥2 恰 1 张 pos=-1、源故事≠本题、帧号<源 N、id 全互异）
  T4 反馈语义：方位反馈（sto_w_first/sto_w_mid）已按 §R1 维度二退休 →
      去泄序断言：自有帧错=sto_hint / 干扰帧错=sto_w_out（__stoVlog 通道）/ 全程无退休键
  主驱动循环：dch3/4 qi1/qi3 排完帧后进入因果问句相位（step 不推）→ 补 tapWhy(真因果) 再推进
  T7 复述句：flat0 3 帧（先/然后/最后）原断言保持 + 增 flat5 4 帧格式（接着 + recapKey=sto_recap4_*）
  新增 T8 因果问句律（dch∈{3,4} ⇔ qi∈{1,3}；opts=['a','b'] 置换）
Python 侧独立真值（SPEC-R34 §R2 文字表，非游戏侧取）：
  章池 ch1={wake,meal,laundry,night} ch2={seed,cate,rain,chick} ch3={sunwalk,bird,meals,shadow}
  帧数 wake/meal/laundry/night=3  seed/cate/rain/chick=4  sunwalk/bird/meals/shadow=5
  why 触发位 qi∈{1,3} 且 dch∈{3,4}
"""
import json, sys, os, io, re
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))          # batch25/
URL = 'file:///' + os.path.join(BASE, 'story3', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

CH_POOL = {1: {'wake', 'meal', 'laundry', 'night'},
           2: {'seed', 'cate', 'rain', 'chick'},
           3: {'sunwalk', 'bird', 'meals', 'shadow'}}
ALL12 = set().union(*CH_POOL.values())
N_FRAMES = {'wake': 3, 'meal': 3, 'laundry': 3, 'night': 3,
            'seed': 4, 'cate': 4, 'rain': 4, 'chick': 4,
            'sunwalk': 5, 'bird': 5, 'meals': 5, 'shadow': 5}
WHY_QI = {1, 3}                                             # dch∈{3,4} 因果问句触发位

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
        return pg.evaluate('() => ST.quiz')
    def read_lv():
        return pg.evaluate('() => ST.currentLevel ? {step: ST.currentLevel.step, done: ST.currentLevel.done, stars: ST.currentLevel.stars, dch: ST.currentLevel.dch} : null')
    def tap(i):
        return pg.evaluate('(i) => (async () => { try { return await ST.tapFrame(i) } catch(e){ return "ERR" } })()', i)
    def tap_why(i):
        return pg.evaluate('(i) => (async () => { try { return await ST.tapWhy(i) } catch(e){ return "ERR" } })()', i)
    def vlog_len():
        return pg.evaluate('() => window.__stoVlog.length')
    def vlog_seg(a):
        return pg.evaluate('(a) => window.__stoVlog.slice(a).map(e => e.k)', a)
    def wait_quiz(timeout_ms=15000):
        for _ in range(int(timeout_ms / 30)):
            q = read_q()
            if q:
                return q
            pg.wait_for_timeout(30)
        return None
    def stepped(k):
        lv = read_lv()
        return (lv and lv['step'] > k) or bool(lv and lv['done'])
    def wait_step(k, timeout_ms=25000):
        for _ in range(int(timeout_ms / 60)):
            if stepped(k):
                return True
            pg.wait_for_timeout(60)
        return False
    def right_idx(q):
        return next((i for i, f in enumerate(q['frames']) if f['pos'] == q['slot'] and not f['placed']), None)

    story_seen = set()
    close_fail, frame_fail, sm_fail, fb_fail, drive_fail, recap_fail, why_fail = [], [], [], [], [], [], []
    PROBE = {3, 9}
    DW = {5, 12}
    star3_fail = []
    for flat in range(40):
        pg.evaluate('(f) => { ST.start(f) }', flat)
        lv0 = read_lv()
        dch = lv0['dch'] if lv0 else (flat // 5 + 1 if flat < 20 else None)
        ok_break = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            story, frames, slot = q['story'], q['frames'], q['slot']
            story_seen.add(story)
            # T1 封闭+章池（静态关；生成关 dch 任意、池=全 12）
            if story not in ALL12:
                close_fail.append((flat, k, '故事出封闭库', story))
            if dch in CH_POOL and story not in CH_POOL[dch]:
                close_fail.append((flat, k, '章池错位', dch, story))
            # T2 帧形状（r34 适配）：own=N 帧置换非恒等 + 干扰帧律 + why 律
            ids = [f['id'] for f in frames]
            own = [f for f in frames if f['pos'] >= 0]
            dis = [f for f in frames if f['pos'] == -1]
            N = N_FRAMES.get(story, -1)
            if len(set(ids)) != len(ids) or len(own) != N or sorted(f['pos'] for f in own) != list(range(N)):
                frame_fail.append((flat, k, '帧形状', ids, [f['pos'] for f in frames]))
            if [f['pos'] for f in own] == list(range(N)):
                frame_fail.append((flat, k, '呈现未乱序'))
            if any(f['id'] != story + '-f' + str(f['pos']) for f in own):
                frame_fail.append((flat, k, '自有帧 id', story))
            if dch is not None:
                if (len(dis) == 1) != (dch >= 2):
                    frame_fail.append((flat, k, '干扰帧数', dch, len(dis)))
                if len(dis) == 1:
                    m = re.match(r'^(.*)-f(\d+)$', dis[0]['id'])
                    if not m or m.group(1) == story or m.group(1) not in ALL12 or int(m.group(2)) >= N_FRAMES[m.group(1)]:
                        frame_fail.append((flat, k, '干扰帧源', dis[0]['id']))
            # T8 why 律（r34 新增）：dch∈{3,4} ⇔ qi∈{1,3}；opts=['a','b']
            if dch is not None:
                want_why = dch in (3, 4) and k in WHY_QI
                got_why = q.get('why') is not None
                if want_why != got_why:
                    why_fail.append((flat, k, 'why开关', dch, got_why))
                if got_why and sorted(q['why']['opts']) != ['a', 'b']:
                    why_fail.append((flat, k, 'whyOpts', q['why']['opts']))
            # T3/T4 状态机与去泄序反馈深探（DW 关题0）
            if flat in DW and k == 0:
                vl0 = vlog_len()
                m0, s0 = q['miss'], q['slot']
                di = next((i for i, f in enumerate(frames) if f['pos'] == -1), None)
                if di is not None:                     # 干扰帧错点+窗内二击吞入
                    pg.evaluate('(i) => { ST.tapFrame(i); return 1; }', di)
                    pg.wait_for_timeout(40)
                    r2 = tap(di)
                    pg.wait_for_timeout(1050)
                    qd = read_q()
                    if not (r2 in (False, None, 'hold') and qd and qd['miss'] == m0 + 1 and qd['slot'] == s0
                            and not any(f['placed'] for f in qd['frames'])):
                        sm_fail.append((flat, '干扰帧双击防重入/状态机', r2, qd and (qd['miss'], qd['slot'])))
                    if 'sto_w_out' not in vlog_seg(vl0):
                        fb_fail.append((flat, '干扰帧错点缺 sto_w_out', vlog_seg(vl0)[:6]))
                wi = next((i for i, f in enumerate(frames) if f['pos'] >= 0 and f['pos'] != slot and not f['placed']), None)
                if wi is not None:                     # 自有帧错点=sto_hint（去泄序）
                    vl1 = vlog_len()
                    tap(wi)
                    pg.wait_for_timeout(1100)
                    seg1 = vlog_seg(vl1)
                    if 'sto_hint' not in seg1:
                        fb_fail.append((flat, '自有帧错点缺 sto_hint', seg1[:6]))
            # 已放帧不可再点（flat6 题0）
            if flat == 6 and k == 0:
                ri0 = right_idx(q)
                tap(ri0)
                pg.wait_for_timeout(300)
                qd = read_q()
                pi = next((i for i, f in enumerate(qd['frames']) if f['placed']), None)
                rp = tap(pi)
                qd2 = read_q()
                if not (rp in (False, None, 'hold') and qd2 and qd2['slot'] == qd['slot'] and qd2['miss'] == qd['miss']):
                    sm_fail.append((flat, '已放帧可再点/误罚', rp))
            if flat == 0 and k == 0:
                vl_r0 = vlog_len()
            # 推进：逐槽点对 + why 相位点真因果（r34 适配主驱动）
            guard = 0
            while guard < 14 and not stepped(k):
                qd = read_q()
                if not qd:
                    pg.wait_for_timeout(200); guard += 1; continue
                if qd.get('answered') and qd.get('why') and not qd['why']['done']:
                    wi = qd['why']['opts'].index('a')
                    rw = tap_why(wi)
                    if rw == 'ERR':
                        drive_fail.append((flat, k, 'tapWhy ERR')); break
                    pg.wait_for_timeout(150); guard += 1; continue
                ri = right_idx(qd)
                if ri is None:
                    if not (qd.get('answered') and qd.get('why')):
                        drive_fail.append((flat, k, '无可点正确帧'))
                    break
                r = tap(ri)
                if r == 'ERR':
                    drive_fail.append((flat, k, 'tap ERR'))
                    break
                pg.wait_for_timeout(120)
                guard += 1
            if not wait_step(k):
                drive_fail.append((flat, k, '驱动未推进'))
                ok_break = True
                break
            if flat == 0 and k == 0:
                # T7a 3 帧复述（先/然后/最后）——vlog 通道（verify 页 TTS 抑制，同原版口径）
                vl = pg.evaluate('() => window.__stoVlog.filter(e => e.k === "recap").map(e => e.t)')
                if not (vl and '先' in vl[-1] and '然后' in vl[-1] and '最后' in vl[-1]):
                    recap_fail.append((flat, k, str(vl[-1:])[:160]))
            if flat == 5 and k == 0:
                # T7b 4 帧复述格式（先/然后/接着/最后 + recapKey=sto_recap4_*）——r34 新格式
                vl = pg.evaluate('() => window.__stoVlog.filter(e => e.k === "recap").map(e => e.t)')
                rk = pg.evaluate('() => window.__stoVlog.filter(e => e.k === "recapKey").map(e => e.t)')
                if not (vl and '先' in vl[-1] and '然后' in vl[-1] and '接着' in vl[-1] and '最后' in vl[-1]
                        and rk and rk[-1].startswith('sto_recap4_')):
                    recap_fail.append((flat, k, str(vl[-1:])[:120] + ' rk=' + str(rk[-1:])[:60]))
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE and flat not in DW and not ok_break:
            st = -1
            for _ in range(6):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => ST.currentLevel && ST.currentLevel.stars != null ? ST.currentLevel.stars : -1')
                if st != -1: break
            if st not in (3, -1):
                star3_fail.append((flat, '全最优非3★', st))

    chk('T1 故事库封闭 12+章池分布', not close_fail and len(story_seen) >= 12, 'n=%d %s' % (len(story_seen), str(close_fail[:4])))
    chk('T2 帧形状（SPEC-R34 帧数表 3/4/5+干扰帧律）', not frame_fail, str(frame_fail[:4]))
    chk('T3 槽位状态机（错点不清已对+已放帧不可再点）', not sm_fail, str(sm_fail[:4]))
    chk('T4 去泄序反馈（自有=sto_hint/干扰=sto_w_out）', not fb_fail, str(fb_fail[:3]))
    chk('T8 因果问句律（dch3/4 ⇔ qi1/3；opts a/b）', not why_fail, str(why_fail[:3]))
    chk('T7 复述句触发（3帧 先…最后… + 4帧 接着/recap4 键）', not recap_fail, str(recap_fail[:2]))
    chk('主驱动循环（40 关全推进=帧+why 真因果）', not drive_fail, str(drive_fail[:4]))
    chk('T6a 星级全最优=3★（排探测）', not star3_fail, str(star3_fail[:3]))

    # T5 确定性
    det_fail = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { ST.start(f) }', flat)
        a = json.dumps(read_q(), sort_keys=True)
        pg.evaluate('(f) => { ST.start(f) }', flat)
        c = json.dumps(read_q(), sort_keys=True)
        if a != c:
            det_fail.append(flat)
    chk('T5 确定性（双读 sig 相同）', not det_fail, str(det_fail))

    # T6b 1 错=2★（探测关）
    s2 = []
    for flat in (3, 9):
        pg.evaluate('(f) => { ST.start(f) }', flat)
        wronged = False
        for k in range(5):
            q = wait_quiz()
            if not q: break
            if not wronged:
                wi = next((i for i, f in enumerate(q['frames']) if f['pos'] != q['slot'] and not f['placed']), None)
                tap(wi); wronged = True
                pg.wait_for_timeout(1100)
            guard = 0
            while guard < 14 and not stepped(k):
                qd = read_q()
                if not qd: break
                if qd.get('answered') and qd.get('why') and not qd['why']['done']:
                    tap_why(qd['why']['opts'].index('a')); pg.wait_for_timeout(150); guard += 1; continue
                ri = right_idx(qd)
                if ri is None: break
                tap(ri); pg.wait_for_timeout(120); guard += 1
            wait_step(k)
        st = -1
        for _ in range(8):
            pg.wait_for_timeout(200)
            st = pg.evaluate('() => ST.currentLevel && ST.currentLevel.stars != null ? ST.currentLevel.stars : -1')
            if st != -1: break
        if st != 2: s2.append((flat, st))
    chk('T6b 1 错=2★', not s2, str(s2))
    pg.close(); b.close()

# T10 家族 A+B 源码级（逐字保持原版）
src = io.open(os.path.join(BASE, 'story3', '_src', 'game-main.js'), encoding='utf-8').read()
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

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
