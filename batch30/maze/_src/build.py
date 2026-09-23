# -*- coding: utf-8 -*-
"""maze 迷宫探险 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch30/maze/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch30/maze/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（maz_ 7 条 + core_* 3 条，manifest 对账——SPEC §3/§4：六件套+key 共 7 条）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
MAZ_KEYS = ['maz_tut_watch', 'maz_tut_turn', 'maz_hint', 'maz_right', 'maz_wrong', 'maz_q', 'maz_key',
            'maz_guide', 'maz_keyget', 'maz_demo']   # T46 阶段2：引导句/拾钥匙句/demo 句 clip 化
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('maze')           # maz_ 7 条（manifest games 含 maze）
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# core 3 条兜底：manifest games 列表未含本游戏时（禁改 manifest——任务书红线），
# 按 key 显式注入（同源 voice/clips/*.mp3）；已含则直接用
if not all('"%s"' % k in clips for k in CORE_KEYS):
    import base64 as _b64, os as _os
    _VCLIPS = _os.path.join('F:/claudecode/projects/active/kids-games/voice', 'clips')
    _extra = []
    for _k in CORE_KEYS:
        _p = _os.path.join(_VCLIPS, _k + '.mp3')
        if not _os.path.exists(_p) or _os.path.getsize(_p) < 800:
            print('CLIPS-INJECT-FAIL: core clip %s' % _k); sys.exit(3)
        _b = _b64.b64encode(open(_p, 'rb').read()).decode('ascii')
        assert '</script' not in _b
        _extra.append('"%s":"data:audio/mpeg;base64,%s"' % (_k, _b))
    clips = clips.replace('};/*CLIPS-END*/', ',' + ','.join(_extra) + '};/*CLIPS-END*/')
# clips 注入断言：maz_ 7 条 + core 3 条 = 10 条（SPEC-BATCH30 §3/§4 实长表 7 条 maz_*）
for k in MAZ_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 13, 'clips 条数 %d != 13（maz 10 + core 3）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'maze'" in main, 'main 缺 KIDS.init maze（存档键 kidsgame_maze）'
assert 'window.MZ =' in main, 'main 缺 MZ 钩子'
assert '__mzDemoR' in main, 'main 缺教学演示实证 __mzDemoR'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 F：生成关 hint 实算 genLevel(f+1).dch-1，禁 (ci+1)%4 章序推进（b26 审查 M3）
assert 'genLevel(f + 1).dch - 1' in main, 'nextHint 生成关分支缺实算 genLevel(f+1).dch-1（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump（maze 容器=网格 grid）
assert "replayAnim(g, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 K：rescueTick 面板在场守卫（b27 新立——面板遮挡期救援静默）
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'rescueTick 缺面板守卫（家族 K）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 双锚重置
assert 'wrongChainUntil = Date.now() + 6500' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=6500'
assert 'wrongChainUntil = Date.now() + 2400' in main, 'main 缺钥匙链豁免窗 wrongChainUntil=2400'
assert 'if (Date.now() < wrongChainUntil) return;' in main, '救援 interval 缺链豁免守卫（家族 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'startLevel 缺双锚重置（家族 I/J）'
# 家族契约 N（b29 新立；T46 阶段2 更新）：引导句 clip 化（maz_guide 键段，text=TTS 兜底）
# ——静态形态：错链 = [maz_wrong, maz_guide 键段]；钥匙链=单段
assert "sayW([VOICE.wrong.key, { key: 'maz_guide', text: GUIDE.guide }])" in main, \
    'main 错反馈拼播链（maz_wrong+引导句 clip）缺失（T46 阶段2 形态）'
assert 'sayW([VOICE.key.key])' in main, 'main 钥匙链 [maz_key] 缺失（单段）'

# ===== 语音窗静态断言（家族 G/H/I/N + b25 定版：窗 ≥ estMs 全字符口径 n×345+600）=====
est_ms = lambda n: n * 345 + 600
# ① 教学 demo 机制句（T46 阶段2 clip 化 maz_demo，实长 2472=ffprobe/SPEC_DUR 口径）
mdemo = re.search(r"const DEMO_SENT = '([^']+)'", data)
assert mdemo, 'data 缺 DEMO_SENT 教学 demo 机制句'
assert "KIDS.voice.play('maz_demo', DEMO_SENT)" in main, 'main 缺 demo 机制句 clip 分支'
assert '(demo ? 3700 : 2800) * SPEED' in main, 'main 局终演出窗（demo 3700 / 正常 2800）缺失'
assert 3700 >= 2472 + 300, 'demo 局终窗 3700 < maz_demo clip 2472+300=2772'
# ② 错反馈链第二段（maz_guide clip 实长 2544）：链豁免窗（家族 I）≥ 链总实长+300
gblock = re.search(r"const GUIDE = \{(.*?)\};", data, re.S)
assert gblock, 'game-data 缺 GUIDE 引导句表'
gtexts = re.findall(r"'([^']+)'", gblock.group(1))
assert len(gtexts) == 1 and gtexts[0] == '点小兔旁边的格子', 'GUIDE 应恰 1 句（点小兔旁边的格子），实得 %s' % gtexts
assert 6500 >= 2664 + 150 + 2544 + 300, \
    '链豁免窗 6500 < maz_wrong 2664+150+maz_guide 2544+300=5658'
# ③ 拾钥匙确认句（maz_keyget clip 实长 1824）≤ 局间自然窗 2800
mgetkey = re.search(r"const GETKEY_SENT = '([^']+)'", data)
assert mgetkey, 'data 缺 GETKEY_SENT 拾钥匙确认句'
assert "KIDS.voice.play('maz_keyget', GETKEY_SENT)" in main, 'main 缺拾钥匙句 clip 分支'
assert 1824 <= 2800, '拾钥匙句 maz_keyget 1824 > 局间自然窗 2800'
# ④ clip 实长窗（SPEC-BATCH30 §4 实长表）：窗值 ≥ clip 实测 + 300 余量
assert '900 * SPEED' in main and '3000 * SPEED' in main, 'main 缺教学演示延窗（t=900+3000=3900）'
assert 900 + 3000 >= 3264 + 300, '教学演示窗 3900 < maz_tut_watch 3264+300=3564'
assert '}, 2200);' in main, 'main 教学 turn 后读题延 2200 缺失（maz_tut_turn 1800+300 防尾截）'
assert 2200 >= 1800 + 300, 'turn 后读题延 2200 < maz_tut_turn 1800+300=2100'
assert 2800 >= 2424 + 300, '局终演出窗 2800 < maz_right 2424+300=2724'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（maz_right ≥2724）'
assert 2620 + 400 >= 2424 + 300, 'celebrate 2620+400=3020 < maz_right 2424+300=2724（契约 H）'
assert 2400 >= 1896 + 300, '钥匙链豁免窗 2400 < maz_key 1896+300=2196'
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ⑤ 教学链预算 ≤16s（SPEED 段+固定段分账 + demo tap 演出窗 520(moved)+3700(right)）
mtut = re.search(r'async function tutorialWatch\(\) \{.*?\n\}', main, re.S)
assert mtut, 'main 缺 tutorialWatch'
tut_speeds = [int(x) for x in re.findall(r'await wait\((\d+) \* SPEED\)', mtut.group(0))]
tut_fixed = [int(x) for x in re.findall(r'await wait\((\d+)\);', mtut.group(0))]
budget = sum(tut_speeds) + sum(tut_fixed) + (520 + 3700)
assert budget <= 16000, '教学 watch 链预算 %dms > 16000（SPEED 段 %s + 固定段 %s + demo 演出窗 4220）' % (
    budget, tut_speeds, tut_fixed)
# ⑥ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '3700 >= SPEC_DUR.maz_demo' in verif, 'verify 缺 demo 窗动态断言（T46 clip 口径）'
assert 'tw <= 16000' in verif, 'verify 缺教学链 ≤16s 实测断言'
# SPEC 独立硬编码表在场（双录对账前提）+ 实长表数值一致（§4）
for sym in ['SPEC_DUR', 'SPEC_SENT', 'SPEC_SIZE', 'SPEC_WALL', 'SPEC_DIST']:
    assert ('const ' + sym) in verif, 'verify 缺 SPEC 独立表 %s' % sym
mdur = re.search(r'const SPEC_DUR = \{([^}]+)\}', verif)
dur_vals = dict(re.findall(r"'(maz_\w+)':\s*(\d+)", mdur.group(1)))
assert dur_vals == {'maz_tut_watch': '3264', 'maz_tut_turn': '1800', 'maz_hint': '2304',
                    'maz_right': '2424', 'maz_wrong': '2664', 'maz_q': '2424', 'maz_key': '1896',
                    'maz_guide': '2544', 'maz_keyget': '1824', 'maz_demo': '2472'}, \
    'SPEC_DUR 与 §4 实长表不符：%s' % dur_vals
# 生成可解性独立复算器在场（verify ② 防同源——python 侧再独立对账见 _selftest.py）
for sym in ['specBfs', 'specPath']:
    assert ('const ' + sym) in verif, 'verify 缺独立复算器 %s' % sym
# 每关 3 局口径在场（SPEC §0.75 破 5 题惯例）
assert 'const RUNS_PER_LEVEL = 3;' in data, 'data 缺 RUNS_PER_LEVEL=3（每关 3 局口径）'

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
print('estMs check: demo maz_demo 2472+300 <= 3700; guide chain 2664+150+2544+300=%d <= 6500; '
      'getKey maz_keyget 1824 <= 2800'
      % (2664 + 150 + 2544 + 300))
print('tutorial budget: SPEED %s + fixed %s + demo 4220 = %dms <= 16000'
      % (tut_speeds, tut_fixed, budget))
