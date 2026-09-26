# -*- coding: utf-8 -*-
"""memduel 单文件拼接（r17）：_src/head.html + core + clips + data/engine/main + verify(独立第 4 块)
→ ../index.html。用法: python batch20/memduel/_src/build.py
语音 clip 已全部合成在场（T46 阶段2：memduel 44 条=md_ 41（含值词 32）+core 共享 3，
由主会话注入 manifest games:['memduel']）：
注入失败必须 sys.exit(3)，禁降级空串构建。
r17 断言：estMs 四方字面同步 / verify 独立第 4 script 块 / 家族 F 双断言 /
契约 K 面板守卫逐字 / 时长模型定版字面 / 键基迁移 IIFE / PORT-CLS 逐行等值。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/4 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：42131eb43bddde922f5dbf1df6df336f）。
坑：clips 注入失败分支（SystemExit/Exception 均 exit(3)）由 build_lib.load_clips 同口径兜底；
字面 </script>/core 契约版由 hard_checks_pre、完全离线与 n_scripts==4（r17 硬检查 3/8）
由 hard_checks_post(n_scripts=4) 同口径兜底。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 关键 clip 在场断言：9 条 md_ 中文 + T46 阶段2 值词段抽样（颜色键非 ASCII → json.dumps 同口径）
    import json as _json
    _MUST = ('md_tut_watch', 'md_tut_turn', 'md_hint', 'md_hint_rev', 'md_dir_fwd', 'md_dir_rev',
             'md_gap', 'md_right', 'md_wrong',
             'md_v_d1', 'md_v_d9', 'md_v_lA', 'md_v_lM', 'md_v_c红', 'md_v_c黑',
             'core_chapter_end', 'core_day_end', 'core_rest')
    for must in _MUST:
        if (_json.dumps(must) + ':') not in clips:
            print('FATAL: memduel clips 注入不完整（缺 %s）' % must)
            sys.exit(3)
    # 条数断言：恰 44 条（md_ 41=9 句+T46 值词 32 + core 3）
    n_audio = clips.count('data:audio/mpeg')
    if n_audio != 44:
        print('FATAL: memduel clips 条数 %d != 44' % n_audio)
        sys.exit(3)

    # 硬性检查 4（r17）：estMs 家族四方字面同步——源常量（data）与 verify 断言侧
    # 都必须含 's.length * 345 + 600' 字面（注释侧数字须 345n+600 实算形——r15 m1 教训）
    EST_LITERAL = 's.length * 345 + 600'
    assert EST_LITERAL in data, 'game-data.js 缺 estMs 定版字面 ' + EST_LITERAL
    assert EST_LITERAL in verif, 'game-verify.js 缺 estMs 独立副本字面 ' + EST_LITERAL
    assert 'const estMs = s => s.length * 345 + 600' in data, 'data 侧 estMs 常量形态漂移'
    assert 'const LEVEL_MIN_MS = 40000' in data, 'LEVEL_MIN_MS=40000 门禁字面缺失'
    # 时长模型定版常量在场（r17 DECIDE 五型 + 展示/延迟/推进窗）
    for tok in ('DECIDE_MS', 'df: 11000, dr: 13000, lf: 12000, cf: 10000, dx: 16000',
                'const GAP_MS = 3800', 'const ADV_MS = 2100',
                'const SHOW_BASE = 920, SHOW_PER = 680',
                'const ENTER_MS = 400', 'const TAIL_MS = 300',
                'quizDurMs', 'levelDurMs'):
        assert tok in data, 'game-data.js 缺时长模型字面: ' + tok
    # 指令窗≥estMs(句) 静态断言（SPEC §1-r17 验算式：7 字 gap 句 vw=3715≤3800；3 字方向句 vw=2335）
    assert 'vw=400+3015+300=3715 ≤ GAP 3800' in data, 'gap 指令窗验算字面缺失（窗≥estMs(句)）'
    # modeled 最低精确断言在 verify（138760@flat24 双钉之一；另一钉=_selftest.py Python 第三源）
    assert 'durMin === 138760' in verif, 'verify 侧 modeled 最低精确断言缺失'

    # 硬性检查 5（家族 F，r13 三犯教训）：章末预告 CHAPTERS[i].hint=第 i+1 章预告
    # （禁写本章自己内容——poemfill P2-3）；生成关 nextHint 实算下一关难度章
    # （禁取模推进形态；注释里也不得出现禁戒字面——r14 坑①）
    assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '生成关预告须实算（家族 F）'
    for banned in ('CHAPTERS[(ci + 1) % 4]', 'CHAPTERS[(ci+1)%4]',
                   'GEN_HINTS[(ci + 1) % 4]', 'GEN_HINTS[(ci+1)%4]',
                   'GEN_HINTS[ci % 4]', 'GEN_HINTS[ci%4]'):
        assert banned not in main, '禁式字面出现在 game-main.js: ' + banned
    # CHAPTERS 表内容防回漂锚（家族 F：预告下一章语义）
    assert "1: { name: '顺背长数字', hint: '数字要倒着背啦' }" in data
    assert "2: { name: '倒背数字',   hint: '字母和颜色也来啦' }" in data
    assert "3: { name: '字母颜色串', hint: '先做件小事再背，更难啦' }" in data
    assert "4: { name: '延迟大挑战', hint: '新一轮记忆双背' }" in data

    # 硬性检查 6（契约 K，r13 试玩 P2-4/5）：救援 interval 头部面板守卫逐字
    K_GUARD = "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;"
    assert K_GUARD in main, '救援 interval 缺契约 K 面板守卫'

    # 硬性检查 7（r17）：CH_LEN=8 + 键基分母（LEVELS_PER_CH=10 非 CH_LEN）+ 迁移 IIFE
    assert 'const CH_LEN = 8;' in data, 'CH_LEN=8（r17 5→8）字面缺失'
    assert 'const LEVELS_PER_CH = 10;' in data, 'LEVELS_PER_CH=10 键基分母字面缺失'
    assert 'const STATIC_LEVELS = 40;' in data, 'STATIC_LEVELS=40 字面缺失'
    assert "localStorage.getItem('kidsgame_memduel')" in main, '旧档迁移/脏键守卫 IIFE 缺失'
    assert "lv[(c - 1) + '-5'] === undefined" in main, 'v1 键基矛盾态检测字面缺失'
    # 每关 8 题：renderStep 循环上限须随 CH_LEN（字面锚）
    assert 'for (let k = 0; k < CH_LEN; k++) {' in main

    # 硬性检查 9（r17）：五型引擎/UI 关键件在场
    for tok in ['engGapDone', "q.phase = q.delay ? 'gap' : 'recall'", 'gapcall', 'TIP_GAP',
                'md_gap', 'md_dir_fwd', 'md_dir_rev', 'md_hint_rev', 'COLOR_HEX', 'LETTERS',
                'rescueExemptUntil', 'hintVoiceOf', 'dirSaidAt']:
        assert tok in engine or tok in data or tok in main or tok in head, 'r17 关键件缺失: ' + tok

    # 竖屏三件套（r17）：@media 通道 + body.port 类通道双在场
    assert '@media (orientation:portrait)' in head, '竖屏 @media 通道缺失'
    assert 'body.port .card{width:66px' in head, 'body.port 竖屏类通道缺失（与 @media 逐条等值）'

    # ⑪b 竖屏逐行对账（r17，timecalc r16 同款）：port 段去前缀后与 @media 段逐行全等
    assert '/*PORT-CLS*/' in head, 'head 缺 PORT-CLS 标记段'
    _i = head.index('@media (orientation:portrait){')
    _j = head.index('\n}', _i)
    _media = [ln.strip() for ln in head[_i + len('@media (orientation:portrait){'): _j].splitlines() if ln.strip()]
    _k = head.index('/*PORT-CLS*/') + len('/*PORT-CLS*/')
    _l = head.index('/*PORT-CLS-END*/')
    _port = [ln.strip() for ln in head[_k:_l].splitlines() if ln.strip()]
    assert len(_media) >= 5 and [ln.replace('body.port ', '') for ln in _port] == _media, \
        '竖屏双通道两段不等值（@media %d 行 vs port %d 行）' % (len(_media), len(_port))


build_lib.build(ROOT, game='memduel', head_name='head.html',
                verify_block='separate', pre_assemble=_asserts)
