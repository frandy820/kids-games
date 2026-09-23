# -*- coding: utf-8 -*-
"""emo _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
（r35 适配版：SPEC-R35-EMO 口径——两向题型/NEAR 三对/rev 断言/MUTE 双保险/存量红两腿时序修复）
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + units/levels/gen 全绿 + 0 pageerror
2. Python 侧独立封闭集对账（SPEC-R35-EMO 文字口径重列，不引用页面 EMOS/NEAR/SCENES）：
   40 关全题 答案情绪∈封闭6 / 情境∈独立重列24表且映射唯一 / 候选∈6 且 4 张互异 /
   恰 1 right（fwd=情绪 / rev=情境）/ 干扰=3 且不含答案 / 近伙伴恒在场（NEAR 三对全域律）/
   dch3 目标∈HARD4 / rev 候选情境互异且映射=候选情绪 / dch2 rev=2·dch3 rev=3·dch4 rev≥2
3. EM 钩子语义：EM.start(10) 外部切关生效；quiz.scene/emo/mode/faces{id,emo,scene}；tapFace(i)=下标语义
4. 双 viewport(1280x800/800x1180) flat0 fwd/flat10 rev/flat17 混合：候选卡 ≥96、题面卡 ≥64、
   overflowX≤0、截图像素非空白
5. 表情脸六型互异（页面 faceSvg 六型 SVG 串 → Python 侧签名两两互异+六型渲染 DOM 在场）
6. 正常模式（非 verify 页）真实主流程：全新存档 → 教学自动触发（看→帮）→ 真实 pointer
   点卡通关 → celebrate → 写档 stars=3 + tutSeen + v1.0（写档断言=轮询至超时——存量红修复②）
7. 选对路径情绪词 clip 触发（按题内情绪，两向）：wrap KIDS.voice.play/queue 记录 →
   点对后 queue 首段=emo_w_<本题情绪>；链尾段 fwd=emo_cf_/rev=emo_s_ 在场
   （DOM 同步等待替代固定 3900 等待——存量红修复①：链窗 6800 提升后旧腿重复读题翻倍）
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []

# MUTE 静音双保险（r19 红线）：每 context 挂 init script + 正常模式腿种档 settings 全关
MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
Audio.prototype.pause = function(){};"""

# ---------- Python 独立封闭表（SPEC-R35-EMO 文字逐条转译，禁抄页面 EMOS/NEAR/SCENES） ----------
PY_6 = ['happy', 'sad', 'angry', 'scared', 'surprised', 'worried']
PY_NEAR = {'sad': 'worried', 'worried': 'sad', 'angry': 'scared', 'scared': 'angry',
           'happy': 'surprised', 'surprised': 'happy'}       # r35 扩第三对（封闭三对）
