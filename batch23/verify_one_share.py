# -*- coding: utf-8 -*-
"""share 独立复验（SPEC-BATCH23 §0.53+§2 分源 + SPEC-R22-SHARE r22 修订）——断言从 SPEC 推导，禁从实现行为归纳
S1 章约束（Python 独立）：ch1 k2 N∈{2,4,6,8,10} even / ch2 k3 N∈{3,6,9,12} even /
   ch3 rem k∈{2,3,4} N∈REM14 表（余<k）且每关恰 2 题 k4（r22 §R2 关级聚合）/
   ch4（flat15-19+35-39）cmp·rev 作答域：cmp-who dist∈CMP_WHO 唯一最多（qi0 恒 who）/
   cmp-diff dist∈CMP_DIFF 唯一最多+唯一最少 d∈[1,3] opts 4 含 d 域[1,5] 无重 /
   rev x∈{2,3} k∈{2,3,4} n=x*k opts 4 含 n 域[1,12] 无重
S2 两击制状态机（无选糖 tapBowl=False；tapCandy=pick+sel；入碗=tray-1/bowls[j]+1/sel 复位——状态对账口径）
S3 自动判定（Python 复算：split even 均衡+tray0=推进；rem 均衡+tray<k → ready → tapPlate 收尾；
   r22 cmp/rev=Python 推导正确答案 pickAnimal/pickNum 一次推进）
S4 takeBack（bowls[j]-1/tray+1/miss+1）
S5 星级（最优=3★/1 取回=2★ 抽关 + r22 答错 1 次=2★：qmiss 口径与 takebacks 同入分档）
S6 确定性双读+autoSolve+非法+0 pageerror
静音双保险：每页面 goto 前挂静音 init_script（speak/Audio no-op）+种档 sound:false（r19 外放事故纪律）。"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'share', 'index.html').replace(chr(92), '/') + '?verify=1'
results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# 静音双保险 init_script（r19 教训：speechSynthesis no-op + Audio.play 派发 ended + 种档 sound:false）
MUTE = """(() => {
  try { localStorage.setItem('kidsgame_share', JSON.stringify({v:'1.0',game:'share',levels:{},settings:{sound:false,tts:false,vol:0}})); } catch(e){}
  window.speechSynthesis && (speechSynthesis.speak = () => {}, speechSynthesis.cancel = () => {});
  const ap = Audio.prototype.play; Audio.prototype.play = function(){ try{ this.dispatchEvent(new Event('ended')); }catch(e){} return Promise.resolve(); };
})();"""

# Python 独立章表（SPEC-BATCH23 §2 + SPEC-R22-SHARE §R2/§R3 定版——四方同步红线之一）
EVEN1 = [(n, 2) for n in (2, 4, 6, 8, 10)]
EVEN2 = [(n, 3) for n in (3, 6, 9, 12)]
REM = [(5, 2), (5, 3), (7, 2), (7, 3), (8, 3), (10, 3), (11, 2), (11, 3),
       (5, 4), (6, 4), (7, 4), (9, 4), (10, 4), (11, 4)]           # r22 REM14（k2/3+新 k4 六对）
CMP_WHO = [(4, 2), (4, 3), (5, 3), (5, 4), (6, 4), (6, 5),
           (3, 2, 2), (4, 2, 2), (4, 3, 3), (5, 3, 3), (3, 2, 2, 2)]
CMP_DIFF = [(3, 2), (4, 2), (5, 2), (5, 3), (6, 3), (6, 4), (7, 4),
            (4, 3, 1), (4, 3, 2), (5, 3, 2), (5, 4, 2)]
REV_XK = [(2, 2), (2, 3), (2, 4), (3, 2), (3, 3), (3, 4)]

def is_dch4(flat):
    """难度章 (ch-1)%4+1：ch=flat//5+1 → dch4 ⇔ flat//5 % 4 == 3"""
    return (flat // 5) % 4 == 3

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.add_init_script(MUTE)                     # 静音双保险（每 goto 生效）
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
        return pg.evaluate('() => SH.quiz')

    def read_lv():
        return pg.evaluate('() => SH.currentLevel ? {step: SH.currentLevel.step, done: SH.currentLevel.done, qmiss: SH.currentLevel.qmiss} : null')

    def call(fn, *a):
        return pg.evaluate('(a) => (async () => { try { return await SH[a[0]](a[1], a[2]) } catch(e){ return "ERR" } })()', [fn] + list(a))

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

    def ans_of(q):
        """r22 作答题正确答案（Python 复算：who=唯一 argmax 站 / diff=max−min / rev=x*k）"""
        if q['mode'] == 'cmp' and q['ask'] == 'who':
            return ('animal', q['bowls'].index(max(q['bowls'])))
        if q['mode'] == 'cmp':
            return ('num', max(q['bowls']) - min(q['bowls']))
        return ('num', q['x'] * q['k'])

    def drive_one(q, k, wrong_first=False):
        """驱动一题到推进（split=最优分配；cmp/rev=正确作答；wrong_first=先答错一次再对）"""
        if q.get('mode', 'split') != 'split':
            kind, val = ans_of(q)
            if wrong_first:
                if kind == 'animal':
                    wj = 0 if val != 0 else 1
                    call('pickAnimal', wj)
                else:
                    wi = next(i for i, v in enumerate(q['opts']) if v != val)
                    call('pickNum', wi)
                pg.wait_for_timeout(80)
            if kind == 'animal':
                call('pickAnimal', val)
            else:
                call('pickNum', q['opts'].index(val))
            pg.wait_for_timeout(80)
            return wait_step(k)
        n, kk = q['n'], q['k']
        per = n // kk
        for j in range(kk):
            for _ in range(per):
                if stepped(k):
                    break
                call('tapCandy', 0)              # i=托盘槽位（入碗后重排，恒取首颗）
                call('tapBowl', j)
                pg.wait_for_timeout(50)
            if stepped(k):
                break
        if not stepped(k):
            qz = read_q()
            if qz and qz.get('ready'):
                call('tapPlate')
                pg.wait_for_timeout(80)
            return wait_step(k)
        return True

    # ---- 全量审计：40 关 × 5 题 ----
    all_levels = {}
    ch_fail, state_fail, drive_fail, star_fail, k4_fail = [], [], [], [], []
    PROBE_STATE = {2, 12}                    # S2/S4 探测关（miss 污染——从 3★ 排除）
    for flat in range(40):
        pg.evaluate('(f) => { SH.start(f) }', flat)
        snaps = []
        ok_break = False
        n_k4 = 0
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            snaps.append(json.dumps(q, sort_keys=True))
            mode = q.get('mode', 'split')
            n, kk, kind = q['n'], q['k'], q['kind']
            if 10 <= flat < 15 and kk == 4:
                n_k4 += 1
            # S1 章约束（Python 独立复算）
            if mode == 'split':
                if kind != ('even' if n % kk == 0 else 'rem'):
                    ch_fail.append((flat, k, 'kind 口径', n, kk, kind))
                if flat < 5 and (n, kk) not in EVEN1:
                    ch_fail.append((flat, k, 'ch1 池外', n, kk))
                elif 5 <= flat < 10 and (n, kk) not in EVEN2:
                    ch_fail.append((flat, k, 'ch2 池外', n, kk))
                elif 10 <= flat < 15 and (n, kk) not in REM:
                    ch_fail.append((flat, k, 'ch3 池外（REM14）', n, kk))
                if q['bowls'] != [0] * kk or q['tray'] != n or q['plate'] != 0:
                    ch_fail.append((flat, k, '初始态', q['bowls'], q['tray']))
            else:
                # r22 dch4 作答域（Python 独立：池表+唯一性+opts）
                if not is_dch4(flat):
                    ch_fail.append((flat, k, 'cmp/rev 出现在非 dch4', mode))
                elif mode == 'cmp':
                    dist = tuple(q['bowls'])
                    ask = q['ask']
                    if k == 0 and ask != 'who':
                        ch_fail.append((flat, k, 'qi0 非 who 热身', ask))
                    if dist.count(max(dist)) != 1:
                        ch_fail.append((flat, k, 'cmp 非唯一最多', dist))
                    if ask == 'who':
                        if dist not in CMP_WHO:
                            ch_fail.append((flat, k, 'cmp-who 池外', dist))
                    elif ask == 'diff':
                        d = max(dist) - min(dist)
                        if dist not in CMP_DIFF or not (1 <= d <= 3) or dist.count(min(dist)) != 1:
                            ch_fail.append((flat, k, 'cmp-diff 池外/口径', dist))
                        opts = q.get('opts')
                        if not opts or len(opts) != 4 or len(set(opts)) != 4 or \
                           d not in opts or any(v < 1 or v > 5 for v in opts):
                            ch_fail.append((flat, k, 'diff opts 口径', opts))
                    else:
                        ch_fail.append((flat, k, 'ask 非法', ask))
                elif mode == 'rev':
                    x = q['x']
                    if (x, kk) not in REV_XK or n != x * kk:
                        ch_fail.append((flat, k, 'rev 域外', x, kk, n))
                    opts = q.get('opts')
                    if not opts or len(opts) != 4 or len(set(opts)) != 4 or \
                       n not in opts or any(v < 1 or v > 12 for v in opts):
                        ch_fail.append((flat, k, 'rev opts 口径', opts))
                else:
                    ch_fail.append((flat, k, 'mode 非法', mode))
                if q['tray'] != 0 or q['plate'] != 0:
                    ch_fail.append((flat, k, '作答题托盘/盘非空', q['tray']))
            # S2/S4 探测（抽关 split 题）
            if flat in PROBE_STATE and k == 0 and mode == 'split':
                r1 = call('tapBowl', 0)                                 # 无选糖点碗
                r2 = call('tapCandy', 0)                                # 提糖
                q2 = read_q()
                r3 = call('tapBowl', 0)                                 # 入碗
                q3 = read_q()
                r4 = call('takeBack', 0, 0)                             # 取回
                q4 = read_q()
                if not (r1 is False and r2 == 'pick' and q2['sel'] == 0
                        and q3['tray'] == n - 1 and q3['bowls'][0] == 1 and q3['sel'] is None
                        and q4['tray'] == n and q4['bowls'][0] == 0 and q4['miss'] == 1):
                    state_fail.append((flat, k, r1, r2, r3, r4, q2 and q2.get('sel'), q3 and q3.get('bowls'), q4 and q4.get('miss')))
            # S3 驱动（split 最优分配 / cmp·rev 正确作答）
            if not drive_one(q, k):
                drive_fail.append((flat, k, '未推进', mode))
                ok_break = True
                break
        if 10 <= flat < 15 and n_k4 != 2:
            k4_fail.append((flat, n_k4))                              # r22 ch3 恰 2 题 k4
        all_levels[flat] = snaps
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE_STATE and not ok_break:
            st = -1
            for _ in range(6):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => SH.currentLevel && SH.currentLevel.stars != null ? SH.currentLevel.stars : -1')
                if st != -1:
                    break
            if st != 3 and st != -1:
                star_fail.append((flat, '最优非3★', st))
    chk('S1 章约束（Python 独立池 REM14+cmp/rev 域+初始态）', not ch_fail, str(ch_fail[:4]))
    chk('S1b dch3 恰 2 题 k4（r22）', not k4_fail, str(k4_fail))
    chk('S2/S4 两击制状态机+取回', not state_fail, str(state_fail[:3]))
    chk('S3 自动判定（split 均衡/盘 + cmp·rev 作答）', not drive_fail, str(drive_fail[:4]))
    chk('S5 星级（最优=3★）', not star_fail, str(star_fail[:3]))

    # ---- S5b 1 取回=2★（抽关，split 路径）/ S5c 答错 1 次=2★（r22 qmiss 口径）----
    probe_star = []
    for flat in (3, 13):
        pg.evaluate('(f) => { SH.start(f) }', flat)
        took = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                break
            if not took:
                call('tapCandy', 0)
                call('tapBowl', 0)
                call('takeBack', 0, 0)
                took = True
            if not drive_one(q, k):
                break
        lv = read_lv()
        if lv and lv.get('done'):
            st = -1
            for _ in range(6):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => SH.currentLevel && SH.currentLevel.stars != null ? SH.currentLevel.stars : -1')
                if st != -1:
                    break
            if st != 2:
                probe_star.append((flat, 'takeback', st))
    for flat in (15, 36):                            # r22 dch4 抽关（静态+生成关）
        pg.evaluate('(f) => { SH.start(f) }', flat)
        wronged = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                break
            drive_one(q, k, wrong_first=(not wronged and q.get('mode', 'split') != 'split'))
            wronged = True
        lv = read_lv()
        if lv and lv.get('done'):
            st = -1
            for _ in range(6):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => SH.currentLevel && SH.currentLevel.stars != null ? SH.currentLevel.stars : -1')
                if st != -1:
                    break
            if st != 2 or lv.get('qmiss') != 1:
                probe_star.append((flat, 'qmiss', st, lv.get('qmiss')))
    chk('S5b 1 取回=2★ + S5c 答错 1 次=2★（抽关）', not probe_star, str(probe_star))

    # ---- S6 确定性双读 ----
    diff = []
    for flat in (0, 12, 27, 36):                     # r22：36=dch4 生成关入样（cmp/rev 快照字段自洽）
        pg.evaluate('(f) => { SH.start(f) }', flat)
        snaps2 = []
        for k in range(5):
            q = wait_quiz()
            snaps2.append(json.dumps(q, sort_keys=True) if q else None)
            if not q or not drive_one(q, k):
                break
        if snaps2 != all_levels.get(flat):
            diff.append(flat)
    chk('S6 确定性（flat 0/12/27/36 双读一致）', not diff, str(diff))

    bad = pg.evaluate('() => (async () => { try { const r = await SH.tapCandy(99); return r === false || r == null } catch(e){ return true } })()')
    auto = pg.evaluate('() => SH.start(1)')
    pg.wait_for_timeout(300)
    r = pg.evaluate('() => (async () => SH.autoSolve())()')
    lv = pg.evaluate('() => SH.currentLevel ? {done: SH.currentLevel.done, won: SH.currentLevel.won} : null')
    chk('S6b 非法拒绝+autoSolve 整关+0 pageerror', bool(bad) and r.get('done') and lv.get('done') and not errs, str((r, lv, errs[:1])))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
