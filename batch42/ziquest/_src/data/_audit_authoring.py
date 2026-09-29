# -*- coding: utf-8 -*-
"""Phase 0c 机扫审计：7 区 chars-r*.json 教研字段全量校验 + pyKey 跨文件同音重排。
用法：python _audit_authoring.py          # 只审计（0 退出=全过）
      python _audit_authoring.py --fix    # 审计+pyKey 全局重排写回（重排后重跑审计确认 0）
依赖：pypinyin（words 注音一致性校验）；未装则该项降级为跳过并声明。"""
import json, os, re, sys, unicodedata

DATA = os.path.dirname(__file__)
FILES = ['chars-r%d.json' % i for i in range(1, 8)]
FN = list(json.load(open(os.path.join(DATA, 'chars-function.json'), encoding='utf-8'))['chars'])

try:
    from pypinyin import lazy_pinyin, Style
    HAS_PP = True
except ImportError:
    HAS_PP = False

def load_all():
    chars = []
    for f in FILES:
        for c in json.load(open(os.path.join(DATA, f), encoding='utf-8'))['chars']:
            c['_file'] = f
            chars.append(c)
    return chars

def audit(chars, verbose=True):
    errs, warns = [], []
    seen = set()
    for c in chars:
        ch = c.get('ch')
        loc = '%s:%s' % (c['_file'], ch)
        if ch in seen:
            errs.append('%s 重复出现' % loc)
        seen.add(ch)
        # 必填字段
        for k in ('py', 'pyKey', 'tone', 'words', 'glyph', 'distract'):
            if k not in c or c[k] in (None, '', []):
                errs.append('%s 缺字段 %s' % (loc, k))
                continue
        # words：[[word,py],...] 2-3 对，词0 必含本字，词长 2-3 字
        w = c.get('words') or []
        if w and (len(w) < 2 or len(w) > 3):
            errs.append('%s words 数量 %d 不在 2-3' % (loc, len(w)))
        wt = []
        for pair in w:
            word = pair[0] if isinstance(pair, list) else pair
            wt.append(word)
            if not (2 <= len(word) <= 3):
                errs.append('%s 词 `%s` 长度异常' % (loc, word))
        if wt and ch not in wt[0]:
            errs.append('%s words[0]=`%s` 不含本字' % (loc, wt[0]))
        if len(set(wt)) != len(wt):
            errs.append('%s words 重复 %s' % (loc, wt))
        # glyph：≤40 字符，禁常见术语
        g = c.get('glyph') or ''
        if len(g) > 40:
            errs.append('%s glyph %d 字超40' % (loc, len(g)))
        for bad in ('声旁', '形旁', '部首', '音韵', '六书'):
            if bad in g:
                errs.append('%s glyph 含术语 `%s`' % (loc, bad))
        # distract：[[字,理由],...] 恰 3 对，各≠本字、互不重复、理由合法、禁干扰含本字/本字含干扰
        d = c.get('distract') or []
        dt = [p[0] if isinstance(p, list) else p for p in d]
        dr = [p[1] if isinstance(p, list) and len(p) > 1 else '' for p in d]
        if len(d) != 3:
            errs.append('%s distract 数 %d ≠3' % (loc, len(d)))
        for x in dt:
            if x == ch:
                errs.append('%s distract 含本字' % loc)
        if len(set(dt)) != len(dt):
            errs.append('%s distract 重复 %s' % (loc, dt))
        for r in dr:
            if r not in ('形近', '同声旁', '同类'):
                errs.append('%s distract 理由 %r 不合法' % (loc, r))
        # 干扰字须是单汉字且在 400 字表或常用区（宽松：单 CJK 即可）
        for x in dt:
            if not (len(x) == 1 and '一' <= x <= '鿿'):
                errs.append('%s distract %r 非单汉字' % (loc, x))
        # 虚词禁入区域表
        if ch in FN:
            errs.append('%s 是虚词白名单字，禁入区域表' % loc)
        # pyKey 格式：拼音无声调 + 可选序号（组内第 1 裸 base、第 2 起 base2/base3，全局重排统一）
        pk = c.get('pyKey') or ''
        if not re.match(r'^[a-z]+[0-9]*$', pk):
            errs.append('%s pyKey `%s` 格式异常' % (loc, pk))
        # tone（5=轻声：么 me/得 de 类）
        if c.get('tone') not in (1, 2, 3, 4, 5):
            errs.append('%s tone=%r 异常' % (loc, c.get('tone')))
        # py 带调校验（py 形如 tian1 或 tiān？规范=带调拼音串）
        if not c.get('py'):
            pass
    # 跨字检查：distract 全集不含虚词白名单？虚词作干扰是允许的（更安全：允许）
    # 总账
    if len(chars) != 378:
        errs.append('区域字总数 %d ≠ 378' % len(chars))
    # words 注音一致性：本字在词中读音 == py。双通道：代理词拼音[1] 直接比 + pypinyin 交叉验证（NFD 去调比较）
    def toneless(s):
        return ''.join(x for x in unicodedata.normalize('NFD', s) if not unicodedata.combining(x)).replace('ü', 'v')
    for c in chars:
        ch, py = c['ch'], c.get('py', '')
        if not py:
            continue
        for pair in (c.get('words') or []):
            word, wpy = (pair[0], pair[1]) if isinstance(pair, list) else (pair, '')
            if ch not in word:
                continue
            idx = word.index(ch)
            # 通道1：代理给的词拼音
            if wpy:
                syl = wpy.replace('，', ' ').split()
                if idx < len(syl) and toneless(syl[idx]) != toneless(py):
                    errs.append('%s:%s 词`%s`标注音 %s ≠ py %s' % (c['_file'], ch, word, syl[idx], py))
            # 通道2：pypinyin（轻声/变调会误报，仅警示）
            if HAS_PP:
                syl2 = lazy_pinyin(word, style=Style.TONE, errors='ignore')
                if idx < len(syl2) and toneless(syl2[idx]) != toneless(py):
                    warns.append('%s:%s 词`%s` pypinyin=%s vs py=%s（轻声/变调可接受）' % (c['_file'], ch, word, syl2[idx], py))
    else:
        warns.append('pypinyin 未装：words 注音一致性降级跳过')
    return errs, warns

