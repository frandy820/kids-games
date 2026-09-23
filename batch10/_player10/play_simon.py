# -*- coding: utf-8 -*-
"""simon 听指令敲小鼓 · 6 岁半女孩试玩（无头独立 chromium，纯 DOM 断言）"""
import time, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common10 import Kid

kid = Kid('simon', 'simon', 'SI', seed=20)
D = {}

def quiz():
    return kid.quiz()

def wait_input(timeout=14):
    t0 = time.time()
    while time.time() - t0 < timeout:
        q = quiz()
        if q and q['phase'] == 'input': return q
        time.sleep(0.12)
    return None

def tip_text():
    return kid.ev("() => document.getElementById('tip') ? document.getElementById('tip').innerText.replace(/\\n/g,' ') : null")

# ============ 阶段 A：全新开档 · 教学关 ============
kid.open()
time.sleep(0.6)
kid.log('A 开档 tutorial=%r' % kid.tut())
kid.snap('A0_tut_start')

# 教学 watch 期乱点（小兔子演示时她就伸手敲鼓/点天空）
time.sleep(0.8)
kid.tap('.pad[data-i="0"]', '教学watch期敲鼓')
time.sleep(0.3)
st = kid.ev("() => ({tut: SI.tutorial, q: SI.quiz})")
kid.log('A watch期敲鼓后 tut=%r phase=%r pos=%r（吞输入=仍watch不推进）' % (st['tut'], (st['q'] or {}).get('phase'), (st['q'] or {}).get('pos')))
kid.tap_xy(300, 130, '天空')
D['tut_random_click'] = {'tut_after': st['tut'], 'phase': (st['q'] or {}).get('phase')}

# 等教学进入 help + input（演示重播 ~2s）
for _ in range(60):
    q = quiz()
    if kid.tut() == 'help' and q and q['phase'] == 'input': break
    time.sleep(0.2)
ghost = kid.ev("() => document.getElementById('ghost') ? document.getElementById('ghost').className : null")
kid.log('A 教学help+input 幽灵手指class=%r seq=%r' % (ghost, (quiz() or {}).get('seq')))
kid.snap('A2_tut_help')
kid.log('A 指令条=%r' % tip_text())

# 跟着手指敲（第1锤），然后自己敲第2锤
q = quiz()
kid.think(0.9, 1.3)
kid.tap('.pad[data-i="%d"]' % q['seq'][q['pos']], '教学跟指第1锤')
time.sleep(1.0)
kid.log('A 第1锤后 tutorial=%r（应solo）' % kid.tut())
q = quiz()
if q and q['phase'] == 'input' and q['pos'] < len(q['seq']):
    kid.think(0.8, 1.2)
    kid.tap('.pad[data-i="%d"]' % q['seq'][q['pos']], '第2锤')
    time.sleep(1.2)

# ============ 阶段 A2：第 1 关（1-0）真实点击通关 ============
seqs_1_0 = []
swallow_tested = False
guard = 0
while guard < 120:
    guard += 1
    q = quiz()
    if q is None:
        lv = kid.level()
        if lv and (lv.get('done') or lv.get('won')): break
        time.sleep(0.3); continue
    if q['step'] >= len(seqs_1_0):
        seqs_1_0.append({'seq': q['seq'], 'len': q['len'], 'speed': q['speed']})
        kid.log('A2 1-0 第%d题 序列=%r(长%d) 指令条=%r' % (q['step'] + 1, q['seq'], q['len'], tip_text()))
    if q['phase'] == 'watch':
        if not swallow_tested and q['step'] == 1:
            swallow_tested = True
            kid.tap('.pad[data-i="1"]', 'watch演示期忍不住敲鼓')
            time.sleep(0.25)
            q2 = quiz()
            kid.log('A2 watch期敲鼓被吞=%r phase=%r pos=%r' % (q2['phase'] == 'watch', q2['phase'], q2['pos']))
        time.sleep(0.4); continue
    # input：照记忆敲（儿童节拍 0.7-1.2s）
    kid.think(0.7, 1.2)
    kid.tap('.pad[data-i="%d"]' % q['seq'][q['pos']], '敲%d' % q['seq'][q['pos']])
    time.sleep(0.45)
D['level_1_0'] = seqs_1_0
kid.log('A2 1-0 序列记录 %s' % seqs_1_0)

