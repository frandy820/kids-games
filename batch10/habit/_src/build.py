# -*- coding: utf-8 -*-
"""habit 好习惯排序 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch10/habit/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：5d23e773185ff5b034fa8495abd91f01）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
clips 口径：旧版即 exit(3) 禁静默降级（审查M1），与 build_lib.load_clips 同口径，无行为差异。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    import re as _re
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（hb_tut_watch/hb_tut_turn/hb_hint + hb_q_* 12 流程题面
    # （xishou/qichuang/shuaya/chuanyi/guomal/shuijiao/baojiaozi/zhonghua/jixin/kaodangao/xizao/xiyi）
    # + core_* 三条，manifest 对账）
    assert 'data:audio' in clips, 'clips 为空：注入被静默架空（审查M1）'
    for k in ['hb_tut_watch', 'hb_tut_turn', 'hb_hint', 'hb_q_xishou', 'hb_q_qichuang',
              'hb_q_shuaya', 'hb_q_chuanyi', 'hb_q_guomal', 'hb_q_shuijiao',
              'hb_q_baojiaozi', 'hb_q_zhonghua', 'hb_q_jixin', 'hb_q_kaodangao',
              'hb_q_xizao', 'hb_q_xiyi',
              # T46 阶段2（2026-09-19）：题面尾段+三纠错锚 clip 化
              'hb_suffix', 'hb_w_start', 'hb_w_mid', 'hb_w_adj']:
        assert k in clips, f'clip 缺失: {k}（r5 12 序列题面/T46 尾段纠错锚）'
    # r5 审查 m-9：clips 计数断言（19=hb_ 3+hb_q_ 12+T46 尾段1+纠错锚3）+ core 三键双注入防护（对齐 teach/trace）
    _keys = set(_re.findall(r'"([a-z]+_[a-z0-9_]+)":\s*"', clips))
    assert len([k for k in _keys if k.startswith('hb_')]) == 19, f'hb_ clip 计数漂移: {sorted(_keys)}'
    for ck in ['core_chapter_end', 'core_day_end', 'core_rest']:
        assert ck in clips, f'core clip 缺失: {ck}'

    # 硬性检查 4（r5 窗常量四处同步·字面 assert）：estMs 家族定版 n*345+600（r4 m-5 统一，
    # 禁 +300 变体）+ 干扰规则 DECOY_RULE/MAX_CARDS 在 data 定义、verify 引用一致
    assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600）'
    assert '+ 300' not in data.split('const estMs')[1].split(';')[0], 'estMs 出现 +300 变体（禁）'
    assert 'const DECOY_RULE = { 1: 0, 2: 0, 3: 2, 4: -1 };' in data, 'DECOY_RULE 字面漂移'
    assert 'const MAX_CARDS = 9;' in data, 'MAX_CARDS 字面漂移'
    assert 'estMs(1) === 945' in verif and 'SPEC_DECOY = { 1: 0, 2: 0, 3: 2, full: [0, 2] }' in verif \
        and 'SPEC_MAX_CARDS = 9' in verif, 'verify 与 data 常量不同步'
    assert '14 * 345 + 600' in verif, 'verify estMs 数值断言缺失'
    # r5 审查 M-2/m-1（家族 A/F 静态护栏——python 读源文件无 verify 自匹配问题）：
    # A：dayEnd 传 lim-1（nextHint(lim) 超前一章，b23/b24 定版）；F：生成关预告实算禁式字面
    assert 'nextHint: nextHint(lim - 1)' in main, '家族 A 违例：dayEnd 须传 lim-1'
    assert 'nextHint: nextHint(lim)' not in main, '家族 A 禁式在场：nextHint(lim)'
    assert 'genLevel(f + 1).dch - 1' in main, '家族 F：生成关预告须实算 genLevel(f+1).dch'
    assert '(ci + 1) % 4' not in main, '家族 F 禁式字面（habitat r4 M-1 同型）'


build_lib.build(ROOT, game='habit', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
