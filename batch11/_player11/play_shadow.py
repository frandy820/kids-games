# -*- coding: utf-8 -*-
"""shadow 影子配对 · 5 岁半女孩试玩（无头独立 chromium，纯 DOM 断言）
A 全新开档：教学乱点→跟指通关 1-0→首日 6 关节奏（1-1 错链 / 1-3 静置救援 / 2-0 故意错 2 次）→日末层
B 种档 n=5 → 2-0：错 3 连排除法链→静置救援→救援后错点再救援→通关读星
C 零文字审计"""
import time, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common11 import Kid

kid = Kid('shadow', 'sha', 'SH', seed=11)
D = {'game': 'shadow'}

def quiz(): return kid.quiz()

def quiz_brief(q):
    return 'target=%s(%s) opts=%s rot=%s ans=%d' % (q['target'], q['name'], q['options'], q['rot'], q['answerIdx'])

def wait_tut(phase, timeout=15):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if kid.tut() == phase: return True
        time.sleep(0.15)
    return False

def play_level(flat, plan=None, tag=''):
    """真实点击打完一关。plan(step, quiz) -> 'wrong_k' 连错 k 次 / None 正常。返回 {secs, retries, per_q}"""
    t0 = time.time(); per_q = []; guard = 0; wrong_done = {}
    while guard < 200:
        guard += 1
        q = quiz()
        if q is None: break
        st = q['step']
        if st >= len(per_q):
            per_q.append({'q': quiz_brief(q), 'dead0': len(q['dead'])})
            kid.log('%s flat%d 第%d题 %s' % (tag, flat, st + 1, quiz_brief(q)))
        if plan and st not in wrong_done:
            wrong_done[st] = True
            k = plan(st, q)
            for j in range(k):
                qc = quiz()
                if not qc: break
                cand = [i for i in range(len(qc['options'])) if i != qc['answerIdx'] and i not in qc['dead']]
                if not cand: break
                kid.think(1.0, 1.8)
                kid.tap_card(cand[j % len(cand)], '第%d题故意错%d' % (st + 1, j + 1))
                time.sleep(0.8)
                q2 = quiz()
                kid.log('%s 错%d后 miss=%r dead=%r breathe=%r' % (tag, j + 1,
                        (q2 or {}).get('miss'), (q2 or {}).get('dead'),
                        kid.ev("() => !!document.querySelector('.card.breathe')")))
        q = quiz()
        if not q: break
        kid.think(1.4, 2.6)                            # 5 岁半找影子节拍
        kid.tap_card(q['answerIdx'], '第%d题点答案' % (q['step'] + 1))
        time.sleep(0.5)
    secs = round(time.time() - t0, 1)
    lv = kid.level() or {}
    kid.log('%s flat%d 完成 用时=%ss retries=%r' % (tag, flat, secs, lv.get('retries')))
    return {'secs': secs, 'retries': (lv.get('retries')), 'per_q': per_q}

def read_stars(key, tag):
    time.sleep(5.4)                                    # celebrate 2.3s + 写档余量（铁律 ≥5.2s）
    rec = kid.stars_of(key)
    kid.log('%s 存档 levels[%s] = %r' % (tag, key, rec))
    return rec

# ================= 会话 A：全新开档（教学 + 首日 6 关节奏） =================
kid.open()
D['tut_initial'] = {'tut': kid.tut(), 'quiz': quiz() and quiz_brief(quiz())}
kid.log('A 开档 tutorial=%r' % D['tut_initial']['tut'])
kid.snap('A0_tut_watch')

