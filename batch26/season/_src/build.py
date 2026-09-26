# -*- coding: utf-8 -*-
"""season 季节衣橱 r4 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch26/season/_src/build.py
语音 clips 注入（sea_ 43 条[r4 +2 题型 hint + T46 题面/确认/锚/提交 35] + core_* 3 条，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：9ee1710fd199a3c32b4eef3cfee3d846）。
本款拼接口径=3 script 块（verify 并入第 3 块）；
字面 </script>/core 契约版由 hard_checks_pre、完全离线与 n_scripts==3 由
hard_checks_post(n_scripts=3) 同口径兜底。
差异说明：原「写出后」执行的审查 M4 链豁免断言（纯源码断言、无产物依赖）前移至断言表尾，
成功路径对拍逐字节一致。"""
import pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
    # clips 注入断言：sea_ 43 条 + core 3 条 = 46 条（SPEC-BATCH26 §2 r4 块 + T46 阶段2 35）
    SEA_KEYS = ['sea_tut_watch', 'sea_tut_turn', 'sea_hint', 'sea_right',
                'sea_wrong', 'sea_q', 'sea_hint_outfit', 'sea_hint_anti']
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in SEA_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips == 46, 'clips 条数 %d != 46（sea 43 + core 3）' % n_clips

    # 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件；r4 双约束提交制）
    assert "KIDS.init({ game: 'season'" in main, 'main 缺 KIDS.init season（存档键 kidsgame_season）'
    assert 'window.SE =' in main, 'main 缺 SE 钩子'
    assert '__seDemoR' in main, 'main 缺教学演示实证 __seDemoR'
    assert 'tapItem(i)' in main, 'main 缺 r4 钩子 tapItem'
    assert 'tapSubmit()' in main, 'main 缺 r4 钩子 tapSubmit'
    assert 'id="btn-wear"' in head, 'head 缺提交钮 #btn-wear'
    assert 'id="conds"' in head, 'head 缺条件区 #conds'
    assert 'confirmOf(q)' in main, 'main 缺判对确认句 confirmOf（5400 罩窗载体）'
    # 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——任务书定版两处等价语义）
    assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
    assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（任务书定版）'
    # 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
    assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
    # 语音窗（家族 G/H；clip 实长=SPEC r4 真值表：watch 3216 / turn 1752 / right 2544）：
    assert main.count('await wait(1000 * SPEED)') == 1, 'main 错点防重入窗 1000ms 必须恰 1 处'
    assert 'await wait(2100' not in main and '2100)' in main, 'main 教学 turn 后读题延 2100 缺失'
    assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（sea_right ≥2844）'
    # r4 教学演示时序：watch clip 3216 → 首 tap 在 t=3720（900+900+900+700+320 ≥ 3216+300 不撞头）
    assert main.count('await wait(900 * SPEED)') == 3, \
        'main 教学圈注段 900ms 必须恰 3 处（场景+双 chip），实得 %d' % main.count('await wait(900 * SPEED)')

    # 家族契约 TTS 拼句窗静态断言（b25 定版强制）：
    # 「判对演出窗 ≥ estMs(最长句)+300」——estMs = 码点 × 345ms + 600（SAPI ~345ms/字+落地余量；
    # r4 审查 m-5 统一 +600 家族口径，原 +300 为口径漂移）
    m = re.search(r'TTS_MAX_CHARS\s*=\s*(\d+)', data)
    assert m, 'game-data.js 缺 TTS_MAX_CHARS 常量（estMs 断言源）'
    tts_max = int(m.group(1))
    est = tts_max * 345 + 600
    assert tts_max == 11, 'TTS_MAX_CHARS=%d != 11（r4 定版：最长反馈/确认句码点）' % tts_max
    assert 'await wait(620 * SPEED)' in main and main.count('await wait(430 * SPEED)') == 2 \
           and 'await wait(4350 * SPEED)' in main and main.count('await wait(4350 * SPEED)') == 2, \
           'main 缺判对演出窗三段（620/430×2/4350×2——提交与反向两路径）'
    win = 620 + 430 + 4350
    assert win >= est + 300, '判对演出窗 %d < estMs(TTS_MAX_CHARS=%d)=%d+300（b25 定版：窗≥estMs(最长句)+300）' % (win, tts_max, est)
    # 语音窗常量与 SPEC r4 量化值的硬对账（防手改窗导致撞头/掐断）
    assert win == 5400 and 900 * 3 + 700 + 320 >= 3216 + 300, '教学/判对窗与 SPEC r4 量化值对不上'
    assert '4750' in main, 'main 缺错反馈链豁免窗 4750（m-5 定版）'
    assert 4750 >= est + 300, '错反馈链豁免窗 4750 < estMs(%d)=%d+300（掐断风险）' % (tts_max, est)
    assert 2620 + 400 >= 2544 + 300, 'celebrate 2620+400=3020 < sea_right 2544+300=2844'
    print('TTS_MAX_CHARS=%d estMs=%d win=%d' % (tts_max, est, win))

    # ---------- 审查 M4 链豁免静态断言：wrongChainUntil ≥ estMs(最长反馈句)+300（m-5：+600 口径） ----------
    assert main.count('wrongChainUntil = Date.now() + 4750') == 3, \
        'main 错反馈链豁免窗 wrongChainUntil=4750 必须恰 3 处（anti 错/less/more），实得 %d' % \
        main.count('wrongChainUntil = Date.now() + 4750')
    # season estMs=345*汉字+600（m-5 统一）；最长反馈/确认句 ≤11 码点 → 345*11+600+300=4695 ≤ 4750
    assert 4750 >= 345 * 11 + 600 + 300, '链豁免窗 4750 < estMs(11字)+300'


build_lib.build(ROOT, game='season', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
