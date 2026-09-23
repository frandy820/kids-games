# -*- coding: utf-8 -*-
"""feed 独立复验（SPEC-BATCH21 §1-r8 分源）——断言从 SPEC 推导，禁从实现行为归纳
r8 六章：ch1 pick 6-7 单堆 / ch2 pick 6-8 单堆 / ch3 pick 8-10 单堆 / ch4 pick 6-9 双堆 /
ch5 left（n 7-10、eaten 2-4、rem=n-eaten 3-8、单堆、整关恒 left）/ ch6 combo（双异食物、
a,b 2-5、合计 6-10、三堆、整关恒 combo）；flat0 题0 钉 n=6 胡萝卜（教学演示=正解）；
生成关 flat≥30 六章循环（dch1-6 全覆盖）。量域 6-10（AUDIT-56 #16）。
F1 章约束 / F2 碗计数状态机（对堆=碗+1 / 错堆='miss-food' 碗不变 miss 不增 / 取回=碗-1 /
     欠点 submit=wrong 碗不清空——碗留 1 根强断言，双类题按类计）
F3 引擎直驱通关（pick 按数取物 / left 两阶段：取 n→'eat' 不清屏→取 rem 镜像作答→推进；
     combo 按类逐需填→合计判定推进）
F4 确定性（flat 0/12/22/27/34 双读题组 JSON）/ F5 0 pageerror / F6 时长硬断言 durMin≥40000ms
纪律：tapFood/tapBowl/submit 全 async——evaluate 侧 await（b19 实锤）；先等 title=VERIFY PASS。"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'feed', 'index.html').replace('\\', '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok), note))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

def dch_of(flat):                       # 六章循环（静态与生成关同式：章号 1 基）
    return (flat // 5) % 6 + 1

def rule_ok(q, dch):                    # r8 章规则（SPEC §1-r8 表逐行直译）
    np = len(q['piles'])
    if dch == 1:
        return q['kind'] == 'pick' and 6 <= q['n'] <= 7 and np == 1
    if dch == 2:
        return q['kind'] == 'pick' and 6 <= q['n'] <= 8 and np == 1
    if dch == 3:
        return q['kind'] == 'pick' and 8 <= q['n'] <= 10 and np == 1
    if dch == 4:
        return q['kind'] == 'pick' and 6 <= q['n'] <= 9 and np == 2
    if dch == 5:
        return (q['kind'] == 'left' and 7 <= q['n'] <= 10 and 2 <= q['eaten'] <= 4 and
                q['rem'] == q['n'] - q['eaten'] and 3 <= q['rem'] <= 8 and np == 1)
    return (q['kind'] == 'combo' and len(q['foods']) == 2 and q['foods'][0] != q['foods'][1] and
            2 <= q['a'] <= 5 and 2 <= q['b'] <= 5 and 6 <= q['a'] + q['b'] <= 10 and np == 3)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    t = ''
    for _ in range(240):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('F0 页内自检全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_q():
        return pg.evaluate('() => FD.quiz')

    def read_lv():
        return pg.evaluate('() => FD.currentLevel ? {step: FD.currentLevel.step, done: FD.currentLevel.done} : null')

    def tap_food(f):
        return pg.evaluate('(f) => (async () => { try { return await FD.tapFood(f) } catch(e){ return "ERR" } })()', f)

    def tap_bowl(f):
        return pg.evaluate('(f) => (async () => { try { return await FD.tapBowl(f) } catch(e){ return "ERR" } })()', f)

    def tap_lo(i):
        return pg.evaluate('(i) => (async () => { try { return await FD.tapLeftover(i) } catch(e){ return "ERR" } })()', i)

    def submit():
        return pg.evaluate('() => (async () => { try { return await FD.submit() } catch(e){ return "ERR" } })()')

    def wait_quiz():
        for _ in range(300):
            q = read_q()
            if q:
                return q
            pg.wait_for_timeout(30)
        return None

    def need_left(q):
        """当前还差的 {food: cnt}（按 FD.quiz.need 与碗内现况求差——只看当题需求类）"""
        out = {}
        for f, n in (q.get('need') or {}).items():
            have = (q.get('bowl') or {}).get(f, 0)
            if have < n:
                out[f] = n - have
        return out

    def fill_need(q0):
        """逐类取满当题需求（grace 自动判停手；返回是否到位或已推进）"""
        guard = 0
        while guard < 90:
            cur = read_q()
            lv = read_lv()
            if not cur:
                return bool(lv and (lv['step'] > q0['step'] or lv.get('done')))
            if lv and (lv['step'] > q0['step'] or lv.get('done')):
                return True
            left = need_left(cur)
            if not left:
                return True
            f = list(left.keys())[0]
            tap_food(f)
            pg.wait_for_timeout(40)
            guard += 1
        return False

    def advance_after(k, q_last):
        """取满后：等 grace 自动判（或兜底 submit）→ 题号推进/通关"""
        for _ in range(140):
            lv = read_lv()
            if lv and (lv['step'] > k or lv.get('done')):
                return True
            cur = read_q()
            if cur and not need_left(cur):
                submit()
            pg.wait_for_timeout(50)
        return False

    # ---- F1/F2/F3 全量审计：60 关（静态 30 + 生成 30，六章循环两轮 dch 全覆盖）× 5 题 ----
    all_snaps = {}
    ch_fail, st_fail, drive_fail, kind_fail = [], [], [], []
    gen_dch_seen = set()
    lo_count_fail = []
    for flat in range(60):
        pg.evaluate('(f) => { FD.start(f) }', flat)
        dch = dch_of(flat)
        if flat >= 30:
            gen_dch_seen.add(dch)
        snaps = []
        kinds = []
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                break
            snaps.append(json.dumps(q, sort_keys=True))
            kinds.append(q['kind'])
            # F1 章约束（r8 六章；flat0 题0 钉 n=6 胡萝卜=教学演示正解）
            if flat == 0 and k == 0:
                if not (q['kind'] == 'pick' and q['n'] == 6 and q['food'] == 'carrot' and len(q['piles']) == 1):
                    ch_fail.append((flat, k, 'flat0 特例', q['n'], q['food']))
            elif not rule_ok(q, dch):
                ch_fail.append((flat, k, 'dch%d' % dch, q['kind'], q.get('n'), len(q['piles'])))
            # F2 状态机（抽样关首题：错堆臂/取回臂/欠点臂——双类题按类计）
            if k == 0 and flat in (0, 5, 15, 20, 25):
                need = q.get('need') or {}
                wf = next((x for x in q['piles'] if x not in need), None)
                if wf:
                    r = tap_food(wf)
                    q2 = read_q()
                    if not (r == 'miss-food' and q2['miss'] == q['miss'] and
                            all((q2['bowl'] or {}).get(f, 0) == 0 for f in need)):
                        st_fail.append((flat, k, '错堆', r, q2.get('bowl')))
                f0 = list(need.keys())[0]
                r = tap_food(f0)
                if r in ('ERR', False, 'miss-food'):
                    st_fail.append((flat, k, '对堆取', r))
                r2 = tap_bowl(f0)
                q3 = read_q()
                if not ((q3['bowl'] or {}).get(f0, 0) == 0 and r2 == 0):
                    st_fail.append((flat, k, '取回', r2, q3.get('bowl')))
                # 欠点 submit：碗内留 1 根不取回——错后碗不清空（区分新旧行为强断言）
                tap_food(f0)
                r3 = submit()
                q4 = read_q()
                if not (r3 == 'wrong' and q4['miss'] == q3['miss'] + 1 and
                        (q4['bowl'] or {}).get(f0, 0) == 1 and q4['step'] == q['step']):
                    st_fail.append((flat, k, '欠点(碗留1)', r3, q4['miss'], q4.get('bowl')))
            # F3 驱动通关（left 两阶段 / combo 按类 / pick 按数）
            if q['kind'] == 'left':
                if not fill_need(q):
                    drive_fail.append((flat, k, 'left 阶段一取不满'))
                    break
                r = submit()
                qa = read_q()
                if r != 'eat' or not qa or qa['phase'] != 2:
                    drive_fail.append((flat, k, 'left eat 未开问句态', r))
                    break
                if flat == 20 and k == 0:              # 点数圆点支持抽样：顺序点 1..3（乱序拒绝）
                    if tap_lo(1) is not False:
                        lo_count_fail.append((flat, '乱序未拒绝'))
                    s = [tap_lo(i) for i in (0, 1, 2)]
                    if s != [1, 2, 3]:
                        lo_count_fail.append((flat, '顺序点数', s))
                if not fill_need(qa):
                    drive_fail.append((flat, k, 'left 镜像作答复取不满'))
                    break
                if not advance_after(k, qa):
                    drive_fail.append((flat, k, 'left 总判未推进'))
                    break
            elif q['kind'] == 'combo':
                if not fill_need(q):
                    drive_fail.append((flat, k, 'combo 按类取不满'))
                    break
                if not advance_after(k, q):
                    drive_fail.append((flat, k, 'combo 合计判定未推进'))
                    break
            else:
                if not fill_need(q):
                    drive_fail.append((flat, k, '取不满'))
                    break
                if not advance_after(k, q):
                    drive_fail.append((flat, k, '取满未推进'))
                    break
        # F3b 整关题型恒定（ch5 恒 left / ch6 恒 combo）
        if 20 <= flat < 25 and set(kinds) != {'left'}:
            kind_fail.append((flat, 'ch5 应恒 left', kinds))
        if 25 <= flat < 30 and set(kinds) != {'combo'}:
            kind_fail.append((flat, 'ch6 应恒 combo', kinds))
        all_snaps[flat] = snaps
    chk('F1 r8 六章约束（60 关 pick/left/combo 参数+堆数）', not ch_fail, str(ch_fail[:4]))
    chk('F2 碗计数状态机（错堆/取回/欠点碗不清空）', not st_fail, str(st_fail[:4]))
    chk('F3 引擎直驱通关（pick/left 两阶段/combo 按类）', not drive_fail, str(drive_fail[:4]))
    chk('F3b 整关题型恒定+点数圆点+生成关 dch 全覆盖',
        not kind_fail and not lo_count_fail and gen_dch_seen == set(range(1, 7)),
        'kind=%s lo=%s genDch=%s' % (kind_fail[:2], lo_count_fail[:2], sorted(gen_dch_seen)))

    # ---- F4 确定性：5 flat 双读（覆盖 pick/left/combo/生成关） ----
    diff = []
    for flat in (0, 12, 22, 27, 34):
        pg.evaluate('(f) => { FD.start(f) }', flat)
        snaps2 = []
        for k in range(5):
            q = wait_quiz()
            if not q:
                diff.append((flat, k, '不可读'))
                break
            snaps2.append(json.dumps(q, sort_keys=True))
            if not fill_need(q):
                diff.append((flat, k, '取不满'))
                break
            r = submit()
            qa = read_q()
            if q['kind'] == 'left' and r == 'eat' and qa and qa['phase'] == 2:
                if not fill_need(qa):
                    diff.append((flat, k, '镜像取不满'))
                    break
                submit()
            elif not advance_after(k, q):
                diff.append((flat, k, '未推进'))
                break
        if snaps2 != all_snaps.get(flat):
            diff.append((flat, '双读不一致'))
    chk('F4 确定性（flat 0/12/22/27/34 双读一致）', not diff, str(diff[:3]))

    # ---- F6 r8 时长硬断言（r8 审查 m3：页内自报之外，evaluate 独立重列常量第三副本对账——
    #      同 verify_one_shadow.py ⑮ 先例；句长用引擎数据值，模型常量独立自列） ----
    try:
        vj = json.loads(pg.locator('#verify-result').text_content())
        dur_min = vj['units']['dist']['durMin']
    except Exception as e:
        dur_min = -1
    dup = pg.evaluate("""() => {
      const EST = c => c * 345 + 600, TAP = 2000, RIGHT = 2400, EAT = 900,
            ASK = EST(15) + EST(11) + EAT, MIN = 40000;
      const out = [];
      for (let f = 0; f < 60; f++) {
        const L = genLevel(f);
        const ms = L.quizzes.reduce((s, q) => s + (
          q.kind === 'combo' ? EST(comboSpeech(q).length) + (q.a + q.b) * TAP + RIGHT :
          q.kind === 'left'  ? EST(quizSpeech(q).length) + q.n * TAP + ASK + q.rem * TAP + RIGHT :
                               EST(quizSpeech(q).length) + q.n * TAP + RIGHT), 0);
        out.push(ms);
      }
      return Math.min.apply(null, out);
    }""")
    chk('F6 时长硬断言 durMin>=40000ms（页内自报+独立副本双锚）',
        dur_min >= 40000 and dup >= 40000 and abs(dup - dur_min) <= 1,
        'durMin=%s dup=%s' % (dur_min, dup))

    chk('F5 0 pageerror（复验全程）', not errs, str(errs[:2]))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
