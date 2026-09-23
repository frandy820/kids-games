# -*- coding: utf-8 -*-
"""hidden 独立复验（SPEC-BATCH22 §1+§0.49 + SPEC-R20-HIDDEN r20 修订）——断言从 SPEC 推导，禁从实现行为归纳
r20 章域（SPEC-R20 §R2）：ch1 n∈[2,3]+异种干扰（全可见）/ ch2 n∈[4,5]+同系干扰半遮蔽[0.35,0.55]
  +countAsk / ch3 双种 n∈[4,5]+countAsk / ch4 子型∈{2,3} 混合 ≥2+全题 flash+countAsk
H1 章约束（n=kinds 计数和+干扰/作答域） / H2 遮蔽率 0.30-0.60 全 targets + 目标互距 ≥256（Python 复算）
H3 tapScene 语义（点目标='found'+foundN+1/点干扰动物位='?'/重复点已 found=不重复计
  +r20 作答语义抽检：ansOpen→answer 错值 'retry' 不推进→answer(n) 推进）
H4 找全+答数自动推进 + 星级恒 3★（无错误路径，答数错=探索不记 miss）
H5 确定性（flat 0/12/27/39 双读）/ H6 0 pageerror
M1 播放序列（M-1 回归，消费 game-main verify 页 HD._says 记录器）：ch4 flash 期采样点禁出
  hid_q_+首条 hid_mem_watch+flash 后 1s 内读题；ch2 非 flash 新题 2s 内首条即 hid_q_ 且全程无 mem_watch；
  直调点收编回归（ch2）：点干扰动物位 hid_w_ 点名+答错 hid_cnt_retry 均入 SAYLOG（SPEC-R20 §R3/试玩P3 语音契约）
纪律：tapScene/answer async——evaluate 侧 await；先等 title=VERIFY PASS；
静音双保险：每页面 goto 前挂静音 init_script（speak/Audio no-op）+种档 sound:false。"""
import json, sys, os, math
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'hidden', 'index.html').replace('\\', '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

MUTE = """(() => {
  try { localStorage.setItem('kidsgame_hidden', JSON.stringify({v:'1.0',game:'hidden',levels:{},settings:{sound:false,tts:false,vol:0}})); } catch(e){}
  window.speechSynthesis && (speechSynthesis.speak = () => {}, speechSynthesis.cancel = () => {});
  const ap = Audio.prototype.play; Audio.prototype.play = function(){ try{ this.dispatchEvent(new Event('ended')); }catch(e){} return Promise.resolve(); };
})();"""

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
    chk('H0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    def read_q():
        return pg.evaluate('() => HD.quiz')

    def read_lv():
        return pg.evaluate('() => HD.currentLevel ? {step: HD.currentLevel.step, done: HD.currentLevel.done} : null')

    def tap(x, y):
        return pg.evaluate('([x, y]) => (async () => { try { return await HD.tapScene(x, y) } catch(e){ return "ERR" } })()', [x, y])

    def wait_flash_off():
        for _ in range(300):
            if not pg.evaluate('() => HD.flashOn'):
                return True
            pg.wait_for_timeout(30)
        return False

    def answer(n):
        return pg.evaluate('(n) => (async () => { try { return await HD.answer(n) } catch(e){ return "ERR" } })()', n)

    def wait_quiz():
        for _ in range(300):
            if read_q():
                return read_q()
            pg.wait_for_timeout(30)
        return None

    def stepped(k):
        lv = read_lv()
        return (lv and lv['step'] > k) or bool(lv and lv['done'])

    all_levels = {}
    ch_fail, occ_fail, drive_fail = [], [], []
    star_seen = set()
    for flat in range(40):
        pg.evaluate('(f) => { HD.start(f) }', flat)
        snaps = []
        ok_break = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            snaps.append(json.dumps(q, sort_keys=True))
            kinds = q['kinds']
            n = q['n']
            # H1 章约束（r20 SPEC-R20 §R2 域）
            if sum(x['count'] for x in kinds) != n:
                ch_fail.append((flat, k, 'kinds 计数≠n', kinds, n))
            if flat < 20:
                dch = flat // 5 + 1
                if dch == 1 and not (2 <= n <= 3 and q.get('distractor')
                                     and q['distractor'].get('occlusion') is None):
                    ch_fail.append((flat, k, 'ch1', n, q.get('distractor')))
                elif dch == 2 and not (4 <= n <= 5 and q.get('distractor')
                                       and q['distractor'].get('occlusion') is not None
                                       and 0.35 <= q['distractor']['occlusion'] <= 0.55
                                       and q.get('countAsk') and not q.get('flash')):
                    ch_fail.append((flat, k, 'ch2', n, q.get('distractor'), q.get('countAsk')))
                elif dch == 3 and not (len(kinds) == 2 and 4 <= n <= 5   # m5 收紧：SPEC 恰好 2
                                       and q.get('countAsk') and not q.get('flash')):
                    ch_fail.append((flat, k, 'ch3', kinds, n, q.get('countAsk')))
                elif dch == 4 and not (q.get('pattern') in (2, 3) and q.get('countAsk')
                                       and q.get('flash') and 4 <= n <= 5):
                    ch_fail.append((flat, k, 'ch4', q.get('pattern'), q.get('flash'), n))
            # H2 遮蔽率+互距（干扰半遮蔽区间 r20 型2 域）
            tgs = q['targets']
            for tg in tgs:
                if not (0.30 <= tg['occlusion'] <= 0.60):
                    occ_fail.append((flat, k, '遮蔽率', tg['occlusion']))
            for i in range(len(tgs)):
                for j in range(i + 1, len(tgs)):
                    d = math.hypot(tgs[i]['x'] - tgs[j]['x'], tgs[i]['y'] - tgs[j]['y'])
                    if d < 256:
                        occ_fail.append((flat, k, '目标重叠', round(d)))
            # H3 语义抽检（首批题）：干扰动物位='?'、重复点已 found=不重复计、r20 作答链
            if flat in (0, 6, 12, 22) and k == 0:
                wait_flash_off()                       # r20：闪现期点击被吞，先等结束
                if q.get('distractor'):
                    r = tap(q['distractor']['x'], q['distractor']['y'])
                    q2 = read_q()
                    if not (r == '?' and q2['foundN'] == q['foundN'] and q2['miss'] == q['miss']):
                        drive_fail.append((flat, k, '干扰动物语义', r, q2['foundN']))
                r = tap(tgs[0]['x'], tgs[0]['y'])
                q2 = read_q()
                if not (r == 'found' and q2['foundN'] == q['foundN'] + 1):
                    drive_fail.append((flat, k, 'found 语义', r, q2['foundN']))
                r = tap(tgs[0]['x'], tgs[0]['y'])      # 重复点已 found
                q3 = read_q()
                if q3 and q3['targets'][0]['found'] and q3['foundN'] != q2['foundN']:
                    drive_fail.append((flat, k, '重复计数', q3['foundN']))
            # H4 驱动：等闪现结束 → 点全部目标 → countAsk 题找全后答数
            if not wait_flash_off():
                drive_fail.append((flat, k, '闪现未结束'))
                ok_break = True
                break
            for tg in q['targets']:
                if not tg['found']:
                    tap(tg['x'], tg['y'])
                    pg.wait_for_timeout(40)
            answered = False
            for _ in range(80):
                if stepped(k):
                    break
                cq = read_q()
                if cq and cq.get('ansOpen') and not answered:
                    if flat in (6, 12, 22) and k == 0:     # r20 抽检：答错 retry 不推进
                        wrong = 2 if cq['n'] >= 5 else cq['n'] + 1
                        rr = answer(wrong)
                        cq2 = read_q()
                        if not (rr == 'retry' and cq2 and cq2.get('ansOpen')
                                and cq2['step'] == k and cq2['miss'] == 0):
                            drive_fail.append((flat, k, '答错 retry 语义', rr))
                    ra = answer(cq['n'])
                    answered = True
                    if ra not in ('right', 'done'):
                        drive_fail.append((flat, k, '答对未推进', ra))
                    pg.wait_for_timeout(60)
                else:
                    pg.wait_for_timeout(50)
            if not stepped(k):
                drive_fail.append((flat, k, '找全/答数未推进'))
                ok_break = True
                break
        all_levels[flat] = snaps
        lv = read_lv()
        if lv and lv.get('done') and not ok_break:
            st = pg.evaluate('() => HD.currentLevel && HD.currentLevel.done ? engStars(HD.currentLevel) : -1')
            star_seen.add(st)
    chk('H1 章约束（40 关 n/kinds/干扰/作答域 r20）', not ch_fail, str(ch_fail[:4]))
    chk('H2 遮蔽率 30-60%+目标互距 ≥256', not occ_fail, str(occ_fail[:3]))
    chk('H3/H4 引擎直驱（found/?/不重复/答数 retry·answer/推进）', not drive_fail, str(drive_fail[:4]))
    chk('H4b 星级恒 3（无错误路径，答数错不扣星）', star_seen <= {3}, str(sorted(star_seen)))

    # ---- H5 确定性：4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { HD.start(f) }', flat)
        snaps2 = []
        for k in range(5):
            q = wait_quiz()
            snaps2.append(json.dumps(q, sort_keys=True) if q else None)
            wait_flash_off()
            for tg in (q['targets'] if q else []):
                if not tg['found']:
                    tap(tg['x'], tg['y'])
                    pg.wait_for_timeout(40)
            answered = False
            for _ in range(80):
                if stepped(k):
                    break
                cq = read_q()
                if cq and cq.get('ansOpen') and not answered:
                    answer(cq['n'])
                    answered = True
                else:
                    pg.wait_for_timeout(50)
        if snaps2 != all_levels.get(flat):
            diff.append(flat)
    chk('H5 确定性（flat 0/12/27/39 双读一致）', not diff, str(diff))

    # ---- M1 播放序列（M-1 回归：flash 题语音 hid_mem_watch 曾与读题同 tick 发出被截断）----
    # 契约（game-main verify 页实现）：window.HD._says 数组，每次语音调度 push {k, t}
    # （t=performance.now 毫秒）；sayR 记单键（如 hid_mem_watch）、playChain 记 '+' 拼串
    # （如 hid_q_frog+hid_w_frog+hid_n_4）。VERIFY 页 SPEED=0.12、FLASH_MS=2400 → 闪现约 288ms，
    # 采样步长 20ms（≤40ms）；进新 quiz 前记 _says 长度作基线，只断言基线后的新增项
    def m1_seq(entries, t0):
        return '; '.join('%s@+%.0fms' % (e['k'], e['t'] - t0) for e in entries) or '(空)'

    m1_ok, m1_parts = True, []
    if pg.evaluate('() => (window.HD && HD._says) ? true : false') is not True:
        m1_ok = False
        m1_parts.append('HD._says 未定义（主线记录器缺失）')
    else:
        # ① ch4 flash 题（flat15）：闪现期各采样点新增项禁含 hid_q_；首条=hid_mem_watch；
        #    flash 结束后 1s 内（按时间戳）出现读题项
        b1 = pg.evaluate('() => ({n: HD._says.length, t: performance.now()})')
        pg.evaluate('(f) => { HD.start(f) }', 15)
        ok1, note1 = True, ''
        if not wait_quiz():
            ok1, note1 = False, 'quiz 不可读'
        else:
            saw_flash, leak_q, t_off, t_last_on, new1 = False, False, None, None, []
            for _ in range(300):                    # 闪现 ≈288ms；上限 7.5s 防卡死
                smp = pg.evaluate('() => ({on: !!HD.flashOn, s: HD._says.slice(), t: performance.now()})')
                new1 = smp['s'][b1['n']:]
                if not smp['on']:
                    t_off = smp['t']                # 首个 off 采样（晚于实际结束——轮询粒度）
                    break
                saw_flash = True
                t_last_on = smp['t']                # 最后一个 on 采样=读题合法下界（闪现结束回调
                if any(e['k'] != 'hid_mem_watch' for e in new1):   # 与 flashOn=false 同 tick 调度，e['t'] 可能
                    leak_q = True                    # 闪现期采样点出现非 watch 项=读题抢跑（ch4 读题  # 早于 t_off，禁用 t_off 做下界）
                pg.wait_for_timeout(20)             # 段链键 hid_s_/hid_n_/hid_an_ 不含 hid_q_ 前缀）
            if t_off is None:
                ok1, note1 = False, 'seq=[%s] 闪现未结束' % m1_seq(new1, b1['t'])
            else:
                # 重审mi2 局限声明：本单元只证「调度序」不证真实页播放完整性（verify 页音频 stub）；
                # 直调点已收编 sayR（本轮回编后 hid_cnt_retry/干扰点名入序列，M1 ③ 断言），
                # 教学 ear 段教学链 verify 页不跑（startLevel VERIFY 早退）仍不可在此断言；
                # 真实页按钮类截断（R2-1 族）须靠源码守卫审查，结构性不可在此断言
                q_t = None
                for _ in range(64):                  # 采至 ~1.9s 命中即停；读题=首个非 watch 项（段链键族见上）
                    late = [e for e in new1 if e['k'] != 'hid_mem_watch']
                    if late:
                        q_t = late[0]['t']
                        break
                    smp = pg.evaluate('() => HD._says.slice()')
                    new1 = smp[b1['n']:]
                    pg.wait_for_timeout(20)
                first_mem = bool(new1) and new1[0]['k'] == 'hid_mem_watch'
                # 读题时刻 ∈ [最后 on 采样, 首 off 采样+1s]：不早于最后在闪采样（抢跑=FAIL），
                # 不晚于闪现结束后 1s（漏读=FAIL）；leak_q 仍独立拦「闪现期采样点已见读题」
                ok1 = (saw_flash and not leak_q and first_mem
                       and q_t is not None and t_last_on is not None
                       and q_t >= t_last_on and q_t - t_off <= 1000)
                note1 = 'seq=[%s] sawFlash=%s leakQ=%s firstMem=%s qDelay=%s' % (
                    m1_seq(new1, b1['t']), saw_flash, leak_q, first_mem,
                    ('%.0fms' % (q_t - t_off)) if q_t is not None else '缺失')
        m1_ok = m1_ok and ok1
        m1_parts.append('flat15(flash): ' + note1)

        # ② ch2 非 flash 题（flat5）：新题 2s 窗口内新增首条即含 hid_q_（读题立即调度），
        #    且全程无 hid_mem_watch
        b2 = pg.evaluate('() => ({n: HD._says.length, t: performance.now()})')
        pg.evaluate('(f) => { HD.start(f) }', 5)
        ok2, note2 = True, ''
        if not wait_quiz():
            ok2, note2 = False, 'quiz 不可读'
        else:
            new5 = []
            for _ in range(80):                      # 2s 窗口全程采样（20ms 步）
                smp = pg.evaluate('() => HD._says.slice()')
                new5 = smp[b2['n']:]
                pg.wait_for_timeout(20)
            first_q = bool(new5) and 'hid_q_' in new5[0]['k']
            no_mem = all('hid_mem_watch' not in e['k'] for e in new5)
            ok2 = first_q and no_mem
            note2 = 'seq=[%s] firstQ=%s noMem=%s' % (m1_seq(new5, b2['t']), first_q, no_mem)
        m1_ok = m1_ok and ok2
        m1_parts.append('flat5(非flash): ' + note2)

        # ③ 直调点收编回归（flat6 型2）：点干扰动物位 → hid_w_<animal> 点名入 SAYLOG（试玩P3 契约）；
        #    找全答错 → hid_cnt_retry 入 SAYLOG（SPEC-R20 §R3「答错 hid_cnt_retry」语音契约）
        b3 = pg.evaluate('() => ({n: HD._says.length})')
        pg.evaluate('(f) => { HD.start(f) }', 6)
        q6 = wait_quiz()
        ok3, note3 = True, ''
        if not q6 or not q6.get('distractor'):
            ok3, note3 = False, 'flat6 quiz/干扰不可读'
        else:
            d6 = q6['distractor']
            r_d = tap(d6['x'], d6['y'])                    # 点干扰动物位（首次点名触发点）
            new6 = pg.evaluate('() => HD._says.slice()')[b3['n']:]
            w_key = 'hid_w_' + d6['animal']
            w_logged = any(e['k'] == w_key for e in new6) and r_d == '?'
            for tg in q6['targets']:                        # 找全 → 作答态
                if not tg['found']:
                    tap(tg['x'], tg['y'])
                    pg.wait_for_timeout(40)
            cq6 = None
            for _ in range(80):
                cq6 = read_q()
                if cq6 and cq6.get('ansOpen'):
                    break
                pg.wait_for_timeout(30)
            wrong6 = 2 if (cq6 and cq6['n'] >= 5) else (cq6['n'] + 1 if cq6 else 0)
            rr6 = answer(wrong6)
            new6 = pg.evaluate('() => HD._says.slice()')[b3['n']:]
            retry_logged = any(e['k'] == 'hid_cnt_retry' for e in new6) and rr6 == 'retry'
            if cq6 and cq6.get('ansOpen'):
                answer(cq6['n'])                            # 收尾答对推进（不留悬挂态）
            ok3 = w_logged and retry_logged
            note3 = 'w[%s]=%s(retr=%s) retryLogged=%s(rr=%s)' % (
                w_key, w_logged, r_d, retry_logged, rr6)
        m1_ok = m1_ok and ok3
        m1_parts.append('flat6(直调收编): ' + note3)
    chk('M1 播放序列（flash 期禁读题+mem_watch 先行+flash 后 1s 读题；非 flash 首条即读题；直调点收编入序列）',
        m1_ok, ' | '.join(m1_parts))

    # ---- H6 0 pageerror ----
    chk('H6 0 pageerror（复验全程）', not errs, str(errs[:2]))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
