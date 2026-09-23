# -*- coding: utf-8 -*-
"""memduel _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r17 难度改造（2026-09-17，AUDIT-78 黄款第 7 位，SPEC-BATCH20 §1-r17-memduel）：
五型 df 数字正背 6-7 / dr 数字倒背 5-6 / lf 字母+cf 颜色（ch3 混出）/ dx 延迟 3.8s+正倒随机。
每关 5→8 题（CH_LEN=8，键基 LEVELS_PER_CH=10）。
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 40 关审计全绿
   + 生成关抽样 5 关全绿 + 专项单元全绿（tapNum/sayW/flat10/flat30/tutorial/dist/duration）
   + duration 双钉：minMs==138760@flat24（SPEC §1-r17 定版；Python 侧硬编码独立字面）
   + estMs 第三源：vwGap==400+7*345+600+300==3715 ≤ GAP 3800（全字符口径）
2a. 预置存档(跳过教学) → 真实点击 flat0（ch1 df 8 题）：首错(晃动+零惩罚+应点卡不 breathe)
    → 窗后重拼 → 通关 8 题 → .k-celebrate 2 星 → 存档 levels['1-0'].stars>=1 → 推进 flat=1
2b. 全新存档 → 教学 看(真实点击+hook 全吞+轻叮 sfx('pop'))→帮(幽灵手指)→独(首对放手)
    真实链路 → md.tutSeen 持久化 → 1-0 写档
2c. flat10（ch2 dr 倒背）：rev 真值（answer=seq 逆序）→ 真实点击通关 8 题 3 星 → 写档 2-0
    + flat20（ch3 lf/cf）：素材面渲染对账（色块 .sw 背景色 / 字母 .cv 文本）
2d. flat30（ch4 dx 延迟+正倒随机）：gap 相位真实链（兔子 gapcall+tip=md_gap 文案+
    gap 期点兔 hop+gap 期点卡拒绝）→ recall 方向指令（键按 mode）→ 通关 8 题 3 星
2e/P1b. 双 viewport(1280x800 横/800x1180 真竖)×四型关(flat0/10/20/30)：
    overflowX==0、记忆卡/候选卡 ≥64、全按钮 ≥64（.k-parentbtn 豁免）、竖屏卡宽锚 86（横 104）、
    截图像素非空白（存 _shots/）；P1b 真竖轮：800x1180 真实 @media 通道（innerHeight>innerWidth）
2f. 生成关种档触达（硬契约）：firstDay=3 天前+bonus30 → lim=12+30=42 → flat40/41 生成关可达：
    MD.start(41) 全链真实通关；nextHint=GEN_HINTS 实算真值（家族 F 行为级）
5. 救援钟（§0.7a/§0.21）：flat≥3 静置 14s+ 重读 hint（按方向分流键）+首空位 breathe；
    错点不重置；miss≥2 应点卡 breathe（答案级梯度）
6. 迁移双例（r17 键基 IIFE）：旧基档 {1-0..1-4,2-0} 一次性重置；
    生成关进度档含 '5-0' 不重置（章号上界放开）
7. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror + md_* 9 条 clips 注入
音频纪律（最高优先级）：INIT_SND 物理层（new Audio/TTS/AudioContext 工厂）context 级
+ STUB_SND（goto 后 stub KIDS.voice.play/queue/say 与 KIDS.audio.sfx/note）+ 种档
settings:{sound:false,tts:false}——三层齐上，不依赖 --mute-audio。
"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥2 → 日限 12+bonus
RESULTS = []
CH_LEN = 8                       # r17：每关 8 题
LEVELS_PER_CH = 10
MODELED_MIN_MS = 138760          # SPEC §1-r17 双钉（verify ⑬ 与本文件 Python 硬编码）
MODELED_MIN_FLAT = 24

INIT_SND = """
(() => {
  window.Audio = function(){ return { play(){ return Promise.reject(new Error('snd-stub')); }, pause(){}, stop(){} }; };
  window.SpeechSynthesisUtterance = function(t){ this.text = t; };
  window.speechSynthesis = { cancel(){}, speak(){}, getVoices(){ return []; } };
  const AC = function(){ return { createOscillator: () => ({ connect(){}, start(){}, stop(){}, frequency: {}, type: '' }),
    createGain: () => ({ connect(){}, gain: { setValueAtTime(){}, exponentialRampToValueAtTime(){} } }),
    createBuffer: () => ({ getChannelData(){ return []; } }),
    createBufferSource: () => ({ connect(){}, start(){} }),
    createBiquadFilter: () => ({ connect(){}, type: '', frequency: {} }),
    destination: {}, currentTime: 0, sampleRate: 44100, state: 'running', resume(){ return Promise.resolve(); } }; };
  window.AudioContext = AC; window.webkitAudioContext = AC;
})();
"""

STUB_SND = """() => {
  KIDS.voice.play = function(){}; KIDS.voice.queue = function(){}; KIDS.voice.say = function(){};
  KIDS.audio.sfx = function(){}; KIDS.audio.note = function(){};
}"""


def safe(s):                                   # GBK 控制台打不出中文 → ASCII 转义后再打印
    return str(s).encode('ascii', 'backslashreplace').decode('ascii')


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', safe(name), ('| ' + safe(detail) if detail else ''))
    return ok


def est_ms(s):                                 # estMs Python 第三源（四方同步之一；全字符口径）
    return len(s) * 345 + 600


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'memduel', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0.0},
        'restTip': {'day': '', 'shown': 0},
        'md': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // LEVELS_PER_CH + 1, f % LEVELS_PER_CH)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_memduel", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path, floor=10.0):
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(path)).convert('L').resize((160, 100))
        px = list(im.getdata())
        sd = statistics.pstdev(px)
        return sd > floor, 'PIL pixel stdev=%.1f' % sd
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL unavailable)' % n


def click_card(page, i):
    loc = page.locator('.card[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def quiz_of(page):
    return page.evaluate('MD.quiz')


def wait_recall(page, timeout_ms=30000):
    """等当前题到 recall（show→[gap]→recall 真实时长：展示 ~5s+延迟 3.8s）"""
    return page.wait_for_function(
        "() => { const q = MD.quiz; return !q || q.phase === 'recall'; }", timeout=timeout_ms)


def play_level(page, first_wrong=False, tag='', expect_stars=None):
    """真实点击打完当前关（可先在首题整关错一次）；返回完成题数"""
    wrong_done = not first_wrong
    quizzes = 0
    while quizzes < 40:
        st0 = page.evaluate('MD.currentLevel ? MD.currentLevel.step : -1')
        q = quiz_of(page)
        if q is None:
            break
        if q['phase'] != 'recall':
            wait_recall(page)
            q = quiz_of(page)
            if q is None:
                break
        if not wrong_done:
            wrong_done = True
            # 错拼：位 0=干扰卡，其余按 answer（拼满即错）
            ans_vals = q['answer']
            dis = next((i for i, o in enumerate(q['opts']) if o['v'] not in set(ans_vals)), None)
            if dis is not None:
                click_card(page, dis)
                page.wait_for_timeout(120)
                for k in range(1, len(ans_vals)):
                    hit = next((i for i, o in enumerate(q['opts']) if o['v'] == ans_vals[k]), None)
                    if hit is not None:
                        click_card(page, hit)
                        page.wait_for_timeout(100)
            page.wait_for_timeout(1300)      # 错点防重入窗 1000ms + 清空演出
            st = page.evaluate('''() => {
              const L = MD.currentLevel, q = MD.quiz;
              const ok = document.querySelector('.card.breathe');
              return {retries: L.retries, step: L.step, miss: q.miss,
                      built0: q.built[0],
                      kept: q.built.filter(x => x !== null).length,
                      ansBreathe: !!ok};
            }''')
            check('%sfirst wrong: zero penalty (step/miss) + wrong slot cleared + kept=len-1 + no answer breathe' % tag,
                  st['retries'] == 1 and st['step'] == 0 and st['miss'] == 1 and
                  st['built0'] is None and st['kept'] == len(ans_vals) - 1 and not st['ansBreathe'], str(st))
            continue
        # 正确拼：按 answer 逐位点（每轮重读 built 状态，跳过已对位；末位补上即拼满判对推进）
        for k in range(len(q['answer'])):
            cur = quiz_of(page)
            if cur is None or cur['step'] != q['step'] or cur.get('solved'):
                break                      # 已拼满推进（或关卡收尾）——停手防越界新题
            if k >= len(cur['built']):
                break
            if cur['built'][k] is not None and cur['opts'][cur['built'][k]]['v'] == q['answer'][k]:
                continue
            hit = -1
            used = set(x for x in cur['built'] if x is not None)
            for i, o in enumerate(cur['opts']):
                if i not in used and o['v'] == q['answer'][k]:
                    hit = i
                    break
            if hit < 0:
                check('%sfill card k=%d not found' % (tag, k), False)
                return quizzes
            click_card(page, hit)
            page.wait_for_timeout(90)
        page.wait_for_function(
            '(s) => { const L = MD.currentLevel; return !L || L.done || L.step === s + 1; }',
            arg=st0, timeout=15000)
        page.wait_for_function(                  # 答对演出窗 2100ms：等 locked 解锁再点下一题
            '() => { const L = MD.currentLevel; return !L || L.done || !L.locked; }', timeout=15000)
        page.wait_for_timeout(250)               # renderQuiz 后新题 DOM 完全落地
        quizzes += 1
    page.wait_for_selector('.k-celebrate', timeout=30000)
    if expect_stars is not None:
        stars = page.locator('.k-celebrate .k-star').count()
        check('%scelebrate stars == %d' % (tag, expect_stars), stars == expect_stars, 'stars=%d' % stars)
    return quizzes


def main():
    offline_bad = []
    page_errors = []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            # ---- 1. verify=1 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(INIT_SND)
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=90000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total + layoutOk + genSampleOk',
                  vj['pass'] == vj['total'] and vj['layoutOk'] and vj['genSampleOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify 40-level audit all ok (8 quizzes each)',
                  len(vj['levels']) == 40 and all(v['ok'] for v in vj['levels'].values()),
                  'levels=%d' % len(vj['levels']))
            check('verify gen-level sample all ok (flat40-44)',
                  len(vj['gen']) == 5 and all(v['ok'] for v in vj['gen'].values()),
                  str({k: v['dch'] for k, v in vj['gen'].items()}))
            check('verify units all ok (tapNum/sayW/flat0/flat10/flat30/tutorial/dist/duration)',
                  all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify smokes all ok (flat0/flat10/flat30/layout)',
                  all(v.get('ok', True) for v in vj['smokes'].values()),
                  str({k: v for k, v in vj['smokes'].items() if not v.get('ok', True)}))
            check('verify layout sims 12/12 (3 channels x 4 flats)',
                  len(vj['smokes']['layout']['sims']) == 12 and
                  all(s['pass'] for s in vj['smokes']['layout']['sims']))
            dur = vj['units']['duration']
            check('duration pin: minMs==%d@flat%d + winOk + parity + LEVEL_MIN 40000' %
                  (MODELED_MIN_MS, MODELED_MIN_FLAT),
                  dur['ok'] and dur['minMs'] == MODELED_MIN_MS and dur['minFlat'] == MODELED_MIN_FLAT,
                  str(dur))
            # estMs Python 第三源（全字符口径）：gap 句 7 字 vw=3715 ≤ 3800
            vw_gap_py = 400 + est_ms('先点一下小兔子') + 300
            check('estMs python 3rd source: vwGap==3715<=GAP3800, vwDirF==2335<=DEC16000 (page parity)',
                  vw_gap_py == 3715 and dur['vwGap'] == vw_gap_py and dur['vwDirF'] == 2335,
                  'py=%s page=%s/%s' % (vw_gap_py, dur['vwGap'], dur['vwDirF']))
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + 真实点击通关（2 星）+ 写档 + 推进 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(INIT_SND)
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MD && MD.currentLevel', timeout=8000)
            n_clips = pg.evaluate(
                "Object.keys(KIDS.voice.clips).filter(k => k.indexOf('md_') === 0).length")
            # T46 阶段2（2026-09-19）：+32 值词段（md_v_d1-9/md_v_lA-M 12 用+I 备/md_v_c 10）
            check('md_* clips injected = 41 (r17 9 句 + T46 值词 32)', n_clips == 41, 'n=%s' % n_clips)
            lv = pg.evaluate('MD.currentLevel')
            check('start at flat0 ch1 (8 quizzes, kind df)', lv and lv['ch'] == 1 and lv['n'] == 8, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('MD.tutorial') == 'none')
            q = quiz_of(pg)
            check('quiz hook contract {kind df,mat dgt,mode fwd,delay false,gapMs 0,phase show,seq 6-7}',
                  q and q['kind'] == 'df' and q['mat'] == 'dgt' and q['mode'] == 'fwd' and
                  q['delay'] is False and q['gapMs'] == 0 and q['phase'] == 'show' and
                  6 <= len(q['seq']) <= 7 and q['step'] == 0 and q['miss'] == 0, str(q and q['kind']))
            n = play_level(pg, first_wrong=True, tag='[2a] ', expect_stars=2)
            check('finished 8 quizzes by real click', n == CH_LEN, 'quizzes=%d' % n)
            pg.wait_for_timeout(5400)            # celebrate + 写档 + 推进
            lv2 = pg.evaluate('MD.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_memduel")'))
            s10 = saved['levels'].get('1-0', {}).get('stars', 0)
            check('save levels["1-0"].stars >= 1 (actual 2)', s10 >= 1, 'stars=%s' % s10)
            check('md.tutSeen kept true', (saved.get('md') or {}).get('tutSeen') is True,
                  str(saved.get('md')))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入+轻叮)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(INIT_SND)
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MD && MD.currentLevel', timeout=8000)
            pg.wait_for_function("MD.tutorial === 'watch'", timeout=5000)
            pg.evaluate('window.__sfx = []; KIDS.audio.sfx = n => window.__sfx.push(n);')
            swallowed_hook = pg.evaluate('MD.tapNum(0)') is False    # 演示期 hook 输入全吞
            qw0 = quiz_of(pg)
            # 演示期真实点击也吞（locked 门 → sfx pop）
            if qw0:
                hit0 = next(i for i, o in enumerate(qw0['opts']) if o['v'] == qw0['answer'][0])
                click_card(pg, hit0)
            pg.wait_for_timeout(700)
            st = pg.evaluate('''() => ({step: MD.currentLevel.step, retries: MD.currentLevel.retries,
                                        tut: MD.tutorial, pop: window.__sfx.indexOf('pop') >= 0})''')
            check('tutorial watch swallows input (real click + hook) with pop ding (0x22)',
                  swallowed_hook and st['step'] == 0 and st['retries'] == 0 and
                  st['tut'] == 'watch' and st['pop'], str(st))
            pg.wait_for_function("MD.tutorial === 'help'", timeout=40000)   # 等"看"演示完成
            q = quiz_of(pg)
            check('tutorial watch done -> level reset to quiz 0',
                  q and q['step'] == 0 and q['miss'] == 0, str(q and q['kind']))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=12000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost visible (after show window, r17 showP-aware)', ghost_shown)
            n = play_level(pg, tag='[2b] ')       # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (8 quizzes)', n == CH_LEN, 'quizzes=%d' % n)
            solo_at = pg.evaluate('MD.tutorial')
            check('tutorial went solo after first win', solo_at == 'solo', 'tut=%s' % solo_at)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_memduel")'))
            check('md.tutSeen persisted after tutorial',
                  (saved.get('md') or {}).get('tutSeen') is True, str(saved.get('md')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. flat10（ch2 dr 倒背）真值+通关；flat20（ch3 lf/cf）素材面渲染 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(INIT_SND)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MD && MD.currentLevel', timeout=8000)
            pg.wait_for_timeout(1500)
            lv = pg.evaluate('MD.currentLevel')
            check('seeded ch1 done -> start flat=10 ch2', lv and lv['flat'] == 10 and lv['ch'] == 2, str(lv))
            wait_recall(pg)
            q10 = quiz_of(pg)
            rev_ok = q10 and q10['kind'] == 'dr' and q10['mode'] == 'rev' and \
                all(q10['answer'][k] == q10['seq'][len(q10['seq']) - 1 - k] for k in range(len(q10['seq'])))
            check('flat10 first quiz: dr rev, answer=exact reverse of seq', rev_ok,
                  'seq=%s ans=%s' % (q10 and q10['seq'], q10 and q10['answer']))
            n = play_level(pg, tag='[2c-dr] ', expect_stars=3)
            check('ch2 level real-click win (8 quizzes)', n == CH_LEN, 'quizzes=%d' % n)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_memduel")'))
            s20 = saved['levels'].get('2-0', {}).get('stars', 0)
            check('save levels["2-0"].stars >= 1 (actual 3)', s20 >= 1, 'stars=%s' % s20)
            # flat20（ch3）：素材面渲染对账
            started = pg.evaluate('(f) => MD.start(f)', 20)
            pg.wait_for_timeout(400)
            q20 = quiz_of(pg)
            mat20 = q20 and q20['mat']
            wait_recall(pg)
            m = pg.evaluate('''() => {
              const cards = [...document.querySelectorAll('#card-pool .card')];
              const q = MD.quiz;
              return {kind: q.kind, mat: q.mat, n: cards.length,
                      sw: cards.filter(c => c.querySelector('.sw')).length,
                      cv: cards.filter(c => c.querySelector('.cv')).length,
                      swBg: cards[0] && cards[0].querySelector('.sw') ?
                            cards[0].querySelector('.sw').style.background : '',
                      cvText: cards[0] && cards[0].querySelector('.cv') ?
                              cards[0].querySelector('.cv').textContent : ''};
            }''')
            if mat20 == 'col':
                face_ok = m['sw'] == m['n'] and (m['swBg'].startswith('rgb') or m['swBg'].startswith('#'))
            else:
                face_ok = m['cv'] == m['n'] and len(m['cvText']) == 1 and m['cvText'].isalpha()
            check('flat20 ch3 first quiz face: kind lf/cf + mat-specific face (swatch/letter)',
                  started and q20 and q20['kind'] in ('lf', 'cf') and m['n'] >= 7 and face_ok, str(m))
            ctx.close()

            # ---- 2d. flat30（ch4 dx 延迟+正倒随机）：gap 真实链 → 方向指令 → 通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(INIT_SND)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(30), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MD && MD.currentLevel', timeout=8000)
            pg.wait_for_timeout(1500)
            lv = pg.evaluate('MD.currentLevel')
            check('seeded ch1-3 done -> start flat=30 ch4', lv and lv['flat'] == 30 and lv['ch'] == 4, str(lv))
            pg.evaluate('''() => { window.__vlog = [];
              KIDS.voice.play = k => window.__vlog.push(String(k)); }''')
            # gap 相位真实链
            pg.wait_for_function("MD.quiz && MD.quiz.phase === 'gap'", timeout=20000)
            g = pg.evaluate('''() => ({
              rabbit: document.getElementById('btn-rabbit').classList.contains('gapcall'),
              tip: document.getElementById('tip-text').textContent,
              gapMs: MD.quiz.gapMs, delay: MD.quiz.delay, kind: MD.quiz.kind})''')
            snap = json.dumps(pg.evaluate('MD.quiz'))
            rj = pg.evaluate('MD.tapNum(0)')     # gap 期点卡拒绝
            no_swallow = json.dumps(pg.evaluate('MD.quiz')) == snap
            check('gap phase: rabbit gapcall + tip=gap text + dx shape + tap rejected no-swallow',
                  g['rabbit'] and g['tip'] == '先点一下小兔子' and g['gapMs'] == 3800 and
                  g['delay'] is True and g['kind'] == 'dx' and rj is False and no_swallow, str(g))
            box = pg.locator('#btn-rabbit').bounding_box()
            page_mouse = pg.mouse
            page_mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
            pg.wait_for_timeout(250)
            hop = pg.evaluate("document.getElementById('btn-rabbit').classList.contains('hop')")
            check('gap phase: rabbit tap -> hop (interference task alive)', hop)
            pg.wait_for_function("MD.quiz && MD.quiz.phase === 'recall'", timeout=20000)
            r = pg.evaluate('''() => ({mode: MD.quiz.mode,
              tip: document.getElementById('tip-text').textContent,
              rabbitCalm: !document.getElementById('btn-rabbit').classList.contains('gapcall'),
              poolOpen: !document.getElementById('card-pool').classList.contains('locked'),
              gapSaid: window.__vlog.indexOf('md_gap') >= 0,
              dirF: window.__vlog.indexOf('md_dir_fwd') >= 0,
              dirR: window.__vlog.indexOf('md_dir_rev') >= 0})''')
            dir_ok = r['dirF'] if r['mode'] == 'fwd' else r['dirR']
            other_ok = not (r['dirF'] and r['dirR'])
            check('recall after gap: direction cue played (mode-matched, voice channel) + tip text + pool open',
                  r['gapSaid'] and dir_ok and other_ok and r['rabbitCalm'] and r['poolOpen'] and
                  r['tip'] == ('照刚才的顺序，拼出来' if r['mode'] == 'fwd' else '从最后一张开始，倒着拼'),
                  str(r))
            n = play_level(pg, tag='[2d-dx] ', expect_stars=3)
            check('ch4 dx level real-click win (8 quizzes through gap each)', n == CH_LEN, 'quizzes=%d' % n)
            ctx.close()

            # ---- 2e/P1b. 双 viewport × 四型关 + 竖屏卡宽锚 + 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                ctx.add_init_script(INIT_SND)
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(5), bonus=30))
                pg.goto(URL)
                pg.evaluate(STUB_SND)
                pg.wait_for_function('window.MD && MD.currentLevel', timeout=8000)
                pg.wait_for_timeout(1200)        # 入场动画落定
                if vp[0] == 800:
                    real_port = pg.evaluate('window.innerHeight > window.innerWidth')
                    check('P1b real portrait viewport (800x1180 -> @media channel active)', real_port)
                for tag, flat in [('df', 0), ('dr', 10), ('mix3', 20), ('dx', 30)]:
                    pg.evaluate('(f) => MD.start(f)', flat)
                    pg.wait_for_timeout(1500)
                    m = pg.evaluate('''() => {
                      const de = document.documentElement;
                      const bad = [];
                      document.querySelectorAll('button').forEach(e => {
                        if (e.classList.contains('k-parentbtn')) return;
                        if (e.offsetWidth > 4 && e.offsetHeight > 4 && (e.offsetWidth < 64 || e.offsetHeight < 64))
                          bad.push((e.id || e.className) + ':' + e.offsetWidth + 'x' + e.offsetHeight);
                      });
                      const mc = [...document.querySelectorAll('#memo-area .mcard')];
                      const pc = [...document.querySelectorAll('#card-pool .card')];
                      return {ox: de.scrollWidth - de.clientWidth, bad: bad,
                              mc: mc.length, mcMin: mc.length ? Math.min(...mc.map(c => Math.min(c.offsetWidth, c.offsetHeight))) : 0,
                              pc: pc.length, pcMin: pc.length ? Math.min(...pc.map(c => Math.min(c.offsetWidth, c.offsetHeight))) : 0,
                              mcW: mc.length ? mc[0].offsetWidth : 0};
                    }''')
                    expect_w = 86 if vp[0] == 800 else 104
                    check('%s %s overflowX==0 + mcards>=5@64 + pool>=7@64 + buttons>=64' %
                          ('P1b' if vp[0] == 800 else 'vp', tag),
                          m['ox'] == 0 and m['mc'] >= 5 and m['mcMin'] >= 64 and
                          m['pc'] >= 7 and m['pcMin'] >= 64 and not m['bad'],
                          'ox=%s mc=%s/%s pc=%s/%s bad=%s' %
                          (m['ox'], m['mc'], m['mcMin'], m['pc'], m['pcMin'], m['bad'][:2]))
                    anchor_ok = abs(m['mcW'] - expect_w) <= 2
                    check('%s %s mcard width anchor %dpx' %
                          ('P1b' if vp[0] == 800 else 'vp', tag, expect_w), anchor_ok, 'mcW=%s' % m['mcW'])
                    shot = SHOTS / ('memduel-%s-vp%dx%d.png' % (tag, vp[0], vp[1]))
                    pg.screenshot(path=str(shot))
                    ok, detail = png_nonblank(shot, floor=10.0)
                    check('screenshot %s %dx%d non-blank (stdev>10)' % (tag, vp[0], vp[1]), ok, detail)
                ctx.close()

            # ---- 2f. 生成关种档触达（硬契约）：lim=42 → flat40/41 生成关全链 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(INIT_SND)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(40), bonus=30))
            pg = ctx.new_page(); watch(pg, '2f')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MD && MD.currentLevel', timeout=8000)
            lim = pg.evaluate('KIDS.calendar.limit(Infinity)')
            check('seeded save (firstDay -3d + bonus30) -> limit=42 (reaches gen flat40/41)',
                  lim == 42, 'lim=%s' % lim)
            started = pg.evaluate('(f) => MD.start(f)', 41)
            pg.wait_for_timeout(1000)
            lv41 = pg.evaluate('MD.currentLevel')
            check('MD.start(41) reachable -> flat=41 gen level (ch=5, dch in 1-4)',
                  started and lv41 and lv41['flat'] == 41 and lv41['ch'] == 5 and 1 <= lv41['dch'] <= 4,
                  str(lv41))
            hint41 = pg.evaluate('nextHint(41)')          # 家族 F：生成关预告=实算下一关难度章
            want41 = pg.evaluate('GEN_HINTS[genLevel(42).dch - 1]')
            check('gen level nextHint(41) = GEN_HINTS[genLevel(42).dch-1] (family F real calc)',
                  hint41 == want41, 'got=%s want=%s' % (hint41, want41))
            hint40 = pg.evaluate('nextHint(40)')
            want40 = pg.evaluate('GEN_HINTS[genLevel(41).dch - 1]')
            check('gen level nextHint(40) real calc too', hint40 == want40, 'got=%s' % hint40)
            n = play_level(pg, tag='[2f] ')
            check('gen level 41 real-click full chain win (8 quizzes -> celebrate)', n == CH_LEN,
                  'quizzes=%d' % n)
            pg.wait_for_timeout(5400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_memduel")'))
            s51 = saved['levels'].get('5-1', {}).get('stars', 0)
            check('gen progress saved under new keybase (5-1 stars>=1)', s51 >= 1,
                  'stars=%s keys=%s' % (s51, [k for k in saved['levels'] if k.startswith('5-')]))
            ctx.close()

            # ---- 5. 救援钟：flat3 静置 14s+ hint 重读（方向分流键）+首空位 breathe；错点不重置 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(INIT_SND)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MD && MD.currentLevel', timeout=8000)
            check('rescue scenario starts at flat=3 (>=3, ch1 df)',
                  pg.evaluate('MD.currentLevel.flat') == 3)
            wait_recall(pg)                     # 救援钟锚=recall 起点（§1-r17）
            pg.evaluate('''() => { window.__vlog = [];
              KIDS.voice.play = k => window.__vlog.push(String(k)); }''')
            t0 = time.time()
            pg.wait_for_timeout(8000)           # 静置 8s → 错拼一次（干扰卡+answer[1:]，不该重置救援钟）
            qw = quiz_of(pg)
            ans_vals = set(qw['answer'])
            dis = next((i for i, o in enumerate(qw['opts']) if o['v'] not in ans_vals), None)
            if dis is not None:
                click_card(pg, dis)
                pg.wait_for_timeout(120)
                for k in range(1, len(qw['answer'])):
                    hit = next((i for i, o in enumerate(qw['opts']) if o['v'] == qw['answer'][k]), None)
                    if hit is not None:
                        click_card(pg, hit)
                        pg.wait_for_timeout(90)
            pg.wait_for_timeout(1400)           # t0+9.4s：14s 阈值未到，救援不应响（miss=1 窗已过）
            early = [k for k in pg.evaluate('window.__vlog') if k == 'md_hint']
            check('rescue not fired before 14s threshold (wrong tap did NOT reset)', early == [],
                  'early=%s' % early)
            stw = pg.evaluate('MD.quiz')
            # miss=2：对位保留的题面只需补一张干扰卡到首空位即拼满再错（b19 P1 口径）
            if stw and stw['miss'] == 1:
                used = set(x for x in stw['built'] if x is not None)
                dis2 = next((i for i, o in enumerate(stw['opts'])
                             if i not in used and o['v'] not in ans_vals), None)
                if dis2 is not None:
                    click_card(pg, dis2)
            pg.wait_for_timeout(1300)
            pulse_seen = bool(pg.evaluate("!!document.querySelector('.card.breathe')"))
            try:                                 # 救援在 ~14s 响（静置钟不被错点重置 §0.7a）
                pg.wait_for_function(
                    "() => window.__vlog.indexOf('md_hint') >= 0", timeout=10000)
            except Exception:
                pass
            pg.wait_for_timeout(300)
            resc = [k for k in pg.evaluate('window.__vlog') if k == 'md_hint']
            slot_bre = bool(pg.evaluate("!!document.querySelector('.mcard.breathe')"))
            elapsed = time.time() - t0
            check('rescue fired by idle 14s+ (wrong taps did NOT reset) + answer breathe (miss>=2) + slot breathe',
                  pulse_seen and len(resc) >= 1 and slot_bre and elapsed < 24,
                  'breathe=%s slotBre=%s rescues=%s wall=%.1fs' % (pulse_seen, slot_bre, len(resc), elapsed))
            ctx.close()

            # ---- 6. 迁移双例（r17 键基 IIFE）：旧基档重置 / 生成关进度档保留 ----
            old_save = {
                'v': '1.0', 'game': 'memduel', 'firstDay': OLD, 'lastDay': TODAY,
                'levels': {'1-0': {'stars': 3, 'plays': 2}, '1-1': {'stars': 2, 'plays': 1},
                           '1-2': {'stars': 3, 'plays': 1}, '1-3': {'stars': 2, 'plays': 1},
                           '1-4': {'stars': 3, 'plays': 1}, '2-0': {'stars': 1, 'plays': 1}},
                'dailyMin': {}, 'bonus': {}, 'settings': {'sound': False, 'tts': False, 'vol': 0.0},
                'restTip': {'day': '', 'shown': 0}, 'md': {'tutSeen': True},
            }
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(INIT_SND)
            ctx.add_init_script('localStorage.setItem("kidsgame_memduel", ' +
                                json.dumps(json.dumps(old_save)) + ')')
            pg = ctx.new_page(); watch(pg, 'mig-old')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MD && MD.currentLevel', timeout=8000)
            after = json.loads(pg.evaluate('localStorage.getItem("kidsgame_memduel")'))
            check('old-keybase save (1-0..1-4 + 2-0 contradiction) -> one-time reset',
                  after['levels'] == {} and pg.evaluate('MD.currentLevel.flat') == 0,
                  'levels=%s' % list(after['levels'].keys())[:5])
            ctx.close()
            gen_save = {
                'v': '1.0', 'game': 'memduel', 'firstDay': OLD, 'lastDay': TODAY,
                'levels': {'5-0': {'stars': 2, 'plays': 1}, '5-1': {'stars': 1, 'plays': 1}},
                'dailyMin': {}, 'bonus': {TODAY: 30},
                'settings': {'sound': False, 'tts': False, 'vol': 0.0},
                'restTip': {'day': '', 'shown': 0}, 'md': {'tutSeen': True},
            }
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(INIT_SND)
            ctx.add_init_script('localStorage.setItem("kidsgame_memduel", ' +
                                json.dumps(json.dumps(gen_save)) + ')')
            pg = ctx.new_page(); watch(pg, 'mig-gen')
            pg.goto(URL)
            pg.evaluate(STUB_SND)
            pg.wait_for_function('window.MD && MD.currentLevel', timeout=8000)
            after2 = json.loads(pg.evaluate('localStorage.getItem("kidsgame_memduel")'))
            check('gen-progress save (5-0/5-1 keys) NOT reset (chapter upper bound open)',
                  '5-0' in after2['levels'] and '5-1' in after2['levels'],
                  'levels=%s' % list(after2['levels'].keys())[:5])
            ctx.close()
        finally:
            browser.close()

    # ---- 7. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
