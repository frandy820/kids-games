# -*- coding: utf-8 -*-
"""blocks 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch14/blocks/_src/build.py
语音 clip 已全部合成在场（blo_* 20 条 + core_* 3 条共享，manifest games 数组注入）：
注入失败必须 sys.exit(3)，禁降级空串构建
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：e91da225d8e293719704b7305f8231d8）。
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

    # 语音 clips 注入（blo_* 20 条已合成在场；失败=构建失败退出码 3，不降级）
    # 关键 clip 在场断言：hint/数词 12/front 题面（四题型题面 clip 依赖）
    for must in ('blo_hint', 'blo_n_12', 'blo_q_front', 'blo_wrong'):
        if ('"%s"' % must) not in clips:
            print('FATAL: blocks clips 注入不完整（缺 %s）' % must)
            sys.exit(3)


build_lib.build(ROOT, game='blocks', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
