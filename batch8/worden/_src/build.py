# -*- coding: utf-8 -*-
"""worden 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch8/worden/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：86f4afac091b1f71f9b4efaa02bb41b4）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
行为差异说明：旧版 clips 注入失败降级空串继续构建；build_lib 口径=exit(3) 暴露
（本款 61 条已合成就位、manifest 含 worden（r32 注册收口后），成功路径产物逐字节一致，对拍实证）。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（worden：6 条 zh 指令 + 24 条 en 单词 + 3 条 core_*，构建自包含）
    # r32 过渡态（SPEC-R32-WORDEN §R10）：25 新键（24 新词 en wen_w_* + blank 指令 wen_q3）
    # 走主线 gen_clips 统一注册禁自建——注册前嵌入 36（现值），主线注册后重建为 61

    # 硬性检查 4（r30/r31 结构锚范式）：r32 谱四层关键结构在源（防回退混入）
    assert "mode === 'blank'" in engine, 'engine 缺 blank 判定真值（r32 产出题）'
    assert 'NEAR' in engine and 'genBlank' in engine, 'engine 缺 blank 生成律/形近字母族'
    assert 'lv === 0 ? 1 : 2' in engine, 'engine 缺 dch2 lv0 起步坡（r32 谱）'
    assert "sheep:  { cat: 'animal', zh: '绵羊' }" in data and "tooth:  { cat: 'body',   zh: '牙齿' }" in data, 'data 词库非 r32 48 词'
    assert 'moose' in data and 'brain' in data and "sheep: 'sheet'" in data, 'data 形近组非 r32 12 组'
    assert 'q3' in data and '补字母' in data, 'data 缺 blank 指令/模式名（r32）'
    assert 'lettercard' in main and "q.mode === 'blank' ? q.pick" in main, 'main 缺 blank 渲染/correctIdx 扩'
    assert 'blank' in verif and 'pick' in verif, 'verify 缺 blank 断言面（r32 四层联动）'


build_lib.build(ROOT, game='worden', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
