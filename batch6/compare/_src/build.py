# -*- coding: utf-8 -*-
"""compare 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch6/compare/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：44c5e4b3621a4ec9ef49abd3e97f707e）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
行为差异说明：旧版 clips 注入失败降级空串继续构建；build_lib 口径=exit(3) 暴露
（本款 3 条 clip 已合成就位、manifest 含 compare，成功路径产物逐字节一致，对拍实证）。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（compare 三条：cmp_tut_watch / cmp_tut_turn / cmp_hint，已合成就位）

    # 硬性检查 4（r29 结构锚，SPEC-R29 §R8）：三卡题型（tri/near）在引擎/主线/verify 三层在场
    for name, s, anchors in [
        ('engine', engine, ['triOf', 'nearOf', 'engPickPos']),
        ('data', data, ['CHIP_TRI', 'cmp_tri_ask', 'cmp_near_ask']),
        ('main', main, ['renderTriQuiz', 'uiPickPos', 'pickPos']),
        ('verify', verif, ["'tri'", "'near'", 'triCnt']),
    ]:
        for a in anchors:
            assert a in s, f'{name} 缺 r29 结构锚: {a}'


build_lib.build(ROOT, game='compare', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
