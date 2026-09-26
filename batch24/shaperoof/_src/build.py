# -*- coding: utf-8 -*-
"""shaperoof 形状屋顶 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch24/shaperoof/_src/build.py
语音 clips 注入（shr_ 6 + sr_ 3 + core_* 3，manifest 对账——5.5-6.5 段 v2 三阶反馈句）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：d59bd388dbca2260e28b9affe1eb9c68）。
本款拼接口径=3 script 块（verify 并入第 3 块）；
字面 </script>/core 契约版由 hard_checks_pre、完全离线与 n_scripts==3 由
hard_checks_post(n_scripts=3) 同口径兜底。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
    # clips 注入断言：shr_ 6 + sr_ 3 + core 3 = 12 条（v2 契约）
    SHR_KEYS = ['shr_tut_watch', 'shr_tut_turn', 'shr_hint', 'shr_right', 'shr_wrong', 'shr_q']
    SR_KEYS = ['sr_rot_hint', 'sr_mir_wrong', 'sr_combo_hint']
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in SHR_KEYS + SR_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips == 12, 'clips 条数 %d != 12（shr 6 + sr 3 + core 3）' % n_clips

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


build_lib.build(ROOT, game='shaperoof', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
