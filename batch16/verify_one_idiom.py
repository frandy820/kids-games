# -*- coding: utf-8 -*-
"""batch16 idiom 独立复验 r16（断言从 SPEC-BATCH16 §3-r16 推导，禁从实现行为归纳）
I1 VERIFY | I2 钩子契约+aria | I3 flat1 真实通关 3★ | I4 两错白话小注+豁免窗+2★
I5 Python 第三源审计（80 条库：五章闭包/近义对唯一互指/情境句映射/时长 Python 复算精确防回漂
   +60 关结构对账：6fill+2near/章域/干扰互异/options[answer]=idx/确定性）
I6 教学链 | I7 sayW 三态 | I8 救援 14s 方向级+30s 答案级 | I9 双viewport+触摸+离线+clip90
I10 flat16 ch3 + flat40 生成关真实通关"""
import asyncio, io, json, os, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'idiom' / 'index.html').as_posix()
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

# ---------- Python 第三源真值库（从 _src/game-data.js 正则提取——禁抄页面运行时） ----------
SRC = (BASE / 'idiom' / '_src' / 'game-data.js').read_text(encoding='utf-8')
ENT = re.findall(r"\{ i:\s*(\d+),\s*id:\s*'([^']+)',\s*ch:\s*(\d+),\s*near:\s*(\d+),\s*"
                 r"say:\s*'([^']+)',\s*ctx:\s*'([^']+)'", SRC)
LIB = {int(i): {'id': d, 'ch': int(c), 'near': int(n), 'say': s, 'ctx': x}
       for i, d, c, n, s, x in ENT}
# SPEC §3-r16 定稿常量（时长模型——Python 独立复算；b25 estMs 全字符口径）
Q_INSTR = {'fill': '空格里该填哪个成语呀', 'near': '这两个成语很像，哪个更合适'}
DECIDE = {'fill': 22000, 'near': 18000}
ADV_MS, ENTER_MS, SEG_GAP, TAIL = 880, 400, 150, 300
MIN_EXACT, LEVEL_MIN = 175040, 40000          # 6*(22000+880)+2*(18000+880)；每关下限
SPEC_PAIRS = {1: 5, 2: 4, 3: 4, 4: 4, 5: 4}   # 各章近义对数（互指去重；每章 >=2 保 near 题可行）

def est_ms(n):                                # b25 定版算式独立重列
    return n * 345 + 600

# ---------- 声音纪律（主线强制 2026-09-16：chrome-headless-shell 不认 --mute-audio，浏览器级
# 静音无效音频直走系统输出——三层保险，所有 goto 全覆盖自查无遗漏）：
# ① INIT_SND（add_init_script，先于页面 JS）：接管底层通道 new Audio/speechSynthesis/AudioContext
#    ——goto 返回前 init+首题开题链已跑，仅靠 goto 后 stub 拦不住这段窗口
# ② STUB_SND（goto 后立即 evaluate）：KIDS.voice.play/queue/say+KIDS.audio.sfx/note 全置空
#    （计数 __vlog 保留，原实现不调=零声）
# ③ 种档 settings sound/tts=false（core 级开关）。
# verify 页（?verify=1）game-verify.js 已自 stub 记录型（__lastQueue 断言依赖）——只加 ①③ 不覆盖 ②。
INIT_SND = """(() => {
  if (window.__sndStubbed) return; window.__sndStubbed = 1;
  try { if (window.speechSynthesis) { speechSynthesis.speak = function () {};
    speechSynthesis.cancel = function () {}; } } catch (e) {}
  try { window.Audio = function () { return { play: function () { return Promise.resolve(); },
    pause: function () {}, load: function () {}, canPlayType: function () { return ''; },
    volume: 0, muted: true, autoplay: false }; }; } catch (e) {}
  try { var AC0 = window.AudioContext || window.webkitAudioContext;
    if (AC0) { var fac = function () { return {
      resume: function () { return Promise.resolve(); },
      close: function () { return Promise.resolve(); }, state: 'running', currentTime: 0,
      destination: {},
      createOscillator: function () { return { frequency: { value: 0, setValueAtTime: function () {} },
        connect: function () {}, start: function () {}, stop: function () {} }; },
      createGain: function () { return { gain: { value: 0, setValueAtTime: function () {},
        linearRampToValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} },
        connect: function () {} }; } }; };
      window.AudioContext = fac; window.webkitAudioContext = fac; } } catch (e) {}
})();"""

