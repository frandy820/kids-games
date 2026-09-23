# -*- coding: utf-8 -*-
"""spellen _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r16 难度改造（2026-09-16）：三题型（listen 听音拼词/missing 缺字母选项/meaning 释义拼写）+
词库 60+CH_LEN 8+STATIC 40+旧档迁移 IIFE。
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 0 pageerror
2. 预置存档(跳过教学) → flat0 真实 pointer：首题(listen)拼错一次（干扰瓦片入首格→填满=晃动不灰化）
   → 全部退回（点已拼格）→ 逐字母点击拼满 → 8 题通关（三型全覆盖）→ .k-celebrate → 读档 stars==2
3. 英文发音通道（SPEC 0.32）：点大喇叭=voice.play('sp_word_*') 无 text；speechSynthesis
   零英文 utterance；删 clip 后点喇叭不播（false+console.warn），零 TTS 兜底
4. flat16（ch3 辅音簇）真实通关（预置 done 0-15）→ 写档 3-0 stars==3
5. 救援钟：点瓦片（探索）不重置 → 10s 无救援 → 15s 救援触发（rescues>=1+发音重播+格 breathe+瓦片 pulse）
6. 双 viewport(1280x800/800x1180)：overflowX==0、瓦片/已拼格 >=64、大喇叭/提示 >=96、按钮 >=64
7. 全新存档 → 教学 watch 期真实乱点被吞（step 不变+pop 计数>0）+ 重玩门（demo 期无效）
   → watch 演示完成 __spDemoR=='right' → tut='help' → 真实拼对首词 → tut='solo'（看-帮-独链走完）
P1b 真竖视口轮（800×1180 独立 context=真实 @media 通道——与 verify body.port 模拟通道互补）：
   real_port 激活+喇叭 96±2+瓦片 >=64+ox==0+截图非空白 ×flat0/8/16/24
8. 生成关真页触达（契约：种档 firstDay=昨天+bonus[today]=30 → lim>STATIC=40）→ flat40 通关写档 6-0
9. 旧档迁移 IIFE：矛盾态（有 '2-0' 缺 '1-5'）→ 整档重置（教学重现）；正常第 1 章档 → 不误删
10. 构建自检：index.html 含 data:audio/mpeg 恰 191 条（+sp_l_ 60，T46）+ 完全离线（无 http(s)/src/href）
11. 全程 0 pageerror + 截图像素非空白（PIL stdev>5）
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
YDAY = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex>=3 → 日限 12
RESULTS = []
WARN_LOG = []


# 声音纪律（2026-09-19 主线强制）：全部页面先挂底层静音（speechSynthesis no-op +
# Audio.prototype.play no-op+异步 ended——queue 播报链语义保留，对 KIDS.voice 层断言透明；
# --mute-audio 对 chrome-headless-shell 无效，必须页级覆写）
SND_MUTE = """(() => {
  if (window.__sndMuted) return; window.__sndMuted = 1;
  try { if (window.speechSynthesis) { speechSynthesis.speak = function () {};
    speechSynthesis.cancel = function () {}; } } catch (e) {}
  try {
    const proto = window.Audio.prototype;
    proto.play = function () {
      const self = this;
      setTimeout(() => { try { self.dispatchEvent(new Event('ended')); } catch (e) {} }, 5);
      return Promise.resolve();
    };
    proto.pause = function () {};
  } catch (e) {}
})();"""

def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), first_day=None, bonus_today=0):
    save = {
        'v': '1.0', 'game': 'spellen', 'firstDay': first_day or OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'spellen': {'tutSeen': tut_seen},
    }
    for f in done_flats:                                   # r16 键基：CH_LEN=8（c=f//8+1, l=f%8）
        save['levels']['%d-%d' % (f // 8 + 1, f % 8)] = {'stars': 3, 'plays': 1}
    if bonus_today:
        save['bonus'][TODAY] = bonus_today
    return 'localStorage.setItem("kidsgame_spellen", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path, floor=5.0):
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(path)).convert('L').resize((160, 100))
        px = list(im.getdata())
        sd = statistics.pstdev(px)
        return sd > floor, 'PIL pixel stdev=%.1f' % sd
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL 不可用，按体积判定)' % n


def tile_center(page, css):
    pos = page.evaluate("""(sel) => {
        const els = [...document.querySelectorAll(sel)];
        if (!els.length) return null;
        const r = els[0].getBoundingClientRect();
        return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
    }""", css)
    return pos


def click_letter(page, letter):
    """真实点击一块指定字母的未用瓦片/选项卡（listen/meaning=.gone 已用；missing 选项不消失）"""
    pos = page.evaluate("""(L) => {
        const els = [...document.querySelectorAll('#tile-pool .tile')].filter(
            e => e.dataset.l === L && !e.classList.contains('gone'));
        if (!els.length) return null;
        const r = els[0].getBoundingClientRect();
        return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
    }""", letter)
    if pos is None:
        return False
    page.mouse.click(pos['x'], pos['y'])
    page.wait_for_timeout(130)
    return True


def click_distractor(page):
    """真实点击一块干扰瓦片（字母不在目标词内——入首格必错；listen/meaning 瓦片型专用）"""
    pos = page.evaluate("""() => {
        const w = SP.quiz.word;
        const els = [...document.querySelectorAll('#tile-pool .tile')].filter(
            e => !e.classList.contains('gone') && w.indexOf(e.dataset.l) < 0);
        if (!els.length) return null;
        const r = els[0].getBoundingClientRect();
        return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
    }""")
    if pos is None:
        return False
    page.mouse.click(pos['x'], pos['y'])
    page.wait_for_timeout(150)
    return True


def click_any_tile(page):
    pos = tile_center(page, '#tile-pool .tile:not(.gone)')
    if pos is None:
        return False
    page.mouse.click(pos['x'], pos['y'])
    page.wait_for_timeout(130)
    return True


def clear_built(page):
    """真实点击全部已拼格=退回（从最后一格起；瓦片型专用）"""
    guard = 0
    while guard < 14:
        pos = page.evaluate("""() => {
            const els = [...document.querySelectorAll('#slots .cell.full')];
            if (!els.length) return null;
            const r = els[els.length - 1].getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
        }""")
        if pos is None:
            break
        page.mouse.click(pos['x'], pos['y'])
        page.wait_for_timeout(120)
        guard += 1


def click_center(page, sel):
    pos = page.evaluate("(s) => { const r = document.querySelector(s).getBoundingClientRect();"
                        " return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }", sel)
    page.mouse.click(pos['x'], pos['y'])
    return pos


def solve_quiz(page):
    """r16 三型分派：瓦片型=按词点自由瓦片；missing=按缺位序点正确选项。
    以「本题 step 推进」为完成判据（拼满即换 SP.quiz 指向下一词——演出窗内旧 DOM 仍在）"""
    q0 = page.evaluate('SP.quiz')
    if q0 is None:
        return None
    if q0['type'] == 'missing':
        w, step0 = q0['word'], q0['step']
        for _ in range(16):
            q = page.evaluate('SP.quiz')
            if q is None or q['step'] != step0:
                return q
            n_filled = len(q['filled'])
            if n_filled >= len(q['blanks']):
                page.wait_for_timeout(400)     # 末空填对演出窗（locked）
                continue
            if not click_letter(page, w[q['blanks'][n_filled]]):
                page.wait_for_timeout(400)     # 吞输入窗重试
        return page.evaluate('SP.quiz')
    w, step0 = q0['word'], q0['step']
    for _ in range(14):
        q = page.evaluate('SP.quiz')
        if q is None or q['step'] != step0:
            return q
        built = [x for x in q['built'] if x is not None]
        if len(built) >= len(w):
            page.wait_for_timeout(400)         # 拼满判对演出窗（locked）
            continue
        if not click_letter(page, w[len(built)]):
            page.wait_for_timeout(400)         # 吞输入窗重试（locked 期点击不落格）
    return page.evaluate('SP.quiz')


def play_level(page, first_wrong=False):
    """真实点击打完当前关 8 题（三型分派）；（首题 q0=listen 可选先拼错一次+退回）"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = page.evaluate('SP.quiz')
        if q is None:
            break
        if not wrong_done:
            ok_d = click_distractor(page)            # 干扰瓦片入首格（必错）
            if not ok_d:
                return -1
            while True:                              # 任意瓦片填满全格 → 拼满判错
                st = page.evaluate('({n: SP.quiz.built.filter(x=>x!==null).length,'
                                   ' len: SP.quiz.word.length})')
                if st['n'] >= st['len'] or not click_any_tile(page):
                    break
            page.wait_for_timeout(700)
            st = page.evaluate("""() => ({
                wig: document.getElementById('slots').classList.contains('wig'),
                pe: getComputedStyle(document.querySelector('#tile-pool .tile:not(.gone)')).pointerEvents !== 'none',
                step: SP.currentLevel.step,
                retries: SP.currentLevel.retries, miss: SP.quiz.miss,
                cellBreathe: !!document.querySelector('#slots .cell.breathe'),
                tilePulse: !!document.querySelector('#tile-pool .tile.pulse'),
                rescues: SP.rescues })""")
            # 救援视觉判据：rescues==0 时错拼反馈不得自带 breathe/pulse（SPEC 推导）；
            # 慢环境下 14s 看护正当触发（开场语音不重置钟 §0.7a）则 rescues>=1，视觉在场=合理
            check('wrong full: slots wig / tiles clickable (not grayed) / step unchanged / first miss no rescue visual',
                  st['wig'] and st['pe'] and st['step'] == 0 and st['retries'] == 1 and
                  st['miss'] == 1 and
                  ((not st['cellBreathe'] and not st['tilePulse']) or st['rescues'] >= 1), str(st))
            clear_built(page)                        # 退回路径：点已拼格逐个放回池
            st2 = page.evaluate('({b: SP.quiz.built.filter(x=>x!==null).length,'
                                ' miss: SP.quiz.miss, retries: SP.currentLevel.retries})')
            check('return path: built cleared by tapping cells, miss/retries unchanged',
                  st2['b'] == 0 and st2['miss'] == 1 and st2['retries'] == 1, str(st2))
            wrong_done = True
            continue
        q = solve_quiz(page)
        answered += 1                                # 本题已解（solve 返回 None=关末亦计）
        if q is None:
            break
        page.wait_for_timeout(4600)                  # 真实页拼对流程 2s+2s（sp_right+字母跟读）
    return answered


