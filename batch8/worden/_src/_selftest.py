# -*- coding: utf-8 -*-
"""worden _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
0. MUTE 静音双保险（r19 红线，r32 补装 words r28 定稿 function 版）：每 context 挂 MUTE_INIT
   init_script + 种档 sound:false/tts:false/vol:0（r28 §7⑤ 种档完整 core 字段）
1. ?verify=1 → title=VERIFY PASS（3-15s 轮询）+ JSON pass==total + units/smokes 全绿
   （含 48 词库覆盖 40 关 / 形近干扰 12 组 ≠库内词 / blank 专项 / sound2pic 开题自动播 en stub 计数 / 卡文本同源）
2a. 预置存档(跳过教学) → 真实点击：首错零惩罚不 pulse → 通关 .k-celebrate 2星 → 推进 flat=1 写档
2b. 全新存档 → 教学 看(吞输入)→帮(幽灵手指)→独 真实链路 → wen.tutSeen 持久化
2c. 章 3 形近干扰（flat10 qi0）：干扰卡 ∉词库在场 + 真实点它灰掉零惩罚 + 真实通关
2d. 章 2 听音题（flat5 lv0=2 选 r32 保留起步坡）：喇叭卡真实点=重播 en clip、听按钮 3s 节流、WEN.replay() 直通
2e. blank 缺字母补全（r32 新增，flat10 qi2）：真实点错字母灰零惩罚不推进 + 点对 gap 填入+
    词完整==target+播整词 en（stub 计数）+ 通关
2f. dch4 blank 点错专项（r32 审查 minor7，flat15 qi2 固定位）：真实点错字母——错反馈链
    （灰掉+pe:none+不推进+gap 完好+首错不 pulse+wen_wrong）+miss 计数 + 点对仍可续答
3. flat≥3 救援钟：真实错点不重置 → 静置 16s 救援触发（重读题面 stub 计数）
3b. blank 题救援钟（r32 审查 minor6，flat10 qi2）：blank 静置 16s 救援=重读 wen_q3
    （SPEC §R4：14s 门+1s 轮询窗 [14,15]s，恰一次=lastAct 重置）
4. 双 viewport(1280x800/800x1180)：overflowX==0、触摸目标 ≥64（含 SVG 热区）、主按钮 ≥96、截图非空白
5. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
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
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12
RESULTS = []
# r32 词库 48（原 24 + 新 24——与 game-data.js WORDS 严格一致）
WORD_LIST = ['cat', 'dog', 'fish', 'bird', 'rabbit', 'sheep', 'duck', 'mouse', 'horse',
             'apple', 'banana', 'orange', 'grape', 'pear', 'peach', 'lemon', 'melon',
             'egg', 'milk', 'cake', 'rice', 'bread', 'soup',
             'sun', 'moon', 'star', 'rain', 'cloud', 'snow', 'leaf', 'wind',
             'book', 'ball', 'car', 'tree', 'boat', 'train', 'house', 'plant', 'brush',
             'hand', 'eye', 'ear', 'nose', 'face', 'hair', 'foot', 'tooth']

# MUTE 静音双保险（r19 红线）：words r28 定稿 function 版（batch6/words/_src/_selftest.py L28
# 逐字复制——r28 §7④：旧版括号失衡语法错已被 node --check+gate 首跑双实锤，禁手改本块）
MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed',
  resume:function(){},
  createOscillator:function(){ return {
    connect:function(){ return { connect:function(){} }; },
    start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  createGain:function(){ return {
    connect:function(){},
    gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  destination:{}, currentTime:0, sampleRate:44100
}; };"""


def mute_ctx(browser, vp=None):
    """每 context 必挂 MUTE_INIT（r19 双保险之一）+ 种档双保险之二（sound/tts false）"""
    kw = {'viewport': vp} if vp else {}
    ctx = browser.new_context(**kw)
    ctx.add_init_script(MUTE_INIT)
    return ctx


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'worden', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0},   # 种档静音（r19 双保险之二；r29 §7⑥ 完整 core 字段）
        'restTip': {'day': '', 'shown': 0},
        'wen': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_worden", ' + json.dumps(json.dumps(save)) + ')'


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


