# -*- coding: utf-8 -*-
"""wordprob 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch13/wordprob/_src/build.py
r13（2026-09-15 难度改造）：两步应用题题库（wor_tpl2_* 38 段+wor_n_21..35）；
拼接=4 个 script 块（core / clips / data+engine+main / **verify 独立第 4 块**——
并入第 3 块会使页内源码断言自匹配恒真，判别力归零，禁回退）；
estMs 四方字面同步之 build 侧：源常量与 verify 侧都必须含 's.length * 345 + 600' 字面。"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch13/wordprob/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（wor_* 基础 39 条+模板段 wor_tpl2_ 38 条在场；旧 wor_tpl_ 24 条已退役出注入）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('wordprob')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: wordprob clips 注入失败:', e)
    sys.exit(3)
for must in ('wor_hint', 'wor_wrong', 'wor_tut_watch', 'wor_tut_turn', 'wor_n_20',
             'wor_n_35', 'wor_tpl2_bus1_1', 'wor_tpl2_candy2_4'):
    if ('"%s"' % must) not in clips:
        print('FATAL: wordprob clips 注入不完整（缺 %s）' % must)
        sys.exit(3)

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 3（r13）：estMs 家族四方字面同步——源常量（data）与 verify 断言侧都必须含字面
EST_LITERAL = 's.length * 345 + 600'
assert EST_LITERAL in data, 'game-data.js 缺 estMs 定版字面 ' + EST_LITERAL
assert EST_LITERAL in verif, 'game-verify.js 缺 estMs 独立副本字面 ' + EST_LITERAL

# 硬性检查 4（r13）：时长模型常量在场（门禁静态断言——verify ⑭ 另有运行时对账）
for token in ('DECIDE_MS', 'LEVEL_MIN_MS = 40000', 'ADV_MS = 880', 'WRONG_CHAIN_WIN = 4200'):
    assert token in data, 'game-data.js 缺时长模型常量 %s' % token

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +          # verify 独立第 4 块（r13 定版）
        '</body>\n</html>\n')

# 硬性检查 5：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

# 家族 F（r13 审查 M1/试玩 P2-1 修复配套断言）：nextHint 生成关实算下一关难度章，
# 禁章序取模推进形态（取模与 seeded 随机 dch 仅 1/4 相符——grid 为范本）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'nextHint 生成关须实算 genLevel(f+1).dch'
assert 'GEN_HINTS[(ci + 1) % 4]' not in main and 'GEN_HINTS[(ci+1)%4]' not in main, '禁 GEN_HINTS 取模推进形态'

OUT.write_text(html, encoding='utf-8')
n_tpl2 = html.count('wor_tpl2_')
n_blocks = html.count('<script>')
print('OK written:', OUT, len(html), 'chars (script blocks=%d, wor_tpl2_ refs=%d)' % (n_blocks, n_tpl2))
