# -*- coding: utf-8 -*-
"""sortsize 大小排排队 · 5 岁半女孩试玩（无头独立 chromium，纯 DOM 断言）
A 全新开档：教学乱点→跟指通关 1-0→首日 6 关节奏（1-1 错链+错卡反复点 / 1-3 静置救援 / 2-0 故意错 2 次）→日末层
B 种档 n=5 → 2-0（章 2 四物）：同一错卡连点 3 次（不灰化验证）→静置救援（三连脉冲）→救援后错点再救援→通关读星
C 零文字审计（方向徽章 SVG 大象→蚂蚁）"""
import time, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common11 import Kid

kid = Kid('sortsize', 'sortsize', 'SO', seed=31)
D = {'game': 'sortsize'}

def quiz(): return kid.quiz()

def quiz_brief(q):
    if not q: return 'None'
    return 'kind=%s order=%s items=%s left=%s pos=%d ans=%d' % (
        q['kind'], q['order'], q['items'], q['left'], q['pos'], q['answerIdx'])

def wait_tut(phase, timeout=15):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if kid.tut() == phase: return True
        time.sleep(0.15)
    return False

def play_level(tag, plan=None):
    """SO 每题多点（3-5 物逐个点）；plan(step,q)->k 在该题先故意错 k 次"""
    t0 = time.time(); per_q = []; guard = 0; wrong_done = {}
    while guard < 260:
        guard += 1
        q = quiz()
        if q is None: break
        st = q['step']
        if st >= len(per_q):
            per_q.append(quiz_brief(q))
            kid.log('%s 第%d题 %s' % (tag, st + 1, quiz_brief(q)))
        if plan and st not in wrong_done:
            wrong_done[st] = True
            k = plan(st, q)
            for j in range(k):
                qc = quiz()
                if not qc: break
                cand = [i for i in qc['left'] if i != qc['answerIdx']]
                if not cand: break
                kid.think(0.9, 1.6)
                kid.tap_card(cand[-1], '第%d题故意错%d(点最不该点的)' % (st + 1, j + 1))
                time.sleep(0.8)
                q2 = quiz()
                kid.log('%s 错%d后 miss=%r wig类=%r 可再点=%r breathe=%r' % (tag, j + 1,
                        (q2 or {}).get('miss'),
                        kid.ev("() => [...document.querySelectorAll('.card.wig')].map(c=>c.dataset.i)"),
                        kid.ev("() => { const c=[...document.querySelectorAll('.card')].filter(x=>!x.className.includes('gone')); return c.length; }"),
                        kid.ev("() => [...document.querySelectorAll('.card.breathe')].map(c=>c.dataset.i)")))
        q = quiz()
        if not q: break
        kid.think(1.3, 2.4)
        kid.tap_card(q['answerIdx'], '第%d题第%d步点应点卡' % (q['step'] + 1, q['pos'] + 1))
        time.sleep(0.6)
    secs = round(time.time() - t0, 1)
    lv = kid.level() or {}
    kid.log('%s 完成 用时=%ss retries=%r' % (tag, secs, lv.get('retries')))
    return {'secs': secs, 'retries': lv.get('retries'), 'per_q': per_q}

def read_stars(key, tag):
    time.sleep(5.4)
    rec = kid.stars_of(key)
    kid.log('%s 存档 levels[%s] = %r' % (tag, key, rec))
    return rec

# ================= 会话 A：全新开档 =================
kid.open()
D['tut_initial'] = {'tut': kid.tut(), 'quiz': quiz_brief(quiz())}
kid.log('A 开档 tutorial=%r' % D['tut_initial']['tut'])
kid.snap('A0_tut_watch')

# --- 教学期乱点不跳 ---
q0 = quiz()
st_before = (kid.tut(), (q0 or {}).get('step'))
kid.tap_xy(640, 40, 'watch期点天空')
time.sleep(0.4)
if q0:
    wrong_i = [i for i in q0['left'] if i != q0['answerIdx']]
    if wrong_i: kid.tap_card(wrong_i[0], 'watch期点错卡')
