# -*- coding: utf-8 -*-
"""shapeshome 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch11/shapeshome/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：ea53a755aa40bab37b5b1df913d2735a）。
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

    # 语音 clips 注入（shapeshome：33 既有 + r8 新 76 = 109 条已合成，构建自包含）
    assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
    # r8 新键注入在场（三维/否定/九宫格题面 + 新章规则句；防 manifest/合成脱节静默回退 TTS）
    for _k in ('shp_q3_red_circle_big', 'shp_nq_green_triangle', 'shp_gq', 'shp_rule_neg', 'shp_rule_mix'):
        assert '"%s":' % _k in clips, 'r8 新 clip 缺注入: %s' % _k
    # T46 阶段2（2026-09-19）纠错族 73 锚（shp_wrong_g/tri/neg——B 类无册键挂正）
    for _k in ('shp_wrong_g', 'shp_wrong_tri_red_circle_big', 'shp_wrong_neg_green_triangle'):
        assert '"%s":' % _k in clips, 'T46 纠错 clip 缺注入: %s' % _k
    assert clips.count(':"data:audio') >= 182, 'T46 后 clip 数 <182（109 r8 + 73 shp_wrong 族）'

    # 硬性检查 4（r8 窗常量四处同步·字面 assert）：estMs 家族定版 n*345+600（禁 +300 变体；
    # 源=game-data 字面 / 注释 / verify estMs(9)===3705 数值断言 / 此处 build 字面）
    assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600）'
    assert '+ 300' not in data.split('const estMs')[1].split(';')[0], 'estMs 出现 +300 变体（禁）'
    assert 'estMs(9) === 3705' in verif and 'estMs(1) === 945' in verif, 'verify estMs 数值断言缺失'

    # 硬性检查 5（r8 家族契约 A/F/M1·字面 assert）：nextHint 静态章末=CHAPTERS[floor(f/CH_LEN)+1]
    # （禁旧式 floor((f+1)/CH_LEN)+1 多进一章）；生成段禁 (ci+1)%4 字面（须实算 genLevel(f+1).dch）；
    # dayEnd 两处（winFlow dayDone + 启动分支）传 nextHint(lim - 1)，禁裸 nextHint(lim)
    assert 'CHAPTERS[Math.floor(f / CH_LEN) + 1].hint' in main, 'nextHint 静态分支字面缺失（M1 形）'
    assert '(ci + 1) % 4' not in main and 'GEN_HINTS[(ci + 1)' not in main, '生成关预告残留 (ci+1)%4 字面（契约 F 禁）'
    assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '生成关预告须实算 genLevel(f+1).dch（契约 F）'
    assert main.count('nextHint(lim - 1)') >= 2, 'dayEnd 预告须 ≥2 处传 nextHint(lim - 1)（契约 A）'
    assert 'nextHint(lim)' not in main, '禁裸 nextHint(lim)（家族 A：lim 为章边界会多前进一章）'


build_lib.build(ROOT, game='shapeshome', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