PY_HARD4 = ['sad', 'worried', 'angry', 'scared']             # dch3 目标域
PY_SCENES = {
    'h_gift': 'happy', 'h_icecream': 'happy', 'h_sticker': 'happy', 'h_park': 'happy',
    's_icecream': 'sad', 's_balloon': 'sad', 's_teddy': 'sad', 's_flower': 'sad',
    'a_grab': 'angry', 'a_blocks': 'angry', 'a_queue': 'angry', 'a_laugh': 'angry',
    'c_dark': 'scared', 'c_thunder': 'scared', 'c_bdog': 'scared', 'c_shot': 'scared',
    'w_test': 'worried', 'w_mom': 'worried', 'w_rain': 'worried', 'w_path': 'worried',
    'su_party': 'surprised', 'su_snow': 'surprised', 'su_egg': 'surprised', 'su_balls': 'surprised',
}


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def main():
    page_errors, http_reqs = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()                          # 独立 headless，不弹不连不杀
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx.add_init_script(MUTE_INIT)                         # MUTE 双保险之一（r19）
        page = ctx.new_page()
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('request', lambda r: http_reqs.append(r.url) if r.url.startswith('http') else None)

        # ---- 1. verify=1 自检 ----
        page.goto(URL + '?verify=1')
        title = ''
        for _ in range(120):                                   # runVerify 异步（教学链+冒烟），轮询 title
            page.wait_for_timeout(500)
            title = page.title()
            if title.startswith('VERIFY'):
                break
        check('verify title', title.startswith('VERIFY PASS') and '/' in title, title)
        raw = page.eval_on_selector('#verify-result', 'el => el.textContent')
        out = json.loads(raw)
        check('verify pass==total', out['pass'] == out['total'], "%s/%s" % (out['pass'], out['total']))
        check('verify layoutOk', out['layoutOk'] is True)
        units_fail = {k: v for k, v in out['units'].items() if not v.get('ok')}
        smokes_fail = {k: v for k, v in out['smokes'].items() if not v.get('ok')}
        lv_fail = {k: v for k, v in {**out['levels'], **out['gen']}.items() if not v.get('ok')}
        check('verify units all green', not units_fail, units_fail)
        check('verify smokes all green', not smokes_fail, smokes_fail)
        check('verify 40 levels all green', not lv_fail and len(out['levels']) + len(out['gen']) == 40,
              'n=%d' % (len(out['levels']) + len(out['gen'])))
        check('0 pageerror (verify page)', not page_errors, page_errors[:3])

        # ---- 2. Python 独立封闭集+情境映射对账（40 关全题，r35 两向口径） ----
        levels_js = page.evaluate('Array.from({length:40}, (_, f) => { const L = genLevel(f); '
                                  'return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({ '
                                  'mode: q.mode, scene: q.scene, emo: q.emo, '
                                  'faces: q.faces.map(t => ({ emo: t.emo, scene: t.scene, right: t.right })) })) }; })')
        bad = []
        scene_cover = set()
        for lv in levels_js:
            rev_cnt = 0
            sc_seen = []
            for k, q in enumerate(lv['quizzes']):
                if q['emo'] not in PY_6:
                    bad.append((lv['flat'], k, 'emoNotIn6', q['emo']))
                    continue
                if q['mode'] not in ('fwd', 'rev'):
                    bad.append((lv['flat'], k, 'modeBad', q['mode']))
                if q['scene'] not in PY_SCENES:
                    bad.append((lv['flat'], k, 'sceneNotInTable', q['scene']))
                    continue
                if PY_SCENES[q['scene']] != q['emo']:
                    bad.append((lv['flat'], k, 'sceneMapMismatch', q['scene']))
                if q['mode'] == 'rev':
                    rev_cnt += 1
                    scq = [f['scene'] for f in q['faces']]
                    if len(set(scq)) != 4 or q['scene'] not in scq:
                        bad.append((lv['flat'], k, 'revSceneShape', scq))
                    for f in q['faces']:
                        if f['scene'] not in PY_SCENES or PY_SCENES[f['scene']] != f['emo']:
                            bad.append((lv['flat'], k, 'revFaceMap', f['scene'], f['emo']))
                        if f['right'] != (f['scene'] == q['scene']):
                            bad.append((lv['flat'], k, 'revRightFlag', f['scene']))
                        if f['scene'] in sc_seen:
                            bad.append((lv['flat'], k, 'sceneDupInLevel', f['scene']))
                    sc_seen.extend(scq)
                    scene_cover.update(scq)
                else:
                    if any(f['scene'] is not None for f in q['faces']):
                        bad.append((lv['flat'], k, 'fwdSceneNotNull'))
                    if q['scene'] in sc_seen:
                        bad.append((lv['flat'], k, 'sceneDupInLevel', q['scene']))
                    sc_seen.append(q['scene'])
                    scene_cover.add(q['scene'])
                ems = [f['emo'] for f in q['faces']]
                if len(ems) != 4 or len(set(ems)) != 4:
                    bad.append((lv['flat'], k, 'facesDup', ems))
                for f in q['faces']:
                    if f['emo'] not in PY_6:
                        bad.append((lv['flat'], k, 'faceNotIn6', f['emo']))
                    if q['mode'] == 'fwd' and f['right'] != (f['emo'] == q['emo']):
                        bad.append((lv['flat'], k, 'rightFlag', f['emo']))
                if sum(1 for f in q['faces'] if f['right']) != 1:
                    bad.append((lv['flat'], k, 'rightN', ems))
                ds = [f['emo'] for f in q['faces'] if not f['right']]
                if len(ds) != 3 or q['emo'] in ds:
                    bad.append((lv['flat'], k, 'distrNot3', ds))
                if PY_NEAR[q['emo']] not in ems:                # 近伙伴恒在场（NEAR 三对全域律）
                    bad.append((lv['flat'], k, 'nearMissing', q['emo'], ems))
                if lv['dch'] == 3 and q['emo'] not in PY_HARD4:
                    bad.append((lv['flat'], k, 'dch3NotHard4', q['emo']))
            if lv['dch'] == 1 and rev_cnt != 0:
                bad.append((lv['flat'], 'dch1HasRev', rev_cnt))
            if lv['dch'] == 2 and rev_cnt != 2:
                bad.append((lv['flat'], 'dch2RevN', rev_cnt))
            if lv['dch'] == 3 and rev_cnt != 3:
                bad.append((lv['flat'], 'dch3RevN', rev_cnt))
            if lv['dch'] == 4 and not (2 <= rev_cnt <= 3):
                bad.append((lv['flat'], 'dch4RevN', rev_cnt))
        check('python-side closed-set+scene parity (40 levels x 5 quizzes, r35)', not bad, bad[:5])
        anchor = levels_js[0]['quizzes'][0]
        check('flat0 q0 anchor {fwd,happy}',
              anchor['emo'] == 'happy' and anchor['mode'] == 'fwd' and anchor['scene'].startswith('h_'), anchor)
        check('scene table >= 20 unique & covered', len(PY_SCENES) >= 20 and len(scene_cover) >= 20,
              (len(PY_SCENES), len(scene_cover)))

        # ---- 3. EM 钩子语义（外部切关 / quiz 字段含 mode+scene / tapFace 下标语义） ----
        page.evaluate('EM.start(10)')
        lv = page.evaluate('() => EM.currentLevel')
        check('EM.start(10) takes effect (ch3)', lv['flat'] == 10 and lv['ch'] == 3 and lv['dch'] == 3, lv)
        qz = page.evaluate('() => EM.quiz')
        ids_ok = [t['id'] for t in qz['faces']] == ['f0', 'f1', 'f2', 'f3']
        faces_contract = all(set(t.keys()) == {'id', 'emo', 'scene'} for t in qz['faces'])
        mode_contract = qz['mode'] in ('fwd', 'rev') and all(
            (t['scene'] is not None) == (qz['mode'] == 'rev') for t in qz['faces'])
        near_in = PY_NEAR[qz['emo']] in [t['emo'] for t in qz['faces']]
        check('EM.quiz contract (scene/emo/mode/faces id+emo+scene, r35)',
              qz['emo'] in PY_HARD4 and len(qz['faces']) == 4 and ids_ok and faces_contract and
              mode_contract and near_in and
              sum(1 for t in qz['faces'] if t['emo'] == qz['emo']) == 1 and qz['step'] == 0 and qz['miss'] == 0, qz)
        wrong_i = next(i for i, t in enumerate(qz['faces']) if t['emo'] != qz['emo'])
        page.evaluate('i => EM.tapFace(i)', wrong_i)          # fire-and-forget（1000ms 窗）
        page.wait_for_timeout(1300)
        after = page.evaluate('() => ({ miss: EM.quiz.miss, lvlMiss: EM.currentLevel.miss, step: EM.quiz.step })')
        check('tapFace(index) semantics (wrong card +1 miss)',
              after['miss'] == 1 and after['lvlMiss'] == 1 and after['step'] == 0, after)

        # ---- 4. 双 viewport 布局 + 截图非空白（verify 页，候选卡=主答案 ≥96 两向同守）
        #      竞态修复（r35）：goto 后必须等 runVerify 完成（title 变 VERIFY PASS/FAIL）
        #      再 EM.start——否则页内异步单元（autoSolve/教学链）中途换关，截图标错 flat ----
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 10), (800, 1180, 10),
                           (1280, 800, 17), (800, 1180, 17)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.goto(URL + '?verify=1')
            for _ in range(120):
                if page.title().startswith('VERIFY'):
                    break
                page.wait_for_timeout(500)
            page.evaluate('EM.start(%d)' % flat)
            # 截图取证净化：#verify-result 为 fixed 浮层（body.verify 时 display:block，
            # max-height:60vh）会遮住题面——仅截图前隐藏（不动游戏 DOM，几何量测在其后）
            page.evaluate('document.getElementById("verify-result").style.display="none"')
            page.wait_for_timeout(800)            # 卡 pop 入场动画(.42s+级联 70ms)播完再截，防中途帧方差低
            m = page.evaluate('''() => {
              const cards = [...document.querySelectorAll('.card')].map(b => [b.offsetWidth, b.offsetHeight]);
              const sc = document.getElementById('scene');
              const g = document.getElementById('game');
              return { cards: cards, minWH: Math.min(...cards.flat()),
                       scene: [sc.offsetWidth, sc.offsetHeight],
                       ox: Math.max(g.scrollWidth - g.clientWidth,
                                    document.documentElement.scrollWidth - document.documentElement.clientWidth) };
            }''')
            shot = HERE / '_shots' / ('vp%d_%d_f%d.png' % (w, h, flat))
            shot.parent.mkdir(exist_ok=True)
            page.screenshot(path=str(shot))
            try:
                from PIL import Image
                import statistics
                im = Image.open(str(shot)).convert('L').resize((160, 100))
                sd = statistics.pstdev(list(im.getdata()))
                nonblank = sd > 10
            except ImportError:
                nonblank, sd = shot.stat().st_size > 30000, -1
            check('layout %dx%d flat%d' % (w, h, flat),
                  m['minWH'] >= 96 and m['scene'][0] >= 64 and m['scene'][1] >= 64 and m['ox'] <= 0 and nonblank,
                  {'minCard': m['minWH'], 'scene': m['scene'], 'ox': m['ox'], 'pixelSd': round(sd, 1)})

        # ---- 5. 表情脸六型互异（页面 faceSvg → Python 侧两两互异 + DOM 渲染在场） ----
        faces6 = page.evaluate('() => { const o = {}; ["happy","sad","angry","scared","surprised","worried"].forEach(e => o[e] = faceSvg(e)); return o; }')
        sigs = {e: s for e, s in faces6.items()}
        check('faceSvg six distinct full SVGs', len(set(sigs.values())) == 6, list(sigs))
        # 六型渲染 DOM 在场（startLevel 后 4 张脸 SVG 各自互异渲染）
        page.set_viewport_size({'width': 1280, 'height': 800})
        page.goto(URL + '?verify=1')
        page.wait_for_timeout(200)
        page.evaluate('EM.start(3)')
        page.wait_for_timeout(200)
        dom = page.evaluate('''() => {
          const svgs = [...document.querySelectorAll('.card svg')].map(s => s.innerHTML);
          return { n: svgs.length, distinct: new Set(svgs).size,
                   sigs: [...document.querySelectorAll('.card')].map(c => c.dataset.emo) };
        }''')
        check('rendered 4 face SVGs distinct in DOM', dom['n'] == 4 and dom['distinct'] == 4, dom)

        # ---- 6+7. 正常模式（非 verify 页）真实主流程 + 情绪词 clip 触发（r35 适配） ----
        # MUTE 双保险之二（r19）：种档 settings 全关（sound/tts/vol:0）——init 前注入
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx.add_init_script(MUTE_INIT)
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        seeded = json.dumps({'v': '1.0', 'game': 'emo', 'firstDay': '2026-09-18', 'lastDay': '2026-09-18',
                             'levels': {}, 'dailyMin': {},
                             'settings': {'sound': False, 'tts': False, 'vol': 0},
                             'restTip': {'day': '', 'shown': 0}})
        pg2.add_init_script('localStorage.setItem("kidsgame_emo", %s);' % json.dumps(seeded))
        pg2.goto(URL)
        # wrap play/queue 记录语音 key（选对情绪词 clip 触发断言用——不改动播放行为）
        pg2.evaluate('''() => {
          KIDS.voice._log = [];
          const _p = KIDS.voice.play.bind(KIDS.voice);
          KIDS.voice.play = (k, t) => { KIDS.voice._log.push(['play', k]); return _p(k, t); };
          const _q = KIDS.voice.queue.bind(KIDS.voice);
          KIDS.voice.queue = (parts) => { KIDS.voice._log.push(['queue', parts.map(p => typeof p === 'string' ? p : {key: p.key, text: p.text})]); return _q(parts); };
        }''')
        tut = ''
        for _ in range(50):                       # watch ≈9s（真实 SPEED=1：watch 2952+演示链 6800+收束）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('EM.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__emDemoR')
        check('normal-mode tutorial watch->help', tut == 'help' and demo_r == 'right',
              {'tut': tut, '__emDemoR': demo_r})
        # 教学演示链：情绪词 clip 已按题内情绪触发（flat0 题0=fwd happy）
        log0 = pg2.evaluate('KIDS.voice._log')
        demo_word = any(e[0] == 'queue' and e[1] and e[1][0] and e[1][0].get('key') == 'emo_w_happy' for e in log0)
        check('tutorial demo chain plays emo_w_happy (anchor)', demo_word, log0[:6])
        base_len = len(log0)                                  # 演示链计入基线，正式答题只看新增段

        # 真实 pointer 逐题点应选卡（两向：fwd=情绪脸 / rev=情境图）。
        # 存量红修复①（SPEC §R0）：链窗 6800>旧等待 3900，引擎 step 同步推进而 DOM 在链窗后
        # 才刷新——固定等待会重复读题+点击旧 DOM。改为 DOM 同步轮询：点前等 DOM=当前 quiz，
        # 点后等（step 推进 或 done）且 DOM=下一 quiz。
        def right_idx(qz):
            for i, c in enumerate(qz['faces']):
                if c['scene'] is not None:
                    if c['scene'] == qz['scene']:
                        return i
                elif c['emo'] == qz['emo']:
                    return i
            return None

        def dom_in_sync():
            return pg2.evaluate('''() => {
              const q = EM.quiz, cards = [...document.querySelectorAll('.card')];
              if (!q) return EM.currentLevel && EM.currentLevel.done;   // done 后无题面=同步
              if (cards.length !== q.faces.length) return false;
              return cards.every((c, i) => c.dataset.i == i && c.dataset.emo === q.faces[i].emo &&
                (q.faces[i].scene == null ? c.dataset.scene === undefined
                                          : c.dataset.scene === q.faces[i].scene));
            }''')

        def wait_true(fn, timeout_ms=15000, step_ms=250):
            for _ in range(int(timeout_ms / step_ms)):
                if fn():
                    return True
                pg2.wait_for_timeout(step_ms)
            return fn()

        got_words, got_modes = [], []
        dom_ok_all = True
        guard = 0
        while guard < 40:
            guard += 1
            if not wait_true(dom_in_sync):                    # 点前：DOM=当前 quiz
                dom_ok_all = False
                break
            st = pg2.evaluate('() => ({ done: EM.currentLevel.done, quiz: EM.quiz })')
            if st['done'] or not st['quiz']:
                break
            emo_now, mode_now = st['quiz']['emo'], st['quiz']['mode']
            idx = right_idx(st['quiz'])
            if idx is None:
                dom_ok_all = False
                break
            prev_step = st['quiz']['step']
            pg2.click('.card[data-i="%d"]' % idx, timeout=3000)
            # 点后：step 推进或 done（引擎同步），DOM 刷新到下一题（链窗 6800 内锁定）
            advanced = wait_true(lambda: pg2.evaluate(
                '() => EM.currentLevel.done || EM.quiz && EM.quiz.step > %d' % prev_step))
            got_words.append(emo_now)
            got_modes.append(mode_now)
            if not advanced:
                break
        cel = False
        for _ in range(12):                       # celebrate 层存在 2.3s，轮询抓取
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('EM.currentLevel.done')
            if cel:
                break
            pg2.wait_for_timeout(300)
        # 存量红修复②：写档在链窗 6800+celebrate 2.3s+补窗 700 ≈ 10.1s 后——轮询至 18s 覆盖
        sv = None
        for _ in range(36):
            sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_emo")||"null")')
            if sv and sv.get('levels', {}).get('1-0', {}).get('stars') is not None:
                break
            pg2.wait_for_timeout(500)
        log1 = pg2.evaluate('KIDS.voice._log')[base_len:]     # 剔除教学演示链基线
        word_hits = [e for e in log1 if e[0] == 'queue' and e[1] and e[1][0] and
                     isinstance(e[1][0], dict) and e[1][0].get('key') and e[1][0]['key'].startswith('emo_w_')]
        hit_words = [e[1][0]['key'].replace('emo_w_', '') for e in word_hits]
        # 链尾段按题向断言：fwd→emo_cf_<scene>（确认句）/ rev→emo_s_<scene>（情境句）
        tail_keys = [e[1][1].get('key', '') if len(e[1]) > 1 and e[1][1] else '' for e in word_hits]
        tail_ok = len(tail_keys) == len(got_modes) and all(
            (tk.startswith('emo_cf_') if m == 'fwd' else tk.startswith('emo_s_'))
            for tk, m in zip(tail_keys, got_modes))
        chain_ok = dom_ok_all and len(hit_words) == len(got_words) and \
                   all(w == e for w, e in zip(hit_words, got_words)) and tail_ok
        check('right-path emo_w_<word> clip per-quiz + tail clip by mode (r35)',
              chain_ok, {'hit': hit_words, 'expect': got_words, 'modes': got_modes,
                         'tails': tail_keys[:3], 'dom_ok': dom_ok_all})
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('normal-mode solve & celebrate & save (polled)',
              cel and (sv or {}).get('v') == '1.0' and (sv or {}).get('emo', {}).get('tutSeen')
              and st1.get('stars') == 3,
              {'celebrate_or_done': cel, 'v': (sv or {}).get('v'),
               'tutSeen': (sv or {}).get('emo'), 'stars10': st1.get('stars')})

        # ---- 7b. 正常模式 rev 链（独立 context：种档 tutSeen+1-0 已通——无教学/无挂起
        #      proceed 定时器；主腿 flat0 收官后 winFlow 的 setTimeout(proceed,3400) 会
        #      中途换关吃掉点击，故本腿必须干净页面起 flat10）----
        ctx3 = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx3.add_init_script(MUTE_INIT)
        pg3 = ctx3.new_page()
        errs3 = []
        pg3.on('pageerror', lambda e: errs3.append(str(e)))
        seeded3 = json.dumps({'v': '1.0', 'game': 'emo', 'firstDay': '2026-09-18', 'lastDay': '2026-09-18',
                              'levels': {'1-0': {'stars': 3, 'plays': 1}}, 'dailyMin': {},
                              'settings': {'sound': False, 'tts': False, 'vol': 0},
                              'restTip': {'day': '', 'shown': 0},
                              'emo': {'tutSeen': True}})
        pg3.add_init_script('localStorage.setItem("kidsgame_emo", %s);' % json.dumps(seeded3))
        pg3.goto(URL)
        pg3.evaluate('''() => {
          KIDS.voice._log = [];
          const _p = KIDS.voice.play.bind(KIDS.voice);
          KIDS.voice.play = (k, t) => { KIDS.voice._log.push(['play', k]); return _p(k, t); };
          const _q = KIDS.voice.queue.bind(KIDS.voice);
          KIDS.voice.queue = (parts) => { KIDS.voice._log.push(['queue', parts.map(p => typeof p === 'string' ? p : {key: p.key, text: p.text})]); return _q(parts); };
        }''')
        pg3.evaluate('EM.start(10)')                          # flat10=dch3：q0 恒含 rev（3/关）

        def dom_in_sync3():
            return pg3.evaluate('''() => {
              const q = EM.quiz, cards = [...document.querySelectorAll('.card')];
              if (!q) return EM.currentLevel && EM.currentLevel.done;
              if (cards.length !== q.faces.length) return false;
              return cards.every((c, i) => c.dataset.i == i && c.dataset.emo === q.faces[i].emo &&
                (q.faces[i].scene == null ? c.dataset.scene === undefined
                                          : c.dataset.scene === q.faces[i].scene));
            }''')

        def wait_true3(fn, timeout_ms=15000, step_ms=250):
            for _ in range(int(timeout_ms / step_ms)):
                if fn():
                    return True
                pg3.wait_for_timeout(step_ms)
            return fn()

        mark = len(pg3.evaluate('KIDS.voice._log'))
        stepped = 0
        rev_done = False
        while stepped < 5:
            if not wait_true3(dom_in_sync3):
                break
            qv = pg3.evaluate('() => EM.quiz')
            if not qv:
                break
            if qv['mode'] == 'rev':
                # 题面链（重听路径等价触发）=[emo_w_<E>, emo_rev_q(TODO 注册前 TTS 兜底 text)]
                pg3.evaluate('speakQuiz()')
                rev_log = pg3.evaluate('KIDS.voice._log')[mark:]
                stem = [e for e in rev_log if e[0] == 'queue' and e[1] and len(e[1]) >= 2 and
                        isinstance(e[1][1], dict) and e[1][1].get('key') == 'emo_rev_q']
                stem_ok = bool(stem) and stem[-1][1][0].get('key') == 'emo_w_' + qv['emo'] and \
                    '哪件事' in stem[-1][1][1].get('text', '')
                ridx = right_idx(qv)
                prev_step = qv['step']
                pg3.click('.card[data-i="%d"]' % ridx, timeout=3000)
                wait_true3(lambda: pg3.evaluate(
                    '() => EM.currentLevel.done || EM.quiz && EM.quiz.step > %d' % prev_step))
                tail = pg3.evaluate('KIDS.voice._log')[mark:]
                right_q = [e for e in tail if e[0] == 'queue' and e[1] and len(e[1]) >= 2 and
                           isinstance(e[1][1], dict) and e[1][1].get('key') == 'emo_s_' + qv['scene']]
                check('rev-mode stem emo_rev_q + right-chain tail emo_s_<scene> (r35)',
                      stem_ok and len(right_q) >= 1,
                      {'stem_ok': stem_ok, 'tail_n': len(right_q), 'emo': qv['emo'], 'scene': qv['scene']})
                rev_done = True
                break
            ridx = right_idx(qv)
            prev_step = qv['step']
            pg3.click('.card[data-i="%d"]' % ridx, timeout=3000)
            wait_true3(lambda: pg3.evaluate(
                '() => EM.currentLevel.done || EM.quiz && EM.quiz.step > %d' % prev_step))
            stepped += 1
        if not rev_done:
            check('rev-mode stem+tail (r35)', False, 'flat10 未遇到 rev 题（分布异常）')
        check('0 pageerror (rev-mode page)', not errs3, errs3[:3])
        ctx3.close()
        check('0 pageerror (normal mode)', not errs2, errs2[:3])
        ctx.close()

        # ---- 离线复核：全程无 http(s) 请求（file:// 本页除外） ----
        check('offline (no http requests)', not [u for u in http_reqs if not u.startswith('file://')],
              [u for u in http_reqs if not u.startswith('file://')][:3])
        check('0 pageerror (overall)', not page_errors, page_errors[:3])
        ctx.close()
        browser.close()

    fails = [r for r in RESULTS if not r[1]]
    print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
    if fails:
        for n, _, d in fails:
            print('FAIL:', n, d)
        sys.exit(1)


if __name__ == '__main__':
    main()
