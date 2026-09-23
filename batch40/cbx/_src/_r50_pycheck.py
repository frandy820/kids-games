# -*- coding: utf-8 -*-
"""r50 Python 独立复算（r33/r44/r49 范式）：按 SPEC-R50-CBX §R3 生成律 Python 实现
mulberry32（32 位截断乘/全程 &0xFFFFFFFF）/shuffled/ri，60 关 genLevel 全字段
（scene/emo/say/sayKey/prop/picks/answer）与页内提取的 _r50_post.json 逐关逐题
位级对拍。断言从 SPEC-R50 §R2/§R3 文字推导（独立重列封闭表+类表），禁抄
game-core.js/game-data.js 实现。
另含：
- 锚面保留核验：rows0 教学锚（scene0 say/good/bad 与 _r50_baseline.json 一致）+
  20 题情境句/emo/good 与 baseline 全一致（r50 只加 fair 列不动 say/good/bad/neutral）
- 谱变化声明核验：静态 20 关+生成 40 关 picks 谱 vs baseline 全刷新（三元组
  shuffle 每题多耗 1 个 rnd → 后续 shuffle 全变——SPEC §R11 声明的独立实证）
- fair 四律（∈好池/≠good/类互异/同章互异+全局每张恰 4 次）
- 恒三选（60 关 300 题全 3 卡）+答案位分布三桶 ≥46（期望 200/3−3σ 推导值）
- ch1-2 含 bad 无 neutral / ch3-4 含 neutral 无 bad（档位互斥）
用法: python _r50_pycheck.py"""
import io, json, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path

HERE = Path(__file__).resolve().parent
CH_LEN = 5
STATIC_LEVELS = 20
SEED = 897                      # SPEC-BATCH40 §0：本款常量 897（r50 承用不改）

# SPEC-R50 §R2 封闭表（独立重列——禁抄 game-data.js）
GOOD = ['breath', 'countten', 'hugbunny', 'sayout', 'drinkwater']
BAD = ['throw', 'shout', 'hit', 'tear']
NEUTRAL = ['cryonly', 'hide']
PROP_OF = ['blocks', 'brush', 'queue', 'car', 'medal',
           'balloon', 'letter', 'paper', 'fish', 'umbrella',
           'moon', 'cloud', 'lamp', 'tooth', 'dog',
           'shoe', 'rope', 'puzzle', 'pencil', 'bike']
# SPEC-R50 §R2 类表：A 降温/B 安抚/C 表达（fair 类互异锚）
KIND_CLASS = {'breath': 'A', 'countten': 'A', 'hugbunny': 'B', 'drinkwater': 'B', 'sayout': 'C'}
# 20 题全表（scene: (emo, say, good, fair, third)）——third=bad(ch1-2)/neutral(ch3-4)
SCENES = [
    ('angry', '弟弟推倒你的积木，你好生气', 'breath', 'drinkwater', ('bad', 'throw')),
    ('angry', '同学抢走你的画笔，你气坏了', 'countten', 'sayout', ('bad', 'hit')),
    ('angry', '排队时有人插队，气鼓鼓的', 'sayout', 'hugbunny', ('bad', 'shout')),
    ('angry', '妹妹弄坏你的小车，好想发火', 'drinkwater', 'countten', ('bad', 'tear')),
    ('angry', '游戏输了，你气得直跺脚', 'hugbunny', 'breath', ('bad', 'shout')),
    ('sad', '心爱的气球飞走了，你好难过', 'breath', 'hugbunny', ('bad', 'tear')),
    ('sad', '好朋友转学了，你好难过', 'hugbunny', 'countten', ('bad', 'shout')),
    ('sad', '画好的画弄脏了，你很难过', 'drinkwater', 'sayout', ('bad', 'throw')),
    ('sad', '小金鱼不动了，你心里难过', 'sayout', 'breath', ('bad', 'hit')),
    ('sad', '下雨天去不了公园，好难过', 'countten', 'drinkwater', ('bad', 'tear')),
    ('fear', '半夜听到怪声音，你有点害怕', 'breath', 'hugbunny', ('neutral', 'hide')),
    ('fear', '打雷声好响，你吓得发抖', 'hugbunny', 'countten', ('neutral', 'hide')),
    ('fear', '房间黑黑的，你不敢进去', 'sayout', 'breath', ('neutral', 'hide')),
    ('fear', '看牙医的时候，你心里害怕', 'countten', 'drinkwater', ('neutral', 'cryonly')),
    ('fear', '大狗汪汪叫，你吓得后退', 'drinkwater', 'sayout', ('neutral', 'cryonly')),
    ('frus', '鞋带总系不好，你好灰心', 'breath', 'sayout', ('neutral', 'cryonly')),
    ('frus', '跳绳总绊脚，你有点泄气', 'countten', 'drinkwater', ('neutral', 'cryonly')),
    ('frus', '拼图好难，你拼得直叹气', 'hugbunny', 'breath', ('neutral', 'hide')),
    ('frus', '写的字歪歪扭扭，你好泄气', 'sayout', 'hugbunny', ('neutral', 'cryonly')),
    ('frus', '学骑车总摔倒，你灰心了', 'drinkwater', 'countten', ('neutral', 'hide')),
]


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


