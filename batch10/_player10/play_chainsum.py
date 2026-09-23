# -*- coding: utf-8 -*-
"""chainsum 算术接龙 · 6 岁半女孩试玩（无头独立 chromium，纯 DOM 断言）"""
import time, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common10 import Kid

kid = Kid('chainsum', 'cs', 'CS', seed=10)
D = {}   # 采集的结构化证据

def quiz():
    return kid.quiz()

# ============ 阶段 A：全新开档 · 教学关 ============
kid.open()
time.sleep(0.6)
kid.log('A 开档 tutorial=%r quiz0=%r' % (kid.tut(), quiz()))
kid.snap('A0_tut_start')

# 教学 watch 期乱点：天空 / 错误数字卡 / 兔子按钮（教学是否吞输入不乱跳）
time.sleep(0.4); kid.tap_xy(300, 130, '天空')
kid.log('A 乱点天空后 tutorial=%r step=%r' % (kid.tut(), (quiz() or {}).get('step')))
q = quiz()
if q:
    wrong_i = next((i for i, v in enumerate(q['options']) if v != q['answer']), 0)
    kid.tap('.cardbtn[data-i="%d"]' % wrong_i, '教学期点错误卡')
    time.sleep(0.35)
    kid.log('A 乱点错误卡后 tutorial=%r step=%r miss=%r（应仍 watch/0/0）' % (kid.tut(), (quiz() or {}).get('step'), (quiz() or {}).get('miss')))
kid.tap('#btn-rabbit', '教学期点兔子')
time.sleep(0.35)
kid.log('A 乱点兔子后 tutorial=%r' % kid.tut())
D['tut_random_click'] = {'tut_after': kid.tut(), 'pageerrors': list(kid.errors)}

# 等教学 watch → help（约 4-5s）
for _ in range(40):
    if kid.tut() == 'help': break
    time.sleep(0.25)
ghost_cls = kid.ev("() => document.getElementById('ghost') ? document.getElementById('ghost').className : null")
kid.log('A 教学进入 help 幽灵手指 class=%r tutSeen=%r' % (ghost_cls, (kid.save().get('cs') or {}).get('tutSeen')))
kid.snap('A2_tut_help')

# 跟着幽灵手指点正确卡（儿童照指）
q = quiz()
ok_i = q['options'].index(q['answer'])
kid.think(1.2, 1.8)
kid.tap('.cardbtn[data-i="%d"]' % ok_i, '教学help跟指')
time.sleep(1.6)
kid.log('A 教学首答后 tutorial=%r（应 solo）ghost=%r' % (kid.tut(),
    kid.ev("() => document.getElementById('ghost').className")))

# ============ 阶段 A2：第 1 关（1-0）真实点击通关 ============
qs_1_0 = []
guard = 0
while guard < 80:
    guard += 1
    q = quiz()
    if q is None:
        lv = kid.level()
        if lv and (lv.get('done') or lv.get('won')): break
        time.sleep(0.4); continue
    if q['step'] >= len(qs_1_0):
        qs_1_0.append({k: q[k] for k in ('cur', 'op', 'd', 'answer', 'options')})
        kid.log('A2 1-0 第%d题 %d %s %d = ? 候选%s → 我点 %d' % (q['step'] + 1, q['cur'], q['op'], q['d'], q['options'], q['answer']))
        chip = kid.ev("() => document.getElementById('prompt-chip') ? document.getElementById('prompt-chip').innerText : ''")
        sign = kid.ev("() => document.querySelector('.carslot.tail .opsign b') ? document.querySelector('.carslot.tail .opsign b').innerText : ''")
        if q['step'] == 0: D['chip_sign'] = {'chip': chip, 'opsign': sign}
    kid.think(1.3, 2.4)                      # 心算犹豫
    ok_i = q['options'].index(q['answer'])
    kid.tap('.cardbtn[data-i="%d"]' % ok_i, '正确卡')
    time.sleep(1.5)                          # 答对演出 950ms + 余量
D['level_1_0'] = qs_1_0
kid.log('A2 1-0 题目记录 %s' % qs_1_0)

stars_dom = kid.wait_celebrate('A2')
time.sleep(5.5)                              # celebrate 后写档须等 ≥5s
rec = kid.stars_of('1-0')
D['stars_1_0'] = rec
kid.log('A2 存档 levels[1-0] = %r（通关判据 stars>=1）' % rec)
kid.log('A2 当前关 flat=%r（应自动进 1-1）' % (kid.level() or {}).get('flat'))

# ============ 阶段 B：1-1 故意答错（自我纠正测试） ============
lv = kid.level()
if not lv or lv.get('flat') != 1:
    kid.log('B 未处于 1-1，实际 flat=%r' % (lv or {}).get('flat'))
