# -*- coding: utf-8 -*-
"""fruitsplit 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
r7 难度改造：五模式（辨识/等分选择/公平判断/切分两段判定/拼合）。
用法: python batch7/fruitsplit/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：1ecace87e7f545af15cf9809566f8256）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
clips 口径：旧版即 exit(3) 禁静默降级（审查M1），与 build_lib.load_clips 同口径，无行为差异。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    import json as _json, re
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（fru_tut_watch/fru_tut_turn/fru_hint + core_* + r7 新键已合成则内嵌）
    # T46 阶段2（2026-09-19）：题面 15+公平 3 句+B 类 3 键全量在册（manifest 29=fru_ 26+core 3）
    assert 'data:audio' in clips, 'clips 为空：注入被静默架空（审查M1）'
    for _must in ('fru_tut_watch', 'fru_hint', 'fru_fair_q',
                  'fru_q_pick', 'fru_q_match', 'fru_q_cut', 'fru_q_cut_apple', 'fru_q_cut_wedge',
                  'fru_q_choose_2', 'fru_q_choose_4', 'fru_q_fair3_2', 'fru_q_fair3_4',
                  'fru_knife', 'fru_same', 'fru_wrong',
                  'core_chapter_end', 'core_day_end', 'core_rest'):
        assert (_json.dumps(_must) + ':') in clips, 'clip 缺失: %s' % _must
    _n = clips.count('data:audio/mpeg')
    assert _n == 29, 'fruitsplit clip 计数漂移: %d != 29' % _n

    # 硬性检查 3（r7）：estMs 家族定版 n*345+600 四处同步（源常量=game-data.js /
    # 注释=data 头部 / verify 断言=units.estMs / 本断言）；禁 +300 变体
    EST = r'estMs\s*=\s*n\s*=>\s*n\s*\*\s*345\s*\+\s*600'
    assert re.search(EST, data), 'game-data.js estMs 家族漂移（应为 n => n * 345 + 600）'
    assert 'estMs 家族定版' in data, 'game-data.js 缺 estMs 家族注释（四处同步）'
    assert 'units.estMs' in verif and '345' in verif, 'game-verify.js 缺 estMs 家族断言单元'
    assert not re.search(r'estMs\w*\s*=\s*\w*\s*=>[^\n]*345\s*\+\s*300', data + verif + main), \
        '发现 estMs +300 变体（禁）'

    # 硬性检查 4（r7 家族 F）：生成关预告禁 (ci+1)%4 字面，须实算 genLevel(f+1).dch
    #（3 块布局下 verify 内源码文本搜索会自匹配恒真——源码级断言收口在 build.py）
    assert 'genLevel(fl + 1).dch - 1' in main, '家族 F：生成关预告须实算 genLevel(f+1).dch'
    assert '(ci + 1) % 4' not in main, '家族 F：发现 (ci+1)%4 字面（禁）'

    # 硬性检查 5（r7 家族 A，审查 M2 收敛）：dayEnd 预告一律传 nextHint(lim - 1)
    # （启动+winFlow 两处；lim 为章边界时传 lim 会多前进一章——fishcolor build.py 同构负向）
    assert main.count('nextHint(lim - 1)') >= 2, '家族 A：dayEnd 须传 nextHint(lim - 1) 两处'
    assert 'nextHint(lim))' not in main and 'nextHint(lim) ' not in main, '家族 A：禁裸 nextHint(lim)（M2）'


build_lib.build(ROOT, game='fruitsplit', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