def click_opt(page, i):
    loc = page.locator('.opt[data-i="%d"]' % i)
    box = loc.bounding_box()
    page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def play_level(page, first_wrong=False, tag=''):
    """真实点击答完当前关（每题点正确卡；首题可选先错一次；r32 blank 题按 pick 字母驱动）"""
    def truth_of(q):
        return q['pick'] if q.get('mode') == 'blank' else q['target']
    wrong_done = not first_wrong
    clicks = 0
    for _ in range(12):
        q = page.evaluate('WEN.quiz')
        if q is None:
            break
        if not wrong_done:
            wrong_done = True
            wi = next(i for i, w in enumerate(q['options']) if w != truth_of(q))
            click_opt(page, wi)
            page.wait_for_timeout(400)
            st = page.evaluate('''() => {
              const lv = WEN.currentLevel;
              const t = WEN.quiz.options.indexOf(WEN.quiz.target);
              const el = document.querySelector('.opt[data-i="'+t+'"]');
              return {retries: lv.retries, step: lv.step, won: lv.won,
                      pulse: !!(el && el.classList.contains('pulse')),
                      grey: !!document.querySelector('.opt.wrong')};
            }''')
            check('%sfirst wrong: zero penalty / no pulse / greyed' % tag,
                  st['retries'] == 1 and st['step'] == 0 and not st['won'] and
                  not st['pulse'] and st['grey'], str(st))
            continue
        ti = q['options'].index(truth_of(q))
        click_opt(page, ti)
        clicks += 1
        page.wait_for_timeout(1250)              # > 答对演出窗 950ms
    page.wait_for_selector('.k-celebrate', timeout=15000)
    return clicks


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
            ctx = mute_ctx(browser, {'width': 1280, 'height': 800})
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            deadline = time.time() + 15
            title = ''
            while time.time() < deadline:
                title = pg.title()
                if title.startswith('VERIFY'):
                    break
                pg.wait_for_timeout(500)
            check('verify title (poll <=15s)', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            check('verify 40-level audit all ok',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify units all ok', all(v['ok'] for v in vj['units'].values()),
                  str({k: v for k, v in vj['units'].items() if not v['ok']}))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']))
            hist = vj['units']['cover']['hist']
            check('verify 48-word coverage over 40 levels (r32)',
                  sorted(hist.keys()) == sorted(WORD_LIST) and all(v >= 1 for v in hist.values()),
                  'words=%d' % len(hist))
            check('verify confuse distractors not in library (12 pairs r32)', vj['units']['confuse']['ok'],
                  str(vj['units']['confuse']))
            check('verify blank unit ok (r32)', vj['units'].get('blank', {}).get('ok'),
                  str(vj['units'].get('blank', {})))
            check('verify sound2pic autoplay en clip (stub count)', vj['units']['autoplay']['ok'],
                  str(vj['units']['autoplay'].get('first')))
            check('verify word-card text same-source with WORDS', vj['units']['domText']['ok'])
            ctx.close()

            # ---- 2a. 预置存档：首错零惩罚 + 真实点击通关（2 星）→ 推进写档 ----
            ctx = mute_ctx(browser, {'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.WEN && WEN.currentLevel', timeout=8000)
            lv = pg.evaluate('WEN.currentLevel')
            check('start at 1-0 (ch 1-based, pic2word)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            check('tutorial skipped (preset)', pg.evaluate('WEN.tutorial') == 'none')
            q = pg.evaluate('WEN.quiz')
            check('quiz hook shape (dch1 3-choice r32)', q and q['mode'] == 'pic2word' and
                  len(q['options']) == 3 and q['target'] in q['options'], str(q))
            check('word card lowercase + letterspacing', pg.evaluate('''() => {
              const el = document.querySelector('.opt .word');
              return el && el.textContent === el.textContent.toLowerCase() &&
                parseFloat(getComputedStyle(el).letterSpacing.replace('px','')) > 0;
            }'''))
            n = play_level(pg, first_wrong=True, tag='[2a] ')
            check('answered 5 quizzes by real click', n == 5, 'correct clicks=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 wrong)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('WEN.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_worden")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            # 答对播 en 单词 clip（stub 计数：点一张正确卡）
            pg.evaluate('''() => { window.__en = []; const o = KIDS.voice.play;
              KIDS.voice.play = (k) => { window.__en.push(k); return o.call(KIDS.voice, k); }; }''')
            q1 = pg.evaluate('WEN.quiz')
            click_opt(pg, q1['options'].index(q1['target']))
            pg.wait_for_timeout(400)
            en = pg.evaluate('window.__en')
            check('correct tap plays en word clip wen_w_<word>',
                  any(k == 'wen_w_' + q1['target'] for k in en), str(en))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = mute_ctx(browser, {'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.WEN && WEN.currentLevel', timeout=8000)
            pg.wait_for_function("WEN.tutorial === 'watch'", timeout=5000)
            swallowed = pg.evaluate('WEN.tapOption(0)') is False   # 演示期真实/hook 输入全吞
            check('tutorial watch swallows input (locked demo)', swallowed)
            pg.wait_for_function("WEN.tutorial === 'help'", timeout=30000)   # 等"看"演示完成
            q = pg.evaluate('WEN.quiz')
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and
                  not q['answered'], str(q))
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')",
                                     timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> correct option', ghost_shown)
            n = play_level(pg, tag='[2b] ')
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'clicks=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_worden")'))
            check('wen.tutSeen persisted', (saved.get('wen') or {}).get('tutSeen') is True)
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. 章 3 形近干扰（flat10）：干扰卡在场/不发音/点它灰掉 + 真实通关 ----
            ctx = mute_ctx(browser, {'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.WEN && WEN.currentLevel', timeout=8000)
            lv = pg.evaluate('WEN.currentLevel')
            check('ch3 level start at flat=10', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            pg.evaluate('''() => { window.__pl = []; const o = KIDS.voice.play;
              KIDS.voice.play = (k) => { window.__pl.push(k); return o.call(KIDS.voice, k); }; }''')
            q = pg.evaluate('WEN.quiz')
            outside = [w for w in q['options'] if w not in WORD_LIST]
            check('ch3: exactly 1 out-of-library confuse card on field',
                  q['mode'] == 'pic2word' and len(q['options']) == 3 and len(outside) == 1,
                  str(q['options']))
            wi = q['options'].index(outside[0])
            click_opt(pg, wi)                    # 真实点形近干扰卡
            pg.wait_for_timeout(400)
            st = pg.evaluate('''() => {
              const el = document.querySelector('.opt[data-i="%d"]');
              return {wrong: !!(el && el.classList.contains('wrong')),
                      pe: el ? getComputedStyle(el).pointerEvents : '',
                      step: WEN.currentLevel.step, retries: WEN.currentLevel.retries};
            }''' % wi)
            plays = pg.evaluate('window.__pl')
            check('tap confuse card: greyed + pe:none + zero penalty',
                  st['wrong'] and st['pe'] == 'none' and st['step'] == 0 and st['retries'] == 1, str(st))
            check('confuse card never pronounced (display-only)',
                  not any(('wen_w_' + outside[0]) in (k or '') for k in plays), str(plays))
            n = play_level(pg, tag='[2c] ')
            check('ch3 real-click win', n == 5, 'clicks=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('WEN.currentLevel')
            check('ch3 win proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            ctx.close()

            # ---- 2d. 章 2 听音题（flat5）：开题自动播 + 喇叭卡重播 + 听按钮 3s 节流 ----
            ctx = mute_ctx(browser, {'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(5), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.WEN && WEN.currentLevel', timeout=8000)
            lv = pg.evaluate('WEN.currentLevel')
            check('ch2 level start at flat=5 (sound2pic)', lv and lv['flat'] == 5 and lv['dch'] == 2,
                  str(lv))
            q = pg.evaluate('WEN.quiz')
            check('sound2pic quiz: speaker card + 2 options',
                  q and q['mode'] == 'sound2pic' and len(q['options']) == 2 and
                  pg.evaluate('!!document.querySelector("#q-card.sound2pic")'), str(q))
            # 开题自动播（存根在 init 前不可行，改由 verify ⑨ 计数断言；此处验重播链路）
            pg.evaluate('''() => { window.__q = [];
              KIDS.voice.queue = (parts) => { window.__q.push(parts.slice()); };
              KIDS.voice.play = () => {}; }''')
            box = pg.locator('#q-card').bounding_box()
            pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
            pg.wait_for_timeout(300)
            q1 = pg.evaluate('window.__q')
            check('speaker card tap replays en clip + zh instruction',
                  len(q1) == 1 and q1[0][0] == 'wen_w_' + q['target'] and q1[0][1] == 'wen_q2',
                  str(q1))
            hb = pg.locator('#btn-hear').bounding_box()
            pg.mouse.click(hb['x'] + hb['width'] / 2, hb['y'] + hb['height'] / 2)
            pg.wait_for_timeout(200)
            q2 = pg.evaluate('window.__q')
            check('hear btn 3s throttle swallows rapid re-click', len(q2) == 1, str(q2))
            forced = pg.evaluate('WEN.replay()')
            q3 = pg.evaluate('window.__q')
            check('WEN.replay() bypasses throttle', forced is True and len(q3) == 2, str(q3))
            n = play_level(pg, tag='[2d] ')
            check('ch2 real-click win', n == 5, 'clicks=%d' % n)
            ctx.close()

            # ---- 2e. blank 缺字母补全（r32 新增，flat10 qi2 固定位）：真实点错/点对/补全/播整词 ----
            ctx = mute_ctx(browser, {'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, '2e')
            pg.goto(URL)
            pg.wait_for_function('window.WEN && WEN.currentLevel', timeout=8000)
            pg.evaluate('''() => { window.__pb = []; const o = KIDS.voice.play;
              KIDS.voice.play = (k) => { window.__pb.push(k); return o.call(KIDS.voice, k); }; }''')
            # 真实点对前两题（qi0/1=pic2word 形近）推进到 qi2=blank
            for _ in range(2):
                q = pg.evaluate('WEN.quiz')
                click_opt(pg, q['options'].index(q['target']))
                pg.wait_for_timeout(1250)
            qb = pg.evaluate('WEN.quiz')
            check('[2e] flat10 qi2 is blank quiz (fixed slot)', qb and qb['mode'] == 'blank' and
                  len(qb['options']) == 3 and qb['blankPos'] >= 1 and
                  qb['target'][qb['blankPos']] == qb['pick'] and len(qb['target']) >= 4, str(qb))
            bletters = pg.evaluate('''() => [...document.querySelectorAll('.opt .letter')].map(e => e.textContent)''')
            check('[2e] letter cards DOM == options', bletters == qb['options'], str(bletters))
            # 真实点错字母：灰掉零惩罚不推进+缺位不被污染
            wi = next(i for i, c in enumerate(qb['options']) if c != qb['pick'])
            click_opt(pg, wi)
            pg.wait_for_timeout(500)
            st = pg.evaluate('''(i) => { const el = document.querySelector('.opt[data-i="'+i+'"]');
              return { wrong: !!(el && el.classList.contains('wrong')),
                       pe: el ? getComputedStyle(el).pointerEvents : '',
                       step: WEN.currentLevel.step, retries: WEN.currentLevel.retries,
                       gap: document.querySelector('.gap') ? document.querySelector('.gap').textContent : null }; }''', wi)
            check('[2e] wrong letter: grey + pe:none + no advance + gap intact',
                  st['wrong'] and st['pe'] == 'none' and st['step'] == 2 and st['retries'] == 1 and
                  st['gap'] == '_', str(st))
            # 真实点对字母：gap 填入+词完整==target+播整词 en+推进
            # （填入取证=window.__blankFill 运行锚——950ms 演出窗后 renderQuiz 重建题面 DOM 态不可事后查，
            #   r30 __dualJumpN 同范式；DOM 检查为窗内余证，非断言依赖）
            click_opt(pg, qb['options'].index(qb['pick']))
            pg.wait_for_timeout(500)
            st2 = pg.evaluate('''() => ({ bf: window.__blankFill || null,
                gap: document.querySelector('.gap') ? document.querySelector('.gap').textContent : null,
                step: WEN.currentLevel.step })''')
            plays = pg.evaluate('window.__pb')
            check('[2e] correct letter: gap filled + word full + play whole-word en',
                  st2['bf'] and st2['bf']['pick'] == qb['pick'] and st2['bf']['word'] == qb['target'] and
                  st2['step'] == 3 and
                  any(k == 'wen_w_' + qb['target'] for k in plays),
                  'st2=%s plays=%s' % (st2, plays[-4:]))
            pg.wait_for_timeout(1000)              # 补足 950ms 答对演出窗（防 play_level 首击被 locked 吞后 clicks 虚增）
            n = play_level(pg, tag='[2e] ')
            check('[2e] blank level real-click win', n == 2, 'clicks=%d' % n)   # 已答至 qi2，剩 qi3/qi4 两题
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('WEN.currentLevel')
            check('[2e] proceeds to flat=11', lv2 and lv2['flat'] == 11, str(lv2))
            ctx.close()

            # ---- 2f. dch4 blank 点错专项（r32 审查 minor7）：flat15 qi2 固定位 真实点错字母 ----
            #     期望从 SPEC §R4 推导：答错=灰掉（pe:none）+计错 miss/retries 各 1+零惩罚不推进+
            #     缺位不被污染（gap=='_'）+首错（miss<2）不 pulse 正确字母卡+sayW 播 wen_wrong；
            #     点对仍推进=「灰掉可重点零惩罚」的续答面（dch4 混合章 blank 与 dch3 共用代码路径，本腿补 dch4 面）
            ctx = mute_ctx(browser, {'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2f')
            pg.goto(URL)
            pg.wait_for_function('window.WEN && WEN.currentLevel', timeout=8000)
            lv = pg.evaluate('WEN.currentLevel')
            check('[2f] dch4 level start at flat=15', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            pg.evaluate('''() => { window.__pf = []; const o = KIDS.voice.play;
              KIDS.voice.play = (k) => { window.__pf.push(k); return o.call(KIDS.voice, k); }; }''')
            for _ in range(2):                    # qi0/1=word2pic 真实点对推进至 qi2=blank（固定谱）
                q = pg.evaluate('WEN.quiz')
                click_opt(pg, q['options'].index(q['target']))
                pg.wait_for_timeout(1250)
            qb = pg.evaluate('WEN.quiz')
            check('[2f] flat15 qi2 is blank quiz (dch4 fixed slot)',
                  qb and qb['mode'] == 'blank' and qb['blankPos'] >= 1 and
                  qb['target'][qb['blankPos']] == qb['pick'] and len(qb['options']) == 3, str(qb))
            wi = next(i for i, c in enumerate(qb['options']) if c != qb['pick'])
            ci = qb['options'].index(qb['pick'])
            click_opt(pg, wi)                     # 真实点错字母（DOM 点击）
            pg.wait_for_timeout(500)
            st = pg.evaluate('''(x) => { const el = document.querySelector('.opt[data-i="'+x.wi+'"]');
              const ok = document.querySelector('.opt[data-i="'+x.ci+'"]');
              const q = WEN.quiz;
              return { wrong: !!(el && el.classList.contains('wrong')),
                       pe: el ? getComputedStyle(el).pointerEvents : '',
                       step: WEN.currentLevel.step, retries: WEN.currentLevel.retries,
                       miss: q ? q.miss : null, dead: q ? q.dead[x.wi] : null,
                       pulse: !!(ok && ok.classList.contains('pulse')),
                       gap: document.querySelector('.gap') ? document.querySelector('.gap').textContent : null }; }''',
                             {'wi': wi, 'ci': ci})
            plays = pg.evaluate('window.__pf')
            check('[2f] wrong letter chain: grey+pe:none+no advance+miss=1+gap intact+no pulse',
                  st['wrong'] and st['pe'] == 'none' and st['step'] == 2 and st['retries'] == 1 and
                  st['miss'] == 1 and st['dead'] and not st['pulse'] and st['gap'] == '_', str(st))
            check('[2f] wrong feedback voice wen_wrong played',
                  any(k == 'wen_wrong' for k in plays), str(plays[-4:]))
            click_opt(pg, ci)                     # 点对字母：灰掉零惩罚仍可续答（SPEC §R4 续答面）
            pg.wait_for_timeout(400)
            st2 = pg.evaluate('WEN.currentLevel.step')
            check('[2f] correct letter after wrong still advances (zero-penalty continue)',
                  st2 == 3, 'step=%s' % st2)
            ctx.close()

            # ---- 3. flat≥3 救援钟：错点不重置 → 静置 16s 救援触发（14s 阈值） ----
            ctx = mute_ctx(browser, {'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(3), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue')
            pg.goto(URL)
            pg.wait_for_function('window.WEN && WEN.currentLevel', timeout=8000)
            lv = pg.evaluate('WEN.currentLevel')
            check('rescue test starts at flat=3 (flat>=3)', lv and lv['flat'] == 3, str(lv))
            pg.evaluate('''() => { window.__rp = [];
              KIDS.voice.play = (k) => { window.__rp.push([k, Date.now()]); };
              KIDS.voice.queue = () => {}; }''')
            pg.wait_for_timeout(2200)            # 开题读题已落地（stub 前不计）
            q = pg.evaluate('WEN.quiz')
            wi = next(i for i, w in enumerate(q['options']) if w != q['target'])
            click_opt(pg, wi)                    # t≈+3s 真实错点：不重置救援钟
            pg.wait_for_timeout(13500)           # 至 t≈+16.5s：不重置→救援 14s 已来；若重置→17s 仍无
            rec = pg.evaluate('window.__rp')
            q1plays = [r for r in rec if r[0] == 'wen_q1']
            check('rescue re-reads question at ~14s (wrong tap did not reset clock)',
                  len(q1plays) >= 1 and any(r[0] == 'wen_wrong' for r in rec), str(rec))
            ctx.close()

            # ---- 3b. blank 题救援钟（r32 审查 minor6）：flat10 qi2 blank 静置 ----
            #     期望从 SPEC §R4 推导：blank 救援=qSpeak(q)=play(wen_q3)；14s 门+1s 轮询→
            #     触发窗 [14,15]s（lastAct=qi1 答对时点，先于本腿 t0 约 1-2s）；恰一次=救援后
            #     lastAct 重置（若每秒连播=重置机制坏，必红）；ts-t0 下界排除开题读题余音
            ctx = mute_ctx(browser, {'width': 1280, 'height': 800})
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = ctx.new_page(); watch(pg, 'rescue-blank')
            pg.goto(URL)
            pg.wait_for_function('window.WEN && WEN.currentLevel', timeout=8000)
            pg.evaluate('''() => { window.__rb = []; KIDS.voice.play = (k) => { window.__rb.push([k, Date.now()]); };
              KIDS.voice.queue = () => {}; }''')
            for _ in range(2):                    # qi0/1 真实点对推进至 qi2=blank（固定谱）
                q = pg.evaluate('WEN.quiz')
                click_opt(pg, q['options'].index(q['target']))
                pg.wait_for_timeout(1250)
            qb = pg.evaluate('WEN.quiz')
            check('[3b] blank rescue leg sits on blank quiz (flat10 qi2)',
                  qb and qb['mode'] == 'blank', str(qb))
            pg.evaluate('window.__rb = []')       # 清开题读题 wen_q3（renderQuiz 已播一次）
            t0 = pg.evaluate('Date.now()')
            pg.wait_for_timeout(16000)            # 静置：救援窗 [14,15]s（lastAct 基准）已过、第二窗未到
            rec = pg.evaluate('window.__rb')
            q3 = [r for r in rec if r[0] == 'wen_q3']
            check('[3b] blank idle rescue re-reads wen_q3 once at ~14s (SPEC §R4)',
                  len(q3) == 1 and q3[0][1] - t0 >= 11000,
                  'delta=%s rec=%s' % ([r[1] - t0 for r in q3], rec))
            ctx.close()

            # ---- 4. 双 viewport：overflowX==0 / 触摸目标 ≥64 / 主按钮 ≥96 / 截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = mute_ctx(browser, {'width': vp[0], 'height': vp[1]})
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
                pg.goto(URL)
                pg.wait_for_function('window.WEN && WEN.currentLevel', timeout=8000)
                pg.wait_for_timeout(900)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const mainBad = [];
                  document.querySelectorAll('#q-card, .opt').forEach(e => {
                    const r = e.getBoundingClientRect();
                    if (r.width < 96 || r.height < 96)
                      mainBad.push(e.className + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const svgs = [...document.querySelectorAll('#q-card svg, .opt svg')].map(s => {
                    const r = s.getBoundingClientRect(); return Math.min(r.width, r.height); });
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad, mainBad: mainBad,
                          svgMin: svgs.length ? Math.round(Math.min(...svgs)) : 0};
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64 (excl .k-parentbtn)' % vp, not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d main buttons >=96 & svg >=64' % vp,
                      not m['mainBad'] and m['svgMin'] >= 64, 'svgMin=%s %s' % (m['svgMin'], m['mainBad']))
                shot = SHOTS / ('worden-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d non-blank' % vp, ok, detail)
                ctx.close()
        finally:
            browser.close()

    # ---- 5. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
