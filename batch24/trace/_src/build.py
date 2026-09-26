# -*- coding: utf-8 -*-
"""trace 描红数字 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch24/trace/_src/build.py
语音 clips 注入（tra_* 25 条 + core_* 3 条，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：fec7fdec59b9d9129a88dd059539ef97）。
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
    # clips 注入断言：tra_ 25 条（v1 15 + r5 新 10） + core 3 条 = 28 条（SPEC-BATCH24 §2/§7 r5）
    TRA_KEYS = ['tra_tut_watch', 'tra_tut_turn', 'tra_hint', 'tra_right', 'tra_wrong'] + \
               ['tra_n_%d' % i for i in range(1, 11)] + \
               ['tra_hint2', 'tra_l_q', 'tra_m_q', 'tra_w_pick', 'tra_w_mir',
                'tra_w_wait', 'tra_w_down', 'tra_w_right', 'tra_w_up', 'tra_w_left']
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in TRA_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips == 28, 'clips 条数 %d != 28（tra 25 + core 3）' % n_clips

    # 窗常量四处同步断言（game-data WIN + game-main 注释 + game-verify + 此处字面 assert）
    for lit in ['WRONG: 1000', 'PICK_RIGHT: 600', 'DONE: 4100']:
        assert lit in data, 'game-data.js WIN 窗常量缺失/漂移: %s' % lit
    for lit in ['WIN.WRONG', 'WIN.PICK_RIGHT', 'WIN.DONE']:
        assert lit in main, 'game-main.js 未走 WIN 常量: %s' % lit
        assert lit in verif, 'game-verify.js 未断言 WIN 常量: %s' % lit

    # r5 审查 m-1（家族 F 静态护栏）：生成关预告实算+禁式字面；P1 镜像 CSS 选择器防回归
    assert 'genLevel(f + 1).dch - 1' in main, '家族 F：生成关预告须实算 genLevel(f+1).dch'
    assert '(ci + 1) % 4' not in main, '家族 F 禁式字面（habitat r4 M-1 同型）'
    assert '.g.v-m{transform:scaleX(-1)}' in head, 'P1 防回归：镜像变体选择器须 .g.v-*'


build_lib.build(ROOT, game='trace', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
