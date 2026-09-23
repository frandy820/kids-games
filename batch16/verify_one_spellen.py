# -*- coding: utf-8 -*-
"""batch16 spellen 独立复验（r16 难度改造版；断言从 SPEC-BATCH16 §0/§2-r16 推导，禁从实现行为归纳）
S1 VERIFY | S2 钩子契约(三型字段) | S3 flat1 真实通关 3★ | S4 拼满判错1次+点格退回不计错
S5 §0.32/§2-r16 分源复算（60词章域+题型配比+missing域+b/d翻转对+池含词+干扰2-3+干扰组非词
   ——Python 独立词域）| S6 教学链 | S7 sayW 三态(flat<3每错必播/flat5首发+豁免)
S8 救援错放不重置 | S9 喇叭重听重置救援钟 | S10 双viewport+离线+clip(191,+sp_l_60 T46) | S11 flat16/24 通关(ch3/ch4)
S12 英文单词恒clip通道禁TTS | S13 旧档迁移IIFE(矛盾态重置/正常保留)
S14 Python 第三源复算 80 关 modeled（estMs/DECIDE/face 独立公式重算+dMin 与 verify 页内一致+数值域审计）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
# 声音纪律①（r16 收口）：底层通道接管（context 级 add_init_script，新文档/reload 自动生效；
# 对断言透明——idiom 静默副本 read 12/12 / spellen 13/14 实证同模式）
INIT_SND = '''(() => {
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
})();'''

URL = 'file:///' + (BASE / 'spellen' / 'index.html').as_posix()
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

# SPEC §2-r16 60 词定稿（章域）——测试侧真值源
WORDS = {1: ['cat', 'dog', 'sun', 'hat', 'map', 'bed', 'pig', 'bus',
             'cake', 'make', 'bike', 'kite', 'home', 'nose', 'rope'],
         2: ['lake', 'gate', 'name', 'game', 'five', 'nine', 'time', 'bone',
             'rose', 'cute', 'wave', 'ride', 'note', 'rice', 'safe'],
         3: ['fish', 'tree', 'star', 'frog', 'milk', 'grass', 'bread', 'black',
             'green', 'snake', 'brush', 'sleep', 'cloud', 'plant', 'small'],
         4: ['apple', 'tiger', 'water', 'happy', 'pencil', 'orange', 'yellow', 'rabbit',
             'flower', 'monkey', 'seven', 'paper', 'sister', 'robot', 'garden']}
ALL_WORDS = [w for ws in WORDS.values() for w in ws]
MEANS = {'cat': '小猫', 'dog': '小狗', 'sun': '太阳', 'hat': '帽子', 'map': '地图', 'bed': '床',
         'pig': '小猪', 'bus': '公共汽车', 'cake': '蛋糕', 'make': '制作', 'bike': '自行车',
         'kite': '风筝', 'home': '家', 'nose': '鼻子', 'rope': '绳子',
         'lake': '湖', 'gate': '大门', 'name': '名字', 'game': '游戏', 'five': '五', 'nine': '九',
         'time': '时间', 'bone': '骨头', 'rose': '玫瑰', 'cute': '可爱', 'wave': '波浪',
         'ride': '骑', 'note': '笔记', 'rice': '米饭', 'safe': '安全',
         'fish': '鱼', 'tree': '树', 'star': '星星', 'frog': '青蛙', 'milk': '牛奶', 'grass': '草',
         'bread': '面包', 'black': '黑色', 'green': '绿色', 'snake': '蛇', 'brush': '刷子',
         'sleep': '睡觉', 'cloud': '云', 'plant': '植物', 'small': '小的',
         'apple': '苹果', 'tiger': '老虎', 'water': '水', 'happy': '开心的', 'pencil': '铅笔',
         'orange': '橙子', 'yellow': '黄色', 'rabbit': '兔子', 'flower': '花', 'monkey': '猴子',
         'seven': '七', 'paper': '纸', 'sister': '姐妹', 'robot': '机器人', 'garden': '花园'}
# r16 题型配比真值（后 7 题；q0 恒 listen）
TYPE_MIX = {1: (4, 2, 1), 2: (3, 2, 2), 3: (2, 2, 3), 4: (1, 2, 4)}   # (listen, missing, meaning)
# 独立词域（干扰组判定）：2 字母常见全集 + 3 字母高频（比 agent 域略广=更强独立复算）
DICT23 = set(['at', 'on', 'in', 'is', 'it', 'an', 'as', 'be', 'by', 'do', 'go', 'he', 'me', 'my',
              'no', 'so', 'to', 'up', 'us', 'we', 'if', 'or', 'am', 'ok', 'ah', 'oh',
              'bad', 'dab', 'bed', 'bee', 'bag', 'big', 'bus', 'car', 'cup', 'egg', 'fan', 'fat',
              'get', 'hot', 'jam', 'jet', 'key', 'leg', 'lip', 'map', 'mud', 'nap', 'pen', 'pin',
              'pot', 'rat', 'red', 'rid', 'rob', 'sad', 'set', 'sit', 'tap', 'ten', 'tip', 'top',
              'toy', 'van', 'wet', 'win', 'yes', 'zoo'])
DICT23 -= set(ALL_WORDS)  # 目标词本身出现不算干扰构成
# b16 审查 S4：mdiff 返回 sorted 串——词域须归一为 anagram 签名（sorted）再比对，原序词比较恒不等
DICT23_SIG = set(''.join(sorted(w)) for w in DICT23)

# ---- S14 Python 第三源时长模型常量（独立公式，禁引页面源码） ----
def est_ms(s):
    return len(s) * 345 + 600
V_DECIDE = {'listen': 2600, 'missing': 5500, 'meaning': 3600}
V_STEP, V_ENTER, V_STAGE, V_WORD, V_MIN = 600, 400, 400, 1200, 40000
V_QUIZ = est_ms('拼对啦，你真棒')            # 7 字符 → 3015
FACE = {'listen': '再听一听这个单词', 'missing': '看一看，少了哪个字母', 'meaning': '看一看中文，拼一拼单词'}

def quiz_ms_py(q):
    face = V_ENTER + est_ms(FACE[q['type']]) + 300
    if q['type'] == 'listen':
        face += V_WORD
    elif q['type'] == 'meaning':
        face += est_ms(MEANS[q['word']])
    steps = len(q['blanks']) if q['type'] == 'missing' else len(q['word'])
    return face + steps * (max(V_STAGE, V_DECIDE[q['type']]) + V_STEP) + V_QUIZ

def mcount(s):
    d = {}
    for c in s:
        d[c] = d.get(c, 0) + 1
    return d

def msub(small, big):
    """small 多重集 ⊆ big 多重集"""
    b = mcount(big)
    for c, n in mcount(small).items():
        if b.get(c, 0) < n:
            return False
    return True

def mdiff(big, small):
    """big - small 多重集差（剩余字符连串）"""
    b = mcount(big)
    for c, n in mcount(small).items():
        b[c] = b.get(c, 0) - n
    return ''.join(sorted(c * n for c, n in b.items() if n > 0))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
  const _s = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 16)); return _s(t); };
  window.__speakLog = [];
  if (window.speechSynthesis) { const _sp = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = u => { window.__speakLog.push(String(u && u.text || '').slice(0, 16)); return _sp(u); }; }
  return true;
})()"""

