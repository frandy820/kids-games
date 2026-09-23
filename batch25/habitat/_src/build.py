# -*- coding: utf-8 -*-
"""habitat 动物家园 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch25/habitat/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch25/habitat/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（hab_ 21 条（v1 11 + r4 新 10） + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('habitat')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：hab_ 21 条 + core 3 条 = 24 条（SPEC-BATCH25 §0.60 r4 版本块）
HAB_KEYS = ['hab_tut_watch', 'hab_tut_turn', 'hab_hint', 'hab_right',
            'hab_w_forest', 'hab_w_grassland', 'hab_w_ocean', 'hab_w_desert',
            'hab_w_pond', 'hab_w_sky', 'hab_w_farm',
            'hab_hint_feed', 'hab_hint_chain', 'hab_hint_hib', 'hab_hint_struct', 'hab_hint_dual',
            'hab_w_feed', 'hab_w_chain', 'hab_w_hib', 'hab_w_struct', 'hab_w_dual']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in HAB_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 133, 'clips 条数 %d != 133（hab 130 + core 3，T46 阶段2 全键化扩容）' % n_clips
# T46 阶段2 段键结构断言：题面/确认键构造与 queue 化在场（防回退 keyless say）
assert 'quizKeys' in data and 'confirmKeys' in data, 'game-data 缺 T46 阶段2 键构造 quizKeys/confirmKeys'
assert 'HAB_MS' in data and 'CONFIRM_PAD = 300' in data, 'game-data 缺 HAB_MS 实长表/CONFIRM_PAD'
assert 'KIDS.voice.queue(quizKeys(q))' in main, 'main 缺题面段链 queue（T46 阶段2）'
assert 'KIDS.voice.queue(cKeys)' in main, 'main 缺确认段链 queue（T46 阶段2）'
assert "await wait(Math.max(3600, chainMs(cKeys) + CONFIRM_PAD - 1800) * SPEED)" in main, \
    'main 缺 T46 确认链动态收尾窗（home 5 段链 8232 超 estMs 窗 5400）'
assert 'KIDS.voice.say' not in main, 'main 残留 keyless voice.say（T46 阶段2 应全键化）'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'habitat'" in main, 'main 缺 KIDS.init habitat（存档键 kidsgame_habitat）'
assert 'window.HB =' in main, 'main 缺 HB 钩子'
assert '__hbDemoR' in main, 'main 缺教学演示实证 __hbDemoR'
# r4 六族题型关键符号（题型化 hint/错反馈/SPEC_DUR 实长断言在场）
assert 'HINT_VOICE' in main and 'WVOICE_KIND' in main, 'main 缺 r4 题型化 hint/错反馈表'
assert 'kind: q.kind' in main, 'main HB.quiz 缺 kind 字段（r4 钩子契约）'
assert 'SPEC_DUR' in verif and 'hab_w_dual' in verif, 'verify 缺 SPEC_DUR 实长断言（r4）'
assert 'starCard' in main, 'main 缺无主体题型 starCard 反馈'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——任务书定版两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（任务书定版）'
# 家族契约 F（r4 审查 M-1 防回退）：生成关 nextHint 实算 + 禁 (ci+1)%4 章序推进（cir build 同款）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1)' + ' % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（r4 审查 M-1）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 语音窗（家族 G/H）：错窗 1000ms + 判对演出窗 3600（确认句 TTS+读题延 ≥1200）
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
assert main.count('1800 * SPEED') >= 1 and 'Math.max(3600, chainMs(cKeys) + CONFIRM_PAD - 1800)' in main, \
    'main 判对演出窗不足（T46 阶段2 后=1800+max(3600, 确认链+PAD-1800) 动态窗）'
assert '2544 * SPEED' in main, 'main 教学演示延窗 2544 缺失（watch 3144+300 不撞头）'
assert '2100)' in main, 'main 教学 turn 后读题延 2100 缺失（turn 1776+300 防尾截）'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（hab_right ≥2850）'

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
