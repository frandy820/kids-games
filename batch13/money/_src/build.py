# -*- coding: utf-8 -*-
"""money 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch13/money/_src/build.py
r15（2026-09-16 难度改造，AUDIT-78:80）：ch1 起步含 5 角 / 找零改数字键盘（去 3 选 1）/
加「买两件合计」/ 多币组合；语音新 3 键 men_q_buy_j/men_q_and/men_q_and_j（既有 30 键一字不改）；
拼接=4 个 script 块（core / clips / data+engine+main / **verify 独立第 4 块**——
并入第 3 块会使页内源码断言自匹配恒真，判别力归零，禁回退）；
estMs 四方字面同步之 build 侧：源常量与 verify 侧都必须含 's.length * 345 + 600' 字面。
注入失败必须 sys.exit(3)，禁降级空串构建"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch13/money/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（r15 后 men_* 33 条：既有 30+新 3；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('money')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: money clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言：hint/数词 20（修复版）/带角拼接单元/键盘题面三段/r15 新 3 键
for must in ('men_hint', 'men_n_20', 'men_q_jiao', 'men_q_buy_j', 'men_q_and', 'men_q_and_j'):
    if ('"%s"' % must) not in clips:
        print('FATAL: money clips 注入不完整（缺 %s）' % must)
        sys.exit(3)

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 3（r15）：estMs 家族四方字面同步——源常量（data）与 verify 断言侧都必须含字面
EST_LITERAL = 's.length * 345 + 600'
assert EST_LITERAL in data, 'game-data.js 缺 estMs 定版字面 ' + EST_LITERAL
assert EST_LITERAL in verif, 'game-verify.js 缺 estMs 独立副本字面 ' + EST_LITERAL

# 硬性检查 4（r15）：时长模型常量在场（门禁静态断言——verify ⑧ 另有运行时对账+最低精确防回漂）
for token in ('const DECIDE_MS = { gather: 12000, pair: 15000, change: 13000, jiao: 16000 }',
              'const LEVEL_MIN_MS = 40000', 'const TAP_MS = 1500',
              'const CONFIRM_MS = 2000', 'const ADV_MS = 880'):
    assert token in data, 'game-data.js 缺时长模型常量 %s' % token

# 硬性检查 5（r15 家族 F）：nextHint 生成关实算下一关难度章，禁章序取模推进形态
# （r14 坑：禁式断言连带注释措辞——含注释在内整个 main 不得出现禁式字面）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'nextHint 生成关须实算 genLevel(f+1).dch'
assert "querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')" in main, \
    '救援 interval 缺契约 K 面板守卫（r15 审查 M1——fraction/column 同批已带）'
assert 'GEN_HINTS[(ci + 1) % 4]' not in main, 'main 禁 GEN_HINTS 取模推进形态（带空格）'
assert 'GEN_HINTS[(ci+1)%4]' not in main, 'main 禁 GEN_HINTS 取模推进形态（无空格）'
assert 'CHAPTERS[(ci + 1) % 4]' not in main, 'main 禁 CHAPTERS 取模预告形态'

# 硬性检查 6（r15）：CHAPTERS 表字面锚（hint=预告下一章语义，SPEC §1 r15 定稿）
for hint_lit in ("hint: '两样东西一起买'", "hint: '付钱以后，找回零钱'",
                 "hint: '五角钱来啦'", "hint: '新一轮付钱挑战'"):
    assert hint_lit in data, 'game-data.js CHAPTERS 缺 hint 字面锚 ' + hint_lit

# 硬性检查 7（r15）：键盘引擎契约字面（判定只在确认/位数上限/空输入同口径）
for token in ('function engKey(', 'function engConfirm(', "k === 'jiao'",
              'q.digits.length >= 2', "q.digits === '' ? -1"):
    assert token in engine, 'game-core.js 缺键盘契约字面 %s' % token

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +          # verify 独立第 4 块（r15 定版）
        '</body>\n</html>\n')

# 硬性检查 8：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

# 硬性检查 9：verify 独立第 4 块自证（n_scripts==4 由 verify ⑨ 运行时再断言）
assert html.count('<script>') == 4, 'script 块数应为 4（verify 独立第 4 块）'
assert 'runVerify' not in data + engine + main, 'script[2] 不得含 runVerify（verify 独立块）'

OUT.write_text(html, encoding='utf-8')
n_men = html.count('men_')
print('OK written:', OUT, len(html), 'chars (script blocks=4, men_ refs=%d)' % n_men)
