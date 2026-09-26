# -*- coding: utf-8 -*-
"""stack 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch18/stack/_src/build.py
语音 clip（st_* 11 条=教学反馈 7+T46 章问句 st_q_1..4 + core_* 3 条共享，manifest games 数组注入）：
注入失败/条数不恰 14 必须 sys.exit(3)，禁降级空串构建。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：99f9c72dc5799e8c15825c49abdabbaa）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。"""
import pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 关键 clip 在场断言：st_ 全 11 条（MUST：教学反馈 7+T46 章问句 st_q_1..4）+ core 3 条
    ST_MUST = ['st_tut_watch', 'st_tut_turn', 'st_hint', 'st_right', 'st_wrong', 'st_wind', 'st_place',
               'st_q_1', 'st_q_2', 'st_q_3', 'st_q_4']
    CORE_MUST = ['core_chapter_end', 'core_day_end', 'core_rest']
    for must in ST_MUST + CORE_MUST:
        if ('"%s"' % must) not in clips:
            print('FATAL: stack clips 注入不完整（缺 %s）' % must)
            sys.exit(3)
    # 条数断言恰 14（st_ 11+core 3；多=误注入他游戏，少=MUST 已拦；键含数字 st_q_N）
    keys = re.findall(r'"((?:st|core)_[a-z0-9_]+)"\s*:', clips)
    if len(keys) != 14 or len(set(keys)) != 14:
        print('FATAL: stack clips 条数异常：%d 条（应恰 14）：%s' % (len(keys), sorted(set(keys))))
        sys.exit(3)


build_lib.build(ROOT, game='stack', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
