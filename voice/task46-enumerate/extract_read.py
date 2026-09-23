# -*- coding: utf-8 -*-
"""Task#46 阶段1 — read 正文封闭全集枚举（零手抄：词表正则提取 + 模板逻辑照抄 game-core.js genCh1-4）
产物: keys_read.json（{key: {"text":..., "games":["read"]}}），供 voice/gen_clips.py 读入注册。
模板真值源: batch16/read/_src/game-core.js L36-188（genCh1/genCh2/genCh3/genCh4/mkCh4）
词表真值源: batch16/read/_src/game-data.js L41-77（WORDS/QUANT/VERB/PLACE_ACT）
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))          # kids-games/
DATA = os.path.join(ROOT, 'batch16', 'read', '_src', 'game-data.js')
OUT = os.path.join(HERE, 'keys_read.json')

src = open(DATA, encoding='utf-8').read()
# WORDS: rabbit: { cn: '小兔子', key: 'rd_w_rabbit' }
WORDS = dict(re.findall(r"^  (\w+):\s*\{\s*cn:\s*'([^']+)',", src, re.M))
assert len(WORDS) == 23, 'WORDS 提取应 23 词: %d' % len(WORDS)
QUANT = re.search(r"const QUANT = \{([^}]+)\}", src).group(1)
QUANT = dict(re.findall(r"(\w+):\s*'([^']+)'", QUANT))
assert len(QUANT) == 6, 'QUANT 提取异常'
VERB = re.search(r"const VERB = \{([^}]+)\}", src).group(1)
VERB = dict(re.findall(r"(\w+):\s*'([^']+)'", VERB))
PLACE_ACT = re.search(r"const PLACE_ACT = \{([^}]+)\}", src).group(1)
PLACE_ACT = dict(re.findall(r"(\w+):\s*'([^']+)'", PLACE_ACT))
assert len(PLACE_ACT) == 5, 'PLACE_ACT 提取异常'

W = WORDS
ITEMS = ['carrot', 'book', 'boots', 'hat', 'kite', 'umbrella']
COLORS = ['red', 'blue', 'green', 'yellow']
PLACES5 = ['park', 'river', 'school', 'shop', 'yard']
PALS = ['cat', 'bear']

m = {}

# ---- ch1（genCh1：句0 小兔子物品 6×4；句1/句2 伙伴持物 pal×物品×色）----
for it in ITEMS:
    for c in COLORS:
        m['rd_s_c1s0_%s_%s' % (it, c)] = '小兔子有一' + QUANT[it] + W[c] + '的' + W[it] + '，可喜欢它啦。'
for pal in PALS:
    for it in ITEMS:
        for c in COLORS:
            m['rd_s_c1s1_%s_%s_%s' % (pal, it, c)] = W[pal] + VERB[it] + '一' + QUANT[it] + W[c] + '的' + W[it] + '，好看极了。'
            m['rd_s_c1s2_%s_%s_%s' % (pal, it, c)] = W[pal] + VERB[it] + '一' + QUANT[it] + W[c] + '的' + W[it] + '，也很漂亮。'

# ---- ch2（genCh2：句0/1 地点模板 5 各；句2 固定）----
for pl in PLACES5:
    m['rd_s_c2a_%s' % pl] = '早上，小兔子先去' + W[pl] + PLACE_ACT[pl] + '。'
    m['rd_s_c2b_%s' % pl] = '玩了一会儿，然后又去' + W[pl] + PLACE_ACT[pl] + '。'
m['rd_s_c2c'] = '最后，小兔子回到家里吃点心。'

# ---- ch3（genCh3 三型）----
for pl in ('park', 'yard', 'river'):
    m['rd_s_c3t1a_%s' % pl] = '小兔子和小猫在' + W[pl] + '放风筝，玩得正开心。'
m['rd_s_c3t1b'] = '天上飘来一大片乌云，把太阳遮住了。'
m['rd_s_c3t1c'] = '天一下子变暗了，快要下雨啦。'
for it in ('kite', 'hat', 'umbrella', 'book'):
    m['rd_s_c3t2a_%s' % it] = '小兔子心爱的' + W[it] + '被大风吹到了高高的树上。'
m['rd_s_c3t2b'] = '它跳了好多次，都够不着。'
for pl in ('park', 'yard', 'river', 'school'):
    m['rd_s_c3t2c_%s' % pl] = '小兔子很不高兴，坐在' + W[pl] + '的草地上。'
for pl in ('park', 'yard', 'river'):
    m['rd_s_c3t3a_%s' % pl] = '小兔子在' + W[pl] + '玩，玩得真开心。'
m['rd_s_c3t3b'] = '天上的乌云越来越多，快要下雨啦。'
m['rd_s_c3t3c'] = '小兔子赶快跑回家躲雨去。'

# ---- ch4a（genCh4 q4a：p0×物品 掉地；p0 道谢；固定尾句）----
for pal in PALS:
    for it in ('book', 'carrot'):
        m['rd_s_c4a0_%s_%s' % (pal, it)] = W[pal] + '手里的' + W[it] + '掉到了地上，小兔子帮忙捡了起来。'
    m['rd_s_c4a1_%s' % pal] = W[pal] + '高兴地说：谢谢你！'
m['rd_s_c4a2'] = '小兔子笑了，心里' + W['happy'] + '极了。'

# ---- ch4b（四情节）----
for pal in PALS:
    m['rd_s_c4b1a_%s' % pal] = '放学啦，小兔子在操场等' + W[pal] + '一起回家。'
    m['rd_s_c4b1b_%s' % pal] = '等了好久' + W[pal] + '都没有来。'
m['rd_s_c4b1c'] = '小兔子心里' + W['worried'] + '极了，要不要去找老师呢。'
for it in ('kite', 'umbrella'):
    m['rd_s_c4b2a_%s' % it] = '小兔子心爱的' + W[it] + '坏了，再也不能玩了。'
m['rd_s_c4b2b'] = '它低着头坐在公园的草地上。'
m['rd_s_c4b2c'] = '小兔子心里' + W['sad'] + '极了，眼睛都湿了。'
for pal in PALS:
    m['rd_s_c4b3a_%s' % pal] = W[pal] + '送了小兔子一本崭新的' + W['book'] + '，这正是它最想要的礼物。'
m['rd_s_c4b3b'] = '小兔子心里' + W['happy'] + '极了，抱着' + W['book'] + '蹦蹦跳。'
for pal in PALS:
    for it in ('kite', 'hat'):
        m['rd_s_c4b4a_%s_%s' % (pal, it)] = W[pal] + '不小心把小兔子的' + W[it] + '弄坏了，马上说了对不起。'
m['rd_s_c4b4b'] = '可是小兔子心里还是' + W['angry'] + '极了，嘴巴翘得高高的。'

# ---- 对账断言（模板句数 = 120 + 11 + 19 + 24 = 174）----
assert len(m) == 174, 'read 正文封闭全集应 174 句: %d' % len(m)

json.dump({k: {'text': t, 'games': ['read']} for k, t in m.items()},
          open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('keys_read.json: %d keys' % len(m))
