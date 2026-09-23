# -*- coding: utf-8 -*-
"""Task#46 阶段1 — 动态域族枚举（quiz/poemfill/timecalc/spellen/sentorder/idiom 六域）
产物: keys_t46.json（{key: {"text":..., "games":[...]}}），供 voice/gen_clips.py 读入注册。
零手抄：全部文案从各款 _src 源表正则提取 / 模板逻辑照抄源码（注释标真值源行号）。
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))          # kids-games/

def rd(*parts):
    return open(os.path.join(ROOT, *parts), encoding='utf-8').read()

m = {}

# ============ quiz（batch20：题库 160 + 选项串 160 + 类别 4 + 纠错 1）============
qs = rd('batch20', 'quiz', '_src', 'game-data.js')
bank = re.findall(r'\{ "cat": (\d), "q": "([^"]+)", "opts": \[([^\]]+)\]', qs)
assert len(bank) == 160, 'QZ_BANK 提取应 160 题: %d' % len(bank)
for i, (cat, q, opts) in enumerate(bank, 1):
    m['qz_q_%d' % i] = {'text': q, 'games': ['quiz']}
    ol = re.findall(r'"([^"]+)"', opts)
    assert len(ol) == 4, 'qz opts 应 4 项: %d' % len(ol)
    m['qz_opts_%d' % i] = {'text': '选项有：' + '，'.join(ol), 'games': ['quiz']}
cats = re.search(r"CATS = \{([^}]+)\}", qs).group(1)
cats = re.findall(r"\d:\s*'([^']+)'", cats)
assert len(cats) == 4, 'CATS 提取应 4: %d' % len(cats)
for i, c in enumerate(cats, 1):
    m['qz_cat_%d' % i] = {'text': '这是' + c + '的题目', 'games': ['quiz']}
m['qz_no'] = {'text': '这个不对', 'games': ['quiz']}

# ============ poemfill（batch17：诗行 30×4 + 飞花令 3×2）============
ps = rd('batch17', 'poemfill', '_src', 'game-data.js')
rows = re.findall(r"^  (\w+):\s*\{ title: '[^']+',\s*author: '[^']+',\s*lines: \[([^\]]+)\] \}", ps, re.M)
assert len(rows) == 30, 'POEMS 提取应 30 首: %d' % len(rows)
for pid, ls in rows:
    lines = re.findall(r"'([^']+)'", ls)
    assert len(lines) == 4, '%s 诗行应 4: %d' % (pid, len(lines))
    for n, ln in enumerate(lines):
        m['pf_l_%s_%d' % (pid, n)] = {'text': ln, 'games': ['poemfill']}
ff = re.search(r"FF_CHARS = \[([^\]]+)\]", ps).group(1)
ff = re.findall(r"'([^']+)'", ff)
assert len(ff) == 3, 'FF_CHARS 应 3 字: %d' % len(ff)
for c in ff:
    m['pf_ff_q_%s' % c] = {'text': '找一找有「%s」字的诗句' % c, 'games': ['poemfill']}
    m['pf_ff_c_%s' % c] = {'text': c, 'games': ['poemfill']}

# ============ timecalc（batch20：拆段 218 键——时刻整句 144 + 词/骨架段）============
ts = rd('batch20', 'timecalc', '_src', 'game-data.js')
CN = re.search(r"const CN = \[([^\]]+)\]", ts).group(1)
CN = re.findall(r"'([^']+)'", CN)
assert len(CN) == 10
WEEK = re.search(r"const WEEK = \[([^\]]+)\]", ts).group(1)
WEEK = re.findall(r"'([^']+)'", WEEK)
assert len(WEEK) == 7
ACTS = re.search(r"const ACTS = \[([^\]]+)\]", ts).group(1)
ACTS = re.findall(r"'([^']+)'", ACTS)
assert len(ACTS) == 10

def cn_num(n):   # 源 cnNum：n<10→'零X'；10→'十'；<20→'十X'；X十(Y)
    if n < 10: return '零' + CN[n]
    if n == 10: return '十'
    if n < 20: return '十' + CN[n % 10]
    return CN[n // 10] + '十' + (CN[n % 10] if n % 10 else '')
def cn_hour(h):  # 源 cnHour
    return CN[h] if h < 10 else cn_num(h)
def cn_time(h, mm):   # 源 cnTime
    return cn_hour(h) + '点' + ('整' if mm == 0 else (('零' + CN[mm]) if mm < 10 else cn_num(mm)) + '分')

G = 'timecalc'
for i, w in enumerate(WEEK):
    m['tc_w_%d' % i] = {'text': w, 'games': [G]}
M5 = list(range(0, 60, 5))
for h in range(1, 13):
    for mm in M5:
        m['tc_t_%d_%d' % (h, mm)] = {'text': cn_time(h, mm), 'games': [G]}
for h in range(1, 13):                     # night 裸小时（'晚上X时睡觉'）
    m['tc_hn_%d' % h] = {'text': cn_hour(h), 'games': [G]}
for n in range(5, 80, 5):                  # 再过 N 分钟（cnNum 裸数；09-19 A4 上报：生成关 flat≥40 elapse dur 域到 75，60-75 补 4 键）
    m['tc_num_%d' % n] = {'text': cn_num(n), 'games': [G]}
for n in range(1, 11):                     # 再过 N 天（cnOf；10 源串 '10'→中文'十'同音）
    m['tc_d_%d' % n] = {'text': CN[n] if n < 10 else '十', 'games': [G]}
for i, a in enumerate(ACTS):
    m['tc_act_%d' % i] = {'text': a, 'games': [G]}
# 引导句 4（game-main.js L520/534 guide 变量域，源字面）
for k, t in (('cal', '先看一看日历'), ('clock', '先看一看钟'),
             ('sched', '先看一看作息表'), ('night', '先看一看睡觉起床的时间')):
    m['tc_guide_%s' % k] = {'text': t, 'games': [G]}
# 整句题面 2（clock5/sched-longest 无动态段）
m['tc_k_clock5'] = {'text': '看看钟，现在是几点几分？', 'games': [G]}
m['tc_k_long'] = {'text': '作息表里，哪个活动用的时间最长？', 'games': [G]}
# 骨架段（askText 十型拆段，源 game-main.js askText 各 return 原文）
for k, t in (
    ('now', '现在是'), ('pass', '，再过'), ('minend', '分钟，是几点几分？'),
    ('today', '今天是'), ('dq', '天，是星期几？'), ('dq2', '天前，是星期几？'),
    ('from', '从'), ('to', '到'), ('span', '，不算出发的那天，要经过几天？'),
    ('pm', '下午'), ('start', '开始，过'), ('mid', '分钟，过了半夜十二点，是星期几的几点几分？'),
    ('sleep', '时睡觉，早上'), ('wake', '时起床，睡了几个小时？'),
    ('sched', '作息表里，'), ('durl', '用了多长时间？'), ('find', '开始的活动是什么？'),
    # 09-19 A4 上报 4 缺段：compd/night 题面句首「晚上」+span/night/sched-dur 选项单位词（ch2/ch3/ch4 实测回退 12 次）
    ('eve', '晚上'), ('day', '天'), ('hour', '小时'), ('min', '分钟')):
    m['tc_s_%s' % k] = {'text': t, 'games': [G]}

# ============ spellen（batch16：60 词字母名串 'c、a、t'）============
ss = rd('batch16', 'spellen', '_src', 'game-data.js')
SPW = re.findall(r"const WORDS60 = \{([^}]+)\}", ss)
assert SPW, 'spellen WORDS60 表未定位'
words = re.findall(r"'([^']+)'", SPW[0])
assert len(words) == 60, 'spellen 词库应 60: %d' % len(words)
for w in words:
    m['sp_l_%s' % w] = {'text': '、'.join(w), 'games': ['spellen']}

# ============ sentorder（batch34：整句 20 + 词库 54）============
so = rd('batch34', 'sentorder', '_src', 'game-data.js')
sents = re.findall(r"\{ w: \[([^\]]+)\], t: '([^']+)'", so)
assert len(sents) == 20, 'SENT_BANK 应 20 句: %d' % len(sents)
words, seen = [], set()
for i, (wl, t) in enumerate(sents, 1):
    m['so_s_%d' % i] = {'text': t, 'games': ['sentorder']}
    for w in re.findall(r"'([^']+)'", wl):
        if w not in seen:
            seen.add(w); words.append(w)
for i, w in enumerate(words, 1):
    m['so_w_%d' % i] = {'text': w, 'games': ['sentorder']}
assert len(words) == len(seen) and len(words) >= 50, 'sentorder 词库异常: %d' % len(words)

# ============ idiom（batch16：释义 80 + 情境句 80）============
ids = rd('batch16', 'idiom', '_src', 'game-data.js')
rows = re.findall(r"\{\s*i:\s*(\d+),\s*id:\s*'[^']+',\s*ch:\s*\d+,\s*near:\s*\d+,\s*\n\s*say:\s*'([^']+)',\s*ctx:\s*'([^']+)'", ids)
assert len(rows) == 80, 'IDIOMS 提取应 80 条: %d' % len(rows)
for idx, say, ctx in rows:
    m['idm_def_%s' % idx] = {'text': say, 'games': ['idiom']}
    m['idm_ctx_%s' % idx] = {'text': ctx, 'games': ['idiom']}

json.dump(m, open(os.path.join(HERE, 'keys_t46.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('keys_t46.json: %d keys' % len(m))
from collections import Counter
print(Counter(v['games'][0] for v in m.values()))
