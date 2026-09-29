# -*- coding: utf-8 -*-
"""Phase 0d：生成 catalog.json（伙伴 7 + 装扮 72 件 + BOSS 7 名录）。
SVG path 由工程实现时按 id 内嵌（本文件只含目录元数据）。"""
import json, os

DATA = os.path.dirname(__file__)

COMPANIONS = [
    {'id': 'lark', 'name': '小云雀叮叮', 'region': 1, 'color': '#7FB3E0', 'skill': 'sing', 'skillName': '唱一唱',
     'skillDesc': '把题目的声音再唱一遍给你听', 'lines': ['你好呀，我是叮叮！', '我唱得最好听啦', '叮叮升级咯！', '今天也要开心唱歌哦']},
    {'id': 'duck', 'name': '小鸭嘎嘎', 'region': 2, 'color': '#F2B8C6', 'skill': 'slow', 'skillName': '慢慢说',
     'skillDesc': '把声音放慢，一个字一个字说', 'lines': ['嘎嘎，我是小鸭嘎嘎', '别急，慢慢来', '嘎嘎，谢谢你的星星', '我们一起去暖暖村吧']},
    {'id': 'owl', 'name': '猫头鹰博士', 'region': 3, 'color': '#8FBF7F', 'skill': 'hint', 'skillName': '亮一亮',
     'skillDesc': '让答案字的一部分亮起来', 'lines': ['咕咕，我是博士', '看这里，看这里', '咕咕，你又学会啦', '森林里还有很多秘密哦']},
    {'id': 'monkey', 'name': '小猴淘淘', 'region': 4, 'color': '#F2C94C', 'skill': 'pick', 'skillName': '摘一摘',
     'skillDesc': '帮你摘掉一个不对的', 'lines': ['嘿嘿，我是淘淘！', '这个不对，摘掉！', '桃子分你一半！', '集市今天真热闹']},
    {'id': 'pigeon', 'name': '鸽子邮邮', 'region': 5, 'color': '#E8975A', 'skill': 'radar', 'skillName': '找一找',
     'skillDesc': '在地图上闪出宝贝的地方', 'lines': ['咕噜噜，信来啦', '跟我来，宝贝在那边', '咕噜噜，谢谢你', '小镇的路我全都认识']},
    {'id': 'fox', 'name': '小狐狸聪聪', 'region': 6, 'color': '#B49BD8', 'skill': 'swap', 'skillName': '换一换',
     'skillDesc': '把这道题换成另一种玩法', 'lines': ['你好，我是聪聪', '换个玩法试试看', '聪明如你！', '城堡的书我都读过哦']},
    {'id': 'star', 'name': '星星精灵闪闪', 'region': 7, 'color': '#F5C445', 'skill': 'sparkle', 'skillName': '亮晶晶',
     'skillDesc': '答对时星星特效变得更漂亮', 'lines': ['一闪一闪，我是闪闪', '你的星星真漂亮', '闪闪亮亮，升级啦！', '大典的舞台等你很久啦']},
]

BOSSES = [
    {'region': 1, 'id': 'sleepy', 'name': '瞌睡山神', 'intro': '呼……谁来啦……陪我说说话……', 'hp': 10},
    {'region': 2, 'id': 'cat', 'name': '大懒猫', 'intro': '喵~把家里人认对了才让你过~', 'hp': 9},
    {'region': 3, 'id': 'tree', 'name': '老树精', 'intro': '拼出我的名字，森林之门就开', 'hp': 10},
    {'region': 4, 'id': 'pig', 'name': '算账小猪', 'intro': '嗯~钱要算对才好吃呀~', 'hp': 9},
    {'region': 5, 'id': 'dragon', 'name': '迷路邮差龙', 'intro': '信上的字错了！帮我找出来！', 'hp': 11},
    {'region': 6, 'id': 'guard', 'name': '图书馆石像卫士', 'intro': '想进图书馆？先过我这一关', 'hp': 12},
    {'region': 7, 'id': 'gala', 'name': '万字大典', 'intro': '把你会的字都亮出来吧！', 'hp': 12, 'nonCombat': True},
]