time.sleep(0.4)
kid.tap('#btn-rabbit', 'watch期点兔子')
time.sleep(0.6)
q1 = quiz(); st_after = (kid.tut(), (q1 or {}).get('step'))
D['tut_random_click'] = {'before': st_before, 'after': st_after, 'swallowed': st_before == st_after}
kid.log('A 教学乱点 %r→%r 不跳=%r' % (st_before, st_after, st_before == st_after))

# --- help + 帮期错点 ---
ok = wait_tut('help', 15)
time.sleep(1.0)
ghost = kid.ev("() => document.getElementById('ghost') ? document.getElementById('ghost').className : null")
kid.log('A help 到位=%r ghost=%r' % (ok, ghost))
kid.snap('A2_tut_help')
qh = quiz(); D['tut_help'] = {'ghost': ghost, 'quiz': quiz_brief(qh)}
kid.think(1.0, 1.6)
w = [i for i in qh['left'] if i != qh['answerIdx']]
kid.tap_card(w[0], '帮期故意错一次')
time.sleep(0.8)
q2 = quiz()
D['tut_help_wrong'] = {'miss': (q2 or {}).get('miss'), 'tut': kid.tut()}
kid.log('A 帮期错点 miss=%r tut=%r' % (D['tut_help_wrong']['miss'], D['tut_help_wrong']['tut']))

# --- 跟指答对 → solo → 打完 1-0 ---
kid.think(0.9, 1.4)
kid.tap_card((quiz() or qh)['answerIdx'], '跟指点对')
time.sleep(1.2)
D['tut_solo_at'] = kid.tut()
kid.log('A 首次答对 tutorial=%r（应 solo）' % D['tut_solo_at'])
D['level_1_0'] = play_level('A2_1-0')
kid.wait_celebrate('A2_1-0')
D['stars_1_0'] = read_stars('1-0', 'A2')

# --- 1-1：错链 + 同一错卡反复点（不灰化款核心验证） ---
kid.dismiss_overlays(); kid.wait_quiz()
lv = kid.level(); kid.log('A3 下一关 flat=%r' % (lv or {}).get('flat'))
q = kid.wait_quiz()
kid.log('A3 第2题开始前先看第1题：%s' % quiz_brief(q))
# 在第 1 题连点同一张错卡 3 次（点最小/最不该点的）——观察 miss 递增/不灰/可再点
same_card = [i for i in q['left'] if i != q['answerIdx']][-1]
seq_obs = []
for j in range(3):
    kid.think(0.8, 1.4)
    kid.tap_card(same_card, '同一张错卡第%d次' % (j + 1))
    time.sleep(0.7)
    qc = quiz()
    seq_obs.append({'n': j + 1, 'miss': (qc or {}).get('miss'),
                    'card_pe': kid.ev('(i) => getComputedStyle(document.querySelector(".card[data-i=\\""+i+"\\"]")).pointerEvents', str(same_card)),
                    'breathe': kid.ev("() => [...document.querySelectorAll('.card.breathe')].map(c=>c.dataset.i)")})
    kid.log('A3 同卡第%d次后 %r' % (j + 1, seq_obs[-1]))
D['same_wrong_card_x3'] = seq_obs
D['level_1_1'] = play_level('A3_1-1')
kid.wait_celebrate('A3_1-1')
D['stars_1_1'] = read_stars('1-1', 'A3')

# --- 1-2：正常节奏样本 ---
kid.dismiss_overlays(); kid.wait_quiz()
D['level_1_2'] = play_level('A4_1-2')
kid.wait_celebrate('A4_1-2')
D['stars_1_2'] = read_stars('1-2', 'A4')

