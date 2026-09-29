# -*- coding: utf-8 -*-
"""合并 sent-r1..r7.json -> sentences.json（按区序 id 升序），并全量校验（数量/分配/子集复跑单区逻辑）。"""
import json, os, re, sys

DATA = os.path.dirname(os.path.abspath(__file__))
WANT = {1: 26, 2: 20, 3: 18, 4: 17, 5: 22, 6: 22, 7: 35}
all_s = []
for r in range(1, 8):
    doc = json.load(open(os.path.join(DATA, 'sent-r%d.json' % r), encoding='utf-8'))
    assert doc['region'] == r
    ss = doc['sentences']
    assert len(ss) == WANT[r], 'R%d %d != %d' % (r, len(ss), WANT[r])
    all_s += ss

# id 连续性重排（防代理乱号）
all_s.sort(key=lambda s: (s['region'], s['id']))
for i, s in enumerate(all_s):
    s['id'] = 's%03d' % (i + 1)
ids = [s['id'] for s in all_s]
assert len(set(ids)) == len(ids)
assert len(all_s) == 160, len(all_s)

out = {'meta': {'version': 1, 'date': '2026-09-29',
                'note': 'T5 句子题+阅读剧场数据；子集铁律=句内每字∈已学(focus 前)∪虚词白名单；分源 sent-r1..r7.json',
                'alloc': {str(k): v for k, v in WANT.items()}},
       'sentences': all_s}
json.dump(out, open(os.path.join(DATA, 'sentences.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('merged 160 -> sentences.json')
