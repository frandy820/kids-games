# -*- coding: utf-8 -*-
"""单区句子校验（供每区教研代理自检）。用法：python _audit_sent_region.py sent-r3.json
校验：句长 4-9（不含标点）/focus 属本区且非前 4 字/同 focus ≤2/子集铁律（每字∈低区全字∪本区 order≤focus order∪虚词）/py 音节数=字数/标点白名单。rc=0=过。"""
import json, os, re, sys

DATA = os.path.dirname(os.path.abspath(__file__))
FN = set(json.load(open(os.path.join(DATA, 'chars-function.json'), encoding='utf-8'))['chars'])
SEQ = []
for i in range(1, 8):
    for c in json.load(open(os.path.join(DATA, 'chars-r%d.json' % i), encoding='utf-8'))['chars']:
        SEQ.append((i, c.get('order', 0), c['ch']))
CH_POS = {ch: idx for idx, (r, o, ch) in enumerate(SEQ)}

def main():
    f = sys.argv[1] if len(sys.argv) > 1 else 'sent-r1.json'
    region = int(re.match(r'sent-r(\d)\.json', f).group(1))
    want = {1: 26, 2: 20, 3: 18, 4: 17, 5: 22, 6: 22, 7: 35}[region]
    doc = json.load(open(os.path.join(DATA, f), encoding='utf-8'))
    items = doc['sentences']
    errs = []
    if len(items) != want:
        errs.append('句数 %d != %d' % (len(items), want))
    from collections import Counter
    fc = Counter()
    for k, s in enumerate(items):
        sid = 'idx%d' % k
        if s.get('region') != region:
            errs.append('%s region %r 错' % (sid, s.get('region')))
        text = s['text']
        body = re.sub(r'[。！？，]', '', text)
        if not (4 <= len(body) <= 9):
            errs.append('%s 句长 %d' % (sid, len(body)))
        if s.get('len') != len(body):
            errs.append('%s len 字段错' % sid)
        fch = s.get('focus')
        if fch not in CH_POS:
            errs.append('%s focus %s 不在字表' % (sid, fch)); continue
        # focus 属本区且非本区前 4 字（前 4 字可用字太少，造句必违规）
        ridx = [i for i, (r, o, ch) in enumerate(SEQ) if ch == fch][0]
        region_of = SEQ[ridx][0]
        order_of = SEQ[ridx][1]
        if region_of != region:
            errs.append('%s focus %s 属 R%d' % (sid, fch, region_of)); continue
        same_region_orders = [o for (r, o, ch) in SEQ if r == region]
        if order_of < 4:
            errs.append('%s focus %s 是本区前 4 字（order %d），换后面的字' % (sid, fch, order_of))
        fc[fch] += 1
        # 子集：全局序 ≤ focus 全局序
        cutoff = CH_POS[fch]
        allowed = set(ch for idx, (r, o, ch) in enumerate(SEQ) if idx <= cutoff) | FN
        for chx in body:
            if chx not in allowed:
                errs.append('%s `%s` 字[%s] 超子集(focus=%s)' % (sid, text, chx, fch))
        for p in text:
            if not ('一' <= p <= '鿿') and p not in '。！？，':
                errs.append('%s 非法字符 %r' % (sid, p))
        n_py = len(s.get('py', '').split())
        if n_py != len(body):
            errs.append('%s py %d 节 != %d 字' % (sid, n_py, len(body)))
    for fch, n in fc.items():
        if n > 2:
            errs.append('focus %s %d 句 >2' % (fch, n))
    errs_e = [e for e in errs]
    if errs_e:
        with open(os.path.join(DATA, '_sent_errs.txt'), 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(errs_e))
        print('ERRORS=%d -> _sent_errs.txt' % len(errs_e))
        sys.exit(1)
    print('REGION %d PASS: %d sentences' % (region, len(items)))

if __name__ == '__main__':
    main()
