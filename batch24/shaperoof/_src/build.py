# -*- coding: utf-8 -*-
"""shaperoof 形状屋顶 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch24/shaperoof/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch24/shaperoof/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（shr_ 6 + sr_ 3 + core_* 3，manifest 对账——5.5-6.5 段 v2 三阶反馈句）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('shaperoof')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：shr_ 6 + sr_ 3 + core 3 = 12 条（v2 契约）
SHR_KEYS = ['shr_tut_watch', 'shr_tut_turn', 'shr_hint', 'shr_right', 'shr_wrong', 'shr_q']
SR_KEYS = ['sr_rot_hint', 'sr_mir_wrong', 'sr_combo_hint']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in SHR_KEYS + SR_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 12, 'clips 条数 %d != 12（shr 6 + sr 3 + core 3）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'shaperoof'" in main, 'main 缺 KIDS.init shaperoof（存档键 kidsgame_shaperoof）'
assert 'window.SR =' in main, 'main 缺 SR 钩子'
assert '__srDemoR' in main, 'main 缺教学演示实证 __srDemoR'
assert '__srDemoRot' in main, 'main 缺教学演示旋转实证 __srDemoRot（v2 演示=旋转一次+放置）'
# v2 分离交互契约：三入口齐全（UI 层 tap* + 引擎层 engTap*），旧 tapTile 单口已废
for sym in ('tapPiece', 'tapRotate', 'tapPlace'):
    assert sym in main, 'v2 分离交互 UI 口缺 %s' % sym
for sym in ('engTapPiece', 'engRotate', 'engTapPlace'):
    assert sym in engine, 'v2 分离交互引擎口缺 %s' % sym
assert 'tapTile(' not in main and 'tapTile(' not in engine and 'tapTile(' not in verif, '旧 tapTile 调用残留（v2 已废）'
assert 'btn-rotate' in head, 'head 缺旋转钮 #btn-rotate（分离交互②）'
# 家族契约 A：启动与 winFlow 两处 dayEnd 都传 lim-1
assert main.count('nextHint(lim - 1)') == 2, 'dayEnd nextHint(lim-1) 必须两处（启动+winFlow），实得 %d' % main.count('nextHint(lim - 1)')

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
