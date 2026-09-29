# -*- coding: utf-8 -*-
"""sentences.json 子集铁律校验：每句每字 ∈（低区域全字∪本区 order<focus.order 字∪虚词白名单）。
另校验：数量 160/分配/句长 4-9/focus 归属/py 逐字对应/标点白名单。rc=0 才可入 build。"""
import json, os, re, sys, unicodedata

DATA = os.path.dirname(__file__)
FN = set(json.load(open(os.path.join(DATA, 'chars-function.json'), encoding='utf-8'))['chars'])

# 学习序：R1..R7 区内 order 串行（region, order）→ 全局序
seq = []   # [(region, order, ch)]
for i in range(1, 8):
    for c in json.load(open(os.path.join(DATA, 'chars-r%d.json' % i), encoding='utf-8'))['chars']:
        seq.append((i, c.get('order', 0), c['ch']))
pos = {(r, o): idx for idx, (r, o, ch) in enumerate(seq)}
ch_pos = {}
for idx, (r, o, ch) in enumerate(seq):
    ch_pos[ch] = idx

def learnable_before(ch):
    """学完 focus=ch 时已学字集合 = 全局序 <= ch 序 的全部 + 虚词。"""
    return ch

def toneless(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c))

def main():
    doc = json.load(open(os.path.join(DATA, 'sentences.json'), encoding='utf-8'))
    items = doc['sentences'] if 'sentences' in doc else doc['items']
    errs = []
    from collections import Counter
    cnt = Counter()
    seen_id = set()
    focus_cnt = Counter()
    for s in items:
        cnt[s['region']] += 1
        sid = s.get('id')
        if sid in seen_id:
            errs.append('id 重复 %s' % sid)
        seen_id.add(sid)
        if not re.match(r'^s\d{3}$', str(sid)):
            errs.append('id 格式 %r' % sid)
        text = s['text']
        body = re.sub(r'[。！？，？！,.]', '', text)
        L = len(body)
        if not (4 <= L <= 9):
            errs.append('%s 句长 %d 出界: %s' % (sid, L, body))
        if s.get('len') != L:
            errs.append('%s len 字段 %r ≠ 实际 %d' % (sid, s.get('len'), L))
        f = s.get('focus')
        if f not in ch_pos:
            errs.append('%s focus %s 不在区域表' % (sid, f))
            continue
        if ch_pos[f] // 100 + 1 != s['region']:
            # focus 应属本区
            r_of = None
            for i in range(1, 8):
                for c in json.load(open(os.path.join(DATA, 'chars-r%d.json' % i), encoding='utf-8'))['chars']:
                    if c['ch'] == f:
                        r_of = i
            if r_of != s['region']:
                errs.append('%s focus %s 属 R%s 不属 R%s' % (sid, f, r_of, s['region']))
        focus_cnt[f] += 1
        # 子集铁律：每字 ∈ 已学(focus 序前)∪虚词
        cutoff = ch_pos[f]
        allowed = set(ch for idx, ch in enumerate([c for _, _, c in seq]) if idx <= cutoff) | FN
        # 上面写法低效且 seq 顺序即 idx；直接：
        allowed = set(seq[i][2] for i in range(cutoff + 1)) | FN
        for chx in body:
            if chx not in allowed:
                errs.append('%s 字 `%s` 超出子集（focus=%s）' % (sid, chx, f))
        # 标点白名单
        for p in text:
            if not ('一' <= p <= '鿿') and p not in '。！？，':
                errs.append('%s 非法字符 %r' % (sid, p))
        # py 逐字对应
        py = s.get('py', '')
        n_py = len(py.split())
        n_hanzi = len(body)
        if n_py != n_hanzi:
            errs.append('%s py %d 音节 ≠ %d 字' % (sid, n_py, n_hanzi))
    # 分配
    want = {1: 26, 2: 20, 3: 18, 4: 17, 5: 22, 6: 22, 7: 35}
    for r, n in want.items():
        if cnt[r] != n:
            errs.append('R%d 句数 %d ≠ %d' % (r, cnt[r], n))
    if sum(want.values()) != len(items):
        errs.append('总句数 %d ≠ 160' % len(items))
    for f, n in focus_cnt.items():
        if n > 2:
            errs.append('focus %s 句数 %d >2' % (f, n))
    if errs:
        print('ERRORS=%d（前 50）' % len(errs))
        for e in errs[:50]:
            print(' -', e.encode('unicode_escape').decode() if os.environ.get('GBK') else e)
        sys.exit(1)
    print('SENTENCES PASS: 160 句全过子集铁律')

if __name__ == '__main__':
    main()