def build_quiz(scene, rnd):
    emo, say, good, fair, third = SCENES[scene]
    ids = [good, fair, third[1]]
    picks = shuffled(ids, rnd)
    return {'scene': scene, 'emo': emo, 'say': say, 'sayKey': 'cbx_sc_' + str(scene + 1),
            'prop': PROP_OF[scene], 'picks': picks, 'answer': picks.index(good),
            '_miss': 0, '_answered': False}


def gen_level(flat):
    ch = flat // CH_LEN + 1
    dch0 = (ch - 1) % 4 + 1
    lv = flat % CH_LEN
    rnd = mulberry32(flat * 7919 + SEED)
    dch = dch0 if flat < STATIC_LEVELS else ri(rnd, 1, 4)
    base = (dch - 1) * 5
    rows = [base + (lv + k) % 5 for k in range(CH_LEN)]   # N1：章池 rotate
    quizzes = [build_quiz(rows[qi], rnd) for qi in range(CH_LEN)]
    return {'flat': flat, 'ch': ch, 'dch': dch, 'lv': lv, 'quizzes': quizzes}


FIELDS = ['scene', 'emo', 'say', 'sayKey', 'prop', 'picks', 'answer']   # 提取面字段（ans/n 为提取器派生列不入对拍）


def main():
    src = json.loads((HERE / '_r50_post.json').read_text(encoding='utf-8'))
    base = json.loads((HERE / '_r50_baseline.json').read_text(encoding='utf-8'))

    # ---- 60 关位级对拍 ----
    identical, diffs = 0, []
    for f in range(60):
        L = gen_level(f)
        exp = src[str(f)]
        ok = (L['ch'] == exp['ch'] and L['dch'] == exp['dch'] and L['lv'] == exp['lv'] and
              len(L['quizzes']) == len(exp['qs']) and
              all(all(a.get(k) == b.get(k) for k in FIELDS)
                  for a, b in zip(L['quizzes'], exp['qs'])))
        if ok:
            identical += 1
        else:
            diffs.append(f)
    print('PYCHECK %d/60 identical' % identical)
    if diffs:
        py = gen_level(diffs[0])
        print(' flat %d py=%s' % (diffs[0], json.dumps(py['quizzes'][0], ensure_ascii=False)[:180]))
        print('        js=%s' % json.dumps(src[str(diffs[0])]['qs'][0], ensure_ascii=False)[:180])
        raise SystemExit(1)

    # ---- 锚面保留核验：20 题行级锚（say/emo/good/bad|neutral）与 baseline 逐题一致 ----
    anchor_bad = []
    for i, (emo, say, good, fair, third) in enumerate(SCENES):
        # baseline 每关只含 5 题；逐题定位：在 baseline 60 关中找 scene==i 的题
        b_q = None
        for f in range(60):
            for q in base[str(f)]['qs']:
                if q['scene'] == i:
                    b_q = q
                    break
            if b_q:
                break
        if not b_q:
            anchor_bad.append((i, 'missing in baseline'))
            continue
        # baseline 第三张=旧口径 bad(ch1-2)/bad+neutral(ch3-4)——r50 third 保留同 id？
        # ch1-2：旧 [good,bad] 的 bad 须 == r50 third.bad；ch3-4：旧 neutral 须 == r50 third.neutral
        old_thirds = [p for p in b_q['picks'] if p != b_q['ans']]
        want_third = third[1]
        if want_third not in old_thirds:
            anchor_bad.append((i, 'third %s not in baseline picks %s' % (want_third, old_thirds)))
        if b_q['ans'] != good:
            anchor_bad.append((i, 'good %s != baseline %s' % (good, b_q['ans'])))
        if b_q['say'] != say or b_q['emo'] != emo:
            anchor_bad.append((i, 'say/emo'))
    print('ANCHOR 20 题行级锚（say/emo/good/第三张 id）baseline 一致: %s (bad=%s)'
          % (not anchor_bad, anchor_bad[:3]))
    if anchor_bad:
        raise SystemExit(2)

    # ---- 谱变化声明核验：picks 序列 vs baseline 全刷新（rnd 流变化实证）----
    same_picks = sum(1 for f in range(60)
                     for a, b in zip(src[str(f)]['qs'], base[str(f)]['qs'])
                     if a['picks'] == b['picks'])
    print('SPECTRUM picks 与 baseline 完全相同题数: %d/300（期望 0=全刷新；同值偶合可容 ≤10）'
          % same_picks)
    if same_picks > 10:
        raise SystemExit(3)

    # ---- fair 四律（SPEC-R50 §R2）----
    fair_bad = []
    for i, (emo, say, good, fair, third) in enumerate(SCENES):
        if fair not in GOOD or fair == good:
            fair_bad.append((i, 'pool/eq'))
        if KIND_CLASS[fair] == KIND_CLASS[good]:
            fair_bad.append((i, 'class'))
        if fair == third[1]:
            fair_bad.append((i, 'third-eq'))
    for c in range(4):
        fairs = [SCENES[c * 5 + k][3] for k in range(5)]
        if len(set(fairs)) != 5:
            fair_bad.append((c + 1, 'chDup'))
    fair_cnt = {}
    for row in SCENES:
        fair_cnt[row[3]] = fair_cnt.get(row[3], 0) + 1
    if sorted(fair_cnt.values()) != [4, 4, 4, 4, 4] or len(fair_cnt) != 5:
        fair_bad.append(('dist', fair_cnt))
    print('FAIR 四律（好池/≠good/类互异/同章互异+每张恰 4 次）: %s (bad=%s)'
          % (not fair_bad, fair_bad[:3]))
    if fair_bad:
        raise SystemExit(4)

    # ---- 档位互斥+恒三选+答案位分布 ----
    n_bad = 0
    pos_cnt = {0: 0, 1: 0, 2: 0}
    for f in range(60):
        L = gen_level(f)
        for q in L['quizzes']:
            if len(q['picks']) != 3:
                n_bad += 1
            emo, say, good, fair, third = SCENES[q['scene']]
            has_bad = 'throw' in q['picks'] or 'shout' in q['picks'] or 'hit' in q['picks'] or 'tear' in q['picks']
            has_neu = 'cryonly' in q['picks'] or 'hide' in q['picks']
            low = q['scene'] < 10
            if (low and not has_bad) or ((not low) and not has_neu) or (low and has_neu) or ((not low) and has_bad):
                n_bad += 1
            pos_cnt[q['answer']] += 1
    print('LEVEL 恒三选+档位互斥（ch1-2 含 bad 无 neutral/ch3-4 反之）: %s (bad=%d)'
          % (n_bad == 0, n_bad))
    # 300 题（60 关×5）三桶：期望 300/3=100、σ=√(300·⅓·⅔)≈8.2，下界=100−3σ≈75（独立推导；
    # verify ⑧ 同律 200 题口径下界 46——两处口径差异=SPECTRUM 覆盖面差异，各自闭环）
    print('ansPos 三桶:', pos_cnt, '（下界 75=300/3-3σ 独立推导）')
    if n_bad or any(v < 75 for v in pos_cnt.values()) or sum(pos_cnt.values()) != 300:
        raise SystemExit(5)

    print('PYCHECK PASS ALL（60 关位级对拍+锚面保留+谱刷新实证+fair 四律+档位+分布）')


if __name__ == '__main__':
    main()
