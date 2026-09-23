# -*- coding: utf-8 -*-
"""whereistand 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch9/whereistand/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch9/whereistand/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（wis_tut_watch/wis_tut_turn/wis_hint/wis_q_up/down/left/right + wis_ord_*×20 +
# wis_wrong + core_* 三条 + wis2_ 28 新键，manifest 对账）
# r33 过渡态已收口（SPEC-R33 §R10）：28 新键（wis2_from_/go_/name_/side_）主线 gen_clips 注册后
# 注入 59 条（过渡期 31 条、two/flip 题面链缺 clip 段静默的问题已随注册消除——r33 审查 m2 勘正）。
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('whereistand')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)  # 审查M1：注入失败禁静默降级
assert 'data:audio' in clips, 'clips 为空：注入被静默架空（审查M1）'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 4（r33 结构锚，r30/r31 范式）：四题型引擎/链段表/链构造/断言锚齐在（防旧文件混入）
assert "'two'" in engine and "'flip'" in engine, 'engine 缺 r33 two/flip 生成分派'
assert 'twoAnswerIdx' in engine and 'flipAnswerIdx' in engine, 'engine 缺 r33 答案公式'
assert 'refRange' in engine and 'kRange2' in engine, 'engine 缺 r33 structWhy 分支'
assert 'wis2_from_' in data and 'wis2_name_' in data, 'data 缺 r33 WIS2 链段表'
assert 'WIS2_TEXTS' in data and 'mirrorH' in data and 'mirrorV' in data, 'data 缺 r33 28 键表/镜像图标'
assert 'WIS2.goKey' in main and 'WIS2.sideKey' in main and 'WIS2.fromKey' in main, 'main 缺 r33 题面链构造'
assert 'twoCross' in verif and 'flipMir' in verif and 'flipUi' in verif, 'verify 缺 r33 断言锚'

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
