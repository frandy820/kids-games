# -*- coding: utf-8 -*-
"""batch32 全量回归：三复验 + clips 注入 + 家长门抽测 + 两级入口 + href 全可达 + 真实路径推进
（探针实证：SE/EV quiz 平铺 {kind,...}；RD quiz={steps[],blocks[],filled[],phase,...}）
用法: python verify_final32.py [跳过款名...]（如 "python verify_final32.py robotdance" 跳过该款——
2026-09-15 r11 增补：被跳过款须在收官记录登记原因；断言语义零改动，仅限环境阻塞款隔离用）
"""
import os, sys, re, json, subprocess
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))

GAMES = ['senses', 'robotdance', 'evidence']
SKIP = set(sys.argv[1:])                    # r11 增补：环境阻塞款隔离（跳过须登记，不改断言）
GAMES = [g for g in GAMES if g not in SKIP]

# R1-R3 三款独立复验（子进程串行；30min 硬超时——子进程页面 renderer 死亡会致 evaluate 永挂，禁无限等；
#   r17 收口实测 robotdance 腿 ~20min 贴旧 1200s 上限假挂（断言全过），上限放宽到 1800s——断言语义零改动）
for g in GAMES:
    try:
        r = subprocess.run([sys.executable, os.path.join(BASE, 'verify_batch32.py'), g],
                           capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=1800)
    except subprocess.TimeoutExpired:
        chk('R%d %s 复验全绿' % (len(RES) + 1, g), False, 'subprocess 30min 超时（renderer 挂死）')
        continue
    tail = (r.stdout or '').strip().split('\n')[-1] if r.stdout else ''
    chk('R%d %s 复验全绿' % (len(RES) + 1, g), r.returncode == 0 and 'PASS' in (r.stdout or ''), tail)

# R4 clips 注入（每款键语音映射在场；per 款抽验键含名音/结论句）
ok4, info4 = True, []
KEYS = {
    'senses':    ['sen_tut_watch', 'sen_tut_turn', 'sen_hint', 'sen_right', 'sen_wrong', 'sen_q1', 'sen_q2',
                  'sen_q3', 'sen_q_not', 'sen_q_not2', 'sen_q_cov1', 'sen_q_cov2', 'sen_mw',
                  'sen_n_bell', 'sen_n_ice', 'sen_n_eye', 'sen_n_popcorn', 'sen_n_kitten'],
    'robotdance':['rbd_tut_watch', 'rbd_tut_turn', 'rbd_hint', 'rbd_right', 'rbd_wrong', 'rbd_q', 'rbd_replay', 'rbd_n_clap', 'rbd_n_spin'],
    'evidence':  ['evi_tut_watch', 'evi_tut_turn', 'evi_hint', 'evi_right', 'evi_wrong', 'evi_q1', 'evi_q2', 'evi_q3', 'evi_c_rainwet', 'evi_c_nightowl', 'evi_c_haircut', 'evi_c_playedsandbox'],
}
for g, keys in KEYS.items():
    s = open(os.path.join(BASE, g, 'index.html'), encoding='utf-8').read()
    missing = [k for k in keys if ("'" + k + "'") not in s and ('"' + k + '"') not in s]
    if 'data:audio/mpeg;base64' not in s or missing:
        ok4 = False; info4.append('%s miss=%s' % (g, missing))
chk('R4 三款 clips 键+注入在场', ok4, info4 or 'ok')

# R5 家长门抽测（senses 真实页：KIDS 在场+家长入口+存档会话字段）
from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--mute-audio'])
        pg = b.new_page()
        pg.goto('file:///' + os.path.join(BASE, 'senses', 'index.html').replace(chr(92), '/'))
        pg.wait_for_timeout(3000)
        has_kids = pg.evaluate('() => typeof KIDS !== "undefined"')
        has_lock = pg.evaluate('() => document.body.innerHTML.includes("家长")')
        sv = pg.evaluate('() => { const s = localStorage.getItem("kidsgame_senses"); return s ? JSON.parse(s) : null; }')
        pg.close(); b.close()
    chk('R5 家长门抽测 KIDS+家长面板+存档', bool(has_kids) and bool(has_lock) and bool(sv and sv.get('v') == '1.0'),
        'KIDS=%s parent=%s v=%s' % (has_kids, has_lock, sv and sv.get('v')))
except Exception as e:
    chk('R5 家长门抽测', False, str(e)[:80])

# R6 两级入口：主入口 ≥96 卡（b32 交付基线 96，后批扩容只增不减——2026-09-15 r11 改定值 96 为下界）
#   + batch32 入口 3 卡 + 三款子页存在
main = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
n_main = len(re.findall(r'class="card" href="([^"]+)"', main))
ent = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()
n_ent = len(re.findall(r'href="\w+/index\.html"', ent))
subs = [os.path.exists(os.path.join(BASE, g, 'index.html')) for g in GAMES]
b32_main = len(re.findall(r'class="card" href="batch32/', main))
chk('R6 两级入口 96+3+子页', n_main >= 96 and n_ent == 3 and all(subs) and b32_main == 3,
    'main=%d b32inMain=%d ent=%d subs=%s' % (n_main, b32_main, n_ent, subs))

# R7 href 全可达（主入口+batch32 入口所有相对链接目标存在）
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
#   autoSolve 走 flat6-10 → 断言 dch 推进 [2,2,2,2,3] + flat10=ch3 专属题型族 + 存档记录 2-1..3-0）
from datetime import date
HOOK = {'senses': 'SE', 'robotdance': 'RD', 'evidence': 'EV'}
# ch3 题型族（f10=dch3）：SE 两族混出 / RD steps 全 5 步（探针：steps 长度承载难度）/
#   EV ⊆ 两族（跨关并集==两族断言归 verify_batch32 T3 ch3_union，此处单关口径同 b31 chr）
CH3MAP = {
    'senses':    'genLevel(10).quizzes.map(q => q.kind)',
    'robotdance':'genLevel(10).quizzes.map(q => q.steps.length)',
    'evidence':  'genLevel(10).quizzes.map(q => q.kind)',
}
def ch3_ok(g, vals):
    if g == 'evidence':                             # r17 键基 8 关/章：flat10=dch2 三档 findexact 恒 8 题
        return len(vals) == 8 and set(vals) == {'findexact'}
    if len(vals) != 5:
        return False
    if g == 'senses':
        return set(vals) == {'anti', 'multi', 'comp'}     # r11 dch3=[anti,multi,comp,multi,anti]
    if g == 'robotdance':
        return all(v == 5 for v in vals)
    return set(vals) <= {'findexact', 'findall'}
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
            if g == 'evidence':
                # r17 键基 8 关/章：种 flat0-5（全章1，无前章末矛盾态——迁移 IIFE 不触发）；
                # 恢复当前=flat5 重放点火 → proceed flat6-10 dch=[1,1,2,2,2]，rec 窗 '2-1'..'2-2' 恰 2 键
                levels6 = {'1-%d' % i: {'stars': 3, 'plays': 1} for i in range(6)}
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
                want_dch = [1, 1, 2, 2, 2] if g == 'evidence' else [2, 2, 2, 2, 3]
                want_rec = 2 if g == 'evidence' else 5
                ok_g = (dchs == want_dch and ch3_ok(g, vals10) and len(rec_keys) == want_rec)
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