stars_dom = kid.wait_celebrate('A2')
time.sleep(5.5)
rec = kid.stars_of('1-0')
D['stars_1_0'] = rec
kid.log('A2 存档 levels[1-0] = %r' % rec)
kid.log('A2 当前关 flat=%r（应自动进 1-1）' % (kid.level() or {}).get('flat'))

# ============ 阶段 B：1-1 故意敲错（重播是帮助还是挫败） ============
time.sleep(1.0)
wrong_obs = []
# 错1：先敲对第1锤，再敲错第2锤（丢已有进度最疼）
q = wait_input()
kid.log('B 1-1 第1题 seq=%r pos=0' % q['seq'])
kid.tap('.pad[data-i="%d"]' % q['seq'][0], '对第1锤')
time.sleep(0.8)
q = quiz()
wrong_pad = next(p for p in range(4) if p != q['seq'][q['pos']])
t0 = time.time()
kid.tap('.pad[data-i="%d"]' % wrong_pad, '敲错第2锤')
time.sleep(0.5)
q2 = quiz()
kid.log('B 敲错后 立即 phase=%r pos=%r miss=%r' % (q2['phase'], q2['pos'], q2['miss']))
# 等重播完回到 input，计时
q3 = wait_input(12)
replay_s = round(time.time() - t0, 1) if q3 else None
kid.log('B 重播耗时≈%ss 回到input pos=%r（pos清零=%r）miss=%r' % (replay_s, (q3 or {}).get('pos'), (q3 or {}).get('pos') == 0, (q3 or {}).get('miss')))
kid.snap('B_replay')
wrong_obs.append({'n': 1, 'miss': (q3 or {}).get('miss'), 'pos_reset': (q3 or {}).get('pos') == 0, 'replay_s': replay_s})
# 补完整题
for _ in range(8):
    q = quiz()
    if not q or q['step'] != 0: break
    if q['phase'] == 'input':
        kid.think(0.7, 1.0)
        kid.tap('.pad[data-i="%d"]' % q['seq'][q['pos']], '补敲')
        time.sleep(0.45)
    else:
        time.sleep(0.3)
# 错2：第2题开局直接敲错
q = quiz()
_g = 0
while not (q and q['step'] == 1 and q['phase'] == 'input') and _g < 80:
    time.sleep(0.3); q = quiz(); _g += 1
kid.log('B 1-1 第2题 seq=%r' % q['seq'])
t0 = time.time()
wrong_pad = next(p for p in range(4) if p != q['seq'][0])
kid.tap('.pad[data-i="%d"]' % wrong_pad, '开局敲错')
q2 = wait_input(12)
wrong_obs.append({'n': 2, 'miss': (q2 or {}).get('miss'), 'replay_s': round(time.time() - t0, 1)})
kid.log('B 第2题敲错后 miss=%r 重播≈%ss' % ((q2 or {}).get('miss'), wrong_obs[-1]['replay_s']))
# 错3：第3题敲对1锤后敲错（再验 pos 清零）
q = quiz()
_g = 0
while not (q and q['step'] == 2 and q['phase'] == 'input') and _g < 80:
    time.sleep(0.3); q = quiz(); _g += 1
kid.log('B 1-1 第3题 seq=%r' % q['seq'])
kid.tap('.pad[data-i="%d"]' % q['seq'][0], '对第1锤')
time.sleep(0.7)
q = quiz()
wrong_pad = next(p for p in range(4) if p != q['seq'][q['pos']])
kid.tap('.pad[data-i="%d"]' % wrong_pad, '敲错')
q3 = wait_input(12)
wrong_obs.append({'n': 3, 'miss': (q3 or {}).get('miss'), 'pos_reset': (q3 or {}).get('pos') == 0})
kid.log('B 第3题敲错后 miss=%r pos=%r（3次错未卡死）' % ((q3 or {}).get('miss'), (q3 or {}).get('pos')))
D['wrong_obs_1_1'] = wrong_obs
# 补完第3题离开
for _ in range(8):
    q = quiz()
    if not q or q['step'] != 2: break
    if q['phase'] == 'input':
        kid.think(0.6, 0.9)
        kid.tap('.pad[data-i="%d"]' % q['seq'][q['pos']], '补敲')
        time.sleep(0.4)
    else:
        time.sleep(0.3)

# ============ 阶段 C：静置救援（input期先敲对1锤再发呆） ============
q = quiz()
_g = 0
while not (q and q['step'] == 3 and q['phase'] == 'input') and _g < 80:
    time.sleep(0.3); q = quiz(); _g += 1
