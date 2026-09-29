# -*- coding: utf-8 -*-
"""Phase 0d：生成 map.json（全图节点拓扑+先序+设计坐标系坐标）。
地图=纵向长卷 1000×7600（R0 底部 → R7 顶部），每区域路径形态不同。
节点先序=区域内线性链（解锁：前节点≥1星→下一个亮）；区域间=BOSS 击破解锁下一区。
坐标策略：每区域一条 basePath 折线（形态参数化），节点沿折线均匀落点。"""
import json, math, os

DATA = os.path.dirname(__file__)

LEVELS = {1: 13, 2: 9, 3: 9, 4: 8, 5: 11, 6: 11, 7: 17}  # ceil(N/5)
REGION_NAMES = {0: '序章·星光草地', 1: '风山镇', 2: '暖暖村', 3: '咕咕森林', 4: '甜甜集市', 5: '嘟嘟小镇', 6: '智慧城堡', 7: '星空剧场'}
FRIENDS = {1: 'lark', 2: 'duck', 3: 'owl', 4: 'monkey', 5: 'pigeon', 6: 'fox', 7: 'star'}
# 每区域形态：山峰数与水平摆幅（绘本差异：山道盘旋/村道缓弯/森林分叉/集市环岛/街巷折线/城堡螺旋/剧场星线）
SHAPE = {0: dict(sway=120, period=900, amp=60), 1: dict(sway=260, period=520, amp=120),
         2: dict(sway=160, period=700, amp=80), 3: dict(sway=220, period=560, amp=160),
         4: dict(sway=300, period=640, amp=90), 5: dict(sway=140, period=480, amp=110),
         6: dict(sway=280, period=500, amp=130), 7: dict(sway=200, period=760, amp=70)}

REGION_H = 900   # 每区域高度
W = 1000

def path_x(region, y_local, mid_x):
    """区域内路径横向函数：正弦摆动 + 区域幅度（坐标系：x 向右，y_local 区域内向上）。"""
    s = SHAPE[region]
    return mid_x + s['sway'] * math.sin(2 * math.pi * y_local / s['period']) * (s['amp'] / 160.0)

def build_region_nodes(rid, y_base, seq):
    """seq=[(type,label)]；返回节点数组（y 向上增长，画布 y = TOTAL_H - (y_base+t)）。"""
    nodes = []
    n = len(seq)
    for i, (typ, label) in enumerate(seq):
        t_local = (i + 1) * (REGION_H - 140) / (n + 1) + 70
        x = path_x(rid, t_local, W / 2 + (rid % 2 and 40 or -40))
        y_up = y_base + t_local
        nodes.append({
            'key': 'r%dn%02d' % (rid, i + 1), 'region': rid, 'type': typ, 'label': label,
            'x': round(x, 1), 'y': round(y_up, 1),
        })
    # 先序链
    for i in range(len(nodes) - 1):
        nodes[i]['next'] = [nodes[i + 1]['key']]
    nodes[-1]['next'] = []
    return nodes

all_regions = []
y_base = 0

# R0 序章：3 节点
r0 = build_region_nodes(0, y_base, [('story', '开场·吹散的书'), ('calib', '和兔子玩认字游戏'), ('story', '出发·第一颗种子')])
all_regions.append({'id': 0, 'name': REGION_NAMES[0], 'levels': 0, 'nodes': r0, 'unlock': 'first', 'boss': None})
y_base += REGION_H

for rid in range(1, 8):
    lv = LEVELS[rid]
    seq = [('story', '%s·迷雾中的%s' % (REGION_NAMES[rid], REGION_NAMES[rid]))]
    mid = lv // 2
    camp_at = sorted(set([max(2, lv // 3), max(4, 2 * lv // 3)]))  # 2 营地
    chest_at = max(1, lv // 4)
    friend_at = mid
    for i in range(1, lv + 1):
        seq.append(('new', '新字关%d' % i))
        if i == camp_at[0] or (len(camp_at) > 1 and i == camp_at[1]):
            seq.append(('camp', '复习营地'))
        if i == chest_at:
            seq.append(('chest', '星光驿站'))
        if i == friend_at:
            seq.append(('friend', FRIENDS[rid]))
    seq.append(('story', '字锁大门'))
    seq.append(('boss', REGION_NAMES[rid] + '守护者'))
    r = build_region_nodes(rid, y_base, seq)
    all_regions.append({'id': rid, 'name': REGION_NAMES[rid], 'levels': lv, 'nodes': r,
                        'unlock': 'r%d_boss' % (rid - 1) if rid > 1 else 'r0n03', 'boss': 'r%dn%02d' % (rid, len(seq))})
    y_base += REGION_H

total_h = y_base + 200
# 翻转 y：向上增长 → 画布 y（下原点）
for r in all_regions:
    for nd in r['nodes']:
        nd['y'] = round(total_h - nd['y'], 1)

out = {
    'meta': {
        'version': 1, 'date': '2026-09-29',
        'canvas': {'w': W, 'h': total_h},
        'nodeTypes': {'new': '新字关(萝卜旗)', 'camp': '复习营地(帐篷,每日刷新)', 'chest': '收集点(宝箱)',
                      'friend': '伙伴事件', 'story': '剧情(卷轴)', 'boss': 'BOSS(大字门)', 'calib': '定级(序章)'},
        'rules': {
            'unlockNode': '前节点 ≥1 星 → next 亮（story/chest/friend 完成即过）',
            'unlockBoss': '本区全部 new ≥1 星 → boss 可进',
            'unlockRegion': '击破前区 boss → 迷雾消散',
            'quota': '日限速只锁 new：ZQ_DAY_NEW 首日1/2-7日2/8日起3 + 家长bonus',
        },
    },
    'regions': all_regions,
}
json.dump(out, open(os.path.join(DATA, 'map.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# 校验：节点总数/类型统计/链完整性
from collections import Counter
cnt = Counter()
keys = set()
for r in all_regions:
    for nd in r['nodes']:
        cnt[nd['type']] += 1
        assert nd['key'] not in keys, 'key 重复 ' + nd['key']
        keys.add(nd['key'])
        for nx in nd['next']:
            assert nx in keys or True
# next 引用存在性（二次扫）
for r in all_regions:
    for nd in r['nodes']:
        for nx in nd['next']:
            assert nx in keys, '断链 ' + nx
print('节点总数', sum(cnt.values()), dict(cnt))
print('ALL PASS' if sum(cnt.values()) == 3 + 78 + 14 + 7 + 7 + 14 + 7 else '数量核对见上（设计基线 130）')
