# -*- coding: utf-8 -*-
"""slide 滑块拼图 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch22/slide/_src/build.py
语音 clips 注入（sli_* 5 条 + core_* 3 条，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：8e027f69b29aa594320bdde1c26c01b7）。
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
    # clips 注入断言：sli_ 7 条（5 既有 + T46 阶段2 2：sli_q 缺键补入+sli_adj 演示规则句）
    # + core 3 条 = 10 条（SPEC-BATCH22 §4 / T46）
    SLI_KEYS = ['sli_tut_watch', 'sli_tut_turn', 'sli_hint', 'sli_right', 'sli_wrong',
                'sli_q', 'sli_adj']
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in SLI_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips == 10, 'clips 条数 %d != 10（sli 7 + core 3）' % n_clips

    # 硬性检查 3：禁 Math.random（SPEC §0.3 确定性生成；游戏 JS 内不允许）
    for name, s in [('data', data), ('engine', engine), ('main', main), ('verify', verif)]:
        assert 'Math.random' not in s, f'{name} 含 Math.random（确定性红线）'


build_lib.build(ROOT, game='slide', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