# --- 1-3：静置救援（三连脉冲） ---
kid.dismiss_overlays(); kid.wait_quiz()
lv = kid.level(); kid.log('A5 flat=%r 第1题点对一步再发呆' % (lv or {}).get('flat'))
q = quiz(); kid.think(); kid.tap_card(q['answerIdx'], '第1题第1步'); time.sleep(1.8)
kid.ev('window.__vlog = []')
t0 = time.time(); rescue = {'at_s': None, 'voice': [], 'pulse_seen': None, 'pulse_bursts': 0}
last_pulse = 0
while time.time() - t0 < 24:
    el = time.time() - t0
    v = [x for x in kid.vlog() if x.startswith('T:从最') or 'sor_hint' in x]
    pu = kid.ev("() => document.querySelectorAll('.card.pulse').length")
    if v and rescue['at_s'] is None:
        rescue['at_s'] = round(el, 1); rescue['voice'] = v[:2]; kid.log('A5 ★救援 @%.1fs %r' % (el, v[:2]))
    if pu and rescue['pulse_seen'] is None:
        rescue['pulse_seen'] = round(el, 1); kid.log('A5 ★应点卡脉冲 @%.1fs' % el); kid.snap('A5_rescue_pulse')
    if pu and el - last_pulse > 0.4:
        rescue['pulse_bursts'] += 1; last_pulse = el
    if rescue['at_s'] and rescue['pulse_seen'] and rescue['pulse_bursts'] >= 3: break
    time.sleep(0.15)
D['rescue_idle_1_3'] = rescue
kid.log('A5 救援=%r（三连脉冲观测 bursts=%d）' % (rescue, rescue['pulse_bursts']))
D['level_1_3'] = play_level('A5_1-3')
kid.wait_celebrate('A5_1-3')
D['stars_1_3'] = read_stars('1-3', 'A5')

# --- 1-4 → 章末层 ---
kid.dismiss_overlays(); kid.wait_quiz()
D['level_1_4'] = play_level('A6_1-4')
kid.wait_celebrate('A6_1-4')
D['stars_1_4'] = read_stars('1-4', 'A6')
ov = kid.overlay_check('A6'); D['chapterend'] = ov
kid.log('A6 章末层=%r' % ov)
kid.dismiss_overlays()

# --- 2-0（章 2 四物）：故意错 2 次通关 ---
kid.wait_quiz()
kid.log('A7 2-0 %s' % quiz_brief(quiz()))
D['level_2_0'] = play_level('A7_2-0', plan=lambda s, q: 1 if s in (0, 2) else 0)
kid.wait_celebrate('A7_2-0')
D['stars_2_0'] = read_stars('2-0', 'A7')
time.sleep(1.0)
ov = kid.overlay_check('A7'); D['dayend'] = ov
kid.log('A7 日末层=%r' % ov)
kid.snap('A7_dayend')

D['text_audit'] = kid.text_audit()
D['dir_badge'] = kid.ev("""() => { const b = document.getElementById('dir-badge');
  return b ? { order: b.dataset.order, hasSvg: b.innerHTML.includes('svg'),
               txt: b.innerText.trim(), len: b.innerHTML.length } : null; }""")
D['strip_dir'] = kid.ev("""() => { const s = document.getElementById('strip');
  return s ? { txt: s.innerText.trim().slice(0,20), nchild: s.children.length } : null; }""")
D['vlog_summary_A'] = {
    'T_dir': kid.vcount(lambda x: x.startswith('T:从最')),
    'P_wrong': kid.vcount(lambda x: x.startswith('P:null#再')),
    'S_pop': kid.vcount(lambda x: x == 'S:pop'),
    'S_coin': kid.vcount(lambda x: x == 'S:coin'),
    'clips': sorted(set(x.split('#')[0][2:] for x in kid.vlog() if x.startswith('P:') and not x.startswith('P:null'))),
}
kid.log('A 零文字审计=%r dir_badge=%r strip=%r' % (D['text_audit'], D['dir_badge'], D['strip_dir']))
kid.log('A 语音汇总=%r' % D['vlog_summary_A'])
D['errors_A'] = kid.errors
kid.close()

# ================= 会话 B：种档 n=5 → 2-0（四物） =================
kid2 = Kid('sortsize', 'sortsize', 'SO', seed=32)
kid2.log('B 种档 n=5 → 2-0')
kid2.open()
kid2.seed(5); kid2.reload()
time.sleep(1.0)
q = kid2.quiz()
kid2.log('B 2-0 首题 %s' % quiz_brief(q))

