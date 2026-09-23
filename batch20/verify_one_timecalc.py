# -*- coding: utf-8 -*-
"""timecalc 独立复验（SPEC-BATCH20 §1+§0.43 分源·r16 难度改造）——断言从 SPEC 推导，禁从实现行为归纳
T1 确定性（flat 0/12/27/39 双读全量 JSON 对比）
T2 章约束（r16 四章：ch1 clock5 认刻梯度+elapse 不越上午界 / ch2 plus·minus·span k%3 轮换 /
   ch3 comp·compd·night k%3 轮换（compd today∈{5,6,0} 跨日跨周域）/ ch4 sched 三问型 k%3）
T3 Python 独立计算器（分源第三实现）：clock5/elapse 分钟制 / plus=(today+plus)%7 /
   minus=(today-back)%7 环回 / span=(to-from)%7 / comp 下午终点 / compd 跨夜次日 12:mm2+星期环回 /
   night=12-h1+h2 / sched dur·find·long —— opts[answer].v 全对账
T4 钟面指针角度独立对账（抽 20 面：.hand-h rotate==hour%12*30+min*0.5 / .hand-m==min*6·5 刻全域）
T5 干扰合法（∉answer 且为合法星期名/5 刻时刻/下午时刻/跨日组合卡/小时/分钟/天数/活动名——禁「星期八」）
T6 引擎直驱：错选=miss 恰一次+防重入窗内拒绝+重选对推进（零惩罚）
T7 选项文本互异 / T8 0 pageerror
T9 时长模型 Python 第三源：estMs=len(ask)*345+600；voiceWin=400+estMs+300 ≤ DECIDE[kind]；
   quizDur=max(voiceWin,DECIDE)+1500+880；40 关 modeled 最低===91040@flat0（双钉防回漂）
T10 sched 行唯一解 Python 独立审计：dur 干扰≠任何行真值 / find 问刻属恰一行 / long 严格唯一最大
T11 生成关抽样（flat40-44）：确定性+章池型数（ch1 ≥2 余 ≥3）+扩档参数域
纪律：tapOpt async——evaluate 侧 await promise（b19 实锤）；先等 title=VERIFY PASS（b17）；
      title 断言 startswith（r14 坑②——单元数后缀）。
"""
import json, os, re, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(os.path.abspath(__file__))
# 声音纪律①（r16 收口）：底层通道接管（--mute-audio 对 chrome-headless-shell 无效）
INIT_SND = '''(() => {
  if (window.__sndStubbed) return; window.__sndStubbed = 1;
  try { if (window.speechSynthesis) { speechSynthesis.speak = function () {};
    speechSynthesis.cancel = function () {}; } } catch (e) {}
  try { window.Audio = function () { return { play: function () { return Promise.resolve(); },
    pause: function () {}, load: function () {}, canPlayType: function () { return ''; },
    volume: 0, muted: true, autoplay: false }; }; } catch (e) {}
  try { var AC0 = window.AudioContext || window.webkitAudioContext;
    if (AC0) { var fac = function () { return {
      resume: function () { return Promise.resolve(); },
      close: function () { return Promise.resolve(); }, state: 'running', currentTime: 0,
      destination: {},
      createOscillator: function () { return { frequency: { value: 0, setValueAtTime: function () {} },
        connect: function () {}, start: function () {}, stop: function () {} }; },
      createGain: function () { return { gain: { value: 0, setValueAtTime: function () {},
        linearRampToValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} },
        connect: function () {} }; } }; };
      window.AudioContext = fac; window.webkitAudioContext = fac; } } catch (e) {}
})();'''

URL = 'file:///' + os.path.join(BASE, 'timecalc', 'index.html').replace('\\', '/') + '?verify=1'
WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
M5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
ACTS = ['起床', '早读', '做操', '吃早饭', '游戏', '学习', '画画', '户外活动', '听故事', '午休']
DECIDE = {  # r16 定版（与 data 源分源双写）
    'clock5': 9000, 'elapse': 14000, 'plus': 11000, 'minus': 12000, 'span': 13000,
    'comp': 15000, 'compd': 19000, 'night': 15000,
    'sched_dur': 16000, 'sched_find': 12000, 'sched_long': 13000,
}
ENTER_MS, TAIL_MS, TAP_MS, ADV_MS = 400, 300, 1500, 880

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok), note))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

