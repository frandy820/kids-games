# -*- coding: utf-8 -*-
"""maze 迷宫探险 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch30/maze/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入+core 兜底/三硬检查/3 块拼接/幂等写出）已入
design/build_lib.py，本文件只留款级断言表（双跑对拍 md5 等价验证过：7d8c490155ae71df825c8d95274a925c）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。"""
import pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    data, main, verif, clips = S['data'], S['main'], S['verify'], S['clips']

    # clips 注入断言（maz_ 10 条 + core 3 条 = 13；SPEC-BATCH30 §3/§4 实长表 7 条→T46 阶段2 增 3）
    MAZ_KEYS = ['maz_tut_watch', 'maz_tut_turn', 'maz_hint', 'maz_right', 'maz_wrong', 'maz_q', 'maz_key',
                'maz_guide', 'maz_keyget', 'maz_demo']   # T46 阶段2：引导句/拾钥匙句/demo 句 clip 化
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in MAZ_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips == 13, 'clips 条数 %d != 13（maz 10 + core 3）' % n_clips

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

    # 尾部统计（与旧脚本输出口径一致）
    print('estMs check: demo maz_demo 2472+300 <= 3700; guide chain 2664+150+2544+300=%d <= 6500; '
          'getKey maz_keyget 1824 <= 2800' % (2664 + 150 + 2544 + 300))
    print('tutorial budget: SPEED %s + fixed %s + demo 4220 = %dms <= 16000'
          % (tut_speeds, tut_fixed, budget))


build_lib.build(ROOT, game='maze', head_name='head.html',
                verify_block='merged', clips_prep=build_lib.clips_core_fallback,
                pre_assemble=_asserts)