def seed(n, stars=1):
    return """const sv = KIDS._save() || { levels: {} };
  sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/8)+1)+'-'+(i%%8)] = { stars: %d };
  sv.spellen = { tutSeen: true };
  %s
  KIDS.store.persist();""" % (n, stars, 'KIDS.calendar.bonusSet(30);' if n >= 16 else '')
    # n>=16 时抬日限：新 context firstDay=today→dayIndex=1→基础 6 关，bonus16 只到 lim=22
    # （seed(24) 落 flat21+dayEnd）；bonus30=BONUS_MAX → lim=36 覆盖 flat24

DUMP_JS = """(() => {
  const out = [], dur = [];
  for (let flat = 0; flat < 80; flat++) {
    const L = genLevel(flat);
    out.push(L.quizzes.map(q => ({ dch: L.dch, type: q.type, word: q.word,
      blanks: q.blanks ? q.blanks.slice() : null, opts: q.opts ? q.opts.slice() : null,
      tiles: q.tiles ? q.tiles.slice() : null })));
    dur.push(modeled(flat));
  }
  return { out, dur };
})()"""

async def click_el(pg, sel, ry=0.55):
    pos = await pg.evaluate("""(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height * %s}; })('%s')""" % (ry, sel))
    if pos is None:
        return False
    await pg.mouse.click(pos['x'], pos['y'])
    await pg.wait_for_timeout(220)
    return True

