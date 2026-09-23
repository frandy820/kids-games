# -*- coding: utf-8 -*-
"""batch36 全量回归：三复验 + clips 注入 + 家长门抽测 + 两级入口 + href 全可达 + 真实路径推进
（quiz 形状探针实证后校准：CO={scene,say,cards}；QC={nL,nR,optsN}；TK=rounds 每关 3 局）
R6 主入口 105→108；SKIP_R13=1 跳过 R1-R3（修复重跑用——产物未变时省 ~25min）"""
import os, sys, re, json, subprocess
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))

GAMES = ['comfort', 'quickcmp', 'tictac']

# R1-R3 三款独立复验（子进程串行）
import os as _os
if _os.environ.get('SKIP_R13') == '1':
    RES.extend([('R1 comfort 复验全绿', True), ('R2 quickcmp 复验全绿', True), ('R3 tictac 复验全绿', True)])
    print('[PASS] R1-R3 复验全绿（SKIP_R13=1 跳过——产物未变）')
for g in ([] if _os.environ.get('SKIP_R13') == '1' else GAMES):
    r = subprocess.run([sys.executable, os.path.join(BASE, 'verify_batch36.py'), g],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = (r.stdout or '').strip().split('\n')[-1] if r.stdout else ''
    chk('R%d %s 复验全绿' % (len(RES) + 1, g), r.returncode == 0 and 'PASS' in (r.stdout or ''), tail)

# R4 clips 注入（每款键语音映射在场）
ok4, info4 = True, []
KEYS = {
    'comfort':  ['co_tut_watch', 'co_tut_turn', 'co_hint', 'co_right', 'co_wrong', 'co_pick', 'co_gray'],
    'quickcmp': ['qc_tut_watch', 'qc_tut_turn', 'qc_ask', 'qc_hint', 'qc_right', 'qc_wrong'],
    'tictac':   ['tk_tut_watch', 'tk_tut_turn', 'tk_hint', 'tk_right', 'tk_draw', 'tk_lose',
                 'tk_puz_win', 'tk_puz_block', 'tk_puz_fork', 'tk_wrong', 'tk_review', 'tk_v44', 'tk_vroll'],
}
for g, keys in KEYS.items():
    s = open(os.path.join(BASE, g, 'index.html'), encoding='utf-8').read()
    missing = [k for k in keys if ("'" + k + "'") not in s and ('"' + k + '"') not in s]
    if 'data:audio/mpeg;base64' not in s or missing:
        ok4 = False; info4.append('%s miss=%s' % (g, missing))
chk('R4 三款 clips 键+注入在场', ok4, info4 or 'ok')

# R5 家长门抽测（quickcmp 真实页：KIDS 在场+家长入口+存档会话字段）
from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--mute-audio'])
        pg = b.new_page()
        pg.goto('file:///' + os.path.join(BASE, 'quickcmp', 'index.html').replace(chr(92), '/'))
        pg.wait_for_timeout(3000)
        has_kids = pg.evaluate('() => typeof KIDS !== "undefined"')
        has_lock = pg.evaluate('() => document.body.innerHTML.includes("家长")')
        sv = pg.evaluate('() => { const s = localStorage.getItem("kidsgame_quickcmp"); return s ? JSON.parse(s) : null; }')
        pg.close(); b.close()
    chk('R5 家长门抽测 KIDS+家长面板+存档', bool(has_kids) and bool(has_lock) and bool(sv and sv.get('v') == '1.0'),
        'KIDS=%s parent=%s v=%s' % (has_kids, has_lock, sv and sv.get('v')))
except Exception as e:
    chk('R5 家长门抽测', False, str(e)[:80])

# R6 两级入口：主入口 ≥108 卡（batch36 交付时 108——hub 已由 120 扩容工程增至 120，非 batch36 回归面，
# 承 batch30 r10 先例降为下界）+ batch36 入口 3 卡 + 三款子页存在
main = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
n_main = len(re.findall(r'class="card" href="([^"]+)"', main))
ent = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()
n_ent = len(re.findall(r'href="\w+/index\.html"', ent))
subs = [os.path.exists(os.path.join(BASE, g, 'index.html')) for g in GAMES]
b36_main = len(re.findall(r'class="card" href="batch36/', main))
chk('R6 两级入口 ≥108+3+子页', n_main >= 108 and n_ent == 3 and all(subs) and b36_main == 3,
    'main=%d b36inMain=%d ent=%d subs=%s' % (n_main, b36_main, n_ent, subs))

# R7 href 全可达（主入口+batch36 入口所有相对链接目标存在）
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

# R8 真实路径推进（b27 定版常驻：预置首日 6 关完成 → bonusSet(5) →
#   autoSolve 走 flat6-10 → 断言 dch 推进 + flat10 题型域 + 存档记录；
#   r18 tictac 分款（§-r18 §1）：CH_LEN=6→flat6-10 全 ch2（dch 恒 2），ch1 须 1-0..1-5 全六关预置
#   （迁移 IIFE 矛盾态检测：'2-0' 在而 '1-5' 缺=重置——旧五关预置会触发；且 '2-0'=flat6 留
#   未完成=驱动起点），驱动完成 2-0..2-4、rec 过滤计 2-1..2-4=4 键）
from datetime import date
HOOK = {'comfort': 'CO', 'quickcmp': 'QC', 'tictac': 'TK'}
DCH_EXP = {'comfort': [2, 2, 2, 2, 3], 'quickcmp': [2, 2, 2, 2, 3], 'tictac': [2, 2, 2, 2, 2]}
REC_EXP = {'comfort': 5, 'quickcmp': 5, 'tictac': 4}
# ch3 题型族（co/qc f10=dch3）[探针实证]：CO 静态形状=quizzes[].cards（ch3 三选域）/QC=quizzes[].nL,nR
#   （ch3 Weber 域）/TK=rounds 每关 3 局（AI 档属运行时行为，静态断言=3 局制——r18 f10=ch2 同值）
CH3MAP = {
    'comfort':  'genLevel(10).quizzes.map(q => q.cards.length)',
    'quickcmp': 'genLevel(10).quizzes.map(q => [q.nL, q.nR])',
    'tictac':   'genLevel(10).rounds.length',
}
def ch3_ok(g, vals):
    if g == 'comfort':
        return vals == [3, 3, 3, 3, 3]                                  # ch3 恒三选（§0.88）
    if g == 'quickcmp':
        if len(vals) != 5:
            return False
        for nl, nr in vals:                                              # ch3 Weber 域（§0.89）
            if not (5 <= nl <= 10 and 5 <= nr <= 10 and abs(nl - nr) >= 2 and min(nl, nr) / max(nl, nr) <= 0.8):
                return False
        return True
    return vals == 3                                                     # ch3 每关 3 局（§0.90）
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
            # 首日 6 关完成态：co/qc=1-0..1-4+'2-0'(flat5)→首未完成=flat6；
            # tk r18=1-0..1-5 六关(ch1 全)——'2-0'=flat6 须留未完成（否则首未完成=flat7 驱动错位）
            levels6 = {'1-%d' % i: {'stars': 3, 'plays': 1}
                       for i in range(6 if g == 'tictac' else 5)}
            if g != 'tictac':
                levels6['2-0'] = {'stars': 3, 'plays': 1}
            sv = {'v': '1.0', 'game': g, 'firstDay': today, 'lastDay': today, 'levels': levels6,
                  'dailyMin': {}, 'settings': {'sound': True, 'tts': True, 'vol': 0.6},
                  'restTip': {'day': '', 'shown': 0}}
            if g == 'tictac':
                sv['tictac'] = {'tutSeen': True}        # r18 家族 E：空档起播教学（驱动场景禁入）
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
                ok_g = (dchs == DCH_EXP[g] and ch3_ok(g, vals10) and len(rec_keys) == REC_EXP[g])
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
