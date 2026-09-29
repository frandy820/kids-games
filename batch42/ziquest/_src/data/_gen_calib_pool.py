# -*- coding: utf-8 -*-
"""定级高频池 100 字：一上课序前 70（frequency 代理=first 课号）+ 生活 30（region 表 order 前 30）。
分带 easy(1-40)/mid(41-70)/hard(71-100)。前置：chars-r*.json 存在（教研字段无关，只需 ch/src/order/first）。"""
import json, os

DATA = os.path.dirname(__file__)
src = json.load(open(os.path.join(DATA, 'chars-source.json'), encoding='utf-8'))

# 一上字按 first 课号排序（跳过虚词白名单——虚词不进区域表也不进定级）
import re
def lesson_no(l):
    # 课标序：first 形如 1a-s3/1a-p12/1a-k4 → (段序 s<p<k, 课号)；与 _gen_regions.py 同律
    if not l:
        return (9, 999)
    ko = {'s': 0, 'p': 1, 'k': 2}.get(l[3], 3)
    m = re.match(r'1a-(?:s|p|k)(\d+)$', l)
    return (ko, int(m.group(1)) if m else 999)

FN = set(json.load(open(os.path.join(DATA, 'chars-function.json'), encoding='utf-8'))['chars'])
g1a = [d for d in src['detail_g1a'] if d['ch'] not in FN]
g1a.sort(key=lambda d: (lesson_no(d.get('first')), d['ch']))
pool_g1a = [d['ch'] for d in g1a[:70]]

# 生活字：region 表 src=life 按 order 前 30
life = []
for i in range(1, 8):
    for c in json.load(open(os.path.join(DATA, 'chars-r%d.json' % i), encoding='utf-8'))['chars']:
        if c.get('src') == 'life':
            life.append((c['ch'], c.get('order', 99), i))
life.sort(key=lambda t: (t[1], t[2]))
pool_life = [t[0] for t in life[:30]]

pool = pool_g1a + pool_life
assert len(pool) == 100, len(pool)
assert len(set(pool)) == 100
assert not (set(pool) & FN)

out = {
    'meta': {'version': 1, 'date': '2026-09-29',
             'note': '定级三带池：easy 40 / mid 30 / hard 30；adaptive 全对升带、错即停该带；上限 30 题',
             'bands': {'easy': pool[:40], 'mid': pool[40:70], 'hard': pool[70:100]}},
    'pool': pool,
}
json.dump(out, open(os.path.join(DATA, 'calib-pool.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('calib-pool 100 = g1a %d + life %d; bands 40/30/30' % (len(pool_g1a), len(pool_life)))
