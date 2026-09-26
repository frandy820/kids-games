# -*- coding: utf-8 -*-
"""logicwho 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch15/logicwho/_src/build.py
语音 clip 已全部合成在场（lgw_* 30 条：4 教学/提示/纠错 + 6 问句 + 9 拼接单元 + 3 色 +
3 物品 + 3 动物名 + 3 问句冗余…… 实为 manifest games 含 logicwho 全集）：
注入失败必须 sys.exit(3)，禁降级空串构建
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：b281112256eec9bd6961fb459300073f）。
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

    # 语音 clips 注入（lgw_* 30 条已合成在场；失败=构建失败退出码 3，不降级）
    # 关键 clip 在场断言（题面问句/线索拼接全单元/动物名/色词——题面 queue 拼接依赖）
    MUST = ('lgw_tut_watch', 'lgw_tut_turn', 'lgw_hint', 'lgw_wrong',
            'lgw_q_red', 'lgw_q_yellow', 'lgw_q_blue', 'lgw_q_ball', 'lgw_q_book', 'lgw_q_umbrella',
            'lgw_c_a', 'lgw_c_b', 'lgw_c_nb', 'lgw_c_l', 'lgw_c_left', 'lgw_c_ll', 'lgw_c_rr',
            'lgw_c_h', 'lgw_c_i',
            'lgw_red', 'lgw_yellow', 'lgw_blue', 'lgw_ball', 'lgw_book', 'lgw_umbrella',
            'lgw_n_tu', 'lgw_n_mao', 'lgw_n_xiong')
    for must in MUST:
        if ('"%s"' % must) not in clips:
            print('FATAL: logicwho clips 注入不完整（缺 %s）' % must)
            sys.exit(3)


build_lib.build(ROOT, game='logicwho', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
