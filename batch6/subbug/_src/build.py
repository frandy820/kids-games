# -*- coding: utf-8 -*-
"""subbug 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch6/subbug/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：efc3f6d6ffad3f3fe3bff863b9994d3a）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
行为差异说明：旧版 clips 注入失败降级空串继续构建；build_lib 口径=exit(3) 暴露
（本款 3 条 clip 已合成就位、manifest 含 subbug，成功路径产物逐字节一致，对拍实证）。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（subbug 已有 sub_tut_watch/sub_tut_turn/sub_hint 三条）

    # 硬性检查 4（r30 结构锚）：盲飞谱/两步题引擎/验证演出/新语音段/verify 断言在场
    ANCHORS = {
        'engine': ["CANDS_DUAL", "genDual", "flyIn", "type: 'dual'"],
        'data': ["sub_s_green", "sub_s_fly2", "sub_s_come", "sub_s_andcome",
                 "sub_s_andfly", "sub_calc", "nMin: 4", "nMax: 8", "nMin: 9", "nMax: 14"],
        'main': ["autoFly", "unlockAssist", "demoDual", "flyInBugs", "__autoFlyN",
                 "hintVoice", "先算一算"],
        'verify': ["dualA", "dualTotal", "__autoFlyN", "smokes.flat5", "700004"],
    }
    for part, syms in ANCHORS.items():
        src = {'engine': engine, 'data': data, 'main': main, 'verify': verif}[part]
        for sym in syms:
            assert sym in src, f'r30 结构锚缺失 [{part}]: {sym}'


build_lib.build(ROOT, game='subbug', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
