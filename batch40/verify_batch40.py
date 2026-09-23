# -*- coding: utf-8 -*-
"""batch40 独立复验：ins / cbx / brk（断言从 SPEC-BATCH40 推导，期望值独立硬编码）
用法: python verify_batch40.py <ins|cbx|brk>
窗值（SPEC §1-3 实长表+_clipdur40.json 实测；ins 6638=SPEC 字面（加法笔误实算 6138，
agent 保守取窗）/cbx 6834=SPEC 字面（b_hit 实 3648 真下界 6258，保守））：
  错链豁免窗 WRONG_CHAIN_WIN：ins 6638 / cbx 6834 / brk 3330——错后等待 6900/7100/3600
钩子形状（_probe40 实证 2026-09-12；探针=钩子枚举定形状，真实 DOM 点击由 _selftest 承担 b39 N3）：
  ins  quiz={kind('judge'|'legs'), anim, text, picks[]('insect','spider'|'six','eight'), answer,
            step, miss, say}；tapPick 枚举 picked/done/wrong/null(+false 豁免吞)
  cbx  quiz={emo, scene, say, picks[](恒 3 卡 id——r50), answer, step, miss}；tapPick 同上
  brk  quiz={kind('pick'|'order'), goal, goalLabel, cards[5{id,label}], answer[](pick=3 id),
            answerList[](order=5 步定序), picked[], step, miss, say}；tapCard 枚举 fill/done/
            wrong/null(+false)；order 族连选驱动每步重读 quiz（b38 坑③）
N1 题值索引：题(flat,k)=表行[(flat//5)*5+((flat%5)+k)%5]（章池+关内 rotate）
b40 维护挂账①：ins 腿 T3 并入 F4 五生成关（25/27/29/37/39——flat20-39 中 dch4
  全体，谱推导）整关逐字段对拍+驱动（ins_gen 同种子逐位；此前五 seed 题面属推断）
"""
import asyncio, io, os, re, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME = sys.argv[1]
HOOK = {'ins': 'INS', 'cbx': 'CBX', 'brk': 'BRK'}[GAME]
TAP = {'ins': 'tapPick', 'cbx': 'tapPick', 'brk': 'tapCard'}[GAME]
SAVEKEY = 'kidsgame_' + GAME
URL_V = 'file:///' + (BASE / GAME / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME / 'index.html').as_posix()
RES = []
def rec(name, ok, info=''):
    RES.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, info))

# ---- SPEC 独立硬编码（禁 import 实现；id 照实现 data.js 抄录 2026-09-12） ----
WRONG_WAIT = {'ins': 6900, 'cbx': 7100, 'brk': 3600}
LBWIN = {'ins': 6138, 'cbx': 6258, 'brk': 3330}    # 错链真值下界（SPEC 字面窗 ins 6638/cbx 6834 为保守值）
SEEDC = {'ins': 887, 'cbx': 897, 'brk': 907}       # 三款均 seeded dch（§0.3）
OPEN_WAIT = {'ins': 7000, 'cbx': 6500, 'brk': 7000}  # T7 dbl 前开题句窗余量

# ins LEGS 封闭表（SPEC §1 真值源；answer 推导律=LEGS 唯一定 answer，禁抄题表）
# r26 扩 10 键（SPEC-R26 §R3）：snail 0 / centipede 20（dch4 干扰动物——dch1-3 路径不经过）
LEGS = {'ant': 6, 'butterfly': 6, 'bee': 6, 'ladybird': 6,
        'spider': 8, 'wolfspider': 8, 'jumpspider': 8, 'scorpion': 8,
        'snail': 0, 'centipede': 20}