# --- 教学期乱点（天空/错卡/兔子按钮）不跳 ---
q0 = quiz()
st_before = (kid.tut(), (q0 or {}).get('step'))
v0 = len(kid.vlog())
kid.tap_xy(640, 40, 'watch期点天空')
time.sleep(0.4)
wrong_i = [i for i in range(len((q0 or {}).get('options', []))) if i != (q0 or {}).get('answerIdx')]
if wrong_i: kid.tap_card(wrong_i[0], 'watch期点错卡')
time.sleep(0.4)
kid.tap('#btn-rabbit', 'watch期点兔子按钮')
time.sleep(0.6)
q1 = quiz(); st_after = (kid.tut(), (q1 or {}).get('step'))
pops = kid.vcount(lambda x: x == 'S:pop') - sum(1 for x in kid.vlog()[:v0] if x == 'S:pop')
D['tut_random_click'] = {'before': st_before, 'after': st_after, 'pops_added': pops,
                         'swallowed': st_before == st_after}
kid.log('A 教学乱点后 tut/step %r→%r（不跳=%r）新增pop=%d' % (st_before, st_after, st_before == st_after, pops))

# --- 等 help：幽灵手指 + 帮期错点容忍 ---
ok = wait_tut('help', 15)
time.sleep(1.0)                                        # pointHelpNext 的 600ms 定时器落定再读
ghost = kid.ev("() => document.getElementById('ghost') ? document.getElementById('ghost').className : null")
kid.log('A 教学 help 到位=%r ghost=%r' % (ok, ghost))
kid.snap('A2_tut_help')
qh = quiz()
D['tut_help'] = {'ghost_class': ghost, 'quiz': quiz_brief(qh) if qh else None}
w = [i for i in range(len(qh['options'])) if i != qh['answerIdx']]
kid.think(1.0, 1.6)
kid.tap_card(w[0], '帮期故意错一次')
time.sleep(0.8)
q2 = quiz()
D['tut_help_wrong'] = {'miss': (q2 or {}).get('miss'), 'tut': kid.tut(),
                       'dim': kid.ev("() => [...document.querySelectorAll('.card.dim')].map(c=>c.dataset.i)")}
kid.log('A 帮期错点 miss=%r tut=%r dim=%r（被容忍不中断教学）' % (
    D['tut_help_wrong']['miss'], D['tut_help_wrong']['tut'], D['tut_help_wrong']['dim']))

# --- 跟指答对 → solo 放手 → 打完 1-0 ---
kid.think(0.9, 1.4)
kid.tap_card((quiz() or qh)['answerIdx'], '跟指答对')
time.sleep(1.0)
D['tut_solo_at'] = kid.tut()
kid.log('A 首次答对后 tutorial=%r（应 solo）' % D['tut_solo_at'])
D['level_1_0'] = play_level(0, tag='A2')
kid.wait_celebrate('A2_1-0')
D['stars_1_0'] = read_stars('1-0', 'A2')

# --- 1-1：错链观察（一题连错 2：miss=1 不高亮 → miss=2 正确卡 breathe） ---
kid.dismiss_overlays()
kid.wait_quiz()
lv = kid.level(); kid.log('A 下一关 flat=%r' % (lv or {}).get('flat'))
D['level_1_1'] = play_level((lv or {}).get('flat'), plan=lambda s, q: 2 if s == 1 else 0, tag='A3_1-1')
kid.wait_celebrate('A3_1-1')
D['stars_1_1'] = read_stars('1-1', 'A3')

# --- 1-2 正常打（节奏样本） ---
kid.dismiss_overlays(); kid.wait_quiz()
lv = kid.level()
D['level_1_2'] = play_level((lv or {}).get('flat'), tag='A4_1-2')
kid.wait_celebrate('A4_1-2')
D['stars_1_2'] = read_stars('1-2', 'A4')

