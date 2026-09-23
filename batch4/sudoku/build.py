# -*- coding: utf-8 -*-
"""sudoku 单文件拼接：head + body + core.js(原样) + clips + 游戏代码 → index.html"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / '_src'
OUT = ROOT / 'index.html'
CORE = ROOT.parent.parent / 'design' / 'core.js'   # ../../design/core.js

head = (SRC / 'head.html').read_text(encoding='utf-8')
body = (SRC / 'body.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (SRC / 'game-data.js').read_text(encoding='utf-8')
corejs = (SRC / 'game-core.js').read_text(encoding='utf-8')
main = (SRC / 'game-main.js').read_text(encoding='utf-8')
# 语音 clips 注入（sudoku clips 未生成时降级为空串；主会话补管线后重建即可）
try:
    sys.path.insert(0, str(ROOT.parent.parent / 'voice'))
    from inject_clips import clips_js
    clips = clips_js('sudoku')
except (ImportError, SystemExit, OSError, ValueError):
    clips = ''

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('corejs', corejs), ('main', main), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（含 session.settle 与 voice.queue，防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

html = (head + '\n' + body + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + '\n' + corejs + '\n' + main + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
