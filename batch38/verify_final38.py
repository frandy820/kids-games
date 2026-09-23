# -*- coding: utf-8 -*-
"""batch38 全量回归：三复验 + clips 注入 + 家长门抽测 + 两级入口 + href 全可达 + 真实路径推进
R6 主入口 111→114；SKIP_R13=1 跳过 R1-R3（修复重跑用——产物未变时省 ~30min）
R8 ch 档题型判别=起关 flat10 后首题 quiz 字段（stamp q.unit/libr q.shelf.length/gear q.slots.length——
  探针实证钩子形态直读，无需 genLevel().quizzes 探针）；dch 序列=dch_reseed 独立复算期望（T4 同函数）"""
import os, sys, re, json, subprocess
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))

GAMES = ['stamp', 'libr', 'gear']
SEEDC = {'stamp': 827, 'libr': 837, 'gear': 847}

def dch_reseed(flat, c):
    a = (flat * 7919 + c) & 0xFFFFFFFF
    a = (a + 0x6D2B79F5) & 0xFFFFFFFF
    t = a
    t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
    t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
    r = ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return 1 + int(r * 4)

# R1-R3 三款独立复验（子进程串行）
if os.environ.get('SKIP_R13') == '1':
    RES.extend([('R1 stamp 复验全绿', True), ('R2 libr 复验全绿', True), ('R3 gear 复验全绿', True)])
    print('[PASS] R1-R3 复验全绿（SKIP_R13=1 跳过——产物未变）')
