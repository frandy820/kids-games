# -*- coding: utf-8 -*-
"""_audit_cat.py — P1 分类标注审计（rc=0 才准入聚簇切关）

校验：
  A. cat-labels.json 键集 == 7 区 chars 的 ch 并集（双向，不得多/缺/重）
  B. 值全部在 20 类封闭集内
  C. 每区 cat 分布报表（stdout，GBK 安全=只出 ASCII+区间数字，类名写文件）
用法：python _audit_cat.py   （在 _src/data/ 下跑）
"""
import io, json, os, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
CATS = [u'水果', u'蔬菜', u'食物饮品', u'餐具厨具', u'身体', u'家人', u'动物', u'植物',
        u'自然天象', u'衣物', u'文具', u'玩具', u'学校', u'场所', u'出行', u'方位',
        u'数字', u'动作', u'形容', u'虚词']
LABELS = 'F:/claudecode/output/ziquest/work/cat-labels.json'

def main():
    labels = json.load(io.open(LABELS, encoding='utf-8'))
    errs = []
    all_ch = []
    per_region = {}
    for r in range(1, 8):
        d = json.load(io.open(os.path.join(HERE, 'chars-r%d.json' % r), encoding='utf-8'))
        chs = [c['ch'] for c in d['chars']]
        all_ch.extend(chs)
        per_region[r] = chs
    # A 双向
    kset = set(labels)
    cset = set(all_ch)
    if len(labels) != len(kset):
        errs.append('dup-keys=%d' % (len(labels) - len(kset)))
    miss = cset - kset
    extra = kset - cset
    if miss:
        errs.append('missing=%s' % ''.join(sorted(miss)))
    if extra:
        errs.append('extra=%s' % ''.join(sorted(extra)))
    # B 封闭集
    bad = {v for v in labels.values() if v not in CATS}
    if bad:
        errs.append('bad-cat=%s' % ''.join(sorted(bad)))
    # C 分布（写文件避 GBK）
    rep = []
    for r in range(1, 8):
        cnt = collections.Counter(labels[c] for c in per_region[r] if c in labels)
        rep.append('R%d %s' % (r, json.dumps(cnt.most_common(), ensure_ascii=False)))
    io.open('F:/claudecode/output/ziquest/work/cat-dist.txt', 'w', encoding='utf-8').write('\n'.join(rep))
    if errs:
        print('AUDIT FAIL')
        for e in errs:
            print(e)
        sys.exit(1)
    print('AUDIT PASS n=%d regions=7 dist->cat-dist.txt' % len(labels))

if __name__ == '__main__':
    main()
