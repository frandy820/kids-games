# -*- coding: utf-8 -*-
"""Phase 0b 区域分配草稿 v1（设计者判定，脚本校验迭代）。
规则：
- 一上 300 全量进 400（虚词走句子习得路径，标 function 不进新字关目标）
- 生活 100 ∉ 一上300 ∪ 一下400（脚本硬校验）
- 区域主题：R1自然时令/R2家人身体/R3动物植物/R4食物购物/R5出行场所方位/R6学校数字文娱/R7情感综合句境
"""
import json

SRC = json.load(open('F:/claudecode/projects/active/kids-games/batch42/ziquest/_src/data/chars-source.json', encoding='utf-8'))
G1A = SRC['g1a_renzi']
G1B = set(SRC['g1b_renzi'])

# ---- 虚词白名单（句子习得路径，不进新字关目标；=zilearn16 + 高频扩展）----
FUNCTION = '的了是我你在他有和就不啊吧呀嗯啦好很也去来吗没这'

# ---- 区域分配（一上字）----
REGIONS_G1A = {
    1: '天地日月星云雨风雪山石田土火水秋气树叶片春冬青莲影黑彩绿海蓝洞亮早晚午昨今年时候看见听',
    2: '人你我他它爸妈妹奶哥姐弟叔爷男女口耳目手足站坐头牙皮心穿衣服孩娃睡',
    3: '鸟虫马鸡牛羊猫狗鸭鱼蛙乌鸦兔竹禾木林森条花草果芽爬尾巴伞',
    4: '苹果杏桃金给',
    5: '上下前后左右里东南西北中远近处旁车路灯走桥台船门开关正反进出工厂医院生回',
    6: '一二三四五六七八九十字词语句子画棋文数学音乐书包尺作业本笔刀课校写诗老师升国旗歌两',
    7: '晴蛙尖说弯皮多少只边比谁最长短把公点要过当串们以成半空问方更出那真同什才觉自自己飞会个尘从众双明力么美丽立起彩',  # 注意与R1重复的要后面剔除
}

# ---- 生活 100 字（按区域）----
LIFE = {
    1: '雾湖岛岸沙暗季根紫灰棕',
    2: '婆伯舅姨宝指肩被餐名谢',
    3: '猪鹅龟狮松柏菊梅蜗雀鹤狼狐狸',
    4: '菜粥蛋糖盐油饼饺虾糕包蕉梨橘枣葡萄咸辣苦买卖碗筷杯勺袜裤衫帽鞋',
    5: '超市店园街楼梯轮帆骑',
    6: '题卷粉算图馆零读',
    7: '哭梦帮答喝龙客累饿渴耍拉推猜屋哟',
}

rep = open('F:/claudecode/output/ziquest/work/region-check.txt', 'w', encoding='utf-8')
w = rep.write

# 校验 1：一上全量覆盖
assigned = []
for r, s in REGIONS_G1A.items():
    assigned += list(s)
dup_in_g1a = [c for c in set(assigned) if assigned.count(c) > 1]
w('[一上] 重复分配: %s\n' % (''.join(dup_in_g1a) or '无'))
missing = [c for c in G1A if c not in set(assigned)]
w('[一上] 漏分配 %d 字: %s\n' % (len(missing), ''.join(missing)))
extra = [c for c in assigned if c not in set(G1A)]
w('[一上] 分配了但不在一上表 %d 字: %s\n' % (len(extra), ''.join(extra)))
fn_in_g1a = [c for c in FUNCTION if c in set(G1A)]
fn_not = [c for c in FUNCTION if c not in set(G1A)]
w('[虚词] 在一上表 %d/%d（其余%d个不在表内无需处理）: %s\n' % (len(fn_in_g1a), len(FUNCTION), len(fn_not), ''.join(fn_in_g1a)))

# 校验 2：生活字避重
life_all = []
for r, s in LIFE.items():
    life_all += list(s)
w('\n[生活] 总数=%d\n' % len(life_all))
life_dup = [c for c in set(life_all) if life_all.count(c) > 1]
w('[生活] 内部重复: %s\n' % (''.join(life_dup) or '无'))
bad = [c for c in life_all if c in set(G1A) or c in G1B]
w('[生活] 与一上/一下重叠 %d 字: %s\n' % (len(bad), ''.join(bad)))

# 校验 3：分布统计
w('\n[分布]（主题字=非虚词一上+生活）\n')
total = 0
for r in sorted(set(list(REGIONS_G1A.keys()) + list(LIFE.keys()))):
    g = [c for c in REGIONS_G1A.get(r, '') if c in set(G1A) and c not in FUNCTION and REGIONS_G1A[r].count(c) == 1]
    lf = [c for c in LIFE.get(r, '')]
    n = len(g) + len(lf)
    total += n
    w('R%d: 一上%d + 生活%d = %d 字（%.0f 关）\n' % (r, len(g), len(lf), n, n / 5))
fn_count = len([c for c in fn_in_g1a])
w('虚词(句子习得): %d 字\n' % fn_count)
w('主题字总计: %d → 新字关 %d 关；全 400 = 主题%d + 虚词%d\n' % (total, total // 5, total, fn_count))
rep.close()
print('done')
