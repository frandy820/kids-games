# -*- coding: utf-8 -*-
"""hopscotch 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch7/hopscotch/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch7/hopscotch/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（hop_tut_watch/hop_tut_turn/hop_hint + core_* 三条，manifest 对账）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('hopscotch')
except (Exception, SystemExit):
    clips = ''

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 4（r7）：estMs 家族定版字面（n*345+600，禁 +300 变体）——源码级断言在本文件做
# （页内 game-verify 另有数值+toString 断言；game-data 定义 / game-main 注释 / verify / 本处四处同步）
assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面）'
assert '+ 300' not in data, 'estMs 家族禁 +300 变体'

# 硬性检查 5（r7 家族契约）：A=dayEnd 预告传 nextHint(lim - 1)（启动+winFlow 两处）；
# F=生成关预告禁 (ci+1)%N 字面（须实算 GEN_HINTS[genLevel(f+1).dch-1]）
assert main.count('nextHint(lim - 1)') >= 2, '家族契约 A：dayEnd 预告须传 nextHint(lim - 1) 两处'
assert '(ci + 1) %' not in main and '(ci+1)%' not in main, '家族契约 F：禁 (ci+1)% 字面'
# r7 审查 M1：静态分支章末预告=CHAPTERS[floor(f/CH_LEN)+1]（SPEC §0.4）；禁原 off-by-one 式
assert 'CHAPTERS[Math.floor(f / CH_LEN) + 1].hint' in main, '家族契约：静态章末预告式漂移'
assert 'CHAPTERS[Math.floor((f + 1) / CH_LEN) + 1].hint' not in main, '禁 off-by-one 章末预告式（M1）'
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '家族契约 F：生成关预告须实算 genLevel(f+1).dch'

# 硬性检查 6（r7 玩法契约）：六章 span/跳2/藏格关键字面在场（源码级，防误删）
assert 'STATIC_LEVELS = 30' in data and 'N_CH = 6' in data, 'r7 六章 30 关常量漂移'
assert "q.mode === 2 ? 2 : 1" in engine, 'r7 mode2 跳步步长缺失'
assert 'hide ? q.hidden.length === inner.length' in engine, 'r7 藏格=途中全集 structOk 缺失'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
