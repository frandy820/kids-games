# -*- coding: utf-8 -*-
"""coder2 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch18/coder2/_src/build.py
语音 clip（coder2 16 条=cd2_ 中文 7+T46 指令词 5+循环块 1+core 共享 3）：
注入失败必须 sys.exit(3)，禁降级空串构建。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：f0e5c0c6b73e0461052481d63f223686）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 关键 clip 在场断言：7 条 cd2 中文+T46 指令词 cd2_i_* 5+循环块 cd2_loop + core 共享 3
    for must in ('cd2_tut_watch', 'cd2_tut_turn', 'cd2_hint', 'cd2_right', 'cd2_wrong',
                 'cd2_run', 'cd2_wall',
                 'cd2_i_f', 'cd2_i_l', 'cd2_i_r', 'cd2_i_rep2', 'cd2_i_rep3', 'cd2_loop',
                 'core_chapter_end', 'core_day_end', 'core_rest'):
        if ('"%s"' % must) not in clips:
            print('FATAL: coder2 clips 注入不完整（缺 %s）' % must)
            sys.exit(3)
    # 条数断言：恰 16 条（cd2 13=教学反馈 7+T46 指令词 5+循环块 1+core 3——T46 阶段2 口径）
    n_audio = clips.count('data:audio/mpeg')
    if n_audio != 16:
        print('FATAL: coder2 clips 条数 %d != 16' % n_audio)
        sys.exit(3)


build_lib.build(ROOT, game='coder2', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