time.sleep(1.0)
q = quiz()
kid.log('B 1-1 第1题 %r' % ({k: q[k] for k in ('cur', 'op', 'd', 'answer', 'options')} if q else None))
wrong_obs = []
# 错 1：点一个错卡
q = quiz()
wi = next(i for i, v in enumerate(q['options']) if v != q['answer'])
kid.think(1.0, 1.4); kid.tap('.cardbtn[data-i="%d"]' % wi, '错1')
time.sleep(0.8)
q2 = quiz(); cls = kid.ev('(i) => document.querySelector(\'.cardbtn[data-i="\'+i+\'"\') ? document.querySelector(\'.cardbtn[data-i="\'+i+\'"\').className : null', wi)
okc = quiz()['options'].index(quiz()['answer'])
ok_cls = kid.ev('(i) => document.querySelector(\'.cardbtn[data-i="\'+i+\'"\') ? document.querySelector(\'.cardbtn[data-i="\'+i+\'"\').className : null', okc)
wrong_obs.append({'n': 1, 'miss': q2['miss'], 'wrong_cls': cls, 'correct_cls': ok_cls})
kid.log('B 错1后 miss=%r 错卡class=%r 正确卡class=%r' % (q2['miss'], cls, ok_cls))
kid.snap('B1_wrong1')
# 错 2：点另一个错卡（应触发正确卡 breathe 高亮）
q2 = quiz()
dead2 = [(q2['dead'][i] if i < len(q2['dead']) else False) for i in range(3)]
wi2 = next(i for i, v in enumerate(q2['options']) if v != q2['answer'] and not dead2[i])
kid.tap('.cardbtn[data-i="%d"]' % wi2, '错2')
time.sleep(0.8)
q3 = quiz(); okc3 = q3['options'].index(q3['answer'])
ok_cls3 = kid.ev('(i) => document.querySelector(\'.cardbtn[data-i="\'+i+\'"\') ? document.querySelector(\'.cardbtn[data-i="\'+i+\'"\').className : null', okc3)
wrong_obs.append({'n': 2, 'miss': q3['miss'], 'correct_cls': ok_cls3})
kid.log('B 错2后 miss=%r 正确卡class=%r（breathe=高亮提示）' % (q3['miss'], ok_cls3))
kid.snap('B2_wrong2_breathe')
# 错 3：再点已灰卡坐标（pointer-events:none 应落穿、不再计 miss —— 排除法保底）
m_before = quiz()['miss']
kid.tap('.cardbtn[data-i="%d"]' % wi, '点已灰卡')
time.sleep(0.6)
m_after = quiz()['miss']
wrong_obs.append({'n': 3, 'tap_dimmed': True, 'miss_before': m_before, 'miss_after': m_after})
kid.log('B 点已灰卡 miss %r→%r（不变=排除法保底不重复罚）' % (m_before, m_after))
# 自我纠正：点正确卡
kid.think(1.0, 1.5)
qx = quiz()
kid.tap('.cardbtn[data-i="%d"]' % qx['options'].index(qx['answer']), '纠正')
time.sleep(1.5)
q4 = quiz()
kid.log('B 纠正后 step=%r（应推进）' % (q4 or {}).get('step'))
D['wrong_obs_1_1'] = wrong_obs
# 顺手点一次兔子（探索）
kid.tap('#btn-rabbit', '点兔子玩')
time.sleep(0.5)
hop = kid.ev("() => document.getElementById('btn-rabbit') ? document.getElementById('btn-rabbit').className : null")
kid.log('B 点兔子后 class=%r（hop=有反馈）' % hop)

# ============ 阶段 C：静置 16-20s 救援观察（1-1 中途新题） ============
q = quiz()
kid.log('C 静置前题目 %s 步=%r' % ({k: q[k] for k in ('cur', 'op', 'd', 'answer')} if q else None, (q or {}).get('step')))
t0 = time.time(); rescue = {'first_breathe_s': None, 'samples': []}
while time.time() - t0 < 20:
    st = kid.ev("""() => { const q = CS.quiz; if (!q) return null;
        const i = q.options.indexOf(q.answer);
        const el = document.querySelector('.cardbtn[data-i="'+i+'"]');
        return {step: q.step, miss: q.miss, cls: el ? el.className : null}; }""")
    el = time.time() - t0
    if st and st['cls'] and 'breathe' in st['cls'] and rescue['first_breathe_s'] is None:
        rescue['first_breathe_s'] = round(el, 1)
        kid.log('C ★救援视觉出现 @%.1fs 正确卡class=%r step未推进=%r' % (el, st['cls'], st['step']))
        kid.snap('C_rescue_breathe')
    rescue['samples'].append((round(el, 1), st['cls'] if st else None))
    time.sleep(0.5)
D['rescue_idle'] = rescue
kid.log('C 静置20s结束 first_breathe=%r' % rescue['first_breathe_s'])

