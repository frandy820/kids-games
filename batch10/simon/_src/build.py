# -*- coding: utf-8 -*-
"""simon 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch10/simon/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本款无款级结构锚断言，只留 clips 非空守卫（双跑对拍 md5 等价验证过：1680f4780c7927b10e5f5fa574a7aed3）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
clips 口径：旧版即 exit(3) 禁静默降级（审查M1），与 build_lib.load_clips 同口径，无行为差异。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    clips = S['clips']

    # 语音 clips 注入（simon：si_* 4 条 zh 指令 + 3 条 core_*，构建自包含）
    assert 'data:audio' in clips, 'clips 为空：注入被静默架空（审查M1）'


build_lib.build(ROOT, game='simon', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
