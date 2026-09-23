# -*- coding: utf-8 -*-
"""poemfill 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch17/poemfill/_src/build.py
r13 难度改造（2026-09-15）：诗库 10→30（整首朗读 clip 10→30）、题型升整句回忆、时长模型门禁。
语音 clip 已全部合成在场（poemfill 165 条=pf_ 中文 6+pf_poem_* 整首朗读 30+
T46 诗句行 pf_l_* 120+飞花令 pf_ff_* 6+core 共享 3，由主会话注入 manifest
games:['poemfill']）：注入失败必须 sys.exit(3)，禁降级空串构建。
script 块布局（r13 任务书纪律②）：core(1) / clips(2) / data+engine+main(3) / verify 独立(4)
——verify 并入 script[3]=页内源码断言自匹配恒真（b31 教训）。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch17/poemfill/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（165 条已合成在场；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('poemfill')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: poemfill clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言：6 条 pf 中文句 + 30 首整首朗读 + core 3 条全列（SPEC-BATCH17 §1-r13）
MUST = ('pf_tut_watch', 'pf_tut_turn', 'pf_hint', 'pf_right', 'pf_wrong', 'pf_first',
        'pf_poem_yie', 'pf_poem_jys', 'pf_poem_cx', 'pf_poem_mn', 'pf_poem_dgjl',
        'pf_poem_cs', 'pf_poem_jx', 'pf_poem_wlsbp', 'pf_poem_zwl', 'pf_poem_jgsh',
        # r13 新 20 首（部编/人教一二年级课标；出处登记 SPEC-BATCH17 §1-r13 诗目表）
        'pf_poem_hua', 'pf_poem_glyx', 'pf_poem_feng', 'pf_poem_xyze', 'pf_poem_xich',
        'pf_poem_huaj', 'pf_poem_yess', 'pf_poem_meih', 'pf_poem_xec', 'pf_poem_cunj',
        'pf_poem_yl', 'pf_poem_cao', 'pf_poem_xjc', 'pf_poem_mnq', 'pf_poem_zys',
        'pf_poem_sjian', 'pf_poem_zlj', 'pf_poem_shx', 'pf_poem_sxg', 'pf_poem_jj2',
        'core_chapter_end', 'core_day_end', 'core_rest')
for must in MUST:
    if ('"%s"' % must) not in clips:
        print('FATAL: poemfill clips 注入不完整（缺 %s）' % must)
        sys.exit(3)
# 条数断言：恰 165 条（core 3+pf 中文 6+pf_poem 30+T46 pf_l_ 120 行+pf_ff_ 6——
# SPEC-BATCH17 §1-r13 口径+Task#46 阶段2 增量；键名含中文 pf_ff_q_<字> 用前缀计数）
n_audio = clips.count('data:audio/mpeg')
n_pf_l = len(re.findall(r'"pf_l_[a-z0-9]+_\d+"', clips))
n_pf_ff = len(re.findall(r'"pf_ff_[a-z]+_[^"]+"', clips))
if n_audio != 165 or n_pf_l != 120 or n_pf_ff != 6:
    print('FATAL: poemfill clips 条数 %d != 165（pf_l %d/120，pf_ff %d/6）' %
          (n_audio, n_pf_l, n_pf_ff))
    sys.exit(3)

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# ---- r13 静态断言（时长模型四层同步之一：build 字面层） ----
# ① estMs 全字符口径（家族 T 定版；verify estMsV 断言+源常量+注释四方同步）
assert 'const estMs = s => s.length * 345 + 600;' in data, 'data 缺 estMs 全字符口径字面定义'
def _est(n):
    return n * 345 + 600
assert _est(5) == 2325 and _est(7) == 3015 and _est(11) == 4395, 'estMs 静态验算失败'
# ② DECIDE_MS/LEVEL_MIN_MS 字面（7-8 岁整句回忆口径；verify V_DECIDE 对账）
assert 'const DECIDE_MS = { fnext: 9000, fprev: 10000, order: 11000, feihua: 12000 };' in data, \
    'data 缺 DECIDE_MS r13 定版字面'
assert 'const LEVEL_MIN_MS = 40000;' in data, 'data 缺 LEVEL_MIN_MS 40000 字面'
# ③ 模型函数链在场（advMs/stepVoiceMs/quizDurMs/levelDurMs——verify ⑭ parity 对账目标）
for tok in ('const advMs = q => RIGHT_WAIT + estMs(winLineOf(q)) + LINE_TAIL;',
            'const stepVoiceMs = (q, k) => k === 0 ? (ENTER_MS + estMs(cueSayOf(q)) + 300) : STAGE_MS;',
            'const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);'):
    assert tok in data, 'data 缺时长模型函数链: %s' % tok[:40]
# ④ 诗库 30 首 + 关诗映射 15（r13 出题域；verify REF 双写对账）
assert data.count("title: '") == 30, 'data POEMS 诗目数 != 30（r13 定稿）'
assert "const LEVEL_POEMS = ['jys', 'cx', 'mn', 'glyx', 'hua'," in data, 'data 缺 LEVEL_POEMS r13 定稿'
lp = data.split('const LEVEL_POEMS = ')[1].split('];')[0]
assert len([x for x in lp.replace("'", '').replace(' ', '').split(',') if x]) == 15, 'LEVEL_POEMS != 15 首'
# ⑤ 题型四型在场（F/R/O/FF 构成）
assert "'F', cue: 0" in data and "'R', cue: 3" in data and "'O' }" in data, 'data 缺 COMPOSE 四型构成'
assert "const FF_CHARS = ['飞', '春', '花'];" in data, 'data 缺 FF_CHARS 定稿字面'
# ⑥ verify 独立块素材：estMsV/V_DECIDE/durUnitOk 在场（运行时对账，build 只验结构存在）
assert 'estMsV' in verif and 'V_DECIDE' in verif and 'durUnitOk' in verif, \
    'verify 缺 r13 duration 单元素材'
assert 'dMin === 70625' in verif, 'verify 缺 40 关 modeled 最低值 70625 精确断言（防回漂）'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

# 硬性检查 4：script 块数=4（verify 独立第 4 块——任务书纪律②）
n_scripts = html.count('<script>')
# 家族 F（r13 审查 M1/试玩 P2-2/P2-3 修复配套断言）：nextHint 生成关实算下一关难度章，
# 禁章序取模推进形态；CHAPTERS 表 hint=第 i+1 章预告（契约表——P2-3 防回漂字面锚）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'nextHint 生成关须实算 genLevel(f+1).dch'
assert 'GEN_HINTS[(ci + 1) % 4]' not in main and 'GEN_HINTS[(ci+1)%4]' not in main, '禁 GEN_HINTS 取模推进形态'
assert "1: { name: '连诗句',   hint: '七言诗也来连一连' }" in data, 'CHAPTERS[1].hint 须为第 2 章预告（P2-3 契约表防回漂）'
assert n_scripts == 4, f'script 块数 {n_scripts} != 4（verify 须独立成块）'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
