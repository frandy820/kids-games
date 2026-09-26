# -*- coding: utf-8 -*-
"""quiz 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch20/quiz/_src/build.py
语音 clip 已全部合成在场（T46 阶段2 2026-09-19：quiz 333 条=题库 clip 化 qz_q_160+
qz_opts_160+qz_cat_4+qz_no+通用 5+core 共享 3，由主会话注入 manifest games:['quiz']）：
注入失败必须 sys.exit(3)，禁降级空串构建。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：b46c9f55395eaae8e2dc634175163563）。
本款拼接口径=3 script 块（verify 并入第 3 块）；manifest 绝对路径已收编 build_lib.VOICE_DIR。
坑：clips 注入失败分支（SystemExit/Exception 均 exit(3)）由 build_lib.load_clips 同口径兜底；
字面 </script>/core 契约版由 hard_checks_pre、完全离线与 n_scripts==3 由
hard_checks_post(n_scripts=3) 同口径兜底。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 关键 clip 在场断言：T46 阶段2 全键族抽查（通用 5+qz_no+题库四角+类别 4）+ core 共享 3
    for must in ('qz_tut_watch', 'qz_tut_turn', 'qz_hint', 'qz_right', 'qz_wrong', 'qz_no',
                 'qz_q_1', 'qz_q_160', 'qz_opts_1', 'qz_opts_160',
                 'qz_cat_1', 'qz_cat_2', 'qz_cat_3', 'qz_cat_4',
                 'core_chapter_end', 'core_day_end', 'core_rest'):
        if ('"%s"' % must) not in clips:
            print('FATAL: quiz clips 注入不完整（缺 %s）' % must)
            sys.exit(3)
    # 条数断言：恰 333 条（T46 阶段2：qz_ 330=题库 320+类别 4+纠错 1+通用 5 + core 3）
    n_audio = clips.count('data:audio/mpeg')
    if n_audio != 333:
        print('FATAL: quiz clips 条数 %d != 333（qz_ 330 + core 3）' % n_audio)
        sys.exit(3)
    # T46 阶段2 题库全量对账（SPEC 真值源=QZ_BANK 字面量）：题面/选项串 320 键文本逐一
    # 与 manifest 一致（键 1 基：qz_q_1=QZ_BANK[0]）；类别 4+qz_no 同对账；data 键化件锚定
    import json as _json, re as _re
    _mani = _json.load(open(build_lib.VOICE_DIR / 'clips' / 'manifest.json', encoding='utf-8'))
    _mb = _re.search(r'const QZ_BANK = (\[[\s\S]*?\]);', data)
    assert _mb, 'game-data 缺 QZ_BANK 字面量'
    _bank = _json.loads(_mb.group(1))
    assert len(_bank) == 160, 'QZ_BANK 应 160 题: %d' % len(_bank)
    for _i, _b in enumerate(_bank):
        _kq, _ko = 'qz_q_%d' % (_i + 1), 'qz_opts_%d' % (_i + 1)
        assert _mani.get(_kq, {}).get('text') == _b['q'], 'manifest %s 文本≠QZ_BANK[%d].q' % (_kq, _i)
        assert _mani.get(_ko, {}).get('text') == '选项有：' + '，'.join(_b['opts']), \
            'manifest %s 文本≠选项串（QZ_BANK[%d]）' % (_ko, _i)
    for _c, _cn in {1: '动植物探秘', 2: '天气与自然', 3: '测量与单位', 4: '因果小侦探'}.items():
        assert _mani.get('qz_cat_%d' % _c, {}).get('text') == '这是%s的题目' % _cn, 'manifest qz_cat_%d 文本不一致' % _c
    assert _mani.get('qz_no', {}).get('text') == '这个不对', 'manifest qz_no 文本不一致'
    for _k in ('qz_q_1', 'qz_opts_1', 'qz_cat_1', 'qz_no'):
        assert _mani[_k].get('games') == ['quiz'], 'manifest %s games 异常' % _k
    assert "const qKeyOf = q => 'qz_q_' + (q.qid + 1);" in data, 'data 缺 qKeyOf 键化件（qid 0 基→键 1 基）'
    assert "const optsKeyOf = q => 'qz_opts_' + (q.qid + 1);" in data, 'data 缺 optsKeyOf 键化件'
    assert "const catKeyOf = q => 'qz_cat_' + q.cat;" in data, 'data 缺 catKeyOf 键化件'
    assert "qz_cat_' + q.cat" in main or 'catKeyOf' in main, 'main 未用类别键化件'
    assert "KIDS.voice.queue(keys)" in main and "KIDS.voice.say(fallback)" in main, 'main 缺 sayQ 键链兜底对'


build_lib.build(ROOT, game='quiz', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
