# -*- coding: utf-8 -*-
"""batch31 全量回归：三复验 + clips 注入 + 家长门抽测 + 两级入口 + href 全可达 + 真实路径推进
（探针实证：三款 quiz 均平铺——anm/if={kind,ask,opts,answer,...}、chr={chart{cats,values},kind,...}）
"""
import os, sys, re, json, subprocess
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))

GAMES = ['animalmenu', 'iftrain', 'chartread']

# R1-R3 三款独立复验（子进程串行）
for g in GAMES:
    r = subprocess.run([sys.executable, os.path.join(BASE, 'verify_batch31.py'), g],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = (r.stdout or '').strip().split('\n')[-1] if r.stdout else ''
    chk('R%d %s 复验全绿' % (len(RES) + 1, g), r.returncode == 0 and 'PASS' in (r.stdout or ''), tail)

# R4 clips 注入（每款键语音映射在场；per 款抽验键含名音/题面音）
ok4, info4 = True, []
KEYS = {
    'animalmenu': ['anm_tut_watch', 'anm_tut_turn', 'anm_hint', 'anm_right', 'anm_wrong', 'anm_q1', 'anm_q2',
                   'anm_n_carrot', 'anm_n_pinecone',
                   # r11 新增（多食全选/食性分类/食物链方向——SPEC §4 v1+r11）
                   'anm_q_multi', 'anm_q_diet', 'anm_q_chain', 'anm_less', 'anm_more',
                   'anm_h_diet', 'anm_h_chain', 'anm_n_wolf', 'anm_n_sheep', 'anm_n_berry'],
    'iftrain':    ['rai_tut_watch', 'rai_tut_turn', 'rai_hint', 'rai_right', 'rai_wrong', 'rai_q1', 'rai_q2', 'rai_n_umbrella', 'rai_n_kite'],
    'chartread':  ['chr_tut_watch', 'chr_tut_turn', 'chr_hint', 'chr_right', 'chr_wrong', 'chr_q_most', 'chr_q_least', 'chr_q_howmany', 'chr_q_compare', 'chr_q_second', 'chr_q_total', 'chr_n_rabbit'],
}
for g, keys in KEYS.items():
    s = open(os.path.join(BASE, g, 'index.html'), encoding='utf-8').read()
    missing = [k for k in keys if ("'" + k + "'") not in s and ('"' + k + '"') not in s]
    if 'data:audio/mpeg;base64' not in s or missing:
        ok4 = False; info4.append('%s miss=%s' % (g, missing))
chk('R4 三款 clips 键+注入在场', ok4, info4 or 'ok')

# R5 家长门抽测（iftrain 真实页：KIDS 在场+家长入口+存档会话字段）
from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto('file:///' + os.path.join(BASE, 'iftrain', 'index.html').replace(chr(92), '/'))
        pg.wait_for_timeout(3000)
        has_kids = pg.evaluate('() => typeof KIDS !== "undefined"')
        has_lock = pg.evaluate('() => document.body.innerHTML.includes("家长")')
        sv = pg.evaluate('() => { const s = localStorage.getItem("kidsgame_iftrain"); return s ? JSON.parse(s) : null; }')
        pg.close(); b.close()
    chk('R5 家长门抽测 KIDS+家长面板+存档', bool(has_kids) and bool(has_lock) and bool(sv and sv.get('v') == '1.0'),
        'KIDS=%s parent=%s v=%s' % (has_kids, has_lock, sv and sv.get('v')))
except Exception as e:
    chk('R5 家长门抽测', False, str(e)[:80])

# R6 两级入口：主入口 93 卡 + batch31 入口 3 卡 + 三款子页存在
main = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
n_main = len(re.findall(r'class="card" href="([^"]+)"', main))
ent = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()
n_ent = len(re.findall(r'href="\w+/index\.html"', ent))
subs = [os.path.exists(os.path.join(BASE, g, 'index.html')) for g in GAMES]
b31_main = len(re.findall(r'class="card" href="batch31/', main))
chk('R6 两级入口 93+3+子页', n_main >= 93 and n_ent == 3 and all(subs) and b31_main == 3,
    'main=%d(≥93,扩容推进后随批增长) b31inMain=%d ent=%d subs=%s' % (n_main, b31_main, n_ent, subs))

# R7 href 全可达（主入口+batch31 入口所有相对链接目标存在）
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
HOOK = {'animalmenu': 'AN', 'iftrain': 'IF', 'chartread': 'CH'}
# ch3 题型族（f10=dch3）：anm r11=dietclass 食性分放 / ift v2=best+conflict 交错（§0.77 r3）/
# chr r17：CH_LEN 8 → flat10=dch2（换算章三族混出 8 题；四族/八族跨关全现归 verify_batch31 T3，此处单关口径）
CH3MAP = {
    'animalmenu': 'genLevel(10).quizzes.map(q => q.kind)',
    'iftrain':    'genLevel(10).quizzes.map(q => q.kind)',
    'chartread':  'genLevel(10).quizzes.map(q => q.kind)',
}
def ch3_ok(g, vals):
    if g == 'chartread':                             # r17 新键基：flat10=dch2 三族混出，8 题/关
        if len(vals) != 8:
            return False
        return set(vals) <= {'howmany', 'total', 'compare'} and len(set(vals)) >= 2
    if len(vals) != 5:
        return False
    if g == 'animalmenu':
        return set(vals) == {'dietclass'}          # r11：flat10=dch3 食性三盘分放恒 5 题
    if g == 'iftrain':
        return set(vals) == {'best', 'conflict'}        # §0.77 v2（r3）：ch3=best×3+conflict×2 交错
    return set(vals) <= {'most', 'least', 'howmany', 'compare'} and len(set(vals)) >= 2
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        r8_infos = []
        r8_ok = True
        for g in GAMES:
            ctx = b.new_context()
            pg = ctx.new_page()
            url = 'file:///' + os.path.join(BASE, g, 'index.html').replace(chr(92), '/')
            today = date.today().isoformat()
            levels6 = {'1-%d' % i: {'stars': 3, 'plays': 1} for i in range(5)}
            levels6['2-0'] = {'stars': 3, 'plays': 1}
            if g == 'chartread':
                # r17 键基 8 关/章：种 flat0-5（全章1，无 '2-0' 前章末矛盾态——迁移 IIFE 不触发）；
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
                want_dch = [1, 1, 2, 2, 2] if g == 'chartread' else [2, 2, 2, 2, 3]
                want_rec = 2 if g == 'chartread' else 5
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
