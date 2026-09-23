# -*- coding: utf-8 -*-
"""shapeshome 形状分家 · 5 岁半女孩试玩（无头独立 chromium，纯 DOM 断言）
A 全新开档：教学乱点→跟指通关 1-0→首日 6 关节奏（1-1 错链 / 1-3 静置救援 + 家卡重听 / 2-0 故意错 2 次）→日末层
B 种档 n=5 → 2-0（章 2 单维形状）：错 2 连排除法→静置救援→救援后错点再救援→通关读星
C 零文字审计"""
import time, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common11 import Kid

kid = Kid('shapeshome', 'shp', 'SP', seed=21)
D = {'game': 'shapeshome'}

def quiz(): return kid.quiz()

def quiz_brief(q):
    if not q: return 'None'
    return 'dim=%s tc=%s ts=%s opts=%s ans=%d' % (q['dim'], q['tc'], q['ts'],
        [(o['c'], o['s']) for o in q['options']], q['answerIdx'])

def wait_tut(phase, timeout=15):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if kid.tut() == phase: return True
        time.sleep(0.15)
    return False

def play_level(tag, plan=None):
    t0 = time.time(); per_q = []; guard = 0; wrong_done = {}
    while guard < 200:
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
                cand = [i for i, d in enumerate(qc['dead']) if not d and i != qc['answerIdx']]
                if not cand: break
                kid.think(1.0, 1.8)
                kid.tap_card(cand[0], '第%d题故意错%d' % (st + 1, j + 1))
                time.sleep(0.8)
                q2 = quiz()
                kid.log('%s 错%d后 miss=%r wrong类=%r pulse=%r' % (tag, j + 1,
                        (q2 or {}).get('miss'),
                        kid.ev("() => [...document.querySelectorAll('.card.wrong')].map(c=>c.dataset.i)"),
                        kid.ev("() => [...document.querySelectorAll('.card.pulse,.card.breathe')].map(c=>c.dataset.i)")))
        q = quiz()
        if not q: break
        kid.think(1.4, 2.6)
        kid.tap_card(q['answerIdx'], '第%d题送对' % (q['step'] + 1))
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
v0 = len(kid.vlog())
kid.tap_xy(640, 40, 'watch期点天空')
time.sleep(0.4)
wrong_i = [i for i in range(len((q0 or {}).get('options', []))) if i != (q0 or {}).get('answerIdx')]
if wrong_i: kid.tap_card(wrong_i[0], 'watch期点错卡')
time.sleep(0.4)
kid.tap('#btn-rabbit', 'watch期点兔子')
time.sleep(0.4)
kid.tap('#home', 'watch期点家卡')
time.sleep(0.6)
q1 = quiz(); st_after = (kid.tut(), (q1 or {}).get('step'))
pops = kid.vcount(lambda x: x == 'S:pop') - kid.vcount(lambda x: False)
D['tut_random_click'] = {'before': st_before, 'after': st_after,
                         'pops_total': pops, 'swallowed': st_before == st_after}
kid.log('A 教学乱点 %r→%r 不跳=%r（此段 pop 总数=%d，含 watch 期错卡/家卡轻反馈）' % (
    st_before, st_after, st_before == st_after, pops))

# --- help：幽灵手指 + 帮期错点 ---
ok = wait_tut('help', 15)
time.sleep(1.0)
ghost = kid.ev("() => document.getElementById('ghost') ? document.getElementById('ghost').className : null")
kid.log('A help 到位=%r ghost=%r' % (ok, ghost))
kid.snap('A2_tut_help')
qh = quiz(); D['tut_help'] = {'ghost': ghost, 'quiz': quiz_brief(qh)}
kid.think(1.0, 1.6)
w = [i for i in range(len(qh['options'])) if i != qh['answerIdx']]
kid.tap_card(w[0], '帮期故意错一次')
time.sleep(0.8)
q2 = quiz()
D['tut_help_wrong'] = {'miss': (q2 or {}).get('miss'), 'tut': kid.tut(),
                       'wrong_cls': kid.ev("() => [...document.querySelectorAll('.card.wrong')].map(c=>c.dataset.i)")}
kid.log('A 帮期错点 miss=%r tut=%r wrong类=%r' % (
    D['tut_help_wrong']['miss'], D['tut_help_wrong']['tut'], D['tut_help_wrong']['wrong_cls']))