kid.log('C 第4题 seq=%r 先敲对第1锤再发呆' % q['seq'])
kid.tap('.pad[data-i="%d"]' % q['seq'][0], '对第1锤')
time.sleep(0.6)
t0 = time.time(); rescue = {'at_s': None, 'lit_seen': None, 'phase flips': []}
last_phase = 'input'; last_r = 0
while time.time() - t0 < 20:
    st = kid.ev("() => ({r: SI.rescues, q: SI.quiz, lit: [...document.querySelectorAll('.pad.lit')].map(p=>p.dataset.i)})")
    el = time.time() - t0
    if st:
        if st['r'] != last_r:
            rescue['at_s'] = round(el, 1); last_r = st['r']
            kid.log('C ★救援触发 @%.1fs rescues=%r phase=%r pos=%r' % (el, st['r'], (st['q'] or {}).get('phase'), (st['q'] or {}).get('pos')))
        ph = (st['q'] or {}).get('phase')
        if ph != last_phase:
            rescue['phase flips'].append((round(el, 1), ph)); last_phase = ph
            kid.log('C phase→%r @%.1fs' % (ph, el))
        if st['lit'] and rescue['lit_seen'] is None:
            rescue['lit_seen'] = round(el, 1)
            kid.log('C ★鼓面亮起(序列视觉重现) @%.1fs lit=%r' % (el, st['lit']))
            kid.snap('C_rescue_replay')
    time.sleep(0.1)
D['rescue_idle'] = rescue
kid.log('C 静置结束 rescue=%r' % rescue)
# 敲完这题验证 pos 保留
q = quiz()
if q and q['phase'] == 'input':
    kid.log('C 救援后 pos=%r（保留已敲进度=%r）' % (q['pos'], q['pos'] == 1))

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

seqs_2_0 = []
did_wrong = False
guard = 0
while guard < 160:
    guard += 1
    q = quiz()
    if q is None:
        lv = kid.level()
        if lv and (lv.get('done') or lv.get('won')): break
        time.sleep(0.3); continue
    if q['step'] >= len(seqs_2_0):
        seqs_2_0.append({'seq': q['seq'], 'len': q['len'], 'speed': q['speed']})
        kid.log('D2 2-0 第%d题 序列=%r 长=%d（第2章=3步记忆）' % (q['step'] + 1, q['seq'], q['len']))
    if q['phase'] == 'watch':
        time.sleep(0.4); continue
    # 第2题：敲对2锤后敲错1次（3步记忆丢进度最典型）
    if q['step'] == 1 and q['pos'] == 2 and not did_wrong:
        did_wrong = True
        wrong_pad = next(p for p in range(4) if p != q['seq'][q['pos']])
        kid.tap('.pad[data-i="%d"]' % wrong_pad, 'ch2记错第3步')
        time.sleep(0.6)
        q2 = quiz()
        kid.log('D2 ch2 敲错后 pos=%r（已敲对2锤全清零）miss=%r 重播重来' % ((q2 or {}).get('pos'), (q2 or {}).get('miss')))
        kid.snap('D2_wrong_reset')
        continue
    kid.think(0.8, 1.3)
    kid.tap('.pad[data-i="%d"]' % q['seq'][q['pos']], '敲%d' % q['seq'][q['pos']])
    time.sleep(0.45)
D['level_2_0'] = seqs_2_0
D['len_compare'] = {'ch1': [s['len'] for s in seqs_1_0], 'ch2': [s['len'] for s in seqs_2_0]}

stars2 = kid.wait_celebrate('D2')
time.sleep(5.5)
rec2 = kid.stars_of('2-0')
D['stars_2_0'] = rec2
kid.log('D2 存档 levels[2-0] = %r' % rec2)
kid.dayend_check('D2后')

audit = kid.ev("""() => {
  const gs = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontSize : null; };
  const pad = document.querySelector('.pad');
  const r = pad ? pad.getBoundingClientRect() : null;
  return { tip: document.getElementById('tip') ? document.getElementById('tip').innerText.replace(/\\n/g,' ') : null,
           pad_px: r ? Math.round(r.width) + 'x' + Math.round(r.height) : null, pad_fs: gs('.pad') };
}""")
D['text_audit'] = audit
kid.log('E 审计 %r' % audit)
D['pageerrors'] = kid.errors
kid.dump_data(D)
kid.log('DONE errors=%r' % kid.errors)
kid.close()