# --- 1-3：静置救援（先点对推进到第 2 题，再发呆 20s） ---
kid.dismiss_overlays(); kid.wait_quiz()
lv = kid.level(); flat = (lv or {}).get('flat')
kid.log('A5 flat=%r 第1题正常答对再发呆' % flat)
q = quiz(); kid.think(); kid.tap_card(q['answerIdx'], '第1题'); time.sleep(1.6)
kid.ev('window.__vlog = []')
t0 = time.time(); rescue = {'at_s': None, 'voice': [], 'breathe': None}
while time.time() - t0 < 22:
    el = time.time() - t0
    v = [x for x in kid.vlog() if x.startswith('T:找一找') or 'sha_hint' in x]
    br = kid.ev("() => !!document.querySelector('.card.breathe')")
    if v and rescue['at_s'] is None:
        rescue['at_s'] = round(el, 1); rescue['voice'] = v[:2]
        kid.log('A5 ★静置救援 @%.1fs 语音=%r' % (el, v[:2]))
    if br and rescue['breathe'] is None:
        rescue['breathe'] = round(el, 1); kid.snap('A5_rescue')
    if rescue['at_s'] and rescue['breathe']: break
    time.sleep(0.3)
D['rescue_idle_1_3'] = rescue
kid.log('A5 救援记录=%r' % rescue)
D['level_1_3'] = play_level(flat, tag='A5_1-3')
kid.wait_celebrate('A5_1-3')
D['stars_1_3'] = read_stars('1-3', 'A5')

# --- 1-4：打完（章 1 完 → 章末层） ---
kid.dismiss_overlays(); kid.wait_quiz()
lv = kid.level()
D['level_1_4'] = play_level((lv or {}).get('flat'), tag='A6_1-4')
kid.wait_celebrate('A6_1-4')
D['stars_1_4'] = read_stars('1-4', 'A6')
ov = kid.overlay_check('A6')
D['chapterend'] = ov
kid.log('A6 章末层=%r' % ov)
kid.dismiss_overlays()

# --- 2-0（章 2 四选一同组）：故意错 2 次通关 ---
kid.wait_quiz()
lv = kid.level(); kid.log('A7 2-0 flat=%r q=%s' % ((lv or {}).get('flat'), quiz_brief(quiz())))
D['level_2_0'] = play_level(5, plan=lambda s, q: 1 if s in (0, 2) else 0, tag='A7_2-0')
kid.wait_celebrate('A7_2-0')
D['stars_2_0'] = read_stars('2-0', 'A7')
time.sleep(1.0)
ov = kid.overlay_check('A7')
D['dayend'] = ov
kid.log('A7 日末层=%r（首日 6 关打完）' % ov)
kid.snap('A7_dayend')

# 零文字 + 语音依赖审计（在 2-0 场景上）
D['text_audit'] = kid.text_audit()
D['vlog_summary_A'] = {
    'T_find': kid.vcount(lambda x: x.startswith('T:找一找')),
    'P_wrong': kid.vcount(lambda x: x.startswith('P:null#再')),
    'S_pop': kid.vcount(lambda x: x == 'S:pop'),
    'S_coin': kid.vcount(lambda x: x == 'S:coin'),
    'clips': sorted(set(x[2:] for x in kid.vlog() if x.startswith('P:') and x[2] != 'n' and '#' in x and not x.startswith('P:null'))),
}
kid.log('A 零文字审计=%r' % D['text_audit'])
kid.log('A 语音汇总=%r' % D['vlog_summary_A'])
D['errors_A'] = kid.errors
kid.close()

# ================= 会话 B：种档 n=5 → 2-0（错 3 连排除法 + 救援链） =================
kid2 = Kid('shadow', 'sha', 'SH', seed=12)
kid2.log('B 种档 n=5 → 2-0 排除法链')
kid2.open()
kid2.seed(5); kid2.reload()
time.sleep(1.0)
q = kid2.quiz()
kid2.log('B 2-0 首题 %s dead=%r' % (quiz_brief(q), q['dead']))