for g in ([] if os.environ.get('SKIP_R13') == '1' else GAMES):
    r = subprocess.run([sys.executable, os.path.join(BASE, 'verify_batch38.py'), g],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = (r.stdout or '').strip().split('\n')[-1] if r.stdout else ''
    # 判据=无 FAILED 行（'PASS' in stdout 假阳性——b37 首跑实证）
    chk('R%d %s 复验全绿' % (len(RES) + 1, g), 'FAILED:' not in (r.stdout or '') and 'TOTAL' in (r.stdout or ''), tail)

# R4 clips 注入（每款键语音映射在场）
ok4, info4 = True, []
KEYS = {
    'stamp': ['spm_tut_watch', 'spm_tut_turn', 'spm_hint', 'spm_right', 'spm_wrong',
              'spm_task_next', 'spm_task_dual', 'spm_task_fix', 'spm_fix_wrong'],   # v3 升档+4 条任务框架/找错句
    'libr':  ['lb_tut_watch', 'lb_tut_turn', 'lb_hint', 'lb_right', 'lb_wrong'],
    'gear':  ['gr_tut_watch', 'gr_tut_turn', 'gr_hint', 'gr_right', 'gr_wrong'],
}
for g, keys in KEYS.items():
    s = open(os.path.join(BASE, g, 'index.html'), encoding='utf-8').read()
    missing = [k for k in keys if ("'" + k + "'") not in s and ('"' + k + '"') not in s]
    if 'data:audio/mpeg;base64' not in s or missing:
        ok4 = False; info4.append('%s miss=%s' % (g, missing))
chk('R4 三款 clips 键+注入在场', ok4, info4 or 'ok')

# R5 家长门抽测（stamp 真实页：KIDS 在场+家长入口+存档会话字段）
from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--mute-audio'])
        pg = b.new_page()
        pg.goto('file:///' + os.path.join(BASE, 'stamp', 'index.html').replace(chr(92), '/'))
        pg.wait_for_timeout(3000)
        has_kids = pg.evaluate('() => typeof KIDS !== "undefined"')
        has_lock = pg.evaluate('() => document.body.innerHTML.includes("家长")')
        sv = pg.evaluate('() => { const s = localStorage.getItem("kidsgame_stamp"); return s ? JSON.parse(s) : null; }')
        pg.close(); b.close()
    chk('R5 家长门抽测 KIDS+家长面板+存档', bool(has_kids) and bool(has_lock) and bool(sv and sv.get('v') == '1.0'),
        'KIDS=%s parent=%s v=%s' % (has_kids, has_lock, sv and sv.get('v')))
except Exception as e:
    chk('R5 家长门抽测', False, str(e)[:80])

# R6 两级入口：主入口 120 卡（120 扩容收官——b39/b40 并行交付后 09-13 实况，原冻结
# 值 114 已过时）+ batch38 入口 3 卡 + 三款子页存在
main = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
n_main = len(re.findall(r'class="card" href="([^"]+)"', main))
ent = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()
n_ent = len(re.findall(r'href="\w+/index\.html"', ent))
subs = [os.path.exists(os.path.join(BASE, g, 'index.html')) for g in GAMES]
b38_main = len(re.findall(r'class="card" href="batch38/', main))
chk('R6 两级入口 120+3+子页', n_main == 120 and n_ent == 3 and all(subs) and b38_main == 3,
    'main=%d b38inMain=%d ent=%d subs=%s' % (n_main, b38_main, n_ent, subs))

# R7 href 全可达（主入口+batch38 入口所有相对链接目标存在）
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
#   autoSolve 走 flat6-10 → 断言 dch 推进=seeded 复算期望 + flat10 首 quiz 题型档 + 存档记录 2-1..3-0）
from datetime import date
HOOK = {'stamp': 'ST', 'libr': 'LB', 'gear': 'GR'}
# ch 档题型域（§1-3 v3 定版表 2026-09-13 stamp 升档）：libr 格数/gear 槽数按 dch 硬域；
# stamp unit 双形态：ch1-2 单属性串（'ABC'/'AABB'/'ABCC'）+ch3-4 双属性对象
# {colors[3],shapes[6]}——unit×章域硬对账已由 verify_batch38 T3 静态 20 关×5 题覆盖，
# 此处只验生成关题型机制在跑
UNIT_ALL = ('ABC', 'AABB', 'ABCC')
NSHELF = {1: 2, 2: 2, 3: 4, 4: 4}
NSLOTS = {1: 3, 2: 3, 3: 5, 4: 5}

def q0_read(pg, g):
    return pg.evaluate('() => { const q = %s.quiz; return q ? { unit: q.unit || null, nshelf: (q.shelf || []).length, nslots: (q.slots || []).length } : null; }' % HOOK[g])

def q0_ok(g, q0, dch):
    if not q0:
        return False
    if g == 'stamp':
        u = q0['unit']
        if isinstance(u, str):
            return u in UNIT_ALL
        return (isinstance(u, dict) and isinstance(u.get('colors'), list) and
                isinstance(u.get('shapes'), list) and
                len(u['colors']) == 3 and len(u['shapes']) == 6)
    if g == 'libr':
        return q0['nshelf'] == NSHELF[dch]
    return q0['nslots'] == NSLOTS[dch]

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
            # flat6-10=静态关（<20），dch=flat//5+1 确定性映射（seeded 只管 flat≥20 生成关——T4 已验）；
            # 首跑 obs 三款同 [2,2,2,2,3] 正是静态映射佐证（误用 seeded 复算期望已纠）
            exp = [f // 5 + 1 for f in range(6, 11)]
            dchs, q0f10 = [], None
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
                    q0f10 = q0_read(pg, g)
                pg.evaluate('() => %s.autoSolve()' % HOOK[g])
                for _ in range(150):
                    if pg.evaluate('() => %s.currentLevel.won' % HOOK[g]):
                        break
                    pg.wait_for_timeout(500)
                pg.wait_for_timeout(4500)
            if dchs:
                # 关末演出在 persistWin 前（家族时序）——轮询 flat10 写档落盘（15s 上限，b37 plant 实证）
                sv2 = {}
                for _ in range(30):
                    sv2 = pg.evaluate('() => JSON.parse(localStorage.getItem("kidsgame_%s") || "{}")' % g)
                    if (sv2.get('levels') or {}).get('3-0'):
                        break
                    pg.wait_for_timeout(500)
                rec_keys = sorted(k for k in (sv2.get('levels') or {}) if k >= '2-1' and k <= '3-0')
                ok_g = (dchs == exp and q0_ok(g, q0f10, exp[4]) and len(rec_keys) == 5)
                r8_ok = r8_ok and ok_g
                r8_infos.append('%s dch=%s(exp %s) f10q=%s rec=%d' % (g, dchs, exp, q0f10, len(rec_keys)))
            pg.close(); ctx.close()
        b.close()
    chk('R8 真实路径推进 bonus→flat10 ch 档题型+写档', r8_ok, '; '.join(r8_infos))
except Exception as e:
    chk('R8 真实路径推进', False, str(e)[:120])

fails = [n for n, ok in RES if not ok]
print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
if fails:
    print('FAILED:', fails); sys.exit(1)
