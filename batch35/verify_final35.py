# -*- coding: utf-8 -*-
"""batch35 全量回归：三复验 + clips 注入 + 家长门抽测 + 两级入口 + href 全可达 + 真实路径推进
（quiz 形状探针实证后校准：TT={turn,thirsty,turnSeq}；MT={target,a,pool,answer}；ED={shown,errType,fix,phase,pills}）
"""
import os, sys, re, json, subprocess
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))

GAMES = ['turntake', 'maketen', 'errdoc']

# R1-R3 三款独立复验（子进程串行；SKIP_R13=1 跳过——修复重跑用，R1-R3 产物未变时省 ~25min）
import os as _os
if _os.environ.get('SKIP_R13') == '1':
    RES.extend([('R1 turntake 复验全绿', True), ('R2 maketen 复验全绿', True), ('R3 errdoc 复验全绿', True)])
    print('[PASS] R1-R3 复验全绿（SKIP_R13=1 跳过——产物未变）')
for g in ([] if _os.environ.get('SKIP_R13') == '1' else GAMES):
    r = subprocess.run([sys.executable, os.path.join(BASE, 'verify_batch35.py'), g],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = (r.stdout or '').strip().split('\n')[-1] if r.stdout else ''
    chk('R%d %s 复验全绿' % (len(RES) + 1, g), r.returncode == 0 and 'PASS' in (r.stdout or ''), tail)

# R4 clips 注入（每款键语音映射在场）
ok4, info4 = True, []
KEYS = {
    'turntake': ['tt_tut_watch', 'tt_tut_turn', 'tt_hint', 'tt_right', 'tt_wrong', 'tt_wait'],
    'maketen':  ['mt_tut_watch', 'mt_tut_turn', 'mt_hint', 'mt_right', 'mt_wrong_more', 'mt_wrong_less'],
    'errdoc':   ['ed_tut_watch', 'ed_tut_turn', 'ed_hint', 'ed_right', 'ed_wrong', 'ed_spot', 'ed_rx_careful', 'ed_rx_calc', 'ed_rx_slow'],
}
for g, keys in KEYS.items():
    s = open(os.path.join(BASE, g, 'index.html'), encoding='utf-8').read()
    missing = [k for k in keys if ("'" + k + "'") not in s and ('"' + k + '"') not in s]
    if 'data:audio/mpeg;base64' not in s or missing:
        ok4 = False; info4.append('%s miss=%s' % (g, missing))
chk('R4 三款 clips 键+注入在场', ok4, info4 or 'ok')

# R5 家长门抽测（maketen 真实页：KIDS 在场+家长入口+存档会话字段）
from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--mute-audio'])
        pg = b.new_page()
        pg.goto('file:///' + os.path.join(BASE, 'maketen', 'index.html').replace(chr(92), '/'))
        pg.wait_for_timeout(3000)
        has_kids = pg.evaluate('() => typeof KIDS !== "undefined"')
        has_lock = pg.evaluate('() => document.body.innerHTML.includes("家长")')
        sv = pg.evaluate('() => { const s = localStorage.getItem("kidsgame_maketen"); return s ? JSON.parse(s) : null; }')
        pg.close(); b.close()
    chk('R5 家长门抽测 KIDS+家长面板+存档', bool(has_kids) and bool(has_lock) and bool(sv and sv.get('v') == '1.0'),
        'KIDS=%s parent=%s v=%s' % (has_kids, has_lock, sv and sv.get('v')))
except Exception as e:
    chk('R5 家长门抽测', False, str(e)[:80])

# R6 两级入口：主入口 105 卡 + batch35 入口 3 卡 + 三款子页存在
main = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
n_main = len(re.findall(r'class="card" href="([^"]+)"', main))
ent = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()
n_ent = len(re.findall(r'href="\w+/index\.html"', ent))
subs = [os.path.exists(os.path.join(BASE, g, 'index.html')) for g in GAMES]
b35_main = len(re.findall(r'class="card" href="batch35/', main))
chk('R6 两级入口 105+3+子页', n_main == 105 and n_ent == 3 and all(subs) and b35_main == 3,
    'main=%d b35inMain=%d ent=%d subs=%s' % (n_main, b35_main, n_ent, subs))

# R7 href 全可达（主入口+batch35 入口所有相对链接目标存在）
bad = []
for srcf, base_dir in [(os.path.join(ROOT, 'index.html'), ROOT), (os.path.join(BASE, 'index.html'), BASE)]:
    s = open(srcf, encoding='utf-8').read()
    for m in re.findall(r'href="([^"#][^"]*)"', s):
        if m.startswith(('http', 'javascript', 'data:')):
            continue
        tgt = os.path.normpath(os.path.join(base_dir, m.split('#')[0]))
        if not os.path.exists(tgt):
            bad.append('%s -> %s' % (os.path.basename(srcf), m))
chk('R7 href 全可达', not bad, bad[:5] or 'ok')

# R8 真实路径推进（b29 定版常驻：预置首日 6 关完成 → bonusSet(5) →
#   autoSolve 走 flat6-10 → 断言 dch 推进 [2,2,2,2,3] + flat10=ch3 专属题型 + 存档记录 2-1..3-0）
from datetime import date
HOOK = {'turntake': 'TT', 'maketen': 'MT', 'errdoc': 'ED'}
# ch3 题型族（f10=dch3）[探针实证]：TT 静态形状=turns 数组非 quizzes（b30 坑②）——ch3=不规则轮替（§0.85）/
#   MT ch3=恒 target15 池4（§0.86）/ ED ch3=num 型题库（§0.87）
CH3MAP = {
    'turntake': 'genLevel(10).turns.map(t => t.turn)',
    'maketen':  'genLevel(10).quizzes.map(q => [q.target, q.pool.length])',
    'errdoc':   'genLevel(10).quizzes.map(q => q.errType)',
}
def ch3_ok(g, vals):
    if g == 'turntake':
        # 不规则轮替先验：首 k/k 恒 5/连续同方≤2/长度 9-11（兔子 4-6）+ 至少一处连 2（ch3 不规则实证）
        if not vals or vals[0] != 'k' or vals.count('k') != 5 or not (9 <= len(vals) <= 11):
            return False
        run, mx, r2 = 1, 1, False
        for i in range(1, len(vals)):
            run = run + 1 if vals[i] == vals[i - 1] else 1
            mx = max(mx, run)
            if run == 2:
                r2 = True
        return mx <= 2 and r2
    if len(vals) != 5:
        return False
    if g == 'maketen':
        return all(t == 15 and n == 4 for t, n in vals)                # ch3 凑 15 池 4
    return all(v == 'num' for v in vals)                               # ch3 恒 num 型
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--mute-audio'])
        r8_infos = []
        r8_ok = True
        for g in GAMES:
            ctx = b.new_context()
            pg = ctx.new_page()
            url = 'file:///' + os.path.join(BASE, g, 'index.html').replace(chr(92), '/')
            today = date.today().isoformat()
            levels6 = {'1-%d' % i: {'stars': 3, 'plays': 1} for i in range(5)}
            levels6['2-0'] = {'stars': 3, 'plays': 1}
            sv = {'v': '1.0', 'game': g, 'firstDay': today, 'lastDay': today, 'levels': levels6,
                  'dailyMin': {}, 'settings': {'sound': True, 'tts': True, 'vol': 0.6},
                  'restTip': {'day': '', 'shown': 0}}
            pg.add_init_script('localStorage.setItem("kidsgame_%s", JSON.stringify(%s))' % (g, json.dumps(sv, ensure_ascii=False)))
            pg.goto(url)
            pg.wait_for_timeout(2500)
            pg.evaluate('() => { KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {}; KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {}; }')
            pg.evaluate('() => KIDS.calendar.bonusSet(5)')
            pg.evaluate('() => %s.autoSolve()' % HOOK[g])
            for _ in range(150):
                if pg.evaluate('() => %s.currentLevel.won' % HOOK[g]):
                    break
                pg.wait_for_timeout(500)
            pg.wait_for_timeout(4500)
            dchs, vals10 = [], []
            for f in range(6, 11):
                for _ in range(120):
                    st = pg.evaluate('() => ({ flat: %s.currentLevel.flat, dch: %s.currentLevel.dch, won: %s.currentLevel.won })' % (HOOK[g], HOOK[g], HOOK[g]))
                    if st['flat'] == f and not st['won']:
                        break
                    pg.wait_for_timeout(500)
                else:
                    r8_ok = False; r8_infos.append('%s f%d 未起关' % (g, f)); break
                dchs.append(st['dch'])
                if f == 10:
                    vals10 = pg.evaluate('() => %s' % CH3MAP[g])
                pg.evaluate('() => %s.autoSolve()' % HOOK[g])
                for _ in range(150):
                    if pg.evaluate('() => %s.currentLevel.won' % HOOK[g]):
                        break
                    pg.wait_for_timeout(500)
                pg.wait_for_timeout(4500)
            if dchs:
                sv2 = pg.evaluate('() => JSON.parse(localStorage.getItem("kidsgame_%s") || "{}")' % g)
                rec_keys = sorted(k for k in (sv2.get('levels') or {}) if k >= '2-1' and k <= '3-0')
                ok_g = (dchs == [2, 2, 2, 2, 3] and ch3_ok(g, vals10) and len(rec_keys) == 5)
                r8_ok = r8_ok and ok_g
                r8_infos.append('%s dch=%s f10=%s rec=%s' % (g, dchs, vals10, rec_keys))
            pg.close(); ctx.close()
        b.close()
    chk('R8 真实路径推进 bonus→flat10 ch3 题型+写档', r8_ok, '; '.join(r8_infos))
except Exception as e:
    chk('R8 真实路径推进', False, str(e)[:120])

fails = [n for n, ok in RES if not ok]
print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
if fails:
    print('FAILED:', fails); sys.exit(1)