INS_TABLE = [  # (kind, anim) flat0-19 照实现 ROWS 抄录
    ('judge', 'ant'), ('judge', 'butterfly'), ('judge', 'spider'), ('judge', 'bee'), ('judge', 'wolfspider'),
    ('judge', 'jumpspider'), ('judge', 'ladybird'), ('judge', 'scorpion'), ('judge', 'butterfly'), ('judge', 'spider'),
    ('legs', 'bee'), ('legs', 'wolfspider'), ('legs', 'ladybird'), ('legs', 'ant'), ('legs', 'scorpion'),
    ('legs', 'jumpspider'), ('judge', 'spider'), ('legs', 'butterfly'), ('legs', 'bee'), ('judge', 'ant'),
]
# ---- r26 dch4 谱 Python 独立复刻（SPEC-R26 §R3 生成律——与 JS 同种子逐位对拍） ----
INS_DCH4_KINDS = ['judge3', 'legs3', 'bodyseg', 'judge3', 'mixfind']
INS_SEGS = {'ant': 3, 'butterfly': 3, 'bee': 3, 'ladybird': 3,
            'spider': 2, 'wolfspider': 2, 'jumpspider': 2, 'scorpion': 2,
            'snail': 0, 'centipede': 15}
INS_BODY_POOL = ['ant', 'bee', 'spider', 'wolfspider', 'jumpspider', 'centipede']  # 视觉诚实池
INS_PICKS3 = {'judge3': ['insect', 'spider', 'none'],
              'legs3': ['six', 'eight', 'none'],
              'bodyseg': ['three', 'two', 'many']}
INS_POOL6 = ['ant', 'butterfly', 'bee', 'ladybird']
INS_POOL8 = ['spider', 'wolfspider', 'jumpspider', 'scorpion']


