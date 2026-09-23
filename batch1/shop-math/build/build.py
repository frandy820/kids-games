# -*- coding: utf-8 -*-
"""shop-math 单文件拼接：head + body + core.js(原样) + 游戏代码 + verify → ../index.html
r6：追加 game-verify.js（独立 script 块，仅 VERIFY 分支执行）+ estMs 家族字面断言（四处同步）"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parent / 'index.html'
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
body = (ROOT / 'body.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verify = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（clips 目录缺失即构建失败，防静默丢语音）
sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
from inject_clips import clips_js
clips = clips_js('shop')

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('main', main), ('verify', verify), ('clips', clips)]:
    assert '</script' not in s, f'{name}.js 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（含 session.settle，防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 3（r6）：estMs 家族定版 n*345+600 四处同步（源常量=main / verify 断言 / 本断言；
# 注释见 main estMs 定义行）；禁 +300 变体
EST = r'estMs\s*=\s*s\s*=>\s*s\.length\s*\*\s*345\s*\+\s*600'
assert re.search(EST, main), 'game-main.js estMs 家族漂移（应为 s.length*345+600）'
assert "s.length * 345 + 600" in main, 'main estMs 注释/常量不同步'
assert 'estMsFamily' in verify, 'game-verify.js 缺 estMsFamily 断言单元'
assert not re.search(r'estMs\w*\s*=\s*\w*\s*=>[^\n]*345\s*\+\s*300', main + verify + data), '发现 estMs +300 变体（禁）'

# 硬性检查 4（r6）：verify 独立块必须拼接在游戏代码之后（依赖其全局符号）
html = (head + '\n' + body + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + '\n' + main + '\n</script>\n' +
        '<script>\n' + verify + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 5：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
