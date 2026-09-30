# -*- coding: utf-8 -*-
"""_pick_pics.py — P2 配图选目：可画具象字优先，产 work/pics-list.json [{ch,word}]

选目规则（体积预算 ≤200 张×10KB；2026-09-30 人工逐字审后收紧）：
  1. 高置信可画 cat 全留（实物/生物/穿戴/出行，画不偏）：水果/蔬菜/食物饮品/餐具厨具/
     动物/植物/衣物/文具/玩具/出行
  2. 抽象类全跳过：虚词/形容/方位/数字/动作/学校/场所/自然天象/家人
  3. 但 2 类中的具象字走显式白名单（人工逐字审：日月星云 vs 时候/季节；老师/爸妈 vs 自己/大家）：
     身体部位词/人物称谓/自然物/建筑/学具/旗帜——word 必须画得出且图=字义
  4. word 黑名单兜底（cat 对但 word 抽象误导：足→「足球」画球不画脚、油→「加油」、心→「开心」）
  5. 排除已有 ZQ_PICTO 象形的 29 字（t2 B 段象形优先）
"""
import io, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
LABELS = 'F:/claudecode/output/ziquest/work/cat-labels.json'
PICTO_29 = set(u'天日月水火山人口木大小云田石马鸟鱼雨门手力目竹禾三乌本刀少')
GOOD_CATS = {u'水果', u'蔬菜', u'食物饮品', u'餐具厨具', u'动物', u'植物', u'衣物',
             u'文具', u'玩具', u'出行'}
# 抽象 cat 里的具象字白名单（人工逐字审 2026-09-30）
WL = {
    u'身体': u'耳指肩牙巴尾肚',                      # 心(开心)头(头上)皮(肚皮)足(足球)——word 误导剔除
    u'家人': u'爸妈妹奶儿子哥弟姐妹叔爷男女婆伯舅姨孩宝老师朋友客',  # 它/己/自/名——抽象剔除
    u'自然天象': u'雪江莲海雾湖岛岸沙洞土星冰',        # 早秋风时晚午昨今季年春冬夏气影——抽象剔除
    u'学校': u'书包尺笔桌纸文粉图馆国旗旗灯台画校',    # 课业题读写作字词语句数音学诗名卷算——抽象剔除
    u'场所': u'屋桥店院园街楼厂市餐梯医',             # 家(大家)公(公园留)空——空剔
}
WL[u'场所'] += u'公'                                   # 公园大门可画
WORD_BLACK = {u'加油', u'开心', u'大家', u'头上', u'它们', u'时间', u'时候', u'天气',
              u'季节', u'大风', u'肚皮', u'足球', u'早上'}
BUDGET = 200


def main():
    labels = json.load(io.open(LABELS, encoding='utf-8'))
    picked = []
    for r in range(1, 8):
        d = json.load(io.open(os.path.join(HERE, 'chars-r%d.json' % r), encoding='utf-8'))
        for c in d['chars']:
            ch, cat = c['ch'], labels.get(c['ch'])
            if ch in PICTO_29 or c['words'][0][0] in WORD_BLACK:
                continue
            ok = cat in GOOD_CATS or (cat in WL and ch in WL[cat])
            if not ok:
                continue
            picked.append({'ch': ch, 'word': c['words'][0][0], 'region': r, 'cat': cat,
                           'order': c.get('order', 0)})
    picked.sort(key=lambda x: (x['region'], x['order']))
    picked = picked[:BUDGET]
    out = [{'ch': p['ch'], 'word': p['word']} for p in picked]
    io.open('F:/claudecode/output/ziquest/work/pics-list.json', 'w', encoding='utf-8').write(
        json.dumps(out, ensure_ascii=False, indent=0))
    import collections
    rep = collections.Counter((p['region'], p['cat']) for p in picked)
    lines = ['total=%d' % len(out)]
    for k in sorted(rep):
        lines.append('R%d %s: %d' % (k[0], k[1], rep[k]))
    io.open('F:/claudecode/output/ziquest/work/pics-pick-report.txt', 'w', encoding='utf-8').write('\n'.join(lines))
    print('picked=%d report->pics-pick-report.txt' % len(out))


if __name__ == '__main__':
    main()
