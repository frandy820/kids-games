# -*- coding: utf-8 -*-
"""habit 好习惯排序 · 6 岁半女孩试玩（无头独立 chromium，纯 DOM 断言）"""
import time, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common10 import Kid

kid = Kid('habit', 'habit', 'HB', seed=30)
D = {}

def quiz():
    return kid.quiz()

def cards_text():
    return kid.ev("""() => [...document.querySelectorAll('#board .card')].map(c =>
        (c.dataset.i) + ':' + c.innerText.replace(/\\n/g,'|') + (c.className.includes('gone') ? '(gone)' : ''))""")

def prompt_text():
    return kid.ev("() => document.getElementById('prompt-chip') ? document.getElementById('prompt-chip').innerText : null")

# ============ 阶段 A：全新开档 · 教学关 ============
kid.open()
time.sleep(0.6)
kid.log('A 开档 tutorial=%r 题面=%r' % (kid.tut(), prompt_text()))
kid.snap('A0_tut_start')

# 教学 watch 期乱点：天空 / 错误步骤卡 / 兔子
time.sleep(0.5); kid.tap_xy(300, 130, '天空')
kid.log('A 乱点天空后 tutorial=%r' % kid.tut())
q = quiz()
if q:
    wi = next((i for i in range(len(q['shown'])) if i != q['answerIdx']), 0)
    kid.tap('.card[data-i="%d"]' % wi, '教学期点错误步骤卡')
    time.sleep(0.35)
    q2 = quiz()
    kid.log('A 乱点错误卡后 tutorial=%r pos=%r miss=%r（应仍watch/0/0）' % (kid.tut(), q2['pos'], q2['miss']))
kid.tap('#btn-rabbit', '教学期点兔子')
time.sleep(0.3)
D['tut_random_click'] = {'tut_after': kid.tut()}

for _ in range(40):
    if kid.tut() == 'help': break
    time.sleep(0.25)
ghost = kid.ev("() => document.getElementById('ghost') ? document.getElementById('ghost').className : null")
kid.log('A 教学进入 help 幽灵手指class=%r' % ghost)
kid.snap('A2_tut_help')

# 跟指点对（教学首答→solo）
q = quiz()
kid.think(1.1, 1.6)
kid.tap('.card[data-i="%d"]' % q['answerIdx'], '教学跟指')
time.sleep(1.6)
kid.log('A 教学首答后 tutorial=%r（应solo）' % kid.tut())

# ============ 阶段 A2：第 1 关（1-0）真实点击通关 ============
qs_1_0 = []
guard = 0
while guard < 200:
    guard += 1
    q = quiz()
    if q is None:
        lv = kid.level()
        if lv and (lv.get('done') or lv.get('won')): break
        time.sleep(0.4); continue
    if q['step'] >= len(qs_1_0):
        qs_1_0.append({'hid': q['hid'], 'name': q['name'], 'steps': len(q['steps'])})
        kid.log('A2 1-0 第%d题 流程=%r(%s) %d步 卡=%s' % (q['step'] + 1, q['name'], q['hid'], len(q['steps']), cards_text()))
        if q['step'] == 0: D['prompt_1_0'] = prompt_text()
    kid.think(1.0, 1.9)
    ok = kid.tap('.card[data-i="%d"]' % q['answerIdx'], '应点卡')
    time.sleep(1.1)
D['level_1_0'] = qs_1_0
kid.log('A2 1-0 流程记录 %s' % qs_1_0)

stars_dom = kid.wait_celebrate('A2')
time.sleep(5.5)
rec = kid.stars_of('1-0')
D['stars_1_0'] = rec
kid.log('A2 存档 levels[1-0] = %r' % rec)
kid.log('A2 当前关 flat=%r（应自动进 1-1）' % (kid.level() or {}).get('flat'))

