# -*- coding: utf-8 -*-
"""share 分糖果 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch23/share/_src/build.py
语音 clips 注入（sha_* 40 条 + core_* 3 条，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：a50819e3ce4b5359d5c69c258bb3dd8c）。
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
    # clips 注入断言（r22 SPEC-R22-SHARE §R6，子集式防注册前后断言漂移——r20/r21 范式）：
    # 必备键=已注册 43 条精确在册（sha_ 40：5 既有 + T46 阶段2 题面 22 sha_q_{n}_{k}(k∈2,3)
    # + 数词 13 sha_n_；core 3）；总数 ≥43——主线注册 r22 新键 11 条
    # （sha_q_{n}_4 ×6 / sha_cmp_who / sha_cmp_diff / sha_rev_q / sha_wrong / sha_ans_right，
    # games=['share'] 恰一主，防 sha_ 前缀与 shadow 20 条同名前缀异主串款）后 54 亦过
    SHA_KEYS = ['sha_tut_watch', 'sha_tut_turn', 'sha_hint', 'sha_right', 'sha_plate']
    T46_KEYS = ['sha_q_%d_%d' % (n, k) for n in range(2, 13) for k in (2, 3)] + \
               ['sha_n_%d' % n for n in range(0, 13)]
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in SHA_KEYS + T46_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips >= 43, 'clips 条数 %d < 43（必备 sha 40 + core 3；r22 注册 11 新键后 54）' % n_clips


build_lib.build(ROOT, game='share', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
