# -*- coding: utf-8 -*-
"""Phase 0b 区域分配 v2：全量覆盖一上 300 + 生活 100，校验漏/重/避重/分布。
虚词白名单（句子习得，不进新字关目标）：的了是我你在他有和就不啊吧呀嗯啦好很也去还来吗没这着们以"""
import json, sys

SRC = json.load(open('F:/claudecode/projects/active/kids-games/batch42/ziquest/_src/data/chars-source.json', encoding='utf-8'))
G1A, G1B = SRC['g1a_renzi'], set(SRC['g1b_renzi'])

FUNCTION = '的了是我你在他有和就不啊吧呀嗯啦好很也去还来吗没这着们以'

REGIONS = {
    1: '天地日月星云雨风雪山石田土火水江海秋气树叶片春冬夏青莲影黑彩绿蓝白黄红洞亮早晚午昨今年时候看见听对色高闪',
    2: '人你我他它爸妈妹奶哥姐弟叔爷男女口耳目手足站坐头牙皮心穿衣服孩娃儿家好睡',
    3: '鸟虫马鸡牛猫狗鸭鱼蛙乌鸦兔竹禾木林森条花草芽爬尾巴伞发',
    4: '苹果杏桃金给贝',
    5: '上下前后左右里东南西北中远近处旁车路灯走桥台船门开关正反进出工厂医院生回步放住玩找办参加',
    6: '一二三四五六七八九十两字词语句子画棋文数学音乐书包尺作业本笔刀课校桌纸写诗老师升国旗歌用几群',
    7: '打小大可采无声朋友到得快又笑向挂活为许法久全变尖说弯多少只边比谁最长短把公点要过当串成半空问方更那真同什才觉自己飞会个尘从众双明力么美丽立起',
}
LIFE = {
    1: '雾湖岛岸沙季根紫灰棕',
    2: '屋婆伯舅姨宝指肩被餐谢',
    3: '猪鹅龟狮松柏菊梅蜗雀鹤狼狐狸',
    4: '菜粥蛋糖盐油饼饺虾糕蕉梨橘枣葡萄咸辣苦饮克买卖碗筷杯勺袜裤衫帽鞋',
    5: '超市店园街楼梯轮帆骑耍',
    6: '题卷粉算图馆零读名',
    7: '哭梦帮答喝龙客累饿渴拉推猜',
}

rep = open('F:/claudecode/output/ziquest/work/region-check-v2.txt', 'w', encoding='utf-8')
w = rep.write
ok = True

def fail(msg):
    global ok
    ok = False
    w(msg + '\n')

# 一上校验
reg_chars = {r: list(s) for r, s in REGIONS.items()}
for r, cs in reg_chars.items():
    dups = [c for c in set(cs) if cs.count(c) > 1]
    if dups:
        fail('R%d 内部重复: %s' % (r, ''.join(dups)))
    bad = [c for c in cs if c not in set(G1A)]
    if bad:
        fail('R%d 含非一上字: %s' % (r, ''.join(bad)))
fn = [c for c in FUNCTION if c in set(G1A)]
assigned = [c for cs in reg_chars.values() for c in cs]
missing = [c for c in G1A if c not in set(assigned) and c not in fn]
if missing:
    fail('漏分配(非虚词) %d 字: %s' % (len(missing), ''.join(missing)))
extra = [c for c in set(assigned) if c in set(G1A) and assigned.count(c) > 1]
if extra:
    fail('跨区重复: %s' % ''.join(sorted(extra)))

# 生活校验
life_chars = {r: list(s) for r, s in LIFE.items()}
life_all = [c for cs in life_chars.values() for c in cs]
if len(life_all) != 100:
    fail('生活字总数 %d ≠ 100' % len(life_all))
bad = [c for c in life_all if c in set(G1A) or c in G1B]
if bad:
    fail('生活字与课标重叠: %s' % ''.join(bad))
if len(set(life_all)) != len(life_all):
    fail('生活字内部重复: %s' % ''.join([c for c in set(life_all) if life_all.count(c) > 1]))

# 分布
w('\n[分布]\n')
tot_theme = 0
for r in range(1, 8):
    g = [c for c in reg_chars[r] if c not in fn]
    lf = life_chars[r]
    n = len(g) + len(lf)
    tot_theme += n
    w('R%d: 一上%d + 生活%d = %d 字（%.0f 关）\n' % (r, len(g), len(lf), n, n / 5))
w('主题字 %d + 虚词 %d = %d；新字关 = %d 关\n' % (tot_theme, len(fn), tot_theme + len(fn), -(-tot_theme // 5)))
w('\n校验结果: %s\n' % ('ALL PASS' if ok else 'FAIL（见上）'))
rep.close()
print('ALL PASS' if ok else 'FAIL')