# ============ 阶段 B：1-1 故意点错 ============
time.sleep(1.0)
q = quiz()
kid.log('B 1-1 第1题 流程=%r 卡=%s' % (q['name'], cards_text()))
wrong_obs = []
# 错1
wi = next(i for i in range(len(q['shown'])) if i != q['answerIdx'])
kid.think(1.0, 1.4); kid.tap('.card[data-i="%d"]' % wi, '错1')
time.sleep(0.8)
q2 = quiz()
cls = kid.ev('(i) => document.querySelector(\'.card[data-i="\'+i+\'"\') ? document.querySelector(\'.card[data-i="\'+i+\'"\').className : null', wi)
okc = q2['answerIdx']
ok_cls = kid.ev('(i) => document.querySelector(\'.card[data-i="\'+i+\'"\') ? document.querySelector(\'.card[data-i="\'+i+\'"\').className : null', okc)
wrong_obs.append({'n': 1, 'miss': q2['miss'], 'wrong_cls': cls, 'answer_cls': ok_cls})
kid.log('B 错1后 miss=%r 错卡class=%r 应点卡class=%r（首错不pulse）' % (q2['miss'], cls, ok_cls))
# 错2（换一张错卡）
q2 = quiz()
wi2 = next(i for i in range(len(q2['shown'])) if i not in (q2['answerIdx'], wi))
kid.tap('.card[data-i="%d"]' % wi2, '错2')
time.sleep(0.8)
q3 = quiz(); okc3 = q3['answerIdx']
ok_cls3 = kid.ev('(i) => document.querySelector(\'.card[data-i="\'+i+\'"\') ? document.querySelector(\'.card[data-i="\'+i+\'"\').className : null', okc3)
wrong_obs.append({'n': 2, 'miss': q3['miss'], 'answer_cls': ok_cls3})
kid.log('B 错2后 miss=%r 应点卡class=%r（breathe=高亮提示）' % (q3['miss'], ok_cls3))
kid.snap('B2_wrong2_breathe')
# 错3：第三张错卡（不灰化应仍可点、不卡死）
q3 = quiz()
wi3 = next((i for i in range(len(q3['shown'])) if i not in (q3['answerIdx'], wi, wi2)), None)
if wi3 is not None:
    kid.tap('.card[data-i="%d"]' % wi3, '错3')
    time.sleep(0.8)
    q4 = quiz()
    wrong_obs.append({'n': 3, 'miss': q4['miss']})
    kid.log('B 错3后 miss=%r（不灰化不卡死，可无限重点）' % q4['miss'])
# 自我纠正：点应点卡
kid.think(1.0, 1.5)
q = quiz()
kid.tap('.card[data-i="%d"]' % q['answerIdx'], '纠正')
time.sleep(1.1)
q = quiz()
kid.log('B 纠正后 pos=%r step=%r（推进）' % (q['pos'], q['step']))
D['wrong_obs_1_1'] = wrong_obs
# 补完本题剩余步骤
for _ in range(10):
    q = quiz()
    if not q or q['step'] != 0: break
    kid.think(0.9, 1.5)
    kid.tap('.card[data-i="%d"]' % q['answerIdx'], '补步骤')
    time.sleep(1.1)

# ============ 阶段 C：静置救援（第2题中途） ============
q = quiz()
kid.log('C 静置前 流程=%r pos=%r' % (q['name'], q['pos']))
t0 = time.time(); rescue = {'first_pulse_s': None}
while time.time() - t0 < 20:
    st = kid.ev("""() => { const q = HB.quiz; if (!q) return null;
        const el = document.querySelector('.card[data-i="'+q.answerIdx+'"]');
        return {pos: q.pos, step: q.step, cls: el ? el.className : null}; }""")
    el = time.time() - t0
    if st and st['cls'] and 'pulse' in st['cls'] and rescue['first_pulse_s'] is None:
        rescue['first_pulse_s'] = round(el, 1)
        kid.log('C ★救援视觉出现 @%.1fs 应点卡class=%r pos未推进=%r' % (el, st['cls'], st['pos']))
        kid.snap('C_rescue_pulse')
    time.sleep(0.5)
