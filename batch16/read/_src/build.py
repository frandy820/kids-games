# -*- coding: utf-8 -*-
"""read 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch16/read/_src/build.py
语音 clip 已全部合成在场（rd_ 38 条：6 教学/提示/反馈/听读 + 9 题句段 + 23 词
+ rd_s_ 正文句 174 条（T46 拆段，听读/点句跟读 clip 化）；
+ core 共享 3 条=manifest games 含 read 全集 215 条，由主会话注入 manifest）：
注入失败必须 sys.exit(3)，禁降级空串构建
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：36602140089806073ed6aaa4cbeae8b1）。
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

    # 语音 clips 注入（games 含 read 全集 215 条已合成在场；失败=构建失败退出码 3，不降级）
    # 关键 clip 在场断言（题面问句段/听读/教学/反馈/词表全部——题句 queue 拼接与选项播放依赖；
    # + rd_s_ 正文句域抽查 4 键——全量 174 条由 ?verify=1 clipOk 双向封闭断言复核）
    MUST = ('rd_tut_watch', 'rd_tut_turn', 'rd_hint', 'rd_wrong', 'rd_right', 'rd_listen',
            'rd_q1', 'rd_q1b', 'rd_q2', 'rd_q2b', 'rd_q3a', 'rd_q3b', 'rd_q3c', 'rd_q4a', 'rd_q4b',
            'rd_w_rabbit', 'rd_w_cat', 'rd_w_bear', 'rd_w_home', 'rd_w_park', 'rd_w_river',
            'rd_w_school', 'rd_w_shop', 'rd_w_yard', 'rd_w_carrot', 'rd_w_book', 'rd_w_boots',
            'rd_w_hat', 'rd_w_kite', 'rd_w_umbrella', 'rd_w_red', 'rd_w_blue', 'rd_w_green',
            'rd_w_yellow', 'rd_w_happy', 'rd_w_sad', 'rd_w_angry', 'rd_w_worried',
            'rd_s_c1s0_carrot_red', 'rd_s_c1s1_cat_book_blue', 'rd_s_c2c', 'rd_s_c4b4b',
            'core_chapter_end', 'core_day_end', 'core_rest')
    # 条数断言：恰 215 条（core 3+rd 38+rd_s_ 174——T46 拆段口径）
    n_audio = clips.count('data:audio/mpeg')
    if n_audio != 215:
        print('FATAL: read clips 条数 %d != 215' % n_audio)
        sys.exit(3)
    for must in MUST:
        if ('"%s"' % must) not in clips:
            print('FATAL: read clips 注入不完整（缺 %s）' % must)
            sys.exit(3)


build_lib.build(ROOT, game='read', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