def repykey(chars):
    """pyKey 全局重排：同无声调拼音组内按（区域文件序, order）首现——第 1 个=裸 base，第 n 个=base+n（与代理约定一致）。"""
    groups = {}
    for c in chars:
        base = re.sub(r'[0-9]+$', '', c.get('pyKey') or '')
        if not base:
            continue
        groups.setdefault(base, []).append(c)
    for base, lst in groups.items():
        for i, c in enumerate(lst):
            c['pyKey'] = base if i == 0 else base + str(i + 1)
    # 唯一性断言
    pks = [c['pyKey'] for c in chars]
    assert len(set(pks)) == len(pks), 'pyKey 重排后仍有重复'
    return chars

def main():
    fix = '--fix' in sys.argv
    chars = load_all()
    if fix:
        chars = repykey(chars)
        for f in FILES:
            sub = [dict(c) for c in chars if c['_file'] == f]
            for c in sub:
                c.pop('_file', None)
            path = os.path.join(DATA, f)
            doc = json.load(open(path, encoding='utf-8'))
            assert doc.get('chars') is not None
            doc['chars'] = sub
            json.dump(doc, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    errs, warns = audit(load_all())
    for w in warns:
        print('WARN:', w)
    if errs:
        print('ERRORS=%d（前 60 条）' % len(errs))
        for e in errs[:60]:
            print(' -', e)
        sys.exit(1)
    print('AUDIT PASS: 378 字全过' + ('（含 pyKey 重排写回）' if fix else '') + ('；注音校验=%s' % ('on' if HAS_PP else 'SKIP')))

if __name__ == '__main__':
    main()
