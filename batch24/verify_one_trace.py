# -*- coding: utf-8 -*-
"""trace 独立复验 r5（SPEC-BATCH24 §7 r5 版本块分源）——断言从 SPEC 推导，禁从实现行为归纳
T1 章型闭合（Python 独立：dch1 trace 1-5 ends / dch2 trace 6-10 start / dch3 listen 1-10 /
   dch4 型序 [mirror,listen,trace,mirror,trace]+mirror∈池 2,3,5,6,9；锚点 2-6）
T2 不重头（write 错位锚 pos 不变 miss+1）+ 选卡错（miss+1 phase 不变）
T3 引擎直驱 40 关（pick 选对卡→逐当前锚）/ T4 数词朗读对拍（第 k 题 done ⇄ tra_n_<num>）
T5 确定性 / T6 星级 3★+1错=2★ / T7 同型相邻互异（dch1-3 轮转+dch4 mirror/trace 对互异）
T8 家族 A+B 源码级 / T9 autoSolve flat0
T10 自推负向（外部复检：中间锚无 current；pos>0 无任何 current）+ 错型方向反馈 clip 在场"""
import json, sys, os, io, re
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'trace', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# r5 章池/封闭表（SPEC §7 推导，Python 独立重列）
KINDS4 = ['mirror', 'listen', 'trace', 'mirror', 'trace']
MIRROR_POOL = {2, 3, 5, 6, 9}
NEAR = {4: [10], 10: [4], 6: [9], 9: [6], 2: [5], 5: [2]}

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

    # 数词/反馈捕获（clip 通道包裹——r5 全 clip 化，play/queue 两通道即全集）
    pg.evaluate('''() => { window.__pks = [];
        const op = KIDS.voice.play.bind(KIDS.voice);
        KIDS.voice.play = (k) => { window.__pks.push(String(k)); return op(k); };
        const oq = KIDS.voice.queue.bind(KIDS.voice);
        KIDS.voice.queue = (arr) => { (arr||[]).forEach(x => window.__pks.push(String(x.key||x))); return oq(arr); }; }''')

    def read_q():
        return pg.evaluate('() => TR.quiz')
    def read_lv():
        return pg.evaluate('() => TR.currentLevel ? {step: TR.currentLevel.step, done: TR.currentLevel.done, stars: TR.currentLevel.stars} : null')
    def tap(i):
        return pg.evaluate('(i) => (async () => { try { return await TR.tapAnchor(i) } catch(e){ return "ERR" } })()', i)
    def tapc(i):
        return pg.evaluate('(i) => (async () => { try { return await TR.tapCard(i) } catch(e){ return "ERR" } })()', i)
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

    all_levels = {}
    ch_fail, noRewind, drive_fail, star_fail, adj_fail, word_fail = [], [], [], [], [], []
    PROBE = {3, 9, 17}
    for flat in range(40):
        pg.evaluate('(f) => { TR.start(f) }', flat)
        snaps = []
        ok_break = False
        last_num = None
        dch = (flat // 5 + 1 - 1) % 4 + 1
        same_kind_nums = []
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            snaps.append(json.dumps(q, sort_keys=True))
            num, kind, phase = q['num'], q['kind'], q['phase']
            # T1 章型闭合（r5）
            if not (1 <= num <= 10):
                ch_fail.append((flat, k, 'num 出界', num))
            # 锚点契约（§7 钩子 r5）：write 相位 [0..n-1] 且 n∈2-6；pick 相位 null
            if phase == 'write':
                if not (isinstance(q['anchors'], list) and 2 <= len(q['anchors']) <= 6):
                    ch_fail.append((flat, k, '锚点数出界', str(q['anchors'])[:30]))
            elif q['anchors'] is not None:
                ch_fail.append((flat, k, 'pick 相位 anchors 应为 null', str(q['anchors'])[:30]))
            if dch == 1 and not (kind == 'trace' and 1 <= num <= 5 and q['hintMode'] == 'ends'):
                ch_fail.append((flat, k, 'dch1 违约', kind, num, q['hintMode']))
            if dch == 2 and not (kind == 'trace' and 6 <= num <= 10 and q['hintMode'] == 'start'):
                ch_fail.append((flat, k, 'dch2 违约', kind, num, q['hintMode']))
            if dch == 3 and not (kind == 'listen' and phase == 'pick'):
                ch_fail.append((flat, k, 'dch3 违约', kind, phase))
            if dch == 4 and kind != KINDS4[k]:
                ch_fail.append((flat, k, 'dch4 型序错', kind, k))
            if kind == 'mirror' and num not in MIRROR_POOL:
                ch_fail.append((flat, k, 'mirror 池外', num))
            # 听数近伙伴在场（SPEC：伙伴表非空则必在候选）
            if kind == 'listen':
                cs = [str(c) for c in q['cards']]
                if len(cs) != 4 or len(set(cs)) != 4 or str(num) not in cs or cs[q['right']] != str(num):
                    ch_fail.append((flat, k, 'listen 卡违约', cs, q['right']))
                elif NEAR.get(num) and not any(str(x) in cs for x in NEAR[num]):
                    ch_fail.append((flat, k, '近伙伴缺席', num, cs))
            # 镜像变体集封闭（正体+3 变体）
            if kind == 'mirror':
                want = {'%d' % num, '%dm' % num, '%dr' % num, '%df' % num}
                if set(q['cards']) != want or q['cards'][q['right']] != '%d' % num:
                    ch_fail.append((flat, k, 'mirror 变体集错', q['cards']))
            # T7 同型相邻互异（dch1-3 逐题；dch4 mirror 对 q0/q3、trace 对 q2/q4）
            if dch != 4:
                if last_num is not None and num == last_num:
                    adj_fail.append((flat, k, '相邻重复', num))
            last_num = num
            # T2 不重头（write 错位锚：pos 不变 miss+1）——抽 dch1 flat2 题0
            if flat == 2 and k == 0 and phase == 'write':
                m0, p0 = q['miss'], q['pos']
                anchors = q['anchors']
                rw = tap((q['pos'] + 1) % len(anchors))
                qd = read_q()
                if not (rw == 'wrong' and qd and qd['miss'] == m0 + 1 and qd['pos'] == p0):
                    noRewind.append((flat, rw, qd and (qd['miss'], qd['pos']), (m0, p0)))
            # T2b 选卡错（miss+1 相位不变）——抽 dch3 flat12 题0
            if flat == 12 and k == 0 and phase == 'pick':
                m0, r0 = q['miss'], q['right']
                rw = tapc((r0 + 1) % 4)
                qd = read_q()
                if not (rw == 'wrong' and qd and qd['miss'] == m0 + 1 and qd['phase'] == 'pick'):
                    noRewind.append((flat, rw, qd and (qd['miss'], qd['phase'])))
            # 探测关 1 错（T6b 用）
            if flat in PROBE and k == 0:
                if phase == 'pick':
                    tapc((q['right'] + 1) % 4)
                else:
                    tap((q['pos'] + 1) % len(q['anchors']))
                pg.wait_for_timeout(100)
            # T3 收敛驱动（pick 选对卡→逐当前锚）
            if not stepped(k):
                guard = 0
                pk0 = pg.evaluate('() => window.__pks.length')
                while guard < 40 and not stepped(k):
                    qd = read_q()
                    if not qd:
                        pg.wait_for_timeout(200)
                        continue
                    if qd['phase'] == 'pick':
                        r = tapc(qd['right'])
                    else:
                        if qd['pos'] >= len(qd['anchors']):
                            break
                        r = tap(qd['anchors'][qd['pos']])
                    pg.wait_for_timeout(50)
                    guard += 1
                    if r == 'ERR':
                        drive_fail.append((flat, k, 'tap ERR'))
                        break
                if not wait_step(k):
                    drive_fail.append((flat, k, '驱动未推进'))
                    ok_break = True
                    break
                # T4 数词对拍（第 k 题 → tra_n_<num>；捕获窗=本题驱动起→现在）
                pk1 = pg.evaluate('() => window.__pks.length')
                pks = pg.evaluate('() => window.__pks.slice(%s, %s)' % (pk0, pk1))
                want = 'tra_n_%d' % num
                if flat == 0 and want not in pks:
                    word_fail.append((flat, k, num, pks[-6:]))
        # dch4 同型对互异
        if dch == 4 and not ok_break:
            qz = [json.loads(s) for s in snaps]
            if qz[0]['num'] == qz[3]['num']:
                adj_fail.append((flat, 'mirror 对重复', qz[0]['num']))
            if qz[2]['num'] == qz[4]['num']:
                adj_fail.append((flat, 'trace 对重复', qz[2]['num']))
        all_levels[flat] = snaps
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE and flat not in (2, 12) and not ok_break:
            st = -1
            for _ in range(6):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => TR.currentLevel && TR.currentLevel.stars != null ? TR.currentLevel.stars : -1')
                if st != -1: break
            if st != 3 and st != -1:
                star_fail.append((flat, '全最优非3★', st))

    chk('T1 章型闭合（r5 三族/池/变体/近伙伴）', not ch_fail, str(ch_fail[:4]))
    chk('T2 不重头+选卡错（pos/相位不变 miss+1）', not noRewind, str(noRewind[:3]))
    chk('T3 引擎直驱 40 关（选卡+逐锚推进）', not drive_fail, str(drive_fail[:4]))
    chk('T7 同型相邻互异', not adj_fail, str(adj_fail[:4]))
    chk('T4 数词朗读对拍（flat0 全 5 题）', not word_fail, str(word_fail[:3]))
    chk('T6a 星级（全最优=3★，排探测）', not star_fail, str(star_fail[:3]))

    # T5 确定性
    det_fail = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { TR.start(f) }', flat)
        a = json.dumps(read_q(), sort_keys=True)
        pg.evaluate('(f) => { TR.start(f) }', flat)
        c = json.dumps(read_q(), sort_keys=True)
        if a != c:
            det_fail.append(flat)
    chk('T5 确定性（双读 sig 相同）', not det_fail, str(det_fail))

    # T6b 探测关 1 错=2★
    s6 = []
    for flat in (3, 9, 17):
        pg.evaluate('(f) => { TR.start(f) }', flat)
        wronged = False
        for k in range(5):
            q = wait_quiz()
            if not q: break
            if not wronged:
                if q['phase'] == 'pick':
                    tapc((q['right'] + 1) % 4)
                else:
                    tap((q['pos'] + 1) % len(q['anchors']))
                wronged = True
                pg.wait_for_timeout(100)
            guard = 0
            while guard < 40 and not stepped(k):
                qd = read_q()
                if not qd:
                    pg.wait_for_timeout(200); continue
                if qd['phase'] == 'pick':
                    tapc(qd['right'])
                else:
                    if qd['pos'] >= len(qd['anchors']): break
                    tap(qd['anchors'][qd['pos']])
                pg.wait_for_timeout(50); guard += 1
            wait_step(k)
        st = -1
        for _ in range(8):
            pg.wait_for_timeout(200)
            st = pg.evaluate('() => TR.currentLevel && TR.currentLevel.stars != null ? TR.currentLevel.stars : -1')
            if st != -1: break
        if st != 2:
            s6.append((flat, st))
    chk('T6b 探测关 1 错=2★', not s6, str(s6))

    # T9 autoSolve flat0
    pg.evaluate('() => { TR.start(0) }')
    r = pg.evaluate('() => (async () => { try { return await TR.autoSolve() } catch(e){ return "ERR" } })()')
    t9 = isinstance(r, dict) and r.get('done')
    chk('T9 autoSolve flat0 done', t9, str(r)[:80])

    # T10 自推负向（外部复检）+ 错型方向 clip 在场
    neg = pg.evaluate('''async () => {
      const bad = [];
      for (const flat of [0, 5, 10, 15]) {
        TR.start(flat);
        let guard = 0;
        while (!TR.currentLevel.done && guard++ < 80) {
          const q = TR.quiz;
          if (!q) break;
          if (state.busy || state.won || state.demo || state.locked) { await new Promise(r => setTimeout(r, 40)); continue; }
          if (q.phase === 'write') {
            anchorsEls.forEach((el, i) => {
              if (el.classList.contains('current') && !(i === 0 && q.pos === 0)) bad.push('cur@' + i + '/pos' + q.pos);
              if (el.classList.contains('endmark') && !(q.hintMode === 'ends' && i === q.anchors.length - 1)) bad.push('end@' + i);
            });
            await TR.tapAnchor(q.pos);
          } else {
            if (document.querySelectorAll('.anchor').length) bad.push('anchor-in-pick');
            await TR.tapCard(q.right);
          }
        }
      }
      return bad.slice(0, 5);
    }''')
    # 错型方向反馈 clip：flat0 数字1 跳笔→tra_w_wait；逆笔→tra_w_down
    pg.evaluate('() => { window.__pks.length = 0; }')
    pg.evaluate('() => { TR.start(0) }')
    tap(1)
    tap(0)
    tap(0)
    pks = pg.evaluate('() => window.__pks')
    dir_ok = 'tra_w_wait' in pks and 'tra_w_down' in pks
    chk('T10 自推负向（中间锚零发光/pick 零锚点）', not neg, str(neg))
    chk('T10b 错型方向反馈 clip（跳笔/逆笔分流）', dir_ok, str(pks[-6:]))
    pg.close(); b.close()

# T8 家族 A+B 源码级
src = io.open(os.path.join(BASE, 'trace', '_src', 'game-main.js'), encoding='utf-8').read()
s8 = []
if src.count('nextHint(lim - 1)') < 1:
    s8.append('启动 dayEnd 无 lim-1（家族 A）: %d' % src.count('nextHint(lim - 1)'))
if 'rescueDirDone' not in src or 'rescueAnsDone' not in src:
    s8.append('无方向/答案级独立节流锚（家族 B）')
m = re.search(r'idle > 14000[\s\S]{0,500}', src)
if m and 'lastAct = ' in m.group(0)[:500]:
    s8.append('方向级段 500 字内重置 lastAct（答案级饿死风险）')
chk('T8 家族 A+B 源码级', not s8, str(s8))

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
