# -*- coding: utf-8 -*-
"""batch29 独立复验：bodyen / poem / wordpuz（断言从 SPEC-BATCH29 推导，期望值独立硬编码）
用法: python verify_batch29.py <bodyen|poem|wordpuz>
口径：verify 页 (?verify=1) 引擎同作用域；tapX 均 async（await 包装/fire-and-forget 防重入）；
     三款无变换演出锁窗（图卡/行卡/字母卡直出），词完成拼播窗 T7/T8 用 2200；
     wordpuz 逐卡驱动间 500（字母飞入动画）；
     真实路径推进由 verify_final29.py R8 承担，本脚本不重复。
字段口径（探针实证 2026-09-10；poem r42 增补 SPEC-R42-POEM）：
  bodyen quiz={kind('hear'|'see'|'do'),ask(部位id|动词),opts[{part}|{text}|{part,verb}],answer,step,miss,
              verb(do 子型动词)}；hear=图卡 part/see=词卡 text/do=touch 部位卡 part+action 动作卡 verb
        r41 口径（SPEC-R41 §R2）：词封闭 24（头→脚序）/NEAR 族偏好序表（ch2+ 首族干扰在场；
        face/mouth/shoulder/belly 无族=ch3+ 真值禁入）/dch4 do 槽 qi1/qi3 恒 2（touch 真值∈NEAR20+
        族干扰/动作四卡恰全集 clap·shake·stomp·wave）
  poem   quiz={kind('next'|'hear'|'fill'|'order'),poem,prevLine,audioLine,line,hole,prog,
              opts[{line,idx}|{ch}],answer(order=当前步动态),step,miss}；currentLevel 带 poem 字段
        r42 四族：ch1 next(2 卡)/ch2 next+fill(4 卡)/ch3 order+hear/ch4 四族全出；flat%12=诗 idx
  wordpuz quiz={word,zh,pool[{ch,used}],slots,answer(下一所需字母),step,miss}；tapLtr 返回 moved/right/done/wrong/false/null"""