# --- 错 3 连（4 选 1 有 3 张错卡）：灰化排除法 ---
chain = []
alive_wrong = [i for i in range(len(q['options'])) if i != q['answerIdx']]
for j, wi in enumerate(alive_wrong):
    kid2.think(1.0, 1.6)
    kid2.tap_card(wi, '错%d' % (j + 1))
    time.sleep(0.8)
    st = kid2.ev("""() => { const x = SH.quiz; const cards=[...document.querySelectorAll('.card')];
      return { miss: x.miss, dead: x.dead, breathe: cards.findIndex(c=>c.classList.contains('breathe')),
        pe: cards.map(c=>getComputedStyle(c).pointerEvents), op: cards.map(c=> +getComputedStyle(c).opacity) }; }""")
    chain.append(st); kid2.log('B 错%d后 %r' % (j + 1, st))
D['wrong_chain_2_0'] = chain
kid2.snap('B_elimination')

# --- 排除法推断：只剩答案可点，孩子必然推出 ---
ans_clickable = kid2.ev("""() => { const x = SH.quiz; const c=[...document.querySelectorAll('.card')][x.answerIdx];
  const r=c.getBoundingClientRect(); return { pe: getComputedStyle(c).pointerEvents, px: Math.round(r.width) }; }""")
kid2.log('B 全灰后答案卡=%r（排除法可推出）' % ans_clickable)
kid2.think(1.2, 2.0)
kid2.tap_card(kid2.quiz()['answerIdx'], '排除法只剩它')
time.sleep(1.5)

# --- 第 2 题静置救援 + 救援后错点是否还救 ---
q2 = kid2.wait_step(1, 12)
kid2.log('B 第2题 %s' % quiz_brief(q2))
kid2.ev('window.__vlog = []')
t0 = time.time(); r1 = {'at_s': None, 'voice': None, 'breathe': None}
while time.time() - t0 < 22:
    el = time.time() - t0
    v = [x for x in kid2.vlog() if x.startswith('T:找一找') or 'sha_hint' in x]
    br = kid2.ev("() => !!document.querySelector('.card.breathe')")
    if v and r1['at_s'] is None: r1['at_s'] = round(el, 1); r1['voice'] = v[:1]; kid2.log('B ★救援1 @%.1fs %r' % (el, v[:1]))
    if br and r1['breathe'] is None: r1['breathe'] = round(el, 1); kid2.snap('B_rescue1')
    if r1['at_s'] and r1['breathe']: break
    time.sleep(0.3)
D['rescue_B_1'] = r1
kid2.ev('window.__vlog = []')
qq = kid2.quiz()
w = [i for i in range(len(qq['options'])) if i != qq['answerIdx']][0]
kid2.tap_card(w, '救援后马上点错')
time.sleep(0.8)
kid2.log('B 救援后错点 miss=%r' % (kid2.quiz() or {}).get('miss'))
t0 = time.time(); r2 = {'at_s': None, 'voice': None}
while time.time() - t0 < 20:
    el = time.time() - t0
    v = [x for x in kid2.vlog() if x.startswith('T:找一找') or 'sha_hint' in x]
    if v and r2['at_s'] is None: r2['at_s'] = round(el, 1); r2['voice'] = v[:1]; kid2.log('B ★救援2 @%.1fs %r（错点没掐断救援钟）' % (el, v[:1]))
    if r2['at_s']: break
    time.sleep(0.3)
D['rescue_B_2'] = r2

# --- 干净打完 2-0 ---
t0 = time.time(); guard = 0
while guard < 60:
    guard += 1
    q = kid2.quiz()
    if not q: break
    kid2.think(1.3, 2.3)
    kid2.tap_card(q['answerIdx'], 'B补题')
    time.sleep(0.5)
kid2.wait_celebrate('B_2-0')
time.sleep(5.4)
recB = kid2.stars_of('2-0')
D['stars_2_0_B'] = recB
kid2.log('B 存档 levels[2-0] = %r（错3+救援期错1=4错 → 1★ 预期）' % recB)
D['errors_B'] = kid2.errors
kid2.close()

kid.log('DONE'); kid2.log('DONE')
D['errors_all'] = {'A': D.get('errors_A'), 'B': D.get('errors_B')}
kid.dump_data(D)
kid.log('DATA DUMPED')
