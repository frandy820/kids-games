# -*- coding: utf-8 -*-
"""gen_clips 提取口径实测（SPEC-ZILEARN §R3 给段二的正则——在此实测锁死）"""
import io, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
src = open('game-data.js', encoding='utf-8').read()

# ① zi_ch_ 150：CHARS 表（键=汉字字面，值含 py/words）
CH_RE = re.compile(r'"([^"]+)": \{ py: "([a-z0-9]+)", pyFull: "[^"]*", chNo: \d+, words: \[\["([^"]+)", "[^"]*"\]')
ch = CH_RE.findall(src)
assert len(ch) == 150 and len(set(p for _, p, _ in ch)) == 150, len(ch)
items = [('zi_ch_' + py, '%s，%s的%s' % (c, w, c)) for c, py, w in ch]
print('zi_ch_: %d keys, unique %d; sample %s' % (len(items), len(set(k for k, _ in items)), items[:2]))

# ② zi_st_ 20：SENTENCES 表段（表内正则，天然避开 LEVELS 双写）
seg = src[src.index('const SENTENCES'):src.index('const REVIEW_SCHED')]
ST_RE = re.compile(r'\{"text": "([^"]+)", "afterFlat": (\d+)')
st = ST_RE.findall(seg)
assert len(st) == 20 and [int(f) for _, f in st] == list(range(20)), st[:3]
items += [('zi_st_' + f, t) for t, f in st]
print('zi_st_: 20 keys; sample %s' % (items[150],))

# ③ 通用 8：VOICE 表字面
V8 = [('zi_tut_watch', '看！来认识新字啦'), ('zi_tut_turn', '你来点一点'), ('zi_hint', '想一想，再选一选'),
      ('zi_right', '答对啦，真棒'), ('zi_wrong', '不对哦，再想一想'), ('zi_listen', '听一听，找一找'),
      ('zi_word', '选一选'), ('zi_quiz', '小测时间到')]
for k, t in V8:
    assert "'%s'" % k in src and "text: '%s'" % t in src, k
items += V8
print('total keys: %d (expect 178); all unique: %s' % (len(items), len(set(k for k, _ in items)) == 178))