import asyncio, io, os, re, sys, json
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'bodyen': 'BE', 'poem': 'PM', 'wordpuz': 'WP'}[GAME]
TAP = {'bodyen': 'tapOpt', 'poem': 'tapOpt', 'wordpuz': 'tapLtr'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码表（禁 import 实现） ----
# r41 口径（SPEC-R41-BODYEN §R2）：词封闭 24 头→脚序 + NEAR 偏好序族表 + 动词域（原 8 词/3 对近形退役）
BE_WORDS = ['head', 'face', 'hair', 'eyebrow', 'eye', 'ear', 'nose', 'mouth',
            'tooth', 'tongue', 'chin', 'cheek', 'neck', 'shoulder', 'arm', 'elbow',
            'hand', 'finger', 'thumb', 'leg', 'knee', 'foot', 'toe', 'belly']      # §R2 词封闭 24
BE_NEAR = {                                                                        # 偏好序族表（NEAR[w][0]=首族=ch2+ 必在场干扰）
    'head': ['hand', 'hair'], 'face': [], 'hair': ['head', 'hand'],
    'eyebrow': ['eye', 'ear'], 'eye': ['ear', 'eyebrow'], 'ear': ['eye', 'eyebrow'],
    'nose': ['toe', 'neck'], 'mouth': [], 'tooth': ['tongue', 'toe', 'foot'],
    'tongue': ['tooth', 'toe'], 'chin': ['cheek', 'tooth'], 'cheek': ['chin', 'tongue'],
    'neck': ['knee', 'nose'], 'shoulder': [], 'arm': ['leg', 'elbow'],
    'elbow': ['arm', 'leg'], 'hand': ['head', 'hair', 'finger'],
    'finger': ['thumb', 'hand'], 'thumb': ['finger', 'hand'],
    'leg': ['arm', 'knee'], 'knee': ['neck', 'leg', 'toe'],
    'foot': ['toe', 'tooth'], 'toe': ['foot', 'nose', 'knee'], 'belly': [],
}                                                                                  # 无族 4 词（face/mouth/shoulder/belly）ch3+ 真值禁入
BE_NEAR20 = [w for w in BE_WORDS if BE_NEAR[w]]                                    # 有族 20 词（派生）
BE_ACTS = ['clap', 'shake', 'stomp', 'wave']                                       # do-action 四动作恰全集
PIDS = ['yie', 'jys', 'cx', 'mn', 'dgjl', 'yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs']   # r42 flat%12=诗（前 5 锚序+新 7）
POEM_LINES = {
    'yie': ['鹅，鹅，鹅', '曲项向天歌', '白毛浮绿水', '红掌拨清波'],
    'jys': ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'],
    'cx': ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'],
    'mn': ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦'],
    'dgjl': ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼'],
    'yqesl': ['一去二三里', '烟村四五家', '亭台六七座', '八九十枝花'],
    'clg': ['敕勒川，阴山下', '天似穹庐，笼盖四野', '天苍苍，野茫茫', '风吹草低见牛羊'],
    'yhs': ['只有天在上', '更无山与齐', '举头红日近', '回首白云低'],
    'jsyz': ['江上往来人', '但爱鲈鱼美', '君看一叶舟', '出没风波里'],
    'dlyy': ['向晚意不适', '驱车登古原', '夕阳无限好', '只是近黄昏'],
    'lc': ['空山不见人', '但闻人语响', '返景入深林', '复照青苔上'],
    'xs': ['红豆生南国', '春来发几枝', '愿君多采撷', '此物最相思'],
}
# r42 §R4 挖空封闭表独立重列（12 诗×4 行：[h 汉位(跳标点 0 基), ch 真值, dis 3 干扰]）
POEM_FILLS = {
    'yie':   [[0, '鹅', ['鸡', '鸭', '雁']], [4, '歌', ['唱', '鸣', '叫']], [2, '浮', ['游', '漂', '沉']], [2, '拨', ['划', '推', '摇']]],
    'jys':   [[3, '月', ['日', '星', '灯']], [4, '霜', ['雪', '冰', '露']], [2, '望', ['看', '瞧', '观']], [2, '思', ['想', '念', '恋']]],
    'cx':    [[1, '眠', ['睡', '梦', '醒']], [2, '闻', ['听', '见', '有']], [4, '声', ['响', '音', '光']], [1, '落', ['开', '飘', '飞']]],
    'mn':    [[0, '锄', ['种', '耕', '割']], [1, '滴', ['流', '落', '洒']], [4, '餐', ['饭', '菜', '碗']], [4, '苦', ['甜', '酸', '辣']]],
    'dgjl':  [[4, '尽', ['落', '沉', '完']], [3, '海', ['湖', '江', '天']], [1, '穷', ['看', '望', '见']], [1, '上', ['下', '进', '回']]],
    'yqesl': [[1, '去', ['回', '来', '走']], [4, '家', ['户', '舍', '屋']], [2, '六', ['八', '九', '十']], [3, '枝', ['朵', '棵', '片']]],
    'clg':   [[2, '川', ['河', '原', '天']], [7, '野', ['山', '川', '地']], [3, '野', ['草', '原', '地']], [5, '牛', ['马', '驴', '犬']]],
    'yhs':   [[2, '天', ['日', '月', '山']], [4, '齐', ['平', '高', '远']], [0, '举', ['抬', '擎', '拿']], [4, '低', ['高', '远', '近']]],
    'jsyz':  [[2, '往', ['去', '过', '行']], [3, '鱼', ['虾', '蟹', '龟']], [3, '叶', ['艘', '只', '条']], [0, '出', ['入', '沉', '浮']]],
    'dlyy':  [[1, '晚', ['晨', '早', '夜']], [2, '登', ['上', '爬', '过']], [0, '夕', ['朝', '晨', '日']], [3, '黄', ['红', '金', '黑']]],
    'lc':    [[1, '山', ['林', '野', '谷']], [4, '响', ['声', '音', '歌']], [3, '深', ['密', '暗', '远']], [2, '青', ['绿', '蓝', '红']]],
    'xs':    [[0, '红', ['绿', '黄', '黑']], [2, '发', ['开', '长', '生']], [3, '采', ['摘', '拿', '收']], [4, '思', ['念', '想', '恋']]],
}
def _han_at(line, h):                              # 汉位（跳标点 0 基）独立实现
    k = -1
    for c in line:
        if c in '，。！？、':
            continue
        k += 1
        if k == h:
            return c
    return None
WP_WORDS = ['cat', 'dog', 'sun', 'hat', 'bed', 'pen', 'ten', 'map', 'cup', 'car',
            'bus', 'box', 'fox', 'egg', 'ant', 'eye', 'arm', 'leg', 'hand', 'star']  # §0.72 词封闭 20
WP_ABC = set(''.join(WP_WORDS))                                                    # 干扰字母合法域=词表字母并集
CLIPS = {'bodyen': {'wrong': 1656}, 'poem': {'wrong': 2232}, 'wordpuz': {'wrong': 2256}}  # SPEC §4 实长表
# 错链构成按 SPEC §1/§2/§3 明文句独立硬编码（句文本同表——断言链内句确在源码）：
#   T46 阶段2（2026-09-19）语义句 clip 化——链下界从 estMs 字数口径改按 clip 实长推导
#   （ffprobe=SPEC_DUR 口径实测：bod_again_hear 2352 / poe_g_next 3720 / wpu_g_wrong 2976）：
#   bodyen hear 链=wrong+again_hear clip+词音尾段 max 1656（r41 24 词域 bod_w_shoulder——修复轮 m-1，
#   旧 1536=8 词口径 6144 退役）；do 链=wrong+again_do estMs(8)（5466 est，短不约束——取 hear 上界 6264）
#   poem 链=wrong+两族引导句 clip 取长 poe_g_next 3720；hear 族 poe_g_hear 2112 短不约束
#   wordpuz 链=wrong+wpu_g_wrong clip
CHAIN = {
    'bodyen':  (1656 + 150 + 2352 + 150 + 1656 + 300, '再听一遍这个指令'),
    'poem':    (2232 + 150 + 3720 + 300, '再读读上一行，找找接下来那句'),
    'wordpuz': (2256 + 150 + 2976 + 300, '看看图画，想想怎么拼'),
}

async def wait_verify_title(pg):
    for _ in range(90):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t:
            return t
        await pg.wait_for_timeout(500)
    return ''

async def poll_step(pg, want, timeout=15000):
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate('%s.quiz.step' % HOOK)
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False

async def tap(pg, i):
    return await pg.evaluate('(async () => %s.%s(%d))()' % (HOOK, TAP, i))

# ---------- T3 每题审计（返回错误串或 None） ----------
async def q_bodyen(pg, flat, k, q, dch):
    kind = q['kind']
    if kind == 'do':                                # r41 do 题：touch=4 部位卡/action=四动作卡恰全集
        verb = q.get('verb')
        if verb == 'touch':
            vals = [o.get('part') for o in q['opts']]
            if any(v is None for v in vals):
                return 'f%dq%d touch opts 字段 %s' % (flat, k, q['opts'])
            if len(vals) != 4 or len(set(vals)) != 4 or q['ask'] not in vals:
                return 'f%dq%d touch 候选 %s' % (flat, k, vals)
            if any(v not in BE_WORDS for v in vals):
                return 'f%dq%d touch 出封闭表 %s' % (flat, k, vals)
            if q['ask'] not in BE_NEAR20:           # touch 真值∈NEAR20（§R2 族表）
                return 'f%dq%d touch 真值 %s 不在 NEAR20' % (flat, k, q['ask'])
            if BE_NEAR[q['ask']][0] not in vals:
                return 'f%dq%d touch 族干扰 %s 缺席 %s' % (flat, k, BE_NEAR[q['ask']][0], vals)
            if q['answer'] != vals.index(q['ask']):
                return 'f%dq%d answer=%d want=%d' % (flat, k, q['answer'], vals.index(q['ask']))
        else:                                       # action：ask==verb + 四动作恰全集
            vs = [o.get('verb') for o in q['opts']]
            if q['ask'] != verb:
                return 'f%dq%d act ask=%s verb=%s' % (flat, k, q['ask'], verb)
            if sorted(vs or []) != sorted(BE_ACTS):
                return 'f%dq%d act 候选 %s' % (flat, k, vs)
            if q['answer'] != vs.index(verb):
                return 'f%dq%d act answer=%d want=%d' % (flat, k, q['answer'], vs.index(verb))
        r = await tap(pg, q['answer'])
        return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    ask = q['ask']
    if ask not in BE_WORDS:
        return 'f%dq%d ask=%s 出封闭表' % (flat, k, ask)
    if kind == 'hear':
        vals = [o['part'] for o in q['opts']]
    elif kind == 'see':
        vals = [o['text'] for o in q['opts']]
    else:
        return 'f%dq%d kind=%s' % (flat, k, kind)
    if len(vals) != 4 or len(set(vals)) != 4 or ask not in vals:
        return 'f%dq%d %s 候选 %s' % (flat, k, kind, vals)
    want = vals.index(ask)
    if q['answer'] != want:
        return 'f%dq%d answer=%d want=%d' % (flat, k, q['answer'], want)
    if dch >= 2 and BE_NEAR[ask] and BE_NEAR[ask][0] not in vals:   # ch2+ 首族干扰必在场（§R2）
        return 'f%dq%d 族干扰 %s 缺席 %s' % (flat, k, BE_NEAR[ask][0], vals)
    if dch >= 3 and ask not in BE_NEAR20:           # ch3+ 真值∈NEAR20（§R2）
        return 'f%dq%d ch%d 真值 %s 不在 NEAR20' % (flat, k, dch, ask)
    r = await tap(pg, q['answer'])
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_poem(pg, flat, k, q, dch):
    pid = PIDS[flat % 12]                           # r42 flat%12=诗 idx
    lines = POEM_LINES[pid]
    if q['poem'] != pid:
        return 'f%dq%d poem=%s want=%s' % (flat, k, q['poem'], pid)
    if q['kind'] == 'fill':                         # r42 §R4：字卡 4 候选=真值+3 干扰
        f = POEM_FILLS[pid][q['line']]
        if q['hole'] != f[0] or _han_at(lines[q['line']], f[0]) != f[1]:
            return 'f%dq%d fill 真值/汉位互证失败' % (flat, k)
        chs = [o['ch'] for o in q['opts']]
        if len(chs) != 4 or len(set(chs)) != 4 or f[1] not in chs:
            return 'f%dq%d fill 候选 %s' % (flat, k, chs)
        for d in f[2]:
            if d not in chs:
                return 'f%dq%d fill 干扰 %s 缺席' % (flat, k, d)
            if d in lines[q['line']]:
                return 'f%dq%d fill 干扰 %s 是句内字' % (flat, k, d)
        if q['answer'] != chs.index(f[1]):
            return 'f%dq%d fill answer=%d want=%d' % (flat, k, q['answer'], chs.index(f[1]))
        r = await tap(pg, q['answer'])
        return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    if q['kind'] == 'order':                        # r42 §R3：乱序 4 句卡逐句即判（step×3+right/done）
        idxs = [o['idx'] for o in q['opts']]
        if sorted(idxs) != [0, 1, 2, 3]:
            return 'f%dq%d order 非池全集 %s' % (flat, k, idxs)
        if idxs == [0, 1, 2, 3]:
            return 'f%dq%d order 初始即原序（r39-bis 铁律）' % (flat, k)
        if any(o['line'] != lines[o['idx']] for o in q['opts']):
            return 'f%dq%d 行文本↔行号不一致' % (flat, k)
        if q['prog'] != 0:
            return 'f%dq%d order 初始 prog=%s' % (flat, k, q['prog'])
        for p in range(4):                          # 每步重读 quiz（answer=当前步句卡动态）
            q2 = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            if q2['prog'] != p:
                return 'f%dq%d order 步%d prog=%s' % (flat, k, p, q2['prog'])
            if q2['opts'][q2['answer']]['idx'] != p:
                return 'f%dq%d order 步%d answer 指向 %s' % (flat, k, p, q2['opts'][q2['answer']]['idx'])
            r = await tap(pg, q2['answer'])
            if p < 3 and r != 'step':
                return 'f%dq%d order 步%d tap=%s' % (flat, k, p, r)
            if p == 3 and r not in ('right', 'done'):
                return 'f%dq%d order 末步 tap=%s' % (flat, k, r)
        return None
    n_opt = 2 if dch == 1 else 4                    # §0.71 ch1 2 候选 / ch2+ 4 候选=池全集
    idxs = [o['idx'] for o in q['opts']]
    if len(idxs) != n_opt or len(set(idxs)) != n_opt:
        return 'f%dq%d 候选 idx=%s' % (flat, k, idxs)
    if any(o['line'] != lines[o['idx']] for o in q['opts']):
        return 'f%dq%d 行文本↔行号不一致' % (flat, k)
    if dch >= 2 and sorted(idxs) != [0, 1, 2, 3]:
        return 'f%dq%d ch%d 候选非池全集 %s' % (flat, k, dch, sorted(idxs))
    if q['kind'] == 'next':
        pl = q['prevLine']
        if not (0 <= pl <= 2):
            return 'f%dq%d prevLine=%s（尾行无下一行）' % (flat, k, pl)
        want = idxs.index(pl + 1)
        if q['answer'] != want:
            return 'f%dq%d next answer=%d want=%d' % (flat, k, q['answer'], want)
    elif q['kind'] == 'hear':
        al = q['audioLine']
        if not (0 <= al <= 3) or q['prevLine'] is not None:
            return 'f%dq%d audioLine=%s prevLine=%s' % (flat, k, al, q['prevLine'])
        if q['answer'] != idxs.index(al):
            return 'f%dq%d hear answer=%d want=%d' % (flat, k, q['answer'], idxs.index(al))
    else:
        return 'f%dq%d kind=%s' % (flat, k, q['kind'])
    r = await tap(pg, q['answer'])
    return None if r in ('right', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_wordpuz(pg, flat, k, q, dch):
    word, zh, pool = q['word'], q['zh'], q['pool']
    if word not in WP_WORDS:
        return 'f%dq%d word=%s 出封闭表' % (flat, k, word)
    if not (isinstance(zh, str) and zh):
        return 'f%dq%d zh=%r' % (flat, k, zh)
    wl = len(word)
    if dch == 1 and wl != 3:
        return 'f%dq%d ch1 词长=%d' % (flat, k, wl)
    if dch == 2 and wl != 4:
        return 'f%dq%d ch2 词长=%d' % (flat, k, wl)
    if dch >= 3 and wl not in (3, 4):
        return 'f%dq%d ch%d 词长=%d' % (flat, k, dch, wl)
    pc = Counter(c['ch'] for c in pool)
    wc = Counter(word)
    if wc - pc:
        return 'f%dq%d 池缺字母 %s' % (flat, k, dict(wc - pc))
    nd = sum((pc - wc).values())
    if dch == 3 and nd != 1:
        return 'f%dq%d ch3 干扰=%d' % (flat, k, nd)
    if dch in (1, 2) and nd != 0:
        return 'f%dq%d ch%d 干扰=%d' % (flat, k, dch, nd)
    if dch == 4 and nd not in (0, 1):
        return 'f%dq%d ch4 干扰=%d' % (flat, k, nd)
    if nd and not set((pc - wc)) <= WP_ABC:
        return 'f%dq%d 干扰字母出并集 %s' % (flat, k, dict(pc - wc))
    # 逐槽驱动（多重集：点任一未用同字母卡均合法；末张 'right'/'done'，其余 'moved'）
    # 每槽前置独立断言：slots 前缀==word[:li]（末卡 tap 后 quiz 已换题，断言须前置）
    letters = list(word)
    for li, ch in enumerate(letters):
        pre = await pg.evaluate('%s.quiz.slots.join("")' % HOOK)
        if pre != word[:li]:
            return 'f%dq%d 槽%d 前缀=%s' % (flat, k, li, pre)
        if q['answer'] != word[li] and li == 0:
            return 'f%dq%d answer=%s want=%s' % (flat, k, q['answer'], word[li])
        idx = await pg.evaluate('(c => %s.quiz.pool.findIndex(x => x.ch === c && !x.used))("%s")' % (HOOK, ch))
        if idx < 0:
            return 'f%dq%d 槽%d 未用卡缺 %s' % (flat, k, li, ch)
        r = await tap(pg, idx)
        last = li == len(letters) - 1
        if last and r not in ('right', 'done'):
            return 'f%dq%d 末卡 tap=%s' % (flat, k, r)
        if not last and r != 'moved':
            return 'f%dq%d 槽%d tap=%s' % (flat, k, li, r)
        await pg.wait_for_timeout(500)
    return None

QF = {'bodyen': q_bodyen, 'poem': q_poem, 'wordpuz': q_wordpuz}
WORD_KEY = {'bodyen': 'kind', 'poem': 'kind', 'wordpuz': 'word'}

async def audit_static(pg):
    bad = []
    zh_map = {}
    for flat in range(20):
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(300)
        st = json.loads(await pg.evaluate('JSON.stringify(%s.currentLevel)' % HOOK))
        dch = st['dch']
        if GAME == 'poem' and st.get('poem') != PIDS[flat % 12]:
            bad.append('f%d currentLevel.poem=%s want=%s' % (flat, st.get('poem'), PIDS[flat % 12]))
        if GAME in ('poem', 'bodyen') and dch != 1 + flat // 5:
            bad.append('f%d dch=%d want=%d' % (flat, dch, 1 + flat // 5))
        kinds, seen3, ndo = set(), set(), 0
        for k in range(5):
            q = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            if GAME == 'bodyen' and q['kind'] == 'do':    # r41 do 槽位 qi1/qi3 恒 2（§R2）
                ndo += 1
                if dch == 4 and k not in (1, 3):
                    bad.append('f%dq%d do 槽位错 qi=%d' % (flat, k, k))
            if GAME == 'wordpuz':                   # zh 提示跨关一致性
                if q['word'] in zh_map and zh_map[q['word']] != q['zh']:
                    bad.append('f%dq%d zh 不一致' % (flat, k))
                zh_map[q['word']] = q['zh']
            kinds.add(q[WORD_KEY[GAME]])
            err = await QF[GAME](pg, flat, k, q, dch)
            if err:
                bad.append(err); break
            if k < 4 and not await poll_step(pg, k + 1):
                bad.append('f%dq%d step 未推进' % (flat, k)); break
        if len(bad) > 12:
            break
        # 章型家族断言（§0.70-72 + SPEC-R41 §R2）
        if GAME == 'bodyen':
            if dch == 1 and kinds != {'hear'}:
                bad.append('f%d ch1 型 %s' % (flat, kinds))
            if dch == 2 and kinds != {'see'}:
                bad.append('f%d ch2 型 %s' % (flat, kinds))
            if dch == 3 and kinds != {'hear', 'see'}:
                bad.append('f%d ch3 混出 %s' % (flat, kinds))
            if dch == 4 and (kinds != {'hear', 'see', 'do'} or ndo != 2):
                bad.append('f%d ch4 型 %s do=%d' % (flat, kinds, ndo))
        elif GAME == 'poem':                        # r42 四族谱（SPEC-R42 §R2）
            if dch == 1 and kinds != {'next'}:
                bad.append('f%d ch1 型 %s' % (flat, kinds))
            if dch == 2 and kinds != {'next', 'fill'}:
                bad.append('f%d ch2 型 %s' % (flat, kinds))
            if dch == 3 and kinds != {'order', 'hear'}:
                bad.append('f%d ch3 型 %s' % (flat, kinds))
            if dch == 4 and kinds != {'next', 'fill', 'order', 'hear'}:
                bad.append('f%d ch4 型 %s' % (flat, kinds))
        else:
            if dch == 1 and any(len(w) != 3 for w in kinds):
                bad.append('f%d ch1 词长 %s' % (flat, kinds))
            if dch == 2 and any(len(w) != 4 for w in kinds):
                bad.append('f%d ch2 词长 %s' % (flat, kinds))
    return bad

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # T1 verify selftest 复跑
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_V)
        t1 = await wait_verify_title(pg)
        rec('T1 selftest 复跑', 'VERIFY PASS' in t1 and not errs, t1)
        await ctx.close()

        # T2 真实页预置存档
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_R)
        await pg.wait_for_timeout(3000)
        sv = await pg.evaluate("localStorage.getItem('%s')" % SAVEKEY)
        sv = json.loads(sv) if sv else None
        rec('T2 真实页预置存档 v1.0', bool(sv and sv.get('v') == '1.0'), 'v=%s' % (sv and sv.get('v')))
        await ctx.close()

        # T3 静态 0-19 全题 SPEC 对账+驱动
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        bad = await audit_static(pg)
        rec('T3 静态 0-19 全题 SPEC 对账+驱动', not bad and not errs3, (bad[:6] or '') if bad else 'err=%s' % errs3[:2])

        # T4 生成关 20-39 dch∈1-4 且四型全现
        gen = []
        for flat in range(20, 40):
            r = await pg.evaluate('%s.start(%d), %s.currentLevel.dch' % (HOOK, flat, HOOK))
            gen.append(r)
        rec('T4 生成关 dch∈1-4 且四型全现', all(g in (1, 2, 3, 4) for g in gen) and set(gen) == {1, 2, 3, 4}, gen)

        # T5 确定性
        same = True
        for flat in (22, 27, 33, 39):
            a = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            c = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        # T6 tapX 返回值族
        if GAME == 'wordpuz':
            # ch3 关（恒 1 干扰=非所需卡存在）：null→wrong→moved→false→right 五值
            r0 = await pg.evaluate('(async () => { %s.start(10); await new Promise(r=>setTimeout(r,400)); return String(await %s.tapLtr(99)); })()' % (HOOK, HOOK))
            ri = await pg.evaluate('(() => { const q=%s.quiz; return q.pool.findIndex(x => x.ch !== q.answer && !x.used); })()' % HOOK)
            r1 = await pg.evaluate('(async () => { const r = await %s.tapLtr(%d); return {raw: String(r), miss: %s.quiz.miss}; })()' % (HOOK, ri, HOOK))
            rj = await pg.evaluate('(() => { const q=%s.quiz; return q.pool.findIndex(x => x.ch === q.answer && !x.used); })()' % HOOK)
            r2 = await pg.evaluate('(async () => String(await %s.tapLtr(%d)))()' % (HOOK, rj))
            r3 = await pg.evaluate('(async () => String(await %s.tapLtr(%d)))()' % (HOOK, rj))
            # 续按序点完本词 → right
            r4 = await pg.evaluate("""(async () => { const H = %s;
                for (;;) { const q = H.quiz; if (!q || !q.pool) return '?';
                    const i = q.pool.findIndex(x => x.ch === q.answer && !x.used);
                    if (i < 0) return '?';
                    const r = await H.tapLtr(i);
                    if (r === 'right' || r === 'done') return String(r);
                    if (r !== 'moved') return String(r);
                    await new Promise(w => setTimeout(w, 400)); } })()""" % HOOK)
            rec('T6 tapLtr 返回值族', r0 == 'null' and r1['raw'] == 'wrong' and r1['miss'] == 1 and
                r2 == 'moved' and r3 == 'false' and r4 == 'right',
                'oob=%s wrong=%s miss=%s moved=%s used=%s finish=%s' % (r0, r1['raw'], r1['miss'], r2, r3, r4))
        else:
            flatx = 0 if GAME == 'poem' else 10      # r42：poem flat10 首题=order（step 返回族），T6 用 flat0 next（right 族）
            r3 = await pg.evaluate('async () => { %s.start(%d); const r = await %s.%s(99); return r === null ? "null" : String(r); }' % (HOOK, flatx, HOOK, TAP))
            r1 = await pg.evaluate("""async () => { const q = %s.quiz; let w = q.answer === 0 ? 1 : 0;
                const raw = await %s.%s(w); return { raw: String(raw), miss: %s.quiz.miss, step: %s.quiz.step, kind: q.kind }; }""" % (HOOK, HOOK, TAP, HOOK, HOOK))
            await pg.wait_for_timeout(2200)
            r2 = await pg.evaluate('async () => { const q = %s.quiz; return String(await %s.%s(q.answer)); }' % (HOOK, HOOK, TAP))
            rec('T6 tapX 返回值族', r3 == 'null' and r1['raw'] == 'wrong' and r1['miss'] == 1 and r1['step'] == 0 and r2 == 'right',
                'oob=%s wrong=%s miss=%s right=%s f%d %s' % (r3, r1['raw'], r1['miss'], r2, flatx, r1['kind']))

        # T7 双错防重入（fire-and-forget 窗内二击 miss 只+1）
        if GAME == 'wordpuz':
            await pg.evaluate('%s.start(10)' % HOOK)
            await pg.wait_for_timeout(400)
            for _ in range(2):
                await pg.evaluate('() => { const q = %s.quiz; const i = q.pool.findIndex(x => x.ch !== q.answer && !x.used); %s.tapLtr(i); return 1; }' % (HOOK, HOOK))
                await pg.wait_for_timeout(40)
            await pg.wait_for_timeout(2600)
            m = await pg.evaluate('%s.quiz.miss' % HOOK)
        else:
            await pg.evaluate('%s.start(10)' % HOOK)
            await pg.evaluate('() => { const q = %s.quiz; %s.%s(q.answer === 0 ? 1 : 0); return 1; }' % (HOOK, HOOK, TAP))
            await pg.wait_for_timeout(40)
            await pg.evaluate('() => { const q = %s.quiz; %s.%s(q.answer === 0 ? 1 : 0); return 1; }' % (HOOK, HOOK, TAP))
            await pg.wait_for_timeout(2200)
            m = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T7 双错防重入 miss 只+1', m == 1, 'miss=%s' % m)

        # T8 星级三档（0 错 3★ / 2 错 2★ / ≥3 错 1★）
        flatx = 10
        async def wrong_once():
            if GAME == 'wordpuz':
                await pg.evaluate('async () => { const q = %s.quiz; const i = q.pool.findIndex(x => x.ch !== q.answer && !x.used); await %s.tapLtr(i); }' % (HOOK, HOOK))
            else:
                await pg.evaluate('async () => { const q = %s.quiz; await %s.%s(q.answer === 0 ? 1 : 0); }' % (HOOK, HOOK, TAP))
        async def stars_after(nwrong):
            await pg.evaluate('%s.start(%d)' % (HOOK, flatx))
            await pg.wait_for_timeout(400)
            for _ in range(nwrong):
                await wrong_once()
                await pg.wait_for_timeout(2400)
            await pg.evaluate('%s.autoSolve()' % HOOK)
            for _ in range(40):
                st = await pg.evaluate('%s.currentLevel' % HOOK)
                if st['won']:
                    return st['stars']
                await pg.wait_for_timeout(500)
            return None
        s0, s2, s3 = await stars_after(0), await stars_after(2), await stars_after(3)
        rec('T8 星级三档', s0 == 3 and s2 == 2 and s3 == 1, '0错=%s 2错=%s 3错=%s' % (s0, s2, s3))
        await ctx.close()

        # T9 家族 A 源码正则 + K 面板守卫（契约 K）
        main_js = (BASE / GAME / '_src' / 'game-main.js').read_text(encoding='utf-8')
        data_js = (BASE / GAME / '_src' / 'game-data.js').read_text(encoding='utf-8')
        rec('T9 家族 A nextHint 双形态',
            re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js) is not None and
            re.search(r'nextHint\(\s*null\s*\)', main_js) is not None)
        rec('T9b 契约 K 面板守卫在场', "querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')" in main_js)

        # T10 C7 章末预告（4 章非空+生成关 nextHint 实算=GEN_HINTS[dch-1]，家族 F）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        hints = re.findall(r"hint:\s*'([^']+)'", data_js)
        ghints = re.findall(r"GEN_HINTS\s*=\s*\[([^\]]+)\]", data_js)
        gh = re.findall(r"'([^']+)'", ghints[0]) if ghints else []
        sem = (len(hints) == 4 and all(len(h) >= 6 for h in hints) and len(gh) == 4 and
               all(len(x) >= 6 for x in gh))
        genok = await pg.evaluate('[24,29,34,39].every(f => nextHint(f) === GEN_HINTS[genLevel(f+1).dch-1])')
        rec('T10 C7 预告在场+生成关实算', sem and genok, 'hints=%d gh=%d genok=%s' % (len(hints), len(gh), genok))
        await ctx.close()

        # T11 契约 I 豁免窗≥链实长（每款链构成独立核算）+ 守卫 + startLevel 重置
        # 窗表达式兼容两种形态：内联字面量（b28 三款/bodyen/wordpuz）/具名常量（poem WRONG_CHAIN_WIN=8400）
        vals = []
        for x in re.findall(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*([A-Za-z0-9_]+)', main_js):
            if x.isdigit():
                vals.append(int(x))
            else:
                c = re.search(r'\b%s\s*=\s*(\d+)' % re.escape(x), main_js) or \
                    re.search(r'\b%s\s*=\s*(\d+)' % re.escape(x), data_js)
                if c:
                    vals.append(int(c.group(1)))
        n_win = max(vals, default=0)
        lb, chain_sent = CHAIN[GAME]
        sent_ok = chain_sent in main_js or chain_sent in data_js      # 链内句确在源码（防播非 SPEC 句）
        guard = 'Date.now() < wrongChainUntil' in main_js
        reset = re.search(r'lastWrongVoice\s*=\s*0;\s*wrongChainUntil\s*=\s*0', main_js) is not None
        rec('T11 契约 I 豁免窗≥链实长+守卫+重置', n_win > 0 and n_win >= lb and sent_ok and guard and reset,
            'N=%d 下界=%d 句在源码=%s guard=%s reset=%s' % (n_win, lb, sent_ok, guard, reset))
        await b.close()
    fails = [n for n, ok in RES if not ok]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)

asyncio.run(main())
