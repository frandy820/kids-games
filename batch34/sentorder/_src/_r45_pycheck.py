# -*- coding: utf-8 -*-
"""r45 pycheck 独立复验（SPEC-R45 §R10④/§R11；期望值从 SPEC 推导禁抄实现观测）：
① Python 位级复刻 mulberry32 + 滑窗取句 (lv*2+qi)%10 + 恒等拒入重洗 → 对账
   _r45_post.json（flat0-59 全 60 关 300 题逐字段：ch/dch/lv/words/text/opts 序）
② flat0 与 _r45_baseline.json 锚定对账（JSON 序列化逐字节相等——锚面铁律 §R0）
③ flat0-19 每章 10 句全覆盖（滑窗五窗 [0-4][2-6][4-8][6-0][8-2] 并集=10 推导）
④ 恒等拒入零违例（flat0-59 dch>=3 词卡相对序恒等=0——§R3）
⑤ 首正确卡位 idx==0 计数 >= N/8（均匀洗牌期望下界 1/池N>=1/8——r39-bis 分布断言纪律）
⑥ 近对词 4 词谱全现（dist 封闭+句子可达 ⇒ 恒真，计数>=1 复核）
用法: python batch34/sentorder/_src/_r45_pycheck.py"""
import io, json, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path

HERE = Path(__file__).resolve().parent

# ---- SPEC-R45 §R4 句库封闭表（40 条独立硬编码——与 build.py/verify 双录对账，禁抄页面）----
SPEC = [  # (章, 词序真值 w, dist)
    (1, ['小兔子', '吃', '萝卜'], []), (1, ['小猫', '钓', '鱼'], []), (1, ['小狗', '啃', '骨头'], []),
    (1, ['小鸡', '吃', '米'], []), (1, ['小熊', '喝', '牛奶'], []),
    (1, ['妈妈', '洗', '衣服'], []), (1, ['爸爸', '看', '报纸'], []), (1, ['哥哥', '搭', '积木'], []),
    (1, ['妹妹', '踢', '毽子'], []), (1, ['老师', '讲', '故事'], []),
    (2, ['小鱼', '在', '水里', '游'], ['石头', '帽子']), (2, ['小鸟', '在', '树上', '唱'], ['雨伞', '书包']),
    (2, ['小狗', '在', '门口', '坐'], ['灯', '星星']), (2, ['小马', '在', '草地', '跑'], ['桌子', '雨伞']),
    (2, ['小鸡', '在', '窝里', '叫'], ['书包', '月亮']),
    (2, ['妹妹', '在', '屋里', '跳舞'], ['飞机', '灯']), (2, ['爷爷', '在', '公园', '打拳'], ['桌子', '星星']),
    (2, ['天气', '真', '好', '呀'], ['帽子', '汽车']), (2, ['我', '把', '作业', '写完'], ['椅子', '月亮']),
    (2, ['大家', '一起', '做', '操'], ['书包', '太阳']),
    (3, ['小猴子', '在', '树上', '吃', '桃'], ['月亮', '帽子']),
    (3, ['小鸭子', '在', '水里', '捉', '鱼'], ['帽子', '星星']),
    (3, ['小蜜蜂', '在', '花园', '采', '蜜'], ['石头', '灯']),
    (3, ['小兔子', '在', '草地', '上', '跳'], ['书包', '月亮']),
    (3, ['小猫', '用', '爪子', '抓', '球'], ['月亮', '太阳']),
    (3, ['我', '先', '洗手', '再', '吃饭'], ['然后', '月亮']),
    (3, ['四只', '小羊', '在', '坡上', '吃草'], ['坡下', '月亮']),
    (3, ['小猴子', '在', '山下', '爬', '树'], ['山上', '灯']),
    (3, ['小螃蟹', '在', '桥下', '吹', '泡泡'], ['桥上', '星星']),
    (3, ['小猫', '先', '洗脸', '再', '睡觉'], ['然后', '太阳']),
    (4, ['小熊', '吃', '蜂蜜'], ['石头', '书包']), (4, ['小猪', '在', '泥里', '打滚'], ['星星', '灯']),
    (4, ['小朋友', '在', '教室', '读', '书'], ['雨伞', '帽子']),
    (4, ['小鸡', '在', '窝里', '睡觉'], ['石头', '帽子']),
    (4, ['小松鼠', '在', '树上', '藏', '果子'], ['月亮', '汽车']),
    (4, ['我', '扶', '奶奶', '下楼'], ['雨伞', '书包']),
    (4, ['小鸭子', '背', '小鸡', '过河'], ['月亮', '汽车']),
    (4, ['小蝴蝶', '飞', '到', '哪里', '了'], ['石头', '帽子']),
    (4, ['小青蛙', '唱', '得', '真', '棒'], ['飞机', '桌子']),
    (4, ['小猴子', '先', '爬', '树', '再', '摘桃'], ['然后', '书包']),
]
BANK = {c: [{'w': w, 't': ''.join(w), 'dist': d} for cc, w, d in SPEC if cc == c] for c in (1, 2, 3, 4)}
NEAR = ['然后', '山上', '桥上', '坡下']
assert [len(BANK[c]) for c in (1, 2, 3, 4)] == [10, 10, 10, 10]

