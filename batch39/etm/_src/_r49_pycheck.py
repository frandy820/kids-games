# -*- coding: utf-8 -*-
"""r49 Python 独立复算（r33/r44 范式）：按 SPEC-R49-ETM §R3 生成律 Python 实现
mulberry32（32 位截断乘/全程 &0xFFFFFFFF）/shuffled/ri，60 关 genLevel 全字段
（kind/scene/text/say/sayKey/picks/answer/_miss/_answered/row）与页内提取的
_r49_post_full.json 逐关逐题对拍。断言从 SPEC §R3/§R4 文字推导（独立重列封闭表
与线索表），禁抄 game-core.js/game-data.js 实现。
另含：flat0-4 教学锚与 _r49_baseline.json 逐字段对账（r49 谱保留实证）+
level/mix 先验线索律+族分布律+题表字数口径（6-17 字 estMs 2670-6465）。
用法: python _r49_pycheck.py"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
CH_LEN = 5                # SPEC-R49 §R1：CH_LEN=5 不变（档键基不变，无迁移）
STATIC_LEVELS = 20

# SPEC-R49 §R3 封闭表（独立重列）
FACES = ['happy', 'angry', 'sad', 'scared']
LEVELS = ['l1', 'l2', 'l3', 'l4', 'l5']
MIXES = ['happy+scared', 'happy+sad', 'angry+sad', 'angry+scared']
POOL_ROWS = {1: [0, 1, 2, 3, 4, 20, 21, 22, 23, 24],
             2: [5, 6, 7, 8, 9, 25, 26, 27, 28, 29],
             3: [10, 11, 12, 13, 14, 30, 31, 32, 33, 34],
             4: [15, 16, 17, 18, 19, 35, 36, 37, 38, 39]}
KIND_OF_DCH = {1: 'face', 2: 'face', 3: 'level', 4: 'mix'}
QUESTIONS = [
    ('flower', 'face', '朋友送你一朵小花', 'happy'),
    ('blocksdown', 'face', '妹妹把你的积木推倒了', 'angry'),
    ('balloonfly', 'face', '心爱的气球飞走了', 'sad'),
    ('thunder', 'face', '打雷轰隆隆响', 'scared'),
    ('singsong', 'face', '大家一起唱歌', 'happy'),
    ('fishfloat', 'face', '你的小金鱼不动了，浮在水面上', 'sad'),
    ('dooropen', 'face', '关了灯的房间，衣柜门吱呀开了', 'scared'),
    ('coinbank', 'face', '存钱罐里的钱，正好够买那个玩具', 'happy'),
    ('sacktower', 'face', '辛苦搭的高塔被人扫倒，他转身就走', 'angry'),
    ('artshow', 'face', '你的画被选去展览，大家都停下来看', 'happy'),
    ('crayondrop', 'level', '有人不小心碰掉了你的蜡笔', 'l1'),
    ('snatchtoy', 'level', '有人抢走你手里的玩具', 'l2'),
    ('swinggrab', 'level', '有人一直抢你的秋千', 'l3'),
    ('castlekick', 'level', '辛苦搭的城堡被故意踢倒', 'l4'),
    ('ruinlaugh', 'level', '有人弄坏了你的画还笑你', 'l5'),
    ('bookrip', 'mix', '绘本被撕坏了，你又气又难过', 'angry+sad'),
    ('funfair', 'mix', '明天去游乐园，你开心又有点怕下雨', 'happy+scared'),
    ('friendmove', 'mix', '好朋友要搬走了，你为他开心又舍不得', 'happy+sad'),
    ('bullyshout', 'mix', '有人抢你玩具还凶你，你又怕又生气', 'angry+scared'),
    ('stageshow', 'mix', '要上台表演啦，你开心又怕忘动作', 'happy+scared'),
    ('painting', 'face', '你的画被弄坏了', 'sad'),
    ('shoutloud', 'face', '有人对你大喊大叫', 'scared'),
    ('towertop', 'face', '你搭的高塔成功了', 'happy'),
    ('grabtoy', 'face', '玩具被人抢走了', 'angry'),
    ('lostmom', 'face', '迷路找不到妈妈', 'scared'),
    ('rainpicnic', 'face', '期待好久的野餐，早上下起了大雨', 'sad'),
    ('darkhole', 'face', '球滚进黑黑的地下室，你不敢进去捡', 'scared'),
    ('grandma', 'face', '远方的奶奶坐了很久的车，来看你了', 'happy'),
    ('nightnoise', 'face', '半夜轰隆一声响，你从梦里惊醒了', 'scared'),
    ('kitewin', 'face', '风筝掉下来好多次，终于飞上了天', 'happy'),
    ('stepfoot', 'level', '排队时被轻轻踩了一脚', 'l1'),
    ('queuejump', 'level', '有人插队，一下站到了你的前面', 'l2'),
    ('interrupt', 'level', '你说话总是被人打断', 'l3'),
    ('modelcrush', 'level', '有人故意踩坏了你拼好的飞机', 'l4'),
    ('tearbook', 'level', '有人撕了你的故事书还做鬼脸', 'l5'),
    ('puzzlelost', 'mix', '拼图被弄丢了，你又气又想哭', 'angry+sad'),
    ('gradfare', 'mix', '拿到毕业奖状很开心，又舍不得老师', 'happy+sad'),
    ('bigkidpush', 'mix', '有人抢了你的球还推人，你又怕又生气', 'angry+scared'),
    ('legobroke', 'mix', '乐高被踩坏了，你又生气又心疼', 'angry+sad'),
    ('racefirst', 'mix', '明天要比赛了，你开心又怕输', 'happy+scared'),
]
# SPEC-R49 §R4 先验线索表（独立重列）
LEVEL_CUE = {'l1': ['不小心', '轻轻'], 'l2': ['抢走', '插队'], 'l3': ['一直', '总是'],
             'l4': ['故意'], 'l5': ['还笑', '做鬼脸']}
MIX_CUE = {'happy': ['开心', '高兴', '喜欢'], 'angry': ['生气', '气得', '又气', '很气'],
           'sad': ['难过', '伤心', '舍不得', '想哭', '掉眼泪', '心疼'],
           'scared': ['害怕', '怕', '担心', '吓']}


def _u32(x):
    return x & 0xFFFFFFFF


def mulberry32(a):
    """与 JS Math.imul 位级同源（32 位截断乘/加法回绕/无符号位移）"""
    a = _u32(a)
    while True:
        a = _u32(a + 0x6D2B79F5)
        t = _u32((a ^ (a >> 15)) * (1 | a))
        t = _u32(t + _u32((t ^ (t >> 7)) * (61 | t)) ^ t)
        yield ((t ^ (t >> 14)) >> 0) / 4294967296.0


def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(next(rnd) * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a


def ri(rnd, lo, hi):
    return lo + int(next(rnd) * (hi - lo + 1))


def pool_of(kind):
    return {'face': FACES, 'level': LEVELS, 'mix': MIXES}[kind]


def build_quiz(row, picks_order):
    scene, kind, text, ans = QUESTIONS[row]
    return {'row': row, 'scene': scene, 'kind': kind, 'text': text, 'say': text,
            'sayKey': 'etm_sc_' + scene, 'picks': picks_order,
            'answer': picks_order.index(ans), '_miss': 0, '_answered': False}


def pick_rows(dch, rnd):
    pool = list(POOL_ROWS[dch])
    out = []
    for _ in range(CH_LEN):
        out.append(pool.pop(ri(rnd, 0, len(pool) - 1)))
    return out


def gen_level(flat):
    ch = flat // CH_LEN + 1
    dch0 = (ch - 1) % 4 + 1
    lv = flat % CH_LEN
    rnd = mulberry32(flat * 7919 + 867)      # SPEC-R49 §R3：seed 867 承基线
    dch = dch0 if flat < STATIC_LEVELS else ri(rnd, 1, 4)
    if flat < STATIC_LEVELS:
        base = (dch - 1) * 5
        rows = [base + (lv + k) % 5 for k in range(CH_LEN)]
    else:
        rows = pick_rows(dch, rnd)
    quizzes = [build_quiz(rows[qi], shuffled(pool_of(QUESTIONS[rows[qi]][1]), rnd))
               for qi in range(CH_LEN)]
    return {'flat': flat, 'ch': ch, 'dch': dch, 'lv': lv, 'quizzes': quizzes}


FIELDS = ['row', 'scene', 'kind', 'text', 'say', 'sayKey', 'picks', 'answer', '_miss', '_answered']


def main():
    src = json.loads((HERE / '_r49_post_full.json').read_text(encoding='utf-8'))
    identical = 0
    diffs = []
    for f in range(60):
        L = gen_level(f)
        exp = src[str(f)]
        ok = (L['ch'] == exp['ch'] and L['dch'] == exp['dch'] and L['lv'] == exp['lv'] and
              len(L['quizzes']) == len(exp['qs']) and
              all(all(a.get(k_) == b.get(k_) for k_ in FIELDS)
                  for a, b in zip(L['quizzes'], exp['qs'])))
        if ok:
            identical += 1
        else:
            diffs.append(f)
    print('PYCHECK %d/60 identical' % identical)
    if diffs:
        for f in diffs[:3]:
            py = gen_level(f)
            print(' flat %d py=%s' % (f, json.dumps(py['quizzes'][0], ensure_ascii=False)[:200]))
            print('        js=%s' % json.dumps(src[str(f)]['qs'][0], ensure_ascii=False)[:200])
        raise SystemExit(1)

    # ---- flat0-4 教学锚：与 baseline 逐字段对账（谱保留实证） ----
    base = json.loads((HERE / '_r49_baseline.json').read_text(encoding='utf-8'))
    anchor_bad = []
    for f in range(5):
        for qi in range(CH_LEN):
            py = gen_level(f)['quizzes'][qi]
            b = base[str(f)]['qs'][qi]
            proj = {'kind': py['kind'], 'scene': py['scene'], 'ans': py['picks'][py['answer']],
                    'answer': py['answer'], 'picks': py['picks']}
            if proj != b:
                anchor_bad.append((f, qi))
    print('ANCHOR flat0-4 baseline-identical: %s (bad=%s)' % (not anchor_bad, anchor_bad[:3]))
    if anchor_bad:
        raise SystemExit(2)

    # ---- 谱面先验自证（从 SPEC 文字推导，非抄观测） ----
    # 静态章程域：flat f<20 章 ch=f//5+1，每题 row 落 (ch-1)*5..ch*5-1
    bad_static = [f for f in range(20)
                  for L in [gen_level(f)]
                  if L['dch'] != f // 5 + 1 or
                     any(not ((L['dch'] - 1) * 5 <= q['row'] < L['dch'] * 5) for q in L['quizzes'])]
    # 生成关池域：每题 row 落 POOL_ROWS[dch] 两区间之一；同关 5 题互异
    bad_gen = []
    for f in range(20, 60):
        L = gen_level(f)
        rows = [q['row'] for q in L['quizzes']]
        if len(set(rows)) != 5:
            bad_gen.append((f, 'dup'))
        for r in rows:
            if r not in POOL_ROWS[L['dch']]:
                bad_gen.append((f, 'pool %d dch%d' % (r, L['dch'])))
        if any(QUESTIONS[q['row']][1] != KIND_OF_DCH[L['dch']] for q in L['quizzes']):
            bad_gen.append((f, 'kind'))
    # 先验线索律：level 每题恰含本档签名线索；mix 每题恰含组合两情绪零第三情绪
    cue_bad = []
    for i, (scene, kind, text, ans) in enumerate(QUESTIONS):
        if kind == 'level':
            hits = [k for k, cs in LEVEL_CUE.items() if any(c in text for c in cs)]
            if hits != [ans]:
                cue_bad.append((i, 'level', hits))
        elif kind == 'mix':
            want = set(ans.split('+'))
            cued = set(e for e, cs in MIX_CUE.items() if any(c in text for c in cs))
            if cued != want:
                cue_bad.append((i, 'mix', sorted(cued)))
    # 族分布律：face 各情绪 ≥3（20 题）/level 各档恰 2（10 题）/mix 各组合 ≥2（10 题）
    face_cnt, lv_cnt, mix_cnt = {}, {}, {}
    for _, kind, _, ans in QUESTIONS:
        m = {'face': face_cnt, 'level': lv_cnt, 'mix': mix_cnt}[kind]
        m[ans] = m.get(ans, 0) + 1
    dist_bad = ([f for f in FACES if face_cnt.get(f, 0) < 3] +
                [l for l in LEVELS if lv_cnt.get(l, 0) != 2] +
                [m for m in MIXES if mix_cnt.get(m, 0) < 2])
    # 题表字数口径：6-17 字（estMs=字数×345+600 → 2670-6465）
    lens = [len(t) for _, _, t, _ in QUESTIONS]
    len_bad = min(lens) != 6 or max(lens) != 17
    print('LAW static-bad=%s gen-bad=%s cue-bad=%s dist-bad=%s len-range=%d-%d(ok=%s)' %
          (bad_static[:3], bad_gen[:3], cue_bad[:3], dist_bad, min(lens), max(lens), not len_bad))
    if bad_static or bad_gen or cue_bad or dist_bad or len_bad:
        raise SystemExit(3)
    print('PYCHECK PASS ALL (60 关位级对拍+锚面+先验+分布+字数)')


if __name__ == '__main__':
    main()
