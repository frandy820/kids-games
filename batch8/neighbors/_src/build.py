# -*- coding: utf-8 -*-
"""neighbors 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch8/neighbors/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch8/neighbors/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（T46 阶段2 2026-09-19：neb_ 45=教学反馈 6+题面段链 38+neb_wrong 纠错
# ——neb_mid_1-18「n和n+2」整段/neb_n_1-20 数词；+core_* 三条=48，manifest 对账）
# r31（SPEC-R31 §R10）：新 5 键 neb_qp2/neb_qm2/neb_and/neb_dual_a/neb_dual_b 待主线
# gen_clips 统一注册——注册后 manifest 48→53，此处 48 与 game-verify nClips===48
# 由主线联动改 53（本 agent 禁自注册，注册前过渡态=新 5 型题面语音静默）
sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
from inject_clips import clips_js
clips = clips_js('neighbors')
import json as _json
_mani = _json.load(open('F:/claudecode/projects/active/kids-games/voice/clips/manifest.json', encoding='utf-8'))
_must = sorted(k for k, v in _mani.items() if 'neighbors' in v['games'])
assert len(_must) == 53, 'manifest neighbors 键数漂移: %d' % len(_must)
for _k in _must:
    assert (_json.dumps(_k) + ':') in clips, 'clips 注入缺键: %s' % _k

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 4（r31 结构锚，SPEC-R31-NEIGHBORS §R8）：新 5 型/藏牌律/dual 演出防回归
assert "'plus2'" in engine and "'minus2'" in engine and "'mid4'" in engine, 'engine 缺 r31 新题型'
assert 'dualA' in engine and 'dualB' in engine and 'hiddenNums' in engine, 'engine 缺 dual/藏牌律'
assert 'hiddenNums(q, dch)' in verif or 'hiddenNums(q, 3)' in verif, 'verify 缺藏牌复算断言'
assert 'neb_qp2' in data and 'neb_dual_b' in data, 'data 缺 r31 新 5 键'
assert 'dualJump' in main and '__dualJumpN' in main and 'demoDualJump' in main, 'main 缺 dual 演出'
assert "house.blind" in head or '.house.blind' in head, 'head 缺盲牌样式'

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
