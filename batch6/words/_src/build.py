# -*- coding: utf-8 -*-
"""words 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch6/words/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch6/words/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（现已有 5 条 UI 键（wrd_tut_watch/wrd_tut_turn/wrd_hint/wrd_wrong/wrd_fam）+55 字键（审查m3 r28 注释更新）；wrd_ch_* 字音 clip
# 由主会话 gen_clips 从 CHARS 表二次合成后重建即得——clip 缺失游戏内自动整句 TTS 兜底）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('words')
except (Exception, SystemExit):
    clips = ''

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

# 硬性检查 4（r28 结构锚）：字库 55 字 / 拼音 key 全唯一全 ASCII / 部件全落 CJK 基本区 /
#   家族优先干扰律与有效干扰数公式在场（引擎）/ famOk 单元在场（verify）
import re as _re
entries = _re.findall(r"\{\s*c:\s*'([^']+)',\s*py:\s*'([^']+)',\s*parts:\s*\[([^\]]*)\],\s*w:\s*'([^']+)'", data)
assert len(entries) == 55, f'CHARS 字数异常: {len(entries)} != 55（r28 定稿）'
pys = [py for _, py, _, _ in entries]
assert len(set(pys)) == 55, f'py 冲突（clip key 不唯一）: {sorted(p for p in pys if pys.count(p) > 1)}'
assert all(py.isascii() for py in pys), 'py 含非 ASCII 字符'
parts = set()
for _, _, ps, _ in entries:
    parts.update(p.strip().strip("'") for p in ps.split(','))
bad_cp = [p for p in parts if not (len(p) == 1 and 0x4E00 <= ord(p) <= 0x9FFF)]
assert not bad_cp, f'部件不在 CJK 基本区(U+4E00-U+9FFF): {bad_cp}'
assert "py: 'qing2'" in data and "py: 'hong'" in data and "py: 'ma2'" in data, 'r28 声旁家族新字缺失'
assert 'function nDisEff' in engine and 'function familyParts' in engine, 'r28 引擎函数缺失'
assert 'famOk' in verif and 'vFamily' in verif, 'r28 verify famOk 单元缺失'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
