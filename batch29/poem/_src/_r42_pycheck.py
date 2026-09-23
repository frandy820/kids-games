# -*- coding: utf-8 -*-
"""r42 pycheck：Python 独立复刻 poem 引擎生成序（mulberry32/specSeqOf/buildQuiz/genLevel），
与 index.html 引擎实测 40 关逐字段对比 + 分布断言独立复算（r39-bis 铁律）。
断言从 SPEC-R42-POEM §R2/§R3/§R4 推导，禁 import 实现 JS。
用法: python batch29/poem/_src/_r42_pycheck.py"""
import asyncio, io, json, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent.parent
URL = 'file:///' + (BASE / 'index.html').as_posix() + '?verify=1'
CH_LEN, STATIC = 5, 20

# ---- SPEC 独立重列（§R1 诗库 + §R4 FILLS；与 game-verify SPEC_POEMS/SPEC_FILLS 三源对账） ----
IDS = ['yie', 'jys', 'cx', 'mn', 'dgjl', 'yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs']
POEMS = {
    'yie':   ['鹅，鹅，鹅', '曲项向天歌', '白毛浮绿水', '红掌拨清波'],
    'jys':   ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'],
    'cx':    ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'],
    'mn':    ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦'],
    'dgjl':  ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼'],
    'yqesl': ['一去二三里', '烟村四五家', '亭台六七座', '八九十枝花'],
    'clg':   ['敕勒川，阴山下', '天似穹庐，笼盖四野', '天苍苍，野茫茫', '风吹草低见牛羊'],
    'yhs':   ['只有天在上', '更无山与齐', '举头红日近', '回首白云低'],
    'jsyz':  ['江上往来人', '但爱鲈鱼美', '君看一叶舟', '出没风波里'],
    'dlyy':  ['向晚意不适', '驱车登古原', '夕阳无限好', '只是近黄昏'],
    'lc':    ['空山不见人', '但闻人语响', '返景入深林', '复照青苔上'],
    'xs':    ['红豆生南国', '春来发几枝', '愿君多采撷', '此物最相思'],
}
FILLS = {
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

# ---- Python 复刻（mulberry32 位模式精确：全程 &0xFFFFFFFF + 逻辑移位；Math.imul=截断乘） ----
def mulberry32(a):
    state = a & 0xFFFFFFFF
    def rnd():
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = (state ^ (state >> 15)) & 0xFFFFFFFF
        t = (t * ((1 | state) & 0xFFFFFFFF)) & 0xFFFFFFFF          # Math.imul(a^a>>>15, 1|a)
        t2 = (t ^ (t >> 7)) & 0xFFFFFFFF
        im2 = (t2 * ((61 | t) & 0xFFFFFFFF)) & 0xFFFFFFFF          # Math.imul(t^t>>>7, 61|t)
        t = (((t + im2) & 0xFFFFFFFF) ^ t) & 0xFFFFFFFF            # JS 优先级：(t + im2) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd

def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a

def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))

def key_of_spec(s):
    if s['kind'] == 'next':
        return 'next:%d' % s['prevLine']
    if s['kind'] == 'hear':
        return 'hear:%d' % s['audioLine']
    if s['kind'] == 'fill':
        return 'fill:%d' % s['fillLine']
    return 'order:o'

def mk(dch, rnd):
    if dch == 1:
        return {'kind': 'next', 'prevLine': ri(rnd, 0, 2)}
    if dch == 2:
        return ({'kind': 'fill', 'fillLine': ri(rnd, 0, 3)} if rnd() < 0.5
                else {'kind': 'next', 'prevLine': ri(rnd, 0, 2)})
    if dch == 3:
        return ({'kind': 'order'} if rnd() < 0.55
                else {'kind': 'hear', 'audioLine': ri(rnd, 0, 3)})
    roll = ri(rnd, 0, 3)
    if roll == 0:
        return {'kind': 'next', 'prevLine': ri(rnd, 0, 2)}
    if roll == 1:
        return {'kind': 'fill', 'fillLine': ri(rnd, 0, 3)}
    if roll == 2:
        return {'kind': 'order'}
    return {'kind': 'hear', 'audioLine': ri(rnd, 0, 3)}

