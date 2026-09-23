# -*- coding: utf-8 -*-
"""piano 独立复验（SPEC-BATCH23 §0.54+§3 + SPEC-R23-PIANO 分源）——断言从 SPEC 推导，禁从实现行为归纳
P1 频率表（8 键 SPEC 值 ±0.01Hz Python 独立对账）
P2 章约束（ch1 2 音/ch2 3/ch3 5 音 r23；ch4 r23 题型谱 echo6 首两重复/rhythm4 恰1长音/chord2 间距≥2/echo5/echo5 尾dosi；同关序列互异）
P3 逐音比对（对=right→done→won；错=wrong+miss+1+pos 不进=不重头——echo 题）
P3b r23 作答驱动（rhythm=点长音键/chord=两键聚合首 pick 后判定）
P4 free 模式（'free' 零计数零星级写档）
P5 星级（最优=3★/1 错=2★ 抽关）/ P6 确定性双读+autoSolve+非法+0 pageerror"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'piano', 'index.html').replace(chr(92), '/') + '?verify=1'
results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# Python 独立频率表（SPEC §0.54：C 大调 8 键）
FREQ = {'do': 261.63, 're': 293.66, 'mi': 329.63, 'fa': 349.23,
        'sol': 392.00, 'la': 440.00, 'si': 493.88, 'dosi': 523.25}
IDS = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'dosi']

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
    chk('P0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    eng_freq = pg.evaluate('() => typeof FREQ !== "undefined" ? FREQ : null')
    freq_ok = bool(eng_freq) and all(abs(eng_freq.get(n, -1) - f) <= 0.01 for n, f in FREQ.items()) and len(eng_freq) == 8
    chk('P1 频率表（8 键 SPEC 值 ±0.01Hz）', freq_ok, str(eng_freq)[:120])

    def read_q():
        return pg.evaluate('() => PI.quiz')

    def read_lv():
        return pg.evaluate('() => PI.currentLevel ? {step: PI.currentLevel.step, done: PI.currentLevel.done, miss: PI.currentLevel.miss} : null')

    def tap(name):
        return pg.evaluate('(n) => (async () => { try { return await PI.tapKey(n) } catch(e){ return "ERR" } })()', name)

    def wait_quiz():
        for _ in range(300):
            if read_q():
                return read_q()
            pg.wait_for_timeout(30)
        return None

    def stepped(k):
        lv = read_lv()
        return (lv and lv['step'] > k) or bool(lv and lv['done'])

    def wait_play(timeout_ms=15000):          # SPEC §3：出题=兔子先弹（listen 相位）→'play' 才收输入
        for _ in range(int(timeout_ms / 40)):
            ph = pg.evaluate('() => PI.phase')
            if ph == 'play':
                return True
            pg.wait_for_timeout(40)
        return False

    def wait_step(k, timeout_ms=6000):
        for _ in range(int(timeout_ms / 30)):
            if stepped(k):
                return True
            pg.wait_for_timeout(30)
        return False

    # ---- 全量审计：40 关 × 5 序列 ----
    all_levels = {}
    ch_fail, state_fail, drive_fail, star_fail = [], [], [], []
    PROBE_STATE = {2, 12}                     # P3 探测关（miss 污染——3★ 排除）
    for flat in range(40):
        pg.evaluate('(f) => { PI.start(f) }', flat)
        snaps, sigs = [], []
        ok_break = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            snaps.append(json.dumps(q, sort_keys=True))
            seq = q['seq']
            sigs.append(tuple(seq))
            mode = q.get('mode', 'echo')
            # P2 章约束（SPEC §3 r23 修订：dch3=5 音；dch4 题型谱 echo6/rhythm4/echo5/chord2/echo5）
            if flat < 20:
                dch = flat // 5 + 1
            else:
                dch = (flat // 5) % 4 + 1
            if dch < 4:
                if len(seq) != {1: 2, 2: 3, 3: 5}[dch]:
                    ch_fail.append((flat, k, 'dch%d 长度' % dch, len(seq)))
                if any(seq[i] == seq[i + 1] for i in range(len(seq) - 1)):
                    ch_fail.append((flat, k, 'dch1-3 相邻重复', seq))   # 重复音仅 dch4 echo 设计
            else:
                # r23 dch4 固定题型谱（SPEC-R23 §R3，Python 独立复算）
                if k == 0 and not (mode == 'echo' and len(seq) == 6 and seq[1] == seq[0]):
                    ch_fail.append((flat, k, 'qi0 echo6 首两重复', mode, seq))
                if k == 1:
                    li = q.get('longIdx')
                    if not (mode == 'rhythm' and len(seq) == 4 and len(set(seq)) == 4 and
                            isinstance(li, int) and 0 <= li <= 3):
                        ch_fail.append((flat, k, 'qi1 rhythm 谱', mode, seq, li))
                if k == 2 and not (mode == 'echo' and len(seq) == 5):
                    ch_fail.append((flat, k, 'qi2 echo5', mode, len(seq)))
                if k == 3:
                    if not (mode == 'chord' and len(seq) == 2 and seq[0] != seq[1] and
                            abs(IDS.index(seq[0]) - IDS.index(seq[1])) >= 2):
                        ch_fail.append((flat, k, 'qi3 chord 间距≥2', mode, seq))
                if k == 4 and not (mode == 'echo' and len(seq) == 5 and seq[-1] == 'dosi'):
                    ch_fail.append((flat, k, 'qi4 echo5 尾dosi', mode, seq))
            if any(s not in IDS for s in seq):
                ch_fail.append((flat, k, '音名越界', seq))
            # P3 探测（抽关）：弹错=wrong+miss+1+pos 不进（不重头）——PROBE 关均 echo 题
            if not wait_play():
                drive_fail.append((flat, k, 'listen 未交接 play'))
                ok_break = True
                break
            if flat in PROBE_STATE and k == 0:
                wrong_note = next(s for s in IDS if s != seq[0])
                m0 = read_lv()['miss']
                rw = tap(wrong_note)
                q2 = read_q()
                if not (rw == 'wrong' and q2['miss'] == m0 + 1 and q2['pos'] == 0):
                    state_fail.append((flat, k, '不重头', rw, q2['miss'], q2['pos']))
            # 收敛驱动：按 mode 分支（SPEC-R23 §R5——echo 逐音/rhythm 点长音键/chord 两键聚合；
            #     作答单点即成：关内非末题=done / 末题=won——审查m2 收紧按 final 二值，right 不在域）
            if mode == 'chord':
                r1 = tap(seq[0])
                if r1 != 'pick':
                    drive_fail.append((flat, k, 'chord 首 pick', r1, seq[0]))
                    break
                r2 = tap(seq[1])
                if r2 not in ('done', 'won'):
                    drive_fail.append((flat, k, 'chord 判定', r2, seq[1]))
                    break
                pg.wait_for_timeout(40)
            elif mode == 'rhythm':
                r = tap(seq[q['longIdx']])
                if r not in ('done', 'won'):
                    drive_fail.append((flat, k, 'rhythm 长音键', r, seq[q['longIdx']]))
                    break
                pg.wait_for_timeout(40)
            else:
                for note in seq:
                    r = tap(note)
                    if r not in ('right', 'done', 'won', True):
                        drive_fail.append((flat, k, 'tap 中断', r, note))
                        break
                    pg.wait_for_timeout(40)
            if not wait_step(k):
                drive_fail.append((flat, k, '序列完成未推进'))
                ok_break = True
                break
        if len(set(sigs)) != len(sigs):
            ch_fail.append((flat, '同关序列重复', sigs))
        all_levels[flat] = snaps
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE_STATE and not ok_break:
            st = -1
            for _ in range(6):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => PI.currentLevel && PI.currentLevel.stars != null ? PI.currentLevel.stars : -1')
                if st != -1:
                    break
            if st != 3 and st != -1:
                star_fail.append((flat, '最优非3★', st))
    chk('P2 章约束（长度/重复音带内/互异/音名域）', not ch_fail, str(ch_fail[:4]))
    chk('P3 逐音比对+不重头', not state_fail, str(state_fail[:3]))
    chk('P6a 引擎直驱（序列逐音推进）', not drive_fail, str(drive_fail[:4]))
    chk('P5 星级（最优=3★）', not star_fail, str(star_fail[:3]))

    # ---- P5b 1 错=2★（抽关）----
    probe_star = []
    for flat in (3, 13):
        pg.evaluate('(f) => { PI.start(f) }', flat)
        wronged = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                break
            if not wait_play():
                break
            if not wronged:
                wn = next(s for s in IDS if s != q['seq'][0])
                tap(wn)
                wronged = True
                pg.wait_for_timeout(60)
            for note in read_q()['seq']:
                tap(note)
                pg.wait_for_timeout(40)
            wait_step(k)
        lv = read_lv()
        if lv and lv.get('done'):
            st = -1
            for _ in range(6):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => PI.currentLevel && PI.currentLevel.stars != null ? PI.currentLevel.stars : -1')
                if st != -1:
                    break
            if st != 2:
                probe_star.append((flat, st))
    chk('P5b 1 错=2★（抽关）', not probe_star, str(probe_star))

    # ---- P4 free 模式零判定 ----
    free_ok = pg.evaluate('''() => (async () => {
        PI.setMode('free');
        const s0 = JSON.stringify((KIDS._save()||{levels:{}}).levels || {});
        const r1 = await PI.tapKey('do'), r2 = await PI.tapKey('dosi');
        const q = PI.quiz;
        const s1 = JSON.stringify((KIDS._save()||{levels:{}}).levels || {});
        PI.setMode('follow');
        return { r1, r2, q, same: s0 === s1 };
    })()''')
    chk('P4 free 模式（free 返回/quiz 不受/零写档）',
        free_ok['r1'] == 'free' and free_ok['r2'] == 'free' and free_ok['same'], str(free_ok)[:160])

    # ---- P6 确定性双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { PI.start(f) }', flat)
        snaps2 = []
        for k in range(5):
            q = wait_quiz()
            snaps2.append(json.dumps(q, sort_keys=True) if q else None)
            if not wait_play():
                break
            for note in (q['seq'] if q else []):
                tap(note)
                pg.wait_for_timeout(40)
            wait_step(k)
        if snaps2 != all_levels.get(flat):
            diff.append(flat)
    chk('P6 确定性（flat 0/12/27/39 双读一致）', not diff, str(diff))

    bad = pg.evaluate('() => (async () => { try { const r = await PI.tapKey("xx"); return r === false || r == null } catch(e){ return true } })()')
    pg.evaluate('() => PI.start(1)')
    pg.wait_for_timeout(300)
    r = pg.evaluate('() => (async () => PI.autoSolve())()')
    lv = pg.evaluate('() => PI.currentLevel ? {done: PI.currentLevel.done} : null')
    chk('P6b 非法音名拒绝+autoSolve 整关+0 pageerror', bool(bad) and r.get('done') and lv.get('done') and not errs, str((r, errs[:1])))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
