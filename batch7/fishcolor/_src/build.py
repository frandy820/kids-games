# -*- coding: utf-8 -*-
"""fishcolor 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch7/fishcolor/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch7/fishcolor/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（fishcolor 六条 fis_* + 三条 core_* 已合成，构建自包含）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('fishcolor')
except (Exception, SystemExit):
    clips = ''

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# r7 硬性检查 3：estMs 家族定版字面（源常量；四处同步=源+注释+verify 断言+此处字面 assert）
assert 'const estMs = n => n * 345 + 600;' in data, 'data 缺 estMs 定版字面（家族 T）'
assert 'estMs(9) === 9 * 345 + 600' in verif, 'verify 缺 estMs 字面验算断言'

# r7 硬性检查 4：家族契约 A（dayEnd 传 nextHint(lim - 1)）与 F（生成关预告实算，禁 (ci+1)%4 字面）
assert 'nextHint(lim - 1)' in main, 'main 启动 dayEnd 须传 nextHint(lim - 1)（家族 A）'
assert 'nextHint(lim)' not in main, 'main 残留 nextHint(lim) 裸调用（家族 A）'
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 生成关预告须实算（家族 F）'
assert '(ci + 1) % 4' not in main and '% 4]' not in main, 'main 禁 (ci+1)%4 字面（家族 F）'

# r7 硬性检查 5：去自动重播（救援 20s 每题一次）+ 分步不重播（stepSpeech 退役）
assert 'idle > 20000' in main and '_rescued' in main, 'main 缺 20s 每题一次救援'
assert 'stepSpeech' not in data and 'stepSpeech' not in main, 'stepSpeech 须退役（分步不重播）'

# r7 硬性检查 6：游散机制在场（SCHOOL 配置+school 状态机+fis_wait 提示）
assert 'const SCHOOL' in data and 'schoolScatter' in main and 'schoolBack' in main, '游散机制缺件'
assert "key: 'fis_wait'" in data, 'data 缺 fis_wait 游散提示'

# r7 硬性检查 7：新语音键文案与 manifest 严格一致（manifest 真值源=gen_clips.py）
import json as _json, re as _re
_mani = _json.load(open('F:/claudecode/projects/active/kids-games/voice/clips/manifest.json',
                        encoding='utf-8'))
for _key in ('fis_wrong', 'fis_wrong_seq', 'fis_wait'):
    _m = _re.search(r"key: '" + _key + r"',\s*text: '([^']+)'", data)
    assert _m, f'data 缺新语音键 {_key}'
    assert _mani.get(_key, {}).get('text') == _m.group(1), f'{_key} 文案与 manifest 不一致'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 8：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
