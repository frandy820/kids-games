# -*- coding: utf-8 -*-
"""bridge 过河石桥 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch21/bridge/_src/build.py
语音 clips 注入（brg_tut_watch/brg_tut_turn/brg_hint/brg_right/brg_wrong
+ r9 新增 brg_fix_q/brg_fix_do/brg_found + T46 阶段2 pattern 段链 16 键
（brg_t_{色}5+brg_t_{色}_sq5+brg_t_{色}_ci5+brg_t_tail）+ core_* 三条，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：25a80ee2f83417f9b30a725dd8ddc6d9）。
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
    # 硬性检查 0：bridge 注入恰 27 条（24 条 brg_* + 3 条 core_*），逐 key 在场
    n_clips = clips.count('data:audio')
    assert n_clips == 27, 'clips 应为 27 条（24 brg + 3 core），实际 %d' % n_clips
    for k in ('brg_tut_watch', 'brg_tut_turn', 'brg_hint', 'brg_right', 'brg_wrong',
              'brg_fix_q', 'brg_fix_do', 'brg_found', 'brg_t_tail'):
        assert ('"%s"' % k) in clips, '缺 clip: %s' % k
    for cid in ('red', 'blue', 'green', 'purple', 'orange'):
        assert ('"brg_t_%s"' % cid) in clips, '缺 clip: brg_t_%s' % cid
        assert ('"brg_t_%s_sq"' % cid) in clips, '缺 clip: brg_t_%s_sq' % cid
        assert ('"brg_t_%s_ci"' % cid) in clips, '缺 clip: brg_t_%s_ci' % cid

    # 硬性检查 4（r9）：estMs 家族定版字面（n*345+600，禁 +300 变体）+ r9 常量——源码级断言
    assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面）'
    assert '+ 300' not in data, 'estMs 家族禁 +300 变体'
    assert 'LEVEL_MIN_MS = 40000' in data, 'r9 时长下限常量漂移'
    assert 'SCAN_MS = { ab: 4200, abc: 5200, abcd: 6800, aabb: 6300, dual: 7800 };' in data, 'r9 SCAN 分档常量漂移'
    assert 'const N_CH = 6;' in data, 'r9 六章常量漂移'
    assert 'const STATIC_LEVELS = 30;' in data, 'r9 静态 30 关常量漂移'
    # r9 玩法结构：纠错双步引擎 + 双属性库在场
    assert 'function engFix(' in engine, 'r9 修错步引擎缺失'
    assert 'function specBadPos(' in engine, 'r9 独立纠错计算器缺失'
    assert "SHAPE_POOL = ['square', 'round']" in data, 'r9 形状库缺失'
    # 家族契约 F/M1：nextHint 实算生成关预告+静态章末预告（禁字面取模）
    assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '家族契约 F：生成关预告须实算 genLevel(f+1).dch'
    assert 'CHAPTERS[Math.floor(f / CH_LEN) + 1].hint' in main, '家族契约 M1：静态章末预告口径'
    # 家族契约 A：dayEnd 预告传 nextHint(lim - 1)（含启动分支两处）
    assert main.count('nextHint(lim - 1)') == 2, '家族契约 A：dayEnd 两处须传 nextHint(lim-1)'


build_lib.build(ROOT, game='bridge', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
