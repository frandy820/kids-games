# -*- coding: utf-8 -*-
"""hopscotch 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch7/hopscotch/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：5ea6538261cbc65615ca75a7782d3a56）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
行为差异说明：旧版 clips 注入失败降级空串继续构建；build_lib 口径=exit(3) 暴露
（本款 hop_* + core_* 三条已合成就位、manifest 含 hopscotch，成功路径产物逐字节一致，对拍实证）。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（hop_tut_watch/hop_tut_turn/hop_hint + core_* 三条，manifest 对账）

    # 硬性检查 4（r7）：estMs 家族定版字面（n*345+600，禁 +300 变体）——源码级断言在本文件做
    # （页内 game-verify 另有数值+toString 断言；game-data 定义 / game-main 注释 / verify / 本处四处同步）
    assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面）'
    assert '+ 300' not in data, 'estMs 家族禁 +300 变体'

    # 硬性检查 5（r7 家族契约）：A=dayEnd 预告传 nextHint(lim - 1)（启动+winFlow 两处）；
    # F=生成关预告禁 (ci+1)%N 字面（须实算 GEN_HINTS[genLevel(f+1).dch-1]）
    assert main.count('nextHint(lim - 1)') >= 2, '家族契约 A：dayEnd 预告须传 nextHint(lim - 1) 两处'
    assert '(ci + 1) %' not in main and '(ci+1)%' not in main, '家族契约 F：禁 (ci+1)% 字面'
    # r7 审查 M1：静态分支章末预告=CHAPTERS[floor(f/CH_LEN)+1]（SPEC §0.4）；禁原 off-by-one 式
    assert 'CHAPTERS[Math.floor(f / CH_LEN) + 1].hint' in main, '家族契约：静态章末预告式漂移'
    assert 'CHAPTERS[Math.floor((f + 1) / CH_LEN) + 1].hint' not in main, '禁 off-by-one 章末预告式（M1）'
    assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '家族契约 F：生成关预告须实算 genLevel(f+1).dch'

    # 硬性检查 6（r7 玩法契约）：六章 span/跳2/藏格关键字面在场（源码级，防误删）
    assert 'STATIC_LEVELS = 30' in data and 'N_CH = 6' in data, 'r7 六章 30 关常量漂移'
    assert "q.mode === 2 ? 2 : 1" in engine, 'r7 mode2 跳步步长缺失'
    assert 'hide ? q.hidden.length === inner.length' in engine, 'r7 藏格=途中全集 structOk 缺失'


build_lib.build(ROOT, game='hopscotch', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