D['rescue_idle'] = rescue
kid.log('C 静置结束 first_pulse=%r' % rescue['first_pulse_s'])

# ============ 阶段 D1：字面 seed n=6 ============
n = kid.seed(6)
kid.log('D1 seed n=6 关数=%r reload' % n)
kid.reload(); time.sleep(1.5)
lv = kid.level(); cnt, txt = kid.dayend_check('D1')
kid.log('D1 n=6 重开后 flat=%r ch=%r dayend=%r' % (lv.get('flat'), lv.get('ch'), cnt))
kid.snap('D1_dayend_n6')
D['seed_n6'] = {'flat': lv.get('flat'), 'ch': lv.get('ch'), 'dayend': cnt, 'dayend_text': txt}

# ============ 阶段 D2：seed n=5 → 第 2 章玩 1 关 ============
kid.ev("() => { const sv = KIDS._save(); sv.levels = {}; KIDS.store.persist(); return 0; }")   # 防 n=6 残留叠加
kid.seed(5)
kid.reload(); time.sleep(1.5)
lv = kid.level()
kid.log('D2 seed n=5 重开后 flat=%r ch=%r lv=%r' % (lv.get('flat'), lv.get('ch'), lv.get('lv')))
kid.dayend_check('D2')
kid.snap('D2_ch2_start')

qs_2_0 = []
did_wrong = False
guard = 0
while guard < 200:
    guard += 1
    q = quiz()
    if q is None:
        lv = kid.level()
        if lv and (lv.get('done') or lv.get('won')): break
        time.sleep(0.4); continue
    if q['step'] >= len(qs_2_0):
        qs_2_0.append({'hid': q['hid'], 'name': q['name'], 'steps': len(q['steps'])})
        kid.log('D2 2-0 第%d题 流程=%r(%s) %d步 卡=%s 题面=%r' % (q['step'] + 1, q['name'], q['hid'], len(q['steps']), cards_text(), prompt_text()))
    if q['step'] == 1 and not did_wrong and q['pos'] == 0:
        did_wrong = True
        wi = next(i for i in range(len(q['shown'])) if i != q['answerIdx'])
        kid.think(1.2, 1.6); kid.tap('.card[data-i="%d"]' % wi, 'ch2故意错')
        time.sleep(0.8)
        q2 = quiz()
        kid.log('D2 ch2 错1次后 miss=%r 应点卡class=%r' % (q2['miss'],
            kid.ev('(i) => document.querySelector(\'.card[data-i="\'+i+\'"\') ? document.querySelector(\'.card[data-i="\'+i+\'"\').className : null', q2['answerIdx'])))
        continue
    kid.think(1.0, 1.9)
    kid.tap('.card[data-i="%d"]' % q['answerIdx'], '应点卡')
    time.sleep(1.1)
D['level_2_0'] = qs_2_0
D['steps_compare'] = {'ch1': [x['steps'] for x in qs_1_0], 'ch2': [x['steps'] for x in qs_2_0],
                      'ch1_hids': [x['hid'] for x in qs_1_0], 'ch2_hids': [x['hid'] for x in qs_2_0]}

stars2 = kid.wait_celebrate('D2')
time.sleep(5.5)
rec2 = kid.stars_of('2-0')
D['stars_2_0'] = rec2
kid.log('D2 存档 levels[2-0] = %r' % rec2)
kid.dayend_check('D2后')

audit = kid.ev("""() => {
  const gs = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontSize : null; };
  return { prompt: document.getElementById('prompt-chip') ? document.getElementById('prompt-chip').innerText : null,
           p_name_px: gs('#prompt-chip .p-name'), c_word_px: gs('.card .c-word'), c_emoji_px: gs('.card .c-emoji') };
}""")
D['text_audit'] = audit
kid.log('E 审计 %r' % audit)
D['pageerrors'] = kid.errors
kid.dump_data(D)
kid.log('DONE errors=%r' % kid.errors)
kid.close()
