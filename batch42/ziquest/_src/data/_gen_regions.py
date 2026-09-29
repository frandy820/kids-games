# -*- coding: utf-8 -*-
"""Phase 0b 定稿生成器：region-draft-v2.py 的分配（ALL PASS 版）→ 正式 chars-r1..r7.json。
每字携带：region/order/src(g1a|life)/chNo(课标序，一上字)/py(带调拼音，一上字取源1)。
生活字 py/pyFull/words 等 Phase 0c authoring 补齐。"""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))

# 从 draft v2 导入定稿分配（ALL PASS 态）
import importlib.util
spec = importlib.util.spec_from_file_location('draft', os.path.join(os.path.dirname(__file__), 'region-draft-v2.py'))
draft = importlib.util.module_from_spec(spec)
# draft 运行会写报告文件，无害
spec.loader.exec_module(draft)

SRC = json.load(open(os.path.join(os.path.dirname(__file__), 'chars-source.json'), encoding='utf-8'))
detail = {row['ch']: row for row in SRC['detail_g1a']}

META = {
    1: {'name': '风山镇', 'theme': '自然·时令·颜色·感知', 'accent': '#7FB3E0'},
    2: {'name': '暖暖村', 'theme': '家人·身体·生活自理', 'accent': '#F2B8C6'},
    3: {'name': '咕咕森林', 'theme': '动物·植物', 'accent': '#8FBF7F'},
    4: {'name': '甜甜集市', 'theme': '食物·购物·生活用品', 'accent': '#F2C94C'},
    5: {'name': '嘟嘟小镇', 'theme': '出行·场所·方位', 'accent': '#E8975A'},
    6: {'name': '智慧城堡', 'theme': '学校·数字·文具·文娱', 'accent': '#B49BD8'},
    7: {'name': '星空剧场', 'theme': '情感·综合·句境运用（终局大区）', 'accent': '#F5C445'},
}

def lesson_no(l):
    # 课标序：first 形如 1a-s3/1a-p12/1a-k4 → (段序 s<p<k, 课号)
    if not l:
        return (9, 999)
    kind = l[3]
    ko = {'s': 0, 'p': 1, 'k': 2}.get(kind, 3)
    import re
    m = re.match(r'1a-(?:s|p|k)(\d+)$', l)
    return (ko, int(m.group(1)) if m else 999)

total = 0
g1a_total = 0
life_total = 0
FN = set(draft.FUNCTION)
for r in range(1, 8):
    g1a_chars = [c for c in draft.REGIONS[r] if c in detail and c not in FN]
    life_chars = list(draft.LIFE[r])
    g1a_total += len(g1a_chars)
    life_total += len(life_chars)
    # 一上字按课标序排
    g1a_chars.sort(key=lambda c: lesson_no(detail[c]['first']))
    rows = []
    order = 0
    for c in g1a_chars:
        rows.append({
            'ch': c, 'src': 'g1a', 'order': order,
            'chNo': None, 'first': detail[c]['first'], 'py': detail[c]['py'],
            'words0': detail[c]['words'][:1],  # 源1组词首词（参考，0c 复核）
        })
        order += 1
    for c in life_chars:
        rows.append({'ch': c, 'src': 'life', 'order': order, 'chNo': None, 'py': None})
        order += 1
    total += len(rows)
    out = {
        'meta': dict(META[r], region=r, count=len(rows),
                     levels=len(rows) // 5, note='order=区域内教学序；g1a 按课标 first 课号排序；life 待 0c 补 py/words'),
        'function': [c for c in draft.FUNCTION if c in set(draft.REGIONS[r])] if r == 1 else [],
        'chars': rows,
    }
    path = os.path.join(os.path.dirname(__file__), 'chars-r%d.json' % r)
    json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('R%d %s: %d 字 %d 关' % (r, META[r]['name'], len(rows), len(rows) // 5))

# 虚词白名单单独文件（句子习得路径）
fn_in = [c for c in draft.FUNCTION if any(c in set(draft.REGIONS[r]) or c in list(draft.LIFE[r]) for r in range(1, 8)) or c in set(SRC['g1a_renzi'])]
json.dump({'meta': {'note': '虚词白名单：句子习得路径，不进新字关目标；图鉴计入并标 src:function',
                    'count': len(fn_in)},
           'chars': fn_in},
          open(os.path.join(os.path.dirname(__file__), 'chars-function.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('虚词 %d 字；总字数 %d' % (len(fn_in), total + len(fn_in)))
# 总账断言
assert g1a_total + len(fn_in) == 300, '一上总账 %d+%d≠300' % (g1a_total, len(fn_in))
assert life_total == 100, '生活总账 %d≠100' % life_total
assert total + len(fn_in) == 400, '总字数 %d≠400' % (total + len(fn_in))
print('总账断言 PASS：一上 %d+虚词 %d=300；生活 %d；合计 400' % (g1a_total, len(fn_in), life_total))