# ============ 阶段 D1：字面照做 seed n=6 → 观察 ============
n = kid.seed(6)
kid.log('D1 seed n=6 写入关数=%r 后 reload' % n)
kid.reload()
time.sleep(1.5)
lv = kid.level(); cnt, txt = kid.dayend_check('D1')
kid.log('D1 n=6 重开后 flat=%r ch=%r（日限=首日6关，已全标完成→日末门）' % (lv.get('flat'), lv.get('ch')))
kid.snap('D1_dayend_n6')
D['seed_n6'] = {'flat': lv.get('flat'), 'ch': lv.get('ch'), 'dayend': cnt, 'dayend_text': txt}
# 点"再玩玩旧关卡"看看孩子能不能继续玩
kid.ev("""() => { const bs = [...document.querySelectorAll('.k-dayend button')];
    const b = bs.find(x => x.innerText.includes('再玩')); if (b) b.click(); return bs.map(x=>x.innerText); }""")
time.sleep(1.0)
lv = kid.level()
kid.log('D1 点[再玩玩旧关卡]后 overlay=%r flat=%r（仍是第1章1-0，第2章今天进不去）' %
        (kid.ev("() => document.querySelectorAll('.k-dayend').length"), lv.get('flat')))

# ============ 阶段 D2：seed n=5（第1章全通）→ 解锁第 2 章玩 1 关 ============
# 先清 levels 再种（防 D1 的 n=6 残留叠加——seed 只加不清）
kid.ev("() => { const sv = KIDS._save(); sv.levels = {}; KIDS.store.persist(); return 0; }")
kid.seed(5)
kid.reload()
time.sleep(1.5)
lv = kid.level(); kid.log('D2 seed n=5 重开后 flat=%r ch=%r lv=%r（应为 5 / 2 / 0 = 第2章第1关）' % (lv.get('flat'), lv.get('ch'), lv.get('lv')))
kid.dayend_check('D2')
lv2 = kid.level()
if lv2.get('flat') != 5:
    kid.log('D2 异常：flat=%r 非第2章，跳过 ch2 采集防死循环' % lv2.get('flat'))
kid.snap('D2_ch2_start')

qs_2_0 = []
wrong_at = {1: 1}     # 第2题故意错1次（大数字算错）再纠正
guard = 0
while guard < 80:
    guard += 1
    q = quiz()
    if q is None:
        lv = kid.level()
        if lv and (lv.get('done') or lv.get('won')): break
        time.sleep(0.4); continue
    if q['step'] >= len(qs_2_0):
        qs_2_0.append({k: q[k] for k in ('cur', 'op', 'd', 'answer', 'options')})
        kid.log('D2 2-0 第%d题 %d %s %d = ? 候选%s' % (q['step'] + 1, q['cur'], q['op'], q['d'], q['options']))
    if q['step'] == 1 and q['miss'] == 0:
        wi = next(i for i, v in enumerate(q['options']) if v != q['answer'])
        kid.think(2.0, 2.6)                  # 大数字想久一点还是错
        kid.tap('.cardbtn[data-i="%d"]' % wi, 'ch2故意错')
        time.sleep(0.8)
        q2 = quiz()
        okc = q2['options'].index(q2['answer'])
        kid.log('D2 ch2 错1次后 miss=%r 正确卡class=%r' % (q2['miss'],
            kid.ev('(i) => document.querySelector(\'.cardbtn[data-i="\'+i+\'"\').className', okc)))
        continue
    kid.think(1.6, 3.0)                      # ch2 心算更久
    kid.tap('.cardbtn[data-i="%d"]' % q['options'].index(q['answer']), '正确卡')
    time.sleep(1.5)
D['level_2_0'] = qs_2_0
d1 = [abs(q['answer'] - q['cur']) for q in qs_1_0]
d2 = [abs(q['answer'] - q['cur']) for q in qs_2_0]
kid.log('D2 ch1 运算幅度 d=%s | ch2 d=%s' % (d1, d2))
D['ch_compare'] = {'ch1_d': d1, 'ch2_d': d2,
                   'ch1_max_num': max([q['cur'] for q in qs_1_0] + [q['answer'] for q in qs_1_0]),
                   'ch2_max_num': max([q['cur'] for q in qs_2_0] + [q['answer'] for q in qs_2_0])}

stars2 = kid.wait_celebrate('D2')
time.sleep(5.5)
rec2 = kid.stars_of('2-0')
D['stars_2_0'] = rec2
kid.log('D2 存档 levels[2-0] = %r' % rec2)
kid.dayend_check('D2后')

# ============ 阶段 E：6 岁视角文本量审计（纯 DOM） ============
audit = kid.ev("""() => {
  const gs = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontSize : null; };
  return {
    chip_text: (document.querySelector('#prompt-chip')||{}).innerText || null,
    fnum_px: gs('#prompt-chip .fnum'), cardnum_px: gs('.cardbtn .cv'),
    opsign_b_px: gs('.opsign b'),
    logo_title: (document.querySelector('#logo')||{}).getAttribute ? null : null };
}""")
D['text_audit'] = audit
kid.log('E 文本审计 %r' % audit)

D['pageerrors'] = kid.errors
kid.dump_data(D)
kid.log('DONE errors=%r' % kid.errors)
kid.close()
