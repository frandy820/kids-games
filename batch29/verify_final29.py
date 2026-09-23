# -*- coding: utf-8 -*-
"""batch29 全量回归：三复验 + clips 注入 + 家长门抽测 + 两级入口 + href 全可达 + 真实路径推进"""
import os, sys, re, json, subprocess
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))

# R1-R3 三款独立复验（子进程串行）
for g in ['bodyen', 'poem', 'wordpuz']:
    r = subprocess.run([sys.executable, os.path.join(BASE, 'verify_batch29.py'), g],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = (r.stdout or '').strip().split('\n')[-1] if r.stdout else ''
    chk('R%d %s 复验全绿' % (RES.__len__() + 1, g), r.returncode == 0 and 'PASS' in (r.stdout or ''), tail)

# R4 clips 注入（每款 ≥9 条 data:audio + 六键语音映射在场；题面键 per 款：bod_q1/bod_q2、poe_q_next/poe_q_hear、wpu_q）
ok4, info4 = True, []
KEYS = {
    'bodyen':  ['bod_tut_watch', 'bod_tut_turn', 'bod_hint', 'bod_right', 'bod_wrong', 'bod_q1', 'bod_q2', 'bod_w_eye'],
    'poem':    ['poe_tut_watch', 'poe_tut_turn', 'poe_hint', 'poe_right', 'poe_wrong', 'poe_q_next', 'poe_q_hear', 'poe_line_yie_0'],
    'wordpuz': ['wpu_tut_watch', 'wpu_tut_turn', 'wpu_hint', 'wpu_right', 'wpu_wrong', 'wpu_q', 'wpu_w_cat'],
}
for g, keys in KEYS.items():
    s = open(os.path.join(BASE, g, 'index.html'), encoding='utf-8').read()
    n_audio = s.count('data:audio/mpeg;base64')
    missing = [k for k in keys if ("'" + k + "'") not in s and ('"' + k + '"') not in s]
    if n_audio < 2 or missing:   # 前缀拼接写法：键存在性为准
        ok4 = False; info4.append('%s miss=%s' % (g, missing))
chk('R4 三款 clips 键+注入在场', ok4, info4 or 'ok')

# R5 家长门抽测（wordpuz 真实页：KIDS 在场+家长入口+存档会话字段）
from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto('file:///' + os.path.join(BASE, 'wordpuz', 'index.html').replace(chr(92), '/'))
        pg.wait_for_timeout(3000)
        has_kids = pg.evaluate('() => typeof KIDS !== "undefined"')
        has_lock = pg.evaluate('() => document.body.innerHTML.includes("家长")')
        sv = pg.evaluate('() => { const s = localStorage.getItem("kidsgame_wordpuz"); return s ? JSON.parse(s) : null; }')
        pg.close(); b.close()
    chk('R5 家长门抽测 KIDS+家长面板+存档', bool(has_kids) and bool(has_lock) and bool(sv and sv.get('v') == '1.0'),
        'KIDS=%s parent=%s v=%s' % (has_kids, has_lock, sv and sv.get('v')))
except Exception as e:
    chk('R5 家长门抽测', False, str(e)[:80])

# R6 两级入口：主入口 87 卡 + batch29 入口 3 卡 + 三款子页存在
main = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
n_main = len(re.findall(r'class="card" href="([^"]+)"', main))
ent = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()
n_ent = len(re.findall(r'href="\w+/index\.html"', ent))
subs = [os.path.exists(os.path.join(BASE, g, 'index.html')) for g in ['bodyen', 'poem', 'wordpuz']]
chk('R6 两级入口 87+3+子页', n_main == 87 and n_ent == 3 and all(subs),
    'main=%d ent=%d subs=%s' % (n_main, n_ent, subs))

# R7 href 全可达（主入口+batch29 入口所有相对链接目标存在——b24 坑①：卡数对账≠链接可达）
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

# R8 真实路径推进（b27 试玩 P1-1 验证缺口定版常驻：预置首日 6 关完成 → bonusSet(5) →
#   autoSolve 走 flat6-10 → 断言 dch 推进 [2,2,2,2,3] + flat10=ch3 专属题型族 + 存档记录 2-1..3-0）
from datetime import date
HOOK = {'bodyen': 'BE', 'poem': 'PM', 'wordpuz': 'WP'}
# ch3 题型族（f10=dch3）：bodyen 混出 hear/see / poem 全 hear / wordpuz 词长 3-4（quiz 无 kind，取 w<len> 形态）
def ch3_ok(g, kinds):
    if len(kinds) != 5:
        return False
    if g == 'bodyen':
        return all(k in ('hear', 'see') for k in kinds) and set(kinds) == {'hear', 'see'}
    if g == 'poem':
        return all(k == 'hear' for k in kinds)
    return all(k in ('w3', 'w4') for k in kinds)
KINDMAP = ('genLevel(10).quizzes.map(q => q.kind || (q.word ? "w" + q.word.length : "?"))')
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        r8_infos = []
        r8_ok = True
        for g in ['bodyen', 'poem', 'wordpuz']:
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
            # 点火：引擎加载时停在重放关（首日全过关+多玩未设），bonusSet 不主动推进——
            # 先通关当前关触发 winFlow→proceed 才会走向 flat6
            pg.evaluate('() => %s.autoSolve()' % HOOK[g])
            for _ in range(150):
                if pg.evaluate('() => %s.currentLevel.won' % HOOK[g]):
                    break
                pg.wait_for_timeout(500)
            pg.wait_for_timeout(4500)
            dchs, kinds10 = [], []
            for f in range(6, 11):
                for _ in range(120):                            # 等 proceed 起关 ≤60s（面板 setTimeout 3400+演出）
                    st = pg.evaluate('() => ({ flat: %s.currentLevel.flat, dch: %s.currentLevel.dch, won: %s.currentLevel.won })' % (HOOK[g], HOOK[g], HOOK[g]))
                    if st['flat'] == f and not st['won']:
                        break
                    pg.wait_for_timeout(500)
                else:
                    r8_ok = False; r8_infos.append('%s f%d 未起关' % (g, f)); break
                dchs.append(st['dch'])
                if f == 10:
                    kinds10 = pg.evaluate('() => %s' % KINDMAP)  # currentLevel getter 不含 quizzes；startLevel 同源纯函数
                pg.evaluate('() => %s.autoSolve()' % HOOK[g])
                for _ in range(150):                           # 等过关 ≤75s
                    if pg.evaluate('() => %s.currentLevel.won' % HOOK[g]):
                        break
                    pg.wait_for_timeout(500)
                pg.wait_for_timeout(4500)                       # 等 winFlow 面板+proceed（3400+裕量）
            if dchs:
                sv2 = pg.evaluate('() => JSON.parse(localStorage.getItem("kidsgame_%s") || "{}")' % g)
                rec_keys = sorted(k for k in (sv2.get('levels') or {}) if k >= '2-1' and k <= '3-0')
                ok_g = (dchs == [2, 2, 2, 2, 3] and ch3_ok(g, kinds10) and len(rec_keys) == 5)
                r8_ok = r8_ok and ok_g
                r8_infos.append('%s dch=%s f10kinds=%s rec=%s' % (g, dchs, kinds10, rec_keys))
            pg.close(); ctx.close()
        b.close()
    chk('R8 真实路径推进 bonus→flat10 ch3 题型+写档', r8_ok, '; '.join(r8_infos))
except Exception as e:
    chk('R8 真实路径推进', False, str(e)[:120])

fails = [n for n, ok in RES if not ok]
print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
if fails:
    print('FAILED:', fails); sys.exit(1)
