# -*- coding: utf-8 -*-
"""_apply_cat.py — P1 灌入：cat-labels.json → chars-r1..r7.json 每字加 cat 字段（幂等）
前置：_audit_cat.py rc=0。灌入后 game-data 重生成由 build 首步自跑。"""
import io, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
LABELS = 'F:/claudecode/output/ziquest/work/cat-labels.json'

def main():
    labels = json.load(io.open(LABELS, encoding='utf-8'))
    total = 0
    for r in range(1, 8):
        p = os.path.join(HERE, 'chars-r%d.json' % r)
        d = json.load(io.open(p, encoding='utf-8'))
        for c in d['chars']:
            cat = labels.get(c['ch'])
            assert cat, 'missing cat for %s' % c['ch']
            c['cat'] = cat
            total += 1
        json.dump(d, io.open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        io.open(p, 'a', encoding='utf-8').write('\n')
    print('applied cat to %d chars (r1..r7)' % total)

if __name__ == '__main__':
    main()
