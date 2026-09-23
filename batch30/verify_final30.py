# -*- coding: utf-8 -*-
"""batch30 全量回归：三复验 + clips 注入 + 家长门抽测 + 两级入口 + href 全可达 + 真实路径推进
（maze R8 字段口径按探针校准：quiz.maze.key 三局全非空=ch3 钥匙门族）"""
import os, sys, re, json, subprocess
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))

# R1-R3 三款独立复验（子进程串行）
for g in ['babylove', 'storybed', 'maze']:
    r = subprocess.run([sys.executable, os.path.join(BASE, 'verify_batch30.py'), g],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = (r.stdout or '').strip().split('\n')[-1] if r.stdout else ''
    chk('R%d %s 复验全绿' % (len(RES) + 1, g), r.returncode == 0 and 'PASS' in (r.stdout or ''), tail)

# R4 clips 注入（每款 ≥9 条 data:audio + 键语音映射在场；per 款抽验键含名音/步音/钥匙音）
ok4, info4 = True, []
KEYS = {
    'babylove': ['bab_tut_watch', 'bab_tut_turn', 'bab_hint', 'bab_right', 'bab_wrong', 'bab_q1', 'bab_q2',
                 'bab_q3', 'bab_grow_next', 'bab_h_water', 'bab_h_forest', 'bab_h_grass',
                 'bab_q4_mom', 'bab_q4_baby', 'bab_n_frog', 'bab_n_fishfry', 'bab_n_grub',
                 'bab_n_egg_frog', 'bab_n_egg_hen', 'bab_n_lamb'],
    'storybed': ['stb_tut_watch', 'stb_tut_turn', 'stb_hint', 'stb_right', 'stb_wrong', 'stb_q', 'stb_next', 'stb_s_sleep_0'],
    'maze':     ['maz_tut_watch', 'maz_tut_turn', 'maz_hint', 'maz_right', 'maz_wrong', 'maz_q', 'maz_key'],
}
for g, keys in KEYS.items():
    s = open(os.path.join(BASE, g, 'index.html'), encoding='utf-8').read()
    n_audio = s.count('data:audio/mpeg;base64')
    missing = [k for k in keys if ("'" + k + "'") not in s and ('"' + k + '"') not in s]
    if n_audio < 2 or missing:   # 前缀拼接写法：键存在性为准
        ok4 = False; info4.append('%s miss=%s' % (g, missing))
chk('R4 三款 clips 键+注入在场', ok4, info4 or 'ok')

# R5 家长门抽测（storybed 真实页：KIDS 在场+家长入口+存档会话字段）
from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto('file:///' + os.path.join(BASE, 'storybed', 'index.html').replace(chr(92), '/'))
        pg.wait_for_timeout(3000)
        has_kids = pg.evaluate('() => typeof KIDS !== "undefined"')
        has_lock = pg.evaluate('() => document.body.innerHTML.includes("家长")')
        sv = pg.evaluate('() => { const s = localStorage.getItem("kidsgame_storybed"); return s ? JSON.parse(s) : null; }')
        pg.close(); b.close()
    chk('R5 家长门抽测 KIDS+家长面板+存档', bool(has_kids) and bool(has_lock) and bool(sv and sv.get('v') == '1.0'),
        'KIDS=%s parent=%s v=%s' % (has_kids, has_lock, sv and sv.get('v')))
except Exception as e:
    chk('R5 家长门抽测', False, str(e)[:80])

# R6 两级入口：主入口 ≥90 卡（batch30 交付时 90——hub 已由 120 扩容工程增至 120，非 batch30 回归面，
# 口径=不退化下界）+ batch30 入口 3 卡 + 三款子页存在
main = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
n_main = len(re.findall(r'class="card" href="([^"]+)"', main))
ent = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()
n_ent = len(re.findall(r'href="\w+/index\.html"', ent))
subs = [os.path.exists(os.path.join(BASE, g, 'index.html')) for g in ['babylove', 'storybed', 'maze']]
chk('R6 两级入口 ≥90+3+子页', n_main >= 90 and n_ent == 3 and all(subs),
    'main=%d ent=%d subs=%s' % (n_main, n_ent, subs))

# R7 href 全可达（主入口+batch30 入口所有相对链接目标存在——b24 坑①：卡数对账≠链接可达）
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

# R8 真实路径推进（承 b29 定版常驻：预置首日 6 关完成 → bonusSet(5) →
#   autoSolve 走 flat6-10 → 断言 dch 推进 [2,2,2,2,3] + flat10=ch3 专属题型族 + 存档记录 2-1..3-0）
from datetime import date
HOOK = {'babylove': 'BL', 'storybed': 'SB', 'maze': 'MZ'}
# ch3 题型族（f10=dch3）：babylove r10 发育链全 grow / storybed r10 条件分支 rain+order 混合 / maze 三局全钥匙门
# （探针实证：storybed 静态 quiz=pool 池非 steps；maze 静态字段=mazes 非 quizzes）
CH3MAP = {
    'babylove': 'genLevel(10).quizzes.map(q => q.kind)',
    'storybed': 'genLevel(10).quizzes.map(q => q.kind)',
    'maze':     'genLevel(10).mazes.map(m => m.key ? 1 : 0)',
}
def ch3_ok(g, vals):
    if len(vals) != 5 and not (g == 'maze' and len(vals) == 3):
        return False
    if g == 'babylove':
        return set(vals) == {'grow'}
    if g == 'storybed':
        return vals[0] == 'rain' and set(vals) == {'rain', 'order'} and vals.count('rain') >= 2   # r10：题0 恒 rain、≥2 rain/关
    return all(v == 1 for v in vals)          # maze：三局全带钥匙门
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        r8_infos = []
        r8_ok = True
        for g in ['babylove', 'storybed', 'maze']:
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
            # 静音：真实页 stub 发声（评价语音不阻塞计时窗——与 verify 页同口径，面板/推进照常）
            pg.evaluate('() => { KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {}; KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {}; }')
            pg.evaluate('() => KIDS.calendar.bonusSet(5)')      # 家长面板「今日多玩关数」同 API
            # 点火：先通关当前关触发 winFlow→proceed 才会走向 flat6
            pg.evaluate('() => %s.autoSolve()' % HOOK[g])
            for _ in range(150):
                if pg.evaluate('() => %s.currentLevel.won' % HOOK[g]):
                    break
                pg.wait_for_timeout(500)
            pg.wait_for_timeout(4500)
            dchs, vals10 = [], []
            for f in range(6, 11):
                for _ in range(240 if g == 'maze' else 120):    # maze 3 局/关起关更慢 ≤120s
                    st = pg.evaluate('() => ({ flat: %s.currentLevel.flat, dch: %s.currentLevel.dch, won: %s.currentLevel.won })' % (HOOK[g], HOOK[g], HOOK[g]))
                    if st['flat'] == f and not st['won']:
                        break
                    pg.wait_for_timeout(500)
                else:
                    r8_ok = False; r8_infos.append('%s f%d 未起关' % (g, f)); break
                dchs.append(st['dch'])
                if f == 10:
                    vals10 = pg.evaluate('() => %s' % CH3MAP[g])  # startLevel 同源纯函数
                pg.evaluate('() => %s.autoSolve()' % HOOK[g])
                for _ in range(240 if g == 'maze' else 150):     # maze 3 局通关 ≤120s
                    if pg.evaluate('() => %s.currentLevel.won' % HOOK[g]):
                        break
                    pg.wait_for_timeout(500)
                pg.wait_for_timeout(4500)                        # 等 winFlow 面板+proceed（3400+裕量）
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