def wrap_pop_count(page):
    page.evaluate("""() => { window.__popCount = 0;
        const o = KIDS.audio.sfx;
        /* 必须保 this（sfx 内部读 this.ctx）：普通函数 + call 回绑 */
        KIDS.audio.sfx = function (n) { if (n === 'pop') window.__popCount++; return o.call(KIDS.audio, n); }; }""")


def wrap_voice_channel(page):
    """英文发音通道记录（SPEC 0.32 断言用）：voice.play 键值对 + speechSynthesis utterance 文本"""
    page.evaluate("""() => {
        window.__plays = []; window.__tts = [];
        const op = KIDS.voice.play.bind(KIDS.voice);
        KIDS.voice.play = function (k, t) {
            window.__plays.push([String(k), t === undefined ? null : String(t)]);
            return op(k, t);
        };
        const os = window.speechSynthesis.speak.bind(window.speechSynthesis);
        window.speechSynthesis.speak = function (u) { window.__tts.push(String(u.text)); return os(u); };
    }""")


def tap_targets(page):
    """触摸目标审计：瓦片/选项/已拼格 >=64、大喇叭/提示 >=96、按钮 >=64（家长钮豁免）"""
    tiles = page.evaluate("""() => [...document.querySelectorAll('#tile-pool .tile')].map(
        e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })""")
    tileOk = (len(tiles) == 0) or all(w >= 64 and h >= 64 for w, h in tiles)
    cells = page.evaluate("""() => [...document.querySelectorAll('#slots .cell')].map(
        e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })""")
    cellOk = (len(cells) == 0) or all(w >= 64 and h >= 64 for w, h in cells)
    spk = page.evaluate("""() => { const b = document.getElementById('speaker-btn');
        if (getComputedStyle(b).display === 'none') return [999, 999];   /* meaning 型喇叭替位豁免 */
        const r = b.getBoundingClientRect(); return [r.width, r.height]; }""")
    spkOk = spk[0] >= 96 and spk[1] >= 96
    hb = page.evaluate("""() => { const b = document.querySelector('#hint-btn');
        if (!b) return null; const r = b.getBoundingClientRect(); return [r.width, r.height]; }""")
    hintOk = hb is not None and hb[0] >= 96 and hb[1] >= 96
    btns = page.evaluate("""() => {
        const out = [];
        document.querySelectorAll('button').forEach(b => {
            if (b.classList.contains('k-parentbtn')) return;
            if (getComputedStyle(b).display === 'none') return;
            const r = b.getBoundingClientRect();
            if (r.width > 4 && r.height > 4) out.push([r.width, r.height]);
        });
        return out;
    }""")
    btnOk = all(w >= 64 and h >= 64 for w, h in btns)
    ox = page.evaluate('Math.max(document.documentElement.scrollWidth - innerWidth,'
                       ' document.documentElement.scrollWidth - document.documentElement.clientWidth)')
    return tileOk, cellOk, spkOk, hintOk, btnOk, ox


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])

        # ---------- 1. verify=1 ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.add_init_script(SND_MUTE)
        page.on('pageerror', lambda e: errors.append('verify: ' + str(e)))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.startsWith('VERIFY')", timeout=120000)
        r = json.loads(page.eval_on_selector('#verify-result', 'el => el.textContent'))
        check('verify=1 title PASS', page.title().startswith('VERIFY PASS'), page.title())
        check('verify pass==total', r['pass'] == r['total'], '%s/%s layoutOk=%s' % (r['pass'], r['total'], r['layoutOk']))
        page.close()

        # ---------- 2. 真实点击通关 flat0（预置存档跳教学；首题拼错一次+退回 → 1 错=2 星） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.add_init_script(SND_MUTE)
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.on('console', lambda m: WARN_LOG.append(m.text) if m.type == 'warning' else None)
        page.goto(URL)
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.SP && SP.quiz', timeout=8000)
        q0 = page.evaluate('SP.quiz')
        check('flat0 loaded (spellen r16, q0=listen)', q0['type'] == 'listen' and
              q0['built'] == [None] * len(q0['word']) and q0['tiles'], str(q0)[:120])
        page.screenshot(path=str(SHOTS / 'spellen_1280.png'))
        answered = play_level(page, first_wrong=True)
        types_seen = page.evaluate('genLevel(0).quizzes.map(q => q.type)')
        check('played 8 quizzes by real clicks (3 types covered)', answered == 8 and
              set(types_seen) == {'listen', 'missing', 'meaning'},
              '%d types=%s' % (answered, types_seen))
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('celebrate overlay shown', True)
        page.wait_for_timeout(5400)                      # celebrate 2.3s+收尾→写档，等足 5.4s 再读
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_spellen'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('save after win: 1-0 stars==2 (1 wrong full)', bool(saved) and saved['stars'] == 2, str(saved))

        # ---------- 3. 英文发音通道（SPEC 0.32）：喇叭=play(sp_word_*) 无 text；零英文 TTS ----------
        wrap_voice_channel(page)
        w_cur = page.evaluate('SP.quiz ? SP.quiz.word : null')
        click_center(page, '#speaker-btn')
        page.wait_for_timeout(400)
        ch = page.evaluate("""() => ({plays: window.__plays.filter(p => p[0].indexOf('sp_word_') === 0),
            tts: window.__tts.slice()})""")
        ok3 = bool(w_cur) and len(ch['plays']) >= 1 and \
            all(p[1] is None for p in ch['plays']) and \
            any(p[0] == 'sp_word_' + w_cur for p in ch['plays'])
        check('speaker tap: voice.play(sp_word_*) without text', ok3,
              str(ch['plays'][:2]) + ' word=' + str(w_cur))
        # 缺 clip：禁 TTS 英文兜底（不播+console.warn）
        page.evaluate("""(w) => { delete KIDS.voice.clips['sp_word_' + w];
            window.__plays.length = 0; window.__tts.length = 0; }""", w_cur)
        hear_r = page.evaluate('SP.hear()')
        page.wait_for_timeout(300)
        ch2 = page.evaluate('({plays: window.__plays, tts: window.__tts})')
        warn_hit = [w for w in WARN_LOG if ('sp_word_' + str(w_cur)) in w]
        check('missing clip: SP.hear()==false, zero play/say, zero English TTS, console.warn fired',
              hear_r is False and ch2['plays'] == [] and ch2['tts'] == [] and len(warn_hit) >= 1,
              'hear_r=%s plays=%d tts=%d warn=%s' % (hear_r, len(ch2['plays']), len(ch2['tts']),
              warn_hit[:1] if warn_hit else 'NONE'))
        page.reload()                                    # 还原 clips（HTML 内嵌，重载即重注入）
        page.wait_for_function('window.SP && SP.quiz', timeout=8000)

        # ---------- 4. flat16（ch3 辅音簇）真实通关（预置 done 0-15+今日 bonus30 抬日限 42>16，
        # 否则 lim=12 → dayDone → 停留 flat11=lim-1，家族 b14 行为） ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(16), bonus_today=30))
        page.reload()
        page.wait_for_function('window.SP && SP.quiz', timeout=8000)
        q16 = page.evaluate('SP.quiz')
        check('flat16 loaded (ch3: word 4-6 letters, tiles=word+3 / opts=4 by type)',
              q16 and 4 <= len(q16['word']) <= 6 and
              (q16['type'] == 'missing' and len(q16['opts']) == 4 or
               q16['type'] != 'missing' and len(q16['tiles']) == len(q16['word']) + 3), str(q16)[:120])
        page.screenshot(path=str(SHOTS / 'flat16_1280.png'))
        answered = play_level(page)
        check('flat16: played 8 quizzes by real clicks', answered == 8, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.wait_for_timeout(5400)
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_spellen'));
            return s && s.levels && s.levels['3-0'] ? s.levels['3-0'] : null; }""")
        check('flat16 save: 3-0 stars==3', bool(saved) and saved['stars'] == 3, str(saved))

        # ---------- 5. 救援钟「探索点击不重置」（§0.7a 判别式）：先等第一次救援自然触发
        #（其内部 lastAct=触发时刻重置），4s 后点一块瓦片（探索），再静置 11.5s：
        # 不重置 → idle≈15.5s>14 → 第二次救援触发 rescues>=2；若点击重置钟 → idle≈11.5s<14 → 停 1（FAIL 判别） ----------
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.wait_for_function('window.SP && SP.quiz', timeout=8000)
        wrap_pop_count(page)
        t0 = time.time()
        rescued1 = False
        while time.time() - t0 < 30:
            if page.evaluate('SP.rescues') >= 1:
                rescued1 = True
                break
            page.wait_for_timeout(500)
        check('rescue fired on 14s idle (breathe + pulse visuals present)', rescued1 and
              page.evaluate("""(!!document.querySelector('#slots .cell.breathe') ||
                                !!document.querySelector('#tile-pool .tile.pulse'))"""),
              'elapsed=%.1fs' % (time.time() - t0))
        page.wait_for_timeout(4000)                     # 触发后安全窗 idle≈4s
        click_any_tile(page)                            # 探索点击（§0.7a 不重置救援钟）
        page.wait_for_timeout(11500)                    # 不重置 → idle≈15.5s>14s
        st = page.evaluate('({rescues: SP.rescues})')
        check('explore tile tap did NOT reset rescue clock (second rescue fired)',
              st['rescues'] >= 2, str(st))

        # ---------- 6. 双 viewport 触摸目标与 overflowX（同页 set_viewport_size 通道） ----------
        for vp in [(1280, 800), (800, 1180)]:
            page.set_viewport_size({'width': vp[0], 'height': vp[1]})
            page.wait_for_timeout(800)                  # 等入场动画结束再量（transform 中途陷阱）
            t1, c1, s1, h1, b1, ox1 = tap_targets(page)
            check('viewport %dx%d: tiles+cells>=64 & speaker+hint>=96 & buttons>=64 & overflowX==0' % vp,
                  t1 and c1 and s1 and h1 and b1 and ox1 == 0,
                  'tile=%s cell=%s spk=%s hint=%s btn=%s ox=%s' % (t1, c1, s1, h1, b1, ox1))
            page.screenshot(path=str(SHOTS / ('vp_%dx%d.png' % vp)))
        page.close()

        # ---------- 7. 教学看-帮-独链（全新存档）：watch 乱点被吞+重玩门 → demoR → help → solo ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.add_init_script(SND_MUTE)
        page.on('pageerror', lambda e: errors.append('tut: ' + str(e)))
        page.goto(URL)
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_function('window.SP && SP.tutorial === "watch"', timeout=8000)
        wrap_pop_count(page)
        page.wait_for_timeout(600)                      # watch 演示进行中
        for _ in range(4):                              # 真实乱点瓦片（主交互区）
            pos = tile_center(page, '#tile-pool .tile:not(.gone)')
            if pos:
                page.mouse.click(pos['x'], pos['y'])
                page.wait_for_timeout(160)
        rp = page.evaluate("""() => { const r = document.querySelector('#btn-replay').getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
        flatBefore = page.evaluate('SP.currentLevel.flat')
        page.mouse.click(rp['x'], rp['y'])              # 重玩门：demo 期点"再玩一次"无效
        page.wait_for_timeout(400)
        st = page.evaluate('({step: SP.currentLevel.step, pops: window.__popCount,'
                           ' tut: SP.tutorial, flat: SP.currentLevel.flat})')
        check('tutorial watch: clicks swallowed (step==0)', st['step'] == 0, str(st))
        check('tutorial watch: pop feedback fired (>=1)', st['pops'] >= 1, str(st))
        check('replay gate: demo 期重玩无效 (flat unchanged)',
              st['flat'] == flatBefore and st['tut'] == 'watch', str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_watch.png'))
        page.wait_for_function('SP.tutorial === "help"', timeout=40000)   # 演示完成→重发同关→帮
        st = page.evaluate("""() => ({demoR: window.__spDemoR, flat: SP.currentLevel.flat,
            step: SP.quiz ? SP.quiz.step : null,
            built: SP.quiz ? SP.quiz.built : null })""")
        check('tutorial handoff: __spDemoR=="right" + re-issued flat0 + fresh empty slots',
              st['demoR'] == 'right' and st['flat'] == 0 and st['step'] == 0 and
              all(x is None for x in st['built']), str(st)[:160])
        q = solve_quiz(page)                            # "独"：孩子真实拼对首词 → 放手
        page.wait_for_timeout(4600)
        st = page.evaluate('({tut: SP.tutorial, step: SP.currentLevel.step})')
        check('tutorial solo: first correct word releases hand (tut=solo, step advanced)',
              st['tut'] == 'solo' and st['step'] == 1, str(st))
        page.close()

        # ---------- P1b. 真竖视口轮（800×1180 独立 context=真实 @media 通道）×四 dch 首关 ----------
        ctx = browser.new_context(viewport={'width': 800, 'height': 1180})
        pg = ctx.new_page()
        pg.add_init_script(SND_MUTE)
        pg.on('pageerror', lambda e: errors.append('P1b: ' + str(e)))
        pg.goto(URL)
        pg.evaluate(preset_save(tut_seen=True, done_flats=range(40)))
        pg.reload()
        pg.wait_for_function('window.SP && SP.quiz', timeout=8000)
        real_port = pg.evaluate('innerHeight > innerWidth')
        check('P1b real portrait viewport (800x1180 -> @media channel active)', real_port)
        for flat in (0, 8, 16, 24):
            pg.evaluate('SP.start(%d)' % flat)
            pg.wait_for_timeout(700)                    # 等入场动画（transform 中途陷阱）
            st = pg.evaluate("""() => {
                const tiles = [...document.querySelectorAll('#tile-pool .tile')].map(
                    e => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height));
                const spk = document.getElementById('speaker-btn').offsetWidth;
                return { minTile: tiles.length ? Math.min(...tiles) : 0, spkW: spk,
                    ox: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                    hint: (() => { const b = document.querySelector('#hint-btn');
                        const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); })() }; }""")
            check('P1b flat%d: @media spk=96±2 + tiles>=64 + hint>=96 + ox==0' % flat,
                  94 <= st['spkW'] <= 98 and st['minTile'] >= 64 and st['hint'] >= 96 and st['ox'] == 0,
                  'spkW=%s minTile=%s hint=%s ox=%s' % (st['spkW'], st['minTile'], st['hint'], st['ox']))
            pg.screenshot(path=str(SHOTS / ('p1b_flat%d.png' % flat)))
        ctx.close()

        # ---------- 8. 生成关真页触达（种档 firstDay=昨天+bonus=30 → lim>40）→ flat40 通关 ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.add_init_script(SND_MUTE)
        page.on('pageerror', lambda e: errors.append('gen: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save(tut_seen=True, done_flats=range(40), first_day=YDAY, bonus_today=30))
        page.reload()
        page.wait_for_function('window.SP && SP.quiz', timeout=8000)
        lim = page.evaluate('KIDS.calendar.limit(Infinity)')
        check('gen-level reachable via seeded save (lim > STATIC=40)', lim > 40, 'lim=%s' % lim)
        page.evaluate('SP.start(40)')
        page.wait_for_timeout(600)
        g40 = page.evaluate('({flat: SP.currentLevel.flat, ch: SP.currentLevel.ch, n: SP.currentLevel.n})')
        check('flat40 loaded as generated level (ch>=5, 8 quizzes)', g40['flat'] == 40 and g40['ch'] >= 5
              and g40['n'] == 8, str(g40))
        answered = play_level(page)
        check('flat40 generated level: played 8 quizzes by real clicks', answered == 8, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.wait_for_timeout(5400)
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_spellen'));
            return s && s.levels && s.levels['6-0'] ? s.levels['6-0'] : null; }""")
        check('flat40 save: 6-0 stars==3 (generated level writes save)', bool(saved) and saved['stars'] == 3,
              str(saved))

        # ---------- 9. 旧档迁移 IIFE：矛盾态重置 / 正常档不误删 ----------
        # 9a 矛盾态（旧 5 基残留：有 '2-0' 缺 '1-5'）→ 整档重置 → 教学重现
        legacy = {'v': '1.0', 'game': 'spellen', 'firstDay': OLD, 'lastDay': TODAY,
                  'levels': {'1-0': {'stars': 3, 'plays': 2}, '2-0': {'stars': 2, 'plays': 1}},
                  'dailyMin': {}, 'bonus': {}, 'settings': {'sound': True, 'tts': True, 'vol': 0.6},
                  'restTip': {'day': '', 'shown': 0}, 'spellen': {'tutSeen': True}}
        page.evaluate('localStorage.setItem("kidsgame_spellen", %s)' % json.dumps(json.dumps(legacy)))
        page.reload()
        page.wait_for_function('window.SP && SP.tutorial', timeout=8000)
        st = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_spellen') || '{}');
            return { levels: s.levels || {}, tut: SP.tutorial }; }""")
        check('legacy 5-base save reset (no 2-0, tutorial restarted)',
              not st['levels'].get('2-0') and st['tut'] == 'watch', str(st)[:120])
        # 9b 正常档（第 1 章齐全，无矛盾）→ 不删
        page.evaluate(preset_save(tut_seen=True, done_flats=range(8)))
        page.reload()
        page.wait_for_function('window.SP && SP.quiz', timeout=8000)
        st = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_spellen') || '{}');
            return { has13: !!s.levels['1-3'], tut: SP.tutorial }; }""")
        check('normal 8-base chapter-1 save preserved (1-3 kept, no tutorial restart)',
              st['has13'] and st['tut'] != 'watch', str(st))
        page.close()
        browser.close()

    # ---------- 10. 构建自检：clips 注入条数 + 完全离线 ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('data:audio/mpeg')
    check('index.html clips: exactly 191 data:audio (8 sp_ + 60 sp_word_ + 60 sp_mean_ + 60 sp_l_ + 3 core_)',
          n_audio == 191, n_audio)
    for k in ['sp_tut_watch', 'sp_tut_turn', 'sp_hint', 'sp_right', 'sp_wrong', 'sp_first',
              'sp_missing', 'sp_mean', 'sp_word_cat', 'sp_word_pencil', 'sp_word_garden',
              'sp_mean_cat', 'sp_mean_pencil', 'sp_mean_garden']:
        if '"%s"' % k not in html:
            check('clip key embedded: ' + k, False)
            break
    else:
        check('spot-check clip keys embedded', True)
    stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
    check('single file fully offline',
          'http://' not in stripped and 'https://' not in stripped and ' src=' not in stripped and ' href=' not in stripped)

    # ---------- 11. 截图非空白 ----------
    for shot, floor in [('spellen_1280.png', 5.0), ('flat16_1280.png', 5.0), ('celebrate.png', 4.0),
                        ('vp_1280x800.png', 5.0), ('vp_800x1180.png', 5.0), ('tutorial_watch.png', 5.0),
                        ('p1b_flat0.png', 5.0), ('p1b_flat16.png', 5.0)]:
        ok, detail = png_nonblank(SHOTS / shot, floor)
        check('screenshot non-blank: ' + shot, ok, detail)

    check('0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