# --- 跟指答对 → solo → 打完 1-0 ---
kid.think(0.9, 1.4)
kid.tap_card((quiz() or qh)['answerIdx'], '跟指送对')
time.sleep(1.0)
D['tut_solo_at'] = kid.tut()
kid.log('A 首次答对 tutorial=%r（应 solo）' % D['tut_solo_at'])
D['level_1_0'] = play_level('A2_1-0')
kid.wait_celebrate('A2_1-0')
D['stars_1_0'] = read_stars('1-0', 'A2')

# --- 1-1：错链（一题连错 2：miss=1 不高亮 → miss=2 正确卡 pulse） ---
kid.dismiss_overlays(); kid.wait_quiz()
lv = kid.level(); kid.log('A3 下一关 flat=%r' % (lv or {}).get('flat'))
D['level_1_1'] = play_level('A3_1-1', plan=lambda s, q: 2 if s == 1 else 0)
kid.wait_celebrate('A3_1-1')
D['stars_1_1'] = read_stars('1-1', 'A3')

# --- 1-2：正常 + 家卡重听（不识字孩子的高发动作：点家=重听题面） ---
kid.dismiss_overlays(); kid.wait_quiz()
q = quiz(); kid.think()
kid.ev('window.__vlog = []')
kid.tap('#home', '点家卡想再听一遍')
time.sleep(0.6)
home_voice = [x for x in kid.vlog() if x.startswith('T:找一找')]
kid.tap('#home', '3秒内连点家卡（节流）')
time.sleep(0.6)
home_voice2 = [x for x in kid.vlog() if x.startswith('T:找一找')]
D['home_replay'] = {'first': len(home_voice), 'after_second_tap_total': len(home_voice2)}
kid.log('A4 家卡重听 第1次记到 %d 条 / 连点后共 %d 条（3s 节流）' % (len(home_voice), len(home_voice2)))
kid.snap('A4_home')
D['level_1_2'] = play_level('A4_1-2')
kid.wait_celebrate('A4_1-2')
D['stars_1_2'] = read_stars('1-2', 'A4')

# --- 1-3：静置救援 ---
kid.dismiss_overlays(); kid.wait_quiz()
lv = kid.level(); kid.log('A5 flat=%r 第1题正常答对再发呆' % (lv or {}).get('flat'))
q = quiz(); kid.think(); kid.tap_card(q['answerIdx'], '第1题'); time.sleep(1.6)
kid.ev('window.__vlog = []')
t0 = time.time(); rescue = {'at_s': None, 'voice': [], 'breathe': None}
while time.time() - t0 < 22:
    el = time.time() - t0
    v = [x for x in kid.vlog() if x.startswith('T:找一找') or 'shp_hint' in x]
    br = kid.ev("() => !!document.querySelector('.card.breathe')")
    if v and rescue['at_s'] is None:
        rescue['at_s'] = round(el, 1); rescue['voice'] = v[:2]; kid.log('A5 ★救援 @%.1fs %r' % (el, v[:2]))
    if br and rescue['breathe'] is None:
        rescue['breathe'] = round(el, 1); kid.snap('A5_rescue')
    if rescue['at_s'] and rescue['breathe']: break
    time.sleep(0.3)
D['rescue_idle_1_3'] = rescue
kid.log('A5 救援=%r' % rescue)
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

# --- 2-0（章 2 单维形状）：故意错 2 次通关 ---
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
D['vlog_summary_A'] = {
    'T_find': kid.vcount(lambda x: x.startswith('T:找一找')),
    'P_wrong': kid.vcount(lambda x: x.startswith('P:shp_wrong')),
    'S_pop': kid.vcount(lambda x: x == 'S:pop'),
    'S_coin': kid.vcount(lambda x: x == 'S:coin'),
    'S_fail': kid.vcount(lambda x: x == 'S:fail'),
    'clips': sorted(set(x.split('#')[0][2:] for x in kid.vlog() if x.startswith('P:') and not x.startswith('P:null'))),
}
kid.log('A 零文字审计=%r' % D['text_audit'])
kid.log('A 语音汇总=%r' % D['vlog_summary_A'])
D['errors_A'] = kid.errors
kid.close()

