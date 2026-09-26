# -*- coding: utf-8 -*-
"""cipher 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch19/cipher/_src/build.py
语音 clip（cipher 42 条=ci_ 39+core 共享 3，T46 阶段2 +34 段）：
注入失败必须 sys.exit(3)，禁降级空串构建。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：48b1dbb658ed8ea70de76b30f4558f4f）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。"""
import json, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 关键 clip 在场断言：5 条 ci_ 中文 + T46 段抽样 + core 共享 3（SPEC-BATCH19 §1 语音口径）
    _MUST = ('ci_tut_watch', 'ci_tut_turn', 'ci_hint', 'ci_right', 'ci_wrong',
             'ci_repr', 'ci_look1', 'ci_look2', 'ci_sym_star', 'ci_sym_cloud', 'ci_v_d1', 'ci_v_d9',
             'ci_v_太阳', 'ci_v_木头',
             'core_chapter_end', 'core_day_end', 'core_rest')
    for must in _MUST:   # 注入键经 json.dumps（非 ASCII 转义）——同口径比较
        if (json.dumps(must) + ':') not in clips:
            print('FATAL: cipher clips 注入不完整（缺 %s）' % must)
            sys.exit(3)
    # 条数断言：恰 42 条（ci_ 39=5 句+34 T46 段 + core 3）
    n_audio = clips.count('data:audio/mpeg')
    if n_audio != 42:
        print('FATAL: cipher clips 条数 %d != 42' % n_audio)
        sys.exit(3)


build_lib.build(ROOT, game='cipher', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