# ---- 引擎位级复刻（从 game-core 语义独立实现——Math.imul 截断乘/全程 &0xFFFFFFFF）----
def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((a ^ (a >> 15)) * (a | 1)) & 0xFFFFFFFF
        t = ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF) ^ t
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

def gen_level(flat):
    ch = flat // 5 + 1
    lv = flat % 5
    rnd = mulberry32(flat * 7919 + 601)
    dch = ((ch - 1) % 4 + 1) if flat < 20 else ri(rnd, 1, 4)   # 生成关首掷即取
    bank = BANK[dch]
    quizzes = []
    for qi in range(5):
        s = bank[(lv * 2 + qi) % len(bank)]                    # r45 滑窗律 §R2
        d = 0 if dch == 1 else 1 if dch == 2 else 2 if dch == 3 else ri(rnd, 1, 2)
        dist = shuffled(s['dist'], rnd)[:d] if d > 0 else []
        shuf = shuffled(s['w'] + dist, rnd)
        if dch >= 3:                                           # r45 恒等拒入 §R3（<=8 次重洗）
            g = 0
            while g < 8:
                pos = [shuf.index(w) for w in s['w']]
                if not all(pos[k] > pos[k - 1] for k in range(1, len(pos))):
                    break
                g += 1
                shuf = shuffled(s['w'] + dist, rnd)
        quizzes.append({'words': list(s['w']), 'text': s['t'], 'opts': [{'w': w} for w in shuf]})
    return {'flat': flat, 'ch': ch, 'dch': dch, 'lv': lv, 'quizzes': quizzes}

def main():
    post = json.loads((HERE / '_r45_post.json').read_text(encoding='utf-8'))
    base = json.loads((HERE / '_r45_baseline.json').read_text(encoding='utf-8'))
    assert len(post) == 60 and len(base) == 60, '谱文件关数 != 60'
    fails = []

    # ① 位级对账（60 关 300 题逐字段）
    mism = []
    for row in post:
        exp = gen_level(row['flat'])
        if exp != row:
            mism.append(row['flat'])
    if mism:
        fails.append('①位级对账 mismatch@flat %s' % mism[:5])

    # ② flat0 锚面：与基线 JSON 序列化逐字节相等（另报 lv0 窗全等面）
    b0 = json.dumps(base[0], ensure_ascii=False)
    p0 = json.dumps(post[0], ensure_ascii=False)
    if b0 != p0:
        fails.append('②flat0 锚面漂移')
    same_rows = [r['flat'] for r in post
                 if json.dumps(base[r['flat']], ensure_ascii=False) ==
                    json.dumps(r, ensure_ascii=False)]

    # ③ 每章 10 句全覆盖（flat0-19 静态关：ch c = flat (c-1)*5..(c-1)*5+4）
    for c in (1, 2, 3, 4):
        got = set(q['text'] for row in post[(c - 1) * 5:(c - 1) * 5 + 5] for q in row['quizzes'])
        want = set(s['t'] for s in BANK[c])
        if got != want:
            fails.append('③ch%d 句覆盖 %d/10 缺 %s' % (c, len(got), sorted(want - got)[:3]))

    # ④ 恒等拒入零违例（dch>=3 词卡相对序恒等）
    ident_cnt = 0
    for row in post:
        if row['dch'] < 3:
            continue
        for q in row['quizzes']:
            pos = [[o['w'] for o in q['opts']].index(w) for w in q['words']]
            if all(pos[k] > pos[k - 1] for k in range(1, len(pos))):
                ident_cnt += 1
    if ident_cnt:
        fails.append('④恒等违例 %d 题' % ident_cnt)

    # ⑤ 首正确卡位 idx==0 计数 >= N/8（N=300；均匀洗牌 E[idx0]=1/池N>=1/8）
    N = sum(len(r['quizzes']) for r in post)
    idx0 = sum(1 for r in post for q in r['quizzes'] if q['opts'][0]['w'] == q['words'][0])
    if idx0 * 8 < N:
        fails.append('⑤首正确卡位 %d < N/8=%.1f' % (idx0, N / 8))

    # ⑥ 近对词 4 词谱全现（各 >=1）
    near_seen = {nw: sum(1 for r in post for q in r['quizzes'] for o in q['opts'] if o['w'] == nw)
                 for nw in NEAR}
    if any(v < 1 for v in near_seen.values()):
        fails.append('⑥近对词未全现 %s' % near_seen)

    print('pycheck ①位级 60 关 mismatch=%d ②flat0 逐字节=%s（lv0 全等面 flat%s）'
          % (len(mism), 'OK' if b0 == p0 else 'FAIL', same_rows))
    print('pycheck ③每章覆盖 4x10=40 ④恒等违例=%d ⑤idx0=%d>=%d/8=%s ⑥近对全现=%s'
          % (ident_cnt, idx0, N, 'OK' if idx0 * 8 >= N else 'FAIL',
             'OK ' + json.dumps(near_seen, ensure_ascii=False) if all(v >= 1 for v in near_seen.values())
             else 'FAIL ' + json.dumps(near_seen, ensure_ascii=False)))
    if fails:
        print('PYCHECK FAIL:')
        for f in fails:
            print('  -', f)
        sys.exit(1)
    print('PYCHECK PASS (6/6)')

if __name__ == '__main__':
    main()
