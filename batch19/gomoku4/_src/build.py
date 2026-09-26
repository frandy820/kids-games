# -*- coding: utf-8 -*-
"""gomoku4 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch19/gomoku4/_src/build.py
语音 clip（gomoku4 恰 9 条 = gk_ 6 短句 + core_ 3 家族公共，SPEC-BATCH19 §2 定稿文案）：
注入失败/条数不符必须 sys.exit(3)，禁降级空串构建。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：ee97e2321e089bf00371952bc6a9aa53）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
绝对路径收编：manifest 对账路径改经 build_lib.VOICE_DIR 相对解析（原为盘符绝对路径）。"""
import json, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 关键 clip 在场断言：恰 9 条 = gk_ 6 短句 + core_ 3 家族公共（任务定稿，不符=exit 3）
    GK_MUST = ['gk_tut_watch', 'gk_tut_turn', 'gk_hint', 'gk_right', 'gk_lose', 'gk_draw']
    CORE_MUST = ['core_chapter_end', 'core_day_end', 'core_rest']
    manifest = json.load(open(build_lib.VOICE_DIR / 'clips' / 'manifest.json', encoding='utf-8'))
    mani_keys = [k for k, v in manifest.items() if 'gomoku4' in v['games']]
    if sorted(mani_keys) != sorted(GK_MUST + CORE_MUST):
        print('FATAL: manifest gomoku4 键集不符（=%d 条）: %s' % (len(mani_keys), mani_keys))
        sys.exit(3)
    for must in GK_MUST + CORE_MUST:
        if ('"%s"' % must) not in clips:
            print('FATAL: gomoku4 clips 注入不完整（缺 %s）' % must)
            sys.exit(3)


build_lib.build(ROOT, game='gomoku4', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
