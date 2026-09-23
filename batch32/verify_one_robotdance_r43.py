# -*- coding: utf-8 -*-
"""robotdance r43 独立复验（SPEC-R43——黄款难度改造段一；断言从 SPEC 文字独立推导，禁抄实现）
R1 谱约束审计（40 关 × 5 题 UI 级驱动，Python 独立 SPEC 表）：步数 dch1 qi 表 [3,4,4,5,5]/
   dch2 6/dch3 7/dch4 8；u=min(n,U_CAP)（ch3/4 恒 6=恒重复）；禁 3 连（steps+disp）；
   块多重集=步骤多重集∪干扰恰 NEW_CAP{3,3,4,4} 互异；fix 律（k 域/bad∈steps≠steps[k]/
   disp 恰换 k 位/无新动作/blocks 空）
R2 覆盖（dch1-4 全现 + dch4 每关 fix 恰 1 + ch3/4 重复步全现）
R3 确定性（flat 0/12/27/39 双读快照一致）
R4 autoSolve taps 谱（flat0=21/flat5=30/flat10=35/flat15=33——SPEC §R3 步数谱推论：seq 逐块+fix 单点；minor7 勘误原「40」未扣 fix 题单点）
R5 星级（全最优 3★ / 1 错 2★）
R6 钩子契约+新键+clips+预告：quiz 字段（fix 含 kind/k/bad/disp，seq 无）/tapBlock·tapSlot
   越界 null/VOICE.fix 键文=SPEC 硬编码/clips 21（r43 终态）/章末+生成关预告表/0 pageerror
R7 fix 探测（flat15 首个 fix 题：错格 wrong+miss/豁免窗内对选放行 tapSlot(k)=done）
R8 锚面（flat0 q0 steps/blocks=baseline 硬编码逐字节——SPEC-R43 §R10 存档兼容）
R9 重复步防背（ch3/ch4 驱动关 Python 复核 dup≥1/≥2 + 块计数含同名多块）
R10 错链豁免窗（flat0 q0：错点 wrong → 窗内二错吞 false → 窗后 autoSolve 对选放行）
纪律：先等 title=VERIFY PASS；tapBlock/tapSlot async——evaluate 侧 await；错链窗 4650ms
     真时钟，探测后统一等 4.8s。"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'robotdance', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# ---------- Python 独立 SPEC 表（SPEC-R43 §R3/§R7 文字转译，不引用页面符号） ----------
POOL10 = ['jump', 'spin', 'clap', 'stomp', 'wave', 'nod', 'kick', 'shake', 'bow', 'stretch']
CH1_STEPS = [3, 4, 4, 5, 5]
DCH_STEPS = {2: 6, 3: 7, 4: 8}
U_CAP = {1: 5, 2: 6, 3: 6, 4: 6}
NEW_CAP = {1: 3, 2: 3, 3: 4, 4: 4}
NAMES = {'jump': '跳一跳', 'spin': '转一圈', 'clap': '拍拍手', 'stomp': '跺跺脚', 'wave': '挥挥手',
         'nod': '点点头', 'kick': '踢踢腿', 'shake': '摇一摇', 'bow': '鞠个躬', 'stretch': '伸伸手'}
CHAPTER_HINTS = {1: '舞步变 6 步，还有捣乱动作', 2: '整支舞 7 步，还有重复舞步',
                 3: '8 步长舞，有一跳是错的，找出来', 4: '新一轮机器人舞步大挑战'}
GEN_HINTS = ['四五步舞，看清再拼', '六步舞，小心干扰动作',
             '七步舞，还有重复舞步，全都要记牢', '八步长舞，找找哪一跳错了']
ANCHOR_F0Q0 = {'steps': ['wave', 'jump', 'clap'], 'blocks': ['clap', 'jump', 'wave']}   # baseline 实证
VOICE_FIX = ('rbd_q_fix', '有一跳错啦，找一找')            # SPEC-R43 §R7 新键（段一注册前静默）
WINDOW_WAIT = 4800                                          # 错链豁免窗 4650 + 余量

def has_triple(arr):
    return any(arr[i] == arr[i - 1] == arr[i - 2] for i in range(2, len(arr)))

def audit_quiz(q, dch, k, flat):
    """单题独立对账；返回 None（lawful）或原因串。"""
    if q['miss'] != 0 or q['step'] != 0 or any(f is not None for f in q['filled'] or []):
        return 'init'
    steps, n = q['steps'], len(q['steps'])
    exp_n = CH1_STEPS[k] if dch == 1 else DCH_STEPS[dch]
    if n != exp_n:
        return 'stepsLen %d!=%d' % (n, exp_n)
    if any(a not in POOL10 for a in steps):
        return 'pool %s' % steps
    if len(set(steps)) != min(n, U_CAP[dch]):
        return 'uCap %d' % len(set(steps))
    if has_triple(steps):
        return 'triple %s' % steps
    if q.get('kind') == 'fix':
        if dch != 4:
            return 'fixDch %s' % dch
        kk, bad, disp = q['k'], q['bad'], q['disp']
        if not (0 <= kk < n) or bad == steps[kk] or bad not in steps:
            return 'fixKBad %s/%s' % (kk, bad)
        exp_disp = steps[:]; exp_disp[kk] = bad
        if disp != exp_disp or any(a not in set(steps) for a in disp) or has_triple(disp):
            return 'fixDisp'
        if q['blocks']:
            return 'fixBlocks'
        return None
    if q.get('k') is not None or q.get('bad') is not None or q.get('disp') is not None:
        return 'seqFields'                       # RD getter seq 题三字段=undefined（序列化 None 但键在）
    anims = [b['anim'] for b in q['blocks']]
    if len(anims) != n + NEW_CAP[dch]:
        return 'blocksLen %d' % len(anims)
    from collections import Counter
    cnt, scnt = Counter(anims), Counter(steps)
    for a in steps:
        if cnt[a] != scnt[a]:
            return 'stepsCov %s' % a
    dis = [a for a in cnt if a not in scnt]
    if len(dis) != NEW_CAP[dch] or any(cnt[a] != 1 for a in dis) or any(a not in POOL10 for a in dis):
        return 'disCnt %s' % dis
    return None

with sync_playwright() as p:
    b = p.chromium.launch(args=['--mute-audio'])
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    t = ''
    for _ in range(400):                    # 先等 runVerify 收尾（防内部 startLevel 竞态）
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('R0 verify 自检全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_q():
        return pg.evaluate('() => RD.quiz')

    def read_lv():
        return pg.evaluate('() => RD.currentLevel ? {step: RD.currentLevel.step, done: RD.currentLevel.done, dch: RD.currentLevel.dch, miss: RD.currentLevel.miss, stars: RD.currentLevel.stars} : null')

    def call(fn_expr):
        return pg.evaluate('(async () => { try { return await (%s) } catch(e){ return "ERR" } })()' % fn_expr)

    def wait_build(timeout_ms=20000):
        for _ in range(int(timeout_ms / 30)):
            q = read_q()
            if q and q['phase'] == 'build':
                return q
            lv = read_lv()
            if lv and lv['done']:
                return None
            pg.wait_for_timeout(30)
        return None

    def wait_step(k, timeout_ms=30000):
        for _ in range(int(timeout_ms / 30)):
            lv = read_lv()
            if lv and (lv['step'] > k or lv['done']):
                return True
            pg.wait_for_timeout(30)
        return False

    def snap(q):
        return json.dumps({'kind': q.get('kind'), 'steps': q['steps'],
                           'blocks': [b['anim'] for b in q['blocks']],
                           'k': q.get('k'), 'bad': q.get('bad'), 'disp': q.get('disp')},
                          sort_keys=True)

    def drive_quiz(q, probe=None):
        """最优驱动当前题：fix=点 k；seq=照序逐块点。probe 探测返回 (rW, rG, mid)。"""
        if q.get('kind') == 'fix':
            if probe == 'fix':
                wrong_i = 0 if q['k'] != 0 else 7
                rW = call('RD.tapSlot(%d)' % wrong_i)
                mid = read_q()
                rG = call('RD.tapSlot(%d)' % q['k'])     # 豁免窗内对选放行
                return rG == 'done' and rW == 'wrong' and mid['miss'] == 1
            r = call('RD.tapSlot(%d)' % q['k'])
            return r == 'done'
        used = set()
        while True:
            qq = read_q()
            if qq is None or qq.get('kind') == 'fix':
                return False
            pos = qq['step']
            idx = next((i for i, blk in enumerate(qq['blocks'])
                        if blk['anim'] == qq['steps'][pos] and i not in used), None)
            if idx is None:
                return False
            if probe == 'wrong-first' and not used:
                wi = next(i for i, blk in enumerate(qq['blocks'])
                          if i != idx and blk['anim'] != qq['steps'][pos])
                rW = call('RD.tapBlock(%d)' % wi)
                m1 = read_q()
                rSw = call('RD.tapBlock(%d)' % wi)       # 窗内二错吞
                probe = None                             # 后续照序（窗内对选放行）
                if not (rW == 'wrong' and m1['miss'] == 1 and rSw is False):
                    return False
                pg.wait_for_timeout(WINDOW_WAIT)
                continue
            r = call('RD.tapBlock(%d)' % idx)
            used.add(idx)
            if r == 'done':
                return True
            if r != 'fill':
                return False

    # ---- R1/R2/R7/R8/R9/R10：40 关全驱审计 ----
    ch_fail, drive_fail = [], []
    dch_seen, dup_seen = set(), set()
    snaps_all = {}
    for flat in range(40):
        pg.evaluate('(f) => { RD.start(f) }', flat)
        lv0 = read_lv()
        dch = lv0['dch']
        dch_seen.add(dch)
        if flat < 20 and dch != flat // 5 + 1:
            ch_fail.append((flat, 'dch', dch))
        fix_cnt = 0
        snaps = []
        for k in range(5):
            q = wait_build()
            if not q:
                drive_fail.append((flat, k, 'no-build'))
                break
            if flat == 0 and k == 0:                    # R8 锚面逐字节
                if q['steps'] != ANCHOR_F0Q0['steps'] or \
                   [blk['anim'] for blk in q['blocks']] != ANCHOR_F0Q0['blocks']:
                    ch_fail.append((flat, k, 'anchor', q['steps']))
            else:
                why = audit_quiz(q, dch, k, flat)
                if why:
                    ch_fail.append((flat, k, why))
            snaps.append(snap(q))
            if q.get('kind') == 'fix':
                fix_cnt += 1
            dup = len(q['steps']) - len(set(q['steps']))
            if dup:
                dup_seen.add((dch, dup))
            probe = None
            if flat == 0 and k == 0:
                probe = 'wrong-first'                    # R10 错链豁免窗探测
            if flat == 15 and q.get('kind') == 'fix':
                probe = 'fix'                            # R7 fix 探测（含窗内对选放行）
            if not drive_quiz(q, probe):
                drive_fail.append((flat, k, 'drive probe=%s' % probe))
                break
            if not wait_step(k):
                drive_fail.append((flat, k, 'no-advance'))
                break
        snaps_all[flat] = snaps
        if dch == 4 and fix_cnt != 1:
            ch_fail.append((flat, 'fixN', fix_cnt))
        if dch != 4 and fix_cnt != 0:
            ch_fail.append((flat, 'fixN-non4', fix_cnt))
    chk('R1 谱约束审计（步数表/uCap/禁3连/块多重集+干扰恰 NEW_CAP/fix 律/init）+R8 锚面+'
        'R7 fix 探测+R10 豁免窗', not ch_fail, str(ch_fail[:5]))
    chk('R2 覆盖（dch1-4 全现+dch4 每关 fix 恰 1）', dch_seen == {1, 2, 3, 4}, str(sorted(dch_seen)))
    chk('R9 重复步防背（ch3 dup=1/ch4 dup=2 全现，驱动复核）',
        (3, 1) in dup_seen and (4, 2) in dup_seen, str(sorted(dup_seen)))
    chk('R4a 40 关全驱推进', not drive_fail and len(snaps_all) == 40, str(drive_fail[:4]))

    # ---- R3 确定性：4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { RD.start(f) }', flat)
        snaps2 = []
        for k in range(5):
            q = wait_build()
            if not q:
                diff.append((flat, k, 'unreadable'))
                break
            snaps2.append(snap(q))
            if not drive_quiz(q) or not wait_step(k):
                diff.append((flat, k, 'drive'))
                break
        if snaps2 != snaps_all.get(flat):
            diff.append((flat, 'snap'))
    chk('R3 确定性（flat 0/12/27/39 双读一致）', not diff, str(diff))

    # ---- R4b autoSolve taps 谱 + R5 星级 ----
    taps_fail, star_note = [], []
    for flat, exp_taps, exp_stars in ((0, 21, 3), (5, 30, 3), (10, 35, 3), (15, 33, 3)):   # fix 题单点计 1（4×8+1=33）
        pg.evaluate('(f) => { RD.start(f) }', flat)
        r = call('RD.autoSolve()')
        lv = read_lv()
        if not (r and r != 'ERR' and r.get('done') and r.get('taps') == exp_taps and lv.get('done')):
            taps_fail.append((flat, r, lv))
        star_note.append((flat, lv.get('stars')))
    chk('R4b autoSolve taps 谱（21/30/35/33=seq 逐块+fix 单点——SPEC 步数谱推论）', not taps_fail, str(taps_fail[:2]))
    chk('R5 星级（全最优恒 3★）', all(s[1] == 3 for s in star_note), str(star_note))
    pg.evaluate('() => { RD.start(0) }')
    q0 = wait_build()
    wi = next(i for i, blk in enumerate(q0['blocks']) if blk['anim'] != q0['steps'][0])
    rW = call('RD.tapBlock(%d)' % wi)
    pg.wait_for_timeout(WINDOW_WAIT)
    r = call('RD.autoSolve()')
    lv = read_lv()
    chk('R5b 1 错=2★（flat0 错一次后通关）',
        rW == 'wrong' and r.get('done') and r.get('taps') == 21 and lv.get('miss') == 1 and lv.get('stars') == 2,
        str((rW, r, lv)))

    # ---- R6 钩子契约+新键+clips+预告 ----
    pg.evaluate('() => { RD.start(0) }')
    q0 = wait_build()
    bad_b = call('RD.tapBlock(99)')
    bad_s = call('RD.tapSlot(0)')                       # seq 题 tapSlot=false（非 fix 通道）
    pg.evaluate('() => { RD.start(15) }')
    fix_probe = None
    for k in range(5):                                  # 驱动至 fix 题读字段契约
        q = wait_build()
        if not q:
            break
        if q.get('kind') == 'fix':
            fix_probe = q
            fields_ok = all(x in q for x in ('kind', 'k', 'bad', 'disp'))
            call('RD.tapSlot(%d)' % q['k'])
            break
        if not drive_quiz(q) or not wait_step(k):
            break
    seq_fields_ok = q0.get('kind') == 'seq' and q0.get('k') is None and \
                    q0.get('bad') is None and q0.get('disp') is None   # kind 键恒在（'seq'），fix 三字段值 None
    voice = pg.evaluate('() => ({ V: VOICE.fix, clips: Object.keys(KIDS.voice.clips).length })')
    voice_ok = voice['V']['key'] == VOICE_FIX[0] and voice['V']['text'] == VOICE_FIX[1] and \
               voice['clips'] == 21                      # r43 终态 21（段二注册后；修复轮 minor7 勘误原 15 过渡态）
    hints = pg.evaluate('() => [nextHint(4), nextHint(9), nextHint(14), nextHint(19)]')
    end_ok = hints == [CHAPTER_HINTS[1], CHAPTER_HINTS[2], CHAPTER_HINTS[3], CHAPTER_HINTS[4]]
    gen_ok = True
    for f in (24, 29, 34, 39):
        h = pg.evaluate('(f) => nextHint(f)', f)
        dch2 = pg.evaluate('(f) => { RD.start(f + 1); return RD.currentLevel.dch }', f)
        if h != GEN_HINTS[dch2 - 1]:
            gen_ok = False
    chk('R6 钩子契约（fix 字段 kind/k/bad/disp·seq 零 fix 字段/越界 tapBlock=null·tapSlot=false）+'
        '新键 rbd_q_fix 文案+clips 21+章末/生成关预告表+0 pageerror',
        bad_b is None and bad_s is False and fields_ok and seq_fields_ok and
        voice_ok and end_ok and gen_ok and not errs,
        str((bad_b, bad_s, fields_ok, seq_fields_ok, voice['clips'], hints, errs[:1])))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
