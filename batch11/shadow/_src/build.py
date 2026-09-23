# -*- coding: utf-8 -*-
"""shadow 影子配对 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch11/shadow/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch11/shadow/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（r8：sha_teach_watch/sha_teach_turn/sha_help/sha_q_pair + sha_q_* 15 + core_* 三条，
# manifest 对账——旧 sha_tut_*/sha_hint 三键 2026-09-10 起归 batch23/share 同名覆盖，shadow 不再引用；
# T46 阶段2（09-19）：wrong keyless→sha_w_same clip 化在册）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('shadow')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# T46 阶段2：sha_w_same 在场+manifest 文本对账+data 键引用（wrong 键化三方一致）
assert '"sha_w_same"' in clips, 'clips 缺 sha_w_same（T46 阶段2 wrong clip 化）'
import json as _json
_mani = _json.load(open('F:/claudecode/projects/active/kids-games/voice/clips/manifest.json', encoding='utf-8'))
assert _mani['sha_w_same']['text'] == '再找一找，一样的影子', 'manifest sha_w_same 文本不一致'
assert _mani['sha_w_same'].get('games') == ['shadow'], 'manifest sha_w_same games 异常'
assert "key: 'sha_w_same'" in data, 'game-data VOICE.wrong 未键化 sha_w_same'
assert "p[0] === 'sha_w_same'" in verif, 'verify sayW 过滤器未键化（T46 联动）'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 4（r8）：estMs 家族定版字面（n*345+600，禁 +300 变体）——源码级断言在本文件做
# （页内 game-verify 另有数值+toString 断言；game-data 定义 / game-main 注释 / verify / 本处四处同步）
assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面）'
assert '+ 300' not in data, 'estMs 家族禁 +300 变体'

# 硬性检查 5（家族契约 A/F/M1）：A=dayEnd 预告传 nextHint(lim - 1)（启动+winFlow 两处）；
# F=生成关预告禁 (ci+1)%N 字面（须实算 GEN_HINTS[genLevel(f+1).dch-1]）；
# M1=静态章末预告 CHAPTERS[floor(f/CH_LEN)+1]（禁 off-by-one 式，r7 审查同型坑）
assert main.count('nextHint(lim - 1)') >= 2, '家族契约 A：dayEnd 预告须传 nextHint(lim - 1) 两处'
assert '(ci + 1) %' not in main and '(ci+1)%' not in main, '家族契约 F：禁 (ci+1)% 字面'
assert 'CHAPTERS[Math.floor(f / CH_LEN) + 1].hint' in main, '家族契约 M1：静态章末预告式漂移'
assert 'CHAPTERS[Math.floor((f + 1) / CH_LEN) + 1].hint' not in main, '禁 off-by-one 章末预告式（M1）'
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '家族契约 F：生成关预告须实算 genLevel(f+1).dch'

# 硬性检查 6（r8 玩法契约）：多物连解/重叠双选/遮蔽/时长模型关键字面在场（源码级，防误删）
assert "q.mode === 'overlap'" in engine and "mode: 'multi'" in engine, 'r8 双模式引擎缺失'
assert 'wantOf' in engine and engine.count('wantOf') >= 2, 'r8 wantOf 应点真值源缺失'
assert 'LEVEL_MIN_MS = 40000' in data, 'r8 时长下限常量漂移（须 40000）'
assert 'STEP_MS = { plain: 2600, rot: 3000, veil: 3200, ovl: 3600 }' in data, 'r8 时长步值漂移'
assert 'V_MIN = 40000' in verif and 'V_STEP_MIN = 13' in verif, 'r8 verify 时长独立副本常量漂移'
assert "'sha_q_pair'" in main and "'sha_teach_watch'" in data and "'sha_help'" in data, 'r8 新 clip 键引用缺失'

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
