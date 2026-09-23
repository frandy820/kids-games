# -*- coding: utf-8 -*-
"""stack 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch18/stack/_src/build.py
语音 clip 已全部合成在场（st_* 11 条=教学反馈 7+T46 章问句 st_q_1..4 + core_* 3 条共享，
manifest games 数组注入）：注入失败/条数不恰 14 必须 sys.exit(3)，禁降级空串构建"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch18/stack/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（st_* 11 条已合成在场；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('stack')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: stack clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言：st_ 全 11 条（MUST：教学反馈 7+T46 章问句 st_q_1..4）+ core 3 条
ST_MUST = ['st_tut_watch', 'st_tut_turn', 'st_hint', 'st_right', 'st_wrong', 'st_wind', 'st_place',
           'st_q_1', 'st_q_2', 'st_q_3', 'st_q_4']
CORE_MUST = ['core_chapter_end', 'core_day_end', 'core_rest']
for must in ST_MUST + CORE_MUST:
    if ('"%s"' % must) not in clips:
        print('FATAL: stack clips 注入不完整（缺 %s）' % must)
        sys.exit(3)
# 条数断言恰 14（st_ 11+core 3；多=误注入他游戏，少=MUST 已拦；键含数字 st_q_N）
keys = re.findall(r'"((?:st|core)_[a-z0-9_]+)"\s*:', clips)
if len(keys) != 14 or len(set(keys)) != 14:
    print('FATAL: stack clips 条数异常：%d 条（应恰 14）：%s' % (len(keys), sorted(set(keys))))
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