def spec_seq_of(dch, rnd, flat):
    specs = []
    if dch == 4:
        roll = ri(rnd, 0, 3)
        fifth = ['next', 'fill', 'order', 'hear'][roll]
        out = []
        for k in shuffled(['next', 'fill', 'order', 'hear', fifth], rnd):
            if k == 'next':
                out.append({'kind': 'next', 'prevLine': ri(rnd, 0, 2)})
            elif k == 'fill':
                out.append({'kind': 'fill', 'fillLine': ri(rnd, 0, 3)})
            elif k == 'order':
                out.append({'kind': 'order'})
            else:
                out.append({'kind': 'hear', 'audioLine': ri(rnd, 0, 3)})
        specs = out
    else:
        specs = [mk(dch, rnd) for _ in range(CH_LEN)]
        if dch == 2:
            n_fill = sum(1 for s in specs if s['kind'] == 'fill')
            if n_fill < 2:
                specs[0] = {'kind': 'fill', 'fillLine': ri(rnd, 0, 3)}
                specs[1] = {'kind': 'fill', 'fillLine': ri(rnd, 0, 3)}
            elif n_fill == CH_LEN:
                specs[1] = {'kind': 'next', 'prevLine': ri(rnd, 0, 2)}
        if dch == 3:
            n_order = sum(1 for s in specs if s['kind'] == 'order')
            if n_order < 2:
                specs[0] = {'kind': 'order'}
                specs[1] = {'kind': 'order'}
            elif n_order > 3:
                specs[1] = {'kind': 'hear', 'audioLine': ri(rnd, 0, 3)}
                specs[2] = {'kind': 'hear', 'audioLine': ri(rnd, 0, 3)}
    if flat == 0:
        specs[0] = {'kind': 'next', 'prevLine': 0}
    prev = None
    # 族内重掷（r42 修复轮 M1 2026-09-22，与 game-core.js 同步）：保 kind 只重掷行参数
    def reroll(t):
        if t['kind'] == 'hear':
            return {'kind': 'hear', 'audioLine': ri(rnd, 0, 3)}
        if t['kind'] == 'fill':
            return {'kind': 'fill', 'fillLine': ri(rnd, 0, 3)}
        return {'kind': 'next', 'prevLine': ri(rnd, 0, 2)}
    for qi in range(CH_LEN):
        s = specs[qi]
        pk = key_of_spec(prev) if prev else None
        if s['kind'] != 'order':
            g = 0
            while g < 8 and key_of_spec(s) == pk:
                s = reroll(s)
                specs[qi] = s
                g += 1
        prev = specs[qi]
    return specs

def build_quiz(spec, pid, dch, rnd):
    lines = POEMS[pid]
    if spec['kind'] == 'fill':
        h, ch, dis = FILLS[pid][spec['fillLine']]
        opts = [{'ch': c} for c in shuffled([ch] + dis, rnd)]
        answer = next(j for j, o in enumerate(opts) if o['ch'] == ch)
        return {'kind': 'fill', 'poem': pid, 'line': spec['fillLine'], 'hole': h,
                'opts': opts, 'answer': answer, '_miss': 0, '_answered': False}
    if spec['kind'] == 'order':
        idx_order = shuffled([0, 1, 2, 3], rnd)
        if idx_order == [0, 1, 2, 3]:
            idx_order[0], idx_order[1] = idx_order[1], idx_order[0]
        return {'kind': 'order', 'poem': pid,
                'opts': [{'line': lines[i], 'idx': i} for i in idx_order],
                '_prog': 0, '_miss': 0, '_answered': False}
    ans_idx = spec['prevLine'] + 1 if spec['kind'] == 'next' else spec['audioLine']
    n_opt = 2 if dch == 1 else 4
    if n_opt == 4:
        idx_order = shuffled([0, 1, 2, 3], rnd)
    else:
        pool = shuffled([i for i in [0, 1, 2, 3] if i != ans_idx], rnd)[:1]
        idx_order = shuffled([ans_idx] + pool, rnd)
    opts = [{'line': lines[i], 'idx': i} for i in idx_order]
    answer = next(j for j, o in enumerate(opts) if o['idx'] == ans_idx)
    return {'kind': spec['kind'], 'poem': pid,
            'prevLine': spec['prevLine'] if spec['kind'] == 'next' else None,
            'audioLine': spec['audioLine'] if spec['kind'] == 'hear' else None,
            'opts': opts, 'answer': answer, '_miss': 0, '_answered': False}

