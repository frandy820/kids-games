# -*- coding: utf-8 -*-
"""wordprob 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch13/wordprob/_src/build.py
r13（2026-09-15 难度改造）：两步应用题题库（wor_tpl2_* 38 段+wor_n_21..35）；
拼接=4 个 script 块（core / clips / data+engine+main / **verify 独立第 4 块**——
并入第 3 块会使页内源码断言自匹配恒真，判别力归零，禁回退）；
estMs 四方字面同步之 build 侧：源常量与 verify 侧都必须含 's.length * 345 + 600' 字面。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/4 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：b8c91a62bb5bfa45fc03220dd9fe5d87）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==4 由 hard_checks_post(n_scripts=4) 同口径兜底。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（wor_* 基础 39 条+模板段 wor_tpl2_ 38 条在场；旧 wor_tpl_ 24 条已退役出注入）
    for must in ('wor_hint', 'wor_wrong', 'wor_tut_watch', 'wor_tut_turn', 'wor_n_20',
                 'wor_n_35', 'wor_tpl2_bus1_1', 'wor_tpl2_candy2_4'):
        if ('"%s"' % must) not in clips:
            print('FATAL: wordprob clips 注入不完整（缺 %s）' % must)
            sys.exit(3)

    # 硬性检查 3（r13）：estMs 家族四方字面同步——源常量（data）与 verify 断言侧都必须含字面
    EST_LITERAL = 's.length * 345 + 600'
    assert EST_LITERAL in data, 'game-data.js 缺 estMs 定版字面 ' + EST_LITERAL
    assert EST_LITERAL in verif, 'game-verify.js 缺 estMs 独立副本字面 ' + EST_LITERAL

    # 硬性检查 4（r13）：时长模型常量在场（门禁静态断言——verify ⑭ 另有运行时对账）
    for token in ('DECIDE_MS', 'LEVEL_MIN_MS = 40000', 'ADV_MS = 880', 'WRONG_CHAIN_WIN = 4200'):
        assert token in data, 'game-data.js 缺时长模型常量 %s' % token

    # 家族 F（r13 审查 M1/试玩 P2-1 修复配套断言）：nextHint 生成关实算下一关难度章，
    # 禁章序取模推进形态（取模与 seeded 随机 dch 仅 1/4 相符——grid 为范本）
    assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'nextHint 生成关须实算 genLevel(f+1).dch'
    assert 'GEN_HINTS[(ci + 1) % 4]' not in main and 'GEN_HINTS[(ci+1)%4]' not in main, '禁 GEN_HINTS 取模推进形态'


html, out = build_lib.build(ROOT, game='wordprob', head_name='head.html',
                            verify_block='separate', pre_assemble=_asserts)
print('OK script blocks=4, wor_tpl2_ refs=%d' % html.count('wor_tpl2_'))
