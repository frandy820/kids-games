# -*- coding: utf-8 -*-
"""gomoku4 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch19/gomoku4/_src/build.py
语音 clip 已全部合成在场（gomoku4 恰 9 条 = gk_ 6 短句 + core_ 3 家族公共，SPEC-BATCH19 §2 定稿文案）：
注入失败/条数不符必须 sys.exit(3)，禁降级空串构建"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch19/gomoku4/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
VOICE_DIR = pathlib.Path(r'F:/claudecode/projects/active/kids-games/voice')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（manifest games 全集带入；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, str(VOICE_DIR))
    from inject_clips import clips_js
    clips = clips_js('gomoku4')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: gomoku4 clips 注入失败:', e)
    sys.exit(3)

# 关键 clip 在场断言：恰 9 条 = gk_ 6 短句 + core_ 3 家族公共（任务定稿，不符=exit 3）
GK_MUST = ['gk_tut_watch', 'gk_tut_turn', 'gk_hint', 'gk_right', 'gk_lose', 'gk_draw']
CORE_MUST = ['core_chapter_end', 'core_day_end', 'core_rest']
manifest = json.load(open(VOICE_DIR / 'clips' / 'manifest.json', encoding='utf-8'))
mani_keys = [k for k, v in manifest.items() if 'gomoku4' in v['games']]
if sorted(mani_keys) != sorted(GK_MUST + CORE_MUST):
    print('FATAL: manifest gomoku4 键集不符（=%d 条）: %s' % (len(mani_keys), mani_keys))
    sys.exit(3)
for must in GK_MUST + CORE_MUST:
    if ('"%s"' % must) not in clips:
        print('FATAL: gomoku4 clips 注入不完整（缺 %s）' % must)
        sys.exit(3)

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

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
