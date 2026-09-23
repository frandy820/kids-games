# -*- coding: utf-8 -*-
"""batch26 全量回归：三复验 + clips 注入 + 家长门抽测 + 两级入口 + href 全可达"""
import os, sys, re, subprocess
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))

# R1-R3 三款独立复验（子进程串行，GBK 噪声无关判据）
for g in ['sign', 'season', 'calendar']:
    r = subprocess.run([sys.executable, os.path.join(BASE, 'verify_one_%s.py' % g)],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = (r.stdout or '').strip().split('\n')[-1] if r.stdout else ''
    chk('R%d %s 复验' % (RES.__len__() + 0, g), r.returncode == 0, tail)

# R4 clips 注入（每款 ≥9 条 data:audio + 六键语音映射在场）
ok4, info4 = True, []
for g, pre in [('sign', 'sgn_'), ('season', 'sea_'), ('calendar', 'cal_')]:
    s = open(os.path.join(BASE, g, 'index.html'), encoding='utf-8').read()
    n_audio = s.count('data:audio/mpeg;base64')
    keys = [pre + k for k in ['tut_watch', 'tut_turn', 'hint', 'right', 'wrong', 'q']]
    missing = [k for k in keys if k not in s]
    if n_audio < 9 or missing:
        ok4 = False; info4.append('%s audio=%d miss=%s' % (g, n_audio, missing))
chk('R4 三款 clips≥9+六键在场', ok4, info4 or 'ok')

# R5 家长门抽测（calendar 真实页：KIDS 在场+🔒入口+存档会话字段）
from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto('file:///' + os.path.join(BASE, 'calendar', 'index.html').replace(chr(92), '/'))
        pg.wait_for_timeout(3000)
        has_kids = pg.evaluate('() => typeof KIDS !== "undefined"')
        has_lock = pg.evaluate('() => document.body.innerHTML.includes("家长")')
        sv = pg.evaluate('() => { const s = localStorage.getItem("kidsgame_calendar"); return s ? JSON.parse(s) : null; }')
        pg.close(); b.close()
    chk('R5 家长门抽测 KIDS+家长面板+存档', bool(has_kids) and bool(has_lock) and bool(sv and sv.get('v') == '1.0'),
        'KIDS=%s parent=%s v=%s' % (has_kids, has_lock, sv and sv.get('v')))
except Exception as e:
    chk('R5 家长门抽测 KIDS+🔒+存档', False, str(e)[:80])

# R6 两级入口：主入口 78 卡 + batch26 入口 3 卡 + 三款子页存在
main = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
n_main = len(re.findall(r'href="batch\d+/', main))
ent = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()
n_ent = len(re.findall(r'href="\w+/index\.html"', ent))
subs = [os.path.exists(os.path.join(BASE, g, 'index.html')) for g in ['sign', 'season', 'calendar']]
chk('R6 两级入口 78+3+子页', n_main == 78 and n_ent == 3 and all(subs),
    'main=%d ent=%d subs=%s' % (n_main, n_ent, subs))

# R7 href 全可达（主入口+batch26 入口所有相对链接目标存在）
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

fails = [n for n, ok in RES if not ok]
print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
if fails:
    print('FAILED:', fails); sys.exit(1)