STUB_SND = """(() => {
  window.__vlog = window.__vlog || [];
  KIDS.voice.play = function (k) { window.__vlog.push('P:' + k); };
  KIDS.voice.queue = function (parts) { window.__vlog.push('Q:' + (parts || []).map(
    function (p) { return typeof p === 'string' ? p : ((p && p.key) || 'null'); }).join('|')); };
  KIDS.voice.say = function () {};
  KIDS.audio.sfx = function (n) { window.__vlog.push('S:' + n); };
  KIDS.audio.note = function () {};
  return true;
})()"""

def seed(n, stars=1, bonus=0):
    return """const sv = KIDS._save() || { levels: {} };
  sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/8)+1)+'-'+(i%%8)] = { stars: %d };
  sv.idiom = { tutSeen: true };
  sv.settings = { sound: false, tts: false, vol: 0 };   /* 声音纪律三层之一：core 级开关 */
  %s
  KIDS.store.persist();""" % (n, stars, 'KIDS.calendar.bonusSet(%d);' % bonus if bonus else '')

def gen_seed(done_n, bonus_today, first_day=None, last_day=None):
    """r16 键基 //8 种档（生成关触达用：firstDay=昨天+bonus30 → lim>40）"""
    import time as _t
    from datetime import date as _d, timedelta as _td
    today = _t.strftime('%Y-%m-%d')
    yday = (_d.today() - _td(days=1)).strftime('%Y-%m-%d')
    save = {'v': '1.0', 'game': 'idiom', 'firstDay': first_day or yday,
            'lastDay': last_day or today, 'levels': {}, 'dailyMin': {},
            'bonus': {today: bonus_today}, 'settings': {'sound': False, 'tts': False, 'vol': 0},
            'restTip': {'day': '', 'shown': 0}, 'idiom': {'tutSeen': True}}
    for f in range(done_n):
        save['levels']['%d-%d' % (f // 8 + 1, f % 8)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_idiom", ' + json.dumps(json.dumps(save)) + ')'

async def tap_card(pg, i):
    pos = await pg.evaluate("""(i) => { const e = document.querySelector('.card[data-i="'+i+'"]');
        if (!e) return null; const b = e.getBoundingClientRect();
        return {x: b.left + b.width / 2, y: b.top + b.height * 0.6}; }""", i)
    if pos is None:
        return False
    await pg.mouse.click(pos['x'], pos['y'])
    await pg.wait_for_timeout(200)
    return True

async def tap_wrong(pg):
    q = await pg.evaluate('IDM.quiz')
    if not q:
        return None
    wi = next(i for i in range(len(q['optionIdxs'])) if i != q['answer'])
    return await tap_card(pg, wi)

async def wait_ready(pg, timeout=16000):
    """等演出/错点窗收束（确认链窗 1600+confirmTailMs 最坏 ~12.4s 真实页）"""
    await pg.wait_for_function(
        'IDM.currentLevel ? ((!IDM.currentLevel.locked && !IDM.currentLevel.demo) ||'
        ' IDM.currentLevel.won) : true', timeout=timeout)

async def play_level(pg, first_wrong=False, twice_wrong=False):
    """真实 pointer 通关当前关 8 题；可选首题错一次/两次（豁免窗 6480 真时钟——轮询至 miss 递增）"""
    wrongs = 1 if first_wrong else (2 if twice_wrong else 0)
    done_wrong, answered = 0, 0
    note_seen = False
    for _ in range(40):
        q = await pg.evaluate('IDM.quiz')
        if q is None:
            break
        if done_wrong < wrongs:
            wi = next(i for i in range(len(q['optionIdxs'])) if i != q['answer'])
            m0 = q['miss']
            for _ in range(40):                     # 错链豁免窗吞窗内错卡 → 轮询至 miss 递增
                await tap_card(pg, wi)
                await pg.wait_for_timeout(500)
                st = await pg.evaluate('IDM.quiz && IDM.quiz.step')
                m = await pg.evaluate('IDM.quiz ? IDM.quiz.miss : -1')
                if st == q['step'] and m == m0 + 1:
                    break
            await pg.wait_for_timeout(1200)         # 错点防重入窗 1000ms 过后量 UI
            if wrongs >= 2 and done_wrong == 1:
                note_seen = await pg.evaluate(
                    'document.getElementById("note").classList.contains("show")')
            done_wrong += 1
            continue
        await pg.evaluate('IDM.hear()')
        await pg.wait_for_timeout(200)
        await tap_card(pg, q['answer'])
        answered += 1
        await wait_ready(pg)
        await pg.wait_for_timeout(120)
    return answered, note_seen

# ---------- Python 第三源审计（I5）：库不变式 + 60 关结构 + 时长精确复算 ----------
def audit_lib():
    bad = []
    if len(LIB) != 80 or len(ENT) != 80:
        bad.append('lib size=%d' % len(LIB))
        return bad, {}
    for i in range(1, 81):
        if i not in LIB:
            bad.append('i=%d missing' % i)
            continue
        e = LIB[i]
        if e['ch'] != (i - 1) // 16 + 1:                       # 义类分章闭包（五章各 16）
            bad.append('i=%d ch=%d' % (i, e['ch']))
        if not re.fullmatch(r'[一-龥]{4,6}', e['id']):         # id 4-6 汉字
            bad.append('i=%d id' % i)
        if e['ctx'].count('____') != 1:                        # 空位恰一次
            bad.append('i=%d blank' % i)
        if not 14 <= len(e['ctx']) <= 28:                      # 14-28 字（<=28 硬门禁）
            bad.append('i=%d ctxLen=%d' % (i, len(e['ctx'])))
        if e['id'] in e['ctx']:                                # 情境句禁含本体整串
            bad.append('i=%d ctx 含本体' % i)
        if not 6 <= len(e['say']) <= 18:
            bad.append('i=%d sayLen' % i)
        n = e['near']
        if n != 0:
            if n == i or LIB.get(n, {}).get('near') != i:      # 近义对互指对称（唯一性=每条至多 1 对）
                bad.append('i=%d near=%d 不互指' % (i, n))
            elif LIB[n]['ch'] != e['ch']:                      # 对端同章
                bad.append('i=%d near 跨章' % i)
    pairs = {ch: 0 for ch in range(1, 6)}
    for i, e in LIB.items():
        if e['near'] > 0 and i < e['near']:                    # 互指去重（小端计一次）
            pairs[e['ch']] += 1
    for ch in range(1, 6):
        if pairs[ch] != SPEC_PAIRS[ch]:
            bad.append('ch=%d pairs=%d!=%d' % (ch, pairs[ch], SPEC_PAIRS[ch]))
    return bad, pairs

def audit_levels(levels):
    """60 关（静态 40+生成 20）结构+时长 Python 复算：kind 构成/章域/干扰/答案位/175040 精确"""
    bad, durs = [], []
    for L in levels:
        flat, dch = L['flat'], L['dch']
        kinds = [q['k'] for q in L['qs']]
        if kinds.count('fill') != 6 or kinds.count('near') != 2:
            bad.append('f%d kind 构成 %s' % (flat, kinds))
        total = 0
        for q in L['qs']:
            idx, opt, ans = q['i'], q['o'], q['a']
            e = LIB.get(idx)
            if not e or e['ch'] != dch:                        # 题目成语在该难度章（第三源章表）
                bad.append('f%d idx=%d ch!=dch%d' % (flat, idx, dch))
                continue
            if len(set(opt)) != len(opt) or opt[ans] != idx or opt.count(idx) != 1:
                bad.append('f%d idx=%d opts/ans' % (flat, idx))    # 候选互异+答案位一致
            dis = [o for o in opt if o != idx]
            if q['k'] == 'near':
                if len(opt) != 2 or dis != [e['near']]:        # near 干扰=指定对端（唯一性）
                    bad.append('f%d near 干扰!=对端' % flat)
            else:
                if len(opt) != 4 or any(LIB[o]['ch'] != dch for o in dis):
                    bad.append('f%d fill 干扰非同章' % flat)   # fill 干扰全同章（同章语义域迷惑）
            # 时长模型 Python 复算（第三源文本长度——库改长/指令改字在此回漂被抓）
            v0 = ENTER_MS + est_ms(len(Q_INSTR[q['k']])) + SEG_GAP + est_ms(len(e['ctx'])) + TAIL
            if v0 > DECIDE[q['k']]:
                bad.append('f%d idx=%d voice0=%d>DECIDE（ctx 过长回漂）' % (flat, idx, v0))
            total += max(v0, DECIDE[q['k']]) + ADV_MS
        if total != MIN_EXACT:                                 # 每关 modeled 恒 175040 精确防回漂
            bad.append('f%d modeled=%d!=%d' % (flat, total, MIN_EXACT))
        durs.append(total)
        if total < LEVEL_MIN:
            bad.append('f%d <LEVEL_MIN' % flat)
        if flat >= 40 and not 1 <= dch <= 5:
            bad.append('f%d 生成关 dch=%d' % (flat, dch))
    if durs and set(durs) != {MIN_EXACT}:
        bad.append('60 关 modeled 不恒一：%s' % sorted(set(durs))[:3])
    return bad

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])

        # I1 VERIFY + I5 页面 60 关数据采集（verify 页：game-verify.js 已自 stub 记录型——
        # 只走 INIT_SND 底层接管，不 evaluate STUB_SND 覆盖其 __lastQueue 断言）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '?verify=1')
        title = ''
        for _ in range(120):
            title = await pg.title()
            if title.startswith('VERIFY'):
                break
            await pg.wait_for_timeout(500)
        rec('I1 VERIFY title（startswith 口径）',
            title.startswith('VERIFY PASS 14/14') and not errs, 'title=%s errs=%s' % (title, errs[:1]))
        levels = await pg.evaluate("""(() => { const out = [];
          for (let f = 0; f < 60; f++) { const L = genLevel(f);
            out.push({ flat: f, dch: L.dch, ch: L.ch,
              det: JSON.stringify(L.quizzes) === JSON.stringify(genLevel(f).quizzes),
              qs: L.quizzes.map(q => ({ k: q.kind, i: q.idx, o: q.options, a: q.answer })) }); }
          return out; })()""")
        await ctx.close()

        # I5 Python 第三源审计（库不变式+结构+时长精确）
        badLib, pairs = audit_lib()
        rec('I5a 库 80 条 Python 第三源审计（五章闭包/近义互指唯一/ctx 映射/对数 %s）'
            % json.dumps(SPEC_PAIRS), not badLib, 'bad=%s pairs=%s' % (badLib[:3], pairs))
        badLv = audit_levels(levels) + (['同 flat 不确定'] if not all(L['det'] for L in levels) else [])
        rec('I5b 60 关结构+modeled 175040 Python 精确复算（6fill+2near/章域/干扰/答案位/防回漂）',
            not badLv, 'bad=%s' % badLv[:3])

        # I2 钩子+aria | I3 flat1 真实通关
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.evaluate(STUB_SND)   # 声音纪律②：goto 后立即 stub（零声+计数）
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        q = await pg.evaluate('IDM.quiz')
        aria = await pg.evaluate("""(() => { const cs = [...document.querySelectorAll('.card')];
          return { n: cs.length, ariaOk: cs.every(e => LIB_ARIA(e)) };
          function LIB_ARIA(e) { return (e.getAttribute('aria-label') || '').length >= 4; } })()""")
        hook_ok = q and all(k in q for k in ('kind', 'idx', 'ctx', 'optionIds', 'optionIdxs',
                                             'answer', 'step', 'miss', 'hinted')) and \
            q['optionIds'][q['answer']] == LIB[q['idx']]['id'] and \
            q['ctx'] == LIB[q['idx']]['ctx']
        near_ok = True
        if q and q['kind'] == 'near':                 # near 干扰=指定对端（第三源互指对账）
            peer = [x for x in q['optionIdxs'] if x != q['idx']][0]
            near_ok = LIB[q['idx']]['near'] == peer and LIB[peer]['near'] == q['idx']
        rec('I2 钩子契约+候选卡 aria=成语（第三源映射+near 对端互指）',
            bool(hook_ok) and near_ok and aria['n'] == (2 if q['kind'] == 'near' else 4) and
            aria['ariaOk'] and '____' in q['ctx'],
            'kind=%s idx=%s aria=%s' % (q and q['kind'], q and q['idx'], aria))
        answered, _ = await play_level(pg)
        await pg.wait_for_timeout(4600)
        stars = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
        rec('I3 flat1 真实点击通关 3★', answered == 8 and stars == 3 and not errs,
            'answered=%d stars=%s errs=%s' % (answered, stars, errs[:1]))
        await ctx.close()

        # I4 两错=白话小注+hinted+2★（豁免窗后第二错才落）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.evaluate(STUB_SND)   # 声音纪律②：goto 后立即 stub（零声+计数）
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        answered, note_seen = await play_level(pg, twice_wrong=True)
        h4 = await pg.evaluate('IDM.quiz ? IDM.quiz.hinted : null')
        await pg.wait_for_timeout(4600)
        stars4 = await pg.evaluate("(KIDS._save().levels['1-1'] || {}).stars || 0")
        rec('I4 两错白话小注+hinted+2★', note_seen and answered == 8 and stars4 == 2 and not errs,
            'note=%s stars=%s errs=%s' % (note_seen, stars4, errs[:1]))
        await ctx.close()

        # I6 教学链（watch 吞输入+demoR + help 交接）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.evaluate(STUB_SND)   # 声音纪律②：goto 后立即 stub（零声+计数）
        await pg.wait_for_timeout(1500)
        await pg.evaluate('localStorage.clear()')
        await pg.reload()
        await pg.wait_for_timeout(1000)
        sw, demo_r, sw_done = False, None, False
        for _ in range(70):
            t = await pg.evaluate('IDM.tutorial')
            if t == 'watch' and not sw_done:
                st0 = await pg.evaluate('IDM.quiz ? IDM.quiz.step : -1')
                for _ in range(3):
                    await tap_card(pg, 0)
                st1 = await pg.evaluate('IDM.quiz ? IDM.quiz.step : -1')
                sw = st1 == st0
                sw_done = True
            demo_r = await pg.evaluate('window.__idmDemoR || null')
            if demo_r or t == 'help':
                break
            await pg.wait_for_timeout(400)
        if demo_r is None:
            demo_r = await pg.evaluate('window.__idmDemoR || null')
        rec('I6 教学 watch 吞输入+demoR（r16 __idmDemoR）', sw and demo_r == 'right' and not errs,
            'swallow=%s demoR=%s errs=%s' % (sw, demo_r, errs[:1]))
        await ctx.close()

        # I7 sayW 三态（真实页可达形态——10s 节流静默分支在自然游戏流物理不可达：错链豁免窗
        # 6480+确认窗恒使下次错距上次播 >10s，纯节流逻辑由页内 verify ⑥ SPEED=0.08 单测覆盖）：
        # 态一 flat1（<3）两题各错=每错必播（w=2）；态二 flat5（>=3）题A 错 1=首播（w=1）；
        # 态三 题 A 错 2（miss=2）=force 豁免必播（w=2）+窗吞窗内错卡（miss 不虚增）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.evaluate(STUB_SND)   # 声音纪律②：goto 后立即 stub（零声+计数）
        await pg.wait_for_timeout(1200)
        await pg.evaluate(STUB_SND)   # reload 后 KIDS 重建——重新 stub（vlog 计数接续）
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await pg.evaluate(STUB_SND)   # reload 后 KIDS 重建——重新 stub（vlog 计数接续）
        qA = await pg.evaluate('IDM.quiz')
        await tap_wrong(pg)                   # 题 A 错 1（flat<3 必播）
        await wait_ready(pg)
        await tap_card(pg, qA['answer'])      # 点对过题（对卡豁免窗内放行）
        await wait_ready(pg)
        await tap_wrong(pg)                   # 题 B 错 1（flat<3 必播）
        await wait_ready(pg)
        w1 = await pg.evaluate("window.__vlog.filter(x => x === 'Q:idm_wrong2|idm_hint2').length")
        await pg.evaluate(seed(5))
        await pg.reload()
        await pg.wait_for_timeout(3200)
        await pg.evaluate(STUB_SND)   # reload 后 KIDS 重建——重新 stub（vlog 计数接续）
        await tap_wrong(pg)                   # 题 A 错 1（flat>=3：startLevel 重置锚→首播）
        await wait_ready(pg)
        wA = await pg.evaluate("window.__vlog.filter(x => x === 'Q:idm_wrong2|idm_hint2').length")
        mSw = await pg.evaluate('IDM.quiz ? IDM.quiz.miss : -1')
        await tap_wrong(pg)                   # 窗内二击吞（false 不计 miss——契约 I）
        await wait_ready(pg)
        mSw2 = await pg.evaluate('IDM.quiz ? IDM.quiz.miss : -1')
        await pg.wait_for_timeout(5600)       # 豁免窗 6480 过窗
        await tap_wrong(pg)                   # 题 A 错 2（miss=2 → force 豁免必播）
        await wait_ready(pg)
        wA2 = await pg.evaluate("window.__vlog.filter(x => x === 'Q:idm_wrong2|idm_hint2').length")
        mA2 = await pg.evaluate('IDM.quiz ? IDM.quiz.miss : -1')
        rec('I7 sayW 三态（flat1 每错必播2/flat5 首播1+窗吞不虚计+miss2 force 播）',
            w1 == 2 and wA == 1 and mSw == 1 and mSw2 == 1 and wA2 == 2 and mA2 == 2 and not errs,
            'w1=%s wA=%s m=%s→%s wA2=%s mA2=%s' % (w1, wA, mSw, mSw2, wA2, mA2))
        await ctx.close()

        # I8 救援：14s 方向级重读 → 31.5s 答案级 breathe（错点不重置救援钟）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.evaluate(STUB_SND)   # 声音纪律②：goto 后立即 stub（零声+计数）
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await tap_wrong(pg)
        await wait_ready(pg)                  # 错点后不点对：错点不重置 lastAct（§0.7a）
        await pg.wait_for_timeout(5500)
        r0 = await pg.evaluate('IDM.rescues')
        await pg.wait_for_timeout(11000)      # 累计 ~16.5s > 14s → 方向级
        r1 = await pg.evaluate('IDM.rescues')
        await pg.wait_for_timeout(16500)      # 累计 ~32.5s > 30s → 答案级 breathe
        r2 = await pg.evaluate('IDM.rescues')
        br = await pg.evaluate("!!document.querySelector('.card.breathe')")
        rec('I8 救援 14s 方向级+30s 答案级 breathe', r0 == 0 and r1 >= 1 and r2 >= 2 and br and not errs,
            'r=%s→%s→%s breathe=%s errs=%s' % (r0, r1, r2, br, errs[:1]))
        await ctx.close()

        # I9 双viewport+触摸+离线+clip90
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.evaluate(STUB_SND)   # 声音纪律②：goto 后立即 stub（零声+计数）
        await pg.wait_for_timeout(1800)
        r9 = await pg.evaluate("""(() => {
          const cards = [...document.querySelectorAll('.card')].map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); });
          const btns = [...document.querySelectorAll('button')].filter(x => !x.className.includes('k-parentbtn')).map(x => { const b = x.getBoundingClientRect(); return Math.min(b.width, b.height); }).filter(v => v > 0);
          return { minCard: Math.min(...cards), minBtn: Math.min(...btns), ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        vp2 = await b.new_context(viewport={'width': 800, 'height': 1180})
        await vp2.add_init_script(INIT_SND)
        pg2 = await vp2.new_page()
        await pg2.goto(URL)
        await pg2.evaluate(STUB_SND)   # 声音纪律②：竖屏页同样立即 stub
        await pg2.wait_for_timeout(1800)
        r9b = await pg2.evaluate("""(() => {
          const cards = [...document.querySelectorAll('.card')].map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); });
          return { minCard: Math.min(...cards), ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        html = (BASE / 'idiom' / 'index.html').read_text(encoding='utf-8')
        nclip = html.count('data:audio')
        offline = ('src="http' not in html) and ("href='http" not in html) and ('href="http' not in html) and ('url(http' not in html)
        rec('I9 双viewport+触摸+离线+clip90', r9['minCard'] >= 96 and r9['minBtn'] >= 64 and r9['ox'] == 0 and
            r9b['minCard'] >= 84 and r9b['ox'] == 0 and offline and nclip == 90 and not errs,
            'desk card=%s btn=%s ox=%s | 竖 card=%s ox=%s offline=%s clip=%s' %
            (r9['minCard'], r9['minBtn'], r9['ox'], r9b['minCard'], r9b['ox'], offline, nclip))
        await ctx.close()
        await vp2.close()

        # I10 flat16 ch3 + flat40 生成关真实通关（firstDay=昨天+bonus30 → lim=42）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.evaluate(STUB_SND)   # 声音纪律②：goto 后立即 stub（零声+计数）
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(16, bonus=30))
        await pg.reload()
        await pg.wait_for_timeout(2600)
        d16 = await pg.evaluate('IDM.currentLevel.dch')
        a16, _ = await play_level(pg)
        await pg.wait_for_timeout(4600)
        stars16 = await pg.evaluate("(KIDS._save().levels['3-0'] || {}).stars || 0")
        await pg.evaluate(gen_seed(40, 30))
        await pg.reload()
        await pg.wait_for_timeout(2600)
        lim = await pg.evaluate('KIDS.calendar.limit(Infinity)')
        f40 = await pg.evaluate('IDM.currentLevel.flat')
        a40, _ = await play_level(pg)
        await pg.wait_for_timeout(4600)
        stars40 = await pg.evaluate("(KIDS._save().levels['6-0'] || {}).stars || 0")
        rec('I10 flat16 ch3+flat40 生成关通关', d16 == 3 and a16 == 8 and stars16 == 3 and
            lim > 40 and f40 == 40 and a40 == 8 and stars40 == 3 and not errs,
            'ch3 d=%s stars=%s | gen lim=%s flat=%s stars=%s errs=%s' %
            (d16, stars16, lim, f40, stars40, errs[:1]))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