# 同一错卡连点 3 次（不灰化 + miss 递增）
chain = []
same = [i for i in q['left'] if i != q['answerIdx']][-1]
for j in range(3):
    kid2.think(0.9, 1.5)
    kid2.tap_card(same, '同卡错%d' % (j + 1))
    time.sleep(0.7)
    qc = kid2.quiz()
    st = kid2.ev("""() => { const cards=[...document.querySelectorAll('.card')];
      return { miss: (window.SO.quiz||{}).miss, gone: cards.filter(c=>c.classList.contains('gone')).length,
        breathe: cards.findIndex(c=>c.classList.contains('breathe')),
        pe_all: cards.every(c=>getComputedStyle(c).pointerEvents!=='none') }; }""")
    chain.append(st); kid2.log('B 同卡错%d后 %r' % (j + 1, st))
D['wrong_chain_2_0'] = chain
kid2.snap('B_nogray')

# 正常排完第 1 题
guard = 0
while guard < 20:
    q = kid2.quiz()
    if not q or q['step'] == 1: break
    if q['pos'] == 0 and q['step'] == 0 and guard > 0 and not q['left']: break
    kid2.think(1.2, 2.0)
    kid2.tap_card(q['answerIdx'], 'B排第1题')
    time.sleep(0.6)
    guard += 1

# 第 2 题静置救援 + 救援后错点
q2 = kid2.wait_step(1, 12)
kid2.log('B 第2题 %s' % quiz_brief(q2))
kid2.ev('window.__vlog = []')
t0 = time.time(); r1 = {'at_s': None, 'voice': None, 'pulse_seen': None}
while time.time() - t0 < 22:
    el = time.time() - t0
    v = [x for x in kid2.vlog() if x.startswith('T:从最') or 'sor_hint' in x]
    pu = kid2.ev("() => document.querySelectorAll('.card.pulse').length")
    if v and r1['at_s'] is None: r1['at_s'] = round(el, 1); r1['voice'] = v[:1]; kid2.log('B ★救援1 @%.1fs %r' % (el, v[:1]))
    if pu and r1['pulse_seen'] is None: r1['pulse_seen'] = round(el, 1); kid2.snap('B_rescue1')
    if r1['at_s'] and r1['pulse_seen']: break
    time.sleep(0.15)
D['rescue_B_1'] = r1
kid2.ev('window.__vlog = []')
qq = kid2.quiz()
w = [i for i in qq['left'] if i != qq['answerIdx']][0]
kid2.tap_card(w, '救援后马上点错')
time.sleep(0.8)
kid2.log('B 救援后错点 miss=%r' % (kid2.quiz() or {}).get('miss'))
t0 = time.time(); r2 = {'at_s': None, 'voice': None}
while time.time() - t0 < 20:
    el = time.time() - t0
    v = [x for x in kid2.vlog() if x.startswith('T:从最') or 'sor_hint' in x]
    if v and r2['at_s'] is None: r2['at_s'] = round(el, 1); r2['voice'] = v[:1]; kid2.log('B ★救援2 @%.1fs %r（错点没掐断救援钟）' % (el, v[:1]))
    if r2['at_s']: break
    time.sleep(0.2)
D['rescue_B_2'] = r2

guard = 0
while guard < 80:
    q = kid2.quiz()
    if not q: break
    kid2.think(1.2, 2.2)
    kid2.tap_card(q['answerIdx'], 'B补题')
    time.sleep(0.6)
    guard += 1
kid2.wait_celebrate('B_2-0')
time.sleep(5.4)
D['stars_2_0_B'] = kid2.stars_of('2-0')
kid2.log('B 存档 levels[2-0] = %r（同卡3错+救援期1错=4错 → 1★ 预期）' % D['stars_2_0_B'])
D['errors_B'] = kid2.errors
kid2.close()

kid.log('DONE'); kid2.log('DONE')
D['errors_all'] = {'A': D.get('errors_A'), 'B': D.get('errors_B')}
kid.dump_data(D)
kid.log('DATA DUMPED')
