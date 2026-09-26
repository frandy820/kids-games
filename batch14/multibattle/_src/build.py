# -*- coding: utf-8 -*-
"""multibattle 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch14/multibattle/_src/build.py
语音 clip 已全部合成在场（mul_* 16 条 = 8 短句 + 8 数词，SPEC-BATCH14 §2 定稿文案）：
注入失败必须 sys.exit(3)，禁降级空串构建
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：bb971d12967f623e11b909f29aea56a5）。
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

    # 语音 clips 注入（mul_* 16 条 + core_* 3 条由 manifest games 数组带入；失败=构建失败退出码 3，不降级）
    # 关键 clip 在场断言：8 短句 + 8 数词（题面拼接/胜负播报依赖）
    MUL_MUST = ['mul_tut_watch', 'mul_tut_turn', 'mul_hint', 'mul_wrong', 'mul_q1', 'mul_q2',
                'mul_win', 'mul_lose'] + ['mul_n_%d' % n for n in range(2, 10)]
    for must in MUL_MUST:
        if ('"%s"' % must) not in clips:
            print('FATAL: multibattle clips 注入不完整（缺 %s）' % must)
            sys.exit(3)


build_lib.build(ROOT, game='multibattle', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