async def click_letter(pg, ch):
    """点指定字母的第一块自由瓦片/选项卡（三型通用：missing 选项不消失）"""
    pos = await pg.evaluate("""(L) => {
        const els = [...document.querySelectorAll('#tile-pool .tile')].filter(
            e => e.dataset.l === L && !e.classList.contains('gone'));
        if (!els.length) return null;
        const r = els[0].getBoundingClientRect();
        return {x: r.left + r.width / 2, y: r.top + r.height * 0.6};
    }""", ch)
    if pos is None:
        return False
    await pg.mouse.click(pos['x'], pos['y'])
    await pg.wait_for_timeout(160)
    return True

async def free_tile(pg, ch, used):
    tiles = (await pg.evaluate('SP.quiz'))['tiles']
    for i, t in enumerate(tiles):
        if i not in used and t == ch:
            return i
    return None

async def nbuilt(pg):
    q = await pg.evaluate('SP.quiz')
    if not q:
        return -1
    if 'built' not in q:          # 换题后新题=missing 型（无 built）= 拼满推进成功
        return 999
    return sum(1 for x in q['built'] if x is not None)


async def get_built(pg):
    """当前题已拼格（仅瓦片型有 built；missing/换题/SP.quiz=None 返回 None）"""
    q = await pg.evaluate('SP.quiz')
    if not q or 'built' not in q:
        return None
    return q['built']

async def solve_word(pg):
    """真实点击解当前词（三型分派）：missing=按缺位序点正确选项；瓦片型=按词点自由瓦片"""
    q = await pg.evaluate('SP.quiz')
    if not q:
        return None
    if q['type'] == 'missing':
        w, step0 = q['word'], q['step']
        for _ in range(14):
            qq = await pg.evaluate('SP.quiz')
            if qq is None or qq['step'] != step0 or qq['word'] != w:
                return qq
            nf = len(qq['filled'])
            if nf >= len(q['blanks']):
                await pg.wait_for_timeout(400)      # 演出窗（locked）
                continue
            if not await click_letter(pg, w[q['blanks'][nf]]):
                await pg.wait_for_timeout(400)
        return await pg.evaluate('SP.quiz')
    used = set()
    for ch in q['word']:
        i = await free_tile(pg, ch, used)
        if i is None:
            return False
        used.add(i)
        b0 = await nbuilt(pg)
        for attempt in range(3):                     # 吞输入重试（真实玩家=再点一次）
            ok = await click_el(pg, '#tile-pool .tile[data-i="%d"]' % i)
            if not ok:
                return False
            for _ in range(6):
                if await nbuilt(pg) > b0:
                    break
                await pg.wait_for_timeout(150)
            if await nbuilt(pg) > b0:
                break
            await pg.wait_for_timeout(400)
        if await nbuilt(pg) <= b0:
            return False
    return True

async def wait_ready(pg, timeout=14000):
    for _ in range(int(timeout / 300)):
        st = await pg.evaluate('SP.currentLevel ? {l: SP.currentLevel.locked, w: SP.currentLevel.won} : null')
        if st is None or (not st['l'] or st['w']):
            return
        await pg.wait_for_timeout(300)

async def wait_stars(pg, key, timeout=16000):
    """写档在 celebrate then 里落（实测 won+4s）——轮询而非固定 3.6s；r16 复跑实证高负载下偶发
    拖过 10s 轮询窗（S11 stars=0 假阴性一次）→ 16000 防复发"""
    for _ in range(int(timeout / 300)):
        v = await pg.evaluate("(KIDS._save().levels['%s'] || {}).stars || 0" % key)
        if v:
            return v
        await pg.wait_for_timeout(300)
    return 0

async def wait_advance(pg, step0, timeout=8000):
    """拼对后 locked 置位有延迟：先等题推进（step 变/won），再等演出窗收尾"""
    for _ in range(int(timeout / 300)):
        q = await pg.evaluate('SP.quiz')
        st = await pg.evaluate('SP.currentLevel')
        if q is None or q['step'] != step0 or st['won']:
            for _2 in range(int(12000 / 300)):
                st2 = await pg.evaluate('SP.currentLevel')
                if st2 is None or (not st2['locked'] or st2['won']):
                    return
                await pg.wait_for_timeout(300)
            return
        await pg.wait_for_timeout(300)

