# -*- coding: utf-8 -*-
"""mirrormaze 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch17/mirrormaze/_src/build.py
r14 难度改造：轴向族六 kind+周期棋盘格+双镜复合+反启发式锚+时长模型门禁（SPEC-BATCH17 §6 真值源）。
语音 clip（mirrormaze 10 条=mm_ 中文 7+core 共享 3）：注入失败必须 sys.exit(3)，禁降级空串构建。
script 块布局（家族纪律）：core(1)/clips(2)/data+engine+main(3)/verify 独立(4)。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/4 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：f9225f8757dbb04bebe6698825b16efc）。
硬检查 3（完全离线）与硬检查 4（n_scripts==4）由 build_lib.hard_checks_post(n_scripts=4) 同口径兜底。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 关键 clip 在场断言：7 条 mm 中文句（r14 新增 mm_hint2/mm_wrong2——轴向语义修正）+core 3 全列
    MUST = ('mm_tut_watch', 'mm_tut_turn', 'mm_hint', 'mm_hint2', 'mm_right', 'mm_wrong', 'mm_wrong2',
            'core_chapter_end', 'core_day_end', 'core_rest')
    for must in MUST:
        if ('"%s"' % must) not in clips:
            print('FATAL: mirrormaze clips 注入不完整（缺 %s）' % must)
            sys.exit(3)
    # 条数断言：恰 10 条（core 3+mm 中文 7——SPEC-BATCH17 §6-r14 口径，无额外词 clip）
    n_audio = clips.count('data:audio/mpeg')
    if n_audio != 10:
        print('FATAL: mirrormaze clips 条数 %d != 10' % n_audio)
        sys.exit(3)

    # ---- r14 静态断言（时长模型四层同步之一：build 字面层；断言全在循环体外——r13 教训） ----
    # ① estMs 全字符口径（家族 b25 定版；verify estMsV 断言+源常量+注释四方同步）
    assert 'const estMs = s => s.length * 345 + 600;' in data, 'data 缺 estMs 全字符口径字面定义'
    def _est(n):
        return n * 345 + 600
    # ADV_QUIZ 派生链验算：'拼好啦，真对称'=7 字符（含全角逗号，全字符口径）→ 3015
    # （旧注释曾按 6 字符误算 2670——2026-09-15 Python 21 记复验修正，SPEC §6 已同步）
    assert len('拼好啦，真对称') == 7 and _est(7) == 3015 and _est(3) == 1635, 'estMs 静态验算失败'
    assert "const ADV_QUIZ = estMs('拼好啦，真对称');" in data, 'data 缺 ADV_QUIZ=estMs(right) 派生字面'
    # ② DECIDE_MS 六型/ADV_STEP/LEVEL_MIN_MS 字面（7-8 岁轴向族认知推算；verify V_DECIDE 对账）
    assert 'const DECIDE_MS = { v: 4000, h: 5500, d1: 7500, d2: 7500, pv: 8000, ph: 8000, vv: 10000, r180: 9500 };' in data, \
        'data 缺 DECIDE_MS r14 六型定版字面'
    assert 'const ADV_STEP = 600;' in data, 'data 缺 ADV_STEP 600 字面'
    assert 'const LEVEL_MIN_MS = 40000;' in data, 'data 缺 LEVEL_MIN_MS 40000 字面'
    # ③ 模型函数链在场（stepVoiceMs/quizDurMs/levelDurMs/modeled——verify ⑪ parity 对账目标）
    for tok in ('const stepVoiceMs = (q, k) => k === 0 ? ENTER_MS : STAGE_MS;',
                'const quizDurMs = q => q.targets.reduce(',
                'const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);',
                'const modeled = flat => levelDurMs(genLevel(flat | 0));'):
        assert tok in data, 'data 缺时长模型函数链: %s' % tok[:40]
    # ④ 章表契约 F：CHAPTERS[i].hint=第 i+1 章预告（字面锚防回漂）+GEN_HINTS 4 条
    assert "1: { name: '转转镜子', hint: '镜子要斜过来照啦' }" in data, \
        'CHAPTERS[1].hint 须为第 2 章预告（契约 F 防回漂锚）'
    assert "2: { name: '斜斜镜子', hint: '两边都能当镜子哦' }" in data, 'CHAPTERS[2] 契约字面锚缺失'
    assert "3: { name: '两边看一看', hint: '两面镜子一起照' }" in data, 'CHAPTERS[3] 契约字面锚缺失'
    assert "4: { name: '双面魔镜', hint: '更难的镜子图案在等你' }" in data, 'CHAPTERS[4] 契约字面锚缺失'
    _gh = data.split("const GEN_HINTS = [")[1].split('];')[0]
    assert len([x for x in _gh.replace("'", '').replace(' ', '').split(',') if x]) == 4, 'GEN_HINTS != 4 条'
    # ⑤ 家族 F 生成关契约：nextHint 实算 genLevel(f+1).dch，禁章序取模推进形态（第三犯后定版）
    assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'nextHint 生成关须实算 genLevel(f+1).dch'
    assert 'GEN_HINTS[(ci + 1) % 4]' not in main and 'GEN_HINTS[(ci+1)%4]' not in main, '禁 GEN_HINTS 取模推进形态'
    # ⑥ 契约 K 救援面板守卫（r13 grid/poemfill 双犯后定版）
    assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
        '救援 interval 缺面板守卫（契约 K）'
    # ⑦ 轴向族引擎素材：六 kind 表+vv 双镜配置+targets sx/sy 源格
    for tok in ("const KINDS = ['v', 'h', 'd1', 'd2', 'pv', 'ph', 'vv', 'r180'];",
                'const VV_CFG = [[3, 5, 2], [1, 5, 4], [5, 3, -2], [5, 1, -4]];',
                'q.targets.push({ x: t.x, y: t.y, c: g.c, sx: g.x, sy: g.y });'):
        assert tok in engine, 'engine 缺 r14 素材: %s' % tok[:40]
    # ⑧ verify 独立块素材：estMsV/V_DECIDE/durUnitOk 在场+40 关 modeled 实测最低值 93275 精确断言（防回漂）
    assert 'estMsV' in verif and 'V_DECIDE' in verif and 'durUnitOk' in verif, \
        'verify 缺 r14 duration 单元素材'
    assert 'dMin === 93275' in verif, 'verify 缺 40 关 modeled 最低值 93275 精确断言（防回漂）'
    assert 'refT' in verif and 'REF_AXIS_N' in verif, 'verify 缺闭式代数 T 独立复算素材（三源分算）'


build_lib.build(ROOT, game='mirrormaze', head_name='head.html',
                verify_block='separate', pre_assemble=_asserts)
