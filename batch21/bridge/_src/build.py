# -*- coding: utf-8 -*-
"""bridge 过河石桥 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch21/bridge/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch21/bridge/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（brg_tut_watch/brg_tut_turn/brg_hint/brg_right/brg_wrong
# + r9 新增 brg_fix_q/brg_fix_do/brg_found + T46 阶段2 pattern 段链 16 键
# （brg_t_{色}5+brg_t_{色}_sq5+brg_t_{色}_ci5+brg_t_tail）+ core_* 三条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('bridge')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# 硬性检查 0：bridge 注入恰 27 条（24 条 brg_* + 3 条 core_*），逐 key 在场
n_clips = clips.count('data:audio')
assert n_clips == 27, 'clips 应为 27 条（24 brg + 3 core），实际 %d' % n_clips
for k in ('brg_tut_watch', 'brg_tut_turn', 'brg_hint', 'brg_right', 'brg_wrong',
          'brg_fix_q', 'brg_fix_do', 'brg_found', 'brg_t_tail'):
    assert ('"%s"' % k) in clips, '缺 clip: %s' % k
for cid in ('red', 'blue', 'green', 'purple', 'orange'):
    assert ('"brg_t_%s"' % cid) in clips, '缺 clip: brg_t_%s' % cid
    assert ('"brg_t_%s_sq"' % cid) in clips, '缺 clip: brg_t_%s_sq' % cid
    assert ('"brg_t_%s_ci"' % cid) in clips, '缺 clip: brg_t_%s_ci' % cid

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 4（r9）：estMs 家族定版字面（n*345+600，禁 +300 变体）+ r9 常量——源码级断言
assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面）'
assert '+ 300' not in data, 'estMs 家族禁 +300 变体'
assert 'LEVEL_MIN_MS = 40000' in data, 'r9 时长下限常量漂移'
assert 'SCAN_MS = { ab: 4200, abc: 5200, abcd: 6800, aabb: 6300, dual: 7800 };' in data, 'r9 SCAN 分档常量漂移'
assert 'const N_CH = 6;' in data, 'r9 六章常量漂移'
assert 'const STATIC_LEVELS = 30;' in data, 'r9 静态 30 关常量漂移'
# r9 玩法结构：纠错双步引擎 + 双属性库在场
assert 'function engFix(' in engine, 'r9 修错步引擎缺失'
assert 'function specBadPos(' in engine, 'r9 独立纠错计算器缺失'
assert "SHAPE_POOL = ['square', 'round']" in data, 'r9 形状库缺失'
# 家族契约 F/M1：nextHint 实算生成关预告+静态章末预告（禁字面取模）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '家族契约 F：生成关预告须实算 genLevel(f+1).dch'
assert 'CHAPTERS[Math.floor(f / CH_LEN) + 1].hint' in main, '家族契约 M1：静态章末预告口径'
# 家族契约 A：dayEnd 预告传 nextHint(lim - 1)（含启动分支两处）
assert main.count('nextHint(lim - 1)') == 2, '家族契约 A：dayEnd 两处须传 nextHint(lim-1)'

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
print('OK written:', OUT, len(html), 'chars, clips=%d' % n_clips)
