# -*- coding: utf-8 -*-
"""colormix 颜色魔法 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch22/colormix/_src/build.py
语音 clips 注入（col_* 5 条 + core_* 3 条，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：39138c8888df1111c2cf9716a75d742b）。
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
    # clips 注入断言（r21 SPEC-R21-COLORMIX §R6，子集式防注册前后断言漂移——r20 范式）：
    # 必备键=已注册 23 条精确在册（col_ 20：5 既有 + T46 阶段2 题面 10 col_q_ + 颜料名 4
    # col_paint_ + col_green；core 3）；总数 ≥23——主线注册 r21 新键 4 条
    # （col_q_lightorange / col_q_lightgreen / col_q_lightpurple / col_rev_q）后 27 亦过
    COL_KEYS = ['col_tut_watch', 'col_tut_turn', 'col_hint', 'col_right', 'col_wrong', 'col_green']
    T46_KEYS = ['col_q_' + c for c in ('red', 'yellow', 'blue', 'orange', 'green', 'purple',
                                       'brown', 'lightred', 'lightyellow', 'lightblue')] + \
               ['col_paint_' + c for c in ('red', 'yellow', 'blue', 'white')]
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in COL_KEYS + T46_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips >= 23, 'clips 条数 %d < 23（必备 col 20 + core 3；r21 注册 4 新键后 27）' % n_clips


build_lib.build(ROOT, game='colormix', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
