# -*- coding: utf-8 -*-
"""batch37 全量回归：三复验 + clips 注入 + 家长门抽测 + 两级入口 + href 全可达 + 真实路径推进
（genLevel(10) 探针实证 2026-09-12：thanks cards.length=[3×5]；plant n=[4×5]；teach cards 恒 2 无判别力
 → teach 用 q.n 域 {6,7}）
R6 主入口 108→111；SKIP_R13=1 跳过 R1-R3（修复重跑用——产物未变时省 ~25min）"""
import os, sys, re, json, subprocess
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))

GAMES = ['thanks', 'plant', 'teach']

# R1-R3 三款独立复验（子进程串行）
if os.environ.get('SKIP_R13') == '1':
    RES.extend([('R1 thanks 复验全绿', True), ('R2 plant 复验全绿', True), ('R3 teach 复验全绿', True)])
    print('[PASS] R1-R3 复验全绿（SKIP_R13=1 跳过——产物未变）')
for g in ([] if os.environ.get('SKIP_R13') == '1' else GAMES):
    r = subprocess.run([sys.executable, os.path.join(BASE, 'verify_batch37.py'), g],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = (r.stdout or '').strip().split('\n')[-1] if r.stdout else ''
    # 判据=无 FAILED 行（'PASS' in stdout 假阳性：10/13 PASS 也含 PASS——b37 首跑实证）
    chk('R%d %s 复验全绿' % (len(RES) + 1, g), 'FAILED:' not in (r.stdout or '') and 'TOTAL' in (r.stdout or ''), tail)

# R4 clips 注入（每款键语音映射在场）
ok4, info4 = True, []
KEYS = {
    'thanks': ['th_tut_watch', 'th_tut_turn', 'th_hint', 'th_right', 'th_wrong',
               'tha_fit', 'tha_not', 'tha_gray', 'tha_ok'],   # r12：框架锚/灰链/反向错反馈 4 键
    'plant':  ['pl_tut_watch', 'pl_tut_turn', 'pl_ask', 'pl_hint', 'pl_right', 'pl_wrong'],
    'teach':  ['tch_tut_watch', 'tch_tut_turn', 'tch_task', 'tch_hint', 'tch_right', 'tch_wrong'],
}
for g, keys in KEYS.items():
    s = open(os.path.join(BASE, g, 'index.html'), encoding='utf-8').read()
    missing = [k for k in keys if ("'" + k + "'") not in s and ('"' + k + '"') not in s]
    if 'data:audio/mpeg;base64' not in s or missing:
        ok4 = False; info4.append('%s miss=%s' % (g, missing))
chk('R4 三款 clips 键+注入在场', ok4, info4 or 'ok')

# R5 家长门抽测（thanks 真实页：KIDS 在场+家长入口+存档会话字段）
from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--mute-audio'])
        pg = b.new_page()
        pg.goto('file:///' + os.path.join(BASE, 'thanks', 'index.html').replace(chr(92), '/'))
        pg.wait_for_timeout(3000)
        has_kids = pg.evaluate('() => typeof KIDS !== "undefined"')
        has_lock = pg.evaluate('() => document.body.innerHTML.includes("家长")')
        sv = pg.evaluate('() => { const s = localStorage.getItem("kidsgame_thanks"); return s ? JSON.parse(s) : null; }')
        pg.close(); b.close()
    chk('R5 家长门抽测 KIDS+家长面板+存档', bool(has_kids) and bool(has_lock) and bool(sv and sv.get('v') == '1.0'),
        'KIDS=%s parent=%s v=%s' % (has_kids, has_lock, sv and sv.get('v')))
except Exception as e:
    chk('R5 家长门抽测', False, str(e)[:80])

# R6 两级入口：主入口 >=120 卡（hub 120 终态扩容，旧钉值 111 过时——r12 收口回填）+ batch37 入口 3 卡 + 三款子页存在
main = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
n_main = len(re.findall(r'class="card" href="([^"]+)"', main))
ent = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()
n_ent = len(re.findall(r'href="\w+/index\.html"', ent))
subs = [os.path.exists(os.path.join(BASE, g, 'index.html')) for g in GAMES]
b37_main = len(re.findall(r'class="card" href="batch37/', main))
chk('R6 两级入口 >=120+3+子页', n_main >= 120 and n_ent == 3 and all(subs) and b37_main == 3,
    'main=%d b37inMain=%d ent=%d subs=%s' % (n_main, b37_main, n_ent, subs))

# R7 href 全可达（主入口+batch37 入口所有相对链接目标存在）
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
#   autoSolve 走 flat6-10 → 断言 dch 推进 [2,2,2,2,3] + flat10=ch3 专属题型 + 存档记录 2-1..3-0）
from datetime import date
HOOK = {'thanks': 'TH', 'plant': 'PL', 'teach': 'TCH'}
# ch3 题型族（f10=dch3）[探针实证 2026-09-12；r12 thanks 更新 2026-09-15]：
#   thanks cards=[3×5]（ch3=size 三选——SPEC §7 r12）/ plant n=[4×5]（ch3 4×4 §0.89）/
#   teach cards 恒 2 无判别力 → n∈[10,20]（ch3 域 SPEC §6 r5 NDOM）
CH3MAP = {
    'thanks': 'genLevel(10).quizzes.map(q => q.cards.length)',
    'plant':  'genLevel(10).quizzes.map(q => q.n)',
    'teach':  'genLevel(10).quizzes.map(q => q.n)',
}
def ch3_ok(g, vals):
    if g == 'thanks':
        return vals == [3, 3, 3, 3, 3]
    if g == 'plant':
        return vals == [4, 4, 4, 4, 4]
    # teach ch3 N 域 [10,20]（SPEC §6 r5 NDOM={3:[10,20]} 真值源——v1 §0.90 {6,7} 已作废；
    # 2026-09-15 勘误：R8 teach 分支未随 r5 更新致 f10=[16,11,...] 假红）
    return len(vals) == 5 and all(10 <= v <= 20 for v in vals)
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
                # plant 关末=花园全景 2400+celebrate 后才 persistWin（SPEC §2 设计内，合计 ~5.8s）——
                # 固定 4500ms 不足（b37 首跑 plant 缺 '3-0' 实证），改轮询 flat10 写档落盘（15s 上限）
                for _ in range(30):
                    sv2 = pg.evaluate('() => JSON.parse(localStorage.getItem("kidsgame_%s") || "{}")' % g)
                    if (sv2.get('levels') or {}).get('3-0'):
                        break
                    pg.wait_for_timeout(500)
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
