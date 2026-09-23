# -*- coding: utf-8 -*-
"""bubble 独立复验 v2/r9（2026-09-13 去计数器+颜色子集+提交制；2026-09-14 r9 倒计时收尾+时长硬断言）
——断言从改造 delta 推导，禁从实现行为归纳
B0 selftest 全绿+0 pageerror
B1 确定性（flat 0/12/27/39 双读 n+color 序列一致）
B2 题表真值：flat 0-14（ch1-3 静态关）n/color 硬编码定版常数；flat 15-39（ch4 seeded+生成关）
   由本脚本内独立 mulberry32+生成规则复算（与实现零共享代码）；另按 delta 核章区间/相邻 n 不同/色板规则
B3 机制真值：目标色 'pop'+count+1 / 非目标色 'skip'+泡不破+计数与 miss 不动 / 灰云 'skip'+破+
   cloudPops+1 / 少点提交 wrong_less 不清空不 miss / 多点提交 wrong_more 清零+submitErr+1+miss+1 /
   点够提交 right 推进 / 末题提交通关
B4 星级公式（delta：miss=submitErr+cloudPops>=3 折 1 → 0=3★/1-2=2★/≥3=1★）独立网格断言
B5 场恒 ≥2 目标色泡（每题起点采样）
B6 无效 id=False+0 pageerror
B7 r9 倒计时收尾（delta3：章后段=每章第 4/5 关计时）：timed 规则表（40 关 flat%5>=3）+
   flat3 钩子全周期（quiet 无条→count 条显→sleep 点泡/提交软吞 'sleep' 零惩罚泡不破→
   自动重来计数清零→可通关）
B8 r9 modeled 时长硬断言（python 独立副本：题句 8 码点 estMs=8*345+600 + n*2000 + 120 + 2400
   每关 Σ >= 40000ms，全 40 关；模型从 SPEC §2-r9 重列，禁引页内常量）
纪律：tapBubble/tapSubmit 均 async——evaluate 侧 await promise（b19 实锤）；先等 title=VERIFY PASS（b17）。"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'bubble', 'index.html').replace('\\', '/') + '?verify=1'

# ---- 独立 mulberry32（JS Math.imul/|0 的 32 位位型等价复刻，与实现零共享代码） ----
M32 = 0xFFFFFFFF

def mulberry32(seed):
    a = seed & M32
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & M32
        t = ((a ^ (a >> 15)) * ((a | 1) & M32)) & M32       # Math.imul(a ^ a>>>15, 1|a)
        p = ((t ^ (t >> 7)) * ((61 | t) & M32)) & M32       # Math.imul(t ^ t>>>7, 61|t)
        t = ((t + p) & M32) ^ t                             # (t + imul) ^ t
        t = (t ^ (t >> 14)) & M32
        return t / 4294967296.0
    return rnd

def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))

ALL = ['blue', 'yellow', 'pink']
PAIRS = [['blue', 'yellow'], ['blue', 'pink'], ['yellow', 'pink']]
CH_RANGE = {1: (3, 5), 2: (4, 6), 3: (5, 8), 4: (3, 8)}     # delta：ch1 [3,5]/ch2 [4,6]/ch3 [5,8]/ch4 seeded [3,8]

def gen_expected(flat):
    """独立复算：(dch, palette, [(n, color)×5])——种子公式=契约（flat*7919+13）"""
    ch = flat // 5 + 1
    dch = (ch - 1) % 4 + 1
    rnd = mulberry32(flat * 7919 + 13)
    if dch == 1:
        palette = [ALL[ri(rnd, 0, 2)]]                       # 单色场每关抽 1 色
    elif dch == 4:
        k = ri(rnd, 2, 3)
        palette = ALL[:] if k == 3 else PAIRS[ri(rnd, 0, 2)][:]   # 两/三色场 seeded
    else:
        palette = ['blue', 'yellow'] if dch == 2 else ALL[:]
    if flat == 0:
        palette = ['blue']                                   # 教学关：演示=3 个蓝泡
    nmin, nmax = CH_RANGE[dch]
    qs, lastN = [], None
    for qi in range(5):
        n = ri(rnd, nmin, nmax)
        t = 0
        while t < 8 and lastN is not None and n == lastN:
            n = ri(rnd, nmin, nmax); t += 1
        color = palette[ri(rnd, 0, len(palette) - 1)]
        if flat == 0 and qi == 0:
            n, color, lastN = 3, 'blue', 3                   # flat0 题0 恒 3 蓝
        else:
            lastN = n
        qs.append((n, color))
    return dch, palette, qs

# ---- ch1-3 静态 15 关（flat 0-14）n/color 定版常数（契约快照：改生成逻辑必撞此表） ----
STATIC_TRUTH = {
    0:  (1, ['blue'],              [(3, 'blue'), (4, 'blue'), (5, 'blue'), (3, 'blue'), (4, 'blue')]),
    1:  (1, ['yellow'],            [(4, 'yellow'), (5, 'yellow'), (4, 'yellow'), (5, 'yellow'), (3, 'yellow')]),
    2:  (1, ['yellow'],            [(5, 'yellow'), (3, 'yellow'), (5, 'yellow'), (4, 'yellow'), (5, 'yellow')]),
    3:  (1, ['pink'],              [(4, 'pink'), (3, 'pink'), (4, 'pink'), (3, 'pink'), (4, 'pink')]),
    4:  (1, ['blue'],              [(5, 'blue'), (3, 'blue'), (4, 'blue'), (3, 'blue'), (5, 'blue')]),
    5:  (2, ['blue', 'yellow'],    [(4, 'blue'), (6, 'blue'), (4, 'yellow'), (6, 'blue'), (5, 'blue')]),
    6:  (2, ['blue', 'yellow'],    [(4, 'blue'), (5, 'yellow'), (4, 'yellow'), (6, 'blue'), (4, 'yellow')]),
    7:  (2, ['blue', 'yellow'],    [(4, 'blue'), (5, 'yellow'), (4, 'yellow'), (6, 'blue'), (5, 'yellow')]),
    8:  (2, ['blue', 'yellow'],    [(4, 'blue'), (5, 'blue'), (6, 'blue'), (4, 'yellow'), (5, 'yellow')]),
    9:  (2, ['blue', 'yellow'],    [(6, 'blue'), (4, 'blue'), (6, 'yellow'), (4, 'blue'), (6, 'yellow')]),
    10: (3, ['blue', 'yellow', 'pink'], [(5, 'pink'), (6, 'blue'), (8, 'blue'), (5, 'blue'), (8, 'pink')]),
    11: (3, ['blue', 'yellow', 'pink'], [(8, 'pink'), (7, 'blue'), (5, 'yellow'), (7, 'blue'), (8, 'pink')]),
    12: (3, ['blue', 'yellow', 'pink'], [(8, 'pink'), (7, 'blue'), (5, 'pink'), (7, 'yellow'), (5, 'blue')]),
    13: (3, ['blue', 'yellow', 'pink'], [(5, 'pink'), (8, 'blue'), (6, 'yellow'), (8, 'pink'), (5, 'yellow')]),
    14: (3, ['blue', 'yellow', 'pink'], [(6, 'blue'), (5, 'blue'), (6, 'yellow'), (5, 'yellow'), (8, 'blue')]),
}

def expect_of(flat):
    return STATIC_TRUTH[flat] if flat < 15 else gen_expected(flat)

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok), note))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

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
    chk('B0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_quiz():
        return pg.evaluate('() => BB.quiz')

    def read_lv():
        return pg.evaluate('() => BB.currentLevel ? {step: BB.currentLevel.step, done: BB.currentLevel.done} : null')

    def tap_raw(i):
        return pg.evaluate('(i) => (async () => { try { return await BB.tapBubble(i) } catch(e){ return "ERR" } })()', i)

    def submit_raw():
        return pg.evaluate('() => (async () => { try { return await BB.tapSubmit() } catch(e){ return "ERR" } })()')

    def target_ids():
        return pg.evaluate('() => BB.bubbles.filter(x => x.kind === "color" && x.color === BB.quiz.color).map(x => x.id)')

    def wait_quiz(timeout_ms=6000):
        for _ in range(int(timeout_ms / 30)):
            q = read_quiz()
            if q:
                return q
            pg.wait_for_timeout(30)
        return None

    def pop_to(want, timeout_ms=15000):
        """钩子点目标色泡至 count==want（含等 respawn）"""
        for _ in range(int(timeout_ms / 30)):
            q = read_quiz()
            if not q:
                return -1
            if q['count'] >= want:
                return q['count']
            ids = target_ids()
            if ids:
                tap_raw(ids[0])
            else:
                pg.wait_for_timeout(30)
        return read_quiz()['count'] if read_quiz() else -1

    def drive_level(flat):
        """整关推进并逐题读 (n, color)；返回 (seq, 失败列表)"""
        dch, palette, qs_exp = expect_of(flat)
        fails = []
        pg.evaluate('(f) => { BB.start(f) }', flat)
        lv = pg.evaluate('() => BB.currentLevel')
        if lv['colors'] != palette:
            fails.append(('palette', lv['colors'], palette))
        seq = []
        for k in range(5):
            q = wait_quiz()
            if not q:
                fails.append((flat, k, 'quiz 不可读'))
                break
            seq.append((q['n'], q['color']))
            # B5：题起点目标色彩泡 ≥2
            if len(target_ids()) < 2:
                fails.append((flat, k, '目标色泡 <2'))
            guard = 0
            while guard < 600:
                lv = read_lv()
                if lv and (lv['step'] > k or lv['done']):
                    break                                     # 已推进
                q = read_quiz()
                if not q or q['count'] >= q['n']:
                    r = submit_raw()
                    if r is None or r == 'ERR':
                        pg.wait_for_timeout(30); guard += 1
                        continue
                    if r != 'right':
                        fails.append((flat, k, '提交意外返回', r))
                    continue
                ids = target_ids()
                if not ids:
                    pg.wait_for_timeout(30); guard += 1
                    if guard > 500:
                        fails.append((flat, k, '无目标色泡可点')); break
                    continue
                tap_raw(ids[0])
                guard += 1
            else:
                fails.append((flat, k, '驱动超限'))
        if seq != [(n, c) for n, c in qs_exp]:
            fails.append((flat, 'seq', seq, qs_exp))
        return seq, fails

    # ---- B2+B5 全量：40 关 × 5 题（硬编码/复算期望 + 驱动通关 + 目标色 ≥2 采样）----
    all_seq, all_fails = {}, []
    for flat in range(40):
        seq, fails = drive_level(flat)
        all_seq[flat] = seq
        all_fails += fails
    # 期望侧自检（delta 推导）：章区间/相邻 n 不同/色板规则（独立于实现，双保险）
    meta_fails = []
    for flat in range(40):
        dch, palette, qs = expect_of(flat)
        nmin, nmax = CH_RANGE[dch]
        for k, (n, c) in enumerate(qs):
            if not (nmin <= n <= nmax):
                meta_fails.append((flat, k, 'n 越界', n))
            if k > 0 and n == qs[k - 1][0]:
                meta_fails.append((flat, k, '相邻 n 相同'))
            if c not in palette or c not in ALL:
                meta_fails.append((flat, k, '色不在板', c))
        if dch == 1 and len(palette) != 1:
            meta_fails.append((flat, 'ch1 非单色板'))
        if dch == 2 and sorted(palette) != ['blue', 'yellow']:
            meta_fails.append((flat, 'ch2 色板非蓝+黄'))
        if dch == 3 and sorted(palette) != sorted(ALL):
            meta_fails.append((flat, 'ch3 色板非三色'))
        if dch == 4 and not (2 <= len(palette) <= 3):
            meta_fails.append((flat, 'ch4 色板非 2-3 色'))
    chk('B2 题表真值（40 关 n/color=硬编码+复算）+章规则', not all_fails and len(all_seq) == 40, str(all_fails[:3]))
    chk('B2b 期望自检（delta 区间/相邻/色板）', not meta_fails, str(meta_fails[:3]))
    chk('B5 场恒 ≥2 目标色泡（200 题起点）', not [f for f in all_fails if f[-1] == '目标色泡 <2'],
        str([f for f in all_fails if f[-1] == '目标色泡 <2'][:3]))

    # ---- B1 确定性：4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        seq, fails = drive_level(flat)
        if seq != all_seq.get(flat) or fails:
            diff.append((flat, seq, all_seq.get(flat)))
    chk('B1 确定性（flat 0/12/27/39 双读 n+color 序一致）', not diff, str(diff[:2]))

    # ---- B3 机制真值（非目标色/灰云/提交三路径/通关）----
    notes3 = []
    ok3 = True
    # 非目标色（flat5 两色场）
    pg.evaluate('(f) => { BB.start(f) }', 5)
    q = wait_quiz()
    other = None
    for _ in range(200):
        ids = pg.evaluate('() => BB.bubbles.filter(x => x.kind === "color" && x.color !== BB.quiz.color).map(x => x.id)')
        if ids:
            other = ids[0]; break
        pg.wait_for_timeout(30)
    if other is None:
        ok3 = False; notes3.append('flat5 未见非目标色泡')
    else:
        before = read_quiz()
        r = tap_raw(other)
        after = read_quiz()
        live = pg.evaluate('(i) => BB.bubbles.some(x => x.id === i)', other)
        if not (r == 'skip' and after['count'] == before['count'] and after['miss'] == before['miss'] and live):
            ok3 = False; notes3.append('非目标色语义 r=%s live=%s' % (r, live))
    # 灰云（flat12 ch3）
    pg.evaluate('(f) => { BB.start(f) }', 12)
    q = wait_quiz()
    cloud = None
    for _ in range(200):
        ids = pg.evaluate('() => BB.bubbles.filter(x => x.kind === "cloud").map(x => x.id)')
        if ids:
            cloud = ids[0]; break
        pg.wait_for_timeout(30)
    if cloud is None:
        ok3 = False; notes3.append('flat12 未见灰云')
    else:
        before = read_quiz()
        r = tap_raw(cloud)
        after = read_quiz()
        live = pg.evaluate('(i) => BB.bubbles.some(x => x.id === i)', cloud)
        if not (r == 'skip' and after['count'] == 0 and after['cloudPops'] == before['cloudPops'] + 1 and
                after['miss'] == 0 and not live):
            ok3 = False; notes3.append('灰云语义 r=%s cp=%s→%s live=%s' % (r, before['cloudPops'], after['cloudPops'], live))
    # 提交三路径（flat0 题0 n=3 blue）
    pg.evaluate('(f) => { BB.start(f) }', 0)
    q = wait_quiz()
    if not (q and q['n'] == 3 and q['color'] == 'blue'):
        ok3 = False; notes3.append('flat0 题0 非 3 蓝: %s' % q)
    pop_to(2)
    r = submit_raw(); q = read_quiz()
    if not (r == 'wrong_less' and q['count'] == 2 and q['submitErr'] == 0 and q['miss'] == 0 and q['step'] == 0):
        ok3 = False; notes3.append('wrong_less r=%s q=%s' % (r, q))
    pop_to(4)
    r = submit_raw(); q = read_quiz()
    if not (r == 'wrong_more' and q['count'] == 0 and q['submitErr'] == 1 and q['miss'] == 1 and q['step'] == 0):
        ok3 = False; notes3.append('wrong_more r=%s q=%s' % (r, q))
    pop_to(3)
    r = submit_raw(); q = read_quiz()
    if not (r == 'right' and q['step'] == 1 and q['count'] == 0):
        ok3 = False; notes3.append('right r=%s q=%s' % (r, q))
    fin = pg.evaluate('() => (async () => { const a = await BB.autoSolve(); return {a: a, lv: BB.currentLevel} })()')
    if not (fin['a']['done'] and fin['lv']['done'] and fin['lv']['won'] and fin['lv']['miss'] == 1):
        ok3 = False; notes3.append('通关 %s' % fin)
    chk('B3 机制真值（非目标色/灰云/提交三路径/通关）', ok3, ';'.join(notes3[:4]))

    # ---- B4 星级公式（delta 独立网格：miss=submitErr+cloudPops≥3 折 1 → 0=3/1-2=2/≥3=1）----
    grid = [(0, 0, 3), (1, 0, 2), (2, 0, 2), (3, 0, 1), (9, 0, 1),
            (0, 2, 3), (0, 3, 2), (0, 9, 2), (2, 3, 1), (5, 5, 1)]
    got = pg.evaluate('(g) => g.map(x => engStars({submitErr: x[0], cloudPops: x[1]}))', [[a, c] for a, c, _ in grid])
    stars_ok = got == [s for _, _, s in grid]
    # 云折算 UI 实证：flat12 连点 3 云 → miss=1（fold 生效于进行中状态）
    pg.evaluate('(f) => { BB.start(f) }', 12)
    wait_quiz()
    hits = 0
    for _ in range(400):
        if hits >= 3:
            break
        ids = pg.evaluate('() => BB.bubbles.filter(x => x.kind === "cloud").map(x => x.id)')
        if ids and tap_raw(ids[0]) == 'skip':
            hits += 1
        else:
            pg.wait_for_timeout(30)
    q = read_quiz()
    fold_ok = hits == 3 and q['cloudPops'] == 3 and q['miss'] == 1 and q['submitErr'] == 0
    chk('B4 星级公式+云 ≥3 折 1 miss', stars_ok and fold_ok,
        'grid=%s hits=%d miss=%s' % (got == [s for _, _, s in grid], hits, q['miss'] if q else None))

    # ---- B6 无效 id 拒绝（tapBubble async——promise 须 await 后比，b19 实锤）----
    bad = pg.evaluate('() => (async () => { try { return (await BB.tapBubble(-1)) === false } catch(e){ return false } })()')
    chk('B6 无效 id 拒绝+0 pageerror', bad is True and not errs, str(errs[:2]))

    # ---- B7 r9 倒计时收尾：timed 规则表 + flat3 钩子全周期（超时=重来非惩罚） ----
    def wait_phase(ph, timeout_ms):
        for _ in range(int(timeout_ms / 60)):
            if pg.evaluate('BB.timer.phase') == ph:
                return True
            pg.wait_for_timeout(60)
        return pg.evaluate('BB.timer.phase') == ph

    timed_flags = pg.evaluate('() => Array.from({length: 40}, (_, f) => genLevel(f).timed)')
    timed_rule = [bool((f % 5) >= 3) for f in range(40)]          # delta：章后段=每章第 4/5 关（0 基 lv>=3）
    timed_ok = timed_flags == timed_rule
    pg.evaluate('(f) => { BB.start(f) }', 3)                      # flat3 = ch1 lv3（章后段）
    lv3 = pg.evaluate('BB.currentLevel')
    q3 = wait_quiz()
    notes7 = []
    ok7 = timed_ok and lv3['timed'] is True and q3 is not None
    if not (lv3['timed'] is True):
        notes7.append('flat3 timed=%s' % lv3.get('timed'))
    pop_to(1)                                                     # quiet 期点 1 个（计时不打断数数）
    cnt_before = read_quiz()['count']
    tim_quiet = pg.evaluate("document.getElementById('timer').classList.contains('on')")
    ok7 = ok7 and cnt_before == 1 and not tim_quiet
    got_count = wait_phase('count', 9000)                         # 静默窗后可见倒计时（verify 页 8.3 倍速）
    tim_on = pg.evaluate("document.getElementById('timer').classList.contains('on')")
    ok7 = ok7 and got_count and tim_on
    # 睡期软吞+零惩罚：页内单次评估（sleep 窗真实仅 ~0.5s，跨回合 tap 会撞醒来——竞态消除）
    slp = pg.evaluate('''() => (async () => {
      const t0 = Date.now();
      while (Date.now() - t0 < 1500 && BB.timer.phase !== 'sleep') await new Promise(r => setTimeout(r, 20));
      if (BB.timer.phase !== 'sleep') return { sleep: false };
      const q0 = BB.quiz;
      const tid = BB.bubbles.filter(x => x.kind === 'color' && x.color === BB.quiz.color).map(x => x.id)[0];
      const rT = await BB.tapBubble(tid);
      const rS = await BB.tapSubmit();
      const live = BB.bubbles.some(x => x.id === tid);
      const q1 = BB.quiz;
      return { sleep: true, rT: rT, rS: rS, live: live,
        kept: q1.count === q0.count && q1.miss === q0.miss &&
              q1.submitErr === q0.submitErr && q1.step === q0.step };
    })()''')
    if not (slp and slp.get('sleep') and slp.get('rT') == 'sleep' and slp.get('rS') == 'sleep' and
            slp.get('live') and slp.get('kept')):
        ok7 = False
        notes7.append('sleep %s' % slp)
    roll = pg.evaluate('''() => (async () => {
      const t0 = Date.now();
      while (Date.now() - t0 < 1500 && BB.timer.phase !== 'quiet') await new Promise(r => setTimeout(r, 30));
      const q = BB.quiz;
      return { rolled: BB.timer.phase === 'quiet', count: q ? q.count : -1,
               miss: q ? q.miss : -1, step: q ? q.step : -1 };
    })()''')
    if not (roll and roll.get('rolled') and roll.get('count') == 0 and roll.get('miss') == 0 and
            roll.get('step') == 0):
        ok7 = False
        notes7.append('roll %s' % roll)
    fin3 = pg.evaluate('() => (async () => { const a = await BB.autoSolve(); return {a: a, lv: BB.currentLevel} })()')
    if not (fin3['a']['done'] and fin3['lv']['done'] and fin3['lv']['miss'] == 0):
        ok7 = False
        notes7.append('finish %s' % fin3['lv'])
    chk('B7 r9 倒计时收尾（timed 规则 40 关+超时软吞零惩罚+重来可通关）', ok7,
        'timed_rule=%s notes=%s' % (timed_ok, ';'.join(notes7[:3])))

    # ---- B8 r9 modeled 时长硬断言（python 独立副本：SPEC §2-r9 模型重列） ----
    V_EST = lambda c: c * 345 + 600          # estMs 家族定版（n=码点数，禁 +300 变体）
    V_TAP, V_SUBMIT, V_RIGHT, V_MIN = 2000, 120, 2400, 40000
    SPEECH_LEN = 8                           # '点破'+数词1+'个'+颜色词2+'泡泡'
    per_q = V_EST(SPEECH_LEN) + V_SUBMIT + V_RIGHT
    durs = {f: len(seq) * per_q + sum(n for n, _ in seq) * V_TAP for f, seq in all_seq.items()}
    dur_min, dur_max = min(durs.values()), max(durs.values())
    chk('B8 r9 modeled 时长硬断言（40 关全 >=40s，python 独立副本）',
        len(durs) == 40 and dur_min >= V_MIN, 'durMin=%dms durMax=%dms' % (dur_min, dur_max))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