class Mul32:  # mulberry32 Python 复刻（imul/移位优先级照 JS 逐位对齐——同源互证防线）
    def __init__(self, a):
        self.a = a & 0xFFFFFFFF

    def __call__(self):
        self.a = (self.a + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296


def _shuf(arr, rnd):  # JS shuffled 复刻（floor(rnd*(i+1)) 双精度一致）
    a = arr[:]
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a


def _ins_cls(anim):  # 类目三向（封闭表腿数唯一决定）
    legs = LEGS[anim]
    return 'insect' if legs == 6 else ('spider' if legs == 8 else 'none')


def _ins_pick3(kind, anim):  # 三选推导律（judge3=clsOf / legs3=LEGS 三向 / bodyseg=SEGS 三向）
    if kind == 'judge3':
        return _ins_cls(anim)
    if kind == 'legs3':
        legs = LEGS[anim]
        return 'six' if legs == 6 else ('eight' if legs == 8 else 'none')
    segs = INS_SEGS[anim]
    return 'three' if segs == 3 else ('two' if segs == 2 else 'many')


def ins_gen(flat):
    """r26 复刻 genLevel 整关（dch4=buildQuiz4 消耗序列；dch1-3=题表+shuffled(2)）——
    返回 {dch, quizzes[5]}，q_ins dch4 腿逐字段对拍（谱构成聚合内含）"""
    ch = flat // 5 + 1
    rnd = Mul32(flat * 7919 + 887)
    if flat < 20:
        dch = (ch - 1) % 4 + 1
    else:
        dch = 1 + int(rnd() * 4)  # 生成关第一个随机数（先取数保确定性）
    quizzes = []
    for qi in range(5):
        row = (dch - 1) * 5 + ((flat % 5) + qi) % 5
        if dch == 4:
            kind = INS_DCH4_KINDS[qi]
            if kind in ('judge3', 'legs3'):
                anim = INS_TABLE[row][1]
                if rnd() >= 0.5:
                    anim = 'snail' if rnd() < 0.5 else 'centipede'
                picks = _shuf(INS_PICKS3[kind], rnd)
                answer = picks.index(_ins_pick3(kind, anim))
            elif kind == 'bodyseg':
                anim = INS_BODY_POOL[int(rnd() * len(INS_BODY_POOL))]
                picks = _shuf(INS_PICKS3['bodyseg'], rnd)
                answer = picks.index(_ins_pick3('bodyseg', anim))
            else:  # mixfind：cond 掷币+契合/异类池取+干扰掷币+shuffled(3)
                cond = 6 if rnd() < 0.5 else 8
                mp = INS_POOL6 if cond == 6 else INS_POOL8
                op = INS_POOL8 if cond == 6 else INS_POOL6
                match = mp[int(rnd() * 4)]
                wrong_core = op[int(rnd() * 4)]
                decoy = 'snail' if rnd() < 0.5 else 'centipede'
                picks = _shuf([match, wrong_core, decoy], rnd)
                quizzes.append({'row': row, 'kind': 'mixfind', 'anim': match, 'cond': cond,
                                'picks': picks, 'answer': picks.index(match)})
                continue
            quizzes.append({'row': row, 'kind': kind, 'anim': anim,
                            'picks': picks, 'answer': answer})
        else:  # dch1-3：题表行+shuffled(2)（消耗 1 次 rnd）——基线路径
            kind, anim = INS_TABLE[row]
            picks = _shuf(['insect', 'spider'] if kind == 'judge' else ['six', 'eight'], rnd)
            want = ('insect' if LEGS[anim] == 6 else 'spider') if kind == 'judge' \
                else ('six' if LEGS[anim] == 6 else 'eight')
            quizzes.append({'row': row, 'kind': kind, 'anim': anim,
                            'picks': picks, 'answer': picks.index(want)})
    return {'dch': dch, 'quizzes': quizzes}
# cbx 20 题 (emo, say, good, fair, third) 照实现题表逐字——r50 恒三选口径：
# 每题三张=最佳 good+次优 fair（好池成员≠good）+第三张 third（ch1-2 坏卡/ch3-4 中性卡·纯灰阶）
CBX_TABLE = [
    ('angry', '弟弟推倒你的积木，你好生气', 'breath', 'drinkwater', 'throw'),
    ('angry', '同学抢走你的画笔，你气坏了', 'countten', 'sayout', 'hit'),
    ('angry', '排队时有人插队，气鼓鼓的', 'sayout', 'hugbunny', 'shout'),
    ('angry', '妹妹弄坏你的小车，好想发火', 'drinkwater', 'countten', 'tear'),
    ('angry', '游戏输了，你气得直跺脚', 'hugbunny', 'breath', 'shout'),
    ('sad', '心爱的气球飞走了，你好难过', 'breath', 'hugbunny', 'tear'),
    ('sad', '好朋友转学了，你好难过', 'hugbunny', 'countten', 'shout'),
    ('sad', '画好的画弄脏了，你很难过', 'drinkwater', 'sayout', 'throw'),
    ('sad', '小金鱼不动了，你心里难过', 'sayout', 'breath', 'hit'),
    ('sad', '下雨天去不了公园，好难过', 'countten', 'drinkwater', 'tear'),
    ('fear', '半夜听到怪声音，你有点害怕', 'breath', 'hugbunny', 'hide'),
    ('fear', '打雷声好响，你吓得发抖', 'hugbunny', 'countten', 'hide'),
    ('fear', '房间黑黑的，你不敢进去', 'sayout', 'breath', 'hide'),
    ('fear', '看牙医的时候，你心里害怕', 'countten', 'drinkwater', 'cryonly'),
    ('fear', '大狗汪汪叫，你吓得后退', 'drinkwater', 'sayout', 'cryonly'),
    ('frus', '鞋带总系不好，你好灰心', 'breath', 'sayout', 'cryonly'),
    ('frus', '跳绳总绊脚，你有点泄气', 'countten', 'drinkwater', 'cryonly'),
    ('frus', '拼图好难，你拼得直叹气', 'hugbunny', 'breath', 'hide'),
    ('frus', '写的字歪歪扭扭，你好泄气', 'sayout', 'hugbunny', 'cryonly'),
    ('frus', '学骑车总摔倒，你灰心了', 'drinkwater', 'countten', 'hide'),
]
# brk 定表（SPEC §3 真值源）+20 题表 照实现 GOALS/QUESTIONS 抄录
BRK_GOALS = {
    'birthday':   ['定个好日子', '写邀请卡', '准备蛋糕', '布置房间', '请朋友来玩'],
    'picnic':     ['看看天气预报', '准备三明治', '装好水壶', '带上野餐垫', '找个好位置'],
    'cardmake':   ['想对妈妈说的话', '准备彩纸', '画上爱心', '写上祝福', '送给妈妈'],
    'planttree':  ['挑一棵小树苗', '挖一个小坑', '把树苗放进去', '填土浇水', '插上小名牌'],
    'bagpack':    ['看清课程表', '拿出不用的书', '放好明天的书', '检查铅笔盒', '拉好拉链'],
    'washhand':   ['卷起袖子', '冲湿小手', '抹肥皂搓泡泡', '冲洗干净', '用毛巾擦干'],
    'feedrabbit': ['先洗洗小手', '拿新鲜的菜叶', '切成小段', '放进食盆', '添一点水'],
    'bedtime':    ['收拾好玩具', '刷牙洗脸', '换上睡衣', '听一个小故事', '关灯睡觉'],
}
BRK_TABLE = [  # (goal, kind) flat0-19
    ('birthday', 'pick'), ('picnic', 'pick'), ('cardmake', 'pick'), ('planttree', 'pick'), ('bagpack', 'pick'),
    ('washhand', 'pick'), ('feedrabbit', 'pick'), ('bedtime', 'pick'), ('birthday', 'pick'), ('picnic', 'pick'),
    ('cardmake', 'order'), ('planttree', 'order'), ('bagpack', 'order'), ('washhand', 'order'), ('feedrabbit', 'order'),
    ('bedtime', 'order'), ('birthday', 'order'), ('picnic', 'order'), ('cardmake', 'order'), ('planttree', 'order'),
]

def dch_reseed(flat, c):
    a = (flat * 7919 + c) & 0xFFFFFFFF
    a = (a + 0x6D2B79F5) & 0xFFFFFFFF
    t = a
    t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
    t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
    r = ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return 1 + int(r * 4)

async def wait_verify_title(pg):
    for _ in range(240):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t and t != 'VERIFY':
            return t
        await pg.wait_for_timeout(500)
    return ''

async def poll_step(pg, want, timeout=30000):
    src = '%s.currentLevel.step' % HOOK
    for _ in range(int(timeout / 300)):
        s = await pg.evaluate(src)
        if s == want:
            return True
        await pg.wait_for_timeout(300)
    return False

async def tap_retry(pg, expr, wants, timeout=16000):
    r = None
    for _ in range(int(timeout / 400)):
        r = await pg.evaluate('(async () => { const r = await (%s); return r === null ? "null" : (r === false ? "false" : String(r)); })()' % expr)
        if r in wants:
            return r
        await pg.wait_for_timeout(400)
    return r

def rowidx(flat, k):
    return (flat // 5) * 5 + ((flat % 5) + k) % 5

async def q_ins(pg, flat, k, q, dch):
    """§1 锚：kind/anim 按章池+rotate；answer 由 LEGS 推导律复算（6→insect/six，8→spider/eight）
    r26 dch4 腿：ins_gen 整关 Python 复刻（mulberry32 同种子逐位）——kind 谱位/anim
    （掷币换干扰动物主角）/picks 顺序/answer 推导/cond 全字段对拍+谱构成聚合内含"""
    if dch == 4:
        exp = ins_gen(flat)['quizzes'][k]
        for f in ('kind', 'anim', 'picks', 'answer'):
            if q.get(f) != exp[f]:
                return 'f%dq%d dch4 %s=%s≠复算 %s' % (flat, k, f, q.get(f), exp[f])
        if exp['kind'] == 'mixfind' and q.get('cond') != exp['cond']:
            return 'f%dq%d dch4 cond=%s≠%s' % (flat, k, q.get('cond'), exp['cond'])
        r = await tap_retry(pg, '%s.tapPick(%d)' % (HOOK, q['answer']), ('picked', 'done'))
        return None if r in ('picked', 'done') else 'f%dq%d tap=%s' % (flat, k, r)
    kind, anim = INS_TABLE[rowidx(flat, k)]
    if q.get('kind') != kind or q.get('anim') != anim:
        return 'f%dq%d kind/anim=%s/%s≠%s/%s' % (flat, k, q.get('kind'), q.get('anim'), kind, anim)
    legs = LEGS[anim]
    want = ('insect' if legs == 6 else 'spider') if kind == 'judge' else ('six' if legs == 6 else 'eight')
    picks = q.get('picks') or []
    if sorted(picks) != sorted(['insect', 'spider'] if kind == 'judge' else ['six', 'eight']):
        return 'f%dq%d picks=%s≠两选族' % (flat, k, picks)
    if q.get('answer') != picks.index(want):
        return 'f%dq%d answer≠推导律 indexOf(%s)' % (flat, k, want)
    r = await tap_retry(pg, '%s.tapPick(%d)' % (HOOK, picks.index(want)), ('picked', 'done'))
    return None if r in ('picked', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_cbx(pg, flat, k, q, dch):
    """§2 锚（r50 口径）：emo/say 逐字（章池+rotate）；恒三选 picks 集={good,fair,third}
    （third=ch1-2 坏卡/ch3-4 中性卡·纯灰阶）；answer=indexOf(题表 good 列)——r50 起好池
    两张（good+fair 同 kind=good），旧「唯一 kind=good」推导口径作废"""
    emo, say, good, fair, third = CBX_TABLE[rowidx(flat, k)]
    if q.get('emo') != emo or q.get('say') != say:
        return 'f%dq%d emo/say≠题表（%s）' % (flat, k, say)
    picks = q.get('picks') or []
    want = {good, fair, third}
    if len(picks) != 3 or set(picks) != want:
        return 'f%dq%d picks=%s≠%s（r50 恒三选）' % (flat, k, picks, sorted(want))
    if q.get('answer') != picks.index(good):
        return 'f%dq%d answer≠indexOf(%s)（题表 good 列锚）' % (flat, k, good)
    r = await tap_retry(pg, '%s.tapPick(%d)' % (HOOK, picks.index(good)), ('picked', 'done'))
    return None if r in ('picked', 'done') else 'f%dq%d tap=%s' % (flat, k, r)

async def q_brk(pg, flat, k, q, dch):
    """§3 锚：goal/kind 对账（章池+rotate）；pick=answer⊆目标步集 len3+干扰∉目标+label 对账；
    order=cards 集=5 步+answerList=定序+label 对账；连选驱动每步重读 quiz（b38 坑③）"""
    goal, kind = BRK_TABLE[rowidx(flat, k)]
    steps = BRK_GOALS[goal]
    stepset = set(goal + '_' + str(i) for i in range(5))
    if q.get('goal') != goal or q.get('kind') != kind:
        return 'f%dq%d goal/kind=%s/%s≠%s/%s' % (flat, k, q.get('goal'), q.get('kind'), goal, kind)
    for i, c in enumerate(q.get('cards') or []):
        cid, lab = c.get('id'), c.get('label')
        if cid in stepset and lab != steps[int(cid.rsplit('_', 1)[1])]:
            return 'f%dq%d card[%d] label≠定表' % (flat, k, i)
    if kind == 'pick':
        ans = q.get('answer') or []
        if len(ans) != 3 or not set(ans) <= stepset:
            return 'f%dq%d pick answer=%s≠目标步集 3 元' % (flat, k, ans)
        ids = [c['id'] for c in q.get('cards') or []]
        if len(ids) != 5 or set(ids) != set(ans) | (set(ids) - stepset) or len(set(ids) - stepset) != 2:
            return 'f%dq%d cards=%s 非 3 正确+2 干扰' % (flat, k, ids)
        for good in ans:
            qq = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            if good in (qq.get('picked') or []):
                continue
            r = await tap_retry(pg, '%s.tapCard(%d)' % (HOOK, ids.index(good)), ('fill', 'done'))
            if r not in ('fill', 'done'):
                return 'f%dq%d tap(%s)=%s' % (flat, k, good, r)
        return None
    # order：按定序连选，每步重读 quiz（picked 推进）
    order_ids = [goal + '_' + str(i) for i in range(5)]
    if q.get('answerList') != order_ids:
        return 'f%dq%d answerList≠定序表' % (flat, k)
    for good in order_ids:
        qq = None
        for _ in range(25):   # 每步重读 quiz（连选驱动——b38 坑③）
            cand = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
            if cand and good not in (cand.get('picked') or []):
                qq = cand
                break
            await pg.wait_for_timeout(400)
        if qq is None:
            return 'f%dq%d quiz 未推进到步 %s' % (flat, k, good)
        ids = [c['id'] for c in qq.get('cards') or []]
        if set(ids) != set(order_ids):
            return 'f%dq%d order cards≠5 步全集' % (flat, k)
        r = await tap_retry(pg, '%s.tapCard(%d)' % (HOOK, ids.index(good)), ('fill', 'done'))
        if r not in ('fill', 'done'):
            return 'f%dq%d tap(%s)=%s' % (flat, k, good, r)
    return None

QF = {'ins': q_ins, 'cbx': q_cbx, 'brk': q_brk}

async def audit_static(pg, flats=range(20)):
    bad = []
    for flat in flats:
        await pg.evaluate('%s.start(%d)' % (HOOK, flat))
        await pg.wait_for_timeout(400)
        lv = json.loads(await pg.evaluate('JSON.stringify(%s.currentLevel)' % HOOK))
        dch = lv.get('dch')
        for k in range(5):
            q = None  # 换题/送出演出窗内 quiz 可空——轮询等本题（quiz.step==k）
            for _ in range(25):
                cand = json.loads(await pg.evaluate('JSON.stringify(%s.quiz)' % HOOK))
                if cand and cand.get('step') == k:
                    q = cand
                    break
                await pg.wait_for_timeout(400)
            if q is None:
                bad.append('f%dq%d quiz 未达' % (flat, k)); break
            err = await QF[GAME](pg, flat, k, q, dch)
            if err:
                bad.append(err); break
            if k < 4:
                if not await poll_step(pg, k + 1, timeout=90000):
                    bad.append('f%dq%d 未推进' % (flat, k)); break
        if len(bad) > 8:
            break
    return bad

async def wrong_js(restart=True):
    rst = 'await H.start(10);' if restart else ''
    if GAME == 'brk':
        return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
                ' for (let i = 0; i < 50; i++) { const q = H.quiz; if (!q || !q.cards) { await new Promise(w=>setTimeout(w,400)); continue; }'
                ' const bad = q.cards.findIndex(c => q.kind === "pick" ? !q.answer.includes(c.id)'
                ' : c.id !== q.answerList[(q.picked || []).length]);'
                ' const r = await H.tapCard(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
                ' return "noreach"; })()'
                ) % (HOOK, rst)
    return ('(async () => { const H = %s; %s await new Promise(w=>setTimeout(w,300));'
            ' for (let i = 0; i < 50; i++) { const q = H.quiz; if (!q || !q.picks) { await new Promise(w=>setTimeout(w,400)); continue; }'
            ' const bad = q.picks.findIndex((p, j) => j !== q.answer);'
            ' const r = await H.tapPick(bad); if (r) return String(r); await new Promise(w=>setTimeout(w,400)); }'
            ' return "noreach"; })()'
            ) % (HOOK, rst)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_V)
        t1 = await wait_verify_title(pg)
        rec('T1 selftest 复跑', 'VERIFY PASS' in t1 and not errs, t1)
        await ctx.close()

        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_R)
        await pg.wait_for_timeout(3000)
        sv = await pg.evaluate("localStorage.getItem('%s')" % SAVEKEY)
        sv = json.loads(sv) if sv else None
        rec('T2 真实页预置存档 v1.0', bool(sv and sv.get('v') == '1.0'), 'v=%s' % (sv and sv.get('v')))
        await ctx.close()

        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        bad = await audit_static(pg)
        if GAME == 'ins':
            # b40 维护挂账①：F4 五生成关并入 T3 逐字段对拍+驱动——flats=flat20-39
            # 中 dch4 全体 [25,27,29,37,39]（dch_reseed 谱推导硬编码，非运行观测）。
            # 生成关路径（flat≥20，mulberry32 首耗被 dch 获取）的 buildQuiz4 消耗
            # 序列此前未实测（T4 仅对拍 dch 值，五 seed 题面属推断）——q_ins dch4 腿
            # 走 ins_gen 同种子逐位对拍（kind 谱位/anim/picks 顺序/answer/cond）
            bad += await audit_static(pg, flats=(25, 27, 29, 37, 39))
        rec('T3 全量 SPEC 对账+驱动', not bad and not errs3, (bad[:6] or '') if bad else 'err=%s' % errs3[:2])

        gen = []
        for flat in range(20, 40):
            r = await pg.evaluate('%s.start(%d), %s.currentLevel.dch' % (HOOK, flat, HOOK))
            gen.append(r)
        exp = [dch_reseed(f, SEEDC[GAME]) for f in range(20, 40)]
        rec('T4 生成关 dch 独立复算对账+四型全现', gen == exp and set(gen) == {1, 2, 3, 4},
            'obs=%s exp_match=%s' % (gen, gen == exp))

        same = True
        for flat in (22, 27, 33, 39):
            a = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            c = await pg.evaluate('%s.start(%d), JSON.stringify(%s.quiz)' % (HOOK, flat, HOOK))
            if a != c:
                same = False
        rec('T5 生成关确定性', same)

        # T6：错选 wrong+miss 计 1
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600)
        w1 = await pg.evaluate(await wrong_js(restart=False))
        m1 = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T6 错选 wrong+miss 计 1', w1 == 'wrong' and m1 == 1, 'r=%s miss=%s' % (w1, m1))
        await pg.wait_for_timeout(WRONG_WAIT[GAME])

        # T7：双错防重入 miss 只+1——开题句窗余量后单次直点
        await pg.evaluate('%s.start(10)' % HOOK)
        await pg.wait_for_timeout(600)
        await pg.wait_for_timeout(OPEN_WAIT[GAME])
        dbl = ('(async()=>{const H=%s;const q=H.quiz;const bad=q.%s.findIndex((p,j)=>j!==q.answer);'
               'const r=await H.%s(bad);return r===null?"null":(r===false?"false":String(r));})()'
               % (HOOK, 'cards' if GAME == 'brk' else 'picks', TAP)) if GAME != 'brk' else \
              ('(async()=>{const H=%s;const q=H.quiz;const bad=q.cards.findIndex(c=>q.kind==="pick"?!q.answer.includes(c.id)'
               ':c.id!==q.answerList[(q.picked||[]).length]);const r=await H.%s(bad);'
               'return r===null?"null":(r===false?"false":String(r));})()' % (HOOK, TAP))
        d1 = await pg.evaluate(dbl)
        await pg.wait_for_timeout(40)
        d2 = await pg.evaluate(dbl)
        await pg.wait_for_timeout(WRONG_WAIT[GAME])
        m = await pg.evaluate('%s.quiz.miss' % HOOK)
        rec('T7 双错防重入 miss 只+1', d1 == 'wrong' and m == 1, 'd1=%s d2=%s miss=%s' % (d1, d2, m))

        # T8：星级三档
        async def stars_after(nwrong):
            await pg.evaluate('%s.start(10)' % HOOK)
            await pg.wait_for_timeout(600)
            for _ in range(nwrong):
                await pg.evaluate(await wrong_js(restart=False))
                await pg.wait_for_timeout(WRONG_WAIT[GAME])
            await pg.evaluate('%s.autoSolve()' % HOOK)
            for _ in range(150):
                st = await pg.evaluate('%s.currentLevel' % HOOK)
                if st['won']:
                    return st['stars']
                await pg.wait_for_timeout(500)
            return None
        s0, s2, s3 = await stars_after(0), await stars_after(2), await stars_after(3)
        rec('T8 星级三档', s0 == 3 and s2 == 2 and s3 == 1, '0错=%s 2错=%s 3错=%s' % (s0, s2, s3))
        await ctx.close()

        main_js = (BASE / GAME / '_src' / 'game-main.js').read_text(encoding='utf-8')
        data_js = (BASE / GAME / '_src' / 'game-data.js').read_text(encoding='utf-8')
        rec('T9 家族 A nextHint 双形态',
            re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', main_js) is not None and
            re.search(r'nextHint\(\s*null\s*\)', main_js) is not None)
        rec('T9b 契约 K 面板守卫在场', "querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')" in main_js)

        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto(URL_V)
        await wait_verify_title(pg)
        hints = re.findall(r"hint:\s*'([^']+)'", data_js)
        ghints = re.findall(r'GEN_HINTS\s*=\s*\[([^\]]+)\]', data_js)
        gh = re.findall(r"'([^']+)'", ghints[0]) if ghints else []
        sem = (len(hints) == 4 and all(len(h) >= 4 for h in hints) and len(gh) == 4 and
               all(len(x) >= 4 for x in gh))
        genok = await pg.evaluate('[24,29,34,39].every(f => nextHint(f) === GEN_HINTS[genLevel(f+1).dch-1])')
        rec('T10 C7 预告在场+生成关实算', sem and genok, 'hints=%d gh=%d genok=%s' % (len(hints), len(gh), genok))
        await ctx.close()

        # T11：契约 I+N 豁免窗≥下界（总窗口径）+keyless 恒尾
        vals = []
        for x in re.findall(r'wrongChainUntil\s*=\s*Date\.now\(\)\s*\+\s*([A-Za-z0-9_]+)', main_js):
            if x.isdigit():
                vals.append(int(x))
            else:
                c = re.search(r'\b%s\s*=\s*([\d+\s]+)' % re.escape(x), main_js) or \
                    re.search(r'\b%s\s*=\s*([\d+\s]+)' % re.escape(x), data_js)
                if c:
                    vals.append(sum(int(t) for t in c.group(1).split('+') if t.strip()))
        n_win = max(vals, default=0)
        guard = 'Date.now() < wrongChainUntil' in main_js
        reset = re.search(r'lastWrongVoice\s*=\s*0;\s*wrongChainUntil\s*=\s*0', main_js) is not None
        n_static = True
        for m in re.finditer(r'\{\s*key:\s*null[^}]*\}\s*(\S)', main_js):
            if m.group(1) != ']':
                n_static = False
        rec('T11 契约 I+N 豁免窗≥下界+keyless 恒尾', n_win >= LBWIN[GAME] and guard and reset and n_static,
            'N=%d 下界=%d guard=%s reset=%s keyless静态=%s' % (n_win, LBWIN[GAME], guard, reset, n_static))
        await b.close()
    fails = [n for n, ok in RES if not ok]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)

asyncio.run(main())