def gen_level(flat):
    ch, lv = flat // CH_LEN + 1, flat % CH_LEN
    pid = IDS[flat % 12]
    rnd = mulberry32(flat * 7919 + 71)
    dch = 1 + flat // 5 if flat < STATIC else ri(rnd, 1, 4)
    specs = spec_seq_of(dch, rnd, flat)
    quizzes = [build_quiz(specs[qi], pid, dch, rnd) for qi in range(CH_LEN)]
    return {'flat': flat, 'ch': ch, 'dch': dch, 'lv': lv, 'pid': pid,
            'quizzes': quizzes, 'step': 0, 'retries': 0, 'done': False}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.goto(URL)
        for _ in range(150):
            if 'VERIFY' in (await pg.evaluate('document.title')):
                break
            await pg.wait_for_timeout(500)
        engine = json.loads(await pg.evaluate(
            'JSON.stringify(Array.from({length: 40}, (_, f) => genLevel(f)))'))
        await b.close()

    # ---- 逐字段对比（Python 复刻 vs 引擎实测） ----
    mism = []
    for flat in range(40):
        mine, eng = gen_level(flat), engine[flat]
        for kk in ('flat', 'ch', 'dch', 'lv', 'pid', 'step', 'retries', 'done'):
            if mine[kk] != eng[kk]:
                mism.append('f%d %s: py=%r eng=%r' % (flat, kk, mine[kk], eng[kk]))
        for qi in range(CH_LEN):
            qm, qe = mine['quizzes'][qi], eng['quizzes'][qi]
            for kk in ('kind', 'poem', 'prevLine', 'audioLine', 'line', 'hole', 'answer', '_prog', '_miss', '_answered'):
                if (qm.get(kk, None) if kk != '_answered' else qm.get(kk, False)) != (qe.get(kk, None) if kk != '_answered' else qe.get(kk, False)):
                    mism.append('f%dq%d %s: py=%r eng=%r' % (flat, qi, kk, qm.get(kk), qe.get(kk)))
            if json.dumps(qm.get('opts'), ensure_ascii=False) != json.dumps(qe.get('opts'), ensure_ascii=False):
                mism.append('f%dq%d opts: py=%s eng=%s' % (flat, qi,
                            json.dumps(qm.get('opts'), ensure_ascii=False)[:80],
                            json.dumps(qe.get('opts'), ensure_ascii=False)[:80]))
        if len(mism) > 10:
            break
    print('[%s] P1 Python 复刻 40 关逐字段 == 引擎实测 %s' % ('PASS' if not mism else 'FAIL',
          '' if not mism else mism[:6]))

    # ---- 分布断言（r39-bis 铁律，Python 独立复算） ----
    holes, ans_hist, order_sorted, kind_by_dch = {}, {0: 0, 1: 0, 2: 0, 3: 0}, 0, {}
    n_fill = 0
    for flat in range(40):
        L = gen_level(flat)
        kind_by_dch.setdefault(L['dch'], set()).update(q['kind'] for q in L['quizzes'])
        for q in L['quizzes']:
            if q['kind'] == 'fill':
                n_fill += 1
                holes[q['hole']] = holes.get(q['hole'], 0) + 1
                ans_hist[q['answer']] += 1
            elif q['kind'] == 'order':
                if [o['idx'] for o in q['opts']] == [0, 1, 2, 3]:
                    order_sorted += 1
    ok2 = len(holes) >= 5 and holes.get(0, 0) / max(1, n_fill) <= 0.30
    print('[%s] P2 fill 挖空位 ≥5 种且位0 ≤30%%（%d 种/位0=%.2f%%/n=%d）' %
          ('PASS' if ok2 else 'FAIL', len(holes), 100 * holes.get(0, 0) / max(1, n_fill), n_fill))
    ok3 = order_sorted == 0
    print('[%s] P3 order 初始序 40 关全非原序（sorted=%d）' % ('PASS' if ok3 else 'FAIL', order_sorted))
    ok4 = n_fill > 0 and all(ans_hist[i] >= -(-n_fill // 8) for i in range(4))
    print('[%s] P4 fill 真值卡位 4 位各 ≥ceil(n/8)（%s n=%d 阈=%d）' %
          ('PASS' if ok4 else 'FAIL', ans_hist, n_fill, -(-n_fill // 8)))
    ok5 = (kind_by_dch[1] == {'next'} and kind_by_dch[2] == {'next', 'fill'} and
           kind_by_dch[3] == {'order', 'hear'} and
           all(k in kind_by_dch[4] for k in ('next', 'fill', 'order', 'hear')))
    print('[%s] P5 章型谱 dch1 纯next/dch2 next+fill/dch3 order+hear/dch4 四族全出 %s' %
          ('PASS' if ok5 else 'FAIL', {k: sorted(v) for k, v in sorted(kind_by_dch.items())}))
    # P5b 逐关混出保底（r42 修复轮 M1 扩面 2026-09-22：flat0-59 含生成关——
    # 族内重掷后保底恒立；原仅 40 关聚合 kind 集合不查每关计数，审查 M1 覆盖缺口）
    bad_lv = []
    for flat in range(60):
        L = gen_level(flat)
        ks = [q['kind'] for q in L['quizzes']]
        if L['dch'] == 2 and (ks.count('fill') < 2 or ks.count('next') < 1):
            bad_lv.append((flat, 'dch2', ks))
        if L['dch'] == 3 and (ks.count('order') < 2 or ks.count('hear') < 2):
            bad_lv.append((flat, 'dch3', ks))
    ok5b = not bad_lv
    print('[%s] P5b 逐关混出保底 flat0-59（dch2 fill≥2+next≥1/dch3 order≥2+hear≥2）%s' %
          ('PASS' if ok5b else 'FAIL', '' if ok5b else bad_lv[:4]))
    L0 = gen_level(0)
    ok6 = L0['pid'] == 'yie' and L0['quizzes'][0]['kind'] == 'next' and L0['quizzes'][0]['prevLine'] == 0
    print('[%s] P6 flat0 锚面（yie/q0=next/prevLine0）' % ('PASS' if ok6 else 'FAIL'))
    det = all(json.dumps(gen_level(f)['quizzes'], ensure_ascii=False) ==
              json.dumps(gen_level(f)['quizzes'], ensure_ascii=False) for f in (0, 10, 23, 39))
    print('[%s] P7 Python 复刻自身确定性' % ('PASS' if det else 'FAIL'))
    allok = not mism and all([ok2, ok3, ok4, ok5, ok6, det])
    print('PYCHECK %s (%s)' % ('ALL GREEN' if allok else 'HAS FAIL', '40 levels x field-by-field'))
    sys.exit(0 if allok else 1)

asyncio.run(main())
