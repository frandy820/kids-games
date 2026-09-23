# -*- coding: utf-8 -*-
"""batch34 全量回归：三复验 + clips 注入 + 家长门抽测 + 两级入口 + href 全可达 + 真实路径推进
（quiz 形状探针实证后校准：HC={cups,swaps,start,answer,anim}；SO={words,opts,picked}；DC={kind,scene,ask,answer,grid}）
"""
import os, sys, re, json, subprocess
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))

GAMES = ['hidecup', 'sentorder', 'datacollect']

# R1-R3 三款独立复验（子进程串行）
for g in GAMES:
    r = subprocess.run([sys.executable, os.path.join(BASE, 'verify_batch34.py'), g],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = (r.stdout or '').strip().split('\n')[-1] if r.stdout else ''
    chk('R%d %s 复验全绿' % (len(RES) + 1, g), r.returncode == 0 and 'PASS' in (r.stdout or ''), tail)

# R4 clips 注入（每款键语音映射在场；per 款抽验键含名音）
ok4, info4 = True, []
KEYS = {
    'hidecup':   ['hc_tut_watch', 'hc_tut_turn', 'hc_hint', 'hc_right', 'hc_wrong', 'hc_show', 'hc_n_rabbit', 'hc_n_bear', 'hc_n_duck'],
    'sentorder': ['so_tut_watch', 'so_tut_turn', 'so_hint', 'so_right', 'so_wrong_order', 'so_wrong_word'],
    'datacollect': ['dc_tut_watch', 'dc_tut_turn', 'dc_hint', 'dc_right', 'dc_wrong', 'dc_q_count', 'dc_q_most',
                    'dc_q_sum', 'dc_q_diff', 'dc_q_change_up', 'dc_q_change_dn', 'dc_q_total_up', 'dc_q_total_dn',
                    'dc_scale', 'dc_n_rabbit', 'dc_n_sheep', 'dc_n_duck'],
}
for g, keys in KEYS.items():
    s = open(os.path.join(BASE, g, 'index.html'), encoding='utf-8').read()
    missing = [k for k in keys if ("'" + k + "'") not in s and ('"' + k + '"') not in s]
    if 'data:audio/mpeg;base64' not in s or missing:
        ok4 = False; info4.append('%s miss=%s' % (g, missing))
chk('R4 三款 clips 键+注入在场', ok4, info4 or 'ok')

# R5 家长门抽测（hidecup 真实页：KIDS 在场+家长入口+存档会话字段）
from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--mute-audio'])
        pg = b.new_page()
        pg.goto('file:///' + os.path.join(BASE, 'hidecup', 'index.html').replace(chr(92), '/'))
        pg.wait_for_timeout(3000)
        has_kids = pg.evaluate('() => typeof KIDS !== "undefined"')
        has_lock = pg.evaluate('() => document.body.innerHTML.includes("家长")')
        sv = pg.evaluate('() => { const s = localStorage.getItem("kidsgame_hidecup"); return s ? JSON.parse(s) : null; }')
        pg.close(); b.close()
    chk('R5 家长门抽测 KIDS+家长面板+存档', bool(has_kids) and bool(has_lock) and bool(sv and sv.get('v') == '1.0'),
        'KIDS=%s parent=%s v=%s' % (has_kids, has_lock, sv and sv.get('v')))
except Exception as e:
    chk('R5 家长门抽测', False, str(e)[:80])

# R6 两级入口：主入口 120 卡（2026-09-15 核：g115+ 加款后环境真值，原 102=b34 收官快照已过时）
#   + batch34 入口 3 卡 + 三款子页存在
main = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
n_main = len(re.findall(r'class="card" href="([^"]+)"', main))
ent = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()
n_ent = len(re.findall(r'href="\w+/index\.html"', ent))
subs = [os.path.exists(os.path.join(BASE, g, 'index.html')) for g in GAMES]
b34_main = len(re.findall(r'class="card" href="batch34/', main))
chk('R6 两级入口 120+3+子页', n_main == 120 and n_ent == 3 and all(subs) and b34_main == 3,
    'main=%d b34inMain=%d ent=%d subs=%s' % (n_main, b34_main, n_ent, subs))

# R7 href 全可达（主入口+batch34 入口所有相对链接目标存在）
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
HOOK = {'hidecup': 'HC', 'sentorder': 'SO', 'datacollect': 'DC'}
# ch3 题型族（f10=dch3）[探针校准]：HC ch3=杯3+换2（§0.82）/ SO ch3=5词句+干扰2（§0.83）/
#   DC ch3=3类偶10-24+count3+sum+mostdiff（§3-r14 r14 六族——most 已下线改 mostdiff 差值作答）
CH3MAP = {
    'hidecup':    'genLevel(10).quizzes.map(q => [q.cups, q.swaps.length])',
    'sentorder':  'genLevel(10).quizzes.map(q => [q.words.length, q.opts.length - q.words.length])',
    'datacollect': 'genLevel(10).quizzes.map(q => q.kind)',
}
def ch3_ok(g, vals):
    if len(vals) != 5:
        return False
    if g == 'hidecup':
        return all(c == 3 and s == 2 for c, s in vals)
    if g == 'sentorder':
        return all(L == 5 and d == 2 for L, d in vals)
    return vals == ['count', 'count', 'count', 'sum', 'mostdiff']   # r14 章型题序（数值恒居后）
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
                for _ in range(120):
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
                for _ in range(150):
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
