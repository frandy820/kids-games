# -*- coding: utf-8 -*-
"""sentorder 句子拼拼乐 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS -> ../index.html
用法: python batch34/sentorder/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch34/sentorder/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# ===== python 侧独立复算 1：句库封闭 40（SPEC-BATCH34 §0.83 + SPEC-R45 §R4 硬编码——禁抄实现，双录对账）
# 元素=(章, 词组, 句条, 干扰表 or None, tp)；ch1 d=0 无干扰表；r45 每章 10 句 = 存量 5 保位 + 新增 5 后缀
# 键稳定律：SENT_ALL = 存量全局序(ch1-4 各前5) ⊕ 新增全局序(ch1-4 各后5)——so_s_1..20/so_w_1..54 零漂移
SPEC_OLD = [
    (1, ['小兔子', '吃', '萝卜'], '小兔子吃萝卜', None, False),
    (1, ['小猫', '钓', '鱼'], '小猫钓鱼', None, False),
    (1, ['小狗', '啃', '骨头'], '小狗啃骨头', None, False),
    (1, ['小鸡', '吃', '米'], '小鸡吃米', None, False),
    (1, ['小熊', '喝', '牛奶'], '小熊喝牛奶', None, False),
    (2, ['小鱼', '在', '水里', '游'], '小鱼在水里游', ['石头', '帽子'], False),
    (2, ['小鸟', '在', '树上', '唱'], '小鸟在树上唱', ['雨伞', '书包'], False),
    (2, ['小狗', '在', '门口', '坐'], '小狗在门口坐', ['灯', '星星'], False),
    (2, ['小马', '在', '草地', '跑'], '小马在草地跑', ['桌子', '雨伞'], False),
    (2, ['小鸡', '在', '窝里', '叫'], '小鸡在窝里叫', ['书包', '月亮'], False),
    (3, ['小猴子', '在', '树上', '吃', '桃'], '小猴子在树上吃桃', ['月亮', '帽子'], False),
    (3, ['小鸭子', '在', '水里', '捉', '鱼'], '小鸭子在水里捉鱼', ['帽子', '星星'], False),
    (3, ['小蜜蜂', '在', '花园', '采', '蜜'], '小蜜蜂在花园采蜜', ['石头', '灯'], False),
    (3, ['小兔子', '在', '草地', '上', '跳'], '小兔子在草地上跳', ['书包', '月亮'], False),
    (3, ['小猫', '用', '爪子', '抓', '球'], '小猫用爪子抓球', ['月亮', '太阳'], False),
    (4, ['小熊', '吃', '蜂蜜'], '小熊吃蜂蜜', ['石头', '书包'], False),
    (4, ['小猪', '在', '泥里', '打滚'], '小猪在泥里打滚', ['星星', '灯'], False),
    (4, ['小朋友', '在', '教室', '读', '书'], '小朋友在教室读书', ['雨伞', '帽子'], False),
    (4, ['小鸡', '在', '窝里', '睡觉'], '小鸡在窝里睡觉', ['石头', '帽子'], False),
    (4, ['小松鼠', '在', '树上', '藏', '果子'], '小松鼠在树上藏果子', ['月亮', '汽车'], False),
]
SPEC_NEW = [
    (1, ['妈妈', '洗', '衣服'], '妈妈洗衣服', None, False),
    (1, ['爸爸', '看', '报纸'], '爸爸看报纸', None, False),
    (1, ['哥哥', '搭', '积木'], '哥哥搭积木', None, False),
    (1, ['妹妹', '踢', '毽子'], '妹妹踢毽子', None, False),
    (1, ['老师', '讲', '故事'], '老师讲故事', None, False),
    (2, ['妹妹', '在', '屋里', '跳舞'], '妹妹在屋里跳舞', ['飞机', '灯'], False),
    (2, ['爷爷', '在', '公园', '打拳'], '爷爷在公园打拳', ['桌子', '星星'], False),
    (2, ['天气', '真', '好', '呀'], '天气真好呀', ['帽子', '汽车'], False),
    (2, ['我', '把', '作业', '写完'], '我把作业写完', ['椅子', '月亮'], False),
    (2, ['大家', '一起', '做', '操'], '大家一起做操', ['书包', '太阳'], False),
    (3, ['我', '先', '洗手', '再', '吃饭'], '我先洗手再吃饭', ['然后', '月亮'], False),
    (3, ['四只', '小羊', '在', '坡上', '吃草'], '四只小羊在坡上吃草', ['坡下', '月亮'], False),
    (3, ['小猴子', '在', '山下', '爬', '树'], '小猴子在山下爬树', ['山上', '灯'], False),
    (3, ['小螃蟹', '在', '桥下', '吹', '泡泡'], '小螃蟹在桥下吹泡泡', ['桥上', '星星'], False),
    (3, ['小猫', '先', '洗脸', '再', '睡觉'], '小猫先洗脸再睡觉', ['然后', '太阳'], False),
    (4, ['我', '扶', '奶奶', '下楼'], '我扶奶奶下楼', ['雨伞', '书包'], True),
    (4, ['小鸭子', '背', '小鸡', '过河'], '小鸭子背小鸡过河', ['月亮', '汽车'], True),
    (4, ['小蝴蝶', '飞', '到', '哪里', '了'], '小蝴蝶飞到哪里了', ['石头', '帽子'], False),
    (4, ['小青蛙', '唱', '得', '真', '棒'], '小青蛙唱得真棒', ['飞机', '桌子'], False),
    (4, ['小猴子', '先', '爬', '树', '再', '摘桃'], '小猴子先爬树再摘桃', ['然后', '书包'], True),
]
SPEC_SENTS = SPEC_OLD + SPEC_NEW                      # 全局序 = SENT_ALL 序（旧⊕新）
SPEC_POOL = ['太阳', '月亮', '星星', '石头', '雨伞', '帽子', '书包', '灯', '汽车', '飞机', '桌子', '椅子']
SPEC_NEAR = ['然后', '山上', '桥上', '坡下']          # r45 近对干扰封闭池（SPEC-R45 §R4）
SPEC_TP = ['我扶奶奶下楼', '小鸭子背小鸡过河', '小猴子先爬树再摘桃']   # r45 语义陷阱句（恰 3）
assert len(SPEC_OLD) == 20 and len(SPEC_NEW) == 20, 'SPEC 句数 != 20+20'

def js_arr(lst):
    return '[' + ', '.join("'%s'" % x for x in lst) + ']'

BY_CH = {1: [], 2: [], 3: [], 4: []}
for row in SPEC_SENTS:
    BY_CH[row[0]].append(row)                          # 组内序 = 存量 5 前 + 新增 5 后（保位）
for ch in (1, 2, 3, 4):
    assert len(BY_CH[ch]) == 10, '章 %d 句数 != 10' % ch

# 逐句精确字面对账（词组+句条+干扰表+tp——game-data 的 SENT_BANK 字面）
for ch, words, text, dist, tp in SPEC_SENTS:
    if dist is None:
        seg = '{ w: ' + js_arr(words) + ", t: '" + text + "' }"
    else:
        seg = '{ w: ' + js_arr(words) + ", t: '" + text + "', dist: " + js_arr(dist) + (', tp: 1 }' if tp else ' }')
    assert seg in data, 'game-data SENT_BANK 缺句或字段不符: %s' % text
    assert text == ''.join(words), 'SPEC 句条!=词拼接: %s' % text
    assert len(set(words)) == len(words), 'SPEC 句内词重复: %s' % text
    if ch == 1:
        assert len(words) == 3, 'ch1 句长!=3: %s' % text
    elif ch == 2:
        assert len(words) == 4, 'ch2 句长!=4: %s' % text
    elif ch == 3:
        assert len(words) == 5, 'ch3 句长!=5: %s' % text
    else:
        assert 3 <= len(words) <= 6, 'ch4 句长域 3-6: %s' % text
    if dist is not None:
        assert len(dist) == 2, 'dist 表恒 2 词: %s' % text
        for w in dist:
            assert w in SPEC_POOL or w in SPEC_NEAR, '干扰词不在封闭池(远域∪近对): %s (%s)' % (w, text)
            assert w not in words, '干扰词撞本句词: %s (%s)' % (w, text)
# r45 难度谱位断言（§R1/§R4）：ch2 全远域（起步下限不动）；ch3 新增句 dist[0]∈近对；tp 恰 3 句落 ch4 新增
for ch, words, text, dist, tp in BY_CH[2]:
    if dist:
        assert all(w in SPEC_POOL for w in dist), 'ch2 须全远域（下限不动）: %s' % text
for ch, words, text, dist, tp in BY_CH[3][5:]:
    assert dist and dist[0] in SPEC_NEAR, 'ch3 新增句 dist[0] 须∈近对池: %s' % text
tp_texts = [t for c, w, t, d, tp in SPEC_SENTS if tp]
assert tp_texts == SPEC_TP, 'tp 句表不符: %s' % tp_texts
all_sent_words = set(w for _, ws, _, _, _ in SPEC_SENTS for w in ws)
for nw in SPEC_NEAR:
    assert nw not in all_sent_words, '近对词 %s 不得为任何句内词（wrong_word 字面恒真前提）' % nw
# ch4 句长混合断言（存量 3/4/4/5/5 + 新增 4/4/5/5/6——r45 六词句上探）
ch4_lens = sorted(len(w) for c, w, t, d, tp in SPEC_SENTS if c == 4)
assert ch4_lens == [3, 4, 4, 4, 4, 5, 5, 5, 5, 6], 'ch4 句长混合 != [3,4,4,4,4,5,5,5,5,6]: %s' % ch4_lens
# 干扰词全局池对账（game-data DIST_POOL/NEAR_POOL 字面）
pool_lit = 'const DIST_POOL = ' + js_arr(SPEC_POOL) + ';'
near_lit = 'const NEAR_POOL = ' + js_arr(SPEC_NEAR) + ';'
assert pool_lit in data, 'game-data DIST_POOL 与 SPEC 全局池不符'
assert near_lit in data, 'game-data NEAR_POOL 与 SPEC 近对池不符'
max_chars = max(len(t) for _, _, t, _, _ in SPEC_SENTS)
assert max_chars == 9, '句库 max 字符 != 9: %d' % max_chars
max_word = max(len(w) for _, ws, _, _, _ in SPEC_SENTS for w in ws)
assert max_word == 3, '词 max 字数 != 3: %d' % max_word
# 键稳定律对账：SENT_ALL 枚举序 → 句键 40（句条唯一）/ 词键 116（存量 54 零漂移 + 新增 62）
assert 'const SENT_OLD = [1, 2, 3, 4].reduce' in data, 'data 缺 SENT_OLD 存量序枚举（键稳定律）'
assert 'const SENT_ALL = SENT_OLD.concat(SENT_NEW);' in data, 'data 缺 SENT_ALL 拼接（键稳定律）'
assert len(set(t for _, _, t, _, _ in SPEC_SENTS)) == 40, '句条唯一性（40 句键域）'
def _word_first(rows):
    seq, seen = [], set()
    for _, ws, _, _, _ in rows:
        for w in ws:
            if w not in seen:
                seen.add(w); seq.append(w)
    return seq
assert len(_word_first(SPEC_OLD)) == 54, '存量词键 != 54（so_w_1..54 零漂移）: %d' % len(_word_first(SPEC_OLD))
assert len(_word_first(SPEC_SENTS)) == 116, '词键总数 != 116（so_w_1..116）: %d' % len(_word_first(SPEC_SENTS))
# r45 生成律字面（engine）：滑窗取句 + 词卡相对序恒等拒入（dch>=3）+ 近对池检查
assert 'bank[(lv * 2 + qi) % bank.length]' in engine, 'engine 缺滑窗取句律 (lv*2+qi)%10（§R2）'
assert 'while (g++ < 8 && ident())' in engine, 'engine 缺恒等拒入重洗（§R3）'
assert 'NEAR_POOL.indexOf(c.w) < 0' in engine, 'structWhy 缺近对池检查（§R4 两池）'

# ===== python 侧独立复算 2：语音窗静态断言（家族 G/H/I/T；实长 _clipdur34.json 真值）=====
# T46 化（2026-09-19）：estMs 口径退役——句/词窗全按 clip 实长推导（python 双录，
#    verify SPEC_S_DUR/SPEC_WLEN 同值）
SO_S_DUR = {1: 2112, 2: 1848, 3: 1992, 4: 1848, 5: 2064, 6: 2136, 7: 2256, 8: 2184,
            9: 2256, 10: 2328, 11: 2544, 12: 2592, 13: 2760, 14: 2544, 15: 2496,
            16: 1968, 17: 2352, 18: 2640, 19: 2472, 20: 2952,
            # r45 新增 21-40：2026-09-22 段二已注册——mutagen 实测实长回填（est 3705 口径退役；
            # 真值源 F:/Cache/temp/r456_clip_ms.json；与 verify SPEC_S_DUR 双录同值）
            21: 1968, 22: 1872, 23: 1944, 24: 1968, 25: 2016, 26: 2304, 27: 2376,
            28: 1944, 29: 2040, 30: 2112, 31: 2280, 32: 2904, 33: 2640, 34: 2904,
            35: 2688, 36: 2112, 37: 2616, 38: 2424, 39: 2304, 40: 2880}
SO_S_REG = max(SO_S_DUR[i] for i in range(1, 21))     # 注册实长 worst（存量 s20=2952）
SO_S_WORST = max(SO_S_DUR.values())                   # 段二口径：全 40 句注册实长 worst（新 20 句 worst=2904<s20）
assert SO_S_REG == 2952, 'so_s 注册 worst %d != 2952（表漂移）' % SO_S_REG
assert SO_S_WORST == 2952, 'so_s 全量 worst %d != 2952（段二实测：存量 s20 仍居首）' % SO_S_WORST
# r45 修复轮 m4：PIC 40 幅插图完备断言（tp 句「异义换序由图消解」承载面——
# sentSvg 键缺失静默输出空 svg 无门禁可抓；全 40 键字面在场检查）
_pic_miss = [i for i in range(1, 41) if ('s%d:' % i) not in data]
assert not _pic_miss, 'PIC 缺插图键 s%s（静默空 svg）' % _pic_miss
# 词字数档 worst clip（1字=so_w_50 书 1248 / 2字=1440 / 3字=1704）——表=存量在册档 worst（WORD_WIN 锚定基准）
# 段二实测复核（r456_clip_ms.json，so_w 55-116 实长 1104-1632）：各档新词 worst
#   1字 1224 < 1248 ✓ ／ 2字 1464 > 1440（超 24ms，WORD_WIN[2]=1740 余量 276ms<300 口径——音频
#   1464<窗 1740 无尾截，主线拍板窗不动，差异记录在案 SPEC-R45 §R8）／ 3字 1632 < 1704 ✓
SO_WLEN = {1: 1248, 2: 1440, 3: 1704}
# ===== python 侧独立复算 2b：so_w 55-116 实长断言双录（2026-09-23 维护轮件2——§R14 m3 销账）=====
# SPEC-R45 §R7-bis 逐键表同值双录 + build 时重测 voice/clips/so_w_N.mp3（mutagen 帧长，
# 与段二真值源 r456_clip_ms.json 同口径）±60ms 族内容差对账（容差=测量口径/重编码差异界）。
# 零键变更零重合成：只读 mp3，不触 voice/gen_clips.py 与 manifest。
SO_W_DUR = {55: 1320, 56: 1224, 57: 1368, 58: 1344, 59: 1152, 60: 1392, 61: 1368, 62: 1128,
            63: 1320, 64: 1344, 65: 1176, 66: 1320, 67: 1416, 68: 1128, 69: 1368, 70: 1344,
            71: 1368, 72: 1344, 73: 1368, 74: 1392, 75: 1440, 76: 1128, 77: 1128, 78: 1152,
            79: 1104, 80: 1128, 81: 1392, 82: 1368, 83: 1344, 84: 1440, 85: 1176, 86: 1152,
            87: 1224, 88: 1464, 89: 1128, 90: 1368, 91: 1464, 92: 1392, 93: 1416, 94: 1368,
            95: 1440, 96: 1128, 97: 1224, 98: 1608, 99: 1368, 100: 1176, 101: 1368, 102: 1464,
            103: 1224, 104: 1344, 105: 1440, 106: 1176, 107: 1368, 108: 1584, 109: 1176, 110: 1128,
            111: 1320, 112: 1128, 113: 1632, 114: 1152, 115: 1128, 116: 1392}
SO_W_NEW = _word_first(SPEC_SENTS)[54:]        # 新词 62（键稳定律：SENT_ALL 首现序 so_w_55..116）
assert len(SO_W_NEW) == len(SO_W_DUR) == 62, 'so_w 新词域 62 漂移（键稳定律）'
from mutagen.mp3 import MP3 as _MP3
_wd_bad = []
for _i, _w in enumerate(SO_W_NEW, start=55):
    _f = pathlib.Path(r'F:/claudecode/projects/active/kids-games/voice/clips/so_w_%d.mp3' % _i)
    assert _f.exists(), 'so_w_%d.mp3 缺失（voice/clips）' % _i
    _ms = round(_MP3(str(_f)).info.length * 1000)
    if abs(_ms - SO_W_DUR[_i]) > 60:           # ±60ms 族内口径（SPEC-R45 §R7-bis）
        _wd_bad.append('so_w_%d(%s) %d vs 表 %d' % (_i, _w, _ms, SO_W_DUR[_i]))
assert not _wd_bad, 'so_w 55-116 实测超 ±60ms：' + ';'.join(_wd_bad[:6])
_wl = {}                                        # 各字数档 worst（§R8 复核行推导：1224/1464/1632）
for _i, _w in enumerate(SO_W_NEW, start=55):
    _wl.setdefault(len(_w), []).append(SO_W_DUR[_i])
assert set(_wl) == {1, 2, 3}, 'so_w 新词字数档域漂移 %s' % sorted(_wl)
assert max(_wl[1]) == 1224 and max(_wl[2]) == 1464 and max(_wl[3]) == 1632, \
    'so_w 各档 worst 漂移：%s' % {k: max(v) for k, v in sorted(_wl.items())}
assert max(_wl[2]) < SO_WLEN[2] + 300, '2 字档新词 worst %d ≥ WORD_WIN[2] %d（尾截）' % (
    max(_wl[2]), SO_WLEN[2] + 300)
D_RIGHT, D_ORDER, D_WORD, D_HINT = 2520, 2424, 2784, 2760
D_WATCH, D_TURN = 2952, 1824
# ① 确认链窗（契约 G/H，T46 clip + r45 段二实测口径）：2520+150+max(存量2952,新增2904)+300=5922
#    → done 演出窗 2600+4500=7100（余 1178ms；est 口径 6675 已被实测口径取代——§R8 复核行）
assert "KIDS.voice.queue([VOICE.right.key, sentClipOf(q)])" in main, 'main 缺确认链（right+整句 so_s clip——T46 两段全键）'
assert '2600 * SPEED' in main and '4500 * SPEED' in main, 'main 缺 done 演出窗 7100（2600+4500）'
chain_confirm = D_RIGHT + 150 + SO_S_WORST + 300
assert 2600 + 4500 >= chain_confirm, '确认窗 7100 < 确认链 %d+150+so_s worst %d+300=%d' % (D_RIGHT, SO_S_WORST, chain_confirm)
# ② 词音 fill 窗（T46 字数档 worst clip+300：1548/1740/2004——estMs 1 字档差 3ms 退役）
assert 'await wait(WORD_WIN[w.length] * SPEED)' in main, 'main 缺词音窗 WORD_WIN[len]（T46 字数档）'
assert all(SO_WLEN[n] + 300 <= 2600 + 4500 for n in SO_WLEN), '词音窗 > done 窗（不可能路径，防御断言）'
assert 'WORD_WIN = { 1: 1548, 2: 1740, 3: 2004 }' in data, 'data WORD_WIN 表与 python 双录不一致（T46）'
assert 'KIDS.voice.play(wordClipOf(w), w)' in main, 'main 缺词 clip play（T46 so_w）'
assert 'KIDS.voice.play(sentClipOf(q), q.text)' in main, 'main 缺题面整句 clip play（T46 so_s）'
assert 'const estMs' not in data and 'const estMs' not in main, 'estMs 定义残留（T46 退役——注释提及不禁）'
# ③ 错链豁免窗（家族 I）：两级各算一条链，取 max —— word=2784+150+2760+300=5994
chain_order = D_ORDER + 150 + D_HINT + 300
chain_word = D_WORD + 150 + D_HINT + 300
assert 'wrongChainUntil = Date.now() + 6000' in main, 'main 缺错链豁免窗 wrongChainUntil=6000'
assert 6000 >= max(chain_order, chain_word), '豁免窗 6000 < 两链 max %d' % max(chain_order, chain_word)
for k in ['so_tut_watch', 'so_tut_turn', 'so_hint', 'so_right', 'so_wrong_order', 'so_wrong_word']:
    assert "'%s'" % k in data, 'game-data VOICE 缺 key %s' % k
# ④ 教学演示窗：watch 2952 → 首 tap 延至 t=900+3100=4000 >= 2952+300=3252
assert '900 * SPEED' in main and '3100 * SPEED' in main, 'main 缺教学演示延窗（t=900+3100=4000）'
assert 900 + 3100 >= D_WATCH + 300, '教学演示窗 4000 < so_tut_watch 2952+300=3252'
# ⑤ turn 后读题延 2200 >= 1824+300 防尾截
assert '}, 2200);' in main, 'main 教学 turn 后读题延 2200 缺失（so_tut_turn 1824+300 防尾截）'
assert 2200 >= D_TURN + 300, 'turn 后读题延 2200 < 1824+300=2124'
# ⑥ winFlow celebrate 后补窗 400；错点防重入窗 1000ms
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失'
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ⑦ 题面整句 clip so_s worst 2952+300 < 方向级救援 14s 余量（T46）
assert SO_S_WORST + 300 <= 14000 - 1000, '题面句 clip > 方向级救援间隔余量'
# ⑧ 生成关 dch：SPEC 写死 seeded 随机（mulberry32(flat*7919+601) 首掷 ri(1,4)，无 burn）
assert 'mulberry32(flat * 7919 + 601)' in engine, 'engine 种子 != SPEC §0.83（flat*7919+601）'
assert 'ri(rnd, 1, 4)' in engine, 'engine 生成关 dch 缺 seeded 随机 ri(rnd,1,4)'

# ===== 语音 clips 注入（manifest games 含 sentorder：r45 段二注册后 165 条 = so 6 + so_s 40 + so_w 116 + core 3）
# b33 坑③：clips_js 已按 manifest games 归属注入 core_*——本 build 不手工追加（幂等跳过问题不存在）；
# 若未来需手工补 core，必须 `if '"%s"' % k in clips: continue` 幂等跳过
SO_KEYS = ['so_tut_watch', 'so_tut_turn', 'so_hint', 'so_right', 'so_wrong_order', 'so_wrong_word']
SO_S_KEYS = ['so_s_%d' % i for i in range(1, 41)]                  # T46 存量 20 + r45 段二 20（全注册）
SO_W_KEYS = ['so_w_%d' % i for i in range(1, 117)]                 # T46 存量 54 + r45 段二 62（全注册）
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('sentorder')        # r45 段二：so_ 6 + so_s 40 + so_w 116 + core_ 3 = 165 条
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
for k in SO_KEYS + SO_S_KEYS + SO_W_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 165, 'clips 条数 %d != 165（so 6 + so_s 40 + so_w 116 + core 3——段二注册后）' % n_clips
# r45 段二销账（2026-09-22）：82 新键已注册（manifest 5350→5459，ok=82 fail=0），旧「未注册反断言」
# 已删；实测实长回填 SO_S_DUR（est 口径退役）。禁动 voice/gen_clips.py 与 manifest——注入只读。

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'
assert "const VER = '1.0'" in core, "core.js VER 非 '1.0'（家族 C 存档版本）"

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'sentorder'" in main, 'main 缺 KIDS.init sentorder（存档键 kidsgame_sentorder）'
assert 'window.SO =' in main, 'main 缺 SO 钩子'
assert '__soDemoR' in main, 'main 缺教学演示实证 __soDemoR'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处'
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 F：生成关 hint 实算 genLevel(f+1).dch-1，禁 (ci+1)%4 章序推进（b26 审查 M3）
assert 'genLevel(f + 1).dch - 1' in main, 'nextHint 生成关分支缺实算 genLevel(f+1).dch-1（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b27/b28）
assert 'function rescueTick()' in main, 'rescueTick 必须为命名函数（b28 m4）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'rescueTick 缺面板守卫（家族 K）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 双锚重置 + 仅起播设窗
assert 'if (Date.now() < wrongChainUntil) return;' in main, '救援 interval 缺链豁免守卫（家族 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'startLevel 缺双锚重置（家族 I/J）'
# 家族契约 J：flat>=3 语义句 10s 节流（sayW 分流在场）
assert 'cur.flat < 3' in main and '10000' in main, 'main 缺错反馈 J 节流（flat>=3 10s）'
# 两级错反馈链构成（wrong_x + so_hint 拼播——J 语义句全程保留）
assert "sayW([wrongKey, VOICE.hint.key])" in main, 'main 缺两级错反馈拼播链（wrong_x+hint）'
assert "why === 'order' ? VOICE.wordOrder.key : VOICE.wrongWord.key" in main, 'main 缺两级错因 clip 选择'
# 家族契约 E：教学演示通道豁免门（demo 参数——吞真实输入但不吞演示）
assert 'uiTapWord(i0, true)' in main and '(state.locked && !demo)' in main, '教学 demo 通道缺失（家族 E）'
# 家族契约 N（T46 化）：确认链两段全键（right+so_s clip）——零 keyless 政策
for _n, _f in (('main', main), ('verify', verif)):
    assert 'key: null' not in _f and 'key:null' not in _f, 'game-%s 含 key 空缺带 text 的 TTS 段字面（零 keyless 政策）' % _n
# 家族契约 M：帧内容断言器在 verify（数值/DOM 序/帧内容三层 + 池恒全摆）
for sym in ['domSlots', 'domGone', 'specNext', 'pickedWant']:
    assert sym in verif, 'verify 缺 %s（家族 M 三层断言/独立驱动器）' % sym
# verify 13 单元在场（U( 调用计数——r45 扩容 U13 layout）+ SPEC 独立表（双录对账前提）
n_u = len(re.findall(r"\bU\('", verif))
assert n_u == 13, 'verify U() 单元数 %d != 13' % n_u
for sym in ['SPEC_BANK', 'SPEC_POOL', 'SPEC_NEAR', 'SPEC_TP', 'SPEC_DUR', 'vMul32',
            'SPEC_S_DUR', 'SPEC_WLEN', 'specRelIdent']:
    assert sym in verif, 'verify 缺 SPEC 独立表 %s' % sym
mdur = re.search(r'const SPEC_DUR = \{([^}]+)\}', verif)
dur_vals = dict(re.findall(r"(\w+):\s*(\d+)", mdur.group(1)))
assert dur_vals == {'right': '2520', 'order': '2424', 'word': '2784', 'hint': '2760',
                    'watch': '2952', 'turn': '1824'}, 'SPEC_DUR 与 §4 实长表不符: %s' % dur_vals
# 存档断言单元在场（家族 C）+ 真实路径单元（预置 v1.0）
assert 'kidsgame_sentorder' in verif, 'verify 缺存档键断言（家族 C）'
assert "v: '1.0'" in verif, 'verify 缺预置存档 v1.0（真实路径单元）'
# verify title 协议（初始=游戏名，禁先设 'VERIFY'（gate 判据首轮假触发）；终态 PASS|FAIL）
assert "document.title = 'VERIFY'" not in verif, 'verify 禁初始设 title=VERIFY（gate G1 假触发）'
assert 'VERIFY PASS ' in verif and 'VERIFY FAIL ' in verif, 'verify title 终态协议缺失（b17 坑）'
# 钩子暴露（真实页与 verify 页同源 window.SO——b29 坑⑥：钩子无条件挂）
assert 'window.SO = {' in main and 'get tutorial' in main, 'main 缺 SO 钩子 tutorial getter（gate G2）'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('sents: %d (ch each 10 = old5+new5; ch4 mixed %s) pool=%d+near=%d clips=%d (r45 段二注册后全量 165)' % (
    len(SPEC_SENTS), ch4_lens, len(SPEC_POOL), len(SPEC_NEAR), n_clips))
print('window check (T46 clip + r45 段二实测): confirm-chain %d+150+so_s worst %d+300=%d <= done-win 7100; '
      'wrong-chain max %d <= wrongChainUntil 6000' % (
    D_RIGHT, SO_S_WORST, chain_confirm, max(chain_order, chain_word)))
print('fill word-win WORDLEN worst+300=%s (per char-count); tut 900+3100=4000>=%d; turn 2200>=%d' % (
    {n: SO_WLEN[n] + 300 for n in SO_WLEN}, D_WATCH + 300, D_TURN + 300))
