# -*- coding: utf-8 -*-
"""piano 碰碰琴 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch23/piano/_src/build.py
语音 clips 注入（manifest 对账——实况 piano 12 条 = pia 9 + core 3：9 必备 + r23 新增
pia_rhy_q/pia_cho_q/pia_ans_wrong；下方断言=9 必备键精确在场+总数 ≥9 子集式）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：804ecf00c0ce98173734fcafbeb9bf62）。
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
    # clips 注入断言（r23 子集式，SPEC-R23 §R6/§R8）：9 必备键（pia 6 + core 3）精确在场
    # + 总数 ≥9——主线注册 3 新键（pia_rhy_q/pia_cho_q/pia_ans_wrong）后 12 亦过，
    # 防注册前后断言漂移（r20/r21/r22 范式）
    PIA_KEYS = ['pia_tut_watch', 'pia_tut_turn', 'pia_hint', 'pia_right', 'pia_wrong', 'pia_like']
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in PIA_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips >= 9, 'clips 条数 %d < 9（pia 6 + core 3 必备）' % n_clips


build_lib.build(ROOT, game='piano', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