HATS = ['小红帽', '花草帽', '蝴蝶结帽', '星星帽', '贝雷帽', '兔耳朵帽', '草莓帽', '云朵帽']
DRESSES = ['草莓裙', '小花裙', '星空裙', '彩虹裙', '荷叶裙', '蛋糕裙', '铃铛裙', '雪花裙', '蝴蝶裙', '月亮裙', '果绿裙', '蜜桃裙']
SHOES = ['小红鞋', '花布鞋', '星星鞋', '兔拖鞋', '运动鞋', '小雨靴']
SCARFS = ['红围巾', '彩虹围巾', '小花围巾', '星星围巾']
GLASSES = ['圆眼镜', '小墨镜', '星星镜', '花框镜']
BAGS = ['小书包', '果子包', '星星包', '花书包']
FURNITURE = ['小木床', '圆桌桌', '小椅子', '书架', '台灯', '小沙发', '地毯', '衣柜', '花瓶', '小时钟', '软抱枕', '小圆凳', '画框', '玩具箱']
GARDEN = ['向日葵', '玫瑰花', '郁金香', '小雏菊', '蒲公英', '太阳花', '蝴蝶兰', '樱花树', '小池塘', '小秋千', '小菜园', '小风车']
WALLS = ['米色墙', '花墙纸', '星空墙', '果园墙', '木地板', '草地地板', '彩虹地毯', '蓝天墙']

def dress_items(names, slot, base_price, unlock_region):
    return [{'id': '%s%02d' % (slot, i + 1), 'name': n, 'slot': slot, 'cat': 'wear',
             'price': base_price + i * 10, 'unlock': {'region': unlock_region, 'chars': 0}}
            for i, n in enumerate(names)]

def home_items(names, slot, base_price):
    return [{'id': '%s%02d' % (slot, i + 1), 'name': n, 'slot': slot, 'cat': 'home',
             'price': base_price + i * 8, 'unlock': {'region': 0, 'chars': 0}}
            for i, n in enumerate(names)]

items = []
items += dress_items(HATS, 'hat', 40, 1)
items += dress_items(DRESSES, 'dress', 60, 2)
items += dress_items(SHOES, 'shoes', 30, 3)
items += dress_items(SCARFS, 'scarf', 25, 4)
items += dress_items(GLASSES, 'glass', 25, 5)
items += dress_items(BAGS, 'bag', 35, 6)
items += home_items(FURNITURE, 'furn', 50)
items += home_items(GARDEN, 'plant', 30)
items += home_items(WALLS, 'wall', 45)
assert len(items) == 72, len(items)

# 里程碑赠送：每 50 字里程碑送一件（按价格升序挑 8 件作礼物，商店标 gift-only）
gifts = sorted([it for it in items if it['slot'] in ('dress', 'hat')], key=lambda x: x['price'])[:8]
for i, g in enumerate(gifts):
    g['giftAt'] = (i + 1) * 50   # 50/100/150/.../400 字时赠送
    g['price'] = 0

out = {
    'meta': {'version': 1, 'date': '2026-09-29',
             'note': 'slots: hat/dress/shoes/scarf/glass/bag 可穿戴；furn/plant/wall 家园；energy: 伙伴每日3能量，兔子永远保底',
             'economy': {'newFirst': 10, 'newFirst3star': 14, 'newReplay': 4, 'camp': 6, 'chest': 18, 'friend': 12,
                         'bossFirst': 45, 'bossReplay': 12, 'morning': 3, 'quest': 5, 'calibRight': 2}},
    'companions': COMPANIONS,
    'bosses': BOSSES,
    'items': items,
}
json.dump(out, open(os.path.join(DATA, 'catalog.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('companions=%d bosses=%d items=%d (gifts=%d)' % (len(COMPANIONS), len(BOSSES), len(items), len(gifts)))