async def solve_level(pg):
    """通关当前关：逐词真实点击+等推进（三型分派）"""
    for _ in range(20):
        q = await pg.evaluate('SP.quiz')
        if not q:
            return True
        s0 = q['step']
        if not await solve_word(pg):
            continue
        await wait_advance(pg, s0)
    return False

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])

        # S1 VERIFY + S5 分源复算 + S14 Python 第三源 modeled
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '?verify=1')
        title = ''
        for _ in range(90):
            title = await pg.title()
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        rec('S1 VERIFY title', 'VERIFY PASS' in title and not errs, 'title=%s errs=%s' % (title, errs[:1]))
        dump = await pg.evaluate(DUMP_JS)
        data, dur = dump['out'], dump['dur']
        bad, seen = [], {}
        BD_MISS = []
        nq = 0
        mix_bad = []
        for flat, qs in enumerate(data):
            dch = qs[0]['dch']
            cnt = {'listen': 0, 'missing': 0, 'meaning': 0}
            words_lvl = set()
            for q in qs:
                nq += 1
                w, tp = q['word'], q['type']
                cnt[tp] += 1
                words_lvl.add(w)
                if w not in seen:
                    seen[w] = dch
                if tp == 'missing':
                    # missing 域：缺位数/升序互异/非首位(dch<=2)/选项数/互异/含正确/b/d 翻转对
                    nB = 1 if dch <= 2 else 2
                    ok_b = len(q['blanks']) == nB and all(
                        0 <= j < len(w) for j in q['blanks']) and all(
                        q['blanks'][k] > q['blanks'][k - 1] for k in range(1, nB))
                    if dch <= 2 and q['blanks'][0] == 0:
                        ok_b = False
                    uniq = []
                    for j in q['blanks']:
                        if w[j] not in uniq:
                            uniq.append(w[j])
                    n_opts = 3 if dch <= 2 else 4
                    ok_o = len(q['opts']) == n_opts and len(set(q['opts'])) == n_opts and \
                        all(c in q['opts'] for c in uniq) and \
                        all(c not in w for c in q['opts'] if c not in uniq)
                    must = None
                    if 'b' in uniq and 'd' not in uniq:
                        must = 'd'
                    elif 'd' in uniq and 'b' not in uniq:
                        must = 'b'
                    ok_bd = (must is None) or (must in w) or (must in q['opts'])
                    if not (ok_b and ok_o and ok_bd):
                        bad.append({'flat': flat, 'w': w, 'blanks': q['blanks'], 'opts': q['opts'],
                                    'b': ok_b, 'o': ok_o, 'bd': ok_bd})
                else:
                    tiles = q['tiles']
                    pool_ok = msub(w, tiles)                        # 池含目标词全部字母
                    extra = len(tiles) - len(w)
                    extra_ok = (2 if dch <= 2 else 3) == extra     # 干扰数定版
                    rest = mdiff(''.join(tiles), w)                # 干扰字母组
                    word_ok = rest not in DICT23_SIG               # 干扰组不构成完整英文词
                    cnt_w = mcount(w)
                    bd = 'd' if 'b' in cnt_w and 'd' not in cnt_w else ('b' if 'd' in cnt_w and 'b' not in cnt_w else None)
                    # b/d 同形翻转对：在场硬断言（缺席正当剔除=word+bd 拼成另一完整词的判定
                    # 需全域词表 anagram，由页内 verify refRangeOk 硬断言——S1 全绿即覆盖；
                    # 此处软统计防退化为从不加对）
                    if bd and bd not in rest:
                        BD_MISS.append((flat, w, bd))
                    if not (pool_ok and extra_ok and word_ok):
                        bad.append({'flat': flat, 'w': w, 'tiles': tiles, 'rest': rest,
                                    'pool': pool_ok, 'extra': extra, 'isword': word_ok, 'bd': bd_ok})
            want = TYPE_MIX[dch]
            if qs[0]['type'] != 'listen' or cnt != {'listen': want[0] + 1, 'missing': want[1], 'meaning': want[2]}:
                mix_bad.append({'flat': flat, 'dch': dch, 'cnt': cnt, 'q0': qs[0]['type']})
            if len(words_lvl) != 8:
                bad.append({'flat': flat, 'dupWords': [w for w in words_lvl]})
        # 60 词对账：游戏侧出现过的词→章归属与 SPEC 一致
        dom_ok = all(WORDS.get(int(ch)) and w in WORDS[int(ch)] for w, ch in
                     [(w, seen[w]) for w in seen])
        cover = len(seen)
        # 60 词域 b/d 对唯一正当剔除陷阱（SPEC §2-r16 定稿）：ride+b=bride（word+bd 拼成
        # 另一完整英文词→池唯一性硬约束优先于 b/d 对；其余词+翻转对均无此碰撞——
        # 独立英文词知识构造，非行为归纳；页内 verify refRangeOk 同口径硬断言）
        rec('S5 分源复算(60词章域+题型配比+missing域+b/d对+池含词+干扰定版+干扰组非词)',
            nq == 640 and not bad and not mix_bad and dom_ok and cover == 60 and
            all((w, bd) == ('ride', 'b') for _, w, bd in BD_MISS),
            'n=%d cover=%d bad=%s mix=%s bdMiss=%s' % (nq, cover, bad[:2], mix_bad[:1],
                ('%d(ride+b=bride 正当剔除)' % len(BD_MISS)) if BD_MISS else '0'))
        # S14 Python 第三源 80 关 modeled 复算 + 数值域审计
        py_dur = [sum(quiz_ms_py(q) for q in qs) for qs in data]
        parity = py_dur == dur                                   # 逐关对账（页面 modeled vs Python 公式）
        d_min, d_flat = min(py_dur), py_dur.index(min(py_dur))
        domain_ok = all(V_MIN <= d <= 400000 for d in py_dur) and \
            all(3 <= len(q['word']) <= 6 for qs in data for q in qs) and \
            all(1 <= len(q['blanks']) <= 2 for qs in data for q in qs if q['type'] == 'missing')
        vunit = await pg.evaluate("JSON.parse(document.getElementById('verify-result').textContent).units.duration")
        rec('S14 Python第三源80关modeled(公式对账+最低值一致+域审计)',
            parity and domain_ok and vunit['minMs'] == d_min and d_min >= V_MIN,
            'parity=%s min=%d@flat%d verifyMin=%s' % (parity, d_min, d_flat, vunit['minMs']))
        await ctx.close()

        # S2 钩子 | S3 flat1 真实通关
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        q = await pg.evaluate('SP.quiz')
        hook_ok = bool(q) and q['type'] == 'listen' and all(k in q for k in ('word', 'tiles', 'built', 'step', 'miss')) and \
            q['word'] in ALL_WORDS and len(q['tiles']) in (len(q['word']) + 2, len(q['word']) + 3)
        rec('S2 钩子契约(q0=listen+word/tiles/built/step/miss)', bool(hook_ok),
            'type=%s word=%s tiles=%s' % (q and q.get('type'), q and q['word'], q and ''.join(q['tiles'])))
        n_words = 0
        for _ in range(12):
            if not await pg.evaluate('SP.quiz'):
                break
            if await solve_word(pg):
                n_words += 1
            s0 = (await pg.evaluate('SP.quiz') or {}).get('step', -1)
            await wait_advance(pg, s0)
        stars = await wait_stars(pg, '1-1')
        rec('S3 flat1 真实点击通关3★(8题)', stars == 3 and not errs, 'words=%d stars=%s errs=%s' % (n_words, stars, errs[:1]))
        await ctx.close()

        # S4 拼两格→点格退回(built null+miss 0)；拼满错→miss 1→通关 2★
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        # 4a 退回不计错
        q = await pg.evaluate('SP.quiz')
        used = set()
        for ch in q['word'][:2]:
            i = await free_tile(pg, ch, used)
            await click_el(pg, '#tile-pool .tile[data-i="%d"]' % i)
            used.add(i)
        await pg.wait_for_timeout(300)
        await click_el(pg, '#slots .cell[data-j="1"]', ry=0.5)
        await pg.wait_for_timeout(300)
        st4 = await pg.evaluate('SP.quiz')
        back_ok = st4['built'][1] is None and st4['miss'] == 0
        # 4b 拼满错（末格放干扰字母）
        q = await pg.evaluate('SP.quiz')
        used = set()
        for ch in q['word'][:-1]:
            i = await free_tile(pg, ch, used)
            await click_el(pg, '#tile-pool .tile[data-i="%d"]' % i)
            used.add(i)
            await pg.wait_for_timeout(120)
        # 找一个非目标字母瓦片填末格（若池中全目标字母则点重复的目标字母到错位——tiles 必含干扰 2-3）
        rest = mdiff(''.join(q['tiles']), q['word'])
        fill = None
        tiles = q['tiles']
        for i, t in enumerate(tiles):
            if i not in used and (t in rest or t != q['word'][-1]):
                fill = i
                if t != q['word'][-1] or q['word'].count(t) > q['word'][:len(q['word']) - 1].count(t) + 1:
                    break
        if fill is None:
            fill = next(i for i in range(len(tiles)) if i not in used)
        await click_el(pg, '#tile-pool .tile[data-i="%d"]' % fill)
        await pg.wait_for_timeout(900)
        m4 = (await pg.evaluate('SP.quiz'))['miss']
        await wait_ready(pg)
        # 拼满错的字母留格：通关前先点格全部退回（探索零惩罚；换题/missing 型无退回需求）
        for _ in range(10):
            bl = await get_built(pg)
            if bl is None:
                break
            js = [j for j, x in enumerate(bl) if x is not None]
            if not js:
                break
            await click_el(pg, '#slots .cell[data-j="%d"]' % max(js), ry=0.5)
            await pg.wait_for_timeout(200)
        for _ in range(12):
            if not await pg.evaluate('SP.quiz'):
                break
            s0 = (await pg.evaluate('SP.quiz'))['step']
            await solve_word(pg)
            await wait_advance(pg, s0)
        stars4 = await wait_stars(pg, '1-1')
        rec('S4 退回不计错+拼满判错1次=2★', back_ok and m4 == 1 and stars4 == 2 and not errs,
            'back=%s m=%s stars=%s errs=%s' % (back_ok, m4, stars4, errs[:1]))
        await ctx.close()

        # S6 教学链
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1500)
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(1000)
        sw, demo_r, sw_done = False, None, False
        for _ in range(80):
            t = await pg.evaluate('SP.tutorial')
            if t == 'watch' and not sw_done:
                st0 = await pg.evaluate('SP.quiz ? SP.quiz.step : -1')
                for _ in range(3):
                    await pg.evaluate('SP.tapTile(0)')
                st1 = await pg.evaluate('SP.quiz ? SP.quiz.step : -1')
                sw = st1 == st0
                sw_done = True
            demo_r = await pg.evaluate('window.__spDemoR || null')
            if demo_r or t == 'help':
                break
            await pg.wait_for_timeout(400)
        if demo_r is None:
            demo_r = await pg.evaluate('window.__spDemoR || null')
        rec('S6 教学 watch 吞输入+demoR', sw and demo_r == 'right' and not errs,
            'swallow=%s demoR=%s errs=%s' % (sw, demo_r, errs[:1]))
        await ctx.close()

        # S7 sayW 三态：flat1 三错播 3（flat<3 每错必播）/ flat5 三错播 2（首发+豁免+第三错静默）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(HOOK)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await pg.evaluate(HOOK)

        async def fill_wrong_full(pg):
            q = await pg.evaluate('SP.quiz')
            used = set()
            for ch in q['word'][:-1]:
                i = await free_tile(pg, ch, used)
                await click_el(pg, '#tile-pool .tile[data-i="%d"]' % i)
                used.add(i)
                await pg.wait_for_timeout(100)
            fill = next((i for i, t in enumerate(q['tiles']) if i not in used and t != q['word'][-1]), None)
            if fill is None:
                fill = next(i for i in range(len(q['tiles'])) if i not in used)
            await click_el(pg, '#tile-pool .tile[data-i="%d"]' % fill)
            await wait_ready(pg)
        for _ in range(3):
            await fill_wrong_full(pg)
            # 拼满错后字母留格：退回全部再重拼错（3 次判错）
            for _ in range(20):
                bl = (await pg.evaluate('SP.quiz'))['built']
                js = [j for j, x in enumerate(bl) if x is not None]
                if not js:
                    break
                await click_el(pg, '#slots .cell[data-j="%d"]' % max(js), ry=0.5)
                await pg.wait_for_timeout(150)
        w1 = await pg.evaluate("window.__vlog.filter(x => x === 'P:sp_wrong').length")
        m1 = (await pg.evaluate('SP.quiz'))['miss']
        await pg.evaluate(seed(5))
        await pg.reload()
        await pg.wait_for_timeout(3200)
        await pg.evaluate(HOOK)
        for _ in range(3):
            await fill_wrong_full(pg)
            for _ in range(20):
                bl = (await pg.evaluate('SP.quiz'))['built']
                js = [j for j, x in enumerate(bl) if x is not None]
                if not js:
                    break
                await click_el(pg, '#slots .cell[data-j="%d"]' % max(js), ry=0.5)
                await pg.wait_for_timeout(150)
        w2 = await pg.evaluate("window.__vlog.filter(x => x === 'P:sp_wrong').length")
        rec('S7 sayW 三态(flat1三错播3/flat5首发+豁免2)', w1 == 3 and w2 == 2 and m1 == 3,
            'w1=%s w2=%s m=%s' % (w1, w2, m1))
        await ctx.close()

        # S8 救援错放不重置 | S9 喇叭重听重置
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await fill_wrong_full(pg)
        for _ in range(20):
            bl = (await pg.evaluate('SP.quiz'))['built']
            js = [j for j, x in enumerate(bl) if x is not None]
            if not js:
                break
            await click_el(pg, '#slots .cell[data-j="%d"]' % max(js), ry=0.5)
            await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(8500)
        r0 = await pg.evaluate('SP.rescues')
        await pg.wait_for_timeout(6500)
        r1 = await pg.evaluate('SP.rescues')
        # S9 喇叭重置：换关空 6s → hear → 13s 窗增量 0（未重置则 t=14s 已触发）
        await pg.evaluate('SP.start(2)')
        await pg.wait_for_timeout(6000)
        rb = await pg.evaluate('SP.rescues')
        await pg.evaluate('SP.hear()')
        await pg.wait_for_timeout(13000)
        r2 = await pg.evaluate('SP.rescues')
        # r16 断口复跑实证：钟起点=reload 启动（错放不重置=设计），reload+点击链+8.5s≈13.9s 恰跨 14s
        # 阈值两侧漂移——r0==0 为脆弱锚（放等待侧不放松语义：若错放重置钟则 r1 距错放 6.5s<14s 必=0 被 r1>=1 抓）
        rec('S8 救援错放不重置+14s触发', r0 <= 1 and r1 >= max(1, r0) and not errs, 'r=%s→%s errs=%s' % (r0, r1, errs[:1]))
        rec('S9 喇叭重听重置救援钟', r2 == rb, 'r=%s→%s' % (rb, r2))
        await ctx.close()

        # S10 双viewport+离线+clip | S12 英文单词恒 clip 通道
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1800)
        r10 = await pg.evaluate("""(() => {
          const tiles = [...document.querySelectorAll('#tile-pool .tile')].map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); });
          const btns = [...document.querySelectorAll('button')].filter(x => !x.className.includes('k-parentbtn')).map(x => { const b = x.getBoundingClientRect(); return Math.min(b.width, b.height); }).filter(v => v > 0);
          return { minTile: Math.min(...tiles), minBtn: Math.min(...btns), ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        vp2 = await b.new_context(viewport={'width': 800, 'height': 1180})
        pg2 = await vp2.new_page()
        await pg2.goto(URL)
        await pg2.wait_for_timeout(1800)
        r10b = await pg2.evaluate("""(() => {
          const tiles = [...document.querySelectorAll('#tile-pool .tile')].map(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height); });
          return { minTile: Math.min(...tiles), ox: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        })()""")
        html = (BASE / 'spellen' / 'index.html').read_text(encoding='utf-8')
        nclip = html.count('data:audio')
        offline = ('src="http' not in html) and ('href="http' not in html) and ('url(http' not in html)
        rec('S10 双viewport+触摸+离线+clip191', r10['minTile'] >= 64 and r10['minBtn'] >= 64 and r10['ox'] == 0 and
            r10b['minTile'] >= 64 and r10b['ox'] == 0 and offline and nclip == 191 and not errs,
            'desk tile=%s btn=%s ox=%s | pad tile=%s ox=%s offline=%s clip=%s' % (r10['minTile'], r10['minBtn'], r10['ox'], r10b['minTile'], r10b['ox'], offline, nclip))
        # S12：hear() 走 P:sp_word_* 通道；TTS 文本中禁出现目标词（中文 TTS 读英文=事故）
        await pg.evaluate(HOOK)
        w = (await pg.evaluate('SP.quiz'))['word']
        await pg.evaluate('SP.hear()')
        await pg.wait_for_timeout(600)
        v12 = await pg.evaluate('window.__vlog')
        sp12 = await pg.evaluate('window.__speakLog')
        ok12 = ('P:sp_word_' + w) in v12 and w not in [x[2:] for x in v12 if x.startswith('T:')] and \
            all(w not in s for s in sp12)
        rec('S12 英文单词恒clip通道(禁TTS读英文词)', ok12, 'word=%s vlog=%s speak=%s' % (w, v12[:5], sp12[:3]))
        await ctx.close()
        await vp2.close()

        # S11 flat16 ch3 + flat24 ch4 真实通关（r16 章界：CH_LEN=8）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed(16))
        await pg.reload()
        await pg.wait_for_timeout(2600)
        d16 = await pg.evaluate('SP.currentLevel.dch')
        await solve_level(pg)
        stars16 = await wait_stars(pg, '3-0')
        await pg.evaluate(seed(24))
        await pg.reload()
        await pg.wait_for_timeout(2600)
        d24 = await pg.evaluate('SP.currentLevel.dch')
        await solve_level(pg)
        stars24 = await wait_stars(pg, '4-0')
        rec('S11 flat16 ch3+flat24 ch4 通关(8题/关)', d16 == 3 and stars16 == 3 and d24 == 4 and stars24 == 3 and not errs,
            'ch3 d=%s stars=%s | ch4 d=%s stars=%s errs=%s' % (d16, stars16, d24, stars24, errs[:1]))
        await ctx.close()

        # S13 旧档迁移 IIFE：矛盾态（有 '2-0' 缺 '1-5'）→ 整档重置教学重现；正常第 1 章档 → 不误删
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        import json as _json
        legacy = {'v': '1.0', 'game': 'spellen', 'firstDay': '2026-09-01', 'lastDay': '2026-09-08',
                  'levels': {'1-0': {'stars': 3, 'plays': 2}, '2-0': {'stars': 2, 'plays': 1}},
                  'dailyMin': {}, 'bonus': {}, 'settings': {'sound': True, 'tts': True, 'vol': 0.6},
                  'restTip': {'day': '', 'shown': 0}, 'spellen': {'tutSeen': True}}
        await pg.evaluate('localStorage.setItem("kidsgame_spellen", %s)' % _json.dumps(_json.dumps(legacy)))
        await pg.reload()
        await pg.wait_for_timeout(1800)
        st13 = await pg.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_spellen') || '{}');
            return { has20: !!(s.levels || {})['2-0'], tut: SP.tutorial }; }""")
        ok13a = not st13['has20'] and st13['tut'] == 'watch'
        normal = {'v': '1.0', 'game': 'spellen', 'firstDay': '2026-09-01', 'lastDay': '2026-09-08',
                  'levels': {('1-%d' % i): {'stars': 3, 'plays': 1} for i in range(8)},
                  'dailyMin': {}, 'bonus': {}, 'settings': {'sound': True, 'tts': True, 'vol': 0.6},
                  'restTip': {'day': '', 'shown': 0}, 'spellen': {'tutSeen': True}}
        await pg.evaluate('localStorage.setItem("kidsgame_spellen", %s)' % _json.dumps(_json.dumps(normal)))
        await pg.reload()
        await pg.wait_for_timeout(1800)
        st13b = await pg.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_spellen') || '{}');
            return { has13: !!(s.levels || {})['1-3'], tut: SP.tutorial }; }""")
        ok13b = st13b['has13'] and st13b['tut'] != 'watch'
        rec('S13 旧档迁移IIFE(矛盾态重置+正常保留)', ok13a and ok13b and not errs,
            'legacy: %s | normal: %s' % (st13, st13b))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
