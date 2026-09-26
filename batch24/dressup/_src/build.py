# -*- coding: utf-8 -*-
"""dressup 贴纸装扮 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch24/dressup/_src/build.py
语音 clips 注入（dru_* 9 条 + core_* 3 条，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：1c12c26adf476b2b84fe4082e4615976）。
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
    # clips 注入断言：dru_ 26 条（v1 6 + r10 新 3 + T46 阶段2 题面 17）+ core 3 条 = 29 条
    # （SPEC-BATCH24 §8；manifest 为真值源；题面域=THEMES 6/BUDGET_Q 5/ANTI_Q 6 与 quizKey 对账）
    DRU_KEYS = ['dru_tut_watch', 'dru_tut_turn', 'dru_hint', 'dru_right', 'dru_wrong', 'dru_free',
                'dru_budget_hint', 'dru_anti_hint', 'dru_anti_right']
    T46_Q = ['dru_q_' + t for t in ('school', 'sports', 'nap', 'party', 'rain', 'winter')]
    T46_QB = ['dru_qb_' + t for t in ('school', 'sports', 'nap', 'party', 'winter')]
    T46_QA = ['dru_qa_' + t for t in ('school', 'sports', 'nap', 'party', 'rain', 'winter')]
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in DRU_KEYS + T46_Q + T46_QB + T46_QA + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips == 29, 'clips 条数 %d != 29（dru 9+17 + core 3）' % n_clips

    # 硬性检查 2b（r10）：estMs 家族定版字面（n*345+600，禁 +300 变体）+时长源模型在场（四处同步）
    assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面，data 定义）'
    assert '+ 300' not in data, 'estMs 家族禁 +300 变体'
    assert 'LEVEL_MIN_MS = 40000' in data and 'levelDurMs' in data and 'DECIDE_MS' in data, 'r10 时长模型源缺失（data）'
    assert 'estMs 家族定版' in main, 'main 注释缺 estMs 家族定版提及（四处同步）'
    assert 'ADV_MS = 3200' in data and 'TAP_MS = 430' in data and 'SW_MS = 900' in data, 'r10 窗常量缺失（data）'
    # r10 三族引擎标记（kind 分流+满员即检+peel）
    assert "q.kind === 'anti'" in engine and "q.kind === 'budget'" in engine and 'function engPeel' in engine, 'r10 三族引擎缺失'
    assert 'units.duration' in verif and 'V_MIN = 40000' in verif, 'verify 缺 r10 时长独立副本单元'
    assert "GEN_HINTS[genLevel(f + 1).dch - 1]" in main, 'nextHint 生成关未实算（契约 F）'


build_lib.build(ROOT, game='dressup', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