# ================= 会话 B：种档 n=5 → 2-0 =================
kid2 = Kid('shapeshome', 'shp', 'SP', seed=22)
kid2.log('B 种档 n=5 → 2-0 排除法链')
kid2.open()
kid2.seed(5); kid2.reload()
time.sleep(1.0)
q = kid2.quiz()
kid2.log('B 2-0 首题 %s dead=%r' % (quiz_brief(q), q['dead']))

chain = []
for j in range(2):
    qc = kid2.quiz()
    cand = [i for i, d in enumerate(qc['dead']) if not d and i != qc['answerIdx']]
    if not cand: break
    kid2.think(1.0, 1.6)
    kid2.tap_card(cand[0], '错%d' % (j + 1))
    time.sleep(0.8)
    st = kid2.ev("""() => { const x = SP.quiz; const cards=[...document.querySelectorAll('.card')];
      return { miss: x.miss, dead: x.dead, hi: cards.findIndex(c=>c.classList.contains('pulse')||c.classList.contains('breathe')),
        pe: cards.map(c=>getComputedStyle(c).pointerEvents), op: cards.map(c=> +getComputedStyle(c).opacity) }; }""")
    chain.append(st); kid2.log('B 错%d后 %r' % (j + 1, st))
D['wrong_chain_2_0'] = chain
kid2.snap('B_elimination')

ans = kid2.ev("""() => { const x = SP.quiz; const c=[...document.querySelectorAll('.card')][x.answerIdx];
  const r=c.getBoundingClientRect(); return { pe: getComputedStyle(c).pointerEvents, px: Math.round(r.width) }; }""")
kid2.log('B 全灰后答案卡=%r' % ans)
kid2.think(1.2, 2.0)
kid2.tap_card(kid2.quiz()['answerIdx'], '排除法只剩它')
time.sleep(1.5)

# 第 2 题静置救援 + 救援后错点
q2 = kid2.wait_step(1, 12)
kid2.log('B 第2题 %s' % quiz_brief(q2))
kid2.ev('window.__vlog = []')
t0 = time.time(); r1 = {'at_s': None, 'voice': None, 'breathe': None}
while time.time() - t0 < 22:
    el = time.time() - t0
    v = [x for x in kid2.vlog() if x.startswith('T:找一找') or 'shp_hint' in x]
    br = kid2.ev("() => !!document.querySelector('.card.breathe')")
    if v and r1['at_s'] is None: r1['at_s'] = round(el, 1); r1['voice'] = v[:1]; kid2.log('B ★救援1 @%.1fs %r' % (el, v[:1]))
    if br and r1['breathe'] is None: r1['breathe'] = round(el, 1); kid2.snap('B_rescue1')
    if r1['at_s'] and r1['breathe']: break
    time.sleep(0.3)
D['rescue_B_1'] = r1
kid2.ev('window.__vlog = []')
qq = kid2.quiz()
w = [i for i, d in enumerate(qq['dead']) if not d and i != qq['answerIdx']][0]
kid2.tap_card(w, '救援后马上点错')
time.sleep(0.8)
kid2.log('B 救援后错点 miss=%r' % (kid2.quiz() or {}).get('miss'))
t0 = time.time(); r2 = {'at_s': None, 'voice': None}
while time.time() - t0 < 20:
    el = time.time() - t0
    v = [x for x in kid2.vlog() if x.startswith('T:找一找') or 'shp_hint' in x]
    if v and r2['at_s'] is None: r2['at_s'] = round(el, 1); r2['voice'] = v[:1]; kid2.log('B ★救援2 @%.1fs %r（错点没掐断救援钟）' % (el, v[:1]))
    if r2['at_s']: break
    time.sleep(0.3)
D['rescue_B_2'] = r2

guard = 0
while guard < 60:
    guard += 1
    q = kid2.quiz()
    if not q: break
    kid2.think(1.3, 2.3)
    kid2.tap_card(q['answerIdx'], 'B补题')
    time.sleep(0.6)
kid2.wait_celebrate('B_2-0')
time.sleep(5.4)
D['stars_2_0_B'] = kid2.stars_of('2-0')
kid2.log('B 存档 levels[2-0] = %r（错2+救援期错1=3错 → 1★ 预期）' % D['stars_2_0_B'])
D['errors_B'] = kid2.errors
kid2.close()

kid.log('DONE'); kid2.log('DONE')
D['errors_all'] = {'A': D.get('errors_A'), 'B': D.get('errors_B')}
kid.dump_data(D)
kid.log('DATA DUMPED')
