# -*- coding: utf-8 -*-
"""timecalc 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch20/timecalc/_src/build.py
语音 clip 已全部合成在场（timecalc 232 条 tc_=r16 基础 7+T46 阶段2 拆段 225 含 09-19 补 8，manifest games:['timecalc']）：
注入失败必须 sys.exit(3)，禁降级空串构建。
core_ 3 条（章末/日末/休息）manifest games 已含 timecalc → core.js play(key,text)
自带 TTS 兜底（SPEC-BATCH15 §0.13），不阻塞构建。
r16 断言：estMs 四方字面同步 / verify 独立第 4 script 块 / 家族 F 双断言 /
契约 K 面板守卫逐字 / 时长模型定版字面。"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch20/timecalc/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（tc_ 232 条已合成在场=r16 基础 7+T46 拆段 225 含 09-19 补 8；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('timecalc')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: timecalc clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言（T46 阶段2：7 条 r16 基础 + 217 拆段全族——星期 7/时刻词 144/裸小时 12/
# 分钟数 11/天数 10/活动名 10/引导句 4/整句题面 2/骨架段 17；tc_s_comma 纯标点已剔除不注入）
MUST = (['tc_tut_watch', 'tc_tut_turn', 'tc_hint', 'tc_hint2', 'tc_right', 'tc_wrong', 'tc_wrong2'] +
        ['tc_w_%d' % d for d in range(7)] +
        ['tc_t_%d_%d' % (h, m) for h in range(1, 13) for m in range(0, 60, 5)] +
        ['tc_hn_%d' % h for h in range(1, 13)] +
        ['tc_num_%d' % n for n in range(5, 60, 5)] +
        ['tc_d_%d' % n for n in range(1, 11)] +
        ['tc_act_%d' % i for i in range(10)] +
        ['tc_guide_cal', 'tc_guide_clock', 'tc_guide_sched', 'tc_guide_night',
         'tc_k_clock5', 'tc_k_long'] +
        ['tc_s_%s' % k for k in ('now', 'pass', 'minend', 'today', 'dq', 'dq2', 'from', 'to',
                                 'span', 'pm', 'start', 'mid', 'sleep', 'wake', 'sched',
                                 'durl', 'find')])
for must in MUST:
    if ('"%s"' % must) not in clips:
        print('FATAL: timecalc clips 注入不完整（缺 %s）' % must)
        sys.exit(3)
# 条数断言：恰 235 条（tc_ 232 含 09-19 补 tc_s_eve/day/hour/min+tc_num_60-75 + core_ 3）
n_audio = clips.count('data:audio/mpeg')
if n_audio != 235:
    print('FATAL: timecalc clips 条数 %d != 235' % n_audio)
    sys.exit(3)

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链（拼接后执行）

# 硬性检查 4（r15/r16）：estMs 家族四方字面同步——源常量（data）与 verify 断言侧
# 都必须含 's.length * 345 + 600' 字面（注释侧数字须 345n+600 实算形——r15 m1 教训）
EST_LITERAL = 's.length * 345 + 600'
assert EST_LITERAL in data, 'game-data.js 缺 estMs 定版字面 ' + EST_LITERAL
assert EST_LITERAL in verif, 'game-verify.js 缺 estMs 独立副本字面 ' + EST_LITERAL
assert 'const estMs = s => s.length * 345 + 600' in data, 'data 侧 estMs 常量形态漂移'
assert 'const LEVEL_MIN_MS = 40000' in data, 'LEVEL_MIN_MS=40000 门禁字面缺失'
assert 'durMin >= 40000' in verif, 'verify 侧 modeled 下限 40000 分源字面缺失'
# 时长模型定版常量在场（r16 DECIDE 分型）
for tok in ('DECIDE_MS', 'sched_dur: 16000', 'compd: 19000', 'const TAP_MS = 1500',
            'const ADV_MS = 880', 'const ENTER_MS = 400', 'const TAIL_MS = 300',
            'quizDurMs', 'levelDurMs'):
    assert tok in data, 'game-data.js 缺时长模型字面: ' + tok
# modeled 最低精确断言在 verify（91040@flat0 双钉之一；另一钉=verify_one_timecalc Python 第三源）
assert 'durMin === 91040' in verif, 'verify 侧 modeled 最低精确断言缺失'

# 硬性检查 5（家族 F，r13 三犯教训）：章末预告 CHAPTERS[i].hint=第 i+1 章预告
# （禁写本章自己内容——poemfill P2-3）；生成关 nextHint 实算下一关难度章
# （禁取模推进形态；注释里也不得出现禁戒字面——r14 坑①）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '生成关预告须实算（家族 F）'
for banned in ('CHAPTERS[(ci + 1) % 4]', 'CHAPTERS[(ci+1)%4]',
               'GEN_HINTS[(ci + 1) % 4]', 'GEN_HINTS[(ci+1)%4]',
               'GEN_HINTS[ci % 4]', 'GEN_HINTS[ci%4]'):
    assert banned not in main, '禁式字面出现在 game-main.js: ' + banned
# CHAPTERS 表内容防回漂锚（家族 F：预告下一章语义）
assert "1: { name: '五分钟刻', hint: '过几天是星期几' }" in data
assert "2: { name: '过几天',   hint: '时钟和日历一起算' }" in data
assert "3: { name: '跨日跨周', hint: '读一读作息表' }" in data
assert "4: { name: '作息表',   hint: '时间小达人混合作战' }" in data

# 硬性检查 6（契约 K，r13 试玩 P2-4/5）：救援 interval 头部面板守卫逐字
K_GUARD = "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;"
assert K_GUARD in main, '救援 interval 缺契约 K 面板守卫'

# 硬性检查 7（r16）：CH_LEN=8 + 键基恒定（LEVELS_PER_CH=10 非 CH_LEN）+ 脏键守卫 IIFE
assert 'const CH_LEN = 8;' in data, 'CH_LEN=8（r16 5→8）字面缺失'
assert 'const LEVELS_PER_CH = 10;' in data, 'LEVELS_PER_CH=10 键基恒定字面缺失'
assert 'kidsgame_timecalc' in main, '旧档脏键守卫 IIFE 缺失'
# 每关 8 题：renderStep 循环上限须随 CH_LEN（字面锚）
assert 'for (let k = 0; k < CH_LEN; k++) {' in main

# 硬性检查 8（r16）：verify 独立第 4 script 块（b37 R4 对称：script[2] 纯游戏逻辑）
# （拼接后 html.count('<script>')==4 在拼接处断言）

# 硬性检查 9（r16）：新题型关键函数/容器在场
for tok in ['genClock5Quiz', 'genElapseQuiz', 'genCompQuiz', 'genCompdQuiz',
            'genNightQuiz', 'genSchedQuiz', 'sched-box', 'night-box']:
    assert tok in engine or tok in data or tok in head or tok in main, 'r16 新题型件缺失: ' + tok
for tok in ['tc_hint2', 'tc_wrong2', 'hintOf', 'wrongOf', 'uiTapRow']:
    assert tok in data or tok in main, 'r16 分型语音/表行朗读缺失: ' + tok

# 竖屏三件套（r16）：@media 通道 + body.port 类通道双在场
assert '@media (orientation:portrait)' in head, '竖屏 @media 通道缺失'
assert 'body.port .card{width:98px' in head, 'body.port 竖屏类通道缺失（与 @media 逐条等值）'

# ⑪b 竖屏逐行对账（r16 审查 T-m2/S-m2 补齐，idiom build 同款）：port 段去前缀后与 @media 段逐行全等
assert '/*PORT-CLS*/' in head, 'head 缺 PORT-CLS 标记段'
_i = head.index('@media (orientation:portrait){')
_j = head.index('\n}', _i)
_media = [ln.strip() for ln in head[_i + len('@media (orientation:portrait){'): _j].splitlines() if ln.strip()]
_k = head.index('/*PORT-CLS*/') + len('/*PORT-CLS*/')
_l = head.index('/*PORT-CLS-END*/')
_port = [ln.strip() for ln in head[_k:_l].splitlines() if ln.strip()]
assert len(_media) >= 10 and [ln.replace('body.port ', '') for ln in _port] == _media, \
    '竖屏双通道两段不等值（@media %d 行 vs port %d 行）' % (len(_media), len(_port))


html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3（拼接后实际执行）：完全离线
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

# 硬性检查 8：script 块数恰 4（core/clips/游戏/verify）
n_scripts = html.count('<script>')
assert n_scripts == 4, f'script 块数 {n_scripts} != 4（verify 须独立第 4 块）'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
