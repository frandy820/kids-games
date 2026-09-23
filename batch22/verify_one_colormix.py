# -*- coding: utf-8 -*-
"""colormix 独立复验（SPEC-BATCH22 §3+§0.51 分源 + SPEC-R21-COLORMIX r21 修订）——断言从 SPEC 推导，禁从实现行为归纳
r21 章域（SPEC-R21 §R2）：ch1 原色直击 / ch2 恰 2 二级+3 浅原色（4 罐含白）/ ch3 恰 2 棕+3 浅二级（4 罐）
/ch4 配方反推（mode=reverse + picks 恰 3 + 正确恰 1 + 干扰 mix≠target——Python 侧独立复算）
C1 章约束（ch2 恰 2+3 域/ch3 恰 2+3 域/ch4 反推结构/flat≥20 生成关全型循环）
C2 Python 独立混色表对账（r21 §R3：白+单原色=浅原色/白+两原色=浅二级/三原色表/表外 mud；每步 result==mix(pot)）
C3 FIFO 缸深 3（连点 4 罐后 pot 尾 3==最后 3 入缸序且 ≤3 球）
C4 自动判定与星级（==target 推进/错试 tries+1 不阻塞；反推 pickRecipe 同语义；全最优通关=3★，ch1 恒 3）
C4c ch1 清缸重判（换色点重判，存量）/ C5 确定性（flat 0/12/27/39 双读题组 JSON）/ C6 无效色拒绝+0 pageerror
C7 GEN_HINTS 映射（k↔dch=k+1，r21 新文案语境）
纪律：tapJar/pickRecipe async——evaluate 侧 await；先等 title=VERIFY PASS；
静音双保险：每页面 goto 前挂静音 init_script（speak/Audio no-op）+种档 sound:false（r19 外放事故纪律）。"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'colormix', 'index.html').replace('\\', '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note), flush=True)

MUTE = """(() => {
  try { localStorage.setItem('kidsgame_colormix', JSON.stringify({v:'1.0',game:'colormix',levels:{},settings:{sound:false,tts:false,vol:0}})); } catch(e){}
  window.speechSynthesis && (speechSynthesis.speak = () => {}, speechSynthesis.cancel = () => {});
  const ap = Audio.prototype.play; Audio.prototype.play = function(){ try{ this.dispatchEvent(new Event('ended')); }catch(e){} return Promise.resolve(); };
})();"""

TABLE = {frozenset(('red', 'yellow')): 'orange', frozenset(('yellow', 'blue')): 'green',
         frozenset(('red', 'blue')): 'purple', frozenset(('red', 'yellow', 'blue')): 'brown'}
PRIMARY = {'red', 'yellow', 'blue'}
SECONDARY = {'orange', 'green', 'purple'}
LIGHT_PRI = {'lightred', 'lightyellow', 'lightblue'}
LIGHT_SEC = {'lightorange', 'lightgreen', 'lightpurple'}

def mix(pot):
    """SPEC-R21 §R3 混色表（Python 独立实现；三方同步红线之一）"""
    s = set(pot)
    if not s:
        return None
    if len(s) == 1:
        return next(iter(s))
    if 'white' in s:
        rest = s - {'white'}
        if len(rest) == 1:
            return 'light' + next(iter(rest))          # 白+单原色=浅原色
        if len(rest) == 2:
            return 'light' + TABLE[frozenset(rest)]    # 白+两原色=浅二级（r21 传递组合律）
        return 'mud'                                   # 白+三原色（4 色集合，缸深 3 不可达）=表外兜底
    return TABLE.get(frozenset(s), 'mud')

def best_seq(tgt):
    if tgt in PRIMARY:
        return [tgt]
    if tgt == 'brown':
        return ['red', 'yellow', 'blue']
    if tgt.startswith('light'):
        base = tgt[5:]
        if base in PRIMARY:
            return [base, 'white']
        return best_seq(base) + ['white']              # 浅二级=二级配方+白（r21 §R3）
    return {'orange': ['red', 'yellow'], 'green': ['yellow', 'blue'], 'purple': ['red', 'blue']}[tgt]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(MUTE)
    pg.goto(URL)
    for _ in range(240):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('C0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_q():
        return pg.evaluate('() => CM.quiz')

    def read_lv():
        return pg.evaluate('() => CM.currentLevel ? {step: CM.currentLevel.step, done: CM.currentLevel.done} : null')

    def tap(c):
        return pg.evaluate('(c) => (async () => { try { return await CM.tapJar(c) } catch(e){ return "ERR" } })()', c)

    def pick(i):
        return pg.evaluate('(i) => (async () => { try { return await CM.pickRecipe(i) } catch(e){ return "ERR" } })()', i)

    def poll_state():
        # r21 驱动节奏：lv+quiz 合并单次 evaluate（split 双 getter 高频风暴曾崩 renderer——
        # flat12 实测 Target crashed；合并+降频 60ms 后稳定，断言语义不变）
        return pg.evaluate('() => { const lv = CM.currentLevel; return {s: lv ? lv.step : -1, d: !!(lv && lv.done), q: CM.quiz}; }')

    def wait_quiz():
        for _ in range(150):
            st = poll_state()
            if st['q']:
                return st['q']
            pg.wait_for_timeout(60)
        return None

    def stepped(k):
        st = poll_state()
        return st['s'] > k or st['d']

    def wait_step(k, timeout_ms=6000):
        for _ in range(int(timeout_ms / 60)):
            if stepped(k):
                return True
            pg.wait_for_timeout(60)
        return False

    # ---- 全量审计：40 关 × 5 题 ----
    all_levels = {}
    ch_fail, mix_fail, fifo_fail, drive_fail, star_fail, c4c_fail, rev_fail = [], [], [], [], [], [], []
    PROBE_FLATS = {2, 6, 10, 14, 18, 25, 33}
    for flat in range(40):
        pg.evaluate('(f) => { CM.start(f) }', flat)
        snaps, targets = [], []
        ok_break = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            snaps.append(json.dumps(q, sort_keys=True))
            targets.append(q['target'])
            jars = [j['color'] for j in q['jars']]
            tgt = q['target']
            mode = q.get('mode', 'mix')
            # ---- 反推题路径（r21 §R4）----
            if mode == 'reverse':
                picks = q['picks']
                if not (len(picks) == 3 and q['pot'] == [] and q['result'] == tgt
                        and q.get('picked') in (-1, None)):
                    rev_fail.append((flat, k, '结构', len(picks), q['pot'], q['result']))
                rights = [i for i, pp in enumerate(picks) if mix(pp) == tgt]
                if len(rights) != 1:                       # 正确恰 1 + 干扰混出≠目标（独立复算）
                    rev_fail.append((flat, k, '正确卡数', rights, picks))
                # r21 抽检（首批反推题）：tapJar 反推守卫 false + 选错 wrong 不推进 + 选对推进
                if flat in (15, 33) and k == 0:
                    if tap('red') is not False:
                        rev_fail.append((flat, k, 'tapJar 反推未吞'))
                    widx = next((i for i, pp in enumerate(picks) if mix(pp) != tgt), None)
                    rw = pick(widx)
                    q2 = read_q()
                    if not (rw == 'wrong' and q2 and q2['step'] == k and q2['tries'] == 1
                            and q2['mode'] == 'reverse'):
                        rev_fail.append((flat, k, '选错未留题', rw))
                ra = pick(rights[0]) if len(rights) == 1 else 'NO-RIGHT'
                if ra not in ('right', 'done'):
                    drive_fail.append((flat, k, '反推未推进', ra))
                else:
                    wait_step(k, 3000)
                    if not stepped(k):
                        drive_fail.append((flat, k, '反推推进超时'))
                        ok_break = True
                        break
                continue
            # ---- 正推题路径（存量 + r21 新域）----
            # C1 章约束
            if flat == 0 and k == 0:
                pass                                        # 教学衔接特例：题0=green（演示调绿恰好完成，SPEC §3 落地）
            elif flat < 20:
                dch = flat // 5 + 1
                if dch == 1 and tgt not in jars:
                    ch_fail.append((flat, k, 'ch1 非原色直击', tgt))
                elif dch == 2 and tgt not in SECONDARY | LIGHT_PRI:
                    ch_fail.append((flat, k, 'ch2 越界', tgt))
                elif dch == 3 and tgt not in ({'brown'} | LIGHT_SEC):
                    ch_fail.append((flat, k, 'ch3 越界', tgt))
                elif dch == 4:
                    ch_fail.append((flat, k, 'ch4 非反推（正推域不该出现）', mode))
            else:
                if tgt not in PRIMARY | SECONDARY | {'brown'} | LIGHT_PRI | LIGHT_SEC:
                    ch_fail.append((flat, k, '生成关越界', tgt))
            best = best_seq(tgt)
            multi = len(best) >= 2
            # FIFO 探测（先做——单罐直击题不适用；反推题已在上面 continue）
            fifo_done = False
            if k == 0 and flat in (5, 20, 31) and multi:
                # 安全组合：选两原色 c1,c2 使 mix({c1,c2})≠target（不触发自动判定的庆祝锁）
                prim = [c for c in ('red', 'yellow', 'blue') if c in jars]
                pair = None
                for a in range(len(prim)):
                    for b2 in range(a + 1, len(prim)):
                        if mix([prim[a], prim[b2]]) != tgt:
                            pair = (prim[a], prim[b2])
                            break
                    if pair:
                        break
                seq4 = list(pair) * 2 if pair else ([j['color'] for j in q['jars']] * 2)[:4]
                for c in seq4:
                    tap(c)
                    pg.wait_for_timeout(120)   # r21 驱动节奏：tap 间留 busy 窗（快连会被占位锁拦致 FIFO 误报）
                q6 = read_q()
                if len(q6['pot']) > 3 or q6['pot'] != seq4[-3:] or q6['result'] != mix(q6['pot']):
                    fifo_fail.append((flat, k, 'FIFO', q6['pot'], seq4))
                fifo_done = True
            # 抽关先做一步「入罐不构成解」的探索（same-set 无变化不重判由 C2 逐步对账覆盖）
            if multi and flat in PROBE_FLATS and not fifo_done:
                c = next(x for x in jars if x != best[0])
                tap(c)
                pg.wait_for_timeout(120)   # r21 驱动节奏（同上：tap 重入密度过高会崩 renderer）
                q2 = read_q()
                if q2['pot'] != [c] or q2['result'] != mix(q2['pot']):
                    mix_fail.append((flat, k, '首入', q2['pot'], q2['result']))
            # C4c ch1 清缸重判（试玩P2a）：错色入缸后换点目标色=直接判 right（旧行为 pot 残留→mud→wrong）
            if 1 <= flat <= 3 and k == 1:
                wc = next((c for c in jars if c != tgt), None)
                if wc:
                    rw = tap(wc)
                    pg.wait_for_timeout(120)   # r21 驱动节奏：rw 的 busy/演出窗内 rr 会被拦（误报）
                    rr = tap(tgt)
                    if not (rw == 'wrong' and rr == 'right'):
                        c4c_fail.append((flat, k, rw, rr))
            # 收敛驱动：循环取最优罐，每步对账 result==mix(pot)
            # r21 驱动节奏：无空转轮询（tap→poll→未推进继续 tap——right 演出窗由 tap 后
            # 80ms 等待覆盖；wrong 后空转式 wait_step 轮询曾致 renderer Target crashed）
            guard = 0
            while guard < 24:
                st = poll_state()
                if st['s'] > k or st['d']:
                    break
                qq = st['q']
                if not qq:
                    pg.wait_for_timeout(200)        # 推进空窗=判对，稍候复查
                    continue
                c = best[guard % len(best)]
                tap(c)
                pg.wait_for_timeout(80)
                q3 = poll_state()['q']
                if q3 is None:
                    pg.wait_for_timeout(250)        # tap 触发判定的空窗
                    continue
                exp = mix(q3['pot'])
                if q3['result'] != exp:
                    mix_fail.append((flat, k, 'mix', q3['pot'], q3['result'], exp))
                    break
                guard += 1
            else:
                drive_fail.append((flat, k, '驱动超限'))
            if not stepped(k):
                drive_fail.append((flat, k, '未推进'))
                ok_break = True
                break
            if drive_fail and drive_fail[-1][0] == flat and drive_fail[-1][1] == k:
                ok_break = True
                break
            # 关终星级立即读（celebrate 后 currentLevel 会被清——趁还在读）
            if k == 4 and stepped(4):
                st = -1
                for _ in range(6):                      # 关终窗轮询：currentLevel 在且 quizzes 完整才读
                    pg.wait_for_timeout(150)
                    st = pg.evaluate('() => CM.currentLevel && CM.currentLevel.stars != null ? CM.currentLevel.stars : -1')
                    if st != -1:
                        break
                last_stars = st
        if 5 <= flat <= 9 and len(targets) == 5:        # ch2 聚合：恰 2 二级 + 3 浅原色
            n_sec = sum(1 for x in targets if x in SECONDARY)
            n_lp = sum(1 for x in targets if x in LIGHT_PRI)
            if (n_sec, n_lp) != (2, 3):
                ch_fail.append((flat, 'ch2 构成', n_sec, n_lp))
        if 10 <= flat <= 14 and len(targets) == 5:      # ch3 聚合：恰 2 棕 + 3 浅二级
            nb = sum(1 for x in targets if x == 'brown')
            n_ls = sum(1 for x in targets if x in LIGHT_SEC)
            if (nb, n_ls) != (2, 3):
                ch_fail.append((flat, 'ch3 构成', nb, n_ls))
        all_levels[flat] = snaps
        # C4b 星级：非探索关全最优通关=3★（反推关 par=1 收官定夺后全对亦 3★；关终立即读——庆祝后 currentLevel 被清）
        if flat not in PROBE_FLATS and flat not in (5, 20, 31) and not ok_break and locals().get('last_stars') is not None:
            if last_stars != 3:
                star_fail.append((flat, '全最优非3★', last_stars))
        last_stars = None
    chk('C1 章约束（40 关 r21 域：ch2 2+3/ch3 2+3 构成）', not ch_fail, str(ch_fail[:4]))
    chk('Cr 反推域（picks 恰 3+正确恰 1+守卫/选错留题）', not rev_fail, str(rev_fail[:4]))
    chk('C2 混色表独立对账（含 r21 浅二级规则，逐步 result==表查值）', not mix_fail, str(mix_fail[:4]))
    chk('C3 缸深 3 FIFO（pot==末 3 入缸序）', not fifo_fail, str(fifo_fail[:3]))
    chk('C4 引擎直驱（判对推进/错试不阻塞/反推 pick 推进）', not drive_fail, str(drive_fail[:4]))
    chk('C4b 星级（全最优=3★）', not star_fail, str(star_fail[:3]))
    chk('C4c ch1 清缸重判（换色点重判）', not c4c_fail, str(c4c_fail[:3]))

    # ---- C5 确定性：4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { CM.start(f) }', flat)
        snaps2 = []
        for k in range(5):
            q = wait_quiz()
            snaps2.append(json.dumps(q, sort_keys=True) if q else None)
            if q and q.get('mode') == 'reverse':
                rights = [i for i, pp in enumerate(q['picks']) if mix(pp) == q['target']]
                pick(rights[0] if rights else 0)
                wait_step(k, 3000)
                continue
            guard = 0
            while guard < 20:
                if wait_step(k, 2500):
                    break
                qq = read_q()
                if not qq:
                    break
                tap(best_seq(qq['target'])[guard % len(best_seq(qq['target']))])
                guard += 1
        if snaps2 != all_levels.get(flat):
            diff.append(flat)
    chk('C5 确定性（flat 0/12/27/39 双读一致）', not diff, str(diff))

    # ---- C7 GEN_HINTS 映射（r21 新文案：k↔dch=k+1，生成关确定循环禁右移）----
    gh = pg.evaluate('() => typeof GEN_HINTS !== "undefined" ? GEN_HINTS : null')
    kw = {0: ('一个颜色', '直接'), 1: ('两个', '白'), 2: ('三种', '白'), 3: ('反', '调出来')}
    gh_ok = bool(gh) and len(gh) == 4 and all(any(w in gh[i] for w in kw[i]) for i in range(4))
    chk('C7 GEN_HINTS[k]↔dch=k+1（r21 语境防右移）', gh_ok, str(gh))

    # ---- C6 无效色拒绝 + 0 pageerror ----
    bad = pg.evaluate('() => (async () => { try { const r = await CM.tapJar("magenta"); return r === false || r == null } catch(e){ return true } })()')
    chk('C6 无效色拒绝+0 pageerror', bool(bad) and not errs, str(errs[:2]))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
