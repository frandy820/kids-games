# -*- coding: utf-8 -*-
"""hidden 隐藏朋友 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch22/hidden/_src/build.py
语音 clips 注入（hidden 四条 hid_* + 三条 core_*，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：6da2986f3c29f602e9e70f8e32d8d2c6）。
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
    # clips 注入断言（r20 SPEC-R20-HIDDEN §R6）：必备键精确在册（m4 钉名）——
    # r20 新键已钉名：10 键全注入，manifest 37
    HID_KEYS = ['hid_tut_watch', 'hid_tut_turn', 'hid_hint', 'hid_right', 'hid_ear',
                'hid_s_find', 'hid_s_he', 'hid_cnt_q', 'hid_cnt_retry', 'hid_mem_watch']
    ANIMAL_IDS = ('bird', 'butterfly', 'frog', 'hedgehog', 'ladybug', 'squirrel')
    T46_KEYS = ['hid_q_' + a for a in ANIMAL_IDS] + ['hid_an_' + a for a in ANIMAL_IDS] + \
               ['hid_w_' + a for a in ANIMAL_IDS] + ['hid_n_%d' % n for n in range(1, 7)]
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in HID_KEYS + T46_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips >= 37, 'clips 条数 %d < 37（必备 hid 34 + core 3，m4 钉名后）' % n_clips

    # 硬性检查 3：游戏 JS 禁 Math.random（一律 seeded；core.js 的 sfx 噪声除外）
    for name, s in [('data', data), ('engine', engine), ('main', main), ('verify', verif)]:
        assert 'Math.random' not in s, f'{name} 含 Math.random（违确定性铁律）'


build_lib.build(ROOT, game='hidden', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