def fmt_time(h, m):
    return '%d:%02d' % (h, m)                    # 实现口径=5 刻时刻卡 '7:05'（分钟两位）

def decide_key(q):
    return 'sched_' + q['stype'] if q['kind'] == 'sched' else q['kind']

def legal_val(kind, stype, v):
    if kind in ('plus', 'minus'):
        return v in WEEK
    if kind == 'span':
        return re.fullmatch(r'[1-6] 天', v) is not None
    if kind in ('clock5', 'elapse'):
        return re.fullmatch(r'(1[0-2]|[1-9]):[0-5][05]', v) is not None
    if kind == 'comp':
        return re.fullmatch(r'下午(1[0-2]|[1-9]):[0-5][05]', v) is not None
    if kind == 'compd':
        return re.fullmatch(r'星期[日一二三四五六] 12:[0-5][05]', v) is not None
    if kind == 'night':
        return re.fullmatch(r'(1[0-2]|[1-9]) 小时', v) is not None
    if stype == 'dur':
        return re.fullmatch(r'([1-9]|[1-4][0-9]|50) 分钟', v) is not None
    return v in ACTS

def ref_answer(q):                               # Python 独立计算器（分源）
    k = q['kind']
    if k == 'clock5':
        return fmt_time(q['hour'], q['minute'])
    if k == 'elapse':
        t = q['hour'] * 60 + q['minute'] + q['dur']
        return fmt_time(t // 60, t % 60)
    if k == 'plus':
        return WEEK[(q['today'] + q['plus']) % 7]
    if k == 'minus':
        return WEEK[(q['today'] - q['back']) % 7]
    if k == 'span':
        d = (q['to'] - q['from']) % 7
        return '%d 天' % (d if d else 7)
    if k == 'comp':
        t = q['hour'] * 60 + q['minute'] + q['dur']
        return '下午' + fmt_time(t // 60, t % 60)
    if k == 'compd':
        d2 = (q['today'] + 1) % 7
        return '%s %s' % (WEEK[d2], fmt_time(12, q['minute'] + q['dur'] - 60))
    if k == 'night':
        return '%d 小时' % (12 - q['startH'] + q['endH'])
    r = q['table'][q['askRow']]
    if q['stype'] == 'dur':
        return '%d 分钟' % ((r['eh'] * 60 + r['em']) - (r['sh'] * 60 + r['sm']))
    return r['name']

def sched_unique_ok(q):                          # T10 Python 独立唯一解审计
    lens = [(r['eh'] * 60 + r['em']) - (r['sh'] * 60 + r['sm']) for r in q['table']]
    if q['stype'] == 'dur':
        for i, o in enumerate(q['opts']):
            if i == q['answer']:
                continue
            n = int(o['v'].replace(' 分钟', ''))
            if n in lens:                        # 干扰≠任何行真值（防看错行也"对"）
                return False
        return q['opts'][q['answer']]['v'] == '%d 分钟' % lens[q['askRow']]
    if q['stype'] == 'find':
        r = q['table'][q['askRow']]
        t = r['sh'] * 60 + r['sm']
        cnt = sum(1 for w in q['table'] if w['sh'] * 60 + w['sm'] == t)
        return cnt == 1 and q['opts'][q['answer']]['v'] == r['name']
    mx = max(lens)
    return lens.count(mx) == 1 and q['opts'][q['answer']]['v'] == q['table'][lens.index(mx)]['name']

with sync_playwright() as p:
    b = p.chromium.launch(args=['--mute-audio'])
    pg = b.new_page()
    pg.add_init_script(INIT_SND)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    for _ in range(360):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('T0 selftest 全绿+0 pageerror', pg.title().startswith('VERIFY PASS') and not errs, pg.title())

    def read_quiz():
        return pg.evaluate("TC.quiz")

    def level_state():
        return pg.evaluate("() => TC.currentLevel ? {done:TC.currentLevel.done, step:TC.currentLevel.step, locked:TC.currentLevel.locked} : null")

    def tap(i):
        return pg.evaluate("(i) => (async () => { try { const r = await TC.tapOpt(i); return r !== false && r != null } catch(e){ return false } })()", i)

    def wait_playable():
        for _ in range(300):
            q = read_quiz()
            st = level_state()
            if q and st and not st['locked']:
                return q
            pg.wait_for_timeout(30)
        return None

    def pick_right(q):
        return tap(q['answer'])

    # ---- 全量审计：40 关 × 8 题（r16）+ 生成关 5 关 ----
    all_levels = {}
    ch_fail, calc_fail, dis_fail, dup_fail, uniq_fail, dur_fail = [], [], [], [], [], []
    c3 = 0
    for flat in range(45):
        pg.evaluate("(f) => TC.start(f)", flat)
        qs = []
        ext = flat >= 40
        for k in range(8):
            q = wait_playable()
            if not q:
                chk('T-start flat%d q%d' % (flat, k), False)
                break
            qs.append(q)
            dch = flat // 10 + 1 if flat < 40 else None
            gen_dch = pg.evaluate('TC.currentLevel.dch') if ext else dch
            bad = []
            if not ext:
                if dch == 1:
                    if q['kind'] not in ('clock5', 'elapse'): bad.append('kind=%s' % q['kind'])
                    if flat % 10 < 2 and q['kind'] != 'clock5': bad.append('grad')
                    if q['kind'] == 'elapse' and q['hour'] * 60 + q['minute'] + q['dur'] > 715:
                        bad.append('elapse-over')
                elif dch == 2:
                    if q['kind'] not in ('plus', 'minus', 'span'): bad.append('kind=%s' % q['kind'])
                    if q['kind'] != ['plus', 'minus', 'span'][k % 3]: bad.append('rot')
                    if q['kind'] == 'plus' and not (2 <= q['plus'] <= 4): bad.append('plus=%s' % q['plus'])
                    if q['kind'] == 'minus' and not (2 <= (q['back'] or 0) <= 4): bad.append('back')
                    if q['kind'] == 'span' and not (2 <= (q.get('days') or 0) <= 4): bad.append('days')
                elif dch == 3:
                    if q['kind'] not in ('comp', 'compd', 'night'): bad.append('kind=%s' % q['kind'])
                    if q['kind'] != ['comp', 'compd', 'night'][k % 3]: bad.append('rot')
                    if q['kind'] == 'compd' and q['today'] not in (0, 5, 6): bad.append('today=%s' % q['today'])
                    if q['kind'] == 'compd' and not (20 <= q['dur'] <= 55 and q['dur'] % 5 == 0 and q['minute'] >= 10): bad.append('compd-dom')
                    if q['kind'] == 'night' and not (8 <= q['startH'] <= 10 and 6 <= q['endH'] <= 8): bad.append('night')
                else:
                    if q['kind'] != 'sched': bad.append('kind=%s' % q['kind'])
                    if q['stype'] != ['dur', 'find', 'long'][k % 3]: bad.append('stype=%s' % q['stype'])
                    if len(q['table']) != 4: bad.append('rows=%d' % len(q['table']))
            else:
                if not (1 <= gen_dch <= 4): bad.append('dch=%s' % gen_dch)
                if gen_dch == 4 and len(q['table']) != 5: bad.append('gen rows=%d' % len(q['table']))
                if q['kind'] == 'sched' and len(q['table']) != (5 if gen_dch == 4 else 4):
                    bad.append('rows')
            if bad:
                ch_fail.append((flat, k, bad))
            else:
                c3 += 1
            # T3 Python 独立计算器对账（分源核心·9 型）
            av = q['opts'][q['answer']]['v']
            want = ref_answer(q)
            if av != want:
                calc_fail.append((flat, k, q['kind'], av, want))
            # T5 干扰合法 + T7 互异
            for i, o in enumerate(q['opts']):
                if i == q['answer']:
                    continue
                if o['v'] == av or not legal_val(q['kind'], q.get('stype'), o['v']):
                    dis_fail.append((flat, k, q['kind'], o['v']))
            vs = [o['v'] for o in q['opts']]
            if len(set(vs)) != len(vs):
                dup_fail.append((flat, k, vs))
            # T10 sched 唯一解
            if q['kind'] == 'sched' and not sched_unique_ok(q):
                uniq_fail.append((flat, k, q['stype'], str(q['table'])[:80]))
            # T9 时长 Python 第三源（ask=TC 暴露的题面朗读句）
            est = len(q['ask']) * 345 + 600
            vw = ENTER_MS + est + TAIL_MS
            dk = decide_key(q)
            if vw > DECIDE[dk]:
                dur_fail.append((flat, k, q['kind'], 'voiceWin=%d>DECIDE=%d' % (vw, DECIDE[dk])))
            # 推进
            if k < 7:
                if not pick_right(q):
                    chk('T-推进 flat%d q%d 选卡失败' % (flat, k), False)
                    break
                adv = False
                for _ in range(300):
                    st = level_state()
                    if st and st['step'] == k + 1:
                        adv = True
                        break
                    pg.wait_for_timeout(30)
                if not adv:
                    chk('T-推进 flat%d q%d 未换题' % (flat, k), False)
                    break
        all_levels[flat] = qs
    chk('T2 章约束（40 关×8+生成 5×8=360 题）', not ch_fail and c3 == 360, 'c3=%d %s' % (c3, ch_fail[:3]))
    chk('T3 Python 独立计算器对账（9 型 360 题）', not calc_fail, str(calc_fail[:3]))
    chk('T5 干扰合法且 ∉ answer（360 题）', not dis_fail, str(dis_fail[:3]))
    chk('T7 选项文本互异（360 题）', not dup_fail, str(dup_fail[:2]))
    chk('T10 sched 行唯一解（Python 独立审计）', not uniq_fail, str(uniq_fail[:2]))

    # ---- T9b 40+5 关 modeled 最低精确断言（Python 第三源双钉） ----
    dur_min, dur_flat = None, None
    for flat in range(45):
        total_ms = 0
        for q in all_levels.get(flat, []):
            est = len(q['ask']) * 345 + 600
            vw = ENTER_MS + est + TAIL_MS
            total_ms += max(vw, DECIDE[decide_key(q)]) + TAP_MS + ADV_MS
        if flat < 40 and (dur_min is None or total_ms < dur_min):
            dur_min, dur_flat = total_ms, flat
    chk('T9 时长模型：voiceWin≤DECIDE 全域 + modeled 最低===91040@flat0（≥40000）',
        not dur_fail and dur_min == 91040 and dur_flat == 0,
        'min=%s@flat%s fails=%s' % (dur_min, dur_flat, dur_fail[:2]))

    # ---- T11 生成关确定性+章池型数 ----
    gen_bad = []
    for flat in range(40, 45):
        kinds_seen = set(x['kind'] for x in all_levels.get(flat, []))
        dch = pg.evaluate('genLevel(%d).dch' % flat)
        if dch == 1 and len(kinds_seen) < 2: gen_bad.append((flat, 'kinds<2', kinds_seen))
        if 2 <= dch <= 3 and len(kinds_seen) < 3: gen_bad.append((flat, 'kinds<3', kinds_seen))
        if dch == 4:
            sts = set(x['stype'] for x in all_levels.get(flat, []))
            if len(sts) < 3: gen_bad.append((flat, 'stypes<3', sts))
    chk('T11 生成关抽样（确定性+章池型数 ch1≥2/ch2-4≥3）', not gen_bad, str(gen_bad[:2]))

    # ---- T4 钟面角度：抽 20 面独立对账（5 分钟刻全域） ----
    ang_fail = []
    seen = 0
    m5_seen = set()
    for flat in range(0, 4):
        pg.evaluate("(f) => TC.start(f)", flat)
        for k in range(8):
            q = wait_playable()
            if not q or q['kind'] != 'clock5':
                continue
            if seen >= 20:
                break
            seen += 1
            m5_seen.add(q['minute'])
            r = pg.evaluate("""() => {
              const hh = document.querySelector('.hand-h'), hm = document.querySelector('.hand-m');
              const p = s => { const m = /rotate\\((-?[\\d.]+) /.exec(s || ''); return m ? parseFloat(m[1]) : null };
              return { h: hh ? p(hh.getAttribute('transform')) : null, m: hm ? p(hm.getAttribute('transform')) : null };
            }""")
            want_h = (q['hour'] % 12) * 30 + q['minute'] * 0.5
            want_m = q['minute'] * 6
            if r['h'] is None or abs(r['h'] - want_h) > 0.01 or r['m'] is None or abs(r['m'] - want_m) > 0.01:
                ang_fail.append((flat, k, r, want_h, want_m))
            if k < 7:
                pick_right(q)
                for _ in range(300):
                    st = level_state()
                    if st and st['step'] == k + 1:
                        break
                    pg.wait_for_timeout(30)
        if seen >= 20:
            break
    chk('T4 钟面指针角度独立对账（%d 面·5 刻全域）' % seen,
        seen >= 15 and not ang_fail and len(m5_seen) >= 6,
        'fail=%s m5=%s' % (ang_fail[:2], sorted(m5_seen)))

    # ---- T1 确定性：抽 4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate("(f) => TC.start(f)", flat)
        qs2 = []
        for k in range(8):
            q = wait_playable()
            if not q:
                diff.append((flat, k, '不可玩'))
                break
            qs2.append(q)
            if k < 7:
                if not pick_right(q):
                    diff.append((flat, k, '选卡失败'))
                    break
                for _ in range(300):
                    st = level_state()
                    if st and st['step'] == k + 1:
                        break
                    pg.wait_for_timeout(30)
        if [json.dumps(x, sort_keys=True) for x in qs2] != [json.dumps(x, sort_keys=True) for x in all_levels.get(flat, [])]:
            diff.append((flat, '双读不一致'))
    chk('T1 确定性（flat 0/12/27/39 双读一致）', not diff, str(diff[:3]))

    # ---- T6 引擎直驱：错选 → miss 恰一次 + 防重入窗内拒绝 + 重选推进 ----
    pg.evaluate("(f) => TC.start(f)", 0)
    q0 = wait_playable()
    wrong_i = next((i for i in range(len(q0['opts'])) if i != q0['answer']), None)
    ok6, notes6 = True, []
    if wrong_i is not None:
        pg.evaluate("(i) => (async () => { await TC.tapOpt(i) })()", wrong_i)   # await 完成=错分支+窗（120ms）全走完
        q1 = read_quiz()
        if not (q1 and q1['miss'] == 1):
            ok6 = False; notes6.append('miss!=1 got %s' % (q1 and q1['miss']))
        adv = False
        for _ in range(60):
            st = level_state()
            if st and not st['locked']:
                adv = True
                break
            pg.wait_for_timeout(50)
        if not adv:
            ok6 = False; notes6.append('防重入窗未解锁')
        elif tap(q0['answer']):
            adv2 = False
            for _ in range(300):
                st = level_state()
                if st and st['step'] == 1:
                    adv2 = True
                    break
                pg.wait_for_timeout(30)
            if not adv2:
                ok6 = False; notes6.append('重选后未推进')
        else:
            ok6 = False; notes6.append('重选答对卡被拒')
    chk('T6 错选=miss 恰一次+零惩罚重选推进', ok6, ';'.join(notes6))

    # ---- T12 存档迁移/守卫双例（审查 T-F1/T-M1 修复行为级——SPEC §1-r16「verify 双例必测」） ----
    def seed_ls(levels, tut=True):
        pg.evaluate("""(o) => { localStorage.setItem('kidsgame_timecalc', JSON.stringify({v:'1.0',game:'timecalc',
          firstDay:'2026-09-16',lastDay:'2026-09-16',levels:o.levels,dailyMin:{},
          settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0},timecalc:{tutSeen:o.tut}})); }""",
                    {'levels': levels, 'tut': tut})
    # 例 a：生成关键 '5-0' 合法（守卫章号上界已放开）——重启不重置、不回教学
    lv1 = {'%d-%d' % (c, l): {'stars': 3} for c in range(1, 5) for l in range(10)}
    lv1['5-0'] = {'stars': 3}
    seed_ls(lv1)
    pg.reload(); pg.wait_for_timeout(1500)
    kept = pg.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_timecalc') || '{}');
      const lv = s.levels || {}; return { n: Object.keys(lv).length, five: !!lv['5-0'],
        tut: !!(s.timecalc && s.timecalc.tutSeen) }; }""")
    chk('T12a 生成关键 5-0 重启不重置（41 键+不回教学）', kept['n'] == 41 and kept['five'] and kept['tut'], str(kept))
    # 例 b：v1 旧基档（分母 5：1-0..1-4+2-0 = v1 flat0-5）矛盾态一次性重置
    lv2 = {'1-%d' % l: {'stars': 3} for l in range(5)}
    lv2['2-0'] = {'stars': 3}
    seed_ls(lv2)
    pg.reload(); pg.wait_for_timeout(1500)
    n2 = pg.evaluate("() => Object.keys((JSON.parse(localStorage.getItem('kidsgame_timecalc') || '{}').levels) || {}).length")
    chk('T12b v1 旧基档矛盾态一次性重置', n2 == 0, 'levels=%d' % n2)

    chk('T-end 0 pageerror（复验全程）', not errs, str(errs[:2]))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
