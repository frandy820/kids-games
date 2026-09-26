# -*- coding: utf-8 -*-
"""whereistand 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch9/whereistand/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：2baf51209ca89cda553e2adfc4a56079）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
clips 口径：旧版即 exit(3) 禁静默降级（审查M1），与 build_lib.load_clips 同口径，无行为差异。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（wis_tut_watch/wis_tut_turn/wis_hint/wis_q_up/down/left/right + wis_ord_*×20 +
    # wis_wrong + core_* 三条 + wis2_ 28 新键，manifest 对账）
    # r33 过渡态已收口（SPEC-R33 §R10）：28 新键（wis2_from_/go_/name_/side_）主线 gen_clips 注册后
    # 注入 59 条（过渡期 31 条、two/flip 题面链缺 clip 段静默的问题已随注册消除——r33 审查 m2 勘正）。
    assert 'data:audio' in clips, 'clips 为空：注入被静默架空（审查M1）'

    # 硬性检查 4（r33 结构锚，r30/r31 范式）：四题型引擎/链段表/链构造/断言锚齐在（防旧文件混入）
    assert "'two'" in engine and "'flip'" in engine, 'engine 缺 r33 two/flip 生成分派'
    assert 'twoAnswerIdx' in engine and 'flipAnswerIdx' in engine, 'engine 缺 r33 答案公式'
    assert 'refRange' in engine and 'kRange2' in engine, 'engine 缺 r33 structWhy 分支'
    assert 'wis2_from_' in data and 'wis2_name_' in data, 'data 缺 r33 WIS2 链段表'
    assert 'WIS2_TEXTS' in data and 'mirrorH' in data and 'mirrorV' in data, 'data 缺 r33 28 键表/镜像图标'
    assert 'WIS2.goKey' in main and 'WIS2.sideKey' in main and 'WIS2.fromKey' in main, 'main 缺 r33 题面链构造'
    assert 'twoCross' in verif and 'flipMir' in verif and 'flipUi' in verif, 'verify 缺 r33 断言锚'


build_lib.build(ROOT, game='whereistand', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
